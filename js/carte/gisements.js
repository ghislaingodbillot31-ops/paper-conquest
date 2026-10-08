/* ---------- gisements de minerai ----------
   Les 9 gisements du jeu (MINERALS, js/jeu/ressources.js) : fer, sel, cuivre, plomb, étain, alun, argent, or, ambre.
   Pour le moment (carte d'essai) chacun est posé une fois, dans une case d'une grille 3 × 3 de la carte, à l'écart de l'eau, des routes, de la mer
   et des autres gisements. Un gisement : { kind, c:[x, y], r (rayon en m, petit : 14 à 22), pts (contour), seed } ; peint comme une petite zone de terre parsemée de pépites
   de minerai (drawDeposits, appelé par drawDecor). La fosse minière se pose dessus (placeSurGisement, zonage.js). */
const GISEMENTS = {
  pierre:  { nom:'Carrière de pierre',    couleur:'#8f8a80', clair:'#c4bfb2', roche:['#a8a399', '#6d6a62'] },
  silex:   { nom:'Silex',                 couleur:'#6b665c', clair:'#a39d8e', roche:['#8d877a', '#4d4a43'] },
  fer:     { nom:'Fer',                   couleur:'#9c4a2e', clair:'#c9754f', roche:['#a8806a', '#6e4a3c'] },
  sel:     { nom:'Sel',                   couleur:'#e8e4da', clair:'#ffffff', roche:['#f0ede6', '#b9b4a6'] },
  cuivre:  { nom:'Cuivre',                couleur:'#2f9a8a', clair:'#c7783c', roche:['#9c8a76', '#5f5246'] },
  plomb:   { nom:'Plomb',                 couleur:'#5d6874', clair:'#8f9aa6', roche:['#8a929c', '#525a64'] },
  etain:   { nom:'Étain',                 couleur:'#9fa9aa', clair:'#d3dadb', roche:['#aeb5b6', '#6f7778'] },
  alun:    { nom:'Alun',                  couleur:'#d8cfae', clair:'#f2ecd2', roche:['#e2dabb', '#a79f80'] },
  argent:  { nom:'Argent',                couleur:'#b7bfc7', clair:'#f0f3f6', roche:['#b9bfc6', '#7a828b'] },
  or:      { nom:'Minerai d’or',          couleur:'#d9a521', clair:'#ffe27a', roche:['#a89a82', '#6d604b'] },
  ambre:   { nom:'Ambre de la Baltique',  couleur:'#d6861a', clair:'#ffc861', roche:['#a8895c', '#6e5638'] },
};
// pose les gisements (une fois chacun) ; à appeler quand la carte (routes, eau) est calculée
function placeDeposits(seed, kinds = [...Object.keys(GISEMENTS), 'silex', 'silex', 'pierre'], out = []) {   // (le silex : trois gisements ; la carrière de pierre : deux)                  // (out : les gisements déjà posés, à éviter ; kinds : ceux à ajouter)
  const rnd = seeded(seed * 17 + 3), M = 160;
  const cw = (TW - 2 * M) / 3, ch = (TH - 2 * M) / 3, cells = kinds.map((_, i) => i % 9);
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }   // chaque gisement dans une case au hasard
  const water = [...(Z.water.river || []), ...(Z.water.lake || [])], fz = forestNoise(), B = biomeOf().flora;
  const libre = (c, r) => {
    const R = r * 1.3 + 12;
    for (let k = 0; k < 9; k++) { const q = k < 8 ? [c[0] + Math.cos(k * Math.PI / 4) * R, c[1] + Math.sin(k * Math.PI / 4) * R] : c; if (fz(q[0], q[1]) > B.forest - .004) return false; }   // (jamais dans ni sous une forêt)
    if (c[0] < M / 2 || c[1] < M / 2 || c[0] > TW - M / 2 || c[1] > TH - M / 2) return false;
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, q = [c[0] + Math.cos(a) * R, c[1] + Math.sin(a) * R]; if (!dansRegion(q) || !surTerre(q)) return false; }
    if (!dansRegion(c) || distToRoads(c) < R + 15) return false;
    if (water.length && hitsAny([[c[0] - R, c[1] - R], [c[0] + R, c[1] - R], [c[0] + R, c[1] + R], [c[0] - R, c[1] + R]], water)) return false;
    return out.every(o => segLen(o.c, c) > o.r + r + 40);
  };
  kinds.forEach((kind, i) => {
    const x0 = M + (cells[i] % 3) * cw, y0 = M + Math.floor(cells[i] / 3) * ch;
    for (let t = 0; t < 120; t++) {
      // la case d'abord, puis (si elle est occupée par l'eau, la mer…) toute la carte
      const c = t < 60 ? [round2(x0 + rnd() * cw), round2(y0 + rnd() * ch)] : [round2(M + rnd() * (TW - 2 * M)), round2(M + rnd() * (TH - 2 * M))], r = Math.round(14 + rnd() * 8);
      if (!libre(c, r)) continue;
      const p1 = rnd() * 6.28, p2 = rnd() * 6.28, pts = [];
      for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2, rr = r * (1 + .22 * Math.sin(3 * a + p1) + .1 * Math.sin(5 * a + p2)); pts.push([round2(c[0] + Math.cos(a) * rr), round2(c[1] + Math.sin(a) * rr)]); }
      out.push({ kind, c, r, pts, seed:Math.floor(rnd() * 1e6) });
      break;
    }
  });
  return out;
}
// le gisement sur lequel est posé un bâtiment (son centre dans la zone), ou null
const gisementSous = h => (S.deposits || []).find(d => segLen(d.c, [h.x, h.y]) <= d.r) || null;
// contour irrégulier d'une zone de rayon r autour de c
function contourGisement(c, r, ph1, ph2) {
  const pts = [];
  for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2, rr = r * (1 + .22 * Math.sin(3 * a + ph1) + .1 * Math.sin(5 * a + ph2)); pts.push([round2(c[0] + Math.cos(a) * rr), round2(c[1] + Math.sin(a) * rr)]); }
  return pts;
}
// les gisements d'avant (grands affleurements de 60 à 110 m) sont réduits à une petite zone
function reduireGisement(d) {
  if (d.r <= 30) return d;
  d.r = 14 + (d.seed || 0) % 9; d.pts = contourGisement(d.c, d.r, (d.seed || 0) % 7, (d.seed || 0) % 5);
  return d;
}
/* Pépites : de petits grains de minerai espacés dans la zone, toujours les mêmes (graine du gisement). Le mineur de la fosse va les chercher. */
const pepitesCache = new Map();
function pepitesDe(d) {
  const key = d.seed + ':' + d.r, hit = pepitesCache.get(key); if (hit) return hit;
  const rnd = seeded(d.seed), n = Math.max(8, Math.round(d.r * d.r / 22)), out = [];
  for (let t = 0; t < n * 12 && out.length < n; t++) {
    const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * d.r * .9, x = d.c[0] + Math.cos(a) * rr, y = d.c[1] + Math.sin(a) * rr, s = .35 + rnd() * .5;
    if (out.some(o => Math.hypot(o.x - x, o.y - y) < (o.s + s) * 2.2)) continue;
    out.push({ x:round2(x), y:round2(y), s, rot:rnd() * 3, v:rnd() });
  }
  pepitesCache.set(key, out); return out;
}
function drawDeposits() {
  const list = S.deposits || [], s = view.s, [wx0, wy0] = toW(0, 0), [wx1, wy1] = toW(W, H);
  for (const d of list) {
    if (d.c[0] + d.r * 1.3 < wx0 || d.c[0] - d.r * 1.3 > wx1 || d.c[1] + d.r * 1.3 < wy0 || d.c[1] - d.r * 1.3 > wy1) continue;
    const g = GISEMENTS[d.kind]; if (!g) continue;
    ctx.lineJoin = 'round';
    ctx.beginPath(); d.pts.forEach((p, i) => { const [X, Y] = toS(p[0], p[1]); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath();   // la zone : une tache de terre foncée
    ctx.fillStyle = 'rgba(96,74,46,.26)'; ctx.fill(); ctx.strokeStyle = 'rgba(96,74,46,.45)'; ctx.lineWidth = Math.max(.8, s * .12); ctx.setLineDash([s * .8, s * .6]); ctx.stroke(); ctx.setLineDash([]);
    for (const p of pepitesDe(d)) {
      const [X, Y] = toS(p.x, p.y), q = Math.max(p.s * s, 2), lw = Math.max(.7, Math.min(1.5, q * .16));
      ctx.beginPath(); ctx.ellipse(X + q * .25, Y + q * .5, q * .95, q * .4, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(30,26,20,.28)'; ctx.fill();
      ctx.beginPath(); for (let k = 0; k < 6; k++) { const an = p.rot + k * Math.PI / 3, r2 = q * (.8 + .3 * Math.sin(k * 2.3 + p.v * 9)); k ? ctx.lineTo(X + Math.cos(an) * r2, Y + Math.sin(an) * r2 * .85) : ctx.moveTo(X + Math.cos(an) * r2, Y + Math.sin(an) * r2 * .85); }
      ctx.closePath(); ctx.fillStyle = g.couleur; ctx.fill(); ctx.strokeStyle = 'rgba(35,38,48,.75)'; ctx.lineWidth = lw; ctx.stroke();
      if (q > 3) { ctx.beginPath(); ctx.ellipse(X - q * .22, Y - q * .28, q * .34, q * .24, 0, 0, Math.PI * 2); ctx.fillStyle = g.clair; ctx.fill(); }
    }
    ctx.font = '600 18px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const [X, Y] = toS(d.c[0], d.c[1] - d.r * 1.15); haloText(g.nom, X, Y, Col.ink, Col.sheet);
  }
}
// cartes déjà créées : un gisement de silex est ajouté s'il n'y en a pas (hors carte d'essai, qui pose elle-même ses gisements)
setTimeout(() => { try {
  if (typeof PAGE !== 'undefined' && PAGE === 'batiments') return;
  const nPierre = (S.deposits || []).filter(d => d.kind === 'pierre').length;
  if (S.deposits && S.deposits.length && nPierre < 2) { const n = S.deposits.length; S.deposits = placeDeposits(S.landSeed || 1, Array(2 - nPierre).fill('pierre'), S.deposits); if (S.deposits.length > n) { if (typeof touchScene === 'function') touchScene(); if (typeof markAllDirty === 'function') markAllDirty(); save(); if (typeof requestDraw === 'function') requestDraw(); } }   // (cartes déjà créées : deux carrières de pierre)
  const nSilex = (S.deposits || []).filter(d => d.kind === 'silex').length;
  if (S.deposits && S.deposits.length && nSilex < 3) {
    const n = S.deposits.length; S.deposits = placeDeposits(S.landSeed || 1, Array(3 - nSilex).fill('silex'), S.deposits);
    if (S.deposits.length > n) { if (typeof touchScene === 'function') touchScene(); if (typeof markAllDirty === 'function') markAllDirty(); save(); if (typeof requestDraw === 'function') requestDraw(); }
  }
} catch (e) {} }, 2500);
