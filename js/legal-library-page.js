const legalEvidence = window.LegalBasisEvidence;
const allArticles = legalEvidence.getAllArticles(window.CIVIL_CODE_ARTICLES, window.LEGAL_BASIS_DATA);
const civilDocument = {
    id: 'civil-code', title: '中华人民共和国民法典', authority: '全国人民代表大会',
    effectiveFrom: '2021-01-01', version: '2020年通过', status: 'effective', documentType: 'law',
    url: 'https://flk.npc.gov.cn/detail2.html?ZmY4MDgxODE3NzAzYWRkMjAxNzcwM2QxMzQzNDA0MmY%3D',
    articleCount: (window.CIVIL_CODE_ARTICLES || []).length
};
const documents = [civilDocument, ...((window.LEGAL_BASIS_DATA && window.LEGAL_BASIS_DATA.documents) || [])];
const documentFilter = document.getElementById('documentFilter');
const searchInput = document.getElementById('searchInput');
const content = document.getElementById('content');
const toc = document.getElementById('toc');
const consultResultContainer = document.getElementById('consultResultContainer');
const consultBtn = document.getElementById('consultBtn');
const STORAGE_KEY = 'deepseek_api_key';
let selectedSourceId = 'civil-code';

function getDocumentsByType(type) {
    return documents.filter(document => document.documentType === type);
}

