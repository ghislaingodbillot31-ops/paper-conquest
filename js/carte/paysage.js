/* ---------- paysage ----------
   Bruit de valeur à plusieurs octaves, tiré d'une graine (S.landSeed) : il colore le sol
   (herbe claire → herbe foncée) et règle la densité des arbres (bosquets dans le foncé).
   Les candidats arbres / buissons sont fixés par la graine ; on retire ensuite ceux
   qui tombent sur l'eau, une route, une muraille, un ouvrage, un bâtiment ou une case. */
function seeded(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
// bruit de valeur lissé (0 à 1) sur une grille de 64 × 64 tirée de la graine
function valueNoise(seed) {
  const rnd = seeded(seed), G = 64, grid = Array.from({ length:G * G }, rnd);
  const at = (x, y) => grid[(((y % G) + G) % G) * G + (((x % G) + G) % G)];
  const sm = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}
let noiseFn = null, noiseSeed = null;
function landNoise() {
  if (noiseFn && noiseSeed === S.landSeed) return noiseFn;
  const v = valueNoise(S.landSeed);
  noiseSeed = S.landSeed;
  // x, y en mètres : massifs (260 m), grandes nappes (60 m), taches (22 m), grain (8 m)
  return noiseFn = (x, y) => v(x / 260 + 31, y / 260 + 47) * .4 + v(x / 60, y / 60) * .36 + v(x / 22 + 17, y / 22 + 5) * .18 + v(x / 8 + 3, y / 8 + 11) * .06;
}

/* ---------- relief ----------
   Altitude (m) sur une grille de 2 m, tirée de S.reliefSeed : collines de ~95 m et
   mamelons de ~38 m. La rivière creuse sa vallée, le lac repose dans une cuvette.
   Les cases trop pentues ne se bâtissent pas ; une route ne dépasse pas 15 %. */
// réglages mesurés sur la grande carte : ~0 à 29 m d'altitude, ~2 à 3 % des cases trop
// pentues pour bâtir ; avec la graine 366, les routes de l'exemple restent sous 17 %.
// Grille d'altitude au pas de 4 m (501 × 376 points).
const RELIEF_H = 30, HG = 4, HW = TW / HG + 1, HH = TH / HG + 1;
// relief mis de côté pour le moment (demande du 28/09) : terrain plat, sans courbes ni
// ombrage ni limite de pente. Repasser à true pour le retrouver tel quel.
const RELIEF_ON = false;
const CONTOUR = 2, CELL_MAX_SLOPE = .2, ROAD_MAX_SLOPE = .18;
let hGrid = null, hKey = null, contours = null;
function reliefKey() {
  const rs = S.rivers.map(r => r.pts.length + ':' + r.pts[0] + ':' + r.pts[r.pts.length >> 1]).join(';');
  const ls = S.lakes.map(l => l.c + ':' + l.pts[0]).join(';');
  return [S.reliefSeed, rs || '-', ls || '-'].join('|');
}
function heightGrid() {
  const key = RELIEF_ON ? reliefKey() : 'plat';
  if (hGrid && hKey === key) return hGrid;
  if (!RELIEF_ON) { hKey = key; contours = null; return hGrid = new Float32Array(HW * HH); }
  const v = valueNoise(S.reliefSeed), g = new Float32Array(HW * HH);
  const lakes = S.lakes.map(lk => ({ c:lk.c, R:lk.pts.reduce((s, p) => s + segLen(p, lk.c), 0) / lk.pts.length }));
  // distance à la berge la plus proche, calculée seulement autour de chaque tronçon
  // (au-delà de 100 m la vallée ne creuse plus rien) : rapide même sur la grande carte
  const dist = new Float32Array(HW * HH).fill(Infinity);
  for (const rv of S.rivers) {
    const R = rv.w1 / 2 + 100;
    for (let k = 1; k < rv.pts.length; k++) {
      const a = rv.pts[k-1], b = rv.pts[k];
      const i0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - R) / HG)), i1 = Math.min(HW - 1, Math.ceil((Math.max(a[0], b[0]) + R) / HG));
      const j0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - R) / HG)), j1 = Math.min(HH - 1, Math.ceil((Math.max(a[1], b[1]) + R) / HG));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const d = ptSeg([i * HG, j * HG], a, b).d - rv.w1 / 2, idx = j * HW + i;
        if (d < dist[idx]) dist[idx] = d;
      }
    }
  }
  for (let j = 0; j < HH; j++) for (let i = 0; i < HW; i++) {
    const x = i * HG, y = j * HG;
    // collines larges (~150 m) et ondulations (~60 m), à l'échelle de la grande carte
    let h = RELIEF_H * (v(x / 150, y / 150) * .72 + v(x / 60 + 9, y / 60 + 4) * .28);
    const d = dist[j * HW + i];
    if (d < Infinity) h -= 5 * Math.exp(-((Math.max(0, d) / 32) ** 2)); // vallée
    let basin = 0;
    for (const lk of lakes) basin = Math.max(basin, 5 * Math.exp(-((Math.max(0, segLen([x, y], lk.c) - lk.R) / 26) ** 2)));
    h -= basin; // cuvette
    g[j * HW + i] = Math.max(0, h);
  }
  hKey = key; contours = null;
  return hGrid = g;
}
function hAt(x, y) {
  const g = heightGrid();
  const fx = Math.max(0, Math.min(HW - 1.001, x / HG)), fy = Math.max(0, Math.min(HH - 1.001, y / HG));
  const i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j;
  const a = g[j * HW + i], b = g[j * HW + i + 1], c = g[(j + 1) * HW + i], d = g[(j + 1) * HW + i + 1];
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}
// dénivelé d'une case : écart d'altitude entre ses coins, rapporté à sa diagonale
const tooSteep = poly => { const h = poly.map(p => hAt(p[0], p[1])); return (Math.max(...h) - Math.min(...h)) / (CELL * Math.SQRT2) > CELL_MAX_SLOPE; };
// courbes de niveau par carrés marchants : [x1, y1, x2, y2, altitude]
function contourSegments() {
  const g = heightGrid();
  if (contours) return contours;
  const out = [];
  for (let j = 0; j < HH - 1; j++) for (let i = 0; i < HW - 1; i++) {
    const v = [g[j * HW + i], g[j * HW + i + 1], g[(j + 1) * HW + i + 1], g[(j + 1) * HW + i]];
    const p = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
    const lo = Math.ceil(Math.min(...v) / CONTOUR) * CONTOUR, hi = Math.max(...v);
    for (let L = lo; L <= hi; L += CONTOUR) {
      const pts = [];
      for (let e = 0; e < 4; e++) {
        const a = v[e], b = v[(e + 1) % 4];
        if ((a < L) !== (b < L)) {
          const t = (L - a) / (b - a), A = p[e], B = p[(e + 1) % 4];
          pts.push((A[0] + (B[0] - A[0]) * t) * HG, (A[1] + (B[1] - A[1]) * t) * HG);
        }
      }
      if (pts.length >= 4) out.push([pts[0], pts[1], pts[2], pts[3], L]);
      if (pts.length === 8) out.push([pts[4], pts[5], pts[6], pts[7], L]);
    }
  }
  return contours = out;
}
let floraCands = null, floraSeed = null;
// étendue des grandes forêts : bruit très lisse (massifs de 300 m, contours de 70 m)
function forestNoise() {
  const v = valueNoise(S.landSeed + 4242);
  return (x, y) => v(x / 300 + 11, y / 300 + 23) * .68 + v(x / 70 + 5, y / 70 + 9) * .32;
}
/* Arbres d'automne, façon carte peinte : de gros houppiers (6 à 12 m de large), serrés
   dans les bois, en bosquets à leur lisière, isolés ailleurs ; plus une lisière d'arbres
   au bord des lacs et, plus clairsemée, le long des rivières. */
