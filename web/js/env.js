// Ambiente: ciclo giorno/notte (alba, giorno, tramonto, notte) e meteo (pioggia, temporale con fulmini, nebbia, bufera di neve).
// Cambia luci, colore del cielo e della nebbia, accende una luce che segue l'omino di notte, fa piovere e tuonare.
// Si può spegnere nel menu (Giorno e notte, Meteo). La partita non cambia: è solo atmosfera.
(function (R) {
  'use strict';
  const rnd = Math.random;

  R.createEnv = function (ctx) {
    const T = ctx.T, TH = ctx.TH, A = ctx.A, st = R.settings, Q = ctx.Q;
    const baseSky = new T.Color(TH.sky), nightSky = new T.Color(0x141c3a), duskSky = new T.Color(0xff9a6a), grey = new T.Color(0x9aa3ad), flashCol = new T.Color(0xe6eeff);
    const hemi = ctx.hemi, sun = ctx.sun, scene = ctx.scene;
    const hemiBase = hemi.intensity, hemiSky = hemi.color.clone(), hemiGnd = hemi.groundColor.clone(), sunBase = sun.intensity, sunCol = sun.color.clone();
    const nightHemi = new T.Color(0x7c92d8), nightGnd = new T.Color(0x232b4d), nightSun = new T.Color(0xa9bcff), duskSun = new T.Color(0xffa766);
    const fogN = scene.fog.near, fogF = scene.fog.far;
    const skyC = new T.Color(); // colore di lavoro riusato a ogni fotogramma (niente oggetti nuovi: meno lavoro per il telefono)
    const DAY_LEN = 420; // secondi per un giorno intero
    let t = 0.02, weather = 'clear', nextW = 45 + rnd() * 50, held = false;
    const amt = { rain: 0, storm: 0, fog: 0, snow: 0 };
    let flash = 0, lightT = 6 + rnd() * 6, thunderT = -1, audioT = 0, chipTxt = '', night = 0, windX = 0, fallMul = 1;

    // Meteo possibile per stagione (pesi).
    const TABLE = {
      inverno: [['clear', 0.45], ['snow', 0.32], ['fog', 0.23]],
      primavera: [['clear', 0.4], ['rain', 0.4], ['fog', 0.2]],
      estate: [['clear', 0.6], ['storm', 0.25], ['rain', 0.15]],
      autunno: [['clear', 0.35], ['rain', 0.35], ['fog', 0.3]]
    };
    const NAMES = { clear: '', rain: 'Comincia a piovere 🌧️', storm: 'Temporale in arrivo ⛈️', fog: 'Si alza la nebbia 🌫️', snow: 'Bufera di neve 🌨️' };
    function pick() {
      const tb = TABLE[ctx.level.season] || TABLE.estate; let r = rnd(), acc = 0;
      for (const [k, w] of tb) { acc += w; if (r <= acc) return k; }
      return 'clear';
    }
    function setWeather(k, silent) {
      if (k === weather) return;
      weather = k; if (!silent && NAMES[k]) ctx.hud.toast(NAMES[k]);
    }

    // Pioggia: tanti segmenti inclinati che cadono intorno all'omino.
    const NR = Math.round(520 * Math.max(0.5, Q.density));
    const rp = new Float32Array(NR * 6), rx = new Float32Array(NR * 3);
    for (let i = 0; i < NR; i++) { rx[i * 3] = (rnd() - 0.5) * 36; rx[i * 3 + 1] = rnd() * 16; rx[i * 3 + 2] = (rnd() - 0.5) * 36; }
    const rg = new T.BufferGeometry(); rg.setAttribute('position', new T.BufferAttribute(rp, 3));
    const rainMat = new T.LineBasicMaterial({ color: 0xb7cdee, transparent: true, opacity: 0, depthWrite: false });
    const rain = new T.LineSegments(rg, rainMat); rain.frustumCulled = false; rain.visible = false; scene.add(rain);
    // Luce che segue l'omino di notte, così si vede sempre.
    const lamp = new T.PointLight(0xffd9a0, 0, 7, 2); scene.add(lamp);

    function update(dt) {
      const p = ctx.player.position, on = st.get('weather'), dn = st.get('daynight');
      // --- ora del giorno ---
      if (dn && !held) t = (t + dt / DAY_LEN) % 1;
      const c = Math.cos(t * Math.PI * 2);
      const day = dn ? Math.min(1, Math.max(0, (c + 0.25) / 0.9)) : 1;
      const dusk = Math.pow(Math.max(0, 1 - Math.abs(day - 0.5) * 2), 1.5);
      night += ((1 - day) - night) * Math.min(1, dt * 2);
      // --- meteo ---
      if (!on) setWeather('clear', true);
      else if (!held) { nextW -= dt; if (nextW <= 0) { setWeather(pick()); nextW = 50 + rnd() * 70; } }
      const k = Math.min(1, dt * 0.6);
      amt.rain += ((weather === 'rain' ? 1 : weather === 'storm' ? 1.5 : 0) - amt.rain) * k;
      amt.storm += ((weather === 'storm' ? 1 : 0) - amt.storm) * k;
      amt.fog += ((weather === 'fog' ? 1 : weather === 'snow' ? 0.55 : weather === 'rain' ? 0.25 : weather === 'storm' ? 0.3 : 0) - amt.fog) * k;
      amt.snow += ((weather === 'snow' ? 1 : 0) - amt.snow) * k;
      const wet = Math.min(1, amt.rain * 0.7 + amt.fog * 0.3 + amt.snow * 0.4);
      windX += ((weather === 'snow' ? 5 : weather === 'storm' ? 3 : weather === 'rain' ? 1.2 : 0.2) - windX) * k;
      fallMul += ((weather === 'snow' ? 2.3 : 1) - fallMul) * k;
      // --- fulmini ---
      if (weather === 'storm') {
        lightT -= dt;
        if (lightT <= 0) { flash = 1; lightT = 5 + rnd() * 9; thunderT = 0.35 + rnd() * 1.1; }
      }
      if (thunderT > 0) { thunderT -= dt; if (thunderT <= 0) { A.sfx('thunder'); if (A.haptic) A.haptic(70); } }
      if (flash > 0) flash = Math.max(0, flash - dt * (flash > 0.55 ? 5 : 3));
      // --- colori e luci ---
      const sky = skyC.copy(baseSky).lerp(grey, Math.min(0.75, amt.rain * 0.4 + amt.fog * 0.45 + amt.snow * 0.3)).lerp(nightSky, night).lerp(duskSky, dusk * 0.3 * (1 - wet)).lerp(flashCol, flash * 0.6);
      scene.background.copy(sky); scene.fog.color.copy(sky);
      const fogK = 1 - Math.min(0.7, amt.fog * 0.55 + amt.rain * 0.18);
      scene.fog.near = fogN * fogK * (1 - 0.3 * night); scene.fog.far = fogF * fogK * (1 - 0.25 * night);
      hemi.intensity = hemiBase * (0.42 + 0.58 * (1 - night)) * (1 - 0.22 * wet) + flash * 1.4;
      hemi.color.copy(hemiSky).lerp(nightHemi, night * 0.8); hemi.groundColor.copy(hemiGnd).lerp(nightGnd, night * 0.8);
      sun.intensity = sunBase * (1 - night) * (1 - 0.5 * wet) + 0.04 + flash * 0.6;
      sun.color.copy(sunCol).lerp(duskSun, dusk * 0.7).lerp(nightSun, night);
      ctx.mats.ground.color.setScalar(1 - 0.13 * wet);
      lamp.position.set(p.x, 2.2, p.z); lamp.intensity = night * 0.32 + amt.storm * 0.05; // luce piccola attorno all'omino
      ctx.nightK = night;
      // --- pioggia ---
      const ra = Math.min(1, amt.rain);
      rain.visible = ra > 0.03; rainMat.opacity = 0.5 * ra;
      if (rain.visible) {
        const sp = (14 + amt.storm * 6) * dt, wx = windX * 0.06;
        for (let i = 0; i < NR; i++) {
          let x = rx[i * 3], y = rx[i * 3 + 1] - sp, z = rx[i * 3 + 2];
          if (y < 0) { x = (rnd() - 0.5) * 36; z = (rnd() - 0.5) * 36; y = 14 + rnd() * 4; }
          rx[i * 3] = x; rx[i * 3 + 1] = y; rx[i * 3 + 2] = z;
          rp[i * 6] = p.x + x; rp[i * 6 + 1] = y; rp[i * 6 + 2] = p.z + z; rp[i * 6 + 3] = p.x + x + wx; rp[i * 6 + 4] = y + 0.75; rp[i * 6 + 5] = p.z + z;
        }
        rg.attributes.position.needsUpdate = true;
      }
      // --- suoni d'ambiente e icona nel pannello ---
      audioT -= dt;
      if (audioT <= 0) {
        audioT = 0.4;
        if (A.ambient) A.ambient({ season: ctx.level.season, rain: ra, storm: Math.min(1, amt.storm), night, wind: Math.min(1, windX / 5) });
        const w = weather === 'rain' ? '🌧️' : weather === 'storm' ? '⛈️' : weather === 'fog' ? '🌫️' : weather === 'snow' ? '🌨️' : '', n = night > 0.6 ? '🌙' : dusk > 0.35 ? '🌇' : '';
        const txt = (n + ' ' + w).trim();
        if (txt !== chipTxt) { chipTxt = txt; ctx.hud.setEnv(txt); }
      }
    }
    return {
      update,
      get night() { return night; }, get windX() { return windX; }, get fallMul() { return fallMul; },
      // Strumenti di prova: forza un meteo (e lo tiene) o l'ora del giorno.
      setWeather(k) { held = k !== 'auto'; if (k === 'auto') { nextW = 5; return; } setWeather(k); },
      setTime(name) { t = { giorno: 0.02, tramonto: 0.22, notte: 0.5, alba: 0.78 }[name] || 0.02; held = true; },
      release() { held = false; },
      info() { return { weather, t: +t.toFixed(2), night: +night.toFixed(2) }; }
    };
  };
})(window.Rifugio);
