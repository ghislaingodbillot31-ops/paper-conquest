/* ---------- forme réelle de la région (data/regions/formes.json) ----------
   Le terrain n'est plus un rectangle vide : il a la forme de la région du globe, mise à
   l'échelle (outils/build-formes.js). On y trouve la région (seule constructible), les terres
   voisines (voilées, derrière la frontière en pointillés), la mer si la région est côtière,
   les vrais fleuves, les vrais lacs et les vraies routes vers les capitales voisines.
   Sans forme (éditeur sans région choisie, page d'essai), le terrain reste un rectangle. */
let FORME = null, FORME_ID = null, masque = null;
const FORMES_V = 16;                                 // monter pour que les cartes de région déjà enregistrées soient régénérées par le générateur à jour
// à chaque nouvelle version, les cartes de région enregistrées (et le plan de l'éditeur) sont supprimées : elles repartent du générateur à jour
try { if (localStorage.getItem('regionsGenV') !== String(FORMES_V)) {
  Object.keys(localStorage).filter(k => k.startsWith('dominiumRegionMap.') || k === 'editeurCarte.v1').forEach(k => localStorage.removeItem(k));
  localStorage.setItem('regionsGenV', String(FORMES_V)); } } catch (e) {}
// La carte est construite dès le chargement de la page (scripts synchrones) : le fichier des
// formes est lu d'un bloc, une seule fois (le navigateur le garde en cache ensuite).
function chargeForme(id) {
  FORME = null; FORME_ID = id || null; masque = null;
  if (!id) return null;
  try {
    const x = new XMLHttpRequest(); x.open('GET', 'data/regions/formes/' + id + '.json', false); x.send();   // (un fichier par région : seule celle qu'on joue est chargée)
    FORME = x.status === 200 || x.status === 0 ? JSON.parse(x.responseText) : null;
    // le fichier est à l'échelle ECHELLE_FORMES (3) ; le terrain a maintenant ECHELLE_TERRAIN : toutes les coordonnées sont ramenées à la bonne taille (copie, le fichier lu reste intact)
    if (FORME && !FORME.k && FORME.terrain && Math.abs(TW - FORME.terrain[0]) > 1) {
      const k = TW / FORME.terrain[0], sc = v => Array.isArray(v) ? (v.length === 2 && typeof v[0] === 'number' ? [Math.round(v[0] * k * 100) / 100, Math.round(v[1] * k * 100) / 100] : v.map(sc)) : v;
      const o = {}; for (const key in FORME) o[key] = key === 'echelle' ? FORME[key] : key === 'capitale' ? sc(FORME[key]) : Array.isArray(FORME[key]) ? FORME[key].map(it => it && it.pts ? { ...it, pts:sc(it.pts) } : sc(it)) : FORME[key];
      o.k = k; FORME = o;
    }
  } catch (e) { console.warn('Forme de la région indisponible', e); }
  return FORME;
}
if (GAME) chargeForme(GAME.region);

