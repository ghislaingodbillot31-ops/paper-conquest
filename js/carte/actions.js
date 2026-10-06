/* ---------- actions ---------- */
function commit() { undoStack.push(JSON.stringify(S)); if (undoStack.length > 150) undoStack.shift(); }
function changed(roadsChanged) {
  touchScene(); // le décor a changé : l'image gardée en mémoire est refaite
  if (roadsChanged) computeZones(); else computeOcc();
  computeFlora(); // les arbres cèdent la place aux nouvelles constructions
  sceneDiff();    // décor à repeindre autour de ce qui a changé
  save(); renderSel(); requestDraw();
}
function undo() {
  if (!undoStack.length) { flash('Rien à annuler'); return; }
  S = JSON.parse(undoStack.pop());
  if (sel && !findSel()) sel = null;
  draft = null; changed(true);
}
const COLL = { house:'houses', road:'roads', wall:'walls', tower:'towers', gate:'gates' };
const findById = (t, id) => (S[COLL[t]] || []).find(o => o.id === id) || null;
const findSel = () => !sel ? null : findById(sel.type, sel.id);
let toastT;
function flash(msg, bad) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast' + (bad ? ' bad' : ''); t.style.opacity = 1;
  clearTimeout(toastT); toastT = setTimeout(() => { t.style.opacity = 0; }, 2200);
}
function dims() {
  const b = custom || preset;
  return swapped ? { f:b.d, d:b.f } : { f:b.f, d:b.d };
}
function ghost() {
  if (tool !== 'house' || !cursor || drag && drag.kind === 'pan') return null;
  const { f, d } = dims();
  const g = placeAt(cursor, f, d, undefined, preset.turn);
  if (!g) return null;
  Object.assign(g, { kind:preset.id, type:preset.name }, preset.yard ? { yard:yardKind } : {});
  if (g.ok && preset.unique && S.houses.some(h => h.kind === preset.id)) { g.ok = false; g.why = `Un seul ${preset.name.toLowerCase()} par village`; }
  if (g.ok) { const why = needIssue(preset, g); if (why) { g.ok = false; g.why = why; } }
  return g;
}
function placeHouse() {
  const g = ghost();
  if (!g) { flash('Posez le bâtiment sur les cases vertes, le long d\'une route', true); return; }
  if (!g.ok) { flash(g.why || 'Pas assez de cases libres ici', true); return; }
  commit();
  const { ok, why, ...h } = g;
  S.houses.push({ id:S.nextId++, ...h });
  if (GAME) {                                                              // ressources du village : le bâtiment se paie, le camp de colon apporte le stock de départ
    const st = S.stock || (S.stock = {});
    for (const [k, q] of Object.entries(preset.cout || {})) st[k] = (st[k] || 0) - q;
    if (preset.id === 'camp_colon') for (const [k, q] of Object.entries(STOCK_DEPART)) st[k] = (st[k] || 0) + q;
  }
  changed(false);
  flash(`${h.type} : construction posée`);
}
