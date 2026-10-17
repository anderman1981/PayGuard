// @ts-check
/**
 * Manejadores de la API, puros respecto al transporte: reciben estado y
 * parámetros, devuelven { status, body }. El servidor solo enruta.
 */
import { validateRules } from '../config/default-rules.js';
import { processBatch } from '../agent.js';
import { explain } from '../audit/explain.js';
import { computeMetrics } from '../metrics.js';
import { approve, reject } from '../approvals/queue.js';
import { extractInvoice } from '../extraction/index.js';

/** @typedef {import('./state.js').AppState} AppState */
/** @typedef {import('../i18n/messages.js').Lang} Lang */
/** @typedef {{ status: number, body: unknown }} ApiResponse */

/** @param {AppState} state @param {Lang} lang */
export const getHealth = (state, lang) => ({
  status: 200,
  body: {
    ok: true,
    service: 'payguard',
    mode: process.env.PAYGUARD_MODE ?? 'mock',
    lang,
    uploadEnabled: process.env.PAYGUARD_ALLOW_UPLOAD === '1',
    decisions: state.decisions.size,
    auditEntries: state.audit.entries.length,
  },
});

/** @param {AppState} state @returns {ApiResponse} */
export const getRules = (state) => ({ status: 200, body: state.rules });

/**
 * @param {AppState} state
 * @param {Record<string, unknown>} patch
 * @param {string} actor
 * @returns {Promise<ApiResponse>}
 */
export async function putRules(state, patch, actor) {
  const next = { ...state.rules, ...patch };
  const errors = validateRules(next);
  if (errors.length > 0) return { status: 400, body: { errors } };
  const before = state.rules;
  state.rules = next;
  await state.audit.append({ type: 'rules-change', actor, payload: { before, after: next }, at: state.now });
  return { status: 200, body: state.rules };
}

/**
 * Procesa facturas ya extraídas.
 * @param {AppState} state
 * @param {import('../domain/types.js').ExtractedInvoice[]} invoices
 * @param {Lang} lang
 * @param {import('../rules/helpers.js').RuleContext} ctx
 * @returns {Promise<ApiResponse>}
 */
export async function postRun(state, invoices, lang, ctx) {
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return { status: 400, body: { errors: ['se requiere una lista de facturas'] } };
  }
  const decisions = await processBatch(invoices, { ctx, audit: state.audit, cases: state.cases });
  for (const inv of invoices) state.invoices.set(inv.id, inv);
  for (const d of decisions) {
    state.decisions.set(d.invoiceId, d);
    for (const p of d.advice.proposals) {
      if (!state.proposals.some((x) => x.kind === p.kind && x.subject === p.subject)) state.proposals.push(p);
    }
  }
  return {
    status: 200,
    body: decisions.map((d) => ({ ...d, explanation: explain(d, lang) })),
  };
}

/** @param {AppState} state @param {Lang} lang @returns {ApiResponse} */
export const getDecisions = (state, lang) => ({
  status: 200,
  body: [...state.decisions.values()].map((d) => ({
    invoiceId: d.invoiceId, outcome: d.outcome, summary: d.summary, decidedAt: d.decidedAt, decidedBy: d.decidedBy,
    failed: d.results.filter((r) => r.verdict !== 'PASS').map((r) => r.ruleId),
    explanation: explain(d, lang),
  })),
});

/** @param {AppState} state @param {string} id @param {Lang} lang @returns {ApiResponse} */
export function getDecision(state, id, lang) {
  const decision = state.decisions.get(id);
  if (!decision) return { status: 404, body: { error: 'no encontrado' } };
  return { status: 200, body: { ...decision, explanation: explain(decision, lang) } };
}

/**
 * @param {AppState} state
 * @param {string} id
 * @param {{ action?: string, approver?: string, reason?: string }} input
 * @param {import('../rules/helpers.js').RuleContext} ctx
 * @returns {Promise<ApiResponse>}
 */
export async function postApproval(state, id, input, ctx) {
  const { action, approver, reason } = input;
  if (!approver || !reason) return { status: 400, body: { errors: ['approver y reason son obligatorios'] } };
  if (action !== 'approve' && action !== 'reject') {
    return { status: 400, body: { errors: ['action debe ser approve o reject'] } };
  }
  const apply = action === 'approve' ? approve : reject;
  const result = await apply(id, { approver, reason }, { state, ctx });
  return { status: result.ok ? 200 : 409, body: result };
}

/** @param {AppState} state @returns {ApiResponse} */
export const getAudit = (state) => ({ status: 200, body: state.audit.list() });

