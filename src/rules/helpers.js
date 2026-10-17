// @ts-check
/**
 * Utilidades compartidas por las reglas. Toda la aritmética, la conversión de
 * moneda y la comparación de fechas vive aquí, nunca en un modelo de lenguaje.
 *
 * @typedef {import('../domain/types.js').RulesConfig} RulesConfig
 * @typedef {import('../domain/types.js').ExtractedInvoice} ExtractedInvoice
 * @typedef {import('../domain/types.js').RuleVerdict} RuleVerdict
 * @typedef {import('../i18n/messages.js').Lang} Lang
 *
 * @typedef {Object} RuleContext
 * @property {RulesConfig} rules
 * @property {import('../integrations/blinka/account-source.js').MockAccountSource} account
 * @property {Date} now
 * @property {Lang} [lang]
 *
 * @typedef {Object} RuleOutcome
 * @property {RuleVerdict} verdict
 * @property {string} [messageKey]
 * @property {Record<string, string|number>} [vars]
 * @property {Record<string, unknown>} [evidence]
 *
 * @typedef {Object} Rule
 * @property {string} id
 * @property {string} nameKey
 * @property {(inv: ExtractedInvoice, ctx: RuleContext) => RuleOutcome} evaluate
 */

/** Resultado "cumple", sin motivo adicional. @type {RuleOutcome} */
export const PASS = { verdict: 'PASS' };

/**
 * Convierte un monto a USD con la tabla fija de la configuración.
 * Devuelve null si la moneda no tiene tasa: ninguna regla debe adivinar.
 * @param {number|null|undefined} amount
 * @param {string|null|undefined} currency
 * @param {RulesConfig} rules
 * @returns {number|null}
 */
export function toUsd(amount, currency, rules) {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || !currency) return null;
  const rate = rules.fxToUSD[currency.toUpperCase()];
  return typeof rate === 'number' && rate > 0 ? Math.round(amount * rate * 100) / 100 : null;
}

/**
 * Días completos entre dos fechas ISO (positivo si `b` es posterior a `a`).
 * @param {string} a YYYY-MM-DD
 * @param {string} b YYYY-MM-DD
 * @returns {number}
 */
export function daysBetween(a, b) {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86400000);
}

/** @param {Date} now @returns {string} fecha de hoy en formato ISO, en UTC */
export const todayIso = (now) => now.toISOString().slice(0, 10);

/**
 * Contraparte registrada que corresponde a la factura, o null.
 * @param {ExtractedInvoice} inv
 * @param {RuleContext} ctx
 */
export const counterpartyOf = (inv, ctx) =>
  ctx.account.findCounterparty(inv.counterpartyName ?? '', inv.counterpartyTaxId ?? null);

/**
 * Contrato activo que corresponde a la factura: primero por referencia, si no por contraparte.
 * @param {ExtractedInvoice} inv
 * @param {RuleContext} ctx
 */
export function contractOf(inv, ctx) {
  const active = ctx.account.listContracts().filter((c) => c.active);
  const byRef = inv.contractRef ? active.find((c) => c.id === inv.contractRef) : undefined;
  if (byRef) return byRef;
  const cp = counterpartyOf(inv, ctx);
  return cp ? active.find((c) => c.counterpartyId === cp.id) ?? null : null;
}

/**
 * Gasto ya comprometido en el periodo de la empresa, en USD.
 * @param {RuleContext} ctx
 * @returns {number}
 */
export function periodSpendUsd(ctx) {
  const period = ctx.account.getCompany().period;
  return ctx.account.listPaymentHistory()
    .filter((p) => p.paidAt.startsWith(period))
    .reduce((sum, p) => sum + (toUsd(p.amount, p.currency, ctx.rules) ?? 0), 0);
}
