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
    else if (st.type === 'lake') { const P = lakeShape(o); ctx.setLineDash([6, 5]); strokeLine([...P, P[0]], mode === 'selected' ? 2.5 : 1.5, Col.accent); ctx.setLineDash([]); }
    else { ctx.setLineDash([6, 5]); strokeLine(st.type === 'road' ? smoothPts(o) : o.pts, mode === 'selected' ? 2 : 1.5, Col.accent); ctx.setLineDash([]); }
  }
}
function draw() {
  queued = false;
  if (!W) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (atelier.on) { ctx.fillStyle = Col.sheet; ctx.fillRect(0, 0, W, H); drawAtelier(); drawScale(); return; } // atelier : le bâtiment seul, sans la carte
  const pending = presentScene();                         // décor (tuiles)
  /* ORDRE : ce qui vit sous les arbres d'abord (animaux, bateaux, personnages — drawWorkers peint aussi la couche de cimes par-dessus eux), PUIS tout ce qui doit rester lisible et au-dessus des arbres : sélection, zones de travail, aperçus, noms, textes. */
  if (typeof drawFaune === 'function') drawFaune();
  if (typeof drawBateaux === 'function') drawBateaux();
  if (typeof drawTerrestres === 'function') drawTerrestres();
  if (typeof JR !== 'undefined' && JR.actif && JR.voies && typeof drawVoiesDev === 'function') drawVoiesDev();   // mode développeur : lignes de circulation
  drawWorkers();
  if (typeof JR !== 'undefined' && JR.actif && JR.infos && typeof drawInfosHab === 'function') drawInfosHab();   // mode développeur : satiété, soif, activité (dev.js)
  drawFrameMarks();
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
  if (typeof drawRessourcesGhost === 'function') drawRessourcesGhost();
  const g = ghost();
  if (g) drawHouse(g, g.ok ? 'ghost' : 'bad');
  else if (tool === 'house' && cursor && inTerrain(cursor) && !(drag && drag.kind === 'pan')) {
    const [X, Y] = toS(...cursor);
    ctx.font = '500 14px "IBM Plex Mono", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    haloText('Hors zone : approchez d\'une route', X + 12, Y - 8, Col.bad, Col.sheet);
  }
  if (deplacer && deplacer.preview) drawHouse(deplacer.preview, deplacer.preview.ok ? 'ghost' : 'bad');
  drawWorkZones();
  if (typeof drawChampApercu === 'function') drawChampApercu();
  if (typeof drawCaptureCibles === 'function') drawCaptureCibles();
  if (typeof drawEauPeche === 'function') drawEauPeche();
  if (typeof drawFauneNoms === 'function') drawFauneNoms();
  drawDraft();
  drawScale();
  updateStatus();
  if (typeof drawLumieres === 'function') drawLumieres();                              // nuit : voile et sources de lumière (lumieres.js)
  if (pending) requestDraw();                             // tuiles restantes : aux images suivantes
}
