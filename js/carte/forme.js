/* ---------- forme réelle de la région (data/regions/formes.json) ----------
   Le terrain n'est plus un rectangle vide : il a la forme de la région du globe, mise à
   l'échelle (outils/build-formes.js). On y trouve la région (seule constructible), les terres
   voisines (voilées, derrière la frontière en pointillés), la mer si la région est côtière,
   les vrais fleuves, les vrais lacs et les vraies routes vers les capitales voisines.
   Sans forme (éditeur sans région choisie, page d'essai), le terrain reste un rectangle. */
let FORME = null, FORME_ID = null, FORMES = null, masque = null;
const FORMES_V = 6;                                  // monter pour que les cartes de région déjà enregistrées soient régénérées par le générateur à jour
// à chaque nouvelle version, les cartes de région enregistrées (et le plan de l'éditeur) sont supprimées : elles repartent du générateur à jour
try { if (localStorage.getItem('regionsGenV') !== String(FORMES_V)) {
  Object.keys(localStorage).filter(k => k.startsWith('paperConquestRegionMap.') || k === 'editeurCarte.v1').forEach(k => localStorage.removeItem(k));
  localStorage.setItem('regionsGenV', String(FORMES_V)); } } catch (e) {}
// La carte est construite dès le chargement de la page (scripts synchrones) : le fichier des
// formes est lu d'un bloc, une seule fois (le navigateur le garde en cache ensuite).
function chargeForme(id) {
  FORME = null; FORME_ID = id || null; masque = null;
  if (!id) return null;
  try {
    if (!FORMES) { const x = new XMLHttpRequest(); x.open('GET', 'data/regions/formes.json', false); x.send(); if (x.status === 200 || x.status === 0) FORMES = JSON.parse(x.responseText); }
    FORME = (FORMES && FORMES.regions[id]) || null;
    // le fichier est à l'échelle ECHELLE_FORMES (3) ; le terrain a maintenant ECHELLE_TERRAIN : toutes les coordonnées sont ramenées à la bonne taille (copie, le fichier lu reste intact)
    if (FORME && !FORME.k && FORMES.terrain && Math.abs(TW - FORMES.terrain[0]) > 1) {
      const k = TW / FORMES.terrain[0], sc = v => Array.isArray(v) ? (v.length === 2 && typeof v[0] === 'number' ? [Math.round(v[0] * k * 100) / 100, Math.round(v[1] * k * 100) / 100] : v.map(sc)) : v;
      const o = {}; for (const key in FORME) o[key] = key === 'echelle' ? FORME[key] : key === 'capitale' ? sc(FORME[key]) : Array.isArray(FORME[key]) ? FORME[key].map(it => it && it.pts ? { ...it, pts:sc(it.pts) } : sc(it)) : FORME[key];
      o.k = k; FORME = o;
    }
  } catch (e) { console.warn('Forme de la région indisponible', e); }
  return FORME;
}
if (GAME) chargeForme(GAME.region);

/* ---- masque : terre / région, une case de 4 m (lecture immédiate, sans calcul de polygone) ---- */
const MQ = 4;
function masqueForme() {
  if (masque || !FORME) return masque;
  const w = TW / MQ, h = TH / MQ, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), path = rings => { const p = new Path2D(); for (const r of rings) { p.moveTo(r[0][0] / MQ, r[0][1] / MQ); for (const q of r) p.lineTo(q[0] / MQ, q[1] / MQ); p.closePath(); } return p; };
  g.fillStyle = '#f00'; g.fill(path(FORME.terres), 'evenodd');                       // rouge : terre
  g.globalCompositeOperation = 'lighter'; g.fillStyle = '#0f0'; g.fill(path(FORME.region), 'evenodd'); // vert : région
  const d = g.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h);
  for (let i = 0; i < m.length; i++) m[i] = (d[i * 4] > 127 ? 1 : 0) | (d[i * 4 + 1] > 127 ? 2 : 0);
  return masque = { w, h, m };
}
const masqueAt = p => { const M = masqueForme(); if (!M) return 3; const x = Math.floor(p[0] / MQ), y = Math.floor(p[1] / MQ);
  return x < 0 || y < 0 || x >= M.w || y >= M.h ? 0 : M.m[y * M.w + x]; };
