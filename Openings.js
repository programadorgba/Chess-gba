/**
 * Openings.js
 * Práctica de aperturas — rama de prueba
 * El jugador sigue la secuencia correcta movimiento a movimiento.
 * Las respuestas del rival se juegan automáticamente.
 */
import { Chess } from './chess.min.js';

// ════════════════════════════════════════════════════════════════
//  APERTURAS
//  moves: secuencia completa en notación UCI (origen+destino)
//  hints: explicación del movimiento del jugador (índices pares = blancas)
// ════════════════════════════════════════════════════════════════
export const OPENINGS = [
  {
    id:    'italiana',
    name:  'Apertura Italiana',
    emoji: '🇮🇹',
    desc:  'Control del centro y desarrollo rápido de piezas.',
    moves: ['e2e4','e7e5','g1f3','b8c6','f1c4','f8c5'],
    hints: [
      'Ocupa el centro con el peón.',          // e4 — blancas
      'El rival responde al centro.',           // e5 — negras (auto)
      'Desarrolla el caballo hacia el centro.', // Cf3 — blancas
      'El rival desarrolla su caballo.',        // Cc6 — negras (auto)
      'Alfil activo apuntando a f7. Giuoco Piano.', // Ac4 — blancas
      'El rival responde con su alfil.',        // Ac5 — negras (auto)
    ],
  },
  {
    id:    'ruy-lopez',
    name:  'Ruy López',
    emoji: '⚔️',
    desc:  'Presión inmediata sobre el caballo que defiende e5.',
    moves: ['e2e4','e7e5','g1f3','b8c6','f1b5','a7a6','b5a4','g8f6'],
    hints: [
      'Ocupa el centro.',
      'El rival responde.',
      'Desarrolla el caballo.',
      'El rival desarrolla su caballo.',
      'Alfil a b5 — presiona el caballo c6 que defiende e5.',
      'El rival ataca el alfil con a6.',
      'Retira el alfil a a4 manteniendo la presión.',
      'El rival desarrolla el caballo f6.',
    ],
  },
  {
    id:    'siciliana',
    name:  'Defensa Siciliana',
    emoji: '🛡️',
    desc:  'Respuesta asimétrica al e4. La defensa más popular del mundo.',
    moves: ['e2e4','c7c5','g1f3','d7d6','d2d4','c5d4','f3d4','g8f6','b1c3'],
    hints: [
      'Blancas ocupan el centro.',
      'Negras responden con c5 — control asimétrico.',
      'Blancas desarrollan el caballo.',
      'Negras preparan el desarrollo.',
      'Blancas abren el centro con d4.',
      'Negras capturan en d4.',
      'Blancas recapturan con el caballo.',
      'Negras desarrollan el caballo f6, atacando e4.',
      'Blancas desarrollan el caballo c3 defendiendo e4.',
    ],
  },
  {
    id:    'gambito-rey',
    name:  'Gambito de Rey',
    emoji: '👑',
    desc:  'Sacrificio agresivo de peón para dominar el centro.',
    moves: ['e2e4','e7e5','f2f4','e5f4','g1f3','g7g5','f1c4'],
    hints: [
      'Blancas ocupan el centro.',
      'El rival responde al centro.',
      'Gambito de Rey — sacrificio del peón f4 por control del centro.',
      'El rival acepta el gambito capturando en f4.',
      'Desarrolla el caballo con amenaza.',
      'El rival intenta mantener el peón ganado.',
      'Alfil a c4 — presión sobre f7.',
    ],
  },
  {
    id:    'francesa',
    name:  'Defensa Francesa',
    emoji: '🥖',
    desc:  'Sólida estructura para las negras. Contraataque en el centro.',
    moves: ['e2e4','e7e6','d2d4','d7d5','b1c3','g8f6','e4e5','f6d7'],
    hints: [
      'Blancas ocupan el centro.',
      'Negras preparan d5 con e6.',
      'Blancas refuerzan el centro con d4.',
      'Negras atacan el centro con d5.',
      'Blancas defienden e4 con el caballo.',
      'Negras desarrollan el caballo f6.',
      'Blancas avanzan e5 cerrando el centro.',
      'Negras retiran el caballo a d7.',
    ],
  },
];

// ════════════════════════════════════════════════════════════════
//  ESTADO DE LA SESIÓN DE PRÁCTICA
// ════════════════════════════════════════════════════════════════
const KEY_COMPLETED = 'chess_openings_done';

export function getCompleted() {
  try { return JSON.parse(localStorage.getItem(KEY_COMPLETED)) || []; }
  catch { return []; }
}

