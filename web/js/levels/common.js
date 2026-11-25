// Pezzi in comune delle stagioni: elenco degli obiettivi (41) e degli sblocchi (19), con le parole che cambiano da stagione a stagione
// (e da città a città: cibi e bevande). Tutte le stagioni li usano: ogni stagione definisce il suo vocabolario "v".
// Vocabolario v: wood, treeArt/trees (albero), guest/guests, guestEmoji, firstGuest, drinks (bevande al plurale), drink (singolare), stand, stand2,
// standTitle, stand2Title, fire/fires, room (femminile), roomTitle, roomShort, helper (articolo + nome), helperTitle, bootsName, bootsTitle,
// insulText, insulTitle, signText, signTitle, mascotEmoji, mascotText, mascotName.
(function (R) {
  R.makeObjectives = function (v, rewardBase) {
    const S = (stat, n, text, guide, decimals) => Object.assign({ text, stat, n, guide }, decimals ? { decimals } : {});
    const B = (bought, text) => ({ text, bought, guide: 'pad:' + bought });
    const o = [
      S('wood', 4, `🪓 Taglia 4 pezzi di ${v.wood}: fermati vicino a ${v.treeArt}`, 'tree'),
      S('fed', 3, `🔥 Porta la ${v.wood} al ${v.fire} della prima ${v.room}`, 'feed'),
      S('guests', 1, `${v.guestEmoji} Accogli ${v.firstGuest}`, ''),
      S('collected', 15, '🪙 Raccogli le monete lasciate dagli ospiti', 'pile'),
      B('room1', `🛏️ Apri la seconda ${v.room}`),
      S('guests', 3, `🧑‍🤝‍🧑 Accogli 3 ${v.guests}`, ''),
      B('boots', `👟 Compra ${v.bootsName}`),
      S('trees', 8, `🌲 Abbatti 8 ${v.trees}`, 'tree'),
      S('collected', 50, '🪙 Raccogli 50 monete', 'pile'),
      B('cocoa', `${v.foodEmoji} Apri ${v.stand}`),
      S('cocoa', 3, `${v.foodEmoji} Servi 3 ${v.drinks} agli ospiti che ne vogliono`, 'cocoa'),
      B('bag', '🎒 Compra lo zaino grande'),
      S('fed', 40, `🔥 Porta 40 pezzi di ${v.wood} ai ${v.fires}`, 'feed'),
      S('guests', 8, `🧑‍🤝‍🧑 Accogli 8 ${v.guests}`, ''),
      B('helper', `🧔 Assumi ${v.helper} che porti la ${v.wood}`),
      S('collected', 100, '🪙 Raccogli 100 monete', 'pile'),
      B('axe', '🪓 Compra l\'ascia affilata: taglia più in fretta'),
      S('cocoa', 10, `${v.foodEmoji} Servi 10 ${v.drinks}`, 'cocoa'),
      B('room2', `🛏️ Apri la terza ${v.room}`),
      S('guests', 14, `🧑‍🤝‍🧑 Accogli 14 ${v.guests}`, ''),
      S('trees', 20, `🌲 Abbatti 20 ${v.trees}`, 'tree'),
      B('insul', `🧱 ${v.insulText}`),
      S('collected', 220, '🪙 Raccogli 220 monete', 'pile'),
      B('lamps', '🏮 Appendi le lanterne colorate'),
      S('cocoa', 18, `${v.foodEmoji} Servi 18 ${v.drinks}`, 'cocoa'),
      B('saw', '🪚 Compra la motosega: taglia ancora più in fretta'),
      S('fed', 110, `🔥 Porta 110 pezzi di ${v.wood} ai ${v.fires}`, 'feed'),
      B('sign', `🪧 ${v.signText}`),
      S('guests', 24, `🧑‍🤝‍🧑 Accogli 24 ${v.guests}`, ''),
      B('bag2', '🎒 Compra lo zaino gigante'),
      S('collected', 380, '🪙 Raccogli 380 monete', 'pile'),
      B('cocoa2', `${v.foodEmoji} Compra ${v.stand2}`),
      S('cocoa', 30, `${v.foodEmoji} Servi 30 ${v.drinks}`, 'cocoa'),
      B('helper2', `🧔 Assumi ${v.helper} della seconda ${v.room}`),
      B('waiter', `🤵 Assumi il cameriere della prima ${v.room}`),
      S('guests', 36, `🧑‍🤝‍🧑 Accogli 36 ${v.guests}`, ''),
      B('waiter2', `🤵 Assumi il cameriere della seconda ${v.room}`),
      B('helper3', `🧔 Assumi ${v.helper} della terza ${v.room}`),
      B('mascot', `${v.mascotEmoji} ${v.mascotText}`),
      B('waiter3', `🤵 Assumi il cameriere della terza ${v.room}`),
      S('stars', 5, '⭐ Raggiungi 5 stelle di reputazione', '', 1)
    ];
    o.forEach((x, i) => { x.reward = rewardBase + 5 * Math.floor(i / 13); });
    return o;
  };

  // Sblocchi: stessi id e posizioni in tutte le stagioni. Compaiono a gradini: requires.purchases = quanti miglioramenti hai già comprato
  // (non dipende dagli obiettivi). c = moltiplicatore dei costi, lake = c'è un lago (cambia la posizione della mascotte).
  R.makeUnlocks = function (v, c, lake) {
    const k = x => Math.round(x * (c || 1)), P = n => ({ purchases: n });
    return [
      { id: 'room1', title: `${v.roomTitle} 2`, cost: k(42), pos: [6, -6.5], requires: P(0), effect: 'room', room: 1 },
      { id: 'bag', title: 'Zaino grande', cost: k(52), pos: [-3.6, 1.4], requires: P(0), effect: 'bag' },
      { id: 'boots', title: v.bootsTitle, cost: k(48), pos: [6.5, -0.6], requires: P(0), effect: 'boots' },
      { id: 'cocoa', title: v.standTitle, cost: k(62), pos: [11, -4.4], requires: P(2), effect: 'cocoa' },
      { id: 'helper', title: `${v.helperTitle} 1`, cost: k(155), pos: [-11, -1], requires: P(3), effect: 'helper', room: 0 },
      { id: 'axe', title: 'Ascia affilata', cost: k(72), pos: [-7.2, 1.6], requires: P(3), effect: 'axe' },
      { id: 'room2', title: `${v.roomTitle} 3`, cost: k(125), pos: [-6, -6.5], requires: P(4), effect: 'room', room: 2 },
      { id: 'insul', title: v.insulTitle, cost: k(92), pos: [-11.5, -4.8], requires: P(4), effect: 'insul' },
      { id: 'lamps', title: 'Lanterne', cost: k(62), pos: [15, 3.6], requires: P(5), effect: 'lamps' },
      { id: 'sign', title: v.signTitle, cost: k(112), pos: [9.5, 3.6], requires: P(6), effect: 'sign' },
      { id: 'saw', title: 'Motosega', cost: k(225), pos: [-3.2, 4.6], requires: P(6), effect: 'saw' },
      { id: 'bag2', title: 'Zaino gigante', cost: k(92), pos: [-0.5, 3.4], requires: P(6), effect: 'bag2' },
      { id: 'cocoa2', title: v.stand2Title, cost: k(102), pos: [14.6, -4.4], requires: P(7), effect: 'cocoa2' },
      { id: 'helper2', title: `${v.helperTitle} 2`, cost: k(205), pos: [-11, 2.8], requires: P(7), effect: 'helper', room: 1, needRoom: 1 },
      { id: 'waiter', title: `Cameriere ${v.roomShort} 1`, cost: k(92), pos: [-2.2, -0.4], requires: P(7), effect: 'waiter', room: 0, needRoom: 0 },
      { id: 'mascot', title: v.mascotName, cost: k(105), pos: lake ? [-12.6, 7.2] : [-14.5, -2.5], requires: P(8), effect: 'mascot' },
      { id: 'waiter2', title: `Cameriere ${v.roomShort} 2`, cost: k(112), pos: [9.6, -1.8], requires: P(9), effect: 'waiter', room: 1, needRoom: 1 },
      { id: 'helper3', title: `${v.helperTitle} 3`, cost: k(235), pos: [-13.5, 2.4], requires: P(9), effect: 'helper', room: 2, needRoom: 2 },
      { id: 'waiter3', title: `Cameriere ${v.roomShort} 3`, cost: k(132), pos: [-9.2, -2.2], requires: P(11), effect: 'waiter', room: 2, needRoom: 2 }
    ];
  };

  // Numeri di gioco di base (quelli dell'inverno); ogni stagione ne cambia qualcuno.
  R.baseTuning = function (over) {
    return Object.assign({
      trees: 14, forest_trees: 90, chop_range: 1.6, chop_interval: 0.45, axe_mul: 0.7, saw_mul: 0.4, logs_per_tree: 4, tree_regrow: 13,
      bag_logs: 15, bag_cups: 5, bag_big_logs: 30, bag_big_cups: 10, bag_huge_logs: 60, bag_huge_cups: 20,
      world_min: [-30, -20], world_max: [30, 26], speed_base: 4.7, speed_fast: 6.3, feed_range: 1.6, feed_interval: 0.14,
      fuel_max: 10, burn_busy: 3.1, burn_idle: 8.5, insul_mul: 1.4, guest_spawn_min: 4.8, guest_spawn_max: 7.5, sign_mul: 0.65,
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
