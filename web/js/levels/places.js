// Personalità di ogni tappa (città + stagione): disposizione, strutture, colori delle baite, vestiario e ospite speciale (host).
// Si carica dopo cities.js e aggiunge a ogni livello l'oggetto "place". Il gioco (game.js) lo usa per costruire il posto.
(function (R) {
  'use strict';
  // Aspetto per città: colore delle pareti, cornici, tende sulle finestre, cappotti degli ospiti, cappelli e divisa della receptionist.
  // "style" cambia la forma della baita (vedi game.js): alpine = tronchi e tetto spiovente, dutch = mattoni e facciata a gradoni, harbor = pareti bianche, fascia blu e bandiera.
  const CITY = {
    valle: { style: 'alpine', walls: 0x9a6a45, trim: 0xe6b27a, awning: 0xd94f3d, floor: null, rug: 0xc23b2e, fire: null, umb: null, coats: [], hats: [], recepCoat: 0xc23b5a,
      perk: 'Monti, cappella e il Maestro di sci' },
    mulini: { style: 'dutch', walls: 0xb8523a, trim: 0xfff1d0, awning: 0xff7ab0, floor: 0xd9a066, rug: 0x2d6cdf, fire: 0xa9482f, umb: [0xff7ab0, 0xffd23a, 0xff9a2a], coats: [0xff9ac1, 0xffd23a, 0x7bd88f, 0xf06a6a, 0x5ab0ff], hats: ['cowboy'], recepCoat: 0xe8742e,
      perk: 'Campi di tulipani, canale e mulino · ospiti +15%' },
    porto: { style: 'harbor', walls: 0xf2f4f7, trim: 0x2d6cdf, awning: 0x2d6cdf, floor: 0x9c7a55, rug: 0xd9433b, fire: 0x3a4250, umb: [0x2d6cdf, 0xffffff, 0xd9433b], coats: [0x1f4e8c, 0xf4f1e6, 0xd9433b, 0x2ec4b6, 0x2b3a55], hats: ['chef'], recepCoat: 0x1f4e8c,
      perk: 'Mare, molo e faro · ospiti +30%' }
  };
  // Per stagione: strutture tipiche e colori in più per i cappotti.
  const SEASON = {
    inverno: { structs: ['sled', 'logs'], coats: [0xe8f1ff, 0xc9d8ee] },
    primavera: { structs: ['flowerbed', 'well'], coats: [0xffc2de, 0xb6f0c0] },
    estate: { structs: ['stall', 'umbrellas'], coats: [0xffe27a, 0x7de3ff] },
    autunno: { structs: ['hay', 'pumpkins'], coats: [0xd98a3a, 0xa8512b] }
  };
  const CITYSTR = { valle: ['signpost', 'bench'], mulini: ['fountain', 'tulips'], porto: ['crates', 'boat'] };
  // Ospite speciale (host) di ogni posto: arriva ogni tanto, paga il quadruplo e porta una gemma.
  const HOST = {
    'valle-inverno': { name: 'Maestro di sci', e: '⛷️', coat: 0xd94f3d, hat: null, line: 'Che neve perfetta oggi!' },
    'valle-primavera': { name: 'Giardiniere Gino', e: '🌷', coat: 0x4cae5a, hat: 'cowboy', line: 'Che bei fiori sbocciano!' },
    'valle-estate': { name: 'Bagnino Marco', e: '🏊', coat: 0xff7a3d, hat: null, line: 'Tutti in acqua, che caldo!' },
    'valle-autunno': { name: 'Rita dei funghi', e: '🍄', coat: 0xa8512b, hat: 'cowboy', line: 'Questo bosco è pieno di funghi!' },
    'mulini-inverno': { name: 'Mugnaio Piet', e: '🌾', coat: 0xe8d9b0, hat: 'chef', line: 'La farina del mulino scalda il cuore.' },
    'mulini-primavera': { name: 'Re dei Tulipani', e: '👑', coat: 0xff5d8f, hat: 'crown', line: 'Il mio campo è il più colorato!' },
    'mulini-estate': { name: 'Gelataio Gianni', e: '🍦', coat: 0xffffff, hat: 'chef', line: 'Un gelato per tutti!' },
    'mulini-autunno': { name: 'Contadina Anna', e: '🧺', coat: 0xd98a3a, hat: 'cowboy', line: 'Il raccolto è stato ricco!' },
    'porto-inverno': { name: 'Capitan Barba', e: '⚓', coat: 0x1f4e8c, hat: 'tophat', line: 'Fuori c\'è tempesta, qui si sta al caldo!' },
    'porto-primavera': { name: 'Pescatore Nino', e: '🎣', coat: 0x2ec4b6, hat: 'cowboy', line: 'Oggi ho pescato tantissimo!' },
    'porto-estate': { name: 'Surfista Luna', e: '🏄', coat: 0xffd23a, hat: 'catears', line: 'Onde fantastiche oggi!' },
    'porto-autunno': { name: 'Guardiano del faro', e: '🔦', coat: 0x2b3a55, hat: 'tophat', line: 'Il mio faro guida tutti a casa.' }
  };

  R.cities.forEach(c => { c.perk = (CITY[c.id] || CITY.valle).perk; }); // anteprima mostrata nella mappa
  // Testi della stagione: cosa si raccoglie e dove si porta.
  function texts(season) {
    const r = R.RES[season], hungry = season !== 'inverno';
    return {
      intro: `Un rifugio che cresce in verticale. ${r.verb} ${r.the} nel campo in cima, tieni in funzione ${r.theFire}, rifornisci i bagni e dai da mangiare agli ospiti in mensa.`,
      help: [
        'Trascina il dito sullo schermo per muoverti (o WASD e frecce).',
        `${r.verb} ${r.the} nel campo in cima e porta tutto ${r.toFire}.`,
        'Prendi sapone e carta igienica nello sgabuzzino e rifornisci i bagni.',
        'Fermati sui riquadri a terra per spendere le monete e comprare miglioramenti.'
      ],
      cold: hungry ? 'Che fame! 🍖' : 'Ho freddo! 🥶',
      coldLeave: hungry ? 'Un ospite se n\'è andato: aveva fame!' : 'Un ospite se n\'è andato: aveva freddo!'
    };
  }
  R.order.forEach(id => {
    const lv = R.levels[id], city = lv.cityId || 'valle', season = lv.season, C = CITY[city] || CITY.valle, S = SEASON[season] || SEASON.inverno;
    const m = city === 'mulini' ? -1 : 1; // al Borgo dei Mulini la pianta è specchiata
    lv.place = {
      layout: { mirror: m }, style: C.style, floor: C.floor, rug: C.rug, fire: C.fire, umb: C.umb, walls: C.walls, trim: C.trim, awning: C.awning, hats: C.hats, recepCoat: C.recepCoat,
      coats: C.coats.concat(S.coats), structs: (CITYSTR[city] || []).concat(S.structs),
      host: HOST[city + '-' + season] || HOST['valle-' + season]
    };
    lv.text = Object.assign({}, lv.text, texts(season));
    lv.lake = season === 'inverno' ? null : { x: -22, z: -3, r: 5 };
    lv.unlocks = lv.unlocks.map(u => Object.assign({}, u, { pos: [u.pos[0] * m, u.pos[1]] }));
    const sn = lv.unlocks.find(u => u.id === 'snack'); if (sn) sn.title = { inverno: 'Torte calde', primavera: 'Pasticcini', estate: 'Gelati', autunno: 'Caldarroste' }[season];
  });
})(window.Rifugio);