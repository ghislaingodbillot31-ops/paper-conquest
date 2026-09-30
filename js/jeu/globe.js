// ---------- Globe (MapLibre GL, vraie geographie) ----------
// Chaque pays (adm0_a3) est classe dans l'un des 6 continents, seulement
// pour la couleur et le petit texte de contexte dans le panneau -- les
// regions cliquables sont 500 regions compactes d'aire comparable (~260 000 km2,
// decoupage k-means + Voronoi par continent -- voir outils/build-repartition.js),
// pas les continents eux-memes.
const ISO3_CONTINENT = {
  namerica:['BLZ','CAN','CRI','CUB','DOM','GRL','GTM','HND','HTI','MEX','NIC','PAN','USA'],
  samerica:['ARG','BOL','BRA','CHL','COL','ECU','GUY','PER','PRY','SUR','URY','VEN'],
  europe:['ALB','AUT','BEL','BGR','BIH','BLR','CHE','CZE','DEU','DNK','ESP','EST','FIN','FRA','GBR','GRC','HRV','HUN','IRL','ISL','ITA','LTU','LVA','MDA','MKD','NLD','NOR','POL','PRT','ROU','SRB','SVK','SVN','SWE','UKR'],
  africa:['AGO','BEN','BFA','BWA','CAF','CIV','CMR','COD','COG','DZA','EGY','ERI','ETH','GAB','GHA','GIN','KEN','LBR','LBY','MAR','MDG','MLI','MOZ','MRT','NAM','NER','NGA','SAH','SDN','SDS','SEN','SLE','SOL','SOM','TCD','TUN','TZA','UGA','ZAF','ZMB','ZWE'],
  asia:['AFG','ARE','ARM','AZE','BGD','BTN','CHN','GEO','IDN','IND','IRN','IRQ','ISR','JOR','JPN','KAZ','KGZ','KHM','KOR','LAO','LKA','MMR','MNG','MYS','NPL','OMN','PAK','PHL','PRK','RUS','SAU','SYR','TJK','THA','TKM','TUR','TWN','UZB','VNM','YEM'],
  oceania:['AUS','NZL','PNG'],
};
const CODE_TO_CONTINENT = {};
for(const id in ISO3_CONTINENT) ISO3_CONTINENT[id].forEach(code => { CODE_TO_CONTINENT[code] = id; });

const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    glyphs: 'https://tiles.basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf',
    sources: {},
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#a7c8d3' } },
    ],
  },
  projection: 'globe',
  center: [12, 22],
  zoom: 1,
  attributionControl: true,
});
map.on('error', (e) => console.error('MAPLIBRE ERROR:', e && e.error && e.error.message, e));
// Le conteneur (carte dans une mise en page flex/grid) peut ne pas avoir
// sa taille finale au moment ou MapLibre mesure le canvas -- on force un
// resize des que la taille reelle est connue, et a chaque changement
// (redimensionnement de fenetre, bascule responsive).
if(window.ResizeObserver){
  new ResizeObserver(() => map.resize()).observe(document.querySelector('.map-wrap'));
}

map.on('style.load', () => {
  if(map.setProjection) map.setProjection({ type: 'globe' });
  if(map.setSky){
    // Fond spatial: bleu sombre etoile derriere le globe (voir le
    // degrade + etoiles CSS sur .map-wrap, visible autour de la sphere).
    try{
      map.setSky({
        'sky-color': '#0a1730',
        'sky-horizon-blend': 0.35,
        'horizon-color': '#1c3560',
        'horizon-fog-blend': 0.5,
        'fog-color': '#16294f',
        'fog-ground-blend': 0.6,
        'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 10, 0],
      });
    }catch(e){ console.warn('setSky non supporte:', e); }
  }
  addRegions();
});

