/* ---------- navigation : poser et déplacer des bateaux sur la map test ----------
   Un bateau est un repère de S.bateaux { id, kind:'barque'|'bateau'|'navire', x, y, a (cap, rad) } (dessin : vehicules.js).
   - Poser : catégorie « Bateaux » + « Placer » ; un bateau ne se pose que sur l'eau (rivière, lac, mer), là où il a assez de largeur.
   - Déplacer : outil « Déplacer un bateau » : un clic sur un bateau le sélectionne, un clic sur l'eau l'y envoie.
   Le chemin se calcule sur une grille d'eau de 5 m (rivières et lacs remplis ligne par ligne, mer = hors terre), en ne gardant que les cases assez larges pour
   la coque (distance à la rive) : un navire ne remonte pas un petit cours d'eau. Chemin A*, puis lissé ; le bateau tourne selon sa taille et laisse un sillage. */
const NAV = { cell:5, W:0, H:0, mask:null, clear:null, key:null, g:null, from:null };
const NAV_VITESSE = { barque:5, bateau:9, navire:12 };                      // m/s (accéléré : la carte fait 6 km)
const NAV_VIRAGE = { barque:1.3, bateau:.7, navire:.4 };                     // rad/s
const navRt = new Map();                                                     // état de mouvement (non enregistré) : id → { wp, v, trail, dist }
let navSel = null, navAcc = 0;

