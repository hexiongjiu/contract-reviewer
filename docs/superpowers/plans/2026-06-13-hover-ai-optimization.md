# Hover AI Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add paragraph-level AI optimization to the right-side contract original editor with hover trigger, AI preview, and confirmed replacement.

**Architecture:** Keep the feature in `index.html` to match the current single-file app. Add CSS for the floating button and modal, add small UI state variables, initialize hover handlers after Quill setup, and reuse the existing DeepSeek API key/model/status utilities.

**Tech Stack:** Static HTML, vanilla JavaScript, Quill, Mammoth.js, JSZip, DeepSeek chat completions API.

---

## File Structure

- Modify: `index.html`
  - Add styles for `.hover-optimize-btn` and `.optimization-modal-*` in the existing `<style>` block.
  - Add optimization state variables near existing globals.
  - Call `initHoverOptimization()` from `initQuillEditor()` after Quill content is pasted.
  - Add helper functions before `downloadEditedDoc()`.
  - Reset optimization state from `clearPreview()`.

No new runtime files are needed.

---

### Task 1: Add hover optimization UI styles and state

**Files:**
- Modify: `index.html:386-472`
- Modify: `index.html:609-620`

- [ ] **Step 1: Add CSS for floating button and preview modal**

Insert this CSS after the existing `.status.error` rule in `index.html`:

```css
        .hover-optimize-btn {
            position: fixed;
            z-index: 1000;
            display: none;
            padding: 6px 12px;
            border-radius: 16px;
            border: none;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.18);
        }

        .hover-optimize-btn:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(0,0,0,0.22);
        }

        .optimization-modal-mask {
            position: fixed;
            inset: 0;
            z-index: 2000;
            display: none;
            align-items: center;
            justify-content: center;
            background: rgba(0,0,0,0.45);
            padding: 20px;
        }

        .optimization-modal {
            width: min(900px, 96vw);
            max-height: 86vh;
            overflow-y: auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.25);
            padding: 20px;
        }

        .optimization-modal h3 {
            margin-bottom: 16px;
            color: #333;
        }

        .optimization-compare {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }

        .optimization-block {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            background: #fafafa;
            padding: 12px;
        }

        .optimization-block h4 {
            margin-bottom: 8px;
            font-size: 14px;
            color: #555;
        }

        .optimization-text {
            min-height: 120px;
            white-space: pre-wrap;
            line-height: 1.7;
            font-size: 14px;
            color: #333;
        }

        .optimization-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 18px;
        }

        .optimization-cancel-btn {
            background: #9e9e9e;
        }

        .optimization-apply-btn {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        }

        @media (max-width: 768px) {
            .optimization-compare {
                grid-template-columns: 1fr;
            }
        }
```

- [ ] **Step 2: Add optimization state variables**

Insert this after `let docxParagraphs = [];`:

```javascript
        let hoverOptimizeButton = null;
        let hoveredOptimizeParagraph = null;
        let pendingOptimizedText = '';
```

- [ ] **Step 3: Run a syntax smoke check**

Run: `python -m http.server 8080`

Expected: server starts without changing files. Open `http://localhost:8080` and confirm the page loads without console syntax errors.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add hover optimization UI shell"
```

---

### Task 2: Initialize paragraph hover button in Quill

**Files:**
- Modify: `index.html:783-818`
- Modify: `index.html` before `downloadEditedDoc()`

- [ ] **Step 1: Call hover initialization after Quill content is ready**

Change the end of `initQuillEditor(htmlContent)` from:

```javascript
            quillEditor.clipboard.dangerouslyPasteHTML(htmlContent);
            document.getElementById('downloadEditedBtn').disabled = false;
        }
```

to:

```javascript
            quillEditor.clipboard.dangerouslyPasteHTML(htmlContent);
            initHoverOptimization();
            document.getElementById('downloadEditedBtn').disabled = false;
        }
```

- [ ] **Step 2: Add hover initialization functions**

Insert this block before `async function downloadEditedDoc()`:

```javascript
        function initHoverOptimization() {
            if (!quillEditor) return;

            if (!hoverOptimizeButton) {
                hoverOptimizeButton = document.createElement('button');
                hoverOptimizeButton.type = 'button';
                hoverOptimizeButton.className = 'hover-optimize-btn';
                hoverOptimizeButton.textContent = 'AI优化';
                hoverOptimizeButton.addEventListener('click', optimizeHoveredParagraph);
                document.body.appendChild(hoverOptimizeButton);
            }

            const editor = quillEditor.root;
            editor.removeEventListener('mousemove', handleEditorMouseMove);
            editor.removeEventListener('mouseleave', hideHoverOptimizeButton);
            editor.addEventListener('mousemove', handleEditorMouseMove);
            editor.addEventListener('mouseleave', hideHoverOptimizeButton);
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
            hoverOptimizeButton.style.left = `${Math.min(rect.right + 8, window.innerWidth - 90)}px`;
            hoverOptimizeButton.style.top = `${Math.max(rect.top, 8)}px`;
            hoverOptimizeButton.style.display = 'block';
        }

        function hideHoverOptimizeButton() {
            if (hoverOptimizeButton) hoverOptimizeButton.style.display = 'none';
        }

        function getParagraphText(element) {
            return element ? element.textContent.replace(/\s+/g, ' ').trim() : '';
        }
