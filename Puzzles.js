/**
 * Puzzles.js
 * Retos de finales — posiciones FEN predefinidas.
 * El jugador resuelve sin IA. Pista en dos niveles y solución animada.
 */
import { Chess } from './chess.min.js';

// ════════════════════════════════════════════════════════════════
//  RETOS
// ════════════════════════════════════════════════════════════════
const PUZZLES = [
  {
    id:       'ladder-mate',
    name:     'Mate de Escalera',
    emoji:    '🏰',
    desc:     'Dos torres. Acorrala al rey paso a paso.',
    goal:     'Mata en 4 movimientos',
    fen:      '8/8/8/8/8/2k5/8/R1K5 w - - 0 1',
    solution: ['a1a3','c3b4','a3b3','b4c4','b3b4'],
    hint:     'a1',
  },
  {
    id:       'knight-fork',
    name:     'Horquilla de Caballo',
    emoji:    '♞',
    desc:     'Un salto gana la dama. Encuentra la casilla.',
    goal:     'Gana material decisivo',
    fen:      'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
    solution: ['f3g5','d8g5','g5d2'],
    hint:     'f3',
  },
  {
    id:       'bishop-pin',
    name:     'Clavada de Alfil',
    emoji:    '♗',
    desc:     'Clava la torre al rey y gana material.',
    goal:     'Gana la torre',
    fen:      '4k3/8/8/8/8/8/3r4/4K2B w - - 0 1',
    solution: ['h1b7','d2b2','b7e4'],
    hint:     'h1',
  },
  {
    id:       'rook-king',
    name:     'Rey y Torre vs Rey',
    emoji:    '👑',
    desc:     'El final más clásico. Arrincona al rey enemigo.',
    goal:     'Mata en 3 movimientos',
    fen:      '8/8/8/8/8/2k5/8/1RK5 w - - 0 1',
    solution: ['b1b3','c3d4','b3b8','d4e4','b8e8'],
    hint:     'b1',
  },
  {
    id:       'back-rank',
    name:     'Mate en la Última Fila',
    emoji:    '⚔️',
    desc:     'El rey enemigo está atrapado. Un movimiento lo mata.',
    goal:     'Mata en 1 movimiento',
    fen:      '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
    solution: ['a1a8'],
    hint:     'a1',
  },
];

// ════════════════════════════════════════════════════════════════
//  ESTADO
// ════════════════════════════════════════════════════════════════
const KEY_COMPLETED = 'chess_puzzles_done';

export function getPuzzlesCompleted() {
  try { return JSON.parse(localStorage.getItem(KEY_COMPLETED)) || []; }
  catch { return []; }
}
function markPuzzleCompleted(id) {
  const done = getPuzzlesCompleted();
  if (!done.includes(id)) {
    done.push(id);
    localStorage.setItem(KEY_COMPLETED, JSON.stringify(done));
  }
}

let puzzleChess   = null;
let currentPuzzle = null;
let puzzleSel     = [];
let puzzleTargets = [];
let puzzleStep    = 0;
let hintLevel     = 0;   // 0=sin pista, 1=origen, 2=destino
let solutionPlaying = false;

// ════════════════════════════════════════════════════════════════
//  RENDERIZAR TABLERO
// ════════════════════════════════════════════════════════════════
function renderPuzzleBoard() {
  const board = document.getElementById('puzzle-board');
  if (!board) return;
  board.innerHTML = '';

  const FILLED = { k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟' };
  const pos    = puzzleChess.board();

  const hintFrom = hintLevel >= 1 ? currentPuzzle.hint : null;
  const hintTo   = hintLevel >= 2 ? currentPuzzle.solution[puzzleStep].slice(2,4) : null;

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq    = String.fromCharCode(97 + f) + (8 - r);
      const piece = pos[r][f];
      const light = (r + f) % 2 === 1;

      const div = document.createElement('div');
      div.className = 'square ' + (light ? 'light' : 'dark');

      if (sq === hintFrom) div.classList.add('hint-from');
      if (sq === hintTo)   div.classList.add('hint-to');
      if (puzzleSel.includes(sq))     div.classList.add('selected');
      if (puzzleTargets.includes(sq)) div.classList.add(piece ? 'legal-capture' : 'legal');

      if (piece) {
        const span = document.createElement('span');
        span.className   = 'piece-unicode';
        span.textContent = FILLED[piece.type] || '?';
        span.style.color      = piece.color === 'w' ? '#ffffff' : '#1a0a00';
        span.style.textShadow = piece.color === 'w'
          ? '0 1px 6px rgba(0,0,0,0.8)'
          : '0 1px 3px rgba(255,255,255,0.15)';
        div.appendChild(span);
      }

      div.addEventListener('click', () => onPuzzleClick(sq));
      board.appendChild(div);
    }
  }
}

