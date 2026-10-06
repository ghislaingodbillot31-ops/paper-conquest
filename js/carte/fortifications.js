/* ---------- fortifications ---------- */
function towerSpot() {
  if (tool !== 'tower' || !cursor) return null;
  const tol = Math.max(16 / view.s, 5);
  let best = null, bd = tol;
  for (const q of Z.wallNodes) { const d = segLen(q, cursor); if (d < bd) { bd = d; best = q; } }
  if (!best) return { x:cursor[0], y:cursor[1], none:true };
  const t = { x:best[0], y:best[1] };
  let why = null;
  if (S.towers.some(o => segLen([o.x, o.y], best) < .6)) why = 'Il y a déjà une tour ici';
  else if (S.houses.some(h => polysOverlap(towerPoly(t), shrunk(h)))) why = 'Un bâtiment gêne la tour';
  return { ...t, ok:!why, why };
}
/* Emplacements de porte : uniquement les points d'accroche de route (milieu de chaque
   case le long d'une route), comme les départs de route. La porte se pose AVANT la
   muraille : son passage suit la route, et les murailles en partent de chaque côté. */
// (déclarations de fonction : utilisées dès le chargement du plan, via fixGates)
function gateAnchors() { return Z.anchors.filter(a => a.kind === 'anchor'); }
function gateFromAnchor(a) { return { x:a.pt[0], y:a.pt[1], a:round2(Math.atan2(a.dir[1], a.dir[0]) * 180 / Math.PI), road:a.line }; }
function gateSpot() {
  if (tool !== 'gate' || !cursor) return null;
  const tol = Math.max(16 / view.s, CELL * .6);
  let best = null, bd = tol;
  for (const a of gateAnchors()) { const d = segLen(a.pt, cursor); if (d < bd) { bd = d; best = gateFromAnchor(a); } }
  if (!best) return { x:cursor[0], y:cursor[1], none:true };
  let why = null;
  if (S.gates.some(o => segLen([o.x, o.y], [best.x, best.y]) < GATE_L - .1)) why = 'Il y a déjà une porte ici';
  else if (S.houses.some(h => polysOverlap(gatePoly(best), shrunk(h)))) why = 'Un bâtiment gêne la porte';
  return { ...best, ok:!why, why };
}
// route qui passe par une porte (pour dessiner le revêtement dans le passage)
function roadThroughGate(g) {
  return S.roads.find(r => r.id === g.road) || null;
}
// portes des versions précédentes (posées sur une muraille) : recalées sur l'accroche
// de route la plus proche ; celles qui ne sont près d'aucune route sont retirées
function fixGates() {
  let moved = false;
  S.gates = S.gates.filter(g => {
    if (g.road && S.roads.some(r => r.id === g.road) && !g.wall) return true;
    let best = null, bd = CELL;
    for (const a of gateAnchors()) { const d = segLen(a.pt, [g.x, g.y]); if (d < bd) { bd = d; best = a; } }
    moved = true;
    if (!best) return false;
    Object.assign(g, gateFromAnchor(best)); delete g.wall;
    return true;
  });
  if (moved) computeZones();
}
function placeTower() {
  const t = towerSpot(); if (!t) return;
  if (t.none) { flash('Une tour se place sur un angle, un bout ou un croisement de fortification', true); return; }
  if (!t.ok) { flash(t.why, true); return; }
  commit(); S.towers.push({ id:S.nextId++, x:t.x, y:t.y, lvl:1 }); changed(true);
}
function placeGate() {
  const g = gateSpot(); if (!g) return;
  if (g.none) { flash('Une porte se place sur un point orange de route', true); return; }
  if (!g.ok) { flash(g.why, true); return; }
  commit(); S.gates.push({ id:S.nextId++, x:g.x, y:g.y, a:g.a, road:g.road, lvl:1 }); changed(true);
  flash('Porte posée. Outil Fortification : partez de la porte pour tracer la muraille');
}
function hitTower(x, y) { return S.towers.find(t => segLen([t.x, t.y], [x, y]) < TOWER_R + 2 / view.s) || null; }
function hitGate(x, y) { return S.gates.find(g => inPoly([x, y], gatePoly(g))) || null; }
function hitWall(x, y) {
  for (const w of S.walls) for (let i = 0; i < w.pts.length - 1; i++)
    if (ptSeg([x, y], w.pts[i], w.pts[i+1]).d < WALL_W / 2 + 5 / view.s) return w;
  return null;
}
// objet sous le curseur, du plus petit au plus grand
function hitAny(x, y) {
  for (const [type, fn] of [['tower', hitTower], ['gate', hitGate], ['house', hitHouse], ['wall', hitWall], ['road', hitRoad], ...(typeof hitLake === 'function' ? [['lake', hitLake]] : [])]) {
    const o = fn(x, y); if (o) return { type, id:o.id };
  }
  return null;
}

