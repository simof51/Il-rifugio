// Prepara la cartella www/ che finisce dentro l'APK:
//   www/index.html  = caricatore (boot/index.html) che scarica da GitHub l'ultima versione del gioco
//   www/game/       = copia della cartella web/, usata quando non c'è rete
const fs = require('fs'), path = require('path');
const here = __dirname, www = path.join(here, 'www');
fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });
fs.copyFileSync(path.join(here, 'boot', 'index.html'), path.join(www, 'index.html'));
fs.cpSync(path.join(here, '..', 'web'), path.join(www, 'game'), {
  recursive: true,
  filter: src => !/serve\.ps1$|README\.md$/.test(src)
});
console.log('www/ pronta');
