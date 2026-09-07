const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const evidence = require('../js/legal-basis-evidence.js');
const projectRoot = path.join(__dirname, '..');

function loadBrowserData(file, property) {
    const context = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(projectRoot, file), 'utf8'), context);
    return context.window[property];
}

const legalData = loadBrowserData('js/legal-basis-data.js', 'LEGAL_BASIS_DATA');
const civilArticles = loadBrowserData('js/civil-code-data.js', 'CIVIL_CODE_ARTICLES');

test('integrates official current-law corpus with stable unique IDs', () => {
    assert.equal(legalData.documentCount, 24);
    assert.equal(legalData.articleCount, 1273);
    assert.equal(new Set(legalData.articles.map(article => article.id)).size, legalData.articleCount);
    assert.ok(legalData.documents.every(document => document.status !== 'promulgated_not_effective'));
    assert.ok(!legalData.documents.some(document => document.id === 'trademark-law-2026'));
    assert.ok(legalData.documents.some(document => document.documentType === 'law'));
    assert.ok(legalData.documents.some(document => document.documentType === 'judicial_interpretation'));
    assert.ok(legalData.articles.every(article => article.effectiveFrom));
});

test('stores exactly one vector record per legal article', () => {
    const meta = JSON.parse(fs.readFileSync(path.join(projectRoot, 'server/vector-data/legal-vector-meta.json'), 'utf8'));
    const expectedArticleCount = legalData.articleCount + civilArticles.length;
    const vectorBytes = fs.statSync(path.join(projectRoot, 'server/vector-data/legal-vectors.f32')).size;
    assert.equal(meta.count, expectedArticleCount);
    assert.equal(meta.ids.length, expectedArticleCount);
    assert.equal(new Set(meta.ids).size, expectedArticleCount);
    assert.equal(vectorBytes, expectedArticleCount * meta.dimensions * 4);
});

test('keeps document name with article number to avoid duplicate-number ambiguity', () => {
    const firstArticles = legalData.articles.filter(article => article.articleNo === '第一条');
    assert.ok(firstArticles.length > 15);
    assert.equal(new Set(firstArticles.map(article => article.id)).size, firstArticles.length);
    assert.ok(firstArticles.every(article => article.lawTitle && article.sourceUrl));
});

test('removes the repealed first paragraph of labor-dispute interpretation article 32', () => {
    const article = legalData.articles.find(item => item.id === 'labor-dispute-1-2020:第三十二条');
    assert.ok(article);
    assert.match(article.text, /第一款已废止/);
    assert.doesNotMatch(article.text, /已经依法享受养老保险待遇/);
    assert.match(article.text, /停薪留职人员/);
});

test('software-development issues recall technology, copyright, and data rules', () => {
    const all = evidence.getAllArticles(civilArticles, legalData);
    const matches = evidence.matchLegalBasisArticles(all, {
        sourceText: '乙方开发软件并交付源代码，处理用户个人信息，成果著作权归属不明。',
        problem: '知识产权和数据处理责任约定不清',
        suggestion: '明确软件著作权、源代码交付、委托处理和数据安全义务'
    }, 30, { contractType: '软件开发合同' });
    const sources = new Set(matches.map(match => match.sourceId));
    assert.ok(sources.has('technology-contract-2020') || sources.has('copyright-law-2020'));
    assert.ok(sources.has('pipl-2021') || sources.has('data-security-law-2021'));
});

test('layered retrieval requires a real issue match and keeps source diversity', () => {
    const all = evidence.getAllArticles(civilArticles, legalData);
    const unrelated = evidence.matchLegalBasisArticles(all, {
        sourceText: '双方保持友好合作。', problem: '措辞一般', suggestion: '无'
    }, 16, { contractType: '软件开发合同' });
    assert.equal(unrelated.length, 0);

    const software = evidence.matchLegalBasisArticles(all, {
        sourceText: '乙方开发软件并交付源代码，处理用户个人信息，成果著作权归属不明。',
        problem: '知识产权和数据处理责任约定不清',
        suggestion: '明确软件著作权、源代码交付、委托处理和数据安全义务'
    }, 16, { contractType: '软件开发合同' });
    assert.ok(new Set(software.map(article => article.sourceId)).size >= 4);
    assert.ok(software.every(article => article.matchedTerms.length > 0));
    assert.ok(software.every(article => ['contract', 'topic', 'cross-topic'].includes(article.routeTier)));
});

