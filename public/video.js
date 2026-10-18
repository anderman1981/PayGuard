// @ts-check
/**
 * Reproductor de demo de PayGuard: 6 escenas, 2 minutos.
 * Sin dependencias externas. Inyecta su propio CSS una vez.
 */

const SLIDES = [
  {
    badge: 'EL PROBLEMA', icon: '🛡️', title: 'PayGuard',
    body: 'Un pago indebido puede costar más que todo el proceso de aprobación.',
  },
  {
    badge: 'PANEL DE CONTROL', icon: '📊', title: 'Métricas en Tiempo Real',
    body: '4 Pagadas · 4 Frenadas · 5 Pendientes — 66.7 % Autonomía de decisión.',
  },
  {
    badge: 'INGESTA DE FACTURAS', icon: '📄', title: 'Procesamiento de Facturas',
    body: '13 Reglas en cadena validan cada factura. Prioridad fija: HOLD > ESCALATE > PAY.',
  },
  {
    badge: 'MOTOR DE REGLAS', icon: '⚙️', title: 'Configuración Inteligente',
    body: 'Aprobación manual: > USD 5 000 · Máximo por pago: USD 20 000 · Presupuesto: USD 80 000.',
  },
  {
    badge: 'TRAZABILIDAD AUDITADA', icon: '🔐', title: 'Integridad Verificable',
    body: 'Hash-chain de decisiones: cada registro lleva el hash del anterior. Blockchain-like sin blockchain.',
  },
  {
    badge: 'RESUMEN FINAL', icon: '✨', title: 'PayGuard',
    body: '0 dependencias · 177 tests · 97 % cobertura · 0 pagos indebidos. La IA lee. El código decide.',
  },
];

/** Inyecta los estilos del reproductor una sola vez en el <head>. */
function injectStyles() {
  if (document.getElementById('pg-video-css')) return;
  const s = document.createElement('style');
  s.id = 'pg-video-css';
  s.textContent = `
.pg-player{border-radius:12px;overflow:hidden;border:1px solid var(--border,#e2e8f0);
background:var(--card,#fff);}
.pg-progress{height:4px;background:var(--muted-bg,#e2e8f0);}
.pg-fill{height:100%;width:0%;background:linear-gradient(90deg,#667eea,#764ba2);
transition:width .1s linear;}
.pg-frame{position:relative;height:160px;overflow:hidden;
background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);}
.pg-slide{position:absolute;inset:0;display:flex;flex-direction:column;
justify-content:center;align-items:center;text-align:center;padding:16px 24px;
opacity:0;transition:opacity .7s;color:#fff;}
.pg-slide.pg-active{opacity:1;}
.pg-badge{font-size:.7rem;background:rgba(255,255,255,.18);padding:3px 10px;
border-radius:12px;margin-bottom:8px;letter-spacing:.05em;}
.pg-slide h2{font-size:clamp(1rem,3vw,1.4rem);margin:0 0 6px;
text-shadow:1px 2px 4px rgba(0,0,0,.25);}
.pg-slide p{font-size:clamp(.78rem,1.8vw,.95rem);line-height:1.5;max-width:460px;
text-shadow:1px 1px 3px rgba(0,0,0,.2);}
.pg-controls{display:flex;align-items:center;justify-content:center;gap:10px;
padding:8px 12px;background:var(--card,#fff);flex-wrap:wrap;}
.pg-controls button{background:#667eea;color:#fff;border:none;border-radius:6px;
padding:5px 12px;cursor:pointer;font-size:.8rem;transition:background .2s;}
.pg-controls button:hover{background:#764ba2;}
.pg-timer{font-weight:600;color:#667eea;font-size:.8rem;min-width:48px;text-align:center;}
.pg-dots{display:flex;justify-content:center;gap:6px;padding:6px;
background:var(--card,#fff);}
.pg-dot{width:8px;height:8px;border-radius:50%;background:var(--muted-bg,#e2e8f0);
cursor:pointer;transition:background .2s;}
.pg-dot.pg-active{background:#667eea;}
.resumen-bottom{display:grid;grid-template-columns:minmax(260px,460px) 1fr;
gap:20px;align-items:start;}
@media(max-width:720px){.resumen-bottom{grid-template-columns:1fr;}}
@media(prefers-color-scheme:dark){
  .pg-player{border-color:#334155;}
  .pg-progress,.pg-dot{background:#334155;}
  .pg-controls,.pg-dots{background:#1e293b;}
}
:root[data-theme="dark"] .pg-player{border-color:#334155;}
:root[data-theme="dark"] .pg-progress,:root[data-theme="dark"] .pg-dot{background:#334155;}
:root[data-theme="dark"] .pg-controls,:root[data-theme="dark"] .pg-dots{background:#1e293b;}
`;
  document.head.appendChild(s);
}

