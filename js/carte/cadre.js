// points où l'outil actif peut se poser (tours, portes)
function drawSpots(list) {
  ctx.fillStyle = Col.accent; ctx.globalAlpha = .75;
  for (const p of list) { const [X, Y] = toS(p[0], p[1]); ctx.fillRect(X - 3.5, Y - 3.5, 7, 7); }
  ctx.globalAlpha = 1;
}
function hint(text) {
  if (!cursor) return;
  const [X, Y] = toS(...cursor);
  ctx.font = '500 14px "IBM Plex Mono", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  haloText(text, X + 12, Y - 8, Col.bad, Col.sheet);
}
/* Relief du sol, comme les courbes de niveau d'une carte : un champ d'altitude lissé et très étendu (centaines de mètres), CREUSÉ le long des rivières et des lacs (vallées),
   découpé en 5 courbes de niveau (quantiles : de grandes plages à chaque palier). Chaque palier est une grande forme à bord net, remplie d'une teinte plus claire que celle du palier inférieur
   (toujours du plus sombre en bas au plus clair en haut), avec une ombre dure au sud-est (lumière du nord-ouest), comme un relief dessiné. Aucun flou.
   Le champ et les contours (marching squares, 6 m par case) sont calculés une fois par carte et par tracé d'eau ; les couleurs à chaque dessin (saison, neige). */
