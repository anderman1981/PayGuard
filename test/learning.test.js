import { test } from 'node:test';
import assert from 'node:assert/strict';
import { embed, cosine, tokenize, hashTerm, invoiceSignature, DIMENSIONS } from '../src/learning/vector.js';
import { CaseStore, mask } from '../src/learning/store.js';
import { advise, applyAdvice } from '../src/learning/advisor.js';
import { ADVISOR_DEFAULTS } from '../src/learning/config.js';
import { decide } from '../src/rules/policy.js';
import { evaluateInvoice } from '../src/rules/engine.js';
import { baseInvoice, invoiceWith, makeCtx } from './helpers/factory.js';

/** Memoria con n casos del mismo proveedor, resueltos como se indique. */
function storeWith(n, resolution, failedRules = ['R09'], name = 'DataPampa S.R.L.') {
  const store = new CaseStore();
  for (let i = 0; i < n; i += 1) {
    const inv = invoiceWith({ id: `c${i}`, counterpartyName: name, amount: 6000 + i });
    store.add({ invoice: inv, outcome: 'ESCALATE', failedRules, amountUsd: 6000 + i });
    if (resolution) store.resolve(`c${i}`, resolution, 'revisado por finanzas');
  }
  return store;
}

test('vectores: deterministas, normalizados y con la dimensión fijada', () => {
  const v = embed('DataPampa analítica de datos');
  assert.equal(v.length, DIMENSIONS);
  assert.deepEqual(v, embed('DataPampa analítica de datos'));
  assert.ok(Math.abs(Math.hypot(...v) - 1) < 1e-9);
  assert.deepEqual(embed(''), new Array(DIMENSIONS).fill(0));
});

test('vectores: el parecido se refleja en la similitud', () => {
  const a = embed('DataPampa analitica de datos mensual');
  const b = embed('DataPampa analitica de datos octubre');
  const c = embed('Oficinas Quindio arriendo bodega');
  assert.ok(cosine(a, b) > 0.5);
  assert.ok(cosine(a, c) < 0.2);
  assert.equal(cosine(a, [1, 2]), 0);
});

test('tokenización: quita vacías, normaliza tildes y agrupa números por magnitud', () => {
  assert.deepEqual(tokenize('Factura de Análisis 1234'), ['analisis', 'num4']);
  assert.deepEqual(tokenize(null), []);
  assert.ok(hashTerm('abc') < DIMENSIONS);
  assert.equal(hashTerm('abc'), hashTerm('abc'));
});

test('la firma de una factura no lleva el documento ni datos sensibles', () => {
  const sig = invoiceSignature(baseInvoice());
  assert.match(sig, /DataPampa/);
  assert.ok(!sig.includes('30-71234567-8'));
  assert.ok(!sig.includes('7730'));
  assert.equal(mask('900111222-1'), '****22-1');
  assert.equal(mask(null), null);
});

test('la memoria registra, resuelve y no duplica un mismo id', () => {
  const store = new CaseStore();
  const inv = baseInvoice();
  store.add({ invoice: inv, outcome: 'ESCALATE', failedRules: ['R09'], amountUsd: 2800 });
  store.add({ invoice: inv, outcome: 'HOLD', failedRules: ['R03'], amountUsd: 2800 });
  assert.equal(store.stats().total, 1);
  assert.equal(store.resolve(inv.id, 'approved', 'ok'), true);
  assert.equal(store.resolve('no-existe', 'approved', 'ok'), false);
  assert.deepEqual(store.stats(), { total: 1, resolved: 1, approved: 1, rejected: 0 });
});

test('la memoria encuentra parecidos y excluye la factura misma', () => {
  const store = storeWith(3, 'approved');
  const similar = store.similarTo(invoiceWith({ id: 'c0' }));
  assert.ok(similar.length >= 2);
  assert.ok(!similar.some((c) => c.record.id === 'c0'));
  assert.ok(similar[0].similarity >= similar[similar.length - 1].similarity);
  const otroRubro = invoiceWith({
    id: 'x', counterpartyName: 'Oficinas Quindío S.A.S.', concept: 'Arriendo bodega',
    currency: 'COP', contractRef: 'CT-2026-007', source: 'email',
  });
  assert.equal(store.similarTo(otroRubro).length, 0);
});

