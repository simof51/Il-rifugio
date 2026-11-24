// Avvio: sceglie il livello, carica il salvataggio, collega i pulsanti, avvia il livello e registra il service worker (uso offline).
(function (R) {
  'use strict';
  const $ = id => document.getElementById(id);

  // Livello scelto (ricordato fra un avvio e l'altro): ogni livello ha il suo salvataggio.
  const LEVEL_KEY = 'rifugio-level', ORDER = ['inverno', 'estate'];
  const readLevel = () => { try { return localStorage.getItem(LEVEL_KEY); } catch (e) { return null; } };
  const setLevel = id => { try { localStorage.setItem(LEVEL_KEY, id); } catch (e) { /* ignorato */ } location.reload(); };
  const level = R.levels[readLevel()] || R.levels.inverno;
  const state = R.createState(level.saveKey);
  // Chiede al sistema di non cancellare i dati del gioco quando manca spazio.
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignorato */ }

  // Testi del livello nella finestra iniziale e scelta della stagione.
  $('introMsg').textContent = level.text.intro;
  $('introList').innerHTML = level.text.help.map(t => `<li>${t}</li>`).join('');
  $('levelNote').textContent = `${level.emoji} ${level.name}: ${level.objectives.length} obiettivi. I progressi restano salvati sul dispositivo.`;
  $('levels').innerHTML = ORDER.filter(id => R.levels[id]).map(id => {
    const l = R.levels[id];
    return `<button class="lv${l === level ? ' on' : ''}" data-level="${id}">${l.emoji} ${l.name}</button>`;
  }).join('');
  $('levels').onclick = e => { const b = e.target.closest('button[data-level]'); if (b && R.levels[b.dataset.level] !== level) setLevel(b.dataset.level); };
  $('nextLevel').onclick = () => setLevel($('nextLevel').dataset.level);

  const reset = () => { state.reset(); location.reload(); };
  $('reset1').onclick = reset; $('reset2').onclick = reset;
  if (state.hasProgress()) $('reset1').hidden = false;

  // Nell'app Android il service worker non serve: l'aggiornamento e l'uso offline li gestisce il caricatore dell'app.
  const remote = window.RIFUGIO_REMOTE, inApp = !!(remote || window.Capacitor);
  if (!inApp && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* il gioco funziona anche senza */ });
  }

  if (!window.THREE) {
    $('introMsg').textContent = 'Non riesco a caricare il motore 3D: controlla la connessione e ricarica la pagina.';
    $('start').disabled = true;
    return;
  }

  // Versione in uso, mostrata nella finestra iniziale.
  if (remote) $('ver').textContent = `Versione ${remote.sha.slice(0, 7)}, scaricata da GitHub`;
  else if (inApp) $('ver').textContent = 'Versione inclusa nell\'app (offline)';

  const hud = R.createHud();
  const game = R.createGame({ hud, level, state });
  if (location.search.indexOf('debug') >= 0) window.rifugioDebug = game.debug;
  $('start').onclick = () => { hud.hideIntro(); game.start(); };
  $('keep').onclick = () => { hud.hideWin(); game.resume(); };

  // Aggiornamenti in tempo reale: ogni 90 s chiede a GitHub l'ultimo commit; se è cambiato mostra un pulsante per ricaricare.
  // Con "no-cache" il WebView usa l'ETag e le risposte "non cambiato" non consumano il limite di 60 richieste l'ora di GitHub.
  if (remote) {
    const check = () => fetch(remote.api, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(j => {
      if (!j || !j.sha || j.sha === remote.sha) return;
      const b = $('update'); b.hidden = false;
      b.onclick = () => { game.save(); location.reload(); };
    }).catch(() => { /* senza rete si riprova più tardi */ });
    setInterval(check, 90000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  }
})(window.Rifugio);
