// Adoucit tous les bords de la carte (cotes et frontieres entre regions) : moins d'angles.
// Travaille arc par arc dans le TopoJSON, donc une frontiere partagee reste identique des deux
// cotes. Les points de jonction (ou 3 regions se rejoignent) ne bougent pas.
// Entree : outils/admin1.brut.topojson (copie du decoupage d'origine, jamais modifiee)
// Sortie : data/monde/admin1.topojson. Sans risque a relancer.
// Usage : node outils/lisser-bords.js [passes=3] [tolerance_deg=0.0004]
// Ensuite relancer : build-nav-grid, build-fishing, build-waterways, build-regions, build-routes, build-formes.
const fs = require('fs'), path = require('path');
const PASSES = +process.argv[2] || 3, TOL = +process.argv[3] || 0.0004, Q = 1e5;   // Q : pas de quantification final (1e-5 deg ~ 1 m)
const IN = path.join(__dirname, 'admin1.brut.topojson'), OUT = path.join(__dirname, '..', 'data', 'monde', 'admin1.topojson');
if(!fs.existsSync(IN)) fs.copyFileSync(OUT, IN);
const topo = JSON.parse(fs.readFileSync(IN));
const [sx, sy] = topo.transform.scale, [tx, ty] = topo.transform.translate;

const decode = a => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); };
const arcs = topo.arcs.map(decode);
const key = p => p[0].toFixed(7) + ',' + p[1].toFixed(7);
const ends = new Map(); arcs.forEach(a => { for(const p of [a[0], a[a.length - 1]]) ends.set(key(p), (ends.get(key(p)) || 0) + 1); });

const chaikin = (pts, closed) => {
  const n = pts.length, out = [];
  if(closed){ for(let i = 0; i < n; i++){ const a = pts[i], b = pts[(i + 1) % n];
    out.push([.75 * a[0] + .25 * b[0], .75 * a[1] + .25 * b[1]], [.25 * a[0] + .75 * b[0], .25 * a[1] + .75 * b[1]]); } return out; }
  out.push(pts[0]);
  for(let i = 0; i < n - 1; i++){ const a = pts[i], b = pts[i + 1];
    if(i > 0) out.push([.75 * a[0] + .25 * b[0], .75 * a[1] + .25 * b[1]]);
    if(i < n - 2) out.push([.25 * a[0] + .75 * b[0], .25 * a[1] + .75 * b[1]]); }
  out.push(pts[n - 1]); return out;
};
const dpSeg = (pts, i, j, tol, keep) => {   // Douglas-Peucker iteratif
  const st = [[i, j]];
  while(st.length){ const [a, b] = st.pop(); let md = 0, mi = -1;
    const [x1, y1] = pts[a], [x2, y2] = pts[b], dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy;
    for(let k = a + 1; k < b; k++){ const [x, y] = pts[k];
      let t = L ? ((x - x1) * dx + (y - y1) * dy) / L : 0; t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)); if(d > md){ md = d; mi = k; } }
    if(md > tol){ keep[mi] = 1; st.push([a, mi], [mi, b]); } }
};
let before = 0, after = 0;
const newArcs = arcs.map(a => {
  before += a.length;
  const closed = a.length > 3 && key(a[0]) === key(a[a.length - 1]) && ends.get(key(a[0])) === 2;   // anneau isole
  let p = closed ? a.slice(0, -1) : a;
  if(p.length < 3) { after += a.length; return a; }
  for(let k = 0; k < PASSES; k++) p = chaikin(p, closed);
  if(closed) p.push(p[0]);
  const keep = new Uint8Array(p.length); keep[0] = keep[p.length - 1] = 1;
  if(closed && p.length > 8) { const m = p.length >> 1; keep[m] = 1; dpSeg(p, 0, m, TOL, keep); dpSeg(p, m, p.length - 1, TOL, keep); }
  else dpSeg(p, 0, p.length - 1, TOL, keep);
  p = p.filter((_, i) => keep[i]);
  if(closed && p.length < 4) p = a;                      // minuscule ile : on ne la detruit pas
  after += p.length; return p;
});

// requantification fine (le pas d'origine, ~100 m, recreerait des marches d'escalier)
topo.transform = { scale: [1 / Q, 1 / Q], translate: [-180, -90] };
topo.arcs = newArcs.map(a => { let px = 0, py = 0; return a.map(([x, y]) => { const ix = Math.round((x + 180) * Q), iy = Math.round((y + 90) * Q), d = [ix - px, iy - py]; px = ix; py = iy; return d; }); });
fs.writeFileSync(OUT, JSON.stringify(topo));
console.log('points', before, '->', after, '| passes', PASSES, 'tolerance', TOL, '|', Math.round(fs.statSync(OUT).size / 1024), 'Ko');