test('topic routing excludes payment rules from an unrelated labor issue', () => {
    const all = evidence.getAllArticles(civilArticles, legalData);
    const matches = evidence.matchLegalBasisArticles(all, {
        sourceText: '离职后五年内不得从事任何同类工作，不支付补偿。',
        problem: '竞业限制期限和经济补偿不合法',
        suggestion: '缩短竞业限制并约定经济补偿'
    }, 12, { contractType: '劳动合同' });
    assert.ok(matches.some(article => article.sourceId === 'labor-contract-law-2012'));
    assert.ok(matches.some(article => article.sourceId === 'labor-dispute-1-2020' || article.sourceId === 'labor-dispute-2-2025'));
    assert.ok(!matches.some(article => article.sourceId === 'large-sme-third-party-payment-2024'));
});

test('topic concepts can route beyond the selected contract type', () => {
    const all = evidence.getAllArticles(civilArticles, legalData);
    const matches = evidence.matchLegalBasisArticles(all, {
        sourceText: '供应商可以收集并向境外提供用户身份证和人脸信息。',
        problem: '敏感个人信息及跨境处理缺少合规条件',
        suggestion: '明确单独同意和个人信息出境义务'
    }, 12, { contractType: '采购合同' });
    assert.ok(matches.some(article => article.sourceId === 'pipl-2021'));
    assert.ok(matches.some(article => article.sourceId === 'data-security-law-2021' || article.sourceId === 'facial-recognition-2021'));
});

test('narrow special rules require their factual trigger', () => {
    const all = evidence.getAllArticles(civilArticles, legalData);
    const ordinaryPayment = evidence.matchLegalBasisArticles(all, {
        sourceText: '验收合格后九十日付款。', problem: '付款期限过长', suggestion: '缩短付款期限'
    }, 18, { contractType: '采购合同' });
    assert.ok(!ordinaryPayment.some(article => article.sourceId === 'large-sme-third-party-payment-2024'));
    assert.ok(ordinaryPayment.some(article => article.id === 'civil-code:第六百二十八条'));

    const backToBackPayment = evidence.matchLegalBasisArticles(all, {
        sourceText: '甲方收到第三方付款后再向乙方支付合同款。', problem: '以第三方付款作为付款前提', suggestion: '删除背靠背付款条件'
    }, 18, { contractType: '采购合同' });
    assert.ok(backToBackPayment.some(article => article.sourceId === 'large-sme-third-party-payment-2024'));
});

test('common contract-risk wording reaches curated core-law anchors', () => {
    const all = evidence.getAllArticles(civilArticles, legalData);
    const cases = [
        { problem: '主体资质不明', expected: 'civil-code:第六十一条' },
        { problem: '通知送达约定不清', expected: 'civil-code:第五百零九条' },
        { problem: '甲方可以单方调整价格', expected: 'civil-code:第五百四十三条' },
        { problem: '不可抗力范围过宽', expected: 'civil-code:第五百九十条' }
    ];
    cases.forEach(item => {
        const matches = evidence.matchLegalBasisArticles(all, {
            sourceText: item.problem,
            problem: item.problem,
            suggestion: '明确适用条件和程序'
        }, 16, { contractType: '服务合同' });
        assert.ok(matches.some(article => article.id === item.expected), `${item.problem} should reach ${item.expected}`);
    });
});

test('keeps a clearly labelled high-confidence local fallback when AI selects nothing', () => {
    const all = evidence.getAllArticles(civilArticles, legalData);
    const candidates = evidence.matchLegalBasisArticles(all, {
        sourceText: '通知送达地址未约定',
        problem: '通知送达约定不清',
        suggestion: '明确书面通知和到达规则'
    }, 16, { contractType: '服务合同' });
    const fallback = evidence.getLocalFallbackSelection(candidates, 3);
    assert.ok(fallback.length > 0);
    assert.ok(fallback.every(article => article.verificationStatus === 'local'));
    assert.ok(fallback.every(article => article.relevance === 'direct'));
    assert.match(evidence.renderEvidence(fallback), /本地候选未复核/);
});

test('distinguishes valid empty AI review from malformed or failed review output', () => {
    assert.deepEqual(evidence.parseVerifiedSelection('{"selected":[]}', []), []);
    assert.throws(() => evidence.parseVerifiedSelection('', []), /AI复核返回为空/);
    assert.throws(() => evidence.parseVerifiedSelection('非JSON内容', []), /不是有效JSON/);
    assert.throws(() => evidence.parseVerifiedSelection('{"items":[]}', []), /selected数组/);
});

