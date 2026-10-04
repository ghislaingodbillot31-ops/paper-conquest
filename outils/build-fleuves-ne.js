// Fleuves et rivieres du monde : outils/rivers-world.json, refait de zero d'apres Natural Earth 10m
// (ne_10m_rivers_lake_centerlines, domaine public : https://www.naturalearthdata.com), sans liste a la main.
//   1. on garde les cours nommes de rang <= RANG_MAX (rang 1 = les plus grands) ; les troncons qui
//      traversent un lac (« Lake Centerline ») sont gardes : le cours reste continu ;
//   2. les troncons d'un meme nom qui se touchent forment un reseau ; on en retient le plus long chemin
//      (le cours principal), les autres reseaux de meme nom (homonymes eloignes) sont des cours a part ;
//   3. chaque cours est oriente vers l'aval : l'extremite qui touche la mer (cote de data/monde/admin1.topojson)
//      ou un cours plus grand est l'embouchure ; sinon (bassin interieur) le sens de Natural Earth est garde ;
//   4. trace adouci (Chaikin + moyenne) et reechantillonne ; un affluent arrive sur son fleuve par une courbe de
//      Bezier tangente au courant (confluence en Y) ; deux cours qui se croisent sans se rejoindre : le plus petit
//      s'arrete sur l'autre quand il n'a plus beaucoup de chemin ; cours de moins de 60 km (100 km pour un affluent) ecartes. cls : 1 geant (rang 1-2), 2 grand (3-4),
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
// Deux cours dont les extremites se touchent sans qu'un plus grand cours passe la (pas une confluence) sont un
// seul cours coupe par un changement de nom (Nil Victoria - Nil Albert - Nil Blanc - Nil) : on les met bout a bout.
const NOEUD = 6;
const traverse = (pts, p, sauf) => pts.slice(2, -2).some(q => kmDe(q, p) < NOEUD);
function fusionne(){
  for(let tour = 0; tour < 400; tour++){
    let fait = false;
    const ordre = cours.map((c, i) => i).sort((a, b) => cours[a].rang - cours[b].rang || cours[b].L - cours[a].L);
    boucle: for(const a of ordre) for(const b of ordre){
      if(a >= b) continue;
      const A = cours[a], B = cours[b];
      for(const [ea, eb] of [[1, 0], [1, 1], [0, 0], [0, 1]]){
        const pa = ea ? A.pts[A.pts.length - 1] : A.pts[0], pb = eb ? B.pts[B.pts.length - 1] : B.pts[0];
        if(kmDe(pa, pb) > NOEUD) continue;
        if(cours.some((C, c) => c !== a && c !== b && traverse(C.pts, pa) && (C.rang < Math.min(A.rang, B.rang) || C.L > Math.max(A.L, B.L)))) continue;   // confluence sur un plus grand cours
        const P = ea ? A.pts : A.pts.slice().reverse(), Q = eb ? B.pts.slice().reverse() : B.pts;     // P finit au noeud, Q y commence
        const pts = P.concat(Q.slice(1)), nom = A.L >= B.L ? A.nom : B.nom, rang = Math.min(A.rang, B.rang);
        cours.splice(b, 1); cours.splice(a, 1); cours.push({ nom, rang, pts, L:longueur(pts) });
        fait = true; break boucle;
      }
    }
    if(!fait) break;
  }
}
fusionne();
cours.sort((x, y) => x.rang - y.rang || y.L - x.L);
console.log('cours apres fusion bout a bout :', cours.length);

// ---- 3. embouchure : mer ou cours plus grand
const topo = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/monde/admin1.topojson'), 'utf8')), obj = topo.objects[Object.keys(topo.objects)[0]];
const use = new Map(); const walk = a => Array.isArray(a) ? a.forEach(walk) : use.set(a < 0 ? ~a : a, (use.get(a < 0 ? ~a : a) || 0) + 1);
obj.geometries.forEach(g => walk(g.arcs));
const inland = new Set(topo.interieurs || []);
const cote = topojson.feature(topo, { type:'MultiLineString', arcs:[...use].filter(([k, c]) => c === 1 && !inland.has(k)).map(([k]) => [k]) }).geometry.coordinates;
const cases = new Map(), CS = 0.5;
for(const l of cote) for(let i = 0; i < l.length - 1; i++){ if(Math.abs(l[i][0] - l[i + 1][0]) > 180) continue;
  const k = Math.floor(l[i][0] / CS) + ',' + Math.floor(l[i][1] / CS); (cases.get(k) || cases.set(k, []).get(k)).push(l[i]); }
