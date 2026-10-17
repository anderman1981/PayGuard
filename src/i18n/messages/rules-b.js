// @ts-check
/** Mensajes de las reglas R07–R12. Una clave por motivo; el verdicto PASS usa 'verdict.PASS'. */

/** @type {Record<string, Record<import('../messages.js').Lang, string>>} */
export const RULES_B = {
  'r07.name': {
    es: 'Moneda y país permitidos', en: 'Allowed currency and country', pt: 'Moeda e país permitidos',
    fr: 'Devise et pays autorisés', de: 'Zulässige Währung und Land', it: 'Valuta e paese consentiti',
  },
  'r07.currency': {
    es: 'La moneda {currency} no está permitida', en: 'Currency {currency} is not allowed',
    pt: 'A moeda {currency} não é permitida', fr: 'La devise {currency} n’est pas autorisée',
    de: 'Währung {currency} ist nicht zugelassen', it: 'La valuta {currency} non è consentita',
  },
  'r07.country': {
    es: 'El país {country} no está permitido', en: 'Country {country} is not allowed',
    pt: 'O país {country} não é permitido', fr: 'Le pays {country} n’est pas autorisé',
    de: 'Land {country} ist nicht zugelassen', it: 'Il paese {country} non è consentito',
  },
  'r08.name': {
    es: 'Fechas válidas', en: 'Valid dates', pt: 'Datas válidas',
    fr: 'Dates valides', de: 'Gültige Daten', it: 'Date valide',
  },
  'r08.invalid': {
    es: 'La fecha {field} no es válida: {value}', en: 'Date {field} is not valid: {value}',
    pt: 'A data {field} não é válida: {value}', fr: 'La date {field} est invalide : {value}',
    de: 'Datum {field} ist ungültig: {value}', it: 'La data {field} non è valida: {value}',
  },
  'r08.future': {
    es: 'La factura está emitida en el futuro ({date})', en: 'The invoice is dated in the future ({date})',
    pt: 'A fatura está emitida no futuro ({date})', fr: 'La facture est datée dans le futur ({date})',
    de: 'Die Rechnung ist auf ein zukünftiges Datum ausgestellt ({date})', it: 'La fattura è datata nel futuro ({date})',
  },
  'r08.overdue': {
    es: 'Venció hace {days} días ({date}), más del máximo de {max}',
    en: 'Overdue by {days} days ({date}), over the {max} limit',
    pt: 'Venceu há {days} dias ({date}), acima do máximo de {max}', fr: 'Échue depuis {days} jours ({date}), au-delà de {max}',
    de: 'Seit {days} Tagen überfällig ({date}), über dem Limit von {max}',
    it: 'Scaduta da {days} giorni ({date}), oltre il limite di {max}',
  },
  'r09.name': {
    es: 'Límite por pago', en: 'Per-payment limit', pt: 'Limite por pagamento',
    fr: 'Limite par paiement', de: 'Limit pro Zahlung', it: 'Limite per pagamento',
  },
  'r09.overMax': {
    es: '{amount} supera el máximo por pago ({limit})', en: '{amount} exceeds the maximum per payment ({limit})',
    pt: '{amount} ultrapassa o máximo por pagamento ({limit})', fr: '{amount} dépasse le maximum par paiement ({limit})',
    de: '{amount} überschreitet das Maximum pro Zahlung ({limit})', it: '{amount} supera il massimo per pagamento ({limit})',
  },
  'r09.escalate': {
    es: '{amount} supera el umbral de aprobación ({limit})', en: '{amount} exceeds the approval threshold ({limit})',
    pt: '{amount} ultrapassa o limite de aprovação ({limit})', fr: '{amount} dépasse le seuil d’approbation ({limit})',
    de: '{amount} überschreitet die Genehmigungsgrenze ({limit})', it: '{amount} supera la soglia di approvazione ({limit})',
  },
  'r10.name': {
    es: 'Presupuesto del periodo', en: 'Period budget', pt: 'Orçamento do período',
    fr: 'Budget de la période', de: 'Periodenbudget', it: 'Budget del periodo',
  },
  'r10.fail': {
    es: 'Con {amount} el periodo llega a {total}, sobre el presupuesto de {budget}',
    en: 'With {amount} the period reaches {total}, over the {budget} budget',
    pt: 'Com {amount} o período chega a {total}, acima do orçamento de {budget}',
    fr: 'Avec {amount} la période atteint {total}, au-delà du budget de {budget}',
    de: 'Mit {amount} erreicht die Periode {total}, über dem Budget von {budget}',
    it: 'Con {amount} il periodo arriva a {total}, oltre il budget di {budget}',
  },
  'r11.name': {
    es: 'Saldo disponible', en: 'Available balance', pt: 'Saldo disponível',
    fr: 'Solde disponible', de: 'Verfügbarer Saldo', it: 'Saldo disponibile',
  },
  'r11.fail': {
    es: 'Saldo insuficiente: hay {balance} y se requieren {amount}', en: 'Insufficient balance: {balance} available, {amount} required',
    pt: 'Saldo insuficiente: há {balance} e são necessários {amount}', fr: 'Solde insuffisant : {balance} disponible, {amount} requis',
    de: 'Nicht genug Guthaben: {balance} vorhanden, {amount} nötig', it: 'Saldo insufficiente: {balance} disponibile, {amount} necessari',
  },
  'r12.name': {
    es: 'Datos de pago válidos', en: 'Valid payment details', pt: 'Dados de pagamento válidos',
    fr: 'Coordonnées de paiement valides', de: 'Gültige Zahlungsdaten', it: 'Dati di pagamento validi',
  },
  'r12.iban': {
    es: 'El IBAN {value} no pasa el dígito de control', en: 'IBAN {value} fails its check digits',
    pt: 'O IBAN {value} não passa o dígito de controlo', fr: 'L’IBAN {value} échoue à la clé de contrôle',
    de: 'IBAN {value} besteht die Prüfziffer nicht', it: 'L’IBAN {value} non supera la cifra di controllo',
  },
  'r12.bic': {
    es: 'El BIC {value} no tiene un formato válido', en: 'BIC {value} is not a valid format',
    pt: 'O BIC {value} não tem formato válido', fr: 'Le BIC {value} n’a pas un format valide',
    de: 'BIC {value} hat kein gültiges Format', it: 'Il BIC {value} non ha un formato valido',
  },
  'r12.aba': {
    es: 'El routing {value} no pasa su suma de control', en: 'Routing number {value} fails its checksum',
    pt: 'O routing {value} não passa a soma de controlo', fr: 'Le numéro {value} échoue à sa somme de contrôle',
    de: 'Bankleitzahl {value} besteht die Prüfsumme nicht', it: 'Il routing {value} non supera il checksum',
  },
  'r12.currency': {
    es: 'El código de moneda {value} no es ISO-4217', en: 'Currency code {value} is not ISO-4217',
    pt: 'O código de moeda {value} não é ISO-4217', fr: 'Le code devise {value} n’est pas ISO-4217',
    de: 'Währungscode {value} ist kein ISO-4217', it: 'Il codice valuta {value} non è ISO-4217',
  },
  'r12.totals': {
    es: 'El total {got} no cuadra: subtotal e impuestos dan {expected}',
    en: 'Total {got} does not add up: subtotal plus tax gives {expected}',
    pt: 'O total {got} não fecha: subtotal e impostos dão {expected}', fr: 'Le total {got} ne concorde pas : on attend {expected}',
    de: 'Summe {got} stimmt nicht: erwartet werden {expected}', it: 'Il totale {got} non torna: atteso {expected}',
  },
};
