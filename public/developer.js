// @ts-check
/**
 * Vista "Desarrollador": gestión de API Keys (demo in-memory) y estado de los
 * proveedores de IA configurados. Todo con textContent; nunca innerHTML.
 */

/** @type {number} */
let devTab = 0;
const TABS = ['API Keys', 'Proveedores IA'];

/** @type {string|null} */
let newKeyRevealed = null;

const AI_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', envKey: 'OPENAI_API_KEY', docs: 'platform.openai.com/api-keys' },
  { id: 'anthropic', name: 'Anthropic', envKey: 'ANTHROPIC_API_KEY', docs: 'console.anthropic.com' },
  { id: 'openrouter', name: 'OpenRouter', envKey: 'OPENROUTER_API_KEY', docs: 'openrouter.ai/keys' },
  { id: 'ollama', name: 'Ollama (local)', envKey: 'OLLAMA_BASE_URL', docs: 'ollama.ai' },
];

/**
 * @param {{ el: (tag: string, attrs?: Record<string,string>, children?: (Node|string)[]) => HTMLElement,
 *   api: (path: string, init?: RequestInit) => Promise<any>, setNotice: (t: string, tone: string) => void }} ctx
 */
export function viewDeveloper(ctx) {
  const { el, api, setNotice } = ctx;

  const tabBtns = TABS.map((label, i) => {
    const b = el('button', { class: 'tab', type: 'button', text: label });
    if (i === devTab) b.setAttribute('aria-selected', 'true');
    b.addEventListener('click', () => {
      devTab = i;
      repaint();
    });
    return b;
  });
  const tabBar = el('div', { class: 'tabs' }, tabBtns);
  const tabBody = el('div', { class: 'tab-body' });

  function repaint() {
    tabBtns.forEach((b, i) => {
      if (i === devTab) b.setAttribute('aria-selected', 'true');
      else b.removeAttribute('aria-selected');
    });
    tabBody.textContent = '';
    if (devTab === 0) renderApiKeys(el, api, setNotice, tabBody);
    else renderAiProviders(el, tabBody);
  }

  repaint();
  return el('div', { class: 'stack' }, [tabBar, tabBody]);
}

/**
 * @param {ReturnType<typeof import('./app.js').createEl>} el
 * @param {(path: string, init?: RequestInit) => Promise<any>} api
 * @param {(t: string, tone: string) => void} setNotice
 * @param {HTMLElement} into
 */
function renderApiKeys(el, api, setNotice, into) {
  const table = el('table', {});
  const thead = el('thead', {}, [
    el('tr', {}, ['Clave (enmascarada)', 'Rol', 'Creada', 'Acción'].map((h) => el('th', { text: h }))),
  ]);
  const tbody = el('tbody', { id: 'dev-keys-body' });
  table.append(thead, tbody);

  const roleSelect = el('select', { 'aria-label': 'Rol de la nueva clave' });
  for (const r of ['read', 'write', 'admin']) {
    const opt = document.createElement('option');
    opt.value = r;
    opt.textContent = r;
    roleSelect.append(opt);
  }

  const newBtn = el('button', { class: 'btn', type: 'button', text: '+ Nueva clave' });
  newBtn.addEventListener('click', async () => {
    const role = /** @type {HTMLSelectElement} */ (roleSelect).value;
    try {
      const res = await api('/apikeys', { method: 'POST', body: JSON.stringify({ role }) });
      newKeyRevealed = res.key;
      setNotice(`Clave generada. Cópiala ahora: ${res.key}`, 'ok');
      await loadKeys(api, tbody, el, setNotice);
    } catch (err) {
      setNotice(/** @type {Error} */ (err).message, 'stop');
    }
  });

  const revealBox = el('div', { id: 'dev-key-reveal' });
  if (newKeyRevealed) {
    const code = el('code', { class: 'mono dev-key-full', text: newKeyRevealed });
    const clearBtn = el('button', { class: 'btn ghost', type: 'button', text: 'Ocultar' });
    clearBtn.addEventListener('click', () => { newKeyRevealed = null; revealBox.textContent = ''; });
    revealBox.append(
      el('p', { class: 'muted', text: 'Cópiala ahora. No se mostrará de nuevo:' }),
      code, clearBtn,
    );
  }

  const toolbar = el('div', { class: 'topbar' }, [newBtn, roleSelect]);
  into.append(
    el('h3', { text: 'API Keys del sistema' }),
    el('p', { class: 'muted', text: 'Las claves son de demo (in-memory). Se borran al reiniciar el servidor.' }),
    revealBox,
    table,
    toolbar,
  );

  loadKeys(api, tbody, el, setNotice);
}

