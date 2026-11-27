// Stagione "Inverno": baita sotto la neve con camini, letti, cioccolata calda, abeti e montagne innevate.
// Numeri, testi e aspetto stanno qui; obiettivi e sblocchi sono generati da common.js (a gradini, non legati agli obiettivi).
(function (R) {
  const v = {
    season: 'inverno',
    wood: 'legna', tree: 'abete', treeArt: 'un abete', trees: 'abeti', fire: 'camino', fires: 'camini', room: 'stanza', roomTitle: 'Stanza', roomShort: 'stanza',
    guest: 'escursionista', guests: 'escursionisti', guestEmoji: '🧑', firstGuest: 'il primo escursionista',
    drink: 'cioccolata', drinkOne: 'cioccolata', drinks: 'cioccolate', foodEmoji: '☕', stand: 'il banco della cioccolata calda', stand2: 'il banco cioccolata veloce', standTitle: 'Cioccolata calda', stand2Title: 'Cioccolata veloce',
    helper: 'un boscaiolo', helperTitle: 'Boscaiolo stanza', bootsName: 'gli scarponi veloci', bootsTitle: 'Scarponi veloci',
    insulText: 'Durata camini più lunga', insulTitle: 'Durata camini più lunga', signText: 'Pianta il cartello: arrivano più ospiti', signTitle: 'Cartello',
    mascotEmoji: '⛄', mascotText: 'Costruisci il pupazzo di neve', mascotName: 'Pupazzo di neve', thanks: 'Grazie! 😋'
  };
  R.levels.inverno = {
    id: 'inverno', season: 'inverno', name: 'Inverno', emoji: '❄️', saveKey: 'rifugio-v2', next: null, voc: v, rewardBase: 10,
    theme: {
      sky: 0xbfe0ff, fog: [48, 110], ground: 0xf6f9ff, path: 0x8c8b87, hill: 0x7f9bc2, peak: 0xf6f9ff,
      pathTex: { base: '#8c8b87', cols: ['#a9a8a3', '#6d6c68', '#bcbbb5', '#5b5a56'], n: 1100, min: 0.8, max: 2.8 }, // ghiaia
      edge: 'mountains', room: 'cabin', outfit: 'winter', decor: ['rocks', 'bushes'], dust: 0xffffff,
      tree: 'pine', fall: 'snow', deco: 'snowman', cup: 0xd0502e, cupLiquid: 0x5a3220,
      hemi: [0xe4f1ff, 0x8597ad, 0.85], sun: [0xfff1d6, 0.85]
    },
    text: Object.assign({
      intro: 'Una baita sotto la neve da far crescere. Tieni accesi i camini, accogli gli escursionisti e trasformala nel rifugio più famoso della valle.',
      help: [
        'Trascina il dito sullo schermo per muoverti (o WASD e frecce).',
        'Fermati vicino a un abete per tagliare la legna.',
        'Porta la legna ai camini: gli ospiti pagano solo se stanno al caldo.',
        'Fermati sui riquadri a terra per spendere le monete e comprare miglioramenti.'
      ],
      cold: 'Ho freddo! 🥶', coldLeave: 'Un ospite se n\'è andato: aveva freddo!',
      winTitle: 'Inverno completato! 🎉', winText: S => `Hai ospitato ${S.guests} escursionisti e servito ${S.cocoa} cioccolate calde.`, winNext: ''
    }, R.foodText(v)),
    tuning: R.baseTuning({
      forest_trees: 70, tree_regrow: 14, burn_busy: 3.2, burn_idle: 9, guest_spawn_min: 5, guest_spawn_max: 8, guest_stay: 16, guest_cold_limit: 8, pay: 10, tip: 6,
      speed_base: 4.6, speed_fast: 6.2, cocoa_interval: 2.5, cocoa_chance: 0.6
    }),
    rooms: [{ x: 0 }, { x: 6 }, { x: -6 }],
    lake: null,
    unlocks: R.makeUnlocks(v, 1, false),
    objectives: R.makeObjectives(v, 10)
  };
})(window.Rifugio);
