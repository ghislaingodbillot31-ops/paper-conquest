// charge tous les scripts d'une page de carte dans un vm (DOM factice) pour reperer les erreurs de chargement : node outils/_charge-page.js region.html 5
const fs = require('fs'), vm = require('vm'), [page, n] = process.argv.slice(2);
const stub = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => 0 : k === 'length' ? 0 : stub, apply: () => stub, construct: () => stub, has: () => true });
const store = {};
const html = fs.readFileSync(__dirname + '/../' + page, 'utf8'), mode = /PAGE = '(\w+)'/.exec(html)[1];
const ctx = vm.createContext({ console, Math, JSON, Map, Set, WeakMap, Array, Object, Number, String, Date, performance: { now: () => Date.now() }, URLSearchParams, Path2D: function () { return stub; }, DOMMatrix: function () { this.translate = () => this; this.scale = () => this; }, document: stub, MutationObserver: function () { return stub; }, ResizeObserver: function () { return stub; }, PIXI: undefined,
  location: { search: n ? '?region=' + n + '&biome=tempere&river=auto&seed=' + (n * 7919 + 101) : '' },
  localStorage: { getItem: k => store[k] ?? null, setItem(k, v) { store[k] = String(v); }, removeItem(k) { delete store[k]; }, key: i => Object.keys(store)[i], get length() { return Object.keys(store).length; } },
  XMLHttpRequest: function () { this.open = (m, u) => this.u = u; this.send = () => { this.status = 200; this.responseText = fs.readFileSync(__dirname + '/../' + this.u, 'utf8'); }; },
  matchMedia: () => stub, window: { devicePixelRatio: 1 }, addEventListener() {}, requestAnimationFrame() {}, setTimeout() {}, clearTimeout() {}, innerWidth: 1000, innerHeight: 800, navigator: {}, getComputedStyle: () => stub, Image: function () {}, Worker: function () {} });
const files = [...html.matchAll(/<script src="(js\/[^"]+)"/g)].map(m => m[1]);
vm.runInContext('const PAGE = ' + JSON.stringify(mode) + ';', ctx);
for (const f of files) { try { vm.runInContext(fs.readFileSync(__dirname + '/../' + f, 'utf8').replace('function masqueForme() {', 'function masqueForme() { return null;'), ctx, { filename: f }); }
  catch (e) { console.log('ERREUR dans', f, '->', e.message.slice(0, 160), (e.stack.split('\n').find(l => l.includes(f)) || '').trim()); break; } }
console.log('scripts charges :', files.length, 'page', mode);
// peinture d'une tuile avec un contexte factice : repere les variables inconnues et fautes de frappe du dessin
if (process.argv[4] !== 'sans-dessin') try { vm.runInContext('computeFlora(); paintWith(' + 'document.createElement(), 512, 512, 1, -2800, -2000, drawDecor); paintWith(document.createElement(), 512, 512, 8, -23000, -16000, drawDecor);', ctx); console.log('dessin de 2 tuiles : ok'); }
catch (e) { console.log('ERREUR de dessin :', e.stack.split('\n').slice(0, 4).join(' | ')); }
