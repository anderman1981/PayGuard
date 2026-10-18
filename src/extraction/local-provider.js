// @ts-check
/**
 * Proveedor local sin dependencias: extrae texto de PDFs y archivos de texto
 * usando `node:zlib` (built-in), luego aplica regex para encontrar campos de
 * factura. Actúa como último recurso cuando los proveedores de IA no están
 * disponibles o fallan; la confianza que devuelve es baja (≤0.45) para que
 * R01 escale si los campos críticos son nulos.
 */
import { inflateSync, gunzipSync } from 'node:zlib';

/** Extrae texto de los bytes de un PDF descomprimiendo streams FlateDecode. */
function extractPdfText(/** @type {Uint8Array} */ bytes) {
  const buf = Buffer.from(bytes);
  const str = buf.toString('binary');
  const chunks = [];
  const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    const raw = Buffer.from(m[1], 'binary');
    try { chunks.push(inflateSync(raw).toString('utf-8')); } catch { /* sin FlateDecode */ }
    try { chunks.push(gunzipSync(raw).toString('utf-8')); } catch { /* sin gzip */ }
  }
  const plain = (str.match(/[ -~\n\r]{6,}/g) ?? []).join('\n');
  return [...chunks, plain].join('\n');
}

const PDF_OPS = /(?:BT|ET|Tf|Tm|TD|Td|Tj|TJ|cm|q|Q|re|f|S|g|G|rg|RG|w|J|j|M|d|i|W)\b/g;
/** Limpia texto extraído de PDF quitando operadores y basura. */
function cleanPdf(/** @type {string} */ t) {
  return t.replace(PDF_OPS, ' ').replace(/\s{3,}/g, '\n').trim();
}

/** Normaliza una cifra monetaria: '1.250,00' → 1250.00 */
function parseMoney(/** @type {string} */ s) {
  const clean = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(clean);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Extrae campos de una factura del texto usando regex. @param {string} text */
function parseInvoiceFields(text) {
  const dates = [...text.matchAll(/(\d{4}[-\/]\d{2}[-\/]\d{2}|\d{2}[-\/]\d{2}[-\/]\d{4})/g)]
    .map((m) => {
      const parts = m[1].split(/[-\/]/);
      return parts[0].length === 4 ? m[1] : `${parts[2]}-${parts[1]}-${parts[0]}`;
    });
  const amtM = text.match(/(?:total|valor|monto|amount|subtotal|importe)[^\d$€£]*([0-9]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i);
  const amount = amtM ? parseMoney(amtM[1]) : null;
  const invM = text.match(/(?:factura|invoice|fac\.?\s*no\.?|nro\.?|no\.?)\s*[:#\s-]*([A-Z0-9][A-Z0-9\-\/]{2,28})/i);
  const CP_RE = /([A-ZÁÉÍÓÚÑa-záéíóúñ][A-ZÁÉÍÓÚÑa-záéíóúñ\s&.']{2,35}(?:S\.?A\.?S?\.?|Ltda?\.?|Corp\.?|LLC|Inc\.?|S\.?R\.?L\.?))/u;
  const cpM = text.match(CP_RE);
  const nitM = text.match(/(?:NIT|RUT|RFC|RUC|CUIL|CUIT)[:\s.]*([0-9]{6,15}[-.]?[0-9]?)/i);
  const contM = text.match(/(?:contrato|contract|ref\.?|orden)[:\s#.]*([A-Z0-9\-\/]{3,25})/i);
  const currency = /\bCOP\b/.test(text) ? 'COP' : /\bEUR\b/.test(text) ? 'EUR' : /\bMXN\b/.test(text) ? 'MXN' : 'USD';
  const counterpartyName = cpM?.[1]?.trim().replace(/\s{2,}/g, ' ') ?? null;
  const invoiceNumber = invM?.[1] ?? null;
  const c = (/** @type {unknown} */ v) => (v ? 0.45 : 0);
  return {
    invoiceNumber,
    counterpartyName,
    counterpartyTaxId: nitM?.[1] ?? null,
    amount,
    currency,
    issueDate: dates[0] ?? null,
    dueDate: dates[1] ?? null,
    contractRef: contM?.[1] ?? null,
    bank: null,
    concept: '',
    confidence: {
      counterpartyName: c(counterpartyName),
      amount: c(amount),
      currency: 0.3,
      issueDate: c(dates[0]),
      invoiceNumber: c(invoiceNumber),
    },
  };
}

/** @type {import('./providers.js').Provider} */
export const LOCAL_PROVIDER = {
  name: 'local-text',
  vision: true,
  key: () => 'local',
  async call(doc, _key, _fetch, _ms) {
    let text = doc.text ?? '';
    if (!text && doc.base64) {
      const bytes = new Uint8Array(Buffer.from(doc.base64, 'base64'));
      const mime = doc.mime ?? '';
      text = (mime.startsWith('text/') || mime === 'application/json')
        ? Buffer.from(bytes).toString('utf-8')
        : cleanPdf(extractPdfText(bytes));
    }
    if (!text.trim()) throw new Error('no se pudo extraer texto del documento');
    const fields = parseInvoiceFields(text);
    return JSON.stringify({ ...fields, rawText: text.slice(0, 2000) });
  },
};