/* ---- masque : terre / région, une case de 4 m (lecture immédiate, sans calcul de polygone) ---- */
const MQ = 4;
const aireAnneau = r => r.reduce((A, p, i) => { const q = r[(i + 1) % r.length]; return A + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;   // (signée : positive si le contour tourne dans le sens direct)
const anneauxPath = (rings, k) => { const p = new Path2D(); for (const r of rings) { p.moveTo(r[0][0] / k, r[0][1] / k); for (const q of r) p.lineTo(q[0] / k, q[1] / k); p.closePath(); } return p; };   // contours en mètres → chemin en pixels (k m par pixel)
function procheDe(p, L) { let b = { d:Infinity, q:null }; for (let i = 0; i < L.length - 1; i++) { const t = ptSeg(p, L[i], L[i + 1]); if (t.d < b.d) b = t; } return b; }   // point le plus proche de p sur la ligne L : { d, q }
function masqueForme() {
  if (masque || !FORME) return masque;
  const w = TW / MQ, h = TH / MQ, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently:true });
  g.fillStyle = '#f00'; g.fill(anneauxPath(FORME.terres, MQ), 'evenodd');                       // rouge : terre
  g.globalCompositeOperation = 'lighter'; g.fillStyle = '#0f0'; g.fill(anneauxPath(FORME.region, MQ), 'evenodd'); // vert : région
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
/* Route de ceinture d'une île : le contour de la terre qui porte la capitale, décalé vers l'intérieur de COTE_DIST m, lissé ; seul le plus long tronçon qui reste à terre, hors fleuve et à bonne distance
   de la côte est gardé (les baies étroites l'interrompent). Retourne les points, ou null. */
const COTE_DIST = 70;
function routeCotiere(c0) {
  const aire = aireAnneau;
  const ring = ((FORME && FORME.terres) || []).filter(r => r.length > 8 && inPoly(c0, r)).sort((a, b) => Math.abs(aire(b)) - Math.abs(aire(a)))[0];
  if (!ring) return null;
  const R = resample([...ring, ring[0]], 24).slice(0, -1), n = R.length, sg = Math.sign(aire(ring)) || 1;
  let P = R.map((p, i) => { const a = R[(i + n - 1) % n], b = R[(i + 1) % n], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1; return [p[0] - ty / l * sg * COTE_DIST, p[1] + tx / l * sg * COTE_DIST]; });
  for (let k = 0; k < 4; k++) P = P.map((p, i) => { let x = 0, y = 0; for (let d = -2; d <= 2; d++) { const q = P[(i + d + n) % n]; x += q[0]; y += q[1]; } return [x / 5, y / 5]; });   // (les coins des baies sont arrondis)
  const bon = P.map(p => inTerrain(p) && surTerre(p) && R.every(q => segLen(p, q) > COTE_DIST * .7));
  let start = bon.indexOf(false); start = start < 0 ? 0 : start + 1;
  let best = [], cur = [];
  for (let k = 0; k <= n; k++) {
    const i = (start + k) % n;
    if (k < n && bon[i]) cur.push(P[i].map(round2)); else { if (cur.length > best.length) best = cur; cur = []; }
  }
  if (bon.every(Boolean)) best.push(best[0]);                                                                    // (île entière : la boucle est fermée)
  return best.length * 24 > 6 * CELL ? best : null;
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
    let all = F.fl[k] ? F.fl[k].pts : resample(chaikinOpen(resample(f.pts, 24), 4), 4), bouche = F.fl[k] ? F.fl[k].bouche : null;
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
    S.rivers.push(rv); rv.k = k;
  });
  /* Raccord des cours d'eau : un bout de fleuve qui s'arrête près d'un autre cours (moins de 90 m) est prolongé jusqu'à lui, en courbe : il arrive tangent à sa propre direction puis vient
     se fondre dans l'autre cours (courbe de Bézier), sans angle ni coin à la confluence. Les points sont tous les 4 m, comme le reste du tracé. */
  for (const rv of S.rivers) {
    for (const bout of [1, 0]) {
      const P = rv.pts, e = bout ? P[P.length - 1] : P[0], v = bout ? P[P.length - 2] : P[1];
      let best = { d:90 };
      for (const o of S.rivers) if (o !== rv) for (let i = 0; i < o.pts.length - 1; i++) { const r = ptSeg(e, o.pts[i], o.pts[i + 1]); if (r.d < best.d) best = r; }
      if (best.d < 1.5 || best.d >= 90) continue;
      const dl = segLen(e, v) || 1, tx = (e[0] - v[0]) / dl, ty = (e[1] - v[1]) / dl, k = best.d * .6, ctl = [e[0] + tx * k, e[1] + ty * k];   // (le point de contrôle prolonge la direction du cours)
      const n = Math.ceil(best.d / 4), ext = [];
      for (let j = 1; j <= n; j++) { const u = j / n, w = 1 - u; ext.push([round2(w * w * e[0] + 2 * w * u * ctl[0] + u * u * best.q[0]), round2(w * w * e[1] + 2 * w * u * ctl[1] + u * u * best.q[1])]); }
      rv.pts = bout ? [...P, ...ext] : [...ext.reverse(), ...P];
    }
  }
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
  const capR = riveDe(cap), c0 = capR && capR.d < capR.hw + riveMarge() ? rivePoussee(capR, capR.side) : cap;
  S.bourg = [c0.map(Math.round)];
  const lines = F.routes.map(r => redresserPonts(routeLeLongDe(ecarteDesFleuves([c0, ...r.pts.slice(1)], capR ? capR.side : 1))))
    .filter(p => p.length > 1 && roadLen({ pts:p }) > 3 * CELL).sort((a, b) => roadLen({ pts:b }) - roadLen({ pts:a }));
  /* Les routes vers les capitales voisines partent toutes de la capitale et se chevauchaient sur quelques mètres avant de
     se séparer (faisceau raté). Chaque route secondaire se détache maintenant de la principale à l'endroit où elle s'en
     écarte vraiment (3 cases) : un embranchement net, posé sur la principale. */
  const dLigne = (p, L) => procheDe(p, L).d, proche = (p, L) => procheDe(p, L).q;
  for (let n = 1; n < lines.length; n++) {
    const P = lines[n]; let k = 1;
    while (k < P.length && dLigne(P[k], lines[0]) < 3 * CELL) k++;
    if (k >= P.length || k < 2) continue;                        // reste collée à la principale, ou part tout de suite ailleurs : inchangée
    // une fourche ne repart pas en épingle le long de la principale : elle quitte la principale à 30° au moins (sinon on saute ses premiers points)
    const sin30 = Math.sin(Math.PI / 6);
    for (; k < P.length - 1; k++) {
      let t = { d:Infinity }; for (let i = 0; i < lines[0].length - 1; i++) { const u = ptSeg(P[k - 1], lines[0][i], lines[0][i + 1]); if (u.d < t.d) t = { ...u, a:lines[0][i], b:lines[0][i + 1] }; }   // (le tronçon de la principale le plus proche)
      const q = t.q, tl = segLen(t.a, t.b) || 1, bl = segLen(q, P[k]) || 1;
      if (Math.abs(((t.b[0] - t.a[0]) * (P[k][1] - q[1]) - (t.b[1] - t.a[1]) * (P[k][0] - q[0])) / (tl * bl)) >= sin30) break;
    }
    lines[n] = [proche(P[k - 1], lines[0]), ...P.slice(k)];
  }
  lines.forEach((pts, i) => S.roads.push({ id:i + 1, kind:i ? 'gravier' : 'pave', w:CELL, pts }));
  if (!S.roads.length) {                                        // région sans route (île…) : une route de ceinture le long de la côte, et une branche depuis la capitale
    const ceinture = routeCotiere(c0);
    if (ceinture) {
      const anneau = redresserPonts(ceinture);
      S.roads.push({ id:1, kind:'pave', w:CELL, pts:anneau });
      const A = proche(c0, anneau);
      if (A && segLen(c0, A) > 2 * CELL) { const branche = redresserPonts(resample([c0, A], 12)); S.roads.push({ id:2, kind:'gravier', w:CELL, pts:[...branche.slice(0, -1), A] }); }
    }
  }
  if (!S.roads.length) {                                        // (sans côte exploitable : un chemin de la capitale vers l'intérieur)
    const dir = [TW / 2 - c0[0], TH / 2 - c0[1]], L = Math.hypot(...dir) || 1;
    const pts = redresserPonts(routeLeLongDe(ecarteDesFleuves([c0, [c0[0] + dir[0] / L * 400, c0[1] + dir[1] / L * 400]], capR ? capR.side : 1)));
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
   l'écarte des berges (demi-largeur + route_rive), en gardant la rive où elle est. Quand elle change
   de rive, elle traverse (pont, redressé ensuite par redresserPonts) ; les allers-retours de moins de ~190 m sont
   ignorés (la route reste sur sa rive). */
/* PONTS DROITS. Les routes de région suivent une grille de directions (routeLeLongDe : pas de 10°, virages de 30° au plus) : un pont pouvait donc traverser en biais, avec des courbes qui
   gonflent aux deux bouts. Pour chaque traversée d'une rivière, la route est refaite : un pont DROIT et PERPENDICULAIRE au cours d'eau (axe = la normale de la rivière au point de passage),
   précédé et suivi de pont_droit mètres de route dans le même axe, raccordés au reste du tracé par une courbe douce (Bézier cubique tangente à la route d'origine et à l'axe du pont). Règles : regles.js (pont_droit, pont_marge). */
function redresserPonts(line) {
  if (!S.rivers.length || line.length < 3) return line;
  const L = typeof regle === 'function' ? regle('pont_droit') : 40, M = typeof regle === 'function' ? regle('pont_marge') : 12;
  const unit = (a, b) => { const l = segLen(a, b) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
  const bez = (p0, d0, p1, d1) => {                                   // courbe de p0 (cap d0) à p1 (cap d1), tangente aux deux bouts (Bézier cubique) : jamais de coin au raccord
    const D = segLen(p0, p1), k = D * .4, c1 = [p0[0] + d0[0] * k, p0[1] + d0[1] * k], c2 = [p1[0] - d1[0] * k, p1[1] - d1[1] * k], n = Math.max(4, Math.ceil(D / 10)), out = [];
    for (let i = 0; i <= n; i++) { const u = i / n, w = 1 - u, a = w * w * w, b = 3 * w * w * u, e = 3 * w * u * u, f = u * u * u; out.push([round2(a * p0[0] + b * c1[0] + e * c2[0] + f * p1[0]), round2(a * p0[1] + b * c1[1] + e * c2[1] + f * p1[1])]); }
    return out;
  };
  let P = resample(line, 12); const faits = [];
  for (let tour = 0; tour < 8; tour++) {
    const eau = P.map(p => { const r = riveDe(p); return r && r.d < r.hw ? r : null; });
    let a = 0, trouve = false;
    while (a < P.length && !trouve) {
      if (!eau[a]) { a++; continue; }
      let b = a; while (b + 1 < P.length && eau[b + 1]) b++;
      const r = eau[Math.floor((a + b) / 2)];
      if (faits.some(q => segLen(q, r.q) < r.hw + 20)) { a = b + 1; continue; }
      faits.push(r.q);
      const reach = r.hw + M + L, lpre = reach + 30, n = r.n, sA = Math.sign((P[a][0] - r.q[0]) * n[0] + (P[a][1] - r.q[1]) * n[1]) || 1;
      let ia = a - 1; while (ia > 0 && segLen(P[ia], r.q) < lpre) ia--;
      let ib = b + 1; while (ib < P.length - 1 && segLen(P[ib], r.q) < lpre) ib++;
      const A = [round2(r.q[0] + n[0] * sA * reach), round2(r.q[1] + n[1] * sA * reach)], B = [round2(r.q[0] - n[0] * sA * reach), round2(r.q[1] - n[1] * sA * reach)];
      if (ia < 1 || ib > P.length - 2 || segLen(P[ia], r.q) < reach + 6 || segLen(P[ib], r.q) < reach + 6 || !inTerrain(A) || !inTerrain(B)) { a = b + 1; continue; }   // (traversée au bord de la carte : laissée telle quelle)
      const ax = unit(A, B), d0 = unit(P[ia - 1], P[ia]), d2 = unit(P[ib], P[ib + 1]), net = unit(P[ia], P[ib]);
      // traversée trop en biais : le pont droit ferait faire un V à la route (plusieurs ponts) → laissée telle quelle, un seul pont
      if (ax[0] * net[0] + ax[1] * net[1] < .7 || ax[0] * d0[0] + ax[1] * d0[1] < .5 || ax[0] * d2[0] + ax[1] * d2[1] < .5) { a = b + 1; continue; }
      const entree = bez(P[ia], d0, A, ax), sortie = bez(P[ib], [-d2[0], -d2[1]], B, [-ax[0], -ax[1]]).reverse();   // (la sortie est calculée depuis la route d'après, puis retournée)
      const pont = []; const nb = Math.max(1, Math.ceil(segLen(A, B) / 12)); for (let i = 1; i < nb; i++) pont.push([round2(A[0] + (B[0] - A[0]) * i / nb), round2(A[1] + (B[1] - A[1]) * i / nb)]);
      P = [...P.slice(0, ia), ...entree, ...pont, ...sortie, ...P.slice(ib + 1)];
      trouve = true;
    }
    if (!trouve) break;
  }
  return P;
}
const riveMarge = () => typeof regle === 'function' ? regle('route_rive') : 28;   // distance route ↔ berge (règle réglable, regles.js)
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
const rivePoussee = (r, side) => [round2(r.q[0] + r.n[0] * side * (r.hw + riveMarge())), round2(r.q[1] + r.n[1] * side * (r.hw + riveMarge()))];
function ecarteDesFleuves(line, side0) {
  if (!S.rivers.length) return line;
  const P = resample(line, 16), info = P.map(riveDe);
  const near = P.map((_, k) => k > 0 && info[k] && info[k].d < info[k].hw + riveMarge());
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
  const key = FORME_ID + ':' + S.rivers.map(r => r.pts.length + ',' + r.pts[0] + ',' + r.w0 + ',' + r.w1).join('|');
  if (FORME.carveKey === key) return;
  FORME.carveKey = key;
  if (!S.rivers.length) { FORME.terresDessin = null; return; }
  const P = 2, w = Math.ceil(TW / P), h = Math.ceil(TH / P), c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently:true });
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.fill(anneauxPath(FORME.terres, P), 'evenodd');          // terre en blanc
  g.fillStyle = '#000';
  for (const rv of S.rivers) for (const [x, y, r] of riverDiscs(rv)) { g.beginPath(); g.arc(x / P, y / P, Math.max(.5, r / P + .6), 0, Math.PI * 2); g.fill(); }   // fleuves : disques le long du cours
  const c2 = document.createElement('canvas'); c2.width = w; c2.height = h; const g2 = c2.getContext('2d', { willReadFrequently:true });
  g2.filter = 'blur(3.2px)'; g2.drawImage(c, 0, 0);                                    // masque flouté : le contour n'a plus de marches ni de petites bosses
  const d = g2.getImageData(0, 0, w, h).data, PN = 3, W2 = w + 2 * PN, H2 = h + 2 * PN, m = new Uint8Array(W2 * H2);
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
  // en mètres ; simplification (Douglas-Peucker, 2 m), suppression des aiguilles, puis 4 passes de lissage : plus d'escalier de pixels ni de pointe au fond des baies
  const dp = (pts, eps) => {
    const keep = new Uint8Array(pts.length), stack = [[0, pts.length - 1]]; keep[0] = keep[pts.length - 1] = 1;
    while (stack.length) {
      const [a, b] = stack.pop(), A = pts[a], B = pts[b], L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1; let md = 0, mi = -1;
      for (let k = a + 1; k < b; k++) { const d = Math.abs((B[0] - A[0]) * (A[1] - pts[k][1]) - (A[0] - pts[k][0]) * (B[1] - A[1])) / L; if (d > md) { md = d; mi = k; } }
      if (mi >= 0 && md > eps) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
    }
    return pts.filter((_, k) => keep[k]);
  };
  // aiguille : un sommet dont les deux côtés repartent presque dans la même direction (angle < 25°) ; le contour y revient sur lui-même et les traits du rivage (sable, bord) y dessinent une pointe
  const sansAiguilles = P => {
    for (let pass = 0; pass < 8 && P.length > 4; pass++) {
      const n = P.length, bons = P.filter((p, k) => {
        const a = P[(k + n - 1) % n], b = P[(k + 1) % n], ux = a[0] - p[0], uy = a[1] - p[1], vx = b[0] - p[0], vy = b[1] - p[1];
        return (ux * vx + uy * vy) / ((Math.hypot(ux, uy) * Math.hypot(vx, vy)) || 1) < .906;   // (cos 25°)
      });
      if (bons.length === n) break;
      P = bons;
    }
    return P;
  };
  const lisseFerme = P => { for (let k = 0; k < 4; k++) P = P.flatMap((a, i) => { const b = P[(i + 1) % P.length]; return [[a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]]; }); return P; };
  FORME.terresDessin = rings.map(r => {
    const q = sansAiguilles(dp(r.map(([x, y]) => [(x / 2 - PN + .5) * P, (y / 2 - PN + .5) * P]), 2));
    return q.length < 4 ? null : lisseFerme(q).map(p => [round2(p[0]), round2(p[1])]);
  }).filter(r => r && Math.abs(aireAnneau(r)) / 2 > 120);   // (on jette les miettes : îlots et trous de moins de 120 m²)
}

