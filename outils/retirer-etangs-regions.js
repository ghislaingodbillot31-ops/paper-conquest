// Retire les etangs ajoutes par build-waterways pour les regions « sans lac » (bloc « au moins un point d'eau par region ») quand la region
// a deja de l'eau naturelle (un fleuve ou un vrai lac). Meme methode que retirer-lacs-monde.js : sans relancer build-waterways.
// Les etangs ajoutes sont les derniers de water.json (un par region, posés apres tous les lacs naturels). node outils/retirer-etangs-regions.js [--ecrire]
const fs = require('fs'), D = __dirname + '/../data/monde/', turf = require('@turf/turf'), topojson = require('topojson-client');
const W = JSON.parse(fs.readFileSync(D + 'water.json')), topo = JSON.parse(fs.readFileSync(D + 'admin1.topojson'));
const fc = topojson.feature(topo, topo.objects[Object.keys(topo.objects)[0]]);
const boxes = fc.features.map(f => turf.bbox(f));
const regionDe = ([x, y]) => { for (let k = 0; k < fc.features.length; k++) { const b = boxes[k]; if (x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3] && turf.booleanPointInPolygon([x, y], fc.features[k])) return k; } return -1; };
const centre = pts => [pts.reduce((s, q) => s + q[0], 0) / pts.length, pts.reduce((s, q) => s + q[1], 0) / pts.length];
const reg = W.lakes.map(l => regionDe(centre(l.p)));
// frontiere naturel / ajoute : le plus petit B tel que chaque region ait soit tous ses lacs avant B, soit un seul lac a partir de B
const nb = (arr, k) => arr.filter(r => r === k).length;
let B = W.lakes.length; for (; B > 0; B--) { const apres = reg.slice(B - 1), avant = reg.slice(0, B - 1);
  if (apres.some(k => k >= 0 && (nb(apres, k) > 1 || nb(avant, k) > 0))) break; }
const ajoutes = W.lakes.map((_, i) => i).filter(i => i >= B);
const naturelle = new Set(reg.slice(0, B)); W.rivers.forEach(rv => rv.c.forEach(p => { const k = regionDe(p); if (k >= 0) naturelle.add(k); }));
const aRetirer = ajoutes.filter(i => naturelle.has(reg[i]));
console.log('lacs', W.lakes.length, '| frontiere', B, '| etangs ajoutes', ajoutes.length, '| a retirer (region deja arrosee)', aRetirer.length, '| gardes (region sans autre eau)', ajoutes.length - aRetirer.length);
if (!process.argv.includes('--ecrire')) process.exit(0);
const T = JSON.parse(fs.readFileSync(D + 'regions-water.topojson')), [sx, sy] = T.transform.scale, [tx, ty] = T.transform.translate;
const arcs = T.arcs.map(a => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
const ring = r => r.flatMap(i => i < 0 ? arcs[~i].slice().reverse() : arcs[i]);
const area = pts => Math.abs(pts.reduce((s, q, i) => { const n = pts[(i + 1) % pts.length]; return s + q[0] * n[1] - n[0] * q[1]; }, 0)) / 2;
const dans = (q, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > q[1]) !== (P[j][1] > q[1]) && q[0] < (P[j][0] - P[i][0]) * (q[1] - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
const cibles = aRetirer.map(i => ({ i, p:W.lakes[i].p, a:area(W.lakes[i].p), done:false })); let retires = 0; const trous = [];
for (const g of T.objects.regions.geometries) for (const poly of (g.type === 'Polygon' ? [g.arcs] : g.arcs)) for (let k = poly.length - 1; k >= 1; k--) {
  const pts = ring(poly[k]), c = centre(pts), a = area(pts), L = cibles.find(l => !l.done && dans(c, l.p) && a > l.a * .4 && a < l.a * 2.5);
  if (L) { poly.splice(k, 1); L.done = true; retires++; } else trous.push(c); }
for (const l of cibles) if (!l.done && !trous.some(c => dans(c, l.p))) l.done = true;
const rate = cibles.filter(l => !l.done).map(l => l.i);
console.log('trous combles', retires, '| laisses (fondus avec une riviere/un voisin) :', rate.join(',') || 'aucun');
const done = new Set(cibles.filter(l => l.done).map(l => l.i));
fs.copyFileSync(D + 'water.json', __dirname + '/water.avant-retrait-etangs.json'); fs.copyFileSync(D + 'regions-water.topojson', __dirname + '/regions-water.avant-retrait-etangs.topojson');
W.lakes = W.lakes.filter((_, i) => !done.has(i)); W.stats.lakes = W.lakes.length;
fs.writeFileSync(D + 'water.json', JSON.stringify(W)); fs.writeFileSync(D + 'regions-water.topojson', JSON.stringify(T));
