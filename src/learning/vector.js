// @ts-check
/**
 * Vectores de texto sin dependencias: bolsa de palabras con pesos, proyectada
 * a un número fijo de dimensiones por hash. Determinista y reproducible, así
 * las pruebas no dependen de ningún servicio externo.
 *
 * Si hay un modelo de embeddings disponible (Ollama o Gemini), se puede
 * sustituir `embed` manteniendo la misma firma: la similitud mejora y el resto
 * del sistema no cambia.
 */

export const DIMENSIONS = 256;

/** Palabras muy comunes en facturas que no distinguen un caso de otro. */
const STOP = new Set([
  'de', 'la', 'el', 'los', 'las', 'del', 'por', 'para', 'con', 'una', 'uno', 'que',
  'the', 'and', 'for', 'with', 'from', 'invoice', 'factura', 'total', 'subtotal',
]);

/**
 * Parte un texto en términos comparables: minúsculas, sin tildes, sin signos.
 * Los números se reducen a su magnitud (1234 → num4) para que montos parecidos
 * se parezcan sin que un centavo cambie el vector.
 * @param {string} text
 * @returns {string[]}
 */
export function tokenize(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => (/^\d+$/.test(w) ? `num${w.length}` : w));
}

/**
 * Hash estable (FNV-1a de 32 bits) para repartir términos entre dimensiones.
 * @param {string} term
 * @returns {number}
 */
export function hashTerm(term) {
  let h = 2166136261;
  for (let i = 0; i < term.length; i += 1) {
    h ^= term.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % DIMENSIONS;
}

/**
 * Vector normalizado de un texto. Un texto vacío da el vector cero.
 * @param {string} text
 * @returns {number[]}
 */
export function embed(text) {
  const vector = new Array(DIMENSIONS).fill(0);
  const terms = tokenize(text);
  for (const term of terms) vector[hashTerm(term)] += 1;
  // Suaviza la frecuencia para que una palabra repetida no domine el vector.
  for (let i = 0; i < DIMENSIONS; i += 1) if (vector[i] > 0) vector[i] = 1 + Math.log(vector[i]);
  const norm = Math.hypot(...vector);
  return norm === 0 ? vector : vector.map((v) => v / norm);
}

/**
 * Similitud coseno entre dos vectores normalizados: 0 (nada que ver) a 1 (idénticos).
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
export function cosine(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i += 1) dot += a[i] * b[i];
  return Math.max(0, Math.min(1, dot));
}

/**
 * Texto representativo de una factura para indexarla en la memoria de casos.
 * No incluye el documento ni identificadores completos.
 * @param {import('../domain/types.js').ExtractedInvoice} inv
 * @returns {string}
 */
export const invoiceSignature = (inv) => [
  inv.counterpartyName ?? '',
  inv.concept ?? '',
  inv.currency ?? '',
  inv.contractRef ?? '',
  typeof inv.amount === 'number' ? String(Math.round(inv.amount)) : '',
  inv.source ?? '',
].join(' ');
