// Redecoupe un groupe de regions en cellules compactes d'aire comparable.
// - meme nombre de regions, memes index (numeros) -> rien d'autre ne bouge;
// - la frontiere EXTERIEURE du groupe (cotes + voisins hors groupe) est
//   conservee a l'identique: le decoupage se fait en lon/lat par
//   intersection avec les terres d'origine, seules les frontieres internes
//   sont nouvelles;
// - chaque masse de terre recoit un nombre de regions proportionnel a son
//   aire; les ilots trop petits rejoignent la region la plus proche;
// - frontieres internes legerement ondulees (champ de deformation continu,
//   identique des deux cotes d'une frontiere).
// Usage: node repartition.js <in.topojson> <out.topojson> '<groupe JSON>' ...
//   groupe = {"countries":["USA","CAN"],"exclude":[12],"center":[-100,50]}
//         ou {"ids":[220,238,262],"center":[-10,25]}
const fs = require('fs');
const topojson = require('topojson-client');
const { topology } = require('topojson-server');
const turf = require('@turf/turf');
const { warpKm } = require('./warp');

const [SRC, DST, ...groupArgs] = process.argv.slice(2);
const topo = JSON.parse(fs.readFileSync(SRC));
const objName = Object.keys(topo.objects)[0];
const fc = topojson.feature(topo, topo.objects[objName]);

function makeProj(lon0d, lat0d){
  const R = 6371, LAT0 = lat0d * Math.PI / 180, LON0 = lon0d * Math.PI / 180;
  return {
    fwd([lon, lat]){
      let l = lon * Math.PI / 180 - LON0; while(l > Math.PI) l -= 2 * Math.PI; while(l < -Math.PI) l += 2 * Math.PI;
      const p = lat * Math.PI / 180;
      const k = Math.sqrt(2 / (1 + Math.sin(LAT0) * Math.sin(p) + Math.cos(LAT0) * Math.cos(p) * Math.cos(l)));
      return [R * k * Math.cos(p) * Math.sin(l), R * k * (Math.cos(LAT0) * Math.sin(p) - Math.sin(LAT0) * Math.cos(p) * Math.cos(l))];
    },
    inv([x, y]){
      const rho = Math.hypot(x, y); if(rho < 1e-9) return [lon0d, lat0d];
      const c = 2 * Math.asin(Math.min(1, rho / (2 * R)));
      const p = Math.asin(Math.cos(c) * Math.sin(LAT0) + y * Math.sin(c) * Math.cos(LAT0) / rho);
      const l = LON0 + Math.atan2(x * Math.sin(c), rho * Math.cos(LAT0) * Math.cos(c) - y * Math.sin(LAT0) * Math.sin(c));
      return [l * 180 / Math.PI, p * 180 / Math.PI];
    },
  };
}
const polysOf = g => g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
function densify(ring, maxKm){
  const out = [];
  for(let i = 0; i < ring.length - 1; i++){
    const a = ring[i], b = ring[i+1], n = Math.max(1, Math.ceil(Math.hypot(b[0]-a[0], b[1]-a[1]) / maxKm));
    for(let s = 0; s < n; s++) out.push([a[0] + (b[0]-a[0]) * s / n, a[1] + (b[1]-a[1]) * s / n]);
  }
  out.push(ring[ring.length - 1]); return out;
}
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function kmeans(pts, k){
  const cent = [pts[Math.floor(rnd() * pts.length)]];
  while(cent.length < k){
    const d2 = pts.map(p => Math.min(...cent.map(c => (p[0]-c[0])**2 + (p[1]-c[1])**2)));
    let r = rnd() * d2.reduce((a, b) => a + b, 0), i = 0; while(r > d2[i]){ r -= d2[i]; i++; } cent.push(pts[i]);
  }
  const lab = new Int32Array(pts.length);
  for(let it = 0; it < 150; it++){
    pts.forEach((p, i) => { let b = 0, bd = Infinity; cent.forEach((c, j) => { const d = (p[0]-c[0])**2 + (p[1]-c[1])**2; if(d < bd){ bd = d; b = j; } }); lab[i] = b; });
    const s = cent.map(() => [0, 0, 0]); pts.forEach((p, i) => { s[lab[i]][0] += p[0]; s[lab[i]][1] += p[1]; s[lab[i]][2]++; });
    s.forEach((v, j) => { if(v[2]) cent[j] = [v[0] / v[2], v[1] / v[2]]; });
  }
  return cent;
}

