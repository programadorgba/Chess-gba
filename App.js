/**
 * app.js
 * Lógica principal: VS IA (Stockfish) + Multijugador (Firebase)
 */
import { Chess } from './chess.min.js';
import { INITIAL_IDENTITIES, PIECE_LORE, pieceImagePath, pieceUnicode } from './Lore.js';
import { initEngine, getBestMove, destroyEngine }                        from './Engine.js';
import { getCurrentDepth, levelUp }                                      from './Progesion.js';

// ── Configuración Firebase (solo se usa en modo multijugador) ──────────
const firebaseConfig = {
  apiKey:            'TU_API_KEY',
  authDomain:        'TU_PROJECT.firebaseapp.com',
  databaseURL:       'https://TU_PROJECT-default-rtdb.firebaseio.com',
  projectId:         'TU_PROJECT',
  storageBucket:     'TU_PROJECT.appspot.com',
  messagingSenderId: 'TU_SENDER_ID',
  appId:             'TU_APP_ID',
};

let db        = null;
let fbRef     = null;
let fbSet     = null;
let fbOnValue = null;

async function ensureFirebase() {
  if (db) return true;
  try {
    const { initializeApp }                  = await import('https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js');
    const { getDatabase, ref, set, onValue } = await import('https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js');
    const app = initializeApp(firebaseConfig);
    db        = getDatabase(app);
    fbRef     = ref;
    fbSet     = set;
    fbOnValue = onValue;
    return true;
  } catch (e) {
    alert('Error conectando con Firebase. Revisa la configuracion en app.js.');
    return false;
  }
}

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
let fbUnsub      = null;
let isLocalUpd   = false;

// ════════════════════════════════════════════════════════════════
//  DOM
// ════════════════════════════════════════════════════════════════
const screenMenu  = document.getElementById('screen-menu');
const screenGame  = document.getElementById('screen-game');
const boardEl     = document.getElementById('board');
const turnInfoEl  = document.getElementById('turn-info');
const loreEmpty   = document.getElementById('lore-empty');
const loreContent = document.getElementById('lore-content');
const loreAvatar  = document.getElementById('lore-avatar');
const loreName    = document.getElementById('lore-name');
const loreDesc    = document.getElementById('lore-desc');
const thinkingEl  = document.getElementById('thinking-indicator');
const codeBox     = document.getElementById('game-code-display');
const codeText    = document.getElementById('game-code-text');
const modalEl     = document.getElementById('modal-overlay');
const modalAvatar = document.getElementById('modal-avatar');

// ════════════════════════════════════════════════════════════════
//  BOTONES
// ════════════════════════════════════════════════════════════════
document.getElementById('btn-vs-ai').addEventListener('click',   startAiGame);
document.getElementById('btn-create').addEventListener('click',  createGame);
document.getElementById('btn-join').addEventListener('click',    joinGame);
document.getElementById('btn-back').addEventListener('click',    goMenu);
document.getElementById('btn-share').addEventListener('click',   shareCode);
document.getElementById('btn-modal-continue').addEventListener('click', goMenu);

// ════════════════════════════════════════════════════════════════
//  NAVEGACIÓN
// ════════════════════════════════════════════════════════════════
function showGame() {
  screenMenu.classList.add('hidden');
  screenGame.classList.remove('hidden');
}

function goMenu() {
  if (fbUnsub) { fbUnsub(); fbUnsub = null; }
  destroyEngine();
  modalEl.classList.add('hidden');
  screenGame.classList.add('hidden');
  screenMenu.classList.remove('hidden');
  document.getElementById('join-input').value = '';
}

// ════════════════════════════════════════════════════════════════
//  CREAR INSTANCIA CHESS — window.Chess cargado como script normal
// ════════════════════════════════════════════════════════════════
function newChess(fen) {
  try {
    return fen ? new Chess(fen) : new Chess();
  } catch (e) {
    alert('Error cargando chess.min.js');
    return null;
  }
}

// ════════════════════════════════════════════════════════════════
//  RESET
// ════════════════════════════════════════════════════════════════
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
//  INICIAR PARTIDA VS IA
// ════════════════════════════════════════════════════════════════
function startAiGame() {
  resetState();
  if (!chess) return;

  isAiEnabled = true;
  gameId      = null;
  codeBox.classList.add('hidden');

  showGame();
  renderBoard();
  updateTurnInfo();

  initEngine().catch(() => {});
}

