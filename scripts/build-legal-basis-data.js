const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const reviewRoot = path.join(projectRoot, 'legal-source-review');
const officialRoot = path.join(reviewRoot, 'official-pages');
const sourceManifest = JSON.parse(fs.readFileSync(path.join(reviewRoot, 'sources.json'), 'utf8'));

const INCLUDED_SOURCE_IDS = [
    'civil-code-contract-general-2023',
    'labor-contract-law-2012',
    'labor-law-2018',
    'company-law-2023',
    'electronic-signature-law-2019',
    'pipl-2021',
    'data-security-law-2021',
    'copyright-law-2020',
    'trademark-law-2019',
    'civil-code-general-2022',
    'civil-code-security-2020',
    'sales-contract-2020',
    'labor-dispute-1-2020',
    'labor-dispute-2-2025',
    'company-law-temporal-2024',
    'construction-contract-1-2020',
    'construction-contract-2-2026',
    'technology-contract-2020',
    'copyright-civil-disputes-2026',
    'ip-punitive-damages-2026',
    'company-law-article-88-nonretroactive-2024',
    'large-sme-third-party-payment-2024',
    'prepaid-consumption-2025',
    'facial-recognition-2021'
];

const EXPECTED_MINIMUM_ARTICLES = {
    'civil-code-contract-general-2023': 69,
    'labor-contract-law-2012': 98,
    'labor-law-2018': 107,
    'company-law-2023': 266,
    'electronic-signature-law-2019': 36,
    'pipl-2021': 74,
    'data-security-law-2021': 55,
    'copyright-law-2020': 67,
    'trademark-law-2019': 73,
    'civil-code-general-2022': 39,
    'civil-code-security-2020': 71,
    'sales-contract-2020': 30,
    'labor-dispute-1-2020': 54,
    'labor-dispute-2-2025': 21,
    'company-law-temporal-2024': 8,
    'construction-contract-1-2020': 45,
    'construction-contract-2-2026': 23,
    'technology-contract-2020': 46,
    'copyright-civil-disputes-2026': 28,
    'ip-punitive-damages-2026': 8,
    'prepaid-consumption-2025': 27,
    'facial-recognition-2021': 16
};

const sourceOverrides = {
    'sales-contract-2020': 'official-pages/20a-买卖合同司法解释-2020修正.html',
    'technology-contract-2020': 'official-pages/18c-技术合同司法解释-2020修正.html'
};

function decodeHtmlEntities(value) {
    const named = {
        amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
        ensp: ' ', emsp: ' ', middot: '·', ldquo: '“', rdquo: '”',
        lsquo: '‘', rsquo: '’', times: '×'
    };
    return value
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
        .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
        .replace(/&([a-z]+);/gi, (match, name) => Object.prototype.hasOwnProperty.call(named, name.toLowerCase()) ? named[name.toLowerCase()] : match);
}

