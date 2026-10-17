// @ts-check
/**
 * Política de decisión. Prioridad fija e inviolable (invariante S2 de SECURITY.md):
 *   cualquier HOLD  → FRENADA
 *   cualquier ESCALATE → PENDIENTE de aprobación humana
 *   todas PASS      → PAGADA
 * Es la única función que puede devolver 'PAY'.
 *
 * @typedef {import('../domain/types.js').Outcome} Outcome
 * @typedef {import('../domain/types.js').RuleResult} RuleResult
 */

/**
 * @param {RuleResult[]} results
 * @returns {Outcome}
 */
export function decide(results) {
  if (!Array.isArray(results) || results.length === 0) return 'ESCALATE';
  if (results.some((r) => r.verdict === 'HOLD')) return 'HOLD';
  if (results.some((r) => r.verdict === 'ESCALATE')) return 'ESCALATE';
  if (results.every((r) => r.verdict === 'PASS')) return 'PAY';
  return 'ESCALATE';
}

/**
 * Reglas que motivaron la decisión (las que no pasaron), para la explicación.
 * @param {RuleResult[]} results
 * @returns {RuleResult[]}
 */
export const blockingResults = (results) => results.filter((r) => r.verdict !== 'PASS');
