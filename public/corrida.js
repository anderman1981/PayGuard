// @ts-check
/**
 * Vista "Hoy": la corrida diaria en vivo. Muestra qué facturas vencen hoy, deja
 * correrlas con un botón y las va cambiando de estado en tiempo real
 * (PENDIENTE → evaluando → Pagada/Frenada/Pendiente) según los eventos del
 * servidor (SSE). Las que tienen novedad (frenada o escalada) quedan con una
 * etiqueta visible y disparan el aviso al humano. Nada se inserta como marcado:
 * todo pasa por textContent, así el contenido de una factura no inyecta nada.
 */
import { money } from './lib.js';

/** Estado de cada fila entre repintados. @type {Map<string, Record<string, any>>} */
const rows = new Map();
/** Repintado de la vista actual, si está montada. @type {(() => void)|null} */
let repaint = null;
/** Flujo de eventos en vivo, uno solo para toda la app. @type {EventSource|null} */
let source = null;
/** Aviso al humano (notifier.sync), inyectado por app.js. @type {((d: any[]) => void)|null} */
let notify = null;
let running = false;

const STATUS = /** @type {const} */ ({
  PENDIENTE: { text: 'Pendiente', tone: 'wait' },
  evaluando: { text: 'Evaluando…', tone: 'wait' },
  PAY: { text: 'Pagada', tone: 'ok' },
  HOLD: { text: 'Frenada', tone: 'stop' },
  ESCALATE: { text: 'Pendiente de aprobación', tone: 'wait' },
});

/** Etiqueta de novedad para las que no se pagan solas. @param {string} outcome */
function noveltyTag(outcome) {
  if (outcome === 'HOLD') return 'Novedad · no se paga';
  if (outcome === 'ESCALATE') return 'Novedad · requiere aprobación';
  return '';
}

/** @param {Record<string, any>} ev */
function onDecided(ev) {
  const row = rows.get(ev.invoiceId) ?? { id: ev.invoiceId };
  rows.set(ev.invoiceId, {
    ...row, status: ev.outcome, outcome: ev.outcome,
    summary: ev.summary, failed: ev.failed ?? [], explanation: ev.explanation ?? '',
  });
  if (repaint) repaint();
}

/** Abre un único flujo de eventos y actualiza las filas conforme llegan. @param {any} api */
function ensureSource(api) {
  if (source || typeof EventSource === 'undefined') return;
  source = new EventSource('/api/events');
  source.addEventListener('evaluating', (/** @type {MessageEvent} */ e) => {
    const ev = JSON.parse(e.data);
    const row = rows.get(ev.invoiceId) ?? { id: ev.invoiceId };
    rows.set(ev.invoiceId, { ...row, status: 'evaluando' });
    if (repaint) repaint();
  });
  source.addEventListener('decided', (/** @type {MessageEvent} */ e) => onDecided(JSON.parse(e.data)));
  source.addEventListener('run-start', () => { running = true; if (repaint) repaint(); });
  source.addEventListener('run-done', () => { running = false; if (repaint) repaint(); });
}

/** Carga las facturas con pago para hoy y las deja como PENDIENTE. @param {any} api */
async function loadToday(api) {
  const { date, invoices } = await api('/daily-run');
  for (const inv of invoices) {
    const prev = rows.get(inv.id);
    rows.set(inv.id, { ...inv, status: prev?.status ?? 'PENDIENTE', outcome: prev?.outcome });
  }
  return date;
}

/**
 * Lanza la corrida. El avance se ve por SSE; al terminar, el cuerpo de la
 * respuesta confirma el resultado y dispara el aviso al humano.
 * @param {any} api @param {any} state @param {(t: string, tone: string) => void} setNotice
 */
async function runNow(api, state, setNotice) {
  if (running) return;
  running = true;
  if (repaint) repaint();
  try {
    const res = await api('/daily-run', { method: 'POST', body: JSON.stringify({}) });
    for (const d of res.decisions) {
      const row = rows.get(d.invoiceId) ?? { id: d.invoiceId };
      rows.set(d.invoiceId, {
        ...row, status: d.outcome, outcome: d.outcome, summary: d.summary, failed: d.failed, explanation: d.explanation,
      });
      const existing = state.decisions.find((/** @type {any} */ x) => x.invoiceId === d.invoiceId);
      if (existing) Object.assign(existing, d); else state.decisions.push(d);
    }
    if (notify) notify(state.decisions);
    const novedades = res.decisions.filter((/** @type {any} */ d) => d.outcome !== 'PAY').length;
    setNotice(`Corrida del ${res.date}: ${res.count} factura(s), ${novedades} con novedad.`, novedades ? 'wait' : 'ok');
  } catch (err) {
    setNotice(/** @type {Error} */ (err).message, 'stop');
  } finally {
    running = false;
    if (repaint) repaint();
  }
}

