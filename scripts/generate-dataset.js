// @ts-check
/**
 * Genera el set de facturas simuladas en data/invoices/:
 * el documento en su formato (PDF, PNG, correo o chat) y un manifiesto con la
 * decisión esperada y la extracción dorada (la caché que usa M2 sin modelo).
 *
 * Reproducible: mismas entradas, mismos archivos. Todo es ficticio.
 *   node scripts/generate-dataset.js
 */
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SPECS } from './lib/dataset-specs.js';
import { renderPdf } from './lib/pdf.js';
import { renderPng } from './lib/png.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = `${ROOT}data/invoices`;

/** Etiquetas de la factura en el idioma del documento. */
const LABELS = {
  es: {
    title: 'FACTURA',
    vendor: 'Proveedor',
    taxId: 'NIT/ID',
    number: 'Numero',
    issue: 'Fecha',
    due: 'Vence',
    concept: 'Concepto',
    total: 'Total a pagar',
    contract: 'Contrato',
    account: 'Cuenta',
  },
  en: {
    title: 'INVOICE',
    vendor: 'Vendor',
    taxId: 'Tax ID',
    number: 'Number',
    issue: 'Date',
    due: 'Due',
    concept: 'Description',
    total: 'Amount due',
    contract: 'Contract',
    account: 'Account',
  },
  pt: {
    title: 'FATURA',
    vendor: 'Fornecedor',
    taxId: 'CNPJ/ID',
    number: 'Numero',
    issue: 'Data',
    due: 'Vencimento',
    concept: 'Descricao',
    total: 'Valor total',
    contract: 'Contrato',
    account: 'Conta',
  },
  fr: {
    title: 'FACTURE',
    vendor: 'Fournisseur',
    taxId: 'Numero fiscal',
    number: 'Numero',
    issue: 'Date',
    due: 'Echeance',
    concept: 'Description',
    total: 'Net a payer',
    contract: 'Contrat',
    account: 'Compte',
  },
};

/** @param {import('./lib/dataset-specs.js').Spec} spec */
function lines(spec) {
  const l = LABELS[spec.lang];
  const amount = spec.amount === null ? '???' : spec.amount.toLocaleString('en-US');
  const extra = Object.entries(spec.bank)
    .filter(([k]) => k !== 'bankName' && k !== 'accountLast4')
    .map(([k, v]) => `${k.toUpperCase()}: ${v}`);
  return [
    `${l.title} ${spec.number}`,
    '',
    `${l.vendor}: ${spec.vendor}`,
    `${l.taxId}: ${spec.taxId ?? '-'}`,
    `${l.issue}: ${spec.issue}    ${l.due}: ${spec.due}`,
    spec.contract ? `${l.contract}: ${spec.contract}` : `${l.contract}: -`,
    '',
    `${l.concept}: ${spec.concept}`,
    `${l.total}: ${amount} ${spec.currency}`,
    `${l.account}: ****${spec.bank.accountLast4}`,
    ...extra,
    ...(spec.inject ? ['', spec.inject] : []),
  ];
}

/** @param {import('./lib/dataset-specs.js').Spec} spec */
function emailFile(spec) {
  return [
    `From: facturacion@${spec.vendor.toLowerCase().replace(/[^a-z]+/g, '')}.example`,
    'To: pagos@andeslabs.example',
    `Subject: ${LABELS[spec.lang].title} ${spec.number}`,
    `Date: ${spec.issue}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    ...lines(spec),
  ].join('\n');
}

/** @param {import('./lib/dataset-specs.js').Spec} spec */
function chatFile(spec) {
  const amount = spec.amount === null ? '(no se alcanza a leer)' : spec.amount.toLocaleString('en-US');
  return [
    `[${spec.issue} 09:14] ${spec.vendor}:`,
    `Hola, les paso la cuenta de cobro ${spec.number} por ${spec.concept}.`,
    `[${spec.issue} 09:15] ${spec.vendor}: Son ${amount} ${spec.currency}, vence el ${spec.due}.`,
    `[${spec.issue} 09:15] ${spec.vendor}: Cuenta ****${spec.bank.accountLast4}`
      + (spec.contract ? ` · ${spec.contract}` : ''),
    ...(spec.inject ? [`[${spec.issue} 09:16] ${spec.vendor}: ${spec.inject}`] : []),
  ].join('\n');
}

const EXT = { pdf: 'pdf', image: 'png', email: 'eml', chat: 'txt' };

/** Extracción dorada: lo que un extractor perfecto sacaría del documento. */
function extraction(/** @type {import('./lib/dataset-specs.js').Spec} */ spec, /** @type {string} */ rawText) {
  const base = { counterpartyName: 0.97, amount: 0.98, currency: 0.99, issueDate: 0.96, invoiceNumber: 0.95 };
  return {
    id: spec.id,
    source: spec.source,
    invoiceNumber: spec.number,
    counterpartyName: spec.vendor,
    counterpartyTaxId: spec.taxId,
    amount: spec.amount,
    currency: spec.currency,
    issueDate: spec.issue,
    dueDate: spec.due,
    contractRef: spec.contract,
    bank: spec.bank,
    concept: spec.concept,
    confidence: { ...base, ...(spec.confidence ?? {}) },
    rawText,
  };
}

function generate() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const manifest = SPECS.map((spec) => {
    const file = `${spec.id}.${EXT[spec.source]}`;
    const body = lines(spec);
    /** @type {string} */
    let rawText;
    if (spec.source === 'pdf') {
      writeFileSync(`${OUT}/${file}`, renderPdf(body, { title: `${spec.id} ${spec.number}` }));
      rawText = body.join('\n');
    } else if (spec.source === 'image') {
      writeFileSync(`${OUT}/${file}`, renderPng(body));
      rawText = body.join('\n');
    } else {
      rawText = spec.source === 'email' ? emailFile(spec) : chatFile(spec);
      writeFileSync(`${OUT}/${file}`, rawText, 'utf8');
    }
    return {
      id: spec.id,
      file,
      source: spec.source,
      case: spec.case,
      lang: spec.lang,
      expected: { outcome: spec.expected, rules: spec.rules },
      extraction: extraction(spec, rawText),
    };
  });

  writeFileSync(`${OUT}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manifest = generate();
  const by = (/** @type {(m: typeof manifest[number]) => string} */ key) => manifest
    .reduce((acc, m) => ({ ...acc, [key(m)]: (acc[key(m)] ?? 0) + 1 }), /** @type {Record<string, number>} */ ({}));
  process.stdout.write(`${manifest.length} facturas en data/invoices/\n`);
  process.stdout.write(`formatos: ${JSON.stringify(by((m) => m.source))}\n`);
  process.stdout.write(`esperado: ${JSON.stringify(by((m) => m.expected.outcome))}\n`);
  process.stdout.write(`casos distintos: ${new Set(manifest.map((m) => m.case)).size}\n`);
}

export { generate };
