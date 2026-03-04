/**
 * App.js
 * VS IA (Stockfish) + Multijugador P2P (PeerJS — sin base de datos)
 */
import { Chess } from './chess.min.js';
import { INITIAL_IDENTITIES, PIECE_LORE, pieceImagePath, pieceUnicode } from './Lore.js';
import { initEngine, getBestMove, destroyEngine }                        from './Engine.js';
import { getCurrentDepth, getLevel, recordWin, recordLoss, getStreak } from './Progesion.js';

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
let peer       = null;   // instancia Peer local
let conn       = null;   // conexión con el oponente
let myColor    = null;   // 'w' (crea sala) o 'b' (se une)

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
  // Cerrar conexión P2P si existe
  if (conn)  { conn.close();  conn  = null; }
  if (peer)  { peer.destroy(); peer = null; }
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
function newChess(fen) {
  try {
    return fen ? new Chess(fen) : new Chess();
  } catch (e) {
    alert('Error cargando chess.min.js');
    return null;
  }
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

  // Mostrar nivel del motor
  document.getElementById('level-display').classList.remove('hidden');
  document.getElementById('level-value').textContent = getLevel();

  showGame();
  renderBoard();
  updateTurnInfo();
  initEngine().catch(() => {});
}

// ════════════════════════════════════════════════════════════════
//  MULTIJUGADOR — Crear sala
//  El jugador A crea un Peer con ID aleatorio.
//  Ese ID es el código que comparte con el jugador B.
// ════════════════════════════════════════════════════════════════
function createGame() {
  if (!window.Peer) {
    alert('peerjs.min.js no encontrado.\nDescárgalo y ponlo junto a index.html.');
    return;
  }

  resetState();
  if (!chess) return;

  isAiEnabled = false;
  myColor     = 'w';   // quien crea juega con blancas

  // Crear peer con ID corto legible
  gameId = Math.random().toString(36).substring(2, 7).toUpperCase();
  peer   = new Peer(gameId);

  peer.on('error', (e) => alert('Error PeerJS: ' + e.message));

  peer.on('open', (id) => {
    // Peer registrado — mostrar código
    codeText.textContent = id;
    codeBox.classList.remove('hidden');
    showGame();
    renderBoard();
    updateTurnInfo();
    turnInfoEl.textContent = 'Esperando oponente...';
  });

  // Cuando el jugador B se conecte
  peer.on('connection', (c) => {
    conn = c;
    setupConnection();
    turnInfoEl.textContent = '¡Oponente conectado! Turno: BLANCAS';
  });
}

// ════════════════════════════════════════════════════════════════
//  MULTIJUGADOR — Unirse a sala
//  El jugador B introduce el código del jugador A y se conecta.
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
  myColor     = 'b';   // quien se une juega con negras
  gameId      = code;

  peer = new Peer();   // ID aleatorio para B, no necesita ser visible

  peer.on('error', (e) => alert('Error PeerJS: ' + e.message));

  peer.on('open', () => {
    // Conectar con el peer del jugador A usando su código
    conn = peer.connect(code);
    setupConnection();

    codeText.textContent = code;
    codeBox.classList.remove('hidden');
    showGame();
    renderBoard();
    updateTurnInfo();
    turnInfoEl.textContent = 'Conectando...';
  });
}

