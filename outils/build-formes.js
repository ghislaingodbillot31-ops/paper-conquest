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
  const rings = (g, tol, minArea) => {                                           // anneaux simplifies, en metres de carte
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    const res = [];
    for (const poly of polys) for (const ring of poly) {
      if (ring.length < 4) continue;
      let s; try { s = turf.simplify(turf.polygon([ring]), { tolerance:tol, highQuality:false }).geometry.coordinates[0]; } catch (e) { s = ring; }
      if (ringArea(s) >= minArea) res.push(s.slice(0, -1).map(([x, y]) => [R(x), R(y)]));
    }
    return res;
  };
  // --- la region
  const region = rings(projGeom(f.geometry), 3, 400);
  // --- terres du cadre : regions dont la boite touche le cadre, fusionnees (arcs communs : pas de jointure)
  const lonA = lon0 + (frame[0] - TW / 2) / sc / (kx * 111.32), lonB = lon0 + (frame[2] - TW / 2) / sc / (kx * 111.32);
  const latA = lat0 - (frame[3] - TH / 2) / sc / 110.57, latB = lat0 - (frame[1] - TH / 2) / sc / 110.57;
  const cand = geoms.filter((g, i) => { const bb = boxes[i], sh = near((bb[0] + bb[2]) / 2, lon0) - (bb[0] + bb[2]) / 2;
    return bb[0] + sh <= lonB && bb[2] + sh >= lonA && bb[1] <= latB && bb[3] >= latA; });
  let land = topojson.merge(topo, cand);
  land = projGeom(land);
  let clipped; try { clipped = turf.bboxClip(turf.feature(land), frame).geometry; } catch (e) { clipped = land; }
  const terres = rings(clipped, 3, 400);
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
  out[id] = { echelle:+sc.toFixed(3), o:[+lon0.toFixed(5), +lat0.toFixed(5)], region, terres, fleuves, lacs, capitale, routes:vers };
}
// --- ecriture : une region par ligne
const txt = '{\n"version": 2, "terrain": [' + TW + ', ' + TH + '],\n"regions": {\n' +
  Object.entries(out).map(([id, r]) => JSON.stringify(id) + ': ' + JSON.stringify(r)).join(',\n') + '\n}\n}\n';
fs.writeFileSync(path.join(ROOT, 'data/regions/formes.json'), txt);
const sea = Object.values(out).filter(r => { const a = r.terres.reduce((s, q) => s + ringArea(q), 0); return a < TW * TH * 1.04 * .995; }).length;
log(Object.keys(out).length, 'regions ·', sea, 'avec de la mer dans le cadre ·', Object.values(out).filter(r => !r.routes.length).length, 'sans route ·',
  'data/regions/formes.json ecrit (' + Math.round(txt.length / 1024) + ' Ko)');
