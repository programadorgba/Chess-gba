/**
 * Engine.js
 * ──────────────────────────────────────────────────────────────────
 * Wrapper para Stockfish como Web Worker.
 *
 * REQUISITO: descarga stockfish.js (versión WASM para navegador):
 *   https://cdn.jsdelivr.net/npm/stockfish@16/src/stockfish-nnue-16-single.js
 *   → guárdalo como: stockfish.js  (reemplaza el que tienes)
 *
 * El juego funciona 100% offline una vez descargado.
 * ──────────────────────────────────────────────────────────────────
 */

let worker    = null;
let isReady   = false;
let pendingCb = null;

/**
 * Inicializa Stockfish y configura UCI.
 * Devuelve una Promise que resuelve cuando el motor está listo.
 */
export function initEngine() {
  return new Promise((resolve) => {
    if (worker) destroyEngine();

    worker = new Worker('./stockfish.js');

    worker.onerror = (e) => {
      console.error('[Engine] Error cargando stockfish.js:', e.message);
      resolve(); // fallback a movimiento aleatorio
    };

    worker.onmessage = (e) => {
      const line = typeof e.data === 'string' ? e.data : '';

      if (line === 'uciok') {
        worker.postMessage('isready');
      }

      if (line === 'readyok') {
        isReady = true;
        resolve();
      }

      if (line.startsWith('bestmove')) {
        const move = line.split(' ')[1];
        if (pendingCb && move && move !== '(none)') {
          const cb  = pendingCb;
          pendingCb = null;
          cb(move);
        } else if (pendingCb) {
          // motor devolvió (none) — posición terminal
          const cb  = pendingCb;
          pendingCb = null;
          cb(null);
        }
      }
    };

    worker.postMessage('uci');
  });
}

/**
 * Pide al motor el mejor movimiento aplicando Skill Level.
 *
 * @param {string}   fen
 * @param {number}   depth      — profundidad (1-20)
 * @param {number}   skillLevel — Skill Level UCI (0-20)
 *                                0 = errores graves, 20 = grandmaster
 * @param {Function} callback   — cb(ucimove: string | null)
 */
export function getBestMove(fen, depth, skillLevel, callback) {
  if (!worker || !isReady) {
    callback(null);
    return;
  }

  pendingCb = callback;

  // Activar limitación de fuerza y aplicar nivel
  // UCI_LimitStrength + Skill Level = Stockfish comete errores reales
  worker.postMessage('setoption name UCI_LimitStrength value true');
  worker.postMessage(`setoption name Skill Level value ${skillLevel}`);

  // Nuevo juego para limpiar estado interno
  worker.postMessage('ucinewgame');
  worker.postMessage('isready'); // esperar antes de buscar

  // Pequeño timeout para dar tiempo al isready interno
  // (el onmessage ya filtra readyok, así que mandamos directamente)
  worker.postMessage(`position fen ${fen}`);
  worker.postMessage(`go depth ${depth}`);
}

/** Libera el Web Worker al salir de la partida. */
export function destroyEngine() {
  if (worker) {
    try { worker.postMessage('quit'); } catch (_) {}
    worker.terminate();
    worker    = null;
    isReady   = false;
    pendingCb = null;
  }
}