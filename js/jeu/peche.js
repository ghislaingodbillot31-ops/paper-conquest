// ---------- Noms des oceans et des mers ----------
// [nom, lon, lat, rang]: 1 ocean (visible de loin), 2 grande mer, 3 mer
// ou golfe plus petit (apparait en zoomant).
const SEA_LABELS = [
  ['Océan Atlantique', -38, 32, 1], ['Océan Atlantique', -22, -22, 1], ['Océan Pacifique', -150, 15, 1], ['Océan Pacifique', 170, 28, 1],
  ['Océan Pacifique', -118, -28, 1], ['Océan Indien', 80, -22, 1], ['Océan Arctique', 60, 81, 1], ['Océan Austral', 20, -60, 1],
  ['Océan Austral', 140, -60, 1], ['Océan Austral', -100, -62, 1],
  ['Mer Méditerranée', 18, 34.5, 2], ['Mer du Nord', 3.5, 56, 2], ['Mer Baltique', 19, 57.5, 2], ['Mer Noire', 34.5, 43.2, 2],
  ['Mer Caspienne', 50.8, 42, 2], ['Mer Rouge', 38.2, 20.5, 2], ['Golfe Persique', 51.3, 27.2, 2], ["Mer d'Arabie", 64, 15, 2],
  ['Golfe du Bengale', 89, 15, 2], ['Mer de Chine méridionale', 114, 13, 2], ['Mer de Chine orientale', 125.5, 29, 2],
  ['Mer du Japon', 135, 40.5, 2], ["Mer d'Okhotsk", 150, 55, 2], ['Mer de Béring', -178, 58, 2], ['Golfe du Mexique', -90, 25, 2],
  ['Mer des Caraïbes', -75, 15, 2], ["Baie d'Hudson", -86, 60, 2], ['Mer de Norvège', 3, 68, 2], ['Mer de Barents', 40, 73.5, 2],
  ['Mer de Tasman', 160, -38, 2], ['Mer de Corail', 155, -15, 2], ["Mer d'Arafura", 135, -10, 2], ['Mer de Java', 111, -5, 2],
  ['Golfe de Guinée', 2.5, 2, 2], ['Canal du Mozambique', 41.5, -18, 2], ['Mer du Labrador', -55, 58.5, 2], ['Mer de Kara', 70, 75.5, 2],
  ['Mer des Philippines', 132, 18, 2], ['Mer des Laptev', 125, 76, 2], ['Mer de Sibérie orientale', 160, 73.5, 2],
  ["Golfe d'Alaska", -146, 56.5, 2], ['Mer des Sargasses', -60, 28, 2], ['Mer du Groenland', -5, 75, 2],
  ['Manche', -1.8, 50.1, 3], ['Golfe de Gascogne', -4.5, 45.5, 3], ['Mer Adriatique', 15.5, 42.9, 3], ['Mer Égée', 25, 38.6, 3],
  ['Mer Tyrrhénienne', 12, 40, 3], ['Mer Ionienne', 18.5, 37.5, 3], ["Mer d'Azov", 36.5, 46.2, 3], ['Mer Blanche', 38, 65.8, 3],
  ['Golfe de Botnie', 20.5, 62.5, 3], ["Golfe d'Aden", 48, 12.6, 3], ["Golfe d'Oman", 58.6, 24.6, 3], ['Mer Jaune', 123, 36, 3],
  ['Golfe de Thaïlande', 101.5, 9.5, 3], ['Mer de Célèbes', 122, 3.5, 3], ['Golfe de Californie', -110, 27, 3], ["Mer d'Irlande", -5, 53.7, 3],
  ['Mer Celtique', -7.5, 50.5, 3], ['Golfe du Saint-Laurent', -62, 48, 3], ['Grande Baie australienne', 130, -35.8, 3],
  ['Golfe de Carpentarie', 139, -14, 3], ['Mer de Banda', 127, -5.5, 3], ['Mer de Marmara', 28, 40.75, 3], ['Mer de Ligurie', 8.8, 43.6, 3],
];
function initSeaLabels(){
  map.addSource('sea-names', { type:'geojson', data:turf.featureCollection(SEA_LABELS.map(([name, lon, lat, rank]) => turf.point([lon, lat], { name, rank }))) });
  map.addLayer({ id:'sea-names', type:'symbol', source:'sea-names',
    filter:['any', ['==', ['get', 'rank'], 1], ['all', ['==', ['get', 'rank'], 2], ['>=', ['zoom'], 1.6]], ['all', ['==', ['get', 'rank'], 3], ['>=', ['zoom'], 3]]],
    layout:{ 'text-field':['get', 'name'], 'text-font':['Open Sans Regular'], 'text-max-width':7,
      'text-size':['match', ['get', 'rank'], 1, 17, 2, 12.5, 10.5],
      'text-letter-spacing':['match', ['get', 'rank'], 1, 0.25, 2, 0.12, 0.05], 'text-transform':['match', ['get', 'rank'], 1, 'uppercase', 'none'] },
    paint:{ 'text-color':['match', ['get', 'rank'], 1, '#3f6f8a', '#4a7d99'], 'text-halo-color':'rgba(232,243,246,0.85)', 'text-halo-width':1.3 } });
  applyDevFilters();
}