function addRoadPoint() {
  const sp = linePoint(); if (!sp) return;
  if (!inTerrain(sp.pt)) { flash('Hors du terrain', true); return; }
  if (tool === 'wall') {
    if (!draft) {
      if (sp.kind === 'none') {
        flash(S.gates.length ? 'Une muraille part d\'une porte ou d\'une muraille : cliquez sur un point orange' : 'Posez d\'abord une porte sur une route (outil Porte)', true);
        return;
      }
      // la grille de la muraille part de son point de départ (porte ou accroche de muraille),
      // orientée comme la route de la porte ou comme la muraille dont elle part
      const dir = sp.parent ? sp.parent.dir : [1, 0];
      draft = { type:'wall', pts:[sp.pt], w:WALL_W, parent:sp.parent || null, frame:{ o:sp.pt.slice(), u:dir } };
      requestDraw(); return;
    }
    const last = draft.pts[draft.pts.length - 1];
    if (segLen(last, sp.pt) < .3) return;
    const why = wallIssue(last, sp.pt);
    if (why) { flash(why, true); return; }
    draft.pts.push(sp.pt);
    if (sp.close) finishDraft();
    else requestDraw();
    return;
  }
  if (!draft) {
    if (sp.kind === 'none') { flash('Une route part d\'un point d\'ancrage : cliquez sur un point orange', true); return; }
    if (!roadSegOk(sp.pt, sp.pt, roadKind.w)) { flash('Une route ne peut pas partir d\'un bâtiment', true); return; }
    draft = { type:'road', pts:[sp.pt], w:roadKind.w, kind:roadKind.id, parent:sp.parent || null };
  } else {
    const last = draft.pts[draft.pts.length - 1];
    if (segLen(last, sp.pt) < .3) return;
    const why = roadIssue(last, sp.pt, draft.w);
    if (why) {
      flash(why, true);
      return;
    }
    draft.pts.push(sp.pt);
  }
  requestDraw();
}
function finishDraft() {
  if (!draft) return;
  if (draft.type === 'wall') {
    if (draft.pts.length < 2) { flash('Une muraille a besoin d\'au moins deux points', true); return; }
    commit();
    const w = { id:S.nextId++, w:WALL_W, pts:draft.pts, lvl:1 };
    S.walls.push(w);
    draft = null; changed(true);
    flash(`Muraille de ${fmt(roadLen(w))} m ajoutée. Posez des tours sur ses angles`);
    return;
  }
  if (draft.pts.length >= 2) {
    commit();
    const r = { id:S.nextId++, kind:draft.kind, w:draft.w, pts:draft.pts, libre:true };
    S.roads.push(r);
    draft = null; changed(true);
    flash(`${{ terre:'Route en terre', gravier:'Route en gravier', pave:'Route pavée' }[r.kind]} de ${fmt(roadLen(r))} m ajoutée`);
    return;
  }
  flash('Une route a besoin d\'au moins deux points', true);
}
function removeLastPoint() {
  if (!draft) return;
  draft.pts.pop();
  if (!draft.pts.length) { draft = null; flash('Tracé annulé'); }
  requestDraw();
}
function swap() {
  if (tool === 'house' || !sel || sel.type !== 'house') {
    if (!preset.turn) { flash(`${preset.name} : orientation fixe (façade sur la rue)`, true); return; }
    swapped = !swapped; renderTool(); requestDraw(); return;
  }
  const h = findSel(), b = buildingOf(h);
  if (b && !b.turn) { flash(`${b.name} : orientation fixe (façade sur la rue)`, true); return; }
  const p = placeAt([h.x, h.y], h.d, h.f, h.id);
  if (!p || !p.ok) { flash('Pas assez de cases libres pour pivoter ici', true); return; }
  commit(); const { ok, ...g } = p; Object.assign(h, g, b ? {} : { type:typeName(g.f, g.d) }); changed(false);
}
function deleteSel() {
  const o = findSel(); if (!o) return;
  if (sel.type === 'lake') { flash('Un étang ne se supprime pas', true); return; }
  if (sel.type === 'road' && routeFixe(o)) { flash('Route commerciale : elle ne peut pas être supprimée', true); return; }
  commit();
  const key = COLL[sel.type];
  S[key] = S[key].filter(x => x.id !== o.id); // les bâtiments restent en place
  // une porte n'existe que sur sa route ; une tour que sur un point de muraille
  // une porte n'existe que sur sa route
  if (sel.type === 'road') S.gates = S.gates.filter(g => g.road !== o.id);
  if (sel.type === 'wall') {
    computeZones();
    S.towers = S.towers.filter(t => Z.wallNodes.some(q => segLen(q, [t.x, t.y]) < .6));
  }
  sel = null; changed(true);
}
function hitHouse(x, y) {
  for (let i = S.houses.length - 1; i >= 0; i--) if (inPoly([x, y], corners(S.houses[i]))) return S.houses[i];
  return null;
}
function hitRoad(x, y) {
  let best = null, bd = Infinity;
  for (const r of S.roads) for (let i = 0; i < r.pts.length - 1; i++) {
    const d = ptSeg([x, y], r.pts[i], r.pts[i+1]).d - r.w / 2;
    if (d < 5 / view.s && d < bd) { bd = d; best = r; }
  }
  return best;
}
