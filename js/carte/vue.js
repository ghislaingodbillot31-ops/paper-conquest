/* ---------- vue ---------- */
const cv = document.getElementById('plan'), ctx = cv.getContext('2d'), wrap = document.getElementById('wrap');
let W = 0, H = 0, dpr = 1, Col = {}, fitted = false;
const view = { s:4, ox:0, oy:0 };
const toS = (x, y) => [x*view.s + view.ox, y*view.s + view.oy];
const toW = (px, py) => [(px - view.ox) / view.s, (py - view.oy) / view.s];
// cadre la vue sur un rectangle du terrain (par défaut, tout le terrain)
function fit(box = [0, 0, TW, TH]) {
  const bw = box[2] - box[0], bh = box[3] - box[1];
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
const minScale = () => atelier.on ? Math.min((W - 60), (H - 60)) / atelierSide() * .5 : Math.max(.05, Math.min((W - 90) / TW, (H - 70) / TH));
// la carte ne peut pas sortir de la fenêtre : si elle est plus petite que la fenêtre, elle
// reste centrée ; sinon ses bords ne s'écartent pas des bords de la fenêtre (marge de 40 px)
function clampView() {
  if (atelier.on) { // atelier : le carré ne sort pas de la fenêtre
    const half = atelierSide() / 2 * view.s;
    view.ox = Math.min(W - 40 + half, Math.max(40 - half, view.ox)); view.oy = Math.min(H - 40 + half, Math.max(40 - half, view.oy));
    return;
  }
  const M = 40, mw = TW * view.s, mh = TH * view.s;
  view.ox = mw + 2 * M <= W ? (W - mw) / 2 : Math.min(M, Math.max(W - M - mw, view.ox));
  view.oy = mh + 2 * M <= H ? (H - mh) / 2 : Math.min(M, Math.max(H - M - mh, view.oy));
}
function zoomAt(px, py, f) {
  const ns = Math.min(60, Math.max(minScale(), view.s * f)), k = ns / view.s;
  view.ox = px - (px - view.ox) * k; view.oy = py - (py - view.oy) * k; view.s = ns;
  clampView();
  requestDraw();
}
function resize() {
  const r = wrap.getBoundingClientRect();
  dpr = window.devicePixelRatio || 1; W = r.width; H = r.height;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  if (!fitted && W > 0) { fitted = true; if (atelier.on) fitAtelier(); else fitContent(); }
  else if (W > 0) { view.s = Math.max(view.s, minScale()); clampView(); } // fenêtre redimensionnée
  requestDraw();
}
function readColors() {
  const cs = getComputedStyle(document.documentElement);
  for (const k of ['sheet','ground','ink','ink-soft','zone','zone-fill','zone-line','verge','house','house-edge','roof-line','earth','earth-edge','gravel','gravel-edge','paving','paving-edge','wall','wall-edge','water','water-edge','bridge','grass','grass-dark','tree','tree-dark','bush','contour','f-meadow','f-wheat','f-plough','f-fallow','f-alfalfa','f-forest','parcel-edge','veil','stall-a','stall-b','tavern','church','ore-iron','ore-clay','f-field','f-pasture','sheep','accent','bad','shadow'])
    Col[k] = cs.getPropertyValue('--' + k).trim();
  makePatterns(); // les motifs de revêtement suivent le thème clair / sombre
  groundImg = null; floraImg = null; tiles.clear(); touchScene(); // sol et végétation repeints avec les nouvelles couleurs
}
