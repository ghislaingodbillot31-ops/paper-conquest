/* ---------- arbres et arbustes à baies ----------
   26 espèces. Chacune a ses conditions : biomes, température annuelle moyenne (°C), humidité (0 à 1) et terrain (humide : au bord de l'eau ;
   lisière : au bord des bois ; clairière : à découvert ; sec : à découvert, loin de l'eau). Une espèce n'apparaît dans une région que si
   elle est VALIDÉE (page arbustes-baies.html, enregistrée dans le navigateur : clé baies.valides.v1) et si la région lui convient.
   Elles se plantent en petits massifs (3 à 7 pieds espacés de 2,4 m au moins), jamais au hasard partout : baiesCandidats() ajoute ces
   massifs à la végétation fixe (paysage.js, floraCandidates) ; les routes, l'eau et les bâtiments les effacent comme le reste.
   Un pied : { nom, type ('arbuste' | 'rampant' | 'liane'), biomes, tm:[min, max], hum:[min, max], terrain, r (rayon en m),
   f:[feuillage, clair, contour], lobes, baie:{ f:forme, c, c2, n:nombre, t:taille } }.
   Dessin : peintBaie (aussi utilisé par arbustes-baies.html). */
const BAIES = {
  amelanchier: { nom:'Amélanchier fruitier', type:'arbuste', biomes:['tempere', 'prairie', 'taiga', 'montagne'], tm:[-2, 16], hum:[.3, 1], terrain:'lisiere', r:1.9, lobes:8, f:['#6f8f4a', '#92b366', '#3f5a2a'], baie:{ f:'rond', c:'#43347a', c2:'#7a68b8', n:14, t:.075 } },
  argousier:   { nom:'Argousier', type:'arbuste', biomes:['taiga', 'tempere', 'prairie', 'steppe_aride', 'montagne'], tm:[-4, 14], hum:[.2, .8], terrain:'sec', r:1.8, lobes:10, f:['#8fa57a', '#b4c6a0', '#566a4a'], baie:{ f:'epine', c:'#f08a1c', c2:'#ffc15a', n:24, t:.055 } },
  aronie:      { nom:'Aronie', type:'arbuste', biomes:['tempere', 'taiga', 'prairie'], tm:[0, 14], hum:[.4, 1], terrain:'humide', r:1.5, lobes:8, f:['#5f8a42', '#82ae5c', '#35562a'], baie:{ f:'grappe', c:'#2a1f3a', c2:'#6a5a8a', n:9, t:.06 } },
  baie_de_mai: { nom:'Baie de mai', type:'arbuste', biomes:['taiga', 'toundra', 'tempere', 'montagne'], tm:[-6, 12], hum:[.4, 1], terrain:'humide', r:1.4, lobes:7, f:['#6a8f4c', '#8eb468', '#3a5a2c'], baie:{ f:'ovale', c:'#3a4f8a', c2:'#7a8fc8', n:12, t:.075 } },
  canneberge:  { nom:'Canneberge, airelle', type:'rampant', biomes:['taiga', 'toundra', 'tempere'], tm:[-6, 11], hum:[.55, 1], terrain:'humide', r:0.75, lobes:6, f:['#4a7a3c', '#6a9c52', '#2a4a24'], baie:{ f:'rond', c:'#b0182e', c2:'#e0546a', n:12, t:0.045 } },
  cassissier:  { nom:'Cassissier, casseille', type:'arbuste', biomes:['tempere', 'taiga', 'prairie'], tm:[0, 13], hum:[.5, 1], terrain:'lisiere', r:1.5, lobes:7, f:['#5c8a40', '#80ae5a', '#35562a'], baie:{ f:'grappe', c:'#1f1a2a', c2:'#5a4f7a', n:8, t:.065 } },
  cornouiller: { nom:'Cornouiller à fruits comestibles', type:'arbuste', biomes:['tempere', 'mediterraneenne', 'subtropicale', 'montagne'], tm:[6, 18], hum:[.3, .9], terrain:'lisiere', r:2.1, lobes:9, f:['#5a8a44', '#7eae60', '#33582c'], baie:{ f:'ovale', c:'#c0202e', c2:'#ee5c68', n:14, t:.07 } },
  fraisier:    { nom:'Fraisier', type:'rampant', biomes:['tempere', 'taiga', 'prairie', 'mediterraneenne', 'montagne'], tm:[0, 18], hum:[.4, 1], terrain:'clairiere', r:0.55, lobes:6, f:['#5a9a44', '#7cbc5c', '#2f5a2a'], baie:{ f:'fraise', c:'#e0303a', c2:'#f27a80', n:8, t:0.055 } },
  framboisier: { nom:'Framboisier', type:'arbuste', biomes:['tempere', 'taiga', 'prairie', 'montagne'], tm:[0, 14], hum:[.45, 1], terrain:'lisiere', r:1.6, lobes:8, f:['#5f9244', '#82b860', '#33582a'], baie:{ f:'mure', c:'#c8264a', c2:'#f0607a', n:9, t:.075 } },
  ronce_arctique: { nom:'Ronce arctique', type:'rampant', biomes:['toundra', 'taiga', 'polaire'], tm:[-10, 6], hum:[.4, 1], terrain:'humide', r:0.7, lobes:6, f:['#668f4c', '#88b268', '#38582c'], baie:{ f:'mure', c:'#d0305a', c2:'#f26a8c', n:8, t:0.05 } },
  passiflore:  { nom:'Fruit de la passion', type:'liane', biomes:['subtropicale', 'mousson', 'tropicale', 'tropicale_cad', 'savane_claire'], tm:[18, 30], hum:[.5, 1], terrain:'lisiere', r:2, lobes:7, f:['#3f8a3a', '#62ae54', '#235a2a'], baie:{ f:'passion', c:'#6a3a8a', c2:'#a678c8', n:5, t:.15 } },
  goji:        { nom:'Goji', type:'arbuste', biomes:['prairie', 'steppe_aride', 'mediterraneenne', 'tempere', 'semi_aride'], tm:[6, 20], hum:[.15, .6], terrain:'sec', r:1.6, lobes:8, f:['#7a9a5a', '#9cbc7a', '#486a38'], baie:{ f:'ovale', c:'#e8501e', c2:'#ff8c5a', n:14, t:.065 } },
  goumi:       { nom:'Goumi du Japon', type:'arbuste', biomes:['tempere', 'subtropicale', 'mediterraneenne'], tm:[8, 20], hum:[.4, 1], terrain:'lisiere', r:1.9, lobes:9, f:['#8aa070', '#b0c498', '#546a46'], baie:{ f:'rond', c:'#d83a2a', c2:'#f6806a', n:16, t:.06 } },
  groseillier: { nom:'Groseillier', type:'arbuste', biomes:['tempere', 'taiga', 'prairie'], tm:[0, 14], hum:[.5, 1], terrain:'lisiere', r:1.4, lobes:7, f:['#60904a', '#84b664', '#355a2c'], baie:{ f:'grappe', c:'#d02a3a', c2:'#f26a76', n:9, t:.06 } },
  groseillier_maquereaux: { nom:'Groseillier à maquereaux', type:'arbuste', biomes:['tempere', 'taiga', 'prairie'], tm:[0, 14], hum:[.5, 1], terrain:'lisiere', r:1.4, lobes:7, f:['#58863e', '#7caa58', '#335428'], baie:{ f:'rond', c:'#9ab55a', c2:'#cadc92', n:9, t:.095 } },
  groseillier_grappes: { nom:'Groseillier à grappes', type:'arbuste', biomes:['tempere', 'taiga', 'prairie', 'montagne'], tm:[-2, 13], hum:[.5, 1], terrain:'clairiere', r:1.5, lobes:7, f:['#66944e', '#8abc6a', '#385c2e'], baie:{ f:'grappe', c:'#f2d6a0', c2:'#fff0cc', n:9, t:.06 } },
  kiwai:       { nom:'Kiwai, mini-kiwi', type:'liane', biomes:['tempere', 'subtropicale', 'montagne'], tm:[6, 18], hum:[.5, 1], terrain:'lisiere', r:2, lobes:7, f:['#4a8a40', '#6caa58', '#285a2a'], baie:{ f:'ovale', c:'#8ab04a', c2:'#b4d27a', n:10, t:.075 } },
  kiwi:        { nom:'Kiwi', type:'liane', biomes:['subtropicale', 'mediterraneenne', 'tempere'], tm:[12, 22], hum:[.5, 1], terrain:'clairiere', r:2.2, lobes:8, f:['#3f823a', '#62a652', '#245428'], baie:{ f:'kiwi', c:'#8a6a3a', c2:'#b8945a', n:7, t:.11 } },
  kiwi_jaune:  { nom:'Kiwi jaune', type:'liane', biomes:['subtropicale', 'mousson'], tm:[14, 24], hum:[.55, 1], terrain:'clairiere', r:2.2, lobes:8, f:['#448a3c', '#68ae56', '#26582a'], baie:{ f:'kiwi', c:'#c8a83a', c2:'#e8d078', n:7, t:.11 } },
  kiwi_arctique: { nom:'Kiwi arctique', type:'liane', biomes:['taiga', 'tempere', 'montagne'], tm:[-2, 12], hum:[.5, 1], terrain:'lisiere', r:1.9, lobes:7, f:['#5a8c48', '#7eb064', '#32582c'], baie:{ f:'ovale', c:'#9ab85a', c2:'#c6dc90', n:10, t:.07 } },
  maqui:       { nom:'Maqui', type:'arbuste', biomes:['mediterraneenne', 'tempere', 'montagne'], tm:[8, 18], hum:[.3, .8], terrain:'lisiere', r:2.2, lobes:9, f:['#4f7a3e', '#709c58', '#2c4c28'], baie:{ f:'rond', c:'#2a1a3a', c2:'#6a4a8a', n:14, t:.065 } },
  murier:      { nom:'Mûrier, ronce à fruits', type:'arbuste', biomes:['tempere', 'mediterraneenne', 'subtropicale', 'prairie'], tm:[6, 20], hum:[.4, 1], terrain:'lisiere', r:1.9, lobes:9, f:['#527f3c', '#74a458', '#2f522a'], baie:{ f:'mure', c:'#2a1830', c2:'#6a4a78', n:10, t:.075 } },
  goyavier:    { nom:'Goyavier du Chili', type:'arbuste', biomes:['mediterraneenne', 'tempere', 'subtropicale'], tm:[8, 18], hum:[.5, 1], terrain:'lisiere', r:1.5, lobes:8, f:['#4a7a44', '#6c9c5e', '#294c2a'], baie:{ f:'rond', c:'#7a2a4a', c2:'#b8587c', n:12, t:.075 } },
  myrtillier:  { nom:'Myrtillier', type:'arbuste', biomes:['taiga', 'tempere', 'toundra', 'montagne'], tm:[-2, 14], hum:[.5, 1], terrain:'humide', r:1.2, lobes:7, f:['#5a8248', '#7ca662', '#33522a'], baie:{ f:'rond', c:'#3a4a8a', c2:'#8a9ad0', n:14, t:.07 } },
  poivrier:    { nom:'Poivrier du Sichuan, timut, sansho', type:'arbuste', biomes:['tempere', 'subtropicale', 'mousson', 'mediterraneenne'], tm:[8, 22], hum:[.4, 1], terrain:'lisiere', r:2, lobes:9, f:['#5a8a3e', '#7cae58', '#305428'], baie:{ f:'epine', c:'#a8301e', c2:'#e0705a', n:20, t:.05 } },
  vigne:       { nom:'Vigne, raisin de table', type:'liane', biomes:['mediterraneenne', 'tempere', 'subtropicale', 'semi_aride'], tm:[9, 22], hum:[.2, .8], terrain:'sec', r:1.5, lobes:8, f:['#5c8c3c', '#80b056', '#335a26'], baie:{ f:'raisin', c:'#6a2a6a', c2:'#a05aa0', n:6, t:0.075 } },
};
// ---- validation : les espèces que le joueur a validées dans arbustes-baies.html (seules celles-là entrent dans le jeu) ----
const BAIES_CLE = 'baies.valides.v1';
try { if (!localStorage.getItem('baies.implantees.v1')) { localStorage.setItem(BAIES_CLE, JSON.stringify(Object.keys(BAIES))); localStorage.setItem('baies.implantees.v1', '1'); } } catch (e) {}   // implantation (07/10) : toutes les espèces entrent dans le jeu, une seule fois
function baiesValides() { try { const l = JSON.parse(localStorage.getItem(BAIES_CLE) || '[]'); return Array.isArray(l) ? l.filter(k => BAIES[k]) : []; } catch (e) { return []; } }
function baiesEnregistre(liste) { try { localStorage.setItem(BAIES_CLE, JSON.stringify(liste)); } catch (e) {} }

