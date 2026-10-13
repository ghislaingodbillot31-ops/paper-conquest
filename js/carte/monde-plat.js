/* ---------- carte d'essai de l'éditeur de routes : générée d'après une GRAINE (demande du 12/10) ----------
   Un monde plat avec, selon la graine : une côte (mer sur 0, 1 ou 2 côtés adjacents, rivage irrégulier), 2 à 4 rivières (certaines se jettent dans la mer, parfois un affluent), 0 à 2 lacs et un réseau de routes :
   une grande route d'un bord à l'autre, des routes secondaires qui s'en détachent en T, une boucle de village. Chaque route est contrôlée avant d'être gardée (sur la terre, ni dans un lac, ni trop près d'une
   rivière qu'elle ne traverse pas, ponts éloignés les uns des autres), puis redressée (ponts droits, courbes) et enfin les carrefours sont dessinés (T à 90°, X, 10 m droits).
   Toutes les distances viennent des règles (regles.js). Même graine => même carte. Chargé avant generateur.js ; le terrain (TW, TH) est celui de base.js. */
const PLAT_SEED_CLE = 'editeurRoutes.graine';
const platGraine = () => { try { return +localStorage.getItem(PLAT_SEED_CLE) || 20261012; } catch (e) { return 20261012; } };
const PLAT_COTES = { N:{ n:[0, 1] }, S:{ n:[0, -1] }, W:{ n:[1, 0] }, E:{ n:[-1, 0] } };

/* Contour des terres : le rectangle du terrain, avec un rivage ondulé sur les côtés « mer » (profondeur de 150 à 600 m). Retourne { ring, mer:{N,S,W,E → profondeur(t)} } et installe FORME (la mer, le rivage et
   les masques terre/mer du jeu s'en servent). */
function formePlat(seed) {
  const r = seeded(seed * 7 + 1), cotes = ['N', 'E', 'S', 'W'], t = r(), mer = {};
  const choisis = t < .2 ? [] : t < .75 ? [cotes[Math.floor(r() * 4)]] : (() => { const i = Math.floor(r() * 4); return [cotes[i], cotes[(i + 1) % 4]]; })();
  for (const c of choisis) {
    const base = 260 + r() * 300, a1 = 50 + r() * 90, f1 = 1 + r() * 2, p1 = r() * 6.28, a2 = 20 + r() * 40, f2 = 3 + r() * 3, p2 = r() * 6.28, baie = r() < .5 ? { t:.15 + r() * .7, w:.05 + r() * .08, h:80 + r() * 160 } : null;
    mer[c] = u => Math.max(140, base + a1 * Math.sin(u * 6.283 * f1 + p1) + a2 * Math.sin(u * 6.283 * f2 + p2) + (baie ? baie.h * Math.exp(-(((u - baie.t) / baie.w) ** 2)) : 0));
  }
  const d = (c, u) => mer[c] ? mer[c](u) : 0, ring = [], pas = 40;
  const dL0 = d('W', 0), dL1 = d('W', 1), dR0 = d('E', 0), dR1 = d('E', 1), dT0 = d('N', 0), dT1 = d('N', 1), dB0 = d('S', 0), dB1 = d('S', 1);
  for (let x = dL0 + (dT0 ? 0 : 0); x <= TW - dR0; x += pas) ring.push([x, d('N', x / TW)]);                      // haut, de gauche à droite
  for (let y = dT1 || 0; y <= TH - dB1; y += pas) ring.push([TW - d('E', y / TH), y]);                              // droite, de haut en bas
  for (let x = TW - dR1; x >= dL1; x -= pas) ring.push([x, TH - d('S', x / TW)]);                                   // bas, de droite à gauche
  for (let y = TH - dB0; y >= dT0; y -= pas) ring.push([d('W', y / TH), y]);                                        // gauche, de bas en haut
  FORME = { terres:[ring.map(q => [round2(q[0]), round2(q[1])])], region:[ring.map(q => [round2(q[0]), round2(q[1])])], fleuves:[], lacs:[], routes:[], capitale:[TW / 2, TH / 2], terrain:[TW, TH], k:1, plat:true, mer, cotes:choisis };
  FORME_ID = 'plat'; masque = null;
  return FORME;
}

