/* ---------- gisements de minerai ----------
   Les 9 gisements du jeu (MINERALS, js/jeu/ressources.js) : fer, sel, cuivre, plomb, étain, alun, argent, or, ambre.
   Pour le moment (carte d'essai) chacun est posé une fois, dans une case d'une grille 3 × 3 de la carte, à l'écart de l'eau, des routes, de la mer
   et des autres gisements. Un gisement : { kind, c:[x, y], r (rayon en m), pts (contour), seed } ; peint comme un affleurement de roche
   parsemé de blocs de minerai (drawDeposits, appelé par drawDecor). */
const GISEMENTS = {
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
function placeDeposits(seed) {
  const rnd = seeded(seed * 17 + 3), kinds = Object.keys(GISEMENTS), out = [], M = 160;
  const cw = (TW - 2 * M) / 3, ch = (TH - 2 * M) / 3, cells = kinds.map((_, i) => i);
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }   // chaque gisement dans une case au hasard
  const water = [...(Z.water.river || []), ...(Z.water.lake || [])];
  const libre = (c, r) => {
    const R = r * 1.3 + 12;
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
      const c = t < 60 ? [round2(x0 + rnd() * cw), round2(y0 + rnd() * ch)] : [round2(M + rnd() * (TW - 2 * M)), round2(M + rnd() * (TH - 2 * M))], r = Math.round(60 + rnd() * 50);
      if (!libre(c, r)) continue;
      const p1 = rnd() * 6.28, p2 = rnd() * 6.28, pts = [];
      for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2, rr = r * (1 + .22 * Math.sin(3 * a + p1) + .1 * Math.sin(5 * a + p2)); pts.push([round2(c[0] + Math.cos(a) * rr), round2(c[1] + Math.sin(a) * rr)]); }
      out.push({ kind, c, r, pts, seed:Math.floor(rnd() * 1e6) });
      break;
    }
  });
  return out;
}
/* Un gisement se peint comme un chaos de pierres : de grosses roches à facettes (une face claire dessus, une face sombre dessous, contour sombre, ombre
   au sol), des cailloux, des blocs empilés, bien espacés, ornés de quelques cristaux de minerai (posés sur la face claire) ; quelques roches prennent la teinte du
   minerai. Les pierres viennent de la graine du gisement (toujours les mêmes) ; leur forme est calculée une fois par gisement. */