const surTerre = p => !FORME || (masqueAt(p) & 1) > 0;              // terre (pas la mer)
const dansRegion = p => !FORME || (masqueAt(p) & 3) === 3;          // la région elle-même (constructible)
// un tronçon reste-t-il sur la terre ? (échantillonné tous les 2 m)
function segSurTerre(a, b) {
  if (!FORME) return true;
  const n = Math.max(1, Math.ceil(segLen(a, b) / 2));
  for (let k = 0; k <= n; k++) if (!surTerre([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n])) return false;
  return true;
}

/* ---- génération d'après la forme : routes, fleuves et lacs réels ---- */
// route qui suit une vraie route (liste de points) : tronçons de 3 cases, orientés par pas de
// 10° (règles du zonage), 30° de virage au plus d'un tronçon au suivant ; elle s'arrête au bord
// de la carte, ou à la capitale voisine si elle est dans le cadre
function routeLeLongDe(line, virage = 30) {
  const angDiff = (a, b) => ((a - b) % 360 + 540) % 360 - 180;
  let p = line[0].slice(), k = 1, last = null;
  const pts = [p];
  for (let n = 0; n < 900; n++) {
    while (k < line.length - 1 && segLen(p, line[k]) < 48) k++;
    const aim = line[k];
    if (k === line.length - 1 && inTerrain(aim) && segLen(p, aim) < 3 * CELL) break;   // arrivée (capitale voisine)
    let deg = Math.round(Math.atan2(aim[1] - p[1], aim[0] - p[0]) * 18 / Math.PI) * 10;
    if (last !== null) { const d = angDiff(deg, last); if (Math.abs(d) > virage) deg = last + Math.sign(d) * virage; }
    deg = ((deg % 360) + 360) % 360;
    const q = goDeg(p, deg, 3 * CELL);
    if (!inTerrain(q)) {                                        // sortie de la carte : arrêt pile sur le bord
      const d = [Math.cos(deg * Math.PI / 180), Math.sin(deg * Math.PI / 180)];
      const tx = d[0] > 1e-9 ? (TW - p[0]) / d[0] : d[0] < -1e-9 ? -p[0] / d[0] : Infinity;
      const ty = d[1] > 1e-9 ? (TH - p[1]) / d[1] : d[1] < -1e-9 ? -p[1] / d[1] : Infinity;
      const e = goDeg(p, deg, Math.min(tx, ty));
      pts.push([Math.max(0, Math.min(TW, e[0])), Math.max(0, Math.min(TH, e[1]))]);
      break;
    }
    if (deg === last && pts.length > 1) pts[pts.length - 1] = q; else pts.push(q);
    p = q; last = deg;
  }
  return pts;
}
const CLASSE_FLEUVE = { 1:'fleuve', 2:'riviere' };               // (les autres : petite rivière)
function genereDepuisForme(biome, seed) {
  const F = FORME, rnd = seeded(seed * 31 + 7), cap = F.capitale.slice();
  S = {
    echelle:ECHELLE_TERRAIN, nextId:200, houses:[], walls:[], towers:[], gates:[], roads:[], rivers:[], lakes:[],
    biome, riverMode:'reel', landSeed:seed, reliefSeed:537, roadStyle:'reel',
    gold:5000, cut:[], planted:[], grown:[], simTime:0, bourg:[cap], forme:{ id:FORME_ID, v:FORMES_V },
  };
  // fleuves réels : tracé lissé, un point tous les 4 m ; largeur selon la taille du vrai fleuve
  F.fleuves.forEach((f, k) => {
    const cls = CLASSE_FLEUVE[f.cls] || 'petite', RC = RIVER_CLASS[cls];
    F.fl = F.fl || [];
    let all = F.fl[k] ? F.fl[k].pts : resample(chaikinOpen(resample(f.pts, 12), 3), 4), bouche = F.fl[k] ? F.fl[k].bouche : null;
    if (all.length < 4) return;
    // le fleuve s'arrête à la côte (le tracé réel se prolonge en mer et longe le rivage : tronçons parasites)
    if (!F.fl[k]) {
      const mer = all.findIndex(p => inTerrain(p) && !surTerre(p));
      if (mer >= 0 && mer < 8 && all.slice(0, mer + 1).every(inTerrain)) { F.fl[k] = { pts:[], drop:true }; return; }
      if (mer >= 8) { all = all.slice(0, mer + 3); bouche = mer - 1; }           // dernier point sur la terre
      F.fl[k] = { pts:all, bouche };
    }
    if (F.fl[k].drop) return;
    const rv = { pts:all, w0:RC.w0, w1:RC.w1, cls, nom:f.n };
    if (bouche != null) rv.bouche = bouche;
    rv.isles = placeIsles(rv, seeded(seed * 13 + 5 + k * 10));
    S.rivers.push(rv);
  });
  carveRivieres();                                                  // les fleuves remplacent la terre par la mer (voir plus bas)
  // lacs réels : contour régulier (un point tous les 10 m, 160 au plus), centre = barycentre
  for (const ring of F.lacs) {
    let per = 0; for (let i = 0; i < ring.length; i++) per += segLen(ring[i], ring[(i + 1) % ring.length]);
    const pts = resample([...ring, ring[0]], Math.max(10, per / 160)).slice(0, -1);
    if (pts.length < 6) continue;
    const c = pts.reduce((a, q) => [a[0] + q[0] / pts.length, a[1] + q[1] / pts.length], [0, 0]).map(round2);
    S.lakes.push({ c, pts });
  }
  // routes (après l'eau) : écartées des fleuves ; la plus longue part de la capitale (grande route
  // pavée), les autres partent du même point (un bout de route : raccord permis), en gravier
  const capR = riveDe(cap), c0 = capR && capR.d < capR.hw + RIVE ? rivePoussee(capR, capR.side) : cap;
  S.bourg = [c0.map(Math.round)];
  const lines = F.routes.map(r => routeLeLongDe(ecarteDesFleuves([c0, ...r.pts.slice(1)], capR ? capR.side : 1)))
    .filter(p => p.length > 1 && roadLen({ pts:p }) > 3 * CELL).sort((a, b) => roadLen({ pts:b }) - roadLen({ pts:a }));
  /* Les routes vers les capitales voisines partent toutes de la capitale et se chevauchaient sur quelques mètres avant de
     se séparer (faisceau raté). Chaque route secondaire se détache maintenant de la principale à l'endroit où elle s'en
     écarte vraiment (3 cases) : un embranchement net, posé sur la principale. */
  const dLigne = (p, L) => { let d = Infinity; for (let i = 0; i < L.length - 1; i++) d = Math.min(d, ptSeg(p, L[i], L[i + 1]).d); return d; };
  const proche = (p, L) => { let b = { d:Infinity, q:null }; for (let i = 0; i < L.length - 1; i++) { const t = ptSeg(p, L[i], L[i + 1]); if (t.d < b.d) b = t; } return b.q; };
  for (let n = 1; n < lines.length; n++) {
    const P = lines[n]; let k = 1;
    while (k < P.length && dLigne(P[k], lines[0]) < 3 * CELL) k++;
    if (k >= P.length || k < 2) continue;                        // reste collée à la principale, ou part tout de suite ailleurs : inchangée
    lines[n] = [proche(P[k - 1], lines[0]), ...P.slice(k)];
  }
  lines.forEach((pts, i) => S.roads.push({ id:i + 1, kind:i ? 'gravier' : 'pave', w:CELL, pts }));
  if (!S.roads.length) {                                        // région sans route (île…) : un chemin de la capitale vers l'intérieur
    const dir = [TW / 2 - c0[0], TH / 2 - c0[1]], L = Math.hypot(...dir) || 1;
    const pts = routeLeLongDe(ecarteDesFleuves([c0, [c0[0] + dir[0] / L * 400, c0[1] + dir[1] / L * 400]], capR ? capR.side : 1));
    if (pts.length > 1) S.roads.push({ id:1, kind:'terre', w:CELL, pts });
  }
  /* Règle des lacs (LAC_DIST, eau.js) : un lac réel trop près d'une route, d'un fleuve, de la mer ou d'un autre lac est retiré
     (les plus grands d'abord) : aucun lac ne touche rien. */
  const lacs = S.lakes.sort((a, b) => { const A = bbox(a.pts), B = bbox(b.pts); return (B[2] - B[0]) * (B[3] - B[1]) - (A[2] - A[0]) * (A[3] - A[1]); });
  S.lakes = [];
  for (const lk of lacs) { S.lakes.push(lk); if (!lacLibre(lk)) S.lakes.pop(); }
  computeZones();
  S.deposits = placeDeposits(seed);
  S.ressources = placeFruitiers(seed, fruitiersDuBiome(S.biome, seed));      // (les arbres fruitiers d'origine de ce biome)
}
/* Une vraie route, mise à l'échelle, frôle ou suit souvent un fleuve (la vallée du Nil…) : on
   l'écarte des berges (demi-largeur + 28 m), en gardant la rive où elle est. Quand elle change
   de rive, elle traverse d'un coup (pont franc) ; les allers-retours de moins de ~190 m sont
   ignorés (la route reste sur sa rive). */
