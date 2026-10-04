/* Image de la carte en deux couches (anti-lag) :
   - le décor (sol, relief, eau, routes, ponts, murailles, végétation, bâtiments) : tuiles
     peintes une fois et affichées par la carte graphique (tuiles.js) ;
   - par-dessus, à chaque image, sur le canevas transparent : ce qui bouge ou dépend de la
     souris (sélection, survol, habitants, aperçu du bâtiment, tracé en cours, graduations). */
// sélection et survol : l'ouvrage est redessiné en surbrillance au-dessus du décor
function drawHighlights() {
  for (const st of [hover, sel]) {
    if (!st || (st === hover && sel && sel.type === hover.type && sel.id === hover.id)) continue;
    const o = findById(st.type, st.id); if (!o) continue;
    const mode = st === sel ? 'selected' : 'hover';
    if (st.type === 'house') drawHouse(o, mode);
    else if (st.type === 'gate') drawGate(o, mode);
    else if (st.type === 'tower') drawTower(o, mode);
    else { ctx.setLineDash([6, 5]); strokeLine(st.type === 'road' ? smoothPts(o) : o.pts, mode === 'selected' ? 2 : 1.5, Col.accent); ctx.setLineDash([]); }
  }
}
function draw() {
  queued = false;
  if (!W) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (atelier.on) { ctx.fillStyle = Col.sheet; ctx.fillRect(0, 0, W, H); drawAtelier(); drawScale(); return; } // atelier : le bâtiment seul, sans la carte
  const pending = presentScene();                         // décor (tuiles)
  if (typeof HORIZON !== 'undefined' && HORIZON) drawHorizonLabels(); else drawFrameMarks();   // (horizon : plus de cadre, mais le numéro des régions voisines)
  drawHighlights();
  if (tool === 'tower') {
    drawSpots(Z.wallNodes.filter(q => !S.towers.some(t => segLen([t.x, t.y], q) < .6)));
    const t = towerSpot();
    if (t && t.none) hint(S.walls.length ? 'Une tour se pose sur un point orange de la muraille' : 'Tracez d\'abord une fortification');
    else if (t) { drawTower(t, t.ok ? 'ghost' : 'bad'); if (!t.ok) hint(t.why); }
  }
  if (tool === 'gate') {
    drawSpots(gateAnchors().map(a => a.pt).filter(p => !S.gates.some(g => segLen([g.x, g.y], p) < GATE_L - .1)));
    const g = gateSpot();
    if (g && g.none) hint(S.roads.length ? 'Une porte se pose sur un point orange de route' : 'Tracez d\'abord une route');
    else if (g) { drawGate(g, g.ok ? 'ghost' : 'bad'); if (!g.ok) hint(g.why); }
  }
  const g = ghost();
  if (g) drawHouse(g, g.ok ? 'ghost' : 'bad');
  else if (tool === 'house' && cursor && inTerrain(cursor) && !(drag && drag.kind === 'pan')) {
    const [X, Y] = toS(...cursor);
    ctx.font = '500 11px "IBM Plex Mono", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    haloText('Hors zone : approchez d\'une route', X + 12, Y - 8, Col.bad, Col.sheet);
  }
  if (drag && drag.kind === 'house' && drag.preview) drawHouse(drag.preview, drag.preview.ok ? 'ghost' : 'bad');
  drawWorkZones();
  drawWorkers();
  drawDraft();
  drawScale();
  updateStatus();
  if (pending) requestDraw();                             // tuiles restantes : aux images suivantes
}
