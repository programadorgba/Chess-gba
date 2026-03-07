/**
 * Stats.js
 * Registro de historial de partidas.
 * Cada partida se guarda como objeto compacto en localStorage.
 *
 * Formato de cada entrada:
 *   { r, l, m, t, md }
 *   r  = resultado: 'w' victoria | 'l' derrota | 'd' tablas
 *   l  = nivel del motor en esa partida (1-20)
 *   m  = número de movimientos totales
 *   t  = timestamp Unix (segundos)
 *   md = modo: 'ai' | 'pvp'
 */

const KEY_HISTORY  = 'chess_history';
const MAX_ENTRIES  = 200; // máximo de partidas guardadas

// ── Leer historial ────────────────────────────────────────────
export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(KEY_HISTORY)) || [];
  } catch {
    return [];
  }
}

// ── Guardar una partida ───────────────────────────────────────
export function recordGame({ result, level, moves, mode }) {
  const history = getHistory();
  history.push({
    r:  result,          // 'w' | 'l' | 'd'
    l:  level,           // número 1-20
    m:  moves,           // número de movimientos
    t:  Math.floor(Date.now() / 1000),
    md: mode,            // 'ai' | 'pvp'
  });

  // Mantener solo las últimas MAX_ENTRIES
  if (history.length > MAX_ENTRIES) history.splice(0, history.length - MAX_ENTRIES);
  localStorage.setItem(KEY_HISTORY, JSON.stringify(history));
}

// ── Estadísticas calculadas ───────────────────────────────────
export function getStats() {
  const history = getHistory();
  const ai      = history.filter(g => g.md === 'ai');

  const total    = ai.length;
  const wins     = ai.filter(g => g.r === 'w').length;
  const losses   = ai.filter(g => g.r === 'l').length;
  const draws    = ai.filter(g => g.r === 'd').length;
  const winPct   = total > 0 ? Math.round((wins / total) * 100) : 0;

  // Racha máxima histórica
  let maxStreak = 0, cur = 0;
  ai.forEach(g => {
    if (g.r === 'w') { cur++; maxStreak = Math.max(maxStreak, cur); }
    else cur = 0;
  });

  // Nivel más alto alcanzado
  const maxLevel = ai.length > 0 ? Math.max(...ai.map(g => g.l)) : 1;

  // Últimos 20 resultados para la gráfica
  const last20 = ai.slice(-20).map(g => g.r);

  // Nivel donde más se gana y donde más se pierde
  const byLevel = {};
  ai.forEach(g => {
    if (!byLevel[g.l]) byLevel[g.l] = { w: 0, l: 0, d: 0 };
    byLevel[g.l][g.r]++;
  });

  return { total, wins, losses, draws, winPct, maxStreak, maxLevel, last20, byLevel };
}