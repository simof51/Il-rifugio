// Impostazioni del gioco salvate sul dispositivo (qualità grafica, meteo, giorno/notte, vibrazione, ambiente, animale, aspetto dell'omino,
// gemme, consigli già visti, consenso alla privacy) e il salvataggio portatile (codice da copiare per cambiare telefono).
(function (R) {
  'use strict';
  const KEY = 'rifugio-settings';
  const defaults = () => ({
    quality: 'high', daynight: true, weather: true, haptics: true, ambient: true, ambVol: 0.5, pet: 'dog',
    look: { hat: 'default', color: 0, acc: 'none' }, owned: ['hat:default', 'acc:none', 'color:0', 'color:1'], gems: 0,
    tutorial: false, tips: {}, consent: null
  });
  let data = defaults();
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') { data = Object.assign(data, s); data.look = Object.assign(defaults().look, s.look || {}); data.tips = s.tips || {}; if (!Array.isArray(data.owned)) data.owned = defaults().owned; } } catch (e) { /* ignorato */ }

  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignorato */ } }
  // Livelli di qualità grafica: risoluzione massima, ombre, e quanta roba decorativa mostrare (alberi di bordo, fiori, neve, animali).
  const QUALITY = {
    high: { label: 'Alta', ratio: 2, shadows: 'pcf', map: 1024, density: 1 },
    med: { label: 'Media', ratio: 1.5, shadows: 'pcf', map: 512, density: 0.6 },
    low: { label: 'Bassa', ratio: 1, shadows: 'off', map: 0, density: 0.35 }
  };

  // Catalogo dell'aspetto (si compra con le gemme: +1 per ogni obiettivo, +10 per ogni stagione completata).
  const CATALOG = {
    hat: [
      { id: 'default', name: 'Di stagione', cost: 0 }, { id: 'catears', name: 'Orecchie di gatto', cost: 30 }, { id: 'chef', name: 'Cappello da chef', cost: 25 },
      { id: 'cowboy', name: 'Cowboy', cost: 50 }, { id: 'tophat', name: 'Cilindro', cost: 40 }, { id: 'crown', name: 'Corona', cost: 80 }
    ],
    color: [
      { id: 0, hex: 0xf0503a, name: 'Rosso', cost: 0 }, { id: 1, hex: 0x3d8bff, name: 'Blu', cost: 0 }, { id: 2, hex: 0x4cd964, name: 'Verde', cost: 15 }, { id: 3, hex: 0xffd23a, name: 'Giallo', cost: 15 },
      { id: 4, hex: 0xa066ff, name: 'Viola', cost: 15 }, { id: 5, hex: 0xff7ac6, name: 'Rosa', cost: 15 }, { id: 6, hex: 0xff9a2a, name: 'Arancio', cost: 15 }, { id: 7, hex: 0x2ec4b6, name: 'Turchese', cost: 15 },
      { id: 8, hex: 0x2f3a4d, name: 'Notte', cost: 20 }, { id: 9, hex: 0xffffff, name: 'Bianco', cost: 20 }
    ],
    acc: [{ id: 'none', name: 'Niente', cost: 0 }, { id: 'sunglasses', name: 'Occhiali da sole', cost: 20 }, { id: 'cape', name: 'Mantello', cost: 60 }]
  };

  // Salvataggio portatile: tutte le chiavi "rifugio-*" in un unico codice di testo.
  function exportCode() {
    const o = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf('rifugio-') === 0 && k !== 'rifugio-next-level') o[k] = localStorage.getItem(k); } } catch (e) { /* ignorato */ }
    return 'RIF1.' + btoa(unescape(encodeURIComponent(JSON.stringify(o))));
  }
  function importCode(code) {
    try {
      code = String(code || '').trim(); if (code.indexOf('RIF1.') !== 0) return false;
      const o = JSON.parse(decodeURIComponent(escape(atob(code.slice(5)))));
      const keys = Object.keys(o).filter(k => k.indexOf('rifugio-') === 0 && typeof o[k] === 'string');
      if (!keys.length) return false;
      keys.forEach(k => localStorage.setItem(k, o[k]));
      return true;
    } catch (e) { return false; }
  }

  R.settings = {
    data, save, QUALITY, CATALOG, exportCode, importCode,
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
