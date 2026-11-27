// Pianta del rifugio (solo numeri, niente grafica). Il rifugio si sviluppa in verticale: in cima (nord, z negativi) il campo recintato,
// poi la strada con la reception, il locale caldaia/cucina con lo sgabuzzino, mensa e cinema, e il corridoio centrale con 4 stanze per lato
// che si allunga verso il basso: si parte con una fila di due stanze, ogni ampliamento ne aggiunge un'altra.
// m = 1 pianta normale, -1 pianta specchiata (Borgo dei Mulini).
(function (R) {
  'use strict';
  const HW = 1.7, ROOM_W = 6, ROOM_D = 5, ROWS = 4, Z0 = -15;

  function layout(city) {
    const m = city === 'mulini' ? -1 : 1;
    const X = x => x * m;
    const rect = (x0, x1, z0, z1) => ({ x0: Math.min(X(x0), X(x1)), x1: Math.max(X(x0), X(x1)), z0, z1 });
    const rooms = [];
    for (let k = 0; k < ROWS * 2; k++) {
      const side = (k % 2 ? 1 : -1) * m, row = Math.floor(k / 2), z0 = Z0 + row * ROOM_D, ax = x => side * x;
      rooms.push({
        k, side, row, z0, z1: z0 + ROOM_D, cx: ax(HW + ROOM_W / 2),
        x0: Math.min(ax(HW), ax(HW + ROOM_W)), x1: Math.max(ax(HW), ax(HW + ROOM_W)),
        doorX: ax(HW), doorZ: z0 + 3.4,
        beds: [ax(3.4), ax(5.9)].map(x => ({ x, z: z0 + 1.35 })),
        bath: { x: ax(6.6), z: z0 + 4.0 }, restock: [ax(4.6), z0 + 4.1]
      });
    }
    const mensa = Object.assign(rect(-12, -HW, -23, -15), { doorX: X(-HW), doorZ: -19, cx: X(-6.9), cz: -19 });
    const cinema = Object.assign(rect(HW, 10.5, -23, -15), { doorX: X(HW), doorZ: -19, cx: X(6.1), cz: -19 });
    const seats = [];
    [-9.8, -6.8, -3.9].forEach(x => [-18.7, -16.5].forEach(z => [-0.85, 0.85].forEach(dx => seats.push({ x: X(x) + dx, z, tx: X(x), face: dx < 0 ? Math.PI / 2 : -Math.PI / 2 }))));
    const chairs = [];
    [-19.1, -17.4, -15.8].forEach(z => [3.6, 6.1, 8.6].forEach(x => chairs.push({ x: X(x), z })));
    return {
      m, HW, ROOM_W, ROOM_D, ROWS, Z0, rooms, mensa, cinema, seats, chairs,
      boiler: { x0: -4.5, x1: 4.5, z0: -29, z1: -23, fire: [X(-3), -27.6], feed: [X(-2.6), -26] },
      closet: Object.assign(rect(4.5, 8.2, -28.4, -23), { shelf: [X(7.2), -27.4], pick: [X(6.4), -25.8] }),
      stands: { cocoa: [X(-9.6), -21.7], snack: [X(-4.5), -21.7] },
      recep: { x: X(5.6), z: -34 },
      // campo (o bosco abbattibile): un solo appezzamento con gli angoli tondi (raggio r), recinto e cancello a sud (largo 2*gate)
      park: [X(7), -42.4], field: { x0: -15, x1: 15, z0: -55, z1: -40, r: 3.5, gate: 2.4 },
      roadZ: -37.5, world: { min: [-18, -57], max: [18, 15] },
      // zona costruita: niente alberi, sassi, fiori o animali
      built: (x, z, pad) => { pad = pad || 0; return x > -13 - pad && x < 13 + pad && z > -36 - pad && z < 11 + pad; }
    };
  }
  (R.parts = R.parts || {}).layout = layout;
})(window.Rifugio);
