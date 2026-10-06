/* ---------- décor en tuiles, affiché par la carte graphique (anti-lag) ----------
   Le décor (sol, relief, eau, grille des zones, routes, ponts, murailles, végétation,
   bâtiments) est peint par le code de dessin habituel dans des tuiles de 512 px, à la
   résolution du zoom (0,5 à 64 px par mètre). Les tuiles sont ensuite affichées par PixiJS
   (WebGL) : déplacer ou zoomer la vue ne repeint rien, la carte graphique ne fait que
   déplacer des images. Sans WebGL (ou dans l'éditeur de bâtiments), les mêmes tuiles sont
   recopiées sur le canevas.
   - Une construction, une coupe d'arbre… ne repeint que le rectangle touché, dans les tuiles
     concernées (markDirty) ; un changement de paysage ou de couleurs, toutes (markAllDirty).
   - Les tuiles manquantes ou à repeindre sont traitées quelques millisecondes par image ; en
     attendant, les tuiles de vue d'ensemble (0,5 px/m, toujours gardées) bouchent les trous.
   - Ce qui bouge (habitants, aperçu, tracés, sélection, graduations) est dessiné à chaque
     image par-dessus, sur le canevas transparent de la carte (voir draw). */
const TILE_PX = 512, TILE_LEVELS = [.5, 1, 2, 4, 8, 16, 32, 64], TILE_MAX = 220, TILE_MS = 8;
const tiles = new Map();                  // 'L:i:j' → { L, i, j, x0, y0, m, c, dirty:[rects], used, seen, spr }
const tileKey = (L, i, j) => L + ':' + i + ':' + j;
let tileClock = 0, tileFrame = 0;

/* ---- peinture d'un rectangle du terrain dans une image ----
   Le code de dessin de la carte dessine dans ctx, avec la vue (view, W, H) : on les remplace le
   temps de peindre l'image (même principe pour les vignettes des bâtiments). */
function paintWith(g, w, h, s, ox, oy, fn) {
  const keep = { ctx, W, H, dpr, s:view.s, ox:view.ox, oy:view.oy, sel, hover };
  ctx = g; W = w; H = h; dpr = 1; sel = null; hover = null;
  view.s = s; view.ox = ox; view.oy = oy;
  try { fn(); }
  finally { ctx = keep.ctx; W = keep.W; H = keep.H; dpr = keep.dpr; sel = keep.sel; hover = keep.hover; view.s = keep.s; view.ox = keep.ox; view.oy = keep.oy; }
}
// arbres et buissons proches d'un rectangle (index par seaux de 64 m, chaque seau du nord au sud)
let floraIdx = null;
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
// le décor de la vue courante (rectangle toW(0,0)…toW(W,H)), dans l'ordre des couches
function drawDecor() {
  const [x0, y0] = toW(0, 0), [x1, y1] = toW(W, H);
  ctx.fillStyle = Col.sheet; ctx.fillRect(0, 0, W, H);
  drawGround();
  drawSea();
  drawContours();
  drawWater();
  drawMouths();
  drawPlantesEau();                                             // nénuphars, roseaux et plantes de berge (sous les routes)
  drawDeposits();
  drawRoads();
  drawBridges();
  drawWalls();
  const list = floraNear(x0 - 40, y0 - 40, x1 + 40, y1 + 40);   // (houppiers et ombres qui débordent)
  drawWoods(ctx, list.filter(f => f.wood), view.s, view.ox, view.oy);
  for (const f of list) if (!f.wood) { const [X, Y] = toS(f.x, f.y); stampTree(ctx, f, X, Y, view.s); }
  drawZones();                                                  // (quadrillage noir par-dessus les arbres : il reste lisible en forêt)
  drawFruitiers();
  if (typeof drawRessources === 'function') drawRessources();   // (repères de la map test : par-dessus les arbres)
  drawBorder();
  const near = (o, m) => o.x > x0 - m && o.x < x1 + m && o.y > y0 - m && o.y < y1 + m;
  for (const g of S.gates) if (near(g, 20)) drawGate(g, 'normal');
  for (const h of S.houses) if (near(h, 40)) drawHouse(h, 'normal');
  for (const t of S.towers) if (near(t, 20)) drawTower(t, 'normal');
}
// repeint le rectangle r (m) d'une tuile
function paintTile(t, r) {
  const L = t.L, px0 = Math.max(0, Math.floor((r[0] - t.x0) * L)), py0 = Math.max(0, Math.floor((r[1] - t.y0) * L));
  const px1 = Math.min(TILE_PX, Math.ceil((r[2] - t.x0) * L)), py1 = Math.min(TILE_PX, Math.ceil((r[3] - t.y0) * L));
  if (px1 <= px0 || py1 <= py0) return;
  const g = t.c.getContext('2d');
  g.save(); g.setTransform(1, 0, 0, 1, px0, py0); g.beginPath(); g.rect(0, 0, px1 - px0, py1 - py0); g.clip();
  g.imageSmoothingEnabled = true;
  try { paintWith(g, px1 - px0, py1 - py0, L, -t.x0 * L - px0, -t.y0 * L - py0, drawDecor); }
  finally { g.restore(); }
  if (t.spr) t.spr.texture.baseTexture.update();          // la carte graphique reprend l'image
}
const tileRect = t => [t.x0, t.y0, t.x0 + t.m, t.y0 + t.m];
function newTile(L, i, j) {
  const m = TILE_PX / L, c = document.createElement('canvas'); c.width = c.height = TILE_PX;
  const t = { L, i, j, x0:i * m, y0:j * m, m, c, dirty:[], used:++tileClock, spr:null };
  paintTile(t, tileRect(t));
  tiles.set(tileKey(L, i, j), t);
  if (tiles.size > TILE_MAX) {                                   // on libère les moins récentes (jamais la vue d'ensemble)
    const old = [...tiles.values()].filter(o => o.L !== .5).sort((a, b) => a.used - b.used).slice(0, tiles.size - TILE_MAX);
    for (const o of old) dropTile(o);
  }
  return t;
}
function dropTile(t) {
  tiles.delete(tileKey(t.L, t.i, t.j));
  if (t.spr) { t.spr.destroy({ texture:true, baseTexture:true }); t.spr = null; }
}
// repeint les rectangles en attente d'une tuile (fusionnés s'ils sont nombreux)
function cleanTile(t) {
  if (!t.dirty.length) return;
  let list = t.dirty; t.dirty = [];
  if (list.length > 6) list = [list.reduce((a, r) => [Math.min(a[0], r[0]), Math.min(a[1], r[1]), Math.max(a[2], r[2]), Math.max(a[3], r[3])])];
  for (const r of list) paintTile(t, r);
}

