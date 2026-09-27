// Zones de peche en mer (data/fishing.json), genere hors ligne.
// Formes adaptees a la terre, jamais de simples cercles:
//  - cotiere / hauturiere: le trace donne le long de la cote est elargi
//    ('reach' km), puis limite a une bande de 'band' km autour de la terre
//    voisine: la zone suit le littoral et ses golfes;
//  - pleine-mer: ovale irregulier (quelques ondulations), tenu a 'clear' km
//    des cotes.
// Les contours sont lisses. La page dessine les zones SOUS les terres, qui
// les masquent: seule la partie en mer se voit. Un point d'etiquette en mer
// est calcule pour chaque zone.
// Usage: node build-fishing.js <admin1.topojson> <fishing-zones.json> <sortie fishing.json>
const fs = require('fs');
const turf = require('@turf/turf'), topojson = require('topojson-client');
const [SRC, ZONES, OUT] = process.argv.slice(2);

const topo = JSON.parse(fs.readFileSync(SRC));
const fc = topojson.feature(topo, topo.objects[Object.keys(topo.objects)[0]]);
// terres simplifiees (plus rapide a elargir), anneaux deroules comme dans la page
function unwrapRing(ring){ const out = [[ring[0][0], ring[0][1]]]; let off = 0;
  for(let i = 1; i < ring.length; i++){ const d = ring[i][0] - ring[i-1][0]; if(d > 180) off -= 360; else if(d < -180) off += 360; out.push([ring[i][0] + off, ring[i][1]]); } return out; }
const lands = fc.features.map(f => {
  const g = f.geometry; if(g.type === 'Polygon') g.coordinates = g.coordinates.map(unwrapRing); else g.coordinates = g.coordinates.map(p => p.map(unwrapRing));
  let s; try{ s = turf.simplify(f, { tolerance:0.03, highQuality:false }); }catch(e){ s = f; }   // ilots degeneres: gardes tels quels
  s.bbox = turf.bbox(s); return s; });
const hitsBox = (bb, pad) => lands.filter(l => !(l.bbox[0] > bb[2] + pad || l.bbox[2] < bb[0] - pad || l.bbox[1] > bb[3] + pad || l.bbox[3] < bb[1] - pad));
const union = list => list.length > 1 ? turf.union(turf.featureCollection(list)) : list[0];
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const nameSeed = n => [...n].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7) >>> 0;
const kmDeg = (km, lat) => km / (111.32 * Math.cos(lat * Math.PI / 180));

function ovalZone(z){
  const [lon0, lat0] = z.center, seed = nameSeed(z.name), rot = (z.rot || 0) * Math.PI / 180, ring = [];
  const H = [[2, 0.05 + hash(seed, 1) * 0.07], [3, 0.04 + hash(seed, 2) * 0.08], [5, hash(seed, 3) * 0.05]];
  for(let i = 0; i < 128; i++){ const a = i / 128 * 2 * Math.PI;
    let f = 1; H.forEach(([k, amp], j) => { f += amp * Math.sin(k * a + hash(seed, 10 + j) * 6.28); });
    const x = Math.cos(a) * z.rx * f, y = Math.sin(a) * z.ry * f;
    const xr = x * Math.cos(rot) - y * Math.sin(rot), yr = x * Math.sin(rot) + y * Math.cos(rot);
    ring.push([lon0 + kmDeg(xr, lat0), lat0 + yr / 110.57]); }
  ring.push(ring[0]);
  let shape = turf.polygon([ring]);
  const near = hitsBox(turf.bbox(shape), 3);
  if(near.length && z.clear){
    const keepOut = turf.buffer(union(near), z.clear, { units:'kilometers', steps:6 });
    const d = turf.difference(turf.featureCollection([shape, keepOut])); if(d) shape = d;
  }
  return shape;
}
function coastZone(z){
  const line = turf.lineString(z.line);
  let shape = turf.buffer(line, z.reach, { units:'kilometers', steps:10 });
  const near = hitsBox(turf.bbox(shape), 1);
  if(near.length){
    const bandPoly = turf.buffer(union(near), z.band, { units:'kilometers', steps:6 });
    const i = turf.intersect(turf.featureCollection([shape, bandPoly])); if(i) shape = i;
  }
  return shape;
}
// point d'etiquette en mer: au plus loin des terres parmi des points de la zone
function labelPoint(shape){
  const bb = turf.bbox(shape), near = hitsBox(bb, 0.5), step = Math.max(0.3, Math.min(bb[2] - bb[0], bb[3] - bb[1]) / 12);
  let best = null, bd = -1;
  for(let x = bb[0]; x <= bb[2]; x += step) for(let y = bb[1]; y <= bb[3]; y += step){
    const pt = [x, y]; if(!turf.booleanPointInPolygon(pt, shape)) continue;
    if(near.some(l => turf.booleanPointInPolygon(pt, l))) continue;
    let d = Infinity; for(const l of near){ const c = turf.nearestPointOnLine(turf.polygonToLine(l).type === 'FeatureCollection' ? turf.polygonToLine(l).features[0] : turf.polygonToLine(l), pt); d = Math.min(d, turf.distance(pt, c)); if(d < bd) break; }
    if(d > bd){ bd = d; best = pt; } }
  return best || turf.pointOnFeature(shape).geometry.coordinates;
}
const r3 = v => Math.round(v * 1000) / 1000;
// Priorite: cotieres, puis hauturieres, puis pleine mer. Chaque zone perd
// ce que les zones prioritaires occupent deja: aucun chevauchement.
const PRIO = { cotiere:0, hauturiere:1, 'pleine-mer':2 };
const zones = JSON.parse(fs.readFileSync(ZONES)).zones.map((z, i) => ({ z, i })).sort((a, b) => PRIO[a.z.type] - PRIO[b.z.type] || a.i - b.i);
const taken = [], out = [];
for(const { z, i } of zones){
  let shape = z.type === 'pleine-mer' ? ovalZone(z) : coastZone(z);
  try{ if(shape.geometry.type === 'Polygon') shape = turf.polygonSmooth(shape, { iterations:2 }).features[0]; }catch(e){}
  const bb = turf.bbox(shape);
  const over = taken.filter(t => !(t.bbox[0] > bb[2] || t.bbox[2] < bb[0] || t.bbox[1] > bb[3] || t.bbox[3] < bb[1]));
  if(over.length){ try{ const d = turf.difference(turf.featureCollection([shape, ...over])); if(d) shape = d; }catch(e){ console.warn('chevauchement non retire:', z.name, e.message); } }
  try{ shape = turf.simplify(shape, { tolerance:0.02, highQuality:true }); }catch(e){}
  shape.bbox = turf.bbox(shape); taken.push(shape);
  const g = shape.geometry, round = rings => rings.map(r => r.map(([x, y]) => [r3(x), r3(y)]));
  out[i] = { name:z.name, type:z.type, fish:z.fish, label:labelPoint(shape).map(r3),
    geometry:{ type:g.type, coordinates:g.type === 'Polygon' ? round(g.coordinates) : g.coordinates.map(round) },
    km2:Math.round(turf.area(shape) / 1e6) };
  console.log(z.name.padEnd(36), z.type.padEnd(11), (out[i].km2 + ' km2').padStart(12));
}
fs.writeFileSync(OUT, JSON.stringify({ zones:out }));
console.log(out.length, 'zones ->', OUT, Math.round(fs.statSync(OUT).size / 1024) + ' Ko');
