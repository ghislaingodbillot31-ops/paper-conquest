/* ---------- eau ----------
   Rivière : ligne médiane sinueuse d'un bord à l'autre, largeur croissante de la
   source (w0) vers l'aval (w1). Lac : nappe arrondie autour d'un centre.
   Pour les tests de chevauchement (SAT, polygones convexes), la rivière est découpée
   en quadrilatères entre deux rives et le lac en triangles en éventail. */
/* Largeur vivante : la rivière s'élargit de la source (w0) vers l'aval (w1), mais surtout
   elle GROSSIT DANS LES VIRAGES (jusqu'à +60 % au creux d'un méandre) et SE RESSERRE dans
   les passages droits (−20 %), avec en plus une lente respiration tirée de son tracé.
   Les écarts sont lissés pour que les berges restent douces. Demi-largeurs en mètres. */
const riverHWCache = new WeakMap();
// demi-largeur maximale d'une île : une part de la demi-largeur normale de la rivière à cet endroit
const isleWide = (rv, is) => (rv.w0 + (rv.w1 - rv.w0) * is.i / Math.max(1, rv.pts.length - 1)) / 2 * is.wid;
function riverHW(rv) {
  const P = rv.pts, n = P.length, hit = riverHWCache.get(rv), cf = (rv.confl || []).join();
  if (hit && hit.n === n && hit.p0 === P[0] && hit.w0 === rv.w0 && hit.w1 === rv.w1 && hit.cf === cf) return hit.hw;
  const K = 6, bend = new Float32Array(n), rnd = seeded(Math.round(Math.abs(P[0][0] * 13 + P[0][1] * 7)) + n);
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - K)], b = P[i], c = P[Math.min(n - 1, i + K)];
    let t = Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]);
    t = Math.abs(Math.atan2(Math.sin(t), Math.cos(t)));
    bend[i] = Math.min(1, t / .7); // 0 : tout droit ; 1 : virage serré
  }
  const p1 = rnd() * 6.28, p2 = rnd() * 6.28, L = n * 4;
  let hw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), base = (rv.w0 + (rv.w1 - rv.w0) * t) / 2;
    // variation de taille accentuée : lente respiration ±40 % (bassins et étranglements),
    // virages jusqu'à +100 %
    const breathe = .28 * Math.sin(2 * Math.PI * i * 4 / 420 + p1) + .14 * Math.sin(2 * Math.PI * i * 4 / 170 + p2);
    hw[i] = base * Math.max(.45, .75 + 1 * bend[i] + breathe);
    // en aval d'une confluence, la rivière principale a reçu l'eau de l'affluent : +25 %
    for (const c of rv.confl || []) if (i > c) { const x = Math.min(1, (i - c) / 30); hw[i] *= 1 + .25 * x * x * (3 - 2 * x); }
  }
  // embouchure d'un affluent : il s'évase en trompette sur ses 100 derniers mètres (jusqu'à
  // ×2,4) : les coins de la jonction s'arrondissent et la pointe de terre s'émousse
  // (jamais plus large que la rivière principale à cet endroit : pas de bosse sur l'autre rive)
  if (rv.joined) for (let i = Math.max(0, n - 25); i < n; i++) {
    const x = (i - (n - 26)) / 25; hw[i] *= 1 + 1.4 * x * x * x;
    if (rv.mouth) hw[i] = Math.min(hw[i], rv.mouth * .9);
  }
  // lissage : moyenne glissante dont la fenêtre suit la largeur (±24 m pour une rivière,
  // ±70 m pour un fleuve) — un fleuve ne change pas de largeur sur quelques mètres
  const win = Math.max(6, Math.round((rv.w0 + rv.w1) / 2 * .7 / 4));
  for (let pass = 0; pass < 3; pass++) {
    const o = new Float32Array(n);
    for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let k = Math.max(0, i - win); k <= Math.min(n - 1, i + win); k++) { s += hw[k]; c++; } o[i] = s / c; }
    hw = o;
  }
  // îles : la rivière s'ouvre en deux bras autour de l'île (jusqu'à 2 fois sa largeur au
  // milieu de l'île), puis se reforme — élargissement en cloche, sans marche
  // (les berges s'écartent en suivant la forme de l'île, et un peu au-delà de ses pointes :
  // chacun des deux bras garde au moins la largeur de la rivière, sans étranglement)
  const hw0 = hw.slice();
  for (const is of rv.isles || []) {
    const wide = isleWide(rv, is), L = is.half * .9, span = Math.ceil(L * 1.6);
    for (let k = Math.max(0, is.i - span); k <= Math.min(n - 1, is.i + span); k++) {
      const t = Math.abs(k - is.i) / L, u = Math.max(0, 1 - (t / 1.6) ** 2), g = u * u * (3 - 2 * u); // départ et fin en douceur (pente nulle)
      // (autour de l'île, on part d'au moins la largeur normale, même si la rivière est
      // étroite à cet endroit : chaque bras garde la largeur d'une rivière)
      const normal = (rv.w0 + (rv.w1 - rv.w0) * k / (n - 1)) / 2, own = hw0[k] + (Math.max(hw0[k], normal) - hw0[k]) * g;
      hw[k] = Math.max(hw[k], own * (1 + .25 * g) + wide * 1.25 * g);
    }
  }
  // berges sans renflement brusque : la demi-largeur ne varie pas plus que 1,3 m (ou 8 % de la
  // largeur, pour un fleuve) tous les 4 m, dans les deux sens
  // dans un virage, la demi-largeur ne dépasse pas 85 % du rayon de courbure : sinon la berge
  // intérieure se replie sur elle-même et fait un coin
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 8)], b = P[i], c = P[Math.min(n - 1, i + 8)];
    let tq = Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]);
    tq = Math.abs(Math.atan2(Math.sin(tq), Math.cos(tq)));
    if (tq > .02) hw[i] = Math.min(hw[i], Math.max(rv.w0 * .3, .7 * (segLen(a, b) + segLen(b, c)) / 2 / tq));
  }
  for (let i = 1; i < n; i++) hw[i] = Math.min(hw[i], hw[i - 1] + 1.9);
  for (let i = n - 2; i >= 0; i--) hw[i] = Math.min(hw[i], hw[i + 1] + 1.9);
  // arrondi final : la limite de pente laisse des rampes droites avec un coin à chaque bout ;
  // trois moyennes glissantes (±20 m pour une rivière, ±50 m pour un fleuve) les arrondissent
  const win2 = Math.max(5, Math.round((rv.w0 + rv.w1) / 2 * .5 / 4));
  for (let pass = 0; pass < 3; pass++) {
    const o = new Float32Array(n);
    for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let k = Math.max(0, i - win2); k <= Math.min(n - 1, i + win2); k++) { s += hw[k]; c++; } o[i] = s / c; }
    hw = o;
  }
  riverHWCache.set(rv, { n, p0:P[0], w0:rv.w0, w1:rv.w1, cf:cf + JSON.stringify(rv.isles || []), hw });
  return hw;
}
/* Îles de rivière : une lentille de terre allongée dans l'axe du courant, au milieu de la
   partie élargie ; ses bords sont légèrement irréguliers. Polygones gardés en mémoire. */
