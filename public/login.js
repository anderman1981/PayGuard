// @ts-check
/**
 * Pantalla de login demo — selección de perfil + email y contraseña.
 * Validación mínima (campos no vacíos); sin auth real ni red.
 * Todo con textContent; nunca innerHTML.
 */

/** @typedef {'admin'|'facturador'|'desarrollador'} Profile */

const PROFILES = /** @type {const} */ ([
  {
    id: 'admin',
    name: 'Admin',
    role: 'Administrador',
    tone: 'stop',
    desc: 'Acceso completo: reglas, auditoría, aprobaciones, métricas y configuración.',
    hint: 'admin@payguard.demo · admin1234',
  },
  {
    id: 'facturador',
    name: 'Facturador',
    role: 'Sistema ERP / Proveedor',
    tone: 'ok',
    desc: 'Envía facturas a la API para que el agente las valide antes de pagarlas.',
    hint: 'erp@payguard.demo · erp12345',
  },
  {
    id: 'desarrollador',
    name: 'Desarrollador',
    role: 'Dev / Integrador',
    tone: 'wait',
    desc: 'Gestiona API keys, configura proveedores IA y explora la documentación.',
    hint: 'dev@payguard.demo · dev12345',
  },
]);

/**
 * Monta la pantalla de login sobre el documento.
 * Flujo: seleccionar perfil → rellenar email + contraseña → ingresar.
 * @param {(profile: Profile) => void} onLogin
 */
export function mountLogin(onLogin) {
  /** @type {Profile|null} */
  let chosen = null;

  const overlay = document.createElement('div');
  overlay.id = 'login-overlay';
  overlay.className = 'login-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Inicio de sesión');

  /* ── Encabezado ── */
  const demoBadge = document.createElement('span');
  demoBadge.className = 'pill wait';
  demoBadge.textContent = 'Demo';

  const logo = document.createElement('div');
  logo.className = 'login-logo';
  logo.textContent = 'PG';

  const title = document.createElement('h1');
  title.textContent = 'PayGuard';

  const sub = document.createElement('p');
  sub.className = 'muted';
  sub.textContent = 'Agente de validación de pagos · Reto Blinka 30X';

  const hdr = document.createElement('div');
  hdr.className = 'login-header';
  hdr.append(demoBadge, logo, title, sub);

  /* ── Selector de perfil ── */
  const chooseLabel = document.createElement('p');
  chooseLabel.className = 'login-choose';
  chooseLabel.textContent = '1. Selecciona un perfil';

  const grid = document.createElement('div');
  grid.className = 'login-profiles';

  /* ── Formulario (oculto hasta elegir perfil) ── */
  const hintEl = document.createElement('p');
  hintEl.className = 'login-hint';

  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.placeholder = 'correo@empresa.com';
  emailInput.setAttribute('aria-label', 'Correo electrónico');
  emailInput.autocomplete = 'email';

  const passInput = document.createElement('input');
  passInput.type = 'password';
  passInput.placeholder = 'Contraseña';
  passInput.setAttribute('aria-label', 'Contraseña');
  passInput.autocomplete = 'current-password';

  const errEl = document.createElement('p');
  errEl.style.cssText = 'color:var(--stop);font-size:12px;margin:0;min-height:1.2em';

  const submitBtn = document.createElement('button');
  submitBtn.className = 'btn';
  submitBtn.type = 'submit';
  submitBtn.textContent = 'Ingresar';

  const form = document.createElement('form');
  form.className = 'login-form';
  form.append(hintEl, emailInput, passInput, errEl, submitBtn);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!chosen) { errEl.textContent = 'Selecciona un perfil primero.'; return; }
    if (!emailInput.value.trim()) { errEl.textContent = 'Ingresa tu correo electrónico.'; return; }
    if (passInput.value.length < 4) {
      errEl.textContent = 'La contraseña debe tener al menos 4 caracteres.';
      return;
    }
    errEl.textContent = '';
    overlay.remove();
    onLogin(chosen);
  });

  const formWrap = document.createElement('div');
  formWrap.hidden = true;

  const formLabel = document.createElement('p');
  formLabel.className = 'login-choose';
  formLabel.textContent = '2. Ingresa tus credenciales';

  formWrap.append(formLabel, form);

  /* ── Tarjetas de perfil ── */
  const cardBtns = PROFILES.map((p) => {
    const rolePill = document.createElement('span');
    rolePill.className = `pill ${p.tone}`;
    rolePill.textContent = p.role;

    const name = document.createElement('strong');
    name.textContent = p.name;

    const desc = document.createElement('p');
    desc.textContent = p.desc;

    const btn = document.createElement('button');
    btn.className = 'login-profile-card';
    btn.type = 'button';
    btn.setAttribute('aria-pressed', 'false');
    btn.append(rolePill, name, desc);
    btn.addEventListener('click', () => {
      chosen = /** @type {Profile} */ (p.id);
      cardBtns.forEach((b, i) => {
        const active = PROFILES[i].id === p.id;
        b.classList.toggle('selected', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      hintEl.textContent = `Credenciales de prueba: ${p.hint}`;
      formWrap.hidden = false;
      emailInput.focus();
    });
    return btn;
  });
  grid.append(...cardBtns);

  /* ── Pie ── */
  const footer = document.createElement('p');
  footer.className = 'muted login-footer';
  footer.textContent = 'Datos ficticios · no mueve dinero · sin autenticación real';

  const card = document.createElement('div');
  card.className = 'login-card';
  card.append(hdr, chooseLabel, grid, formWrap, footer);

  overlay.append(card);
  document.body.append(overlay);

  const first = /** @type {HTMLButtonElement|null} */ (grid.querySelector('button'));
  if (first) first.focus();
}
