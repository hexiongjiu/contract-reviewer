(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.LegalBasisEvidence = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
    const SYNONYMS = {
        格式条款: ['预先拟定', '重复使用', '提示义务', '说明义务', '霸王条款'],
        免责条款: ['免责', '免除责任', '减轻责任', '不承担责任', '责任限制'],
        违约责任: ['违约', '迟延履行', '赔偿损失', '违约金', '滞纳金'],
        合同解除: ['解除合同', '终止合同', '提前终止', '解除权'],
        价款报酬: ['价款', '报酬', '付款', '支付', '结算', '费用'],
        劳动用工: ['劳动合同', '工资', '加班', '工时', '休息休假', '竞业限制', '试用期', '解除劳动关系'],
        知识产权: ['著作权', '版权', '商标', '源代码', '软件', '许可', '转让', '委托创作', '技术成果', '技术秘密'],
        数据合规: ['个人信息', '敏感个人信息', '数据处理', '数据安全', '跨境', '委托处理', '人脸识别'],
        电子签署: ['电子签名', '数据电文', '电子合同', '线上签署', '可靠电子签名'],
        公司治理: ['股权', '出资', '股东', '董事', '法定代表人', '公司担保', '关联交易'],
        建设施工: ['建设工程', '施工', '承包人', '发包人', '工程款', '竣工', '工程质量', '招标投标'],
        买卖交付: ['买卖', '采购', '销售', '交付', '验收', '所有权转移', '质量异议'],
        担保: ['保证', '抵押', '质押', '留置', '担保物权', '保证金'],
        主体与授权: ['主体资格', '主体资质', '签约资格', '经营资质', '许可资质', '营业执照', '行政许可', '登记成立', '法定代表人', '授权委托', '代理权', '超越权限'],
        通知与送达: ['通知送达', '送达地址', '通知地址', '书面通知', '电子邮件', '邮箱', '通知', '到达', '到达对方', '视为送达'],
        合同变更: ['单方变更', '单方调整', '自行调整', '变更合同', '变更价格', '变更服务'],
        合同期限: ['自动续约', '自动续期', '续展', '合同期限', '届满', '到期', '退出期'],
        不可抗力: ['不可抗力', '情势变更', '不能履行', '免除责任', '通知义务', '提供证明'],
        争议解决: ['争议解决', '诉讼管辖', '管辖法院', '被告所在地', '仲裁机构', '仲裁条款']
    };

    const CONCEPT_RULES = Object.keys(SYNONYMS).map(concept => ({
        concept,
        pattern: new RegExp([concept, ...SYNONYMS[concept]].join('|'))
    }));

    const CONTRACT_SOURCE_BOOST = {
        采购合同: ['sales-contract-2020', 'large-sme-third-party-payment-2024'],
        销售合同: ['sales-contract-2020', 'large-sme-third-party-payment-2024'],
        服务合同: ['civil-code-contract-general-2023', 'electronic-signature-law-2019'],
        软件开发合同: ['technology-contract-2020', 'copyright-law-2020', 'copyright-civil-disputes-2026', 'pipl-2021', 'data-security-law-2021', 'electronic-signature-law-2019'],
        保密协议: ['technology-contract-2020', 'pipl-2021', 'data-security-law-2021'],
        劳动合同: ['labor-contract-law-2012', 'labor-law-2018', 'labor-dispute-1-2020', 'labor-dispute-2-2025'],
        建设工程合同: ['construction-contract-1-2020', 'construction-contract-2-2026'],
        股权合同: ['company-law-2023', 'company-law-temporal-2024', 'company-law-article-88-nonretroactive-2024']
    };

    const CORE_SOURCES = ['civil-code', 'civil-code-contract-general-2023'];
    const CONCEPT_SOURCE_ROUTES = {
        格式条款: CORE_SOURCES,
        免责条款: CORE_SOURCES,
        违约责任: CORE_SOURCES,
        合同解除: CORE_SOURCES,
        价款报酬: CORE_SOURCES,
        劳动用工: ['labor-contract-law-2012', 'labor-law-2018', 'labor-dispute-1-2020', 'labor-dispute-2-2025'],
        知识产权: ['technology-contract-2020', 'copyright-law-2020', 'copyright-civil-disputes-2026', 'ip-punitive-damages-2026'],
        数据合规: ['pipl-2021', 'data-security-law-2021', 'facial-recognition-2021'],
        电子签署: ['electronic-signature-law-2019', ...CORE_SOURCES],
        公司治理: ['company-law-2023', 'company-law-temporal-2024', 'company-law-article-88-nonretroactive-2024'],
        建设施工: ['construction-contract-1-2020', 'construction-contract-2-2026'],
        买卖交付: ['sales-contract-2020', 'large-sme-third-party-payment-2024', ...CORE_SOURCES],
        担保: ['civil-code-security-2020', ...CORE_SOURCES],
        主体与授权: ['company-law-2023', ...CORE_SOURCES],
        通知与送达: ['electronic-signature-law-2019', ...CORE_SOURCES],
        合同变更: CORE_SOURCES,
        合同期限: CORE_SOURCES,
        不可抗力: CORE_SOURCES,
        争议解决: []
    };

    const EXTRA_LEGAL_TERMS = [
        '验收标准', '验收期限', '付款条件', '付款期限', '逾期付款', '发票', '税费', '质量标准',
        '所有权转移', '风险转移', '保密义务', '商业秘密', '不可抗力', '通知送达', '争议解决',
        '仲裁', '管辖', '转包', '分包', '服务期', '经济补偿', '个人信息出境', '自动续约',
        '主体资格', '经营资质', '授权委托', '代理权', '送达地址', '书面通知',
        '单方变更', '单方调整', '情势变更'
    ];

    const CONTRACT_PATH_ROUTES = {
        采购合同: ['买卖合同'],
        销售合同: ['买卖合同'],
        服务合同: ['委托合同', '承揽合同'],
        软件开发合同: ['技术合同'],
        建设工程合同: ['建设工程合同'],
        保密协议: ['技术合同']
    };

    const NARROW_SOURCE_TRIGGERS = {
        'large-sme-third-party-payment-2024': ['第三方付款', '第三方支付', '收到第三方', '付款前提', '背靠背'],
        'facial-recognition-2021': ['人脸', '面部识别', '生物识别'],
        'company-law-article-88-nonretroactive-2024': ['第八十八条', '未届出资期限', '出资期限未届满'],
        'prepaid-consumption-2025': ['预付', '预付款', '预付卡', '充值', '储值'],
        'ip-punitive-damages-2026': ['惩罚性赔偿', '故意侵权', '恶意侵权']
    };

    const CONCEPT_ARTICLE_ANCHORS = {
        主体与授权: [
            'civil-code:第五十八条', 'civil-code:第六十一条', 'civil-code:第一百七十一条',
            'civil-code:第一百七十二条', 'civil-code:第五百零二条'
        ],
        通知与送达: ['civil-code:第一百三十七条', 'civil-code:第一百三十八条', 'civil-code:第五百零九条'],
        合同变更: ['civil-code:第五百四十三条', 'civil-code:第五百四十四条'],
        不可抗力: ['civil-code:第五百九十条', 'civil-code:第五百三十三条'],
        合同期限: ['civil-code:第五百一十条']
    };

    function escapeHtml(value) {
        return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function normalizeText(value) {
        return String(value || '').replace(/[\s\u3000]+/g, ' ').trim();
    }

    function createCivilCodeArticles(civilCodeArticles) {
        return (Array.isArray(civilCodeArticles) ? civilCodeArticles : []).map(article => ({
            ...article,
            id: `civil-code:${article.articleNo}`,
            sourceId: 'civil-code',
            lawTitle: '中华人民共和国民法典',
            documentType: 'law',
            version: '2020年通过',
            effectiveFrom: '2021-01-01',
            sourceUrl: 'https://flk.npc.gov.cn/detail2.html?ZmY4MDgxODE3NzAzYWRkMjAxNzcwM2QxMzQzNDA0MmY%3D',
            path: [article.book, article.subbook, article.chapter, article.section].filter(Boolean).join(' / ')
        }));
    }

    function getAllArticles(civilCodeArticles, legalBasisData) {
        const extra = legalBasisData && Array.isArray(legalBasisData.articles) ? legalBasisData.articles : [];
        return [...createCivilCodeArticles(civilCodeArticles), ...extra];
    }

    function inferConcepts(issue) {
        const text = normalizeText(`${issue && issue.sourceText || ''} ${issue && issue.problem || ''} ${issue && issue.suggestion || ''}`);
        return CONCEPT_RULES.filter(rule => rule.pattern.test(text)).map(rule => rule.concept);
    }

    function getPath(article) {
        return article.path || [article.book, article.subbook, article.chapter, article.section].filter(Boolean).join(' / ');
    }

    function addWeightedTerm(terms, term, weight, origin) {
        const value = normalizeText(term);
        if (value.length < 2) return;
        const current = terms.get(value);
        if (!current || current.weight < weight) terms.set(value, { term: value, weight, origin });
    }

    function extractIssueTerms(issue, concepts) {
        const sourceText = normalizeText(issue && issue.sourceText || '');
        const problem = normalizeText(issue && issue.problem || '');
        const suggestion = normalizeText(issue && issue.suggestion || '');
        const category = normalizeText(issue && issue.category || '');
        const combined = `${sourceText} ${problem} ${suggestion} ${category}`;
        const terms = new Map();

        concepts.forEach(concept => {
            addWeightedTerm(terms, concept, 1.8, 'concept');
            (SYNONYMS[concept] || []).forEach(term => {
                if (combined.includes(term)) addWeightedTerm(terms, term, term.length >= 4 ? 2.2 : 1.4, 'explicit');
                else addWeightedTerm(terms, term, 0.55, 'synonym');
            });
        });
        EXTRA_LEGAL_TERMS.forEach(term => {
            if (combined.includes(term)) addWeightedTerm(terms, term, term.length >= 4 ? 2.2 : 1.5, 'explicit');
        });
        if (category && !['其他', '缺失条款', '表述歧义'].includes(category)) addWeightedTerm(terms, category, 1.5, 'category');
        return Array.from(terms.values());
    }

    function getRoutedSources(contractType, concepts) {
        const contractSources = CONTRACT_SOURCE_BOOST[contractType] || [];
        const conceptSources = concepts.flatMap(concept => CONCEPT_SOURCE_ROUTES[concept] || []);
        return {
            contractSources,
            sources: new Set([...CORE_SOURCES, ...contractSources, ...conceptSources])
        };
    }

    function selectDiverseCandidates(candidates, limit) {
        const maximum = limit || 5;
        const perSourceLimit = Math.max(2, Math.ceil(maximum / 4));
        const representativeFloor = candidates.length ? Math.max(10, candidates[0].score * 0.2) : 0;
        const expansionFloor = candidates.length ? candidates[0].score * 0.55 : 0;
        const counts = new Map();
        const selected = [];
        const selectedIds = new Set();

        // First reserve one credible representative per source. This prevents a
        // single long statute from occupying every candidate slot.
        candidates.forEach(candidate => {
            if (selected.length >= maximum || candidate.score < representativeFloor || counts.has(candidate.sourceId)) return;
            selected.push(candidate);
            selectedIds.add(candidate.id);
            counts.set(candidate.sourceId, 1);
        });

        // Then expand strong sources up to a cap, but do not multiply weak
        // representatives merely to satisfy diversity.
        candidates.forEach(candidate => {
            if (selected.length >= maximum || selectedIds.has(candidate.id) || candidate.score < expansionFloor) return;
            const count = counts.get(candidate.sourceId) || 0;
            if (count >= perSourceLimit) return;
            selected.push(candidate);
            selectedIds.add(candidate.id);
            counts.set(candidate.sourceId, count + 1);
        });

        for (const candidate of candidates) {
            if (selected.length >= maximum) break;
            if (selectedIds.has(candidate.id)) continue;
            selected.push(candidate);
            selectedIds.add(candidate.id);
        }
        return selected.sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id), 'zh-Hans-CN'));
    }

    function matchLegalBasisArticles(articles, issue, limit, options) {
        const concepts = inferConcepts(issue);
        const rawText = normalizeText(`${issue && issue.sourceText || ''} ${issue && issue.problem || ''} ${issue && issue.suggestion || ''}`);
        const terms = extractIssueTerms(issue, concepts);
        if (!Array.isArray(articles) || terms.length === 0) return [];
        const routing = getRoutedSources(options && options.contractType, concepts);
        const contractPathRoutes = CONTRACT_PATH_ROUTES[options && options.contractType] || [];

        const ranked = articles.map(article => {
            const title = normalizeText(article.lawTitle || '');
            const path = normalizeText(getPath(article));
            const tags = normalizeText((article.tags || []).join(' '));
            const body = normalizeText(article.text || '');
            const requiredTriggers = NARROW_SOURCE_TRIGGERS[article.sourceId];
            if (requiredTriggers && !requiredTriggers.some(term => rawText.includes(term))) return null;
            let score = 0;
            const matched = [];
            let lexicalScore = 0;
            let explicitLexicalScore = 0;
            const anchoredConcepts = concepts.filter(concept => (CONCEPT_ARTICLE_ANCHORS[concept] || []).includes(article.id));
            terms.forEach(entry => {
                const term = entry.term;
                let fieldScore = 0;
                if (title.includes(term)) fieldScore += entry.origin === 'synonym' ? 2 : 14;
                if (path.includes(term)) fieldScore += entry.origin === 'synonym' ? 8 : 11;
                if (tags.includes(term)) fieldScore += 10;
                if (body.includes(term)) fieldScore += Math.min(8, 3 + term.length);
                if (!fieldScore) return;
                matched.push(term);
                lexicalScore += fieldScore * entry.weight;
                if (entry.origin === 'explicit' || entry.origin === 'category') explicitLexicalScore += fieldScore * entry.weight;
            });
            if (!lexicalScore && !anchoredConcepts.length) return null;

            if (anchoredConcepts.length) {
                lexicalScore += 38;
                explicitLexicalScore += 38;
                matched.push(...anchoredConcepts);
            }

            score += lexicalScore;
            const contractRouteIndex = routing.contractSources.indexOf(article.sourceId);
            if (contractRouteIndex >= 0) score += Math.max(5, 12 - contractRouteIndex);
            else if (routing.sources.has(article.sourceId)) score += 5;
            else if (explicitLexicalScore < 40) return null;
            const pathRouteMatch = contractPathRoutes.find(term => path.includes(term));
            if (pathRouteMatch) score += 16;

            const exactCitation = title && rawText.includes(title) && rawText.includes(article.articleNo || '');
            if (exactCitation) score += 120;
            const relevance = exactCitation || anchoredConcepts.length || lexicalScore >= 24 ? 'direct' : 'supplemental';
            const reasonPrefix = relevance === 'direct' ? '直接命中' : '补充匹配';
            return {
                ...article,
                path: getPath(article),
                score,
                relevance,
                retrievalConfidence: Math.min(0.98, Number((0.45 + score / 180).toFixed(2))),
                matchedTerms: Array.from(new Set(matched)),
                retrievalMode: anchoredConcepts.length ? 'anchor' : 'lexical',
                routeTier: contractRouteIndex >= 0 || pathRouteMatch ? 'contract' : (routing.sources.has(article.sourceId) ? 'topic' : 'cross-topic'),
                reason: `${reasonPrefix}：${Array.from(new Set(matched)).slice(0, 5).join('、')}${contractRouteIndex >= 0 || pathRouteMatch ? '；适用当前合同类型' : ''}`
            };
        }).filter(Boolean)
            .sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id), 'zh-Hans-CN'));
        return selectDiverseCandidates(ranked, limit || 5);
    }

    function buildVectorQuery(issue) {
        return normalizeText([
            issue && issue.category || '',
            issue && issue.sourceText || '',
            issue && issue.problem || '',
            issue && issue.rationale || ''
        ].filter(Boolean).join(' ')).slice(0, 4000);
    }

    function mergeVectorMatches(articles, lexicalCandidates, vectorResults, issue, limit, options) {
        const articleMap = new Map((articles || []).map(article => [article.id, article]));
        const merged = new Map((lexicalCandidates || []).map(candidate => [candidate.id, { ...candidate }]));
        const concepts = inferConcepts(issue);
        const routing = getRoutedSources(options && options.contractType, concepts);
        const conceptSources = new Set(concepts.flatMap(concept => CONCEPT_SOURCE_ROUTES[concept] || []));
        const contractPathRoutes = CONTRACT_PATH_ROUTES[options && options.contractType] || [];
        const rawText = normalizeText(`${issue && issue.sourceText || ''} ${issue && issue.problem || ''}`);

        (Array.isArray(vectorResults) ? vectorResults : []).forEach(result => {
            const vectorScore = Number(result && result.score);
            const article = articleMap.get(result && result.id);
            if (!article || !Number.isFinite(vectorScore) || vectorScore < 0.46) return;
            const requiredTriggers = NARROW_SOURCE_TRIGGERS[article.sourceId];
            if (requiredTriggers && !requiredTriggers.some(term => rawText.includes(term))) return;
            const path = getPath(article);
            const inTopicRoute = routing.sources.has(article.sourceId);
            const inConceptRoute = conceptSources.has(article.sourceId);
            const inContractPath = contractPathRoutes.some(term => path.includes(term));
            if (!inTopicRoute && !inContractPath && vectorScore < 0.72) return;

            const current = merged.get(article.id);
            const semanticPoints = vectorScore * 90;
            const combinedScore = (current ? current.score : 0) + semanticPoints + (current ? 14 : 0);
            const relevance = current && current.relevance === 'direct'
                ? 'direct'
                : (vectorScore >= 0.64 && (inConceptRoute || inContractPath) ? 'direct' : 'supplemental');
            const semanticReason = `向量语义相似度 ${(vectorScore * 100).toFixed(1)}%${inTopicRoute || inContractPath ? '；符合当前合同或风险主题' : ''}`;
            merged.set(article.id, {
                ...article,
                ...(current || {}),
                path,
                score: combinedScore,
                vectorScore,
                relevance,
                retrievalConfidence: Math.min(0.99, Number((0.35 + vectorScore * 0.7).toFixed(2))),
                matchedTerms: current ? current.matchedTerms : concepts,
                retrievalMode: current ? 'hybrid' : 'vector',
                routeTier: current ? current.routeTier : (inContractPath ? 'contract' : (inTopicRoute ? 'topic' : 'cross-topic')),
                reason: current ? `${current.reason}；${semanticReason}` : `语义匹配：${semanticReason}`
            });
        });

        const ranked = Array.from(merged.values())
            .sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id), 'zh-Hans-CN'));
        return selectDiverseCandidates(ranked, limit || 16);
    }

    function searchLegalBasisArticles(articles, query, limit) {
        const normalized = normalizeText(query);
        if (!normalized) return [];
        const terms = normalized.split(/[\s，,、]+/).filter(Boolean);
        return (articles || []).map(article => {
            const haystack = normalizeText(`${article.lawTitle || ''} ${article.articleNo || ''} ${getPath(article)} ${article.text || ''}`);
            const score = terms.reduce((total, term) => total + (haystack.includes(term) ? term.length + (String(article.articleNo).includes(term) ? 12 : 0) : 0), 0);
            return { ...article, path: getPath(article), score };
        }).filter(article => article.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit || 30);
    }

    function formatLegalBasisForPrompt(matches) {
        return (matches || []).map((match, index) => `${index + 1}. 候选ID：${match.id}\n文件：${match.lawTitle}\n版本/文号：${match.version || match.documentNo || '现行文本'}\n施行日期：${match.effectiveFrom || '未标注'}\n结构路径：${getPath(match) || '无分组标题'}\n条号：${match.articleNo}\n初筛级别：${match.relevance === 'direct' ? '直接依据候选' : '补充依据候选'}\n初筛原因：${match.reason || '相关词匹配'}\n条文：${normalizeText(match.text)}`).join('\n\n');
    }

    function formatEffectiveLabel(match) {
        const identity = match.version || match.documentNo || (match.documentType === 'judicial_interpretation' ? '现行司法解释' : '现行法律');
        const effective = match.effectiveFrom ? `${match.effectiveFrom}施行` : '施行日期未标注';
        const expiry = match.effectiveTo ? `，有效至${match.effectiveTo}` : '';
        return `${identity}｜${effective}${expiry}`;
    }

    function parseVerifiedSelection(content, candidates) {
        const raw = String(content || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        if (!raw) throw new Error('AI复核返回为空');
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch (error) {
            const match = raw.match(/\{[\s\S]*\}/);
            if (match) try { parsed = JSON.parse(match[0]); } catch (ignored) { parsed = null; }
        }
        if (!parsed) throw new Error('AI复核返回的内容不是有效JSON');
        if (!Array.isArray(parsed.selected)) throw new Error('AI复核结果缺少selected数组');
        return parsed.selected.map(item => {
            const candidate = candidates.find(entry => entry.id === item.id)
                || candidates.find(entry => entry.articleNo === item.articleNo && (!item.lawTitle || entry.lawTitle === item.lawTitle));
            return candidate ? {
                ...candidate,
                relevance: item.relevance === 'supplemental' ? 'supplemental' : 'direct',
                verificationStatus: 'verified',
                reason: normalizeText(item.reason || candidate.reason || 'AI核对相关')
            } : null;
        }).filter(Boolean).slice(0, 5);
    }

    function getLocalFallbackSelection(candidates, limit, options) {
        if (!Array.isArray(candidates) || !candidates.length) return [];
        const maximum = limit || 3;
        const reviewStatus = options && options.reviewStatus || 'local';
        const errorMessage = normalizeText(options && options.errorMessage || '').slice(0, 120);
        const topScore = Number(candidates[0].score) || 0;
        const scoreFloor = Math.max(24, topScore * 0.58);
        const selectedSources = new Set();
        const strong = candidates.filter(candidate =>
            candidate.relevance === 'direct'
            && candidate.retrievalMode !== 'vector'
            && candidate.routeTier !== 'cross-topic'
            && Number(candidate.score) >= scoreFloor
        );
        const selected = [];
        for (const candidate of strong) {
            if (selected.length >= maximum) break;
            if (selectedSources.has(candidate.sourceId) && selected.length < Math.min(2, maximum)) continue;
            selected.push({
                ...candidate,
                verificationStatus: reviewStatus,
                reason: reviewStatus === 'reviewed-empty'
                    ? `AI已完成复核但未选中该条；本地检索候选：${candidate.reason || '相关词与法律路由命中'}`
                    : (reviewStatus === 'review-failed'
                        ? `AI复核失败${errorMessage ? `（${errorMessage}）` : ''}；本地检索候选：${candidate.reason || '相关词与法律路由命中'}`
                        : `本地检索候选·未经AI复核：${candidate.reason || '相关词与法律路由命中'}`)
            });
            selectedSources.add(candidate.sourceId);
        }
        return selected;
    }

    function renderEvidence(matches) {
        if (!Array.isArray(matches) || !matches.length) return '';
        const reviewFailed = matches.some(match => match.verificationStatus === 'review-failed');
        const reviewedEmpty = matches.some(match => match.verificationStatus === 'reviewed-empty');
        const containsLocalFallback = matches.some(match => ['local', 'review-failed', 'reviewed-empty'].includes(match.verificationStatus));
        const items = matches.map(match => `
            <div class="civil-code-article legal-basis-article">
                <div class="legal-effective-date">${escapeHtml(formatEffectiveLabel(match))}</div>
                <div class="civil-code-article-title">${escapeHtml(match.lawTitle)} · ${escapeHtml(match.articleNo)} <span>${match.verificationStatus === 'review-failed' ? '候选法条·AI复核失败' : (match.verificationStatus === 'reviewed-empty' ? '候选法条·AI未采用' : (match.verificationStatus === 'local' ? '候选法条·未复核' : (match.relevance === 'supplemental' ? '补充依据' : '直接依据')))} · ${escapeHtml(match.reason)}</span></div>
                ${match.path ? `<div class="civil-code-article-path">${escapeHtml(match.path)}</div>` : ''}
                <div class="civil-code-article-text">${escapeHtml(match.text)}</div>
                ${match.sourceUrl ? `<a class="legal-source-link" href="${escapeHtml(match.sourceUrl)}" target="_blank" rel="noopener noreferrer">查看官方来源</a>` : ''}
            </div>`).join('');
        const summarySuffix = reviewFailed
            ? '·AI复核失败，仅显示本地候选'
            : (reviewedEmpty
                ? '·AI已复核但未采用，仍显示本地候选'
                : (containsLocalFallback ? '·本地候选未复核' : '·AI已复核并采用'));
        return `<details class="civil-code-evidence legal-basis-evidence"><summary>相关法律依据（${matches.length}条${summarySuffix}）</summary>${items}</details>`;
    }

    function renderEvidenceState(state, matches, detail) {
        if (state === 'loading') return '<div class="civil-code-evidence civil-code-evidence-status">正在核对法律依据...</div>';
        if (state === 'empty') return '<div class="civil-code-evidence civil-code-evidence-status">未匹配到高相关现行法条</div>';
        if (state === 'reviewed-empty') return '<div class="civil-code-evidence civil-code-evidence-status">AI已完成复核，但未确认候选法条与当前问题直接相关</div>';
        if (state === 'history-missing') return '<div class="civil-code-evidence civil-code-evidence-status evidence-history-missing"><span>该历史记录未保存法律依据结果</span><button class="evidence-recheck-btn" type="button" onclick="recheckHistoryLegalEvidence()">重新核对</button></div>';
        if (state === 'error') return `<div class="civil-code-evidence civil-code-evidence-status">AI法律依据复核失败${detail ? `：${escapeHtml(detail)}` : ''}</div>`;
        return renderEvidence(matches);
    }

    return {
        getAllArticles,
        inferConcepts,
        matchLegalBasisArticles,
        buildVectorQuery,
        mergeVectorMatches,
        searchLegalBasisArticles,
        formatLegalBasisForPrompt,
        parseVerifiedSelection,
        getLocalFallbackSelection,
        renderEvidence,
        renderEvidenceState,
        formatEffectiveLabel,
        CONTRACT_SOURCE_BOOST
    };
});
