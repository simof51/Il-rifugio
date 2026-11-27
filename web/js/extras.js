// Extra: missioni giornaliere e medaglie, effetti delle stagioni e foto ricordo.
// Il gioco manda qui gli eventi (R.extras.ev('guest'), 'cup', 'wood'…); i dati stanno nelle impostazioni (sul dispositivo).
(function (R) {
  'use strict';
  const st = R.settings;
  let toast = () => {};

  // --- missioni: 3 al giorno, scelte in base alla data (le stesse per tutta la giornata) ---
  const MISSIONS = [
    { id: 'guest', ev: 'guest', n: [6, 10], text: n => `Accogli ${n} ospiti` },
    { id: 'cup', ev: 'cup', n: [5, 8], text: n => `Servi ${n} ordinazioni in mensa` },
    { id: 'wood', ev: 'wood', n: [20, 35], text: n => `Raccogli ${n} pezzi nel campo` },
    { id: 'log', ev: 'log', n: [15, 25], text: n => `Consegna ${n} pezzi raccolti` },
    { id: 'goal', ev: 'goal', n: [1, 2], text: n => `Completa ${n} obiettivo${n > 1 ? 'i' : ''}` },
    { id: 'vip', ev: 'vip', n: [1, 1], text: () => 'Servi un ospite VIP' },
    { id: 'rush', ev: 'rush', n: [1, 1], text: () => 'Fai un servizio lampo' },
    { id: 'req', ev: 'req', n: [2, 3], text: n => `Esaudisci ${n} richieste` },
    { id: 'city', ev: 'city', n: [3, 5], text: n => `Usa ${n} volte l'attività della città` }
  ];
  // --- missioni della settimana: 3, scelte in base alla settimana, con premi più grandi ---
  const WEEKLY = [
    { id: 'w_guest', ev: 'guest', n: 80, text: n => `Accogli ${n} ospiti in settimana` },
    { id: 'w_cup', ev: 'cup', n: 50, text: n => `Servi ${n} ordinazioni in settimana` },
    { id: 'w_wood', ev: 'wood', n: 300, text: n => `Raccogli ${n} pezzi in settimana` },
    { id: 'w_req', ev: 'req', n: 10, text: n => `Esaudisci ${n} richieste in settimana` },
    { id: 'w_goal', ev: 'goal', n: 15, text: n => `Completa ${n} obiettivi in settimana` },
    { id: 'w_city', ev: 'city', n: 20, text: n => `Usa ${n} volte l'attività della città` }
  ];
  const WEEK_GEMS = 6, MEDAL_GEMS = 2;
  const weekKey = () => 'w' + Math.floor((Date.now() / 864e5 + 3) / 7); // settimane che iniziano di lunedì
  function weeklies() {
    const week = weekKey();
    let w = st.get('weekly');
    if (!w || w.week !== week || !Array.isArray(w.list)) {
      const pool = WEEKLY.slice(), list = []; let seed = hash(week);
      for (let k = 0; k < 3; k++) { const m = pool.splice(seed % pool.length, 1)[0]; seed = Math.imul(seed, 1103515245) + 12345 >>> 0; list.push({ id: m.id, n: m.n, p: 0, done: false }); }
      w = { week, list }; st.set('weekly', w);
    }
    return w;
  }
  const MEDALS = [
    { id: 'm1', e: '👣', name: 'Primo passo', stat: 'guest', n: 1, desc: n => `Accogli ${n} ospite` },
    { id: 'm2', e: '🏨', name: 'Albergatore', stat: 'guest', n: 50, desc: n => `Accogli ${n} ospiti` },
    { id: 'm3', e: '🎩', name: 'Maestro di sala', stat: 'guest', n: 250, desc: n => `Accogli ${n} ospiti` },
    { id: 'm4', e: '🪓', name: 'Boscaiolo', stat: 'wood', n: 100, desc: n => `Taglia ${n} pezzi di legna` },
    { id: 'm5', e: '🌲', name: 'Re del bosco', stat: 'wood', n: 1000, desc: n => `Taglia ${n} pezzi di legna` },
    { id: 'm6', e: '☕', name: 'Barista', stat: 'cup', n: 50, desc: n => `Servi ${n} bevande` },
    { id: 'm7', e: '🔨', name: 'Costruttore', stat: 'goal', n: 25, desc: n => `Completa ${n} obiettivi` },
    { id: 'm8', e: '🏆', name: 'Stagione vinta', stat: 'win', n: 1, desc: n => `Completa ${n} stagione` },
    { id: 'm9', e: '🗓️', name: 'Giro dell\'anno', stat: 'win', n: 4, desc: n => `Completa ${n} stagioni` },
    { id: 'm10', e: '💚', name: 'Affezionato', stat: 'days', n: 5, desc: n => `Gioca in ${n} giorni diversi` },
    { id: 'm11', e: '⭐', name: 'Amico dei VIP', stat: 'vip', n: 5, desc: n => `Servi ${n} ospiti VIP` },
    { id: 'm12', e: '⚡', name: 'Fulmine', stat: 'rush', n: 5, desc: n => `Fai ${n} servizi lampo` },
    { id: 'm13', e: '📮', name: 'Tuttofare', stat: 'req', n: 25, desc: n => `Esaudisci ${n} richieste` },
    { id: 'm14', e: '🔧', name: 'Riparatore', stat: 'fix', n: 5, desc: n => `Supera ${n} imprevisti` },
    { id: 'm15', e: '🏘️', name: 'Cittadino', stat: 'city', n: 50, desc: n => `Usa ${n} volte l'attività della città` }
  ];
  const dayKey = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function dailies() {
    const day = dayKey();
    let d = st.get('daily');
    if (!d || d.day !== day || !Array.isArray(d.list)) {
      let seed = hash(day); const pool = MISSIONS.slice(), list = [];
      for (let k = 0; k < 3; k++) {
        const i = seed % pool.length; seed = Math.imul(seed, 1103515245) + 12345 >>> 0;
        const m = pool.splice(i, 1)[0], lo = m.n[0], hi = m.n[1], n = lo + (seed % (hi - lo + 1));
        seed = Math.imul(seed, 1103515245) + 12345 >>> 0;
        list.push({ id: m.id, n, p: 0, done: false });
      }
      d = { day, list, bonus: false }; st.set('daily', d);
      const s = st.get('stats') || {}; const days = s.days || {}; days[day] = 1; s.days = days; st.set('stats', s);
    }
    return d;
  }
  const statVal = (s, k) => k === 'days' ? Object.keys(s.days || {}).length : (s[k] || 0);

  function ev(name, n) {
    n = n || 1;
    const s = st.get('stats') || {}; s[name] = (s[name] || 0) + n; st.set('stats', s);
    const d = dailies(); let changed = false;
    d.list.forEach(m => {
      const def = MISSIONS.find(x => x.id === m.id);
      if (m.done || !def || def.ev !== name) return;
      m.p = Math.min(m.n, m.p + n); changed = true;
      if (m.p >= m.n) { m.done = true; st.addGems(3); toast('Missione completata! +3 gemme 💎'); }
    });
    if (!d.bonus && d.list.every(m => m.done)) { d.bonus = true; st.addGems(5); toast('Tutte le missioni di oggi! +5 gemme 💎'); changed = true; }
    if (changed) st.set('daily', d);
    const w = weeklies(); let wc = false;
    w.list.forEach(m => {
      const def = WEEKLY.find(x => x.id === m.id);
      if (m.done || !def || def.ev !== name) return;
      m.p = Math.min(m.n, m.p + n); wc = true;
      if (m.p >= m.n) { m.done = true; st.addGems(WEEK_GEMS); toast('Missione della settimana! +6 gemme 💎'); }
    });
    if (wc) st.set('weekly', w);
    const got = st.get('medals') || {}; let newM = null;
    MEDALS.forEach(m => { if (!got[m.id] && statVal(s, m.stat) >= m.n) { got[m.id] = 1; newM = m; } });
    if (newM) { st.set('medals', got); toast(`${newM.e} Nuova medaglia: ${newM.name}`); }
  }

  // Premio di una medaglia: si ritira con un tocco, una volta sola. Restituisce le gemme date (0 se non si può).
  function claimMedal(id) {
    const got = st.get('medals') || {};
    if (got[id] !== 1) return 0;
    got[id] = 2; st.set('medals', got); st.addGems(MEDAL_GEMS); return MEDAL_GEMS;
  }
  const bar = (p, n) => `<div class="mbar"><i style="width:${Math.round(Math.min(1, p / n) * 100)}%"></i></div>`;
  const mrow = (m, def) => `<div class="mrow col${m.done ? ' ok' : ''}"><div><span>${def.text(m.n)}</span><b>${m.done ? 'Fatto ✅' : m.p + '/' + m.n}</b></div>${bar(m.p, m.n)}</div>`;

  function missionsHtml() {
    const d = dailies(), s = st.get('stats') || {}, got = st.get('medals') || {};
    const nd = d.list.filter(m => m.done).length, ng = MEDALS.filter(m => got[m.id]).length;
    const rows = d.list.map(m => mrow(m, MISSIONS.find(x => x.id === m.id))).join('');
    const wrows = weeklies().list.map(m => mrow(m, WEEKLY.find(x => x.id === m.id))).join('');
    const meds = MEDALS.map(m => `<div class="medal${got[m.id] ? ' ok' : ''}" title="${m.desc(m.n)}"><i>${got[m.id] ? m.e : '🔒'}</i><b>${m.name}</b><span>${m.desc(m.n)}${got[m.id] ? '' : ` (${Math.min(statVal(s, m.stat), m.n)}/${m.n})`}</span>${got[m.id] === 1 ? `<button class="mini" data-meta="medal:${m.id}">💎 ${MEDAL_GEMS}</button>` : ''}</div>`).join('');
    return `<b class="small">Missioni di oggi (${nd}/3)</b><div class="small">💎3 l'una · +💎5 se le fai tutte</div>${rows}` +
      `<b class="small">Missioni della settimana · 💎${WEEK_GEMS} l'una</b>${wrows}` +
      `<b class="small">Medaglie (${ng}/${MEDALS.length})</b><div class="medals">${meds}</div>`;
  }

  // --- stagioni: ognuna cambia un po' il modo di giocare (si applica una volta alla partenza) ---
  const SEASON_NOTE = {
    inverno: '❄️ Inverno: il fuoco si consuma più in fretta (+20%).',
    primavera: '🌸 Primavera: gli alberi ricrescono più in fretta (−30%).',
    estate: '☀️ Estate: le bevande rendono di più (mancia +50%).',
    autunno: '🍂 Autunno: il bosco dà più legna (+1 per albero).'
  };
  function applySeason(P, level) {
    if (!P || P._season) return '';
    P._season = true;
    const s = level && level.season;
    if (s === 'inverno') { P.burn_busy *= 0.8; P.burn_idle *= 0.8; }
    else if (s === 'primavera') P.tree_regrow *= 0.7;
    else if (s === 'estate') P.tip *= 1.5;
    else if (s === 'autunno') P.logs_per_tree += 1;
    return SEASON_NOTE[s] || '';
  }

  // --- foto ricordo: la scena con una cornice e il nome del posto ---
  function photo(src, caption) {
    const w = src.width, h = src.height, pad = Math.round(w * 0.02), foot = Math.round(h * 0.09);
    const c = document.createElement('canvas'); c.width = w + pad * 2; c.height = h + pad * 2 + foot;
    const g = c.getContext('2d');
    g.fillStyle = '#fffaf0'; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(src, pad, pad, w, h);
    g.strokeStyle = '#d94f3d'; g.lineWidth = Math.max(3, pad / 3); g.strokeRect(pad, pad, w, h);
    g.fillStyle = '#1f2a37'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 ${Math.round(foot * 0.42)}px Fredoka, system-ui, sans-serif`; g.fillText('Il Rifugio', c.width / 2, pad + h + foot * 0.36);
    g.fillStyle = '#5b6b7c'; g.font = `500 ${Math.round(foot * 0.28)}px Fredoka, system-ui, sans-serif`; g.fillText(caption, c.width / 2, pad + h + foot * 0.74);
    return c;
  }
  function sharePhoto(canvas) {
    return new Promise(res => canvas.toBlob(blob => {
      if (!blob) { res('fail'); return; }
      const file = (typeof File === 'function') ? new File([blob], 'il-rifugio.png', { type: 'image/png' }) : null;
      try {
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: 'Il Rifugio' }).then(() => res('shared')).catch(e => res(e && e.name === 'AbortError' ? 'cancel' : 'fail')); return; }
      } catch (e) { /* si scarica */ }
      try { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'il-rifugio.png'; document.body.appendChild(a); a.click(); a.remove(); res('saved'); } catch (e) { res('fail'); }
    }, 'image/png'));
  }

  R.extras = { ev, missionsHtml, weeklies, claimMedal, WEEKLY, applySeason, photo, sharePhoto, MISSIONS, MEDALS, dailies, bind: hud => { toast = m => hud.toast(m); }, hash };
})(window.Rifugio);
