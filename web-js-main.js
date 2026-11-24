// Avvio: carica il salvataggio, collega i pulsanti, avvia il livello e registra il service worker (uso offline).
(function (R) {
  'use strict';
  const $ = id => document.getElementById(id);
  const state = R.createState('rifugio-v2');

  const reset = () => { state.reset(); location.reload(); };
  $('reset1').onclick = reset; $('reset2').onclick = reset;
  if (state.hasProgress()) $('reset1').hidden = false;

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* il gioco funziona anche senza */ });
  }

  if (!window.THREE) {
    $('introMsg').textContent = 'Non riesco a caricare il motore 3D: controlla la connessione e ricarica la pagina.';
    $('start').disabled = true;
    return;
  }

  const hud = R.createHud();
  const game = R.createGame({ hud, level: R.levels.inverno, state });
  $('start').onclick = () => { hud.hideIntro(); game.start(); };
  $('keep').onclick = () => { hud.hideWin(); game.resume(); };
})(window.Rifugio);
