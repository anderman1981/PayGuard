// @ts-check
/**
 * R13 · Reglas del país que emite la factura.
 *
 * Se elige por el país de la contraparte registrada o por la pinta del
 * identificador fiscal. Un país sin validador regional pasa: la capa
 * internacional (R12) ya revisó lo común.
 */
import { PASS, counterpartyOf } from './helpers.js';
import { checkColombianInvoice } from '../validators/colombia.js';

/** Validadores por país. Añadir uno nuevo es agregar una entrada aquí. */
const REGIONAL = {
  /** @param {import('../domain/types.js').ExtractedInvoice} inv */
  CO: (inv) => checkColombianInvoice({
    taxId: inv.counterpartyTaxId,
    cufe: /** @type {string|undefined} */ (/** @type {Record<string, unknown>} */ (inv.bank ?? {}).cufe),
  }),
};

/** Un NIT colombiano es un número de 9 o 10 dígitos con dígito de verificación. */
const looksColombian = (/** @type {string|null} */ taxId) => /^\d{9,10}-\d$/.test(String(taxId ?? '').trim());

/**
 * País que manda en la validación, o null si no se puede saber.
 * @param {import('../domain/types.js').ExtractedInvoice} inv
 * @param {import('./helpers.js').RuleContext} ctx
 * @returns {string|null}
 */
export function countryOf(inv, ctx) {
  const registered = counterpartyOf(inv, ctx)?.country;
  if (registered) return registered;
  return looksColombian(inv.counterpartyTaxId) ? 'CO' : null;
}

/** @type {import('./helpers.js').Rule} */
export const r13 = {
  id: 'R13',
  nameKey: 'r13.name',
  evaluate(inv, ctx) {
    const country = countryOf(inv, ctx);
    const validator = country ? REGIONAL[country] : undefined;
    if (!validator) return PASS;

    const { ok, issues } = validator(inv);
    if (ok) return PASS;
    return {
      verdict: 'ESCALATE',
      messageKey: 'r13.fail',
      vars: { country, detail: issues.map((i) => i.detail).join('; ') },
      evidence: { country, issues },
    };
  },
};