function floraCandidates() {
  const wk = S.lakes.map(l => l.c.join(',')).join(';') + '|' + S.rivers.map(r => r.pts.length + ':' + r.pts[0]).join(';');
  const base = S.roads.filter(r => !r.libre);   // routes de base : les seules dont dépend la végétation fixe ; celles du joueur ne la font qu'effacer (computeFlora)
  const fk = S.landSeed + ':' + S.biome + ':' + wk + '|' + base.map(r => r.id + ':' + r.pts.length + ':' + r.pts[0] + ':' + r.pts[r.pts.length - 1]).join(';') + '|' + (typeof baiesSignature === 'function' ? baiesSignature() : '');
  if (MONDE_PLAT) return floraCands = [];                                       // monde plat : aucune végétation
  if (floraCands && floraSeed === fk) return floraCands;
  const rnd = seeded(S.landSeed * 7 + 3), nz = landNoise(), fz = forestNoise(), out = [], B = biomeOf().flora, look = biomeLook();
  // essence de chaque arbre (tirée selon les parts du biome) et taille propre à l'essence :
  // conifères plus étroits, acacias larges, palmiers moyens ; toundra : arbres nains
  const sp = Object.entries(look.species), spTotal = sp.reduce((s, [, w]) => s + w, 0);
  const pick = () => { let r = rnd() * spTotal; for (const [k, w] of sp) if ((r -= w) < 0) return k; return sp.length ? sp[sp.length - 1][0] : 'f'; };
  const SIZE = { f:[3.2, 2.6], c:[2.4, 1.6], a:[3.6, 2.4], p:[3, 1.4] };
  const tree = (x, y, _r, wood, forced) => {
    if (!sp.length && !forced) return;                       // biome sans arbre (inlandsis)
    const s = forced || pick(), [r0, dr] = SIZE[s], k = look.small || 1;
    out.push({ x:round2(x), y:round2(y), r:(r0 + rnd() * dr) * k, kind:'tree', sp:s, v:rnd(), ...(wood ? { wood:1 } : {}) });
  };
  /* Étendue des forêts sur la trame de 6 m : une case est forêt si le bruit des massifs
     dépasse le seuil du biome. Puis on BOUCHE TOUS LES TROUS : toute poche sans forêt qui
     n'est pas reliée au bord de la carte (clairière enfermée, même grande) devient forêt.
     L'eau et les routes qui traversent un bois y ouvrent ensuite leur passage. */
  const NX = Math.ceil((TW - 3) / 6), NY = Math.ceil((TH - 3) / 6), woodAt = new Uint8Array(NX * NY);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) woodAt[j * NX + i] = fz(6 + 6 * i, 6 + 6 * j) > B.forest ? 1 : 0;
  const open = new Uint8Array(NX * NY), stack = [];
  const push = c => { if (!woodAt[c] && !open[c]) { open[c] = 1; stack.push(c); } };
  for (let i = 0; i < NX; i++) { push(i); push((NY - 1) * NX + i); }
  for (let j = 0; j < NY; j++) { push(j * NX); push(j * NX + NX - 1); }
  while (stack.length) {
    const c = stack.pop(), i = c % NX, j = (c - i) / NX;
    if (i > 0) push(c - 1); if (i < NX - 1) push(c + 1); if (j > 0) push(c - NX); if (j < NY - 1) push(c + NX);
  }
  for (let c = 0; c < woodAt.length; c++) if (!woodAt[c] && !open[c]) woodAt[c] = 1;
  const woodCellAt = (x, y) => { const i = Math.floor((x - 3) / 6), j = Math.floor((y - 3) / 6); return i >= 0 && j >= 0 && i < NX && j < NY && woodAt[j * NX + i]; };
  for (let j = 0, y = 3; j < NY; j++, y += 6) for (let i = 0, x = 3; i < NX; i++, x += 6) {
    // grandes forêts : un arbre par case, presque centré (pas d'écart qui laisserait un trou)
    if (woodAt[j * NX + i]) { tree(x + 1.5 + rnd() * 3, y + 1.5 + rnd() * 3, 3.2 + rnd() * 2.6, true); continue; }
    const px = x + rnd() * 5, py = y + rnd() * 5, n = nz(px, py), r = rnd();
    const fn = fz(px, py);
    // prés dégagés : quelques bosquets serrés (cœur des taches sombres), de rares arbres isolés
    const pTree = fn > B.forest - .015 ? .3 : n > B.dense + .06 ? .5 : n > B.mid + .04 ? .03 : B.sparse * .35;
    const pBush = n > B.dense ? B.bush * .5 : B.bush * .15;
    if (r < pTree) tree(px, py, 3.2 + rnd() * 2.6, false);
    else if (r < pTree + pBush) out.push({ x:round2(px), y:round2(py), r:1.2 + rnd() * .9, kind:'bush', v:rnd() });
    else if (r < pTree + pBush + (B.rocks || 0)) { const q = rnd(); out.push({ x:round2(px), y:round2(py), r:q > .75 ? 3.5 + (q - .75) * 12 : 1.4 + q / .75 * 2, kind:'rock', v:rnd() }); } // rochers
  }
  // lisières : autour des lacs, puis le long des rivières (plus espacées) — arbres retirés en bordure d'eau (demande du 05/10) ;
  // les tirages sont gardés pour que le reste du paysage ne change pas
  const nLisieres = out.length;
  const wet = B.sparse > .05 ? .6 : B.dense > .66 ? .25 : .45;
  for (const lk of S.lakes) {
    const P = lk.pts, per = P.reduce((s, p, i) => s + segLen(p, P[(i + 1) % P.length]), 0);
    for (let d = 0; d < per; d += 8) {
      if (rnd() > wet) { rnd(); continue; }
      let k = 0, acc = 0; while (acc + segLen(P[k], P[(k + 1) % P.length]) < d) { acc += segLen(P[k], P[(k + 1) % P.length]); k++; }
      const a = P[k], b = P[(k + 1) % P.length], q = [a[0] + (b[0] - a[0]) * (d - acc) / (segLen(a, b) || 1), a[1] + (b[1] - a[1]) * (d - acc) / (segLen(a, b) || 1)];
      const u = [q[0] - lk.c[0], q[1] - lk.c[1]], L = Math.hypot(...u) || 1, o = 6 + rnd() * 9;
      tree(q[0] + u[0] / L * o, q[1] + u[1] / L * o, 3 + rnd() * 2.4);
    }
  }
  for (const rv of S.rivers) {
    const { L, R } = riverBanks(rv);
    for (const bank of [L, R]) for (let i = 0; i < bank.length - 1; i += 3) {
      if (rnd() > wet * .45) continue;
      const a = bank[i], b = bank[i + 1], d = [b[0] - a[0], b[1] - a[1]], dl = Math.hypot(...d) || 1;
      const side = bank === L ? 1 : -1, o = 5 + rnd() * 7;
      tree(a[0] - d[1] / dl * o * side, a[1] + d[0] / dl * o * side, 2.8 + rnd() * 2.2);
    }
  }
  out.length = nLisieres;
  // îles : un bouquet d'arbres au cœur de chaque île (hors de la grève de sable)
  for (const rv of S.rivers) for (const is of riverIsles(rv)) {
    // (sur l'île même, à 7 m au moins de son bord : jamais dans l'eau ni sur la grève)
    const P = is.P, bb = is.bb, deep = q => inPoly(q, P) && P.every((a, k) => ptSeg(q, a, P[(k + 1) % P.length]).d > 7);
    for (let y = bb[1]; y < bb[3]; y += 6) for (let x = bb[0]; x < bb[2]; x += 6) {
      const q = [x + rnd() * 4, y + rnd() * 4];
      if (rnd() < .5 && deep(q)) { const before = out.length; tree(q[0], q[1], 0, false); if (out.length > before) out[before].isle = 1; }
    }
  }
  /* Rochers et cailloux de berge : par petits groupes (1 à 5 pierres, 0,4 à 2 m) le long des
     lacs, des rivières et autour des îles, certains à moitié dans l'eau ; jamais sur un pont. */
  const nearRoad = q => base.some(r => r.pts.slice(1).some((e, j) => ptSeg(q, r.pts[j], e).d < 14));
  const shoreRocks = (a, b, out_) => { // a : point de berge ; b : direction vers la terre (unitaire)
    if (nearRoad(a)) return;
    const k = 1 + Math.floor(rnd() * 5);
    for (let s = 0; s < k; s++) {
      const off = -1.5 + rnd() * 4, side = (rnd() - .5) * 7, big = s === 0 && rnd() < .5;
      out_.push({ x:round2(a[0] + b[0] * off - b[1] * side), y:round2(a[1] + b[1] * off + b[0] * side), r:big ? 2.4 + rnd() * 2 : .6 + rnd() * .7, kind:'rock', v:rnd(), wet:1 });
    }
  };
  for (const lk of S.lakes) {
    const P = lk.pts;
    for (let i = 0; i < P.length; i++) if (rnd() < .5) {
      const a = P[i], u = [a[0] - lk.c[0], a[1] - lk.c[1]], L = Math.hypot(...u) || 1;
      shoreRocks(a, [u[0] / L, u[1] / L], out);
    }
  }
  for (const rv of S.rivers) {
    const { L, R } = riverBanks(rv), step = rv.cls === 'fleuve' ? 5 : 4;
    for (const bank of [L, R]) for (let i = 0; i < bank.length - 1; i += step) if (rnd() < .24) {
      const a = bank[i], b = bank[i + 1], d = [b[0] - a[0], b[1] - a[1]], dl = Math.hypot(...d) || 1, side = bank === L ? 1 : -1;
      shoreRocks(a, [-d[1] / dl * side, d[0] / dl * side], out);
    }
    for (const is of riverIsles(rv)) for (let i = 0; i < is.P.length; i += 3) if (rnd() < .3) {
      const a = is.P[i], u = [a[0] - is.c[0], a[1] - is.c[1]], L2 = Math.hypot(...u) || 1;
      shoreRocks(a, [-u[0] / L2, -u[1] / L2], out); // vers le centre de l'île = vers la terre
    }
  }
  /* Pierres à tailler (le camp de tailleur de pierre les récolte) : éparpillées sur toute la carte et,
     plus nombreuses, au bord des chemins (1 à 3 pierres tous les 10 m environ, de part et d'autre).
     Tirages à part (une graine par route de base) : le reste du paysage ne change pas, et rien ne bouge quand le joueur ajoute ou
     supprime une route. */
  { const pierre = rs => { const q = rs(); return q > .8 ? 2.6 + (q - .8) * 10 : .9 + q / .8 * 1.5; };
    const r0 = seeded(S.landSeed * 31 + 7);
    for (let n = 0; n < TW * TH / 9000; n++) out.push({ x:round2(r0() * TW), y:round2(r0() * TH), r:pierre(r0), kind:'rock', v:r0(), stone:1 });
    for (const r of base) { const P = smoothPts(r), rs = seeded(S.landSeed * 31 + 7 + r.id * 101);
      for (let k = 0; k < P.length - 1; k++) {
        const a = P[k], b = P[k + 1], L = segLen(a, b) || 1, u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
        for (let d = rs() * 10; d < L; d += 10) {
          if (rs() > .4) continue;
          const side = rs() < .5 ? 1 : -1, off = r.w / 2 + 1 + rs() * 3;
          for (let m = 1 + Math.floor(rs() * 3); m > 0; m--) {
            const t = d + (rs() - .5) * 4, o = off + rs() * 1.5;
            out.push({ x:round2(a[0] + u[0] * t - u[1] * o * side), y:round2(a[1] + u[1] * t + u[0] * o * side), r:pierre(rs) * .8, kind:'rock', v:rs(), stone:1, edge:1 });
          }
        }
      } }
  }
  if (typeof baiesCandidats === 'function') out.push(...baiesCandidats(fz, B));   // arbres et arbustes à baies validés, selon le climat et le terrain (baies.js)
  // dans une forêt, rien d'autre que la forêt : pas d'arbre isolé ni de buisson (rives comprises)
  const inForest = f => !f.wood && !f.wet && (woodCellAt(f.x, f.y) || fz(f.x, f.y) > B.forest - .004);
  floraSeed = fk;
  return floraCands = out.filter(f => f.stone || !inForest(f));
}
/* Modèles d'arbres dessinés une fois (houppier bosselé, contour sombre, côté ombre en bas
   à droite, reflets en haut à gauche, ombre portée), puis posés comme des tampons.
   Dégradé de verts (demande du 29/09) : les arbres seuls sont vert clair, la lisière
   un peu plus foncée, et la forêt fonce jusqu'à son cœur — [teinte, reflet, ombre]. */