const riverIsleCache = new WeakMap();
function riverIsles(rv) {
  if (!rv.isles || !rv.isles.length) return [];
  const HW = riverHW(rv), hit = riverIsleCache.get(rv);
  if (hit && hit.hw === HW) return hit.polys;
  const P = rv.pts, n = P.length, polys = [];
  for (const is of rv.isles) {
    const rnd = seeded(is.i * 97 + 13), wide = isleWide(rv, is);
    const ph = [rnd() * 6.28, rnd() * 6.28], N = 40; // bords ondulés doucement (pas de dents)
    // contour de l'île ; « len » raccourcit l'île, « k » l'amincit : le cœur herbeux est la même
    // lentille, plus courte et plus mince, construite le long de la rivière — il suit donc la
    // courbe de l'île et ne déborde jamais dans l'eau (une réduction vers le centre, elle,
    // sortait de l'île dans les îles courbes)
    const lens = (len, k) => {
      const L = [], R = [];
      for (let s = 0; s <= N; s++) {
        const t = -1 + 2 * s / N, fi = is.i + t * len * is.half * .9, i0 = Math.max(0, Math.min(n - 2, Math.floor(fi))), f = fi - i0;
        const p = [P[i0][0] + (P[i0 + 1][0] - P[i0][0]) * f, P[i0][1] + (P[i0 + 1][1] - P[i0][1]) * f];
        const a = P[Math.max(0, i0 - 2)], b = P[Math.min(n - 1, i0 + 3)], dl = segLen(a, b) || 1, nx = -(b[1] - a[1]) / dl, ny = (b[0] - a[0]) / dl;
        const tt = t * len, w = wide * k * Math.sqrt(Math.max(0, 1 - Math.abs(t) ** 2.4)); // bouts arrondis (tangente perpendiculaire à l'axe), pas de pointe
        const wl = w * (1 + .07 * Math.sin(tt * 5 + ph[0])), wr = w * (1 + .07 * Math.sin(tt * 4 + ph[1]));
        L.push([p[0] + nx * wl, p[1] + ny * wl]); R.push([p[0] - nx * wr, p[1] - ny * wr]);
      }
      return [...L, ...R.reverse()];
    };
    const poly = lens(1, 1), inner = lens(.82, .7);
    polys.push({ P:poly, inner, bb:bbox(poly), c:P[is.i] });
  }
  riverIsleCache.set(rv, { hw:HW, polys });
  return polys;
}
// place les îles d'une rivière neuve : au large des bords de carte, loin des ponts, dans les
// passages assez droits, bien espacées ; leur nombre et leur taille dépendent du cours d'eau
function placeIsles(rv, rnd) {
  const cls = RIVER_CLASS[rv.cls] || RIVER_CLASS.riviere, P = rv.pts, n = P.length, isles = [];
  const count = countIn(rnd, cls.isles), roads = S.roads.map(r => r.pts); // (tracé logique : appelé avant le dessin)
  for (let k = 0; k < count; k++) for (let t = 0; t < 40; t++) {
    const len = between(rnd, cls.isleLen), half = Math.round(len / 8), i = 20 + half + Math.floor(rnd() * (n - 40 - 2 * half));
    if (i - half < 20 || i + half > n - 20) continue;
    const a = P[i - half], b = P[i], c = P[i + half];
    let turn = Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]);
    if (Math.abs(Math.atan2(Math.sin(turn), Math.cos(turn))) > (rv.cls === 'fleuve' ? .35 : .5)) continue; // trop dans un virage (pointes en crochet)
    const clear = len / 2 + rv.w1 * 1.5 + 30;
    if (roads.some(q => q.slice(1).some((e, j) => ptSeg(b, q[j], e).d < clear))) continue; // loin des ponts
    if (isles.some(o => Math.abs(o.i - i) < o.half + half + 25)) continue;             // bien espacées
    isles.push({ i, half, grow:.9 + rnd() * .3, wid:.8 + rnd() * .4 }); // île large : 0,8 à 1,2 fois la demi-largeur
    break;
  }
  return isles;
}
// disques [x, y, rayon] le long du cours, assez serrés pour que la berge soit lisse
// (espacement ≤ 40 % du rayon) ; gardés en mémoire tant que la rivière ne change pas
const riverDiscCache = new WeakMap();
function riverDiscs(rv) {
  const HW = riverHW(rv), hit = riverDiscCache.get(rv);
  if (hit && hit.hw === HW) return hit.d;
  const P = rv.pts, d = [];
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1], L = segLen(a, b), r0 = HW[i], r1 = HW[i + 1];
    const n = Math.max(1, Math.ceil(L / Math.max(.6, Math.min(r0, r1) * .4)));
    for (let k = 0; k < n; k++) { const t = k / n; d.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, r0 + (r1 - r0) * t]); }
  }
  const e = P[P.length - 1]; d.push([e[0], e[1], HW[P.length - 1]]);
  riverDiscCache.set(rv, { hw:HW, d });
  return d;
}
const WATER_FOAM = '#8ea5e0'; // liseré clair le long des berges
// dégradé léger au bord (demande du 05/10) : l'eau s'éclaircit vers la berge, en bandes étroites.
// mixWater(couleur, a) : la teinte de l'eau tirée de a (0 à 1) vers un bleu franc plus clair (pas vers le blanc).
const WATER_BANDS = 3, WATER_SHALLOW = '#4f8cf0';
const mixWater = (c, a) => { const h = x => (x.match(/[0-9a-f]{2}/gi) || ['80', '80', '80']).slice(0, 3).map(v => parseInt(v, 16)), p = h(c), q = h(WATER_SHALLOW); return 'rgb(' + p.map((v, i) => Math.round(v + (q[i] - v) * a)).join(',') + ')'; };
// contour d'un lac pour le dessin : ses 40 points lissés (Chaikin fermé, 3 passes), sans coin
const lakeShapeCache = new WeakMap();
function lakeShape(lk) {
  let P = lakeShapeCache.get(lk);
  if (P) return P;
  P = lk.pts;
  for (let it = 0; it < 3; it++) {
    const Q = [];
    for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; Q.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); }
    P = Q;
  }
  lakeShapeCache.set(lk, P);
  return P;
}
// disques d'une bande intérieure (rayon × k) : on resserre l'espacement pour garder un bord
// lisse même quand les disques sont petits
const bandCache = new WeakMap();
function bandDiscs(rv, k) {
  const base = riverDiscs(rv);
  if (k === 1) return base;
  let m = bandCache.get(rv);
  if (!m || m.base !== base) { m = { base, bands:{} }; bandCache.set(rv, m); }
  if (m.bands[k]) return m.bands[k];
  const out = [];
  for (let i = 0; i < base.length - 1; i++) {
    const [x0, y0, r0] = base[i], [x1, y1, r1] = base[i + 1], d = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.ceil(d / Math.max(.4, Math.min(r0, r1) * k * .4)));
    for (let j = 0; j < n; j++) { const t = j / n; out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, (r0 + (r1 - r0) * t) * k]); }
  }
  const e = base[base.length - 1]; out.push([e[0], e[1], e[2] * k]);
  return m.bands[k] = out;
}
// lissage d'une ligne ouverte (bouts conservés) puis points régulièrement espacés
function chaikinOpen(P, passes) {
  for (let it = 0; it < passes; it++) {
    const Q = [P[0]];
    for (let k = 0; k < P.length - 1; k++) {
      const a = P[k], b = P[k + 1];
      if (k > 0) Q.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25]);
      if (k < P.length - 2) Q.push([a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]);
    }
    Q.push(P[P.length - 1]); P = Q;
  }
  return P;
}
function resample(P, step) {
  const out = [P[0].map(round2)];
  let carry = 0;
  for (let k = 0; k < P.length - 1; k++) {
    const a = P[k], b = P[k + 1], L = segLen(a, b);
    let s = step - carry;
    while (s <= L) { out.push([round2(a[0] + (b[0] - a[0]) * s / L), round2(a[1] + (b[1] - a[1]) * s / L)]); s += step; }
    carry = L - (s - step);
  }
  const last = P[P.length - 1];
  if (segLen(out[out.length - 1], last) > step * .3) out.push(last.map(round2)); else out[out.length - 1] = last.map(round2);
  return out;
}
/* Confluence naturelle. Un affluent rejoint la rivière principale en suivant le courant,
   à ~35°, par une longue courbe — jamais à angle droit, et sans jamais remonter le courant
   (pas de « ^ » pointu). On cherche, le long de la rivière principale (jusqu'à 800 m en
   aval ou 480 m en amont du point prévu), le point de confluence et le point de départ du
   raccord sur l'affluent (à 150–400 m) qui demandent le moins de virage à l'affluent ; puis
   on trace une courbe de Bézier qui part dans le prolongement de l'affluent et arrive à 35°
   dans le sens du courant. Retourne le nouveau tracé, ou null. */
