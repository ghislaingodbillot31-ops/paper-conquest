/* ---------- arbres fruitiers ----------
   20 espèces, chacune avec ses biomes d'origine (là où elle pousse à l'état naturel) : on ne plante un arbre que dans sa région d'origine.
   Un arbre est un repère de S.ressources { id, cat:'fruitier', key, x, y [, g:[x, y] (tête de bosquet : porte l'étiquette)] }. Ils se plantent en bosquets
   de 1 à 5, dans les clairières : jamais dans les grandes forêts (forestNoise), ni sur l'eau, une route, un gisement ou un autre bosquet. Les arbres de
   la forêt sont retirés sous eux (computeFlora, paysage.js). Peints par drawFruitiers (appelé par drawDecor) avec peintArbre, aussi utilisé par arbres-fruitiers.html.
   Un arbre : { nom, biomes, lobes, f:[base, clair, contour], r (échelle), feuillage, fr:{ f:forme, c, c2:reflet, n:nombre, t:taille } } */
const FRUITIERS = {
  pommier:     { nom:'Pommier',     biomes:['tempere', 'prairie', 'montagne'], lobes:9,  f:['#6a8741', '#8aa857', '#3d5026'], fr:{ f:'rond',   c:'#b9402b', c2:'#e0705a', n:9,  t:.11 } },
  poirier:     { nom:'Poirier',     biomes:['tempere', 'prairie', 'montagne'], lobes:8,  f:['#5f8244', '#80a45a', '#37502a'], fr:{ f:'poire',  c:'#c8b53a', c2:'#e8dc72', n:8,  t:.12 } },
  cerisier:    { nom:'Cerisier',    biomes:['tempere', 'montagne', 'mediterraneenne'], lobes:10, f:['#5b8a3e', '#7fae58', '#33562a'], fr:{ f:'cerise', c:'#a8182e', c2:'#e0546a', n:10, t:.075 } },
  prunier:     { nom:'Prunier',     biomes:['tempere', 'prairie', 'montagne'], lobes:9,  f:['#5d7f47', '#7ba15c', '#374f2f'], fr:{ f:'rond',   c:'#5a3a82', c2:'#8d6cb8', n:10, t:.085 } },
  pecher:      { nom:'Pêcher',      biomes:['subtropicale', 'tempere', 'mousson'], lobes:8,  f:['#7a9a4a', '#9ab95f', '#4a6228'], fr:{ f:'rond',   c:'#e8955a', c2:'#f5c08c', n:8,  t:.115 } },
  abricotier:  { nom:'Abricotier',  biomes:['steppe_aride', 'semi_aride', 'mediterraneenne', 'montagne'], lobes:9,  f:['#6e9246', '#8fb25c', '#41592a'], fr:{ f:'rond',   c:'#e8a02e', c2:'#f6cf74', n:9,  t:.1 } },
  cognassier:  { nom:'Cognassier',  biomes:['tempere', 'mediterraneenne', 'steppe_aride'], lobes:7,  f:['#6a8a4c', '#8aab64', '#3e552e'], fr:{ f:'poire',  c:'#d8c030', c2:'#f0e272', n:6,  t:.14 } },
  figuier:     { nom:'Figuier',     biomes:['mediterraneenne', 'semi_aride', 'subtropicale'], lobes:6,  f:['#4f8a3c', '#72ad54', '#2d5a26'], fr:{ f:'poire',  c:'#6d4a8a', c2:'#9c7cb8', n:7,  t:.11 }, feuillage:'large' },
  olivier:     { nom:'Olivier',     biomes:['mediterraneenne', 'semi_aride'], lobes:11, f:['#7e9a72', '#a9c29c', '#4a604a'], fr:{ f:'ovale',  c:'#3f4a2a', c2:'#7d8a52', n:14, t:.065 }, feuillage:'fin' },
  oranger:     { nom:'Oranger',     biomes:['subtropicale', 'mousson', 'tropicale_cad'], lobes:9,  f:['#3f7a3a', '#5e9c52', '#25502a'], fr:{ f:'rond',   c:'#ea8a1c', c2:'#ffc15a', n:8,  t:.12 } },
  citronnier:  { nom:'Citronnier',  biomes:['subtropicale', 'mousson', 'mediterraneenne'], lobes:9,  f:['#4a8240', '#6aa458', '#2b552a'], fr:{ f:'citron', c:'#ecd23a', c2:'#fff39a', n:8,  t:.12 } },
  grenadier:   { nom:'Grenadier',   biomes:['mediterraneenne', 'semi_aride', 'steppe_aride'], lobes:8,  f:['#5c8c3c', '#7fb054', '#355c26'], fr:{ f:'grenade',c:'#b8261e', c2:'#e8685a', n:7,  t:.125 } },
  amandier:    { nom:'Amandier',    biomes:['mediterraneenne', 'semi_aride', 'steppe_aride'], lobes:9,  f:['#76935e', '#98b57c', '#465c38'], fr:{ f:'ovale',  c:'#a6b36a', c2:'#cfdc98', n:11, t:.075 }, feuillage:'fin' },
  noyer:       { nom:'Noyer',       biomes:['tempere', 'montagne', 'mediterraneenne'], lobes:11, f:['#4e7a38', '#6f9c50', '#2c4c24'], r:1.12, fr:{ f:'noix', c:'#7a9a3a', c2:'#aac262', n:9, t:.1 } },
  noisetier:   { nom:'Noisetier',   biomes:['tempere', 'prairie', 'montagne', 'taiga'], lobes:9,  f:['#5f8a42', '#82ae5c', '#375a2a'], r:.9, fr:{ f:'noisette', c:'#b8843a', c2:'#dcb06a', n:10, t:.065 } },
  chataignier: { nom:'Châtaignier', biomes:['tempere', 'mediterraneenne', 'montagne', 'subtropicale'], lobes:12, f:['#4a7434', '#6a9a4c', '#294a22'], r:1.15, fr:{ f:'bogue', c:'#7a8a30', c2:'#a9b858', n:9, t:.095 } },
  murier:      { nom:'Mûrier',      biomes:['subtropicale', 'tempere', 'mousson', 'mediterraneenne'], lobes:9,  f:['#58853e', '#7bab58', '#34562a'], fr:{ f:'mure',   c:'#3a1f4a', c2:'#7a4f9a', n:12, t:.07 } },
  dattier:     { nom:'Dattier',     biomes:['desert_aride', 'xerophyte', 'semi_aride'], lobes:0,  f:['#5a8a3c', '#82b255', '#2f5226'], r:1.05, fr:{ f:'ovale', c:'#b0661e', c2:'#dc9a52', n:10, t:.06 }, feuillage:'palme' },
  neflier:     { nom:'Néflier',     biomes:['tempere', 'mediterraneenne', 'subtropicale'], lobes:8,  f:['#648a48', '#86ac64', '#3a5630'], r:.92, fr:{ f:'rond', c:'#b8742c', c2:'#e0a45e', n:9, t:.09 } },
  sorbier:     { nom:'Sorbier',     biomes:['taiga', 'tempere', 'montagne', 'toundra_alpine'], lobes:9,  f:['#628a46', '#84ae60', '#385630'], r:.95, fr:{ f:'rond', c:'#d8401e', c2:'#f27c5a', n:16, t:.055 } },
};
let FRUIT_INST = null;                                        // false : l'arbre en cours de dessin n'a pas de fruits (hors saison ou déjà cueilli)
const ARBRE_INK = '#2f2a24', ARBRE_R = 4.2;                  // rayon du houppier en mètres (× a.r)
// les arbres d'origine d'un biome (la région en reçoit au plus 4, tirés au sort)
function fruitiersDuBiome(biome, seed, max = 4) {
  const rnd = seeded(seed * 13 + 5), liste = Object.keys(FRUITIERS).filter(k => FRUITIERS[k].biomes.includes(biome));
  for (let i = liste.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [liste[i], liste[j]] = [liste[j], liste[i]]; }
  return liste.slice(0, max);
}
// un bosquet (1 à 5 arbres) de chaque espèce de keys, en clairière
function placeFruitiers(seed, keys) {
  const rnd = seeded(seed * 23 + 11), out = [], M = 140, R = 28, fz = forestNoise(), B = biomeOf().flora, grosBois = B.forest - .1, groves = [];
  const water = [...(Z.water.river || []), ...(Z.water.lake || [])];
  const libre = c => {
    if (c[0] < M || c[1] < M || c[0] > TW - M || c[1] > TH - M || fz(c[0], c[1]) > B.forest - .004) return false;          // (jamais dans ni sous une forêt)
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, q = [c[0] + Math.cos(a) * R, c[1] + Math.sin(a) * R]; if (!dansRegion(q) || !surTerre(q) || fz(q[0], q[1]) > B.forest - .004) return false; }
    if (!dansRegion(c) || distToRoads(c) < R + 12) return false;
    if (water.length && hitsAny([[c[0] - R, c[1] - R], [c[0] + R, c[1] - R], [c[0] + R, c[1] + R], [c[0] - R, c[1] + R]], water)) return false;
    if ((S.deposits || []).some(d => segLen(d.c, c) < d.r * 1.3 + R)) return false;
    return groves.every(g => segLen(g, c) > 2 * R + 20);
  };
  for (const key of keys) for (let t = 0; t < 300; t++) {
    const c = [round2(M + rnd() * (TW - 2 * M)), round2(M + rnd() * (TH - 2 * M))];
    if (!libre(c)) continue;
    groves.push(c);
    const n = 1 + Math.floor(rnd() * 5), arbres = [];                                                // 1 à 5 arbres, à distance aléatoire du centre, sans se toucher
    for (let i = 0, essais = 0; i < n && essais < 60; essais++) {
      const a = rnd() * Math.PI * 2, d = i ? Math.sqrt(rnd()) * 16 : 0, p = [round2(c[0] + Math.cos(a) * d), round2(c[1] + Math.sin(a) * d)];
      if (arbres.some(q => segLen(q, p) < 10)) continue;
      arbres.push(p); i++;
    }
    arbres.forEach((p, i) => { const o = { id:out.length + 1, cat:'fruitier', key, x:p[0], y:p[1] }; if (!i) o.g = [c[0], Math.max(...arbres.map(q => q[1]))]; out.push(o); });   // (g : où porter l'étiquette)
    break;
  }
  return out;
}

