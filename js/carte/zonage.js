/* ---------- zones façon Cities: Skylines ----------
   Chaque tronçon de route porte, de chaque côté, une bande de cases de CELL m
   sur DEPTH cases de profondeur, alignée sur la route. Une case disparaît si elle
   touche une route ou une case d'une route plus ancienne ; les cases derrière
   une case disparue disparaissent aussi (la zone reste collée à la route). */
let Z = { cells:[], geos:new Map(), anchors:[], wallAnchors:[], wallNodes:[], gateSpots:[], water:{ river:[], lake:[] } };
function computeZones() {
  const foot = [];
  for (const r of S.roads) for (let k = 0; k < r.pts.length - 1; k++) {
    const P = segRect(r.pts[k], r.pts[k+1], r.w); foot.push({ P, bb:bbox(P) });
  }
  // murailles, tours et portes retirent aussi les cases qu'elles recouvrent
  for (const w of S.walls) for (let k = 0; k < w.pts.length - 1; k++) {
    const P = segRect(w.pts[k], w.pts[k+1], WALL_W); foot.push({ P, bb:bbox(P) });
  }
  for (const t of S.towers) { const P = towerPoly(t); foot.push({ P, bb:bbox(P) }); }
  for (const g of S.gates) { const P = gatePoly(g); foot.push({ P, bb:bbox(P) }); }
  // l'eau ne se bâtit pas
  const water = waterPolys();
  foot.push(...water.river, ...water.lake);
  const cells = [], geos = new Map();
  for (const r of S.roads) for (let k = 0; k < r.pts.length - 1; k++) {
    const { a, u, parts } = segLayout(r, k);
    parts.forEach(({ off, n }, pi) => { for (const side of [1, -1]) {
      const nv = [-u[1] * side, u[0] * side];
      const geo = { road:r.id, seg:k, side, a, u, n:nv, off, t0:r.w / 2, cols:n, cells:[],
                    ang:Math.atan2(u[1], u[0]) * 180 / Math.PI };
      const P = (s, t) => [a[0] + u[0]*s + nv[0]*t, a[1] + u[1]*s + nv[1]*t];
      geo.P = P;
      for (let i = 0; i < n; i++) {
        const col = [];
        for (let j = 0; j < DEPTH; j++) {
          const s0 = off + i*CELL, t0 = geo.t0 + j*CELL, e = .15;
          const poly = [P(s0, t0), P(s0+CELL, t0), P(s0+CELL, t0+CELL), P(s0, t0+CELL)];
          const test = [P(s0+e, t0+e), P(s0+CELL-e, t0+e), P(s0+CELL-e, t0+CELL-e), P(s0+e, t0+CELL-e)];
          const bb = bbox(poly);
          let ok = poly.every(p => inTerrain(p) && dansRegion(p)) && !tooSteep(poly); // pas de case sur une pente raide
          if (ok) for (const f of foot) if (bbHit(bb, f.bb) && polysOverlap(test, f.P)) { ok = false; break; }
          if (ok) for (const c of cells) if (bbHit(bb, c.bb) && polysOverlap(test, c.poly)) { ok = false; break; }
          if (!ok) break;
          const cell = { poly, bb, geo, i, j, c:P(s0 + CELL/2, t0 + CELL/2), occ:null };
          cells.push(cell); col.push(cell);
        }
        geo.cells.push(col);
      }
      geos.set(`${r.id}:${k}:${pi}:${side}`, geo);
    } });
  }
  // points d'accroche pour démarrer une route : le milieu de chaque case le long
  // de chaque tronçon (une branche ne mange qu'une colonne de cases) et les bouts de route
  // (les murailles ont les mêmes accroches, dans leur propre liste)
  const anchorsOf = list => {
    const out = [];
    for (const r of list) {
      const last = r.pts.length - 2;
      for (let k = 0; k <= last; k++) {
        const { a, u, parts } = segLayout(r, k);
        for (const { off, n } of parts) for (let i = 0; i < n; i++) {
          const s = off + (i + .5) * CELL;
          out.push({ pt:[round2(a[0] + u[0] * s), round2(a[1] + u[1] * s)], kind:'anchor', w:r.w, dir:u, line:r.id });
        }
      }
      const u0 = segLayout(r, 0).u, u1 = segLayout(r, last).u;
      out.push({ pt:r.pts[0].slice(), kind:'end', w:r.w, dir:u0 }, { pt:r.pts[last + 1].slice(), kind:'end', w:r.w, dir:u1 });
    }
    return out;
  };
  const anchors = anchorsOf(S.roads), wallAnchors = anchorsOf(S.walls);
  // index spatial des cases (seaux de CELL m) pour retrouver vite la case sous un point
  const hash = new Map();
  for (const c of cells) {
    for (let gx = Math.floor(c.bb[0] / CELL); gx <= Math.floor(c.bb[2] / CELL); gx++)
      for (let gy = Math.floor(c.bb[1] / CELL); gy <= Math.floor(c.bb[3] / CELL); gy++) {
        const k = gx + ',' + gy;
        if (!hash.has(k)) hash.set(k, []);
        hash.get(k).push(c);
      }
  }
  // emplacements des tours : angles et bouts de muraille, croisements de murailles
  const wallNodes = [], wsegs = [];
  const addNode = p => { if (!wallNodes.some(q => segLen(q, p) < .5)) wallNodes.push([round2(p[0]), round2(p[1])]); };
  for (const w of S.walls) {
    w.pts.forEach(addNode);
    for (let k = 0; k < w.pts.length - 1; k++) wsegs.push([w.pts[k], w.pts[k+1]]);
  }
  for (let i = 0; i < wsegs.length; i++) for (let j = i + 1; j < wsegs.length; j++) {
    const p = segCross(wsegs[i][0], wsegs[i][1], wsegs[j][0], wsegs[j][1]);
    if (p) addNode(p);
  }
  // une porte (posée sur une route) est le point de départ des murailles : elles en partent
  // de part et d'autre de la route, calées sur sa grille comme une branche de route
  for (const g of S.gates) {
    const r = S.roads.find(x => x.id === g.road);
    const rad = g.a * Math.PI / 180;
    if (r) wallAnchors.push({ pt:[g.x, g.y], kind:'gate', w:r.w, dir:[Math.cos(rad), Math.sin(rad)], gate:g.id });
  }
  // pas de tour sur une porte
  const towerNodes = wallNodes.filter(q => !S.gates.some(g => segLen([g.x, g.y], q) < CELL));
  Z = { cells, geos, anchors, wallAnchors, hash, wallNodes:towerNodes, water };
  computeOcc();
}
/* Découpage d'un tronçon en cases, comme Cities: Skylines : le tronçon est coupé
   par chaque route qui le rejoint ou le croise, et chaque portion est remplie de cases
   à partir du bord du carrefour. Deux routes parallèles reliées par les mêmes branches
   ont donc leurs colonnes de cases exactement face à face. */