const RIVE = 28;
function riveDe(p) {
  let best = null;
  for (const rv of S.rivers) {
    const P = rv.pts, HW = riverHW(rv);
    for (let i = 0; i < P.length - 1; i += 2) {
      const j = Math.min(P.length - 1, i + 2), t = ptSeg(p, P[i], P[j]), hw = Math.max(HW[i], HW[j]);
      if (best && t.d - hw >= best.d - best.hw) continue;
      const L = segLen(P[i], P[j]) || 1, n = [-(P[j][1] - P[i][1]) / L, (P[j][0] - P[i][0]) / L];
      best = { d:t.d, q:t.q, n, hw, side:Math.sign((p[0] - t.q[0]) * n[0] + (p[1] - t.q[1]) * n[1]) || 1 };
    }
  }
  return best;
}
const rivePoussee = (r, side) => [round2(r.q[0] + r.n[0] * side * (r.hw + RIVE)), round2(r.q[1] + r.n[1] * side * (r.hw + RIVE))];
function ecarteDesFleuves(line, side0) {
  if (!S.rivers.length) return line;
  const P = resample(line, 16), info = P.map(riveDe);
  const near = P.map((_, k) => k > 0 && info[k] && info[k].d < info[k].hw + RIVE);
  const idx = near.map((v, k) => v ? k : -1).filter(k => k >= 0), side = idx.map(k => info[k].side);
  // rives : les suites de moins de 12 points proches (~190 m) prennent la rive précédente
  let prev = side0;
  for (let a = 0; a < side.length;) {
    let b = a; while (b + 1 < side.length && side[b + 1] === side[a] && idx[b + 1] === idx[b] + 1) b++;
    if (b - a + 1 < 12) for (let k = a; k <= b; k++) side[k] = prev;
    prev = side[b]; a = b + 1;
  }
  const out = P.slice(); out[0] = line[0];
  idx.forEach((k, m) => { out[k] = rivePoussee(info[k], side[m]); });
  return out;
}

