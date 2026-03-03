/**
 * progression.js
 * ──────────────────────────────────────────────────────────────────
 * Sistema de progresión automática de dificultad.
 *
 * Cómo funciona:
 *  - El nivel empieza en 1 (profundidad Stockfish = 1) para todos.
 *  - Cada vez que el jugador GANA contra la IA, el nivel sube +1.
 *  - El nivel máximo es 12 (profundidad = 12).
 *  - El progreso se guarda en localStorage del navegador.
 *  - El jugador nunca ve el número de nivel — la dificultad
 *    sube sola de forma transparente.
 *
 * Mapeo nivel → profundidad Stockfish:
 *  Nivel  1 → depth  1  (principiante)
 *  Nivel  2 → depth  2
 *  ...
 *  Nivel 12 → depth 12  (máximo)
 * ──────────────────────────────────────────────────────────────────
 */

const STORAGE_KEY = 'chess_ai_level';  // clave en localStorage
const MIN_LEVEL   = 1;
const MAX_LEVEL   = 14;

/**
 * Lee el nivel actual del jugador desde localStorage.
 * Si es la primera vez, devuelve 1.
 * @returns {number} nivel entre 1 y 12
 */
export function getLevel() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) return MIN_LEVEL;
  const parsed = parseInt(stored, 10);
  // Sanitizar por si el valor guardado está fuera de rango
  if (isNaN(parsed) || parsed < MIN_LEVEL) return MIN_LEVEL;
  if (parsed > MAX_LEVEL)                  return MAX_LEVEL;
  return parsed;
}

/**
 * Devuelve la profundidad de Stockfish para el nivel actual.
 * En este esquema nivel === profundidad, pero tenerlo separado
 * permite cambiar el mapeo en el futuro sin tocar app.js.
 * @returns {number} profundidad para getBestMove()
 */
export function getCurrentDepth() {
  return getLevel();
}

/**
 * Sube el nivel en 1 si el jugador acaba de ganar contra la IA.
 * No hace nada si ya está en el nivel máximo.
 * Guarda el nuevo nivel en localStorage.
 * @returns {boolean} true si el nivel subió, false si ya era máximo
 */
export function levelUp() {
  const current = getLevel();
  if (current >= MAX_LEVEL) return false;   // ya en el techo
  const next = current + 1;
  localStorage.setItem(STORAGE_KEY, String(next));
  console.info(`[Progression] Nivel subido: ${current} → ${next} (depth ${next})`);
  return true;
}

/**
 * (Opcional / debug) Resetea el nivel a 1.
 * No se llama desde el juego normal.
 */
export function resetLevel() {
  localStorage.removeItem(STORAGE_KEY);
}