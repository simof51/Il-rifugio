# Changelog: Il Rifugio

Registro di tutto quello che aggiungiamo e modifichiamo, con le istruzioni per tornare indietro.
Le voci più recenti stanno in cima.

## Come usare questo registro
- Ogni voce ha una versione, una data, cosa è cambiato e una sezione **Per tornare indietro**.
- Dalla v0.5 il progetto è su git (GitHub, `simof51/Il-rifugio`): per tornare indietro si recuperano i file dal commit indicato (`git checkout <commit> -- <file>`). Le copie in `Changelog/backup/` delle voci fino alla v0.4 non ci sono più: quelle versioni stanno nel commit `a7e0cd4` (branch `Old`).

---

## v0.5.7 · 2026-11-24 · Livello Estate, 36 obiettivi a stagione, animazioni nuove, grafica per bambini

**Richiesto**
- Taglio più naturale e fluido, con i gomiti alle braccia dell'omino.
- Legna e bevande non devono sparire: devono volare verso il camino o l'ospite.
- Aggiungere il livello Estate e portare gli obiettivi a 30-40 per stagione, ognuno sotto i 3,5 minuti.
- Grafica più accattivante per un pubblico di bassa età.

**Aggiunto**
| File | Cosa |
|---|---|
| `web/js/levels/estate.js` | Livello 2: estate al lago (prato, lago con spiaggia, paperelle e barchetta, fiori, farfalle, alberi da frutto, griglie, limonata, campeggiatori) con 36 obiettivi. |
| `web/js/levels/inverno.js` | Riscritto: 36 obiettivi (erano 10), 14 sblocchi (erano 6), tema e testi del livello. Nuovi sblocchi: ascia affilata, camini isolati, cartello (più ospiti), zaino gigante, cioccolata veloce, 2° boscaiolo, lanterne, pupazzo di neve. |
| `web/js/main.js`, `index.html` | Scelta Inverno/Estate nella finestra iniziale (ogni livello ha il suo salvataggio: `rifugio-v2` per l'inverno, `rifugio-estate-v1` per l'estate); tasto "Vai al prossimo livello" a fine livello. |

