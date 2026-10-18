// @ts-check
/**
 * Vista "API Docs": explorador interactivo de todos los endpoints, con prueba
 * inline (body editable, token de auth, respuesta con código HTTP).
 * Sin dependencias externas; todo con textContent.
 */

const EXAMPLE_INVOICE = JSON.stringify({
  id: 'FAC-001', source: 'chat', counterpartyName: 'Proveedor S.A.',
  counterpartyTaxId: 'US-12-3456789', amount: 1250.00, currency: 'USD',
  issueDate: '2026-10-01', dueDate: '2026-10-31', invoiceNumber: 'INV-1',
  contractRef: 'CT-1', bank: { accountLast4: '0042' },
  concept: 'Servicios profesionales', confidence: { amount: 1 },
}, null, 2);

/** @typedef {{ method: string, path: string, tag: string, desc: string,
 *   auth?: boolean, body?: string, response200: string, errors?: string }} Endpoint */
/** @type {ReadonlyArray<Endpoint>} */
const ENDPOINTS = [
  {
    method: 'GET', path: '/api/health', tag: 'Sistema',
    desc: 'Estado del servidor, modo, idioma activo y flags de features activas.',
    response200: '{ "ok": true, "service": "payguard", "mode": "demo", "lang": "es", "uploadEnabled": false, "decisions": 0 }',
  },
  {
    method: 'GET', path: '/api/company', tag: 'Sistema',
    desc: 'Datos de la empresa configurada (nombre, moneda base, zona horaria).',
    response200: '{ "name": "Empresa Demo", "baseCurrency": "USD", "timeZone": "America/Bogota" }',
  },
  {
    method: 'POST', path: '/api/run', tag: 'Agente', auth: true,
    desc: 'Evalúa facturas ya estructuradas. Aplica R01–R13 y devuelve PAY / HOLD / ESCALATE con explicación.',
    body: `{ "invoices": [\n${EXAMPLE_INVOICE}\n] }`,
    response200: '[{ "invoiceId": "FAC-001", "outcome": "PAY", "summary": "R01 · Datos completos",'
      + ' "explanation": "…", "failed": [], "decidedBy": "agent" }]',
    errors: '400 si la lista está vacía o malformada.',
  },
  {
    method: 'GET', path: '/api/decisions', tag: 'Agente',
    desc: 'Lista todas las decisiones de la sesión actual. Acepta ?lang=es|en|pt|fr|de|it.',
    response200: '[{ "invoiceId": "…", "outcome": "PAY|HOLD|ESCALATE", "summary": "…",'
      + ' "explanation": "…", "failed": ["R06"], "decidedBy": "agent|human" }]',
  },
  {
    method: 'GET', path: '/api/decisions/:id', tag: 'Agente',
    desc: 'Detalle completo de una decisión: resultados por regla, evidencia y explicación.',
    response200: '{ "invoiceId": "…", "outcome": "…", "results": [{ "ruleId": "R01", "verdict": "PASS", "name": "…", "reason": "…" }] }',
    errors: '404 si no existe.',
  },
  {
    method: 'POST', path: '/api/approvals/:id', tag: 'Aprobaciones', auth: true,
    desc: 'Aprueba o rechaza una factura escalada (ESCALATE). Una factura frenada (HOLD) nunca se puede aprobar (invariante S3).',
    body: '{ "action": "approve", "approver": "Ana García", "reason": "Contrato verificado manualmente" }',
    response200: '{ "ok": true, "outcome": "PAY" }',
    errors: '400 si falta approver o reason. 409 si la factura está HOLD.',
  },
  {
    method: 'GET', path: '/api/rules', tag: 'Reglas',
    desc: 'Devuelve la configuración actual de las reglas R01–R13.',
    response200: '{ "humanApprovalAboveUSD": 5000, "maxPerPaymentUSD": 50000,'
      + ' "periodBudgetUSD": 500000, "minExtractionConfidence": 0.7, "duplicateWindowDays": 30 }',
  },
  {
    method: 'PUT', path: '/api/rules', tag: 'Reglas', auth: true,
    desc: 'Actualiza una o varias reglas. Cada cambio queda en la cadena de auditoría con el actor.',
    body: '{ "humanApprovalAboveUSD": 3000, "maxPerPaymentUSD": 40000 }',
    response200: '{ "humanApprovalAboveUSD": 3000, "maxPerPaymentUSD": 40000, "…": "…" }',
    errors: '400 si algún valor es inválido.',
  },
  {
    method: 'GET', path: '/api/audit', tag: 'Auditoría',
    desc: 'Cadena de auditoría completa: decisiones, cambios de regla, aprobaciones y notificaciones.',
    response200: '[{ "index": 0, "type": "decision", "invoiceId": "FAC-001", "actor": "agent", "hash": "abc…", "ts": "2026-10-01T…" }]',
  },
  {
    method: 'GET', path: '/api/audit/verify', tag: 'Auditoría',
    desc: 'Verifica la integridad SHA-256 de toda la cadena. Si algún hash no coincide, devuelve el índice roto.',
    response200: '{ "ok": true, "length": 42, "brokenAt": null }',
  },
  {
    method: 'GET', path: '/api/metrics', tag: 'Métricas',
    desc: 'KPIs del agente: autonomía, pagos inseguros, precisión (si se proveen expectativas) y total procesado.',
    response200: '{ "autonomyPct": 85.1, "unsafePayments": 0, "accuracyPct": null, "total": 47 }',
  },
  {
    method: 'GET', path: '/api/proposals', tag: 'Aprendizaje',
    desc: 'Ajustes sugeridos por el módulo de aprendizaje. Nunca se aplican solos; requieren aprobación humana.',
    response200: '[{ "kind": "allowlist", "subject": "Proveedor S.A.", "rationale": "…", "status": "pending" }]',
  },
  {
    method: 'GET', path: '/api/daily-run', tag: 'Corrida',
    desc: 'Preview de las facturas con pago programado para hoy (no las procesa).',
    response200: '{ "date": "2026-10-17", "invoices": [{ "id": "…", "amount": 1250, "dueDate": "…" }] }',
  },
  {
    method: 'POST', path: '/api/daily-run', tag: 'Corrida', auth: true,
    desc: 'Ejecuta la corrida diaria. Emite eventos SSE en GET /api/events. Acepta invoices[] para sobreescribir el set.',
    body: '{ "date": "2026-10-17" }',
    response200: '{ "date": "2026-10-17", "count": 12, "decisions": [{ "invoiceId": "…", "outcome": "PAY" }] }',
  },
  {
    method: 'POST', path: '/api/upload', tag: 'Agente', auth: true,
    desc: 'Sube un documento (PDF, imagen o texto). Requiere PAYGUARD_ALLOW_UPLOAD=1. bytes es un arreglo de octetos.',
    body: '{ "file": { "name": "factura.pdf", "mime": "application/pdf", "bytes": [37, 80, 68, 70] } }',
    response200: '{ "invoice": { "…": "…" }, "decision": { "outcome": "PAY" }, "explanation": "…", "provider": "cache" }',
    errors: '403 si la subida está desactivada.',
  },
  {
    method: 'POST', path: '/api/notify', tag: 'Notificaciones', auth: true,
    desc: 'Reenvía un aviso a Slack o correo. Requiere PAYGUARD_ALLOW_NOTIFY=1. Solo webhooks de hooks.slack.com.',
    body: '{ "text": "PayGuard · 2 novedades:\\n• FAC-003 frenada: monto sobre límite." }',
    response200: '{ "slack": "enviado", "email": "sin configurar" }',
    errors: '400 si falta text.',
  },
  {
    method: 'GET', path: '/api/notify-config', tag: 'Notificaciones',
    desc: 'Devuelve la configuración actual de notificaciones guardada en el servidor.',
    response200: '{ "slackWebhook": "https://hooks.slack.com/…", "email": "finanzas@empresa.com", "notifyEnabled": true }',
  },
  {
    method: 'PUT', path: '/api/notify-config', tag: 'Notificaciones', auth: true,
    desc: 'Actualiza el webhook de Slack y/o el correo de avisos. Persiste en memoria (compartido por todos los usuarios).',
    body: '{ "slackWebhook": "https://hooks.slack.com/services/A/B/C", "email": "pagos@empresa.com" }',
    response200: '{ "ok": true }',
    errors: '400 si el webhook no es de hooks.slack.com.',
  },
  {
    method: 'GET', path: '/api/apikeys', tag: 'Desarrollador',
    desc: 'Lista las API keys de demo registradas (claves enmascaradas).',
    response200: '[{ "id": "pg_read_…", "key": "pg_read_abcd…", "role": "read", "createdAt": "2026-10-17T…" }]',
  },
  {
    method: 'POST', path: '/api/apikeys', tag: 'Desarrollador', auth: true,
    desc: 'Crea una nueva API key de demo. La clave completa solo se devuelve en esta respuesta.',
    body: '{ "role": "read" }',
    response200: '{ "key": "pg_read_abcdefgh1234567890123456", "role": "read" }',
    errors: '400 si role no es read, write o admin.',
  },
  {
    method: 'DELETE', path: '/api/apikeys/:key', tag: 'Desarrollador', auth: true,
    desc: 'Revoca una API key de demo.',
    response200: '{ "ok": true }',
    errors: '404 si la clave no existe.',
  },
  {
    method: 'POST', path: '/api/reset', tag: 'Sistema', auth: true,
    desc: 'Reinicia el estado en memoria al punto de un despliegue limpio (solo modo demo).'
      + ' La config de notificaciones y las API keys se conservan.',
    response200: '{ "ok": true, "message": "Estado reiniciado. Listo para nueva prueba." }',
  },
];