// cote la plus proche (distance en km et vecteur vers elle), dans un rayon d'environ 280 km
const procheCote = p => { let best = null; const ci = Math.floor(p[0] / CS), cj = Math.floor(p[1] / CS);
  for(let i = ci - 5; i <= ci + 5; i++) for(let j = cj - 5; j <= cj + 5; j++) for(const q of cases.get(i + ',' + j) || []){ const d = kmDe(p, q); if(!best || d < best.d) best = { d, v:plan0(p, q) }; }
  return best || { d:Infinity, v:[0, 0] }; };
const plan0 = (o, p) => { const kx = 111.32 * Math.cos(o[1] * Math.PI / 180); let dl = p[0] - o[0]; dl -= 360 * Math.round(dl / 360); return [dl * kx, (p[1] - o[1]) * 110.57]; };
const versCote = p => procheCote(p).d;
// index des points des cours deja classes (plus grands d'abord)
const pointsDe = new Map(), PS = 0.5;
const densifie = (pts, pas) => { const o = [pts[0]]; for(let i = 1; i < pts.length; i++){ const n = Math.max(1, Math.round(kmDe(pts[i - 1], pts[i]) / pas)); for(let k = 1; k <= n; k++) o.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k / n, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k / n]); } return o; };
const versGrand = (p, c) => { let best = Infinity; const ci = Math.floor(p[0] / PS), cj = Math.floor(p[1] / PS);
  for(let i = ci - 1; i <= ci + 1; i++) for(let j = cj - 1; j <= cj + 1; j++) for(const q of pointsDe.get(i + ',' + j) || []) if(q.c !== c) best = Math.min(best, kmDe(p, q.p)); return best; };
const indexe = (pts, c) => densifie(pts, 8).forEach(p => { const k = Math.floor(p[0] / PS) + ',' + Math.floor(p[1] / PS); (pointsDe.get(k) || pointsDe.set(k, []).get(k)).push({ p, c }); });
const MER = 40, JONCTION = 30, FILET = 40, PORTEE = 80;   // km : mer proche, cours proche, longueur du raccord en courbe, distance maxi pour retrouver son fleuve
const chaikin = pts => { const o = [pts[0]]; for(let i = 0; i < pts.length - 1; i++){ const a = pts[i], b = pts[i + 1];
  if(i) o.push([.75 * a[0] + .25 * b[0], .75 * a[1] + .25 * b[1]]); if(i < pts.length - 2) o.push([.25 * a[0] + .75 * b[0], .25 * a[1] + .75 * b[1]]); } o.push(pts[pts.length - 1]); return o; };
// points a intervalle regulier le long du trace (les extremites sont gardees)
const uniforme = (pts, pas) => { const o = [pts[0]]; let run = 0;
  for(let i = 1; i < pts.length; i++){ run += kmDe(pts[i - 1], pts[i]); if(run >= pas && i < pts.length - 1){ o.push(pts[i]); run = 0; } }
  o.push(pts[pts.length - 1]); return o; };
