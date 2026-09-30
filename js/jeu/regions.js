// ---------- Regions: propriete, capitale, construction (sauvegarde locale) ----------
// Etat du joueur, memorise dans ce navigateur (localStorage):
//  - regions possedees (ids), achetees depuis le panneau de region;
//  - batiments construits, par region: [{ type, pos, bearing, builtAt }].
// Pas encore de serveur de jeu: "un autre joueur" n'existe pas encore, mais
// chaque achat verifie deja que la region n'a pas de proprietaire (owner).
const OWNED_STORAGE_KEY = 'paperConquestOwned';
const BUILDINGS_STORAGE_KEY = 'paperConquestBuildings';
const LEGACY_START_KEY = 'paperConquestStart'; // ancien achat unique, repris une fois
let selectedId = null;
let ownedRegions = new Set();
let buildings = {};
let regionTopo = null, regionGeoms = null;

function loadPlayerState(){
  try{ const o = JSON.parse(localStorage.getItem(OWNED_STORAGE_KEY)); if(Array.isArray(o)) ownedRegions = new Set(o); }catch(e){}
  try{ const b = JSON.parse(localStorage.getItem(BUILDINGS_STORAGE_KEY)); if(b && typeof b === 'object') buildings = b; }catch(e){}
  try{
    const legacy = JSON.parse(localStorage.getItem(LEGACY_START_KEY));
    if(legacy && typeof legacy.id === 'number'){ ownedRegions.add(legacy.id); localStorage.removeItem(LEGACY_START_KEY); savePlayerState(); }
  }catch(e){}
}
function savePlayerState(){
  try{
    localStorage.setItem(OWNED_STORAGE_KEY, JSON.stringify([...ownedRegions]));
    localStorage.setItem(BUILDINGS_STORAGE_KEY, JSON.stringify(buildings));
  }catch(e){ console.warn('localStorage indisponible, partie non sauvegardee:', e); }
}
const regionFeature = id => regionsFc.features.find(x => x.id === id);
const ownerOf = id => ownedRegions.has(id) ? 'player' : null;
const regionBuildings = id => buildings[id] || [];

// Une interaction en cours (bateau, placement d'un batiment) a priorite
// sur la selection des regions au clic.
const interactionBusy = () => placement.active || boat.placing || boat.selected || send.active || caravanSend.active;

function updateRibbon(){
  const ribbon = document.getElementById('map-ribbon');
  const ids = [...ownedRegions].sort((a, b) => a - b);
  ribbon.textContent = ids.length ? '🏳️ Vos régions : ' + ids.join(', ') : '📍 Achetez une région pour commencer';
}
function refreshOwnershipLayers(){
  regionsFc.features.forEach(f => map.setFeatureState({ source:'regions', id:f.id }, { owned:ownedRegions.has(f.id) }));
  if(map.getLayer('capitals-owned')) map.setFilter('capitals-owned', ['in', ['get', 'regionId'], ['literal', [...ownedRegions]]]);
  renderBuildingsLayer();
  updateRibbon();
  if(typeof updateCityHighlights === 'function') updateCityHighlights();
  if(currentView() === 'capitale') renderCapitalView();
}

function selectRegion(id){
  const f = regionFeature(id);
  if(f && f.properties.isNpc && !ownedRegions.has(id)){
    // Region NPC (comptoir de commerce): jamais achetable -- petit message
    // temporaire sur le ruban plutot qu'un refus silencieux.
    const ribbon = document.getElementById('map-ribbon');
    ribbon.textContent = '🟣 Comptoir de commerce -- non disponible à l\'achat';
    clearTimeout(selectRegion._npcTimer);
    selectRegion._npcTimer = setTimeout(updateRibbon, 2200);
    return;
  }
  if(selectedId !== null) map.setFeatureState({ source:'regions', id:selectedId }, { selected:false });
  selectedId = id;
  map.setFeatureState({ source:'regions', id }, { selected:true });
  renderRegionPanel();
}

function buyRegion(id){
  const f = regionFeature(id);
  if(!f || f.properties.isNpc || ownerOf(id) !== null) return; // deja possedee: plus achetable
  if(!spendGold(regionPrice())) return;                          // pas assez d'Or
  ownedRegions.add(id);
  savePlayerState();
  refreshOwnershipLayers();
  renderRegionPanel();
}