// ---- climat de la région : paramètres de l'adresse (le jeu) sinon valeurs typiques du biome ----
const BAIE_TM = { polaire:-20, toundra:-8, taiga:0, tempere:11, prairie:10, mediterraneenne:16, subtropicale:19, mousson:25, montagne:5, steppe_aride:12, semi_aride:18, desert_aride:22, xerophyte:20, savane:26, savane_claire:26, tropicale_cad:26, tropicale:26 };
const BAIE_HUM = { polaire:.2, toundra:.5, taiga:.7, tempere:.7, prairie:.5, mediterraneenne:.4, subtropicale:.8, mousson:.9, montagne:.7, steppe_aride:.25, semi_aride:.2, desert_aride:.1, xerophyte:.2, savane:.5, savane_claire:.5, tropicale_cad:.8, tropicale:.9 };
function baiesClimat() {
  const p = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null, b = typeof S !== 'undefined' ? S.biome : 'tempere';
  return { biome:b, tm:p && p.has('tm') ? +p.get('tm') : (BAIE_TM[b] ?? 10), hum:p && p.has('hum') ? +p.get('hum') : (BAIE_HUM[b] ?? .6) };
}
// convenance de l'espèce au climat : 0 (ne pousse pas ici) à 1 (conditions idéales)
function baieConvenance(a, c) {
  if (!a.biomes.includes(c.biome) || c.tm < a.tm[0] || c.tm > a.tm[1] || c.hum < a.hum[0] || c.hum > a.hum[1]) return 0;
  const dt = Math.abs(c.tm - (a.tm[0] + a.tm[1]) / 2) / ((a.tm[1] - a.tm[0]) / 2), dh = Math.abs(c.hum - (a.hum[0] + a.hum[1]) / 2) / ((a.hum[1] - a.hum[0]) / 2);
  return Math.max(.25, 1 - .6 * Math.max(dt, dh));
}
// clé de cache de la végétation fixe : espèces validées et climat
const baiesSignature = () => { const c = baiesClimat(); return baiesValides().sort().join(',') + '@' + c.biome + ':' + Math.round(c.tm) + ':' + Math.round(c.hum * 10); };

