/* ---------- champs (Agriculture) ----------
   Un champ est une zone entièrement entourée par des routes. Outil « Champ » (menu Agriculture) : un clic gauche dans une zone fermée par des routes en fait un champ, dans son entièreté ;
   un clic sur un champ existant le supprime. S.champs = [{ id, pts (contour : le milieu des routes qui l'entourent), aire (m²) }].
   Les champs sont rattachés à la ferme céréalière la plus proche (CHAMP_PORTEE m) : une ferme qui cultive des céréales doit en avoir (champsDe), son rendement suit leur surface (AIRE_REF).
   Zones : les routes (le réseau de reseauRoutes, deplacements.js) forment un graphe ; ses faces intérieures sont les zones fermées (facesDe, après retrait des impasses). */
const CHAMP_PORTEE = 400, AIRE_REF = 2500, CHAMP_AIRE_MIN = 100;
const aireSignee = P => { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
// faces intérieures d'un graphe planaire R = { N:[[x, y]…], adj:[[[voisin, longueur]…]…] } : [{ poly, aire }]
function facesDe(R) {
  const n = R.N.length, nb = R.adj.map((l, i) => new Set(l.map(([j]) => j).filter(j => j !== i)));
  for (let i = 0; i < n; i++) for (const j of nb[i]) nb[j].add(i);                                  // (non orienté)
  const mort = new Uint8Array(n), pile = [];
  nb.forEach((s, i) => { if (s.size <= 1) pile.push(i); });
  while (pile.length) {                                                                              // on retire les impasses : elles n'entourent rien
    const i = pile.pop(); if (mort[i]) continue; mort[i] = 1;
    for (const j of nb[i]) if (!mort[j]) { nb[j].delete(i); if (nb[j].size <= 1) pile.push(j); }
    nb[i].clear();
  }
  const ord = nb.map((s, i) => mort[i] ? [] : [...s].sort((a, b) => Math.atan2(R.N[a][1] - R.N[i][1], R.N[a][0] - R.N[i][0]) - Math.atan2(R.N[b][1] - R.N[i][1], R.N[b][0] - R.N[i][0])));
  const vu = new Set(), faces = [];
  for (let i = 0; i < n; i++) for (const j of ord[i]) {
    if (vu.has(i * n + j)) continue;
    const ids = []; let a = i, b = j, garde = 0;
    do {
      vu.add(a * n + b); ids.push(a);
      const L = ord[b], k = L.indexOf(a), c = L[(k - 1 + L.length) % L.length];                     // au sommet b : le voisin juste avant a, dans l'ordre des angles
      a = b; b = c;
    } while (!(a === i && b === j) && ++garde < n * 4);
    const poly = ids.map(k => R.N[k]), aire = aireSignee(poly);
    if (garde < n * 4 && poly.length >= 3 && aire > 0) faces.push({ poly, aire });                   // (le signe positif : l'intérieur ; la face extérieure a le signe opposé)
  }
  return faces;
}
/* Graphe des routes pour les zones : celui de reseauRoutes (R.N, R.adj, R.segs, R.roadOf) COMPLÉTÉ — chaque croisement de deux routes devient un carrefour, et un bout de route posé sur le côté d'une autre
   (à moins de ATTACHE m) s'y raccorde : le tronçon est coupé en deux à cet endroit. Sans cela, une boucle de routes qui se rejoignent un peu à côté d'un point de tracé ne serait pas fermée. */
const ATTACHE = 3;
function grapheZones(R) {
  const N = R.N.map(p => p.slice()), adj = R.adj.map(l => new Set(l.map(([j]) => j)));
  for (let i = 0; i < adj.length; i++) for (const j of [...adj[i]]) adj[j].add(i);
  const n0 = R.N.length, B = 24, grille = new Map(), cle = (x, y) => Math.floor(x / B) + ',' + Math.floor(y / B);
  R.segs.forEach(([a, b], k) => {                                                                    // segments rangés par cases de 24 m
    const x0 = Math.min(N[a][0], N[b][0]), x1 = Math.max(N[a][0], N[b][0]), y0 = Math.min(N[a][1], N[b][1]), y1 = Math.max(N[a][1], N[b][1]);
    for (let x = Math.floor(x0 / B); x <= Math.floor(x1 / B); x++) for (let y = Math.floor(y0 / B); y <= Math.floor(y1 / B); y++) { const c = x + ',' + y; if (!grille.has(c)) grille.set(c, []); grille.get(c).push(k); }
  });
  const coupes = new Map(), coupe = (k, t, id) => { if (!coupes.has(k)) coupes.set(k, []); coupes.get(k).push({ t, id }); };
  // croisements
  const faits = new Set();
  for (const l of grille.values()) for (let x = 0; x < l.length; x++) for (let y = x + 1; y < l.length; y++) {
    const k1 = Math.min(l[x], l[y]), k2 = Math.max(l[x], l[y]), pk = k1 * 1e6 + k2; if (faits.has(pk)) continue; faits.add(pk);
    const [a, b] = R.segs[k1], [c, d] = R.segs[k2];
    if (R.roadOf[a] === R.roadOf[c] || a === c || a === d || b === c || b === d) continue;
    const q = segCross(N[a], N[b], N[c], N[d]); if (!q) continue;
    if (Math.hypot(q[0] - N[a][0], q[1] - N[a][1]) < .5 || Math.hypot(q[0] - N[b][0], q[1] - N[b][1]) < .5 || Math.hypot(q[0] - N[c][0], q[1] - N[c][1]) < .5 || Math.hypot(q[0] - N[d][0], q[1] - N[d][1]) < .5) continue;   // (déjà un carrefour)
    const id = N.push(q) - 1; adj.push(new Set());
    coupe(k1, segLen(N[a], q) / (segLen(N[a], N[b]) || 1), id); coupe(k2, segLen(N[c], q) / (segLen(N[c], N[d]) || 1), id);
  }
  // bouts de routes posés sur le côté d'une autre route
  const bouts = new Map();
  R.N.forEach((p, i) => { const r = R.roadOf[i]; if (!bouts.has(r)) bouts.set(r, [i, i]); else bouts.get(r)[1] = i; });
  for (const [r, [i0, i1]] of bouts) for (const e of [i0, i1]) {
    if ([...adj[e]].some(j => R.roadOf[j] !== r)) continue;                                           // (déjà raccordé)
    let best = null;
    const cx = Math.floor(N[e][0] / B), cy = Math.floor(N[e][1] / B);
    for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) for (const k of grille.get(gx + ',' + gy) || []) {
      const [a, b] = R.segs[k]; if (R.roadOf[a] === r) continue;
      const t = ptSeg(N[e], N[a], N[b]); if (t.d < ATTACHE && (!best || t.d < best.d)) best = { k, d:t.d, a, b, q:t.q };
    }
    if (best) {
      if (segLen(N[e], N[best.a]) < ATTACHE) adj[e].add(best.a), adj[best.a].add(e);
      else if (segLen(N[e], N[best.b]) < ATTACHE) adj[e].add(best.b), adj[best.b].add(e);
      else coupe(best.k, segLen(N[best.a], best.q) / (segLen(N[best.a], N[best.b]) || 1), e);
    }
  }
  for (const [k, l] of coupes) {                                                                      // un segment coupé : a – X1 – X2 – … – b
    const [a, b] = R.segs[k]; l.sort((p, q) => p.t - q.t);
    adj[a].delete(b); adj[b].delete(a);
    let prev = a; for (const { id } of l) { adj[prev].add(id); adj[id].add(prev); prev = id; }
    adj[prev].add(b); adj[b].add(prev);
  }
  // les nœuds de routes différentes très proches (raccords) n'en font qu'un : sans cela, des arêtes minuscules brouillent l'ordre des angles
  const rep = N.map((_, i) => i), trouve = i => { while (rep[i] !== i) { rep[i] = rep[rep[i]]; i = rep[i]; } return i; };
  adj.forEach((st, i) => { for (const j of st) if (j > i && (R.roadOf[i] === undefined || R.roadOf[j] === undefined || R.roadOf[i] !== R.roadOf[j]) && segLen(N[i], N[j]) < 2.5) rep[trouve(j)] = trouve(i); });
  const sortie = N.map(() => new Set());
  adj.forEach((st, i) => { for (const j of st) { const p = trouve(i), q = trouve(j); if (p !== q) { sortie[p].add(q); sortie[q].add(p); } } });
  return { N, adj:sortie.map(st => [...st].map(j => [j, 0])) };
}
let facesCache = { key:null, faces:[] };
function zonesFermees() {
  const R = reseauRoutes();
  if (facesCache.key !== R.key) facesCache = { key:R.key, faces:facesDe(grapheZones(R)) };
  return facesCache.faces;
}
// la plus petite zone fermée par des routes qui contient p, ou null
function zoneFermee(p) {
  let best = null;
  for (const f of zonesFermees()) if ((!best || f.aire < best.aire) && inPoly(p, f.poly)) best = f;
  return best;
}
const champAt = p => (S.champs || []).find(c => inPoly(p, c.pts)) || null;
// raison pour laquelle on ne peut pas faire un champ de la zone f, ou null
function champIssue(f) {
  if (f.aire < CHAMP_AIRE_MIN) return 'Zone trop petite pour un champ';
  if (S.houses.some(h => inPoly([h.x, h.y], f.poly))) return 'Un bâtiment se trouve dans cette zone';
  if ((S.champs || []).some(c => inPoly(c.pts[0], f.poly) || inPoly(f.poly[0], c.pts))) return 'Cette zone est déjà un champ';
  return null;
}
// clic gauche de l'outil Champ : fait un champ de la zone fermée sous le curseur, ou supprime le champ cliqué
function clicChamp() {
  if (!cursor) return;
  const ex = champAt(cursor);
  if (ex) { commit(); S.champs = S.champs.filter(c => c !== ex); changed(false); flash('Champ supprimé'); return; }
  const f = zoneFermee(cursor);
  if (!f) { flash(`Cliquez dans une zone entièrement entourée par des routes qui se rejoignent (${zonesFermees().length} zone(s) fermée(s) détectée(s) sur la carte)`, true); return; }
  const why = champIssue(f); if (why) { flash(why, true); return; }
  commit(); (S.champs = S.champs || []).push({ id:S.nextId++, pts:f.poly.map(p => [round2(p[0]), round2(p[1])]), aire:Math.round(f.aire) });
  changed(false); flash(`Champ créé : ${fmt(f.aire, 0)} m²`);
}
// ---- rattachement aux fermes : un champ est cultivé par la ferme céréalière la plus proche (à CHAMP_PORTEE m au plus)
const champCentre = c => { const b = bbox(c.pts); return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; };
function champsDe(h) {
  if (h.kind === 'ferme' && (h.ext || []).length) return [];                      // une ferme qui n'est pas en céréales ne compte aucun champ
  const fermes = S.houses.filter(o => o.kind === 'ferme' && !(o.ext || []).length);
  return (S.champs || []).filter(c => {
    const m = champCentre(c), d = segLen(m, [h.x, h.y]); if (d > CHAMP_PORTEE) return false;
    return !fermes.some(o => o !== h && segLen(m, [o.x, o.y]) < d);
  });
}
const aireChamps = h => champsDe(h).reduce((s, c) => s + c.aire, 0);
// points de travail dans un champ (quelques points à l'intérieur, toujours les mêmes)
const pointsChampCache = new WeakMap();
function pointsDeChamp(c) {
  let L = pointsChampCache.get(c); if (L) return L;
  const b = bbox(c.pts), pas = Math.max(6, Math.sqrt(c.aire) / 6); L = [];
  for (let x = b[0] + pas / 2; x < b[2]; x += pas) for (let y = b[1] + pas / 2; y < b[3]; y += pas) if (inPoly([x, y], c.pts)) L.push([round2(x), round2(y)]);
  if (!L.length) L.push(champCentre(c));
  pointsChampCache.set(c, L); return L;
}
// sens des sillons : celui du plus long côté du champ (calculé une fois)
const sillonsCache = new WeakMap();
function sensSillons(c) {
  let a = sillonsCache.get(c); if (a !== undefined) return a;
  let best = -1; a = 0;
  c.pts.forEach((p, i) => { const q = c.pts[(i + 1) % c.pts.length], L = segLen(p, q); if (L > best) { best = L; a = Math.atan2(q[1] - p[1], q[0] - p[0]); } });
  sillonsCache.set(c, a); return a;
}
// ---- dessin (décor) : terre labourée à sillons parallèles ; aperçu de la zone sous le curseur avec l'outil Champ
function drawChamps() {
  const list = S.champs || []; if (!list.length) return;
  const s = view.s, [wx0, wy0] = toW(0, 0), [wx1, wy1] = toW(W, H);
  for (const c of list) {
    const b = bbox(c.pts); if (b[2] < wx0 || b[0] > wx1 || b[3] < wy0 || b[1] > wy1) continue;
    ctx.beginPath(); c.pts.forEach((p, i) => { const [X, Y] = toS(p[0], p[1]); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath();
    ctx.fillStyle = Col['f-plough']; ctx.fill();
    ctx.strokeStyle = 'rgba(90,64,36,.55)'; ctx.lineWidth = Math.max(1, s * .25); ctx.stroke();                 // contour (avant les sillons : le tracé courant est le polygone)
    if (s > .5) {                                                                                       // sillons : traits parallèles, tous les 2,4 m
      ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(96,70,40,.35)'; ctx.lineWidth = Math.max(.8, s * .3); ctx.beginPath();
      const ang = sensSillons(c), dx = Math.cos(ang), dy = Math.sin(ang), cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, R = Math.hypot(b[2] - b[0], b[3] - b[1]) / 2 + 2;
      for (let k = -R; k <= R; k += 2.4) { const [X0, Y0] = toS(cx - dy * k - dx * R, cy + dx * k - dy * R), [X1, Y1] = toS(cx - dy * k + dx * R, cy + dx * k + dy * R); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); }
      ctx.stroke(); ctx.restore();
    }
  }
}
// aperçu : la zone sous le curseur (outil Champ)
function drawChampApercu() {
  if (tool !== 'champ' || !cursor) return;
  const ex = champAt(cursor), f = ex ? { poly:ex.pts, aire:ex.aire } : zoneFermee(cursor);
  if (!f) { hint('Cliquez dans une zone entièrement entourée par des routes'); return; }
  const why = ex ? null : champIssue(f);
  ctx.beginPath(); f.poly.forEach((p, i) => { const [X, Y] = toS(p[0], p[1]); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath();
  ctx.fillStyle = ex ? 'rgba(194,59,48,.25)' : why ? 'rgba(194,59,48,.2)' : 'rgba(60,138,92,.28)'; ctx.fill();
  ctx.setLineDash([6, 5]); ctx.strokeStyle = ex || why ? Col.bad : Col.accent; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
  hint(ex ? 'Clic : supprimer ce champ' : why || `Clic : créer un champ de ${fmt(f.aire, 0)} m²`);
}
