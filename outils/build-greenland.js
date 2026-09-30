// Redecoupe le Groenland en regions compactes (meme nombre de regions, memes
// index dans la collection -> la numerotation des autres regions ne bouge pas).
// Usage: node greenland.js <in.topojson> <out.topojson>
const fs = require('fs');
const topojson = require('topojson-client');
const { topology } = require('topojson-server');
const turf = require('@turf/turf');

const [SRC, DST] = process.argv.slice(2);
const topo = JSON.parse(fs.readFileSync(SRC));
const objName = Object.keys(topo.objects)[0];
const fc = topojson.feature(topo, topo.objects[objName]);
const grlIdx = fc.features.map((f, i) => f.properties.adm0_a3 === 'GRL' ? i : -1).filter(i => i >= 0);
const K = grlIdx.length;

// Projection azimutale de Lambert a aire egale centree sur le Groenland
const R = 6371, LAT0 = 72 * Math.PI / 180, LON0 = -40 * Math.PI / 180;
function fwd([lon, lat]){
  const l = lon * Math.PI / 180 - LON0, p = lat * Math.PI / 180;
  const k = Math.sqrt(2 / (1 + Math.sin(LAT0) * Math.sin(p) + Math.cos(LAT0) * Math.cos(p) * Math.cos(l)));
  return [R * k * Math.cos(p) * Math.sin(l), R * k * (Math.cos(LAT0) * Math.sin(p) - Math.sin(LAT0) * Math.cos(p) * Math.cos(l))];
}
function inv([x, y]){
  const rho = Math.hypot(x, y); if(rho < 1e-9) return [LON0 * 180 / Math.PI, LAT0 * 180 / Math.PI];
  const c = 2 * Math.asin(rho / (2 * R));
  const p = Math.asin(Math.cos(c) * Math.sin(LAT0) + y * Math.sin(c) * Math.cos(LAT0) / rho);
  const l = LON0 + Math.atan2(x * Math.sin(c), rho * Math.cos(LAT0) * Math.cos(c) - y * Math.sin(LAT0) * Math.sin(c));
  return [l * 180 / Math.PI, p * 180 / Math.PI];
}
const mapCoords = (g, fn) => g.type === 'Polygon' ? { type:'Polygon', coordinates:g.coordinates.map(r => r.map(fn)) }
  : { type:'MultiPolygon', coordinates:g.coordinates.map(pl => pl.map(r => r.map(fn))) };

// Terre groenlandaise projetee (km)
let land = turf.union(turf.featureCollection(grlIdx.map(i => turf.feature(mapCoords(fc.features[i].geometry, fwd)))));
const bb = turf.bbox(land);

// Echantillons sur la terre, puis k-means (Lloyd) -> cellules compactes d'aire comparable
const STEP = 12, pts = [];
for(let x = bb[0]; x < bb[2]; x += STEP) for(let y = bb[1]; y < bb[3]; y += STEP)
  if(turf.booleanPointInPolygon([x, y], land)) pts.push([x, y]);
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const cent = [pts[Math.floor(rnd() * pts.length)]];
while(cent.length < K){ // k-means++ deterministe
  const d2 = pts.map(p => Math.min(...cent.map(c => (p[0]-c[0])**2 + (p[1]-c[1])**2)));
  const tot = d2.reduce((a, b) => a + b, 0); let r = rnd() * tot, i = 0;
  while(r > d2[i]){ r -= d2[i]; i++; } cent.push(pts[i]);
}
const lab = new Int32Array(pts.length);
for(let it = 0; it < 200; it++){
  pts.forEach((p, i) => { let b = 0, bd = Infinity; cent.forEach((c, k) => { const d = (p[0]-c[0])**2 + (p[1]-c[1])**2; if(d < bd){ bd = d; b = k; } }); lab[i] = b; });
  const s = cent.map(() => [0, 0, 0]);
  pts.forEach((p, i) => { s[lab[i]][0] += p[0]; s[lab[i]][1] += p[1]; s[lab[i]][2]++; });
  s.forEach((v, k) => { if(v[2]) cent[k] = [v[0] / v[2], v[1] / v[2]]; });
}

// Voronoi des centres, decoupe par la cote, densifie avant de deprojeter
const pad = 800;
const vor = turf.voronoi(turf.featureCollection(cent.map(c => turf.point(c))), { bbox:[bb[0]-pad, bb[1]-pad, bb[2]+pad, bb[3]+pad] });
function densify(ring, maxKm){
  const out = [];
  for(let i = 0; i < ring.length - 1; i++){
    const a = ring[i], b = ring[i+1], n = Math.max(1, Math.ceil(Math.hypot(b[0]-a[0], b[1]-a[1]) / maxKm));
    for(let s = 0; s < n; s++) out.push([a[0] + (b[0]-a[0]) * s / n, a[1] + (b[1]-a[1]) * s / n]);
  }
  out.push(ring[ring.length - 1]); return out;
}
const cells = vor.features.map(v => {
  const cell = turf.polygon([densify(v.geometry.coordinates[0], 8)]);
  const g = turf.intersect(turf.featureCollection([cell, land])).geometry;
  const geo = mapCoords(g, inv);
  const f = turf.feature(geo);
  return { geo, area:turf.area(f) / 1e6, lat:turf.centroid(f).geometry.coordinates[1], lon:turf.centroid(f).geometry.coordinates[0] };
});
cells.sort((a, b) => b.lat - a.lat || a.lon - b.lon);
grlIdx.forEach((idx, k) => {
  const c = cells[k];
  fc.features[idx] = { type:'Feature', properties:{ adm0_a3:'GRL', admin:'Greenland', clusterArea:Math.round(c.area), parts:1 }, geometry:c.geo };
});
console.log('Groenland:', cells.map(c => Math.round(c.area / 1000) + 'k').join(' '));

const out = topology({ [objName]: fc }, 3e5);
fs.writeFileSync(DST, JSON.stringify(out));

// Controle: les voisinages hors Groenland sont conserves
const nbA = topojson.neighbors(topo.objects[objName].geometries), nbB = topojson.neighbors(out.objects[objName].geometries);
let diff = 0; nbA.forEach((l, i) => { if(!grlIdx.includes(i) && l.length !== nbB[i].length) diff++; });
console.log('features', out.objects[objName].geometries.length, 'voisinages modifies hors GRL:', diff,
  'voisins GRL:', grlIdx.map(i => nbB[i].length).join(','));
