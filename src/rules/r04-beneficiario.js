// @ts-check
/** R04 · El beneficiario está registrado y permitido. */
import { PASS, counterpartyOf } from './helpers.js';

/** @type {import('./helpers.js').Rule} */
export const r04 = {
  id: 'R04',
  nameKey: 'r04.name',
  evaluate(inv, ctx) {
    const name = inv.counterpartyName ?? '';
    const cp = counterpartyOf(inv, ctx);
    if (!cp) {
      return { verdict: 'ESCALATE', messageKey: 'r04.unknown', vars: { name }, evidence: { counterparty: null } };
    }
    if (!cp.allowed) {
      return {
        verdict: 'ESCALATE',
        messageKey: 'r04.notAllowed',
        vars: { name: cp.name },
        evidence: { counterpartyId: cp.id, allowed: false },
      };
    }
    return PASS;
  },
};
