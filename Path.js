/**
 * Path.js
 * Camino del Caballero — mapa SVG + selector de figura.
 * Se inicializa llamando a initPath() desde App.js.
 */
import { getLevel, getStreak } from './Progesion.js';

// ════════════════════════════════════════════════════════════════
//  FIGURA DEL JUGADOR
// ════════════════════════════════════════════════════════════════
const PIECE_KEY     = 'chess_player_piece';
const PIECE_SYMBOLS = { king: '♔', bishop: '♗', knight: '♘' };

function getPlayerPiece() { return localStorage.getItem(PIECE_KEY) || null; }
function savePlayerPiece(p) { localStorage.setItem(PIECE_KEY, p); }

// ════════════════════════════════════════════════════════════════
//  PARADAS DEL CAMINO
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

// ════════════════════════════════════════════════════════════════
//  INICIALIZAR LISTENERS
// ════════════════════════════════════════════════════════════════
export function initPath() {
  // Botón del menú
  document.getElementById('btn-path').addEventListener('click', () => {
    if (!getPlayerPiece()) {
      document.getElementById('screen-menu').classList.add('hidden');
      document.getElementById('modal-piece-select').classList.remove('hidden');
    } else {
      showPathScreen();
    }
  });

  // Volver desde el camino
  document.getElementById('btn-path-back').addEventListener('click', () => {
    document.getElementById('screen-path').classList.add('hidden');
    document.getElementById('screen-menu').classList.remove('hidden');
  });

  // Cambiar figura
  document.getElementById('btn-change-piece').addEventListener('click', () => {
    document.getElementById('screen-path').classList.add('hidden');
    document.getElementById('modal-piece-select').classList.remove('hidden');
  });

  // Selector de figura
  document.querySelectorAll('.piece-option').forEach(btn => {
    btn.addEventListener('click', () => {
      savePlayerPiece(btn.dataset.piece);
      document.getElementById('modal-piece-select').classList.add('hidden');
      showPathScreen();
    });
  });
}

