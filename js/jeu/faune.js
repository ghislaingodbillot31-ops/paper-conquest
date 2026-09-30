// ---------- Faune et elevage: zones sur les terres ----------
// Comme les zones de peche, mais sur la terre: grands milieux naturels et
// culturels, chacun avec son elevage, sa faune sauvage et ses predateurs.
// Une zone est faite de regions entieres: chaque region appartient a la
// zone dont un point d'ancrage est le plus proche (dans son ensemble de
// continents: 'eurasie' = Europe, Asie, Afrique; 'ameriques'; 'oceanie').
// Repartition historique: pas de cheval ni de vache aux Ameriques, mais
// lama, alpaga et dindon.
const ANIMAL_ZONES = [
  { name:'Europe tempérée', macro:'eurasie', anchors:[[-1,47],[5,50.5],[10,50],[2,53]],
    elevage:['vache', 'cheval', 'mouton', 'cochon', 'chevre'], faune:['cerf', 'sanglier', 'chevreuil', 'renard', 'lievre'], predateur:['loup', 'lynx'] },
  { name:'Europe méditerranéenne', macro:'eurasie', anchors:[[-4,39.5],[13,42],[21.5,39.5],[-7,37.5]],
    elevage:['mouton', 'chevre', 'ane', 'cheval', 'cochon'], faune:['sanglier', 'cerf', 'bouquetin', 'lievre'], predateur:['loup', 'lynx'] },
  { name:'Alpes et Carpates', macro:'eurasie', anchors:[[10.5,46.5],[24.5,46.5]],
    elevage:['vache', 'chevre', 'mouton'], faune:['bouquetin', 'cerf', 'chevreuil'], predateur:['ours_brun', 'loup', 'lynx'] },
  { name:'Plaines d\'Europe de l\'Est', macro:'eurasie', anchors:[[25,52],[33,51],[40,54],[46,55]],
    elevage:['cheval', 'vache', 'mouton', 'cochon'], faune:['bison', 'elan', 'sanglier', 'castor'], predateur:['loup', 'ours_brun'] },
  { name:'Scandinavie et taïga européenne', macro:'eurasie', anchors:[[15,63],[26,63],[36,62],[48,61]],
    elevage:['renne_dom', 'vache', 'mouton'], faune:['elan', 'renne', 'castor', 'hermine', 'renard'], predateur:['loup', 'ours_brun', 'lynx'] },
  { name:'Arctique eurasien', macro:'eurasie', anchors:[[60,69],[85,71],[110,73],[140,71],[165,68]],
    elevage:['renne_dom'], faune:['renne', 'renard', 'hermine'], predateur:['ours_polaire', 'loup'] },
  { name:'Taïga sibérienne', macro:'eurasie', anchors:[[70,60],[92,60],[110,59],[128,62],[150,61]],
    elevage:['renne_dom', 'cheval'], faune:['elan', 'zibeline', 'renne', 'castor', 'hermine'], predateur:['ours_brun', 'loup', 'lynx'] },
  { name:'Steppes d\'Asie centrale', macro:'eurasie', anchors:[[55,48],[68,48],[78,46],[62,44]],
    elevage:['cheval', 'chameau_bactriane', 'mouton', 'chevre'], faune:['saiga', 'gazelle', 'lievre'], predateur:['loup'] },
  { name:'Mongolie et Gobi', macro:'eurasie', anchors:[[100,46.5],[110,43.5],[92,45]],
    elevage:['cheval', 'chameau_bactriane', 'mouton', 'yak'], faune:['gazelle', 'bouquetin'], predateur:['loup', 'panthere_neige'] },
  { name:'Tibet et Himalaya', macro:'eurasie', anchors:[[88,32],[80,34.5],[97,32]],
    elevage:['yak', 'chevre_cachemire', 'mouton'], faune:['bouquetin', 'antilope'], predateur:['panthere_neige', 'loup', 'ours_brun'] },
  { name:'Chine des grandes plaines', macro:'eurasie', anchors:[[114,34],[116,28],[108,26],[105,31]],
    elevage:['buffle', 'cochon', 'vache', 'cheval'], faune:['cerf', 'sanglier'], predateur:['tigre', 'loup'] },
  { name:'Mandchourie, Corée et Japon', macro:'eurasie', anchors:[[127,45],[127.5,38],[138,37],[133,48]],
    elevage:['vache', 'cheval', 'cochon'], faune:['cerf', 'sanglier', 'zibeline'], predateur:['tigre', 'ours_brun', 'loup'] },
  { name:'Sous-continent indien', macro:'eurasie', anchors:[[78,22],[79,14],[84,25],[72,27]],
    elevage:['zebu', 'buffle', 'elephant_asie', 'chevre'], faune:['cerf', 'antilope', 'sanglier'], predateur:['tigre', 'leopard', 'crocodile'] },
  { name:'Asie du Sud-Est', macro:'eurasie', anchors:[[101,17],[105,12],[102,4],[112,0],[120,-4],[122,12]],
    elevage:['buffle', 'elephant_asie', 'cochon'], faune:['tapir', 'rhinoceros', 'cerf'], predateur:['tigre', 'leopard', 'crocodile'] },
  { name:'Anatolie, Caucase et Iran', macro:'eurasie', anchors:[[34,39],[44,41],[53,33],[62,33],[45,36]],
    elevage:['mouton', 'chevre', 'cheval', 'chameau_bactriane'], faune:['bouquetin', 'sanglier', 'gazelle'], predateur:['loup', 'ours_brun', 'leopard'] },
  { name:'Arabie et déserts du Levant', macro:'eurasie', anchors:[[45,23],[40,29],[53,21],[48,17]],
    elevage:['chameau', 'chevre', 'mouton', 'cheval'], faune:['gazelle', 'antilope', 'autruche'], predateur:['leopard', 'hyene', 'loup'] },
  { name:'Maghreb', macro:'eurasie', anchors:[[-4,33],[4,35],[9,35.5]],
    elevage:['mouton', 'chevre', 'cheval', 'ane', 'chameau'], faune:['gazelle', 'sanglier', 'bouquetin'], predateur:['lion', 'leopard', 'hyene'] },
  { name:'Sahara', macro:'eurasie', anchors:[[0,24],[12,23],[24,24],[-10,22],[30,27]],
    elevage:['chameau', 'chevre'], faune:['gazelle', 'antilope', 'autruche'], predateur:['guepard', 'hyene'] },
  { name:'Sahel', macro:'eurasie', anchors:[[-5,15],[8,14],[20,14],[30,14]],
    elevage:['zebu', 'chameau', 'chevre', 'mouton'], faune:['gazelle', 'autruche', 'elephant_afrique'], predateur:['lion', 'hyene', 'guepard'] },
  { name:'Corne de l\'Afrique et Éthiopie', macro:'eurasie', anchors:[[39,9],[45.5,6],[38,13]],
    elevage:['zebu', 'chameau', 'chevre', 'mouton', 'ane'], faune:['antilope', 'bouquetin', 'gazelle'], predateur:['lion', 'hyene', 'leopard'] },
  { name:'Forêts d\'Afrique centrale et de l\'Ouest', macro:'eurasie', anchors:[[-6,7],[5,6.5],[13,2],[22,0],[25,-4]],
    elevage:['chevre', 'cochon'], faune:['elephant_afrique', 'hippopotame', 'antilope'], predateur:['leopard', 'crocodile'] },
  { name:'Savanes d\'Afrique de l\'Est', macro:'eurasie', anchors:[[35,-1],[36,-6],[30,-10],[33,3]],
    elevage:['zebu', 'chevre', 'mouton'], faune:['zebre', 'gazelle', 'antilope', 'elephant_afrique', 'hippopotame', 'rhinoceros'], predateur:['lion', 'leopard', 'hyene', 'guepard', 'crocodile'] },
  { name:'Afrique australe', macro:'eurasie', anchors:[[25,-22],[28,-28],[19,-31],[18,-15],[33,-18]],
    elevage:['zebu', 'mouton', 'chevre'], faune:['zebre', 'antilope', 'autruche', 'elephant_afrique', 'rhinoceros'], predateur:['lion', 'leopard', 'hyene'] },
  { name:'Madagascar', macro:'eurasie', anchors:[[46.8,-19.5]],
    elevage:['zebu'], faune:['lemurien'], predateur:['crocodile'] },
  { name:'Arctique américain et Groenland', macro:'ameriques', anchors:[[-100,68],[-150,68],[-42,72],[-75,65]],
    elevage:[], faune:['renne', 'boeuf_musque', 'renard'], predateur:['ours_polaire', 'loup'] },
  { name:'Forêts boréales d\'Amérique', macro:'ameriques', anchors:[[-112,56],[-85,51],[-68,52],[-135,62],[-150,62]],
    elevage:[], faune:['elan', 'renne', 'castor', 'renard'], predateur:['loup', 'ours_noir', 'lynx', 'ours_brun'] },
  { name:'Grandes Plaines', macro:'ameriques', anchors:[[-100,42],[-104,48],[-98,35]],
    elevage:[], faune:['bison', 'cerf', 'antilope'], predateur:['loup', 'puma'] },
  { name:'Forêts de l\'Est américain', macro:'ameriques', anchors:[[-82,38],[-75,42.5],[-87,33],[-89,43]],
    elevage:['dindon'], faune:['cerf', 'castor', 'bison'], predateur:['ours_noir', 'loup', 'puma'] },
  { name:'Rocheuses et Ouest américain', macro:'ameriques', anchors:[[-114,43],[-120,48],[-111,36],[-120,37]],
    elevage:[], faune:['cerf', 'bouquetin', 'bison'], predateur:['ours_brun', 'puma', 'loup'] },
  { name:'Mexique et Amérique centrale', macro:'ameriques', anchors:[[-101,22],[-90,16],[-84,10],[-108,28]],
    elevage:['dindon'], faune:['cerf', 'tapir'], predateur:['jaguar', 'puma', 'crocodile'] },
  { name:'Amazonie', macro:'ameriques', anchors:[[-62,-4],[-72,-6],[-54,-2],[-66,2]],
    elevage:[], faune:['tapir', 'capybara'], predateur:['jaguar', 'crocodile'] },
  { name:'Andes', macro:'ameriques', anchors:[[-76,-9],[-69,-17],[-70,-28],[-76,2]],
    elevage:['lama', 'alpaga', 'cobaye'], faune:['guanaco', 'cerf'], predateur:['puma'] },
  { name:'Brésil et Cerrado', macro:'ameriques', anchors:[[-47,-15],[-45,-22],[-40,-8],[-53,-20]],
    elevage:[], faune:['tapir', 'capybara', 'cerf', 'nandou'], predateur:['jaguar', 'puma'] },
  { name:'Pampa et Patagonie', macro:'ameriques', anchors:[[-62,-35],[-68,-45],[-57,-32]],
    elevage:[], faune:['guanaco', 'nandou'], predateur:['puma'] },
  { name:'Australie', macro:'oceanie', anchors:[[134,-25],[146,-31],[121,-28],[140,-18]],
    elevage:[], faune:['kangourou', 'emeu'], predateur:['dingo', 'crocodile'] },
  { name:'Nouvelle-Guinée', macro:'oceanie', anchors:[[143,-6]],
    elevage:['cochon'], faune:['casoar'], predateur:['crocodile'] },
  { name:'Nouvelle-Zélande', macro:'oceanie', anchors:[[172.5,-42]],
    elevage:[], faune:['lievre'], predateur:[] },
];
const ANIMAL_COLORS = ['#b5651d', '#6b8e23', '#8b5a2b', '#2e8b57', '#a0522d', '#556b2f', '#cd853f', '#708238', '#9c661f', '#3b7a57', '#b8860b', '#7b5e3b'];
const zoneAnimals = z => [...z.elevage, ...z.faune, ...z.predateur];
const regionAnimalZone = new Map();   // numero de region -> indice de zone
function macroOf([lon, lat]){
  if(lon < -25) return 'ameriques';
  if((lon >= 112 && lat < -10) || (lon >= 140 && lat < 0) || lon >= 165) return lat < 0 ? 'oceanie' : 'eurasie';
  return 'eurasie';
}
// chaque region -> zone du point d'ancrage le plus proche (meme ensemble de continents)
function computeAnimalZones(){
  ANIMAL_ZONES.forEach(z => { z.regions = []; });
  regionsFc.features.forEach(f => {
    let c; try{ c = turf.centroid(f).geometry.coordinates; }catch(e){ return; }
    const m = macroOf(c); let best = -1, bd = Infinity;
    ANIMAL_ZONES.forEach((z, k) => { if(z.macro !== m) return; for(const a of z.anchors){ const d = turf.distance(c, a); if(d < bd){ bd = d; best = k; } } });
    if(best < 0) return;
    regionAnimalZone.set(f.id, best); ANIMAL_ZONES[best].regions.push(f.id); dAnchor.set(f.id, bd);
  });
  // abondance: le tiers des regions le plus proche d'un point d'ancrage
  // (coeur de la zone) eleve, le tiers suivant moyen, la peripherie faible
  ANIMAL_ZONES.forEach(z => {
    const sorted = z.regions.slice().sort((a, b) => dAnchor.get(a) - dAnchor.get(b));
    sorted.forEach((id, k) => { const q = k / sorted.length, lv = q < 1 / 3 ? 3 : q < 2 / 3 ? 2 : 1;
      const r = regionResources.get(id); if(r) zoneAnimals(z).forEach(a => { r[a] = Math.max(r[a] || 0, lv); }); });
  });
}
const dAnchor = new Map();
// Couches: une zone = ses regions fusionnees (geometrie creusee: jamais sur
// un fleuve ou un lac). Cachees par defaut: interrupteur "Zones animales"
// ou choix d'une espece dans l'onglet Animaux du filtre developpeur.
let animalTopo = null;
function initAnimalZones(){
  computeAnimalZones();
  const t = animalTopo || regionTopo, geoms = t.objects[Object.keys(t.objects)[0]].geometries;
  const feats = ANIMAL_ZONES.map((z, k) => {
    if(!z.regions.length) return null;
    const g = topojson.merge(t, z.regions.map(id => geoms[id - 1]));
    unwrapGeometry(g);
    return { type:'Feature', id:k, properties:{ name:z.name, color:ANIMAL_COLORS[k % ANIMAL_COLORS.length], animals:',' + zoneAnimals(z).join(',') + ',' }, geometry:g };
  }).filter(Boolean);
  map.addSource('animal-zones', { type:'geojson', data:{ type:'FeatureCollection', features:feats } });
  map.addSource('animal-labels', { type:'geojson', data:turf.featureCollection(ANIMAL_ZONES.map((z, k) => turf.point(z.anchors[0], { name:z.name, animals:',' + zoneAnimals(z).join(',') + ',' }))) });
  map.addLayer({ id:'animal-fill', type:'fill', source:'animal-zones', layout:{ visibility:'none' },
    paint:{ 'fill-color':['get', 'color'], 'fill-opacity':0.55 } }, 'regions-outline');
  map.addLayer({ id:'animal-line', type:'line', source:'animal-zones', layout:{ visibility:'none' },
    paint:{ 'line-color':'#3c2a14', 'line-width':1.6, 'line-opacity':0.8 } }, 'regions-selected');
  map.addLayer({ id:'animal-label', type:'symbol', source:'animal-labels', layout:{ visibility:'none', 'text-field':['get', 'name'],
    'text-font':['Open Sans Regular'], 'text-size':11, 'text-max-width':8 },
    paint:{ 'text-color':'#2b1d0e', 'text-halo-color':'#f6efe0', 'text-halo-width':1.4 } });
  updateAnimalLayers();
}
// Affichage: une espece choisie -> ses zones; sinon toutes si l'interrupteur est actif
function updateAnimalLayers(){
  if(!map.getLayer('animal-fill')) return;
  const sp = resourceFilter && LAND_ANIMALS[resourceFilter] ? resourceFilter : null;
  const show = !!sp || devState.animals;
  const filter = sp ? ['in', ',' + sp + ',', ['get', 'animals']] : ['has', 'name'];
  ['animal-fill', 'animal-line', 'animal-label'].forEach(id => { setLayerVisible(id, show); map.setFilter(id, filter); });
  // une espece choisie: seules les regions, colorees selon son abondance (pas de contour de zone)
  if(sp) ['animal-fill', 'animal-line', 'animal-label'].forEach(id => setLayerVisible(id, false));
}
