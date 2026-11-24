# Il Rifugio

Gioco 3D progressivo per Android (arcade tycoon in un rifugio di montagna).

**Obiettivo: pubblicazione sul Google Play Store, con pubblicità e un eventuale shop a pagamento.** Ogni scelta tecnica (salvataggi, valute, interfaccia, librerie) deve restare compatibile con Google Play Billing, una piattaforma pubblicitaria (es. AdMob) e le regole del Play Store (privacy, consenso). Se una richiesta crea problemi per la pubblicazione, va detto all'utente.

- `rifugio-design.md`: meccaniche, numeri, sblocchi, obiettivi e stile. È la fonte di verità per il gameplay.
- `rifugio-prototipo.html`: prototipo originale in un solo file (Three.js r128). Resta come riferimento, non si modifica.
- `web/`: il gioco vero e proprio. HTML + JavaScript semplice con Three.js r128, senza strumenti di build. È un'app web installabile (PWA) su Android. Numeri, sblocchi e obiettivi del livello stanno in `web/js/levels/inverno.js`.
- `Changelog/CHANGELOG.md`: registro di tutte le aggiunte e modifiche, con le istruzioni per tornare indietro.

Regole:
- Ogni modifica al progetto va registrata in `Changelog/CHANGELOG.md` (nuova voce in cima). Prima di modificare un file esistente, copiane la versione precedente in `Changelog/backup/<data>_<descrizione>/`.
- Se cambi un file del gioco in `web/`, aumenta il numero di `CACHE` in `web/sw.js`, così i telefoni scaricano la versione nuova.
- Niente moduli ES né build: gli script sono classici e condividono l'oggetto globale `Rifugio`, così il gioco si apre anche con doppio clic su `web/index.html`.

Parla con l'utente in italiano.
