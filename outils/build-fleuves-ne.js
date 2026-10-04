// Fleuves et rivieres du monde : outils/rivers-world.json, refait de zero d'apres Natural Earth 10m
// (ne_10m_rivers_lake_centerlines, domaine public : https://www.naturalearthdata.com), sans liste a la main.
//   1. on garde les cours nommes de rang <= RANG_MAX (rang 1 = les plus grands) ; les troncons qui
//      traversent un lac (« Lake Centerline ») sont gardes : le cours reste continu ;
//   2. les troncons d'un meme nom qui se touchent forment un reseau ; on en retient le plus long chemin
//      (le cours principal), les autres reseaux de meme nom (homonymes eloignes) sont des cours a part ;
//   3. chaque cours est oriente vers l'aval : l'extremite qui touche la mer (cote de data/monde/admin1.topojson)
//      ou un cours plus grand est l'embouchure ; sinon (bassin interieur) le sens de Natural Earth est garde ;
//   4. trace adouci (Chaikin) puis reechantillonne : plus d'angles. cls : 1 geant (rang 1-2), 2 grand (3-4),
//      3 moyen (5-6) ; end : sea | join (affluent, apres son fleuve) | inland.
// Le resultat est lu par outils/build-waterways.js (champ trace: 'reel' = pas de meandres ajoutes).
// Usage (depuis la racine, avec @turf/turf et topojson-client) :
//   node outils/build-fleuves-ne.js <ne_10m_rivers_lake_centerlines.geojson> [rang_max=6]
const fs = require('fs'), path = require('path'), topojson = require('topojson-client');
const [NE, RANG] = process.argv.slice(2), RANG_MAX = +RANG || 6;
if(!NE){ console.log('Usage : node outils/build-fleuves-ne.js <ne_10m_rivers_lake_centerlines.geojson> [rang_max=6]'); process.exit(1); }
const ROOT = path.join(__dirname, '..'), OUT = path.join(__dirname, 'rivers-world.json');
const kmDe = (a, b) => { const kx = 111.32 * Math.cos((a[1] + b[1]) / 2 * Math.PI / 180); let dl = a[0] - b[0]; dl -= 360 * Math.round(dl / 360); return Math.hypot(dl * kx, (a[1] - b[1]) * 110.57); };
const longueur = pts => { let s = 0; for(let i = 1; i < pts.length; i++) s += kmDe(pts[i - 1], pts[i]); return s; };

// ---- 1. troncons retenus, par nom
const doc = JSON.parse(fs.readFileSync(NE, 'utf8'));
const parNom = new Map();
for(const f of doc.features){
  const p = f.properties, nom = (p.name_en || p.name || '').trim();
  if(!nom || p.scalerank > RANG_MAX) continue;
  const lignes = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.type === 'MultiLineString' ? f.geometry.coordinates : [];
  for(const l of lignes) if(l.length > 1) (parNom.get(nom) || parNom.set(nom, []).get(nom)).push({ pts:l, rang:p.scalerank });
}

// ---- 2. plus long chemin de chaque reseau de troncons
const TOL = 3;   // km : deux extremites plus proches que ca sont reliees
function chaines(segs){
  const noeuds = [];                                  // extremites fusionnees
  const noeud = p => { for(let i = 0; i < noeuds.length; i++) if(kmDe(noeuds[i], p) < TOL) return i; noeuds.push(p); return noeuds.length - 1; };
  const aretes = segs.map(s => ({ a:noeud(s.pts[0]), b:noeud(s.pts[s.pts.length - 1]), pts:s.pts, L:longueur(s.pts), rang:s.rang }));
  const adj = noeuds.map(() => []); aretes.forEach((e, i) => { adj[e.a].push(i); adj[e.b].push(i); });
  const vu = new Set(), res = [];
  for(let n0 = 0; n0 < noeuds.length; n0++){
    if(vu.has(n0)) continue;
    const comp = []; const pile = [n0]; vu.add(n0);
    while(pile.length){ const n = pile.pop(); comp.push(n); for(const i of adj[n]) for(const m of [aretes[i].a, aretes[i].b]) if(!vu.has(m)){ vu.add(m); pile.push(m); } }
    const loin = from => {                              // plus long chemin depuis un noeud (arbre : parcours simple)
      const d = new Map([[from, 0]]), via = new Map(), q = [from];
      while(q.length){ const n = q.shift(); for(const i of adj[n]){ const e = aretes[i], m = e.a === n ? e.b : e.a; if(d.has(m)) continue; d.set(m, d.get(n) + e.L); via.set(m, [n, i]); q.push(m); } }
      let best = from; for(const [n, v] of d) if(v > d.get(best)) best = n;
      return { best, d: d.get(best), via };
    };
    const A = loin(comp[0]).best, B = loin(A);
    const pts = []; let n = B.best; const parts = [];
    while(n !== A){ const [prev, i] = B.via.get(n), e = aretes[i]; parts.push(e.a === prev ? e.pts : e.pts.slice().reverse()); n = prev; }
    parts.reverse().forEach((p, k) => pts.push(...(k ? p.slice(1) : p)));   // de A vers B.best
    if(pts.length > 1) res.push({ pts, rang:Math.min(...comp.flatMap(m => adj[m].map(i => aretes[i].rang))) });
  }
  return res;
}
let cours = [];
for(const [nom, segs] of parNom) for(const c of chaines(segs)) if(longueur(c.pts) >= 40) cours.push({ nom, rang:c.rang, pts:c.pts, L:longueur(c.pts) });
cours.sort((x, y) => x.rang - y.rang || y.L - x.L);

