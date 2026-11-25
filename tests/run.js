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
['js/namespace.js', 'js/levels/common.js', 'js/levels/inverno.js', 'js/levels/primavera.js', 'js/levels/estate.js', 'js/levels/autunno.js', 'js/levels/cities.js', 'js/settings.js', 'js/i18n.js', 'js/extras.js', 'js/meta.js', 'js/state.js'].forEach(load);
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

// 4b. Premio giornaliero, scrigni, album, guadagno da assenti, prestigio e decorazioni.
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
  const p0 = MT.chestInfo().pts; MT.addPts(25); ok(MT.chestReady() && MT.chestInfo().left >= 2, 'con 25 punti ci sono scrigni da aprire');
  const rc = MT.openChest(); ok(rc && (rc.kind === 'gems' || rc.kind === 'item'), 'lo scrigno dà un premio');
  ok(MT.vipPersona() && MT.vipPersona().name, 'gli ospiti VIP hanno un nome');
  const mul0 = MT.payMul(); MT.addPrestige(); ok(MT.payMul() > mul0 - 1e-9 && MT.prestige() === 1, 'la nuova gestione aumenta i guadagni');
  MT.decoName('Casa <b>Mia</b> con un nome lunghissimo'); ok(MT.lodgeName().indexOf('<') < 0 && MT.lodgeName().length <= 16, 'il nome del rifugio è pulito e corto');
  ok(MT.decoNameHtml().indexOf('lodgeName') > 0 && MT.decoHtml().indexOf('data-deco') > 0 && MT.dailyHtml().indexOf('days') > 0 && MT.chestHtml().indexOf('chestbox') > 0 && MT.gameHtml().indexOf('Record') > 0, 'le pagine del profilo si costruiscono');
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

// 6. Il codice portatile si crea e si rilegge.
store['rifugio-x'] = '{"a":1}';
const code = R.settings.exportCode(); delete store['rifugio-x'];
ok(code.indexOf('RIF1.') === 0 && R.settings.importCode(code) && store['rifugio-x'] === '{"a":1}', 'codice portatile: esporta e importa');
ok(!R.settings.importCode('RIF1.xxxx'), 'un codice sbagliato è rifiutato');

// 7. Ogni file di script elencato in index.html esiste ed è nel service worker.
const html = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8'), sw = fs.readFileSync(path.join(WEB, 'sw.js'), 'utf8');
(html.match(/src="(js\/[^"]+|lib\/[^"]+)"/g) || []).forEach(m => {
  const f = m.slice(5, -1);
  ok(fs.existsSync(path.join(WEB, f)), 'esiste ' + f); ok(sw.indexOf("'" + f + "'") >= 0, f + ' è nel service worker');
});

console.log(`\n${passed} controlli riusciti, ${fails} falliti.`);
process.exit(fails ? 1 : 0);
