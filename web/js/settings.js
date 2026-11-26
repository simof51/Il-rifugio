// Impostazioni del gioco salvate sul dispositivo (qualità grafica, meteo, giorno/notte, vibrazione, ambiente, animale, aspetto dell'omino,
// gemme, consigli già visti, consenso alla privacy) e il salvataggio portatile (codice da copiare per cambiare telefono).
(function (R) {
  'use strict';
  const KEY = 'rifugio-settings';
  const defaults = () => ({
    quality: 'high', daynight: true, weather: true, haptics: true, ambient: true, ambVol: 0.5, pet: 'none',
    look: { hat: 'default', color: 0, acc: 'none' }, owned: ['hat:default', 'acc:none', 'color:0', 'color:1', 'pet:none'], gems: 0,
    tutorial: false, tips: {}, consent: null, purchases: {}, shopTest: false,
    lang: 'auto', daily: null, stats: {}, medals: {}
  });
  let data = defaults();
  // Se le impostazioni sono rovinate si riparte dalla copia di sicurezza (chiave + '-bak').
  const readKey = k => { try { const s = JSON.parse(localStorage.getItem(k) || 'null'); return s && typeof s === 'object' ? s : null; } catch (e) { return null; } };
  try {
    const s = readKey(KEY) || readKey(KEY + '-bak');
    if (s) { data = Object.assign(data, s); data.look = Object.assign(defaults().look, s.look || {}); data.tips = s.tips || {}; data.purchases = s.purchases || {}; data.stats = s.stats || {}; data.medals = s.medals || {}; if (!Array.isArray(data.owned)) data.owned = defaults().owned; }
  } catch (e) { /* ignorato */ }
  // Il compagno ora si compra con le gemme: chi aveva già un cane o un gatto lo tiene (ed è suo).
  if (data.owned.indexOf('pet:none') < 0) data.owned.push('pet:none');
  if ((data.pet === 'dog' || data.pet === 'cat') && data.owned.indexOf('pet:' + data.pet) < 0) data.owned.push('pet:' + data.pet);

  function save() { try { const j = JSON.stringify(data); localStorage.setItem(KEY, j); localStorage.setItem(KEY + '-bak', j); } catch (e) { /* ignorato */ } }
  // Livelli di qualità grafica: risoluzione massima, ombre, e quanta roba decorativa mostrare (alberi di bordo, fiori, neve, animali).
  const QUALITY = {
    high: { label: 'Alta', ratio: 2, aa: true, shadows: 'pcf', map: 1024, density: 1 },
    med: { label: 'Media', ratio: 1.5, aa: true, shadows: 'pcf', map: 512, density: 0.6 },
    low: { label: 'Bassa', ratio: 1, aa: false, shadows: 'off', map: 0, density: 0.35 }
  };

  // Catalogo dell'aspetto (si compra con le gemme: 4 per ogni stagione completata, più premi, missioni, mystery box e video).
  const CATALOG = {
    hat: [
      { id: 'default', name: 'Di stagione', cost: 0 }, { id: 'catears', name: 'Orecchie di gatto', cost: 30 }, { id: 'chef', name: 'Cappello da chef', cost: 25 },
      { id: 'cowboy', name: 'Cowboy', cost: 50 }, { id: 'tophat', name: 'Cilindro', cost: 40 }, { id: 'crown', name: 'Corona', cost: 80 },
      { id: 'halo', name: 'Aureola', cost: 0, premium: true }
    ],
    color: [
      { id: 0, hex: 0xf0503a, name: 'Rosso', cost: 0 }, { id: 1, hex: 0x3d8bff, name: 'Blu', cost: 0 }, { id: 2, hex: 0x4cd964, name: 'Verde', cost: 15 }, { id: 3, hex: 0xffd23a, name: 'Giallo', cost: 15 },
      { id: 4, hex: 0xa066ff, name: 'Viola', cost: 15 }, { id: 5, hex: 0xff7ac6, name: 'Rosa', cost: 15 }, { id: 6, hex: 0xff9a2a, name: 'Arancio', cost: 15 }, { id: 7, hex: 0x2ec4b6, name: 'Turchese', cost: 15 },
      { id: 8, hex: 0x2f3a4d, name: 'Notte', cost: 20 }, { id: 9, hex: 0xffffff, name: 'Bianco', cost: 20 },
      { id: 10, hex: 0xffb800, name: 'Oro', cost: 0, premium: true }, { id: 11, hex: 0x00e0c6, name: 'Smeraldo', cost: 0, premium: true },
      { id: 12, hex: 0xff3d81, name: 'Fucsia', cost: 0, premium: true }, { id: 13, hex: 0x7a5cff, name: 'Ametista', cost: 0, premium: true }
    ],
    acc: [{ id: 'none', name: 'Niente', cost: 0 }, { id: 'sunglasses', name: 'Occhiali da sole', cost: 20 }, { id: 'cape', name: 'Mantello', cost: 60 },
      { id: 'wings', name: 'Ali', cost: 0, premium: true }],
    pet: [{ id: 'none', name: 'Nessuno', cost: 0 }, { id: 'dog', name: '🐶 Cane', cost: 25 }, { id: 'cat', name: '🐱 Gatto', cost: 25 }]
  };

  R.settings = {
    data, save, QUALITY, CATALOG,
    get: k => data[k],
    set(k, v) { data[k] = v; save(); },
    quality: () => QUALITY[data.quality] || QUALITY.high,
    has: id => data.owned.indexOf(id) >= 0,
    addGems(n) { data.gems += n; save(); },
    // Compra (con le gemme) un oggetto dell'aspetto: id come "hat:crown". Restituisce true se riuscito.
    buy(id, cost) { if (data.owned.indexOf(id) >= 0) return true; if (data.gems < cost) return false; data.gems -= cost; data.owned.push(id); save(); return true; },
    tip(id) { if (data.tips[id]) return false; data.tips[id] = 1; save(); return true; } // true la prima volta
  };
})(window.Rifugio);
