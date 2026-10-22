/* Motor de Burako: reglas, puntaje e IA. Funciones puras sobre el estado de la partida.
   Reglas clásicas: 106 fichas (1 a 13 en 4 colores, dos de cada una, más 2 comodines), 11 por jugador
   y un muerto de 11 por equipo. Juegos de 3 o más: escalera del mismo color o pierna del mismo número,
   con un solo comodín (comodín o 2) por juego. Canasta de 7: limpia 200, sucia 100. Para cerrar hace
   falta haber tomado el muerto y tener al menos una canasta. */
(function (root) {
  const COLORS = ["rojo", "azul", "amarillo", "negro"];
  const HAND = 11;

  // Ficha: id 0..103 = número y color (dos copias), 104 y 105 = comodines.
  function info(id) {
    if (id >= 104) return { id, j: true, n: 0, c: -1 };
    return { id, j: false, n: (id % 13) + 1, c: Math.floor(id / 13) % 4 };
  }
  const isWild = id => id >= 104 || (id % 13) + 1 === 2;
  function points(id) {
    const t = info(id);
    if (t.j) return 50;
    if (t.n === 2) return 20;
    if (t.n === 1) return 15;
    return t.n >= 8 ? 10 : 5;
  }
  const label = id => { const t = info(id); return t.j ? "comodín" : `${t.n} ${COLORS[t.c]}`; };

  const nTeams = g => (g.n === 4 ? 2 : g.n);
  const teamOf = (g, seat) => (g.n === 4 ? seat % 2 : seat);
  const teamSeats = (g, team) => (g.n === 4 ? [team, team + 2] : [team]);
  const clone = o => JSON.parse(JSON.stringify(o));
  function shuffle(a, rnd = Math.random) {
    for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(rnd() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; }
    return a;
  }

  /* ---------- Juegos ---------- */
  const fail = msg => ({ ok: false, msg });
  // Valida un juego y devuelve sus fichas ordenadas. type: "e" escalera, "p" pierna (o null para cualquiera).
  // pref: en una escalera con comodín que puede ir en cualquiera de las dos puntas, "lo" lo pone abajo y "hi" arriba.
  // Devuelve flex: true si el comodín se puede mover a la otra punta.
  function validMeld(ids, type, pref) {
    if (ids.length < 3) return fail("Un juego necesita al menos 3 fichas.");
    if (new Set(ids).size !== ids.length) return fail("Ficha repetida.");
    const T = ids.map(info);
    if (type !== "e") {
      let nat = T.filter(t => !t.j && t.n !== 2), wild = T.filter(t => t.j || t.n === 2);
      if (!nat.length && T.every(t => !t.j && t.n === 2)) { nat = T; wild = []; }
      if (nat.length >= 2 && nat.every(t => t.n === nat[0].n) && wild.length <= 1)
        return { ok: true, t: "p", tiles: (pref === "lo" ? [...wild, ...nat] : [...nat, ...wild]).map(t => t.id), w: wild.length, flex: wild.length > 0 };
    }
    if (type !== "p") {
      const jokers = T.filter(t => t.j), twos = T.filter(t => !t.j && t.n === 2), others = T.filter(t => !t.j && t.n !== 2);
      const col = others.length ? others[0].c : twos.length ? twos[0].c : -1;
      if (col >= 0 && others.every(t => t.c === col)) {
        const sameTwos = twos.filter(t => t.c === col);
        // Primero se prueba el 2 en su lugar natural: así 2-3-4-5-6-7-8 es una escalera limpia.
        for (const nat2 of [...sameTwos, null]) {
          const nats = nat2 ? [...others, nat2] : others;
          const wilds = T.filter(t => !nats.includes(t));
          if (wilds.length > 1 || !nats.length) continue;
          const nums = nats.map(t => t.n);
          if (new Set(nums).size !== nums.length) continue;
          for (const high of [false, true]) {
            if (high && !nums.includes(1)) continue;
            const vals = nats.map(t => (t.n === 1 && high ? 14 : t.n));
            const mn = Math.min(...vals), mx = Math.max(...vals), L = T.length;
            // Sin un 1 natural, el comodín puede hacer de 1 en cualquiera de las dos puntas (★-2-3 o 12-13-★).
            const top = high || (!nums.includes(1) && L <= 13) ? 14 : 13, bottom = high ? 2 : 1;
            const lo = Math.max(bottom, mx - L + 1), hi = Math.min(mn, top - L + 1);
            if (mx - mn + 1 > L || lo > hi) continue;
            const s = pref === "lo" ? lo : hi, byVal = new Map(nats.map((t, i) => [vals[i], t.id])), pool = wilds.map(t => t.id);
            const tiles = [];
            for (let v = s; v < s + L; v++) tiles.push(byVal.has(v) ? byVal.get(v) : pool.shift());
            return { ok: true, t: "e", tiles, w: wilds.length, flex: wilds.length > 0 && lo < hi };
          }
        }
      }
    }
    return fail("Esas fichas no forman un juego. Tiene que ser una escalera del mismo color o una pierna del mismo número, con un solo comodín (o 2).");
  }
  const isCanasta = m => m.tiles.length >= 7;
  const hasCanasta = (g, team) => g.melds[team].some(isCanasta);

  /* ---------- Partida ---------- */
  function newRound(g, rnd = Math.random) {
    const deck = shuffle(Array.from({ length: 106 }, (_, i) => i), rnd);
    g.hands = Array.from({ length: g.n }, () => deck.splice(0, HAND));
    g.muertos = Array.from({ length: nTeams(g) }, () => deck.splice(0, HAND));
    g.stock = deck; g.discard = [];
    g.muertoTaken = Array(nTeams(g)).fill(false);
    g.melds = Array.from({ length: nTeams(g) }, () => []);
    g.turn = ((g.dealer ?? -1) + 1) % g.n; g.dealer = g.turn;
    g.step = "draw"; g.phase = "play"; g.result = null; g.closedBy = null;
    g.round = (g.round || 0) + 1; g.log = [];
    return g;
  }
  function log(g, seat, text) { g.log = [...(g.log || []), { s: seat, x: text }].slice(-30); }
  function nextTurn(g) { g.turn = (g.turn + 1) % g.n; g.step = "draw"; }
  function takeMuerto(g, seat) {
    const team = teamOf(g, seat);
    g.hands[seat] = g.muertos[team]; g.muertos[team] = []; g.muertoTaken[team] = true;
    log(g, seat, "tomó el muerto");
  }
  function check(g, seat, step) {
    if (g.phase !== "play") throw new Error("La mano terminó.");
    if (g.turn !== seat) throw new Error("No es tu turno.");
    if (step && g.step !== step) throw new Error(step === "draw" ? "Ya robaste en este turno." : "Primero robá del pozo o tomá el descarte.");
  }

  function drawStock(g0, seat) {
    const g = clone(g0); check(g, seat, "draw");
    if (!g.stock.length) { log(g, seat, "no pudo robar: se terminó el pozo"); return endRound(g, null); }
    g.hands[seat].push(g.stock.pop()); g.step = "play";
    log(g, seat, "robó del pozo");
    return g;
  }
  function takeDiscard(g0, seat) {
    const g = clone(g0); check(g, seat, "draw");
    if (!g.discard.length) throw new Error("No hay fichas en el descarte.");
    const n = g.discard.length;
    g.hands[seat].push(...g.discard); g.discard = []; g.step = "play";
    log(g, seat, n === 1 ? "tomó el descarte" : `tomó el descarte (${n} fichas)`);
    return g;
  }
  // Cuántas fichas pueden quedar en la mano después de bajar.
  function leftoverOk(g, seat, left, canastaAfter) {
    const team = teamOf(g, seat);
    if (!g.muertoTaken[team]) return true; // con 0 toma el muerto; con 1 lo descarta y lo toma
    if (left === 0) return "Tenés que quedarte con una ficha para descartar.";
    if (left === 1 && !canastaAfter) return "Si te quedás con una sola ficha tenés que poder cerrar, y para eso necesitás una canasta.";
    return true;
  }
  function removeFromHand(g, seat, ids) {
    const hand = g.hands[seat];
    if (!ids.every(id => hand.includes(id))) throw new Error("Esas fichas no están en tu mano.");
    g.hands[seat] = hand.filter(id => !ids.includes(id));
  }
  function meldNew(g0, seat, ids) {
    const g = clone(g0); check(g, seat, "play");
    const v = validMeld(ids); if (!v.ok) throw new Error(v.msg);
    const team = teamOf(g, seat), left = g.hands[seat].length - ids.length;
    const ok = leftoverOk(g, seat, left, hasCanasta(g, team) || v.tiles.length >= 7);
    if (ok !== true) throw new Error(ok);
    removeFromHand(g, seat, ids);
    g.melds[team].push({ t: v.t, tiles: v.tiles, w: v.w, p: "hi" });
    log(g, seat, `bajó una ${v.t === "e" ? "escalera" : "pierna"} de ${v.tiles.length}`);
    if (!g.hands[seat].length) takeMuerto(g, seat);
    return g;
  }
  function addTo(g0, seat, mi, ids) {
    const g = clone(g0); check(g, seat, "play");
    const team = teamOf(g, seat), m = g.melds[team][mi];
    if (!m) throw new Error("Ese juego no existe.");
    const v = validMeld([...m.tiles, ...ids], m.t, m.p); if (!v.ok) throw new Error("No se pueden agregar esas fichas a ese juego.");
    const left = g.hands[seat].length - ids.length;
    const ok = leftoverOk(g, seat, left, hasCanasta(g, team) || v.tiles.length >= 7);
    if (ok !== true) throw new Error(ok);
    removeFromHand(g, seat, ids);
    g.melds[team][mi] = { t: v.t, tiles: v.tiles, w: v.w, p: m.p || "hi" };
    log(g, seat, ids.length === 1 ? `agregó ${label(ids[0])}` : `agregó ${ids.length} fichas`);
    if (!g.hands[seat].length) takeMuerto(g, seat);
    return g;
  }
  // Pasa el comodín (o el 2 que hace de comodín) a la otra punta del juego: en una escalera de 3-4-5-★ a ★-3-4-5,
  // en una pierna de 8-8-★ a ★-8-8.
  function moveWild(g0, seat, mi) {
    const g = clone(g0); check(g, seat);
    const team = teamOf(g, seat), m = g.melds[team][mi];
    if (!m || !m.w) throw new Error("Ese juego no tiene un comodín para mover.");
    const p = m.p === "lo" ? "hi" : "lo", v = validMeld(m.tiles, m.t, p);
    if (!v.ok || !v.flex) throw new Error("En este juego el comodín no se puede mover.");
    g.melds[team][mi] = { t: m.t, tiles: v.tiles, w: v.w, p };
    return g;
  }
  function discardTile(g0, seat, id) {
    const g = clone(g0); check(g, seat, "play");
    const team = teamOf(g, seat);
    if (!g.hands[seat].includes(id)) throw new Error("Esa ficha no está en tu mano.");
    if (g.hands[seat].length === 1 && g.muertoTaken[team] && !hasCanasta(g, team))
      throw new Error("No podés descartar tu última ficha: para cerrar necesitás al menos una canasta.");
    removeFromHand(g, seat, [id]); g.discard.push(id);
    log(g, seat, `descartó ${label(id)}`);
    if (!g.hands[seat].length) {
      if (!g.muertoTaken[team]) { takeMuerto(g, seat); nextTurn(g); return g; }
      log(g, seat, "cerró la mano");
      return endRound(g, seat);
    }
    nextTurn(g);
    return g;
  }

  /* ---------- Puntaje ---------- */
  function score(g, closer) {
    return Array.from({ length: nTeams(g) }, (_, team) => {
      const melds = g.melds[team];
      const meldPts = melds.reduce((a, m) => a + m.tiles.reduce((b, id) => b + points(id), 0), 0);
      const limpias = melds.filter(m => isCanasta(m) && !m.w).length, sucias = melds.filter(m => isCanasta(m) && m.w).length;
      const hand = teamSeats(g, team).reduce((a, s) => a + g.hands[s].reduce((b, id) => b + points(id), 0), 0);
      const cierre = closer != null && teamOf(g, closer) === team ? 100 : 0;
      const muerto = g.muertoTaken[team] ? 0 : -100;
      const total = meldPts + limpias * 200 + sucias * 100 + cierre - hand + muerto;
      return { meldPts, limpias, sucias, cierre, hand, muerto, total };
    });
  }
  function endRound(g, closer) {
    const res = score(g, closer);
    g.scores = (g.scores || Array(nTeams(g)).fill(0)).map((s, i) => s + res[i].total);
    g.result = res; g.closedBy = closer;
    const best = Math.max(...g.scores);
    g.phase = best >= g.target ? "over" : "roundEnd";
    if (g.phase === "over") g.winner = g.scores.indexOf(best);
    return g;
  }

  /* ---------- IA ----------
     Usa solo su mano y lo que está a la vista. Fácil: baja lo que ve, casi nunca toma el descarte y descarta al azar.
     Medio: usa comodines, toma el descarte cuando le sirve y evita darle fichas al rival.
     Difícil: además arma canastas y guarda los comodines para completarlas. */
  function findMeld(hand, useWild) {
    const T = hand.map(info), wilds = T.filter(t => t.j || t.n === 2);
    const cands = [];
    for (let c = 0; c < 4; c++) {
      const byN = new Map();
      for (const t of T) if (!t.j && t.c === c && !byN.has(t.n)) byN.set(t.n, t.id);
      if (byN.has(1)) byN.set(14, byN.get(1));
      let run = [];
      for (let v = 1; v <= 15; v++) {
        if (byN.has(v) && !(v === 14 && run.length && run[0] === byN.get(1))) run.push(byN.get(v));
        else { if (run.length >= 3) cands.push(run); run = []; }
      }
      if (useWild && wilds.length) {
        for (let v = 1; v <= 13; v++) {
          const a = byN.get(v), b = byN.get(v + 1), d = byN.get(v + 2);
          if (a != null && b != null && a !== b) cands.push([a, b]);
          if (a != null && d != null && b == null && a !== d) cands.push([a, d]);
        }
      }
    }
    const byNum = new Map();
    for (const t of T) if (!t.j && t.n !== 2) byNum.set(t.n, [...(byNum.get(t.n) || []), t.id]);
    for (const ids of byNum.values()) { if (ids.length >= 3) cands.push(ids); else if (useWild && ids.length === 2) cands.push(ids); }
    const out = [];
    for (let ids of cands) {
      if (ids.length < 3) { const w = wilds.find(t => !ids.includes(t.id)); if (!w) continue; ids = [...ids, w.id]; }
      const v = validMeld(ids);
      if (v.ok) out.push(ids);
    }
    out.sort((a, b) => b.length - a.length || a.filter(isWild).length - b.filter(isWild).length);
    return out[0] || null;
  }
  function usefulTile(g, seat, id) {
    const team = teamOf(g, seat), hand = g.hands[seat];
    if (g.melds[team].some(m => validMeld([...m.tiles, id], m.t).ok)) return true;
    const m = findMeld([...hand, id], true);
    return !!(m && m.includes(id));
  }
  function botChooseDraw(g, seat, level, rnd = Math.random) {
    const top = g.discard[g.discard.length - 1], team = teamOf(g, seat);
    if (top == null) return "stock";
    // Sin canasta y con el muerto tomado, con pocas fichas no puede bajar nada (debe quedarse con 2):
    // tomar el descarte solo haría pasarse la misma ficha con el rival una y otra vez.
    if (g.muertoTaken[team] && !hasCanasta(g, team) && g.hands[seat].length + g.discard.length <= 3) return "stock";
    if (isWild(top) && level !== "facil") return "discard";
    if (!usefulTile(g, seat, top)) return level === "dificil" && g.discard.length >= 5 && rnd() < 0.3 ? "discard" : "stock";
    if (level === "facil") return rnd() < 0.35 ? "discard" : "stock";
    return "discard";
  }
  // Una jugada de bajar o agregar (o null si no hay nada conveniente).
  function botMeldMove(g, seat, level) {
    const team = teamOf(g, seat), hand = g.hands[seat];
    const tryMove = (fn) => { try { return fn(); } catch { return null; } };
    const nw = findMeld(hand, true);
    if (nw) { const r = tryMove(() => meldNew(g, seat, nw)); if (r) return r; }
    for (const id of hand) {
      if (isWild(id)) continue;
      for (let i = 0; i < g.melds[team].length; i++) {
        const m = g.melds[team][i];
        if (!validMeld([...m.tiles, id], m.t).ok) continue;
        const r = tryMove(() => addTo(g, seat, i, [id])); if (r) return r;
      }
    }
    if (level !== "facil") {
      // Un comodín para completar una canasta (6 fichas → 7) si todavía no hay ninguna, o en Medio para descargar la mano.
      const wild = hand.find(isWild);
      if (wild != null) for (let i = 0; i < g.melds[team].length; i++) {
        const m = g.melds[team][i];
        const want = m.tiles.length === 6 && (!hasCanasta(g, team) || level === "medio");
        if (!want || m.w) continue;
        const r = tryMove(() => addTo(g, seat, i, [wild])); if (r) return r;
      }
    }
    return null;
  }
  function botDiscardChoice(g, seat, level, rnd = Math.random) {
    const team = teamOf(g, seat), hand = g.hands[seat];
    const opp = Array.from({ length: nTeams(g) }, (_, t) => t).filter(t => t !== team);
    let pool = hand.filter(id => !isWild(id));
    if (!pool.length) pool = hand.slice();
    if (level === "facil") return pool[Math.floor(rnd() * pool.length)];
    const T = hand.map(info);
    const val = id => {
      const t = info(id);
      let u = 0;
      for (const o of T) {
        if (o.id === id || o.j) continue;
        if (o.c === t.c && Math.abs(o.n - t.n) <= 2) u += 1.2;
        if (o.n === t.n) u += 1;
      }
      if (opp.some(o => g.melds[o].some(m => validMeld([...m.tiles, id], m.t).ok))) u += level === "dificil" ? 6 : 3;
      return u - points(id) / 40;
    };
    pool.sort((a, b) => val(a) - val(b));
    return pool[0];
  }
  // Un paso de la IA: robar, bajar una jugada o descartar.
  function botStep(g, seat, level, rnd = Math.random) {
    if (g.step === "draw") return botChooseDraw(g, seat, level, rnd) === "discard" ? takeDiscard(g, seat) : drawStock(g, seat);
    const mv = botMeldMove(g, seat, level);
    if (mv) return mv;
    const hand = g.hands[seat], team = teamOf(g, seat);
    if (hand.length === 1 && g.muertoTaken[team] && !hasCanasta(g, team)) {
      // No puede cerrar: con una ficha no hay descarte válido. Esto no debería pasar porque leftoverOk lo evita.
      throw new Error("La IA quedó sin jugada válida.");
    }
    let id = botDiscardChoice(g, seat, level, rnd);
    if (hand.length === 1) id = hand[0];
    return discardTile(g, seat, id);
  }

  const api = { COLORS, info, isWild, points, label, nTeams, teamOf, teamSeats, validMeld, isCanasta, hasCanasta,
    newRound, drawStock, takeDiscard, meldNew, addTo, moveWild, discardTile, score, endRound, findMeld, botStep, shuffle, clone };
  if (typeof module !== "undefined") module.exports = api; else root.Burako = api;
})(this);