/* Contrôle d'un tracé de route : retourne les centres de ses traversées d'eau ([[x, y]…]) ou null si le tracé est refusé.
   Refusé si : un point hors de la terre ou du terrain, à moins de route_lac m d'un lac ou de la mer, un bout dans l'eau, une traversée à moins de 130 m d'une traversée existante (ponts jamais côte à côte),
   une rivière traversée deux fois, ou un passage à moins de route_rive m d'une rivière sans la traverser (hors des 130 m autour de son propre pont). */
function platRouteOk(P, centres) {
  if (P.length < 8) return null;
  const rives = [], D = regle('route_rive'), DL = regle('route_lac'), mine = [];                                          // (rives : la rivière la plus proche de chaque point)
  for (let i = 0; i < P.length; i++) { const q = P[i];
    if (!inTerrain(q) || !surTerre(q)) return null;                                              // (tout le tracé sur la terre, dans le terrain)
    if (distLacMer(q).d < DL) return null;                                                      // lac ou mer : jamais à moins de route_lac m (rendu.js distLacMer, défini plus tard : appelé seulement à la génération, les pages l'ont chargé)
    const w = riveDe(q); rives.push(w); }
  let a = -1; const vues = new Set();                                                           // passages dans l'eau ; vues : les rivières déjà traversées par cette route
  for (let i = 0; i <= P.length; i++) { const e = i < P.length && rives[i] && rives[i].d < rives[i].hw;
    if (e && a < 0) a = i; else if (!e && a >= 0) { if (a === 0 || i === P.length) return null; const m = Math.floor((a + i - 1) / 2); if (vues.has(rives[m].rv)) return null; vues.add(rives[m].rv); mine.push(P[m]); a = -1; } }   // une même route ne traverse jamais deux fois la même rivière
  if (mine.some(c => centres.some(o => segLen(c, o) < 130)) || mine.some((c, i) => mine.some((o, j) => j > i && segLen(c, o) < 130))) return null;
  for (let i = 0; i < P.length; i++) { const w = rives[i]; if (w && w.d >= w.hw && w.d - w.hw < D && !mine.some(c => segLen(c, P[i]) < 130)) return null; }
  return mine;
}

// courbe lisse passant près de points de contrôle, un point tous les 8 m
const platCourbe = pts => resample(chaikinOpen(resample(pts, 120), 3), 8).map(q => [round2(q[0]), round2(q[1])]);

/* RÉSEAU DE ROUTES (carte d'essai ET régions du jeu). mains : générateurs de grandes routes (chacun renvoie des points de contrôle ; plusieurs essais) ; libre(q) : le point q peut recevoir une route secondaire.
   Étapes : grandes routes, 4 à 7 routes secondaires qui se détachent en T, boucle de village. Chaque route est contrôlée (platRouteOk) avant d'être gardée. Retourne { routes, centres } (centres : centres des ponts). */
