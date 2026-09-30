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
/* Chaussée de largeur FIXE (demande du 30/09) : un trait de la largeur de la chaussée le long
   du tracé lissé, identique sur toute la longueur ; aux carrefours, les chaussées se
   recouvrent simplement, sans élargissement ni déformation. */
function drawRoads() {
  // au carrefour, le revêtement le plus noble passe dessus : terre < gravier < pavé
  const rank = r => ROADS.indexOf(roadType(r));
  const s = view.s, bySurf = S.roads.slice().sort((a, b) => rank(a) - rank(b));
  const stroke = (r, color, grow) => {
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(roadType(r).surf * s, 3.6) + 2 * grow; // (au moins 3,6 px de large, même de loin)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    polyPath(smoothPts(r)); ctx.stroke();
  };
  // bordure fine et sombre de toutes les routes d'abord, puis les chaussées : aux carrefours
  // les chaussées se fondent sans trait
  for (const r of bySurf) stroke(r, roadCols(r)[1], Math.max(.8, Math.min(1.4, s * .4)));
  for (const r of bySurf) stroke(r, roadCols(r)[0], 0);
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
