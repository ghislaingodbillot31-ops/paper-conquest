/* ---------- dessin ---------- */
let queued = false;
function requestDraw() { if (!queued) { queued = true; requestAnimationFrame(draw); } }
/* Version du décor (sol, eau, routes, végétation, bâtiments…) : le décor dessiné est gardé en
   mémoire et seulement recopié tant qu'il ne change pas (voir draw). Toute modification du
   décor appelle touchScene() ; la vue, la sélection et les options font partie de la clé. */
let sceneV = 0;
const touchScene = () => { sceneV++; };
function polyPath(pts) {
  ctx.beginPath();
  pts.forEach((p, i) => { const [X, Y] = toS(p[0], p[1]); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
}
function strokeLine(pts, lw, color) {
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'square'; ctx.lineJoin = 'miter'; ctx.miterLimit = 3;
  polyPath(pts); ctx.stroke();
}
function haloText(t, x, y, color, halo) {
  ctx.lineWidth = 3; ctx.strokeStyle = halo; ctx.lineJoin = 'round'; ctx.strokeText(t, x, y);
  ctx.fillStyle = color; ctx.fillText(t, x, y);
}
const fmt = (v, d = 1) => v.toLocaleString('fr-FR', { maximumFractionDigits:d });

function drawZones(highlight) {
  if (!opts.grid) return; // quadrillage masqué (les cases restent actives)
  const s = view.s, inset = Math.min(.6, 1.2 / s * 1.5);
  ctx.fillStyle = Col['zone-fill']; ctx.strokeStyle = Col['zone-line']; ctx.lineWidth = 1;
  ctx.beginPath();
  const [wx0, wy0] = toW(0, 0), [wx1, wy1] = toW(W, H);
  for (const c of Z.cells) {
    if (c.occ !== null || c.bb[2] < wx0 || c.bb[0] > wx1 || c.bb[3] < wy0 || c.bb[1] > wy1) continue;
    const g = c.geo, s0 = g.off + c.i*CELL + inset, t0 = g.t0 + c.j*CELL + inset, e = CELL - 2*inset;
    const q = [g.P(s0, t0), g.P(s0+e, t0), g.P(s0+e, t0+e), g.P(s0, t0+e)].map(p => toS(p[0], p[1]));
    ctx.moveTo(...q[0]); ctx.lineTo(...q[1]); ctx.lineTo(...q[2]); ctx.lineTo(...q[3]); ctx.closePath();
  }
  ctx.fill(); ctx.stroke();
}
function drawHouse(h, mode) {
  const s = view.s, C = corners(h);
  if ((mode === 'normal' || mode === 'selected' || mode === 'hover') && !buildingOf(h)) { // les bâtiments du catalogue dessinent leurs propres ombres
    ctx.fillStyle = Col.shadow; ctx.beginPath();
    C.forEach((p, i) => { const X = (p[0] + .8) * s + view.ox, Y = (p[1] + .8) * s + view.oy; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.closePath(); ctx.fill();
  }
  polyPath(C); ctx.closePath();
  if (mode === 'ghost' || mode === 'bad') {
    ctx.globalAlpha = .45; ctx.fillStyle = mode === 'bad' ? Col.bad : Col.accent; ctx.fill(); ctx.globalAlpha = 1;
    ctx.setLineDash([5, 4]); ctx.strokeStyle = mode === 'bad' ? Col.bad : Col.accent; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
  } else if (BUILD_DRAW[h.kind]) {
    BUILD_DRAW[h.kind](h); // dessin propre au bâtiment (façade côté rue)
  } else {
    ctx.fillStyle = Col.house; ctx.fill();
    ctx.strokeStyle = Col['house-edge']; ctx.lineWidth = 1.2; ctx.stroke();
  }
  // rayon d'action (puits : eau ; ressources : zone de travail) à l'aperçu et à la sélection
  const bk = buildingOf(h);
  // portée du puits (fixe, autour du puits) à l'aperçu et à la sélection
  if (bk && bk.radius && !bk.zone && mode !== 'normal') {
    const [X, Y] = toS(h.x, h.y);
    ctx.beginPath(); ctx.arc(X, Y, bk.radius * s, 0, Math.PI * 2);
    ctx.setLineDash([6, 6]); ctx.strokeStyle = Col['water-edge']; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = .08; ctx.fillStyle = Col.water; ctx.fill(); ctx.globalAlpha = 1;
  }
  // bâtiment posé dont la zone de travail reste à définir : pastille « ! »
  if (bk && bk.zone && !h.zone && h.id !== -1 && (mode === 'normal' || mode === 'selected' || mode === 'hover') && s > .6) {
    const [X, Y] = toS(h.x, h.y), r = Math.max(6, 2.5 * s);
    ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2); ctx.fillStyle = Col.bad; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(r * 1.4)}px "Barlow Condensed", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', X, Y + 1);
  }
  if (!BUILD_DRAW[h.kind] && Math.min(h.w, h.l) * s > 9) {
    const { w, l } = h;
    let r1, r2;
    if (l >= w) { r1 = [0, -(l - w) / 2]; r2 = [0, (l - w) / 2]; }
    else        { r1 = [-(w - l) / 2, 0]; r2 = [(w - l) / 2, 0]; }
    const k = [[-w/2,-l/2],[w/2,-l/2],[w/2,l/2],[-w/2,l/2]];
    const near = c => (l >= w ? (c[1] < 0 ? r1 : r2) : (c[0] < 0 ? r1 : r2));
    const R1 = toS(...local(h, ...r1)), R2 = toS(...local(h, ...r2));
    ctx.strokeStyle = Col['roof-line']; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(...R1); ctx.lineTo(...R2);
    for (const c of k) { const P = toS(...local(h, ...c)), N = near(c) === r1 ? R1 : R2; ctx.moveTo(...P); ctx.lineTo(...N); }
    ctx.stroke();
  }
  if (mode === 'selected' || mode === 'hover') {
    polyPath(C); ctx.closePath();
    ctx.strokeStyle = Col.accent; ctx.lineWidth = mode === 'selected' ? 2.5 : 1.5; ctx.stroke();
  }
  if (mode === 'selected' || mode === 'ghost' || mode === 'bad') {
    const top = Math.min(...C.map(p => p[1])), [X] = toS(h.x, h.y);
    ctx.font = '500 11px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    const name = h.type && buildingOf(h) ? `${h.type} · ` : '';
    haloText(`${name}${h.f} × ${h.d} cases`, X, top * s + view.oy - 6, mode === 'bad' ? Col.bad : Col.ink, Col.sheet);
  }
}