function renderRegionPanel(){
  const panel = document.getElementById('region-panel');
  if(selectedId === null){
    panel.innerHTML = '<div class="region-empty">Cliquez sur une région du globe pour voir ses informations.</div>';
    return;
  }
  const f = regionFeature(selectedId);
  const c = f && f.properties.continent ? CONTINENT_BY_ID[f.properties.continent] : null;
  const contName = c ? c.name : 'Territoire neutre';
  const contColor = c ? c.color : 'var(--paper-alt)';
  const area = f ? Math.round(f.properties.clusterArea || 0).toLocaleString('fr-FR') + ' km²' : '-';
  const owned = ownedRegions.has(selectedId);
  const ports = regionBuildings(selectedId).filter(b => b.type === 'port').length;
  panel.innerHTML =
    '<div class="region-art"><svg viewBox="0 0 300 170"><rect width="300" height="170" fill="' + contColor + '" opacity="0.25"/>' +
      '<path d="M0 130 L40 90 L70 110 L110 60 L150 100 L190 75 L230 115 L260 95 L300 130 V170 H0 Z" fill="none" stroke="var(--ink)" stroke-width="2" opacity="0.55"/>' +
      '<circle cx="250" cy="35" r="16" fill="none" stroke="var(--ink)" stroke-width="2" opacity="0.5"/></svg></div>' +
    '<div><h3 class="region-name hand">Région ' + selectedId + '</h3><div class="region-tagline">' + contName + (c ? ' — ' + c.tagline : '') + '</div></div>' +
    '<div class="region-section-title">Informations de la région</div>' +
    '<div class="region-row"><span>Numéro</span><span class="v">' + selectedId + '</span></div>' +
    '<div class="region-row"><span>Aire</span><span class="v">' + area + '</span></div>' +
    '<div class="region-row"><span>Continent</span><span class="v">' + contName + '</span></div>' +
    '<div class="region-row"><span>Propriétaire</span><span class="v">' + (owned ? 'Vous' : 'Aucun') + '</span></div>' +
    (owned ? '<div class="region-row"><span>Ports</span><span class="v">' + ports + '</span></div>' +
      (() => { const pr = Object.entries(regionProduction(selectedId)); return '<div class="region-row"><span>Production / jour</span><span class="v">' +
        (pr.length ? pr.map(([k, q]) => q + ' ' + goodName(k)).join(', ') : 'aucune') + '</span></div>'; })() : '') +
    regionResourcesHtml(selectedId) +
    (owned ? '<button class="boat-btn" id="explore-btn" type="button">🏰 Carte de la région</button>' : '') +
    (owned
      ? '<div class="owned-note">' + iconCheck() + 'Vous possédez cette région.</div>' +
        '<div class="region-section-title">Test bateau</div><div class="boat-box"><div class="boat-status" id="boat-status"></div><button class="boat-btn" id="boat-place-btn">Placer le bateau</button></div>'
      : '<button class="select-btn" id="buy-btn"' + (eco.gold < regionPrice() ? ' disabled title="Pas assez d\'Or"' : '') + '>' + iconCheck() + 'ACHETER CETTE RÉGION — ' + (regionPrice() ? fmtGold(regionPrice()) : 'OFFERTE') + '</button>');
  const explore = document.getElementById('explore-btn');
  if(explore) explore.addEventListener('click', () => { capitalRegion = selectedId; capitalTab = 'carte'; showView('capitale'); });
  const buy = document.getElementById('buy-btn');
  if(buy) buy.addEventListener('click', () => buyRegion(selectedId));
  const boatBtn = document.getElementById('boat-place-btn');
  if(boatBtn){ boatBtn.addEventListener('click', toggleBoatPlacing); renderBoat(); }
}

