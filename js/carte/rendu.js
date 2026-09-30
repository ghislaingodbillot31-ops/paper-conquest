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
  requestDraw();
}
// bouton ▦ sur la carte : enfoncé quand le quadrillage est affiché
function syncGridButton() {
  const b = document.getElementById('zgrid');
  if (!b) return;
  b.setAttribute('aria-pressed', opts.grid);
  b.setAttribute('aria-label', opts.grid ? 'Masquer le quadrillage du zonage' : 'Afficher le quadrillage du zonage');
}
// courbes de niveau : fines tous les 2 m, appuyées tous les 10 m
function polyPath2D(P) {
  const path = new Path2D();
  P.forEach((p, i) => { const X = p[0] * view.s + view.ox, Y = p[1] * view.s + view.oy; i ? path.lineTo(X, Y) : path.moveTo(X, Y); });
  path.closePath();
  return path;
}
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
/* Ponts en pierre (demande du 30/09) : un tablier droit dans l'axe de la route au point de
   traversée, un peu plus long que la rivière n'est large à cet endroit (largeur réelle,
   divisée par le sinus de l'angle de traversée, plus 3,5 m de chaque côté pour poser le pont
   sur les berges). Calculés une fois, refaits seulement si routes ou rivières changent. */
let bridgeCache = { key:null, list:[] };
function bridges() {
  const key = JSON.stringify([S.roads.map(r => [r.id, r.kind, r.pts]), S.rivers.map(r => [r.pts.length, r.pts[0], r.w0, r.w1, r.confl, r.joined, r.isles])]);
  if (bridgeCache.key === key) return bridgeCache.list;
  const list = [];
  for (const river of S.rivers) {
    const rv = river.pts, HW = riverHW(river), rbb = rv.slice(1).map((q, i) => bbox([rv[i], q]));
    for (const r of S.roads) { const RP = smoothPts(r); for (let k = 0; k < RP.length - 1; k++) {
      const a = RP[k], b = RP[k+1], sb = bbox([a, b]);
      for (let i = 0; i < rv.length - 1; i++) {
        if (!(sb[0] <= rbb[i][2] && rbb[i][0] <= sb[2] && sb[1] <= rbb[i][3] && rbb[i][1] <= sb[3])) continue;
        const p = segCross(a, b, rv[i], rv[i+1]);
        if (!p) continue;
        // axe du pont : la direction de la route sur ±12 m autour du point de traversée
        const a2 = RP[Math.max(0, k - 12)], b2 = RP[Math.min(RP.length - 1, k + 13)], L = segLen(a2, b2) || 1;
        const u = [(b2[0] - a2[0]) / L, (b2[1] - a2[1]) / L], n = [-u[1], u[0]];
        /* Longueur : on mesure, le long des DEUX bords du pont (et de son axe), jusqu'où l'on
           est au-dessus de l'eau — en biais, un bord de la route atteint la berge bien plus
           loin que l'axe. Le pont va jusqu'au point le plus éloigné, + 3,5 m sur la berge. */
        const w = roadType(r).surf / 2 + 1.2, i0 = Math.max(0, i - 60), i1 = Math.min(rv.length - 2, i + 60);
        const wet = q => { for (let j = i0; j <= i1; j++) if (ptSeg(q, rv[j], rv[j + 1]).d < HW[j]) return true; return false; };
        const reach = { '-1':0, '1':0 };
        for (const t of [-w, 0, w]) for (const e of [-1, 1]) {
          let l = 0;
          while (l < 400 && wet([p[0] + u[0] * l * e + n[0] * t, p[1] + u[1] * l * e + n[1] * t])) l += .5;
          reach[e] = Math.max(reach[e], l);
        }
        // chaque bout va jusqu'à sa propre berge (le pont n'est pas forcément centré sur l'axe
        // de la rivière)
        const hf = reach[1] + 3.5, hb = reach[-1] + 3.5, sh = (hf - hb) / 2;
        list.push({ c:[p[0] + u[0] * sh, p[1] + u[1] * sh], u, n, half:(hf + hb) / 2, w });
      }
    } }
  }
  bridgeCache = { key, list };
  return list;
}
// (compatibilité : les deux parapets de chaque pont, en segments)
const bridgeSegs = () => bridges().flatMap(b => [1, -1].map(sd => [
  [b.c[0] - b.u[0] * b.half + b.n[0] * b.w * sd, b.c[1] - b.u[1] * b.half + b.n[1] * b.w * sd],
  [b.c[0] + b.u[0] * b.half + b.n[0] * b.w * sd, b.c[1] + b.u[1] * b.half + b.n[1] * b.w * sd]]));
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
/* ---------- végétation en tuiles (anti-lag) ----------
   Des dizaines de milliers d'arbres ne sont plus redessinés à chaque image : la couche
   végétation est peinte par tuiles de 512 px, à la résolution du zoom (2, 4, 8 ou 16 px
   par mètre), gardées en mémoire (160 au plus, les moins récentes sont libérées). Déplacer
   ou zoomer ne fait que recopier des images ; une tuile n'est repeinte que si un arbre
   change dessous (coupe, pousse, nouveau bâtiment). Trois tuiles au plus sont peintes par
   image ; en attendant, la vue de loin (1 px/m) bouche le trou. */
