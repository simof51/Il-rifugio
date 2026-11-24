// Stagione "Primavera": un giardino in fiore con ciliegi rosa, un laghetto, farfalle e aree picnic (ombrelloni, lettini e barbecue).
// Numeri, testi e aspetto di questa stagione stanno qui; obiettivi e sblocchi sono generati da common.js.
(function (R) {
  const v = {
    wood: 'legna', treeArt: 'un albero', trees: 'alberi', fire: 'barbecue', fires: 'barbecue', room: 'area picnic', roomTitle: 'Area picnic', roomShort: 'area',
    guests: 'ospiti', guestEmoji: '🧺', firstGuest: 'il primo ospite', drinks: 'spremute', stand: 'il chiosco delle spremute', stand2: 'il chiosco spremute veloce', standTitle: 'Chiosco spremute', stand2Title: 'Spremute veloci',
    helper: 'un giardiniere', helperTitle: 'Giardiniere area', bootsName: 'le scarpe da corsa', bootsTitle: 'Scarpe da corsa',
    insulText: 'Barbecue potenti: il fuoco dura di più', insulTitle: 'Barbecue potenti', signText: 'Pianta il cartello del giardino: arrivano più ospiti', signTitle: 'Cartello giardino',
    mascotEmoji: '🐰', mascotText: 'Porta in giardino il coniglio gigante', mascotName: 'Coniglio gigante'
  };
  R.levels.primavera = {
    id: 'primavera', season: 'primavera', name: 'Primavera', emoji: '🌸', saveKey: 'rifugio-primavera-v1', next: null,
    theme: {
      sky: 0xd9f2ff, fog: [50, 120], ground: 0x7ddb6a, path: 0xe8d6a6, hill: 0x58c785, peak: 0xffc3dc,
      pathTex: { base: '#e3d1a0', cols: ['#efe0b6', '#d2bf8c', '#f5e9c8', '#c8b47e'], n: 700, min: 0.8, max: 2.2 },
      edge: 'forest', room: 'lido', outfit: 'spring', fence: 0x58b84a, umbrellaCols: [0xffa6c9, 0xa8e0ff, 0xfff0a0],
      tree: 'leafy', leafCols: [0xffb3d1, 0xff94bf, 0xffc6de], accentCols: [0xffffff, 0xffe3ef, 0xff6fae], fall: 'petals', fallColor: 0xffb3d1,
      deco: 'bunny', flowers: true, flowerCount: 300, butterflies: true, decor: ['bushes', 'grass', 'rocks'], dust: 0xe8d6a6,
      cup: 0xffa94d, cupLiquid: 0xff9a2a, water: 0x5fcff5, hemi: [0xffffff, 0x7fbf7a, 0.65], sun: [0xfff6dc, 0.6]
    },
    text: {
      intro: 'Il giardino è in fiore! Tieni accesi i barbecue, accogli gli ospiti per un picnic fra i ciliegi e fai del tuo giardino il più bello della valle.',
      help: [
        'Trascina il dito sullo schermo per muoverti (o WASD e frecce).',
        'Fermati vicino a un albero per tagliare la legna.',
        'Porta la legna ai barbecue: gli ospiti pagano solo se c\'è da mangiare.',
        'Fermati sulle piazzole bianche per spendere le monete e sbloccare nuove cose.'
      ],
      cold: 'Che fame! 🍖', want: 'Spremuta? 🍊', coldLeave: 'Un ospite se n\'è andato: aveva fame!', thanks: 'Che fresca! 😋',
      winTitle: 'Primavera completata! 🌸', winText: S => `Hai accolto ${S.guests} ospiti e servito ${S.cocoa} spremute.`, winNext: ''
    },
    tuning: R.baseTuning({ forest_trees: 100, burn_busy: 3.0, guest_spawn_min: 4.6, guest_spawn_max: 7.2, pay: 11, tip: 6.5 }),
    rooms: [{ x: 0 }, { x: 6 }, { x: -6 }],
    lake: { x: -22.5, z: 4, r: 6 },
    unlocks: R.makeUnlocks(v, 1.05, true),
    objectives: R.makeObjectives(v, 12)
  };
})(window.Rifugio);
