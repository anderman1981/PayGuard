// @ts-check
/**
 * Vista "Auditoría": cadena de entradas con filtro por tipo y paginación.
 * Todo pasa por textContent: sin innerHTML.
 */

const AUDIT_PAGE = 15;
let auditPage = 0;
let auditTypeFilter = 'ALL';

/**
 * @typedef {{
 *   el: (tag: string, attrs?: Record<string,string>, children?: (Node|string)[]) => HTMLElement,
 *   api: (path: string, init?: RequestInit) => Promise<any>,
 *   state: { audit: Record<string, unknown>[] },
 *   setNotice: (text: string, tone: string) => void,
 *   openDrawer: (id: string) => void,
 * }} AuditoriaCtx
 */

/** @param {AuditoriaCtx} ctx */
function paintAudit(ctx) {
  const tbody = document.getElementById('audit-tbody');
  const pager = document.getElementById('audit-pager');
  if (!tbody) return;
  const { el, state, openDrawer } = ctx;

  const filtered = auditTypeFilter === 'ALL'
    ? state.audit
    : state.audit.filter((e) => String(e.type) === auditTypeFilter);
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / AUDIT_PAGE));
  auditPage = Math.min(auditPage, pages - 1);
  const slice = filtered.slice(auditPage * AUDIT_PAGE, (auditPage + 1) * AUDIT_PAGE);

  tbody.textContent = '';
  if (total === 0) {
    tbody.append(el('tr', {}, [
      el('td', { colspan: '5', class: 'muted', text: 'Sin entradas de auditoría.' }),
    ]));
  } else {
    for (const e of slice) {
      const tr = el('tr', { tabindex: '0' }, [
        el('td', { class: 'mono', text: String(e.index) }),
        el('td', { text: String(e.type) }),
        el('td', { class: 'mono', text: String(e.invoiceId ?? '—') }),
        el('td', { text: String(e.actor) }),
        el('td', { class: 'mono muted', text: String(e.hash).slice(0, 12) }),
      ]);
      if (e.invoiceId) {
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', () => openDrawer(String(e.invoiceId)));
        tr.addEventListener('keydown', (/** @type {KeyboardEvent} */ ev) => {
          if (ev.key === 'Enter') openDrawer(String(e.invoiceId));
        });
      }
      tbody.append(tr);
    }
  }

  if (pager) {
    pager.textContent = '';
    const infoText = `Pág ${auditPage + 1} / ${pages} · ${total} entrada(s)`;
    const info = el('span', { class: 'muted', text: infoText });
    if (total > AUDIT_PAGE) {
      const prev = el('button', { class: 'btn ghost', type: 'button', text: '← Anterior' });
      const next = el('button', { class: 'btn ghost', type: 'button', text: 'Siguiente →' });
      prev.toggleAttribute('disabled', auditPage === 0);
      next.toggleAttribute('disabled', auditPage >= pages - 1);
      prev.addEventListener('click', () => { auditPage--; paintAudit(ctx); });
      next.addEventListener('click', () => { auditPage++; paintAudit(ctx); });
      pager.append(el('div', { class: 'topbar' }, [prev, info, next]));
    } else if (total > 0) {
      pager.append(el('div', { class: 'topbar' }, [info]));
    }
  }
}

/** @param {AuditoriaCtx} ctx */
export function viewAuditoria(ctx) {
  auditPage = 0; auditTypeFilter = 'ALL';
  const { el, api, setNotice } = ctx;

  const check = el('button', { class: 'btn ghost', type: 'button', text: 'Verificar integridad' });
  check.addEventListener('click', async () => {
    const r = await api('/audit/verify');
    const text = r.ok
      ? `Cadena íntegra: ${r.length} entradas verificadas.`
      : `Cadena rota en la entrada ${r.brokenAt}.`;
    setNotice(text, r.ok ? 'ok' : 'stop');
  });

  const typeSelect = el('select', { id: 'audit-type', 'aria-label': 'Filtrar por tipo' }, [
    el('option', { value: 'ALL', text: 'Todos los tipos' }),
    el('option', { value: 'decision', text: 'Decisión' }),
    el('option', { value: 'rule_change', text: 'Cambio de regla' }),
    el('option', { value: 'approval', text: 'Aprobación' }),
    el('option', { value: 'reset', text: 'Reset' }),
  ]);
  typeSelect.addEventListener('change', () => {
    auditTypeFilter = /** @type {HTMLSelectElement} */ (typeSelect).value;
    auditPage = 0; paintAudit(ctx);
  });

  const tbody = el('tbody', { id: 'audit-tbody' });
  const pager = el('div', { id: 'audit-pager' });
  const table = el('table', {}, [
    el('thead', {}, [
      el('tr', {}, ['#', 'Tipo', 'Factura', 'Quién', 'Hash'].map((h) => el('th', { text: h }))),
    ]),
    tbody,
  ]);
  queueMicrotask(() => paintAudit(ctx));
  return el('div', { class: 'stack' }, [
    el('p', { class: 'muted', text: 'Registro inmutable de cada acción del sistema: decisiones del agente, '
      + 'aprobaciones humanas, cambios de reglas y configuración. Cada entrada encadena el hash de la anterior '
      + '— el botón "Verificar integridad" detecta cualquier alteración.' }),
    el('div', { class: 'topbar' }, [check, typeSelect]),
    table,
    pager,
  ]);
}
