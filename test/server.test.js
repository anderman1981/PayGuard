import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

test('servidor: health, company, rules y validación', async () => {
  const port = 3999;
  const env = { ...process.env, PORT: String(port), PAYGUARD_DAILY_STEP_MS: '0' };
  const proc = spawn(process.execPath, ['server.js'], { env, stdio: 'pipe' });
  await new Promise((r) => proc.stdout.once('data', r));
  try {
    const base = `http://localhost:${port}`;
    assert.equal((await (await fetch(`${base}/api/health`)).json()).ok, true);
    assert.equal((await (await fetch(`${base}/api/company`)).json()).company.name, 'Andes Labs Inc.');
    const bad = await fetch(`${base}/api/rules`, { method: 'PUT', body: JSON.stringify({ minExtractionConfidence: 5 }) });
    assert.equal(bad.status, 400);
    const ok = await fetch(`${base}/api/rules`, { method: 'PUT', body: JSON.stringify({ humanApprovalAboveUSD: 4000 }) });
    assert.equal((await ok.json()).humanApprovalAboveUSD, 4000);
    // la ruta de subida es alcanzable (antes la tapaba el 404 genérico): sin
    // PAYGUARD_ALLOW_UPLOAD responde 403, no 404.
    const upBody = JSON.stringify({ file: { name: 'f.pdf', mime: 'application/pdf', bytes: [] } });
    const up = await fetch(`${base}/api/upload`, { method: 'POST', body: upBody });
    assert.equal(up.status, 403);
    // la ruta de notificación existe y está apagada por defecto.
    const nt = await fetch(`${base}/api/notify`, { method: 'POST', body: JSON.stringify({ text: 'hola' }) });
    assert.equal(nt.status, 200);
    assert.equal((await nt.json()).slack, 'desactivado');
    // corrida diaria: la vista previa lista facturas con pago para hoy.
    const preview = await (await fetch(`${base}/api/daily-run`)).json();
    assert.ok(Array.isArray(preview.invoices));
    assert.match(preview.date, /^\d{4}-\d{2}-\d{2}$/);
    // correrla procesa y devuelve decisiones explicadas (cero pagos reales).
    const run = await (await fetch(`${base}/api/daily-run`, { method: 'POST', body: '{}' })).json();
    assert.equal(run.count, preview.invoices.length);
    assert.ok(run.decisions.every((/** @type {any} */ d) => typeof d.explanation === 'string'));
    // el flujo de eventos en vivo responde como text/event-stream.
    const ev = await fetch(`${base}/api/events`);
    assert.equal(ev.status, 200);
    assert.match(ev.headers.get('content-type') ?? '', /text\/event-stream/);
    await ev.body?.cancel();
    assert.equal((await fetch(`${base}/`)).status, 200);
    assert.equal((await fetch(`${base}/src/config/default-rules.js`)).status, 200);
    assert.equal((await fetch(`${base}/src/..%2F.env.example`)).status, 403);
    assert.notEqual((await fetch(`${base}/src/%2E%2E/server.js`)).status, 200);
  } finally { proc.kill(); }
});
