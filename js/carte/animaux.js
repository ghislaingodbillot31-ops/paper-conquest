/* ---------- animaux : le dessin ----------
   Les 65 animaux terrestres du jeu (LAND_ANIMALS, js/jeu/ressources.js), vus de dessus, tête vers la droite, symétriques, même style que les arbres
   fruitiers (contour sombre, ombre au sud-est). Trois gabarits : 'quad' (quadrupèdes), 'oiseau', 'croco'. Un animal :
     T longueur du tronc en mètres (taille réelle) · w largeur du corps (÷ longueur) · nl cou · hl, hw tête · c corps · d extrémités (pattes, oreilles) · m museau
     ear oreille : pointe | long | rond | grand | penche | horiz | dos | banane · queue : fin | touffe | fournie | court | longue | epaisse | palette | anneaux | boucle | aucune
     corne : cornes | bouc | lyre | droites | bois | palme | rhino · defense · trompe · mane : bande | lion | hirsute | col · laine · pattes : marche | ovales | aucune (pc couleur) · nez (couleur de la truffe) · qd (bout de la queue fin) · qt (bout de la queue court)
     deco : rayures | taches | rosettes | plaques | selle | dos | flancs | croupe · bosse : [[x, rx, ry]…]  (dc, bc, mc, qc, qt, hc : couleurs de ces détails).
   peintAnimal(clé, x, y, L, angle) peint l'animal centré en (x, y), de longueur de corps L pixels. */
