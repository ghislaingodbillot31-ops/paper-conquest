// ---------- Navigation maritime (bateaux) ----------
// Grille fine (data/monde/nav-grid.json, ~5 km): 0 = terre, 1 = mer.
// Recherche A* sur une grille grossiere (blocs 3x3, ~15 km) pour la vitesse,
// mais chaque pas est verifie sur la grille fine: jamais de terre, d'ile ni de
// presqu'ile traversee. Le trajet obtenu est ensuite
// "tendu" (lignes droites tant qu'elles restent en mer): pas de detour inutile.
function createNavigator(grid){
  const RES = grid.res, LAT_TOP = grid.latTop, W = grid.w, H = grid.h;
  const nav = new Uint8Array(W * H);
  grid.rows.forEach((r, y) => { let x = 0; for(let k = 0; k < r.length; k += 2){ if(r[k]) nav.fill(r[k], y * W + x, y * W + x + r[k+1]); x += r[k+1]; } });
  carveNav(nav, W, H, RES, LAT_TOP, waterData);
  const B = 3, W2 = Math.ceil(W / B), H2 = Math.ceil(H / B), N2 = W2 * H2;
  const coarse = new Uint8Array(N2);
  for(let y = 0; y < H; y++){ const cy = (y / B) | 0; for(let x = 0; x < W; x++){ const v = nav[y * W + x]; if(v){ const c = cy * W2 + ((x / B) | 0); if(v > coarse[c]) coarse[c] = v; } } }
  const cosRow = new Float64Array(H); for(let y = 0; y < H; y++) cosRow[y] = Math.cos((LAT_TOP - (y + 0.5) * RES) * Math.PI / 180);
  const wrapX = x => ((x % W) + W) % W, wrapX2 = x => ((x % W2) + W2) % W2;
  const KM = 111.2;
  function kmCells(a, b){ // distance approchee (km) entre deux cellules fines
    const ya = (a / W) | 0, yb = (b / W) | 0;
    let dx = (a - ya * W) - (b - yb * W); if(dx > W / 2) dx -= W; else if(dx < -W / 2) dx += W;
    return Math.hypot(dx * RES * KM * (cosRow[ya] + cosRow[yb]) / 2, (ya - yb) * RES * KM);
  }
  function cellOf(lon, lat){ const y = Math.floor((LAT_TOP - lat) / RES); if(y < 0 || y >= H) return -1; return y * W + wrapX(Math.floor((lon + 180) / RES)); }
  const lonOf = i => -180 + ((i % W) + 0.5) * RES, latOf = i => LAT_TOP - (((i / W) | 0) + 0.5) * RES;
  // ligne de vue en mer entre deux cellules fines (echantillonnee a 1/2 case)
  function los(a, b){
    const ya = (a / W) | 0, yb = (b / W) | 0, xa = a - ya * W; let dx = (b - yb * W) - xa;
    if(dx > W / 2) dx -= W; else if(dx < -W / 2) dx += W;
    const dy = yb - ya, n = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * 2) + 1;
    for(let s = 0; s <= n; s++){ const x = wrapX(Math.round(xa + dx * s / n)), y = Math.round(ya + dy * s / n); if(!nav[y * W + x]) return false; }
    return true;
  }
  // point representatif d'un bloc: la cellule de mer la plus "au large" du bloc
  const rep = new Int32Array(N2).fill(-2);
  function repOf(c){
    if(rep[c] !== -2) return rep[c];
    const cy = (c / W2) | 0, cx = c - cy * W2; let best = -1, bs = -1;
    for(let y = cy * B; y < Math.min(H, cy * B + B); y++) for(let x = cx * B; x < cx * B + B; x++){
      if(x >= W) continue; const i = y * W + x; if(!nav[i]) continue;
      let s = 0; for(let dy = -1; dy <= 1; dy++) for(let dx = -1; dx <= 1; dx++){ const yy = y + dy; if(yy >= 0 && yy < H && nav[yy * W + wrapX(x + dx)]) s++; }
      if(s > bs){ bs = s; best = i; }
    }
    return rep[c] = best;
  }
  const coarseOf = i => (((i / W) | 0) / B | 0) * W2 + ((((i % W)) / B) | 0);
  // point de mer le plus proche (si le clic tombe sur la terre)
  function snap(lon, lat, maxCells = 60){
    const c0 = cellOf(lon, lat); if(c0 < 0) return -1; if(nav[c0]) return c0;
    const y0 = (c0 / W) | 0, x0 = c0 - y0 * W;
    for(let r = 1; r <= maxCells; r++){ let best = -1, bd = Infinity;
      for(let dy = -r; dy <= r; dy++) for(let dx = -r; dx <= r; dx++){ if(Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const y = y0 + dy; if(y < 0 || y >= H) continue; const i = y * W + wrapX(x0 + dx); if(nav[i]){ const d = kmCells(i, c0); if(d < bd){ bd = d; best = i; } } }
      if(best >= 0) return best; }
    return -1;
  }
  // A* sur les blocs
  const g = new Float64Array(N2), parent = new Int32Array(N2), stamp = new Int32Array(N2), closed = new Int32Array(N2); let run = 0;
  let hI = new Int32Array(1 << 16), hK = new Float64Array(1 << 16), hn = 0;
  const push = (i, k) => { if(hn >= hI.length){ const a = new Int32Array(hI.length * 2); a.set(hI); hI = a; const b = new Float64Array(hK.length * 2); b.set(hK); hK = b; }
    let p = hn++; while(p > 0){ const q = (p - 1) >> 1; if(hK[q] <= k) break; hI[p] = hI[q]; hK[p] = hK[q]; p = q; } hI[p] = i; hK[p] = k; };
  const pop = () => { const ti = hI[0], tk = hK[0], li = hI[--hn], lk = hK[hn]; let p = 0;
    while(true){ let c = 2 * p + 1; if(c >= hn) break; if(c + 1 < hn && hK[c + 1] < hK[c]) c++; if(hK[c] >= lk) break; hI[p] = hI[c]; hK[p] = hK[c]; p = c; }
    hI[p] = li; hK[p] = lk; return [ti, tk]; };
  const H_WEIGHT = 1.25, MAX_EXPAND = 3e6;
  function findPath(from, to){
    const s = snap(from[0], from[1]), t = snap(to[0], to[1]);
    if(s < 0 || t < 0) return null;
    if(los(s, t)) return finish([s, t]);
    run++; hn = 0;
    // departs: blocs voisins dont le point representatif est visible depuis le bateau
    const seeds = [], goals = new Map();
    const around = (i, fn) => { const c = coarseOf(i), cy = (c / W2) | 0, cx = c - cy * W2;
      for(let dy = -1; dy <= 1; dy++) for(let dx = -1; dx <= 1; dx++){ const yy = cy + dy; if(yy < 0 || yy >= H2) continue; const n = yy * W2 + wrapX2(cx + dx); if(coarse[n] && repOf(n) >= 0 && los(i, repOf(n))) fn(n); } };
    around(s, n => seeds.push(n));
    around(t, n => goals.set(n, kmCells(repOf(n), t)));
    if(!seeds.length || !goals.size) return null;
    for(const n of seeds){ stamp[n] = run; g[n] = kmCells(s, repOf(n)); parent[n] = -1; push(n, g[n] + H_WEIGHT * kmCells(repOf(n), t)); }
    let end = -1, exp = 0;
    while(hn){
      const [c, f] = pop(); const rc = repOf(c);
      if(closed[c] === run) continue; closed[c] = run; // chaque bloc n'est traite qu'une fois
      if(goals.has(c)){ end = c; break; }
      if(++exp > MAX_EXPAND) break;
      const cy = (c / W2) | 0, cx = c - cy * W2;
      for(let dy = -1; dy <= 1; dy++){ const yy = cy + dy; if(yy < 0 || yy >= H2) continue;
        for(let dx = -1; dx <= 1; dx++){ if(!dx && !dy) continue; const n = yy * W2 + wrapX2(cx + dx); if(!coarse[n]) continue;
          if(closed[n] === run) continue;
          const rn = repOf(n); if(rn < 0 || !los(rc, rn)) continue;
          const ng = g[c] + kmCells(rc, rn);
          if(stamp[n] !== run || ng < g[n]){ stamp[n] = run; g[n] = ng; parent[n] = c; push(n, ng + H_WEIGHT * kmCells(rn, t)); } } }
    }
    if(end < 0) return null;
    const cells = [t]; for(let c = end; c !== -1; c = parent[c]) cells.push(repOf(c)); cells.push(s);
    return finish(cells.reverse());
  }
  // tend le trajet (plus longues lignes droites en mer), puis coordonnees
  function finish(cells){
    const out = [cells[0]]; let i = 0;
    while(i < cells.length - 1){ let j = i + 1; while(j + 1 < cells.length && los(cells[i], cells[j + 1])) j++; out.push(cells[j]); i = j; }
    const coords = []; let off = 0, prev = null;
    for(const c of out){ let lon = lonOf(c); if(prev !== null){ lon += off; if(lon - prev > 180){ off -= 360; lon -= 360; } else if(lon - prev < -180){ off += 360; lon += 360; } } coords.push([lon, latOf(c)]); prev = lon; }
    let km = 0; for(let k = 1; k < out.length; k++) km += kmCells(out[k-1], out[k]);
    return { coords, km };
  }
  return { findPath, isSea:(lon, lat) => { const c = cellOf(lon, lat); return c >= 0 && nav[c] > 0; }, snap:(lon, lat) => { const c = snap(lon, lat); return c < 0 ? null : [lonOf(c), latOf(c)]; } };
}

