// ---------- Caravane marchande: par la route, de capitale a capitale ----------
// Meme principe que le bateau, sur terre: la caravane part d'une de vos
// capitales (onglet Caravane), le joueur clique la capitale d'un comptoir
// NPC (rond violet) ou une de ses capitales; elle suit le reseau routier
// (plus court chemin en km sur les routes brunes), en temps reel et
// sauvegarde. Arrivee en ville, elle y reste (icone masquee) jusqu'a un
// nouvel ENVOYER depuis la fenetre de la ville.
const CARAVAN_STORAGE_KEY = 'paperConquestCaravan';
const CARAVAN_SPEED_KM_S = 20;   // vitesse de test: 20 km par seconde reelle
const caravan = { pos:null, voyage:null, moving:false };
const caravanSend = { active:false, from:null };
const roadGraph = new Map();     // numero de region -> [{ to, coords, km }]
let caravanReady = false, caravanRun = 0, caravanPathTimer = null;
const hoveredCity = { npc:null, own:null };
try{
  const s = JSON.parse(localStorage.getItem(CARAVAN_STORAGE_KEY));
  if(s && s.voyage && Array.isArray(s.voyage.coords)){ caravan.voyage = s.voyage; caravan.pos = s.pos || null; }
}catch(e){}
const saveCaravan = () => { try{ localStorage.setItem(CARAVAN_STORAGE_KEY, JSON.stringify({ pos:caravan.pos, voyage:caravan.voyage })); }catch(e){} };
const caravanCity = () => { const v = caravan.voyage; return v && v.arrived ? v.dest : null; };
const cityLabel = d => d.kind === 'npc' ? 'Comptoir de la région ' + d.regionId : 'Votre capitale (région ' + d.regionId + ')';
const sameCity = (a, b) => !!a && !!b && a.kind === b.kind && a.regionId === b.regionId;

// Reseau routier (routes brunes du reseau terrestre), dans les deux sens.
function addRoad(fromId, toId, coords){
  let km = 0; for(let i = 1; i < coords.length; i++) km += geoDistance(coords[i - 1], coords[i]);
  if(!roadGraph.has(fromId)) roadGraph.set(fromId, []);
  if(!roadGraph.has(toId)) roadGraph.set(toId, []);
  roadGraph.get(fromId).push({ to:toId, coords, km });
  roadGraph.get(toId).push({ to:fromId, coords:coords.slice().reverse(), km });
}
// Plus court chemin (km) sur les routes: Dijkstra simple (500 capitales).
function roadRoute(fromId, toId){
  const dist = new Map([[fromId, 0]]), prev = new Map(), done = new Set();
  while(true){
    let cur = null, best = Infinity;
    for(const [id, d] of dist) if(!done.has(id) && d < best){ best = d; cur = id; }
    if(cur === null) return null;
    if(cur === toId) break;
    done.add(cur);
    for(const e of roadGraph.get(cur) || []){
      const nd = best + e.km;
      if(nd < (dist.has(e.to) ? dist.get(e.to) : Infinity)){ dist.set(e.to, nd); prev.set(e.to, { from:cur, edge:e }); }
    }
  }
  const legs = []; for(let id = toId; id !== fromId; id = prev.get(id).from) legs.unshift(prev.get(id).edge);
  const coords = []; legs.forEach((e, i) => coords.push(...(i ? e.coords.slice(1) : e.coords)));
  return { coords, km:dist.get(toId) };
}

// Capitale sous le curseur: { kind:'npc'|'own', regionId }
function cityAt(point){
  const box = [[point.x - 9, point.y - 9], [point.x + 9, point.y + 9]];
  const layers = ['npc-capitals', 'npc-capitals-hl', 'capitals-owned'].filter(l => map.getLayer(l));
  const hit = map.queryRenderedFeatures(box, { layers })[0];
  if(!hit) return null;
  return { kind:hit.layer.id.startsWith('npc') ? 'npc' : 'own', regionId:hit.properties.regionId };
}
// Surbrillance: capitale survolee, ou destination de la caravane.
function updateCityHighlights(){
  if(!map.getLayer('npc-capitals')) return;
  const npcIds = regionsFc.features.filter(f => f.properties.isNpc).map(f => f.id);
  const npcHl = new Set(), ownHl = new Set(), d = caravan.voyage && caravan.voyage.dest;
  if(hoveredCity.npc !== null) npcHl.add(hoveredCity.npc);
  if(hoveredCity.own !== null) ownHl.add(hoveredCity.own);
  if(d && d.kind === 'npc') npcHl.add(d.regionId);
  if(d && d.kind === 'own') ownHl.add(d.regionId);
  const inList = ids => ['in', ['get', 'regionId'], ['literal', ids]];
  map.setFilter('npc-capitals', ['all', inList(npcIds), ['!', inList([...npcHl])]]);
  map.setFilter('npc-capitals-halo', inList([...npcHl]));
  map.setFilter('npc-capitals-hl', inList([...npcHl]));
  map.setFilter('capitals-owned-halo', ['all', inList([...ownedRegions]), inList([...ownHl])]);
}

