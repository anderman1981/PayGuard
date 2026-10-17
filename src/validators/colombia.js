// @ts-check
/**
 * Validadores de facturación colombiana (docs/VALIDATORS.md §3).
 * Verifican formato y aritmética, no identidad: el reto deja fuera verificar
 * quién es la empresa.
 */
import { checkTotals } from './international.js';

/** Pesos del algoritmo de la DIAN, de derecha a izquierda. */
const WEIGHTS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

/** Tarifas de IVA vigentes en Colombia. */
export const IVA_RATES = [0, 0.05, 0.19];

/** @param {string} nit @returns {string} solo los dígitos, sin puntos ni guion */
export const cleanNit = (nit) => String(nit ?? '').replace(/\D/g, '');

/**
 * Dígito de verificación de un NIT, por el algoritmo módulo 11 de la DIAN.
 * @param {string} nit  con o sin separadores; si trae DV, se ignora
 * @returns {number|null} null si el NIT no es utilizable
 */
export function nitCheckDigit(nit) {
  const base = cleanNit(nit);
  if (base.length < 5 || base.length > WEIGHTS.length) return null;
  const sum = [...base].reverse()
    .reduce((acc, digit, i) => acc + Number(digit) * WEIGHTS[i], 0);
  const rest = sum % 11;
  return rest < 2 ? rest : 11 - rest;
}

/**
 * Comprueba un NIT escrito como "900111222-1".
 * @param {string} value
 * @returns {{ ok: boolean, expected: number|null, got: number|null }}
 */
export function validateNit(value) {
  const text = String(value ?? '').trim();
  const parts = text.split('-');
  const got = parts.length > 1 ? Number(cleanNit(parts[parts.length - 1])) : null;
  const expected = nitCheckDigit(parts[0]);
  if (expected === null) return { ok: false, expected: null, got };
  if (got === null) return { ok: false, expected, got: null };
  return { ok: expected === got, expected, got };
}

/**
 * CUFE de la factura electrónica: 96 caracteres hexadecimales (SHA-384).
 * Solo se valida el formato; no se consulta a la DIAN.
 * @param {string} value
 */
export const isValidCufe = (value) => /^[0-9a-f]{96}$/i.test(String(value ?? '').trim());

/**
 * El IVA corresponde a una tarifa vigente aplicada al subtotal.
 * @param {{ subtotal: number, iva: number }} input
 * @returns {{ ok: boolean, rate: number|null }}
 */
export function validateIva({ subtotal, iva }) {
  if (!Number.isFinite(subtotal) || !Number.isFinite(iva) || subtotal <= 0) return { ok: false, rate: null };
  for (const rate of IVA_RATES) {
    if (Math.abs(subtotal * rate - iva) <= 1) return { ok: true, rate };
  }
  return { ok: false, rate: null };
}

/**
 * Revisión completa de una factura colombiana. Devuelve los problemas encontrados.
 * @param {{ taxId?: string|null, cufe?: string|null, subtotal?: number|null,
 *   iva?: number|null, withholdings?: number|null, total?: number|null }} inv
 * @returns {{ ok: boolean, issues: { code: string, detail: string }[] }}
 */
export function checkColombianInvoice(inv) {
  /** @type {{ code: string, detail: string }[]} */
  const issues = [];

  if (inv.taxId) {
    const nit = validateNit(inv.taxId);
    if (!nit.ok) {
      issues.push({
        code: 'nit',
        detail: nit.expected === null
          ? `NIT ilegible: ${inv.taxId}`
          : `el dígito de verificación debería ser ${nit.expected} y dice ${nit.got}`,
      });
    }
  }
  if (inv.cufe && !isValidCufe(inv.cufe)) {
    issues.push({ code: 'cufe', detail: 'el CUFE no tiene 96 caracteres hexadecimales' });
  }
  if (typeof inv.subtotal === 'number' && typeof inv.iva === 'number') {
    const iva = validateIva({ subtotal: inv.subtotal, iva: inv.iva });
    if (!iva.ok) issues.push({ code: 'iva', detail: 'el IVA no corresponde a una tarifa de 0%, 5% o 19%' });
  }
  if (typeof inv.subtotal === 'number' && typeof inv.total === 'number') {
    const totals = checkTotals({
      subtotal: inv.subtotal,
      tax: inv.iva ?? 0,
      withholdings: inv.withholdings ?? 0,
      total: inv.total,
      currency: 'COP',
    });
    if (!totals.ok) {
      issues.push({ code: 'total', detail: `el total debería ser ${totals.expected} y dice ${inv.total}` });
    }
  }
  return { ok: issues.length === 0, issues };
}
