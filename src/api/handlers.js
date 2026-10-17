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

/**
 * @param {AppState} state
 * @param {{ id: string, outcome: import('../domain/types.js').Outcome }[]} expected
 * @returns {ApiResponse}
 */
export const getMetrics = (state, expected = []) => ({
  status: 200,
  body: { ...computeMetrics([...state.decisions.values()], expected), learning: state.cases.stats() },
});

/** @param {AppState} state @returns {ApiResponse} */
export const getProposals = (state) => ({ status: 200, body: state.proposals });