// ---------- Bateau: point & click, voyages minutes, comptoirs NPC ----------
// Un bateau (rond) place librement en mer, selectionne d'un clic, puis
// envoye d'un clic sur une destination: un point en mer ou le port d'un
// comptoir NPC. Le chemin maritime le plus court est calcule
// (createNavigator), affiche, puis suivi a vitesse constante. Le voyage est
// sauvegarde (depart + duree): recharger la page reprend le trajet la ou il
// en est. Arrive au port d'un comptoir, le bateau y est "a quai".
const BOAT_STORAGE_KEY = 'paperConquestBoat';
const BOAT_SPEED_KM_S = 60;   // vitesse de test: 60 km par seconde reelle
const boat = { pos:null, selected:false, moving:false, placing:false, voyage:null };
let seaNavigator = null, boatReady = false, boatPathTimer = null, sailRun = 0;
const capitalById = new Map();  // numero de region -> position de sa capitale
let npcPorts = [];              // [{ regionId, pos, bearing, dock }]
try{
  const saved = JSON.parse(localStorage.getItem(BOAT_STORAGE_KEY));
  if(saved && Array.isArray(saved.pos)) boat.pos = saved.pos;
  if(saved && saved.voyage && Array.isArray(saved.voyage.coords)) boat.voyage = saved.voyage;
}catch(e){}
const saveBoat = () => { try{ localStorage.setItem(BOAT_STORAGE_KEY, JSON.stringify({ pos:boat.pos, voyage:boat.voyage })); }catch(e){} };
const normLonLat = ([lon, lat]) => [((lon + 540) % 360) - 180, lat];
// A quai = voyage arrive dans un port (comptoir ou votre port). Le bateau est
// alors range dans le port: son icone disparait de la carte, et il repart
// depuis la fenetre du port (ENVOYER, puis clic sur le port de destination).
const dockedAt = () => { const v = boat.voyage; if(!v || !v.arrived) return null;
  if(v.destPort) return { kind:'npc', regionId:v.destPort }; if(v.destOwn) return { kind:'own', regionId:v.destOwn }; return null; };
