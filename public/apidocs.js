// @ts-check
/**
 * Vista "API Docs": documentación estilo Swagger de todos los endpoints,
 * con botón "Probar" para GET. Sin dependencias externas.
 */

const API_ENDPOINTS = /** @type {const} */ ([
  {
    method: 'GET', path: '/api/health',
    desc: 'Estado del servidor, modo y flags de features.',
    response: '{ mode: "demo"|"prod", uploadEnabled: bool, version: string }',
  },
  {
    method: 'POST', path: '/api/run',
    desc: 'Evalúa una o varias facturas. Devuelve el array de decisiones.',
    body: '{ invoices: [ { id, counterpartyName, amount, currency, dueDate, … } ] }',
    response: '[ { invoiceId, outcome, summary, explanation, failed, decidedBy } ]',
  },
  {
    method: 'GET', path: '/api/decisions',
    desc: 'Lista todas las decisiones almacenadas en esta sesión.',
    response: '[ { invoiceId, outcome, summary, explanation, failed, decidedBy } ]',
  },
  {
    method: 'GET', path: '/api/decisions/:id',
    desc: 'Detalle completo de una decisión, incluyendo resultados por regla.',
    response: '{ invoiceId, outcome, summary, explanation, failed, decidedBy, results: […] }',
  },
  {
    method: 'GET', path: '/api/daily-run',
    desc: 'Facturas con pago programado para hoy.',
    response: '{ date: "YYYY-MM-DD", invoices: […] }',
  },
  {
    method: 'POST', path: '/api/daily-run',
    desc: 'Ejecuta la corrida diaria. Eventos SSE en tiempo real.',
    response: '{ date, count, decisions: […] }',
  },
  {
    method: 'GET', path: '/api/metrics',
    desc: 'KPIs del agente: autonomía, pagos inseguros, total procesado.',
    response: '{ autonomyPct, unsafePayments, total, accuracyPct }',
  },
  {
    method: 'GET', path: '/api/rules',
    desc: 'Devuelve la configuración actual de reglas R01–R13.',
    response: '{ humanApprovalAboveUSD, maxPerPaymentUSD, periodBudgetUSD, … }',
  },
  {
    method: 'PUT', path: '/api/rules',
    desc: 'Actualiza reglas. Cada cambio queda en la cadena de auditoría.',
    body: '{ humanApprovalAboveUSD?: number, maxPerPaymentUSD?: number, … }',
    response: '{ ok: true }',
  },
  {
    method: 'GET', path: '/api/audit',
    desc: 'Cadena de auditoría: decisiones, cambios de regla, aprobaciones.',
    response: '[ { index, type, invoiceId?, actor, hash, ts } ]',
  },
  {
    method: 'GET', path: '/api/audit/verify',
    desc: 'Verifica la integridad hash de toda la cadena.',
    response: '{ ok: bool, length: number, brokenAt?: number }',
  },
  {
    method: 'POST', path: '/api/approvals/:id',
    desc: 'Aprueba o rechaza una factura escalada.',
    body: '{ action: "approve"|"reject", approver: string, reason: string }',
    response: '{ ok: true, outcome: "PAY"|"HOLD" }',
  },
  {
    method: 'POST', path: '/api/reset',
    desc: 'Reinicia el estado en memoria (solo modo demo).',
    response: '{ ok: true }',
  },
  {
    method: 'POST', path: '/api/upload',
    desc: 'Sube archivo (PDF/imagen/texto). Requiere PAYGUARD_ALLOW_UPLOAD=1.',
    body: '{ file: { name: string, mime: string, bytes: number[] } }',
    response: '{ decision: {…}, explanation: string, provider: string }',
  },
]);

/** @type {Record<string, string>} */
const METHOD_TONE = { GET: 'ok', POST: 'wait', PUT: 'muted', DELETE: 'stop' };

/**
 * @param {{ el: (tag: string, attrs?: Record<string,string>, children?: (Node|string)[]) => HTMLElement }} ctx
 */
export function viewApiDocs({ el }) {
  const tryResult = el('pre', {
    id: 'api-try-result', class: 'muted', text: 'Respuesta aparecerá aquí.',
  });

  const cards = API_ENDPOINTS.map((ep) => {
    const tone = METHOD_TONE[ep.method] ?? 'wait';
    const header = el('header', {}, [
      el('span', { class: `pill ${tone}`, text: ep.method }),
      el('code', { class: 'mono', text: ep.path }),
    ]);
    const body = [el('p', { text: ep.desc })];
    if (ep.body) {
      body.push(el('p', { class: 'muted', text: 'Cuerpo:' }), el('pre', { text: ep.body }));
    }
    body.push(el('p', { class: 'muted', text: 'Respuesta:' }), el('pre', { text: ep.response }));
    if (ep.method === 'GET') {
      const btn = el('button', { class: 'btn ghost', type: 'button', text: 'Probar' });
      btn.addEventListener('click', async () => {
        btn.textContent = 'Cargando…';
        btn.toggleAttribute('disabled', true);
        try {
          const res = await fetch(ep.path.replace(':id', 'demo-001'));
          const data = await res.json().catch(() => ({}));
          tryResult.textContent = JSON.stringify(data, null, 2).slice(0, 2000);
        } catch (err) {
          tryResult.textContent = String(err);
        } finally {
          btn.textContent = 'Probar';
          btn.toggleAttribute('disabled', false);
        }
      });
      body.push(el('div', {}, [btn]));
    }
    return el('div', { class: 'rule' }, [header, ...body]);
  });

  const intro = 'Conecta cualquier sistema externo con POST /api/run. '
    + 'Sin autenticación en modo demo.';
  return el('div', { class: 'stack' }, [
    el('p', { class: 'muted', text: intro }),
    el('div', { class: 'stack' }, cards),
    el('h3', { text: 'Respuesta de prueba' }),
    tryResult,
  ]);
}
