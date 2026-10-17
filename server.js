// @ts-check
/**
 * Servidor HTTP sin dependencias. Sirve la interfaz y la API.
 * Corre igual en local, en Docker y en Railway (usa la variable PORT).
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createState, ruleContext } from './src/api/state.js';
import { resolveLang } from './src/i18n/index.js';
import * as api from './src/api/handlers.js';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC_DIR = join(ROOT, 'public');
const ALLOWED_DIRS = [PUBLIC_DIR, join(ROOT, 'src'), join(ROOT, 'data')];
const PORT = Number(process.env.PORT) || 3000;
const ADMIN_TOKEN = process.env.PAYGUARD_ADMIN_TOKEN ?? '';
const MAX_BODY = 1_000_000;

const state = createState(new URL('./data/company.json', import.meta.url));

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.pdf': 'application/pdf', '.ico': 'image/x-icon',
};

/** Cabeceras de seguridad en toda respuesta (SECURITY.md §4). */
const SECURITY_HEADERS = {
  'content-security-policy': "default-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'",
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'cross-origin-opener-origin': 'same-origin',
};

/** @param {import('node:http').ServerResponse} res @param {number} status @param {unknown} body */
function json(res, status, body) {
  res.writeHead(status, { ...SECURITY_HEADERS, 'content-type': MIME['.json'], 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

/** @param {import('node:http').IncomingMessage} req */
async function readBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY) throw new Error('cuerpo demasiado grande');
  }
  return raw ? JSON.parse(raw) : {};
}

/** Las operaciones que cambian estado piden token cuando está configurado. */
const authorized = (/** @type {import('node:http').IncomingMessage} */ req) =>
  ADMIN_TOKEN === '' || req.headers.authorization === `Bearer ${ADMIN_TOKEN}`;

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {URL} url
 * @returns {Promise<{status: number, body: unknown}|null>} null si no es una ruta de API
 */
async function route(req, url) {
  const p = url.pathname;
  const lang = resolveLang({
    requested: url.searchParams.get('lang'),
    acceptLanguage: req.headers['accept-language'] ?? null,
    company: 'en',
  });
  const ctx = ruleContext(state, lang);
  const method = req.method ?? 'GET';
  const needsAuth = method !== 'GET';
  if (p.startsWith('/api/') && needsAuth && !authorized(req)) {
    return { status: 401, body: { error: 'no autorizado' } };
  }

  if (p === '/api/health') return api.getHealth(state, lang);
  if (p === '/api/company') return { status: 200, body: state.company };
  if (p === '/api/rules' && method === 'GET') return api.getRules(state);
  if (p === '/api/rules' && method === 'PUT') return api.putRules(state, await readBody(req), 'admin');
  if (p === '/api/run' && method === 'POST') {
    const body = await readBody(req);
    return api.postRun(state, body.invoices, lang, ctx);
  }
  if (p === '/api/decisions') return api.getDecisions(state, lang);
  if (p.startsWith('/api/decisions/')) return api.getDecision(state, decodeURIComponent(p.slice(15)), lang);
  if (p.startsWith('/api/approvals/') && method === 'POST') {
    return api.postApproval(state, decodeURIComponent(p.slice(15)), await readBody(req), ctx);
  }
  if (p === '/api/audit') return api.getAudit(state);
  if (p === '/api/audit/verify') return api.getAuditVerify(state);
  if (p === '/api/proposals') return api.getProposals(state);
  if (p === '/api/metrics') return api.getMetrics(state, []);
  if (p.startsWith('/api/')) return { status: 404, body: { error: 'no encontrado' } };
  if (p === '/api/upload' && method === 'POST') return api.postUpload(state, await readBody(req), lang, ctx);
  return null;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const apiResult = await route(req, url);
    if (apiResult) return json(res, apiResult.status, apiResult.body);

    const base = url.pathname.startsWith('/src/') || url.pathname.startsWith('/data/') ? ROOT : PUBLIC_DIR;
    const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
    const file = normalize(join(base, rel));
    if (!ALLOWED_DIRS.some((dir) => file.startsWith(`${dir}/`) || file === dir)) {
      return json(res, 403, { error: 'prohibido' });
    }
    const body = await readFile(file);
    res.writeHead(200, { ...SECURITY_HEADERS, 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch (err) {
    const error = /** @type {NodeJS.ErrnoException} */ (err);
    if (error?.code === 'ENOENT') return json(res, 404, { error: 'no encontrado' });
    json(res, 400, { error: error?.message ?? 'solicitud inválida' });
  }
});

server.listen(PORT, () => process.stdout.write(`PayGuard escuchando en http://localhost:${PORT}\n`));