/* ---- dessin : mer, voile sur les terres voisines, frontière ---- */
function cheminAnneaux(rings, path = new Path2D()) {
  for (const r of rings) { r.forEach((q, i) => { const [X, Y] = toS(q[0], q[1]); i ? path.lineTo(X, Y) : path.moveTo(X, Y); }); path.closePath(); }
  return path;
}
function cadreEtAnneaux(rings) { const p = new Path2D(), [tx, ty] = toS(0, 0); p.rect(tx, ty, TW * view.s, TH * view.s); return cheminAnneaux(rings, p); }
// dégradé léger de la mer : bandes plus claires vers la côte (à appeler avec la mer en clip)
function seaBands(coast, foam, edge) {
  const sea0 = biomeLook().water || Col.water, bw = Math.max(2, Math.min(5 * view.s, 14));
  ctx.lineJoin = 'round';
  for (let i = WATER_BANDS + 1; i >= 1; i--) { ctx.strokeStyle = mixWater(sea0, .09 * (WATER_BANDS + 2 - i)); ctx.lineWidth = (foam + edge + bw * i) * 2; ctx.stroke(coast); }
}
/* Fleuves = mer. Comme sur le globe (regions-water.topojson), la terre est CREUSÉE à la place de chaque fleuve : le contour des terres de DESSIN (FORME.terresDessin)
   passe de chaque côté du fleuve, et la mer se peint là, avec son rivage, son écume et son dégradé : un fleuve et la mer ne font qu'une seule eau, sans raccord.
   Les îles de fleuve restent de la terre. Le masque terre/mer (surTerre, routes, bateaux, forêts) garde l'ancien contour (FORME.terres) : on peut toujours franchir un fleuve
   par un pont. Méthode : la terre et les fleuves sont tracés dans une image de 2 m par pixel, puis le contour de la terre en est extrait (marching squares), simplifié et lissé. */