function drawCaravanIcon(){
  const c = document.createElement('canvas'); c.width = c.height = 44;
  const g = c.getContext('2d');
  g.fillStyle = '#9c5b1c'; g.strokeStyle = '#ffffff'; g.lineWidth = 3;
  g.beginPath(); g.arc(22, 22, 18, 0, Math.PI * 2); g.fill(); g.stroke();
  g.font = '22px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🐪', 22, 24);
  return g.getImageData(0, 0, 44, 44);
}
function initCaravan(){
  map.addImage('caravan-icon', drawCaravanIcon(), { pixelRatio:2 });
  map.addSource('caravan-path', { type:'geojson', data:{ type:'FeatureCollection', features:[] } });
  map.addLayer({ id:'caravan-path', type:'line', source:'caravan-path',
    layout:{ 'line-cap':'round', 'line-join':'round' },
    paint:{ 'line-color':'#9c5b1c', 'line-width':3.5, 'line-dasharray':[1.2, 1], 'line-opacity':0.95 } });
  // capitales des comptoirs (ronds violets) + surbrillance
  const HALO = { 'circle-radius':16, 'circle-color':'#ffd43b', 'circle-opacity':0.55, 'circle-blur':0.35,
    'circle-stroke-color':'#f08c00', 'circle-stroke-width':1.5, 'circle-stroke-opacity':0.7 };
  map.addLayer({ id:'capitals-owned-halo', type:'circle', source:'villages', filter:['in', ['get', 'regionId'], ['literal', []]], paint:HALO }, 'capitals-owned');
  map.addLayer({ id:'npc-capitals-halo', type:'circle', source:'villages', filter:['in', ['get', 'regionId'], ['literal', []]], paint:HALO });
  map.addLayer({ id:'npc-capitals', type:'circle', source:'villages', filter:['in', ['get', 'regionId'], ['literal', []]],
    paint:{ 'circle-radius':7, 'circle-color':'#6b3fa0', 'circle-stroke-color':'#ffffff', 'circle-stroke-width':2 } });
  map.addLayer({ id:'npc-capitals-hl', type:'circle', source:'villages', filter:['in', ['get', 'regionId'], ['literal', []]],
    paint:{ 'circle-radius':9.5, 'circle-color':'#6b3fa0', 'circle-stroke-color':'#ffffff', 'circle-stroke-width':2.5 } });
  map.addSource('caravan', { type:'geojson', data:{ type:'FeatureCollection', features:[] } });
  map.addLayer({ id:'caravan', type:'symbol', source:'caravan',
    layout:{ 'icon-image':'caravan-icon', 'icon-allow-overlap':true, 'icon-ignore-placement':true } });
  caravanReady = true;
  updateCityHighlights();
  renderCaravan();
  if(caravan.voyage && !caravan.voyage.arrived) runCaravan(); // reprise d'un trajet en cours

  map.on('mousemove', (e) => {
    if(placement.active) return;
    const c = cityAt(e.point);
    const npc = c && c.kind === 'npc' ? c.regionId : null, own = c && c.kind === 'own' ? c.regionId : null;
    if(npc !== hoveredCity.npc || own !== hoveredCity.own){
      hoveredCity.npc = npc; hoveredCity.own = own;
      updateCityHighlights();
      if(c) map.getCanvas().style.cursor = 'pointer';
      else if(hoveredPort.npc === null && hoveredPort.own === null) map.getCanvas().style.cursor = '';
    }
  });
  map.on('click', (e) => {
    if(placement.active || send.active) return;
    const city = cityAt(e.point);
    if(caravanSend.active){ caravanTo(city); return; }
    if(!city || city.kind !== 'npc' || boat.selected || boat.placing) return;
    if(sameCity(caravanCity(), city) || dockedPort() === city.regionId) openNpcPort(city.regionId);
    else boatHint('Comptoir de la région ' + city.regionId + ' : envoyez-y une caravane depuis votre capitale (onglet Caravane).');
  });
}
function renderCaravan(){
  if(!caravanReady) return;
  map.getSource('caravan').setData({ type:'FeatureCollection', features: caravan.moving && caravan.pos
    ? [{ type:'Feature', properties:{}, geometry:{ type:'Point', coordinates:caravan.pos } }] : [] });
}
function setCaravanPath(coords){
  if(!caravanReady) return;
  map.getSource('caravan-path').setData({ type:'FeatureCollection', features: coords
    ? [{ type:'Feature', properties:{}, geometry:{ type:'LineString', coordinates:coords } }] : [] });
}

