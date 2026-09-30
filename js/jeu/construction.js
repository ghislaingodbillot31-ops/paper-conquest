// ---------- Batiments (registre modulaire de l'onglet Construction) ----------
// Pour ajouter un batiment: une entree avec son nom, sa description, sa
// regle de placement (texte) et sa fonction validate(lonLat, regionId)
// -> { valid, reason, pos, bearing }. maxPerRegion: null = sans limite.
const BUILDINGS = [
  { id:'port', name:'Port', icon:'⚓',
    description:'Permet à vos navires d\'accoster et de partir de la région.',
    rule:'Uniquement sur le littoral de la région, tourné vers la mer.',
    maxPerRegion:1, cost:300,
    available: regionId => coastOf(regionId) !== null || 'Région sans littoral : aucun port possible.',
    hint:'sur le littoral',
    validate: validateCoastalPlacement },
  { id:'mine', name:'Atelier de mineur', icon:'⛏️',
    description:'Extrait les minerais et gisements naturels de la région.',
    rule:'N\'importe où sur les terres de la région.',
    maxPerRegion:1, cost:200,
    available: regionId => regionMinerals(regionId).length > 0 || 'Aucun minerai ni gisement dans cette région.',
    details: regionId => { const r = regionResources.get(regionId) || {}, list = regionMinerals(regionId);
      return list.length ? 'Extraction : ' + list.map(k => RESOURCES[k].name + ' (' + RESOURCE_LEVELS[r[k]].toLowerCase() + ')').join(', ') + '.' : ''; },
    hint:'dans les terres',
    validate: validateLandPlacement },
  { id:'ferme', name:'Ferme', icon:'🌾',
    description:'Cultive les terres de la région : céréales, lin, chanvre, plantes tinctoriales, épices.',
    rule:'N\'importe où sur les terres de la région.',
    maxPerRegion:1, cost:150,
    available: regionId => Object.keys(productionOf('ferme', regionId)).length > 0 || 'Aucune culture possible dans cette région.',
    details: regionId => productionText('ferme', regionId),
    hint:'dans les terres',
    validate: validateLandPlacement },
  { id:'pecherie', name:'Pêcherie', icon:'🎣',
    description:'Pêche en mer (zones de pêche voisines), dans les fleuves et les lacs de la région.',
    rule:'N\'importe où sur les terres de la région.',
    maxPerRegion:1, cost:200,
    available: regionId => Object.keys(productionOf('pecherie', regionId)).length > 0 || 'Ni zone de pêche, ni fleuve, ni lac dans cette région.',
    details: regionId => productionText('pecherie', regionId),
    hint:'dans les terres',
    validate: validateLandPlacement },
  { id:'elevage', name:'Élevage', icon:'🐄',
    description:'Élève les animaux de la région : lait, viande, laine, cuir, montures.',
    rule:'N\'importe où sur les terres de la région.',
    maxPerRegion:1, cost:180,
    available: regionId => Object.keys(productionOf('elevage', regionId)).length > 0 || 'Aucun animal d\'élevage dans cette région.',
    details: regionId => productionText('elevage', regionId),
    hint:'dans les terres',
    validate: validateLandPlacement },
];
// minerais "Naturel" presents dans une region, du plus abondant au plus rare
const regionMinerals = regionId => { const r = regionResources.get(regionId) || {}; return MINERALS.filter(k => r[k]).sort((a, b) => r[b] - r[a]); };
// Placement libre a l'interieur de la region (antimeridien gere)
function validateLandPlacement([lon, lat], regionId){
  const f = regionFeature(regionId);
  const pos = [lon, lon + 360, lon - 360].map(x => [x, lat]).find(p => turf.booleanPointInPolygon(p, f));
  if(!pos) return { valid:false, reason:'Hors de votre région.', pos:[lon, lat] };
  const def = BUILDINGS.find(b => b.id === placement.building.id);
  const count = regionBuildings(regionId).filter(b => b.type === def.id).length;
  if(def.maxPerRegion !== null && count >= def.maxPerRegion) return { valid:false, reason:'Déjà construit dans cette région.', pos };
  return { valid:true, reason:'Emplacement valide : sur les terres de la région.', pos };
}
function renderConstructionTab(el, regionId){
  const built = regionBuildings(regionId);
  el.innerHTML = '<p class="cap-intro">Choisissez un bâtiment, puis placez-le sur la carte. L\'aperçu passe au vert quand l\'emplacement est valide.</p>' +
    '<div class="build-list">' + BUILDINGS.map(b => {
      const count = built.filter(x => x.type === b.id).length;
      const avail = b.available(regionId);
      const full = b.maxPerRegion !== null && count >= b.maxPerRegion;
      const poor = b.cost && eco.gold < b.cost;
      const blocked = avail !== true ? avail : (full ? 'Déjà construit dans cette région (' + count + '/' + b.maxPerRegion + ').' : (poor ? 'Pas assez d\'Or (' + fmtGold(b.cost) + ' nécessaires).' : ''));
      return '<div class="build-card">' +
        '<div class="build-icon" aria-hidden="true">' + b.icon + '</div>' +
        '<div class="build-text"><div class="build-name">' + b.name + '</div><div class="build-desc">' + b.description + '</div>' +
        '<div class="build-rule">Règle : ' + b.rule + '</div>' +
        (b.cost ? '<div class="build-cost">Coût : ' + fmtGold(b.cost) + '</div>' : '') +
        (b.details && b.details(regionId) ? '<div class="build-rule">' + b.details(regionId) + '</div>' : '') +
        (blocked ? '<div class="build-blocked">' + blocked + '</div>' : '') + '</div>' +
        '<button class="boat-btn build-go" type="button" data-building="' + b.id + '"' + (blocked ? ' disabled' : '') + '>Construire</button></div>';
    }).join('') + '</div>' +
    '<div class="region-section-title">Bâtiments de la région</div>' +
    (built.length ? '<ul class="built-list">' + built.map(x => {
      const def = BUILDINGS.find(b => b.id === x.type);
      const prod = def ? productionOf(def.id, regionId) : {};
      const extra = Object.keys(prod).length ? ' — produit : ' + Object.entries(prod).map(([k, q]) => q + ' ' + goodName(k)).join(', ') + ' / jour' : '';
      return '<li>' + (def ? def.icon + ' ' + def.name : x.type) + ' — construit le ' + new Date(x.builtAt).toLocaleDateString('fr-FR') + extra + '</li>';
    }).join('') + '</ul>' : '<p class="cap-empty">Aucun bâtiment pour le moment.</p>');
  el.querySelectorAll('.build-go').forEach(btn => btn.addEventListener('click', () => startPlacement(btn.dataset.building, regionId)));
}