/** Tags para filtrar */
const ALL_TAGS = ['Todos', ...new Set(ENDPOINTS.map((e) => e.tag))];
/** @type {string} */
let activeTag = 'Todos';
/** @type {Set<string>} */
const openEndpoints = new Set();

/** @param {string} m */
const methodTone = (m) => ({ GET: 'ok', POST: 'wait', PUT: 'muted', DELETE: 'stop' })[m] ?? 'muted';

/**
 * @param {{ el: (tag: string, attrs?: Record<string,string>, children?: (Node|string)[]) => HTMLElement,
 *   api: (path: string, init?: RequestInit) => Promise<any> }} ctx
 */
export function viewApiDocs(ctx) {
  const { el, api } = ctx;

  const tagBtns = ALL_TAGS.map((tag) => {
    const b = el('button', { class: 'tab', type: 'button', text: tag });
    if (tag === activeTag) b.setAttribute('aria-selected', 'true');
    b.addEventListener('click', () => {
      activeTag = tag;
      tagBtns.forEach((tb) => tb.removeAttribute('aria-selected'));
      b.setAttribute('aria-selected', 'true');
      renderList();
    });
    return b;
  });
  const tagBar = el('div', { class: 'tabs', style: 'flex-wrap: wrap' }, tagBtns);

  const list = el('div', { class: 'stack', id: 'swagger-list' });

  function renderList() {
    list.textContent = '';
    const visible = ENDPOINTS.filter((e) => activeTag === 'Todos' || e.tag === activeTag);
    for (const ep of visible) {
      list.append(buildCard(el, api, ep));
    }
  }

  const introText = 'Todos los endpoints aceptan ?lang=es|en|pt|fr|de|it.'
    + ' Los que requieren auth llevan Authorization: Bearer <token>'
    + ' (solo si PAYGUARD_ADMIN_TOKEN está configurado).';
  const intro = el('p', { class: 'muted', text: introText });
  renderList();
  return el('div', { class: 'stack' }, [intro, tagBar, list]);
}

