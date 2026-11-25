// Lingue: italiano (base), inglese, spagnolo, francese, tedesco.
// Il gioco è scritto in italiano: ogni testo che compare sullo schermo passa da qui e, se esiste una traduzione, viene sostituito.
// Si traduce il testo già messo nella pagina (un osservatore guarda i cambiamenti), così non serve toccare ogni riga del gioco.
// I testi che non hanno ancora una traduzione restano in italiano. Le frasi dei livelli (vocabolario di città e stagioni) sono ancora solo in italiano.
(function (R) {
  'use strict';
  const LANGS = { it: 'Italiano', en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch' };
  const ORDER = ['en', 'es', 'fr', 'de'];
  // Frasi intere o parti di frase: [italiano, en, es, fr, de].
  const PH = [
    ['Inizia', 'Start', 'Empezar', 'Commencer', 'Start'],
    ['Ricomincia da capo', 'Start over', 'Empezar de nuevo', 'Recommencer', 'Neu beginnen'],
    ['I progressi restano salvati sul dispositivo.', 'Your progress is saved on this device.', 'Tu progreso se guarda en este dispositivo.', 'Ta progression est enregistrée sur cet appareil.', 'Dein Fortschritt wird auf diesem Gerät gespeichert.'],
    [' obiettivi.', ' goals.', ' objetivos.', ' objectifs.', ' Ziele.'],
    ['Menu', 'Menu', 'Menú', 'Menu', 'Menü'],
    ['Mappa', 'Map', 'Mapa', 'Carte', 'Karte'],
    ['Profilo', 'Profile', 'Perfil', 'Profil', 'Profil'],
    ['Impostazioni', 'Settings', 'Ajustes', 'Réglages', 'Einstellungen'],
    ['Shop', 'Shop', 'Tienda', 'Boutique', 'Shop'],
    ['🗺️ Le tue città', '🗺️ Your cities', '🗺️ Tus ciudades', '🗺️ Tes villes', '🗺️ Deine Städte'],
    ['👤 Profilo', '👤 Profile', '👤 Perfil', '👤 Profil', '👤 Profil'],
    ['Continua a giocare', 'Keep playing', 'Seguir jugando', 'Continuer à jouer', 'Weiterspielen'],
    ['Vai al prossimo livello', 'Go to the next level', 'Ir al siguiente nivel', 'Niveau suivant', 'Zum nächsten Level'],
    ['Livello completato!', 'Level complete!', '¡Nivel completado!', 'Niveau terminé !', 'Level geschafft!'],
    ['Salta', 'Skip', 'Saltar', 'Passer', 'Überspringen'],
    ['Le tue città', 'Your cities', 'Tus ciudades', 'Tes villes', 'Deine Städte'],
    ['monete', 'coins', 'monedas', 'pièces', 'Münzen'],
    ['ospiti', 'guests', 'invitados', 'invités', 'Gäste'],
    ['legna', 'wood', 'leña', 'bois', 'Holz'],
    ['gemme 💎', 'gems 💎', 'gemas 💎', 'gemmes 💎', 'Edelsteine 💎'],
    ['👕 Il tuo omino', '👕 Your character', '👕 Tu personaje', '👕 Ton personnage', '👕 Deine Figur'],
    ['🛍️ Shop', '🛍️ Shop', '🛍️ Tienda', '🛍️ Boutique', '🛍️ Shop'],
    ['🎁 Video a premio', '🎁 Reward videos', '🎁 Vídeos con premio', '🎁 Vidéos récompense', '🎁 Belohnungsvideos'],
    ['⚙️ Impostazioni', '⚙️ Settings', '⚙️ Ajustes', '⚙️ Réglages', '⚙️ Einstellungen'],
    ['💾 Copia di sicurezza', '💾 Backup', '💾 Copia de seguridad', '💾 Copie de sauvegarde', '💾 Sicherungskopie'],
    ['🔒 Privacy e consenso', '🔒 Privacy and consent', '🔒 Privacidad y consentimiento', '🔒 Confidentialité et consentement', '🔒 Datenschutz und Einwilligung'],
    ['🎯 Missioni e medaglie', '🎯 Missions and medals', '🎯 Misiones y medallas', '🎯 Missions et médailles', '🎯 Missionen und Medaillen'],
    ['Ricomincia questa stagione', 'Restart this season', 'Reiniciar esta estación', 'Recommencer cette saison', 'Diese Jahreszeit neu starten'],
    ['Sicuro? Tocca di nuovo', 'Sure? Tap again', '¿Seguro? Toca otra vez', 'Sûr ? Touche encore', 'Sicher? Nochmal tippen'],
    ['Cappello', 'Hat', 'Sombrero', 'Chapeau', 'Hut'],
    ['Colore', 'Colour', 'Color', 'Couleur', 'Farbe'],
    ['Accessorio', 'Accessory', 'Accesorio', 'Accessoire', 'Zubehör'],
    ['Suoni', 'Sounds', 'Sonidos', 'Sons', 'Geräusche'],
    ['Volume suoni', 'Sound volume', 'Volumen de sonidos', 'Volume des sons', 'Geräuschlautstärke'],
    ['Musica', 'Music', 'Música', 'Musique', 'Musik'],
    ['Volume musica', 'Music volume', 'Volumen de música', 'Volume de la musique', 'Musiklautstärke'],
    ['Vibrazione', 'Vibration', 'Vibración', 'Vibration', 'Vibration'],
    ['Giorno e notte', 'Day and night', 'Día y noche', 'Jour et nuit', 'Tag und Nacht'],
    ['Meteo (pioggia, nebbia, temporali)', 'Weather (rain, fog, storms)', 'Clima (lluvia, niebla, tormentas)', 'Météo (pluie, brouillard, orages)', 'Wetter (Regen, Nebel, Gewitter)'],
    ['Qualità grafica (si applica ricaricando)', 'Graphics quality (applies on reload)', 'Calidad gráfica (se aplica al recargar)', 'Qualité graphique (au rechargement)', 'Grafikqualität (nach dem Neuladen)'],
    ['Alta', 'High', 'Alta', 'Haute', 'Hoch'],
    ['Media', 'Medium', 'Media', 'Moyenne', 'Mittel'],
    ['Bassa', 'Low', 'Baja', 'Basse', 'Niedrig'],
    ['Il tuo compagno', 'Your companion', 'Tu compañero', 'Ton compagnon', 'Dein Begleiter'],
    ['🐶 Cane', '🐶 Dog', '🐶 Perro', '🐶 Chien', '🐶 Hund'],
    ['🐱 Gatto', '🐱 Cat', '🐱 Gato', '🐱 Chat', '🐱 Katze'],
    ['Nessuno', 'None', 'Ninguno', 'Aucun', 'Keiner'],
    ['Sì', 'Yes', 'Sí', 'Oui', 'Ja'],
    ['No', 'No', 'No', 'Non', 'Nein'],
    ['Lingua', 'Language', 'Idioma', 'Langue', 'Sprache'],
    ['La tua privacy 🔒', 'Your privacy 🔒', 'Tu privacidad 🔒', 'Ta vie privée 🔒', 'Deine Privatsphäre 🔒'],
    ['Solo essenziali', 'Essentials only', 'Solo esenciales', 'Essentiel seulement', 'Nur Notwendiges'],
    ['Accetta anche la pubblicità', 'Also accept ads', 'Aceptar también la publicidad', 'Accepter aussi la publicité', 'Auch Werbung akzeptieren'],
    ['Ripristina acquisti', 'Restore purchases', 'Restaurar compras', 'Restaurer les achats', 'Käufe wiederherstellen'],
    ['Acquistato', 'Purchased', 'Comprado', 'Acheté', 'Gekauft'],
    ['✅ Completata', '✅ Completed', '✅ Completada', '✅ Terminée', '✅ Abgeschlossen'],
    ['Nuova versione: tocca per aggiornare', 'New version: tap to update', 'Nueva versión: toca para actualizar', 'Nouvelle version : touche pour mettre à jour', 'Neue Version: zum Aktualisieren tippen'],
    ['Obiettivo completato!', 'Goal completed!', '¡Objetivo cumplido!', 'Objectif atteint !', 'Ziel erreicht!'],
    [' monete 🎉', ' coins 🎉', ' monedas 🎉', ' pièces 🎉', ' Münzen 🎉'],
    ['Ora sai tutto: buon divertimento! 🎉', 'Now you know it all: have fun! 🎉', '¡Ya lo sabes todo: diviértete! 🎉', 'Tu sais tout : amuse-toi bien ! 🎉', 'Jetzt weißt du alles: viel Spaß! 🎉'],
    [' sbloccato! ✨', ' unlocked! ✨', ' desbloqueado! ✨', ' débloqué ! ✨', ' freigeschaltet! ✨'],
    ['Zaino pieno!', 'Backpack full!', '¡Mochila llena!', 'Sac plein !', 'Rucksack voll!'],
    ['⭐ Sta arrivando un', '⭐ A VIP is arriving:', '⭐ Llega un VIP:', '⭐ Un VIP arrive :', '⭐ Ein VIP kommt:'],
    ['Arriva una squadra di scout! Pagano di più', 'A scout troop is arriving! They pay more', '¡Llega un grupo de scouts! Pagan más', 'Une troupe de scouts arrive ! Ils paient plus', 'Eine Pfadfindergruppe kommt! Sie zahlen mehr'],
    ['Servizio lampo! +40 monete e 2 gemme', 'Lightning service! +40 coins and 2 gems', '¡Servicio relámpago! +40 monedas y 2 gemas', 'Service éclair ! +40 pièces et 2 gemmes', 'Blitzservice! +40 Münzen und 2 Edelsteine'],
    ['Il gioco va a scatti? Prova la qualità Media o Bassa: menu ☰ → Impostazioni', 'Game laggy? Try Medium or Low quality: menu ☰ → Settings', '¿Va a tirones? Prueba calidad Media o Baja: menú ☰ → Ajustes', 'Ça saccade ? Essaie la qualité Moyenne ou Basse : menu ☰ → Réglages', 'Ruckelt es? Probiere Mittel oder Niedrig: Menü ☰ → Einstellungen'],
    // missioni e medaglie
    ['Missioni di oggi', "Today's missions", 'Misiones de hoy', "Missions du jour", 'Heutige Missionen'],
    ['Le missioni cambiano ogni giorno. Ogni missione dà 💎3, tutte e tre danno 💎5 in più.', 'Missions change every day. Each gives 💎3, all three give 💎5 more.', 'Las misiones cambian cada día. Cada una da 💎3; las tres dan 💎5 más.', 'Les missions changent chaque jour. Chacune donne 💎3, les trois donnent 💎5 de plus.', 'Die Missionen wechseln täglich. Jede gibt 💎3, alle drei geben 💎5 extra.'],
    ['Fatto ✅', 'Done ✅', 'Hecho ✅', 'Fait ✅', 'Erledigt ✅'],
    ['Medaglie', 'Medals', 'Medallas', 'Médailles', 'Medaillen'],
    ['Missione completata! +3 gemme 💎', 'Mission complete! +3 gems 💎', '¡Misión cumplida! +3 gemas 💎', 'Mission accomplie ! +3 gemmes 💎', 'Mission geschafft! +3 Edelsteine 💎'],
    ['Tutte le missioni di oggi! +5 gemme 💎', "All of today's missions! +5 gems 💎", '¡Todas las misiones de hoy! +5 gemas 💎', "Toutes les missions du jour ! +5 gemmes 💎", 'Alle Missionen von heute! +5 Edelsteine 💎'],
    ['Nuova medaglia:', 'New medal:', 'Nueva medalla:', 'Nouvelle médaille :', 'Neue Medaille:'],
    ['Accogli ospiti', 'Welcome guests', 'Recibe invitados', 'Accueille des invités', 'Begrüße Gäste'],
    ['Servi bevande', 'Serve drinks', 'Sirve bebidas', 'Sers des boissons', 'Serviere Getränke'],
    ['Taglia legna', 'Chop wood', 'Corta leña', 'Coupe du bois', 'Hacke Holz'],
    ['Porta legna ai fuochi', 'Bring wood to the fires', 'Lleva leña a los fuegos', 'Apporte du bois aux feux', 'Bring Holz zu den Feuern'],
    ['Completa obiettivi', 'Complete goals', 'Cumple objetivos', 'Atteins des objectifs', 'Erfülle Ziele'],
    ['Servi un ospite VIP', 'Serve a VIP guest', 'Atiende a un invitado VIP', 'Sers un invité VIP', 'Bediene einen VIP-Gast'],
    ['Fai un servizio lampo', 'Do a lightning service', 'Haz un servicio relámpago', 'Fais un service éclair', 'Mach einen Blitzservice'],
    ['Primo passo', 'First step', 'Primer paso', 'Premier pas', 'Erster Schritt'],
    ['Albergatore', 'Innkeeper', 'Posadero', 'Aubergiste', 'Wirt'],
    ['Maestro di sala', 'Head waiter', 'Maître', 'Maître d\'hôtel', 'Oberkellner'],
    ['Boscaiolo', 'Lumberjack', 'Leñador', 'Bûcheron', 'Holzfäller'],
    ['Re del bosco', 'Forest king', 'Rey del bosque', 'Roi de la forêt', 'Waldkönig'],
    ['Barista', 'Barista', 'Barista', 'Barista', 'Barista'],
    ['Costruttore', 'Builder', 'Constructor', 'Bâtisseur', 'Baumeister'],
    ['Stagione vinta', 'Season won', 'Estación ganada', 'Saison gagnée', 'Jahreszeit gewonnen'],
    ['Giro dell\'anno', 'Round the year', 'Vuelta al año', "Tour de l'année", 'Rund ums Jahr'],
    ['Affezionato', 'Regular', 'Fiel', 'Fidèle', 'Stammgast'],
    ['Amico dei VIP', 'Friend of VIPs', 'Amigo de los VIP', 'Ami des VIP', 'Freund der VIPs'],
    ['Fulmine', 'Lightning', 'Rayo', 'Éclair', 'Blitz'],
    // foto
    ['Foto ricordo', 'Souvenir photo', 'Foto de recuerdo', 'Photo souvenir', 'Erinnerungsfoto'],
    ['Condividi', 'Share', 'Compartir', 'Partager', 'Teilen'],
    ['Salva', 'Save', 'Guardar', 'Enregistrer', 'Speichern'],
    ['Chiudi', 'Close', 'Cerrar', 'Fermer', 'Schließen'],
    // stagioni
    ['❄️ Inverno: il fuoco si consuma più in fretta (+20%).', '❄️ Winter: fires burn faster (+20%).', '❄️ Invierno: los fuegos se consumen más rápido (+20 %).', '❄️ Hiver : les feux brûlent plus vite (+20 %).', '❄️ Winter: Feuer brennen schneller ab (+20 %).'],
    ['🌸 Primavera: gli alberi ricrescono più in fretta (−30%).', '🌸 Spring: trees regrow faster (−30%).', '🌸 Primavera: los árboles rebrotan antes (−30 %).', '🌸 Printemps : les arbres repoussent plus vite (−30 %).', '🌸 Frühling: Bäume wachsen schneller nach (−30 %).'],
    ['☀️ Estate: le bevande rendono di più (mancia +50%).', '☀️ Summer: drinks earn more (tips +50%).', '☀️ Verano: las bebidas rinden más (propina +50 %).', '☀️ Été : les boissons rapportent plus (pourboire +50 %).', '☀️ Sommer: Getränke bringen mehr (Trinkgeld +50 %).'],
    ['🍂 Autunno: il bosco dà più legna (+1 per albero).', '🍂 Autumn: the forest gives more wood (+1 per tree).', '🍂 Otoño: el bosque da más leña (+1 por árbol).', '🍂 Automne : la forêt donne plus de bois (+1 par arbre).', '🍂 Herbst: der Wald gibt mehr Holz (+1 pro Baum).'],
    // accessibilità, salvataggio
    ['Per cambiare telefono: crea un codice, copialo e incollalo nel nuovo telefono. Il collegamento con l\'account Google non è ancora attivo.', 'To switch phones: create a code, copy it and paste it on the new phone. Linking with a Google account is not active yet.', 'Para cambiar de teléfono: crea un código, cópialo y pégalo en el nuevo teléfono. La vinculación con la cuenta de Google aún no está activa.', 'Pour changer de téléphone : crée un code, copie-le et colle-le sur le nouveau téléphone. Le lien avec le compte Google n\'est pas encore actif.', 'Zum Handywechsel: Code erstellen, kopieren und auf dem neuen Handy einfügen. Die Verknüpfung mit dem Google-Konto ist noch nicht aktiv.'],
    ['Il Rifugio salva i progressi solo su questo dispositivo e non raccoglie dati personali.', 'Il Rifugio saves your progress only on this device and collects no personal data.', 'Il Rifugio guarda tu progreso solo en este dispositivo y no recoge datos personales.', 'Il Rifugio enregistre ta progression uniquement sur cet appareil et ne collecte aucune donnée personnelle.', 'Il Rifugio speichert deinen Fortschritt nur auf diesem Gerät und sammelt keine persönlichen Daten.'],
    ['Consenso alla pubblicità personalizzata', 'Consent to personalised ads', 'Consentimiento para publicidad personalizada', 'Consentement à la publicité personnalisée', 'Einwilligung in personalisierte Werbung'],
    ['Torna a qualche minuto fa', 'Go back a few minutes', 'Volver a hace unos minutos', 'Revenir à quelques minutes plus tôt', 'Ein paar Minuten zurück'],
    ['Ripristino riuscito, riavvio…', 'Restored, restarting…', 'Restaurado, reiniciando…', 'Restauré, redémarrage…', 'Wiederhergestellt, Neustart…'],
    ['Nessun salvataggio precedente disponibile.', 'No earlier save available.', 'No hay un guardado anterior.', 'Aucune sauvegarde précédente.', 'Kein früherer Spielstand vorhanden.'],
    ['Il gioco tiene una copia di sicurezza ogni pochi minuti: se qualcosa va storto puoi tornare indietro.', 'The game keeps a safety copy every few minutes: if something goes wrong you can go back.', 'El juego guarda una copia de seguridad cada pocos minutos: si algo falla puedes volver atrás.', 'Le jeu garde une copie de sécurité toutes les quelques minutes : tu peux revenir en arrière.', 'Das Spiel legt alle paar Minuten eine Sicherheitskopie an: bei Problemen kannst du zurück.']
  ];
  // Frasi con numeri: [espressione, [en, es, fr, de]] con $1, $2…
  const RX = [
    [/^Obiettivo (\d+)$/, ['Goal $1', 'Objetivo $1', 'Objectif $1', 'Ziel $1']],
    [/^Accogli (\d+) ospiti/, ['Welcome $1 guests', 'Recibe $1 invitados', 'Accueille $1 invités', 'Begrüße $1 Gäste']],
    [/^Accogli (\d+) ospite/, ['Welcome $1 guest', 'Recibe $1 invitado', 'Accueille $1 invité', 'Begrüße $1 Gast']],
    [/^Servi (\d+) bevande/, ['Serve $1 drinks', 'Sirve $1 bebidas', 'Sers $1 boissons', 'Serviere $1 Getränke']],
    [/^Servi (\d+) ospiti VIP/, ['Serve $1 VIP guests', 'Atiende a $1 invitados VIP', 'Sers $1 invités VIP', 'Bediene $1 VIP-Gäste']],
    [/^Fai (\d+) servizi lampo/, ['Do $1 lightning services', 'Haz $1 servicios relámpago', 'Fais $1 services éclair', 'Mach $1 Blitzservices']],
    [/^Taglia (\d+) pezzi di legna/, ['Chop $1 logs', 'Corta $1 troncos', 'Coupe $1 bûches', 'Hacke $1 Holzscheite']],
    [/^Porta (\d+) legna ai fuochi/, ['Bring $1 logs to the fires', 'Lleva $1 troncos a los fuegos', 'Apporte $1 bûches aux feux', 'Bring $1 Scheite zu den Feuern']],
    [/^Completa (\d+) stagion[ei]/, ['Complete $1 season(s)', 'Completa $1 estación(es)', 'Termine $1 saison(s)', 'Schließe $1 Jahreszeit(en) ab']],
    [/^Gioca in (\d+) giorni diversi/, ['Play on $1 different days', 'Juega en $1 días distintos', 'Joue $1 jours différents', 'Spiele an $1 verschiedenen Tagen']],
    [/^Completa (\d+) obiettiv[io]/, ['Complete $1 goal(s)', 'Cumple $1 objetivo(s)', 'Atteins $1 objectif(s)', 'Erfülle $1 Ziel(e)']],
    [/^(\d+) stagioni$/, ['$1 seasons', '$1 estaciones', '$1 saisons', '$1 Jahreszeiten']],
    [/^(\d+)\/(\d+) stagioni$/, ['$1/$2 seasons', '$1/$2 estaciones', '$1/$2 saisons', '$1/$2 Jahreszeiten']],
    [/^Oggi ti restano (\d+) video\./, ['You have $1 videos left today.', 'Hoy te quedan $1 vídeos.', "Il te reste $1 vidéos aujourd'hui.", 'Heute hast du noch $1 Videos.']],
    [/^(\d+) gemme \(\+1 per obiettivo, \+10 per ogni stagione completata\)\./, ['$1 gems (+1 per goal, +10 per completed season).', '$1 gemas (+1 por objetivo, +10 por estación completada).', '$1 gemmes (+1 par objectif, +10 par saison terminée).', '$1 Edelsteine (+1 pro Ziel, +10 pro abgeschlossene Jahreszeit).']],
    [/^Prezzi con IVA inclusa\./, ['Prices include VAT.', 'Precios con IVA incluido.', 'Prix TTC.', 'Preise inkl. MwSt.']],
    [/^Missioni di oggi \((\d+)\/(\d+)\)$/, ["Today's missions ($1/$2)", 'Misiones de hoy ($1/$2)', 'Missions du jour ($1/$2)', 'Heutige Missionen ($1/$2)']],
    [/^Medaglie \((\d+)\/(\d+)\)$/, ['Medals ($1/$2)', 'Medallas ($1/$2)', 'Médailles ($1/$2)', 'Medaillen ($1/$2)']]
  ];

  let cur = 'it';
  function pick(arr, lang) { const i = ORDER.indexOf(lang); return i < 0 ? arr[0] : (arr[i + 1] || arr[0]); }
  const exact = {}, subs = [];
  PH.forEach(e => { exact[e[0]] = e; if (e[0].length >= 9) subs.push(e); });
  subs.sort((a, b) => b[0].length - a[0].length);

  function detect() {
    let l = 'it';
    try { l = (R.settings && R.settings.get('lang')) || 'auto'; } catch (e) { l = 'auto'; }
    if (l === 'auto') { const n = ((navigator.languages && navigator.languages[0]) || navigator.language || 'it').slice(0, 2).toLowerCase(); l = LANGS[n] ? n : 'en'; }
    return LANGS[l] ? l : 'it';
  }
  function tr(s) {
    if (cur === 'it' || !s) return s;
    const t = s.trim(); if (!t) return s;
    const lead = s.slice(0, s.indexOf(t)), tail = s.slice(s.indexOf(t) + t.length);
    let out = null;
    if (exact[t]) out = pick(exact[t], cur);
    else {
      for (let i = 0; i < RX.length; i++) { const m = RX[i][0].exec(t); if (m) { const tpl = pick([''].concat(RX[i][1]), cur); out = t.replace(RX[i][0], tpl); break; } }
      if (out == null) { out = t; for (let i = 0; i < subs.length; i++) if (out.indexOf(subs[i][0]) >= 0) out = out.split(subs[i][0]).join(pick(subs[i], cur)); if (out === t) return s; }
    }
    return lead + out + tail;
  }
  function node(n) {
    if (n.nodeType === 3) { const v = n.nodeValue, o = tr(v); if (o !== v) n.nodeValue = o; return; }
    if (n.nodeType !== 1) return;
    const tag = n.tagName; if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') return;
    ['placeholder', 'aria-label', 'title'].forEach(a => { const v = n.getAttribute && n.getAttribute(a); if (v) { const o = tr(v); if (o !== v) n.setAttribute(a, o); } });
    for (let c = n.firstChild; c; c = c.nextSibling) node(c);
  }
  function start() {
    cur = detect(); document.documentElement.lang = cur;
    if (cur === 'it') return;
    node(document.body);
    new MutationObserver(list => {
      for (const m of list) {
        if (m.type === 'characterData') node(m.target);
        else if (m.type === 'childList') m.addedNodes.forEach(node);
        else if (m.type === 'attributes') node(m.target);
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title'] });
  }
  R.i18n = { LANGS, PH, RX, ORDER, tr, current: () => cur, start, detect };
})(window.Rifugio);