// trace adouci : 3 passes de Chaikin, points tous les 6 km, puis 4 passes de moyenne [1 2 1] (les extremites ne bougent pas)
const lisse = pts => {
  let p = pts.map(q => [q[0], q[1]]); for(let k = 0; k < 3; k++) p = chaikin(p);
  p = uniforme(p, 6);
  for(let it = 0; it < 4; it++){ const n = p.map(q => q.slice()); for(let i = 1; i < p.length - 1; i++) n[i] = [(p[i - 1][0] + 2 * p[i][0] + p[i + 1][0]) / 4, (p[i - 1][1] + 2 * p[i][1] + p[i + 1][1]) / 4]; p = n; }
  return p;
};
// ---- geometrie locale (km) autour d'un point
const plan = (o, p) => { const kx = 111.32 * Math.cos(o[1] * Math.PI / 180); let dl = p[0] - o[0]; dl -= 360 * Math.round(dl / 360); return [dl * kx, (p[1] - o[1]) * 110.57]; };
const hors = (o, v) => { const kx = 111.32 * Math.cos(o[1] * Math.PI / 180); return [o[0] + v[0] / kx, o[1] + v[1] / 110.57]; };
// point du cours c le plus proche de p (projete sur ses segments voisins du sommet le plus proche) + sens du courant
const entrees = new Map();                 // sommets des cours classes : { p, c, i }
const fin = [];                            // cours classes, dans l'ordre : pts lisses
const indexeSommets = (pts, c) => pts.forEach((p, i) => { const k = Math.floor(p[0] / PS) + ',' + Math.floor(p[1] / PS); (entrees.get(k) || entrees.set(k, []).get(k)).push({ p, c, i }); });
function procheCours(p, sauf){
  let best = null; const ci = Math.floor(p[0] / PS), cj = Math.floor(p[1] / PS);
  for(let i = ci - 2; i <= ci + 2; i++) for(let j = cj - 2; j <= cj + 2; j++) for(const q of entrees.get(i + ',' + j) || []){
    if(q.c === sauf) continue; const d = kmDe(p, q.p); if(!best || d < best.d) best = { d, c:q.c, i:q.i }; }
  if(!best) return null;
  const L = fin[best.c].pts; let res = null;
  for(let s = Math.max(0, best.i - 1); s <= Math.min(L.length - 2, best.i); s++){
    const a = plan(p, L[s]), b = plan(p, L[s + 1]), dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    let t = l2 ? -(a[0] * dx + a[1] * dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
    const px = a[0] + t * dx, py = a[1] + t * dy, d = Math.hypot(px, py), n = Math.hypot(dx, dy) || 1;
    if(!res || d < res.d) res = { d, c:best.c, pt:hors(p, [px, py]), tan:[dx / n, dy / n], s, t };
  }
  return res;
}
// raccord en courbe : les ~FILET derniers km de l'affluent sont remplaces par une courbe de Bezier qui arrive
// sur le fleuve dans le sens de son courant (confluence en Y, sans angle)
function raccorde(pts, J, T3){
  const n = pts.length; let run = 0, k = n - 1;
  const total = longueur(pts), L0 = Math.min(FILET, total * .35);
  while(k > 2 && run < L0){ run += kmDe(pts[k], pts[k - 1]); k--; }
  if(k < 2) { pts[n - 1] = J; return pts; }
  const P0 = pts[k], a = plan(P0, pts[k - 1]), T0 = (() => { const l = Math.hypot(a[0], a[1]) || 1; return [-a[0] / l, -a[1] / l]; })();
  const dJ = plan(P0, J), dist = Math.hypot(dJ[0], dJ[1]);
  if(dist < 1) { pts[n - 1] = J; return pts; }
  if(T0[0] * T3[0] + T0[1] * T3[1] < -0.2) { return pts.slice(0, k + 1).concat([J]); }   // demi-tour : pas de courbe
  const h = dist * .45, c1 = [T0[0] * h, T0[1] * h], c2 = [dJ[0] - T3[0] * h, dJ[1] - T3[1] * h], m = Math.max(4, Math.round(dist / 6)), out = pts.slice(0, k + 1);
  for(let s = 1; s <= m; s++){ const t = s / m, u = 1 - t;
    const x = 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * dJ[0], y = 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * dJ[1];
    out.push(hors(P0, [x, y])); }
  out[out.length - 1] = J;
  return out;
}
const resultat = [];
cours.forEach((c, idx) => {
  const e0 = c.pts[0], e1 = c.pts[c.pts.length - 1], deja = entrees.size > 0;
  const g = p => deja ? versGrandLisse(p, idx) : Infinity;
  const s0 = Math.min(versCote(e0), g(e0)), s1 = Math.min(versCote(e1), g(e1));
  const mouth1 = s1 <= s0, e = mouth1 ? e1 : e0;
  if(!mouth1) c.pts.reverse();                                                 // toujours : de la source vers l'aval
  const pe = c.pts, Lp = pe.length, avant = pe[Math.max(0, Lp - 1 - 4)], cote = procheCote(e), dir = plan0(avant, e), dn = Math.hypot(...dir) || 1, cn = Math.hypot(...cote.v) || 1;
  const versLaMer = cote.d <= MER || (cote.d <= 250 && (dir[0] * cote.v[0] + dir[1] * cote.v[1]) / (dn * cn) > .3);
  const dg = g(e);
  c.end = versLaMer && cote.d <= dg ? 'sea' : dg <= JONCTION ? 'join' : versLaMer ? 'sea' : 'inland';
  let p = lisse(c.pts);
  if(c.end === 'join'){
    const T = procheCours(p[p.length - 1], idx);
    if(T && T.d <= PORTEE) { p = raccorde(p, T.pt, T.tan); c.joint = fin[T.c].nom; }
    else c.end = 'inland';                                                      // pas de fleuve a portee : il s'arrete
  }
  c.pts = p; fin.push(c); indexeSommets(p, fin.length - 1); resultat.push(c);
});
function versGrandLisse(p, sauf){ let best = Infinity; const ci = Math.floor(p[0] / PS), cj = Math.floor(p[1] / PS);
  for(let i = ci - 1; i <= ci + 1; i++) for(let j = cj - 1; j <= cj + 1; j++) for(const q of entrees.get(i + ',' + j) || []) if(q.c !== sauf) best = Math.min(best, kmDe(p, q.p)); return best; }

// ---- croisements : deux cours qui se croisent sans se rejoindre font une croix ; si le second a peu de
// chemin apres le croisement, on l'arrete la et il devient un affluent du premier
const inter = (a, b, c, d) => { const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0]; if(Math.abs(den) < 1e-12) return null;
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den; return t > 0 && t < 1 && u > 0 && u < 1 ? { t, u } : null; };
const boite = pts => pts.reduce((b, q) => [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[0]), Math.max(b[3], q[1])], [1e9, 1e9, -1e9, -1e9]);
const boites = resultat.map(c => boite(c.pts));
let coupes = 0, croix = 0;
for(let j = 1; j < resultat.length; j++){
  const cj2 = resultat[j]; let fait = false;
  for(let i = 0; i < j && !fait; i++){
    const bi = boites[i], bj = boites[j]; if(bi[0] > bj[2] || bj[0] > bi[2] || bi[1] > bj[3] || bj[1] > bi[3]) continue;
    const A = resultat[i].pts, B = cj2.pts;
    for(let s = 0; s < B.length - 1 && !fait; s++) for(let q = 0; q < A.length - 1; q++){
      const x = inter(B[s], B[s + 1], A[q], A[q + 1]); if(!x) continue;
      const J = [B[s][0] + (B[s + 1][0] - B[s][0]) * x.t, B[s][1] + (B[s + 1][1] - B[s][1]) * x.t];
      const reste = longueur(B.slice(s + 1)), tot = longueur(B);
      if(s < 3 || B.length - s < 4) break;                                       // croisement tout au bout : la jonction existe deja
      if(reste < Math.max(120, tot * .3)){ cj2.pts = B.slice(0, s + 1).concat([J]); cj2.end = 'join'; coupes++; boites[j] = boite(cj2.pts); }
      else croix++;
      fait = true; break;
    }
  }
}