/**
 * @param {(tag: string, attrs?: Record<string,string>, children?: (Node|string)[]) => HTMLElement} el
 * @param {(path: string, init?: RequestInit) => Promise<any>} api
 * @param {typeof ENDPOINTS[number]} ep
 */
function buildCard(el, api, ep) {
  const key = `${ep.method} ${ep.path}`;
  const tone = methodTone(ep.method);

  const header = el('header', { style: 'cursor:pointer; display:flex; gap:8px; align-items:center' }, [
    el('span', { class: `pill ${tone}`, text: ep.method }),
    el('code', { class: 'mono', text: ep.path }),
    el('span', { class: 'muted', style: 'font-size:13px; flex:1', text: ep.desc }),
    ep.auth ? el('span', { class: 'pill muted', text: 'auth', style: 'font-size:11px' }) : el('span', {}),
  ]);

  const detail = el('div', { class: 'stack', style: 'margin-top:10px' });
  detail.hidden = !openEndpoints.has(key);

  if (!detail.hidden) fillDetail(el, api, ep, detail);

  header.addEventListener('click', () => {
    if (detail.hidden) {
      openEndpoints.add(key);
      detail.hidden = false;
      fillDetail(el, api, ep, detail);
    } else {
      openEndpoints.delete(key);
      detail.hidden = true;
    }
  });

  return el('div', { class: 'rule' }, [header, detail]);
}

