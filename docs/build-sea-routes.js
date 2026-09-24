// Routes maritimes mondiales, precalculees sur TOUTES les terres a la fois.
//  - en mer ouverte: ligne a D km de la cote la plus proche (quelle qu'elle soit);
//  - passage plus etroit que 2*D: ligne au milieu du passage (axe median);
//  - passage plus etroit que 2*CMIN: pas de route (canaux, detroits minuscules);
//  - culs-de-sac (baies, fjords) supprimes; groupes isoles (iles lointaines)
//    relies au reste par le trajet en mer le plus court et le plus degage.
// Usage: node sealanes.js <admin1.topojson> <sea-routes.json>
const fs = require('fs');
const topojson = require('topojson-client');

const [SRC, DST] = process.argv.slice(2);
const D = 100;          // distance visee a la cote (km)
const CMIN = 5;         // demi-largeur minimale d'un passage navigable (km)
const RES = 0.05;       // taille de maille (degres)
const LAT_TOP = 90, LAT_BOT = -70;
const W = Math.round(360 / RES), H = Math.round((LAT_TOP - LAT_BOT) / RES), N = W * H;
const KM = 111.2;
const t0 = Date.now(); const log = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', ...a);

const topo = JSON.parse(fs.readFileSync(SRC));
const fc = topojson.feature(topo, topo.objects[Object.keys(topo.objects)[0]]);

const lonOf = x => -180 + (x + 0.5) * RES, latOf = y => LAT_TOP - (y + 0.5) * RES;
const cosRow = new Float64Array(H); for(let y = 0; y < H; y++) cosRow[y] = Math.cos(latOf(y) * Math.PI / 180);
const wrapX = x => ((x % W) + W) % W;

// ---------- 1. Raster des terres (remplissage par balayage, pair-impair) ----------
const land = new Uint8Array(N);
function unwrap(ring){
  const out = [[ring[0][0], ring[0][1]]]; let off = 0;
  for(let i = 1; i < ring.length; i++){ const d = ring[i][0] - ring[i-1][0]; if(d > 180) off -= 360; else if(d < -180) off += 360; out.push([ring[i][0] + off, ring[i][1]]); }
  return out;
}
function fillPolygon(rings){
  const rows = new Map();
  for(const raw of rings){
    const r = unwrap(raw);
    for(let i = 0; i < r.length - 1; i++){
      const [x1, y1] = r[i], [x2, y2] = r[i+1];
      if(y1 === y2) continue;
      const lo = Math.min(y1, y2), hi = Math.max(y1, y2);
      const yStart = Math.max(0, Math.ceil((LAT_TOP - hi) / RES - 0.5)), yEnd = Math.min(H - 1, Math.floor((LAT_TOP - lo) / RES - 0.5));
      for(let y = yStart; y <= yEnd; y++){
        const lat = latOf(y); if(lat < lo || lat >= hi) continue;
        const x = x1 + (lat - y1) * (x2 - x1) / (y2 - y1);
        if(!rows.has(y)) rows.set(y, []); rows.get(y).push(x);
      }
    }
  }
  for(const [y, xs] of rows){
    xs.sort((a, b) => a - b);
    for(let k = 0; k + 1 < xs.length; k += 2){
      const c0 = Math.ceil((xs[k] + 180) / RES - 0.5), c1 = Math.floor((xs[k+1] + 180) / RES - 0.5);
      for(let c = c0; c <= c1; c++) land[y * W + wrapX(c)] = 1;
    }
  }
}
fc.features.forEach(f => { const g = f.geometry; (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).forEach(fillPolygon); });
{ let s = 0; for(let i = 0; i < N; i++) s += land[i]; log("raster terres ok", s, "cellules"); }