// ════════════════════════════════════════════════════════════════
//  PEERJS — configurar listeners de la conexión
// ════════════════════════════════════════════════════════════════
function setupConnection() {
  conn.on('open', () => {
    updateTurnInfo();
  });

  // Recibir movimiento del oponente
  conn.on('data', (data) => {
    if (data.type === 'move') {
      const move = chess.move({
        from:      data.from,
        to:        data.to,
        promotion: data.promotion || 'q',
      });
      if (move) {
        applyMove(move, false); // false = no reenviar al oponente
      }
    }
  });

  conn.on('close', () => {
    turnInfoEl.textContent = 'Oponente desconectado.';
  });

  conn.on('error', (e) => {
    console.error('[P2P]', e);
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

  // En modo IA: solo mueve blancas en su turno
  if (isAiEnabled && chess.turn() === 'b') return;

  // En modo P2P: solo mueves tu color en tu turno
  if (!isAiEnabled && myColor && chess.turn() !== myColor) return;

  if (!selectedSq) {
    if (!piece) return;
    if (piece.color !== chess.turn()) return;
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
    if (piece && piece.color === chess.turn()) {
      selectedSq   = sq;
      legalTargets = chess.moves({ square: sq, verbose: true }).map(m => m.to);
    }
    renderBoard();
    return;
  }

  applyMove(move, true); // true = enviar al oponente

  if (isAiEnabled && !chess.game_over() && chess.turn() === 'b') doAiMove();
}

// ════════════════════════════════════════════════════════════════
//  APLICAR MOVIMIENTO
//  send=true → enviar el movimiento al oponente por PeerJS
// ════════════════════════════════════════════════════════════════
function applyMove(move, send = false) {
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

  // Enviar movimiento al oponente si es nuestro turno
  if (send && conn && conn.open) {
    conn.send({
      type:      'move',
      from:      move.from,
      to:        move.to,
      promotion: move.promotion || 'q',
    });
  }

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
    // Delay de 700ms — da tiempo a ver el movimiento anterior
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

  // Girar tablero si el jugador juega con negras
  if (myColor === 'b') {
    boardEl.classList.add('flipped');
  } else {
    boardEl.classList.remove('flipped');
  }

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

      if (piece) {
        const FILLED = { k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟' };
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
//  LORE CARD
// ════════════════════════════════════════════════════════════════
function showLore(id) {
  const lore = PIECE_LORE[id];
  if (!lore) return;

  const parts  = id.split('_');
  const FILLED = { k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟' };
  const symbol = FILLED[parts[1]] || '?';

  loreAvatar.style.display = 'block';
  loreAvatar.src           = pieceImagePath(id);
  loreAvatar.onerror       = function() {
    this.style.display = 'none';
    let fallback = document.getElementById('lore-avatar-fallback');
    if (!fallback) {
      fallback           = document.createElement('span');
      fallback.id        = 'lore-avatar-fallback';
      fallback.className = 'lore-avatar-fallback';
      this.parentNode.insertBefore(fallback, this);
    }
    fallback.textContent   = symbol;
    fallback.style.display = 'flex';
  };
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
    if (isAiEnabled) {
      const streakEl = document.getElementById('modal-streak');
      if (win === 'w') {
        const { leveled, streak } = recordWin();
        document.getElementById('level-value').textContent = getLevel();
        // Mostrar racha en el modal
        if (streak > 0) {
          streakEl.textContent = streak >= 2
            ? '\u26a1 RACHA ' + streak + ' \u2014 \u00a1NIVEL SUBIDO!'
            : '\uD83D\uDD25 ' + streak + ' victoria seguida \u2014 \u00a1una mas para subir!';
          streakEl.classList.remove('hidden');
        } else {
          streakEl.classList.add('hidden');
        }
      } else {
        recordLoss();
        document.getElementById('level-value').textContent = getLevel();
        document.getElementById('modal-streak').classList.add('hidden');
      }
    } else {
      document.getElementById('modal-streak').classList.add('hidden');
    }
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
  const text = `Juega conmigo al ajedrez! Codigo de sala: ${gameId}`;
  if (navigator.share) navigator.share({ title: 'CHESS', text }).catch(() => {});
  else navigator.clipboard.writeText(text).then(() => alert('Codigo copiado: ' + gameId));
}



// ════════════════════════════════════════════════════════════════
//  FIGURA DEL JUGADOR
// ════════════════════════════════════════════════════════════════
const PIECE_KEY     = 'chess_player_piece';
const PIECE_SYMBOLS = { king: '♔', bishop: '♗', knight: '♘' };

function getPlayerPiece() {
  return localStorage.getItem(PIECE_KEY) || null;
}
function savePlayerPiece(p) {
  localStorage.setItem(PIECE_KEY, p);
}

// Selector de figura — botones en el modal
document.querySelectorAll('.piece-option').forEach(btn => {
  btn.addEventListener('click', () => {
    savePlayerPiece(btn.dataset.piece);
    document.getElementById('modal-piece-select').classList.add('hidden');
    showPathScreen();
  });
});

// Cambiar figura desde el camino
document.getElementById('btn-change-piece').addEventListener('click', () => {
  document.getElementById('screen-path').classList.add('hidden');
  document.getElementById('modal-piece-select').classList.remove('hidden');
});

// ════════════════════════════════════════════════════════════════
//  CAMINO DEL CABALLERO
// ════════════════════════════════════════════════════════════════
const PATH_STOPS = [
  { level:1,  name:'Aldea del Alba',        icon:'🏘', desc:'El inicio del viaje.'                    },
  { level:2,  name:'Camino de Tierra',      icon:'🛤', desc:'La primera prueba.'                      },
  { level:3,  name:'Bosque de Sombras',     icon:'🌲', desc:'El enemigo acecha.'                      },
  { level:4,  name:'Rio de Hierro',         icon:'🌊', desc:'Cruzar o perecer.'                       },
  { level:5,  name:'Torre del Vigia',       icon:'🗼', desc:'El horizonte se despeja.'                },
  { level:6,  name:'Campos de Batalla',     icon:'⚔',  desc:'La guerra comienza.'                     },
  { level:7,  name:'Murallas del Reino',    icon:'🏰', desc:'Casi en el corazon.'                     },
  { level:8,  name:'Sala del Consejo',      icon:'📜', desc:'Estrategia y poder.'                     },
  { level:9,  name:'Patio del Castillo',    icon:'🛡', desc:'El trono esta cerca.'                    },
  { level:10, name:'Salon del Trono',       icon:'👑', desc:'Solo los fuertes llegan.'                },
  { level:11, name:'Camara Oscura',         icon:'🌑', desc:'El ultimo guardian.'                     },
  { level:12, name:'El Rey Supremo',        icon:'♞',  desc:'Llegaste. Ahora mantente.'               },
  { level:13, name:'La Prueba del Hierro',  icon:'⚙',  desc:'Cada victoria se gana dos veces.'        },
  { level:14, name:'El Paso Eterno',        icon:'🌫', desc:'Aqui no hay glorias permanentes.'        },
  { level:15, name:'Cumbre de los Caidos',  icon:'🗻', desc:'Los que llegan saben lo que cuesta.'     },
  { level:16, name:'El Vacio Estrategico',  icon:'🕳', desc:'El tablero no perdona la duda.'          },
  { level:17, name:'Sala de los Eternos',   icon:'🕯', desc:'Pocos llegan. Menos permanecen.'         },
  { level:18, name:'El Umbral Oscuro',      icon:'🌒', desc:'La frontera entre dominio y caos.'       },
  { level:19, name:'Trono de Cenizas',      icon:'🔥', desc:'Todo lo conquistado puede arder.'        },
  { level:20, name:'El Abismo del Rey',     icon:'♔',  desc:'No se conquista. Se pelea por quedarse.' },
];

function getStop(level) {
  const preset = PATH_STOPS.find(s => s.level === level);
  if (preset) return preset;
  return { level, name: 'Nivel ' + level, icon: '\u2605' };
}

document.getElementById('btn-path').addEventListener('click', () => {
  if (!getPlayerPiece()) {
    // Primera vez — mostrar selector
    document.getElementById('screen-menu').classList.add('hidden');
    document.getElementById('modal-piece-select').classList.remove('hidden');
  } else {
    showPathScreen();
  }
});
document.getElementById('btn-path-back').addEventListener('click', () => {
  document.getElementById('screen-path').classList.add('hidden');
  document.getElementById('screen-menu').classList.remove('hidden');
});

function showPathScreen() {
  const currentLevel = getLevel();
  const streak       = getStreak();
  const piece        = getPlayerPiece() || 'knight';
  const pieceSymbol  = PIECE_SYMBOLS[piece];

  document.getElementById('path-level-value').textContent = currentLevel;

  // Racha bajo el nivel
  const streakInfoEl = document.getElementById('path-streak-info');
  if (streakInfoEl) {
    streakInfoEl.textContent = streak > 0
      ? '\uD83D\uDD25 Racha: ' + streak + '/2 victorias para subir'
      : 'Necesitas 2 victorias seguidas para subir';
  }

  const maxVisible = Math.max(12, currentLevel + 3);
  const rowsEl = document.getElementById('path-rows');
  rowsEl.innerHTML = '';

  const ROW_SIZE = 4;
  const allStops = [];
  for (let i = 1; i <= maxVisible; i++) allStops.push(getStop(i));

  let rowIndex = 0;
  for (let i = 0; i < allStops.length; i += ROW_SIZE) {
    const rowStops = allStops.slice(i, i + ROW_SIZE);
    const isEven   = rowIndex % 2 === 0;
    const ordered  = isEven ? rowStops : [...rowStops].reverse();

    const rowEl = document.createElement('div');
    rowEl.className = 'path-row';

    ordered.forEach((stop, j) => {
      const done    = currentLevel > stop.level;
      const current = currentLevel === stop.level;
      const locked  = currentLevel < stop.level;

      const node = document.createElement('div');
      node.className = 'path-hex' +
        (done    ? ' hex-done'    : '') +
        (current ? ' hex-current' : '') +
        (locked  ? ' hex-locked'  : '');

      // Barra de progreso de racha solo en el nodo actual
      const streakBar = current && streak > 0
        ? '<div class="hex-streak"><div class="hex-streak-fill" style="width:' + (streak * 50) + '%"></div></div>'
        : '';

      // imagen de fondo si existe en img/path_N.webp
      const bgStyle = 'background-image:url(img/path_' + stop.level + '.webp)';

      node.innerHTML =
        '<div class="hex-inner" style="' + bgStyle + '">' +
          '<div class="hex-overlay"></div>' +
          '<span class="hex-bg-icon">' + stop.icon + '</span>' +
          (current ? '<span class="hex-player">' + pieceSymbol + '</span>' : '') +
          (done    ? '<div class="hex-check">✓</div>' : '') +
          (locked  ? '<div class="hex-lock">🔒</div>' : '') +
        '</div>' +
        '<div class="hex-label">' +
          '<span class="hex-name">' + stop.name + '</span>' +
          (current || done ? '<span class="hex-desc">' + (stop.desc || '') + '</span>' : '') +
          '<span class="hex-lv">Nv.' + stop.level + '</span>' +
        '</div>' +
        streakBar;

      rowEl.appendChild(node);

      if (j < ordered.length - 1) {
        const conn = document.createElement('div');
        conn.className = 'path-conn' + (done ? ' conn-done' : '');
        rowEl.appendChild(conn);
      }
    });

    rowsEl.appendChild(rowEl);

    if (i + ROW_SIZE < allStops.length) {
      const turnEl  = document.createElement('div');
      const lastStop = rowStops[rowStops.length - 1];
      const turnDone = currentLevel > lastStop.level;
      turnEl.className = 'path-turn' +
        (isEven ? ' turn-right' : ' turn-left') +
        (turnDone ? ' conn-done' : '');
      rowsEl.appendChild(turnEl);
    }

    rowIndex++;
  }

  document.getElementById('screen-menu').classList.add('hidden');
  document.getElementById('screen-path').classList.remove('hidden');

  setTimeout(() => {
    const cur = rowsEl.querySelector('.hex-current');
    if (cur) cur.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 150);
}