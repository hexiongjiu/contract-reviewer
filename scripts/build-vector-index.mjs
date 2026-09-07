import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { env, pipeline } from '@huggingface/transformers';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vectorDir = path.join(projectRoot, 'server', 'vector-data');
const cacheDir = path.join(projectRoot, 'server', 'model-cache');
const modelId = 'Xenova/bge-small-zh-v1.5';
const chunkSize = 320;
const chunkOverlap = 60;

env.cacheDir = cacheDir;
env.allowLocalModels = true;
env.allowRemoteModels = true;

function loadBrowserData(relativePath, property) {
    const context = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(projectRoot, relativePath), 'utf8'), context);
    return context.window[property];
}

function getArticles() {
    const civil = loadBrowserData('js/civil-code-data.js', 'CIVIL_CODE_ARTICLES').map(article => ({
        ...article,
        id: `civil-code:${article.articleNo}`,
        lawTitle: '中华人民共和国民法典',
        path: [article.book, article.subbook, article.chapter, article.section].filter(Boolean).join(' / ')
    }));
    const extra = loadBrowserData('js/legal-basis-data.js', 'LEGAL_BASIS_DATA').articles;
    return [...civil, ...extra];
}

function splitArticle(article) {
    const body = String(article.text || '').replace(/\s+/g, ' ').trim();
    const prefix = [article.lawTitle, article.path, article.articleNo].filter(Boolean).join(' / ');
    if (!body) return [{ id: article.id, text: prefix }];
    const chunks = [];
    for (let start = 0; start < body.length; start += chunkSize - chunkOverlap) {
        const part = body.slice(start, start + chunkSize);
        chunks.push({ id: article.id, text: `${prefix}\n${part}` });
        if (start + chunkSize >= body.length || chunks.length >= 5) break;
    }
    return chunks;
}

function writeFloat32(filePath, rows, dimensions) {
    const values = new Float32Array(rows.length * dimensions);
    rows.forEach((row, rowIndex) => values.set(row, rowIndex * dimensions));
    fs.writeFileSync(filePath, Buffer.from(values.buffer));
}

fs.mkdirSync(vectorDir, { recursive: true });
fs.mkdirSync(cacheDir, { recursive: true });
const articles = getArticles();
const articleChunks = articles.map(splitArticle);
const chunks = articleChunks.flat();
console.log(`Loading ${modelId}; ${articles.length} articles (${chunks.length} internal chunks) will be embedded.`);
const extractor = await pipeline('feature-extraction', modelId, { dtype: 'q8' });
const rows = [];
const batchSize = 24;
for (let index = 0; index < chunks.length; index += batchSize) {
    const batch = chunks.slice(index, index + batchSize);
    const output = await extractor(batch.map(item => item.text), { pooling: 'mean', normalize: true });
    rows.push(...output.tolist());
    console.log(`${Math.min(index + batch.length, chunks.length)}/${chunks.length}`);
}
const dimensions = rows[0]?.length || 0;
if (!dimensions) throw new Error('Embedding model returned no vectors.');

// A long article may be encoded in several internal passes to avoid model
// truncation, but the stored index always contains exactly one normalized
// centroid per legal article. Chunks from different articles are never mixed.
const articleRows = [];
let rowOffset = 0;
for (const chunksForArticle of articleChunks) {
    const centroid = new Float32Array(dimensions);
    for (let index = 0; index < chunksForArticle.length; index++) {
        const row = rows[rowOffset++];
        for (let column = 0; column < dimensions; column++) centroid[column] += row[column];
    }
    let norm = 0;
    for (let column = 0; column < dimensions; column++) {
        centroid[column] /= chunksForArticle.length;
        norm += centroid[column] * centroid[column];
    }
    norm = Math.sqrt(norm) || 1;
    for (let column = 0; column < dimensions; column++) centroid[column] /= norm;
    articleRows.push(centroid);
}

writeFloat32(path.join(vectorDir, 'legal-vectors.f32'), articleRows, dimensions);
fs.writeFileSync(path.join(vectorDir, 'legal-vector-meta.json'), JSON.stringify({
    modelId,
    dimensions,
    count: articles.length,
    sourceChunkCount: chunks.length,
    generatedAt: new Date().toISOString(),
    ids: articles.map(article => article.id)
}));
console.log(`Vector index written: ${articles.length} articles x ${dimensions}; one vector per article.`);
