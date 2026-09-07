(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.ContractReviewCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
    const SEVERITIES = new Set(['high', 'medium', 'low']);
    const DECISIONS = new Set(['pending', 'accepted', 'ignored']);

    function cleanText(value, maxLength) {
        const text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
        return typeof maxLength === 'number' ? text.slice(0, maxLength) : text;
    }

    function clampConfidence(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) return null;
        return Math.max(0, Math.min(1, number));
    }

    function normalizeSeverity(value) {
        const raw = cleanText(value).toLowerCase();
        const aliases = {
            '高': 'high', '高风险': 'high', '严重': 'high', 'critical': 'high',
            '中': 'medium', '中风险': 'medium', '一般': 'medium', 'moderate': 'medium',
            '低': 'low', '低风险': 'low', '提示': 'low'
        };
        const normalized = aliases[raw] || raw;
        return SEVERITIES.has(normalized) ? normalized : 'medium';
    }

    function normalizeIssue(issue, index) {
        const source = issue && typeof issue === 'object' ? issue : {};
        const decision = cleanText(source.decision).toLowerCase();
        return {
            id: cleanText(source.id || source.clauseId, 80) || `issue-${index + 1}`,
            sourceText: cleanText(source.sourceText || source.originalText || source.quote, 2000),
            category: cleanText(source.category, 40) || '其他',
            severity: normalizeSeverity(source.severity || source.riskLevel),
            affectedParty: cleanText(source.affectedParty || source.party, 40) || '未明确',
            confidence: clampConfidence(source.confidence),
            problem: cleanText(source.problem || source.issue, 2000),
            rationale: cleanText(source.rationale || source.reason, 2000),
            suggestion: cleanText(source.suggestion || source.advice, 3000),
            replacementText: cleanText(source.replacementText || source.revisedText, 5000),
            decision: DECISIONS.has(decision) ? decision : 'pending'
        };
    }

    function findBalancedJson(raw) {
        for (let start = 0; start < raw.length; start++) {
            if (raw[start] !== '{' && raw[start] !== '[') continue;
            const opening = raw[start];
            const closing = opening === '{' ? '}' : ']';
            let depth = 0;
            let inString = false;
            let escaped = false;
            for (let index = start; index < raw.length; index++) {
                const char = raw[index];
                if (inString) {
                    if (escaped) escaped = false;
                    else if (char === '\\') escaped = true;
                    else if (char === '"') inString = false;
                    continue;
                }
                if (char === '"') { inString = true; continue; }
                if (char === opening) depth++;
                else if (char === closing) depth--;
                if (depth === 0) {
                    const candidate = raw.slice(start, index + 1);
                    try { return JSON.parse(candidate); } catch (error) { break; }
                }
            }
        }
        return null;
    }

    function extractJson(content) {
        if (content && typeof content === 'object') return content;
        const raw = String(content || '').trim()
            .replace(/^\uFEFF/, '')
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/, '');
        if (!raw.trim()) throw new Error('AI 返回内容为空');
        try {
            return JSON.parse(raw);
        } catch (firstError) {
            const embedded = findBalancedJson(raw);
            if (embedded) return Array.isArray(embedded) ? { issues: embedded } : embedded;
            throw new Error('AI 返回内容不是有效的 JSON');
        }
    }

    function normalizeReviewResult(content) {
        const parsed = extractJson(content);
        const list = Array.isArray(parsed) ? parsed : parsed.issues;
        if (!Array.isArray(list)) throw new Error('AI 返回结果缺少 issues 数组');
        const issues = list.map(normalizeIssue).filter(issue => issue.problem && issue.suggestion);
        const keyTerms = (Array.isArray(parsed.keyTerms) ? parsed.keyTerms : [])
            .map((term, index) => normalizeKeyTerm(term, index))
            .filter(term => term.label && term.value);
        const obligations = (Array.isArray(parsed.obligations) ? parsed.obligations : [])
            .map((obligation, index) => normalizeObligation(obligation, index))
            .filter(obligation => obligation.action && obligation.responsibleParty);
        return {
            contractType: cleanText(parsed.contractType, 80) || '未识别',
            reviewedFrom: cleanText(parsed.reviewedFrom, 40) || '中立',
            summary: cleanText(parsed.summary, 2000),
            issues,
            keyTerms,
            obligations
        };
    }

    function normalizeKeyTerm(term, index) {
        const source = term && typeof term === 'object' ? term : {};
        return {
            id: cleanText(source.id, 80) || `term-${index + 1}`,
            category: cleanText(source.category, 40) || '其他',
            label: cleanText(source.label || source.name, 80),
            value: cleanText(source.value, 1000),
            sourceText: cleanText(source.sourceText || source.quote, 2000),
            confidence: clampConfidence(source.confidence)
        };
    }

    function normalizeIsoDate(value) {
        const text = cleanText(value, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return '';
        const date = new Date(`${text}T00:00:00Z`);
        return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text ? '' : text;
    }

    function normalizeObligation(obligation, index) {
        const source = obligation && typeof obligation === 'object' ? obligation : {};
        const status = cleanText(source.status).toLowerCase();
        return {
            id: cleanText(source.id, 80) || `obligation-${index + 1}`,
            responsibleParty: cleanText(source.responsibleParty || source.party, 100),
            action: cleanText(source.action, 1000),
            trigger: cleanText(source.trigger, 500),
            dueDate: normalizeIsoDate(source.dueDate),
            dueRule: cleanText(source.dueRule || source.deadline, 500),
            amount: cleanText(source.amount, 200),
            consequence: cleanText(source.consequence, 1000),
            sourceText: cleanText(source.sourceText || source.quote, 2000),
            confidence: clampConfidence(source.confidence),
            status: ['pending', 'completed', 'waived'].includes(status) ? status : 'pending'
        };
    }

    function extractOptimizedText(content) {
        const raw = String(content == null ? '' : content).trim();
        if (!raw) throw new Error('AI 返回内容为空');
        try {
            const parsed = extractJson(raw);
            const value = parsed && (parsed.optimizedText || parsed.replacementText || parsed.text);
            const normalized = cleanText(value, 10000);
            if (normalized) return normalized;
        } catch (error) {
            // 兼容旧版纯文本响应。
        }
        const fallback = raw
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .replace(/^```(?:text|markdown)?\s*/i, '')
            .replace(/\s*```$/, '')
            .replace(/^优化后(?:的段落)?[:：]?\s*/i, '')
            .trim();
        if (!fallback || fallback.startsWith('{') || fallback.startsWith('[')) {
            throw new Error('AI 未返回有效优化内容');
        }
        return cleanText(fallback, 10000);
    }

    function normalizeForMatch(value) {
        return cleanText(value).replace(/[\s，。；：、“”‘’（）()【】\[\]]/g, '').toLowerCase();
    }

    function overlapScore(a, b) {
        const left = normalizeForMatch(a);
        const right = normalizeForMatch(b);
        if (!left || !right) return 0;
        if (left.includes(right) || right.includes(left)) {
            return Math.min(left.length, right.length) / Math.max(left.length, right.length);
        }
        const grams = new Set();
        for (let i = 0; i < left.length - 1; i++) grams.add(left.slice(i, i + 2));
        let hits = 0;
        for (let i = 0; i < right.length - 1; i++) if (grams.has(right.slice(i, i + 2))) hits++;
        return hits / Math.max(1, right.length - 1);
    }

    function sanitizeElementTree(container) {
        container.querySelectorAll('script,style,iframe,object,embed,form,input,button,textarea,select,meta,link').forEach(el => el.remove());
        container.querySelectorAll('*').forEach(el => {
            Array.from(el.attributes).forEach(attr => {
                const name = attr.name.toLowerCase();
                const value = String(attr.value || '').trim().toLowerCase();
                if (name.startsWith('on') || name === 'srcdoc' || ((name === 'href' || name === 'src') && value.startsWith('javascript:'))) {
                    el.removeAttribute(attr.name);
                }
            });
        });
    }

    function annotateContract(originalHtml, issues, documentRef) {
        const doc = documentRef || (typeof document !== 'undefined' ? document : null);
        if (!doc) throw new Error('annotateContract 只能在浏览器文档环境中运行');
        const container = doc.createElement('div');
        container.innerHTML = String(originalHtml || '');
        sanitizeElementTree(container);
        const paragraphs = Array.from(container.querySelectorAll('p,li,h1,h2,h3,h4,h5,h6,td'));
        const used = new Set();

        issues.forEach((issue, index) => {
            let best = null;
            let bestScore = 0;
            paragraphs.forEach(paragraph => {
                if (used.has(paragraph)) return;
                const score = overlapScore(paragraph.textContent, issue.sourceText);
                if (score > bestScore) { best = paragraph; bestScore = score; }
            });
            if (!best || bestScore < 0.18) return;
            used.add(best);
            best.classList.add('problem-paragraph');
            best.dataset.issueId = issue.id;

            const annotation = doc.createElement('div');
            annotation.className = `issue-annotation severity-${issue.severity}`;
            annotation.dataset.issueIndex = String(index);
            const problem = doc.createElement('div');
            problem.className = 'annotation-problem';
            problem.textContent = `⚠️ ${issue.problem}`;
            const suggestion = doc.createElement('div');
            suggestion.className = 'annotation-suggestion';
            suggestion.textContent = `💡 ${issue.suggestion}`;
            annotation.append(problem, suggestion);
            best.insertAdjacentElement('afterend', annotation);
        });
        return container.innerHTML;
    }

    return {
        normalizeIssue,
        normalizeKeyTerm,
        normalizeObligation,
        normalizeReviewResult,
        extractOptimizedText,
        normalizeSeverity,
        extractJson,
        overlapScore,
        sanitizeElementTree,
        annotateContract
    };
});