function carveRivieres() {
  if (!FORME) return;
  const key = FORME_ID + ':' + S.rivers.map(r => r.pts.length + ',' + r.pts[0] + ',' + r.w0 + ',' + r.w1 + ',' + (r.isles || []).length).join('|');
  if (FORME.carveKey === key) return;
  FORME.carveKey = key;
  if (!S.rivers.length) { FORME.terresDessin = null; return; }
  const P = 2, w = Math.ceil(TW / P), h = Math.ceil(TH / P), c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently:true }), poly = (rings, k) => { const p = new Path2D(); for (const r of rings) { p.moveTo(r[0][0] / k, r[0][1] / k); for (const q of r) p.lineTo(q[0] / k, q[1] / k); p.closePath(); } return p; };
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.fill(poly(FORME.terres, P), 'evenodd');          // terre en blanc
  g.fillStyle = '#000';
  for (const rv of S.rivers) for (const [x, y, r] of riverDiscs(rv)) { g.beginPath(); g.arc(x / P, y / P, Math.max(.5, r / P), 0, Math.PI * 2); g.fill(); }   // fleuves : disques le long du cours
  g.fillStyle = '#fff';
  for (const rv of S.rivers) for (const is of riverIsles(rv)) if (surTerre([(is.bb[0] + is.bb[2]) / 2, (is.bb[1] + is.bb[3]) / 2])) g.fill(poly([is.P], P));                                    // les îles restent de la terre
  const d = g.getImageData(0, 0, w, h).data, PN = 3, W2 = w + 2 * PN, H2 = h + 2 * PN, m = new Uint8Array(W2 * H2);
  for (let j = 1; j < H2 - 1; j++) for (let i = 1; i < W2 - 1; i++) { const ii = Math.max(0, Math.min(w - 1, i - PN)), jj = Math.max(0, Math.min(h - 1, j - PN)); m[j * W2 + i] = d[(jj * w + ii) * 4] > 127 ? 1 : 0; }   // (bords prolongés de 2 pixels, puis un cadre vide : les contours se ferment hors du terrain, aucun rivage le long du cadre)
  // marching squares : un segment par case de 2 × 2 échantillons, entre milieux d'arêtes (clés entières en demi-pixels)
  const next = new Map(), key2 = (x, y) => x * 100003 + y;
  const add = (x1, y1, x2, y2) => { const a = key2(x1, y1); (next.get(a) || next.set(a, []).get(a)).push([x2, y2]); const b = key2(x2, y2); (next.get(b) || next.set(b, []).get(b)).push([x1, y1]); };
  for (let j = 0; j < H2 - 1; j++) for (let i = 0; i < W2 - 1; i++) {
    const a = m[j * W2 + i], b = m[j * W2 + i + 1], cc = m[(j + 1) * W2 + i + 1], dd = m[(j + 1) * W2 + i], code = a | b << 1 | cc << 2 | dd << 3;
    if (code === 0 || code === 15) continue;
    const X = 2 * i, Y = 2 * j, T = [X + 1, Y], R = [X + 2, Y + 1], B = [X + 1, Y + 2], L = [X, Y + 1], seg = (p, q) => add(p[0], p[1], q[0], q[1]);
    switch (code) {
      case 1: case 14: seg(L, T); break; case 2: case 13: seg(T, R); break; case 3: case 12: seg(L, R); break; case 4: case 11: seg(R, B); break;
      case 6: case 9: seg(T, B); break; case 7: case 8: seg(L, B); break; case 5: seg(L, T); seg(R, B); break; case 10: seg(T, R); seg(L, B); break;
    }
  }
  // chaînage des segments en anneaux fermés
  const rings = [], used = new Set();
  for (const [k0, nb] of next) {
    if (used.has(k0)) continue;
    const x0 = Math.floor(k0 / 100003), y0 = k0 - x0 * 100003, ring = [[x0, y0]]; used.add(k0);
    let cur = [x0, y0], prev = null;
    for (let guard = 0; guard < 4e6; guard++) {
      const opts = next.get(key2(cur[0], cur[1])), nx = opts.find(o => !prev || o[0] !== prev[0] || o[1] !== prev[1]) || opts[0];
      if (!nx || key2(nx[0], nx[1]) === k0) break;
      const kk = key2(nx[0], nx[1]); if (used.has(kk)) break; used.add(kk); ring.push(nx); prev = cur; cur = nx;
    }
    if (ring.length > 8) rings.push(ring);
  }
  // en mètres ; simplification (Douglas-Peucker, 0,9 m) puis deux passes de lissage : plus d'escalier de pixels
  const dp = (pts, eps) => {
    const out = [], stack = [[0, pts.length - 1]], keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
    while (stack.length) { const [a, b] = stack.pop(); let md = 0, mi = -1; const A = pts[a], B = pts[b], L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
      for (let i = a + 1; i < b; i++) { const dd = Math.abs((B[0] - A[0]) * (A[1] - pts[i][1]) - (A[0] - pts[i][0]) * (B[1] - A[1])) / L; if (dd > md) { md = dd; mi = i; } }
      if (mi >= 0 && md > eps) { keep[mi] = 1; stack.push([a, mi], [mi, b]); } }
    for (let i = 0; i < pts.length; i++) if (keep[i]) out.push(pts[i]);
    return out;
  };
  const chaikin = P2 => { const o = []; for (let i = 0; i < P2.length; i++) { const a = P2[i], b = P2[(i + 1) % P2.length]; o.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); } return o; };
  FORME.terresDessin = rings.map(r => { let q = r.map(([x, y]) => [(x / 2 - PN + .5) * P, (y / 2 - PN + .5) * P]); q = dp(q, .9); if (q.length < 4) return null; return chaikin(chaikin(q)).map(p => [round2(p[0]), round2(p[1])]); }).filter(r => { if (!r) return false; let A = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; A += p[0] * q[1] - q[0] * p[1]; } return Math.abs(A) / 2 > 120; });   // (on jette les miettes : îlots et trous de moins de 120 m²)
}

