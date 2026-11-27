// Stagione "Autunno": bosco dorato con foglie che cadono, zucche, funghi, un laghetto e baite di legno col camino.
// Numeri, testi e aspetto di questa stagione stanno qui; obiettivi e sblocchi sono generati da common.js.
(function (R) {
  const v = {
    season: 'autunno',
    wood: 'legna', tree: 'albero', treeArt: 'un albero', trees: 'alberi', fire: 'camino', fires: 'camini', room: 'stanza', roomTitle: 'Stanza', roomShort: 'stanza',
    guest: 'escursionista', guests: 'escursionisti', guestEmoji: '🍂', firstGuest: 'il primo escursionista',
    drink: 'sidro', drinkOne: 'sidro', drinks: 'sidri caldi', foodEmoji: '🍎', stand: 'il banco del sidro caldo', stand2: 'il banco sidro veloce', standTitle: 'Sidro caldo', stand2Title: 'Sidro veloce', thanks: 'Che buono! 😋',
    helper: 'un boscaiolo', helperTitle: 'Boscaiolo stanza', bootsName: 'gli stivali veloci', bootsTitle: 'Stivali veloci',
    insulText: 'Durata camini più lunga', insulTitle: 'Durata camini più lunga', signText: 'Pianta il cartello: arrivano più ospiti', signTitle: 'Cartello',
    mascotEmoji: '🎃', mascotText: 'Costruisci lo spaventapasseri', mascotName: 'Spaventapasseri'
  };
  R.levels.autunno = {
    id: 'autunno', season: 'autunno', name: 'Autunno', emoji: '🍂', saveKey: 'rifugio-autunno-v1', next: null, voc: v, rewardBase: 14,
    theme: {
      sky: 0xf3dfc2, fog: [46, 108], ground: 0x9c8d3c, path: 0x7d5d3c, hill: 0xa56a35, peak: 0xe9a23b,
      pathTex: { base: '#7d5d3c', cols: ['#8f6d48', '#654a2f', '#9b7a52', '#573f27'], n: 900, min: 0.8, max: 2.6 },
      edge: 'forest', room: 'cabin', outfit: 'winter',
      tree: 'leafy', leafCols: [0xe9751f, 0xd4402c, 0xf3b83a], accentCols: [0x8b5a2b, 0xffd23a, 0xc0392b], fall: 'leaves', fallColor: 0xe9751f,
      deco: 'scarecrow', decor: ['pumpkins', 'mushrooms', 'rocks', 'bushes'], dust: 0xbfa56a,
      cup: 0xc98a4b, cupLiquid: 0x8a4b22, water: 0x6bb5d6, hemi: [0xfff1da, 0x8a6b3f, 0.75], sun: [0xffe2b0, 0.78]
    },
    text: Object.assign({
      intro: 'Il bosco si veste d\'oro! Tieni accesi i camini, accogli gli escursionisti tra foglie e zucche e trasforma la baita nel rifugio più accogliente dell\'autunno.',
      help: [
        'Trascina il dito sullo schermo per muoverti (o WASD e frecce).',
        'Fermati vicino a un albero per tagliare la legna.',
        'Porta la legna ai camini: gli ospiti pagano solo se stanno al caldo.',
        'Fermati sui riquadri a terra per spendere le monete e comprare miglioramenti.'
      ],
      cold: 'Ho freddo! 🥶', coldLeave: 'Un ospite se n\'è andato: aveva freddo!',
      winTitle: 'Autunno completato! 🍂', winText: S => `Hai ospitato ${S.guests} escursionisti e servito ${S.cocoa} sidri caldi.`, winNext: ''
    }, R.foodText(v)),
    tuning: R.baseTuning({ forest_trees: 95, burn_busy: 3.0, burn_idle: 8.2, guest_spawn_min: 4.6, guest_spawn_max: 7.2, pay: 12, tip: 7 }),
    rooms: [{ x: 0 }, { x: 6 }, { x: -6 }],
    lake: { x: -22.5, z: 4, r: 6 },
    unlocks: R.makeUnlocks(v, 1.1, true),
    objectives: R.makeObjectives(v, 14)
  };
})(window.Rifugio);