const TREE_EDGE = '#223020', TREE_DROP = 'rgba(30,45,25,.3)';
const SPR = 96, SPR_C = 40, SPR_R = 28, SHAPES = 5; // taille du modèle, centre et rayon du houppier (px)
let treeSprites = null;
function crown(rnd, bush) {
  const n = bush ? 4 + Math.floor(rnd() * 2) : 5 + Math.floor(rnd() * 3), out = [{ x:0, y:0, r:bush ? .55 : .62 }];
  for (let k = 0; k < n; k++) {
    const a = (k + rnd() * .5) / n * Math.PI * 2, rb = bush ? .42 + rnd() * .12 : .3 + rnd() * .14, d = 1 - rb;
    out.push({ x:Math.cos(a) * d, y:Math.sin(a) * d, r:rb });
  }
  return out;
}
function makeSprite(pal, bumps, rnd) {
  const c = document.createElement('canvas'); c.width = c.height = SPR;
  const g = c.getContext('2d'), C = SPR_C, R = SPR_R;
  const union = (dx, dy, k, grow) => { g.beginPath(); for (const b of bumps) { g.moveTo(C + (b.x + dx) * R + b.r * R * k + grow, C + (b.y + dy) * R); g.arc(C + (b.x + dx) * R, C + (b.y + dy) * R, b.r * R * k + grow, 0, Math.PI * 2); } };
  union(.17, .21, 1, 0); g.fillStyle = TREE_DROP; g.fill();                   // ombre portée
  union(0, 0, 1, 1.8); g.fillStyle = TREE_EDGE; g.fill();                     // contour
  g.save(); union(0, 0, 1, 0); g.clip();
  g.fillStyle = pal[2]; g.fill();                                             // côté ombre
  union(-.07, -.09, .93, 0); g.fillStyle = pal[0]; g.fill();                  // teinte
  // détails au hasard : un reflet sur la moitié des houppiers, une touffe sur un tiers
  if (rnd() < .5) { const b = bumps[1 + Math.floor(rnd() * (bumps.length - 1))]; g.fillStyle = pal[1]; g.globalAlpha = .8; g.beginPath(); g.arc(C + (b.x - b.r * .3) * R, C + (b.y - b.r * .35) * R, b.r * R * .42, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
  if (rnd() < .33) { const b = bumps[1 + Math.floor(rnd() * (bumps.length - 1))]; g.globalAlpha = .4; g.strokeStyle = TREE_EDGE; g.lineWidth = 1.1; g.beginPath(); g.arc(C + b.x * R * .55, C + b.y * R * .55, b.r * R * .7, .1, 1.6); g.stroke(); g.globalAlpha = 1; }
  g.restore();
  return c;
}
const newSprite = () => { const c = document.createElement('canvas'); c.width = c.height = SPR; return [c, c.getContext('2d')]; };
// conifère vu du dessus : étoile de branches, cœur plus clair (pointe de l'arbre)
function makeConifer(pal, rnd) {
  const [c, g] = newSprite(), C = SPR_C, R = SPR_R, n = 8 + Math.floor(rnd() * 3), jit = Array.from({ length:n * 2 }, () => .9 + rnd() * .2);
  const star = (dx, dy, k, grow) => {
    g.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = i / (n * 2) * Math.PI * 2, rr = (i % 2 ? .72 : 1) * jit[i] * R * k + grow;
      const X = C + dx * R + Math.cos(a) * rr, Y = C + dy * R + Math.sin(a) * rr;
      i ? g.lineTo(X, Y) : g.moveTo(X, Y);
    }
    g.closePath();
  };
  star(.15, .19, 1, 0); g.fillStyle = TREE_DROP; g.fill();                    // ombre portée
  star(0, 0, 1, 1.8); g.fillStyle = TREE_EDGE; g.fill();                      // contour
  g.save(); star(0, 0, 1, 0); g.clip();
  g.fillStyle = pal[2]; g.fill();
  star(-.06, -.08, .8, 0); g.fillStyle = pal[0]; g.fill();                   // étages de branches
  if (rnd() < .4) { star(-.1, -.12, .45, 0); g.fillStyle = pal[1]; g.fill(); } // cime éclairée sur quelques-uns
  g.restore();
  return c;
}
// palmier vu du dessus : palmes qui rayonnent autour d'un cœur brun
function makePalm(pal, rnd) {
  const [c, g] = newSprite(), C = SPR_C, R = SPR_R, n = 7 + Math.floor(rnd() * 3), a0 = rnd() * 6.28;
  const fronds = (dx, dy) => {
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const a = a0 + i / n * Math.PI * 2 + (rnd() - .5) * .2, L = R * (.85 + rnd() * .15), w = R * .2;
      const ex = Math.cos(a), ey = Math.sin(a), nx = -ey, ny = ex, ox = C + dx * R, oy = C + dy * R;
      g.moveTo(ox, oy);
      g.quadraticCurveTo(ox + ex * L * .5 + nx * w, oy + ey * L * .5 + ny * w, ox + ex * L, oy + ey * L);
      g.quadraticCurveTo(ox + ex * L * .5 - nx * w, oy + ey * L * .5 - ny * w, ox, oy);
    }
  };
  fronds(.15, .19); g.fillStyle = TREE_DROP; g.fill();
  fronds(0, 0); g.fillStyle = pal[0]; g.fill(); g.strokeStyle = TREE_EDGE; g.lineWidth = 1.4; g.stroke();
  g.beginPath(); g.arc(C, C, R * .14, 0, Math.PI * 2); g.fillStyle = '#7a5a32'; g.fill(); g.strokeStyle = TREE_EDGE; g.stroke();
  return c;
}
// rocher : bloc anguleux gris, facette éclairée au nord-ouest
// (galet arrondi gris clair, cerné de sombre, ombre en bas à droite : comme la référence)
function makeRock(rnd) {
  const [c, g] = newSprite(), C = SPR_C, R = SPR_R, n = 9 + Math.floor(rnd() * 3), sq = .75 + rnd() * .25;
  const P = Array.from({ length:n }, (_, i) => { const a = i / n * Math.PI * 2 + (rnd() - .5) * .3, r = R * (.82 + rnd() * .18); return [Math.cos(a) * r, Math.sin(a) * r * sq]; });
  // contour arrondi : courbes passant par le milieu des côtés
  const poly = (dx, dy, k) => {
    g.beginPath();
    const m = i => { const a = P[i % n], b = P[(i + 1) % n]; return [C + dx + (a[0] + b[0]) / 2 * k, C + dy + (a[1] + b[1]) / 2 * k]; };
    g.moveTo(...m(0));
    for (let i = 1; i <= n; i++) g.quadraticCurveTo(C + dx + P[i % n][0] * k, C + dy + P[i % n][1] * k, ...m(i));
    g.closePath();
  };
  poly(R * .11, R * .13, 1); g.fillStyle = 'rgba(40,36,28,.32)'; g.fill();          // ombre portée
  poly(0, 0, 1); g.fillStyle = '#8f8b82'; g.fill();                                  // côté ombre
  g.save(); poly(0, 0, 1); g.clip();
  poly(-R * .1, -R * .12, .88); g.fillStyle = '#b3aca2'; g.fill();                   // pierre
  poly(-R * .28, -R * .3, .38); g.fillStyle = '#d2ccc0'; g.fill();                   // reflet
  g.restore();
  poly(0, 0, 1); g.strokeStyle = '#3f4545'; g.lineWidth = 2; g.stroke();            // contour
  return c;
}
// modèles propres au biome : pour chaque essence et chaque teinte, SHAPES formes ; buissons
// et rochers ; refaits quand le biome change
function makeTreeSprites() {
  const rnd = seeded(8111), look = biomeLook(), pals = look.pal;
  treeSprites = { biome:S.biome, tree:{}, bush:[], rock:[] };
  for (const s of ['f', 'c', 'a', 'p']) for (let t = 0; t < 3; t++) {
    const pal = s === 'a' && !look.species.a ? ACACIA_PAL[t] : pals[t], list = treeSprites.tree[s + t] = [];
    for (let k = 0; k < SHAPES; k++) list.push(
      s === 'c' ? makeConifer(s === 'c' && !look.species.c ? CONIFER_PAL[t] : pal, rnd)
      : s === 'p' ? makePalm(pal, rnd)
      : makeSprite(pal, s === 'a' ? crown(rnd, false).map(b => ({ ...b, x:b.x * 1.05, y:b.y * .8, r:b.r * .9 })) : crown(rnd, false), rnd));
  }
  for (let k = 0; k < 3; k++) treeSprites.bush.push(makeSprite(look.bushPal || pals[0], crown(rnd, true), rnd));
  for (let k = 0; k < 4; k++) treeSprites.rock.push(makeRock(rnd));
}
// modèle d'un arbre, d'un buisson ou d'un rocher : son essence, sa teinte (tone, posée par
// classifyWoods pour la lisière ; claire sinon), puis sa forme tirée de sa valeur v
function spriteOf(f) {
  if (!treeSprites || treeSprites.biome !== S.biome) makeTreeSprites();
  const pickOf = list => list[Math.floor((f.v * 9973 % 1) * list.length)];
  if (f.kind === 'rock') return pickOf(treeSprites.rock);
  if (f.kind === 'bush') return pickOf(treeSprites.bush);
  return pickOf(treeSprites.tree[(f.sp || 'f') + (f.wood ? (f.tone || 1) : 0)]);
}
/* Grandes forêts, façon carte de référence : l'intérieur du bois est un aplat sombre à
   peine texturé (quelques contours de houppiers), posé PAR-DESSUS la lisière : un cordon
   d'arbres bosselés qui dépasse de dessous le massif, tout autour (et autour des clairières). Un arbre est « de lisière » s'il a moins de 18 voisins de bois
   à moins de 2 cases (12 m) du bord du bois ; les autres forment l'intérieur, dont l'aplat
   fonce par paliers en allant vers le cœur (profondeur mesurée en cases de 6 m). */