function drawMouths() {}                                             // (les fleuves sont creusés dans le contour des terres : rien à repeindre)
// mer : tout le cadre hors des terres ; rivage : liseré d'écume côté mer, puis la berge
function drawSea() {
  if (!FORME) return;
  const dessin = FORME.terresDessin || FORME.terres, sea = cadreEtAnneaux(dessin), coast = cheminAnneaux(dessin), s = view.s;
  const foam = Math.max(1.2, Math.min(3, s * .9)), edge = 1.5;
  const [tx, ty] = toS(0, 0);
  ctx.save(); ctx.beginPath(); ctx.rect(tx, ty, TW * s, TH * s); ctx.clip();       // (rien hors du terrain)
  { const sable = Math.max(2, 2.4 * s); ctx.lineJoin = 'round'; ctx.strokeStyle = '#d6b06a'; ctx.lineWidth = 2 * (edge + sable + 1.4); ctx.stroke(coast); ctx.strokeStyle = '#f2dd9e'; ctx.lineWidth = 2 * (edge + sable); ctx.stroke(coast); }   // grève de sable (la mer la recouvre côté eau)
  ctx.save();
  ctx.fillStyle = biomeLook().water || Col.water; ctx.fill(sea, 'evenodd');
  ctx.clip(sea, 'evenodd');
  seaBands(coast, foam, edge);
  drawEauRelief(s);                                                                   // relief de l'eau (même système que le sol), dans la mer déjà découpée
  ctx.strokeStyle = WATER_FOAM; ctx.lineWidth = (foam + edge) * 2; ctx.stroke(coast);
  ctx.restore();
  ctx.strokeStyle = Col['water-edge']; ctx.lineWidth = edge * 2; ctx.lineJoin = 'round'; ctx.stroke(coast);
  ctx.restore();
}
/* Bords de la région, calculés une fois par région : le contour est découpé en suites de points tous les 6 m.
   - front : les tronçons qui séparent la région d'une terre voisine (frontière en pointillés ; ni la mer ni les rivières) ;
   - cote : les tronçons qui longent la mer ou une rivière. */
