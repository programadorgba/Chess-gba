/**
 * Progesion.js
 * ─────────────────────────────────────────────
 * Sistema de progresión:
 *  - Nivel máximo: 20
 *  - Para subir: 2 victorias CONSECUTIVAS
 *  - Si pierdes: la racha vuelve a 0 (el nivel NO baja)
 *  - getStreak()  → victorias consecutivas actuales (0 o 1)
 *  - recordWin()  → registra victoria, devuelve { leveled, streak }
 *  - recordLoss() → resetea racha
 */

const KEY_LEVEL  = 'chess_ai_level';
const KEY_STREAK = 'chess_win_streak';
const MIN_LEVEL  = 1;
const MAX_LEVEL  = 20;
const WINS_NEEDED = 2;

export function getLevel() {
  const v = parseInt(localStorage.getItem(KEY_LEVEL), 10);
  if (isNaN(v) || v < MIN_LEVEL) return MIN_LEVEL;
  if (v > MAX_LEVEL)             return MAX_LEVEL;
  return v;
}

export function getCurrentDepth() {
  return getLevel();
}

export function getStreak() {
  const v = parseInt(localStorage.getItem(KEY_STREAK), 10);
  return isNaN(v) || v < 0 ? 0 : v;
}

/**
 * Registra una victoria.
 * @returns {{ leveled: boolean, streak: number }}
 *   leveled = true si en esta victoria se subió de nivel
 *   streak  = racha actual DESPUÉS de esta victoria
 */
export function recordWin() {
  const newStreak = getStreak() + 1;

  if (newStreak >= WINS_NEEDED) {
    // Subir nivel y resetear racha
    const current = getLevel();
    const leveled = current < MAX_LEVEL;
    if (leveled) localStorage.setItem(KEY_LEVEL, String(current + 1));
    localStorage.setItem(KEY_STREAK, '0');
    return { leveled, streak: newStreak };
  } else {
    // Guardar racha parcial
    localStorage.setItem(KEY_STREAK, String(newStreak));
    return { leveled: false, streak: newStreak };
  }
}

/**
 * Registra una derrota — resetea la racha, nivel intacto.
 */
export function recordLoss() {
  localStorage.setItem(KEY_STREAK, '0');
}

/** Solo para debug/reset */
export function resetProgress() {
  localStorage.removeItem(KEY_LEVEL);
  localStorage.removeItem(KEY_STREAK);
}