const ANIMAUX = {
  // ---- élevage ----
  cheval:   { T:1.7,    w:0.27, nl:.17, hl:.26, hw:.14, c:'#8a5a3a', d:'#3a2a22', m:'#2e231d', queue:'touffe', qc:'#2e231d', mane:'bande', mc:'#2e231d' },
  ane:      { T:1.2,   w:0.27, nl:.13, hl:.26, hw:.14, c:'#9a958e', d:'#5a554f', m:'#ddd6c8', ear:'long', queue:'touffe', qc:'#4a453f', deco:'dos', dc:'#4a453f' },
  chameau:  { T:2, w:0.3, nl:.24, hl:.22, hw:.12, c:'#c9a26a', d:'#7a5a3a', m:'#a88252', ear:'rond', queue:'fin', bosse:[[.02, .17, .17]], bc:'#d8b47c' },
  chameau_bactriane: { T:2, w:0.34, nl:.22, hl:.22, hw:.13, c:'#8a6a48', d:'#4a3424', m:'#6a4e36', ear:'rond', queue:'fin', bosse:[[-.14, .13, .15], [.16, .13, .15]], bc:'#5a4030' },
  vache:    { T:1.9, w:0.34, nl:.08, hl:.24, hw:.17, c:'#f2ece0', d:'#2a2622', m:'#e7b4a8', ear:'horiz', corne:'cornes', hs:.55, queue:'touffe', qc:'#2a2622', deco:'plaques', dc:'#2a2622' },
  zebu:     { T:1.8, w:0.32, nl:.1, hl:.26, hw:.15, c:'#d2cab8', d:'#7a6e5c', m:'#4a423a', ear:'horiz', corne:'cornes', hs:.9, queue:'touffe', qc:'#4a423a', bosse:[[.24, .1, .15]], bc:'#b9ae98' },
  buffle:   { T:2, w:0.36, nl:.08, hl:.26, hw:.16, c:'#4a443f', d:'#2b2622', m:'#2b2622', ear:'horiz', corne:'bouc', hs:1.5, hc:'#cfc7b4', queue:'touffe', qc:'#2b2622' },
  yak:      { T:1.8,    w:0.4,  nl:.06, hl:.22, hw:.16, c:'#3b322c', d:'#241e1a', m:'#241e1a', ear:'rond', corne:'cornes', hs:1, hc:'#d8cfb6', queue:'touffe', qc:'#241e1a', laine:1 },
  mouton:   { hcol:'#3a332c', T:0.9,  w:0.36, nl:.05, hl:.18, hw:.12, c:'#efe9da', d:'#3a332c', m:'#3a332c', ear:'horiz', queue:'court', laine:1 },
  chevre:   { T:0.8,   w:0.26, nl:.1,  hl:.2,  hw:.11, c:'#c9b8a0', d:'#4a3a2e', m:'#3a2e24', ear:'horiz', corne:'bouc', hs:1, queue:'court' },
  chevre_cachemire: { hcol:'#8a7e6c', T:0.8, w:0.27, nl:.1, hl:.2, hw:.11, c:'#f1ece0', d:'#8a7e6c', m:'#6a5e4c', ear:'horiz', corne:'bouc', hs:1.1, queue:'court', laine:1 },
  cochon:   { T:1.2,  w:0.32, nl:.03, hl:.3,  hw:.17, c:'#eab5ac', d:'#c98c84', m:'#d9948c', ear:'penche', queue:'boucle' },
  renne_dom:{ T:1.3,  w:0.28, nl:.14, hl:.24, hw:.13, c:'#8b7a68', d:'#5a4a3a', m:'#4a3a2e', queue:'court', corne:'bois', tines:3, hc:'#cdbf9c' },
  lama:     { hcol:'#8a6a4c', T:1.3,  w:0.26, nl:.27, hl:.2,  hw:.1,  c:'#e0d3bd', d:'#6a5a46', m:'#6a5a46', ear:'banane', queue:'court', laine:1 },
  alpaga:   { hcol:'#d8c8b0', T:1,   w:0.27, nl:.22, hl:.18, hw:.1,  c:'#efe6d8', d:'#7a6a56', m:'#6a5a46', ear:'banane', queue:'court', laine:1 },
  elephant_asie: { T:3, w:0.44, nl:.05, hl:.24, hw:.26, c:'#8a8f94', d:'#6a7076', m:'#6a7076', ear:'grand', es:1.05, ei:'#b9a6a0', trompe:1, defense:'courte', queue:'fin', pw:.1 },
  dindon:   { t:'oiseau', T:0.8, w:.42, c:'#6b4a2e', wc:'#8a6a42', wd:'#3a2a1a', nl:.1, nc:'#b9606a', hc:'#3a7ab8', bk:'#d9c070', tail:'eventail', tc:'#7a5a38', td:'#d8c090', wattle:1 },
  cobaye:   { T:0.22,   w:0.4, nl:0, hl:.24, hw:.2, c:'#c8864a', d:'#8a5a30', m:'#e9d9bf', ear:'rond', queue:'aucune', deco:'plaques', dc:'#f6efe0' },
  // ---- faune sauvage ----
  cerf:     { T:1.5,    w:0.24, nl:.17, hl:.24, hw:.12, c:'#8f5a35', d:'#5a3a25', m:'#3a2518', queue:'court', corne:'bois', tines:5, hc:'#cbbd9a' },
  chevreuil:{ T:0.95,   w:0.24,  nl:.12, hl:.2,  hw:.1,  c:'#a8744a', d:'#6a4a30', m:'#3a2518', queue:'court', corne:'bois', tines:2, hs:.55, hc:'#cbbd9a', deco:'croupe' },
  sanglier: { T:1.2,   w:0.34, nl:.04, hl:.3,  hw:.15, c:'#4a4036', d:'#2a241e', m:'#2a241e', queue:'court', defense:'courte', deco:'dos', dc:'#241e18' },
  elan:     { T:2,  w:0.32, nl:.1,  hl:.34, hw:.17, c:'#4a3a30', d:'#2a201a', m:'#2a201a', queue:'court', corne:'palme', hc:'#cbbd9a' },
  renne:    { T:1.3,   w:0.26, nl:.14, hl:.24, hw:.13, c:'#7a6a5a', d:'#4a3a2e', m:'#3a2e24', queue:'court', corne:'bois', tines:4, hc:'#cdbf9c', mane:'col', mc:'#efe9dc' },
  bison:    { T:2.2,  w:0.36, nl:.06, hl:.24, hw:.2,  c:'#6a4a32', d:'#2a1f18', m:'#2a1f18', ear:'rond', corne:'cornes', hs:.6, hc:'#2a1f18', queue:'touffe', qc:'#2a1f18', mane:'hirsute', mc:'#3a2a1e', bosse:[[.22, .12, .15]], bc:'#3a2a1e' },
  boeuf_musque: { hcol:'#1e1914', T:1.6, w:0.38, nl:.05, hl:.22, hw:.17, c:'#2f2822', d:'#1e1914', m:'#1e1914', ear:'rond', corne:'cornes', hs:.8, hc:'#d8cfb6', queue:'court', laine:1 },
  castor:   { T:0.6,   w:0.3, nl:.02, hl:.2,  hw:.15, c:'#6a4a30', d:'#3a2a1a', m:'#3a2a1a', ear:'rond', queue:'palette', qc:'#3a2d22' },
  zibeline: { T:0.3,  w:0.13, nl:.06, hl:.17, hw:.1,  c:'#4a3320', d:'#2a1c10', m:'#2a1c10', ear:'rond', queue:'fournie', qc:'#3a2616' },
  renard:   { T:0.5,   w:0.2, nl:.05, hl:.22, hw:.11, c:'#c8602a', d:'#2a2018', m:'#e9dcc8', queue:'fournie', qc:'#c8602a', qt:'#f6f0e4', nez:'#1f1c1a' },
  hermine:  { T:0.22,  w:0.1, nl:.04, hl:.16, hw:.09, c:'#f3efe6', d:'#a09a8c', m:'#d8d2c4', ear:'rond', queue:'fin', qc:'#f3efe6', qd:'#1f1c1a' },
  lievre:   { T:0.38,   w:0.26, nl:.02, hl:.16, hw:.11, c:'#a58660', d:'#5a4630', m:'#e9dcc8', ear:'dos', queue:'court', qc:'#f3efe6' },
  bouquetin:{ T:1,  w:0.26, nl:.1,  hl:.2,  hw:.11, c:'#8a7360', d:'#4a3a2e', m:'#3a2e24', corne:'bouc', hs:1.9, hc:'#9a8a6a', queue:'court' },
  saiga:    { T:0.95,  w:0.24,  nl:.07, hl:.28, hw:.15, c:'#d8c49c', d:'#8a7a5a', m:'#c8b48c', corne:'lyre', hc:'#c9a050', queue:'court' },
  gazelle:  { T:0.9,   w:0.2, nl:.12, hl:.2,  hw:.1,  c:'#d0a070', d:'#6a4a30', m:'#3a2a1c', corne:'lyre', hc:'#3a2e24', queue:'court', deco:'flancs', dc:'#6a4a30' },
  antilope: { T:1.4,  w:0.24, nl:.12, hl:.24, hw:.11, c:'#d8c8aa', d:'#6a5a44', m:'#3a2e24', corne:'droites', hc:'#3a2e24', queue:'fin', deco:'flancs', dc:'#8a6a4a' },
  zebre:    { T:1.6,  w:0.27, nl:.15, hl:.26, hw:.13, c:'#f2f0ea', d:'#1f1c1a', m:'#2a2622', queue:'touffe', qc:'#1f1c1a', mane:'bande', mc:'#1f1c1a', deco:'rayures', dc:'#1f1c1a' },
  autruche: { t:'oiseau', T:1.45, w:.5, c:'#26221f', wc:'#f4f1ea', wd:'#26221f', nl:.34, nc:'#d9a89a', hc:'#d9a89a', bk:'#e6d4a8', tail:'plume', tc:'#f4f1ea' },
  nandou:   { t:'oiseau', T:0.9, w:.46, c:'#8a7a6a', wc:'#9a8a7a', wd:'#5a4c40', nl:.26, nc:'#a89a8a', hc:'#a89a8a', bk:'#6a5c4c', tail:'plume', tc:'#8a7a6a' },
  emeu:     { t:'oiseau', T:1.1, w:.5, c:'#6a5a4a', wc:'#7a6a58', wd:'#4a3e32', nl:.28, nc:'#7a8a96', hc:'#7a8a96', bk:'#3a342c', tail:'plume', tc:'#6a5a4a' },
  casoar:   { t:'oiseau', T:0.9, w:.48, c:'#1f1d22', wc:'#2a272e', wd:'#0f0e12', nl:.22, nc:'#3a7ab8', hc:'#3a7ab8', bk:'#c9a050', tail:'plume', tc:'#1f1d22', casque:1 },
  elephant_afrique: { T:3.4, w:0.46, nl:.05, hl:.24, hw:.28, c:'#8a8480', d:'#6a6460', m:'#6a6460', ear:'grand', es:1.6, ei:'#b09a94', trompe:1, defense:'longue', queue:'fin', pw:.1 },
  hippopotame: { T:2.6, w:0.5, nl:.02, hl:.3, hw:.3, c:'#8a7f88', d:'#6a5f68', m:'#a8949a', ear:'rond', queue:'court', pw:.09 },
  rhinoceros:  { T:2.6, w:0.42, nl:.04, hl:.3, hw:.2, c:'#8a8a86', d:'#6a6a66', m:'#6a6a66', ear:'pointe', corne:'rhino', hc:'#b9b09a', queue:'fin', pw:.09 },
  tapir:    { T:1.3,  w:0.34, nl:.03, hl:.28, hw:.17, c:'#2a2622', d:'#1a1714', m:'#2a2622', ear:'rond', ec:'#e8e2d4', trompe:.5, queue:'court', deco:'selle', dc:'#e8e2d4' },
  capybara: { T:0.9,   w:0.34, nl:.02, hl:.22, hw:.17, c:'#8a6a48', d:'#5a4030', m:'#5a4030', ear:'rond', queue:'aucune' },
  guanaco:  { T:1.2,  w:0.26, nl:.24, hl:.2,  hw:.1,  c:'#b88860', d:'#5a4a3a', m:'#7a7470', ear:'banane', queue:'court' },
  kangourou:{ T:1.1,   w:0.24, nl:.07, hl:.22, hw:.12, c:'#b87e50', d:'#7a5a38', m:'#e9d4b8', ear:'long', queue:'epaisse', pw:.1 },
  lemurien: { T:0.35,  w:0.16, nl:.04, hl:.17, hw:.12, c:'#8a8e94', d:'#2a2a2a', m:'#2a2a2a', ear:'rond', queue:'anneaux', qc:'#e9e6e0', qd:'#2a2a2a' },
  // ---- prédateurs ----
  loup:     { T:1,   w:0.2,  nl:.1, hl:.26, hw:.12, c:'#8a8680', d:'#3a3632', m:'#d8d0c0', queue:'fournie', qc:'#7a766f', qt:'#3a3632', nez:'#1f1c1a' },
  ours_brun:{ T:1.6,  w:0.36,  nl:.04, hl:.24, hw:.2,  c:'#6a4430', d:'#3a261a', m:'#8a6446', ear:'rond', queue:'court', nez:'#1f1a16' },
  ours_polaire: { T:2, w:0.34, nl:.06, hl:.3, hw:.17, c:'#f4f1ea', d:'#cfc9bc', m:'#e8e2d4', ear:'rond', queue:'court', nez:'#1f1c1a' },
  ours_noir:{ T:1.4,   w:0.35, nl:.04, hl:.25, hw:.19, c:'#2a2522', d:'#15110f', m:'#a98a62', ear:'rond', queue:'court', nez:'#15110f' },
  lion:     { T:1.5,  w:0.26,  nl:.04, hl:.2,  hw:.14, c:'#d4a05a', d:'#a8763a', m:'#e9d4b0', ear:'rond', queue:'longue', qd:'#4a2e14', mane:'lion', mc:'#7a4a22', nez:'#8a5448' },
  tigre:    { T:1.7,    w:0.28, nl:.08, hl:.22, hw:.15, c:'#e08a2c', d:'#a8601c', m:'#f3ead6', ear:'rond', queue:'longue', qd:'#1f1c1a', deco:'rayures', dc:'#1f1c1a', nez:'#a0675a' },
  leopard:  { T:1.1,   w:0.22,  nl:.08, hl:.2,  hw:.13, c:'#e0b060', d:'#a8803a', m:'#f3ead6', ear:'rond', queue:'longue', qd:'#2a2218', deco:'rosettes', dc:'#3a2c1a', nez:'#a0675a' },
  guepard:  { T:1.1,  w:0.18, nl:.1,  hl:.18, hw:.1,  c:'#e4be70', d:'#a8803a', m:'#f3ead6', ear:'rond', queue:'longue', qd:'#2a2218', deco:'taches', dc:'#3a2c1a', nez:'#2a2218' },
  hyene:    { T:1.1,  w:0.26, nl:.1,  hl:.24, hw:.15, c:'#a89a78', d:'#4a4030', m:'#2a241c', ear:'rond', queue:'court', qc:'#3a3226', mane:'bande', mc:'#6a5a42', deco:'taches', dc:'#4a4030' },
  jaguar:   { T:1.2,  w:0.3,  nl:.06, hl:.2,  hw:.15, c:'#d8a640', d:'#a8741c', m:'#f3ead6', ear:'rond', queue:'longue', qd:'#2a2218', deco:'rosettes', dc:'#2a2218', big:1, nez:'#a0675a' },
  puma:     { T:1.2,  w:0.22,  nl:.08, hl:.19, hw:.12, c:'#c8a070', d:'#8a6a44', m:'#f3ead6', ear:'rond', queue:'longue', qd:'#2a2218', nez:'#a0675a' },
  phoque:   { t:'pinni', T:1.5, w:.3, c:'#b4b8bc', d:'#70757a', m:'#2a2622', taches:1 },
  morse:    { t:'pinni', T:3, w:.44, c:'#a6805f', d:'#6e4e3a', m:'#d9c9a6', defense:1 },
  manchot:  { t:'manchot', T:.85, w:.46, c:'#26292e', d:'#14161a', m:'#f2994a' },
  crocodile:{ t:'croco', T:2.7, w:.2, c:'#5e6b3a', d:'#3a4426' },
  lynx:     { T:0.8,  w:0.24,  nl:.04, hl:.2,  hw:.17, c:'#b09068', d:'#4a3a2a', m:'#efe6d4', ear:'tuft', queue:'court', qc:'#b09068', qt:'#2a2218', deco:'taches', dc:'#6a4e34', nez:'#a0675a' },
  panthere_neige: { T:1.1, w:0.24, nl:.07, hl:.19, hw:.13, c:'#c4c0b8', d:'#8a867e', m:'#efeae0', ear:'rond', queue:'epaisse', deco:'rosettes', dc:'#4a4a4c', nez:'#a0675a' },
  dingo:    { T:0.9,  w:0.2, nl:.08, hl:.23, hw:.11, c:'#c89860', d:'#7a5a38', m:'#efe2c8', queue:'fournie', qc:'#c89860', qt:'#f3ead6', nez:'#2a2018' },
};
const ANIMAL_INK = '#2b2620';
const aMel = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.substr(i, 2), 16) * (1 - t) + parseInt(b.substr(i, 2), 16) * t).toString(16).padStart(2, '0')).join('');
// les réglages faits dans l'éditeur (editeur-animaux.html) sont gardés dans le navigateur et remplacent les dessins d'origine
const ANIMAUX_DEFAUT = JSON.parse(JSON.stringify(ANIMAUX));
try { const o = JSON.parse(localStorage.getItem('animaux.v1') || '{}'); for (const k in o) if (ANIMAUX[k]) { const { L, ...r } = o[k]; ANIMAUX[k] = { ...ANIMAUX_DEFAUT[k], ...r }; } } catch (e) {}   // (anciens réglages : sans L, avec la taille T par défaut)

