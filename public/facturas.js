// @ts-check
/**
 * Vista "Facturas": tabla con filtro, ordenamiento por columna y paginación.
 * Todo pasa por textContent: sin innerHTML.
 */
import { money, filterRows, TONE } from './lib.js';

const PAGE_SIZE = 10;
/** @type {string|null} */ let sortKey = null;
let sortDir = 1;
let facPage = 0;

const FAC_COLS = /** @type {const} */ ([
  { key: 'invoiceId', label: 'Factura', sort: true },
  { key: 'counterpartyName', label: 'Beneficiario', sort: true },
  { key: 'amount', label: 'Monto', sort: true },
  { key: 'outcome', label: 'Resultado', sort: true },
  { key: 'failed', label: 'Reglas marcadas', sort: false },
  { key: 'decidedBy', label: 'Decidió', sort: false },
]);

/**
 * @typedef {{
 *   el: (tag: string, attrs?: Record<string,string>, children?: (Node|string)[]) => HTMLElement,
 *   state: {
 *     query: string, outcome: string, lang: string,
 *     decisions: import('./lib.js').DecisionRow[],
 *     invoices: { id: string, extraction: Record<string, unknown> }[]
 *   },
 *   openDrawer: (id: string) => void,
 * }} FacturasCtx
 */

/** @param {FacturasCtx} ctx */
function paintTable(ctx) {
  const body = document.getElementById('rows');
  const theadRow = document.getElementById('fact-thead');
  const pager = document.getElementById('fact-pager');
  if (!body) return;
  const { el, state, openDrawer } = ctx;

  if (theadRow) {
    theadRow.textContent = '';
    for (const col of FAC_COLS) {
      const arrow = sortKey === col.key ? (sortDir === 1 ? ' ▲' : ' ▼') : '';
      const th = el('th', { text: col.label + arrow });
      if (col.sort) {
        th.className = 'th-sort';
        th.addEventListener('click', () => {
          if (sortKey === col.key) sortDir *= -1;
          else { sortKey = col.key; sortDir = 1; }
          facPage = 0; paintTable(ctx);
        });
      }
      theadRow.append(th);
    }
  }

  const filtered = filterRows(state.decisions, { outcome: state.outcome, query: state.query });
  if (sortKey) {
    const k = sortKey; const d = sortDir;
    filtered.sort((a, b) => {
      let va, vb;
      if (k === 'counterpartyName' || k === 'amount') {
        const ia = /** @type {any} */ (state.invoices.find((i) => i.id === a.invoiceId)?.extraction ?? {});
        const ib = /** @type {any} */ (state.invoices.find((i) => i.id === b.invoiceId)?.extraction ?? {});
        va = ia[k]; vb = ib[k];
      } else { va = /** @type {any} */ (a)[k]; vb = /** @type {any} */ (b)[k]; }
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * d;
      return String(va ?? '').localeCompare(String(vb ?? '')) * d;
    });
  }
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  facPage = Math.min(facPage, pages - 1);
  const slice = filtered.slice(facPage * PAGE_SIZE, (facPage + 1) * PAGE_SIZE);

  body.textContent = '';
  if (total === 0) {
    body.append(el('tr', {}, [el('td', {
      colspan: '6', class: 'muted', text: 'Sin resultados. Procesa las facturas primero.',
    })]));
  } else {
    for (const r of slice) {
      const inv = /** @type {any} */ (state.invoices.find((i) => i.id === r.invoiceId)?.extraction ?? {});
      const tr = el('tr', { tabindex: '0' }, [
        el('td', {}, [el('span', { class: 'mono', text: r.invoiceId })]),
        el('td', { text: String(inv.counterpartyName ?? '—') }),
        el('td', { class: 'mono', text: money(inv.amount, inv.currency, state.lang) }),
        el('td', {}, [el('span', { class: `pill ${TONE[r.outcome]}`, text: r.summary.split(' · ')[0] })]),
        el('td', { class: 'mono muted', text: (r.failed ?? []).join(', ') || '—' }),
        el('td', { class: 'muted', text: r.decidedBy === 'human' ? 'Persona' : 'Agente' }),
      ]);
      tr.addEventListener('click', () => openDrawer(r.invoiceId));
      tr.addEventListener('keydown', (e) => {
        if (/** @type {KeyboardEvent} */ (e).key === 'Enter') openDrawer(r.invoiceId);
      });
      body.append(tr);
    }
  }

  if (pager) {
    pager.textContent = '';
    const infoText = `Pág ${facPage + 1} / ${pages} · ${total} resultado(s)`;
    const info = el('span', { class: 'muted', text: infoText });
    if (total > PAGE_SIZE) {
      const prev = el('button', { class: 'btn ghost', type: 'button', text: '← Anterior' });
      const next = el('button', { class: 'btn ghost', type: 'button', text: 'Siguiente →' });
      prev.toggleAttribute('disabled', facPage === 0);
      next.toggleAttribute('disabled', facPage >= pages - 1);
      prev.addEventListener('click', () => { facPage--; paintTable(ctx); });
      next.addEventListener('click', () => { facPage++; paintTable(ctx); });
      pager.append(el('div', { class: 'topbar' }, [prev, info, next]));
    } else if (total > 0) {
      pager.append(el('div', { class: 'topbar' }, [info]));
    }
  }
}

/** @param {FacturasCtx} ctx */
export function viewFacturas(ctx) {
  sortKey = null; sortDir = 1; facPage = 0;
  const { el, state } = ctx;

  const search = el('input', {
    id: 'q', type: 'search',
    placeholder: 'Buscar por id, beneficiario, regla o estado…',
    value: state.query,
  });
  search.addEventListener('input', () => {
    state.query = /** @type {HTMLInputElement} */ (search).value;
    facPage = 0; paintTable(ctx);
  });
  const select = el('select', { id: 'f', 'aria-label': 'Filtrar por resultado' }, [
    el('option', { value: 'ALL', text: 'Todas' }),
    el('option', { value: 'PAY', text: '✓ Pagadas' }),
    el('option', { value: 'HOLD', text: '✗ Frenadas' }),
    el('option', { value: 'ESCALATE', text: '⋯ Pendientes' }),
  ]);
  /** @type {HTMLSelectElement} */ (select).value = state.outcome;
  select.addEventListener('change', () => {
    state.outcome = /** @type {HTMLSelectElement} */ (select).value;
    facPage = 0; paintTable(ctx);
  });
  const theadRow = el('tr', { id: 'fact-thead' });
  const body = el('tbody', { id: 'rows' });
  const pager = el('div', { id: 'fact-pager' });
  const table = el('table', {}, [el('thead', {}, [theadRow]), body]);
  queueMicrotask(() => paintTable(ctx));
  return el('div', { class: 'stack' }, [
    el('div', { class: 'topbar' }, [search, select]),
    table,
    pager,
  ]);
}