function joinTributary(P, M, ic0) {
  const dirM = ic => { const a = M[Math.max(0, ic - 4)], b = M[Math.min(M.length - 1, ic + 4)], l = segLen(a, b) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
  const distMain = P.map(p => { let d = Infinity; for (let i = 0; i < M.length; i += 2) d = Math.min(d, segLen(p, M[i])); return d; });
  const ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1]) / ((Math.hypot(...a) * Math.hypot(...b)) || 1)))) * 180 / Math.PI;
  const th = 45 * Math.PI / 180; // angle d'arrivée : languette de terre moins effilée qu'à 35°
  const cands = [];
  for (let ic = Math.max(10, ic0 - 120); ic <= Math.min(M.length - 11, ic0 + 200); ic += 4) {
    const conf = M[ic], d = dirM(ic);
    for (let j = 8; j < P.length; j += 2) {
      const L = segLen(P[j], conf);
      if (L < 150 || L > 400 || distMain[j] < 50) continue;
      const side = Math.sign(d[0] * (P[j][1] - conf[1]) - d[1] * (P[j][0] - conf[0])) || 1, n = [-d[1] * side, d[0] * side];
      const u = [Math.cos(th) * d[0] - Math.sin(th) * n[0], Math.cos(th) * d[1] - Math.sin(th) * n[1]];
      // courbe de Bézier cubique : elle part DANS LE PROLONGEMENT de l'affluent (pas de coude)
      // et arrive à 35° dans le sens du courant ; on retient le départ qui tourne le moins
      const tl = segLen(P[j], P[j - 8]) || 1, tj = [(P[j][0] - P[j - 8][0]) / tl, (P[j][1] - P[j - 8][1]) / tl];
      const c1 = [P[j][0] + tj[0] * L * .4, P[j][1] + tj[1] * L * .4], c2 = [conf[0] - u[0] * L * .4, conf[1] - u[1] * L * .4];
      const turn = ang(tj, [c2[0] - c1[0], c2[1] - c1[1]]) + ang([c2[0] - c1[0], c2[1] - c1[1]], u);
      const score = turn + Math.abs(ic - ic0) * .04 + (P.length - j) * .01;
      if (score <= 150) cands.push({ score, ic, j, c1, c2, conf });
    }
  }
  // on essaie les meilleurs raccords jusqu'à en trouver un qui ne touche la rivière principale
  // qu'à sa confluence (un affluent ne traverse jamais la rivière qu'il va rejoindre)
  cands.sort((x, y) => x.score - y.score);
  for (const cand of cands.slice(0, 40)) {
    const { j, c1, c2, conf } = cand, a = P[j], curve = [];
    const len = segLen(a, c1) + segLen(c1, c2) + segLen(c2, conf), steps = Math.max(8, Math.round(len / 3));
    for (let k = 1; k <= steps; k++) {
      const t = k / steps, s = 1 - t, A = s * s * s, B = 3 * s * s * t, C = 3 * s * t * t, D = t * t * t;
      curve.push([A * a[0] + B * c1[0] + C * c2[0] + D * conf[0], A * a[1] + B * c1[1] + C * c2[1] + D * conf[1]]);
    }
    curve[curve.length - 1] = conf.slice();
    // lissage final (points tous les 20 m, 4 passes) : plus aucun coude serré près du raccord
    const pts = resample(chaikinOpen(resample(P.slice(0, j + 1).concat(curve), 20), 4), 4);
    if (!pts.every(p => segLen(p, conf) < 70 || M.every((q, i) => i % 2 || segLen(p, q) > 34))) continue;
    joinTributary.last = cand.ic; // index de la confluence sur la rivière principale
    return pts;
  }
  return null;
}
// plans enregistrés : chaque affluent est raccordé une fois avec la méthode ci-dessus
function softenConfluences(rivers) {
  rivers.forEach((tr, k) => {
    if (tr.joined >= 4 || tr.pts.length < 40) return;
    const end = tr.pts[tr.pts.length - 1];
    let main = null, ic = -1;
    for (const o of rivers) {
      if (o === tr) continue;
      for (let i = 0; i < o.pts.length; i++) if (segLen(o.pts[i], end) < 3) { main = o; ic = i; break; }
      if (main) break;
    }
    if (!main) return;
    const pts = joinTributary(tr.pts, main.pts, ic);
    if (pts) main.confl = [...(main.confl || []).filter(c => Math.abs(c - ic) > 60), joinTributary.last];
    rivers[k] = { ...tr, pts:pts || tr.pts, joined:4, mouth:riverHW(main)[pts ? joinTributary.last : ic] };
  });
}
function riverBanks(rv) {
  const n = rv.pts.length, L = [], R = [], HW = riverHW(rv);
  for (let i = 0; i < n; i++) {
    const a = rv.pts[Math.max(0, i - 1)], b = rv.pts[Math.min(n - 1, i + 1)];
    const d = segLen(a, b) || 1, nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d;
    const hw = HW[i], p = rv.pts[i];
    L.push([p[0] + nx * hw, p[1] + ny * hw]); R.push([p[0] - nx * hw, p[1] - ny * hw]);
  }
  return { L, R };
}
// plusieurs rivières (S.rivers) et plusieurs lacs (S.lakes)
function waterPolys(rivers = S.rivers, lakes = S.lakes) {
  const river = [], lake = [];
  for (const rv of rivers) {
    const { L, R } = riverBanks(rv);
    for (let i = 0; i < L.length - 1; i++) river.push([L[i], L[i+1], R[i+1], R[i]]);
  }
  for (const lk of lakes) {
    const P = lk.pts, c = lk.c;
    for (let i = 0; i < P.length; i++) lake.push([c, P[i], P[(i + 1) % P.length]]);
  }
  return { river:river.map(P => ({ P, bb:bbox(P) })), lake:lake.map(P => ({ P, bb:bbox(P) })) };
}
/* Rivière entre deux points (bords de carte, ou confluence sur une autre rivière) :
   la ligne droite est ondulée par deux sinusoïdes, atténuées aux deux bouts pour que
   la rivière parte et arrive bien à l'endroit voulu. */
