/* Décors du sol : fleurs, touffes d'herbe, buissons, feuilles et divers, tous dessinés en vue du dessus.
   Les mêmes dessins servent à l'onglet Décors du sol (decors-sol.html) et au jeu. */
const DECORS_SOL = (() => {
const TAU = Math.PI * 2;
const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
const SOL = '#aacb2a', SOL2 = '#9cc122';

/* ---------- petits outils de dessin (repère unité : le décor tient dans un rayon de 1) ---------- */
const trait = (g, w, col) => { g.lineWidth = w; g.strokeStyle = col; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); };
const disque = (g, x, y, r, fill, edge, w = .05) => { g.beginPath(); g.arc(x, y, r, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (edge) trait(g, w, edge); };
// pétale/feuille pointée : de (0,0) vers +x, longueur len, largeur wid
function petale(g, len, wid, fill, edge, w = .045, pointe = .5) {
  g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(len * .25, -wid, len * pointe, -wid * .9, len, 0); g.bezierCurveTo(len * pointe, wid * .9, len * .25, wid, 0, 0); g.closePath();
  g.fillStyle = fill; g.fill(); if (edge) trait(g, w, edge);
}
const tourne = (g, a, f) => { g.save(); g.rotate(a); f(); g.restore(); };
const couronne = (g, n, f, a0 = 0) => { for (let i = 0; i < n; i++) tourne(g, a0 + i * TAU / n, () => f(i)); };
// brin d'herbe : courbe de (x0,y0) à (x1,y1), contour sombre + reflet clair
function brin(g, x0, y0, x1, y1, bend, w, col, hi) {
  const cx = (x0 + x1) / 2 + bend, cy = (y0 + y1) / 2;
  g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); trait(g, w, col);
  if (hi) { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx + w * .3, cy, x1, y1); trait(g, w * .38, hi); }
}
// contour festonné (buissons, mousse)
function feston(g, r, n, amp, rnd) {
  const pts = []; for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU, rr = r * (1 + (i % 2 ? -amp : amp) * (.7 + rnd() * .6)); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  g.beginPath(); pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; i ? g.quadraticCurveTo(p[0], p[1], m[0], m[1]) : g.moveTo(m[0], m[1]); });
  const p = pts[0], q = pts[1]; g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); g.closePath();
}
// feuille à profil libre : prof(t) ∈ [0,1] donne la demi-largeur relative ; nervure centrale et nervures latérales
function feuille(g, len, wid, prof, fill, edge, nerv, w = .04) {
  const N = 40, L = [], R = [];
  for (let i = 0; i <= N; i++) { const t = i / N, x = t * len, y = prof(t) * wid; L.push([x, -y]); R.push([x, y]); }
  g.beginPath(); L.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); R.reverse().forEach(p => g.lineTo(p[0], p[1])); g.closePath();
  g.fillStyle = fill; g.fill(); if (edge) trait(g, w, edge);
  if (nerv) { g.beginPath(); g.moveTo(0, 0); g.lineTo(len * .92, 0); for (let k = 1; k <= 4; k++) { const x = len * k / 5, y = prof(k / 5) * wid * .8; g.moveTo(x, 0); g.lineTo(x + len * .1, -y); g.moveTo(x, 0); g.lineTo(x + len * .1, y); } trait(g, w * .55, nerv); }
}
const ovale = t => Math.pow(Math.sin(Math.PI * Math.pow(t, .8)), .8);
const cordee = t => Math.pow(Math.sin(Math.PI * Math.pow(t, .6)), .75);
const lobee = n => t => Math.sin(Math.PI * t) ** .7 * (.62 + .38 * Math.abs(Math.sin(t * Math.PI * n)));
const dentee = n => t => Math.sin(Math.PI * Math.pow(t, .85)) ** .85 * (.9 + .1 * ((t * n) % 1));
const ombre = (g, rx, ry, a = .22) => { g.save(); g.translate(.08, .12); g.scale(1, ry / rx); g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fillStyle = 'rgba(30,45,20,' + a + ')'; g.fill(); g.restore(); };

/* ---------- les modèles ---------- */
const D = [];
const ajoute = (cat, nom, f) => D.push({ id:cat[0] + (D.filter(d => d.cat === cat).length + 1), cat, nom, f });

