/* ---------- chariots et charrettes : véhicules de terre vus de dessus ----------
   Six véhicules en bois, dans le style des bateaux (vehicules.js) : liston, plancher en planches, roues, brancards.
   - charrette : charrette à bras tirée par un homme (un villageois, voir villageois.js)
   - chariot_passagers, chariot_animaux, chariot_marchandises, chariot_minerai, chariot_bois : chariot à quatre roues tiré par un cheval (voir animaux.js)
   Un véhicule : { nom, T longueur de la caisse (m), B largeur ÷ longueur, coque (liston), pont (plancher), planche (joints), bord (contour), roue, roues (2 ou 4), traction ('homme'|'cheval'),
   charge ('aucune'|'passagers'|'animaux'|'marchandises'|'minerai'|'bois'), cheval (couleur : 'bai' | 'noir' | 'blanc'), … }.
   Avant vers la droite (x). peintChariot(clé, x, y, L, angle) : L pixels de long pour la CAISSE ; le cheval ou l'homme est dessiné devant, hors de L (voir chariotEtendue).
   Réglages : editeur-vehicules.html (clé vehicules.v1, avec les bateaux). */
const CHARIOTS = {
  charrette:            { nom:'Charrette à bras',          T:1.25, B:.6, coque:'#b07a40', bord:'#3a2a1a', pont:'#c9a06a', planche:'#6a4a2a', roue:'#6a4a2a', roues:2, traction:'homme',  charge:'aucune' },
  chariot_passagers:    { nom:'Chariot de passagers',      T:3.4, B:.5,  coque:'#9a6a3a', bord:'#3a2a1a', pont:'#c19a64', planche:'#6a4a2a', roue:'#5a3a1e', roues:4, traction:'cheval', charge:'passagers',    cheval:'bai' },
  chariot_animaux:      { nom:'Chariot d\'animaux',        T:3.4, B:.52, coque:'#9a6a3a', bord:'#3a2a1a', pont:'#c19a64', planche:'#6a4a2a', roue:'#5a3a1e', roues:4, traction:'cheval', charge:'animaux',      cheval:'noir' },
  chariot_marchandises: { nom:'Chariot de marchandises',   T:3.4, B:.5,  coque:'#9a6a3a', bord:'#3a2a1a', pont:'#c19a64', planche:'#6a4a2a', roue:'#5a3a1e', roues:4, traction:'cheval', charge:'marchandises', cheval:'bai' },
  chariot_minerai:      { nom:'Chariot de minerai',        T:3.2, B:.5,  coque:'#7a5a3a', bord:'#2a2018', pont:'#8a6a48', planche:'#4a3220', roue:'#4a3220', roues:4, traction:'cheval', charge:'minerai',      cheval:'noir', minerai:'#9c4a2e' },
  chariot_bois:         { nom:'Chariot de bois',           T:4.0, B:.46, coque:'#9a6a3a', bord:'#3a2a1a', pont:'#b98a56', planche:'#6a4a2a', roue:'#5a3a1e', roues:4, traction:'cheval', charge:'bois',         cheval:'bai' },
};
const CHARIOTS_DEFAUT = JSON.parse(JSON.stringify(CHARIOTS));
try { const o = JSON.parse(localStorage.getItem('vehicules.v1') || '{}'); for (const k in o) if (CHARIOTS[k]) CHARIOTS[k] = { ...CHARIOTS_DEFAUT[k], ...o[k] }; } catch (e) {}
const CH_INK = '#2b2118';
const CH_CHEVAUX = { bai:'#8a5a3a', noir:'#3a322c', blanc:'#e8e4da' };
// ce qui dépasse devant la caisse, en longueurs de caisse (l'attelage) : [arrière, avant]
function chariotEtendue(k) { const a = CHARIOTS[k]; return [.5, .5 + (a.traction === 'cheval' ? 3.4 : 1.2) / a.T]; }
const chMel = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.substr(i, 2), 16) * (1 - t) + parseInt(b.substr(i, 2), 16) * t).toString(16).padStart(2, '0')).join('');
const chRect = (x0, y0, x1, y1, col, st = true, r = 0) => { ctx.beginPath(); if (r && ctx.roundRect) ctx.roundRect(x0, y0, x1 - x0, y1 - y0, r); else ctx.rect(x0, y0, x1 - x0, y1 - y0); if (col) { ctx.fillStyle = col; ctx.fill(); } if (st) ctx.stroke(); };
const chEll = (x, y, rx, ry, col, rot = 0, st = true) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, 7); if (col) { ctx.fillStyle = col; ctx.fill(); } if (st) ctx.stroke(); };
const chHash = n => { const t = Math.sin(n * 12.9898) * 43758.5453; return t - Math.floor(t); };
function chPlanches(x0, y0, x1, y1, base, joint, seed, pw) {                    // planches dans le sens de la longueur, chacune d'un ton un peu différent
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
  let i = 0; for (let y = y0; y < y1; y += pw, i++) { const v = (chHash(seed + i * 3.7) - .5) * .16; ctx.fillStyle = chMel(base, v > 0 ? '#ffffff' : '#000000', Math.abs(v)); ctx.fillRect(x0, y, x1 - x0, pw + .002); }
  const lw = ctx.lineWidth; ctx.lineWidth = lw * .5; ctx.strokeStyle = joint; ctx.globalAlpha = .5; ctx.beginPath();
  i = 0; for (let y = y0; y < y1; y += pw, i++) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); const x = x0 + (x1 - x0) * chHash(seed + i * 11.3); ctx.moveTo(x, y); ctx.lineTo(x, y + pw); }
  ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = lw; ctx.strokeStyle = CH_INK; ctx.restore();
}
// roue vue de dessus : la tranche (un rectangle sombre qui dépasse de la caisse), avec les bandes de fer
function chRoue(x, y, d, w, col) { chRect(x - d / 2, y - w / 2, x + d / 2, y + w / 2, col, true, w * .35); ctx.beginPath(); for (const f of [-.3, 0, .3]) { ctx.moveTo(x + d * f, y - w / 2); ctx.lineTo(x + d * f, y + w / 2); } ctx.lineWidth *= .5; ctx.strokeStyle = chMel(col, '#000000', .45); ctx.stroke(); ctx.lineWidth /= .5; ctx.strokeStyle = CH_INK; }

