// Affinage: chaque region ne garde que sa partie principale. Tout morceau
// detache (bout sur l'autre rive d'une baie, enclave coincee entre d'autres
// regions...) est donne:
//  - au voisin avec lequel il partage la plus longue frontiere terrestre;
//  - s'il ne touche personne (ile), a la region dont la partie principale
//    est la plus proche (qui peut etre la sienne: l'ile reste alors ou elle est).
// Travaille sur les arcs de la topologie: aucune couture ne s'ouvre.
// Usage: node fixparts.js <in.topojson> <out.topojson>
const fs = require('fs');
const topojson = require('topojson-client');
const turf = require('@turf/turf');
const [SRC, DST] = process.argv.slice(2);
const topo = JSON.parse(fs.readFileSync(SRC));
const objName = Object.keys(topo.objects)[0];
const geoms = topo.objects[objName].geometries;

const absA = a => a < 0 ? ~a : a;
const polysOf = g => g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : [];
const polyFeature = arcs => topojson.feature(topo, { type:'Polygon', arcs });
const arcKm = new Map();
function lenOf(a){ if(!arcKm.has(a)){ const f = topojson.feature(topo, { type:'LineString', arcs:[a] }); arcKm.set(a, turf.length(f)); } return arcKm.get(a); }
function samplePts(f, n = 150){ const v = turf.coordAll(f); const s = Math.max(1, Math.floor(v.length / n)); return v.filter((_, i) => i % s === 0); }

function pass(){
  // proprietaires de chaque arc
  const owner = new Map();
  geoms.forEach((g, gi) => polysOf(g).forEach(p => p.forEach(r => r.forEach(a => { const k = absA(a); if(!owner.has(k)) owner.set(k, new Set()); owner.get(k).add(gi); }))));
  // partie principale de chaque region
  const info = geoms.map(g => {
    const ps = polysOf(g).map(arcs => { const f = polyFeature(arcs); return { arcs, f, area:turf.area(f) }; });
    ps.sort((a, b) => b.area - a.area);
    return ps;
  });
  const mainPts = info.map(ps => ps.length ? samplePts(ps[0].f) : []);
  const mainBox = info.map(ps => ps.length ? turf.bbox(ps[0].f) : null);
  const moves = []; // [from, polyArcs, to]
  info.forEach((ps, gi) => {
    for(const p of ps.slice(1)){
      const border = new Map();
      p.arcs.forEach(r => r.forEach(a => { for(const o of owner.get(absA(a))) if(o !== gi) border.set(o, (border.get(o) || 0) + lenOf(absA(a))); }));
      let to = null;
      if(border.size){ to = [...border.entries()].sort((x, y) => y[1] - x[1])[0][0]; }
      else {
        // ile: region dont la partie principale est la plus proche
        const pts = samplePts(p.f, 60), pb = turf.bbox(p.f);
        let best = Infinity;
        info.forEach((_, oj) => {
          const b = mainBox[oj]; if(!b) return;
          if(b[0] > pb[2] + 15 || b[2] < pb[0] - 15 || b[1] > pb[3] + 15 || b[3] < pb[1] - 15) return;
          let d = Infinity; for(const x of pts) for(const y of mainPts[oj]){ const e = turf.distance(x, y); if(e < d) d = e; }
          if(d < best){ best = d; to = oj; }
        });
        if(to === gi) continue;
      }
      if(to !== null) moves.push([gi, p.arcs, to]);
    }
  });
  if(!moves.length) return 0;
  // application une par une, chaque fusion est validee (anneaux fermes)
  const ringsOk = g => { const f = topojson.feature(topo, g).geometry; const ps = f.type === 'Polygon' ? [f.coordinates] : f.coordinates;
    return ps.every(p => p.every(r => r.length >= 4 && r[0][0] === r[r.length-1][0] && r[0][1] === r[r.length-1][1])); };
  let applied = 0;
  for(const [from, arcs, to] of moves){
    const gf = geoms[from], gt = geoms[to];
    const fromPolys = polysOf(gf); if(!fromPolys.includes(arcs)) continue; // deja modifiee dans cette passe
    const merged = topojson.mergeArcs(topo, polysOf(gt).concat([arcs]).map(p => ({ type:'Polygon', arcs:p })));
    const newTo = merged.arcs.length === 1 ? { type:'Polygon', arcs:merged.arcs[0] } : { type:'MultiPolygon', arcs:merged.arcs };
    if(!ringsOk(newTo)){ skipped++; continue; }
    const rest = fromPolys.filter(p => p !== arcs);
    gf.type = rest.length === 1 ? 'Polygon' : 'MultiPolygon'; gf.arcs = rest.length === 1 ? rest[0] : rest;
    gt.type = newTo.type; gt.arcs = newTo.arcs; applied++;
  }
  return applied;
}
let skipped = 0;


const multiBefore = geoms.filter(g => g.type === 'MultiPolygon').length;
for(let it = 0; it < 8; it++){ const n = pass(); console.log('passe', it + 1, ':', n, 'morceaux reattribues'); if(!n) break; }
const fc = topojson.feature(topo, topo.objects[objName]);
fc.features.forEach((f, i) => { geoms[i].properties.clusterArea = Math.round(turf.area(f) / 1e6); });
fs.writeFileSync(DST, JSON.stringify(topo));
const a = fc.features.map(f => turf.area(f) / 1e6).sort((x, y) => x - y);
console.log('fusions refusees (anneau invalide):', skipped);
console.log('regions en plusieurs morceaux: avant', multiBefore, 'apres', geoms.filter(g => g.type === 'MultiPolygon').length,
  '| aires min', Math.round(a[0] / 1000) + 'k', 'q5', Math.round(a[25] / 1000) + 'k', 'mediane', Math.round(a[250] / 1000) + 'k', 'q95', Math.round(a[475] / 1000) + 'k', 'max', Math.round(a[499] / 1000) + 'k');