function navEau(x, y) {                                                      // eau en un point (exact)
  if (!inTerrain([x, y])) return false;
  if (!surTerre([x, y])) return true;
  for (const lst of [Z.water.river, Z.water.lake]) for (const q of lst) if (x > q.bb[0] && x < q.bb[2] && y > q.bb[1] && y < q.bb[3] && inPoly([x, y], q.P)) return true;
  return false;
}
function navGrille() {                                                       // grille d'eau + distance à la rive, refaite quand l'eau de la carte change
  if (NAV.key === Z.water && NAV.mask) return;
  NAV.key = Z.water; const c = NAV.cell, W = NAV.W = Math.ceil(TW / c), H = NAV.H = Math.ceil(TH / c), m = NAV.mask = new Uint8Array(W * H);
  if (FORME) for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (!surTerre([(i + .5) * c, (j + .5) * c])) m[j * W + i] = 1;                  // mer
  for (const q of [...Z.water.river, ...Z.water.lake]) {                                                                                         // cours d'eau et lacs : une case est d'eau si son centre est dans le tracé (remplissage par lignes)
    const P = q.P, n = P.length, j0 = Math.max(0, Math.floor(q.bb[1] / c - .5)), j1 = Math.min(H - 1, Math.ceil(q.bb[3] / c));
    for (let j = j0; j <= j1; j++) {
      const y = (j + .5) * c, xs = [];
      for (let a = 0, b = n - 1; a < n; b = a++) { const A = P[a], B = P[b]; if ((A[1] > y) !== (B[1] > y)) xs.push(A[0] + (y - A[1]) / (B[1] - A[1]) * (B[0] - A[0])); }
      xs.sort((u, v) => u - v);
      for (let k = 0; k + 1 < xs.length; k += 2) { const i0 = Math.max(0, Math.ceil(xs[k] / c - .5)), i1 = Math.min(W - 1, Math.floor(xs[k + 1] / c - .5)); for (let i = i0; i <= i1; i++) m[j * W + i] = 1; }
    }
  }
  const d = NAV.clear = new Uint8Array(W * H), INF = 250;                      // distance à la terre, en tiers de case (chanfrein 3-4)
  for (let k = 0; k < W * H; k++) d[k] = m[k] ? INF : 0;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; if (!d[k]) continue; let v = d[k];
    if (i > 0) v = Math.min(v, d[k - 1] + 3); if (j > 0) { v = Math.min(v, d[k - W] + 3); if (i > 0) v = Math.min(v, d[k - W - 1] + 4); if (i < W - 1) v = Math.min(v, d[k - W + 1] + 4); } d[k] = v; }
  for (let j = H - 1; j >= 0; j--) for (let i = W - 1; i >= 0; i--) { const k = j * W + i; if (!d[k]) continue; let v = d[k];
    if (i < W - 1) v = Math.min(v, d[k + 1] + 3); if (j < H - 1) { v = Math.min(v, d[k + W] + 3); if (i < W - 1) v = Math.min(v, d[k + W + 1] + 4); if (i > 0) v = Math.min(v, d[k + W - 1] + 4); } d[k] = v; }
}
const navBesoin = b => Math.max(1, Math.ceil((VEHICULES[b.kind].B * VEHICULES[b.kind].T / 2 + 3) / NAV.cell * 3));   // dégagement requis (tiers de case) : la demi-largeur de la coque
const navOk = (i, j, need) => i >= 0 && j >= 0 && i < NAV.W && j < NAV.H && NAV.mask[j * NAV.W + i] && NAV.clear[j * NAV.W + i] >= need;
function navProche(x, y, need, R = 10) {                                     // case navigable la plus proche d'un point
  const c = NAV.cell, i0 = Math.floor(x / c), j0 = Math.floor(y / c); let best = null, bd = 1e9;
  for (let j = j0 - R; j <= j0 + R; j++) for (let i = i0 - R; i <= i0 + R; i++) if (navOk(i, j, need)) { const d = (i - i0) ** 2 + (j - j0) ** 2; if (d < bd) { bd = d; best = [i, j]; } }
  return best;
}
function navChemin(b, x1, y1) {                                              // A* de la position du bateau à (x1, y1) : liste de points (m), ou null
  navGrille(); const need = navBesoin(b), c = NAV.cell, W = NAV.W, H = NAV.H, N = W * H;
  const s = navProche(b.x, b.y, need, 12), g = navProche(x1, y1, need, 12); if (!s || !g) return null;
  if (!NAV.g) { NAV.g = new Float32Array(N); NAV.from = new Int32Array(N); }
  const G = NAV.g, F = NAV.from; G.fill(Infinity);
  // tas binaire dans deux tableaux typés (rapide, sans objet par entrée) ; heuristique légèrement gourmande (1,15) : chemin presque optimal, bien moins de cases explorées
  let cap = 1 << 20, hf = new Float32Array(cap), hk = new Int32Array(cap), hn = 0;
  const push = (f, k) => {
    if (hn === cap) { cap *= 2; const nf = new Float32Array(cap), nk = new Int32Array(cap); nf.set(hf); nk.set(hk); hf = nf; hk = nk; }
    let i = hn++; while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= f) break; hf[i] = hf[p]; hk[i] = hk[p]; i = p; } hf[i] = f; hk[i] = k;
  };
  const pop = () => {
    const k0 = hk[0], f = hf[--hn], k = hk[hn]; let i = 0;
    for (;;) { let l = 2 * i + 1; if (l >= hn) break; if (l + 1 < hn && hf[l + 1] < hf[l]) l++; if (hf[l] >= f) break; hf[i] = hf[l]; hk[i] = hk[l]; i = l; }
    if (hn > 0) { hf[i] = f; hk[i] = k; } return k0;
  };
  const sk = s[1] * W + s[0], gk = g[1] * W + g[0], hh = (i, j) => { const dx = Math.abs(i - g[0]), dy = Math.abs(j - g[1]); return 1.15 * (Math.max(dx, dy) + .414 * Math.min(dx, dy)); };
  G[sk] = 0; F[sk] = -1; push(hh(s[0], s[1]), sk); let found = false; const closed = new Uint8Array(N);
  while (hn) {
    const k = pop(); if (closed[k]) continue; closed[k] = 1; if (k === gk) { found = true; break; }
    const i = k % W, j = (k / W) | 0, gk0 = G[k];
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue; const ni = i + di, nj = j + dj; if (!navOk(ni, nj, need)) continue;
      if (di && dj && !(navOk(i + di, j, need) && navOk(i, j + dj, need))) continue;                          // pas de coupe de coin à travers la terre
      const nk = nj * W + ni, ng = gk0 + (di && dj ? 1.414 : 1); if (ng < G[nk]) { G[nk] = ng; F[nk] = k; push(ng + hh(ni, nj), nk); }
    }
  }
  if (!found) return null;
  const cells = []; for (let k = gk; k !== -1; k = F[k]) cells.push([(k % W + .5) * c, (((k / W) | 0) + .5) * c]); cells.reverse();
  const libre = (A, B) => { const n = Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1]) / (c * .5)); for (let t = 1; t < n; t++) { const x = A[0] + (B[0] - A[0]) * t / n, y = A[1] + (B[1] - A[1]) * t / n; if (!navOk(Math.floor(x / c), Math.floor(y / c), need)) return false; } return true; };
  const out = [cells[0]]; let a = 0;                                                                              // lissage : on saute les points intermédiaires quand la ligne droite est libre
  while (a < cells.length - 1) { let z = cells.length - 1; while (z > a + 1 && !libre(cells[a], cells[z])) z--; out.push(cells[z]); a = z; }
  if (navEau(x1, y1)) out.push([x1, y1]);
  return out;
}