let reliefSolC = null, reliefEauC = null;
const reliefSol = () => reliefChamp(true), reliefEau = () => reliefChamp(false);   // le sol (vallées le long de l'eau) et l'eau (reflets et fonds, plus petits)
function reliefChamp(sol) {
  const key = S.landSeed + '|' + S.rivers.map(r => r.pts.length + ',' + r.pts[0]).join(';') + '|' + S.lakes.map(l => l.c).join(';') + (sol ? 's' : 'e') + (sol && biomeLook().relief2 ? '2' + biomeLook().relief2.length + (biomeLook().reliefK || 1) : '');
  const cache = sol ? reliefSolC : reliefEauC;
  if (cache && cache.key === key) return cache.niv;
  const KR = biomeLook().reliefK || 1, CS = sol ? 6 : 4, W0 = Math.ceil(TW / CS) + 1, H0 = Math.ceil(TH / CS) + 1, PD = 3, W = W0 + 2 * PD, H = H0 + 2 * PD, v1 = valueNoise(S.landSeed + (sol ? 4441 : 9341)), v2 = valueNoise(S.landSeed + (sol ? 5557 : 9457)), v3 = valueNoise(S.landSeed + (sol ? 6661 : 9561));
  // distance à l'eau (en cases), par balayage aller-retour
  const dist = new Float32Array(W * H).fill(1e4), cell = (x, y) => (Math.round(y / CS) + PD) * W + Math.round(x / CS) + PD;
  const marque = (x, y) => { const i = Math.round(x / CS) + PD, j = Math.round(y / CS) + PD; if (i >= 0 && j >= 0 && i < W && j < H) dist[j * W + i] = 0; };
  for (const rv of S.rivers) for (const p of rv.pts) marque(p[0], p[1]);
  for (const lk of S.lakes) { for (const p of lk.pts) marque(p[0], p[1]); marque(lk.c[0], lk.c[1]); }
  for (let j = 1; j < H; j++) for (let i = 1; i < W - 1; i++) { const k = j * W + i; dist[k] = Math.min(dist[k], dist[k - 1] + 1, dist[k - W] + 1, dist[k - W - 1] + 1.4, dist[k - W + 1] + 1.4); }
  for (let j = H - 2; j >= 0; j--) for (let i = W - 2; i >= 1; i--) { const k = j * W + i; dist[k] = Math.min(dist[k], dist[k + 1] + 1, dist[k + W] + 1, dist[k + W + 1] + 1.4, dist[k + W - 1] + 1.4); }
  const h = new Float32Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const x = (i - PD) * CS, y = (j - PD) * CS, d = dist[j * W + i] * CS;
    h[j * W + i] = !sol ? v1(x / 150 + 3, y / 150 + 8) * .5 + v2(x / 62 + 11, y / 62 + 2) * .32 + v3(x / 26 + 5, y / 26 + 9) * .18 : biomeLook().relief2 ? v1(x / (300 * KR) + 3, y / (300 * KR) + 8) * .6 + v2(x / (130 * KR) + 11, y / (130 * KR) + 2) * .3 + v3(x / (60 * KR) + 5, y / (60 * KR) + 9) * .1 : GAME && GAME.region === 123 ? v1(x / 120 + 3, y / 120 + 8) * .45 + v2(x / 48 + 11, y / 48 + 2) * .35 + v3(x / 22 + 5, y / 22 + 9) * .2 + .2 * (1 - Math.exp(-d / 60)) : v1(x / 420 + 3, y / 420 + 8) * .55 + v2(x / 170 + 11, y / 170 + 2) * .3 + v3(x / 70 + 5, y / 70 + 9) * .15 + .28 * (1 - Math.exp(-d / 140));   // les vallées longent l'eau
  }
  // champ adouci (deux passes de moyenne 3 × 3) : des contours sans angles ni segments droits, même en gros plan
  for (let pass = 0; pass < 2; pass++) { const o = new Float32Array(W * H); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { let t = 0, n = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < W && jj < H) { t += h[jj * W + ii]; n++; } } o[j * W + i] = t / n; } h.set(o); }
  const tri = Float32Array.from(h).sort(), Q = (sol ? (biomeLook().relief2 ? (biomeLook().relief2.length > 1 ? [.42, .78] : [.5]) : [.2, .4, .6, .78, .9]) : [.6]).map(q => tri[Math.floor(q * (tri.length - 1))]);   // l'eau : un seul palier (deux couleurs)
  const niv = [];
  for (const t of Q) {
    // marching squares : un segment par case, entre des milieux d'arêtes interpolés ; les bords du champ sont fermés par une marge basse
    const inside = (i, j) => (i <= 0 || j <= 0 || i >= W - 1 || j >= H - 1) ? 0 : h[j * W + i] > t ? 1 : 0;
    const eid = (kind, i, j) => (j * W + i) * 2 + kind;                 // 0 : arête horizontale (i,j)-(i+1,j) ; 1 : verticale (i,j)-(i,j+1)
    const pt = id => { const kind = id & 1, k = id >> 1, i = k % W, j = (k / W) | 0, a = h[k], b = kind ? h[k + W] : h[k + 1], f = Math.max(.02, Math.min(.98, (t - a) / (b - a || 1e-6))); return kind ? [(i - PD) * CS, (j - PD + f) * CS] : [(i - PD + f) * CS, (j - PD) * CS]; };
    const adj = new Map(), lien = (p, q) => { (adj.get(p) || adj.set(p, []).get(p)).push(q); (adj.get(q) || adj.set(q, []).get(q)).push(p); };
    for (let j = 0; j < H - 1; j++) for (let i = 0; i < W - 1; i++) {
      const code = inside(i, j) | inside(i + 1, j) << 1 | inside(i + 1, j + 1) << 2 | inside(i, j + 1) << 3;
      if (code === 0 || code === 15) continue;
      const T = eid(0, i, j), R = eid(1, i + 1, j), B = eid(0, i, j + 1), L = eid(1, i, j);
      switch (code) { case 1: case 14: lien(L, T); break; case 2: case 13: lien(T, R); break; case 3: case 12: lien(L, R); break; case 4: case 11: lien(R, B); break; case 6: case 9: lien(T, B); break; case 7: case 8: lien(L, B); break; case 5: lien(L, T); lien(R, B); break; case 10: lien(T, R); lien(L, B); break; }
    }
    const vu = new Set(), anneaux = [];
    for (const [d0] of adj) {
      if (vu.has(d0)) continue;
      const ids = [d0]; vu.add(d0); let cur = d0, prev = -1;
      for (let g = 0; g < 1e6; g++) { const nx = adj.get(cur).find(q => q !== prev && !vu.has(q)); if (nx === undefined) break; vu.add(nx); ids.push(nx); prev = cur; cur = nx; }
      if (ids.length < 6) continue;                                      // (trop petit : une tache de moins de 40 m)
      let P = ids.map(pt);
      for (let it = 0; it < 3; it++) { const Q2 = []; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; Q2.push([p[0] * .75 + q[0] * .25, p[1] * .75 + q[1] * .25], [p[0] * .25 + q[0] * .75, p[1] * .25 + q[1] * .75]); } P = Q2; }
      P = P.map(p => [round2(p[0]), round2(p[1])]); anneaux.push({ P, bb:bbox(P) });
    }
    niv.push(anneaux);
  }
  if (sol) reliefSolC = { key, niv }; else reliefEauC = { key, niv };
  return niv;
}
/* Douglas-Peucker d'un contour fermé (tolérance eps, en m) : les contours du relief ont un point tous les ~0,5 m (jusqu'à 100 000 points) ; à l'échelle d'une tuile, la plupart ne se voient pas. */
function simplifieAnneau(P, eps) {
  const n = P.length, keep = new Uint8Array(n), Q = i => P[i === n ? 0 : i];
  let m = 1, far = 0;
  for (let k = 1; k < n; k++) { const d = (P[k][0] - P[0][0]) ** 2 + (P[k][1] - P[0][1]) ** 2; if (d > far) { far = d; m = k; } }   // (contour fermé : on le coupe en deux au point le plus éloigné du départ, sinon départ = arrivée et la distance à la corde vaut toujours 0)
  keep[0] = 1; keep[m] = 1;
  const pile = [[0, m], [m, n]];
  while (pile.length) {
    const [a, b] = pile.pop(), A = Q(a), B = Q(b), dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1; let md = 0, mi = -1;
    for (let k = a + 1; k < b; k++) { const d = Math.abs(dx * (A[1] - P[k][1]) - (A[0] - P[k][0]) * dy) / L; if (d > md) { md = d; mi = k; } }
    if (mi >= 0 && md > eps) { keep[mi] = 1; pile.push([a, mi], [mi, b]); }
  }
  return P.filter((_, i) => keep[i]);
}
// contour d'un palier, en mètres, simplifié pour le zoom s (tolérance 0,4 px) ; un chemin par niveau de zoom (demi-puissances de 2), gardé avec le contour
function contourPath(o, s) {
  const key = Math.round(Math.log2(Math.max(s, .05)) * 2), c = o.w || (o.w = {});
  if (c[key]) return c[key];
  const Q = o.P.length > 40 ? simplifieAnneau(o.P, .4 / 2 ** (key / 2)) : o.P, p = new Path2D();
  Q.forEach((q, k) => k ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); p.closePath();
  return c[key] = p;
}
// peint des paliers de relief : du palier le plus bas (fond plein) au plus haut, chacun plus clair que le précédent, avec une ombre dure au sud-est
function peindreNiveaux(niv, col, s, plein, ombre = true) {
  const [x0, y0] = toW(0, 0), [x1, y1] = toW(W, H), [tx, ty] = toS(0, 0), dx = Math.max(1.5, 2.6 * s) * .6, dy = Math.max(1.5, 2.6 * s) * .8;
  if (plein) { ctx.fillStyle = col(0); ctx.fillRect(tx, ty, TW * s, TH * s); }
  niv.forEach((anneaux, i) => {
    const path = new Path2D(), M = new DOMMatrix([s, 0, 0, s, view.ox, view.oy]);
    for (const o of anneaux) {
      if (o.bb[2] < x0 - 12 || o.bb[0] > x1 + 12 || o.bb[3] < y0 - 12 || o.bb[1] > y1 + 12) continue;
      path.addPath(contourPath(o, s), M);
    }
    if (ombre) { ctx.save(); ctx.translate(dx, dy); ctx.fillStyle = col(i, -.07); ctx.fill(path, 'evenodd'); ctx.restore(); }
    ctx.fillStyle = col(i + 1); ctx.fill(path, 'evenodd');
  });
}
// teintes d'un relief : F = parts vers le blanc (ou vers le noir si négatif) ; chaud = décalage rouge/bleu (sol) ; sai/neige : saison (sol seulement)
function teintesRelief(base, F, chaud, saison) {
  const A = (base.match(/[0-9a-f]{2}/gi) || ['80', '80', '80']).slice(0, 3).map(v => parseInt(v, 16));
  const sai = saison ? teinteSol(METEO, REGION_METEO.hum) : [0, 0, 0], sn = saison && METEO.neige > 0 ? Math.max(0, Math.min(1, METEO.neige * 1.25 - .12)) * .93 : 0;
  return (n, plus = 0) => { const f = F[n] + plus; return 'rgb(' + A.map((v, k) => { let c = f > 0 ? v + (255 - v) * f : v * (1 + f); c += (k === 0 ? 1 : k === 2 ? -1 : 0) * f * chaud; c += sai[k]; if (sn) c += ([236, 242, 248][k] - c) * sn; return Math.round(Math.max(0, Math.min(255, c))); }).join(','); } ;
}
function drawFormesSol(s) {
  if (MONDE_PLAT) return;
  const [tx, ty] = toS(0, 0), neige = biomeLook().neigeTex, look2 = biomeLook().relief2, f = neige ? teintesRelief(biomeLook().ground, [-.05, -.035, -.022, -.012, -.004, .01], 0, false) : teintesRelief(biomeLook().ground, [-.17, -.09, 0, .1, .2, .3], 30, true), col = look2 ? n => grevSaison(n ? look2[Math.min(n, look2.length) - 1] : biomeLook().ground) : (n, p) => f(n, p) + ')';   // relief2 : le sol puis les couleurs de la liste, un palier chacune
  ctx.save(); ctx.beginPath(); ctx.rect(tx, ty, TW * s, TH * s); ctx.clip();
  peindreNiveaux(reliefSol(), col, s, true, false);   // (pas d'ombre portée)
  ctx.restore();
}
/* Relief de l'eau (même système que le sol) : DEUX couleurs seulement, l'eau de base et un bleu plus clair pour les reflets (un seul palier, environ 40 % de la surface), sans ombre.
   À appeler dans un tracé d'eau déjà découpé (clip). */
