// controle (lecture seule) de la regle des lacs sur la carte du monde : distance entre chaque lac et les rivieres, les routes, les autres lacs.
// node outils/controle-lacs-monde.js [route_km=3] [riviere_km=3] [lac_km=3]   (equivalent a LAC_DIST de js/carte/eau.js : ~40 m de carte = ~3 km)
const fs = require('fs'), W = JSON.parse(fs.readFileSync(__dirname + '/../data/monde/water.json')), R = JSON.parse(fs.readFileSync(__dirname + '/../data/monde/routes.json'));
const [kr, kv, kl] = [+process.argv[2] || 3, +process.argv[3] || 3, +process.argv[4] || 3];
const K = 111.2, P = ([x, y], l0) => [x * K * Math.cos(l0 * Math.PI / 180), y * K];       // lon/lat -> km (plan local)
function segD(p, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0; return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); }
const bbox = pts => pts.reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [1e9, 1e9, -1e9, -1e9]);
function gap(lake, line, hw, m) {                         // distance lac-tracé (km), prefiltre par boite (m deg)
  const b = bbox(lake.p), c = bbox(line), d = m / 80; if (c[0] > b[2] + d || c[2] < b[0] - d || c[1] > b[3] + d || c[3] < b[1] - d) return Infinity;
  const l0 = (b[1] + b[3]) / 2, A = lake.p.map(q => P(q, l0)), Lp = line.map(q => P(q, l0)); let best = Infinity;
  for (const q of A) for (let i = 0; i < Lp.length - 1; i++) best = Math.min(best, segD(q, Lp[i], Lp[i + 1]) - hw);
  for (const q of Lp) { let ins = false; for (let i = 0, j = A.length - 1; i < A.length; j = i++) if ((A[i][1] > q[1]) !== (A[j][1] > q[1]) && q[0] < (A[j][0] - A[i][0]) * (q[1] - A[i][1]) / (A[j][1] - A[i][1]) + A[i][0]) ins = !ins; if (ins) return -1; }
  return best;
}
function fautifs() {
const bad = { riviere:[], route:[], lac:[] };
W.lakes.forEach((lk, i) => {
  W.rivers.forEach(rv => { const g = gap(lk, rv.c, (Math.max(...(rv.w || [0])) || 0) / 2, kv); if (g < kv) bad.riviere.push([i, rv.n, +g.toFixed(1)]); });
  R.routes.forEach(r => { const g = gap(lk, r[2], 0, kr); if (g < kr) bad.route.push([i, r[0] + '-' + r[1], +g.toFixed(1)]); });
  W.lakes.forEach((o, j) => { if (j > i) { const g = gap(lk, o.p, 0, kl); if (g < kl) bad.lac.push([i, j, +g.toFixed(1)]); } });
});
return bad; }
module.exports = { fautifs, W };
if (require.main === module) { const bad = fautifs();
console.log('lacs', W.lakes.length, '| trop pres de : rivieres', bad.riviere.length, ', routes', bad.route.length, ', autres lacs', bad.lac.length);
for (const k in bad) console.log(k, JSON.stringify(bad[k].slice(0, 6))); }