// ---------- Zones de peche en mer, fleuves et lacs ----------
// Zones dessinees SOUS les regions: les terres les masquent. Un clic en
// mer ouvre la fiche de la zone; un clic sur un fleuve ou un lac, sa fiche
// de peche en eau douce.
let fishingFc = null, fishingData = null;
function initFishingZones(){
  FISHING_ZONES = fishingData ? fishingData.zones : [];
  fishingFc = turf.featureCollection(FISHING_ZONES.map((z, i) => ({ type:'Feature', id:i,
    properties:{ name:z.name, type:z.type, fish:',' + z.fish.join(',') + ',' }, geometry:z.geometry })));
  // pas de doublon avec le nom de la mer (ex. Mer Rouge)
  const seaNames = new Set(SEA_LABELS.map(l => l[0]));
  const labels = turf.featureCollection(FISHING_ZONES.map((z, i) => turf.point(z.label, { name:z.name, zone:i })).filter(f => !seaNames.has(f.properties.name)));
  map.addSource('fishing', { type:'geojson', data:fishingFc });
  map.addSource('fishing-labels', { type:'geojson', data:labels });
  const color = ['match', ['get', 'type'], ...Object.entries(FISH_ZONE_COLORS).flat(), '#2a9d8f'];
  map.addLayer({ id:'fishing-fill', type:'fill', source:'fishing', paint:{ 'fill-color':color, 'fill-opacity':0.3 } }, 'regions');
  map.addLayer({ id:'fishing-line', type:'line', source:'fishing', paint:{ 'line-color':color, 'line-width':1.2, 'line-dasharray':[2, 2], 'line-opacity':0.8 } }, 'regions');
  map.addLayer({ id:'fishing-label', type:'symbol', source:'fishing-labels', minzoom:3.5,
    layout:{ 'text-field':['get', 'name'], 'text-font':['Open Sans Regular'], 'text-size':10, 'text-max-width':8 },
    paint:{ 'text-color':'#12415e', 'text-halo-color':'#e8f3f6', 'text-halo-width':1.2 } });
  initFreshWaters();
  initSeaLabels();
  // clic hors des regions: fleuve / lac d'abord, sinon zone de peche en mer
  map.on('click', (e) => {
    if(interactionBusy() || map.queryRenderedFeatures(e.point, { layers:['regions'] }).length) return;
    const w = waterAt(e.lngLat);
    if(w){ showFreshWater(w); return; }
    const z = map.queryRenderedFeatures(e.point, { layers:['fishing-fill'] });
    if(z.length) showFishingZone(z[0].id);
  });
  applyDevFilters();
}
function highlightFishingZones(fish){
  if(!map.getLayer('fishing-fill')) return;
  const typeColor = ['match', ['get', 'type'], ...Object.entries(FISH_ZONE_COLORS).flat(), '#2a9d8f'];
  if(fish) FISHING_ZONES.forEach((z, i) => map.setFeatureState({ source:'fishing', id:i }, { lv:seaLevel(z, fish) }));
  const byLevel = ['match', ['feature-state', 'lv'], 3, LEVEL_COLORS[3], 2, LEVEL_COLORS[2], 1, LEVEL_COLORS[1], LEVEL_COLORS[0]];
  map.setPaintProperty('fishing-fill', 'fill-color', fish ? byLevel : typeColor);
  map.setPaintProperty('fishing-fill', 'fill-opacity', fish ? ['match', ['feature-state', 'lv'], 0, 0.35, 0.7] : 0.3);
  map.setPaintProperty('fishing-line', 'line-color', fish ? byLevel : typeColor);
  map.setPaintProperty('fishing-line', 'line-opacity', fish ? 0.9 : 0.8);
}
// Fleuves et lacs: reperes pour le clic et surbrillance (filtre developpeur)
let riverBoxes = [], lakePolys = [];
function initFreshWaters(){
  if(!waterData) return;
  riverBoxes = waterData.rivers.map(r => turf.bbox(turf.lineString(r.c)));
  lakePolys = waterData.lakes.map(l => turf.polygon([l.p]));
  const tag = list => ',' + list.join(',') + ',';
  map.addSource('fresh-waters', { type:'geojson', data:turf.featureCollection([
    ...waterData.rivers.map((r, i) => turf.lineString(r.c, { fish:tag(riverFish(r)), kind:'river', i })),
    ...waterData.lakes.map((l, i) => turf.lineString(l.p, { fish:tag(lakeFish(l)), kind:'lake', i })) ]) });
  map.addLayer({ id:'fresh-hl', type:'line', source:'fresh-waters', layout:{ visibility:'none', 'line-cap':'round', 'line-join':'round' },
    paint:{ 'line-color':'#1c4f8c', 'line-width':['match', ['get', 'kind'], 'river', 2.5, 2], 'line-opacity':0.9 } }, 'regions-label');
}
function highlightFreshWaters(fish){
  if(!map.getLayer('fresh-hl')) return;
  map.setLayoutProperty('fresh-hl', 'visibility', fish ? 'visible' : 'none');
  if(fish) map.setFilter('fresh-hl', ['in', ',' + fish + ',', ['get', 'fish']]);
}
// Fleuve ou lac sous le point clique
function waterAt(ll){
  if(!waterData) return null;
  const pt = [ll.lng, ll.lat];
  const k = lakePolys.findIndex(poly => turf.booleanPointInPolygon(pt, poly));
  if(k >= 0) return { kind:'lake', item:waterData.lakes[k] };
  let best = null, bd = Infinity;
  waterData.rivers.forEach((r, i) => {
    const bb = riverBoxes[i]; if(pt[0] < bb[0] - 0.5 || pt[0] > bb[2] + 0.5 || pt[1] < bb[1] - 0.5 || pt[1] > bb[3] + 0.5) return;
    for(let j = 0; j < r.c.length; j++){ const d = turf.distance(pt, r.c[j]); if(d < bd && d < r.w[j] / 2 + 6){ bd = d; best = r; } }
  });
  return best ? { kind:'river', item:best } : null;
}
// Panneau de droite: fiche d'un fleuve ou d'un lac
function showFreshWater(w){
  if(selectedId !== null) map.setFeatureState({ source:'regions', id:selectedId }, { selected:false });
  selectedId = null;
  const river = w.kind === 'river', it = w.item, fish = river ? riverFish(it) : lakeFish(it);
  const regions = river ? it.r : (it.r ? [it.r] : []);
  document.getElementById('region-panel').innerHTML =
    '<div><h3 class="region-name hand">' + (river ? '🏞️ ' + it.n : '💧 Lac') + '</h3><div class="region-tagline">Pêche en eau douce — ' +
      (river ? 'fleuve navigable' : 'lac de ' + it.a.toLocaleString('fr-FR') + ' km²') + '</div></div>' +
    '<div class="region-section-title">Poissons</div>' +
    '<div class="res-group">' + fish.map(k => '<span class="res-chip lv' + (river ? riverLevel(it) : lakeLevel(it)) + '">' + RESOURCES[k].name + '</span>').join('') + '</div>' +
    '<div class="region-row"><span>' + (river ? 'Régions traversées' : 'Région') + '</span><span class="v">' + (regions.join(', ') || '—') + '</span></div>' +
    '<p class="cap-empty">Ses poissons profitent aux régions ' + (river ? 'qu\'il traverse' : 'qui le bordent') + '.</p>';
}
// Zones de peche au large d'une region cotiere (son littoral les touche)
const regionFishingCache = new Map();
function regionFishingZones(id){
  if(!fishingFc) return [];
  if(regionFishingCache.has(id)) return regionFishingCache.get(id);
  const coast = coastOf(id);
  const list = coast ? FISHING_ZONES.filter((z, i) => { try{ return turf.booleanIntersects(fishingFc.features[i], coast.lines); }catch(e){ return false; } }) : [];
  regionFishingCache.set(id, list);
  return list;
}
// Panneau de droite: fiche d'une zone de peche
function showFishingZone(i){
  const z = FISHING_ZONES[i];
  if(selectedId !== null) map.setFeatureState({ source:'regions', id:selectedId }, { selected:false });
  selectedId = null;
  document.getElementById('region-panel').innerHTML =
    '<div><h3 class="region-name hand">🐟 ' + z.name + '</h3><div class="region-tagline">Zone de pêche — ' + FISH_ZONE_TYPES[z.type] + '</div></div>' +
    (z.fish.some(k => SEA_FISH[k]) ? '<div class="region-section-title">Poissons</div>' +
      '<div class="res-group">' + z.fish.filter(k => SEA_FISH[k]).map(k => '<span class="res-chip lv' + seaLevel(z, k) + '">' + SEA_FISH[k] + '</span>').join('') + '</div>' : '') +
    (z.fish.some(k => SEA_ANIMALS[k]) ? '<div class="region-section-title">Animaux marins</div>' +
      '<div class="res-group">' + z.fish.filter(k => SEA_ANIMALS[k]).map(k => '<span class="res-chip lv' + seaLevel(z, k) + '">' + SEA_ANIMALS[k] + '</span>').join('') + '</div>' : '') +
    '<div class="region-row"><span>Surface</span><span class="v">' + z.km2.toLocaleString('fr-FR') + ' km²</span></div>' +
    '<p class="cap-empty">' + (z.type === 'pleine-mer' ? 'En pleine mer : accessible aux navires depuis n\'importe quel port.' : 'Accessible depuis les ports des régions côtières voisines.') + '</p>';
}
// Liste des ressources d'une region, par categorie (panneau de region)
function regionResourcesHtml(id){
  const r = regionResources.get(id);
  if(!r) return '';
  const groups = RESOURCE_CATEGORIES.map(cat => {
    const items = cat.items.filter(k => r[k]);
    return items.length ? '<div class="res-group"><span class="res-cat">' + cat.label + '</span>' +
      items.map(k => '<span class="res-chip lv' + r[k] + '" title="' + RESOURCE_LEVELS[r[k]] + (LAND_ANIMALS[k] ? ' — ' + LAND_ANIMALS[k].uses : '') + '">' + RESOURCES[k].name + '</span>').join('') + '</div>' : '';
  }).join('');
  const sea = regionFishingZones(id);
  const seaHtml = sea.length ? '<div class="res-group"><span class="res-cat">Pêche en mer</span>' +
    sea.map(z => '<span class="res-chip lvz" title="' + z.fish.map(k => SEA_NAMES[k]).join(', ') + '">' + z.name + '</span>').join('') + '</div>' : '';
  const wat = regionWaters.get(id);
  const watHtml = wat ? '<div class="region-row"><span>Fleuves</span><span class="v">' + (wat.rivers.join(', ') || '—') + '</span></div>' +
    (wat.lakes ? '<div class="region-row"><span>Lacs</span><span class="v">' + wat.lakes + '</span></div>' : '') : '';
  const az = regionAnimalZone.has(id) ? ANIMAL_ZONES[regionAnimalZone.get(id)].name : null;
  return '<div class="region-section-title">Ressources</div>' +
    '<div class="region-row"><span>Qualité du sol</span><span class="v">' + SOIL_LEVELS[regionSoil.get(id)] + '</span></div>' +
    (az ? '<div class="region-row"><span>Zone de faune</span><span class="v">' + az + '</span></div>' : '') +
    watHtml + ((groups + seaHtml) || '<p class="cap-empty">Aucune ressource notable.</p>');
}
