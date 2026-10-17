// @ts-check
/**
 * Registro de auditoría encadenado. Cada entrada incluye el hash de la anterior,
 * así que alterar o borrar una entrada rompe la cadena y `verify()` lo detecta
 * (invariante S6 de SECURITY.md).
 *
 * Usa crypto.subtle, disponible tanto en Node como en el navegador.
 *
 * @typedef {'decision'|'approval'|'rejection'|'rules-change'|'proposal'} EntryType
 *
 * @typedef {Object} AuditEntry
 * @property {number} index
 * @property {EntryType} type
 * @property {string|null} invoiceId
 * @property {string} actor            'agent' o el nombre de la persona
 * @property {Record<string, unknown>} payload
 * @property {string} at               ISO
 * @property {string} prevHash
 * @property {string} hash
 */

export const GENESIS_HASH = '0'.repeat(64);

/**
 * Hash SHA-256 en hexadecimal.
 * @param {string} text
 * @returns {Promise<string>}
 */
export async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Texto canónico: mismas claves en el mismo orden a cualquier profundidad, para
 * que el hash dependa del contenido completo y no del orden de serialización.
 * @param {unknown} value
 * @returns {string}
 */
export function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const entries = Object.keys(/** @type {Record<string, unknown>} */ (value)).sort()
    .map((k) => `${JSON.stringify(k)}:${canonical(/** @type {Record<string, unknown>} */ (value)[k])}`);
  return `{${entries.join(',')}}`;
}

export class AuditLog {
  /** @param {AuditEntry[]} [entries] */
  constructor(entries = []) {
    /** @type {AuditEntry[]} */
    this.entries = structuredClone(entries);
  }

  /** @returns {string} hash de la última entrada, o el génesis si está vacío */
  head() {
    return this.entries.length === 0 ? GENESIS_HASH : this.entries[this.entries.length - 1].hash;
  }

  /**
   * Agrega una entrada al final de la cadena.
   * @param {{ type: EntryType, invoiceId?: string|null, actor?: string, payload?: Record<string, unknown>, at?: Date }} input
   * @returns {Promise<AuditEntry>}
   */
  async append({ type, invoiceId = null, actor = 'agent', payload = {}, at = new Date() }) {
    const base = {
      index: this.entries.length,
      type,
      invoiceId,
      actor,
      payload,
      at: at.toISOString(),
      prevHash: this.head(),
    };
    /** @type {AuditEntry} */
    const entry = { ...base, hash: await sha256(canonical(base)) };
    this.entries.push(entry);
    return entry;
  }

  /**
   * Recalcula toda la cadena. Devuelve el índice de la primera entrada alterada.
   * @returns {Promise<{ ok: boolean, brokenAt: number|null, length: number }>}
   */
  async verify() {
    let prevHash = GENESIS_HASH;
    for (const entry of this.entries) {
      const { hash, ...base } = entry;
      if (entry.prevHash !== prevHash || (await sha256(canonical(base))) !== hash) {
        return { ok: false, brokenAt: entry.index, length: this.entries.length };
      }
      prevHash = hash;
    }
    return { ok: true, brokenAt: null, length: this.entries.length };
  }

  /** @param {{ invoiceId?: string, type?: EntryType }} [filter] @returns {AuditEntry[]} */
  list(filter = {}) {
    return this.entries.filter((e) => (!filter.invoiceId || e.invoiceId === filter.invoiceId)
      && (!filter.type || e.type === filter.type));
  }
}
