// Personalità di ogni tappa (città + stagione): disposizione, strutture, colori delle baite, vestiario e ospite speciale (host).
// Si carica dopo cities.js e aggiunge a ogni livello l'oggetto "place". Il gioco (game.js) lo usa per costruire il posto.
(function (R) {
  'use strict';
  // Disposizione per città: dove sta il banco delle bevande, da che lato cresce la reception, in che ordine si aprono le stanze
  // e quali riquadri (upgrade) si spostano per non finire addosso al banco.
  const LAYOUT = {
    valle: { stand: 3, recep: 'left', rooms: [0, 6, -6], pads: {} },
    mulini: { stand: -4.5, recep: 'right', rooms: [0, 6, -6], pads: { waiter: [1.2, -0.4], bag: [3.2, 5.2], bag2: [6.4, 5.4], saw: [9.8, 5.8], sign: [13.4, 5.2] } },
    porto: { stand: 8, recep: 'left', rooms: [0, -6, 6], pads: { room1: [-6, -6.5], room2: [6, -6.5], boots: [2.2, -0.6], sign: [15.6, 6.2] } }
  };
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
  R.order.forEach(id => {
    const lv = R.levels[id], city = lv.cityId || 'valle', season = lv.season, L = LAYOUT[city] || LAYOUT.valle, C = CITY[city] || CITY.valle, S = SEASON[season] || SEASON.inverno;
    lv.place = {
      layout: L, style: C.style, floor: C.floor, rug: C.rug, fire: C.fire, umb: C.umb, walls: C.walls, trim: C.trim, awning: C.awning, hats: C.hats, recepCoat: C.recepCoat,
      coats: C.coats.concat(S.coats), structs: (CITYSTR[city] || []).concat(S.structs),
      host: HOST[city + '-' + season] || HOST['valle-' + season]
    };
    lv.rooms = L.rooms.map(x => ({ x })); // ordine di apertura delle stanze (nuova lista: non tocca le altre città)
    lv.unlocks.forEach(u => { if (L.pads[u.id]) u.pos = L.pads[u.id].slice(); });
    const cocoa = lv.unlocks.find(u => u.id === 'cocoa'), cocoa2 = lv.unlocks.find(u => u.id === 'cocoa2');
    if (cocoa) cocoa.pos = [L.stand, 5];
    if (cocoa2) cocoa2.pos = [L.stand + 3.6, 5];
  });
})(window.Rifugio);
