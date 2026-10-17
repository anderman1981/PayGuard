import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../scripts/eval.js';

const report = await evaluate();

test('la evaluación cumple los tres criterios del reto', () => {
  assert.equal(report.metrics.unsafePayments, 0, 'seguridad: no puede haber pagos indebidos');
  assert.equal(report.metrics.accuracyPct, 100, 'precisión contra lo esperado');
  assert.ok(report.metrics.autonomyPct >= 60, `autonomía ${report.metrics.autonomyPct}%`);
  assert.equal(report.auditOk, true, 'la cadena de auditoría verifica');
  assert.deepEqual(report.metrics.mismatches, []);
});

test('la matriz de confusión es diagonal', () => {
  for (const esperado of ['PAY', 'HOLD', 'ESCALATE']) {
    for (const obtenido of ['PAY', 'HOLD', 'ESCALATE']) {
      if (esperado !== obtenido) {
        assert.equal(report.matrix[esperado][obtenido], 0, `${esperado} → ${obtenido}`);
      }
    }
  }
  const diagonal = ['PAY', 'HOLD', 'ESCALATE'].reduce((sum, o) => sum + report.matrix[o][o], 0);
  assert.equal(diagonal, report.metrics.total);
});

test('el informe detalla cada caso y las reglas que lo marcaron', () => {
  assert.equal(report.byCase.length, report.metrics.total);
  const duplicado = report.byCase.find((c) => c.case === 'duplicate-number');
  assert.equal(duplicado.got, 'HOLD');
  assert.ok(duplicado.rules.includes('R03'));
  const normal = report.byCase.find((c) => c.case === 'normal');
  assert.deepEqual(normal.rules, []);
});

test('las reglas que marcan cubren varias familias, no una sola', () => {
  const reglas = Object.keys(report.ruleHits);
  assert.ok(reglas.length >= 8, `solo marcaron ${reglas.length} reglas distintas`);
  for (const esperada of ['R01', 'R02', 'R03', 'R04', 'R05', 'R06', 'R08', 'R09', 'R10', 'R12']) {
    assert.ok(reglas.includes(esperada), `ninguna factura ejercita ${esperada}`);
  }
});

test('la evaluación es reproducible', async () => {
  const otra = await evaluate();
  assert.deepEqual(otra.metrics, report.metrics);
  assert.deepEqual(otra.matrix, report.matrix);
});
