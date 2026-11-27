// Stagione "Estate": un lido sul lago. Ogni area pranzo ha tavolini rotondi con sedie, un ombrellone e un barbecue (niente letti né camino);
// limonata, paperelle, prati fioriti e una foresta fitta intorno. Ospiti un po' più veloci e impazienti.
// Obiettivi e sblocchi sono generati da common.js (a gradini, non legati agli obiettivi).
(function (R) {
  const v = {
    season: 'estate',
    wood: 'legna', tree: 'albero', treeArt: 'un albero', trees: 'alberi', fire: 'barbecue', fires: 'barbecue', room: 'stanza', roomTitle: 'Stanza', roomShort: 'stanza',
    guest: 'bagnante', guests: 'bagnanti', guestEmoji: '🏖️', firstGuest: 'il primo bagnante',
    drink: 'limonata', drinkOne: 'limonata', drinks: 'limonate', foodEmoji: '🍋', stand: 'il chiosco della limonata', stand2: 'il chiosco limonata veloce', standTitle: 'Chiosco limonata', stand2Title: 'Limonata veloce',
    helper: 'un aiutante', helperTitle: 'Aiutante area', bootsName: 'le scarpe da corsa', bootsTitle: 'Scarpe da corsa',
    insulText: 'Durata barbecue più lunga', insulTitle: 'Durata barbecue più lunga', signText: 'Pianta il cartello del lago: arrivano più bagnanti', signTitle: 'Cartello del lago',
    mascotEmoji: '🦆', mascotText: 'Porta al lago la paperella gigante', mascotName: 'Paperella gigante', thanks: 'Che buona! 😋'
  };
  R.levels.estate = {
    id: 'estate', season: 'estate', name: 'Estate', emoji: '☀️', saveKey: 'rifugio-estate-v1', next: null, voc: v, rewardBase: 15,
    theme: {
      sky: 0xc4ecff, fog: [50, 120], ground: 0x5fc24a, path: 0xe9cf8e, hill: 0x3fae62, peak: 0x8fdc7a,
      pathTex: { base: '#e6cd8e', cols: ['#f1dca4', '#d4b877', '#c9ab68', '#f6e6bb'], n: 700, min: 0.8, max: 2.2 }, // sentiero di sabbia
      edge: 'forest', room: 'lido', seat: 'table', table: 'round', outfit: 'summer', decor: ['bushes', 'grass', 'rocks'], dust: 0xe6cd8e,
      tree: 'leafy', fall: 'petals', deco: 'duck', flowers: true, butterflies: true, cup: 0xffe27a, cupLiquid: 0xffd23a, water: 0x4fc3f7,
      hemi: [0xffffff, 0x6fa05a, 0.6], sun: [0xfff4cf, 0.55]
    },
    text: Object.assign({
      intro: 'Un lido sul lago in piena estate! Tieni accesi i barbecue, accogli i bagnanti ai tavolini all\'ombra e fai del tuo lido il più bello della vallata.',
      help: [
        'Trascina il dito sullo schermo per muoverti (o WASD e frecce).',
        'Fermati vicino a un albero per tagliare la legna.',
        'Porta la legna ai barbecue: i bagnanti pagano solo se c\'è da mangiare.',
        'Fermati sui riquadri a terra per spendere le monete e comprare miglioramenti.'
      ],
      cold: 'Che fame! 🍖', coldLeave: 'Un bagnante se n\'è andato: aveva fame!',
      winTitle: 'Estate completata! 🎉', winText: S => `Hai accolto ${S.guests} bagnanti e servito ${S.cocoa} limonate fresche.`, winNext: ''
    }, R.foodText(v)),
    tuning: R.baseTuning({
      forest_trees: 120, tree_regrow: 12, burn_busy: 3.0, burn_idle: 8, guest_spawn_min: 4.5, guest_spawn_max: 7, guest_stay: 15, guest_cold_limit: 7, pay: 12, tip: 7,
      speed_base: 4.8, speed_fast: 6.4, cocoa_interval: 2.3, cocoa_chance: 0.65
    }),
    rooms: [{ x: 0 }, { x: 6 }, { x: -6 }],
    lake: { x: -22.5, z: 4, r: 7 },
    unlocks: R.makeUnlocks(v, 1.05, true),
    objectives: R.makeObjectives(v, 15)
  };
})(window.Rifugio);
