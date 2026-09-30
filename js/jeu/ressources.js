// ---------- Ressources des regions (algorithme + filtre developpeur) ----------
// Pour le moment, seules les ressources issues de la terre (minerais et
// gisements, categorie "Naturel") existent, extraites par l'atelier de
// mineur. Les cultures, l'elevage, la chasse, la peche et les produits
// transformes ont ete retires (voir l'historique git pour les reprendre).
// 1. Profil de chaque region, deterministe: contexte geologique reel
//    (GEO_TERRAIN), gisements connus (GEO_DEPOSITS), aridite (meme modele
//    que les couleurs de la carte), littoral reel, et un bruit "geologique"
//    par minerai (zones coherentes a l'echelle d'un pays).
// 2. Chaque minerai a une regle score(profil) -> 0..1; seules les regions
//    les mieux notees l'obtiennent, a hauteur de sa part cible
//    (RESOURCE_SHARE), en niveaux moyenne/riche.
// Du plus commun au plus rare, l'ambre a part (gisement unique).
const MINERALS = ['fer', 'sel', 'cuivre', 'plomb', 'etain', 'alun', 'argent', 'or', 'ambre'];
// Cultures ("Sol / Qualite"): rendement = climat favorable x fertilite du
// sol de la region (et non richesse geologique).
const CROPS = ['ble', 'orge', 'seigle', 'avoine', 'lin', 'chanvre', 'garance', 'pastel', 'poivre', 'cannelle', 'girofle', 'muscade',
  'safran', 'bois', 'bois_chauffage', 'pierre'];
// Poissons d'eau douce: vivent dans les fleuves et les lacs (data/monde/water.json)
// et reviennent aux regions qu'ils traversent. Les poissons et animaux de
// mer vivent dans les zones de peche en mer (data/monde/fishing.json, plus bas).
const FRESH_FISH = ['carpe', 'brochet', 'perche', 'anguille', 'truite', 'saumon', 'esturgeon', 'sandre', 'coregone', 'carpe_amour', 'carassin',
  'silure_mekong', 'gourami', 'capitaine', 'tilapia', 'silure_nil', 'arapaima', 'surubi', 'pejerrey', 'silure_americain', 'truite_rouge',
  'saumon_pacifique', 'morue_murray', 'barramundi'];
// Animaux terrestres: elevage (ce qu'ils produisent), faune sauvage a
// chasser, predateurs (menace pour les troupeaux, fourrures).
const LAND_ANIMALS = {
  // elevage
  cheval:{ name:'Cheval', cat:'elevage', uses:'monture, trait, transport' }, ane:{ name:'Âne', cat:'elevage', uses:'bât, transport' },
  chameau:{ name:'Dromadaire', cat:'elevage', uses:'transport, lait, viande, cuir' },
  chameau_bactriane:{ name:'Chameau de Bactriane', cat:'elevage', uses:'transport, laine, lait' },
  vache:{ name:'Vache', cat:'elevage', uses:'lait, viande, cuir' }, zebu:{ name:'Zébu', cat:'elevage', uses:'lait, viande, cuir, trait' },
  buffle:{ name:'Buffle d\'eau', cat:'elevage', uses:'lait, trait, cuir' }, yak:{ name:'Yak', cat:'elevage', uses:'lait, laine, viande, bât' },
  mouton:{ name:'Mouton', cat:'elevage', uses:'laine, lait, viande' }, chevre:{ name:'Chèvre', cat:'elevage', uses:'lait, viande, peau' },
  chevre_cachemire:{ name:'Chèvre du Cachemire', cat:'elevage', uses:'laine fine (cachemire)' },
  cochon:{ name:'Cochon', cat:'elevage', uses:'viande, lard, cuir' }, renne_dom:{ name:'Renne domestique', cat:'elevage', uses:'lait, viande, peau, traîneau' },
  lama:{ name:'Lama', cat:'elevage', uses:'laine, bât, viande' }, alpaga:{ name:'Alpaga', cat:'elevage', uses:'laine fine' },
  elephant_asie:{ name:'Éléphant d\'Asie', cat:'elevage', uses:'trait, transport, guerre' },
  dindon:{ name:'Dindon', cat:'elevage', uses:'viande, plumes' }, cobaye:{ name:'Cobaye', cat:'elevage', uses:'viande' },
  // faune sauvage (chasse)
  cerf:{ name:'Cerf', cat:'faune', uses:'viande, peau, bois' }, chevreuil:{ name:'Chevreuil', cat:'faune', uses:'viande, peau' },
  sanglier:{ name:'Sanglier', cat:'faune', uses:'viande, cuir' }, elan:{ name:'Élan / orignal', cat:'faune', uses:'viande, peau' },
  renne:{ name:'Renne / caribou', cat:'faune', uses:'viande, peau' }, bison:{ name:'Bison', cat:'faune', uses:'viande, peau' },
  boeuf_musque:{ name:'Bœuf musqué', cat:'faune', uses:'laine, viande' }, castor:{ name:'Castor', cat:'faune', uses:'fourrure' },
  zibeline:{ name:'Zibeline', cat:'faune', uses:'fourrure précieuse' }, renard:{ name:'Renard', cat:'faune', uses:'fourrure' },
  hermine:{ name:'Hermine', cat:'faune', uses:'fourrure précieuse' }, lievre:{ name:'Lièvre', cat:'faune', uses:'viande, fourrure' },
  bouquetin:{ name:'Bouquetin / mouflon', cat:'faune', uses:'viande, cornes' }, saiga:{ name:'Saïga', cat:'faune', uses:'viande, cornes' },
  gazelle:{ name:'Gazelle', cat:'faune', uses:'viande, peau' }, antilope:{ name:'Antilope', cat:'faune', uses:'viande, peau' },
  zebre:{ name:'Zèbre', cat:'faune', uses:'peau' }, autruche:{ name:'Autruche', cat:'faune', uses:'plumes, œufs, cuir' },
  nandou:{ name:'Nandou', cat:'faune', uses:'plumes, viande' }, emeu:{ name:'Émeu', cat:'faune', uses:'plumes, viande' },
  elephant_afrique:{ name:'Éléphant d\'Afrique', cat:'faune', uses:'ivoire' }, hippopotame:{ name:'Hippopotame', cat:'faune', uses:'ivoire, cuir' },
  rhinoceros:{ name:'Rhinocéros', cat:'faune', uses:'corne, cuir' }, tapir:{ name:'Tapir', cat:'faune', uses:'viande, cuir' },
  capybara:{ name:'Capybara', cat:'faune', uses:'viande, cuir' }, guanaco:{ name:'Guanaco / vigogne', cat:'faune', uses:'laine fine, viande' },
  kangourou:{ name:'Kangourou', cat:'faune', uses:'viande, peau' }, casoar:{ name:'Casoar', cat:'faune', uses:'plumes, viande' },
  lemurien:{ name:'Lémurien', cat:'faune', uses:'curiosité, fourrure' },
  // predateurs
  loup:{ name:'Loup', cat:'predateur', uses:'menace les troupeaux, fourrure' }, ours_brun:{ name:'Ours brun', cat:'predateur', uses:'danger, fourrure, graisse' },
  ours_polaire:{ name:'Ours polaire', cat:'predateur', uses:'danger, fourrure' }, ours_noir:{ name:'Ours noir', cat:'predateur', uses:'danger, fourrure' },
  lion:{ name:'Lion', cat:'predateur', uses:'danger, peau' }, tigre:{ name:'Tigre', cat:'predateur', uses:'danger, peau' },
  leopard:{ name:'Léopard', cat:'predateur', uses:'danger, peau' }, guepard:{ name:'Guépard', cat:'predateur', uses:'danger, peau' },
  hyene:{ name:'Hyène', cat:'predateur', uses:'menace les troupeaux' }, jaguar:{ name:'Jaguar', cat:'predateur', uses:'danger, peau' },
  puma:{ name:'Puma', cat:'predateur', uses:'danger, peau' }, crocodile:{ name:'Crocodile / caïman', cat:'predateur', uses:'danger, cuir' },
  lynx:{ name:'Lynx', cat:'predateur', uses:'fourrure' }, panthere_neige:{ name:'Panthère des neiges', cat:'predateur', uses:'danger, fourrure' },
  dingo:{ name:'Dingo', cat:'predateur', uses:'menace les troupeaux' },
};
const animalsOf = cat => Object.keys(LAND_ANIMALS).filter(k => LAND_ANIMALS[k].cat === cat);
const RESOURCE_CATEGORIES = [
  { id:'naturel', label:'Minerais et gisements', items:MINERALS },
  { id:'sol', label:'Sol / Qualité', items:CROPS },
  { id:'peche', label:'Pêche en eau douce (fleuves, lacs)', items:FRESH_FISH },
  { id:'elevage', label:'Élevage', items:animalsOf('elevage') },
  { id:'faune', label:'Faune sauvage (chasse)', items:animalsOf('faune') },
  { id:'predateur', label:'Prédateurs', items:animalsOf('predateur') },
];
const clamp01 = x => Math.max(0, Math.min(1, x));
// fenetre climatique douce [a, b] avec transition de largeur s
const band = (x, a, b, s = 5) => clamp01(Math.min((x - a) / s + 1, (b - x) / s + 1));
// rendement selon la fertilite F (0..1): soft = culture peu exigeante
const yieldOf = (F, soft = 0) => (0.2 + 0.9 * F) * (1 - soft) + soft;

