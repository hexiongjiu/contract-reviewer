const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.setDefaultTimeout(10000);
    const pageErrors = [];
    let reviewRequest = null;
    let reviewCallCount = 0;
    const reviewRequests = [];
    let optimizationCallCount = 0;
    const optimizationRequests = [];
    const evidenceRequests = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.route('https://api.deepseek.com/v1/chat/completions', async route => {
        const body = JSON.parse(route.request().postData() || '{}');
        const isEvidenceRequest = body.messages && body.messages[0] && body.messages[0].content.includes('法律依据核对助手');
        const isOptimizationRequest = body.messages && body.messages[0] && body.messages[0].content.includes('合同文本优化助手');
        if (isEvidenceRequest) evidenceRequests.push(body);
        if (isOptimizationRequest) {
            optimizationCallCount++;
            optimizationRequests.push(body);
        } else if (!isEvidenceRequest) {
            reviewRequest = body;
            reviewCallCount++;
            reviewRequests.push(body);
        }
        const validReview = JSON.stringify({
            contractType: '采购合同',
            reviewedFrom: '乙方',
            summary: '存在付款风险',
            keyTerms: [
                { id: 'amount', category: '金额', label: '合同总价', value: '100万元', sourceText: '合同总价为100万元', confidence: 0.95 },
                { id: 'term', category: '期限', label: '合同到期日', value: '2026年12月31日', sourceText: '合同有效期至2026年12月31日', confidence: 0.93 }
            ],
            obligations: [{
                id: 'payment-obligation', responsibleParty: '甲方', action: '支付合同款', trigger: '验收合格',
                dueDate: '2026-10-01', dueRule: '', amount: '100万元', consequence: '承担逾期付款责任',
                sourceText: '甲方应于2026年10月1日前支付合同款', confidence: 0.9
            }],
            issues: [{
                id: 'payment-1',
                sourceText: '甲方应在验收后90日内付款。',
                category: '付款',
                severity: 'high',
                affectedParty: '乙方',
                confidence: 0.92,
                problem: '付款周期过长',
                rationale: '资金占用时间较长',
                suggestion: '缩短到30日',
                replacementText: '甲方应在验收后30日内付款。'
            }]
        });
        const content = isEvidenceRequest
            ? JSON.stringify({ selected: [] })
            : isOptimizationRequest
                ? (optimizationCallCount === 1 ? '' : JSON.stringify({ optimizedText: '甲方应在验收后15日内付款。' }))
                : (reviewCallCount === 1 ? '这不是有效的 JSON' : validReview);
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ choices: [{ message: { content }, finish_reason: !isEvidenceRequest && reviewCallCount === 1 ? 'length' : 'stop' }] })
        });
    });
    await page.goto(process.argv[5] || 'http://127.0.0.1:8765/', { waitUntil: 'load' });
    await page.waitForFunction(() => historyStorageMode === 'sqlite');

    const longContractSample = await page.evaluate(() => sampleContractForLegalRetrieval(
        `${'A'.repeat(16000)}MIDDLE_MARK${'B'.repeat(16000)}TAIL_MARK`, 30000
    ));
    if (!longContractSample.includes('MIDDLE_MARK') || !longContractSample.includes('TAIL_MARK')) {
        throw new Error('Long-contract legal retrieval did not sample the middle and tail');
    }

    const neutralDirective = await page.evaluate(() => buildPositionDirective('中立'));
    if (!neutralDirective.includes('分别识别对甲乙双方不利的风险') || !neutralDirective.includes('不得默认偏向任何一方')) {
        throw new Error('中立审查立场定义不够明确');
    }

    await page.selectOption('#contractType', '软件开发合同');
    await page.selectOption('#reviewPosition', '乙方');
    const softwareVendorFocus = await page.locator('#reviewInstructions').inputValue();
    if (!softwareVendorFocus.includes('需求范围') || !softwareVendorFocus.includes('收款确定性')) {
        throw new Error('合同类型与审核立场未联动生成审核重点');
    }
    if (!(await page.locator('#contractFocusTitle').innerText()).includes('软件开发合同专项重点')) throw new Error('界面未显示当前合同专项重点');
    if (!(await page.locator('#positionFocusTitle').innerText()).includes('乙方立场保护重点')) throw new Error('界面未显示当前立场保护重点');
    if (!(await page.locator('#contractFocusList').innerText()).includes('需求范围')) throw new Error('合同专项重点预览未随类型变化');
    if (!(await page.locator('#positionFocusList').innerText()).includes('收款确定性')) throw new Error('立场保护重点预览未随立场变化');
    if (process.argv[3]) await page.locator('.api-config').nth(1).screenshot({ path: process.argv[3] });
    await page.locator('#reviewInstructions').fill('当前组合的自定义审核重点');
    await page.selectOption('#contractType', '服务合同');
    if (!(await page.locator('#reviewInstructions').inputValue()).includes('服务范围')) throw new Error('切换合同类型后未更新审核重点');
    if (!(await page.locator('#contractFocusTitle').innerText()).includes('服务合同专项重点')) throw new Error('合同专项重点标题未同步变化');
    await page.selectOption('#contractType', '软件开发合同');
    if ((await page.locator('#reviewInstructions').inputValue()) !== '当前组合的自定义审核重点') throw new Error('未按类型和立场保存自定义审核重点');
    await page.selectOption('#contractType', '采购合同');

    await page.evaluate(async () => {
        const extraParagraphs = Array.from({ length: 45 }, (_, index) => `附加条款第${index + 1}条：用于验证长合同段落联动滚动。`);
        originalPlainText = ['甲方应在验收后90日内付款。', '其他条款。', ...extraParagraphs].join('\n');
        originalHtmlContent = ['<p>甲方应在验收后90日内付款。</p>', '<p>其他条款。</p>', ...extraParagraphs.map(text => `<p>${text}</p>`)].join('');
        document.getElementById('apiKey').value = 'test-key';
        document.getElementById('contractType').value = '采购合同';
        document.getElementById('reviewPosition').value = '乙方';
        initQuillEditor(originalHtmlContent);
        await checkContractInternal();
    });
    await page.waitForFunction(() => {
        const evidence = document.querySelector('#previewContent .civil-code-evidence');
        return evidence && !evidence.textContent.includes('正在核对法律依据');
    });

    if (!reviewRequest || reviewRequest.model !== 'deepseek-v4-flash') throw new Error('未使用新的 DeepSeek 模型 ID');
    if (reviewCallCount !== 2) throw new Error('首次 JSON 解析失败后未自动重试');
    if (!reviewRequest.thinking || reviewRequest.thinking.type !== 'disabled') throw new Error('未关闭审查请求的思考模式');
    if (!reviewRequest.response_format || reviewRequest.response_format.type !== 'json_object') throw new Error('未请求结构化 JSON 输出');
    if (reviewRequests[0].max_tokens !== 65536) throw new Error('结构化审查首轮输出上限不是 64K');
    if (reviewRequests[1].max_tokens !== 131072) throw new Error('长度截断后的重试输出上限不是 128K');
    if (!reviewRequest.messages[0].content.includes('审查立场：乙方')) throw new Error('审查立场未写入提示词');
    if (!reviewRequest.messages[0].content.includes('立场执行规则：重点识别对乙方不利的风险')) throw new Error('乙方立场执行规则未写入提示词');
    if (reviewRequest.messages[0].content.includes('请重点说明对该立场不利的风险')) throw new Error('仍在使用含糊的通用立场指令');
    if (!reviewRequest.messages[0].content.includes('采购标的') || !reviewRequest.messages[0].content.includes('收款确定性')) throw new Error('场景化审核重点未写入提示词');
    if (!reviewRequest.messages[0].content.includes('本地现行法律依据候选')) throw new Error('现行法律依据候选未写入审核提示词');
    if (!reviewRequest.messages[0].content.includes('最高人民法院关于审理买卖合同纠纷案件适用法律问题的解释')) throw new Error('采购合同未召回买卖合同司法解释');
    if (!reviewRequest.messages[0].content.includes('必须同时写明文件全称和条号')) throw new Error('审核提示词未限制法条引用格式');
    if (!evidenceRequests.length || !evidenceRequests[0].thinking || evidenceRequests[0].thinking.type !== 'disabled') {
        throw new Error('法律依据AI复核未关闭思考输出');
    }
    if (await page.locator('[data-result-panel="preview"].active').count() !== 1) throw new Error('审核后未优先显示合同对照页');
    if (await page.locator('.issue-item.severity-high').count() !== 1) throw new Error('高风险卡片未渲染');
    if (await page.locator('.problem-paragraph').count() !== 1) throw new Error('合同原文未定位标注');
    await page.locator('[data-result-tab="ledger"]').click();
    if (await page.locator('[data-result-panel="ledger"].active').count() !== 1) throw new Error('无法切换到合同要素与履约页');
    if (await page.locator('.ledger-term').count() !== 2) throw new Error('合同核心要素未渲染');
    if (await page.locator('.ledger-table tbody tr').count() !== 1) throw new Error('履约事项未渲染');
    await page.getByRole('button', { name: '待履行' }).click();
    if (await page.getByRole('button', { name: '已完成' }).count() !== 1) throw new Error('履约状态未更新');
    const savedStatus = await page.evaluate(() => getHistory()[0].contractLedger.obligations[0].status);
    if (savedStatus !== 'completed') throw new Error('履约状态未保存到历史记录');
    const csvDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出 CSV' }).click();
    if (!(await csvDownload).suggestedFilename().endsWith('.csv')) throw new Error('CSV 台账未正确导出');
    const icsDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出日历' }).click();
    if (!(await icsDownload).suggestedFilename().endsWith('.ics')) throw new Error('履约日历未正确导出');
    await page.locator('[data-result-tab="risk"]').click();
    await page.getByRole('button', { name: '定位原文' }).click();
    if (await page.locator('[data-result-panel="preview"].active').count() !== 1) throw new Error('定位原文未自动切换到合同对照页');
    if (await page.locator('[data-result-panel="preview"] .preview-panel').count() !== 1) throw new Error('合同对照页缺少标注合同栏');
    if (await page.locator('[data-result-panel="preview"] .code-panel').count() !== 1) throw new Error('合同对照页缺少编辑合同栏');
    const compareColumns = await page.locator('.contract-compare-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length);
    if (compareColumns !== 2) throw new Error('桌面端合同对照未保持两栏布局');
    await page.locator('#quillEditorContainer .ql-editor').evaluate(element => { element.scrollTop = element.scrollHeight; });
    await page.locator('.problem-paragraph').click();
    await page.waitForFunction(() => document.querySelectorAll('.comparison-linked-active').length === 2);
    await page.waitForFunction(() => {
        const editor = document.querySelector('#quillEditorContainer .ql-editor');
        return editor && editor.scrollTop < (editor.scrollHeight - editor.clientHeight) / 2;
    });
    if (!(await page.locator('#quillEditorContainer .comparison-linked-active').innerText()).includes('验收后90日内付款')) {
        throw new Error('点击左侧段落后未高亮右侧对应内容');
    }
    await page.locator('#quillEditorContainer .ql-editor p').nth(1).click();
    if (!(await page.locator('#previewContent .comparison-linked-active').innerText()).includes('其他条款')) {
        throw new Error('点击右侧段落后未高亮左侧对应内容');
    }
    await page.locator('#previewContent').evaluate(element => { element.scrollTop = 0; });
    await page.locator('#quillEditorContainer .ql-editor p').last().click();
    await page.waitForFunction(() => {
        const container = document.getElementById('previewContent');
        const target = container.querySelector('.comparison-linked-active');
        if (!target) return false;
        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        return targetRect.top >= containerRect.top && targetRect.bottom <= containerRect.bottom;
    });
    if (!(await page.locator('#previewContent .comparison-linked-active').innerText()).includes('附加条款第45条')) {
        throw new Error('长合同中点击右侧末尾段落后未滚动到左侧对应原文');
    }
    if (process.argv[4]) await page.locator('#resultWorkspace').screenshot({ path: process.argv[4] });
    await page.evaluate(async () => {
        hoveredOptimizeParagraph = quillEditor.root.querySelector('p');
        await optimizeHoveredParagraph();
    });
    if (optimizationCallCount !== 2) throw new Error('段落优化空响应后未自动重试');
    if (!optimizationRequests[0].thinking || optimizationRequests[0].thinking.type !== 'disabled') throw new Error('段落优化未关闭思考模式');
    if (!optimizationRequests[0].response_format || optimizationRequests[0].response_format.type !== 'json_object') throw new Error('段落优化未启用 JSON Output');
    const optimizedPreview = await page.locator('#optimizationNewText').inputValue();
    if (!optimizedPreview.includes('验收后15日内付款')) throw new Error('段落优化预览内容不正确');
    await page.evaluate(() => closeOptimizationPreview());
    await page.locator('[data-result-tab="risk"]').click();
    await page.getByRole('button', { name: '✓ 采纳并替换' }).click();
    const editorText = await page.locator('#quillEditorContainer').innerText();
    if (!editorText.includes('验收后30日内付款')) throw new Error('采纳建议未更新编辑器');

    await page.waitForFunction(async () => {
        const response = await fetch('/api/history');
        const payload = await response.json();
        const current = payload.items.find(item => item.id === currentHistoryItem.id);
        return current && current.legalEvidenceByIssue && Object.keys(current.legalEvidenceByIssue).length > 0;
    });
    const evidenceCallCountBeforeHistoryLoad = evidenceRequests.length;
    const savedHistoryId = await page.evaluate(() => currentHistoryItem.id);
    await page.evaluate(id => loadHistoryItem(id), savedHistoryId);
    await page.waitForTimeout(500);
    if (evidenceRequests.length !== evidenceCallCountBeforeHistoryLoad) {
        throw new Error('加载历史记录时重复调用了AI法律依据复核');
    }

    evidenceRequests.length = 0;
    await page.evaluate(async () => {
        const sparseIssues = [
            ContractReviewCore.normalizeIssue({
                id: 'missing-source', sourceText: '原文中完全不存在的句子', problem: '第一个问题', suggestion: '修改'
            }, 0),
            ContractReviewCore.normalizeIssue({
                id: 'matched-source', sourceText: '软件源代码归乙方所有。', category: '知识产权',
                problem: '第二个问题：知识产权许可范围不明', suggestion: '明确许可期限和地域'
            }, 1)
        ];
        const annotated = ContractReviewCore.annotateContract('<p>软件源代码归乙方所有。</p>', sparseIssues, document);
        updatePreview(annotated, sparseIssues, false);
        await loadLegalBasisArticles();
        document.querySelectorAll('#previewContent .civil-code-evidence').forEach(element => element.remove());
        appendLegalBasisEvidence(sparseIssues, currentHistoryItem && currentHistoryItem.id);
    });
    await page.waitForFunction(() => !document.querySelector('.civil-code-evidence-status'));
    if (evidenceRequests.length !== 1) throw new Error('稀疏标注的法律依据请求数量不正确');
    const sparsePrompt = evidenceRequests[0].messages[1].content;
    if (!sparsePrompt.includes('第二个问题') || sparsePrompt.includes('第一个问题')) {
        throw new Error('法律依据与页面问题发生错位');
    }
    if (pageErrors.length) throw new Error(`页面运行错误：${pageErrors.join('; ')}`);
    if (process.argv[2]) {
        await page.locator('[data-result-tab="ledger"]').click();
        await page.locator('#resultWorkspace').screenshot({ path: process.argv[2] });
    }

    await page.goto(new URL('legal-library.html', process.argv[5] || 'http://127.0.0.1:8765/').href, { waitUntil: 'load' });
    if (await page.locator('#documentFilter option').count() !== 26) throw new Error('法律依据库文件数量不正确');
    if (await page.locator('#documentFilter optgroup').count() !== 2) throw new Error('法律与司法解释未在选择器中分栏');
    if (await page.locator('.legal-document-group').count() !== 2) throw new Error('法律与司法解释未在目录中分栏');
    if (!(await page.locator('.legal-document-group').nth(1).innerText()).includes('司法解释、规定及批复')) throw new Error('司法解释专栏标题缺失');
    if (!(await page.locator('#documentFilter').innerText()).includes('个人信息保护法')) throw new Error('法律依据库未加载扩展法律');
    if ((await page.locator('#documentFilter').innerText()).includes('2026修订')) throw new Error('尚未生效的2026年商标法不应进入现行法条库');
    await page.selectOption('#documentFilter', 'pipl-2021');
    await page.locator('#searchInput').fill('委托处理');
    await page.locator('#searchBtn').click();
    if (!(await page.locator('#content').innerText()).includes('个人信息保护法')) throw new Error('法律依据库检索未返回个人信息保护法');
    if (!(await page.locator('.legal-effective-date').first().innerText()).includes('施行')) throw new Error('法条开头未显示施行或修订时间');
    if (await page.locator('.legal-source-link').count() < 1) throw new Error('法律依据条文未提供官方来源链接');
    if (pageErrors.length) throw new Error(`页面运行错误：${pageErrors.join('; ')}`);

    await page.locator('#searchInput').fill('');
    await page.selectOption('#documentFilter', 'copyright-law-2020');
    const copyrightLast = page.locator('.article').last();
    const copyrightLastText = await copyrightLast.innerText();
    if (copyrightLastText.includes('网站链接') || copyrightLastText.includes('京ICP备')) throw new Error('Copyright Law footer noise was rendered');
    if (!(await copyrightLast.locator('.article-path').innerText()).includes('第六章')) throw new Error('Statute chapter hierarchy was not rendered');
    if ((copyrightLastText.match(/第六十七条/g) || []).length !== 1) throw new Error('Article number was rendered twice');

    await browser.close();
    console.log('UI smoke test passed');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
