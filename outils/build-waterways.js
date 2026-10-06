// Rivieres et lacs du monde (data/monde/water.json + data/monde/regions-water.topojson).
// Genere hors ligne (trop lourd a chaque chargement de la page):
//  1. Relief simule sur une grille de 0.2 deg: distance a la cote, chaines de
//     montagnes / volcans / massifs anciens du jeu (GEO_TERRAIN), Cordillere
//     australienne, cuvette du lac Eyre, bruit. Pluie = inverse de l'aridite
//     (aridityAt). Les fonctions et donnees sont lues dans outils/modele-regions.js:
//     une seule source de verite.
//  2. Remplissage des cuvettes (priority-flood): cuvettes = emplacements de lacs.
//  3. Fleuves REELS (outils/rivers-world.json) : vrai lit (Natural Earth, trace: reel,
//     voir outils/build-fleuves-ne.js)
//     (trace: villes, "serpent" : spline + meandres) ; la source s'affine ; un affluent
//     s'arrete en touchant son fleuve (confluence, jamais de croisement).
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
const SOURCE_TAPER_KM = 90;                            // longueur sur laquelle la source s'affine (jamais en pointe : bout arrondi)
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
// vrai si le point est en mer (case de la grille fine sans terre)
function seaPoint(lon, lat){ const fy = Math.floor((NTOP - lat) / NRES), fx = Math.floor((((lon + 540) % 360) - 180 + 180) / NRES); if(fy < 0 || fy >= NH) return true; return !navLand[fy * NW + ((fx % NW) + NW) % NW]; }
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
  // trace reel (Natural Earth) : le lit tel quel, juste adouci (1 passe) ; trace par les villes : lisse fort puis spline
  for(let it = 0; it < (opt.reel ? 1 : 6); it++) Pp = Pp.map((q, i) => i === 0 || i === Pp.length - 1 ? q : [(Pp[i-1][0] + 2 * q[0] + Pp[i+1][0]) / 4, (Pp[i-1][1] + 2 * q[1] + Pp[i+1][1]) / 4]);
  const ctrl = [Pp[0]]; let run = 0;
  for(let i = 1; i < Pp.length; i++){ run += d2(Pp[i-1], Pp[i]); if(run >= 90){ ctrl.push(Pp[i]); run = 0; } }
  if(ctrl.length > 1 && d2(ctrl[ctrl.length - 1], Pp[Pp.length - 1]) < 40) ctrl.pop();
  ctrl.push(Pp[Pp.length - 1]);
  const base = opt.reel ? Pp.slice(0, -1) : [];
  if(!opt.reel) for(let i = 0; i < ctrl.length - 1; i++){
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
    const off = opt.reel ? 0 : amp * (Math.sin(phase) + 0.25 * Math.sin(2 * phase + 1.3)); // (pas de meandres inventes sur un vrai lit)
    out.push([base[i][0] + nx * off, base[i][1] + ny * off]);
    // la source s'affine (0.15 x la largeur de depart a la pointe), sauf
    // pour une liaison (depart en mer ou sur un fleuve): pleine largeur
    const tp = opt.taper === false ? 1 : 0.5 + 0.5 * smooth01(sArr[i] / SOURCE_TAPER_KM);   // la source garde la moitie de la largeur : bout en demi-cercle
    width.push((opt.w0 + (opt.w1 - opt.w0) * Math.pow(u, 0.8)) * tp);
  }
  // embouchure (et depart en mer d'une liaison) prolongee jusqu'a la mer
  // LIBRE: au moins 40 km, puis jusqu'a deux points de suite en pleine eau
  // (aucune terre a 20 km), 250 km au plus: jamais de poche fermee par les
  // iles d'un delta
  // (le prolongement s'arrete des qu'il est en mer : 2 pas de 10 km au-dela de la cote, 140 km au plus.
  //  Avant : jusqu'en pleine eau, donc des traits droits de 250 km qui traversaient presqu'iles et iles)
  // Le prolongement ondule doucement (meandres de 6 km, ~75 km de long d'onde) : un trace droit de 100 km a travers un delta
  // est la ou le cours reel de Natural Earth s'arrete avant la mer ; il ne doit pas ressembler a un canal.
  const extend = (from, dirFrom, add) => { const el = d2(dirFrom, from) || 1; let open = 0;
    const ux = (from[0] - dirFrom[0]) / el, uy = (from[1] - dirFrom[1]) / el, nx = -uy, ny = ux, ph = seed * 1.3 + from[0] * .01;
    for(let k = 1; k <= 14; k++){ const off = 6 * Math.sin(k * .85 + ph) * Math.min(1, k / 3);
      const pt = [from[0] + ux * 10 * k + nx * off, from[1] + uy * 10 * k + ny * off]; add(pt);
      if(seaPoint(...toLL(pt))){ if(++open >= 2) break; } else open = 0; } };
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
    if(seg.length >= 2){ const km = Math.max(MIN_W / 2, w.width[Math.min(w.width.length - 1, i + (seg.length >> 1))] / 2);
      parts.push(turf.buffer(turf.lineString(seg), km, { units:'kilometers', steps:14 })); }
    for(let k = i; k < Math.min(w.coords.length - 1, i + CH); k++) run += turf.distance(w.coords[k], w.coords[k + 1]);
    i += CH;
  }
  if(parts.length < 2) return parts[0];
  try{ return turf.union(turf.featureCollection(parts)); }
  catch(e){   // morceaux qui se recouvrent mal (boucles de delta) : reunion un par un, en ecartant ceux qui echouent
    let acc = parts[0], lost = 0;
    for(let k = 1; k < parts.length; k++){
      try{ acc = turf.union(turf.featureCollection([acc, parts[k]])); }
      catch(e2){ try{ acc = turf.union(turf.featureCollection([acc, turf.buffer(parts[k], 0.02, { units:'kilometers' })])); }catch(e3){ lost++; } }
    }
    if(lost) console.warn('riviere : ' + lost + ' morceau(x) ecarte(s) (reunion impossible)');
    return acc;
  }
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
const MIN_W = 3;   // regle : aucun cours d'eau entre deux terres plus etroit qu'une petite riviere (3 km), source comprise
const WIDTH = { 1:{ w0:8, w1:28 }, 2:{ w0:5, w1:14 }, 3:{ w0:3, w1:8 } };   // largeurs (km) : fines pour les ~370 cours d'eau
const nameSeed = n => [...n].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7) >>> 0;
function densify(pts, stepKm){ const out = [pts[0]];
  for(let i = 1; i < pts.length; i++){ const a = pts[i-1], b = pts[i], n = Math.max(1, Math.round(turf.distance(a, b) / stepKm));
    for(let k = 1; k <= n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
  return out; }
const rivers = []; let water = 0, joined = 0; const cutEarly = [];
for(const R of JSON.parse(fs.readFileSync(RIVER_FILE)).rivers){
  const opt = { ...WIDTH[R.cls], ...(R.w ? { w0:R.w[0], w1:R.w[1] } : {}), mouth:R.end === 'sea', taper:!R.start, startSea:R.start === 'sea', reel:R.trace === 'reel' };
  let w = snakeRiver(densify(R.pts, R.trace === 'reel' ? 3 : 20), nameSeed(R.n) % 1000, opt);
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
  w.width = w.width.map(v => Math.max(MIN_W, v));
  w = cutAtConfluence(w, R.end === 'join', R.start === 'join');
  if(!w){ cutEarly.push(R.n); continue; }
  if(w.joined) joined++;
  if(w.grazed) cutEarly.push(R.n + ' (frole une autre riviere)');
  w.name = R.n; w.cls = R.cls; w.canal = !!R.canal; w.startsJoin = R.start === 'join'; w.line = turf.lineString(w.coords);
  w.poly = riverPolygon(w); stamp(w.coords, w.width);
  rivers.push(w); water += turf.area(w.poly) / 1e6;
}
log('fleuves', rivers.length, 'confluences', joined, cutEarly.length ? 'a verifier: ' + cutEarly.join(', ') : '');

// ---- lacs ----
const cellOfPt = ([lon, lat]) => { const x = Math.floor((lon - BOX.lon0) / BOX.res), y = Math.floor((BOX.lat1 - lat) / BOX.res); return x < 0 || y < 0 || x >= W || y >= H ? -1 : y * W + x; };
const riverBoxes = rivers.map(x => turf.bbox(x.poly));
const onLand = ([lon, lat]) => { const c = cellOfPt([lon, lat]); return c >= 0 && land[c] && dist[c] >= 2; };
const lakes = [], lakeBoxes = [];
// Routes et capitales (data/monde/routes.json, data/regions/regions.json) : les plans d'eau les evitent.
const ROUTES_J = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data/monde/routes.json'), 'utf8'));
const CAPITALES = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data/regions/regions.json'), 'utf8')).map(r => r.capitale);
const segCases = new Map(), SC = 0.25;
for(const [, , pts] of ROUTES_J.routes) for(let i = 0; i < pts.length - 1; i++){
  const a = pts[i], b = pts[i + 1];
  for(let x = Math.floor(Math.min(a[0], b[0]) / SC); x <= Math.floor(Math.max(a[0], b[0]) / SC); x++) for(let y = Math.floor(Math.min(a[1], b[1]) / SC); y <= Math.floor(Math.max(a[1], b[1]) / SC); y++){
    const k = x + ',' + y; (segCases.get(k) || segCases.set(k, []).get(k)).push([a[0], a[1], b[0], b[1]]); } }
const capCases = new Map(); CAPITALES.forEach(c => { const k = Math.floor(c[0] / SC) + ',' + Math.floor(c[1] / SC); (capCases.get(k) || capCases.set(k, []).get(k)).push(c); });
// vrai si le disque (centre, rayon R km) reste a plus de `clair` km de toute route et de plus de CLAIR_CAPITALE km d'une capitale
const CLAIR_CAPITALE = 12;
function loinDesRoutes(lon, lat, R, clair){
  const kx = 111.32 * Math.cos(lat * Math.PI / 180), ky = 110.57, rx = Math.ceil((R + Math.max(clair, CLAIR_CAPITALE)) / kx / SC) + 1, ry = Math.ceil((R + Math.max(clair, CLAIR_CAPITALE)) / ky / SC) + 1;
  const ci = Math.floor(lon / SC), cj = Math.floor(lat / SC);
  for(let i = ci - rx; i <= ci + rx; i++) for(let j = cj - ry; j <= cj + ry; j++){
    for(const c of capCases.get(i + ',' + j) || []) if(Math.hypot((c[0] - lon) * kx, (c[1] - lat) * ky) < R + CLAIR_CAPITALE) return false;
    for(const [x1, y1, x2, y2] of segCases.get(i + ',' + j) || []){
      const ax = (x1 - lon) * kx, ay = (y1 - lat) * ky, dx = (x2 - x1) * kx, dy = (y2 - y1) * ky, L = dx * dx + dy * dy;
      let t = L ? -(ax * dx + ay * dy) / L : 0; t = Math.max(0, Math.min(1, t));
      if(Math.hypot(ax + t * dx, ay + t * dy) < R + clair) return false; } }
  return true;
}
// Frontieres entre regions (arcs partages de admin1) : un plan d'eau reste a plus de CLAIR_FRONTIERE km d'elles, il ne chevauche jamais deux regions.
const CLAIR_FRONTIERE = 3;
const frontCases = new Map();
{ const t0f = JSON.parse(fs.readFileSync(SRC)), use = new Map(), cnt = a => Array.isArray(a) ? a.forEach(cnt) : use.set(a < 0 ? ~a : a, (use.get(a < 0 ? ~a : a) || 0) + 1);
  t0f.objects[Object.keys(t0f.objects)[0]].geometries.forEach(g => cnt(g.arcs));
  const mesh = topojson.mesh(t0f, { type:'MultiLineString', arcs:[...use].filter(([, c]) => c > 1).map(([k]) => [k]) });
  for(const line of mesh.coordinates) for(let i = 0; i < line.length - 1; i++){ const a = line[i], b = line[i + 1];
    for(let x = Math.floor(Math.min(a[0], b[0]) / SC); x <= Math.floor(Math.max(a[0], b[0]) / SC); x++) for(let y = Math.floor(Math.min(a[1], b[1]) / SC); y <= Math.floor(Math.max(a[1], b[1]) / SC); y++){
      const k = x + ',' + y; (frontCases.get(k) || frontCases.set(k, []).get(k)).push([a[0], a[1], b[0], b[1]]); } } }
function loinDesFrontieres(lon, lat, R){
  const kx = 111.32 * Math.cos(lat * Math.PI / 180), ky = 110.57, rx = Math.ceil((R + CLAIR_FRONTIERE) / kx / SC) + 1, ry = Math.ceil((R + CLAIR_FRONTIERE) / ky / SC) + 1;
  const ci = Math.floor(lon / SC), cj = Math.floor(lat / SC);
  for(let i = ci - rx; i <= ci + rx; i++) for(let j = cj - ry; j <= cj + ry; j++)
    for(const [x1, y1, x2, y2] of frontCases.get(i + ',' + j) || []){
      const ax = (x1 - lon) * kx, ay = (y1 - lat) * ky, dx = (x2 - x1) * kx, dy = (y2 - y1) * ky, L = dx * dx + dy * dy;
      let t = L ? -(ax * dx + ay * dy) / L : 0; t = Math.max(0, Math.min(1, t));
      if(Math.hypot(ax + t * dx, ay + t * dy) < R + CLAIR_FRONTIERE) return false; }
  return true;
}
const rayonKm = (poly, lon, lat) => { const kx = 111.32 * Math.cos(lat * Math.PI / 180); let R = 0; for(const [x, y] of poly.geometry.coordinates[0]) R = Math.max(R, Math.hypot((x - lon) * kx, (y - lat) * 110.57)); return R; };
// Lacs et etangs, sans donnees reelles : trois tailles, places selon le climat (pluie) et la forme du relief.
//   grands lacs (22-62 km de rayon) : au creux des plus grands bassins, loin de la mer, tres espaces ;
//   lacs moyens (8-20 km) : cuvettes et bassins de taille moyenne ;
//   etangs (2-6,5 km) : partout ou il pleut, en semis irreguliers, regroupes autour des lacs (pays d'etangs).
// Un lac ne touche jamais une riviere ni un autre lac (rive libre propre a sa taille) ; le desert n'en a presque pas.
const LACS_ACTIFS = true;   // passer a false pour n'avoir aucun lac
const OFFS = dmax => { const o = [[0, 0]]; for(const d of [dmax / 2, dmax]) for(let a = 0; a < 8; a++) o.push([d * Math.sin(a * Math.PI / 4), d * Math.cos(a * Math.PI / 4)]); return o; };
const TIERS = [
  { nom:'grand', n:42,  r:[22, 62], routes:8, clair:15,  bord:3, espace:420, offs:OFFS(80), scales:[1, 0.8, 0.62] },
  { nom:'moyen', n:230, r:[8, 20],  routes:5, clair:9,   bord:2, espace:120, offs:OFFS(40), scales:[1, 0.8, 0.62] },
  { nom:'etang', n:760, r:[2.2, 6.5], routes:3, clair:3.5, bord:1, espace:30,  offs:OFFS(14), scales:[1, 0.75] },
];
function tryLake(c0, r0, seed, T){
  if(Math.abs(c0[0]) > EDGE_LON - 2) return null;
  const onLandT = ([lon, lat]) => { const c = cellOfPt([lon, lat]); return c >= 0 && land[c] && dist[c] >= T.bord; };
  for(const [ox, oy] of T.offs) for(const scale of T.scales){
    const center = [c0[0] + ox / (111.32 * Math.cos(c0[1] * Math.PI / 180)), c0[1] + oy / 110.57];
    const poly = lakeShape(center, r0 * scale, seed);
    if(!poly.geometry.coordinates[0].every(onLandT)) continue;
    if(!loinDesRoutes(center[0], center[1], rayonKm(poly, center[0], center[1]), T.routes)) continue;
    if(!loinDesFrontieres(center[0], center[1], rayonKm(poly, center[0], center[1]))) continue;
    const halo = turf.buffer(poly, T.clair, { units:'kilometers', steps:6 }), hb = turf.bbox(halo);
    const near = bb => !(hb[0] > bb[2] || hb[2] < bb[0] || hb[1] > bb[3] || hb[3] < bb[1]);
    if(rivers.some((x, k) => near(riverBoxes[k]) && turf.booleanIntersects(halo, x.poly))) continue;
    if(lakes.some((o, k) => near(lakeBoxes[k]) && turf.booleanIntersects(halo, o.poly))) continue;
    return poly;
  }
  return null;
}
const addLake = (poly, tier) => { lakes.push({ poly, tier }); lakeBoxes.push(turf.bbox(poly)); water += turf.area(poly) / 1e6; };
// index des lacs deja poses (cases de 2 degres) : espacement et « pays d'etangs »
const lakeGrid = new Map(), GK = 2;
const gkey = (lon, lat) => Math.floor(lon / GK) + ',' + Math.floor(lat / GK);
const centreLac = [];
const posee = (lon, lat, tier) => { const c = [lon, lat, tier]; centreLac.push(c); const k = gkey(lon, lat); (lakeGrid.get(k) || lakeGrid.set(k, []).get(k)).push(c); };
const kmEntre = (lon1, lat1, lon2, lat2) => { const kx = 111.32 * Math.cos((lat1 + lat2) / 2 * Math.PI / 180); let dl = lon1 - lon2; dl -= 360 * Math.round(dl / 360); return Math.hypot(dl * kx, (lat1 - lat2) * 110.57); };
const voisins = (lon, lat, rKm, f) => { const n = Math.ceil(rKm / (111.32 * Math.max(0.2, Math.cos(lat * Math.PI / 180))) / GK) + 1, m = Math.ceil(rKm / 110.57 / GK) + 1;
  for(let i = -n; i <= n; i++) for(let j = -m; j <= m; j++) for(const c of lakeGrid.get(Math.floor(lon / GK) + i + ',' + (Math.floor(lat / GK) + j)) || []) if(kmEntre(lon, lat, c[0], c[1]) <= rKm && f(c)) return true; return false; };
const maxBassin = Math.max(1, ...basins.map(b => b.size));
function candidats(T){
  const list = [];
  if(T.nom === 'etang'){
    for(let i = 0; i < N; i++){ if(!land[i] || dist[i] < T.bord || rain[i] < 0.18) continue;
      list.push([i, rain[i] * (0.4 + geoHash(i, 11, 401)) ]); }
  } else {
    for(const bs of basins){ const i = bs.sink; if(!land[i] || dist[i] < T.bord) continue; const grand = T.nom === 'grand';
      const t = bs.size / maxBassin; if(grand ? t < 0.12 : t > 0.5) continue;                 // grands : grands bassins ; moyens : les autres
      list.push([i, (0.3 + rain[i]) * (grand ? 1 + 3 * t : 1) * (0.7 + 0.6 * geoHash(i, 13, 409)) * (grand ? Math.min(1.4, dist[i] / 6) : 1)]); }
    for(let i = 0; i < N; i++){ if(T.nom !== 'moyen' || !land[i] || dist[i] < T.bord || rain[i] < 0.25 || geoHash(i, 17, 419) > 0.012) continue; list.push([i, rain[i] * 0.8]); }   // semis de cuvettes diffuses
  }
  return list.sort((x, y) => y[1] - x[1]);
}
const compte = {};
for(const T of (LACS_ACTIFS ? TIERS : [])){
  let poses = 0; const cand = candidats(T);
  for(const [i, sc] of cand){
    if(poses >= T.n) break;
    const lon = lonAt(i % W), lat = latAt((i / W) | 0);
    if(voisins(lon, lat, T.espace, c => c[2] === T.nom)) continue;                           // trop pres d'un lac de meme taille
    if(T.nom === 'etang'){                                                                     // pays d'etangs : plus de chances pres d'un lac
      const pres = voisins(lon, lat, 140, c => c[2] !== 'etang');
      if(!pres && geoHash(i, 23, 431) > 0.35) continue;
    }
    const hsh = geoHash(i, 7, 313), q = T.nom === 'etang' ? Math.pow(hsh, 1.7) : T.nom === 'moyen' ? Math.pow(hsh, 1.3) : hsh;
    const humide = 0.65 + 0.35 * Math.min(1, rain[i] * 1.2);
    const bs = T.nom === 'grand' ? Math.min(1, Math.sqrt((basins.find(b => b.sink === i) || { size:0 }).size / maxBassin) * 1.4) : 0;
    const r0 = (T.r[0] + (T.r[1] - T.r[0]) * Math.min(1, q * 0.6 + bs * 0.4)) * humide;
    const poly = tryLake([lon, lat], r0, i, T);
    if(!poly) continue;
    const c = turf.centroid(poly).geometry.coordinates;
    addLake(poly, T.nom); posee(c[0], c[1], T.nom); poses++;
  }
  compte[T.nom] = poses + ' / ' + T.n;
}
log('lacs', lakes.length, JSON.stringify(compte), 'eau', (water / landKm2 * 100).toFixed(2) + ' %');

// ---- regions: lit des rivieres et lacs retires ----
const topo = JSON.parse(fs.readFileSync(SRC));
const fc = topojson.feature(topo, topo.objects[Object.keys(topo.objects)[0]]);
function unwrapRing(ring){ const out = [[ring[0][0], ring[0][1]]]; let off = 0;
  for(let i = 1; i < ring.length; i++){ const d = ring[i][0] - ring[i-1][0]; if(d > 180) off -= 360; else if(d < -180) off += 360; out.push([ring[i][0] + off, ring[i][1]]); } return out; }
// ---- au moins un point d'eau par region : une region sans lac recoit un etang (une oasis dans le desert) ----
if(LACS_ACTIFS){
  fc.features.forEach(f => { const g = f.geometry;
    if(g.type === 'Polygon') g.coordinates = g.coordinates.map(unwrapRing); else if(g.type === 'MultiPolygon') g.coordinates = g.coordinates.map(p => p.map(unwrapRing)); });
  const fBoxes = fc.features.map(f => turf.bbox(f)), dedans = (pt, k) => pt[0] >= fBoxes[k][0] && pt[0] <= fBoxes[k][2] && pt[1] >= fBoxes[k][1] && pt[1] <= fBoxes[k][3];
  const avec = new Set();
  lakes.forEach(l => { const c = turf.centroid(l.poly).geometry.coordinates;
    for(let k = 0; k < fc.features.length; k++) if(!avec.has(k) && dedans(c, k) && turf.booleanPointInPolygon(c, fc.features[k])){ avec.add(k); break; } });
  const libre = (poly, clair) => { const halo = turf.buffer(poly, clair, { units:'kilometers', steps:6 }), hb = turf.bbox(halo);
    const near = bb => !(hb[0] > bb[2] || hb[2] < bb[0] || hb[1] > bb[3] || hb[3] < bb[1]);
    return !rivers.some((x, k) => near(riverBoxes[k]) && turf.booleanIntersects(halo, x.poly)) && !lakes.some((o, k) => near(lakeBoxes[k]) && turf.booleanIntersects(halo, o.poly)); };
  let ajoutes = 0; const rates = [];
  fc.features.forEach((f, k) => {
    if(avec.has(k)) return;
    const b = fBoxes[k], pts = [];
    for(let i = 0; i < 24; i++) for(let j = 0; j < 24; j++){ const p = [b[0] + (b[2] - b[0]) * (i + .5) / 24, b[1] + (b[3] - b[1]) * (j + .5) / 24];
      if(Math.abs(p[0]) < EDGE_LON - 3 && turf.booleanPointInPolygon(p, f)) pts.push(p); }
    const c0 = pts[0] || [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
    pts.sort((p, q) => geoHash(Math.round(p[0] * 1e3), Math.round(p[1] * 1e3), 977 + k) - geoHash(Math.round(q[0] * 1e3), Math.round(q[1] * 1e3), 977 + k));   // ordre au hasard : pas toujours au centre
    for(const clair of [4, 3.5, 3]) for(const r of [4.5, 3.2, 2.2, 1.5, 1, 0.6]){
      for(const p of pts.slice(0, 120)){
        const poly = lakeShape(p, r, 7919 + k * 31);
        if(!poly.geometry.coordinates[0].every(q => turf.booleanPointInPolygon(q, f))) continue;
        if(!loinDesRoutes(p[0], p[1], rayonKm(poly, p[0], p[1]), 2.5) || !loinDesFrontieres(p[0], p[1], rayonKm(poly, p[0], p[1]))) continue;
        if(!libre(poly, clair)) continue;
        addLake(poly, 'etang'); ajoutes++; avec.add(k); return;
      }
    }
    rates.push(k + 1);
  });
  log('etangs ajoutes pour que chaque region ait un point d\'eau :', ajoutes, rates.length ? '| regions sans place : ' + rates.join(', ') : '| toutes les regions en ont un');
}
// ---- intersections : a chaque confluence, depart de bras ou croisement de deux cours, l'eau forme une vraie jonction ----
// Les deux cours sont fermes l'un sur l'autre autour du point de rencontre (fermeture morphologique de rayon proportionnel
// a la largeur du plus petit) : le coin de terre aigu entre l'affluent et le fleuve est comble et arrondi, la jonction
// est un Y (ou une croix) en eau, sans pointe de terre ni angle vif.
const jonctions = [];
const largeurEn = (w, p) => { let bi = 0, bd = Infinity; w.coords.forEach((c, i) => { const d = Math.hypot(c[0] - p[0], c[1] - p[1]); if(d < bd){ bd = d; bi = i; } }); return w.width[bi]; };
rivers.forEach((w, i) => {
  // extremites rattachees a un autre cours (affluent, bras)
  for(const [pt, fin] of [[w.coords[w.coords.length - 1], true], [w.coords[0], false]]){
    if(fin && !w.joined) continue; if(!fin && !w.startsJoin) continue;
    let best = -1, bd = Infinity; rivers.forEach((o, k) => { if(k === i) return; const d = turf.pointToLineDistance(turf.point(pt), o.line); if(d < bd){ bd = d; best = k; } });
    if(best >= 0 && bd < 40) jonctions.push({ pt, a:i, b:best });
  }
});
{ const lignes = rivers.map(r => r.line), boites = lignes.map(l => turf.bbox(l));
  for(let i = 0; i < rivers.length; i++) for(let j = i + 1; j < rivers.length; j++){
    const A = boites[i], B = boites[j]; if(A[0] > B[2] || B[0] > A[2] || A[1] > B[3] || B[1] > A[3]) continue;
    let x; try{ x = turf.lineIntersect(lignes[i], lignes[j]); }catch(e){ continue; }
    for(const f of x.features){ const pt = f.geometry.coordinates; if(!jonctions.some(q => Math.hypot(q.pt[0] - pt[0], q.pt[1] - pt[1]) < 0.15)) jonctions.push({ pt, a:i, b:j }); } } }
const fillets = []; let nF = 0;
for(const J of jonctions){
  try{
    const A = rivers[J.a], B = rivers[J.b], wmin = Math.min(largeurEn(A, J.pt), largeurEn(B, J.pt)), r = Math.max(1.5, Math.min(12, wmin * 0.8)), R = Math.max(12, r * 6);
    const disque = turf.circle(J.pt, R, { units:'kilometers', steps:24 });
    const parts = [A.poly, B.poly].map(p => { try{ return turf.intersect(turf.featureCollection([p, disque])); }catch(e){ return null; } }).filter(Boolean);
    if(parts.length < 2) continue;
    const U = turf.union(turf.featureCollection(parts)); if(!U) continue;
    const ferme = turf.buffer(turf.buffer(U, r, { units:'kilometers', steps:10 }), -r, { units:'kilometers', steps:10 });
    const dedans = turf.intersect(turf.featureCollection([ferme, disque])); if(dedans){ fillets.push(dedans); nF++; }
  }catch(e){ /* jonction laissee telle quelle */ }
}
log('intersections de cours d\'eau arrondies :', nF, '/', jonctions.length);
const waters = [...rivers.map(r => r.poly), ...fillets, ...lakes.map(l => l.poly)], waterBoxes = waters.map(p => turf.bbox(p));
let carved = 0, failed = 0;
const origParts = new Map();   // parties d'origine de chaque region (avant l'eau), pour reperer les eclats que l'eau a detaches
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
  { const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates; origParts.set(idx, polys.map(c => { const pf = turf.polygon([c[0]]); return { pf, a:turf.area(pf) / 1e6, b:turf.bbox(pf) }; })); }
  try{ const d = turf.difference(turf.featureCollection([f, ...hits])); if(d){ f.geometry = d.geometry; carved++; } }
  catch(e){ // une a une si l'ensemble echoue
    let cur = f; for(const h of hits){ try{ const d = turf.difference(turf.featureCollection([cur, h])); if(d) cur = { type:'Feature', properties:{}, geometry:d.geometry }; }catch(e2){ failed++; } }
    f.geometry = cur.geometry; carved++; }
  if(idx % 50 === 0) log('decoupe', idx, '/', fc.features.length);
});
// ---- eclats : un petit morceau de terre detache d'une grande partie par l'eau (bande entre un fleuve et la mer, ilot entre
// deux bras de delta...) devient de l'eau : bord net, pas de miette de terre. Les vraies petites iles (deja separees avant) restent.
const AIRE_ECLAT = 150;   // km2
let eclats = 0;
fc.features.forEach((f, idx) => {
  const orig = origParts.get(idx); if(!orig) return;
  const g = f.geometry, polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : null; if(!polys || polys.length < 2) return;
  const garde = polys.filter(c => { let a; try{ a = turf.area(turf.polygon([c[0]])) / 1e6; }catch(e){ return true; }
    if(a >= AIRE_ECLAT) return true;
    const ct = turf.centroid(turf.polygon([c[0]])).geometry.coordinates;
    const mere = orig.find(o => ct[0] >= o.b[0] && ct[0] <= o.b[2] && ct[1] >= o.b[1] && ct[1] <= o.b[3] && o.a >= 3 * a && turf.booleanPointInPolygon(ct, o.pf));
    if(mere){ eclats++; return false; } return true; });
  if(garde.length === polys.length) return;
  if(!garde.length) return;
  f.geometry = garde.length === 1 ? { type:'Polygon', coordinates:garde[0] } : { type:'MultiPolygon', coordinates:garde };
});
// ---- ouverture : les parties de terre plus etroites que 2 x OUVERTURE_KM, collees a l'eau creusee (pointes entre un fleuve et la mer,
// croissants au bord d'un delta, languettes), sont retirees : bord net. Une partie etroite qui ne touche pas l'eau (coin de frontiere entre
// regions, cap de la cote) est conservee telle quelle, les frontieres entre regions ne bougent donc pas.
const OUVERTURE_KM = 3.5;
let ouvertes = 0, pointes = 0;
// La terre des regions voisines compte : une bande de terre qui continue de l'autre cote d'une frontiere n'est pas « etroite »
// (sinon l'eau mangeait toute la terre entre un fleuve ou un lac et la frontiere voisine, et se retrouvait collee a elle).
const avantOuverture = fc.features.map(f => f.geometry), boxesO = fc.features.map(f => turf.bbox(f));
fc.features.forEach((f, idx) => {
  if(!origParts.has(idx)) return;                                              // region sans eau creusee
  const fb = turf.bbox(f), proches = waters.filter((w, k) => { const bb = waterBoxes[k]; return !(fb[0] > bb[2] + .1 || fb[2] < bb[0] - .1 || fb[1] > bb[3] + .1 || fb[3] < bb[1] - .1); });
  try{
    let U = f;
    try{ const nb = fc.features.map((g, k) => k !== idx && !(boxesO[k][0] > fb[2] + .05 || boxesO[k][2] < fb[0] - .05 || boxesO[k][1] > fb[3] + .05 || boxesO[k][3] < fb[1] - .05) ? { type:'Feature', properties:{}, geometry:avantOuverture[k] } : null).filter(Boolean);
      if(nb.length){ const u = turf.union(turf.featureCollection([{ type:'Feature', properties:{}, geometry:avantOuverture[idx] }, ...nb])); if(u) U = u; } }catch(e){ U = f; }
    const er = turf.buffer(U, -OUVERTURE_KM, { units:'kilometers', steps:6 });
    if(!er) return;
    const op = turf.buffer(er, OUVERTURE_KM, { units:'kilometers', steps:6 });
    if(!op) return;
    const rest = turf.difference(turf.featureCollection([f, op]));
    if(!rest){ return; }
    const morceaux = (rest.geometry.type === 'Polygon' ? [rest.geometry.coordinates] : rest.geometry.coordinates)
      .map(c => { const pf = turf.polygon([c[0]]); return { c, pf, a:turf.area(pf) / 1e6, bb:turf.bbox(pf) }; })
      .filter(m => m.a >= 0.4 && turf.distance([m.bb[0], m.bb[1]], [m.bb[2], m.bb[3]]) > 3 * OUVERTURE_KM);   // seulement les pieces allongees (pointes, languettes) : le coin arrondi ou une frontiere rejoint la berge reste intact                                                 // (les poussieres le long des bords restent telles quelles)
    const aRetirer = morceaux.filter(m => proches.some((w, k) => { const b2 = turf.bbox(w);
      if(m.bb[0] > b2[2] + .05 || m.bb[2] < b2[0] - .05 || m.bb[1] > b2[3] + .05 || m.bb[3] < b2[1] - .05) return false;
      try{ return turf.booleanIntersects(turf.buffer(m.pf, 0.8, { units:'kilometers', steps:4 }), w); }catch(e){ return false; } }));
    if(!aRetirer.length) return;
    pointes += aRetirer.length;
    let res = f;
    for(const m of aRetirer){ try{ const d = turf.difference(turf.featureCollection([res, m.pf])); if(d) res = d; }catch(e){} }
    if(res !== f && res.geometry){ f.geometry = res.geometry; ouvertes++; }
  }catch(e){ /* region laissee telle quelle */ }
});
// ---- fermeture : aucun bras d'eau (riviere, bras de mer, fil d'eau pointu) plus etroit que MIN_W entre deux terres ----
// Les bras de moins de 2 x FERME_KM de large sont combles, avec la terre voisine (fermeture morphologique de la terre, sans les trous :
// lacs et etangs restent). Un morceau comble est donne a une seule region (la plus petite en numero parmi celles qu'il touche).
const FERME_KM = MIN_W / 2 - 0.1;
{ const snap = fc.features.map(f => f.geometry), boxF = fc.features.map(f => turf.bbox(f));
  const outer = g => g.type === 'Polygon' ? { type:'Polygon', coordinates:[g.coordinates[0]] } : { type:'MultiPolygon', coordinates:g.coordinates.map(c => [c[0]]) };
  const feat = g => ({ type:'Feature', properties:{}, geometry:g });
  let combles = 0;
  fc.features.forEach((f, idx) => {
    try{
      const fb = boxF[idx], voisins = [];
      boxF.forEach((b, k) => { if(k !== idx && !(b[0] > fb[2] + .1 || b[2] < fb[0] - .1 || b[1] > fb[3] + .1 || b[3] < fb[1] - .1)) voisins.push(k); });
      const Uf = voisins.length ? turf.union(turf.featureCollection([idx, ...voisins].map(k => feat(outer(snap[k]))))) : feat(outer(snap[idx]));
      if(!Uf) return;
      const ferme = turf.buffer(turf.buffer(Uf, FERME_KM, { units:'kilometers', steps:8 }), -FERME_KM, { units:'kilometers', steps:8 });
      const gaps = ferme && turf.difference(turf.featureCollection([ferme, Uf])); if(!gaps) return;
      const morceaux = (gaps.geometry.type === 'Polygon' ? [gaps.geometry.coordinates] : gaps.geometry.coordinates).map(c => turf.polygon(c)).filter(p => turf.area(p) / 1e6 > 0.02);
      const aMoi = morceaux.filter(p => { const halo = turf.buffer(p, 0.05, { units:'kilometers', steps:4 });
        for(const k of [...voisins, idx].sort((x, y) => x - y)){ if(!turf.booleanIntersects(halo, feat(snap[k]))) continue; return k === idx; } return false; });
      if(!aMoi.length) return;
      const u = turf.union(turf.featureCollection([feat(snap[idx]), ...aMoi])); if(u){ f.geometry = u.geometry; combles += aMoi.length; }
    }catch(e){ /* region laissee telle quelle */ }
    if(idx % 100 === 0) log('fermeture', idx, '/', fc.features.length);
  });
  log('bras d eau plus etroits que', MIN_W, 'km combles :', combles);
}
// ---- epines : toute partie de terre plus etroite que 2 x EPINE_KM (pointe, fil de terre de largeur presque nulle au bout d'une cote,
// d'une berge ou d'un coin de frontiere) est retiree : les contours ne gardent que des formes nettes. La terre des regions voisines
// compte (les frontieres ne bougent pas).
const EPINE_KM = 0.25, AIRE_EPINE = 1e-4;   // km, km2
{ const snap = fc.features.map(f => f.geometry), boxF = fc.features.map(f => turf.bbox(f));
  const feat = g => ({ type:'Feature', properties:{}, geometry:g });
  let retirees = 0, regionsE = 0;
  fc.features.forEach((f, idx) => {
    try{
      const fb = boxF[idx], voisins = [];
      boxF.forEach((b, k) => { if(k !== idx && !(b[0] > fb[2] + .05 || b[2] < fb[0] - .05 || b[1] > fb[3] + .05 || b[3] < fb[1] - .05)) voisins.push(k); });
      const U = voisins.length ? turf.union(turf.featureCollection([idx, ...voisins].map(k => feat(snap[k])))) : feat(snap[idx]);
      if(!U) return;
      const op = turf.buffer(turf.buffer(U, -EPINE_KM, { units:'kilometers', steps:6 }), EPINE_KM, { units:'kilometers', steps:6 });
      const rest = op && turf.difference(turf.featureCollection([feat(snap[idx]), op])); if(!rest) return;
      const pieces = (rest.geometry.type === 'Polygon' ? [rest.geometry.coordinates] : rest.geometry.coordinates).map(c => turf.polygon(c)).filter(p => turf.area(p) / 1e6 > AIRE_EPINE);
      if(!pieces.length) return;
      let res = feat(snap[idx]);
      for(const p of pieces){ try{ const d = turf.difference(turf.featureCollection([res, p])); if(d){ res = d; retirees++; } }catch(e){} }
      if(res.geometry !== snap[idx]){ f.geometry = res.geometry; regionsE++; }
    }catch(e){ /* region laissee telle quelle */ }
    if(idx % 100 === 0) log('epines', idx, '/', fc.features.length);
  });
  log('epines retirees :', retirees, 'dans', regionsE, 'regions');
}
fc.features.forEach(f => { f.properties = {}; });
log('regions decoupees', carved, 'echecs', failed, '| eclats de terre retires :', eclats, '| pointes etroites retirees :', pointes, 'dans', ouvertes, 'regions');

// ---- ecriture ----
const r3 = v => Math.round(v * 1000) / 1000;
function resample(w, stepKm){ const c = [w.coords[0]], ww = [w.width[0]]; let run = 0;
  for(let i = 1; i < w.coords.length; i++){ run += turf.distance(w.coords[i-1], w.coords[i]); if(run >= stepKm || i === w.coords.length - 1){ c.push(w.coords[i]); ww.push(w.width[i]); run = 0; } }
  return { c:c.map(([x, y]) => [r3(x), r3(y)]), w:ww.map(v => Math.round(v * 10) / 10) }; }
const waterOut = {
  stats:{ landKm2:Math.round(landKm2), waterKm2:Math.round(water), ratio:+(water / landKm2).toFixed(4), rivers:rivers.length, lakes:lakes.length, confluences:joined },
  rivers:rivers.map(w => ({ n:w.name, cls:w.cls, ...(w.canal ? { k:1 } : {}), r:[...(w.regions || [])].sort((a, b) => a - b), ...resample(w, 4) })),
  lakes:lakes.map(l => ({ t:l.tier, p:l.poly.geometry.coordinates[0].map(([x, y]) => [r3(x), r3(y)]), a:Math.round(turf.area(l.poly) / 1e6), r:l.region || null })),
};
fs.writeFileSync(path.join(OUT, 'water.json'), JSON.stringify(waterOut));
// simplification legere (triangles < ~0.25 km2 retires) puis ~400 m de precision: invisible a l'echelle du jeu
// Bords nets : on lisse les arcs EXTERIEURS (cotes et berges, partages par une seule region ; les frontieres entre regions
// ne bougent pas), puis on allege (tolerance 50 m) et on quantifie a ~20 m (avant : simplification de Visvalingam et grille de
// 400 m, d'ou des facettes et des marches d'escalier sur les berges).
let topoOut = topoServer.topology({ regions:fc });
{ const obj = topoOut.objects.regions, use = new Map(), walkA = a => Array.isArray(a) ? a.forEach(walkA) : use.set(a < 0 ? ~a : a, (use.get(a < 0 ? ~a : a) || 0) + 1);
  obj.geometries.forEach(g => walkA(g.arcs));
  const chaikin2 = (pts, closed) => { const n = pts.length, o = []; if(closed){ for(let i = 0; i < n; i++){ const a = pts[i], b = pts[(i + 1) % n]; o.push([.75 * a[0] + .25 * b[0], .75 * a[1] + .25 * b[1]], [.25 * a[0] + .75 * b[0], .25 * a[1] + .75 * b[1]]); } return o; }
    o.push(pts[0]); for(let i = 0; i < n - 1; i++){ const a = pts[i], b = pts[i + 1]; if(i) o.push([.75 * a[0] + .25 * b[0], .75 * a[1] + .25 * b[1]]); if(i < n - 2) o.push([.25 * a[0] + .75 * b[0], .25 * a[1] + .75 * b[1]]); } o.push(pts[n - 1]); return o; };
  const dp = (pts, tol) => { const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1; const st = [[0, pts.length - 1]];
    while(st.length){ const [i, j] = st.pop(); let md = 0, mi = -1; const [x1, y1] = pts[i], [x2, y2] = pts[j], dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy;
      for(let k = i + 1; k < j; k++){ let t = L ? ((pts[k][0] - x1) * dx + (pts[k][1] - y1) * dy) / L : 0; t = Math.max(0, Math.min(1, t)); const d = Math.hypot(pts[k][0] - (x1 + t * dx), pts[k][1] - (y1 + t * dy)); if(d > md){ md = d; mi = k; } }
      if(md > tol){ keep[mi] = 1; st.push([i, mi], [mi, j]); } }
    return pts.filter((_, i) => keep[i]); };
  const ends = new Map(), key = p => p[0].toFixed(7) + ',' + p[1].toFixed(7);
  topoOut.arcs.forEach(a => { for(const p of [a[0], a[a.length - 1]]) ends.set(key(p), (ends.get(key(p)) || 0) + 1); });
  // Lissage sans croisement : un arc qui se croise (lui-meme ou un autre) fait une epine / une fente de mer dans la terre.
  // Chaque arc a une echelle de niveaux du plus doux au plus fidele ; on garde le plus lisse qui ne croise rien.
  const raw = topoOut.arcs, LV = 4;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const xing = (a, b, c, d) => cr(a, b, c) * cr(a, b, d) < 0 && cr(c, d, a) * cr(c, d, b) < 0;
  const build = (a, k, lv) => {
    if(use.get(k) !== 1 || a.length < 3) return lv ? a : dp(a, 0.0003);        // frontiere partagee : juste allegee
    const closed = a.length > 3 && key(a[0]) === key(a[a.length - 1]) && ends.get(key(a[0])) === 2;
    if(lv >= 3) return a;
    let p = closed ? a.slice(0, -1) : a; for(let i = lv === 0 ? 2 : 1; i--;) p = chaikin2(p, closed); if(closed) p.push(p[0]);
    const q = dp(p, [0.0004, 0.0002, 0.0001][lv]); return closed && q.length < 4 ? a : q; };
  const level = raw.map(() => 0); let out = raw.map((a, k) => build(a, k, 0));
  for(let it = 0; it < 8; it++){                                                // croisements : on adoucit moins les arcs fautifs
    const segs = [], grid = new Map(), C = 0.1, bad = new Set();
    out.forEach((a, k) => { for(let j = 0; j < a.length - 1; j++){ const id = segs.push([k, j, a[j], a[j + 1]]) - 1,
      x0 = Math.floor(Math.min(a[j][0], a[j + 1][0]) / C), x1 = Math.floor(Math.max(a[j][0], a[j + 1][0]) / C), y0 = Math.floor(Math.min(a[j][1], a[j + 1][1]) / C), y1 = Math.floor(Math.max(a[j][1], a[j + 1][1]) / C);
      for(let x = x0; x <= x1; x++) for(let y = y0; y <= y1; y++){ const g = x + ',' + y; (grid.get(g) || grid.set(g, []).get(g)).push(id); } } });
    for(const ids of grid.values()) for(let p = 0; p < ids.length; p++) for(let q = p + 1; q < ids.length; q++){ const A = segs[ids[p]], B = segs[ids[q]];
      if(A[0] === B[0] ? Math.abs(A[1] - B[1]) < 2 : false) continue;
      if(xing(A[2], A[3], B[2], B[3])){ bad.add(A[0]); bad.add(B[0]); } }
    if(!bad.size) break;
    let moved = 0; for(const k of bad) if(level[k] < LV - 1){ level[k]++; out[k] = build(raw[k], k, level[k]); moved++; }
    log('croisements :', bad.size, 'arcs adoucis moins'); if(!moved) break;
  }
  topoOut.arcs = out;
}
topoOut = topojson.quantize(topoOut, 2e6);
fs.writeFileSync(path.join(OUT, 'regions-water.topojson'), JSON.stringify(topoOut));
log('ecrit', waterOut.stats, 'water.json', Math.round(fs.statSync(path.join(OUT, 'water.json')).size / 1024) + ' Ko',
  'regions-water.topojson', Math.round(fs.statSync(path.join(OUT, 'regions-water.topojson')).size / 1024) + ' Ko');