// ---- charges (dessinées dans le repère de la caisse : x de -.5 à .5, y de -hb à hb) ----
function chBois(hb, a) {                                                          // grumes dans le sens de la longueur, côte à côte, bouts ronds visibles aux deux extrémités
  const n = 7, d = hb * 2 / n, rnd = i => chHash(i * 5.3 + 1);
  for (let i = 0; i < n; i++) {
    const y = -hb + d * (i + .5), x0 = -.455 + rnd(i) * .03, x1 = .455 - rnd(i + 9) * .03, tone = chMel('#7a5230', rnd(i + 3) > .5 ? '#ffffff' : '#000000', .05 + rnd(i + 3) * .08);
    chRect(x0, y - d * .48, x1, y + d * .48, tone, true, d * .4);
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y - d * .48, x1 - x0, d * .96); ctx.clip();
    ctx.fillStyle = 'rgba(255,230,190,.16)'; ctx.fillRect(x0, y - d * .45, x1 - x0, d * .3); ctx.fillStyle = 'rgba(30,14,4,.22)'; ctx.fillRect(x0, y + d * .15, x1 - x0, d * .33);     // volume : reflet puis ombre
    ctx.beginPath(); for (let k = 0; k < 5; k++) { const yy = y - d * .3 + k * d * .15, xa = x0 + (x1 - x0) * rnd(i * 7 + k), xb = xa + (x1 - x0) * (.15 + rnd(i * 3 + k) * .2); ctx.moveTo(xa, yy); ctx.lineTo(Math.min(x1, xb), yy); }
    ctx.lineWidth *= .4; ctx.strokeStyle = 'rgba(40,20,8,.4)'; ctx.stroke(); ctx.restore(); ctx.lineWidth = ctx.lineWidth; ctx.strokeStyle = CH_INK;
    for (const [x, dir] of [[x1, 1], [x0, -1]]) { chEll(x - dir * .005, y, d * .16, d * .44, '#d8b077'); chEll(x - dir * .005, y, d * .08, d * .24, '#b58a52', 0, false); }       // bouts : cernes
  }
}
function chMinerai(hb, a) {                                                       // blocs à facettes rangés en quinconce, un tas régulier : plus haut au centre
  const rows = 5, r = hb * 2 / rows / 2 * .98, cols = 7, ore = a.minerai || '#9c4a2e', list = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols - (j % 2); i++) {
    const x = -.43 + (i + (j % 2) * .5) * (.86 / (cols - 1)), y = -hb + r + j * (hb * 2 - 2 * r) / (rows - 1), c = 1 - Math.hypot(x / .45, y / hb) * .35;   // c : hauteur du tas
    list.push({ x: x + (chHash(i * 3 + j * 17) - .5) * .008, y: y + (chHash(i * 7 + j * 5) - .5) * .008, r: r * 1.3 * (.82 + .22 * c), c, k: i * 13 + j * 7 });
  }
  list.sort((p, q) => p.c - q.c);                                                                  // les plus bas d'abord, le sommet par-dessus
  for (const b of list) {
    const k = 7, P = []; for (let m = 0; m < k; m++) { const an = m / k * 6.283 + b.k, rr = b.r * (.9 + .1 * chHash(b.k + m)); P.push([b.x + Math.cos(an) * rr, b.y + Math.sin(an) * rr * .92]); }
    const path = () => { ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); };
    path(); ctx.fillStyle = chMel('#6a6e74', '#000000', .2 + (1 - b.c) * .3); ctx.fill();
    ctx.save(); path(); ctx.clip();
    ctx.fillStyle = chMel('#9aa0a8', '#ffffff', b.c * .15); ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (let m = 1; m <= 3; m++) ctx.lineTo(P[m][0], P[m][1]); ctx.lineTo(b.x, b.y); ctx.closePath(); ctx.fill();         // face éclairée (nord-ouest)
    ctx.restore(); path(); ctx.stroke();
    const vx = b.x - b.r * .35, vy = b.y - b.r * .15;                                              // filon de minerai : deux petits cristaux alignés
    for (const [dx, dy, q] of [[0, 0, .3], [b.r * .45, b.r * .3, .22]]) { ctx.beginPath(); ctx.moveTo(vx + dx, vy + dy - b.r * q); ctx.lineTo(vx + dx + b.r * q * .8, vy + dy); ctx.lineTo(vx + dx, vy + dy + b.r * q * .8); ctx.lineTo(vx + dx - b.r * q * .8, vy + dy); ctx.closePath(); ctx.fillStyle = ore; ctx.fill(); ctx.lineWidth *= .6; ctx.stroke(); ctx.lineWidth /= .6; }
  }
}
function chMarchandises(hb, a) {                                                  // caisses, sacs et tonneau
  const caisse = (x, y, w, h, c) => { chRect(x - w / 2, y - h / 2, x + w / 2, y + h / 2, c); ctx.beginPath(); ctx.moveTo(x - w / 2, y - h / 2); ctx.lineTo(x + w / 2, y + h / 2); ctx.moveTo(x + w / 2, y - h / 2); ctx.lineTo(x - w / 2, y + h / 2); ctx.lineWidth *= .6; ctx.stroke(); ctx.lineWidth /= .6; };
  caisse(-.34, -hb * .5, .22, hb * .8, '#b98a56'); caisse(-.34, hb * .5, .22, hb * .8, '#c9a066'); caisse(-.08, -hb * .52, .2, hb * .7, '#a97a46');
  for (const [x, y, rx, ry] of [[-.04, hb * .35, .12, .1], [.12, hb * .1, .1, .09], [.12, -hb * .5, .1, .1]]) { chEll(x, y, rx, ry, '#d8c79a'); chEll(x - rx * .2, y - ry * .2, rx * .4, ry * .3, '#efe2bb', 0, false); }
  chEll(.34, -hb * .45, .09, .09, '#8a6a3a'); chEll(.34, -hb * .45, .06, .06, '#6a4a2a', 0, false); chEll(.34, hb * .45, .09, .09, '#8a6a3a'); chEll(.34, hb * .45, .06, .06, '#6a4a2a', 0, false);
}
function chBancs(hb, a) { for (const x of [-.25, .1]) { chRect(x - .05, -hb * .92, x + .05, hb * .92, '#c9a066'); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x - .05, -hb * .92, .1, hb * .3); } }
// cordes de maintien : sangles en travers de la charge, nouées sur le liston ; double trait (contour puis fibre claire)
function chCorde(pts, w) { const lw = ctx.lineWidth, tr = () => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); }; tr(); ctx.lineWidth = w + lw * 1.6; ctx.strokeStyle = CH_INK; ctx.stroke(); tr(); ctx.lineWidth = w; ctx.strokeStyle = '#d9c28a'; ctx.stroke(); tr(); ctx.lineWidth = w * .35; ctx.setLineDash([w * .9, w * .9]); ctx.strokeStyle = 'rgba(110,80,40,.7)'; ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = lw; ctx.strokeStyle = CH_INK; }
function chCordes(hb, a) {
  const y = hb * 1.02, noeud = (x, yy) => { chEll(x, yy, .016, .016, '#d9c28a'); };
  if (a.charge === 'bois') { for (const x of [-.3, 0, .3]) { chCorde([[x, -y], [x, y]], .014); noeud(x, -y); noeud(x, y); } }
  else if (a.charge === 'minerai') { for (const x of [-.34, -.1, .14, .38]) { chCorde([[x, -y], [x, y]], .012); noeud(x, -y); noeud(x, y); } chCorde([[-.44, -y * .35], [.44, -y * .35]], .01); chCorde([[-.44, y * .35], [.44, y * .35]], .01); }
  else if (a.charge === 'marchandises') { chCorde([[-.4, -y], [.4, y]], .012); chCorde([[-.4, y], [.4, -y]], .012); noeud(-.4, -y); noeud(.4, y); noeud(-.4, y); noeud(.4, -y); chEll(0, 0, .02, .02, '#d9c28a'); }
  else if (a.charge === 'animaux') { chCorde([[-.47, -y * .5], [-.47, y * .5]], .012); chCorde([[.47, -y * .5], [.47, y * .5]], .012); }
}
/* Articulation : l'essieu avant (x = CH_PIVOT, en longueurs de caisse) PIVOTE. Le cheval, les brancards, le harnais et les roues avant tournent ensemble autour de ce point d'un angle
   braq (rad) par rapport à la caisse ; la caisse, la charge et l'essieu arrière restent dans l'axe de la caisse (cap ang). Seuls les chariots à quatre roues pivotent (la charrette à bras est rigide).
   peintChariot(clé, x, y, L, ang, braq) : (x, y) = centre de la caisse. chariotPas fait avancer l'attelage : le cheval tire le pivot dans sa direction ah, la caisse suit sa trajectoire
   (remorque : son cap tourne vers la direction du pivot, d'autant plus vite que la distance entre les essieux est courte) ; elle rend l'angle braq à dessiner. */
