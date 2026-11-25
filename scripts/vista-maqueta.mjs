#!/usr/bin/env node
// Servidor local para ver una maqueta HTML mientras se trabaja en ella.
// La página se recarga sola cada vez que se guarda un archivo de la carpeta.
//
// Uso:  node scripts/vista-maqueta.mjs <juego> [puerto]
//   http://localhost:5190/          la maqueta (index.html)
//   http://localhost:5190/__vista   vertical (1080x1920) y horizontal (1920x1080) lado a lado
//   http://localhost:5190/__vista?p=/otra.html   lo mismo con otro archivo de la carpeta
//
// No usa dependencias: solo Node. Escucha únicamente en esta Mac (127.0.0.1).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const carpeta = path.resolve(process.argv[2] ?? '.');
const puerto = Number(process.argv[3] ?? 5190);

if (!fs.existsSync(carpeta) || !fs.statSync(carpeta).isDirectory()) {
  console.error(`No existe la carpeta: ${carpeta}`);
  process.exit(1);
}

const tipos = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
};

// Pedazo que se agrega a cada HTML para que se recargue al guardar.
const scriptRecarga =
  "<script>new EventSource('/__recarga').onmessage = () => location.reload();</script>";

// Página con las dos orientaciones. Cada marco tiene el tamaño real de la pantalla
// y se reduce con transform para que quepan los dos en la ventana.
function paginaVista(ruta) {
  const src = JSON.stringify(ruta);
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Vista de la maqueta</title>
<style>
  body { margin: 0; background: #1b1b1f; color: #ddd; font: 14px system-ui, sans-serif; }
  .fila { display: flex; gap: 24px; padding: 16px; align-items: flex-start; }
  .caja { flex: none; }
  .caja p { margin: 0 0 6px; }
  .marco { overflow: hidden; outline: 1px solid #444; }
  iframe { border: 0; transform-origin: 0 0; background: #000; }
</style></head><body>
<div class="fila">
  <div class="caja"><p>Vertical 1080 x 1920</p><div class="marco" id="mv"><iframe id="v" width="1080" height="1920"></iframe></div></div>
  <div class="caja"><p>Horizontal 1920 x 1080</p><div class="marco" id="mh"><iframe id="h" width="1920" height="1080"></iframe></div></div>
</div>
<script>
  const ruta = ${src};
  document.getElementById('v').src = ruta;
  document.getElementById('h').src = ruta;
  function ajustar() {
    // Una sola escala para los dos, de modo que se comparen al mismo tamaño:
    // juntos miden 1080 + 1920 de ancho y el más alto mide 1920.
    const alto = window.innerHeight - 60;
    const ancho = window.innerWidth - 72;
    const e = Math.min(alto / 1920, ancho / (1080 + 1920));
    for (const [id, marco, w, h] of [['v', 'mv', 1080, 1920], ['h', 'mh', 1920, 1080]]) {
      document.getElementById(id).style.transform = 'scale(' + e + ')';
      const m = document.getElementById(marco);
      m.style.width = w * e + 'px';
      m.style.height = h * e + 'px';
    }
  }
  window.addEventListener('resize', ajustar);
  ajustar();
</script>
</body></html>`;
}

const clientes = new Set();

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/__recarga') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
    });
    res.write(': conectado\n\n');
    clientes.add(res);
    req.on('close', () => clientes.delete(res));
    return;
  }

  if (url.pathname === '/__vista') {
    res.writeHead(200, { 'Content-Type': tipos['.html'], 'Cache-Control': 'no-store' });
    res.end(paginaVista(url.searchParams.get('p') ?? '/'));
    return;
  }

  // Nada fuera de la carpeta de la maqueta.
  let ruta = path.join(carpeta, decodeURIComponent(url.pathname));
  if (ruta !== carpeta && !ruta.startsWith(carpeta + path.sep)) {
    res.writeHead(403).end('Fuera de la carpeta');
    return;
  }
  if (fs.existsSync(ruta) && fs.statSync(ruta).isDirectory()) ruta = path.join(ruta, 'index.html');
  if (!fs.existsSync(ruta)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No existe: ' + url.pathname);
    return;
  }

  const ext = path.extname(ruta).toLowerCase();
  const cabeceras = { 'Content-Type': tipos[ext] ?? 'application/octet-stream', 'Cache-Control': 'no-store' };

  if (ext === '.html') {
    let html = fs.readFileSync(ruta, 'utf8');
    html = html.includes('</body>') ? html.replace('</body>', scriptRecarga + '</body>') : html + scriptRecarga;
    res.writeHead(200, cabeceras).end(html);
    return;
  }
  res.writeHead(200, cabeceras);
  fs.createReadStream(ruta).pipe(res);
});

// Al guardar llegan varios avisos seguidos; se espera un momento y se recarga una sola vez.
let espera = null;
fs.watch(carpeta, { recursive: true }, () => {
  clearTimeout(espera);
  espera = setTimeout(() => {
    for (const cliente of clientes) cliente.write('data: recarga\n\n');
  }, 150);
});

servidor.listen(puerto, '127.0.0.1', () => {
  console.log(`Maqueta: http://localhost:${puerto}/`);
  console.log(`Vertical y horizontal: http://localhost:${puerto}/__vista`);
  console.log(`Carpeta: ${carpeta}`);
});
