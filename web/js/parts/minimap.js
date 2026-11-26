// Mini mappa (parte di game.js): omino, stanze, banchi, reception e cose da fare. Si spegne dalle Impostazioni.
(function (R) {
  'use strict';
  (R.parts = R.parts || {}).minimap = function (G) {
    const { P, player, rooms, guests } = G;
    const cv = document.createElement('canvas'); cv.id = 'minimap'; cv.width = 220; cv.height = 168; document.body.appendChild(cv);
    const g = cv.getContext('2d');
    // si mostra la parte del mondo dove si gioca
    const X0 = -22, X1 = 22, Z0 = Math.max(-12, P.world_min[1]), Z1 = 21;
    const px = x => Math.max(6, Math.min(214, (x - X0) / (X1 - X0) * 220)), pz = z => Math.max(6, Math.min(162, (z - Z0) / (Z1 - Z0) * 168));
    const dot = (x, z, col, r) => { g.fillStyle = col; g.beginPath(); g.arc(px(x), pz(z), r, 0, 7); g.fill(); };
    let t = 0, blink = false;
    return function (dt) {
      const on = R.settings.get('minimap') !== false;
      if (cv.hidden !== !on) cv.hidden = !on;
      t -= dt; if (!on || t > 0) return;
      t = 0.25; blink = !blink;
      const task = document.getElementById('task'); if (task) { const y = Math.ceil(task.getBoundingClientRect().bottom) + 8 + 'px'; if (cv.style.top !== y) cv.style.top = y; } // sempre sotto la scheda dell'obiettivo
      g.clearRect(0, 0, 220, 168);
      for (const r of rooms) {
        if (!r.open) continue;
        g.fillStyle = r.fuel <= 0 ? (blink ? '#ff3b30' : '#ffb3ae') : r.fuel < 3 ? '#ffb02e' : '#c9a27a';
        g.fillRect(px(r.cx - 2.9), pz(-9), px(r.cx + 2.9) - px(r.cx - 2.9), pz(-4) - pz(-9));
      }
      G.stands().forEach(([x, z]) => { g.fillStyle = '#b8452f'; g.fillRect(px(x) - 6, pz(z) - 4, 12, 8); });
      const rc = G.recep();
      dot(rc.x, rc.z, rc.n > 0 ? (blink ? '#ffd23a' : '#ff9f1c') : '#8a5a35', rc.n > 0 ? 9 : 6);
      for (const gu of guests) if (gu.state === 'bed' && ((gu.want && !gu.served) || gu.req)) dot(gu.b.x, -6.6, blink ? '#ff4d8a' : '#ffffff', 6);
      G.pads().forEach(([x, z]) => { g.strokeStyle = '#2d6cdf'; g.lineWidth = 3; g.strokeRect(px(x) - 5, pz(z) - 5, 10, 10); });
      G.spots().forEach(([x, z, c]) => dot(x, z, c, 6));
      dot(player.position.x, player.position.z, '#1f2a37', 8); dot(player.position.x, player.position.z, '#ffd23a', 5);
    };
  };
})(window.Rifugio);
