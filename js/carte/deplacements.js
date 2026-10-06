/* ---------- déplacements des habitants ----------
   Priorité à la route : dès qu'une route est disponible, l'habitant la rejoint au plus près,
   la suit par le plus court chemin du réseau jusqu'au point de route le plus proche de sa
   destination (le plus proche parmi les points qu'elle permet d'atteindre), et ne finit à pied qu'à partir de là. Il ne coupe à
   travers champs que s'il n'y a pas de route, si la route la plus proche est plus loin que sa destination, ou si la route ne le
   ferait avancer que de moins de 2 cases.
   Hors route, on marche deux fois moins vite. */
const VITESSE_TERRE = .5;                 // hors route : moitié de la vitesse sur route
const RACCORD = 2;                        // deux points de routes à moins de 2 m : carrefour
const ROUTE_MIN = 2 * CELL;               // en deçà de 16 m à faire sur la route, on va tout droit
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
  return (reseau = { key, v:sceneV, S, N, adj, segs });
}
// point de route le plus proche d'un lieu
function procheRoute(R, p) {
  let best = null;
  for (const [a, b] of R.segs) { const t = ptSeg(p, R.N[a], R.N[b]); if (!best || t.d < best.d) best = { d:t.d, q:t.q, a, b }; }
  return best;
}
// Trajet de A à B : liste d'étapes { p:[x, y], route } (route : l'étape se parcourt sur la route).
// Règle : l'habitant sort de son bâtiment, rejoint la route la plus proche, la suit (par le plus court chemin du réseau) jusqu'au
// point de route ATTEIGNABLE le plus proche de sa destination, puis finit hors chemin jusqu'à la destination. Valable pour tous
// les habitants (marcher() sert aux ouvriers de tous les bâtiments). Il ne va tout droit que s'il n'y a pas de route, si la route
// la plus proche est plus loin que la destination elle-même, ou si la route ne le ferait avancer que de moins de 2 cases.
function trajet(A, B) {
  const direct = [{ p:B, route:false }], R = reseauRoutes();
  if (!R.segs.length) return direct;
  const pa = procheRoute(R, A);
  if (pa.d > segLen(A, B)) return direct;                    // la route est plus loin que la destination
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
  if (!best || segLen(pa.q, best.q) < ROUTE_MIN) return direct;     // la route ne mène nulle part (ou à moins de 2 cases)
  if (best.meme) return [{ p:pa.q, route:false }, { p:best.q, route:true }, { p:B, route:false }];
  const noeuds = [];
  for (let k = best.via; k >= 0; k = prev[k]) noeuds.unshift(R.N[k]);
  return [{ p:pa.q, route:false }, ...noeuds.map(p => ({ p, route:true })), { p:best.q, route:true }, { p:B, route:false }];
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
