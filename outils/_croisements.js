// controle des raccords de routes, sans navigateur : node outils/_croisements.js [nb_regions]
// charge le generateur dans un vm, lisse chaque route des cartes a forme reelle et liste les virages
// les plus serres pres des bouts de route (= crochets aux carrefours)
const fs = require('fs'), vm = require('vm');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const ctx = vm.createContext({ console, Math, JSON, Map, Set, Array, Object, Number, String, DOMMatrix: function () {}, document: stub,
  location: { search: '' }, localStorage: { getItem: () => null, setItem() {} }, matchMedia: () => stub, window: {}, PAGE: 'carte',
  addEventListener() {}, requestAnimationFrame() {} });
const rd = f => fs.readFileSync(__dirname + '/../js/' + f + '.js', 'utf8');
let src = ['batiments/catalogue', ...['base', 'forme', 'geometrie', 'eau', 'paysage', 'zonage', 'generateur', 'routes'].map(f => 'carte/' + f)].map(rd).join('\n;\n');
src += `
;globalThis.__t = function (FJ, limit) {
  const out = []; FORMES = FJ; masqueForme = () => null;
  for (const id of Object.keys(FJ.regions).slice(0, limit)) {
    FORME = FJ.regions[id]; FORME_ID = id; generateRegion('tempere', 1, 'auto'); smoothCache.clear();
    for (const r of S.roads) for (const first of [true, false]) {
      let P = smoothPts(r); if (!first) P = P.slice().reverse();
      const R = resample(P, 1).slice(0, 25); let dev = 0, at = 0;          // virage max (deg) sur les 24 premiers metres
      for (let i = 1; i < R.length - 1; i++) {
        const a1 = Math.atan2(R[i][1] - R[i - 1][1], R[i][0] - R[i - 1][0]), a2 = Math.atan2(R[i + 1][1] - R[i][1], R[i + 1][0] - R[i][0]);
        const t = Math.abs(((a2 - a1) * 180 / Math.PI + 540) % 360 - 180); if (t > dev) { dev = t; at = i; }
      }
      out.push({ id, road:r.id, first, dev:+dev.toFixed(0), at });
      if (this.__d && id === this.__d[0] && r.id == this.__d[1] && first) console.log('RAW', JSON.stringify(r.pts.slice(0, 4).map(q => q.map(Math.round))), 'SMOOTH', JSON.stringify(R.slice(0, 25).filter((_, i) => i % 3 == 0).map(q => q.map(v => +v.toFixed(1)))), 'ROADS', S.roads.map(o => o.id + ':' + JSON.stringify(o.pts[0].map(Math.round)) + JSON.stringify(o.pts[o.pts.length-1].map(Math.round))).join(' '));
    }
  }
  return out;
};`;
try {
  vm.runInContext(src, ctx, { filename: 'bundle' });
  const FJ = JSON.parse(fs.readFileSync(__dirname + '/../data/regions/formes.json', 'utf8'));
  if (process.env.DUMP) { ctx.__d = process.env.DUMP.split(","); }
  const o = ctx.__t(FJ, +process.argv[2] || 60); o.sort((a, b) => b.dev - a.dev);
  console.log(o.slice(0, 12), 'n=', o.length, 'dev>25:', o.filter(x => x.dev > 25).length);
} catch (e) { console.log(e.stack.split('\n').slice(0, 6).join('\n')); }
