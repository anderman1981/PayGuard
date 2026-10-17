// @ts-check
/**
 * Modelo de dominio de PayGuard.
 * JavaScript ESM sin dependencias: corre igual en Node (tests, CLI) y en el
 * navegador (demo publicada en GitHub Pages). Los tipos van en JSDoc.
 */

/** @typedef {'USD'|'COP'|'MXN'|'ARS'|'EUR'} Currency */

/**
 * Resultado final de una factura.
 * PAY = pagar · HOLD = frenar · ESCALATE = pendiente de aprobación humana
 * @typedef {'PAY'|'HOLD'|'ESCALATE'} Outcome
 */

/** @typedef {'PASS'|'HOLD'|'ESCALATE'} RuleVerdict */

/**
 * Contraparte (proveedor o contratista) registrada por la empresa.
 * @typedef {Object} Counterparty
 * @property {string} id
 * @property {string} name
 * @property {string} taxId
 * @property {string} country        ISO-2
 * @property {Currency} currency
 * @property {{ bankName: string, accountLast4: string }} bank
 * @property {boolean} allowed       true = está en la lista de beneficiarios permitidos
 */

/**
 * Contrato u orden de compra contra el que se compara cada factura.
 * @typedef {Object} Contract
 * @property {string} id
 * @property {string} counterpartyId
 * @property {string} description
 * @property {number} amount
 * @property {Currency} currency
 * @property {number} tolerancePct  diferencia aceptada contra lo acordado (ej. 2 = 2%)
 * @property {'monthly'|'one-off'} period
 * @property {boolean} active
 */

/**
 * Datos que el extractor (LLM o caché) saca de una factura.
 * @typedef {Object} ExtractedInvoice
 * @property {string} id                 id interno del documento
 * @property {'pdf'|'image'|'email'|'chat'} source
 * @property {string|null} invoiceNumber
 * @property {string|null} counterpartyName
 * @property {string|null} counterpartyTaxId
 * @property {number|null} amount
 * @property {Currency|string|null} currency
 * @property {string|null} issueDate    YYYY-MM-DD
 * @property {string|null} dueDate      YYYY-MM-DD
 * @property {string|null} contractRef
 * @property {{ bankName?: string|null, accountLast4?: string|null }|null} bank
 * @property {string} concept
 * @property {Record<string, number>} confidence   0..1 por campo
 * @property {string} rawText            texto original (se revisa contra manipulación)
 */

/**
 * Reglas que la empresa configura desde la pantalla.
 * @typedef {Object} RulesConfig
 * @property {number} humanApprovalAboveUSD   por encima → escalar
 * @property {number} maxPerPaymentUSD        por encima → frenar (ni con aprobación sale solo)
 * @property {number} periodBudgetUSD         presupuesto total del periodo
 * @property {Currency[]} allowedCurrencies
 * @property {string[]} allowedCountries
 * @property {number} minExtractionConfidence 0..1
 * @property {number} duplicateWindowDays
 * @property {number} maxDaysOverdue          vencida hace más de N días → escalar
 * @property {Record<string, number>} fxToUSD  tabla fija de conversión (1 unidad → USD)
 */

/**
 * @typedef {Object} RuleResult
 * @property {string} ruleId
 * @property {string} name           nombre ya traducido
 * @property {string} [nameKey]      clave del nombre, para re-traducir a otro idioma
 * @property {RuleVerdict} verdict
 * @property {string} reason          motivo ya traducido, legible sin abrir el código
 * @property {string} [messageKey]    clave del motivo, para re-traducir
 * @property {Record<string, string|number>} [vars]
 * @property {Record<string, unknown>} evidence
 */

/**
 * @typedef {Object} Decision
 * @property {string} invoiceId
 * @property {Outcome} outcome
 * @property {RuleResult[]} results
 * @property {string} summary
 * @property {string} decidedAt
 * @property {'agent'|'human'} decidedBy
 */

export const OUTCOME_LABEL_ES = /** @type {const} */ ({
  PAY: 'Pagada',
  HOLD: 'Frenada',
  ESCALATE: 'Pendiente de aprobación',
});

export {};
