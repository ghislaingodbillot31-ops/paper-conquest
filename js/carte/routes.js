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
const FILL = { terre:'earth', gravier:'gravel', pave:'paving', chemin:'path' };
const EDGE = { terre:'earth-edge', gravier:'gravel-edge', pave:'paving-edge', chemin:'path-edge' };
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
/* Un angle franc (45° ou plus) reste un angle : le tracé est coupé à ces sommets et chaque
   morceau est lissé séparément (seuls les virages doux s'arrondissent). */
function lisser(pts) {
  const chunks = [[pts[0]]];
  for (let i = 1; i < pts.length; i++) {
    chunks[chunks.length - 1].push(pts[i]);
    if (i < pts.length - 1) {
      const a = Math.atan2(pts[i][1] - pts[i-1][1], pts[i][0] - pts[i-1][0]), b = Math.atan2(pts[i+1][1] - pts[i][1], pts[i+1][0] - pts[i][0]);
      if (Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a))) >= COIN_NET) chunks.push([pts[i]]);
    }
  }
  return chunks.flatMap((c, i) => { const P = chaikin(resample(c, 24)); return i ? P.slice(1) : P; });
}
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
/* Routes qui partent d'un même point (la capitale d'une carte à forme réelle) : deux bouts fixes
   donnaient un coin net. La paire dont les départs sont les plus opposés devient UNE courbe (arc
   quadratique de 60 m de rayon au plus, en passant à ≤ 20 m du point) ; les autres routes du point
   viennent s'y poser. Retourne { m, mine:[P, Q] } pour la route r à ce bout, ou null. */
const HUB_R = 60, HUB_MIN_TURN = 15;
function hubAt(r, v) {
  const ends = [];
  for (const o of S.roads) for (const first of [true, false]) {
    if (o.libre) continue;                                                        // une route du joueur ne modifie aucune autre
    const e = first ? o.pts[0] : o.pts[o.pts.length - 1];
    if (segLen(e, v) >= 1 || (o === r && ends.some(x => x.o === o))) continue;
    let P = lisser(o.pts); if (!first) P = P.slice().reverse();   // depuis le point, vers l'extérieur
    ends.push({ o, first, P });
  }
  if (ends.length < 2) return null;
  const cum = P => { const c = [0]; for (let i = 1; i < P.length; i++) c.push(c[i - 1] + segLen(P[i - 1], P[i])); return c; };
  const at = (P, d) => { const c = cum(P); let i = 1; while (i < P.length - 1 && c[i] < d) i++; const t = Math.min(1, (d - c[i - 1]) / ((c[i] - c[i - 1]) || 1)); return { q:[P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t], i }; };
  const dir = x => { const q = at(x.P, 40).q, L = segLen(v, q) || 1; return [(q[0] - v[0]) / L, (q[1] - v[1]) / L]; };
  let best = null;
  for (let a = 0; a < ends.length; a++) for (let b = a + 1; b < ends.length; b++) {
    const da = dir(ends[a]), db = dir(ends[b]), dot = da[0] * db[0] + da[1] * db[1];
    if (!best || dot < best.dot) best = { a:ends[a], b:ends[b], dot };
  }
  const R = Math.min(HUB_R, .4 * cum(best.a.P).pop(), .4 * cum(best.b.P).pop());
  const A = at(best.a.P, R), B = at(best.b.P, R), m = [(A.q[0] + 2 * v[0] + B.q[0]) / 4, (A.q[1] + 2 * v[1] + B.q[1]) / 4];
  const turn = 180 - Math.acos(Math.max(-1, Math.min(1, best.dot))) * 180 / Math.PI;
  if (turn < HUB_MIN_TURN) return null;                                          // déjà quasi droit
  const me = ends.find(x => x.o === r);
  if (!me) return null;
  if (me !== best.a && me !== best.b) return { m, P:me.P, first:me.first, cut:null };  // route qui s'y branche : elle finit sur la courbe
  const mine = me === best.a ? A : B, mineQ = mine.q, other = me === best.a ? B.q : A.q;
  const curve = []; for (let k = 0; k <= 6; k++) { const t = .5 * (1 - k / 6), w = 1 - t; curve.push([w * w * mineQ[0] + 2 * w * t * v[0] + t * t * other[0], w * w * mineQ[1] + 2 * w * t * v[1] + t * t * other[1]]); }
  // (t = .5 : le milieu m ; t = 0 : le point de départ de la route) → depuis m vers l'extérieur
  return { m, P:me.P, first:me.first, cut:{ curve, i:mine.i } };
}
/* Recale le bout de tracé sur le point t en décalant aussi les points voisins, dont le décalage s'éteint sur
   max(30 m, 3 × l'écart) : un simple déplacement du dernier point laissait un crochet (retour en arrière) au raccord. */
