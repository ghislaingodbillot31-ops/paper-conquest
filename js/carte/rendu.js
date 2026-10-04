/* Options d'affichage, propres à chaque visiteur (gardées dans ce navigateur) */
const OPTS_KEY = 'planVillageZonage.options';
const opts = { grid:true, contours:true };
try { Object.assign(opts, JSON.parse(localStorage.getItem(OPTS_KEY) || '{}')); } catch (e) {}
function setOpt(k, v) {
  opts[k] = v;
  try { localStorage.setItem(OPTS_KEY, JSON.stringify(opts)); } catch (e) {}
  const box = document.getElementById({ grid:'show-grid', contours:'show-contours' }[k]);
  if (box) box.checked = v;
  syncGridButton();
  markAllDirty(); // quadrillage et courbes sont peints dans le décor
}
// bouton ▦ sur la carte : enfoncé quand le quadrillage est affiché
function syncGridButton() {
  const b = document.getElementById('zgrid');
  if (!b) return;
  b.setAttribute('aria-pressed', opts.grid);
  b.setAttribute('aria-label', opts.grid ? 'Masquer le quadrillage du zonage' : 'Afficher le quadrillage du zonage');
}
// courbes de niveau : fines tous les 2 m, appuyées tous les 10 m
function drawContours() {
  if (!opts.contours) return;
  const s = view.s, segs = contourSegments(), [wx0, wy0] = toW(0, 0), [wx1, wy1] = toW(W, H);
  const minor = new Path2D(), major = new Path2D();
  for (const [x1, y1, x2, y2, L] of segs) {
    if (Math.max(x1, x2) < wx0 || Math.min(x1, x2) > wx1 || Math.max(y1, y2) < wy0 || Math.min(y1, y2) > wy1) continue;
    const path = L % 10 === 0 ? major : minor;
    path.moveTo(x1 * s + view.ox, y1 * s + view.oy); path.lineTo(x2 * s + view.ox, y2 * s + view.oy);
  }
  ctx.strokeStyle = Col.contour; ctx.lineCap = 'round';
  if (s > 1.2) { ctx.globalAlpha = .45; ctx.lineWidth = .8; ctx.stroke(minor); }
  ctx.globalAlpha = .9; ctx.lineWidth = 1.3; ctx.stroke(major);
  ctx.globalAlpha = 1;
}
function drawWater() {
  const s = view.s, [tx, ty] = toS(0, 0);
  ctx.save();
  ctx.beginPath(); ctx.rect(tx, ty, TW * s, TH * s); ctx.clip(); // la rivière sort par les bords
  clipTerre(); // (et s'arrête au rivage)
  const shape = (pts, close) => { polyPath(pts); if (close) ctx.closePath(); };
  ctx.fillStyle = Col.water; ctx.strokeStyle = Col['water-edge']; ctx.lineJoin = 'round';
  /* Rivières dessinées comme une suite serrée de disques le long du cours (rayon = demi-
     largeur) : les berges restent rondes dans les virages serrés (plus de pointe ni de
     repli), et deux rivières qui se rejoignent se fondent l'une dans l'autre avec des
     angles adoucis. Berges d'abord (disques un peu plus grands, couleur de berge), puis
     toute l'eau par-dessus : aucun trait ne traverse une confluence. */
  const [wx0, wy0] = toW(-30, -30), [wx1, wy1] = toW(W + 30, H + 30), edge = 1.5;
  const discs = (grow, k = 1) => {
    const path = new Path2D();
    for (const rv of S.rivers) for (const [x, y, r] of bandDiscs(rv, k)) {
      if (x + r < wx0 || x - r > wx1 || y + r < wy0 || y - r > wy1) continue;
      const X = x * s + view.ox, Y = y * s + view.oy, R = Math.max(r * s, 1.3) + grow; // (petite rivière visible même de loin)
      path.moveTo(X + R, Y); path.arc(X, Y, R, 0, Math.PI * 2);
    }
    return path;
  };
  ctx.fillStyle = Col['water-edge']; ctx.fill(discs(edge));
  ctx.lineWidth = edge * 2;
  for (const lk of S.lakes) { shape(lakeShape(lk), true); ctx.stroke(); }
  /* Eau en dégradé : claire au bord (hauts-fonds), de plus en plus foncée vers le milieu
     (chenal, fond du lac). Six bandes emboîtées : le cours d'eau à 100 %, 85 %, 70 %… de sa
     largeur, et chaque lac réduit vers son centre, chacune un peu plus foncée. */
  const water = biomeLook().water || Col.water; // eau propre au biome (glacée, oasis…)
  // liseré presque blanc juste à l'intérieur de la berge (écume, comme la carte de référence),
  // puis le dégradé qui part un peu en retrait
  const foam = Math.max(1.2, Math.min(3, s * .9));
  ctx.fillStyle = WATER_FOAM; ctx.fill(discs(0));
  // eau d'une seule teinte (dégradé retiré à la demande de l'utilisateur, 29/09)
  ctx.fillStyle = water;
  ctx.fill(discs(-foam));
  for (const lk of S.lakes) { shape(lakeShape(lk), true); ctx.fill(); }
  for (const lk of S.lakes) { // lacs : le même liseré, tracé à l'intérieur du bord, puis la berge sombre
    ctx.save(); shape(lakeShape(lk), true); ctx.clip();
    ctx.strokeStyle = WATER_FOAM; ctx.lineWidth = foam * 2 + edge * 2; ctx.stroke(); ctx.restore();
    shape(lakeShape(lk), true); ctx.strokeStyle = Col['water-edge']; ctx.lineWidth = edge * 2; ctx.stroke();
  }
  // îles : berge sombre, grève de sable, puis le sol du biome au cœur de l'île
  const look = biomeLook();
  for (const rv of S.rivers) for (const is of riverIsles(rv)) {
    if (is.bb[2] < wx0 || is.bb[0] > wx1 || is.bb[3] < wy0 || is.bb[1] > wy1) continue;
    shape(is.P, true); ctx.lineWidth = edge * 2; ctx.stroke();
    ctx.fillStyle = '#e4d7a6'; ctx.fill();
    shape(is.inner, true); // cœur herbeux : toujours à l'intérieur de l'île, même courbe
    ctx.fillStyle = look.ground; ctx.fill();
  }
  // fil du courant
  if (s > 1.5) {
    ctx.setLineDash([6, 10]); ctx.globalAlpha = .45; ctx.lineWidth = 1;
    for (const rv of S.rivers) { shape(rv.pts, false); ctx.stroke(); }
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  ctx.restore();
}
// pont : parapets de part et d'autre de la chaussée, sur toute la traversée de la rivière
// les parapets ne sont recalculés que si routes ou rivières changent (avant : à chaque image,
// des centaines de milliers de tests de croisement)
/* Ponts en pierre. Un pont relie l'ENTREE et la SORTIE de la route de part et d'autre de l'eau :
   on suit la route (tracé lissé, un point tous les 1,5 m), on repère chaque passage sur l'eau (rivière ou lac),
   et le pont va du point de la route situé PONT_BORD m avant la berge au point situé PONT_BORD m après l'autre
   berge. Ces deux points sont sur la route : le pont les relie en ligne droite, il dépasse donc bien des deux berges
   et la route s'arrête à son entrée et reprend à sa sortie (elle n'est pas dessinée sous le tablier : voir
   roadPieces dans routes.js). Calculés une fois, refaits seulement si routes ou rivières changent. */
const PONT_BORD = 4.5, PONT_PAS = 1.5;
let bridgeCache = { key:null, list:[] };
const ptInPoly = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) if ((poly[i][1] > p[1]) !== (poly[j][1] > p[1]) && p[0] < (poly[j][0] - poly[i][0]) * (p[1] - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0]) c = !c; return c; };
function bridges() {
  if (bridgeCache.v === sceneV && bridgeCache.S === S) return bridgeCache.list; // décor inchangé : rien à vérifier
  const key = JSON.stringify([S.roads.map(r => [r.id, r.kind, r.pts]), S.rivers.map(r => [r.pts.length, r.pts[0], r.w0, r.w1, r.confl, r.joined, r.isles]), (S.lakes || []).map(l => [l.c, l.pts && l.pts.length])]);
  if (bridgeCache.key === key) { bridgeCache.v = sceneV; bridgeCache.S = S; return bridgeCache.list; }
  const list = [];
  const rivs = S.rivers.map(river => { const rv = river.pts, HW = riverHW(river); return { rv, HW, bb:bbox(rv), hmax:Math.max(...HW) }; });
  const lacs = (S.lakes || []).map(lk => { const poly = lakeShape(lk); return { poly, bb:bbox(poly) }; });
  for (const r of S.roads) {
    const RP = smoothPts(r), P = resample(RP, PONT_PAS), n = P.length, rbb = bbox(RP), w = roadType(r).surf / 2 + 1.2;
    if (n < 6) continue;
    // chaque rivière et chaque lac dont l'emprise touche la route
    const near = rivs.filter(v => !(rbb[0] > v.bb[2] + v.hmax + w || rbb[2] < v.bb[0] - v.hmax - w || rbb[1] > v.bb[3] + v.hmax + w || rbb[3] < v.bb[1] - v.hmax - w));
    const lnear = lacs.filter(l => !(rbb[0] > l.bb[2] + w || rbb[2] < l.bb[0] - w || rbb[1] > l.bb[3] + w || rbb[3] < l.bb[1] - w));
    if (!near.length && !lnear.length) continue;
    const wet = P.map(q => {
      for (const v of near) { if (q[0] < v.bb[0] - v.hmax - w || q[0] > v.bb[2] + v.hmax + w || q[1] < v.bb[1] - v.hmax - w || q[1] > v.bb[3] + v.hmax + w) continue;
        for (let j = 0; j < v.rv.length - 1; j++) if (ptSeg(q, v.rv[j], v.rv[j + 1]).d < Math.max(v.HW[j], v.HW[j + 1]) + w * .5) return true; }
      for (const l of lnear) if (q[0] >= l.bb[0] - w && q[0] <= l.bb[2] + w && q[1] >= l.bb[1] - w && q[1] <= l.bb[3] + w && ptInPoly(q, l.poly)) return true;
      return false;
    });
    // passages sur l'eau (les trous secs de moins de 6 m sont comblés : un seul pont)
    const runs = []; let i = 0;
    while (i < n) { if (!wet[i]) { i++; continue; } let j = i; while (j + 1 < n && wet[j + 1]) j++; runs.push([i, j]); i = j + 1; }
    const merged = []; for (const rn of runs) { const last = merged[merged.length - 1]; if (last && (rn[0] - last[1]) * PONT_PAS < 6) last[1] = rn[1]; else merged.push(rn.slice()); }
    const m = Math.ceil(PONT_BORD / PONT_PAS);
    for (const [i0, i1] of merged) {
      if (i0 - m < 0 || i1 + m > n - 1) continue;                    // la route finit dans l'eau : pas de pont possible
      const A = P[i0 - m], B = P[i1 + m], L = segLen(A, B) || 1, u = [(B[0] - A[0]) / L, (B[1] - A[1]) / L];
      // longueur le long de la route (pour couper la chaussée sous le tablier)
      let s0 = 0; for (let k = 0; k < i0 - m; k++) s0 += segLen(P[k], P[k + 1]);
      let s1 = s0; for (let k = i0 - m; k < i1 + m; k++) s1 += segLen(P[k], P[k + 1]);
      list.push({ c:[(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], u, n:[-u[1], u[0]], half:L / 2, w, road:r.id, a:A, b:B, s0, s1 });
    }
  }
  bridgeCache = { key, list, v:sceneV, S };
  return list;
}
const BRIDGE = { deck:'#bdb6a8', course:'rgba(120,112,98,.45)', wall:'#a39c8e', joint:'rgba(63,69,69,.55)', edge:'#3f4545', shadow:'rgba(28,40,44,.32)' };
function drawBridges() {
  const list = bridges();
  if (!list.length) return;
  const s = view.s, lw = Math.max(1, Math.min(1.6, s * .35));
  // point du pont : l le long de l'axe (−half … half), t en travers (−w … w)
  const at = (b, l, t) => toS(b.c[0] + b.u[0] * l + b.n[0] * t, b.c[1] + b.u[1] * l + b.n[1] * t);
  const quad = (b, l0, t0, l1, t1, dl = 0, dt = 0) => {
    ctx.beginPath();
    for (const [l, t] of [[l0, t0], [l1, t0], [l1, t1], [l0, t1]]) { const [X, Y] = at(b, l + dl, t + dt); ctx.lineTo(X, Y); }
    ctx.closePath();
  };
  for (const b of list) {
    const H = b.half, w = b.w, pw = .8; // pw : épaisseur d'un parapet (m)
    // ombre portée sur l'eau (vers le sud-est)
    const sh = [1.6, 2.2], shl = sh[0] * b.u[0] + sh[1] * b.u[1], sht = sh[0] * b.n[0] + sh[1] * b.n[1];
    quad(b, -H + 3, -w, H - 3, w, shl, sht); ctx.fillStyle = BRIDGE.shadow; ctx.fill();
    // culées : les bouts du pont s'évasent sur les berges
    for (const e of [-1, 1]) {
      ctx.beginPath();
      for (const [l, t] of [[e * (H - 3), -w], [e * H, -w - 1.6], [e * H, w + 1.6], [e * (H - 3), w]]) { const [X, Y] = at(b, l, t); ctx.lineTo(X, Y); }
      ctx.closePath(); ctx.fillStyle = BRIDGE.wall; ctx.fill(); ctx.strokeStyle = BRIDGE.edge; ctx.lineWidth = lw; ctx.stroke();
    }
    // tablier en pierre, et ses rangs de pavés (visibles en zoomant)
    quad(b, -H, -w, H, w); ctx.fillStyle = BRIDGE.deck; ctx.fill(); ctx.strokeStyle = BRIDGE.edge; ctx.lineWidth = lw; ctx.stroke();
    if (s > 2) {
      ctx.strokeStyle = BRIDGE.course; ctx.lineWidth = 1; ctx.beginPath();
      for (let l = -H + 1.2; l < H; l += 1.2) { const [X0, Y0] = at(b, l, -w + pw), [X1, Y1] = at(b, l, w - pw); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); }
      ctx.stroke();
    }
    // parapets en blocs, avec leurs joints
    for (const sd of [-1, 1]) {
      quad(b, -H, sd * w, H, sd * (w - pw)); ctx.fillStyle = BRIDGE.wall; ctx.fill(); ctx.strokeStyle = BRIDGE.edge; ctx.lineWidth = lw; ctx.stroke();
      if (s > 1.5) {
        ctx.strokeStyle = BRIDGE.joint; ctx.lineWidth = 1; ctx.beginPath();
        for (let l = -H + 1.8; l < H; l += 1.8) { const [X0, Y0] = at(b, l, sd * w), [X1, Y1] = at(b, l, sd * (w - pw)); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); }
        ctx.stroke();
      }
    }
  }
}
