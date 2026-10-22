/* Motor del póker (Texas Hold'em sin límite): manos, apuestas, pozos y la IA. Funciones puras sobre el estado.
   Cada jugador recibe 2 cartas; hay 5 cartas comunitarias (flop, turn y river) y cuatro vueltas de apuestas.
   Gana la mejor mano de 5 cartas entre las 7 disponibles, o el último que queda sin retirarse. Las ciegas suben
   cada cierta cantidad de manos y la partida termina cuando un jugador se queda con todas las fichas. */
(function (root) {
  const RANKS = "23456789TJQKA", SUITS = "shdc";      // picas, corazones, diamantes, tréboles
  const rankOf = c => c % 13, suitOf = c => Math.floor(c / 13);
  const RANK_NAME = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const RANK_PLURAL = ["doses", "treses", "cuatros", "cincos", "seis", "sietes", "ochos", "nueves", "dieces", "jotas", "reinas", "reyes", "ases"];
  const CAT_NAME = ["Carta alta", "Par", "Doble par", "Trío", "Escalera", "Color", "Full", "Póker", "Escalera de color"];
  const BLINDS = [10, 15, 25, 40, 60, 100, 150, 250, 400, 600, 1000, 1500, 2500, 4000, 6000, 10000];

  const clone = o => JSON.parse(JSON.stringify(o));
  function shuffle(a, rnd = Math.random) { for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(rnd() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; }
  const nick = (g, s) => g.seats?.[s]?.nick || `Jugador ${s + 1}`;
  const log = (g, s, x) => { g.log = [...(g.log || []), { s, x }].slice(-60); };

  /* ---------- Valor de una mano ---------- */
  // Mejor mano de 5 cartas: número comparable (más alto gana) y su categoría.
  function eval5(cs) {
    const r = cs.map(rankOf).sort((a, b) => b - a), flush = cs.every(c => suitOf(c) === suitOf(cs[0]));
    const cnt = {}; r.forEach(x => cnt[x] = (cnt[x] || 0) + 1);
    const groups = Object.entries(cnt).map(([k, v]) => [v, +k]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
    const uniq = [...new Set(r)];
    let straight = -1;
    if (uniq.length === 5) {
      if (uniq[0] - uniq[4] === 4) straight = uniq[0];
      else if (uniq[0] === 12 && uniq[1] === 3) straight = 3;   // A-2-3-4-5
    }
    let cat, ks;
    if (straight >= 0 && flush) { cat = 8; ks = [straight]; }
    else if (groups[0][0] === 4) { cat = 7; ks = [groups[0][1], groups[1][1]]; }
    else if (groups[0][0] === 3 && groups[1][0] === 2) { cat = 6; ks = [groups[0][1], groups[1][1]]; }
    else if (flush) { cat = 5; ks = r; }
    else if (straight >= 0) { cat = 4; ks = [straight]; }
    else if (groups[0][0] === 3) { cat = 3; ks = groups.map(x => x[1]); }
    else if (groups[0][0] === 2 && groups[1][0] === 2) { cat = 2; ks = groups.map(x => x[1]); }
    else if (groups[0][0] === 2) { cat = 1; ks = groups.map(x => x[1]); }
    else { cat = 0; ks = r; }
    let v = cat; for (let i = 0; i < 5; i++) v = v * 13 + (ks[i] ?? 0);
    return { v, cat, ks };
  }
  function best(cards) {
    let top = null, pick = null;
    const n = cards.length;
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) for (let d = c + 1; d < n; d++) for (let e = d + 1; e < n; e++) {
      const five = [cards[a], cards[b], cards[c], cards[d], cards[e]], h = eval5(five);
      if (!top || h.v > top.v) { top = h; pick = five; }
    }
    return { ...top, cards: pick };
  }
  // Valor rápido (solo el número) para las simulaciones de la IA.
  function bestValue(cards) { let m = -1; const n = cards.length;
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) for (let d = c + 1; d < n; d++) for (let e = d + 1; e < n; e++) {
      const v = eval5([cards[a], cards[b], cards[c], cards[d], cards[e]]).v; if (v > m) m = v; }
    return m; }
  function handName(h) {
    const [a, b] = h.ks;
    switch (h.cat) {
      case 8: return a === 12 ? "Escalera real" : `Escalera de color al ${RANK_NAME[a]}`;
      case 7: return `Póker de ${RANK_PLURAL[a]}`;
      case 6: return `Full de ${RANK_PLURAL[a]} y ${RANK_PLURAL[b]}`;
      case 5: return `Color al ${RANK_NAME[a]}`;
      case 4: return `Escalera al ${RANK_NAME[a]}`;
      case 3: return `Trío de ${RANK_PLURAL[a]}`;
      case 2: return `Doble par de ${RANK_PLURAL[a]} y ${RANK_PLURAL[b]}`;
      case 1: return `Par de ${RANK_PLURAL[a]}`;
      default: return `Carta alta ${RANK_NAME[a]}`;
    }
  }

  /* ---------- Partida ---------- */
  const alive = g => Array.from({ length: g.n }, (_, i) => i).filter(i => g.chips[i] > 0);
  const nextFrom = (g, from, ok) => { for (let k = 1; k <= g.n; k++) { const i = (from + k) % g.n; if (ok(i)) return i; } return -1; };
  const pot = g => g.committed.reduce((a, b) => a + b, 0);
  function setup(g, rnd = Math.random) {
    const stack = g.stack || 1000;
    g.chips = Array(g.n).fill(stack);
    g.scale = stack / 1000;              // las ciegas acompañan a las fichas iniciales
    g.handNo = 0; g.dealer = Math.floor(rnd() * g.n);
    g.phase = "play"; g.winner = null; g.log = []; g.place = [];
    return startHand(g, rnd);
  }
  function blindsFor(g) {
    const lvl = g.rising === false ? 0 : Math.min(BLINDS.length - 1, Math.floor((g.handNo - 1) / (g.every || 8)));
    const sb = Math.max(1, Math.round(BLINDS[lvl] * (g.scale || 1)));
    return { sb, bb: sb * 2, lvl };
  }
  function startHand(g, rnd = Math.random) {
    const live = alive(g);
    if (live.length <= 1) { g.phase = "over"; g.winner = live[0] ?? null; g.stage = "over"; if (g.winner != null) log(g, g.winner, "ganó la partida"); return g; }
    g.handNo++;
    g.dealer = g.handNo === 1 && g.chips[g.dealer] > 0 ? g.dealer : nextFrom(g, g.dealer, i => g.chips[i] > 0);
    const { sb, bb, lvl } = blindsFor(g); g.sb = sb; g.bb = bb; g.lvl = lvl;
    g.deck = shuffle(Array.from({ length: 52 }, (_, i) => i), rnd);
    g.hole = Array.from({ length: g.n }, () => []);
    g.folded = Array.from({ length: g.n }, (_, i) => g.chips[i] <= 0);   // los que ya no tienen fichas no juegan
    g.allin = Array(g.n).fill(false);
    g.bets = Array(g.n).fill(0); g.committed = Array(g.n).fill(0);
    g.board = []; g.result = null; g.street = "preflop"; g.stage = "bet";
    for (let k = 0; k < 2; k++) for (const i of live) g.hole[i].push(g.deck.pop());
    // Mano a mano, el que reparte pone la ciega chica y habla primero antes del flop.
    const heads = live.length === 2;
    g.sbSeat = heads ? g.dealer : nextFrom(g, g.dealer, i => !g.folded[i]);
    g.bbSeat = nextFrom(g, g.sbSeat, i => !g.folded[i]);
    put(g, g.sbSeat, Math.min(sb, g.chips[g.sbSeat]));
    put(g, g.bbSeat, Math.min(bb, g.chips[g.bbSeat]));
    g.currentBet = bb; g.minRaise = bb;
    g.pending = Array.from({ length: g.n }, (_, i) => !g.folded[i] && !g.allin[i]);
    g.toAct = nextFrom(g, g.bbSeat, i => g.pending[i]);
    log(g, g.dealer, `reparte · mano ${g.handNo} · ciegas ${sb}/${bb}`);
    if (g.toAct < 0 || !canStillBet(g)) return endStreet(g, rnd);
    // Si solo queda uno que puede apostar y ya igualó, no hay nada que decidir.
    if (g.bets[g.toAct] >= g.currentBet && g.pending.filter(Boolean).length === 1 && liveCount(g) - allinCount(g) <= 1) return endStreet(g, rnd);
    return g;
  }
  function put(g, s, amt) {
    amt = Math.max(0, Math.min(amt, g.chips[s]));
    g.chips[s] -= amt; g.bets[s] += amt; g.committed[s] += amt;
    if (g.chips[s] === 0) g.allin[s] = true;
    return amt;
  }
  const liveCount = g => g.folded.filter(f => !f).length;
  const allinCount = g => g.folded.filter((f, i) => !f && g.allin[i]).length;
  const canStillBet = g => g.folded.some((f, i) => !f && !g.allin[i]);
  function legal(g, s) {
    const toCall = Math.max(0, g.currentBet - g.bets[s]), stack = g.chips[s];
    const minTo = Math.min(g.currentBet + g.minRaise, g.bets[s] + stack), maxTo = g.bets[s] + stack;
    const others = g.folded.some((f, i) => i !== s && !f && !g.allin[i]);   // alguien más puede responder una suba
    return { toCall: Math.min(toCall, stack), canCheck: toCall === 0, canRaise: stack > toCall && (others || toCall === 0 && others), minTo, maxTo, stack };
  }
  function check(g, s) {
    if (g.phase !== "play") throw new Error("La partida terminó.");
    if (g.stage !== "bet") throw new Error("La mano ya terminó.");
    if (g.toAct !== s) throw new Error("No es tu turno.");
  }
  // type: fold | check | call | raise (amount = total apostado en esta vuelta) | allin
  function act(g0, s, type, amount, rnd = Math.random) {
    const g = clone(g0); check(g, s);
    const L = legal(g, s);
    if (type === "allin") {
      const to = g.bets[s] + g.chips[s];
      type = to > g.currentBet ? "raise" : "call"; amount = to;
    }
    if (type === "fold") { g.folded[s] = true; log(g, s, "se retira"); }
    else if (type === "check") {
      if (!L.canCheck) throw new Error("No podés pasar: hay una apuesta para igualar.");
      log(g, s, "pasa");
    } else if (type === "call") {
      if (L.canCheck) { log(g, s, "pasa"); }
      else { const v = put(g, s, L.toCall); log(g, s, g.allin[s] ? `va all-in con ${v}` : `iguala ${v}`); }
    } else if (type === "raise") {
      let to = Math.round(amount);
      if (to >= L.maxTo) to = L.maxTo;
      if (to <= g.currentBet) throw new Error("La suba tiene que superar la apuesta actual.");
      if (to < L.minTo && to < L.maxTo) throw new Error(`La suba mínima es a ${L.minTo}.`);
      const prev = g.currentBet, opened = prev === 0;
      put(g, s, to - g.bets[s]);
      const inc = to - prev;
      if (inc >= g.minRaise) g.minRaise = inc;
      g.currentBet = to;
      // Los demás que siguen en la mano vuelven a tener que hablar.
      for (let i = 0; i < g.n; i++) if (i !== s && !g.folded[i] && !g.allin[i]) g.pending[i] = true;
      log(g, s, g.allin[s] ? `va all-in con ${to}` : opened ? `apuesta ${to}` : `sube a ${to}`);
    } else throw new Error("Jugada desconocida.");
    g.pending[s] = false;
    return advance(g, s, rnd);
  }
  function advance(g, s, rnd) {
    if (liveCount(g) === 1) return finish(g, rnd);
    const nx = nextFrom(g, s, i => g.pending[i] && !g.folded[i] && !g.allin[i]);
    if (nx >= 0) {
      // Si es el único que puede apostar y ya igualó todo, la vuelta terminó.
      const able = g.folded.filter((f, i) => !f && !g.allin[i]).length;
      if (able === 1 && g.bets[nx] >= g.currentBet) return endStreet(g, rnd);
      g.toAct = nx; return g;
    }
    return endStreet(g, rnd);
  }
  function endStreet(g, rnd) {
    g.bets = Array(g.n).fill(0); g.currentBet = 0; g.minRaise = g.bb;
    const able = g.folded.filter((f, i) => !f && !g.allin[i]).length;
    if (g.street === "river" || able <= 1) {
      // Nadie más puede apostar: se dan las cartas que faltan y se muestran las manos.
      while (g.board.length < 5) g.board.push(g.deck.pop());
      return finish(g, rnd);
    }
    g.street = g.street === "preflop" ? "flop" : g.street === "flop" ? "turn" : "river";
    if (g.street === "flop") g.board.push(g.deck.pop(), g.deck.pop(), g.deck.pop()); else g.board.push(g.deck.pop());
    g.pending = Array.from({ length: g.n }, (_, i) => !g.folded[i] && !g.allin[i]);
    g.toAct = nextFrom(g, g.dealer, i => g.pending[i]);
    return g;
  }
  // Reparte los pozos (el principal y los laterales de los que fueron all-in).
  function finish(g) {
    const live = g.folded.map((f, i) => !f ? i : -1).filter(i => i >= 0);
    const showdown = live.length > 1;
    const hands = {};
    if (showdown) for (const i of live) hands[i] = best([...g.hole[i], ...g.board]);
    const levels = [...new Set(g.committed.filter(x => x > 0))].sort((a, b) => a - b);
    const pots = []; let prev = 0, carry = 0;
    for (const lv of levels) {
      const amount = g.committed.reduce((a, c) => a + Math.max(0, Math.min(c, lv) - prev), 0) + carry;
      const elig = live.filter(i => g.committed[i] >= lv);
      prev = lv;
      if (!elig.length) { carry = amount; continue; }
      carry = 0;
      let winners = elig;
      if (showdown) { const top = Math.max(...elig.map(i => hands[i].v)); winners = elig.filter(i => hands[i].v === top); }
      const last = pots[pots.length - 1];
      if (last && last.elig.length === elig.length && last.elig.every(i => elig.includes(i))) last.amount += amount;   // mismo grupo: un solo pozo
      else pots.push({ amount, elig, winners });
    }
    if (carry && pots.length) pots[pots.length - 1].amount += carry;
    const won = Array(g.n).fill(0);
    for (const p of pots) {
      const share = Math.floor(p.amount / p.winners.length); let rest = p.amount - share * p.winners.length;
      // La ficha que sobra en un empate va al primero a la izquierda del que reparte.
      const order = [...p.winners].sort((a, b) => ((a - g.dealer - 1 + g.n) % g.n) - ((b - g.dealer - 1 + g.n) % g.n));
      for (const w of order) { won[w] += share + (rest > 0 ? 1 : 0); if (rest > 0) rest--; }
    }
    won.forEach((v, i) => g.chips[i] += v);
    g.result = {
      showdown, won, pots: pots.map(p => ({ amount: p.amount, winners: p.winners })),
      hands: Object.fromEntries(Object.entries(hands).map(([i, h]) => [i, { name: handName(h), cards: h.cards, cat: h.cat }])),
    };
    for (let i = 0; i < g.n; i++) if (won[i]) log(g, i, showdown ? `gana ${won[i]} con ${handName(hands[i])}` : `gana ${won[i]}`);
    // Los que se quedaron sin fichas quedan afuera (se anota en qué puesto).
    for (let i = 0; i < g.n; i++) if (g.chips[i] === 0 && g.committed[i] > 0 && !g.place.includes(i)) { g.place.push(i); log(g, i, "se quedó sin fichas"); }
    g.stage = "end"; g.toAct = -1; g.pending = Array(g.n).fill(false);
    g.endedAt = (g.endedAt || 0) + 1;
    if (alive(g).length <= 1) { g.phase = "over"; g.winner = alive(g)[0]; g.stage = "over"; log(g, g.winner, "¡ganó la partida!"); }
    return g;
  }
  function nextHand(g0, rnd = Math.random) {
    const g = clone(g0);
    if (g.phase !== "play" || g.stage !== "end") return g;
    return startHand(g, rnd);
  }

  /* ---------- IA ----------
     Fácil: juega mucho, iguala de más y casi nunca sube. Medio: decide con la fuerza de su mano y lo que cuesta
     igualar, con algo de azar. Difícil: estima mejor sus chances, apuesta según el pozo y a veces farolea. */
  function chen(h) {   // fuerza antes del flop, de 0 a 1
    const [a, b] = h.map(rankOf).sort((x, y) => y - x), suited = suitOf(h[0]) === suitOf(h[1]);
    const val = r => r === 12 ? 10 : r === 11 ? 8 : r === 10 ? 7 : r === 9 ? 6 : (r + 2) / 2;
    let s = val(a);
    if (a === b) s = Math.max(5, s * 2);
    if (suited) s += 2;
    const gap = a - b - 1;
    if (a !== b) s -= gap <= 0 ? 0 : gap === 1 ? 1 : gap === 2 ? 2 : gap === 3 ? 4 : 5;
    if (a !== b && gap <= 1 && a < 10) s += 1;
    return Math.max(0, Math.min(1, (s + 1) / 21));
  }
  function equity(g, s, sims, rnd) {
    const opp = g.folded.filter((f, i) => !f && i !== s).length;
    if (!opp) return 1;
    const known = new Set([...g.hole[s], ...g.board]);
    const rest = Array.from({ length: 52 }, (_, i) => i).filter(c => !known.has(c));
    let win = 0;
    for (let t = 0; t < sims; t++) {
      const d = rest.slice();
      for (let i = 0; i < opp * 2 + 5 - g.board.length; i++) { const k = i + Math.floor(rnd() * (d.length - i)); [d[i], d[k]] = [d[k], d[i]]; }
      let p = 0; const board = [...g.board]; while (board.length < 5) board.push(d[p++]);
      const mine = bestValue([...g.hole[s], ...board]);
      let lose = false, tie = 0;
      for (let o = 0; o < opp && !lose; o++) { const v = bestValue([d[p++], d[p++], ...board]); if (v > mine) lose = true; else if (v === mine) tie++; }
      if (!lose) win += tie ? 1 / (tie + 1) : 1;
    }
    return win / sims;
  }
  function botStep(g, s, level = "medio", rnd = Math.random) {
    const L = legal(g, s), P = pot(g), opp = g.folded.filter((f, i) => !f && i !== s).length;
    let e;
    if (level === "facil") e = g.street === "preflop" ? chen(g.hole[s]) * 1.1 : equity(g, s, 40, rnd);
    else if (g.street === "preflop") e = Math.min(1, chen(g.hole[s]) * (opp <= 1 ? 1.25 : opp <= 3 ? 1 : .85) + (level === "dificil" ? .02 : 0));
    else e = equity(g, s, level === "dificil" ? 260 : 110, rnd);
    if (level === "medio") e += (rnd() - .5) * .12;
    const odds = L.toCall / (P + L.toCall || 1);
    const raiseTo = frac => Math.max(L.minTo, Math.min(L.maxTo, g.currentBet + Math.round(Math.max(g.minRaise, frac * (P + L.toCall)) / (g.sb || 1)) * (g.sb || 1)));
    const doRaise = frac => L.canRaise ? act(g, s, "raise", raiseTo(frac), rnd) : act(g, s, L.canCheck ? "check" : "call", 0, rnd);
    const passive = () => act(g, s, L.canCheck ? "check" : "call", 0, rnd);
    const fold = () => L.canCheck ? act(g, s, "check", 0, rnd) : act(g, s, "fold", 0, rnd);
    // Antes del flop, la fuerza se compara con umbrales; después, con las chances reales contra los rivales.
    const strong = g.street === "preflop" ? .62 : Math.min(.85, .5 + .55 / (opp + 1));
    const good = g.street === "preflop" ? .42 : Math.min(.7, .32 + .45 / (opp + 1));
    if (level === "facil") {
      if (e > strong + .1 && rnd() < .4) return doRaise(.5);
      if (L.canCheck) return passive();
      if (e > .25 || rnd() < .45 || L.toCall <= g.bb) return passive();
      return fold();
    }
    const bluff = level === "dificil" ? .1 : .04;
    if (e >= strong) return rnd() < (level === "dificil" ? .85 : .7) ? doRaise(e > .85 ? 1 : .6) : passive();
    if (e >= good) {
      if (L.canCheck) return rnd() < (level === "dificil" ? .45 : .3) ? doRaise(.5) : passive();
      return e > odds + .05 ? passive() : fold();
    }
    if (L.canCheck) return rnd() < bluff ? doRaise(.5) : passive();
    if (e > odds + (level === "dificil" ? .02 : .06) && L.toCall <= L.stack * .35) return passive();
    if (L.toCall <= g.bb && g.street === "preflop" && e > .25) return passive();
    return fold();
  }

  const api = { RANKS, SUITS, RANK_NAME, CAT_NAME, rankOf, suitOf, eval5, best, handName, setup, startHand, act, nextHand, legal, pot,
    alive, botStep, equity, chen, clone, shuffle, blindsFor };
  if (typeof module !== "undefined") module.exports = api; else root.Poker = api;
})(this);
