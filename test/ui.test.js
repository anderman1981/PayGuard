import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { money, counts, filterRows, parseRulesForm, metricTiles, TONE } from '../public/lib.js';

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
