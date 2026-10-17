import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, ruleContext } from '../src/api/state.js';
import * as api from '../src/api/handlers.js';
import { selectDueInvoices, nextDailyRunMs, loadDataset, runDailyRun } from '../src/daily/daily-run.js';
import { invoiceWith, NOW } from './helpers/factory.js';

const COMPANY_URL = new URL('../data/company.json', import.meta.url);
const MANIFEST = new URL('../data/invoices/manifest.json', import.meta.url);
const setup = () => {
  const state = createState(COMPANY_URL, NOW);
  return { state, ctx: ruleContext(state, 'es') };
};
/** Factura que vence en la fecha dada. @param {string} id @param {string} dueDate */
const due = (id, dueDate) => invoiceWith({ id, invoiceNumber: `DP-${id}`, dueDate });

test('selectDueInvoices toma las que vencen hoy o antes y descarta fechas inválidas', () => {
  const invoices = [due('A', '2026-10-10'), due('B', '2026-10-16'), due('C', '2026-10-20'), invoiceWith({ id: 'D', dueDate: null })];
  const picked = selectDueInvoices(invoices, '2026-10-16').map((i) => i.id);
  assert.deepEqual(picked, ['A', 'B']);
  assert.deepEqual(selectDueInvoices(invoices, 'no-fecha'), []);
  assert.deepEqual(selectDueInvoices(/** @type {any} */ (null), '2026-10-16'), []);
});

test('nextDailyRunMs calcula el próximo 07:00 y tolera una zona inválida', () => {
  const madrugada = new Date('2026-10-16T05:00:00Z'); // 05:00 UTC → faltan 2 h
  assert.equal(nextDailyRunMs(7, 'UTC', madrugada), 2 * 3600 * 1000);
  const tarde = new Date('2026-10-16T08:00:00Z'); // ya pasaron las 07:00 → mañana
  assert.equal(nextDailyRunMs(7, 'UTC', tarde), 23 * 3600 * 1000);
  // zona inexistente: cae a UTC sin lanzar.
  assert.equal(nextDailyRunMs(7, 'Zona/Inventada', madrugada), 2 * 3600 * 1000);
});

test('loadDataset lee el set de ejemplo y devuelve extracciones; una ruta mala da lista vacía', () => {
  const data = loadDataset(MANIFEST);
  assert.ok(data.length > 0);
  assert.ok(data.every((i) => typeof i.id === 'string'));
  assert.deepEqual(loadDataset(new URL('./no-existe.json', import.meta.url)), []);
});

test('runDailyRun procesa en orden, guarda decisiones y avisa cada transición', async () => {
  const { state, ctx } = setup();
  /** @type {string[]} */ const events = [];
  let paused = 0;
  const invoices = [due('T1', '2026-10-10'), due('T2', '2026-10-12')];
  const decisions = await runDailyRun(state, invoices, {
    ctx, onEvent: (e) => events.push(String(e.type)), delay: async () => { paused += 1; },
  });
  assert.equal(decisions.length, 2);
  assert.ok(state.decisions.has('T1') && state.decisions.has('T2'));
  assert.deepEqual(events, ['evaluating', 'decided', 'evaluating', 'decided']);
  assert.equal(paused, 2);
});

test('getDailyRun previsualiza lo que vence para la fecha del estado o la pedida', () => {
  const { state } = setup();
  const dataset = [due('P1', '2026-10-10'), due('P2', '2026-11-30')];
  const hoy = api.getDailyRun(state, { dataset });
  assert.equal(hoy.body.date, '2026-10-16');
  assert.deepEqual(hoy.body.invoices.map((/** @type {any} */ i) => i.id), ['P1']);
  const futuro = api.getDailyRun(state, { dataset, date: '2026-11-30' });
  assert.deepEqual(futuro.body.invoices.map((/** @type {any} */ i) => i.id), ['P1', 'P2']);
  assert.equal(api.getDailyRun(state, {}).body.invoices.length, 0);
});

test('postDailyRun corre la selección por el motor y explica; emite "decided" enriquecido', async () => {
  const { state, ctx } = setup();
  const dataset = [due('R1', '2026-10-10')];
  /** @type {any[]} */ const seen = [];
  const res = await api.postDailyRun(state, {}, 'es', ctx, { dataset, onEvent: (e) => seen.push(e) });
  assert.equal(res.status, 200);
  assert.equal(res.body.count, 1);
  assert.equal(res.body.decisions[0].invoiceId, 'R1');
  assert.match(res.body.decisions[0].explanation, /Decisión/);
  const decided = seen.find((e) => e.type === 'decided');
  assert.ok(decided && 'explanation' in decided && Array.isArray(decided.failed));
  assert.ok(seen.some((e) => e.type === 'evaluating'));
});

test('postDailyRun acepta facturas en el cuerpo y una fecha, sin onEvent', async () => {
  const { state, ctx } = setup();
  const res = await api.postDailyRun(state, {
    date: '2026-10-20', invoices: [due('B1', '2026-10-18'), due('B2', '2026-10-25')],
  }, 'es', ctx, {});
  assert.deepEqual(res.body.decisions.map((/** @type {any} */ d) => d.invoiceId), ['B1']);
  assert.ok(state.decisions.has('B1'));
  assert.ok(!state.decisions.has('B2'));
});
