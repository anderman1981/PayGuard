// @ts-check
/**
 * Fuente de datos de la cuenta (saldos, contrapartes, contratos, historial).
 * Hoy: MockAccountSource sobre data/company.json (empresa ficticia).
 * Mañana: BlinkaAccountSource sobre createReadOnlyClient, con la misma interfaz.
 *
 * @typedef {import('../../domain/types.js').Counterparty} Counterparty
 * @typedef {import('../../domain/types.js').Contract} Contract
 *
 * @typedef {Object} PaidRecord
 * @property {string} counterpartyId
 * @property {string} invoiceNumber
 * @property {number} amount
 * @property {string} currency
 * @property {string} paidAt  YYYY-MM-DD
 *
 * @typedef {Object} AccountSnapshot
 * @property {{ name: string, country: string, period: string }} company
 * @property {Record<string, number>} balances
 * @property {Counterparty[]} counterparties
 * @property {Contract[]} contracts
 * @property {PaidRecord[]} paymentHistory
 */

export class MockAccountSource {
  /** @param {AccountSnapshot} snapshot */
  constructor(snapshot) {
    // Copia profunda: las decisiones simuladas nunca alteran el archivo original.
    this.data = structuredClone(snapshot);
  }
  getCompany() { return this.data.company; }
  getBalances() { return { ...this.data.balances }; }
  listCounterparties() { return [...this.data.counterparties]; }
  listContracts() { return [...this.data.contracts]; }
  listPaymentHistory() { return [...this.data.paymentHistory]; }

  /** @param {string} name @param {string|null} taxId */
  findCounterparty(name, taxId) {
    const norm = (/** @type {string} */ s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
    return this.data.counterparties.find(
      (c) => (taxId && norm(c.taxId) === norm(taxId)) || (name && norm(c.name) === norm(name)),
    ) ?? null;
  }

  /**
   * Registra un pago SIMULADO para que presupuesto, saldo y duplicados
   * se actualicen en la corrida. No hay ninguna llamada externa.
   * @param {PaidRecord} rec
   */
  recordSimulatedPayment(rec) {
    this.data.paymentHistory.push(rec);
    this.data.balances[rec.currency] = (this.data.balances[rec.currency] ?? 0) - rec.amount;
  }
}
