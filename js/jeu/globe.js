// ---------- Globe (MapLibre GL, vraie geographie) ----------
// Chaque pays (adm0_a3) est classe dans l'un des 6 continents, seulement
// pour la couleur et le petit texte de contexte dans le panneau -- les
// regions cliquables sont 500 regions compactes d'aire comparable (~260 000 km2,
// decoupage k-means + Voronoi par continent, fige dans data/monde/admin1.topojson),
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

let regionsFc = null;

async function addRegions(){
  const [topo, navGrid, waterTopo, water, fishing, regionsData, animalZones, roads] = await Promise.all([
    fetch('data/monde/admin1.topojson').then(r => r.json()),
    fetch('data/monde/nav-grid.json').then(r => r.json()).catch(e => { console.warn('Grille de navigation indisponible:', e); return null; }),
    fetch('data/monde/regions-water.topojson').then(r => r.json()).catch(e => { console.warn('Rivieres indisponibles:', e); return null; }),
    fetch('data/monde/water.json').then(r => r.json()).catch(e => { console.warn('Rivieres indisponibles:', e); return null; }),
    fetch('data/monde/fishing.json').then(r => r.json()).catch(e => { console.warn('Zones de peche indisponibles:', e); return null; }),
    fetch('data/regions/regions.json').then(r => r.json()),
    fetch('data/regions/zones-animales.json').then(r => r.json()),
    fetch('data/monde/routes.json').then(r => r.json()),
  ]);
  loadRegionData(regionsData, animalZones);
  const objName = Object.keys(topo.objects)[0];
  const geometries = topo.objects[objName].geometries;
  const fc = topojson.feature(topo, topo.objects[objName]);
  fc.features.forEach((f, i) => {
    f.id = i + 1;
    f.properties.regionNum = i + 1;
    f.properties.continent = CODE_TO_CONTINENT[f.properties.adm0_a3] || null;
    // couleur du climat de la region (data/regions/regions.json) ; comptoirs en violet
    f.properties.isNpc = NPC_REGION_IDS.has(f.id);
    f.properties.fillColor = f.properties.isNpc ? NPC_COLOR : regionInfo(f.id).climat.couleur;
    unwrapGeometry(f.geometry);
    f.properties.clusterArea = regionInfo(f.id).aire_km2 || f.properties.clusterArea; // surface precalculee (data/regions)
  });
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

  // routes entre capitales : precalculees (data/monde/routes.json, outils/build-routes.js)
  addVillageNetwork(roads);

  const loadingEl = document.getElementById('map-loading');
  if(loadingEl) loadingEl.style.display = 'none';

  initSelection();
  initBoat(navGrid);
  initCaravan();
  initResources();
  initEconomy();
}