const CH_PIVOT = .26, CH_ARRIERE = -.3, CH_BRAQ_MAX = .75;
function chariotPas(st, T, ah, dist) {                                   // st : { px, py (pivot, en m), ab (cap de la caisse) } ; retourne { x, y (centre de la caisse, m), ang, braq }
  st.px += Math.cos(ah) * dist; st.py += Math.sin(ah) * dist;
  let da = ah - st.ab; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
  const d = (CH_PIVOT - CH_ARRIERE) * T;
  st.ab += Math.sin(da) / d * dist; return chariotEtat(st, T, ah);
}
function chariotEtat(st, T, ah) {
  let braq = ah - st.ab; while (braq > Math.PI) braq -= 2 * Math.PI; while (braq < -Math.PI) braq += 2 * Math.PI;
  return { x: st.px - Math.cos(st.ab) * CH_PIVOT * T, y: st.py - Math.sin(st.ab) * CH_PIVOT * T, ang: st.ab, braq: Math.max(-CH_BRAQ_MAX, Math.min(CH_BRAQ_MAX, braq)) };
}
function peintChariot(k, x, y, L, ang = 0, braq = 0) {
  const a = CHARIOTS[k]; if (!a) return;
  const br = a.roues === 4 ? braq : 0, cb = Math.cos(br), sb = Math.sin(br), cA = Math.cos(ang), sA = Math.sin(ang);
  const hb = a.B / 2, pxm = L / a.T, wp = (u, v) => [x + (cA * u - sA * v) * L, y + (sA * u + cA * v) * L];
  const wpf = (u, v) => { const du = u - CH_PIVOT; return wp(CH_PIVOT + du * cb - v * sb, du * sb + v * cb); };           // point de l'attelage (repère tournant) → écran
  const rotF = () => { ctx.translate(CH_PIVOT, 0); ctx.rotate(br); ctx.translate(-CH_PIVOT, 0); };                         // à appeler dans le repère de la caisse : passe dans le repère de l'attelage
  const lw = Math.max(1, Math.min(1.8, L * .006)) / L, cheval = a.traction === 'cheval';
  const xt = .5 + (cheval ? 1.9 : .6) / a.T;                                                      // centre de l'animal ou de l'homme, devant la caisse
  // ombre portée au sol : caisse et roues
  ctx.save(); ctx.translate(x + L * .03, y + L * .045); ctx.rotate(ang); ctx.scale(L, L); ctx.fillStyle = 'rgba(40,28,52,.22)'; ctx.fillRect(-.52, -hb * 1.18, 1.04, hb * 2.36); ctx.restore();
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(L, L); ctx.lineJoin = ctx.lineCap = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = CH_INK;
  // brancards : deux perches. Charrette : elles passent de chaque côté de l'homme, mains sur les poignées ; chariot : elles se resserrent le long du cheval, jusqu'au poitrail.
  ctx.save(); rotF();
  const demi = (cheval ? .3 : .34) / a.T, fin = cheval ? xt + .58 / a.T : xt + .1 / a.T, conv = cheval ? .5 + .7 / a.T : .5 + .35 / a.T;
  for (const s of [-1, 1]) { const P = [[.3, s * hb * .55], [conv, s * demi], [fin, s * demi]]; ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.lineWidth = lw + .03; ctx.strokeStyle = CH_INK; ctx.stroke(); ctx.lineWidth = .03; ctx.strokeStyle = '#a07646'; ctx.stroke(); ctx.lineWidth = lw; ctx.strokeStyle = CH_INK;
    chEll(fin, s * demi, .022, .022, '#8a6238'); }
  ctx.restore();
  // roues (les deux paires dépassent de la caisse, sous le plancher)
  const wd = a.roues === 4 ? .17 : .22, wy = hb + (a.roues === 4 ? .015 : .02), roueXs = a.roues === 4 ? [-.3, .26] : [-.02];
  for (const rx of roueXs) { ctx.save(); if (a.roues === 4 && rx > 0) rotF(); for (const s of [-1, 1]) chRoue(rx, s * wy, wd, .035, a.roue); ctx.restore(); }
  // caisse : liston, plancher
  const R = .03; chRect(-.5, -hb, .5, hb, a.coque, true, R); chPlanches(-.5 + .01, -hb + .01, .5 - .01, hb - .01, a.coque, a.planche, 5, .026);
  const ix = .035, iy = Math.min(.045, hb * .22);
  chRect(-.5 + ix, -hb + iy, .5 - ix, hb - iy, null, false);
  ctx.save(); chRect(-.5 + ix, -hb + iy, .5 - ix, hb - iy, null, false); ctx.clip(); chPlanches(-.5 + ix, -hb + iy, .5 - ix, hb - iy, a.pont, a.planche, 17, .028);
  ctx.fillStyle = 'rgba(25,12,4,.28)'; ctx.fillRect(-.5, -hb, 1, iy * 1.4); ctx.fillRect(-.5, hb - iy * 1.4, 1, iy * 1.4);                  // ombre du liston sur le plancher
  const lumiere = ctx.createLinearGradient(-.3, -hb, .3, hb); lumiere.addColorStop(0, 'rgba(255,240,210,.14)'); lumiere.addColorStop(1, 'rgba(30,15,5,.2)'); ctx.fillStyle = lumiere; ctx.fillRect(-.5, -hb, 1, hb * 2);
  const hbi = hb - iy;
  switch (a.charge) {
    case 'bois': chBois(hbi, a); break;
    case 'minerai': chMinerai(hbi, a); break;
    case 'marchandises': chMarchandises(hbi, a); break;
    case 'passagers': chBancs(hbi, a); break;
  }
  ctx.restore();
  chRect(-.5, -hb, .5, hb, null, true, R);                                                                                              // contour du liston
  chCordes(hb - iy, a);
  chRect(-.5 + ix, -hb + iy, .5 - ix, hb - iy, null, true);
  if (a.charge === 'animaux') {                                                                                                         // ridelles à claire-voie : montants et deux lisses
    for (let i = 0; i <= 9; i++) for (const s of [-1, 1]) chRect(-.46 + i * .102 - .008, s * (hb - iy * .5) - .012, -.46 + i * .102 + .008, s * (hb - iy * .5) + .012, a.coque, false);
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-.46, s * (hb - iy * .5)); ctx.lineTo(.46, s * (hb - iy * .5)); ctx.lineWidth = lw + .01; ctx.stroke(); ctx.lineWidth = .01; ctx.strokeStyle = a.coque; ctx.stroke(); ctx.lineWidth = lw; ctx.strokeStyle = CH_INK; }
  }
  // siège du cocher (chariots) : planche posée en travers à l'avant
  if (cheval) { chRect(.3, -hb * .85, .4, hb * .85, '#b08a4c'); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(.3, -hb * .85, .1, hb * .3); }
  ctx.restore();
  // passagers, animaux : sprites des autres feuilles, posés dans la caisse (repère monde)
  if (a.charge === 'passagers' && typeof peintVillageois === 'function') for (const [u, v, t] of [[-.28, -hb * .45, 'marchand'], [-.28, hb * .45, 'paysan'], [.06, -hb * .45, 'berger'], [.06, hb * .45, 'villageois']]) { const [X, Y] = wp(u, v); peintVillageois(t, X, Y, .58 * pxm, ang); }
  if (a.charge === 'animaux' && typeof peintAnimal === 'function' && typeof ANIMAUX !== 'undefined') for (const [u, v, t, rot] of [[-.2, -hb * .38, 'mouton', 0], [.18, hb * .35, 'mouton', Math.PI]]) { const [X, Y] = wp(u, v); peintAnimal(t, X, Y, ANIMAUX[t].T * pxm, ang + rot); }
  if (cheval && typeof peintVillageois === 'function') { const [X, Y] = wp(.35, 0); peintVillageois('villageois', X, Y, .58 * pxm, ang); }                                   // cocher assis sur le siège
  // l'attelage : le cheval entre les brancards, ou l'homme qui tire la charrette
  const [TX, TY] = wpf(xt, 0);
  if (cheval && typeof peintAnimal === 'function' && typeof ANIMAUX !== 'undefined') {
    const orig = ANIMAUX.cheval.c, h = CH_CHEVAUX[a.cheval] || orig; ANIMAUX.cheval.c = h; try { peintAnimal('cheval', TX, TY, ANIMAUX.cheval.T * pxm, ang + br); } finally { ANIMAUX.cheval.c = orig; }
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(L, L); rotF(); ctx.lineJoin = ctx.lineCap = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = CH_INK;
    const demi = .3 / a.T, xc = xt + .5 / a.T, xr = xt - .5 / a.T;                                    // collier (poitrail) et sangle de croupe
    for (const [xx, w] of [[xc, .026], [xr, .02]]) { ctx.beginPath(); ctx.moveTo(xx, -demi * 1.05); ctx.lineTo(xx, demi * 1.05); ctx.lineWidth = w + lw * 1.6; ctx.strokeStyle = CH_INK; ctx.stroke(); ctx.lineWidth = w; ctx.strokeStyle = '#5a3a1e'; ctx.stroke(); }
    chEll(xc, 0, .018, .018, '#c9a050'); ctx.lineWidth = lw; ctx.strokeStyle = CH_INK;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(xr, s * demi); ctx.lineTo(xc, s * demi); ctx.lineWidth = .012 + lw * 1.6; ctx.stroke(); ctx.lineWidth = .012; ctx.strokeStyle = '#8a5a30'; ctx.stroke(); ctx.lineWidth = lw; ctx.strokeStyle = CH_INK; }   // traits le long du flanc
    ctx.restore();
  } else if (!cheval && typeof peintVillageois === 'function') peintVillageois('villageois', TX, TY, .58 * pxm, ang + br);
}
