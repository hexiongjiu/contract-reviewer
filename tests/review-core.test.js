const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const core = require('../js/review-core.js');

test('normalizes structured review output and Chinese severity aliases', () => {
    const result = core.normalizeReviewResult('```json\n' + JSON.stringify({
        contractType: '采购合同',
        reviewedFrom: '乙方',
        summary: '存在付款风险',
        issues: [{
            clauseId: 'payment-1',
            originalText: '甲方在验收后90日付款。',
            category: '付款',
            riskLevel: '高风险',
            party: '乙方',
            confidence: 1.4,
            issue: '付款期限过长',
            reason: '占用资金时间较长',
            advice: '缩短付款期限',
            revisedText: '甲方应在验收后30日内付款。'
        }]
    }) + '\n```');

    assert.equal(result.issues.length, 1);
    assert.equal(result.issues[0].severity, 'high');
    assert.equal(result.issues[0].confidence, 1);
    assert.equal(result.issues[0].replacementText, '甲方应在验收后30日内付款。');
    assert.equal(result.issues[0].decision, 'pending');
});

test('drops incomplete issues and assigns safe defaults', () => {
    const result = core.normalizeReviewResult({
        issues: [
            { problem: '有效问题', suggestion: '有效建议' },
            { problem: '缺少建议' }
        ]
    });
    assert.equal(result.issues.length, 1);
    assert.equal(result.issues[0].category, '其他');
    assert.equal(result.issues[0].severity, 'medium');
});

test('matches clauses despite punctuation and whitespace differences', () => {
    const score = core.overlapScore('甲方应在验收后 90 日内付款。', '甲方应在验收后90日内付款');
    assert.ok(score > 0.9);
});

test('extracts JSON after a thinking block or surrounding prose', () => {
    const afterThinking = core.normalizeReviewResult('<think>先分析合同风险</think>\n```json\n{"issues":[{"problem":"风险","suggestion":"修改"}]}\n```');
    assert.equal(afterThinking.issues.length, 1);

    const embedded = core.normalizeReviewResult('以下是结果：\n{"summary":"完成","issues":[{"problem":"问题","suggestion":"建议"}]}\n请查收');
    assert.equal(embedded.summary, '完成');
});

test('extracts optimized paragraph from JSON and legacy plain text', () => {
    assert.equal(core.extractOptimizedText('{"optimizedText":"甲方应在30日内付款。"}'), '甲方应在30日内付款。');
    assert.equal(core.extractOptimizedText('优化后：甲方应在15日内付款。'), '甲方应在15日内付款。');
    assert.throws(() => core.extractOptimizedText('{"optimizedText":'), /有效优化内容/);
});

test('normalizes key terms and keeps only explicit valid obligation dates', () => {
    const result = core.normalizeReviewResult({
        issues: [],
        keyTerms: [{ category: '金额', label: '合同总价', value: '100万元', confidence: 0.9 }],
        obligations: [
            { party: '甲方', action: '支付首付款', dueDate: '2026-10-01', amount: '30万元' },
            { party: '乙方', action: '交付成果', dueDate: '验收后30日', dueRule: '收到首付款后30日内' }
        ]
    });
    assert.equal(result.keyTerms[0].value, '100万元');
    assert.equal(result.obligations[0].dueDate, '2026-10-01');
    assert.equal(result.obligations[1].dueDate, '');
    assert.equal(result.obligations[1].dueRule, '收到首付款后30日内');
});

test('external application script is linked and has valid JavaScript syntax', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    assert.match(html, /<script src="js\/app\.js"><\/script>/);
    assert.doesNotMatch(html, /<script>([\s\S]*?)<\/script>/);
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
    assert.doesNotThrow(() => new Function(source));
});
