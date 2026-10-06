/* ---------- dessin des bâtiments du catalogue ----------
   Repère local : u le long de la façade (−w/2 … w/2), t en profondeur depuis la rue
   (0 = bord de rue, l = fond de parcelle). */
const LP = (h, u, t) => toS(...local(h, u, (h.front || 1) * (t - h.l / 2)));
/* ---------- éléments détaillés (scierie et bâtiments suivants) ----------
   Style de la carte de référence : aplats peints, contour sombre, ombre portée au sud-est,
   lumière venant du nord-ouest ; les petits détails n'apparaissent qu'en zoomant. */
const WOOD = {
  yard:'#c9b68b', speck:'#b5a076', dust:'#e4d5a8', dustHi:'#efe4c2',
  bark:'#6f5134', barkHi:'#8e6b46', barkLo:'#4c3721', grain:'#d9b680', ring:'#b18a58',
  plank:'#d8c08c', plankLine:'#b59b69', sticker:'#6b5236',
  roofHi:'#a08a69', roof:'#86705a', roofLo:'#6f5c46', roofLine:'rgba(58,44,30,.45)',
  edge:'#3b2e22', fence:'#6b5236', rail:'#4b4a44', cart:'#9b7a52', shadow:'rgba(40,34,24,.33)',
  wattleHi:'#977650', beam:'#b8935f', spoil:'#ad946a', pitLo:'#33281c', pitHi:'#58452f', stone:'#8d877b', stoneLo:'#6c675d',
};
// chaume : paille neuve (dorée) ou vieille paille grisée
const STRAW = { hi:'#cdb07a', lo:'#a2854f', ridge:'#8a6a3d', line:'rgba(88,64,34,.38)' };
const OLD_STRAW = { hi:'#b9a57f', lo:'#8e7b58', ridge:'#72603f', line:'rgba(70,56,36,.4)' };
// rectangle aux coins arrondis et au bord légèrement irrégulier (coordonnées locales u, t)
function softRect(u0, t0, u1, t1, r, jit, rnd) {
  const C = [[u1 - r, t0 + r, -90], [u1 - r, t1 - r, 0], [u0 + r, t1 - r, 90], [u0 + r, t0 + r, 180]], P = [];
  for (const [cu, ct, a0] of C) for (let k = 0; k <= 4; k++) { const a = (a0 + k * 22.5) * Math.PI / 180; P.push([cu + Math.cos(a) * r, ct + Math.sin(a) * r]); }
  const out = [];
  P.forEach((p, i) => { const q = P[(i + 1) % P.length], n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / .7));
    for (let k = 0; k < n; k++) out.push([p[0] + (q[0] - p[0]) * k / n + (rnd() - .5) * jit, p[1] + (q[1] - p[1]) * k / n + (rnd() - .5) * jit]); });
  return out;
}
// toit de chaume à deux pans : bord épais et arrondi, rangs de paille ondulés, brins, mousse
// sur le pan à l'ombre, faîtage de paille liée ; ombre portée au sud-est
function thatchLT(h, u0, t0, u1, t1, along, P) {
  const ridgeT = along === 't', s = view.s, rnd = seeded(Math.round(u0 * 17 + t0 * 29 + h.x * 3 + h.y));
  const out = lpts(h, softRect(u0, t0, u1, t1, Math.min(1.1, (u1 - u0) / 5), .14, rnd));
  pathS(shiftS(out, 1.5, 1.9)); ctx.fillStyle = WOOD.shadow; ctx.fill();                        // ombre portée
  const cu = (u0 + u1) / 2, ct = (t0 + t1) / 2, cS = LP(h, cu, ct);
  const pans = ridgeT ? [[[u0 - 1, t0 - 1], [cu, t0 - 1], [cu, t1 + 1], [u0 - 1, t1 + 1]], [[cu, t0 - 1], [u1 + 1, t0 - 1], [u1 + 1, t1 + 1], [cu, t1 + 1]]]
                      : [[[u0 - 1, t0 - 1], [u1 + 1, t0 - 1], [u1 + 1, ct], [u0 - 1, ct]], [[u0 - 1, ct], [u1 + 1, ct], [u1 + 1, t1 + 1], [u0 - 1, t1 + 1]]];
  const lit = pan => { const m = LP(h, (pan[0][0] + pan[2][0]) / 2, (pan[0][1] + pan[2][1]) / 2); return (cS[0] - m[0]) + (cS[1] - m[1]) > 0; };
  ctx.save(); pathS(out); ctx.clip();
  pans.forEach(pan => { pathS(lpts(h, pan)); ctx.fillStyle = lit(pan) ? P.hi : P.lo; ctx.fill(); });
  // distance au faîtage → les rangs de paille lui sont parallèles, ondulés
  const half = ridgeT ? (u1 - u0) / 2 : (t1 - t0) / 2, len0 = ridgeT ? t0 : u0, len1 = ridgeT ? t1 : u1;
  const at = (d, x) => ridgeT ? [cu + d, x] : [x, ct + d];                                      // d : écart au faîtage, x : le long
  if (s > 1.2) {
    ctx.strokeStyle = P.line; ctx.lineWidth = 1; ctx.beginPath();
    for (const e of [-1, 1]) for (let d = 1.1; d < half; d += 1.1) {
      for (let x = len0 - .5, k = 0; x <= len1 + .5; x += .5, k++) { const p = LP(h, ...at(e * (d + Math.sin(x * 2.1 + d * 3) * .08), x)); k ? ctx.lineTo(...p) : ctx.moveTo(...p); }
    }
    ctx.stroke();
  }
  if (s > 2.4) { // brins de paille, dans le sens de la pente
    for (const [col, off] of [['rgba(255,243,205,.5)', 0], ['rgba(60,42,20,.35)', .17]]) {
      ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath();
      for (const e of [-1, 1]) for (let d = .55 + off; d < half; d += .5) for (let x = len0 + rnd() * .3; x < len1; x += .34 + rnd() * .12) {
        const a = at(e * d, x), b = at(e * (d + .32), x + (rnd() - .5) * .08);
        ctx.moveTo(...LP(h, ...a)); ctx.lineTo(...LP(h, ...b));
      }
      ctx.stroke();
    }
  }
  if (s > 1.5) { // mousse et paille tassée, surtout sur le pan à l'ombre
    for (let k = 0; k < Math.round((len1 - len0) / 4); k++) {
      const e = pans.findIndex(p => !lit(p)) ? 1 : -1, d = half * (.25 + rnd() * .5), x = len0 + 1 + rnd() * (len1 - len0 - 2), r = (.5 + rnd() * .8) * Math.min(1, half / 5), blob = [];
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, k2 = .7 + rnd() * .5; blob.push(at(e * d + Math.cos(a) * r * .6 * k2, x + Math.sin(a) * r * 1.6 * k2)); }
      pathS(lpts(h, blob)); ctx.fillStyle = rnd() < .6 ? 'rgba(92,110,58,.2)' : 'rgba(55,40,22,.13)'; ctx.fill();
    }
  }
  // bord du chaume : bande plus sombre qui marque l'épaisseur de la couverture
  pathS(out); ctx.strokeStyle = 'rgba(50,36,20,.35)'; ctx.lineWidth = Math.max(1, .5 * s); ctx.stroke();
  ctx.restore();
  // faîtage de paille liée, avec ses liens en losanges
  const rw = Math.min(.5, half * .13), rp = lpts(h, softRect(...(ridgeT ? [cu - rw, t0 + .25, cu + rw, t1 - .25] : [u0 + .25, ct - rw, u1 - .25, ct + rw]), rw * .9, .05, rnd));
  pathS(shiftS(rp, .15, .2)); ctx.fillStyle = 'rgba(40,30,18,.3)'; ctx.fill();
  pathS(rp); ctx.fillStyle = P.ridge; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.08); ctx.stroke();
  if (s > 2) {
    ctx.strokeStyle = 'rgba(40,28,14,.5)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = len0 + .7, k = 0; x < len1 - .9; x += .7, k++) { ctx.moveTo(...LP(h, ...at(-rw * .8, x))); ctx.lineTo(...LP(h, ...at(rw * .8, x + .7))); ctx.moveTo(...LP(h, ...at(rw * .8, x))); ctx.lineTo(...LP(h, ...at(-rw * .8, x + .7))); }
    ctx.stroke();
  }
  pathS(out); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.18); ctx.stroke();
}
// cheminée de pierres sèches (carrée, vue de dessus), conduit noir de suie
function chimneyLT(h, cu, ct, a) {
  const s = view.s, P = lpts(h, [[cu - a, ct - a], [cu + a, ct - a], [cu + a, ct + a], [cu - a, ct + a]]);
  pathS(shiftS(P, .5, .6)); ctx.fillStyle = WOOD.shadow; ctx.fill();
  pathS(P); ctx.fillStyle = WOOD.stone; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.08); ctx.stroke();
  if (s > 3) { ctx.strokeStyle = WOOD.stoneLo; ctx.lineWidth = 1; ctx.beginPath(); for (const [p, q] of [[[cu - a, ct], [cu - a * .45, ct]], [[cu + a * .45, ct + .1], [cu + a, ct + .1]], [[cu - .1, ct - a], [cu - .1, ct - a * .45]], [[cu + .1, ct + a * .45], [cu + .1, ct + a]]]) { ctx.moveTo(...LP(h, ...p)); ctx.lineTo(...LP(h, ...q)); } ctx.stroke(); }
  const b = a * .45; pathS(lpts(h, [[cu - b, ct - b], [cu + b, ct - b], [cu + b, ct + b], [cu - b, ct + b]])); ctx.fillStyle = '#1f1a15'; ctx.fill();
}
// clôture tressée (plessis) : branchages entrelacés entre des pieux, ouverte sur [gap0, gap1]
function wattleLT(h, u0, t0, u1, t1, gap0, gap1, extra = []) { // gap0 null : pas de portail ; extra : segments en plus (refends)
  const s = view.s, rnd = seeded(Math.round(h.x * 3 + h.y * 5) + 7);
  const gate = gap0 != null, runs = [...(gate ? [[[u0, t0], [gap0, t0]], [[gap1, t0], [u1, t0]]] : [[[u0, t0], [u1, t0]]]), [[u1, t0], [u1, t1]], [[u1, t1], [u0, t1]], [[u0, t1], [u0, t0]], ...extra];
  const lines = runs.map(([a, b]) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.ceil(L / .6)), P = [];
    for (let i = 0; i <= n; i++) { const j = i && i < n ? (rnd() - .5) * .14 : 0; P.push([a[0] + (b[0] - a[0]) * i / n + j, a[1] + (b[1] - a[1]) * i / n + j]); } return P; });
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = WOOD.shadow; ctx.lineWidth = Math.max(1, .3 * s); ctx.beginPath();
  for (const P of lines) shiftS(lpts(h, P), .2, .25).forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.stroke();
  ctx.strokeStyle = WOOD.fence; ctx.lineWidth = Math.max(1, .3 * s); ctx.beginPath();
  for (const P of lines) lpts(h, P).forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.stroke();
  if (s > 2) { // brins entrelacés : reflets courts qui passent d'un côté puis de l'autre
    ctx.strokeStyle = WOOD.wattleHi; ctx.lineWidth = 1; ctx.beginPath();
    for (const [a, b] of runs) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), du = (b[0] - a[0]) / L, dt = (b[1] - a[1]) / L;
      for (let d = .15, k = 0; d < L - .3; d += .45, k++) { const o = (k % 2 ? .07 : -.07); ctx.moveTo(...LP(h, a[0] + du * d - dt * o, a[1] + dt * d + du * o)); ctx.lineTo(...LP(h, a[0] + du * (d + .3) + dt * o, a[1] + dt * (d + .3) - du * o)); } }
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  if (s > 1.5) { // pieux
    ctx.fillStyle = WOOD.edge;
    for (const [a, b] of runs) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let d = 0; d <= L + .01; d += 1.5) { const u = a[0] + (b[0] - a[0]) * d / L, t = a[1] + (b[1] - a[1]) * d / L, e = .11; pathS(lpts(h, [[u - e, t - e], [u + e, t - e], [u + e, t + e], [u - e, t + e]])); ctx.fill(); } }
  }
  if (gate) for (const u of [gap0, gap1]) { const e = .22; pathS(lpts(h, [[u - e, t0 - e], [u + e, t0 - e], [u + e, t0 + e], [u - e, t0 + e]])); ctx.fillStyle = WOOD.edge; ctx.fill(); } // poteaux du portail
}
// fosse de sciage de long : trou bordé de déblais, deux traverses, grume à moitié sciée,
// scie de long à cadre plantée dans le trait, échelle, sciure au fond
function sawPitLT(h, u0, t0, u1, t1) {
  const s = view.s, rnd = seeded(Math.round(h.x + h.y * 7) + 3), cu = (u0 + u1) / 2;
  pathS(lpts(h, softRect(u0 - .8, t0 - .8, u1 + .8, t1 + .8, .7, .25, rnd))); ctx.fillStyle = WOOD.spoil; ctx.fill(); // déblais
  const pit = lpts(h, [[u0, t0], [u1, t0], [u1, t1], [u0, t1]]);
  ctx.save(); pathS(pit); ctx.clip();
  ctx.fillStyle = WOOD.pitLo; ctx.fill();
  pathS(shiftS(pit, .55, .7)); ctx.fillStyle = WOOD.pitHi; ctx.fill();                          // fond éclairé, bords nord-ouest dans l'ombre
  if (s > 2) { ctx.fillStyle = 'rgba(228,213,168,.55)'; for (let k = 0; k < 40; k++) { const [X, Y] = LP(h, u0 + .3 + rnd() * (u1 - u0 - .6), t0 + .3 + rnd() * (t1 - t0 - .6)); ctx.fillRect(X, Y, Math.max(1, .1 * s), Math.max(1, .1 * s)); } }
  if (s > 1.5) { ctx.strokeStyle = '#7a5d3b'; ctx.lineWidth = lw(.08); ctx.beginPath();          // échelle
    for (const u of [u1 - .9, u1 - .35]) { ctx.moveTo(...LP(h, u, t1 - .1)); ctx.lineTo(...LP(h, u, t1 - 1.9)); }
    for (let t = t1 - .4; t > t1 - 1.9; t -= .38) { ctx.moveTo(...LP(h, u1 - .9, t)); ctx.lineTo(...LP(h, u1 - .35, t)); } ctx.stroke(); }
  ctx.restore();
  pathS(pit); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.1); ctx.stroke();
  for (const t of [t0 + 1.3, t1 - 2.6]) beamLT(h, u0 - .7, t, u1 + .7, t + .45);                 // traverses
  const r = .55, tc = t0 + (t1 - t0) * .45;
  logLT(h, cu, t1 + .7, cu, t0 - .9, r);                                                          // grume
  // partie déjà sciée : trait de scie ouvert, plus clair ; puis ligne tracée au cordeau
  pathS(lpts(h, [[cu - .07, t0 - .9], [cu + .07, t0 - .9], [cu + .07, tc], [cu - .07, tc]])); ctx.fillStyle = '#2b2118'; ctx.fill();
  if (s > 2) { ctx.strokeStyle = 'rgba(30,24,18,.7)'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(...LP(h, cu, tc)); ctx.lineTo(...LP(h, cu, t1 + .6)); ctx.stroke(); ctx.setLineDash([]); }
  // scie de long à cadre : montants dans l'axe, poignée (renard) en travers au-dessus
  ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = lw(.14); ctx.beginPath();
  ctx.moveTo(...LP(h, cu, tc - .7)); ctx.lineTo(...LP(h, cu, tc + .7));
  ctx.moveTo(...LP(h, cu - .75, tc - .7)); ctx.lineTo(...LP(h, cu + .75, tc - .7)); ctx.stroke();
  if (s > 2.5) { ctx.strokeStyle = '#9aa0a3'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(...LP(h, cu + .05, tc - .6)); ctx.lineTo(...LP(h, cu + .05, tc + .6)); ctx.stroke(); } // lame
}
// pièce de bois équarrie (vue de dessus), traces d'herminette
function beamLT(h, u0, t0, u1, t1) {
  const s = view.s, P = lpts(h, [[u0, t0], [u1, t0], [u1, t1], [u0, t1]]);
  pathS(shiftS(P, .25, .3)); ctx.fillStyle = WOOD.shadow; ctx.fill();
  pathS(P); ctx.fillStyle = WOOD.beam; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.07); ctx.stroke();
  if (s > 2.5) { const along = (u1 - u0) >= (t1 - t0); ctx.strokeStyle = 'rgba(110,78,42,.45)'; ctx.lineWidth = 1; ctx.beginPath();
    if (along) for (let u = u0 + .3; u < u1 - .2; u += .45) { ctx.moveTo(...LP(h, u, t0 + .05)); ctx.lineTo(...LP(h, u + .18, t1 - .05)); }
    else for (let t = t0 + .3; t < t1 - .2; t += .45) { ctx.moveTo(...LP(h, u0 + .05, t)); ctx.lineTo(...LP(h, u1 - .05, t + .18)); }
    ctx.stroke(); }
}
// stère de bois fendu, rangé le long de t : bûches couchées en travers (écorce ou face fendue),
// pieux de maintien aux deux bouts
function cordwoodLT(h, u0, t0, u1, t1) {
  const s = view.s, rnd = seeded(Math.round(u0 * 13 + t0 * 7 + h.x)), P = lpts(h, [[u0, t0], [u1, t0], [u1, t1], [u0, t1]]);
  pathS(shiftS(P, .45, .6)); ctx.fillStyle = WOOD.shadow; ctx.fill();
  pathS(P); ctx.fillStyle = WOOD.barkLo; ctx.fill();
  const cols = [WOOD.bark, WOOD.barkHi, WOOD.grain, WOOD.bark, '#c9a472'];
  for (let t = t0 + .05; t < t1 - .1;) {
    const w = .16 + rnd() * .12, j = (rnd() - .5) * .25;
    pathS(lpts(h, [[u0 + .05 + j * .4, t], [u1 - .05 + j, t], [u1 - .05 + j, t + w], [u0 + .05 + j * .4, t + w]]));
    ctx.fillStyle = cols[Math.floor(rnd() * cols.length)]; ctx.fill();
    if (s > 3) { ctx.strokeStyle = 'rgba(40,28,16,.45)'; ctx.lineWidth = 1; ctx.stroke(); }
    t += w + .03;
  }
  pathS(P); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.08); ctx.stroke();
  ctx.fillStyle = WOOD.edge; for (const t of [t0 - .15, t1 + .15]) for (const u of [u0 + .1, u1 - .1]) { const e = .12; pathS(lpts(h, [[u - e, t - e], [u + e, t - e], [u + e, t + e], [u - e, t + e]])); ctx.fill(); }
}
// scie à cadre (arc de bois tendu par une corde) posée dans le trait de la bûche
function bucksawLT(h, cu, ct) {
  if (view.s < 2) return;
  ctx.strokeStyle = '#5a4430'; ctx.lineWidth = lw(.08); ctx.beginPath();
  ctx.moveTo(...LP(h, cu - .05, ct - .7)); ctx.lineTo(...LP(h, cu - .05, ct + .7));             // traverse du cadre
  ctx.moveTo(...LP(h, cu - .35, ct - .7)); ctx.lineTo(...LP(h, cu + .25, ct - .7));             // montants vus de dessus
  ctx.moveTo(...LP(h, cu - .35, ct + .7)); ctx.lineTo(...LP(h, cu + .25, ct + .7)); ctx.stroke();
  ctx.strokeStyle = '#a3a8aa'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(...LP(h, cu + .2, ct - .7)); ctx.lineTo(...LP(h, cu + .2, ct + .7)); ctx.stroke(); // lame
}
// foyer : cercle de pierres, cendres, braises et bouts de bois calcinés
function firePitLT(h, cu, ct, r) {
  const s = view.s, rnd = seeded(Math.round(cu * 31 + ct * 17 + h.y));
  const ash = []; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ash.push([cu + Math.cos(a) * r, ct + Math.sin(a) * r]); }
  pathS(lpts(h, ash)); ctx.fillStyle = '#8f887c'; ctx.fill();
  const ember = []; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, k = .35 + rnd() * .2; ember.push([cu + Math.cos(a) * r * k, ct + Math.sin(a) * r * k]); }
  pathS(lpts(h, ember)); ctx.fillStyle = '#c8682a'; ctx.fill();
  if (s > 2) { ctx.fillStyle = '#f0b44c'; for (let k = 0; k < 5; k++) { const [X, Y] = LP(h, cu + (rnd() - .5) * r * .6, ct + (rnd() - .5) * r * .6); ctx.fillRect(X, Y, Math.max(1, .1 * s), Math.max(1, .1 * s)); } }
  ctx.strokeStyle = '#2a211a'; ctx.lineWidth = lw(.09); ctx.beginPath();                        // tisons
  for (const a of [.4, 1.5, 2.6]) { ctx.moveTo(...LP(h, cu + Math.cos(a) * r * .9, ct + Math.sin(a) * r * .9)); ctx.lineTo(...LP(h, cu - Math.cos(a) * r * .15, ct - Math.sin(a) * r * .15)); }
  ctx.stroke();
  for (let i = 0; i < 10; i++) {                                                                  // pierres
    const a = i / 10 * Math.PI * 2 + rnd() * .2, R = r + .12, su = cu + Math.cos(a) * R, st = ct + Math.sin(a) * R, e = .15 + rnd() * .08, st2 = [];
    for (let k = 0; k < 6; k++) { const b = k / 6 * Math.PI * 2 + a, q = .75 + rnd() * .35; st2.push([su + Math.cos(b) * e * q, st + Math.sin(b) * e * q]); }
    const P = lpts(h, st2); pathS(shiftS(P, .08, .1)); ctx.fillStyle = WOOD.shadow; ctx.fill();
    pathS(P); ctx.fillStyle = i % 3 ? WOOD.stone : '#a19b8f'; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.04); ctx.stroke();
  }
}
// fagot : botte de branches fines serrée par deux liens de paille, orientée d'un angle a
function fagotLT(h, cu, ct, len, a) {
  const s = view.s, rnd = seeded(Math.round(cu * 19 + ct * 23)), du = Math.cos(a), dt = Math.sin(a), nu = -dt, nt = du;
  const at = (x, y) => [cu + du * x + nu * y, ct + dt * x + nt * y];
  const body = lpts(h, [at(-len / 2, -.28), at(-len * .2, -.22), at(len * .2, -.22), at(len / 2, -.3), at(len / 2, .3), at(len * .2, .22), at(-len * .2, .22), at(-len / 2, .28)]);
  pathS(shiftS(body, .2, .25)); ctx.fillStyle = WOOD.shadow; ctx.fill();
  pathS(body); ctx.fillStyle = '#5e4630'; ctx.fill();
  if (s > 1.8) { ctx.lineWidth = 1; for (const col of ['#8a6a45', '#a5845a']) { ctx.strokeStyle = col; ctx.beginPath();
    for (let k = 0; k < 5; k++) { const y = (rnd() - .5) * .36; ctx.moveTo(...LP(h, ...at(-len / 2 - rnd() * .15, y * 1.1))); ctx.lineTo(...LP(h, ...at(len / 2 + rnd() * .15, y * 1.2))); } ctx.stroke(); } }
  pathS(body); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.05); ctx.stroke();
  for (const x of [-len * .22, len * .22]) { pathS(lpts(h, [at(x - .07, -.25), at(x + .07, -.25), at(x + .07, .25), at(x - .07, .25)])); ctx.fillStyle = '#d6bd7e'; ctx.fill(); } // liens
}
// tas de branchages ébranchés : rameaux sombres entremêlés, quelques feuilles
function branchesLT(h, cu, ct, r) {
  const s = view.s, rnd = seeded(Math.round(cu * 41 + ct * 3 + h.x)), blob = [];
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, k = .75 + rnd() * .4; blob.push([cu + Math.cos(a) * r * k, ct + Math.sin(a) * r * .8 * k]); }
  const P = lpts(h, blob); pathS(shiftS(P, .35, .45)); ctx.fillStyle = WOOD.shadow; ctx.fill();
  pathS(P); ctx.fillStyle = '#6a6440'; ctx.fill();
  ctx.lineWidth = Math.max(1, .05 * s); ctx.lineCap = 'round';
  for (const col of ['#4a3826', '#7b5d3c']) { ctx.strokeStyle = col; ctx.beginPath();
    for (let k = 0; k < 12; k++) { const a = rnd() * Math.PI, x = cu + (rnd() - .5) * r * .9, y = ct + (rnd() - .5) * r * .7, l = .25 + rnd() * r * .35; ctx.moveTo(...LP(h, x - Math.cos(a) * l, y - Math.sin(a) * l)); ctx.lineTo(...LP(h, x + Math.cos(a) * l, y + Math.sin(a) * l)); }
    ctx.stroke(); }
  ctx.lineCap = 'butt';
  if (s > 2.5) { for (let k = 0; k < 18; k++) { const [X, Y] = LP(h, cu + (rnd() - .5) * r * 1.5, ct + (rnd() - .5) * r * 1.2); ctx.fillStyle = rnd() < .5 ? '#7f8a4a' : '#9a8f4e'; ctx.fillRect(X, Y, Math.max(1, .18 * s), Math.max(1, .12 * s)); } }
  pathS(P); ctx.strokeStyle = 'rgba(40,30,18,.5)'; ctx.lineWidth = 1; ctx.stroke();
}
// hache posée au sol : manche de bois, fer sombre
function axeLT(h, cu, ct, a) {
  if (view.s < 1.8) return;
  const du = Math.cos(a), dt = Math.sin(a), at = (x, y) => [cu + du * x - dt * y, ct + dt * x + du * y];
  ctx.strokeStyle = '#8a6a45'; ctx.lineWidth = lw(.09); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(...LP(h, ...at(-.45, 0))); ctx.lineTo(...LP(h, ...at(.45, 0))); ctx.stroke(); ctx.lineCap = 'butt';
  pathS(lpts(h, [at(.3, -.06), at(.46, -.06), at(.5, .22), at(.26, .22)])); ctx.fillStyle = '#5d6264'; ctx.fill(); ctx.strokeStyle = '#2a2a28'; ctx.lineWidth = 1; ctx.stroke();
}
// carré de potager : terre retournée sombre, rangs de légumes le long de u, bordure de planches
function vegPatchLT(h, u0, t0, u1, t1) {
  const s = view.s, rnd = seeded(Math.round(u0 * 7 + t0 * 13 + h.x + h.y)), P = lpts(h, [[u0, t0], [u1, t0], [u1, t1], [u0, t1]]);
  pathS(P); ctx.fillStyle = '#7d6446'; ctx.fill();
  if (s > 1.5) for (let t = t0 + .25, k = 0; t < t1 - .1; t += .4, k++) {
    ctx.strokeStyle = 'rgba(70,52,34,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(...LP(h, u0 + .1, t + .2)); ctx.lineTo(...LP(h, u1 - .1, t + .2)); ctx.stroke(); // sillon
    if (s > 2.5) { const g = ['#6f8a3e', '#86a04a', '#5d7a38'][k % 3]; for (let u = u0 + .2; u < u1 - .1; u += .28) { const [X, Y] = LP(h, u + (rnd() - .5) * .06, t); const r = Math.max(1, (.1 + rnd() * .06) * s); ctx.fillStyle = g; ctx.fillRect(X - r, Y - r, r * 2, r * 2); } }
  }
  pathS(P); ctx.strokeStyle = '#6b5236'; ctx.lineWidth = lw(.1); ctx.stroke();
}
// ovale (vu de dessus) centré en (cu, ct) dans un repère tourné (at), en points écran
const ovalS = (h, at, cx, cy, rx, ry, n = 10) => { const P = []; for (let i = 0; i < n; i++) { const b = i / n * Math.PI * 2; P.push(at(cx + Math.cos(b) * rx, cy + Math.sin(b) * ry)); } return lpts(h, P); };
// bête vue de dessus (poule, chèvre…) : corps ovale, tête vers l'angle a, ombre ; deco(at) ajoute cornes, crête
function beastLT(h, u, t, a, len, wid, body, head, deco) {
  const du = Math.cos(a), dt = Math.sin(a), at = (x, y) => [u + du * x - dt * y, t + dt * x + du * y];
  const B = ovalS(h, at, 0, 0, len / 2, wid / 2), H = ovalS(h, at, len / 2 + wid * .22, 0, wid * .3, wid * .24, 8);
  pathS(shiftS(B, .1, .13)); ctx.fillStyle = WOOD.shadow; ctx.fill();
  for (const [P, c] of [[B, body], [H, head || body]]) { pathS(P); ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.025); ctx.stroke(); }
  if (deco && view.s > 2.5) deco(at);
}
const henLT = (h, u, t, a, col) => beastLT(h, u, t, a, .34, .22, col, col, at => { pathS(lpts(h, [at(.3, -.03), at(.36, -.03), at(.36, .03), at(.3, .03)])); ctx.fillStyle = '#c23b2a'; ctx.fill(); });
const goatLT = (h, u, t, a, col) => beastLT(h, u, t, a, .95, .4, col, col, at => { ctx.strokeStyle = '#3b3228'; ctx.lineWidth = lw(.04); ctx.beginPath(); for (const e of [-.06, .06]) { ctx.moveTo(...LP(h, ...at(.72, e))); ctx.lineTo(...LP(h, ...at(.58, e * 2.4))); } ctx.stroke(); });
// arbre fruitier : houppier bosselé, reflet au nord-ouest, fruits rouges
function fruitTreeLT(h, cu, ct, r) {
  const s = view.s, rnd = seeded(Math.round(cu * 37 + ct * 11 + h.x + h.y)), c = [], hi = [];
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, k = .86 + rnd() * .16 + .06 * Math.sin(i * 2.7); c.push([cu + Math.cos(a) * r * k, ct + Math.sin(a) * r * k]); hi.push([cu + Math.cos(a) * r * k * .55, ct + Math.sin(a) * r * k * .55]); }
  const C = lpts(h, c);
  pathS(shiftS(C, r * .45, r * .55)); ctx.fillStyle = 'rgba(40,44,20,.3)'; ctx.fill();
  pathS(C); ctx.fillStyle = '#6a8741'; ctx.fill(); ctx.strokeStyle = '#3d5026'; ctx.lineWidth = lw(.06); ctx.stroke();
  pathS(shiftS(lpts(h, hi), -r * .22, -r * .25)); ctx.fillStyle = '#84a150'; ctx.fill();
  if (s > 2) { ctx.fillStyle = 'rgba(45,62,28,.35)'; for (let k = 0; k < 14; k++) { const [X, Y] = LP(h, cu + (rnd() - .5) * r * 1.4, ct + (rnd() - .5) * r * 1.4); ctx.fillRect(X, Y, Math.max(1, .2 * s), Math.max(1, .14 * s)); } }
  if (s > 1.5) {                                                                              // fruits semés sur tout le houppier, jamais en grappe
    const pts = [], gap = r * .42, e = Math.max(1, .13 * s);
    for (let k = 0; k < 60 && pts.length < 8; k++) { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r * .82, p = [cu + Math.cos(a) * d, ct + Math.sin(a) * d]; if (pts.every(q => Math.hypot(q[0] - p[0], q[1] - p[1]) >= gap)) pts.push(p); }
    ctx.fillStyle = '#b9402b'; for (const p of pts) { const [X, Y] = LP(h, ...p); ctx.fillRect(X - e / 2, Y - e / 2, e, e); }
  }
}
// tas (fumier, compost, charbon, foin…) : monticule irrégulier, crête plus claire
function heapLT(h, cu, ct, ru, rt, col, hiCol) {
  const rnd = seeded(Math.round(cu * 23 + ct * 29 + h.x)), P = [], Q = [];
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, k = .82 + rnd() * .3; P.push([cu + Math.cos(a) * ru * k, ct + Math.sin(a) * rt * k]); Q.push([cu - ru * .15 + Math.cos(a) * ru * .5 * k, ct - rt * .15 + Math.sin(a) * rt * .5 * k]); }
  pathS(shiftS(lpts(h, P), .3, .4)); ctx.fillStyle = WOOD.shadow; ctx.fill();
  pathS(lpts(h, P)); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = 'rgba(40,30,18,.55)'; ctx.lineWidth = lw(.05); ctx.stroke();
  pathS(lpts(h, Q)); ctx.fillStyle = hiCol; ctx.fill();
}
// auge ou cuve de bois (eau, grain, tan…)
function troughLT(h, u0, t0, u1, t1, fill) {
  beamLT(h, u0, t0, u1, t1);
  const e = Math.min(.12, (Math.min(u1 - u0, t1 - t0)) * .22);
  pathS(lpts(h, [[u0 + e, t0 + e], [u1 - e, t0 + e], [u1 - e, t1 - e], [u0 + e, t1 - e]])); ctx.fillStyle = fill; ctx.fill();
}
// tonneau debout : couvercle de douelles, cercles de fer
function barrelLT(h, cu, ct, r) {
  const s = view.s, [X, Y] = LP(h, cu, ct), R = Math.max(1.5, r * s);
  ctx.beginPath(); ctx.arc(X + .25 * s, Y + .3 * s, R, 0, Math.PI * 2); ctx.fillStyle = WOOD.shadow; ctx.fill();
  ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2); ctx.fillStyle = '#94693f'; ctx.fill(); ctx.strokeStyle = '#2f2a24'; ctx.lineWidth = Math.max(1, .07 * s); ctx.stroke();
  if (s > 2.5) { ctx.strokeStyle = 'rgba(50,34,20,.55)'; ctx.lineWidth = 1; ctx.beginPath(); for (const k of [-.5, 0, .5]) { ctx.moveTo(X + k * R, Y - Math.sqrt(1 - k * k) * R * .92); ctx.lineTo(X + k * R, Y + Math.sqrt(1 - k * k) * R * .92); } ctx.stroke();
    ctx.beginPath(); ctx.arc(X, Y, R * .82, 0, Math.PI * 2); ctx.strokeStyle = '#3a342c'; ctx.stroke(); }
}
// enclume sur son billot équarri
function anvilLT(h, cu, ct) {
  beamLT(h, cu - .3, ct - .3, cu + .3, ct + .3);
  const P = lpts(h, [[cu - .32, ct - .11], [cu + .12, ct - .13], [cu + .42, ct], [cu + .12, ct + .13], [cu - .32, ct + .11]]);
  pathS(shiftS(P, .1, .12)); ctx.fillStyle = WOOD.shadow; ctx.fill();
  pathS(P); ctx.fillStyle = '#4c5053'; ctx.fill(); ctx.strokeStyle = '#1f2123'; ctx.lineWidth = lw(.03); ctx.stroke();
}
// four à pain en coupole d'argile, gueule noire tournée vers t0
function ovenLT(h, cu, ct, r) {
  heapLT(h, cu, ct, r, r, '#b47c55', '#cf9a6e');
  if (view.s > 2) { ctx.strokeStyle = 'rgba(90,55,30,.45)'; ctx.lineWidth = 1; ctx.beginPath(); const [X, Y] = LP(h, cu, ct); ctx.arc(X, Y, r * .55 * view.s, 0, Math.PI * 2); ctx.stroke(); }
  pathS(lpts(h, [[cu - .3, ct - r - .05], [cu + .3, ct - r - .05], [cu + .25, ct - r + .35], [cu - .25, ct - r + .35]])); ctx.fillStyle = '#231c16'; ctx.fill();
}
// peau tendue sur un cadre de perches, lacée aux bords
function hideFrameLT(h, cu, ct, a) {
  const s = view.s, rnd = seeded(Math.round(cu * 13 + ct * 19)), P = [];
  for (let i = 0; i < 12; i++) { const b = i / 12 * Math.PI * 2, k = .72 + rnd() * .2; P.push([cu + Math.cos(b) * a * k, ct + Math.sin(b) * a * 1.1 * k]); }
  if (s > 2) { ctx.strokeStyle = 'rgba(60,44,28,.6)'; ctx.lineWidth = 1; ctx.beginPath(); for (const p of P) { const q = [cu + Math.sign(p[0] - cu) * a, ct + Math.sign(p[1] - ct) * a * 1.15]; ctx.moveTo(...LP(h, ...p)); ctx.lineTo(...LP(h, ...(Math.abs(p[0] - cu) > Math.abs(p[1] - ct) / 1.1 ? [q[0], p[1]] : [p[0], q[1]]))); } ctx.stroke(); }
  pathS(lpts(h, P)); ctx.fillStyle = '#c49a6a'; ctx.fill(); ctx.strokeStyle = '#7a5836'; ctx.lineWidth = lw(.04); ctx.stroke();
  ctx.strokeStyle = WOOD.fence; ctx.lineWidth = lw(.1); pathS(lpts(h, [[cu - a, ct - a * 1.15], [cu + a, ct - a * 1.15], [cu + a, ct + a * 1.15], [cu - a, ct + a * 1.15]])); ctx.stroke();
}
// corde à linge entre deux piquets, étoffes teintes qui sèchent
function clothLineLT(h, u0, u1, t, cols) {
  const s = view.s;
  ctx.strokeStyle = '#6b5a44'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(...LP(h, u0, t)); ctx.lineTo(...LP(h, u1, t)); ctx.stroke();
  const n = cols.length, w = (u1 - u0 - .4) / n;
  cols.forEach((c, k) => { const a = u0 + .2 + k * w + .06, b = a + w - .12, P = lpts(h, [[a, t - .06], [b, t - .06], [b, t + .14], [a, t + .14]]);
    pathS(shiftS(P, .15, .7)); ctx.fillStyle = 'rgba(40,34,24,.22)'; ctx.fill();
    pathS(P); ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = 'rgba(30,24,18,.5)'; ctx.lineWidth = 1; ctx.stroke(); });
  ctx.fillStyle = WOOD.edge; for (const u of [u0, u1]) { const e = .1; pathS(lpts(h, [[u - e, t - e], [u + e, t - e], [u + e, t + e], [u - e, t + e]])); ctx.fill(); }
}
// butte de tir en paille tressée : cercles rouge et blanc
function targetLT(h, cu, ct, r) {
  const s = view.s, [X, Y] = LP(h, cu, ct);
  for (const [k, c] of [[1, '#d6bd7e'], [.66, '#f0e6c8'], [.38, '#b9402b'], [.14, '#f0e6c8']]) { ctx.beginPath(); ctx.arc(X, Y, Math.max(1, r * k * s), 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); if (k === 1) { ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.05); ctx.stroke(); } }
}
// faisceau de flèches / de baguettes posées, empennage clair
function arrowsLT(h, cu, ct, len, n) {
  const s = view.s; if (s < 2) return;
  ctx.lineWidth = 1;
  for (let k = 0; k < n; k++) { const y = ct + (k - n / 2) * .09;
    ctx.strokeStyle = '#8a6a45'; ctx.beginPath(); ctx.moveTo(...LP(h, cu - len / 2, y)); ctx.lineTo(...LP(h, cu + len / 2, y)); ctx.stroke();
    ctx.strokeStyle = '#e8e0cc'; ctx.beginPath(); ctx.moveTo(...LP(h, cu - len / 2, y)); ctx.lineTo(...LP(h, cu - len / 2 + .18, y)); ctx.stroke(); }
}
/* arrière-cour : dessinée dans un repère propre (x sur le petit côté, y sur le long côté,
   y = 0 côté maison), qu'on retourne pour les cours plus larges que profondes (grande maison) */
