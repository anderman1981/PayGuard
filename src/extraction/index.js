// @ts-check
/**
 * M2 · Extracción: convierte un documento en datos estructurados.
 *
 * El modelo solo lee. No decide, no hace cuentas y no tiene herramientas: su
 * salida pasa por el validador antes de llegar al motor de reglas, y el
 * contenido del documento se le entrega marcado como dato, nunca como
 * instrucción (invariantes S4 y S5 de SECURITY.md).
 *
 * Dos modos:
 *  - `cache`: usa la extracción dorada del manifiesto. Es lo que corre en la
 *    demo pública y en las pruebas, así que no se llama a ningún modelo.
 *  - `live`: cadena de proveedores con respaldo. Si ninguno responde, devuelve
 *    una extracción con confianza 0 y R01 escala el caso a una persona.
 *
 * @typedef {Object} Doc
 * @property {string} id
 * @property {'pdf'|'image'|'email'|'chat'} source
 * @property {string} [text]
 * @property {Uint8Array} [bytes]
 * @property {string} [mime]
 *
 * @typedef {Object} ExtractOptions
 * @property {'cache'|'live'} [mode]
 * @property {{ id: string, extraction: unknown }[]} [manifest]
 * @property {Record<string, string|undefined>} [env]
 * @property {typeof fetch} [fetchImpl]
 * @property {number} [timeoutMs]
 * @property {import('./providers.js').CircuitBreaker} [breaker]
 * @property {string[]} [hints]  proveedores ya vistos, que aporta la memoria de casos
 */
import { validateExtraction } from './schema.js';
import { PROVIDERS, CircuitBreaker, QuotaError } from './providers.js';
import { buildPrompt } from './prompt.js';

/** Extracción vacía: todo en null y confianza 0, para que R01 escale. */
export function emptyExtraction(/** @type {Doc} */ doc, /** @type {string} */ reason) {
  return {
    id: doc.id,
    source: doc.source,
    invoiceNumber: null,
    counterpartyName: null,
    counterpartyTaxId: null,
    amount: null,
    currency: null,
    issueDate: null,
    dueDate: null,
    contractRef: null,
    bank: null,
    concept: '',
    confidence: { counterpartyName: 0, amount: 0, currency: 0, issueDate: 0, invoiceNumber: 0 },
    rawText: doc.text ?? `[${reason}]`,
  };
}

/** Saca el objeto JSON de una respuesta que puede venir con texto alrededor. */
export function parseJson(/** @type {string} */ text) {
  const trimmed = String(text ?? '').replace(/^```(?:json)?|```$/gm, '').trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Extrae los datos de un documento.
 * @param {Doc} doc
 * @param {ExtractOptions} [options]
 * @returns {Promise<{ invoice: import('../domain/types.js').ExtractedInvoice, provider: string,
 *   attempts: {provider: string, error: string}[] }>}
 */
export async function extractInvoice(doc, options = {}) {
  const {
    mode = 'cache', manifest = [], env = {}, fetchImpl = globalThis.fetch,
    timeoutMs = 20000, breaker = new CircuitBreaker(), hints = [],
  } = options;

  if (mode === 'cache') {
    const entry = manifest.find((m) => m.id === doc.id);
    const checked = validateExtraction(entry?.extraction);
    if (!checked.ok) {
      return { invoice: emptyExtraction(doc, 'sin extracción en caché'), provider: 'cache', attempts: [] };
    }
    return { invoice: checked.value, provider: 'cache', attempts: [] };
  }

  const prompt = buildPrompt(doc, hints);
  const binary = doc.bytes && (doc.source === 'pdf' || doc.source === 'image');
  /** @type {{provider: string, error: string}[]} */
  const attempts = [];

  for (const provider of PROVIDERS) {
    const key = provider.key(env);
    if (!key || breaker.isOpen(provider.name)) continue;
    if (binary && !provider.vision) continue;

    try {
      const raw = await provider.call({
        prompt,
        text: doc.text,
        base64: binary ? Buffer.from(doc.bytes ?? new Uint8Array()).toString('base64') : undefined,
        mime: doc.mime,
      }, key, fetchImpl, timeoutMs);

      const parsed = parseJson(raw);
      if (!parsed) throw new Error('la respuesta no trae JSON válido');
      const checked = validateExtraction({ ...parsed, id: doc.id, source: doc.source, rawText: doc.text ?? raw });
      if (!checked.ok) throw new Error(`extracción inválida: ${checked.errors.join('; ')}`);
      return { invoice: checked.value, provider: provider.name, attempts };
    } catch (err) {
      const error = /** @type {Error} */ (err);
      attempts.push({ provider: provider.name, error: error.message });
      breaker.record(provider.name, error instanceof QuotaError);
    }
  }

  return { invoice: emptyExtraction(doc, 'ningún proveedor respondió'), provider: 'none', attempts };
}

export { validateExtraction, CircuitBreaker };