const TILE_PX = 512, TILE_LEVELS = [.5, 1, 2, 4, 8, 16], TILE_MAX = 160, TILE_BUDGET = 3; // (0,5 et 1 px/m : vue de loin, détaillée elle aussi)
const tiles = new Map();
let floraIdx = null, tileClock = 0;
// index des arbres par seaux de 64 m (chaque seau garde l'ordre nord → sud)
function floraNear(x0, y0, x1, y1) {
  if (!floraIdx) {
    floraIdx = new Map();
    for (const f of flora) { const k = Math.floor(f.x / 64) + ',' + Math.floor(f.y / 64); if (!floraIdx.has(k)) floraIdx.set(k, []); floraIdx.get(k).push(f); }
  }
  const out = [];
  for (let j = Math.floor(y0 / 64); j <= Math.floor(y1 / 64); j++) for (let i = Math.floor(x0 / 64); i <= Math.floor(x1 / 64); i++)
    for (const f of floraIdx.get(i + ',' + j) || []) if (f.x >= x0 && f.x <= x1 && f.y >= y0 && f.y <= y1) out.push(f);
  return out.sort((a, b) => a.y - b.y);
}
function invalidateTiles(x, y, r) {
  for (const [k, tl] of tiles) if (x + r > tl.x0 && x - r < tl.x0 + tl.m && y + r > tl.y0 && y - r < tl.y0 + tl.m) tiles.delete(k);
}
function renderTile(L, i, j) {
  const m = TILE_PX / L, x0 = i * m, y0 = j * m, M = 40; // marge : houppiers et ombres qui débordent
  const c = document.createElement('canvas'); c.width = c.height = TILE_PX;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = true;
  const list = floraNear(x0 - M, y0 - M, x0 + m + M, y0 + m + M);
  drawWoods(g, list.filter(f => f.wood), L, -x0 * L, -y0 * L);
  for (const f of list) if (!f.wood) stampTree(g, f, (f.x - x0) * L, (f.y - y0) * L, L);
  const tl = { c, x0, y0, m, used:++tileClock };
  tiles.set(L + ':' + i + ':' + j, tl);
  if (tiles.size > TILE_MAX) {                                   // on libère les plus anciennes
    const old = [...tiles.entries()].sort((a, b) => a[1].used - b[1].used).slice(0, tiles.size - TILE_MAX);
    for (const [k] of old) tiles.delete(k);
  }
  return tl;
}
// arbres et buissons : modèles peints posés du nord au sud (les houppiers se recouvrent)
function drawFlora() {
  const s = view.s, eff = s * dpr, [tx, ty] = toS(0, 0);
  ctx.imageSmoothingEnabled = true;
  // (plus d'image unique floue pour la vue de loin : les tuiles à 0,5 et 1 px/m gardent les
  // détails — arbres, bosquets, rochers restent visibles)
  const [wx0, wy0] = toW(0, 0), [wx1, wy1] = toW(W, H);
  if (eff > 16) { // très près : peu d'arbres visibles, dessinés directement
    const list = floraNear(wx0 - 40, wy0 - 40, wx1 + 40, wy1 + 40);
    drawWoods(ctx, list.filter(f => f.wood), s, view.ox, view.oy);
    for (const f of list) if (!f.wood) { const [X, Y] = toS(f.x, f.y); stampTree(ctx, f, X, Y, s); }
    return;
  }
  const L = TILE_LEVELS.find(l => l >= eff) || 16, m = TILE_PX / L;
  // budget de temps : on peint des tuiles pendant 10 ms au plus par image (au moins une),
  // pour que le zoom et le déplacement restent fluides
  const t0 = performance.now();
  let budget = TILE_BUDGET, missing = false;
  const i0 = Math.max(0, Math.floor(wx0 / m)), i1 = Math.min(Math.ceil(TW / m) - 1, Math.floor(wx1 / m));
  const j0 = Math.max(0, Math.floor(wy0 / m)), j1 = Math.min(Math.ceil(TH / m) - 1, Math.floor(wy1 / m));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    let tl = tiles.get(L + ':' + i + ':' + j);
    if (!tl && budget > 0 && (budget === TILE_BUDGET || performance.now() - t0 < 10)) { tl = renderTile(L, i, j); budget--; }
    const X = i * m * s + view.ox, Y = j * m * s + view.oy, Z = m * s;
    if (tl) { tl.used = ++tileClock; ctx.drawImage(tl.c, X, Y, Z + .6, Z + .6); }
    else {  // pas encore peinte : la vue de loin en attendant
      missing = true;
      const sw = Math.min(m, TW - i * m), sh = Math.min(m, TH - j * m); // sans déborder de l'image
      ctx.drawImage(floraImage(), i * m, j * m, sw, sh, X, Y, sw * s, sh * s);
    }
  }
  if (missing) requestDraw(); // les tuiles restantes arrivent aux images suivantes
}