/**
 * @param {(path: string, init?: RequestInit) => Promise<any>} api
 * @param {HTMLElement} tbody
 * @param {ReturnType<typeof import('./app.js').createEl>} el
 * @param {(t: string, tone: string) => void} setNotice
 */
async function loadKeys(api, tbody, el, setNotice) {
  try {
    const keys = await api('/apikeys');
    tbody.textContent = '';
    if (keys.length === 0) {
      tbody.append(el('tr', {}, [el('td', { colspan: '4', class: 'muted', text: 'No hay claves. Crea una con el botón de abajo.' })]));
      return;
    }
    for (const k of keys) {
      const revokeBtn = el('button', { class: 'btn ghost', type: 'button', text: 'Revocar' });
      revokeBtn.addEventListener('click', async () => {
        try {
          await api(`/apikeys/${encodeURIComponent(k.id)}`, { method: 'DELETE' });
          await loadKeys(api, tbody, el, setNotice);
        } catch (err) { setNotice(/** @type {Error} */ (err).message, 'stop'); }
      });
      tbody.append(el('tr', {}, [
        el('td', {}, [el('code', { class: 'mono', text: k.key })]),
        el('td', {}, [el('span', { class: `pill ${k.role === 'admin' ? 'stop' : k.role === 'write' ? 'wait' : 'ok'}`, text: k.role })]),
        el('td', { class: 'muted', text: k.createdAt.slice(0, 10) }),
        el('td', {}, [revokeBtn]),
      ]));
    }
  } catch { tbody.textContent = ''; }
}

/** @param {ReturnType<typeof import('./app.js').createEl>} el @param {HTMLElement} into */
function renderAiProviders(el, into) {
  const rows = AI_PROVIDERS.map((p) => {
    const nameEl = el('td', {}, [el('strong', { text: p.name })]);
    const envEl = el('td', {}, [el('code', { class: 'mono', text: p.envKey })]);
    const docsEl = el('td', {}, [el('span', { class: 'muted', text: p.docs })]);
    return el('tr', {}, [nameEl, envEl, docsEl]);
  });
  const table = el('table', {}, [
    el('thead', {}, [el('tr', {}, ['Proveedor', 'Variable de entorno', 'Documentación'].map((h) => el('th', { text: h })))]),
    el('tbody', {}, rows),
  ]);

  into.append(
    el('h3', { text: 'Proveedores de IA' }),
    el('p', { class: 'muted', text: 'Configura estas variables en Railway (Settings → Variables) para activar cada proveedor.' }),
    table,
    el('h3', { text: 'Otras variables de entorno' }),
    el('div', { class: 'stack' }, [
      ['PAYGUARD_ADMIN_TOKEN', 'Token de administración para endpoints de escritura (sin él, no hay auth).'],
      ['PAYGUARD_ALLOW_NOTIFY=1', 'Activa el reenvío de notificaciones a Slack y correo.'],
      ['PAYGUARD_ALLOW_UPLOAD=1', 'Activa la subida de facturas en PDF/imagen.'],
      ['PAYGUARD_DAILY=1', 'Activa la corrida diaria automática a las 07:00.'],
      ['PAYGUARD_SLACK_WEBHOOK', 'Webhook de Slack por defecto para notificaciones.'],
    ].map(([key, desc]) => el('div', { class: 'rule' }, [
      el('header', {}, [el('code', { class: 'mono', text: key })]),
      el('p', { class: 'muted', text: desc }),
    ]))),
  );
}
