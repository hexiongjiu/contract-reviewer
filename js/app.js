let currentDocBlob = null;
let originalHtmlContent = '';
let originalPlainText = '';
let originalFileBuffer = null;
let qaHistory = [];
let currentIssues = [];
let quillEditor = null;
let quillOriginalParagraphs = [];
// Mapping: quillOriginalParagraphs[N] -> docxParagraphs[M]
let htmlToDocxMap = [];
let docxParagraphs = [];
let hoverOptimizeButton = null;
let hoveredOptimizeParagraph = null;
let isHoveringOptimizeButton = false;
let pendingOptimization = null;
let pendingOptimizedText = '';
let legalBasisArticles = null;
let currentHistoryItem = null; // 当前正在操作的历史记录项
let currentRiskFilter = 'all';
let currentReviewMeta = null;
let currentContractLedger = { keyTerms: [], obligations: [] };
let comparisonHighlightTimer = null;
let historyCache = [];
let historyStorageMode = 'browser';
let historyWriteQueue = Promise.resolve();

const PREVIEW_COMPARE_BLOCKS = '.contract-preview p, .contract-preview li, .contract-preview h1, .contract-preview h2, .contract-preview h3, .contract-preview h4, .contract-preview h5, .contract-preview h6, .contract-preview td';
const EDITOR_COMPARE_BLOCKS = '#quillEditorContainer .ql-editor p, #quillEditorContainer .ql-editor li, #quillEditorContainer .ql-editor h1, #quillEditorContainer .ql-editor h2, #quillEditorContainer .ql-editor h3, #quillEditorContainer .ql-editor h4, #quillEditorContainer .ql-editor h5, #quillEditorContainer .ql-editor h6';

const STORAGE_KEY = 'deepseek_api_key';
const INSTRUCTIONS_STORAGE_KEY = 'review_instructions';
const CONTEXT_INSTRUCTIONS_STORAGE_KEY = 'review_instructions_by_context_v2';
const HISTORY_STORAGE_KEY = 'contract_review_history';
const DEFAULT_INSTRUCTIONS = `请重点审核以下方面：

1. **条款合理性**：检查合同条款是否公平公正，是否存在明显有利于某一方的霸王条款
2. **风险点识别**：识别可能存在的法律风险、履约风险、财务风险等
3. **合规性审查**：检查合同内容是否符合相关法律法规的要求
4. **缺失条款**：指出合同中缺少的重要条款（如保密条款、违约责任、争议解决等）
5. **表述准确性**：检查合同表述是否清晰明确，是否存在歧义或模糊不清的地方

请针对每份合同的具体内容，给出专业的审核意见和修改建议。`;

const CONTRACT_REVIEW_FOCUS = {
    '自动识别': [
        '识别合同真实交易结构、主体角色和核心给付义务，不受合同标题限制',
        '核对金额、付款、期限、交付验收、违约、解除、争议解决等核心条款',
        '识别前后矛盾、空白项、附件缺失、引用错误和不可执行的约定'
    ],
    '采购合同': [
        '采购标的的名称、规格、数量、质量标准及技术附件是否完整一致',
        '含税价格、发票类型、付款节点、账期、质保金及价格调整机制',
        '交付地点与时间、运输风险、所有权转移、迟延交付和供应中断责任',
        '验收标准、验收期限、异议流程，避免仅约定默示验收或由单方认定',
        '质量保证、退换修、召回、供应商资质及第三方索赔责任'
    ],
    '销售合同': [
        '产品范围、订单效力、价格税费、最小采购量及预测是否具有约束力',
        '预付款、账期、授信、担保、逾期付款及所有权保留机制',
        '交货、签收、验收、风险转移及客户拒收条件是否清晰',
        '质量保证、售后边界、间接损失和责任上限是否合理',
        '渠道区域、转售限制、最低业绩、终止后的库存和应收款处理'
    ],
    '服务合同': [
        '服务范围、交付成果、人员投入、服务标准和双方配合事项是否可衡量',
        '里程碑、验收标准、整改次数、默示验收及验收拖延处理',
        '计费方式、费用包含范围、报销、付款前提和发票要求',
        '成果知识产权、背景知识产权、保密及个人信息处理边界',
        '人员替换、分包、服务中断、提前终止及交接结算机制'
    ],
    '软件开发合同': [
        '需求范围、技术规格、里程碑、需求确认和变更控制流程是否明确',
        '测试环境、验收指标、缺陷等级、整改期限及上线标准是否可执行',
        '付款节点是否与可验证成果对应，需求变更是否同步调整费用和工期',
        '源代码、文档、开发成果、背景技术和开源组件的权利归属与交付范围',
        '数据安全、个人信息、网络安全、备份恢复和安全事件通知义务',
        '质保维护、SLA、停机补偿、迟延责任、责任上限及项目退出交接'
    ],
    '保密协议': [
        '保密信息定义、载体、标识要求及公开信息等排除情形是否清楚',
        '使用目的、可披露人员、关联方和顾问的范围及接收方管理责任',
        '依法披露的通知程序、最小披露原则及保护措施',
        '保密期限、商业秘密持续保护、资料返还销毁及备份例外',
        '违约金、损失证明、禁令救济，以及是否夹带竞业限制或交易限制'
    ],
    '租赁合同': [
        '出租权属、租赁物现状、用途、交付条件及证照是否满足使用目的',
        '租金、押金、税费、物业和能耗费用的计费、调整与退还规则',
        '维修保养、改造装修、消防安全、损毁灭失及保险责任分配',
        '转租、优先购买、续租、提前解约、腾退和恢复原状条件',
        '交付迟延、无法使用、政府征收或不可抗力下的租金减免和退出机制'
    ],
    '劳动合同': [
        '合同期限、试用期、工作岗位地点、工时休假及调整权限是否合法明确',
        '工资奖金、加班费、社会保险、福利和支付时间是否完整',
        '规章制度、绩效考核、岗位调整和培训服务期的适用条件',
        '保密、知识产权、竞业限制的范围期限及竞业补偿',
        '解除终止条件、通知程序、经济补偿和离职交接是否符合法律要求'
    ]
};

const POSITION_REVIEW_FOCUS = {
    '中立': [
        '平衡评价双方权利义务、风险承担和救济手段，指出显失公平或权责不对等之处',
        '同时说明风险对双方的影响，并给出可被双方接受的修改方案'
    ],
    '甲方': [
        '重点保护甲方对交付质量、进度、验收、监督审计和整改的控制权',
        '核查乙方陈述保证、赔偿责任、违约救济、替代履行及甲方解除权',
        '避免甲方付款义务早于成果确认，并控制知识产权、数据和第三方索赔风险'
    ],
    '乙方': [
        '重点保护乙方的收款确定性，核查付款期限、发票条件、验收拖延和甲方抵扣权',
        '明确甲方的资料、审批、现场和其他配合义务，因甲方原因应顺延工期并补偿成本',
        '限制乙方责任范围和累计上限，排除间接损失，并保障终止时已完成工作结算'
    ],
    '采购方': [
        '重点保护采购方对规格质量、交付进度、验收、质保和持续供应的控制权',
        '核查供应商资质、合规保证、知识产权不侵权、赔偿及召回责任',
        '确保付款与合格交付挂钩，并保留整改、替代采购、抵扣和解除救济'
    ],
    '供应商': [
        '重点保护供应商的订单确定性、合理排产和及时回款，限制采购方任意变更或取消',
        '明确验收期限和异议证据，避免无限期验收、无理由拒收或付款条件失控',
        '控制质保和赔偿边界、累计责任上限，并约定采购方配合及迟延责任'
    ]
};

const POSITION_PROMPT_DIRECTIVES = {
    '中立': '分别识别对甲乙双方不利的风险；逐项说明主要受影响方，并评价双方权利、义务、风险承担和救济是否对等。不得默认偏向任何一方，修改建议应兼顾交易目的、可执行性与双方利益平衡。',
    '甲方': '重点识别对甲方不利的风险，从甲方角度评价交付、验收、付款条件、知识产权、数据、违约救济和退出机制，并明确乙方应承担的义务。',
    '乙方': '重点识别对乙方不利的风险，从乙方角度评价收款、甲方配合、验收拖延、需求变更、责任范围与上限以及终止结算。',
    '采购方': '重点识别对采购方不利的风险，从采购方角度评价规格质量、交付、验收、质保、持续供应、合规保证和违约救济。',
    '供应商': '重点识别对供应商不利的风险，从供应商角度评价订单确定性、排产、验收、回款、采购方变更取消以及责任边界。'
};

function buildPositionDirective(reviewPosition) {
    return POSITION_PROMPT_DIRECTIVES[reviewPosition] || POSITION_PROMPT_DIRECTIVES['中立'];
}

let activeInstructionContextKey = '';

function getInstructionContext() {
    return {
        contractType: document.getElementById('contractType').value,
        reviewPosition: document.getElementById('reviewPosition').value
    };
}

function getInstructionContextKey(context = getInstructionContext()) {
    return `${context.contractType}::${context.reviewPosition}`;
}

function buildContextInstructions(contractType, reviewPosition) {
    const contractFocus = CONTRACT_REVIEW_FOCUS[contractType] || CONTRACT_REVIEW_FOCUS['自动识别'];
    const positionFocus = POSITION_REVIEW_FOCUS[reviewPosition] || POSITION_REVIEW_FOCUS['中立'];
    const numbered = [...contractFocus, ...positionFocus]
        .map((item, index) => `${index + 1}. ${item}`)
        .join('\n');
    return `请按“${contractType} × ${reviewPosition}”的场景重点审核：\n\n${numbered}\n\n同时检查合同主体、条款合法性、缺失条款、前后矛盾和表述歧义。风险结论必须结合原文和当前审查立场，给出可直接执行的修改建议。`;
}

function readContextInstructions() {
    try {
        return JSON.parse(localStorage.getItem(CONTEXT_INSTRUCTIONS_STORAGE_KEY) || '{}');
    } catch (_) {
        return {};
    }
}

function writeContextInstructions(value) {
    localStorage.setItem(CONTEXT_INSTRUCTIONS_STORAGE_KEY, JSON.stringify(value));
}

function updateInstructionHint(isCustom) {
    const { contractType, reviewPosition } = getInstructionContext();
    document.getElementById('instructionPresetHint').textContent = isCustom
        ? `✏️ 已保存自定义重点：${contractType} × ${reviewPosition}`
        : `✨ 已应用场景重点：${contractType} × ${reviewPosition}`;
}

function renderReviewFocusPreview() {
    const { contractType, reviewPosition } = getInstructionContext();
    const contractFocus = CONTRACT_REVIEW_FOCUS[contractType] || CONTRACT_REVIEW_FOCUS['自动识别'];
    const positionFocus = POSITION_REVIEW_FOCUS[reviewPosition] || POSITION_REVIEW_FOCUS['中立'];

    document.getElementById('contractFocusTitle').textContent = `${contractType}专项重点`;
    document.getElementById('positionFocusTitle').textContent = `${reviewPosition}立场保护重点`;

    const renderItems = (listElementId, moreElementId, items) => {
        const listElement = document.getElementById(listElementId);
        listElement.replaceChildren(...items.slice(0, 3).map(item => {
            const li = document.createElement('li');
            li.textContent = item;
            return li;
        }));
        document.getElementById(moreElementId).textContent = items.length > 3
            ? `另有 ${items.length - 3} 项，完整要求见下方`
            : '';
    };

    renderItems('contractFocusList', 'contractFocusMore', contractFocus);
    renderItems('positionFocusList', 'positionFocusMore', positionFocus);
}

// 固定的系统提示词（用户看不到，只控制输出格式）
const SYSTEM_PROMPT = `你是专业的中国合同审查助手。只输出一个有效 JSON 对象，不得输出 HTML、Markdown 或解释文字。

输出结构：
{
  "contractType": "识别出的合同类型",
  "reviewedFrom": "审查立场，例如甲方、乙方或中立",
  "summary": "100字以内总体结论",
  "issues": [
    {
      "id": "稳定且唯一的短ID",
      "sourceText": "必须逐字引用合同中存在问题的完整句子或段落",
      "category": "付款/交付验收/违约责任/解除终止/知识产权/保密数据/争议解决/主体资质/表述歧义/缺失条款/其他",
      "severity": "high/medium/low",
      "affectedParty": "主要受影响的一方",
      "confidence": 0.0,
      "problem": "具体风险及触发条件",
      "rationale": "为什么构成风险，不得编造法律依据",
      "suggestion": "可执行的谈判或修改建议",
      "replacementText": "可直接替换原文的完整条款；无法直接替换时留空"
    }
  ],
  "keyTerms": [
    {
      "id": "核心要素ID",
      "category": "主体/金额/付款/期限/交付验收/续约/解除/保密/知识产权/责任限制/争议解决/其他",
      "label": "要素名称",
      "value": "从原文提取的值",
      "sourceText": "对应合同原文",
      "confidence": 0.0
    }
  ],
  "obligations": [
    {
      "id": "履约事项ID",
      "responsibleParty": "责任方",
      "action": "需要完成的事项",
      "trigger": "开始计算期限的条件",
      "dueDate": "仅在原文明确绝对日期时填写YYYY-MM-DD，否则留空",
      "dueRule": "相对期限原文，例如验收合格后30日内",
      "amount": "相关金额或比例，没有则留空",
      "consequence": "未履行的合同后果",
      "sourceText": "对应合同原文",
      "confidence": 0.0
    }
  ]
}

要求：
1. sourceText 必须来自原合同；缺失条款的 sourceText 可以为空。
2. severity 仅允许 high、medium、low。
3. 不确定时降低 confidence，不得虚构事实或法条。
4. 合并重复问题，但不得因数量限制遗漏高风险或关键条款问题。
5. keyTerms 和 obligations 必须基于原文；不得推算未写明的日期、金额或责任方。
6. 相对期限只填写 dueRule；只有原文明示完整年月日时才填写 dueDate。`;