// ---------- Littoral d'une region et regle de placement cotier ----------
// Littoral = arcs de la region qui ne sont partages avec AUCUNE autre
// region (le reste de son contour est une frontiere terrestre).
const coastCache = new Map();
let arcUse = null;
function coastOf(regionId){
  if(coastCache.has(regionId)) return coastCache.get(regionId);
  if(!arcUse){
    arcUse = new Map();
    const walk = a => Array.isArray(a) ? a.forEach(walk) : arcUse.set(a < 0 ? ~a : a, (arcUse.get(a < 0 ? ~a : a) || 0) + 1);
    regionGeoms.forEach(g => walk(g.arcs));
  }
  const g = regionGeoms[regionId - 1], coastArcs = [];
  const walk = a => Array.isArray(a) ? a.forEach(walk) : (arcUse.get(a < 0 ? ~a : a) === 1 && coastArcs.push(a));
  walk(g.arcs);
  let result = null;
  if(coastArcs.length){
    const f = regionFeature(regionId), ref = turf.centroid(f).geometry.coordinates[0];
    const lines = topojson.feature(regionTopo, { type:'MultiLineString', arcs:coastArcs.map(a => [a]) }).geometry.coordinates
      .map(unwrapRingLongitudes)
      .map(l => { const m = l.reduce((s, p) => s + p[0], 0) / l.length, k = Math.round((ref - m) / 360); return l.map(([x, y]) => [x + k * 360, y]); });
    result = { lines:turf.multiLineString(lines), ref };
  }
  coastCache.set(regionId, result);
  return result;
}
// point a distanceKm dans la direction bearing (degres, 0 = nord)
function offsetKm([lon, lat], bearing, distanceKm){
  const r = bearing * Math.PI / 180;
  return [lon + distanceKm * Math.sin(r) / (111.32 * Math.cos(lat * Math.PI / 180)), lat + distanceKm * Math.cos(r) / 110.57];
}
// Aimantation vers la cote: quelques pixels a l'ecran autour du curseur
// (convertis en km selon le zoom), jamais plus de 40 km -- au-dela, le
// curseur est clairement dans les terres ou en pleine mer.
const PORT_SNAP_PX = 14, PORT_SNAP_MAX_KM = 40;
function snapToleranceKm(lat){ const kmPerPx = 40075 * Math.cos(lat * Math.PI / 180) / (512 * Math.pow(2, map.getZoom())); return Math.min(PORT_SNAP_MAX_KM, Math.max(2, PORT_SNAP_PX * kmPerPx)); }
const SEA_PROBE_KM = 8;      // rayon de sondage autour du port (terre d'un cote, mer de l'autre)
// Sondage en etoile autour d'un point de cote: nombre de directions qui
// tombent dans la region (terre) ou en mer, et direction moyenne de la mer
// (vers ou le port est tourne).
function probeCoast(pos, f){
  let sx = 0, sy = 0, sea = 0, land = 0;
  for(let k = 0; k < 16; k++){
    const b = k * 22.5, p = offsetKm(pos, b, SEA_PROBE_KM);
    if(turf.booleanPointInPolygon(p, f)) land++;
    else if(seaNavigator.isSea(...normLonLat(p))){ sea++; sx += Math.sin(b * Math.PI / 180); sy += Math.cos(b * Math.PI / 180); }
  }
  return { sea, land, bearing:(Math.atan2(sx, sy) * 180 / Math.PI + 360) % 360 };
}
function validateCoastalPlacement([lon, lat], regionId){
  const coast = coastOf(regionId);
  if(!coast) return { valid:false, reason:'Cette région n\'a pas de littoral.' };
  const f = regionFeature(regionId);
  const cur = [lon + Math.round((coast.ref - lon) / 360) * 360, lat];
  const near = turf.nearestPointOnLine(coast.lines, cur, { units:'kilometers' });
  const pos = near.geometry.coordinates;
  // hors de la region: sur la terre d'une autre region, ou trop loin
  const onOwnLand = turf.booleanPointInPolygon(cur, f);
  if(!onOwnLand && !seaNavigator.isSea(...normLonLat(cur))) return { valid:false, reason:'Hors de votre région.', pos:cur };
  if(near.properties.dist > snapToleranceKm(lat)) return { valid:false, pos:cur,
    reason: onOwnLand ? 'Dans les terres : placez le port au bord de la côte.' : 'En pleine mer : placez le port au bord de la côte.' };
  const { sea, land, bearing } = probeCoast(pos, f);
  if(!sea) return { valid:false, reason:'Aucun accès à la mer ici.', pos };
  if(!land) return { valid:false, reason:'Emplacement entièrement dans l\'eau.', pos };
  const def = BUILDINGS.find(b => b.id === 'port');
  const count = regionBuildings(regionId).filter(b => b.type === 'port').length;
  if(def.maxPerRegion !== null && count >= def.maxPerRegion) return { valid:false, reason:'Un port existe déjà dans cette région.', pos, bearing };
  return { valid:true, reason:'Emplacement valide : sur le littoral, tourné vers la mer.', pos, bearing };
}

