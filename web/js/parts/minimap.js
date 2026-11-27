// Mini mappa (parte di game.js): alta e stretta come il rifugio. Omino, stanze, locale, banchi, reception e cose da fare.
(function (R) {
  'use strict';
  (R.parts = R.parts || {}).minimap = function (G) {
    const { L, player, rooms, guests, boiler, mensa, cinema } = G;
    const cv = document.createElement('canvas'); cv.id = 'minimap'; cv.width = 128; cv.height = 230; document.body.appendChild(cv);
    const g = cv.getContext('2d');
    const X0 = -17, X1 = 17, Z0 = -57, Z1 = 12;
    const px = x => Math.max(4, Math.min(124, (x - X0) / (X1 - X0) * 128)), pz = z => Math.max(4, Math.min(226, (z - Z0) / (Z1 - Z0) * 230));
    const dot = (x, z, col, r) => { g.fillStyle = col; g.beginPath(); g.arc(px(x), pz(z), r, 0, 7); g.fill(); };
    const rect = (x0, x1, z0, z1, col) => { g.fillStyle = col; g.fillRect(px(x0), pz(z0), px(x1) - px(x0), pz(z1) - pz(z0)); };
    let t = 0, blink = false;
    return function (dt) {
      const on = R.settings.get('minimap') !== false;
      if (cv.hidden !== !on) cv.hidden = !on;
      t -= dt; if (!on || t > 0) return;
      t = 0.25; blink = !blink;
      const task = document.getElementById('task'); if (task) { const y = Math.ceil(task.getBoundingClientRect().bottom) + 8 + 'px'; if (cv.style.top !== y) cv.style.top = y; } // sempre sotto la scheda dell'obiettivo
      g.clearRect(0, 0, 128, 230);
      rect(L.field.x0, L.field.x1, L.field.z0, L.field.z1, 'rgba(110,180,80,.35)');
      rect(X0, X1, L.roadZ - 1, L.roadZ + 1, '#b9b4a8');
      rect(-L.HW, L.HW, -23, 6, '#d9b7a0');
      rect(L.boiler.x0, L.boiler.x1, L.boiler.z0, L.boiler.z1, boiler.fuel <= 0 ? (blink ? '#ff3b30' : '#ffb3ae') : boiler.fuel < 12 ? '#ffb02e' : '#9aa1ab');
      rect(L.closet.x0, L.closet.x1, L.closet.z0, L.closet.z1, '#4fa3ff');
      for (const r of rooms) rect(r.def.x0 + 0.2, r.def.x1 - 0.2, r.def.z0 + 0.2, r.def.z1 - 0.2, !r.open ? 'rgba(160,140,120,.25)' : (r.soap < 2 || r.paper < 2) && blink ? '#b46bff' : '#c9a27a');
      rect(L.mensa.x0, L.mensa.x1, L.mensa.z0 + 0.2, L.mensa.z1, mensa.open ? '#f2c86a' : 'rgba(160,140,120,.25)');
      rect(L.cinema.x0, L.cinema.x1, L.cinema.z0 + 0.2, L.cinema.z1, cinema.open ? '#8a6bb0' : 'rgba(160,140,120,.25)');
      G.stands().forEach(([x, z]) => { g.fillStyle = '#b8452f'; g.fillRect(px(x) - 4, pz(z) - 3, 8, 6); });
      const rc = G.recep();
      dot(rc.x, rc.z, rc.n > 0 ? (blink ? '#ffd23a' : '#ff9f1c') : '#8a5a35', rc.n > 0 ? 7 : 5);
      for (const gu of guests) {
        if (gu.state === 'table' && !gu.served && gu.seat) dot(gu.seat.x, gu.seat.z, blink ? '#ff4d8a' : '#ffffff', 4);
        else if (gu.state === 'bed' && gu.req) dot(gu.b.x, gu.b.z, blink ? '#ff4d8a' : '#ffffff', 4);
      }
      G.pads().forEach(([x, z]) => { g.strokeStyle = '#2d6cdf'; g.lineWidth = 2; g.strokeRect(px(x) - 3, pz(z) - 3, 6, 6); });
      G.spots().forEach(([x, z, c]) => dot(x, z, c, 4));
      dot(player.position.x, player.position.z, '#1f2a37', 6); dot(player.position.x, player.position.z, '#ffd23a', 4);
    };
  };
})(window.Rifugio);