// ---- poser ----
function placeBateau(p, kind) {
  navGrille(); const a = VEHICULES[kind], need = navBesoin({ kind }), i = Math.floor(p[0] / NAV.cell), j = Math.floor(p[1] / NAV.cell);
  if (!navOk(i, j, need)) { flash(a.nom + ' : il faut de l\'eau, assez large pour la coque', true); return; }
  commit(); (S.bateaux = S.bateaux || []).push({ id:Math.max(0, ...S.bateaux.map(b => b.id || 0)) + 1, kind, x:round2(p[0]), y:round2(p[1]), a:0 });
  save(); requestDraw(); flash(a.nom + ' posé');
}
const navBateauAu = p => (S.bateaux || []).find(b => { const a = VEHICULES[b.kind], T = a.T, dx = p[0] - b.x, dy = p[1] - b.y, c = Math.cos(b.a), s = Math.sin(b.a), lx = dx * c + dy * s, ly = -dx * s + dy * c; return Math.abs(lx) < T * .55 + 1.5 && Math.abs(ly) < a.B * T / 2 + 1.5; });
// ---- déplacer : un clic sur un bateau le choisit, un clic sur l'eau l'y envoie ----
function naviguer(p) {
  const hit = navBateauAu(p);
  if (hit) { navSel = navSel === hit.id ? null : hit.id; flash(navSel ? VEHICULES[hit.kind].nom + ' choisi : cliquez sur l\'eau pour l\'y envoyer' : 'Bateau relâché'); requestDraw(); return; }
  const b = (S.bateaux || []).find(o => o.id === navSel);
  if (!b) { flash('Cliquez d\'abord sur un bateau', true); return; }
  const path = navChemin(b, p[0], p[1]);
  if (!path || path.length < 2) { flash('Aucun passage par l\'eau jusqu\'ici pour ce bateau', true); return; }
  navRt.set(b.id, { wp:path.slice(1), v:0, trail:[], dist:0 }); requestDraw();
}
RESSOURCE_OUTILS.naviguer = naviguer;