// ---- pose des massifs (appelé par floraCandidates, paysage.js) : fz = bruit de forêt, B = flore du biome ----
function baiesCandidats(fz, B) {
  const valides = baiesValides(), c = baiesClimat(), out = [];
  if (!valides.length) return out;
  const M = 120, eau = [];
  for (const lk of S.lakes) for (const q of lakeShape(lk)) eau.push(q);
  for (const rv of S.rivers) for (let i = 0; i < rv.pts.length; i += 2) eau.push(rv.pts[i]);
  const prochEau = (x, y, dmin, dmax) => { let d = Infinity; for (const q of eau) { const e = Math.hypot(q[0] - x, q[1] - y); if (e < d) d = e; } return d >= dmin && d <= dmax; };
  const loinEau = (x, y, d) => !eau.some(q => Math.abs(q[0] - x) < d && Math.abs(q[1] - y) < d && Math.hypot(q[0] - x, q[1] - y) < d);
  const echelle = TW * TH / (4800 * 3600);
  Object.keys(BAIES).forEach((key, ki) => {
    if (!valides.includes(key)) return;
    const a = BAIES[key], fit = baieConvenance(a, c); if (!fit) return;
    const rnd = seeded(S.landSeed * 17 + ki * 101 + 3), massifs = Math.max(2, Math.round((3 + 7 * fit) * Math.sqrt(echelle)));
    let poses = 0;
    for (let t = 0; t < 600 && poses < massifs; t++) {
      const x = M + rnd() * (TW - 2 * M), y = M + rnd() * (TH - 2 * M), f = fz(x, y);
      const ok = a.terrain === 'humide' ? prochEau(x, y, 8, 50) && f < B.forest - .02
        : a.terrain === 'lisiere' ? f > B.forest - .16 && f < B.forest - .03
        : a.terrain === 'clairiere' ? f < B.forest - .16
        : f < B.forest - .16 && loinEau(x, y, 90);                                   // sec : à découvert, loin de l'eau
      if (!ok || !dansRegion([x, y])) continue;
      const n = 3 + Math.floor(rnd() * 5), pieds = [];
      for (let i = 0, essais = 0; i < n && essais < 40; essais++) {
        const an = rnd() * 6.28, d = i ? Math.sqrt(rnd()) * 9 : 0, p = [x + Math.cos(an) * d, y + Math.sin(an) * d];
        if (pieds.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 2.4 + a.r)) continue;
        pieds.push(p); i++;
      }
      for (const p of pieds) out.push({ x:round2(p[0]), y:round2(p[1]), r:a.r * (.85 + rnd() * .3), kind:'baie', sp:key, v:rnd() });
      poses++;
    }
  });
  return out;
}