const dockedPort = () => { const d = dockedAt(); return d && d.kind === 'npc' ? d.regionId : null; };
const dockedOwn = () => { const d = dockedAt(); return d && d.kind === 'own' ? d.regionId : null; };
const send = { active:false };
const voyageLabel = v => v.destPort ? 'Comptoir de la région ' + v.destPort : (v.destOwn ? 'Votre port (région ' + v.destOwn + ')' : 'Point en mer');

// Surbrillance des ports: un port survole, ou vise par le bateau (en route
// ou a quai), passe dans la couche "-hl": icone agrandie + halo dore.
// (La taille d'une icone ne peut pas dependre de l'etat de survol dans
// MapLibre: on bascule donc le point d'une couche a l'autre par son id.)
const PORT_HL_SIZE = 1.25;
const PORT_HALO_PAINT = { 'circle-radius':19, 'circle-color':'#ffd43b', 'circle-opacity':0.55, 'circle-blur':0.35,
  'circle-stroke-color':'#f08c00', 'circle-stroke-width':1.5, 'circle-stroke-opacity':0.7 };
const portFilter = (ids, highlighted) => ['all', ['==', ['geometry-type'], 'Point'],
  highlighted ? ['in', ['id'], ['literal', ids]] : ['!', ['in', ['id'], ['literal', ids]]]];
