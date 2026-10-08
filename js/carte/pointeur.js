/* ---------- pointeur ---------- */
const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
function pinchState() {
  const [a, b] = [...pointers.values()];
  return { d:Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, cx:(a[0] + b[0]) / 2, cy:(a[1] + b[1]) / 2 };
}
cv.addEventListener('contextmenu', e => e.preventDefault());
// clic molette : pas de défilement automatique du navigateur (sinon le bouton est « perdu » et la caméra suit la souris sans fin)
cv.addEventListener('mousedown', e => { if (e.button === 1 || e.button >= 3) e.preventDefault(); });   // (boutons latéraux : pas de « page précédente » du navigateur)
cv.addEventListener('mouseup', e => { if (e.button >= 3) e.preventDefault(); });
cv.addEventListener('auxclick', e => { if (e.button === 1 || e.button >= 3) e.preventDefault(); });
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId);
  const [px, py] = pos(e);
  pointers.set(e.pointerId, [px, py]);
  if (pointers.size === 2) { drag = null; pinch = pinchState(); return; }
  if (pointers.size > 2) return;
  cursor = toW(px, py);
  if (typeof planteTip === 'function') planteTip(e, null);
  const base = { sx:px, sy:py, ox:view.ox, oy:view.oy };
  if (e.button === 2 && (tool === 'road' || tool === 'wall') && draft) { removeLastPoint(); return; }
  if (e.button === 2 && tool === 'select' && hitHouse(...cursor)) return;               // clic droit sur un bâtiment : rien
  if (e.button === 1 || e.button === 2 || spaceDown) { drag = { kind:'pan', ...base }; return; }
  if (e.button !== 0) return;
  if (captureEdit) { choisirCapture(); return; }                                           // capture : un clic sur un animal sauvage
  if (eauEdit) { choisirEau(); return; }                                                   // plan d'eau de pêche : un clic sur un étang ou une rivière
  if (deplacer) { majDeplacement(); poserDeplacement(); return; }                       // déplacement demandé depuis la fiche : un clic pose le bâtiment
  if (tool === 'select' && !zoneEdit) {
    const hit = hitAny(...cursor);
    if (hit) {
      sel = hit;
      renderSel(); requestDraw(); return;
    }
  }
  drag = { kind:'tap', ...base };
});
cv.addEventListener('pointermove', e => {
  if (drag && e.pointerType === 'mouse' && e.buttons === 0) { endPointer(e); return; }   // plus aucun bouton enfoncé : le glisser est fini (relâché hors du cadre, ou perdu)
  const [px, py] = pos(e);
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, [px, py]);
  if (pinch) {
    if (pointers.size < 2) return;
    const n = pinchState();
    zoomAt(n.cx, n.cy, n.d / pinch.d);
    view.ox += n.cx - pinch.cx; view.oy += n.cy - pinch.cy; clampView();
    pinch = n; return;
  }
  cursor = toW(px, py);
  if (!drag) {
    if (captureEdit || eauEdit) { cv.style.cursor = 'crosshair'; requestDraw(); return; }
    if (deplacer) { majDeplacement(); cv.style.cursor = 'crosshair'; requestDraw(); return; }
    if (tool === 'select') {
      hover = hitAny(...cursor);
      cv.style.cursor = hover ? ('pointer') : 'default';
    } else { hover = null; cv.style.cursor = 'crosshair'; }
    if (typeof planteTip === 'function') planteTip(e, tool === 'select' && !hover ? cursor : null);   // infobulle d'une plante
    requestDraw(); return;
  }
  if (drag.kind === 'tap' && Math.hypot(px - drag.sx, py - drag.sy) > 5) drag.kind = 'pan';
  if (drag.kind === 'pan') {
    view.ox = drag.ox + px - drag.sx; view.oy = drag.oy + py - drag.sy; clampView(); cv.style.cursor = 'grabbing';
  }
  requestDraw();
});
/* Déplacer un bâtiment : bouton « Déplacer » de la fiche, puis un clic sur la carte (Échap annule). Plus de glisser-déposer. */
function majDeplacement() {
  const h = findById('house', deplacer.id); if (!h || !cursor) { deplacer.preview = null; return; }
  const bk = buildingOf(h), pv = bk && bk.sur === 'gisement' ? placeSurGisement(cursor, h.f, h.d, h.id) : placeAt(cursor, h.f, h.d, h.id, !bk || bk.turn);
  if (bk && pv && pv.ok) { const why = needIssue(bk, { ...pv, id:h.id }); if (why) { pv.ok = false; pv.why = why; } }
  deplacer.preview = pv;
}
function poserDeplacement() {
  const pv = deplacer.preview, h = findById('house', deplacer.id);
  if (!h) { deplacer = null; return; }
  if (!pv || !pv.ok) { flash((pv && pv.why) || 'Pas assez de cases libres ici', true); return; }
  commit(); const { ok, ...g } = pv; Object.assign(h, g); deplacer = null; changed(false); flash('Bâtiment déplacé');
}
function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pinch) { if (pointers.size < 2) pinch = null; drag = null; return; }
  if (!drag) return;
  const d = drag; drag = null;
  if (atelier.on) { requestDraw(); return; } // atelier : on regarde seulement (pas de construction)
  if (d.kind === 'tap') {
    if (tool === 'house') placeHouse();
    else if (tool === 'road' || tool === 'wall') addRoadPoint();
    else if (typeof RESSOURCE_OUTILS !== 'undefined' && RESSOURCE_OUTILS[tool]) RESSOURCE_OUTILS[tool](cursor);
    else if (tool === 'champ') clicChamp();
    else if (tool === 'tower') placeTower();
    else if (tool === 'gate') placeGate();
    else if (zoneEdit) applyZone();
    else { sel = null; renderSel(); }
  }
  if (e.pointerType !== 'mouse') cursor = null;
  requestDraw();
}
cv.addEventListener('pointerup', endPointer);
cv.addEventListener('pointercancel', endPointer);
cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !drag) { cursor = null; hover = null; if (typeof planteTip === 'function') planteTip(e, null); requestDraw(); } });
cv.addEventListener('wheel', e => {
  e.preventDefault();
  const [px, py] = pos(e);
  zoomAt(px, py, Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0015)));
  if (drag && drag.kind === 'pan') { drag.ox = view.ox; drag.oy = view.oy; drag.sx = px; drag.sy = py; }   // glisser en cours : on repart de la vue zoomée (sinon la caméra saute au prochain mouvement)
}, { passive:false });

addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input,textarea,select')) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
  if (e.key === ' ') { spaceDown = true; e.preventDefault(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  switch (e.key) {
    case '1': setTool('select'); break;
    case '2': setTool('house'); break;
    case '3': setTool('road'); break;
    case '4': setTool('wall'); break;
    case '5': setTool('tower'); break;
    case '6': setTool('gate'); break;
    case 'g': case 'G': setOpt('grid', !opts.grid); flash(opts.grid ? 'Quadrillage affiché' : 'Quadrillage masqué'); break;
    case 'r': case 'R': swap(); break;
    case 'Delete': case 'Backspace': e.preventDefault(); deleteSel(); break;
    case 'Enter': finishDraft(); break;
    case '[': case ']':
      if (zoneEdit) {
        const b = buildingOf(findById('house', zoneEdit.id));
        zoneEdit.r = Math.max(ZONE_MIN_R, Math.min(b.radius, zoneEdit.r + (e.key === ']' ? 5 : -5)));
        renderSel(); requestDraw();
      }
      break;
    case 'Escape':
      if (captureEdit) { captureEdit = null; renderSel(); requestDraw(); break; }
      if (eauEdit) { eauEdit = null; renderSel(); requestDraw(); break; }
      if (deplacer) { deplacer = null; flash('Déplacement annulé'); requestDraw(); break; }
      if (zoneEdit) { zoneEdit = null; renderSel(); requestDraw(); break; }
      if (draft) { draft = null; requestDraw(); }
      else if (sel) { sel = null; renderSel(); requestDraw(); }
      break;
  }
});
addEventListener('keyup', e => {
  if (e.key === ' ') spaceDown = false;
});
