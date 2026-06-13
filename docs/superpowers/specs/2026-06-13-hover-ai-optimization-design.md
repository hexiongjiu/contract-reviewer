# Hover AI Optimization Design

## Goal

Add paragraph-level AI optimization to the right-side contract original editor. When the user hovers over a paragraph, an `AI优化` button appears. Clicking it asks DeepSeek to improve only that paragraph, using both the matched review suggestion from the left panel and broader contract context. The original text is not changed until the user confirms the preview.

## Scope

First version supports paragraph-level optimization in the right-side Quill editor. It does not support table-cell-specific optimization, multi-paragraph rewrite, or automatic optimization on hover.

## User Flow

1. User uploads and reviews a DOCX contract.
2. Right-side contract original is shown in the Quill editor.
3. User hovers over a paragraph in the editor.
4. A small floating `AI优化` button appears near the hovered paragraph.
5. User clicks the button.
6. The app identifies the paragraph text and finds the most relevant item in `currentIssues`.
7. The app sends the paragraph, matched issue suggestion, and contract context to DeepSeek.
8. The app displays a preview modal with original text and optimized text.
9. User clicks `应用` to replace the paragraph, or `取消` to keep the original unchanged.
10. Existing `下载修改后合同` flow exports the updated paragraph through the current Quill-to-DOCX mapping.

## Architecture

The implementation stays inside `index.html`, matching the current single-file application style.

New UI pieces:

- Floating optimize button attached to the Quill editor area.
- Preview modal for original/optimized text comparison.

New state:

- `hoverOptimizeButton`: floating button element.
- `hoveredOptimizeParagraph`: current hovered Quill paragraph element.
- `pendingOptimizedText`: text returned by AI before confirmation.

New functions:

- `initHoverOptimization()` wires hover and click behavior after Quill initialization.
- `getParagraphText(element)` extracts trimmed paragraph text.
- `findBestIssueForParagraph(text)` matches the paragraph against `currentIssues` by simple normalized text overlap.
- `optimizeHoveredParagraph()` validates API key and paragraph, calls DeepSeek, and opens preview.
- `showOptimizationPreview(originalText, optimizedText)` renders the confirmation modal.
- `applyOptimizedParagraph()` replaces only the current paragraph text in Quill.
- `closeOptimizationPreview()` dismisses the modal without changes.

## AI Prompt

The request uses the selected model and existing DeepSeek API key. The prompt instructs the model to return only the optimized contract clause text, without Markdown, explanations, numbering, or quotation marks.

Inputs:

- Current paragraph text.
- Best matched review issue and suggestion, if any.
- Contract context from `originalPlainText.substring(0, 6000)`.

## Data Flow

The feature reads `currentIssues`, `originalPlainText`, Quill paragraph content, API key, and selected model. It writes only to the Quill editor after user confirmation. Existing edited-DOCX download detects changed paragraphs and maps them back to DOCX XML using `quillOriginalParagraphs`, `htmlToDocxMap`, and `docxParagraphs`.

## Error Handling

- No API key: show status error and do nothing.
- No paragraph text: show status error and do nothing.
- API request failure: show status error and keep original text.
- Empty AI response: show status error and keep original text.
- User cancels preview: close modal and keep original text.

## Testing

Manual browser testing:

1. Upload DOCX and confirm right-side Quill editor appears.
2. Hover a paragraph and confirm `AI优化` appears.
3. Click button and confirm loading/status behavior.
4. Confirm preview modal shows original and optimized text.
5. Cancel and confirm original text remains unchanged.
6. Apply and confirm only the hovered paragraph changes.
7. Download edited DOCX and confirm the modified paragraph is exported.
8. Test missing API key and API failure paths.
