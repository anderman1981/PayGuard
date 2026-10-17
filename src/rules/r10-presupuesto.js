// @ts-check
/** R10 · El pago cabe en el presupuesto del periodo. */
import { PASS, toUsd, periodSpendUsd } from './helpers.js';

/** @type {import('./helpers.js').Rule} */
export const r10 = {
  id: 'R10',
  nameKey: 'r10.name',
  evaluate(inv, ctx) {
    const usd = toUsd(inv.amount, inv.currency, ctx.rules);
    if (usd === null) return PASS;
    const spent = Math.round(periodSpendUsd(ctx) * 100) / 100;
    const total = Math.round((spent + usd) * 100) / 100;
    if (total > ctx.rules.periodBudgetUSD) {
      return {
        verdict: 'HOLD',
        messageKey: 'r10.fail',
        vars: { amount: `${usd} USD`, total: `${total} USD`, budget: `${ctx.rules.periodBudgetUSD} USD` },
        evidence: { spentUsd: spent, amountUsd: usd, totalUsd: total, budgetUsd: ctx.rules.periodBudgetUSD },
      };
    }
    return PASS;
  },
};
