/* ---------- Peintre de paysage : sol, forêts, montagnes et neige d'après les fiches des régions ----------
   Partagé par le globe (js/jeu/paysage-monde.js : bouton « Paysage ») et par la carte de région
   (js/carte/horizon.js : les régions voisines autour du village). Couleurs et densité de forêt de
   chaque biome : celles des cartes de région (js/carte/generateur.js, BIOMES). Les passages d'une
   région à l'autre sont fondus (champs lissés) et la forêt est tirée d'un bruit continu : aucune
   découpe visible suivant les frontières. Expose peintPaysage() et PAYSAGE_BIOMES. */
const { peintPaysage, PAYSAGE_BIOMES } = (() => {
const PAYSAGE_BIOMES = {   // sol, canopée [claire, sombre], densité de forêt (0 à 1)
  polaire:{ g:'#e9eef0', c:['#cfe0e4', '#cfe0e4'], d:0 },
  toundra:{ g:'#c8c6a3', c:['#7e9275', '#5f7a5a'], d:.07 },
  taiga:{ g:'#c9cba2', c:['#5d8359', '#33563f'], d:.85 },
  tempere:{ g:'#dcd89a', c:['#7bb05c', '#44763a'], d:.72 },
  prairie:{ g:'#dbd792', c:['#a3c26a', '#7a9d4c'], d:.1 },
  subtropicale:{ g:'#d4d08a', c:['#6a9a4a', '#355f31'], d:.65 },
  mediterraneenne:{ g:'#dfcb8b', c:['#9aa25e', '#566134'], d:.42 },
  mousson:{ g:'#d7c97f', c:['#84983f', '#46582a'], d:.62 },
  desert_aride:{ g:'#ead5a0', c:['#b9b27a', '#b9b27a'], d:0 },
  xerophyte:{ g:'#e0c894', c:['#b2a869', '#8f8a4f'], d:.04 },
  steppe_aride:{ g:'#dccf92', c:['#b4ab6c', '#97905a'], d:.05 },
  semi_aride:{ g:'#e3cb96', c:['#b4ab6c', '#97905a'], d:.04 },
  savane:{ g:'#dfc673', c:['#a3a750', '#7b853e'], d:.12 },
  savane_claire:{ g:'#d9c678', c:['#8a9444', '#5b6531'], d:.42 },
  tropicale_cad:{ g:'#d4c47b', c:['#8a9a42', '#4c6430'], d:.62 },
  tropicale:{ g:'#cfd08a', c:['#4a8440', '#1f4a28'], d:.92 },
  toundra_alpine:{ g:'#cac7ae', c:['#9a9a78', '#7f8260'], d:.03 },
  montagne:{ g:'#cfcca1', c:['#5f8a58', '#355c3d'], d:.55 },
};
const ROCHE = [165, 158, 138], NEIGE = [244, 248, 249];
const hex3 = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// bruit de valeur fractal (graine fixe : le monde est le même à chaque fois)
const PN = (() => { const p = new Uint8Array(512), r = new Uint8Array(256); let s = 1234567;
  for(let i = 0; i < 256; i++) r[i] = i;
  for(let i = 255; i > 0; i--){ s = (s * 16807) % 2147483647; const j = s % (i + 1); [r[i], r[j]] = [r[j], r[i]]; }
  for(let i = 0; i < 512; i++) p[i] = r[i & 255]; return p; })();
const nv = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255,
  u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf),
  a = PN[PN[X] + Y], b = PN[PN[X + 1] + Y], c = PN[PN[X] + Y + 1], d = PN[PN[X + 1] + Y + 1];
  return ((a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v) / 255; };
const fbm = (x, y, o = 4) => { let s = 0, a = .5, n = 0; for(let i = 0; i < o; i++){ s += nv(x, y) * a; n += a; a *= .5; x *= 2.03; y *= 2.03; } return s / n; };

const yieldUi = () => new Promise(r => setTimeout(r, 0));

/* Peint un monde de w x h pixels.
   regions : [{ id, rings:[[[x, y], ...], ...] }]  (contours en pixels de l'image)
   info(id) : fiche de la région (climat, relief) ; opts : { fieldDiv, flou, bruit, densite (x forêt), mer, progres }
   Renvoie un canevas : terres peintes, transparent ailleurs (ou couleur de mer si opts.mer). */
async function peintPaysage(w, h, regions, info, opts = {}) {
  const div = opts.fieldDiv || 4, blur = opts.flou || 6, sc = opts.bruit || 1 / 34, fw = Math.ceil(w / div), fh = Math.ceil(h / div);
  const trace = (g, k, list) => { g.beginPath(); for (const r of list) for (const ring of r.rings) { ring.forEach((p, i) => i ? g.lineTo(p[0] * k, p[1] * k) : g.moveTo(p[0] * k, p[1] * k)); g.closePath(); } };
  const terre = document.createElement('canvas'); terre.width = w; terre.height = h;
  const tg = terre.getContext('2d'); tg.fillStyle = '#fff'; trace(tg, 1, regions); tg.fill('evenodd');
  const champ = fn => { const a = document.createElement('canvas'), b = document.createElement('canvas'); a.width = b.width = fw; a.height = b.height = fh;
    const g = a.getContext('2d'); for (const r of regions) { g.fillStyle = fn(r.id); trace(g, 1 / div, [r]); g.fill(); }
    const q = b.getContext('2d'); q.filter = `blur(${blur}px)`; q.drawImage(a, 0, 0); q.filter = 'none';
    q.globalCompositeOperation = 'destination-over'; q.drawImage(a, 0, 0);   // (le flou ne doit pas laisser de trou)
    return q.getImageData(0, 0, fw, fh).data; };
  const biomeOf = id => PAYSAGE_BIOMES[info(id).climat.biome] || PAYSAGE_BIOMES.tempere;
  const rgb = a => `rgb(${a[0] | 0},${a[1] | 0},${a[2] | 0})`;
  const fSol = champ(id => rgb(hex3(biomeOf(id).g))), fCan = champ(id => rgb(hex3(biomeOf(id).c[0]))), fCan2 = champ(id => rgb(hex3(biomeOf(id).c[1])));
  const fNum = champ(id => { const i = info(id), b = biomeOf(id), hu = i.climat.humidite == null ? .5 : i.climat.humidite;
    const mont = Math.max(i.relief.montagne || 0, i.relief.type === 'montagne' ? .85 : i.relief.type === 'collines' ? .25 : 0);
    const dens = Math.max(0, Math.min(1, b.d * (opts.densite || 1) * (.75 + .5 * hu)));
    return `rgb(${dens * 255 | 0},${mont * 255 | 0},${Math.max(0, Math.min(255, (i.climat.temperature_c + 30) * 4)) | 0})`; });
  const samp = (data, u, v) => { const x = Math.max(0, Math.min(fw - 1.001, u * (fw - 1))), y = Math.max(0, Math.min(fh - 1.001, v * (fh - 1))), xi = x | 0, yi = y | 0, fx = x - xi, fy = y - yi, o = (yi * fw + xi) * 4;
    const k = c => (data[o + c] * (1 - fx) + data[o + 4 + c] * fx) * (1 - fy) + (data[o + fw * 4 + c] * (1 - fx) + data[o + fw * 4 + 4 + c] * fx) * fy; return [k(0), k(1), k(2)]; };
  const out = document.createElement('canvas'); out.width = w; out.height = h; const og = out.getContext('2d');
  const STRIP = 64;
  for (let y0 = 0; y0 < h; y0 += STRIP) {
    const rows = Math.min(STRIP, h - y0), mask = tg.getImageData(0, y0, w, rows).data, img = og.createImageData(w, rows), px = img.data;
    for (let y = 0; y < rows; y++) for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4, al = mask[o + 3]; if (al < 4) continue;
      const u = x / w, v = (y0 + y) / h, gs = samp(fSol, u, v), c1 = samp(fCan, u, v), c2 = samp(fCan2, u, v), nm = samp(fNum, u, v);
      const dens = nm[0] / 255, mont = nm[1] / 255, temp = nm[2] / 4 - 30;
      const n = fbm(x * sc + 17.3, (y0 + y) * sc + 91.1), fine = nv(x * .35, (y0 + y) * .35);
      let col = mixC(gs, [gs[0] * .93, gs[1] * .93, gs[2] * .9], smooth(.35, .75, fbm(x * sc * 2.7, (y0 + y) * sc * 2.7, 3)));   // taches de sol
      if (dens > .01) {   // forêt : plus la densité est haute, plus le seuil est bas ; le cœur est plus sombre
        const thr = 1 - dens * .92, f = smooth(thr - .02, thr + .05, n), depth = smooth(0, .22, n - thr);
        col = mixC(col, mixC(c1, c2, depth * .85 + (fine - .5) * .25), f * .94); }
      if (mont > .03) {   // relief : crêtes de roche, éclairées du nord-ouest, neige en altitude/froid
        const h0 = 1 - Math.abs(2 * fbm(x * sc * 1.6, (y0 + y) * sc * 1.6, 4) - 1), h1 = 1 - Math.abs(2 * fbm((x + 1.5) * sc * 1.6, (y0 + y + 1.5) * sc * 1.6, 4) - 1);
        const rock = smooth(.58, .86, h0 * (.5 + mont * .6)), shade = Math.max(-1, Math.min(1, (h0 - h1) * 14));
        col = mixC(col, ROCHE, rock * Math.min(1, mont * 1.3) * .85);
        const snow = smooth(.72, .92, h0 * (.55 + mont * .5)) * smooth(7, -6, temp) * Math.min(1, mont * 1.5);
        col = mixC(col, NEIGE, snow);
        const k = 1 + shade * .13 * Math.min(1, mont * 1.5); col = [col[0] * k, col[1] * k, col[2] * k]; }
      if (temp < -8 && dens < .2) col = mixC(col, NEIGE, smooth(-8, -18, temp) * .9);   // calottes
      const k2 = 1 + (fine - .5) * .06;   // grain très léger
      px[o] = Math.min(255, col[0] * k2); px[o + 1] = Math.min(255, col[1] * k2); px[o + 2] = Math.min(255, col[2] * k2); px[o + 3] = al;
    }
    og.putImageData(img, 0, y0);
    if (opts.progres) opts.progres(Math.round((y0 + rows) / h * 100));
    await yieldUi();
  }
  if (!opts.mer) return out;
  const res = document.createElement('canvas'); res.width = w; res.height = h; const rg = res.getContext('2d');
  rg.fillStyle = opts.mer; rg.fillRect(0, 0, w, h); rg.drawImage(out, 0, 0); return res;
}
return { peintPaysage, PAYSAGE_BIOMES };
})();
