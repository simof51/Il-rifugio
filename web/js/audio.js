// Suoni e musica creati al volo con Web Audio (nessun file audio: niente da scaricare, niente diritti d'autore).
// Le impostazioni (effetti sì/no, musica sì/no, volumi) restano salvate sul dispositivo.
(function (R) {
  'use strict';
  const KEY = 'rifugio-audio';
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  // Due brani brevi che si ripetono: calmo e a carillon d'inverno, vivace d'estate. Gli accordi sono note MIDI.
  const SONGS = {
    inverno: { bpm: 84, wave: 'sine', prog: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], scale: [69, 72, 74, 76, 79, 81] },
    estate: { bpm: 112, wave: 'triangle', prog: [[48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60]], scale: [72, 74, 76, 79, 81, 84] },
    primavera: { bpm: 100, wave: 'sine', prog: [[53, 57, 60], [48, 52, 55], [50, 53, 57], [55, 59, 62]], scale: [72, 74, 77, 79, 81, 84] },
    autunno: { bpm: 76, wave: 'triangle', prog: [[57, 60, 64], [50, 53, 57], [52, 56, 59], [57, 60, 64]], scale: [69, 72, 74, 76, 81, 84] }
  };

  R.createAudio = function () {
    const st = Object.assign({ sfx: true, music: true, sfxVol: 0.8, musVol: 0.5 }, (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } })());
    let ctx = null, sfxG = null, musG = null, timer = null, song = null, step = 0, nextT = 0, noiseBuf = null;
    const lastPlay = {};

    function ensure() {
      if (ctx) return ctx;
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      sfxG = ctx.createGain(); musG = ctx.createGain(); sfxG.connect(ctx.destination); musG.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      apply();
      return ctx;
    }
    function apply() {
      if (!ctx) return;
      sfxG.gain.value = st.sfx ? st.sfxVol : 0;
      musG.gain.value = st.music ? st.musVol * 0.45 : 0;
    }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignorato */ } }

    function tone(f, dur, type, vol, when, to, dest) {
      const t = when || ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(dest || sfxG); o.start(t); o.stop(t + dur + 0.05);
    }
    function noise(dur, vol, freq, type, when) {
      const t = when || ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noiseBuf; f.type = type || 'lowpass'; f.frequency.value = freq;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(sfxG); s.start(t); s.stop(t + dur + 0.05);
    }

    const FX = {
      chop() { noise(0.07, 0.5, 1100); tone(150, 0.1, 'triangle', 0.5, 0, 60); },
      log() { noise(0.16, 0.3, 2600, 'bandpass'); tone(520, 0.12, 'sine', 0.18, 0, 260); },
      coin() { tone(988, 0.08, 'square', 0.12); tone(1319, 0.16, 'square', 0.12, ctx.currentTime + 0.07); },
      cup() { tone(1568, 0.07, 'triangle', 0.25); tone(2093, 0.1, 'triangle', 0.18, ctx.currentTime + 0.05); },
      pickup() { tone(700, 0.08, 'sine', 0.25, 0, 1000); },
      guest() { tone(660, 0.1, 'triangle', 0.3); tone(880, 0.16, 'triangle', 0.3, ctx.currentTime + 0.09); },
      cold() { tone(330, 0.35, 'sawtooth', 0.12, 0, 190); },
      tree() { noise(0.5, 0.45, 500); tone(95, 0.4, 'sine', 0.5, 0, 45); },
      buy() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.3, ctx.currentTime + i * 0.07)); },
      goal() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'square', 0.14, ctx.currentTime + i * 0.09)); },
      saw() { tone(110, 0.14, 'sawtooth', 0.22, 0, 95); noise(0.13, 0.35, 3200, 'bandpass'); },
      thunder() { noise(1.6, 0.9, 260); tone(70, 1.2, 'sine', 0.6, 0, 35); },
      bark() { tone(260, 0.09, 'square', 0.16, 0, 160); tone(250, 0.1, 'square', 0.16, ctx.currentTime + 0.14, 150); },
      meow() { tone(620, 0.28, 'triangle', 0.18, 0, 880); tone(880, 0.22, 'triangle', 0.12, ctx.currentTime + 0.2, 520); },
      click() { tone(620, 0.05, 'sine', 0.25); }
    };
    const GAP = { chop: 0.05, saw: 0.1, log: 0.05, coin: 0.04, cup: 0.08, pickup: 0.08, tree: 0.2, bark: 0.5, meow: 0.5 };
    const HAPTIC = { goal: 45, buy: 30, coin: 8, tree: 25, thunder: 80, guest: 12 }; // millisecondi di vibrazione
    const settings = () => (R.settings ? R.settings.data : { haptics: true, ambient: true, ambVol: 0.5 });
    function haptic(ms) { try { if (settings().haptics && navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignorato */ } }

    // Suoni d'ambiente: vento, pioggia, onde del lago, uccellini di giorno, grilli di notte. Si regolano dal meteo e dall'ora.
    let amb = null, birdT = null, ambOpt = { season: 'inverno', rain: 0, storm: 0, night: 0, wind: 0 };
    function ensureAmbient() {
      if (amb || !ctx) return;
      const mk = (type, freq, q) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q; const g = ctx.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); s.start(); return g; };
      const master = ctx.createGain(); master.connect(ctx.destination);
      const wind = mk('bandpass', 420, 0.7), rain = mk('bandpass', 850, 0.3), waves = mk('lowpass', 520); // pioggia: rumore morbido, senza le frequenze acute che pungono
      [wind, rain, waves].forEach(g => g.connect(master));
      // Grilli: un tono acuto che pulsa. Il livello finale (lev) sta DOPO la pulsazione: a zero il tono è davvero muto
      // (prima la pulsazione si sommava al volume e il tono acuto si sentiva sempre, come un fischio).
      const cr = ctx.createOscillator(), cg = ctx.createGain(), lev = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      cr.frequency.value = 4300; cg.gain.value = 0.5; lfo.frequency.value = 13; lg.gain.value = 0.5; lev.gain.value = 0;
      lfo.connect(lg); lg.connect(cg.gain); cr.connect(cg); cg.connect(lev); lev.connect(master); cr.start(); lfo.start();
      amb = { master, wind, rain, waves, crick: lev };
      birdT = setInterval(() => {
        if (!ctx || ctx.state !== 'running' || !st.sfx || ambOpt.night > 0.5 || ambOpt.rain > 0.3 || (ambOpt.season !== 'primavera' && ambOpt.season !== 'estate' && ambOpt.season !== 'autunno')) return;
        if (Math.random() > 0.55) return;
        const t0 = ctx.currentTime, f = 2400 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) tone(f + i * 120, 0.07, 'sine', 0.07, t0 + i * 0.1, f * 1.25, amb.master);
      }, 2600);
    }
    function applyAmbient() {
      if (!amb) return;
      const v = st.sfx ? st.sfxVol * 0.6 : 0, o = ambOpt, // i suoni d'ambiente seguono l'interruttore e il volume dei "Suoni"
        t = ctx.currentTime, set = (g, x) => g.gain.setTargetAtTime(x, t, 0.8);
      amb.master.gain.setTargetAtTime(v, t, 0.3);
      const cold = o.season === 'inverno';
      set(amb.wind, (cold ? 0.35 : 0.15) + o.wind * 0.4 + o.storm * 0.25);
      set(amb.rain, Math.min(1, o.rain) * 0.07 + o.storm * 0.03);
      set(amb.waves, (o.season === 'estate' || o.season === 'primavera') ? 0.12 : 0.02);
      set(amb.crick, (cold || o.rain > 0.3 || o.night < 0.5) ? 0 : (o.night - 0.5) * 0.06); // solo di notte fonda, molto piano
    }

    // Musica: arpeggio a ottavi sull'accordo di turno, basso sul primo e terzo quarto, ogni tanto una nota di melodia.
    // Ogni città ha il suo modo di suonare: Valle = carillon, Mulini = valzer da organetto, Porto = ritmo di mare con spazzole.
    const CITY_STYLE = { valle: { shift: 0, mul: 1 }, mulini: { shift: 3, mul: 1.18, bar: 6, wave: 'triangle' }, porto: { shift: -2, mul: 1.06, wave: 'sine', sync: true } };
    function playStep(s, n, t) {
      const c = s.city || CITY_STYLE.valle, k = c.shift, w = c.wave || s.wave;
      if (c.bar === 6) { // valzer: basso sul primo tempo, accordo sugli altri due
        const bar6 = Math.floor(n / 6) % s.prog.length, j = n % 6, ch6 = s.prog[bar6];
        if (j === 0) tone(mtof(ch6[0] - 12 + k), 0.6, 'sine', 0.75, t, 0, musG);
        if (j === 2 || j === 4) ch6.forEach(m => tone(mtof(m + k), 0.28, 'square', 0.07, t, 0, musG));
        if (j % 2 === 0 && Math.random() < 0.65) tone(mtof(s.scale[(bar6 * 2 + j / 2) % s.scale.length] + k), 0.5, w, 0.38, t, 0, musG);
        return;
      }
      if (c.sync) {
        const bar8 = Math.floor(n / 8) % s.prog.length, j = n % 8, ch8 = s.prog[bar8];
        if (j === 0 || j === 3 || j === 6) tone(mtof(ch8[j === 3 ? 2 : 0] - 12 + k), 0.45, 'sine', 0.75, t, 0, musG);
        if (j === 2 || j === 5 || j === 7) ch8.forEach(m => tone(mtof(m + 12 + k), 0.2, 'triangle', 0.14, t, 0, musG));
        if (j % 2 === 1) noise(0.05, 0.06 * st.musVol, 5000, 'highpass', t);
        if ((j === 0 || j === 4) && Math.random() < 0.7) tone(mtof(s.scale[Math.floor(Math.random() * s.scale.length)] + k), 0.7, w, 0.34, t, 0, musG);
        return;
      }
      const bar = Math.floor(n / 8) % s.prog.length, i = n % 8, ch = s.prog[bar];
      tone(mtof(ch[[0, 1, 2, 1, 2, 1, 2, 1][i]] + 12), 0.5, s.wave, 0.5, t, 0, musG);
      if (i === 0 || i === 4) tone(mtof(ch[0] - 12), 0.7, 'sine', 0.7, t, 0, musG);
      if (i === 0) tone(mtof(ch[2]), 1.6, 'sine', 0.25, t, 0, musG); // nota lunga di sottofondo
      if ((i === 2 || i === 6) && Math.random() < 0.55) tone(mtof(s.scale[Math.floor(Math.random() * s.scale.length)]), 0.45, s.wave, 0.35, t, 0, musG);
    }
    function tick() {
      if (!ctx || !song || !st.music || ctx.state !== 'running') return;
      const e = 60 / song.bpm / 2;
      if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
      while (nextT < ctx.currentTime + 0.6) { playStep(song, step, nextT); nextT += e; step++; }
    }
    function startTimer() { if (!timer) timer = setInterval(tick, 160); }

    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend(); else ctx.resume();
    });

    return {
      state: st,
      // Va chiamato da un tocco dell'utente (il browser non permette l'audio prima).
      unlock() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); startTimer(); },
      sfx(name) {
        if (!st.sfx || !ctx || ctx.state !== 'running' || !FX[name]) return;
        const now = ctx.currentTime;
        if (GAP[name] && lastPlay[name] && now - lastPlay[name] < GAP[name]) return;
        lastPlay[name] = now; FX[name]();
        if (HAPTIC[name]) haptic(HAPTIC[name]);
      },
      haptic,
      // Chiamata dall'ambiente (meteo e ora): aggiorna i suoni d'ambiente.
      ambient(o) { if (!ctx || ctx.state !== 'running') return; Object.assign(ambOpt, o); ensureAmbient(); applyAmbient(); },
      refresh() { applyAmbient(); },
      playMusic(id, city) { const base = SONGS[id] || SONGS.inverno, c = CITY_STYLE[city] || CITY_STYLE.valle; song = Object.assign({}, base, { bpm: base.bpm * c.mul, city: c }); step = 0; nextT = 0; startTimer(); },
      set(key, value) { st[key] = value; save(); apply(); if (key === 'sfx' || key === 'sfxVol') applyAmbient(); }
    };
  };
})(window.Rifugio);
