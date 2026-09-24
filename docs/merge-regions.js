// Fusionne les regions admin-1 voisines en ~TARGET regions d'aire comparable.
const fs = require('fs');
const topojson = require('topojson-client');
const turf = require('@turf/turf');

const SRC = process.argv[2], DST = process.argv[3];
const TARGET = +(process.argv[4] || 500);
const topo = JSON.parse(fs.readFileSync(SRC));
const objName = Object.keys(topo.objects)[0];
const geoms = topo.objects[objName].geometries;
const fc = topojson.feature(topo, topo.objects[objName]);

const CONT = {
  namerica:'BLZ CAN CRI CUB DOM GRL GTM HND HTI MEX NIC PAN USA',
  samerica:'ARG BOL BRA CHL COL ECU GUY PER PRY SUR URY VEN',
  europe:'ALB AUT BEL BGR BIH BLR CHE CZE DEU DNK ESP EST FIN FRA GBR GRC HRV HUN IRL ISL ITA LTU LVA MDA MKD NLD NOR POL PRT ROU SRB SVK SVN SWE UKR',
  africa:'AGO BEN BFA BWA CAF CIV CMR COD COG DZA EGY ERI ETH GAB GHA GIN KEN LBR LBY MAR MDG MLI MOZ MRT NAM NER NGA SAH SDN SDS SEN SLE SOL SOM TCD TUN TZA UGA ZAF ZMB ZWE',
  asia:'AFG ARE ARM AZE BGD BTN CHN GEO IDN IND IRN IRQ ISR JOR JPN KAZ KGZ KHM KOR LAO LKA MMR MNG MYS NPL OMN PAK PHL PRK RUS SAU SYR TJK THA TKM TUR TWN UZB VNM YEM',
  oceania:'NZL PNG',
};
const GROUP = { AUS:'aus' };
for(const k in CONT) CONT[k].split(' ').forEach(c => { GROUP[c] = k; });

const n = geoms.length;
const area = fc.features.map(f => Math.max(1, turf.area(f) / 1e6));
const cen = fc.features.map(f => turf.centroid(f).geometry.coordinates);
const grp = geoms.map(g => GROUP[g.properties.adm0_a3] || 'other');

// Adjacence par arcs partages (poids = nb de points de l'arc ~ longueur frontiere)
const arcOwners = new Map();
function walk(a, i){ if(Array.isArray(a)) a.forEach(x => walk(x, i)); else { const k = a < 0 ? ~a : a; if(!arcOwners.has(k)) arcOwners.set(k, new Set()); arcOwners.get(k).add(i); } }
geoms.forEach((g, i) => walk(g.arcs, i));
const adj = Array.from({length:n}, () => new Map());
for(const [k, owners] of arcOwners){
  const o = [...owners]; if(o.length < 2) continue;
  const w = topo.arcs[k].length;
  for(const a of o) for(const b of o) if(a !== b && grp[a] === grp[b]) adj[a].set(b, (adj[a].get(b) || 0) + w);
}

function distKm(a, b){ return turf.distance(a, b); }

// Clusters (union-find simple via tableaux)
const cl = new Map(); // id -> {members, area, adj:Map(id->w), grp, country:Map}
for(let i = 0; i < n; i++){
  cl.set(i, { members:[i], area:area[i], adj:new Map(adj[i]), grp:grp[i],
    country:new Map([[geoms[i].properties.adm0_a3, area[i]]]), cx:cen[i][0]*area[i], cy:cen[i][1]*area[i] });
}
const totalArea = area.reduce((s, x) => s + x, 0);
const target = totalArea / TARGET;
function centroidOf(c){ return [c.cx / c.area, c.cy / c.area]; }
function mainCountry(c){ let best = null, bv = -1; for(const [k, v] of c.country) if(v > bv){ bv = v; best = k; } return best; }

// Iles sans voisin terrestre: rattachees au plus proche cluster du meme groupe (< 900 km)
function seaNeighbors(id){
  const c = cl.get(id), p = centroidOf(c), out = [];
  for(const [oid, o] of cl){ if(oid === id || o.grp !== c.grp) continue; const d = distKm(p, centroidOf(o)); if(d < 900) out.push([oid, d]); }
  out.sort((a, b) => a[1] - b[1]);
  return out.slice(0, 3);
}

const stuck = new Set();
while(cl.size > TARGET){
  // plus petit cluster encore fusionnable
  let id = null, best = Infinity;
  for(const [k, c] of cl) if(!stuck.has(k) && c.area < best){ best = c.area; id = k; }
  if(id === null) break;
  const c = cl.get(id);
  let cands = [...c.adj.entries()].map(([oid, w]) => ({ oid, w }));
  if(!cands.length) cands = seaNeighbors(id).map(([oid]) => ({ oid, w:0.01 }));
  if(!cands.length){ stuck.add(id); continue; }
  const mc = mainCountry(c);
  let pick = null, ps = Infinity;
  for(const { oid, w } of cands){
    const o = cl.get(oid);
    const merged = c.area + o.area;
    // aire fusionnee minimale, bonus meme pays / longue frontiere, forte penalite au-dela de la cible
    let s = merged * (mainCountry(o) === mc ? 1 : 1.25) / Math.pow(1 + w, 0.08);
    if(merged > target * 1.3) s *= 20;
    if(s < ps){ ps = s; pick = oid; }
  }
  // fusion c -> pick
  const o = cl.get(pick);
  o.members.push(...c.members); o.area += c.area; o.cx += c.cx; o.cy += c.cy;
  for(const [k, v] of c.country) o.country.set(k, (o.country.get(k) || 0) + v);
  for(const [k, w] of c.adj){ if(k === pick) continue; o.adj.set(k, (o.adj.get(k) || 0) + w); const kk = cl.get(k).adj; kk.set(pick, (kk.get(pick) || 0) + w); kk.delete(id); }
  o.adj.delete(id);
  cl.delete(id);
  stuck.clear(); // la situation a change, on reessaie
}

// Construction de la nouvelle topologie
const out = [];
const oldToNew = {};
[...cl.values()].sort((a, b) => centroidOf(b)[1] - centroidOf(a)[1] || centroidOf(a)[0] - centroidOf(b)[0]).forEach((c, idx) => {
  const g = topojson.mergeArcs(topo, c.members.map(i => geoms[i]));
  const country = mainCountry(c);
  g.properties = { adm0_a3:country, admin:geoms[c.members.find(i => geoms[i].properties.adm0_a3 === country)].properties.admin, clusterArea:Math.round(c.area), parts:c.members.length };
  c.members.forEach(i => { oldToNew[i + 1] = idx + 1; });
  out.push(g);
});
topo.objects = { [objName]: { type:'GeometryCollection', geometries:out } };
fs.writeFileSync(DST, JSON.stringify(topo));

const a = out.map(g => g.properties.clusterArea).sort((x, y) => x - y);
console.log('regions', out.length, 'target area', Math.round(target));
[0, .05, .1, .25, .5, .75, .9, .95, 1].forEach(q => console.log(' q' + q, a[Math.min(a.length - 1, Math.floor(q * a.length))]));
console.log('AUS', out.filter(g => g.properties.adm0_a3 === 'AUS').length);
fs.writeFileSync(DST + '.map.json', JSON.stringify(oldToNew));
