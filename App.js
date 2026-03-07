/**
 * App.js
 * Lógica del juego: tablero, IA, P2P.
 * UI → UI.js | Camino del Caballero → Path.js
 */
import { Chess }                                                    from './chess.min.js';
import { INITIAL_IDENTITIES }                                       from './Lore.js';
import { initEngine, getBestMove, destroyEngine }                   from './Engine.js';
import { getCurrentDepth, getCurrentSkill, getLevel }               from './Progesion.js';
import { updateTurnInfo, showLore, checkEndGame }                   from './UI.js';
import { initPath }                                                 from './Path.js';

// ════════════════════════════════════════════════════════════════
//  ESTADO
// ════════════════════════════════════════════════════════════════
let chess        = null;
let identities   = {};
let selectedSq   = null;
let legalTargets = [];
let lastMove     = null;
let isAiEnabled  = false;
let gameId       = null;

// ── PeerJS ──────────────────────────────────────────────────────
let peer    = null;
let conn    = null;
let myColor = null;

// ════════════════════════════════════════════════════════════════
//  DOM
// ════════════════════════════════════════════════════════════════
const screenMenu  = document.getElementById('screen-menu');
const screenGame  = document.getElementById('screen-game');
const boardEl     = document.getElementById('board');
const turnInfoEl  = document.getElementById('turn-info');
const loreEmpty   = document.getElementById('lore-empty');
const loreContent = document.getElementById('lore-content');
const thinkingEl  = document.getElementById('thinking-indicator');
const codeBox     = document.getElementById('game-code-display');
const codeText    = document.getElementById('game-code-text');
const modalEl     = document.getElementById('modal-overlay');

// ════════════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════════════
initPath();

// ════════════════════════════════════════════════════════════════
//  BOTONES
// ════════════════════════════════════════════════════════════════
document.getElementById('btn-vs-ai').addEventListener('click',          startAiGame);
document.getElementById('btn-create').addEventListener('click',         createGame);
document.getElementById('btn-join').addEventListener('click',           joinGame);
document.getElementById('btn-back').addEventListener('click',           goMenu);
document.getElementById('btn-share').addEventListener('click',          shareCode);
document.getElementById('btn-modal-continue').addEventListener('click', goMenu);

// ════════════════════════════════════════════════════════════════
//  NAVEGACIÓN
// ════════════════════════════════════════════════════════════════
function showGame() {
  screenMenu.classList.add('hidden');
  screenGame.classList.remove('hidden');
}

function goMenu() {
  if (conn) { conn.close();   conn  = null; }
  if (peer) { peer.destroy(); peer  = null; }
  myColor = null;
  gameId  = null;

  document.getElementById('level-display').classList.add('hidden');
  destroyEngine();
  modalEl.classList.add('hidden');
  screenGame.classList.add('hidden');
  screenMenu.classList.remove('hidden');
  document.getElementById('join-input').value = '';
}

// ════════════════════════════════════════════════════════════════
//  CHESS
// ════════════════════════════════════════════════════════════════
function newChess() {
  try   { return new Chess(); }
  catch { alert('Error cargando chess.min.js'); return null; }
}

function resetState() {
  chess        = newChess();
  identities   = { ...INITIAL_IDENTITIES };
  selectedSq   = null;
  legalTargets = [];
  lastMove     = null;
  loreEmpty.classList.remove('hidden');
  loreContent.classList.add('hidden');
}

// ════════════════════════════════════════════════════════════════
//  VS IA
// ════════════════════════════════════════════════════════════════
function startAiGame() {
  resetState();
  if (!chess) return;
  isAiEnabled = true;
  gameId      = null;
  myColor     = 'w';
  codeBox.classList.add('hidden');

  document.getElementById('level-display').classList.remove('hidden');
  document.getElementById('level-value').textContent = getLevel();

  showGame();
  renderBoard();
  updateTurnInfo(chess, isAiEnabled);
  initEngine().catch(() => {});
}

