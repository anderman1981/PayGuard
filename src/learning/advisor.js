// @ts-check
/**
 * Consejero: convierte la memoria de casos en ayuda concreta, sin tocar nunca
 * la decisión de las reglas.
 *
 * Regla de oro (docs/AI-AND-LEARNING.md §3): el aprendizaje solo puede volver
 * al sistema MÁS prudente. Puede agregar un escalamiento; no puede quitar ni
 * rebajar el resultado de ninguna regla, ni cambiar un umbral por su cuenta.
 *
 * @typedef {import('./store.js').CaseStore} CaseStore
 * @typedef {import('./store.js').SimilarCase} SimilarCase
 * @typedef {import('../domain/types.js').RuleResult} RuleResult
 * @typedef {import('../domain/types.js').ExtractedInvoice} ExtractedInvoice
 *
 * @typedef {Object} Advice
 * @property {SimilarCase[]} similar          casos parecidos encontrados
 * @property {number} rejectionRate           proporción de parecidos que una persona rechazó
 * @property {boolean} shouldEscalate         true si conviene pedir revisión humana
 * @property {string[]} extractionHints       proveedores ya vistos, como ejemplo para el extractor
 * @property {Proposal[]} proposals           ajustes sugeridos, que una persona debe aprobar
 *
 * @typedef {Object} Proposal
 * @property {string} kind                    'raise-threshold' | 'allow-counterparty'
 * @property {string} subject
 * @property {string} rationale
 * @property {number} evidenceCount
 * @property {'pending'} status               nace pendiente: nunca se aplica solo
 */
import { ADVISOR_DEFAULTS } from './config.js';

/**
 * Analiza una factura contra la memoria de casos.
 * @param {ExtractedInvoice} invoice
 * @param {CaseStore} store
 * @param {Partial<typeof ADVISOR_DEFAULTS>} [options]
 * @returns {Advice}
 */
export function advise(invoice, store, options = {}) {
  const cfg = { ...ADVISOR_DEFAULTS, ...options };
  const similar = store.similarTo(invoice, { k: cfg.k, minSimilarity: cfg.minSimilarity });
  const resolved = similar.filter((c) => c.record.humanResolution !== null);
  const rejected = resolved.filter((c) => c.record.humanResolution === 'rejected');
  const rejectionRate = resolved.length === 0 ? 0 : rejected.length / resolved.length;

  return {
    similar,
    rejectionRate,
    shouldEscalate: resolved.length >= cfg.minEvidence && rejectionRate >= cfg.rejectionThreshold,
    extractionHints: [...new Set(similar.map((c) => c.record.counterpartyName).filter(Boolean))]
      .slice(0, cfg.maxHints),
    proposals: buildProposals(invoice, similar, cfg),
  };
}

/**
 * Propuestas de ajuste. Nacen siempre en estado 'pending'.
 * @param {ExtractedInvoice} invoice
 * @param {SimilarCase[]} similar
 * @param {typeof ADVISOR_DEFAULTS} cfg
 * @returns {Proposal[]}
 */
function buildProposals(invoice, similar, cfg) {
  /** @type {Proposal[]} */
  const proposals = [];
  const name = invoice.counterpartyName;
  if (!name) return proposals;

  const sameVendor = similar.filter((c) => c.record.counterpartyName === name && c.record.humanResolution !== null);
  const allApproved = sameVendor.length >= cfg.minProposalEvidence
    && sameVendor.every((c) => c.record.humanResolution === 'approved');

  if (allApproved) {
    const escalatedByLimit = sameVendor.filter((c) => c.record.failedRules.includes('R09'));
    if (escalatedByLimit.length >= cfg.minProposalEvidence) {
      proposals.push({
        kind: 'raise-threshold',
        subject: name,
        rationale: `${escalatedByLimit.length} facturas de este proveedor se escalaron por monto y una persona las aprobó todas`,
        evidenceCount: escalatedByLimit.length,
        status: 'pending',
      });
    }
    const escalatedByAllowlist = sameVendor.filter((c) => c.record.failedRules.includes('R04'));
    if (escalatedByAllowlist.length >= cfg.minProposalEvidence) {
      proposals.push({
        kind: 'allow-counterparty',
        subject: name,
        rationale: `${escalatedByAllowlist.length} facturas de este proveedor se escalaron por beneficiario y se aprobaron todas`,
        evidenceCount: escalatedByAllowlist.length,
        status: 'pending',
      });
    }
  }
  return proposals;
}

/**
 * Aplica el consejo a los resultados de las reglas.
 * Solo puede AGREGAR un escalamiento; los resultados existentes se devuelven intactos.
 * @param {RuleResult[]} results
 * @param {Advice} advice
 * @param {string} [reason] texto ya traducido
 * @returns {RuleResult[]}
 */
export function applyAdvice(results, advice, reason = 'Casos parecidos fueron rechazados por una persona') {
  if (!advice.shouldEscalate) return results;
  return [...results, {
    ruleId: 'A01',
    name: 'Memoria de casos',
    nameKey: 'a01.name',
    verdict: /** @type {const} */ ('ESCALATE'),
    reason,
    messageKey: 'a01.similarRejected',
    vars: { rate: Math.round(advice.rejectionRate * 100) },
    evidence: {
      rejectionRate: advice.rejectionRate,
      cases: advice.similar.map((c) => ({ id: c.record.id, similarity: Number(c.similarity.toFixed(3)) })),
    },
  }];
}