function pinEnd(out, end, t) {
  const dir = end ? -1 : 1, dx = t[0] - out[end][0], dy = t[1] - out[end][1], L = Math.max(30, 3 * Math.hypot(dx, dy));
  let s = 0;
  for (let i = end, prev = out[end]; i >= 0 && i < out.length; i += dir) {
    s += segLen(prev, out[i]); prev = out[i];
    const w = 1 - s / L; if (w <= 0) break;
    out[i] = [out[i][0] + dx * w, out[i][1] + dy * w];
  }
}
let sigRoutes = { v:-1, S:null, k:'' };
const roadsSig = () => { if (sigRoutes.v === sceneV && sigRoutes.S === S) return sigRoutes.k; sigRoutes = { v:sceneV, S, k:S.roads.map(o => o.id + (o.libre ? 'L' : '') + JSON.stringify(o.pts)).join('|') }; return sigRoutes.k; };   // (toutes les routes, une fois par état du décor)
function smoothPts(r) {
  if (r.libre) return r.pts;                                                       // tracé du joueur : tel quel, sans lissage ni raccord
  const key = r.id + ':' + roadsSig();
  const hit = smoothCache.get(r.id);
  if (hit && hit.key === key) return hit.P;
  /* Tout le tracé est lissé d'un bout à l'autre (seuls ses deux bouts restent fixes) : un
     embranchement ne casse plus la courbe de la route principale. Un bout posé sur une autre
     route (départ d'une fourche, raccord) est ensuite recalé sur la courbe lissée de celle-ci,
     pour que les deux chaussées se rejoignent exactement. */
  // (le tracé est d'abord redécoupé en pas de 24 m : un long tronçon droit n'étire plus
  // l'arrondi sur des centaines de mètres, chaque virage s'arrondit sur place)
  let out = lisser(r.pts).slice();
  for (const first of [true, false]) {
    const end = first ? 0 : out.length - 1, v = first ? r.pts[0] : r.pts[r.pts.length - 1];
    const hub = hubAt(r, v);
    if (hub) {                                                                      // bouts de routes réunis : courbe commune
      if (!hub.cut) pinEnd(out, end, hub.m);
      else if (first) out = hub.cut.curve.concat(out.slice(hub.cut.i));
      else out = out.slice(0, out.length - hub.cut.i).concat(hub.cut.curve.slice().reverse());
      continue;
    }
    const me = S.roads.indexOf(r);
    const o = S.roads.find(o => o !== r && S.roads.indexOf(o) < me && o.pts.slice(1).some((b, k) => ptSeg(v, o.pts[k], b).d < 1));   // (seulement une route d'avant : pas de boucle)
    if (!o) continue;
    const C = smoothPts(o);                                                          // sa courbe FINALE (raccord de capitale compris) : plus de pointe qui dépasse
    let best = null, bd = Infinity;
    for (let k = 0; k < C.length - 1; k++) { const t = ptSeg(v, C[k], C[k + 1]); if (t.d < bd) { bd = t.d; best = t.q; } }
    if (best && bd < 30) pinEnd(out, end, best);
  }
  smoothCache.set(r.id, { key, P:out });
  return out;
}
/* Chaussée de largeur FIXE (demande du 30/09) : un trait de la largeur de la chaussée le long
   du tracé lissé, identique sur toute la longueur ; aux carrefours, les chaussées se
   recouvrent simplement, sans élargissement ni déformation. */
/* Morceaux de chaussée : le tracé lissé de la route, sans les passages sur l'eau (entre l'entrée et la sortie de chaque
   pont, c'est le tablier qui relie les deux bouts, voir bridges dans rendu.js). */
function roadPieces(r) {
  const P = smoothPts(r), cuts = bridges().filter(b => b.road === r.id).sort((a, b) => a.s0 - b.s0);
  if (!cuts.length) return [P];
  const cum = [0]; for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + segLen(P[i - 1], P[i]));
  const at = d => { let i = 1; while (i < P.length - 1 && cum[i] < d) i++; const t = (d - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1); return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t]; };
  const pieces = []; let from = 0;
  for (const b of cuts) {
    const seg = [at(from)]; for (let i = 0; i < P.length; i++) if (cum[i] > from && cum[i] < b.s0) seg.push(P[i]); seg.push(at(b.s0));
    if (seg.length > 1) pieces.push(seg); from = b.s1;
  }
  const last = [at(from)]; for (let i = 0; i < P.length; i++) if (cum[i] > from) last.push(P[i]);
  if (last.length > 1) pieces.push(last);
  return pieces;
}
/* Raccord d'un chemin sur une route : aux deux angles de la jonction, un petit congé arrondi (rayon FILET m) de la couleur du chemin efface le trait de bordure de la route et élargit l'embouchure ;
   la chaussée de la route, dessinée après, recouvre tout ce qui est dans son emprise. */
