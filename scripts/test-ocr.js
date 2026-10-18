#!/usr/bin/env node
// @ts-check
/**
 * Prueba rápida del extractor con una factura real (PDF o imagen).
 *
 * Uso:
 *   GEMINI_API_KEY=... node scripts/test-ocr.js factura.pdf
 *   GROQ_API_KEY=...   node scripts/test-ocr.js factura.jpg
 *   GEMINI_API_KEY=... GROQ_API_KEY=... node scripts/test-ocr.js factura.pdf
 */
import { readFile } from 'node:fs/promises';
import { extname, basename } from 'node:path';
import { extractInvoice } from '../src/extraction/index.js';

const file = process.argv[2];
if (!file) {
  process.stderr.write('Uso: node scripts/test-ocr.js <archivo.pdf|.jpg|.png>\n');
  process.exit(1);
}

const ext = extname(file).toLowerCase();
const MIME = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };
const mime = MIME[ext];
if (!mime) {
  process.stderr.write(`Extensión no soportada: ${ext}. Usa .pdf, .jpg o .png\n`);
  process.exit(1);
}

const source = ext === '.pdf' ? 'pdf' : 'image';

process.stdout.write(`\nLeyendo ${basename(file)}...\n`);
const bytes = await readFile(file);

process.stdout.write(`Extrayendo con ${Object.keys(process.env).filter(k => k.endsWith('_API_KEY')).join(', ')} (mode: live)...\n\n`);

const result = await extractInvoice(
  { id: basename(file), source, bytes: new Uint8Array(bytes), mime },
  {
    mode: 'live',
    env: process.env,
    timeoutMs: 30000,
  }
);

process.stdout.write(`Proveedor usado: ${result.provider}\n`);
if (result.attempts.length > 0) {
  process.stdout.write('Intentos fallidos:\n');
  for (const a of result.attempts) {
    process.stdout.write(`  - ${a.provider}: ${a.error}\n`);
  }
}

const inv = result.invoice;
process.stdout.write('\n--- DATOS EXTRAÍDOS ---\n');
process.stdout.write(`Número de factura : ${inv.invoiceNumber ?? '(no encontrado)'}\n`);
process.stdout.write(`Proveedor         : ${inv.counterpartyName ?? '(no encontrado)'}\n`);
process.stdout.write(`NIT / Tax ID      : ${inv.counterpartyTaxId ?? '(no encontrado)'}\n`);
process.stdout.write(`Monto             : ${inv.amount ?? '(no encontrado)'} ${inv.currency ?? ''}\n`);
process.stdout.write(`Fecha emisión     : ${inv.issueDate ?? '(no encontrado)'}\n`);
process.stdout.write(`Fecha vencimiento : ${inv.dueDate ?? '(no encontrado)'}\n`);
process.stdout.write(`Concepto          : ${inv.concept}\n`);
process.stdout.write(`Ref. contrato     : ${inv.contractRef ?? '(no encontrado)'}\n`);
if (inv.bank) {
  process.stdout.write(`Banco             : ${inv.bank.bankName ?? ''} cuenta ...${inv.bank.accountLast4 ?? ''}\n`);
}
process.stdout.write('\nConfianza:\n');
for (const [k, v] of Object.entries(inv.confidence)) {
  const bar = '█'.repeat(Math.round(v * 10)) + '░'.repeat(10 - Math.round(v * 10));
  process.stdout.write(`  ${k.padEnd(18)}: ${bar} ${(v * 100).toFixed(0)}%\n`);
}
process.stdout.write('\n--- JSON COMPLETO ---\n');
process.stdout.write(JSON.stringify(inv, null, 2) + '\n');