// ---- sortie : cours de moins de 60 km (100 km pour un affluent) ecartes, points arrondis
const rives = resultat.filter(c => longueur(c.pts) >= (c.end === 'join' ? 100 : 60)).map(c => ({ n:c.nom, cls:c.rang <= 2 ? 1 : c.rang <= 4 ? 2 : 3, end:c.end, pts:c.pts.map(q => [Math.round(q[0] * 1e4) / 1e4, Math.round(q[1] * 1e4) / 1e4]), trace:'reel' }));
console.log('croisements : ' + coupes + ' cours arretes sur le cours qu\'ils croisent, ' + croix + ' croix gardees');
// un affluent vient apres le cours auquel il se jette : les cours de rang plus grand sont deja avant
// cours dessines a la main (canaux) : ajoutes tels quels apres les cours generes
const manuels = fs.existsSync(path.join(__dirname, 'fleuves-manuels.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'fleuves-manuels.json'), 'utf8')).rivers : [];
manuels.forEach(m => rives.push(m));
const doc2 = { _doc:'Fleuves et rivieres generes par outils/build-fleuves-ne.js d\'apres Natural Earth 10m (rang <= ' + RANG_MAX + '). pts = cours [lon, lat], de la source vers l\'aval, adouci ; cls 1 geant, 2 grand, 3 moyen ; end : sea | join (affluent) | inland ; trace: reel. Ancienne liste a la main : rivers-world.ancien.json.', rivers:rives };
fs.writeFileSync(OUT, JSON.stringify(doc2));
const n = { 1:0, 2:0, 3:0 }, bilanFin = { sea:0, join:0, inland:0 }; rives.forEach(r => { n[r.cls]++; bilanFin[r.end]++; });
console.log('cours :', rives.length, '| cls', JSON.stringify(n), '| fin', JSON.stringify(bilanFin), '| points', rives.reduce((s, r) => s + r.pts.length, 0), '|', Math.round(fs.statSync(OUT).size / 1024), 'Ko');