/* ---- ce qui a changé ---- */
const hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
function markDirty(r) {
  touchScene();
  for (const t of tiles.values()) if (hit(r, tileRect(t))) {
    if (t.L === .5 || t.seen === tileFrame) t.dirty.push(r);  // vue d'ensemble, ou tuile affichée : repeinte bientôt
    else dropTile(t);                                           // hors de la vue : refaite quand on y reviendra
  }
  requestDraw();
}
function markAllDirty() { markDirty([-1e6, -1e6, 1e6, 1e6]); }
const invalidateTiles = (x, y, r) => markDirty([x - r, y - r, x + r, y + r]);
// après une modification du plan : on compare chaque ouvrage à son état précédent et on ne
// repeint qu'autour de ceux qui ont changé (les cases à bâtir d'une route vont jusqu'à 40 m)
let lastObjs = null, lastLand = null;
function sceneDiff() {
  const land = JSON.stringify([FORME_ID, S.landSeed, S.biome, S.reliefSeed, S.rivers.map(r => [r.pts.length, r.pts[0], r.w0, r.w1, r.isles]), S.lakes.map(l => [l.c, l.pts.length]), (S.deposits || []).map(d => [d.kind, d.c, d.r])]);
  const now = new Map(), box = new Map();
  const add = (k, o, pts, m) => { now.set(k, JSON.stringify(o)); const b = bbox(pts); box.set(k, [b[0] - m, b[1] - m, b[2] + m, b[3] + m]); };
  for (const h of S.houses) add('h' + h.id, h, corners(h), 24);
  for (const r of S.roads) add('r' + r.id, r, [...r.pts, ...smoothPts(r)], 48);
  for (const w of S.walls) add('w' + w.id, w, w.pts, 20);
  for (const t of S.towers) add('t' + t.id, t, [[t.x, t.y]], 20);
  for (const g of S.gates) add('g' + g.id, g, [[g.x, g.y]], 20);
  if (!lastObjs || land !== lastLand) markAllDirty();
  else {
    for (const [k, v] of now) if (lastObjs.get(k) !== v) { markDirty(box.get(k)); if (lastObjs.has(k)) markDirty(lastObjs.box.get(k)); }
    for (const k of lastObjs.keys()) if (!now.has(k)) markDirty(lastObjs.box.get(k));
  }
  now.box = box; lastObjs = now; lastLand = land;
}

