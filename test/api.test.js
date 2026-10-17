import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, ruleContext } from '../src/api/state.js';
import * as api from '../src/api/handlers.js';
import { approve, reject } from '../src/approvals/queue.js';
import { baseInvoice, invoiceWith } from './helpers/factory.js';

const COMPANY = new URL('../data/company.json', import.meta.url);
const NOW = new Date('2026-10-16T12:00:00Z');
const setup = () => {
  const state = createState(COMPANY, NOW);
  return { state, ctx: ruleContext(state, 'es') };
};
/** Factura que escala por monto (CloudForge, contrato con 10% de tolerancia). */
const escalable = (id = 'E1') => invoiceWith({
  id, counterpartyName: 'CloudForge LLC', counterpartyTaxId: 'US-87-1234567',
  contractRef: 'CT-2026-005', invoiceNumber: `CF-${id}`, amount: 7000,
  bank: { accountLast4: '0042' },
});

test('health informa modo, idioma y conteos', () => {
  const { state } = setup();
  const { status, body } = api.getHealth(state, 'en');
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.lang, 'en');
  assert.equal(body.decisions, 0);
});

test('las reglas se leen, se validan y el cambio queda auditado', async () => {
  const { state } = setup();
  assert.equal(api.getRules(state).status, 200);
  const malo = await api.putRules(state, { minExtractionConfidence: 5 }, 'admin');
  assert.equal(malo.status, 400);
  assert.ok(malo.body.errors.length > 0);
  const bueno = await api.putRules(state, { humanApprovalAboveUSD: 4000 }, 'Ana');
  assert.equal(bueno.status, 200);
  assert.equal(state.rules.humanApprovalAboveUSD, 4000);
  assert.equal(state.audit.list({ type: 'rules-change' })[0].actor, 'Ana');
});

test('run exige una lista de facturas y devuelve explicación', async () => {
  const { state, ctx } = setup();
  assert.equal((await api.postRun(state, [], 'es', ctx)).status, 400);
  assert.equal((await api.postRun(state, null, 'es', ctx)).status, 400);
  const { status, body } = await api.postRun(state, [baseInvoice()], 'es', ctx);
  assert.equal(status, 200);
  assert.equal(body[0].outcome, 'PAY');
  assert.match(body[0].explanation, /Decisión/);
});

test('decisiones: listado, detalle y 404', async () => {
  const { state, ctx } = setup();
  await api.postRun(state, [baseInvoice()], 'es', ctx);
  assert.equal(api.getDecisions(state, 'es').body.length, 1);
  assert.equal(api.getDecision(state, 'INV-TEST', 'en').status, 200);
  assert.match(api.getDecision(state, 'INV-TEST', 'en').body.explanation, /Decision/);
  assert.equal(api.getDecision(state, 'no-existe', 'es').status, 404);
});

test('aprobar convierte una pendiente en pagada y lo registra', async () => {
  const { state, ctx } = setup();
  const run = await api.postRun(state, [escalable()], 'es', ctx);
  assert.equal(run.body[0].outcome, 'ESCALATE');
  const res = await api.postApproval(state, 'E1', { action: 'approve', approver: 'Ana', reason: 'contrato al día' }, ctx);
  assert.equal(res.status, 200);
  assert.equal(state.decisions.get('E1').outcome, 'PAY');
  assert.equal(state.decisions.get('E1').decidedBy, 'human');
  assert.equal(state.cases.export()[0].humanResolution, 'approved');
  assert.equal(state.audit.list({ type: 'approval' }).length, 1);
});

test('una frenada no se puede aprobar nunca (invariante S3)', async () => {
  const { state, ctx } = setup();
  await api.postRun(state, [invoiceWith({ id: 'H1', amount: 25000, invoiceNumber: 'DP-9' })], 'es', ctx);
  const res = await approve('H1', { approver: 'Ana', reason: 'quiero pagarla' }, { state, ctx });
  assert.equal(res.ok, false);
  assert.match(res.error, /solo se aprueban facturas pendientes/);
  assert.equal(state.decisions.get('H1').outcome, 'HOLD');
});

test('aprobar revalida los límites duros en el momento de aprobar', async () => {
  const { state, ctx } = setup();
  await api.postRun(state, [escalable('E2')], 'es', ctx);
  state.account.recordSimulatedPayment({
    counterpartyId: 'cp-05', invoiceNumber: 'otra', amount: 84000, currency: 'USD', paidAt: '2026-10-15',
  });
  const res = await approve('E2', { approver: 'Ana', reason: 'ok' }, { state, ctx });
  assert.equal(res.ok, false);
  assert.ok(res.blocking.includes('R11') || res.blocking.includes('R10'));
  assert.equal(state.decisions.get('E2').outcome, 'ESCALATE');
  assert.equal(state.audit.list({ type: 'approval' })[0].payload.accepted, false);
});

