# Il Rifugio: documento di design (v0.1)

Gioco 3D progressivo per Android, genere "arcade tycoon": un omino gestisce un rifugio di montagna, completa obiettivi e sblocca miglioramenti. Il prototipo giocabile (HTML + Three.js r128) è in `rifugio-prototipo.html`: è il riferimento per meccaniche, numeri e ritmo.

## Ciclo di gioco
1. Taglia la legna: fermarsi entro 1,6 m da un abete dà 1 pezzo ogni 0,35 s. Ogni abete ha 4 pezzi e ricresce dopo 14 s.
2. La legna si impila sulla schiena (zaino: 7 pezzi, 14 con l'upgrade).
3. Alimenta i camini: 1 pezzo ogni 0,12 s, massimo 10. Il fuoco consuma 1 unità ogni 3,2 s con ospiti in stanza, ogni 9 s se la stanza è vuota.
4. Gli escursionisti arrivano dal sentiero ogni 5-8 s se c'è un letto libero (2 letti per stanza). Restano 16 s, ma il tempo scorre solo se la stanza è calda. Dopo 8 s al freddo se ne vanno (reputazione −2).
5. All'uscita pagano 10 monete (+6 se hanno ricevuto la cioccolata), lasciate in una pila davanti alla stanza da raccogliere.
6. Le monete si spendono stando sopra le piazzole di sblocco: il pagamento è graduale e i pagamenti parziali restano salvati.

## Sblocchi
| Sblocco | Costo | Effetto | Compare dopo |
|---|---|---|---|
| Stanza 2 | 40 | +2 letti, +1 camino | obiettivo 4 |
| Zaino grande | 50 | capacità 14 | obiettivo 4 |
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
Low-poly cartoon, neve, abeti, baite di legno con muri bassi "a spaccato". Palette: neve #f4f7fb, cielo #a9c9e6, abete #2f6b4f, legno #9a6a45, rosso #d94f3d, oro #f2b632. Font arrotondato (Fredoka). Camera isometrica che segue il giocatore, joystick virtuale nel punto toccato.

## Prossimi passi
- Portare il gioco su **Godot 4** (GDScript) con export Android: scena principale, giocatore con CharacterBody3D, sistema di sblocchi e obiettivi guidato da dati, salvataggio su file.
- Sostituire le primitive con asset low-poly (per esempio Kenney o Quaternius, CC0).
- Livello 2: estate al lago (barche, campeggio, grigliate).