// grille de la trame des arbres (cases de 6 m), en tableau d'entiers : bien plus rapide
// qu'une table de clés texte (le calcul repasse à chaque arbre abattu)
const WG_W = Math.ceil(TW / 6) + 2, WG_H = Math.ceil(TH / 6) + 2;
const woodDepth = new Int16Array(WG_W * WG_H), woodQueue = new Int32Array(WG_W * WG_H);
const woodCell = f => (Math.floor((f.y - 3) / 6) + 1) * WG_W + Math.floor((f.x - 3) / 6) + 1;
function classifyWoods() {
  const D = woodDepth, INF = 32000, NONE = -1;
  D.fill(NONE);
  for (const f of flora) if (f.wood) D[woodCell(f)] = INF;
  // profondeur : 0 sur les cases de bois qui touchent autre chose, puis +1 case par case
  let head = 0, tail = 0;
  const N = [-WG_W - 1, -WG_W, -WG_W + 1, -1, 1, WG_W - 1, WG_W, WG_W + 1];
  for (let c = WG_W + 1; c < D.length - WG_W - 1; c++) {
    if (D[c] !== INF) continue;
    for (const o of N) if (D[c + o] === NONE) { D[c] = 0; woodQueue[tail++] = c; break; }
  }
  while (head < tail) {
    const c = woodQueue[head++], d = D[c] + 1;
    for (const o of N) if (D[c + o] === INF) { D[c + o] = d; woodQueue[tail++] = c + o; }
  }
  for (const f of flora) {
    if (!f.wood) continue;
    f.depth = D[woodCell(f)];
    f.inner = f.depth >= 2;
    f.tone = f.depth === 0 ? 1 : 2;
  }
}
const CORE_DEPTH = 6; // cases (6 m) du bord à partir desquelles le bois passe au ton sombre
function drawWoods(g, list, s, ox, oy) {
  if (!list.length) return;
  const circles = (dx, dy, k, grow, sel) => {
    const path = new Path2D();
    for (const f of list) {
      if (sel && !sel(f)) continue;
      // la masse (k ≥ 1) couvre au moins 5,8 m autour de chaque arbre : entre deux cases
      // voisines de 6 m, même en diagonale, il ne reste jamais de jour
      const X = (f.x + f.r * dx) * s + ox, Y = (f.y + f.r * dy) * s + oy, R = (k >= 1 ? Math.max(f.r * k, 5.8) : f.r * k) * s + grow;
      path.moveTo(X + R, Y); path.arc(X, Y, R, 0, Math.PI * 2);
    }
    return path;
  };
  // 1. la lisière d'abord : de vrais arbres, du nord au sud, qui dépassent SOUS le massif
  for (const f of list) if (!f.inner) stampTree(g, f, f.x * s + ox, f.y * s + oy, s);
  // 2. puis le massif par-dessus (les arbres de l'intérieur seulement) : son ombre tombe
  //    sur la lisière, son contour sombre la recouvre à moitié
  const inner = f => f.inner;
  g.save();
  g.fillStyle = TREE_DROP; g.fill(circles(.15, .19, 1.25, 0, inner));              // ombre du massif
  g.fillStyle = TREE_EDGE; g.fill(circles(0, 0, 1.25, Math.max(.8, s * .4), inner)); // contour du massif
  const st = biomeLook().steps;                                                    // un seul ton pour tout l'intérieur
  g.fillStyle = st[0]; g.fill(circles(0, 0, 1.25, 0, inner));
  if (s > .9) {   // mêmes détails que les arbres isolés, au hasard, sur le premier ton (entre la lisière et le cœur)
    const edge = f => f.inner && f.depth < CORE_DEPTH;
    g.fillStyle = 'rgba(170,205,140,.3)'; g.fill(circles(-.3, -.35, .4, 0, f => edge(f) && f.v < .22));       // reflets
    g.lineWidth = 1; g.strokeStyle = 'rgba(18,32,20,.3)'; g.beginPath();                                   // touffes
    for (const f of list) if (edge(f) && f.v > .83) { const X = f.x * s + ox, Y = f.y * s + oy, R = f.r * .8 * s; g.moveTo(X + R * Math.cos(.2), Y + R * Math.sin(.2)); g.arc(X, Y, R, .2, 1.9); }
    g.stroke();
  }
  g.restore();
}
// pose un modèle : houppier de rayon r (m) centré en (X, Y) écran, à l'échelle s (px / m)
// (vue de loin : un arbre garde au moins 2,4 px de rayon, un buisson ou un rocher 1,4 px —
// sinon ils disparaîtraient et la carte perdrait tous ses détails)
function stampTree(g, f, X, Y, s) {
  if (f.kind === 'baie') return stampBaie(g, f, X, Y, s);
  const k = Math.max(f.r * s, f.kind === 'tree' ? 2.4 : 1.4) / SPR_R;
  g.drawImage(spriteOf(f), X - SPR_C * k, Y - SPR_C * k, SPR * k, SPR * k);
}
/* Les personnages passent SOUS les arbres : peints après le décor, ils sont recouverts par les houppiers qui les surplombent.
   - persos : positions (m) des personnages peints à cette image (chaque dessin y ajoute les siens) ;
   - voileBois : sous le massif d'une grande forêt (arbres de l'intérieur, une seule masse) on voit le personnage en transparence ;
   - canopeeSur : les arbres isolés et de lisière dont le houppier couvre un personnage sont repeints par-dessus lui. */
