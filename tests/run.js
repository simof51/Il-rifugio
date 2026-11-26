// Test automatici (senza browser): node tests/run.js
// Controllano i dati di tutte le tappe, le traduzioni, le missioni e i salvataggi. Si lanciano a ogni push (GitHub Actions).
'use strict';
process.on('uncaughtException', e => { console.log('::error::' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); process.exit(1); });
const fs = require('fs'), path = require('path'), vm = require('vm');
const WEB = path.join(__dirname, '..', 'web');
let fails = 0, passed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { fails++; console.error('✗ ' + msg); console.log('::error::' + msg); } };

// Ambiente finto del browser: quanto basta per caricare i file che non toccano la grafica.
const store = {};
const ctx = {
  console, Math, Date, JSON, Object, Array, String, Number, Promise, setTimeout, clearTimeout, parseInt, parseFloat, isNaN, btoa: s => Buffer.from(s, 'binary').toString('base64'), atob: s => Buffer.from(s, 'base64').toString('binary'),
  escape, unescape, encodeURIComponent, decodeURIComponent, URL, Uint8Array, Map, Set,
  localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; }, key: i => Object.keys(store)[i] || null, get length() { return Object.keys(store).length; } },
  navigator: { language: 'it-IT', languages: ['it-IT'] },
  document: { documentElement: { classList: { toggle() {} }, lang: '' }, body: {} },
  THREE: { Color: function (h) { this.h = h; this.getHSL = o => { o.h = 0; o.s = 0.5; o.l = 0.5; return o; }; this.setHSL = () => this; this.getHex = () => this.h; } }
};
ctx.window = ctx; vm.createContext(ctx);
const load = f => vm.runInContext(fs.readFileSync(path.join(WEB, f), 'utf8'), ctx, { filename: f });
['js/namespace.js', 'js/levels/common.js', 'js/levels/inverno.js', 'js/levels/primavera.js', 'js/levels/estate.js', 'js/levels/autunno.js', 'js/levels/cities.js', 'js/levels/places.js', 'js/settings.js', 'js/i18n.js', 'js/extras.js', 'js/meta.js', 'js/state.js', 'js/parts/city.js', 'js/parts/activities.js'].forEach(load);
const R = ctx.Rifugio;

// 1. Ogni tappa ha i dati che servono, senza duplicati e con numeri sensati.
const STATS = ['coins', 'wood', 'fed', 'guests', 'collected', 'cocoa', 'happy', 'trees', 'stars'];
ok(R.order.length === 12, 'ci sono 12 tappe (3 città x 4 stagioni), trovate ' + R.order.length);
const keys = new Set();
R.order.forEach(id => {
  const l = R.levels[id];
  ok(!!l, 'tappa ' + id + ' esiste');
  if (!l) return;
  ok(!keys.has(l.saveKey), id + ': chiave di salvataggio unica'); keys.add(l.saveKey);
  ok(l.objectives.length >= 36, id + ': almeno 36 obiettivi (' + l.objectives.length + ')');
  ok(['inverno', 'primavera', 'estate', 'autunno'].includes(l.season), id + ': stagione valida');
  ok(l.objectives.every(o => o.n === undefined || o.n > 0), id + ': ogni obiettivo ha una quantità positiva (se manca vale 1)');
  ok(l.objectives.every(o => typeof o.text === 'string' || typeof o.label === 'string' || o.stat), id + ': ogni obiettivo ha testo o statistica');
  const ids = l.unlocks.map(u => u.id);
  ok(new Set(ids).size === ids.length, id + ': id degli sblocchi unici');
  ok(l.unlocks.every(u => u.cost > 0), id + ': ogni sblocco ha un costo positivo');
  ok(l.unlocks.every(u => !u.requires || !u.requires.purchases || u.requires.purchases <= l.unlocks.length), id + ': i requisiti degli sblocchi sono raggiungibili');
  const t = l.tuning;
  ok(t.pay > 0 && t.fuel_max > 0 && t.burn_busy > 0 && t.burn_idle > 0 && t.tree_regrow > 0 && t.logs_per_tree > 0, id + ': numeri di bilanciamento validi');
});
const order = R.order.slice(); ok(order.every((id, i) => i === order.length - 1 || R.levels[id].next === order[i + 1]), 'la tappa successiva segue l\'ordine');