// ════════════════════════════════════════════════════════════════
//  CLICK EN TABLERO
// ════════════════════════════════════════════════════════════════
function onPuzzleClick(sq) {
  if (!currentPuzzle || solutionPlaying) return;
  if (puzzleStep >= currentPuzzle.solution.length) return;

  const piece = puzzleChess.get(sq);

  if (!puzzleSel.length) {
    if (!piece || piece.color !== puzzleChess.turn()) return;
    puzzleSel     = [sq];
    puzzleTargets = puzzleChess.moves({ square: sq, verbose: true }).map(m => m.to);
    renderPuzzleBoard();
    return;
  }

  const from     = puzzleSel[0];
  const expected = currentPuzzle.solution[puzzleStep];
  const played   = from + sq;

  puzzleSel     = [];
  puzzleTargets = [];

  if (played !== expected) {
    showPuzzleMsg('❌ Movimiento incorrecto. Inténtalo de nuevo.', 'error');
    renderPuzzleBoard();
    return;
  }

  // Movimiento correcto
  hintLevel = 0;
  puzzleChess.move({ from, to: sq, promotion: 'q' });
  puzzleStep++;
  renderPuzzleBoard();

  if (puzzleStep >= currentPuzzle.solution.length) {
    markPuzzleCompleted(currentPuzzle.id);
    showPuzzleMsg('🏆 ¡Reto completado!', 'win');
    document.getElementById('puzzle-next-btn').classList.remove('hidden');
    document.getElementById('puzzle-hint-btn').classList.add('hidden');
    document.getElementById('puzzle-solution-btn').classList.add('hidden');
    renderPuzzleList();
    return;
  }

  showPuzzleMsg('✓ Correcto. Sigue...', 'ok');
}

// ════════════════════════════════════════════════════════════════
//  PISTA
// ════════════════════════════════════════════════════════════════
function showHint() {
  if (hintLevel < 2) hintLevel++;
  if (hintLevel === 1) showPuzzleMsg('💡 Pista: mueve la pieza resaltada.', 'info');
  if (hintLevel === 2) showPuzzleMsg('💡 Pista completa: origen y destino marcados.', 'info');
  renderPuzzleBoard();
}

// ════════════════════════════════════════════════════════════════
//  VER SOLUCIÓN ANIMADA
// ════════════════════════════════════════════════════════════════
function playSolution() {
  if (solutionPlaying) return;
  solutionPlaying = true;
  hintLevel = 0;
  puzzleChess.load(currentPuzzle.fen);
  puzzleStep = 0;
  renderPuzzleBoard();

  const moves = currentPuzzle.solution;
  let i = 0;

  function next() {
    if (i >= moves.length) {
      solutionPlaying = false;
      showPuzzleMsg('👁 Solución completada. ¿Lo intentas tú?', 'info');
      document.getElementById('puzzle-retry-btn').classList.remove('hidden');
      return;
    }
    const mv = moves[i++];
    puzzleChess.move({ from: mv.slice(0,2), to: mv.slice(2,4), promotion: 'q' });
    renderPuzzleBoard();
    setTimeout(next, 900);
  }

  showPuzzleMsg('▶ Viendo la solución...', 'info');
  setTimeout(next, 600);
}