const hoveredPort = { npc:null, own:null };
function ownPortId(regionId){ const list = regionBuildings(regionId); const i = list.findIndex(b => b.type === 'port'); return i < 0 ? null : regionId * 100 + i; }
function updatePortHighlights(){
  const v = boat.voyage, npc = new Set(), own = new Set();
  if(hoveredPort.npc !== null) npc.add(hoveredPort.npc);
  if(hoveredPort.own !== null) own.add(hoveredPort.own);
  if(v && v.destPort) npc.add(v.destPort);
  if(v && v.destOwn){ const id = ownPortId(v.destOwn); if(id !== null) own.add(id); }
  const apply = (base, halo, hl, ids) => { if(!map.getLayer(base)) return; map.setFilter(base, portFilter(ids, false)); map.setFilter(halo, portFilter(ids, true)); map.setFilter(hl, portFilter(ids, true)); };
  apply('npc-ports', 'npc-ports-halo', 'npc-ports-hl', [...npc]);
  apply('buildings-icon', 'buildings-halo', 'buildings-icon-hl', [...own]);
}
// port sous le curseur (petite tolerance): { kind:'npc'|'own', id, regionId }
function portAt(point){
  const box = [[point.x - 10, point.y - 10], [point.x + 10, point.y + 10]];
  const layers = ['npc-ports', 'npc-ports-hl', 'buildings-icon', 'buildings-icon-hl'].filter(l => map.getLayer(l));
  const hit = map.queryRenderedFeatures(box, { layers })[0];
  if(!hit) return null;
  return { kind:hit.layer.id.startsWith('npc') ? 'npc' : 'own', id:hit.id, regionId:hit.properties.regionId };
}

function boatHint(text){
  const el = document.getElementById('boat-hint');
  if(!el) return;
  el.textContent = text || '';
  el.hidden = !text;
}
function boatStatusText(){
  if(boat.placing) return 'Cliquez sur la mer pour poser le bateau.';
  if(!boat.pos) return 'Aucun bateau en mer.';
  if(boat.moving) return 'En route vers : ' + voyageLabel(boat.voyage) + '.';
  if(boat.selected) return 'Bateau sélectionné : cliquez sur une destination (un comptoir violet, ou la mer).';
  if(send.active) return 'Choisissez le port de destination sur la carte.';
  if(dockedPort()) return 'À quai au comptoir de la région ' + dockedPort() + ' : ouvrez le comptoir pour l\'envoyer.';
  if(dockedOwn()) return 'À quai dans votre port (région ' + dockedOwn() + ') : ouvrez le port pour l\'envoyer.';
  return 'Cliquez sur le bateau pour le sélectionner.';
}
function renderBoat(){
  const status = document.getElementById('boat-status');
  if(status) status.textContent = boatReady ? boatStatusText() : 'Chargement de la navigation…';
  const btn = document.getElementById('boat-place-btn');
  if(btn){
    btn.disabled = !boatReady || boat.moving;
    btn.textContent = boat.placing ? 'Annuler le placement' : (boat.pos ? 'Replacer le bateau' : 'Placer le bateau');
  }
  if(!boatReady) return;
  map.getSource('boat').setData({ type:'FeatureCollection', features: boat.pos && !dockedAt()
    ? [{ type:'Feature', properties:{ selected:boat.selected }, geometry:{ type:'Point', coordinates:boat.pos } }] : [] });
}
function setBoatPath(coords){
  if(!boatReady) return;
  map.getSource('boat-path').setData({ type:'FeatureCollection', features: coords
    ? [{ type:'Feature', properties:{}, geometry:{ type:'LineString', coordinates:coords } }] : [] });
}

