// Rivieres et lacs du monde (data/monde/water.json + data/monde/regions-water.topojson).
// Genere hors ligne (trop lourd a chaque chargement de la page):
//  1. Relief simule sur une grille de 0.2 deg: distance a la cote, chaines de
//     montagnes / volcans / massifs anciens du jeu (GEO_TERRAIN), Cordillere
//     australienne, cuvette du lac Eyre, bruit. Pluie = inverse de l'aridite
//     (aridityAt). Les fonctions et donnees sont lues dans outils/modele-regions.js:
//     une seule source de verite.
//  2. Remplissage des cuvettes (priority-flood): cuvettes = emplacements de lacs.
//  3. Fleuves REELS (outils/rivers-world.json: cours approche par les villes
//     traversees) traces par le generateur: "serpent" (spline + meandres),
//     la source s'affine; un affluent s'arrete en touchant son fleuve
//     (confluence, jamais de croisement).
//  4. Lacs: formes compactes, a l'ecart des rivieres, de la cote et des autres
//     lacs; cuvettes d'abord, puis petits lacs dans les creux (peche).
//  5. Le lit des rivieres et les lacs sont retires des polygones des regions
//     (regions-water.topojson, meme ordre que admin1). water.json garde les
//     traces (largeur par point) et les lacs pour la grille de navigation.
// Usage: node outils/build-waterways.js outils/modele-regions.js data/monde/admin1.topojson data/monde/nav-grid.json data/monde
const fs = require('fs'), path = require('path');
const turf = require('@turf/turf'), topojson = require('topojson-client'), topoServer = require('topojson-server'), topoSimplify = require('topojson-simplify');

const [HTML, SRC, NAV, OUT] = process.argv.slice(2);
const t0 = Date.now(), log = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', ...a);

// ---- fonctions et donnees partagees, lues dans les scripts du jeu (un dossier ou un fichier) ----
const html = fs.statSync(HTML).isDirectory() ? fs.readdirSync(HTML).filter(f => f.endsWith('.js')).map(f => fs.readFileSync(path.join(HTML, f), 'utf8')).join('\n') : fs.readFileSync(HTML, 'utf8');
function grab(re){ const m = html.match(re); if(!m) throw new Error('introuvable: ' + re); let i = m.index + m[0].length - 1, d = 0;
  for(; i < html.length; i++){ const ch = html[i]; if(ch === '{' || ch === '[' || ch === '(') d++; else if(ch === '}' || ch === ']' || ch === ')'){ d--; if(!d) break; } }
  let end = i + 1; if(html[end] === ';') end++; return html.slice(m.index, end); }