/** @param {string} tag @param {Record<string,string>} [a] @param {Node[]} [ch] */
const mkEl = (tag, a = {}, ch = []) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(a)) {
    if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else n.setAttribute(k, v);
  }
  ch.forEach((c) => n.appendChild(c));
  return n;
};

/**
 * Construye y devuelve el nodo DOM del reproductor de demo.
 * @returns {HTMLElement}
 */
export function buildVideoSection() {
  injectStyles();
  const N = SLIDES.length, TOTAL = 120, DUR = TOTAL / N;
  let cur = 0, time = 0, playing = false, interval = null;

  const slideEls = SLIDES.map((s, i) =>
    mkEl('div', { class: `pg-slide${i === 0 ? ' pg-active' : ''}` }, [
      mkEl('div', { class: 'pg-badge', text: s.badge }),
      mkEl('h2', { text: `${s.icon} ${s.title}` }),
      mkEl('p', { text: s.body }),
    ])
  );

  const fill = mkEl('div', { class: 'pg-fill' });
  const timeEl = mkEl('span', { class: 'pg-timer', text: '0:00' });
  const playBtn = mkEl('button', { text: '▶ Reproducir' });
  const prevBtn = mkEl('button', { text: '← Anterior' });
  const nextBtn = mkEl('button', { text: 'Siguiente →' });

  const dotEls = SLIDES.map((_, i) => {
    const d = mkEl('div', { class: `pg-dot${i === 0 ? ' pg-active' : ''}` });
    d.addEventListener('click', () => goTo(i));
    return d;
  });

  function updateUI() {
    slideEls.forEach((s, i) => s.classList.toggle('pg-active', i === cur));
    dotEls.forEach((d, i) => d.classList.toggle('pg-active', i === cur));
    const m = Math.floor(time / 60), s = Math.floor(time % 60);
    timeEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    fill.style.width = `${(time / TOTAL) * 100}%`;
  }

  function goTo(n) { cur = n; time = cur * DUR; updateUI(); }
  function stop() {
    playing = false; playBtn.textContent = '▶ Reproducir';
    if (interval) { clearInterval(interval); interval = null; }
  }
  function step() {
    time += 0.1;
    if (time >= TOTAL) { time = 0; cur = 0; stop(); } else { cur = Math.min(Math.floor(time / DUR), N - 1); }
    updateUI();
  }

  playBtn.addEventListener('click', () => {
    playing = !playing;
    if (playing) { playBtn.textContent = '⏸ Pausar'; interval = setInterval(step, 100); } else stop();
  });
  prevBtn.addEventListener('click', () => goTo((cur - 1 + N) % N));
  nextBtn.addEventListener('click', () => goTo((cur + 1) % N));

  const frame = mkEl('div', { class: 'pg-frame' }, slideEls);
  const section = mkEl('div', { class: 'stack' }, [
    mkEl('h3', { text: 'Demo — 2 min' }),
    mkEl('div', { class: 'pg-player' }, [
      mkEl('div', { class: 'pg-progress' }, [fill]),
      frame,
      mkEl('div', { class: 'pg-controls' }, [
        prevBtn,
        mkEl('span', {}, [timeEl, document.createTextNode(' / 2:00')]),
        playBtn,
        nextBtn,
      ]),
      mkEl('div', { class: 'pg-dots' }, dotEls),
    ]),
  ]);
  return section;
}
