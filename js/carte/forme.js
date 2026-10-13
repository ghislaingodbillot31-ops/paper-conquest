/* ---------- forme réelle de la région (data/regions/formes.json) ----------
   Le terrain n'est plus un rectangle vide : il a la forme de la région du globe, mise à
   l'échelle (outils/build-formes.js). On y trouve la région (seule constructible), les terres
   voisines (voilées, derrière la frontière en pointillés), la mer si la région est côtière,
   les vrais fleuves, les vrais lacs et les vraies routes vers les capitales voisines.
   Sans forme (éditeur sans région choisie, page d'essai), le terrain reste un rectangle. */
let FORME = null, FORME_ID = null, masque = null;
const FORMES_V = 22;                                 // monter pour que les cartes de région déjà enregistrées soient régénérées par le générateur à jour
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
   // point le plus proche de p sur la ligne L : { d, q }
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
/* Route de ceinture d'une île : le contour de la terre qui porte la capitale, décalé vers l'intérieur de COTE_DIST m, lissé ; seul le plus long tronçon qui reste à terre, hors fleuve et à bonne distance
   de la côte est gardé (les baies étroites l'interrompent). Retourne les points, ou null. */
const COTE_DIST = 70;
/* Le tracé réel d'un fleuve ne sert qu'à PLACER le cours d'eau dans notre monde : on le redessine fluide (demande du 12/10). Moyenne glissante sur l'abscisse curviligne (fenêtre ~ 4 largeurs, 3 passes) :
   plus de coudes ni de dents, des courbes amples. Les deux bouts reviennent progressivement au tracé réel (le fleuve entre et sort de la carte au même endroit). Un point tous les 4 m. */
function lisseCours(P, w) {
  const n = P.length; if (n < 20) return P;
  const h = Math.max(12, Math.round(w * 2 / 4)), L = n * 4, fade = Math.min(150, L / 4) / 4;
  let Q = P.map(q => q.slice());
  for (let pass = 0; pass < 3; pass++) Q = Q.map((_, i) => { let sx = 0, sy = 0, c = 0; for (let k = Math.max(0, i - h); k <= Math.min(n - 1, i + h); k++) { sx += Q[k][0]; sy += Q[k][1]; c++; } return [sx / c, sy / c]; });
  return P.map((q, i) => { const t = Math.min(1, i / fade, (n - 1 - i) / fade), m = t * t * (3 - 2 * t); return [round2(q[0] + (Q[i][0] - q[0]) * m), round2(q[1] + (Q[i][1] - q[1]) * m)]; });
}
/* CARREFOURS EN T ET EN X (demande du 12/10) : à chaque croisement (X) et chaque jonction (T, le bout d'une route posé sur le flanc d'une autre), toutes les routes concernées restent parfaitement DROITES sur carrefour_droit m
   (10 m) de part et d'autre du centre, puis se raccordent à leur tracé par une courbe de Bézier de carrefour_raccord m, tangente aux deux bouts. En T, la route qui s'arrête arrive PERPENDICULAIREMENT à l'autre.
   Les carrefours à moins de 140 m d'un pont sont laissés tels quels (le pont a ses propres raccords). Modifie r.pts des routes passées. */
