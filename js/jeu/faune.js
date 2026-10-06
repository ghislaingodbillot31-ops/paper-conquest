// ---------- Faune et elevage: zones sur les terres ----------
// Comme les zones de peche, mais sur la terre: grands milieux naturels et
// culturels, chacun avec son elevage, sa faune sauvage et ses predateurs.
// Une zone est faite de regions entieres: chaque region appartient a la
// zone dont un point d'ancrage est le plus proche (dans son ensemble de
// continents: 'eurasie' = Europe, Asie, Afrique; 'ameriques'; 'oceanie').
// Repartition historique: pas de cheval ni de vache aux Ameriques, mais
// lama, alpaga et dindon.
let ANIMAL_ZONES = [];                // zones (data/regions/zones-animales.json)
const ANIMAL_COLORS = ['#b5651d', '#6b8e23', '#8b5a2b', '#2e8b57', '#a0522d', '#556b2f', '#cd853f', '#708238', '#9c661f', '#3b7a57', '#b8860b', '#7b5e3b'];
const regionAnimalZone = new Map();   // numero de region -> indice de zone
const zoneAnimals = z => [...z.elevage, ...z.faune, ...z.predateur];
// Couches: une zone = ses regions fusionnees (geometrie creusee: jamais sur
// un fleuve ou un lac). Cachees par defaut: interrupteur "Zones animales"
// ou choix d'une espece dans l'onglet Animaux du filtre developpeur.
let animalTopo = null;
function initAnimalZones(){
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
