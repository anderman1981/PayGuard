// @ts-check
/**
 * Memoria de casos: qué se decidió antes y, sobre todo, qué resolvió la persona
 * cuando se le escaló. Es la base del aprendizaje (docs/AI-AND-LEARNING.md).
 *
 * Nunca guarda el documento, el texto completo ni identificadores o cuentas
 * completas: solo lo necesario para reconocer un caso parecido.
 *
 * @typedef {import('../domain/types.js').Outcome} Outcome
 * @typedef {import('../domain/types.js').ExtractedInvoice} ExtractedInvoice
 *
 * @typedef {Object} CaseRecord
 * @property {string} id
 * @property {string} signature          texto indexado (sin datos sensibles)
 * @property {number[]} vector
 * @property {string|null} counterpartyName
 * @property {number|null} amountUsd
 * @property {Outcome} agentOutcome      lo que decidió el agente
 * @property {string[]} failedRules      reglas que no pasaron
 * @property {'approved'|'rejected'|null} humanResolution  lo que hizo la persona
 * @property {string|null} humanReason
 * @property {string} createdAt
 *
 * @typedef {Object} SimilarCase
 * @property {CaseRecord} record
 * @property {number} similarity
 */
import { embed, cosine, invoiceSignature } from './vector.js';

/** Enmascara un identificador o cuenta dejando solo los últimos 4 caracteres. */
export const mask = (/** @type {string|null|undefined} */ v) =>
  (v ? `****${String(v).slice(-4)}` : null);

export class CaseStore {
  /** @param {CaseRecord[]} [records] */
  constructor(records = []) {
    /** @type {CaseRecord[]} */
    this.records = structuredClone(records);
  }

  /**
   * Registra un caso resuelto por el agente.
   * @param {{ invoice: ExtractedInvoice, outcome: Outcome, failedRules: string[], amountUsd: number|null, now?: Date }} input
   * @returns {CaseRecord}
   */
  add({ invoice, outcome, failedRules, amountUsd, now = new Date() }) {
    const signature = invoiceSignature(invoice);
    /** @type {CaseRecord} */
    const record = {
      id: invoice.id,
      signature,
      vector: embed(signature),
      counterpartyName: invoice.counterpartyName ?? null,
      amountUsd,
      agentOutcome: outcome,
      failedRules: [...failedRules],
      humanResolution: null,
      humanReason: null,
      createdAt: now.toISOString(),
    };
    this.records = [...this.records.filter((r) => r.id !== record.id), record];
    return record;
  }

  /**
   * Anota lo que resolvió la persona. Es la señal más valiosa del aprendizaje.
   * @param {string} id
   * @param {'approved'|'rejected'} resolution
   * @param {string} reason
   * @returns {boolean} false si el caso no existe
   */
  resolve(id, resolution, reason) {
    const record = this.records.find((r) => r.id === id);
    if (!record) return false;
    record.humanResolution = resolution;
    record.humanReason = reason;
    return true;
  }

  /**
   * Casos más parecidos a una factura, de mayor a menor similitud.
   * @param {ExtractedInvoice} invoice
   * @param {{ k?: number, minSimilarity?: number }} [opts]
   * @returns {SimilarCase[]}
   */
  similarTo(invoice, { k = 5, minSimilarity = 0.5 } = {}) {
    const vector = embed(invoiceSignature(invoice));
    return this.records
      .filter((r) => r.id !== invoice.id)
      .map((record) => ({ record, similarity: cosine(vector, record.vector) }))
      .filter((c) => c.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);
  }

  /** @returns {CaseRecord[]} copia para serializar o auditar */
  export() { return structuredClone(this.records); }

  /** @returns {{ total: number, resolved: number, approved: number, rejected: number }} */
  stats() {
    const resolved = this.records.filter((r) => r.humanResolution !== null);
    return {
      total: this.records.length,
      resolved: resolved.length,
      approved: resolved.filter((r) => r.humanResolution === 'approved').length,
      rejected: resolved.filter((r) => r.humanResolution === 'rejected').length,
    };
  }
}
