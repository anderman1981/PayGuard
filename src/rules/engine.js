// @ts-check
/**
 * Motor de reglas: corre todas las reglas sobre una factura y traduce su motivo.
 * No decide nada por sí mismo; la decisión la toma `policy.decide`.
 */
import { t } from '../i18n/index.js';
import { r01 } from './r01-datos-completos.js';
import { r02 } from './r02-sin-instrucciones.js';
import { r03 } from './r03-sin-duplicado.js';
import { r04 } from './r04-beneficiario.js';
import { r05 } from './r05-datos-bancarios.js';
import { r06 } from './r06-contrato.js';
import { r07 } from './r07-moneda-pais.js';
import { r08 } from './r08-fechas.js';
import { r09 } from './r09-limites.js';
import { r10 } from './r10-presupuesto.js';
import { r11 } from './r11-saldo.js';
import { r12 } from './r12-datos-pago.js';

/** @typedef {import('./helpers.js').Rule} Rule */
/** @typedef {import('./helpers.js').RuleContext} RuleContext */
/** @typedef {import('../domain/types.js').RuleResult} RuleResult */

/** Catálogo en orden de ejecución. M8 añade aquí sus reglas regionales. @type {Rule[]} */
export const RULES = [r01, r02, r03, r04, r05, r06, r07, r08, r09, r10, r11, r12];

/**
 * Evalúa una factura contra todas las reglas.
 * Una regla que lance una excepción escala: nunca deja pasar un pago.
 * @param {import('../domain/types.js').ExtractedInvoice} inv
 * @param {RuleContext} ctx
 * @returns {RuleResult[]}
 */
export function evaluateInvoice(inv, ctx) {
  const lang = ctx.lang ?? 'es';
  return RULES.map((rule) => {
    try {
      const out = rule.evaluate(inv, ctx);
      return {
        ruleId: rule.id,
        name: t(rule.nameKey, lang),
        verdict: out.verdict,
        reason: out.messageKey ? t(out.messageKey, lang, out.vars ?? {}) : t(`verdict.${out.verdict}`, lang),
        messageKey: out.messageKey ?? `verdict.${out.verdict}`,
        vars: out.vars ?? {},
        evidence: out.evidence ?? {},
      };
    } catch (err) {
      return {
        ruleId: rule.id,
        name: t(rule.nameKey, lang),
        verdict: /** @type {const} */ ('ESCALATE'),
        reason: t('verdict.ESCALATE', lang),
        messageKey: 'verdict.ESCALATE',
        vars: {},
        evidence: { error: String(/** @type {Error} */ (err).message) },
      };
    }
  });
}
