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

/**
 * Interpreta un monto escrito con cualquier convención de separadores
 * ("1250.50", "1,250.50", "1.250,50", "1250"). Devuelve null si no es número.
 * @param {string} text
 * @returns {number|null}
 */
export function parseMoney(text) {
  const clean = String(text).replace(/[^\d.,-]/g, '');
  if (clean === '') return null;
  const commas = (clean.match(/,/g) ?? []).length;
  const dots = (clean.match(/\./g) ?? []).length;
  let plain = clean;
  if (commas > 0 && dots > 0) {
    const decimal = clean.lastIndexOf(',') > clean.lastIndexOf('.') ? ',' : '.';
    plain = clean.replace(decimal === ',' ? /\./g : /,/g, '').replace(',', '.');
  } else if (commas + dots > 0) {
    const sep = commas > 0 ? ',' : '.';
    const tail = clean.slice(clean.lastIndexOf(sep) + 1);
    const thousands = commas + dots > 1 || tail.length === 3;
    plain = thousands ? clean.split(sep).join('') : clean.replace(sep, '.');
  }
  const parsed = Number(plain);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Campos del formulario de captura manual. */
export const MANUAL_FIELDS = /** @type {const} */ ([
  ['id', 'Identificador', 'FAC-001'],
  ['counterpartyName', 'Beneficiario', 'Proveedor S.A.'],
  ['counterpartyTaxId', 'Identificación fiscal', 'US-12-3456789'],
  ['amount', 'Monto', '1250.00'],
  ['currency', 'Moneda (ISO)', 'USD'],
  ['issueDate', 'Fecha de emisión', '2026-10-01'],
  ['dueDate', 'Fecha de pago', '2026-10-31'],
  ['invoiceNumber', 'Número de factura', 'INV-2026-001'],
  ['contractRef', 'Contrato', 'CT-2026-001'],
  ['accountLast4', 'Últimos 4 de la cuenta', '0042'],
  ['concept', 'Concepto', 'Servicios de octubre'],
]);

/**
 * Arma una factura válida a partir del formulario de captura manual.
 * La captura manual se trata como lectura confiable: confianza 1 en los campos
 * presentes, para que R01 no escale por confianza, pero las demás reglas siguen
 * decidiendo. Los campos vacíos quedan en null.
 * @param {Record<string, string>} form
 * @returns {Record<string, unknown>}
 */
export function buildManualInvoice(form) {
  const text = (/** @type {string} */ key) => {
    const v = (form[key] ?? '').trim();
    return v === '' ? null : v;
  };
  const amountRaw = (form.amount ?? '').trim();
  const amount = amountRaw === '' ? null : parseMoney(amountRaw);
  const accountLast4 = text('accountLast4');
  const parts = [
    text('counterpartyName'), text('invoiceNumber'), amountRaw, text('currency'), text('concept'),
  ].filter(Boolean);
  return {
    id: text('id') ?? `manual-${Date.now()}`,
    source: 'chat',
    invoiceNumber: text('invoiceNumber'),
    counterpartyName: text('counterpartyName'),
    counterpartyTaxId: text('counterpartyTaxId'),
    amount: Number.isFinite(amount) ? amount : null,
    currency: text('currency') ? String(text('currency')).toUpperCase() : null,
    issueDate: text('issueDate'),
    dueDate: text('dueDate'),
    contractRef: text('contractRef'),
    bank: accountLast4 ? { accountLast4 } : null,
    concept: text('concept') ?? '',
    confidence: { counterpartyName: 1, amount: 1, currency: 1, issueDate: 1, invoiceNumber: 1 },
    rawText: `Captura manual · ${parts.join(' · ') || 'sin detalle'}`,
  };
}

/**
 * Convierte las decisiones en mensajes del agente para el responsable humano:
 * una línea por cada factura que no se paga sola (frenada o escalada), con el
 * porqué. Las pagadas no generan aviso. El orden es el de las decisiones.
 * @param {DecisionRow[]} decisions
 * @returns {{ id: string, outcome: 'HOLD'|'ESCALATE', kind: string, text: string }[]}
 */
export function deriveAgentMessages(decisions) {
  const reason = (/** @type {DecisionRow} */ d) => {
    const summary = (d.summary ?? '').split(' · ').slice(1).join(' · ').trim();
    return summary || (d.explanation ?? '').split('\n')[0].trim() || 'fuera de las reglas';
  };
  return decisions
    .filter((d) => d.outcome === 'HOLD' || d.outcome === 'ESCALATE')
    .map((d) => ({
      id: d.invoiceId,
      outcome: /** @type {'HOLD'|'ESCALATE'} */ (d.outcome),
      kind: d.outcome === 'HOLD' ? 'no-pago' : 'aprobacion',
      text: d.outcome === 'HOLD'
        ? `No voy a pagar ${d.invoiceId}: ${reason(d)}`
        : `Necesito tu aprobación para ${d.invoiceId}: ${reason(d)}`,
    }));
}

/**
 * Interpreta el JSON pegado: acepta una factura suelta o una lista.
 * @param {string} text
 * @returns {{ invoices: Record<string, unknown>[], error: string|null }}
 */
export function parseInvoicesJson(text) {
  const trimmed = text.trim();
  if (trimmed === '') return { invoices: [], error: 'Pega al menos una factura en JSON.' };
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { invoices: [], error: 'El JSON no es válido.' };
  }
  const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.invoices) ? parsed.invoices : [parsed]);
  if (list.length === 0) return { invoices: [], error: 'No hay facturas en el JSON.' };
  if (!list.every((x) => x && typeof x === 'object' && !Array.isArray(x))) {
    return { invoices: [], error: 'Cada factura debe ser un objeto.' };
  }
  return { invoices: list, error: null };
}