const shared = [
  grab(/function smooth01\(t\)\{/), grab(/const clamp01 = x => /),
  grab(/function geoHash\(ix, iy, s\)\{/), grab(/function geoNoise\(lon, lat, seed, waveKm\)\{/),
  grab(/const ARID_CENTERS = \[/), grab(/function aridityAt\(lat, lon\)\{/), grab(/const GEO_TERRAIN = \{/),
  grab(/function geoDist\(lat, lon, clat, clon\)\{/),
].join('\n');
const G = new Function(shared + '\nreturn { smooth01, clamp01, geoHash, geoNoise, aridityAt, GEO_TERRAIN, geoDist };')();
const { smooth01, clamp01, geoHash, geoNoise, aridityAt, GEO_TERRAIN, geoDist } = G;

// ---- parametres ----
const BOX = { lon0:-180, lon1:180, lat0:-56, lat1:84, res:0.2 };
const LAKE_CLEAR = 12;                                 // rive libre minimale (km)
const LAKE_DENSITY = 40 / 7.745e6;                     // lacs par km2 de terre (reference: Australie)
const SOURCE_TAPER_KM = 140;                           // longueur sur laquelle la source s'affine
const P = { noise:30, lakeDepth:1, lakeMax:30, lakeFill:0.2, seed:5 };
const AUS_RIDGE = [[-37.8,145.5],[-36.3,148.3],[-33.5,150],[-30.5,151.8],[-27.5,152],[-24.5,149.5],[-21.5,147.8],[-18.5,145.5],[-15.5,144.6],[-12.5,143]];
const AUS_RANGES = [[-23.7,133.5,2,0.55],[-22.5,118,2.5,0.6],[-17,126,2.5,0.5],[-31.5,138.6,1.3,0.45],[-26,131.5,1.8,0.5],[-42,146.5,1.2,0.8],[-34,117,2,0.25]];
const EDGE_LON = 175;                                  // pas de riviere a cheval sur l'antimeridien

// ---- grille terre (depuis la grille de navigation, 0 = terre) ----
const nav = JSON.parse(fs.readFileSync(NAV));
const NW = nav.w, NH = nav.h, NRES = nav.res, NTOP = nav.latTop;
const navLand = new Uint8Array(NW * NH);
nav.rows.forEach((r, y) => { let x = 0; for(let k = 0; k < r.length; k += 2){ if(!r[k]) navLand.fill(1, y * NW + x, y * NW + x + r[k+1]); x += r[k+1]; } });
const W = Math.round((BOX.lon1 - BOX.lon0) / BOX.res), H = Math.round((BOX.lat1 - BOX.lat0) / BOX.res), N = W * H;
const lonAt = x => BOX.lon0 + (x + 0.5) * BOX.res, latAt = y => BOX.lat1 - (y + 0.5) * BOX.res;
const land = new Uint8Array(N);
for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){
  const lon = lonAt(x), lat = latAt(y);
  if(lat > 59.5 && lon > -74 && lon < -10) continue;     // Groenland: calotte glaciaire, pas de riviere
  const fy = Math.floor((NTOP - lat) / NRES), fx = Math.floor((lon + 180) / NRES);
  if(fy >= 0 && fy < NH && navLand[fy * NW + fx]) land[y * W + x] = 1;
}
// pleine eau: aucune terre (grille fine) dans un rayon de rKm
function openSeaAt(lon, lat, rKm = 20){
  const cy = Math.floor((NTOP - lat) / NRES), cx = Math.floor((((lon + 540) % 360) - 180 + 180) / NRES);
  const ry = Math.ceil(rKm / 110.57 / NRES), rx = Math.ceil(rKm / (111.32 * Math.max(0.2, Math.cos(lat * Math.PI / 180))) / NRES);
  for(let y = cy - ry; y <= cy + ry; y++){ if(y < 0 || y >= NH) return false;
    for(let x = cx - rx; x <= cx + rx; x++) if(navLand[y * NW + ((x % NW) + NW) % NW]) return false; }
  return true;
}
const nbrs = c => { const cx = c % W, cy = (c / W) | 0, out = [];
  for(let dy = -1; dy <= 1; dy++) for(let dx = -1; dx <= 1; dx++){ if(!dx && !dy) continue; const nx = cx + dx, ny = cy + dy;
    if(nx >= 0 && ny >= 0 && nx < W && ny < H) out.push(ny * W + nx); } return out; };
const dist = new Float32Array(N).fill(1e9); { const q = [];
  for(let i = 0; i < N; i++) if(!land[i]){ dist[i] = 0; q.push(i); }
  for(let h = 0; h < q.length; h++){ const c = q[h]; for(const n of nbrs(c)) if(dist[n] > dist[c] + 1){ dist[n] = dist[c] + 1; q.push(n); } } }
const rain = new Float32Array(N);
for(let i = 0; i < N; i++) if(land[i]) rain[i] = Math.pow(1 - aridityAt(latAt((i / W) | 0), lonAt(i % W)), 2);   // desert: ~0, pas de fleuve saharien
const cellKm2 = y => BOX.res * 111.32 * Math.cos(latAt(y) * Math.PI / 180) * BOX.res * 110.57;
let landKm2 = 0; for(let i = 0; i < N; i++) if(land[i]) landKm2 += cellKm2((i / W) | 0);
log('grille', W + 'x' + H, 'terres', Math.round(landKm2 / 1e6) + ' M km2');

// ---- relief ----
function segDist(lat, lon, a, b){
  const k = Math.cos(lat * Math.PI / 180), ax = a[1] * k, ay = a[0], bx = b[1] * k, by = b[0], px = lon * k, py = lat;
  const dx = bx - ax, dy = by - ay, t = clamp01(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
const gauss = (lat, lon, zones) => { let m = 0; for(const [clat, clon, r] of zones){ if(Math.abs(lat - clat) > r * 2.5) continue; const d = geoDist(lat, lon, clat, clon) / r; if(d < 2.5) m = Math.max(m, Math.exp(-d * d)); } return m; };
const elev = new Float32Array(N);
for(let i = 0; i < N; i++){ if(!land[i]) continue;
  const lon = lonAt(i % W), lat = latAt((i / W) | 0);
  let e = 60 * Math.min(dist[i], 25) / 25;
  e += 1000 * gauss(lat, lon, GEO_TERRAIN.montagne) + 500 * gauss(lat, lon, GEO_TERRAIN.volcan) + 350 * gauss(lat, lon, GEO_TERRAIN.ancien);
  if(lon > 110 && lon < 156 && lat < -9 && lat > -45){      // Australie: relief affine
    let ridge = 1e9; for(let k = 1; k < AUS_RIDGE.length; k++) ridge = Math.min(ridge, segDist(lat, lon, AUS_RIDGE[k-1], AUS_RIDGE[k]));
    e += 900 * Math.exp(-((ridge / 1.3) ** 2));
    for(const [clat, clon, r, h] of AUS_RANGES) e += 900 * h * Math.exp(-((geoDist(lat, lon, clat, clon) / r) ** 2));
    e -= 40 * smooth01(1 - geoDist(lat, lon, -28.5, 137.5) / 7);
  }
  e += P.noise * (geoNoise(lon, lat, P.seed, 350) - 0.5) * 2 + P.noise * 0.5 * (geoNoise(lon, lat, P.seed + 17, 120) - 0.5);
  elev[i] = e; }
log('relief');

// ---- ecoulement (priority-flood) ----
const filled = new Float32Array(N), recv = new Int32Array(N).fill(-1), done = new Uint8Array(N), sea = new Int32Array(N).fill(-1);
{ const hk = [], hv = [];
  const push = (key, val) => { hk.push(key); hv.push(val); let i = hk.length - 1;
    while(i){ const p = (i - 1) >> 1; if(hk[p] <= hk[i]) break; [hk[p], hk[i]] = [hk[i], hk[p]]; [hv[p], hv[i]] = [hv[i], hv[p]]; i = p; } };
  const pop = () => { const v0 = hv[0], lk = hk.pop(), lv = hv.pop();
    if(hk.length){ hk[0] = lk; hv[0] = lv; let i = 0; for(;;){ const l = 2 * i + 1, r = l + 1; let m = i;
      if(l < hk.length && hk[l] < hk[m]) m = l; if(r < hk.length && hk[r] < hk[m]) m = r; if(m === i) break;
      [hk[m], hk[i]] = [hk[i], hk[m]]; [hv[m], hv[i]] = [hv[i], hv[m]]; i = m; } } return v0; };
  for(let i = 0; i < N; i++) if(land[i] && dist[i] <= 1.5){ filled[i] = elev[i]; done[i] = 1; push(elev[i], i); sea[i] = nbrs(i).find(n => !land[n]) ?? -1; }
  while(hk.length){ const c = pop();
    for(const n of nbrs(c)) if(land[n] && !done[n]){ done[n] = 1; filled[n] = Math.max(elev[n], filled[c] + 0.01); recv[n] = c; push(filled[n], n); } } }
// cuvettes -> lacs potentiels
const basins = []; { const lakeOf = new Int32Array(N).fill(-1);
  for(let i = 0; i < N; i++){
    if(!land[i] || lakeOf[i] >= 0 || filled[i] - elev[i] < P.lakeDepth) continue;
    const cells = [i]; lakeOf[i] = basins.length;
    for(let h = 0; h < cells.length; h++) for(const n of nbrs(cells[h])) if(land[n] && lakeOf[n] < 0 && filled[n] - elev[n] >= P.lakeDepth * 0.5){ lakeOf[n] = basins.length; cells.push(n); }
    let sink = cells[0]; for(const c of cells) if(elev[c] < elev[sink]) sink = c;
    basins.push({ sink, size:Math.min(P.lakeMax, Math.round(1 + cells.length * P.lakeFill)) });
  } }
log('ecoulement', basins.length, 'cuvettes');


// ---- trace serpent ----
function snakeRiver(cellPts, seed, opt){
  const lat0 = cellPts.reduce((a, q) => a + q[1], 0) / cellPts.length;
  const kx = 111.32 * Math.cos(lat0 * Math.PI / 180), ky = 110.57;
  const toXY = ([lon, lat]) => [lon * kx, lat * ky], toLL = ([x, y]) => [x / kx, y / ky];
  const d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  let Pp = cellPts.map(toXY);
  for(let it = 0; it < 6; it++) Pp = Pp.map((q, i) => i === 0 || i === Pp.length - 1 ? q : [(Pp[i-1][0] + 2 * q[0] + Pp[i+1][0]) / 4, (Pp[i-1][1] + 2 * q[1] + Pp[i+1][1]) / 4]);
  const ctrl = [Pp[0]]; let run = 0;
  for(let i = 1; i < Pp.length; i++){ run += d2(Pp[i-1], Pp[i]); if(run >= 90){ ctrl.push(Pp[i]); run = 0; } }
  if(ctrl.length > 1 && d2(ctrl[ctrl.length - 1], Pp[Pp.length - 1]) < 40) ctrl.pop();
  ctrl.push(Pp[Pp.length - 1]);
  const base = [];
  for(let i = 0; i < ctrl.length - 1; i++){
    const p0 = ctrl[i - 1] || ctrl[i], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[i + 2] || p2, n = Math.max(2, Math.ceil(d2(p1, p2) / 2));
    for(let k = 0; k < n; k++){ const t = k / n, t2 = t * t, t3 = t2 * t;
      base.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); }
  }
  base.push(ctrl[ctrl.length - 1]);
  const sArr = [0]; for(let i = 1; i < base.length; i++) sArr.push(sArr[i-1] + d2(base[i-1], base[i]));
  const L = sArr[sArr.length - 1] || 1, out = [], width = [];
  let phase = seed * 1.7;
  for(let i = 0; i < base.length; i++){
    const a = base[Math.max(0, i - 1)], b = base[Math.min(base.length - 1, i + 1)], tl = d2(a, b) || 1;
    const nx = -(b[1] - a[1]) / tl, ny = (b[0] - a[0]) / tl;
    const ll = toLL(base[i]), u = sArr[i] / L;
    if(i) phase += 2 * Math.PI * (sArr[i] - sArr[i-1]) / (1.5 * (65 + 70 * geoNoise(ll[0], ll[1], seed + 21, 200)));
    const taper = smooth01(sArr[i] / 25) * smooth01((L - sArr[i]) / 50);
    const amp = (5 + 9 * u) * (0.6 + 0.8 * geoNoise(ll[0], ll[1], seed + 5, 400)) * taper;
    const off = amp * (Math.sin(phase) + 0.25 * Math.sin(2 * phase + 1.3));
    out.push([base[i][0] + nx * off, base[i][1] + ny * off]);
    // la source s'affine (0.15 x la largeur de depart a la pointe), sauf
    // pour une liaison (depart en mer ou sur un fleuve): pleine largeur
    const tp = opt.taper === false ? 1 : 0.15 + 0.85 * smooth01(sArr[i] / SOURCE_TAPER_KM);
    width.push((opt.w0 + (opt.w1 - opt.w0) * Math.pow(u, 0.8)) * tp);
  }
  // embouchure (et depart en mer d'une liaison) prolongee jusqu'a la mer
  // LIBRE: au moins 40 km, puis jusqu'a deux points de suite en pleine eau
  // (aucune terre a 20 km), 250 km au plus: jamais de poche fermee par les
  // iles d'un delta
  const extend = (from, dirFrom, add) => { const el = d2(dirFrom, from) || 1; let open = 0;
    for(let k = 1; k <= 25; k++){ const pt = [from[0] + (from[0] - dirFrom[0]) / el * 10 * k, from[1] + (from[1] - dirFrom[1]) / el * 10 * k]; add(pt);
      if(k >= 4 && openSeaAt(...toLL(pt))){ if(++open >= 2) break; } else open = 0; } };
  if(opt.mouth) extend(out[out.length - 1], out[Math.max(0, out.length - 6)], pt => { out.push(pt); width.push(width[width.length - 1]); });
  if(opt.startSea) extend(out[0], out[Math.min(out.length - 1, 5)], pt => { out.unshift(pt); width.unshift(width[0]); });
  return { coords:out.map(toLL), width };
}
// Colle le debut d'un bras au fleuve dont il part (miroir d'attachTributary)
function attachHead(t, line){
  const start = t.coords[0], target = turf.nearestPointOnLine(line, start).geometry.coordinates;
  const dx = target[0] - start[0], dy = target[1] - start[1]; let run = 0;
  for(let i = 0; i < t.coords.length; i++){
    if(i) run += turf.distance(t.coords[i - 1], t.coords[i]);
    if(run > 50) break;
    const k = smooth01(1 - run / 50); t.coords[i] = [t.coords[i][0] + dx * k, t.coords[i][1] + dy * k];
  }
}
// lit: morceaux elargis a leur largeur (fins pres de la source), reunis
function riverPolygon(w){
  const parts = []; let i = 0, run = 0;
  while(i < w.coords.length - 1){
    const CH = run < SOURCE_TAPER_KM * 1.2 ? 3 : 24;
    const seg = w.coords.slice(i, Math.min(w.coords.length, i + CH + 1));
    if(seg.length >= 2){ const km = Math.max(0.4, w.width[Math.min(w.width.length - 1, i + (seg.length >> 1))] / 2);
      parts.push(turf.buffer(turf.lineString(seg), km, { units:'kilometers', steps:8 })); }
    for(let k = i; k < Math.min(w.coords.length - 1, i + CH); k++) run += turf.distance(w.coords[k], w.coords[k + 1]);
    i += CH;
  }
  return parts.length > 1 ? turf.union(turf.featureCollection(parts)) : parts[0];
}
function attachTributary(t, trunkLine){
  const end = t.coords[t.coords.length - 1];
  const target = turf.nearestPointOnLine(trunkLine, end).geometry.coordinates;
  const dx = target[0] - end[0], dy = target[1] - end[1];
  let run = 0; const n = t.coords.length;
  for(let i = n - 1; i >= 0; i--){
    if(i < n - 1) run += turf.distance(t.coords[i], t.coords[i + 1]);
    if(run > 70) break;
    const k = smooth01(1 - run / 70);
    t.coords[i] = [t.coords[i][0] + dx * k, t.coords[i][1] + dy * k];
  }
}
function lakeShape(center, rKm, seed){
  const [lon0, lat0] = center, kx = 111.32 * Math.cos(lat0 * Math.PI / 180), ky = 110.57;
  const rnd = k => geoHash(seed, k, 577);
  const stretch = 1 + rnd(1) * 0.7, rot = rnd(2) * Math.PI;
  const HH = [[2, 0.04 + rnd(3) * 0.08], [3, 0.03 + rnd(4) * 0.1], [5, rnd(5) * 0.05]];
  const ring = [];
  for(let i = 0; i < 64; i++){
    const a = i / 64 * 2 * Math.PI;
    let f = 1; HH.forEach(([k, amp], j) => { f += amp * Math.sin(k * a + rnd(6 + j) * 6.28); });
    const x0 = Math.cos(a) * rKm * f * Math.sqrt(stretch), y0 = Math.sin(a) * rKm * f / Math.sqrt(stretch);
    ring.push([lon0 + (x0 * Math.cos(rot) - y0 * Math.sin(rot)) / kx, lat0 + (x0 * Math.sin(rot) + y0 * Math.cos(rot)) / ky]);
  }
  ring.push(ring[0]);
  return turf.polygon([ring]);
}

// ---- eau deja tracee (grille fine 0.05 deg): pour arreter une riviere a la confluence ----
const wet = new Uint8Array(NW * NH);
const fineCell = (lon, lat) => { const y = Math.floor((NTOP - lat) / NRES); if(y < 0 || y >= NH) return -1; return y * NW + (((Math.floor((lon + 180) / NRES)) % NW) + NW) % NW; };
function stamp(coords, width){
  coords.forEach(([lon, lat], k) => {
    const rKm = width[k] / 2, ry = rKm / 110.57 / NRES, rx = rKm / (111.32 * Math.cos(lat * Math.PI / 180)) / NRES;
    const cy = (NTOP - lat) / NRES, cx = (lon + 180) / NRES;
    for(let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++){ if(y < 0 || y >= NH) continue;
      for(let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++){
        if(((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 > 1) continue;
        wet[y * NW + ((x % NW) + NW) % NW] = 1; } }
  });
}
// coupe la riviere au premier contact avec une eau deja tracee (confluence)
// Affluent: coupe au premier contact. Fleuve vers la mer ou l'interieur:
// coupe seulement dans ses derniers 15 % (estuaire partage), sinon garde
// entier (w.grazed: frole une autre riviere, a signaler).
function cutAtConfluence(w, joinRiver = true, fromRiver = false){
  const from = joinRiver ? 0 : Math.floor(w.coords.length * 0.85);
  // un bras qui part d'un fleuve: on ignore le debut, encore dans ce fleuve
  let i0 = 0; if(fromRiver) while(i0 < w.coords.length){ const c = fineCell(...w.coords[i0]); if(c < 0 || !wet[c]) break; i0++; }
  for(let i = i0; i < w.coords.length; i++){ const c = fineCell(...w.coords[i]);
    if(c < 0 || !wet[c]) continue;
    if(i < from){ w.grazed = true; continue; }
    if(i < 10) return null;
    w.coords = w.coords.slice(0, i + 1); w.width = w.width.slice(0, i + 1); w.joined = true; return w; }
  return w;
}

// ---- fleuves reels (outils/rivers-world.json) ----
// Chaque fleuve: cours approche (villes traversees), densifie tous les ~20 km,
// puis trace par le generateur (serpent, source affinee). Les affluents
// (end: join) viennent apres leur fleuve et s'arretent en le touchant.
const RIVER_FILE = path.join(__dirname, 'rivers-world.json');
const WIDTH = { 1:{ w0:9, w1:30 }, 2:{ w0:8, w1:22 }, 3:{ w0:7, w1:15 } };
const nameSeed = n => [...n].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7) >>> 0;
function densify(pts, stepKm){ const out = [pts[0]];
  for(let i = 1; i < pts.length; i++){ const a = pts[i-1], b = pts[i], n = Math.max(1, Math.round(turf.distance(a, b) / stepKm));
    for(let k = 1; k <= n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
  return out; }
const rivers = []; let water = 0, joined = 0; const cutEarly = [];
for(const R of JSON.parse(fs.readFileSync(RIVER_FILE)).rivers){
  const opt = { ...WIDTH[R.cls], mouth:R.end === 'sea', taper:!R.start, startSea:R.start === 'sea' };
  let w = snakeRiver(densify(R.pts, 20), nameSeed(R.n) % 1000, opt);
  if(R.start === 'join' && rivers.length){   // bras: debut colle au fleuve dont il part
    const st = turf.point(w.coords[0]);
    let best = null, bd = Infinity; for(const o of rivers){ const d = turf.pointToLineDistance(st, o.line); if(d < bd){ bd = d; best = o; } }
    if(best && bd < 150) attachHead(w, best.line);
  }
  if(R.end === 'join' && rivers.length){   // queue collee au fleuve le plus proche
    const end = turf.point(w.coords[w.coords.length - 1]);
    let best = null, bd = Infinity; for(const o of rivers){ const d = turf.pointToLineDistance(end, o.line); if(d < bd){ bd = d; best = o; } }
    if(best && bd < 150) attachTributary(w, best.line);
  }
  w = cutAtConfluence(w, R.end === 'join', R.start === 'join');
  if(!w){ cutEarly.push(R.n); continue; }
  if(w.joined) joined++;
  if(w.grazed) cutEarly.push(R.n + ' (frole une autre riviere)');
  w.name = R.n; w.cls = R.cls; w.line = turf.lineString(w.coords);
  w.poly = riverPolygon(w); stamp(w.coords, w.width);
  rivers.push(w); water += turf.area(w.poly) / 1e6;
}
log('fleuves', rivers.length, 'confluences', joined, cutEarly.length ? 'a verifier: ' + cutEarly.join(', ') : '');

// ---- lacs ----
const cellOfPt = ([lon, lat]) => { const x = Math.floor((lon - BOX.lon0) / BOX.res), y = Math.floor((BOX.lat1 - lat) / BOX.res); return x < 0 || y < 0 || x >= W || y >= H ? -1 : y * W + x; };
const riverBoxes = rivers.map(x => turf.bbox(x.poly));
const onLand = ([lon, lat]) => { const c = cellOfPt([lon, lat]); return c >= 0 && land[c] && dist[c] >= 2; };
const lakes = [], lakeBoxes = [];
const OFFSETS = [[0, 0]]; for(const d of [40, 80]) for(let a = 0; a < 8; a++) OFFSETS.push([d * Math.sin(a * Math.PI / 4), d * Math.cos(a * Math.PI / 4)]);
function tryLake(c0, r0, seed){
  if(Math.abs(c0[0]) > EDGE_LON - 2) return null;
  for(const [ox, oy] of OFFSETS) for(const scale of [1, 0.75, 0.55]){
    const center = [c0[0] + ox / (111.32 * Math.cos(c0[1] * Math.PI / 180)), c0[1] + oy / 110.57];
    const poly = lakeShape(center, r0 * scale, seed);
    if(!poly.geometry.coordinates[0].every(onLand)) continue;
    const halo = turf.buffer(poly, LAKE_CLEAR, { units:'kilometers', steps:6 }), hb = turf.bbox(halo);
    const near = bb => !(hb[0] > bb[2] || hb[2] < bb[0] || hb[1] > bb[3] || hb[3] < bb[1]);
    if(rivers.some((x, k) => near(riverBoxes[k]) && turf.booleanIntersects(halo, x.poly))) continue;
    if(lakes.some((o, k) => near(lakeBoxes[k]) && turf.booleanIntersects(halo, o.poly))) continue;
    return poly;
  }
  return null;
}
const addLake = poly => { lakes.push({ poly }); lakeBoxes.push(turf.bbox(poly)); water += turf.area(poly) / 1e6; };
const lakeTarget = Math.round(landKm2 * LAKE_DENSITY);
for(const b of basins.slice().sort((a, b2) => b2.size - a.size)){
  if(lakes.length >= lakeTarget) break;
  const y = (b.sink / W) | 0, c0 = [lonAt(b.sink % W), latAt(y)];
  const poly = tryLake(c0, Math.max(9, Math.sqrt(b.size * cellKm2(y) * 0.55 / Math.PI)), b.sink);
  if(poly) addLake(poly);
}
const pits = [];
for(let i = 0; i < N; i++){
  if(!land[i] || dist[i] < 4) continue;
  const cx = i % W, cy = (i / W) | 0; let pit = true;
  for(let dy = -1; dy <= 1 && pit; dy++) for(let dx = -1; dx <= 1; dx++){ const nx = cx + dx, ny = cy + dy; if(nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const n = ny * W + nx; if(n !== i && land[n] && elev[n] < elev[i]){ pit = false; break; } }
  if(pit) pits.push([i, rain[i] + geoHash(i, 3, 211) * 0.3]);
}
pits.sort((a, b) => b[1] - a[1]);
for(const [i] of pits){
  if(lakes.length >= lakeTarget) break;
  const poly = tryLake([lonAt(i % W), latAt((i / W) | 0)], 8 + geoHash(i, 7, 313) * 12, i);
  if(poly) addLake(poly);
}
log('lacs', lakes.length, '/', lakeTarget, 'eau', (water / landKm2 * 100).toFixed(2) + ' %');

// ---- regions: lit des rivieres et lacs retires ----
const topo = JSON.parse(fs.readFileSync(SRC));
const fc = topojson.feature(topo, topo.objects[Object.keys(topo.objects)[0]]);
function unwrapRing(ring){ const out = [[ring[0][0], ring[0][1]]]; let off = 0;
  for(let i = 1; i < ring.length; i++){ const d = ring[i][0] - ring[i-1][0]; if(d > 180) off -= 360; else if(d < -180) off += 360; out.push([ring[i][0] + off, ring[i][1]]); } return out; }
const waters = [...rivers.map(r => r.poly), ...lakes.map(l => l.poly)], waterBoxes = waters.map(p => turf.bbox(p));
let carved = 0, failed = 0;
fc.features.forEach((f, idx) => {
  const g = f.geometry;
  if(g.type === 'Polygon') g.coordinates = g.coordinates.map(unwrapRing); else if(g.type === 'MultiPolygon') g.coordinates = g.coordinates.map(p => p.map(unwrapRing));
  const fb = turf.bbox(f), over = bb => !(fb[0] > bb[2] || fb[2] < bb[0] || fb[1] > bb[3] || fb[3] < bb[1]);
  // regions traversees par chaque fleuve (un point tous les ~20 km) et region de chaque lac
  rivers.forEach((r, k) => { if(!over(riverBoxes[k])) return;
    for(let i = 0; i < r.coords.length; i += 5) if(turf.booleanPointInPolygon(r.coords[i], f)){ (r.regions = r.regions || new Set()).add(idx + 1); break; } });
  lakes.forEach((l, k) => { if(over(lakeBoxes[k]) && turf.booleanPointInPolygon(turf.centroid(l.poly), f)) l.region = idx + 1; });
  const hits = waters.filter((w, k) => { const bb = waterBoxes[k]; return !(fb[0] > bb[2] || fb[2] < bb[0] || fb[1] > bb[3] || fb[3] < bb[1]); });
  if(!hits.length) return;
  try{ const d = turf.difference(turf.featureCollection([f, ...hits])); if(d){ f.geometry = d.geometry; carved++; } }
  catch(e){ // une a une si l'ensemble echoue
    let cur = f; for(const h of hits){ try{ const d = turf.difference(turf.featureCollection([cur, h])); if(d) cur = { type:'Feature', properties:{}, geometry:d.geometry }; }catch(e2){ failed++; } }
    f.geometry = cur.geometry; carved++; }
  if(idx % 50 === 0) log('decoupe', idx, '/', fc.features.length);
});
fc.features.forEach(f => { f.properties = {}; });
log('regions decoupees', carved, 'echecs', failed);

// ---- ecriture ----
const r3 = v => Math.round(v * 1000) / 1000;
function resample(w, stepKm){ const c = [w.coords[0]], ww = [w.width[0]]; let run = 0;
  for(let i = 1; i < w.coords.length; i++){ run += turf.distance(w.coords[i-1], w.coords[i]); if(run >= stepKm || i === w.coords.length - 1){ c.push(w.coords[i]); ww.push(w.width[i]); run = 0; } }
  return { c:c.map(([x, y]) => [r3(x), r3(y)]), w:ww.map(v => Math.round(v * 10) / 10) }; }
const waterOut = {
  stats:{ landKm2:Math.round(landKm2), waterKm2:Math.round(water), ratio:+(water / landKm2).toFixed(4), rivers:rivers.length, lakes:lakes.length, confluences:joined },
  rivers:rivers.map(w => ({ n:w.name, cls:w.cls, r:[...(w.regions || [])].sort((a, b) => a - b), ...resample(w, 4) })),
  lakes:lakes.map(l => ({ p:l.poly.geometry.coordinates[0].map(([x, y]) => [r3(x), r3(y)]), a:Math.round(turf.area(l.poly) / 1e6), r:l.region || null })),
};
fs.writeFileSync(path.join(OUT, 'water.json'), JSON.stringify(waterOut));
// simplification legere (triangles < ~0.25 km2 retires) puis ~400 m de precision: invisible a l'echelle du jeu
let topoOut = topoSimplify.simplify(topoSimplify.presimplify(topoServer.topology({ regions:fc })), 2e-5);
topoOut = topojson.quantize(topoOut, 1e5);
fs.writeFileSync(path.join(OUT, 'regions-water.topojson'), JSON.stringify(topoOut));
log('ecrit', waterOut.stats, 'water.json', Math.round(fs.statSync(path.join(OUT, 'water.json')).size / 1024) + ' Ko',
  'regions-water.topojson', Math.round(fs.statSync(path.join(OUT, 'regions-water.topojson')).size / 1024) + ' Ko');
