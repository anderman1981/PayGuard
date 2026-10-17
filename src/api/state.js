// @ts-check
/**
 * Estado de la demo en memoria. Se reinicia con cada despliegue a propósito:
 * es un prototipo con datos ficticios, no un sistema con persistencia.
 */
import { readFileSync } from 'node:fs';
import { DEFAULT_RULES } from '../config/default-rules.js';
import { MockAccountSource } from '../integrations/blinka/account-source.js';
import { AuditLog } from '../audit/log.js';
import { CaseStore } from '../learning/store.js';

/** @param {URL} companyUrl @param {Date} now */
export function createState(companyUrl, now = new Date()) {
  const company = JSON.parse(readFileSync(companyUrl, 'utf8'));
  return {
    company,
    rules: structuredClone(DEFAULT_RULES),
    account: new MockAccountSource(company),
    audit: new AuditLog(),
    cases: new CaseStore(),
    /** @type {Map<string, import('../domain/types.js').Decision>} */
    decisions: new Map(),
    /** Facturas ya procesadas, para poder revalidar al aprobar.
     *  @type {Map<string, import('../domain/types.js').ExtractedInvoice>} */
    invoices: new Map(),
    /** @type {import('../learning/advisor.js').Proposal[]} */
    proposals: [],
    now,
  };
}

/** @typedef {ReturnType<typeof createState>} AppState */

/**
 * Contexto de reglas para la petición actual.
 * @param {AppState} state
 * @param {import('../i18n/messages.js').Lang} lang
 * @returns {import('../rules/helpers.js').RuleContext}
 */
export const ruleContext = (state, lang) => ({
  rules: state.rules, account: state.account, now: state.now, lang,
});