function makeRiverPath(a, b, o) {
  const L = segLen(a, b), n = Math.max(2, Math.round(L / 4)), u = [(b[0]-a[0]) / L, (b[1]-a[1]) / L], nv = [-u[1], u[0]], pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, env = Math.sin(Math.PI * t) ** .6;
    const off = env * (o.amp * Math.sin(2 * Math.PI * o.cycles * t + o.phase) + o.amp * (o.harm === undefined ? .3 : o.harm) * Math.sin(2 * Math.PI * o.cycles * 3.1 * t + o.phase * 2));
    pts.push([round2(a[0] + (b[0]-a[0]) * t + nv[0] * off), round2(a[1] + (b[1]-a[1]) * t + nv[1] * off)]);
  }
  return { pts, w0:o.w0, w1:o.w1 };
}
// distance minimale entre une rivière et un ensemble de points (lac, autre rivière)
const riverGap = (rv, pts) => Math.min(...pts.map(p => Math.min(...rv.pts.slice(1).map((c, i) => ptSeg(p, rv.pts[i], c).d))));
const hitsAny = (P, list) => { const bb = bbox(P); return list.some(q => bbHit(bb, q.bb) && polysOverlap(P, q.P)); };
function makeRiver(o) {
  // o : { vertical, base, a1, f1, p1, a2, f2, p2 } — deux sinusoïdes superposées
  const len = o.vertical ? TH : TW, pts = [];
  for (let s = -12; s <= len + 12; s += 4) {
    const v = o.base + o.a1 * Math.sin(o.f1 * s + o.p1) + o.a2 * Math.sin(o.f2 * s + o.p2);
    pts.push(o.vertical ? [round2(v), s] : [s, round2(v)]);
  }
  return { pts, w0:10, w1:24 };
}
/* Règle des lacs : un lac ne touche rien. Distance minimale (m) entre le bord d'un lac et chaque autre ouvrage ; pour
   interdire une nouvelle chose près des lacs (muraille, village…), ajouter une ligne ici : { nom, min, lignes(lk) } où
   lignes renvoie les tracés à tenir à distance, { pts, hw } (hw : demi-largeur, nombre ou tableau par point). */
