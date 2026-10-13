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
  // neige (désert polaire) : traînées courtes couchées par le vent, bleutées et blanches
  PAT.neige = !(S && biomeLook().neigeTex) ? null : (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); g.lineWidth = 1.3; g.lineCap = 'round';
    for (let i = 0; i < 60; i++) {
      const x = rnd() * 128, y = rnd() * 128, l = 6 + rnd() * 14, a = -.12 + (rnd() - .5) * .2;
      g.strokeStyle = i % 3 ? '#8fbbe0' : '#ffffff'; g.globalAlpha = i % 3 ? .07 + rnd() * .07 : .3;
      for (const ox of [0, -128, 128]) { g.beginPath(); g.moveTo(x + ox, y); g.lineTo(x + ox + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    }
    return ctx.createPattern(c, 'repeat');
  })();
}
// couleur unie de la chaussée et de sa bordure, selon le revêtement
const FILL = { terre:'earth', gravier:'gravel', pave:'paving', chemin:'path' };
const EDGE = { terre:'earth-edge', gravier:'gravel-edge', pave:'paving-edge', chemin:'path-edge' };
function roadCols(r) { const k = roadType(r).id, L = S && biomeLook().route; return L || [Col[FILL[k]] || Col.verge, Col[EDGE[k]]]; }   // (look.route : routes aux couleurs du biome, ex. neige bleutée)
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
    if (o.libre || o.fige) continue;                                              // une route du joueur ou du générateur fini ne modifie aucune autre
    const e = first ? o.pts[0] : o.pts[o.pts.length - 1];
    if (segLen(e, v) >= 1 || (o === r && ends.some(x => x.o === o))) continue;
    let P = lisser(o.pts); if (!first) P = P.slice().reverse();   // depuis le point, vers l'extérieur
    ends.push({ o, first, P });
  }
  if (ends.length < 2) return null;
  const cum = P => { const c = [0]; for (let i = 1; i < P.length; i++) c.push(c[i - 1] + segLen(P[i - 1], P[i])); return c; };
  const at = (P, d) => { const c = cum(P); let i = 1; while (i < P.length - 1 && c[i] < d) i++; const t = Math.min(1, (d - c[i - 1]) / ((c[i] - c[i - 1]) || 1)); return { q:[P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t], i }; };
  const dir = x => { const q = at(x.P, 40).q, L = segLen(v, q) || 1; return [(q[0] - v[0]) / L, (q[1] - v[1]) / L]; };
  /* Appariement glouton : la paire la plus opposée devient une courbe continue, puis la paire la plus opposée parmi les restantes (un carrefour à 4 routes = deux lignes qui se croisent
     proprement, sans route plaquée sur l'autre) ; une route restante (nombre impair) vient finir sur la courbe de la première paire. */
  const libres = ends.slice(), pairs = [];
  while (libres.length >= 2) {
    let best = null;
    for (let a = 0; a < libres.length; a++) for (let b = a + 1; b < libres.length; b++) {
      const da = dir(libres[a]), db = dir(libres[b]), dot = da[0] * db[0] + da[1] * db[1];
      if (!best || dot < best.dot) best = { a:libres[a], b:libres[b], dot };
    }
    libres.splice(libres.indexOf(best.a), 1); libres.splice(libres.indexOf(best.b), 1);
    const R = Math.min(HUB_R, .4 * cum(best.a.P).pop(), .4 * cum(best.b.P).pop());
    const A = at(best.a.P, R), B = at(best.b.P, R), m = [(A.q[0] + 2 * v[0] + B.q[0]) / 4, (A.q[1] + 2 * v[1] + B.q[1]) / 4];
    best.turn = 180 - Math.acos(Math.max(-1, Math.min(1, best.dot))) * 180 / Math.PI; best.A = A; best.B = B; best.m = m;
    pairs.push(best);
  }
  const me = ends.find(x => x.o === r);
  if (!me) return null;
  const mienne = pairs.find(q => q.a === me || q.b === me);
  if (!mienne) { const q0 = pairs[0]; return q0 && q0.turn >= HUB_MIN_TURN ? { m:q0.m, P:me.P, first:me.first, cut:null } : null; }   // route restante : finit sur la courbe
  if (mienne.turn < HUB_MIN_TURN) return null;                                   // paire déjà quasi droite : rien à faire
  const mine = me === mienne.a ? mienne.A : mienne.B, mineQ = mine.q, other = me === mienne.a ? mienne.B.q : mienne.A.q;
  const curve = []; for (let k = 0; k <= 6; k++) { const t = .5 * (1 - k / 6), w = 1 - t; curve.push([w * w * mineQ[0] + 2 * w * t * v[0] + t * t * other[0], w * w * mineQ[1] + 2 * w * t * v[1] + t * t * other[1]]); }
  // (t = .5 : le milieu m ; t = 0 : le point de départ de la route) → depuis m vers l'extérieur
  return { m:mienne.m, P:me.P, first:me.first, cut:{ curve, i:mine.i } };
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
function smoothBase(r) {
  if (r.libre || r.fige) return r.pts;                                             // fige : route du générateur déjà lissée et finie (monde-plat.js) : prise telle quelle, sans autre lissage ni raccord                                                       // tracé du joueur : tel quel, sans lissage ni raccord
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
    const C = smoothBase(o);                                                          // sa courbe FINALE (raccord de capitale compris) : plus de pointe qui dépasse
    let best = null, bd = Infinity;
    for (let k = 0; k < C.length - 1; k++) { const t = ptSeg(v, C[k], C[k + 1]); if (t.d < bd) { bd = t.d; best = t.q; } }
    if (best && bd < 30) pinEnd(out, end, best);
  }
  smoothCache.set(r.id, { key, P:out });
  return out;
}
/* Tracé final d'une route : son lissage (smoothBase) dont les bouts qui dépassent un croisement sont coupés net. Les autres routes sont prises dans leur tracé lissé complet (smoothBase), jamais récursivement. */
const smoothCache2 = new Map();
function smoothPts(r) {
  if (r.libre || r.fige) return r.pts;
  const key = r.id + ':' + roadsSig(), hit = smoothCache2.get(r.id);
  if (hit && hit.key === key) return hit.P;
  let out = smoothBase(r);
  /* Croisement propre : un bout qui dépasse de moins de 35 m une autre route (le tronçon qui reste après le croisement) est coupé net sur la chaussée croisée, au lieu de laisser une pointe arrondie de l'autre côté. */
  {
    for (const first of [true, false]) {
      const Q = first ? out.slice() : out.slice().reverse(); let len = 0, cut = -1, pt = null;
      for (let i = 0; i < Q.length - 1 && len < 35 && cut < 0; i++) {
        for (const o of S.roads) if (o !== r && !o.libre) {
          const C = smoothBase(o);
          for (let k = 0; k < C.length - 1; k++) { const c = segCross(Q[i], Q[i + 1], C[k], C[k + 1]); if (c && len + segLen(Q[i], c) > 2) { cut = i; pt = c; break; } }
          if (cut >= 0) break;
        }
        len += segLen(Q[i], Q[i + 1]);
      }
      if (cut >= 0) { const R = [pt, ...Q.slice(cut + 1)]; out = first ? R : R.reverse(); }
    } }
  /* Carrefour en T propre : un bout posé sur le flanc d'une autre route (hors carrefour de capitale) arrive PERPENDICULAIREMENT. Ses derniers 30 m sont refaits en courbe de Bézier : tangente à la route
     sur ses 30 m avant le carrefour, puis droite dans l'axe perpendiculaire à la route croisée. */
  for (const first of [true, false]) {
    const Q = first ? out.slice() : out.slice().reverse(), e = Q[0]; let J = null, tM = null;
    for (const o of S.roads) { if (o === r || o.libre) continue; const C = smoothBase(o); if (segLen(e, C[0]) < 10 || segLen(e, C[C.length - 1]) < 10) continue;
      for (let i = 0; i < C.length - 1; i++) { const t = ptSeg(e, C[i], C[i + 1]); if (t.d < 1.5) { J = t.q; const L = segLen(C[i], C[i + 1]) || 1; tM = [(C[i + 1][0] - C[i][0]) / L, (C[i + 1][1] - C[i][1]) / L]; break; } }
      if (J) break; }
    if (!J) continue;
    let k = 1, len = 0; while (k < Q.length - 1 && len < 30) { len += segLen(Q[k - 1], Q[k]); k++; }
    if (len < 18) continue;
    const S0 = Q[k], dS = [(Q[k - 1][0] - S0[0]) / (segLen(Q[k - 1], S0) || 1), (Q[k - 1][1] - S0[1]) / (segLen(Q[k - 1], S0) || 1)];   // sens de la route vers le carrefour
    let n = [-tM[1], tM[0]]; if (n[0] * (S0[0] - J[0]) + n[1] * (S0[1] - J[1]) < 0) n = [-n[0], -n[1]];                                // normale, côté de la route qui arrive
    const D = segLen(S0, J), c1 = [S0[0] + dS[0] * D * .45, S0[1] + dS[1] * D * .45], c2 = [J[0] + n[0] * D * .45, J[1] + n[1] * D * .45], B = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10, w = 1 - t; B.push([round2(w * w * w * S0[0] + 3 * w * w * t * c1[0] + 3 * w * t * t * c2[0] + t * t * t * J[0]), round2(w * w * w * S0[1] + 3 * w * w * t * c1[1] + 3 * w * t * t * c2[1] + t * t * t * J[1])]); }
    const R = [...Q.slice(k + 1).reverse(), ...B];                                                                                        // (de l'intérieur vers le carrefour)
    out = first ? R.reverse() : R;
  }
  smoothCache2.set(r.id, { key, P:out });
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
    const Qc = smoothPts(c), nq = Qc.length, loin = (A, dir) => { for (let i = dir > 0 ? 1 : nq - 2; i >= 0 && i < nq; i += dir) if (segLen(A, Qc[i]) >= 6) return Qc[i]; return Qc[dir > 0 ? nq - 1 : 0]; };   // (direction du bout : 6 m à l'intérieur de la route)
    const FIL = tc.pieton ? FILET : Math.max(FILET, Math.min(9, tc.surf * .9));   // (une route : congé plus large qu'un chemin)
    for (const [bout, vers] of [[Qc[0], loin(Qc[0], 1)], [Qc[nq - 1], loin(Qc[nq - 1], -1)]]) {
      let best = null;
      for (const o of S.roads) { if (o === c || (tc.pieton && roadType(o).pieton)) continue; const Q = smoothPts(o); if (!tc.pieton && (segLen(bout, Q[0]) < 3 || segLen(bout, Q[Q.length - 1]) < 3)) continue; for (let i = 0; i < Q.length - 1; i++) { const t = ptSeg(bout, Q[i], Q[i + 1]); if (t.d < 1.5 && (!best || t.d < best.d)) best = { d:t.d, o, a:Q[i], b:Q[i + 1] }; } }   // (le tracé réellement dessiné ; le bout du chemin est sur l'axe de la route)
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
        const dirU = (m[0] * u[0] + m[1] * u[1]) >= 0 ? 1 : -1, R1 = [E[0] + u[0] * dirU * FIL, E[1] + u[1] * dirU * FIL], R2 = [E[0] + d[0] * FIL, E[1] + d[1] * FIL];
        const e = P(E), a = P(R1), b = P(R2);
        ctx.beginPath(); ctx.moveTo(...e); ctx.lineTo(...a); ctx.quadraticCurveTo(...e, ...b); ctx.closePath(); ctx.fillStyle = roadCols(c)[0]; ctx.fill();
        ctx.beginPath(); ctx.moveTo(...a); ctx.quadraticCurveTo(...e, ...b); ctx.strokeStyle = roadCols(c)[1]; ctx.lineWidth = bord; ctx.lineCap = 'butt'; ctx.stroke();
      }
    }
  }
}
/* Bouts d'une route qui ne sont posés sur le flanc d'aucune autre route (un bout posé sur une autre route reste plat, il ne dépasse pas de celle-ci) */
const libresCache = new Map();
function boutsLibres(r) {
  const key = roadsSig(), hit = libresCache.get(r.id);
  if (hit && hit.key === key) return hit.E;
  const P = smoothPts(r), E = [P[0], P[P.length - 1]].filter(e => !S.roads.some(o => {
    if (o === r) return false;
    const Q = smoothPts(o);
    for (let i = 0; i < Q.length - 1; i++) if (ptSeg(e, Q[i], Q[i + 1]).d < 1.5 && segLen(e, Q[0]) > 2 && segLen(e, Q[Q.length - 1]) > 2) return true;
    return false;
  }));
  libresCache.set(r.id, { key, E });
  return E;
}
function drawRoads() {
  // au carrefour, le revêtement le plus noble passe dessus : terre < gravier < pavé
  const rank = r => roadType(r).pieton ? -1 : ROADS.indexOf(roadType(r));   // (le chemin passe sous toutes les routes : sa chaussée s'arrête au bord de la grande route)
  const s = view.s, bySurf = S.roads.slice().sort((a, b) => rank(a) - rank(b));
  const stroke = (r, color, grow) => {
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(roadType(r).surf * s, 3.6) + 2 * grow; // (au moins 3,6 px de large, même de loin)
    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter'; ctx.miterLimit = 1.6;   // (angle franc : le coin extérieur reste vif ; bout plat : un raccord ne dépasse plus de la route principale)
    for (const piece of roadPieces(r)) { polyPath(piece); ctx.stroke(); }
    ctx.fillStyle = color;
    for (const e of boutsLibres(r)) { const [X, Y] = toS(e[0], e[1]); ctx.beginPath(); ctx.arc(X, Y, ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fill(); }   // bout libre (capitale, bord de carte) : arrondi
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

/* Tronçons de route (demande du 12/10) : chaque route est découpée à ses ponts et à ses croisements avec les autres routes ; la longueur de chaque tronçon (m) est affichée en son milieu (mode développeur et éditeur de routes).
   Calcul gardé tant que les routes ne changent pas. */
let tronconsMem = { v:-1, S:null, list:[] };
function tronconsRoutes() {
  if (tronconsMem.v === sceneV && tronconsMem.S === S) return tronconsMem.list;
  const list = [], L = bridges();
  for (const r of S.roads) {
    const P = smoothPts(r), cum = [0]; for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + segLen(P[i - 1], P[i]));
    const total = cum[cum.length - 1], coupes = new Set([0, total]), pontsR = L.filter(b => b.road === r.id);
    for (const b of pontsR) { coupes.add(b.s0); coupes.add(b.s1); }
    for (const o of S.roads) { if (o === r) continue; const Q = smoothPts(o);
      for (let k = 0; k < P.length - 1; k++) for (let j = 0; j < Q.length - 1; j++) { const x = segCross(P[k], P[k + 1], Q[j], Q[j + 1]); if (x) coupes.add(cum[k] + segLen(P[k], x)); } }
    const S2 = [...coupes].sort((a, b) => a - b).filter((v, i, a) => !i || v - a[i - 1] > 3);       // (deux coupes à moins de 3 m : une seule)
    const at = s => { let i = 1; while (i < cum.length - 1 && cum[i] < s) i++; const t = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1); return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t]; };
    for (let i = 0; i < S2.length - 1; i++) { const len = S2[i + 1] - S2[i]; if (len < 4) continue; list.push({ road:r.id, len, mid:at((S2[i] + S2[i + 1]) / 2), pont:pontsR.some(b => Math.abs(b.s0 - S2[i]) < 4 && Math.abs(b.s1 - S2[i + 1]) < 4) }); }
  }
  tronconsMem = { v:sceneV, S, list };
  return list;
}
function drawTroncons() {
  if (!(typeof MONDE_PLAT !== 'undefined' && MONDE_PLAT) && !(typeof JR !== 'undefined' && JR.actif)) return;
  if (view.s < .25) return;
  ctx.save(); ctx.font = '600 12px "Barlow Condensed", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const t of tronconsRoutes()) { const [X, Y] = toS(t.mid[0], t.mid[1]); if (X < -40 || Y < -20 || X > W + 40 || Y > H + 20) continue; haloText(Math.round(t.len) + ' m' + (t.pont ? ' (pont)' : ''), X, Y - 9, t.pont ? '#7a3a00' : '#1d2d3a', 'rgba(255,255,255,.9)'); }
  ctx.restore();
}