// ════════════════════════════════════════════════════════════════
//  MULTIJUGADOR — Crear
// ════════════════════════════════════════════════════════════════
async function createGame() {
  const ok = await ensureFirebase();
  if (!ok) return;

  resetState();
  if (!chess) return;

  isAiEnabled          = false;
  gameId               = Math.random().toString(36).substring(2, 7).toUpperCase();
  codeText.textContent = gameId;
  codeBox.classList.remove('hidden');

  showGame();
  renderBoard();
  updateTurnInfo();
  pushFirebase();
  subscribeFirebase();
}

// ════════════════════════════════════════════════════════════════
//  MULTIJUGADOR — Unirse
// ════════════════════════════════════════════════════════════════
async function joinGame() {
  const code = document.getElementById('join-input').value.trim().toUpperCase();
  if (code.length < 4) return;

  const ok = await ensureFirebase();
  if (!ok) return;

  resetState();
  if (!chess) return;

  isAiEnabled          = false;
  gameId               = code;
  codeText.textContent = gameId;
  codeBox.classList.remove('hidden');

  showGame();
  subscribeFirebase();
}

// ════════════════════════════════════════════════════════════════
//  FIREBASE
// ════════════════════════════════════════════════════════════════
function pushFirebase() {
  if (!gameId || !db) return;
  isLocalUpd = true;
  fbSet(fbRef(db, `games/${gameId}`), {
    fen:        chess.fen(),
    identities: identities,
    updatedAt:  Date.now(),
  });
}

function subscribeFirebase() {
  if (!gameId || !db) return;
  const unsub = fbOnValue(fbRef(db, `games/${gameId}`), (snap) => {
    const data = snap.val();
    if (!data) return;
    if (isLocalUpd) { isLocalUpd = false; return; }

    chess        = newChess(data.fen);
    identities   = data.identities || {};
    selectedSq   = null;
    legalTargets = [];
    lastMove     = null;

    renderBoard();
    updateTurnInfo();
    checkEndGame();
  });
  fbUnsub = unsub;
}

// ════════════════════════════════════════════════════════════════
//  CLICK EN CASILLA
// ════════════════════════════════════════════════════════════════
function onSquareClick(sq) {
  const piece = chess.get(sq);
  const id    = identities[sq];

  // Mostrar lore de cualquier pieza tocada
  if (id) showLore(id);

  if (chess.game_over()) return;
  if (isAiEnabled && chess.turn() === 'b') return;

  if (!selectedSq) {
    if (!piece) return;
    if (isAiEnabled  && piece.color !== 'w')          return;
    if (!isAiEnabled && piece.color !== chess.turn()) return;
    selectedSq   = sq;
    legalTargets = chess.moves({ square: sq, verbose: true }).map(m => m.to);
    renderBoard();
    return;
  }

  if (selectedSq === sq) {
    selectedSq   = null;
    legalTargets = [];
    renderBoard();
    return;
  }

  const from   = selectedSq;
  selectedSq   = null;
  legalTargets = [];

  const move = chess.move({ from, to: sq, promotion: 'q' });

  if (!move) {
    if (piece && (isAiEnabled ? piece.color === 'w' : piece.color === chess.turn())) {
      selectedSq   = sq;
      legalTargets = chess.moves({ square: sq, verbose: true }).map(m => m.to);
    }
    renderBoard();
    return;
  }

  applyMove(move);
  if (!isAiEnabled) pushFirebase();
  if (isAiEnabled && !chess.game_over() && chess.turn() === 'b') doAiMove();
}

// ════════════════════════════════════════════════════════════════
//  APLICAR MOVIMIENTO
// ════════════════════════════════════════════════════════════════
function applyMove(move) {
  if (move.flags.includes('e')) delete identities[move.to[0] + move.from[1]];
  if (move.captured)            delete identities[move.to];

  identities[move.to] = identities[move.from];
  delete identities[move.from];

  if (move.flags.includes('k')) {
    const rf = move.color === 'w' ? 'h1' : 'h8';
    const rt = move.color === 'w' ? 'f1' : 'f8';
    identities[rt] = identities[rf];
    delete identities[rf];
  }
  if (move.flags.includes('q')) {
    const rf = move.color === 'w' ? 'a1' : 'a8';
    const rt = move.color === 'w' ? 'd1' : 'd8';
    identities[rt] = identities[rf];
    delete identities[rf];
  }

  lastMove = { from: move.from, to: move.to };
  if (identities[move.to]) showLore(identities[move.to]);

  renderBoard();
  updateTurnInfo();
  checkEndGame();
}

