// @ts-check
/**
 * R09 · Límites por pago.
 * Por encima del máximo se frena; por encima del umbral de aprobación se escala.
 */
import { PASS, toUsd } from './helpers.js';

/** @type {import('./helpers.js').Rule} */
export const r09 = {
  id: 'R09',
  nameKey: 'r09.name',
  evaluate(inv, ctx) {
    const usd = toUsd(inv.amount, inv.currency, ctx.rules);
    if (usd === null) return PASS;
    const { maxPerPaymentUSD, humanApprovalAboveUSD } = ctx.rules;
    if (usd > maxPerPaymentUSD) {
      return {
        verdict: 'HOLD',
        messageKey: 'r09.overMax',
        vars: { amount: `${usd} USD`, limit: `${maxPerPaymentUSD} USD` },
        evidence: { amountUsd: usd, maxPerPaymentUSD },
      };
    }
    if (usd > humanApprovalAboveUSD) {
      return {
        verdict: 'ESCALATE',
        messageKey: 'r09.escalate',
        vars: { amount: `${usd} USD`, limit: `${humanApprovalAboveUSD} USD` },
        evidence: { amountUsd: usd, humanApprovalAboveUSD },
      };
    }
    return PASS;
  },
};
