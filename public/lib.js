// @ts-check
/**
 * Lógica pura de la interfaz: formato, filtros y conteos.
 * Vive aparte del DOM para poder probarla con `node:test`.
 */

/** @typedef {{ invoiceId: string, outcome: 'PAY'|'HOLD'|'ESCALATE', summary: string,
 *   decidedBy: string, failed: string[], explanation: string }} DecisionRow */

/** Tono visual de cada resultado. */
export const TONE = /** @type {const} */ ({ PAY: 'ok', HOLD: 'stop', ESCALATE: 'wait' });

/**
 * Formatea un monto con su divisa en el idioma dado.
 * @param {number|null|undefined} amount
 * @param {string|null|undefined} currency
 * @param {string} lang
 * @returns {string}
 */
export function money(amount, currency, lang = 'es') {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || !currency) return '—';
  try {
    return new Intl.NumberFormat(lang, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/**
 * Cuenta decisiones por resultado.
 * @param {DecisionRow[]} rows
 * @returns {{ PAY: number, HOLD: number, ESCALATE: number, total: number }}
 */
export function counts(rows) {
  const base = { PAY: 0, HOLD: 0, ESCALATE: 0, total: rows.length };
  for (const r of rows) if (r.outcome in base) base[r.outcome] += 1;
  return base;
}

/**
 * Filtra por resultado y por texto libre (id, resumen o reglas marcadas).
 * @param {DecisionRow[]} rows
 * @param {{ outcome?: string, query?: string }} filter
 * @returns {DecisionRow[]}
 */
export function filterRows(rows, { outcome = 'ALL', query = '' } = {}) {
  const needle = query.trim().toLowerCase();
  return rows.filter((r) => {
    if (outcome !== 'ALL' && r.outcome !== outcome) return false;
    if (needle === '') return true;
    return [r.invoiceId, r.summary, ...(r.failed ?? [])].join(' ').toLowerCase().includes(needle);
  });
}

/**
 * Convierte el formulario de reglas en el objeto que espera la API.
 * Los campos de lista se separan por coma; los numéricos se convierten.
 * @param {Record<string, string>} form
 * @returns {Record<string, unknown>}
 */
export function parseRulesForm(form) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [key, value] of Object.entries(form)) {
    if (key === 'allowedCurrencies' || key === 'allowedCountries') {
      out[key] = value.split(',').map((v) => v.trim().toUpperCase()).filter(Boolean);
    } else if (value !== '') {
      const num = Number(value);
      out[key] = Number.isFinite(num) ? num : value;
    }
  }
  return out;
}

/**
 * Texto corto para la barra de métricas.
 * @param {{ autonomyPct: number, accuracyPct: number|null, unsafePayments: number }} m
 * @returns {{ label: string, value: string, tone: string }[]}
 */
export const metricTiles = (m) => [
  { label: 'Autonomía', value: `${m.autonomyPct}%`, tone: 'ok' },
  { label: 'Precisión', value: m.accuracyPct === null ? '—' : `${m.accuracyPct}%`, tone: 'ok' },
  { label: 'Pagos indebidos', value: String(m.unsafePayments), tone: m.unsafePayments === 0 ? 'ok' : 'stop' },
];
