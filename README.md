# Minijuegos de activación de marca · maquetas

Maquetas jugables de tres minijuegos para pantallas táctiles, usados en activaciones de marca en punto de venta (tótems verticales de 1080×1920 y pantallas horizontales de 1920×1080). Primera marca cliente: Baby Finger.

Estas maquetas son la referencia visual y de reglas de juego. La versión de producción se construyó como un monorepo con React, PixiJS y Capacitor, empaquetada para Android y Android TV.

## Juegos

| Juego | Reglas |
| --- | --- |
| [Memoria](memoria/) | 8 parejas; se pierde con 3 errores. |
| [Rompecabezas](rompecabezas/) | 16 piezas en 60 segundos; se pierde con 3 errores o al acabarse el tiempo. |
| [Sopa de letras](sopa-de-letras/) | Encontrar las palabras ocultas en la cuadrícula. |

## Cómo verlas

Sin instalar nada, abre `index.html` en el navegador.

Para trabajar en una maqueta con recarga automática y vista vertical y horizontal lado a lado (solo requiere Node):

```bash
node scripts/vista-maqueta.mjs memoria
# http://localhost:5190/        la maqueta
# http://localhost:5190/__vista vertical y horizontal lado a lado
```

## Pruebas

La lógica de cada juego está separada de la interfaz (`logica.js`) y tiene pruebas sin dependencias:

```bash
node memoria/pruebas.mjs        # 12 pruebas
node rompecabezas/pruebas.mjs   # 16 pruebas
```

## Archivo para compartir

`empaquetar.mjs` genera un único HTML con fuentes, imágenes, sonidos y lógica incrustados, que se abre con doble clic sin servidor ni internet:

```bash
node memoria/empaquetar.mjs     # crea memoria/memoria-compartible.html
```

## Stack

HTML, CSS y JavaScript sin frameworks ni dependencias · Node.js para pruebas y herramientas · Fuente Fredoka (licencia OFL, incluida).

---

Alexander Urbaneja · [LinkedIn](https://www.linkedin.com/in/alexanderojas)
