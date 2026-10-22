/* Motor del Clue: tablero, movimiento, sugerencias, acusaciones e IA. Funciones puras sobre el estado.
   Reglas clásicas: un sobre con un sospechoso, un arma y una habitación; el resto de las cartas se reparte.
   En tu turno tirás un dado (o usás un pasadizo), entrás a una habitación y sugerís; el siguiente jugador
   que tenga alguna de esas cartas te muestra una. Si acusás y le errás, quedás afuera (pero seguís mostrando). */
(function (root) {
  // Edición Springfield: personajes, armas y lugares de Los Simpson (nombres y colores, sin dibujos de la serie).
  const SUSPECTS = [
    { id: "s0", name: "Bart Simpson", short: "Bart", color: "#e53935" },
    { id: "s1", name: "Homero Simpson", short: "Homero", color: "#f5f5f5" },
    { id: "s2", name: "Marge Simpson", short: "Marge", color: "#1e66f5" },
    { id: "s3", name: "Lisa Simpson", short: "Lisa", color: "#f57c00" },
    { id: "s4", name: "Señor Burns", short: "Burns", color: "#2e7d32" },
    { id: "s5", name: "Krusty el Payaso", short: "Krusty", color: "#8e24aa" },
  ];
  const WEAPONS = [
    { id: "w0", name: "Rosquilla envenenada" }, { id: "w1", name: "Barra de plutonio" }, { id: "w2", name: "Gomera" },
    { id: "w3", name: "Saxofón" }, { id: "w4", name: "Lata de Duff" }, { id: "w5", name: "Patineta" },
  ];
  // Tablero de 24×25 con la disposición del Clue de Los Simpson. Cada habitación es un rectángulo
  // (x0,y0,x1,y1 inclusive); el recuadro del centro no se pisa.
  const NX = 24, NY = 25, N = NX;
  const ROOMS = [
    { id: "r0", name: "Tienda de historietas", r: [0, 0, 6, 3] },
    { id: "r1", name: "Mansión Burns", r: [9, 0, 14, 6] },
    { id: "r2", name: "Estudios de Krusty", r: [16, 0, 23, 5] },
    { id: "r3", name: "El Holandés Frito", r: [0, 6, 6, 9] },
    { id: "r4", name: "Bolera de Barney", r: [15, 8, 23, 14] },
    { id: "r5", name: "Casa Simpson", r: [0, 12, 5, 16] },
    { id: "r6", name: "Castillo de jubilados", r: [0, 19, 5, 24] },
    { id: "r7", name: "Planta nuclear", r: [8, 17, 15, 24] },
    { id: "r8", name: "Kwik-E-Mart", r: [18, 17, 23, 24] },
  ];
  const CENTER = [9, 8, 13, 14];
  // Puertas: habitación y casilla de pasillo desde la que se entra.
  const DOORS = [
    ["r0", 4, 4], ["r0", 7, 2],
    ["r1", 8, 3], ["r1", 10, 7], ["r1", 13, 7],
    ["r2", 15, 4], ["r2", 20, 6],
    ["r3", 3, 5], ["r3", 7, 8],
    ["r4", 17, 7], ["r4", 14, 10], ["r4", 20, 15],
    ["r5", 2, 11], ["r5", 6, 14],
    ["r6", 4, 18], ["r6", 6, 21],
    ["r7", 9, 16], ["r7", 14, 16], ["r7", 7, 20], ["r7", 16, 20],
    ["r8", 19, 16], ["r8", 17, 21],
  ];
  // Pasadizos secretos: tienda de historietas ↔ Kwik-E-Mart y estudios de Krusty ↔ castillo de jubilados.
  const PASSAGES = { r0: "r8", r8: "r0", r2: "r6", r6: "r2" };
  // Salidas en el borde (Bart, Homero, Marge, Lisa, Burns, Krusty).
  const STARTS = [[15, 0], [16, 24], [0, 17], [23, 7], [7, 24], [0, 5]];
  const CARDS = [...SUSPECTS, ...WEAPONS, ...ROOMS].map(c => c.id);
  const NAME = Object.fromEntries([...SUSPECTS, ...WEAPONS, ...ROOMS].map(c => [c.id, c.name]));

  const inRect = (x, y, r) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];
  function cellKind(x, y) {
    if (x < 0 || y < 0 || x >= NX || y >= NY) return null;
    if (inRect(x, y, CENTER)) return "center";
    const room = ROOMS.find(R => inRect(x, y, R.r));
    return room ? room.id : "hall";
  }
  const clone = o => JSON.parse(JSON.stringify(o));
  function shuffle(a, rnd = Math.random) { for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(rnd() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; }
  const K = (x, y) => x + "," + y;
  const log = (g, s, x) => { g.log = [...(g.log || []), { s, x }].slice(-40); };

  /* ---------- Partida ---------- */
  function setup(g, rnd = Math.random) {
    const pick = list => list[Math.floor(rnd() * list.length)].id;
    g.env = { s: pick(SUSPECTS), w: pick(WEAPONS), r: pick(ROOMS) };
    const rest = shuffle(CARDS.filter(c => c !== g.env.s && c !== g.env.w && c !== g.env.r), rnd);
    g.hands = Array.from({ length: g.n }, () => []);
    rest.forEach((c, i) => g.hands[i % g.n].push(c));
    g.tok = STARTS.map(([x, y]) => ({ x, y })); g.board = 2;
    const rooms = shuffle(ROOMS.map(r => r.id), rnd);
    g.wpos = WEAPONS.map((_, i) => rooms[i]);
    g.moved = Array(6).fill(false);
    g.out = Array(g.n).fill(false);
    g.turn = 0; g.step = "roll"; g.roll = null; g.pending = null; g.sugs = []; g.log = [];
    g.phase = "play"; g.winner = null;
    return g;
  }
  const activeSeats = g => Array.from({ length: g.n }, (_, i) => i).filter(i => !g.out[i]);
  function check(g, seat, steps) {
    if (g.phase !== "play") throw new Error("La partida terminó.");
    if (g.turn !== seat) throw new Error("No es tu turno.");
    if (steps && !steps.includes(g.step)) throw new Error("Ahora no podés hacer eso.");
  }
  const roomOf = p => (p && p.room) || null;

  /* ---------- Movimiento ---------- */
  // Casillas de pasillo y habitaciones a las que puede llegar el jugador con la tirada.
  function reachable(g, seat, steps) {
    const me = g.tok[seat], from = roomOf(me);
    const occ = new Set(g.tok.filter((t, i) => i !== seat && !t.room).map(t => K(t.x, t.y)));
    const dist = new Map(), q = [];
    const push = (x, y, d) => { const k = K(x, y); if (occ.has(k) || dist.has(k) || d > steps) return; dist.set(k, d); q.push([x, y, d]); };
    if (from) DOORS.filter(d => d[0] === from).forEach(([, x, y]) => push(x, y, 1));
    else { dist.set(K(me.x, me.y), 0); q.push([me.x, me.y, 0]); }
    while (q.length) {
      const [x, y, d] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (cellKind(nx, ny) === "hall") push(nx, ny, d + 1);
      }
    }
    const cells = [...dist.entries()].filter(([k, d]) => d > 0 && !(from == null && k === K(me.x, me.y))).map(([k]) => k);
    const rooms = new Set();
    for (const [rid, x, y] of DOORS) {
      if (rid === from) continue;
      const d = dist.get(K(x, y));
      if (d != null && d + 1 <= steps) rooms.add(rid);
    }
    return { cells, rooms: [...rooms] };
  }
  // Distancia en pasos (por pasillos) desde una posición hasta una habitación, ignorando a los demás.
  function distToRoom(pos, target) {
    if (roomOf(pos) === target) return 0;
    const dist = new Map(), q = [];
    const push = (x, y, d) => { const k = K(x, y); if (dist.has(k)) return; dist.set(k, d); q.push([x, y, d]); };
    if (pos.room) DOORS.filter(d => d[0] === pos.room).forEach(([, x, y]) => push(x, y, 1)); else push(pos.x, pos.y, 0);
    while (q.length) {
      const [x, y, d] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (cellKind(nx, ny) === "hall") push(nx, ny, d + 1); }
    }
    let best = Infinity;
    for (const [rid, x, y] of DOORS) if (rid === target && dist.has(K(x, y))) best = Math.min(best, dist.get(K(x, y)) + 1);
    if (pos.room && PASSAGES[pos.room] === target) best = Math.min(best, 1);
    return best;
  }

  function rollDie(g0, seat, rnd = Math.random) {
    const g = clone(g0); check(g, seat, ["roll"]);
    g.roll = 1 + Math.floor(rnd() * 6); g.step = "move"; g.moved[seat] = false;
    log(g, seat, `sacó un ${g.roll}`);
    const r = reachable(g, seat, g.roll);
    if (!r.cells.length && !r.rooms.length) { log(g, seat, "no se pudo mover"); g.step = "end"; }
    return g;
  }
  function moveTo(g0, seat, dest) {
    const g = clone(g0); check(g, seat, ["move"]);
    const r = reachable(g, seat, g.roll);
    if (dest.room) {
      if (!r.rooms.includes(dest.room)) throw new Error("No llegás a esa habitación con esta tirada.");
      g.tok[seat] = { room: dest.room }; g.step = "suggest";
      log(g, seat, `entró a ${NAME[dest.room]}`);
    } else {
      if (!r.cells.includes(K(dest.x, dest.y))) throw new Error("No llegás a esa casilla con esta tirada.");
      g.tok[seat] = { x: dest.x, y: dest.y }; g.step = "end";
    }
    return g;
  }
  function usePassage(g0, seat) {
    const g = clone(g0); check(g, seat, ["roll"]);
    const to = PASSAGES[roomOf(g.tok[seat])];
    if (!to) throw new Error("Desde acá no hay pasadizo secreto.");
    g.tok[seat] = { room: to }; g.moved[seat] = false; g.step = "suggest";
    log(g, seat, `usó el pasadizo secreto a ${NAME[to]}`);
    return g;
  }
  // Si otro jugador te trajo a una habitación con su sugerencia, en tu turno podés sugerir ahí sin moverte.
  function stayAndSuggest(g0, seat) {
    const g = clone(g0); check(g, seat, ["roll"]);
    if (!g.moved[seat] || !roomOf(g.tok[seat])) throw new Error("Solo podés quedarte si te trajeron a esta habitación.");
    g.moved[seat] = false; g.step = "suggest";
    return g;
  }

  /* ---------- Sugerencias ---------- */
  function suggest(g0, seat, s, w, botPick) {
    const g = clone(g0); check(g, seat, ["suggest"]);
    const r = roomOf(g.tok[seat]);
    if (!r) throw new Error("Para sugerir tenés que estar en una habitación.");
    const si = SUSPECTS.findIndex(x => x.id === s), wi = WEAPONS.findIndex(x => x.id === w);
    if (si < 0 || wi < 0) throw new Error("Elegí un sospechoso y un arma.");
    if (si !== seat) { g.tok[si] = { room: r }; g.moved[si] = true; }
    g.wpos[wi] = r;
    const order = Array.from({ length: g.n - 1 }, (_, k) => (seat + 1 + k) % g.n);
    g.pending = { by: seat, s, w, r, order, i: 0, passed: [], shownBy: null, card: null, wait: false, done: false };
    g.step = "disprove";
    log(g, seat, `sugirió: ${NAME[s]} con ${NAME[w]} en ${NAME[r]}`);
    return advance(g, botPick);
  }
  const matchesOf = (g, d) => g.hands[d].filter(c => c === g.pending.s || c === g.pending.w || c === g.pending.r);
  // Avanza la ronda de mostrar cartas hasta que alguien muestre, todos pasen o haya que esperar a una persona.
  function advance(g, botPick) {
    const p = g.pending;
    while (p.i < p.order.length) {
      const d = p.order[p.i], m = matchesOf(g, d);
      if (!m.length) { p.passed.push(d); p.i++; continue; }
      if (m.length === 1) return finish(g, d, m[0]);
      if (g.seats?.[d]?.bot) return finish(g, d, botPick ? botPick(g, d, m) : m[0]);
      p.wait = true; return g;
    }
    return finish(g, null, null);
  }
  function finish(g, d, card) {
    const p = g.pending;
    p.wait = false; p.done = true; p.shownBy = d; p.card = card;
    g.sugs = [...g.sugs, { by: p.by, s: p.s, w: p.w, r: p.r, shownBy: d, card, passed: p.passed.slice() }];
    log(g, d == null ? p.by : d, d == null ? "nadie pudo mostrar una carta" : `le mostró una carta a ${g.seats?.[p.by]?.nick || "Jugador " + (p.by + 1)}`);
    g.step = "end";
    return g;
  }
  function showCard(g0, seat, card) {
    const g = clone(g0), p = g.pending;
    if (!p || !p.wait || p.order[p.i] !== seat) throw new Error("No te toca mostrar una carta.");
    if (!matchesOf(g, seat).includes(card)) throw new Error("Tenés que mostrar una de las cartas sugeridas.");
    return finish(g, seat, card);
  }

  /* ---------- Acusar y terminar el turno ---------- */
  function accuse(g0, seat, s, w, r) {
    const g = clone(g0); check(g, seat, ["roll", "suggest", "end"]);
    const ok = s === g.env.s && w === g.env.w && r === g.env.r;
    log(g, seat, `acusó: ${NAME[s]} con ${NAME[w]} en ${NAME[r]}`);
    if (ok) { g.phase = "over"; g.winner = seat; log(g, seat, "¡resolvió el caso!"); return g; }
    g.out[seat] = true; g.lastWrong = { seat, s, w, r };
    log(g, seat, "se equivocó y queda afuera");
    const act = activeSeats(g);
    if (act.length === 1) { g.phase = "over"; g.winner = act[0]; log(g, act[0], "gana porque es el único que queda"); return g; }
    return nextTurn(g, seat);
  }
  function endTurn(g0, seat) {
    const g = clone(g0); check(g, seat, ["end", "suggest"]);
    return nextTurn(g, seat);
  }
  function nextTurn(g, seat) {
    let t = seat;
    do { t = (t + 1) % g.n; } while (g.out[t]);
    g.turn = t; g.step = "roll"; g.roll = null; g.pending = null;
    return g;
  }

  /* ---------- IA ----------
     Todas recuerdan sus cartas, las que les muestran y quién no tenía qué cartas.
     Fácil: se mueve y sugiere bastante al azar y a veces acusa sin estar segura.
     Medio: va a las habitaciones que le faltan descartar. Difícil: además deduce qué carta le mostró
     cada uno a los demás. */
  function knowledge(g, b, level) {
    const n = g.n, held = new Map(), lacks = Array.from({ length: n }, () => new Set());
    g.hands[b].forEach(c => held.set(c, b));
    for (let i = 0; i < n; i++) if (i !== b) g.hands[b].forEach(c => lacks[i].add(c));
    const cons = [];
    for (const sg of g.sugs) {
      if (sg.by === b && sg.card) held.set(sg.card, sg.shownBy);
      sg.passed.forEach(p => [sg.s, sg.w, sg.r].forEach(c => lacks[p].add(c)));
      if (level === "dificil" && sg.shownBy != null && sg.by !== b && sg.shownBy !== b) cons.push({ p: sg.shownBy, set: [sg.s, sg.w, sg.r] });
    }
    // Deducción: si de las tres cartas solo una puede tenerla ese jugador, la tiene.
    let changed = true;
    while (changed && level === "dificil") {
      changed = false;
      for (const c of cons) {
        const poss = c.set.filter(x => (!held.has(x) || held.get(x) === c.p) && !lacks[c.p].has(x));
        if (poss.length === 1 && held.get(poss[0]) !== c.p) { held.set(poss[0], c.p); changed = true; }
      }
    }
    const cand = list => {
      const free = list.filter(x => !held.has(x.id)).map(x => x.id);
      // Si una carta no la tiene nadie (todos pasaron), está en el sobre.
      const nobody = free.filter(c => Array.from({ length: n }, (_, i) => i).every(i => i === b ? !g.hands[b].includes(c) : lacks[i].has(c)));
      return nobody.length ? nobody.slice(0, 1) : free;
    };
    return { s: cand(SUSPECTS), w: cand(WEAPONS), r: cand(ROOMS), held };
  }
  const pickOne = (a, rnd) => a[Math.floor(rnd() * a.length)];
  function botShow(g, d, m, rnd = Math.random) {
    // Preferir una carta que ya le mostró antes a ese jugador (le da menos información nueva).
    const prev = g.sugs.filter(sg => sg.shownBy === d && sg.by === g.pending.by).map(sg => sg.card);
    return m.find(c => prev.includes(c)) || pickOne(m, rnd);
  }
  function botStep(g, b, level, rnd = Math.random) {
    const kn = knowledge(g, b, level);
    const pick = (g2, d, m) => botShow(g2, d, m, rnd);
    const solved = kn.s.length === 1 && kn.w.length === 1 && kn.r.length === 1;
    if (g.step === "roll") {
      if (solved) return accuse(g, b, kn.s[0], kn.w[0], kn.r[0]);
      const here = roomOf(g.tok[b]);
      if (here && g.moved[b] && kn.r.includes(here) && level !== "facil") return stayAndSuggest(g, b);
      const pass = here && PASSAGES[here];
      if (pass && kn.r.includes(pass) && !kn.r.includes(here)) return usePassage(g, b);
      return rollDie(g, b, rnd);
    }
    if (g.step === "move") {
      const r = reachable(g, b, g.roll);
      const want = level === "facil" ? ROOMS.map(x => x.id) : kn.r;
      const good = r.rooms.filter(x => want.includes(x));
      if (good.length) return moveTo(g, b, { room: pickOne(good, rnd) });
      if (r.rooms.length && level === "facil") return moveTo(g, b, { room: pickOne(r.rooms, rnd) });
      // Acercarse a la habitación candidata más cercana.
      let best = null, bd = Infinity;
      for (const k of r.cells) {
        const [x, y] = k.split(",").map(Number);
        const d = Math.min(...want.map(rid => distToRoom({ x, y }, rid)));
        if (d < bd) { bd = d; best = { x, y }; }
      }
      if (best) return moveTo(g, b, best);
      if (r.rooms.length) return moveTo(g, b, { room: pickOne(r.rooms, rnd) });
      return endTurn({ ...g, step: "end" }, b);
    }
    if (g.step === "suggest") {
      const here = roomOf(g.tok[b]);
      let s = pickOne(kn.s, rnd), w = pickOne(kn.w, rnd);
      if (level === "facil" && rnd() < 0.5) { s = pickOne(SUSPECTS, rnd).id; w = pickOne(WEAPONS, rnd).id; }
      if (level === "dificil") {
        // Si la habitación ya está descartada, usar una carta propia en otra categoría para probar de a una.
        const mine = g.hands[b];
        if (!kn.r.includes(here) && kn.s.length > 1 && kn.w.length > 1) { /* probar ambas */ }
        else if (kn.s.length === 1) { const own = mine.find(c => c[0] === "s"); if (own) s = own; }
        else if (kn.w.length === 1) { const own = mine.find(c => c[0] === "w"); if (own) w = own; }
      }
      return suggest(g, b, s, w, pick);
    }
    if (g.step === "end") {
      const k2 = knowledge(g, b, level);
      if (k2.s.length === 1 && k2.w.length === 1 && k2.r.length === 1) return accuse(g, b, k2.s[0], k2.w[0], k2.r[0]);
      // En Fácil, a veces se arriesga cuando le quedan pocas opciones.
      if (level === "facil" && k2.s.length * k2.w.length * k2.r.length <= 2 && rnd() < 0.3) return accuse(g, b, k2.s[0], k2.w[0], k2.r[0]);
      return endTurn(g, b);
    }
    throw new Error("La IA no tiene jugada en este paso.");
  }

  const api = { SUSPECTS, WEAPONS, ROOMS, DOORS, PASSAGES, STARTS, CENTER, N, NX, NY, CARDS, NAME, cellKind, roomOf, K,
    setup, reachable, distToRoom, rollDie, moveTo, usePassage, stayAndSuggest, suggest, advance, showCard, accuse, endTurn,
    knowledge, botShow, botStep, clone, shuffle };
  if (typeof module !== "undefined") module.exports = api; else root.Clue = api;
})(this);
