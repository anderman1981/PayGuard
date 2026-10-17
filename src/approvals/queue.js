// @ts-check
/**
 * Cola de aprobación humana.
 *
 * Invariante S3 de SECURITY.md: una persona solo puede aprobar facturas
 * PENDIENTES. Una factura FRENADA no se aprueba por esta vía: hay que cambiar
 * las reglas y reprocesar, y ese cambio también queda auditado.
 *
 * Al aprobar se vuelven a verificar los límites duros, porque entre la decisión
 * y la aprobación el saldo o el presupuesto pueden haber cambiado.
 *
 * @typedef {{ state: import('../api/state.js').AppState, ctx: import('../rules/helpers.js').RuleContext }} ApprovalDeps
 * @typedef {{ ok: boolean, outcome?: string, error?: string, blocking?: string[] }} ApprovalResult
 */
import { evaluateInvoice } from '../rules/engine.js';
import { blockingResults } from '../rules/policy.js';

/** Reglas que ni una persona puede saltarse al aprobar. */
const HARD_RULES = new Set(['R03', 'R10', 'R11']);

/**
 * @param {string} invoiceId
 * @param {{ approver: string, reason: string }} by
 * @param {ApprovalDeps} deps
 * @returns {Promise<ApprovalResult>}
 */
export async function approve(invoiceId, { approver, reason }, { state, ctx }) {
  const decision = state.decisions.get(invoiceId);
  if (!decision) return { ok: false, error: 'la factura no tiene decisión registrada' };
  if (decision.outcome !== 'ESCALATE') {
    return { ok: false, error: `solo se aprueban facturas pendientes; esta está en ${decision.outcome}` };
  }

  const invoice = state.invoices?.get(invoiceId);
  if (invoice) {
    const stillBlocking = blockingResults(evaluateInvoice(invoice, ctx))
      .filter((r) => HARD_RULES.has(r.ruleId) && r.verdict === 'HOLD')
      .map((r) => r.ruleId);
    if (stillBlocking.length > 0) {
      await state.audit.append({
        type: 'approval',
        invoiceId,
        actor: approver,
        payload: { accepted: false, reason, blocking: stillBlocking },
        at: ctx.now,
      });
      return { ok: false, error: 'condiciones duras ya no se cumplen', blocking: stillBlocking };
    }
  }

  decision.outcome = 'PAY';
  decision.decidedBy = 'human';
  state.cases.resolve(invoiceId, 'approved', reason);
  await state.audit.append({
    type: 'approval', invoiceId, actor: approver, payload: { accepted: true, reason }, at: ctx.now,
  });
  return { ok: true, outcome: 'PAY' };
}

/**
 * @param {string} invoiceId
 * @param {{ approver: string, reason: string }} by
 * @param {ApprovalDeps} deps
 * @returns {Promise<ApprovalResult>}
 */
export async function reject(invoiceId, { approver, reason }, { state, ctx }) {
  const decision = state.decisions.get(invoiceId);
  if (!decision) return { ok: false, error: 'la factura no tiene decisión registrada' };
  if (decision.outcome === 'PAY') return { ok: false, error: 'la factura ya fue aprobada' };

  decision.outcome = 'HOLD';
  decision.decidedBy = 'human';
  state.cases.resolve(invoiceId, 'rejected', reason);
  await state.audit.append({
    type: 'rejection', invoiceId, actor: approver, payload: { reason }, at: ctx.now,
  });
  return { ok: true, outcome: 'HOLD' };
}
