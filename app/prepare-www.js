// Prepara la cartella www/ che finisce dentro l'APK:
//   www/index.html  = caricatore (boot/index.html) che scarica da GitHub l'ultima versione del gioco (APK di prova)
//                     oppure, con --bundled, una pagina che apre subito la copia inclusa (versione per il Play Store)
//   www/game/       = copia della cartella web/ (usata quando non c'è rete, oppure sempre con --bundled)
// Uso: node prepare-www.js            (APK di prova, si aggiorna da solo)
//      node prepare-www.js --bundled  (Play Store: il codice è tutto dentro l'app, niente download di codice)
const fs = require('fs'), path = require('path');
const here = __dirname, www = path.join(here, 'www'), bundled = process.argv.includes('--bundled');
fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });
if (bundled) {
  fs.writeFileSync(path.join(www, 'index.html'), '<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Il Rifugio</title>' +
    '<style>html,body{margin:0;height:100%;background:#a9c9e6}</style></head><body><script>location.replace("game/index.html");</script></body></html>');
} else {
  fs.copyFileSync(path.join(here, 'boot', 'index.html'), path.join(www, 'index.html'));
}
fs.cpSync(path.join(here, '..', 'web'), path.join(www, 'game'), {
  recursive: true,
  filter: src => !/serve\.ps1$|README\.md$/.test(src)
});
console.log(bundled ? 'www/ pronta (versione inclusa, per il Play Store)' : 'www/ pronta (APK di prova)');