const rochesCache = new Map();
function rochesDe(d) {
  const key = d.seed + ':' + d.r, hit = rochesCache.get(key); if (hit) return hit;
  const rnd = seeded(d.seed), g = GISEMENTS[d.kind], rocks = [], n = Math.round(d.r * d.r / 170);
  const mix = (a, b, t) => '#' + [1, 3, 5].map(k => Math.round(parseInt(a.substr(k, 2), 16) * (1 - t) + parseInt(b.substr(k, 2), 16) * t).toString(16).padStart(2, '0')).join('');
  for (let t = 0; t < n * 12 && rocks.length < n; t++) {
    const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * d.r * .92, u = rnd();
    const size = u < .16 ? 10 + rnd() * 6 : u < .5 ? 5 + rnd() * 4 : 1.8 + rnd() * 2.6;            // grosses roches, moyennes, cailloux
    const x = d.c[0] + Math.cos(a) * rr, y = d.c[1] + Math.sin(a) * rr;
    if (rocks.some(o => Math.hypot(o.x - x, o.y - y) < (o.size + size) * 1.15)) continue;           // bien espacées
    const k = 5 + Math.floor(rnd() * 3), hy = .6 + rnd() * .45, V = [];
    for (let j = 0; j < k; j++) { const an = (j + rnd() * .5) / k * Math.PI * 2, rv = .72 + rnd() * .28; V.push([Math.cos(an) * rv, Math.sin(an) * rv * hy - .12]); }
    let li = 0, ri = 0; V.forEach((v, j) => { if (v[0] < V[li][0]) li = j; if (v[0] > V[ri][0]) ri = j; });
    const walk = (from, to) => { const o = [V[from]]; for (let j = from; j !== to;) { j = (j + 1) % k; o.push(V[j]); } return o; };
    let haut = walk(li, ri), bas = walk(ri, li);
    if (haut.reduce((s2, v) => s2 + v[1], 0) / haut.length > bas.reduce((s2, v) => s2 + v[1], 0) / bas.length) [haut, bas] = [bas, haut];   // la face du haut est la plus claire
    let pal = g.roche;                                                                                // roche et minerai : couleurs fixes pour chaque minerai
    if (rnd() < .18) pal = [mix(g.couleur, '#ffffff', .15), mix(g.couleur, '#000000', .35)];          // une roche teintée du minerai
    const eclats = [], ne = size < 5 ? 0 : size < 9 ? 1 : 2 + Math.floor(rnd() * 2);                  // quelques cristaux, posés sur la face claire (jamais en dehors)
    const cen = [haut.reduce((q, v) => q + v[0], 0) / haut.length, haut.reduce((q, v) => q + v[1], 0) / haut.length];
    const dedans = p => { let in2 = false; for (let i = 0, j = haut.length - 1; i < haut.length; j = i++) { const A = haut[i], B = haut[j]; if ((A[1] > p[1]) !== (B[1] > p[1]) && p[0] < (B[0] - A[0]) * (p[1] - A[1]) / (B[1] - A[1]) + A[0]) in2 = !in2; } return in2; };
    for (let j = 0, tries = 0; j < ne && tries < 40; tries++) {
      const p = [cen[0] + (rnd() - .5) * 1.4, cen[1] + (rnd() - .5) * 1.0], er = .17 + rnd() * .1;
      if (!dedans([cen[0] + (p[0] - cen[0]) / .55, cen[1] + (p[1] - cen[1]) / .55]) || eclats.some(e => Math.hypot(e[0] - p[0], e[1] - p[1]) < (e[2] + er) * 1.6)) continue;
      eclats.push([p[0], p[1], er]); j++;
    }
    rocks.push({ x, y, size, haut, bas, clair:pal[0], sombre:pal[1], eclats, fissure:size > 5 && rnd() < .6 });
  }
  rocks.sort((p, q) => p.y - q.y);                                                                   // du nord au sud : les plus au sud recouvrent
  const res = { rocks }; rochesCache.set(key, res); return res;
}
function drawDeposits() {
  const list = S.deposits || [], s = view.s, [wx0, wy0] = toW(0, 0), [wx1, wy1] = toW(W, H), mini = 3.4 / s;   // (à grande distance, une pierre ne descend pas sous ~3 px)
  for (const d of list) {
    if (d.c[0] + d.r * 1.3 < wx0 || d.c[0] - d.r * 1.3 > wx1 || d.c[1] + d.r * 1.3 < wy0 || d.c[1] - d.r * 1.3 > wy1) continue;
    const g = GISEMENTS[d.kind]; if (!g) continue;
    const { rocks } = rochesDe(d), path = (pts, x, y, z) => { pts.forEach((v, i) => { const [X, Y] = toS(x + v[0] * z, y + v[1] * z); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); };
    ctx.lineJoin = 'round';
    for (const o of rocks) {                                                                         // ombres au sol
      const z = Math.max(o.size, mini), [X, Y] = toS(o.x + z * .18, o.y + z * .34);
      ctx.beginPath(); ctx.ellipse(X, Y, z * s * .95, z * s * .42, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(30,26,20,.28)'; ctx.fill();
    }
    for (const o of rocks) {
      const z = Math.max(o.size, mini), lw = Math.max(.8, Math.min(1.8, z * s * .09));
      ctx.beginPath(); path(o.bas, o.x, o.y, z); ctx.closePath(); ctx.fillStyle = o.sombre; ctx.fill();   // face sombre
      ctx.beginPath(); path(o.haut, o.x, o.y, z); ctx.closePath(); ctx.fillStyle = o.clair; ctx.fill();   // face claire
      ctx.beginPath(); path(o.haut.concat(o.bas), o.x, o.y, z); ctx.closePath(); ctx.strokeStyle = 'rgba(35,38,48,.75)'; ctx.lineWidth = lw; ctx.stroke();
      if (z * s < 4) continue;                                                                       // trop petit pour les détails
      if (o.fissure) { const [X1, Y1] = toS(o.x - z * .3, o.y - z * .1), [X2, Y2] = toS(o.x + z * .05, o.y + z * .25); ctx.beginPath(); ctx.moveTo(X1, Y1); ctx.lineTo((X1 + X2) / 2 + 2, (Y1 + Y2) / 2 - 1); ctx.lineTo(X2, Y2); ctx.strokeStyle = 'rgba(35,38,48,.55)'; ctx.lineWidth = Math.max(.8, lw * .7); ctx.stroke(); }
      for (const [ex, ey, er] of o.eclats) {                                                         // cristaux de minerai : losange à deux faces
        const [X, Y] = toS(o.x + ex * z, o.y + ey * z), w = Math.max(1.6, er * z * s), h = w * 1.35;
        ctx.beginPath(); ctx.moveTo(X, Y - h); ctx.lineTo(X - w, Y); ctx.lineTo(X, Y + h * .7); ctx.closePath(); ctx.fillStyle = g.clair; ctx.fill();
        ctx.beginPath(); ctx.moveTo(X, Y - h); ctx.lineTo(X + w, Y); ctx.lineTo(X, Y + h * .7); ctx.closePath(); ctx.fillStyle = g.couleur; ctx.fill();
        ctx.beginPath(); ctx.moveTo(X, Y - h); ctx.lineTo(X + w, Y); ctx.lineTo(X, Y + h * .7); ctx.lineTo(X - w, Y); ctx.closePath(); ctx.strokeStyle = 'rgba(35,38,48,.7)'; ctx.lineWidth = Math.max(.7, lw * .6); ctx.stroke();
      }
    }
    { ctx.font = '600 18px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const [X, Y] = toS(d.c[0], d.c[1] - d.r * .75); haloText(g.nom, X, Y, Col.ink, Col.sheet); }
  }
}
