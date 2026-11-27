// Pezzi in comune delle stagioni: elenco degli obiettivi (51) e degli sblocchi (29), con le parole che cambiano da stagione a stagione
// (e da città a città: cibi e bevande). Tutte le stagioni li usano: ogni stagione definisce il suo vocabolario "v".
// Vocabolario v: wood, treeArt/trees (albero), guest/guests, guestEmoji, firstGuest, drinks (bevande al plurale), drink (singolare), stand, stand2,
// standTitle, stand2Title, fire/fires, room (femminile), roomTitle, roomShort, helper (articolo + nome), helperTitle, bootsName, bootsTitle,
// insulText, insulTitle, signText, signTitle, mascotEmoji, mascotText, mascotName.
(function (R) {
  // Cosa si raccoglie in ogni stagione, dove si porta e con quale macchinario.
  R.RES = {
    inverno: { kind: 'wood', e: '🪵', name: 'legna', the: 'la legna', many: 'abeti', verb: 'Taglia', fire: 'caldaia', theFire: 'la caldaia', toFire: 'alla caldaia', machine: 'Taglialegna', theMachine: 'il taglialegna', cols: [0xb07848, 0xe6b27a, 0x7a4a30], carry: 'pezzi di legna', helper: 'Boscaiolo' },
    primavera: { kind: 'veg', e: '🥬', name: 'ortaggi', the: 'gli ortaggi', many: 'piante', verb: 'Raccogli', fire: 'cucina', theFire: 'la cucina', toFire: 'alla cucina', machine: 'Raccoglitrice', theMachine: 'la raccoglitrice', cols: [0x7ac943, 0x57c455, 0xff7a3d], carry: 'ortaggi', helper: 'Ortolano' },
    estate: { kind: 'grain', e: '🌾', name: 'grano', the: 'il grano', many: 'covoni', verb: 'Raccogli', fire: 'forno', theFire: 'il forno', toFire: 'al forno', machine: 'Mietitrebbia', theMachine: 'la mietitrebbia', cols: [0xffd23a, 0xd9a93a, 0xfff2a8], carry: 'fasci di grano', helper: 'Contadino' },
    autunno: { kind: 'pumpkin', e: '🎃', name: 'zucche', the: 'le zucche', many: 'piante di zucca', verb: 'Raccogli', fire: 'calderone', theFire: 'il calderone', toFire: 'al calderone', machine: 'Raccogli-zucche', theMachine: 'la raccogli-zucche', cols: [0xff8a1f, 0xffb347, 0x4a7a2a], carry: 'zucche', helper: 'Contadino' }
  };

  R.makeObjectives = function (v, rewardBase) {
    const r = R.RES[v.season] || R.RES.inverno;
    const S = (stat, n, text, guide, decimals) => Object.assign({ text, stat, n, guide }, decimals ? { decimals } : {});
    const B = (bought, text) => ({ text, bought, guide: 'pad:' + bought });
    const room = n => B('room' + (n - 1), `🛏️ Apri la stanza ${n}`);
    const o = [
      S('wood', 4, `${r.e} ${r.verb} 4 ${r.carry} nel campo in cima`, 'tree'),
      S('fed', 4, `🔥 Porta ${r.the} ${r.toFire}`, 'feed'),
      S('guests', 1, `${v.guestEmoji} Accogli ${v.firstGuest}`, ''),
      S('collected', 15, '🪙 Raccogli le monete alla reception', 'pile'),
      room(2),
      S('restock', 2, '🧻 Rifornisci un bagno: prendi le scorte nello sgabuzzino', 'bath'),
      S('guests', 3, `🧑‍🤝‍🧑 Accogli 3 ${v.guests}`, ''),
      B('boots', `👟 Compra ${v.bootsName}`),
      S('trees', 8, `🌲 ${r.verb} per intero 8 ${r.many}`, 'tree'),
      S('collected', 50, '🪙 Raccogli 50 monete', 'pile'),
      B('mensa', '🍽️ Apri la sala mensa'),
      B('cocoa', `${v.foodEmoji} Metti in mensa ${v.stand}`),
      S('cocoa', 3, `${v.foodEmoji} Servi 3 ${v.drinks} in mensa`, 'cocoa'),
      B('bag', '🎒 Compra lo zaino grande'),
      S('fed', 40, `🔥 Porta ${r.the} ${r.toFire}: 40 in tutto`, 'feed'),
      S('guests', 8, `🧑‍🤝‍🧑 Accogli 8 ${v.guests}`, ''),
      B('helper', `🧔 Assumi un aiutante che porta ${r.the}`),
      S('collected', 100, '🪙 Raccogli 100 monete', 'pile'),
      B('axe', '🪓 Compra l\'attrezzo affilato: raccogli più in fretta'),
      S('cocoa', 10, `${v.foodEmoji} Servi 10 ${v.drinks}`, 'cocoa'),
      room(3),
      S('restock', 14, '🧼 Porta 14 scorte ai bagni', 'bath'),
      room(4),
      B('cleaner', '🧹 Assumi l\'addetto che rifornisce i bagni'),
      B('insul', '🧱 Migliora l\'impianto: consuma meno'),
      S('collected', 220, '🪙 Raccogli 220 monete', 'pile'),
      B('snack', '🍰 Metti in mensa il banco dei dolci'),
      B('lamps', '🏮 Appendi le lanterne lungo la strada'),
      S('cocoa', 18, `${v.foodEmoji} Servi 18 ${v.drinks}`, 'cocoa'),
      B('saw', '🪚 Compra la motosega: ancora più veloce'),
      B('harvester', `🚜 Compra ${r.theMachine}`),
      S('mowed', 60, `🚜 Raccogli 60 pezzi con ${r.theMachine}`, 'machine'),
      S('fed', 150, `🔥 Porta ${r.the} ${r.toFire}: 150 in tutto`, 'feed'),
      B('sign', `🪧 ${v.signText}`),
      S('guests', 26, `🧑‍🤝‍🧑 Accogli 26 ${v.guests}`, ''),
      B('bag2', '🎒 Compra lo zaino gigante'),
      room(5),
      S('collected', 450, '🪙 Raccogli 450 monete', 'pile'),
      B('cocoa2', `${v.foodEmoji} Compra ${v.stand2}`),
      B('waiter', '🤵 Assumi il primo cameriere della mensa'),
      B('cinema', '🎬 Apri la sala cinema'),
      S('guests', 40, `🧑‍🤝‍🧑 Accogli 40 ${v.guests}`, ''),
      B('helper2', '🧔 Assumi il secondo aiutante'),
      room(6),
      B('waiter2', '🤵 Assumi il secondo cameriere'),
      B('helper3', '🧔 Assumi il terzo aiutante'),
      B('mascot', `${v.mascotEmoji} ${v.mascotText}`),
      room(7),
      B('waiter3', '🤵 Assumi il terzo cameriere'),
      room(8),
      S('stars', 5, '⭐ Raggiungi 5 stelle di reputazione', '', 1)
    ];
    o.forEach((x, i) => { x.reward = rewardBase + 5 * Math.floor(i / 13); });
    return o;
  };

  // Sblocchi: stessi id in tutte le stagioni; le posizioni sono quelle della pianta normale (places.js le specchia dove serve).
  // Compaiono a gradini: requires.purchases = quanti miglioramenti hai già comprato. c = moltiplicatore dei costi.
  R.makeUnlocks = function (v, c) {
    const k = x => Math.round(x * (c || 1)), P = n => ({ purchases: n }), r = R.RES[v.season] || R.RES.inverno;
    const room = (n, cost, need) => ({ id: 'room' + n, title: `Stanza ${n + 1}`, cost: k(cost), pos: [(n % 2 ? 1 : -1) * 4.7, -23 + Math.floor(n / 2) * 5 + 2.5], requires: P(need), effect: 'room', room: n });
    const help = (n, cost, need) => ({ id: n ? 'helper' + (n + 1) : 'helper', title: `${r.helper} ${n + 1}`, cost: k(cost), pos: [-12 + n * 2.5, -29.6], requires: P(need), effect: 'helper', room: n });
    const wait = (n, cost, need) => ({ id: n ? 'waiter' + (n + 1) : 'waiter', title: `Cameriere ${n + 1}`, cost: k(cost), pos: [-10.8 + n * 2.3, 6.4], requires: P(need), effect: 'waiter', room: n, needMensa: true });
    return [
      room(1, 42, 0),
      { id: 'bag', title: 'Zaino grande', cost: k(52), pos: [-3.6, 8.2], requires: P(0), effect: 'bag' },
      { id: 'boots', title: v.bootsTitle, cost: k(48), pos: [-6.2, 9.3], requires: P(0), effect: 'boots' },
      { id: 'mensa', title: 'Sala mensa', cost: k(70), pos: [-6.8, 2.4], requires: P(1), effect: 'mensa' },
      { id: 'cocoa', title: v.standTitle, cost: k(62), pos: [-9.6, -1.6], requires: P(2), effect: 'cocoa', needMensa: true },
      help(0, 155, 3),
      { id: 'axe', title: 'Attrezzo affilato', cost: k(72), pos: [7, -29.6], requires: P(3), effect: 'axe' },
      room(2, 110, 3), room(3, 170, 5),
      { id: 'cleaner', title: 'Addetto ai bagni', cost: k(180), pos: [10.6, -25], requires: P(6), effect: 'cleaner' },
      { id: 'insul', title: 'Impianto migliore', cost: k(92), pos: [3, -27], requires: P(4), effect: 'insul' },
      { id: 'snack', title: 'Banco dolci', cost: k(140), pos: [-4.5, -1.6], requires: P(5), effect: 'snack', needMensa: true },
      { id: 'lamps', title: 'Lanterne', cost: k(62), pos: [-12, 9.3], requires: P(5), effect: 'lamps' },
      { id: 'sign', title: v.signTitle, cost: k(112), pos: [-9.2, 9.3], requires: P(6), effect: 'sign' },
      { id: 'saw', title: 'Motosega', cost: k(225), pos: [9.6, -29.6], requires: P(6), effect: 'saw' },
      { id: 'bag2', title: 'Zaino gigante', cost: k(150), pos: [-3.6, 10.4], requires: P(6), effect: 'bag2' },
      { id: 'harvester', title: r.machine, cost: k(450), pos: [12.4, -29.6], requires: P(8), effect: 'harvester' },
      { id: 'cocoa2', title: v.stand2Title, cost: k(102), pos: [-7.1, -1.6], requires: P(7), effect: 'cocoa2', needMensa: true },
      wait(0, 120, 7),
      room(4, 260, 8),
      { id: 'cinema', title: 'Sala cinema', cost: k(350), pos: [6.1, 2.4], requires: P(10), effect: 'cinema' },
      help(1, 205, 7),
      { id: 'mascot', title: v.mascotName, cost: k(105), pos: [12.4, 8.6], requires: P(8), effect: 'mascot' },
      room(5, 360, 11),
      wait(1, 160, 9),
      help(2, 235, 9),
      room(6, 450, 14),
      wait(2, 200, 11),
      room(7, 560, 16)
    ];
  };
  // Numeri di gioco di base (quelli dell'inverno); ogni stagione ne cambia qualcuno.
  R.baseTuning = function (over) {
    return Object.assign({
      trees: 14, forest_trees: 90, chop_range: 1.7, chop_interval: 0.45, axe_mul: 0.7, saw_mul: 0.4, logs_per_tree: 4, tree_regrow: 13,
      bag_logs: 15, bag_cups: 5, bag_big_logs: 30, bag_big_cups: 10, bag_huge_logs: 60, bag_huge_cups: 20,
      world_min: [-18, -48], world_max: [18, 15], speed_base: 4.7, speed_fast: 6.3, feed_range: 1.6, feed_interval: 0.14,
      fuel_max: 60, burn_busy: 3.1, burn_idle: 8.5, insul_mul: 1.4, guest_spawn_min: 4.8, guest_spawn_max: 7.5, sign_mul: 0.65,
      guest_stay: 15.5, guest_cold_limit: 7.5, cold_penalty: 2, pay: 11, tip: 6.5, cocoa_interval: 2.4, cocoa_max: 4,
      cocoa2_interval: 1.35, cocoa2_max: 6, cocoa_chance: 0.62, helper_load: 5, star_per_guest: 0.25, stars_max: 5
    }, over || {});
  };

  // Testi del livello ricavati dal vocabolario: l'ospite chiede la bevanda ("Cioccolata? ☕"), ringrazia, e il riepilogo finale.
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  R.foodText = function (v) {
    const one = cap(v.drinkOne || v.drink);
    return { want: `${one}? ${v.foodEmoji}`, thanks: v.thanks || 'Che buono! 😋', drinkShort: `${v.drinkOne ? 'la ' : 'la '}${v.drinkOne || v.drink}` };
  };
})(window.Rifugio);