function loadApiKey() {
    const savedKey = localStorage.getItem(STORAGE_KEY);
    if (savedKey) {
        document.getElementById('apiKey').value = savedKey;
    }
}

function saveApiKey() {
    const apiKey = document.getElementById('apiKey').value;
    if (apiKey) {
        localStorage.setItem(STORAGE_KEY, apiKey);
    }
}

document.getElementById('apiKey').addEventListener('change', saveApiKey);

function loadInstructions() {
    const context = getInstructionContext();
    const key = getInstructionContextKey(context);
    const savedByContext = readContextInstructions();
    const legacySaved = localStorage.getItem(INSTRUCTIONS_STORAGE_KEY);
    let isCustom = false;

    if (savedByContext[key]) {
        document.getElementById('reviewInstructions').value = savedByContext[key];
        isCustom = true;
    } else if (legacySaved) {
        document.getElementById('reviewInstructions').value = legacySaved;
        savedByContext[key] = legacySaved;
        writeContextInstructions(savedByContext);
        localStorage.removeItem(INSTRUCTIONS_STORAGE_KEY);
        isCustom = true;
    } else {
        document.getElementById('reviewInstructions').value = buildContextInstructions(context.contractType, context.reviewPosition);
    }

    activeInstructionContextKey = key;
    renderReviewFocusPreview();
    updateInstructionHint(isCustom);
}

function saveInstructions() {
    const v = document.getElementById('reviewInstructions').value;
    if (!v) return;
    const savedByContext = readContextInstructions();
    savedByContext[getInstructionContextKey()] = v;
    writeContextInstructions(savedByContext);
    activeInstructionContextKey = getInstructionContextKey();
    updateInstructionHint(true);
}

function resetInstructions() {
    const context = getInstructionContext();
    const key = getInstructionContextKey(context);
    const savedByContext = readContextInstructions();
    delete savedByContext[key];
    writeContextInstructions(savedByContext);
    document.getElementById('reviewInstructions').value = buildContextInstructions(context.contractType, context.reviewPosition);
    activeInstructionContextKey = key;
    updateInstructionHint(false);
}

function changeInstructionContext() {
    const nextKey = getInstructionContextKey();
    if (nextKey === activeInstructionContextKey) return;
    loadInstructions();
}

document.getElementById('reviewInstructions').addEventListener('change', saveInstructions);
document.getElementById('reviewInstructions').addEventListener('input', saveInstructions);
document.getElementById('contractType').addEventListener('change', changeInstructionContext);
document.getElementById('reviewPosition').addEventListener('change', changeInstructionContext);

// 拖拽上传
const uploadArea = document.getElementById('fileUploadArea');

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        handleFile(file);
    }
}

async function handleFile(file) {
    if (!file.name.endsWith('.docx')) {
        updateStatus("❌ 请上传 .docx 格式的文件", 'error');
        return;
    }
    
    // 清空旧预览和聊天记录
    clearPreviewLight();

    const fileInfo = document.getElementById('fileInfo');
    fileInfo.style.display = 'block';
    fileInfo.innerHTML = `📄 已上传：${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    
    updateStatus("📖 正在提取合同文本...", 'info');
    try {
        const arrayBuffer = await file.arrayBuffer();
        originalFileBuffer = arrayBuffer;
        const textResult = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
        originalPlainText = textResult.value;
        
        const htmlResult = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
        originalHtmlContent = htmlResult.value;

        // 计算内容哈希，检测重复
        const contentHash = simpleHash(originalPlainText);
        const dupRecord = getHistory().find(h => h.contentHash === contentHash);
        if (dupRecord) {
            const action = await showDupModal(dupRecord);
            if (action === 'cancel') { updateStatus("📄 已取消上传", 'info'); return; }
            if (action === 'update') {
                currentHistoryItem = dupRecord;
                currentReviewMeta = dupRecord.reviewMeta || null;
                currentContractLedger = dupRecord.contractLedger || { keyTerms: [], obligations: [] };
                // 载入历史审核结果到预览面板
                currentIssues = dupRecord.issues || [];
                updatePreview(dupRecord.annotatedHtml || '', dupRecord.issues || [], false);
                renderContractLedger();
                document.getElementById('downloadBtn').disabled = false;
                if (Array.isArray(dupRecord.chatMessages)) {
                    chatMessages = dupRecord.chatMessages;
                    renderChatMessages();
                }
                updateChatContractBadge();
                updateStatus(`✅ 已载入历史审核结果：${dupRecord.filename}`, 'success');
            }
        }

        // Capture DOCX paragraph XML at upload time for reliable replacement later
        const zip = await JSZip.loadAsync(arrayBuffer);
        let docXmlText = await zip.file('word/document.xml').async('string');
        docxParagraphs = getDocxParagraphs(docXmlText);

        const originalDiv = document.getElementById('codeContent');
        originalDiv.innerHTML = '';

        // Build mapping: match each HTML paragraph to its DOCX paragraph
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = originalHtmlContent || originalPlainText;
        const htmlParas = Array.from(tempDiv.querySelectorAll('p, h1, h2, h3, li'))
            .map(el => el.textContent.trim())
            .filter(t => t.length > 0);

        htmlToDocxMap = [];
        const usedDocx = new Set();
        for (let hi = 0; hi < htmlParas.length; hi++) {
            const key = htmlParas[hi].replace(/\s+/g, '').substring(0, 80);
            let bestIdx = -1, bestScore = 0;
            for (let di = 0; di < docxParagraphs.length; di++) {
                if (usedDocx.has(di)) continue;
                const clean = docxParagraphs[di].text.replace(/\s+/g, '');
                if (clean.includes(key)) {
                    const s = key.length / Math.max(1, clean.length);
                    if (s > bestScore && s > 0.2) { bestScore = s; bestIdx = di; }
                }
            }
            if (bestIdx >= 0) {
                usedDocx.add(bestIdx);
                htmlToDocxMap.push(bestIdx);
            } else {
                htmlToDocxMap.push(-1);
            }
        }

        initQuillEditor(originalHtmlContent || originalPlainText);
        
        updateStatus(`✅ 合同提取成功，共 ${originalPlainText.length} 字符，点击审核`, 'success');
        document.getElementById('checkBtn').disabled = false;
    } catch (error) {
        console.error("提取文本失败:", error);
        updateStatus(`❌ 提取文本失败: ${error.message}`, 'error');
    }
}

function cleanupQuillEditor() {
    if (!quillEditor) return;
    if (quillEditor.root) {
        quillEditor.root.removeEventListener('mousemove', handleEditorMouseMove);
        quillEditor.root.removeEventListener('mouseleave', handleEditorMouseLeave);
        quillEditor.root.removeEventListener('click', handleEditorComparisonClick);
    }
    quillEditor = null;
}

function initQuillEditor(htmlContent) {
    cleanupQuillEditor();
    // Save original paragraphs for downloadEditedDoc matching
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    quillOriginalParagraphs = Array.from(tempDiv.querySelectorAll('p, h1, h2, h3, li'))
        .map(el => el.textContent.trim())
        .filter(t => t.length > 0);
    if (quillOriginalParagraphs.length === 0) {
        quillOriginalParagraphs = htmlContent.split('\n').map(s => s.trim()).filter(t => t.length > 0);
    }

    const codeContent = document.getElementById('codeContent');
    codeContent.innerHTML = '';
    const editorDiv = document.createElement('div');
    editorDiv.id = 'quillEditorContainer';
    codeContent.appendChild(editorDiv);
    quillEditor = new Quill('#quillEditorContainer', {
        theme: 'snow',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'header': [1, 2, 3, false] }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['clean']
            ]
        },
        placeholder: '合同内容将显示在这里，可直接编辑...'
    });
    quillEditor.clipboard.dangerouslyPasteHTML(htmlContent);
    quillEditor.root.addEventListener('click', handleEditorComparisonClick);
    refreshComparisonIndices();
    initHoverOptimization();
    document.getElementById('downloadEditedBtn').disabled = false;
}

function updateStatus(message, type = 'info') {
    const statusDiv = document.getElementById('status');
    statusDiv.innerHTML = message;
    statusDiv.className = `status ${type}`;
}

function showLoading(btnId) {
    const btn = document.getElementById(btnId);
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> 处理中...';
}

function hideLoading(btnId, originalText) {
    const btn = document.getElementById(btnId);
    btn.disabled = false;
    btn.innerHTML = originalText;
}

function escapeHtml(text) {
    return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderMarkdown(text) {
    if (!text) return '';
    let html = escapeHtml(text);
    // 代码块 ```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    // 行内代码 `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // 粗体 **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // 斜体 *text*
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // 标题（多级）
    html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h3>$1</h3>');
    // Markdown 表格
    html = html.replace(/(\|[^\n]+\|\n\|[-: |]+\|\n(?:\|[^\n]+\|\n?)+)/g, function(match) {
        const lines = match.trim().split('\n');
        let table = '<table>';
        lines.forEach((line, i) => {
            if (i === 1) return; // 跳过分隔行
            const cells = line.split('|').filter(c => c.trim() !== '');
            const tag = i === 0 ? 'th' : 'td';
            table += '<tr>' + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>';
        });
        table += '</table>';
        return table;
    });
    // - 无序列表
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    // 引用 > text
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    // 双换行 → 段落
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    // 单换行 → <br>
    html = html.replace(/\n/g, '<br>');
    // 清理空标签
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p><br><\/p>/g, '');
    return html;
}

function getComparisonBlocks(selector) {
    return Array.from(document.querySelectorAll(selector)).filter(element => element.textContent.trim());
}

function refreshComparisonIndices() {
    getComparisonBlocks(PREVIEW_COMPARE_BLOCKS).forEach((element, index) => {
        element.dataset.comparisonIndex = String(index);
        if (!element.title) element.title = '点击定位右侧对应段落';
    });
    getComparisonBlocks(EDITOR_COMPARE_BLOCKS).forEach((element, index) => {
        element.dataset.comparisonIndex = String(index);
        if (!element.title) element.title = '点击定位左侧对应段落';
    });
}

function findComparisonMatch(source, candidates) {
    if (!source || !candidates.length) return null;
    const sourceText = source.textContent.trim();
    let best = null;
    let bestScore = 0;
    candidates.forEach(candidate => {
        const score = ContractReviewCore.overlapScore(sourceText, candidate.textContent);
        if (score > bestScore) {
            best = candidate;
            bestScore = score;
        }
    });
    if (best && bestScore >= 0.18) return best;
    const fallbackIndex = Number(source.dataset.comparisonIndex);
    return Number.isInteger(fallbackIndex) ? candidates[fallbackIndex] || null : null;
}

