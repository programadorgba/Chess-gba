/**
 * lore.js
 * ──────────────────────────────────────────────────────────────────
 * Sistema de identidades de piezas: cada pieza tiene un nombre y
 * descripción de personaje únicas que persisten durante la partida.
 * ──────────────────────────────────────────────────────────────────
 */

// Identificadores iniciales de cada pieza por casilla
export const INITIAL_IDENTITIES = {
  // Fila 1 — Blancas (piezas mayores)
  'a1': 'w_r_a1',
  'b1': 'w_n_b1',
  'c1': 'w_b_c1',
  'd1': 'w_q_d1',
  'e1': 'w_k_e1',
  'f1': 'w_b_f1',
  'g1': 'w_n_g1',
  'h1': 'w_r_h1',
  // Fila 2 — Blancas (peones)
  'a2': 'w_p_a2',
  'b2': 'w_p_b2',
  'c2': 'w_p_c2',
  'd2': 'w_p_d2',
  'e2': 'w_p_e2',
  'f2': 'w_p_f2',
  'g2': 'w_p_g2',
  'h2': 'w_p_h2',
  // Fila 7 — Negras (peones)
  'a7': 'b_p_a7',
  'b7': 'b_p_b7',
  'c7': 'b_p_c7',
  'd7': 'b_p_d7',
  'e7': 'b_p_e7',
  'f7': 'b_p_f7',
  'g7': 'b_p_g7',
  'h7': 'b_p_h7',
  // Fila 8 — Negras (piezas mayores)
  'a8': 'b_r_a8',
  'b8': 'b_n_b8',
  'c8': 'b_b_c8',
  'd8': 'b_q_d8',
  'e8': 'b_k_e8',
  'f8': 'b_b_f8',
  'g8': 'b_n_g8',
  'h8': 'b_r_h8',
};

