// Frontieres plus naturelles: les longs segments DROITS des frontieres
// internes (arcs partages par deux regions) recoivent une legere ondulation
// perpendiculaire. Les sommets d'origine, et donc les cotes et tous les
// points de jonction, ne bougent jamais. Travaille directement sur les arcs
// de la topologie: les deux regions voisines restent parfaitement jointives.
// Un arc dont l'ondulation croiserait un autre arc est laisse tel quel.
// Usage: node destraight.js <in.topojson> <out.topojson>
const fs = require('fs');
const { warpKm } = require('./warp');
const [SRC, DST] = process.argv.slice(2);
const topo = JSON.parse(fs.readFileSync(SRC));
const { scale:[sx, sy], translate:[tx, ty] } = topo.transform;
const objName = Object.keys(topo.objects)[0];

const SEG_MIN_KM = 25, STEP_KM = 6;
const arcs = topo.arcs.map(a => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
const owners = new Map();
topo.objects[objName].geometries.forEach(g => { const w = a => Array.isArray(a) ? a.forEach(w) : owners.set(a < 0 ? ~a : a, (owners.get(a < 0 ? ~a : a) || 0) + 1); w(g.arcs); });

const km = (a, b) => { const c = Math.cos((a[1] + b[1]) / 2 * Math.PI / 180); return Math.hypot((b[0] - a[0]) * 111.2 * c, (b[1] - a[1]) * 111.2); };
function wiggle(arc){
  const out = [arc[0]]; let changed = false;
  for(let i = 0; i < arc.length - 1; i++){
    const a = arc[i], b = arc[i+1], L = km(a, b);
    if(L >= SEG_MIN_KM && Math.abs(b[0] - a[0]) < 180){
      changed = true;
      const c = Math.cos((a[1] + b[1]) / 2 * Math.PI / 180);
      const ux = (b[0] - a[0]) * 111.2 * c / L, uy = (b[1] - a[1]) * 111.2 / L; // direction (km)
      const nx = -uy, ny = ux, n = Math.ceil(L / STEP_KM), strength = Math.min(1, L / 150);
      for(let s = 1; s < n; s++){
        const t = s / n, p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        const w = warpKm(p), off = (w[0] * nx + w[1] * ny) * Math.sin(Math.PI * t) * strength;
        out.push([p[0] + off * nx / (111.2 * c), p[1] + off * ny / 111.2]);
      }
    }
    out.push(b);
  }
  return changed ? out : null;
}

// index spatial des segments de tous les arcs (cases de 1 degre)
const CELL = 1, grid = new Map();
const cellsOf = (a, b) => { const r = []; for(let gx = Math.floor(Math.min(a[0], b[0]) / CELL); gx <= Math.floor(Math.max(a[0], b[0]) / CELL); gx++) for(let gy = Math.floor(Math.min(a[1], b[1]) / CELL); gy <= Math.floor(Math.max(a[1], b[1]) / CELL); gy++) r.push(gx + ',' + gy); return r; };
function indexArc(ai, arc){ for(let i = 0; i < arc.length - 1; i++){ if(Math.abs(arc[i+1][0] - arc[i][0]) > 180) continue; for(const k of cellsOf(arc[i], arc[i+1])){ if(!grid.has(k)) grid.set(k, []); grid.get(k).push([ai, i]); } } }
function unindexArc(ai){ for(const [k, list] of grid) grid.set(k, list.filter(e => e[0] !== ai)); }
arcs.forEach((a, i) => indexArc(i, a));
const eq = (p, q) => Math.abs(p[0] - q[0]) < 1e-9 && Math.abs(p[1] - q[1]) < 1e-9;
function segX(p1, p2, p3, p4){
  if(eq(p1, p3) || eq(p1, p4) || eq(p2, p3) || eq(p2, p4)) return false; // se touchent a une jonction
  const d = (p2[0]-p1[0]) * (p4[1]-p3[1]) - (p2[1]-p1[1]) * (p4[0]-p3[0]); if(d === 0) return false;
  const u = ((p3[0]-p1[0]) * (p4[1]-p3[1]) - (p3[1]-p1[1]) * (p4[0]-p3[0])) / d, v = ((p3[0]-p1[0]) * (p2[1]-p1[1]) - (p3[1]-p1[1]) * (p2[0]-p1[0])) / d;
  return u > 0 && u < 1 && v > 0 && v < 1;
}
function crosses(ai, arc){
  for(let i = 0; i < arc.length - 1; i++){
    for(const k of cellsOf(arc[i], arc[i+1])) for(const [bj, j] of grid.get(k) || []){
      if(bj === ai) continue; const o = arcs[bj];
      if(segX(arc[i], arc[i+1], o[j], o[j+1])) return true;
    }
    for(let j = i + 2; j < arc.length - 1; j++) if(segX(arc[i], arc[i+1], arc[j], arc[j+1])) return true;
  }
  return false;
}
let done = 0, refused = 0;
arcs.forEach((arc, ai) => {
  if((owners.get(ai) || 0) < 2) return; // cote: jamais touchee
  const w = wiggle(arc); if(!w) return;
  if(crosses(ai, w)){ refused++; return; }
  unindexArc(ai); arcs[ai] = w; indexArc(ai, w); done++;
});
topo.arcs = arcs.map(a => { let px = 0, py = 0; return a.map(([x, y]) => { const qx = Math.round((x - tx) / sx), qy = Math.round((y - ty) / sy); const r = [qx - px, qy - py]; px = qx; py = qy; return r; }); });
fs.writeFileSync(DST, JSON.stringify(topo));
console.log('arcs ondules', done, '; refuses (croisement)', refused);