// bruit de valeur lisse (0..1), meme famille que les frontieres ondulees
function geoHash(ix, iy, s){ let h = (ix * 374761393 + iy * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967295; }
function geoNoise(lon, lat, seed, waveKm){
  const x = lon * 111.2 * Math.cos(lat * Math.PI / 180) / waveKm, y = lat * 111.2 / waveKm;
  const layer = (x, y, s) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = geoHash(ix, iy, s), b = geoHash(ix + 1, iy, s), c = geoHash(ix, iy + 1, s), d = geoHash(ix + 1, iy + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  return (layer(x, y, seed) * 0.65 + layer(x * 2.3, y * 2.3, seed + 31) * 0.35);
}

// Ressources: nom + regle score(profil de la region).
const RESOURCES = {
  // Naturel: p.terrain = contexte geologique (GEO_TERRAIN), p.deposit =
  // gisements historiques connus (GEO_DEPOSITS), p.geo = variation locale.
  // local(): la variation ne joue que la ou le contexte existe, pour que
  // les minerais localises ne debordent jamais hors de leur terrain.
  fer:           { name:'Fer',                  score:p => { const t = p.terrain;
    return 0.2 + t.montagne * 0.3 + t.sediment * 0.25 + t.ancien * 0.15 + p.deposit.fer * 0.7 + p.geo.fer * 0.35; } },
  sel:           { name:'Sel',                  score:p => { const t = p.terrain;
    return local(Math.max(t.evaporite, t.desert * 0.65, p.coastal ? 0.25 + t.desert * 0.5 : 0), p.geo.sel); } },
  cuivre:        { name:'Cuivre',               score:p => { const t = p.terrain;
    return local(Math.max(t.volcan * 0.7, t.montagne * 0.55) + t.desert * t.montagne * 0.1 + p.deposit.cuivre * 0.75, p.geo.cuivre); } },
  plomb:         { name:'Plomb',                score:p => { const t = p.terrain;
    return local(t.karst * 0.45 + t.montagne * 0.35 + p.deposit.plomb * 0.75 + p.deposit.argent * 0.25, p.geo.plomb) + t.sediment * 0.1; } },
  etain:         { name:'Étain',                score:p => local(p.terrain.granite * 1.05 + p.terrain.granite * p.terrain.montagne * 0.1, p.geo.etain) },
  alun:          { name:'Alun',                 score:p => local(p.terrain.hydrothermal * 0.95 + p.terrain.volcan * 0.35, p.geo.alun) },
  argent:        { name:'Argent',               score:p => { const t = p.terrain;
    return local(p.deposit.argent * 0.95 + t.volcan * t.montagne * 0.5 + p.deposit.plomb * 0.25 + p.deposit.cuivre * 0.15, p.geo.argent); } },
  or:            { name:'Minerai d\'or',        score:p => { const t = p.terrain;
    return local(p.deposit.or * 0.95 + t.ancien * 0.45 + t.alluvial * 0.3, p.geo.or); } },
  // Ambre: cote sud et est de la Baltique, le plus riche au Sambland
  ambre:         { name:'Ambre de la Baltique', score:p => p.coastal && p.lon > 9 && p.lon < 30 && p.lat > 53 && p.lat < 61
    ? 0.4 + 0.6 * smooth01(1 - geoDist(p.lat, p.lon, 54.9, 20.2) / 8) : 0 },
  // Sol / Qualite: p.fertility (0..1), p.absLat (climat), p.arid/p.humid
  ble:           { name:'Blé',                  score:p => band(p.absLat, 25, 55, 8) * (1 - p.arid * 0.8) * yieldOf(p.fertility) },
  orge:          { name:'Orge',                 score:p => band(p.absLat, 20, 62, 8) * (1 - p.arid * 0.5) * yieldOf(p.fertility, 0.25) },
  seigle:        { name:'Seigle',               score:p => band(p.absLat, 45, 64, 5) * (1 - p.arid * 0.6) * yieldOf(p.fertility, 0.4) },
  avoine:        { name:'Avoine',               score:p => band(p.absLat, 40, 62, 5) * p.humid * yieldOf(p.fertility, 0.15) },
  lin:           { name:'Lin',                  score:p => band(p.absLat, 40, 60, 5) * p.humid * yieldOf(p.fertility) },
  chanvre:       { name:'Chanvre',              score:p => band(p.absLat, 28, 58, 6) * (1 - p.arid * 0.7) * yieldOf(p.fertility) },
  garance:       { name:'Garance',              score:p => band(p.absLat, 30, 50, 5) * band(p.arid, 0.05, 0.55, 0.12) * yieldOf(p.fertility) },
  pastel:        { name:'Pastel/guède',         score:p => band(p.absLat, 40, 56, 4) * p.humid * yieldOf(p.fertility) },
  poivre:        { name:'Poivre',               score:p => p.tropical * p.humid * band(p.absLat, 0, 14, 3) * spiceOrigin(p, 'poivre') * yieldOf(p.fertility) },
  cannelle:      { name:'Cannelle',             score:p => p.tropical * p.humid * band(p.absLat, 0, 10, 3) * (p.coastal ? 1 : 0.5) * spiceOrigin(p, 'cannelle') * yieldOf(p.fertility) },
  girofle:       { name:'Clou de girofle',      score:p => p.tropical * p.humid * band(p.absLat, 0, 8, 2) * (p.coastal ? 1 : 0.3) * spiceOrigin(p, 'girofle') * yieldOf(p.fertility) },
  muscade:       { name:'Muscade',              score:p => p.tropical * p.humid * band(p.absLat, 0, 8, 2) * (p.coastal ? 1 : 0.3) * spiceOrigin(p, 'muscade') * yieldOf(p.fertility) },
  safran:        { name:'Safran',               score:p => band(p.absLat, 30, 42, 3) * band(p.arid, 0.25, 0.7, 0.12) * spiceOrigin(p, 'safran') * yieldOf(p.fertility, 0.5) },
  bois:          { name:'Bois de construction', score:p => p.forest * yieldOf(p.fertility, 0.5) },
  bois_chauffage:{ name:'Bois de chauffage',    score:p => (p.forest * 0.8 + p.humid * 0.25) * yieldOf(p.fertility, 0.5) },
  // sols minces et rocheux: la pierre affleure la ou la terre est pauvre
  pierre:        { name:'Pierre de taille',     score:p => (1 - p.fertility) * 0.45 + p.terrain.montagne * 0.4 + p.geo.pierre * 0.3 },
};
const FRESH_FISH_NAMES = { carpe:'Carpe', brochet:'Brochet', perche:'Perche', anguille:'Anguille', truite:'Truite', saumon:'Saumon',
  esturgeon:'Esturgeon', sandre:'Sandre', coregone:'Corégone', carpe_amour:'Carpe amour', carassin:'Carassin',
  silure_mekong:'Poisson-chat géant du Mékong', gourami:'Gourami', capitaine:'Capitaine (perche du Nil)', tilapia:'Tilapia',
  silure_nil:'Poisson-chat du Nil', arapaima:'Arapaima / Pirarucu', surubi:'Surubi', pejerrey:'Pejerrey',
  silure_americain:'Poisson-chat américain', truite_rouge:'Truite rouge', saumon_pacifique:'Saumon du Pacifique',
  morue_murray:'Morue de Murray', barramundi:'Barramundi' };
// pas de regle de score: l'eau douce vient des fleuves et lacs (applyWaterFish)
FRESH_FISH.forEach(k => { RESOURCES[k] = { name:FRESH_FISH_NAMES[k], score:() => 0 }; });
// Poissons de chaque fleuve reel (nom de data/monde/water.json)
const RIVER_FISH = {
  'Nil':['capitaine', 'tilapia', 'silure_nil'], 'Canal de Coptos':['capitaine', 'tilapia'], 'Nil Bleu':['tilapia', 'silure_nil'], 'Niger':['capitaine', 'tilapia', 'silure_nil'],
  'Bénoué':['capitaine', 'tilapia', 'silure_nil'], 'Chari':['capitaine', 'tilapia'], 'Sénégal':['capitaine', 'tilapia'], 'Volta':['capitaine', 'tilapia'],
  'Gambie':['capitaine', 'tilapia'],
  'Amazone':['arapaima', 'surubi'], 'Rio Negro':['arapaima'], 'Madeira':['arapaima', 'surubi'], 'Purus':['arapaima'], 'Tapajós':['arapaima'],
  'Xingu':['arapaima'], 'Tocantins':['arapaima', 'surubi'], 'Orénoque':['arapaima', 'surubi'], 'Magdalena':['surubi'],
  'Paraná':['surubi', 'pejerrey'], 'Paraguay':['surubi'], 'Uruguay':['surubi', 'pejerrey'], 'São Francisco':['surubi'],
  'Mississippi':['silure_americain', 'esturgeon', 'perche'], 'Missouri':['silure_americain', 'esturgeon'], 'Ohio':['silure_americain', 'perche'],
  'Arkansas':['silure_americain'], 'Rio Grande':['silure_americain', 'truite_rouge'], 'Colorado':['truite_rouge', 'silure_americain'],
  'Columbia':['saumon_pacifique', 'esturgeon', 'truite_rouge'], 'Fraser':['saumon_pacifique', 'esturgeon'], 'Yukon':['saumon_pacifique', 'coregone'],
  'Mackenzie':['coregone', 'brochet', 'truite_rouge'], 'Saint-Laurent':['esturgeon', 'anguille', 'perche', 'brochet'],
  'Nelson':['brochet', 'perche', 'coregone'], 'Saskatchewan':['brochet', 'perche', 'esturgeon'],
  'Volga':['esturgeon', 'sandre', 'brochet'], 'Kama':['sandre', 'brochet'], 'Oka':['sandre', 'brochet'], 'Oural':['esturgeon', 'sandre'],
  'Danube':['carpe', 'esturgeon', 'sandre'], 'Tisza':['carpe', 'sandre', 'brochet'], 'Save':['carpe', 'brochet'],
  'Dniepr':['esturgeon', 'sandre', 'carpe'], 'Don':['esturgeon', 'sandre', 'carpe'], 'Dniestr':['carpe', 'sandre'],
  'Rhin':['saumon', 'anguille', 'brochet'], 'Moselle':['brochet', 'truite'], 'Main':['brochet', 'carpe'],
  'Elbe':['anguille', 'brochet', 'carpe'], 'Oder':['esturgeon', 'brochet', 'anguille'], 'Vistule':['esturgeon', 'brochet', 'anguille'],
  'Loire':['saumon', 'anguille', 'brochet'], 'Seine':['brochet', 'anguille', 'carpe'], 'Rhône':['truite', 'brochet', 'anguille'],
  'Garonne':['esturgeon', 'saumon', 'anguille'], 'Tage':['anguille', 'carpe'], 'Douro':['anguille', 'truite'], 'Èbre':['anguille', 'carpe'],
  'Guadalquivir':['anguille', 'carpe'], 'Pô':['esturgeon', 'anguille', 'carpe'], 'Tamise':['saumon', 'anguille', 'brochet'],
  'Dvina du Nord':['saumon', 'coregone', 'brochet'], 'Petchora':['saumon', 'coregone'], 'Daugava':['saumon', 'brochet'],
  'Niémen':['saumon', 'anguille', 'brochet'], 'Glomma':['truite', 'saumon'],
  'Yangtsé':['carpe', 'carpe_amour', 'esturgeon'], 'Fleuve Jaune':['carpe', 'carassin'], 'Mékong':['silure_mekong', 'gourami', 'carpe'],
  'Gange':['carpe', 'gourami'], 'Yamuna':['carpe'], 'Brahmapoutre':['carpe'], 'Indus':['carpe'], 'Godavari':['carpe'], 'Krishna':['carpe'],
  'Narmada':['carpe'], 'Mahanadi':['carpe'], 'Irrawaddy':['gourami', 'carpe'], 'Salouen':['gourami', 'carpe'],
  'Chao Phraya':['silure_mekong', 'gourami'], 'Rivière des Perles':['carpe', 'carpe_amour'], 'Fleuve Rouge':['carpe', 'carpe_amour'],
  'Ob':['coregone', 'esturgeon', 'brochet'], 'Irtych':['esturgeon', 'coregone'], 'Ienisseï':['coregone', 'esturgeon'], 'Angara':['coregone'],
  'Léna':['coregone', 'esturgeon'], 'Kolyma':['coregone'], 'Indiguirka':['coregone'], 'Amour':['carpe_amour', 'esturgeon', 'carassin'],
  'Songhua':['carpe_amour', 'carassin'], 'Syr-Daria':['sandre', 'carassin'], 'Amou-Daria':['sandre', 'carassin'],
  'Tigre':['carpe', 'carassin'], 'Euphrate':['carpe', 'carassin'], 'Koura':['esturgeon', 'sandre'], 'Tarim':['carassin'],
  'Murray':['morue_murray'], 'Darling':['morue_murray'], 'Murrumbidgee':['morue_murray'], 'Cooper Creek':['morue_murray'], 'Gascoyne':['morue_murray'],
  'Flinders':['barramundi'], 'Fitzroy':['barramundi'], 'Victoria':['barramundi'], 'Burdekin':['barramundi'], 'Fly':['barramundi'], 'Sepik':['barramundi'],
};
// Poissons d'un lac (ou d'un fleuve absent de la liste) selon sa position
function freshFishAt(lon, lat){
  if(lon > 110 && lat < -10) return lat > -20 ? ['barramundi'] : ['morue_murray'];                  // Australie, Nouvelle-Zelande
  if(lon > 95 && lon < 160 && lat < 8 && lat > -12) return ['gourami', 'barramundi'];              // Insulinde, Nouvelle-Guinee
  if(lon < -30 && lon > -85 && lat < 13){                                                          // Amerique du Sud
    if(lat < -25) return ['pejerrey']; return lon < -45 && lat > -15 ? ['arapaima', 'surubi'] : ['surubi']; }
  if(lon < -50){ if(lat > 45) return ['brochet', 'perche', 'coregone']; if(lon < -104 && lat > 30) return ['truite_rouge']; return ['silure_americain', 'perche']; }
  if(lon >= -20 && lon < 52 && lat < 35 && lat > -36){                                              // Afrique
    return lat > -5 && lat < 16 ? ['tilapia', 'capitaine', 'silure_nil'] : ['tilapia', 'silure_nil']; }
  if(lon < 40 && lat >= 35) return lat > 55 ? ['brochet', 'coregone', 'perche'] : ['carpe', 'brochet', 'perche'];   // Europe
  if(lat > 50) return ['coregone', 'brochet'];                                                        // Siberie
  if(lon < 90 && lat > 35) return ['sandre', 'carassin'];                                             // Asie centrale, Caucase
  if(lon < 63) return ['carpe', 'carassin'];                                                          // Moyen-Orient
  if(lon < 100 && lat < 35) return ['carpe', 'gourami'];                                             // Inde
  if(lat < 23) return ['gourami', 'carpe'];                                                           // Asie du Sud-Est
  return ['carpe', 'carassin', 'carpe_amour'];                                                        // Chine, Coree, Japon
}
const riverFish = r => RIVER_FISH[r.n] || freshFishAt(...r.c[Math.floor(r.c.length / 2)]);
Object.entries(LAND_ANIMALS).forEach(([k, a]) => { RESOURCES[k] = { name:a.name, score:() => 0 }; });
const lakeFish = l => freshFishAt(...turf.centroid(turf.polygon([l.p])).geometry.coordinates);

// Especes de mer: poissons et animaux marins des zones de peche.
const SEA_FISH = { hareng:'Hareng', morue:'Morue', maquereau:'Maquereau', sardine:'Sardine', anchois:'Anchois', bar:'Bar', merlu:'Merlu',
  thon_rouge:'Thon rouge', chinchard:'Chinchard', saumon_pacifique:'Saumon du Pacifique', sebaste:'Sébaste', merou:'Mérou',
  thon:'Thon', tassergal:'Tassergal', sardinelle:'Sardinelle', anchois_perou:'Anchois du Pérou', fletan:'Flétan',
  anguille:'Anguille', esturgeon:'Esturgeon' };
const SEA_ANIMALS = { baleine:'Baleine', cachalot:'Cachalot', phoque:'Phoque', morse:'Morse', tortue:'Tortue marine', requin:'Requin' };
const SEA_NAMES = { ...SEA_FISH, ...SEA_ANIMALS };
// Zones de peche en mer (data/monde/fishing.json, genere par outils/build-fishing.js):
// formes qui suivent la cote (cotiere, hauturiere) ou ovales du large
// (pleine-mer), sans chevauchement; dessinees sous les terres.
let FISHING_ZONES = [];
const FISH_ZONE_TYPES = { cotiere:'Pêche côtière', hauturiere:'Pêche hauturière', 'pleine-mer':'Pêche en pleine mer' };
const FISH_ZONE_COLORS = { cotiere:'#2a9d8f', hauturiere:'#1f5f8b', 'pleine-mer':'#123b63' };

// Berceaux historiques des epices: le climat seul les mettrait dans toute
// la zone tropicale, leurs vraies terres d'origine sont bien plus etroites.
const SPICE_ORIGINS = {
  poivre:[[11,76,5],[0,101,6],[-7,108,4],[13,101,4]],       // Malabar, Sumatra, Java, Siam
  cannelle:[[7.5,80.7,4],[10,77,4],[15,105,4]],             // Ceylan, sud de l'Inde, Indochine
  girofle:[[0.8,127.5,8],[-3.5,128.2,8]],                   // Moluques (Ternate, Ambon), iles fondues dans de grandes regions
  muscade:[[-4.5,129.9,8],[-3.5,128.2,8]],                  // iles Banda
  safran:[[34,58,5],[34,75,3],[39,-3,3],[38,22,3],[39,34,4]], // Perse, Cachemire, Castille, Grece, Anatolie
};
const spiceOrigin = (p, k) => 0.15 + zoneScore(p.lat, p.lon, SPICE_ORIGINS[k], 1.3) * 1.5;
// Qualite des sols (overlay "Sol / Qualite"): 5 niveaux de fertilite
const SOIL_LEVELS = ['Stérile', 'Pauvre', 'Moyen', 'Fertile', 'Très fertile'];
// meme echelle que les autres filtres (sterile gris ... fertile vert, tres fertile vert fonce)
const SOIL_COLORS = ['#9a9a9a', '#d64541', '#f0932b', '#2e9e4f', '#1c6e34'];
const soilLevelOf = F => F < 0.15 ? 0 : F < 0.35 ? 1 : F < 0.55 ? 2 : F < 0.75 ? 3 : 4;
// Terres reellement tres fertiles: tchernoziom, loess, grandes plaines
// alluviales et deltas (y compris en climat sec: Nil, Mesopotamie, Indus).
const FERTILE_ZONES = [[49,36,9],[53,62,5],[-34,-61,6],[41,-93,7],[51,-104,5],[36,112,6],[26,82,8],[28,31,3.5],[33,44.5,3.5],
  [45,10.5,2.5],[48.7,2,3],[47,20,3],[44.5,26,3],[-7.3,110,4],[10,105.8,3],[31,117,5],[21,106,2],[23.5,90,3],[30,72,4],
  [37,-120.5,3],[32,-91,4],[30.5,105,3],[37.5,-5.5,2],[0,32,3],[18,95.5,3],[15,100.5,2.5],[-23,-50,4],[52,6,2.5],[51,-0.5,2]];
function soilFertility(p){
  const moist = clamp01(p.humid * 1.1 - 0.05), warm = 1 - p.cold;
  // sols tropicaux humides lessives (lateritiques, Amazonie, Congo): pauvres
  const base = moist * warm * (1 - p.terrain.montagne * 0.5) * (1 - p.tropical * moist * 0.6);
  const zone = zoneScore(p.lat, p.lon, FERTILE_ZONES);
  // sols volcaniques (Java, Campanie, Ethiopie) et plaines alluviales enrichis
  const F = base * 0.85 + p.terrain.volcan * moist * 0.2 + zone * 0.45 + p.terrain.alluvial * 0.1 + (p.geo.sol - 0.5) * 0.2;
  return clamp01(Math.max(F, zone * 0.9));
}
const RESOURCE_SEEDS = { fer:11, etain:23, cuivre:37, plomb:41, argent:53, or:67, alun:71, sel:83, pierre:97, sol:149 };
// Echelle commune a tous les filtres: 0 absente (gris), 1 faible (rouge),
// 2 moyenne (orange), 3 elevee (vert)
const RESOURCE_LEVELS = ['Absente', 'Faible', 'Moyenne', 'Élevée'];
const LEVEL_COLORS = ['#9a9a9a', '#d64541', '#f0932b', '#2e9e4f'];

// ---------- Geologie (minerais "Naturel") ----------
// Contextes geologiques reels, en zones [lat, lon, rayon en degres]:
// score 1 au centre, nul au-dela du rayon. Le terrain d'une region croise
// ces zones avec son climat (desert) et son littoral; les gisements
// historiques connus renforcent localement chaque minerai.
const GEO_TERRAIN = {
  // chaines de montagnes jeunes (orogenese alpine, cordilleres)
  montagne:[[46,10,4.5],[42.7,0.5,2.5],[47,24,4],[43,19,3.5],[42.5,44,3],[38,40,5],[32,52,5],[29,84,7],[34,92,8],[36,70,5],[42,80,5],
    [49,88,4],[52,97,4],[45,-112,9],[38,-106,6],[22,-104,6],[-5,-78,6],[-18,-68,6],[-32,-70,5],[-45,-72,4],[32,-5,4],[10,39,5],
    [37,138,5],[15,121,5],[24,100,5],[-5,142,4],[-43,171,3],[22,40,4],[62,-150,6],[65,130,6],[56,159,4],[40,-4,2.5],[37,-3.5,2]],
  // arcs volcaniques, rifts et points chauds
  volcan:[[40.5,14.5,3],[37.5,15,1.5],[37.5,25,2.5],[65,-19,3],[38.5,34,3],[40,44.5,2.5],[-2,36,5],[12,41,3.5],[5,10,2],[28,-16,2],
    [36,138,5],[52,157,5],[12,123,5],[-7,110,6],[0,100,4],[-8,120,4],[-6,148,4],[-39,176,3],[-2,-78,4],[-17,-70,4],[-38,-71,4],
    [13,-88,4],[19,-100,4],[45,-122,4],[57,-158,5],[20,-157,2],[44,-110,3],[45.5,3,1.5],[50.5,7,1.5],[15,44,3],[38.5,70,2]],
  // boucliers et massifs anciens (roches precambriennes, vieilles montagnes)
  ancien:[[55,-85,14],[64,25,7],[48.5,30,3],[62,110,10],[-12,-50,11],[5,-60,6],[10,-6,9],[-5,23,8],[-24,28,6],[-4,34,4],[18,78,8],
    [-26,120,9],[20,36,6],[38,114,6],[58,60,5],[38,-80,6],[63,13,5],[57,-4.5,2],[49.5,14,3],[45.5,2.5,2],[-28,150,6],[-19,-44,5],[64,-139,4]],
  // bassins sedimentaires et plateformes calcaires
  sediment:[[48.5,2.5,3.5],[52,-1,3],[51,9,3],[50,20,4],[55,40,9],[40,-98,9],[37,-86,4],[44,-84,4],[27,45,6],[30,-5,4],[-31,129,4],
    [-30,-62,7],[34,108,5],[40,-4,3],[38,-2,2],[48,-100,6]],
  // karsts (calcaires fissures, plomb-zinc de type Mississippi)
  karst:[[44,17,3],[44.3,3.2,1.5],[25,107,5],[20,-89,3],[37.5,-91,4],[37,-86,3],[37.5,33,3],[33,48,4],[54,-2,2],[50.4,18.8,2],[42.5,-5,2]],
  // provinces granitiques stanniferes
  granite:[[50.3,-5,1.8],[48,-3,2],[42,-8,3],[50.5,13,2],[4,101.5,6],[-2.5,106.5,2.5],[23.4,103,3],[-19,-66,4],[9.8,8.9,2],[-2,28,3],
    [51,115,4],[-42,146,2],[16,98,3],[-17,31,2],[69,139,4],[45,135,3],[-17,145,3],[-10,-63,3],[-21.5,15.5,2.5],[-7.3,27.4,3],
    [49,80,3],[25,112,3],[64,-165,3],[43,11,1.5]],
  // bassins evaporitiques (sel gemme, lacs sales, anciennes mers asséchees)
  evaporite:[[52.5,12,5],[47.6,13.5,1.5],[50,20,2],[48.5,6.5,2],[53.2,-2.5,1.5],[41.9,1.7,1.5],[46,24,3],[59,56,4],[31.5,35.5,2],
    [14,40.5,2.5],[22,-4,4],[18.7,12.9,3],[34,53,5],[32.7,72.5,2],[30,104,4],[37,95,4],[41,-112.5,3],[30,-92,4],[43,-84,3],
    [-21,-68,4],[-20.5,25.5,3],[45,50,5],[45,60,4],[-28.5,137.5,4],[53,104,3],[36,10,2],[35,-1,2]],
  // activite hydrothermale (alunite: Tolfa, Phocee, Karahisar, Solfatares...)
  hydrothermal:[[42.2,11.9,1.8],[38.6,27,2],[40.3,38.4,2],[40.8,14.1,1.2],[38.5,14.9,1],[50.3,13,1.5],[14,44,2],[36.5,138.5,3],
    [-38.5,176.2,2],[64,-20,2],[44.6,-110.5,2],[-23,-68,3],[37,-3,1.5],[31,119,3]],
};
const GEO_DEPOSITS = {
  fer:[[49.3,6,2],[67.8,20.2,3],[47.5,14.9,1.5],[42.8,10.3,1],[43.2,-3,1.5],[47.9,33.4,2],[51,37,3],[53.4,59,2],[50.8,8,1.5],
    [47.5,-92.5,3],[54,-67,4],[-6,-50.5,3],[-20,-43.8,2.5],[-22.5,118,4],[41,123,2.5],[22,85.5,3],[7.6,-8.5,2.5],[22.7,-12.5,2.5],
    [33.5,-86.8,2],[60,15,2],[52.5,-1.5,1.5],[28,112,3]],
  cuivre:[[35,33,1.5],[37.7,-6.6,2],[60.6,15.6,1.5],[51.6,11.5,1.3],[48.7,19.1,1.3],[30.5,35.2,1.5],[23.5,57,2.5],[38.3,39.8,2],
    [-24,-69,5],[-15,-72,3],[33,-111,4],[46,-112.5,2],[47.2,-88.4,2],[-12.5,27.5,4],[47.8,67.7,2.5],[43,106.9,2.5],[26.1,103.1,2],
    [36.6,139.4,1.5],[-4,137,2],[29,34,1.5],[57,60,3],[44.5,22,1.5]],
  plomb:[[54,-2,2],[51.3,-2.7,1],[51.8,10.6,1.5],[50.4,18.8,2],[39.3,8.5,1.5],[37.7,24,1],[44.2,3.5,2],[38.2,-3.7,3],[42.9,20.9,2],
    [37.5,-91,4],[-32,141.5,2],[-20.7,139.5,2],[24,108,5],[23,-102.5,3],[-10.7,-76.3,2],[34.5,-2,2],[37.5,33,2],[41.5,24.5,2]],
  argent:[[37.7,24,1],[51.8,10.6,1.3],[50.5,13,1.8],[49.9,15.3,1.5],[47.3,11.7,1.2],[48.45,18.9,1.2],[-19.6,-65.75,2.5],
    [22.5,-102,4],[-10.7,-76.3,2],[37.7,-6.6,2],[39.3,8.5,1.3],[42.6,21.4,1.5],[39.3,-119.6,2],[47.5,-115.9,2],[35.1,132.4,1.5],
    [40.5,39.5,1.5],[35.5,69.8,2],[41,69.5,2],[44.2,3.5,1.5]],
  or:[[-26.2,27.9,2.5],[6,-1.8,3],[13,-11,3],[21,33,4],[-19,30,3],[56,60,4],[46.2,23,2],[62,150,5],[58,114,4],[64,-139,3],
    [38.5,-120.7,2.5],[-19.5,-43.5,3],[-30.7,121.5,3],[-37.5,144,2],[6,-75.5,3],[-13,-72,2],[-45,169.5,2],[42.5,-7,2],
    [48.5,15,1.5],[-6,35,3],[15,76,2.5],[48,121,3],[31,34.5,1]],
};
// distance en degres (longitude ramenee a la latitude), antimeridien gere
function geoDist(lat, lon, clat, clon){
  const dl = ((lon - clon + 540) % 360) - 180;
  return Math.hypot(lat - clat, dl * Math.cos((lat + clat) * Math.PI / 360));
}
const local = (base, noise) => base > 0.02 ? base + noise * 0.25 : 0;
const zoneScore = (lat, lon, zones, reach = 1) => zones.reduce((best, [clat, clon, r]) => Math.max(best, smooth01(1 - geoDist(lat, lon, clat, clon) / (r * reach))), 0);
// portee elargie pour les contextes tres localises: une region du jeu est
// bien plus vaste qu'un district minier, son centre doit pouvoir y tomber
const GEO_REACH = { granite:1.6, volcan:1.25, hydrothermal:1.5 };
function geoTerrain(lat, lon, arid, humid){
  const t = {};
  for(const [k, zones] of Object.entries(GEO_TERRAIN)) t[k] = zoneScore(lat, lon, zones, GEO_REACH[k]);
  t.desert = arid;
  // hors bassin identifie: plaine basse ni montagneuse ni bouclier = sedimentaire modere
  t.sediment = Math.max(t.sediment, 0.35 * (1 - t.montagne) * (1 - t.ancien) * (1 - t.volcan));
  // lits de rivieres: plaines humides en aval des massifs anciens ou aurifères
  t.alluvial = humid * (1 - t.montagne * 0.5) * Math.max(t.ancien, zoneScore(lat, lon, GEO_DEPOSITS.or));
  return t;
}

// Profil d'une region (a remplacer par l'etude des sols)
function regionProfile(f){
  const c = capitalById.get(f.id) || turf.centroid(f).geometry.coordinates;
  const lon = ((c[0] + 540) % 360) - 180, lat = c[1], absLat = Math.abs(lat);
  const arid = aridityAt(lat, lon), humid = 1 - arid;
  const cold = smooth01((absLat - 48) / 20), tropical = 1 - smooth01((absLat - 12) / 12);
  const coastal = !!coastOf(f.id);
  const geo = {}; for(const [k, s] of Object.entries(RESOURCE_SEEDS)) geo[k] = geoNoise(lon, lat, s, 700);
  const terrain = geoTerrain(lat, lon, arid, humid);
  const deposit = {}; for(const [k, zones] of Object.entries(GEO_DEPOSITS)) deposit[k] = zoneScore(lat, lon, zones);
  const forest = clamp01(humid * 1.15 - 0.1) * (1 - smooth01((absLat - 64) / 8)) * (1 - terrain.montagne * 0.25);
  const p = { lon, lat, absLat, arid, humid, cold, tropical, coastal, forest, geo, terrain, deposit };
  p.fertility = soilFertility(p);
  return p;
}
// Part cible de regions (0..1), decroissante selon l'abondance reelle
// (fer > sel > cuivre > plomb > etain > alun > argent > or): les 30 %
// superieurs des regions retenues sont riches, les autres moyennes.
// L'ambre, sans part cible, garde des seuils fixes (cote balte).
// Cultures: seuils fixes sur le rendement, sauf les epices (rares) et la
// pierre (sinon presente presque partout).
const RESOURCE_SHARE = { fer:0.42, sel:0.3, cuivre:0.2, plomb:0.15, etain:0.09, alun:0.07, argent:0.055, or:0.045,
  poivre:0.07, cannelle:0.05, girofle:0.03, muscade:0.03, safran:0.05, pierre:0.4 };
const levelOf = s => s >= 0.7 ? 3 : s >= 0.5 ? 2 : s >= 0.33 ? 1 : 0;
const regionResources = new Map();  // numero de region -> { ressource: niveau }
const regionSoil = new Map();       // numero de region -> niveau de fertilite (0..4)
function computeResources(){
  const feats = regionsFc.features, profiles = feats.map(regionProfile), res = feats.map(() => ({}));
  for(const id of [...MINERALS, ...CROPS]){
    const scores = profiles.map(p => Math.max(0, RESOURCES[id].score(p) || 0));
    const share = RESOURCE_SHARE[id];
    if(share === undefined){ scores.forEach((s, i) => { const lv = levelOf(s); if(lv) res[i][id] = lv; }); continue; }
    const ranked = scores.map((s, i) => [s, i]).filter(x => x[0] > 0).sort((x, y) => y[0] - x[0]).slice(0, Math.round(share * feats.length));
    ranked.forEach(([, i], k) => { const q = k / ranked.length; res[i][id] = q < 0.25 ? 3 : q < 0.6 ? 2 : 1; });
  }
  feats.forEach((f, i) => { regionResources.set(f.id, res[i]); regionSoil.set(f.id, soilLevelOf(profiles[i].fertility)); });
  applyWaterFish();
}
// Eau douce: chaque fleuve et chaque lac donne ses poissons aux regions
// qu'il traverse (grand fleuve ou grand lac: riche, sinon moyen).
const regionWaters = new Map();   // numero de region -> { rivers:[noms], lakes:n }
function applyWaterFish(){
  if(!waterData) return;
  const give = (rid, fish, lv) => { const r = regionResources.get(rid); if(!r) return; fish.forEach(k => { r[k] = Math.max(r[k] || 0, lv); }); };
  const note = rid => { if(!regionWaters.has(rid)) regionWaters.set(rid, { rivers:[], lakes:0 }); return regionWaters.get(rid); };
  waterData.rivers.forEach(r => { const fish = riverFish(r), lv = riverLevel(r);
    (r.r || []).forEach(rid => { give(rid, fish, lv); note(rid).rivers.push(r.n); }); });
  waterData.lakes.forEach(l => { if(!l.r) return; give(l.r, lakeFish(l), lakeLevel(l)); note(l.r).lakes++; });
}
const riverLevel = r => r.cls === 1 ? 3 : r.cls === 2 ? 2 : 1;
const lakeLevel = l => l.a >= 5000 ? 3 : l.a >= 1500 ? 2 : 1;

// Filtre developpeur, deux onglets: "Minerais et gisements" (une
// ressource -> regions colorees selon l'abondance) et "Sol / Qualite"
// (overlay de fertilite des sols, ou rendement d'une culture).
const SOIL_OVERLAY = '__sol', SEA_PREFIX = 'mer:';
let resourceFilter = null, resourceTab = 'naturel';
function applyResourceFilter(){
  if(!map.getLayer('resource-fill')) return;
  const soil = resourceFilter === SOIL_OVERLAY, counts = soil ? [0, 0, 0, 0, 0] : [0, 0, 0, 0];
  regionsFc.features.forEach(f => {
    const lv = soil ? regionSoil.get(f.id) : resourceFilter ? (regionResources.get(f.id)[resourceFilter] || 0) : 0;
    counts[lv]++;
    map.setFeatureState({ source:'regions', id:f.id }, soil ? { soil:lv } : { res:lv });
  });
  map.setLayoutProperty('resource-fill', 'visibility', resourceFilter && !soil ? 'visible' : 'none');
  map.setLayoutProperty('soil-fill', 'visibility', soil ? 'visible' : 'none');
  const info = document.getElementById('dev-resource-info');
  const seaFish = resourceFilter && resourceFilter.startsWith(SEA_PREFIX) ? resourceFilter.slice(SEA_PREFIX.length) : null;
  highlightFishingZones(seaFish);
  const fresh = resourceFilter && FRESH_FISH.includes(resourceFilter) ? resourceFilter : null;
  highlightFreshWaters(fresh);
  if(seaFish){
    map.setLayoutProperty('resource-fill', 'visibility', 'none');
    const zc = [0, 0, 0, 0]; FISHING_ZONES.forEach(z => zc[seaLevel(z, seaFish)]++);
    const zones = FISHING_ZONES.filter(z => z.fish.includes(seaFish));
    info.innerHTML = '<div class="res-count">' + SEA_NAMES[seaFish] + ' : <b>' + zones.length + '</b> zones de pêche en mer</div>' + levelLegend(zc) +
      '<ul class="fish-zone-list">' + zones.map(z => '<li>' + z.name + ' — ' + RESOURCE_LEVELS[seaLevel(z, seaFish)].toLowerCase() + '</li>').join('') + '</ul>';
    return;
  }
  if(fresh && waterData){
    const rivers = waterData.rivers.filter(r => riverFish(r).includes(fresh)), lakes = waterData.lakes.filter(l => lakeFish(l).includes(fresh)).length;
    info.innerHTML = '<div class="res-count">' + RESOURCES[fresh].name + ' : <b>' + rivers.length + '</b> fleuves, <b>' + lakes + '</b> lacs, <b>' + (counts[1] + counts[2] + counts[3]) + '</b> régions</div>' + levelLegend(counts) +
      (rivers.length ? '<ul class="fish-zone-list">' + rivers.slice(0, 12).map(r => '<li>' + r.n + '</li>').join('') + (rivers.length > 12 ? '<li>…</li>' : '') + '</ul>' : '');
    return;
  }
  updateAnimalLayers();
  const animal = resourceFilter && LAND_ANIMALS[resourceFilter] ? resourceFilter : null;
  if(animal){
    const zones = ANIMAL_ZONES.filter(z => zoneAnimals(z).includes(animal)), nReg = zones.reduce((a, z) => a + z.regions.length, 0);
    info.innerHTML = '<div class="res-count">' + LAND_ANIMALS[animal].name + ' : <b>' + zones.length + '</b> zones, <b>' + nReg + '</b> régions</div>' + levelLegend(counts) +
      '<div class="soil-note">' + LAND_ANIMALS[animal].uses + '</div>' +
      '<ul class="fish-zone-list">' + zones.map(z => '<li>' + z.name + '</li>').join('') + '</ul>';
    return;
  }
  if(!resourceFilter){ info.innerHTML = ''; return; }
  if(soil){
    info.innerHTML = '<div class="res-count">Qualité des sols — ' + regionsFc.features.length + ' régions</div>' +
      [4, 3, 2, 1, 0].map(lv => '<div class="res-legend"><i class="soil' + lv + '"></i>' + SOIL_LEVELS[lv] + '<span>' + counts[lv] + '</span></div>').join('') +
      '<div class="soil-note">La fertilité détermine le rendement des cultures de cet onglet.</div>';
    return;
  }
  info.innerHTML = '<div class="res-count">Présente dans <b>' + (counts[1] + counts[2] + counts[3]) + '</b> régions sur ' + regionsFc.features.length + '</div>' + levelLegend(counts);
}
// Legende commune: eleve, moyen, faible, absent (avec le nombre de regions ou de zones)
const levelLegend = counts => [3, 2, 1, 0].map(lv => '<div class="res-legend"><i class="lv' + lv + '"></i>' + RESOURCE_LEVELS[lv] + '<span>' + counts[lv] + '</span></div>').join('');
// Abondance d'une espece dans une zone de peche: la premiere espece de la
// liste est la plus abondante (elevee), la deuxieme moyenne, les autres faibles
const seaLevel = (z, sp) => { const i = z.fish.indexOf(sp); return i < 0 ? 0 : i === 0 ? 3 : i === 1 ? 2 : 1; };
// Contenu du selecteur selon l'onglet; l'onglet Sol s'ouvre sur l'overlay
function renderResourceTab(){
  const sel = document.getElementById('dev-resource'), cat = RESOURCE_CATEGORIES.find(c => c.id === resourceTab);
  document.querySelectorAll('.res-tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.restab === resourceTab)));
  const soil = resourceTab === 'sol', fish = resourceTab === 'peche';
  if(resourceTab === 'animaux'){
    sel.innerHTML = '<option value="">— Aucun filtre —</option>' + ['elevage', 'faune', 'predateur'].map(c => {
      const cat2 = RESOURCE_CATEGORIES.find(x => x.id === c);
      return '<optgroup label="' + cat2.label + '">' + cat2.items.map(id => '<option value="' + id + '">' + LAND_ANIMALS[id].name + '</option>').join('') + '</optgroup>'; }).join('');
    resourceFilter = null; sel.value = ''; applyResourceFilter(); return;
  }
  sel.innerHTML = '<option value="">— Aucun filtre —</option>' +
    (soil ? '<option value="' + SOIL_OVERLAY + '">Qualité des sols (fertilité)</option>' : '') +
    (fish ? '<optgroup label="En mer — poissons">' + Object.entries(SEA_FISH).map(([id, n]) => '<option value="' + SEA_PREFIX + id + '">' + n + '</option>').join('') + '</optgroup>' +
      '<optgroup label="En mer — animaux marins">' + Object.entries(SEA_ANIMALS).map(([id, n]) => '<option value="' + SEA_PREFIX + id + '">' + n + '</option>').join('') + '</optgroup>' : '') +
    '<optgroup label="' + (soil ? 'Cultures' : fish ? 'En eau douce (fleuves et lacs)' : cat.label) + '">' + cat.items.map(id => '<option value="' + id + '">' + RESOURCES[id].name + '</option>').join('') + '</optgroup>';
  resourceFilter = soil ? SOIL_OVERLAY : null;
  sel.value = resourceFilter || '';
  applyResourceFilter();
}
function initResources(){
  computeResources();
  map.addLayer({ id:'resource-fill', type:'fill', source:'regions', layout:{ visibility:'none' },
    paint:{
      'fill-color':['match', ['feature-state', 'res'], 3, LEVEL_COLORS[3], 2, LEVEL_COLORS[2], 1, LEVEL_COLORS[1], LEVEL_COLORS[0]],
      'fill-opacity':['match', ['feature-state', 'res'], 0, 0.6, 0.85],
    } }, 'regions-outline');
  map.addLayer({ id:'soil-fill', type:'fill', source:'regions', layout:{ visibility:'none' },
    paint:{ 'fill-color':['match', ['feature-state', 'soil'], ...SOIL_COLORS.flatMap((c, lv) => [lv, c]), SOIL_COLORS[0]], 'fill-opacity':0.85 } }, 'regions-outline');
  const sel = document.getElementById('dev-resource');
  sel.disabled = false;
  sel.addEventListener('change', () => { resourceFilter = sel.value || null; applyResourceFilter(); });
  document.querySelectorAll('.res-tab').forEach(b => b.addEventListener('click', () => { resourceTab = b.dataset.restab; renderResourceTab(); }));
  initFishingZones();
  initAnimalZones();
  renderResourceTab();
  if(selectedId !== null) renderRegionPanel();
}