// ---------- 2. Distance a la terre la plus proche (propagation du point source) ----------
const dist = new Float32Array(N).fill(Infinity), src = new Int32Array(N).fill(-1);
const DMAX = D * 3, BUCKET = 0.5, NB = Math.ceil(DMAX / BUCKET) + 2;
const done = new Float32Array(N).fill(-1);
const buckets = Array.from({ length:NB }, () => []);
function kmBetween(a, b){
  const ya = (a / W) | 0, yb = (b / W) | 0;
  let dx = (a - ya * W) - (b - yb * W); if(dx > W / 2) dx -= W; else if(dx < -W / 2) dx += W;
  const c = (cosRow[ya] + cosRow[yb]) / 2;
  return Math.hypot(dx * RES * KM * c, (ya - yb) * RES * KM);
}
const NB16 = [];
for(let dy = -2; dy <= 2; dy++) for(let dx = -2; dx <= 2; dx++){
  if(!dx && !dy) continue; if(Math.abs(dx) === 2 && Math.abs(dy) === 2) continue; if((Math.abs(dx) === 2 && dy === 0) || (Math.abs(dy) === 2 && dx === 0)) continue;
  NB16.push([dx, dy]);
}
for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){
  const i = y * W + x; if(!land[i]) continue;
  dist[i] = 0; src[i] = i;
  const coast = (!land[y * W + wrapX(x-1)]) || (!land[y * W + wrapX(x+1)]) || (y > 0 && !land[i - W]) || (y < H - 1 && !land[i + W]);
  if(coast) buckets[0].push(i);
}
for(let b = 0; b < NB; b++){
  const q = buckets[b];
  for(let k = 0; k < q.length; k++){
    const c = q[k]; const cy = (c / W) | 0, cx = c - cy * W, s = src[c];
    if(done[c] === dist[c]) continue; done[c] = dist[c];
    for(const [dx, dy] of NB16){
      const ny = cy + dy; if(ny < 0 || ny >= H) continue;
      const n = ny * W + wrapX(cx + dx); if(land[n]) continue;
      const d = kmBetween(n, s);
      if(d < dist[n] && d <= DMAX){ dist[n] = d; src[n] = s; buckets[Math.max(b, Math.floor(d / BUCKET))].push(n); }
    }
  }
  buckets[b] = null;
}
for(let i = 0; i < N; i++) if(dist[i] === Infinity) dist[i] = DMAX + 1;
log('champ de distance ok');

// ---------- 3. Masque des voies: bande a D km + axe median des passages etroits ----------
const lane = new Uint8Array(N);
const n4 = (i, f) => { const y = (i / W) | 0, x = i - y * W; f(y * W + wrapX(x-1)); f(y * W + wrapX(x+1)); if(y > 0) f(i - W); if(y < H - 1) f(i + W); };
const cellKm = y => Math.max(RES * KM * cosRow[y], 0.5);
for(let i = 0; i < N; i++){
  if(land[i]) continue; const d = dist[i];
  if(d >= D){ let edge = false; n4(i, n => { if(dist[n] < D) edge = true; }); if(edge) lane[i] = 1; continue; }
  if(d < CMIN) continue;
  // Axe median: deux cellules voisines dont les cotes les plus proches sont
  // eloignees l'une de l'autre = on est entre deux rives distinctes.
  let ridge = false;
  n4(i, n => { if(!ridge && !land[n] && src[n] !== src[i] && kmBetween(src[n], src[i]) > Math.max(1.3 * d, 4 * RES * KM)) ridge = true; });
  if(ridge) lane[i] = 1;
}
log('masque ok');

// ---------- 4. Amincissement (Zhang-Suen) ----------
function nbrs8(i){
  const y = (i / W) | 0, x = i - y * W, g = (dx, dy) => { const yy = y + dy; return (yy < 0 || yy >= H) ? 0 : lane[yy * W + wrapX(x + dx)]; };
  return [g(0,-1), g(1,-1), g(1,0), g(1,1), g(0,1), g(-1,1), g(-1,0), g(-1,-1)];
}
let cand = []; for(let i = 0; i < N; i++) if(lane[i]) cand.push(i);
for(let changed = true; changed;){
  changed = false;
  for(const step of [0, 1]){
    const del = [];
    for(const i of cand){
      if(!lane[i]) continue;
      const p = nbrs8(i), B = p.reduce((a, b) => a + b, 0); if(B < 2 || B > 6) continue;
      let A = 0; for(let k = 0; k < 8; k++) if(!p[k] && p[(k + 1) % 8]) A++; if(A !== 1) continue;
      if(step === 0){ if(p[0] * p[2] * p[4] || p[2] * p[4] * p[6]) continue; }
      else { if(p[0] * p[2] * p[6] || p[0] * p[4] * p[6]) continue; }
      del.push(i);
    }
    del.forEach(i => { lane[i] = 0; }); if(del.length) changed = true;
  }
  cand = cand.filter(i => lane[i]);
}
log('squelette ok', cand.length, 'pixels');

// ---------- 5. Suppression des culs-de-sac (elagage iteratif des extremites) ----------
const deg8 = i => nbrs8(i).reduce((a, b) => a + b, 0);
function prune(){
  let q = cand.filter(i => lane[i] && deg8(i) <= 1);
  while(q.length){
    const next = [];
    for(const i of q){ if(!lane[i] || deg8(i) > 1) continue; lane[i] = 0;
      const y = (i / W) | 0, x = i - y * W;
      for(let dy = -1; dy <= 1; dy++) for(let dx = -1; dx <= 1; dx++){ const yy = y + dy; if((dx || dy) && yy >= 0 && yy < H){ const n = yy * W + wrapX(x + dx); if(lane[n] && deg8(n) <= 1) next.push(n); } }
    }
    q = next;
  }
  cand = cand.filter(i => lane[i]);
}
prune();
log('elagage ok', cand.length, 'pixels');