function initBoat(navGrid){
  if(!navGrid){ console.warn('Bateau indisponible: pas de grille de navigation.'); return; }
  seaNavigator = createNavigator(navGrid);
  map.addSource('boat-path', { type:'geojson', data:{ type:'FeatureCollection', features:[] } });
  map.addLayer({ id:'boat-path', type:'line', source:'boat-path',
    layout:{ 'line-cap':'round', 'line-join':'round' },
    paint:{ 'line-color':'#e8590c', 'line-width':3, 'line-dasharray':[1.5, 1.2], 'line-opacity':0.95 } });
  initNpcPorts();
  map.addSource('boat', { type:'geojson', data:{ type:'FeatureCollection', features:[] } });
  map.addLayer({ id:'boat-halo', type:'circle', source:'boat',
    paint:{ 'circle-radius':['case', ['get', 'selected'], 17, 12], 'circle-color':'#ffd43b',
      'circle-opacity':['case', ['get', 'selected'], 0.6, 0] } });
  map.addLayer({ id:'boat', type:'circle', source:'boat',
    paint:{ 'circle-radius':8, 'circle-color':'#e8590c', 'circle-stroke-color':'#ffffff', 'circle-stroke-width':2.5 } });
  boatReady = true;
  renderBoat();
  if(boat.voyage && !boat.voyage.arrived) runVoyage(); // reprise d'un voyage en cours

  map.on('mouseenter', 'boat', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'boat', () => { map.getCanvas().style.cursor = ''; });
  map.on('mousemove', (e) => {
    if(placement.active) return;
    const p = portAt(e.point);
    const npc = p && p.kind === 'npc' ? p.id : null, own = p && p.kind === 'own' ? p.id : null;
    if(npc !== hoveredPort.npc || own !== hoveredPort.own){
      hoveredPort.npc = npc; hoveredPort.own = own;
      updatePortHighlights();
      map.getCanvas().style.cursor = p ? 'pointer' : '';
    }
  });
  map.on('click', (e) => {
    if(!ownedRegions.size || placement.active || caravanSend.active) return; // le jeu commence une fois une region achetee
    const [lon, lat] = normLonLat([e.lngLat.lng, e.lngLat.lat]);
    if(boat.placing){
      const p = seaNavigator.snap(lon, lat, 20);
      if(!p){ boatHint('Ce point est sur la terre : cliquez sur la mer.'); return; }
      boat.pos = p; boat.placing = false; boat.selected = false; boat.voyage = null;
      saveBoat(); boatHint(''); renderBoat();
      return;
    }
    const box = [[e.point.x - 10, e.point.y - 10], [e.point.x + 10, e.point.y + 10]];
    const hitPort = portAt(e.point);
    if(send.active){ sendTo(hitPort); return; }
    const port = hitPort && hitPort.kind === 'npc' ? npcPorts.find(p => p.regionId === hitPort.regionId) : null;
    const ownPort = hitPort && hitPort.kind === 'own' ? regionBuildings(hitPort.regionId).find(b => b.type === 'port') : null;
    if(ownPort && !boat.selected){ openOwnPort(hitPort.regionId); return; }
    if(boat.moving || !boat.pos){
      if(port && !boat.selected) boatHint('Comptoir de la région ' + port.regionId + ' : envoyez-y un bateau pour y accéder.');
      return;
    }
    const onBoat = map.queryRenderedFeatures(box, { layers:['boat'] }).length > 0;
    if(onBoat && !port && !ownPort){
      boat.selected = !boat.selected;
      boatHint(boat.selected ? 'Choisissez une destination : un comptoir violet, votre port, ou la mer.' : '');
      renderBoat();
      return;
    }
    if(!boat.selected){
      if(port){
        if(dockedPort() === port.regionId) openNpcPort(port.regionId);
        else boatHint('Comptoir de la région ' + port.regionId + ' : envoyez-y un bateau pour y accéder.');
      }
      return;
    }
    // quai de votre port: juste devant lui, cote mer
    const ownDock = ownPort ? ownPortDock(hitPort.regionId) : null;
    const target = port ? port.dock : (ownDock || [lon, lat]);
    const path = seaNavigator.findPath(boat.pos, target);
    if(!path){ boatHint('Aucun chemin maritime vers ce point.'); return; }
    startVoyage(path, port ? port.regionId : null, ownDock ? hitPort.regionId : null);
  });
}

