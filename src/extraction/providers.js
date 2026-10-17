// @ts-check
/**
 * Cadena de proveedores de extracción con respaldo automático.
 * Orden y política en docs/AI-AND-LEARNING.md §1: Gemini → Groq → OpenRouter → Ollama.
 *
 * Interruptor (circuit breaker): dos fallos seguidos, o uno solo si fue límite
 * de cuota, sacan a ese proveedor del resto de la corrida. Si ninguno responde,
 * el llamador devuelve confianza 0 y R01 escala: nunca se paga a ciegas.
 *
 * @typedef {Object} Provider
 * @property {string} name
 * @property {boolean} vision        puede leer PDF e imagen
 * @property {(env: Record<string, string|undefined>) => string|undefined} key
 * @property {(doc: ProviderDoc, apiKey: string, fetchImpl: typeof fetch, timeoutMs: number) => Promise<string>} call
 *
 * @typedef {Object} ProviderDoc
 * @property {string} prompt
 * @property {string} [text]         contenido textual (correo, chat o texto del PDF)
 * @property {string} [base64]       documento binario en base64
 * @property {string} [mime]
 */

export class QuotaError extends Error {}

/** @param {Response} res */
async function ensureOk(res) {
  if (res.ok) return res;
  const body = await res.text().catch(() => '');
  if (res.status === 429 || /quota|rate.?limit/i.test(body)) throw new QuotaError(`cuota agotada (${res.status})`);
  throw new Error(`respuesta ${res.status}`);
}

/** @param {typeof fetch} fetchImpl @param {string} url @param {RequestInit} init @param {number} timeoutMs */
async function post(fetchImpl, url, init, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { ...init, method: 'POST', signal: controller.signal });
    return await ensureOk(res);
  } finally {
    clearTimeout(timer);
  }
}

/** Mensaje de usuario para proveedores compatibles con el formato de chat. */
const chatBody = (/** @type {string} */ model, /** @type {ProviderDoc} */ doc) => JSON.stringify({
  model,
  temperature: 0,
  response_format: { type: 'json_object' },
  messages: [{ role: 'user', content: `${doc.prompt}\n\n<documento>\n${doc.text ?? ''}\n</documento>` }],
});

/** @type {Provider[]} */
export const PROVIDERS = [
  {
    name: 'gemini',
    vision: true,
    key: (env) => env.GEMINI_API_KEY,
    async call(doc, apiKey, fetchImpl, timeoutMs) {
      const parts = doc.base64
        ? [{ text: doc.prompt }, { inline_data: { mime_type: doc.mime, data: doc.base64 } }]
        : [{ text: `${doc.prompt}\n\n<documento>\n${doc.text ?? ''}\n</documento>` }];
      const res = await post(fetchImpl,
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        {
          headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { temperature: 0, responseMimeType: 'application/json' },
          }),
        }, timeoutMs);
      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    },
  },
  {
    name: 'groq',
    vision: false,
    key: (env) => env.GROQ_API_KEY,
    async call(doc, apiKey, fetchImpl, timeoutMs) {
      const res = await post(fetchImpl, 'https://api.groq.com/openai/v1/chat/completions', {
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: chatBody('llama-3.3-70b-versatile', doc),
      }, timeoutMs);
      return (await res.json())?.choices?.[0]?.message?.content ?? '';
    },
  },
  {
    name: 'openrouter',
    vision: false,
    key: (env) => env.OPENROUTER_API_KEY,
    async call(doc, apiKey, fetchImpl, timeoutMs) {
      const res = await post(fetchImpl, 'https://openrouter.ai/api/v1/chat/completions', {
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: chatBody('meta-llama/llama-3.3-70b-instruct:free', doc),
      }, timeoutMs);
      return (await res.json())?.choices?.[0]?.message?.content ?? '';
    },
  },
  {
    name: 'ollama',
    vision: false,
    key: (env) => env.OLLAMA_HOST,
    async call(doc, host, fetchImpl, timeoutMs) {
      const res = await post(fetchImpl, `${host.replace(/\/$/, '')}/api/chat`, {
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2',
          stream: false,
          format: 'json',
          messages: [{ role: 'user', content: `${doc.prompt}\n\n<documento>\n${doc.text ?? ''}\n</documento>` }],
        }),
      }, timeoutMs);
      return (await res.json())?.message?.content ?? '';
    },
  },
];

/** Lleva la cuenta de fallos por proveedor dentro de una corrida. */
export class CircuitBreaker {
  constructor(/** @type {number} */ maxFailures = 2) {
    this.maxFailures = maxFailures;
    /** @type {Map<string, number>} */
    this.failures = new Map();
    /** @type {Set<string>} */
    this.open = new Set();
  }

  /** @param {string} name */
  isOpen(name) { return this.open.has(name); }

  /** @param {string} name @param {boolean} quota un límite de cuota abre el circuito de inmediato */
  record(name, quota = false) {
    const count = (this.failures.get(name) ?? 0) + 1;
    this.failures.set(name, count);
    if (quota || count >= this.maxFailures) this.open.add(name);
    return this.open.has(name);
  }

  /** @param {string} name */
  reset(name) { this.failures.delete(name); this.open.delete(name); }
}