// ---------- Placement d'un batiment sur la carte ----------
const placement = { active:false, building:null, regionId:null, last:null, pending:false };
function startPlacement(buildingId, regionId){
  const bdef = BUILDINGS.find(b => b.id === buildingId);
  if(bdef && bdef.cost && eco.gold < bdef.cost){ boatHint('Pas assez d\'Or pour construire : ' + bdef.name + ' (' + fmtGold(bdef.cost) + ').'); return; }
  closeCapital();
  boat.selected = false; boat.placing = false; renderBoat();
  Object.assign(placement, { active:true, building:BUILDINGS.find(b => b.id === buildingId), regionId, last:null, pending:false });
  const f = regionFeature(regionId);
  try{ map.fitBounds(turf.bbox(f), { padding:60, maxZoom:6, duration:800 }); }catch(e){}
  showBuildBar();
  boatHint('Déplacez la souris ' + (placement.building.hint || 'dans la région') + ' de la région ' + regionId + ', puis cliquez.');
}
function stopPlacement(){
  Object.assign(placement, { active:false, building:null, regionId:null, last:null, pending:false });
  map.getSource('build-preview').setData({ type:'FeatureCollection', features:[] });
  document.getElementById('build-bar').hidden = true;
  map.getCanvas().style.cursor = '';
  boatHint('');
}
function drawPreview(res){
  const feats = [];
  if(res.pos){
    feats.push({ type:'Feature', properties:{ valid:res.valid }, geometry:{ type:'Point', coordinates:res.pos } });
    if(typeof res.bearing === 'number') feats.push({ type:'Feature', properties:{ valid:res.valid }, geometry:{ type:'LineString', coordinates:[res.pos, offsetKm(res.pos, res.bearing, 30)] } });
  }
  map.getSource('build-preview').setData({ type:'FeatureCollection', features:feats });
}
function showBuildBar(){
  const bar = document.getElementById('build-bar');
  const b = placement.building, r = placement.last;
  bar.hidden = false;
  document.getElementById('build-bar-text').textContent = placement.pending
    ? 'Construire ici : ' + b.name.toLowerCase() + ' ?'
    : (r ? (r.valid ? '✅ ' : '⛔ ') + r.reason : 'Placement : ' + b.name + ' — ' + b.rule);
  document.getElementById('build-confirm').hidden = !placement.pending;
  document.getElementById('build-cancel').textContent = placement.pending ? 'Choisir un autre endroit' : 'Annuler';
}
let moveQueued = null;
function onPlacementMove(e){
  if(!placement.active || placement.pending) return;
  if(moveQueued){ moveQueued = e; return; }
  moveQueued = e;
  requestAnimationFrame(() => { const ev = moveQueued; moveQueued = null; validateAt(ev); });
}
function validateAt(e){
  if(!placement.active || placement.pending) return;
  const res = placement.building.validate(normLonLat([e.lngLat.lng, e.lngLat.lat]), placement.regionId);
  placement.last = res;
  drawPreview(res);
  map.getCanvas().style.cursor = res.valid ? 'copy' : 'not-allowed';
  showBuildBar();
}
function onPlacementClick(e){
  if(!placement.active || placement.pending) return;
  const res = placement.building.validate(normLonLat([e.lngLat.lng, e.lngLat.lat]), placement.regionId);
  placement.last = res; drawPreview(res);
  if(!res.valid){ showBuildBar(); return; } // construction empechee: la regle n'est pas respectee
  placement.pending = true;
  showBuildBar();
}
function confirmPlacement(){
  const r = placement.last;
  if(!placement.pending || !r || !r.valid) return;
  const id = placement.regionId;
  if(!spendGold(placement.building.cost || 0)){ boatHint('Pas assez d\'Or pour construire : ' + placement.building.name + '.'); stopPlacement(); return; }
  (buildings[id] = buildings[id] || []).push({ type:placement.building.id, pos:r.pos, bearing:typeof r.bearing === 'number' ? Math.round(r.bearing) : undefined, builtAt:new Date().toISOString() });
  savePlayerState();
  renderBuildingsLayer();
  const name = placement.building.name;
  stopPlacement();
  boatHint(name + ' construit dans la région ' + id + '.');
  setTimeout(() => boatHint(''), 2500);
  if(selectedId === id) renderRegionPanel();
}

