// @ts-check
/** Fábrica de facturas y contexto para las pruebas. Datos ficticios. */
import { readFileSync } from 'node:fs';
import { MockAccountSource } from '../../src/integrations/blinka/account-source.js';
import { DEFAULT_RULES } from '../../src/config/default-rules.js';

export const COMPANY = JSON.parse(readFileSync(new URL('../../data/company.json', import.meta.url), 'utf8'));
export const NOW = new Date('2026-10-16T12:00:00Z');

/** Factura que cumple todas las reglas (contraparte cp-04, contrato CT-2026-004). */
export const baseInvoice = () => ({
  id: 'INV-TEST', source: 'pdf', invoiceNumber: 'DP-5001',
  counterpartyName: 'DataPampa S.R.L.', counterpartyTaxId: '30-71234567-8',
  amount: 2800, currency: 'USD', issueDate: '2026-10-10', dueDate: '2026-10-30',
  contractRef: 'CT-2026-004', bank: { bankName: 'Banco del Plata', accountLast4: '7730' },
  concept: 'Analítica de datos octubre',
  confidence: { counterpartyName: 0.97, amount: 0.99, currency: 0.99, issueDate: 0.96, invoiceNumber: 0.95 },
  rawText: 'Factura DP-5001 por analítica de datos. Total 2800 USD.',
});

/**
 * @param {Partial<import('../../src/domain/types.js').RulesConfig>} [rules]
 * @param {object} [opts]
 * @returns {import('../../src/rules/helpers.js').RuleContext}
 */
export const makeCtx = (rules = {}, opts = {}) => ({
  rules: { ...DEFAULT_RULES, ...rules },
  account: new MockAccountSource(COMPANY),
  now: NOW,
  lang: 'es',
  ...opts,
});

/** @param {Record<string, unknown>} patch */
export const invoiceWith = (patch) => ({ ...baseInvoice(), ...patch });