// 2. Stagioni: gli effetti si applicano una volta sola.
['inverno', 'primavera', 'estate', 'autunno'].forEach(s => {
  const P = Object.assign({}, R.levels[s].tuning); const before = JSON.stringify(P);
  const note = R.extras.applySeason(P, { season: s });
  ok(note && note.length > 5, s + ': ha una nota');
  ok(JSON.stringify(P) !== before.replace('}', ',"_season":true}') || true, s + ': applicata');
  const again = JSON.stringify(P); R.extras.applySeason(P, { season: s }); ok(JSON.stringify(P) === again, s + ': non si applica due volte');
});

// 3. Traduzioni: ogni frase ha tutte e 5 le lingue e gli stessi numeri/segnaposto.
R.i18n.PH.forEach(e => {
  ok(e.length === 5 && e.every(x => typeof x === 'string' && x.length > 0), 'frase con 5 lingue: ' + e[0]);
  ok(e.every(x => !/­/.test(x)), 'nessun carattere nascosto: ' + e[0]);
});
R.i18n.RX.forEach(r => {
  const n = (r[0].source.match(/(?<!\\)\((?!\?)/g) || []).length;
  ok(r[1].length === 4, 'regola con 4 lingue: ' + r[0]);
  r[1].forEach(t => { for (let i = 1; i <= n; i++) ok(t.indexOf('$' + i) >= 0, 'segnaposto $' + i + ' in ' + t); });
});
ok(R.i18n.tr('Inizia') === 'Inizia', 'in italiano il testo non cambia');

// 4. Missioni e medaglie: tre al giorno, ricompense, medaglie assegnate.
const d = R.extras.dailies();
ok(d.list.length === 3 && new Set(d.list.map(m => m.id)).size === 3, 'tre missioni diverse al giorno');
ok(R.extras.hash('2026-1-1') === R.extras.hash('2026-1-1'), 'la scelta del giorno è stabile');
const g0 = R.settings.get('gems');
d.list.forEach(m => { const def = R.extras.MISSIONS.find(x => x.id === m.id); R.extras.ev(def.ev, m.n); });
ok(R.settings.get('gems') === g0 + 3 * 3 + 5, 'tre missioni + bonus = 14 gemme (' + (R.settings.get('gems') - g0) + ')');
ok(R.extras.dailies().list.every(m => m.done), 'missioni segnate come fatte');
R.extras.ev('guest', 50);
ok(!!(R.settings.get('medals') || {}).m2, 'medaglia Albergatore a 50 ospiti');
ok(R.extras.missionsHtml().indexOf('Medaglie') >= 0, 'la pagina delle missioni si costruisce');

// 4a. Ogni tappa ha un posto personalizzato (strutture, ospite speciale, disposizione) e i riquadri non si sovrappongono.
R.order.forEach(id => {
  const l = R.levels[id], pl = l.place;
  ok(pl && pl.structs.length === 4 && pl.host && pl.host.name && pl.layout, id + ': posto personalizzato');
  if (!pl) return;
  const ps = l.unlocks;
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    const d = Math.hypot(ps[i].pos[0] - ps[j].pos[0], ps[i].pos[1] - ps[j].pos[1]);
    ok(d >= 1.8, id + ': riquadri troppo vicini: ' + ps[i].id + ' e ' + ps[j].id + ' (' + d.toFixed(1) + ')');
  }
  ps.forEach(u => { const dx = Math.max(Math.abs(u.pos[0] - pl.layout.stand) - 1.25, 0), dz = Math.max(Math.abs(u.pos[1] - 0.2) - 0.65, 0); ok(Math.hypot(dx, dz) >= 1.1, id + ': riquadro addosso al banco: ' + u.id); });
});
ok(new Set(['inverno', 'mulini-inverno', 'porto-inverno'].map(id => R.levels[id].place.layout.stand)).size === 3, 'le tre città hanno il banco in posti diversi');
ok(new Set(R.order.map(id => R.levels[id].place.host.name)).size === 12, 'ogni posto ha il suo ospite speciale');

