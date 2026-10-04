// ---------- Ressources des regions (catalogue + filtre developpeur) ----------
// Le jeu ne calcule plus les ressources : chaque region les lit dans
// data/regions/regions.json (minerais, cultures, animaux, poissons, sol). Ici :
// les listes et les noms de chaque ressource, les poissons des fleuves et des
// lacs (partages avec outils/build-regions.js), et le filtre developpeur.
// Minerais, du plus commun au plus rare, l'ambre a part (gisement unique).
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
// Nom de chaque ressource (les regles de repartition sont dans outils/modele-regions.js ;
// le resultat, region par region, dans data/regions/regions.json)
const RESOURCES = {
  fer:{ name:'Fer' },
  sel:{ name:'Sel' },
  cuivre:{ name:'Cuivre' },
  plomb:{ name:'Plomb' },
  etain:{ name:'Étain' },
  alun:{ name:'Alun' },
  argent:{ name:'Argent' },
  or:{ name:'Minerai d\'or' },
  ambre:{ name:'Ambre de la Baltique' },
  ble:{ name:'Blé' },
  orge:{ name:'Orge' },
  seigle:{ name:'Seigle' },
  avoine:{ name:'Avoine' },
  lin:{ name:'Lin' },
  chanvre:{ name:'Chanvre' },
  garance:{ name:'Garance' },
  pastel:{ name:'Pastel/guède' },
  poivre:{ name:'Poivre' },
  cannelle:{ name:'Cannelle' },
  girofle:{ name:'Clou de girofle' },
  muscade:{ name:'Muscade' },
  safran:{ name:'Safran' },
  bois:{ name:'Bois de construction' },
  bois_chauffage:{ name:'Bois de chauffage' },
  pierre:{ name:'Pierre de taille' },
};
const FRESH_FISH_NAMES = { carpe:'Carpe', brochet:'Brochet', perche:'Perche', anguille:'Anguille', truite:'Truite', saumon:'Saumon',
  esturgeon:'Esturgeon', sandre:'Sandre', coregone:'Corégone', carpe_amour:'Carpe amour', carassin:'Carassin',
  silure_mekong:'Poisson-chat géant du Mékong', gourami:'Gourami', capitaine:'Capitaine (perche du Nil)', tilapia:'Tilapia',
  silure_nil:'Poisson-chat du Nil', arapaima:'Arapaima / Pirarucu', surubi:'Surubi', pejerrey:'Pejerrey',
  silure_americain:'Poisson-chat américain', truite_rouge:'Truite rouge', saumon_pacifique:'Saumon du Pacifique',
  morue_murray:'Morue de Murray', barramundi:'Barramundi' };
// poissons d'eau douce : ils viennent des fleuves et des lacs qui traversent la region
FRESH_FISH.forEach(k => { RESOURCES[k] = { name:FRESH_FISH_NAMES[k] }; });
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
Object.entries(LAND_ANIMALS).forEach(([k, a]) => { RESOURCES[k] = { name:a.name }; });
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
const FISH_ZONE_COLORS = { cotiere:'#4cc9b0', hauturiere:'#6f9ae8', 'pleine-mer':'#5f82da' };   // (clairs : la mer est bleu roi)

// Qualite des sols (overlay "Sol / Qualite"): 5 niveaux de fertilite
const SOIL_LEVELS = ['Stérile', 'Pauvre', 'Moyen', 'Fertile', 'Très fertile'];
// meme echelle que les autres filtres (sterile gris ... fertile vert, tres fertile vert fonce)
const SOIL_COLORS = ['#9a9a9a', '#d64541', '#f0932b', '#2e9e4f', '#1c6e34'];
// Echelle commune a tous les filtres: 0 absente (gris), 1 faible (rouge),
// 2 moyenne (orange), 3 elevee (vert)
const RESOURCE_LEVELS = ['Absente', 'Faible', 'Moyenne', 'Élevée'];
const LEVEL_COLORS = ['#9a9a9a', '#d64541', '#f0932b', '#2e9e4f'];

const regionResources = new Map();  // numero de region -> { ressource: niveau } (minerais, cultures, animaux, poissons)
const regionSoil = new Map();       // numero de region -> qualite du sol (0..4)
const regionWaters = new Map();     // numero de region -> { rivers:[noms], lakes:n }
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
