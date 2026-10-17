// @ts-check
/**
 * Validadores de datos de pago que aplican en cualquier país.
 * Verifican formato y dígitos de control, no identidad (fuera del alcance del reto).
 */

/** Divisas ISO-4217 con 0 decimales (no se dividen en centavos). */
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'CLP', 'ISK', 'VND', 'XAF', 'XOF', 'PYG', 'UGX', 'RWF', 'KMF', 'DJF']);
const THREE_DECIMAL = new Set(['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND']);

/** @param {string} code @returns {number} decimales que admite la divisa */
export const currencyDecimals = (code) => {
  const c = code.toUpperCase();
  if (ZERO_DECIMAL.has(c)) return 0;
  if (THREE_DECIMAL.has(c)) return 3;
  return 2;
};

/** @param {unknown} code @returns {boolean} tres letras mayúsculas */
export const isCurrencyCode = (code) => typeof code === 'string' && /^[A-Z]{3}$/.test(code);

/** @param {unknown} code @returns {boolean} país ISO-3166-1 alfa-2 */
export const isCountryCode = (code) => typeof code === 'string' && /^[A-Z]{2}$/.test(code);

/**
 * IBAN: formato y dígito de control módulo 97 (ISO 13616).
 * @param {string} value
 * @returns {boolean}
 */
export function isValidIban(value) {
  const iban = String(value).toUpperCase().replace(/[\s-]/g, '');
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = [...rearranged].map((ch) => (/[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch)).join('');
  let remainder = 0;
  for (const ch of digits) remainder = (remainder * 10 + Number(ch)) % 97;
  return remainder === 1;
}

/**
 * BIC/SWIFT: 8 u 11 caracteres, con país ISO válido en las posiciones 5-6.
 * @param {string} value
 */
export const isValidBic = (value) => /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(String(value).toUpperCase().trim());

/**
 * Número de cuenta de EE. UU.: ABA routing de 9 dígitos con su suma de control.
 * @param {string} value
 */
export function isValidAbaRouting(value) {
  const n = String(value).replace(/\D/g, '');
  if (n.length !== 9) return false;
  const w = [3, 7, 1, 3, 7, 1, 3, 7, 1];
  const sum = [...n].reduce((acc, d, i) => acc + Number(d) * w[i], 0);
  return sum % 10 === 0;
}

/**
 * Fecha ISO YYYY-MM-DD real (rechaza 2026-02-31).
 * @param {unknown} value
 */
export function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/**
 * Cuadre aritmético de la factura, en la escala de la divisa.
 * total = subtotal + impuestos − retenciones, con tolerancia de una unidad mínima.
 * @param {{ subtotal: number, tax?: number, withholdings?: number, total: number, currency: string }} inv
 * @returns {{ ok: boolean, expected: number, difference: number }}
 */
export function checkTotals({ subtotal, tax = 0, withholdings = 0, total, currency }) {
  const factor = 10 ** currencyDecimals(currency);
  const round = (/** @type {number} */ n) => Math.round(n * factor) / factor;
  const expected = round(subtotal + tax - withholdings);
  const difference = round(Math.abs(expected - total));
  return { ok: difference <= 1 / factor, expected, difference };
}
