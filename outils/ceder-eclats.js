// Une languette de terre etroite d'une region A, collee a une region B, est rendue a B (ex. 47 -> 80 : pointe de 47 le long de la cote de 80, qui apparait comme un bout de 47 « sous » 80).
// Languette = A moins son ouverture (tampon -LARGEUR puis +LARGEUR) ; seuls les morceaux qui touchent B (a MARGE pres) et de moins de MAX_KM2 sont cedes. La topologie est reconstruite.
// Usage : node outils/ceder-eclats.js A B   ; sauvegarde : outils/regions-water.avant-cession.topojson
const fs = require('fs'), jsts = require('jsts'), tj = require('topojson-client'), ts = require('topojson-server');
const F = 'data/monde/regions-water.topojson', [A, B] = process.argv.slice(2).map(Number), LARGEUR = 0.02, MARGE = 0.01, MAX_KM2 = +process.argv[4] || 100, t = JSON.parse(fs.readFileSync(F));
fs.copyFileSync(F, 'outils/regions-water.avant-cession.topojson');
const rd = new jsts.io.GeoJSONReader(), wr = new jsts.io.GeoJSONWriter(), fc = tj.feature(t, t.objects.regions), ia = A - 1, ib = B - 1;
let ga = rd.read(fc.features[ia].geometry).buffer(0), gb = rd.read(fc.features[ib].geometry).buffer(0), reste = ga.difference(ga.buffer(-LARGEUR).buffer(LARGEUR)), voisin = gb.buffer(MARGE);
let cede = null, n = 0;
// 1. morceaux entiers de A (ilots, enclaves) de moins de MAX_KM2 qui touchent B : rendus a B
for (let i = 0; i < ga.getNumGeometries(); i++) { const p = ga.getGeometryN(i); if (ga.getNumGeometries() > 1 && p.getArea() < MAX_KM2 / 5000 && p.getArea() < 0.05 * ga.getArea() && p.intersects(voisin)) { cede = cede ? cede.union(p) : p; n++; } }
// 2. languettes etroites
for (let i = 0; i < reste.getNumGeometries(); i++) { const p = reste.getGeometryN(i); if (p.getGeometryType() !== 'Polygon' || p.getArea() < 1e-7 || p.getArea() > MAX_KM2 / 5000 || !p.intersects(voisin)) continue; cede = cede ? cede.union(p) : p; n++; }
console.log(n, 'languettes cedees de', A, 'a', B);
if (cede) { fc.features[ia].geometry = wr.write(ga.difference(cede.buffer(0.0005))); fc.features[ib].geometry = wr.write(gb.union(cede.buffer(0.0005))); }
fs.writeFileSync(F, JSON.stringify(tj.quantize(ts.topology({ regions: fc }), 2e6)));
