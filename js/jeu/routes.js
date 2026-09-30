// ---------- Reseau de chemins (mondial, adjacence topologique reelle) ----------
// Village = un point garanti sur la terre de la region (turf.pointOnFeature,
// contrairement a un centroide qui peut tomber dans l'eau pour une region
// en croissant ou un archipel).
// Chemins terrestres = adjacence topologique reelle: deux regions ne sont
// reliees que si elles partagent un arc du topojson, donc chaque chemin
// reste sur la terre par construction, relie deux voisins directs (zero
// region intermediaire) et suit le trajet le plus court possible entre
// elles. Les deplacements par la mer (iles comprises) ne passent pas par
// ce reseau: ils sont calcules a la demande par la navigation des bateaux
// (createNavigator, grille data/monde/nav-grid.json).

// Normalise une longitude dans [-180,180]: nos polygones "deroules"
// (Russie/Alaska/Fidji, cf. unwrapGeometry) sortent de cette plage, ce qui
// fausserait un calcul de distance directe entre un point deroule et un
// point normal proche de l'antimeridien.
function normLon(lon){
  let l = lon % 360;
  if(l > 180) l -= 360;
  if(l < -180) l += 360;
  return l;
}
function geoDistance(a, b){
  return turf.distance([normLon(a[0]), a[1]], [normLon(b[0]), b[1]]);
}

// Position de capitale garantie loin de toute frontiere (jamais "a
// cheval" entre deux regions): on essaie plusieurs points candidats
// (centre de masse, centroide, point-sur-feature, plus une grille dans
// l'emprise de la region) et on garde celui dont la distance a la
// frontiere la plus proche est maximale -- une approximation rapide du
// "pole d'inaccessibilite" sans dependance externe.
// Densite de grille et simplification du contour adaptees a la SURFACE
// reelle de la region (turf.area): une grande region (ex. un Etat
// australien) a plus a gagner d'une grille fine, une petite n'en a pas
// besoin: son interieur est deja proche de la frontiere partout. Le
// contour est simplifie avant les mesures de distance (calcul par
// sommets, donc couteux sur un tres long trait de cote) avec une
// tolerance elle aussi liee a la taille de la region -- suffisant pour
// choisir un bon point interieur sans re-suivre chaque micro-detail des
// LIMITES DE FRONTIERE.
function safeInteriorPoint(feature){
  const bounds = turf.bbox(feature);
  const areaKm2 = turf.area(feature) / 1e6;
  const GRID = areaKm2 > 200000 ? 7 : areaKm2 > 20000 ? 6 : areaKm2 > 2000 ? 5 : 4;
  let boundaryLine;
  try{ boundaryLine = turf.polygonToLine(feature); }catch(e){ boundaryLine = null; }
  let lines = boundaryLine ? (boundaryLine.type === 'FeatureCollection' ? boundaryLine.features : [boundaryLine]) : [];
  const tolerance = Math.max(0.01, Math.sqrt(areaKm2) / 4000);
  lines = lines.map(l => { try{ return turf.simplify(l, { tolerance, highQuality:false }); }catch(e){ return l; } });
  function distToBoundary(pt){
    let min = Infinity;
    lines.forEach(l => {
      try{ const d = turf.pointToLineDistance(pt, l, { units:'kilometers' }); if(d < min) min = d; }catch(e){}
    });
    return min === Infinity ? 0 : min;
  }
  const candidates = [];
  const tryAdd = (pt) => { if(pt && turf.booleanPointInPolygon(pt, feature)) candidates.push(pt); };
  try{ tryAdd(turf.centerOfMass(feature).geometry.coordinates); }catch(e){}
  try{ tryAdd(turf.centroid(feature).geometry.coordinates); }catch(e){}
  try{ tryAdd(turf.pointOnFeature(feature).geometry.coordinates); }catch(e){}
  for(let gx = 0; gx < GRID; gx++){
    for(let gy = 0; gy < GRID; gy++){
      const x = bounds[0] + (bounds[2]-bounds[0]) * (gx+0.5)/GRID;
      const y = bounds[1] + (bounds[3]-bounds[1]) * (gy+0.5)/GRID;
      tryAdd([x, y]);
    }
  }
  if(!candidates.length) return turf.pointOnFeature(feature).geometry.coordinates;
  let best = candidates[0], bestD = -1;
  candidates.forEach(c => { const d = distToBoundary(c); if(d > bestD){ bestD = d; best = c; } });
  return best;
}