function platReseau(rnd, mains, libre, essaisMain = 25) {
  const centres = [], routes = [], pick = l => l[Math.floor(rnd() * l.length)];
  const garde = (pts, kind) => { const P = redresserPonts(pts), c = platRouteOk(P, centres); if (!c) return null; centres.push(...c); const r = { id:routes.length + 1, kind, w:CELL, pts:P, fige:true }; routes.push(r); return r; };
  mains.forEach((gen, k) => { for (let t = 0; t < essaisMain; t++) { if (garde(platCourbe(gen(t, routes)), k ? 'gravier' : 'pave')) break; } });
  const nB = 4 + Math.floor(rnd() * 4);
  for (let essai = 0; essai < 300 && routes.length < nB + 1 && routes.length; essai++) {              // routes secondaires : en T sur une route existante
    const par = pick(routes), Q = resample(par.pts, 8), i = Math.floor(Q.length * (.12 + rnd() * .76)), C = Q[i];
    if (!libre(C) || routes.some(r => r !== par && r.pts.some(q => segLen(q, C) < 140))) continue;
    const t = Math.atan2(Q[Math.min(Q.length - 1, i + 3)][1] - Q[Math.max(0, i - 3)][1], Q[Math.min(Q.length - 1, i + 3)][0] - Q[Math.max(0, i - 3)][0]), dir = t + (rnd() < .5 ? 1 : -1) * (1.2 + rnd() * .5);
    const pts = [C], L = 450 + rnd() * 1100; let h = dir, p = C.slice();
    for (let k = 1; k <= 4; k++) { h += (rnd() - .5) * .55; p = [p[0] + Math.cos(h) * L / 4, p[1] + Math.sin(h) * L / 4]; if (!inTerrain(p) || !surTerre(p) || !libre(p)) break; pts.push(p); }
    if (pts.length < 3) continue;
    garde(platCourbe(pts), rnd() < .6 ? 'gravier' : 'terre');
  }
  if (rnd() < .7) for (let t = 0; t < 60; t++) {                                                    // boucle de village
    const R = 130 + rnd() * 130, c = [R + 120 + rnd() * (TW - 2 * R - 240), R + 120 + rnd() * (TH - 2 * R - 240)], k = 6 + Math.floor(rnd() * 3), pts = [];
    if (!libre(c)) continue;
    for (let i = 0; i <= k; i++) { const a = i / k * 6.283 + .4; pts.push([c[0] + Math.cos(a) * R * (.85 + rnd() * .3), c[1] + Math.sin(a) * R * (.85 + rnd() * .3)]); }
    pts[k] = pts[0].slice(); if (garde(pts, 'terre')) break;
  }
  // T exacts : le bout de chaque route est posé sur le flanc de sa route mère ; puis les carrefours (10 m droits, T à 90°, X)
  for (const r of routes.slice(1)) for (const fin of [0, r.pts.length - 1]) { const e = r.pts[fin]; let best = null;
    for (const o of routes) { if (o === r) continue; for (let k = 0; k < o.pts.length - 1; k++) { const t = ptSeg(e, o.pts[k], o.pts[k + 1]); if (t.d < 6 && (!best || t.d < best.d)) best = t; } }
    if (best) r.pts[fin] = best.q.map(round2); }
  carrefoursDroits(routes, centres);
  return { routes, centres };
}

