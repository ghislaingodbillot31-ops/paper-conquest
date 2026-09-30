/* ---------- déplacements des habitants ----------
   Les habitants empruntent les routes quand elles sont disponibles : un trajet va à pied
   jusqu'au point de route le plus proche, suit le réseau (le plus court chemin), puis
   rejoint sa destination. Hors route, on marche deux fois moins vite : la route n'est prise
   que si elle fait gagner du temps (à deux pas d'un arbre, on ne fait pas le détour). */
const VITESSE_TERRE = .5;                 // hors route : moitié de la vitesse sur route
const RACCORD = 2;                        // deux points de routes à moins de 2 m : carrefour
let reseau = null;
// Réseau des routes : les points du tracé lissé (celui qui est dessiné), reliés le long de
// chaque route, et d'une route à l'autre là où elles se touchent (raccords, croisements).
function reseauRoutes() {
  const key = S.roads.map(r => r.id + ':' + r.pts.map(p => p[0] + ',' + p[1]).join(';')).join('|');
  if (reseau && reseau.key === key) return reseau;
  const N = [], adj = [], segs = [], roadOf = [];
  const link = (a, b) => { const L = segLen(N[a], N[b]); adj[a].push([b, L]); adj[b].push([a, L]); };
  S.roads.forEach((r, ri) => {
    const P = smoothPts(r), i0 = N.length;
    P.forEach(p => { N.push(p); adj.push([]); roadOf.push(ri); });
    for (let k = i0; k < N.length - 1; k++) { link(k, k + 1); segs.push([k, k + 1]); }
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
  return (reseau = { key, N, adj, segs });
}
// point de route le plus proche d'un lieu
function procheRoute(R, p) {
  let best = null;
  for (const [a, b] of R.segs) { const t = ptSeg(p, R.N[a], R.N[b]); if (!best || t.d < best.d) best = { d:t.d, q:t.q, a, b }; }
  return best;
}
// Trajet de A à B : liste d'étapes { p:[x, y], route } (route : l'étape se parcourt sur la route)
function trajet(A, B) {
  const direct = [{ p:B, route:false }], R = reseauRoutes();
  if (!R.segs.length) return direct;
  const pa = procheRoute(R, A), pb = procheRoute(R, B), V = VITESSE_TERRE;
  const coutDirect = segLen(A, B) / V;
  // même par la route la plus directe, le détour ne paierait pas : on coupe à travers champs
  if ((pa.d + pb.d) / V + segLen(pa.q, pb.q) >= coutDirect) return direct;
  // plus court chemin sur le réseau (Dijkstra), du point d'entrée au point de sortie
  const dist = new Float64Array(R.N.length).fill(Infinity), prev = new Int32Array(R.N.length).fill(-1), tas = [];
  const pousser = (i, d) => { tas.push([d, i]); let k = tas.length - 1; while (k) { const m = (k - 1) >> 1; if (tas[m][0] <= tas[k][0]) break; [tas[m], tas[k]] = [tas[k], tas[m]]; k = m; } };
  const tirer = () => { const top = tas[0], last = tas.pop(); if (tas.length) { tas[0] = last; let k = 0;
    for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < tas.length && tas[l][0] < tas[m][0]) m = l; if (r < tas.length && tas[r][0] < tas[m][0]) m = r; if (m === k) break; [tas[m], tas[k]] = [tas[k], tas[m]]; k = m; } } return top; };
  for (const i of [pa.a, pa.b]) { dist[i] = segLen(pa.q, R.N[i]); pousser(i, dist[i]); }
  const fin = i => dist[i] + segLen(R.N[i], pb.q);
  let meilleur = Infinity, sortie = -1;
  const memeTroncon = pa.a === pb.a && pa.b === pb.b;
  if (memeTroncon) meilleur = segLen(pa.q, pb.q);
  while (tas.length) {
    const [d, i] = tirer();
    if (d > dist[i]) continue;
    if (d >= meilleur) break;
    if ((i === pb.a || i === pb.b) && fin(i) < meilleur) { meilleur = fin(i); sortie = i; }
    for (const [j, L] of R.adj[i]) if (d + L < dist[j]) { dist[j] = d + L; prev[j] = i; pousser(j, d + L); }
  }
  if (!isFinite(meilleur) || (pa.d + pb.d) / V + meilleur >= coutDirect) return direct;
  const noeuds = [];
  for (let i = sortie; i >= 0; i = prev[i]) noeuds.unshift(R.N[i]);
  return [{ p:pa.q, route:false }, ...noeuds.map(p => ({ p, route:true })), { p:pb.q, route:true }, { p:B, route:false }];
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
  if (E.length) return false;
  w.chemin = null; return true;
}