// ════════════════════════════════════════════════════════════════
//  MULTIJUGADOR — Crear sala
// ════════════════════════════════════════════════════════════════
function createGame() {
  if (!window.Peer) {
    alert('peerjs.min.js no encontrado.\nDescárgalo y ponlo junto a index.html.');
    return;
  }
  resetState();
  if (!chess) return;

  isAiEnabled = false;
  myColor     = 'w';
  gameId      = Math.random().toString(36).substring(2, 7).toUpperCase();
  peer        = new Peer(gameId);

  peer.on('error', e => alert('Error PeerJS: ' + e.message));
  peer.on('open', id => {
    codeText.textContent = id;
    codeBox.classList.remove('hidden');
    showGame();
    renderBoard();
    turnInfoEl.textContent = 'Esperando oponente...';
  });
  peer.on('connection', c => {
    conn = c;
    setupConnection();
    turnInfoEl.textContent = '¡Oponente conectado! Turno: BLANCAS';
  });
}

// ════════════════════════════════════════════════════════════════
//  MULTIJUGADOR — Unirse a sala
// ════════════════════════════════════════════════════════════════
function joinGame() {
  const code = document.getElementById('join-input').value.trim().toUpperCase();
  if (code.length < 4) return;

  if (!window.Peer) {
    alert('peerjs.min.js no encontrado.\nDescárgalo y ponlo junto a index.html.');
    return;
  }
  resetState();
  if (!chess) return;

  isAiEnabled = false;
  myColor     = 'b';
  gameId      = code;
  peer        = new Peer();

  peer.on('error', e => alert('Error PeerJS: ' + e.message));
  peer.on('open', () => {
    conn = peer.connect(code);
    setupConnection();
    codeText.textContent = code;
    codeBox.classList.remove('hidden');
    showGame();
    renderBoard();
    turnInfoEl.textContent = 'Conectando...';
  });
}

// ════════════════════════════════════════════════════════════════
//  PEERJS — listeners
// ════════════════════════════════════════════════════════════════
function setupConnection() {
  conn.on('open',  () => updateTurnInfo(chess, isAiEnabled));
  conn.on('close', () => { turnInfoEl.textContent = 'Oponente desconectado.'; });
  conn.on('error', e => console.error('[P2P]', e));
  conn.on('data',  data => {
    if (data.type !== 'move') return;
    const move = chess.move({ from: data.from, to: data.to, promotion: data.promotion || 'q' });
    if (move) applyMove(move, false);
  });
}

// ════════════════════════════════════════════════════════════════
//  CLICK EN CASILLA
// ════════════════════════════════════════════════════════════════
function onSquareClick(sq) {
  const piece = chess.get(sq);
  const id    = identities[sq];

  if (id) showLore(id);
  if (chess.game_over()) return;
  if (isAiEnabled && chess.turn() === 'b') return;
  if (!isAiEnabled && myColor && chess.turn() !== myColor) return;

  if (!selectedSq) {
    if (!piece || piece.color !== chess.turn()) return;
    selectedSq   = sq;
    legalTargets = chess.moves({ square: sq, verbose: true }).map(m => m.to);
    renderBoard();
    return;
  }

  if (selectedSq === sq) {
    selectedSq = null; legalTargets = []; renderBoard(); return;
  }

  const from = selectedSq;
  selectedSq = null; legalTargets = [];

  const move = chess.move({ from, to: sq, promotion: 'q' });
  if (!move) {
    if (piece && piece.color === chess.turn()) {
      selectedSq   = sq;
      legalTargets = chess.moves({ square: sq, verbose: true }).map(m => m.to);
    }
    renderBoard();
    return;
  }

  applyMove(move, true);
  if (isAiEnabled && !chess.game_over() && chess.turn() === 'b') doAiMove();
}