const LAC_DIST = [
  { nom:'route',   min:40, lignes:() => S.roads.map(r => ({ pts:r.pts, hw:r.w / 2 })) },
  { nom:'rivière', min:40, lignes:() => S.rivers.map(rv => ({ pts:rv.pts, hw:riverHW(rv) })) },
  { nom:'mer',     min:60, lignes:() => FORME ? FORME.terres.map(r => ({ pts:[...r, r[0]], hw:0 })) : [] },
  { nom:'lac',     min:40, lignes:lk => S.lakes.filter(o => o !== lk).map(o => ({ pts:[...o.pts, o.pts[0]], hw:0 })) },
];
// un lac est libre s'il est à plus de "min" de chaque tracé (et qu'aucun tracé n'entre dedans)
function lacLibre(lk) {
  const bb = bbox(lk.pts);
  return LAC_DIST.every(({ min, lignes }) => lignes(lk).every(({ pts, hw }) => {
    const b = bbox(pts); if (b[0] > bb[2] + min + 60 || b[2] < bb[0] - min - 60 || b[1] > bb[3] + min + 60 || b[3] < bb[1] - min - 60) return true;   // (60 : plus large demi-largeur de rivière)
    if (pts.some(q => q[0] > bb[0] && q[0] < bb[2] && q[1] > bb[1] && q[1] < bb[3] && inPoly(q, lk.pts))) return false;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], c = pts[i + 1];                                              // (segment loin du lac : on passe)
      if (Math.min(a[0], c[0]) > bb[2] + min + 60 || Math.max(a[0], c[0]) < bb[0] - min - 60 || Math.min(a[1], c[1]) > bb[3] + min + 60 || Math.max(a[1], c[1]) < bb[1] - min - 60) continue;
      const w = Array.isArray(hw) ? Math.max(hw[i], hw[i + 1]) : hw;
      for (const q of lk.pts) if (ptSeg(q, pts[i], pts[i + 1]).d - w < min) return false;
    }
    return true;
  }));
}
function makeLake(cx, cy, R, p1, p2) {
  const pts = [];
  for (let i = 0; i < 40; i++) {
    const t = i / 40 * Math.PI * 2, r = R * (1 + .16 * Math.sin(3 * t + p1) + .08 * Math.sin(5 * t + p2));
    pts.push([round2(cx + Math.cos(t) * r), round2(cy + Math.sin(t) * r)]);
  }
  return { c:[cx, cy], pts };
}

