// @ts-check
/**
 * Interfaz de PayGuard: cinco vistas sobre la API, sin dependencias ni build.
 * Nada se inserta con innerHTML a partir de datos: todo pasa por textContent,
 * así el contenido de una factura nunca puede inyectar marcado.
 */
import { money, counts, filterRows, parseRulesForm, metricTiles, TONE } from './lib.js';

const VIEWS = [
  ['resumen', 'Resumen'], ['facturas', 'Facturas'], ['aprobaciones', 'Aprobaciones'],
  ['reglas', 'Reglas'], ['auditoria', 'Auditoría'],
];

const state = {
  view: 'resumen', lang: 'es', query: '', outcome: 'ALL',
  /** @type {import('./lib.js').DecisionRow[]} */ decisions: [],
  metrics: { autonomyPct: 0, accuracyPct: null, unsafePayments: 0, total: 0 },
  rules: /** @type {Record<string, unknown>} */ ({}),
  invoices: /** @type {{id: string, extraction: Record<string, unknown>}[]} */ ([]),
  audit: /** @type {Record<string, unknown>[]} */ ([]),
  proposals: /** @type {Record<string, unknown>[]} */ ([]),
  notice: /** @type {{text: string, tone: string}|null} */ (null),
};

const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));

/** @param {string} tag @param {Record<string, string>} [attrs] @param {(Node|string)[]} [children] */
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v);
  }
  for (const child of children) node.append(child);
  return node;
}

