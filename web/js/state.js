// Stato persistente della partita, salvato in localStorage sul dispositivo.
// Il salvataggio ha una copia di riserva (chiave + '-bak') che non viene mai sostituita da una partita meno avanzata:
// se il salvataggio principale risulta azzerato o rovinato, si riparte dalla copia più avanzata.
(function (R) {
  'use strict';
  const defaults = () => ({
    coins: 0, wood: 0, fed: 0, guests: 0, collected: 0, cocoa: 0, happy: 0, done: 0,
    bought: {}, paid: {}, piles: [0, 0, 0], won: false
  });
  // Quanto è avanzata una partita: obiettivi, cose sbloccate, ospiti serviti, legna tagliata.
  const score = d => !d ? -1 : (d.done || 0) * 1e6 + Object.keys(d.bought || {}).length * 1e4 + (d.guests || 0) * 10 + Math.min(9, d.wood || 0);
  const read = k => { try { const j = JSON.parse(localStorage.getItem(k) || 'null'); return j && typeof j === 'object' ? j : null; } catch (e) { return null; } };

  R.createState = function (key) {
    const bakKey = key + '-bak';
    const main = read(key), bak = read(bakKey);
    // Vince la copia più avanzata; a parità, quella principale (più recente).
    const best = score(bak) > score(main) ? bak : (main || bak);
    let data;
    try { data = Object.assign(defaults(), best || {}); } catch (e) { data = defaults(); }
    if (!data.bought || typeof data.bought !== 'object') data.bought = {};
    if (!data.paid || typeof data.paid !== 'object') data.paid = {};
    if (!Array.isArray(data.piles)) data.piles = [0, 0, 0];

    // Dopo reset() i salvataggi sono bloccati: altrimenti il salvataggio automatico alla chiusura della pagina
    // riscriverebbe la partita appena cancellata.
    let locked = false, bakScore = score(bak);
    return {
      data,
      save() {
        if (locked) return;
        try {
          const s = JSON.stringify(data);
          localStorage.setItem(key, s);
          const sc = score(data);
          if (sc >= bakScore) { localStorage.setItem(bakKey, s); bakScore = sc; }
        } catch (e) { /* storage non disponibile */ }
      },
      reset() { locked = true; try { localStorage.removeItem(key); localStorage.removeItem(bakKey); } catch (e) { /* storage non disponibile */ } },
      isBought: id => !!data.bought[id],
      paid: id => data.paid[id] || 0,
      hasProgress: () => data.done > 0
    };
  };
})(window.Rifugio);
