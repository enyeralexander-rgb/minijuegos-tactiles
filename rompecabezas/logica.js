// Reglas del rompecabezas Baby Finger, sin nada de dibujo ni de sonido.
// La maqueta la usa en el navegador y pruebas.mjs la prueba con node. En nativo será una clase de Kotlin
// con las mismas funciones (lógica pura probada con JUnit).
(function (raiz) {
  'use strict';

  // Las 8 imágenes que se pueden armar: 3 pañales, 3 toallitas y 2 bebés. El logo no se corta en piezas (D-022, D-038).
  const IMAGENES = ['panalPants', 'panalG', 'panalAcuatico', 'toallitaAzul', 'toallitaBlanca', 'toallitaRosa',
    'bebeSentado', 'bebeIngeniero'];
  // 4×4 = 16 piezas (D-039: el 3×3 fue demasiado fácil y el 5×5 demasiado difícil)
  const COLS = 4, FILAS = 4, PIEZAS = COLS * FILAS, ERRORES_MAX = 3, TIEMPO = 60;
  // Forma de las pestañas, como en el generador de Draradech (CC0): pestaña del 20 % y un poco de variación
  const PESTANA = 0.1, VARIACION = 0.04;

  // azar con semilla: la misma semilla da la misma partida
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function barajar(arr, rnd) {
    const d = arr.slice();
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
    return d;
  }

  // Imagen al azar, nunca la misma de la partida anterior.
  function elegirImagen(rnd, anterior) {
    const opciones = IMAGENES.filter(id => id !== anterior);
    return opciones[Math.floor(rnd() * opciones.length)];
  }

  // Cortes: cada borde interior lleva una pestaña hacia un lado (signo +1 o -1) y una pequeña variación de forma.
  // h[f][c]: borde entre la fila f y la f+1 en la columna c; +1 = la pestaña sale hacia abajo (es de la pieza de arriba).
  // v[f][c]: borde entre la columna c y la c+1 en la fila f; +1 = la pestaña sale hacia la derecha (es de la de la izquierda).
  function cortar(rnd) {
    const borde = () => ({ signo: rnd() < 0.5 ? 1 : -1, b: (rnd() * 2 - 1) * VARIACION, c: (rnd() * 2 - 1) * VARIACION,
      d: (rnd() * 2 - 1) * VARIACION });
    const h = [], v = [];
    for (let f = 0; f < FILAS - 1; f++) { h.push([]); for (let c = 0; c < COLS; c++) h[f].push(borde()); }
    for (let f = 0; f < FILAS; f++) { v.push([]); for (let c = 0; c < COLS - 1; c++) v[f].push(borde()); }
    return { h, v };
  }

  // Lados de la pieza i: 0 = recto (contorno), 1 = pestaña hacia afuera, -1 = hueco.
  function lados(cortes, i) {
    const f = Math.floor(i / COLS), c = i % COLS;
    return {
      arriba: f === 0 ? 0 : -cortes.h[f - 1][c].signo,
      abajo: f === FILAS - 1 ? 0 : cortes.h[f][c].signo,
      izquierda: c === 0 ? 0 : -cortes.v[f][c - 1].signo,
      derecha: c === COLS - 1 ? 0 : cortes.v[f][c].signo,
    };
  }

  // Reparto: imagen al azar, cortes al azar y las 16 piezas en lugares al azar de la bandeja.
  // bandeja[k] = pieza que va en el lugar k. Nunca quedan todas en orden.
  function repartir(semilla, anterior) {
    const rnd = mulberry32(semilla >>> 0);
    const imagen = elegirImagen(rnd, anterior);
    const cortes = cortar(rnd);
    const orden = Array.from({ length: PIEZAS }, (_, i) => i);
    let bandeja = barajar(orden, rnd);
    for (let k = 0; k < 20 && bandeja.every((x, i) => x === i); k++) bandeja = barajar(orden, rnd);
    // un poco de desorden en cada lugar de la bandeja (fracción del lugar) y un giro pequeño, solo para que se vea natural
    const desorden = bandeja.map(() => ({ dx: (rnd() * 2 - 1) * 0.12, dy: (rnd() * 2 - 1) * 0.12, giro: (rnd() * 2 - 1) * 0.09 }));
    return { imagen, cortes, bandeja, desorden };
  }

  // Estados: 'vista' (vista previa, no se toca), 'juego', 'ganada', 'perdida'
  function crearPartida(semilla, anterior) {
    const r = repartir(semilla, anterior);
    return {
      semilla: semilla >>> 0, imagen: r.imagen, cortes: r.cortes, bandeja: r.bandeja, desorden: r.desorden,
      piezas: Array.from({ length: PIEZAS }, (_, i) => ({ i, colocada: false })),
      colocadas: 0, errores: 0, tiempo: TIEMPO, estado: 'vista', motivo: '', tomada: -1, orden: [],
    };
  }

  function terminarVista(p) {
    if (p.estado !== 'vista') return false;
    p.estado = 'juego'; return true;
  }

  // Casilla del tablero bajo el punto (x, y), o -1 si está fuera. El tablero es un cuadrado {x, y, lado}.
  // margen: fracción de casilla que se acepta por fuera del contorno (para las piezas de la orilla).
  function celdaEn(tablero, x, y, margen = 0) {
    const cel = tablero.lado / COLS, m = margen * cel;
    if (x < tablero.x - m || y < tablero.y - m || x > tablero.x + tablero.lado + m || y > tablero.y + tablero.lado + m) return -1;
    const c = Math.min(COLS - 1, Math.max(0, Math.floor((x - tablero.x) / cel)));
    const f = Math.min(FILAS - 1, Math.max(0, Math.floor((y - tablero.y) / cel)));
    return f * COLS + c;
  }
  // centro de la casilla i
  function centroCelda(tablero, i) {
    const cel = tablero.lado / COLS;
    return { x: tablero.x + (i % COLS + 0.5) * cel, y: tablero.y + (Math.floor(i / COLS) + 0.5) * cel };
  }

  // Tomar una pieza con el dedo. Solo las sueltas y solo durante el juego.
  function tomar(p, i) {
    if (p.estado !== 'juego') return { tipo: 'ignorado', motivo: p.estado };
    const pz = p.piezas[i];
    if (!pz) return { tipo: 'ignorado', motivo: 'fuera' };
    if (pz.colocada) return { tipo: 'ignorado', motivo: 'colocada' };
    if (p.tomada >= 0) return { tipo: 'ignorado', motivo: 'ocupado' };     // un solo dedo a la vez
    p.tomada = i; return { tipo: 'tomada', i };
  }

  // Soltar la pieza i sobre la casilla celda (-1 = fuera del tablero).
  //  'encaje': su casilla; queda fija (el imán la lleva al centro).
  //  'error': una casilla libre que no es la suya; vuelve a la bandeja y se pierde un corazón.
  //  'ocupada': una casilla ya armada; vuelve a la bandeja sin castigo (no cabe ahí, no es un intento).
  //  'libre': fuera del tablero; no pasa nada.
  function soltar(p, i, celda) {
    if (p.tomada !== i) return { tipo: 'ignorado', motivo: 'no tomada' };
    p.tomada = -1;
    if (p.estado !== 'juego') return { tipo: 'ignorado', motivo: p.estado };
    if (celda < 0) return { tipo: 'libre', i };
    if (celda === i) {
      p.piezas[i].colocada = true; p.colocadas++; p.orden.push(i);
      if (p.colocadas === PIEZAS) { p.estado = 'ganada'; p.motivo = 'victoria'; }
      return { tipo: 'encaje', i, colocadas: p.colocadas };
    }
    if (p.piezas[celda].colocada) return { tipo: 'ocupada', i, celda };
    p.errores++;
    if (p.errores >= ERRORES_MAX) { p.estado = 'perdida'; p.motivo = 'errores'; }
    return { tipo: 'error', i, celda, errores: p.errores };
  }

  // El reloj corre solo durante el juego. Devuelve true si se acabó el tiempo en este paso.
  function avanzar(p, dt) {
    if (p.estado !== 'juego') return false;
    p.tiempo = Math.max(0, p.tiempo - dt);
    if (p.tiempo <= 0) { p.estado = 'perdida'; p.motivo = 'tiempo'; p.tomada = -1; return true; }
    return false;
  }

  const api = { IMAGENES, COLS, FILAS, PIEZAS, ERRORES_MAX, TIEMPO, PESTANA, VARIACION, mulberry32, barajar,
    elegirImagen, cortar, lados, repartir, crearPartida, terminarVista, celdaEn, centroCelda, tomar, soltar, avanzar };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.RompecabezasLogica = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