test('rechazar frena la factura y alimenta el aprendizaje', async () => {
  const { state, ctx } = setup();
  await api.postRun(state, [escalable('E3')], 'es', ctx);
  const res = await reject('E3', { approver: 'Ana', reason: 'servicio no prestado' }, { state, ctx });
  assert.equal(res.ok, true);
  assert.equal(state.decisions.get('E3').outcome, 'HOLD');
  assert.equal(state.cases.export()[0].humanResolution, 'rejected');
  assert.equal(state.audit.list({ type: 'rejection' }).length, 1);
});

test('aprobaciones: validación de entrada y factura inexistente', async () => {
  const { state, ctx } = setup();
  assert.equal((await api.postApproval(state, 'x', { action: 'approve' }, ctx)).status, 400);
  assert.equal((await api.postApproval(state, 'x', { action: 'otra', approver: 'A', reason: 'r' }, ctx)).status, 400);
  const res = await api.postApproval(state, 'no-existe', { action: 'approve', approver: 'A', reason: 'r' }, ctx);
  assert.equal(res.status, 409);
  assert.equal((await reject('no-existe', { approver: 'A', reason: 'r' }, { state, ctx })).ok, false);
});

test('auditoría y métricas se exponen por la API', async () => {
  const { state, ctx } = setup();
  await api.postRun(state, [baseInvoice(), escalable('E4')], 'es', ctx);
  assert.equal(api.getAudit(state).body.length, 2);
  assert.equal((await api.getAuditVerify(state)).body.ok, true);
  const m = api.getMetrics(state, [{ id: 'INV-TEST', outcome: 'PAY' }, { id: 'E4', outcome: 'ESCALATE' }]).body;
  assert.equal(m.total, 2);
  assert.equal(m.accuracyPct, 100);
  assert.equal(m.unsafePayments, 0);
  assert.equal(m.learning.total, 2);
});

test('las propuestas del consejero se acumulan sin repetirse', async () => {
  const { state, ctx } = setup();
  assert.deepEqual(api.getProposals(state).body, []);
  for (let i = 0; i < 4; i += 1) {
    await api.postRun(state, [escalable(`P${i}`)], 'es', ctx);
    await api.postApproval(state, `P${i}`, { action: 'approve', approver: 'Ana', reason: 'habitual' }, ctx);
  }
  await api.postRun(state, [escalable('P9')], 'es', ctx);
  const proposals = api.getProposals(state).body;
  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].kind, 'raise-threshold');
  assert.equal(proposals[0].status, 'pending');
});

test('upload: rechaza con 403 cuando la subida está desactivada', async () => {
  const prev = process.env.PAYGUARD_ALLOW_UPLOAD;
  delete process.env.PAYGUARD_ALLOW_UPLOAD;
  try {
    const { state, ctx } = setup();
    const res = await api.postUpload(state, { file: { name: 'f.pdf', mime: 'application/pdf', bytes: [] } }, 'es', ctx);
    assert.equal(res.status, 403);
  } finally {
    if (prev === undefined) delete process.env.PAYGUARD_ALLOW_UPLOAD;
    else process.env.PAYGUARD_ALLOW_UPLOAD = prev;
  }
});

test('upload: valida que el payload traiga un archivo', async () => {
  const prev = process.env.PAYGUARD_ALLOW_UPLOAD;
  process.env.PAYGUARD_ALLOW_UPLOAD = '1';
  try {
    const { state, ctx } = setup();
    const res = await api.postUpload(state, { file: null }, 'es', ctx);
    assert.equal(res.status, 400);
  } finally {
    if (prev === undefined) delete process.env.PAYGUARD_ALLOW_UPLOAD;
    else process.env.PAYGUARD_ALLOW_UPLOAD = prev;
  }
});

test('upload: procesa el documento en modo caché y devuelve decisión', async () => {
  const prev = process.env.PAYGUARD_ALLOW_UPLOAD;
  process.env.PAYGUARD_ALLOW_UPLOAD = '1';
  try {
    const { state, ctx } = setup();
    const res = await api.postUpload(state, { file: { name: 'factura-x.pdf', mime: 'application/pdf', bytes: [] } }, 'es', ctx);
    assert.equal(res.status, 200);
    assert.equal(res.body.provider, 'cache');
    assert.equal(res.body.invoice.id, 'factura-x');
    assert.ok(res.body.decision);
    assert.ok(state.decisions.has('factura-x'));
  } finally {
    if (prev === undefined) delete process.env.PAYGUARD_ALLOW_UPLOAD;
    else process.env.PAYGUARD_ALLOW_UPLOAD = prev;
  }
});
