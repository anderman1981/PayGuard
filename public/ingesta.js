// @ts-check
/**
 * Vista de ingesta: cómo entran las facturas al agente. Tres caminos —
 * captura manual, pegar JSON y subir un archivo— más la lista del set de
 * ejemplo. Todo pasa por textContent: el contenido de una factura nunca
 * puede inyectar marcado.
 */
import { money, buildManualInvoice, parseInvoicesJson, MANUAL_FIELDS, TONE } from './lib.js';

/**
 * @typedef {Object} IngestaCtx
 * @property {(tag: string, attrs?: Record<string,string>, children?: (Node|string)[]) => HTMLElement} el
 * @property {(path: string, init?: RequestInit) => Promise<any>} api
 * @property {{ lang: string, uploadEnabled: boolean,
 *   invoices: {id: string, extraction: Record<string, unknown>}[],
 *   decisions: import('./lib.js').DecisionRow[] }} state
 * @property {(text: string, tone: string) => void} setNotice
 * @property {() => Promise<void>} refresh
 */

const MAX_UPLOAD_BYTES = 800_000;

/** @param {IngestaCtx} ctx @returns {HTMLElement} */
export function viewIngesta(ctx) {
  const { el } = ctx;
  const result = el('div', { id: 'ingesta-result' });

  /** @type {[string, string, () => HTMLElement][]} */
  const tabs = [
    ['capturar', 'Capturar', () => sectionManual(ctx, result)],
    ['json', 'Pegar JSON', () => sectionJson(ctx, result)],
    ['subir', 'Subir archivo', () => sectionUpload(ctx, result)],
    ['set', 'Set de ejemplo', () => sectionSet(ctx, result)],
  ];
  let active = 'capturar';
  const nav = el('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Formas de ingresar facturas' });
  const body = el('div', { class: 'tab-body' });

  function paint() {
    nav.textContent = '';
    for (const [id, label] of tabs) {
      const b = el('button', { type: 'button', class: 'tab', role: 'tab', text: label });
      if (id === active) b.setAttribute('aria-selected', 'true');
      b.addEventListener('click', () => { active = id; paint(); });
      nav.append(b);
    }
    body.textContent = '';
    const current = tabs.find(([id]) => id === active);
    if (current) body.append(current[2]());
  }
  paint();

  return el('div', { class: 'stack' }, [
    el('p', {
      class: 'muted',
      text: 'Así entran las facturas al agente. Él decide pagar, frenar o escalar según las reglas; '
        + 'nunca mueve dinero. La misma lógica está disponible por API para otros sistemas.',
    }),
    nav, body,
    el('div', { class: 'stack' }, [el('h2', { text: 'Resultado' }), result]),
  ]);
}

/** Caja de resultado reutilizable. @param {IngestaCtx} ctx @param {HTMLElement} box @param {any[]} decisions */
function paintResult(ctx, box, decisions) {
  const { el, state } = ctx;
  box.textContent = '';
  if (!Array.isArray(decisions) || decisions.length === 0) {
    box.append(el('p', { class: 'muted', text: 'Sin decisiones todavía.' }));
    return;
  }
  for (const d of decisions) {
    const inv = state.invoices.find((i) => i.id === d.invoiceId)?.extraction ?? {};
    const label = String(d.summary ?? '').split(' · ')[0] || d.outcome;
    box.append(el('div', { class: 'rule' }, [
      el('header', {}, [
        el('span', { class: `pill ${TONE[d.outcome] ?? 'wait'}`, text: label }),
        el('strong', { class: 'mono', text: String(d.invoiceId) }),
        el('span', { class: 'grow' }),
        el('span', { class: 'muted', text: money(/** @type {number} */ (inv.amount), /** @type {string} */ (inv.currency), state.lang) }),
      ]),
      el('p', { text: String(d.explanation ?? '') }),
    ]));
  }
}

/** POST a /api/run y pinta. @param {IngestaCtx} ctx @param {HTMLElement} box @param {Record<string,unknown>[]} invoices */
async function evaluate(ctx, box, invoices) {
  const { api, setNotice, refresh } = ctx;
  try {
    const decisions = await api('/run', { method: 'POST', body: JSON.stringify({ invoices }) });
    paintResult(ctx, box, decisions);
    await refresh();
    setNotice(`${invoices.length} factura(s) evaluada(s).`, 'ok');
  } catch (err) {
    setNotice(/** @type {Error} */ (err).message, 'stop');
  }
}

/** @param {IngestaCtx} ctx @param {HTMLElement} box */
function sectionManual(ctx, box) {
  const { el } = ctx;
  /** @type {Record<string, HTMLInputElement>} */
  const inputs = {};
  const grid = el('div', { class: 'form-grid' }, MANUAL_FIELDS.map(([key, label, ph]) => {
    const input = el('input', { id: `m-${key}`, placeholder: ph });
    inputs[key] = /** @type {HTMLInputElement} */ (input);
    return el('label', { for: `m-${key}` }, [label, input]);
  }));
  const evaluar = el('button', { class: 'btn', type: 'button', text: 'Evaluar factura' });
  evaluar.addEventListener('click', () => {
    const form = Object.fromEntries(Object.entries(inputs).map(([k, i]) => [k, i.value]));
    evaluate(ctx, box, [buildManualInvoice(form)]);
  });
  return el('div', { class: 'stack' }, [
    el('h2', { text: 'Capturar una factura' }),
    el('p', { class: 'muted', text: 'Escribe los datos y el agente decide al instante.' }),
    grid, el('div', {}, [evaluar]),
  ]);
}

