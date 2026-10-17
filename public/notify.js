// @ts-check
/**
 * Notificación al humano, dentro del sidebar (debajo del menú): el agente le
 * escribe al responsable qué facturas NO va a pagar y por qué, de forma
 * llamativa. Suma sonido, un contador en la pestaña del navegador y, si se
 * configura, reenvío a Slack y correo vía /api/notify. Todo con textContent.
 */
import { deriveAgentMessages } from './lib.js';

const STORE_SEEN = 'payguard.notify.seen';
const STORE_CFG = 'payguard.notify.cfg';
const BASE_TITLE = 'PayGuard';

/** @param {string} tag @param {Record<string,string>} [attrs] @param {(Node|string)[]} [children] */
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

/** @returns {Set<string>} */
function readSeen() {
  try { return new Set(JSON.parse(localStorage.getItem(STORE_SEEN) ?? '[]')); } catch { return new Set(); }
}
/** @param {Set<string>} set */
function writeSeen(set) {
  try { localStorage.setItem(STORE_SEEN, JSON.stringify([...set])); } catch { /* sin almacenamiento */ }
}
/** @returns {{ slackWebhook: string, email: string, audio: boolean }} */
function readCfg() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_CFG) ?? '{}');
    return { slackWebhook: raw.slackWebhook ?? '', email: raw.email ?? '', audio: raw.audio !== false };
  } catch { return { slackWebhook: '', email: '', audio: true }; }
}
/** @param {{ slackWebhook: string, email: string, audio: boolean }} cfg */
function writeCfg(cfg) {
  try { localStorage.setItem(STORE_CFG, JSON.stringify(cfg)); } catch { /* sin almacenamiento */ }
}

/** Un pitido corto, sin archivos de audio. */
function beep() {
  try {
    const Ctx = window.AudioContext ?? /** @type {any} */ (window).webkitAudioContext;
    if (!Ctx) return;
    const ac = new Ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = 'sine'; osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ac.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.3);
    osc.start(); osc.stop(ac.currentTime + 0.32);
    osc.onended = () => ac.close();
  } catch { /* el navegador puede bloquear el audio sin interacción */ }
}

/** @param {number} n */
function setTabBadge(n) {
  document.title = n > 0 ? `(${n}) ${BASE_TITLE}` : BASE_TITLE;
}

/**
 * @param {{ api: (path: string, init?: RequestInit) => Promise<any> }} ctx
 * @returns {{ mount: () => void, sync: (decisions: import('./lib.js').DecisionRow[]) => void }}
 */
export function createNotifier(ctx) {
  let cfg = readCfg();
  /** @type {{ id: string, outcome: string, kind: string, text: string }[]} */
  let messages = [];

  const badge = el('span', { class: 'notify-badge', hidden: 'true' });
  const list = el('div', { class: 'notify-list' });
  const cfgBox = el('div', { class: 'notify-cfg', hidden: 'true' });

  const slack = /** @type {HTMLInputElement} */ (el('input', {
    id: 'cfg-slack', placeholder: 'https://hooks.slack.com/services/…', value: cfg.slackWebhook,
  }));
  const email = /** @type {HTMLInputElement} */ (el('input', {
    id: 'cfg-email', type: 'email', placeholder: 'finanzas@empresa.com', value: cfg.email,
  }));
  const audio = /** @type {HTMLInputElement} */ (el('input', { id: 'cfg-audio', type: 'checkbox' }));
  audio.checked = cfg.audio;
  const saveCfg = el('button', { class: 'btn', type: 'button', text: 'Guardar' });
  saveCfg.addEventListener('click', () => {
    cfg = { slackWebhook: slack.value.trim(), email: email.value.trim(), audio: audio.checked };
    writeCfg(cfg);
    cfgBox.setAttribute('hidden', 'true');
  });
  cfgBox.append(
    el('label', { for: 'cfg-slack' }, ['Canal de Slack (webhook)', slack]),
    el('label', { for: 'cfg-email' }, ['Correo de avisos', email]),
    el('label', { for: 'cfg-audio', class: 'row' }, [audio, 'Sonar al llegar un aviso']),
    el('div', {}, [saveCfg]),
  );

  const gear = el('button', { class: 'btn ghost', type: 'button', text: 'Config' });
  gear.addEventListener('click', () => {
    if (cfgBox.getAttribute('hidden') !== null) cfgBox.removeAttribute('hidden');
    else cfgBox.setAttribute('hidden', 'true');
  });
  const visto = el('button', { class: 'btn ghost', type: 'button', text: 'Visto' });
  visto.addEventListener('click', () => markAllSeen());

  const head = el('header', { class: 'notify-head' }, [
    el('strong', { text: 'El agente' }), badge, el('span', { class: 'grow' }), gear, visto,
  ]);

  function markAllSeen() {
    const seen = readSeen();
    for (const m of messages) seen.add(m.id);
    writeSeen(seen);
    paint();
  }

  function paint() {
    const seen = readSeen();
    const unseen = messages.filter((m) => !seen.has(m.id)).length;
    if (unseen > 0) { badge.textContent = String(unseen); badge.removeAttribute('hidden'); } else badge.setAttribute('hidden', 'true');
    setTabBadge(unseen);
    list.textContent = '';
    if (messages.length === 0) {
      list.append(el('p', { class: 'muted', text: 'Sin avisos. El agente escribe aquí cuando frena o escala una factura.' }));
      return;
    }
    for (const m of messages) {
      const nuevo = seen.has(m.id) ? '' : ' nuevo';
      const cls = m.outcome === 'HOLD' ? 'hold' : 'escalate';
      list.append(el('div', { class: `notify-msg ${cls}${nuevo}` }, [
        el('span', { class: `pill ${m.outcome === 'HOLD' ? 'stop' : 'wait'}`, text: m.outcome === 'HOLD' ? 'No pago' : 'Aprobación' }),
        el('p', { text: m.text }),
      ]));
    }
  }

  /** Reenvía los avisos nuevos a Slack/correo (best-effort, no bloquea la UI). @param {typeof messages} nuevos */
  function relay(nuevos) {
    if (nuevos.length === 0 || (!cfg.slackWebhook && !cfg.email)) return;
    const text = `PayGuard · ${nuevos.length} novedad(es):\n${nuevos.map((m) => `• ${m.text}`).join('\n')}`;
    ctx.api('/notify', {
      method: 'POST',
      body: JSON.stringify({ text, slackWebhook: cfg.slackWebhook, email: cfg.email }),
    }).catch(() => { /* el aviso en pantalla ya quedó; el reenvío es best-effort */ });
  }

  return {
    mount() {
      const target = document.getElementById('rail-notify');
      if (!target) return;
      target.append(head, cfgBox, list);
      paint();
    },
    sync(decisions) {
      const prevIds = new Set(messages.map((m) => m.id));
      messages = deriveAgentMessages(decisions);
      const seen = readSeen();
      const nuevos = messages.filter((m) => !prevIds.has(m.id) && !seen.has(m.id));
      paint();
      if (nuevos.length > 0) {
        if (cfg.audio) beep();
        relay(nuevos);
      }
    },
  };
}
