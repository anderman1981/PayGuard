// @ts-check
/**
 * Servidor HTTP sin dependencias. Sirve la interfaz (public/) y la API JSON.
 * Corre igual en local (node / Docker) y en Railway (usa la variable PORT).
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_RULES, validateRules } from './src/config/default-rules.js';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC_DIR = join(ROOT, 'public');
const PORT = Number(process.env.PORT) || 3000;
const company = JSON.parse(readFileSync(join(ROOT, 'data/company.json'), 'utf8'));

/** Estado en memoria de la corrida (se reinicia con cada despliegue: es una demo). */
const state = { rules: structuredClone(DEFAULT_RULES), decisions: [] };

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.pdf': 'application/pdf', '.ico': 'image/x-icon',
};

/** @param {import('node:http').ServerResponse} res @param {number} status @param {unknown} body */
function json(res, status, body) {
  res.writeHead(status, { 'content-type': MIME['.json'], 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

/** @param {import('node:http').IncomingMessage} req */
async function readBody(req) {
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 1e6) throw new Error('payload demasiado grande'); }
  return raw ? JSON.parse(raw) : {};
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const p = url.pathname;

    if (p === '/api/health') return json(res, 200, { ok: true, service: 'payguard', mode: process.env.PAYGUARD_MODE ?? 'mock' });
    if (p === '/api/company' && req.method === 'GET') return json(res, 200, company);
    if (p === '/api/rules' && req.method === 'GET') return json(res, 200, state.rules);
    if (p === '/api/rules' && req.method === 'PUT') {
      const next = { ...state.rules, ...(await readBody(req)) };
      const errors = validateRules(next);
      if (errors.length) return json(res, 400, { errors });
      state.rules = next;
      return json(res, 200, state.rules);
    }
    if (p === '/api/decisions' && req.method === 'GET') return json(res, 200, state.decisions);
    if (p.startsWith('/api/')) return json(res, 404, { error: 'no encontrado' });

    // Archivos estáticos (también sirve /src para que el navegador use el mismo motor).
    const base = p.startsWith('/src/') || p.startsWith('/data/') ? ROOT : PUBLIC_DIR;
    const rel = p === '/' ? 'index.html' : decodeURIComponent(p.slice(1));
    const file = normalize(join(base, rel));
    // Solo se sirven public/, src/ y data/. Nunca .env ni archivos de la raíz.
    const allowed = [PUBLIC_DIR, join(ROOT, 'src'), join(ROOT, 'data')];
    if (!allowed.some((dir) => file.startsWith(dir + '/') || file === dir)) return json(res, 403, { error: 'prohibido' });
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch (err) {
    if (/** @type {any} */ (err)?.code === 'ENOENT') return json(res, 404, { error: 'no encontrado' });
    json(res, 500, { error: String(/** @type {any} */ (err)?.message ?? err) });
  }
});

server.listen(PORT, () => console.log(`PayGuard escuchando en http://localhost:${PORT}`));
