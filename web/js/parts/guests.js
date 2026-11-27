// Ospiti (parte di game.js): arrivano dalla strada, fila alla reception, stanza (letto e bagno), mensa, cinema,
// di nuovo alla reception a pagare e via.
(function (R) {
  'use strict';
  const COATS = [0x4f8cff, 0xa066ff, 0xff9a2a, 0x2ec4b6, 0xff5d8f, 0x6bcf3a];
  const HATS = [0xff4d4d, 0xffd23a, 0x3d8bff, 0x4cd964, 0xff7ac6, 0xa066ff];
  const SHORTS = [0x3b6fd4, 0xe8c66a, 0xf2f2f2, 0x2ec4b6, 0xff8a65];

  (R.parts = R.parts || {}).guests = function (G) {
    const { scene, B, hud, A, P, S, L, PL, TX, RES, EX, MT, rooms, mensa, cinema, boiler, guests, recep, fly, burst, _v, outfit, snackE } = G;
    const pick = a => a[Math.floor(Math.random() * a.length)];
    let spawnT = 2;

    // Percorso passando dal corridoio: dalla posizione attuale (con la porta del posto in cui si trova) alla porta di arrivo.
    const door = d => ({ x: d.doorX, z: d.doorZ });
    function via(from, to, end) {
      const path = [];
      if (from) { path.push([from.doorX + Math.sign(from.cx) * 0.6, from.doorZ], [0, from.doorZ]); }
      if (to) { path.push([0, to.doorZ], [to.doorX + Math.sign(to.cx) * 0.6, to.doorZ]); }
      return path.concat(end);
    }
    const roomPlace = r => r.def;

    function spawn(kind, path) {
      let fb = null;
      for (const r of rooms) if (r.open) for (const b of r.beds) if (!b.guest && !fb) fb = [r, b];
      if (!fb) return null;
      const [r, b] = fb;
      const H = PL.host, look = kind === 'vip' ? { coat: 0xffd23a, hat: 0xffffff, opt: { hat: 'crown' } } : kind === 'scout' ? { coat: 0x4cd964, hat: 0x8b5a2b, opt: {} } : kind === 'rush' ? { coat: 0xff7ac6, hat: 0xffffff, opt: {} } :
        kind === 'host' && H ? { coat: H.coat, hat: 0xffffff, opt: H.hat ? { hat: H.hat } : {} } : null;
      const pool = PL.coats && PL.coats.length ? PL.coats : COATS;
      const hatOpt = !look && PL.hats && PL.hats.length && Math.random() < 0.55 ? { hat: pick(PL.hats) } : {};
      const g = B.person(look ? look.coat : pick(pool), look ? look.hat : pick(HATS), false, outfit, Object.assign({ shorts: pick(SHORTS), shoes: Math.random() < 0.5 ? 0xffffff : 0x3d8bff }, look ? look.opt : hatOpt));
      g.scale.setScalar(kind === 'vip' || kind === 'host' ? 1 : 0.88);
      g.traverse(m => { if (m.isMesh) m.castShadow = false; }); // niente ombre vere sugli ospiti: sono tanti
      const side = Math.random() < 0.5 ? -1 : 1, road = path || [[side * 30, L.roadZ], [side * 14, L.roadZ], [recep.x, L.roadZ]];
      g.position.set(road[0][0], 0, road[0][1]);
      const gu = { g, r, b, state: 'road', path: road.slice(1).map(p => p.slice()), stay: P.guest_stay * (kind === 'vip' ? 1.4 : 1), cold: 0, want: false, served: false, el: hud.label('pill', ''), vip: kind === 'vip', boat: kind === 'boat', scout: kind === 'scout', rush: kind === 'rush' ? 40 : 0, taken: false, seat: null, chair: null, extra: 0, dirty: false };
      b.guest = gu; guests.push(gu);
      return gu;
    }

    function lie(gu) {
      const u = gu.g.userData;
      gu.g.rotation.set(-Math.PI / 2, 0, 0); gu.g.position.set(gu.b.x, 0.6, gu.b.z + 1.0); u.blob.visible = false;
    }
    function sit(gu, x, z, face) {
      const u = gu.g.userData;
      gu.g.rotation.set(0, face, 0); gu.g.position.set(x, 0.03, z);
      u.legs.forEach(l => { l.rotation.x = -1.45; });
      u.arms.forEach(a => { a.rotation.set(-0.9, 0, 0); }); u.elbows.forEach(e => { e.rotation.set(-0.9, 0, 0); });
      u.up.rotation.set(0, 0, 0); u.up.position.y = 0.42;
    }
    function stand(gu, x, z) {
      const u = gu.g.userData;
      gu.g.rotation.set(0, 0, 0); gu.g.position.set(x, 0, z); u.legs.forEach(l => { l.rotation.x = 0; }); u.up.position.y = 0.42; u.blob.visible = true;
    }

    // Il bagno consuma un sapone e un rotolo a ogni ospite: se mancano, paga di meno.
    function useBath(gu) {
      const r = gu.r;
      if (r.soap > 0 && r.paper > 0) { r.soap--; r.paper--; return; }
      gu.dirty = true; hud.floatText(r.soap <= 0 ? '🧼❗' : '🧻❗', r.def.bath.x, 1.8, r.def.bath.z);
      if (R.settings.tip('bath')) hud.toast('🚽 Bagno senza scorte: prendile nello sgabuzzino');
    }

    // Dopo il riposo: mensa (se c'è da mangiare), poi cinema, poi reception.
    function next(gu) {
      const s = gu.step = (gu.step || 0) + 1, from = gu.place;
      if (s === 1 && mensa.open && G.foodOpen()) {
        const seat = L.seats.find(x => !x.guest && !x.reserved);
        if (seat && (gu.vip || gu.scout || gu.rush > 0 || Math.random() < P.cocoa_chance)) {
          seat.guest = gu; gu.seat = seat; gu.state = 'toMensa';
          stand(gu, ...(from ? G.exitPoint(gu) : [gu.b.x, gu.b.z + 1.6]));
          gu.path = via(roomPlace(gu.r), L.mensa, [[seat.x, seat.z + 0.8], [seat.x, seat.z]]); gu.place = L.mensa;
          return;
        }
      }
      if (s <= 2 && cinema.open && Math.random() < 0.6) {
        const chair = L.chairs.find(c => !c.guest);
        if (chair) {
          chair.guest = gu; gu.chair = chair; gu.state = 'toCinema'; gu.step = 2;
          stand(gu, ...G.exitPoint(gu));
          gu.path = via(gu.place || roomPlace(gu.r), L.cinema, [[chair.x, chair.z - 0.1]]); gu.place = L.cinema;
          return;
        }
      }
      goPay(gu);
    }
    function goPay(gu) {
      const from = gu.place || roomPlace(gu.r);
      stand(gu, ...G.exitPoint(gu));
      free(gu);
      const pay = Math.round((P.pay + (gu.served ? P.tip : 0) + gu.extra) * (gu.vip ? 3 : gu.host ? 4 : gu.scout ? 1.5 : 1) * (R.shop.has('boost') ? 1.5 : 1) * MT.payMul() * G.payBonus(gu) * (gu.dirty ? 0.65 : 1));
      gu.pay = pay; gu.state = 'out'; gu.place = null;
      gu.path = via(from, null, [[0, from.doorZ], [0, 6.4], [recep.x + 0.7, recep.z + 1.35]]);
      B.wave(gu.g, 1.6);
      S.happy++; S.guests++; EX.ev('guest'); if (gu.vip) { EX.ev('vip'); MT.vipServed(gu.persona); }
      if (gu.host) { R.settings.addGems(1); hud.toast(`${gu.host.e} ${gu.host.name}: «${gu.host.line}» +1 💎`); }
    }
    function free(gu) {
      gu.b.guest = null; if (gu.seat) { gu.seat.guest = null; gu.seat = null; } if (gu.chair) { gu.chair.guest = null; gu.chair = null; }
    }
    function leaveAngry(gu) {
      const from = gu.place || roomPlace(gu.r);
      stand(gu, ...G.exitPoint(gu)); free(gu);
      gu.state = 'out'; gu.pay = 0; gu.place = null; gu.path = via(from, null, [[0, 6.4], [Math.sign(recep.x) * 3, L.roadZ], [30, L.roadZ]]);
      S.happy = Math.max(0, S.happy - P.cold_penalty); hud.toast(TX.coldLeave); A.sfx('cold');
    }

    // Una bevanda o un dolce vola verso l'ospite seduto in mensa.
    function serve(gu, fromObj) {
      const rushWin = gu.rush > 0, s = gu.seat;
      gu.served = true; fromObj.getWorldPosition(_v);
      const tx = s.tx, tz = s.z;
      fly('cup', _v, o => o.set(tx, 0.9, tz), 0.45, 1.0, () => {
        if (gu.want === 'snack') S.snacks = (S.snacks || 0) + 1; else S.cocoa++;
        hud.floatText(TX.thanks, tx, 1.8, tz); A.sfx('cup'); EX.ev('cup');
        if (rushWin) { EX.ev('rush'); S.coins += 40; R.settings.addGems(2); hud.toast('⚡ Servizio lampo! +40 monete e 2 gemme'); A.sfx('goal'); G.fauna().celebrate(); }
        burst(tx, 1.2, tz, 6, [0xff7ac6, 0xff4d4d], 1.4, 3, 0.9, 0.12, 1.5);
        gu.eat = 3.5;
      });
    }

    function update(dt) {
      if (S.fed > 0) {
        spawnT -= dt;
        if (spawnT <= 0) {
          const open = rooms.filter(r => r.open).length;
          spawnT = (P.guest_spawn_min + Math.random() * (P.guest_spawn_max - P.guest_spawn_min)) * (G.hasEffect('sign') ? P.sign_mul : 1) / (1 + 0.22 * (open - 1));
          spawn();
        }
      }
      const queue = guests.filter(g => g.state === 'queue');
      for (let i = guests.length - 1; i >= 0; i--) {
        const gu = guests[i];
        if (gu.state === 'road') { if (B.follow(gu.g, gu.path, 3.6, dt)) gu.state = 'queue'; }
        else if (gu.state === 'queue') {
          const k = queue.indexOf(gu); gu.path = [[recep.x - 0.55, recep.z + 1.45 + k * 0.7]];
          if (B.follow(gu.g, gu.path, 3, dt)) {
            gu.g.rotation.y = Math.PI;
            if (k === 0) {
              gu.wait = (gu.wait || 0) + dt;
              if (gu.wait > 0.8) { gu.wait = 0; recep.hop = 0.4; A.sfx('click'); gu.state = 'in'; const d = gu.r.def; gu.path = [[0, 6.4]].concat(via(null, d, [[gu.b.x, d.z0 + 3.1]])); }
            }
          } else gu.wait = 0;
        } else if (gu.state === 'in') {
          if (B.follow(gu.g, gu.path, 3.4, dt)) {
            gu.state = 'bed'; lie(gu); A.sfx('guest'); G.fauna().react();
            MT.see('g_' + (gu.vip ? 'vip' : gu.scout ? 'scout' : gu.rush > 0 ? 'rush' : 'hiker'));
          }
        } else if (gu.state === 'bed') {
          if (boiler.fuel > 0) { gu.stay -= dt; gu.cold = Math.max(0, gu.cold - dt * 2); } else gu.cold += dt;
          if (!gu.bathed && gu.stay < P.guest_stay * 0.5) { gu.bathed = true; useBath(gu); }
          if (gu.cold > P.guest_cold_limit) leaveAngry(gu); else if (gu.stay <= 0 && !gu.req) next(gu);
        } else if (gu.state === 'toMensa') {
          if (B.follow(gu.g, gu.path, 3.2, dt)) {
            gu.state = 'table'; sit(gu, gu.seat.x, gu.seat.z, gu.seat.face); gu.wait = 40;
            gu.want = G.snackOpen() && (!G.drinkOpen() || (!gu.rush && Math.random() < 0.4)) ? 'snack' : true;
          }
        } else if (gu.state === 'table') {
          if (gu.eat > 0) { gu.eat -= dt; if (gu.eat <= 0) next(gu); }
          else if (!gu.served) {
            if (gu.rush > 0) gu.rush -= dt;
            gu.wait -= dt;
            if (gu.wait <= 0) { gu.taken = false; hud.floatText('😕', gu.seat.tx, 1.8, gu.seat.z); next(gu); }
          }
        } else if (gu.state === 'toCinema') {
          if (B.follow(gu.g, gu.path, 3.2, dt)) { gu.state = 'cinema'; sit(gu, gu.chair.x, gu.chair.z, Math.PI); gu.wait = 9; }
        } else if (gu.state === 'cinema') {
          gu.wait -= dt;
          if (gu.wait <= 0) { gu.extra += Math.round(P.pay * 0.6); S.films = (S.films || 0) + 1; hud.floatText('🎬', gu.chair.x, 1.8, gu.chair.z); goPay(gu); gu.wait = 0; }
        } else if (gu.wait > 0) { // al bancone: lascia i soldi, poi esce dalla strada
          gu.wait -= dt; gu.g.rotation.y = Math.PI;
          if (gu.wait <= 0) { G.payAtReception(gu.pay); gu.pay = 0; gu.path = [[recep.x + 2.4, L.roadZ], [30, L.roadZ]]; }
        } else if (B.follow(gu.g, gu.path, 3.6, dt)) {
          if (gu.pay > 0) gu.wait = 0.7; else { scene.remove(gu.g); B.release(gu.g); gu.el.remove(); guests.splice(i, 1); }
        }
      }
    }
    function overlays() {
      for (const gu of guests) {
        let txt = '', cls = 'pill', x = gu.b.x, y = 1.5, z = gu.b.z;
        if (gu.state === 'bed') {
          if (boiler.fuel <= 0) { txt = TX.cold; cls += ' cold'; } else if (gu.req) { txt = gu.req.e + '?'; cls += ' want'; }
        } else if (gu.state === 'table' && gu.seat) {
          x = gu.seat.x; z = gu.seat.z; y = 2.1;
          if (!gu.served) { txt = gu.want === 'snack' ? snackE + '?' : TX.want; cls += ' want'; }
        }
        if (gu.state === 'bed' || gu.state === 'table') {
          const badge = gu.host ? gu.host.e : gu.vip ? '⭐' : gu.scout ? '🏕️' : gu.rush > 0 && !gu.served ? `⏱${Math.ceil(gu.rush)}` : '';
          if (badge) txt = txt ? `${badge} ${txt}` : badge;
        }
        if (gu.el.textContent !== txt) gu.el.textContent = txt;
        if (gu.el.className !== cls) gu.el.className = cls;
        hud.put(gu.el, x, y, z, !!txt);
      }
    }
    return { spawn, serve, update, overlays };
  };
})(window.Rifugio);