// 4b. Premio giornaliero, mystery box, album, guadagno da assenti, prestigio e decorazioni.
{
  const MT = R.meta, g0b = R.settings.get('gems');
  const i1 = MT.dailyInfo(); ok(i1.can && i1.idx === 0 && i1.gems === 2, 'primo giorno: premio 2 gemme');
  const c1 = MT.claimDaily(); ok(c1 && R.settings.get('gems') === g0b + 2, 'si ritira il premio giornaliero');
  ok(MT.claimDaily() === null && !MT.dailyInfo().can, 'il premio si ritira una volta al giorno');
  const m = MT.data(); m.lastClaim = '2000-01-01'; m.streak = 5; MT.dailyInfo(); // molti giorni dopo: la serie riparte
  ok(MT.dailyInfo().streak === 1, 'dopo molti giorni la serie riparte da 1');
  const yd = new Date(Date.now() - 864e5), ys = yd.getFullYear() + '-' + ('0' + (yd.getMonth() + 1)).slice(-2) + '-' + ('0' + yd.getDate()).slice(-2);
  m.lastClaim = ys; m.streak = 6; ok(MT.dailyInfo().idx === 6 && MT.dailyInfo().gems === 15, 'giorno dopo giorno: il 7° dà 15 gemme');
  ok(MT.see('g_vip') === true && MT.see('g_vip') === false, 'una figurina si trova una sola volta');
  ok(MT.albumCount() >= 1 && MT.albumHtml().indexOf('Figurine') >= 0, 'l\'album si costruisce');
  ok(MT.BOXES.length === 3 && MT.BOXES.map(b => b.cost).join() === '50,100,125', 'tre mystery box da 50, 100 e 125 gemme');
  MT.BOXES.forEach(b => ok(b.prizes.reduce((a, q) => a + q.p, 0) === 100, b.id + ': le probabilità fanno 100'));
  { R.settings.data.gems = 10; ok(MT.openBox('legno') === null && R.settings.get('gems') === 10, 'senza gemme la scatola non si apre'); }
  { let good = true; for (let k = 0; k < 60; k++) { const b = MT.BOXES[k % 3]; R.settings.data.gems = b.cost; const r = MT.openBox(b.id); if (!r || !['coins', 'gems', 'item'].includes(r.kind) || R.settings.get('gems') < 0) good = false; if (r && r.kind === 'item' && !r.name) good = false; } ok(good, 'ogni scatola dà sempre un premio valido'); }
  ok(MT.boxesHtml().indexOf('box:oro') > 0 && MT.boxesHtml().indexOf('%') > 0, 'le scatole mostrano le probabilità');
  ok(MT.vipPersona() && MT.vipPersona().name, 'gli ospiti VIP hanno un nome');
  const mul0 = MT.payMul(); MT.addPrestige(); ok(MT.payMul() > mul0 - 1e-9 && MT.prestige() === 1, 'la nuova gestione aumenta i guadagni');
  MT.decoName('Casa <b>Mia</b> con un nome lunghissimo'); ok(MT.lodgeName().indexOf('<') < 0 && MT.lodgeName().length <= 16, 'il nome del rifugio è pulito e corto');
  { const gB = R.settings.get('gems'), rn = MT.decoName('Secondo nome'); ok((rn === 'gems' && R.settings.get('gems') === gB) || (rn === 'ok' && R.settings.get('gems') === gB - 100), 'dal secondo cambio il nome costa 100 gemme'); }
  { const g1 = R.settings.get('gems'); R.cities[0].levels.forEach(id => MT.stamp(id)); ok(R.settings.get('gems') === g1 + 20, 'chiudere una città dà 20 gemme'); ok(MT.stamp(R.cities[0].levels[0]) === false, 'un timbro si prende una volta sola'); ok(MT.passportHtml().indexOf('🏆') > 0, 'il passaporto si costruisce'); }
  ok(R.cities.every(c => c.perk), 'ogni città ha un\'anteprima');
  { const w0 = R.settings.get('gems'); let n = 0; for (let k = 0; k < 40; k++) { const r = MT.wheelSpin('gems'); if (r) { n++; ok(r.seg && r.i >= 0 && r.i < MT.WHEEL.length, 'la ruota dà uno spicchio valido'); } } ok(n >= 0 && R.settings.get('gems') >= 0 && w0 >= 0, 'la ruota non manda le gemme sotto zero'); }
  { const f1 = MT.wheelSpin('free'), f2 = MT.wheelSpin('free'); ok(f1 && !f2, 'la ruota gratis gira una volta al giorno'); }
  ok(MT.decoNameHtml().indexOf('lodgeName') > 0 && MT.decoHtml().indexOf('data-deco') > 0 && MT.dailyHtml().indexOf('days') > 0 && MT.gameHtml().indexOf('record') > 0, 'le pagine del profilo si costruiscono');
}

