/* ---------- vue ---------- */
// (ctx est remplacé le temps de peindre une tuile du décor ou une vignette : voir paintWith, tuiles.js)
const cv = document.getElementById('plan'), wrap = document.getElementById('wrap');
let ctx = cv.getContext('2d');
let W = 0, H = 0, dpr = 1, Col = {}, fitted = false;
const view = { s:4, ox:0, oy:0 };
const toS = (x, y) => [x*view.s + view.ox, y*view.s + view.oy];
const toW = (px, py) => [(px - view.ox) / view.s, (py - view.oy) / view.s];
/* ZOOMS FIXES (page région, demande du 13/10/2026) : la caméra n'a que 3 échelles, en pixels par mètre ; la molette et les boutons + et − passent d'un cran à l'autre (en 0,18 s). Les tuiles du décor sont peintes exactement à ces
   échelles (tuiles.js) : plus de flou ni de repeint entre deux niveaux. Pas de vue d'ensemble de toute la région. Les autres pages (éditeurs) gardent le zoom libre. */
const ESSAI = !!(GAME && GAME.essai);   // vignettes de la page Dev « Biomes générés » : toute la carte, sans zoom ni déplacement
const ZOOMS = PAGE === 'region' && !ESSAI ? [1.5, 3.5, 14.9] : null;
const zoomProche = s => ZOOMS.reduce((b, z, i) => Math.abs(Math.log(z / s)) < Math.abs(Math.log(ZOOMS[b] / s)) ? i : b, 0);
// cadre la vue sur un rectangle du terrain (par défaut, tout le terrain)
function fit(box = [0, 0, TW, TH]) {
  if (ESSAI) { view.s = 2 * Math.min(W / TW, H / TH); clampView(); requestDraw(); return; }
  const bw = box[2] - box[0], bh = box[3] - box[1];
  if (ZOOMS) { const s = ZOOMS[zoomProche(Math.min((W - 90) / bw, (H - 70) / bh))];view.s = s; view.ox = W / 2 - (box[0] + box[2]) / 2 * s; view.oy = H / 2 - (box[1] + box[3]) / 2 * s; clampView(); requestDraw(); return; }
  const s = Math.max(.15, Math.min(8, (W - 90) / bw, (H - 70) / bh));
  view.s = s; view.ox = (W - bw * s) / 2 + 10 - box[0] * s; view.oy = (H - bh * s) / 2 + 6 - box[1] * s;
  requestDraw();
}
// à l'ouverture : cadrer sur ce qui est construit, avec une marge
function fitContent() {
  // le village (ses bâtiments) avec ses alentours ; à défaut, les routes et murailles
  const houses = S.houses.map(h => [h.x, h.y]);
  const pts = houses.length ? houses : [...S.roads, ...S.walls].flatMap(o => o.pts);
  if (!pts.length) return fit();
  const bb = bbox(pts), m = houses.length ? 220 : 80;
  fit([Math.max(0, bb[0] - m), Math.max(0, bb[1] - m), Math.min(TW, bb[2] + m), Math.min(TH, bb[3] + m)]);
}
// zoom arrière limité : au plus loin, toute la carte tient dans la fenêtre (avec sa marge)
const minScale = () => atelier.on ? Math.min((W - 60), (H - 60)) / atelierSide() * .5 : ZOOMS ? ZOOMS[0] : Math.max(.05, Math.min((W - 90) / TW, (H - 70) / TH));
// la carte ne peut pas sortir de la fenêtre : si elle est plus petite que la fenêtre, elle
// reste centrée ; sinon ses bords ne s'écartent pas des bords de la fenêtre (marge de 40 px)
function clampView() {
  if (ESSAI) { view.ox = (W - TW * view.s) / 2; view.oy = (H - TH * view.s) / 2; return; }   // (toute la carte, centrée, immobile)
  if (atelier.on) { // atelier : le carré ne sort pas de la fenêtre
    const half = atelierSide() / 2 * view.s;
    view.ox = Math.min(W - 40 + half, Math.max(40 - half, view.ox)); view.oy = Math.min(H - 40 + half, Math.max(40 - half, view.oy));
    return;
  }
  const M = 40, mw = TW * view.s, mh = TH * view.s;
  view.ox = mw + 2 * M <= W ? (W - mw) / 2 : Math.min(M, Math.max(W - M - mw, view.ox));
  view.oy = mh + 2 * M <= H ? (H - mh) / 2 : Math.min(M, Math.max(H - M - mh, view.oy));
  if (ZOOMS) { view.ox = Math.round(view.ox * dpr) / dpr; view.oy = Math.round(view.oy * dpr) / dpr; }   // (décalage en pixels entiers de l'écran : les tuiles tombent pile sur les pixels, donc nettes)
}
let zoomIdx = 0, zoomAnim = null, zoomPause = 0;
// un cran de zoom (dir : +1 plus près, −1 plus loin), centré sur (px, py) ; un cran au plus toutes les 220 ms (une molette qui défile ne saute pas tous les crans)
function zoomCran(px, py, dir) {
  const now = performance.now(); if (now < zoomPause) return;
  const cur = zoomAnim ? zoomIdx : zoomProche(view.s), idx = Math.max(0, Math.min(ZOOMS.length - 1, cur + dir));
  if (idx === cur && !zoomAnim) return;
  zoomIdx = idx; zoomPause = now + 220;
  const s0 = view.s, t0 = now, cible = ZOOMS[idx], id = zoomAnim = (zoomAnim || 0) + 1;
  const pas = t => {
    if (id !== zoomAnim) return;
    const u = Math.min(1, (t - t0) / 180), e = 1 - (1 - u) ** 3, ns = s0 * (cible / s0) ** e, k = ns / view.s;
    view.ox = px - (px - view.ox) * k; view.oy = py - (py - view.oy) * k; view.s = u < 1 ? ns : cible; clampView(); requestDraw();   // (arrivé : l'échelle est EXACTEMENT celle du cran)
    if (u < 1) requestAnimationFrame(pas); else zoomAnim = null;
  };
  requestAnimationFrame(pas);
}
function zoomAt(px, py, f) {
  if (ESSAI) return;
  if (ZOOMS) { if (f !== 1) zoomCran(px, py, f > 1 ? 1 : -1); return; }
  const ns = Math.min(60, Math.max(minScale(), view.s * f)), k = ns / view.s;
  view.ox = px - (px - view.ox) * k; view.oy = py - (py - view.oy) * k; view.s = ns;
  clampView();
  requestDraw();
}
function resize() {
  const r = wrap.getBoundingClientRect();
  dpr = window.devicePixelRatio || 1; W = r.width; H = r.height;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';   // taille d'affichage = taille de la zone, quelle que soit la densité de pixels (sinon le canevas est affiché à W×dpr pixels CSS et se décale du décor : zoom du navigateur, écrans mis à l'échelle)
  if (!fitted && W > 0) { fitted = true; if (atelier.on) fitAtelier(); else fitContent() }
  else if (W > 0) { view.s = Math.max(view.s, minScale()); clampView(); } // fenêtre redimensionnée
  requestDraw();
}
function readColors() {
  const cs = getComputedStyle(document.documentElement);
  for (const k of ['sheet','ground','ink','ink-soft','zone','zone-fill','zone-line','verge','house','house-edge','roof-line','earth','earth-edge','path','path-edge','gravel','gravel-edge','paving','paving-edge','wall','wall-edge','water','water-edge','bridge','grass','grass-dark','tree','tree-dark','bush','contour','f-meadow','f-wheat','f-plough','f-fallow','f-alfalfa','f-forest','parcel-edge','veil','stall-a','stall-b','tavern','church','ore-iron','ore-clay','f-field','f-pasture','sheep','accent','bad','shadow'])
    Col[k] = cs.getPropertyValue('--' + k).trim();
  makePatterns(); // les motifs de revêtement suivent le thème clair / sombre
  groundImg = null; markAllDirty(); // sol, végétation et tout le décor repeints avec les nouvelles couleurs
}
