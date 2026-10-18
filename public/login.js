// @ts-check
/**
 * Pantalla de selección de perfil (demo). No hay autenticación real:
 * el perfil vive en memoria y determina qué vistas se muestran.
 * Todo con textContent; nunca innerHTML.
 */

/** @typedef {'admin'|'facturador'|'desarrollador'} Profile */

const PROFILES = /** @type {const} */ ([
  {
    id: 'admin',
    name: 'Admin',
    role: 'Administrador',
    desc: 'Acceso completo: reglas, auditoría, aprobaciones, métricas y configuración del sistema.',
    tone: 'stop',
  },
  {
    id: 'facturador',
    name: 'Facturador',
    role: 'Sistema externo',
    desc: 'Software que envía facturas a la API para que el agente las valide y clasifique automáticamente.',
    tone: 'ok',
  },
  {
    id: 'desarrollador',
    name: 'Desarrollador',
    role: 'Integrador',
    desc: 'Crea y gestiona API Keys, configura integraciones y establece las claves de los modelos de IA.',
    tone: 'wait',
  },
]);

/**
 * Monta la pantalla de selección de perfil sobre el documento.
 * Llama a onLogin con el perfil elegido y elimina el overlay.
 * @param {(profile: Profile) => void} onLogin
 */
export function mountLogin(onLogin) {
  const overlay = document.createElement('div');
  overlay.id = 'login-overlay';
  overlay.className = 'login-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Selección de perfil');

  const card = document.createElement('div');
  card.className = 'login-card';

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

  const chooseLabel = document.createElement('p');
  chooseLabel.className = 'login-choose';
  chooseLabel.textContent = 'Selecciona un perfil para continuar';

  const grid = document.createElement('div');
  grid.className = 'login-profiles';

  for (const p of PROFILES) {
    const btn = document.createElement('button');
    btn.className = 'login-profile-card';
    btn.type = 'button';
    btn.setAttribute('aria-label', `Entrar como ${p.name}: ${p.desc}`);

    const rolePill = document.createElement('span');
    rolePill.className = `pill ${p.tone}`;
    rolePill.textContent = p.role;

    const name = document.createElement('strong');
    name.textContent = p.name;

    const desc = document.createElement('p');
    desc.textContent = p.desc;

    btn.append(rolePill, name, desc);
    btn.addEventListener('click', () => {
      overlay.remove();
      onLogin(/** @type {Profile} */ (p.id));
    });
    grid.append(btn);
  }

  const footer = document.createElement('p');
  footer.className = 'muted login-footer';
  footer.textContent = 'Datos ficticios · no mueve dinero · sin autenticación real';

  card.append(hdr, chooseLabel, grid, footer);
  overlay.append(card);
  document.body.append(overlay);

  const first = /** @type {HTMLButtonElement|null} */ (grid.querySelector('button'));
  if (first) first.focus();
}
