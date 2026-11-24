// Città e ordine delle tappe. Ogni città ha le quattro stagioni (inverno, primavera, estate, autunno), ognuna con i suoi 41 obiettivi.
// La prima città usa le stagioni così come sono (e i salvataggi di sempre); le altre ne derivano una copia con colori diversi,
// obiettivi più alti, costi più cari, ospiti più frequenti e un monumento (mulino o faro). Si gioca in ordine e non si torna indietro.
(function (R) {
  const SEASONS = ['inverno', 'primavera', 'estate', 'autunno'];
  const CITIES = [
    { id: 'valle', name: 'Valle del Rifugio', emoji: '🏔️', blurb: 'La valle dove tutto comincia', nMul: 1, costMul: 1, rewardMul: 1, spawn: 1, tint: null, landmark: null },
    { id: 'mulini', name: 'Borgo dei Mulini', emoji: '🌷', blurb: 'Tulipani, campi e un grande mulino a vento', nMul: 1.2, costMul: 1.15, rewardMul: 1.2, spawn: 0.92, tint: { dh: 0.015, ds: 1.12, dl: 1 }, landmark: 'windmill' },
    { id: 'porto', name: 'Porto delle Luci', emoji: '⚓', blurb: 'Un porto con il faro che guida i viaggiatori', nMul: 1.4, costMul: 1.3, rewardMul: 1.45, spawn: 0.85, tint: { dh: -0.03, ds: 0.95, dl: 1.03 }, landmark: 'lighthouse' }
  ];

  // Sposta tinta, saturazione e luminosità di un colore (0xRRGGBB).
  function tint(hex, t) {
    const c = new THREE.Color(hex), h = {}; c.getHSL(h);
    c.setHSL((h.h + t.dh + 1) % 1, Math.min(1, h.s * t.ds), Math.min(0.97, h.l * t.dl));
    return c.getHex();
  }
  const TINTED = ['sky', 'ground', 'hill', 'peak', 'water'];

  R.cities = CITIES; R.order = [];
  CITIES.forEach((c, ci) => {
    c.levels = SEASONS.filter(s => R.levels[s]).map(s => {
      const base = R.levels[s];
      let lv = base;
      if (ci === 0) { lv.season = s; }
      else {
        lv = Object.assign({}, base, { id: `${c.id}-${s}`, season: s, saveKey: `rifugio-${c.id}-${s}-v1` });
        lv.theme = Object.assign({}, base.theme);
        TINTED.forEach(k => { if (lv.theme[k] != null) lv.theme[k] = tint(lv.theme[k], c.tint); });
        lv.tuning = Object.assign({}, base.tuning, {
          guest_spawn_min: +(base.tuning.guest_spawn_min * c.spawn).toFixed(2), guest_spawn_max: +(base.tuning.guest_spawn_max * c.spawn).toFixed(2),
          pay: Math.round(base.tuning.pay * c.costMul), tip: Math.round(base.tuning.tip * c.costMul)
        });
        lv.objectives = base.objectives.map(o => Object.assign({}, o, {
          n: o.stat && o.stat !== 'stars' ? Math.ceil(o.n * c.nMul) : o.n, reward: Math.round(o.reward * c.rewardMul)
        }));
        lv.unlocks = base.unlocks.map(u => Object.assign({}, u, { cost: Math.round(u.cost * c.costMul) }));
        lv.text = Object.assign({}, base.text);
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