function markCompleted(id) {
  const done = getCompleted();
  if (!done.includes(id)) {
    done.push(id);
    localStorage.setItem(KEY_COMPLETED, JSON.stringify(done));
  }
}

// ════════════════════════════════════════════════════════════════
//  RENDERIZAR TABLERO DE PRÁCTICA
// ════════════════════════════════════════════════════════════════
let practiceChess   = null;
let practiceOpening = null;
let practiceStep    = 0;   // índice del siguiente movimiento esperado
let practiceBoard   = null;

function renderPracticeBoard() {
  practiceBoard.innerHTML = '';
  const board   = practiceChess.board();
  const o       = practiceOpening;

  // Casillas del movimiento sugerido (solo en turno del jugador)
  let hintFrom = null, hintTo = null;
  if (o && practiceStep < o.moves.length && practiceStep % 2 === 0) {
    hintFrom = o.moves[practiceStep].slice(0, 2);
    hintTo   = o.moves[practiceStep].slice(2, 4);
  }

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq    = String.fromCharCode(97 + f) + (8 - r);
      const piece = board[r][f];
      const light = (r + f) % 2 === 1;

      const div = document.createElement('div');
      div.className = 'square ' + (light ? 'light' : 'dark');

      // Resaltar jugada sugerida
      if (sq === hintFrom) div.classList.add('hint-from');
      if (sq === hintTo)   div.classList.add('hint-to');

      // Resaltar selección del jugador
      if (practiceSel.includes(sq))     div.classList.add('selected');
      if (practiceTargets.includes(sq)) {
        div.classList.add(piece ? 'legal-capture' : 'legal');
      }

      if (piece) {
        const FILLED = { k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟' };
        const span = document.createElement('span');
        span.className   = 'piece-unicode';
        span.textContent = FILLED[piece.type] || '?';
        if (piece.color === 'w') {
          span.style.color      = '#ffffff';
          span.style.textShadow = '0 1px 6px rgba(0,0,0,0.8)';
        } else {
          span.style.color      = '#1a0a00';
          span.style.textShadow = '0 1px 3px rgba(255,255,255,0.15)';
        }
        div.appendChild(span);
      }

      div.addEventListener('click', () => onPracticeClick(sq));
      practiceBoard.appendChild(div);
    }
  }

  // Actualizar progreso
  if (o) {
    const playerMove = Math.floor(practiceStep / 2) + 1;
    const totalMoves = Math.ceil(o.moves.length / 2);
    const el = document.getElementById('practice-progress');
    if (el) el.textContent = 'Jugada ' + playerMove + ' / ' + totalMoves;
  }
}

// Casilla seleccionada en práctica
let practiceSel     = [];
let practiceTargets = [];

function onPracticeClick(sq) {
  if (!practiceOpening) return;
  const o = practiceOpening;

  // Solo mueve el jugador en turnos blancos (pasos pares)
  if (practiceStep >= o.moves.length) return;
  if (practiceStep % 2 !== 0) return; // turno de negras (auto)

  const piece = practiceChess.get(sq);

  if (!practiceSel.length) {
    if (!piece || piece.color !== 'w') return;
    practiceSel     = [sq];
    practiceTargets = practiceChess.moves({ square: sq, verbose: true }).map(m => m.to);
    highlightPractice();
    return;
  }

  const from = practiceSel[0];
  practiceSel     = [];
  practiceTargets = [];

  const expected = o.moves[practiceStep];
  const played   = from + sq;

  if (played !== expected) {
    // Movimiento incorrecto
    showPracticeMsg('❌  Incorrecto. El movimiento correcto era: ' + uciToSan(expected), 'error');
    highlightPractice();
    return;
  }

  // Movimiento correcto
  practiceChess.move({ from, to: sq, promotion: 'q' });
  practiceStep++;
  renderPracticeBoard();
  showPracticeMsg('✓  ' + o.hints[practiceStep - 1], 'ok');

  if (practiceStep >= o.moves.length) {
    // Apertura completada
    markCompleted(o.id);
    setTimeout(() => showPracticeComplete(), 800);
    return;
  }

  // Jugar respuesta automática de negras
  if (practiceStep % 2 === 1) {
    setTimeout(() => {
      const mv = o.moves[practiceStep];
      practiceChess.move({ from: mv.slice(0,2), to: mv.slice(2,4), promotion: 'q' });
      practiceStep++;
      renderPracticeBoard();
      if (practiceStep < o.moves.length) {
        showPracticeMsg('▶  Tu turno: ' + o.hints[practiceStep], 'info');
      }
    }, 600);
  }
}

