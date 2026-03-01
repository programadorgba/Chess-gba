/**
 * engine.js
 * ──────────────────────────────────────────────────────────────────
 * Wrapper para Stockfish local como Web Worker.
 *
 * REQUISITO: descarga stockfish.js y ponlo en la raíz del proyecto
 * (misma carpeta que index.html):
 *   https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js
 *   → guárdalo como: stockfish.js
 *
 * El juego funciona 100% offline una vez descargado.
 * ──────────────────────────────────────────────────────────────────
 */

let worker    = null;
let isReady   = false;
let pendingCb = null;

/**
 * Inicializa Stockfish desde el archivo local.
 * Devuelve una Promise que resuelve cuando el motor está listo.
 */
export function initEngine() {
  return new Promise((resolve) => {
    if (worker) destroyEngine();

    worker = new Worker('./stockfish.js');

    worker.onerror = (e) => {
      console.error('[Engine] Error cargando stockfish.js:', e.message);
      console.error('Asegúrate de que stockfish.js está en la raíz del proyecto.');
      resolve(); // resuelve igual → fallback a movimiento aleatorio
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
        }
      }
    };

    worker.postMessage('uci');
  });
}

/**
 * Pide al motor el mejor movimiento para una posición FEN.
 * @param {string}   fen
 * @param {number}   depth     — profundidad de búsqueda (1–12)
 * @param {Function} callback  — cb(ucimove: string | null)
 */
export function getBestMove(fen, depth, callback) {
  if (!worker || !isReady) {
    // Motor no disponible → movimiento aleatorio (fallback)
    callback(null);
    return;
  }
  pendingCb = callback;
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