// ---- petits outils (dans le repère de l'animal : x vers l'avant, 1 = longueur du corps) ----
const aPath = pts => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); };
const aEll = (x, y, rx, ry, col, rot = 0, st = true) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, 7); if (col) { ctx.fillStyle = col; ctx.fill(); } if (st) ctx.stroke(); };
const aPoly = (pts, col, st = true) => { aPath(pts); if (col) { ctx.fillStyle = col; ctx.fill(); } if (st) ctx.stroke(); };
const aSym = f => { f(1); f(-1); };
function aBrin(pts, w, col) {                                                     // trait épais à contour (queue, corne, défense)
  const tr = () => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); };
  const lw = ctx.lineWidth; tr(); ctx.lineWidth = w + lw * 2; ctx.strokeStyle = ANIMAL_INK; ctx.stroke(); tr(); ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke(); ctx.lineWidth = lw; ctx.strokeStyle = ANIMAL_INK;
}
const aCourbe = (p0, p1, p2, n = 8) => Array.from({ length:n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]; });
function aEffile(pts, ws, col) {                                                 // trompe, queue de croco : bande qui s'affine le long d'une ligne
  const L = [], R = [];
  pts.forEach((p, i) => { const q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)], dx = q[0] - o[0], dy = q[1] - o[1], n = Math.hypot(dx, dy) || 1, nx = -dy / n * ws[i] / 2, ny = dx / n * ws[i] / 2; L.push([p[0] + nx, p[1] + ny]); R.push([p[0] - nx, p[1] - ny]); });
  aPoly(L.concat(R.reverse()), col);
}
// grande oreille d'éléphant : un éventail plaqué sur l'épaule, attaché au côté de la tête, qui part vers l'extérieur puis retombe vers l'arrière
function aOreilleGrande(s, x0, hw, k, col, inner) {
  const y0 = hw * .4, P = [[x0 + .05, .06], [x0 + .03, .17 * k], [x0 - .06 * k, .27 * k], [x0 - .17 * k, .3 * k], [x0 - .26 * k, .24 * k], [x0 - .27 * k, .13 * k], [x0 - .15, y0 * .5]].map(p => [p[0], s * (p[1] + (p[1] > .1 ? y0 * .35 : 0))]);
  const lisse = (Q, f, st) => { const n = Q.length, m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], m0 = m(Q[n - 1], Q[0]); ctx.beginPath(); ctx.moveTo(m0[0], m0[1]); for (let i = 0; i < n; i++) { const e = m(Q[i], Q[(i + 1) % n]); ctx.quadraticCurveTo(Q[i][0], Q[i][1], e[0], e[1]); } ctx.closePath(); ctx.fillStyle = f; ctx.fill(); if (st) ctx.stroke(); };
  lisse(P, col, true);
  const cx = P.reduce((q, p) => q + p[0], 0) / P.length, cy = P.reduce((q, p) => q + p[1], 0) / P.length;
  lisse(P.map(p => [cx + (p[0] - cx) * .62 - .01, cy + (p[1] - cy) * .62]), inner, false);
}

