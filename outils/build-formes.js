// Formes des regions pour la carte de la capitale : data/regions/formes.json, genere hors ligne.
// Chaque region est projetee (equirectangulaire locale) et mise a l'echelle dans le terrain de
// la carte (2 000 x 1 500 m, marge autour). Pour chaque region :
//   region   : contour(s) de la region (anneaux, en metres de la carte)
//   terres   : toutes les terres du cadre (la region et ses voisines, fusionnees sans jointure) ;
//              ce qui n'est pas terre est la mer
//   fleuves  : vrais fleuves du cadre { n:nom, cls:1 fleuve, 2 riviere, 3 petite, pts }
//   lacs     : vrais lacs du cadre (anneaux)
//   capitale : position de la capitale ; routes : vraies routes vers les capitales voisines
//   echelle  : metres de carte par km reel
// Entrees : data/monde/admin1.topojson, water.json, routes.json, data/regions/regions.json.
// Usage (depuis la racine du projet, avec @turf/turf et topojson-client) :
//   node outils/build-formes.js
const fs = require('fs'), path = require('path');
const turf = require('@turf/turf'), topojson = require('topojson-client');
const ROOT = path.join(__dirname, '..'), json = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const t0 = Date.now(), log = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', ...a);
const ECHELLE_TERRAIN = 3;                          // meme valeur que js/carte/base.js
const TW = 2000 * ECHELLE_TERRAIN, TH = 1500 * ECHELLE_TERRAIN, MARGE = .08;             // terrain de la carte (m) et marge autour de la region
const topo = json('data/monde/admin1.topojson'), obj = topo.objects[Object.keys(topo.objects)[0]], geoms = obj.geometries;
const water = json('data/monde/water.json'), routes = json('data/monde/routes.json'), regions = json('data/regions/regions.json');
const fc = topojson.feature(topo, obj);
const near = (lon, lon0) => lon + 360 * Math.round((lon0 - lon) / 360);         // longitude ramenee pres du centre
const eachCoord = (g, f) => { const walk = c => typeof c[0] === 'number' ? f(c) : c.forEach(walk); walk(g.coordinates); };
// boites (lon/lat) des regions, pour trouver vite les voisines d'un cadre
const boxes = fc.features.map(f => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, lon0 = null;
  eachCoord(f.geometry, ([x, y]) => { if (lon0 === null) lon0 = x; x = near(x, lon0); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; });
  return [x0, y0, x1, y1]; });
