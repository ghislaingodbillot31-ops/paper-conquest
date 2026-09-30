function draw() {
  queued = false;
  if (!W) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = Col.sheet; ctx.fillRect(0, 0, W, H);
  if (atelier.on) { drawAtelier(); drawScale(); return; } // atelier : le bâtiment seul, sans la carte
  drawFrame();
  drawContours();
  drawWater();
  drawZones();
  drawRoads();
  drawBridges();
  drawWalls();
  drawFlora();
  const modeOf = (type, id) => isOn(type, id, sel) ? 'selected' : isOn(type, id, hover) ? 'hover' : 'normal';
  for (const g of S.gates) drawGate(g, modeOf('gate', g.id));
  for (const h of S.houses) drawHouse(h, modeOf('house', h.id));
  for (const t of S.towers) drawTower(t, modeOf('tower', t.id));
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
}
