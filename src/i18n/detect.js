// @ts-check
/**
 * Detección del idioma de una factura por palabras clave de facturación.
 * Es un heurístico barato y determinista: no llama a ningún modelo.
 * Si no hay señal clara devuelve null y el llamador usa su propia preferencia.
 */

/** @typedef {import('./messages.js').Lang} Lang */

/** Términos que aparecen en casi toda factura, por idioma. @type {Record<Lang, string[]>} */
const HINTS = {
  es: ['factura', 'cuenta de cobro', 'subtotal', 'iva', 'total a pagar', 'vencimiento', 'cliente', 'proveedor', 'impuesto'],
  en: ['invoice', 'bill to', 'subtotal', 'vat', 'sales tax', 'amount due', 'due date', 'payment terms', 'remit'],
  pt: ['fatura', 'nota fiscal', 'subtotal', 'imposto', 'valor total', 'vencimento', 'cliente', 'fornecedor'],
  fr: ['facture', 'sous-total', 'tva', 'montant', 'échéance', 'client', 'fournisseur', 'net à payer'],
  de: ['rechnung', 'zwischensumme', 'mehrwertsteuer', 'mwst', 'gesamtbetrag', 'fällig', 'kunde', 'lieferant'],
  it: ['fattura', 'imponibile', 'iva', 'totale', 'scadenza', 'cliente', 'fornitore', 'partita iva'],
};

/** Términos ambiguos entre idiomas: valen menos para no decidir por ellos solos. */
const AMBIGUOUS = new Set(['iva', 'subtotal', 'total', 'cliente', 'fornitore', 'fornecedor']);

/** @param {string} s @returns {string} minúsculas y sin tildes */
const strip = (s) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

/**
 * @param {string} text
 * @returns {{ lang: Lang, score: number }[]} puntajes ordenados de mayor a menor
 */
export function scoreLanguages(text) {
  // Minúsculas, sin tildes y con todo separador (saltos, signos, cifras) vuelto espacio,
  // para que "Zwischensumme 100" o "FACTURA N°" reconozcan igual el término.
  const hay = ` ${strip(text).replace(/[^a-z]+/g, ' ').trim()} `;
  return Object.entries(HINTS)
    .map(([lang, terms]) => ({
      lang: /** @type {Lang} */ (lang),
      score: terms.reduce((sum, term) => (
        hay.includes(` ${strip(term)} `) ? sum + (AMBIGUOUS.has(term) ? 1 : 3) : sum
      ), 0),
    }))
    .sort((a, b) => b.score - a.score);
}

/** Puntaje mínimo: equivale a dos términos fuertes, para que una sola palabra no decida. */
const MIN_SCORE = 6;

/**
 * Idioma del documento, o null si no hay evidencia suficiente.
 * Exige un mínimo de señal y ventaja sobre el segundo idioma.
 * @param {string} text
 * @returns {Lang|null}
 */
export function detectLang(text) {
  if (!text || text.trim().length < 10) return null;
  const [best, second] = scoreLanguages(text);
  if (!best || best.score < MIN_SCORE) return null;
  if (second && best.score - second.score < 2) return null;
  return best.lang;
}
