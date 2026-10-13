// Recreuse un fleuve de data/monde/water.json dans les regions de data/monde/regions-water.topojson, sur une zone : les bandes de terre laissees a la place du lit (frontiere collee au fleuve) redeviennent de l'eau.
// Le lit est refait comme dans build-waterways.js (morceaux elargis a la largeur du fleuve, reunis) puis soustrait aux regions qu'il touche. La topologie est reconstruite.
// Usage : node outils/recreuser-fleuve.js Kolyma lonMin latMin lonMax latMax   ; sauvegarde : outils/regions-water.avant-recreusage.topojson
const fs = require('fs'), turf = require('@turf/turf'), tj = require('topojson-client'), ts = require('topojson-server');
const [nom, ...b] = process.argv.slice(2), bb = b.map(Number), F = 'data/monde/regions-water.topojson', MIN_W = 0.3;
fs.copyFileSync(F, 'outils/regions-water.avant-recreusage.topojson');
const eau = JSON.parse(fs.readFileSync('data/monde/water.json')), r = eau.rivers.find(x => x.n === nom), t = JSON.parse(fs.readFileSync(F)), fc = tj.feature(t, t.objects.regions);
const dans = p => p[0] >= bb[0] && p[0] <= bb[2] && p[1] >= bb[1] && p[1] <= bb[3], parts = [];
for (let i = 0; i < r.c.length - 1; i++) if (dans(r.c[i]) || dans(r.c[i + 1])) parts.push(turf.buffer(turf.lineString([r.c[i], r.c[i + 1]]), Math.max(MIN_W / 2, r.w[i] / 2), { units: 'kilometers', steps: 14 }));
let lit = parts[0]; for (const p of parts.slice(1)) lit = turf.union(turf.featureCollection([lit, p]));
let n = 0; const lb = turf.bbox(lit);
fc.features.forEach(f => { const x = turf.bbox(f); if (x[0] > lb[2] || x[2] < lb[0] || x[1] > lb[3] || x[3] < lb[1]) return;
  const d = turf.difference(turf.featureCollection([f, lit])); if (d && turf.area(d) < turf.area(f) * 0.9999) { f.geometry = d.geometry; n++; } });
console.log(parts.length, 'morceaux de lit ;', n, 'regions recreusees');
fs.writeFileSync(F, JSON.stringify(tj.quantize(ts.topology({ regions: fc }), 2e6)));
