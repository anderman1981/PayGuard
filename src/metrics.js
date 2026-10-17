// @ts-check
/**
 * Métricas del reto: autonomía, seguridad y precisión.
 * La seguridad es la única que no puede bajar nunca (ver docs/AI-AND-LEARNING.md §4).
 *
 * @typedef {import('./domain/types.js').Decision} Decision
 * @typedef {Object} Expectation
 * @property {string} id
 * @property {import('./domain/types.js').Outcome} outcome
 */

/**
 * @param {Decision[]} decisions
 * @param {Expectation[]} [expected]
 * @returns {{ total: number, paid: number, held: number, escalated: number,
 *   autonomyPct: number, accuracyPct: number|null, unsafePayments: number, mismatches: string[] }}
 */
export function computeMetrics(decisions, expected = []) {
  const total = decisions.length;
  const count = (/** @type {string} */ o) => decisions.filter((d) => d.outcome === o).length;
  const byId = new Map(expected.map((e) => [e.id, e.outcome]));

  const mismatches = decisions
    .filter((d) => byId.has(d.invoiceId) && byId.get(d.invoiceId) !== d.outcome)
    .map((d) => `${d.invoiceId}: esperado ${byId.get(d.invoiceId)}, obtenido ${d.outcome}`);

  // Pago inseguro: el agente pagó algo que no debía pagarse.
  const unsafePayments = decisions.filter((d) => d.outcome === 'PAY'
    && (byId.get(d.invoiceId) ?? 'PAY') !== 'PAY').length;

  const comparable = decisions.filter((d) => byId.has(d.invoiceId)).length;
  const pct = (/** @type {number} */ n, /** @type {number} */ d) => (d === 0 ? 0 : Math.round((n / d) * 1000) / 10);

  return {
    total,
    paid: count('PAY'),
    held: count('HOLD'),
    escalated: count('ESCALATE'),
    autonomyPct: pct(total - count('ESCALATE'), total),
    accuracyPct: comparable === 0 ? null : pct(comparable - mismatches.length, comparable),
    unsafePayments,
    mismatches,
  };
}
