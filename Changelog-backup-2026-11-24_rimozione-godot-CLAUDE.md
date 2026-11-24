# Il Rifugio

Gioco 3D progressivo per Android (arcade tycoon in un rifugio di montagna).

- `rifugio-design.md`: meccaniche, numeri, sblocchi, obiettivi e stile. È la fonte di verità per il gameplay.
- `rifugio-prototipo.html`: prototipo originale in un solo file (Three.js r128). Resta come riferimento, non si modifica.
- `web/`: il gioco vero e proprio. HTML + JavaScript semplice con Three.js r128, senza strumenti di build. È un'app web installabile (PWA) su Android. Numeri, sblocchi e obiettivi del livello stanno in `web/js/levels/inverno.js`.
- `godot/`: tentativo di porting su Godot 4, accantonato il 2026-11-24 (mai provato in Godot). Non si usa.
- `Changelog/CHANGELOG.md`: registro di tutte le aggiunte e modifiche, con le istruzioni per tornare indietro.

Regole:
- Ogni modifica al progetto va registrata in `Changelog/CHANGELOG.md` (nuova voce in cima). Prima di modificare un file esistente, copiane la versione precedente in `Changelog/backup/<data>_<descrizione>/`.
- Se cambi un file del gioco in `web/`, aumenta il numero di `CACHE` in `web/sw.js`, così i telefoni scaricano la versione nuova.
- Niente moduli ES né build: gli script sono classici e condividono l'oggetto globale `Rifugio`, così il gioco si apre anche con doppio clic su `web/index.html`.

Parla con l'utente in italiano.
