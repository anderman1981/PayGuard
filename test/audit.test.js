import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AuditLog, sha256, canonical, GENESIS_HASH } from '../src/audit/log.js';
import { explain, summarize } from '../src/audit/explain.js';
import { processInvoice, processBatch } from '../src/agent.js';
import { computeMetrics } from '../src/metrics.js';
import { CaseStore } from '../src/learning/store.js';
import { baseInvoice, invoiceWith, makeCtx } from './helpers/factory.js';

const deps = (lang = 'es') => ({ ctx: makeCtx({}, { lang }), audit: new AuditLog(), cases: new CaseStore() });

test('la cadena encadena: cada entrada apunta al hash anterior', async () => {
  const log = new AuditLog();
  assert.equal(log.head(), GENESIS_HASH);
  const a = await log.append({ type: 'decision', invoiceId: 'A', payload: { outcome: 'PAY' } });
  const b = await log.append({ type: 'decision', invoiceId: 'B', payload: { outcome: 'HOLD' } });
  assert.equal(a.prevHash, GENESIS_HASH);
  assert.equal(b.prevHash, a.hash);
  assert.equal(log.head(), b.hash);
  assert.deepEqual(await log.verify(), { ok: true, brokenAt: null, length: 2 });
});

test('alterar una entrada rompe la verificación', async () => {
  const log = new AuditLog();
  await log.append({ type: 'decision', invoiceId: 'A', payload: { outcome: 'HOLD' } });
  await log.append({ type: 'decision', invoiceId: 'B', payload: { outcome: 'HOLD' } });
  log.entries[0].payload = { outcome: 'PAY' };
  const result = await log.verify();
  assert.equal(result.ok, false);
  assert.equal(result.brokenAt, 0);
});

test('borrar una entrada del medio rompe la verificación', async () => {
  const log = new AuditLog();
  for (const id of ['A', 'B', 'C']) await log.append({ type: 'decision', invoiceId: id });
  log.entries.splice(1, 1);
  assert.equal((await log.verify()).ok, false);
});

test('hash estable y canónico sin importar el orden de las claves', async () => {
  assert.equal(await sha256('payguard'), await sha256('payguard'));
  assert.equal((await sha256('a')).length, 64);
  assert.equal(canonical({ b: 1, a: 2 }), canonical({ a: 2, b: 1 }));
  assert.notEqual(canonical({ a: { x: 1 } }), canonical({ a: { x: 2 } }));
  assert.equal(canonical([1, { b: 2, a: 1 }]), '[1,{"a":1,"b":2}]');
});

test('el registro se puede filtrar por factura y por tipo', async () => {
  const log = new AuditLog();
  await log.append({ type: 'decision', invoiceId: 'A' });
  await log.append({ type: 'approval', invoiceId: 'A', actor: 'Ana' });
  await log.append({ type: 'decision', invoiceId: 'B' });
  assert.equal(log.list({ invoiceId: 'A' }).length, 2);
  assert.equal(log.list({ type: 'approval' }).length, 1);
  assert.equal(log.list().length, 3);
});

test('el agente decide, audita y recuerda el caso', async () => {
  const d = deps();
  const decision = await processInvoice(baseInvoice(), d);
  assert.equal(decision.outcome, 'PAY');
  assert.equal(d.audit.entries.length, 1);
  assert.equal(d.audit.entries[0].type, 'decision');
  assert.equal(d.cases.stats().total, 1);
  assert.equal((await d.audit.verify()).ok, true);
});

test('el pago simulado descuenta el saldo para la siguiente factura', async () => {
  const d = deps();
  const antes = d.ctx.account.getBalances().USD;
  await processInvoice(baseInvoice(), d);
  assert.equal(d.ctx.account.getBalances().USD, antes - 2800);
});

test('una factura frenada no toca el saldo', async () => {
  const d = deps();
  const antes = d.ctx.account.getBalances().USD;
  const decision = await processInvoice(invoiceWith({ id: 'B', amount: 25000, invoiceNumber: 'DP-9' }), d);
  assert.equal(decision.outcome, 'HOLD');
  assert.equal(d.ctx.account.getBalances().USD, antes);
});

test('la explicación se lee en cualquier idioma, sin importar en cuál se evaluó', async () => {
  const d = deps('es');
  const decision = await processInvoice(invoiceWith({ id: 'C', amount: 25000, invoiceNumber: 'DP-9' }), d);
  const es = explain(decision, 'es');
  const en = explain(decision, 'en');
  assert.match(es, /Frenada/);
  assert.match(es, /R09/);
  assert.match(en, /Held/);
  assert.match(en, /exceeds the maximum per payment/);
  assert.ok(!en.includes('supera'));
});

test('una decisión que cumple todo lo dice sin listar reglas', async () => {
  const d = deps();
  const decision = await processInvoice(baseInvoice(), d);
  assert.match(explain(decision, 'es'), /se cumplen/);
  assert.equal(summarize(decision, 'es'), 'Pagada');
  const frenada = await processInvoice(invoiceWith({ id: 'D', amount: 25000, invoiceNumber: 'DP-8' }), deps());
  assert.match(summarize(frenada, 'es'), /Frenada · R06, R09/);
});

test('el lote se procesa en orden y cada decisión queda auditada', async () => {
  const d = deps();
  const decisions = await processBatch([
    baseInvoice(),
    invoiceWith({ id: 'B', amount: 25000, invoiceNumber: 'DP-9' }),
    invoiceWith({ id: 'C', counterpartyName: 'Empresa Fantasma Ltda.', counterpartyTaxId: '1', invoiceNumber: 'EF-1' }),
  ], d);
  assert.deepEqual(decisions.map((x) => x.outcome), ['PAY', 'HOLD', 'ESCALATE']);
  assert.equal(d.audit.entries.length, 3);
  assert.equal((await d.audit.verify()).ok, true);
});

test('métricas: autonomía, precisión y pagos inseguros', () => {
  const decisions = [
    { invoiceId: 'A', outcome: 'PAY' }, { invoiceId: 'B', outcome: 'HOLD' },
    { invoiceId: 'C', outcome: 'ESCALATE' }, { invoiceId: 'D', outcome: 'PAY' },
  ];
  const expected = [
    { id: 'A', outcome: 'PAY' }, { id: 'B', outcome: 'HOLD' },
    { id: 'C', outcome: 'ESCALATE' }, { id: 'D', outcome: 'HOLD' },
  ];
  const m = computeMetrics(/** @type {never} */ (decisions), expected);
  assert.equal(m.total, 4);
  assert.equal(m.autonomyPct, 75);
  assert.equal(m.accuracyPct, 75);
  assert.equal(m.unsafePayments, 1);
  assert.equal(m.mismatches.length, 1);
});

test('métricas sin expectativas no inventan precisión', () => {
  const m = computeMetrics(/** @type {never} */ ([{ invoiceId: 'A', outcome: 'PAY' }]));
  assert.equal(m.accuracyPct, null);
  assert.equal(m.unsafePayments, 0);
  assert.equal(computeMetrics([]).autonomyPct, 0);
});