function findScrollableComparisonContainer(target, fallback) {
    let current = target && target.parentElement;
    while (current && current !== document.body) {
        const style = getComputedStyle(current);
        const canScroll = /(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight + 2;
        if (canScroll) return current;
        current = current.parentElement;
    }
    return fallback;
}

function scrollComparisonTarget(target, fallbackContainer) {
    if (!target) return;
    const container = findScrollableComparisonContainer(target, fallbackContainer);
    if (!container) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        return;
    }
    const targetRect = target.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const top = container.scrollTop + targetRect.top - containerRect.top - (container.clientHeight - targetRect.height) / 2;
    container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

function highlightComparisonPair(previewBlock, editorBlock, scrollPreview = false, scrollEditor = false) {
    document.querySelectorAll('.comparison-linked-active').forEach(element => element.classList.remove('comparison-linked-active'));
    if (comparisonHighlightTimer) clearTimeout(comparisonHighlightTimer);
    if (previewBlock) previewBlock.classList.add('comparison-linked-active');
    if (editorBlock) editorBlock.classList.add('comparison-linked-active');
    if (scrollPreview) scrollComparisonTarget(previewBlock, document.getElementById('previewContent'));
    if (scrollEditor) scrollComparisonTarget(editorBlock, document.getElementById('codeContent'));
    comparisonHighlightTimer = setTimeout(() => {
        document.querySelectorAll('.comparison-linked-active').forEach(element => element.classList.remove('comparison-linked-active'));
    }, 2600);
}

function handlePreviewComparisonClick(event) {
    const previewBlock = event.target.closest(PREVIEW_COMPARE_BLOCKS);
    if (!previewBlock || !document.getElementById('previewContent').contains(previewBlock)) return;
    const editorBlock = findComparisonMatch(previewBlock, getComparisonBlocks(EDITOR_COMPARE_BLOCKS));
    if (!editorBlock) {
        updateStatus('⚠️ 未能可靠匹配右侧段落', 'info');
        return;
    }
    highlightComparisonPair(previewBlock, editorBlock, false, true);
}

function handleEditorComparisonClick(event) {
    const editorBlock = event.target.closest(EDITOR_COMPARE_BLOCKS);
    if (!editorBlock || !quillEditor || !quillEditor.root.contains(editorBlock)) return;
    const previewBlock = findComparisonMatch(editorBlock, getComparisonBlocks(PREVIEW_COMPARE_BLOCKS));
    if (!previewBlock) {
        updateStatus('⚠️ 未能可靠匹配左侧段落', 'info');
        return;
    }
    highlightComparisonPair(previewBlock, editorBlock, true, false);
}

function switchResultTab(tabName, scrollIntoView = false) {
    const validTabs = ['risk', 'ledger', 'preview', 'editor'];
    const selected = validTabs.includes(tabName) ? tabName : 'risk';
    document.querySelectorAll('[data-result-tab]').forEach(button => {
        const active = button.dataset.resultTab === selected;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('[data-result-panel]').forEach(panel => {
        panel.classList.toggle('active', panel.dataset.resultPanel === selected);
    });
    if (scrollIntoView) {
        document.getElementById('resultWorkspace').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function refreshResultNavigation() {
    const riskCount = Array.isArray(currentIssues) ? currentIssues.length : 0;
    const termCount = Array.isArray(currentContractLedger.keyTerms) ? currentContractLedger.keyTerms.length : 0;
    const obligationCount = Array.isArray(currentContractLedger.obligations) ? currentContractLedger.obligations.length : 0;
    document.getElementById('riskTabCount').textContent = riskCount;
    document.getElementById('ledgerTabCount').textContent = termCount + obligationCount;
    document.getElementById('riskEmptyState').style.display = riskCount ? 'none' : 'block';
    document.getElementById('ledgerEmptyState').style.display = termCount || obligationCount ? 'none' : 'block';
}

function updateSummaryCard(issues) {
    const summaryCard = document.getElementById('summaryCard');
    const issueListDiv = document.getElementById('issueList');
    
    if (issues.length === 0) {
        summaryCard.style.display = 'none';
        refreshResultNavigation();
        return;
    }
    
    summaryCard.style.display = 'block';
    const counts = issues.reduce((result, issue) => {
        result[issue.severity] = (result[issue.severity] || 0) + 1;
        return result;
    }, { high: 0, medium: 0, low: 0 });
    const labels = { all: `全部 ${issues.length}`, high: `高风险 ${counts.high}`, medium: `中风险 ${counts.medium}`, low: `低风险 ${counts.low}` };
    const toolbar = Object.keys(labels).map(level => `
        <button class="risk-filter ${currentRiskFilter === level ? 'active' : ''}" onclick="setRiskFilter('${level}')">${labels[level]}</button>
    `).join('');
    const severityLabels = { high: '高风险', medium: '中风险', low: '低风险' };
    const decisionLabels = { pending: '待处理', accepted: '已采纳', ignored: '已忽略' };
    const visibleIssues = issues.map((issue, index) => ({ issue, index }))
        .filter(({ issue }) => currentRiskFilter === 'all' || issue.severity === currentRiskFilter);
    const rows = visibleIssues.map(({ issue, index }) => {
        const confidence = issue.confidence == null ? '' : `<span class="issue-tag">置信度 ${Math.round(issue.confidence * 100)}%</span>`;
        const acceptDisabled = !issue.replacementText ? 'disabled title="AI 未提供可直接替换的文本"' : '';
        return `<div class="issue-item severity-${issue.severity} decision-${issue.decision}">
            <div class="issue-meta">
                <span class="issue-tag">${severityLabels[issue.severity]}</span>
                <span class="issue-tag">${escapeHtml(issue.category)}</span>
                <span class="issue-tag">影响：${escapeHtml(issue.affectedParty)}</span>
                ${confidence}
                <span class="issue-tag">${decisionLabels[issue.decision]}</span>
            </div>
            <div class="issue-problem">⚠️ 问题 ${index + 1}：${escapeHtml(issue.problem)}</div>
            ${issue.rationale ? `<div style="font-size:12px;color:#64748b;margin-bottom:6px;">依据：${escapeHtml(issue.rationale)}</div>` : ''}
            <div class="issue-suggestion">💡 建议：${escapeHtml(issue.suggestion)}</div>
            ${issue.replacementText ? `<div style="font-size:12px;color:#334155;margin-top:6px;">替换文本：${escapeHtml(issue.replacementText)}</div>` : ''}
            <div class="issue-actions">
                <button class="btn-primary btn-compact" onclick="applyIssueReplacement(${index})" ${acceptDisabled}>✓ 采纳并替换</button>
                <button class="btn-quiet btn-compact" onclick="setIssueDecision(${index}, 'ignored')">忽略</button>
                <button class="btn-secondary btn-compact" onclick="scrollToIssue(${index})">定位原文</button>
            </div>
        </div>`;
    }).join('');
    const meta = currentReviewMeta
        ? `<div style="font-size:12px;color:#64748b;margin-bottom:10px;">${escapeHtml(currentReviewMeta.contractType)} · ${escapeHtml(currentReviewMeta.reviewedFrom)}${currentReviewMeta.summary ? ` · ${escapeHtml(currentReviewMeta.summary)}` : ''}</div>`
        : '';
    issueListDiv.innerHTML = `${meta}<div class="risk-toolbar">${toolbar}</div>${rows || '<div style="color:#888;padding:12px;">该等级暂无风险</div>'}`;
    refreshResultNavigation();
}

function setRiskFilter(level) {
    currentRiskFilter = ['all', 'high', 'medium', 'low'].includes(level) ? level : 'all';
    updateSummaryCard(currentIssues);
}

function setIssueDecision(index, decision) {
    if (!currentIssues[index]) return;
    currentIssues[index].decision = decision;
    updateSummaryCard(currentIssues);
    persistCurrentReviewState();
}

function scrollToIssue(index) {
    const issueId = currentIssues[index] && currentIssues[index].id;
    switchResultTab('preview');
    requestAnimationFrame(() => {
        const target = document.querySelector(`#previewContent [data-issue-index="${index}"]`) ||
            Array.from(document.querySelectorAll('#previewContent [data-issue-id]')).find(element => element.dataset.issueId === issueId);
        if (!target) return;
        const previewBlock = target.classList.contains('issue-annotation')
            ? target.previousElementSibling
            : target;
        const editorBlock = findComparisonMatch(previewBlock, getComparisonBlocks(EDITOR_COMPARE_BLOCKS));
        highlightComparisonPair(previewBlock, editorBlock, true, true);
    });
}

function applyIssueReplacement(index) {
    const issue = currentIssues[index];
    if (!issue || !issue.replacementText || !quillEditor) return;
    const paragraphs = Array.from(quillEditor.root.querySelectorAll('p,li,h1,h2,h3,h4,h5,h6'));
    let best = null;
    let bestScore = 0;
    paragraphs.forEach(paragraph => {
        const score = ContractReviewCore.overlapScore(paragraph.textContent, issue.sourceText);
        if (score > bestScore) { best = paragraph; bestScore = score; }
    });
    if (!best || bestScore < 0.18) {
        updateStatus('❌ 无法可靠定位原文，请在右侧手动修改', 'error');
        return;
    }
    try {
        const blot = Quill.find(best);
        const offset = quillEditor.getIndex(blot);
        quillEditor.deleteText(offset, Math.max(0, blot.length() - 1), 'user');
        quillEditor.insertText(offset, issue.replacementText, 'user');
        issue.decision = 'accepted';
        updateSummaryCard(currentIssues);
        persistCurrentReviewState();
        updateStatus(`✅ 已采纳问题 ${index + 1} 的修改建议`, 'success');
    } catch (error) {
        updateStatus(`❌ 应用修改失败：${error.message}`, 'error');
    }
}

function persistCurrentReviewState() {
    if (!currentHistoryItem) return;
    const history = getHistory();
    const item = history.find(entry => entry.id === currentHistoryItem.id);
    if (!item) return;
    item.issues = currentIssues;
    item.reviewMeta = currentReviewMeta;
    item.contractLedger = currentContractLedger;
    item.editedContent = quillEditor ? quillEditor.root.innerHTML : item.editedContent;
    persistHistoryItemRecord(item);
    currentHistoryItem = item;
}

function renderContractLedger() {
    const card = document.getElementById('contractLedgerCard');
    const content = document.getElementById('contractLedgerContent');
    const terms = Array.isArray(currentContractLedger.keyTerms) ? currentContractLedger.keyTerms : [];
    const obligations = Array.isArray(currentContractLedger.obligations) ? currentContractLedger.obligations : [];
    if (!terms.length && !obligations.length) {
        card.style.display = 'none';
        content.innerHTML = '';
        refreshResultNavigation();
        return;
    }
    card.style.display = 'block';
    const termHtml = terms.length ? `<div class="ledger-grid">${terms.map(term => `
        <div class="ledger-term" title="原文：${escapeHtml(term.sourceText || '未提供')}，置信度：${term.confidence == null ? '未知' : Math.round(term.confidence * 100) + '%'}">
            <div class="ledger-term-label">${escapeHtml(term.category)} · ${escapeHtml(term.label)}</div>
            <div class="ledger-term-value">${escapeHtml(term.value)}</div>
        </div>`).join('')}</div>` : '';
    const statusLabels = { pending: '待履行', completed: '已完成', waived: '已豁免' };
    const obligationHtml = obligations.length ? `<div class="ledger-table-wrap"><table class="ledger-table">
        <thead><tr><th>责任方</th><th>履约事项</th><th>触发/期限</th><th>金额</th><th>未履行后果</th><th>状态</th></tr></thead>
        <tbody>${obligations.map((item, index) => `<tr class="${item.status === 'completed' ? 'ledger-status-completed' : ''}" title="原文：${escapeHtml(item.sourceText || '未提供')}，置信度：${item.confidence == null ? '未知' : Math.round(item.confidence * 100) + '%'}">
            <td>${escapeHtml(item.responsibleParty)}</td>
            <td>${escapeHtml(item.action)}</td>
            <td>${escapeHtml([item.trigger, item.dueDate, item.dueRule].filter(Boolean).join('；') || '未明确')}</td>
            <td>${escapeHtml(item.amount || '—')}</td>
            <td>${escapeHtml(item.consequence || '—')}</td>
            <td><button class="btn-quiet btn-mini" onclick="cycleObligationStatus(${index})">${statusLabels[item.status] || '待履行'}</button></td>
        </tr>`).join('')}</tbody>
    </table></div>` : '<div style="font-size:12px;color:#64748b;">未提取到明确履约事项</div>';
    content.innerHTML = `${termHtml}${obligationHtml}`;
    refreshResultNavigation();
}

function cycleObligationStatus(index) {
    const item = currentContractLedger.obligations[index];
    if (!item) return;
    item.status = item.status === 'pending' ? 'completed' : item.status === 'completed' ? 'waived' : 'pending';
    renderContractLedger();
    persistCurrentReviewState();
}

function csvCell(value) {
    return `"${String(value == null ? '' : value).replace(/"/g, '""')}"`;
}

function downloadTextFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

function exportContractLedgerCsv() {
    const rows = [['记录类型', '分类/责任方', '名称/事项', '值/期限', '触发条件', '金额', '未履行后果', '原文', '置信度', '状态']];
    currentContractLedger.keyTerms.forEach(term => rows.push([
        '合同要素', term.category, term.label, term.value, '', '', '', term.sourceText,
        term.confidence == null ? '' : Math.round(term.confidence * 100) + '%', ''
    ]));
    currentContractLedger.obligations.forEach(item => rows.push([
        '履约事项', item.responsibleParty, item.action, item.dueDate || item.dueRule,
        item.trigger, item.amount, item.consequence, item.sourceText,
        item.confidence == null ? '' : Math.round(item.confidence * 100) + '%', item.status
    ]));
    const csv = '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    downloadTextFile(csv, `合同履约台账_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8');
}

function escapeIcs(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function exportContractLedgerIcs() {
    const dated = currentContractLedger.obligations.filter(item => /^\d{4}-\d{2}-\d{2}$/.test(item.dueDate || ''));
    if (!dated.length) {
        updateStatus('⚠️ 没有原文明示的绝对日期可导出；相对期限已保留在 CSV 台账中', 'info');
        return;
    }
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const events = dated.map((item, index) => {
        const start = item.dueDate.replace(/-/g, '');
        const endDate = new Date(`${item.dueDate}T00:00:00Z`);
        endDate.setUTCDate(endDate.getUTCDate() + 1);
        const end = endDate.toISOString().slice(0, 10).replace(/-/g, '');
        return ['BEGIN:VEVENT', `UID:${escapeIcs(item.id)}-${index}@contract-reviewer`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${start}`, `DTEND;VALUE=DATE:${end}`, `SUMMARY:${escapeIcs(item.responsibleParty + '：' + item.action)}`, `DESCRIPTION:${escapeIcs([item.trigger, item.dueRule, item.amount, item.consequence, item.sourceText].filter(Boolean).join('\n'))}`, 'END:VEVENT'].join('\r\n');
    });
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Contract Reviewer//Performance Ledger//CN', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join('\r\n');
    downloadTextFile(ics, `合同履约日历_${new Date().toISOString().slice(0, 10)}.ics`, 'text/calendar;charset=utf-8');
}

async function loadLegalBasisArticles() {
    if (!window.LegalBasisEvidence) return [];
    legalBasisArticles = window.LegalBasisEvidence.getAllArticles(window.CIVIL_CODE_ARTICLES, window.LEGAL_BASIS_DATA);
    return legalBasisArticles;
}

async function verifyLegalBasisEvidenceForIssue(issue, candidates) {
    const apiKey = document.getElementById('apiKey').value.trim();
    const model = document.getElementById('model').value;
    const candidateText = window.LegalBasisEvidence.formatLegalBasisForPrompt(candidates);
    const prompt = `请复核以下分层检索得到的现行法律候选条文。最多选择5条；区分直接规范本问题的“direct”和用于解释、补充的一般规则“supplemental”；仅有词语相同但规范事项不同的不得选择。如果均不相关，返回空数组。只输出JSON，不要解释。\n\n合同原文片段：\n${issue.sourceText || ''}\n\n审核问题：\n${issue.problem || ''}\n\n修改建议：\n${issue.suggestion || ''}\n\n候选条文：\n${candidateText}\n\n输出格式：{"selected":[{"id":"候选ID","lawTitle":"法律或司法解释全称","articleNo":"条号","relevance":"direct或supplemental","reason":"说明该条如何规范当前问题"}]}`;
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: '你是法律依据核对助手。只能从用户提供的现行有效候选法条中选择，必须原样返回候选ID、文件名和条号，不得编造或引用候选外法条。必须排除仅关键词相同但调整对象不同的条文，并区分直接依据与补充依据。只输出JSON。' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 1200,
            thinking: { type: 'disabled' },
            response_format: { type: 'json_object' }
        })
    });
    if (!response.ok) throw new Error(`API请求失败（HTTP ${response.status}）`);
    const data = await response.json();
    const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return window.LegalBasisEvidence.parseVerifiedSelection(content, candidates);
}

async function retrieveLegalBasisCandidates(issue, contractType) {
    // Suggestions often contain generic drafting words such as "payment" or
    // "breach". They are useful for rewriting, but pollute legal retrieval.
    const retrievalIssue = { ...issue, suggestion: '' };
    const lexical = window.LegalBasisEvidence.matchLegalBasisArticles(
        legalBasisArticles,
        retrievalIssue,
        28,
        { contractType }
    );
    const query = window.LegalBasisEvidence.buildVectorQuery(retrievalIssue);
    if (!query || location.protocol === 'file:') return lexical.slice(0, 16);
    try {
        const response = await fetch('/api/legal-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, topK: 48 })
        });
        if (!response.ok) throw new Error(`vector service ${response.status}`);
        const data = await response.json();
        return window.LegalBasisEvidence.mergeVectorMatches(
            legalBasisArticles,
            lexical,
            data.matches,
            retrievalIssue,
            16,
            { contractType }
        );
    } catch (error) {
        console.warn('本地向量检索不可用，已回退关键词检索。', error);
        return lexical.slice(0, 16);
    }
}

function compactEvidenceMatches(matches) {
    return (matches || []).map(match => ({
        id: match.id,
        score: Number(match.score) || 0,
        vectorScore: Number(match.vectorScore) || 0,
        relevance: match.relevance || 'supplemental',
        retrievalMode: match.retrievalMode || '',
        routeTier: match.routeTier || '',
        verificationStatus: match.verificationStatus || '',
        reason: match.reason || ''
    }));
}

function persistLegalEvidenceResult(historyItemId, issue, status, candidates, displayedMatches, errorMessage) {
    if (!historyItemId || !issue) return;
    const historyItem = getHistory().find(item => item.id === historyItemId);
    if (!historyItem) return;
    if (!historyItem.legalEvidenceByIssue || typeof historyItem.legalEvidenceByIssue !== 'object') historyItem.legalEvidenceByIssue = {};
    historyItem.legalEvidenceByIssue[issue.id] = {
        status,
        candidates: compactEvidenceMatches(candidates),
        displayedMatches: compactEvidenceMatches(displayedMatches),
        errorMessage: String(errorMessage || '').slice(0, 300),
        reviewedAt: new Date().toISOString(),
        model: document.getElementById('model').value,
        legalLibraryVersion: window.LEGAL_BASIS_DATA && window.LEGAL_BASIS_DATA.generatedAt || ''
    };
    persistHistoryItemRecord(historyItem);
    if (currentHistoryItem && currentHistoryItem.id === historyItem.id) currentHistoryItem = historyItem;
}

function hydrateEvidenceMatches(compactMatches) {
    const articleMap = new Map((legalBasisArticles || []).map(article => [article.id, article]));
    return (Array.isArray(compactMatches) ? compactMatches : []).map(stored => {
        const article = articleMap.get(stored.id);
        return article ? { ...article, ...stored } : null;
    }).filter(Boolean);
}

function restoreLegalBasisEvidence(issues, evidenceByIssue) {
    const annotations = document.querySelectorAll('#previewContent .issue-annotation');
    annotations.forEach(annotation => {
        if (annotation.nextElementSibling && annotation.nextElementSibling.classList.contains('civil-code-evidence')) return;
        const issueIndex = Number.parseInt(annotation.dataset.issueIndex, 10);
        const issue = Number.isInteger(issueIndex) ? issues[issueIndex] : null;
        if (!issue) return;
        const stored = evidenceByIssue && evidenceByIssue[issue.id];
        if (!stored) {
            annotation.insertAdjacentHTML('afterend', window.LegalBasisEvidence.renderEvidenceState('history-missing', []));
            return;
        }
        const matches = hydrateEvidenceMatches(stored.displayedMatches);
        let html = '';
        if (matches.length) html = window.LegalBasisEvidence.renderEvidence(matches);
        else if (stored.status === 'reviewed-empty') html = window.LegalBasisEvidence.renderEvidenceState('reviewed-empty', []);
        else if (stored.status === 'review-failed') html = window.LegalBasisEvidence.renderEvidenceState('error', [], stored.errorMessage);
        else html = window.LegalBasisEvidence.renderEvidenceState('empty', []);
        annotation.insertAdjacentHTML('afterend', html);
    });
}

async function recheckHistoryLegalEvidence() {
    if (!currentHistoryItem || !currentIssues.length) return;
    document.querySelectorAll('#previewContent .civil-code-evidence').forEach(element => element.remove());
    await loadLegalBasisArticles();
    appendLegalBasisEvidence(currentIssues, currentHistoryItem.id);
}

function appendLegalBasisEvidence(issues, historyItemId) {
    if (!window.LegalBasisEvidence || !Array.isArray(legalBasisArticles) || legalBasisArticles.length === 0) return;
    const contractType = document.getElementById('contractType').value;
    const annotations = document.querySelectorAll('#previewContent .issue-annotation');
    annotations.forEach(annotation => {
        if (annotation.nextElementSibling && annotation.nextElementSibling.classList.contains('civil-code-evidence')) return;
        const issueIndex = Number.parseInt(annotation.dataset.issueIndex, 10);
        const issue = Number.isInteger(issueIndex) ? issues[issueIndex] : null;
        if (!issue) return;
        annotation.insertAdjacentHTML('afterend', window.LegalBasisEvidence.renderEvidenceState('loading', []));
        const placeholder = annotation.nextElementSibling;
        let retrievedCandidates = [];
        retrieveLegalBasisCandidates(issue, contractType)
            .then(candidates => {
                retrievedCandidates = candidates;
                if (!candidates.length) {
                    placeholder.outerHTML = window.LegalBasisEvidence.renderEvidenceState('empty', []);
                    persistLegalEvidenceResult(historyItemId, issue, 'no-candidates', [], [], '');
                    return null;
                }
                return verifyLegalBasisEvidenceForIssue(issue, candidates)
                    .then(matches => ({ candidates, matches }));
            })
            .then(result => {
                if (!result) return;
                const { candidates, matches } = result;
                const fallbackMatches = window.LegalBasisEvidence.getLocalFallbackSelection(candidates, 3, { reviewStatus: 'reviewed-empty' });
                placeholder.outerHTML = matches.length
                    ? window.LegalBasisEvidence.renderEvidence(matches)
                    : (fallbackMatches.length
                        ? window.LegalBasisEvidence.renderEvidence(fallbackMatches)
                        : window.LegalBasisEvidence.renderEvidenceState('reviewed-empty', []));
                persistLegalEvidenceResult(
                    historyItemId,
                    issue,
                    matches.length ? 'adopted' : 'reviewed-empty',
                    candidates,
                    matches.length ? matches : fallbackMatches,
                    ''
                );
            })
            .catch(error => {
                console.error('AI法律依据复核失败', error);
                const fallbackMatches = window.LegalBasisEvidence.getLocalFallbackSelection(retrievedCandidates, 3, {
                    reviewStatus: 'review-failed',
                    errorMessage: error && error.message
                });
                placeholder.outerHTML = fallbackMatches.length
                    ? window.LegalBasisEvidence.renderEvidence(fallbackMatches)
                    : window.LegalBasisEvidence.renderEvidenceState('error', [], error && error.message);
                persistLegalEvidenceResult(historyItemId, issue, 'review-failed', retrievedCandidates, fallbackMatches, error && error.message);
            });
    });
}

function getDocxParagraphs(xml) {
    const paras = [];
    const paraRegex = /<w:p[\s>]([\s\S]*?)<\/w:p>/g;
    let m;
    while ((m = paraRegex.exec(xml)) !== null) {
        const tr = /<w:t[^>]*>([^<]*)<\/w:t>/g;
        let text = '', tm;
        while ((tm = tr.exec(m[1])) !== null) text += tm[1];
        paras.push({ full: m[0], xml: m[0], text: text.trim() });
    }
    return paras;
}

function updatePreview(annotatedHtml, issues, persistHistory = true) {
    const previewDiv = document.getElementById('previewContent');
    const downloadBtn = document.getElementById('downloadBtn');
    issues = (Array.isArray(issues) ? issues : []).map((issue, index) => ContractReviewCore.normalizeIssue(issue, index));
    const safeContainer = document.createElement('div');
    safeContainer.innerHTML = String(annotatedHtml || '');
    ContractReviewCore.sanitizeElementTree(safeContainer);
    annotatedHtml = safeContainer.innerHTML;
    
    currentIssues = issues;
    
    previewDiv.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px;">
            <div style="border-bottom: 2px solid #c62828; margin-bottom: 20px; padding-bottom: 10px;">
                <span style="font-size: 12px; color: #c62828;">🔍 AI审核结果</span>
                <span style="font-size: 12px; color: #c62828; margin-left: 10px;">发现问题：${issues.length}个</span>
            </div>
            <div class="contract-preview">
                ${annotatedHtml}
            </div>
            <div style="margin-top: 20px; padding: 10px; background: #e3f2fd; border-radius: 6px; font-size: 12px; color: #1976d2; text-align: center;">
                ⚡ 红色加粗部分为AI识别的问题，点击右下角 💬 可以针对合同内容提问
            </div>
        </div>
    `;
    refreshComparisonIndices();
    
    updateSummaryCard(issues);
    downloadBtn.disabled = false;
    qaHistory = [];
    updateQaHistory();
    updateChatContractBadge();

    if (!persistHistory) {
        loadLegalBasisArticles().then(() => restoreLegalBasisEvidence(
            issues,
            currentHistoryItem && currentHistoryItem.legalEvidenceByIssue
        ));
        updateStatus(`✅ 已载入审核结果，发现 ${issues.length} 个问题`, 'success');
        return;
    }

    // 保存到历史记录
    const filename = document.getElementById('fileInfo').textContent.replace('📄 已上传：', '').split(' (')[0] || '未命名合同';
    
    // 将ArrayBuffer转换为base64以便存储
    let docxFileBuffer = null;
    if (originalFileBuffer) {
        try {
            docxFileBuffer = btoa(String.fromCharCode.apply(null, new Uint8Array(originalFileBuffer)));
        } catch (e) {
            console.error('转换文件失败:', e);
        }
    }

    currentHistoryItem = saveHistoryItem({
        filename: filename,
        contractText: originalPlainText,
        originalHtml: originalHtmlContent,
        contentHash: simpleHash(originalPlainText),
        annotatedHtml: annotatedHtml,
        issues: issues,
        reviewMeta: currentReviewMeta,
        contractLedger: currentContractLedger,
        issuesCount: issues.length,
        contractLength: originalPlainText.length,
        docxFileBuffer: docxFileBuffer,
        chatMessages: chatMessages.map(m => ({ role: m.role, text: m.text, civilCodeMatches: null, time: m.time }))
    });
    loadLegalBasisArticles().then(() => appendLegalBasisEvidence(issues, currentHistoryItem.id));
    
    updateStatus(`✅ 审核完成并已保存到历史记录，发现 ${issues.length} 个问题`, 'success');
}

async function generateAnnotatedDocx(annotatedHtml, issues) {
    try {
        if (!originalFileBuffer) return;

        const zip = await JSZip.loadAsync(originalFileBuffer);
        let docXmlText = await zip.file('word/document.xml').async('string');

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = annotatedHtml;

        // 提取 span 高亮
        let highlights = Array.from(tempDiv.querySelectorAll('.problem-highlight'))
            .map(el => el.textContent.trim()).filter(t => t.length > 3);

        // 提取建议
        const annEls = tempDiv.querySelectorAll('.issue-annotation');
        const annTexts = Array.from(annEls).map(el => el.textContent.trim());

        // 如果没有 span，回退：用 issue-annotation 前面的段落文本
        if (highlights.length === 0 && Array.isArray(issues)) {
            highlights = issues.map(issue => issue.sourceText || '').filter(text => text.length > 3);
        }

        if (highlights.length === 0 && annEls.length > 0) {
            highlights = Array.from(annEls).map(el => {
                let prev = el.previousElementSibling;
                while (prev && !['P','LI','OL','DIV'].includes(prev.tagName)) prev = prev.previousElementSibling;
                return prev ? prev.textContent.trim() : '';
            }).filter(t => t.length > 3);
        }

        if (highlights.length === 0) {
            currentDocBlob = new Blob([originalFileBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            return;
        }

        const paras = getDocxParagraphs(docXmlText);

        // 匹配
        const used = new Set();
        const inserts = [];
        for (let h = 0; h < highlights.length; h++) {
            const hl = highlights[h];
            const key = hl.replace(/\s+/g, '').substring(0, 50);
            if (key.length < 3) continue;
            let best = -1, bestScore = 0;
            for (let i = 0; i < paras.length; i++) {
                if (used.has(i)) continue;
                const clean = paras[i].text.replace(/\s+/g, '');
                if (clean.includes(key)) {
                    const s = key.length / Math.max(1, clean.length);
                    if (s > bestScore && s > 0.1) { bestScore = s; best = i; }
                } else if (clean.length > 10 && key.includes(clean)) {
                    const s = clean.length / Math.max(1, key.length) * 0.8;
                    if (s > bestScore && s > 0.1) { bestScore = s; best = i; }
                }
            }
            if (best >= 0) {
                used.add(best);
                inserts.push({
                    xml: paras[best].xml,
                    problem: hl,
                    suggestion: issues && issues[h] ? issues[h].suggestion : (h < annTexts.length ? annTexts[h] : '')
                });
            }
        }

        // 倒序插入：段落加红粗 + 标注块
        const esc = (s) => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        for (let i = inserts.length - 1; i >= 0; i--) {
            const ins = inserts[i];
            const pos = docXmlText.indexOf(ins.xml);
            if (pos === -1) continue;

            let modXml = ins.xml;
            modXml = modXml.replace(/(<w:rPr>)(.*?)(<\/w:rPr>)/g, '$1<w:color w:val="C62828"/><w:b/>$2$3');
            modXml = modXml.replace(/(<w:r>)(?!\s*<w:rPr>)/g, '$1<w:rPr><w:color w:val="C62828"/><w:b/></w:rPr>');

            const anno = `
<w:p>
  <w:pPr><w:shd w:val="clear" w:color="auto" w:fill="FFF3CD"/></w:pPr>
  <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="C62828"/><w:b/></w:rPr><w:t xml:space="preserve">⚠️ ${esc(ins.problem)}</w:t></w:r>
</w:p>
<w:p>
  <w:pPr><w:shd w:val="clear" w:color="auto" w:fill="FFF3CD"/></w:pPr>
  <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="856404"/></w:rPr><w:t xml:space="preserve">💡 ${esc(ins.suggestion)}</w:t></w:r>
</w:p>`;

            docXmlText = docXmlText.substring(0, pos) + modXml + anno + docXmlText.substring(pos + ins.xml.length);
        }

        zip.file('word/document.xml', docXmlText);
        currentDocBlob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    } catch (error) {
        console.error("生成标注 DOCX 失败:", error);
        currentDocBlob = new Blob([originalFileBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    }
}

function updateQaHistory() {
    // QA history is now managed by the floating chat panel
}

// 浮动聊天助手
let chatMessages = [];
let chatPanelOpen = true;
let isSending = false;

// 阿拉伯数字转中文（用于民法典条号匹配，如 666 → 六百六十六）
function arabicToChineseNum(n) {
    if (n <= 0) return String(n);
    if (n <= 10) return ['零','一','二','三','四','五','六','七','八','九','十'][n];
    if (n < 20) return '十' + (n % 10 === 0 ? '' : arabicToChineseNum(n % 10));
    if (n < 100) return arabicToChineseNum(Math.floor(n / 10)) + '十' + (n % 10 === 0 ? '' : arabicToChineseNum(n % 10));
    if (n < 1000) return arabicToChineseNum(Math.floor(n / 100)) + '百' + (n % 100 === 0 ? '' : (n % 100 < 10 ? '零' : '') + arabicToChineseNum(n % 100));
    if (n < 10000) return arabicToChineseNum(Math.floor(n / 1000)) + '千' + (n % 1000 === 0 ? '' : (n % 1000 < 100 ? '零' : '') + arabicToChineseNum(n % 1000));
    return String(n);
}

function openChatPanel() {
    chatPanelOpen = true;
    const panel = document.getElementById('chatPanel');
    const fab = document.getElementById('chatFab');
    panel.classList.add('open');
    fab.classList.add('active');
    fab.textContent = '✕';
    updateChatContractBadge();
    initChatDragResize();
}

function closeChatPanel() {
    chatPanelOpen = false;
    const panel = document.getElementById('chatPanel');
    const fab = document.getElementById('chatFab');
    panel.classList.remove('open');
    fab.classList.remove('active');
    fab.textContent = '💬';
}

function toggleChatPanel() {
    if (chatPanelOpen) { closeChatPanel(); } else { openChatPanel(); }
}

// 拖拽和缩放
let chatDragInit = false;
function initChatDragResize() {
    if (chatDragInit) return;
    chatDragInit = true;
    const panel = document.getElementById('chatPanel');
    const header = panel.querySelector('.chat-panel-header');

    // 拖拽
    let dragX, dragY, startX, startY;
    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return; // 不拦截按钮点击
        dragX = e.clientX; dragY = e.clientY;
        const rect = panel.getBoundingClientRect();
        startX = rect.left; startY = rect.top;
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);
    });
    function onDrag(e) {
        panel.style.right = 'auto'; panel.style.bottom = 'auto';
        panel.style.left = (startX + e.clientX - dragX) + 'px';
        panel.style.top = (startY + e.clientY - dragY) + 'px';
    }
    function stopDrag() {
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
    }

    // 缩放 - 右边
    addResize('chatResizeR', 'w', 1);
    // 缩放 - 左边
    addResize('chatResizeL', 'w', -1);
    // 缩放 - 下边
    addResize('chatResizeB', 'h', 1);
    // 缩放 - 上边
    addResize('chatResizeT', 'h', -1);
    // 缩放 - 右下
    addResize('chatResizeBR', 'wh', 1, 1);
    // 缩放 - 左下
    addResize('chatResizeBL', 'wh', -1, 1);
    // 缩放 - 右上
    addResize('chatResizeTR', 'wh', 1, -1);
    // 缩放 - 左上
    addResize('chatResizeTL', 'wh', -1, -1);

    function addResize(id, mode, dw, dh) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const startW = panel.offsetWidth;
            const startH = panel.offsetHeight;
            const startX = e.clientX;
            const startY = e.clientY;
            const startLeft = panel.offsetLeft;
            const startTop = panel.offsetTop;
            function onResize(ev) {
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;
                if (mode === 'w' || mode === 'wh') {
                    const newW = Math.max(300, startW + dx * dw);
                    panel.style.width = newW + 'px';
                    if (dw < 0) panel.style.left = (startLeft + startW - newW) + 'px';
                }
                if (mode === 'h' || mode === 'wh') {
                    const newH = Math.max(300, startH + dy * dh);
                    panel.style.height = newH + 'px';
                    if (dh < 0) panel.style.top = (startTop + startH - newH) + 'px';
                }
            }
            function stop() { document.removeEventListener('mousemove', onResize); document.removeEventListener('mouseup', stop); }
            document.addEventListener('mousemove', onResize);
            document.addEventListener('mouseup', stop);
        });
    }
}

function updateChatContractBadge() {
    const badge = document.getElementById('chatContractBadge');
    if (originalPlainText) {
        badge.style.display = 'inline';
    } else {
        badge.style.display = 'none';
    }
}

function addChatMessage(role, text) {
    chatMessages.push({ role, text, time: new Date().toISOString() });
    renderChatMessages();
}

function renderChatMessages() {
    const container = document.getElementById('chatMessages');
    let html = '';
    chatMessages.forEach(msg => {
        const label = msg.role === 'user' ? '你' : 'AI 审核助手';
        const cls = msg.role === 'user' ? 'user' : 'assistant';
        const body = msg.role === 'user' ? escapeHtml(msg.text) : renderMarkdown(msg.text);
        html += `<div class="chat-msg ${cls}"><div class="msg-label">${label}</div>${body}</div>`;
    });
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}

function showChatTyping() {
    const container = document.getElementById('chatMessages');
    const typing = document.createElement('div');
    typing.className = 'chat-typing';
    typing.id = 'chatTyping';
    typing.innerHTML = 'AI 正在分析<span class="dots"><span>.</span><span>.</span><span>.</span></span>';
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;
}

function hideChatTyping() {
    const typing = document.getElementById('chatTyping');
    if (typing) typing.remove();
}

async function sendChatMessage() {
    if (isSending) return;
    const apiKey = document.getElementById('apiKey').value.trim();
    const model = document.getElementById('model').value;
    const input = document.getElementById('chatInput');
    const question = input.value.trim();
    const sendBtn = document.getElementById('chatSendBtn');

    if (!question) return;

    input.value = '';
    sendBtn.disabled = true;
    isSending = true;
    addChatMessage('user', question);

    try {
        showChatTyping();

        // 如果已上传合同但未审核，自动触发审核
        if (originalPlainText && (!Array.isArray(currentIssues) || currentIssues.length === 0)) {
            hideChatTyping();
            addChatMessage('assistant', '📋 检测到合同尚未审核，我先帮您进行全面的合同审核，审核完成后再回答您的问题...');
            updateLatestHistoryChat();
            showChatTyping();
            try {
                await checkContractInternal();
            } catch (reviewError) {
                // 审核失败也在聊天中提示
            }
            hideChatTyping();
            showChatTyping();
        }

        const reviewInstructions = document.getElementById('reviewInstructions').value.trim();

        // 问题汇总文本
        let issueSummaryText = '';
        if (Array.isArray(currentIssues) && currentIssues.length > 0) {
            issueSummaryText = '\n\n=== 审核发现的问题汇总 ===\n'
                + currentIssues.map((i, idx) => `${idx + 1}. 问题：${i.problem}\n   建议：${i.suggestion}`).join('\n')
                + '\n=== 问题汇总结束 ===';
        }

        const systemPrompt = '你是专业的合同审核和法律咨询助手。可以使用Markdown格式回复：**粗体**、*斜体*、`代码`、-列表、###标题、表格等，我会正确渲染。合同内容和审核问题在后续消息中提供。'
            + (reviewInstructions ? `\n\n用户设定的审核重点和要求：\n${reviewInstructions}` : '')
            + issueSummaryText
            + '\n\n【可用工具】当问题涉及法律依据时，先调用本地现行法律依据库再回答。工具调用格式：\n[TOOL_CALL:search_legal_basis]{"keywords":"法律名称、条号或关键词"}\n工具会返回带文件名、条号和官方来源的候选结果。只能基于返回结果引用法条，不得编造。';
        const messages = [{ role: 'system', content: systemPrompt }];

        if (originalPlainText) {
            messages.push({ role: 'user', content: `=== 正在审核的合同完整文本 ===\n${originalPlainText}\n=== 合同文本结束 ===` });
            messages.push({ role: 'assistant', content: '已读取合同内容和审核结果，请随时提问。' });
        }

        const recentHistory = chatMessages.slice(-16);
        for (let i = 0; i < recentHistory.length - 1; i++) {
            const msg = recentHistory[i];
            if (msg.role === 'user' || msg.role === 'assistant') {
                messages.push({ role: msg.role, content: msg.text });
            }
        }
        messages.push({ role: 'user', content: question });

        showPromptDebug(messages);

        if (!apiKey) { hideChatTyping(); sendBtn.disabled = false; throw new Error('请输入DeepSeek API Key'); }

        // 工具调用循环：最多2轮（回答 + 可能的工具调用）
        let answer = '';
        let toolCallCount = 0;
        const maxToolCalls = 2;

        while (toolCallCount <= maxToolCalls) {
            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({ model, messages, temperature: 0.5, max_tokens: 2048 })
            });
            if (!response.ok) throw new Error('API请求失败');
            const data = await response.json();
            answer = data.choices[0].message.content;

            // 检测工具调用
            const toolMatch = answer.match(/\[TOOL_CALL:search_legal_basis\](\{[\s\S]*?\})/);
            if (toolMatch) {
                toolCallCount++;
                let toolParams;
                try { toolParams = JSON.parse(toolMatch[1]); } catch (e) { toolParams = { keywords: '' }; }
                const keywords = toolParams.keywords || '';

                // 搜索本地现行法律依据库
                const articles = await loadLegalBasisArticles();
                let searchResults = [];

                // 先尝试精确条号匹配（如 "666条" → "第六百六十六条"）
                const articleNumMatch = keywords.match(/(\d+)\s*条/);
                if (articleNumMatch && articles.length) {
                    const targetNum = parseInt(articleNumMatch[1]);
                    const cnNum = arabicToChineseNum(targetNum);
                    searchResults = articles.filter(a => a.articleNo === `第${cnNum}条` && (!a.lawTitle || keywords.includes(a.lawTitle.replace(/^中华人民共和国/, '')) || keywords.length < 8))
                        .slice(0, 5)
                        .map(a => ({ ...a, reason: '精确条号匹配' }));
                }

                if (!searchResults.length && window.LegalBasisEvidence && keywords && articles.length) {
                    searchResults = window.LegalBasisEvidence.searchLegalBasisArticles(articles, keywords, 8);
                }

                // 将工具调用和结果追加到消息
                messages.push({ role: 'assistant', content: answer });
                const resultText = searchResults.length
                    ? '现行法律依据库查询结果：\n' + searchResults.map((r, i) => `${i + 1}. ${r.lawTitle} ${r.articleNo}${r.path ? `（${r.path}）` : ''}\n条文：${r.text}\n官方来源：${r.sourceUrl || '见本地来源清单'}`).join('\n\n')
                    : '未找到相关现行法条。';
                messages.push({ role: 'user', content: `[工具返回] ${resultText}\n\n请仅基于以上查询结果回答；引用时必须同时写明文件名和条号。` });
                continue; // 下一轮，LLM 基于工具结果回答
            }
            break; // 没有工具调用，结束循环
        }

        hideChatTyping();
        addChatMessage('assistant', answer);
        updateLatestHistoryChat();
        updateStatus("✅ 问题已解答", 'success');
    } catch (error) {
        hideChatTyping();
        updateStatus(`❌ 提问失败: ${error.message}`, 'error');
    } finally {
        sendBtn.disabled = false;
        isSending = false;
        document.getElementById('chatInput').focus();
    }
}

function sampleContractForLegalRetrieval(text, maximumLength = 30000) {
    const value = String(text || '');
    if (value.length <= maximumLength) return value;
    const segmentLength = Math.floor(maximumLength / 3);
    const middleStart = Math.max(0, Math.floor((value.length - segmentLength) / 2));
    return [
        value.slice(0, segmentLength),
        value.slice(middleStart, middleStart + segmentLength),
        value.slice(-segmentLength)
    ].join('\n\n【合同中段／尾段抽样】\n\n');
}

async function requestStructuredReview() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const model = document.getElementById('model').value;
    const userInstructions = document.getElementById('reviewInstructions').value;
    const contractType = document.getElementById('contractType').value;
    const reviewPosition = document.getElementById('reviewPosition').value;
    const positionDirective = buildPositionDirective(reviewPosition);
    const allLegalArticles = await loadLegalBasisArticles();
    const reviewLegalCandidates = window.LegalBasisEvidence
        ? window.LegalBasisEvidence.matchLegalBasisArticles(allLegalArticles, {
            sourceText: sampleContractForLegalRetrieval(originalPlainText, 30000),
            problem: `${contractType} 合同订立 履行 付款 交付 验收 违约 解除 争议`,
            suggestion: userInstructions
        }, 18, { contractType })
        : [];
    const reviewLegalPrompt = window.LegalBasisEvidence ? window.LegalBasisEvidence.formatLegalBasisForPrompt(reviewLegalCandidates) : '';
    const legalDirective = reviewLegalPrompt
        ? `\n\n====================\n\n【本地现行法律依据候选】\n${reviewLegalPrompt}\n\n引用规则：只能引用以上候选中确实相关的条文；必须同时写明文件全称和条号；候选不足时只描述风险，不得编造法条。`
        : '';
    const combinedPrompt = `${SYSTEM_PROMPT}\n\n====================\n\n指定合同类型：${contractType}\n审查立场：${reviewPosition}\n立场执行规则：${positionDirective}\n\n审核重点和要求：\n${userInstructions}${legalDirective}`;

    if (!apiKey) throw new Error('未配置API Key');
    if (!originalHtmlContent) throw new Error('无合同内容');

    const baseMessages = [
        { role: 'system', content: combinedPrompt },
        { role: 'user', content: `请审核以下合同：\n\n${originalPlainText}` }
    ];

    const callReviewApi = async (messages, maxTokens = 65536) => {
        showPromptDebug(messages);
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model,
                messages,
                thinking: { type: 'disabled' },
                response_format: { type: 'json_object' },
                temperature: 0.2,
                max_tokens: maxTokens
            })
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API请求失败（${response.status}）：${errorText.slice(0, 180)}`);
        }
        const data = await response.json();
        const choice = data && data.choices && data.choices[0];
        const rawContent = choice && choice.message && choice.message.content;
        const content = Array.isArray(rawContent)
            ? rawContent.map(part => typeof part === 'string' ? part : (part && part.text) || '').join('')
            : String(rawContent || '');
        return { content, finishReason: choice && choice.finish_reason || 'unknown' };
    };

    const first = await callReviewApi(baseMessages);
    try {
        return ContractReviewCore.normalizeReviewResult(first.content);
    } catch (firstError) {
        const repairMessages = [
            ...baseMessages,
            { role: 'assistant', content: first.content || '（上次返回为空）' },
            { role: 'user', content: '上次输出无法被程序解析。请重新生成完整、合法的 JSON 对象，只保留规定字段，不要输出说明、思考过程或代码块。' }
        ];
        const retryMaxTokens = first.finishReason === 'length' ? 131072 : 65536;
        const second = await callReviewApi(repairMessages, retryMaxTokens);
        try {
            return ContractReviewCore.normalizeReviewResult(second.content);
        } catch (secondError) {
            showPromptDebug([...repairMessages, { role: 'assistant', content: second.content || '（重试仍为空）' }]);
            throw new Error(`AI 连续两次未返回有效 JSON（首次：${first.finishReason}，重试：${second.finishReason}）。请打开左下角调试面板查看原始响应。`);
        }
    }
}

// 内部审核函数：用于聊天自动触发审核
async function checkContractInternal() {
    const reviewResult = await requestStructuredReview();
    const issues = reviewResult.issues;
    currentReviewMeta = {
        contractType: reviewResult.contractType,
        reviewedFrom: reviewResult.reviewedFrom,
        summary: reviewResult.summary
    };
    currentContractLedger = {
        keyTerms: reviewResult.keyTerms,
        obligations: reviewResult.obligations
    };
    const htmlContent = ContractReviewCore.annotateContract(originalHtmlContent || `<p>${escapeHtml(originalPlainText)}</p>`, issues);

    currentIssues = issues;
    updatePreview(htmlContent, issues);
    renderContractLedger();
    generateAnnotatedDocx(htmlContent, issues);
    return { issues, htmlContent };
}

// 旧的askQuestion现在由sendChatMessage处理
async function askQuestion() {
    toggleChatPanel();
    const input = document.getElementById('chatInput');
    const oldQ = document.getElementById('userQuestion');
    if (oldQ && oldQ.value.trim()) {
        input.value = oldQ.value;
        sendChatMessage();
    }
}

// 调试面板
function toggleDebugPanel() {
    const panel = document.getElementById('debugPanel');
    panel.classList.toggle('open');
}

function showPromptDebug(messages) {
    const countEl = document.getElementById('debugMsgCount');
    const bodyEl = document.getElementById('debugBody');
    countEl.textContent = messages.length;

    let html = '';
    messages.forEach((msg, idx) => {
        const roleClass = 'debug-role-' + msg.role;
        const label = { system: 'SYSTEM', user: 'USER', assistant: 'ASSISTANT' }[msg.role] || msg.role;
        let content = msg.content;
        if (content.length > 400) {
            content = content.substring(0, 400) + '\n…(截断，完整内容已发送)';
        }
        html += `<div class="${roleClass}">[${idx + 1}] ${label}</div>`;
        html += `<div>${escapeHtml(content)}</div>`;
        html += '<hr class="debug-separator">';
    });
    bodyEl.innerHTML = html || '无消息';
}

function initHoverOptimization() {
    if (!quillEditor) return;

    if (!hoverOptimizeButton) {
        hoverOptimizeButton = document.createElement('button');
        hoverOptimizeButton.type = 'button';
        hoverOptimizeButton.className = 'hover-optimize-btn';
        hoverOptimizeButton.textContent = 'AI优化';
        hoverOptimizeButton.addEventListener('click', () => {
            if (typeof optimizeHoveredParagraph === 'function') optimizeHoveredParagraph();
        });
        hoverOptimizeButton.addEventListener('mouseenter', () => {
            isHoveringOptimizeButton = true;
        });
        hoverOptimizeButton.addEventListener('mouseleave', () => {
            isHoveringOptimizeButton = false;
            hideHoverOptimizeButton();
        });
        document.body.appendChild(hoverOptimizeButton);
    }

    const editor = quillEditor.root;
    editor.removeEventListener('mousemove', handleEditorMouseMove);
    editor.removeEventListener('mouseleave', handleEditorMouseLeave);
    editor.addEventListener('mousemove', handleEditorMouseMove);
    editor.addEventListener('mouseleave', handleEditorMouseLeave);
}

function handleEditorMouseMove(event) {
    const paragraph = event.target.closest('p, h1, h2, h3, li');
    if (!paragraph || !quillEditor || !quillEditor.root.contains(paragraph)) {
        hideHoverOptimizeButton();
        return;
    }

    const text = getParagraphText(paragraph);
    if (!text) {
        hideHoverOptimizeButton();
        return;
    }

    hoveredOptimizeParagraph = paragraph;
    const rect = paragraph.getBoundingClientRect();
    const buttonWidth = 96;
    const buttonHeight = 38;
    hoverOptimizeButton.style.left = `${Math.max(8, Math.min(rect.right - buttonWidth - 8, window.innerWidth - buttonWidth - 8))}px`;
    hoverOptimizeButton.style.top = `${Math.max(8, Math.min(rect.top + 4, window.innerHeight - buttonHeight - 8))}px`;
    hoverOptimizeButton.style.display = 'block';
}

function handleEditorMouseLeave() {
    setTimeout(() => {
        if (!isHoveringOptimizeButton) hideHoverOptimizeButton();
    }, 80);
}

function hideHoverOptimizeButton(clearTarget = true) {
    if (hoverOptimizeButton) hoverOptimizeButton.style.display = 'none';
    if (clearTarget) hoveredOptimizeParagraph = null;
}

function getParagraphText(element) {
    return element ? element.textContent.replace(/\s+/g, ' ').trim() : '';
}

function normalizeForMatch(text) {
    return (text || '')
        .toLowerCase()
        .replace(/[\s\u3000]+/g, '')
        .replace(/[，。！？；：、,.!?;:"'“”‘’（）()【】\[\]《》<>]/g, '')
        .trim();
}

function calculateOverlapScore(a, b) {
    const left = normalizeForMatch(a);
    const right = normalizeForMatch(b);
    if (!left || !right) return 0;
    if (left.includes(right) || right.includes(left)) return Math.min(left.length, right.length) / Math.max(left.length, right.length);

    const windowSize = Math.min(24, left.length, right.length);
    if (windowSize < 4) return 0;

    let matches = 0;
    for (let i = 0; i <= left.length - windowSize; i++) {
        const fragment = left.substring(i, i + windowSize);
        if (right.includes(fragment)) matches++;
    }
    return matches / Math.max(1, left.length - windowSize + 1);
}

function findBestIssueForParagraph(text) {
    if (!text || !Array.isArray(currentIssues) || currentIssues.length === 0) return null;
    let bestIssue = null;
    let bestScore = 0;
    currentIssues.forEach(issue => {
        const issueText = `${issue.problem || ''} ${issue.suggestion || ''}`;
        const score = Math.max(
            calculateOverlapScore(text, issue.sourceText || ''),
            calculateOverlapScore(text, issue.problem || ''),
            calculateOverlapScore(text, issueText)
        );
        if (score > bestScore) {
            bestScore = score;
            bestIssue = issue;
        }
    });
    return bestScore >= 0.08 ? bestIssue : null;
}

async function optimizeHoveredParagraph() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const model = document.getElementById('model').value;
    const paragraph = hoveredOptimizeParagraph;
    const originalText = getParagraphText(paragraph);

    if (!apiKey) { updateStatus("❌ 请输入DeepSeek API Key", 'error'); return; }
    if (!quillEditor || !paragraph || !originalText) { updateStatus("❌ 请先将鼠标悬停在要优化的段落上", 'error'); return; }

    const matchedIssue = findBestIssueForParagraph(originalText);
    const issueText = matchedIssue
        ? `问题：${matchedIssue.problem || '无'}\n建议：${matchedIssue.suggestion || '无'}`
        : '未匹配到该段落的具体审核问题，请基于合同上下文对该段落进行专业、审慎、合规的优化。';

    if (hoverOptimizeButton) {
        hoverOptimizeButton.disabled = true;
        hoverOptimizeButton.textContent = '优化中...';
    }
    updateStatus("⏳ 正在优化当前段落...", 'info');

    try {
        const articles = await loadLegalBasisArticles();
        const legalBasisMatches = window.LegalBasisEvidence
            ? window.LegalBasisEvidence.matchLegalBasisArticles(articles, {
                sourceText: originalText,
                problem: matchedIssue ? matchedIssue.problem || '' : '',
                suggestion: matchedIssue ? matchedIssue.suggestion || '' : issueText
            }, 5, { contractType: document.getElementById('contractType').value })
            : [];
        const legalBasisPrompt = window.LegalBasisEvidence ? window.LegalBasisEvidence.formatLegalBasisForPrompt(legalBasisMatches) : '';
        const lawReferenceText = legalBasisPrompt
            ? `\n\n参考现行法律条文：\n${legalBasisPrompt}\n\n请在不改变交易目的的前提下，参考上述条文优化该段落；不得编造未提供的法条。`
            : '';
        const baseMessages = [
            {
                role: 'system',
                content: '你是专业的合同文本优化助手。只输出合法 JSON，格式为 {"optimizedText":"优化后的完整单个段落"}。不要输出思考过程、Markdown、标题或解释。'
            },
            {
                role: 'user',
                content: `合同上下文：\n${originalPlainText.substring(0, 12000)}\n\n审核意见：\n${issueText}${lawReferenceText}\n\n请优化以下原段落并返回 JSON：\n${originalText}`
            }
        ];
        const callOptimizationApi = async (messages, maxTokens) => {
            showPromptDebug(messages);
            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model,
                    messages,
                    thinking: { type: 'disabled' },
                    response_format: { type: 'json_object' },
                    temperature: 0.2,
                    max_tokens: maxTokens
                })
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API请求失败（${response.status}）：${errorText.slice(0, 180)}`);
            }
            const data = await response.json();
            const choice = data && data.choices && data.choices[0];
            const rawContent = choice && choice.message && choice.message.content;
            const content = Array.isArray(rawContent)
                ? rawContent.map(part => typeof part === 'string' ? part : (part && part.text) || '').join('')
                : String(rawContent || '');
            return { content, finishReason: choice && choice.finish_reason || 'unknown' };
        };

        const first = await callOptimizationApi(baseMessages, 4096);
        let optimizedText;
        try {
            optimizedText = ContractReviewCore.extractOptimizedText(first.content);
        } catch (firstError) {
            const repairMessages = [
                ...baseMessages,
                { role: 'assistant', content: first.content || '（上次返回为空）' },
                { role: 'user', content: '上次返回无法解析。请重新输出完整 JSON：{"optimizedText":"优化后的完整单个段落"}。' }
            ];
            const second = await callOptimizationApi(repairMessages, first.finishReason === 'length' ? 16384 : 8192);
            try {
                optimizedText = ContractReviewCore.extractOptimizedText(second.content);
            } catch (secondError) {
                showPromptDebug([...repairMessages, { role: 'assistant', content: second.content || '（重试仍为空）' }]);
                throw new Error(`AI 连续两次未返回有效优化内容（首次：${first.finishReason}，重试：${second.finishReason}）`);
            }
        }
        if (!quillEditor || !quillEditor.root || !quillEditor.root.contains(paragraph)) throw new Error('当前段落已不存在');
        if (getParagraphText(paragraph) !== originalText) throw new Error('当前段落内容已变化，请重新优化');
        if (typeof showOptimizationPreview !== 'function') throw new Error('优化预览组件未初始化');

        pendingOptimizedText = optimizedText;
        showOptimizationPreview(originalText, optimizedText, paragraph, matchedIssue, legalBasisMatches);
        updateStatus("✅ 段落优化完成，请确认是否应用", 'success');
    } catch (error) {
        updateStatus(`❌ 段落优化失败: ${error.message}`, 'error');
    } finally {
        if (hoverOptimizeButton) {
            hoverOptimizeButton.disabled = false;
            hoverOptimizeButton.textContent = 'AI优化';
        }
    }
}

