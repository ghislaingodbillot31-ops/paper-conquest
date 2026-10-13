// Les lacs de data/monde/water.json a cheval sur une frontiere de regions ne sont parfois creuses que dans une des deux regions : l'autre moitie reste de la terre et le lac finit en moignon sur la frontiere.
// Ici chaque lac est soustrait a TOUTES les regions qu'il touche (data/monde/regions-water.topojson). Sans risque a relancer. La topologie est reconstruite.
// Usage : node outils/recreuser-lacs.js [lonMin latMin lonMax latMax]   ; sauvegarde : outils/regions-water.avant-lacs.topojson
const fs = require('fs'), turf = require('@turf/turf'), tj = require('topojson-client'), ts = require('topojson-server');
const F = 'data/monde/regions-water.topojson', zone = process.argv.slice(2).map(Number);
fs.copyFileSync(F, 'outils/regions-water.avant-lacs.topojson');
const eau = JSON.parse(fs.readFileSync('data/monde/water.json')), t = JSON.parse(fs.readFileSync(F)), fc = tj.feature(t, t.objects.regions);
const boites = fc.features.map(f => turf.bbox(f)), inter = (a, b) => !(a[0] > b[2] || a[2] < b[0] || a[1] > b[3] || a[3] < b[1]);
let touches = 0, coupes = 0;
for (const l of eau.lakes) {
  if (l.p.length < 4) continue; const poly = turf.polygon([l.p[0][0] === l.p.at(-1)[0] && l.p[0][1] === l.p.at(-1)[1] ? l.p : [...l.p, l.p[0]]]), b = turf.bbox(poly);
  if (zone.length && !inter(b, zone)) continue;
  fc.features.forEach((f, i) => { if (!inter(boites[i], b)) return; let x; try { x = turf.intersect(turf.featureCollection([f, poly])); } catch (e) { return; }
    if (!x || turf.area(x) < 2e4) return; touches++;
    try { const d = turf.difference(turf.featureCollection([f, poly])); if (d) { f.geometry = d.geometry; boites[i] = turf.bbox(f); coupes++; } } catch (e) { /* lac laisse */ } });
}
console.log(touches, 'recouvrements lac/region ;', coupes, 'regions recreusees');
fs.writeFileSync(F, JSON.stringify(tj.quantize(ts.topology({ regions: fc }), 2e6)));