/* ---- affichage : PixiJS (WebGL) si possible, sinon recopie sur le canevas ---- */
const GPU = (() => {
  if (typeof PIXI === 'undefined' || PAGE === 'batiments') return null;
  try {
    PIXI.settings.RESOLUTION = window.devicePixelRatio || 1;
    const renderer = PIXI.autoDetectRenderer({ width:1, height:1, autoDensity:true, antialias:false, backgroundAlpha:1, powerPreference:'high-performance' });
    if (!renderer.gl) { renderer.destroy(); return null; }
    const stage = new PIXI.Container(), world = new PIXI.Container(), base = new PIXI.Container(), cur = new PIXI.Container();
    world.addChild(base, cur); stage.addChild(world);
    renderer.view.setAttribute('aria-hidden', 'true');
    wrap.insertBefore(renderer.view, cv);                      // sous le canevas des éléments mobiles
    return { renderer, stage, world, base, cur };
  } catch (e) { console.warn('WebGL indisponible, affichage classique', e); return null; }
})();
function tileSprite(t, layer) {
  if (!t.spr) {
    t.spr = new PIXI.Sprite(PIXI.Texture.from(t.c));
    t.spr.position.set(t.x0, t.y0); t.spr.scale.set((TILE_PX + 1) / TILE_PX / t.L); // 1 texel de recouvrement : pas de fente entre tuiles (elle laissait voir la vue d'ensemble, plus sombre)
    layer.addChild(t.spr);
  }
  return t.spr;
}
// prépare et affiche le décor ; renvoie vrai s'il reste des tuiles à peindre (nouvelle image demandée)
function presentScene() {
  const t0 = performance.now(), over = () => performance.now() - t0 > TILE_MS;
  tileFrame++;
  const s = view.s, L = TILE_LEVELS.find(l => l >= s * dpr) || TILE_LEVELS[TILE_LEVELS.length - 1];
  // vue d'ensemble : toujours présente (peinte au premier affichage), repeinte en priorité
  const baseTiles = [];
  for (let j = 0; j * TILE_PX / .5 < TH; j++) for (let i = 0; i * TILE_PX / .5 < TW; i++) baseTiles.push(tiles.get(tileKey(.5, i, j)) || newTile(.5, i, j));
  let pending = false;
  for (const t of baseTiles) { if (t.dirty.length && !over()) cleanTile(t); if (t.dirty.length) pending = true; }
  // tuiles visibles au niveau du zoom
  const m = TILE_PX / L, [wx0, wy0] = toW(0, 0), [wx1, wy1] = toW(W, H), shown = [];
  if (L !== .5) {
    const i0 = Math.max(0, Math.floor(wx0 / m)), i1 = Math.min(Math.ceil(TW / m) - 1, Math.floor(wx1 / m));
    const j0 = Math.max(0, Math.floor(wy0 / m)), j1 = Math.min(Math.ceil(TH / m) - 1, Math.floor(wy1 / m));
    // du centre vers les bords : ce qu'on regarde arrive en premier
    const want = [];
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) want.push([i, j]);
    const ci = (wx0 + wx1) / 2 / m, cj = (wy0 + wy1) / 2 / m;
    want.sort((a, b) => (a[0] + .5 - ci) ** 2 + (a[1] + .5 - cj) ** 2 - ((b[0] + .5 - ci) ** 2 + (b[1] + .5 - cj) ** 2));
    let painted = false;
    for (const [i, j] of want) {
      let t = tiles.get(tileKey(L, i, j));
      if (!t && (!painted || !over())) { t = newTile(L, i, j); painted = true; }
      if (!t) { pending = true; continue; }
      if (t.dirty.length) { if (!over()) cleanTile(t); if (t.dirty.length) pending = true; }
      t.used = ++tileClock; t.seen = tileFrame; shown.push(t);
    }
  }
  if (GPU) {
    const { renderer, stage, world, base, cur } = GPU;
    if (renderer.width !== Math.round(W * dpr) || renderer.height !== Math.round(H * dpr)) renderer.resize(W, H);
    const bg = PIXI.utils.string2hex(Col.sheet || '#f5f7f2'); if (renderer.background.color !== bg) renderer.background.color = bg;
    for (const t of baseTiles) tileSprite(t, base);
    for (const c of cur.children) c.visible = false;
    for (const t of shown) tileSprite(t, cur).visible = true;
    world.scale.set(s); world.position.set(view.ox, view.oy);
    renderer.render(stage);
    ctx.clearRect(0, 0, W, H);                                  // le canevas du dessus ne garde que ce qui bouge
  } else {
    ctx.fillStyle = Col.sheet; ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    const put = t => ctx.drawImage(t.c, t.x0 * s + view.ox, t.y0 * s + view.oy, t.m * s + .6, t.m * s + .6);
    baseTiles.forEach(put); shown.forEach(put);
  }
  return pending;
}
