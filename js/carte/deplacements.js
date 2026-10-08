/* ---------- déplacements des habitants ----------
   Priorité à la route : dès qu'une route est disponible, l'habitant la rejoint au plus près,
   la suit par le plus court chemin du réseau jusqu'au point de route le plus proche de sa
   destination (le plus proche parmi les points qu'elle permet d'atteindre), et ne finit à pied qu'à partir de là. Il ne coupe à
   travers champs que s'il n'y a pas de route, si la route la plus proche est plus loin que sa destination, ou si la route ne le
   ferait avancer que de moins de 2 cases.
   Les bâtiments ne se traversent jamais (voir plus bas : portes et contournements). Hors route, on marche deux fois moins vite. */
const VITESSE_TERRE = .5;                 // hors route : moitié de la vitesse sur route
const RACCORD = 2;
/* Sens de circulation : on circule à DROITE (sens de la marche). Sur une route, les personnages suivent la voie de droite, à VOIE m de l'axe (au plus le quart de la largeur de la chaussée) ;
   les deux sens se croisent donc sur deux voies. Vaut pour toutes les routes (de base et tracées par le joueur) : calculé d'après le tracé, rien à mettre à jour sur les routes déjà posées. */
const VOIE = 2;
function surVoie(pts, larg) {
  const P = [], W = [];                                                            // points quasi confondus (raccord de deux routes) : un seul
  pts.forEach((p, i) => { if (!P.length || segLen(p, P[P.length - 1]) > 1.2) { P.push(p); W.push(larg[i]); } });
  const n = P.length; if (n < 2) return P.slice();
  const N = []; for (let i = 0; i < n - 1; i++) { const dx = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1], L = Math.hypot(dx, dy) || 1; N.push([-dy / L, dx / L]); }   // normale à droite de chaque tronçon (axe y vers le bas)
  return P.map((p, i) => {
    const o = Math.min(VOIE, (W[i] || 8) / 4); let m;
    if (i === 0) m = N[0]; else if (i === n - 1) m = N[n - 2];
    else {                                                                         // angle : la voie tourne avec la route (joint en onglet, pas de détour par le bord)
      const a = N[i - 1], b = N[i], c = 1 + a[0] * b[0] + a[1] * b[1]; m = c > .25 ? [(a[0] + b[0]) / c, (a[1] + b[1]) / c] : [a[0] + b[0], a[1] + b[1]];
      const l = Math.hypot(m[0], m[1]); if (l > 2) m = [m[0] / l * 2, m[1] / l * 2];
    }
    return [round2(p[0] + m[0] * o), round2(p[1] + m[1] * o)];
  });
}
const SAUT_DIRECT = 16;                   // en dessous de cette distance (m, 2 cases) on ne prend pas la route (tous les autres trajets passent par la route)                        // deux points de routes à moins de 2 m : carrefour
let reseau = null;
// Réseau des routes : les points du tracé lissé (celui qui est dessiné), reliés le long de
// chaque route, et d'une route à l'autre là où elles se touchent (raccords, croisements).
function reseauRoutes() {
  // refait seulement si le décor a changé et que les routes ne sont plus les mêmes (signature complète calculée rarement)
  if (reseau && reseau.v === sceneV && reseau.S === S) return reseau;
  const key = S.roads.map(r => r.id + ':' + r.pts.map(p => p[0] + ',' + p[1]).join(';')).join('|');
  if (reseau && reseau.key === key) { reseau.v = sceneV; reseau.S = S; return reseau; }
  const N = [], adj = [], segs = [], roadOf = [];
  const link = (a, b) => { const L = segLen(N[a], N[b]); adj[a].push([b, L]); adj[b].push([a, L]); };
  S.roads.forEach((r, ri) => {
    const P = smoothPts(r), i0 = N.length;
    P.forEach(p => { N.push(p); adj.push([]); roadOf.push(ri); });
    for (let k = i0; k < N.length - 1; k++) { link(k, k + 1); segs.push([k, k + 1]); }
    if (N.length - i0 > 3 && segLen(N[i0], N[N.length - 1]) < RACCORD * 2) link(i0, N.length - 1);   // route qui se referme sur elle-même (zone fermée : champs)
  });
  // carrefours : grille de 4 m, on relie les points de routes différentes très proches
  const grid = new Map(), cell = p => Math.floor(p[0] / 4) + ',' + Math.floor(p[1] / 4);
  N.forEach((p, i) => { const k = cell(p); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
  N.forEach((p, i) => {
    const cx = Math.floor(p[0] / 4), cy = Math.floor(p[1] / 4);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++)
      for (const j of grid.get((cx + dx) + ',' + (cy + dy)) || [])
        if (j > i && roadOf[j] !== roadOf[i] && segLen(p, N[j]) < RACCORD) link(i, j);
  });
  return (reseau = { key, v:sceneV, S, N, adj, segs, roadOf });
}
// point de route le plus proche d'un lieu
function procheRoute(R, p, vehicule) {                                                       // vehicule : sans les chemins (réservés aux piétons)
  let best = null;
  for (const [a, b] of R.segs) { if (vehicule && (ROADS.find(k => k.id === (S.roads[R.roadOf[a]] || {}).kind) || {}).pieton) continue; const t = ptSeg(p, R.N[a], R.N[b]); if (!best || t.d < best.d) best = { d:t.d, q:t.q, a, b }; }
  return best;
}
// Trajet de A à B : liste d'étapes { p:[x, y], route } (route : l'étape se parcourt sur la route).
// Règle : l'habitant sort de son bâtiment, rejoint la route la plus proche, la suit (par le plus court chemin du réseau) jusqu'au
// point de route ATTEIGNABLE le plus proche de sa destination, puis finit hors chemin jusqu'à la destination. Valable pour tous
// les habitants (marcher() sert aux ouvriers de tous les bâtiments). Il ne va tout droit que s'il n'y a pas de route, si la route
// la plus proche est plus loin que la destination elle-même, ou si la route ne le ferait avancer que de moins de 2 cases.
function trajetExterieur(A, B) {
  const hors = (P, Q) => contourner(P, Q).map(p => ({ p, route:false }));      // un tronçon hors route : droit, ou autour des bâtiments
  const direct = hors(A, B), R = reseauRoutes();
  if (!R.segs.length || segLen(A, B) <= SAUT_DIRECT) return direct;                  // petit déplacement (d'un arbre à l'autre, de l'arbre à la charrette) : tout droit, pas de détour par la route
  const pa = procheRoute(R, A);
  // plus courts chemins depuis le point d'entrée vers tout le réseau (Dijkstra)
  const n = R.N.length, dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), tas = [];
  const pousser = (i, d) => { tas.push([d, i]); let k = tas.length - 1; while (k) { const m = (k - 1) >> 1; if (tas[m][0] <= tas[k][0]) break; [tas[m], tas[k]] = [tas[k], tas[m]]; k = m; } };
  const tirer = () => { const top = tas[0], last = tas.pop(); if (tas.length) { tas[0] = last; let k = 0;
    for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < tas.length && tas[l][0] < tas[m][0]) m = l; if (r < tas.length && tas[r][0] < tas[m][0]) m = r; if (m === k) break; [tas[m], tas[k]] = [tas[k], tas[m]]; k = m; } } return top; };
  for (const i of [pa.a, pa.b]) { dist[i] = segLen(pa.q, R.N[i]); pousser(i, dist[i]); }
  while (tas.length) { const [d, i] = tirer(); if (d > dist[i]) continue; for (const [j, L] of R.adj[i]) if (d + L < dist[j]) { dist[j] = d + L; prev[j] = i; pousser(j, d + L); } }
  // sortie : parmi les tronçons atteignables, le point le plus proche de la destination (à égalité, le trajet le plus court)
  let best = null;
  for (const [i, j] of R.segs) {
    if (!isFinite(dist[i]) && !isFinite(dist[j])) continue;
    const t = ptSeg(B, R.N[i], R.N[j]);
    const meme = i === pa.a && j === pa.b || i === pa.b && j === pa.a;      // le tronçon même d'entrée : on y glisse directement
    const ci = dist[i] + segLen(R.N[i], t.q), cj = dist[j] + segLen(R.N[j], t.q), c = meme ? segLen(pa.q, t.q) : Math.min(ci, cj);
    if (!best || t.d < best.d - .5 || (Math.abs(t.d - best.d) <= .5 && c < best.c)) best = { d:t.d, q:t.q, c, i, j, meme, via:ci <= cj ? i : j };
  }
  if (!best) return direct;
  if (best.meme) { const w0 = (S.roads[R.roadOf[pa.a]] || {}).w, v = surVoie([pa.q, best.q], [w0, w0]); return [...hors(A, v[0]), { p:v[v.length - 1], route:true }, ...hors(v[v.length - 1], B)]; }   // (de la porte tout droit à la voie de droite, et de la voie à la porte)
  const idx = [];
  for (let k = best.via; k >= 0; k = prev[k]) idx.unshift(k);
  const autreEntree = idx[0] === pa.a ? pa.b : idx[0] === pa.b ? pa.a : null;
  if (autreEntree !== null && idx.length > 1 && idx[1] === autreEntree) idx.shift();                    // le départ est entre ces deux noeuds : pas de retour au noeud
  const autreSortie = best.via === best.i ? best.j : best.i;
  if (idx.length > 1 && idx[idx.length - 2] === autreSortie) idx.pop();                               // on arrive par l'autre bout du tronçon : pas de détour par le noeud
  const larg = k => (S.roads[R.roadOf[k]] || {}).w, voie = surVoie([pa.q, ...idx.map(k => R.N[k]), best.q], [larg(pa.a), ...idx.map(larg), larg(best.i)]);   // sur la voie de droite, du point d'entrée au point de sortie
  return [...hors(A, voie[0]), ...voie.map(p => ({ p, route:true })), ...hors(voie[voie.length - 1], B)];
}
/* ---------- bâtiments : jamais traversés ----------
   Un habitant sort de son bâtiment par un point de son pourtour (le plus proche de la route), marche dehors (routes d'abord) et entre
   dans sa destination par un point de son pourtour. Hors route, il contourne tous les bâtiments (graphe de visibilité sur leurs coins). */
