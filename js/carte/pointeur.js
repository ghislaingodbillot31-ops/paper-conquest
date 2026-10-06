/* ---------- pointeur ---------- */
const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
function pinchState() {
  const [a, b] = [...pointers.values()];
  return { d:Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, cx:(a[0] + b[0]) / 2, cy:(a[1] + b[1]) / 2 };
}
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId);
  const [px, py] = pos(e);
  pointers.set(e.pointerId, [px, py]);
  if (pointers.size === 2) { drag = null; pinch = pinchState(); return; }
  if (pointers.size > 2) return;
  cursor = toW(px, py);
  const base = { sx:px, sy:py, ox:view.ox, oy:view.oy };
  if (e.button === 2 && (tool === 'road' || tool === 'wall') && draft) { removeLastPoint(); return; }
  if (e.button === 1 || e.button === 2 || spaceDown) { drag = { kind:'pan', ...base }; return; }
  if (e.button !== 0) return;
  if (tool === 'select' && !zoneEdit) {
    const hit = hitAny(...cursor);
    if (hit) {
      sel = hit;
      if (hit.type === 'house') drag = { kind:'house', id:hit.id, ...base };
      renderSel(); requestDraw(); return;
    }
  }
  drag = { kind:'tap', ...base };
});
cv.addEventListener('pointermove', e => {
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
    if (tool === 'select') {
      hover = hitAny(...cursor);
      cv.style.cursor = hover ? (hover.type === 'house' ? 'grab' : 'pointer') : 'default';
    } else { hover = null; cv.style.cursor = 'crosshair'; }
    requestDraw(); return;
  }
  if (drag.kind === 'tap' && Math.hypot(px - drag.sx, py - drag.sy) > 5) drag.kind = 'pan';
  if (drag.kind === 'pan') {
    view.ox = drag.ox + px - drag.sx; view.oy = drag.oy + py - drag.sy; clampView(); cv.style.cursor = 'grabbing';
  } else if (drag.kind === 'house' && Math.hypot(px - drag.sx, py - drag.sy) > 5) {
    const h = findById('house', drag.id);
    drag.preview = placeAt(cursor, h.f, h.d, h.id, !buildingOf(h) || buildingOf(h).turn);
    const bk = buildingOf(h), pv = drag.preview;
    if (bk && pv && pv.ok) { const why = needIssue(bk, { ...pv, id:h.id }); if (why) { pv.ok = false; pv.why = why; } }
    cv.style.cursor = 'grabbing';
  }
  requestDraw();
});
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
    else if (tool === 'tower') placeTower();
    else if (tool === 'gate') placeGate();
    else if (zoneEdit) applyZone();
    else { sel = null; renderSel(); }
  } else if (d.kind === 'house' && d.preview) {
    if (d.preview.ok) {
      const h = findById('house', d.id); commit();
      const { ok, ...g } = d.preview; Object.assign(h, g); changed(false);
    } else flash('Pas assez de cases libres ici, le bâtiment reste en place', true);
  }
  if (e.pointerType !== 'mouse') cursor = null;
  requestDraw();
}
cv.addEventListener('pointerup', endPointer);
cv.addEventListener('pointercancel', endPointer);
cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !drag) { cursor = null; hover = null; requestDraw(); } });
cv.addEventListener('wheel', e => {
  e.preventDefault();
  const [px, py] = pos(e);
  zoomAt(px, py, Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0015)));
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
      if (zoneEdit) { zoneEdit = null; renderSel(); requestDraw(); break; }
      if (draft) { draft = null; requestDraw(); }
      else if (sel) { sel = null; renderSel(); requestDraw(); }
      break;
  }
});
addEventListener('keyup', e => {
  if (e.key === ' ') spaceDown = false;
});