function ensureOptimizationModal() {
    let mask = document.getElementById('optimizationModalMask');
    if (mask) return mask;

    mask = document.createElement('div');
    mask.id = 'optimizationModalMask';
    mask.className = 'optimization-modal-mask';
    mask.innerHTML = `
        <div class="optimization-modal">
            <h3>AI优化预览</h3>
            <div class="optimization-suggestion">
                <h4>左侧审核建议</h4>
                <div id="optimizationSuggestionText" class="optimization-text"></div>
            </div>
            <div id="optimizationCivilCodeEvidence"></div>
            <div class="optimization-compare">
                <div class="optimization-block">
                    <h4>原文</h4>
                    <div id="optimizationOriginalText" class="optimization-text"></div>
                </div>
                <div class="optimization-block">
                    <h4>优化后（可编辑）</h4>
                    <textarea id="optimizationNewText" class="optimization-text"></textarea>
                </div>
            </div>
            <div class="optimization-actions">
                <button type="button" class="optimization-cancel-btn" onclick="closeOptimizationPreview()">取消</button>
                <button type="button" class="optimization-apply-btn" onclick="applyOptimizedParagraph()">应用</button>
            </div>
        </div>
    `;
    document.body.appendChild(mask);
    return mask;
}

function normalizeOptimizedParagraphText(text) {
    return (text || '').replace(/\s*\n+\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatOptimizationSuggestion(issue) {
    if (!issue) return '未匹配到审核建议';
    return `问题：${issue.problem || '无'}\n建议：${issue.suggestion || '无'}`;
}

function showOptimizationPreview(originalText, optimizedText, paragraph = hoveredOptimizeParagraph, matchedIssue = null, legalBasisMatches = []) {
    const mask = ensureOptimizationModal();
    const normalizedText = normalizeOptimizedParagraphText(optimizedText);
    pendingOptimization = { paragraph, originalText, optimizedText: normalizedText };
    pendingOptimizedText = normalizedText;
    document.getElementById('optimizationOriginalText').textContent = originalText || '';
    document.getElementById('optimizationSuggestionText').textContent = formatOptimizationSuggestion(matchedIssue);
    const evidenceDiv = document.getElementById('optimizationCivilCodeEvidence');
    evidenceDiv.innerHTML = window.LegalBasisEvidence && legalBasisMatches.length
        ? window.LegalBasisEvidence.renderEvidence(legalBasisMatches).replace('相关法律依据', '参考法律依据')
        : '';
    document.getElementById('optimizationNewText').value = normalizedText;
    mask.style.display = 'flex';
}

function closeOptimizationPreview() {
    const mask = document.getElementById('optimizationModalMask');
    if (mask) mask.style.display = 'none';
    pendingOptimization = null;
    pendingOptimizedText = '';
}

function applyOptimizedParagraph() {
    if (!quillEditor || !pendingOptimization || !pendingOptimization.paragraph || !pendingOptimization.optimizedText) {
        updateStatus("❌ 没有可应用的优化内容", 'error');
        return;
    }
    if (!quillEditor.root || !quillEditor.root.contains(pendingOptimization.paragraph)) {
        updateStatus("❌ 当前段落已不存在", 'error');
        return;
    }
    if (getParagraphText(pendingOptimization.paragraph) !== pendingOptimization.originalText) {
        updateStatus("❌ 当前段落内容已变化，请重新优化", 'error');
        return;
    }

    const optimizedText = normalizeOptimizedParagraphText(document.getElementById('optimizationNewText').value);
    if (!optimizedText) {
        updateStatus("❌ 优化内容为空", 'error');
        return;
    }

    try {
        const blot = Quill.find(pendingOptimization.paragraph);
        if (!blot) throw new Error('当前段落已不存在');
        const index = quillEditor.getIndex(blot);
        const length = Math.max(0, blot.length() - 1);
        quillEditor.deleteText(index, length, 'user');
        quillEditor.insertText(index, optimizedText, 'user');
    } catch (error) {
        updateStatus(`❌ 应用优化失败: ${error.message}`, 'error');
        return;
    }

    closeOptimizationPreview();
    hideHoverOptimizeButton();
    updateStatus("✅ 已应用段落优化", 'success');
}

async function downloadEditedDoc() {
    if (!quillEditor || !originalFileBuffer) {
        updateStatus("⚠️ 请先上传合同文件", 'error');
        return;
    }
    try {
        const html = quillEditor.root.innerHTML;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const editedTexts = Array.from(tempDiv.querySelectorAll('p, h1, h2, h3, li'))
            .map(el => el.textContent.trim())
            .filter(t => t.length > 0);

        // Use pre-built mapping to find changed paragraphs
        const changed = [];
        for (let i = 0; i < Math.max(editedTexts.length, quillOriginalParagraphs.length); i++) {
            const oldT = (quillOriginalParagraphs[i] || '').replace(/\s+/g, '');
            const newT = (editedTexts[i] || '').replace(/\s+/g, '');
            if (oldT !== newT && quillOriginalParagraphs[i]) {
                const docxIdx = htmlToDocxMap[i];
                if (docxIdx >= 0 && docxIdx < docxParagraphs.length) {
                    changed.push({ docxIdx, newText: editedTexts[i] });
                }
            }
        }

        if (changed.length === 0) {
            updateStatus("⚠️ 未检测到修改内容", 'info');
            return;
        }

        // Load fresh copy of DOCX
        const zip = await JSZip.loadAsync(originalFileBuffer);
        let docXmlText = await zip.file('word/document.xml').async('string');

        const esc = (s) => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

        // Apply changes in reverse order using pre-built mapping
        changed.sort((a, b) => b.docxIdx - a.docxIdx);
        for (const c of changed) {
            const para = docxParagraphs[c.docxIdx];
            if (!para) continue;
            const pos = docXmlText.indexOf(para.full);
            if (pos === -1) continue;

            // Replace text in each <w:t> while preserving all XML formatting
            const oldXml = para.full;
            const wtRegex = /(<w:t[^>]*>)([^<]*)(<\/w:t>)/g;
            const runs = [];
            let wtMatch;
            while ((wtMatch = wtRegex.exec(oldXml)) !== null) {
                runs.push(wtMatch[0]);
            }

            if (runs.length === 0) continue;

            // Put all new text in first <w:t>, clear the rest
            let newXml = oldXml;
            for (let ri = 0; ri < runs.length; ri++) {
                const replacement = ri === 0
                    ? runs[ri].replace(/(<w:t[^>]*>)([^<]*)(<\/w:t>)/, `$1${esc(c.newText)}$3`)
                    : runs[ri].replace(/(<w:t[^>]*>)([^<]*)(<\/w:t>)/, '$1$3');
                newXml = newXml.replace(runs[ri], replacement);
            }

            docXmlText = docXmlText.substring(0, pos) + newXml + docXmlText.substring(pos + para.full.length);
        }

        zip.file('word/document.xml', docXmlText);
        const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `合同_修改版_${new Date().toISOString().slice(0, 19)}.docx`;
        link.click();
        URL.revokeObjectURL(url);
        updateStatus(`✅ 修改后的合同下载成功！已替换 ${changed.length} 处内容`, 'success');
    } catch (error) {
        console.error("下载修改版失败:", error);
        updateStatus(`❔ 下载修改版失败: ${error.message}`, 'error');
    }
}

async function downloadDoc() {
    if (!currentDocBlob) { updateStatus("⚠️ 请先完成合同审核", 'error'); return; }
    try {
        const link = document.createElement('a');
        const url = URL.createObjectURL(currentDocBlob);
        link.href = url;
        link.download = `合同审核结果_${new Date().toISOString().slice(0, 19)}.docx`;
        link.click();
        URL.revokeObjectURL(url);
        updateStatus("✅ 合同下载成功！", 'success');
    } catch (error) {
        updateStatus(`❌ 下载失败: ${error.message}`, 'error');
    }
}

async function checkContract() {
    if (!document.getElementById('apiKey').value.trim()) { updateStatus("❌ 请输入DeepSeek API Key", 'error'); return; }
    if (!originalPlainText) { updateStatus("❌ 请先上传合同文件", 'error'); return; }

    showLoading('checkBtn');
    try {
        await checkContractInternal();
        switchResultTab('preview', true);
    } catch (error) {
        updateStatus(`❌ 审核失败: ${error.message}`, 'error');
    } finally {
        hideLoading('checkBtn', '开始审核');
    }
}

function clearPreview() {
    clearPreviewLight();
    originalHtmlContent = '';
    originalPlainText = '';
    originalFileBuffer = null;
    currentHistoryItem = null;
    quillOriginalParagraphs = [];
    htmlToDocxMap = [];
    docxParagraphs = [];
    cleanupQuillEditor();
    document.getElementById('codeContent').innerHTML = `<div style="color: #888; text-align: center; padding: 40px;">等待合同上传...</div>`;
    updateStatus("✅ 已清空预览", 'success');
}

function clearPreviewLight() {
    document.getElementById('previewContent').innerHTML = `<div style="text-align: center; color: #999; padding: 40px;">📄 上传合同文件后点击"开始审核"<br>AI将自动识别问题并用红色加粗标记</div>`;
    document.getElementById('summaryCard').style.display = 'none';
    document.getElementById('downloadBtn').disabled = true;
    document.getElementById('downloadEditedBtn').disabled = true;
    document.getElementById('checkBtn').disabled = true;
    chatMessages = [];
    renderChatMessages();
    updateChatContractBadge();
    currentDocBlob = null;
    currentIssues = [];
    currentReviewMeta = null;
    currentRiskFilter = 'all';
    currentContractLedger = { keyTerms: [], obligations: [] };
    renderContractLedger();
    qaHistory = [];
    updateQaHistory();
    hoveredOptimizeParagraph = null;
    pendingOptimizedText = '';
    hideHoverOptimizeButton();
    closeOptimizationPreview();
}

// 历史记录相关功能
function readBrowserHistory() {
    try {
        const parsed = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function getHistory() {
    return historyCache;
}

function persistBrowserHistory() {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyCache.slice(0, 50)));
}

function queueHistoryRequest(url, options) {
    historyWriteQueue = historyWriteQueue.then(async () => {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`SQLite历史库写入失败（HTTP ${response.status}）`);
        return response;
    }).catch(error => {
        console.error(error);
        historyStorageMode = 'browser';
        persistBrowserHistory();
        updateVectorServiceStatus();
    });
    return historyWriteQueue;
}

function persistHistoryItemRecord(item) {
    if (historyStorageMode !== 'sqlite') {
        persistBrowserHistory();
        return Promise.resolve();
    }
    return queueHistoryRequest(`/api/history/${encodeURIComponent(item.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
    });
}

async function initializeHistoryRepository() {
    const browserHistory = readBrowserHistory();
    historyCache = browserHistory;
    if (location.protocol === 'file:') return;
    try {
        const response = await fetch('/api/history', { cache: 'no-store' });
        if (!response.ok) throw new Error(String(response.status));
        const payload = await response.json();
        const databaseItems = Array.isArray(payload.items) ? payload.items : [];
        const mergedById = new Map();
        [...databaseItems, ...browserHistory].forEach(item => {
            if (!item || !item.id) return;
            const existing = mergedById.get(item.id);
            if (!existing || String(item.timestamp || '') >= String(existing.timestamp || '')) mergedById.set(item.id, item);
        });
        historyCache = Array.from(mergedById.values())
            .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
            .slice(0, 50);
        historyStorageMode = 'sqlite';
        if (browserHistory.length) {
            const migration = await fetch('/api/history/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: historyCache })
            });
            if (!migration.ok) throw new Error(`浏览器历史迁移失败（HTTP ${migration.status}）`);
            localStorage.removeItem(HISTORY_STORAGE_KEY);
        }
        if (document.getElementById('historyPanel').style.display !== 'none') renderHistory();
        updateVectorServiceStatus();
    } catch (error) {
        console.warn('本地SQLite历史库不可用，已回退浏览器存储。', error);
        historyStorageMode = 'browser';
        historyCache = browserHistory;
    }
}

function saveHistoryItem(item) {
    const history = getHistory();
    const historyItem = {
        id: currentHistoryItem ? currentHistoryItem.id : Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...item
    };
    if (currentHistoryItem) {
        // 更新已有记录：移除旧条目再插入
        const idx = history.findIndex(h => h.id === currentHistoryItem.id);
        if (idx >= 0) history.splice(idx, 1);
    }
    history.unshift(historyItem);
    historyCache = history.slice(0, 50);
    persistHistoryItemRecord(historyItem);
    return historyItem;
}

function deleteHistoryItem(id) {
    historyCache = getHistory().filter(item => item.id !== id);
    if (historyStorageMode === 'sqlite') {
        queueHistoryRequest(`/api/history/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } else {
        persistBrowserHistory();
    }
    renderHistory();
}

// 简单哈希（用于合同内容去重）
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + c;
        hash |= 0;
    }
    return 'h' + Math.abs(hash).toString(36);
}

