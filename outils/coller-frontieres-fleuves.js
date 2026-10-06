// Frontieres de regions qui longent un fleuve (Rhin, Seine, Amour...) : elles sont recalees sur l'axe
// du fleuve, pour que l'eau creusee soit coupee en deux par la frontiere (une rive par region) au lieu
// de la voir collee a une berge, avec des eclats de terre, des encoches et des moignons d'eau.
// - seuls les arcs partages entre deux regions bougent (la cote est intacte) ;
// - un arc n'est modifie que sur les troncons ou il reste a moins de NEAR_KM d'un fleuve sur plus de RUN_KM
//   (un simple croisement de fleuve ne change rien) ; un troncon dont le trace recale a une longueur tres
//   differente de l'original, ou fait demi-tour, est laisse tel quel ;
// - un noeud (ou 3 regions se rejoignent) proche d'un fleuve est recale pour TOUS les arcs qui s'y rejoignent ;
// - une region devenue invalide (boucle) retrouve ses frontieres d'origine.
// Entree : outils/admin1.avant-fleuves.topojson (copie de l'admin1 d'avant, creee au 1er lancement) + data/monde/water.json
// Sortie : data/monde/admin1.topojson. Sans risque a relancer.
// Usage : node outils/coller-frontieres-fleuves.js
// Ensuite relancer : build-waterways, build-formes (build-regions si les aires comptent, build-routes si les capitales changent).
const fs = require('fs'), path = require('path');
const turf = require('@turf/turf'), tj = require('topojson-client');
const NEAR_KM = 16, RUN_KM = 40, STEP_KM = 3, NODE_KM = 24;
const IN = path.join(__dirname, 'admin1.avant-fleuves.topojson'), OUT = path.join(__dirname, '..', 'data', 'monde', 'admin1.topojson');
if(!fs.existsSync(IN)) fs.copyFileSync(OUT, IN);
const topo = JSON.parse(fs.readFileSync(IN)), orig = JSON.parse(fs.readFileSync(IN));
const water = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'monde', 'water.json')));
const [sx, sy] = topo.transform.scale, [tx, ty] = topo.transform.translate;
const KM = 111.19;
const km = (a, b) => Math.hypot((a[0] - b[0]) * Math.cos((a[1] + b[1]) * Math.PI / 360), a[1] - b[1]) * KM;

// ---- axe des fleuves, echantillonne tous les ~1 km, dans une grille de 0.25 deg ----
const CELL = 0.25, grid = new Map(), cellKey = (x, y) => x + ',' + y;
for(const r of water.rivers){
  const c = r.c;
  for(let i = 0; i < c.length - 1; i++){
    const n = Math.max(1, Math.ceil(km(c[i], c[i + 1])));
    for(let k = 0; k < n; k++){
      const p = [c[i][0] + (c[i + 1][0] - c[i][0]) * k / n, c[i][1] + (c[i + 1][1] - c[i][1]) * k / n];
      const key = cellKey(Math.floor(p[0] / CELL), Math.floor(p[1] / CELL));
      (grid.get(key) || grid.set(key, []).get(key)).push(p);
    }
  }
}
function nearest(p, maxKm = NEAR_KM){   // point d'axe le plus proche, a moins de maxKm (sinon null)
  const cx = Math.floor(p[0] / CELL), cy = Math.floor(p[1] / CELL), r = Math.ceil(maxKm / (CELL * KM * Math.cos(p[1] * Math.PI / 180)));
  let best = null, bd = maxKm;
  for(let x = cx - r; x <= cx + r; x++) for(let y = cy - r; y <= cy + r; y++)
    for(const q of grid.get(cellKey(x, y)) || []){ const d = km(p, q); if(d < bd){ bd = d; best = q; } }
  return best;
}

const decode = a => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); };
const encode = pts => { let px = 0, py = 0; return pts.map(([lon, lat]) => { const x = Math.round((lon - tx) / sx), y = Math.round((lat - ty) / sy), o = [x - px, y - py]; px = x; py = y; return o; }); };
const nodeKey = p => p[0].toFixed(5) + ',' + p[1].toFixed(5);
const geoms = topo.objects[Object.keys(topo.objects)[0]].geometries;
const used = new Map();   // arc -> nombre de regions qui l'utilisent
const count = a => Array.isArray(a) ? a.forEach(count) : used.set(a < 0 ? ~a : a, (used.get(a < 0 ? ~a : a) || 0) + 1);
for(const g of geoms) count(g.arcs);
const shared = ai => (used.get(ai) || 0) >= 2;
const decoded = topo.arcs.map(decode);
const coastNodes = new Set();   // noeuds touches par un arc de cote : ils ne bougent pas
decoded.forEach((p, ai) => { if(!shared(ai)){ coastNodes.add(nodeKey(p[0])); coastNodes.add(nodeKey(p[p.length - 1])); } });

