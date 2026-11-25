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
  Il workflow **AAB Play Store** lo fa già (`node prepare-www.js --bundled`).
- L'id `it.ilrifugio.gioco` (in `capacitor.config.json`) diventa definitivo alla prima pubblicazione: cambialo prima, se vuoi.

## Acquisti in app (Google Play Billing)
Nell'app c'è il plugin `@capgo/native-purchases`, il permesso `com.android.vending.BILLING` (messo dal workflow) e il codice dello shop
(`web/js/shop.js`, `web/js/billing.js`). **Gli acquisti funzionano solo se l'app è installata dal Google Play** (anche da una traccia di test):
nell'APK di prova e nel browser lo shop dice "non disponibile" e non addebita nulla.

Per provarli davvero, una volta sola:
1. **Account sviluppatore Google Play** (costo una tantum) e nuova app con id `it.ilrifugio.gioco`. Compila scheda, classificazione dei contenuti,
   privacy policy (indirizzo pubblico), "Sicurezza dei dati", pubblico di destinazione (se anche bambini: regole "Famiglie").
2. **Prodotti**: Monetizzazione → Prodotti → Prodotti in-app. Crea questi 7 con **esattamente questi id** e rendili attivi:
   `gems_60` (€ 0,99), `gems_220` (€ 2,99), `gems_500` (€ 5,99), `gems_1100` (€ 11,99), `boost` (€ 4,99), `goldtool` (€ 2,99), `cosmetics` (€ 1,99).
3. **Chiave di firma** (tua, privata, mai nella repository). Sul PC con Java:
   `keytool -genkeypair -v -keystore release.jks -alias rifugio -keyalg RSA -keysize 2048 -validity 10000`
   poi in PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("release.jks")) | Set-Clipboard`.
   In GitHub → Settings → Secrets and variables → Actions crea: `ANDROID_KEYSTORE_BASE64` (incolla), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (rifugio), `ANDROID_KEY_PASSWORD`. Conserva `release.jks` e le password in un posto sicuro: se li perdi non puoi più aggiornare l'app.
4. GitHub → Actions → **AAB Play Store** → Run workflow. Scarica l'artefatto `il-rifugio-aab` e caricalo in Play Console → Test → **Test interni**.
5. Aggiungi te stesso fra i **tester** e, in Impostazioni → Test della licenza, anche l'indirizzo Gmail come "tester di licenza": gli acquisti di prova non addebitano. Installa l'app dal link di test del Play.
6. Nello shop dell'app devono comparire i prezzi veri del Play. Prova un acquisto (con il blocco per i genitori), poi "Ripristina acquisti".

Prima di mettere l'app in produzione: verifica degli acquisti su un server (`R.shop.verifier`), spegnere `SHOW_DEBUG` in `web/js/main.js`,
controllare le regole del Play per le app per famiglie e i testi dello shop.

## Compilare sul PC (facoltativo)
Servono Node 22, JDK 21 e Android SDK. Da questa cartella: `npm install`, `npm run www`, `npx cap add android`, `npx cap sync android`, poi `android\gradlew assembleDebug`.
