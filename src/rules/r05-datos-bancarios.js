// @ts-check
/** R05 · La cuenta de destino es la registrada para esa contraparte. */
import { PASS, counterpartyOf } from './helpers.js';

/** @type {import('./helpers.js').Rule} */
export const r05 = {
  id: 'R05',
  nameKey: 'r05.name',
  evaluate(inv, ctx) {
    const cp = counterpartyOf(inv, ctx);
    const got = inv.bank?.accountLast4;
    if (!cp || !got) return PASS;
    if (got !== cp.bank.accountLast4) {
      return {
        verdict: 'ESCALATE',
        messageKey: 'r05.fail',
        vars: { got: `****${got}`, expected: `****${cp.bank.accountLast4}` },
        evidence: { counterpartyId: cp.id, expected: cp.bank, got: inv.bank },
      };
    }
    return PASS;
  },
};