function htmlToText(html) {
    return decodeHtmlEntities(String(html || ''))
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<script\b[\s\S]*?<\/script>/gi, '')
        .replace(/<style\b[\s\S]*?<\/style>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\r/g, '')
        .replace(/[\t\u00a0\u3000]+/g, ' ')
        .replace(/ *\n */g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function extractPrimaryHtmlText(html) {
    const markers = [
        /<div[^>]+(?:id=["']zoom["']|class=["'][^"']*txt_txt[^"']*["'])[^>]*>/i,
        /<div[^>]+class=["'][^"']*(?:TRS_Editor|article-content|content_area)[^"']*["'][^>]*>/i
    ];
    for (const marker of markers) {
        const match = marker.exec(html);
        if (!match) continue;
        const start = match.index + match[0].length;
        const endCandidates = [
            html.indexOf('<div class="txt_etr"', start),
            html.indexOf('<div class="share"', start),
            html.indexOf('责任编辑', start),
            html.indexOf('<!--内容结束', start)
        ].filter(index => index > start);
        const end = endCandidates.length ? Math.min(...endCandidates) : html.length;
        return htmlToText(html.slice(start, end));
    }
    return htmlToText(html);
}

function normalizePdfLayoutText(value) {
    const logicalLines = [];
    String(value || '').replace(/\r/g, '').replace(/\f/g, '\n').split('\n').forEach(line => {
        if (!line.trim()) return;
        const content = line.trim();
        // pdftotext -layout keeps paragraph starts indented, while visual-line
        // continuations begin at column zero. Join only those soft wraps.
        if (!/^\s/.test(line) && logicalLines.length) logicalLines[logicalLines.length - 1] += content;
        else logicalLines.push(content);
    });
    return logicalLines.join('\n');
}

function readSourceText(source, relativeFile) {
    const absoluteFile = path.join(reviewRoot, relativeFile);
    if (!fs.existsSync(absoluteFile)) throw new Error(`${source.id}: 缺少来源文件 ${relativeFile}`);
    if (/\.pdf$/i.test(absoluteFile)) {
        const tempText = path.join(os.tmpdir(), `contract-reviewer-${source.id}.txt`);
        execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', absoluteFile, tempText]);
        const text = normalizePdfLayoutText(fs.readFileSync(tempText, 'utf8'));
        fs.unlinkSync(tempText);
        return text;
    }
    return extractPrimaryHtmlText(fs.readFileSync(absoluteFile, 'utf8'));
}

function chineseArticleNumber(value) {
    const digits = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
    const units = { 十: 10, 百: 100, 千: 1000, 万: 10000 };
    let result = 0;
    let section = 0;
    let number = 0;
    for (const char of value) {
        if (Object.prototype.hasOwnProperty.call(digits, char)) number = digits[char];
        else if (char === '十' || char === '百' || char === '千') {
            section += (number || 1) * units[char];
            number = 0;
        } else if (char === '万') {
            result += (section + number) * 10000;
            section = 0;
            number = 0;
        }
    }
    return result + section + number;
}

function trimPageTail(text) {
    const tailMarkers = ['相关链接：', '责任编辑：', '【关闭窗口】', '打印本页', '扫一扫在手机打开当前页'];
    let end = text.length;
    const firstArticleIndex = text.search(/(?:^|\n)\s*第[零〇一二两三四五六七八九十百千万]+条/);
    const searchStart = Math.max(0, firstArticleIndex);
    tailMarkers.forEach(marker => {
        const index = text.indexOf(marker, searchStart);
        if (index >= 0) end = Math.min(end, index);
    });
    // Some official sites keep navigation/news/footer blocks inside the same
    // content container. Only treat standalone lines as terminators so that
    // ordinary statutory wording is never cut by a coincidental phrase.
    const standaloneTail = /(?:^|\n)\s*(?:相关链接：?|新闻链接：?|网站链接|关闭|上一篇|下一篇|联系我们|【?返回顶部】?)\s*(?:\n|$)/gm;
    standaloneTail.lastIndex = searchStart;
    const standaloneMatch = standaloneTail.exec(text);
    if (standaloneMatch) end = Math.min(end, standaloneMatch.index);
    return text.slice(0, end).trim();
}

function parseStructuralHeading(line) {
    const value = String(line || '').replace(/\s+/g, ' ').trim();
    let match = value.match(/^(第[零〇一二两三四五六七八九十百千万]+([编章节])\s*.+)$/);
    if (match) return { level: match[2], text: match[1] };
    match = value.match(/^([一二三四五六七八九十百]+、\s*[^。；：]{2,40})$/);
    if (match) return { level: '分组', text: match[1] };
    match = value.match(/^([（(][一二三四五六七八九十百]+[）)]\s*[^。；：]{2,40})$/);
    if (match) return { level: '子分组', text: match[1] };
    return null;
}

function splitArticles(source, rawText) {
    const text = trimPageTail(rawText)
        .replace(/\r/g, '')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n');
    // 部分官方页面把“第一条”与正文直接相连，因此这里只要求条号位于行首。
    const tokenRegex = /(^|\n)\s*(第([零〇一二两三四五六七八九十百千万]+)条)/g;
    const tokens = [];
    let match;
    while ((match = tokenRegex.exec(text)) !== null) {
        tokens.push({ articleNo: match[2], number: chineseArticleNumber(match[3]), start: match.index + match[1].length, bodyStart: tokenRegex.lastIndex });
    }

    const monotonic = [];
    tokens.forEach(token => {
        if (!monotonic.length || token.number === monotonic[monotonic.length - 1].number + 1) monotonic.push(token);
        else if (token.number === 1 && monotonic.length === 0) monotonic.push(token);
    });
    const selected = monotonic.length >= 2 ? monotonic : tokens;
    if (!selected.length) {
        const body = text.replace(/^.*?(批复|规定|解释)\s*/s, '').trim();
        if (body.length < 40) throw new Error(`${source.id}: 未找到可用正文`);
        return [{ articleNo: '全文', articleNumber: 0, text: body }];
    }

    const hierarchy = { 编: '', 章: '', 节: '', 分组: '', 子分组: '' };
    let hierarchyScanStart = 0;
    return selected.map((token, index) => {
        const beforeArticle = text.slice(hierarchyScanStart, token.start);
        const linesBefore = beforeArticle.split('\n');
        const trailingHeadings = [];
        for (let lineIndex = linesBefore.length - 1; lineIndex >= 0; lineIndex -= 1) {
            if (!linesBefore[lineIndex].trim()) continue;
            const heading = parseStructuralHeading(linesBefore[lineIndex]);
            if (!heading) break;
            trailingHeadings.unshift(heading);
        }
        trailingHeadings.forEach(heading => {
            const level = heading.level;
            hierarchy[level] = heading.text;
            if (level === '编') { hierarchy.章 = ''; hierarchy.节 = ''; hierarchy.分组 = ''; hierarchy.子分组 = ''; }
            if (level === '章') { hierarchy.节 = ''; hierarchy.分组 = ''; hierarchy.子分组 = ''; }
            if (level === '节') { hierarchy.分组 = ''; hierarchy.子分组 = ''; }
            if (level === '分组') hierarchy.子分组 = '';
        });
        hierarchyScanStart = token.start;
        const end = index + 1 < selected.length ? selected[index + 1].start : text.length;
        const bodyLines = text.slice(token.start, end).split('\n');
        while (bodyLines.length && !bodyLines[bodyLines.length - 1].trim()) bodyLines.pop();
        while (bodyLines.length && parseStructuralHeading(bodyLines[bodyLines.length - 1])) bodyLines.pop();
        const body = bodyLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
        return {
            articleNo: token.articleNo,
            articleNumber: token.number,
            path: [hierarchy.编, hierarchy.章, hierarchy.节, hierarchy.分组, hierarchy.子分组].filter(Boolean).join(' / '),
            text: body
        };
    }).filter(article => article.text.length >= article.articleNo.length + 2);
}

function buildDocument(source) {
    const relativeFile = sourceOverrides[source.id] || source.localFile;
    const rawText = readSourceText(source, relativeFile);
    const articles = splitArticles(source, rawText).map(article => {
        // 法释〔2025〕12号废止了法释〔2020〕26号第三十二条第一款，库内仅保留仍有效的第二款。
        if (source.id === 'labor-dispute-1-2020' && article.articleNo === '第三十二条') {
            const paragraphs = article.text.split(/\n+/).map(value => value.trim()).filter(Boolean);
            return {
                ...article,
                text: `第三十二条（第一款已废止，以下为现行保留内容）\n${paragraphs.slice(1).join('\n')}`,
                partialRepealNote: '第一款已被法释〔2025〕12号废止'
            };
        }
        return article;
    });
    const minimum = EXPECTED_MINIMUM_ARTICLES[source.id] || 1;
    if (articles.length < minimum) throw new Error(`${source.id}: 仅解析出 ${articles.length} 条，预期至少 ${minimum} 条`);
    return {
        id: source.id,
        title: source.title,
        authority: source.authority,
        documentNo: source.documentNo || '',
        version: source.version || '',
        effectiveFrom: source.effectiveFrom,
        effectiveTo: source.effectiveTo,
        status: source.status,
        url: source.url,
        localFile: relativeFile,
        layer: source.layer,
        tags: source.tags || [],
        documentType: source.title.startsWith('最高人民法院') ? 'judicial_interpretation' : 'law',
        articleCount: articles.length,
        articles: articles.map(article => ({
            id: `${source.id}:${article.articleNo}`,
            sourceId: source.id,
            lawTitle: source.title,
            articleNo: article.articleNo,
            articleNumber: article.articleNumber,
            category: source.layer,
            tags: source.tags || [],
            documentType: source.title.startsWith('最高人民法院') ? 'judicial_interpretation' : 'law',
            documentNo: source.documentNo || '',
            version: source.version || '',
            effectiveFrom: source.effectiveFrom,
            effectiveTo: source.effectiveTo,
            sourceUrl: source.url,
            path: article.path || '',
            text: article.text,
            ...(article.partialRepealNote ? { partialRepealNote: article.partialRepealNote } : {})
        }))
    };
}

const sourceById = new Map(sourceManifest.sources.map(source => [source.id, source]));
const documents = INCLUDED_SOURCE_IDS.map(id => {
    const source = sourceById.get(id);
    if (!source) throw new Error(`sources.json 缺少 ${id}`);
    if (source.status === 'promulgated_not_effective') throw new Error(`${id}: 尚未生效文件不得进入现行依据库`);
    return buildDocument(source);
});
const articles = documents.flatMap(document => document.articles);
const payload = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    reviewedAt: sourceManifest.reviewedAt,
    documentCount: documents.length,
    articleCount: articles.length,
    documents: documents.map(({ articles: ignored, ...document }) => document),
    articles
};
const output = `// 由 scripts/build-legal-basis-data.js 根据已归档官方文本生成，请勿手工编辑。\nwindow.LEGAL_BASIS_DATA = ${JSON.stringify(payload)};\n`;
fs.writeFileSync(path.join(projectRoot, 'js', 'legal-basis-data.js'), output, 'utf8');

console.log(`Generated ${documents.length} documents / ${articles.length} articles`);
documents.forEach(document => console.log(`${String(document.articleCount).padStart(3)}  ${document.title}`));
