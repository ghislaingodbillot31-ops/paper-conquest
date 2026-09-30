/* Motif des brins d'herbe : une tuile de 64 px représente 2 × 2 m au sol, recalée à
   chaque dessin sur le zoom et le déplacement de la vue. Les routes, elles, sont en
   couleurs unies (terre, gravier, pavé). */
const PAT = {}, TILE = 64, TILE_M = 2;
function makePatterns() {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // brins d'herbe : tuile transparente posée sur le sol
  PAT.herbe = (() => {
    const c = document.createElement('canvas'); c.width = c.height = TILE;
    const g = c.getContext('2d');
    g.strokeStyle = S ? biomeLook().groundDark : Col['grass-dark']; g.lineWidth = 1; g.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const x = rnd() * TILE, y = rnd() * TILE, h = 2 + rnd() * 3, lean = (rnd() - .5) * 2.5;
      g.globalAlpha = .12 + rnd() * .15;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + lean, y - h); g.stroke();
    }
    return ctx.createPattern(c, 'repeat');
  })();
}
// couleur unie de la chaussée et de sa bordure, selon le revêtement
const FILL = { terre:'earth', gravier:'gravel', pave:'paving' };
const EDGE = { terre:'earth-edge', gravier:'gravel-edge', pave:'paving-edge' };
function roadCols(r) { const k = roadType(r).id; return [Col[FILL[k]] || Col.verge, Col[EDGE[k]]]; }
function alignPatterns() {
  const m = new DOMMatrix().translate(view.ox, view.oy).scale(view.s * TILE_M / TILE);
  for (const p of Object.values(PAT)) if (p && p.setTransform) p.setTransform(m);
}
const roadType = r => ROADS.find(k => k.id === r.kind) || ROADS[1];
/* Tracé lissé d'une route : la ligne brisée est adoucie (découpe des coins de Chaikin,
   4 passes) entre deux points fixes. Restent fixes les bouts de route et les sommets de
   croisement ou de raccord, pour que les routes continuent de se rejoindre exactement.
   Le même tracé sert au dessin, aux ponts et au découpage du cadastre. */
function isJunction(r, v) {
  return S.roads.some(o => o !== r && o.pts.slice(1).some((b, k) => ptSeg(v, o.pts[k], b).d < 1));
}
const smoothCache = new Map();
function chaikin(run) {
  let P = run;
  for (let it = 0; it < 4; it++) {
    if (P.length < 3) break;
    const Q = [P[0]];
    for (let k = 0; k < P.length - 1; k++) {
      const a = P[k], b = P[k + 1];
      if (k > 0) Q.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25]);
      if (k < P.length - 2) Q.push([a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]);
    }
    Q.push(P[P.length - 1]); P = Q;
  }
  return P;
}
function smoothPts(r) {
  const key = r.id + ':' + JSON.stringify(r.pts) + ':' + S.roads.length;
  const hit = smoothCache.get(r.id);
  if (hit && hit.key === key) return hit.P;
  /* Tout le tracé est lissé d'un bout à l'autre (seuls ses deux bouts restent fixes) : un
     embranchement ne casse plus la courbe de la route principale. Un bout posé sur une autre
     route (départ d'une fourche, raccord) est ensuite recalé sur la courbe lissée de celle-ci,
     pour que les deux chaussées se rejoignent exactement. */
  // (le tracé est d'abord redécoupé en pas de 24 m : un long tronçon droit n'étire plus
  // l'arrondi sur des centaines de mètres, chaque virage s'arrondit sur place)
  const out = chaikin(resample(r.pts, 24)).slice();
  for (const end of [0, out.length - 1]) {
    const v = r.pts[end === 0 ? 0 : r.pts.length - 1];
    const o = S.roads.find(o => o !== r && o.pts.slice(1).some((b, k) => ptSeg(v, o.pts[k], b).d < 1));
    if (!o) continue;
    const C = chaikin(resample(o.pts, 24));
    let best = null, bd = Infinity;
    for (let k = 0; k < C.length - 1; k++) { const t = ptSeg(v, C[k], C[k + 1]); if (t.d < bd) { bd = t.d; best = t.q; } }
    if (best && bd < 12) out[end] = [best[0], best[1]];
  }
  smoothCache.set(r.id, { key, P:out });
  return out;
}
function roadPath(r) {
  const path = new Path2D();
  smoothPts(r).forEach((p, i) => { const [X, Y] = toS(p[0], p[1]); i ? path.lineTo(X, Y) : path.moveTo(X, Y); });
  return path;
}
// tracé d'une route en mètres, gardé tant que la route ne change pas : à chaque image on ne
// fait que le tracer à l'échelle de la vue (plus de reconstruction point par point)
const roadWorldPaths = new WeakMap();
function strokeRoad(r, lw, color) {
  const P = smoothPts(r);
  let c = roadWorldPaths.get(r);
  if (!c || c.P !== P) {
    const path = new Path2D();
    P.forEach((p, i) => i ? path.lineTo(p[0], p[1]) : path.moveTo(p[0], p[1]));
    c = { P, path }; roadWorldPaths.set(r, c);
  }
  const s = view.s;
  ctx.save();
  ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * view.ox, dpr * view.oy);
  ctx.strokeStyle = color; ctx.lineWidth = lw / s; ctx.lineCap = 'square'; ctx.lineJoin = 'round';
  ctx.stroke(c.path);
  ctx.restore();
}
/* Chaussée « imparfaite », comme la carte de référence : dessinée en disques serrés le long
   du tracé lissé, avec une largeur qui varie (lente ondulation ±15 %, petites irrégularités
   ±5 %), un axe qui louvoie d'un demi-mètre, et un élargissement aux carrefours. Le tracé
   logique (zonage, 8 m d'emprise) ne change pas : seule la chaussée dessinée varie. */
