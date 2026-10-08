/* ---------- villageois et chariots sur la map test : poser, déplacer ----------
   S.villageois : { id, kind (clé de VILLAGEOIS), x, y, a } ; S.chariots : { id, kind (clé de CHARIOTS), x, y, a (cap de la caisse) } (centre de la caisse). Dessins : villageois.js, chariots.js.
   - Poser : catégories « Villageois » / « Chariots » + « Placer » : UNIQUEMENT sur une route (le point est ramené sur la route la plus proche, à 20 m au plus ; les ponts comptent comme route).
   - Déplacer : outil « Déplacer villageois / chariot » : un clic sur un villageois ou un chariot le choisit, un clic sur une route l'y envoie par le plus court chemin de route (A* sur la grille des routes) ;
     le chariot à cheval tourne comme une remorque (chariotPas, chariots.js : le cheval tire le pivot de l'essieu avant, la caisse suit) ; il braque, ne peut pas pivoter sur place. */
const marcheRt = new Map();                                                    // état de mouvement (non enregistré) : 'v12' / 'c3' → { chemin, v, st, ah }
let marcheSel = null;
const marcheCle = (type, o) => type + o.id;

/* ---- grille des routes : cases de 2 m ; « cœur » = au moins 1,2 m à l'intérieur de la chaussée (là où l'on planifie le chemin), « plein » = toute la chaussée (limite à ne pas quitter) ---- */
const RT = { c:2, W:0, H:0, core:null, full:null, key:null };
function routeGrille() {
  const key = S.roads.map(r => r.id + ':' + r.w + ':' + r.pts.length + ':' + r.pts[0] + ':' + r.pts[r.pts.length - 1]).join('|') + ':' + S.roads.length;
  if (RT.key === key && RT.core) return;
  RT.key = key; const c = RT.c, W = RT.W = Math.ceil(TW / c), H = RT.H = Math.ceil(TH / c);
  RT.core = new Uint8Array(W * H); RT.full = new Uint8Array(W * H);
  const stamp = (grid, x, y, r) => { const i0 = Math.max(0, Math.floor((x - r) / c)), i1 = Math.min(W - 1, Math.floor((x + r) / c)), j0 = Math.max(0, Math.floor((y - r) / c)), j1 = Math.min(H - 1, Math.floor((y + r) / c)), r2 = r * r;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const dx = (i + .5) * c - x, dy = (j + .5) * c - y; if (dx * dx + dy * dy <= r2) grid[j * W + i] = 1; } };
  for (const r of S.roads) {
    const P = smoothPts(r), hw = r.w / 2;
    for (let k = 0; k < P.length - 1; k++) { const a = P[k], b = P[k + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 1));
      for (let t = 0; t <= n; t++) { const x = a[0] + (b[0] - a[0]) * t / n, y = a[1] + (b[1] - a[1]) * t / n; stamp(RT.full, x, y, hw); stamp(RT.core, x, y, Math.max(1, hw - 1.2)); } }
  }
}
const routeOk = (x, y, grid = 'full') => { const g = RT[grid], i = Math.floor(x / RT.c), j = Math.floor(y / RT.c); return i >= 0 && j >= 0 && i < RT.W && j < RT.H && g[j * RT.W + i] === 1; };
function routeProche(x, y, R = 20) {                                           // case de cœur la plus proche d'un point, à R m au plus : [x, y] en mètres, ou null
  routeGrille(); const c = RT.c, i0 = Math.floor(x / c), j0 = Math.floor(y / c), n = Math.ceil(R / c); let best = null, bd = 1e9;
  for (let j = j0 - n; j <= j0 + n; j++) for (let i = i0 - n; i <= i0 + n; i++) if (i >= 0 && j >= 0 && i < RT.W && j < RT.H && RT.core[j * RT.W + i]) { const d = (i - i0) ** 2 + (j - j0) ** 2; if (d < bd) { bd = d; best = [(i + .5) * c, (j + .5) * c]; } }
  return best && Math.hypot(best[0] - x, best[1] - y) <= R ? best : null;
}
function routeChemin(A, B) {                                                   // A* sur les cases de cœur ; points tous les ~5 m le long du chemin lissé, ou null
  routeGrille(); const c = RT.c, W = RT.W, N = W * RT.H, core = RT.core;
  const si = Math.floor(A[0] / c), sj = Math.floor(A[1] / c), gi = Math.floor(B[0] / c), gj = Math.floor(B[1] / c), sk = sj * W + si, gk = gj * W + gi;
  if (!core[sk] || !core[gk]) return null;
  const G = new Float32Array(N).fill(Infinity), F = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  let cap = 1 << 18, hf = new Float32Array(cap), hk = new Int32Array(cap), hn = 0;
  const push = (fv, k) => { if (hn === cap) { cap *= 2; const nf = new Float32Array(cap), nk = new Int32Array(cap); nf.set(hf); nk.set(hk); hf = nf; hk = nk; } let i = hn++; while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= fv) break; hf[i] = hf[p]; hk[i] = hk[p]; i = p; } hf[i] = fv; hk[i] = k; };
  const pop = () => { const k0 = hk[0], fv = hf[--hn], k = hk[hn]; let i = 0; for (;;) { let l = 2 * i + 1; if (l >= hn) break; if (l + 1 < hn && hf[l + 1] < hf[l]) l++; if (hf[l] >= fv) break; hf[i] = hf[l]; hk[i] = hk[l]; i = l; } if (hn > 0) { hf[i] = fv; hk[i] = k; } return k0; };
  const hh = (i, j) => { const dx = Math.abs(i - gi), dy = Math.abs(j - gj); return 1.1 * (Math.max(dx, dy) + .414 * Math.min(dx, dy)); };
  G[sk] = 0; push(hh(si, sj), sk); let found = false;
  while (hn) {
    const k = pop(); if (closed[k]) continue; closed[k] = 1; if (k === gk) { found = true; break; }
    const i = k % W, j = (k / W) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue; const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= RT.H) continue; const nk = nj * W + ni; if (!core[nk]) continue;
      if (di && dj && !(core[j * W + ni] && core[nj * W + i])) continue;
      const ng = G[k] + (di && dj ? 1.414 : 1); if (ng < G[nk]) { G[nk] = ng; F[nk] = k; push(ng + hh(ni, nj), nk); }
    }
  }
  if (!found) return null;
  const cells = []; for (let k = gk; k !== -1; k = F[k]) cells.push([(k % W + .5) * c, (((k / W) | 0) + .5) * c]); cells.reverse();
  const libre = (P, Q) => { const n = Math.ceil(Math.hypot(Q[0] - P[0], Q[1] - P[1]) / (c * .5)); for (let t = 1; t < n; t++) if (!routeOk(P[0] + (Q[0] - P[0]) * t / n, P[1] + (Q[1] - P[1]) * t / n, 'core')) return false; return true; };
  const lisse = [cells[0]]; let a = 0;                                                                              // ligne droite tant que la chaussée le permet
  while (a < cells.length - 1) { let z = Math.min(cells.length - 1, a + 40); while (z > a + 1 && !libre(cells[a], cells[z])) z--; lisse.push(cells[z]); a = z; }
  const out = [lisse[0]];                                                                                           // un point tous les ~5 m : un chariot suit mieux un tracé dense
  for (let k = 1; k < lisse.length; k++) { const P = lisse[k - 1], Q = lisse[k], n = Math.max(1, Math.round(Math.hypot(Q[0] - P[0], Q[1] - P[1]) / 5)); for (let t = 1; t <= n; t++) out.push([P[0] + (Q[0] - P[0]) * t / n, P[1] + (Q[1] - P[1]) * t / n]); }
  return out;
}
/* ---- voies : deux voies par route, on roule à DROITE (comme le code de la route) ----
   Le chemin est cherché sur l'AXE des routes (graphe de points tous les 5 m le long de chaque route lissée, reliés aux carrefours : deux routes qui se frôlent à moins de 6,5 m),
   puis lissé, puis décalé vers la droite du sens de marche d'un quart de chaussée (VOIE m, au plus 2,2 m : au milieu de la voie, jamais sur la bordure). Un véhicule qui part du bord ou
   de l'autre voie rejoint sa voie en douceur (sur ~25 m). L'autre sens de circulation passe donc sur l'autre voie, à gauche vu du premier. */