const persos = [];
const voileBois = (x, y) => floraNear(x - 7, y - 7, x + 7, y + 7).some(f => f.wood && f.inner && (f.x - x) ** 2 + (f.y - y) ** 2 <= Math.max(f.r * 1.25, 5.8) ** 2) ? .3 : 1;
function canopeeSur() {
  const vus = new Set(), arbres = [];
  for (const [x, y] of persos) for (const f of floraNear(x - 9, y - 9, x + 9, y + 9)) {
    if (f.kind !== 'tree' || (f.wood && f.inner) || (f.x - x) ** 2 + (f.y - y) ** 2 > (f.r + 1.2) ** 2) continue;
    const k = treeKey(f); if (!vus.has(k)) { vus.add(k); arbres.push(f); }
  }
  arbres.sort((a, b) => a.y - b.y);                                   // du nord au sud, comme le décor
  for (const f of arbres) { const [X, Y] = toS(f.x, f.y); stampTree(ctx, f, X, Y, view.s); }
  persos.length = 0;
}
const WATER_TREE_FREE = 10; // m libres entre le bord du houppier et l'eau (rivières, lacs ; îles exceptées)
const SEA_TREE_FREE = 6; // m libres entre le bord du houppier et la mer (cartes à forme réelle)
const SEA_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [.7, .7], [-.7, .7], [.7, -.7], [-.7, -.7]];
// le houppier (rayon + marge) reste sur la terre : on teste 8 points autour de l'arbre
const loinDeLaMer = f => { const R = f.r + SEA_TREE_FREE; return SEA_DIRS.every(([dx, dy]) => surTerre([f.x + dx * R, f.y + dy * R])); };
const WATER_MARGIN = 2; // m laissés libres au bord des rivières et des lacs
let flora = [];
const treeKey = f => f.x + ',' + f.y; // identité stable d'un arbre (sa position)
// obstacles en seaux de 32 m : chaque arbre n'est testé que contre les obstacles voisins
function obstacleTest(polys) {
  const G = 32, grid = new Map();
  for (const o of polys) for (let gx = Math.floor(o.bb[0] / G); gx <= Math.floor(o.bb[2] / G); gx++)
    for (let gy = Math.floor(o.bb[1] / G); gy <= Math.floor(o.bb[3] / G); gy++) {
      const k = gx + ',' + gy; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(o);
    }
  return f => {
    // emprise du tronc : carré de 1,2 r ; on ne construit le carré que si un seau voisin est occupé
    const h = f.r * .6, bb = [f.x - h, f.y - h, f.x + h, f.y + h];
    let P = null;
    for (let gx = Math.floor(bb[0] / G); gx <= Math.floor(bb[2] / G); gx++) for (let gy = Math.floor(bb[1] / G); gy <= Math.floor(bb[3] / G); gy++) {
      const list = grid.get(gx + ',' + gy);
      if (!list) continue;
      for (const o of list) {
        if (!bbHit(bb, o.bb)) continue;
        P = P || [[bb[0], bb[1]], [bb[2], bb[1]], [bb[2], bb[3]], [bb[0], bb[3]]];
        if (polysOverlap(P, o.P)) return true;
      }
    }
    return false;
  };
}
/* Deux étages, pour ne pas tout refaire à chaque bâtiment posé :
   1. la végétation « fixe » (graine, biome, eau, routes, murailles) — refaite seulement
      quand l'un d'eux change ;
   2. puis les bâtiments, les arbres abattus et les arbres replantés, appliqués par-dessus
      (quelques millisecondes). Seules les tuiles autour des arbres qui changent sont repeintes. */
