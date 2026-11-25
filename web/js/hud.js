// Interfaccia HTML sopra la scena: indicatori, obiettivo, joystick, avvisi, finestre ed etichette 3D.
(function (R) {
  'use strict';
  const $ = id => document.getElementById(id);

  R.createHud = function () {
    const labelsEl = $('labels');
    const V = new THREE.Vector3();
    let cam = null, toastT = 0;
    const floats = [];

    function label(cls, html) { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; labelsEl.appendChild(d); return d; }

    // Posiziona un'etichetta sopra un punto 3D (ancorata in basso al centro).
    // Si tocca il DOM solo quando qualcosa cambia: scrivere ogni fotogramma gli stessi valori rallenta il telefono.
    function hide(el) { if (el._hid !== true) { el._hid = true; el.style.display = 'none'; } }
    function put(el, x, y, z, show) {
      if (!show || !cam) { hide(el); return; }
      V.set(x, y, z).project(cam);
      if (V.z > 1 || Math.abs(V.x) > 1.2 || Math.abs(V.y) > 1.2) { hide(el); return; }
      if (el._hid !== false) { el._hid = false; el.style.display = ''; }
      const tr = `translate(${((V.x + 1) / 2 * innerWidth).toFixed(0)}px,${((1 - V.y) / 2 * innerHeight).toFixed(0)}px) translate(-50%,-100%)`;
      if (el._tr !== tr) { el._tr = tr; el.style.transform = tr; }
    }
    function setText(el, v, pop) {
      v = String(v);
      if (el._t === v) return;
      const first = el._t === undefined; el._t = v; el.textContent = v;
      if (pop && !first) { const c = el.parentElement; c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); } // rimbalzo dell'indicatore
    }

    function toast(msg) {
      const el = $('toast'); el.textContent = msg; el.classList.add('on');
      clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2400);
    }

    function floatText(txt, x, y, z) { floats.push({ el: label('float', txt), x, y, z, t: 0 }); }
    function updateFloats(dt) {
      for (let i = floats.length - 1; i >= 0; i--) {
        const f = floats[i]; f.t += dt; put(f.el, f.x, f.y + f.t * 1.2, f.z, true); f.el.style.opacity = 1 - f.t;
        if (f.t > 1) { f.el.remove(); floats.splice(i, 1); }
      }
    }

    // Indicatori in alto: monete, stelle, legna nello zaino e (dopo l'apertura del banco) cioccolate.
    const E = { coinN: $('coinN'), starN: $('starN'), carryN: $('carryN'), cupChip: $('cupChip'), cupN: $('cupN'), taskN: $('taskN'), taskTxt: $('taskTxt'), taskV: $('taskV'), taskBar: $('taskBar') };
    function setStats(coins, stars, logs, logCap, cups, cupCap, showCups) {
      setText(E.coinN, coins, true); setText(E.starN, stars.toFixed(1), true); setText(E.carryN, `${logs}/${logCap}`, true);
      if (E.cupChip.hidden === showCups) E.cupChip.hidden = !showCups;
      setText(E.cupN, `${cups}/${cupCap}`, true);
    }
    function setTask(head, text, valueTxt, ratio) {
      setText(E.taskN, head); setText(E.taskTxt, text); setText(E.taskV, valueTxt);
      const w = (Math.max(0, Math.min(1, ratio)) * 100).toFixed(1) + '%';
      if (E.taskBar._w !== w) { E.taskBar._w = w; E.taskBar.style.width = w; }
    }

    // Gemme (si usano per cambiare l'aspetto dell'omino): sempre visibili in alto.
    const gemN = $('gemN');
    function setGems(n) { setText(gemN, n, true); }
    // Icone di ora e meteo (🌙 🌧️ …) accanto agli indicatori.
    const envChip = $('envChip'), envN = $('envN');
    function setEnv(txt) { envChip.hidden = !txt; envN.textContent = txt; }
    // Suggerimenti del tutorial: un fumetto in basso con un tasto per saltare.
    const hintEl = $('hint'), hintTxt = $('hintTxt');
    function hint(txt) { if (!txt) { hintEl.hidden = true; return; } if (hintTxt.textContent !== txt) hintTxt.textContent = txt; hintEl.hidden = false; }
    $('hintSkip').onclick = () => { hintEl.hidden = true; if (hud_skip) hud_skip(); };
    let hud_skip = null;

    const stick = $('stick'), knob = $('knob');
    function showStick(x, y) { stick.style.display = 'block'; stick.style.left = x + 'px'; stick.style.top = y + 'px'; knob.style.transform = 'translate(-50%,-50%)'; }
    function moveKnob(dx, dy) { knob.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`; }
    function hideStick() { stick.style.display = 'none'; }

    return {
      label, put, toast, floatText, updateFloats, setStats, setTask, showStick, moveKnob, hideStick, setEnv, setGems, hint,
      onHintSkip(fn) { hud_skip = fn; },
      setCamera(c) { cam = c; },
      hideIntro() { $('intro').classList.add('hidden'); },
      showWin(title, text, next, nextId) {
        $('winTitle').textContent = title; $('winTxt').textContent = text; $('winNext').textContent = next;
        $('nextLevel').hidden = !nextId; if (nextId) $('nextLevel').dataset.level = nextId;
        $('win').classList.remove('hidden');
      },
      hideWin() { $('win').classList.add('hidden'); }
    };
  };
})(window.Rifugio);