function initSelection(){
  initOwnership();
  map.on('mousemove', onPlacementMove);
  map.on('click', onPlacementClick);
  map.on('click', (e) => {
    if(interactionBusy() || !map.getLayer('capitals-owned')) return;
    const hit = map.queryRenderedFeatures([[e.point.x - 8, e.point.y - 8], [e.point.x + 8, e.point.y + 8]], { layers:['capitals-owned'] });
    if(hit.length) openCapital(hit[0].properties.regionId);
  });
  document.getElementById('capital-close').addEventListener('click', closeCapital);
  document.getElementById('capview-select').addEventListener('change', e => { capitalRegion = +e.target.value; renderCapitalView(); });
  document.getElementById('capital-modal').addEventListener('click', (e) => { if(e.target.id === 'capital-modal') closeCapital(); });
  document.addEventListener('keydown', (e) => {
    if(e.key !== 'Escape') return;
    if(!document.getElementById('capital-modal').hidden) closeCapital();
    else if(placement.active) stopPlacement();
    else if(send.active) cancelSend();
    else if(caravanSend.active) cancelCaravanSend();
  });
  document.getElementById('build-confirm').addEventListener('click', confirmPlacement);
  document.getElementById('build-cancel').addEventListener('click', () => {
    if(placement.pending){ placement.pending = false; showBuildBar(); } else stopPlacement();
  });
  renderRegionPanel();
}