let staticFlora = [], staticKey = null;
function computeFlora() {
  touchScene();
  const key = JSON.stringify([S.landSeed, S.biome, S.roads.map(r => r.pts), S.walls.map(w => w.pts), S.towers.map(t => [t.x, t.y]),
    S.gates.map(g => [g.x, g.y, g.a]), S.rivers.map(r => [r.pts.length, r.pts[0], r.w0, r.w1]), S.lakes.map(l => l.c), (S.deposits || []).map(d => [d.kind, d.c, d.r]), (S.ressources || []).filter(r => r.cat === 'fruitier').map(r => [r.key, r.x, r.y])]);
  const full = key !== staticKey;
  if (full) {
    const polys = [], add = P => polys.push({ P, bb:bbox(P) });
    // routes : le tracé lissé tel qu'il est dessiné (les courbes débordent un peu du tracé logique)
    for (const r of S.roads) { const q = smoothPts(r); for (let k = 0; k < q.length - 1; k++) add(segRect(q[k], q[k+1], r.w)); }
    for (const o of S.walls) for (let k = 0; k < o.pts.length - 1; k++) add(segRect(o.pts[k], o.pts[k+1], o.w));
    for (const d of S.deposits || []) add(d.pts);                                  // (ni arbres ni rochers sur un gisement)
    for (const r of S.ressources || []) if (r.cat === 'fruitier') { const h = ARBRE_R * 1.3; add([[r.x - h, r.y - h], [r.x + h, r.y - h], [r.x + h, r.y + h], [r.x - h, r.y + h]]); }   // (ni arbres ni rochers sous un arbre fruitier)
    S.towers.forEach(t => add(towerPoly(t)));
    S.gates.forEach(g => add(gatePoly(g)));
    polys.push(...Z.water.river, ...Z.water.lake);
    const blocked = obstacleTest(polys), nearWater = obstacleTest([...Z.water.river, ...Z.water.lake]);
    staticFlora = floraCandidates().filter(f => {
      const h = f.r * .6;
      // (les arbres des îles sont au milieu de l'eau de la rivière : on ne les teste pas contre elle)
      return f.x - h >= 0 && f.y - h >= 0 && f.x + h <= TW && f.y + h <= TH && surTerre([f.x, f.y]) && (f.kind === 'rock' || loinDeLaMer(f)) && (f.isle || f.wet || f.edge || !blocked(f)) && (f.kind !== 'tree' || f.isle || !nearWater({ x:f.x, y:f.y, r:(WATER_TREE_FREE + f.r) / .6 })); // (cailloux de berge : à moitié dans l'eau, voulu)
    }).sort((a, b) => a.y - b.y); // du nord au sud, pour que les houppiers se recouvrent bien
    staticKey = key;
  }
  // forêts permanentes : un arbre ne disparaît que s'il a été abattu (S.cut, enregistré avec
  // le plan) ou s'il est sous un bâtiment — plus à cause des cases
  const underHouse = obstacleTest(S.houses.map(h => { const P = corners(h); return { P, bb:bbox(P) }; }));
  const cut = new Set(S.cut), old = flora;
  const gsp = Object.keys(biomeLook().species)[0] || 'f'; // replantés : l'essence principale du biome
  const grown = (S.grown || []).map(g => ({ x:g.x, y:g.y, r:g.r, kind:'tree', sp:gsp, v:g.v, planted:1 }));
  const keep = f => !(cut.size && cut.has(treeKey(f))) && !underHouse(f);
  flora = staticFlora.filter(keep);                       // déjà triée du nord au sud
  if (grown.length) flora = flora.concat(grown.filter(keep)).sort((a, b) => a.y - b.y);
  classifyWoods(); // intérieur des bois / lisière
  floraVersion++; // les habitants au travail repartiront des nouveaux arbres
  floraIdx = null;
  // décor : on ne repeint qu'autour des arbres qui apparaissent ou disparaissent (le dégradé
  // d'un bois change jusqu'à ~100 m) ; comparaison par position (même quand le paysage fixe
  // est recalculé après une nouvelle route, la plupart des arbres ne bougent pas)
  const was = new Set(old.map(treeKey)), now = new Set(flora.map(treeKey)), diff = [];
  for (const f of flora) if (!was.has(treeKey(f))) diff.push(f);
  for (const f of old) if (!now.has(treeKey(f))) diff.push(f);
  if (diff.length > 1500) { markAllDirty(); return; }
  if (diff.length > 40) { const b = bbox(diff.map(f => [f.x, f.y])); markDirty([b[0] - 110, b[1] - 110, b[2] + 110, b[3] + 110]); return; } // (un seul rectangle)
  for (const f of diff) invalidateTiles(f.x, f.y, f.wood ? 110 : 12);
}
// sol peint une fois (2 m par pixel), redessiné à l'échelle
let groundImg = null, groundSeed = null;
function groundImage() {
  const sai = teinteSol(METEO, REGION_METEO.hum);                                    // décalage de couleur du sol selon la saison ET la température
  const key = S.landSeed + '#' + S.biome + '#' + reliefKey() + '#' + sai + '#' + METEO.neige;
  if (groundImg && groundSeed === key) return groundImg;
  groundSeed = key;
  const hg = heightGrid();
  // un pixel par point de la grille d'altitude (HG m)
  const c = document.createElement('canvas'), w = TW / HG, h = TH / HG;
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (MONDE_PLAT) { g.fillStyle = '#86b95a'; g.fillRect(0, 0, w, h); return groundImg = c; }   // monde plat : herbe unie
  const img = g.createImageData(w, h), nz = landNoise(), look = biomeLook();
  const hex = s => { const m = s.match(/[0-9a-f]{2}/gi) || ['80', '80', '80']; return m.slice(0, 3).map(x => parseInt(x, 16)); };
  const A0 = hex(look.ground), B0 = hex(look.groundDark), Pc = look.patch ? hex(look.patch) : null;
  // taches du biome (neige, dunes claires) : un bruit à part, au-delà du seuil patchAt
  const pv = valueNoise(S.landSeed + 777), patchAt = look.patchAt || 2;
  // variations de couleur du sol, comme sur une carte : nappes de teinte (herbe grasse ↔ herbe sèche, ~350 m puis ~90 m)
  // et de clarté (~140 m puis ~30 m), bruits indépendants du relief ; look.vary règle la force (1 par défaut)
  const nt = valueNoise(S.landSeed + 1301), nl = valueNoise(S.landSeed + 2707), vary = look.vary == null ? 1 : look.vary;
  const c3 = v => Math.max(-1, Math.min(1, (v - .5) * 2.4));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let t = (nz(x * HG + HG / 2, y * HG + HG / 2) - .38) / .3;
    t = Math.max(0, Math.min(1, t)); t = t * t * (3 - 2 * t);
    let A = A0, B = B0;
    if (Pc) {
      const q = pv(x * HG / 90 + 3, y * HG / 90 + 7) * .7 + pv(x * HG / 30 + 9, y * HG / 30 + 1) * .3;
      let u = (q - patchAt) / .04; u = Math.max(0, Math.min(1, u));
      if (u > 0) { A = A.map((v, k) => v + (Pc[k] - v) * u); B = B.map((v, k) => v + (Pc[k] - v) * u); }
    }
    // ombrage des pentes, lumière venant du nord-ouest (même pas que la grille d'altitude)
    const xi = Math.min(HW - 2, x), yi = Math.min(HH - 2, y);
    const dx = (hg[yi * HW + xi + 1] - hg[yi * HW + xi]) / HG, dy = (hg[(yi + 1) * HW + xi] - hg[yi * HW + xi]) / HG;
    const wx = x * HG, wy = y * HG;
    const hue = c3(nt(wx / 350 + 5, wy / 350 + 9) * .65 + nt(wx / 90 + 2, wy / 90 + 6) * .35) * vary;   // > 0 : grasse (verte), < 0 : sèche (jaune)
    const lum = c3(nl(wx / 140 + 8, wy / 140 + 3) * .7 + nl(wx / 30 + 4, wy / 30 + 1) * .3) * vary;
    const k = Math.max(.72, Math.min(1.22, 1 + (dx + dy) * 1.6)) * (1 + lum * .06);
    const i = (y * w + x) * 4;
    let r = (A[0] + (B[0] - A[0]) * t - hue * 11) * k, gr = (A[1] + (B[1] - A[1]) * t + hue * 5) * k, b = (A[2] + (B[2] - A[2]) * t - hue * 6) * k;
    // saison (js/saisons.js) : teinte du sol, puis neige en plaques (plus épaisse là où la clarté du bruit est haute)
    r += sai[0]; gr += sai[1]; b += sai[2];
    if (METEO.neige > 0) { const sn = Math.max(0, Math.min(1, METEO.neige * 1.25 + lum * .22 - .12)) * .93, f = k > 1 ? 1 : .94 + .06 * (k - .72) / .28;
      r += (236 * f - r) * sn; gr += (242 * f - gr) * sn; b += (248 * f - b) * sn; }
    img.data[i] = r; img.data[i+1] = gr; img.data[i+2] = b; img.data[i+3] = 255;
  }
  g.putImageData(img, 0, 0);
  return groundImg = c;
}
// emprises des ouvrages défensifs
const towerPoly = t => corners({ x:t.x, y:t.y, a:0, w:TOWER_R * 2, l:TOWER_R * 2 });
const gatePoly = g => corners({ x:g.x, y:g.y, a:g.a, w:GATE_L, l:CELL + 3 });