// Certains anneaux (Russie/Alaska...) traversent l'antimeridien (+-180)
// sans etre coupes -- on "deroule" la longitude pour eviter un
// remplissage qui fait le tour du globe.
function unwrapRingLongitudes(ring){
  const out = [[ring[0][0], ring[0][1]]];
  let offset = 0;
  for(let i = 1; i < ring.length; i++){
    const rawDelta = ring[i][0] - ring[i-1][0];
    if(rawDelta > 180) offset -= 360;
    else if(rawDelta < -180) offset += 360;
    out.push([ring[i][0] + offset, ring[i][1]]);
  }
  return out;
}
function unwrapGeometry(geom){
  if(geom.type === 'Polygon') geom.coordinates = geom.coordinates.map(unwrapRingLongitudes);
  else if(geom.type === 'MultiPolygon') geom.coordinates = geom.coordinates.map(poly => poly.map(unwrapRingLongitudes));
}

// Couleur "carte physique" par climat plutot que par pays: le jeu ne doit
// pas reveler les vraies frontieres politiques (les joueurs creent leurs
// propres pays sur ce globe), seulement le relief/climat qu'on verrait sur
// un vrai globe. Degrade continu sur deux axes (temperature + aridite),
// jamais de zones a bordure dure.
function lerp(a, b, t){ return a + (b - a) * t; }
function smooth01(t){ t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
function lerpColor(c1, c2, t){
  t = smooth01(t);
  const p1 = parseInt(c1.slice(1), 16), p2 = parseInt(c2.slice(1), 16);
  const r = Math.round(lerp((p1 >> 16) & 255, (p2 >> 16) & 255, t));
  const g = Math.round(lerp((p1 >> 8) & 255, (p2 >> 8) & 255, t));
  const b = Math.round(lerp(p1 & 255, p2 & 255, t));
  const h = v => v.toString(16).padStart(2, '0');
  return '#' + h(r) + h(g) + h(b);
}

const COL_DEEP_FOREST = '#1f6b3c'; // grosse foret (equatoriale, humide)
const COL_FOREST      = '#a9db8e'; // pays forestier (foret temperee)
const COL_COLD        = '#f5f7f5'; // pays froid
const COL_HOT_DRY     = '#f0932b'; // climat tres chaud (desert le plus chaud)
const COL_DESERT      = '#f4e28c'; // desert / steppe seche

// Chaine humide (foret dense->claire->neige) selon la latitude absolue.
function humidColor(absLat){
  if(absLat < 12) return lerpColor(COL_DEEP_FOREST, COL_FOREST, absLat / 12);
  if(absLat < 55) return COL_FOREST;
  if(absLat < 68) return lerpColor(COL_FOREST, COL_COLD, (absLat - 55) / 13);
  return COL_COLD;
}
// Chaine seche (orange brulant->jaune desert->neige), memes paliers.
function aridColor(absLat){
  if(absLat < 25) return lerpColor(COL_HOT_DRY, COL_DESERT, absLat / 25);
  if(absLat < 55) return COL_DESERT;
  if(absLat < 68) return lerpColor(COL_DESERT, COL_COLD, (absLat - 55) / 13);
  return COL_COLD;
}

// Centres de desert [lat, lon, rayon en degres], pour une aridite continue
// (score qui s'attenue en douceur avec la distance).
const ARID_CENTERS = [
  [23, 10, 20],    // Sahara
  [20, 45, 15],    // Peninsule arabique
  [40, 75, 18],    // deserts d'Asie centrale (Gobi, Taklamakan, Kyzylkoum)
  [28, -108, 12],  // sud-ouest des Etats-Unis / Mexique
  [-25, 133, 18],  // interieur australien
  [-24, -69, 8],   // Atacama
  [-23, 18, 12],   // Kalahari / Namib
];
function aridityAt(lat, lon){
  let best = 0;
  for(const [clat, clon, radius] of ARID_CENTERS){
    const d = Math.hypot(lat - clat, lon - clon);
    const score = smooth01(1 - d / (radius * 2));
    if(score > best) best = score;
  }
  return best;
}

// Couleur finale: interpole entre la chaine humide et la chaine seche
// selon l'aridite locale, elle-meme continue -- aucune des deux
// dimensions ne cree de bordure nette.
function climateColorAt(lat, lon){
  const absLat = Math.abs(lat);
  const aridity = aridityAt(lat, lon);
  return lerpColor(humidColor(absLat), aridColor(absLat), aridity);
}

// Eclaircit/assombrit une couleur hex vers le blanc (amt>0) ou le noir
// (amt<0). Sert a decliner plusieurs teintes distinctes a l'interieur
// d'une meme sous-region.
function tintHex(hex, amt){
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = amt >= 0 ? 255 : 0;
  const p = Math.abs(amt);
  const c = v => Math.round(v + (mix - v) * p).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}

// Plus grand anneau (exterieur) d'une geometrie, pour son centroide.
function largestRing(geom){
  const rings = geom.type === 'Polygon' ? [geom.coordinates[0]]
    : geom.coordinates.map(poly => poly[0]);
  let best = rings[0], bestArea = 0;
  for(const ring of rings){
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for(const [x, y] of ring){
      if(x < minX) minX = x; if(x > maxX) maxX = x;
      if(y < minY) minY = y; if(y > maxY) maxY = y;
    }
    const area = (maxX - minX) * (maxY - minY);
    if(area > bestArea){ bestArea = area; best = ring; }
  }
  return best;
}

// Empreinte numerique stable d'une geometrie (centroide approche de son
// plus grand anneau), graine deterministe pour la variation de teinte.
function geometrySeed(geom){
  const ring = largestRing(geom);
  let sx = 0, sy = 0;
  for(const [x, y] of ring){ sx += x; sy += y; }
  const cx = Math.round((sx / ring.length) * 1000);
  const cy = Math.round((sy / ring.length) * 1000);
  let h = 0;
  const s = cx + ',' + cy;
  for(let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

let regionsFc = null;

async function addRegions(){
  const [topo, navGrid, waterTopo, water, fishing] = await Promise.all([
    fetch('data/monde/admin1.topojson').then(r => r.json()),
    fetch('data/monde/nav-grid.json').then(r => r.json()).catch(e => { console.warn('Grille de navigation indisponible:', e); return null; }),
    fetch('data/monde/regions-water.topojson').then(r => r.json()).catch(e => { console.warn('Rivieres indisponibles:', e); return null; }),
    fetch('data/monde/water.json').then(r => r.json()).catch(e => { console.warn('Rivieres indisponibles:', e); return null; }),
    fetch('data/monde/fishing.json').then(r => r.json()).catch(e => { console.warn('Zones de peche indisponibles:', e); return null; }),
  ]);
  const objName = Object.keys(topo.objects)[0];
  const geometries = topo.objects[objName].geometries;
  const fc = topojson.feature(topo, topo.objects[objName]);
  fc.features.forEach((f, i) => {
    f.id = i + 1;
    f.properties.regionNum = i + 1;
    f.properties.continent = CODE_TO_CONTINENT[f.properties.adm0_a3] || null;
    // Couleur du climat reel a la position du morceau (pas du pays: aucune
    // frontiere politique reelle n'est reveleee), plus une legere
    // variation de teinte pour eviter des zones plates.
    const ring = largestRing(f.geometry);
    let sx = 0, sy = 0;
    for(const [x, y] of ring){ sx += x; sy += y; }
    const lat = sy / ring.length, lon = sx / ring.length;
    const base = climateColorAt(lat, lon);
    const seed = geometrySeed(f.geometry);
    f.properties.isNpc = NPC_REGION_IDS.has(f.id);
    f.properties.fillColor = f.properties.isNpc ? NPC_COLOR : tintHex(base, ((seed % 9) - 4) * 0.03);
    unwrapGeometry(f.geometry);
    try{ f.properties.clusterArea = Math.round(turf.area(f) / 1e6); }
    catch(e){ /* garde la valeur stockee si le calcul echoue */ }
  });
  // terre d'origine (avant de creuser fleuves et lacs) : les routes s'y tracent, pour qu'un
  // fleuve se franchisse (pont) au lieu de couper la liaison entre deux regions voisines
  fc.features.forEach(f => { f.land = { type:'Feature', properties:{}, geometry:f.geometry }; });
  // rivieres et lacs: geometrie des regions avec l'eau deja retiree
  if(waterTopo && water){
    try{
      const carved = topojson.feature(waterTopo, waterTopo.objects.regions).features;
      if(carved.length === fc.features.length){ fc.features.forEach((f, i) => { f.geometry = carved[i].geometry; }); waterData = water; }
      else console.warn('Rivieres: nombre de regions different, ignorees');
    }catch(e){ console.warn('Rivieres indisponibles:', e); }
  }
  fishingData = fishing;
  animalTopo = waterData ? waterTopo : null;   // zones de faune: regions deja creusees
  regionsFc = fc;
  regionTopo = topo; regionGeoms = geometries;

  map.addSource('regions', { type: 'geojson', data: fc });
  map.addLayer({
    id: 'regions', type: 'fill', source: 'regions',
    paint: { 'fill-color': ['get', 'fillColor'] },
  });
  map.addLayer({
    id: 'regions-outline', type: 'line', source: 'regions',
    paint: { 'line-color': 'rgba(60,53,39,0.35)', 'line-width': 0.5 },
  });
  map.addLayer({
    id: 'regions-selected', type: 'fill', source: 'regions',
    // region selectionnee: plus de contour noir, juste un leger eclaircissement
    paint: {
      'fill-color': '#ffffff',
      'fill-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 0.28, 0],
    },
  });
  // Numero de chaque region affiche dessus -- sert a reperer/signaler une
  // region precise (ex. pour un bug de trace ou de couleur).
  map.addLayer({
    id: 'regions-label', type: 'symbol', source: 'regions',
    layout: {
      'text-field': ['to-string', ['get', 'regionNum']],
      'text-font': ['Open Sans Regular'],
      'text-size': 10,
      'text-allow-overlap': false,
    },
    paint: {
      'text-color': '#3c3527',
      'text-halo-color': '#f6efe0',
      'text-halo-width': 1.2,
    },
  });

  applyDevFilters();

  map.on('click', 'regions', (e) => {
    if(interactionBusy() || !e.features.length) return;
    selectRegion(e.features[0].id);
  });
  map.on('mouseenter', 'regions', () => { if(!interactionBusy()) map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'regions', () => { map.getCanvas().style.cursor = ''; });

  // Un reseau independant par continent (jamais de faux voisinage entre
  // deux masses continentales separees par un ocean): chaque appel a
  // buildRegionNetwork ne compare que les geometries de son propre
  // sous-ensemble, donc le cout de calcul de chacun reste borne a sa
  // propre taille plutot que d'exploser avec le nombre total de regions
  // du monde.
  addVillageNetwork(topo, fc, geometries, [
    f => f.properties.adm0_a3 === 'AUS',
    f => ISO3_CONTINENT.africa.includes(f.properties.adm0_a3),
    f => ISO3_CONTINENT.europe.includes(f.properties.adm0_a3),
    f => ISO3_CONTINENT.asia.includes(f.properties.adm0_a3),
    f => ISO3_CONTINENT.namerica.includes(f.properties.adm0_a3),
    f => ISO3_CONTINENT.samerica.includes(f.properties.adm0_a3),
    f => ISO3_CONTINENT.oceania.includes(f.properties.adm0_a3) && f.properties.adm0_a3 !== 'AUS',
  ]);

  const loadingEl = document.getElementById('map-loading');
  if(loadingEl) loadingEl.style.display = 'none';

  initSelection();
  initBoat(navGrid);
  initCaravan();
  initResources();
  initEconomy();
}
