// @ts-check
/** Mensajes de las reglas R01–R06. Una clave por motivo; el verdicto PASS usa 'verdict.PASS'. */

/** @type {Record<string, Record<import('../messages.js').Lang, string>>} */
export const RULES_A = {
  'r01.name': {
    es: 'Datos completos y legibles', en: 'Complete and legible data', pt: 'Dados completos e legíveis',
    fr: 'Données complètes et lisibles', de: 'Vollständige und lesbare Daten', it: 'Dati completi e leggibili',
  },
  'r01.fail': {
    es: 'Faltan datos o la lectura no es confiable: {fields}', en: 'Missing or low-confidence fields: {fields}',
    pt: 'Faltam dados ou a leitura não é confiável: {fields}', fr: 'Champs manquants ou peu fiables : {fields}',
    de: 'Fehlende oder unsichere Felder: {fields}', it: 'Dati mancanti o poco affidabili: {fields}',
  },
  'r02.name': {
    es: 'Sin instrucciones ocultas', en: 'No embedded instructions', pt: 'Sem instruções ocultas',
    fr: 'Aucune instruction cachée', de: 'Keine versteckten Anweisungen', it: 'Nessuna istruzione nascosta',
  },
  'r02.fail': {
    es: 'El documento intenta dar órdenes al sistema: «{match}»', en: 'The document tries to instruct the system: “{match}”',
    pt: 'O documento tenta dar ordens ao sistema: «{match}»', fr: 'Le document tente de donner des ordres : « {match} »',
    de: 'Das Dokument versucht, Anweisungen zu geben: „{match}“', it: 'Il documento tenta di impartire ordini: «{match}»',
  },
  'r03.name': {
    es: 'Sin cobro duplicado', en: 'No duplicate charge', pt: 'Sem cobrança duplicada',
    fr: 'Pas de double facturation', de: 'Keine Doppelbelastung', it: 'Nessun addebito duplicato',
  },
  'r03.number': {
    es: 'La factura {invoice} ya se pagó a este proveedor el {date}', en: 'Invoice {invoice} was already paid to this vendor on {date}',
    pt: 'A fatura {invoice} já foi paga a este fornecedor em {date}', fr: 'La facture {invoice} a déjà été payée le {date}',
    de: 'Rechnung {invoice} wurde diesem Lieferanten am {date} bezahlt', it: 'La fattura {invoice} è già stata pagata il {date}',
  },
  'r03.amount': {
    es: 'Mismo proveedor y mismo monto {amount} pagado el {date}, dentro de {days} días',
    en: 'Same vendor and same amount {amount} paid on {date}, within {days} days',
    pt: 'Mesmo fornecedor e valor {amount} pago em {date}, dentro de {days} dias',
    fr: 'Même fournisseur et même montant {amount} payé le {date}, sous {days} jours',
    de: 'Gleicher Lieferant und Betrag {amount} am {date} bezahlt, innerhalb von {days} Tagen',
    it: 'Stesso fornitore e importo {amount} pagato il {date}, entro {days} giorni',
  },
  'r04.name': {
    es: 'Beneficiario permitido', en: 'Allowed beneficiary', pt: 'Beneficiário permitido',
    fr: 'Bénéficiaire autorisé', de: 'Zugelassener Empfänger', it: 'Beneficiario consentito',
  },
  'r04.unknown': {
    es: '«{name}» no está registrado como contraparte', en: '“{name}” is not a registered counterparty',
    pt: '«{name}» não está registado como contraparte', fr: '« {name} » n’est pas une contrepartie enregistrée',
    de: '„{name}“ ist kein registrierter Geschäftspartner', it: '«{name}» non è una controparte registrata',
  },
  'r04.notAllowed': {
    es: '«{name}» no está en la lista de beneficiarios permitidos', en: '“{name}” is not on the allowed beneficiary list',
    pt: '«{name}» não está na lista de beneficiários permitidos', fr: '« {name} » n’est pas sur la liste autorisée',
    de: '„{name}“ steht nicht auf der Liste zugelassener Empfänger', it: '«{name}» non è nell’elenco dei beneficiari consentiti',
  },
  'r05.name': {
    es: 'Datos bancarios conocidos', en: 'Known bank details', pt: 'Dados bancários conhecidos',
    fr: 'Coordonnées bancaires connues', de: 'Bekannte Bankverbindung', it: 'Dati bancari noti',
  },
  'r05.fail': {
    es: 'La cuenta {got} no coincide con la registrada {expected}', en: 'Account {got} does not match the registered {expected}',
    pt: 'A conta {got} não coincide com a registada {expected}', fr: 'Le compte {got} ne correspond pas à {expected}',
    de: 'Konto {got} stimmt nicht mit {expected} überein', it: 'Il conto {got} non corrisponde a {expected}',
  },
  'r06.name': {
    es: 'Coincide con lo acordado', en: 'Matches the agreement', pt: 'Coincide com o acordado',
    fr: 'Conforme à l’accord', de: 'Entspricht der Vereinbarung', it: 'Conforme all’accordo',
  },
  'r06.noContract': {
    es: 'No hay contrato activo para este proveedor', en: 'No active contract for this vendor',
    pt: 'Não há contrato ativo para este fornecedor', fr: 'Aucun contrat actif pour ce fournisseur',
    de: 'Kein aktiver Vertrag für diesen Lieferanten', it: 'Nessun contratto attivo per questo fornitore',
  },
  'r06.currency': {
    es: 'El contrato {contract} está en {expected} y la factura llega en {got}',
    en: 'Contract {contract} is in {expected} but the invoice is in {got}',
    pt: 'O contrato {contract} está em {expected} e a fatura vem em {got}',
    fr: 'Le contrat {contract} est en {expected} et la facture en {got}',
    de: 'Vertrag {contract} lautet auf {expected}, die Rechnung auf {got}',
    it: 'Il contratto {contract} è in {expected} e la fattura in {got}',
  },
  'r06.amount': {
    es: '{got} no cuadra con {expected} del contrato {contract} (tolerancia {tolerance}%)',
    en: '{got} does not match {expected} in contract {contract} (tolerance {tolerance}%)',
    pt: '{got} não corresponde a {expected} do contrato {contract} (tolerância {tolerance}%)',
    fr: '{got} ne correspond pas à {expected} du contrat {contract} (tolérance {tolerance} %)',
    de: '{got} weicht von {expected} in Vertrag {contract} ab (Toleranz {tolerance} %)',
    it: '{got} non corrisponde a {expected} del contratto {contract} (tolleranza {tolerance}%)',
  },
};