// Envoi: depuis une de vos capitales (onglet Caravane) ou depuis la ville
// ou la caravane se trouve (fenetre du comptoir), puis clic sur la capitale
// de destination.
function startCaravanSend(from){
  if(caravan.moving) return;
  closeCapital();
  caravanSend.active = true; caravanSend.from = from;
  boatHint('Cliquez sur la capitale de destination : un comptoir (rond violet) ou votre capitale (Échap pour annuler).');
}
function cancelCaravanSend(){ caravanSend.active = false; caravanSend.from = null; boatHint(''); }
function caravanTo(city){
  if(!city){ boatHint('Cliquez sur une capitale : un comptoir (rond violet) ou votre capitale (Échap pour annuler).'); return; }
  const from = caravanSend.from;
  if(sameCity(from, city)){ boatHint('La caravane est déjà dans cette ville : choisissez-en une autre.'); return; }
  const route = roadRoute(from.regionId, city.regionId);
  if(!route || route.coords.length < 2){ boatHint('Aucune route terrestre vers cette capitale (autre continent ?).'); return; }
  caravanSend.active = false; caravanSend.from = null;
  const cum = [0];
  for(let i = 1; i < route.coords.length; i++) cum.push(cum[i - 1] + geoDistance(route.coords[i - 1], route.coords[i]));
  const total = cum[cum.length - 1];
  caravan.voyage = { coords:route.coords.map(p => [+p[0].toFixed(4), +p[1].toFixed(4)]), cum:cum.map(v => +v.toFixed(2)), total,
    startedAt:Date.now(), durationMs:Math.max(2000, total / CARAVAN_SPEED_KM_S * 1000), from, dest:city, arrived:false };
  saveCaravan();
  boatHint('Caravane en route vers : ' + cityLabel(city) + ' (' + Math.round(total).toLocaleString('fr-FR') + ' km).');
  runCaravan();
}
function runCaravan(){
  const v = caravan.voyage;
  clearTimeout(caravanPathTimer);
  setCaravanPath(v.coords);
  caravan.moving = true;
  updateCityHighlights();
  const run = ++caravanRun;
  function frame(){
    if(run !== caravanRun || !caravan.moving) return;
    const frac = voyageProgress(v);
    caravan.pos = positionAlong(v, frac);
    renderCaravan();
    if(frac < 1){ requestAnimationFrame(frame); return; }
    finishCaravan();
  }
  requestAnimationFrame(frame);
}
function finishCaravan(){
  const v = caravan.voyage;
  if(!v || v.arrived) return;
  caravan.pos = v.coords[v.coords.length - 1];
  v.arrived = true; caravan.moving = false;
  saveCaravan(); renderCaravan(); updateCityHighlights();
  boatHint('Caravane arrivée : ' + cityLabel(v.dest) + (v.dest.kind === 'npc' ? ' — ouvrez le comptoir (rond violet).' : '.'));
  caravanPathTimer = setTimeout(() => { setCaravanPath(null); boatHint(''); }, 3500);
}
setInterval(() => { if(caravan.moving && caravan.voyage && voyageProgress(caravan.voyage) >= 1) finishCaravan(); }, 1000);