// ---- dessin : vue de dessus, houppier lobé, reflet au nord-ouest, ombre au sud-est, fruits en anneaux symétriques ----
// contour lisse passant par les milieux des sommets
function arbreLisse(P) {
  const n = P.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], m0 = mid(P[n - 1], P[0]);
  ctx.beginPath(); ctx.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const m = mid(P[i], P[(i + 1) % n]); ctx.quadraticCurveTo(P[i][0], P[i][1], m[0], m[1]); }
  ctx.closePath();
}
function arbreFruit(f, x, y, t, R, k) {
  const r = t * R, lw = (w, mini = .8) => Math.max(mini, w * k);
  ctx.beginPath(); ctx.ellipse(x + r * .3, y + r * .45, r, r * .55, 0, 0, 7); ctx.fillStyle = 'rgba(30,36,18,.3)'; ctx.fill();
  ctx.lineWidth = Math.max(1, r * .22); ctx.strokeStyle = ARBRE_INK; ctx.fillStyle = f.c; ctx.lineJoin = 'round';
  const hl = (dx, dy, q) => { ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, r * q, 0, 7); ctx.fillStyle = f.c2; ctx.fill(); };
  const tige = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineWidth = Math.max(.8, r * .15); ctx.strokeStyle = '#3d5026'; ctx.stroke(); ctx.lineWidth = Math.max(1, r * .22); ctx.strokeStyle = ARBRE_INK; };
  switch (f.f) {
    case 'poire': { const b = r * 1.05, h = r * .65; ctx.beginPath(); ctx.arc(x, y + r * .35, b, 0, 7); ctx.moveTo(x + h, y - r * .5); ctx.arc(x, y - r * .55, h, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y + r * .35, b, 0, 7); ctx.fill(); hl(-.4, .05, .3); return; }
    case 'cerise': { for (const dx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + dx * r * 1.1, y + r * .6); ctx.quadraticCurveTo(x + dx * r * .4, y - r * 1.8, x, y - r * 1.9); ctx.lineWidth = Math.max(.8, r * .15); ctx.strokeStyle = '#3d5026'; ctx.stroke(); }
      ctx.lineWidth = Math.max(1, r * .22); ctx.strokeStyle = ARBRE_INK; for (const dx of [-1, 1]) { ctx.beginPath(); ctx.arc(x + dx * r * 1.1, y + r * .6, r, 0, 7); ctx.fillStyle = f.c; ctx.fill(); ctx.stroke(); hl(dx * 1.1 - .35, .3, .28); } return; }
    case 'ovale': ctx.beginPath(); ctx.ellipse(x, y, r * .8, r * 1.15, .5, 0, 7); ctx.fill(); ctx.stroke(); hl(-.25, -.35, .26); return;
    case 'citron': ctx.beginPath(); ctx.moveTo(x - r * 1.35, y); ctx.quadraticCurveTo(x, y - r * 1.6, x + r * 1.35, y); ctx.quadraticCurveTo(x, y + r * 1.6, x - r * 1.35, y); ctx.closePath(); ctx.fill(); ctx.stroke(); hl(-.3, -.35, .28); return;
    case 'grenade': { ctx.beginPath(); ctx.arc(x, y + r * .1, r, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); for (const a of [-.9, 0, .9]) { ctx.moveTo(x + Math.sin(a) * r * .35, y - r * .85); ctx.lineTo(x + Math.sin(a) * r * .65, y - r * 1.4); } ctx.lineWidth = Math.max(1, r * .3); ctx.strokeStyle = f.c; ctx.stroke(); hl(-.35, -.3, .28); return; }
    case 'noix': ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.lineWidth = Math.max(.7, r * .14); ctx.stroke(); hl(-.4, -.4, .25); return;
    case 'noisette': ctx.beginPath(); ctx.arc(x, y + r * .15, r, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(x, y - r * .55, r * 1.05, r * .55, 0, Math.PI, 0); ctx.closePath(); ctx.fillStyle = '#7a9a3a'; ctx.fill(); ctx.stroke(); return;
    case 'bogue': { ctx.beginPath(); for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2, q = i % 2 ? .78 : 1.45; ctx.lineTo(x + Math.cos(a) * r * q, y + Math.sin(a) * r * q); } ctx.closePath(); ctx.fill(); ctx.lineWidth = Math.max(.8, r * .16); ctx.stroke(); hl(-.3, -.3, .3); return; }
    case 'mure': { for (const [dx, dy] of [[-.55, -.4], [.55, -.4], [0, .55], [-.55, .35], [.55, .35], [0, -.5]]) { ctx.beginPath(); ctx.arc(x + dx * r * 1.2, y + dy * r * 1.2, r * .62, 0, 7); ctx.fill(); ctx.lineWidth = Math.max(.6, r * .1); ctx.stroke(); } hl(-.55, -.5, .22); return; }
    default: ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke(); hl(-.35, -.35, .3); tige(x, y - r * .75, x + r * .1, y - r * 1.3);
  }
}
// feuilles : petits traits en quinconce (jamais de points au hasard), clippés dans le houppier
function arbreFeuilles(cx, cy, R, col, mode, rnd, k) {
  const pas = R * (mode === 'fin' ? .13 : mode === 'large' ? .24 : .17), l = pas * (mode === 'fin' ? .8 : .55);
  ctx.strokeStyle = col; ctx.lineWidth = Math.max(.8, R * .018); ctx.lineCap = 'round';
  for (let y = -R, j = 0; y <= R; y += pas, j++) for (let x = -R + (j % 2) * pas / 2; x <= R; x += pas) {
    const X = cx + x + (rnd() - .5) * pas * .3, Y = cy + y + (rnd() - .5) * pas * .3, an = mode === 'fin' ? -.9 + (rnd() - .5) * .5 : -.5 + (rnd() - .5) * .4;
    ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + Math.cos(an) * l, Y + Math.sin(an) * l * .6); ctx.stroke();
  }
}
// peint un arbre centré en (cx, cy), de rayon R pixels ; seed fixe sa forme (toujours la même)
function peintArbre(a, cx, cy, R, seed) {
  const rnd = seeded(seed * 977 + 13), k = R / 88, [base, clair, bord] = a.f, detail = R > 7, enc = (w, mini = .8) => Math.max(mini, w * k);
  let dedans;
  if (a.feuillage === 'palme') {                                              // dattier : étoile de palmes
    const P = []; for (let i = 0; i < 11; i++) P.push([i / 11 * Math.PI * 2 + .2, R * (.92 + rnd() * .1)]);
    const fr = (len, w, an) => { const x2 = cx + Math.cos(an) * len, y2 = cy + Math.sin(an) * len, nx = -Math.sin(an) * w, ny = Math.cos(an) * w, mx = cx + Math.cos(an) * len * .55, my = cy + Math.sin(an) * len * .55;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo(mx + nx, my + ny, x2, y2); ctx.quadraticCurveTo(mx - nx, my - ny, cx, cy); ctx.closePath(); };
    ctx.save(); ctx.translate(R * .16, R * .2); ctx.fillStyle = 'rgba(55,50,30,.28)'; for (const [an, len] of P) { fr(len, R * .2, an); ctx.fill(); } ctx.restore();
    ctx.lineJoin = 'round';
    for (const [an, len] of P) { fr(len, R * .2, an); ctx.fillStyle = base; ctx.fill(); ctx.strokeStyle = bord; ctx.lineWidth = enc(1.8, 1); ctx.stroke();
      if (detail) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(an) * len * .92, cy + Math.sin(an) * len * .92); ctx.strokeStyle = clair; ctx.lineWidth = enc(2.2, 1); ctx.stroke(); } }
    ctx.beginPath(); ctx.arc(cx, cy, R * .14, 0, 7); ctx.fillStyle = '#7a5a36'; ctx.fill(); ctx.strokeStyle = ARBRE_INK; ctx.lineWidth = enc(1.6, 1); ctx.stroke();
    dedans = (x, y) => Math.hypot(x - cx, y - cy) < R * .78;
  } else {
    const P = [], n = a.lobes * 2, ph = rnd() * 6.28;                         // houppier : des lobes réguliers, à peine irréguliers
    for (let i = 0; i < n; i++) { const an = i / n * Math.PI * 2, q = (i % 2 ? .9 : 1.04) * (.97 + rnd() * .06); P.push([cx + Math.cos(an + ph) * R * q, cy + Math.sin(an + ph) * R * q * .97]); }
    ctx.save(); ctx.translate(R * .18, R * .22); arbreLisse(P); ctx.fillStyle = 'rgba(55,50,30,.28)'; ctx.fill(); ctx.restore();
    arbreLisse(P); ctx.fillStyle = base; ctx.fill(); ctx.lineJoin = 'round'; ctx.strokeStyle = bord; ctx.lineWidth = enc(2.4, 1); ctx.stroke();
    ctx.save(); arbreLisse(P); ctx.clip();
    ctx.beginPath(); ctx.ellipse(cx - R * .2, cy - R * .24, R * .62, R * .55, -.5, 0, 7); ctx.fillStyle = clair; ctx.fill();                      // reflet nord-ouest
    ctx.beginPath(); ctx.ellipse(cx + R * .42, cy + R * .5, R * .75, R * .45, -.6, 0, 7); ctx.fillStyle = 'rgba(30,50,25,.18)'; ctx.fill();    // creux sud-est
    if (R > 14) arbreFeuilles(cx, cy, R, bord + '66', a.feuillage || 'rond', rnd, k);
    ctx.restore();
    dedans = (x, y) => Math.hypot(x - cx, (y - cy) / .97) < R * .76;
  }
  if (!detail || FRUIT_INST === false || (typeof fruitsSurArbre === 'function' && !fruitsSurArbre(a))) return;             // fruits mûrs seulement à la saison (cultures.js)
  // fruits : anneaux concentriques régulièrement espacés (centre éventuel, puis anneaux), tous dans le houppier
  const fr = a.fr, D = { 6:[6], 7:[1, 6], 8:[8], 9:[1, 8], 10:[1, 9], 11:[1, 10], 12:[4, 8], 14:[4, 10], 16:[1, 5, 10] }[fr.n], rr = D.length === 1 ? [.52] : D.length === 2 ? (D[0] === 1 ? [0, .58] : [.3, .62]) : [0, .33, .64], pts = [];
  D.forEach((m, i) => { for (let j = 0; j < m; j++) { const an = -Math.PI / 2 + (j + (i % 2) * .5) / m * Math.PI * 2; pts.push([cx + Math.cos(an) * rr[i] * R, cy + Math.sin(an) * rr[i] * R]); } });
  pts.sort((p, q) => p[1] - q[1]);
  for (const [x, y] of pts) arbreFruit(fr, x, y, fr.t, R, k);
}
function drawFruitiers() {
  const list = (S.ressources || []).filter(r => r.cat === 'fruitier' && FRUITIERS[r.key]); if (!list.length) return;
  const s = view.s, [x0, y0] = toW(0, 0), [x1, y1] = toW(W, H), m = 30, vus = list.filter(r => r.x > x0 - m && r.x < x1 + m && r.y > y0 - m && r.y < y1 + m).sort((p, q) => p.y - q.y);
  for (const r of vus) { const a = FRUITIERS[r.key], [X, Y] = toS(r.x, r.y); FRUIT_INST = typeof fruitsVisibles === 'function' ? fruitsVisibles(r) : null; peintArbre(a, X, Y, Math.max(3, ARBRE_R * (a.r || 1) * s), r.id); }
  FRUIT_INST = null;
  if (s > .3) for (const r of vus) if (r.g) { const [X, Y] = toS(r.g[0], r.g[1] + 5); ctx.font = '600 15px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; haloText(FRUITIERS[r.key].nom, X, Y + 2, Col.ink, Col.sheet); }
}