const FILET = 3;
function filetsChemins(bord) {
  const s = view.s, P = (p) => toS(p[0], p[1]);
  for (const c of S.roads) {
    const tc = roadType(c); if (!tc.pieton || c.pts.length < 2) continue;
    const n = c.pts.length;
    for (const [bout, vers] of [[c.pts[0], c.pts[1]], [c.pts[n - 1], c.pts[n - 2]]]) {
      let best = null;
      for (const o of S.roads) { if (o === c || roadType(o).pieton) continue; const Q = smoothPts(o); for (let i = 0; i < Q.length - 1; i++) { const t = ptSeg(bout, Q[i], Q[i + 1]); if (t.d < 1.5 && (!best || t.d < best.d)) best = { d:t.d, o, a:Q[i], b:Q[i + 1] }; } }   // (le tracé réellement dessiné ; le bout du chemin est sur l'axe de la route)
      if (!best) continue;
      const L = segLen(best.a, best.b) || 1, u = [(best.b[0] - best.a[0]) / L, (best.b[1] - best.a[1]) / L], dl = segLen(bout, vers) || 1, d = [(vers[0] - bout[0]) / dl, (vers[1] - bout[1]) / dl];
      let nr = [-u[1], u[0]]; if (nr[0] * d[0] + nr[1] * d[1] < 0) nr = [-nr[0], -nr[1]];            // normale de la route, côté du chemin
      const hw = roadType(best.o).surf / 2, cw = tc.surf / 2, foot = ptSeg(bout, best.a, best.b).q;
      for (const sd of [1, -1]) {
        const m = [-d[1] * sd, d[0] * sd];                                                         // côté du chemin
        // bord du chemin : foot' + m*cw + d*t ; bord de la route : foot + nr*hw + u*τ  (intersection)
        const px = foot[0] + nr[0] * hw - (bout[0] + m[0] * cw), py = foot[1] + nr[1] * hw - (bout[1] + m[1] * cw), den = d[0] * -u[1] - d[1] * -u[0];
        if (Math.abs(den) < .3) continue;                                                           // (chemin presque parallèle à la route : pas de congé)
        const t = (px * -u[1] - py * -u[0]) / den; if (Math.abs(t) > 2 * hw + 4) continue;
        const E = [bout[0] + m[0] * cw + d[0] * t, bout[1] + m[1] * cw + d[1] * t];
        const dirU = (m[0] * u[0] + m[1] * u[1]) >= 0 ? 1 : -1, R1 = [E[0] + u[0] * dirU * FILET, E[1] + u[1] * dirU * FILET], R2 = [E[0] + d[0] * FILET, E[1] + d[1] * FILET];
        const e = P(E), a = P(R1), b = P(R2);
        ctx.beginPath(); ctx.moveTo(...e); ctx.lineTo(...a); ctx.quadraticCurveTo(...e, ...b); ctx.closePath(); ctx.fillStyle = roadCols(c)[0]; ctx.fill();
        ctx.beginPath(); ctx.moveTo(...a); ctx.quadraticCurveTo(...e, ...b); ctx.strokeStyle = roadCols(c)[1]; ctx.lineWidth = bord; ctx.lineCap = 'butt'; ctx.stroke();
      }
    }
  }
}
function drawRoads() {
  // au carrefour, le revêtement le plus noble passe dessus : terre < gravier < pavé
  const rank = r => roadType(r).pieton ? -1 : ROADS.indexOf(roadType(r));   // (le chemin passe sous toutes les routes : sa chaussée s'arrête au bord de la grande route)
  const s = view.s, bySurf = S.roads.slice().sort((a, b) => rank(a) - rank(b));
  const stroke = (r, color, grow) => {
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(roadType(r).surf * s, 3.6) + 2 * grow; // (au moins 3,6 px de large, même de loin)
    ctx.lineCap = 'round'; ctx.lineJoin = 'miter'; ctx.miterLimit = 1.6;   // (angle franc : le coin extérieur reste vif, pas arrondi)
    for (const piece of roadPieces(r)) { polyPath(piece); ctx.stroke(); }
  };
  // bordure fine et sombre de toutes les routes d'abord, puis les chaussées : aux carrefours
  // les chaussées se fondent sans trait
  for (const r of bySurf) stroke(r, roadCols(r)[1], Math.max(.8, Math.min(1.4, s * .4)));
  let filets = false;
  for (const r of bySurf) { if (!filets && !roadType(r).pieton) { filetsChemins(Math.max(.8, Math.min(1.4, s * .4))); filets = true; } stroke(r, roadCols(r)[0], 0); }   // (chemins d'abord, puis les congés de raccord, puis les routes par-dessus)
  if (!filets) filetsChemins(Math.max(.8, Math.min(1.4, s * .4)));

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