// ---- mouvement ----
function bateauxStep(dt) {
  const L = S.bateaux || []; if (!L.length) return false;
  let bouge = false;
  for (const b of L) {
    const r = navRt.get(b.id); if (!r || !r.wp.length) continue;
    const t = r.wp[0], dx = t[0] - b.x, dy = t[1] - b.y, d = Math.hypot(dx, dy), want = Math.atan2(dy, dx);
    let da = want - b.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    const vir = NAV_VIRAGE[b.kind]; b.a += Math.max(-vir * dt, Math.min(vir * dt, da));
    const vmax = NAV_VITESSE[b.kind] * (r.wp.length === 1 ? Math.min(1, .25 + d / 25) : 1) * (1 - Math.min(.65, Math.abs(da) / 1.6));      // ralentit dans les virages et à l'arrivée
    r.v += (vmax - r.v) * Math.min(1, dt * 1.5);
    const step = Math.min(d, r.v * dt); b.x += Math.cos(b.a) * step; b.y += Math.sin(b.a) * step; r.dist += step;
    if (r.dist > 1.2) { r.dist = 0; r.trail.push([b.x - Math.cos(b.a) * VEHICULES[b.kind].T * .4, b.y - Math.sin(b.a) * VEHICULES[b.kind].T * .4, 0]); if (r.trail.length > 36) r.trail.shift(); }
    if (d < 4 + r.v * .3) { r.wp.shift(); if (!r.wp.length) { r.v = 0; save(); } }
    bouge = true;
  }
  for (const r of navRt.values()) for (const q of r.trail) q[2] += dt;                                       // le sillage s'efface
  navAcc += dt; if (navAcc < 1 / 30 && !bouge) return false; navAcc = 0;
  return bouge || [...navRt.values()].some(r => r.trail.length);
}
// ---- dessin ----
function drawBateaux() {
  const L = S.bateaux || []; if (!L.length) return;
  const s = view.s, [x0, y0] = toW(0, 0), [x1, y1] = toW(W, H);
  for (const b of L) {                                                                                            // sillages
    const r = navRt.get(b.id); if (!r) continue;
    for (const q of r.trail) { const age = q[2]; if (age > 6) continue; const [X, Y] = toS(q[0], q[1]), R = (VEHICULES[b.kind].B * VEHICULES[b.kind].T * (.5 + age * .12)) * s; ctx.beginPath(); ctx.ellipse(X, Y, R, R * .55, b.a, 0, 7); ctx.strokeStyle = 'rgba(255,255,255,' + (.38 * (1 - age / 6)).toFixed(3) + ')'; ctx.lineWidth = Math.max(1, VEHICULES[b.kind].B * VEHICULES[b.kind].T * .12 * s); ctx.stroke(); }
  }
  for (const b of L) {
    const a = VEHICULES[b.kind], T = a.T; if (b.x < x0 - T || b.x > x1 + T || b.y < y0 - T || b.y > y1 + T) continue;
    const r = navRt.get(b.id), [X, Y] = toS(b.x, b.y), Ls = Math.max(6, T * s), bob = r && r.v > .5 ? Math.sin(performance.now() / 260 + b.id) * .012 : 0;
    peintBateau(b.kind, X, Y, Ls, b.a + bob);
    if (b.id === navSel) { ctx.save(); ctx.translate(X, Y); ctx.rotate(b.a); ctx.setLineDash([6, 4]); ctx.strokeStyle = '#d64541'; ctx.lineWidth = 2; ctx.strokeRect(-Ls * .6, -Math.max(Ls * a.B * .8, 8), Ls * 1.2, Math.max(Ls * a.B * 1.6, 16)); ctx.restore(); ctx.setLineDash([]); }
    if (b.id === navSel && r && r.wp.length) {                                                                    // trajet prévu et destination
      ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(214,69,65,.85)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(X, Y); for (const w of r.wp) ctx.lineTo(...toS(w[0], w[1])); ctx.stroke(); ctx.setLineDash([]);
      const [DX, DY] = toS(...r.wp[r.wp.length - 1]); ctx.beginPath(); ctx.arc(DX, DY, 7, 0, 7); ctx.moveTo(DX - 4, DY - 4); ctx.lineTo(DX + 4, DY + 4); ctx.moveTo(DX + 4, DY - 4); ctx.lineTo(DX - 4, DY + 4); ctx.stroke();
    }
    if (s > .12) { ctx.font = '600 14px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; haloText(a.nom, X, Y + Math.max(Ls * a.B * .7, 10) + 4, Col.ink, Col.sheet); }
  }
}
