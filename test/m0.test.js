import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertReadOnly, assertKeyAllowed, createReadOnlyClient, MoneyMovementBlockedError,
} from '../src/integrations/blinka/readonly-guard.js';
import { MockAccountSource } from '../src/integrations/blinka/account-source.js';
import { DEFAULT_RULES, validateRules } from '../src/config/default-rules.js';

const company = JSON.parse(readFileSync(new URL('../data/company.json', import.meta.url), 'utf8'));

test('guardia: solo GET/HEAD pasan', () => {
  assert.doesNotThrow(() => assertReadOnly('GET', '/v1/counterparties'));
  for (const m of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    assert.throws(() => assertReadOnly(m, '/v1/counterparties'), MoneyMovementBlockedError);
  }
});

test('guardia: rutas de dinero bloqueadas incluso por GET', () => {
  for (const p of ['/v1/payouts', '/move-money/convert', '/transfers/123', '/v1/payments']) {
    assert.throws(() => assertReadOnly('GET', p), MoneyMovementBlockedError);
  }
});

test('guardia: claves live rechazadas por defecto', () => {
  assert.throws(() => assertKeyAllowed('blk_live_xxx'), MoneyMovementBlockedError);
  assert.doesNotThrow(() => assertKeyAllowed('blk_test_xxx'));
  assert.doesNotThrow(() => assertKeyAllowed(undefined));
});

test('cliente de solo lectura nunca llama fetch con POST', async () => {
  let calls = 0;
  const client = createReadOnlyClient({ baseUrl: 'https://example.test', fetchImpl: async () => { calls++; return new Response('{}'); } });
  await client.request('/v1/balances');
  await assert.rejects(client.request('/v1/payouts', { method: 'POST' }), MoneyMovementBlockedError);
  assert.equal(calls, 1);
});

test('mock: busca contraparte por nombre o NIT, tolerante a tildes', () => {
  const src = new MockAccountSource(company);
  assert.equal(src.findCounterparty('pixel norte sas', null)?.id, 'cp-01');
  assert.equal(src.findCounterparty('Otro nombre', 'NAZ190305AB1')?.id, 'cp-03');
  assert.equal(src.findCounterparty('Empresa Fantasma', null), null);
});

test('mock: pago simulado no altera el snapshot original', () => {
  const src = new MockAccountSource(company);
  src.recordSimulatedPayment({ counterpartyId: 'cp-02', invoiceNumber: 'X', amount: 100, currency: 'USD', paidAt: '2026-10-10' });
  assert.equal(src.getBalances().USD, 84900);
  assert.equal(company.balances.USD, 85000);
});

test('reglas por defecto válidas y validador detecta errores', () => {
  assert.deepEqual(validateRules(DEFAULT_RULES), []);
  assert.ok(validateRules({ ...DEFAULT_RULES, humanApprovalAboveUSD: 99999 }).length > 0);
  assert.ok(validateRules({ ...DEFAULT_RULES, minExtractionConfidence: 2 }).length > 0);
});

test('datos: todo contrato apunta a una contraparte existente', () => {
  const ids = new Set(company.counterparties.map((c) => c.id));
  for (const ct of company.contracts) assert.ok(ids.has(ct.counterpartyId), ct.id);
});
