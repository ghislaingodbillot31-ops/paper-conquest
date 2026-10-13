// Retire les languettes de terre plus etroites que 2 x LARGEUR (ouverture morphologique : tampon negatif puis positif) dans les regions donnees de data/monde/regions-water.topojson :
// les frontieres collees a un fleuve laissaient une bande de terre en forme de lit de riviere. La bande devient de l'eau (le fleuve continue). La topologie est reconstruite.
// Usage : node outils/rouvrir-regions.js 19 23 28 44   (numeros de regions) ; sauvegarde : outils/regions-water.avant-ouverture.topojson
const fs = require('fs'), jsts = require('jsts'), tj = require('topojson-client'), ts = require('topojson-server');
const F = 'data/monde/regions-water.topojson', LARGEUR = 0.03, ids = process.argv.slice(2).map(Number), t = JSON.parse(fs.readFileSync(F));
fs.copyFileSync(F, 'outils/regions-water.avant-ouverture.topojson');
const regs = JSON.parse(fs.readFileSync('data/regions/regions.json')), rd = new jsts.io.GeoJSONReader(), wr = new jsts.io.GeoJSONWriter(), fc = tj.feature(t, t.objects.regions);
for (const id of ids) { const i = regs.findIndex(r => r.id === id), g = rd.read(fc.features[i].geometry), v = g.buffer(-LARGEUR).buffer(LARGEUR); console.log(id, 'surface', (v.getArea() / g.getArea()).toFixed(4)); fc.features[i].geometry = wr.write(v); }
fs.writeFileSync(F, JSON.stringify(tj.quantize(ts.topology({ regions: fc }), 2e6)));
