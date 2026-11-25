// Shop: gemme e miglioramenti speciali. IMPORTANTE: finché non c'è un fornitore di pagamenti vero (Google Play Billing), nessun
// acquisto può avvenire e nessuno viene addebitato. Il catalogo, i prezzi, il blocco per i genitori e gli effetti sono pronti.
// Fornitori: "none" (predefinito: non disponibile), "prova" (solo menu Debug: concede tutto senza addebito, segnato come prova)
// e, in futuro, quello di Google Play: va registrato con R.shop.setProvider({ name, ready(), buy(product), restore() }).
(function (R) {
  'use strict';
  const st = R.settings;
  const eur = p => '€ ' + p.toFixed(2).replace('.', ',');

  // Gemme (valuta per l'aspetto dell'omino) e miglioramenti speciali permanenti. Niente scatole a sorpresa: si vede sempre cosa si compra.
  const PRODUCTS = [
    { id: 'gems_60', kind: 'gems', gems: 60, price: 0.99, name: '60 gemme', emoji: '💎', desc: '' },
    { id: 'gems_220', kind: 'gems', gems: 220, price: 2.99, name: '220 gemme', emoji: '💎', desc: '' },
    { id: 'gems_500', kind: 'gems', gems: 500, price: 5.99, name: '500 gemme', emoji: '💎', desc: '' },
    { id: 'gems_1100', kind: 'gems', gems: 1100, price: 11.99, name: '1100 gemme', emoji: '💎', desc: '' },
    { id: 'boost', kind: 'perm', price: 4.99, name: 'Ospiti generosi', emoji: '🪙', desc: 'Ospiti pagano +50%' },
    { id: 'goldtool', kind: 'perm', price: 2.99, name: 'Attrezzi d\'oro', emoji: '✨', desc: 'Ascia e motosega +15%' },
    { id: 'cosmetics', kind: 'perm', price: 1.99, name: 'Pacchetto stile', emoji: '😇', desc: 'Aureola, ali, 4 colori' }
  ];
  const byId = id => PRODUCTS.find(p => p.id === id);

  const providers = {
    none: { name: 'none', ready: () => false, buy: () => Promise.resolve({ ok: false, reason: 'unavailable' }), restore: () => Promise.resolve({ ok: false, reason: 'unavailable' }) },
    prova: { name: 'prova', ready: () => true, buy: p => Promise.resolve({ ok: true, test: true, id: p.id }), restore: () => Promise.resolve({ ok: true, test: true }) }
  };
  let real = null, allowTest = false;
  const provider = () => (allowTest && st.get('shopTest')) ? providers.prova : (real || providers.none);

  // Concede il prodotto: gemme aggiunte al conto, miglioramenti segnati come acquistati (con l'indicazione "prova" se non erano veri).
  function grant(p, test) {
    if (p.kind === 'gems') st.addGems(p.gems);
    else { st.data.purchases[p.id] = { t: Date.now(), test: !!test }; st.save(); }
  }

  // Token di acquisto già concessi (per non dare due volte le stesse gemme dopo un ripristino).
  const granted = t => (st.data.granted || []).indexOf(t) >= 0;
  function markToken(t) { if (!t) return; st.data.granted = (st.data.granted || []).concat(t).slice(-60); st.save(); }

  R.shop = {
    products: PRODUCTS, eur, byId,
    has: id => !!st.data.purchases[id],
    isTest: id => !!(st.data.purchases[id] && st.data.purchases[id].test),
    // Il menu Debug abilita il fornitore "prova" (solo per provare lo shop, senza addebiti).
    enableTest(on) { allowTest = !!on; },
    testAllowed: () => allowTest,
    setProvider(p) { real = p; },
    ready: () => provider().ready(),
    providerName: () => provider().name,
    // Avvia l'acquisto (il blocco per i genitori è chiesto prima dal menu). Risultato: 'ok', 'cancel' o 'unavailable'.
    async buy(id) {
      const p = byId(id); if (!p) return 'unavailable';
      if (p.kind === 'perm' && this.has(id)) return 'ok';
      const prov = provider();
      if (!prov.ready()) return 'unavailable';
      try {
        const r = await prov.buy(p);
        if (r && r.ok) {
          grant(p, r.test); markToken(r.token);          // prima si concede...
          if (r.finish) await r.finish();               // ...poi si "consuma" l'acquisto (gemme), così si può ricomprare
          return 'ok';
        }
        return r && r.reason === 'cancel' ? 'cancel' : r && r.reason === 'pending' ? 'pending' : 'unavailable';
      } catch (e) { return 'cancel'; }
    },
    // Ripristina i miglioramenti permanenti già comprati e recupera acquisti rimasti a metà (gemme non ancora concesse).
    async restore() {
      const prov = provider(); if (!prov.ready()) return 'unavailable';
      try {
        const r = await prov.restore(); if (!(r && r.ok)) return 'unavailable';
        for (const x of (r.purchases || [])) {
          const p = byId(x.id); if (!p) continue;
          if (p.kind === 'perm') { if (!this.has(p.id)) grant(p, !!r.test); }
          else if (x.token && !granted(x.token)) { grant(p, !!r.test); markToken(x.token); if (x.finish) await x.finish(); }   // gemme pagate ma mai concesse
          else if (x.finish) await x.finish();                                                                              // già concesse: si consuma e basta
        }
        (r.ids || []).forEach(id => { const p = byId(id); if (p && p.kind === 'perm' && !this.has(id)) grant(p, !!r.test); });
        return 'ok';
      } catch (e) { return 'unavailable'; }
    },
    // All'avvio con il Play: rimette i miglioramenti, e toglie quelli rimborsati (solo acquisti veri, mai quelli di prova).
    async syncEntitlements() {
      if (!real || !real.ready()) return;
      try {
        const r = await real.restore(); if (!(r && r.ok)) return;
        await this.restore();
        PRODUCTS.filter(p => p.kind === 'perm').forEach(p => { if (this.has(p.id) && !this.isTest(p.id) && (r.ids || []).indexOf(p.id) < 0) { delete st.data.purchases[p.id]; st.save(); } });
      } catch (e) { /* ignorato */ }
    },
    // Prezzo da mostrare: quello del negozio (obbligatorio) se c'è, altrimenti quello del catalogo.
    priceOf(p) { const i = R.billing && R.billing.info && R.billing.info[p.id]; return i && i.priceString ? i.priceString : eur(p.price); },
    clearTest() { Object.keys(st.data.purchases).forEach(k => { if (st.data.purchases[k].test) delete st.data.purchases[k]; }); st.save(); }
  };
})(window.Rifugio);
