// Pubblicità: SOLO video a premio, scelti dal giocatore ("guarda un video, ricevi gemme"). Niente banner, niente annunci a sorpresa.
// Usa Google AdMob tramite il plugin @capacitor-community/admob (dentro l'app Android). Fuori dall'app non c'è pubblicità.
//
// Privacy: il gioco è pensato anche per bambini, quindi gli annunci sono richiesti come "rivolti ai minori" (CHILD_DIRECTED): niente annunci
// personalizzati, contenuto per tutti, e il consenso passa dal modulo di Google (UMP). I dati degli utenti NON vengono venduti né ceduti.
// IDENTIFICATIVI: quelli qui sotto sono di PROVA di Google (mostrano annunci finti). Per la pubblicazione: crea l'app e l'unità "Con premio"
// in AdMob, metti l'id dell'unità in REWARDED_ID, TESTING = false, e l'id dell'app nelle impostazioni dei workflow (variabile ADMOB_APP_ID).
(function (R) {
  'use strict';
  const st = R.settings;
  const CFG = {
    TESTING: true,
    REWARDED_ID: 'ca-app-pub-3940256099942544/5224354917', // unità di prova Google "video con premio" (Android)
    CHILD_DIRECTED: true,
    GEMS: 5,        // gemme per ogni video guardato fino in fondo
    PER_DAY: 6,     // video al giorno
    COOLDOWN: 120   // secondi fra un video e il successivo
  };
  const plug = () => (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) || null;
  const isAndroid = () => { try { return window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() === 'android'; } catch (e) { return false; } };
  const today = () => new Date().toISOString().slice(0, 10);
  let ready = false, sim = false, busy = false;

  function usage() { const u = st.data.adUse; return u && u.day === today() ? u : { day: today(), n: 0, last: 0 }; }
  function mark() { const u = usage(); st.data.adUse = { day: u.day, n: u.n + 1, last: Date.now() }; st.save(); }

  // Avvio: modulo di consenso di Google (se serve) e poi l'SDK, con le impostazioni per i minori.
  async function init() {
    const P = plug(); if (!P || !isAndroid()) return false;
    try {
      let ci = await P.requestConsentInfo({ tagForUnderAgeOfConsent: CFG.CHILD_DIRECTED });
      if (ci.isConsentFormAvailable && ci.status === 'REQUIRED') ci = await P.showConsentForm();
      if (!ci.canRequestAds) return false;
      await P.initialize({ tagForChildDirectedTreatment: CFG.CHILD_DIRECTED, tagForUnderAgeOfConsent: CFG.CHILD_DIRECTED, maxAdContentRating: 'General' });
      ready = true; return true;
    } catch (e) { return false; }
  }

  // Un video a premio. Risultati: 'ok' (premio dato), 'limit' (finiti per oggi), 'wait' (troppo presto), 'closed' (chiuso prima della fine),
  // 'failed' (nessun annuncio disponibile), 'busy', 'unavailable'.
  async function watch(gems) { // gems: premio in gemme (di norma CFG.GEMS; 0 se il premio è un altro, es. raddoppio delle monete)
    if (busy) return 'busy';
    const u = usage();
    if (u.n >= CFG.PER_DAY) return 'limit';
    if (R.ads.wait() > 0) return 'wait';
    if (!ready && !sim) return 'unavailable';
    busy = true;
    try {
      let earned = false;
      if (ready) {
        const P = plug(), hs = [];
        try {
          await P.prepareRewardVideoAd({ adId: CFG.REWARDED_ID, isTesting: CFG.TESTING, npa: CFG.CHILD_DIRECTED || !(R.consent && R.consent.ads()) });
          await new Promise(resolve => {
            const done = () => resolve();
            P.addListener('onRewardedVideoAdReward', () => { earned = true; }).then(h => hs.push(h));
            P.addListener('onRewardedVideoAdDismissed', done).then(h => hs.push(h));
            P.addListener('onRewardedVideoAdFailedToShow', done).then(h => hs.push(h));
            setTimeout(done, 180000);
            P.showRewardVideoAd().catch(done);
          });
        } catch (e) { return 'failed'; }
        finally { hs.forEach(h => { try { h.remove(); } catch (e2) { /* ignorato */ } }); }
      } else { earned = true; } // simulazione (solo menu Debug): nessun annuncio vero
      if (!earned) return 'closed';
      mark(); st.addGems(gems == null ? CFG.GEMS : gems);
      return 'ok';
    } finally { busy = false; }
  }

  R.ads = {
    cfg: CFG, init, watch,
    available: () => ready || sim, simulated: () => !ready && sim, enableSim(on) { sim = !!on; },
    left: () => Math.max(0, CFG.PER_DAY - usage().n),
    wait: () => Math.max(0, Math.ceil(CFG.COOLDOWN - (Date.now() - usage().last) / 1000))
  };
})(window.Rifugio);