function drawEauRelief(s) {
  if (MONDE_PLAT || s < .4) return;
  const f = teintesRelief(biomeLook().water || Col.water, [0, .14], -14, false), col = (n, p) => f(n, p) + ')';
  peindreNiveaux(reliefEau(), col, s, false, false);
}
// sol du terrain (dans les tuiles du décor) : nappes claires et foncées, puis brins d'herbe quand on zoome
function drawGround() {
  const s = view.s, [tx, ty] = toS(0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(groundImage(), tx, ty, TW*s, TH*s);
  if (PAT.biome !== S.biome) { makePatterns(); PAT.biome = S.biome; } // brins aux couleurs du biome
  alignPatterns();
  drawFormesSol(s);
  if (PAT.neige) { PAT.neige.setTransform(new DOMMatrix().translate(view.ox, view.oy).scale(s * 20 / 128)); const x0 = Math.max(tx, 0), y0 = Math.max(ty, 0), x1 = Math.min(tx + TW*s, W), y1 = Math.min(ty + TH*s, H); if (x1 > x0 && y1 > y0) { ctx.fillStyle = PAT.neige; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); } }   // texture de neige
  if (s > 3 && PAT.herbe) { // brins d'herbe : seulement sur la partie visible du terrain
    const x0 = Math.max(tx, 0), y0 = Math.max(ty, 0), x1 = Math.min(tx + TW*s, W), y1 = Math.min(ty + TH*s, H);
    if (x1 > x0 && y1 > y0) { ctx.fillStyle = PAT.herbe; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); }
  }
}
// cadre du terrain et graduations en mètres (dessinés par-dessus, à chaque image)
function drawFrameMarks() {
  const s = view.s, [tx, ty] = toS(0, 0);
  ctx.strokeStyle = Col.ink; ctx.lineWidth = 1.5; ctx.strokeRect(tx, ty, TW*s, TH*s);
  // graduations en mètres sur le cadre seulement
  const step = [8, 16, 40, 80, 200, 400].find(v => v * s >= 38) || 400;
  ctx.font = '400 12px "IBM Plex Mono", monospace'; ctx.strokeStyle = Col.ink; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= TW; x += step) { const X = Math.round(x*s + view.ox) + .5; ctx.moveTo(X, ty); ctx.lineTo(X, ty + 5); }
  for (let y = 0; y <= TH; y += step) { const Y = Math.round(y*s + view.oy) + .5; ctx.moveTo(tx, Y); ctx.lineTo(tx + 5, Y); }
  ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  const yl = Math.max(ty - 5, 14);
  for (let x = 0; x <= TW; x += step) { const X = x*s + view.ox; if (X > 30 && X < W - 10) haloText(String(x), X, yl, Col['ink-soft'], Col.sheet); }
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  const xl = Math.max(tx - 6, 28);
  for (let y = 0; y <= TH; y += step) { const Y = y*s + view.oy; if (Y > 22 && Y < H - 10) haloText(String(y), xl, Y, Col['ink-soft'], Col.sheet); }
}
function drawScale() {
  const s = view.s, m = [8, 16, 40, 80, 160, 400, 800].find(v => v * s >= 80) || 800, L = m * s, x = 16, y = H - 22;
  ctx.fillStyle = Col.ink; ctx.fillRect(x, y, L / 2, 6);
  ctx.fillStyle = Col.sheet; ctx.fillRect(x + L / 2, y, L / 2, 6);
  ctx.strokeStyle = Col.ink; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, L, 6);
  ctx.font = '400 12px "IBM Plex Mono", monospace'; ctx.textBaseline = 'bottom';
  ctx.textAlign = 'left'; haloText('0', x, y - 2, Col.ink, Col.sheet);
  ctx.textAlign = 'center'; haloText(fmt(m / 2), x + L / 2, y - 2, Col.ink, Col.sheet);
  haloText(`${m} m`, x + L, y - 2, Col.ink, Col.sheet);
  const nx = W - 26, ny = 38;
  ctx.beginPath(); ctx.moveTo(nx, ny - 16); ctx.lineTo(nx + 7, ny + 6); ctx.lineTo(nx, ny + 1); ctx.lineTo(nx - 7, ny + 6); ctx.closePath();
  ctx.fillStyle = Col.ink; ctx.fill();
  ctx.font = '600 15px "MedievalSharp", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText('N', nx, ny - 18);
}