// 重复合同弹窗
function showDupModal(record) {
    return new Promise((resolve) => {
        const mask = document.createElement('div');
        mask.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:20px;';
        mask.innerHTML = `<div style="background:white;border-radius:12px;padding:24px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.25);">
            <h3 style="margin:0 0 8px;color:#333;">检测到重复合同</h3>
            <p style="margin:0 0 6px;color:#666;font-size:14px;">已审核过相同内容的合同：<strong>${escapeHtml(record.filename || '未命名')}</strong></p>
            <p style="margin:0 0 18px;color:#888;font-size:13px;">${formatDate(record.timestamp)} · ${record.issuesCount || 0}个问题</p>
            <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button id="dupCancel" class="btn-quiet btn-compact">取消</button>
                <button id="dupNew" class="btn-secondary btn-compact">新建记录</button>
                <button id="dupUpdate" class="btn-primary btn-compact">更新已有</button>
            </div>
        </div>`;
        document.body.appendChild(mask);
        mask.querySelector('#dupCancel').onclick = () => { mask.remove(); resolve('cancel'); };
        mask.querySelector('#dupNew').onclick = () => { mask.remove(); resolve('new'); };
        mask.querySelector('#dupUpdate').onclick = () => { mask.remove(); resolve('update'); };
    });
}

