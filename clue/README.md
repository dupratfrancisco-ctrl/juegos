# Clue

Clue para celulares, de 2 a 6 jugadores, con tablero y dado: online con código (vía un servidor
MQTT público), contra la IA o en el mismo celular. Página estática, sin servidor propio.

- `engine.js`: tablero, reglas e IA (funciones puras; se pueden probar con Node).
- `index.html`: pantallas, red y chat.

## Publicar en Vercel

1. En vercel.com → **Add New… → Project** → importá este repositorio.
2. En **Root Directory** elegí `clue`.
3. En **Framework Preset** dejá **Other** y tocá **Deploy**.