// Reset global (onglet Developpeur): efface les regions possedees, les
// batiments et le bateau, sans recharger la page (le reseau de la carte
// n'est pas recalcule). Les filtres d'affichage sont conserves.
function resetGame(){
  try{ [OWNED_STORAGE_KEY, BUILDINGS_STORAGE_KEY, LEGACY_START_KEY, BOAT_STORAGE_KEY, CARAVAN_STORAGE_KEY, ECO_STORAGE_KEY].forEach(k => localStorage.removeItem(k));
    Object.keys(localStorage).filter(k => k.startsWith('paperConquestRegionMap.')).forEach(k => localStorage.removeItem(k)); }catch(e){}
  eco = newEconomy(); renderEconomy();
  if(placement.active) stopPlacement();
  closeCapital();
  if(selectedId !== null) map.setFeatureState({ source:'regions', id:selectedId }, { selected:false });
  selectedId = null;
  ownedRegions = new Set(); buildings = {};
  boat.pos = null; boat.selected = false; boat.placing = false; boat.voyage = null; send.active = false;
  // un bateau en route s'arrete a la prochaine image
  sailRun++; boat.moving = false; clearTimeout(boatPathTimer); setBoatPath(null); boatHint('');
  hoveredPort.npc = hoveredPort.own = null; updatePortHighlights();
  caravan.pos = null; caravan.voyage = null; caravan.moving = false; caravanRun++; caravanSend.active = false; caravanSend.from = null;
  clearTimeout(caravanPathTimer); setCaravanPath(null); renderCaravan(); hoveredCity.npc = hoveredCity.own = null; updateCityHighlights();
  renderBoat();
  refreshOwnershipLayers();
  renderRegionPanel();
}
(function initResetButton(){
  const btn = document.getElementById('dev-reset');
  let armTimer = null;
  const disarm = () => { clearTimeout(armTimer); armTimer = null; btn.classList.remove('confirm'); btn.textContent = 'Réinitialiser la partie'; };
  btn.addEventListener('click', () => {
    if(!armTimer){ // premier clic: demande de confirmation dans le bouton lui-meme
      btn.classList.add('confirm'); btn.textContent = 'Confirmer : tout effacer';
      armTimer = setTimeout(disarm, 4000);
      return;
    }
    disarm();
    if(!regionsFc) return;
    resetGame();
    boatHint('Partie réinitialisée : régions, bâtiments, bateau et caravane effacés.');
    setTimeout(() => boatHint(''), 2500);
  });
})();
