/**
 * Progesion.js
 * ─────────────────────────────────────────────
 * Sistema de progresión:
 *  - Nivel máximo: 20
 *  - Para subir: 2 victorias CONSECUTIVAS
 *  - Si pierdes: la racha vuelve a 0 (el nivel NO baja)
 */

const KEY_LEVEL   = 'chess_ai_level';
const KEY_STREAK  = 'chess_win_streak';
const MIN_LEVEL   = 1;
const MAX_LEVEL   = 20;
const WINS_NEEDED = 2;

// ── Tabla de dificultad por nivel ─────────────────────────────
// skill: 0-20 (Stockfish UCI Skill Level — comete errores a propósito en niveles bajos)
// depth: profundidad de búsqueda
const LEVEL_TABLE = [
  { level:  1, skill:  0, depth:  1 },  // cae en jaque del pastor
  { level:  2, skill:  1, depth:  2 },  // errores muy básicos
  { level:  3, skill:  2, depth:  3 },  // juega muy mal
  { level:  4, skill:  3, depth:  4 },  // descuida piezas
  { level:  5, skill:  5, depth:  5 },  // juega regular
  { level:  6, skill:  6, depth:  6 },
  { level:  7, skill:  7, depth:  7 },
  { level:  8, skill:  8, depth:  8 },  // juega decente
  { level:  9, skill:  9, depth:  9 },
  { level: 10, skill: 10, depth: 10 },  // nivel medio
  { level: 11, skill: 11, depth: 11 },
  { level: 12, skill: 12, depth: 12 },  // empieza a ser difícil
  { level: 13, skill: 13, depth: 13 },
  { level: 14, skill: 14, depth: 14 },
  { level: 15, skill: 15, depth: 15 },  // muy difícil
  { level: 16, skill: 16, depth: 16 },
  { level: 17, skill: 17, depth: 17 },
  { level: 18, skill: 18, depth: 18 },  // casi imbatible
  { level: 19, skill: 19, depth: 19 },
  { level: 20, skill: 20, depth: 20 },  // máximo Stockfish
];

function getEntry() {
  const lv = getLevel();
  return LEVEL_TABLE.find(e => e.level === lv) || LEVEL_TABLE[0];
}

export function getLevel() {
  const v = parseInt(localStorage.getItem(KEY_LEVEL), 10);
  if (isNaN(v) || v < MIN_LEVEL) return MIN_LEVEL;
  if (v > MAX_LEVEL)             return MAX_LEVEL;
  return v;
}

/** Profundidad de búsqueda para el nivel actual */
export function getCurrentDepth() {
  return getEntry().depth;
}

/** Skill Level UCI (0-20) para el nivel actual */
export function getCurrentSkill() {
  return getEntry().skill;
}

export function getStreak() {
  const v = parseInt(localStorage.getItem(KEY_STREAK), 10);
  return isNaN(v) || v < 0 ? 0 : v;
}

/**
 * Registra una victoria.
 * @returns {{ leveled: boolean, streak: number }}
 */
export function recordWin() {
  const newStreak = getStreak() + 1;
  if (newStreak >= WINS_NEEDED) {
    const current = getLevel();
    const leveled = current < MAX_LEVEL;
    if (leveled) localStorage.setItem(KEY_LEVEL, String(current + 1));
    localStorage.setItem(KEY_STREAK, '0');
    return { leveled, streak: newStreak };
  } else {
    localStorage.setItem(KEY_STREAK, String(newStreak));
    return { leveled: false, streak: newStreak };
  }
}

/** Registra una derrota — resetea la racha, nivel intacto. */
export function recordLoss() {
  localStorage.setItem(KEY_STREAK, '0');
}

/** Solo para debug/reset */
export function resetProgress() {
  localStorage.removeItem(KEY_LEVEL);
  localStorage.removeItem(KEY_STREAK);
}