// Stato persistente della partita, salvato in localStorage sul dispositivo.
(function (R) {
  'use strict';
  const defaults = () => ({
    coins: 0, wood: 0, fed: 0, guests: 0, collected: 0, cocoa: 0, happy: 0, done: 0,
    bought: {}, paid: {}, piles: [0, 0, 0], won: false
  });

  R.createState = function (key) {
    let data;
    try { data = Object.assign(defaults(), JSON.parse(localStorage.getItem(key) || '{}')); }
    catch (e) { data = defaults(); }
    if (!data.bought || typeof data.bought !== 'object') data.bought = {};
    if (!data.paid || typeof data.paid !== 'object') data.paid = {};
    if (!Array.isArray(data.piles)) data.piles = [0, 0, 0];

    // Dopo reset() i salvataggi sono bloccati: altrimenti il salvataggio automatico alla chiusura della pagina
    // riscriverebbe la partita appena cancellata.
    let locked = false;
    return {
      data,
      save() { if (locked) return; try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { /* storage non disponibile */ } },
      reset() { locked = true; try { localStorage.removeItem(key); } catch (e) { /* storage non disponibile */ } },
      isBought: id => !!data.bought[id],
      paid: id => data.paid[id] || 0,
      hasProgress: () => data.done > 0
    };
  };
})(window.Rifugio);