/* ---------- végétation des étangs ----------
   Autour de chaque étang, toujours la même (graine du paysage + numéro de l'étang ; indépendante des routes du joueur), répartie
   naturellement : un champ de densité (bruit, taches de ~25 m) décide où elle est dense ou absente — certaines zones restent
   complètement dégagées — et chaque élément garde un espacement minimum avec ses voisins (jamais l'un sur l'autre).
   - nénuphars : feuilles rondes échancrées (rayon 0,6 à 1,3 m), orientées au hasard, parfois une fleur ; dans l'eau, à 1,5 à 16 m de la rive ;
   - roseaux et joncs : touffes de tiges (massettes brunes) sur la rive, plus serrées par endroits ;
   - plantes de berge : petites touffes de feuilles à 2 à 8 m de l'eau.
   Peints sous les routes (drawDecor) : une route ne passe jamais sous la végétation. */
const plantesEau = new WeakMap();
function plantesDuLac(lk, idx) {
  let L = plantesEau.get(lk); if (L) return L;
  L = [];
  const P = lakeShape(lk), rnd = seeded(S.landSeed * 13 + idx * 7 + 5), dens = valueNoise(S.landSeed * 7 + idx * 31 + 11), base = S.roads.filter(r => !r.libre);
  const bb = bbox(P), marge = 10, B = [bb[0] - marge, bb[1] - marge, bb[2] + marge, bb[3] + marge];
  const rive = q => { let d = Infinity; for (let i = 0; i < P.length; i++) { const t = ptSeg(q, P[i], P[(i + 1) % P.length]).d; if (t < d) d = t; } return d; };
  const proche = q => base.some(r => { const Q = r.pts; for (let i = 0; i < Q.length - 1; i++) if (ptSeg(q, Q[i], Q[i + 1]).d < 12) return true; return false; });
  const lisse = t => t * t * (3 - 2 * t), champ = (q, k, echelle) => lisse(Math.max(0, Math.min(1, (dens(q[0] / echelle + k * 37, q[1] / echelle) - .3) / .4)));   // 0 = dégagé, 1 = dense
  const grille = new Map(), G = 4;
  const libre = (q, R) => { const gx = Math.floor(q[0] / G), gy = Math.floor(q[1] / G), m = Math.ceil(4 / G) + 1; for (let i = -m; i <= m; i++) for (let j = -m; j <= m; j++) for (const o of grille.get((gx + i) + ',' + (gy + j)) || []) if (segLen(o.p, q) < o.R + R) return false; return true; };
  const pose = (f, R) => { L.push(f); const k = Math.floor(f.p[0] / G) + ',' + Math.floor(f.p[1] / G); if (!grille.has(k)) grille.set(k, []); grille.get(k).push({ p:f.p, R }); };
  const essais = Math.round(Math.max(1500, (B[2] - B[0]) * (B[3] - B[1]) / 6));
  for (let t = 0; t < essais; t++) {
    const q = [round2(B[0] + rnd() * (B[2] - B[0])), round2(B[1] + rnd() * (B[3] - B[1]))], inside = inPoly(q, P), d = rive(q), u = rnd(), acc = rnd();
    if (inside && d >= 1.5 && d <= 16) {                                             // nénuphar
      const r = .6 + rnd() * .7, forte = champ(q, 1, 28);
      if (acc < forte * .85 && libre(q, r + .5) && !proche(q)) pose({ k:'lily', p:q, v:rnd(), r, a:rnd() * 6.28 }, r + .5);
    } else if (!inside && d <= 2.2) {                                                // roseaux
      const forte = champ(q, 2, 22);
      if (acc < forte * .9 && libre(q, 1.3) && !proche(q)) pose({ k:'reed', p:q, v:rnd(), n:3 + Math.floor(rnd() * 3 + forte * 4) }, 1.3);
    } else if (!inside && d > 2.2 && d <= 8) {                                       // plante de berge
      const forte = champ(q, 3, 30);
      if (acc < forte * .5 && u < .6 && libre(q, 1.6) && !proche(q)) pose({ k:'plant', p:q, v:rnd(), n:5 + Math.floor(rnd() * 3) }, 1.6);
    }
  }
  plantesEau.set(lk, L);
  return L;
}
function drawPlantesEau() {
  if (!S.lakes.length || view.s < .6) return;
  const s = view.s, [x0, y0] = toW(0, 0), [x1, y1] = toW(W, H);
  S.lakes.forEach((lk, idx) => {
    for (const f of plantesDuLac(lk, idx)) {
      const [X0, Y0] = f.p; if (X0 < x0 - 6 || X0 > x1 + 6 || Y0 < y0 - 6 || Y0 > y1 + 6) continue;
      const [X, Y] = toS(X0, Y0);
      if (f.k === 'lily') {                                                         // nénuphar : feuille ronde échancrée, fleur
        const R = f.r * s;
        ctx.save(); ctx.translate(X, Y); ctx.rotate(f.a);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, .35, Math.PI * 2 - .15); ctx.closePath();
        ctx.fillStyle = f.v < .5 ? '#5d9a45' : '#4f8c3c'; ctx.fill(); ctx.strokeStyle = 'rgba(30,70,30,.8)'; ctx.lineWidth = Math.max(.7, s * .08); ctx.stroke();
        ctx.restore();
        if (f.v > .72 && s > 1.6) { ctx.beginPath(); ctx.arc(X + R * .1, Y - R * .1, Math.max(1.5, R * .35), 0, Math.PI * 2); ctx.fillStyle = '#f4cfdb'; ctx.fill(); ctx.beginPath(); ctx.arc(X + R * .1, Y - R * .1, Math.max(.8, R * .14), 0, Math.PI * 2); ctx.fillStyle = '#e8a23a'; ctx.fill(); }
      } else if (f.k === 'reed') {                                                  // roseaux : tiges, massettes brunes
        const rnd = seeded(Math.round(X0 * 7 + Y0 * 13)); ctx.lineCap = 'round';
        for (let k = 0; k < f.n; k++) {
          const a = rnd() * 6.28, l = (.9 + rnd() * .9) * s, ex = X + Math.cos(a) * l * .45, ey = Y + Math.sin(a) * l * .45;
          ctx.strokeStyle = k % 2 ? '#6f8a36' : '#8da04a'; ctx.lineWidth = Math.max(.9, s * .1);
          ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(ex, ey); ctx.stroke();
          if (rnd() < .35 && s > 1.2) { ctx.fillStyle = '#5a3a22'; ctx.beginPath(); ctx.ellipse(ex, ey, Math.max(1, s * .1), Math.max(1.4, s * .22), a, 0, Math.PI * 2); ctx.fill(); }
        }
      } else {                                                                      // plante de berge : touffe de feuilles
        const rnd = seeded(Math.round(X0 * 11 + Y0 * 3)); ctx.lineCap = 'round';
        for (let k = 0; k < f.n; k++) { const a = k / f.n * 6.28 + rnd(), l = (.5 + rnd() * .6) * s; ctx.strokeStyle = '#6aa04a'; ctx.lineWidth = Math.max(.9, s * .13); ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + Math.cos(a) * l, Y + Math.sin(a) * l); ctx.stroke(); }
        if (f.v > .8 && s > 1.4) { ctx.fillStyle = '#f2d85a'; ctx.beginPath(); ctx.arc(X, Y, Math.max(1, s * .14), 0, Math.PI * 2); ctx.fill(); }
      }
    }
  });
}