// ---------- 6. Composantes + ponts entre groupes isoles ----------
const comp = new Int32Array(N).fill(-1); let nComp = 0; const compSize = [];
for(const s of cand){
  if(comp[s] >= 0) continue; const st = [s]; comp[s] = nComp; let sz = 0;
  while(st.length){ const i = st.pop(); sz++; const y = (i / W) | 0, x = i - y * W;
    for(let dy = -1; dy <= 1; dy++) for(let dx = -1; dx <= 1; dx++){ const yy = y + dy; if(yy < 0 || yy >= H) continue; const n = yy * W + wrapX(x + dx); if(lane[n] && comp[n] < 0){ comp[n] = nComp; st.push(n); } } }
  compSize.push(sz); nComp++;
}
log('composantes', nComp);

// Dijkstra multi-sources etiquete (tas binaire), cout majore pres des cotes
const g = new Float32Array(N).fill(Infinity), lbl = new Int32Array(N).fill(-1), pred = new Int32Array(N).fill(-1);
const BRIDGE_MAX = 2500;
let heapI = new Int32Array(1 << 20), heapK = new Float32Array(1 << 20), hn = 0;
function hpush(i, k){
  if(hn >= heapI.length){ const a = new Int32Array(heapI.length * 2); a.set(heapI); heapI = a; const b = new Float32Array(heapK.length * 2); b.set(heapK); heapK = b; }
  let p = hn++; while(p > 0){ const q = (p - 1) >> 1; if(heapK[q] <= k) break; heapI[p] = heapI[q]; heapK[p] = heapK[q]; p = q; } heapI[p] = i; heapK[p] = k;
}
function hpop(){
  const top = heapI[0], tk = heapK[0]; const li = heapI[--hn], lk = heapK[hn]; let p = 0;
  while(true){ let c = 2 * p + 1; if(c >= hn) break; if(c + 1 < hn && heapK[c + 1] < heapK[c]) c++; if(heapK[c] >= lk) break; heapI[p] = heapI[c]; heapK[p] = heapK[c]; p = c; }
  heapI[p] = li; heapK[p] = lk; return [top, tk];
}
for(const i of cand){ g[i] = 0; lbl[i] = comp[i]; hpush(i, 0); }
const best = new Map();
while(hn){
  const [c, k] = hpop(); if(k > g[c]) continue; if(k > BRIDGE_MAX) break;
  const y = (c / W) | 0, x = c - y * W;
  for(let dy = -1; dy <= 1; dy++) for(let dx = -1; dx <= 1; dx++){
    if(!dx && !dy) continue; const yy = y + dy; if(yy < 0 || yy >= H) continue;
    const n = yy * W + wrapX(x + dx); if(land[n] || dist[n] < CMIN) continue;
    const step = Math.hypot(dx * cellKm(y), dy * RES * KM) * (1 + 3 * Math.max(0, (D - dist[n]) / D));
    if(lbl[n] >= 0 && lbl[n] !== lbl[c]){
      const a = Math.min(lbl[n], lbl[c]), b = Math.max(lbl[n], lbl[c]), key = a * 100000 + b, cost = g[c] + step + g[n];
      const e = best.get(key); if(!e || cost < e.cost) best.set(key, { a, b, cost, c, n });
    }
    const nk = k + step; if(nk < g[n]){ g[n] = nk; lbl[n] = lbl[c]; pred[n] = c; hpush(n, nk); }
  }
}
const parent = Array.from({ length:nComp }, (_, i) => i);
const find = x => { while(parent[x] !== x){ parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
const bridgeCells = [];
[...best.values()].sort((p, q) => p.cost - q.cost).forEach(e => {
  if(find(e.a) === find(e.b)) return; parent[find(e.a)] = find(e.b);
  const path = []; for(let i = e.c; i >= 0 && g[i] > 0; i = pred[i]) path.push(i);
  for(let i = e.n; i >= 0 && g[i] > 0; i = pred[i]) path.push(i);
  bridgeCells.push(...path);
});
const mainComp = compSize.indexOf(Math.max(...compSize));
const keep = new Uint8Array(N);
for(const i of cand) if(find(comp[i]) === find(mainComp)) keep[i] = 1;
bridgeCells.forEach(i => { keep[i] = 1; });
let dropped = 0; for(let c = 0; c < nComp; c++) if(find(c) !== find(mainComp)) dropped++;
log('ponts', bridgeCells.length, 'pixels; groupes ecartes (lacs/mers fermees):', dropped);

// ---------- 7. Trace des polylignes ----------
lane.fill(0); const px = []; for(let i = 0; i < N; i++) if(keep[i]){ lane[i] = 1; px.push(i); }
function links(i){ // 4-voisins + diagonales seulement si aucun 4-voisin commun (pas de triangles)
  const y = (i / W) | 0, x = i - y * W, at = (dx, dy) => { const yy = y + dy; return (yy < 0 || yy >= H) ? -1 : yy * W + wrapX(x + dx); };
  const out = [];
  for(const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const n = at(dx, dy); if(n >= 0 && lane[n]) out.push(n); }
  for(const [dx, dy] of [[1,1],[1,-1],[-1,1],[-1,-1]]){ const n = at(dx, dy); if(n < 0 || !lane[n]) continue; const a = at(dx, 0), b = at(0, dy); if((a >= 0 && lane[a]) || (b >= 0 && lane[b])) continue; out.push(n); }
  return out;
}
const L = new Map(); px.forEach(i => L.set(i, links(i)));
const seen = new Set(), ek = (a, b) => a < b ? a + ':' + b : b + ':' + a;
const chains = [];
function walk(start, next){
  const ch = [start, next]; seen.add(ek(start, next)); let prev = start, cur = next;
  while(L.get(cur).length === 2 && cur !== start){
    const nx = L.get(cur).find(n => n !== prev && !seen.has(ek(cur, n))); if(nx === undefined) break;
    seen.add(ek(cur, nx)); ch.push(nx); prev = cur; cur = nx;
  }
  chains.push(ch);
}
px.forEach(i => { if(L.get(i).length !== 2) L.get(i).forEach(n => { if(!seen.has(ek(i, n))) walk(i, n); }); });
px.forEach(i => { L.get(i).forEach(n => { if(!seen.has(ek(i, n))) walk(i, n); }); }); // boucles sans noeud
log('polylignes', chains.length);

// ---------- 8. Coordonnees, simplification et lissage sans jamais toucher la terre ----------
const cellAt = (lon, lat) => { const y = Math.floor((LAT_TOP - lat) / RES), x = wrapX(Math.floor((lon + 180) / RES)); return (y < 0 || y >= H) ? -1 : y * W + x; };
const seaPt = (lon, lat) => { const c = cellAt(lon, lat); return c >= 0 && !land[c] && dist[c] >= CMIN * 0.5; };
function segAtSea(a, b){
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (RES * 0.4)));
  for(let s = 0; s <= n; s++) if(!seaPt(a[0] + (b[0] - a[0]) * s / n, a[1] + (b[1] - a[1]) * s / n)) return false;
  return true;
}
function toCoords(ch){
  const out = []; let off = 0, prevX = null;
  for(const i of ch){ const y = (i / W) | 0, x = i - y * W;
    if(prevX !== null){ if(x - prevX > W / 2) off -= 360; else if(x - prevX < -W / 2) off += 360; }
    prevX = x; out.push([lonOf(x) + off, latOf(y)]); }
  return out;
}
function simplify(pts, tol){ // Douglas-Peucker, un segment n'est accepte que s'il reste en mer
  const keepP = new Uint8Array(pts.length); keepP[0] = keepP[pts.length - 1] = 1; const st = [[0, pts.length - 1]];
  while(st.length){ const [a, b] = st.pop(); if(b - a < 2) continue;
    let md = -1, mi = -1; const [ax, ay] = pts[a], [bx, by] = pts[b], L2 = (bx - ax) ** 2 + (by - ay) ** 2;
    for(let i = a + 1; i < b; i++){ const [x, y] = pts[i]; let t = L2 ? ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L2 : 0; t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay))); if(d > md){ md = d; mi = i; } }
    if(md > tol || !segAtSea(pts[a], pts[b])){ keepP[mi] = 1; st.push([a, mi], [mi, b]); } }
  return pts.filter((_, i) => keepP[i]);
}
function chaikin(pts){
  const out = [pts[0]];
  for(let i = 0; i < pts.length - 1; i++){ const [a, b] = [pts[i], pts[i+1]];
    out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); }
  out.push(pts[pts.length - 1]); return out;
}
const lines = [];
let rejectedSmooth = 0;
for(const ch of chains){
  if(ch.length < 2) continue;
  let pts = simplify(toCoords(ch), 0.06);
  let sm = pts; for(let k = 0; k < 2; k++) sm = chaikin(sm);
  let ok = true; for(let i = 0; i < sm.length - 1 && ok; i++) if(!segAtSea(sm[i], sm[i+1])) ok = false;
  if(!ok) rejectedSmooth++;
  lines.push((ok ? sm : pts).map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]));
}
fs.writeFileSync(DST, JSON.stringify({ offsetKm:D, minHalfWidthKm:CMIN, lines }));
log('ecrit', lines.length, 'lignes,', lines.reduce((s, l) => s + l.length, 0), 'points; lissage refuse sur', rejectedSmooth);
