// simule le chargement de region.html?region=N (sans navigateur) : node outils/_region-page.js 5 40 300
const fs = require('fs'), vm = require('vm');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const rd = f => fs.readFileSync(__dirname + '/../js/' + f + '.js', 'utf8').replace('function masqueForme() {', 'function masqueForme() { return null;');   // (pas de canevas hors navigateur : tout est terre)
for (const n of process.argv.slice(2)) {
  const store = {};
  const ctx = vm.createContext({ console, Math, JSON, Map, Set, WeakMap, Array, Object, Number, String, URLSearchParams, Path2D: function () {}, DOMMatrix: function () {}, document: stub,
    location: { search: '?region=' + n + '&biome=tempere&river=auto&seed=' + (n * 7919 + 101) },
    localStorage: { getItem: k => store[k] ?? null, setItem(k, v) { store[k] = String(v); }, removeItem(k) { delete store[k]; }, key: i => Object.keys(store)[i], get length() { return Object.keys(store).length; } },
    XMLHttpRequest: function () { this.open = (m, u) => this.u = u; this.send = () => { this.status = 200; this.responseText = fs.readFileSync(__dirname + '/../' + this.u, 'utf8'); }; },
    matchMedia: () => stub, window: {}, PAGE: 'region', addEventListener() {}, requestAnimationFrame() {} });
  const src = ['batiments/catalogue', ...['base', 'forme', 'geometrie', 'eau', 'paysage', 'zonage', 'generateur'].map(f => 'carte/' + f)].map(rd).join('\n;\n') + ';globalThis.__r = { forme: S && S.forme, bourg: S && S.bourg, roads: S && S.roads.length, lakes: S && S.lakes.length, rect: !FORME };';
  try { vm.runInContext(src, ctx); console.log(n, JSON.stringify(ctx.__r)); } catch (e) { console.log(n, 'ERREUR', e.stack.split('\n').slice(0, 4).join(' | ')); }
}
