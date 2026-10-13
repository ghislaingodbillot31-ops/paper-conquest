// Retire d'une region la terre qui n'existe pas dans le decoupage d'origine (data/monde/admin1.topojson) : triangles a bords droits poses sur la mer (ex. 80, cote est : reste d'une cession de morceau).
// Est enlevee la partie de la region situee a plus de MARGE degres de la terre d'origine de la region et de ses voisines. La topologie est reconstruite. Sauvegarde : outils/regions-water.avant-fausse-terre.topojson
// Usage : node outils/retirer-fausse-terre.js 80 [47 ...]
const fs = require('fs'), jsts = require('jsts'), tj = require('topojson-client'), ts = require('topojson-server');
const F = 'data/monde/regions-water.topojson', MARGE = 0.02, ids = process.argv.slice(2).map(Number), t = JSON.parse(fs.readFileSync(F)), a = JSON.parse(fs.readFileSync('data/monde/admin1.topojson'));
fs.copyFileSync(F, 'outils/regions-water.avant-fausse-terre.topojson');
const rd = new jsts.io.GeoJSONReader(), wr = new jsts.io.GeoJSONWriter(), fc = tj.feature(t, t.objects.regions), orig = tj.feature(a, a.objects[Object.keys(a.objects)[0]]).features;
for (const id of ids) { const g = rd.read(fc.features[id - 1].geometry).buffer(0), terre = rd.read(orig[id - 1].geometry).buffer(MARGE), r = g.difference(terre);
  console.log(id, 'fausse terre retiree :', (r.getArea() / g.getArea() * 100).toFixed(3), '% de la region'); fc.features[id - 1].geometry = wr.write(g.difference(r.buffer(0.0003))); }
fs.writeFileSync(F, JSON.stringify(tj.quantize(ts.topology({ regions: fc }), 2e6)));