// ===== FLEURS =====
ajoute('Fleurs', 'Marguerite', (g) => { couronne(g, 13, () => { g.translate(.14, 0); petale(g, .7, .1, '#fffdf4', '#b8b49c', .04, .6); }); disque(g, 0, 0, .2, '#f2c22a', '#a8780c'); disque(g, -.05, -.06, .07, '#fbe27a'); });
ajoute('Fleurs', 'Pâquerette', (g) => { couronne(g, 10, () => { g.translate(.1, 0); petale(g, .6, .085, '#fffefa', '#d98ba2', .04, .6); }); disque(g, 0, 0, .15, '#f1c232', '#9c7010'); });
ajoute('Fleurs', 'Bouton d\'or', (g) => { couronne(g, 5, () => disque(g, .3, 0, .27, '#f4d02e', '#a8820e')); disque(g, 0, 0, .16, '#e09f10', '#8a5a08'); disque(g, -.04, -.05, .05, '#f7e59a'); });
ajoute('Fleurs', 'Coquelicot', (g) => { couronne(g, 4, () => { g.save(); g.translate(.34, 0); g.scale(1.1, .95); disque(g, 0, 0, .38, '#dc3d2c', '#8a1a12'); g.restore(); g.beginPath(); g.moveTo(.1, 0); g.quadraticCurveTo(.35, -.1, .62, 0); trait(g, .03, '#a82a1c'); }, .4); disque(g, 0, 0, .13, '#2a1c1c'); couronne(g, 8, () => disque(g, .2, 0, .035, '#2a1c1c')); });
ajoute('Fleurs', 'Bleuet', (g) => { couronne(g, 9, () => { g.translate(.08, 0); petale(g, .78, .12, '#5176dc', '#25397a', .04, .55); }); couronne(g, 9, () => { g.translate(.05, 0); petale(g, .4, .07, '#7a9af0', null); }, .35); disque(g, 0, 0, .12, '#6a4a9a', '#2a1a50', .035); });
ajoute('Fleurs', 'Pissenlit', (g, r) => { couronne(g, 30, () => { g.translate(.1, 0); petale(g, .62, .05, '#f6c91c', '#b08a10', .03, .5); }); couronne(g, 18, () => { g.translate(.06, 0); petale(g, .38, .045, '#ffe05a', null); }, .17); disque(g, 0, 0, .1, '#e8a812'); });
ajoute('Fleurs', 'Pissenlit en graine', (g, r) => { g.beginPath(); couronne(g, 36, () => { g.moveTo(.1, 0); g.lineTo(.72, 0); }); trait(g, .022, '#d9d8cc'); couronne(g, 36, () => disque(g, .74, 0, .045, '#fbfbf4', '#c8c8b8', .015)); disque(g, 0, 0, .12, '#a89a6a', '#6a5c38', .03); });
ajoute('Fleurs', 'Trèfle fleuri', (g, r) => { couronne(g, 3, () => { g.translate(.18, 0); feuille(g, .6, .27, ovale, '#5f9a44', '#2d5a24', '#8cc064', .035); }, .5); for (let i = 0; i < 16; i++) { const a = r() * TAU, d = Math.sqrt(r()) * .3; disque(g, Math.cos(a) * d, Math.sin(a) * d, .1, '#ec8fb6', '#a8436d', .03); } });
ajoute('Fleurs', 'Violette', (g) => { couronne(g, 5, (i) => { g.translate(.1, 0); petale(g, i < 2 ? .7 : .55, i < 2 ? .22 : .2, i < 2 ? '#7a4ac4' : '#9a6ad8', '#3e2078', .04, .6); }, -2.2); disque(g, 0, 0, .1, '#f6d84a', '#9a7010', .03); });
ajoute('Fleurs', 'Myosotis', (g) => { [[-.38, .24, 1], [.4, .3, .9], [-.04, -.42, 1.05]].forEach(([x, y, s]) => { g.save(); g.translate(x, y); g.scale(s * .62, s * .62); couronne(g, 5, () => disque(g, .3, 0, .25, '#6f9cf0', '#2c55b0', .06)); disque(g, 0, 0, .12, '#fff3a8'); g.restore(); }); });
ajoute('Fleurs', 'Lavande', (g) => { couronne(g, 6, () => { g.beginPath(); g.moveTo(.1, 0); g.lineTo(.92, 0); trait(g, .045, '#4a7a34'); for (let i = 0; i < 7; i++) { const x = .3 + i * .1; disque(g, x, i % 2 ? .06 : -.06, .075, i % 2 ? '#8a5ac4' : '#a07ad8', '#4a2a88', .025); } disque(g, .97, 0, .06, '#a07ad8', '#4a2a88', .025); }); disque(g, 0, 0, .1, '#4a7a34'); });
ajoute('Fleurs', 'Fleur orange', (g) => { couronne(g, 6, () => { g.translate(.1, 0); petale(g, .78, .2, '#f28c28', '#a04e0c', .045, .6); }); couronne(g, 6, () => { g.translate(.12, 0); petale(g, .42, .08, '#fbc76a', null); }); disque(g, 0, 0, .13, '#8a3a0c'); });
ajoute('Fleurs', 'Fleurs des prés (trio)', (g) => { [[-.45, -.3, '#fffdf4', '#c8c4ac'], [.4, -.1, '#f4d02e', '#a8820e'], [0, .5, '#f0a0c4', '#a8436d']].forEach(([x, y, c, e]) => { g.save(); g.translate(x, y); g.scale(.5, .5); couronne(g, 6, () => disque(g, .4, 0, .34, c, e, .07)); disque(g, 0, 0, .22, '#f0b820', '#8a6008', .06); g.restore(); }); });

