// Pruebas de las reglas del rompecabezas (logica.js). Solo Node, sin dependencias.
// Uso: node rompecabezas/pruebas.mjs
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const L = createRequire(import.meta.url)('./logica.js');
let bien = 0;
function prueba(nombre, fn) {
  try { fn(); bien++; console.log('  ok   ' + nombre); }
  catch (e) { console.log('  MAL  ' + nombre + '\n       ' + e.message); process.exitCode = 1; }
}
const TAB = { x: 100, y: 200, lado: 400 };          // tablero de prueba: 4×4 casillas de 100
const N = L.COLS, TODAS = Array.from({ length: L.PIEZAS }, (_, i) => i);
const jugando = (s, ant) => { const p = L.crearPartida(s, ant); L.terminarVista(p); return p; };
// suelta la pieza i en la casilla celda, como lo haría el dedo
const mover = (p, i, celda) => { L.tomar(p, i); return L.soltar(p, i, celda); };
// una casilla libre que no es la de la pieza i
const ajena = (p, i) => p.piezas.findIndex((x, k) => k !== i && !x.colocada);

console.log('Reparto');
prueba('la imagen es una de las 8 (nunca el logo) y todas salen alguna vez, parejas', () => {
  const n = {};
  for (let s = 1; s <= 4000; s++) { const r = L.repartir(s); assert.ok(L.IMAGENES.includes(r.imagen)); n[r.imagen] = (n[r.imagen] || 0) + 1; }
  assert.ok(!L.IMAGENES.includes('logo'));
  for (const id of L.IMAGENES) assert.ok(n[id] > 400 && n[id] < 600, `${id} salió ${n[id]} veces de 4000`);
});
prueba('nunca repite la imagen de la partida anterior', () => {
  let ant = null;
  for (let s = 1; s <= 2000; s++) { const r = L.repartir(s, ant); assert.notEqual(r.imagen, ant); ant = r.imagen; }
});
prueba('4×4: la bandeja trae las 16 piezas una sola vez, nunca en orden, y cada lugar recibe todas', () => {
  assert.equal(L.PIEZAS, 16); assert.equal(L.COLS, 4); assert.equal(L.FILAS, 4);
  const R = 5000, lugar = Array.from({ length: L.PIEZAS }, () => ({}));
  for (let s = 1; s <= R; s++) {
    const r = L.repartir(s);
    assert.deepEqual(r.bandeja.slice().sort((a, b) => a - b), TODAS);
    assert.ok(!r.bandeja.every((x, i) => x === i));
    r.bandeja.forEach((pz, k) => lugar[k][pz] = (lugar[k][pz] || 0) + 1);
  }
  lugar.forEach((m, k) => { assert.equal(Object.keys(m).length, L.PIEZAS, `el lugar ${k} solo vio ${Object.keys(m).length} piezas`);
    assert.ok(Math.max(...Object.values(m)) / R < 0.09, `en el lugar ${k} una pieza domina`); });
});
prueba('la misma semilla repite la partida y otra semilla la cambia', () => {
  assert.deepEqual(L.repartir(123), L.repartir(123));
  assert.notDeepEqual(L.repartir(123), L.repartir(124));
});
prueba('bordes: rectos en el contorno, y en cada unión una pestaña de un lado y el hueco del otro', () => {
  for (let s = 1; s <= 500; s++) {
    const { cortes } = L.repartir(s), lado = i => L.lados(cortes, i);
    for (const i of TODAS) {
      const f = Math.floor(i / N), c = i % N, l = lado(i);
      assert.equal(l.arriba === 0, f === 0); assert.equal(l.abajo === 0, f === N - 1);
      assert.equal(l.izquierda === 0, c === 0); assert.equal(l.derecha === 0, c === N - 1);
      if (c < N - 1) assert.equal(l.derecha, -lado(i + 1).izquierda);
      if (f < N - 1) assert.equal(l.abajo, -lado(i + N).arriba);
      for (const v of Object.values(l)) assert.ok([-1, 0, 1].includes(v));
    }
    for (const fila of [...cortes.h, ...cortes.v]) for (const b of fila)
      for (const k of ['b', 'c', 'd']) assert.ok(Math.abs(b[k]) <= L.VARIACION);
  }
});