/** @param {{ el: any, lang: string, onOpen?: ((id: string) => void)|null }} ui @param {Record<string, any>} row */
function rowNode({ el, lang, onOpen }, row) {
  const st = STATUS[/** @type {keyof typeof STATUS} */ (row.status)] ?? STATUS.PENDIENTE;
  const tag = noveltyTag(row.outcome);
  const novelty = tag
    ? el('span', { class: `pill ${row.outcome === 'HOLD' ? 'stop' : 'wait'}`, text: tag })
    : el('span', { class: 'muted', text: '—' });
  const cells = [
    el('td', {}, [el('span', { class: 'mono', text: row.id })]),
    el('td', { text: String(row.counterpartyName ?? '—') }),
    el('td', { class: 'mono', text: money(row.amount, row.currency, lang) }),
    el('td', { class: 'mono muted', text: String(row.dueDate ?? '—') }),
    el('td', {}, [el('span', { class: `pill ${st.tone}`, text: st.text })]),
    el('td', {}, [novelty]),
  ];
  const tr = el('tr', { tabindex: '0' }, cells);
  if (row.explanation) tr.setAttribute('title', row.explanation);
  if (onOpen && row.outcome) {
    tr.style.cursor = 'pointer';
    tr.addEventListener('click', () => /** @type {Function} */ (onOpen)(row.id));
    tr.addEventListener('keydown', (/** @type {KeyboardEvent} */ e) => {
      if (e.key === 'Enter') /** @type {Function} */ (onOpen)(row.id);
    });
  }
  return tr;
}

/**
 * @param {{ el: any, api: any, state: any, setNotice: (t: string, tone: string) => void,
 *   notify?: (d: any[]) => void, openDrawer?: (id: string) => void }} ctx
 */
export function viewCorrida(ctx) {
  const { el, api, state, setNotice } = ctx;
  const onOpen = ctx.openDrawer ?? null;
  notify = ctx.notify ?? null;
  ensureSource(api);

  const btn = el('button', { class: 'btn', type: 'button', text: 'Correr ahora' });
  const demoBtn = el('button', { class: 'btn ghost', type: 'button', text: 'Ejecutar set demo' });
  const status = el('span', { class: 'muted' });
  btn.addEventListener('click', () => runNow(api, state, setNotice));
  demoBtn.addEventListener('click', async () => {
    if (running) return;
    running = true;
    if (repaint) repaint();
    try {
      const manifest = await fetch('/data/invoices/manifest.json').then((r) => r.json()).catch(() => []);
      for (const inv of manifest) {
        rows.set(inv.id, { ...inv.extraction, id: inv.id, status: 'PENDIENTE' });
      }
      if (repaint) repaint();
      const invoices = manifest.map((/** @type {any} */ i) => i.extraction);
      const res = await api('/run', { method: 'POST', body: JSON.stringify({ invoices }) });
      for (const d of res) {
        const row = rows.get(d.invoiceId) ?? { id: d.invoiceId };
        rows.set(d.invoiceId, {
          ...row, status: d.outcome, outcome: d.outcome,
          summary: d.summary, failed: d.failed, explanation: d.explanation,
        });
        const existing = state.decisions.find((/** @type {any} */ x) => x.invoiceId === d.invoiceId);
        if (existing) Object.assign(existing, d); else state.decisions.push(d);
      }
      if (notify) notify(state.decisions);
      const novedades = res.filter((/** @type {any} */ d) => d.outcome !== 'PAY').length;
      setNotice(`Set demo: ${res.length} factura(s), ${novedades} con novedad.`, novedades ? 'wait' : 'ok');
    } catch (err) {
      setNotice(/** @type {Error} */ (err).message, 'stop');
    } finally {
      running = false;
      if (repaint) repaint();
    }
  });

  const body = el('tbody', { id: 'corrida-rows' });
  const table = el('table', {}, [
    el('thead', {}, [el('tr', {}, ['Factura', 'Beneficiario', 'Monto', 'Vence', 'Estado', 'Novedad'].map((h) => el('th', { text: h })))]),
    body,
  ]);

  repaint = () => {
    const el2 = document.getElementById('corrida-rows');
    if (!el2) return;
    btn.toggleAttribute('disabled', running);
    demoBtn.toggleAttribute('disabled', running);
    btn.textContent = running ? 'Corriendo…' : 'Correr ahora';
    demoBtn.textContent = running ? 'Corriendo…' : 'Ejecutar set demo';
    const list = [...rows.values()];
    const done = list.filter((r) => r.outcome).length;
    status.textContent = list.length === 0
      ? 'No hay facturas con pago para hoy.'
      : `${list.length} con pago para hoy · ${done} decidida(s)`;
    el2.textContent = '';
    if (list.length === 0) {
      const vacio = 'Sin facturas para hoy. Usa "Ejecutar set demo" o espera el disparador de las 07:00.';
      el2.append(el('tr', {}, [el('td', { colspan: '6', class: 'muted', text: vacio })]));
      return;
    }
    for (const row of list) el2.append(rowNode({ el, lang: state.lang, onOpen }, row));
  };

  const intro = 'Las facturas que vencen hoy o están pendientes. El agente las evalúa en vivo; nunca mueve dinero, solo decide y explica.';
  const head = el('div', { class: 'stack' }, [
    el('p', { class: 'muted', text: intro }),
    el('div', { class: 'topbar' }, [btn, demoBtn, status]),
    table,
  ]);

  queueMicrotask(async () => {
    try { await loadToday(api); } catch (err) { setNotice(/** @type {Error} */ (err).message, 'stop'); }
    repaint();
  });
  repaint();
  return head;
}
