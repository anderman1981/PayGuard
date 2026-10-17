// @ts-check
/**
 * Traducción y formato sensible al idioma.
 * El idioma de salida se elige en este orden: el que pide el usuario
 * (parámetro o cabecera Accept-Language) → el del documento → el de la empresa → inglés.
 */
import { MESSAGES, LANGS, FALLBACK_LANG } from './messages.js';

/** @typedef {import('./messages.js').Lang} Lang */

/** @param {unknown} v @returns {v is Lang} */
export const isLang = (v) => typeof v === 'string' && /** @type {readonly string[]} */ (LANGS).includes(v);

/**
 * Normaliza una etiqueta BCP-47 ("es-CO", "PT_br") al idioma soportado más cercano.
 * @param {string|null|undefined} tag
 * @returns {Lang|null}
 */
export function normalizeLang(tag) {
  if (!tag) return null;
  const base = tag.trim().toLowerCase().replace('_', '-').split('-')[0];
  return isLang(base) ? base : null;
}

/**
 * Elige el idioma de salida con la cadena de preferencia.
 * @param {{ requested?: string|null, acceptLanguage?: string|null, document?: Lang|null, company?: string|null }} pref
 * @returns {Lang}
 */
export function resolveLang(pref) {
  const fromHeader = (pref.acceptLanguage ?? '')
    .split(',')
    .map((part) => normalizeLang(part.split(';')[0]))
    .find(Boolean) ?? null;
  return normalizeLang(pref.requested) ?? fromHeader ?? pref.document ?? normalizeLang(pref.company) ?? FALLBACK_LANG;
}

/**
 * Traduce una clave e interpola {marcadores}.
 * @param {string} key
 * @param {Lang} lang
 * @param {Record<string, string|number>} [vars]
 * @returns {string}
 */
export function t(key, lang, vars = {}) {
  const entry = MESSAGES[key];
  if (!entry) return key;
  const template = entry[lang] ?? entry[FALLBACK_LANG] ?? key;
  return template.replace(/\{(\w+)\}/g, (whole, name) => (name in vars ? String(vars[name]) : whole));
}

/**
 * Formatea un monto en la moneda dada, con las convenciones del idioma.
 * @param {number} amount
 * @param {string} currency  ISO-4217
 * @param {Lang} lang
 */
export function money(amount, currency, lang) {
  return new Intl.NumberFormat(lang, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
}

/**
 * Formatea una fecha YYYY-MM-DD en el idioma dado, sin cambiar de día por zona horaria.
 * @param {string} iso
 * @param {Lang} lang
 */
export function date(iso, lang) {
  return new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
}
