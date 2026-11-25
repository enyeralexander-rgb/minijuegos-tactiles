// Arma sopa-de-letras-compartible.html: un solo archivo que abre sin servidor ni internet,
// con las fuentes, las imágenes y los sonidos incrustados.
// Uso: node sopa-de-letras/empaquetar.mjs
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
  html = html.replace(`url(${r}) format('truetype')`, `url(data:font/ttf;base64,${b64(r)}) format('truetype')`);
}

// imágenes y sonidos que usa la maqueta (las rutas son las mismas que pide el código)
const tipos = { '.png': 'image/png', '.mp3': 'audio/mpeg' };
const recursos = ['img/logo.png', 'img/bebe-sentado.png', 'img/bebe-ingeniero.png', 'img/panal-pants.png', 'img/panal-g.png',
  'sonidos/victoria.mp3', 'sonidos/musica-fondo.mp3'];
const EMB = {};
for (const r of recursos) EMB[r] = `data:${tipos[path.extname(r)]};base64,${b64(r)}`;

const marca = "<script>\n'use strict';";
if (!html.includes(marca)) throw new Error('No encontré el inicio del script principal');
html = html.replace(marca, `<script>window.__SOPA_EMB=${JSON.stringify(EMB)};</script>\n${marca}`);
html = html.replace('<title>Sopa de letras Baby Finger</title>',
  '<title>Sopa de letras Baby Finger</title>\n<!-- Archivo para compartir: todo incrustado, abre sin servidor ni internet. Créditos y licencias en CREDITOS.md de la maqueta. -->');

if (/(src|href)=["']https?:/.test(html)) console.warn('Ojo: quedan enlaces a internet en el HTML');
const salida = path.join(aqui, 'sopa-de-letras-compartible.html');
fs.writeFileSync(salida, html);
const kb = (n) => Math.round(n / 1024) + ' KB';
for (const r of recursos) console.log(r.padEnd(28), kb(EMB[r].length));
console.log('total', kb(fs.statSync(salida).size));
