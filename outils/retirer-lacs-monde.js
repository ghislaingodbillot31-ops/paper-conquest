// Retire du globe les lacs qui enfreignent la regle (controle-lacs-monde.js : trop pres d'une riviere, d'une route, d'un autre lac) sans relancer
// build-waterways (trop gourmand en memoire) : le lac est supprime de water.json et son trou est comble dans regions-water.topojson.
// Sauvegardes avant : outils/water.avant-retrait-lacs.json, outils/regions-water.avant-retrait-lacs.topojson. node outils/retirer-lacs-monde.js
const fs = require('fs'), D = __dirname + '/../data/monde/', { fautifs, W } = require('./controle-lacs-monde.js');
const bad = fautifs(), out = new Set([...bad.riviere.map(x => x[0]), ...bad.route.map(x => x[0]), ...bad.lac.map(x => x[1])]);
const T = JSON.parse(fs.readFileSync(D + 'regions-water.topojson')), [sx, sy] = T.transform.scale, [tx, ty] = T.transform.translate;
const arcs = T.arcs.map(a => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
const ring = r => r.flatMap(i => i < 0 ? arcs[~i].slice().reverse() : arcs[i]);
const area = pts => Math.abs(pts.reduce((s, q, i) => { const n = pts[(i + 1) % pts.length]; return s + q[0] * n[1] - n[0] * q[1]; }, 0)) / 2;
const centre = pts => [pts.reduce((s, q) => s + q[0], 0) / pts.length, pts.reduce((s, q) => s + q[1], 0) / pts.length];
const dans = (q, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > q[1]) !== (P[j][1] > q[1]) && q[0] < (P[j][0] - P[i][0]) * (q[1] - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
const cibles = [...out].map(i => ({ i, p:W.lakes[i].p, a:area(W.lakes[i].p), done:false }));
let retires = 0; const trous = [];   // centres de tous les trous (pour reconnaitre un lac jamais creuse)
for (const g of T.objects.regions.geometries) {
  const polys = g.type === 'Polygon' ? [g.arcs] : g.arcs;
  for (const poly of polys) for (let k = poly.length - 1; k >= 1; k--) {            // les trous (anneaux 1..n)
    const pts = ring(poly[k]), c = centre(pts), a = area(pts), L = cibles.find(l => !l.done && dans(c, l.p) && a > l.a * .4 && a < l.a * 2.5);
    if (L) { poly.splice(k, 1); L.done = true; retires++; } else trous.push(c);
  }
}
// lac sans aucun trou dans la geometrie (creusage echoue, jamais creuse) : il n'existe que dans water.json, on l'y retire ; lac fondu avec une riviere
// ou un voisin (trou de taille differente) : laisse en place, signale
for (const l of cibles) if (!l.done && !trous.some(c => dans(c, l.p))) { l.done = true; l.sansTrou = true; }
const rate = cibles.filter(l => !l.done).map(l => l.i);
console.log('lacs a retirer', cibles.length, '| trous combles', retires, '| jamais creuses (retires de water.json seul)', cibles.filter(l => l.sansTrou).length, '| laisses (fondus avec une riviere/un voisin) :', rate.join(',') || 'aucun');
const done = new Set(cibles.filter(l => l.done).map(l => l.i));
W.lakes = W.lakes.filter((_, i) => !done.has(i)); W.stats.lakes = W.lakes.length;
fs.writeFileSync(D + 'water.json', JSON.stringify(W)); fs.writeFileSync(D + 'regions-water.topojson', JSON.stringify(T));
