// Città e ordine delle tappe. Ogni città ha le quattro stagioni (inverno, primavera, estate, autunno), ognuna con i suoi 41 obiettivi.
// La prima città usa le stagioni così come sono (e i salvataggi di sempre); le altre ne derivano una copia con colori diversi,
// obiettivi più alti, costi più cari, ospiti più frequenti, un monumento (mulino o faro) e cibi e bevande locali (cambiano i testi,
// i nomi dei banchi e il colore delle tazze). Si gioca in ordine e non si torna indietro.
(function (R) {
  const SEASONS = ['inverno', 'primavera', 'estate', 'autunno'];
  const CITIES = [
    { id: 'valle', name: 'Valle del Rifugio', emoji: '🏔️', blurb: 'La valle dove tutto comincia', nMul: 1, costMul: 1, rewardMul: 1, spawn: 1, tint: null, landmark: null },
    { id: 'mulini', name: 'Borgo dei Mulini', emoji: '🌷', blurb: 'Tulipani, campi e un grande mulino a vento', nMul: 1.2, costMul: 1.15, rewardMul: 1.2, spawn: 0.92, tint: { dh: 0.015, ds: 1.12, dl: 1 }, landmark: 'windmill' },
    { id: 'porto', name: 'Porto delle Luci', emoji: '⚓', blurb: 'Un porto con il faro che guida i viaggiatori', nMul: 1.4, costMul: 1.3, rewardMul: 1.45, spawn: 0.85, tint: { dh: -0.03, ds: 0.95, dl: 1.03 }, landmark: 'lighthouse' }
  ];

  // Cibi e bevande locali: [parole, colore tazza, colore contenuto]. Mancano = quelli della Valle.
  const F = (drinks, emoji, stand, standTitle, stand2, stand2Title, cup, liquid, drink, thanks) => ({
    v: { drink: drink || drinks, drinkOne: drink || drinks, drinks, foodEmoji: emoji, stand, standTitle, stand2, stand2Title, thanks: thanks || 'Che buono! 😋' }, cup, liquid
  });
  const FOODS = {
    mulini: {
      inverno: F('cioccolate con panna', '☕', 'il banco della cioccolata con panna', 'Cioccolata con panna', 'il banco cioccolata veloce', 'Cioccolata veloce', 0xf0e2d0, 0x6b4226, 'cioccolata con panna'),
      primavera: F('tè ai petali', '🍵', 'il chiosco del tè ai petali', 'Chiosco tè ai petali', 'il chiosco tè veloce', 'Tè veloce', 0xffb3d1, 0xff8fb3, 'tè ai petali', 'Che profumo! 😋'),
      estate: F('frappè', '🥤', 'il chiosco dei frappè', 'Chiosco frappè', 'il chiosco frappè veloce', 'Frappè veloce', 0xff8fb3, 0xffd1e0, 'frappè', 'Che fresco! 😋'),
      autunno: F('tazze di latte caldo', '🥛', 'il banco del latte caldo', 'Latte caldo', 'il banco latte veloce', 'Latte veloce', 0xffffff, 0xf5efe0, 'latte caldo')
    },
    porto: {
      inverno: F('zuppe di pesce', '🍲', 'il banco delle zuppe di pesce', 'Zuppa di pesce', 'il banco zuppa veloce', 'Zuppa veloce', 0xb86b3a, 0xe8a050, 'zuppa di pesce', 'Che saporita! 😋'),
      primavera: F('granite', '🍧', 'il chiosco delle granite', 'Chiosco granite', 'il chiosco granite veloce', 'Granite veloci', 0x9be7ff, 0x6bd0ff, 'granita', 'Che fresca! 😋'),
      estate: F('noci di cocco', '🥥', 'il chiosco del cocco fresco', 'Cocco fresco', 'il chiosco cocco veloce', 'Cocco veloce', 0xf4ead2, 0xffffff, 'cocco fresco', 'Che dolce! 😋'),
      autunno: F('brodi caldi', '🍜', 'il banco del brodo caldo', 'Brodo caldo', 'il banco brodo veloce', 'Brodo veloce', 0xd9a45b, 0xc47a2a, 'brodo caldo')
    }
  };

  // Sposta tinta, saturazione e luminosità di un colore (0xRRGGBB).
  function tint(hex, t) {
    const c = new THREE.Color(hex), h = {}; c.getHSL(h);
    c.setHSL((h.h + t.dh + 1) % 1, Math.min(1, h.s * t.ds), Math.min(0.97, h.l * t.dl));
    return c.getHex();
  }
  const TINTED = ['sky', 'ground', 'hill', 'peak', 'water'];
  const baseCost = (base, id) => (base.unlocks.find(u => u.id === id) || { cost: 50 }).cost;

  R.cities = CITIES; R.order = [];
  CITIES.forEach((c, ci) => {
    c.levels = SEASONS.filter(s => R.levels[s]).map(s => {
      const base = R.levels[s];
      let lv = base;
      if (ci === 0) { lv.season = s; }
      else {
        const food = FOODS[c.id] && FOODS[c.id][s], voc = Object.assign({}, base.voc, food ? food.v : {});
        lv = Object.assign({}, base, { id: `${c.id}-${s}`, season: s, saveKey: `rifugio-${c.id}-${s}-v1`, voc });
        lv.theme = Object.assign({}, base.theme);
        TINTED.forEach(k => { if (lv.theme[k] != null) lv.theme[k] = tint(lv.theme[k], c.tint); });
        if (food) { lv.theme.cup = food.cup; lv.theme.cupLiquid = food.liquid; }
        lv.tuning = Object.assign({}, base.tuning, {
          guest_spawn_min: +(base.tuning.guest_spawn_min * c.spawn).toFixed(2), guest_spawn_max: +(base.tuning.guest_spawn_max * c.spawn).toFixed(2),
          pay: Math.round(base.tuning.pay * c.costMul), tip: Math.round(base.tuning.tip * c.costMul)
        });
        // obiettivi e sblocchi si rigenerano con le parole locali; numeri e costi scalano con la città
        lv.objectives = R.makeObjectives(voc, Math.round(base.rewardBase * c.rewardMul)).map(o => (o.stat && o.stat !== 'stars') ? Object.assign(o, { n: Math.ceil(o.n * c.nMul) }) : o);
        lv.unlocks = R.makeUnlocks(voc, 1, !!base.lake).map(u => Object.assign(u, { cost: Math.round(baseCost(base, u.id) * c.costMul) }));
        lv.text = Object.assign({}, base.text, R.foodText(voc));
        if (food) lv.text.winText = S => `Hai accolto ${S.guests} ${voc.guests} e servito ${S.cocoa} ${voc.drinks}.`;
        R.levels[lv.id] = lv;
      }
      lv.cityId = c.id; lv.cityName = c.name; lv.cityEmoji = c.emoji; lv.landmark = c.landmark;
      R.order.push(lv.id);
      return lv.id;
    });
  });
  // Tappa successiva (anche in un'altra città) e frase di fine livello.
  R.order.forEach((id, i) => {
    const l = R.levels[id], n = R.levels[R.order[i + 1]];
    l.next = n ? n.id : null;
    l.text.winNext = n ? (n.cityId === l.cityId ? `Prossima tappa: ${n.emoji} ${n.name}` : `Nuova città: ${n.cityEmoji} ${n.cityName}, ${n.emoji} ${n.name}`) : 'Hai completato tutte le città! Presto arriveranno nuove avventure.';
  });
})(window.Rifugio);
