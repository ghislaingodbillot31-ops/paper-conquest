/* ---------- tracé de route ---------- */
function snapToRoads(x, y, list = S.roads) {
  const tol = 12 / view.s;
  let best = null, bd = tol;
  for (const r of list) for (const q of r.pts) {
    const d = Math.hypot(q[0]-x, q[1]-y); if (d < bd) { bd = d; best = { pt:[q[0], q[1]], kind:'node' }; }
  }
  if (best) return best;
  for (const r of list) for (let i = 0; i < r.pts.length - 1; i++) {
    const t = ptSeg([x, y], r.pts[i], r.pts[i+1]);
    if (t.d < bd) { bd = t.d; best = { pt:[round2(t.q[0]), round2(t.q[1])], kind:'edge' }; }
  }
  return best;
}
/* Point suivant d'un tracé. Routes et murailles suivent le même principe : une case
   de large, départ sur une accroche (milieu de case ou bout), pas de 10°, tronçons d'un
   nombre entier de cases, branches calées pour remplir l'espace jusqu'à la parallèle.
   Muraille : elle part d'une porte (posée au préalable sur une route) ou d'une muraille
   existante, jamais d'un point libre ; elle se termine en recliquant sur son premier
   point ou en rejoignant une autre porte. */
/* Route : un point par clic (Entrée pour construire), toujours par pas de 30° (aucun tracé libre).
   Départ : un point d'ancrage (il y en a tous les 8 m sur chaque route, toujours visibles) ; la seule route
   possible sans ancrage est la toute première. Premier tronçon : les 30° se comptent depuis la route d'accroche,
   si bien que le raccord à 90° (ou à tout multiple de 30° de la route) est toujours possible. Ensuite : 30° absolus.
   Arrivée : près d'une route, le tronçon est prolongé, dans sa direction arrondie, jusqu'à la route (raccord). */
