// Retire de data/monde/regions-water.topojson les anneaux sans surface (zero-aire ou petits (polygones < 0,5 km2 ou petits eclats < ~5 km2 ET < 2 % du plus gros morceau, trous < 1 km2) : pointes, eclats, trous aplatis ou minuscules) et les polygones dont l'anneau exterieur est plat :
// le rendu (earcut) en tire des triangles clairs qui traversent la region. Sauvegarde : outils/regions-water.avant-anneaux.topojson. Sans risque a relancer.
// Usage : node outils/nettoyer-anneaux.js
const fs = require('fs'), F = 'data/monde/regions-water.topojson', t = JSON.parse(fs.readFileSync(F)), tj = require('topojson-client');
fs.copyFileSync(F, 'outils/regions-water.avant-anneaux.topojson');
const [sx, sy] = t.transform.scale, [tx, ty] = t.transform.translate, A = t.arcs.map(a => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
const pts = ring => { const P = []; for (const i of ring) { const a = i < 0 ? A[~i].slice().reverse() : A[i]; P.push(...(P.length ? a.slice(1) : a)); } return P; };
const aire = P => { let s = 0; for (let i = 0; i < P.length - 1; i++) s += P[i][0] * P[i + 1][1] - P[i + 1][0] * P[i][1]; return Math.abs(s) / 2; };
const o = t.objects[Object.keys(t.objects)[0]]; let nA = 0, nP = 0;
for (const g of o.geometries) {
  const polys = g.type === 'Polygon' ? [g.arcs] : g.arcs, sortie = [];
  // eclats : < 0,5 km2, ou < ~5 km2 ET < 2 % du plus gros morceau de la region (moignons laisses par le creusage des fleuves)
  const gros = Math.max(...polys.map(p => aire(pts(p[0]))));
  for (const p of polys) { const ap = aire(pts(p[0])); if (ap < 4e-5 || (ap < 1e-3 && ap < 0.02 * gros)) { nP++; continue; } const q = [p[0]]; for (const h of p.slice(1)) if (aire(pts(h)) < 1.5e-4) nA++; else q.push(h); sortie.push(q); }
  if (g.type === 'Polygon') g.arcs = sortie[0] || []; else g.arcs = sortie;
}
fs.writeFileSync(F, JSON.stringify(t)); console.log('anneaux plats retires :', nA, '| polygones plats retires :', nP);
