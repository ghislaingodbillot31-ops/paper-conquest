/* ---------- animaux : le dessin ----------
   Les 62 animaux terrestres du jeu (LAND_ANIMALS, js/jeu/ressources.js), vus de dessus, tête vers la droite, symétriques, même style que les arbres
   fruitiers (contour sombre, ombre au sud-est). Trois gabarits : 'quad' (quadrupèdes), 'oiseau', 'croco'. Un animal :
     T longueur du tronc en mètres (taille réelle) · w largeur du corps (÷ longueur) · nl cou · hl, hw tête · c corps · d extrémités (pattes, oreilles) · m museau
     ear oreille : pointe | long | rond | grand | penche | horiz · queue : fin | touffe | fournie | court | longue | epaisse | palette | anneaux | boucle | aucune
     corne : cornes | bouc | lyre | droites | bois | palme | rhino · defense · trompe · mane : bande | lion | hirsute · laine
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
  lama:     { hcol:'#8a6a4c', T:1.3,  w:0.26, nl:.27, hl:.2,  hw:.1,  c:'#e0d3bd', d:'#6a5a46', m:'#6a5a46', ear:'long', queue:'court', laine:1 },
  alpaga:   { hcol:'#d8c8b0', T:1,   w:0.27, nl:.22, hl:.18, hw:.1,  c:'#efe6d8', d:'#7a6a56', m:'#6a5a46', ear:'pointe', queue:'court', laine:1 },
  elephant_asie: { T:3, w:0.44, nl:.05, hl:.24, hw:.26, c:'#8a8f94', d:'#6a7076', m:'#6a7076', ear:'grand', es:.75, ei:'#b9a6a0', trompe:1, defense:'courte', queue:'fin', pw:.1 },
  dindon:   { t:'oiseau', T:0.8, w:.42, c:'#6b4a2e', wc:'#8a6a42', wd:'#3a2a1a', nl:.1, nc:'#b9606a', hc:'#3a7ab8', bk:'#d9c070', tail:'eventail', tc:'#7a5a38', td:'#d8c090', wattle:1 },
  cobaye:   { T:0.22,   w:0.4, nl:0, hl:.24, hw:.2, c:'#c8864a', d:'#8a5a30', m:'#e9d9bf', ear:'rond', queue:'aucune', deco:'plaques', dc:'#f6efe0' },
  // ---- faune sauvage ----
  cerf:     { T:1.5,    w:0.24, nl:.17, hl:.24, hw:.12, c:'#8f5a35', d:'#5a3a25', m:'#3a2518', queue:'court', corne:'bois', tines:5, hc:'#cbbd9a' },
  chevreuil:{ T:0.95,   w:0.24,  nl:.12, hl:.2,  hw:.1,  c:'#a8744a', d:'#6a4a30', m:'#3a2518', queue:'court', corne:'bois', tines:2, hs:.55, hc:'#cbbd9a', deco:'croupe' },
  sanglier: { T:1.2,   w:0.34, nl:.04, hl:.3,  hw:.15, c:'#4a4036', d:'#2a241e', m:'#2a241e', queue:'court', defense:'courte', deco:'dos', dc:'#241e18' },
  elan:     { T:2,  w:0.32, nl:.1,  hl:.34, hw:.17, c:'#4a3a30', d:'#2a201a', m:'#2a201a', queue:'court', corne:'palme', hc:'#cbbd9a' },
  renne:    { T:1.3,   w:0.26, nl:.14, hl:.24, hw:.13, c:'#7a6a5a', d:'#4a3a2e', m:'#3a2e24', queue:'court', corne:'bois', tines:4, hc:'#cdbf9c', mane:'bande', mc:'#efe9dc' },
  bison:    { T:2.2,  w:0.36, nl:.06, hl:.24, hw:.2,  c:'#6a4a32', d:'#2a1f18', m:'#2a1f18', ear:'rond', corne:'cornes', hs:.6, hc:'#2a1f18', queue:'touffe', qc:'#2a1f18', mane:'hirsute', mc:'#3a2a1e', bosse:[[.22, .12, .15]], bc:'#3a2a1e' },
  boeuf_musque: { hcol:'#1e1914', T:1.6, w:0.38, nl:.05, hl:.22, hw:.17, c:'#2f2822', d:'#1e1914', m:'#1e1914', ear:'rond', corne:'cornes', hs:.8, hc:'#d8cfb6', queue:'court', laine:1 },
  castor:   { T:0.6,   w:0.3, nl:.02, hl:.2,  hw:.15, c:'#6a4a30', d:'#3a2a1a', m:'#3a2a1a', ear:'rond', queue:'palette', qc:'#3a2d22' },
  zibeline: { T:0.3,  w:0.13, nl:.06, hl:.17, hw:.1,  c:'#4a3320', d:'#2a1c10', m:'#2a1c10', ear:'rond', queue:'fournie', qc:'#3a2616' },
  renard:   { T:0.5,   w:0.2, nl:.05, hl:.22, hw:.11, c:'#c8602a', d:'#2a2018', m:'#e9dcc8', queue:'fournie', qc:'#c8602a', qt:'#f6f0e4' },
  hermine:  { T:0.22,  w:0.1, nl:.04, hl:.16, hw:.09, c:'#f3efe6', d:'#a09a8c', m:'#d8d2c4', ear:'rond', queue:'fin', qc:'#2a2622' },
  lievre:   { T:0.38,   w:0.26, nl:.02, hl:.16, hw:.11, c:'#a58660', d:'#5a4630', m:'#e9dcc8', ear:'long', queue:'court', qc:'#f3efe6' },
  bouquetin:{ T:1,  w:0.26, nl:.1,  hl:.2,  hw:.11, c:'#8a7360', d:'#4a3a2e', m:'#3a2e24', corne:'bouc', hs:1.9, hc:'#9a8a6a', queue:'court' },
  saiga:    { T:0.95,  w:0.24,  nl:.07, hl:.28, hw:.15, c:'#d8c49c', d:'#8a7a5a', m:'#c8b48c', corne:'lyre', hc:'#c9a050', queue:'court' },
  gazelle:  { T:0.9,   w:0.2, nl:.12, hl:.2,  hw:.1,  c:'#d0a070', d:'#6a4a30', m:'#3a2a1c', corne:'lyre', hc:'#3a2e24', queue:'court', deco:'flancs', dc:'#6a4a30' },
  antilope: { T:1.4,  w:0.24, nl:.12, hl:.24, hw:.11, c:'#d8c8aa', d:'#6a5a44', m:'#3a2e24', corne:'droites', hc:'#3a2e24', queue:'fin', deco:'flancs', dc:'#8a6a4a' },
  zebre:    { T:1.6,  w:0.27, nl:.15, hl:.26, hw:.13, c:'#f2f0ea', d:'#1f1c1a', m:'#2a2622', queue:'touffe', qc:'#1f1c1a', mane:'bande', mc:'#1f1c1a', deco:'rayures', dc:'#1f1c1a' },
  autruche: { t:'oiseau', T:1.45, w:.5, c:'#26221f', wc:'#f4f1ea', wd:'#26221f', nl:.34, nc:'#d9a89a', hc:'#d9a89a', bk:'#e6d4a8', tail:'plume', tc:'#f4f1ea' },
  nandou:   { t:'oiseau', T:0.9, w:.46, c:'#8a7a6a', wc:'#9a8a7a', wd:'#5a4c40', nl:.26, nc:'#a89a8a', hc:'#a89a8a', bk:'#6a5c4c', tail:'plume', tc:'#8a7a6a' },
  emeu:     { t:'oiseau', T:1.1, w:.5, c:'#6a5a4a', wc:'#7a6a58', wd:'#4a3e32', nl:.28, nc:'#7a8a96', hc:'#7a8a96', bk:'#3a342c', tail:'plume', tc:'#6a5a4a' },
  casoar:   { t:'oiseau', T:0.9, w:.48, c:'#1f1d22', wc:'#2a272e', wd:'#0f0e12', nl:.22, nc:'#3a7ab8', hc:'#3a7ab8', bk:'#c9a050', tail:'plume', tc:'#1f1d22', casque:1 },
  elephant_afrique: { T:3.4, w:0.46, nl:.05, hl:.24, hw:.28, c:'#8a8480', d:'#6a6460', m:'#6a6460', ear:'grand', es:1.25, ei:'#b09a94', trompe:1, defense:'longue', queue:'fin', pw:.1 },
  hippopotame: { T:2.6, w:0.5, nl:.02, hl:.3, hw:.3, c:'#8a7f88', d:'#6a5f68', m:'#a8949a', ear:'rond', queue:'court', pw:.09 },
  rhinoceros:  { T:2.6, w:0.42, nl:.04, hl:.3, hw:.2, c:'#8a8a86', d:'#6a6a66', m:'#6a6a66', ear:'pointe', corne:'rhino', hc:'#b9b09a', queue:'fin', pw:.09 },
  tapir:    { T:1.3,  w:0.34, nl:.03, hl:.28, hw:.17, c:'#2a2622', d:'#1a1714', m:'#2a2622', ear:'rond', ec:'#e8e2d4', trompe:.5, queue:'court', deco:'selle', dc:'#e8e2d4' },
  capybara: { T:0.9,   w:0.34, nl:.02, hl:.22, hw:.17, c:'#8a6a48', d:'#5a4030', m:'#5a4030', ear:'rond', queue:'aucune' },
  guanaco:  { T:1.2,  w:0.26, nl:.24, hl:.2,  hw:.1,  c:'#b88860', d:'#8a8a86', m:'#8a8a86', ear:'long', queue:'court' },
  kangourou:{ T:1.1,   w:0.24, nl:.07, hl:.22, hw:.12, c:'#b87e50', d:'#7a5a38', m:'#e9d4b8', ear:'long', queue:'epaisse', pw:.1 },
  lemurien: { T:0.35,  w:0.16, nl:.04, hl:.17, hw:.12, c:'#8a8e94', d:'#2a2a2a', m:'#2a2a2a', ear:'rond', queue:'anneaux', qc:'#e9e6e0', qd:'#2a2a2a' },
  // ---- prédateurs ----
  loup:     { T:1,   w:0.2,  nl:.1, hl:.26, hw:.12, c:'#8a8680', d:'#3a3632', m:'#d8d0c0', queue:'fournie', qc:'#7a766f', qt:'#3a3632' },
  ours_brun:{ T:1.6,  w:0.36,  nl:.04, hl:.24, hw:.2,  c:'#6a4430', d:'#3a261a', m:'#8a6446', ear:'rond', queue:'court' },
  ours_polaire: { T:2, w:0.34, nl:.06, hl:.3, hw:.17, c:'#f4f1ea', d:'#cfc9bc', m:'#2a2622', ear:'rond', queue:'court' },
  ours_noir:{ T:1.4,   w:0.35, nl:.04, hl:.25, hw:.19, c:'#2a2522', d:'#15110f', m:'#a98a62', ear:'rond', queue:'court' },
  lion:     { T:1.5,  w:0.26,  nl:.04, hl:.2,  hw:.14, c:'#d4a05a', d:'#a8763a', m:'#e9d4b0', ear:'rond', queue:'longue', qd:'#4a2e14', mane:'lion', mc:'#7a4a22' },
  tigre:    { T:1.7,    w:0.28, nl:.08, hl:.22, hw:.15, c:'#e08a2c', d:'#a8601c', m:'#f3ead6', ear:'rond', queue:'longue', qd:'#1f1c1a', deco:'rayures', dc:'#1f1c1a' },
  leopard:  { T:1.1,   w:0.22,  nl:.08, hl:.2,  hw:.13, c:'#e0b060', d:'#a8803a', m:'#f3ead6', ear:'rond', queue:'longue', qd:'#2a2218', deco:'rosettes', dc:'#3a2c1a' },
  guepard:  { T:1.1,  w:0.18, nl:.1,  hl:.18, hw:.1,  c:'#e4be70', d:'#a8803a', m:'#f3ead6', ear:'rond', queue:'longue', qd:'#2a2218', deco:'taches', dc:'#3a2c1a' },
  hyene:    { T:1.1,  w:0.26, nl:.1,  hl:.24, hw:.15, c:'#a89a78', d:'#4a4030', m:'#2a241c', ear:'rond', queue:'court', qc:'#3a3226', mane:'bande', mc:'#6a5a42', deco:'taches', dc:'#4a4030' },
  jaguar:   { T:1.2,  w:0.3,  nl:.06, hl:.2,  hw:.15, c:'#d8a640', d:'#a8741c', m:'#f3ead6', ear:'rond', queue:'longue', qd:'#2a2218', deco:'rosettes', dc:'#2a2218', big:1 },
  puma:     { T:1.2,  w:0.22,  nl:.08, hl:.19, hw:.12, c:'#c8a070', d:'#8a6a44', m:'#f3ead6', ear:'rond', queue:'longue', qd:'#2a2218' },
  crocodile:{ t:'croco', T:2.7, w:.2, c:'#5e6b3a', d:'#3a4426' },
  lynx:     { T:0.8,  w:0.24,  nl:.04, hl:.2,  hw:.17, c:'#b09068', d:'#4a3a2a', m:'#efe6d4', ear:'tuft', queue:'court', qc:'#b09068', qt:'#2a2218', deco:'taches', dc:'#6a4e34' },
  panthere_neige: { T:1.1, w:0.24, nl:.07, hl:.19, hw:.13, c:'#c4c0b8', d:'#8a867e', m:'#efeae0', ear:'rond', queue:'epaisse', deco:'rosettes', dc:'#4a4a4c' },
  dingo:    { T:0.9,  w:0.2, nl:.08, hl:.23, hw:.11, c:'#c89860', d:'#7a5a38', m:'#efe2c8', queue:'fournie', qc:'#c89860', qt:'#f3ead6' },
};
const ANIMAL_INK = '#2b2620';
const aMel = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.substr(i, 2), 16) * (1 - t) + parseInt(b.substr(i, 2), 16) * t).toString(16).padStart(2, '0')).join('');
// les réglages faits dans l'éditeur (editeur-animaux.html) sont gardés dans le navigateur et remplacent les dessins d'origine
const ANIMAUX_DEFAUT = JSON.parse(JSON.stringify(ANIMAUX));
try { const o = JSON.parse(localStorage.getItem('animaux.v1') || '{}'); for (const k in o) if (ANIMAUX[k]) { const { L, ...r } = o[k]; ANIMAUX[k] = { ...ANIMAUX_DEFAUT[k], ...r }; } } catch (e) {}   // (anciens réglages : sans L, avec la taille T par défaut)

// ---- petits outils (dans le repère de l'animal : x vers l'avant, 1 = longueur du corps) ----
/* Deux styles : 'lisse' (formes arrondies) et 'low-poly' (polygones à facettes, éclairés du nord-ouest). Le choix est gardé dans animaux.style. */
let ANIMAL_STYLE = 'lisse';
try { ANIMAL_STYLE = localStorage.getItem('animaux.style') || 'lisse'; } catch (e) {}
const aLP = () => ANIMAL_STYLE === 'low-poly';
const aHash = v => { const t = Math.sin(v * 12.9898) * 43758.5453; return t - Math.floor(t); };
// sommets d'une ellipse en low-poly : peu de côtés, légèrement irréguliers, toujours les mêmes
function aEllPts(x, y, rx, ry, rot) {
  const n = Math.max(6, Math.min(10, Math.round(5 + (rx + ry) * 8))), c = Math.cos(rot), s = Math.sin(rot), P = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + .3, j = 1 + (aHash(x * 13.1 + y * 7.7 + i * 3.3 + rx * 50) - .5) * .16, px = Math.cos(a) * rx * j, py = Math.sin(a) * ry * j; P.push([x + px * c - py * s, y + px * s + py * c]); }
  return P;
}
const aEllPath = (x, y, rx, ry, rot = 0) => { if (aLP()) { aPath(aEllPts(x, y, rx, ry, rot)); } else { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, 7); } };
const aPath = pts => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); };
function aTeinte(col, f) {                                                     // éclaircit (f > 1) ou assombrit (f < 1) une couleur #rrggbb
  if (!/^#[0-9a-f]{6}$/i.test(col)) return col;
  return '#' + [1, 3, 5].map(i => Math.max(0, Math.min(255, Math.round(parseInt(col.substr(i, 2), 16) * f))).toString(16).padStart(2, '0')).join('');
}
function aFacettes(P, col, cx, cy) {                                            // triangles autour d'un sommet central décalé vers la lumière
  const n = P.length;
  for (let i = 0; i < n; i++) {
    const A = P[i], B = P[(i + 1) % n], mx = (A[0] + B[0]) / 2 - cx, my = (A[1] + B[1]) / 2 - cy, an = Math.atan2(my, mx), f = 1 + .2 * Math.cos(an + Math.PI * .75) + (aHash(i * 7.3 + cx * 91 + cy * 37) - .5) * .1;
    aPath([[cx, cy], A, B]); ctx.fillStyle = aTeinte(col, f); ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth *= .5; ctx.stroke(); ctx.lineWidth *= 2;      // (joint invisible entre les facettes)
  }
}
const aFill = (P, col, st) => {
  if (aLP() && /^#[0-9a-f]{6}$/i.test(col)) { const k = P.length, cx = P.reduce((q, p) => q + p[0], 0) / k, cy = P.reduce((q, p) => q + p[1], 0) / k, r = Math.max(...P.map(p => Math.hypot(p[0] - cx, p[1] - cy))); aFacettes(P, col, cx - r * .12, cy - r * .12); }
  else if (col) { aPath(P); ctx.fillStyle = col; ctx.fill(); }
  if (st) { aPath(P); const lw = ctx.lineWidth; if (aLP()) ctx.lineWidth = lw * .7; ctx.stroke(); ctx.lineWidth = lw; }
};
const aEll = (x, y, rx, ry, col, rot = 0, st = true) => {
  if (aLP()) { aFill(aEllPts(x, y, rx, ry, rot), col, st); return; }
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, 7); if (col) { ctx.fillStyle = col; ctx.fill(); } if (st) ctx.stroke();
};
const aPoly = (pts, col, st = true) => { if (aLP()) { aFill(pts, col, st); return; } aPath(pts); if (col) { ctx.fillStyle = col; ctx.fill(); } if (st) ctx.stroke(); };
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
function aFestons(cx, cy, rx, ry, n, r, col) {                                  // contour en boucles (laine, crinière) : traits d'abord, remplissage ensuite
  const C = Array.from({ length:n }, (_, i) => { const a = i / n * Math.PI * 2; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
  for (const pass of [0, 1]) for (const [x, y] of C) pass ? aEll(x, y, r, r, col, 0, false) : aEll(x, y, r, r, null, 0, true);
  aEll(cx, cy, rx, ry, col, 0, false);
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
  if (aLP()) { aPath(P); return; }
  const n = P.length, m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], m0 = m(P[n - 1], P[0]);
  ctx.beginPath(); ctx.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const e = m(P[i], P[(i + 1) % n]); ctx.quadraticCurveTo(P[i][0], P[i][1], e[0], e[1]); }
  ctx.closePath();
}
function aCorps(P, col) {
  if (aLP()) { aFill(P, col, true); return; }
  aCorpsPath(P); ctx.fillStyle = col; ctx.fill(); ctx.stroke();
}
function aQuad(a) {
  const bw = a.w / 2 * 1.25, hl = a.hl * 1.35, hw = a.hw * 1.45, hx = .36 + a.nl + hl * .4, c = a.c, d = a.d, pw = a.pw || .062, hcol = a.hcol || c;
  // pattes : 'sabots' (défaut) à peine visibles, juste le bout foncé qui dépasse du corps ; 'ovales' (anciennes) ; 'aucune'
  const pat = a.pattes || 'aucune';
  if (pat !== 'aucune') aSym(s => {
    for (const [x, f] of [[.27, 1], [-.28, 1.08]]) { const w = pw * f; if (pat === 'ovales') aEll(x, s * bw, w, w * .55, d); else aEll(x, s * (bw + .004), w * .42, w * .3, d); }
  });
  const q = a.queue;                                                                                                                       // queue
  if (q === 'fin') { aBrin([[-.46, 0], [-.58, .04], [-.7, .02]], .03, a.qc || c); }
  else if (q === 'touffe') { aBrin([[-.46, 0], [-.6, .02], [-.68, 0]], .028, a.qc || c); aEll(-.74, 0, .08, .04, a.qc || d); }
  else if (q === 'fournie') { aEll(-.62, 0, .17, .075, a.qc || c); if (a.qt) aEll(-.76, 0, .06, .05, a.qt); }
  else if (q === 'court') aEll(-.53, 0, .045, .04, a.qc || c);
  else if (q === 'longue') { aBrin(aCourbe([-.46, 0], [-.7, .09], [-.92, 0]), .04, c); if (a.qd) aEll(-.93, 0, .035, .03, a.qd); }
  else if (q === 'epaisse') aEffile([[-.4, 0], [-.6, .01], [-.8, .0], [-1, 0]], [.16, .12, .08, .02], c);
  else if (q === 'palette') { aEll(-.62, 0, .13, .085, a.qc); ctx.beginPath(); for (const x of [-.7, -.62, -.54]) { ctx.moveTo(x, -.06); ctx.lineTo(x, .06); } ctx.lineWidth *= .6; ctx.stroke(); ctx.lineWidth /= .6; }
  else if (q === 'anneaux') { for (let i = 0; i < 8; i++) aBrin([[-.46 - i * .07, Math.sin(i * .5) * .03], [-.53 - i * .07, Math.sin((i + 1) * .5) * .03]], .04, i % 2 ? a.qd : a.qc); }
  else if (q === 'boucle') { ctx.beginPath(); ctx.arc(-.56, 0, .05, 0, 7); ctx.lineWidth *= 2.2; ctx.stroke(); ctx.lineWidth /= 2.2; }
  const neck = [[.3, bw * .72], [.36 + a.nl, hw * .5], [.36 + a.nl, -hw * .5], [.3, -bw * .72]];                                         // cou, puis corps
  if (a.nl > 0) aPoly(neck, c);
  const BP = aCorpsPts(bw, a.taille || .86);
  if (a.laine) aFestons(0, 0, .45, bw * .85, 16, bw * .42 + .03, c); else aCorps(BP, c);
  if (!a.laine) {                                                                                                                         // décor du pelage, clippé dans le corps
    ctx.save(); aCorpsPath(BP); ctx.clip();
    const de = a.deco, dc = a.dc;
    if (de === 'rayures') for (let i = 0; i < 8; i++) { const x = -.38 + i * .105; aSym(s => { aPoly([[x - .035, s * (bw + .02)], [x + .035, s * (bw + .02)], [x - .005, s * bw * .1]], dc, false); }); }
    else if (de === 'taches' || de === 'rosettes') for (let j = -1; j <= 1; j++) for (let i = 0; i < 8; i++) {
      const x = -.4 + i * .115 + (j ? .05 : 0), y = j * bw * .6, big = a.big;
      if (de === 'taches') aEll(x, y, .028, .028, dc, 0, false);
      else { const lw0 = ctx.lineWidth; ctx.beginPath(); ctx.arc(x, y, big ? .04 : .034, 0, 7); ctx.lineWidth = .014; ctx.strokeStyle = dc; ctx.stroke(); if (big) aEll(x, y, .01, .01, dc, 0, false); ctx.lineWidth = lw0; ctx.strokeStyle = ANIMAL_INK; }
    }
    else if (de === 'plaques') aSym(s => { aEll(-.3, s * bw * .5, .1, .08, dc, .3, false); aEll(-.02, s * bw * .55, .11, .08, dc, 0, false); aEll(.24, s * bw * .5, .07, .06, dc, 0, false); });
    else if (de === 'dos') aEll(0, 0, .46, .022, dc, 0, false);
    else if (de === 'flancs') aSym(s => aEll(-.02, s * bw * .55, .4, .03, dc, 0, false));
    else if (de === 'croupe') aEll(-.4, 0, .1, bw * .7, '#f3e8d4', 0, false);
    else if (de === 'selle') { ctx.fillStyle = dc; ctx.fillRect(-.12, -bw, .32, bw * 2); }
    aEll(-.05, 0, .4, bw * .42, 'rgba(255,255,255,.09)', 0, false);                                                                       // dos plus clair, ligne de colonne
    ctx.beginPath(); ctx.moveTo(-.42, 0); ctx.lineTo(.32, 0); ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth *= .7; ctx.stroke(); ctx.lineWidth /= .7; ctx.strokeStyle = ANIMAL_INK;
    ctx.restore();
    aCorpsPath(BP); ctx.stroke();
  }
  for (const [x, rx, ry] of a.bosse || []) aEll(x, 0, rx, ry, a.bc);                                                                      // bosses
  if (a.mane === 'bande') aEll(.4 + a.nl * .4, 0, .12 + a.nl * .5, .04, a.mc, 0, false);
  else if (a.mane === 'hirsute') aFestons(.24, 0, .17, bw * .72, 12, .09, a.mc);
  else if (a.mane === 'lion') aFestons(hx - hl * .2, 0, .08, .1, 12, .08, a.mc);
  // oreilles (sous la tête)
  const ex = hx - hl * .18, ey = hw * .5, ec = a.ec || hcol;
  aSym(s => {
    if (a.ear === 'aucune') return;
    if (a.ear === 'long') aEll(ex - .03, s * (ey + .1), .13, .035, ec, s * 1.05);
    else if (a.ear === 'rond') aEll(ex, s * (ey + .025), .045, .045, ec);
    else if (a.ear === 'grand') aOreilleGrande(s, hx - hl * .1, hw, a.es || 1, c, a.ei || d);
    else if (a.ear === 'penche') aEll(ex + .02, s * (ey + .05), .08, .06, d, s * .4);
    else if (a.ear === 'horiz') aEll(ex, s * (ey + .07), .04, .085, ec);
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
  // tête
  aPoly([[hx - hl * .52, 0], [hx - hl * .42, -hw * .5], [hx - hl * .1, -hw * .54], [hx + hl * .25, -hw * .4], [hx + hl * .55, -hw * .3], [hx + hl * .62, 0], [hx + hl * .55, hw * .3], [hx + hl * .25, hw * .4], [hx - hl * .1, hw * .54], [hx - hl * .42, hw * .5]].map(p => p), hcol);
  aEll(hx + hl * .42, 0, hl * .3, hw * .32, a.m || d);
  aSym(s => { aEll(hx - hl * .02, s * hw * .52, .016, .016, ANIMAL_INK, 0, false); aEll(hx + hl * .6, s * hw * .1, .008, .008, ANIMAL_INK, 0, false); });
  if (a.corne === 'rhino') { aEll(hx + hl * .32, 0, .045, .04, hc); aEll(hx - hl * .05, 0, .028, .025, hc); }
  if (a.trompe) { const sx = hx + hl * .42, t = a.trompe, P = aCourbe([sx, 0], [sx + .22 * t, 0], [sx + .3 * t, .1 * t], 8); aEffile(P, P.map((_, i) => .1 - i * .008), c); }
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

// ---- oiseaux ----
function aOiseau(a) {
  const bw = a.w / 2, nl = a.nl, hx = .3 + nl + .02;
  if (a.tail === 'eventail') for (let i = -3; i <= 3; i++) { const t = i * .28, dx = -Math.cos(t), dy = Math.sin(t); aEll(-.26 + dx * .18, dy * .18, .19, .055, a.tc, Math.PI - t); aEll(-.26 + dx * .33, dy * .33, .03, .05, a.td, Math.PI - t, false); }
  else aEll(-.4, 0, .11, .1, a.tc);
  if (nl > .05) { aPoly([[.26, bw * .35], [hx - .03, .03], [hx - .03, -.03], [.26, -bw * .35]], a.nc); }
  aEll(0, 0, .34, bw, a.c);
  aSym(s => { aEll(-.04, s * bw * .62, .26, bw * .5, a.wc, s * .1); ctx.beginPath(); for (const x of [-.12, -.02, .08]) { ctx.moveTo(x, s * bw * .35); ctx.lineTo(x - .06, s * bw * .85); } ctx.lineWidth *= .7; ctx.strokeStyle = a.wd; ctx.stroke(); ctx.lineWidth /= .7; ctx.strokeStyle = ANIMAL_INK; });
  if (a.wattle) aEll(hx + .07, 0, .03, .045, '#c0392b');
  aEll(hx, 0, .052, .047, a.hc); aPoly([[hx + .04, .02], [hx + .13, 0], [hx + .04, -.02]], a.bk);
  aSym(s => aEll(hx + .005, s * .03, .01, .01, ANIMAL_INK, 0, false));
  if (a.casque) aEll(hx - .015, 0, .03, .025, '#c9a76a');
}

// ---- crocodile ----
function aCroco(a) {
  const c = a.c, d = a.d;
  aSym(s => { aBrin([[.14, s * .09], [.23, s * .2], [.3, s * .23]], .045, c); aEll(.32, s * .24, .04, .025, d, s * .3); aBrin([[-.12, s * .09], [-.2, s * .2], [-.13, s * .25]], .05, c); aEll(-.1, s * .26, .04, .025, d, -s * .3); });
  aEffile([[-.25, 0], [-.45, .015], [-.62, .04], [-.8, .02]], [.1, .075, .045, .012], c);
  aEll(0, 0, .3, .105, c);
  const H = [[.22, 0], [.34, 0], [.48, 0], [.62, 0]]; aEffile(H, [.11, .095, .07, .055], c); aEll(.63, 0, .035, .032, d);
  for (let i = 0; i < 10; i++) { const x = -.22 + i * .05; aSym(s => aEll(x, s * (.025 * (1 - i * .06)), .016, .012, d, 0, false)); }
  aSym(s => { aEll(.29, s * .045, .02, .02, c); aEll(.29, s * .045, .008, .008, ANIMAL_INK, 0, false); });
}

function peintAnimal(k, x, y, L, ang = 0) {
  const a = { t:'quad', ...ANIMAUX[k] }, bw = a.w / 2;
  ctx.save(); ctx.translate(x + L * .035, y + L * .06); ctx.rotate(ang); ctx.scale(L, L);                  // ombre au sol, sud-est
  ctx.fillStyle = 'rgba(40,34,20,.26)'; ctx.beginPath(); ctx.ellipse(0, 0, a.t === 'croco' ? .55 : .5, a.t === 'croco' ? .13 : bw, 0, 0, 7);
  ctx.ellipse(.36 + (a.nl || 0) + (a.hl || .2) * .4, 0, (a.hl || .15) * .6, (a.hw || .1) / 2 + .01, 0, 0, 7); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(L, L); ctx.lineJoin = ctx.lineCap = 'round'; ctx.lineWidth = 1.7 / L; ctx.strokeStyle = ANIMAL_INK;
  (a.t === 'oiseau' ? aOiseau : a.t === 'croco' ? aCroco : aQuad)(a);
  ctx.restore();
}
// étendue d'un animal de part et d'autre du centre du corps, en longueurs de corps : [vers l'arrière, vers l'avant] (pour le cadrer)
function animalEtendue(k) {
  const a = { t:'quad', ...ANIMAUX[k] };
  if (a.t === 'croco') return [.82, .68];
  if (a.t === 'oiseau') return [a.tail === 'eventail' ? .62 : .5, .3 + a.nl + .15];
  const g = { longue:.95, epaisse:1, anneaux:1.02, fournie:.8, touffe:.8, palette:.75, fin:.7, boucle:.62, court:.58, aucune:.5 }[a.queue] || .6;
  return [g, .36 + a.nl + a.hl * 1.35 * .9 + (a.trompe ? .35 * a.trompe : 0) + (a.defense === 'longue' ? .15 : 0)];
}