```

- [ ] **Step 3: Manual test hover behavior**

Run: `python -m http.server 8080`

Expected:
- Upload a DOCX.
- Hover right-side editor paragraphs.
- `AI优化` appears near non-empty paragraphs.
- Moving outside the editor hides the button.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: show AI optimize button on paragraph hover"
```

---

### Task 3: Add issue matching and DeepSeek paragraph optimization

**Files:**
- Modify: `index.html` before `downloadEditedDoc()`

- [ ] **Step 1: Add normalized text matching helpers**

Insert this block after `getParagraphText(element)`:

```javascript
        function normalizeForMatch(text) {
            return (text || '').replace(/\s+/g, '').replace(/[，。；：、“”‘’（）()【】《》,.!?;:"'\[\]<>]/g, '').toLowerCase();
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
            if (!currentIssues || currentIssues.length === 0) return null;

            let bestIssue = null;
            let bestScore = 0;
            currentIssues.forEach(issue => {
                const combined = `${issue.problem || ''} ${issue.suggestion || ''}`;
                const score = calculateOverlapScore(text, combined);
                if (score > bestScore) {
                    bestScore = score;
                    bestIssue = issue;
                }
            });

            return bestScore >= 0.08 ? bestIssue : null;
        }
```

- [ ] **Step 2: Add AI optimization function**

Insert this after `findBestIssueForParagraph(text)`:

```javascript
        async function optimizeHoveredParagraph() {
            const apiKey = document.getElementById('apiKey').value.trim();
            const model = document.getElementById('model').value;
            const paragraph = hoveredOptimizeParagraph;
            const originalText = getParagraphText(paragraph);

            if (!apiKey) { updateStatus('❌ 请输入DeepSeek API Key', 'error'); return; }
            if (!quillEditor || !paragraph || !originalText) { updateStatus('❌ 请先选择需要优化的段落', 'error'); return; }

            const matchedIssue = findBestIssueForParagraph(originalText);
            const issueText = matchedIssue
                ? `相关审核问题：${matchedIssue.problem}\n相关修改建议：${matchedIssue.suggestion}`
                : '未匹配到左侧具体建议，请根据合同上下文优化该段。';

            hoverOptimizeButton.disabled = true;
            hoverOptimizeButton.textContent = '优化中...';
            updateStatus('🤖 正在优化当前段落...', 'info');

            try {
                const systemPrompt = `你是专业合同起草与审核专家。请只优化用户给出的单个合同段落。必须返回纯文本，只返回优化后的段落正文，不要解释，不要Markdown，不要编号，不要引号。`;
                const userPrompt = `合同上下文：\n${originalPlainText.substring(0, 6000)}\n\n${issueText}\n\n需要优化的原段落：\n${originalText}\n\n请在不改变核心商业含义的前提下，使该段更严谨、清晰、合法合规，并尽量吸收相关修改建议。`;

                const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                    body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], temperature: 0.3, max_tokens: 1200 })
                });

                if (!response.ok) throw new Error('API请求失败');
                const data = await response.json();
                const optimizedText = (data.choices[0].message.content || '').replace(/```[\s\S]*?```/g, '').replace(/^优化后[:：]?/i, '').trim();
                if (!optimizedText) throw new Error('AI未返回有效优化内容');

                pendingOptimizedText = optimizedText;
                showOptimizationPreview(originalText, optimizedText);
                updateStatus('✅ 段落优化完成，请确认是否应用', 'success');
            } catch (error) {
                updateStatus(`❌ 段落优化失败: ${error.message}`, 'error');
            } finally {
                hoverOptimizeButton.disabled = false;
                hoverOptimizeButton.textContent = 'AI优化';
            }
        }
```

- [ ] **Step 3: Manual test API error path**

Run: `python -m http.server 8080`

