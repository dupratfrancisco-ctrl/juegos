/* Dibujos de las habitaciones del tablero, vistas desde arriba (SVG propio, con los muebles y colores de cada lugar).
   Cada función recibe el ancho y el alto de la habitación en décimas de casilla y devuelve el contenido del SVG. */
(function (root) {
  const INK = "#2b1d12";
  const r = (x, y, w, h, fill, extra = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
  const c = (x, y, rad, fill, extra = "") => `<circle cx="${x}" cy="${y}" r="${rad}" fill="${fill}" ${extra}/>`;
  const st = (w = .6) => `stroke="${INK}" stroke-width="${w}"`;
  const planks = (W, H, a, b, step = 6, vertical = false) => r(0, 0, W, H, a) + Array.from({ length: Math.ceil((vertical ? W : H) / step) }, (_, i) =>
    vertical ? r(i * step, 0, .5, H, b) : r(0, i * step, W, .5, b)).join("");
  const checker = (W, H, a, b, s = 6) => r(0, 0, W, H, a) + Array.from({ length: Math.ceil(H / s) }, (_, y) => Array.from({ length: Math.ceil(W / s) }, (_, x) => (x + y) % 2 ? r(x * s, y * s, s, s, b) : "").join("")).join("");
  const walls = (W, H, col, t = 3) => `<rect x="${t / 2}" y="${t / 2}" width="${W - t}" height="${H - t}" fill="none" stroke="${col}" stroke-width="${t}"/>`;
  const books = (x, y, w, h, n) => r(x, y, w, h, "#6b4423", st(.4)) + Array.from({ length: n }, (_, i) => r(x + .6 + i * (w - 1.2) / n, y + .6, (w - 1.2) / n - .3, h - 1.2, ["#c0392b", "#2e86c1", "#f1c40f", "#27ae60", "#8e44ad", "#e67e22"][i % 6])).join("");
  const chair = (x, y, col, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot})">${r(-2, -2, 4, 4, col, st(.4) + ' rx="1"')}${r(-2, -2.8, 4, 1.4, col, st(.4) + ' rx=".6"')}</g>`;
  const plant = (x, y, s = 3) => c(x, y, s, "#2e8b3e", st(.4)) + c(x - s * .4, y - s * .3, s * .5, "#3fae52") + c(x + s * .35, y + s * .2, s * .45, "#3fae52");

  const ART = {
    // Tienda de historietas: estantes con revistas, mesas exhibidoras, mostrador con caja.
    r0: (W, H) => planks(W, H, "#b07a49", "#94643a") + walls(W, H, "#6d4c2f") +
      books(4, 3.5, W * .55, 4, 12) + r(W - 16, 3.5, 12, 4, "#4a3423", st(.4)) +
      [0, 1, 2].map(i => r(8 + i * 16, 14, 11, 7, "#7b5a3a", st(.4)) + [0, 1, 2].map(k => r(9 + i * 16 + k * 3.4, 15, 2.8, 2.4, ["#e74c3c", "#3498db", "#f1c40f"][(i + k) % 3]) + r(9 + i * 16 + k * 3.4, 18, 2.8, 2.4, ["#9b59b6", "#2ecc71", "#e67e22"][(i + k) % 3])).join("")).join("") +
      r(W - 18, H - 11, 14, 6, "#5b3b22", st(.5)) + r(W - 9, H - 10, 3.6, 2.6, "#9aa5ab", st(.3)) + c(W - 21, H - 8, 1.8, "#c0392b", st(.3)) +
      r(4, H - 9, 9, 5, "#3d6b8f", st(.4)) + r(5, H - 8, 7, 3, "#a9d0ea"),
    // Mansión Burns: bibliotecas, ventanales con cortinas, alfombra roja y escritorio.
    r1: (W, H) => planks(W, H, "#3d2a1a", "#2f2013", 5, true) + walls(W, H, "#24502c", 3.5) +
      r(W * .3, 3, W * .4, 6, "#cfe6f2", st(.4)) + r(W * .3 - 2, 3, 4, 8, "#b3262e", st(.3)) + r(W * .7 - 2, 3, 4, 8, "#b3262e", st(.3)) +
      books(3.5, 10, 6, H - 22, 1) + books(W - 9.5, 10, 6, H - 22, 1) +
      Array.from({ length: 8 }, (_, i) => r(4, 11 + i * (H - 24) / 8, 5, (H - 24) / 8 - .6, ["#c0392b", "#2e86c1", "#f1c40f", "#27ae60"][i % 4]) + r(W - 9, 11 + i * (H - 24) / 8, 5, (H - 24) / 8 - .6, ["#27ae60", "#c0392b", "#8e44ad", "#e67e22"][i % 4])).join("") +
      r(W * .3, 12, W * .4, H - 15, "#b3262e", st(.4)) + r(W * .3 + 1.2, 13.2, W * .4 - 2.4, H - 17.4, "none", 'stroke="#e5b84b" stroke-width=".7"') +
      r(W * .5 - 9, H * .45, 18, 8, "#6b4423", st(.5) + ' rx="1"') + c(W * .5 - 5, H * .45 + 2.5, 1.4, "#2ecc71", st(.3)) + r(W * .5 + 1, H * .45 + 2, 6, 4, "#f4ead2", st(.3)) +
      chair(W * .5, H * .45 + 12, "#7d1e22") + r(W * .5 - 6, H - 9, 12, 3, "#4a3423", st(.4)),
    // Estudios de Krusty: escenario de madera, telón rojo, cámaras y cartel.
    r2: (W, H) => planks(W, H, "#c48a4a", "#a8743a", 5, true) + walls(W, H, "#6a2c7a") +
      r(W - 14, 3, 11, H - 6, "#b3262e", st(.4)) + Array.from({ length: Math.floor((H - 6) / 3) }, (_, i) => r(W - 14, 3 + i * 3, 11, .5, "#7d1a1f")).join("") +
      `<path d="M${W - 26} 6 Q${W - 18} ${H / 2} ${W - 26} ${H - 6}" fill="none" stroke="#7a4a1f" stroke-width="1.2"/>` +
      r(3, 3, 7, H - 6, "#5a1f66", st(.4)) + `<text x="6.5" y="${H / 2}" font-family="Luckiest Guy,Arial Black" font-size="5" fill="#f7d417" text-anchor="middle" transform="rotate(-90 6.5 ${H / 2})">KRUSTY</text>` +
      [[20, H * .3], [22, H * .7], [36, H * .5]].map(([x, y]) => `<g transform="translate(${x} ${y})">${r(-3, -2, 6, 4, "#4d4d4d", st(.4))}${r(3, -1, 3, 2, "#2b2b2b")}${c(-4, 0, 1.2, "#7f8c8d")}<line x1="0" y1="2" x2="-3" y2="6" stroke="${INK}" stroke-width=".5"/><line x1="0" y1="2" x2="3" y2="6" stroke="${INK}" stroke-width=".5"/></g>`).join("") +
      c(W - 22, H * .5, 2.2, "#f39c12", st(.4)) + `<path d="M${W - 22} ${H * .5} L${W - 15} ${H * .35} L${W - 15} ${H * .65}Z" fill="#fff6a8" opacity=".55"/>`,
    // El Holandés Frito: piso lila, mesas redondas con sillas, plantas.
    r3: (W, H) => checker(W, H, "#b9a0d8", "#a68bc8", 5) + walls(W, H, "#7a4a2f") +
      [[W * .22, H * .35], [W * .5, H * .35], [W * .78, H * .35], [W * .36, H * .72], [W * .64, H * .72]].map(([x, y]) =>
        [0, 90, 180, 270].map(a => chair(x + Math.cos(a * Math.PI / 180) * 6, y + Math.sin(a * Math.PI / 180) * 6, "#8e5a2b", a + 90)).join("") + c(x, y, 4.2, "#5fa8d3", st(.5)) + c(x, y, 1.2, "#f4ead2")).join("") +
      plant(5, 5) + plant(W - 5, 5) + plant(5, H - 5) + plant(W - 5, H - 5) + r(W * .4, 2.5, W * .2, 2.5, "#e74c3c", st(.3)),
    // Bolera de Barney: barra con banquetas a la izquierda y pistas con pinos.
    r4: (W, H) => r(0, 0, W, H, "#d8d0c4") + walls(W, H, "#b8322a") +
      r(3, 3, W * .3, H - 6, "#c0392b") + r(4, 4, W * .3 - 2, H - 8, "#d4483a") +
      r(W * .3 - 6, 6, 4, H - 12, "#6b4423", st(.4)) + Array.from({ length: Math.floor((H - 14) / 6) }, (_, i) => c(W * .3 - 9, 9 + i * 6, 1.6, "#f39c12", st(.3))).join("") +
      r(6, 6, 9, 5, "#f4ead2", st(.3)) + r(6, H - 12, 10, 6, "#7b5a3a", st(.3)) +
      Array.from({ length: 4 }, (_, i) => { const y = 5 + i * (H - 10) / 4, h = (H - 10) / 4 - 1.5, x0 = W * .34;
        return r(x0, y, W - x0 - 3, h, "#e1b878") + Array.from({ length: 6 }, (_, k) => r(x0, y + k * h / 6, W - x0 - 3, .3, "#c99a58")).join("") +
          r(x0, y + h, W - x0 - 3, 1.2, "#8d6239") + [[0, 0], [1.6, -1], [1.6, 1], [3.2, -2], [3.2, 0], [3.2, 2]].map(([dx, dy]) => c(W - 9 + dx, y + h / 2 + dy, .65, "#fff", st(.2))).join("") +
          c(x0 + 6 + i * 5, y + h / 2, 1.3, ["#2c3e50", "#8e44ad", "#c0392b", "#16a085"][i]); }).join(""),
    // Casa Simpson: paredes rosas, alfombra ovalada, sillón, tele y lámpara.
    r5: (W, H) => planks(W, H, "#b88a5a", "#a07548", 5) + walls(W, H, "#f19bb5", 3.5) +
      `<ellipse cx="${W / 2}" cy="${H * .52}" rx="${W * .3}" ry="${H * .25}" fill="#7fb3d5" ${st(.4)}/><ellipse cx="${W / 2}" cy="${H * .52}" rx="${W * .22}" ry="${H * .17}" fill="#e8d6a8"/>` +
      r(W * .25, H - 13, W * .5, 8, "#8e5fb0", st(.5) + ' rx="2"') + r(W * .25, H - 9, W * .5, 4, "#a678c8", 'rx="1.5"') +
      r(W * .38, 4.5, W * .24, 6, "#5d4037", st(.5)) + r(W * .41, 5.5, W * .18, 4, "#7fc8e8", st(.3)) +
      c(6.5, H - 8, 2.4, "#f7e08a", st(.4)) + r(W - 12, H * .3, 7, 4.5, "#8b5a2b", st(.4)) + r(4.5, H * .25, 2, 8, "#f4ead2", st(.3)) +
      `<path d="M${W - 10} 5 L${W - 6} 5 L${W - 8} 2.5Z" fill="#fff" ${st(.3)}/>`,
    // Castillo de jubilados: alfombra roja, mesa de ping-pong, sillones y tele.
    r6: (W, H) => r(0, 0, W, H, "#b8433a") + Array.from({ length: 10 }, (_, i) => r(0, i * H / 10, W, .3, "#a3362e")).join("") + walls(W, H, "#8a5a3a") +
      r(W * .18, H * .3, W * .5, H * .38, "#2f8f4a", st(.6)) + r(W * .43 - .3, H * .3, .6, H * .38, "#fff") + r(W * .18, H * .49 - .3, W * .5, .6, "#fff") +
      c(W * .3, H * .38, 1, "#f39c12") + r(W * .12, H * .44, 2, 4, "#c0392b", st(.3)) + r(W * .7, H * .5, 2, 4, "#2e86c1", st(.3)) +
      [[W - 9, 9], [W - 9, H - 9], [9, H - 8]].map(([x, y]) => `<g transform="translate(${x} ${y})">${r(-4, -4, 8, 8, "#7b4a2b", st(.4) + ' rx="1.5"')}${r(-3, -3, 6, 5.5, "#a0623a", 'rx="1"')}</g>`).join("") +
      r(W * .3, 3.5, W * .2, 4.5, "#3d3d3d", st(.4)) + r(W * .32, 4.3, W * .16, 3, "#7fc8e8"),
    // Planta nuclear: piso celeste, consola en U con luces, silla de Homero, franjas de peligro.
    r7: (W, H) => checker(W, H, "#b7d3ee", "#a2c2e2", 5) + walls(W, H, "#6b7d8f") +
      Array.from({ length: Math.ceil(W / 4) }, (_, i) => `<path d="M${i * 4} 3 l2 0 l-2 3 l-2 0Z" fill="#f1c40f"/>`).join("") + r(0, 3, W, 3, "none", 'stroke="#2b2b2b" stroke-width=".4"') +
      `<path d="M${W * .18} ${H * .3} L${W * .18} ${H * .62} Q${W * .18} ${H * .82} ${W * .5} ${H * .82} Q${W * .82} ${H * .82} ${W * .82} ${H * .62} L${W * .82} ${H * .3}" fill="none" stroke="#2c3e70" stroke-width="7"/>` +
      `<path d="M${W * .18} ${H * .3} L${W * .18} ${H * .62} Q${W * .18} ${H * .82} ${W * .5} ${H * .82} Q${W * .82} ${H * .82} ${W * .82} ${H * .62} L${W * .82} ${H * .3}" fill="none" stroke="#e74c3c" stroke-width=".8" stroke-dasharray="1 2.2"/>` +
      `<path d="M${W * .18 + 2} ${H * .3} L${W * .18 + 2} ${H * .6}" stroke="#2ecc71" stroke-width=".8" stroke-dasharray="1 2"/><path d="M${W * .82 - 2} ${H * .3} L${W * .82 - 2} ${H * .6}" stroke="#f1c40f" stroke-width=".8" stroke-dasharray="1 2"/>` +
      chair(W * .5, H * .58, "#4a4a4a") + c(W * .5 + 7, H * .72, 1.8, "#e75f9b", st(.3)) + c(W * .5 + 7, H * .72, .6, "#b7d3ee") +
      [W * .3, W * .5, W * .7].map(x => c(x, H - 6, 2.8, "#3fbf3f", st(.4)) + c(x, H - 6, 1.2, "#b6ff6a")).join(""),
    // Kwik-E-Mart: piso amarillo, góndolas con productos, mostrador, granizados y heladeras.
    r8: (W, H) => checker(W, H, "#f0d66e", "#e3c24b", 5) + walls(W, H, "#1f9d8f") +
      r(W - 8, 4, 4.5, H - 8, "#6fd0e0", st(.4)) + Array.from({ length: 6 }, (_, i) => r(W - 8, 4 + i * (H - 8) / 6, 4.5, .4, INK)).join("") +
      [0, 1, 2].map(i => { const y = 10 + i * (H * .55) / 3; return r(8, y, W - 22, 5, "#d35400", st(.4)) + Array.from({ length: 8 }, (_, k) => r(8.5 + k * (W - 23) / 8, y + .6, (W - 23) / 8 - .6, 1.7, ["#e74c3c", "#3498db", "#2ecc71", "#9b59b6", "#f39c12", "#1abc9c"][(k + i) % 6]) + r(8.5 + k * (W - 23) / 8, y + 2.7, (W - 23) / 8 - .6, 1.7, ["#f1c40f", "#e67e22", "#c0392b", "#2980b9", "#27ae60", "#8e44ad"][(k + i) % 6])).join(""); }).join("") +
      r(5, H - 15, 18, 6, "#8b5a2b", st(.5)) + r(14, H - 14, 4, 3, "#9aa5ab", st(.3)) + c(9, H - 12, 1.3, "#e75f9b", st(.2)) +
      r(4, 4, 6, 6, "#c0392b", st(.4)) + c(5.6, 6.2, 1.2, "#e74c3c") + c(8.4, 6.2, 1.2, "#3498db"),
  };
  const svg = (id, W, H) => `<svg class="art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${ART[id](W, H)}</svg>`;
  root.ROOMART = { svg };
})(this);