function yardLT(h, kind, U0, T0, U1, T1) {
  const port = (T1 - T0) >= (U1 - U0), Wy = port ? U1 - U0 : T1 - T0, Ly = port ? T1 - T0 : U1 - U0;
  const Q = (x, y) => port ? [U0 + x, T0 + y] : [U0 + y, T0 + x];
  const R = (x0, y0, x1, y1) => { const a = Q(x0, y0), b = Q(x1, y1); return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]; };
  const s = view.s, rnd = seeded(Math.round(h.x * 7 + h.y * 3) + kind.length), cx = Wy / 2;
  const alongY = port ? 't' : 'u', alongX = port ? 'u' : 't';
  const shed = (y0, straw) => thatchLT(h, ...R(.2, y0, Wy - .2, Ly - .15), alongX, straw || STRAW);
  const craftShop = () => { const r = R(.25, Ly - 6, Wy - .25, Ly - .15); gableLT(h, ...r); return r; };
  const spots = (n, y0, y1) => Array.from({ length:n }, () => Q(.6 + rnd() * (Wy - 1.2), y0 + rnd() * (y1 - y0)));
  switch (kind) {
    case 'potager': {
      for (let y = .5; y + 3 < Ly - 2; y += 3.6) { vegPatchLT(h, ...R(.3, y, cx - .45, y + 3)); vegPatchLT(h, ...R(cx + .45, y, Wy - .3, y + 3)); }
      heapLT(h, ...Q(Wy - 1.3, Ly - 1.1), .9, .8, '#5e4a33', '#735c40');                        // compost
      barrelLT(h, ...Q(.9, Ly - 1), .42);                                                        // tonneau d'eau de pluie
      break;
    }
    case 'verger': {
      for (let y = 2, k = 0; y < Ly - 1.2; y += 3.6, k++) for (const x of k % 2 ? [Wy * .3, Wy * .74] : [Wy * .26, Wy * .7]) fruitTreeLT(h, ...Q(x, y), 1.55);
      if (s > 2) { const [u, t] = Q(cx, Ly - .8); heapLT(h, u, t, .35, .35, '#b08a50', '#c9a468'); }   // panier
      break;
    }
    case 'poulailler': {
      shed(Ly - 3.2);
      troughLT(h, ...R(.6, Ly - 4.6, 2.4, Ly - 4.2), '#c9b070');                                // mangeoire
      if (s > 2) { ctx.fillStyle = '#d9c68c'; for (let k = 0; k < 40; k++) { const [X, Y] = LP(h, ...Q(.5 + rnd() * (Wy - 1), .5 + rnd() * (Ly - 4.5))); ctx.fillRect(X, Y, Math.max(1, .07 * s), Math.max(1, .07 * s)); } } // grain
      spots(10, .8, Ly - 4.2).forEach(([u, t], k) => henLT(h, u, t, rnd() * Math.PI * 2, ['#efe9dc', '#a9683a', '#efe9dc', '#5b4432'][k % 4]));
      break;
    }
    case 'chevres': {
      shed(Ly - 3.8, OLD_STRAW);
      heapLT(h, ...Q(1.5, Ly - 5), 1, .8, '#c7b26a', '#dccb86');                               // foin
      troughLT(h, ...R(Wy - 1.1, 1, Wy - .5, 3.4), '#6f969c');                                  // abreuvoir
      spots(5, 1, Ly - 6).forEach(([u, t], k) => goatLT(h, u, t, rnd() * Math.PI * 2, ['#ece6d8', '#7a5a3c', '#b89a74', '#ece6d8', '#4d3d30'][k]));
      if (s > 2) { ctx.fillStyle = '#5a4630'; for (let k = 0; k < 18; k++) { const [X, Y] = LP(h, ...Q(.5 + rnd() * (Wy - 1), .5 + rnd() * (Ly - 5))); ctx.fillRect(X, Y, Math.max(1, .08 * s), Math.max(1, .08 * s)); } } // crottes
      break;
    }
    default: {                                                                                   // ateliers : échoppe au fond, cour de travail devant
      const shop = craftShop(), yc = (Ly - 6) / 2;
      if (kind === 'menuisier') {
        for (let k = 0; k < 3; k++) beamLT(h, ...R(.5 + k * .6, .6, .95 + k * .6, 5.5 - k * .4));
        trestleLT(h, ...Q(cx + 1, yc + 1), 2.2); if (s > 1.5) offcutsLT(h, ...Q(cx + 1, yc + 1.4), 1.2, 7, 31);
        planksLT(h, ...R(Wy - 1.7, .6, Wy - .5, 4.2));
      } else if (kind === 'flechier') {
        targetLT(h, ...Q(cx, .9), .6);
        for (let k = 0; k < 6; k++) beamLT(h, ...R(.6 + k * .28, 2.6, .72 + k * .28, 6.6));       // douelles d'arcs qui sèchent
        const [u, t] = Q(Wy - 1.6, yc + 1); arrowsLT(h, u, t, 1.1, 7);
        cordwoodLT(h, ...R(Wy - 1.3, .5, Wy - .5, 2.6));
      } else if (kind === 'brasserie') {
        for (const [x, y] of [[.8, .9], [1.8, .9], [1.3, 1.8], [Wy - .9, 1], [Wy - .9, 2]]) barrelLT(h, ...Q(x, y), .42);
        troughLT(h, ...R(cx - .9, yc, cx + .9, yc + 1.4), '#8a6a3a');                            // cuve de brassage
        heapLT(h, ...Q(Wy - 1.3, yc + 2), .7, .6, '#c9a15e', '#dcb878');                        // drêche
        cordwoodLT(h, ...R(.4, yc + 1.8, 1, Ly - 6.6));
      } else if (kind === 'cordonnier') {
        hideFrameLT(h, ...Q(1.4, 1.6), .9); hideFrameLT(h, ...Q(Wy - 1.4, 2.2), .9);
        troughLT(h, ...R(cx - 1.1, yc + 1, cx + 1.1, yc + 2.3), '#6a4a2c'); troughLT(h, ...R(cx - 1.1, yc + 2.6, cx + 1.1, yc + 3.6), '#8b6a3e'); // fosses à tan
      } else if (kind === 'tailleur') {
        const [a] = Q(.4, 0), [b] = Q(Wy - .4, 0);
        if (port) { clothLineLT(h, a, b, T0 + 1.2, ['#8a3b2e', '#3f5d7a', '#c9b27a']); clothLineLT(h, a, b, T0 + 3, ['#e6dcc4', '#5d7a3f', '#8a3b2e']); }
        else { clothLineLT(h, U0 + 1, U0 + 5, T0 + 1.2, ['#8a3b2e', '#3f5d7a', '#c9b27a']); clothLineLT(h, U0 + 1, U0 + 5, T0 + 3, ['#e6dcc4', '#5d7a3f', '#8a3b2e']); }
        heapLT(h, ...Q(Wy - 1.3, yc + 1.6), .7, .6, '#ece6d8', '#f8f4ea');                      // laine
        troughLT(h, ...R(.6, yc + 1.2, 2, yc + 2.4), '#3f5d7a');                                 // cuve de teinture
      } else if (kind === 'boulangerie') {
        ovenLT(h, ...Q(cx, yc + .8), 1.3);
        cordwoodLT(h, ...R(.4, .5, 1, 4)); cordwoodLT(h, ...R(Wy - 1, .5, Wy - .4, 3.4));
      } else {                                                                                   // forgeron, armurier
        anvilLT(h, ...Q(cx, yc + 1.6));
        heapLT(h, ...Q(1.2, 1.2), .8, .7, '#2c2926', '#45403a');                                 // charbon de bois
        troughLT(h, ...R(Wy - 1.3, yc + .6, Wy - .6, yc + 2.4), '#56777c');                        // bac de trempe
        if (kind === 'armurier') { for (let k = 0; k < 3; k++) { const [u, t] = Q(1 + k * .9, yc + 3.2); ctx.fillStyle = ['#7a2e24', '#3f5d7a', '#8a8f92'][k]; pathS(lpts(h, [[u - .3, t - .3], [u + .3, t - .3], [u + .3, t + .15], [u, t + .4], [u - .3, t + .15]])); ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.04); ctx.stroke(); } }
        else beamLT(h, ...R(Wy - 1.2, .5, Wy - .6, 3));                                            // barres de fer
        const [u, t] = port ? [shop[0] + 1, (shop[1] + shop[3]) / 2] : [(shop[0] + shop[2]) / 2, shop[1] + 1];
        chimneyLT(h, u, t, .6);
        if (s > 1.5) { const [X, Y] = LP(h, u, t); ctx.fillStyle = 'rgba(230,110,40,.55)'; ctx.fillRect(X - .15 * s, Y - .15 * s, .3 * s, .3 * s); } // lueur de la forge
      }
    }
  }
}
// pile de poutres équarries sur deux cales, le long de u
function beamStackLT(h, u0, t0, u1, n, wd) {
  for (const u of [u0 + .8, u1 - .8]) { pathS(lpts(h, [[u - .15, t0 - .3], [u + .15, t0 - .3], [u + .15, t0 + n * (wd + .08) + .2], [u - .15, t0 + n * (wd + .08) + .2]])); ctx.fillStyle = WOOD.sticker; ctx.fill(); }
  for (let k = 0; k < n; k++) { const t = t0 + k * (wd + .08), j = (k * 5 % 3) * .15; beamLT(h, u0 + j, t, u1 - j * .7, t + wd); }
}
const shiftS = (P, dx, dy) => P.map(([X, Y]) => [X + dx * view.s, Y + dy * view.s]); // décalage en mètres (écran)
const pathS = P => { ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath(); };
const lpts = (h, pts) => pts.map(([u, t]) => LP(h, u, t));
const lw = k => Math.max(.6, Math.min(2, view.s * k)); // épaisseur de trait qui suit un peu le zoom
// toit à deux pans (faîtage dans l'axe le plus long, ou imposé) : pan éclairé au nord-ouest,
// pan à l'ombre, rangs de bardeaux parallèles au faîtage, débord et ombre portée
function gableLT(h, u0, t0, u1, t1, along, sh = 1) { // sh : longueur de l'ombre (1 = bâtiment, moins pour un petit toit bas)
  const ridgeT = along ? along === 't' : (t1 - t0) >= (u1 - u0), s = view.s;
  const all = lpts(h, [[u0, t0], [u1, t0], [u1, t1], [u0, t1]]);
  pathS(shiftS(all, 1.4 * sh, 1.8 * sh)); ctx.fillStyle = WOOD.shadow; ctx.fill();             // ombre portée
  const cu = (u0 + u1) / 2, ct = (t0 + t1) / 2;
  const pans = ridgeT ? [[[u0, t0], [cu, t0], [cu, t1], [u0, t1]], [[cu, t0], [u1, t0], [u1, t1], [cu, t1]]]
                      : [[[u0, t0], [u1, t0], [u1, ct], [u0, ct]], [[u0, ct], [u1, ct], [u1, t1], [u0, t1]]];
  // quel pan regarde le nord-ouest ? (normale du pan, dans le monde)
  const toward = p => { const a = LP(h, ...p), c = LP(h, cu, ct); return (a[0] - c[0]) * -1 + (a[1] - c[1]) * -1; };
  pans.forEach((pan, k) => {
    const mid = [pan.reduce((s2, p) => s2 + p[0], 0) / 4, pan.reduce((s2, p) => s2 + p[1], 0) / 4];
    pathS(lpts(h, pan)); ctx.fillStyle = toward(mid) > 0 ? WOOD.roofHi : WOOD.roofLo; ctx.fill();
    if (s > 1.2) { // rangs de bardeaux
      ctx.strokeStyle = WOOD.roofLine; ctx.lineWidth = 1; ctx.beginPath();
      if (ridgeT) { const [a, b] = [pan[0][0], pan[1][0]]; for (let u = Math.min(a, b) + .8; u < Math.max(a, b); u += .8) { ctx.moveTo(...LP(h, u, t0)); ctx.lineTo(...LP(h, u, t1)); } }
      else { const [a, b] = [pan[0][1], pan[2][1]]; for (let t = Math.min(a, b) + .8; t < Math.max(a, b); t += .8) { ctx.moveTo(...LP(h, u0, t)); ctx.lineTo(...LP(h, u1, t)); } }
      ctx.stroke();
      if (s > 3) { // joints décalés des bardeaux
        ctx.beginPath();
        if (ridgeT) for (let u = Math.min(pan[0][0], pan[1][0]); u < Math.max(pan[0][0], pan[1][0]); u += .8) for (let t = t0 + ((u * 1.25) % 1 + 1) % 1 * .9; t < t1; t += 1.8) { ctx.moveTo(...LP(h, u, t)); ctx.lineTo(...LP(h, u + .8, t)); }
        else for (let t = Math.min(pan[0][1], pan[2][1]); t < Math.max(pan[0][1], pan[2][1]); t += .8) for (let u = u0 + ((t * 1.25) % 1 + 1) % 1 * .9; u < u1; u += 1.8) { ctx.moveTo(...LP(h, u, t)); ctx.lineTo(...LP(h, u, t + .8)); }
        ctx.stroke();
      }
    }
  });
  if (s > 1.5) { // nuances : certains rangs de bardeaux plus sombres ou plus clairs (bois patiné)
    const rnd = seeded(Math.round((u0 + t0) * 31 + h.x));
    const across = ridgeT ? [u0, u1] : [t0, t1];
    for (let v = across[0]; v < across[1] - .4; v += .8) {
      const k = rnd(); if (k > .35) continue;
      ctx.fillStyle = k < .18 ? 'rgba(40,30,20,.09)' : 'rgba(255,245,220,.08)';
      const along = ridgeT ? [t0, t1] : [u0, u1], a = along[0] + rnd() * (along[1] - along[0]) * .6, b = Math.min(along[1], a + 2 + rnd() * 6);
      pathS(lpts(h, ridgeT ? [[v, a], [v + .8, a], [v + .8, b], [v, b]] : [[a, v], [b, v], [b, v + .8], [a, v + .8]])); ctx.fill();
    }
  }
  // faîtière : une bande claire sur le faîtage
  const rc = .35, ridge = ridgeT ? [[cu - rc, t0], [cu + rc, t0], [cu + rc, t1], [cu - rc, t1]] : [[u0, ct - rc], [u1, ct - rc], [u1, ct + rc], [u0, ct + rc]];
  pathS(lpts(h, ridge)); ctx.fillStyle = '#b09a78'; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.1); ctx.stroke();
  // égout : un fin liseré sombre le long du bord du toit
  if (s > 2) { const e = .35; pathS(lpts(h, [[u0 + e, t0 + e], [u1 - e, t0 + e], [u1 - e, t1 - e], [u0 + e, t1 - e]])); ctx.strokeStyle = 'rgba(40,30,20,.35)'; ctx.lineWidth = 1; ctx.stroke(); }
  pathS(all); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.2); ctx.stroke();
}
// chevalet de sciage (deux tréteaux en X) avec une grume posée en travers
function trestleLT(h, cu, ct, len) {
  ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.12); ctx.beginPath();
  for (const e of [-1, 1]) { const u = cu + e * len * .32; for (const d of [-1, 1]) { ctx.moveTo(...LP(h, u - .5, ct + d * .7)); ctx.lineTo(...LP(h, u + .5, ct - d * .7)); } }
  ctx.stroke();
  logLT(h, cu - len / 2, ct, cu + len / 2, ct, .32);
}
// chutes de sciage éparpillées : petites planches claires, orientées au hasard
function offcutsLT(h, cu, ct, rad, n, seed) {
  const rnd = seeded(seed);
  for (let k = 0; k < n; k++) {
    const u = cu + (rnd() - .5) * 2 * rad, t = ct + (rnd() - .5) * 2 * rad, a = rnd() * Math.PI, L = .6 + rnd() * 1.2, w = .18;
    const du = Math.cos(a) * L / 2, dt = Math.sin(a) * L / 2, nu = -Math.sin(a) * w, nt = Math.cos(a) * w;
    pathS(lpts(h, [[u - du + nu, t - dt + nt], [u + du + nu, t + dt + nt], [u + du - nu, t + dt - nt], [u - du - nu, t - dt - nt]]));
    ctx.fillStyle = k % 3 ? WOOD.plank : WOOD.grain; ctx.fill(); ctx.strokeStyle = WOOD.plankLine; ctx.lineWidth = 1; ctx.stroke();
  }
}
// grume (cylindre couché) de A à B, rayon r : écorce, reflet, fibres
function logLT(h, ua, ta, ub, tb, r) {
  const L = Math.hypot(ub - ua, tb - ta) || 1, nu = -(tb - ta) / L * r, nt = (ub - ua) / L * r, s = view.s;
  pathS(shiftS(lpts(h, [[ua + nu, ta + nt], [ub + nu, tb + nt], [ub - nu, tb - nt], [ua - nu, ta - nt]]), .35, .45)); ctx.fillStyle = WOOD.shadow; ctx.fill();
  pathS(lpts(h, [[ua + nu, ta + nt], [ub + nu, tb + nt], [ub - nu, tb - nt], [ua - nu, ta - nt]]));
  ctx.fillStyle = WOOD.bark; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.08); ctx.stroke();
  if (r * s > 2) {
    pathS(lpts(h, [[ua + nu * .9, ta + nt * .9], [ub + nu * .9, tb + nt * .9], [ub + nu * .35, tb + nt * .35], [ua + nu * .35, ta + nt * .35]]));
    ctx.fillStyle = WOOD.barkHi; ctx.fill();                                                    // reflet
    ctx.strokeStyle = WOOD.barkLo; ctx.lineWidth = 1; ctx.beginPath();                          // fibres de l'écorce
    for (const k of [-.45, .1]) { ctx.moveTo(...LP(h, ua + nu * k + (ub - ua) * .08, ta + nt * k + (tb - ta) * .08)); ctx.lineTo(...LP(h, ua + nu * k + (ub - ua) * .7, ta + nt * k + (tb - ta) * .7)); }
    ctx.stroke();
  }
}
// tas de grumes : rangées couchées le long de u, bouts sciés côté u1 ; chaque rangée du dessus
// en compte une de moins et se cale entre deux grumes de la rangée du dessous
function logPileLT(h, u0, u1, t0, n, r) {
  for (let row = 0; row < n; row++) for (let k = 0; k < n - row; k++) {
    const t = t0 + r + k * 2 * r + row * r, j = (k * 7 + row * 3) % 5 * .12;
    logLT(h, u0 + j + row * .2, t, u1 - j * .6 - row * .15, t, r * (.92 + ((k + row) % 3) * .05));
  }
}
// pile de planches en séchage : planches visibles, liteaux sombres en travers
function planksLT(h, u0, t0, u1, t1) {
  const s = view.s, P = lpts(h, [[u0, t0], [u1, t0], [u1, t1], [u0, t1]]);
  pathS(shiftS(P, .5, .7)); ctx.fillStyle = WOOD.shadow; ctx.fill();
  pathS(P); ctx.fillStyle = WOOD.plank; ctx.fill();
  if (s > 2) { ctx.strokeStyle = WOOD.plankLine; ctx.lineWidth = 1; ctx.beginPath(); for (let u = u0 + .3; u < u1; u += .3) { ctx.moveTo(...LP(h, u, t0)); ctx.lineTo(...LP(h, u, t1)); } ctx.stroke(); }
  for (let t = t0 + .5; t < t1; t += 1.6) { pathS(lpts(h, [[u0 - .1, t], [u1 + .1, t], [u1 + .1, t + .18], [u0 - .1, t + .18]])); ctx.fillStyle = WOOD.sticker; ctx.fill(); }
  pathS(P); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.1); ctx.stroke();
}
// tas de sciure : monticule clair, bord irrégulier, crête plus claire
function sawdustLT(h, cu, ct, ru, rt) {
  const pts = [], hi = [];
  for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2, k = 1 + .12 * Math.sin(a * 3 + 1) + .06 * Math.sin(a * 7); pts.push([cu + Math.cos(a) * ru * k, ct + Math.sin(a) * rt * k]); hi.push([cu - ru * .15 + Math.cos(a) * ru * .45 * k, ct - rt * .15 + Math.sin(a) * rt * .45 * k]); }
  pathS(shiftS(lpts(h, pts), .4, .5)); ctx.fillStyle = WOOD.shadow; ctx.fill();
  pathS(lpts(h, pts)); ctx.fillStyle = WOOD.dust; ctx.fill(); ctx.strokeStyle = WOOD.ring; ctx.lineWidth = lw(.08); ctx.stroke();
  pathS(lpts(h, hi)); ctx.fillStyle = WOOD.dustHi; ctx.fill();
}
// charrette (plateau de planches, deux roues, brancards) chargée de deux grumes, dans l'axe t
function cartLT(h, cu, t0, load) {
  const s = view.s;
  for (const e of [-1, 1]) { const [X, Y] = LP(h, cu + e * 1.05, t0 + 2); ctx.beginPath(); ctx.ellipse(X, Y, Math.max(1, .2 * s), Math.max(1.5, .75 * s), Math.atan2(...(() => { const a = LP(h, 0, 0), b = LP(h, 0, 1); return [b[1] - a[1], b[0] - a[0]]; })()) - Math.PI / 2, 0, Math.PI * 2); ctx.fillStyle = WOOD.edge; ctx.fill(); }
  ctx.strokeStyle = WOOD.fence; ctx.lineWidth = lw(.14); ctx.beginPath();
  for (const e of [-.5, .5]) { ctx.moveTo(...LP(h, cu + e, t0 + .4)); ctx.lineTo(...LP(h, cu + e * .7, t0 - 1.8)); }  // brancards
  ctx.stroke();
  const P = lpts(h, [[cu - .9, t0 + .4], [cu + .9, t0 + .4], [cu + .9, t0 + 3.6], [cu - .9, t0 + 3.6]]);
  pathS(shiftS(P, .4, .5)); ctx.fillStyle = WOOD.shadow; ctx.fill();
  pathS(P); ctx.fillStyle = WOOD.cart; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.1); ctx.stroke();
  if (s > 2.5) { ctx.strokeStyle = WOOD.plankLine; ctx.lineWidth = 1; ctx.beginPath(); for (let u = cu - .9 + .45; u < cu + .9; u += .45) { ctx.moveTo(...LP(h, u, t0 + .4)); ctx.lineTo(...LP(h, u, t0 + 3.6)); } ctx.stroke(); }
  if (load === 'sacs') { for (const [u, t, c] of [[-.4, .9], [.42, 1.1, '#e8e2d2'], [-.38, 1.9, '#e8e2d2'], [.4, 2.1], [-.4, 2.9], [.4, 3.1, '#e8e2d2']]) sackLT(h, cu + u, t0 + t, .36, c); return; }
  logLT(h, cu - .38, t0 + .2, cu - .38, t0 + 3.9, .34); logLT(h, cu + .38, t0 + .1, cu + .38, t0 + 3.8, .32);
}
// clôture de perches : lisses et poteaux, ouverte sur [gap0, gap1] côté rue
function railFenceLT(h, u0, t0, u1, t1, gap0, gap1) {
  const s = view.s, runs = [[[u0, t0], [gap0, t0]], [[gap1, t0], [u1, t0]], [[u1, t0], [u1, t1]], [[u1, t1], [u0, t1]], [[u0, t1], [u0, t0]]];
  ctx.strokeStyle = WOOD.fence; ctx.lineWidth = lw(.12); ctx.beginPath();
  for (const [a, b] of runs) { ctx.moveTo(...LP(h, ...a)); ctx.lineTo(...LP(h, ...b)); }
  ctx.stroke();
  if (s > 1.5) for (const [a, b] of runs) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let d = 0; d <= L + .01; d += 2.4) { const p = [a[0] + (b[0] - a[0]) * d / L, a[1] + (b[1] - a[1]) * d / L]; const [X, Y] = LP(h, ...p); ctx.beginPath(); ctx.arc(X, Y, Math.max(.7, .16 * s), 0, Math.PI * 2); ctx.fillStyle = WOOD.edge; ctx.fill(); } }
}
/* ---------- éléments détaillés (suite) : pierre, toits en pavillon, bêtes, marchandises ---------- */
const STONE = { hi:'#bdb6a6', mid:'#9f988b', lo:'#7c766b', cap:'#c9c2b2', joint:'rgba(52,46,38,.5)' };
const SLATE = { hi:'#8a9095', lo:'#5f6569', mid:'#747a7f', line:'rgba(30,34,38,.4)', ridge:'#4d5256' };
const SHINGLE = { hi:WOOD.roofHi, lo:WOOD.roofLo, mid:WOOD.roof, line:WOOD.roofLine, ridge:'#b09a78' };
const GRASS = { lush:'#aab27c', dry:'#bcb88a', blade:'rgba(96,116,62,.45)', flower:['#e8e2c8', '#d9b84a', '#b9607a', '#8a8fc9'] };
// ajoute un polygone au chemin courant (sans beginPath) : plusieurs pièces remplies d'un coup
const addS = P => { P.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath(); };
// sol d'une parcelle : aplat au bord irrégulier, mouchetures (speck) quand on zoome
// (le sol propre aux bâtiments n'existe plus : le terrain de la région se voit tel quel ; fonction gardée pour les anciens appels)
function groundLT() {}
// herbe : touffes et fleurs des champs semées sur un rectangle
function tuftsLT(h, u0, t0, u1, t1, n, flowers) {
  const s = view.s; if (s < 2) return;
  const rnd = seeded(Math.round(u0 * 17 + t0 * 3 + h.x * 5 + h.y));
  ctx.fillStyle = GRASS.blade; for (let k = 0; k < n; k++) { const [X, Y] = LP(h, u0 + rnd() * (u1 - u0), t0 + rnd() * (t1 - t0)); ctx.fillRect(X, Y, Math.max(1, .12 * s), Math.max(1, .22 * s)); }
  if (flowers && s > 2.5) for (let k = 0; k < n / 2; k++) { const [X, Y] = LP(h, u0 + rnd() * (u1 - u0), t0 + rnd() * (t1 - t0)), e = Math.max(1, .12 * s); ctx.fillStyle = GRASS.flower[k % GRASS.flower.length]; ctx.fillRect(X - e / 2, Y - e / 2, e, e); }
}
// mur de pierres (tracé par ses points, épaisseur th) : ombre, parement, chaperon clair, joints
function stoneWallLT(h, pts, th, closed) {
  const s = view.s, n = pts.length, segs = [];
  for (let i = 0; i < n - (closed ? 0 : 1); i++) segs.push([pts[i], pts[(i + 1) % n]]);
  const quad = ([a, b], k) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), du = (b[0] - a[0]) / L, dt = (b[1] - a[1]) / L, e = th / 2 * k, x = th / 2;
    return [[a[0] - du * x - dt * e, a[1] - dt * x + du * e], [b[0] + du * x - dt * e, b[1] + dt * x + du * e], [b[0] + du * x + dt * e, b[1] + dt * x - du * e], [a[0] - du * x + dt * e, a[1] - dt * x - du * e]]; };
  ctx.beginPath(); for (const g of segs) addS(shiftS(lpts(h, quad(g, 1)), .45, .6)); ctx.fillStyle = WOOD.shadow; ctx.fill('nonzero');
  ctx.beginPath(); for (const g of segs) addS(lpts(h, quad(g, 1))); ctx.fillStyle = STONE.mid; ctx.fill('nonzero');
  ctx.beginPath(); for (const g of segs) addS(lpts(h, quad(g, .55))); ctx.fillStyle = STONE.cap; ctx.fill('nonzero');
  if (s > 2.2) { // joints : pierres de longueurs variées, rangées décalées
    const rnd = seeded(Math.round(h.x * 11 + h.y * 5 + th * 7));
    ctx.strokeStyle = STONE.joint; ctx.lineWidth = 1; ctx.beginPath();
    for (const [a, b] of segs) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), du = (b[0] - a[0]) / L, dt = (b[1] - a[1]) / L;
      for (const side of [-1, 1]) for (let d = rnd() * .5; d < L; d += .45 + rnd() * .5) { const e0 = side > 0 ? 0 : -th / 2, e1 = side > 0 ? th / 2 : 0;
        ctx.moveTo(...LP(h, a[0] + du * d - dt * e0, a[1] + dt * d + du * e0)); ctx.lineTo(...LP(h, a[0] + du * d - dt * e1, a[1] + dt * d + du * e1)); }
      ctx.moveTo(...LP(h, ...a)); ctx.lineTo(...LP(h, ...b)); }
    ctx.stroke();
  }
  ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.08); ctx.beginPath(); for (const g of segs) addS(lpts(h, quad(g, 1))); ctx.stroke();
}
// pan de toit (polygone P en coordonnées locales) : teinte selon l'orientation de sa normale
// (lumière du nord-ouest), rangs de couverture parallèles à l'égout [ea, eb]
function roofFaceLT(h, P, ea, eb, pal, cS) {
  const s = view.s, S = lpts(h, P), m = S.reduce((a, p) => [a[0] + p[0] / S.length, a[1] + p[1] / S.length], [0, 0]);
  const d = (m[0] - cS[0]) + (m[1] - cS[1]), q = Math.hypot(m[0] - cS[0], m[1] - cS[1]) || 1;
  pathS(S); ctx.fillStyle = d / q < -.5 ? pal.hi : d / q > .5 ? pal.lo : pal.mid; ctx.fill();
  if (s > 1.4) { // rangs : droites parallèles à l'égout, de plus en plus près du faîte
    const L = Math.hypot(eb[0] - ea[0], eb[1] - ea[1]), nu = -(eb[1] - ea[1]) / L, nt = (eb[0] - ea[0]) / L;
    const far = Math.max(...P.map(p => Math.abs((p[0] - ea[0]) * nu + (p[1] - ea[1]) * nt)));
    const sg = Math.sign(P.reduce((a, p) => a + (p[0] - ea[0]) * nu + (p[1] - ea[1]) * nt, 0)) || 1;
    ctx.save(); pathS(S); ctx.clip(); ctx.strokeStyle = pal.line; ctx.lineWidth = 1; ctx.beginPath();
    for (let k = .55; k < far; k += .55) { const o = [nu * k * sg, nt * k * sg]; ctx.moveTo(...LP(h, ea[0] - (eb[0] - ea[0]) + o[0], ea[1] - (eb[1] - ea[1]) + o[1])); ctx.lineTo(...LP(h, eb[0] + (eb[0] - ea[0]) + o[0], eb[1] + (eb[1] - ea[1]) + o[1])); }
    if (s > 3) { const du = (eb[0] - ea[0]) / L, dt = (eb[1] - ea[1]) / L;                           // joints décalés d'un rang à l'autre
      for (let k = 0, i = 0; k < far; k += .55, i++) for (let x = -L + (i % 2) * .45; x < 2 * L; x += .9) { const p = [ea[0] + du * x + nu * k * sg, ea[1] + dt * x + nt * k * sg]; ctx.moveTo(...LP(h, ...p)); ctx.lineTo(...LP(h, p[0] + nu * .55 * sg, p[1] + nt * .55 * sg)); } }
    ctx.stroke(); ctx.restore();
  }
}
// toit en pavillon / en croupe sur un rectangle (faîtage sur le grand côté, ou pointe si carré)
function hipLT(h, u0, t0, u1, t1, pal) {
  const s = view.s, W = u1 - u0, L = t1 - t0, cu = (u0 + u1) / 2, ct = (t0 + t1) / 2, cS = LP(h, cu, ct);
  const C = [[u0, t0], [u1, t0], [u1, t1], [u0, t1]], all = lpts(h, C);
  pathS(shiftS(all, Math.min(W, L) * .22 + .6, Math.min(W, L) * .3 + .8)); ctx.fillStyle = WOOD.shadow; ctx.fill();
  const hw = Math.min(W, L) / 2, r1 = L >= W ? [cu, t0 + hw] : [u0 + hw, ct], r2 = L >= W ? [cu, t1 - hw] : [u1 - hw, ct];
  const near = c => Math.hypot(c[0] - r1[0], c[1] - r1[1]) <= Math.hypot(c[0] - r2[0], c[1] - r2[1]) ? r1 : r2;
  for (let i = 0; i < 4; i++) { const a = C[i], b = C[(i + 1) % 4], ra = near(a), rb = near(b);
    roofFaceLT(h, ra === rb ? [a, b, ra] : [a, b, rb, ra], a, b, pal, cS); }
  ctx.strokeStyle = pal.ridge; ctx.lineWidth = lw(.14); ctx.beginPath();                          // arêtiers et faîtage
  for (const c of C) { ctx.moveTo(...LP(h, ...c)); ctx.lineTo(...LP(h, ...near(c))); }
  ctx.moveTo(...LP(h, ...r1)); ctx.lineTo(...LP(h, ...r2)); ctx.stroke();
  pathS(all); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.16); ctx.stroke();
}
// tour carrée en pierre coiffée d'une flèche à quatre pans (vue de dessus : le toit déborde)
function towerLT(h, cu, ct, a, pal) {
  const P = lpts(h, [[cu - a, ct - a], [cu + a, ct - a], [cu + a, ct + a], [cu - a, ct + a]]);
  pathS(shiftS(P, a * 1.2, a * 1.6)); ctx.fillStyle = WOOD.shadow; ctx.fill();                   // longue ombre : la tour est haute
  hipLT(h, cu - a, ct - a, cu + a, ct + a, pal);
  const [X, Y] = LP(h, cu, ct); ctx.beginPath(); ctx.arc(X, Y, Math.max(1, .18 * view.s), 0, Math.PI * 2); ctx.fillStyle = '#3b3a36'; ctx.fill(); // épi de faîtage
}
// pierre de taille (bloc équarri) : face du dessus éclairée, arête sombre, ciselures
function blockLT(h, u0, t0, u1, t1, rough) {
  const s = view.s, P = lpts(h, [[u0, t0], [u1, t0], [u1, t1], [u0, t1]]);
  pathS(shiftS(P, .3, .4)); ctx.fillStyle = WOOD.shadow; ctx.fill();
  pathS(P); ctx.fillStyle = rough ? STONE.mid : STONE.hi; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.05); ctx.stroke();
  pathS(lpts(h, [[u0 + .08, t1 - .12], [u1 - .08, t1 - .12], [u1 - .08, t1 - .05], [u0 + .08, t1 - .05]])); ctx.fillStyle = STONE.lo; ctx.fill(); // arête à l'ombre
  if (s > 3 && !rough) { ctx.strokeStyle = 'rgba(90,84,74,.4)'; ctx.lineWidth = 1; ctx.beginPath(); for (let u = u0 + .15; u < u1 - .05; u += .16) { ctx.moveTo(...LP(h, u, t0 + .1)); ctx.lineTo(...LP(h, u + .05, t1 - .15)); } ctx.stroke(); }
}
// éclats de pierre / gravats clairs épars
function chipsLT(h, cu, ct, rad, n, col) {
  const s = view.s; if (s < 1.5) return;
  const rnd = seeded(Math.round(cu * 7 + ct * 13 + h.x)); ctx.fillStyle = col || '#d8d2c4';
  for (let k = 0; k < n; k++) { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * rad, [X, Y] = LP(h, cu + Math.cos(a) * d, ct + Math.sin(a) * d), e = Math.max(1, (.08 + rnd() * .1) * s); ctx.fillRect(X, Y, e, e * .8); }
}
// caisse de bois : planches, deux traverses
function crateLT(h, cu, ct, a) {
  const s = view.s, P = lpts(h, [[cu - a, ct - a], [cu + a, ct - a], [cu + a, ct + a], [cu - a, ct + a]]);
  pathS(shiftS(P, .22, .3)); ctx.fillStyle = WOOD.shadow; ctx.fill();
  pathS(P); ctx.fillStyle = '#b8955f'; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.05); ctx.stroke();
  if (s > 2.2) { ctx.strokeStyle = 'rgba(80,56,30,.55)'; ctx.lineWidth = 1; ctx.beginPath(); for (const k of [-.33, .33]) { ctx.moveTo(...LP(h, cu - a, ct + k * a)); ctx.lineTo(...LP(h, cu + a, ct + k * a)); } ctx.moveTo(...LP(h, cu - a, ct - a)); ctx.lineTo(...LP(h, cu + a, ct + a)); ctx.stroke(); }
}
// sac de toile (grain, farine, laine…) : panse ronde, gueule liée
function sackLT(h, cu, ct, r, col) {
  const s = view.s, rnd = seeded(Math.round(cu * 29 + ct * 31)), P = [];
  for (let i = 0; i < 10; i++) { const b = i / 10 * Math.PI * 2, k = .85 + rnd() * .2; P.push([cu + Math.cos(b) * r * k, ct + Math.sin(b) * r * 1.25 * k]); }
  const S = lpts(h, P); pathS(shiftS(S, .15, .2)); ctx.fillStyle = WOOD.shadow; ctx.fill();
  pathS(S); ctx.fillStyle = col || '#d6c7a0'; ctx.fill(); ctx.strokeStyle = 'rgba(70,56,36,.7)'; ctx.lineWidth = lw(.04); ctx.stroke();
  if (s > 2.5) { const [X, Y] = LP(h, cu, ct - r * .9); ctx.fillStyle = '#8a7650'; ctx.fillRect(X - .1 * s, Y - .06 * s, .2 * s, .12 * s); }
}
// panier d'osier rond, rempli (baies, pommes, herbes…)
function basketLT(h, cu, ct, r, fill) {
  const s = view.s, [X, Y] = LP(h, cu, ct), R = Math.max(1.2, r * s), rnd = seeded(Math.round(cu * 43 + ct * 17));
  ctx.beginPath(); ctx.arc(X + .15 * s, Y + .2 * s, R, 0, Math.PI * 2); ctx.fillStyle = WOOD.shadow; ctx.fill();
  ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2); ctx.fillStyle = '#9c7a45'; ctx.fill(); ctx.strokeStyle = '#4e3a22'; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.arc(X, Y, R * .78, 0, Math.PI * 2); ctx.fillStyle = fill[0]; ctx.fill();
  if (s > 2.5) for (let k = 0; k < 9; k++) { const a = rnd() * Math.PI * 2, d = rnd() * R * .6, e = Math.max(1, .1 * s); ctx.fillStyle = fill[1 + k % (fill.length - 1)] || fill[0]; ctx.fillRect(X + Math.cos(a) * d - e / 2, Y + Math.sin(a) * d - e / 2, e, e); }
}
// meule de foin ronde : paille, rangs en spirale, chapeau lié au sommet
function stackLT(h, cu, ct, r, P = STRAW) {
  const s = view.s, [X, Y] = LP(h, cu, ct), R = Math.max(1.5, r * s);
  ctx.beginPath(); ctx.arc(X + r * .5 * s, Y + r * .7 * s, R, 0, Math.PI * 2); ctx.fillStyle = WOOD.shadow; ctx.fill();
  ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2); ctx.fillStyle = P.lo; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.1); ctx.stroke();
  ctx.beginPath(); ctx.arc(X - R * .12, Y - R * .14, R * .78, 0, Math.PI * 2); ctx.fillStyle = P.hi; ctx.fill();
  if (s > 1.5) { ctx.strokeStyle = P.line; ctx.lineWidth = 1; ctx.beginPath(); for (let k = .3; k < 1; k += .22) { ctx.moveTo(X + R * k, Y); ctx.arc(X, Y, R * k, 0, Math.PI * 2); } ctx.stroke(); }
  ctx.beginPath(); ctx.arc(X, Y, Math.max(1, R * .16), 0, Math.PI * 2); ctx.fillStyle = P.ridge; ctx.fill();
}
// ruche en paille tressée (panier retourné) sur sa pierre : anneaux, trou de vol
function skepLT(h, cu, ct, r) {
  const s = view.s, [X, Y] = LP(h, cu, ct), R = Math.max(1.3, r * s);
  ctx.beginPath(); ctx.arc(X + .25 * s, Y + .35 * s, R * 1.05, 0, Math.PI * 2); ctx.fillStyle = WOOD.shadow; ctx.fill();
  ctx.beginPath(); ctx.arc(X, Y, R * 1.15, 0, Math.PI * 2); ctx.fillStyle = STONE.mid; ctx.fill();
  ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2); ctx.fillStyle = '#c69a52'; ctx.fill(); ctx.strokeStyle = '#5a3f1e'; ctx.lineWidth = lw(.05); ctx.stroke();
  ctx.beginPath(); ctx.arc(X - R * .15, Y - R * .18, R * .6, 0, Math.PI * 2); ctx.fillStyle = '#dcb46a'; ctx.fill();
  if (s > 2.2) { ctx.strokeStyle = 'rgba(90,62,26,.6)'; ctx.lineWidth = 1; ctx.beginPath(); for (const k of [.35, .6, .85]) { ctx.moveTo(X + R * k, Y); ctx.arc(X, Y, R * k, 0, Math.PI * 2); } ctx.stroke(); }
  const [dX, dY] = LP(h, cu, ct + r * .95); ctx.fillStyle = '#2a1e12'; ctx.fillRect(dX - .1 * s, dY - .05 * s, .2 * s, .1 * s);
}
// tombe : tertre (herbeux ou de terre fraîche) et croix de bois ou stèle, tête vers t0
function graveLT(h, u, t, kind, fresh) {
  const s = view.s, P = lpts(h, softRect(u - .45, t, u + .45, t + 1.9, .4, 0, () => .5));
  pathS(shiftS(P, .12, .16)); ctx.fillStyle = WOOD.shadow; ctx.fill();
  pathS(P); ctx.fillStyle = fresh ? '#9a7f5c' : '#8f9a62'; ctx.fill(); ctx.strokeStyle = 'rgba(50,44,30,.45)'; ctx.lineWidth = 1; ctx.stroke();
  if (kind) { pathS(lpts(h, [[u - .4, t - .35], [u + .4, t - .35], [u + .4, t - .05], [u - .4, t - .05]])); ctx.fillStyle = STONE.hi; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.05); ctx.stroke(); return; } // stèle (sans ombre portée)
  topCrossLT(h, u, t - .2, .32, .05);                                                          // croix de bois, vue du dessus
}
// croix plantée vue du dessus : on ne voit que le dessus de sa traverse (demi-longueur a,
// demi-épaisseur e) et la tête du montant ; petite ombre au sud-est
function topCrossLT(h, cu, ct, a, e, col = '#6b4f32') {
  const B = lpts(h, [[cu - a, ct - e], [cu + a, ct - e], [cu + a, ct + e], [cu - a, ct + e]]), q = e * 1.3;
  const T = lpts(h, [[cu - q, ct - q], [cu + q, ct - q], [cu + q, ct + q], [cu - q, ct + q]]);
  ctx.beginPath(); addS(shiftS(B, a * .35, a * .45)); addS(shiftS(T, a * .35, a * .45)); ctx.fillStyle = WOOD.shadow; ctx.fill();
  for (const P of [B, T]) { pathS(P); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.03); ctx.stroke(); }
}
// if / arbre sombre (houppier en lobes), ou feuillu : col = [ombre, corps, reflet]
function treeLT(h, cu, ct, r, col) {
  const s = view.s, rnd = seeded(Math.round(cu * 53 + ct * 7 + h.x * 3)), c = [], hi = [];
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, k = .84 + rnd() * .2 + .07 * Math.sin(i * 2.3); c.push([cu + Math.cos(a) * r * k, ct + Math.sin(a) * r * k]); hi.push([cu + Math.cos(a) * r * k * .6, ct + Math.sin(a) * r * k * .6]); }
  const C = lpts(h, c);
  pathS(shiftS(C, r * .6, r * .8)); ctx.fillStyle = 'rgba(36,40,20,.32)'; ctx.fill();
  pathS(C); ctx.fillStyle = col[1]; ctx.fill(); ctx.strokeStyle = col[0]; ctx.lineWidth = lw(.07); ctx.stroke();
  pathS(shiftS(lpts(h, hi), -r * .25, -r * .28)); ctx.fillStyle = col[2]; ctx.fill();
  if (s > 2) { ctx.fillStyle = 'rgba(30,40,20,.3)'; for (let k = 0; k < 16; k++) { const [X, Y] = LP(h, cu + (rnd() - .5) * r * 1.4, ct + (rnd() - .5) * r * 1.4); ctx.fillRect(X, Y, Math.max(1, .22 * s), Math.max(1, .15 * s)); } }
}
const YEW = ['#2f3d24', '#44573a', '#5a6f48'], OAK = ['#3d5026', '#6a8741', '#84a150'];
// buisson à baies : touffe basse, baies rouges ou noires
function berryBushLT(h, cu, ct, r, berry) {
  treeLT(h, cu, ct, r, ['#3f4f2a', '#5d7440', '#728a4e']);
  if (view.s > 1.8) { const rnd = seeded(Math.round(cu * 61 + ct * 5)); ctx.fillStyle = berry; for (let k = 0; k < 10; k++) { const a = rnd() * Math.PI * 2, d = rnd() * r * .8, [X, Y] = LP(h, cu + Math.cos(a) * d, ct + Math.sin(a) * d), e = Math.max(1, .12 * view.s); ctx.fillRect(X, Y, e, e); } }
}
// bêtes (vues de dessus, voir beastLT)
const sheepLT = (h, u, t, a) => beastLT(h, u, t, a, .95, .6, '#ebe5d4', '#3e3630');
const cowLT = (h, u, t, a, col = '#8a5d3b') => beastLT(h, u, t, a, 2.1, .85, col, col, at => { ctx.strokeStyle = '#e8dcc0'; ctx.lineWidth = lw(.06); ctx.beginPath(); for (const e of [-1, 1]) { ctx.moveTo(...LP(h, ...at(1.28, e * .12))); ctx.lineTo(...LP(h, ...at(1.3, e * .36))); } ctx.stroke(); });
const muleLT = (h, u, t, a, col = '#6e5a48') => beastLT(h, u, t, a, 1.8, .62, col, '#4d3e31', at => { ctx.strokeStyle = '#3a2e24'; ctx.lineWidth = lw(.07); ctx.beginPath(); for (const e of [-1, 1]) { ctx.moveTo(...LP(h, ...at(1.02, e * .06))); ctx.lineTo(...LP(h, ...at(.92, e * .3))); } ctx.stroke(); });
const pigLT = (h, u, t, a) => beastLT(h, u, t, a, 1.05, .6, '#d8a896', '#c89280');
// table à tréteaux et ses deux bancs, dans l'axe u
function tableLT(h, cu, ct, len, goods) {
  for (const e of [-.62, .62]) beamLT(h, cu - len / 2 + .2, ct + e - .12, cu + len / 2 - .2, ct + e + .12);   // bancs
  beamLT(h, cu - len / 2, ct - .4, cu + len / 2, ct + .4);                                                     // plateau
  if (goods && view.s > 2) {                                                                  // assiettes : une par convive, face à chaque banc, bien espacées
    const n = Math.max(1, Math.floor((len - .3) / .7)), step = (len - .3) / n, rnd = seeded(Math.round(cu * 9 + ct * 21)), e = Math.max(1, .15 * view.s);
    for (const side of [-1, 1]) for (let k = 0; k < n; k++) {
      if (rnd() < .2) continue;                                                                 // place libre
      const [X, Y] = LP(h, cu - len / 2 + .15 + step * (k + .5) + (side > 0 ? step * .25 : 0), ct + side * .2);
      ctx.beginPath(); ctx.arc(X, Y, e, 0, Math.PI * 2); ctx.fillStyle = '#e8dcc0'; ctx.fill(); ctx.strokeStyle = 'rgba(80,60,36,.6)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.arc(X, Y, e * .5, 0, Math.PI * 2); ctx.fillStyle = goods[(k + (side > 0 ? 1 : 0)) % goods.length]; ctx.fill();
    }
  }
}
// étal de marché : auvent de toile rayée sur quatre perches, tréteaux et marchandises devant
function stallLT(h, u0, t0, u1, t1, ca, cb, goods) {
  const s = view.s, rnd = seeded(Math.round(u0 * 13 + t0 * 17 + h.x));
  beamLT(h, u0 + .2, t0 - .9, u1 - .2, t0 - .1);                                                   // comptoir devant l'auvent
  if (s > 1.8) for (let k = 0; k < (u1 - u0) * 3; k++) { const [X, Y] = LP(h, u0 + .4 + rnd() * (u1 - u0 - .8), t0 - .7 + rnd() * .45), e = Math.max(1, .15 * s); ctx.fillStyle = goods[k % goods.length]; ctx.beginPath(); ctx.arc(X, Y, e, 0, Math.PI * 2); ctx.fill(); }
  const P = lpts(h, [[u0, t0], [u1, t0], [u1, t1], [u0, t1]]);
  pathS(shiftS(P, .7, .9)); ctx.fillStyle = WOOD.shadow; ctx.fill();
  ctx.save(); pathS(P); ctx.clip(); ctx.fillStyle = ca; ctx.fill();
  ctx.fillStyle = cb; for (let u = u0 + .35; u < u1; u += .7) { pathS(lpts(h, [[u, t0], [u + .35, t0], [u + .35, t1], [u, t1]])); ctx.fill(); }
  pathS(lpts(h, [[u0, (t0 + t1) / 2], [u1, (t0 + t1) / 2], [u1, t1], [u0, t1]])); ctx.fillStyle = 'rgba(30,20,10,.16)'; ctx.fill(); // pan arrière à l'ombre
  ctx.restore();
  pathS(P); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.08); ctx.stroke();
  if (s > 2.5) { ctx.strokeStyle = 'rgba(40,28,16,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(...LP(h, u0, (t0 + t1) / 2)); ctx.lineTo(...LP(h, u1, (t0 + t1) / 2)); ctx.stroke(); }
}
// abreuvoir : auge de bois pleine d'eau
const waterTroughLT = (h, u0, t0, u1, t1) => troughLT(h, u0, t0, u1, t1, '#6f969c');
// piquet et lisse d'attache (poteau d'attache, relais) : barre sur deux poteaux
function hitchRailLT(h, u0, u1, t) {
  beamLT(h, u0, t - .08, u1, t + .08);
  ctx.fillStyle = WOOD.edge; for (const u of [u0 + .1, u1 - .1]) { const e = .16; pathS(lpts(h, [[u - e, t - e], [u + e, t - e], [u + e, t + e], [u - e, t + e]])); ctx.fill(); }
}
// clôture de lisses (parc à bétail) : perches horizontales doublées, poteaux ; gap sur le côté t0
function pensLT(h, runs) {
  const s = view.s;
  ctx.lineCap = 'round';
  for (const [col, dx, dy] of [[WOOD.shadow, .2, .28], ['#7a5d3c', 0, 0]]) { ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, .14 * s); ctx.beginPath();
    for (const [a, b] of runs) for (const o of [-.1, .1]) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), nu = -(b[1] - a[1]) / L * o, nt = (b[0] - a[0]) / L * o; const A = LP(h, a[0] + nu, a[1] + nt), B = LP(h, b[0] + nu, b[1] + nt); ctx.moveTo(A[0] + dx * s, A[1] + dy * s); ctx.lineTo(B[0] + dx * s, B[1] + dy * s); }
    ctx.stroke(); }
  ctx.lineCap = 'butt';
  if (s > 1.3) { ctx.fillStyle = WOOD.edge; for (const [a, b] of runs) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let d = 0; d <= L + .01; d += 2) { const u = a[0] + (b[0] - a[0]) * d / L, t = a[1] + (b[1] - a[1]) * d / L, e = .14; pathS(lpts(h, [[u - e, t - e], [u + e, t - e], [u + e, t + e], [u - e, t + e]])); ctx.fill(); } } }
}
// râtelier à foin : cadre de bois rempli de foin
function hayRackLT(h, u0, t0, u1, t1) {
  troughLT(h, u0, t0, u1, t1, '#c7b26a');
  if (view.s > 2) { ctx.strokeStyle = 'rgba(120,96,40,.7)'; ctx.lineWidth = 1; ctx.beginPath(); const along = u1 - u0 > t1 - t0; for (let k = .2; k < (along ? u1 - u0 : t1 - t0); k += .25) { if (along) { ctx.moveTo(...LP(h, u0 + k, t0 + .05)); ctx.lineTo(...LP(h, u0 + k + .1, t1 - .05)); } else { ctx.moveTo(...LP(h, u0 + .05, t0 + k)); ctx.lineTo(...LP(h, u1 - .05, t0 + k + .1)); } } ctx.stroke(); }
}
// jeunes plants en rangs (pépinière) : terre meuble, petites touffes vertes, tuteurs
function nurseryLT(h, u0, t0, u1, t1, step) {
  const s = view.s, rnd = seeded(Math.round(u0 * 5 + t0 * 3 + h.y)), P = lpts(h, [[u0, t0], [u1, t0], [u1, t1], [u0, t1]]);
  pathS(P); ctx.fillStyle = '#86694a'; ctx.fill(); ctx.strokeStyle = '#6b5236'; ctx.lineWidth = lw(.08); ctx.stroke();
  for (let t = t0 + step / 2; t < t1; t += step) for (let u = u0 + step / 2; u < u1; u += step) {
    const [X, Y] = LP(h, u + (rnd() - .5) * .1, t + (rnd() - .5) * .1), r = Math.max(1, step * (.28 + rnd() * .12) * s);
    ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2); ctx.fillStyle = rnd() < .5 ? '#5f7d3a' : '#739247'; ctx.fill();
    if (s > 3) { ctx.beginPath(); ctx.arc(X - r * .25, Y - r * .3, r * .45, 0, Math.PI * 2); ctx.fillStyle = '#8fae5a'; ctx.fill(); }
  }
}
// séchoir : perches horizontales où pendent des bottes (herbes, viande, poisson…)
function dryRackLT(h, u0, u1, t, cols, n) {
  const s = view.s;
  ctx.strokeStyle = WOOD.shadow; ctx.lineWidth = lw(.1); ctx.beginPath(); ctx.moveTo(...shiftS([LP(h, u0, t)], .3, .4)[0]); ctx.lineTo(...shiftS([LP(h, u1, t)], .3, .4)[0]); ctx.stroke();
  const k = (u1 - u0) / n;
  for (let i = 0; i < n; i++) { const u = u0 + k * (i + .5), P = lpts(h, [[u - k * .28, t - .12], [u + k * .28, t - .12], [u + k * .18, t + .45], [u - k * .18, t + .45]]);
    pathS(shiftS(P, .25, .35)); ctx.fillStyle = WOOD.shadow; ctx.fill(); pathS(P); ctx.fillStyle = cols[i % cols.length]; ctx.fill(); ctx.strokeStyle = 'rgba(40,28,16,.5)'; ctx.lineWidth = 1; ctx.stroke(); }
  ctx.strokeStyle = '#6b5236'; ctx.lineWidth = lw(.1); ctx.beginPath(); ctx.moveTo(...LP(h, u0, t)); ctx.lineTo(...LP(h, u1, t)); ctx.stroke();
  ctx.fillStyle = WOOD.edge; for (const u of [u0, u1]) { const e = .13; pathS(lpts(h, [[u - e, t - e], [u + e, t - e], [u + e, t + e], [u - e, t + e]])); ctx.fill(); }
}
// treuil de puits ou de mine : deux montants, rouleau, corde qui descend, manivelle
function windlassLT(h, cu, ct, len) {
  const s = view.s;
  for (const e of [-1, 1]) beamLT(h, cu + e * len / 2 - .15, ct - .3, cu + e * len / 2 + .15, ct + .3); // montants
  logLT(h, cu - len / 2 + .1, ct, cu + len / 2 - .1, ct, .16);                                        // rouleau
  ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = lw(.07); ctx.beginPath(); ctx.moveTo(...LP(h, cu + len / 2 + .1, ct)); ctx.lineTo(...LP(h, cu + len / 2 + .5, ct)); ctx.lineTo(...LP(h, cu + len / 2 + .5, ct + .45)); ctx.stroke(); // manivelle
  if (s > 2) { ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(...LP(h, cu + .1, ct)); ctx.lineTo(...LP(h, cu + .1, ct + .35)); ctx.stroke(); } // corde
}
// seau / cuveau de bois
const bucketLT = (h, cu, ct) => { barrelLT(h, cu, ct, .22); if (view.s > 2.5) { const [X, Y] = LP(h, cu, ct); ctx.beginPath(); ctx.arc(X, Y, .14 * view.s, 0, Math.PI * 2); ctx.fillStyle = '#6f969c'; ctx.fill(); } };
// brouette : caisse évasée, roue devant, deux bras
function barrowLT(h, cu, ct, a, load) {
  const du = Math.cos(a), dt = Math.sin(a), at = (x, y) => [cu + du * x - dt * y, ct + dt * x + du * y];
  ctx.strokeStyle = WOOD.fence; ctx.lineWidth = lw(.08); ctx.beginPath(); for (const e of [-.3, .3]) { ctx.moveTo(...LP(h, ...at(-.3, e))); ctx.lineTo(...LP(h, ...at(-1.2, e * 1.2))); } ctx.stroke();
  const B = lpts(h, [at(-.45, -.42), at(.45, -.32), at(.45, .32), at(-.45, .42)]);
  pathS(shiftS(B, .15, .2)); ctx.fillStyle = WOOD.shadow; ctx.fill(); pathS(B); ctx.fillStyle = WOOD.cart; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.05); ctx.stroke();
  if (load) { pathS(lpts(h, [at(-.35, -.3), at(.35, -.22), at(.35, .22), at(-.35, .3)])); ctx.fillStyle = load; ctx.fill(); }
  pathS(lpts(h, [at(.5, -.07), at(.75, -.07), at(.75, .07), at(.5, .07)])); ctx.fillStyle = WOOD.edge; ctx.fill();
}
// charrette de foin (plateau chargé d'un dôme de foin), dans l'axe t
function hayCartLT(h, cu, t0) {
  cartLT(h, cu, t0);
  const P = []; for (let i = 0; i < 14; i++) { const b = i / 14 * Math.PI * 2; P.push([cu + Math.cos(b) * 1.05, t0 + 2 + Math.sin(b) * 1.9]); }
  pathS(lpts(h, P)); ctx.fillStyle = STRAW.lo; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.06); ctx.stroke();
  const Q = P.map(([u, t]) => [cu - .15 + (u - cu) * .6, t0 + 1.8 + (t - t0 - 2) * .6]); pathS(lpts(h, Q)); ctx.fillStyle = STRAW.hi; ctx.fill();
}
// margelle de puits : anneau de pierres appareillées, eau sombre et reflet
function wellLT(h, cu, ct, r) {
  const s = view.s, [X, Y] = LP(h, cu, ct), R = Math.max(2, r * s);
  ctx.beginPath(); ctx.arc(X + .45 * s, Y + .6 * s, R, 0, Math.PI * 2); ctx.fillStyle = WOOD.shadow; ctx.fill();
  ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2); ctx.fillStyle = STONE.mid; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.08); ctx.stroke();
  ctx.beginPath(); ctx.arc(X - R * .06, Y - R * .06, R * .86, 0, Math.PI * 2); ctx.fillStyle = STONE.cap; ctx.fill();
  if (s > 2) { ctx.strokeStyle = STONE.joint; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; ctx.moveTo(X + Math.cos(a) * R * .62, Y + Math.sin(a) * R * .62); ctx.lineTo(X + Math.cos(a) * R, Y + Math.sin(a) * R); } ctx.stroke(); }
  ctx.beginPath(); ctx.arc(X, Y, R * .6, 0, Math.PI * 2); ctx.fillStyle = '#1f2c30'; ctx.fill(); ctx.strokeStyle = STONE.lo; ctx.lineWidth = Math.max(1, .06 * s); ctx.stroke();
  ctx.beginPath(); ctx.arc(X + R * .12, Y + R * .12, R * .36, 0, Math.PI * 2); ctx.fillStyle = '#3d5a61'; ctx.fill();
  ctx.beginPath(); ctx.arc(X + R * .2, Y + R * .18, R * .12, 0, Math.PI * 2); ctx.fillStyle = 'rgba(200,225,225,.35)'; ctx.fill();
}
