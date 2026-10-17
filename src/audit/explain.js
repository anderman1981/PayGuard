// @ts-check
/**
 * Convierte una decisión en un texto que cualquier persona entiende sin abrir
 * el código (criterio de explicabilidad del reto). Siempre en el idioma pedido.
 */
import { t } from '../i18n/index.js';

/** @typedef {import('../domain/types.js').Decision} Decision */
/** @typedef {import('../i18n/messages.js').Lang} Lang */

/**
 * @param {Decision} decision
 * @param {Lang} [lang]
 * @returns {string}
 */
export function explain(decision, lang = 'es') {
  const title = t('explain.title', lang, { outcome: t(`outcome.${decision.outcome}`, lang) });
  const failed = decision.results.filter((r) => r.verdict !== 'PASS');
  if (failed.length === 0) {
    return `${title}\n${t('explain.because.PAY', lang, { count: decision.results.length })}`;
  }
  // Se re-traduce desde las claves: la decisión se puede leer en cualquier
  // idioma, sin importar en cuál se evaluó.
  const lines = failed.map((r) => {
    const name = r.nameKey ? t(r.nameKey, lang) : r.name;
    const reason = r.messageKey ? t(r.messageKey, lang, r.vars ?? {}) : r.reason;
    return `- ${name} (${r.ruleId}): ${reason}`;
  });
  return [title, t(`explain.because.${decision.outcome}`, lang), ...lines].join('\n');
}

/**
 * Resumen de una línea para listados y para el registro.
 * @param {Decision} decision
 * @param {Lang} [lang]
 * @returns {string}
 */
export function summarize(decision, lang = 'es') {
  const outcome = t(`outcome.${decision.outcome}`, lang);
  const failed = decision.results.filter((r) => r.verdict !== 'PASS');
  return failed.length === 0 ? outcome : `${outcome} · ${failed.map((r) => r.ruleId).join(', ')}`;
}
