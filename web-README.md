# Il Rifugio (versione web / app Android)

Il gioco è fatto solo di file HTML, CSS e JavaScript: non serve installare nessun programma.

## Giocare sul PC
- Il modo più rapido è aprire `index.html` con doppio clic. Funziona tutto tranne l'uso offline.
- Per provarlo come lo vedrà il telefono (con l'uso offline), avvia il server locale e apri http://localhost:8080:

```bash
powershell -ExecutionPolicy Bypass -File web\serve.ps1
```

Comandi: trascina con il mouse (o il dito) per muoverti, oppure WASD e frecce.

## Installarlo su Android
Android installa un'app web solo se è servita in HTTPS. Una volta pubblicata:
1. Apri l'indirizzo con Chrome sul telefono.
2. Menu ⋮ → "Installa app" (o "Aggiungi a schermata Home").
3. Il gioco si apre a schermo intero dall'icona, e dopo la prima apertura funziona anche senza rete.

Modi semplici per pubblicare la cartella `web/` in HTTPS, senza programmi:
- **Netlify Drop**: trascini la cartella `web` nella pagina e ottieni un indirizzo.
- **GitHub Pages**: carichi i file in un repository e attivi Pages.

Se un giorno serve un vero APK/AAB per il Play Store, si può generare dall'indirizzo pubblicato con PWABuilder (pwabuilder.com), sempre senza installare nulla.

## Struttura
| File | Contenuto |
|---|---|
| `index.html` | Pagina del gioco: HUD, finestre, caricamento degli script. |
| `css/style.css` | Stile (palette e font Fredoka del design). |
| `js/levels/inverno.js` | Numeri, stanze, sblocchi e obiettivi del livello 1. Si bilancia il gioco solo da qui. |
| `js/state.js` | Salvataggio sul dispositivo (localStorage, chiave `rifugio-v2`). |
| `js/build.js` | Primitive low-poly: abeti, omini, pile di legna. |
| `js/hud.js` | Interfaccia: indicatori, obiettivo, joystick, avvisi, etichette sopra la scena. |
| `js/game.js` | Ciclo di gioco: taglio, camini, ospiti, cioccolata, boscaiolo, piazzole, obiettivi, camera. |
| `js/main.js` | Avvio e pulsanti. |
| `manifest.webmanifest`, `sw.js`, `icons/` | Installazione come app e uso offline. |
| `serve.ps1` | Server locale di prova. |

Quando modifichi un file del gioco, aumenta `CACHE` in `sw.js` (es. `rifugio-cache-v2`): così i telefoni scaricano la versione nuova.