// 13/10 : toutes les fleurs sont simplifiées — cinq pétales ronds d'une couleur autour d'un cœur rond de l'autre ; seules les couleurs distinguent les espèces
{
  const COUL = { 'Marguerite':['#fffdf4', '#f2c22a'], 'Pâquerette':['#fffefa', '#f1c232'], "Bouton d'or":['#f4d02e', '#e09f10'], 'Coquelicot':['#dc3d2c', '#2a1a14'], 'Bleuet':['#5176dc', '#2a2f6a'], 'Pissenlit':['#f6c91c', '#e09f10'],
    'Pissenlit en graine':['#e6e5da', '#b8b6a4'], 'Trèfle fleuri':['#f0a0c4', '#d0709a'], 'Violette':['#7a4ac4', '#f2c22a'], 'Myosotis':['#6aa0e8', '#f4d02e'], 'Lavande':['#8a6ad0', '#6a4aa8'], 'Fleur orange':['#f28c28', '#f7d070'], 'Fleurs des prés (trio)':['#f4d02e', '#fffdf4'] };
  for (const d of D) if (d.cat === 'Fleurs') { const [p, c] = COUL[d.nom] || ['#f4d02e', '#e09f10']; d.f = g => { couronne(g, 5, () => disque(g, .4, 0, .32, p, '#2f2a24', .045)); disque(g, 0, 0, .24, c, '#2f2a24', .045); }; }
}