const R = v => Math.round(v);                                                    // (1 m de precision)
const ringArea = r => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return Math.abs(a / 2); };
// Coins arrondis (frontières intérieures de la région seulement) : chaque sommet qui tourne de plus de 15 deg est remplace par une courbe (conge, quadratique
// de rayon 150 m de carte au plus, 0,45 de chaque segment au plus). La region et les terres passent par la meme
// regle : la region reste dans les terres. Les coins du cadre (sur son bord) ne bougent pas.
const CONGE_MAX = 150, CONGE_FRAC = .45, CONGE_ANGLE = 15;
const arrondi = (ring, frame, jonction) => {
  const n = ring.length, o = [], onFrame = p => p[0] <= frame[0] + 1 || p[0] >= frame[2] - 1 || p[1] <= frame[1] + 1 || p[1] >= frame[3] - 1;
  for (let i = 0; i < n; i++) {
    const a = ring[(i + n - 1) % n], b = ring[i], c = ring[(i + 1) % n];
    const l1 = Math.hypot(a[0] - b[0], a[1] - b[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const t = Math.abs(Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0])), turn = Math.min(t, 2 * Math.PI - t) * 180 / Math.PI;
    if (turn < CONGE_ANGLE || onFrame(b) || l1 < 1 || l2 < 1) { o.push(b); continue; }
    if (jonction && jonction(b)) { o.push(b); continue; }   // sommet sur la côte : jamais arrondi (region et terres doivent rester collées, sinon de la terre voisine voilée apparaît entre la région et la côte)
    const r = Math.min(CONGE_MAX, CONGE_FRAC * l1, CONGE_FRAC * l2);
    if (r < 3) { o.push(b); continue; }                  // coin de côte fin : le mètre de précision l'abîmerait
    const p1 = [b[0] + (a[0] - b[0]) / l1 * r, b[1] + (a[1] - b[1]) / l1 * r], p2 = [b[0] + (c[0] - b[0]) / l2 * r, b[1] + (c[1] - b[1]) / l2 * r];
    for (let k = 0; k <= 4; k++) { const u = k / 4, v = 1 - u; o.push([v * v * p1[0] + 2 * u * v * b[0] + u * u * p2[0], v * v * p1[1] + 2 * u * v * b[1] + u * u * p2[1]]); }
  }
  return o;
};
const out = {};
for (const f of fc.features.map((f, i) => ({ ...f, id:i + 1 }))) {
  const id = f.id, info = regions[id - 1];
  // --- projection : centre de la boite de la region, km, nord en haut
  const b = boxes[id - 1], lon0 = (b[0] + b[2]) / 2, lat0 = (b[1] + b[3]) / 2, kx = Math.cos(lat0 * Math.PI / 180);
  const km = ([lon, lat]) => [(near(lon, lon0) - lon0) * kx * 111.32, (lat0 - lat) * 110.57];
  const wkm = (b[2] - b[0]) * kx * 111.32 || 1, hkm = (b[3] - b[1]) * 110.57 || 1;
  const sc = Math.min(TW * (1 - 2 * MARGE) / wkm, TH * (1 - 2 * MARGE) / hkm);  // m de carte par km
  const P = c => { const [x, y] = km(c); return [TW / 2 + x * sc, TH / 2 + y * sc]; };
  const frame = [-TW * .02, -TH * .02, TW * 1.02, TH * 1.02];                   // (un peu plus grand : pas de bord visible)
  const projGeom = g => { const c = JSON.parse(JSON.stringify(g)); const walk = a => typeof a[0] === 'number' ? a.splice(0, 2, ...P(a)) : a.forEach(walk); walk(c.coordinates); return c; };
  const rings = (g, tol, minArea, round = false, jonction = null) => {                                           // anneaux simplifies, en metres de carte
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    const res = [];
    for (const poly of polys) for (const ring of poly) {
      if (ring.length < 4) continue;
      let s; try { s = turf.simplify(turf.polygon([ring]), { tolerance:tol, highQuality:false }).geometry.coordinates[0]; } catch (e) { s = ring; }
      if (ringArea(s) >= minArea) res.push((round ? arrondi(s.slice(0, -1), frame, jonction) : s.slice(0, -1)).map(([x, y]) => [R(x), R(y)]));
    }
    return res;
  };
  // --- la region
  // --- terres du cadre : regions dont la boite touche le cadre, fusionnees (arcs communs : pas de jointure)
  const lonA = lon0 + (frame[0] - TW / 2) / sc / (kx * 111.32), lonB = lon0 + (frame[2] - TW / 2) / sc / (kx * 111.32);
  const latA = lat0 - (frame[3] - TH / 2) / sc / 110.57, latB = lat0 - (frame[1] - TH / 2) / sc / 110.57;
  const cand = geoms.filter((g, i) => { const bb = boxes[i], sh = near((bb[0] + bb[2]) / 2, lon0) - (bb[0] + bb[2]) / 2;
    return bb[0] + sh <= lonB && bb[2] + sh >= lonA && bb[1] <= latB && bb[3] >= latA; });
  let land = topojson.merge(topo, cand);
  land = projGeom(land);
  let clipped; try { clipped = turf.bboxClip(turf.feature(land), frame).geometry; } catch (e) { clipped = land; }
  const terres = rings(clipped, 3, 400, false);                   // la côte n'est pas arrondie ici : la région doit la suivre exactement
  // un sommet de la région est « sur la côte » s'il est à moins de 3 m d'un contour des terres (non arrondi)
  const brut = rings(clipped, 3, 400, false), dSeg = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
  const surCote = p => brut.some(r => r.some((a, i) => { const b = r[(i + 1) % r.length]; return p[0] >= Math.min(a[0], b[0]) - 3 && p[0] <= Math.max(a[0], b[0]) + 3 && p[1] >= Math.min(a[1], b[1]) - 3 && p[1] <= Math.max(a[1], b[1]) + 3 && dSeg(p, a, b) < 3; }));
  const region = rings(projGeom(f.geometry), 3, 400, true, surCote);
  // --- fleuves : parties dans le cadre (plusieurs morceaux si le fleuve sort et rentre)
  const inF = p => p[0] >= frame[0] && p[0] <= frame[2] && p[1] >= frame[1] && p[1] <= frame[3];
  const fleuves = [];
  for (const rv of water.rivers) {
    const pts = rv.c.map(P); let run = [];
    const flush = () => { if (run.length > 1) {
      let s; try { s = turf.simplify(turf.lineString(run), { tolerance:2 }).geometry.coordinates; } catch (e) { s = run; }
      let L = 0; for (let i = 1; i < s.length; i++) L += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
      if (L > 60) fleuves.push({ n:rv.n, cls:rv.cls, pts:s.map(([x, y]) => [R(x), R(y)]) }); }
      run = []; };
    for (let i = 0; i < pts.length; i++) {
      if (inF(pts[i]) || (i > 0 && inF(pts[i - 1])) || (i < pts.length - 1 && inF(pts[i + 1]))) run.push(pts[i]); else flush();
    }
    flush();
  }
  // --- lacs du cadre
  const lacs = [];
  for (const lk of water.lakes) {
    const ring = lk.p.map(P); if (!ring.some(inF)) continue;
    const r = rings({ type:'Polygon', coordinates:[[...ring, ring[0]]] }, 2, 150)[0];
    if (r && r.length >= 4) lacs.push(r);
  }
  // --- capitale et routes vers les capitales voisines (du centre vers l'exterieur)
  const capitale = P(info.capitale).map(R);
  const vers = [];
  for (const [a, bId, c] of routes.routes) {
    if (a !== id && bId !== id) continue;
    const line = (a === id ? c : c.slice().reverse()).map(P);
    const cut = []; for (const p of line) { cut.push([R(p[0]), R(p[1])]); if (!inF(p)) break; }
    if (cut.length > 1) vers.push({ vers:a === id ? bId : a, pts:cut });
  }
  out[id] = { echelle:+sc.toFixed(3), region, terres, fleuves, lacs, capitale, routes:vers };
}
// --- ecriture : une region par ligne
const txt = '{\n"version": 2, "terrain": [' + TW + ', ' + TH + '],\n"regions": {\n' +
  Object.entries(out).map(([id, r]) => JSON.stringify(id) + ': ' + JSON.stringify(r)).join(',\n') + '\n}\n}\n';
fs.writeFileSync(path.join(ROOT, 'data/regions/formes.json'), txt);
const sea = Object.values(out).filter(r => { const a = r.terres.reduce((s, q) => s + ringArea(q), 0); return a < TW * TH * 1.04 * .995; }).length;
log(Object.keys(out).length, 'regions ·', sea, 'avec de la mer dans le cadre ·', Object.values(out).filter(r => !r.routes.length).length, 'sans route ·',
  'data/regions/formes.json ecrit (' + Math.round(txt.length / 1024) + ' Ko)');
