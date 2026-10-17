// @ts-check
/**
 * Corrida diaria: selecciona las facturas "con pago para hoy" y las procesa con
 * el motor existente, una por una, avisando de cada transición para que la
 * interfaz las muestre en vivo. Nunca mueve dinero: solo decide, registra y
 * explica, igual que el resto del agente (invariante S1).
 *
 * La IA no decide aquí nada: la selección es una comparación de fechas y la
 * decisión la toma `processInvoice`. Este módulo solo orquesta y pacea.
 */
import { readFileSync } from 'node:fs';
import { processInvoice } from '../agent.js';

/** @typedef {import('../domain/types.js').ExtractedInvoice} ExtractedInvoice */

/** Una fecha YYYY-MM-DD válida (no valida calendario, solo forma). @param {unknown} v */
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/**
 * Facturas con pago para la fecha de referencia: las que vencen ese día o antes
 * (vencidas, aún pendientes de decisión). Como las fechas son YYYY-MM-DD, la
 * comparación de texto equivale a la comparación cronológica.
 * @param {ExtractedInvoice[]} invoices
 * @param {string} referenceDate  YYYY-MM-DD
 * @returns {ExtractedInvoice[]}
 */
export function selectDueInvoices(invoices, referenceDate) {
  if (!Array.isArray(invoices) || !isDate(referenceDate)) return [];
  return invoices.filter((inv) => isDate(inv?.dueDate) && /** @type {string} */ (inv.dueDate) <= referenceDate);
}

/**
 * Partes del reloj de pared en una zona horaria IANA, en formato de 24 horas.
 * @param {Date} date
 * @param {string} timeZone
 * @returns {{ hour: number, minute: number, second: number }}
 */
function wallClock(date, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const part = Object.fromEntries(fmt.formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
  return { hour: Number(part.hour), minute: Number(part.minute), second: Number(part.second) };
}

/**
 * Milisegundos desde `now` hasta la próxima hora en punto `hour`:00 en la zona
 * `timeZone`. Trabaja sobre la duración del reloj de pared, así no necesita
 * convertir a UTC; en un cambio de horario de verano puede desviarse una hora,
 * aceptable para un disparador de demostración (en producción iría un cron).
 * @param {number} hour         0..23
 * @param {string} timeZone     zona IANA, p. ej. "America/Bogota"
 * @param {Date} now
 * @returns {number}
 */
export function nextDailyRunMs(hour, timeZone, now) {
  let tz = timeZone;
  let wc;
  try {
    wc = wallClock(now, tz);
  } catch {
    tz = 'UTC';
    wc = wallClock(now, tz);
  }
  const secondsIntoDay = wc.hour * 3600 + wc.minute * 60 + wc.second;
  let delta = hour * 3600 - secondsIntoDay;
  if (delta <= 0) delta += 86400;
  return Math.max(0, delta * 1000 - now.getMilliseconds());
}

/**
 * Lee el set de ejemplo desde un manifest y devuelve solo las extracciones, que
 * es lo que el motor procesa. No persiste nada: es un set ficticio de demo.
 * @param {URL} manifestUrl
 * @returns {ExtractedInvoice[]}
 */
export function loadDataset(manifestUrl) {
  try {
    const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8'));
    return Array.isArray(manifest) ? manifest.map((entry) => entry.extraction).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/**
 * @typedef {Object} DailyDeps
 * @property {import('../rules/helpers.js').RuleContext} ctx
 * @property {(event: Record<string, unknown>) => void} [onEvent]  aviso por transición
 * @property {() => Promise<void>} [delay]                         pausa entre facturas (vacía por defecto)
 */

/**
 * Procesa en orden las facturas dadas y deja cada decisión en el estado. Antes
 * de evaluar cada factura avisa `evaluating`; al terminarla avisa `decided`.
 * Devuelve las decisiones completas (con su consejo) para quien las necesite.
 * @param {import('../api/state.js').AppState} state
 * @param {ExtractedInvoice[]} invoices
 * @param {DailyDeps} deps
 */
export async function runDailyRun(state, invoices, { ctx, onEvent = () => {}, delay }) {
  const decisions = [];
  for (const invoice of invoices) {
    onEvent({ type: 'evaluating', invoiceId: invoice.id });
    if (delay) await delay();
    const decision = await processInvoice(invoice, { ctx, audit: state.audit, cases: state.cases });
    state.invoices.set(invoice.id, invoice);
    state.decisions.set(decision.invoiceId, decision);
    for (const proposal of decision.advice.proposals) {
      if (!state.proposals.some((x) => x.kind === proposal.kind && x.subject === proposal.subject)) {
        state.proposals.push(proposal);
      }
    }
    onEvent({ type: 'decided', decision });
    decisions.push(decision);
  }
  return decisions;
}