// ---------- Detection de croisement entre deux tracés (segments) ----------
// Prefiltre par boite englobante (tres bon marche) avant le test complet
// segment-par-segment: la grande majorite des paires de tracés sur une
// carte n'ont meme pas leurs emprises qui se touchent.
function bboxOfCoords(coords){
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  coords.forEach(([x, y]) => {
    if(x < minX) minX = x; if(x > maxX) maxX = x;
    if(y < minY) minY = y; if(y > maxY) maxY = y;
  });
  return [minX, minY, maxX, maxY];
}
function bboxOverlap(a, b){
  return a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
}
function segmentsIntersect(p1, p2, p3, p4){
  function ccw(a, b, c){ return (c[1]-a[1]) * (b[0]-a[0]) > (b[1]-a[1]) * (c[0]-a[0]); }
  return (ccw(p1, p3, p4) !== ccw(p2, p3, p4)) && (ccw(p1, p2, p3) !== ccw(p1, p2, p4));
}
function pathsCross(coordsA, bboxA, coordsB, bboxB){
  if(!bboxOverlap(bboxA, bboxB)) return false;
  for(let i = 0; i < coordsA.length - 1; i++){
    for(let j = 0; j < coordsB.length - 1; j++){
      if(segmentsIntersect(coordsA[i], coordsA[i+1], coordsB[j], coordsB[j+1])) return true;
    }
  }
  return false;
}
function crossesExisting(coords, existingEdges){
  const bb = bboxOfCoords(coords);
  return existingEdges.some(e => pathsCross(coords, bb, e.coords, e.bbox));
}

function windingPath(a, b, amplitudeScale){
  const distKm = geoDistance(a, b);
  const segments = 22;
  const amplitudeDeg = (Math.min(distKm * 0.08, 80) / 111) * amplitudeScale;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1e-9;
  const nx = -dy / len, ny = dx / len; // perpendiculaire unitaire
  // graine deterministe (memes points -> meme ondulation a chaque chargement)
  const seed = Math.abs(Math.sin(a[0] * 12.9898 + a[1] * 78.233 + b[0] * 37.719 + b[1] * 11.135) * 43758.5453) % 1;
  const wiggles = 2 + (seed > 0.5 ? 1 : 0);
  const phase = seed * Math.PI * 2;
  const pts = [];
  for(let i = 0; i <= segments; i++){
    const t = i / segments;
    const bx = a[0] + dx * t, by = a[1] + dy * t;
    // Sinus au carre plutot que simple: vaut 0 ET a une derivee nulle aux
    // deux bouts (pas seulement une position nulle), donc l'ondulation
    // demarre/finit en douceur -- essentiel pour les tracés en deux
    // demi-trajets (capitale -> frontiere -> capitale): sans ca, les deux
    // moities pouvaient se rejoindre avec un coude brusque au point de
    // jonction meme si leurs positions coincidaient exactement.
    const taper = Math.pow(Math.sin(t * Math.PI), 2);
    const wob = Math.sin(t * Math.PI * wiggles + phase) * amplitudeDeg * taper;
    pts.push([bx + nx * wob, by + ny * wob]);
  }
  return pts;
}

