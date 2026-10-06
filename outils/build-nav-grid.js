// Grille de navigation des bateaux (data/monde/nav-grid.json).
// Maille de 0.05 deg (~5 km). Raster CONSERVATEUR: toute case touchee par une
// terre (region, ile, presqu'ile, meme plus fine qu'une case) est un obstacle.
// Valeurs: 0 = terre, 1 = mer. Codage par plages sur chaque ligne:
// [valeur, longueur, valeur, longueur, ...].
// Usage: node build-nav-grid.js <admin1.topojson> <nav-grid.json>
const fs = require('fs');
const topojson = require('topojson-client');

const [SRC, DST] = process.argv.slice(2);
const RES = 0.05, LAT_TOP = 90, LAT_BOT = -70;
const W = Math.round(360 / RES), H = Math.round((LAT_TOP - LAT_BOT) / RES), N = W * H;
const topo = JSON.parse(fs.readFileSync(SRC));
const fc = topojson.feature(topo, topo.objects[Object.keys(topo.objects)[0]]);

const latOf = y => LAT_TOP - (y + 0.5) * RES;
const wrapX = x => ((x % W) + W) % W;
const land = new Uint8Array(N);
function unwrap(ring){
  const out = [[ring[0][0], ring[0][1]]]; let off = 0;
  for(let i = 1; i < ring.length; i++){ const d = ring[i][0] - ring[i-1][0]; if(d > 180) off -= 360; else if(d < -180) off += 360; out.push([ring[i][0] + off, ring[i][1]]); }
  return out;
}
// remplissage par balayage (pair-impair), centre de case
function fillPolygon(rings){
  const rows = new Map();
  for(const raw of rings){ const r = unwrap(raw);
    for(let i = 0; i < r.length - 1; i++){ const [x1, y1] = r[i], [x2, y2] = r[i+1]; if(y1 === y2) continue;
      const lo = Math.min(y1, y2), hi = Math.max(y1, y2);
      const ys = Math.max(0, Math.ceil((LAT_TOP - hi) / RES - 0.5)), ye = Math.min(H - 1, Math.floor((LAT_TOP - lo) / RES - 0.5));
      for(let y = ys; y <= ye; y++){ const lat = latOf(y); if(lat < lo || lat >= hi) continue; if(!rows.has(y)) rows.set(y, []); rows.get(y).push(x1 + (lat - y1) * (x2 - x1) / (y2 - y1)); } } }
  for(const [y, xs] of rows){ xs.sort((a, b) => a - b);
    for(let k = 0; k + 1 < xs.length; k += 2){ const c0 = Math.ceil((xs[k] + 180) / RES - 0.5), c1 = Math.floor((xs[k+1] + 180) / RES - 0.5); for(let c = c0; c <= c1; c++) land[y * W + wrapX(c)] = 1; } }
}
const polys = f => f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
fc.features.forEach(f => polys(f).forEach(fillPolygon));
// conservateur: toute case traversee par un trait de cote est de la terre
fc.features.forEach(f => polys(f).forEach(p => p.forEach(raw => { const r = unwrap(raw);
  for(let k = 0; k < r.length - 1; k++){ const [x1, y1] = r[k], [x2, y2] = r[k+1]; const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / (RES * 0.25)));
    for(let s = 0; s <= n; s++){ const x = x1 + (x2 - x1) * s / n, y = y1 + (y2 - y1) * s / n; const cy = Math.floor((LAT_TOP - y) / RES); if(cy < 0 || cy >= H) continue; land[cy * W + wrapX(Math.floor((x + 180) / RES))] = 1; } } })));

const rows = [];
for(let y = 0; y < H; y++){ const r = []; let v = land[y * W] ? 0 : 1, len = 0;
  for(let x = 0; x < W; x++){ const c = land[y * W + x] ? 0 : 1; if(c === v) len++; else { r.push(v, len); v = c; len = 1; } }
  r.push(v, len); rows.push(r); }
fs.writeFileSync(DST, JSON.stringify({ res:RES, latTop:LAT_TOP, w:W, h:H, rows }));
console.log('grille de navigation:', DST, (fs.statSync(DST).size / 1024).toFixed(0), 'Ko');