// ===== TOUFFES D'HERBE =====
// touffe vue du dessus : brins qui rayonnent depuis le centre (n brins, de la longueur l0 à l1, courbure b)
function rayons(g, r, n, l0, l1, b, w, c, hi, a0 = 0) { for (let i = 0; i < n; i++) { const a = a0 + i / n * TAU, l = l0 + (l1 - l0) * (i % 2); brin(g, Math.cos(a) * .06, Math.sin(a) * .06, Math.cos(a + b) * l, Math.sin(a + b) * l, 0, w, c, hi); } }
const V1 = '#3f6a28', V2 = '#6e9c3e', V3 = '#a9cf62';
ajoute('Touffes', 'Touffe simple', (g, r) => { rayons(g, r, 8, .5, .72, .12, .09, V1, V3); });
ajoute('Touffes', 'Touffe en étoile', (g, r) => { rayons(g, r, 14, .6, .95, .16, .08, V1, V2); rayons(g, r, 7, .35, .5, .2, .06, V2, V3, .2); });
ajoute('Touffes', 'Touffe dessinée', (g) => { couronne(g, 9, () => { g.translate(.05, 0); petale(g, .9, .13, '#6e9c3e', '#1f3a14', .055, .55); }); couronne(g, 9, () => { g.translate(.05, 0); petale(g, .5, .09, '#a9cf62', '#2f5220', .04, .55); }, .35); disque(g, 0, 0, .09, '#3f6a28', '#1f3a14', .04); });
ajoute('Touffes', 'Herbe haute (vue du dessus)', (g, r) => { for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + r() * .2, l = .7 + r() * .3; brin(g, 0, 0, Math.cos(a) * l, Math.sin(a) * l, (r() - .5) * .35, .075, V1, V2); } for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + .2, l = .45; brin(g, 0, 0, Math.cos(a) * l, Math.sin(a) * l, .1, .05, V2, V3); } });
ajoute('Touffes', 'Brins fins', (g, r) => { for (let i = 0; i < 26; i++) { const x = (r() - .5) * 1.4, y = (r() - .2) * .9, h = .25 + r() * .35; brin(g, x, y, x + (r() - .5) * .3, y - h, (r() - .5) * .15, .04, i % 3 ? V1 : V3); } });
ajoute('Touffes', 'Herbe sèche', (g, r) => { rayons(g, r, 14, .6, .92, .18, .07, '#8a7430', '#d6c070'); rayons(g, r, 7, .3, .5, .2, .05, '#a8923e', '#e6d490', .2); });
ajoute('Touffes', 'Herbe à épis', (g, r) => { for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, x = Math.cos(a + .12) * .78, y = Math.sin(a + .12) * .78; brin(g, 0, 0, x, y, 0, .06, V1, V3); g.save(); g.translate(x, y); g.rotate(a + .12); feuille(g, .3, .075, ovale, '#d4b04a', '#8a6a1c', null, .03); g.restore(); } rayons(g, r, 8, .4, .4, .15, .05, V2, V3, .39); });
ajoute('Touffes', 'Tapis de trèfles', (g, r) => { [[-.5, -.35], [.4, -.4], [0, .1], [-.4, .5], [.5, .45]].forEach(([x, y]) => { g.save(); g.translate(x, y); g.rotate(r() * TAU); g.scale(.4, .4); couronne(g, 3, () => { g.translate(.3, 0); disque(g, .35, 0, .5, '#5f9a44', '#2d5a24', .09); g.beginPath(); g.moveTo(.1, -.28); g.lineTo(.45, 0); g.lineTo(.1, .28); trait(g, .06, '#bfe08e'); }, .5); g.restore(); }); });
ajoute('Touffes', 'Mousse', (g, r) => { feston(g, .85, 9, .12, r); g.fillStyle = '#5c8c38'; g.fill(); trait(g, .05, '#35581f'); for (let i = 0; i < 26; i++) { const a = r() * TAU, d = Math.sqrt(r()) * .7; disque(g, Math.cos(a) * d, Math.sin(a) * d, .06 + r() * .05, i % 2 ? '#86b45a' : '#47742a'); } });
ajoute('Touffes', 'Fougère', (g) => { g.beginPath(); g.moveTo(0, .9); g.quadraticCurveTo(.15, 0, 0, -.9); trait(g, .05, '#2f5a22'); for (let i = 0; i < 9; i++) { const t = i / 9, y = .75 - t * 1.55, w = Math.sin(Math.PI * (t * .9 + .05)) * .55 + .12; for (const s of [-1, 1]) { g.save(); g.translate(.05 * Math.sin(t * 3), y); g.rotate(s * -1.0); g.scale(s, 1); petale(g, w, .12, '#4f8a3a', '#2a5220', .035); g.restore(); } } });
ajoute('Touffes', 'Joncs', (g, r) => { rayons(g, r, 16, .7, .98, .08, .05, '#3c6a3a', '#86b078'); for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + .5; g.save(); g.translate(Math.cos(a) * .22, Math.sin(a) * .22); g.rotate(a); feuille(g, .34, .1, ovale, '#6a4a2a', '#2e1c0e', null, .03); g.restore(); } });