// ════════════════════════════════════════════════════════════════
//  MENSAJES
// ════════════════════════════════════════════════════════════════
function showPuzzleMsg(text, type) {
  const el = document.getElementById('puzzle-hint');
  if (!el) return;
  el.textContent = text;
  el.className   = 'practice-hint hint-' + type;
}

// ════════════════════════════════════════════════════════════════
//  INICIAR UN RETO
// ════════════════════════════════════════════════════════════════
function startPuzzle(puzzle) {
  currentPuzzle   = puzzle;
  puzzleChess     = new Chess(puzzle.fen);
  puzzleStep      = 0;
  puzzleSel       = [];
  puzzleTargets   = [];
  hintLevel       = 0;
  solutionPlaying = false;

  document.getElementById('puzzle-title').textContent  = puzzle.emoji + '  ' + puzzle.name;
  document.getElementById('puzzle-goal').textContent   = puzzle.goal;
  document.getElementById('puzzle-hint').textContent   = '▶  ' + puzzle.desc;
  document.getElementById('puzzle-hint').className     = 'practice-hint hint-info';
  document.getElementById('puzzle-next-btn').classList.add('hidden');
  document.getElementById('puzzle-retry-btn').classList.add('hidden');
  document.getElementById('puzzle-hint-btn').classList.remove('hidden');
  document.getElementById('puzzle-solution-btn').classList.remove('hidden');

  document.getElementById('screen-puzzles-list').classList.add('hidden');
  document.getElementById('screen-puzzles-board').classList.remove('hidden');

  renderPuzzleBoard();
}

// ════════════════════════════════════════════════════════════════
//  LISTA DE RETOS
// ════════════════════════════════════════════════════════════════
function renderPuzzleList() {
  const list = document.getElementById('puzzles-list');
  const done = getPuzzlesCompleted();
  list.innerHTML = '';

  PUZZLES.forEach(p => {
    const completed = done.includes(p.id);
    const btn = document.createElement('button');
    btn.className = 'opening-item' + (completed ? ' opening-done' : '');
    btn.innerHTML =
      '<span class="opening-emoji">' + p.emoji + '</span>' +
      '<div class="opening-info">' +
        '<span class="opening-name">' + p.name + '</span>' +
        '<span class="opening-desc">' + p.goal + '</span>' +
      '</div>' +
      (completed ? '<span class="opening-check">✓</span>' : '<span class="opening-arrow">›</span>');
    btn.addEventListener('click', () => startPuzzle(p));
    list.appendChild(btn);
  });
}

// ════════════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════════════
export function initPuzzles() {
  document.getElementById('btn-puzzles').addEventListener('click', () => {
    renderPuzzleList();
    document.getElementById('screen-menu').classList.add('hidden');
    document.getElementById('screen-puzzles').classList.remove('hidden');
    document.getElementById('screen-puzzles-list').classList.remove('hidden');
    document.getElementById('screen-puzzles-board').classList.add('hidden');
  });

  document.getElementById('btn-puzzles-back').addEventListener('click', () => {
    document.getElementById('screen-puzzles').classList.add('hidden');
    document.getElementById('screen-menu').classList.remove('hidden');
  });

  document.getElementById('btn-puzzle-back').addEventListener('click', () => {
    solutionPlaying = false;
    document.getElementById('screen-puzzles-board').classList.add('hidden');
    document.getElementById('screen-puzzles-list').classList.remove('hidden');
    renderPuzzleList();
  });

  document.getElementById('btn-puzzle-retry').addEventListener('click', () => {
    if (currentPuzzle) startPuzzle(currentPuzzle);
  });

  document.getElementById('puzzle-retry-btn').addEventListener('click', () => {
    if (currentPuzzle) startPuzzle(currentPuzzle);
  });

  document.getElementById('puzzle-hint-btn').addEventListener('click', showHint);
  document.getElementById('puzzle-solution-btn').addEventListener('click', playSolution);

  document.getElementById('puzzle-next-btn').addEventListener('click', () => {
    currentPuzzle = null;
    document.getElementById('screen-puzzles-board').classList.add('hidden');
    document.getElementById('screen-puzzles-list').classList.remove('hidden');
    renderPuzzleList();
  });
}