function highlightPractice() {
  renderPracticeBoard();
}

function uciToSan(uci) {
  const tmp = new Chess(practiceChess.fen());
  const m   = tmp.move({ from: uci.slice(0,2), to: uci.slice(2,4), promotion: 'q' });
  return m ? m.san : uci;
}

function showPracticeMsg(text, type) {
  const el = document.getElementById('practice-hint');
  if (!el) return;
  el.textContent = text;
  el.className   = 'practice-hint hint-' + type;
}

function showPracticeComplete() {
  const el = document.getElementById('practice-hint');
  if (el) {
    el.textContent = '🏆 ¡Apertura completada!';
    el.className   = 'practice-hint hint-win';
  }
  document.getElementById('practice-next-btn').classList.remove('hidden');
  // Refrescar lista de aperturas para mostrar el tick
  renderOpeningsList();
}

// ════════════════════════════════════════════════════════════════
//  PANTALLA DE SELECCIÓN DE APERTURA
// ════════════════════════════════════════════════════════════════
function renderOpeningsList() {
  const list     = document.getElementById('openings-list');
  const done     = getCompleted();
  list.innerHTML = '';

  OPENINGS.forEach(op => {
    const completed = done.includes(op.id);
    const btn       = document.createElement('button');
    btn.className   = 'opening-item' + (completed ? ' opening-done' : '');
    btn.innerHTML   =
      '<span class="opening-emoji">' + op.emoji + '</span>' +
      '<div class="opening-info">' +
        '<span class="opening-name">' + op.name + '</span>' +
        '<span class="opening-desc">' + op.desc + '</span>' +
      '</div>' +
      (completed ? '<span class="opening-check">✓</span>' : '<span class="opening-arrow">›</span>');
    btn.addEventListener('click', () => startOpening(op));
    list.appendChild(btn);
  });
}

// ════════════════════════════════════════════════════════════════
//  INICIAR PRÁCTICA DE UNA APERTURA
// ════════════════════════════════════════════════════════════════
function startOpening(op) {
  practiceOpening = op;
  practiceChess   = new Chess();
  practiceStep    = 0;
  practiceSel     = [];
  practiceTargets = [];

  document.getElementById('practice-opening-title').textContent = op.emoji + '  ' + op.name;
  document.getElementById('practice-hint').textContent   = '▶  ' + op.hints[0];
  document.getElementById('practice-hint').className     = 'practice-hint hint-info';
  document.getElementById('practice-next-btn').classList.add('hidden');
  document.getElementById('practice-progress').textContent =
    'Movimiento 1 / ' + Math.ceil(op.moves.length / 2);

  document.getElementById('screen-openings-list').classList.add('hidden');
  document.getElementById('screen-openings-board').classList.remove('hidden');

  practiceBoard = document.getElementById('practice-board');
  renderPracticeBoard();
}

// ════════════════════════════════════════════════════════════════
//  INIT — llamado desde App.js
// ════════════════════════════════════════════════════════════════
export function initOpenings() {
  // Botón del menú principal
  document.getElementById('btn-openings').addEventListener('click', () => {
    renderOpeningsList();
    document.getElementById('screen-menu').classList.add('hidden');
    document.getElementById('screen-openings').classList.remove('hidden');
    document.getElementById('screen-openings-list').classList.remove('hidden');
    document.getElementById('screen-openings-board').classList.add('hidden');
  });

  // Volver desde lista
  document.getElementById('btn-openings-back').addEventListener('click', () => {
    document.getElementById('screen-openings').classList.add('hidden');
    document.getElementById('screen-menu').classList.remove('hidden');
  });

  // Volver desde tablero al listado
  document.getElementById('btn-practice-back').addEventListener('click', () => {
    practiceOpening = null;
    document.getElementById('screen-openings-board').classList.add('hidden');
    document.getElementById('screen-openings-list').classList.remove('hidden');
    renderOpeningsList();
  });

  // Reintentar apertura
  document.getElementById('btn-practice-retry').addEventListener('click', () => {
    if (practiceOpening) startOpening(practiceOpening);
  });

  // Siguiente apertura
  document.getElementById('practice-next-btn').addEventListener('click', () => {
    practiceOpening = null;
    document.getElementById('screen-openings-board').classList.add('hidden');
    document.getElementById('screen-openings-list').classList.remove('hidden');
    renderOpeningsList();
  });
}