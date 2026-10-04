/* ---------- horizon : les régions voisines, peintes autour de la région du village ----------
   On peut sortir de la région (zoom arrière, déplacement) et regarder les régions voisines à la
   même échelle, avec leur propre végétation : sols, forêts, montagnes, neige, mer. On n'y construit
   pas (seule la région du village est constructible) ; les numéros des régions sont affichés.
   Image peinte une fois pour toutes par le peintre commun (js/commun/paysage-peint.js), sur 3 x 3
   terrains autour de la région, à 12 m par pixel ; le décor détaillé de la région est posé
   par-dessus (tuiles, voir drawDecor). Les contours viennent de data/monde/admin1.topojson, la
   projection est celle de data/regions/formes.json (origine « o » et échelle de la région). */
let HORIZON = null;                       // { canvas, x0, y0, m, labels:[{ id, x, y }] } une fois peint
const HORIZON_RES = 12;                   // mètres par pixel de l'image
const horizonBornes = () => FORME && FORME.o ? [-TW, -TH, 2 * TW, 2 * TH] : [0, 0, TW, TH];   // zone où l'on peut aller (m)
let horizonDonnees = null, horizonEnCours = 0;

// lecture synchrone d'un fichier JSON (comme les formes : le navigateur le garde en cache)
function horizonJson(url) {
  try { const x = new XMLHttpRequest(); x.open('GET', url, false); x.send(); if (x.status === 200 || x.status === 0) return JSON.parse(x.responseText); } catch (e) { console.warn('Horizon : lecture impossible de ' + url, e); }
  return null;
}
// TopoJSON -> contours en [lon, lat] (anneaux extérieurs et trous), sans bibliothèque
function horizonContours(topo) {
  const [sx, sy] = topo.transform.scale, [tx, ty] = topo.transform.translate;
  const arcs = topo.arcs.map(a => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
  const ring = idx => { const pts = []; for (const i of idx) { const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i]; pts.push(...(pts.length ? a.slice(1) : a)); } return pts; };
  const obj = topo.objects[Object.keys(topo.objects)[0]];
  return obj.geometries.map(g => {
    const polys = g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : [];
    return polys.flatMap(p => p.map(ring));
  });
}
// un point à l'intérieur du plus grand contour, au plus près de son centre (le numéro ne tombe pas en mer)
function pointDeLaRegion(rings) {
  const dans = (r, x, y) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > y) !== (r[j][1] > y) && x < (r[j][0] - r[i][0]) * (y - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
  let best = null, ba = -1;
  for (const r of rings) { let a0 = Infinity, b0 = Infinity, a1 = -Infinity, b1 = -Infinity; for (const [x, y] of r) { if (x < a0) a0 = x; if (x > a1) a1 = x; if (y < b0) b0 = y; if (y > b1) b1 = y; } const a = (a1 - a0) * (b1 - b0); if (a > ba) { ba = a; best = { r, a0, a1, b0, b1 }; } }
  if (!best || ba < 250000) return null;                                                // (trop petite pour un numéro)
  const cx = (best.a0 + best.a1) / 2, cy = (best.b0 + best.b1) / 2, cand = [];
  for (let i = 0; i <= 12; i++) for (let j = 0; j <= 12; j++) cand.push([best.a0 + (best.a1 - best.a0) * i / 12, best.b0 + (best.b1 - best.b0) * j / 12]);
  cand.sort((p, q) => Math.hypot(p[0] - cx, p[1] - cy) - Math.hypot(q[0] - cx, q[1] - cy));
  return cand.find(([x, y]) => dans(best.r, x, y)) || null;
}
async function peintHorizon() {
  if (!FORME || !FORME.o || !Col.water || horizonEnCours) return;
  const jeton = ++horizonEnCours;
  if (!horizonDonnees) {
    const topo = horizonJson('data/monde/admin1.topojson'), regions = horizonJson('data/regions/regions.json');
    if (!topo || !regions) { horizonEnCours = 0; return; }
    horizonDonnees = { contours: horizonContours(topo), regions };
  }
  const [lon0, lat0] = FORME.o, kx = Math.cos(lat0 * Math.PI / 180) * 111.32, ky = 110.57, sc = FORME.echelle;
  const B = horizonBornes(), w = Math.round((B[2] - B[0]) / HORIZON_RES), h = Math.round((B[3] - B[1]) / HORIZON_RES);
  // longitudes « déroulées » : un anneau qui franchit ±180 reste continu au lieu d'être coupé en deux bandes
  const deroule = r => { let off = 0; return r.map(([lon, lat], i) => { if (i) { const d = lon - r[i - 1][0]; if (d > 180) off -= 360; else if (d < -180) off += 360; } return [lon + off, lat]; }); };
  const list = [], labels = [];
  horizonDonnees.contours.forEach((rings, i) => {
    const pr = rings.map(r => { const L = deroule(r), k = 360 * Math.round((lon0 - L.reduce((t, q) => t + q[0], 0) / L.length) / 360);   // anneau d'un seul tenant, ramené près de la région
      return L.map(([lon, lat]) => [TW / 2 + (lon + k - lon0) * kx * sc, TH / 2 + (lat0 - lat) * ky * sc]); });
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const r of pr) for (const [x, y] of r) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < B[0] || x0 > B[2] || y1 < B[1] || y0 > B[3]) return;                     // hors de la zone
    list.push({ id: i + 1, rings: pr.map(r => r.map(([x, y]) => [(x - B[0]) / HORIZON_RES, (y - B[1]) / HORIZON_RES])) });
    if (i + 1 !== (FORME_ID | 0)) { const p = pointDeLaRegion(pr); if (p) labels.push({ id: i + 1, x: p[0], y: p[1] }); }   // numéro de la région, sur sa terre
  });
  const canvas = await peintPaysage(w, h, list, id => horizonDonnees.regions[id - 1], { fieldDiv: 4, flou: 5, bruit: 1 / 26, densite: .55, mer: Col.water });
  if (jeton !== horizonEnCours) return;
  HORIZON = { canvas, x0: B[0], y0: B[1], m: HORIZON_RES, labels };
  horizonEnCours = 0;
  markAllDirty();                                                                       // le décor ne couvre plus que la région
}
function lanceHorizon() { if (FORME && FORME.o) { HORIZON = null; horizonEnCours = 0; peintHorizon(); } }

// numéros des régions voisines, à taille d'écran constante
function drawHorizonLabels() {
  if (!HORIZON) return;
  ctx.font = '700 12px "Nunito", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const l of HORIZON.labels) {
    const [X, Y] = toS(l.x, l.y); if (X < -40 || Y < -20 || X > W + 40 || Y > H + 20) continue;
    haloText('Région ' + l.id, X, Y, Col['ink-soft'], Col.sheet);
  }
}
