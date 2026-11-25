// Livello 1 (Inverno): tutti i numeri, gli sblocchi, gli obiettivi e l'aspetto. Per bilanciare il gioco si modifica solo questo file.
// unlocks.requires: {objectives: n} (dopo n obiettivi) oppure {bought: "id"} (dopo un altro sblocco).
// unlocks.effect: "room" (apre rooms[room]), "bag", "bag2", "boots", "cocoa", "cocoa2", "axe", "saw", "insul", "sign", "lamps", "mascot",
// "helper" (boscaiolo della stanza `room`), "waiter" (cameriere della stanza `room`); needRoom: la piazzola compare solo a stanza aperta.
// objectives: contano una statistica ({stat, n}: wood, fed, guests, collected, cocoa, trees, stars) oppure uno sblocco ({bought});
// guide dice dove punta la freccia ("tree", "feed", "pile", "cocoa", "pad:<id>"). Ogni obiettivo si completa in meno di 3,5 minuti.
(function () {
  const objectives = [
    { text: '🪓 Taglia 4 pezzi di legna: fermati vicino a un abete', stat: 'wood', n: 4, guide: 'tree' },
    { text: '🔥 Porta la legna al camino della prima stanza', stat: 'fed', n: 3, guide: 'feed' },
    { text: '🧑 Ospita il primo escursionista al caldo', stat: 'guests', n: 1, guide: '' },
    { text: '🪙 Raccogli le monete lasciate dagli ospiti', stat: 'collected', n: 15, guide: 'pile' },
    { text: '🛏️ Sblocca la seconda stanza', bought: 'room1', guide: 'pad:room1' },
    { text: '🧑‍🤝‍🧑 Ospita 3 escursionisti', stat: 'guests', n: 3, guide: '' },
    { text: '👢 Compra gli scarponi veloci', bought: 'boots', guide: 'pad:boots' },
    { text: '🌲 Abbatti 8 abeti', stat: 'trees', n: 8, guide: 'tree' },
    { text: '🪙 Raccogli 50 monete', stat: 'collected', n: 50, guide: 'pile' },
    { text: '☕ Apri il banco della cioccolata calda', bought: 'cocoa', guide: 'pad:cocoa' },
    { text: '☕ Servi 3 cioccolate agli ospiti che la chiedono', stat: 'cocoa', n: 3, guide: 'cocoa' },
    { text: '🎒 Compra lo zaino grande', bought: 'bag', guide: 'pad:bag' },
    { text: '🔥 Porta 40 pezzi di legna ai camini', stat: 'fed', n: 40, guide: 'feed' },
    { text: '🧑‍🤝‍🧑 Ospita 8 escursionisti', stat: 'guests', n: 8, guide: '' },
    { text: '🧔 Assumi un boscaiolo che porti la legna', bought: 'helper', guide: 'pad:helper' },
    { text: '🪙 Raccogli 100 monete', stat: 'collected', n: 100, guide: 'pile' },
    { text: '🪓 Compra l\'ascia affilata: taglia più in fretta', bought: 'axe', guide: 'pad:axe' },
    { text: '☕ Servi 10 cioccolate', stat: 'cocoa', n: 10, guide: 'cocoa' },
    { text: '🛏️ Sblocca la terza stanza', bought: 'room2', guide: 'pad:room2' },
    { text: '🧑‍🤝‍🧑 Ospita 14 escursionisti', stat: 'guests', n: 14, guide: '' },
    { text: '🌲 Abbatti 20 abeti', stat: 'trees', n: 20, guide: 'tree' },
    { text: '🧱 Durata camini più lunga', bought: 'insul', guide: 'pad:insul' },
    { text: '🪙 Raccogli 220 monete', stat: 'collected', n: 220, guide: 'pile' },
    { text: '🏮 Appendi le lanterne colorate', bought: 'lamps', guide: 'pad:lamps' },
    { text: '☕ Servi 18 cioccolate', stat: 'cocoa', n: 18, guide: 'cocoa' },
    { text: '🪚 Compra la motosega: taglia ancora più in fretta', bought: 'saw', guide: 'pad:saw' },
    { text: '🔥 Porta 110 pezzi di legna ai camini', stat: 'fed', n: 110, guide: 'feed' },
    { text: '🪧 Pianta il cartello: arrivano più ospiti', bought: 'sign', guide: 'pad:sign' },
    { text: '🧑‍🤝‍🧑 Ospita 24 escursionisti', stat: 'guests', n: 24, guide: '' },
    { text: '🎒 Compra lo zaino gigante', bought: 'bag2', guide: 'pad:bag2' },
    { text: '🪙 Raccogli 380 monete', stat: 'collected', n: 380, guide: 'pile' },
    { text: '☕ Compra il banco cioccolata veloce', bought: 'cocoa2', guide: 'pad:cocoa2' },
    { text: '☕ Servi 30 cioccolate', stat: 'cocoa', n: 30, guide: 'cocoa' },
    { text: '🧔 Assumi il boscaiolo della seconda stanza', bought: 'helper2', guide: 'pad:helper2' },
    { text: '🤵 Assumi il cameriere della prima stanza', bought: 'waiter', guide: 'pad:waiter' },
    { text: '🧑‍🤝‍🧑 Ospita 36 escursionisti', stat: 'guests', n: 36, guide: '' },
    { text: '🤵 Assumi il cameriere della seconda stanza', bought: 'waiter2', guide: 'pad:waiter2' },
    { text: '🧔 Assumi il boscaiolo della terza stanza', bought: 'helper3', guide: 'pad:helper3' },
    { text: '⛄ Costruisci il pupazzo di neve', bought: 'mascot', guide: 'pad:mascot' },
    { text: '🤵 Assumi il cameriere della terza stanza', bought: 'waiter3', guide: 'pad:waiter3' },
    { text: '⭐ Raggiungi 5 stelle di reputazione', stat: 'stars', n: 5, guide: '', decimals: 1 }
  ];
  objectives.forEach((o, i) => { o.reward = 10 + 5 * Math.floor(i / 13); }); // 10, 15, 20, 25 monete

  Rifugio.levels.inverno = {
    id: 'inverno',
    name: 'Inverno',
    emoji: '❄️',
    saveKey: 'rifugio-v2',
    next: 'estate',
    theme: {
      sky: 0xbfe0ff, fog: [48, 110], ground: 0xf6f9ff, path: 0x8c8b87, hill: 0x7f9bc2, peak: 0xf6f9ff,
      pathTex: { base: '#8c8b87', cols: ['#a9a8a3', '#6d6c68', '#bcbbb5', '#5b5a56'], n: 1100, min: 0.8, max: 2.8 }, // ghiaia
      edge: 'mountains', room: 'cabin', outfit: 'winter', decor: ['rocks', 'bushes'], dust: 0xffffff,
      tree: 'pine', fall: 'snow', deco: 'snowman', cup: 0xd0502e, cupLiquid: 0x5a3220,
      hemi: [0xe4f1ff, 0x8597ad, 0.85], sun: [0xfff1d6, 0.85]
    },
    text: {
      intro: 'Una baita sotto la neve da far crescere. Tieni accesi i camini, accogli gli escursionisti e trasformala nel rifugio più famoso della valle.',
      help: [
        'Trascina il dito sullo schermo per muoverti (o WASD e frecce).',
        'Fermati vicino a un abete per tagliare la legna.',
        'Porta la legna ai camini: gli ospiti pagano solo se stanno al caldo.',
        'Fermati sulle piazzole bianche per spendere le monete e sbloccare nuove cose.'
      ],
      cold: 'Ho freddo! 🥶', want: 'Cioccolata? ☕', coldLeave: 'Un ospite se n\'è andato: aveva freddo!', thanks: 'Grazie! 😋',
      winTitle: 'Inverno completato! 🎉',
      winText: S => `Hai ospitato ${S.guests} escursionisti e servito ${S.cocoa} cioccolate calde.`,
      winNext: 'Il prossimo livello è pronto: l\'estate al lago! ☀️'
    },
    tuning: {
      trees: 14,             // abeti vicini alla baita (il resto del bosco intorno è abbattibile anch'esso)
      forest_trees: 70,      // abeti del bosco esterno
      chop_range: 1.6,
      chop_interval: 0.45,
      axe_mul: 0.7,          // con l'ascia affilata
      saw_mul: 0.4,          // con la motosega (sostituisce l'ascia)
      logs_per_tree: 4,
      tree_regrow: 14,
      bag_logs: 15,          // zaino iniziale: legna
      bag_cups: 5,           // zaino iniziale: cioccolate
      bag_big_logs: 30,      // con lo Zaino grande
      bag_big_cups: 10,
      bag_huge_logs: 60,     // con lo Zaino gigante
      bag_huge_cups: 20,
      world_min: [-30, -20], // limiti in cui il giocatore si muove (x, z)
      world_max: [30, 26],
      speed_base: 4.6,
      speed_fast: 6.2,
      feed_range: 1.6,
      feed_interval: 0.14,
      fuel_max: 10,
      burn_busy: 3.2,
      burn_idle: 9,
      insul_mul: 1.4,        // con l'isolamento il fuoco dura 1,4 volte di più
      guest_spawn_min: 5,
      guest_spawn_max: 8,
      sign_mul: 0.65,        // con il cartello gli ospiti arrivano più spesso
      guest_stay: 16,
      guest_cold_limit: 8,
      cold_penalty: 2,
      pay: 10,
      tip: 6,
      cocoa_interval: 2.5,
      cocoa_max: 4,
      cocoa2_interval: 1.4,
      cocoa2_max: 6,
      cocoa_chance: 0.6,
      helper_load: 5,
      star_per_guest: 0.25,
      stars_max: 5
    },
    rooms: [{ x: 0 }, { x: 6 }, { x: -6 }],
    lake: null,
    unlocks: [
      { id: 'room1',   title: 'Stanza 2',          cost: 40,  pos: [6, -6.5],     requires: { objectives: 4 },     effect: 'room', room: 1 },
      { id: 'bag',     title: 'Zaino grande',      cost: 50,  pos: [-3.6, 1.4],   requires: { objectives: 4 },     effect: 'bag' },
      { id: 'boots',   title: 'Scarponi veloci',   cost: 45,  pos: [6.5, -0.6],   requires: { objectives: 4 },     effect: 'boots' },
      { id: 'cocoa',   title: 'Cioccolata calda',  cost: 60,  pos: [11, -4.4],    requires: { bought: 'room1' },   effect: 'cocoa' },
      { id: 'helper',  title: 'Boscaiolo stanza 1', cost: 150, pos: [-11, -1],    requires: { bought: 'cocoa' },   effect: 'helper', room: 0 },
      { id: 'room2',   title: 'Stanza 3',          cost: 120, pos: [-6, -6.5],    requires: { bought: 'helper' },  effect: 'room', room: 2 },
      { id: 'axe',     title: 'Ascia affilata',    cost: 70,  pos: [-7.2, 1.6],   requires: { objectives: 12 },    effect: 'axe' },
      { id: 'saw',     title: 'Motosega',          cost: 220, pos: [-3.2, 4.6],   requires: { objectives: 22 },    effect: 'saw' },
      { id: 'insul',   title: 'Durata camini più lunga',    cost: 90,  pos: [-11.5, -4.8], requires: { objectives: 14 },    effect: 'insul' },
      { id: 'lamps',   title: 'Lanterne',          cost: 60,  pos: [15, 3.6],     requires: { objectives: 14 },    effect: 'lamps' },
      { id: 'sign',    title: 'Cartello',          cost: 110, pos: [9.5, 3.6],    requires: { objectives: 20 },    effect: 'sign' },
      { id: 'bag2',    title: 'Zaino gigante',     cost: 90,  pos: [-0.5, 3.4],   requires: { objectives: 22 },    effect: 'bag2' },
      { id: 'cocoa2',  title: 'Cioccolata veloce', cost: 100, pos: [14.6, -4.4],  requires: { objectives: 24 },    effect: 'cocoa2' },
      { id: 'helper2', title: 'Boscaiolo stanza 2', cost: 200, pos: [-11, 2.8],    requires: { objectives: 26 },    effect: 'helper', room: 1, needRoom: 1 },
      { id: 'waiter',  title: 'Cameriere stanza 1', cost: 90,  pos: [-2.2, -0.4], requires: { objectives: 27 },    effect: 'waiter', room: 0, needRoom: 0 },
      { id: 'waiter2', title: 'Cameriere stanza 2', cost: 110, pos: [9.6, -1.8],  requires: { objectives: 31 },    effect: 'waiter', room: 1, needRoom: 1 },
      { id: 'helper3', title: 'Boscaiolo stanza 3', cost: 230, pos: [-13.5, 2.4], requires: { objectives: 31 },    effect: 'helper', room: 2, needRoom: 2 },
      { id: 'mascot',  title: 'Pupazzo di neve',   cost: 100, pos: [-14.5, -2.5], requires: { objectives: 28 },    effect: 'mascot' },
      { id: 'waiter3', title: 'Cameriere stanza 3', cost: 130, pos: [-9.2, -2.2], requires: { objectives: 34 },    effect: 'waiter', room: 2, needRoom: 2 }
    ],
    objectives
  };
})();
