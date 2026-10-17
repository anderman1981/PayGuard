// @ts-check
/**
 * Reglas por defecto de la empresa ficticia. La pantalla de Reglas las edita.
 * @type {import('../domain/types.js').RulesConfig}
 */
export const DEFAULT_RULES = {
  humanApprovalAboveUSD: 5000,
  maxPerPaymentUSD: 20000,
  periodBudgetUSD: 48000,
  allowedCurrencies: ['USD', 'COP', 'MXN', 'ARS'],
  allowedCountries: ['US', 'CO', 'MX', 'AR'],
  minExtractionConfidence: 0.85,
  duplicateWindowDays: 45,
  maxDaysOverdue: 30,
  // Tabla fija y explícita: el agente no consulta tasas en vivo.
  fxToUSD: { USD: 1, COP: 1 / 4000, MXN: 1 / 18, ARS: 1 / 1000, EUR: 1.08 },
};

/**
 * Valida una configuración enviada desde la UI. Devuelve lista de errores (vacía = ok).
 * @param {any} cfg
 * @returns {string[]}
 */
export function validateRules(cfg) {
  const errors = [];
  const num = (/** @type {string} */ k, min = 0) => {
    if (typeof cfg?.[k] !== 'number' || !Number.isFinite(cfg[k]) || cfg[k] < min) errors.push(`${k} debe ser un número ≥ ${min}`);
  };
  num('humanApprovalAboveUSD'); num('maxPerPaymentUSD'); num('periodBudgetUSD');
  num('duplicateWindowDays'); num('maxDaysOverdue');
  if (typeof cfg?.minExtractionConfidence !== 'number' || cfg.minExtractionConfidence < 0 || cfg.minExtractionConfidence > 1) {
    errors.push('minExtractionConfidence debe estar entre 0 y 1');
  }
  if (!Array.isArray(cfg?.allowedCurrencies) || cfg.allowedCurrencies.length === 0) errors.push('allowedCurrencies no puede estar vacío');
  if (!Array.isArray(cfg?.allowedCountries)) errors.push('allowedCountries debe ser una lista');
  if (errors.length === 0 && cfg.humanApprovalAboveUSD > cfg.maxPerPaymentUSD) {
    errors.push('humanApprovalAboveUSD no puede ser mayor que maxPerPaymentUSD');
  }
  for (const c of cfg?.allowedCurrencies ?? []) {
    if (typeof cfg?.fxToUSD?.[c] !== 'number' || cfg.fxToUSD[c] <= 0) errors.push(`falta tasa fxToUSD para ${c}`);
  }
  return errors;
}