// ---- 1. noeuds de jonction proches d'un fleuve : recales (meme resultat pour tous les arcs qui s'y rejoignent) ----
const nodeMove = new Map();
decoded.forEach((p, ai) => { if(!shared(ai)) return; for(const e of [p[0], p[p.length - 1]]){
  const k = nodeKey(e); if(coastNodes.has(k) || nodeMove.has(k)) continue; const q = nearest(e, NODE_KM); if(q) nodeMove.set(k, q); } });
const moveNode = p => nodeMove.get(nodeKey(p)) || p;

// ---- 2. troncons d'arcs qui longent un fleuve ----
const cross = (a, b, c, d) => { const r = [b[0] - a[0], b[1] - a[1]], q = [d[0] - c[0], d[1] - c[1]], den = r[0] * q[1] - r[1] * q[0];
  if(!den) return null; const t = ((c[0] - a[0]) * q[1] - (c[1] - a[1]) * q[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
  return t > 0 && t < 1 && u > 0 && u < 1 ? [a[0] + t * r[0], a[1] + t * r[1]] : null; };
function pushNoLoop(out, p){   // ajoute p ; coupe la boucle si le nouveau segment recoupe le trace deja pose
  const last = out[out.length - 1];
  for(let k = out.length - 2; k >= 1; k--){ const x = cross(out[k - 1], out[k], last, p); if(x){ out.length = k; out.push(x); break; } }
  out.push(p);
}
const len = l => l.reduce((t, p, x) => t + (x ? km(l[x - 1], p) : 0), 0);
const touched = new Set();
let moved = 0;
const newArcs = decoded.map((pts, ai) => {
  if(!shared(ai)) return pts;
  const n = pts.length, dense = [];
  for(let i = 0; i < n - 1; i++){
    const m = Math.max(1, Math.ceil(km(pts[i], pts[i + 1]) / STEP_KM));
    for(let k = 0; k < m; k++) dense.push({ p: [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k / m, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k / m], idx: k ? -1 : i });
  }
  dense.push({ p: pts[n - 1], idx: n - 1 });
  const snap = dense.map(d => nearest(d.p));
  const out = []; let changed = false;
  const keep = (a, b) => { for(let k = a; k < b; k++) if(dense[k].idx >= 0) out.push(dense[k].p); };
  for(let i = 0; i < dense.length;){
    if(!snap[i]){ keep(i, i + 1); i++; continue; }
    let j = i; while(j < dense.length && snap[j]) j++;   // troncon [i, j[ proche d'un fleuve
    const seg = [];
    for(let k = i; k < j; k++){ const q = snap[k], l = seg[seg.length - 1]; if(!l || l[0] !== q[0] || l[1] !== q[1]) pushNoLoop(seg, q); }
    const orig0 = dense.slice(i, j).map(d => d.p), ratio = len(seg) / Math.max(1, len(orig0));
    const backtrack = seg.some((p, x) => x > 1 && km(p, seg[x - 2]) < 0.3);
    if(orig0.length * STEP_KM < RUN_KM || ratio < 0.8 || ratio > 1.25 || backtrack){ keep(i, j); i = j; continue; }
    changed = true; moved += seg.length;
    out.push(...seg); i = j;
  }
  if(changed) touched.add(ai);
  out[0] = pts[0]; out[out.length - 1] = pts[n - 1];   // bouts = noeuds : recales a part (moveNode)
  return changed ? out : pts;
});

// ---- 3. controle : une region devenue invalide (boucle) perd les recalages de ses arcs ----
const finish = () => newArcs.map(p => { const o = p.slice(); o[0] = moveNode(o[0]); o[o.length - 1] = moveNode(o[o.length - 1]); return encode(o); });
const kinked = t => tj.feature(t, t.objects[Object.keys(t.objects)[0]]).features.map((f, i) => turf.kinks(f).features.length ? i : -1).filter(i => i >= 0);
const before = new Set(kinked(orig));
topo.arcs = finish();
for(let pass = 0; pass < 6; pass++){
  const bad = kinked(topo).filter(i => !before.has(i)); if(!bad.length) break;
  for(const i of bad){ const arcsOf = []; (function walk(a){ Array.isArray(a) ? a.forEach(walk) : arcsOf.push(a < 0 ? ~a : a); })(geoms[i].arcs);
    for(const ai of arcsOf){ for(const e of [decoded[ai][0], decoded[ai][decoded[ai].length - 1]]) nodeMove.delete(nodeKey(e)); }
    for(const ai of arcsOf) if(touched.delete(ai)){ newArcs[ai] = decoded[ai]; console.log('region ' + (i + 1) + ' : arc ' + ai + ' remis comme avant'); } }
  topo.arcs = finish();
}
const left = kinked(topo).filter(i => !before.has(i));
fs.writeFileSync(OUT, JSON.stringify(topo));
console.log(touched.size + ' frontieres recalees, ' + nodeMove.size + ' noeuds recales, ' + moved + ' points deplaces' + (left.length ? ' ; regions encore invalides : ' + left.map(i => i + 1) : ''));
