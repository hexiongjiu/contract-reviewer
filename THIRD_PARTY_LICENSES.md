# Third-Party Software, Models, and Legal Texts

This project uses or interoperates with the following third-party components. Each component remains subject to its own license and notices.

## Runtime libraries

### Mammoth.js

- Project: https://github.com/mwilliamson/mammoth.js
- Use: DOCX-to-HTML and text conversion
- License: BSD-2-Clause

### JSZip 3.10.1

- Project: https://github.com/Stuk/jszip
- Use: Reading and updating the ZIP/XML structure of DOCX files
- License: MIT or GPL-3.0
- Bundled dependency notice: JSZip includes or uses pako under the MIT license

### Quill 1.3.7

- Project: https://github.com/slab/quill
- Use: Rich-text contract editor
- License: BSD-3-Clause

### Transformers.js 4.0.1

- Package: `@huggingface/transformers`
- Project: https://github.com/huggingface/transformers.js
- Use: Local ONNX inference for semantic legal retrieval
- License: Apache-2.0

### Node.js

- Project: https://github.com/nodejs/node
- Use: Local HTTP service and the built-in `node:sqlite` database interface
- License: MIT

## Embedding model

### BAAI/bge-small-zh-v1.5

- Original model: https://huggingface.co/BAAI/bge-small-zh-v1.5
- Transformers.js-compatible conversion: https://huggingface.co/Xenova/bge-small-zh-v1.5
- Use: 512-dimensional Chinese embeddings for legal-clause candidate retrieval
- Original model license: MIT, as declared by the upstream model card

The model is downloaded on demand and cached under `server/model-cache/`; the cache is not committed to this repository. Users should review the upstream model and conversion repositories before redistribution.

## Development tools

### Playwright

- Project: https://github.com/microsoft/playwright
- Use: Browser smoke tests; it is not required by the production runtime
- License: Apache-2.0

## Legal and judicial texts

The repository contains local reference snapshots of laws, judicial interpretations, provisions, and official replies of the People's Republic of China.

- Use: Legal-library browsing, candidate retrieval, AI-assisted review, and citation display
- Sources: Official pages of the National People's Congress and the Supreme People's Court
- Per-document sources and version audits: [`legal-source-review/`](legal-source-review/)

These public legal texts are provided for reference and convenience. They are not software dependencies, do not inherit this project's MIT license, and may change after the snapshot date. Users must verify current wording, effectiveness, and applicability against official publication channels.

## External API

DeepSeek is an external API service used when the user supplies an API Key. It is not bundled with this repository and is not represented here as an open-source dependency. Its service terms, privacy policy, model availability, and pricing apply separately.

## Full license texts

The SPDX names above link each component to its upstream project. Bundled minified files retain their upstream copyright headers where supplied. Full license terms are available in the linked upstream repositories and in installed npm package directories after `npm install`.
