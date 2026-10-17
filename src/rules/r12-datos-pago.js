// @ts-check
/** R12 · Los datos de pago internacionales son formalmente válidos (IBAN, BIC, routing, moneda). */
import { PASS } from './helpers.js';
import { isValidIban, isValidBic, isValidAbaRouting, isCurrencyCode } from '../validators/international.js';

/** @type {{ field: 'iban'|'bic'|'routing', key: string, check: (v: string) => boolean }[]} */
const BANK_CHECKS = [
  { field: 'iban', key: 'r12.iban', check: isValidIban },
  { field: 'bic', key: 'r12.bic', check: isValidBic },
  { field: 'routing', key: 'r12.aba', check: isValidAbaRouting },
];

/** @type {import('./helpers.js').Rule} */
export const r12 = {
  id: 'R12',
  nameKey: 'r12.name',
  evaluate(inv) {
    const currency = String(inv.currency ?? '');
    if (currency && !isCurrencyCode(currency.toUpperCase())) {
      return { verdict: 'ESCALATE', messageKey: 'r12.currency', vars: { value: currency }, evidence: { currency } };
    }
    const bank = /** @type {Record<string, string|undefined>} */ (inv.bank ?? {});
    for (const { field, key, check } of BANK_CHECKS) {
      const value = bank[field];
      if (value && !check(value)) {
        return { verdict: 'ESCALATE', messageKey: key, vars: { value }, evidence: { field, value } };
      }
    }
    return PASS;
  },
};