const TRONCON = CELL;                                                       // pas de longueur d'un tronçon de route (m) : une case
// Départ et arrivée seulement sur un point d'ancrage (règle du 06/10) : plus de raccord n'importe où sur une chaussée.
// Les points intermédiaires restent libres (30°, nombre entier de cases).
function pointRoute() {
  const mag = Math.max(14 / view.s, CELL * .6);                             // aimant : l'ancrage le plus proche dans 14 px (au moins 0,6 case)
  if (!draft) {
    const an = nearestAnchor(cursor, roadAnchors(), mag);
    if (an) return { pt:an.pt.slice(), kind:'anchor', parent:{ w:an.w, dir:an.dir } };
    return S.roads.length ? { pt:cursor.slice(), kind:'none' } : { pt:[Math.round(cursor[0]*2)/2, Math.round(cursor[1]*2)/2], kind:'free' };
  }
  const last = draft.pts[draft.pts.length - 1], L = segLen(last, cursor), raw = Math.atan2(cursor[1] - last[1], cursor[0] - last[0]);
  const base = draft.pts.length === 1 && draft.parent ? Math.atan2(draft.parent.dir[1], draft.parent.dir[0]) : 0;
  const ang = base + Math.round((raw - base) / ANG_ROUTE) * ANG_ROUTE, dir = [Math.cos(ang), Math.sin(ang)];
  // arrivée : un point d'ancrage à portée du curseur ; on préfère celui qu'un pas de 30° atteint (à 2° près), sinon le plus proche
  if (L > CELL) {
    const proches = roadAnchors().filter(p => segLen(p.pt, cursor) < mag && segLen(p.pt, last) > CELL * .5).sort((p, q) => segLen(p.pt, cursor) - segLen(q.pt, cursor));
    const dev = p => { const d = Math.atan2(p.pt[1] - last[1], p.pt[0] - last[0]) - base, k = Math.round(d / ANG_ROUTE); return Math.abs(d - k * ANG_ROUTE); };
    const pick = proches.find(p => dev(p) < 2 * Math.PI / 180) || proches[0];
    if (pick) return { pt:pick.pt.slice(), kind:'edge', ang:Math.atan2(pick.pt[1] - last[1], pick.pt[0] - last[0]) };
  }
  const Lf = Math.max(TRONCON, Math.round(L / TRONCON) * TRONCON);          // distance fixe : un tronçon libre fait un nombre entier de cases
  return { pt:[round2(last[0] + dir[0] * Lf), round2(last[1] + dir[1] * Lf)], kind:'free', ang };
}
function tracePoint(isWall) {
  if (!cursor) return null;
  if (!isWall) return pointRoute();
  const list = isWall ? S.walls : S.roads;
  const hit = snapToRoads(cursor[0], cursor[1], list);
  const free = () => ({ pt:[Math.round(cursor[0]*2)/2, Math.round(cursor[1]*2)/2], kind:'free' });
  if (!draft) {
    const a = nearestAnchor(cursor, Z.wallAnchors);
    if (a) return { pt:a.pt.slice(), kind:'anchor', parent:{ w:a.w, dir:a.dir } };
    // première route du plan : départ libre ; sinon une route part toujours d'une route
    return !isWall && !S.roads.length ? free() : { pt:cursor.slice(), kind:'none' };
  }
  const first = draft.pts[0], last = draft.pts[draft.pts.length - 1];
  if (isWall && draft.pts.length >= 3 && segLen(cursor, first) * view.s < 14) return { pt:first.slice(), kind:'node', close:true };
  if (isWall) {
    // arrivée sur une autre porte : la muraille s'y referme
    const g = S.gates.find(g => segLen([g.x, g.y], first) > .5 && segLen([g.x, g.y], cursor) * view.s < 14);
    if (g) return { pt:[g.x, g.y], kind:'node', close:true };
    /* Grille de la muraille : repère de sa porte (axe de la route, cases de 8 m).
       Chaque point, donc chaque tour, tombe sur un nœud de cette grille : la longueur
       et l'angle du tronçon s'adaptent ensemble (« 3 cases en avant, 2 de côté »), si
       bien que les tours restent alignées sur les cases de zonage dans tous les sens. */
    if (draft.frame) {
      const { o, u } = draft.frame, n = [-u[1], u[0]];
      const grid = p => { const r = [p[0] - o[0], p[1] - o[1]]; return [Math.round((r[0]*u[0] + r[1]*u[1]) / CELL), Math.round((r[0]*n[0] + r[1]*n[1]) / CELL)]; };
      const [a, b] = grid(cursor), [la, lb] = grid(last);
      const pt = [round2(o[0] + (a * u[0] + b * n[0]) * CELL), round2(o[1] + (a * u[1] + b * n[1]) * CELL)];
      return { pt, kind:'free', lattice:[a - la, b - lb] };
    }
  }
  let ang = Math.atan2(cursor[1] - last[1], cursor[0] - last[0]), L = segLen(last, cursor);
  ang = Math.round(ang / ANG_STEP) * ANG_STEP;
  const dir = [Math.cos(ang), Math.sin(ang)];
  // raccord à un tracé existant sans quitter les pas de 10° :
  // on prolonge la direction arrondie jusqu'au tracé visé
  const j = hit && segLen(last, hit.pt) > .3 ? junctionOnRay(last, dir, cursor, list) : null;
  if (j) return { pt:j, kind:'edge' };
  let cells = null, gap = false;
  if (snapLen) {
    const par = draft.pts.length === 1 ? draft.parent : null;
    const sin = par ? Math.abs(dir[0] * par.dir[1] - dir[1] * par.dir[0]) : 0;
    if (par && sin > .3) {
      // branche : la route parallèle qu'on posera au bout sera à un nombre entier
      // de cases de la route de départ, bord à bord (toutes les routes font une case)
      const base = par.w / 2 + draft.w / 2;
      cells = Math.max(1, Math.round((L * sin - base) / CELL));
      L = (base + cells * CELL) / sin; gap = true;
    } else {
      // tronçon d'axe à axe = nombre entier de cases, comme la largeur des routes
      const k = Math.max(1, Math.round(L / CELL));
      L = k * CELL; cells = k;
    }
  }
  return { pt:[round2(last[0] + dir[0] * L), round2(last[1] + dir[1] * L)], kind:'free', cells, gap };
}
const wallSegOk = (a, b) => !wallIssue(a, b);
// raison pour laquelle un tronçon de muraille est impossible, ou null
function wallIssue(a, b) {
  if (!inTerrain(a) || !inTerrain(b)) return 'Hors du terrain';
  const P = segRect(a, b, WALL_W);
  if (!S.houses.every(h => !polysOverlap(P, shrunk(h)))) return 'La muraille traverse un bâtiment';
  if (hitsAny(P, Z.water.lake) || hitsAny(P, Z.water.river)) return 'Une muraille ne traverse pas l\'eau';
  // une route ne se franchit qu'à une porte : le tronçon peut toucher une route
  // seulement s'il part d'une porte posée sur cette route (ou s'y termine)
  const gateAt = p => S.gates.find(g => segLen([g.x, g.y], p) < .5);
  const ga = gateAt(a), gb = gateAt(b), L = segLen(a, b) || 1, u = [(b[0]-a[0]) / L, (b[1]-a[1]) / L];
  for (const r of S.roads) for (let k = 0; k < r.pts.length - 1; k++) {
    const rs = segRect(r.pts[k], r.pts[k+1], r.w - .4);
    // au départ (ou à l'arrivée) d'une porte de cette route, le mur a le droit de toucher la
    // route le temps d'en sortir ; au-delà, il ne doit plus la toucher (pas de mur qui la longe)
    const rd = [r.pts[k+1][0] - r.pts[k][0], r.pts[k+1][1] - r.pts[k][1]], rl = Math.hypot(...rd) || 1;
    const out = CELL / Math.max(.3, Math.abs(u[0] * rd[1] - u[1] * rd[0]) / rl);
    let p = a, q = b;
    if (ga && ga.road === r.id) p = [a[0] + u[0] * out, a[1] + u[1] * out];
    if (gb && gb.road === r.id) q = [b[0] - u[0] * out, b[1] - u[1] * out];
    if ((q[0] - p[0]) * u[0] + (q[1] - p[1]) * u[1] <= 0) continue; // tronçon entièrement dans la porte
    if (polysOverlap(segRect(p, q, WALL_W - .4), rs)) return 'Une muraille ne traverse une route qu\'à une porte';
  }
  return null;
}
const linePoint = () => tracePoint(tool === 'wall');
function nearestAnchor(p, list = Z.anchors, rad) {
  const tol = rad || Math.max(18 / view.s, CELL * .6);
  let best = null, bd = tol;
  for (const a of list) { const d = segLen(a.pt, p); if (d < bd) { bd = d; best = a; } }
  return best;
}
// intersection de la demi-droite (o, dir) avec le tronçon de route le plus proche du curseur
function junctionOnRay(o, dir, near, list = S.roads, tol = 14 / view.s) {
  let best = null, bd = Infinity;
  for (const rd of list) { const Q = list === S.roads ? smoothPts(rd) : rd.pts; for (let i = 0; i < Q.length - 1; i++) {
    const a = Q[i], b = Q[i+1], e = [b[0]-a[0], b[1]-a[1]];
    const den = dir[0]*e[1] - dir[1]*e[0];
    if (Math.abs(den) < 1e-9) continue;
    const w = [a[0]-o[0], a[1]-o[1]];
    const t = (w[0]*e[1] - w[1]*e[0]) / den, u = (w[0]*dir[1] - w[1]*dir[0]) / den;
    if (t <= .3 || u < -1e-6 || u > 1 + 1e-6) continue;
    const p = [o[0] + dir[0]*t, o[1] + dir[1]*t], d = segLen(p, near);
    if (d < tol && d < bd) { bd = d; best = [round2(p[0]), round2(p[1])]; }
  } }
  return best;
}
function drawDraft() {
  if (tool !== 'road' && tool !== 'wall') return;
  const isWall = tool === 'wall', sp = linePoint();
  if (draft) {
    const w = (isWall ? WALL_W : draft.w) * view.s, last = draft.pts[draft.pts.length - 1];
    const ok = !sp || (isWall ? wallSegOk(last, sp.pt) : roadSegOk(last, sp.pt, draft.w));
    ctx.globalAlpha = .55;
    strokeLine(draft.pts, w, Col.accent);
    if (sp) strokeLine([last, sp.pt], w, ok ? Col.accent : Col.bad);
    ctx.globalAlpha = 1;
    for (const q of draft.pts) { const [X, Y] = toS(...q); ctx.fillStyle = Col.ink; ctx.fillRect(X - 3, Y - 3, 6, 6); }
    if (sp) {
      const d = segLen(last, sp.pt);
      let deg = Math.round(-Math.atan2(sp.pt[1] - last[1], sp.pt[0] - last[0]) * 180 / Math.PI);
      if (deg < 0) deg += 360;
      const [X, Y] = toS(...sp.pt);
      ctx.font = '500 14px "IBM Plex Mono", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      const info = sp.close ? 'fermer l\'enceinte'
        : sp.lattice ? `${Math.abs(sp.lattice[0])} × ${Math.abs(sp.lattice[1])} cases` : sp.gap
        ? `${sp.cells} cases d'écart${sp.cells === 2 * DEPTH ? ' (2 zones pleines)' : sp.cells === DEPTH ? ' (1 zone pleine)' : ''}`
        : sp.kind === 'edge' ? 'raccord' : isWall ? `${Math.floor(d / CELL + 1e-6)} cases` : `${Math.round(d / TRONCON)} cases`;
      // pente du tronçon (routes) : la limite est ROAD_MAX_SLOPE
      const slope = isWall ? '' : ` · pente ${Math.round(maxGrade(last, sp.pt) * 100)} %`;
      haloText(`${fmt(d)} m · ${deg}°${info ? ' · ' + info : ''}${slope}`, X + 10, Y - 8, ok ? Col.ink : Col.bad, Col.sheet);
      if (!ok) haloText(isWall ? wallIssue(last, sp.pt) : roadIssue(last, sp.pt, draft.w), X + 10, Y + 8, Col.bad, Col.sheet);
    }
  }
  if (isWall ? !draft : true) {
    // accroches visibles tant qu'aucun tracé n'est commencé
    // (vue de loin : les points de milieu de case, tous les 8 m, formeraient un trait orange
    // continu qui cache la carte — on ne montre alors que les bouts et les portes)
    ctx.fillStyle = Col.accent; ctx.globalAlpha = .7;
    const [ax0, ay0] = toW(0, 0), [ax1, ay1] = toW(W, H);
    const list = isWall ? Z.wallAnchors : roadAnchors(), pas = isWall ? 1 : Math.max(1, Math.ceil(16 / (CELL * view.s)));   // (routes : toujours visibles, éclaircis de loin)
    for (const [n, a] of list.entries()) {
      if (isWall && a.kind === 'anchor' && view.s < 1.5) continue;
      if (!isWall && !a.bout && n % pas && !(draft && sp && segLen(a.pt, sp.pt) < CELL * 2)) continue;   // (le bout d'une route est toujours montré)
      if (a.pt[0] < ax0 || a.pt[0] > ax1 || a.pt[1] < ay0 || a.pt[1] > ay1) continue;
      const [X, Y] = toS(...a.pt);
      ctx.beginPath(); ctx.arc(X, Y, a.kind === 'gate' ? 6 : a.kind === 'end' || a.bout ? 4.5 : isWall ? 2.5 : 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  if (sp && sp.kind === 'none') {
    const [X, Y] = toS(...sp.pt);
    ctx.font = '500 14px "IBM Plex Mono", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    const msg = !isWall ? 'Partez d\'un point d\'ancrage (points orange) d\'une route'
      : S.gates.length ? 'Partez d\'une porte ou d\'une muraille (points orange)' : 'Posez d\'abord une porte sur une route (outil Porte)';
    haloText(msg, X + 12, Y - 8, Col.bad, Col.sheet);
  } else if (sp) {
    const [X, Y] = toS(...sp.pt);
    if (sp.kind !== 'free') { ctx.beginPath(); ctx.arc(X, Y, 12, 0, Math.PI * 2); ctx.globalAlpha = .25; ctx.fillStyle = Col.accent; ctx.fill(); ctx.globalAlpha = 1; }   // aimant accroché
    ctx.beginPath(); ctx.arc(X, Y, sp.kind === 'free' ? 3 : 7, 0, Math.PI * 2);
    ctx.strokeStyle = Col.accent; ctx.lineWidth = 2; ctx.stroke();
  }
}
