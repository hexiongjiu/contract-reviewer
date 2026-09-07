import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { env, pipeline } from '@huggingface/transformers';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vectorDir = path.join(projectRoot, 'server', 'vector-data');
const meta = JSON.parse(fs.readFileSync(path.join(vectorDir, 'legal-vector-meta.json'), 'utf8'));
const vectorBuffer = fs.readFileSync(path.join(vectorDir, 'legal-vectors.f32'));
const vectors = new Float32Array(vectorBuffer.buffer, vectorBuffer.byteOffset, vectorBuffer.byteLength / 4);
const portFlagIndex = process.argv.indexOf('--port');
const port = Number(portFlagIndex >= 0 ? process.argv[portFlagIndex + 1] : (process.env.PORT || 8765));
const dataDir = path.join(projectRoot, 'server', 'data');
fs.mkdirSync(dataDir, { recursive: true });
const database = new DatabaseSync(path.join(dataDir, 'contract-reviewer.sqlite'));
database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS review_history (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        content_hash TEXT,
        filename TEXT,
        data_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_review_history_timestamp ON review_history(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_review_history_content_hash ON review_history(content_hash);
`);
const listHistoryStatement = database.prepare('SELECT data_json FROM review_history ORDER BY timestamp DESC LIMIT 50');
const upsertHistoryStatement = database.prepare(`
    INSERT INTO review_history (id, timestamp, content_hash, filename, data_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
        timestamp = excluded.timestamp,
        content_hash = excluded.content_hash,
        filename = excluded.filename,
        data_json = excluded.data_json,
        updated_at = excluded.updated_at
`);
const deleteHistoryStatement = database.prepare('DELETE FROM review_history WHERE id = ?');

function validateHistoryItem(value) {
    if (!value || typeof value !== 'object') throw new Error('Invalid history item.');
    const item = JSON.parse(JSON.stringify(value));
    item.id = String(item.id || '').slice(0, 100);
    if (!item.id) throw new Error('History item ID is required.');
    item.timestamp = String(item.timestamp || new Date().toISOString()).slice(0, 40);
    item.filename = String(item.filename || '未命名合同').slice(0, 500);
    item.contentHash = String(item.contentHash || '').slice(0, 200);
    return item;
}

function upsertHistoryItem(value) {
    const item = validateHistoryItem(value);
    const now = new Date().toISOString();
    upsertHistoryStatement.run(item.id, item.timestamp, item.contentHash, item.filename, JSON.stringify(item), now);
    return item;
}

env.cacheDir = path.join(projectRoot, 'server', 'model-cache');
env.allowLocalModels = true;
env.allowRemoteModels = true;

let extractorPromise;
let inferenceQueue = Promise.resolve();
function getExtractor() {
    extractorPromise ||= pipeline('feature-extraction', meta.modelId, { dtype: 'q8' });
    return extractorPromise;
}

function searchVector(query, topK) {
    const run = async () => {
        const extractor = await getExtractor();
        const prefixedQuery = `为这个句子生成表示以用于检索相关文章：${query}`;
        const output = await extractor(prefixedQuery, { pooling: 'mean', normalize: true });
        const queryVector = output.data;
        const bestByArticle = new Map();
        for (let row = 0; row < meta.count; row++) {
            let score = 0;
            const offset = row * meta.dimensions;
            for (let column = 0; column < meta.dimensions; column++) score += queryVector[column] * vectors[offset + column];
            const id = meta.ids[row];
            if (score > (bestByArticle.get(id) ?? -Infinity)) bestByArticle.set(id, score);
        }
        return Array.from(bestByArticle, ([id, score]) => ({ id, score: Number(score.toFixed(6)) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    };
    const queued = inferenceQueue.then(run, run);
    inferenceQueue = queued.catch(() => {});
    return queued;
}

function jsonResponse(response, status, body) {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify(body));
}

function mimeType(filePath) {
    return ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/markdown', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' })[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

async function readRequestBody(request) {
    const parts = [];
    let size = 0;
    for await (const part of request) {
        size += part.length;
        if (size > 30 * 1024 * 1024) throw new Error('Request body too large.');
        parts.push(part);
    }
    return JSON.parse(Buffer.concat(parts).toString('utf8') || '{}');
}

const server = http.createServer(async (request, response) => {
    try {
        const url = new URL(request.url, `http://${request.headers.host || '127.0.0.1'}`);
        if (request.method === 'GET' && url.pathname === '/api/vector-status') {
            return jsonResponse(response, 200, { ready: true, database: 'sqlite', modelId: meta.modelId, articles: meta.count, segments: meta.count, sourceChunkCount: meta.sourceChunkCount || meta.count });
        }
        if (request.method === 'GET' && url.pathname === '/api/history') {
            const items = listHistoryStatement.all().map(row => JSON.parse(row.data_json));
            return jsonResponse(response, 200, { storage: 'sqlite', items });
        }
        if (request.method === 'POST' && url.pathname === '/api/history/import') {
            const body = await readRequestBody(request);
            const items = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
            database.exec('BEGIN');
            try {
                items.forEach(upsertHistoryItem);
                database.exec('COMMIT');
            } catch (error) {
                database.exec('ROLLBACK');
                throw error;
            }
            return jsonResponse(response, 200, { imported: items.length });
        }
        if (request.method === 'DELETE' && url.pathname === '/api/history') {
            database.exec('DELETE FROM review_history');
            return jsonResponse(response, 200, { deleted: 'all' });
        }
        const historyMatch = url.pathname.match(/^\/api\/history\/([^/]+)$/);
        if (historyMatch && request.method === 'PUT') {
            const body = await readRequestBody(request);
            const item = upsertHistoryItem({ ...body, id: decodeURIComponent(historyMatch[1]) });
            return jsonResponse(response, 200, { item });
        }
        if (historyMatch && request.method === 'DELETE') {
            deleteHistoryStatement.run(decodeURIComponent(historyMatch[1]));
            return jsonResponse(response, 200, { deleted: true });
        }
        if (request.method === 'POST' && url.pathname === '/api/legal-search') {
            const body = await readRequestBody(request);
            const query = String(body.query || '').replace(/\s+/g, ' ').trim().slice(0, 4000);
            if (query.length < 2) return jsonResponse(response, 400, { error: '检索问题为空' });
            const topK = Math.max(5, Math.min(80, Number(body.topK) || 40));
            return jsonResponse(response, 200, { modelId: meta.modelId, matches: await searchVector(query, topK) });
        }
        if (request.method !== 'GET' && request.method !== 'HEAD') return jsonResponse(response, 405, { error: 'Method not allowed' });
        const requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
        const filePath = path.resolve(projectRoot, `.${requested}`);
        if (filePath !== projectRoot && !filePath.startsWith(`${projectRoot}${path.sep}`)) return jsonResponse(response, 403, { error: 'Forbidden' });
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) return jsonResponse(response, 404, { error: 'Not found' });
        response.writeHead(200, { 'Content-Type': `${mimeType(filePath)}; charset=utf-8`, 'Cache-Control': 'no-cache' });
        if (request.method === 'HEAD') return response.end();
        fs.createReadStream(filePath).pipe(response);
    } catch (error) {
        jsonResponse(response, error.code === 'ENOENT' ? 404 : 500, { error: error.message });
    }
});

server.listen(port, '127.0.0.1', () => {
    console.log(`Contract Reviewer: http://127.0.0.1:${port}`);
    console.log(`Vector model: ${meta.modelId}; ${meta.count} articles / ${meta.count} stored vectors.`);
});