Expected:
- Leave API key empty.
- Upload DOCX, hover paragraph, click `AI优化`.
- Status shows `❌ 请输入DeepSeek API Key`.
- Paragraph text remains unchanged.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: optimize hovered paragraph with AI"
```

---

### Task 4: Add preview modal and confirmed replacement

**Files:**
- Modify: `index.html` before `downloadEditedDoc()`

- [ ] **Step 1: Add modal rendering and escaping helpers**

Insert this after `optimizeHoveredParagraph()`:

```javascript
        function ensureOptimizationModal() {
            let mask = document.getElementById('optimizationModalMask');
            if (mask) return mask;

            mask = document.createElement('div');
            mask.id = 'optimizationModalMask';
            mask.className = 'optimization-modal-mask';
            mask.innerHTML = `
                <div class="optimization-modal">
                    <h3>AI优化预览</h3>
                    <div class="optimization-compare">
                        <div class="optimization-block">
                            <h4>原文</h4>
                            <div id="optimizationOriginalText" class="optimization-text"></div>
                        </div>
                        <div class="optimization-block">
                            <h4>优化后</h4>
                            <div id="optimizationNewText" class="optimization-text"></div>
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

        function showOptimizationPreview(originalText, optimizedText) {
            const mask = ensureOptimizationModal();
            document.getElementById('optimizationOriginalText').textContent = originalText;
            document.getElementById('optimizationNewText').textContent = optimizedText;
            mask.style.display = 'flex';
        }

        function closeOptimizationPreview() {
            const mask = document.getElementById('optimizationModalMask');
            if (mask) mask.style.display = 'none';
            pendingOptimizedText = '';
        }
```

- [ ] **Step 2: Add confirmed Quill replacement**

Insert this after `closeOptimizationPreview()`:

```javascript
        function applyOptimizedParagraph() {
            if (!quillEditor || !hoveredOptimizeParagraph || !pendingOptimizedText) {
                updateStatus('❌ 没有可应用的优化内容', 'error');
                return;
            }

            const blot = Quill.find(hoveredOptimizeParagraph);
            if (!blot) {
                updateStatus('❌ 无法定位当前段落', 'error');
                return;
            }

            const index = quillEditor.getIndex(blot);
            const length = Math.max(0, blot.length() - 1);
            quillEditor.deleteText(index, length, 'user');
            quillEditor.insertText(index, pendingOptimizedText, 'user');
            closeOptimizationPreview();
            hideHoverOptimizeButton();
            updateStatus('✅ 已应用AI优化，可下载修改后合同', 'success');
        }
```

- [ ] **Step 3: Manual test preview and cancel**

Run: `python -m http.server 8080`

Expected:
- With a valid API key, upload and review a DOCX.
- Hover a paragraph and click `AI优化`.
- Preview modal shows original and optimized text.
- Click `取消`.
- Right-side paragraph remains unchanged.

- [ ] **Step 4: Manual test apply**

Run: `python -m http.server 8080`

Expected:
- Repeat optimization.
- Click `应用`.
- Only the hovered paragraph text changes.
- Other paragraphs keep their original text and formatting structure.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: preview and apply AI paragraph optimization"
```

---

### Task 5: Reset optimization UI and verify edited DOCX export

**Files:**
- Modify: `index.html:1210-1228`

- [ ] **Step 1: Reset optimization state in `clearPreview()`**

Change the middle of `clearPreview()` from:

```javascript
            currentDocBlob = null;
            quillOriginalParagraphs = [];
            htmlToDocxMap = [];
            docxParagraphs = [];
            qaHistory = [];
```

to:

```javascript
            currentDocBlob = null;
            quillOriginalParagraphs = [];
            htmlToDocxMap = [];
            docxParagraphs = [];
            qaHistory = [];
            hoveredOptimizeParagraph = null;
            pendingOptimizedText = '';
            hideHoverOptimizeButton();
            closeOptimizationPreview();
```

- [ ] **Step 2: Run full manual regression**

Run: `python -m http.server 8080`

Expected:
- Upload DOCX.
- Run contract review.
- Hover right-side paragraph and optimize it.
- Preview appears.
- Apply optimized text.
- Click `下载修改后合同`.
- Open downloaded DOCX and confirm the optimized paragraph is present.
- Click `清空预览` and confirm the floating button/modal are hidden and state is reset.

- [ ] **Step 3: Check git diff for unintended changes**

Run: `git diff -- index.html`

Expected: only hover optimization CSS, state, functions, initialization, and reset changes are present.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "fix: reset AI optimization UI state"
```

---

## Plan Self-Review

Spec coverage:
- Hover button: Task 1 and Task 2.
- Combine matched left suggestions with context: Task 3.
- Preview before applying: Task 4.
- Paragraph-only scope: Task 2 targets `p, h1, h2, h3, li`; no table-specific or multi-paragraph logic is added.
- Export through existing edited DOCX flow: Task 5 regression verifies `downloadEditedDoc()` still handles changed Quill paragraphs.
- Error handling: Task 3 validates no API key, missing paragraph, API failure, and empty AI response. Task 4 validates failed application state.

Placeholder scan: no TBD/TODO/fill-in placeholders are present.

Type/name consistency:
- `hoverOptimizeButton`, `hoveredOptimizeParagraph`, and `pendingOptimizedText` are introduced in Task 1 and used consistently in later tasks.
- `initHoverOptimization`, `hideHoverOptimizeButton`, and `closeOptimizationPreview` are defined before reset logic uses them.
