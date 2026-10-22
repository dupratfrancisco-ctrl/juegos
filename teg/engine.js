/* Motor del TEG: mapa, rondas, ataques, tarjetas, objetivos e IA. Funciones puras sobre el estado.
   Reglas clásicas: 50 países en 6 continentes; colocación inicial de 5 y de 3 ejércitos; rondas de ataque
   y de incorporación que se alternan; ataques con hasta 3 dados (el empate lo gana el defensor);
   tarjeta de país al conquistar; canjes de 4, 7, 10, 15… ejércitos; objetivo secreto u ocupar 30 países. */
(function (root) {
  const CONT = {
    AN: { name: "América del Norte", bonus: 5, color: "#e8a33d" },
    AS: { name: "América del Sur", bonus: 3, color: "#7cb342" },
    EU: { name: "Europa", bonus: 5, color: "#5c8fd6" },
    AF: { name: "África", bonus: 3, color: "#c98a4b" },
    ASI: { name: "Asia", bonus: 7, color: "#d65c6a" },
    OC: { name: "Oceanía", bonus: 2, color: "#9b6fd1" },
  };
  // id, nombre, continente, posición en el mapa (1000×600)
  const COUNTRIES = [
    ["alaska", "Alaska", "AN", 62, 92], ["yukon", "Yukón", "AN", 150, 72], ["canada", "Canadá", "AN", 232, 92],
    ["groenlandia", "Groenlandia", "AN", 355, 45], ["labrador", "Labrador", "AN", 325, 128], ["terranova", "Terranova", "AN", 282, 165],
    ["oregon", "Oregón", "AN", 120, 160], ["nuevayork", "Nueva York", "AN", 212, 178], ["california", "California", "AN", 128, 238], ["mexico", "México", "AN", 168, 305],
    ["colombia", "Colombia", "AS", 248, 362], ["peru", "Perú", "AS", 228, 432], ["brasil", "Brasil", "AS", 318, 418],
    ["chile", "Chile", "AS", 222, 515], ["argentina", "Argentina", "AS", 278, 500], ["uruguay", "Uruguay", "AS", 340, 478],
    ["islandia", "Islandia", "EU", 438, 82], ["granbretana", "Gran Bretaña", "EU", 440, 168], ["suecia", "Suecia", "EU", 528, 82],
    ["rusia", "Rusia", "EU", 612, 128], ["polonia", "Polonia", "EU", 572, 192], ["alemania", "Alemania", "EU", 508, 200],
    ["francia", "Francia", "EU", 478, 248], ["italia", "Italia", "EU", 540, 262], ["espana", "España", "EU", 428, 288],
    ["sahara", "Sahara", "AF", 468, 362], ["egipto", "Egipto", "AF", 560, 340], ["etiopia", "Etiopía", "AF", 590, 410],
    ["zaire", "Zaire", "AF", 518, 438], ["sudafrica", "Sudáfrica", "AF", 548, 515], ["madagascar", "Madagascar", "AF", 640, 488],
    ["turquia", "Turquía", "ASI", 640, 248], ["israel", "Israel", "ASI", 618, 305], ["arabia", "Arabia", "ASI", 672, 330],
    ["iran", "Irán", "ASI", 708, 230], ["aral", "Aral", "ASI", 700, 140], ["tartaria", "Tartaria", "ASI", 752, 78],
    ["taimir", "Taimir", "ASI", 835, 62], ["siberia", "Siberia", "ASI", 812, 130], ["mongolia", "Mongolia", "ASI", 785, 196],
    ["gobi", "Gobi", "ASI", 760, 258], ["china", "China", "ASI", 845, 248], ["india", "India", "ASI", 760, 330],
    ["malasia", "Malasia", "ASI", 852, 330], ["kamchatka", "Kamchatka", "ASI", 915, 110], ["japon", "Japón", "ASI", 948, 210],
    ["sumatra", "Sumatra", "OC", 778, 425], ["borneo", "Borneo", "OC", 872, 412], ["java", "Java", "OC", 945, 452], ["australia", "Australia", "OC", 880, 522],
  ].map(([id, name, c, x, y]) => ({ id, name, c, x, y }));
  const BYID = Object.fromEntries(COUNTRIES.map(c => [c.id, c]));
  const EDGES = [
    ["argentina", "chile"], ["argentina", "uruguay"], ["argentina", "brasil"], ["argentina", "peru"], ["chile", "peru"], ["chile", "australia"],
    ["uruguay", "brasil"], ["brasil", "peru"], ["brasil", "colombia"], ["brasil", "sahara"], ["peru", "colombia"], ["colombia", "mexico"],
    ["mexico", "california"], ["california", "oregon"], ["california", "nuevayork"], ["oregon", "nuevayork"], ["oregon", "yukon"], ["oregon", "alaska"],
    ["alaska", "yukon"], ["alaska", "kamchatka"], ["yukon", "canada"], ["canada", "oregon"], ["canada", "nuevayork"], ["canada", "terranova"],
    ["nuevayork", "terranova"], ["nuevayork", "groenlandia"], ["terranova", "labrador"], ["labrador", "groenlandia"], ["groenlandia", "islandia"],
    ["islandia", "granbretana"], ["islandia", "suecia"], ["granbretana", "espana"], ["granbretana", "alemania"], ["suecia", "rusia"],
    ["rusia", "polonia"], ["rusia", "turquia"], ["rusia", "iran"], ["rusia", "aral"], ["polonia", "alemania"], ["polonia", "turquia"], ["polonia", "egipto"],
    ["alemania", "francia"], ["alemania", "italia"], ["italia", "francia"], ["francia", "espana"], ["espana", "sahara"],
    ["sahara", "egipto"], ["sahara", "etiopia"], ["sahara", "zaire"], ["egipto", "etiopia"], ["egipto", "madagascar"], ["egipto", "turquia"], ["egipto", "israel"],
    ["etiopia", "zaire"], ["etiopia", "sudafrica"], ["zaire", "sudafrica"], ["zaire", "madagascar"],
    ["turquia", "israel"], ["turquia", "arabia"], ["turquia", "iran"], ["israel", "arabia"],
    ["iran", "aral"], ["iran", "mongolia"], ["iran", "gobi"], ["iran", "china"], ["iran", "india"],
    ["aral", "mongolia"], ["aral", "siberia"], ["aral", "tartaria"], ["india", "china"], ["india", "malasia"], ["india", "sumatra"],
    ["china", "gobi"], ["china", "mongolia"], ["china", "siberia"], ["china", "kamchatka"], ["china", "japon"], ["china", "malasia"],
    ["gobi", "mongolia"], ["mongolia", "siberia"], ["siberia", "kamchatka"], ["siberia", "taimir"], ["siberia", "tartaria"], ["tartaria", "taimir"],
    ["kamchatka", "japon"], ["malasia", "borneo"], ["sumatra", "australia"], ["borneo", "australia"], ["java", "australia"],
  ];
  const ADJ = Object.fromEntries(COUNTRIES.map(c => [c.id, []]));
  EDGES.forEach(([a, b]) => { ADJ[a].push(b); ADJ[b].push(a); });
  const COLORS = [
    { name: "Rojo", hex: "#e53935" }, { name: "Azul", hex: "#1e66f5" }, { name: "Amarillo", hex: "#fdd835" },
    { name: "Verde", hex: "#43a047" }, { name: "Negro", hex: "#37383d" }, { name: "Magenta", hex: "#d81b9a" },
  ];
  // Tarjetas: una por país con su símbolo, más dos comodines.
  const SYMBOLS = ["globo", "cañón", "barco"];
  const CARDS = [...COUNTRIES.map((c, i) => ({ id: c.id, sym: SYMBOLS[i % 3] })), { id: "comodin1", sym: "comodín" }, { id: "comodin2", sym: "comodín" }];
  const CARD = Object.fromEntries(CARDS.map(c => [c.id, c]));
  // Objetivos secretos (además del común: ocupar 30 países).
  const OBJECTIVES = [
    { id: "o1", text: "Ocupar África, 5 países de América del Norte y 4 de Europa.", req: { AF: "all", AN: 5, EU: 4 } },
    { id: "o2", text: "Ocupar América del Sur, 7 países de Europa y 3 países limítrofes entre sí en cualquier lugar.", req: { AS: "all", EU: 7 }, chain: true },
    { id: "o3", text: "Ocupar Asia y 2 países de América del Sur.", req: { ASI: "all", AS: 2 } },
    { id: "o4", text: "Ocupar Europa, 4 países de Asia y 2 de América del Sur.", req: { EU: "all", ASI: 4, AS: 2 } },
    { id: "o5", text: "Ocupar América del Norte, 2 países de Oceanía y 4 de Asia.", req: { AN: "all", OC: 2, ASI: 4 } },
    { id: "o6", text: "Ocupar 2 países de Oceanía, 2 de África, 2 de América del Sur, 3 de Europa, 4 de América del Norte y 3 de Asia.", req: { OC: 2, AF: 2, AS: 2, EU: 3, AN: 4, ASI: 3 } },
    { id: "o7", text: "Ocupar Oceanía, América del Norte y 2 países de Europa.", req: { OC: "all", AN: "all", EU: 2 } },
    { id: "o8", text: "Ocupar América del Sur, África y 4 países de Asia.", req: { AS: "all", AF: "all", ASI: 4 } },
    { id: "o9", text: "Ocupar Oceanía, África y 5 países de América del Norte.", req: { OC: "all", AF: "all", AN: 5 } },
  ];
  const COUNT_IN = c => COUNTRIES.filter(x => x.c === c).length;

  const clone = o => JSON.parse(JSON.stringify(o));
  function shuffle(a, rnd = Math.random) { for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(rnd() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; }
  const nick = (g, s) => g.seats?.[s]?.nick || COLORS[s].name;
  const log = (g, s, x) => { g.log = [...(g.log || []), { s, x }].slice(-50); };
  const owned = (g, s) => COUNTRIES.filter(c => g.owner[c.id] === s).map(c => c.id);
  const active = g => Array.from({ length: g.n }, (_, i) => i).filter(i => !g.out[i]);

  /* ---------- Objetivos ---------- */
  function objText(g, s) {
    const o = g.objs[s];
    if (o.destroy != null) return g.out[o.destroy] && g.killedBy?.[o.destroy] !== s
      ? `Tu rival ${COLORS[o.destroy].name.toLowerCase()} ya fue eliminado por otro jugador: ahora tu objetivo es ocupar 30 países.`
      : `Destruir al ejército ${COLORS[o.destroy].name.toLowerCase()} (${nick(g, o.destroy)}). Si lo elimina otro, pasás a ocupar 30 países.`;
    return OBJECTIVES.find(x => x.id === o.id).text;
  }
  function hasChain3(g, s) {
    const mine = new Set(owned(g, s));
    return [...mine].some(b => ADJ[b].filter(x => mine.has(x)).length >= 2 || ADJ[b].some(a => mine.has(a) && ADJ[a].some(c => c !== b && mine.has(c))));
  }
  function objectiveDone(g, s) {
    const o = g.objs[s];
    if (o.destroy != null) {
      if (g.out[o.destroy]) return g.killedBy?.[o.destroy] === s ? true : owned(g, s).length >= 30;
      return false;
    }
    const spec = OBJECTIVES.find(x => x.id === o.id), mine = owned(g, s);
    for (const [c, need] of Object.entries(spec.req)) {
      const have = mine.filter(id => BYID[id].c === c).length;
      if (have < (need === "all" ? COUNT_IN(c) : need)) return false;
    }
    return !spec.chain || hasChain3(g, s);
  }
  function checkWin(g, s) {
    if (g.phase !== "play") return g;
    if (owned(g, s).length >= 30) { g.phase = "over"; g.winner = s; g.winReason = "Ocupó 30 países."; }
    else if (objectiveDone(g, s)) { g.phase = "over"; g.winner = s; g.winReason = "Cumplió su objetivo secreto: " + objText(g, s); }
    if (g.phase === "over") log(g, s, "¡ganó la partida!");
    return g;
  }

  /* ---------- Partida ---------- */
  function setup(g, rnd = Math.random) {
    const ids = shuffle(COUNTRIES.map(c => c.id), rnd);
    g.owner = {}; g.armies = {};
    ids.forEach((id, i) => { g.owner[id] = i % g.n; g.armies[id] = 1; });
    // Objetivos: los de destrucción solo apuntan a colores que juegan (y nunca a uno mismo).
    const pool = shuffle([...OBJECTIVES.map(o => ({ id: o.id })), ...Array.from({ length: g.n }, (_, i) => ({ destroy: i }))], rnd);
    g.objs = [];
    for (let s = 0; s < g.n; s++) {
      const k = pool.findIndex(o => o.destroy == null || o.destroy !== s);
      g.objs.push(pool.splice(k, 1)[0]);
    }
    g.deck = shuffle(CARDS.map(c => c.id), rnd); g.discard = [];
    g.cards = Array.from({ length: g.n }, () => []); g.used = Array.from({ length: g.n }, () => []); g.trades = Array(g.n).fill(0);
    g.out = Array(g.n).fill(false); g.killedBy = {};
    g.phase = "play"; g.winner = null; g.winReason = null; g.log = [];
    g.first = 0; g.round = 0;
    return startRound(g, "setup5");
  }
  // Una ronda: todos los jugadores activos, empezando por g.first.
  function startRound(g, kind) {
    const act = active(g);
    let k = act.indexOf(g.first); if (k < 0) k = 0;
    g.seq = [...act.slice(k), ...act.slice(0, k)]; g.si = 0; g.kind = kind;
    g.stage = kind === "attack" ? "attack" : "place";
    if (kind === "attack") g.round++;
    return beginTurn(g);
  }
  function beginTurn(g) {
    while (g.si < g.seq.length && g.out[g.seq[g.si]]) g.si++;
    if (g.si >= g.seq.length) return nextRound(g);
    const s = g.turn = g.seq[g.si];
    g.conq = 0; g.pendingMove = null; g.lastRoll = null; g.regroup = false; g.placed = []; g.moved = {};
    if (g.stage === "place") {
      if (g.kind === "setup5") g.pool = { free: 5, cont: {} };
      else if (g.kind === "setup3") g.pool = { free: 3, cont: {} };
      else {
        const mine = owned(g, s), cont = {};
        for (const c of Object.keys(CONT)) if (mine.filter(id => BYID[id].c === c).length === COUNT_IN(c)) cont[c] = CONT[c].bonus;
        g.pool = { free: Math.max(3, Math.floor(mine.length / 2)), cont };
      }
    } else g.pool = null;
    return g;
  }
  function nextRound(g) {
    if (g.kind === "setup5") return startRound(g, "setup3");
    if (g.kind === "setup3" || g.kind === "normal") return startRound(g, "attack");
    // Después de cada ronda de ataque viene la de incorporación; la siguiente vuelta empieza el que sigue.
    const act = active(g); g.first = act[(act.indexOf(g.first) + 1) % act.length] ?? act[0];
    return startRound(g, "normal");
  }
  function nextTurn(g) { g.si++; return beginTurn(g); }
  function check(g, s, stage) {
    if (g.phase !== "play") throw new Error("La partida terminó.");
    if (g.turn !== s) throw new Error("No es tu turno.");
    if (stage && g.stage !== stage) throw new Error(stage === "place" ? "Ahora no es momento de incorporar ejércitos." : "Ahora no es momento de atacar.");
  }
  const poolLeft = p => p ? p.free + Object.values(p.cont).reduce((a, b) => a + b, 0) : 0;

  /* ---------- Incorporar ---------- */
  function place(g0, s, id, k = 1) {
    const g = clone(g0); check(g, s, "place");
    if (g.owner[id] !== s) throw new Error("Solo podés poner ejércitos en tus países.");
    for (let i = 0; i < k; i++) {
      const c = BYID[id].c;
      let from;
      if (g.pool.cont[c] > 0) { g.pool.cont[c]--; from = c; }
      else if (g.pool.free > 0) { g.pool.free--; from = "free"; }
      else if (i === 0) {
        const left = Object.entries(g.pool.cont).filter(([, v]) => v > 0).map(([cc]) => CONT[cc].name);
        throw new Error(left.length ? `Te quedan ejércitos que van solo en ${left.join(" y ")}.` : "Ya pusiste todos tus ejércitos.");
      } else break;
      g.armies[id]++; g.placed.push({ id, from });
    }
    return g;
  }
  function unplace(g0, s) {
    const g = clone(g0); check(g, s, "place");
    const last = g.placed.pop(); if (!last) throw new Error("No hay nada para deshacer.");
    g.armies[last.id]--; if (last.from === "free") g.pool.free++; else g.pool.cont[last.from]++;
    return g;
  }
  function finishPlace(g0, s) {
    const g = clone(g0); check(g, s, "place");
    if (poolLeft(g.pool) > 0) throw new Error("Todavía te quedan ejércitos para poner.");
    const n = g.placed.length;
    if (n) log(g, s, `incorporó ${n} ${n === 1 ? "ejército" : "ejércitos"}`);
    return nextTurn(g);
  }
  const tradeValue = n => n < 3 ? [4, 7, 10][n] : 10 + 5 * (n - 2);
  function validSet(ids) {
    if (ids.length !== 3) return false;
    const syms = ids.map(id => CARD[id].sym), wild = syms.filter(x => x === "comodín").length, rest = syms.filter(x => x !== "comodín");
    if (wild) return true;
    return new Set(rest).size === 1 || new Set(rest).size === 3;
  }
  function findSet(cards) {
    for (let a = 0; a < cards.length; a++) for (let b = a + 1; b < cards.length; b++) for (let c = b + 1; c < cards.length; c++)
      if (validSet([cards[a], cards[b], cards[c]])) return [cards[a], cards[b], cards[c]];
    return null;
  }
  function trade(g0, s, ids) {
    const g = clone(g0); check(g, s, "place");
    if (g.kind !== "normal") throw new Error("Los canjes se hacen en las rondas de incorporación.");
    if (!ids.every(id => g.cards[s].includes(id)) || !validSet(ids)) throw new Error("Para canjear necesitás 3 tarjetas del mismo símbolo o de símbolos distintos (el comodín sirve para cualquiera).");
    const v = tradeValue(g.trades[s]);
    g.trades[s]++; g.pool.free += v;
    g.cards[s] = g.cards[s].filter(id => !ids.includes(id)); g.used[s] = g.used[s].filter(id => !ids.includes(id));
    g.discard.push(...ids);
    log(g, s, `canjeó tarjetas por ${v} ejércitos`);
    return g;
  }
  function useCard(g0, s, id) {
    const g = clone(g0); check(g, s, "place");
    if (!g.cards[s].includes(id) || g.used[s].includes(id)) throw new Error("Esa tarjeta no se puede usar.");
    if (g.owner[id] !== s) throw new Error("Para usar una tarjeta, el país tiene que ser tuyo.");
    g.armies[id] += 2; g.used[s].push(id);
    log(g, s, `usó la tarjeta de ${BYID[id].name}: +2 ejércitos`);
    return g;
  }

  /* ---------- Atacar ---------- */
  function attack(g0, s, from, to, rnd = Math.random) {
    const g = clone(g0); check(g, s, "attack");
    if (g.pendingMove) throw new Error("Primero pasá ejércitos al país conquistado.");
    if (g.regroup) throw new Error("Después de reagrupar ya no se puede atacar.");
    if (g.owner[from] !== s || g.owner[to] === s) throw new Error("Atacá desde un país tuyo a uno enemigo.");
    if (!ADJ[from].includes(to)) throw new Error("Solo se puede atacar a un país limítrofe.");
    if (g.armies[from] < 2) throw new Error("Para atacar necesitás al menos 2 ejércitos en ese país.");
    const na = Math.min(3, g.armies[from] - 1), nd = Math.min(3, g.armies[to]);
    const roll = n => Array.from({ length: n }, () => 1 + Math.floor(rnd() * 6)).sort((a, b) => b - a);
    const a = roll(na), d = roll(nd);
    let la = 0, ld = 0;
    for (let i = 0; i < Math.min(na, nd); i++) { if (a[i] > d[i]) ld++; else la++; }
    g.armies[from] -= la; g.armies[to] -= ld;
    const def = g.owner[to];
    g.rolls = (g.rolls || 0) + 1;
    g.lastRoll = { from, to, a, d, la, ld, def, n: g.rolls };
    if (g.armies[to] === 0) {
      g.owner[to] = s; g.conq++;
      g.pendingMove = { from, to, max: Math.min(3, g.armies[from] - 1) };
      log(g, s, `conquistó ${BYID[to].name}`);
      if (!owned(g, def).length) {
        g.out[def] = true; g.killedBy[def] = s;
        g.cards[s].push(...g.cards[def]); g.cards[def] = [];
        log(g, s, `eliminó a ${nick(g, def)}`);
      }
      if (g.pendingMove.max <= 1) { g.armies[from] -= 1; g.armies[to] = 1; g.pendingMove = null; }
      checkWin(g, s);
    }
    return g;
  }
  function moveIn(g0, s, k) {
    const g = clone(g0); check(g, s, "attack");
    const p = g.pendingMove; if (!p) throw new Error("No hay ejércitos para pasar.");
    k = Math.max(1, Math.min(p.max, k));
    g.armies[p.from] -= k; g.armies[p.to] = k; g.pendingMove = null;
    return g;
  }
  // Reagrupar: pasar ejércitos entre países propios limítrofes. Los que llegan en este turno no se vuelven a mover.
  function regroup(g0, s, from, to, k = 1) {
    const g = clone(g0); check(g, s, "attack");
    if (g.pendingMove) throw new Error("Primero pasá ejércitos al país conquistado.");
    if (g.owner[from] !== s || g.owner[to] !== s || !ADJ[from].includes(to)) throw new Error("Solo se reagrupa entre países tuyos limítrofes.");
    const movable = g.armies[from] - 1 - (g.moved[from] || 0);
    if (k > movable) throw new Error(movable > 0 ? `Desde ahí podés mover hasta ${movable}.` : "Desde ese país no podés mover ejércitos.");
    g.armies[from] -= k; g.armies[to] += k; g.moved[to] = (g.moved[to] || 0) + k; g.regroup = true;
    return g;
  }
  function endAttack(g0, s) {
    const g = clone(g0); check(g, s, "attack");
    if (g.pendingMove) throw new Error("Primero pasá ejércitos al país conquistado.");
    if (g.conq > 0 && g.cards[s].length < 5) {
      if (!g.deck.length) { g.deck = shuffle(g.discard); g.discard = []; }
      const c = g.deck.pop();
      if (c) { g.cards[s].push(c); g.gotCard = { s, id: c }; log(g, s, "recibió una tarjeta"); }
    } else g.gotCard = null;
    checkWin(g, s);
    if (g.phase !== "play") return g;
    return nextTurn(g);
  }

  /* ---------- IA ----------
     Fácil: ataca cuando tiene más ejércitos y a veces se frena. Medio: refuerza fronteras y ataca con ventaja.
     Difícil: además apunta a su objetivo secreto, completa continentes y reagrupa hacia el frente. */
  function wants(g, s) {
    const o = g.objs[s], w = Object.fromEntries(Object.keys(CONT).map(c => [c, 1]));
    if (o.destroy != null && !g.out[o.destroy]) return { cont: w, enemy: o.destroy };
    if (o.id) for (const c of Object.keys(OBJECTIVES.find(x => x.id === o.id).req)) w[c] = 3;
    return { cont: w, enemy: null };
  }
  const border = (g, id) => ADJ[id].some(n => g.owner[n] !== g.owner[id]);
  function botPlaceTarget(g, s, level, rnd) {
    const mine = owned(g, s), W = wants(g, s);
    const c = Object.entries(g.pool.cont).find(([, v]) => v > 0)?.[0];
    let cand = mine.filter(id => (!c || BYID[id].c === c));
    if (level === "facil") { const b = cand.filter(id => border(g, id)); if (b.length) cand = b;
      // Junta tropas en su país más fuerte de la frontera la mayoría de las veces.
      return rnd() < 0.6 ? cand.sort((x, y) => g.armies[y] - g.armies[x])[0] : cand[Math.floor(rnd() * cand.length)]; }
    const score = id => {
      if (!border(g, id)) return -100;
      const enemies = ADJ[id].filter(n => g.owner[n] !== s);
      const weak = Math.min(...enemies.map(n => g.armies[n]));
      let v = (level === "dificil" ? W.cont[BYID[id].c] * 2 : 1) - weak * 0.3 + g.armies[id] * 0.15;
      if (W.enemy != null && enemies.some(n => g.owner[n] === W.enemy)) v += 2;
      return v + rnd() * 0.3;
    };
    return cand.sort((a, b) => score(b) - score(a))[0];
  }
  function botAttackChoice(g, s, level, rnd) {
    const W = wants(g, s), opts = [];
    for (const from of owned(g, s)) {
      if (g.armies[from] < 2) continue;
      for (const to of ADJ[from]) {
        if (g.owner[to] === s) continue;
        const a = g.armies[from], d = g.armies[to];
        const need = level === "facil" ? 1 : level === "medio" ? 2 : 1;
        if (a - d < need && !(level !== "facil" && a >= 3 && d === 1)) continue;
        let v = a - d;
        if (level === "dificil") { v += W.cont[BYID[to].c] * 1.5; if (g.owner[to] === W.enemy) v += 3; }
        opts.push({ from, to, v: v + rnd() });
      }
    }
    if (!opts.length) return null;
    if (level === "facil" && rnd() < 0.15) return null;
    return opts.sort((x, y) => y.v - x.v)[0];
  }
  function botStep(g, s, level = "medio", rnd = Math.random) {
    if (g.stage === "place") {
      let h = g;
      if (h.kind === "normal") {
        const set = findSet(h.cards[s]);
        if (set && (level !== "facil" || h.cards[s].length >= 5)) return trade(h, s, set);
        const use = h.cards[s].find(id => !h.used[s].includes(id) && h.owner[id] === s);
        if (use && level !== "facil") return useCard(h, s, use);
      }
      while (poolLeft(h.pool) > 0) h = place(h, s, botPlaceTarget(h, s, level, rnd), 1);
      return finishPlace(h, s);
    }
    if (g.pendingMove) {
      const p = g.pendingMove, inner = !border(g, p.from) || ADJ[p.from].every(n => g.owner[n] === s || n === p.to);
      return moveIn(g, s, inner || level !== "facil" ? p.max : 1);
    }
    if (!g.regroup) {
      const ch = botAttackChoice(g, s, level, rnd);
      if (ch) return attack(g, s, ch.from, ch.to, rnd);
    }
    if (level !== "facil" && !g.regroup) {
      // Mover un grupo del interior hacia la frontera.
      for (const id of owned(g, s)) {
        if (border(g, id) || g.armies[id] < 3) continue;
        const to = ADJ[id].find(n => g.owner[n] === s && border(g, n));
        if (to) return regroup(g, s, id, to, g.armies[id] - 1);
      }
    }
    return endAttack(g, s);
  }

  const api = { CONT, COUNTRIES, BYID, ADJ, EDGES, COLORS, CARDS, CARD, OBJECTIVES, setup, place, unplace, finishPlace, trade, useCard,
    attack, moveIn, regroup, endAttack, botStep, owned, active, objText, objectiveDone, poolLeft, findSet, validSet, tradeValue, clone, shuffle };
  if (typeof module !== "undefined") module.exports = api; else root.Teg = api;
})(this);