/**
 * @param {(tag: string, attrs?: Record<string,string>, children?: (Node|string)[]) => HTMLElement} el
 * @param {(path: string, init?: RequestInit) => Promise<any>} api
 * @param {typeof ENDPOINTS[number]} ep
 * @param {HTMLElement} into
 */
function fillDetail(el, api, ep, into) {
  into.textContent = '';
  const children = [];

  if (ep.body) {
    children.push(
      el('p', { class: 'muted', style: 'margin:0; font-size:12px', text: 'Cuerpo de la solicitud:' }),
      el('pre', { text: ep.body }),
    );
  }

  children.push(
    el('p', { class: 'muted', style: 'margin:0; font-size:12px', text: 'Respuesta 200:' }),
    el('pre', { text: ep.response200 }),
  );

  if (ep.errors) {
    children.push(el('p', { class: 'muted', style: 'font-size:12px', text: `Errores: ${ep.errors}` }));
  }

  children.push(buildTryIt(el, api, ep));
  for (const c of children) into.append(c);
}

/**
 * @param {(tag: string, attrs?: Record<string,string>, children?: (Node|string)[]) => HTMLElement} el
 * @param {(path: string, init?: RequestInit) => Promise<any>} api
 * @param {typeof ENDPOINTS[number]} ep
 */
function buildTryIt(el, api, ep) {
  const wrap = el('div', { class: 'stack', style: 'border-top:1px solid var(--seam); padding-top:10px; margin-top:4px' });

  const tokenInput = el('input', {
    placeholder: 'Token (opcional, si PAYGUARD_ADMIN_TOKEN está configurado)',
    'aria-label': 'Token de autorización',
  });
  const pathInput = el('input', { placeholder: ep.path, value: ep.path, 'aria-label': 'Ruta (reemplaza :id si corresponde)' });

  const bodyArea = /** @type {HTMLTextAreaElement} */ (document.createElement('textarea'));
  bodyArea.rows = 4;
  bodyArea.style.display = ep.body ? '' : 'none';
  bodyArea.value = ep.body ?? '';
  bodyArea.setAttribute('aria-label', 'Cuerpo de la solicitud');

  const sendBtn = el('button', { class: 'btn', type: 'button', text: `Probar ${ep.method}` });
  const respPre = el('pre', { class: 'muted', text: 'La respuesta aparecerá aquí.' });

  sendBtn.addEventListener('click', async () => {
    sendBtn.textContent = 'Enviando…';
    sendBtn.toggleAttribute('disabled', true);
    const token = /** @type {HTMLInputElement} */ (tokenInput).value.trim();
    const path = /** @type {HTMLInputElement} */ (pathInput).value.trim().replace(/^\/api/, '');
    try {
      const init = /** @type {RequestInit} */ ({
        method: ep.method,
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      if (ep.body) init.body = bodyArea.value;
      const res = await fetch(`/api${path}?lang=es`, init);
      const data = await res.json().catch(() => ({}));
      respPre.textContent = `HTTP ${res.status}\n\n${JSON.stringify(data, null, 2).slice(0, 3000)}`;
      respPre.className = res.ok ? '' : 'muted';
    } catch (err) {
      respPre.textContent = String(err);
    } finally {
      sendBtn.textContent = `Probar ${ep.method}`;
      sendBtn.toggleAttribute('disabled', false);
    }
  });

  const form = el('div', { class: 'stack', style: 'gap:6px' }, [pathInput, tokenInput]);
  if (ep.body) form.append(bodyArea);
  form.append(el('div', {}, [sendBtn]), respPre);
  wrap.append(el('p', { class: 'muted', style: 'font-size:12px; margin:0', text: 'Probar en vivo:' }), form);
  return wrap;
}
