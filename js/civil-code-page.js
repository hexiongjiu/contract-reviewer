const articles = Array.isArray(window.CIVIL_CODE_ARTICLES) ? window.CIVIL_CODE_ARTICLES : [];
const browser = window.CivilCodeBrowser;
const outline = browser.buildCivilCodeOutline(articles);
const toc = document.getElementById('toc');
const content = document.getElementById('content');
const consultResultContainer = document.getElementById('consultResultContainer');
const searchInput = document.getElementById('searchInput');
const consultBtn = document.getElementById('consultBtn');
const STORAGE_KEY = 'deepseek_api_key';

function escapeHtml(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function articlePath(article) {
    return [article.book, article.subbook, article.chapter, article.section].filter(Boolean).join(' / ');
}

function renderToc() {
    toc.innerHTML = outline.map(book => `
        <a class="toc-item toc-book" href="#${book.id}">${escapeHtml(book.title)}（${book.articleCount}）</a>
        ${book.subbooks.map(subbook => `
            <a class="toc-item toc-subbook" href="#${subbook.id}">${escapeHtml(subbook.title)}（${subbook.articleCount}）</a>
            ${subbook.chapters.map(chapter => `<a class="toc-item toc-chapter" href="#${chapter.id}">${escapeHtml(chapter.title)}（${chapter.articleCount}）</a>`).join('')}
        `).join('')}
        ${book.chapters.map(chapter => `<a class="toc-item toc-chapter" href="#${chapter.id}">${escapeHtml(chapter.title)}（${chapter.articleCount}）</a>`).join('')}
    `).join('');
}

function renderArticle(article) {
    return `
        <div class="article" id="${browser.getArticleAnchor(article.articleNo)}">
            <div class="article-no">${escapeHtml(article.articleNo)}</div>
            <div class="article-path">${escapeHtml(articlePath(article))}</div>
            <div class="article-text">${escapeHtml(article.text)}</div>
        </div>
    `;
}

function renderFullText() {
    let html = '';
    outline.forEach(book => {
        html += `<h2 id="${book.id}" class="section-heading book-heading">${escapeHtml(book.title)}</h2>`;
        book.subbooks.forEach(subbook => {
            html += `<h3 id="${subbook.id}" class="section-heading subbook-heading">${escapeHtml(subbook.title)}</h3>`;
            subbook.chapters.forEach(chapter => {
                html += `<h4 id="${chapter.id}" class="section-heading chapter-heading">${escapeHtml(chapter.title)}</h4>`;
                chapter.articles.forEach(article => { html += renderArticle(article); });
                chapter.sections.forEach(section => {
                    html += `<h5 id="${section.id}" class="section-heading">${escapeHtml(section.title)}</h5>`;
                    section.articles.forEach(article => { html += renderArticle(article); });
                });
            });
        });
        book.chapters.forEach(chapter => {
            html += `<h4 id="${chapter.id}" class="section-heading chapter-heading">${escapeHtml(chapter.title)}</h4>`;
            chapter.articles.forEach(article => { html += renderArticle(article); });
            chapter.sections.forEach(section => {
                html += `<h5 id="${section.id}" class="section-heading">${escapeHtml(section.title)}</h5>`;
                section.articles.forEach(article => { html += renderArticle(article); });
            });
        });
    });
    content.innerHTML = html || '<div class="empty">未加载到民法典数据</div>';
}

function renderSearch() {
    const query = searchInput.value.trim();
    if (!query) { renderFullText(); return; }
    const results = browser.searchCivilCodeArticles(articles, query);
    content.innerHTML = `
        <div class="result-summary">查询“${escapeHtml(query)}”，找到 ${results.length} 条结果</div>
        ${results.length ? results.map(renderArticle).join('') : '<div class="empty">未找到匹配条文</div>'}
    `;
}

function formatCandidatePrompt(candidates) {
    return candidates.map((article, index) => `${index + 1}. ${article.articleNo}\n位置：${articlePath(article)}\n条文：${article.text}`).join('\n\n');
}

function findArticlesInAnswer(answer, candidates) {
    if (!answer) return [];
    return candidates.filter(article => {
        if (answer.includes(article.articleNo)) return true;
        const arabicMatch = article.articleNo.match(/^第(.+)条$/);
        if (!arabicMatch) return false;
        const arabicNo = browser.chineseToArabic(arabicMatch[1]);
        return arabicNo && answer.includes(`第${arabicNo}条`);
    }).slice(0, 5);
}

function clearConsultResult() {
    consultResultContainer.innerHTML = '';
}

function renderConsultAnswer(answer, relatedArticles) {
    clearConsultResult();
    consultResultContainer.innerHTML = `
        <div class="consult-result">
            <div class="consult-answer">${escapeHtml(answer)}</div>
            <div><strong>相关条文</strong></div>
            ${relatedArticles.length ? relatedArticles.map(article => `
                <div class="consult-card">
                    <div class="consult-card-title">${escapeHtml(article.articleNo)}</div>
                    <div class="consult-card-path">${escapeHtml(articlePath(article))}</div>
                    <div>${escapeHtml(article.text.slice(0, 180))}${article.text.length > 180 ? '...' : ''}</div>
                    <button class="jump-btn" onclick="jumpToArticle('${escapeHtml(article.articleNo)}')">定位到条文</button>
                </div>
            `).join('') : '<div class="empty" style="padding:16px 0;">AI未明确引用候选条文</div>'}
        </div>
    `;
}

function jumpToArticle(articleNo) {
    const anchor = browser.getArticleAnchor(articleNo);
    if (!document.getElementById(anchor)) renderFullText();
    setTimeout(() => {
        document.querySelectorAll('.article-active').forEach(el => el.classList.remove('article-active'));
        const target = document.getElementById(anchor);
        if (!target) return;
        target.classList.add('article-active');
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
}

async function askCivilCodeAi() {
    const apiKey = localStorage.getItem(STORAGE_KEY);
    const question = searchInput.value.trim();
    if (!apiKey) { alert('未找到 API Key，请先在合同审核工具中设置 DeepSeek API Key'); return; }
    if (!question) { alert('请输入要咨询的情况'); return; }
    const candidates = browser.getConsultationCandidates(articles, question, 15);
    if (!candidates.length) {
        consultResultContainer.innerHTML = '<div class="consult-result"><div class="empty" style="padding:16px 0;">未找到可供咨询的候选条文，请换一种描述。</div></div>';
        return;
    }
    consultBtn.disabled = true;
    consultBtn.textContent = '咨询中...';
    consultResultContainer.innerHTML = '<div class="consult-result"><div class="consult-answer">正在结合候选法条分析...</div></div>';
    try {
        const prompt = `用户情况：\n${question}\n\n候选民法典条文：\n${formatCandidatePrompt(candidates)}\n\n请只基于候选条文回答：1. 可能相关的法律关系；2. 相关民法典条款及理由；3. 用户可关注的风险点。必须明确列出相关条号，不得编造候选外法条。`;
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: '你是民法典咨询助手。只能基于用户提供的候选民法典条文回答，不能编造法条。回答为普通文本。' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 1800
            })
        });
        if (!response.ok) throw new Error('API请求失败');
        const data = await response.json();
        const answer = data.choices[0].message.content.replace(/\*\*/g, '').replace(/`/g, '').trim();
        renderConsultAnswer(answer, findArticlesInAnswer(answer, candidates));
    } catch (error) {
        consultResultContainer.innerHTML = `<div class="consult-result"><div class="consult-answer">咨询失败：${escapeHtml(error.message)}</div></div>`;
    } finally {
        consultBtn.disabled = false;
        consultBtn.textContent = 'AI咨询';
    }
}

document.getElementById('searchBtn').addEventListener('click', renderSearch);
document.getElementById('clearBtn').addEventListener('click', () => { searchInput.value = ''; renderFullText(); });
consultBtn.addEventListener('click', askCivilCodeAi);
searchInput.addEventListener('keydown', event => { if (event.key === 'Enter') renderSearch(); });

renderToc();
renderFullText();
