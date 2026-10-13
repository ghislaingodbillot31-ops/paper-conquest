// Les etangs (water.json) places a cheval sur une frontiere de regions etaient coupes net par la frontiere : un moignon d'eau a bord plat (ex. region 23, 163.07 E 64.88 N).
// Ici chaque etang dont le contour touche le bord exterieur de sa region est refait : une forme arrondie de meme surface, placee dans la region a l'ecart des bords (au moins 1,3 rayon + 3 km),
// l'ancien etang est rebouche dans sa region (data/monde/regions-water.topojson) et le nouveau creuse. water.json est mis a jour (lacs : p, a). Sauvegardes : outils/regions-water.avant-etangs.topojson, outils/water.avant-etangs.json.
// Apres : node outils/nettoyer-anneaux.js ; node outils/build-formes.js ; FORMES_V + 1. Usage : node outils/recentrer-etangs.js
const fs = require('fs'), turf = require('@turf/turf'), tj = require('topojson-client'), ts = require('topojson-server');
const FT = 'data/monde/regions-water.topojson', FW = 'data/monde/water.json'; fs.copyFileSync(FT, 'outils/regions-water.avant-etangs.topojson'); fs.copyFileSync(FW, 'outils/water.avant-etangs.json');
const eau = JSON.parse(fs.readFileSync(FW)), t = JSON.parse(fs.readFileSync(FT)), fc = tj.feature(t, t.objects.regions);
const polys = f => f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
const distBord = (p, f) => { let d = 1e9; for (const P of polys(f)) { const r = P[0]; for (let k = 0; k < r.length - 1; k++) { const A = r[k], B = r[k + 1]; if (Math.min(A[0], B[0]) - 0.3 > p[0] || Math.max(A[0], B[0]) + 0.3 < p[0] || Math.min(A[1], B[1]) - 0.3 > p[1] || Math.max(A[1], B[1]) + 0.3 < p[1]) continue; d = Math.min(d, turf.pointToLineDistance(p, turf.lineString([A, B]), { units: 'kilometers' })); } } return d; };
const forme = (c, aKm2, graine) => { const r = Math.sqrt(aKm2 / Math.PI), n = 28, ph = [graine * 1.7, graine * 2.9, graine * 4.3], pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * 2 * Math.PI, k = 1 + .12 * Math.sin(2 * a + ph[0]) + .08 * Math.sin(3 * a + ph[1]) + .05 * Math.sin(5 * a + ph[2]);
    pts.push(turf.destination(c, r * k, a * 180 / Math.PI - 90, { units: 'kilometers' }).geometry.coordinates); } pts.push(pts[0]); return pts; };
let faits = 0, rates = 0;
eau.lakes.forEach((l, i) => {
  if (l.t !== 'etang' || !l.r) return; const f = fc.features[l.r - 1], ring = l.p[0][0] === l.p.at(-1)[0] && l.p[0][1] === l.p.at(-1)[1] ? l.p : [...l.p, l.p[0]];
  if (l.p.filter(p => distBord(p, f) < 0.2).length < 3) return;
  const vieux = turf.polygon([ring]), c0 = turf.centroid(vieux).geometry.coordinates, r = Math.sqrt(l.a / Math.PI); let u = null;
  try { const zone = turf.buffer(vieux, 5, { units: 'kilometers' }), ferme = turf.buffer(turf.buffer(f, 6, { units: 'kilometers', steps: 8 }), -6, { units: 'kilometers', steps: 8 }),   // (l'entaille laissee par l'ancien etang, bord plat compris : fermeture de la region, limitee au voisinage de l'etang)
    trou = turf.intersect(turf.featureCollection([turf.difference(turf.featureCollection([ferme, f])), zone]));
    u = turf.union(turf.featureCollection(trou ? [f, vieux, trou] : [f, vieux])); } catch (e) { rates++; return; }
  const F2 = { type: 'Feature', properties: {}, geometry: u.geometry }; let meilleur = null;
  for (let dx = -0.5; dx <= 0.5; dx += 0.02) for (let dy = -0.25; dy <= 0.25; dy += 0.01) { const p = [c0[0] + dx, c0[1] + dy]; if (!turf.booleanPointInPolygon(p, F2)) continue;
    const d = distBord(p, F2); if (d < r * 1.3 + 3) continue; const s = d - 0.2 * Math.hypot(dx * 55, dy * 111); if (!meilleur || s > meilleur.s) meilleur = { p, s }; }
  if (!meilleur) { rates++; return; }
  const nouveau = turf.polygon([forme(meilleur.p, l.a, i)]); let d2; try { d2 = turf.difference(turf.featureCollection([F2, nouveau])); } catch (e) { rates++; return; } if (!d2) { rates++; return; }
  f.geometry = d2.geometry; l.p = nouveau.geometry.coordinates[0].map(q => [Math.round(q[0] * 1e3) / 1e3, Math.round(q[1] * 1e3) / 1e3]); faits++; });
console.log(faits, 'etangs recentres,', rates, 'echecs');
fs.writeFileSync(FW, JSON.stringify(eau)); fs.writeFileSync(FT, JSON.stringify(tj.quantize(ts.topology({ regions: fc }), 2e6)));
