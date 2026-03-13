/**
 * UI.js
 * Modal de victoria, lore card e info de turno.
 */
import { PIECE_LORE, pieceImagePath } from "./Lore.js";
import { recordWin, recordLoss, getLevel } from "./Progesion.js";
import { recordGame } from "./Stats.js";

// ════════════════════════════════════════════════════════════════
//  INFO DE TURNO
// ════════════════════════════════════════════════════════════════
export function updateTurnInfo(chess, isAiEnabled, playerColor = "w") {
  const el = document.getElementById("turn-info");
  const aiColor = playerColor === "w" ? "b" : "w";
  if (chess.in_checkmate()) el.textContent = "JAQUE MATE!";
  else if (chess.in_draw()) el.textContent = "TABLAS";
  else if (chess.in_check()) el.textContent = "JAQUE!";
  else if (isAiEnabled && chess.turn() === aiColor)
    el.textContent = "Juega la IA...";
  else if (chess.turn() === "w") el.textContent = "Turno: Juegan BLANCAS";
  else el.textContent = "Turno: Juegan NEGRAS";
}

// ════════════════════════════════════════════════════════════════
//  LORE CARD
// ════════════════════════════════════════════════════════════════
export function showLore(id) {
  const lore = PIECE_LORE[id];
  if (!lore) return;

  const parts = id.split("_");
  const FILLED = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
  const symbol = FILLED[parts[1]] || "?";
  const avatar = document.getElementById("lore-avatar");
  const loreName = document.getElementById("lore-name");
  const loreDesc = document.getElementById("lore-desc");
  const loreEmpty = document.getElementById("lore-empty");
  const loreContent = document.getElementById("lore-content");

  avatar.style.display = "block";
  avatar.src = pieceImagePath(id);
  avatar.onerror = function () {
    this.style.display = "none";
    let fb = document.getElementById("lore-avatar-fallback");
    if (!fb) {
      fb = document.createElement("span");
      fb.id = "lore-avatar-fallback";
      fb.className = "lore-avatar-fallback";
      this.parentNode.insertBefore(fb, this);
    }
    fb.textContent = symbol;
    fb.style.display = "flex";
  };
  avatar.onload = function () {
    const fb = document.getElementById("lore-avatar-fallback");
    if (fb) fb.style.display = "none";
    this.style.display = "block";
  };

  loreName.textContent = lore.name.toUpperCase();
  loreDesc.textContent = lore.description;
  loreEmpty.classList.add("hidden");
  loreContent.classList.remove("hidden");
}

// ════════════════════════════════════════════════════════════════
//  MODAL DE VICTORIA
// ════════════════════════════════════════════════════════════════
const VICTORY_QUOTES = {
  q: [
    "El tablero era mio desde el primer movimiento.",
    "Nadie puede detener mi alcance.",
  ],
  r: [
    "Las columnas abiertas son mi reino.",
    "Una torre no cede. Una torre aplasta.",
  ],
  n: ["Salte donde nadie me esperaba.", "La sorpresa es la mejor armadura."],
  b: [
    "Vi el camino diagonal desde el principio.",
    "Las diagonales no mienten.",
  ],
  p: [
    "Me subestimaste por ser el mas pequeno. Error fatal.",
    "Los humildes tambien alcanzan la gloria.",
  ],
  k: ["Mi supervivencia era la unica victoria.", "El rey resiste, y asi gana."],
};
const DRAW_QUOTES = [
  "Ni la luz ni la sombra dominan hoy.",
  "El tablero nos juzgo iguales. Por ahora.",
];

export function checkEndGame(
  chess,
  identities,
  lastMove,
  isAiEnabled,
  playerColor = "w",
) {
  if (!chess.game_over()) return;

  const modalEl = document.getElementById("modal-overlay");
  const modalAvatar = document.getElementById("modal-avatar");
  const labelEl = document.getElementById("modal-result-label");
  const charNameEl = document.getElementById("modal-char-name");
  const quoteEl = document.getElementById("modal-quote");
  const sideEl = document.getElementById("modal-side");
  const streakEl = document.getElementById("modal-streak");
  const wrapEl = modalAvatar.parentElement;

  const lastId = lastMove ? identities[lastMove.to] : null;
  const lore = lastId ? PIECE_LORE[lastId] : null;
  const pieceType = lastId ? lastId.split("_")[1] : null;
  const moveCount = chess.history().length;
  const level = getLevel();

  if (lastId) {
    modalAvatar.src = `img/${lastId}.png`;
    modalAvatar.style.display = "block";
    modalAvatar.onerror = null;
    modalAvatar.onload = null;
    wrapEl.style.display = "flex";
  } else {
    wrapEl.style.display = "none";
  }

  if (chess.in_checkmate()) {
    const win = chess.turn() === "b" ? "w" : "b";

    if (isAiEnabled) {
      // ── Registrar partida en historial ──────────────────────
      recordGame({
        result: win === playerColor ? "w" : "l",
        level,
        moves: moveCount,
        mode: "ai",
      });

      if (win === playerColor) {
        const { streak } = recordWin();
        document.getElementById("level-value").textContent = getLevel();
        if (streak > 0) {
          streakEl.textContent =
            streak >= 2
              ? "⚡ RACHA — ¡NIVEL SUBIDO!"
              : "🔥 1/2 victorias — ¡una más para subir!";
          streakEl.classList.remove("hidden");
        } else {
          streakEl.classList.add("hidden");
        }
      } else {
        recordLoss();
        document.getElementById("level-value").textContent = getLevel();
        streakEl.textContent =
          "💪 Derrota. Prueba de nuevo — tu racha sigue en pie.";
        streakEl.classList.remove("hidden");
      }
    } else {
      // ── Partida PvP ─────────────────────────────────────────
      recordGame({ result: "w", level: 0, moves: moveCount, mode: "pvp" });
      streakEl.classList.add("hidden");
    }

    labelEl.textContent = isAiEnabled
      ? win === playerColor
        ? "VICTORIA"
        : "DERROTA"
      : "JAQUE MATE!";
    labelEl.className =
      "modal-result-label " + (win === playerColor ? "victory" : "defeat");
    charNameEl.textContent = lore ? lore.name.toUpperCase() : "-";
    const q = VICTORY_QUOTES[pieceType] || VICTORY_QUOTES["p"];
    quoteEl.textContent = q[Math.floor(Math.random() * q.length)];
    sideEl.textContent =
      win === "w" ? "Ganan blancas" : isAiEnabled ? "IA" : "Ganan negras";
  } else if (chess.in_draw()) {
    // ── Tablas ───────────────────────────────────────────────
    if (isAiEnabled) {
      recordGame({ result: "d", level, moves: moveCount, mode: "ai" });
    }
    streakEl.classList.add("hidden");
    labelEl.textContent = "TABLAS";
    labelEl.className = "modal-result-label draw";
    charNameEl.textContent = "El tablero habla";
    quoteEl.textContent =
      DRAW_QUOTES[Math.floor(Math.random() * DRAW_QUOTES.length)];
    sideEl.textContent = "Ningun bando domina";
    wrapEl.style.display = "none";
  }

  modalEl.classList.remove("hidden");
}
