// @ts-check
/**
 * Validador de la extracción, escrito a mano (0 dependencias de runtime).
 * Es la frontera entre el modelo y las reglas: nada entra al motor sin pasar
 * por aquí. Rechaza campos desconocidos para que un modelo no pueda inyectar
 * datos que el resto del sistema no espera.
 */
import { isIsoDate, isCurrencyCode } from '../validators/international.js';

/** Campos permitidos en una extracción. Cualquier otro se rechaza. */
export const FIELDS = [
  'id', 'source', 'invoiceNumber', 'counterpartyName', 'counterpartyTaxId',
  'amount', 'currency', 'issueDate', 'dueDate', 'contractRef', 'bank',
  'concept', 'confidence', 'rawText',
];

const SOURCES = new Set(['pdf', 'image', 'email', 'chat']);
const BANK_FIELDS = new Set(['bankName', 'accountLast4', 'iban', 'bic', 'routing']);

/** @param {unknown} v */
const isText = (v) => typeof v === 'string' && v.trim() !== '';
/** @param {unknown} v */
const isNullableText = (v) => v === null || isText(v);

/**
 * Normaliza lo que suele variar entre modelos: espacios, moneda en minúscula,
 * montos escritos como texto ("1.234,56" o "1,234.56").
 * @param {Record<string, unknown>} raw
 * @returns {Record<string, unknown>}
 */
export function normalize(raw) {
  const out = { ...raw };
  if (typeof out.currency === 'string') out.currency = out.currency.trim().toUpperCase();
  for (const key of ['invoiceNumber', 'counterpartyName', 'counterpartyTaxId', 'contractRef', 'concept']) {
    if (typeof out[key] === 'string') out[key] = out[key].trim();
  }
  if (typeof out.amount === 'string') out.amount = parseAmount(out.amount);
  return out;
}

/**
 * Interpreta un monto escrito como texto, con cualquier convención de separadores.
 * Si solo hay un separador y le siguen exactamente tres dígitos, es de miles
 * ("2.800" son dos mil ochocientos, no dos con ocho).
 * @param {string} text
 * @returns {number|null}
 */
export function parseAmount(text) {
  const clean = text.replace(/[^\d.,-]/g, '');
  if (clean === '') return null;
  const commas = (clean.match(/,/g) ?? []).length;
  const dots = (clean.match(/\./g) ?? []).length;
  let plain = clean;
  if (commas > 0 && dots > 0) {
    const decimal = clean.lastIndexOf(',') > clean.lastIndexOf('.') ? ',' : '.';
    plain = clean.replace(decimal === ',' ? /\./g : /,/g, '').replace(',', '.');
  } else if (commas + dots > 0) {
    const sep = commas > 0 ? ',' : '.';
    const tail = clean.slice(clean.lastIndexOf(sep) + 1);
    const thousands = commas + dots > 1 || tail.length === 3;
    plain = thousands ? clean.split(sep).join('') : clean.replace(sep, '.');
  }
  const parsed = Number(plain);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Valida una extracción ya normalizada.
 * @param {unknown} input
 * @returns {{ ok: boolean, errors: string[], value: import('../domain/types.js').ExtractedInvoice|null }}
 */
export function validateExtraction(input) {
  /** @type {string[]} */
  const errors = [];
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: ['la extracción debe ser un objeto'], value: null };
  }
  const raw = normalize(/** @type {Record<string, unknown>} */ (input));

  for (const key of Object.keys(raw)) {
    if (!FIELDS.includes(key)) errors.push(`campo no permitido: ${key}`);
  }
  if (!isText(raw.id)) errors.push('id es obligatorio');
  if (typeof raw.source !== 'string' || !SOURCES.has(raw.source)) errors.push('source debe ser pdf, image, email o chat');
  if (!isText(raw.rawText)) errors.push('rawText es obligatorio');
  if (!isNullableText(raw.invoiceNumber)) errors.push('invoiceNumber debe ser texto o null');
  if (!isNullableText(raw.counterpartyName)) errors.push('counterpartyName debe ser texto o null');
  if (!isNullableText(raw.counterpartyTaxId)) errors.push('counterpartyTaxId debe ser texto o null');
  if (!isNullableText(raw.contractRef)) errors.push('contractRef debe ser texto o null');
  if (typeof raw.concept !== 'string') errors.push('concept debe ser texto');

  if (raw.amount !== null && (typeof raw.amount !== 'number' || !Number.isFinite(raw.amount) || raw.amount < 0)) {
    errors.push('amount debe ser un número positivo o null');
  }
  if (raw.currency !== null && !isCurrencyCode(String(raw.currency))) {
    errors.push('currency debe ser un código ISO-4217 de tres letras o null');
  }
  for (const key of ['issueDate', 'dueDate']) {
    if (raw[key] !== null && !isIsoDate(raw[key])) errors.push(`${key} debe ser YYYY-MM-DD o null`);
  }
  errors.push(...validateBank(raw.bank), ...validateConfidence(raw.confidence));

  return errors.length === 0
    ? { ok: true, errors: [], value: /** @type {import('../domain/types.js').ExtractedInvoice} */ (raw) }
    : { ok: false, errors, value: null };
}

/** @param {unknown} bank @returns {string[]} */
function validateBank(bank) {
  if (bank === null || bank === undefined) return [];
  if (typeof bank !== 'object' || Array.isArray(bank)) return ['bank debe ser un objeto o null'];
  return Object.entries(bank).flatMap(([key, value]) => {
    if (!BANK_FIELDS.has(key)) return [`bank.${key} no es un campo permitido`];
    return typeof value === 'string' ? [] : [`bank.${key} debe ser texto`];
  });
}

/** @param {unknown} confidence @returns {string[]} */
function validateConfidence(confidence) {
  if (confidence === null || confidence === undefined) return ['confidence es obligatorio'];
  if (typeof confidence !== 'object' || Array.isArray(confidence)) return ['confidence debe ser un objeto'];
  return Object.entries(confidence).flatMap(([key, value]) => (
    typeof value === 'number' && value >= 0 && value <= 1 ? [] : [`confidence.${key} debe estar entre 0 y 1`]
  ));
}