// ════════════════════════════════════════════════════════════════
//  RENDERIZAR MAPA
// ════════════════════════════════════════════════════════════════
function showPathScreen() {
  const currentLevel = getLevel();
  const streak       = getStreak();
  const piece        = getPlayerPiece() || 'knight';
  const pieceSymbol  = PIECE_SYMBOLS[piece];

  document.getElementById('path-level-value').textContent = currentLevel;

  const streakInfoEl = document.getElementById('path-streak-info');
  if (streakInfoEl) {
    streakInfoEl.textContent = streak > 0
      ? '🔥 ' + streak + '/2 victorias — ¡una mas para subir!'
      : 'Gana 2 seguidas para avanzar';
  }

  const container = document.getElementById('path-rows');
  container.innerHTML = '';

  const W     = 320;
  const H     = 620;
  const cols  = 4;
  const rows  = 5;
  const total = PATH_STOPS.length;
  const padX  = 44;
  const padY  = 32;
  const stepX = (W - padX * 2) / (cols - 1);
  const stepY = (H - padY * 2) / (rows - 1);

  function nodePos(index) {
    const row     = Math.floor(index / cols);
    const col     = index % cols;
    const flipped = row % 2 === 1;
    const realCol = flipped ? (cols - 1 - col) : col;
    const x = padX + realCol * stepX;
    const y = H - padY - row * stepY;
    return { x, y };
  }

  // SVG del camino
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.cssText = 'position:absolute;inset:0;pointer-events:none;';

  const positions = [];
  for (let i = 0; i < total; i++) positions.push(nodePos(i));

  function buildPath(upTo) {
    let d = 'M ' + positions[0].x + ' ' + positions[0].y;
    for (let i = 1; i <= upTo; i++) {
      const prev    = positions[i - 1];
      const curr    = positions[i];
      const sameRow = Math.floor((i-1)/cols) === Math.floor(i/cols);
      if (sameRow) {
        const cx = (prev.x + curr.x) / 2;
        d += ' C ' + cx + ' ' + prev.y + ',' + cx + ' ' + curr.y + ',' + curr.x + ' ' + curr.y;
      } else {
        const cy = (prev.y + curr.y) / 2;
        d += ' C ' + prev.x + ' ' + cy + ',' + curr.x + ' ' + cy + ',' + curr.x + ' ' + curr.y;
      }
    }
    return d;
  }

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = '<linearGradient id="goldGrad" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#c8860a"/><stop offset="100%" stop-color="#f0d9b5"/></linearGradient>';
  svg.appendChild(defs);

  // Línea base gris
  const pathBase = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathBase.setAttribute('d', buildPath(total - 1));
  pathBase.setAttribute('fill', 'none');
  pathBase.setAttribute('stroke', 'rgba(240,217,181,0.12)');
  pathBase.setAttribute('stroke-width', '6');
  pathBase.setAttribute('stroke-linecap', 'round');
  svg.appendChild(pathBase);

  // Línea dorada completada
  if (currentLevel > 1) {
    const pathDone = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathDone.setAttribute('d', buildPath(Math.min(currentLevel - 1, total - 1)));
    pathDone.setAttribute('fill', 'none');
    pathDone.setAttribute('stroke', 'url(#goldGrad)');
    pathDone.setAttribute('stroke-width', '6');
    pathDone.setAttribute('stroke-linecap', 'round');
    pathDone.setAttribute('stroke-dasharray', '10 6');
    svg.appendChild(pathDone);
  }

  // Mapa contenedor
  const mapEl = document.createElement('div');
  mapEl.style.cssText = 'position:relative;width:' + W + 'px;height:' + H + 'px;margin:0 auto;flex-shrink:0;';
  mapEl.appendChild(svg);

  // Tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'path-tooltip hidden';
  mapEl.appendChild(tooltip);

  // Nodos
  PATH_STOPS.forEach((stop, i) => {
    const pos     = nodePos(i);
    const done    = currentLevel > stop.level;
    const current = currentLevel === stop.level;
    const locked  = currentLevel < stop.level;

    const node = document.createElement('div');
    node.className = 'map-node' +
      (done    ? ' node-done'    : '') +
      (current ? ' node-current' : '') +
      (locked  ? ' node-locked'  : '');
    node.style.cssText = 'left:' + pos.x + 'px;top:' + pos.y + 'px;';

    node.addEventListener('click', (e) => {
      e.stopPropagation();
      tooltip.innerHTML =
        '<strong>' + stop.name + '</strong>' +
        '<span>' + stop.desc + '</span>' +
        '<em>Nivel ' + stop.level + '</em>';
      tooltip.classList.remove('hidden');

      const rect  = mapEl.getBoundingClientRect();
      const nRect = node.getBoundingClientRect();
      let tx = nRect.left - rect.left - 60;
      let ty = nRect.top  - rect.top  - 72;
      tx = Math.max(4, Math.min(tx, W - 140));
      ty = Math.max(4, ty);
      tooltip.style.left = tx + 'px';
      tooltip.style.top  = ty + 'px';
    });

    node.innerHTML =
      '<span class="map-icon">' + stop.icon + '</span>' +
      (current ? '<span class="map-player">' + pieceSymbol + '</span>'
               : done ? '<span class="map-check">✓</span>' : '') +
      (current && streak > 0
        ? '<div class="map-streak"><div style="width:' + (streak * 50) + '%"></div></div>'
        : '') +
      '<span class="map-lv">' + stop.level + '</span>';

    mapEl.appendChild(node);
  });

  mapEl.addEventListener('click', () => tooltip.classList.add('hidden'));
  container.appendChild(mapEl);

  document.getElementById('screen-menu').classList.add('hidden');
  document.getElementById('screen-path').classList.remove('hidden');
}