function carrefoursDroits(roads, pontsC) {
  const D = regle('carrefour_droit'), Lr = regle('carrefour_raccord'); if (D <= 0) return;
  const P = new Map(roads.map(r => [r.id, resample(r.pts, 2)])), ponts = pontsC || (typeof bridges === 'function' ? bridges().map(b => b.c) : []);   // (centres de ponts : fournis par le générateur quand bridges() n'existe pas encore)
  const unit = (a, b) => { const l = segLen(a, b) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
  const J = [], proche = c => J.some(j => segLen(j.c, c) < 30), loinPont = c => !ponts.some(q => segLen(q, c) < 140);
  for (let a = 0; a < roads.length; a++) for (let b = 0; b < roads.length; b++) {              // 1. les T d'abord (un bout posé sur un flanc compte aussi comme croisement : il ne doit pas être pris pour un X)
    if (a === b) continue; const A = P.get(roads[a].id), B = P.get(roads[b].id);
    for (const fin of [0, A.length - 1]) {
      const e = A[fin]; let best = null; for (let j = 0; j < B.length - 1; j++) { const t = ptSeg(e, B[j], B[j + 1]); if (t.d < 2.5 && (!best || t.d < best.d)) best = { d:t.d, j, q:t.q }; }
      if (best && segLen(best.q, B[0]) > 25 && segLen(best.q, B[B.length - 1]) > 25 && !proche(best.q) && loinPont(best.q)) J.push({ c:best.q, type:'T', m:[{ id:roads[a].id, fin, end:true }, { id:roads[b].id, i:best.j }] });
    }
  }
  for (let a = 0; a < roads.length; a++) for (let b = a + 1; b < roads.length; b++) {          // 2. puis les X (deux routes qui se traversent)
    const A = P.get(roads[a].id), B = P.get(roads[b].id);
    for (let i = 0; i < A.length - 1; i++) for (let j = 0; j < B.length - 1; j++) { const x = segCross(A[i], A[i + 1], B[j], B[j + 1]); if (x && !proche(x) && loinPont(x)) J.push({ c:x, type:'X', m:[{ id:roads[a].id, i }, { id:roads[b].id, i:j }] }); }
  }
  const nD = Math.round(D / 2), nL = Math.round(Lr / 2);
  const droit = (Q, i, C, d, s) => {                                                         // route Q, centre C à l'indice i, direction d (du centre vers l'extérieur), côté s : D m droits puis raccord
    const n = Q.length, f = k => i + s * k; if (f(nD + nL + 2) < 0 || f(nD + nL + 2) >= n) return;
    for (let k = 1; k <= nD; k++) Q[f(k)] = [round2(C[0] + d[0] * k * 2), round2(C[1] + d[1] * k * 2)];
    const p0 = Q[f(nD)], ib = f(nD + nL), p1 = Q[ib], t1 = unit(Q[ib - s * 2], Q[ib + s * 2]), dd = segLen(p0, p1) * .4, c1 = [p0[0] + d[0] * dd, p0[1] + d[1] * dd], c2 = [p1[0] - t1[0] * dd * s * s, p1[1] - t1[1] * dd * s * s];
    for (let k = 1; k < nL; k++) { const u = k / nL, w = 1 - u; Q[f(nD + k)] = [round2(w * w * w * p0[0] + 3 * w * w * u * c1[0] + 3 * w * u * u * c2[0] + u * u * u * p1[0]), round2(w * w * w * p0[1] + 3 * w * w * u * c1[1] + 3 * w * u * u * c2[1] + u * u * u * p1[1])]; }
  };
  const proj = (Q, c) => { let bi = 0, bd = Infinity; Q.forEach((q, i) => { const d = segLen(q, c); if (d < bd) { bd = d; bi = i; } }); return bi; };
  for (const j of J) {
    const through = j.type === 'X' ? j.m : [j.m[1]], C = j.c;
    for (const m of through) {                                                              // routes qui passent : droites des deux côtés
      const Q = P.get(m.id), i = proj(Q, C), t = unit(Q[Math.max(0, i - 4)], Q[Math.min(Q.length - 1, i + 4)]);
      Q[i] = C.slice(); droit(Q, i, C, t, 1); droit(Q, i, C, [-t[0], -t[1]], -1);
    }
    if (j.type === 'T') {                                                                     // route qui s'arrête : perpendiculaire à l'autre, du côté de son tracé
      const m = j.m[0], Q = P.get(m.id), B = P.get(j.m[1].id), jb = proj(B, C), tb = unit(B[Math.max(0, jb - 4)], B[Math.min(B.length - 1, jb + 4)]);
      let nrm = [-tb[1], tb[0]]; const i = m.fin, inner = Q[i === 0 ? 8 : Q.length - 9], s = i === 0 ? 1 : -1; if ((inner[0] - C[0]) * nrm[0] + (inner[1] - C[1]) * nrm[1] < 0) nrm = [-nrm[0], -nrm[1]];
      Q[i] = C.slice(); droit(Q, i, C, nrm, s);
    }
  }
  for (const r of roads) r.pts = resample(P.get(r.id), 4).map(q => [round2(q[0]), round2(q[1])]);
}
/* Routes sans angle, uniquement des courbes (demande du 12/10) : un point tous les 4 m ; là où le tracé tourne de plus de route_angle (14°) sur 24 m, la zone (±24 m) est adoucie par moyenne glissante, et on recommence jusqu'à ce qu'il n'y reste plus de coin.
   Les deux bouts restent fixes (carrefours, bords de la carte). */
function arrondirAngles(P) {
  const ANG_MAX = regle('route_angle') * Math.PI / 180;   // (règle route_angle)
  const ferme = P.length > 3 && segLen(P[0], P[P.length - 1]) < 1;                    // boucle fermée : on la fait démarrer au milieu de son premier côté (le coin d'origine devient intérieur et s'arrondit comme les autres)
  if (ferme) { const m = [(P[0][0] + P[1][0]) / 2, (P[0][1] + P[1][1]) / 2]; P = [m, ...P.slice(1, -1), P[0], m]; }
  let Q = resample(P, 4); if (Q.length < 12) return P;
  const cap = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  for (let it = 0; it < 60; it++) {
    const n = Q.length, mal = new Uint8Array(n); let un = false;
    for (let i = 3; i < n - 3; i++) { let t = cap(Q[i], Q[i + 3]) - cap(Q[i - 3], Q[i]); t = Math.abs(Math.atan2(Math.sin(t), Math.cos(t))); if (t > ANG_MAX) { un = true; for (let k = Math.max(1, i - 6); k <= Math.min(n - 2, i + 6); k++) mal[k] = 1; } }
    if (!un) break;
    Q = Q.map((q, i) => { if (!mal[i]) return q; let sx = 0, sy = 0, c = 0; for (let k = Math.max(0, i - 4); k <= Math.min(n - 1, i + 4); k++) { sx += Q[k][0]; sy += Q[k][1]; c++; } return [round2(sx / c), round2(sy / c)]; });
  }
  return Q;
}
/* Routes d'une région : les routes commerciales qui partent de sa capitale vers les capitales voisines (F.routes, issues de data/monde/routes.json par outils/build-formes.js : du centre vers l'extérieur, déjà lisses,
   avec leurs ponts perpendiculaires). Chaque route est reprise telle quelle ; seul le bout qui sort du terrain est coupé exactement au bord (point d'intersection) — rien n'est ajouté, rien n'est déplacé.
   La plus longue est pavée, les autres en gravier ; routes figées (fige) : le lissage et les carrefours automatiques ne les retouchent pas. */
function routesCommerciales(F) {
  const coupe = P => {
    const out = [];
    for (let i = 0; i < P.length; i++) {
      const q = P[i];
      if (inTerrain(q)) { out.push([round2(q[0]), round2(q[1])]); continue; }
      if (i && inTerrain(P[i - 1])) {                                                  // la route sort : point exact sur le bord, puis fin
        const a = P[i - 1], t = [(q[0] < 0 ? 0 - a[0] : q[0] > TW ? TW - a[0] : Infinity) / (q[0] - a[0] || 1e-9), (q[1] < 0 ? 0 - a[1] : q[1] > TH ? TH - a[1] : Infinity) / (q[1] - a[1] || 1e-9)].filter(isFinite), s = Math.min(...t, 1);
        out.push([round2(a[0] + (q[0] - a[0]) * s), round2(a[1] + (q[1] - a[1]) * s)]);
      }
      break;
    }
    return out;
  };
  return (F.routes || []).map(r => coupe(r.pts)).filter(P => P.length > 1).sort((a, b) => roadLen({ pts:b }) - roadLen({ pts:a }))
    .map((pts, i) => ({ id:i + 1, kind:i ? 'gravier' : 'pave', w:CELL, pts, fige:true }));
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
    let all = F.fl[k] ? F.fl[k].pts : lisseCours(resample(chaikinOpen(resample(f.pts, 24), 4), 4), (RC.w0 + RC.w1) / 2), bouche = F.fl[k] ? F.fl[k].bouche : null;
    if (all.length < 4) return;
    // le fleuve s'arrête à la côte (le tracé réel se prolonge en mer et longe le rivage : tronçons parasites)
    if (!F.fl[k]) {
      const mer = all.findIndex(p => inTerrain(p) && !surTerre(p));
      if (mer >= 0 && mer < 8 && all.slice(0, mer + 1).every(inTerrain)) { F.fl[k] = { pts:[], drop:true }; return; }
      if (mer >= 8) {                                                                // dernier point sur la terre ; puis le fleuve PÉNÈTRE dans la mer sur 3 largeurs, dans l'axe de son cours : il débouche vraiment dans la mer (il s'arrêtait avant le rivage)
        all = all.slice(0, mer + 1); bouche = mer - 1;
        const e = all[all.length - 1], f0 = all[Math.max(0, all.length - 6)], l0 = segLen(f0, e) || 1, v = [(e[0] - f0[0]) / l0, (e[1] - f0[1]) / l0], n = Math.ceil(3 * RC.w1 / 4);
        for (let i = 1; i <= n; i++) all.push([round2(e[0] + v[0] * i * 4), round2(e[1] + v[1] * i * 4)]);
      }           // dernier point sur la terre
      F.fl[k] = { pts:all, bouche };
    }
    if (F.fl[k].drop) return;
    const wc = (RC.w0 + RC.w1) / 2, rv = { pts:all, w0:wc, w1:wc, cls, nom:f.n };   // même largeur de la source à l'embouchure
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
  S.roads = routesCommerciales(F);                                                // ROUTES DE LA RÉGION = les routes commerciales de la carte globale, À L'IDENTIQUE (aucune route en plus, aucun tracé retouché)
  /* LACS = ceux de la carte du monde (water.json, via build-formes.js), à l'identique : même nombre, même place, même forme (rien de déplacé, rien de retiré, aucun lac artificiel). Seuls les lacs hors de la terre du cadre sont écartés. */
  S.lakes = S.lakes.filter(g => g.pts.every(surTerre));
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
function redresserPonts(line) { return redresserPontsBrut(arrondirAngles(line)); }   // (les coins sont adoucis AVANT : les sections droites des ponts ne sont jamais retouchées)
function redresserPontsBrut(line) {
  if (!S.rivers.length || line.length < 3) return line;
  const COS_VIRAGE = Math.cos(regle('pont_virage') * Math.PI / 180), CHERCHE = Math.ceil(regle('pont_cherche') / 12);   // (règles pont_virage, pont_cherche ; points de 12 m)
  const L = typeof regle === 'function' ? regle('pont_droit') : 40, M = typeof regle === 'function' ? regle('pont_marge') : 12;
  const unit = (a, b) => { const l = segLen(a, b) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
  const bez = (p0, d0, p1, d1) => {                                   // courbe de p0 (cap d0) à p1 (cap d1), tangente aux deux bouts (Bézier cubique) : jamais de coin au raccord
    const D = segLen(p0, p1), k = D * .4, c1 = [p0[0] + d0[0] * k, p0[1] + d0[1] * k], c2 = [p1[0] - d1[0] * k, p1[1] - d1[1] * k], n = Math.max(8, Math.ceil(D / 3)), out = [];   // (un point tous les 3 m : courbe lisse, sans facettes)
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
      const r0 = eau[Math.floor((a + b) / 2)];
      if (faits.some(q => segLen(q, r0.q) < r0.hw + 20)) { a = b + 1; continue; }
      /* Choix du passage : le pont ne se pose pas forcément là où le tracé réel croise la rivière (confluence, rive en biais, méandre serré). On essaie plusieurs passages le long de la route (± pont_cherche m) et on garde le meilleur :
         celui qui demande le moins de virage à l'entrée et à la sortie, avec un pont droit qui ne traverse QUE cette rivière (jamais un confluent, jamais deux fois l'eau). */
      const essai = r => {
        const reach = r.hw + M + L, lpre = reach + regle('pont_approche'), n = r.n; let sA = Math.sign((P[a][0] - r.q[0]) * n[0] + (P[a][1] - r.q[1]) * n[1]) || 1;
        let ia = a - 1; while (ia > 0 && segLen(P[ia], r.q) < lpre) ia--;
        let ib = b + 1; while (ib < P.length - 1 && segLen(P[ib], r.q) < lpre) ib++;
        if (ia < 1 || ib > P.length - 2) return null;                                                // (route qui commence ou finit dans l'eau, ou trop près d'un bout : pas de pont possible)
        { const g = unit(P[ia], P[ib]), sg = Math.sign(-(g[0] * n[0] + g[1] * n[1])); if (sg) sA = sg; }   // le pont va du côté d'où la route vient vers celui où elle repart (jamais à contresens)
        const A = [round2(r.q[0] + n[0] * sA * reach), round2(r.q[1] + n[1] * sA * reach)], B = [round2(r.q[0] - n[0] * sA * reach), round2(r.q[1] - n[1] * sA * reach)];
        if (ia < 1 || ib > P.length - 2 || segLen(P[ia], r.q) < reach + 6 || segLen(P[ib], r.q) < reach + 6 || !inTerrain(A) || !inTerrain(B)) return null;   // (traversée au bord de la carte : laissée telle quelle)
        const ax = unit(A, B), d0 = unit(P[ia - 1], P[ia]), d2 = unit(P[ib], P[ib + 1]), net = unit(P[ia], P[ib]);
        const c0 = ax[0] * d0[0] + ax[1] * d0[1], c2 = ax[0] * d2[0] + ax[1] * d2[1];
        if (ax[0] * net[0] + ax[1] * net[1] < -.2 || c0 < COS_VIRAGE || c2 < COS_VIRAGE) return null;   // (demi-tour ou coude trop fort : pas ce passage)
        let eaux = 0, dans = false;                                                                      // le pont ne traverse qu'UNE nappe d'eau
        for (let s = 0, n2 = Math.ceil(segLen(A, B) / 4); s <= n2; s++) { const q = [A[0] + (B[0] - A[0]) * s / n2, A[1] + (B[1] - A[1]) * s / n2], w = riveDe(q), mouille = !!w && w.d < w.hw; if (mouille && !dans) eaux++; dans = mouille; }
        if (eaux !== 1) return null;
        const sa = riveDe(A), sb = riveDe(B), si = riveDe(P[ia]), so = riveDe(P[ib]);                  // chaque bout du pont sur la bonne rive : même rive que la route qui arrive (resp. repart), rives opposées
        if (!sa || !sb || !si || !so || sa.side !== si.side || sb.side !== so.side || sa.side === sb.side) return null;
        return { r, ia, ib, A, B, ax, d0, d2, cout:Math.acos(Math.max(-1, Math.min(1, c0))) + Math.acos(Math.max(-1, Math.min(1, c2))) };
      };
      let best = null;
      for (let k = Math.max(0, a - CHERCHE), kf = Math.min(P.length - 1, b + CHERCHE); k <= kf; k += 2) {
        const r = k >= a && k <= b ? eau[k] : riveDe(P[k]); if (!r || r.d > r.hw + 160) continue;
        const c = essai(r); if (!c) continue;
        c.cout += Math.abs(k - Math.floor((a + b) / 2)) * 12 * .0012;                                      // (légère préférence pour le passage d'origine)
        if (!best || c.cout < best.cout) best = c;
      }
      if (!best) { a = b + 1; continue; }
      const { r, ia, ib, A, B, ax, d0, d2 } = best;
      faits.push(r.q);
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
      best = { rv, d:t.d, q:t.q, n, hw, side:Math.sign((p[0] - t.q[0]) * n[0] + (p[1] - t.q[1]) * n[1]) || 1 };
    }
  }
  return best;
}
const rivePoussee = (r, side) => [round2(r.q[0] + r.n[0] * side * (r.hw + riveMarge())), round2(r.q[1] + r.n[1] * side * (r.hw + riveMarge()))];

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
  // (13/10 : plus de dégradé au bord de l'eau, une seule teinte)
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
  ctx.save();
  ctx.fillStyle = biomeLook().water || Col.water; ctx.fill(sea, 'evenodd');
  ctx.clip(sea, 'evenodd');
  seaBands(coast, foam, edge);
  drawEauRelief(s);                                                                   // relief de l'eau (même système que le sol), dans la mer déjà découpée
  ombreRive(coast);                                                                   // ombre très légère de la terre sur l'eau
  ctx.strokeStyle = grevSaison(biomeLook().foam); ctx.lineWidth = (foam + edge) * 2; ctx.stroke(coast);
  ctx.restore();
  ctx.strokeStyle = grevSaison(biomeLook().edge); ctx.lineWidth = edge * 2; ctx.lineJoin = 'round'; ctx.stroke(coast);
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
  ctx.globalAlpha = .16; ctx.drawImage(voileC, 0, 0);          // (voile léger : les régions voisines gardent leur vrai rendu — terre, forêts, fleuves, lacs — sans y être constructibles)
  ctx.globalAlpha = .75; ctx.setLineDash([10, 6]); ctx.strokeStyle = Col.ink; ctx.lineWidth = 2; ctx.stroke(front);
  ctx.restore();
}
// les rivières ne se dessinent que sur la terre (à leur embouchure, la mer prend le relais)
function clipTerre() { if (FORME) ctx.clip(cheminAnneaux(FORME.terresDessin || FORME.terres), 'evenodd'); }