// ════════════════════════════════════════════════════════════════
//  TURNO IA
// ════════════════════════════════════════════════════════════════
function doAiMove() {
  thinkingEl.classList.remove('hidden');
  getBestMove(chess.fen(), getCurrentDepth(), (uci) => {
    thinkingEl.classList.add('hidden');
    if (!uci) {
      const moves = chess.moves({ verbose: true });
      if (!moves.length) return;
      const m = chess.move(moves[Math.floor(Math.random() * moves.length)]);
      if (m) applyMove(m);
      return;
    }
    const m = chess.move({ from: uci.slice(0,2), to: uci.slice(2,4), promotion: uci[4] || 'q' });
    if (m) applyMove(m);
  });
}

// ════════════════════════════════════════════════════════════════
//  RENDERIZAR TABLERO
//  — Las piezas se muestran como iconos unicode, no como imágenes
//  — La imagen del personaje solo aparece en la lore card inferior
// ════════════════════════════════════════════════════════════════
function renderBoard() {
  boardEl.innerHTML = '';
  const board = chess.board();

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

      // ── ICONO UNICODE — símbolos rellenos para ambos colores ──
      if (piece) {
        // Usamos siempre los símbolos negros (rellenos) ♚♛♜♝♞♟
        // y los coloreamos con CSS para blancos/negros
        const FILLED = {
          k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟'
        };
        const span = document.createElement('span');
        span.className   = 'piece-unicode';
        span.textContent = FILLED[piece.type] || '?';

        if (piece.color === 'w') {
          span.style.color      = '#ffffff';
          span.style.textShadow = '0 0 2px #000, 0 0 4px #000, 1px 1px 3px #000, -1px -1px 3px #000';
          span.style.filter     = 'drop-shadow(0 2px 3px rgba(0,0,0,0.8))';
        } else {
          span.style.color      = '#1a0a00';
          span.style.textShadow = '0 1px 3px rgba(255,255,255,0.2)';
        }
        div.appendChild(span);
      }

      div.addEventListener('click', () => onSquareClick(sq));
      boardEl.appendChild(div);
    }
  }
}

// ════════════════════════════════════════════════════════════════
//  INFO TURNO
// ════════════════════════════════════════════════════════════════
function updateTurnInfo() {
  if      (chess.in_checkmate())                turnInfoEl.textContent = 'JAQUE MATE!';
  else if (chess.in_draw())                     turnInfoEl.textContent = 'TABLAS';
  else if (chess.in_check())                    turnInfoEl.textContent = 'JAQUE!';
  else if (isAiEnabled && chess.turn() === 'b') turnInfoEl.textContent = 'Juega la IA...';
  else if (chess.turn() === 'w')                turnInfoEl.textContent = 'Turno: Juegan BLANCAS';
  else                                          turnInfoEl.textContent = 'Turno: Juegan NEGRAS';
}

