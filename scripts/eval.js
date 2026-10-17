// @ts-check
/**
 * Evaluación del agente sobre el set completo (M7).
 * Imprime autonomía, seguridad y precisión, la matriz de confusión y el detalle
 * de cualquier diferencia contra lo esperado.
 *
 *   npm run eval            evalúa y muestra el informe
 *   npm run eval -- --json  salida en JSON, para el CI
 *
 * Sale con código 1 si hay un pago indebido o la precisión no es del 100%:
 * así una regresión rompe el build, no la demo.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createState, ruleContext } from '../src/api/state.js';
import { processBatch } from '../src/agent.js';
import { computeMetrics } from '../src/metrics.js';
import { blockingResults } from '../src/rules/policy.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUTCOMES = /** @type {const} */ (['PAY', 'HOLD', 'ESCALATE']);

/**
 * Corre el set y devuelve métricas, matriz de confusión y reglas más frecuentes.
 * @param {{ now?: Date, lang?: import('../src/i18n/messages.js').Lang }} [opts]
 */
export async function evaluate({ now = new Date('2026-10-16T12:00:00Z'), lang = 'es' } = {}) {
  const manifest = JSON.parse(readFileSync(`${ROOT}data/invoices/manifest.json`, 'utf8'));
  const state = createState(new URL('file://', import.meta.url) && new URL(`file://${ROOT}data/company.json`), now);
  const decisions = await processBatch(
    manifest.map((/** @type {{extraction: unknown}} */ m) => m.extraction),
    { ctx: ruleContext(state, lang), audit: state.audit, cases: state.cases },
  );

  const expected = manifest.map((/** @type {{id: string, expected: {outcome: string}}} */ m) => ({
    id: m.id, outcome: m.expected.outcome,
  }));
  const metrics = computeMetrics(decisions, expected);

  /** Matriz: esperado × obtenido. */
  const matrix = Object.fromEntries(OUTCOMES.map((e) => [e, Object.fromEntries(OUTCOMES.map((g) => [g, 0]))]));
  const byId = new Map(decisions.map((d) => [d.invoiceId, d]));
  for (const e of expected) {
    const got = byId.get(e.id)?.outcome;
    if (got) matrix[e.outcome][got] += 1;
  }

  /** Cuántas veces marcó cada regla. */
  /** @type {Record<string, number>} */
  const ruleHits = {};
  for (const d of decisions) {
    for (const r of blockingResults(d.results)) ruleHits[r.ruleId] = (ruleHits[r.ruleId] ?? 0) + 1;
  }

  return {
    metrics,
    matrix,
    ruleHits,
    auditOk: (await state.audit.verify()).ok,
    byCase: manifest.map((/** @type {{id: string, case: string, expected: {outcome: string}}} */ m) => ({
      id: m.id,
      case: m.case,
      expected: m.expected.outcome,
      got: byId.get(m.id)?.outcome ?? '—',
      rules: blockingResults(byId.get(m.id)?.results ?? []).map((r) => r.ruleId),
    })),
  };
}

/** @param {Awaited<ReturnType<typeof evaluate>>} report */
function printReport(report) {
  const { metrics: m, matrix, ruleHits, auditOk } = report;
  const line = (/** @type {string} */ s) => process.stdout.write(`${s}\n`);

  line('\nEvaluación de PayGuard sobre el set completo');
  line('═'.repeat(52));
  line(`Facturas            ${m.total}`);
  line(`Pagadas             ${m.paid}`);
  line(`Frenadas            ${m.held}`);
  line(`Pendientes          ${m.escalated}`);
  line('─'.repeat(52));
  line(`Seguridad           ${m.unsafePayments === 0 ? '✓ 0 pagos indebidos' : `✗ ${m.unsafePayments} PAGOS INDEBIDOS`}`);
  line(`Precisión           ${m.accuracyPct}%`);
  line(`Autonomía           ${m.autonomyPct}%`);
  line(`Auditoría           ${auditOk ? '✓ cadena íntegra' : '✗ cadena rota'}`);
  line('─'.repeat(52));

  line('\nMatriz (filas: esperado · columnas: obtenido)');
  line(`${''.padEnd(12)}${OUTCOMES.map((o) => o.padStart(10)).join('')}`);
  for (const e of OUTCOMES) {
    line(`${e.padEnd(12)}${OUTCOMES.map((g) => String(matrix[e][g]).padStart(10)).join('')}`);
  }

  line('\nReglas que más marcaron');
  for (const [rule, hits] of Object.entries(ruleHits).sort((a, b) => b[1] - a[1])) {
    line(`  ${rule}  ${'█'.repeat(hits)} ${hits}`);
  }

  if (m.mismatches.length > 0) {
    line('\nDiferencias contra lo esperado');
    for (const d of m.mismatches) line(`  ✗ ${d}`);
  }
  line('');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = await evaluate();
  if (process.argv.includes('--json')) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  else printReport(report);

  const failed = report.metrics.unsafePayments > 0
    || report.metrics.accuracyPct !== 100
    || !report.auditOk;
  process.exit(failed ? 1 : 0);
}