test('el consejero escala cuando casos parecidos fueron rechazados', () => {
  const advice = advise(invoiceWith({ id: 'nuevo' }), storeWith(4, 'rejected'));
  assert.equal(advice.shouldEscalate, true);
  assert.equal(advice.rejectionRate, 1);
  assert.deepEqual(advice.extractionHints, ['DataPampa S.R.L.']);
});

test('el consejero no escala sin evidencia suficiente ni con aprobaciones', () => {
  assert.equal(advise(invoiceWith({ id: 'n' }), storeWith(2, 'rejected')).shouldEscalate, false);
  assert.equal(advise(invoiceWith({ id: 'n' }), storeWith(5, 'approved')).shouldEscalate, false);
  assert.equal(advise(invoiceWith({ id: 'n' }), storeWith(5, null)).shouldEscalate, false);
  assert.equal(advise(invoiceWith({ id: 'n' }), new CaseStore()).similar.length, 0);
});

test('las propuestas nacen pendientes y nunca se aplican solas', () => {
  const porMonto = advise(invoiceWith({ id: 'n' }), storeWith(4, 'approved', ['R09'])).proposals;
  assert.equal(porMonto.length, 1);
  assert.equal(porMonto[0].kind, 'raise-threshold');
  assert.equal(porMonto[0].status, 'pending');
  assert.equal(porMonto[0].evidenceCount, 4);

  const porLista = advise(invoiceWith({ id: 'n' }), storeWith(4, 'approved', ['R04'])).proposals;
  assert.equal(porLista[0].kind, 'allow-counterparty');

  assert.deepEqual(advise(invoiceWith({ id: 'n' }), storeWith(4, 'rejected', ['R09'])).proposals, []);
  assert.deepEqual(advise(invoiceWith({ id: 'n', counterpartyName: null }), storeWith(4, 'approved')).proposals, []);
});

test('el consejo solo puede agregar escalamiento, nunca quitar ni rebajar', () => {
  const ctx = makeCtx();
  const results = evaluateInvoice(baseInvoice(), ctx);
  assert.equal(decide(results), 'PAY');

  const conRechazos = applyAdvice(results, advise(invoiceWith({ id: 'n' }), storeWith(4, 'rejected')));
  assert.equal(decide(conRechazos), 'ESCALATE');
  assert.equal(conRechazos.length, results.length + 1);
  assert.deepEqual(conRechazos.slice(0, results.length), results);

  const sinSeñal = applyAdvice(results, advise(invoiceWith({ id: 'n' }), storeWith(5, 'approved')));
  assert.deepEqual(sinSeñal, results);
});

test('el consejo no puede convertir una decisión frenada en pagada', () => {
  const ctx = makeCtx();
  const frenada = evaluateInvoice(invoiceWith({ amount: 25000 }), ctx);
  assert.equal(decide(frenada), 'HOLD');
  const conConsejo = applyAdvice(frenada, advise(invoiceWith({ id: 'n' }), storeWith(5, 'approved')));
  assert.equal(decide(conConsejo), 'HOLD');
});

test('los parámetros del consejero son configurables', () => {
  assert.equal(ADVISOR_DEFAULTS.minEvidence, 3);
  const estricto = advise(invoiceWith({ id: 'n' }), storeWith(3, 'rejected'), { minEvidence: 10 });
  assert.equal(estricto.shouldEscalate, false);
});

test('la memoria se puede exportar sin exponer el objeto interno', () => {
  const store = storeWith(2, 'approved');
  const copia = store.export();
  copia[0].agentOutcome = 'PAY';
  assert.equal(store.export()[0].agentOutcome, 'ESCALATE');
});