// 更新最新一条历史记录的聊天消息
function updateLatestHistoryChat() {
    const history = getHistory();
    if (!history.length) return;
    history[0].chatMessages = chatMessages.map(m => ({ role: m.role, text: m.text, time: m.time }));
    persistHistoryItemRecord(history[0]);
}

function clearAllHistory() {
    if (confirm('确定要清空所有历史记录吗？此操作不可恢复。')) {
        historyCache = [];
        if (historyStorageMode === 'sqlite') queueHistoryRequest('/api/history', { method: 'DELETE' });
        else localStorage.removeItem(HISTORY_STORAGE_KEY);
        renderHistory();
        updateStatus('✅ 已清空所有历史记录', 'success');
    }
}

function toggleHistoryPanel() {
    const panel = document.getElementById('historyPanel');
    if (panel.style.display === 'none' || !panel.style.display) {
        panel.style.display = 'block';
        renderHistory();
    } else {
        panel.style.display = 'none';
    }
}

function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function renderHistory() {
    const history = getHistory();
    const listEl = document.getElementById('historyList');
    
    if (history.length === 0) {
        listEl.innerHTML = '<div class="no-history">暂无审核历史记录</div>';
        return;
    }

    listEl.innerHTML = history.map(item => `
        <div class="history-item" onclick="loadHistoryItem('${item.id}')">
            <div class="history-item-header">
                <span class="history-item-filename">${escapeHtml(item.filename || '未命名合同')}</span>
                <span class="history-item-date">${formatDate(item.timestamp)}</span>
            </div>
            <div class="history-item-stats">
                发现问题：${item.issuesCount || 0} 个 | 
                合同长度：${item.contractLength || 0} 字符
            </div>
            <div class="history-item-actions" onclick="event.stopPropagation()">
                <button class="btn-secondary btn-compact" onclick="loadHistoryItem('${item.id}')">加载</button>
                <button class="btn-danger btn-compact" onclick="deleteHistoryItem('${item.id}')">删除</button>
            </div>
        </div>
    `).join('');
}

