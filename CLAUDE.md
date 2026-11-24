# Il Rifugio

Gioco 3D progressivo per Android (arcade tycoon in un rifugio di montagna).

**Obiettivo: pubblicazione sul Google Play Store, con pubblicità e un eventuale shop a pagamento.** Ogni scelta tecnica (salvataggi, valute, interfaccia, librerie) deve restare compatibile con Google Play Billing, una piattaforma pubblicitaria (es. AdMob) e le regole del Play Store (privacy, consenso). Se una richiesta crea problemi per la pubblicazione, va detto all'utente.

- `rifugio-design.md`: meccaniche, numeri, sblocchi, obiettivi e stile. È la fonte di verità per il gameplay.
- `rifugio-prototipo.html`: prototipo originale in un solo file (Three.js r128). Resta come riferimento, non si modifica.
- `web/`: il gioco vero e proprio. HTML + JavaScript semplice con Three.js r128 (in `web/lib/`), senza strumenti di build. Numeri, sblocchi e obiettivi del livello stanno in `web/js/levels/inverno.js`.
- `app/`: l'app Android (Capacitor). Il caricatore `app/boot/index.html` a ogni avvio scarica da GitHub i file di `web/` dell'ultimo commit del branch di sviluppo; la copia di `web/` dentro l'APK serve solo senza rete.
- `.github/workflows/apk.yml`: costruisce l'APK su GitHub Actions e lo pubblica nella release `apk-test`.
- `Changelog/CHANGELOG.md`: registro delle aggiunte e modifiche.

Regole:
- Il progetto usa git: le versioni precedenti dei file stanno nella storia dei commit, non servono copie di backup. Ogni modifica va comunque registrata in `Changelog/CHANGELOG.md` (nuova voce in cima), con il commit a cui tornare.
- Le modifiche al gioco (`web/`) arrivano sul telefono appena fatto il push sul branch di sviluppo: niente nuovo APK. Serve un nuovo APK solo se cambia `app/` o se si aggiungono immagini o font (il caricatore li prende dalla copia nell'APK).
- Se cambi un file del gioco in `web/`, aumenta il numero di `CACHE` in `web/sw.js` (serve alla versione PWA nel browser).
- Niente moduli ES né build: gli script sono classici e condividono l'oggetto globale `Rifugio`, così il gioco si apre anche con doppio clic su `web/index.html` e il caricatore dell'app può inserirli nella pagina.
- Niente risorse da server esterni nel gioco (CDN, Google Fonts): tutto dentro `web/`, per l'uso offline e per la privacy (GDPR).

Parla con l'utente in italiano.