// Un port n'est valable que si un bateau peut en sortir vers le large
// (pas une baie refermee par la precision de la cote): chemin maritime
// vers un point en mer a 150 ou 300 km dans l'axe du port.
function reachesOpenSea(dock, pos, bearing){
  for(const d of [150, 300, 500]){
    const q = normLonLat(offsetKm(pos, bearing, d));
    if(seaNavigator.isSea(...q) && seaNavigator.findPath(dock, q)) return true;
  }
  return false;
}
// Port fluvial d'une region: point navigable (lit de 5 km ou plus) d'un
// fleuve qui la traverse, le plus proche de sa capitale.
function riverPortFor(regionId){
  if(!waterData || !seaNavigator) return null;
  const land = topojson.feature(regionTopo, regionGeoms[regionId - 1]);
  const cap = capitalById.get(regionId) || turf.centroid(land).geometry.coordinates;
  let best = null, bd = Infinity;
  waterData.rivers.filter(r => (r.r || []).includes(regionId)).forEach(r => r.c.forEach((pt, k) => {
    if(r.w[k] < 5 || !turf.booleanPointInPolygon(pt, land)) return;
    const d = geoDistance(pt, cap); if(d < bd){ bd = d; best = pt; } }));
  if(!best) return null;
  const dock = seaNavigator.snap(...normLonLat(best), 6);
  return dock ? { regionId, pos:best, bearing:null, dock, river:true } : null;
}
// Ports des comptoirs NPC: sur le littoral de chaque region NPC, au point de
// cote le plus proche de sa capitale qui soit bien tourne vers la mer.
function initNpcPorts(){
  npcPorts = [];
  regionsFc.features.filter(f => f.properties.isNpc).forEach(f => {
    const coast = coastOf(f.id); if(!coast) return;
    const cap = capitalById.get(f.id) || turf.centroid(f).geometry.coordinates;
    const pts = [];
    coast.lines.geometry.coordinates.forEach(line => {
      for(let i = 0; i < line.length - 1; i++){
        const a = line[i], b = line[i + 1], n = Math.max(1, Math.ceil(geoDistance(a, b) / 8));
        for(let s = 0; s < n; s++) pts.push([a[0] + (b[0] - a[0]) * s / n, a[1] + (b[1] - a[1]) * s / n]);
      }
    });
    pts.sort((p, q) => geoDistance(p, cap) - geoDistance(q, cap));
    for(const p of pts.slice(0, 400)){
      const probe = probeCoast(p, f);
      if(probe.sea >= 4 && probe.land >= 4){
        const dock = seaNavigator.snap(...normLonLat(offsetKm(p, probe.bearing, 6)), 20);
        if(dock && reachesOpenSea(dock, p, probe.bearing)){ npcPorts.push({ regionId:f.id, pos:p, bearing:Math.round(probe.bearing), dock }); break; }
      }
    }
  });
  // comptoirs sans port cotier: port sur le fleuve navigable qui les
  // traverse, au point du fleuve le plus proche de la capitale
  regionsFc.features.filter(f => f.properties.isNpc && !npcPorts.some(q => q.regionId === f.id)).forEach(f => {
    const port = riverPortFor(f.id); if(port) npcPorts.push(port);
  });
  map.addImage('npc-port-icon', drawPortIcon('#6b3fa0'), { pixelRatio:2 });
  const feats = [];
  npcPorts.forEach(p => {
    if(p.bearing !== null) feats.push({ type:'Feature', properties:{ regionId:p.regionId }, geometry:{ type:'LineString', coordinates:[p.pos, offsetKm(p.pos, p.bearing, 30)] } });
    feats.push({ type:'Feature', id:p.regionId, properties:{ regionId:p.regionId, label:'Comptoir ' + p.regionId }, geometry:{ type:'Point', coordinates:p.pos } });
  });
  map.addSource('npc-ports', { type:'geojson', data:{ type:'FeatureCollection', features:feats } });
  map.addLayer({ id:'npc-ports-dir', type:'line', source:'npc-ports', filter:['==', ['geometry-type'], 'LineString'],
    paint:{ 'line-color':'#6b3fa0', 'line-width':2.5 } });
  const npcLayout = size => ({ 'icon-image':'npc-port-icon', 'icon-size':size, 'icon-allow-overlap':true, 'icon-ignore-placement':true,
    'text-field':['get', 'label'], 'text-font':['Open Sans Regular'], 'text-size':11, 'text-offset':[0, 1.6 * size], 'text-anchor':'top', 'text-optional':true });
  const npcPaint = { 'text-color':'#4a2b73', 'text-halo-color':'#f6efe0', 'text-halo-width':1.4 };
  map.addLayer({ id:'npc-ports', type:'symbol', source:'npc-ports', filter:portFilter([], false), layout:npcLayout(1), paint:npcPaint });
  map.addLayer({ id:'npc-ports-halo', type:'circle', source:'npc-ports', filter:portFilter([], true), paint:PORT_HALO_PAINT });
  map.addLayer({ id:'npc-ports-hl', type:'symbol', source:'npc-ports', filter:portFilter([], true), layout:npcLayout(PORT_HL_SIZE), paint:npcPaint });
}