// ---- dessin : vue de dessus, comme les arbres fruitiers ----
const BAIE_INK = '#2f2a24';
function baieFruit(f, x, y, r) {
  const lw = Math.max(.6, r * .16);
  ctx.lineWidth = lw; ctx.strokeStyle = BAIE_INK; ctx.fillStyle = f.c; ctx.lineJoin = 'round';
  const bille = (bx, by, q) => { ctx.beginPath(); ctx.arc(bx, by, q, 0, 7); ctx.fillStyle = f.c; ctx.fill(); ctx.stroke(); if (q > 1.6) { ctx.beginPath(); ctx.arc(bx, by - q * .3, q * .32, 0, 7); ctx.fillStyle = f.c2; ctx.fill(); } };
  switch (f.f) {
    case 'ovale': ctx.beginPath(); ctx.ellipse(x, y, r * .75, r * 1.1, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y - r * .3, r * .25, 0, 7); ctx.fillStyle = f.c2; ctx.fill(); return;
    case 'grappe': for (const [dx, dy] of [[0, -1.1], [-.8, -.2], [.8, -.2], [-.4, .7], [.4, .7], [0, .1]]) bille(x + dx * r * .9, y + dy * r * .9, r * .55); return;
    case 'raisin': for (const [dx, dy] of [[-.7, -1], [.7, -1], [0, -.5], [-1, 0], [0, 0], [1, 0], [-.5, .6], [.5, .6], [0, 1.2]]) bille(x + dx * r * .7, y + dy * r * .7, r * .5); return;
    case 'mure': for (const [dx, dy] of [[-.55, -.4], [.55, -.4], [0, .55], [-.55, .35], [.55, .35], [0, -.5]]) bille(x + dx * r, y + dy * r, r * .55); return;
    case 'epine': for (const [dx, dy] of [[0, -.9], [-.8, -.3], [.8, -.3], [0, .1], [-.5, .75], [.5, .75]]) bille(x + dx * r, y + dy * r, r * .5); return;
    case 'fraise': ctx.beginPath(); ctx.moveTo(x - r * .9, y - r * .5); ctx.quadraticCurveTo(x, y - r * 1.2, x + r * .9, y - r * .5); ctx.quadraticCurveTo(x + r * .6, y + r * 1.1, x, y + r * 1.3); ctx.quadraticCurveTo(x - r * .6, y + r * 1.1, x - r * .9, y - r * .5); ctx.fill(); ctx.stroke();
      if (r > 2) { ctx.fillStyle = '#f2e27a'; for (const [dx, dy] of [[-.3, -.2], [.3, -.2], [0, .3], [-.25, .7], [.25, .7]]) ctx.fillRect(x + dx * r - .4, y + dy * r - .4, .9, .9); ctx.beginPath(); ctx.arc(x, y - r * .8, r * .35, 0, 7); ctx.fillStyle = '#4a8a3a'; ctx.fill(); } return;
    case 'kiwi': ctx.beginPath(); ctx.ellipse(x, y, r * 1.05, r * .75, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(x, y - r * .15, r * .45, r * .3, 0, 0, 7); ctx.fillStyle = f.c2; ctx.fill(); return;
    case 'passion': ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, r * .55, 0, 7); ctx.fillStyle = f.c2; ctx.fill(); ctx.beginPath(); ctx.arc(x, y - r * .1, r * .18, 0, 7); ctx.fillStyle = '#e8d870'; ctx.fill(); return;
    default: bille(x, y, r);
  }
}
function baieFeuillage(a, cx, cy, R, rnd) {
  const [base, clair, bord] = a.f, n = a.lobes * 2, ph = -Math.PI / 2, P = [];   // symétrie : mêmes lobes tout autour, un lobe pointe vers le haut
  if (a.type === 'rampant') {                                               // plante basse : rosace régulière de feuilles rondes (une au centre, huit autour)
    for (let i = 0; i < 9; i++) { const an = (i - 1) / 8 * 6.28 + ph, d = i ? R * .5 : 0, X = cx + Math.cos(an) * d, Y = cy + Math.sin(an) * d, q = R * (i ? .34 : .3);
      ctx.beginPath(); ctx.ellipse(X, Y + q * .25, q, q * .8, an, 0, 7); ctx.fillStyle = 'rgba(40,50,25,.25)'; ctx.fill();
      ctx.beginPath(); ctx.ellipse(X, Y, q, q * .85, an, 0, 7); ctx.fillStyle = i ? base : clair; ctx.fill(); ctx.lineWidth = Math.max(.7, R * .05); ctx.strokeStyle = bord; ctx.stroke(); }
    return (x, y) => Math.hypot(x - cx, y - cy) < R * .8;
  }
  for (let i = 0; i < n; i++) { const an = i / n * Math.PI * 2 + ph, q = i % 2 ? .88 : 1.04; P.push([cx + Math.cos(an) * R * q, cy + Math.sin(an) * R * q * .96]); }
  ctx.save(); ctx.translate(0, R * .2); arbreLisse(P); ctx.fillStyle = 'rgba(55,50,30,.28)'; ctx.fill(); ctx.restore();   // ombre centrée sous le pied
  arbreLisse(P); ctx.fillStyle = base; ctx.fill(); ctx.lineJoin = 'round'; ctx.strokeStyle = bord; ctx.lineWidth = Math.max(.9, R * .045); ctx.stroke();
  ctx.save(); arbreLisse(P); ctx.clip();
  ctx.beginPath(); ctx.ellipse(cx, cy - R * .2, R * .62, R * .52, 0, 0, 7); ctx.fillStyle = clair; ctx.fill();                       // reflet : d'en haut, centré
  ctx.beginPath(); ctx.ellipse(cx, cy + R * .5, R * .75, R * .4, 0, 0, 7); ctx.fillStyle = 'rgba(30,50,25,.18)'; ctx.fill();
  if (a.type === 'liane') { ctx.strokeStyle = bord + 'aa'; ctx.lineWidth = Math.max(.8, R * .035); for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(cx - R, cy + R * k * .5); ctx.quadraticCurveTo(cx, cy + R * (k * .5 - .3), cx + R, cy + R * k * .5); ctx.stroke(); } }   // trois sarments en arc, symétriques
  if (R > 10) { ctx.strokeStyle = bord + '66'; ctx.lineWidth = Math.max(.7, R * .02); ctx.lineCap = 'round'; const pas = R * .2; for (let y = -R, j = 0; y <= R; y += pas, j++) for (let x = -R + (j % 2) * pas / 2; x <= R; x += pas) { ctx.beginPath(); ctx.moveTo(cx + x, cy + y); ctx.lineTo(cx + x, cy + y + pas * .4); ctx.stroke(); } }   // nervures régulières
  ctx.restore();
  return (x, y) => Math.hypot(x - cx, (y - cy) / .96) < R * .76;
}
// peint une espèce centrée en (cx, cy), de rayon R pixels ; seed fixe la forme et la place des baies
function peintBaie(a, cx, cy, R, seed, fruits = true) {
  const rnd = seeded(seed * 977 + 41), dedans = baieFeuillage(a, cx, cy, R, rnd);
  if (R < 4 || !fruits) return;                                              // vue de loin, ou hors saison : seulement le feuillage
  /* Fruits : plus petits (taille × 1,5 au lieu de × 2,6) et répartis en anneaux symétriques.
     Le nombre est réduit si la place manque : au moins 4 rayons de fruit entre deux fruits voisins d'un anneau. */
  const fr = a.baie, r = Math.max(1, fr.t * R * 1.5), pts = [], zone = R * (a.type === 'rampant' ? .68 : .7);   // plus large : les fruits s'écartent vers le bord du feuillage
  let n = fr.n; const anneaux = n <= 8 ? [n] : n <= 14 ? [Math.round(n * .35), n - Math.round(n * .35)] : [Math.round(n * .2), Math.round(n * .3), n - Math.round(n * .2) - Math.round(n * .3)];
  const rayons = anneaux.length === 1 ? [.7] : anneaux.length === 2 ? [.4, .95] : [.28, .62, .95];
  anneaux.forEach((c, k) => {
    const rho = zone * rayons[k], cap = Math.max(1, Math.floor(2 * Math.PI * rho / (r * 4.2)));                // pas plus de fruits que la place ne permet
    c = Math.min(c, cap); if (c === 1 && anneaux.length > 1 && k === 0) { pts.push([cx, cy]); return; }       // (un seul fruit au centre)
    for (let m = 0; m < c; m++) { const an = -Math.PI / 2 + (k % 2 ? Math.PI / c : 0) + m * 2 * Math.PI / c; pts.push([cx + Math.cos(an) * rho, cy + Math.sin(an) * rho * .96]); }
  });
  pts.sort((p, q) => p[1] - q[1]);
  for (const [x, y] of pts) baieFruit(fr, x, y, r);
}
// dans le décor : un pied de la végétation fixe (flora de kind 'baie')
function stampBaie(g, f, X, Y, s) { const a = BAIES[f.sp]; if (a) peintBaie(a, X, Y, Math.max(2.2, f.r * s), Math.round(f.v * 1e6), typeof fruitsVisibles === 'function' ? fruitsVisibles(f) : true); }
