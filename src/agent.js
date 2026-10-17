// @ts-check
/**
 * Agente: une extracción ya hecha, reglas, consejo, política, auditoría y
 * memoria de casos en una sola decisión explicable.
 *
 * No existe aquí ninguna función capaz de mover dinero (invariante S1).
 *
 * @typedef {import('./domain/types.js').ExtractedInvoice} ExtractedInvoice
 * @typedef {import('./domain/types.js').Decision} Decision
 * @typedef {import('./rules/helpers.js').RuleContext} RuleContext
 *
 * @typedef {Object} AgentDeps
 * @property {RuleContext} ctx
 * @property {import('./audit/log.js').AuditLog} audit
 * @property {import('./learning/store.js').CaseStore} cases
 */
import { evaluateInvoice } from './rules/engine.js';
import { decide, blockingResults } from './rules/policy.js';
import { advise, applyAdvice } from './learning/advisor.js';
import { toUsd } from './rules/helpers.js';
import { summarize } from './audit/explain.js';
import { t } from './i18n/index.js';

/**
 * Procesa una factura y deja constancia de la decisión.
 * @param {ExtractedInvoice} invoice
 * @param {AgentDeps} deps
 * @returns {Promise<Decision & { advice: import('./learning/advisor.js').Advice }>}
 */
export async function processInvoice(invoice, { ctx, audit, cases }) {
  const lang = ctx.lang ?? 'es';
  const advice = advise(invoice, cases);
  const results = applyAdvice(evaluateInvoice(invoice, ctx), advice, t('a01.similarRejected', lang, {
    rate: Math.round(advice.rejectionRate * 100),
  }));
  const outcome = decide(results);

  /** @type {Decision} */
  const decision = {
    invoiceId: invoice.id,
    outcome,
    results,
    summary: summarize({ invoiceId: invoice.id, outcome, results, summary: '', decidedAt: '', decidedBy: 'agent' }, lang),
    decidedAt: ctx.now.toISOString(),
    decidedBy: 'agent',
  };

  const amountUsd = toUsd(invoice.amount, invoice.currency, ctx.rules);
  cases.add({ invoice, outcome, failedRules: blockingResults(results).map((r) => r.ruleId), amountUsd, now: ctx.now });

  // El pago simulado solo ocurre cuando la política dijo PAY: actualiza saldo y
  // presupuesto para que las siguientes facturas del lote vean el efecto real.
  if (outcome === 'PAY' && invoice.invoiceNumber && invoice.currency && typeof invoice.amount === 'number') {
    const cp = ctx.account.findCounterparty(invoice.counterpartyName ?? '', invoice.counterpartyTaxId ?? null);
    if (cp) {
      ctx.account.recordSimulatedPayment({
        counterpartyId: cp.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        currency: invoice.currency,
        paidAt: ctx.now.toISOString().slice(0, 10),
      });
    }
  }

  await audit.append({
    type: 'decision',
    invoiceId: invoice.id,
    payload: {
      outcome,
      amountUsd,
      failedRules: blockingResults(results).map((r) => ({ ruleId: r.ruleId, reason: r.reason })),
      proposals: advice.proposals,
    },
    at: ctx.now,
  });

  return { ...decision, advice };
}

/**
 * Procesa un lote en orden.
 * @param {ExtractedInvoice[]} invoices
 * @param {AgentDeps} deps
 */
export async function processBatch(invoices, deps) {
  const decisions = [];
  for (const invoice of invoices) decisions.push(await processInvoice(invoice, deps));
  return decisions;
}
