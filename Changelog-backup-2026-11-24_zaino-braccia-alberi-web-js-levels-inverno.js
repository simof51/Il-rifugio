// Livello 1 (Inverno): tutti i numeri, gli sblocchi e gli obiettivi. Per bilanciare il gioco si modifica solo questo file.
// unlocks.requires: {objectives: n} (dopo n obiettivi) oppure {bought: "id"} (dopo un altro sblocco).
// unlocks.effect: "room" (apre rooms[room]), "bag", "boots", "cocoa", "helper".
// objectives: contano una statistica ({stat, n}) oppure uno sblocco ({bought}); guide dice dove punta la freccia
// ("tree", "feed", "pile", "cocoa", "pad:<id>").
Rifugio.levels.inverno = {
  id: 'inverno',
  name: 'Inverno',
  tuning: {
    trees: 14,
    chop_range: 1.6,
    chop_interval: 0.35,
    logs_per_tree: 4,
    tree_regrow: 14,
    bag_base: 7,
    bag_big: 14,
    max_cups: 3,
    speed_base: 4.6,
    speed_fast: 6.2,
    feed_range: 1.6,
    feed_interval: 0.12,
    fuel_max: 10,
    burn_busy: 3.2,
    burn_idle: 9,
    guest_spawn_min: 5,
    guest_spawn_max: 8,
    guest_stay: 16,
    guest_cold_limit: 8,
    cold_penalty: 2,
    pay: 10,
    tip: 6,
    cocoa_interval: 2.5,
    cocoa_max: 4,
    cocoa_chance: 0.6,
    helper_load: 5,
    objective_reward: 10,
    star_per_guest: 0.25,
    stars_max: 5
  },
  rooms: [{ x: 0 }, { x: 6 }, { x: -6 }],
  unlocks: [
    { id: 'room1',  title: 'Stanza 2',         cost: 40,  pos: [6, -6.5],   requires: { objectives: 4 },    effect: 'room', room: 1 },
    { id: 'bag',    title: 'Zaino grande',     cost: 50,  pos: [-3.6, 1.4], requires: { objectives: 4 },    effect: 'bag' },
    { id: 'boots',  title: 'Scarponi veloci',  cost: 45,  pos: [6.5, -0.6], requires: { objectives: 4 },    effect: 'boots' },
    { id: 'cocoa',  title: 'Cioccolata calda', cost: 60,  pos: [11, -4.4],  requires: { bought: 'room1' },  effect: 'cocoa' },
    { id: 'helper', title: 'Boscaiolo',        cost: 150, pos: [-11, -1],   requires: { bought: 'cocoa' },  effect: 'helper' },
    { id: 'room2',  title: 'Stanza 3',         cost: 120, pos: [-6, -6.5],  requires: { bought: 'helper' }, effect: 'room', room: 2 }
  ],
  objectives: [
    { text: 'Taglia 4 pezzi di legna: fermati vicino a un abete', stat: 'wood', n: 4, guide: 'tree' },
    { text: 'Porta la legna al camino della prima stanza', stat: 'fed', n: 3, guide: 'feed' },
    { text: 'Ospita il primo escursionista al caldo', stat: 'guests', n: 1, guide: '' },
    { text: 'Raccogli le monete lasciate dagli ospiti', stat: 'collected', n: 15, guide: 'pile' },
    { text: 'Sblocca la seconda stanza', bought: 'room1', guide: 'pad:room1' },
    { text: 'Apri il banco della cioccolata calda', bought: 'cocoa', guide: 'pad:cocoa' },
    { text: 'Servi 3 cioccolate agli ospiti che la chiedono', stat: 'cocoa', n: 3, guide: 'cocoa' },
    { text: 'Assumi un boscaiolo che porti la legna', bought: 'helper', guide: 'pad:helper' },
    { text: 'Sblocca la terza stanza', bought: 'room2', guide: 'pad:room2' },
    { text: 'Raggiungi 5 stelle di reputazione', stat: 'stars', n: 5, guide: '', decimals: 1 }
  ]
};