// Voyage: trajet densifie + distances cumulees, depart et duree en temps reel.
function startVoyage(path, destPort, destOwn = null){
  const pts = [];
  path.coords.forEach((p, i) => {
    if(i === 0){ pts.push(p); return; }
    const a = path.coords[i - 1], n = Math.max(1, Math.ceil(Math.hypot(p[0] - a[0], p[1] - a[1]) / 0.25));
    for(let s = 1; s <= n; s++) pts.push([a[0] + (p[0] - a[0]) * s / n, a[1] + (p[1] - a[1]) * s / n]);
  });
  const cum = [0];
  for(let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + geoDistance(pts[i - 1], pts[i]));
  const total = cum[cum.length - 1];
  boat.voyage = { coords:pts.map(p => [+p[0].toFixed(4), +p[1].toFixed(4)]), cum:cum.map(v => +v.toFixed(2)), total,
    startedAt:Date.now(), durationMs:Math.max(2000, total / BOAT_SPEED_KM_S * 1000), destPort, destOwn, arrived:false };
  boat.selected = false;
  saveBoat();
  boatHint('Départ vers : ' + voyageLabel(boat.voyage) + ' (' + Math.round(total).toLocaleString('fr-FR') + ' km).');
  runVoyage();
}
function voyageProgress(v, now = Date.now()){ return Math.min(1, (now - v.startedAt) / v.durationMs); }
function positionAlong(v, frac){
  const d = frac * v.total, cum = v.cum, pts = v.coords;
  let k = 1; while(k < cum.length - 1 && cum[k] < d) k++;
  const f = cum[k] > cum[k - 1] ? (d - cum[k - 1]) / (cum[k] - cum[k - 1]) : 1;
  const a = pts[k - 1], b = pts[k];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}
// Suit exactement le trajet affiche, d'apres l'heure reelle (reprise possible).
function runVoyage(){
  const v = boat.voyage;
  clearTimeout(boatPathTimer);
  setBoatPath(v.coords);
  boat.moving = true; renderBoat();
  const run = ++sailRun;
  updatePortHighlights();
  function frame(){
    if(run !== sailRun || !boat.moving) return; // voyage annule ou deja termine
    const frac = voyageProgress(v);
    boat.pos = positionAlong(v, frac);
    renderBoat();
    if(frac < 1){ requestAnimationFrame(frame); return; }
    finishVoyage();
  }
  requestAnimationFrame(frame);
}
// Arrivee: declenchee par l'animation, ou par la verification chaque seconde
// ci-dessous (onglet en arriere-plan: le navigateur suspend l'animation,
// mais le voyage doit quand meme se terminer a l'heure).
function finishVoyage(){
  const v = boat.voyage;
  if(!v || v.arrived) return;
  boat.pos = normLonLat(v.coords[v.coords.length - 1]);
  v.arrived = true; boat.moving = false;
  saveBoat(); renderBoat(); updatePortHighlights();
  boatHint(v.destPort ? 'Arrivé au comptoir de la région ' + v.destPort + ' : ouvrez le comptoir ou l\'onglet Voyage de votre capitale.' : (v.destOwn ? 'Arrivé à votre port (région ' + v.destOwn + ').' : 'Arrivé à destination.'));
  boatPathTimer = setTimeout(() => { setBoatPath(null); boatHint(''); }, 3500);
  if(selectedId !== null) renderRegionPanel();
}
setInterval(() => { if(boat.moving && boat.voyage && voyageProgress(boat.voyage) >= 1) finishVoyage(); }, 1000);
function toggleBoatPlacing(){
  if(boat.moving || !boatReady) return;
  boat.placing = !boat.placing; boat.selected = false; send.active = false;
  boatHint(boat.placing ? 'Cliquez sur la mer pour poser le bateau.' : '');
  renderBoat();
}