function genereMondePlat(seed) {
  const rnd = seeded(seed), f = formePlat(seed), cotes = f.cotes;
  S = normalize({ echelle:ECHELLE_TERRAIN, nextId:200, biome:'tempere', landSeed:seed, reliefSeed:1, houses:[], walls:[], towers:[], gates:[], roads:[], rivers:[], lakes:[], platSeed:seed });
  const terre = cotes.length ? ['N', 'S', 'W', 'E'].filter(c => !cotes.includes(c)) : ['N', 'S', 'W', 'E'];
  const bord = (c, u) => ({ N:[TW * u, 6], S:[TW * u, TH - 6], W:[6, TH * u], E:[TW - 6, TH * u] })[c];
  const pick = l => l[Math.floor(rnd() * l.length)];
  // --- rivières
  const nR = 2 + Math.floor(rnd() * 3);
  for (let essai = 0; essai < 120 && S.rivers.length < nR; essai++) {
    const c0 = pick(terre), a = bord(c0, .12 + rnd() * .76); let b;
    if (cotes.length && rnd() < .55) { const c = pick(cotes), u = .15 + rnd() * .7, dep = f.mer[c](u), p = { N:[TW * u, dep], S:[TW * u, TH - dep], W:[dep, TH * u], E:[TW - dep, TH * u] }[c]; b = [p[0] + PLAT_COTES[c].n[0] * -30, p[1] + PLAT_COTES[c].n[1] * -30]; }
    else { const c1 = pick(terre.filter(c => c !== c0)); b = bord(c1 || c0, .12 + rnd() * .76); }
    if (segLen(a, b) < 900) continue;
    const w = 12 + Math.floor(rnd() * 15), rv = makeRiverPath(a, b, { amp:50 + rnd() * 60, cycles:1.4 + rnd() * 1.4, phase:rnd() * 6.28, w0:w, w1:w });
    let pts = rv.pts; const mer = pts.findIndex(q => inTerrain(q) && !surTerre(q));                    // le fleuve s'arrête à la côte
    if (mer >= 0) pts = pts.slice(0, mer + 3);
    if (pts.length < 100 || pts.slice(0, Math.max(1, pts.length - 4)).some(q => inTerrain(q) && !surTerre(q))) continue;
    rv.pts = pts; rv.cls = 'riviere';
    if (S.rivers.some(o => riverGap(o, pts.filter((_, i) => i % 5 === 0)) < 260)) continue;
    S.rivers.push(rv);
  }
  if (S.rivers.length && rnd() < .55) {                                                         // un affluent
    for (let t = 0; t < 40; t++) {
      const main = S.rivers[0], ic = Math.round(main.pts.length * (.25 + rnd() * .5)), conf = main.pts[ic], c0 = pick(terre), start = bord(c0, .1 + rnd() * .8);
      if (segLen(start, conf) < 500) continue;
      const head = makeRiverPath(start, conf, { amp:35 + rnd() * 40, cycles:1.2 + rnd(), phase:rnd() * 6.28, w0:8, w1:8 }); let pts = null;
      try { pts = joinTributary(head.pts, main.pts, ic); } catch (e) {}
      if (!pts || pts.some(q => inTerrain(q) && !surTerre(q))) continue;
      const tr = { pts, w0:8, w1:8, joined:4, mouth:riverHW(main)[joinTributary.last], cls:'petite' };
      if (S.rivers.slice(1).some(o => riverGap(o, pts.filter((_, i) => i % 5 === 0).slice(0, -4)) < 200)) continue;
      main.confl = [...(main.confl || []), joinTributary.last]; S.rivers.push(tr); break;
    }
  }
  // --- lacs
  const nL = Math.floor(rnd() * 3);
  for (let k = 0; k < nL; k++) for (let t = 0; t < 60; t++) {
    const R = 110 + rnd() * 150, c = [R + 60 + rnd() * (TW - 2 * R - 120), R + 60 + rnd() * (TH - 2 * R - 120)], lk = makeLake(round2(c[0]), round2(c[1]), R, rnd() * 6.28, rnd() * 6.28);
    if (lk.pts.every(q => surTerre(q)) && lacLibre(lk)) { S.lakes.push(lk); break; }
  }
  // --- routes : grande route d'un bord de terre à un autre, puis le réseau (platReseau)
  const mains = terre.length >= 2 ? [() => { const c0 = pick(terre), c1 = pick(terre.filter(c => c !== c0)), A = bord(c0, .15 + rnd() * .7), B = bord(c1, .15 + rnd() * .7), n = 3 + Math.floor(rnd() * 3), pts = [A];
    for (let i = 1; i <= n; i++) { const u = i / (n + 1), nx = -(B[1] - A[1]), ny = B[0] - A[0], l = Math.hypot(nx, ny) || 1, o = (rnd() - .5) * 520; pts.push([A[0] + (B[0] - A[0]) * u + nx / l * o, A[1] + (B[1] - A[1]) * u + ny / l * o]); }
    pts.push(B); return pts; }] : [];
  const { routes, centres } = platReseau(rnd, mains, () => true, 80);
  S.roads = routes.length ? routes : [];
  // T exacts : le bout de chaque route secondaire est posé sur le flanc de sa route mère ; puis les carrefours (10 m droits, T à 90°, X)
  for (const r of S.roads.slice(1)) for (const fin of [0, r.pts.length - 1]) { const e = r.pts[fin]; let best = null;
    for (const o of S.roads) { if (o === r) continue; for (let k = 0; k < o.pts.length - 1; k++) { const t = ptSeg(e, o.pts[k], o.pts[k + 1]); if (t.d < 6 && (!best || t.d < best.d)) best = t; } }
    if (best) r.pts[fin] = best.q.map(round2); }
  carrefoursDroits(S.roads, centres);
  computeZones();
  return S;
}