function drawMouths() {}                                             // (les fleuves sont creusés dans le contour des terres : rien à repeindre)
// mer : tout le cadre hors des terres ; rivage : liseré d'écume côté mer, puis la berge
function drawSea() {
  if (!FORME) return;
  const dessin = FORME.terresDessin || FORME.terres, sea = cadreEtAnneaux(dessin), coast = cheminAnneaux(dessin), s = view.s;
  const foam = Math.max(1.2, Math.min(3, s * .9)), edge = 1.5;
  const [tx, ty] = toS(0, 0);
  ctx.save(); ctx.beginPath(); ctx.rect(tx, ty, TW * s, TH * s); ctx.clip();       // (rien hors du terrain)
  ctx.save();
  ctx.fillStyle = biomeLook().water || Col.water; ctx.fill(sea, 'evenodd');
  ctx.clip(sea, 'evenodd');
  seaBands(coast, foam, edge);
  ctx.strokeStyle = WATER_FOAM; ctx.lineWidth = (foam + edge) * 2; ctx.stroke(coast);
  ctx.restore();
  ctx.strokeStyle = Col['water-edge']; ctx.lineWidth = edge * 2; ctx.lineJoin = 'round'; ctx.stroke(coast);
  ctx.restore();
}
// frontière de la région, sans les tronçons qui longent la mer (la mer n'est pas un voisin) : suites de points, calculées une fois par région
let frontCache = { id:null, runs:null };
const surRiviere = p => Z.water.river.some(q => p[0] >= q.bb[0] && p[0] <= q.bb[2] && p[1] >= q.bb[1] && p[1] <= q.bb[3] && inPoly(p, q.P));
function frontiereTerrestre() {
  const ck = FORME_ID + ':' + Z.water.river.length + ':' + S.landSeed;
  if (frontCache.id === ck && frontCache.runs) return frontCache.runs;
  const runs = [];
  for (const ring of FORME.region) {
    let run = [];
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 6));
      for (let t = 0; t < n; t++) {
        const p = [a[0] + (b[0] - a[0]) * t / n, a[1] + (b[1] - a[1]) * t / n];
        if (surRiviere(p) || SEA_DIRS.some(([dx, dy]) => !surTerre([p[0] + dx * 8, p[1] + dy * 8]))) { if (run.length > 1) runs.push(run); run = []; } else run.push(p);
      }
    }
    if (run.length > 1) runs.push(run);
  }
  frontCache = { id:ck, runs };
  return runs;
}
// hors de la région : terres voisines voilées (on n'y construit pas), frontière en pointillés
function drawBorder() {
  if (!FORME) return;
  const out = cadreEtAnneaux(FORME.region), land = cheminAnneaux(FORME.terresDessin || FORME.terres), front = new Path2D();
  for (const run of frontiereTerrestre()) run.forEach((p, i) => { const [X, Y] = toS(p[0], p[1]); i ? front.lineTo(X, Y) : front.moveTo(X, Y); });
  ctx.save(); ctx.clip(land, 'evenodd');
  ctx.globalAlpha = .45; ctx.fillStyle = Col.sheet; ctx.fill(out, 'evenodd');
  ctx.restore();
  ctx.save(); ctx.clip(land, 'evenodd');
  ctx.setLineDash([10, 6]); ctx.strokeStyle = Col.ink; ctx.globalAlpha = .75; ctx.lineWidth = 2; ctx.stroke(front);
  ctx.restore();
}
// les rivières ne se dessinent que sur la terre (à leur embouchure, la mer prend le relais)
function clipTerre() { if (FORME) ctx.clip(cheminAnneaux(FORME.terresDessin || FORME.terres), 'evenodd'); }