**Modificato**
| File | Cosa |
|---|---|
| `web/js/build.js` | Braccia con spalla, gomito e avambraccio; busto su perno (si inclina e ruota); colpo d'ascia in un ciclo continuo (carica sopra la testa, pausa, colpo, seguito) che si fonde con camminata e respiro; lancio con le braccia. Faccia con occhioni, sorriso e guanciotte; sciarpa. Alberi da frutto per l'estate. Colori più vivaci. |
| `web/js/game.js` | Legna, tazze e monete volano ad arco (dall'albero allo zaino, dallo zaino al camino o all'ospite, dalle monete all'omino); il fuoco sale quando il pezzo arriva. Scheggie di legno, scintille, coriandoli e cuoricini; salto di gioia a ogni obiettivo. Bandierine sulle casette, monete che girano. Nuove statistiche (`trees`) e premio per obiettivo (10/15/20 monete d'inverno, 15/20/25 d'estate). Taglio ogni 0,45 s (era 0,35) per avere un colpo leggibile. |
| `web/css/style.css`, `web/js/hud.js` | Indicatori colorati che rimbalzano, schede più tonde, barra a gradiente. |
| `web/sw.js` | `CACHE` v9, aggiunto `estate.js`. |

**Nota sui tempi**
- La durata massima di 3,5 minuti per obiettivo è stimata sui numeri del gioco (flusso di ospiti, consumo del fuoco, taglio), non misurata giocando.
- Estate sbloccata fin dall'inizio, per poterla provare.

**Per tornare indietro**
- `git checkout 7a9e0ff -- web CLAUDE.md`

---

## v0.5.6 · 2026-11-24 · Abeti morbidi, niente lampeggio sul sentiero, salvataggio più sicuro

**Richiesto**
- Fogliame degli alberi più realistico: stilizzato ma non poligonale.
- Brutto lampeggio (flicker) sul camminamento davanti al rifugio mentre l'omino si muove.
- Con gli aggiornamenti non si deve perdere nulla (dopo un aggiornamento i progressi erano ripartiti da zero ma le monete no).

**Modificato**
| File | Cosa |
|---|---|
| `web/js/build.js` | Chioma: sei piani morbidi a 24 lati con profilo curvo, bordo a ciuffi che pende e cappelli di neve a ciuffi (niente più facce a spigolo). |
| `web/js/game.js` | Lampeggio: la luce del sole segue il giocatore a scatti esatti di un pixel della mappa d'ombra (prima le ombre "nuotavano"); `bias` e `normalBias` sulle ombre; sentiero senza ombre proprie, con altezze diverse per i tre tratti e `polygonOffset`; camera con near 4 e far 130 (prima 0,1 e 200) per una profondità più precisa. Salvataggio ogni 2 s (prima 3). |
| `web/js/state.js` | Salvataggio con copia di riserva (`rifugio-v2-bak`) che non viene mai sostituita da una partita meno avanzata; all'avvio vince la copia più avanzata. Il tasto Ricomincia cancella entrambe. |
| `web/js/main.js` | Chiede al sistema di non cancellare i dati (`navigator.storage.persist`). |
| `web/sw.js` | `CACHE` da v7 a v8. |

**Nota sui salvataggi**
- Gli aggiornamenti del gioco (`web/`) e i nuovi APK con la stessa firma non toccano il salvataggio. Si perde solo disinstallando l'app (successo con gli APK v0.5.2 e v0.5.4, per colpa della firma cambiata ogni volta). Non ho trovato nel codice nessun punto che azzeri solo i progressi: se ricapita, annotare cosa si vedeva.

**Per tornare indietro**
- `git checkout 8e74793 -- web/js/build.js web/js/game.js web/js/state.js web/js/main.js web/sw.js`

---

## v0.5.5 · 2026-11-24 · Risoluzione piena, abeti più veri, omini stickman

**Richiesto**
- La risoluzione era calata: ripristinarla.
- Gli alberi devono sembrare più alberi che coni verdi.
- Gli omini devono essere più umani e meno conici, in stile stickman senza esagerare.

**Modificato**
| File | Cosa |
|---|---|
| `web/js/game.js` | Risoluzione di nuovo piena (fino a 2x) e mai abbassata da sola: tolta la risoluzione adattiva della v0.5.3. Restano niente antialias e ombre PCF semplici. Zaino di legna più vicino alla schiena (più stretta). |
| `web/js/build.js` | Abete: tronco più alto e sei piani di cono sovrapposti e ruotati, con due verdi alternati e un cappello di neve su ogni piano; chioma e neve sono due mesh fuse e condivise da tutti gli abeti (3 mesh per albero invece di 6). Omino: busto stretto, testa grande e tonda, berretto basso con pon pon al posto del cono, braccia e gambe sottili. |
| `web/sw.js` | `CACHE` da v6 a v7. |

**Per tornare indietro**
- `git checkout ea9cbbb -- web/js/game.js web/js/build.js web/sw.js`

---

## v0.5.4 · 2026-11-24 · Firma fissa dell'APK

**Problema**
- Ogni APK costruito da GitHub Actions usciva con una chiave di firma diversa (verificato sui certificati degli APK v0.5, v0.5.2, v0.5.3): copiare `debug.keystore` in `~/.android` non bastava, e per aggiornare l'app bisognava disinstallarla perdendo i salvataggi.

**Modificato**
| File | Cosa |
|---|---|
| `.github/workflows/apk.yml` | La firma di debug è dichiarata nel `build.gradle` con `app/debug.keystore` (nome della chiave letto con `keytool`, password `android`). A fine build scrive l'impronta SHA-256 della firma nelle annotazioni della corsa, per controllare che sia sempre la stessa. |

**Per tornare indietro**
- `git checkout 93656ca -- .github/workflows/apk.yml`

---

## v0.5.3 · 2026-11-24 · Gioco più fluido, avvio senza scritte, barra di aggiornamento

**Richiesto**
- Il gioco era diventato un po' laggoso: ottimizzarlo.
- All'avvio non mostrare la scritta di aggiornamento e il numero di versione; se serve aggiornare, mostrare una barra di avanzamento con i MB da scaricare e scaricati e la scritta "Aggiornamento app".

**Modificato**
| File | Cosa |
|---|---|
| `web/js/game.js` | Niente antialias; risoluzione massima 1,5x (prima 2x) che scende da sola (fino a 0,75x) se la media dei fotogrammi supera 26 ms; ombre `PCFShadowMap` (prima `PCFSoftShadowMap`); un solo `Vector3` riusato per la camera. |
| `web/js/build.js` | Meno poligoni: cilindri a 16 segmenti (erano 24), chiome degli abeti a 14 (erano 20), scatole arrotondate con 5 divisioni per lato (erano 7). |
| `web/js/hud.js` | L'interfaccia HTML si riscrive solo quando un valore cambia (testi, barre, posizione delle etichette): prima si toccava il DOM a ogni fotogramma. |
| `web/sw.js` | `CACHE` da v5 a v6. |
| `app/boot/index.html` | Avvio normale con schermata vuota (nessuna scritta). Se ci sono file da scaricare compare "Aggiornamento app" con barra e MB scaricati / totali (dimensioni dall'elenco file del commit; se non arrivano, barra animata e solo i MB scaricati). |

**Per tornare indietro**
- `git checkout dfc17e7 -- web/js/game.js web/js/build.js web/js/hud.js web/sw.js app/boot/index.html`

---

## v0.5.2 · 2026-11-24 · L'app richiede internet per avviarsi

**Richiesto**
- L'app deve avere internet per avviarsi e deve essere aggiornata; altrimenti mostra un errore con i tasti "Riprova" ed "Esci".

**Modificato**
| File | Cosa |
|---|---|
| `app/boot/index.html` | Tolti i ripieghi offline (ultimo commit salvato e copia del gioco nell'APK). Se non riesce a leggere l'ultimo commit o a scaricare il gioco, mostra "Serve internet" con **Riprova** ed **Esci**. Attesa massima per GitHub da 6 a 10 secondi. |
| `app/package.json` | Aggiunto `@capacitor/app` 8.1.2, che serve al tasto Esci (`exitApp`). |

**Nota**
- Serve un nuovo APK (cambia `app/`): lo costruisce GitHub Actions al push.
- Senza rete l'app non parte più. Per il Play Store va ricontrollato: codice scaricato da fuori non è ammesso.

**Per tornare indietro**
- `git checkout 338ff57 -- app/boot/index.html app/package.json`

---

## v0.5.1 · 2026-11-24 · Il camino pieno non accetta più legna

**Richiesto**
- Quando la saturazione del camino è al massimo, non deve più accettare legna dal giocatore.

**Modificato**
| File | Cosa |
|---|---|
| `web/js/game.js` | Il camino (giocatore e boscaiolo) accetta un pezzo solo se ci sta intero (`fuel + 1 <= fuel_max`). Prima bastava `fuel < fuel_max`: con 9,9 su 10 il pezzo veniva preso e quasi tutto andava sprecato. |
| `web/sw.js` | `CACHE` da v4 a v5. |

**Per tornare indietro**
- `git checkout f072b3b -- web/js/game.js web/sw.js`

---

## v0.5 · 2026-11-24 · Progetto su git, tutto dentro il progetto, APK Android che si aggiorna da solo

**Richiesto**
- Ricostruire la struttura del progetto su git (il caricamento dal sito di GitHub aveva appiattito le cartelle: `web-js-game.js` invece di `web/js/game.js`, e il gioco non partiva).
- Un APK da installare sul telefono, che riceva le modifiche in tempo reale.

**Riorganizzato**
- Cartelle `web/` e `Changelog/` ripristinate come erano sul PC.
- Tolti i 17 file di backup: le versioni precedenti stanno nella storia di git (commit `a7e0cd4`, branch `Old`).
- `CLAUDE.md`: regole aggiornate per git e per l'app Android.

**Aggiunto**
| File | Cosa |
|---|---|
| `web/lib/three.min.js` | Three.js r128 dentro il progetto (prima veniva da cdnjs). |
| `web/fonts/fredoka.woff2`, `web/fonts/OFL.txt` | Font Fredoka dentro il progetto (prima da Google Fonts, che trasmetteva l'IP del giocatore a Google senza consenso). Licenza OFL. |
| `app/` | App Android con Capacitor 8: `boot/index.html` (caricatore), `capacitor.config.json` (id `it.ilrifugio.gioco`), `prepare-www.js`, `debug.keystore` (chiave **di prova**, non per il Play Store), `res/splash.png`. |
| `.github/workflows/apk.yml` | Costruisce l'APK su GitHub Actions e lo pubblica nella release `apk-test`. |

**Come funziona l'aggiornamento in tempo reale:** a ogni avvio il caricatore chiede a GitHub l'ultimo commit del branch `claude/il-rifugio-old-branch-d4kcaa` e scarica da lì HTML, CSS e script di `web/` (Three.js, font e icone li prende dalla copia nell'APK). Mentre si gioca, ogni 90 s controlla se c'è un commit nuovo e mostra il pulsante "Nuova versione: tocca per aggiornare". Senza rete usa l'ultima versione scaricata; se non c'è nemmeno quella, la copia di `web/` inclusa nell'APK. Nella finestra iniziale si vede la versione in uso.

**Modificato**
- `web/index.html`: font e Three.js locali, riga della versione, pulsante di aggiornamento.
- `web/js/main.js`: niente service worker dentro l'app, versione in uso, controllo degli aggiornamenti.
- `web/css/style.css`: stile del pulsante di aggiornamento.
- `web/sw.js`: cache `rifugio-cache-v4`, mette in cache anche `lib/` e `fonts/`, non tocca più richieste esterne.

**Verificato** nel browser di prova (Chromium), con GitHub simulato:
- Il gioco parte senza nessuna richiesta a server esterni.
- Caricatore: versione scaricata, uso offline con la versione in cache, ripiego sulla copia interna senza rete né cache, pulsante di aggiornamento che ricarica la versione nuova.
- Il progetto Android si genera (`cap add android`, `cap sync`).

**Non verificato:** la compilazione dell'APK e l'installazione su un telefono vero (qui non c'è l'Android SDK: l'APK lo costruisce GitHub Actions).

**Per tornare indietro a v0.4:** i file della v0.4 sono nel commit `a7e0cd4` (branch `Old`).

---

## v0.4 · 2026-11-24 · Grafica morbida, ascia orizzontale, abeti che reagiscono, stanze unite

**Richiesto**
- Grafica con linee più morbide e meno poligonali.
- Colpo d'ascia orizzontale invece che verticale.
- Abeti semitrasparenti quando ci si avvicina, per vedere sempre il personaggio.
- Abeti che si muovono in base ai colpi invece di tremare.
- Stanze nuove che si uniscono alle altre invece di restare separate.

**Modificato**
| File | Cosa |
|---|---|
| `web/js/build.js` | Riscritto. Materiali Phong (luce per pixel) al posto di Lambert. Scatole con spigoli arrotondati (`roundBoxGeo`). Cilindri a 24 segmenti invece di 6-10, sfere più fitte, spalle arrotondate, arti con estremità tonde. Le geometrie sono condivise in cache. Braccia con rotazione in ordine YXZ e colpo d'ascia orizzontale: braccia tese in avanti, carica di lato, colpo trasversale. Nuova ascia: il manico prosegue il braccio e la lama in acciaio guarda nella direzione del colpo. Ogni abete ha materiali propri (per la trasparenza), un gruppo `fall` che si inclina e cade attorno alla base e un ceppo `stump`. Nuova costante `HIT_AT` (momento in cui l'ascia tocca il tronco). |
| `web/js/game.js` | Gli abeti reagiscono al momento dell'impatto: molla smorzata che li piega dalla parte opposta all'ascia, più forte a ogni colpo. All'ultimo colpo cadono, restano a terra circa 1 s, poi svaniscono lasciando il ceppo; ricrescono come prima. Gli abeti entro 2,2 m dal personaggio o fra lui e la camera scendono al 35 % di opacità con una sfumatura. Stanze larghe 6 m (prima 5 m, con 1 m di vuoto fra l'una e l'altra): quando due stanze vicine sono aperte la parete in comune e il suo ostacolo spariscono (`joinRooms`). Montagne, cumuli, fiamme e freccia con più segmenti. |
| `web/sw.js` | Cache portata a `rifugio-cache-v3`. |
| `rifugio-design.md` | Taglio, stanze unite e stile aggiornati. |

**Verificato** nel browser integrato:
- Forme visibilmente più morbide.
- Abeti semitrasparenti attorno e davanti al personaggio.
- Tre stanze aperte unite in un unico salone senza pareti interne.
- Abete abbattuto: caduto a terra, poi ceppo.
- Taglio continuo fino a 12/15.

**Non verificato:** l'oscillazione a ogni colpo e il movimento dell'ascia, troppo rapidi per gli screenshot (vanno guardati giocando). Non è verificata neanche la fluidità su telefono, visto che Phong e geometrie più fitte pesano un po' di più.

**Per tornare indietro a v0.3:** ricopia i file da `Changelog/backup/2026-11-24_grafica-morbida-ascia-stanze/` nelle stesse posizioni: `rifugio-design.md` nella radice, `sw.js` in `web/`, `build.js` e `game.js` in `web/js/`. Nessun file nuovo da cancellare.

---

## v0.3 · 2026-11-24 · Zaino più grande, braccia animate, tutto il bosco abbattibile

**Richiesto**
- Lo zaino iniziale porta almeno 15 pezzi di legna e 5 cioccolate.
- I personaggi hanno le braccia, con animazioni di camminata e di taglio.
- Tutti gli alberi visibili si possono abbattere.
- Obiettivo dichiarato: pubblicazione sul Play Store con pubblicità e shop a pagamento.

**Modificato**
| File | Cosa |
|---|---|
| `web/js/levels/inverno.js` | Lo zaino ha due scomparti: `bag_logs: 15`, `bag_cups: 5`; con lo Zaino grande `bag_big_logs: 30`, `bag_big_cups: 10`. Al posto di `bag_base` (7), `bag_big` (14) e `max_cups` (3). Nuovi `forest_trees: 70` e limiti della mappa `world_min`/`world_max` (prima −15…18 × −9…14, ora −30…30 × −20…26). |
| `web/js/build.js` | Braccia con mano, perno alla spalla; gambe con perno all'anca. Camminata con braccia opposte alle gambe. Colpo d'ascia (braccia alzate, poi colpo in avanti) con ascia che compare solo durante il taglio. Lo zaino impila la legna a strati di 3 tronchi e le cioccolate sopra, a file di 3. |
| `web/js/game.js` | I 70 abeti del bosco esterno sono abbattibili e hanno collisioni, con almeno 1,4 m fra un albero e l'altro. Giocatore e boscaiolo si girano verso l'albero e fanno il colpo d'ascia. Capienze separate per legna e cioccolate. La mappa si allarga fino al bosco esterno. |
| `web/js/hud.js`, `web/index.html` | Nuovo indicatore delle cioccolate (tazza, es. `0/5`), visibile dopo l'apertura del banco. La legna mostra `0/15`. |
| `web/css/style.css` | Regola `[hidden]{display:none!important}`: senza, l'indicatore delle cioccolate restava visibile. |
| `web/js/state.js` | **Bug corretto** (presente anche nel prototipo): "Ricomincia" cancellava il salvataggio, ma alla ricarica il salvataggio automatico lo riscriveva. Ora dopo il reset i salvataggi sono bloccati. |
| `web/sw.js` | Cache portata a `rifugio-cache-v2`. |
| `rifugio-design.md` | Zaino, taglio di tutti gli abeti, personaggi animati, nuova sezione "Pubblicazione", prossimi passi aggiornati (Capacitor per AdMob e acquisti). |
| `CLAUDE.md` | Obiettivo Play Store con pubblicità e shop. |

**Verificato** nel browser integrato:
- Pagina di prova con i personaggi da vicino: camminata, ascia alzata, colpo in avanti, zaino pieno (15 + 5). La pagina è stata cancellata dopo la prova.
- Nel gioco:
  - Un abete grande del bosco esterno abbattuto fino al ceppo (4 pezzi, contatore `4/15`).
  - "Ricomincia" che ora azzera davvero la partita.
  - Indicatore delle cioccolate nascosto prima del banco.

**Non verificato:** zaino grande (30/10) e indicatore delle cioccolate dopo l'apertura del banco. Il boscaiolo che taglia nel bosco esterno, e la fluidità con 84 alberi con ombre su un telefono vero.

**Per tornare indietro a v0.2.1:** ricopia tutti i file da `Changelog/backup/2026-11-24_zaino-braccia-alberi/` nelle stesse posizioni del progetto: `CLAUDE.md` e `rifugio-design.md` nella radice, il resto sotto `web/`. Nessun file nuovo da cancellare.

---

## v0.2.1 · 2026-11-24 · Rimossa la cartella `godot/`

**Rimosso:** la cartella `godot/` (20 file del porting v0.1, mai usato), spostata nel **Cestino di Windows**, non cancellata definitivamente.

**Modificato:** `CLAUDE.md`, tolta la riga su `godot/`. Backup: `Changelog/backup/2026-11-24_rimozione-godot/CLAUDE.md`.

**Per tornare indietro**
1. Apri il Cestino, cerca la cartella `godot` e scegli "Ripristina": torna in `C:\PERSONALE\Sviluppo_APP\Rifugio\godot`. Se il Cestino è già stato svuotato, la cartella non si può recuperare. L'elenco dei file è nella voce v0.1 qui sotto.
2. Ricopia `CLAUDE.md` da `Changelog/backup/2026-11-24_rimozione-godot/`.

---

## v0.2 · 2026-11-24 · Gioco web installabile su Android (senza Godot)

**Perché:** Godot non è indispensabile. Il prototipo funziona già nel browser con Three.js, e sul PC non c'erano Godot, Node, Python né Android SDK. Un'app web installabile (PWA) non richiede di installare nessun programma.

**Aggiunto: cartella `web/`**
| File | Contenuto |
|---|---|
| `web/index.html` | Pagina del gioco (HUD, finestre, script). |
| `web/css/style.css` | Stile del prototipo, con i margini per notch e barre di sistema. |
| `web/js/namespace.js` | Oggetto globale `Rifugio` condiviso fra gli script. |
| `web/js/levels/inverno.js` | Numeri, stanze, sblocchi e obiettivi del livello 1, letti dal gioco. |
| `web/js/state.js` | Salvataggio su dispositivo (chiave `rifugio-v2`). |
| `web/js/build.js` | Primitive low-poly, abeti, omini, pile di legna. |
| `web/js/hud.js` | Interfaccia ed etichette sopra la scena 3D. |
| `web/js/game.js` | Ciclo di gioco completo del livello Inverno. |
| `web/js/main.js` | Avvio, pulsanti, registrazione del service worker. |
| `web/manifest.webmanifest` | Dati per installare il gioco come app (nome, icone, schermo intero). |
| `web/sw.js` | Service worker per giocare offline (cache `rifugio-cache-v1`). |
| `web/icons/icon.svg`, `icon-192.png`, `icon-512.png` | Icona dell'app. |
| `web/serve.ps1` | Server locale di prova su http://localhost:8080, in PowerShell. |
| `web/README.md` | Come giocare, pubblicare e installare su Android. |

**Differenze rispetto al prototipo (`rifugio-prototipo.html`, non modificato)**
- Il codice è diviso in file, e sblocchi e obiettivi sono guidati dai dati di `inverno.js` invece che scritti nel codice.
- Il salvataggio conserva anche le monete rimaste a terra davanti alle stanze. Salva quando l'app va in background o si chiude.
- I materiali dei personaggi sono condivisi (meno memoria). I tasti vengono rilasciati se la finestra perde il focus.
- Il gioco si può installare come app ed è giocabile offline dopo la prima apertura.
- La chiave di salvataggio è nuova (`rifugio-v2`): i progressi del prototipo non vengono importati.

**Modificato**
- `CLAUDE.md`: obiettivo del progetto passato da Godot alla versione web, con le regole sul changelog. Backup: `Changelog/backup/2026-11-24_passaggio-a-web/CLAUDE.md`.
- `rifugio-design.md`: aggiornata la sezione "Prossimi passi" (Godot → web). Backup: `Changelog/backup/2026-11-24_passaggio-a-web/rifugio-design.md`.

**Verificato** nel browser integrato, a dimensione telefono:
- Caricamento, intro e HUD.
- Taglio della legna, consegna al camino, arrivo dell'ospite, pagamento e raccolta delle monete.
- Avviso "Ho freddo!" quando il fuoco si spegne.
- Avanzamento degli obiettivi fino al 4 e ripristino del salvataggio dopo la ricarica.

**Non verificato**
- Piazzole, cioccolata, boscaiolo e schermata di vittoria: la logica è la stessa del prototipo, ma non le ho provate in questa versione.
- Uso offline: il browser integrato rifiuta di registrare il service worker anche se il file è valido. Va provato con Chrome.
- Installazione su un telefono vero.

**Noto (come nel prototipo):** il passaggio fra i due letti verso il camino è stretto e l'omino può incastrarsi sullo spigolo.

**Per tornare indietro a v0.1**
1. Cancella la cartella `web/`.
2. Ricopia `CLAUDE.md` e `rifugio-design.md` da `Changelog/backup/2026-11-24_passaggio-a-web/` alla cartella del progetto.

---

## v0.1 · 2026-11-23 · Porting su Godot 4 (accantonato)

**Aggiunto: cartella `godot/`**, un progetto Godot 4.4 con export Android:
- `project.godot`, `export_presets.cfg`, `icon.svg`, `.gitignore`, `README.md`
- `data/inverno.json` (dati del livello)
- `scenes/main.tscn`, `scenes/player.tscn`
- `scripts/`: `main.gd`, `hud.gd`, `game_state.gd`, `build.gd`, `world_builder.gd`, `player.gd`, `room.gd`, `chop_tree.gd`, `cocoa_stand.gd`, `unlock_pad.gd`, `guest.gd`, `lumberjack.gd`

**Stato:** mai aperto né provato in Godot (Godot non è installato). Accantonato e poi rimosso il 2026-11-24 (vedi v0.2.1).

**Per tornare indietro a prima di v0.1:** cancella la cartella `godot/`.