// ===== BUISSONS =====
function buisson(g, r, o) {   // symétrique : même forme dans toutes les directions (aucun tirage au hasard)
  const sym = () => .5;
  ombre(g, o.r, o.r * .85);
  feston(g, o.r, o.n, o.amp, sym); g.fillStyle = o.fill; g.fill(); trait(g, .07, o.edge);
  for (let i = 0; i < o.n; i++) { const a = i / o.n * TAU, d = o.r * .55; g.save(); g.translate(Math.cos(a) * d, Math.sin(a) * d); feston(g, o.r * .42, 5, .12, sym); g.fillStyle = o.mid; g.fill(); trait(g, .035, o.edge); g.restore(); }
  feston(g, o.r * .4, o.n, .1, sym); g.fillStyle = o.hi; g.fill();
  if (o.dots) { const R = [[.22, 4], [.45, 8], [.68, 12]]; R.forEach(([d, k], ring) => { for (let i = 0; i < k; i++) { const a = i / k * TAU + (ring % 2) * Math.PI / k; disque(g, Math.cos(a) * d * o.r / .85, Math.sin(a) * d * o.r / .85, o.dots[2] || .07, o.dots[0], o.dots[3] || '#00000040', .02); } }); }
}
const BV = { fill:'#4a8236', mid:'#5a9640', hi:'#79b457', edge:'#244a1a' };
ajoute('Buissons', 'Buisson rond', (g, r) => buisson(g, r, { ...BV, r:.85, n:9, amp:.1 }));
ajoute('Buissons', 'Buisson à baies rouges', (g, r) => buisson(g, r, { ...BV, r:.85, n:9, amp:.1, dots:['#d8283a', 16, .075, '#7a0e1a'] }));
ajoute('Buissons', 'Buisson fleuri rose', (g, r) => buisson(g, r, { ...BV, r:.85, n:9, amp:.1, dots:['#f6a6c8', 22, .085, '#b0487a'] }));
ajoute('Buissons', 'Buisson fleuri blanc', (g, r) => buisson(g, r, { ...BV, r:.85, n:9, amp:.1, dots:['#fffdf2', 22, .08, '#b8b49c'] }));
ajoute('Buissons', 'Petit buisson clair', (g, r) => buisson(g, r, { fill:'#7aa848', mid:'#8cbc56', hi:'#aad46e', edge:'#3c6424', r:.6, n:7, amp:.1 }));
ajoute('Buissons', 'Buisson sombre', (g, r) => buisson(g, r, { fill:'#2f5a2a', mid:'#3a6c32', hi:'#4f8844', edge:'#142e12', r:.9, n:10, amp:.13 }));
ajoute('Buissons', 'Houx', (g) => { ombre(g, .8, .7); g.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, rr = i % 2 ? .62 : .88; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fillStyle = '#1f5230'; g.fill(); trait(g, .06, '#0c2616'); couronne(g, 8, () => { g.translate(.1, 0); petale(g, .6, .17, '#2f7040', '#12341c', .035); }, .2); couronne(g, 6, () => disque(g, .3, 0, .08, '#d02a30', '#701018', .025)); disque(g, 0, 0, .09, '#d02a30', '#701018', .025); });
ajoute('Buissons', 'Genêt', (g, r) => buisson(g, r, { fill:'#6c9a3a', mid:'#7eae48', hi:'#9cc862', edge:'#35561c', r:.85, n:9, amp:.1, dots:['#f6d41e', 26, .06, '#a08a08'] }));
ajoute('Buissons', 'Bruyère', (g, r) => buisson(g, r, { fill:'#7a5a8a', mid:'#8e6ea0', hi:'#aa8cba', edge:'#3e2a52', r:.8, n:10, amp:.09, dots:['#d8a8e8', 20, .05, '#6a3a82'] }));
ajoute('Buissons', 'Touffe de feuillage', (g, r) => { ombre(g, .85, .8, .18); for (let ring = 0; ring < 2; ring++) couronne(g, 9 - ring * 2, (i) => { g.translate(.05, 0); feuille(g, .95 - ring * .35, .22, ovale, ring ? '#68a048' : '#3f7a34', '#1f4418', ring ? '#9ccc72' : '#5a9a4a', .04); }, ring * .25); });

