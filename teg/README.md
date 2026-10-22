# TEG

TEG, el juego de la guerra, para celulares: de 2 a 6 jugadores, con los 50 países clásicos, objetivos
secretos, tarjetas y canjes. Online con código (vía un servidor MQTT público, con chat), contra la IA
(fácil, medio o difícil) o en el mismo celular. Página estática, sin servidor propio.

- `engine.js`: mapa, reglas e IA (funciones puras; se pueden probar con Node).
- `map.js`: forma de cada país con la disposición del tablero clásico, lugar de las fichas y rutas por mar.
- `board.jpg`: el tablero completo pintado (título, hemisferios, mares, rutas, sol, rosa de los vientos y medallones), generado a partir de esas formas.
- `index.html`: pantallas, mapa (se mueve con el dedo y tiene zoom), red y chat.

## Publicar en Vercel

1. En vercel.com → **Add New… → Project** → importá este repositorio.
2. En **Root Directory** elegí `teg`.
3. En **Framework Preset** dejá **Other** y tocá **Deploy**.
