// @ts-check
/**
 * Catálogo de mensajes: etiquetas de interfaz más los motivos de cada regla.
 * Ninguna explicación se escribe dentro de la lógica; todo pasa por una clave.
 *
 * @typedef {'es'|'en'|'pt'|'fr'|'de'|'it'} Lang
 */
import { RULES_A } from './messages/rules-a.js';
import { RULES_B } from './messages/rules-b.js';

export const LANGS = /** @type {const} */ (['es', 'en', 'pt', 'fr', 'de', 'it']);
export const FALLBACK_LANG = /** @type {Lang} */ ('en');

/** @type {Record<string, Record<Lang, string>>} */
const UI = {
  'outcome.PAY': { es: 'Pagada', en: 'Paid', pt: 'Paga', fr: 'Payée', de: 'Bezahlt', it: 'Pagata' },
  'outcome.HOLD': { es: 'Frenada', en: 'Held', pt: 'Bloqueada', fr: 'Bloquée', de: 'Gestoppt', it: 'Bloccata' },
  'outcome.ESCALATE': {
    es: 'Pendiente de aprobación', en: 'Pending approval', pt: 'Aguardando aprovação',
    fr: 'En attente d’approbation', de: 'Genehmigung ausstehend', it: 'In attesa di approvazione',
  },
  'verdict.PASS': { es: 'Cumple', en: 'Passes', pt: 'Cumpre', fr: 'Conforme', de: 'Erfüllt', it: 'Conforme' },
  'verdict.HOLD': { es: 'Frena', en: 'Holds', pt: 'Bloqueia', fr: 'Bloque', de: 'Stoppt', it: 'Blocca' },
  'verdict.ESCALATE': { es: 'Escala', en: 'Escalates', pt: 'Escala', fr: 'Escalade', de: 'Eskaliert', it: 'Scala' },
  'explain.title': {
    es: 'Decisión: {outcome}', en: 'Decision: {outcome}', pt: 'Decisão: {outcome}',
    fr: 'Décision : {outcome}', de: 'Entscheidung: {outcome}', it: 'Decisione: {outcome}',
  },
  'explain.because.HOLD': {
    es: 'Se frenó porque:', en: 'Held because:', pt: 'Foi bloqueada porque:',
    fr: 'Bloquée parce que :', de: 'Gestoppt, weil:', it: 'Bloccata perché:',
  },
  'explain.because.ESCALATE': {
    es: 'Necesita aprobación de una persona porque:', en: 'Needs a person’s approval because:',
    pt: 'Precisa da aprovação de uma pessoa porque:', fr: 'Nécessite l’approbation d’une personne parce que :',
    de: 'Benötigt die Genehmigung einer Person, weil:', it: 'Richiede l’approvazione di una persona perché:',
  },
  'explain.because.PAY': {
    es: 'Se aprobó automáticamente: las {count} reglas se cumplen.', en: 'Approved automatically: all {count} rules pass.',
    pt: 'Aprovada automaticamente: as {count} regras cumprem-se.', fr: 'Approuvée automatiquement : les {count} règles sont respectées.',
    de: 'Automatisch freigegeben: alle {count} Regeln erfüllt.', it: 'Approvata automaticamente: tutte le {count} regole sono rispettate.',
  },
};

/** @type {Record<string, Record<Lang, string>>} */
export const MESSAGES = { ...UI, ...RULES_A, ...RULES_B };
