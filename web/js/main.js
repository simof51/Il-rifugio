// Avvio: sceglie la tappa dal progresso (città e stagione), carica il salvataggio, collega pulsanti, menu, strumenti di prova e audio,
// avvia il livello e registra il service worker (uso offline).
(function (R) {
  'use strict';
  const $ = id => document.getElementById(id);
  const ORDER = R.order, debug = location.search.indexOf('debug') >= 0;
  // Menu Debug: mettere false prima di pubblicare sul Play Store (si può riaprire con ?debug nell'indirizzo).
  const SHOW_DEBUG = true;

  // La tappa non si sceglie: si gioca la prima non ancora completata (città in ordine, stagioni in ordine) e,
  // una volta completata, non si torna indietro. Solo il menu Debug può forzare una tappa (promemoria per un solo avvio).
  const NEXT_KEY = 'rifugio-next-level';
  const takeKey = k => { try { const v = sessionStorage.getItem(k); sessionStorage.removeItem(k); return v; } catch (e) { return null; } };
  const forceLevel = id => { try { sessionStorage.setItem(NEXT_KEY, id); } catch (e) { /* ignorato */ } location.reload(); };
  const savedData = l => R.createState(l.saveKey).data;
  const isWon = l => { const d = savedData(l); return !!d.won || d.done >= l.objectives.length; };
  const firstOpen = ORDER.find(id => !isWon(R.levels[id])) || ORDER[ORDER.length - 1];
  const forced = takeKey(NEXT_KEY);
  const level = R.levels[(SHOW_DEBUG || debug) && forced && R.levels[forced] ? forced : firstOpen];
  const state = R.createState(level.saveKey);
  const levelDone = () => !!state.data.won || state.data.done >= level.objectives.length;
  // Chiede al sistema di non cancellare i dati del gioco quando manca spazio.
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignorato */ }

  const audio = R.createAudio();

  // Testi della tappa nella finestra iniziale.
  $('introMsg').textContent = level.text.intro;
  $('introList').innerHTML = level.text.help.map(t => `<li>${t}</li>`).join('');
  $('levelNote').textContent = `${level.cityEmoji} ${level.cityName} · ${level.emoji} ${level.name}: ${level.objectives.length} obiettivi. I progressi restano salvati sul dispositivo.`;
  $('nextLevel').onclick = () => location.reload(); // la tappa vinta è salvata: al riavvio parte la successiva

  const reset = () => { state.reset(); location.reload(); };
  $('reset1').onclick = reset;
  if (state.hasProgress() && !levelDone()) $('reset1').hidden = false;

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
  const dbg = game.debug;

  // --- menu: città, avanzamento, impostazioni e strumenti di prova ------------
  let confirmReset = false, showDbg = false, dbgMsg = '';
  const dataOf = l => l === level ? state.data : savedData(l);
  const doneOf = l => Math.min(dataOf(l).done || 0, l.objectives.length);
  const wonOf = l => doneOf(l) >= l.objectives.length;
  const playable = l => l === level || wonOf(l) || ORDER.slice(0, ORDER.indexOf(l.id)).every(id => wonOf(R.levels[id]));
  // Tutte le città sono sempre visibili: ognuna con la barra di avanzamento e le sue quattro stagioni.
  function cityCard(c) {
    const lv = c.levels.map(id => R.levels[id]), total = lv.reduce((a, l) => a + l.objectives.length, 0), done = lv.reduce((a, l) => a + doneOf(l), 0);
    const seasonsWon = lv.filter(wonOf).length, here = lv.includes(level), open = lv.some(playable);
    const chips = lv.map(l => {
      const w = wonOf(l), cur = l === level, ok = playable(l);
      return `<span class="sc${w ? ' done' : ''}${cur ? ' cur' : ''}${ok ? '' : ' lock'}"><b>${ok ? l.emoji : '🔒'}</b>${l.name}<i>${w ? '✅' : ok ? `${doneOf(l)}/${l.objectives.length}` : ''}</i></span>`;
    }).join('');
    return `<div class="city${here ? ' cur' : ''}${open ? '' : ' lock'}"><div class="lhead"><b>${open ? c.emoji : '🔒'} ${c.name}</b><span>${seasonsWon === lv.length ? '✅ Completata' : `${seasonsWon}/${lv.length} stagioni`}</span></div>` +
      `<div class="cblurb">${c.blurb}</div><div class="bar"><i style="width:${(done / total * 100).toFixed(1)}%"></i></div><div class="seasons">${chips}</div></div>`;
  }
  function toggle(key, label) { return `<div class="set"><span>${label}</span><button class="tg${audio.state[key] ? ' on' : ''}" data-tg="${key}" aria-pressed="${!!audio.state[key]}">${audio.state[key] ? 'Sì' : 'No'}</button></div>`; }
  function slider(key, label) { return `<div class="set"><span>${label}</span><input type="range" min="0" max="1" step="0.05" value="${audio.state[key]}" data-vol="${key}" aria-label="${label}"></div>`; }

  // Strumenti di prova: [testo, azione, (acceso?)]. Le azioni agiscono sulla partita in corso.
  const nowOn = () => dbg.info();
  const markWon = l => { if (l === level) { dbg.finishLevel(); return; } const s = R.createState(l.saveKey); s.data.done = l.objectives.length; s.data.won = true; s.save(); };
  const wipeAll = () => {
    Object.keys(R.levels).forEach(id => { try { localStorage.removeItem(R.levels[id].saveKey); localStorage.removeItem(R.levels[id].saveKey + '-bak'); } catch (e) { /* ignorato */ } });
    try { sessionStorage.clear(); } catch (e) { /* ignorato */ }
    location.reload();
  };
  const DBG = [
    ['Ricomincia', [['🔄 Ricomincia TUTTO da capo', () => { if (dbgMsg === 'Tocca ancora: cancella ogni progresso di ogni città') wipeAll(); else dbgMsg = 'Tocca ancora: cancella ogni progresso di ogni città'; }]]],
    ['Monete', [['+100', () => dbg.coins(100)], ['+1000', () => dbg.coins(1000)]]],
    ['Obiettivi', [['Completa questo', () => dbg.skip(1)], ['+5', () => dbg.skip(5)], ['Completa stagione', () => dbg.finishLevel()]]],
    ['Sblocchi', [['Sblocca tutto', () => dbg.unlockAll()], ['Assumi aiutanti', () => dbg.hireAll()]]],
    ['Partita', [['Chiama ospite', () => dbg.callGuest()], ['Riempi fuochi', () => dbg.fillFuel()], ['Zaino pieno', () => dbg.fillBag()], ['Banco pieno', () => dbg.fillStand()]]],
    ['Vai a…', [['Casetta', () => dbg.go('casetta')], ['Bosco', () => dbg.go('bosco')], ['Banco', () => dbg.go('banco')], ['Sentiero', () => dbg.go('sentiero')], ['Lago', () => dbg.go('lago')]]],
    ['Strumenti', [['Velocità x2', () => dbg.fast(!nowOn().fast), () => nowOn().fast], ['Mostra FPS', () => dbg.showFps(!nowOn().fps), () => nowOn().fps]]],
    ['Tappe (città · stagione)', ORDER.map(id => { const l = R.levels[id]; return [`${l.cityEmoji}${l.emoji}`, () => forceLevel(id), () => l === level]; })],
    ['Completa tappe', [['Tutto fino a questa', () => ORDER.slice(0, ORDER.indexOf(level.id)).forEach(id => markWon(R.levels[id]))], ['Tutto', () => ORDER.forEach(id => markWon(R.levels[id]))]]],
    ['Suoni', ['chop', 'saw', 'log', 'coin', 'cup', 'buy', 'goal', 'guest', 'cold', 'tree'].map(n => [n, () => audio.sfx(n)])]
  ];
  const dbgActs = [];
  function debugPanel() {
    dbgActs.length = 0;
    return DBG.map(([title, items]) => `<div class="dbgrow"><b>${title}</b><div>${items.map(it => {
      dbgActs.push(it[1]); const on = it[2] && it[2]();
      return `<button class="mini${on ? ' on' : ''}${it[0].indexOf('TUTTO') >= 0 ? ' danger' : ''}" data-act="${dbgActs.length - 1}">${it[0]}</button>`;
    }).join('')}</div></div>`).join('') + `<div class="lact" id="dbgMsg">${dbgMsg}</div>`;
  }
  function renderMenu() {
    const S = state.data;
    $('menuBody').innerHTML =
      `<h2>Le tue città</h2>${R.cities.map(cityCard).join('')}` +
      `<div class="stats"><div><b>${S.coins}</b><span>monete</span></div><div><b>${S.guests}</b><span>ospiti</span></div><div><b>${S.wood}</b><span>legna</span></div><div><b>${S.cocoa}</b><span>bevande</span></div></div>` +
      `<h2>Impostazioni</h2>${toggle('sfx', 'Suoni')}${slider('sfxVol', 'Volume suoni')}${toggle('music', 'Musica')}${slider('musVol', 'Volume musica')}` +
      (levelDone() ? '' : `<div class="row"><button class="btn ghost" id="menuReset">${confirmReset ? 'Sicuro? Tocca di nuovo' : 'Ricomincia questa stagione'}</button></div>`) +
      (SHOW_DEBUG || debug ? `<div class="row"><button class="btn ghost" id="dbgToggle">🛠 Debug ${showDbg ? '▲' : '▼'}</button></div>${showDbg ? `<div class="dbg">${debugPanel()}</div>` : ''}` : '');
  }
  function openMenu() { confirmReset = false; dbgMsg = ''; renderMenu(); $('menu').classList.remove('hidden'); game.pause(true); audio.sfx('click'); }
  function closeMenu() { $('menu').classList.add('hidden'); game.pause(false); audio.sfx('click'); }
  $('menuBtn').onclick = openMenu; $('menuClose').onclick = closeMenu;
  $('menuBody').addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.tg) { audio.set(t.dataset.tg, !audio.state[t.dataset.tg]); audio.unlock(); renderMenu(); audio.sfx('click'); }
    else if (t.id === 'menuReset') { if (confirmReset) reset(); else { confirmReset = true; renderMenu(); } }
    else if (t.id === 'dbgToggle') { showDbg = !showDbg; renderMenu(); }
    else if (t.dataset.act != null) {
      const before = dbgMsg; dbgActs[+t.dataset.act](); if (dbgMsg === before) dbgMsg = 'Fatto: ' + t.textContent;
      const y = $('menu').scrollTop; renderMenu(); $('menu').scrollTop = y;
    }
  });
  $('menuBody').addEventListener('input', e => { const k = e.target.dataset.vol; if (k) audio.set(k, +e.target.value); });
  $('menuBody').addEventListener('change', e => { if (e.target.dataset.vol) audio.sfx('coin'); });

  $('start').onclick = () => { audio.unlock(); audio.playMusic(level.season); hud.hideIntro(); game.start(); };
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
