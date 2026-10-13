/* ---------- fortifications, style peint (vues strictement de dessus) ----------
   Trois niveaux, sur la même emprise (une case de 8 m) : 1 · palissade de rondins pointus ;
   2 · mur de bois à chemin de ronde (passerelle de planches entre deux rangs de pieux) ;
   3 · muraille de pierre (parapets crénelés, chemin de ronde dallé). Les tours et les portes
   ont les mêmes trois niveaux. Un ouvrage neuf est une palissade ; on l'améliore depuis sa fiche. */
const FORT_LEVELS = {
  wall:  ['Palissade de rondins', 'Mur de bois à chemin de ronde', 'Muraille de pierre'],
  tower: ['Tour de guet en bois', 'Tour de bois', 'Tour de pierre'],
  gate:  ['Porte de palissade', 'Porte fortifiée en bois', 'Châtelet de pierre'],
};
const lvlOf = o => o.lvl || 3;                                   // (ouvrages des anciens plans : en pierre)
const FORT = { stone:'#a39c8f', cap:'#c6bfb0', walk:'#958e81', crenel:'#6f695f', edge:'#3f3a32', flag:'rgba(60,54,46,.35)', shadow:'rgba(40,34,24,.3)',
  log:'#7a5a38', logHi:'#9c7a52', logLo:'#5a4028', plank:'#a8845a', plankLine:'rgba(70,50,30,.45)', berm:'#b9a47d' };
