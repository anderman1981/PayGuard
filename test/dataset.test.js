import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { SPECS } from '../scripts/lib/dataset-specs.js';
import { renderPdf } from '../scripts/lib/pdf.js';
import { renderPng } from '../scripts/lib/png.js';
import { glyph, FONT } from '../scripts/lib/font5x7.js';
import { createState, ruleContext } from '../src/api/state.js';
import { processBatch } from '../src/agent.js';
import { blockingResults } from '../src/rules/policy.js';
import { computeMetrics } from '../src/metrics.js';

const DIR = new URL('../data/invoices/', import.meta.url);
const MANIFEST = JSON.parse(readFileSync(new URL('manifest.json', DIR), 'utf8'));
const COMPANY = new URL('../data/company.json', import.meta.url);
const NOW = new Date('2026-10-16T12:00:00Z');

/** Procesa el set completo en el orden del manifiesto, como lo hará la demo. */
async function runDataset() {
  const state = createState(COMPANY, NOW);
  const ctx = ruleContext(state, 'es');
  const decisions = await processBatch(MANIFEST.map((m) => m.extraction), {
    ctx, audit: state.audit, cases: state.cases,
  });
  return { state, decisions };
}

test('el manifiesto cubre lo que pide el reto', () => {
  assert.ok(MANIFEST.length >= 30, `solo ${MANIFEST.length} facturas`);
  assert.equal(new Set(MANIFEST.map((m) => m.id)).size, MANIFEST.length);
  const formats = new Set(MANIFEST.map((m) => m.source));
  assert.deepEqual([...formats].sort(), ['chat', 'email', 'image', 'pdf']);
  const cases = new Set(MANIFEST.map((m) => m.case));
  assert.ok(cases.size >= 15, `solo ${cases.size} tipos de caso`);
  for (const trampa of ['duplicate-number', 'duplicate-amount', 'unknown-beneficiary',
    'beneficiary-not-allowed', 'bank-changed', 'amount-mismatch', 'currency-mismatch',
    'future-date', 'overdue', 'needs-approval', 'over-max', 'insufficient-balance',
    'prompt-injection', 'low-confidence', 'budget-exhausted']) {
    assert.ok(cases.has(trampa), `falta el caso ${trampa}`);
  }
});

test('cada factura tiene su archivo y su extracción dorada', () => {
  for (const m of MANIFEST) {
    assert.ok(existsSync(new URL(m.file, DIR)), `falta ${m.file}`);
    assert.equal(m.extraction.id, m.id);
    assert.equal(typeof m.extraction.rawText, 'string');
    assert.ok(m.extraction.rawText.length > 20);
    assert.ok(['PAY', 'HOLD', 'ESCALATE'].includes(m.expected.outcome));
  }
});

test('los documentos están en su formato real', () => {
  const read = (/** @type {string} */ f) => readFileSync(new URL(f, DIR));
  const pdf = MANIFEST.find((m) => m.source === 'pdf');
  const png = MANIFEST.find((m) => m.source === 'image');
  const eml = MANIFEST.find((m) => m.source === 'email');
  assert.equal(read(pdf.file).subarray(0, 5).toString(), '%PDF-');
  assert.deepEqual([...read(png.file).subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
  assert.match(read(eml.file).toString(), /^From: /);
});

test('el agente decide el set completo exactamente como se espera', async () => {
  const { decisions } = await runDataset();
  const porId = new Map(decisions.map((d) => [d.invoiceId, d]));
  const errores = MANIFEST
    .filter((m) => porId.get(m.id).outcome !== m.expected.outcome)
    .map((m) => `${m.id} (${m.case}): esperado ${m.expected.outcome}, obtenido ${porId.get(m.id).outcome}`);
  assert.deepEqual(errores, []);
});

test('cada trampa la marca la regla que debe marcarla', async () => {
  const { decisions } = await runDataset();
  const porId = new Map(decisions.map((d) => [d.invoiceId, d]));
  const errores = [];
  for (const m of MANIFEST) {
    const marcadas = blockingResults(porId.get(m.id).results).map((r) => r.ruleId);
    for (const esperada of m.expected.rules) {
      if (!marcadas.includes(esperada)) errores.push(`${m.id}: falta ${esperada} (marcó ${marcadas.join(',') || 'nada'})`);
    }
    if (m.expected.rules.length === 0 && marcadas.length > 0) {
      errores.push(`${m.id}: debía pasar limpio y marcó ${marcadas.join(',')}`);
    }
  }
  assert.deepEqual(errores, []);
});

test('sobre el set: cero pagos inseguros y precisión del 100%', async () => {
  const { decisions } = await runDataset();
  const expected = MANIFEST.map((m) => ({ id: m.id, outcome: m.expected.outcome }));
  const m = computeMetrics(decisions, expected);
  assert.equal(m.unsafePayments, 0);
  assert.equal(m.accuracyPct, 100);
  assert.deepEqual(m.mismatches, []);
  assert.ok(m.autonomyPct >= 60, `autonomía ${m.autonomyPct}%`);
});

test('la auditoría del set completo verifica', async () => {
  const { state, decisions } = await runDataset();
  assert.equal(state.audit.entries.length, decisions.length);
  assert.equal((await state.audit.verify()).ok, true);
});

test('el set no contiene datos reales ni claves', () => {
  const texto = JSON.stringify(MANIFEST);
  assert.ok(!/AIza|sk-ant|gsk_|blk_live/.test(texto));
  for (const m of MANIFEST) {
    assert.ok(!/@gmail\.com|@hotmail\.com|@outlook\.com/.test(m.extraction.rawText), m.id);
  }
});

test('el escritor de PDF produce un documento con sus objetos y xref', () => {
  const pdf = renderPdf(['FACTURA X-1', 'Total: 100 USD'], { title: 'X-1' }).toString('latin1');
  assert.match(pdf, /^%PDF-1\.4/);
  assert.match(pdf, /\/Type \/Catalog/);
  assert.match(pdf, /startxref\n\d+\n%%EOF/);
  assert.match(pdf, /\(FACTURA X-1\) Tj/);
  assert.match(renderPdf(['(a) \\ b']).toString('latin1'), /\\\(a\\\)/);
});

test('el escritor de PNG produce una imagen válida y del tamaño esperado', () => {
  const png = renderPng(['ABC 123']);
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(png.subarray(12, 16).toString(), 'IHDR');
  assert.ok(png.includes(Buffer.from('IDAT')));
  assert.ok(png.includes(Buffer.from('IEND')));
  assert.ok(renderPng(['UNA LINEA MAS LARGA']).length > 100);
});

test('la fuente cubre lo que usan las facturas y degrada sin romperse', () => {
  for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,:-/#()%*@') {
    assert.equal(glyph(ch).length, 7, ch);
  }
  assert.deepEqual(glyph('ñ'), FONT['?']);
  assert.deepEqual(glyph('a'), FONT.A);
});

test('las especificaciones y el manifiesto no se desincronizan', () => {
  assert.equal(SPECS.length, MANIFEST.length);
  for (const [i, spec] of SPECS.entries()) {
    assert.equal(MANIFEST[i].id, spec.id);
    assert.equal(MANIFEST[i].expected.outcome, spec.expected);
    assert.equal(MANIFEST[i].extraction.amount, spec.amount);
  }
});