function loadHistoryItem(id) {
    const history = getHistory();
    const item = history.find(h => h.id === id);
    
    if (!item) {
        updateStatus('❌ 未找到该历史记录', 'error');
        return;
    }

    // 恢复状态
    currentHistoryItem = item;
    originalPlainText = item.contractText || '';
    originalHtmlContent = item.originalHtml || '';
    currentIssues = item.issues || [];
    currentReviewMeta = item.reviewMeta || null;
    currentContractLedger = item.contractLedger || { keyTerms: [], obligations: [] };

    // 恢复聊天记录
    chatMessages = Array.isArray(item.chatMessages) ? item.chatMessages : [];
    renderChatMessages();
    
    if (item.docxFileBuffer) {
        // 恢复原始文件
        originalFileBuffer = Uint8Array.from(atob(item.docxFileBuffer), c => c.charCodeAt(0));
        // 重新解析docx段落用于下载修改后的文档
        loadDocxParagraphs(originalFileBuffer);
    }
    
    // 重新初始化Quill编辑器并加载原文
    if (originalHtmlContent || originalPlainText) {
        initQuillEditor(originalHtmlContent || originalPlainText);
    }
    
    if (item.annotatedHtml) {
        // 如果有标注结果，直接显示
        updatePreview(item.annotatedHtml, item.issues || [], false);
        renderContractLedger();
    }
    
    if (item.editedContent) {
        // 恢复编辑后的内容（如果有）
        if (quillEditor) {
            quillEditor.clipboard.dangerouslyPasteHTML(item.editedContent);
        }
    }

    // 更新文件信息
    const fileInfo = document.getElementById('fileInfo');
    fileInfo.style.display = 'block';
    fileInfo.innerHTML = `📄 ${item.filename} (已从历史记录加载)`;
    
    // 启用相关按钮
    document.getElementById('checkBtn').disabled = !item.annotatedHtml;
    document.getElementById('downloadBtn').disabled = !item.annotatedHtml;
    
    updateStatus(`✅ 已加载历史记录：${item.filename}`, 'success');
    switchResultTab('preview', true);
}