// '@fichier.json' = liste de groupes
const groupList = groupArgs.flatMap(a => a.startsWith('@') ? JSON.parse(fs.readFileSync(a.slice(1))) : [JSON.parse(a)]);

// Anneaux traversant l'antimeridien (+-180, ex. extremite est de la Russie):
// deroules puis ramenes dans le meme 'tour du monde' que le centre du groupe,
// pour que les operations planes (union, decoupe) restent correctes.
function unwrapRing(ring){
  const out = [[ring[0][0], ring[0][1]]]; let off = 0;
  for(let i = 1; i < ring.length; i++){ const d = ring[i][0] - ring[i-1][0]; if(d > 180) off -= 360; else if(d < -180) off += 360; out.push([ring[i][0] + off, ring[i][1]]); }
  return out;
}
function normalizeGeometry(g, lonRef){
  const fix = ring => { const r = unwrapRing(ring); const m = r.reduce((a, p) => a + p[0], 0) / r.length; const k = Math.round((lonRef - m) / 360); return k ? r.map(([x, y]) => [x + k * 360, y]) : ring; };
  return g.type === 'Polygon' ? { type:'Polygon', coordinates:g.coordinates.map(fix) } : { type:'MultiPolygon', coordinates:g.coordinates.map(p => p.map(fix)) };
}
function autoCenter(features){
  // moyenne circulaire des longitudes (ponderee par l'aire) + latitude moyenne
  let sx = 0, sy = 0, sl = 0, sw = 0;
  features.forEach(f => { const c = turf.centroid(f).geometry.coordinates, w = turf.area(f); sx += Math.cos(c[0] * Math.PI / 180) * w; sy += Math.sin(c[0] * Math.PI / 180) * w; sl += c[1] * w; sw += w; });
  return [Math.atan2(sy, sx) * 180 / Math.PI, sl / sw];
}

