/**
 * StatsScreen.js
 * Pantalla de estadísticas visual y animada.
 */
import { getStats, getHistory } from './Stats.js';
import { getLevel } from './Progesion.js';

// ── Animar número contando hacia arriba ───────────────────────
function animateCount(el, target, duration = 900) {
  const start = performance.now();
  const update = (now) => {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(ease * target);
    if (p < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

// ── Animar arco SVG ───────────────────────────────────────────
function animateArc(circle, pct, duration = 1100) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  circle.style.strokeDasharray  = circumference;
  circle.style.strokeDashoffset = circumference;
  const start = performance.now();
  const update = (now) => {
    const p    = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    circle.style.strokeDashoffset = circumference - (circumference * (pct / 100) * ease);
    if (p < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

// ── Renderizar los últimos 20 resultados ──────────────────────
function renderHistory(last20) {
  const el = document.getElementById('stats-history');
  if (!el) return;
  el.innerHTML = '';

  if (last20.length === 0) {
    el.innerHTML = '<span class="stats-no-data">Sin partidas aún</span>';
    return;
  }

  last20.forEach((r, i) => {
    const dot = document.createElement('div');
    dot.className = 'history-dot ' +
      (r === 'w' ? 'dot-win' : r === 'l' ? 'dot-loss' : 'dot-draw');
    dot.style.animationDelay = (i * 40) + 'ms';
    el.appendChild(dot);
  });
}

// ── Renderizar rendimiento por nivel ─────────────────────────
function renderByLevel(byLevel) {
  const el = document.getElementById('stats-by-level');
  if (!el) return;
  el.innerHTML = '';

  const levels = Object.keys(byLevel).map(Number).sort((a, b) => a - b);
  if (levels.length === 0) {
    el.innerHTML = '<span class="stats-no-data">Sin datos por nivel</span>';
    return;
  }

  levels.forEach(lv => {
    const d     = byLevel[lv];
    const total = d.w + d.l + (d.d || 0);
    const pct   = total > 0 ? Math.round((d.w / total) * 100) : 0;
    const bar   = document.createElement('div');
    bar.className = 'level-bar-row';
    bar.innerHTML =
      '<span class="level-bar-lv">Nv.' + lv + '</span>' +
      '<div class="level-bar-track">' +
        '<div class="level-bar-fill" style="width:0%" data-pct="' + pct + '"></div>' +
      '</div>' +
      '<span class="level-bar-pct">' + pct + '%</span>';
    el.appendChild(bar);
  });

  // Animar barras con delay
  setTimeout(() => {
    el.querySelectorAll('.level-bar-fill').forEach((b, i) => {
      setTimeout(() => {
        b.style.width = b.dataset.pct + '%';
      }, i * 80);
    });
  }, 300);
}

// ════════════════════════════════════════════════════════════════
//  RENDERIZAR PANTALLA
// ════════════════════════════════════════════════════════════════
function showStatsScreen() {
  const s = getStats();

  // Anillo de victorias
  const arc = document.getElementById('stats-arc');
  if (arc) animateArc(arc, s.winPct);

  const pctEl = document.getElementById('stats-winpct');
  if (pctEl) animateCount(pctEl, s.winPct);

  // Contadores
  const counters = [
    ['stats-total',  s.total],
    ['stats-wins',   s.wins],
    ['stats-losses', s.losses],
    ['stats-streak', s.maxStreak],
  ];
  counters.forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) animateCount(el, val);
  });

  // Nivel actual y máximo
  const lvEl  = document.getElementById('stats-level');
  const maxEl = document.getElementById('stats-maxlevel');
  if (lvEl)  lvEl.textContent  = getLevel();
  if (maxEl) maxEl.textContent = s.maxLevel;

  // Últimos resultados
  renderHistory(s.last20);

  // Rendimiento por nivel
  renderByLevel(s.byLevel);

  // Mostrar pantalla
  document.getElementById('screen-menu').classList.add('hidden');
  document.getElementById('screen-stats').classList.remove('hidden');
}

// ════════════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════════════
export function initStats() {
  document.getElementById('btn-stats').addEventListener('click', showStatsScreen);
  document.getElementById('btn-stats-back').addEventListener('click', () => {
    document.getElementById('screen-stats').classList.add('hidden');
    document.getElementById('screen-menu').classList.remove('hidden');
  });
}