// Contenu rafraichi chaque seconde: remplace seulement s'il a change
// (jamais de bouton recree sous le curseur du joueur).
function setLiveHtml(el, html){ if(el._liveHtml === html) return false; el._liveHtml = html; el.innerHTML = html; return true; }
function voyageCardHtml(icon, label, v){
  const frac = voyageProgress(v), remaining = v.arrived ? 0 : v.startedAt + v.durationMs - Date.now();
  return '<div class="voyage-card">' +
    '<div class="voyage-head"><span class="voyage-dest">' + icon + ' ' + label + '</span>' +
      '<span class="voyage-state ' + (v.arrived ? 'done' : 'go') + '">' + (v.arrived ? 'Arrivé' : 'En route') + '</span></div>' +
    '<div class="voyage-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(frac * 100) + '"><i style="width:' + (frac * 100).toFixed(1) + '%"></i></div>' +
    '<div class="region-row"><span>Temps restant</span><span class="v">' + (v.arrived ? '—' : formatDuration(remaining)) + '</span></div>' +
    '<div class="region-row"><span>' + (v.arrived ? 'Arrivé à' : 'Arrivée prévue à') + '</span><span class="v">' + new Date(v.startedAt + v.durationMs).toLocaleTimeString('fr-FR') + '</span></div>' +
    '<div class="region-row"><span>Distance</span><span class="v">' + Math.round((1 - frac) * v.total).toLocaleString('fr-FR') + ' / ' + Math.round(v.total).toLocaleString('fr-FR') + ' km</span></div>' +
  '</div>';
}

// Onglet CARAVANE de la capitale
function renderCaravanTab(el, regionId){
  const v = caravan.voyage, here = caravanCity();
  let html = '<p class="cap-intro">La caravane voyage par la route, de capitale en capitale. Vitesse de test : ' + CARAVAN_SPEED_KM_S + ' km par seconde.</p>';
  if(caravan.moving) html += voyageCardHtml('🐪', 'Vers : ' + cityLabel(v.dest), v);
  else if(here && !(here.kind === 'own' && here.regionId === regionId))
    html += '<p class="cap-empty">Votre caravane se trouve à : ' + cityLabel(here) + '. Faites-la repartir depuis cette ville.</p>';
  else html += (here ? '<div class="voyage-card"><div class="voyage-head"><span class="voyage-dest">🐪 Votre caravane est dans cette capitale</span><span class="voyage-state done">En ville</span></div></div>' : '') +
    '<button class="select-btn" id="caravan-go-btn" type="button">🐪 ENVOYER UNE CARAVANE</button>' +
    '<p class="cap-empty">Puis cliquez sur la capitale d\'un comptoir (rond violet) sur la carte.</p>';
  if(!setLiveHtml(el, html)) return;
  const go = el.querySelector('#caravan-go-btn');
  if(go) go.addEventListener('click', () => startCaravanSend({ kind:'own', regionId }));
}

// Onglet VOYAGE: bateau + caravane
function renderVoyageTab(el){
  const v = boat.voyage, c = caravan.voyage;
  let html = '<div class="region-section-title">⛵ Bateau</div>';
  if(!boat.pos) html += '<p class="cap-empty">Aucun bateau en mer. Placez-en un depuis le panneau de votre région (section Test bateau).</p>';
  else if(!v) html += '<p class="cap-empty">Votre bateau est au mouillage. Sélectionnez-le sur la carte, puis cliquez sur une destination.</p>';
  else html += voyageCardHtml(v.destPort || v.destOwn ? '⚓' : '🌊', voyageLabel(v), v) +
    (v.arrived && v.destPort ? '<button class="select-btn" id="enter-port-btn" type="button">⚓ ACCÉDER AU PORT DU COMPTOIR</button>' : '') +
    (v.arrived && v.destOwn ? '<button class="select-btn" id="enter-own-port-btn" type="button">⚓ ACCÉDER À VOTRE PORT</button>' : '') +
    (v.arrived && !v.destPort && !v.destOwn ? '<p class="cap-empty">Le bateau est arrivé en mer, loin de tout port.</p>' : '');
  html += '<div class="region-section-title">🐪 Caravane</div>';
  if(!c) html += '<p class="cap-empty">Aucune caravane en route. Envoyez-en une depuis l\'onglet Caravane.</p>';
  else html += voyageCardHtml('🐪', cityLabel(c.dest), c) +
    (c.arrived && c.dest.kind === 'npc' ? '<button class="select-btn" id="enter-city-btn" type="button">🐪 ACCÉDER AU COMPTOIR</button>' : '');
  if(!setLiveHtml(el, html)) return;
  const on = (id, fn) => { const b = el.querySelector('#' + id); if(b) b.addEventListener('click', fn); };
  on('enter-port-btn', () => openNpcPort(v.destPort));
  on('enter-own-port-btn', () => openOwnPort(v.destOwn));
  on('enter-city-btn', () => openNpcPort(c.dest.regionId));
}