/** @param {AppState} state @returns {Promise<ApiResponse>} */
export const getAuditVerify = async (state) => ({ status: 200, body: await state.audit.verify() });

/** @param {AppState} state @returns {ApiResponse} */
export const getProposals = (state) => ({ status: 200, body: state.proposals });

/** @param {string} url */
const isSlackWebhook = (url) => {
  try { const u = new URL(url); return u.protocol === 'https:' && u.hostname === 'hooks.slack.com'; } catch { return false; }
};

/** @param {typeof fetch} fetchImpl @param {string} url @param {unknown} payload */
async function postJson(fetchImpl, url, payload) {
  try {
    const res = await fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    return res.ok ? 'enviado' : `error ${res.status}`;
  } catch { return 'error de red'; }
}

/**
 * Reenvía un aviso al responsable humano por canales externos. Nunca mueve
 * dinero: solo notifica qué frenó o escaló el agente. Apagado salvo que
 * PAYGUARD_ALLOW_NOTIFY=1, y solo acepta webhooks de hooks.slack.com para no
 * usarse como proxy hacia cualquier URL. El correo necesita un relay propio
 * (PAYGUARD_EMAIL_WEBHOOK). Cada reenvío queda en la auditoría.
 * @param {AppState} state
 * @param {{ text?: string, slackWebhook?: string, email?: string }} input
 * @param {{ fetchImpl?: typeof fetch, env?: Record<string, string|undefined> }} [deps]
 * @returns {Promise<ApiResponse>}
 */
export async function postNotify(state, input, deps = {}) {
  const env = deps.env ?? process.env;
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch;
  const { text, slackWebhook, email } = input;
  if (!text) return { status: 400, body: { errors: ['text es obligatorio'] } };
  if (env.PAYGUARD_ALLOW_NOTIFY !== '1') {
    return { status: 200, body: { slack: 'desactivado', email: 'desactivado' } };
  }
  const result = { slack: 'sin configurar', email: 'sin configurar' };
  if (slackWebhook) {
    result.slack = isSlackWebhook(slackWebhook) ? await postJson(fetchImpl, slackWebhook, { text }) : 'url no permitida';
  }
  if (email) {
    const hook = env.PAYGUARD_EMAIL_WEBHOOK;
    result.email = hook ? await postJson(fetchImpl, hook, { to: email, text }) : 'requiere proveedor (PAYGUARD_EMAIL_WEBHOOK)';
  }
  await state.audit.append({ type: 'notify', actor: 'agent', payload: { channels: result }, at: state.now });
  return { status: 200, body: result };
}

/**
 * @param {AppState} state
 * @param {{ id: string, outcome: import('../domain/types.js').Outcome }[]} expected
 * @returns {ApiResponse}
 */
export const getMetrics = (state, expected = []) => ({
  status: 200,
  body: { ...computeMetrics([...state.decisions.values()], expected), learning: state.cases.stats() },
});

/**
 * @param {AppState} state
 * @param {{ file: { name: string, mime: string, bytes: ArrayLike<number> } }} payload
 * @param {Lang} lang
 * @param {import('../rules/helpers.js').RuleContext} ctx
 * @returns {Promise<ApiResponse>}
 */
export async function postUpload(state, { file }, lang, ctx) {
  const allowed = process.env.PAYGUARD_ALLOW_UPLOAD === '1';
  if (!allowed) return { status: 403, body: { error: 'subida de facturas desactivada en este entorno' } };
  if (!file || !file.name || !file.mime) {
    return { status: 400, body: { errors: ['se requiere un archivo con nombre y tipo'] } };
  }

  const doc = {
    id: file.name.replace(/\.[^/.]+$/, ''),
    source: file.mime.startsWith('image/') ? 'image' : 'pdf',
    bytes: new Uint8Array(file.bytes),
    mime: file.mime,
  };

  const { invoice, provider, attempts } = await extractInvoice(doc, { mode: 'cache' });
  const decisions = await processBatch([invoice], { ctx, audit: state.audit, cases: state.cases });

  state.invoices.set(invoice.id, invoice);
  for (const d of decisions) {
    state.decisions.set(d.invoiceId, d);
    for (const p of d.advice.proposals) {
      if (!state.proposals.some((x) => x.kind === p.kind && x.subject === p.subject)) state.proposals.push(p);
    }
  }

  return {
    status: 200,
    body: {
      provider,
      attempts,
      invoice,
      decision: decisions[0],
      explanation: explain(decisions[0], lang),
    },
  };
}