const roadDiscCache = new WeakMap();
function roadDiscs(r) {
  const P = smoothPts(r), hit = roadDiscCache.get(r);
  if (hit && hit.P === P && hit.n === S.roads.length) return hit.d;
  const rnd = seeded(Math.round(Math.abs(P[0][0] * 17 + P[0][1] * 5)) + r.id * 101), ph = [rnd(), rnd(), rnd(), rnd()].map(v => v * 6.28);
  const base = roadType(r).surf / 2, d = [];
  // carrefours : bouts d'autres routes posés sur celle-ci, et ses propres bouts posés sur une autre
  const joints = [];
  for (const o of S.roads) if (o !== r) for (const e of [o.pts[0], o.pts[o.pts.length - 1]]) if (r.pts.slice(1).some((b, k) => ptSeg(e, r.pts[k], b).d < 1)) joints.push(e);
  for (const e of [r.pts[0], r.pts[r.pts.length - 1]]) if (S.roads.some(o => o !== r && o.pts.slice(1).some((b, k) => ptSeg(e, o.pts[k], b).d < 1))) joints.push(e);
  let walked = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1], L = segLen(a, b), n = Math.max(1, Math.ceil(L / .8));
    const nx = -(b[1] - a[1]) / (L || 1), ny = (b[0] - a[0]) / (L || 1);
    for (let k = 0; k < n; k++) {
      const t = k / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, w = walked + L * t;
      let hw = base * (1 + .15 * Math.sin(w / 140 * 6.28 + ph[0]) + .07 * Math.sin(w / 23 * 6.28 + ph[1]) + .05 * Math.sin(w / 7 * 6.28 + ph[2]) + .035 * Math.sin(w / 2.9 * 6.28 + ph[3] * 2));
      for (const j of joints) { const dj = segLen([x, y], j); if (dj < 30) hw *= 1 + .45 * Math.exp(-((dj / 11) ** 2)); }
      const side = .5 * Math.sin(w / 61 * 6.28 + ph[3]) + .18 * Math.sin(w / 4.3 * 6.28 + ph[1] * 3); // axe qui louvoie, bords inégaux
      d.push([x + nx * side, y + ny * side, hw]);
    }
    walked += L;
  }
  const e = P[P.length - 1]; d.push([e[0], e[1], base]);
  roadDiscCache.set(r, { P, n:S.roads.length, d });
  return d;
}
function drawRoads() {
  // au carrefour, le revêtement le plus noble passe dessus : terre < gravier < pavé
  const rank = r => ROADS.indexOf(roadType(r));
  const s = view.s, bySurf = S.roads.slice().sort((a, b) => rank(a) - rank(b));
  const [wx0, wy0] = toW(-20, -20), [wx1, wy1] = toW(W + 20, H + 20);
  const discs = (r, grow) => {
    const path = new Path2D();
    for (const [x, y, rr] of roadDiscs(r)) {
      if (x + rr < wx0 || x - rr > wx1 || y + rr < wy0 || y - rr > wy1) continue;
      const X = x * s + view.ox, Y = y * s + view.oy, R = Math.max(rr * s, 1.8) + grow; // (au moins 3,6 px de large, même de loin)
      path.moveTo(X + R, Y); path.arc(X, Y, R, 0, Math.PI * 2);
    }
    return path;
  };
  // bordure fine et sombre de toutes les routes d'abord, puis les chaussées : aux carrefours
  // les chaussées se fondent sans trait
  for (const r of bySurf) { ctx.fillStyle = roadCols(r)[1]; ctx.fill(discs(r, Math.max(.8, Math.min(1.4, s * .4)))); }
  for (const r of bySurf) { ctx.fillStyle = roadCols(r)[0]; ctx.fill(discs(r, 0)); }
  for (const r of S.roads) {
    const isSel = sel && sel.type === 'road' && sel.id === r.id, isHov = hover && hover.type === 'road' && hover.id === r.id;
    if (!isSel && !isHov) continue;
    ctx.setLineDash([6, 5]); strokeLine(smoothPts(r), isSel ? 2 : 1.5, Col.accent); ctx.setLineDash([]);
  }
}
const isOn = (type, id, st) => st && st.type === type && st.id === id;
let zoneEdit = null;
function zoneAtCursor() {
  if (!zoneEdit || !cursor) return null;
  const h = findById('house', zoneEdit.id), b = h && buildingOf(h);
  if (!b) return null;
  const z = { x:round2(cursor[0]), y:round2(cursor[1]), r:zoneEdit.r };
  return { h, b, z, why:zoneIssue(b, h, z) };
}
function applyZone() {
  const a = zoneAtCursor(); if (!a) return;
  if (a.why) { flash(a.why, true); return; }
  commit(); a.h.zone = a.z; zoneEdit = null; changed(false);
  flash(`Zone de travail définie : rayon ${a.z.r} m`);
}