function segLayout(r, k) {
  const a = r.pts[k], b = r.pts[k+1], L = segLen(a, b) || 1;
  const u = [(b[0]-a[0]) / L, (b[1]-a[1]) / L];
  const e = [b[0]-a[0], b[1]-a[1]];
  // plages occupées par les carrefours, en mètres le long du tronçon
  const cuts = [], isWall = S.walls.includes(r);
  const closed = r.pts.length > 3 && segLen(r.pts[0], r.pts[r.pts.length - 1]) < .01; // enceinte refermée
  if (k > 0 || closed) cuts.push([-1, r.w / 2]);
  if (k < r.pts.length - 2 || closed) cuts.push([L - r.w / 2, L + 1]);
  // une route est coupée par les routes et murailles (une muraille borne une zone comme
  // un carrefour) ; une muraille n'est coupée que par les murailles, pour que ses accroches
  // (où se posent les portes) restent régulières là où les routes la traversent
  for (const o of isWall ? S.walls : [...S.roads, ...S.walls]) {
    if (o.id === r.id) continue;
    for (let i = 0; i < o.pts.length - 1; i++) {
      const c = o.pts[i], d = o.pts[i+1], f = [d[0]-c[0], d[1]-c[1]];
      const den = e[0]*f[1] - e[1]*f[0];
      if (Math.abs(den) < 1e-9) continue;
      const g = [c[0]-a[0], c[1]-a[1]];
      const t = (g[0]*f[1] - g[1]*f[0]) / den, v = (g[0]*e[1] - g[1]*e[0]) / den;
      const tol = .05 / L, tolO = .05 / (segLen(c, d) || 1);
      if (t < -tol || t > 1 + tol || v < -tolO || v > 1 + tolO) continue;
      const sin = Math.abs(den) / (L * (segLen(c, d) || 1));
      const ext = (o.w / 2) / Math.max(sin, .2), s = t * L;
      cuts.push([s - ext, s + ext]);
    }
  }
  cuts.sort((x, y) => x[0] - y[0]);
  const spans = [];
  let from = 0, fromJunction = false;
  for (const [c0, c1] of cuts) {
    if (c0 > from) spans.push([from, Math.min(c0, L), fromJunction, true]);
    if (c1 > from) { from = c1; fromJunction = true; }
  }
  if (from < L) spans.push([from, L, fromJunction, false]);
  const parts = [];
  for (const [p, q, startJ, endJ] of spans) {
    const n = Math.floor((q - p) / CELL + 1e-6);
    if (n < 1) continue;
    // cases collées au carrefour de départ ; si la portion part d'un bout de route
    // libre, on les colle au carrefour d'arrivée ; sans carrefour, on centre
    const off = startJ ? p : endJ ? q - n*CELL : p + (q - p - n*CELL) / 2;
    parts.push({ off, n });
  }
  return { a, b, L, u, parts };
}
function computeOcc() {
  for (const c of Z.cells) c.occ = null;
  for (const h of S.houses) {
    const C = corners(h), bb = bbox(C);
    for (const c of Z.cells) if (bbHit(bb, c.bb) && inPoly(c.c, C)) c.occ = h.id;
  }
}
function cellAt(p) {
  const list = Z.hash && Z.hash.get(Math.floor(p[0] / CELL) + ',' + Math.floor(p[1] / CELL));
  if (list) for (const c of list) if (p[0] >= c.bb[0] && p[0] <= c.bb[2] && p[1] >= c.bb[1] && p[1] <= c.bb[3] && inPoly(p, c.poly)) return c;
  return null;
}
/* Placement libre sur le quadrillage. Un bâtiment de f × d cases se pose sur la
   grille de la case visée, à n'importe quelle colonne et n'importe quelle rangée
   (pas forcément en bordure de route), et peut déborder sur les cases d'une autre
   route tant qu'elles sont alignées (îlot entre deux routes parallèles, portions
   voisines d'une même route). Chaque case couverte doit exister et être libre. */