const VOIE_PAS = 5, VOIE_LIEN = 6.5;
let voiesCache = { key:null, N:null };
function voiesGraphe() {
  routeGrille();
  if (voiesCache.key === RT.key && voiesCache.N) return voiesCache.N;
  const X = [], Y = [], R = [], adj = [];
  for (const r of S.roads) {
    const P = smoothPts(r); let carry = 0, prev = null;
    const add = (x, y) => { const i = X.length; X.push(x); Y.push(y); R.push(r.id); adj.push([]); if (prev !== null) { const d = Math.hypot(x - X[prev], y - Y[prev]); adj[prev].push([i, d]); adj[i].push([prev, d]); } prev = i; };
    add(P[0][0], P[0][1]);
    for (let k = 0; k < P.length - 1; k++) { const a = P[k], b = P[k + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); let t = VOIE_PAS - carry; while (t <= L) { add(a[0] + (b[0] - a[0]) * t / L, a[1] + (b[1] - a[1]) * t / L); t += VOIE_PAS; } carry = L - (t - VOIE_PAS); }
    const e = P[P.length - 1]; if (Math.hypot(e[0] - X[prev], e[1] - Y[prev]) > 1) add(e[0], e[1]);
  }
  const H = new Map(), kc = (i, j) => i * 100003 + j, cs = VOIE_LIEN;                                                // carrefours : nœuds de routes différentes qui se touchent
  X.forEach((x, i) => { const ci = Math.floor(x / cs), cj = Math.floor(Y[i] / cs); for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) for (const j of H.get(kc(ci + di, cj + dj)) || []) {
    if (R[j] === R[i]) continue; const d = Math.hypot(X[j] - x, Y[j] - Y[i]); if (d <= VOIE_LIEN) { adj[i].push([j, d + .5]); adj[j].push([i, d + .5]); } }
    const k = kc(ci, cj); (H.get(k) || H.set(k, []).get(k)).push(i); });
  return voiesCache = { key:RT.key, N:{ X, Y, adj } }.N;
}
const voieDecalage = () => Math.min(2.2, Math.max(1.2, Math.min(...S.roads.filter(r => !roadType(r).pieton).map(r => r.w)) / 4));   // (les chemins piétons ne comptent pas : voies des véhicules)
function voieChemin(A, B) {                                                    // chemin (points tous les ~4 m) de A à B, sur la voie de droite ; ou null
  const { X, Y, adj } = voiesGraphe(), n = X.length; if (!n) return null;
  const proche = (p, R) => { let b = -1, bd = R * R; for (let i = 0; i < n; i++) { const d = (X[i] - p[0]) ** 2 + (Y[i] - p[1]) ** 2; if (d < bd) { bd = d; b = i; } } return b; };
  const s0 = proche(A, 18), g0 = proche(B, 28); if (s0 < 0 || g0 < 0) return null;
  const D = new Float64Array(n).fill(Infinity), F = new Int32Array(n).fill(-1), done = new Uint8Array(n); D[s0] = 0;
  const heap = [[0, s0]], push = e => { heap.push(e); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const t = heap[0], l = heap.pop(); if (heap.length) { heap[0] = l; let i = 0; for (;;) { let a = 2 * i + 1, b = a + 1, m = i; if (a < heap.length && heap[a][0] < heap[m][0]) m = a; if (b < heap.length && heap[b][0] < heap[m][0]) m = b; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return t; };
  while (heap.length) { const [d, u] = pop(); if (done[u]) continue; done[u] = 1; if (u === g0) break; for (const [v, w] of adj[u]) if (d + w < D[v]) { D[v] = d + w; F[v] = u; push([D[v], v]); } }
  if (!done[g0]) return null;
  let pts = []; for (let k = g0; k !== -1; k = F[k]) pts.push([X[k], Y[k]]); pts.reverse();
  if (Math.hypot(A[0] - pts[0][0], A[1] - pts[0][1]) > 2) pts.unshift([A[0], A[1]]);
  for (let it = 0; it < 2; it++) { const Q = [pts[0]]; for (let k = 0; k < pts.length - 1; k++) { const a = pts[k], b = pts[k + 1]; if (k > 0) Q.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25]); if (k < pts.length - 2) Q.push([a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); } Q.push(pts[pts.length - 1]); pts = Q; }   // lissage
  const out = [pts[0]]; let acc = 0;                                                                              // un point tous les 4 m
  for (let k = 1; k < pts.length; k++) { const L = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); acc += L; if (acc >= 4) { out.push(pts[k]); acc = 0; } }
  if (Math.hypot(out[out.length - 1][0] - pts[pts.length - 1][0], out[out.length - 1][1] - pts[pts.length - 1][1]) > 1) out.push(pts[pts.length - 1]);
  const off = voieDecalage(), res = []; let run = 0;
  for (let k = 0; k < out.length; k++) {
    if (k) run += Math.hypot(out[k][0] - out[k - 1][0], out[k][1] - out[k - 1][1]);
    const a = out[Math.max(0, k - 2)], b = out[Math.min(out.length - 1, k + 2)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ramp = Math.min(1, run / 25);
    res.push([out[k][0] - dy / L * off * ramp, out[k][1] + dx / L * off * ramp]);                               // « droite » du sens de marche (axe y vers le bas) = (-dy, dx)
  }
  return res;
}
function marchePose(p, type, kind) {
  const q = routeProche(p[0], p[1], 20);
  if (!q) { flash('Il faut une route : posez-le sur une route (à 20 m au plus)', true); return; }
  commit(); const list = type === 'v' ? (S.villageois = S.villageois || []) : (S.chariots = S.chariots || []);
  list.push({ id:Math.max(0, ...list.map(o => o.id || 0)) + 1, kind, x:round2(q[0]), y:round2(q[1]), a:0 });
  save(); requestDraw(); flash((type === 'v' ? VILLAGEOIS[kind].nom : CHARIOTS[kind].nom) + ' posé sur la route');
}
const placeVillageois = (p, kind) => marchePose(p, 'v', kind), placeChariot = (p, kind) => marchePose(p, 'c', kind);
function marcheAu(p) {                                                         // villageois ou chariot sous le curseur
  for (const o of S.villageois || []) if (Math.hypot(o.x - p[0], o.y - p[1]) < Math.max(1.2, VILLAGEOIS[o.kind].T * 1.4, 10 / view.s)) return { type:'v', o };
  for (const o of S.chariots || []) { const a = CHARIOTS[o.kind], dx = p[0] - o.x, dy = p[1] - o.y, c = Math.cos(o.a), s = Math.sin(o.a), lx = dx * c + dy * s, ly = -dx * s + dy * c;
    if (Math.abs(lx) < a.T * .6 + 1 && Math.abs(ly) < a.T * a.B / 2 + 1) return { type:'c', o }; }
  return null;
}
function marcher(p) {
  const hit = marcheAu(p);
  if (hit) { const k = marcheCle(hit.type, hit.o); marcheSel = marcheSel === k ? null : k; flash(marcheSel ? 'Choisi : cliquez sur une route pour l\'y envoyer' : 'Relâché'); requestDraw(); return; }
  if (!marcheSel) { flash('Cliquez d\'abord sur un villageois ou un chariot', true); return; }
  const type = marcheSel[0], id = +marcheSel.slice(1), o = (type === 'v' ? S.villageois : S.chariots || []).find(q => q.id === id); if (!o) return;
  const B = routeProche(p[0], p[1], 25), A = routeProche(o.x, o.y, 12);
  if (!B) { flash('Destination : cliquez sur une route', true); return; }
  if (!A) { flash('Ce véhicule n\'est plus sur une route', true); return; }
  const chemin = voieChemin([o.x, o.y], B);
  if (!chemin) { flash('Aucune route ne mène jusque-là', true); return; }
  const r = { chemin:chemin.slice(1), cible:B, v:0, bloque:0 };
  if (type === 'c') { const a = CHARIOTS[o.kind]; r.st = { px:o.x + Math.cos(o.a) * CH_PIVOT * a.T, py:o.y + Math.sin(o.a) * CH_PIVOT * a.T, ab:o.a }; r.ah = o.a; }
  marcheRt.set(marcheSel, r); requestDraw();
}
RESSOURCE_OUTILS.marcher = marcher;

// suit le chemin : renvoie le point à viser (le premier non atteint), et retire les points dépassés
function marcheVise(r, x, y, rayon) { while (r.chemin.length > 1 && Math.hypot(r.chemin[0][0] - x, r.chemin[0][1] - y) < rayon) r.chemin.shift(); return r.chemin[0]; }
function marcheStep(dt) {
  let bouge = false;
  for (const [k, r] of [...marcheRt]) {
    const type = k[0], id = +k.slice(1), o = (type === 'v' ? S.villageois : S.chariots || []).find(q => q.id === id);
    if (!o || !r.chemin.length) { marcheRt.delete(k); continue; }
    if (type === 'v') {                                                                          // villageois : marche le long de la route
      const t = marcheVise(r, o.x, o.y, 1.2), dx = t[0] - o.x, dy = t[1] - o.y, d = Math.hypot(dx, dy);
      if (r.chemin.length === 1 && d < .8) { marcheRt.delete(k); save(); continue; }
      let da = Math.atan2(dy, dx) - o.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      o.a += Math.max(-7 * dt, Math.min(7 * dt, da)); r.v += (3.5 - r.v) * Math.min(1, dt * 5);
      const st = Math.min(Math.max(d, .1), r.v * dt), nx = o.x + Math.cos(o.a) * st, ny = o.y + Math.sin(o.a) * st;
      if (routeOk(nx, ny)) { o.x = nx; o.y = ny; bouge = true; } else { r.bloque += dt; if (r.bloque > 1.5) { marcheRt.delete(k); save(); } }
    } else {                                                                                      // chariot : le cheval tire le pivot le long de la route, la caisse suit
      const a = CHARIOTS[o.kind], t = marcheVise(r, r.st.px, r.st.py, 3.5), dx = t[0] - r.st.px, dy = t[1] - r.st.py, d = Math.hypot(dx, dy);
      if (r.chemin.length === 1 && d < 2) { marcheRt.delete(k); save(); continue; }
      let da = Math.atan2(dy, dx) - r.ah; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      r.ah += Math.max(-1.3 * dt, Math.min(1.3 * dt, da));                                        // le cheval tourne doucement
      const vmax = 6 * (1 - Math.min(.65, Math.abs(da) / 1.6)); r.v += (vmax - r.v) * Math.min(1, dt * 2);
      const keep = { px:r.st.px, py:r.st.py, ab:r.st.ab }, e = chariotPas(r.st, a.T, r.ah, Math.min(Math.max(d, .1), r.v * dt));
      const bords = [[e.x, e.y], [e.x + Math.cos(e.ang) * a.T * .5, e.y + Math.sin(e.ang) * a.T * .5], [e.x - Math.cos(e.ang) * a.T * .5, e.y - Math.sin(e.ang) * a.T * .5], [r.st.px, r.st.py], [r.st.px + Math.cos(r.ah) * a.T * .6, r.st.py + Math.sin(r.ah) * a.T * .6]];
      if (bords.some(q => !routeOk(q[0], q[1]))) { r.st = keep; r.v = 0; r.bloque += dt; if (r.bloque > 1.5) { marcheRt.delete(k); save(); } continue; }       // jamais hors de la chaussée : on s'arrête plutôt
      r.bloque = 0; o.x = e.x; o.y = e.y; o.a = e.ang; r.braq = e.braq; bouge = true;
    }
  }
  return bouge;
}
function drawVoies() {                                                         // deux voies par route : celle de droite (bleue) et celle de gauche (orange) vues depuis le sens du tracé de la route
  const s = view.s; ctx.save(); ctx.setLineDash([8, 7]); ctx.lineWidth = 1.5; ctx.globalAlpha = .75;
  for (const r of S.roads) { const P = smoothPts(r); if (P.length < 2) continue;
    const off = Math.min(VOIE, (r.w || 8) / 4);                                          // (la voie réellement suivie par les habitants : deplacements.js, surVoie)
    for (const side of [1, -1]) { ctx.strokeStyle = '#2f6fd0'; ctx.fillStyle = '#2f6fd0'; ctx.beginPath(); const arrows = [];
      P.forEach((q, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, X = q[0] - dy / L * off * side, Y = q[1] + dx / L * off * side, [sx, sy] = toS(X, Y); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy);
        if (i % 12 === 6) arrows.push([sx, sy, Math.atan2(dy * side, dx * side)]); });
      ctx.stroke(); ctx.setLineDash([]); for (const [ax, ay, an] of arrows) { ctx.save(); ctx.translate(ax, ay); ctx.rotate(an); ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill(); ctx.restore(); } ctx.setLineDash([8, 7]);  // flèche : sens de circulation de la voie
      ctx.stroke(); } }
  ctx.restore();
}
function drawTerrestres() {
  if (tool === 'marcher' || (typeof JR !== 'undefined' && JR.actif && JR.voies)) drawVoies();   // (mode développeur, option « Lignes de circulation » de l'onglet)
  const s = view.s, [x0, y0] = toW(0, 0), [x1, y1] = toW(W, H), m = 20, vus = [];
  for (const o of S.chariots || []) if (o.x > x0 - m && o.x < x1 + m && o.y > y0 - m && o.y < y1 + m) vus.push(['c', o]);
  for (const o of S.villageois || []) if (o.x > x0 - m && o.x < x1 + m && o.y > y0 - m && o.y < y1 + m) vus.push(['v', o]);
  vus.sort((p, q) => p[1].y - q[1].y);
  for (const [t, o] of vus) {
    const [X, Y] = toS(o.x, o.y), k = marcheCle(t, o), r = marcheRt.get(k); persos.push([o.x, o.y]);   // (les cimes repassent par-dessus : tuiles.js presentCimes)
    if (t === 'v') { const V = VILLAGEOIS[o.kind]; peintVillageois(o.kind, X, Y, Math.max(7, V.T * s * 1.2), o.a); }
    else { const a = CHARIOTS[o.kind]; peintChariot(o.kind, X, Y, Math.max(14, a.T * s), o.a, r && r.braq || 0); }
    if (k === marcheSel) { const R = t === 'c' ? Math.max(14, CHARIOTS[o.kind].T * s) * .75 : Math.max(7, VILLAGEOIS[o.kind].T * s * 1.2); ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#d64541'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X, Y, R, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      if (r) { const [DX, DY] = toS(r.cible[0], r.cible[1]); ctx.strokeStyle = 'rgba(214,69,65,.85)'; ctx.beginPath(); ctx.moveTo(X, Y); for (const w of r.chemin) ctx.lineTo(...toS(w[0], w[1])); ctx.stroke(); ctx.beginPath(); ctx.arc(DX, DY, 7, 0, 7); ctx.moveTo(DX - 4, DY - 4); ctx.lineTo(DX + 4, DY + 4); ctx.moveTo(DX + 4, DY - 4); ctx.lineTo(DX - 4, DY + 4); ctx.stroke(); } ctx.restore(); }
    if (s > .3) { ctx.font = '600 14px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; haloText(t === 'v' ? VILLAGEOIS[o.kind].nom : CHARIOTS[o.kind].nom, X, Y + (t === 'c' ? Math.max(14, CHARIOTS[o.kind].T * s) * .55 : Math.max(7, VILLAGEOIS[o.kind].T * s * 1.2) * .6) + 3, Col.ink, Col.sheet); }
  }
}