// Onglet VOYAGE de la capitale: destination, progression, temps restant,
// arrivee; a quai dans un comptoir, acces a la fenetre du port.
function formatDuration(ms){
  const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return (h ? h + ' h ' : '') + (h || m ? m + ' min ' : '') + r + ' s';
}
// Fenetre du port d'un comptoir NPC (accessible uniquement a quai).
const NPC_PORT_TABS = [
  { id:'comptoir', label:'Comptoir', render:(el, regionId) => {
    const boatHere = dockedPort() === regionId, carHere = sameCity(caravanCity(), { kind:'npc', regionId });
    const card = (t, s) => '<div class="voyage-card"><div class="voyage-head"><span class="voyage-dest">' + t + '</span><span class="voyage-state done">' + s + '</span></div></div>';
    el.innerHTML =
      '<p class="cap-intro">Comptoir de commerce indépendant de la région ' + regionId + '.</p>' +
      '<div class="region-section-title">Services du comptoir</div>' +
      '<ul class="built-list"><li>Commerce de marchandises — bientôt disponible</li><li>Ravitaillement — bientôt disponible</li></ul>' +
      (boatHere ? '<div class="region-section-title">Votre bateau</div>' + card('⚓ À quai au port du comptoir', 'À quai') + SEND_HTML : '') +
      (carHere ? '<div class="region-section-title">Votre caravane</div>' + card('🐪 En ville, au marché du comptoir', 'En ville') +
        '<button class="select-btn" id="caravan-send-btn" type="button">🐪 ENVOYER LA CARAVANE</button>' +
        '<p class="cap-empty">Puis cliquez sur la capitale de destination sur la carte.</p>' : '');
    sendButton(el);
    const cb = el.querySelector('#caravan-send-btn');
    if(cb) cb.addEventListener('click', () => startCaravanSend({ kind:'npc', regionId }));
  } },
];
// quai de votre port: juste devant lui, cote mer
function ownPortDock(regionId){
  const p = regionBuildings(regionId).find(b => b.type === 'port');
  return p ? seaNavigator.snap(...normLonLat(offsetKm(p.pos, p.bearing || 0, 6)), 20) : null;
}
// ENVOYER: la fenetre se ferme, le joueur clique le port de destination.
function startSend(){
  if(!dockedAt()) return;
  closeCapital();
  send.active = true;
  boatHint('Cliquez sur le port de destination : un comptoir violet ou votre port (Échap pour annuler).');
  renderBoat();
}
function cancelSend(){ send.active = false; boatHint(''); renderBoat(); }
function sendTo(hit){
  if(!hit){ boatHint('Cliquez sur un port : un comptoir violet ou votre port (Échap pour annuler).'); return; }
  const from = dockedAt();
  if(from && from.kind === hit.kind && from.regionId === hit.regionId){ boatHint('Le bateau est déjà dans ce port : choisissez-en un autre.'); return; }
  const target = hit.kind === 'npc' ? npcPorts.find(p => p.regionId === hit.regionId).dock : ownPortDock(hit.regionId);
  const path = target && seaNavigator.findPath(boat.pos, target);
  if(!path){ boatHint('Aucun chemin maritime vers ce port.'); return; }
  send.active = false;
  startVoyage(path, hit.kind === 'npc' ? hit.regionId : null, hit.kind === 'own' ? hit.regionId : null);
}
function sendButton(el){
  const b = el.querySelector('#send-btn');
  if(b) b.addEventListener('click', startSend);
}
const SEND_HTML = '<button class="select-btn" id="send-btn" type="button">⛵ ENVOYER</button>' +
  '<p class="cap-empty">Puis cliquez sur le port de destination sur la carte.</p>';

// Fenetre de votre port: bateau a quai (ENVOYER) ou comment l'y faire venir.
const OWN_PORT_TABS = [
  { id:'port', label:'Port', render:(el, regionId) => {
    const here = dockedOwn() === regionId;
    el.innerHTML =
      '<p class="cap-intro">Votre port, sur le littoral de la région ' + regionId + '.</p>' +
      (here
        ? '<div class="voyage-card"><div class="voyage-head"><span class="voyage-dest">⚓ Votre bateau est à quai</span><span class="voyage-state done">À quai</span></div></div>' + SEND_HTML
        : '<p class="cap-empty">Aucun bateau à quai. Sélectionnez votre bateau en mer, puis cliquez sur ce port pour l\'y faire venir.</p>');
    sendButton(el);
  } },
];
function openOwnPort(regionId){
  if(!ownedRegions.has(regionId)) return;
  openWindow({ kind:'own-port', title:'Port — Région ' + regionId, tabs:OWN_PORT_TABS, ctx:regionId, tab:'port' });
}
function openNpcPort(regionId){
  if(dockedPort() !== regionId && !sameCity(caravanCity(), { kind:'npc', regionId })){ boatHint('Votre bateau ou votre caravane doit être dans ce comptoir.'); return; }
  openWindow({ kind:'npc-port', title:'Comptoir — Région ' + regionId, tabs:NPC_PORT_TABS, ctx:regionId, tab:'comptoir' });
}