const MARGE_BAT = 1.2;
const batimentSous = p => S.houses.find(h => inPoly(p, corners(h))) || null;
// point du pourtour du bâtiment h le plus proche de T, poussé de 0,8 m vers l'extérieur
function porte(h, T) {
  const C = corners(h); let best = null, bd = Infinity;
  for (let i = 0; i < C.length; i++) { const t = ptSeg(T, C[i], C[(i + 1) % C.length]); if (t.d < bd) { bd = t.d; best = t.q; } }
  const L = segLen(best, [h.x, h.y]) || 1;
  return [round2(best[0] + (best[0] - h.x) / L * .8), round2(best[1] + (best[1] - h.y) / L * .8)];
}
const croise = (a, b, C) => inPoly(a, C) || inPoly(b, C) || C.some((c, i) => segCross(a, b, c, C[(i + 1) % C.length]));
// points de passage de P à Q hors route : [Q], ou un détour par les coins des bâtiments qui barrent la ligne droite
function contourner(P, Q) {
  const bb = bbox([P, Q]), m = 40, obst = S.houses.filter(h => { const c = corners(h), b = bbox(c); return b[2] > bb[0] - m && b[0] < bb[2] + m && b[3] > bb[1] - m && b[1] < bb[3] + m; }).map(h => ({ C:corners(h), h }));
  const gene = obst.filter(o => croise(P, Q, o.C));
  if (!gene.length) return [Q];
  const nodes = [P, Q];
  for (const o of obst) for (const c of o.C) { const L = segLen(c, [o.h.x, o.h.y]) || 1; nodes.push([c[0] + (c[0] - o.h.x) / L * MARGE_BAT, c[1] + (c[1] - o.h.y) / L * MARGE_BAT]); }
  const libre = (a, b) => !obst.some(o => croise(a, b, o.C));
  const n = nodes.length, dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), done = new Uint8Array(n); dist[0] = 0;
  for (;;) {
    let u = -1; for (let i = 0; i < n; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || u === 1) break;
    done[u] = 1;
    for (let v = 0; v < n; v++) if (!done[v]) { const w = segLen(nodes[u], nodes[v]); if (dist[u] + w < dist[v] && libre(nodes[u], nodes[v])) { dist[v] = dist[u] + w; prev[v] = u; } }
  }
  if (!isFinite(dist[1])) return [Q];                                   // aucun détour trouvé : tout droit
  const out = []; for (let k = 1; k !== 0; k = prev[k]) out.unshift(nodes[k]);
  return out;
}
// Trajet de A à B : liste d'étapes { p:[x, y], route } (route : l'étape se parcourt sur la route)
function trajet(A, B) {
  const bA = batimentSous(A), bB = batimentSous(B), R = reseauRoutes();
  let depart = A, arrivee = B; const debut = [], fin = [];
  if (bA) {                                                              // sortie : par la porte la plus proche de la route (ou de la destination)
    const T = R.segs.length ? procheRoute(R, A).q : B;
    depart = porte(bA, T); debut.push({ p:depart, route:false });
  }
  if (bB && bB !== bA) {                                                 // entrée : par la porte tournée vers d'où l'on vient
    arrivee = porte(bB, depart); fin.push({ p:B, route:false });
  } else if (bB) return [{ p:B, route:false }];                     // même bâtiment : on y reste
  return [...debut, ...trajetExterieur(depart, arrivee), ...fin];
}
// Fait avancer l'habitant w vers (tx, ty) pendant dt secondes, à la vitesse v sur route
// (v × VITESSE_TERRE hors route). Renvoie true à l'arrivée.
function marcher(w, tx, ty, v, dt) {
  const R = reseauRoutes();
  if (!w.chemin || w.chemin.x !== tx || w.chemin.y !== ty || w.chemin.key !== R.key)
    w.chemin = { x:tx, y:ty, key:R.key, etapes:trajet([w.x, w.y], [tx, ty]) };
  const E = w.chemin.etapes;
  let t = dt;
  while (E.length && t > 0) {
    const { p, route } = E[0], vit = v * (route ? 1 : VITESSE_TERRE), d = Math.hypot(p[0] - w.x, p[1] - w.y);
    if (vit * t >= d) { w.x = p[0]; w.y = p[1]; t -= d / vit; E.shift(); }
    else { w.x += (p[0] - w.x) / d * vit * t; w.y += (p[1] - w.y) / d * vit * t; t = 0; }
  }
  w.surRoute = E.length ? E[0].route : false;
  if (E.length && !E[0].route) { w.horsT = (w.horsT || 0) + dt; w.horsBut = [Math.round(tx), Math.round(ty)]; w.horsEtat = w.state; }   // (diagnostic : temps passé hors route, voir le profil de demarrage.js)
  if (E.length) return false;
  w.chemin = null; return true;
}