/** @param {string} path @param {RequestInit} [init] */
async function api(path, init) {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`/api${path}${sep}lang=${state.lang}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(Array.isArray(body.errors) ? body.errors.join('; ') : body.error ?? `error ${res.status}`);
  return body;
}

// ---------- Vistas ----------

function viewResumen() {
  const c = counts(state.decisions);
  const tiles = [
    { label: 'Pagadas', value: String(c.PAY), tone: 'ok' },
    { label: 'Frenadas', value: String(c.HOLD), tone: 'stop' },
    { label: 'Pendientes', value: String(c.ESCALATE), tone: 'wait' },
    ...metricTiles(state.metrics),
  ];
  const grid = el('div', { class: 'tiles' }, tiles.map((t) => el('div', { class: 'tile' }, [
    el('b', { text: t.value }), el('span', { text: t.label }),
  ])));

  const prop = el('div', { class: 'stack' }, [
    el('h2', { text: 'Propuestas de ajuste' }),
    el('p', {
      class: 'muted',
      text: 'El sistema las sugiere a partir de casos resueltos. Ninguna se aplica sin que una persona la apruebe.',
    }),
    ...(state.proposals.length === 0
      ? [el('p', { class: 'muted', text: 'Todavía no hay propuestas.' })]
      : state.proposals.map((p) => el('div', { class: 'rule' }, [
        el('header', {}, [el('span', { class: 'pill wait', text: 'Pendiente' }), el('strong', { text: String(p.subject) })]),
        el('p', { text: String(p.rationale) }),
      ]))),
  ]);
  return el('div', {}, [grid, prop]);
}

function viewFacturas() {
  const search = el('input', { id: 'q', type: 'search', placeholder: 'Buscar por id, regla o estado', value: state.query });
  search.addEventListener('input', () => { state.query = /** @type {HTMLInputElement} */ (search).value; paintTable(); });

  const select = el('select', { id: 'f', 'aria-label': 'Filtrar por resultado' }, [
    el('option', { value: 'ALL', text: 'Todas' }), el('option', { value: 'PAY', text: 'Pagadas' }),
    el('option', { value: 'HOLD', text: 'Frenadas' }), el('option', { value: 'ESCALATE', text: 'Pendientes' }),
  ]);
  /** @type {HTMLSelectElement} */ (select).value = state.outcome;
  select.addEventListener('change', () => { state.outcome = /** @type {HTMLSelectElement} */ (select).value; paintTable(); });

  const body = el('tbody', { id: 'rows' });
  const table = el('table', {}, [
    el('thead', {}, [el('tr', {}, ['Factura', 'Resultado', 'Reglas marcadas', 'Decidió'].map((h) => el('th', { text: h })))]),
    body,
  ]);
  const wrap = el('div', {}, [el('div', { class: 'topbar' }, [search, select]), table]);
  queueMicrotask(paintTable);
  return wrap;
}

function paintTable() {
  const body = document.getElementById('rows');
  if (!body) return;
  body.textContent = '';
  const rows = filterRows(state.decisions, { outcome: state.outcome, query: state.query });
  if (rows.length === 0) {
    const empty = el('td', { colspan: '4', class: 'muted', text: 'Sin resultados. Procesa las facturas primero.' });
    body.append(el('tr', {}, [empty]));
    return;
  }
  for (const r of rows) {
    const tr = el('tr', { tabindex: '0' }, [
      el('td', {}, [el('span', { class: 'mono', text: r.invoiceId })]),
      el('td', {}, [el('span', { class: `pill ${TONE[r.outcome]}`, text: r.summary.split(' · ')[0] })]),
      el('td', { class: 'mono muted', text: (r.failed ?? []).join(', ') || '—' }),
      el('td', { class: 'muted', text: r.decidedBy === 'human' ? 'Persona' : 'Agente' }),
    ]);
    tr.addEventListener('click', () => openDrawer(r.invoiceId));
    tr.addEventListener('keydown', (e) => { if (/** @type {KeyboardEvent} */ (e).key === 'Enter') openDrawer(r.invoiceId); });
    body.append(tr);
  }
}

function viewAprobaciones() {
  const pending = state.decisions.filter((d) => d.outcome === 'ESCALATE');
  if (pending.length === 0) return el('p', { class: 'muted', text: 'No hay facturas esperando aprobación.' });

  return el('div', { class: 'stack' }, pending.map((d) => {
    const who = el('input', { placeholder: 'Tu nombre', 'aria-label': `Quién decide ${d.invoiceId}` });
    const why = el('input', { placeholder: 'Motivo', 'aria-label': `Motivo para ${d.invoiceId}` });
    /** @param {'approve'|'reject'} action */
    const send = async (action) => {
      const approver = /** @type {HTMLInputElement} */ (who).value.trim();
      const reason = /** @type {HTMLInputElement} */ (why).value.trim();
      if (!approver || !reason) return setNotice('Hace falta tu nombre y el motivo.', 'stop');
      try {
        await api(`/approvals/${encodeURIComponent(d.invoiceId)}`, {
          method: 'POST', body: JSON.stringify({ action, approver, reason }),
        });
        setNotice(`${d.invoiceId}: ${action === 'approve' ? 'aprobada' : 'rechazada'} por ${approver}.`, 'ok');
        await refresh();
      } catch (err) {
        setNotice(`${d.invoiceId}: ${/** @type {Error} */ (err).message}`, 'stop');
      }
      return undefined;
    };
    const ok = el('button', { class: 'btn', type: 'button', text: 'Aprobar' });
    const no = el('button', { class: 'btn ghost', type: 'button', text: 'Rechazar' });
    ok.addEventListener('click', () => send('approve'));
    no.addEventListener('click', () => send('reject'));

    return el('div', { class: 'rule' }, [
      el('header', {}, [el('span', { class: 'pill wait', text: 'Pendiente' }), el('strong', { class: 'mono', text: d.invoiceId })]),
      el('p', { text: d.explanation }),
      el('div', { class: 'topbar' }, [who, why, ok, no]),
    ]);
  }));
}

function viewReglas() {
  const fields = [
    ['humanApprovalAboveUSD', 'Aprobación humana por encima de (USD)'],
    ['maxPerPaymentUSD', 'Máximo por pago (USD)'],
    ['periodBudgetUSD', 'Presupuesto del periodo (USD)'],
    ['minExtractionConfidence', 'Confianza mínima de lectura (0 a 1)'],
    ['duplicateWindowDays', 'Ventana de duplicados (días)'],
    ['maxDaysOverdue', 'Máximo de días vencida'],
    ['allowedCurrencies', 'Monedas permitidas'],
    ['allowedCountries', 'Países permitidos'],
  ];
  /** @type {Record<string, HTMLInputElement>} */
  const inputs = {};
  const grid = el('div', { class: 'form-grid' }, fields.map(([key, label]) => {
    const value = state.rules[key];
    const input = el('input', { id: key, value: Array.isArray(value) ? value.join(', ') : String(value ?? '') });
    inputs[key] = /** @type {HTMLInputElement} */ (input);
    return el('label', { for: key }, [label, input]);
  }));

  const save = el('button', { class: 'btn', type: 'button', text: 'Guardar y reprocesar' });
  save.addEventListener('click', async () => {
    const form = Object.fromEntries(Object.entries(inputs).map(([k, i]) => [k, i.value]));
    try {
      await api('/rules', { method: 'PUT', body: JSON.stringify(parseRulesForm(form)) });
      setNotice('Reglas guardadas. El cambio quedó en la auditoría.', 'ok');
      await runBatch();
    } catch (err) {
      setNotice(/** @type {Error} */ (err).message, 'stop');
    }
  });

  return el('div', { class: 'stack' }, [
    el('p', { class: 'muted', text: 'Cada cambio queda registrado en la auditoría con quién lo hizo.' }),
    grid, el('div', {}, [save]),
  ]);
}

function viewAuditoria() {
  const check = el('button', { class: 'btn ghost', type: 'button', text: 'Verificar integridad' });
  check.addEventListener('click', async () => {
    const r = await api('/audit/verify');
    const text = r.ok
      ? `Cadena íntegra: ${r.length} entradas verificadas.`
      : `Cadena rota en la entrada ${r.brokenAt}.`;
    setNotice(text, r.ok ? 'ok' : 'stop');
  });

  const rows = state.audit.map((e) => el('tr', {}, [
    el('td', { class: 'mono', text: String(e.index) }),
    el('td', { text: String(e.type) }),
    el('td', { class: 'mono', text: String(e.invoiceId ?? '—') }),
    el('td', { text: String(e.actor) }),
    el('td', { class: 'mono muted', text: String(e.hash).slice(0, 12) }),
  ]));
  return el('div', { class: 'stack' }, [
    el('div', {}, [check]),
    el('table', {}, [
      el('thead', {}, [el('tr', {}, ['#', 'Tipo', 'Factura', 'Quién', 'Hash'].map((h) => el('th', { text: h })))]),
      el('tbody', {}, rows.length ? rows : [el('tr', {}, [el('td', { colspan: '5', class: 'muted', text: 'Sin entradas.' })])]),
    ]),
  ]);
}

// ---------- Detalle ----------

async function openDrawer(/** @type {string} */ id) {
  const drawer = $('drawer');
  const d = await api(`/decisions/${encodeURIComponent(id)}`);
  const invoice = state.invoices.find((i) => i.id === id)?.extraction ?? {};
  const close = el('button', { class: 'btn ghost', type: 'button', text: 'Cerrar' });
  close.addEventListener('click', () => { drawer.hidden = true; });

  drawer.textContent = '';
  drawer.append(
    el('div', { class: 'topbar' }, [el('h2', { class: 'mono', text: id }), el('span', { class: 'grow' }), close]),
    el('div', { class: 'tiles' }, [
      el('div', { class: 'tile' }, [
        el('b', { text: money(/** @type {number} */ (invoice.amount), /** @type {string} */ (invoice.currency), state.lang) }),
        el('span', { text: String(invoice.counterpartyName ?? '—') }),
      ]),
      el('div', { class: 'tile' }, [
        el('b', {}, [el('span', { class: `pill ${TONE[d.outcome]}`, text: d.summary.split(' · ')[0] })]),
        el('span', { text: `Decidió: ${d.decidedBy === 'human' ? 'una persona' : 'el agente'}` }),
      ]),
    ]),
    el('pre', { text: d.explanation }),
    el('h3', { text: 'Reglas' }),
    ...d.results.map((/** @type {Record<string, string>} */ r) => el('div', { class: 'rule' }, [
      el('header', {}, [
        el('span', { class: `pill ${r.verdict === 'PASS' ? 'ok' : TONE[d.outcome] ?? 'wait'}`, text: r.ruleId }),
        el('strong', { text: r.name }),
      ]),
      el('p', { text: r.reason }),
    ])),
    el('h3', { text: 'Documento leído' }),
    el('pre', { text: String(invoice.rawText ?? '—') }),
  );
  drawer.hidden = false;
}

// ---------- Ciclo ----------

function setNotice(/** @type {string} */ text, /** @type {string} */ tone) {
  state.notice = { text, tone };
  render();
}

async function runBatch() {
  const invoices = state.invoices.map((i) => i.extraction);
  if (invoices.length === 0) return;
  await api('/run', { method: 'POST', body: JSON.stringify({ invoices }) });
  await refresh();
}

async function refresh() {
  const [decisions, metrics, rules, audit, proposals] = await Promise.all([
    api('/decisions'), api('/metrics'), api('/rules'), api('/audit'), api('/proposals'),
  ]);
  Object.assign(state, { decisions, metrics, rules, audit, proposals });
  render();
}

function render() {
  const nav = $('nav');
  nav.textContent = '';
  for (const [id, label] of VIEWS) {
    const b = el('button', { type: 'button', text: label });
    if (state.view === id) b.setAttribute('aria-current', 'page');
    b.addEventListener('click', () => { state.view = id; state.notice = null; render(); });
    nav.append(b);
  }
  $('title').textContent = VIEWS.find(([id]) => id === state.view)?.[1] ?? 'PayGuard';

  const view = $('view');
  view.textContent = '';
  if (state.notice) view.append(el('div', { class: `notice ${state.notice.tone}`, text: state.notice.text }));
  const builders = {
    resumen: viewResumen, facturas: viewFacturas, aprobaciones: viewAprobaciones,
    reglas: viewReglas, auditoria: viewAuditoria,
  };
  view.append(builders[state.view]());
}

async function start() {
  const [health, manifest] = await Promise.all([
    api('/health'),
    fetch('/data/invoices/manifest.json').then((r) => r.json()).catch(() => []),
  ]);
  state.invoices = manifest;
  $('version').textContent = `PayGuard · modo ${health.mode}`;

  const lang = /** @type {HTMLSelectElement} */ ($('lang'));
  lang.value = state.lang;
  lang.addEventListener('change', async () => { state.lang = lang.value; await refresh(); });
  $('run').addEventListener('click', async () => {
    setNotice('Procesando…', 'ok');
    await runBatch();
    setNotice(`${state.decisions.length} facturas procesadas.`, 'ok');
  });

  await refresh();
}

start();
