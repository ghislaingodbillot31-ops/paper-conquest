// Frontieres entre regions du globe : data/monde/frontieres.json (lignes lon/lat), lues par js/jeu/globe.js.
// Avant, le globe ne dessinait que les arcs TopoJSON partages par deux regions ; apres les decoupes d'eau et les reparations, beaucoup de frontieres n'etaient plus partagees et leur trait disparaissait.
// Ici : le bord de chaque region est echantillonne tous les PAS degres ; un point est "frontiere" s'il a, a moins de TOL degres, un point de bord d'UNE AUTRE region (sinon c'est une cote, une berge ou un lac : pas de trait).
// Les points frontiere consecutifs forment des lignes ; chaque frontiere n'est dessinee qu'une fois (region de plus petit numero). Usage : node outils/build-frontieres.js
const fs = require('fs'), tj = require('topojson-client');
const PAS = 0.01, TOL = 0.012, t = JSON.parse(fs.readFileSync('data/monde/regions-water.topojson')), F = tj.feature(t, t.objects.regions).features;
const cle = (x, y) => Math.floor(x / TOL) + ',' + Math.floor(y / TOL), grille = new Map(), anneaux = [];
F.forEach((f, i) => { for (const P of f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates) { const r = P[0], pts = [r[0]];   // (seul l'anneau exterieur : les trous sont des lacs)
  for (let k = 1; k < r.length; k++) { const a = r[k - 1], b = r[k], n = Math.max(1, Math.ceil(Math.hypot((b[0] - a[0]) * Math.cos(a[1] * Math.PI / 180), b[1] - a[1]) / PAS)); for (let j = 1; j <= n; j++) pts.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); }
  anneaux.push([i, pts]); for (const p of pts) { const c = cle(p[0], p[1]); (grille.get(c) || grille.set(c, []).get(c)).push(i); } } });
const voisine = (p, i) => { const gx = Math.floor(p[0] / TOL), gy = Math.floor(p[1] / TOL); let m = -1;
  for (let x = gx - 1; x <= gx + 1; x++) for (let y = gy - 1; y <= gy + 1; y++) for (const j of grille.get(x + ',' + y) || []) if (j !== i) { m = m < 0 || j < m ? j : m; } return m; };
const lignes = []; let nPts = 0;
for (const [i, pts] of anneaux) { let cur = [];
  for (const p of pts) { const j = voisine(p, i); if (j >= 0 && i < j) cur.push(p); else { if (cur.length > 1) lignes.push(cur); cur = []; } }
  if (cur.length > 1) lignes.push(cur); }
const dp = (P, tol) => { const keep = new Uint8Array(P.length); keep[0] = keep[P.length - 1] = 1; const st = [[0, P.length - 1]];
  while (st.length) { const [i, j] = st.pop(); let md = 0, mi = -1; const [x1, y1] = P[i], [x2, y2] = P[j], dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy;
    for (let k = i + 1; k < j; k++) { let u = L ? ((P[k][0] - x1) * dx + (P[k][1] - y1) * dy) / L : 0; u = Math.max(0, Math.min(1, u)); const d = Math.hypot(P[k][0] - (x1 + u * dx), P[k][1] - (y1 + u * dy)); if (d > md) { md = d; mi = k; } }
    if (md > tol) { keep[mi] = 1; st.push([i, mi], [mi, j]); } } return P.filter((_, i) => keep[i]); };
const r4 = x => Math.round(x * 1e4) / 1e4, sortie = lignes.map(l => dp(l, 0.0015).map(p => [r4(p[0]), r4(p[1])])).filter(l => l.length > 1); sortie.forEach(l => nPts += l.length);
fs.writeFileSync('data/monde/frontieres.json', JSON.stringify(sortie)); console.log(sortie.length, 'lignes,', nPts, 'points,', Math.round(fs.statSync('data/monde/frontieres.json').size / 1024), 'Ko');
