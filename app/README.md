# App Android (Capacitor)

## Installare l'APK di prova
1. Sul telefono apri https://github.com/simof51/Il-rifugio/releases/download/apk-test/il-rifugio.apk
2. Android chiede il permesso di installare app da Chrome ("origine sconosciuta"): consentilo.
3. Apri il file scaricato e installa. Play Protect può avvisare che l'app non è nota: "Installa comunque".

Gli APK successivi si installano sopra il precedente (stessa chiave di prova), senza perdere i progressi.

## Aggiornamenti in tempo reale
`boot/index.html` è la prima pagina dell'app. A ogni avvio:
1. chiede a GitHub l'ultimo commit del branch `claude/il-rifugio-old-branch-d4kcaa`;
2. scarica da quel commit `web/index.html`, i CSS e gli script (`web/js/...`) e li avvia;
3. font, icone e Three.js (`web/lib/`) li prende dalla copia di `web/` inclusa nell'APK.

Mentre si gioca controlla ogni 90 s se c'è un commit nuovo e mostra "Nuova versione: tocca per aggiornare".
Senza rete usa l'ultima versione scaricata, oppure la copia inclusa nell'APK. La versione in uso è scritta nella finestra iniziale.

Serve un APK nuovo solo se cambia questa cartella o si aggiungono immagini/font. Lo costruisce GitHub Actions
(`.github/workflows/apk.yml`) a ogni push che tocca `app/`, oppure a mano da Actions → "APK Android" → "Run workflow".

## Attenzione per il Play Store
- `debug.keystore` è una chiave **di prova** pubblica: l'app per il Play Store va firmata con una chiave privata, mai messa nella repository.
- La versione del Play Store deve includere il gioco nell'app (niente download del codice all'avvio): il caricatore serve solo per i test.
- L'id `it.ilrifugio.gioco` (in `capacitor.config.json`) diventa definitivo alla prima pubblicazione: cambialo prima, se vuoi.

## Compilare sul PC (facoltativo)
Servono Node 22, JDK 21 e Android SDK. Da questa cartella: `npm install`, `npm run www`, `npx cap add android`, `npx cap sync android`, poi `android\gradlew assembleDebug`.