async         function loadDocxParagraphs(buffer) {
    try {
        const zip = await JSZip.loadAsync(buffer);
        let docXmlText = await zip.file('word/document.xml').async('string');
        docxParagraphs = getDocxParagraphs(docXmlText);
    } catch (error) {
        console.error('加载文档段落失败:', error);
    }
}

async function updateVectorServiceStatus() {
    const element = document.getElementById('vectorServiceStatus');
    if (!element) return;
    if (location.protocol === 'file:') {
        element.className = 'vector-service-status fallback';
        element.textContent = '向量检索：未启用（请通过 start-vector-server.cmd 启动）';
        return;
    }
    try {
        const response = await fetch('/api/vector-status', { cache: 'no-store' });
        if (!response.ok) throw new Error(String(response.status));
        const status = await response.json();
        element.className = 'vector-service-status ready';
        const storageLabel = status.database === 'sqlite' && historyStorageMode === 'sqlite' ? ' · 历史保存至本地SQLite' : '';
        element.textContent = `向量检索：已启用 ${status.modelId} · ${status.articles}条法条${storageLabel}`;
    } catch (error) {
        element.className = 'vector-service-status fallback';
        element.textContent = '向量检索：服务未连接，当前使用关键词降级检索';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('previewContent').addEventListener('click', handlePreviewComparisonClick);
    loadApiKey();
    loadInstructions();
    refreshResultNavigation();
    initializeHistoryRepository();
    updateVectorServiceStatus();
    switchResultTab('preview');
    updateStatus("✅ 初始化成功！请上传合同文件进行审核", 'success');
});
