// Cose che fanno tornare a giocare: premio giornaliero con serie, guadagno mentre sei via, album delle figurine, ospiti VIP con nome,
// eventi di stagione, scrigni, decorazioni, "nuova gestione" (prestigio) e un mini-gioco. Tutto sul dispositivo, niente rete.
// I dati stanno nelle impostazioni (st.get('meta')); il gioco chiama R.meta.* e il menu mostra le schede (main.js).
(function (R) {
  'use strict';
  const st = R.settings;
  let toast = () => {};

  const fresh = () => ({ streak: 0, lastClaim: '', nameChanges: 0, album: {}, albumDone: false, deco: { sign: 'red', rug: 'red', name: '' }, prestige: 0, chest: { pts: 0, opened: 0 }, vip: {}, game: { best: 0, day: '', freeUsed: false, adN: 0, lastEnd: 0 } });
  function M() {
    let m = st.get('meta');
    if (!m || typeof m !== 'object') { m = fresh(); st.set('meta', m); return m; }
    const f = fresh();
    Object.keys(f).forEach(k => { if (m[k] == null) m[k] = f[k]; });
    m.deco = Object.assign(f.deco, m.deco); m.chest = Object.assign(f.chest, m.chest); m.game = Object.assign(f.game, m.game);
    return m;
  }
  const save = () => st.set('meta', M());
  const pad = n => (n < 10 ? '0' : '') + n;
  const dayStr = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const today = () => dayStr(new Date());
  const daysBetween = (a, b) => { if (!a) return 99; const pa = a.split('-'), pb = b.split('-'); return Math.round((Date.UTC(+pb[0], +pb[1] - 1, +pb[2]) - Date.UTC(+pa[0], +pa[1] - 1, +pa[2])) / 864e5); };

  // --- premio giornaliero: 7 giorni di serie (chi salta un giorno non perde la serie; dopo due giorni ricomincia) ---
  const DAILY = [2, 3, 4, 5, 6, 8, 15];
  function dailyInfo() {
    const m = M(), gap = daysBetween(m.lastClaim, today());
    const can = gap >= 1;
    let streak = m.streak;
    if (can) streak = gap === 1 || gap === 2 ? m.streak + 1 : 1;
    const idx = (Math.max(1, streak) - 1) % 7;
    return { can, streak: can ? streak : m.streak, idx: can ? idx : (Math.max(1, m.streak) - 1) % 7, gems: DAILY[idx], next: DAILY[(idx + 1) % 7], list: DAILY };
  }
  function claimDaily() {
    const i = dailyInfo(); if (!i.can) return null;
    const m = M(); m.streak = i.streak; m.lastClaim = today(); save();
    st.addGems(i.gems);
    if (i.idx === 6) addPts(10);
    return i;
  }

  // --- eventi di stagione (a data): più guadagno e decorazioni; con ?event=natale si prova ---
  const EVENTS = [
    { id: 'natale', name: 'Magia di Natale', e: '🎄', from: [12, 8], to: [1, 6], mul: 1.25, decor: 'tree', text: 'Ospiti contenti: guadagni +25%' },
    { id: 'carnevale', name: 'Carnevale', e: '🎭', from: [2, 1], to: [3, 5], mul: 1.2, decor: 'balloon', text: 'Palloncini e festa: guadagni +20%' },
    { id: 'pasqua', name: 'Primavera in festa', e: '🐣', from: [3, 20], to: [4, 25], mul: 1.2, decor: 'egg', text: 'Uova colorate: guadagni +20%' },
    { id: 'estate', name: 'Estate al sole', e: '🏖️', from: [7, 1], to: [8, 31], mul: 1.15, decor: 'balloon', text: 'Stagione di vacanze: guadagni +15%' },
    { id: 'halloween', name: 'Notte di Halloween', e: '🎃', from: [10, 24], to: [11, 2], mul: 1.25, decor: 'pumpkin', text: 'Zucche e sorprese: guadagni +25%' }
  ];
  const inRange = (d, from, to) => { const v = (d.getMonth() + 1) * 100 + d.getDate(), a = from[0] * 100 + from[1], b = to[0] * 100 + to[1]; return a <= b ? v >= a && v <= b : v >= a || v <= b; };
  function eventNow() {
    try { const q = /[?&]event=(\w+)/.exec(location.search); if (q) { const f = EVENTS.find(e => e.id === q[1]); if (f) return f; } } catch (e) { /* ignorato */ }
    const d = new Date(); return EVENTS.find(e => inRange(d, e.from, e.to)) || null;
  }
  const payMul = () => { const ev = eventNow(); return (1 + 0.1 * Math.min(10, M().prestige)) * (ev ? ev.mul : 1); };

  // --- scrigni: punti da obiettivi, missioni e figurine; ogni 10 punti un scrigno ---
  const CHEST_AT = 10;
  function addPts(n) { const m = M(); m.chest.pts += n; save(); }
  const chestReady = () => Math.floor(M().chest.pts / CHEST_AT) > M().chest.opened;
  const chestInfo = () => { const m = M(); return { pts: m.chest.pts - m.chest.opened * CHEST_AT, ready: chestReady(), at: CHEST_AT, left: Math.floor(m.chest.pts / CHEST_AT) - m.chest.opened }; };
  function openChest() {
    if (!chestReady()) return null;
    const m = M(); m.chest.opened++; save();
    const C = st.CATALOG, pool = [];
    ['hat', 'color', 'acc', 'pet'].forEach(cat => C[cat].forEach(i => { if (!i.premium && i.cost > 0 && !st.has(cat + ':' + i.id)) pool.push({ key: cat + ':' + i.id, name: i.name, cat }); }));
    if (pool.length && Math.random() < 0.3) {
      const it = pool[Math.floor(Math.random() * pool.length)]; st.data.owned.push(it.key); st.save();
      return { kind: 'item', e: it.cat === 'hat' ? '🎩' : it.cat === 'acc' ? '🕶️' : it.cat === 'pet' ? '🐾' : '🎨', text: `Nuovo oggetto: ${it.name}!` };
    }
    const n = [3, 3, 4, 5, 6, 8, 12][Math.floor(Math.random() * 7)]; st.addGems(n);
    return { kind: 'gems', e: '💎', text: `+${n} gemme!` };
  }

  // --- album: figurine da trovare giocando ---
  const ALBUM = [
    { id: 'g_hiker', e: '🧑', name: 'Ospite', desc: 'Accogli il primo ospite' }, { id: 'g_vip', e: '⭐', name: 'Ospite VIP', desc: 'Accogli un VIP' },
    { id: 'g_scout', e: '🏕️', name: 'Squadra scout', desc: 'Accogli degli scout' }, { id: 'g_rush', e: '⏱️', name: 'Affamato', desc: 'Servi un ospite affamato' },
    { id: 'p_dog', e: '🐶', name: 'Cane', desc: 'Gioca con il cane' }, { id: 'p_cat', e: '🐱', name: 'Gatto', desc: 'Gioca con il gatto' },
    { id: 'w_rain', e: '🌧️', name: 'Pioggia', desc: 'Vivi una giornata di pioggia' }, { id: 'w_storm', e: '⛈️', name: 'Temporale', desc: 'Vivi un temporale' },
    { id: 'w_fog', e: '🌫️', name: 'Nebbia', desc: 'Vivi una giornata di nebbia' }, { id: 'w_snow', e: '🌨️', name: 'Bufera', desc: 'Vivi una bufera di neve' },
    { id: 'n_night', e: '🌙', name: 'Notte', desc: 'Gioca di notte' }, { id: 'r_pay', e: '💰', name: 'Primo incasso', desc: 'Ritira i soldi alla reception' },
    { id: 's_inverno', e: '❄️', name: 'Inverno', desc: 'Gioca una stagione d\'inverno' }, { id: 's_primavera', e: '🌸', name: 'Primavera', desc: 'Gioca una stagione di primavera' },
    { id: 's_estate', e: '☀️', name: 'Estate', desc: 'Gioca una stagione d\'estate' }, { id: 's_autunno', e: '🍂', name: 'Autunno', desc: 'Gioca una stagione d\'autunno' },
    { id: 'e_event', e: '🎉', name: 'Evento', desc: 'Gioca durante un evento di stagione' }
  ];
  function see(id) {
    const m = M(); if (m.album[id]) return false;
    const a = ALBUM.find(x => x.id === id); if (!a) return false;
    m.album[id] = Date.now(); save(); st.addGems(1); addPts(1);
    toast(`📖 Nuova figurina: ${a.e} ${a.name} (+1 💎)`);
    if (!m.albumDone && ALBUM.every(x => M().album[x.id])) { m.albumDone = true; save(); st.addGems(10); addPts(5); toast('📖 Album completo! +10 gemme 💎'); }
    return true;
  }
  const albumCount = () => ALBUM.filter(a => M().album[a.id]).length;

  // --- ospiti VIP con nome e storia ---
  const PERSONAS = [
    { id: 'baron', e: '🎩', name: 'Barone Von Cima', line: 'Che vista incredibile da quassù!' }, { id: 'chef', e: '👨‍🍳', name: 'Chef Gustavo', line: 'Il vostro cacao è pura poesia.' },
    { id: 'rock', e: '🎸', name: 'Rocky la rockstar', line: 'Qui scrivo la mia prossima canzone!' }, { id: 'writer', e: '📚', name: 'Elsa la scrittrice', line: 'Questo posto finirà nel mio libro.' },
    { id: 'astro', e: '🔭', name: 'Prof. Stella', line: 'Che cielo! Si vedono tutte le stelle.' }, { id: 'ski', e: '⛷️', name: 'Il campione', line: 'Domani batto il record di discesa!' },
    { id: 'nonna', e: '👵', name: 'Nonna Pina', line: 'Ai miei tempi non c\'era la reception, bravi!' }, { id: 'explorer', e: '🧭', name: 'Marco l\'esploratore', line: 'Ho girato il mondo: il vostro è il migliore.' }
  ];
  function vipPersona() {
    const m = M(), unseen = PERSONAS.filter(p => !m.vip[p.id]), pool = unseen.length ? unseen : PERSONAS;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function vipServed(p) {
    if (!p) return;
    const m = M(), first = !m.vip[p.id]; m.vip[p.id] = (m.vip[p.id] || 0) + 1; save();
    toast(`${p.e} ${p.name}: «${p.line}»`);
    if (first) { st.addGems(2); addPts(1); }
  }

  // --- decorazioni del rifugio ---
  const DECO = {
    sign: [{ id: 'red', name: 'Rosso', col: '#c23b2e', cost: 0 }, { id: 'blue', name: 'Blu', col: '#2d6cdf', cost: 12 }, { id: 'green', name: 'Verde', col: '#2f9e5a', cost: 12 },
      { id: 'violet', name: 'Viola', col: '#8a4fd8', cost: 15 }, { id: 'gold', name: 'Oro', col: '#c98a00', cost: 25 }],
    rug: [{ id: 'red', name: 'Rosso', col: 0xc23b2e, cost: 0 }, { id: 'blue', name: 'Blu', col: 0x2d6cdf, cost: 10 }, { id: 'green', name: 'Verde', col: 0x2f9e5a, cost: 10 },
      { id: 'violet', name: 'Viola', col: 0x8a4fd8, cost: 12 }, { id: 'gold', name: 'Oro', col: 0xd9a21b, cost: 20 }]
  };
  const decoGet = (kind) => { const id = M().deco[kind], l = DECO[kind]; return l.find(x => x.id === id) || l[0]; };
  function decoSet(kind, id) { const m = M(); m.deco[kind] = id; save(); }
  // Il nome del rifugio si cambia una volta gratis; dal secondo cambio costa 100 gemme. Risultato: 'ok', 'same' (uguale), 'gems' (gemme insufficienti).
  const NAME_COST = 100;
  const nameCost = () => (M().nameChanges >= 1 ? NAME_COST : 0);
  function decoName(txt) {
    const m = M(), clean = String(txt || '').replace(/[<>&"]/g, '').slice(0, 16).trim();
    if (clean === m.deco.name) return 'same';
    const cost = nameCost();
    if (cost && st.get('gems') < cost) return 'gems';
    if (cost) st.addGems(-cost);
    m.deco.name = clean; m.nameChanges = (m.nameChanges || 0) + 1; save();
    return 'ok';
  }
  const lodgeName = () => M().deco.name || '';

  // --- nuova gestione (prestigio): +10% sui guadagni per sempre, fino a 10 volte ---
  const prestige = () => M().prestige;
  function addPrestige() { const m = M(); m.prestige = Math.min(10, m.prestige + 1); save(); addPts(3); return m.prestige; }

  // --- mini-gioco "Pioggia di monete": 20 secondi, tocca le monete che cadono ---
  // Regole: una partita gratis al giorno; poi fino a 3 partite al giorno guardando un video, con almeno 5 minuti fra una partita e la successiva.
  const GAME_AD_PER_DAY = 3, GAME_AD_GAP = 300, GAME_PER_GEM = 4, GAME_MAX_GEMS = 5;
  function gameState() { const m = M(), g = m.game, d = today(); if (g.day !== d) { g.day = d; g.freeUsed = false; g.adN = 0; save(); } return g; }
  function gameInfo() {
    const g = gameState();
    return { free: !g.freeUsed, adLeft: Math.max(0, GAME_AD_PER_DAY - (g.adN || 0)), adWait: Math.max(0, Math.ceil(((g.lastEnd || 0) + GAME_AD_GAP * 1000 - Date.now()) / 1000)), best: g.best || 0 };
  }
  function useGame(kind) { const g = gameState(); if (kind === 'free') g.freeUsed = true; else g.adN = (g.adN || 0) + 1; save(); }
  function minigame(box, onEnd) {
    const cv = document.createElement('canvas'); cv.width = 320; cv.height = 400; cv.style.cssText = 'width:100%;max-width:320px;display:block;margin:0 auto;border-radius:18px;touch-action:none;background:linear-gradient(#8fd3ff,#d9f1ff)';
    box.innerHTML = ''; box.appendChild(cv);
    const g = cv.getContext('2d'); let coins = [], score = 0, t = 20, last = performance.now(), raf = 0, spawn = 0, over = false;
    const pop = [];
    function end() { if (over) return; over = true; cancelAnimationFrame(raf); const m = M(); m.game.lastEnd = Date.now(); m.game.best = Math.max(m.game.best, score); save(); const gems = Math.min(GAME_MAX_GEMS, Math.floor(score / GAME_PER_GEM)); if (gems) st.addGems(gems); onEnd(score, gems); }
    function frame(now) {
      if (over) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t -= dt; spawn -= dt;
      if (spawn <= 0) { spawn = 0.7 - Math.min(0.12, (20 - t) * 0.006); const gold = Math.random() < 0.1; /* meno monete: una ogni ~0,6 secondi */ coins.push({ x: 24 + Math.random() * 272, y: -20, v: 110 + Math.random() * 90 + (20 - t) * 6, r: gold ? 24 : 19, gold, ph: Math.random() * 6 }); }
      g.clearRect(0, 0, 320, 400);
      g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(80, 60, 50, 18, 0, 0, 7); g.ellipse(120, 52, 36, 16, 0, 0, 7); g.ellipse(240, 90, 46, 16, 0, 0, 7); g.fill();
      coins.forEach(c => { c.y += c.v * dt; c.ph += dt * 6; });
      coins = coins.filter(c => c.y < 430);
      coins.forEach(c => {
        const w = Math.abs(Math.cos(c.ph)) * c.r * 0.7 + c.r * 0.3;
        g.fillStyle = c.gold ? '#ff9f1c' : '#ffd23a'; g.strokeStyle = c.gold ? '#b86a00' : '#c98a00'; g.lineWidth = 3;
        g.beginPath(); g.ellipse(c.x, c.y, w, c.r, 0, 0, 7); g.fill(); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(c.x - w * 0.3, c.y - c.r * 0.3, w * 0.2, c.r * 0.35, 0, 0, 7); g.fill();
      });
      for (let i = pop.length - 1; i >= 0; i--) { const p = pop[i]; p.t -= dt; if (p.t <= 0) { pop.splice(i, 1); continue; } g.globalAlpha = p.t / 0.6; g.fillStyle = '#1f2a37'; g.font = '700 22px Fredoka, system-ui, sans-serif'; g.textAlign = 'center'; g.fillText(p.s, p.x, p.y - (0.6 - p.t) * 50); g.globalAlpha = 1; }
      g.fillStyle = 'rgba(31,42,55,.8)'; g.font = '700 20px Fredoka, system-ui, sans-serif'; g.textAlign = 'left'; g.fillText('🪙 ' + score, 12, 28); g.textAlign = 'right'; g.fillText('⏱ ' + Math.max(0, Math.ceil(t)), 308, 28);
      if (t <= 0) { end(); return; }
      raf = requestAnimationFrame(frame);
    }
    cv.addEventListener('pointerdown', e => {
      if (over) return; const b = cv.getBoundingClientRect(), x = (e.clientX - b.left) * 320 / b.width, y = (e.clientY - b.top) * 400 / b.height;
      for (let i = coins.length - 1; i >= 0; i--) { const c = coins[i]; if (Math.hypot(c.x - x, c.y - y) < c.r + 16) { score += c.gold ? 3 : 1; pop.push({ x: c.x, y: c.y, s: c.gold ? '+3' : '+1', t: 0.6 }); coins.splice(i, 1); break; } }
    });
    raf = requestAnimationFrame(frame);
    return () => { over = true; cancelAnimationFrame(raf); };
  }

  // --- pagine del profilo ---
  function dailyHtml(withBtn) {
    const i = dailyInfo();
    const days = DAILY.map((g, k) => `<div class="day${k < (i.can ? i.idx : i.idx + 1) ? ' got' : ''}${k === i.idx && i.can ? ' now' : ''}"><i>${k === 6 ? '🎁' : '💎'}</i><b>${g}</b><span>${k + 1}</span></div>`).join('');
    return `<div class="days">${days}</div><div class="small">${i.can ? `Oggi ti aspettano ${i.gems} 💎${i.idx === 6 ? ' e uno scrigno' : ''}. Serie: ${i.streak} ${i.streak === 1 ? 'giorno' : 'giorni'}.` : `Già ritirato oggi. Serie: ${i.streak} ${i.streak === 1 ? 'giorno' : 'giorni'}. Torna domani per ${i.next} 💎.`}</div>` +
      (withBtn === false ? '' : `<div class="row"><button class="btn" data-meta="daily"${i.can ? '' : ' disabled'}>${i.can ? '🎁 Ritira il premio' : 'Torna domani'}</button></div>`);
  }
  function chestHtml() {
    const c = chestInfo();
    return `<div class="chestbox${c.ready ? ' ready' : ''}"><span class="cico">${c.ready ? '🎁' : '📦'}</span><div><b>${c.ready ? `Hai ${c.left} ${c.left === 1 ? 'scrigno' : 'scrigni'} da aprire!` : 'Scrigno misterioso'}</b><div class="bar"><i style="width:${(c.ready ? 100 : c.pts / c.at * 100).toFixed(0)}%"></i></div><span class="small">${c.ready ? 'Dentro ci sono gemme o oggetti nuovi.' : `${c.pts}/${c.at} punti: li trovi completando obiettivi, missioni e figurine.`}</span></div></div>` +
      `<div class="row"><button class="btn" data-meta="chest"${c.ready ? '' : ' disabled'}>Apri lo scrigno</button></div>`;
  }
  function albumHtml() {
    const m = M();
    const cells = ALBUM.map(a => `<div class="medal${m.album[a.id] ? ' ok' : ''}"><i>${m.album[a.id] ? a.e : '❔'}</i><b>${m.album[a.id] ? a.name : '???'}</b><span>${a.desc}</span></div>`).join('');
    const vips = PERSONAS.map(p => `<span class="sc${m.vip[p.id] ? ' done' : ' lock'}"><b>${m.vip[p.id] ? p.e : '❔'}</b>${m.vip[p.id] ? p.name : '???'}</span>`).join('');
    return `<div class="small">Figurine trovate: ${albumCount()}/${ALBUM.length}. Ogni figurina dà 1 💎, l'album completo 10 💎.</div><div class="medals">${cells}</div>` +
      `<b class="small">Ospiti famosi (${PERSONAS.filter(p => m.vip[p.id]).length}/${PERSONAS.length})</b><div class="seasons">${vips}</div>`;
  }
  function decoNameHtml() {
    return `<div class="small">Scegli il nome del tuo rifugio: compare sull'insegna della reception. ${prestige() ? `⭐ Nuove gestioni: ${prestige()} (guadagni +${prestige() * 10}%).` : ''} I colori dell'insegna e del tappeto si scelgono nello Shop.</div>` +
      `<div class="small">${nameCost() ? `Il primo cambio era gratis: ogni nuovo cambio costa ${NAME_COST} 💎.` : 'Il primo cambio è gratis; i successivi costano ' + NAME_COST + ' 💎.'}</div>` +
      `<div class="set"><input id="lodgeName" class="txt" maxlength="16" placeholder="Nome del rifugio" value="${lodgeName()}"><button class="mini" data-meta="name">${nameCost() ? 'Salva · ' + NAME_COST + ' 💎' : 'Salva · gratis'}</button></div>`;
  }
  function decoHtml() { // colori dell'insegna e del tappeto (alcuni si comprano con le gemme): stanno nel negozio delle gemme
    const m = M(), one = (kind, label) => `<b class="small">${label}</b><div class="look">${DECO[kind].map(d => {
      const key = 'deco:' + kind + ':' + d.id, own = !d.cost || st.has(key), on = m.deco[kind] === d.id;
      const sw = typeof d.col === 'number' ? '#' + d.col.toString(16).padStart(6, '0') : d.col;
      return `<button class="opt${on ? ' on' : ''}${own ? '' : ' lock'}" data-deco="${kind}:${d.id}" data-cost="${d.cost}"><span class="sw" style="background:${sw}"></span>${d.name}${own ? '' : `<i>💎${d.cost}</i>`}</button>`;
    }).join('')}</div>`;
    return one('sign', 'Colore dell\'insegna') + one('rug', 'Colore del tappeto');
  }
  function gameHtml() {
    const i = gameInfo(), adOk = !!(R.ads && R.ads.available && R.ads.available()), wt = i.adWait;
    const adTxt = !adOk ? '🎬 Con un video (solo nell\'app)' : i.adLeft <= 0 ? '🎬 Video finiti per oggi' : wt > 0 ? `🎬 Con un video fra ${Math.floor(wt / 60)}:${('0' + (wt % 60)).slice(-2)}` : `🎬 Guarda un video e gioca (${i.adLeft}/${GAME_AD_PER_DAY})`;
    return `<div class="small">Tocca le monete che cadono in 20 secondi: ogni ${GAME_PER_GEM} monete vinci 1 💎 (fino a ${GAME_MAX_GEMS}). Record: ${i.best}. Una partita gratis al giorno, poi fino a ${GAME_AD_PER_DAY} partite al giorno guardando un video (una ogni 5 minuti).</div>` +
      `<div class="row"><button class="btn" data-meta="game"${i.free ? '' : ' disabled'}>${i.free ? '🎯 Gioca gratis' : '🎯 Gratis: usata oggi'}</button></div>` +
      `<div class="row"><button class="btn ghost" data-meta="gameAd"${adOk && i.adLeft > 0 && wt <= 0 ? '' : ' disabled'}>${adTxt}</button></div>`;
  }
  const badge = () => dailyInfo().can || chestReady();

  R.meta = {
    bind: hud => { toast = m => hud.toast(m); },
    data: M, dailyInfo, claimDaily, eventNow, EVENTS, payMul, addPts, chestReady, chestInfo, openChest, see, albumCount, ALBUM, PERSONAS, vipPersona, vipServed,
    DECO, decoGet, decoSet, decoName, nameCost, lodgeName, prestige, addPrestige, minigame, gameInfo, useGame, badge, dailyHtml, chestHtml, albumHtml, decoHtml, decoNameHtml, gameHtml,
    onEv(name) { if (name === 'goal') addPts(2); else if (name === 'win') addPts(5); }
  };
})(window.Rifugio);
