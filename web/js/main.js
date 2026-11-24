// Avvio: sceglie il livello, carica il salvataggio, collega pulsanti, menu e audio, avvia il livello e registra il service worker (uso offline).
(function (R) {
  'use strict';
  const $ = id => document.getElementById(id);
  const ORDER = ['inverno', 'estate'].filter(id => R.levels[id]);
  const debug = location.search.indexOf('debug') >= 0;

  // Si parte sempre dall'inverno. Le stagioni successive si aprono quando si completa la precedente.
  // Il cambio di livello ricarica la pagina e lascia un promemoria che vale solo per quell'avvio.
  const NEXT_KEY = 'rifugio-next-level';
  const takeNext = () => { try { const v = sessionStorage.getItem(NEXT_KEY); sessionStorage.removeItem(NEXT_KEY); return v; } catch (e) { return null; } };
  const goLevel = id => { try { sessionStorage.setItem(NEXT_KEY, id); } catch (e) { /* ignorato */ } location.reload(); };
  const savedData = l => R.createState(l.saveKey).data;
  const isWon = l => { const d = savedData(l); return !!d.won || d.done >= l.objectives.length; };
  const unlocked = id => debug || ORDER.indexOf(id) <= 0 || isWon(R.levels[ORDER[ORDER.indexOf(id) - 1]]);

  const wanted = takeNext();
  const level = R.levels[wanted && unlocked(wanted) ? wanted : 'inverno'];
  const state = R.createState(level.saveKey);
  // Chiede al sistema di non cancellare i dati del gioco quando manca spazio.
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignorato */ }

  const audio = R.createAudio();

  // Testi del livello nella finestra iniziale e scelta della stagione.
  $('introMsg').textContent = level.text.intro;
  $('introList').innerHTML = level.text.help.map(t => `<li>${t}</li>`).join('');
  $('levelNote').textContent = `${level.emoji} ${level.name}: ${level.objectives.length} obiettivi. I progressi restano salvati sul dispositivo.`;
  $('levels').innerHTML = ORDER.map(id => {
    const l = R.levels[id], ok = unlocked(id);
    return `<button class="lv${l === level ? ' on' : ''}" data-level="${id}"${ok ? '' : ' disabled'}>${ok ? l.emoji : '🔒'} ${l.name}</button>`;
  }).join('');
  $('levels').onclick = e => { const b = e.target.closest('button[data-level]'); if (b && !b.disabled && R.levels[b.dataset.level] !== level) goLevel(b.dataset.level); };
  $('nextLevel').onclick = () => goLevel($('nextLevel').dataset.level);

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
  const game = R.createGame({ hud, level, state, audio });
  if (debug) window.rifugioDebug = game.debug;

  // --- menu: avanzamento e impostazioni -------------------------------------
  let confirmReset = false;
  function levelRow(l) {
    const cur = l === level, d = cur ? state.data : savedData(l), n = l.objectives.length, done = Math.min(d.done || 0, n), ok = unlocked(l.id), won = done >= n;
    const bar = `<div class="bar"><i style="width:${(done / n * 100).toFixed(1)}%"></i></div>`;
    const act = cur ? '<span class="tag">Stai giocando qui</span>' : ok ? `<button class="mini" data-go="${l.id}">Gioca</button>` : '<span class="tag">🔒 Completa la stagione prima</span>';
    return `<div class="lrow${cur ? ' cur' : ''}"><div class="lhead"><b>${ok ? l.emoji : '🔒'} ${l.name}</b><span>${won ? '✅ Completato' : `${done}/${n} obiettivi`}</span></div>${bar}<div class="lact">${act}</div></div>`;
  }
  function toggle(key, label) { return `<div class="set"><span>${label}</span><button class="tg${audio.state[key] ? ' on' : ''}" data-tg="${key}" aria-pressed="${!!audio.state[key]}">${audio.state[key] ? 'Sì' : 'No'}</button></div>`; }
  function slider(key, label) { return `<div class="set"><span>${label}</span><input type="range" min="0" max="1" step="0.05" value="${audio.state[key]}" data-vol="${key}" aria-label="${label}"></div>`; }
  function renderMenu() {
    const S = state.data;
    $('menuBody').innerHTML =
      `<h2>Il tuo cammino</h2>${ORDER.map(id => levelRow(R.levels[id])).join('')}` +
      `<div class="stats"><div><b>${S.coins}</b><span>monete</span></div><div><b>${S.guests}</b><span>ospiti</span></div><div><b>${S.wood}</b><span>legna</span></div><div><b>${S.cocoa}</b><span>bevande</span></div></div>` +
      `<h2>Impostazioni</h2>${toggle('sfx', 'Suoni')}${slider('sfxVol', 'Volume suoni')}${toggle('music', 'Musica')}${slider('musVol', 'Volume musica')}` +
      `<div class="row"><button class="btn ghost" id="menuReset">${confirmReset ? 'Sicuro? Tocca di nuovo' : 'Ricomincia questo livello'}</button></div>`;
  }
  function openMenu() { confirmReset = false; renderMenu(); $('menu').classList.remove('hidden'); game.pause(true); audio.sfx('click'); }
  function closeMenu() { $('menu').classList.add('hidden'); game.pause(false); audio.sfx('click'); }
  $('menuBtn').onclick = openMenu; $('menuClose').onclick = closeMenu;
  $('menuBody').addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.go) goLevel(t.dataset.go);
    else if (t.dataset.tg) { audio.set(t.dataset.tg, !audio.state[t.dataset.tg]); audio.unlock(); renderMenu(); audio.sfx('click'); }
    else if (t.id === 'menuReset') { if (confirmReset) reset(); else { confirmReset = true; renderMenu(); } }
  });
  $('menuBody').addEventListener('input', e => { const k = e.target.dataset.vol; if (k) audio.set(k, +e.target.value); });
  $('menuBody').addEventListener('change', e => { if (e.target.dataset.vol) audio.sfx('coin'); });

  $('start').onclick = () => { audio.unlock(); audio.playMusic(level.id); hud.hideIntro(); game.start(); };
  $('keep').onclick = () => { hud.hideWin(); game.resume(); };

  // Aggiornamenti in tempo reale: ogni 90 s chiede a GitHub l'ultimo commit; se è cambiato mostra un pulsante per ricaricare.
  // Con "no-cache" il WebView usa l'ETag e le risposte "non cambiato" non consumano il limite di 60 richieste l'ora di GitHub.
  if (remote) {
    const check = () => fetch(remote.api, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(j => {
      if (!j || !j.sha || j.sha === remote.sha) return;
      const b = $('update'); b.hidden = false;
      b.onclick = () => { game.save(); try { sessionStorage.setItem(NEXT_KEY, level.id); } catch (e) { /* ignorato */ } location.reload(); }; // resta nella stagione in corso
    }).catch(() => { /* senza rete si riprova più tardi */ });
    setInterval(check, 90000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  }
})(window.Rifugio);