// Información narrativa de cada pieza
export const PIECE_LORE = {
  // ── BLANCAS ──────────────────────────────────────────────────────
  'w_r_a1': { name: 'Rocco',            description: 'Habla con una voz que retumba con poder. Soy el ariete del flanco de la reina. Destruiré las defensas enemigas.' },
  'w_n_b1': { name: 'Sir Reginald',     description: 'Habla con un tono profundo y dramático. Soy un caballero leal y maestro del doble ataque.' },
  'w_b_c1': { name: 'Obispo Benedicto', description: 'Habla con voz calmada. Como asesor espiritual de la Reina, veo los caminos que otros ignoran.' },
  'w_q_d1': { name: 'Reina Isabela',    description: 'Habla con voz regia y dominante. Soy el arma más formidable del ejército. Mi alcance es absoluto.' },
  'w_k_e1': { name: 'Rey Arturo',       description: 'Habla con un tono digno y cansado. Mi supervivencia es la clave de nuestra estrategia. No me rendiré.' },
  'w_b_f1': { name: 'Diácono',          description: 'Habla con fervor devoto. Soy el clérigo del Rey y defensor de las casillas de luz.' },
  'w_n_g1': { name: 'Sombra',           description: 'Habla con un toque impredecible. Soy un infiltrado que prospera sembrando el caos tras las líneas enemigas.' },
  'w_r_h1': { name: 'El Muro',          description: 'Habla con un estruendo profundo. Soy la fortaleza inquebrantable que protege el flanco del Rey.' },
  'w_p_a2': { name: 'Pip',              description: 'Habla con esperanza. Soy un novato entusiasta decidido a demostrar mi valor en este flanco.' },
  'w_p_b2': { name: 'Percy',            description: 'Habla con calma. Soy cauteloso y metódico. Mi único deber es proteger a Sir Reginald.' },
  'w_p_c2': { name: 'Pippin',           description: 'Habla con tono travieso. Soy el bromista del grupo, pero mi lanza es muy real.' },
  'w_p_d2': { name: 'Peter',            description: 'Habla de forma reflexiva. He estudiado cada manual de estrategia; cada paso es calculado.' },
  'w_p_e2': { name: 'Pat',              description: 'Habla con determinación dramática. Mi único objetivo es cruzar el tablero y alcanzar la gloria.' },
  'w_p_f2': { name: 'Penny',            description: 'Habla con astucia. Soy ingeniosa y oportunista. No me subestimes por ser un peón.' },
  'w_p_g2': { name: 'Polly',            description: 'Habla con algo de preocupación. Soy el pilar que mantiene unida nuestra muralla defensiva.' },
  'w_p_h2': { name: 'Pete',             description: 'Habla con voz áspera. Soy un veterano gruñón que ha sobrevivido a mil batallas.' },

  // ── NEGRAS ───────────────────────────────────────────────────────
  'b_p_a7': { name: 'Explorador',       description: 'Habla en susurros. Soy los ojos silenciosos que vigilan cada movimiento desde las sombras.' },
  'b_p_b7': { name: 'Vanguardia',       description: 'Habla con tono burlón. Soy temerario y arrogante; la mejor defensa es un ataque despiadado.' },
  'b_p_c7': { name: 'Guardia',          description: 'Habla con severidad. Mi credo es la disciplina absoluta. Sigo las órdenes del Canciller.' },
  'b_p_d7': { name: 'Centinela',        description: 'Habla con voz firme. Soy un resorte tensado esperando el momento exacto para golpear.' },
  'b_p_e7': { name: 'Alcaide',          description: 'Habla con voz profunda. Disfruto asfixiando y atrapando a las piezas enemigas en mi red.' },
  'b_p_f7': { name: 'Vigía',            description: 'Habla con rapidez nerviosa. Vigilo el cielo esperando el ataque de los obispos enemigos.' },
  'b_p_g7': { name: 'Piquete',          description: 'Habla con un gruñido. Mantendré esta posición hasta mi último aliento.' },
  'b_p_h7': { name: 'Avanzada',         description: 'Habla con desprecio amargo. En este flanco desolado, solo mi instinto me mantiene vivo.' },
  'b_r_a8': { name: 'Centinela',        description: 'Habla con frialdad. Soy un motor de destrucción diseñado para dominar las columnas abiertas.' },
  'b_n_b8': { name: 'Sir Gideon',       description: 'Habla con sarcasmo. Soy un caballero oscuro que desprecia el honor. Solo importa ganar.' },
  'b_b_c8': { name: 'Asesor',           description: 'Habla con susurros manipuladores. Soy la mente maestra que mueve los hilos tras el trono.' },
  'b_q_d8': { name: 'Reina Boudica',    description: 'Habla con fuerza. Soy una reina guerrera: feroz, orgullosa y totalmente implacable.' },
  'b_k_e8': { name: 'El Regente',       description: 'Habla con voz de tirano. Mi paranoia es mi escudo. Gobierno este tablero a través del miedo.' },
  'b_b_f8': { name: 'Canciller',        description: 'Habla con tono grandioso. Para mí, las demás piezas no son más que herramientas desechables.' },
  'b_n_g8': { name: 'Eclipse',          description: 'Habla casi en un susurro. Soy un espectro en la oscuridad, una pesadilla para tus planes.' },
  'b_r_h8': { name: 'Guardián',         description: 'Habla con un gruñido protector. Soy el guardián eterno de los dominios del Rey Negro.' },
};

// Símbolos Unicode de respaldo cuando no hay imagen
export const PIECE_UNICODE = {
  'w_k': '♔', 'w_q': '♕', 'w_r': '♖', 'w_b': '♗', 'w_n': '♘', 'w_p': '♙',
  'b_k': '♚', 'b_q': '♛', 'b_r': '♜', 'b_b': '♝', 'b_n': '♞', 'b_p': '♟',
};


export function pieceImagePath(id) {
  return id ? `/img/${id}.png` : null;
}

/**
 * Devuelve el símbolo unicode para un id de pieza.
 * Ejemplo: 'w_r_a1' → '♖'
 */
export function pieceUnicode(id) {
  if (!id) return '';
  const parts = id.split('_');
  return PIECE_UNICODE[`${parts[0]}_${parts[1]}`] || '';
}