import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nitCheckDigit, validateNit, isValidCufe, validateIva, checkColombianInvoice, cleanNit, IVA_RATES,
} from '../src/validators/colombia.js';
import { r13, countryOf } from '../src/rules/r13-regional.js';
import { evaluateInvoice } from '../src/rules/engine.js';
import { invoiceWith, makeCtx } from './helpers/factory.js';

/** NIT con su dígito correcto, calculado con el mismo algoritmo (datos ficticios). */
const withDv = (/** @type {string} */ base) => `${base}-${nitCheckDigit(base)}`;

test('el dígito de verificación es estable y consistente', () => {
  for (const base of ['900111222', '901333444', '902555666', '8301234']) {
    const dv = nitCheckDigit(base);
    assert.ok(dv !== null && dv >= 0 && dv <= 9, base);
    assert.equal(validateNit(withDv(base)).ok, true, base);
  }
  assert.equal(nitCheckDigit('900111222'), nitCheckDigit('900.111.222'));
  assert.equal(cleanNit('900.111.222-1'), '9001112221');
});

test('un dígito de verificación equivocado se detecta', () => {
  const base = '900111222';
  const wrong = (nitCheckDigit(base) + 1) % 10;
  const r = validateNit(`${base}-${wrong}`);
  assert.equal(r.ok, false);
  assert.equal(r.got, wrong);
  assert.equal(r.expected, nitCheckDigit(base));
});

test('NIT ilegible o sin dígito no pasa', () => {
  assert.equal(validateNit('123').ok, false);
  assert.equal(validateNit('900111222').ok, false);
  assert.equal(validateNit('').ok, false);
  assert.equal(nitCheckDigit('12345678901234567890'), null);
});

test('CUFE: solo se acepta el formato correcto', () => {
  assert.equal(isValidCufe('a'.repeat(96)), true);
  assert.equal(isValidCufe('A1'.repeat(48)), true);
  assert.equal(isValidCufe('a'.repeat(95)), false);
  assert.equal(isValidCufe('z'.repeat(96)), false);
  assert.equal(isValidCufe(null), false);
});

test('IVA: solo tarifas vigentes, con un peso de tolerancia', () => {
  assert.deepEqual(IVA_RATES, [0, 0.05, 0.19]);
  assert.equal(validateIva({ subtotal: 1000000, iva: 190000 }).rate, 0.19);
  assert.equal(validateIva({ subtotal: 1000000, iva: 50000 }).rate, 0.05);
  assert.equal(validateIva({ subtotal: 1000000, iva: 0 }).rate, 0);
  assert.equal(validateIva({ subtotal: 1000000, iva: 190001 }).ok, true);
  assert.equal(validateIva({ subtotal: 1000000, iva: 120000 }).ok, false);
  assert.equal(validateIva({ subtotal: 0, iva: 0 }).ok, false);
});

test('revisión completa: factura correcta sin observaciones', () => {
  const r = checkColombianInvoice({
    taxId: withDv('900111222'), cufe: 'f'.repeat(96),
    subtotal: 1000000, iva: 190000, withholdings: 25000, total: 1165000,
  });
  assert.deepEqual(r, { ok: true, issues: [] });
});

test('revisión completa: reporta cada problema por separado', () => {
  const r = checkColombianInvoice({
    taxId: '900111222-9', cufe: 'corto', subtotal: 1000000, iva: 120000, total: 999999,
  });
  assert.equal(r.ok, false);
  assert.deepEqual(r.issues.map((i) => i.code).sort(), ['cufe', 'iva', 'nit', 'total']);
  assert.match(r.issues.find((i) => i.code === 'nit').detail, /debería ser/);
});

test('sin datos no inventa problemas', () => {
  assert.deepEqual(checkColombianInvoice({}), { ok: true, issues: [] });
  assert.equal(checkColombianInvoice({ subtotal: 1000, total: 1000 }).ok, true);
});

test('R13 escala una factura colombiana con NIT inválido', () => {
  const ctx = makeCtx();
  const inv = invoiceWith({
    counterpartyName: 'Oficinas Quindío S.A.S.', counterpartyTaxId: '901333444-9',
    currency: 'COP', amount: 8500000, contractRef: 'CT-2026-007', bank: { accountLast4: '3001' },
  });
  const out = r13.evaluate(inv, ctx);
  assert.equal(out.verdict, 'ESCALATE');
  assert.match(String(out.vars.detail), /dígito de verificación/);
  assert.equal(out.evidence.country, 'CO');
});

test('R13 deja pasar una factura colombiana correcta', () => {
  const ctx = makeCtx();
  const inv = invoiceWith({ counterpartyName: 'Oficinas Quindío S.A.S.', counterpartyTaxId: '901333444-4' });
  assert.equal(r13.evaluate(inv, ctx).verdict, 'PASS');
});

test('R13 no aplica a países sin validador propio', () => {
  const ctx = makeCtx();
  assert.equal(r13.evaluate(invoiceWith({}), ctx).verdict, 'PASS');
  assert.equal(countryOf(invoiceWith({}), ctx), 'AR');
  assert.equal(countryOf(invoiceWith({ counterpartyName: 'X', counterpartyTaxId: 'US-1' }), ctx), null);
});

test('R13 reconoce Colombia por la forma del NIT aunque no esté registrada', () => {
  const ctx = makeCtx();
  const inv = invoiceWith({ counterpartyName: 'Nueva Empresa S.A.S.', counterpartyTaxId: '900111222-9' });
  assert.equal(countryOf(inv, ctx), 'CO');
  assert.equal(r13.evaluate(inv, ctx).verdict, 'ESCALATE');
});

test('R13 está en el motor y traduce su motivo', () => {
  const ctx = makeCtx({}, { lang: 'en' });
  const inv = invoiceWith({ counterpartyName: 'Oficinas Quindío S.A.S.', counterpartyTaxId: '901333444-9' });
  const result = evaluateInvoice(inv, ctx).find((r) => r.ruleId === 'R13');
  assert.equal(result.verdict, 'ESCALATE');
  assert.match(result.name, /country/i);
});