function escapeHtml(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderDocumentOptions() {
    const renderOptions = items => items.map(document => `<option value="${escapeHtml(document.id)}">${escapeHtml(document.title)}（${document.articleCount}条）</option>`).join('');
    documentFilter.innerHTML = `<option value="all">全部依据（${documents.length}份）</option>`
        + `<optgroup label="法律">${renderOptions(getDocumentsByType('law'))}</optgroup>`
        + `<optgroup label="司法解释、规定及批复">${renderOptions(getDocumentsByType('judicial_interpretation'))}</optgroup>`;
    documentFilter.value = selectedSourceId;
}

function renderToc() {
    const renderGroup = (title, type) => `<section class="legal-document-group">
        <div class="legal-document-group-title">${title}</div>
        ${getDocumentsByType(type).map(document => `
        <button type="button" class="toc-item toc-book legal-doc-button${document.id === selectedSourceId ? ' active' : ''}" data-source-id="${escapeHtml(document.id)}">
            ${escapeHtml(document.title)}（${document.articleCount}）
        </button>`).join('')}
    </section>`;
    toc.innerHTML = renderGroup('法律', 'law') + renderGroup('司法解释、规定及批复', 'judicial_interpretation');
    toc.querySelectorAll('[data-source-id]').forEach(button => button.addEventListener('click', () => {
        selectedSourceId = button.dataset.sourceId;
        documentFilter.value = selectedSourceId;
        searchInput.value = '';
        renderToc();
        renderArticles(getSelectedArticles());
    }));
}

function getSelectedArticles() {
    return selectedSourceId === 'all' ? allArticles : allArticles.filter(article => article.sourceId === selectedSourceId);
}

function renderArticle(article) {
    const bodyText = String(article.text || '').replace(new RegExp(`^${article.articleNo}\\s*`), '');
    return `<div class="article" id="legal-${encodeURIComponent(article.id)}">
        <div class="legal-effective-date">${escapeHtml(legalEvidence.formatEffectiveLabel(article))}</div>
        <div class="article-no">${escapeHtml(article.articleNo)}</div>
        <div class="article-path">${escapeHtml(article.lawTitle)}${article.path ? ` / ${escapeHtml(article.path)}` : ''}</div>
        <div class="article-text">${escapeHtml(bodyText)}</div>
        ${article.sourceUrl ? `<a class="legal-source-link" href="${escapeHtml(article.sourceUrl)}" target="_blank" rel="noopener noreferrer">官方来源</a>` : ''}
    </div>`;
}

function renderArticles(articles, summary) {
    const maximum = selectedSourceId === 'all' ? 200 : articles.length;
    const visible = articles.slice(0, maximum);
    content.innerHTML = `${summary ? `<div class="result-summary">${escapeHtml(summary)}</div>` : ''}
        ${visible.length ? visible.map(renderArticle).join('') : '<div class="empty">未找到匹配条文</div>'}
        ${articles.length > visible.length ? `<div class="result-summary">结果较多，仅显示前 ${visible.length} 条，请增加关键词缩小范围。</div>` : ''}`;
}

function runSearch() {
    const query = searchInput.value.trim();
    if (!query) { renderArticles(getSelectedArticles()); return; }
    const results = legalEvidence.searchLegalBasisArticles(getSelectedArticles(), query, 200);
    renderArticles(results, `查询“${query}”，找到 ${results.length} 条结果`);
}

function findMentionedArticles(answer, candidates) {
    return candidates.filter(article => answer.includes(article.id) || (answer.includes(article.lawTitle) && answer.includes(article.articleNo))).slice(0, 8);
}

function renderConsultAnswer(answer, relatedArticles) {
    consultResultContainer.innerHTML = `<div class="consult-result">
        <div class="consult-answer">${escapeHtml(answer)}</div>
        <div><strong>回答引用的候选条文</strong></div>
        ${relatedArticles.length ? relatedArticles.map(article => `<div class="consult-card">
            <div class="consult-card-title">${escapeHtml(article.lawTitle)} · ${escapeHtml(article.articleNo)}</div>
            <div>${escapeHtml(article.text.slice(0, 220))}${article.text.length > 220 ? '...' : ''}</div>
            <a class="legal-source-link" href="${escapeHtml(article.sourceUrl)}" target="_blank" rel="noopener noreferrer">查看官方来源</a>
        </div>`).join('') : '<div class="empty" style="padding:16px 0;">AI未明确引用候选条文</div>'}
    </div>`;
}

async function askLegalAi() {
    const apiKey = localStorage.getItem(STORAGE_KEY);
    const question = searchInput.value.trim();
    if (!apiKey) { alert('未找到 API Key，请先在合同审核工具中设置 DeepSeek API Key'); return; }
    if (!question) { alert('请输入法律问题或关键词'); return; }
    const candidates = legalEvidence.searchLegalBasisArticles(getSelectedArticles(), question, 20);
    if (!candidates.length) { renderConsultAnswer('未找到可供核对的候选法条，请更换关键词。', []); return; }
    consultBtn.disabled = true;
    consultBtn.textContent = '咨询中...';
    try {
        const candidateText = legalEvidence.formatLegalBasisForPrompt(candidates);
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: 'deepseek-v4-flash',
                messages: [
                    { role: 'system', content: '你是法律依据查询助手。只能依据用户提供的候选现行条文回答，引用时必须写明文件全称和条号，不得编造。回答为普通文本。' },
                    { role: 'user', content: `用户问题：\n${question}\n\n候选现行条文：\n${candidateText}\n\n请说明可能相关的法律关系、条文及风险点。` }
                ],
                temperature: 0.2,
                max_tokens: 4096
            })
        });
        if (!response.ok) throw new Error(`API请求失败（${response.status}）`);
        const data = await response.json();
        const answer = String(data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '').trim();
        renderConsultAnswer(answer, findMentionedArticles(answer, candidates));
    } catch (error) {
        renderConsultAnswer(`咨询失败：${error.message}`, []);
    } finally {
        consultBtn.disabled = false;
        consultBtn.textContent = 'AI咨询';
    }
}

documentFilter.addEventListener('change', () => { selectedSourceId = documentFilter.value; renderToc(); runSearch(); });
document.getElementById('searchBtn').addEventListener('click', runSearch);
document.getElementById('clearBtn').addEventListener('click', () => { searchInput.value = ''; renderArticles(getSelectedArticles()); });
consultBtn.addEventListener('click', askLegalAi);
searchInput.addEventListener('keydown', event => { if (event.key === 'Enter') runSearch(); });

renderDocumentOptions();
renderToc();
renderArticles(getSelectedArticles());
