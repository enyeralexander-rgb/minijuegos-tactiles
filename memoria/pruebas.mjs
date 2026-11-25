// Pruebas de las reglas de la memoria (logica.js). Solo Node, sin dependencias.
// Uso: node memoria/pruebas.mjs
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const L = createRequire(import.meta.url)('./logica.js');
let bien = 0;
function prueba(nombre, fn) {
  try { fn(); bien++; console.log('  ok   ' + nombre); }
  catch (e) { console.log('  MAL  ' + nombre + '\n       ' + e.message); process.exitCode = 1; }
}
const contar = arr => arr.reduce((m, x) => (m[x] = (m[x] || 0) + 1, m), {});
// juega a la perfección: busca la pareja de cada carta
function parejaDe(p, i) { return p.cartas.findIndex((c, j) => j !== i && c.id === p.cartas[i].id); }
function fallarUna(p) {
  const i = p.cartas.findIndex(c => !c.emparejada && !c.arriba);
  const j = p.cartas.findIndex((c, k) => k !== i && !c.emparejada && !c.arriba && c.id !== p.cartas[i].id);
  L.tocar(p, i); L.tocar(p, j); const r = L.resolver(p); L.taparError(p); L.desbloquear(p); return r;
}

console.log('Reparto');
prueba('16 cartas, 8 imágenes distintas de las 9, cada una dos veces', () => {
  for (let s = 1; s <= 2000; s++) {
    const r = L.repartir(s), n = contar(r.cartas);
    assert.equal(r.cartas.length, 16);
    assert.equal(Object.keys(n).length, 8);
    assert.ok(Object.values(n).every(v => v === 2));
    assert.ok(Object.keys(n).every(id => L.IMAGENES.includes(id)));
    assert.equal(new Set(r.elegidas).size, 8);
  }
});
prueba('cada una de las 9 imágenes queda fuera alguna vez (también el logo)', () => {
  const fuera = {};
  for (let s = 1; s <= 1800; s++) { const r = L.repartir(s); L.IMAGENES.filter(id => !r.elegidas.includes(id)).forEach(id => fuera[id] = (fuera[id] || 0) + 1); }
  for (const id of L.IMAGENES) assert.ok((fuera[id] || 0) > 120, `${id} quedó fuera ${fuera[id] || 0} veces de 1800`);
});
prueba('la misma semilla repite la partida y otra semilla la cambia', () => {
  assert.deepEqual(L.repartir(123).cartas, L.repartir(123).cartas);
  assert.notDeepEqual(L.repartir(123).cartas, L.repartir(124).cartas);
});
prueba('ninguna carta fija: cada posición recibe muchas imágenes distintas y ninguna domina', () => {
  const N = 3000, pos = Array.from({ length: 16 }, () => ({}));
  for (let s = 1; s <= N; s++) L.repartir(s).cartas.forEach((id, i) => pos[i][id] = (pos[i][id] || 0) + 1);
  pos.forEach((m, i) => {
    assert.equal(Object.keys(m).length, 9, `la posición ${i} solo vio ${Object.keys(m).length} imágenes`);
    const max = Math.max(...Object.values(m)) / N;
    assert.ok(max < 0.16, `en la posición ${i} una imagen sale ${(max * 100).toFixed(1)} % de las veces`);
  });
});
prueba('nunca repite el orden de la partida anterior', () => {
  const a = L.repartir(77).cartas; assert.notDeepEqual(L.repartir(77, a).cartas, a);
});

console.log('Partida');
prueba('durante la vista previa los toques no hacen nada', () => {
  const p = L.crearPartida(5);
  assert.equal(p.estado, 'vista'); assert.ok(p.cartas.every(c => c.arriba));
  assert.equal(L.tocar(p, 0).tipo, 'ignorado');
  assert.ok(L.terminarVista(p)); assert.ok(p.cartas.every(c => !c.arriba)); assert.equal(p.estado, 'juego');
});
prueba('el doble toque sobre la misma carta no cuenta', () => {
  const p = L.crearPartida(6); L.terminarVista(p);
  assert.equal(L.tocar(p, 3).tipo, 'primera'); assert.equal(L.tocar(p, 3).tipo, 'ignorado'); assert.deepEqual(p.abiertas, [3]);
});
prueba('con dos cartas abiertas se bloquea hasta resolver, y tras un error hasta taparlas', () => {
  const p = L.crearPartida(7); L.terminarVista(p);
  const i = 0, j = p.cartas.findIndex(c => c.id !== p.cartas[0].id), k = p.cartas.findIndex((c, x) => x !== i && x !== j);
  L.tocar(p, i); assert.equal(L.tocar(p, j).tipo, 'segunda');
  assert.equal(L.tocar(p, k).tipo, 'ignorado');
  assert.equal(L.resolver(p).tipo, 'error'); assert.equal(p.errores, 1);
  assert.equal(L.tocar(p, k).tipo, 'ignorado');            // las dos no pareja se siguen mostrando
  L.taparError(p); assert.equal(L.tocar(p, k).tipo, 'ignorado');   // todavía giran
  L.desbloquear(p); assert.equal(L.tocar(p, k).tipo, 'primera');
  assert.ok(!p.cartas[i].arriba && !p.cartas[j].arriba);
});
prueba('una pareja queda arriba, no se puede volver a tocar y no cuenta error', () => {
  const p = L.crearPartida(8); L.terminarVista(p); const j = parejaDe(p, 0);
  L.tocar(p, 0); L.tocar(p, j); const r = L.resolver(p);
  assert.equal(r.tipo, 'pareja'); assert.equal(p.parejas, 1); assert.equal(p.errores, 0); assert.equal(p.bloqueada, false);
  assert.equal(L.tocar(p, 0).tipo, 'ignorado'); assert.equal(L.tocar(p, j).tipo, 'ignorado');
});
prueba('3 errores y se pierde; después ningún toque vale', () => {
  const p = L.crearPartida(9); L.terminarVista(p);
  fallarUna(p); fallarUna(p); assert.equal(p.estado, 'juego');
  const r = fallarUna(p); assert.equal(r.errores, 3); assert.equal(p.estado, 'perdida');
  assert.ok(p.cartas.every((c, i) => L.tocar(p, i).tipo === 'ignorado'));
});
prueba('las 8 parejas ganan, también con 2 errores en el camino', () => {
  for (const errores of [0, 1, 2]) {
    const p = L.crearPartida(10 + errores); L.terminarVista(p);
    for (let e = 0; e < errores; e++) fallarUna(p);
    while (p.estado === 'juego') { const i = p.cartas.findIndex(c => !c.emparejada); L.tocar(p, i); L.tocar(p, parejaDe(p, i)); L.resolver(p); }
    assert.equal(p.estado, 'ganada'); assert.equal(p.parejas, 8); assert.equal(p.errores, errores);
    assert.equal(p.orden.length, 8); assert.ok(p.cartas.every(c => c.emparejada));
  }
});
prueba('resolver sin dos cartas abiertas no hace nada', () => {
  const p = L.crearPartida(11); L.terminarVista(p); assert.equal(L.resolver(p), null);
  L.tocar(p, 0); assert.equal(L.resolver(p), null); assert.equal(p.errores, 0);
});

console.log(`\n${bien} pruebas bien${process.exitCode ? ', hay fallas' : ''}`);