// Couches: regions possedees (teinte + contour), capitales possedees,
// batiments construits, apercu de placement. Appele une fois la carte prete.
function initOwnership(){
  loadPlayerState();
  map.addLayer({ id:'regions-owned', type:'fill', source:'regions',
    paint:{ 'fill-color':'#f2a900', 'fill-opacity':['case', ['boolean', ['feature-state', 'owned'], false], 0.32, 0] } }, 'regions-outline');
  map.addLayer({ id:'regions-owned-outline', type:'line', source:'regions',
    paint:{ 'line-color':'#b8560f', 'line-width':['case', ['boolean', ['feature-state', 'owned'], false], 2.2, 0] } }, 'regions-selected');
  if(map.getSource('villages')){
    map.addLayer({ id:'capitals-owned', type:'circle', source:'villages', filter:['in', ['get', 'regionId'], ['literal', []]],
      paint:{ 'circle-radius':7, 'circle-color':'#f2a900', 'circle-stroke-color':'#3c3527', 'circle-stroke-width':2 } });
    map.on('mouseenter', 'capitals-owned', () => { if(!interactionBusy()) map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'capitals-owned', () => { map.getCanvas().style.cursor = ''; });
  }
  map.addImage('port-icon', drawPortIcon(), { pixelRatio:2 });
  map.addSource('buildings', { type:'geojson', data:{ type:'FeatureCollection', features:[] } });
  map.addLayer({ id:'buildings-dir', type:'line', source:'buildings', filter:['==', ['geometry-type'], 'LineString'],
    paint:{ 'line-color':'#1c3d5a', 'line-width':2.5 } });
  const ownLayout = size => ({ 'icon-image':'port-icon', 'icon-size':size, 'icon-allow-overlap':true, 'icon-ignore-placement':true });
  map.addLayer({ id:'buildings-icon', type:'symbol', source:'buildings', filter:portFilter([], false), layout:ownLayout(1) });
  map.addLayer({ id:'buildings-halo', type:'circle', source:'buildings', filter:portFilter([], true), paint:PORT_HALO_PAINT });
  map.addLayer({ id:'buildings-icon-hl', type:'symbol', source:'buildings', filter:portFilter([], true), layout:ownLayout(PORT_HL_SIZE) });
  map.addImage('mine-icon', drawMineIcon(), { pixelRatio:2 });
  map.addSource('buildings-other', { type:'geojson', data:{ type:'FeatureCollection', features:[] } });
  map.addLayer({ id:'buildings-other-icon', type:'symbol', source:'buildings-other',
    layout:{ 'icon-image':['match', ['get', 'type'], 'mine', 'mine-icon', 'port-icon'], 'icon-size':1, 'icon-allow-overlap':true, 'icon-ignore-placement':true } });
  map.addSource('build-preview', { type:'geojson', data:{ type:'FeatureCollection', features:[] } });
  map.addLayer({ id:'build-preview-dir', type:'line', source:'build-preview', filter:['==', ['geometry-type'], 'LineString'],
    paint:{ 'line-color':['case', ['get', 'valid'], '#2f9e44', '#e03131'], 'line-width':3 } });
  map.addLayer({ id:'build-preview', type:'circle', source:'build-preview', filter:['==', ['geometry-type'], 'Point'],
    paint:{ 'circle-radius':10, 'circle-color':['case', ['get', 'valid'], '#2f9e44', '#e03131'], 'circle-opacity':0.85,
      'circle-stroke-color':'#ffffff', 'circle-stroke-width':2.5 } });
  refreshOwnershipLayers();
}
// Atelier de mineur: pioche blanche sur disque brun
function drawMineIcon(){
  const c = document.createElement('canvas'); c.width = c.height = 44;
  const g = c.getContext('2d');
  g.fillStyle = '#6b4a2b'; g.strokeStyle = '#ffffff'; g.lineWidth = 3;
  g.beginPath(); g.arc(22, 22, 18, 0, Math.PI * 2); g.fill(); g.stroke();
  g.strokeStyle = '#ffffff'; g.lineWidth = 2.8; g.lineCap = 'round';
  g.beginPath(); g.moveTo(15, 31); g.lineTo(28, 16); g.stroke();                 // manche
  g.beginPath(); g.moveTo(17, 11); g.quadraticCurveTo(29, 11, 33, 23); g.stroke(); // fer de la pioche
  return g.getImageData(0, 0, 44, 44);
}
function drawPortIcon(color = '#1c3d5a'){
  const c = document.createElement('canvas'); c.width = c.height = 44;
  const g = c.getContext('2d');
  g.fillStyle = color; g.strokeStyle = '#ffffff'; g.lineWidth = 3;
  g.beginPath(); g.arc(22, 22, 18, 0, Math.PI * 2); g.fill(); g.stroke();
  g.strokeStyle = '#ffffff'; g.lineWidth = 2.6; g.lineCap = 'round';
  g.beginPath(); g.arc(22, 13, 3.2, 0, Math.PI * 2); g.stroke();          // anneau
  g.beginPath(); g.moveTo(22, 16.5); g.lineTo(22, 32); g.stroke();        // verge
  g.beginPath(); g.moveTo(15, 21); g.lineTo(29, 21); g.stroke();          // jas
  g.beginPath(); g.arc(22, 25, 8, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); // bras
  return g.getImageData(0, 0, 44, 44);
}
function renderBuildingsLayer(){
  if(!map.getSource('buildings')) return;
  const feats = [], others = []; // ports (interactifs) / autres batiments (icone seule)
  for(const [rid, list] of Object.entries(buildings)){
    if(!ownedRegions.has(+rid)) continue;
    list.forEach((b, i) => {
      if(b.type !== 'port'){ others.push({ type:'Feature', properties:{ type:b.type, regionId:+rid }, geometry:{ type:'Point', coordinates:b.pos } }); return; }
      feats.push({ type:'Feature', id:+rid * 100 + i, properties:{ type:b.type, regionId:+rid }, geometry:{ type:'Point', coordinates:b.pos } });
      if(typeof b.bearing === 'number') feats.push({ type:'Feature', properties:{ type:b.type }, geometry:{ type:'LineString', coordinates:[b.pos, offsetKm(b.pos, b.bearing, 30)] } });
    });
  }
  map.getSource('buildings').setData({ type:'FeatureCollection', features:feats });
  map.getSource('buildings-other').setData({ type:'FeatureCollection', features:others });
  updatePortHighlights();
}
