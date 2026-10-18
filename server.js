// @ts-check
/**
 * Servidor HTTP sin dependencias. Sirve la interfaz y la API.
 * Corre igual en local, en Docker y en Railway (usa la variable PORT).
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createState, resetState, ruleContext } from './src/api/state.js';
import { resolveLang } from './src/i18n/index.js';
import * as api from './src/api/handlers.js';
import { loadDataset, nextDailyRunMs } from './src/daily/daily-run.js';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC_DIR = join(ROOT, 'public');
const ALLOWED_DIRS = [PUBLIC_DIR, join(ROOT, 'src'), join(ROOT, 'data')];
const PORT = Number(process.env.PORT) || 3000;
const ADMIN_TOKEN = process.env.PAYGUARD_ADMIN_TOKEN ?? '';
if (ADMIN_TOKEN === '') {
  process.stderr.write('[WARN] PAYGUARD_ADMIN_TOKEN no configurado: endpoints de escritura accesibles sin autenticación.\n');
}
const MAX_BODY = 1_000_000;

const state = createState(new URL('./data/company.json', import.meta.url));
const DATASET = loadDataset(new URL('./data/invoices/manifest.json', import.meta.url));

/** Clientes conectados al flujo de eventos en vivo (SSE) de la corrida diaria. */
/** @type {Set<import('node:http').ServerResponse>} */
const sseClients = new Set();
/** Pausa entre facturas para que la corrida se vea avanzar; 0 la apaga (pruebas). */
const STEP_MS = Number(process.env.PAYGUARD_DAILY_STEP_MS ?? 500);
const dailyDelay = STEP_MS > 0 ? () => new Promise((r) => setTimeout(r, STEP_MS)) : undefined;

/** Reparte un evento a cada cliente SSE; descarta los que ya cerraron. @param {Record<string, unknown>} event */
function broadcastEvent(event) {
  const frame = `event: ${String(event.type)}\ndata: ${JSON.stringify(event)}\n\n`;
  for (const res of sseClients) {
    try { res.write(frame); } catch { sseClients.delete(res); }
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.pdf': 'application/pdf', '.ico': 'image/x-icon',
};

/** Cabeceras de seguridad en toda respuesta (SECURITY.md §4). */
const SECURITY_HEADERS = {
  'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline';"
    + " img-src 'self' data:; object-src 'none'; base-uri 'none'",
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'cross-origin-opener-policy': 'same-origin',
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
  if (p === '/api/upload' && method === 'POST') return api.postUpload(state, await readBody(req), lang, ctx, { dataset: DATASET });
  if (p === '/api/notify' && method === 'POST') return api.postNotify(state, await readBody(req));
  if (p === '/api/notify-config' && method === 'GET') return api.getNotifyConfig(state);
  if (p === '/api/notify-config' && method === 'PUT') return api.putNotifyConfig(state, await readBody(req));
  if (p === '/api/apikeys' && method === 'GET') return api.getApiKeys(state);
  if (p === '/api/apikeys' && method === 'POST') return api.postApiKey(state, await readBody(req));
  if (p.startsWith('/api/apikeys/') && method === 'DELETE') return api.deleteApiKey(state, decodeURIComponent(p.slice(13)));
  if (p === '/api/daily-run' && method === 'GET') {
    return api.getDailyRun(state, { dataset: DATASET, date: url.searchParams.get('date') });
  }
  if (p === '/api/daily-run' && method === 'POST') {
    return api.postDailyRun(state, await readBody(req), lang, ctx, { dataset: DATASET, onEvent: broadcastEvent, delay: dailyDelay });
  }
  if (p === '/api/autonomy-profile' && method === 'GET') return api.getAutonomyProfile(state);
  if (p === '/api/autonomy-profile' && method === 'PUT') {
    const profileUrl = (/** @type {string} */ id) => new URL(`./data/profiles/${id}.json`, import.meta.url);
    return api.putAutonomyProfile(state, await readBody(req), profileUrl);
  }
  if (p === '/api/reset' && method === 'POST') {
    resetState(state, new URL('./data/company.json', import.meta.url));
    state.autonomyProfile = 'conservative';
    broadcastEvent({ type: 'reset' });
    return { status: 200, body: { ok: true, message: 'Estado reiniciado. Listo para nueva prueba.' } };
  }
  if (p.startsWith('/api/')) return { status: 404, body: { error: 'no encontrado' } };
  return null;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    if (url.pathname === '/api/events' && (req.method ?? 'GET') === 'GET') {
      if (!authorized(req)) return json(res, 401, { error: 'no autorizado' });
      res.writeHead(200, {
        ...SECURITY_HEADERS, 'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-store', connection: 'keep-alive',
      });
      res.write(': conectado\n\n');
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
      return;
    }
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
    process.stderr.write(`[ERROR] ${req.method} ${req.url}: ${error?.message}\n`);
    json(res, 400, { error: 'solicitud inválida' });
  }
});

/**
 * Disparador de la corrida diaria a las 07:00. Es un reloj propio con
 * setTimeout nativo (0 dependencias): calcula el próximo 07:00 en la zona
 * configurada, corre la misma lógica que /api/daily-run y se reprograma. En
 * producción esto lo haría un cron real del sistema o del orquestador. Se
 * activa solo con PAYGUARD_DAILY=1, así nunca corre en pruebas ni por defecto.
 */
function scheduleDailyRun() {
  const timeZone = process.env.PAYGUARD_TZ || process.env.TZ || 'UTC';
  const timer = setTimeout(() => {
    const ctx = ruleContext(state, 'es');
    broadcastEvent({ type: 'run-start', date: state.now.toISOString().slice(0, 10), trigger: '07:00' });
    api.postDailyRun(state, {}, 'es', ctx, { dataset: DATASET, onEvent: broadcastEvent, delay: dailyDelay })
      .then((r) => broadcastEvent({ type: 'run-done', count: /** @type {any} */ (r.body).count }))
      .catch(() => broadcastEvent({ type: 'run-done', count: 0 }))
      .finally(() => scheduleDailyRun());
  }, nextDailyRunMs(7, timeZone, new Date()));
  timer.unref?.();
}

server.listen(PORT, () => {
  process.stdout.write(`PayGuard escuchando en http://localhost:${PORT}\n`);
  if (process.env.PAYGUARD_DAILY === '1') {
    const tz = process.env.PAYGUARD_TZ || process.env.TZ || 'UTC';
    process.stdout.write(`Corrida diaria programada para las 07:00 (${tz}); en producción iría un cron real\n`);
    scheduleDailyRun();
  }
});