console.log('Encaje');
prueba('casilla bajo el dedo: dentro, en la orilla con margen y fuera', () => {
  assert.equal(L.celdaEn(TAB, 150, 250), 0); assert.equal(L.celdaEn(TAB, 450, 550), 15); assert.equal(L.celdaEn(TAB, 250, 350), 5);
  assert.equal(L.celdaEn(TAB, 90, 250), -1); assert.equal(L.celdaEn(TAB, 90, 250, 0.15), 0);
  assert.equal(L.celdaEn(TAB, 350, 900), -1); assert.equal(L.celdaEn(TAB, 499, 599), 15);
  assert.deepEqual(L.centroCelda(TAB, 6), { x: 350, y: 350 });
  for (const i of TODAS) { const c = L.centroCelda(TAB, i); assert.equal(L.celdaEn(TAB, c.x, c.y), i); }
});
prueba('en la vista previa no se puede tomar ninguna pieza', () => {
  const p = L.crearPartida(5); assert.equal(p.estado, 'vista');
  assert.equal(L.tomar(p, 0).tipo, 'ignorado'); assert.ok(L.terminarVista(p)); assert.equal(L.tomar(p, 0).tipo, 'tomada');
});
prueba('soltada en su casilla encaja, queda fija y no se puede volver a tomar', () => {
  const p = jugando(6); const r = mover(p, 10, 10);
  assert.equal(r.tipo, 'encaje'); assert.equal(p.colocadas, 1); assert.equal(p.errores, 0);
  assert.equal(L.tomar(p, 10).tipo, 'ignorado');
});
prueba('un solo dedo: con una pieza tomada no se toma otra', () => {
  const p = jugando(7); L.tomar(p, 0); assert.equal(L.tomar(p, 1).tipo, 'ignorado'); L.soltar(p, 0, -1); assert.equal(L.tomar(p, 1).tipo, 'tomada');
});
prueba('fuera del tablero no pasa nada, y sobre una casilla ya armada vuelve sin castigo', () => {
  const p = jugando(8);
  assert.equal(mover(p, 2, -1).tipo, 'libre'); assert.equal(p.errores, 0);
  mover(p, 0, 0); assert.equal(mover(p, 2, 0).tipo, 'ocupada'); assert.equal(p.errores, 0); assert.equal(p.colocadas, 1);
});

console.log('Errores, tiempo, victoria y derrota');
prueba('en una casilla libre que no es la suya es un error y la pieza sigue suelta', () => {
  const p = jugando(9); const r = mover(p, 1, 5);
  assert.equal(r.tipo, 'error'); assert.equal(p.errores, 1); assert.equal(p.piezas[1].colocada, false); assert.equal(p.estado, 'juego');
  assert.equal(L.tomar(p, 1).tipo, 'tomada');
});
prueba('con 15 colocadas falta una: todavía se juega', () => {
  const p = jugando(13); for (const i of TODAS.slice(0, 15)) mover(p, i, i);
  assert.equal(p.colocadas, 15); assert.equal(p.estado, 'juego'); assert.equal(mover(p, 15, 15).tipo, 'encaje'); assert.equal(p.estado, 'ganada');
});
prueba('3 errores y se pierde; después no se puede tomar nada', () => {
  const p = jugando(10);
  mover(p, 0, 1); mover(p, 0, 2); assert.equal(p.estado, 'juego');
  const r = mover(p, 3, ajena(p, 3)); assert.equal(r.errores, 3); assert.equal(p.estado, 'perdida'); assert.equal(p.motivo, 'errores');
  assert.ok(p.piezas.every((_, i) => L.tomar(p, i).tipo === 'ignorado'));
});
prueba('el reloj solo corre en el juego; a los 60 s se pierde por tiempo', () => {
  const p = L.crearPartida(11); L.avanzar(p, 5); assert.equal(p.tiempo, 60);   // en la vista previa no corre
  L.terminarVista(p); for (let k = 0; k < 59; k++) assert.equal(L.avanzar(p, 1), false);
  assert.equal(p.estado, 'juego'); assert.ok(Math.abs(p.tiempo - 1) < 1e-9);
  assert.equal(L.avanzar(p, 1.5), true); assert.equal(p.tiempo, 0); assert.equal(p.estado, 'perdida'); assert.equal(p.motivo, 'tiempo');
  assert.equal(L.tomar(p, 0).tipo, 'ignorado'); assert.equal(L.avanzar(p, 1), false);
});
prueba('si se acaba el tiempo con una pieza en la mano, soltarla ya no cuenta', () => {
  const p = jugando(12); L.tomar(p, 0); L.avanzar(p, 61);
  assert.equal(L.soltar(p, 0, 0).tipo, 'ignorado'); assert.equal(p.colocadas, 0);
});
prueba('las 16 piezas ganan, también con 2 errores en el camino; luego el reloj se detiene', () => {
  for (const errores of [0, 1, 2]) {
    const p = jugando(20 + errores);
    for (let e = 0; e < errores; e++) mover(p, 0, ajena(p, 0));
    for (const i of p.bandeja) { const r = mover(p, i, i); assert.equal(r.tipo, 'encaje'); }
    assert.equal(p.estado, 'ganada'); assert.equal(p.motivo, 'victoria'); assert.equal(p.colocadas, L.PIEZAS); assert.equal(p.errores, errores);
    assert.equal(p.orden.length, L.PIEZAS); const t = p.tiempo; assert.equal(L.avanzar(p, 10), false); assert.equal(p.tiempo, t);
  }
});

console.log(`\n${bien} pruebas bien${process.exitCode ? ', hay fallas' : ''}`);
