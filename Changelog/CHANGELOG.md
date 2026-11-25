# Changelog: Il Rifugio

Registro di tutto quello che aggiungiamo e modifichiamo, con le istruzioni per tornare indietro.
Le voci più recenti stanno in cima.

## Come usare questo registro
- Ogni voce ha una versione, una data, cosa è cambiato e una sezione **Per tornare indietro**.
- Dalla v0.5 il progetto è su git (GitHub, `simof51/Il-rifugio`): per tornare indietro si recuperano i file dal commit indicato (`git checkout <commit> -- <file>`). Le copie in `Changelog/backup/` delle voci fino alla v0.4 non ci sono più: quelle versioni stanno nel commit `a7e0cd4` (branch `Old`).

---

## v0.22.0 · 2026-11-26 · Obiettivi da 1, alberi trasparenti più stretti, mini-gioco con limiti

- **Obiettivi** di nuovo da 1 in ogni stagione e città. Il tutorial "Come si gioca" resta solo la primissima volta.
- **Alberi trasparenti**: l'area attorno all'omino è più piccola (solo gli alberi davanti a lui, entro 1,5 m).
- **Copia di sicurezza** tolta dal menu.
- **Mini-gioco**: una partita gratis al giorno; poi fino a 3 partite al giorno guardando un video a premio, con almeno 5 minuti fra una partita e l'altra (i limiti dei video del mini-gioco sono separati da quelli dei video per le gemme). Cadono circa la metà delle monete e servono 4 monete per 1 💎 (massimo 5).
- **Per tornare indietro**: `git checkout ef950ba -- web tests Changelog`.

## v0.21.1 · 2026-11-26 · Tasto per la tappa successiva, tutorial solo la prima volta