// ════════════════════════════════════════════════════════════════
//  APLICAR MOVIMIENTO
// ════════════════════════════════════════════════════════════════
function applyMove(move, send = false) {
  if (move.flags.includes('e')) delete identities[move.to[0] + move.from[1]];
  if (move.captured)            delete identities[move.to];

  identities[move.to] = identities[move.from];
  delete identities[move.from];

  if (move.flags.includes('k')) {
    const rf = move.color === 'w' ? 'h1' : 'h8';
    const rt = move.color === 'w' ? 'f1' : 'f8';
    identities[rt] = identities[rf]; delete identities[rf];
  }
  if (move.flags.includes('q')) {
    const rf = move.color === 'w' ? 'a1' : 'a8';
    const rt = move.color === 'w' ? 'd1' : 'd8';
    identities[rt] = identities[rf]; delete identities[rf];
  }

  lastMove = { from: move.from, to: move.to };
  if (identities[move.to]) showLore(identities[move.to]);

  if (send && conn && conn.open) {
    conn.send({ type: 'move', from: move.from, to: move.to, promotion: move.promotion || 'q' });
  }

  renderBoard();
  updateTurnInfo(chess, isAiEnabled);
  setTimeout(() => checkEndGame(chess, identities, lastMove, isAiEnabled), 1500);
}

// ════════════════════════════════════════════════════════════════
//  TURNO IA
// ════════════════════════════════════════════════════════════════
function doAiMove() {
  thinkingEl.classList.remove('hidden');
  getBestMove(chess.fen(), getCurrentDepth(), getCurrentSkill(), uci => {
    setTimeout(() => {
      thinkingEl.classList.add('hidden');
      if (!uci) {
        const moves = chess.moves({ verbose: true });
        if (!moves.length) return;
        const m = chess.move(moves[Math.floor(Math.random() * moves.length)]);
        if (m) applyMove(m, false);
        return;
      }
      const m = chess.move({ from: uci.slice(0,2), to: uci.slice(2,4), promotion: uci[4] || 'q' });
      if (m) applyMove(m, false);
    }, 700);
  });
}

// ════════════════════════════════════════════════════════════════
//  RENDERIZAR TABLERO
// ════════════════════════════════════════════════════════════════
function renderBoard() {
  boardEl.innerHTML = '';
  const board = chess.board();

  if (myColor === 'b') boardEl.classList.add('flipped');
  else                 boardEl.classList.remove('flipped');

  let checkSq = null;
  if (chess.in_check()) {
    const t = chess.turn();
    outer: for (let r = 0; r < 8; r++)
      for (let f = 0; f < 8; f++) {
        const p = board[r][f];
        if (p && p.type === 'k' && p.color === t) {
          checkSq = String.fromCharCode(97 + f) + (8 - r);
          break outer;
        }
      }
  }

  const FILLED = { k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟' };

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq    = String.fromCharCode(97 + f) + (8 - r);
      const piece = board[r][f];
      const light = (r + f) % 2 === 1;

      const div = document.createElement('div');
      div.className = 'square ' + (light ? 'light' : 'dark');
      if (sq === selectedSq)  div.classList.add('selected');
      if (sq === checkSq)     div.classList.add('in-check');
      if (lastMove && (sq === lastMove.from || sq === lastMove.to)) div.classList.add('last-move');
      if (legalTargets.includes(sq)) div.classList.add(piece ? 'legal-capture' : 'legal');

      if (piece) {
        const span = document.createElement('span');
        span.className   = 'piece-unicode';
        span.textContent = FILLED[piece.type] || '?';
        if (piece.color === 'w') {
          span.style.color      = '#ffffff';
          span.style.textShadow = '0 1px 6px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.6)';
        } else {
          span.style.color      = '#1a0a00';
          span.style.textShadow = '0 1px 3px rgba(255,255,255,0.15)';
        }
        div.appendChild(span);
      }

      div.addEventListener('click', () => onSquareClick(sq));
      boardEl.appendChild(div);
    }
  }
}

// ════════════════════════════════════════════════════════════════
//  COMPARTIR CÓDIGO
// ════════════════════════════════════════════════════════════════
function shareCode() {
  if (!gameId) return;
  const text = `Juega conmigo al ajedrez! Codigo de sala: ${gameId}`;
  if (navigator.share) navigator.share({ title: 'CHESS', text }).catch(() => {});
  else navigator.clipboard.writeText(text).then(() => alert('Codigo copiado: ' + gameId));
}