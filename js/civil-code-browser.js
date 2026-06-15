(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.CivilCodeBrowser = factory();
    }
})(typeof window !== 'undefined' ? window : globalThis, function () {
    function normalize(value) {
        return String(value || '').replace(/[\s\u3000]+/g, '').toLowerCase();
    }

    function getOrCreate(collection, title, factory) {
        let item = collection.find(entry => entry.title === title);
        if (!item) {
            item = factory();
            collection.push(item);
        }
        return item;
    }

    function slug(value) {
        return encodeURIComponent(String(value || '').replace(/\s+/g, '-'));
    }

    function buildCivilCodeOutline(articles) {
        const books = [];
        (articles || []).forEach(article => {
            const book = getOrCreate(books, article.book || '未分编', () => ({ title: article.book || '未分编', id: slug(article.book || '未分编'), subbooks: [], chapters: [], articleCount: 0 }));
            book.articleCount++;
            const chapterParent = article.subbook
                ? getOrCreate(book.subbooks, article.subbook, () => ({ title: article.subbook, id: slug(`${article.book}-${article.subbook}`), chapters: [], articleCount: 0 }))
                : book;
            chapterParent.articleCount++;
            const chapter = getOrCreate(chapterParent.chapters, article.chapter || '未分章', () => ({ title: article.chapter || '未分章', id: slug(`${article.book}-${article.subbook}-${article.chapter}`), sections: [], articles: [], articleCount: 0 }));
            chapter.articleCount++;
            const parent = article.section
                ? getOrCreate(chapter.sections, article.section, () => ({ title: article.section, id: slug(`${article.book}-${article.subbook}-${article.chapter}-${article.section}`), articles: [], articleCount: 0 }))
                : chapter;
            parent.articleCount++;
            parent.articles.push(article);
        });
        return books;
    }

    function getArticleAnchor(articleNo) {
        return `article-${encodeURIComponent(String(articleNo || ''))}`;
    }

    function chineseToArabic(input) {
        const digits = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
        const units = { 十: 10, 百: 100, 千: 1000, 万: 10000 };
        let result = 0;
        let section = 0;
        let number = 0;
        for (const char of String(input || '')) {
            if (Object.prototype.hasOwnProperty.call(digits, char)) {
                number = digits[char];
            } else if (char === '十' || char === '百' || char === '千') {
                section += (number || 1) * units[char];
                number = 0;
            } else if (char === '万') {
                result += (section + number) * units[char];
                section = 0;
                number = 0;
            }
        }
        return result + section + number;
    }

    function getConsultationCandidates(articles, question, limit) {
        const legalTerms = ['不可抗力', '违约责任', '格式条款', '免责条款', '解除合同', '合同解除', '租赁', '押金', '定金', '保证金', '借款', '买卖', '赔偿', '侵权', '通知', '履行'];
        const terms = normalize(question).match(/[\u4e00-\u9fa5]{2,8}/g) || [];
        legalTerms.forEach(term => {
            if (String(question || '').includes(term)) terms.push(term);
        });
        const q = normalize(question);
        return (articles || []).map(article => {
            const haystack = normalize(`${article.articleNo} ${article.book} ${article.subbook} ${article.chapter} ${article.section} ${article.text}`);
            let score = haystack.includes(q) ? 20 : 0;
            terms.forEach(term => {
                if (haystack.includes(normalize(term))) score += legalTerms.includes(term) ? 20 : term.length;
            });
            if (article.book === '第三编　合同') score += 3;
            return { ...article, score };
        }).filter(article => article.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit || 15);
    }

    function searchCivilCodeArticles(articles, query) {
        const q = normalize(query);
        if (!q) return articles || [];
        return (articles || []).filter(article => {
            const haystack = normalize(`${article.articleNo} ${article.book} ${article.subbook} ${article.chapter} ${article.section} ${article.text}`);
            return haystack.includes(q);
        });
    }

    return { buildCivilCodeOutline, searchCivilCodeArticles, getArticleAnchor, getConsultationCandidates, chineseToArabic };
});
