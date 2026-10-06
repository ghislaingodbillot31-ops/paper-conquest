/* ---------- forme réelle de la région (data/regions/formes.json) ----------
   Le terrain n'est plus un rectangle vide : il a la forme de la région du globe, mise à
   l'échelle (outils/build-formes.js). On y trouve la région (seule constructible), les terres
   voisines (voilées, derrière la frontière en pointillés), la mer si la région est côtière,
   les vrais fleuves, les vrais lacs et les vraies routes vers les capitales voisines.
   Sans forme (éditeur sans région choisie, page d'essai), le terrain reste un rectangle. */
let FORME = null, FORME_ID = null, FORMES = null, masque = null;
const FORMES_V = 4;                                  // monter pour que les cartes de région déjà enregistrées soient régénérées par le générateur à jour
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
    nextId:200, houses:[], walls:[], towers:[], gates:[], roads:[], rivers:[], lakes:[],
    biome, riverMode:'reel', landSeed:seed, reliefSeed:537, roadStyle:'reel',
    gold:5000, cut:[], planted:[], grown:[], simTime:0, bourg:[cap], forme:{ id:FORME_ID, v:FORMES_V },
  };
  // fleuves réels : tracé lissé, un point tous les 4 m ; largeur selon la taille du vrai fleuve
  F.fleuves.forEach((f, k) => {
    const cls = CLASSE_FLEUVE[f.cls] || 'petite', RC = RIVER_CLASS[cls];
    const all = resample(chaikinOpen(resample(f.pts, 12), 3), 4);
    if (all.length < 4) return;
    const rv = { pts:all, w0:RC.w0, w1:RC.w1, cls, nom:f.n };
    rv.isles = placeIsles(rv, seeded(seed * 13 + 5 + k * 10));
    S.rivers.push(rv);
  });
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
// embouchures : le trait de côte (écume, berge) ne coupe pas la rivière. Autour de chaque disque de rivière posé sur la
// côte, on repeint la mer sans liseré, sur la largeur exacte de la rivière : l'eau de la rivière rejoint celle de la mer.
function drawMouths() {
  if (!FORME || !S.rivers.length) return;
  const s = view.s, mouth = new Path2D(); let any = false;
  for (const rv of S.rivers) for (const [x, y, r] of bandDiscs(rv, 1)) {
    const R = r + 3;
    if (SEA_DIRS.every(([dx, dy]) => surTerre([x + dx * R, y + dy * R]))) continue;      // loin de la mer
    const X = x * s + view.ox, Y = y * s + view.oy, rr = Math.max(r * s, 1.3) + 1;
    mouth.moveTo(X + rr, Y); mouth.arc(X, Y, rr, 0, Math.PI * 2); any = true;
  }
  if (!any) return;
  const sea = cadreEtAnneaux(FORME.terres), coast = cheminAnneaux(FORME.terres), foam = Math.max(1.2, Math.min(3, s * .9)), edge = 1.5;
  ctx.save(); ctx.clip(mouth); ctx.clip(sea, 'evenodd');
  ctx.fillStyle = biomeLook().water || Col.water; ctx.fill(sea, 'evenodd');
  seaBands(coast, foam, edge);
  ctx.restore();
}
// mer : tout le cadre hors des terres ; rivage : liseré d'écume côté mer, puis la berge
function drawSea() {
  if (!FORME) return;
  const sea = cadreEtAnneaux(FORME.terres), coast = cheminAnneaux(FORME.terres), s = view.s;
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
// hors de la région : terres voisines voilées (on n'y construit pas), frontière en pointillés
function drawBorder() {
  if (!FORME) return;
  const out = cadreEtAnneaux(FORME.region), land = cheminAnneaux(FORME.terres), front = cheminAnneaux(FORME.region);
  ctx.save(); ctx.clip(land, 'evenodd');
  ctx.globalAlpha = .45; ctx.fillStyle = Col.sheet; ctx.fill(out, 'evenodd');
  ctx.restore();
  ctx.save(); ctx.clip(land, 'evenodd');
  ctx.setLineDash([10, 6]); ctx.strokeStyle = Col.ink; ctx.globalAlpha = .75; ctx.lineWidth = 2; ctx.stroke(front);
  ctx.restore();
}
// les rivières ne se dessinent que sur la terre (à leur embouchure, la mer prend le relais)
function clipTerre() { if (FORME) ctx.clip(cheminAnneaux(FORME.terres), 'evenodd'); }