// ---- 3. embouchure : mer ou cours plus grand
const topo = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/monde/admin1.topojson'), 'utf8')), obj = topo.objects[Object.keys(topo.objects)[0]];
const use = new Map(); const walk = a => Array.isArray(a) ? a.forEach(walk) : use.set(a < 0 ? ~a : a, (use.get(a < 0 ? ~a : a) || 0) + 1);
obj.geometries.forEach(g => walk(g.arcs));
const inland = new Set(topo.interieurs || []);
const cote = topojson.feature(topo, { type:'MultiLineString', arcs:[...use].filter(([k, c]) => c === 1 && !inland.has(k)).map(([k]) => [k]) }).geometry.coordinates;
const cases = new Map(), CS = 0.5;
for(const l of cote) for(let i = 0; i < l.length - 1; i++){ if(Math.abs(l[i][0] - l[i + 1][0]) > 180) continue;
  const k = Math.floor(l[i][0] / CS) + ',' + Math.floor(l[i][1] / CS); (cases.get(k) || cases.set(k, []).get(k)).push(l[i]); }
const versCote = p => { let best = Infinity; const ci = Math.floor(p[0] / CS), cj = Math.floor(p[1] / CS);
  for(let i = ci - 1; i <= ci + 1; i++) for(let j = cj - 1; j <= cj + 1; j++) for(const q of cases.get(i + ',' + j) || []) best = Math.min(best, kmDe(p, q)); return best; };
// index des points des cours deja classes (plus grands d'abord)
const pointsDe = new Map(), PS = 0.5;
const densifie = (pts, pas) => { const o = [pts[0]]; for(let i = 1; i < pts.length; i++){ const n = Math.max(1, Math.round(kmDe(pts[i - 1], pts[i]) / pas)); for(let k = 1; k <= n; k++) o.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k / n, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k / n]); } return o; };
const versGrand = (p, c) => { let best = Infinity; const ci = Math.floor(p[0] / PS), cj = Math.floor(p[1] / PS);
  for(let i = ci - 1; i <= ci + 1; i++) for(let j = cj - 1; j <= cj + 1; j++) for(const q of pointsDe.get(i + ',' + j) || []) if(q.c !== c) best = Math.min(best, kmDe(p, q.p)); return best; };
const indexe = (pts, c) => densifie(pts, 8).forEach(p => { const k = Math.floor(p[0] / PS) + ',' + Math.floor(p[1] / PS); (pointsDe.get(k) || pointsDe.set(k, []).get(k)).push({ p, c }); });
const MER = 40, JONCTION = 30;
const resultat = [];
cours.forEach((c, idx) => {
  const e0 = c.pts[0], e1 = c.pts[c.pts.length - 1];
  const s0 = Math.min(versCote(e0), pointsDe.size ? versGrand(e0, idx) : Infinity), s1 = Math.min(versCote(e1), pointsDe.size ? versGrand(e1, idx) : Infinity);
  const mouth1 = s1 <= s0, e = mouth1 ? e1 : e0, s = mouth1 ? s1 : s0;
  if(Math.min(s0, s1) > Math.max(MER, JONCTION)) { c.end = 'inland'; }   // bassin interieur : sens de Natural Earth
  else { if(!mouth1) c.pts.reverse(); const dm = versCote(e); c.end = dm <= MER && dm <= versGrand(e, idx) ? 'sea' : 'join'; }
  indexe(c.pts, idx);
  resultat.push(c);
});

// ---- 4. trace adouci et reechantillonne (plus d'angles)
const chaikin = pts => { const o = [pts[0]]; for(let i = 0; i < pts.length - 1; i++){ const a = pts[i], b = pts[i + 1];
  if(i) o.push([.75 * a[0] + .25 * b[0], .75 * a[1] + .25 * b[1]]); if(i < pts.length - 2) o.push([.25 * a[0] + .75 * b[0], .25 * a[1] + .75 * b[1]]); } o.push(pts[pts.length - 1]); return o; };
const rives = resultat.map(c => {
  let p = c.pts.map(q => [q[0], q[1]]);
  for(let k = 0; k < 2; k++) p = chaikin(p);
  p = densifie(p, 6).map(q => [Math.round(q[0] * 1e4) / 1e4, Math.round(q[1] * 1e4) / 1e4]);
  return { n:c.nom, cls:c.rang <= 2 ? 1 : c.rang <= 4 ? 2 : 3, end:c.end, pts:p, trace:'reel' };
});
// un affluent vient apres le cours auquel il se jette : les cours de rang plus grand sont deja avant
const doc2 = { _doc:'Fleuves et rivieres generes par outils/build-fleuves-ne.js d\'apres Natural Earth 10m (rang <= ' + RANG_MAX + '). pts = cours [lon, lat], de la source vers l\'aval, adouci ; cls 1 geant, 2 grand, 3 moyen ; end : sea | join (affluent) | inland ; trace: reel. Ancienne liste a la main : rivers-world.ancien.json.', rivers:rives };
fs.writeFileSync(OUT, JSON.stringify(doc2));
const n = { 1:0, 2:0, 3:0 }, fin = { sea:0, join:0, inland:0 }; rives.forEach(r => { n[r.cls]++; fin[r.end]++; });
console.log('cours :', rives.length, '| cls', JSON.stringify(n), '| fin', JSON.stringify(fin), '| points', rives.reduce((s, r) => s + r.pts.length, 0), '|', Math.round(fs.statSync(OUT).size / 1024), 'Ko');