// ===== FEUILLES AU SOL =====
const FE = (col, edge, nerv) => (g, len, wid, prof) => feuille(g, len, wid, prof, col, edge, nerv);
ajoute('Feuilles', 'Feuille de chêne', (g) => { g.translate(-.75, 0); feuille(g, 1.5, .42, lobee(4), '#7a9a3a', '#364c14', '#a8c466', .045); });
ajoute('Feuilles', 'Feuille d\'érable', (g) => { g.beginPath(); const P = [[0, -.95], [.2, -.45], [.62, -.62], [.5, -.18], [.92, -.1], [.55, .15], [.65, .55], [.2, .38], [0, .85], [-.2, .38], [-.65, .55], [-.55, .15], [-.92, -.1], [-.5, -.18], [-.62, -.62], [-.2, -.45]]; P.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fillStyle = '#d8661e'; g.fill(); trait(g, .05, '#7a2c08'); g.beginPath(); [[0, .85, 0, -.7], [0, .1, .6, -.45], [0, .1, -.6, -.45], [0, .15, .75, -.02], [0, .15, -.75, -.02]].forEach(([a, b, c, d]) => { g.moveTo(a, b); g.lineTo(c, d); }); trait(g, .03, '#f0a45a'); });
ajoute('Feuilles', 'Feuille de bouleau', (g) => { g.translate(-.7, 0); feuille(g, 1.4, .5, dentee(11), '#b6b84a', '#6a6c1c', '#e0e08a', .04); });
ajoute('Feuilles', 'Feuille d\'automne', (g) => { g.translate(-.7, 0); feuille(g, 1.4, .46, ovale, '#c0561e', '#6a2a0a', '#e8964e', .045); g.beginPath(); g.moveTo(-.2, 0); g.lineTo(0, 0); trait(g, .05, '#5a2a10'); });
ajoute('Feuilles', 'Tas de feuilles', (g, r) => { const C = [['#c0561e', '#6a2a0a'], ['#d8a02e', '#7a5a0a'], ['#8a5a28', '#40260c'], ['#a8a83a', '#5a5a14'], ['#b8381e', '#5e140a']]; for (let i = 0; i < 9; i++) { g.save(); g.translate((r() - .5) * 1, (r() - .5) * .9); g.rotate(r() * TAU); const c = C[i % 5]; feuille(g, .7, .22, i % 2 ? ovale : lobee(3), c[0], c[1], null, .035); g.restore(); } });
ajoute('Feuilles', 'Lierre', (g, r) => { for (let i = 0; i < 3; i++) { g.save(); g.rotate(i * 2.1 + .4); g.translate(.08, 0); feuille(g, .88, .46, cordee, '#2a6a3a', '#10341c', '#6ab07a', .04); g.restore(); } });
ajoute('Feuilles', 'Grande feuille (bardane)', (g) => { g.translate(-.8, 0); feuille(g, 1.6, .78, cordee, '#4f9040', '#1f4a1a', '#9cd080', .05); });
ajoute('Feuilles', 'Brindilles', (g, r) => { [[-.8, .3, .8, -.3], [-.6, -.5, .7, .55], [-.2, .75, .2, -.8]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); trait(g, .075, '#5a3e22'); g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); trait(g, .03, '#8a6a42'); const mx = (a + c) / 2, my = (b + d) / 2; g.beginPath(); g.moveTo(mx, my); g.lineTo(mx + .22, my - .2); trait(g, .05, '#5a3e22'); }); });
ajoute('Feuilles', 'Feuilles mortes éparses', (g, r) => { for (let i = 0; i < 5; i++) { g.save(); g.translate((r() - .5) * 1.5, (r() - .5) * 1.3); g.rotate(r() * TAU); feuille(g, .5, .16, ovale, i % 2 ? '#9a6a34' : '#7a5a2a', '#3e2a12', null, .03); g.restore(); } });
ajoute('Feuilles', 'Feuilles de trèfle à quatre', (g) => { couronne(g, 4, () => { g.translate(.1, 0); disque(g, .32, 0, .3, '#4f9a4a', '#235a22', .06); g.beginPath(); g.moveTo(.05, -.18); g.lineTo(.4, 0); g.lineTo(.05, .18); trait(g, .045, '#c4e8a0'); }, .4); });

