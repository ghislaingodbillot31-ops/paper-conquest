// Rend valides (sans auto-croisement) les polygones de data/monde/regions-water.topojson : un anneau qui se croise (noeud papillon) est triangule de travers par le rendu
// et laisse des triangles clairs qui traversent la region. JSTS : tampon 0 sur chaque region invalide ; si la surface change de plus de 2 %, remplissage pair-impair
// (les anneaux sont decoupes aux croisements, une face est de la terre si elle est dans un nombre impair d'anneaux). Les regions valides ne changent pas. La topologie (arcs partages) est reconstruite.
// Sauvegarde : outils/regions-water.avant-validation.topojson. Usage : node outils/valider-regions.js
const fs = require('fs'), jsts = require('jsts'), tj = require('topojson-client'), ts = require('topojson-server');
const F = 'data/monde/regions-water.topojson', t = JSON.parse(fs.readFileSync(F)); if (!fs.existsSync('outils/regions-water.avant-validation.topojson')) fs.copyFileSync(F, 'outils/regions-water.avant-validation.topojson');
const rd = new jsts.io.GeoJSONReader(), wr = new jsts.io.GeoJSONWriter(), gf = new jsts.geom.GeometryFactory();
const pairImpair = g => {
  const anneaux = []; for (let i = 0; i < g.getNumGeometries(); i++) { const p = g.getGeometryN(i); anneaux.push(gf.createPolygon(p.getExteriorRing())); for (let h = 0; h < p.getNumInteriorRing(); h++) anneaux.push(gf.createPolygon(p.getInteriorRingN(h))); }
  const lignes = gf.createMultiLineString(anneaux.map(a => gf.createLineString(a.getExteriorRing().getCoordinates()))).union(), pz = new jsts.operation.polygonize.Polygonizer(); pz.add(lignes);
  const faces = pz.getPolygons().toArray().filter(f => { const c = f.getInteriorPoint(); return anneaux.filter(a => a.contains(c)).length % 2 === 1; });
  return gf.createMultiPolygon(faces).buffer(0);
};
const fc = tj.feature(t, t.objects.regions); let n = 0, pe = 0;
for (const f of fc.features) {
  const g = rd.read(f.geometry); if (g.isValid()) continue; n++;
  let v = g.buffer(0); if (Math.abs(v.getArea() / g.getArea() - 1) > 0.02) { v = pairImpair(g); pe++; }
  f.geometry = wr.write(v);
}
console.log('regions invalides corrigees :', n, '| dont pair-impair :', pe);
let topo = ts.topology({ regions: fc }); topo = tj.quantize(topo, 2e6); fs.writeFileSync(F, JSON.stringify(topo));
