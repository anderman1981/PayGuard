// @ts-check
/** R01 · Los campos necesarios están presentes y leídos con suficiente confianza. */
import { PASS } from './helpers.js';

const REQUIRED = ['counterpartyName', 'amount', 'currency', 'issueDate', 'invoiceNumber'];

/** @type {import('./helpers.js').Rule} */
export const r01 = {
  id: 'R01',
  nameKey: 'r01.name',
  evaluate(inv, ctx) {
    const min = ctx.rules.minExtractionConfidence;
    const bad = REQUIRED.filter((f) => {
      const value = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (inv))[f];
      const missing = value === null || value === undefined || value === '';
      return missing || (inv.confidence?.[f] ?? 0) < min;
    });
    if (bad.length === 0) return PASS;
    return {
      verdict: 'ESCALATE',
      messageKey: 'r01.fail',
      vars: { fields: bad.join(', ') },
      evidence: { fields: bad, minConfidence: min, confidence: inv.confidence },
    };
  },
};