// ===== DIVERS =====
ajoute('Divers', 'Amanite', (g, r) => { ombre(g, .62, .6); disque(g, 0, 0, .62, '#d02a24', '#6a0e0c', .06); for (let i = 0; i < 8; i++) { const a = r() * TAU, d = r() * .38; disque(g, Math.cos(a) * d, Math.sin(a) * d, .06 + r() * .06, '#fbf6e6'); } disque(g, -.2, -.22, .14, '#ec6054'); });
ajoute('Divers', 'Cèpe', (g) => { ombre(g, .62, .6); disque(g, 0, 0, .62, '#9a6a34', '#4a2e10', .06); disque(g, -.12, -.16, .4, '#b88444'); disque(g, -.22, -.26, .16, '#d4a468'); });
ajoute('Divers', 'Groupe de champignons', (g) => { [[-.4, -.2, .34, '#e8dcc0', '#8a7a58'], [.2, .25, .4, '#c9a06a', '#6a4a22'], [.35, -.35, .26, '#e8dcc0', '#8a7a58'], [-.3, .4, .22, '#c9a06a', '#6a4a22']].forEach(([x, y, r, c, e]) => { disque(g, x + .05, y + .06, r, 'rgba(30,40,20,.2)'); disque(g, x, y, r, c, e, .045); disque(g, x - r * .3, y - r * .3, r * .35, 'rgba(255,255,255,.35)'); }); });
ajoute('Divers', 'Galets', (g, r) => { [[-.45, -.1, .34], [.1, .3, .28], [.4, -.3, .3], [-.05, -.45, .2], [.45, .42, .18]].forEach(([x, y, rr], i) => { g.save(); g.translate(x, y); g.scale(1.15, .85); g.rotate(i); disque(g, .04, .05, rr, 'rgba(30,40,20,.22)'); disque(g, 0, 0, rr, i % 2 ? '#a7a396' : '#b8b3a4', '#5c584c', .045); disque(g, -rr * .3, -rr * .3, rr * .4, 'rgba(255,255,255,.3)'); g.restore(); }); });
ajoute('Divers', 'Pierre moussue', (g, r) => { ombre(g, .8, .7); feston(g, .75, 7, .08, r); g.fillStyle = '#a5a094'; g.fill(); trait(g, .06, '#4c483e'); g.save(); g.translate(-.18, -.25); feston(g, .42, 5, .1, r); g.fillStyle = '#6a9a40'; g.fill(); g.restore(); disque(g, .2, .2, .22, '#7aa84e'); disque(g, -.3, -.3, .18, 'rgba(255,255,255,.25)'); });
ajoute('Divers', 'Souche', (g, r) => { ombre(g, .72, .66); disque(g, 0, 0, .72, '#7a5a38', '#2e1e0e', .06); disque(g, 0, 0, .56, '#caa46c', '#7a5a2e', .035); for (let i = 1; i < 5; i++) disque(g, 0, 0, .56 - i * .11, null, '#a98450', .02); disque(g, 0, 0, .04, '#7a5a2e'); });


return D;
})();

/* ---------- dans le jeu : décors du sol posés dans la végétation fixe (flora de kind 'deco') ----------
   Peints dans le décor après les routes mais avant les arbres, les bâtiments, les animaux et les habitants : tout passe par-dessus.
   Seuls les modèles « retenus » dans l'onglet Décors du sol sont posés (aucun retenu : tous). Sols herbeux seulement. */
