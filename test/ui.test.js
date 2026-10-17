import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  money, counts, filterRows, parseRulesForm, metricTiles, TONE,
  buildManualInvoice, parseInvoicesJson, deriveAgentMessages,
} from '../public/lib.js';

const PUBLIC = new URL('../public/', import.meta.url);
const read = (/** @type {string} */ f) => readFileSync(new URL(f, PUBLIC), 'utf8');

const rows = [
  { invoiceId: 'INV-001', outcome: 'PAY', summary: 'Pagada', decidedBy: 'agent', failed: [], explanation: '' },
  { invoiceId: 'INV-013', outcome: 'HOLD', summary: 'Frenada · R03', decidedBy: 'agent', failed: ['R03'], explanation: '' },
  { invoiceId: 'INV-023', outcome: 'ESCALATE', summary: 'Pendiente · R09', decidedBy: 'human', failed: ['R09'], explanation: '' },
];

test('formato de dinero por idioma, con respaldo si la divisa es rara', () => {
  assert.match(money(2800, 'USD', 'en'), /2,800/);
  assert.match(money(2800, 'EUR', 'de'), /2\.800/);
  assert.equal(money(null, 'USD', 'es'), '—');
  assert.equal(money(10, null, 'es'), '—');
  assert.equal(money(Number.NaN, 'USD', 'es'), '—');
  assert.equal(money(10, 'XYZABC', 'es'), '10 XYZABC');
});

test('conteo por resultado', () => {
  assert.deepEqual(counts(rows), { PAY: 1, HOLD: 1, ESCALATE: 1, total: 3 });
  assert.deepEqual(counts([]), { PAY: 0, HOLD: 0, ESCALATE: 0, total: 0 });
});

test('filtros por resultado y por texto', () => {
  assert.equal(filterRows(rows).length, 3);
  assert.equal(filterRows(rows, { outcome: 'HOLD' }).length, 1);
  assert.equal(filterRows(rows, { query: 'r09' })[0].invoiceId, 'INV-023');
  assert.equal(filterRows(rows, { query: 'INV-001' }).length, 1);
  assert.equal(filterRows(rows, { query: 'zzz' }).length, 0);
  assert.equal(filterRows(rows, { outcome: 'PAY', query: 'R03' }).length, 0);
});

test('el formulario de reglas se convierte al formato de la API', () => {
  const parsed = parseRulesForm({
    humanApprovalAboveUSD: '5000', minExtractionConfidence: '0.85',
    allowedCurrencies: 'usd, cop , mxn', allowedCountries: '', vacio: '',
  });
  assert.equal(parsed.humanApprovalAboveUSD, 5000);
  assert.equal(parsed.minExtractionConfidence, 0.85);
  assert.deepEqual(parsed.allowedCurrencies, ['USD', 'COP', 'MXN']);
  assert.deepEqual(parsed.allowedCountries, []);
  assert.ok(!('vacio' in parsed));
});

test('las métricas marcan en rojo cualquier pago indebido', () => {
  const ok = metricTiles({ autonomyPct: 62.5, accuracyPct: 100, unsafePayments: 0 });
  assert.equal(ok[0].value, '62.5%');
  assert.equal(ok[2].tone, 'ok');
  const malo = metricTiles({ autonomyPct: 50, accuracyPct: null, unsafePayments: 1 });
  assert.equal(malo[1].value, '—');
  assert.equal(malo[2].tone, 'stop');
});

test('cada resultado tiene su tono visual', () => {
  assert.deepEqual(Object.keys(TONE).sort(), ['ESCALATE', 'HOLD', 'PAY']);
});

test('la interfaz no usa innerHTML con datos ni scripts en línea', () => {
  const app = read('app.js');
  assert.ok(!/\.innerHTML\s*=/.test(app), 'nada se inserta como marcado');
  assert.ok(!app.includes('insertAdjacentHTML'));
  assert.ok(!app.includes('document.write'));
  const html = read('index.html');
  assert.ok(!/<script(?![^>]*src=)/.test(html), 'no debe haber scripts en línea (lo prohíbe la CSP)');
  assert.ok(!/ on[a-z]+=/.test(html), 'no debe haber manejadores en atributos');
  assert.match(html, /<script type="module" src="\/app\.js">/);
});

test('la interfaz cubre las cinco vistas y respeta la accesibilidad básica', () => {
  const app = read('app.js');
  for (const v of ['resumen', 'facturas', 'aprobaciones', 'reglas', 'auditoria']) {
    assert.ok(app.includes(`'${v}'`), `falta la vista ${v}`);
  }
  assert.match(app, /aria-current/);
  assert.match(app, /tabindex/);
  assert.match(read('index.html'), /aria-live="polite"/);
  assert.match(read('index.html'), /lang="es"/);
  assert.match(read('index.html'), /rel="icon"/, 'el icono evita un 404 en cada carga');
});

test('la hoja de estilos define modo claro y oscuro y es usable en móvil', () => {
  const css = read('app.css');
  assert.match(css, /prefers-color-scheme: dark/);
  assert.match(css, /@media \(max-width: 820px\)/);
  assert.match(css, /focus-visible/);
});

test('buildManualInvoice arma una factura válida con confianza plena', () => {
  const inv = buildManualInvoice({
    id: 'FAC-9', counterpartyName: 'Proveedor S.A.', counterpartyTaxId: 'US-12-3456789',
    amount: '1.250,50', currency: 'usd', issueDate: '2026-10-01', dueDate: '2026-10-31',
    invoiceNumber: 'INV-9', contractRef: 'CT-9', accountLast4: '0042', concept: 'Servicios',
  });
  assert.equal(inv.id, 'FAC-9');
  assert.equal(inv.source, 'chat');
  assert.equal(inv.currency, 'USD');
  assert.equal(inv.amount, 1250.5);
  assert.deepEqual(inv.bank, { accountLast4: '0042' });
  assert.equal(inv.confidence.amount, 1);
  assert.equal(typeof inv.rawText, 'string');
});

test('buildManualInvoice deja null los campos vacíos y genera un id si falta', () => {
  const inv = buildManualInvoice({ counterpartyName: '', amount: '' });
  assert.ok(String(inv.id).startsWith('manual-'));
  assert.equal(inv.counterpartyName, null);
  assert.equal(inv.amount, null);
  assert.equal(inv.bank, null);
});

test('parseInvoicesJson acepta objeto, lista y {invoices}, y reporta errores', () => {
  assert.equal(parseInvoicesJson('').error !== null, true);
  assert.equal(parseInvoicesJson('{').error, 'El JSON no es válido.');
  assert.deepEqual(parseInvoicesJson('{"id":"A"}').invoices.length, 1);
  assert.deepEqual(parseInvoicesJson('[{"id":"A"},{"id":"B"}]').invoices.length, 2);
  assert.deepEqual(parseInvoicesJson('{"invoices":[{"id":"A"}]}').invoices.length, 1);
  assert.equal(parseInvoicesJson('[1,2]').error, 'Cada factura debe ser un objeto.');
});

test('deriveAgentMessages avisa solo de frenadas y escaladas, con el porqué', () => {
  const msgs = deriveAgentMessages(rows);
  assert.equal(msgs.length, 2);
  const hold = msgs.find((m) => m.id === 'INV-013');
  const esc = msgs.find((m) => m.id === 'INV-023');
  assert.equal(hold.outcome, 'HOLD');
  assert.ok(hold.text.startsWith('No voy a pagar INV-013:'));
  assert.ok(hold.text.includes('R03'));
  assert.ok(esc.text.startsWith('Necesito tu aprobación para INV-023:'));
});