// ---- quadrupèdes ----
// silhouette du corps vu de dessus : épaules larges, taille plus fine (k : 1 = pas de taille), bassin, croupe arrondie ; contour lisse (ou à facettes en low-poly)
function aCorpsPts(bw, k) {
  const R = [[-.47, .5], [-.39, .88], [-.28, 1], [-.15, (1 + k) / 2], [-.02, k], [.11, (1 + k) / 2], [.23, 1], [.35, .9], [.44, .6]];
  return [[-.5, 0], ...R.map(([x, r]) => [x, -r * bw]), [.5, 0], ...R.slice().reverse().map(([x, r]) => [x, r * bw])];
}
function aCorpsPath(P) {
  const n = P.length, m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], m0 = m(P[n - 1], P[0]);
  ctx.beginPath(); ctx.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const e = m(P[i], P[(i + 1) % n]); ctx.quadraticCurveTo(P[i][0], P[i][1], e[0], e[1]); }
  ctx.closePath();
}
function aCorps(P, col) { aCorpsPath(P); ctx.fillStyle = col; ctx.fill(); ctx.stroke(); }

function aQuad(a) {
  const bw = a.w / 2 * 1.25, hl = a.hl * 1.35, hw = a.hw * 1.45, hx = .36 + a.nl + hl * .4, c = a.c, d = a.d, pw = a.pw || .062, hcol = a.hcol || c;
  if (a.queue !== 'aucune') aEll(-.54, 0, .055, .045, d);                                                                              // queue : un simple ovale
  const neck = [[.3, bw * .72], [.36 + a.nl, hw * .5], [.36 + a.nl, -hw * .5], [.3, -bw * .72]];                                         // cou, puis corps
  if (a.nl > 0) aPoly(neck, c);
  const BP = aCorpsPts(bw, a.taille || .82);
  aCorps(BP, c);
  // oreilles (sous la tête) : base contre la tête, pointe vers l'arrière et l'extérieur
  const ex = hx - hl * .18, ey = hw * .5, ec = a.ec || hcol, ei = aMel(/^#[0-9a-f]{6}$/i.test(ec) ? ec : '#8a7a6a', '#e3bfae', .4);
  const oreille = (s, bx, by, l, r, an) => { const cx = bx - Math.cos(an) * l, cy = s * (by + Math.sin(an) * l); aEll(cx, cy, l, r, ec, -s * an); aEll(cx + Math.cos(an) * l * .1, cy, l * .6, r * .45, ei, -s * an, false); };
  aSym(s => {
    if (a.ear === 'aucune') return;
    if (a.ear === 'long') oreille(s, ex, ey * .8, .11, .034, .5);                     // âne, kangourou : en V vers l'arrière
    else if (a.ear === 'dos') oreille(s, ex, ey * .45, .14, .03, .14);               // lièvre : couchées le long du dos
    else if (a.ear === 'banane') oreille(s, ex + .01, ey * .7, .065, .026, .55);     // lama, alpaga, guanaco : courtes et dressées
    else if (a.ear === 'rond') aEll(ex, s * (ey + .025), .045, .045, ec);
    else if (a.ear === 'grand') aOreilleGrande(s, hx - hl * .1, hw, a.es || 1, c, a.ei || d);
    else if (a.ear === 'penche') aEll(ex + .02, s * (ey + .05), .08, .06, d, s * .4);
    else if (a.ear === 'horiz') { aEll(ex, s * (ey + .07), .04, .085, ec); aEll(ex, s * (ey + .08), .018, .05, ei, 0, false); }
    else if (a.ear === 'tuft') { aEll(ex, s * (ey + .03), .05, .035, ec, s * .6); aBrin([[ex - .02, s * (ey + .05)], [ex - .08, s * (ey + .09)]], .012, a.qt); }
    else aEll(ex - .01, s * (ey + .05), .06, .035, ec, s * 1.2);
  });
  // corne, bois, défense : derrière la tête
  const hs = a.hs || 1, hc = a.hc || '#e8dfc8', cx = hx - .02;
  if (a.corne === 'cornes') aSym(s => aBrin(aCourbe([cx - .03, s * hw * .42], [cx - .06, s * (hw * .42 + .12 * hs)], [cx + .06 * hs, s * (hw * .42 + .14 * hs)], 6), .028, hc));
  else if (a.corne === 'bouc') aSym(s => aBrin(aCourbe([cx, s * .05], [cx - .12 * hs, s * .12 * hs], [cx - .26 * hs, s * (.05 + .02 * hs)], 6), .026 + .004 * hs, hc));
  else if (a.corne === 'lyre') aSym(s => aBrin(aCourbe([cx, s * .05], [cx - .1, s * .15], [cx - .2, s * .13], 6), .016, hc));
  else if (a.corne === 'droites') aSym(s => aBrin([[cx, s * .04], [cx - .34, s * .07]], .014, hc));
  else if (a.corne === 'bois' || a.corne === 'palme') {
    if (a.corne === 'palme') aSym(s => aPoly([[cx - .02, .07], [cx + .08, .14], [cx + .02, .18], [cx + .09, .27], [cx + .02, .3], [cx + .07, .4], [cx - .01, .4], [cx - .04, .47], [cx - .13, .42], [cx - .17, .3], [cx - .12, .16], [cx - .07, .08]].map(p => [p[0], s * p[1]]), hc));
    else aBois(cx, hs, a.tines, hc);
  }
  if (a.defense) aSym(s => aBrin(a.defense === 'longue' ? aCourbe([hx + hl * .45, s * .06], [hx + hl * .95, s * .13], [hx + hl * 1.35, s * .08], 6) : a.defense === 'courte' && !a.trompe ? [[hx + hl * .4, s * .05], [hx + hl * .6, s * .08]] : aCourbe([hx + hl * .45, s * .06], [hx + hl * .8, s * .11], [hx + hl * 1.0, s * .08], 5), .03, '#f2ead6'));
  // tête : crâne, reflet du front, museau, yeux, narines ou truffe
  aPoly([[hx - hl * .52, 0], [hx - hl * .42, -hw * .5], [hx - hl * .1, -hw * .54], [hx + hl * .25, -hw * .4], [hx + hl * .55, -hw * .3], [hx + hl * .62, 0], [hx + hl * .55, hw * .3], [hx + hl * .25, hw * .4], [hx - hl * .1, hw * .54], [hx - hl * .42, hw * .5]], hcol);
  aEll(hx - hl * .1, 0, hl * .3, hw * .28, 'rgba(255,255,255,.1)', 0, false);
  aEll(hx + hl * .42, 0, hl * .3, hw * .32, a.m || d);
  aSym(s => { aEll(hx - hl * .02, s * hw * .52, .016, .016, ANIMAL_INK, 0, false); if (!a.nez) aEll(hx + hl * .6, s * hw * .1, .008, .008, ANIMAL_INK, 0, false); });
  if (a.nez) aEll(hx + hl * .62, 0, Math.max(.018, hw * .1), Math.max(.022, hw * .14), a.nez, 0, false);
  if (a.corne === 'rhino') { aEll(hx + hl * .32, 0, .045, .04, hc); aEll(hx - hl * .05, 0, .028, .025, hc); }
  if (a.trompe) { const sx = hx + hl * .42, t = a.trompe, P = aCourbe([sx, 0], [sx + .2 * t, 0], [sx + .3 * t, .05 * t], 8); aEffile(P, P.map((_, i) => .1 - i * .008), c); }
  if (a.casque) aEll(hx, 0, .03, .025, '#c9a76a');
}

// bois : une perche presque latérale, qui part légèrement vers l'arrière, avec des pointes vers l'avant ; tout est peint d'un seul bloc
// (contours d'abord, couleur ensuite : pas de trait entre la perche et les pointes)
function aBois(cx, k, n, col) {
  const segs = [], BX = [-.03, -.05, -.08, -.1, -.09], BY = [.06, .11, .18, .25, .31];                   // perche : latérale, balayée vers l'arrière, le bout se redresse un peu
  for (const s of [1, -1]) {
    const B = BX.map((x, i) => [cx + x * k, s * BY[i] * k]);
    segs.push([B, .02]);
    for (let i = 0; i < n; i++) {                                                                       // andouillers : le premier (sourcilier) vers l'avant, les suivants plus courts et plus ouverts
      const p = B[Math.min(1 + i, 3)], an = .75 - i * .12, l = (.085 - i * .01) * k;
      segs.push([[p, [p[0] + Math.cos(an) * l, p[1] + s * Math.sin(an) * l * .8]], .014]);
    }
    const e = B[4]; segs.push([[e, [e[0] + .06 * k, e[1] + s * .03 * k]], .013], [[e, [e[0] + .01 * k, e[1] + s * .07 * k]], .013]);     // fourche du bout
  }
  const lw = ctx.lineWidth, tr = P => { ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); };
  for (const [P, w] of segs) { tr(P); ctx.lineWidth = w + lw * 2; ctx.strokeStyle = ANIMAL_INK; ctx.stroke(); }          // contours d'abord, puis la couleur : tout fusionne
  for (const [P, w] of segs) { tr(P); ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke(); }
  ctx.lineWidth = lw; ctx.strokeStyle = ANIMAL_INK;
}