test('vector query excludes drafting advice and hybrid merge promotes semantic IP rules', () => {
    const all = evidence.getAllArticles(civilArticles, legalData);
    const issue = {
        category: '知识产权',
        sourceText: '源代码归乙方所有，甲方仅获得有限使用许可。',
        problem: '未明确许可权利种类、地域、期限和是否独占。',
        suggestion: '如有迟延应支付违约金'
    };
    assert.doesNotMatch(evidence.buildVectorQuery(issue), /违约金|迟延支付/);
    const lexical = evidence.matchLegalBasisArticles(all, { ...issue, suggestion: '' }, 28, { contractType: '软件开发合同' });
    const merged = evidence.mergeVectorMatches(all, lexical, [
        { id: 'copyright-law-2020:第二十六条', score: 0.75 },
        { id: 'sales-contract-2020:第十八条', score: 0.51 }
    ], issue, 16, { contractType: '软件开发合同' });
    assert.ok(merged.slice(0, 3).some(article => article.id === 'copyright-law-2020:第二十六条'));
    assert.ok(!merged.some(article => article.id === 'sales-contract-2020:第十八条'));
});

test('semantic-only candidates cannot become unverified local legal conclusions', () => {
    const all = evidence.getAllArticles(civilArticles, legalData);
    const issue = {
        category: '争议解决',
        sourceText: '任何一方均可向乙方所在地人民法院起诉。',
        problem: '管辖地点对甲方不利。'
    };
    const merged = evidence.mergeVectorMatches(all, [], [
        { id: 'civil-code-contract-general-2023:第六条', score: 0.76 }
    ], issue, 16, { contractType: '软件开发合同' });
    assert.equal(merged[0].retrievalMode, 'vector');
    assert.equal(merged[0].relevance, 'supplemental');
    assert.deepEqual(evidence.getLocalFallbackSelection(merged, 3), []);
});

test('main page and legal library load the expanded corpus', () => {
    const index = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
    const library = fs.readFileSync(path.join(projectRoot, 'legal-library.html'), 'utf8');
    assert.match(index, /js\/legal-basis-data\.js/);
    assert.match(index, /js\/legal-basis-evidence\.js/);
    assert.match(index, /legal-library\.html/);
    assert.match(library, /js\/legal-library-page\.js/);
});

test('renders version or document number and effective date before each legal citation', () => {
    const article = legalData.articles.find(item => item.id === 'company-law-2023:第一条');
    const rendered = evidence.renderEvidence([{ ...article, reason: '测试' }]);
    assert.match(rendered, /2023修订｜2024-07-01施行/);
    assert.match(rendered, /AI已复核并采用/);
    assert.ok(rendered.indexOf('legal-effective-date') < rendered.indexOf('civil-code-article-title'));
});

test('uses the reachable Supreme Court Gazette link for labor-dispute interpretation II', () => {
    const document = legalData.documents.find(item => item.id === 'labor-dispute-2-2025');
    assert.equal(document.url, 'http://gongbao.court.gov.cn/Details/bb72019c45453f84d920bd6375573e.html');
});

test('normalizes Labor Law PDF soft wraps without splitting Chinese words', () => {
    const laborLaw = legalData.articles.filter(article => article.sourceId === 'labor-law-2018');
    assert.equal(laborLaw.length, 107);
    assert.match(laborLaw[0].text, /适应社会主义市场经济的劳动制度/);
    assert.match(laborLaw[0].text, /根据宪法，制定本法。/);
    assert.doesNotMatch(laborLaw[0].text, /中华人民共和国劳动法/);
    assert.doesNotMatch(laborLaw[0].text, /社\n+会主义|本\n+法/);
});

test('removes official-site navigation noise while retaining statute hierarchy and paragraphs', () => {
    const allText = legalData.articles.map(article => article.text).join('\n');
    assert.doesNotMatch(allText, /网站链接|新闻链接|京ICP备|上一篇|下一篇|Produced By CMS/);

    const copyrightLast = legalData.articles.find(article => article.id === 'copyright-law-2020:第六十七条');
    assert.equal(copyrightLast.text, '第六十七条 本法自1991年6月1日起施行。');
    assert.match(copyrightLast.path, /第六章\s*附\s*则/);

    const laborArticleTwo = legalData.articles.find(article => article.id === 'labor-law-2018:第二条');
    assert.match(laborArticleTwo.path, /第一章\s*总则/);
    assert.equal(laborArticleTwo.text.split('\n').length, 2);
});

test('retains judicial-interpretation numbered section headings', () => {
    const generalRule = legalData.articles.find(article => article.id === 'civil-code-contract-general-2023:第一条');
    const formation = legalData.articles.find(article => article.id === 'civil-code-contract-general-2023:第三条');
    const securityRight = legalData.articles.find(article => article.id === 'civil-code-security-2020:第三十七条');
    assert.match(generalRule.path, /一、\s*一般规定/);
    assert.match(formation.path, /二、\s*合同的订立/);
    assert.match(securityRight.path, /三、\s*关于担保物权/);
    assert.match(securityRight.path, /（一）\s*担保合同与担保物权的效力/);
});
