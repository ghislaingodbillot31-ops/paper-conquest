// controle de la regle des lacs (LAC_DIST) sans navigateur : node outils/_lacs.js [ids de regions separes par des virgules]
const fs = require('fs'), vm = require('vm');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const ctx = vm.createContext({ console, Math, JSON, Map, Set, WeakMap, Array, Object, Number, String, Path2D: function () {}, DOMMatrix: function () {}, document: stub,
  location: { search: '' }, localStorage: { getItem: () => null, setItem() {} }, matchMedia: () => stub, window: {}, PAGE: 'carte', addEventListener() {}, requestAnimationFrame() {} });
const rd = f => fs.readFileSync(__dirname + '/../js/' + f + '.js', 'utf8');
let src = ['batiments/catalogue', ...['base', 'forme', 'geometrie', 'eau', 'paysage', 'zonage', 'generateur', 'routes', 'rendu'].map(f => 'carte/' + f)].map(rd).join('\n;\n');
src += `;globalThis.__t = function (FJ, ids) {
  const out = []; FORMES = FJ; masqueForme = () => null;
  for (const id of ids) { FORME = FJ.regions[id]; FORME_ID = id; const n0 = FORME.lacs.length; generateRegion('tempere', 1, 'auto');
    out.push(['region', id, 'lacs reels', n0, 'gardes', S.lakes.length, 'tous libres', S.lakes.every(l => lacLibre(l))]); }
  FORME = null; FORME_ID = null;
  for (let sd = 1; sd <= 15; sd++) { generateRegion('tempere', sd, 'auto'); out.push(['rectangle graine', sd, 'lacs', S.lakes.length, 'rayons', S.lakes.map(l => Math.round(Math.max(...l.pts.map(q => segLen(q, l.c))))).join('/'), 'tous libres', S.lakes.every(l => lacLibre(l))]); }
  return out; }`;
vm.runInContext(src, ctx);
const ids = (process.argv[2] || '2,6,9,21').split(',');
console.log(ctx.__t(JSON.parse(fs.readFileSync(__dirname + '/../data/regions/formes.json', 'utf8')), ids).map(x => x.join(' ')).join('\n'));