/* ---- dessin simplifié (13/10) : tous les animaux sont bicolores, au plus simple — corps en c, queue en d ; ni pattes, ni crinière, ni bosses, ni taches ou rayures, ni modelé. Les TÊTES restent comme avant (oreilles, cornes, bois, museau, yeux, trompe). Validé et remplacé le 13/10 : les anciens dessins détaillés sont supprimés. ---- */
function aAutres(a) {                                                                      // oiseaux, crocodile, phoques, manchots
  const c = a.c, d = a.d;
  if (a.t === 'croco') {
    aEffile([[-.25, 0], [-.45, .015], [-.62, .04], [-.8, .02]], [.1, .075, .045, .012], c); aEll(0, 0, .3, .105, c);
    aEffile([[.22, 0], [.34, 0], [.48, 0], [.62, 0]], [.11, .095, .07, .055], c); aEll(.63, 0, .035, .032, d);
    aSym(s => { aEll(.29, s * .045, .02, .02, c); aEll(.29, s * .045, .008, .008, ANIMAL_INK, 0, false); });
  } else if (a.t === 'pinni') {
    aEffile([[-.42, 0], [-.22, 0], [0, 0], [.2, 0], [.33, 0]], [a.w * .3, a.w * .88, a.w, a.w * .85, a.w * .55], c);
    aEll(.37, 0, .105, a.w * .3, c); aEll(.46, 0, .04, a.w * .15, a.m);
    aSym(s => { aEll(.4, s * a.w * .17, .014, .014, ANIMAL_INK, 0, false); if (a.defense) aBrin([[.47, s * .03], [.53, s * .045], [.62, s * .04]], .022, '#f1ead6'); });
  } else if (a.t === 'manchot') {
    aEll(0, 0, .4, a.w / 2, c); aEll(.4, 0, .11, .1, d);
    aSym(s => aEll(.37, s * .085, .045, .022, a.m, s * .3, false));
    aPoly([[.5, -.035], [.62, 0], [.5, .035]], a.m);
    aSym(s => aEll(.43, s * .045, .013, .013, '#f4f1ea', 0, false));
  } else {                                                                                      // oiseau
    const bw = a.w / 2, nl = a.nl, hx = .3 + nl + .02;
    aEll(-.4, 0, .11, .1, d);
    if (nl > .05) aPoly([[.26, bw * .35], [hx - .03, .03], [hx - .03, -.03], [.26, -bw * .35]], a.nc);
    aEll(0, 0, .34, bw, c);
    if (a.wattle) aEll(hx + .07, 0, .03, .045, '#c0392b');
    aEll(hx, 0, .052, .047, a.hc); aPoly([[hx + .04, .02], [hx + .13, 0], [hx + .04, -.02]], a.bk);
    aSym(s => aEll(hx + .005, s * .03, .01, .01, ANIMAL_INK, 0, false));
    if (a.casque) aEll(hx - .015, 0, .03, .025, '#c9a76a');
  }
}