// ════════════════════════════════════════════════════════════════
//  LORE CARD — imagen del personaje + descripción al tocar pieza
// ════════════════════════════════════════════════════════════════
function showLore(id) {
  const lore = PIECE_LORE[id];
  if (!lore) return;

  // Imagen del personaje con fallback unicode si no carga
  const parts   = id.split('_');             // ['w','p','e2']
  const FILLED  = { k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟' };
  const symbol  = FILLED[parts[1]] || '?';

  loreAvatar.style.display  = 'block';
  loreAvatar.style.fontSize = '';
  loreAvatar.src            = pieceImagePath(id);
  loreAvatar.onerror        = function() {
    // Si no hay imagen, mostrar símbolo unicode grande en su lugar
    this.style.display = 'none';
    let fallback = document.getElementById('lore-avatar-fallback');
    if (!fallback) {
      fallback = document.createElement('span');
      fallback.id        = 'lore-avatar-fallback';
      fallback.className = 'lore-avatar-fallback';
      this.parentNode.insertBefore(fallback, this);
    }
    fallback.textContent   = symbol;
    fallback.style.display = 'flex';
  };
  // Si la imagen carga bien, ocultar el fallback si existiera
  loreAvatar.onload = function() {
    const fallback = document.getElementById('lore-avatar-fallback');
    if (fallback) fallback.style.display = 'none';
    this.style.display = 'block';
  };

  loreName.textContent = lore.name.toUpperCase();
  loreDesc.textContent = lore.description;
  loreEmpty.classList.add('hidden');
  loreContent.classList.remove('hidden');
}

// ════════════════════════════════════════════════════════════════
//  FIN DE PARTIDA
// ════════════════════════════════════════════════════════════════
const VICTORY_QUOTES = {
  q: ['El tablero era mio desde el primer movimiento.', 'Nadie puede detener mi alcance.'],
  r: ['Las columnas abiertas son mi reino.', 'Una torre no cede. Una torre aplasta.'],
  n: ['Salte donde nadie me esperaba.', 'La sorpresa es la mejor armadura.'],
  b: ['Vi el camino diagonal desde el principio.', 'Las diagonales no mienten.'],
  p: ['Me subestimaste por ser el mas pequeno. Error fatal.', 'Los humildes tambien alcanzan la gloria.'],
  k: ['Mi supervivencia era la unica victoria.', 'El rey resiste, y asi gana.'],
};
const DRAW_QUOTES = ['Ni la luz ni la sombra dominan hoy.', 'El tablero nos juzgo iguales. Por ahora.'];

function checkEndGame() {
  if (!chess.game_over()) return;

  const lastId    = lastMove ? identities[lastMove.to] : null;
  const lore      = lastId ? PIECE_LORE[lastId] : null;
  const pieceType = lastId ? lastId.split('_')[1] : null;
  const wrapEl    = modalAvatar.parentElement;

  if (lastId) {
    modalAvatar.src           = `img/${lastId}.png`;
    modalAvatar.style.display = 'block';
    modalAvatar.onerror       = null;
    modalAvatar.onload        = null;
    wrapEl.style.display      = 'flex';
  } else {
    wrapEl.style.display = 'none';
  }

  const labelEl    = document.getElementById('modal-result-label');
  const charNameEl = document.getElementById('modal-char-name');
  const quoteEl    = document.getElementById('modal-quote');
  const sideEl     = document.getElementById('modal-side');

  if (chess.in_checkmate()) {
    const win = chess.turn() === 'b' ? 'w' : 'b';
    if (isAiEnabled && win === 'w') levelUp();
    labelEl.textContent    = isAiEnabled ? (win === 'w' ? 'VICTORIA' : 'DERROTA') : 'JAQUE MATE!';
    labelEl.className      = 'modal-result-label ' + (win === 'w' ? 'victory' : 'defeat');
    charNameEl.textContent = lore ? lore.name.toUpperCase() : '-';
    const q = VICTORY_QUOTES[pieceType] || VICTORY_QUOTES['p'];
    quoteEl.textContent    = q[Math.floor(Math.random() * q.length)];
    sideEl.textContent     = win === 'w' ? 'Ganan blancas' : (isAiEnabled ? 'IA' : 'Ganan negras');
  } else if (chess.in_draw()) {
    labelEl.textContent    = 'TABLAS';
    labelEl.className      = 'modal-result-label draw';
    charNameEl.textContent = 'El tablero habla';
    quoteEl.textContent    = DRAW_QUOTES[Math.floor(Math.random() * DRAW_QUOTES.length)];
    sideEl.textContent     = 'Ningun bando domina';
    wrapEl.style.display   = 'none';
  }

  modalEl.classList.remove('hidden');
}

// ════════════════════════════════════════════════════════════════
//  COMPARTIR CODIGO
// ════════════════════════════════════════════════════════════════
function shareCode() {
  if (!gameId) return;
  const text = `Juega conmigo! Codigo: ${gameId}`;
  if (navigator.share) navigator.share({ title: 'CHESS', text }).catch(() => {});
  else navigator.clipboard.writeText(text).then(() => alert('Codigo copiado: ' + gameId));
}