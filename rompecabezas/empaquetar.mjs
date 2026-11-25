// Arma rompecabezas-compartible.html: un solo archivo que abre con doble clic, sin servidor ni internet, con las
// reglas, las fuentes, las imágenes y los sonidos incrustados.
// Uso: node rompecabezas/empaquetar.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const leer = (r) => fs.readFileSync(path.join(aqui, r));
const b64 = (r) => leer(r).toString('base64');

let html = leer('index.html').toString('utf8');

// fuentes
for (const peso of ['Bold', 'SemiBold']) {
  const r = `fuentes/Fredoka-${peso}.ttf`;
  if (!html.includes(`url(${r})`)) throw new Error('No encontré la fuente ' + r);
  html = html.replace(`url(${r}) format('truetype')`, `url(data:font/ttf;base64,${b64(r)}) format('truetype')`);
}

// las reglas van dentro del archivo
const etiquetaLogica = '<script src="logica.js"></script>';
if (!html.includes(etiquetaLogica)) throw new Error('No encontré la carga de logica.js');
html = html.replace(etiquetaLogica, () => `<script>\n${leer('logica.js').toString('utf8')}</script>`);

// imágenes y sonidos (las rutas son las mismas que pide el código)
const tipos = { '.png': 'image/png', '.mp3': 'audio/mpeg' };
const recursos = ['img/logo.png', 'img/bebe-sentado.png', 'img/bebe-ingeniero.png', 'img/panal-pants.png', 'img/panal-g.png',
  'img/panal-acuatico.png', 'img/toallita-azul.png', 'img/toallita-blanca.png', 'img/toallita-rosa.png',
  'sonidos/victoria.mp3', 'sonidos/voltear.mp3', 'sonidos/colocar.mp3', 'sonidos/barajar.mp3', 'sonidos/abanico.mp3',
  'sonidos/musica-fondo.mp3'];
const EMB = {};
for (const r of recursos) {
  if (!html.includes(`'${r}'`)) throw new Error('El código ya no pide ' + r);
  EMB[r] = `data:${tipos[path.extname(r)]};base64,${b64(r)}`;
}

const marca = "<script>\n'use strict';\n(() => {";
if (!html.includes(marca)) throw new Error('No encontré el inicio del script principal');
html = html.replace(marca, () => `<script>window.__ROMPE_EMB=${JSON.stringify(EMB)};</script>\n${marca}`);
html = html.replace('<title>Rompecabezas Baby Finger</title>',
  '<title>Rompecabezas Baby Finger</title>\n<!-- Archivo para compartir: todo incrustado, abre sin servidor ni internet. Créditos y licencias en CREDITOS.md de la maqueta. -->');

if (/(src|href)=["']https?:/.test(html)) console.warn('Ojo: quedan enlaces a internet en el HTML');
const salida = path.join(aqui, 'rompecabezas-compartible.html');
fs.writeFileSync(salida, html);
const kb = (n) => Math.round(n / 1024) + ' KB';
for (const r of recursos) console.log(r.padEnd(28), kb(EMB[r].length));
console.log('total', kb(fs.statSync(salida).size));
