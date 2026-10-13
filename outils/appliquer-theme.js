// Remplace toutes les couleurs littérales du projet (#rgb, #rrggbb, #rrggbbaa, rgb(), rgba(), hsl() sans variable, 'red') par la couleur la plus proche
// du thème de 16 couleurs (js/theme.js), au sens de la différence de teinte perçue (Lab). La transparence est conservée.
// Sauvegarde préalable de chaque fichier modifié dans outils/avant-theme-couleurs/ (même arborescence). node outils/appliquer-theme.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), SAUV = path.join(__dirname, 'avant-theme-couleurs');
const THEME = new Function(fs.readFileSync(path.join(ROOT, 'js/theme.js'), 'utf8') + ';return THEME')();
const rgbOf = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lab = ([r, g, b]) => { const f = v => { v /= 255; return v > .04045 ? Math.pow((v + .055) / 1.055, 2.4) : v / 12.92; }, R = f(r), G = f(g), B = f(b);
  const X = (R * .4124 + G * .3576 + B * .1805) / .95047, Y = R * .2126 + G * .7152 + B * .0722, Z = (R * .0193 + G * .1192 + B * .9505) / 1.08883, t = v => v > .008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116;
  return [116 * t(Y) - 16, 500 * (t(X) - t(Y)), 200 * (t(Y) - t(Z))]; };
const PAL = THEME.map(c => ({ hex: c.hex, rgb: rgbOf(c.hex), lab: lab(rgbOf(c.hex)) }));
const cache = new Map();
// l'herbe vive des régions est remplacée par les deux couleurs du globe (herbe claire / herbe foncée) : pas de teinte voisine au hasard
const HERBE = { '#aacb2a':'herbe', '#b4d12e':'herbe', '#86b95a':'herbe', '#9cc122':'herbe-sombre', '#a8c828':'herbe-sombre' };
const imposee = hex => { const id = HERBE[hex.toLowerCase()]; return id && PAL.find((p, i) => THEME[i].id === id); };
const proche = rgb => { const k = rgb.join(); if (cache.has(k)) return cache.get(k); const L = lab(rgb); let best = PAL[0], bd = Infinity;
  for (const p of PAL) { const d = (p.lab[0] - L[0]) ** 2 + (p.lab[1] - L[1]) ** 2 + (p.lab[2] - L[2]) ** 2; if (d < bd) { bd = d; best = p; } } cache.set(k, best); return best; };
const hslRgb = (h, s, l) => { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return [f(0), f(8), f(4)].map(v => Math.round(v * 255)); };
const NOMS = { red:[200, 30, 30] };
const re = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\)|hsla?\(\s*[\d.]+\s*,\s*[\d.]+%\s*,\s*[\d.]+%(?:\s*,\s*[\d.]+)?\s*\)|(?<=['"])red(?=['"])/g;
function remplace(m) {
  if (m[0] === '#') {
    let h = m.slice(1), a = ''; if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
    if (h.length === 8) { a = h.slice(6); h = h.slice(0, 6); }
    const p = imposee('#' + h) || proche(rgbOf('#' + h)); return p.hex + a;
  }
  if (m === 'red') return proche(NOMS.red).hex;
  const n = m.match(/[\d.]+/g).map(Number); const rgb = m[0] === 'h' ? hslRgb(n[0], n[1], n[2]) : n.slice(0, 3), a = n.length > 3 ? n[3] : null, p = proche(rgb);
  return a === null ? p.hex : 'rgba(' + p.rgb.join(',') + ',' + a + ')';
}
const skip = new Set(['node_modules', 'graphify-out', '.git', 'tools', 'outils', 'REFERENCE', '.claude']);
const fichiers = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { if (skip.has(f.name)) continue; const p = path.join(d, f.name);
  if (f.isDirectory()) { if (f.name === 'data' && d === ROOT) continue; walk(p); } else if (/\.(html|css|js)$/.test(f.name) && !/maplibre|theme\.(js|css)$|theme-couleurs/.test(f.name)) fichiers.push(p); } })(ROOT);
fichiers.push(path.join(ROOT, 'data/regions/regions.json'));
let nf = 0, nv = 0;
for (const f of fichiers) {
  const s = fs.readFileSync(f, 'utf8'); let n = 0;
  const t = s.replace(re, m => { n++; return remplace(m); });
  if (t === s) continue;
  const dest = path.join(SAUV, path.relative(ROOT, f)); fs.mkdirSync(path.dirname(dest), { recursive: true }); if (!fs.existsSync(dest)) fs.writeFileSync(dest, s);
  fs.writeFileSync(f, t); nf++; nv += n;
}
console.log('fichiers modifiés', nf, '| couleurs remplacées', nv, '| palette', PAL.length, 'couleurs | sauvegardes : outils/avant-theme-couleurs/');
