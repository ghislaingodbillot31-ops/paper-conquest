// Arrondit les coins des COTES (arcs bordes par une seule region : cotes, berges, lacs) de data/monde/regions-water.topojson,
// avec la meme regle que outils/build-formes.js : tout sommet qui tourne de plus de 15 deg devient une courbe (conge quadratique),
// rayon 27 km au plus (150 m de carte a 5,5 m/km), 0,45 de chaque segment au plus, jamais sous 0,5 km.
// Les frontieres entre regions et les jonctions ne bougent pas (pas de trou entre regions).
// Sans risque a relancer a partir de outils/regions-water.avant-arrondi.topojson. Apres : node outils/_controle-bords.js ; node outils/reparer-croisements.js
// Usage : node outils/arrondir-cotes.js [fichier=data/monde/regions-water.topojson]
const fs = require('fs'), F = process.argv[2] || 'data/monde/regions-water.topojson', t = JSON.parse(fs.readFileSync(F));
const MAXKM = 27, FRAC = .45, MINKM = .5, ANGLE = 15, KM = 111.19;
const [sx, sy] = t.transform.scale, [tx, ty] = t.transform.translate;
const arcs = t.arcs.map(a => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
const use = new Map(), walk = a => Array.isArray(a) ? a.forEach(walk) : use.set(a < 0 ? ~a : a, (use.get(a < 0 ? ~a : a) || 0) + 1);
Object.values(t.objects).forEach(o => o.geometries.forEach(g => walk(g.arcs)));
let corners = 0;
const out = arcs.map((a, k) => {
  if (use.get(k) !== 1 || a.length < 3) return a;
  const o = [a[0]];
  for (let i = 1; i < a.length - 1; i++) {
    const p = a[i - 1], b = a[i], c = a[i + 1], q = Math.cos(b[1] * Math.PI / 180);
    const u = [(p[0] - b[0]) * q * KM, (p[1] - b[1]) * KM], v = [(c[0] - b[0]) * q * KM, (c[1] - b[1]) * KM], l1 = Math.hypot(...u), l2 = Math.hypot(...v);
    if (l1 < 1e-6 || l2 < 1e-6) { o.push(b); continue; }
    const cos = (u[0] * v[0] + u[1] * v[1]) / (l1 * l2), turn = 180 - Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
    const r = Math.min(MAXKM, FRAC * l1, FRAC * l2);
    if (turn < ANGLE || r < MINKM) { o.push(b); continue; }
    corners++;
    const p1 = [b[0] + (p[0] - b[0]) * r / l1, b[1] + (p[1] - b[1]) * r / l1], p2 = [b[0] + (c[0] - b[0]) * r / l2, b[1] + (c[1] - b[1]) * r / l2];
    for (let j = 0; j <= 4; j++) { const s = j / 4, w = 1 - s; o.push([w * w * p1[0] + 2 * s * w * b[0] + s * s * p2[0], w * w * p1[1] + 2 * s * w * b[1] + s * s * p2[1]]); }
  }
  o.push(a[a.length - 1]); return o;
});
t.arcs = out.map(a => { let px = 0, py = 0; return a.map(([x, y]) => { const ix = Math.round((x - tx) / sx), iy = Math.round((y - ty) / sy), d = [ix - px, iy - py]; px = ix; py = iy; return d; }); });
fs.writeFileSync(F, JSON.stringify(t));
console.log('coins arrondis :', corners, '| points', arcs.reduce((s, a) => s + a.length, 0), '->', out.reduce((s, a) => s + a.length, 0), '|', Math.round(fs.statSync(F).size / 1024), 'Ko');