// repère local d'un tronçon (comme un bâtiment : u le long, t en travers de 0 à l)
const segFrame = (a, b, l) => ({ x:(a[0] + b[0]) / 2, y:(a[1] + b[1]) / 2, a:Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI, w:segLen(a, b), l, front:1 });
// toit conique vu de dessus, en coordonnées écran : pans rayonnants teintés selon la lumière du nord-ouest
function coneS(X, Y, R, hi, lo, s) {
  const N = 28;
  for (let i = 0; i < N; i++) {
    const a0 = i / N * Math.PI * 2, a1 = (i + 1) / N * Math.PI * 2, am = (a0 + a1) / 2, k = (1 + (Math.cos(am) + Math.sin(am)) / Math.SQRT2) / 2;
    ctx.beginPath(); ctx.moveTo(X, Y); ctx.arc(X, Y, R, a0, a1 + .01); ctx.closePath();
    ctx.fillStyle = `rgb(${hi.map((v, j) => Math.round(v + (lo[j] - v) * k)).join(',')})`; ctx.fill();
  }
  if (s > 1.4 && R > 8) { ctx.strokeStyle = 'rgba(30,34,38,.35)'; ctx.lineWidth = 1; ctx.beginPath(); for (let r = R * .25; r < R; r += .5 * s) { ctx.moveTo(X + r, Y); ctx.arc(X, Y, r, 0, Math.PI * 2); } ctx.stroke(); } // rangs d'ardoises
  ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2); ctx.strokeStyle = FORT.edge; ctx.lineWidth = Math.max(1, .1 * s); ctx.stroke();
  ctx.beginPath(); ctx.arc(X, Y, Math.max(1, .18 * s), 0, Math.PI * 2); ctx.fillStyle = '#3b3a36'; ctx.fill();   // épi
}
const SLATE_HI = [140, 146, 151], SLATE_LO = [78, 84, 89];
// tour ronde de pierre (coordonnées écran, rayon R en px) : parapet crénelé, chemin de ronde, toit conique
function roundTowerS(X, Y, R, s, sh) {
  if (sh) { ctx.beginPath(); ctx.arc(X + sh[0] * s, Y + sh[1] * s, R, 0, Math.PI * 2); ctx.fillStyle = FORT.shadow; ctx.fill(); } // ombre (sh null : déjà faite)
  ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2); ctx.fillStyle = FORT.cap; ctx.fill(); ctx.strokeStyle = FORT.edge; ctx.lineWidth = Math.max(1, .1 * s); ctx.stroke();
  const n = Math.max(8, Math.round(R / s * 2.4));                                                                               // créneaux : un tous les ~2,6 m
  if (s > .8) { ctx.fillStyle = FORT.crenel; for (let i = 0; i < n; i++) { const a0 = (i + .25) / n * Math.PI * 2, a1 = (i + .6) / n * Math.PI * 2; ctx.beginPath(); ctx.arc(X, Y, R * .98, a0, a1); ctx.arc(X, Y, R * .84, a1, a0, true); ctx.closePath(); ctx.fill(); } }
  ctx.beginPath(); ctx.arc(X, Y, R * .84, 0, Math.PI * 2); ctx.fillStyle = FORT.walk; ctx.fill(); ctx.strokeStyle = 'rgba(40,36,30,.5)'; ctx.lineWidth = 1; ctx.stroke(); // chemin de ronde
  coneS(X, Y, R * .74, SLATE_HI, SLATE_LO, s);
}
// rang de pieux pointus vus de dessus (le long de u, à la hauteur t) : têtes en cône, côté éclairé au nord-ouest
function stakesLT(h, u0, u1, t, r) {
  const s = view.s;
  if (s * r < 1.2) { ctx.strokeStyle = FORT.log; ctx.lineWidth = Math.max(1, 2 * r * s); ctx.beginPath(); ctx.moveTo(...LP(h, u0, t)); ctx.lineTo(...LP(h, u1, t)); ctx.stroke(); return; }
  const R = r * s;
  for (let u = u0 + r; u <= u1 - r * .5; u += r * 1.9) {
    const [X, Y] = LP(h, u, t);
    ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2); ctx.fillStyle = FORT.logLo; ctx.fill();
    ctx.beginPath(); ctx.arc(X - R * .2, Y - R * .22, R * .72, 0, Math.PI * 2); ctx.fillStyle = FORT.logHi; ctx.fill();
    ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2); ctx.strokeStyle = FORT.edge; ctx.lineWidth = 1; ctx.stroke();
    if (s > 3) { ctx.beginPath(); ctx.arc(X, Y, Math.max(1, R * .18), 0, Math.PI * 2); ctx.fillStyle = '#3a2a1a'; ctx.fill(); } // pointe
  }
}
function drawWalls() {
  const s = view.s, M = WALL_SURF, e = M / 2, P = .75;                                                // M : largeur du repère ; P : parapet de pierre
  const [wx0, wy0] = toW(-80, -80), [wx1, wy1] = toW(W + 80, H + 80), lv = { 1:[], 2:[], 3:[] };
  // un tronçon qui part d'une porte s'arrête au bord de la porte (il ne passe pas sur la route)
  const EXT = { 1:.3, 2:1.4, 3:e }, atGate = p => S.gates.some(g => Math.abs(g.x - p[0]) < .5 && Math.abs(g.y - p[1]) < .5);
  for (const w of S.walls) for (let k = 0; k < w.pts.length - 1; k++) {
    let a = w.pts[k], b = w.pts[k + 1]; const L0 = segLen(a, b) || 1, d = [(b[0] - a[0]) / L0, (b[1] - a[1]) / L0], cut = (CELL + 3) / 2 + EXT[lvlOf(w)];
    if (atGate(a)) a = [a[0] + d[0] * cut, a[1] + d[1] * cut];
    if (atGate(b)) b = [b[0] - d[0] * cut, b[1] - d[1] * cut];
    if ((b[0] - a[0]) * d[0] + (b[1] - a[1]) * d[1] <= 0) continue;
    const h = segFrame(a, b, M), r = h.w / 2 + M;
    if (h.x + r > wx0 && h.x - r < wx1 && h.y + r > wy0 && h.y - r < wy1) lv[lvlOf(w)].push(h);
  }
  const q = (h, u0, t0, u1, t1) => lpts(h, [[u0, t0], [u1, t0], [u1, t1], [u0, t1]]);
  const each = (segs, f) => { ctx.beginPath(); for (const h of segs) f(h); };
  // 1 · palissade : talus de terre, ombre, un rang de rondins pointus jointifs
  { const segs = lv[1], X = h => h.w / 2 + .3;
    each(segs, h => addS(q(h, -X(h), e - .9, X(h), e + .9))); ctx.fillStyle = FORT.berm; ctx.fill();
    each(segs, h => addS(shiftS(q(h, -X(h), e - .22, X(h), e + .22), 1.1, 1.4))); ctx.fillStyle = FORT.shadow; ctx.fill();
    for (const h of segs) stakesLT(h, -X(h), X(h), e, .28); }
  // 2 · mur de bois : passerelle de planches sur pieux, rang de pieux pointus de chaque côté (parapet)
  { const segs = lv[2], X = h => h.w / 2 + 1.4, B = 1.35;
    each(segs, h => addS(shiftS(q(h, -X(h), e - B, X(h), e + B), 1.6, 2.1))); ctx.fillStyle = FORT.shadow; ctx.fill();
    each(segs, h => addS(q(h, -X(h), e - B, X(h), e + B))); ctx.fillStyle = FORT.plank; ctx.fill();
    if (s > 1.6) { ctx.strokeStyle = FORT.plankLine; ctx.lineWidth = 1; ctx.beginPath();                // planches en travers, et le joint de la passerelle
      for (const h of segs) { for (let u = -X(h); u < X(h); u += .38) { ctx.moveTo(...LP(h, u, e - B + .25)); ctx.lineTo(...LP(h, u, e + B - .25)); } }
      ctx.stroke(); }
    ctx.strokeStyle = FORT.edge; ctx.lineWidth = Math.max(1, .06 * s); ctx.beginPath();
    for (const h of segs) for (const t of [e - B, e + B]) { ctx.moveTo(...LP(h, -X(h), t)); ctx.lineTo(...LP(h, X(h), t)); }
    ctx.stroke();
    for (const h of segs) for (const t of [e - B + .2, e + B - .2]) stakesLT(h, -X(h), X(h), t, .2); }
  // 3 · muraille de pierre
  { const segs = lv[3], X = h => h.w / 2 + e;                                                         // prolongé d'une demi-épaisseur : les angles se rejoignent
    each(segs, h => addS(shiftS(q(h, -X(h), 0, X(h), M), 2, 2.6))); ctx.fillStyle = FORT.shadow; ctx.fill();      // ombre de la courtine
    each(segs, h => addS(q(h, -X(h), 0, X(h), M))); ctx.fillStyle = FORT.cap; ctx.fill();                         // dessus des parapets
    each(segs, h => addS(q(h, -X(h) + P, P, X(h) - P, M - P))); ctx.fillStyle = FORT.walk; ctx.fill();           // chemin de ronde, en contrebas
    if (s > .9) { each(segs, h => { for (let u = -h.w / 2 + .6; u < h.w / 2 - .3; u += 1.6) for (const [t0, t1] of [[.05, P], [M - P, M - .05]]) addS(q(h, u, t0, u + .7, t1)); });
      ctx.fillStyle = FORT.crenel; ctx.fill(); }                                                      // créneaux
    if (s > 2.2) { ctx.strokeStyle = FORT.flag; ctx.lineWidth = 1; ctx.beginPath();                   // dalles du chemin de ronde
      for (const h of segs) { for (let u = -h.w / 2; u < h.w / 2; u += 1.2) { ctx.moveTo(...LP(h, u, P)); ctx.lineTo(...LP(h, u, M - P)); } ctx.moveTo(...LP(h, -X(h) + P, e)); ctx.lineTo(...LP(h, X(h) - P, e)); }
      ctx.stroke(); }
    ctx.strokeStyle = FORT.edge; ctx.lineWidth = Math.max(1, .1 * s); ctx.beginPath();
    for (const h of segs) for (const t of [0, M]) { ctx.moveTo(...LP(h, -X(h), t)); ctx.lineTo(...LP(h, X(h), t)); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(40,36,30,.45)'; ctx.lineWidth = 1; ctx.beginPath();
    for (const h of segs) for (const t of [P, M - P]) { ctx.moveTo(...LP(h, -X(h) + P, t)); ctx.lineTo(...LP(h, X(h) - P, t)); }
    ctx.stroke(); }
}
// tour de bois carrée (repère local centré, côté a m) : pieux en rondins, plancher, toit de bardeaux
function woodTowerLT(h, a, s, big) {
  const q = (u0, t0, u1, t1) => lpts(h, [[u0, t0], [u1, t0], [u1, t1], [u0, t1]]), c = h.l / 2;
  if (big) {                                                                                           // tour de bois : murs de rondins et hourds de planches
    pathS(shiftS(q(-a, c - a, a, c + a), 2.4, 3.1)); ctx.fillStyle = FORT.shadow; ctx.fill();
    pathS(q(-a, c - a, a, c + a)); ctx.fillStyle = FORT.log; ctx.fill(); ctx.strokeStyle = FORT.edge; ctx.lineWidth = Math.max(1, .08 * s); ctx.stroke();
    if (s > 1.6) { ctx.strokeStyle = 'rgba(40,28,16,.45)'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = -a + .35; k < a; k += .35) { ctx.moveTo(...LP(h, k, c - a)); ctx.lineTo(...LP(h, k, c - a + .5)); ctx.moveTo(...LP(h, k, c + a - .5)); ctx.lineTo(...LP(h, k, c + a)); ctx.moveTo(...LP(h, -a, c + k)); ctx.lineTo(...LP(h, -a + .5, c + k)); ctx.moveTo(...LP(h, a - .5, c + k)); ctx.lineTo(...LP(h, a, c + k)); } ctx.stroke(); }
    pathS(q(-a + .5, c - a + .5, a - .5, c + a - .5)); ctx.fillStyle = FORT.plank; ctx.fill();
    hipLT(h, -a + .9, c - a + .9, a - .9, c + a - .9, SHINGLE);
  } else {                                                                                             // tour de guet : quatre poteaux, plancher, petit toit
    pathS(shiftS(q(-a, c - a, a, c + a), 2.6, 3.4)); ctx.fillStyle = FORT.shadow; ctx.fill();
    for (const [u, t] of [[-a, c - a], [a, c - a], [a, c + a], [-a, c + a]]) { const [X, Y] = LP(h, u, t); ctx.beginPath(); ctx.arc(X, Y, Math.max(1.2, .28 * s), 0, Math.PI * 2); ctx.fillStyle = FORT.logLo; ctx.fill(); ctx.strokeStyle = FORT.edge; ctx.lineWidth = 1; ctx.stroke(); }
    hipLT(h, -a + .25, c - a + .25, a - .25, c + a - .25, SHINGLE);
  }
}
function drawTower(t, mode) {
  const s = view.s, [X, Y] = toS(t.x, t.y), r = TOWER_R * s;
  if (mode === 'ghost' || mode === 'bad') {
    ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2);
    ctx.globalAlpha = .5; ctx.fillStyle = mode === 'bad' ? Col.bad : Col.accent; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = mode === 'bad' ? Col.bad : Col.accent; ctx.lineWidth = 1.5; ctx.stroke(); return;
  }
  const L = lvlOf(t), h = { x:t.x, y:t.y, a:0, w:1, l:1, front:1 };
  if (L === 3) roundTowerS(X, Y, r, s, [3, 3.9]);                                                   // plus haute que la courtine : ombre plus longue
  else woodTowerLT(h, L === 2 ? 3.6 : 2.4, s, L === 2);
  if (mode !== 'normal') { ctx.beginPath(); ctx.arc(X, Y, r + 2, 0, Math.PI * 2); ctx.strokeStyle = Col.accent; ctx.lineWidth = mode === 'selected' ? 2.5 : 1.5; ctx.stroke(); }
}
function drawGate(g, mode) {
  if (mode === 'ghost' || mode === 'bad') {
    polyPath(gatePoly(g)); ctx.closePath();
    ctx.globalAlpha = .5; ctx.fillStyle = mode === 'bad' ? Col.bad : Col.accent; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = mode === 'bad' ? Col.bad : Col.accent; ctx.lineWidth = 1.5; ctx.stroke(); return;
  }
  // repère : u le long de la route (−4 … 4, traversée de la muraille), t en travers (0 … 11)
  const s = view.s, h = { x:g.x, y:g.y, a:g.a, w:GATE_L, l:CELL + 3, front:1 }, L = h.l, c = L / 2, r = roadThroughGate(g), lv = lvlOf(g);
  const q = (u0, t0, u1, t1) => lpts(h, [[u0, t0], [u1, t0], [u1, t1], [u0, t1]]);
  if (lv === 1) {                                                                                      // porte de palissade : deux gros poteaux, deux vantaux ouverts vers l'intérieur
    pathS(q(-.9, 0, .9, c - 3.1)); ctx.fillStyle = FORT.berm; ctx.fill(); pathS(q(-.9, c + 3.1, .9, L)); ctx.fill();
    const across = { ...h, a:g.a + 90 };                                                              // repère tourné : u en travers de la route, t = c sur l'axe
    stakesLT(across, -c, -3.1, c, .28); stakesLT(across, 3.1, c, c, .28);                               // la palissade rejoint les poteaux
    for (const d of [-1, 1]) {
      const hinge = [0, c + d * 3.1], leaf = [[hinge[0] + .1, hinge[1]], [hinge[0] + 2.7, hinge[1] - d * 1.3]];
      const n = [-(leaf[1][1] - leaf[0][1]), leaf[1][0] - leaf[0][0]], nl = Math.hypot(...n) || 1, k = [n[0] / nl * .14, n[1] / nl * .14];
      const Pq = lpts(h, [[leaf[0][0] + k[0], leaf[0][1] + k[1]], [leaf[1][0] + k[0], leaf[1][1] + k[1]], [leaf[1][0] - k[0], leaf[1][1] - k[1]], [leaf[0][0] - k[0], leaf[0][1] - k[1]]]);
      pathS(shiftS(Pq, .5, .65)); ctx.fillStyle = FORT.shadow; ctx.fill();
      pathS(Pq); ctx.fillStyle = FORT.plank; ctx.fill(); ctx.strokeStyle = FORT.edge; ctx.lineWidth = Math.max(1, .05 * s); ctx.stroke(); // vantail
      const [X, Y] = LP(h, ...hinge); ctx.beginPath(); ctx.arc(X + .7 * s, Y + .9 * s, .4 * s, 0, Math.PI * 2); ctx.fillStyle = FORT.shadow; ctx.fill();
      ctx.beginPath(); ctx.arc(X, Y, Math.max(1.5, .4 * s), 0, Math.PI * 2); ctx.fillStyle = FORT.logLo; ctx.fill(); ctx.strokeStyle = FORT.edge; ctx.lineWidth = 1; ctx.stroke(); // poteau
    }
  } else if (lv === 2) {                                                                               // porte fortifiée en bois : deux tours carrées, passerelle au-dessus de la route
    pathS(shiftS(q(-1.4, 2.6, 1.4, L - 2.6), 1.6, 2.1)); ctx.fillStyle = FORT.shadow; ctx.fill();
    pathS(q(-1.4, 2.6, 1.4, L - 2.6)); ctx.fillStyle = FORT.plank; ctx.fill(); ctx.strokeStyle = FORT.edge; ctx.lineWidth = Math.max(1, .06 * s); ctx.stroke(); // passerelle
    if (s > 1.6) { ctx.strokeStyle = FORT.plankLine; ctx.lineWidth = 1; ctx.beginPath(); for (let t = 2.9; t < L - 2.6; t += .38) { ctx.moveTo(...LP(h, -1.15, t)); ctx.lineTo(...LP(h, 1.15, t)); } ctx.stroke(); }
    const across = { ...h, a:g.a + 90 };
    for (const d of [-1.2, 1.2]) stakesLT(across, -c + 2.6, c - 2.6, c + d, .2);                        // parapets de pieux
    gableLT(h, -1.7, 2.2, 1.7, L - 2.2, 't', .7);                                                        // passerelle couverte au-dessus du passage
    for (const t of [1.6, L - 1.6]) { const [x, y] = local(h, 0, t - c); woodTowerLT({ x, y, a:g.a, w:1, l:1, front:1 }, 2.1, s, true); } // tours de bois de part et d'autre
  } else {                                                                                             // châtelet de pierre
    const turrets = [-1, 1].flatMap(du => [1.9, L - 1.9].map(t => [du * 3.3, t]));
    ctx.beginPath(); addS(shiftS(q(-3.2, .6, 3.2, L - .6), 2.4, 3.1));                                  // ombres du châtelet et de ses tourelles, d'un seul tenant
    for (const p of turrets) { const [X, Y] = LP(h, ...p); ctx.moveTo(X + 4.7 * s, Y + 3.6 * s); ctx.arc(X + 2.8 * s, Y + 3.6 * s, 1.9 * s, 0, Math.PI * 2); }
    ctx.fillStyle = FORT.shadow; ctx.fill();
    for (const d of [-1, 1]) {                                                                         // bouches du passage voûté, herse
      pathS(q(d * 3.2, c - 1.8, d * 4.3, c + 1.8)); ctx.fillStyle = r ? roadCols(r)[0] : FORT.walk; ctx.fill();
      pathS(q(d * 3.2, c - 1.8, d * 4.3, c + 1.8)); ctx.fillStyle = 'rgba(20,16,12,.25)'; ctx.fill();
      pathS(q(d * 3.2, c - 1.8, d * 3.8, c + 1.8)); ctx.fillStyle = 'rgba(20,16,12,.6)'; ctx.fill();
      if (s > 1.2) { ctx.strokeStyle = FORT.edge; ctx.lineWidth = Math.max(1, .08 * s); ctx.beginPath(); for (const t of [c - 1.8, c + 1.8]) { ctx.moveTo(...LP(h, d * 3.2, t)); ctx.lineTo(...LP(h, d * 4.3, t)); } ctx.stroke(); }
      if (s > 1.6) { ctx.strokeStyle = '#2b2622'; ctx.lineWidth = Math.max(1, .08 * s); ctx.beginPath(); for (let t = c - 1.6; t <= c + 1.61; t += .4) { ctx.moveTo(...LP(h, d * 3.25, t)); ctx.lineTo(...LP(h, d * 3.6, t)); } ctx.moveTo(...LP(h, d * 3.45, c - 1.8)); ctx.lineTo(...LP(h, d * 3.45, c + 1.8)); ctx.stroke(); }
    }
    pathS(q(-3.2, .6, 3.2, L - .6)); ctx.fillStyle = FORT.stone; ctx.fill(); ctx.strokeStyle = FORT.edge; ctx.lineWidth = Math.max(1, .1 * s); ctx.stroke();
    hipLT(h, -2.9, .9, 2.9, L - .9, SLATE);
    for (const p of turrets) { const [X, Y] = LP(h, ...p); roundTowerS(X, Y, 1.9 * s, s, null); }
  }
  if (mode !== 'normal') { polyPath(gatePoly(g)); ctx.closePath(); ctx.strokeStyle = Col.accent; ctx.lineWidth = mode === 'selected' ? 2.5 : 1.5; ctx.stroke(); }
}
