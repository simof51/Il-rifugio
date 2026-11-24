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
      click() { tone(620, 0.05, 'sine', 0.25); }
    };
    const GAP = { chop: 0.05, saw: 0.1, log: 0.05, coin: 0.04, cup: 0.08, pickup: 0.08, tree: 0.2 };

    // Musica: arpeggio a ottavi sull'accordo di turno, basso sul primo e terzo quarto, ogni tanto una nota di melodia.
    function playStep(s, n, t) {
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
      },
      playMusic(id) { song = SONGS[id] || SONGS.inverno; step = 0; nextT = 0; startTimer(); },
      set(key, value) { st[key] = value; save(); apply(); }
    };
  };
})(window.Rifugio);
