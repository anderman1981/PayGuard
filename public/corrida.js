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
const CORRIDA_PAGE = 15;
let corridaPage = 0;

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
  rows.clear();
  running = true;
  if (repaint) repaint();
  try {
    const res = await api('/daily-run', { method: 'POST', body: JSON.stringify({}) });
    for (const d of res.decisions) {
      const row = rows.get(d.invoiceId) ?? { id: d.invoiceId };
      rows.set(d.invoiceId, {
        ...row, status: d.outcome, outcome: d.outcome,
        summary: d.summary, failed: d.failed, explanation: d.explanation,
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

/** Mezcla un array aleatoriamente (Fisher-Yates). @param {any[]} arr */
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

/**
 * Selecciona 10 facturas del pool con mezcla de resultados:
 * ~5 PAY, ~3 HOLD, ~2 ESCALATE. Las que ya están en `rows` se incluyen
 * intencionalmente para que el motor las detecte como duplicados.
 * @param {any[]} manifest
 */
function pickDemo(manifest) {
  /** @type {Record<string, any[]>} */
  const bucket = { PAY: [], HOLD: [], ESCALATE: [] };
  for (const inv of manifest) {
    const out = /** @type {string} */ (inv.expected?.outcome ?? 'PAY');
    if (out in bucket) bucket[out].push(inv);
  }
  const pick = (/** @type {any[]} */ arr, n) => shuffle(arr).slice(0, n);
  const selected = [...pick(bucket.PAY, 5), ...pick(bucket.HOLD, 3), ...pick(bucket.ESCALATE, 2)];
  if (selected.length < 10) selected.push(...shuffle(manifest).slice(0, 10 - selected.length));
  return selected.slice(0, 10);
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
  corridaPage = 0;
  rows.clear();
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
    rows.clear();
    running = true;
    if (repaint) repaint();
    try {
      const manifest = await fetch('/data/invoices/manifest.json').then((r) => r.json()).catch(() => []);
      const selected = pickDemo(manifest);
      for (const inv of selected) {
        rows.set(inv.id, { ...inv.extraction, id: inv.id, status: 'PENDIENTE' });
      }
      corridaPage = 0;
      if (repaint) repaint();
      const invoices = selected.map((/** @type {any} */ i) => i.extraction);
      const res = await api('/run', { method: 'POST', body: JSON.stringify({ invoices }) });
      for (const d of res) {
        const row = rows.get(d.invoiceId) ?? { id: d.invoiceId };
        rows.set(d.invoiceId, {
          ...row, status: d.outcome, outcome: d.outcome,
          summary: d.summary, failed: d.failed, explanation: d.explanation,
        });
        const ex = state.decisions.find((/** @type {any} */ x) => x.invoiceId === d.invoiceId);
        if (ex) Object.assign(ex, d); else state.decisions.push(d);
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
  const pager = el('div', { id: 'corrida-pager' });
  const table = el('table', {}, [
    el('thead', {}, [el('tr', {}, ['Factura', 'Beneficiario', 'Monto', 'Vence', 'Estado', 'Novedad'].map((h) => el('th', { text: h })))]),
    body,
  ]);

  repaint = () => {
    const tbody = document.getElementById('corrida-rows');
    const pagerEl = document.getElementById('corrida-pager');
    if (!tbody) return;
    btn.toggleAttribute('disabled', running);
    demoBtn.toggleAttribute('disabled', running);
    btn.textContent = running ? 'Corriendo…' : 'Correr ahora';
    demoBtn.textContent = running ? 'Corriendo…' : 'Ejecutar set demo';
    const list = [...rows.values()];
    const done = list.filter((r) => r.outcome).length;
    status.textContent = list.length === 0
      ? 'No hay facturas con pago para hoy.'
      : `${list.length} con pago para hoy · ${done} decidida(s)`;

    const pages = Math.max(1, Math.ceil(list.length / CORRIDA_PAGE));
    corridaPage = Math.min(corridaPage, pages - 1);
    const slice = list.slice(corridaPage * CORRIDA_PAGE, (corridaPage + 1) * CORRIDA_PAGE);

    tbody.textContent = '';
    if (list.length === 0) {
      const vacio = 'Sin facturas para hoy. Usa "Ejecutar set demo" o espera el disparador de las 07:00.';
      tbody.append(el('tr', {}, [el('td', { colspan: '6', class: 'muted', text: vacio })]));
    } else {
      for (const row of slice) tbody.append(rowNode({ el, lang: state.lang, onOpen }, row));
    }

    if (pagerEl) {
      pagerEl.textContent = '';
      if (list.length > CORRIDA_PAGE) {
        const info = el('span', { class: 'muted', text: `Pág ${corridaPage + 1} / ${pages} · ${list.length} factura(s)` });
        const prev = el('button', { class: 'btn ghost', type: 'button', text: '← Anterior' });
        const next = el('button', { class: 'btn ghost', type: 'button', text: 'Siguiente →' });
        prev.toggleAttribute('disabled', corridaPage === 0);
        next.toggleAttribute('disabled', corridaPage >= pages - 1);
        prev.addEventListener('click', () => { corridaPage--; if (repaint) repaint(); });
        next.addEventListener('click', () => { corridaPage++; if (repaint) repaint(); });
        pagerEl.append(el('div', { class: 'topbar' }, [prev, info, next]));
      } else if (list.length > 0) {
        const infoText = `${list.length} factura(s)`;
        pagerEl.append(el('div', { class: 'topbar' }, [el('span', { class: 'muted', text: infoText })]));
      }
    }
  };

  const intro = 'Las facturas que vencen hoy o están pendientes. El agente las evalúa en vivo; nunca mueve dinero, solo decide y explica.';
  const head = el('div', { class: 'stack' }, [
    el('p', { class: 'muted', text: intro }),
    el('div', { class: 'topbar' }, [btn, demoBtn, status]),
    table,
    pager,
  ]);

  queueMicrotask(async () => {
    try { await loadToday(api); } catch (err) { setNotice(/** @type {Error} */ (err).message, 'stop'); }
    repaint();
  });
  repaint();
  return head;
}