/** @param {IngestaCtx} ctx @param {HTMLElement} box */
function sectionJson(ctx, box) {
  const { el, setNotice } = ctx;
  const area = el('textarea', {
    id: 'json-in', rows: '6', 'aria-label': 'Facturas en JSON',
    placeholder: '[ { "id": "...", "counterpartyName": "...", "amount": 1000, "currency": "USD", ... } ]',
  });
  const evaluar = el('button', { class: 'btn', type: 'button', text: 'Evaluar JSON' });
  evaluar.addEventListener('click', () => {
    const { invoices, error } = parseInvoicesJson(/** @type {HTMLTextAreaElement} */ (area).value);
    if (error) return setNotice(error, 'stop');
    return evaluate(ctx, box, invoices);
  });
  return el('div', { class: 'stack' }, [
    el('h2', { text: 'Pegar JSON' }),
    el('p', { class: 'muted', text: 'Una factura o una lista. Igual que el cuerpo de POST /api/run para sistemas externos.' }),
    area, el('div', {}, [evaluar]),
  ]);
}

/** @param {IngestaCtx} ctx @param {HTMLElement} box */
function sectionUpload(ctx, box) {
  const { el, state, api, setNotice, refresh } = ctx;
  const head = [
    el('h2', { text: 'Subir un archivo' }),
    el('p', { class: 'muted', text: 'PDF, imagen o texto. El agente extrae los datos y decide.' }),
  ];
  if (!state.uploadEnabled) {
    return el('div', { class: 'stack' }, [
      ...head,
      el('div', { class: 'notice wait', text: 'La subida está desactivada. Actívala arrancando el servidor con PAYGUARD_ALLOW_UPLOAD=1.' }),
    ]);
  }
  const file = el('input', { id: 'file-in', type: 'file', 'aria-label': 'Archivo de factura' });
  const subir = el('button', { class: 'btn', type: 'button', text: 'Subir y evaluar' });
  subir.addEventListener('click', async () => {
    const f = /** @type {HTMLInputElement} */ (file).files?.[0];
    if (!f) return setNotice('Elige un archivo primero.', 'stop');
    if (f.size > MAX_UPLOAD_BYTES) return setNotice('El archivo supera el límite del prototipo (800 KB).', 'stop');
    try {
      const bytes = Array.from(new Uint8Array(await f.arrayBuffer()));
      const r = await api('/upload', {
        method: 'POST',
        body: JSON.stringify({ file: { name: f.name, mime: f.type || 'application/octet-stream', bytes } }),
      });
      paintResult(ctx, box, [r.decision ? { ...r.decision, explanation: r.explanation } : r]);
      await refresh();
      setNotice(`Archivo procesado por "${r.provider}".`, 'ok');
    } catch (err) {
      setNotice(/** @type {Error} */ (err).message, 'stop');
    }
    return undefined;
  });
  return el('div', { class: 'stack' }, [...head, el('div', { class: 'topbar' }, [file, subir])]);
}

/** @param {IngestaCtx} ctx @param {HTMLElement} box */
function sectionSet(ctx, box) {
  const { el, state } = ctx;
  const byId = new Map(state.decisions.map((d) => [d.invoiceId, d]));
  const rows = state.invoices.map((i) => {
    const d = byId.get(i.id);
    const pill = d
      ? el('span', { class: `pill ${TONE[d.outcome] ?? 'wait'}`, text: String(d.summary ?? '').split(' · ')[0] || d.outcome })
      : el('span', { class: 'pill', text: 'Sin procesar' });
    return el('tr', {}, [
      el('td', {}, [el('span', { class: 'mono', text: i.id })]),
      el('td', { text: String(i.extraction?.counterpartyName ?? '—') }),
      el('td', {}, [pill]),
    ]);
  });
  const cargar = el('button', { class: 'btn ghost', type: 'button', text: 'Cargar y procesar el set' });
  cargar.addEventListener('click', () => evaluate(ctx, box, state.invoices.map((i) => i.extraction)));
  return el('div', { class: 'stack' }, [
    el('h2', { text: 'Facturas del set de ejemplo' }),
    el('p', { class: 'muted', text: `${state.invoices.length} facturas simuladas para probar el agente.` }),
    el('div', {}, [cargar]),
    el('table', {}, [
      el('thead', {}, [el('tr', {}, ['Factura', 'Beneficiario', 'Estado'].map((h) => el('th', { text: h })))]),
      el('tbody', {}, rows.length ? rows : [el('tr', {}, [el('td', { colspan: '3', class: 'muted', text: 'Sin set cargado.' })])]),
    ]),
  ]);
}