- **Tasto "➜ Vai a …"**: a tappa finita, anche dopo "Continua a giocare", resta un tasto fisso in basso che porta alla città e stagione successiva (senza chiudere e riaprire l'app).
- **Tutorial una volta sola**: il tutorial e i primi 4 obiettivi che insegnano le basi (legna, camino, primo ospite, prime monete) ci sono solo la primissima volta che si gioca. Nelle altre stagioni e città si parte dal 5° obiettivo.
- **Per tornare indietro**: `git checkout 1179e8d -- web Changelog`.

## v0.21.0 · 2026-11-26 · Impostazioni semplici, strade unite, ghiaia nitida, decorazioni a lato

- **Tolto** il salvataggio portatile con il codice (resta la copia di sicurezza automatica con il tasto "Torna a qualche minuto fa", sotto "Copia di sicurezza"), il testo grande, i colori per daltonici e la modalità una mano.
- **Suoni**: un solo interruttore e un solo volume per effetti e suoni d'ambiente (vento, pioggia, uccellini).
- **Strade unite**: la texture della ghiaia segue le coordinate del mondo, quindi non ci sono più cuciture dove due strade si incontrano; le strade entrano l'una nell'altra nella stessa direzione.
- **Ghiaia migliorata**: texture più grande e nitida, sassolini con bordo scuro e riflesso, filtro anisotropo.
- **Lanterne, pupazzo di neve e decorazioni** non stanno più sulle strade: lanterne a lato della passeggiata, pupazzo/mascotte in un punto libero, e niente cumuli, sassi, cespugli, fiori o alberi sulle strade.
- **Per tornare indietro**: `git checkout fddb7bd -- web tests Changelog`.

## v0.20.0 · 2026-11-26 · Banco rivolto al giocatore, grafica più nitida, nome a pagamento

- **Banco delle bevande** rivolto verso il giocatore (sud), con un camminamento che gli passa davanti: si stacca dalla passeggiata a ovest e vi torna a est. Si prendono le bevande dal camminamento. I riquadri degli upgrade (zaini, ascia, motosega, banco, cartello) sono stati riordinati a sud del camminamento.
- **Grafica più nitida**: antialiasing (bordi lisci) in qualità Alta e Media; risoluzione fino a 2x (Alta) e 1,5x (Media). Se il telefono fatica, la risoluzione scende da sola a piccoli passi (mai sotto 1x).
- **Nome del rifugio**: il primo cambio è gratis, ogni cambio successivo costa 100 💎.
- **Per tornare indietro**: `git checkout 8f12646 -- web tests Changelog`.

## v0.19.0 · 2026-11-26 · Ospiti da ovest, banco davanti alle camere, strade per luogo

- **Ospiti**: arrivano dal bordo ovest della mappa, da 2 o 3 strade diverse (attorno al lago dove c'è), fanno la fila alla reception, vanno in stanza; quando partono ripassano dal bancone, pagano e vanno a est lungo la passeggiata fino al bordo della mappa, dove spariscono.
- **Banco delle bevande** davanti alle camere (a sud della passeggiata), con il lato di servizio verso le stanze. I riquadri "banco" e "banco veloce" si sono spostati lì; le lanterne seguono la nuova passeggiata.
- **Riquadri degli upgrade** sempre visibili: attorno a ognuno non finiscono più cumuli di neve, sassi, cespugli o alberi.
- **Strade** più uniformi (larghezza costante, curve morbide) e diverse per ogni città e stagione: larghezza, ondulazione, bordi, sassolini (nessuno, radi o fitti) e numero di strade d'ingresso cambiano.
- **Per tornare indietro**: `git checkout b29b89f -- web tests Changelog`.

## v0.18.0 · 2026-11-26 · Fila alla reception, compagno a gemme, negozio delle gemme

- **Fila alla reception**: gli ospiti arrivano, si mettono in fila davanti al bancone (a sinistra del tappeto), il primo fa il check-in (la receptionist saltella) e poi va alla sua stanza. Quando se ne vanno ripassano dal bancone, lasciano i soldi nella ciotola (a destra) e escono.
- **Tolto il guadagno da assenti** (finestra "Bentornato!" compresa).
- **Il compagno (cane o gatto) si compra con le gemme** (25 💎 l'uno, può uscire anche dagli scrigni). Chi lo aveva già lo tiene. Chi non ne ha uno parte senza.
- **Negozio delle gemme** nella scheda Shop: tutto ciò che si compra con le gemme sta lì (cappelli, colori, accessori dell'omino, compagno, colori di insegna e tappeto). Nel Profilo resta solo il nome del rifugio.
- **Per tornare indietro**: `git checkout 9226d34 -- web tests Changelog`.

## v0.17.2 · 2026-11-26 · Reception attaccata alle stanze, pareti alte con finestre

- **Reception** quasi attaccata alla stanza più a sinistra: quando si apre una nuova stanza scivola di lato e segue il rifugio mentre cresce. Il riquadro "Pareti più calde" (insul) si è spostato a sinistra per fare posto.
- **Pareti delle baite** alte 2,4 m (prima 1,2) con cornice in alto, zoccolo e due finestre per stanza: vetro azzurro di giorno, giallo caldo la sera.
- **Tolti i festoni di bandierine** dal retro delle stanze (le "lucine"), anche nelle stagioni all'aperto.
- **Per tornare indietro**: `git checkout 8b8edbb -- web Changelog`.

## v0.17.1 · 2026-11-26 · Più veloce, più colorato, reception vicina

- **Prestazioni** (misurate nel browser, stagione di primavera): triangoli disegnati da 276.000 a 117.000; luci vere da 10 a 5 (una sola luce di fuoco condivisa che segue il camino più vicino, 2 luci per le lanterne); niente più sfocature dietro ai pannelli; ombre ridisegnate un fotogramma su due; frutti, neve e fiori non proiettano ombra; alberi, boschi di bordo, colline e sfere più leggeri; risoluzione massima 1,5x (Alta) e 1,25x (Media) invece di 2x.
- **Colori**: tolto il filtro cinema che ingrigiva la scena e la vignettatura; interfaccia più colorata (indicatori dorati, azzurri e rossi, schede con un colore per ciascuna, icone colorate).
- **Reception** spostata vicino al rifugio, a destra delle stanze, dopo il banco delle bevande.
- **Per tornare indietro**: `git checkout d311788 -- web Changelog`.

## v0.17.0 · 2026-11-26 · Reception, premi giornalieri, album, eventi e tanto altro

- **Reception** (a destra, oltre l'ingresso): bancone con insegna, campanello, scaffale con le chiavi e una receptionist che ti guarda e saltella. Gli ospiti soddisfatti passano di lì prima di partire e lasciano i soldi nella ciotola; l'omino li ritira restando sul tappeto. I soldi non restano più davanti alle stanze (le vecchie monete dei salvataggi si possono ancora prendere). La freccia guida, il tutorial e l'obiettivo "raccogli monete" portano lì.
- **Premio giornaliero** con serie di 7 giorni (2, 3, 4, 5, 6, 8 e 15 💎 + scrigno al 7°). Chi salta un giorno non perde la serie.
- **Guadagno mentre sei via**: la reception incassa anche a gioco chiuso (fino a 8 ore); al ritorno appare "Bentornato!" e, nell'app, si può raddoppiare con un video a premio.
- **Album** con 17 figurine (ospiti, animali, meteo, notte, stagioni, evento) e **8 ospiti VIP con nome e frase** da incontrare.
- **Scrigni**: i punti arrivano da obiettivi, missioni, figurine e premi; dentro ci sono gemme o oggetti nuovi per l'omino.
- **Eventi di stagione a data** (Natale, Carnevale, Pasqua, estate, Halloween): guadagni +15/25% e decorazioni ai lati della reception. Si prova con `?event=natale`.
- **Il tuo rifugio**: nome sull'insegna e colori di insegna e tappeto (alcuni con le gemme).
- **Nuova gestione** (prestigio): si rifà una stagione finita e i guadagni salgono del 10% per sempre (fino a +100%).
- **Mini-gioco** "Pioggia di monete" (20 secondi, premio in gemme, ogni 2 ore).
- **Grafica**: icone disegnate al posto delle emoji (barra in basso, foto, gemme), bagliore morbido sui fuochi e sulle monete, coriandoli a fine livello, finestre che entrano con animazione, pallino rosso sul Profilo quando c'è un premio da ritirare.
- Non fatti (per scelta): salvataggio nel cloud con Google Play Giochi e notifiche (servono configurazione Play e un nuovo APK, vanno con la pubblicazione); modelli 3D nuovi.
- **Per tornare indietro**: `git checkout 0d767cc -- web tests Changelog`.

## v0.16.0 · 2026-11-26 · Grafica moderna, tutorial senza fumetto

- Tutorial: tolto il tasto "Salta" e il fumetto in basso (codice compreso); l'avviso "Vai verso il bosco" non compare più, il suo messaggio è già nel passo 2 del tutorial, nella scheda in alto.
- Interfaccia nuova: pannelli di vetro sfocato, ombre morbide, bordi sottili, pulsanti con sfumatura e luce, tab attiva arancione, finestre con ombra profonda, vignettatura leggera sul bordo dello schermo. Niente più bordi spessi e ombre "a gradino".
- Scena 3D: tone mapping cinematografico (ACES, esposizione 1.35) per colori più ricchi e contrasto più pulito.
- **Per tornare indietro**: `git checkout 55217df -- web Changelog`.

## v0.15.0 · 2026-11-26 · Tutorial nella scheda obiettivi, niente ceppi bloccanti

- Il tutorial della prima partita ora compare nella scheda in alto, al posto dell'obiettivo (titolo "Come si gioca", passo 1/7, barra di avanzamento e tasto "Salta"). Finito o saltato il tutorial, tornano gli obiettivi normali.
- Albero abbattuto: nessun ostacolo (né tronco né ceppo). Il ceppo sparisce insieme al tronco caduto e l'albero ricresce da solo.
- **Per tornare indietro**: `git checkout c0e6ba2 -- web Changelog`.

## v0.14.2 · 2026-11-26 · Chip delle gemme di nuovo visibile

- Il chip 💎 non era stato tolto: sui telefoni stretti gli indicatori andavano su due righe e la seconda finiva sotto la scheda dell'obiettivo. Ora la scheda scende sotto gli indicatori, qualunque sia il loro numero di righe.
- **Per tornare indietro**: `git checkout 2851f6d -- web Changelog`.

## v0.14.1 · 2026-11-26 · Barra in basso semitrasparente

- Tolto lo sfondo bianco sotto i tasti della barra: ora i tasti sono semitrasparenti con un leggero sfocato e il gioco si vede dietro.
- **Per tornare indietro**: `git checkout ae0a1eb -- web Changelog`.

## v0.14.0 · 2026-11-26 · Barra in basso, sentieri morbidi, tronchi che non bloccano

**Richiesto**: l'omino si incastra sui tronchi caduti (anche invisibili); sentieri di ghiaia brutti e con curve a spigolo; togliere il menù a panino e mettere una barra in basso con 4 icone.

**Modificato**
| File | Cosa |
|---|---|
| `web/js/game.js` | **Tronchi**: un albero tagliato non ha più il riquadro di ostacolo (resta solo il ceppo, piccolo) e il tronco caduto non blocca mai, nemmeno quando sparisce. Tronchi in piedi più stretti, omino con raggio più piccolo, alberi del bosco più distanziati: fra due alberi si passa sempre. **Sentieri**: nastri che seguono curve morbide (spline) con estremità tonde, larghezza che respira, bordi sfumati e sassolini ai lati; il viale si stacca dalla passeggiata con una curva dolce invece dell'angolo retto. |
| `web/index.html`, `web/css/style.css`, `web/js/main.js` | Via il pulsante ☰. **Barra in basso** con 4 schede: 🗺️ Mappa (città e stagioni), 🛍️ Shop (con i video a premio), 👤 Profilo (statistiche, missioni e medaglie, omino), ⚙️ Impostazioni (suoni, lingua, accessibilità, salvataggio, privacy, debug). Toccare la scheda aperta chiude il menu. La barra si nasconde nelle finestre iniziale, di fine livello e foto. Avvisi e suggerimenti spostati sopra la barra. |
| `web/js/i18n.js`, `web/sw.js` | Traduzioni delle nuove etichette; `CACHE` v24. |

**Per tornare indietro**: `git checkout 4ff5699 -- web Changelog`.

---

## v0.13.0 · 2026-11-26 · Missioni, foto, stagioni, lingue, accessibilità, test

**Richiesto**: implementare le idee 1, 3, 4, 5, 6, 7, 8 della lista proposta.

**Aggiunto**
| File | Cosa |
|---|---|
| `web/js/extras.js` (nuovo) | **Missioni giornaliere** (3 al giorno, 💎3 ciascuna, +💎5 se le fai tutte) e **12 medaglie** (menu → 🎯). **Effetti delle stagioni**: inverno fuoco +20% più veloce a consumarsi, primavera alberi che ricrescono −30%, estate mancia bevande +50%, autunno +1 legna per albero (la nota compare nella finestra iniziale). **Accessibilità**. **Foto ricordo**. |
| `web/js/i18n.js` (nuovo) | **Lingue**: italiano, inglese, spagnolo, francese, tedesco (scelta automatica dal telefono o dal menu → Impostazioni → Lingua). Traduce i testi dell'interfaccia; i testi dei livelli (obiettivi, vocabolario delle città) restano in italiano per ora. |
| `tests/run.js`, `.github/workflows/test.yml` (nuovi) | **Test automatici** (Node, nessun browser): dati di tutte le 12 tappe, sblocchi, stagioni, traduzioni, missioni, salvataggi, codice portatile, elenco dei file. Partono a ogni push. Locale: `node tests/run.js`. |

**Modificato**
| File | Cosa |
|---|---|
| `web/js/state.js` | Copia di sicurezza "di qualche minuto fa" (ogni 4 min circa) e tasto **Torna a qualche minuto fa** nel menu → Salvataggio. |
| `web/js/settings.js` | Copia di sicurezza anche delle impostazioni; nuovi campi (lingua, accessibilità, missioni, statistiche, medaglie). |
| `web/js/game.js` | Manda gli eventi alle missioni, applica l'effetto della stagione, `photo()`. |
| `web/js/main.js`, `index.html`, `css/style.css` | Menu (missioni, accessibilità, lingua, salvataggio), pulsante 📷, finestra della foto, stili: testo grande, colori per daltonici (strisce e simboli oltre al colore), modalità una mano (pulsanti in basso). |
| `web/sw.js` | `CACHE` v23. |

**Da sapere**: la foto si condivide con il menu di condivisione del telefono se il WebView lo permette, altrimenti si scarica; per una condivisione sicura nell'app servirà un plugin nativo (nuovo APK).

**Per tornare indietro**: `git checkout cfc8fc9 -- web Changelog` (e cancellare `tests/`, `.github/workflows/test.yml`).

---

## v0.12.1 · 2026-11-26 · Rifiniture

**Richiesto**: migliorare tutto (le idee nuove si propongono prima, nessuna implementata).

**Modificato**
| File | Cosa |
|---|---|
| `app/boot/index.html` | Messaggio d'errore più preciso: se internet c'è ma GitHub risponde con un errore (404, 403…) mostra "Gioco non raggiungibile" con il codice e la probabile causa (repository privato, troppe richieste); "Serve internet" solo se la rete manca davvero. Serve un nuovo APK. |
| `web/js/main.js` | Tasto "indietro" di Android: chiude il menu se è aperto, altrimenti lo apre; sulla schermata iniziale esce dall'app. Prima usciva di colpo. |
| `web/js/game.js` | Se per 8 secondi il gioco va sotto i 25 fotogrammi al secondo, suggerisce una volta sola di abbassare la qualità grafica. Meno oggetti creati a ogni fotogramma nelle lanterne. |
| `web/js/env.js` | Niente colori nuovi a ogni fotogramma (meno lavoro per il telefono). |
| `web/sw.js` | `CACHE` v22. |

**Per tornare indietro**
- `git checkout 28b5047 -- web app`

---

## v0.12.0 · 2026-11-26 · Video a premio (AdMob), senza vendita di dati

**Richiesto**: implementare la pubblicità proposta (video a premio). Chiesto anche se si può vendere i dati degli utenti a terzi: **no, non è stato fatto e non si farà** (vedi nota).

**Aggiunto**
| File | Cosa |
|---|---|
| `app/package.json` | Plugin `@capacitor-community/admob` 8.4.2. |
| `.github/workflows/apk.yml`, `aab.yml` | Id dell'app AdMob nel manifest (variabile `ADMOB_APP_ID`; predefinito: id di prova di Google). L'AAB avvisa se usa l'id di prova. |
| `web/js/ads.js` | Solo video a premio, scelti dal giocatore: +5 gemme per video guardato fino in fondo, 6 al giorno, 2 minuti di pausa. Annunci richiesti "rivolti ai minori" e non personalizzati, contenuto per tutti, consenso con il modulo di Google (UMP). Id di PROVA di Google finché non si mettono quelli veri. |
| `web/js/main.js` | Sezione "🎁 Video a premio" nel menu (nel browser, solo con il Debug, si simula). |
| `app/README.md` | Come passare agli id veri di AdMob e cosa dichiarare nel Play Console. |

**Nota sui dati**: il gioco non raccoglie né vende dati personali. Non aggiungo servizi che li cedono a terzi: con bambini tra i giocatori sarebbe vietato dalle regole del Play e dalle leggi sulla privacy (GDPR, protezione dei minori). Le app che lo fanno di solito lo fanno tramite i servizi pubblicitari: qui sono configurati per non farlo.

**Per tornare indietro**
- `git checkout f598515 -- web app .github`

---

## v0.11.1 · 2026-11-26 · Tolto il calcolo prima degli acquisti

**Richiesto**: rimuovere il controllo con il calcolo per gli acquisti.

**Modificato**
| File | Cosa |
|---|---|
| `web/js/main.js`, `index.html` | Tolti il calcolo e la finestra "Chiedi a un adulto": l'acquisto parte subito. La conferma con PIN o impronta resta quella di Google Play. Testi dello shop aggiornati. |
| `web/sw.js` | `CACHE` v20. |

**Nota**: se l'app sarà indicata al Play come rivolta anche ai bambini, le regole per le famiglie possono chiedere una conferma prima dei pagamenti: da controllare prima della pubblicazione.

**Per tornare indietro**
- `git checkout 8311ab5 -- web`

---

## v0.11.0 · 2026-11-26 · Tutto il necessario per gli acquisti in app (Google Play Billing)

**Richiesto**: aggiungere all'app tutto ciò che serve per fare acquisti in app.

**Aggiunto**
| File | Cosa |
|---|---|
| `app/package.json` | Plugin `@capgo/native-purchases` 8.9.17 (Google Play Billing, per Capacitor 8). |
| `.github/workflows/apk.yml` | Aggiunge il permesso `com.android.vending.BILLING` al manifest dell'APK. |
| `.github/workflows/aab.yml` | Nuovo workflow manuale **AAB Play Store**: build con il gioco tutto dentro l'app, firmato con la tua chiave (da 4 segreti del repository), permesso di fatturazione, versione crescente. Si ferma con un messaggio chiaro se mancano i segreti. |
| `app/prepare-www.js` | Opzione `--bundled`: l'app apre subito la copia inclusa del gioco, senza scaricare codice (richiesto dal Play). |
| `web/js/billing.js` | Fornitore Google Play: controlla il Play, scarica i prezzi veri del negozio, acquista, ripristina e rimette i miglioramenti già comprati; toglie quelli rimborsati. Le gemme si concedono prima e si consumano dopo (niente perdite se l'app si chiude); i token già usati non danno due volte le stesse gemme. Gestisce i pagamenti "in attesa". Aggancio per la verifica su un server (`R.shop.verifier`). |
| `web/js/shop.js`, `main.js` | Prezzi mostrati dal negozio (obbligatorio), messaggi per annullato, in attesa e non disponibile. |
| `app/README.md` | Guida passo passo: account Play, i 7 prodotti con i loro id, chiave di firma, segreti, build dell'AAB, test interni e testers di licenza. |

**Non fatto (serve altro)**: verifica degli acquisti su un server (serve un server tuo e le credenziali Google), e tutto ciò che sta nel Play Console (account, prodotti, scheda, privacy policy, classificazione, regole per famiglie). Gli acquisti non si possono provare dal PC: solo con l'app installata dal Play.

**Per tornare indietro**
- `git checkout e81a030 -- web app .github`

---

## v0.10.0 · 2026-11-26 · Shop (pronto, ma senza pagamenti attivi)

**Richiesto**: uno shop per comprare valuta di gioco e miglioramenti speciali con euro veri.

**Stato onesto**: i pagamenti veri NON sono attivi. Senza Google Play Billing (account sviluppatore, prodotti creati nel Play Console, libreria di fatturazione e verifica delle ricevute) nessuno può pagare e nessuno viene addebitato. Tutto il resto è pronto.

**Aggiunto**
| File | Cosa |
|---|---|
| `web/js/shop.js` | Catalogo: gemme (60 a € 0,99, 220 a € 2,99, 500 a € 5,99, 1100 a € 11,99) e tre miglioramenti permanenti: "Ospiti generosi" (+50% dai pagamenti degli ospiti, € 4,99), "Attrezzi d'oro" (ascia e motosega −15% di tempo, scintille dorate, € 2,99), "Pacchetto stile" (aureola, ali, 4 colori esclusivi, € 1,99). Struttura a fornitori: `none` (predefinito, non disponibile), `prova` (solo menu Debug: concede senza addebito e lo segna come prova 🧪) e un punto di aggancio `R.shop.setProvider(...)` per Google Play. Acquisti salvati in `rifugio-settings`. |
| `web/index.html`, `css/style.css`, `js/main.js` | Sezione **🛍️ Shop** nel menu, con prezzi, "Acquistato", "Ripristina acquisti" e avviso chiaro. **Blocco per i genitori** prima di ogni acquisto (calcolo 6–9 × 6–9). Debug: acquisti di prova on/off e cancellazione. |
| `web/js/game.js`, `build.js`, `settings.js` | Effetti dei miglioramenti; nuovi oggetti d'aspetto riservati al pacchetto (aureola, ali, Oro, Smeraldo, Fucsia, Ametista). Nel gioco le gemme servono solo per l'aspetto: nessun vantaggio a pagamento, tranne i due miglioramenti dichiarati. |

**Da fare prima di incassare davvero**
- Account sviluppatore Google Play e prodotti con gli stessi id (`gems_60`, `gems_220`, `gems_500`, `gems_1100`, `boost`, `goldtool`, `cosmetics`).
- Fornitore di Google Play Billing (plugin Capacitor) agganciato con `R.shop.setProvider`, e verifica delle ricevute lato server.
- Politiche per app per famiglie/bambini, classificazione per età, informativa privacy e consenso, obblighi sui consumatori (prezzi con IVA, diritto di recesso).
- Spegnere `SHOW_DEBUG` in `main.js` (toglie anche il fornitore "prova").

**Per tornare indietro**
- `git checkout dfefaf0 -- web`

---

## v0.9.0 · 2026-11-25 · Tavolini e sedie, cibi del posto, miglioramenti a gradini, gemme in alto

**Richiesto**
- Tutte le lanterne con la stessa luce; meno luce attorno all'omino.
- Gemme sempre visibili in alto.
- Testi adatti a stagione e luogo; d'estate tavolini e sedie al posto dei lettini; cibi diversi per stagione e luogo.
- Miglioramenti non tutti subito: a gradini.

**Modificato**
| File | Cosa |
|---|---|
| `web/js/game.js` | Lanterne: tutte con luce calda uguale (alone, macchia a terra e luci vere con la stessa intensità, senza tremolio). Estate e primavera: tavolini rotondi con sedie (estate) e tavoli da picnic con panche e tovaglia (primavera), con piatto e tazza del posto sul tavolo; gli ospiti si siedono invece di sdraiarsi. Miglioramenti a gradini: ognuno compare dopo aver comprato un certo numero di altri (0, 2, 3, 4, 5, 6, 7, 8, 9, 11), non dagli obiettivi. Tutorial, consigli ed eventi usano le parole della tappa (albero o abete, camino o barbecue, escursionista o bagnante, stanza o area). Chip 💎 in alto. |
| `web/js/env.js` | Luce attorno all'omino ridotta a circa un terzo, con raggio più corto. |
| `web/js/levels/common.js` | Obiettivi e sblocchi con vocabolario (cibi, luoghi, ospiti), sblocchi a gradini. |
| `web/js/levels/*.js` | Inverno ed estate ora usano le stesse funzioni; estate: "area pranzo" con tavolini; primavera: "area picnic" con tavoli da picnic. |
| `web/js/levels/cities.js` | Cibi e bevande locali per città e stagione (Borgo dei Mulini: cioccolata con panna, tè ai petali, frappè, latte caldo; Porto delle Luci: zuppa di pesce, granita, cocco fresco, brodo caldo): cambiano obiettivi, nomi dei banchi, frase dell'ospite e colore delle tazze. |
| `web/js/main.js` | Corretto "Ricomincia TUTTO": a volte la partita veniva riscritta alla chiusura della pagina. |
| `web/js/hud.js`, `index.html`, `css/style.css`, `sw.js` | Chip gemme, `CACHE` v17. |

**Per tornare indietro**
- `git checkout f658248 -- web`

---

## v0.8.2 · 2026-11-25 · Lanterne che fanno luce, miglioramenti sempre disponibili, pioggia più dolce

**Richiesto**
- Le lanterne devono fare luce e avere una grafica migliore.
- Meno luce dal camino di notte.
- Miglioramenti e ampliamenti sempre disponibili, scollegati dagli obiettivi.
- Rumore della pioggia assordante: migliorarlo.
- Il testo dell'acquisto dei camini isolati diventa "Durata camini più lunga".

**Modificato**
| File | Cosa |
|---|---|
| `web/js/game.js` | Lanterne nuove: palo di ferro con base, lanterna con telaio, vetro colorato che brilla, tettuccio. Di notte hanno un alone, una macchia di luce colorata a terra e vere luci (le 4 più vicine all'omino) che illuminano i dintorni. Il fuoco di camini e barbecue illumina meno di notte (−35%; prima +70%). Tutte le piazzole sono visibili dall'inizio: restano solo i legami fisici (boscaioli e camerieri solo per le stanze aperte, camerieri solo con il banco). |
| `web/js/audio.js` | Pioggia: rumore morbido a banda media, volume circa 1/6 di prima, senza le frequenze acute. |
| `web/js/levels/*.js` | "Durata camini più lunga" (inverno e autunno) e "Durata barbecue più lunga" (estate e primavera), sia come obiettivo sia come nome della piazzola. |
| `web/sw.js` | `CACHE` v16. |

**Per tornare indietro**
- `git checkout 183406d -- web`

---

## v0.8.1 · 2026-11-25 · Tolto il fischio continuo

**Problema**
- Si sentiva sempre un fischio acuto. Causa: nei suoni d'ambiente, il tono dei grilli (4300 Hz) pulsava con un oscillatore a bassa frequenza collegato direttamente al volume; la pulsazione si sommava al volume a zero e il tono usciva comunque, di giorno e di notte.

**Modificato**
| File | Cosa |
|---|---|
| `web/js/audio.js` | Il livello dei grilli sta dopo la pulsazione: a zero è muto davvero. I grilli si sentono solo di notte fonda, molto piano. |
| `web/sw.js` | `CACHE` v15. |

**Per tornare indietro**
- `git checkout d34ed99 -- web/js/audio.js web/sw.js`

---

## v0.8.0 · 2026-11-25 · Meteo e notte, animali, aspetto dell'omino, eventi, tutorial, qualità grafica, salvataggio portatile, consenso, riquadri a terra

**Richiesto** (le proposte 1, 2, 3, 4, 6, 7, 8, 9, 10; la 5 esclusa) più il riquadro delle piazzole.

**Aggiunto**
| File | Cosa |
|---|---|
| `web/js/env.js` | Ciclo giorno/notte di 7 minuti (cielo, nebbia e luci cambiano; di notte i camini illuminano di più e una luce segue l'omino). Meteo per stagione: pioggia, temporale con fulmini e tuoni, nebbia, bufera di neve. Icone nel pannello in alto. |
| `web/js/fauna.js` | Compagno (cane o gatto) che segue l'omino, salta e fa il verso quando succede qualcosa di bello; animali selvatici per stagione (cervi, conigli, scoiattoli, uccellini) che scappano al tuo avvicinarsi. |
| `web/js/settings.js` | Impostazioni salvate (qualità, giorno/notte, meteo, vibrazione, ambiente, compagno, aspetto, gemme, consigli visti, consenso) e salvataggio portatile (codice `RIF1.…`). |
| `web/js/audio.js` | Suoni d'ambiente (vento, pioggia, onde, uccellini di giorno, grilli di notte), tuono, abbaio e miagolio, vibrazione su obiettivi, acquisti, monete e tuoni. |

**Modificato**
| File | Cosa |
|---|---|
| `web/js/game.js` | Piazzole come riquadri a terra con angoli tondi e barra di avanzamento che corre lungo il perimetro (da in alto, in senso orario) e si riempie coi pagamenti. Eventi a sorpresa ogni 75-135 s dopo 3 obiettivi: ospite VIP (paga il triplo, corona), squadra di scout (fino a 3, pagano il 50% in più), ospite affamato (servito entro 24 s dà +40 monete e 2 gemme). Tutorial a fumetti (prima volta, prima stagione) e consigli una tantum. Gemme: +1 per obiettivo, +10 per stagione. Qualità grafica (risoluzione, ombre, quantità di decorazioni). |
| `web/js/build.js` | Cappelli (cilindro, corona, cowboy, orecchie di gatto, chef) e accessori (occhiali da sole, mantello) per l'omino del giocatore. |
| `web/js/main.js` | Menu a sezioni: città, 👕 Il tuo omino (colori, cappelli, accessori con le gemme), ⚙️ Impostazioni (suoni, musica, ambiente, vibrazione, giorno/notte, meteo, qualità, compagno), 💾 Salvataggio portatile (crea e usa un codice), 🔒 Privacy e consenso, 🛠 Debug (anche meteo, ora, eventi, gemme, rivedi tutorial e consenso). Schermata di consenso al primo avvio: "Solo essenziali" o "Accetta anche la pubblicità". |
| `index.html`, `css/style.css`, `js/hud.js`, `sw.js` | Fumetto del tutorial, icona meteo, stili, nuovi script, `CACHE` v14. |

**Nota**
- Il collegamento con un account Google non c'è: serve un servizio esterno con credenziali. Al suo posto c'è il codice di salvataggio portatile.
- Pubblicità e acquisti non sono implementati: c'è solo la schermata di consenso e la scelta salvata (`Rifugio.consent`), pronta per quando si aggiungeranno.
- Cambiare aspetto, compagno o qualità ricarica il gioco (i progressi sono salvati).

**Per tornare indietro**
- `git checkout ed34ed1 -- web`

---

## v0.7.0 · 2026-11-25 · Quattro stagioni, tre città, grafica più ricca, "Ricomincia TUTTO" nel Debug

**Richiesto**
- Più stagioni e più città da completare, sempre visibili nel menu.
- Grafica più accattivante.
- Nel menu Debug un tasto per ricominciare tutto.
- Pensare a miglioramenti possibili e proporli prima di farli (proposte nel messaggio, niente di implementato).

**Aggiunto**
| File | Cosa |
|---|---|
| `web/js/levels/primavera.js` | Primavera: giardino in fiore con ciliegi rosa, petali, farfalle, laghetto, aree picnic (ombrellone, lettini, barbecue, siepe fiorita), spremute, coniglio gigante. |
| `web/js/levels/autunno.js` | Autunno: bosco dorato con foglie che cadono, zucche, funghi, baite col camino, sidro caldo, spaventapasseri. |
| `web/js/levels/common.js` | Elenco dei 41 obiettivi e dei 22 sblocchi con le parole che cambiano da stagione a stagione, e i numeri di base. |
| `web/js/levels/cities.js` | Tre città, ognuna con le quattro stagioni (12 tappe, 492 obiettivi): Valle del Rifugio (i livelli di sempre), Borgo dei Mulini (colori più caldi, obiettivi ×1,2, costi ×1,15, ospiti più frequenti, mulino a vento con le pale che girano) e Porto delle Luci (colori più freddi, ×1,4, ×1,3, faro con fascio di luce che ruota). Ordine: inverno, primavera, estate, autunno, poi la città dopo. I salvataggi di inverno ed estate restano quelli di prima. |

**Modificato**
| File | Cosa |
|---|---|
| `web/js/main.js` | La tappa si sceglie dal progresso (prima non completata). Menu "Le tue città": tutte le città sono sempre visibili con barra di avanzamento e le quattro stagioni (completata, in corso, bloccata). Debug: "🔄 Ricomincia TUTTO da capo" (cancella ogni progresso di ogni città, conferma con un secondo tocco), vai a una tappa qualsiasi, completa fino a qui o tutto. |
| `web/js/build.js` | Terreno con texture a macchie (neve, erba, terra); colori delle foglie e dei frutti dal tema (ciliegi, autunno); ombra morbida sotto i piedi; nuovo guardaroba "primavera" (felpa, jeans, sneakers, berretto con visiera). |
| `web/js/game.js` | Decorazioni sparse per stagione (sassi, cespugli, erba, funghi, zucche), fumo da camini e barbecue, polvere o neve sotto i passi, cerchi sull'acqua, foglie che cadono, monumenti di città, nuove mascotte (coniglio, spaventapasseri). Messaggio all'avvio con città e stagione. |
| `web/js/audio.js`, `css/style.css`, `index.html`, `sw.js` | Due nuovi brani, stile delle città, nuovi script, `CACHE` v13. |

**Nota**
- Tempi degli obiettivi e bilanciamento delle città nuove sono stime, non misurati.

**Per tornare indietro**
- `git checkout 816ef11 -- web`

---

## v0.6.0 · 2026-11-25 · Colpo orizzontale, motosega, camerieri in smoking, lido d'estate, bordi della mappa

**Richiesto**
- Colpo d'ascia orizzontale come una vera ascia; lama più affilata; obiettivo motosega.
- Camerieri in smoking nero con camicia bianca e vassoio quando portano il cibo.
- Estate: niente rifugio con letti e camino, qualcosa di più estivo; vestiti estivi (pantaloncini, maglietta, berretto con visiera).
- Inverno: sentiero di ghiaia; bordi della mappa più definiti (montagne alte d'inverno, foresta fitta d'estate).

**Modificato**
| File | Cosa |
|---|---|
| `web/js/build.js` | Colpo orizzontale: le braccia vanno avanti, si caricano di lato e colpiscono in un piano orizzontale, con il busto che ruota; nuova ascia con lama larga e testa. Gomito che si piega anche di lato. Nuovo attrezzo: motosega (corpo arancione, barra con catena, braccia tese con piccolo dondolio e vibrazione). Tre guardaroba: invernale (giaccone, sciarpa, pon pon), estivo (maglietta a maniche corte, pantaloncini, sneakers, berretto con visiera) e cameriere (smoking nero, camicia e colletto bianchi, papillon, polsini bianchi, capelli neri, vassoio d'argento con le bevande che compare solo quando le porta, tenuto con due mani). Texture a puntini per ghiaia e sabbia (disegnata al volo). |
| `web/js/game.js` | Sentieri come piani con texture, senza deformazioni. Bordi: catena di montagne alte con cime innevate (inverno) o foresta fitta di quattro file di alberi tondi più colline (estate), fuse in pochi pezzi. Bosco interno più fitto (120 alberi d'estate). Stazioni "lido": ombrellone, due lettini con telo e asciugamano, barbecue al posto del camino, staccionata di bambù e parapetti bassi al posto dei muri. Motosega: taglio ogni 0,18 s (0,4 volte), sostituisce l'ascia per giocatore e boscaioli. Suono della motosega. |
| `web/js/levels/inverno.js` | Sentiero di ghiaia grigia; bordo a montagne; nuova piazzola Motosega (220) e obiettivo "Compra la motosega" (41 obiettivi). |
| `web/js/levels/estate.js` | Riscritta come lido sul lago: postazioni, bagnanti, chiosco della limonata, barbecue; sentiero di sabbia; foresta di bordo; motosega (230); 41 obiettivi. |
| `web/js/audio.js`, `main.js`, `sw.js` | Suono "saw" (e nel menu Debug); `CACHE` v12. |

**Nota**
- Il colpo orizzontale e la motosega li ho guardati solo in immagini fisse, non in movimento.

**Per tornare indietro**
- `git checkout f1bad1e -- web`

---

## v0.5.9 · 2026-11-24 · Percorsi senza intoppi, menu Debug, stagione automatica, omini più umani

**Richiesto**
- Camerieri e boscaioli restano incastrati: devono fare un percorso che evita gli ostacoli.
- Menu di debug per provare le funzioni.
- All'avvio non si sceglie la stagione; una volta completata non si torna indietro.
- Busti più umani e vestiti migliori.

**Modificato**
| File | Cosa |
|---|---|
| `web/js/game.js` | Percorsi con A* su una griglia di 0,5 m (muri, letti, camino, banco, lago, alberi e mascotte sono chiusi con un margine di 0,48 m), percorso accorciato con la linea di vista e ricalcolato se la meta cambia o se restano fermi più di un secondo. La griglia si rifà da sola quando gli ostacoli cambiano. Sostituisce il vecchio "gira largo a caso". Strumenti di prova nell'oggetto `debug` (monete, obiettivi, sblocchi, aiutanti, ospiti, fuochi, zaino, teletrasporto, velocità x2, FPS). |
| `web/js/main.js` | La stagione si sceglie da sola: la prima non completata (inverno, poi estate). Tolta la scelta dalla finestra iniziale e i pulsanti "Gioca" dal menu. Una stagione completata non si può più riaprire né ricominciare ("Ricomincia" sparisce). Nuovo menu **🛠 Debug** dentro il menu ☰. `SHOW_DEBUG` (in cima al file) lo spegne per la pubblicazione. |
| `web/js/build.js` | Omini: busto tornito con spalle, vita stretta e fianchi; giaccone con cintura e fibbia, bottoni, sciarpa; pantaloni e scarponcini; guanti con polsino; naso e orecchie. |
| `web/index.html`, `css/style.css`, `sw.js` | Tolti scelta stagione e "Ricomincia" dalla vittoria; stile del menu Debug; `CACHE` v11. |

**Menu Debug**: +100/+1000 monete; completa obiettivo, +5, completa livello; sblocca tutto, assumi aiutanti; chiama ospite, riempi fuochi, zaino e banco; vai a casetta, bosco, banco, sentiero, lago; velocità x2, FPS; forza Inverno o Estate, segna una stagione come completata; prova dei suoni; azzera tutto (conferma con un secondo tocco).

**Per tornare indietro**
- `git checkout b620530 -- web`

---

## v0.5.8 · 2026-11-24 · Camerieri, un boscaiolo per stanza, menu con suoni e musica, si parte dall'inverno

**Richiesto**
- Gli aiutanti non devono attraversare i muri: devono urtare gli oggetti come il giocatore.
- Si parte sempre dall'inverno; la stagione dopo si apre completando la precedente.
- Camerieri assumibili (al massimo uno per stanza) dove c'è da servire bevande.
- Un boscaiolo per stanza.
- Barra menu con avanzamento e impostazioni (suoni, musica).

**Aggiunto**
| File | Cosa |
|---|---|
| `web/js/audio.js` | Suoni ed effetti creati con Web Audio (taglio, legna nel fuoco, monete, bevande, acquisto, obiettivo, ospiti, albero che cade) e due brani brevi (carillon calmo d'inverno, vivace d'estate). Nessun file audio. Impostazioni salvate in `rifugio-audio`. |
| `web/index.html`, `css/style.css`, `js/main.js` | Pulsante ☰ in alto a destra: avanzamento di ogni stagione (barre, obiettivi, completata/bloccata), monete, ospiti, legna e bevande, interruttori e volumi di suoni e musica, "Ricomincia questo livello" (si conferma con un secondo tocco). Il gioco va in pausa mentre il menu è aperto. |

**Modificato**
| File | Cosa |
|---|---|
| `web/js/game.js` | Boscaioli e camerieri urtano muri, letti, alberi e lago come il giocatore (`collide`); se restano bloccati per mezzo secondo girano largo; dentro una stanza escono prima dal varco davanti; i boscaioli ignorano gli alberi dietro le casette. Un boscaiolo per stanza (alimenta solo il suo fuoco) e un cameriere per stanza (prende le bevande dal banco e le porta agli ospiti della stanza che le chiedono, con il vassoio sulla schiena). Suoni agganciati agli eventi. |
| `web/js/levels/*.js` | Sblocchi: `helper` (stanze 1, 2, 3) e `waiter` (stanze 1, 2, 3), le piazzole compaiono solo a stanza aperta (e dopo il banco per i camerieri). Obiettivi saliti a 40 per stagione (altri 4: tre camerieri e il terzo boscaiolo). Premi 10/15/20/25 (inverno) e 15/20/25/30 (estate). |
| `web/js/main.js` | Si parte sempre dall'inverno; l'estate è bloccata finché l'inverno non è completato (con `?debug` è tutto aperto). Il cambio di stagione vale per un avvio solo (sessionStorage); il pulsante "Nuova versione" resta nella stagione in corso. |
| `web/sw.js` | `CACHE` v10, aggiunto `audio.js`. |

**Nota**
- Estate e inverno hanno 40 obiettivi ciascuno, sempre stimati su meno di 3,5 minuti l'uno e non misurati giocando.
- Il suono non l'ho potuto ascoltare qui: ho controllato solo che non dia errori e che le impostazioni si salvino.

**Per tornare indietro**
- `git checkout 82611ed -- web`

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