let frontCache = { id:null, bords:null };
const surRiviere = p => Z.water.river.some(q => p[0] >= q.bb[0] && p[0] <= q.bb[2] && p[1] >= q.bb[1] && p[1] <= q.bb[3] && inPoly(p, q.P));
function bordsRegion() {
  const ck = FORME_ID + ':' + Z.water.river.length + ':' + S.landSeed;
  if (frontCache.id === ck) return frontCache.bords;
  const front = [], cote = [];
  for (const ring of FORME.region) {
    let run = [], mer = null;                                                   // (mer : la suite en cours longe-t-elle l'eau ?)
    const fin = () => { if (run.length > 1) (mer ? cote : front).push(run); run = []; };
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 6));
      for (let t = 0; t < n; t++) {
        const p = [a[0] + (b[0] - a[0]) * t / n, a[1] + (b[1] - a[1]) * t / n], eau = surRiviere(p) || SEA_DIRS.some(([dx, dy]) => !surTerre([p[0] + dx * 8, p[1] + dy * 8]));
        if (eau !== mer) { fin(); mer = eau; }
        run.push(p);
      }
    }
    fin();
  }
  frontCache = { id:ck, bords:{ front, cote } };
  return frontCache.bords;
}
// hors de la région : terres voisines voilées (on n'y construit pas), frontière en pointillés
let voileC = null;
function drawBorder() {
  if (!FORME) return;
  const out = cadreEtAnneaux(FORME.region), land = cheminAnneaux(FORME.terresDessin || FORME.terres), front = new Path2D(), cote = new Path2D(), { front:runsF, cote:runsC } = bordsRegion();
  const trace = (path, runs) => { for (const run of runs) run.forEach((p, i) => { const [X, Y] = toS(p[0], p[1]); i ? path.lineTo(X, Y) : path.moveTo(X, Y); }); };
  trace(front, runsF); trace(cote, runsC);
  /* Le voile est découpé sur le contour brut de la région, plus anguleux que la côte lissée : dans les coins, un triangle de voile restait sur la plage. Le voile est donc d'abord peint à part, puis
     effacé sur une bande de 24 m le long des tronçons de la région qui longent l'eau. */
  if (!voileC) voileC = document.createElement('canvas');
  if (voileC.width !== W || voileC.height !== H) { voileC.width = W; voileC.height = H; }
  const v = voileC.getContext('2d');
  v.clearRect(0, 0, W, H); v.fillStyle = Col.sheet; v.fill(out, 'evenodd');
  v.globalCompositeOperation = 'destination-out'; v.lineWidth = 24 * view.s; v.lineCap = 'round'; v.lineJoin = 'round'; v.stroke(cote);
  v.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.clip(land, 'evenodd');
  ctx.globalAlpha = .45; ctx.drawImage(voileC, 0, 0);
  ctx.globalAlpha = .75; ctx.setLineDash([10, 6]); ctx.strokeStyle = Col.ink; ctx.lineWidth = 2; ctx.stroke(front);
  ctx.restore();
}
// les rivières ne se dessinent que sur la terre (à leur embouchure, la mer prend le relais)
function clipTerre() { if (FORME) ctx.clip(cheminAnneaux(FORME.terresDessin || FORME.terres), 'evenodd'); }