// Les routes se tracent sur la terre d'origine des regions (un fleuve se franchit par un
// pont), mais jamais a travers un lac.
let lakeIndex = null;
function inLake(pt){
  if(!lakeIndex) lakeIndex = (waterData ? waterData.lakes : []).map(l => {
    const ring = l.p.length && (l.p[0][0] !== l.p[l.p.length - 1][0] || l.p[0][1] !== l.p[l.p.length - 1][1]) ? [...l.p, l.p[0]] : l.p;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for(const [x, y] of ring){ if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
    return { poly:turf.polygon([ring]), bb:[x0, y0, x1, y1] };
  });
  const x = normLon(pt[0]), y = pt[1];
  return lakeIndex.some(l => x >= l.bb[0] && x <= l.bb[2] && y >= l.bb[1] && y <= l.bb[3] && turf.booleanPointInPolygon([x, y], l.poly));
}
function pathStaysOnLandSingle(coords, land){
  for(let i = 1; i < coords.length - 1; i++){
    if(!turf.booleanPointInPolygon(coords[i], land) || inLake(coords[i])) return false;
  }
  return true;
}
function pathStaysOnLand(coords, landA, landB){
  for(let i = 1; i < coords.length - 1; i++){
    const pt = coords[i];
    if(!turf.booleanPointInPolygon(pt, landA) && !turf.booleanPointInPolygon(pt, landB)) return false;
    if(inLake(pt)) return false;
  }
  return true;
}

// Plusieurs points candidats (15/30/50/70/85%) le long de la plus longue
// frontiere reellement partagee entre les deux regions (calculee via les
// arcs topojson, donc la vraie limite terrestre, pas une approximation):
// le trace passera obligatoirement par un point de CETTE frontiere avant
// de rejoindre chaque capitale, jamais par un raccourci qui coupe a
// travers l'eau ou une troisieme region. Plusieurs points sont testes
// (pas seulement le milieu) car pres d'une baie ou d'un golfe, un point
// median peut faire sortir un des deux segments dans l'eau alors qu'un
// autre point de la meme frontiere reelle passe.
function borderWaypoints(topo, geomI, geomJ){
  let mesh;
  try{
    mesh = topojson.mesh(topo, { type:'GeometryCollection', geometries:[geomI, geomJ] },
      (a, b) => (a === geomI && b === geomJ) || (a === geomJ && b === geomI));
  }catch(e){ return []; }
  const lines = mesh && mesh.coordinates;
  if(!lines || !lines.length) return [];
  let longest = lines[0], longestLen = -1;
  lines.forEach(line => {
    let len = 0;
    for(let i = 1; i < line.length; i++) len += geoDistance(line[i-1], line[i]);
    if(len > longestLen){ longestLen = len; longest = line; }
  });
  function pointAtFraction(frac){
    let acc = 0;
    const target = longestLen * frac;
    for(let i = 1; i < longest.length; i++){
      const seg = geoDistance(longest[i-1], longest[i]);
      if(acc + seg >= target){
        const t = seg === 0 ? 0 : (target - acc) / seg;
        return [
          longest[i-1][0] + (longest[i][0] - longest[i-1][0]) * t,
          longest[i-1][1] + (longest[i][1] - longest[i-1][1]) * t,
        ];
      }
      acc += seg;
    }
    return longest[longest.length - 1];
  }
  return [0.5, 0.3, 0.7, 0.15, 0.85].map(pointAtFraction);
}

// Essaie chaque point de frontiere candidat, et pour chacun toutes les
// amplitudes d'ondulation valides (de la plus sinueuse a la ligne droite)
// sur les deux demi-trajets capitale -> frontiere -> capitale, chaque
// demi-trajet devant rester entierement dans SA propre region.
function allWindingLegs(p1, p2, land){
  const out = [];
  for(const scale of [1, 0.4, 0]){
    const coords = windingPath(p1, p2, scale);
    if(pathStaysOnLandSingle(coords, land)) out.push(coords);
  }
  return out;
}
// Angle de virage (en degres) qu'imposerait un point de frontiere donne:
// cap direct capitale->frontiere compare au cap frontiere->autre capitale.
// Sert a classer les points de frontiere candidats du plus doux au plus
// brusque, pour ne pas choisir arbitrairement le premier valide et se
// retrouver avec un coude prononce alors qu'un point voisin de la meme
// frontiere donnait un virage bien plus naturel.
function bearingDeg(p, q){ return Math.atan2(q[1]-p[1], q[0]-p[0]) * 180 / Math.PI; }
function bearingTurn(a, waypoint, b){
  let diff = bearingDeg(waypoint, b) - bearingDeg(a, waypoint);
  while(diff > 180) diff -= 360;
  while(diff < -180) diff += 360;
  return Math.abs(diff);
}

// Parmi toutes les combinaisons valides (sur terre), prefere celle qui ne
// croise AUCUN trace deja pose (les routes ne doivent pas se croiser);
// si vraiment aucune combinaison ne l'evite (zone tres dense), garde la
// meilleure trouvee plutot que de sacrifier la connexion elle-meme -- ne
// jamais traverser l'eau reste la seule regle strictement non negociable.
// Les points de frontiere sont essayes du virage le plus doux au plus
// brusque (bearingTurn croissant) pour eviter un trace en "coude" alors
// qu'une option plus naturelle existait sur la meme frontiere.
// Repli sur l'ancien trajet direct si aucune frontiere n'a pu etre
// extraite. Si rien ne passe du tout (cas rarissime, ex. les deux regions
// se touchent uniquement au bord d'une baie), renvoie null: on abandonne
// alors cette connexion precise plutot que de tricher.
function landPath(topo, a, b, geomI, geomJ, landA, landB, existingEdges){
  let fallback = null;
  const waypoints = borderWaypoints(topo, geomI, geomJ)
    .slice()
    .sort((w1, w2) => bearingTurn(a, w1, b) - bearingTurn(a, w2, b));
  for(const waypoint of waypoints){
    const legs1 = allWindingLegs(a, waypoint, landA);
    const legs2 = allWindingLegs(waypoint, b, landB);
    for(const leg1 of legs1){
      for(const leg2 of legs2){
        const coords = leg1.concat(leg2.slice(1));
        if(!fallback) fallback = coords;
        if(!crossesExisting(coords, existingEdges)) return coords;
      }
    }
  }
  for(const scale of [1, 0.4, 0]){
    const coords = windingPath(a, b, scale);
    if(pathStaysOnLand(coords, landA, landB)){
      if(!fallback) fallback = coords;
      if(!crossesExisting(coords, existingEdges)) return coords;
    }
  }
  return fallback;
}

function makeUnionFind(n){
  const parent = Array.from({ length:n }, (_, i) => i);
  const size = new Array(n).fill(1);
  function find(x){ while(parent[x] !== x){ parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
  function union(a, b){
    let ra = find(a), rb = find(b);
    if(ra === rb) return false;
    if(size[ra] < size[rb]){ const t = ra; ra = rb; rb = t; }
    parent[rb] = ra; size[ra] += size[rb];
    return true;
  }
  function sizeOf(x){ return size[find(x)]; }
  return { find, union, sizeOf };
}


// Chaque capitale a droit a 4 tracés maximum: on ne considère que les
// paires de voisins directs réels (adjacence topojson, jamais une
// connexion qui saute par-dessus une region), triées de la plus proche a
// la plus lointaine, et on les ajoute une a une tant que les deux
// capitales concernées n'ont pas atteint la limite -- les connexions les
// plus pertinentes (les plus proches) sont donc toujours prioritaires.
const MAX_DEGREE = 4;

// Connexions explicitement retirees (paire de regions par id) meme si ce
// sont de vrais voisins -- le reste du reseau (plafonds adaptatifs, regle
// des 2 frontieres) se reajuste automatiquement autour de cette absence.
// Construit toujours via forbiddenKey (ordre des deux id sans importance)
// pour eviter une erreur de saisie sur l'ordre exact de la cle.
function forbiddenKey(idA, idB){ return idA < idB ? idA + '-' + idB : idB + '-' + idA; }
// (Vide depuis le passage a 500 regions: les anciennes paires ne
// correspondaient plus aux nouvelles frontieres.)
const FORBIDDEN_EDGES = new Set([
]);
// Routes ajoutees a la main entre deux regions, meme de deux reseaux
// (continents) differents: capitale A -> points de passage -> capitale B.
// Chaque point et chaque troncon ont ete verifies sur la terre (pas de mer
// ni de lac; un fleuve se franchit comme sur les autres routes).
const MANUAL_ROADS = [
  // Le Caire (236) -> isthme de Suez -> Sinai -> pointe du golfe d'Aqaba -> Tabouk (243)
  { a:236, b:243, via:[[32.45,30.1],[33.2,30.05],[34.0,29.85],[34.8,29.7],[35.0,29.68],[35.2,29.55],[35.7,29.3],[36.5,29.0]] },
];


function buildRegionNetwork(topo, fc, geometries){
  const n = fc.features.length;
  const villages = fc.features.map(f => {
    const coord = safeInteriorPoint(f);
    return { regionId:f.id, coord, gcoord:[normLon(coord[0]), coord[1]] };
  });

  let neighborIdx;
  try{ neighborIdx = topojson.neighbors(geometries); }
  catch(e){ console.warn('Calcul des voisinages topologiques impossible:', e); neighborIdx = fc.features.map(() => []); }

  const candidates = [];
  for(let i = 0; i < n; i++){
    for(const j of neighborIdx[i]){
      if(j <= i) continue; // chaque paire de voisins une seule fois
      if(FORBIDDEN_EDGES.has(forbiddenKey(fc.features[i].id, fc.features[j].id))) continue;
      candidates.push([i, j, geoDistance(villages[i].coord, villages[j].coord)]);
    }
  }

  // Plafond de connexions par capitale: 4 par defaut (MAX_DEGREE), releve
  // au cas par cas UNIQUEMENT pour les capitales qui en ont reellement
  // besoin pour atteindre chacun de leurs vrais voisins en 2 frontieres
  // maximum (jamais au-dela de LAND_DEGREE_CEILING) -- la plupart des
  // regions restent a 3, seuls les carrefours a nombreux voisins montent.
  const LAND_DEGREE_CEILING = 6;
  const cap = new Array(n).fill(MAX_DEGREE);
  let uf, degree, edges, skippedUnroutable;

  function runLandPass(){
    uf = makeUnionFind(n);
    degree = new Array(n).fill(0);
    edges = [];
    skippedUnroutable = 0;
    // Priorise a chaque etape la paire dont la capitale la MOINS connectee
    // (relativement a SON propre plafond) profiterait le plus, a distance
    // egale la plus courte gagne -- evite qu'une region ayant pourtant
    // plusieurs vrais voisins ne se retrouve avec un seul trace simplement
    // parce que ses voisins ont deja ete pris par des paires plus courtes
    // ailleurs.
    const remaining = candidates.slice();
    while(remaining.length){
      let bestIdx = -1, bestScore = Infinity, bestDist = Infinity;
      for(let k = 0; k < remaining.length; k++){
        const [i, j, d] = remaining[k];
        if(degree[i] >= cap[i] || degree[j] >= cap[j]){ remaining.splice(k, 1); k--; continue; }
        const score = Math.max(degree[i] / cap[i], degree[j] / cap[j]);
        if(score < bestScore || (score === bestScore && d < bestDist)){
          bestScore = score; bestDist = d; bestIdx = k;
        }
      }
      if(bestIdx === -1) break;
      const [i, j] = remaining[bestIdx];
      remaining.splice(bestIdx, 1);
      const coords = landPath(topo, villages[i].coord, villages[j].coord, geometries[i], geometries[j], fc.features[i].land || fc.features[i], fc.features[j].land || fc.features[j], edges);
      if(!coords){ skippedUnroutable++; continue; } // aucun trace valide sans traverser l'eau: on abandonne cette paire plutot que de tricher
      edges.push({ a:i, b:j, coords, bbox:bboxOfCoords(coords), kind:'land' });
      uf.union(i, j);
      degree[i]++; degree[j]++;
    }
  }

  // Chaque paire de vrais voisins doit rester a 2 tracés maximum l'une de
  // l'autre dans le reseau construit; sinon, on augmente le plafond des
  // deux capitales concernees (jamais au-dela du plafond maximal) et on
  // reconstruit -- quelques tours suffisent, la plupart des regions ne
  // sont jamais concernees.
  function findTwoHopViolations(){
    const adj = Array.from({ length:n }, () => []);
    edges.forEach(e => { if(e.kind === 'land'){ adj[e.a].push(e.b); adj[e.b].push(e.a); } });
    const violations = [];
    for(let i = 0; i < n; i++){
      const dist = new Array(n).fill(Infinity);
      dist[i] = 0;
      const queue = [i];
      while(queue.length){
        const cur = queue.shift();
        for(const nx of adj[cur]) if(dist[nx] === Infinity){ dist[nx] = dist[cur] + 1; queue.push(nx); }
      }
      for(const j of neighborIdx[i]){
        if(j <= i) continue;
        if(dist[j] > 2) violations.push([i, j]);
      }
    }
    return violations;
  }

  runLandPass();
  for(let round = 0; round < 15; round++){
    const violations = findTwoHopViolations();
    if(!violations.length) break;
    let raised = false;
    violations.forEach(([i, j]) => {
      [i, j].forEach(node => {
        if(degree[node] >= cap[node] && cap[node] < LAND_DEGREE_CEILING){ cap[node]++; raised = true; }
      });
    });
    if(!raised) break; // plafond maximal atteint partout ou necessaire: on garde le meilleur reseau obtenu
    runLandPass();
  }
  if(skippedUnroutable) console.warn(skippedUnroutable, 'connexion(s) terrestre(s) abandonnee(s): aucun trace ne pouvait eviter l\'eau.');

  return { villages, edges };
}

// filterFns restreint le reseau (villages + chemins) a un ou plusieurs
// sous-ensembles de regions (ex. un pays ou un continent chacun) -- un
// reseau independant est construit pour chaque filtre (l'adjacence
// topojson ne comparant que les geometries de ce sous-ensemble, aucune
// interference entre continents), puis tous les reseaux sont fusionnes
// dans les memes sources/couches de la carte.
function addVillageNetwork(topo, fc, geometries, filterFns){
  const filters = Array.isArray(filterFns) ? filterFns : [filterFns];
  const allEdges = [];
  const allVillages = [];

  filters.forEach(filterFn => {
    const idxList = [];
    fc.features.forEach((f, i) => { if(!filterFn || filterFn(f)) idxList.push(i); });
    if(!idxList.length) return;
    const subFc = { features: idxList.map(i => fc.features[i]) };
    const subGeometries = idxList.map(i => geometries[i]);

    const { villages, edges } = buildRegionNetwork(topo, subFc, subGeometries);
    allEdges.push(...edges);
    allVillages.push(...villages);
    villages.forEach(v => capitalById.set(v.regionId, v.coord));
    edges.forEach(e => { if(e.kind === 'land' && e.b !== null) addRoad(villages[e.a].regionId, villages[e.b].regionId, e.coords); });
  });

  MANUAL_ROADS.forEach(r => {
    const a = capitalById.get(r.a), b = capitalById.get(r.b);
    if(!a || !b){ console.warn('Route manuelle ignoree (capitale absente):', r.a, r.b); return; }
    const coords = [a, ...r.via, b];
    allEdges.push({ kind:'land', coords });
    addRoad(r.a, r.b, coords);
  });

  const pathsFc = {
    type: 'FeatureCollection',
    features: allEdges.map(e => ({
      type: 'Feature', properties: { kind:e.kind },
      geometry: { type: 'LineString', coordinates: e.coords },
    })),
  };
  const villagesFc = {
    type: 'FeatureCollection',
    features: allVillages.map(v => ({
      type: 'Feature', properties: { regionId: v.regionId }, geometry: { type: 'Point', coordinates: v.coord },
    })),
  };

  map.addSource('paths', { type: 'geojson', data: pathsFc });
  map.addLayer({
    id: 'paths', type: 'line', source: 'paths',
    paint: {
      'line-color': '#6b4a2a', 'line-width': 1.4, 'line-opacity': 0.75,
      'line-dasharray': [2, 1.5],
    },
  });

  map.addSource('villages', { type: 'geojson', data: villagesFc });
  map.addLayer({
    id: 'villages-halo', type: 'circle', source: 'villages',
    paint: { 'circle-radius': 5.5, 'circle-color': '#f6efe0', 'circle-opacity': 0.9 },
  });
  map.addLayer({
    id: 'villages', type: 'circle', source: 'villages',
    paint: {
      'circle-radius': 3, 'circle-color': '#4a3418',
      'circle-stroke-color': '#f6efe0', 'circle-stroke-width': 1,
    },
  });
  applyDevFilters();
}
