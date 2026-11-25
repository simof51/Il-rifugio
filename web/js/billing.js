// Fornitore di pagamenti: Google Play Billing tramite il plugin @capgo/native-purchases (dentro l'app Android).
// Funziona solo se l'app è installata dal Google Play (o da una traccia di test) e i prodotti esistono nel Play Console con gli stessi id
// (gems_60, gems_220, gems_500, gems_1100, boost, goldtool, cosmetics). Fuori dall'app (browser, APK di prova) resta "non disponibile".
//
// Sicurezza: l'acquisto è controllato sul telefono (stato "acquistato" dal Play). Per un controllo serio contro i trucchi serve un
// server che verifichi i token di acquisto con le API di Google: si aggancia con R.shop.verifier (vedi sotto). Senza server il gioco
// si fida del Play: va bene per partire, non per un'app con tanti soldi in gioco.
(function (R) {
  'use strict';
  const INAPP = 'inapp';
  const plug = () => (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.NativePurchases) || null;
  const isAndroid = () => { try { return window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() === 'android'; } catch (e) { return false; } };
  const purchased = t => !t || t.purchaseState === undefined || String(t.purchaseState) === '1' || String(t.purchaseState).toUpperCase() === 'PURCHASED';
  const pending = t => !!t && (String(t.purchaseState) === '2' || String(t.purchaseState).toUpperCase() === 'PENDING');

  let supported = false, loaded = false;
  const info = {}; // id → { title, priceString } dal Play (i prezzi mostrati sono SEMPRE quelli del negozio)

  // Verifica opzionale lato server: async (prodotto, transazione) → true se valida. Predefinito: si fida del Play.
  R.shop.verifier = null;

  const provider = {
    name: 'google-play',
    ready: () => supported,
    async buy(p) {
      const P = plug(); if (!P) return { ok: false, reason: 'unavailable' };
      try {
        // Gemme: non si consumano subito. Prima si concedono, poi si consuma il token (finish): così, se l'app si chiude nel mezzo, non si perdono.
        // Miglioramenti permanenti: il plugin li conferma (acknowledge) da solo, come chiede il Play entro 3 giorni.
        const gems = p.kind === 'gems';
        const t = await P.purchaseProduct({ productIdentifier: p.id, productType: INAPP, quantity: 1, isConsumable: false, autoAcknowledgePurchases: !gems });
        if (pending(t)) return { ok: false, reason: 'pending' };
        if (!purchased(t)) return { ok: false, reason: 'unavailable' };
        if (R.shop.verifier && !(await R.shop.verifier(p, t))) return { ok: false, reason: 'unavailable' };
        const token = t && t.purchaseToken;
        return { ok: true, id: p.id, token, order: t && t.orderId, finish: gems && token ? () => P.consumePurchase({ purchaseToken: token }).catch(() => {}) : null };
      } catch (e) {
        return { ok: false, reason: /cancel|user/i.test(String(e && (e.message || e))) ? 'cancel' : 'unavailable' };
      }
    },
    // Riprende i miglioramenti permanenti già comprati (nuovo telefono, reinstallazione).
    async restore() {
      const P = plug(); if (!P) return { ok: false, reason: 'unavailable' };
      try {
        try { await P.restorePurchases(); } catch (e) { /* alcune versioni non lo richiedono */ }
        const r = await P.getPurchases({ productType: INAPP });
        const list = (r.purchases || []).filter(purchased).map(t => ({ id: t.productIdentifier, token: t.purchaseToken, finish: () => (t.purchaseToken ? P.consumePurchase({ purchaseToken: t.purchaseToken }).catch(() => {}) : Promise.resolve()) })).filter(x => x.id);
        return { ok: true, ids: list.map(x => x.id), purchases: list };
      } catch (e) { return { ok: false, reason: 'unavailable' }; }
    }
  };

  // Avvio: controlla che il Play sia disponibile, scarica i prezzi veri e rimette i miglioramenti già acquistati.
  async function init() {
    const P = plug();
    if (!P || !isAndroid()) return false;
    try {
      const b = await P.isBillingSupported(); supported = !!(b && b.isBillingSupported);
      if (!supported) return false;
      R.shop.setProvider(provider);
      try {
        const r = await P.getProducts({ productIdentifiers: R.shop.products.map(p => p.id), productType: INAPP });
        (r.products || []).forEach(x => { info[x.identifier] = { title: x.title, priceString: x.priceString }; });
        loaded = true;
      } catch (e) { /* senza prezzi del negozio lo shop resta in "non disponibile" */ }
      await R.shop.syncEntitlements();
      return true;
    } catch (e) { return false; }
  }

  R.billing = { init, provider, info, available: () => supported, pricesLoaded: () => loaded };
})(window.Rifugio);