function peintAnimal(k, x, y, L, ang = 0) {
  const a = { t:'quad', ...ANIMAUX[k] }, bw = a.w / 2;
  ctx.save(); ctx.translate(x + L * .035, y + L * .06); ctx.rotate(ang); ctx.scale(L, L);
  ctx.fillStyle = 'rgba(40,34,20,.26)'; ctx.beginPath(); ctx.ellipse(0, 0, a.t === 'croco' ? .55 : .5, a.t === 'croco' ? .13 : bw, 0, 0, 7);
  if (a.t === 'quad') ctx.ellipse(.36 + (a.nl || 0) + (a.hl || .2) * .4, 0, (a.hl || .15) * .6, (a.hw || .1) / 2 + .01, 0, 0, 7);
  else if (a.t === 'oiseau') ctx.ellipse(.3 + a.nl + .02, 0, .06, .05, 0, 0, 7);
  ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(L, L); ctx.lineJoin = ctx.lineCap = 'round'; ctx.lineWidth = 1.7 / L; ctx.strokeStyle = ANIMAL_INK;
  (a.t === 'quad' ? aQuad : aAutres)(a);
  ctx.restore();
}
/* Animaux en images pour la carte graphique : chaque animal (espèce × taille arrondie à un quart d'octave, soit ±9 % d'écart) est peint UNE fois par peintAnimal, tourné vers la droite, puis rogné à son contour ;
   à chaque image la carte graphique l'affiche (position, rotation, échelle) au lieu de retracer ses courbes (voir gpuFaune, faune.js). Cache de ANIM_TEX_MAX images, les moins récentes sortent d'abord. */
