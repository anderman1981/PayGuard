// @ts-check
/** R07 · La moneda y el país están entre los permitidos por la empresa. */
import { PASS, counterpartyOf } from './helpers.js';

/** @type {import('./helpers.js').Rule} */
export const r07 = {
  id: 'R07',
  nameKey: 'r07.name',
  evaluate(inv, ctx) {
    const currency = String(inv.currency ?? '').toUpperCase();
    if (currency && !ctx.rules.allowedCurrencies.includes(/** @type {never} */ (currency))) {
      return {
        verdict: 'ESCALATE',
        messageKey: 'r07.currency',
        vars: { currency },
        evidence: { currency, allowed: ctx.rules.allowedCurrencies },
      };
    }
    const country = counterpartyOf(inv, ctx)?.country;
    if (country && !ctx.rules.allowedCountries.includes(country)) {
      return {
        verdict: 'ESCALATE',
        messageKey: 'r07.country',
        vars: { country },
        evidence: { country, allowed: ctx.rules.allowedCountries },
      };
    }
    return PASS;
  },
};