const DECORS_CLE = 'decors.valides.v1';
function decorsValides() { try { const l = JSON.parse(localStorage.getItem(DECORS_CLE) || '[]'); return l.length ? new Set(l) : null; } catch (e) { return null; } }
const decorsSignature = () => { const v = decorsValides(); return v ? [...v].sort().join(',') : 'tous'; };
const DECOR_TAILLE = { Fleurs:[.34, .5], Touffes:[.5, .8], Buissons:[1, 1.6], Feuilles:[.4, .6], Divers:[.35, .5] };
function decorsCandidats(trees) {
  const look = biomeLook(), g = (look.ground.match(/[0-9a-f]{2}/gi) || []).map(v => parseInt(v, 16));
  if (typeof MONDE_PLAT !== 'undefined' && MONDE_PLAT) return [];
  const herbeux = g.length >= 3 && g[1] > g[0], sec = g.length >= 3 && !herbeux && g[0] - g[2] > 40;   // herbeux : tout ; sec (savane, steppe, désert, toundra) : herbes sèches et pierres ; neige : rien
  if (!herbeux && !sec) return [];
  const ok = decorsValides(), pris = d => !ok || ok.has(d.id), par = n => DECORS_SOL.filter(d => d.nom === n && pris(d)), cat = c => DECORS_SOL.filter(d => d.cat === c && pris(d));
  const rnd = seeded(S.landSeed * 41 + 7), out = [], pick = l => l[Math.floor(rnd() * l.length)];
  const pose = (d, x, y, k = 1) => { if (!d) return; const t = DECOR_TAILLE[d.cat]; let r = (t[0] + rnd() * (t[1] - t[0])) * k; if (d.nom === 'Souche') r = .9 + rnd() * .3; if (d.nom === 'Petit buisson clair') r *= .75;
    out.push({ x:round2(x), y:round2(y), r:round2(r), kind:'deco', sa:d.cat === 'Feuilles' || /Amanite|Cèpe|Groupe de champignons|Souche/.test(d.nom) ? 1 : 0, id:d.id, v:rnd(), a:/^(Fleurs|Touffes|Feuilles)$/.test(d.cat) ? rnd() * 6.283 : 0 }); };
  const fleurs = cat('Fleurs'), touffes = cat('Touffes').filter(d => !/Mousse|Joncs/.test(d.nom)), buissons = cat('Buissons'), feuilles = cat('Feuilles'), champis = DECORS_SOL.filter(d => /Amanite|Cèpe|Groupe de champignons/.test(d.nom) && pris(d));
  const ZX = TW, ZY = TH, aire = ZX * ZY;
  if (sec) {                                                                          // sols secs : herbes sèches, épis, brindilles, galets et pierres
    const seches = DECORS_SOL.filter(d => /Herbe sèche|Herbe à épis|Brindilles/.test(d.nom) && pris(d)), pierres = DECORS_SOL.filter(d => /Galets|Pierre moussue/.test(d.nom) && pris(d));
    if (seches.length) for (let n = 0; n < aire / 700; n++) pose(pick(seches), rnd() * ZX, rnd() * ZY);
    if (pierres.length) for (let n = 0; n < aire / 20000; n++) pose(pick(pierres), rnd() * ZX, rnd() * ZY);
    return out;
  }
  for (let n = 0; n < aire / 25000; n++) {                                         // prairies fleuries : une ou deux sortes de fleurs en taches de 6 à 16 m
    const cx = rnd() * ZX, cy = rnd() * ZY, R = 6 + rnd() * 10, sortes = [pick(fleurs), pick(fleurs)], mixte = rnd() < .3;
    for (let m = 12 + Math.floor(rnd() * 24); m > 0; m--) { const a = rnd() * 6.283, d = R * Math.sqrt(rnd()); pose(mixte && rnd() < .3 ? pick(touffes) : sortes[rnd() < .75 ? 0 : 1], cx + Math.cos(a) * d, cy + Math.sin(a) * d); }
  }
  for (let n = 0; n < aire / 450; n++) pose(rnd() < .9 ? pick(touffes) : pick(fleurs), rnd() * ZX, rnd() * ZY);        // touffes semées partout, quelques fleurs isolées
  for (let n = 0; n < aire / 12000; n++) pose(pick(buissons), rnd() * ZX, rnd() * ZY);                                 // buissons épars
  for (let n = 0; n < aire / 40000; n++) pose(par(rnd() < .5 ? 'Galets' : 'Pierre moussue')[0], rnd() * ZX, rnd() * ZY);
  for (const t of trees) if (!t.wood && rnd() < .4) {                                                                  // sous les arbres isolés : feuilles mortes, champignons, parfois une souche
    for (let m = 1 + Math.floor(rnd() * 3); m > 0; m--) { const a = rnd() * 6.283, d = t.r * (.5 + rnd() * .9); pose(pick(feuilles), t.x + Math.cos(a) * d, t.y + Math.sin(a) * d); }
    if (rnd() < .18) { const a = rnd() * 6.283, d = t.r * (.7 + rnd() * .5); pose(pick(champis), t.x + Math.cos(a) * d, t.y + Math.sin(a) * d); }
    if (rnd() < .05) pose(par('Souche')[0], t.x + t.r * 1.3, t.y + t.r * .4);
  }
  return out;
}
// les décors qui sont des cailloux : soumis aux mêmes règles que les rochers (jamais l'un sur l'autre, jamais dans l'eau)
const DECOR_ROCHES = new Set(DECORS_SOL.filter(d => /Galets|Pierre moussue/.test(d.nom)).map(d => d.id));
const decorSprites = {};
function stampDeco(g, f, X, Y, s) {
  const h = f.r * s * 1.2; if (h < 1.6) return;                                  // trop petit pour être vu : rien
  let sp = decorSprites[f.id];
  if (!sp) { const d = DECORS_SOL.find(q => q.id === f.id); if (!d) return; sp = decorSprites[f.id] = document.createElement('canvas'); sp.width = sp.height = 128; const c = sp.getContext('2d'); c.translate(64, 64); c.scale(54, 54); d.f(c, seeded([...d.id].reduce((a, ch) => a * 31 + ch.charCodeAt(0) >>> 0, 11))); }
  if (f.a) { g.save(); g.translate(X, Y); g.rotate(f.a); g.drawImage(sp, -h, -h, h * 2, h * 2); g.restore(); } else g.drawImage(sp, X - h, Y - h, h * 2, h * 2);
}
