// @ts-check
/**
 * Catálogo de mensajes. Cada explicación de regla y cada etiqueta de la UI
 * vive aquí, nunca escrita a mano dentro de la lógica.
 * Idiomas soportados: es, en, pt, fr, de, it. Respaldo: en.
 *
 * @typedef {'es'|'en'|'pt'|'fr'|'de'|'it'} Lang
 */

export const LANGS = /** @type {const} */ (['es', 'en', 'pt', 'fr', 'de', 'it']);
export const FALLBACK_LANG = /** @type {Lang} */ ('en');

/** @type {Record<string, Record<Lang, string>>} */
export const MESSAGES = {
  'outcome.PAY': { es: 'Pagada', en: 'Paid', pt: 'Paga', fr: 'Payée', de: 'Bezahlt', it: 'Pagata' },
  'outcome.HOLD': { es: 'Frenada', en: 'Held', pt: 'Bloqueada', fr: 'Bloquée', de: 'Gestoppt', it: 'Bloccata' },
  'outcome.ESCALATE': {
    es: 'Pendiente de aprobación', en: 'Pending approval', pt: 'Aguardando aprovação',
    fr: 'En attente d’approbation', de: 'Genehmigung ausstehend', it: 'In attesa di approvazione',
  },
  'verdict.PASS': { es: 'Cumple', en: 'Passes', pt: 'Cumpre', fr: 'Conforme', de: 'Erfüllt', it: 'Conforme' },
  'verdict.HOLD': { es: 'Frena', en: 'Holds', pt: 'Bloqueia', fr: 'Bloque', de: 'Stoppt', it: 'Blocca' },
  'verdict.ESCALATE': { es: 'Escala', en: 'Escalates', pt: 'Escala', fr: 'Escalade', de: 'Eskaliert', it: 'Scala' },

  'r01.name': {
    es: 'Datos completos y legibles', en: 'Complete and legible data', pt: 'Dados completos e legíveis',
    fr: 'Données complètes et lisibles', de: 'Vollständige und lesbare Daten', it: 'Dati completi e leggibili',
  },
  'r01.fail': {
    es: 'Faltan datos o la lectura no es confiable: {fields}',
    en: 'Missing or low-confidence fields: {fields}',
    pt: 'Faltam dados ou a leitura não é confiável: {fields}',
    fr: 'Champs manquants ou peu fiables : {fields}',
    de: 'Fehlende oder unsichere Felder: {fields}',
    it: 'Dati mancanti o poco affidabili: {fields}',
  },
  'r02.name': {
    es: 'Sin instrucciones ocultas', en: 'No embedded instructions', pt: 'Sem instruções ocultas',
    fr: 'Aucune instruction cachée', de: 'Keine versteckten Anweisungen', it: 'Nessuna istruzione nascosta',
  },
  'r02.fail': {
    es: 'El documento intenta dar órdenes al sistema: «{match}»',
    en: 'The document tries to instruct the system: “{match}”',
    pt: 'O documento tenta dar ordens ao sistema: «{match}»',
    fr: 'Le document tente de donner des ordres au système : « {match} »',
    de: 'Das Dokument versucht, dem System Anweisungen zu geben: „{match}“',
    it: 'Il documento tenta di impartire ordini al sistema: «{match}»',
  },
  'r03.name': {
    es: 'Sin cobro duplicado', en: 'No duplicate charge', pt: 'Sem cobrança duplicada',
    fr: 'Pas de double facturation', de: 'Keine Doppelbelastung', it: 'Nessun addebito duplicato',
  },
  'r03.fail': {
    es: 'Ya se pagó {invoice} a este proveedor el {date}',
    en: 'Invoice {invoice} was already paid to this vendor on {date}',
    pt: 'A fatura {invoice} já foi paga a este fornecedor em {date}',
    fr: 'La facture {invoice} a déjà été payée à ce fournisseur le {date}',
    de: 'Rechnung {invoice} wurde diesem Lieferanten am {date} bereits bezahlt',
    it: 'La fattura {invoice} è già stata pagata a questo fornitore il {date}',
  },
  'r04.name': {
    es: 'Beneficiario permitido', en: 'Allowed beneficiary', pt: 'Beneficiário permitido',
    fr: 'Bénéficiaire autorisé', de: 'Zugelassener Empfänger', it: 'Beneficiario consentito',
  },
  'r04.fail': {
    es: '«{name}» no está en la lista de beneficiarios permitidos',
    en: '“{name}” is not on the allowed beneficiary list',
    pt: '«{name}» não está na lista de beneficiários permitidos',
    fr: '« {name} » ne figure pas sur la liste des bénéficiaires autorisés',
    de: '„{name}“ steht nicht auf der Liste zugelassener Empfänger',
    it: '«{name}» non è nell’elenco dei beneficiari consentiti',
  },
  'r09.name': {
    es: 'Límite por pago', en: 'Per-payment limit', pt: 'Limite por pagamento',
    fr: 'Limite par paiement', de: 'Limit pro Zahlung', it: 'Limite per pagamento',
  },
  'r09.escalate': {
    es: '{amount} supera el umbral de aprobación ({limit})',
    en: '{amount} exceeds the approval threshold ({limit})',
    pt: '{amount} ultrapassa o limite de aprovação ({limit})',
    fr: '{amount} dépasse le seuil d’approbation ({limit})',
    de: '{amount} überschreitet die Genehmigungsgrenze ({limit})',
    it: '{amount} supera la soglia di approvazione ({limit})',
  },
  'explain.title': {
    es: 'Decisión: {outcome}', en: 'Decision: {outcome}', pt: 'Decisão: {outcome}',
    fr: 'Décision : {outcome}', de: 'Entscheidung: {outcome}', it: 'Decisione: {outcome}',
  },
};
