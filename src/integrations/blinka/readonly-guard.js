// @ts-check
/**
 * Guardia de solo lectura para cualquier integración bancaria (Blinka u otra).
 *
 * El reto exige que el agente NUNCA mueva dinero. Esta capa lo garantiza en
 * código, no por convención:
 *  1. Solo permite métodos GET/HEAD.
 *  2. Bloquea rutas que suenan a mover dinero aunque vengan por GET.
 *  3. Rechaza claves de producción (prefijo *_live_) salvo que se habilite
 *     explícitamente PAYGUARD_ALLOW_LIVE_READONLY=1.
 */

export class MoneyMovementBlockedError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'MoneyMovementBlockedError';
  }
}

const SAFE_METHODS = new Set(['GET', 'HEAD']);
const MONEY_PATH_PATTERNS = [
  /payout/i, /transfer/i, /payment/i, /move-money/i, /send/i,
  /convert/i, /withdraw/i, /wire/i, /disburse/i,
];

/**
 * @param {string} method
 * @param {string} path
 */
export function assertReadOnly(method, path) {
  const m = (method || 'GET').toUpperCase();
  if (!SAFE_METHODS.has(m)) {
    throw new MoneyMovementBlockedError(`Bloqueado: método ${m} no permitido (PayGuard es de solo lectura).`);
  }
  if (MONEY_PATH_PATTERNS.some((re) => re.test(path))) {
    throw new MoneyMovementBlockedError(`Bloqueado: la ruta "${path}" corresponde a movimiento de dinero.`);
  }
}

/**
 * @param {string|undefined} apiKey
 * @param {Record<string, string|undefined>} env
 */
export function assertKeyAllowed(apiKey, env = {}) {
  if (!apiKey) return;
  if (/_live_/.test(apiKey) && env.PAYGUARD_ALLOW_LIVE_READONLY !== '1') {
    throw new MoneyMovementBlockedError(
      'Clave de producción detectada. PayGuard usa datos simulados; usa una clave de prueba o el modo mock.',
    );
  }
}

/**
 * Envuelve fetch para que solo pueda leer.
 * @param {{ baseUrl: string, apiKey?: string, env?: Record<string,string|undefined>, fetchImpl?: typeof fetch }} opts
 */
export function createReadOnlyClient({ baseUrl, apiKey, env = {}, fetchImpl = globalThis.fetch }) {
  assertKeyAllowed(apiKey, env);
  return {
    /** @param {string} path @param {RequestInit} [init] */
    async request(path, init = {}) {
      assertReadOnly(init.method ?? 'GET', path);
      const headers = { ...(init.headers || {}), ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) };
      return fetchImpl(new URL(path, baseUrl), { ...init, method: init.method ?? 'GET', headers });
    },
  };
}
