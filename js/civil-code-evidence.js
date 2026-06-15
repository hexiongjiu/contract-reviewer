(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.CivilCodeEvidence = factory();
    }
})(typeof window !== 'undefined' ? window : globalThis, function () {
    const SYNONYMS = {
        免责条款: ['免责', '免除责任', '免除', '减轻责任', '不承担责任'],
        格式条款: ['预先拟定', '重复使用', '未与对方协商', '提示', '说明义务', '公平原则', '权利义务'],
        重大过失: ['故意', '过失', '财产损失'],
        违约责任: ['违约', '不履行', '迟延履行', '赔偿损失'],
        合同解除: ['解除', '终止', '解除合同'],
        争议解决: ['争议', '管辖', '仲裁', '诉讼'],
        履行期限: ['期限', '履行期限', '逾期'],
        价款报酬: ['价款', '报酬', '付款', '费用']
    };

    const CONCEPT_RULES = [
        { concept: '格式条款', pattern: /格式条款|单方拟定|重复使用|未协商|提示|说明|霸王条款|不合理条款|明显偏向|公平|权利义务/ },
        { concept: '免责条款', pattern: /免责|免除责任|不承担责任|概不负责|责任限制/ },
        { concept: '重大过失', pattern: /重大过失|故意|人身损害|财产损失/ },
        { concept: '违约责任', pattern: /违约|逾期|迟延|赔偿|滞纳金|违约金/ },
        { concept: '合同解除', pattern: /解除|终止|提前终止/ },
        { concept: '争议解决', pattern: /争议|管辖|仲裁|诉讼|法院/ },
        { concept: '履行期限', pattern: /期限|履行时间|交付时间|完成时间/ },
        { concept: '价款报酬', pattern: /价款|报酬|付款|支付|费用/ }
    ];

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function normalizeText(value) {
        return String(value || '').replace(/[\s\u3000]+/g, ' ').trim();
    }

    function getIssueText(issue) {
        return normalizeText(`${issue && issue.sourceText ? issue.sourceText : ''} ${issue && issue.problem ? issue.problem : ''} ${issue && issue.suggestion ? issue.suggestion : ''}`);
    }

    function inferConcepts(issue) {
        const text = getIssueText(issue);
        const concepts = [];
        CONCEPT_RULES.forEach(rule => {
            if (rule.pattern.test(text)) concepts.push(rule.concept);
        });
        return concepts;
    }

    function expandTerms(terms) {
        const expanded = new Set();
        terms.forEach(term => {
            expanded.add(term);
            if (SYNONYMS[term]) SYNONYMS[term].forEach(alias => expanded.add(alias));
        });
        return Array.from(expanded).filter(Boolean);
    }

    function getArticlePath(article) {
        return [article.book, article.subbook, article.chapter, article.section].filter(Boolean).join(' / ');
    }

    function matchCivilCodeArticles(articles, issue, limit) {
        const concepts = inferConcepts(issue);
        const terms = expandTerms(concepts);
        if (!Array.isArray(articles) || terms.length === 0) return [];

        return articles.map(article => {
            const heading = `${article.articleNo || ''} ${getArticlePath(article)}`;
            const haystack = `${heading} ${article.text || ''}`;
            const matched = [];
            let score = 0;

            terms.forEach(term => {
                const count = haystack.split(term).length - 1;
                if (count > 0) {
                    matched.push(term);
                    score += count * 2;
                    if (heading.includes(term)) score += 4;
                    if (concepts.includes(term)) score += 8;
                }
            });

            if ((issue.problem || issue.suggestion || issue.sourceText) && article.book === '第三编　合同') score += 12;
            if (article.book && !['第三编　合同', '第二编　物权', '第一编　总则'].includes(article.book)) score -= 8;

            return {
                articleNo: article.articleNo,
                path: getArticlePath(article),
                text: article.text,
                score,
                reason: matched.length ? `命中：${Array.from(new Set(matched)).slice(0, 5).join('、')}` : ''
            };
        }).filter(item => item.score > 0 && item.reason)
            .sort((a, b) => b.score - a.score || String(a.articleNo).localeCompare(String(b.articleNo), 'zh-Hans-CN'))
            .slice(0, limit || 3);
    }

    function formatCivilCodeEvidenceForPrompt(matches) {
        if (!Array.isArray(matches) || matches.length === 0) return '';
        return matches.map((match, index) => {
            return `${index + 1}. ${match.articleNo}\n位置：${match.path || '民法典'}\n条文：${normalizeText(match.text)}`;
        }).join('\n\n');
    }

    function parseVerifiedCivilCodeSelection(content, candidates) {
        let parsed = null;
        const raw = String(content || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        try {
            parsed = JSON.parse(raw);
        } catch (error) {
            const match = raw.match(/\{[\s\S]*\}/);
            if (match) {
                try { parsed = JSON.parse(match[0]); } catch (innerError) { parsed = null; }
            }
        }
        const selected = parsed && Array.isArray(parsed.selected) ? parsed.selected : [];
        return selected.map(item => {
            const candidate = candidates.find(candidateItem => candidateItem.articleNo === item.articleNo);
            if (!candidate) return null;
            return {
                ...candidate,
                reason: normalizeText(item.reason || candidate.reason || 'AI核对相关')
            };
        }).filter(Boolean).slice(0, 3);
    }

    function renderCivilCodeEvidenceState(state, matches) {
        if (state === 'loading') {
            return '<div class="civil-code-evidence civil-code-evidence-status">正在核对民法典依据...</div>';
        }
        if (state === 'empty') {
            return '<div class="civil-code-evidence civil-code-evidence-status">未匹配到高相关法条</div>';
        }
        if (state === 'error') {
            return '<div class="civil-code-evidence civil-code-evidence-status">民法典依据核对失败</div>';
        }
        return renderCivilCodeEvidence(matches);
    }

    function renderCivilCodeEvidence(matches) {
        if (!Array.isArray(matches) || matches.length === 0) return '';
        const items = matches.map(match => `
            <div class="civil-code-article">
                <div class="civil-code-article-title">${escapeHtml(match.articleNo)} <span>${escapeHtml(match.reason)}</span></div>
                <div class="civil-code-article-path">${escapeHtml(match.path)}</div>
                <div class="civil-code-article-text">${escapeHtml(match.text)}</div>
            </div>
        `).join('');
        return `
            <details class="civil-code-evidence">
                <summary>相关民法典依据（${matches.length}条）</summary>
                ${items}
            </details>
        `;
    }

    return { matchCivilCodeArticles, renderCivilCodeEvidence, formatCivilCodeEvidenceForPrompt, parseVerifiedCivilCodeSelection, renderCivilCodeEvidenceState, inferConcepts };
});
