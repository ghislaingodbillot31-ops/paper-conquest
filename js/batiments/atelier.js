/* ---------- atelier des bâtiments ----------
   Vue à part (demande du 30/09) : un simple carré de terrain avec UN bâtiment posé au milieu,
   sans la carte, pour travailler chaque bâtiment en détail (éditeur de bâtiments). */
const ATELIER_KEY = 'planVillageZonage.atelier';
const ATELIER_CUR = 'fosse_miniere';                      // bâtiment en cours de travail : l'atelier s'ouvre dessus une fois
let atelier = { on:true, kind:ATELIER_CUR, cur:ATELIER_CUR };
try { Object.assign(atelier, JSON.parse(localStorage.getItem(ATELIER_KEY) || '{}')); } catch (e) {}
if (atelier.cur !== ATELIER_CUR) Object.assign(atelier, { on:true, kind:ATELIER_CUR, cur:ATELIER_CUR });
atelier.on = PAGE === 'batiments';                // l'atelier n'existe que dans l'éditeur de bâtiments
const saveAtelier = () => { try { localStorage.setItem(ATELIER_KEY, JSON.stringify(atelier)); } catch (e) {} };
function atelierHouse() {
  const b = PRESETS.find(p => p.id === atelier.kind) || PRESETS.find(p => p.id === 'scierie');
  return { id:-1, x:0, y:0, a:0, w:b.f * CELL, l:b.d * CELL, f:b.f, d:b.d, kind:b.id, type:b.name, front:1,
    ...(b.yard ? { yard:yardKind } : {}) };
}
const atelierSide = () => { const h = atelierHouse(); return Math.max(h.w, h.l) + 16; }; // carré : le bâtiment + 8 m autour
function fitAtelier() {
  const side = atelierSide();
  view.s = Math.min((W - 60) / side, (H - 60) / side); view.ox = W / 2; view.oy = H / 2;
  requestDraw();
}
function drawAtelier() {
  const s = view.s, half = atelierSide() / 2, look = biomeLook();
  const [X0, Y0] = toS(-half, -half), Z = half * 2 * s;
  ctx.fillStyle = 'rgba(40,34,24,.25)'; ctx.fillRect(X0 + 6, Y0 + 8, Z, Z);                 // ombre du carré
  ctx.fillStyle = look.ground; ctx.fillRect(X0, Y0, Z, Z);                                  // terrain
  alignPatterns();
  if (s > 3 && PAT.herbe) { ctx.fillStyle = PAT.herbe; ctx.fillRect(X0, Y0, Z, Z); }       // brins d'herbe
  ctx.strokeStyle = Col['house-edge']; ctx.lineWidth = 1.5; ctx.strokeRect(X0, Y0, Z, Z);
  const h = atelierHouse();
  drawHouse(h, 'normal');
  ctx.font = '600 15px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  haloText(`${h.type} · ${h.f} × ${h.d} cases (${h.w} × ${h.l} m) · rue en haut`, W / 2, Y0 - 8, Col.ink, Col.sheet);
}
