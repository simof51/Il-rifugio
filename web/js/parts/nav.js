// Percorsi A* su griglia per gli aiutanti (parte di game.js).
(function (R) {
  'use strict';
  (R.parts = R.parts || {}).nav = function (G) {
    const { P, cols } = G;
    // --- percorsi per gli aiutanti -------------------------------------------
    // Griglia di 0,5 m sul mondo: una cella è chiusa se è vicina a un ostacolo (muri, letti, camino, banco, lago, alberi, mascotte).
    // I percorsi si trovano con A* (8 direzioni, niente angoli tagliati) e si accorciano togliendo i punti inutili (linea di vista).
    // La griglia si ricostruisce da sola quando gli ostacoli cambiano (stanza aperta, parete tolta, banco, mascotte).
    const CELL = 0.5, MARGIN = 0.48, GX0 = P.world_min[0], GZ0 = P.world_min[1];
    const GW = Math.ceil((P.world_max[0] - GX0) / CELL) + 1, GH = Math.ceil((P.world_max[1] - GZ0) / CELL) + 1;
    const grid = new Uint8Array(GW * GH), gScore = new Float32Array(GW * GH), came = new Int32Array(GW * GH);
    let gridSig = -1;
    const clampI = (v, n) => Math.max(0, Math.min(n - 1, v));
    function buildGrid() {
      grid.fill(0);
      for (const c of cols) {
        const x0 = clampI(Math.floor((c[0] - MARGIN - GX0) / CELL), GW), x1 = clampI(Math.ceil((c[1] + MARGIN - GX0) / CELL), GW);
        const z0 = clampI(Math.floor((c[2] - MARGIN - GZ0) / CELL), GH), z1 = clampI(Math.ceil((c[3] + MARGIN - GZ0) / CELL), GH);
        for (let iz = z0; iz <= z1; iz++) for (let ix = x0; ix <= x1; ix++) {
          const cx = GX0 + ix * CELL, cz = GZ0 + iz * CELL;
          const qx = Math.max(c[0], Math.min(cx, c[1])), qz = Math.max(c[2], Math.min(cz, c[3]));
          if (Math.hypot(cx - qx, cz - qz) < MARGIN) grid[iz * GW + ix] = 1;
        }
      }
      gridSig = cols.length;
    }
    const cellX = x => clampI(Math.round((x - GX0) / CELL), GW), cellZ = z => clampI(Math.round((z - GZ0) / CELL), GH);
    const blockedAt = (x, z) => grid[cellZ(z) * GW + cellX(x)] === 1;
    function lineClear(ax, az, bx, bz) {
      const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.2);
      for (let i = 1; i < n; i++) { const t = i / n; if (blockedAt(ax + (bx - ax) * t, az + (bz - az) * t)) return false; }
      return true;
    }
    // La cella libera più vicina all'obiettivo (che può stare dentro un albero): fra quelle a pari distanza, la più vicina a chi parte.
    function freeGoal(tx, tz, sx, sz) {
      const gx = cellX(tx), gz = cellZ(tz);
      if (!grid[gz * GW + gx]) return [gx, gz];
      for (let r = 1; r <= 8; r++) {
        let best = null, bd = 1e9;
        for (let iz = gz - r; iz <= gz + r; iz++) for (let ix = gx - r; ix <= gx + r; ix++) {
          if (ix < 0 || iz < 0 || ix >= GW || iz >= GH || Math.max(Math.abs(ix - gx), Math.abs(iz - gz)) !== r || grid[iz * GW + ix]) continue;
          const d = Math.hypot(GX0 + ix * CELL - sx, GZ0 + iz * CELL - sz);
          if (d < bd) { bd = d; best = [ix, iz]; }
        }
        if (best) return best;
      }
      return null;
    }
    // Percorso da (sx, sz) a (tx, tz): lista di punti {x, z} (senza il punto di partenza), vuota se non si trova niente.
    function findPath(sx, sz, tx, tz) {
      if (gridSig !== cols.length) buildGrid();
      const goal = freeGoal(tx, tz, sx, sz); if (!goal) return [];
      const s0 = cellZ(sz) * GW + cellX(sx), g0 = goal[1] * GW + goal[0];
      gScore.fill(1e9); came.fill(-1); gScore[s0] = 0;
      // coda con priorità (heap binario)
      const hp = [], hf = [];
      const push = (i, f) => { let k = hp.length; hp.push(i); hf.push(f); while (k > 0) { const q = (k - 1) >> 1; if (hf[q] <= hf[k]) break; [hp[q], hp[k]] = [hp[k], hp[q]]; [hf[q], hf[k]] = [hf[k], hf[q]]; k = q; } };
      const pop = () => {
        const top = hp[0], li = hp.pop(), lf = hf.pop();
        if (hp.length) { hp[0] = li; hf[0] = lf; let k = 0; for (;;) { let m = k; const a = 2 * k + 1, b = a + 1; if (a < hp.length && hf[a] < hf[m]) m = a; if (b < hp.length && hf[b] < hf[m]) m = b; if (m === k) break; [hp[m], hp[k]] = [hp[k], hp[m]]; [hf[m], hf[k]] = [hf[k], hf[m]]; k = m; } }
        return top;
      };
      const gx = goal[0], gz = goal[1], heur = (ix, iz) => { const dx = Math.abs(ix - gx), dz = Math.abs(iz - gz); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
      push(s0, heur(s0 % GW, (s0 / GW) | 0));
      let found = false, steps = 0;
      while (hp.length && steps++ < 12000) {
        const cur = pop(); if (cur === g0) { found = true; break; }
        const cx = cur % GW, cz = (cur / GW) | 0;
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dz) continue;
          const nx = cx + dx, nz = cz + dz; if (nx < 0 || nz < 0 || nx >= GW || nz >= GH) continue;
          const ni = nz * GW + nx; if (grid[ni]) continue;
          if (dx && dz && (grid[cz * GW + nx] || grid[nz * GW + cx])) continue; // niente angoli tagliati
          const ng = gScore[cur] + (dx && dz ? 1.414 : 1);
          if (ng < gScore[ni]) { gScore[ni] = ng; came[ni] = cur; push(ni, ng + heur(nx, nz)); }
        }
      }
      if (!found) return [];
      const pts = []; for (let i = g0; i !== -1; i = came[i]) pts.push({ x: GX0 + (i % GW) * CELL, z: GZ0 + ((i / GW) | 0) * CELL });
      pts.reverse(); // dal punto di partenza all'arrivo
      // si tolgono i punti intermedi quando c'è visuale libera fra due punti lontani
      const out = []; let i = 0;
      while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !lineClear(pts[i].x, pts[i].z, pts[j].x, pts[j].z)) j--; out.push(pts[j]); i = j; }
      return out;
    }
    return { findPath, invalidate() { gridSig = -1; } };
  };
})(window.Rifugio);
