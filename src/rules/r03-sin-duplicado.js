// @ts-check
/** R03 · La factura no se pagó ya, ni por número ni por monto repetido en la ventana. */
import { PASS, counterpartyOf, daysBetween, todayIso } from './helpers.js';

/** @type {import('./helpers.js').Rule} */
export const r03 = {
  id: 'R03',
  nameKey: 'r03.name',
  evaluate(inv, ctx) {
    const cp = counterpartyOf(inv, ctx);
    if (!cp) return PASS;
    const history = ctx.account.listPaymentHistory().filter((p) => p.counterpartyId === cp.id);

    const sameNumber = inv.invoiceNumber
      ? history.find((p) => p.invoiceNumber.toLowerCase() === String(inv.invoiceNumber).toLowerCase())
      : undefined;
    if (sameNumber) {
      return {
        verdict: 'HOLD',
        messageKey: 'r03.number',
        vars: { invoice: sameNumber.invoiceNumber, date: sameNumber.paidAt },
        evidence: { kind: 'invoiceNumber', paid: sameNumber },
      };
    }

    const today = todayIso(ctx.now);
    const window = ctx.rules.duplicateWindowDays;
    const sameAmount = history.find((p) => p.amount === inv.amount
      && p.currency === inv.currency
      && daysBetween(p.paidAt, today) <= window);
    if (sameAmount) {
      return {
        verdict: 'HOLD',
        messageKey: 'r03.amount',
        vars: { amount: `${sameAmount.amount} ${sameAmount.currency}`, date: sameAmount.paidAt, days: window },
        evidence: { kind: 'sameAmount', paid: sameAmount, windowDays: window },
      };
    }
    return PASS;
  },
};
