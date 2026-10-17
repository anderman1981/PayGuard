// @ts-check
/** R06 · El monto y la moneda cuadran con el contrato acordado, dentro de su tolerancia. */
import { PASS, contractOf } from './helpers.js';

/** @type {import('./helpers.js').Rule} */
export const r06 = {
  id: 'R06',
  nameKey: 'r06.name',
  evaluate(inv, ctx) {
    const contract = contractOf(inv, ctx);
    if (!contract) {
      return { verdict: 'ESCALATE', messageKey: 'r06.noContract', vars: {}, evidence: { contract: null } };
    }
    if (inv.currency !== contract.currency) {
      return {
        verdict: 'HOLD',
        messageKey: 'r06.currency',
        vars: { contract: contract.id, expected: contract.currency, got: String(inv.currency) },
        evidence: { contractId: contract.id, expected: contract.currency, got: inv.currency },
      };
    }
    const limit = contract.amount * (1 + contract.tolerancePct / 100);
    if (typeof inv.amount !== 'number' || inv.amount > limit) {
      return {
        verdict: 'HOLD',
        messageKey: 'r06.amount',
        vars: {
          got: `${inv.amount} ${contract.currency}`,
          expected: `${contract.amount} ${contract.currency}`,
          contract: contract.id,
          tolerance: contract.tolerancePct,
        },
        evidence: { contractId: contract.id, agreed: contract.amount, invoiced: inv.amount, limit },
      };
    }
    return PASS;
  },
};
