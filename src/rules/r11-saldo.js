// @ts-check
/** R11 · Hay saldo suficiente en la moneda del pago. */
import { PASS } from './helpers.js';

/** @type {import('./helpers.js').Rule} */
export const r11 = {
  id: 'R11',
  nameKey: 'r11.name',
  evaluate(inv, ctx) {
    const currency = String(inv.currency ?? '').toUpperCase();
    if (!currency || typeof inv.amount !== 'number') return PASS;
    const balance = ctx.account.getBalances()[currency] ?? 0;
    if (balance < inv.amount) {
      return {
        verdict: 'HOLD',
        messageKey: 'r11.fail',
        vars: { balance: `${balance} ${currency}`, amount: `${inv.amount} ${currency}` },
        evidence: { currency, balance, required: inv.amount },
      };
    }
    return PASS;
  },
};