for(const G of groupList){
  const idx = fc.features.map((f, i) => i).filter(i =>
    (G.ids ? G.ids.includes(i + 1) : G.countries.includes(fc.features[i].properties.adm0_a3)) && !(G.exclude || []).includes(i + 1));
  const K = idx.length;
  const center = G.center || autoCenter(idx.map(i => fc.features[i]));
  idx.forEach(i => { fc.features[i].geometry = normalizeGeometry(fc.features[i].geometry, center[0]); });
  const proj = makeProj(center[0], center[1]);
  const union = turf.union(turf.featureCollection(idx.map(i => fc.features[i])));
  const masses = polysOf(union.geometry).map(p => {
    const f = turf.polygon(p); return { geo:p, area:turf.area(f) / 1e6, pf:turf.polygon(p.map(r => r.map(proj.fwd))) };
  });
  const total = masses.reduce((s, m) => s + m.area, 0), target = total / K;
  // repartition du nombre de regions par masse de terre (plus forts restes)
  masses.forEach(m => { m.q = m.area / target; m.k = Math.floor(m.q); });
  // Archipel isole (ex. Hawai): iles a moins de 300 km les unes des autres,
  // a plus de 800 km de toute autre terre du groupe -> garde sa propre
  // region plutot que d'etre collee a une cote lointaine.
  masses.forEach(m => { const v = m.pf.geometry.coordinates[0]; m.samp = v.filter((_, i) => i % Math.ceil(v.length / 300) === 0); });
  const gap = (m, o) => { let d = Infinity; for(const p of m.samp) for(const q of o.samp){ const e = Math.hypot(p[0]-q[0], p[1]-q[1]); if(e < d) d = e; } return d; };
  const arch = masses.map((_, i) => i), fa = x => arch[x] === x ? x : (arch[x] = fa(arch[x]));
  for(let i = 0; i < masses.length; i++) for(let j = i + 1; j < masses.length; j++) if(gap(masses[i], masses[j]) < 300) arch[fa(i)] = fa(j);
  const groups = new Map(); masses.forEach((m, i) => { const r = fa(i); if(!groups.has(r)) groups.set(r, []); groups.get(r).push(m); });
  for(const list of groups.values()){
    if(list.some(m => m.k > 0) || list.reduce((s, m) => s + m.area, 0) < target * 0.04) continue;
    const others = masses.filter(m => !list.includes(m));
    if(others.every(o => list.every(m => gap(m, o) > 800))) list.sort((x, y) => y.area - x.area)[0].k = 1;
  }
  let left = K - masses.reduce((s, m) => s + m.k, 0);
  [...masses].sort((a, b) => (b.q - b.k) - (a.q - a.k)).forEach(m => { if(left > 0 && m.q > 0.45){ m.k++; left--; } });
  if(left > 0) [...masses].sort((a, b) => b.area - a.area)[0].k += left;
  while(left < 0){ [...masses].filter(m => m.k > 1).sort((a, b) => (a.q - a.k) - (b.q - b.k))[0].k--; left++; }

  const cells = []; // { parts: [polygon coords lon/lat], cproj }
  for(const m of masses.filter(m => m.k > 0)){
    const bb = turf.bbox(m.pf), step = Math.max(6, Math.sqrt(m.area / 4000));
    const pts = [];
    for(let x = bb[0]; x < bb[2]; x += step) for(let y = bb[1]; y < bb[3]; y += step) if(turf.booleanPointInPolygon([x, y], m.pf)) pts.push([x, y]);
    if(pts.length < m.k) pts.push(...turf.explode(m.pf).features.map(f => f.geometry.coordinates));
    const cent = m.k === 1 ? [pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0])] : kmeans(pts, m.k);
    const pad = 1500;
    const vor = m.k === 1 ? null : turf.voronoi(turf.featureCollection(cent.map(c => turf.point(c))), { bbox:[bb[0]-pad, bb[1]-pad, bb[2]+pad, bb[3]+pad] });
    cent.forEach((c, j) => {
      let parts = [m.geo];
      if(vor){
        // cellule densifiee + ondulee (en km, dans la projection), puis
        // ramenee en lon/lat et decoupee par la vraie terre d'origine
        const ring = densify(vor.features[j].geometry.coordinates[0], 8).map(p => { const w = warpKm(proj.inv(p)); return proj.inv([p[0] + w[0], p[1] + w[1]]); });
        const inter = turf.intersect(turf.featureCollection([turf.polygon([ring]), turf.polygon(m.geo)]));
        parts = inter ? polysOf(inter.geometry) : [];
      }
      cells.push({ parts, cproj:c });
    });
  }
  // ilots sans region propre: rattaches a la cellule dont le centre est le plus proche
  for(const m of masses.filter(m => m.k === 0)){
    const c = turf.centroid(m.pf).geometry.coordinates;
    let b = 0, bd = Infinity; cells.forEach((cl, j) => { const d = (cl.cproj[0]-c[0])**2 + (cl.cproj[1]-c[1])**2; if(d < bd){ bd = d; b = j; } });
    cells[b].parts.push(m.geo);
  }
  const finals = cells.filter(c => c.parts.length).map(c => {
    const geo = c.parts.length === 1 ? { type:'Polygon', coordinates:c.parts[0] } : { type:'MultiPolygon', coordinates:c.parts };
    const f = turf.feature(geo), ct = turf.centroid(f).geometry.coordinates, area = turf.area(f) / 1e6;
    let best = null, ba = -1; // pays majoritaire (pour la couleur/continent)
    idx.forEach(i => { try{ const it = turf.intersect(turf.featureCollection([f, fc.features[i]])); const a = it ? turf.area(it) : 0; if(a > ba){ ba = a; best = fc.features[i].properties; } }catch(e){} });
    return { geo, area, lat:ct[1], lon:ct[0], props:best };
  });
  if(finals.length !== K) throw new Error('nombre de cellules ' + finals.length + ' != ' + K);
  finals.sort((a, b) => b.lat - a.lat || a.lon - b.lon);
  idx.forEach((i, k) => {
    const c = finals[k];
    fc.features[i] = { type:'Feature', properties:{ adm0_a3:c.props.adm0_a3, admin:c.props.admin, clusterArea:Math.round(c.area), parts:1 }, geometry:c.geo };
  });
  const areas = finals.map(c => Math.round(c.area / 1000)).sort((a, b) => a - b);
  console.log(G.name || 'groupe', K, 'regions, aires (k km2) min', areas[0], 'mediane', areas[K >> 1], 'max', areas[K - 1],
    'masses:', masses.map(m => m.k).filter(Boolean).join('+'));
}

const out = topology({ [objName]: fc }, 3e5);
fs.writeFileSync(DST, JSON.stringify(out));
const nbA = topojson.neighbors(topo.objects[objName].geometries), nbB = topojson.neighbors(out.objects[objName].geometries);
console.log('regions sans aucun voisin: avant', nbA.filter(l => !l.length).length, 'apres', nbB.filter(l => !l.length).length);
