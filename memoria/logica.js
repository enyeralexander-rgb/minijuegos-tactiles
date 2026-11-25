// Reglas de la memoria Baby Finger, sin nada de dibujo ni de sonido.
// La maqueta la usa en el navegador y pruebas.mjs la prueba con node. En nativo será una clase de Kotlin
// con las mismas funciones (lógica pura probada con JUnit).
(function (raiz) {
  'use strict';

  // Las 9 imágenes de la marca: 3 pañales, 3 toallitas, 2 bebés y el logo (D-024, D-033)
  const IMAGENES = ['panalPants', 'panalG', 'panalAcuatico', 'toallitaAzul', 'toallitaBlanca', 'toallitaRosa',
    'bebeSentado', 'bebeIngeniero', 'logo'];
  const PAREJAS = 8, CARTAS = PAREJAS * 2, ERRORES_MAX = 3;

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

  // Reparto: 8 de las 9 imágenes al azar, cada una dos veces, en 16 posiciones al azar.
  // Si sale el mismo orden de la partida anterior se vuelve a barajar, para que nadie se lo aprenda.
  function repartir(semilla, anterior) {
    const rnd = mulberry32(semilla >>> 0);
    const elegidas = barajar(IMAGENES, rnd).slice(0, PAREJAS);
    const mazo = elegidas.concat(elegidas);
    let cartas = barajar(mazo, rnd);
    for (let k = 0; k < 20 && anterior && cartas.every((c, i) => c === anterior[i]); k++) cartas = barajar(mazo, rnd);
    return { elegidas, cartas };
  }

  // Estados: 'vista' (vista previa, no se toca), 'juego', 'ganada', 'perdida'
  function crearPartida(semilla, anterior) {
    const r = repartir(semilla, anterior);
    return {
      semilla: semilla >>> 0, elegidas: r.elegidas,
      cartas: r.cartas.map(id => ({ id, arriba: true, emparejada: false })),   // en la vista previa van boca arriba
      abiertas: [], errores: 0, parejas: 0, estado: 'vista', bloqueada: false, orden: [],
    };
  }

  // termina la vista previa: todas boca abajo y se puede jugar
  function terminarVista(p) {
    if (p.estado !== 'vista') return false;
    p.cartas.forEach(c => { c.arriba = false; }); p.estado = 'juego'; return true;
  }

  // Un toque sobre la carta i. Devuelve qué pasó; los toques que no valen no cambian nada.
  function tocar(p, i) {
    if (p.estado !== 'juego') return { tipo: 'ignorado', motivo: p.estado };
    if (p.bloqueada) return { tipo: 'ignorado', motivo: 'bloqueada' };
    const c = p.cartas[i];
    if (!c) return { tipo: 'ignorado', motivo: 'fuera' };
    if (c.emparejada) return { tipo: 'ignorado', motivo: 'emparejada' };
    if (c.arriba) return { tipo: 'ignorado', motivo: 'ya abierta' };     // doble toque sobre la misma carta
    c.arriba = true; p.abiertas.push(i);
    if (p.abiertas.length === 2) { p.bloqueada = true; return { tipo: 'segunda', i }; }
    return { tipo: 'primera', i };
  }

  // Se llama cuando la segunda carta terminó de girar. Pareja: quedan arriba y se desbloquea.
  // Error: se cuenta y las dos siguen arriba y bloqueadas hasta taparError().
  function resolver(p) {
    if (p.abiertas.length !== 2) return null;
    const [a, b] = p.abiertas, ca = p.cartas[a], cb = p.cartas[b];
    if (ca.id === cb.id) {
      ca.emparejada = cb.emparejada = true; p.parejas++; p.orden.push(ca.id); p.abiertas = []; p.bloqueada = false;
      if (p.parejas === PAREJAS) p.estado = 'ganada';
      return { tipo: 'pareja', a, b, id: ca.id, parejas: p.parejas };
    }
    p.errores++;
    if (p.errores >= ERRORES_MAX) { p.estado = 'perdida'; p.abiertas = []; }
    return { tipo: 'error', a, b, errores: p.errores };
  }

  // después de mostrar el error: las dos cartas vuelven boca abajo (sigue bloqueada mientras giran)
  function taparError(p) {
    if (p.estado !== 'juego' || p.abiertas.length !== 2) return false;
    p.abiertas.forEach(i => { p.cartas[i].arriba = false; }); p.abiertas = []; return true;
  }
  function desbloquear(p) { if (p.estado === 'juego' && p.abiertas.length === 0) p.bloqueada = false; }

  const api = { IMAGENES, PAREJAS, CARTAS, ERRORES_MAX, mulberry32, barajar, repartir, crearPartida, terminarVista,
    tocar, resolver, taparError, desbloquear };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.MemoriaLogica = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
