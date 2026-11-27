# Il Rifugio: documento di design (v0.1)

Gioco 3D progressivo per Android, genere "arcade tycoon": un omino gestisce un rifugio di montagna, completa obiettivi e sblocca miglioramenti. Il prototipo giocabile (HTML + Three.js r128) è in `rifugio-prototipo.html`: è il riferimento per meccaniche, numeri e ritmo.

## Ciclo di gioco
1. Taglia la legna: fermarsi entro 1,6 m da un abete dà 1 pezzo ogni 0,35 s, con un colpo d'ascia orizzontale. Tutti gli abeti visibili si possono abbattere, anche quelli del bosco intorno alla baita. A ogni colpo l'abete si piega dalla parte opposta all'ascia e torna su, sempre più forte. All'ultimo colpo cade a terra, sparisce e lascia il ceppo. Ogni abete ha 4 pezzi e ricresce dopo 14 s.
2. La legna si impila sulla schiena. Lo zaino ha due scomparti: 15 pezzi di legna e 5 cioccolate (30 e 10 con l'upgrade).
3. Alimenta i camini: 1 pezzo ogni 0,12 s, massimo 10. Il fuoco consuma 1 unità ogni 3,2 s con ospiti in stanza, ogni 9 s se la stanza è vuota.
4. Gli escursionisti arrivano dal sentiero ogni 5-8 s se c'è un letto libero (2 letti per stanza). Restano 16 s, ma il tempo scorre solo se la stanza è calda. Dopo 8 s al freddo se ne vanno (reputazione −2).
5. All'uscita pagano 10 monete (+6 se hanno ricevuto la cioccolata), lasciate in una pila davanti alla stanza da raccogliere.
6. Le monete si spendono stando sopra le piazzole di sblocco: il pagamento è graduale e i pagamenti parziali restano salvati.

## Sblocchi
| Sblocco | Costo | Effetto | Compare dopo |
|---|---|---|---|
| Stanza 2 | 40 | +2 letti, +1 camino; si unisce alla stanza accanto senza parete in mezzo | obiettivo 4 |
| Zaino grande | 50 | 30 legna e 10 cioccolate | obiettivo 4 |
| Scarponi veloci | 45 | velocità 4,6 → 6,2 | obiettivo 4 |
| Cioccolata calda | 60 | banco che produce 1 tazza ogni 2,5 s (max 4); il 60% degli ospiti la chiede; mancia +6 | Stanza 2 |
| Boscaiolo | 150 | NPC che taglia 5 pezzi e li porta al camino più scarico | Cioccolata |
| Stanza 3 | 120 | +2 letti, +1 camino | Boscaiolo |

## Obiettivi del livello 1 (Inverno), +10 monete ciascuno
1. Taglia 4 pezzi di legna
2. Porta 3 pezzi al camino
3. Ospita il primo escursionista
4. Raccogli 15 monete
5. Sblocca la stanza 2
6. Apri il banco della cioccolata
7. Servi 3 cioccolate
8. Assumi il boscaiolo
9. Sblocca la stanza 3
10. Raggiungi 5 stelle (1 ospite felice = 0,25 stelle)

## Stile
Cartoon dalle forme morbide: superfici lisce, spigoli arrotondati, niente sfaccettature evidenti. Neve, abeti, baite di legno con muri bassi "a spaccato"; le stanze sbloccate si uniscono in un unico salone. I personaggi hanno braccia e gambe animate (camminata, colpo d'ascia). Gli abeti vicini al personaggio o fra lui e la camera diventano semitrasparenti, così il personaggio resta sempre visibile. Palette: neve #f4f7fb, cielo #a9c9e6, abete #2f6b4f, legno #9a6a45, rosso #d94f3d, oro #f2b632. Font arrotondato (Fredoka). Camera isometrica che segue il giocatore, joystick virtuale nel punto toccato.

## Pubblicazione
Il gioco è destinato al Google Play Store, con pubblicità e un eventuale shop a pagamento. Gli acquisti di contenuti digitali devono passare da Google Play Billing; la pubblicità richiede consenso (GDPR) e privacy policy.

## Prossimi passi
- ~~Portare il gioco su Godot 4~~: scelta cambiata il 2026-11-24. Il gioco resta in HTML + Three.js ed è un'app web installabile su Android (cartella `web/`), con sblocchi e obiettivi guidati da dati e salvataggio sul dispositivo.
- App Android con Capacitor (cartella `app/`): fatto il 2026-11-24 un APK di prova costruito da GitHub Actions, che scarica il gioco aggiornato a ogni avvio. Per il Play Store serviranno: un AAB firmato con una chiave vera, il gioco incluso nell'app invece che scaricato (Google non ammette codice scaricato che cambia l'app in modo sostanziale senza revisione), AdMob, Play Billing, consenso e privacy policy.
- Verificare le prestazioni su un telefono vero (molti abeti con ombre e materiali propri).
- Sostituire le primitive con asset low-poly (per esempio Kenney o Quaternius, CC0).
- Livello 2: estate al lago (barche, campeggio, grigliate).

## Aggiunte (v0.29 - v0.30)

- Attività di città: Valle legnaia e slitta (deposito 30, consegne da 5); Mulini orto (6 piante, 24 s, 40% della paga e una scorta al banco); Porto battello (3 ospiti, +25%).
- Banco dei dolci: sblocco da 140 monete dopo 5 acquisti; il 35% degli ordini diventa un dolce.
- Richieste (dal 6° obiettivo, 22% degli ospiti senza ordine, 30 s, mancia 1,5 volte la paga).
- Eventi (dall'8° obiettivo, ogni 150-240 s): bufera 25 s, festa 30 s (paga doppia), tubo rotto 35 s.
- Paga: +4% per stella intera, +4% per mobile della stanza (mobili 60-300 monete).
- Missioni settimanali 3 x 6 gemme; medaglie 2 gemme; album 3 gemme ogni 5 figurine.
- Ruota: monete 60/120/180/300, gemme 2/4/8, super premio 40.

## Pianta verticale (v0.31) - sostituisce la disposizione e la stanza unica a fila

- Dall'alto: campo di raccolta, locale caldaia/cucina con sgabuzzino, corridoio con 4 stanze per lato (2 letti e bagno), mensa e cinema, reception e strada. Ai Mulini la pianta è specchiata.
- Raccolta: inverno legna (caldaia), primavera ortaggi (cucina), estate grano (forno), autunno zucche (calderone). Serbatoio unico da 60; consumo 0,06 + 0,075 per stanza occupata al secondo.
- Macchinario (450): si guida nel campo, tramoggia 80, scarica scendendo.
- Bagni: 4 saponi e 4 rotoli; ogni ospite ne usa uno; senza scorte paga il 35% in meno. Sgabuzzino: 8 / 12 / 18 per tipo.
- Ospite: reception, letto, mensa (se aperta), cinema (+60% della paga base), reception, uscita.
- Mensa: tutti i banchi; 12 posti; all'inizio serve il giocatore, poi fino a 3 camerieri.
- 51 obiettivi, 29 sblocchi.
- Addetto ai bagni (180, dopo 6 acquisti): porta fino a 8 saponi e 8 rotoli per volta dallo sgabuzzino ai bagni che ne hanno meno.