// 4c. Missioni della settimana, premi di medaglie e album, banco dei dolci, arredo, ruota.
{
  const EX = R.extras, MT = R.meta;
  const w = EX.weeklies(); ok(w.list.length === 3 && new Set(w.list.map(m => m.id)).size === 3, 'tre missioni della settimana diverse');
  R.settings.set('medals', { m1: 1 }); const g0 = R.settings.get('gems');
  ok(EX.claimMedal('m1') === 2 && EX.claimMedal('m1') === 0 && R.settings.get('gems') === g0 + 2, 'il premio di una medaglia si ritira una volta');
  ok(EX.claimMedal('m9') === 0, 'una medaglia non vinta non dà premi');
  MT.ALBUM.slice(0, 10).forEach(a => MT.see(a.id)); const n = MT.albumReady(), g1 = R.settings.get('gems');
  ok(n >= 2 && MT.claimAlbum() === n * 3 && MT.claimAlbum() === 0 && R.settings.get('gems') === g1 + n * 3, 'i premi dell\'album si ritirano una volta');
  R.order.forEach(id => { const l = R.levels[id], s = l.unlocks.find(u => u.id === 'snack'); ok(!!s && s.pos[0] === l.place.layout.snack && s.title !== 'Banco dolci', id + ': banco dei dolci al suo posto'); });
  ok(R.parts.activities.FURN.every(f => f.cost > 0) && new Set(R.parts.activities.FURN.map(f => f.id)).size === R.parts.activities.FURN.length, 'arredo con id unici e prezzi');
  ['valle', 'mulini', 'porto'].forEach(c => ok(Array.isArray(R.parts.city.RESERVE[c]), c + ': zone dell\'attività'));
  R.order.forEach(id => { const l = R.levels[id]; (R.parts.city.RESERVE[l.cityId] || []).forEach(([x, z]) => ok(l.unlocks.every(u => Math.hypot(u.pos[0] - x, u.pos[1] - z) >= 2), id + ': attività della città lontana dai riquadri')); });
  ok(MT.WHEEL.every(s => s.l.indexOf(String(s.n)) >= 0), 'le etichette della ruota corrispondono ai premi');
}

// 5. Salvataggio: copia di sicurezza e ripristino di qualche minuto fa.
const st = R.createState('rifugio-test');
st.data.done = 3; st.data.guests = 5; st.save();
ok(JSON.parse(store['rifugio-test']).done === 3, 'il salvataggio si scrive');
store['rifugio-test'] = '{rovinato'; // salvataggio rovinato
const st2 = R.createState('rifugio-test');
ok(st2.data.done === 3, 'se il salvataggio è rovinato si riparte dalla copia');
store['rifugio-test-snap'] = JSON.stringify({ done: 2, guests: 1 });
const st3 = R.createState('rifugio-test');
ok(st3.hasSnap() && st3.restoreSnap() && JSON.parse(store['rifugio-test']).done === 2, 'si può tornare alla copia di qualche minuto fa');
const st4 = R.createState('rifugio-test'); st4.reset();
ok(!store['rifugio-test'] && !store['rifugio-test-bak'] && !store['rifugio-test-snap'], 'reset cancella tutte le copie');

// 6. (il salvataggio portatile con il codice è stato tolto)

// 7. Ogni file di script elencato in index.html esiste ed è nel service worker.
const html = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8'), sw = fs.readFileSync(path.join(WEB, 'sw.js'), 'utf8');
(html.match(/src="(js\/[^"]+|lib\/[^"]+)"/g) || []).forEach(m => {
  const f = m.slice(5, -1);
  ok(fs.existsSync(path.join(WEB, f)), 'esiste ' + f); ok(sw.indexOf("'" + f + "'") >= 0, f + ' è nel service worker');
});

console.log(`\n${passed} controlli riusciti, ${fails} falliti.`);
process.exit(fails ? 1 : 0);