const ANIM_TEX = new Map(), ANIM_TEX_MAX = 90;
function animalTexture(k, Ld) {
  const Lq = Math.max(4, Math.round(2 ** (Math.round(Math.log2(Ld) * 4) / 4))), cle = k + ':' + Lq;
  let e = ANIM_TEX.get(cle);
  if (e) { ANIM_TEX.delete(cle); ANIM_TEX.set(cle, e); return e; }                 // (le plus récemment utilisé passe en dernier)
  const S = Math.ceil(Lq * 3.4), c = document.createElement('canvas'); c.width = c.height = S;
  paintWith(c.getContext('2d'), S, S, 1, 0, 0, () => peintAnimal(k, S / 2, S / 2, Lq, 0));
  const px = c.getContext('2d').getImageData(0, 0, S, S).data; let x0 = S, y0 = S, x1 = -1, y1 = -1;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (px[(y * S + x) * 4 + 3] > 3) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) { x0 = y0 = 0; x1 = y1 = 1; }
  x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(S - 1, x1 + 1); y1 = Math.min(S - 1, y1 + 1);
  const w = x1 - x0 + 1, h = y1 - y0 + 1, r = document.createElement('canvas'); r.width = w; r.height = h; r.getContext('2d').drawImage(c, x0, y0, w, h, 0, 0, w, h);
  c.width = c.height = 0;
  e = { tex:PIXI.Texture.from(r, { mipmap:PIXI.MIPMAP_MODES.OFF, scaleMode:PIXI.SCALE_MODES.LINEAR }), Lq, ax:(S / 2 - x0) / w, ay:(S / 2 - y0) / h };
  ANIM_TEX.set(cle, e);
  if (ANIM_TEX.size > ANIM_TEX_MAX) { const [vieux, v] = ANIM_TEX.entries().next().value; ANIM_TEX.delete(vieux); v.tex.destroy(true); }
  return e;
}
// étendue d'un animal de part et d'autre du centre du corps, en longueurs de corps : [vers l'arrière, vers l'avant] (pour le cadrer)
function animalEtendue(k) {
  const a = { t:'quad', ...ANIMAUX[k] };
  if (a.t === 'croco') return [.82, .68];
  if (a.t === 'pinni') return [.52, .68];
  if (a.t === 'manchot') return [.52, .68];
  if (a.t === 'oiseau') return [.5, .3 + a.nl + .15];
  const g = a.queue === 'aucune' ? .5 : .6;
  return [g, .36 + a.nl + a.hl * 1.35 * .9 + (a.trompe ? .35 * a.trompe : 0) + (a.defense === 'longue' ? .15 : 0)];
}
