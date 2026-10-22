# Póker

Póker Texas Hold'em sin límite para celulares y compu, de 2 a 8 jugadores, con fichas virtuales y ciegas que suben.
Online con código (vía un servidor MQTT público, con chat), contra la IA (fácil, medio o difícil) o en el mismo
celular, tapando las cartas en cada turno. Página estática, sin servidor propio.

- `engine.js`: cartas, valor de las manos, apuestas, pozos laterales e IA (funciones puras; se pueden probar con Node).
- `index.html`: pantallas, mesa, red y chat.
