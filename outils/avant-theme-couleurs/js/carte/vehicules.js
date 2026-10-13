/* ---------- véhicules : bateaux vus de dessus ----------
   Trois bateaux en bois, façon plans de bataille : liston clair, pont ou fond en planches, bancs épais, écoutilles à grille, voiles bleu-gris, ombre douce.
   Proue vers la droite (x), 1 = longueur de la coque : la petite barque de pêche, le bateau (un mât), le navire (trois mâts, châteaux, canons).
   Un bateau : { nom, T longueur (m), B largeur ÷ longueur, coque (liston), pont (planches), planche (joints), bord (contour), … } ; les options (bancs, mâts, canons…)
   se règlent dans editeur-vehicules.html (clé vehicules.v1). peintBateau(clé, x, y, L, angle) peint le bateau centré en (x, y), de L pixels de long. */
const VEHICULES = {
  barque: { nom:'Petite barque de pêche', T:4.2, B:.36, coque:'#c8a068', bord:'#3a2a1a', pont:'#b98f58', planche:'#5a3c22', banc:'#d6b27a', bancs:3, rames:1 },
  bateau: { nom:'Bateau', T:14, B:.3, coque:'#b98a56', bord:'#3a2a1a', pont:'#c9a06a', planche:'#6a4a2a', voile:'#8ea7bf', mats:1, voiles:1, ecoutille:1, cabestan:1, ancre:0, annexe:0, greement:1 },
  navire: { nom:'Navire', T:36, B:.22, coque:'#a87a4a', bord:'#3a2a1a', pont:'#c19a64', planche:'#6a4a2a', voile:'#8ea7bf', mats:3, voiles:1, chateaux:1, ecoutilles:3, canons:5, chaloupe:1, greement:1 },
};
const VEHICULES_DEFAUT = JSON.parse(JSON.stringify(VEHICULES));
try { const o = JSON.parse(localStorage.getItem('vehicules.v1') || '{}'); for (const k in o) if (VEHICULES[k]) VEHICULES[k] = { ...VEHICULES_DEFAUT[k], ...o[k] }; } catch (e) {}
// demi-largeur de la coque (relative, 1 = au plus large) en fonction de x : étrave en pointe, arrière carré aux angles arrondis
const V_PROFIL = {
  barque: [[-.5, .6], [-.47, .84], [-.38, .97], [-.15, 1], [.1, .93], [.3, .66], [.43, .33], [.5, 0]],
  bateau: [[-.5, .6], [-.46, .85], [-.35, .98], [-.1, 1], [.15, .92], [.32, .68], [.43, .36], [.5, 0]],
  navire: [[-.5, .66], [-.46, .88], [-.36, .98], [-.15, 1], [.12, .96], [.3, .8], [.41, .52], [.47, .22], [.5, 0]],
};
const vRayon = (P, x) => { for (let i = 1; i < P.length; i++) if (x <= P[i][0]) { const a = P[i - 1], b = P[i], t = (x - a[0]) / (b[0] - a[0] || 1); return a[1] + (b[1] - a[1]) * t; } return 0; };
const vMel = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.substr(i, 2), 16) * (1 - t) + parseInt(b.substr(i, 2), 16) * t).toString(16).padStart(2, '0')).join('');
const vHash = n => { const t = Math.sin(n * 12.9898) * 43758.5453; return t - Math.floor(t); };
const vLisse = P => {                                                         // contour fermé lisse (sommets répétés = angle vif)
  const n = P.length, m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], m0 = m(P[n - 1], P[0]);
  ctx.beginPath(); ctx.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const e = m(P[i], P[(i + 1) % n]); ctx.quadraticCurveTo(P[i][0], P[i][1], e[0], e[1]); }
  ctx.closePath();
};
const vRect = (x0, y0, x1, y1, col, st = true) => { ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); if (col) { ctx.fillStyle = col; ctx.fill(); } if (st) ctx.stroke(); };
const vEll = (x, y, rx, ry, col, rot = 0, st = true) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, 7); if (col) { ctx.fillStyle = col; ctx.fill(); } if (st) ctx.stroke(); };
const vLigne = (pts, w, col) => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); const lw = ctx.lineWidth, sc = ctx.strokeStyle; ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke(); ctx.lineWidth = lw; ctx.strokeStyle = sc; };
// contours de la coque : sommets du liston (extérieur) et du bord intérieur, à épaisseur de liston constante
function vContours(k, a, rim) {
  const P = V_PROFIL[k], hb = a.B / 2, n = P.length, ext = [], int = [];
  const haut = P.slice(0, n - 1).map(([x, r]) => [x, -r * hb]), bas = P.slice(0, n - 1).reverse().map(([x, r]) => [x, r * hb]);
  ext.push(...haut, [.5, 0], [.5, 0], ...bas);
  const ix = x => Math.max(-.5 + rim, Math.min(.5 - rim * 2.2, x)), iy = y => Math.sign(y) * Math.max(.002, Math.abs(y) - rim);
  int.push(...haut.map(([x, y]) => [ix(x), iy(y)]), [.5 - rim * 2.4, 0], [.5 - rim * 2.4, 0], ...bas.map(([x, y]) => [ix(x), iy(y)]));
  return { P, hb, ext, int };
}
// planches : bandes dans le sens de la longueur, chacune d'un ton un peu différent, joints sombres, aboutages ; clip = fonction qui trace la zone
function vBois(clip, x0, x1, y0, y1, base, joint, seed, pw) {
  ctx.save(); clip(); ctx.clip();
  const ys = []; for (let y = y0; y < y1; y += pw) ys.push(y);
  ys.forEach((y, i) => { const v = (vHash(seed + i * 3.7) - .5) * .16; ctx.fillStyle = vMel(base, v > 0 ? '#ffffff' : '#000000', Math.abs(v)); ctx.fillRect(x0, y, x1 - x0, pw + .0015); });
  const lw = ctx.lineWidth; ctx.lineWidth = lw * .55; ctx.strokeStyle = joint; ctx.globalAlpha = .5; ctx.beginPath();
  ys.forEach((y, i) => { ctx.moveTo(x0, y); ctx.lineTo(x1, y); for (let j = 0; j < 2; j++) { const x = x0 + (x1 - x0) * vHash(seed + i * 11.3 + j * 5.1); ctx.moveTo(x, y); ctx.lineTo(x, y + pw); } });
  ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = lw; ctx.restore();
}
function vEclairage(clip, hb) {                                               // lumière du nord-ouest : un voile clair d'un côté, sombre de l'autre
  ctx.save(); clip(); ctx.clip();
  const g = ctx.createLinearGradient(-.3, -hb, .3, hb); g.addColorStop(0, 'rgba(255,240,210,.16)'); g.addColorStop(1, 'rgba(30,15,5,.22)');
  ctx.fillStyle = g; ctx.fillRect(-.6, -hb * 1.2, 1.2, hb * 2.4); ctx.restore();
}
function vCoque(k, a, rim) {
  const c = vContours(k, a, rim), { hb } = c;
  const ext = () => vLisse(c.ext), int = () => vLisse(c.int);
  ext(); ctx.fillStyle = a.coque; ctx.fill();                                                                          // liston
  vBois(ext, -.52, .52, -hb, hb, a.coque, a.planche, 5, .02); vEclairage(ext, hb);
  ext(); ctx.stroke();
  vBois(int, -.52, .52, -hb, hb, a.pont, a.planche, 17, k === 'barque' ? .026 : .02);                                   // fond ou pont
  ctx.save(); int(); ctx.clip(); ctx.lineWidth *= 5; ctx.strokeStyle = 'rgba(25,12,4,.35)'; int(); ctx.stroke(); ctx.restore();   // l'ombre du liston sur le pont
  vEclairage(int, hb); int(); ctx.stroke();
  return { ...c, int, ext, rim };
}
// grille d'écoutille : cadre, quadrillage
function vGrille(x, y, w, h, a) {
  ctx.save(); vRect(x - w / 2, y - h / 2, x + w / 2, y + h / 2, vMel(a.coque, '#000000', .25)); vRect(x - w / 2 * .8, y - h / 2 * .8, x + w / 2 * .8, y + h / 2 * .8, '#2a1c12', false);
  ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(x + i * w * .18, y - h * .4); ctx.lineTo(x + i * w * .18, y + h * .4); ctx.moveTo(x - w * .4, y + i * h * .18); ctx.lineTo(x + w * .4, y + i * h * .18); }
  ctx.lineWidth *= .8; ctx.strokeStyle = vMel(a.coque, '#ffffff', .1); ctx.stroke(); ctx.restore();
}
// voile vue de dessus : une bande bleu-gris aux bords en vagues, sur sa vergue qui dépasse
function vVoile(x, larg, ep, col) {
  const hl = larg / 2, n = 10; ctx.beginPath();
  for (let i = 0; i <= n; i++) { const y = -hl + larg * i / n; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  for (let i = n; i >= 0; i--) { const y = -hl + larg * i / n, b = Math.sin(Math.PI * i / n), ond = (i % 2 ? .22 : 0); ctx.lineTo(x - ep * (.4 + .6 * b) * (1 - ond), y); }
  ctx.closePath(); const g = ctx.createLinearGradient(x, 0, x - ep, 0); g.addColorStop(0, vMel(col, '#ffffff', .25)); g.addColorStop(1, vMel(col, '#000000', .25));
  ctx.fillStyle = g; ctx.fill(); ctx.stroke();
  vLigne([[x + .002, -hl * 1.05], [x + .002, hl * 1.05]], .011, '#8a6238');                  // vergue
}
function vMat(x) { vEll(x, 0, .011, .011, '#7a5636'); ctx.beginPath(); ctx.arc(x, 0, .02, 0, 7); ctx.lineWidth *= .8; ctx.stroke(); ctx.lineWidth /= .8; }

// ---- petite barque : liston, bancs épais, siège arrière, avant ponté ----
function vBarque(a, L) {
  const rim = .034, c = vCoque('barque', a, rim), { P, hb } = c, n = a.bancs;
  const dansBarque = f => { ctx.save(); c.int(); ctx.clip(); f(); ctx.restore(); };
  dansBarque(() => {
    const xs = Array.from({ length:n }, (_, i) => -.3 + i * (.5 / Math.max(1, n - 1)));
    ctx.fillStyle = 'rgba(0,0,0,.3)'; for (const x of xs) ctx.fillRect(x - .042, -hb, .096, hb * 2);                  // l'ombre des bancs
    for (const x of xs) { vRect(x - .04, -hb, x + .04, hb, a.banc); vRect(x - .04, -hb, x + .04, hb, null); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x - .04, -hb, .08, hb * .45); }
    vRect(-.5, -hb, -.38, hb, vMel(a.banc, '#000000', .05));                                                         // siège arrière
    vRect(.3, -hb, .52, hb, vMel(a.pont, '#ffffff', .18));                                                           // avant ponté
    ctx.beginPath(); for (let y = -hb; y < hb; y += .03) { ctx.moveTo(.3, y); ctx.lineTo(.52, y); } ctx.lineWidth *= .5; ctx.strokeStyle = a.planche; ctx.globalAlpha = .5; ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth /= .5;
  });
  for (const x of [-.14, .12]) for (const s of [-1, 1]) vRect(x - .014, s * (vRayon(P, x) * hb - rim * .6) - .008, x + .014, s * (vRayon(P, x) * hb - rim * .6) + .008, '#3a3a40');   // tolets de fer
  if (a.rames) for (const s of [-1, 1]) {                                                    // deux rames rentrées, posées le long du bord, pale vers l'avant
    const e = x => s * (vRayon(P, x) * hb - rim * .45), pts = []; for (let x = -.4; x <= .2; x += .05) pts.push([x, e(x)]);
    vLigne(pts, .02, '#2a1a0e'); vLigne(pts, .013, '#9a7040');                               // manche (contour, puis bois)
    const xb = .27, an = Math.atan2(e(xb + .01) - e(xb - .01), .02);
    ctx.beginPath(); ctx.ellipse(xb, e(xb) - s * .004, .075, .022, an, 0, 7); ctx.fillStyle = '#b08450'; ctx.fill(); ctx.stroke();      // pale
    vEll(-.41, e(-.41), .012, .012, '#7a5636');                                              // poignée
  }
}
// ---- bateau et navire ----
function vVoilier(k, a, L) {
  const nav = k === 'navire', rim = nav ? .022 : .028, c = vCoque(k, a, rim), { P, hb } = c, B = a.B;
  const xm = a.mats === 1 ? [.06] : a.mats === 2 ? [.2, -.12] : a.mats === 3 ? [.25, .0, -.25] : [.28, .08, -.14, -.34];
  const r = x => vRayon(P, x) * hb - rim;
  if (nav && a.chateaux) {                                                                       // château avant (écoutille) et château arrière : un étage de plus
    const bloc = (x0, x1) => { vRect(x0, -r((x0 + x1) / 2) * .94, x1, r((x0 + x1) / 2) * .94, null, false); };
    ctx.save(); c.int(); ctx.clip();
    for (const [x0, x1] of [[-.5, -.3], [.3, .46]]) { const rr = r((x0 + x1) / 2) * .96; ctx.save(); ctx.beginPath(); ctx.rect(x0, -rr, x1 - x0, rr * 2); ctx.clip(); vBois(() => { ctx.beginPath(); ctx.rect(x0, -rr, x1 - x0, rr * 2); }, x0, x1, -rr, rr, vMel(a.pont, '#ffffff', .1), a.planche, 31 + x0 * 9, .018); ctx.restore(); ctx.lineWidth *= .8; vRect(x0, -rr, x1, rr, null); ctx.lineWidth /= .8; }
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(-.3, -hb, .015, hb * 2); ctx.fillRect(.3 - .015, -hb, .015, hb * 2);
    ctx.restore();
    vGrille(-.4, 0, .06, .06, a); vGrille(.38, 0, .05, .05, a);
  }
  const ec = nav ? [.16, .04, -.14].slice(0, a.ecoutilles || 0) : a.ecoutille ? [.24] : [];
  for (const x of ec) vGrille(x, 0, .075, Math.min(.075, r(x) * 1.2), a);
  if (!nav && a.cabestan) { vEll(-.1, 0, .028, .028, '#6a4a2a'); ctx.beginPath(); for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2 + .4; ctx.moveTo(-.1, 0); ctx.lineTo(-.1 + Math.cos(an) * .05, Math.sin(an) * .05); } ctx.lineWidth *= 1.4; ctx.stroke(); ctx.lineWidth /= 1.4; vEll(-.1, 0, .012, .012, '#3a3a40', 0, false); }
  if (!nav && a.ancre) { ctx.save(); ctx.translate(-.3, -.05); ctx.rotate(.3); vLigne([[-.03, 0], [.03, 0]], .008, '#2f2f36'); vLigne([[0, 0], [0, .06]], .008, '#2f2f36'); ctx.beginPath(); ctx.arc(0, .06, .026, 0, Math.PI); ctx.lineWidth = .009; ctx.strokeStyle = '#2f2f36'; ctx.stroke(); ctx.restore(); }
  if (nav && a.chaloupe) { ctx.save(); ctx.translate(-.13, 0); ctx.scale(.2, .2); const b = { ...VEHICULES.barque }; vBarque({ ...b, rames:0, bancs:2 }, L); ctx.restore(); }
  if (nav && a.canons) {                                                                         // canons le long des deux bords
    const n = a.canons, x0 = -.24, x1 = .26;
    for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * (n === 1 ? .5 : i / (n - 1)), y = r(x) * .9; for (const s of [-1, 1]) { vRect(x - .016, s * y - .009 - (s > 0 ? 0 : 0), x + .016, s * y + .009, '#2a2a30', false); vEll(x - .02, s * y, .006, .014, '#4a3a2a', 0, false); vEll(x + .02, s * y, .006, .014, '#4a3a2a', 0, false); } }
  }
  // gréement : bout-dehors, haubans
  vLigne([[.46, 0], [.76, 0]], .014, '#8a6238'); vLigne([[.46, 0], [.76, 0]], .004, '#5a3c22');
  if (a.greement) {
    for (const x of xm) for (const s of [-1, 1]) for (const d of [-.07, -.03, .01]) vLigne([[x, s * .014], [x + d, s * r(x + d) * .98]], .003, 'rgba(60,36,20,.85)');
    vLigne([[xm[0], 0], [.76, 0]], .003, 'rgba(60,36,20,.85)');
    if (nav) vLigne([[xm[xm.length - 1], 0], [-.5, 0]], .003, 'rgba(60,36,20,.85)');
  }
  if (a.voiles) xm.forEach((x, i) => vVoile(x, (nav ? .3 : B * 1.7) * (1 - i * .06), (nav ? .05 : .06) - i * .003, a.voile));
  xm.forEach(vMat);
  if (!nav && a.annexe) { ctx.save(); ctx.translate(-.63, 0); ctx.scale(.2, .2); vBarque({ ...VEHICULES.barque, rames:0, bancs:2 }, L); ctx.restore(); vLigne([[-.5, 0], [-.53, 0]], .006, '#8a6238'); }
}
function peintBateau(k, x, y, L, ang = 0) {
  const a = VEHICULES[k]; if (!a) return;
  const P = V_PROFIL[k], hb = a.B / 2;
  const sil = (f, g) => vLisse([...P.slice(0, -1).map(([x, r]) => [x * g, -r * hb * f]), [.5 * g, 0], [.5 * g, 0], ...P.slice(0, -1).reverse().map(([x, r]) => [x * g, r * hb * f])]);
  for (const [f, al] of [[1.18, .1], [1.1, .12], [1.03, .16]]) { ctx.save(); ctx.translate(x + L * .035, y + L * .05); ctx.rotate(ang); ctx.scale(L, L); sil(f, 1.01); ctx.fillStyle = 'rgba(40,28,52,' + al + ')'; ctx.fill(); ctx.restore(); }   // ombre douce, au sol
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(L, L); ctx.lineJoin = ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1, Math.min(1.8, L * .006)) / L; ctx.strokeStyle = a.bord;
  (k === 'barque' ? vBarqueCoque : vVoilier)(k, a, L);
  ctx.restore();
}
function vBarqueCoque(k, a, L) { vBarque(a, L); }