function footprint(geo, i0, j0, f, d) {
  const s0 = geo.off + i0*CELL, t0 = geo.t0 + j0*CELL;
  const [x, y] = geo.P(s0 + f*CELL / 2, t0 + d*CELL / 2);
  // front : côté de la rue (1 = rue du côté y local négatif, -1 = positif)
  return { x:round2(x), y:round2(y), a:round2(geo.ang), w:f*CELL, l:d*CELL, f, d, front:geo.side };
}
function fitsAt(geo, i0, j0, f, d, ignoreId) {
  if (j0 < 0) return false;
  for (let i = i0; i < i0 + f; i++) for (let j = j0; j < j0 + d; j++) {
    const q = geo.P(geo.off + (i + .5)*CELL, geo.t0 + (j + .5)*CELL);
    const c = cellAt(q);
    if (!c || segLen(c.c, q) > .5 || (c.occ !== null && c.occ !== ignoreId)) return false;
  }
  const C = shrunk(footprint(geo, i0, j0, f, d));
  for (const o of S.houses) if (o.id !== ignoreId && polysOverlap(C, corners(o))) return false;
  return true;
}
// position la plus proche du curseur où le bâtiment tient ; si `turn`, essaie aussi pivoté
function placeAt(p, f, d, ignoreId, turn) {
  const cell = cellAt(p);
  if (!cell) return null;
  const geo = cell.geo;
  // coordonnées du curseur dans la grille de cette case, en cases
  const rel = [p[0] - geo.a[0], p[1] - geo.a[1]];
  const cs = (rel[0]*geo.u[0] + rel[1]*geo.u[1] - geo.off) / CELL, ct = (rel[0]*geo.n[0] + rel[1]*geo.n[1] - geo.t0) / CELL;
  const tryDims = (F, D) => {
    const cands = [];
    for (let i0 = cell.i - F + 1; i0 <= cell.i; i0++)
      for (let j0 = Math.max(0, cell.j - D + 1); j0 <= cell.j; j0++)
        cands.push([i0, j0, Math.hypot(i0 + F/2 - cs, j0 + D/2 - ct)]);
    cands.sort((x, y) => x[2] - y[2]);
    for (const [i0, j0] of cands) if (fitsAt(geo, i0, j0, F, D, ignoreId)) return { ...footprint(geo, i0, j0, F, D), ok:true };
    return null;
  };
  const hit = tryDims(f, d) || (turn && f !== d ? tryDims(d, f) : null);
  if (hit) return hit;
  const i0 = cell.i - Math.floor((f-1)/2), j0 = Math.max(0, cell.j - Math.floor((d-1)/2));
  return { ...footprint(geo, i0, j0, f, d), ok:false };
}
const roadSegOk = (a, b, w) => !roadIssue(a, b, w);
// raison pour laquelle un tronçon de route est impossible, ou null
function roadIssue(a, b, w) {
  if (!inTerrain(a) || !inTerrain(b)) return 'Hors du terrain';
  if (!segSurTerre(a, b)) return 'Une route ne va pas en mer';
  const P = segRect(a, b, w);
  // la rivière se franchit par un pont ; le lac, non
  if (!S.houses.every(h => !polysOverlap(P, shrunk(h)))) return 'La route traverse un bâtiment';
  if (hitsAny(segRect(a, b, w + 2 * WATER_MARGIN), Z.water.lake)) return 'Une route passe à 2 m au moins du lac';
  const rv = riverMarginIssue(a, b, w);
  if (rv) return rv;
  if (!crossesWallAtGates(a, b)) return 'Une route ne franchit une muraille que par une porte';
  const g = maxGrade(a, b);
  if (g > ROAD_MAX_SLOPE) return `Pente trop forte : ${Math.round(g * 100)} % (${Math.round(ROAD_MAX_SLOPE * 100)} % au plus)`;
  return null;
}
// marge de 2 m au bord de l'eau : une route ne longe pas une rivière de plus près ; elle ne
// s'en approche que pour la franchir par un pont, assez franchement (30° au moins)
function riverMarginIssue(a, b, w) {
  const L = segLen(a, b), n = Math.max(1, Math.ceil(L)), lim = w / 2 + WATER_MARGIN;
  const bb = [Math.min(a[0], b[0]) - 40, Math.min(a[1], b[1]) - 40, Math.max(a[0], b[0]) + 40, Math.max(a[1], b[1]) + 40];
  for (const rv of S.rivers) {
    const P = rv.pts, segs = [];
    for (let i = 0; i < P.length - 1; i++) if (bbHit(bb, bbox([P[i], P[i + 1]]))) segs.push(i);
    if (!segs.length) continue;
    const HW = riverHW(rv), hwAt = i => HW[i];
    const near = q => segs.some(i => ptSeg(q, P[i], P[i + 1]).d - hwAt(i) < lim);
    // passages du tronçon dans la bande de la rivière
    let run = null;
    const runs = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n, q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      if (near(q)) { if (!run) run = [t, t]; else run[1] = t; } else if (run) { runs.push(run); run = null; }
    }
    if (run) runs.push(run);
    for (const [t0, t1] of runs) {
      const p0 = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0], p1 = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1];
      const i = segs.find(i => segCross(p0, p1, P[i], P[i + 1]));
      // bout de route au bord de l'eau (sans la traverser) : c'est un raccord du tronçon voisin
      if (i === undefined) {
        if ((t0 === 0 || t1 === 1) && (t1 - t0) * L < lim + 20) continue;
        return 'Gardez 2 m entre la route et la rivière (sauf pour la franchir)';
      }
      const d = [P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]], dl = Math.hypot(...d) || 1;
      const sin = Math.abs(((b[0] - a[0]) * d[1] - (b[1] - a[1]) * d[0]) / (L * dl));
      if (sin < .5) return 'Le pont doit franchir la rivière plus franchement (30° au moins)';
    }
  }
  return null;
}
// plus forte pente d'un tronçon, mesurée case par case (8 m), pont sur la rivière exclu
function maxGrade(a, b) {
  const L = segLen(a, b), n = Math.max(1, Math.round(L / CELL));
  const onRiver = p => Z.water.river.some(q => p[0] >= q.bb[0] && p[0] <= q.bb[2] && p[1] >= q.bb[1] && p[1] <= q.bb[3] && inPoly(p, q.P));
  let worst = 0;
  for (let i = 0; i < n; i++) {
    const p = [a[0] + (b[0]-a[0]) * i / n, a[1] + (b[1]-a[1]) * i / n], q = [a[0] + (b[0]-a[0]) * (i+1) / n, a[1] + (b[1]-a[1]) * (i+1) / n];
    if (onRiver(p) || onRiver(q)) continue;
    worst = Math.max(worst, Math.abs(hAt(...q) - hAt(...p)) / (L / n));
  }
  return worst;
}
// une route ne franchit une muraille que par une porte
function crossesWallAtGates(a, b) {
  for (const wl of S.walls) for (let i = 0; i < wl.pts.length - 1; i++) {
    const c = segCross(a, b, wl.pts[i], wl.pts[i+1]);
    if (c && !S.gates.some(g => segLen([g.x, g.y], c) < 1)) return false;
  }
  return true;
}
