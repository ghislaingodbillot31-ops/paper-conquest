// Villes (capitales) des régions : placement ALÉATOIRE à distance de l'eau (12/10).
//   node outils/placer-capitales.js         (depuis la racine du projet, avec @turf/turf et topojson-client)
// Pour chaque région, des points tirés au hasard (graine = numéro de la région : toujours le même résultat) dans sa terre — data/monde/regions-water.topojson, où les fleuves, les lacs et la mer sont déjà creusés —
// jusqu'à en trouver un dont la distance au contour de la terre (rive, mer, frontière) ET à tous les fleuves, rivières et lacs de water.json est d'au moins 60 km. Si la région est trop mince, la distance est réduite par paliers (60, 45, 32, 22, 14, 8, 3 km).
// La capitale est écrite dans data/regions/regions.json (l'ancien fichier est gardé dans outils/regions.avant-capitales.json).
// Ensuite : node outils/build-routes.js, puis la copie de data/monde/routes.json dans outils/routes.avant-lissage.json, node outils/lisser-routes.js, node outils/build-formes.js.
const fs = require('fs'), path = require('path');
const turf = require('@turf/turf'), topojson = require('topojson-client');
const ROOT = path.join(__dirname, '..'), FR = path.join(ROOT, 'data/regions/regions.json');
const PALIERS = [60, 45, 32, 22, 14, 8, 3], ESSAIS = 800;   // km ; 1 km réel ≈ 1,2 m sur la carte de la région : 60 km ≈ 70 m de terrain entre la capitale et le plus proche plan d'eau
if (!fs.existsSync(path.join(__dirname, 'regions.avant-capitales.json'))) fs.copyFileSync(FR, path.join(__dirname, 'regions.avant-capitales.json'));
let texte = fs.readFileSync(FR, 'utf8');
const regions = JSON.parse(texte), topo = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/monde/regions-water.topojson'), 'utf8')), obj = topo.objects[Object.keys(topo.objects)[0]];
const terres = topojson.feature(topo, obj).features, eau = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/monde/water.json'), 'utf8'));
const boite = pts => pts.reduce((m, c) => [Math.min(m[0], c[0]), Math.min(m[1], c[1]), Math.max(m[2], c[0]), Math.max(m[3], c[1])], [1e9, 1e9, -1e9, -1e9]);
const plans = [...eau.rivers.map(r => r.c), ...eau.lakes.map(l => l.p)].filter(c => c.length > 1).map(c => ({ l:turf.lineString(c), b:boite(c) }));   // fleuves, rivières ET tous les lacs (même les petits, absents du contour creusé)
if (terres.length !== regions.length) throw new Error('nombre de régions différent : ' + terres.length + ' / ' + regions.length);
const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
const r4 = x => Math.round(x * 1e4) / 1e4;
let dMin = 99, relaches = 0;
const resultat = regions.map((reg, i) => {
  const f = terres[i], rnd = seeded(reg.id * 7919 + 12), bb = turf.bbox(f), lignes = [];
  for (const q of plans) if (q.b[0] < bb[2] + .6 && q.b[2] > bb[0] - .6 && q.b[1] < bb[3] + .6 && q.b[3] > bb[1] - .6) lignes.push({ ...q.l, _b:q.b });
  const pl = turf.polygonToLine(f); (pl.type === 'FeatureCollection' ? pl.features : [pl]).forEach(l => l.geometry.type === 'MultiLineString' ? l.geometry.coordinates.forEach(c => lignes.push(turf.lineString(c))) : lignes.push(l));
  const dist = p => { let m = Infinity; for (const l of lignes) { const lb = l._b || turf.bbox(l); if (p[0] < lb[0] - 1 || p[0] > lb[2] + 1 || p[1] < lb[1] - 1 || p[1] > lb[3] + 1) continue; m = Math.min(m, turf.pointToLineDistance(turf.point(p), l, { units:'kilometers' })); } return m; };   // (les anneaux loin du point sont ignorés : rapide)
  const candidats = []; for (let k = 0; k < ESSAIS; k++) { const p = [bb[0] + rnd() * (bb[2] - bb[0]), bb[1] + rnd() * (bb[3] - bb[1])]; if (turf.booleanPointInPolygon(turf.point(p), f)) candidats.push(p); }
  for (const D of PALIERS) { for (const p of candidats) { const d = dist(p); if (d >= D) { if (D < PALIERS[0]) relaches++; dMin = Math.min(dMin, d); return [reg.id, [r4(p[0]), r4(p[1])], Math.round(d)]; } } }
  return [reg.id, reg.capitale, -1];                                                              // (aucune solution : l'ancienne capitale est gardée)
});
for (const [id, c] of resultat) texte = texte.replace(new RegExp('("id": ' + id + ', "pays": "[A-Z0-9]+", "centre": \\[[^\\]]*\\], "capitale": )\\[[^\\]]*\\]'), '$1[' + c.join(',') + ']');
fs.writeFileSync(FR, texte);
const sans = resultat.filter(r => r[2] < 0).length, d = resultat.filter(r => r[2] >= 0).map(r => r[2]).sort((a, b) => a - b);
console.log(`${resultat.length} capitales placées · distance minimale à l'eau : ${d[0]} km (médiane ${d[Math.floor(d.length / 2)]} km) · ${relaches} régions avec distance réduite · ${sans} sans solution`);
