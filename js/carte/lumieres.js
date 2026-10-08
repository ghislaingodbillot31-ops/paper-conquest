/* ---------- lumières de la nuit (region.html) ----------
   La nuit, un calque (#lumieres, au-dessus de la carte) assombrit l'écran comme le voile #nuit (couleur : voileCiel, saisons.js) mais en y creusant des halos : les sources de lumière éclairent le SOL autour d'elles.
   Elles viennent des fenêtres (posées sur la ligne du toit, elles éclairent vers la rue) ou de torches plantées à l'avant de la parcelle, côté rue ; feux de camp et braseros pour les lieux à ciel ouvert.
   Les toits ne sont jamais éclairés : tout ce qui est derrière la bande libre de l'avant (FRONT_LIBRE) est re-noirci après les halos (sauf les lieux à ciel ouvert, SANS_TOIT). Lumière fixe, sans variation. Le voile #nuit
   est masqué (ce calque le remplace). Plein jour : rien n'est dessiné. Sources : LUMIERES[bâtiment] = [type, u, t depuis le bord de rue de la parcelle, rayon en m]. */
const LUMIERES = {
  camp_colon:[['feu', 0, 5, 18]],
  taverne:[['fenetre', -3, 3.2, 9], ['fenetre', 3, 3.2, 9], ['torche', -6, 1, 7], ['torche', 6, 1, 7]],
  puits:[['torche', 1.5, 1.5, 6]],
  mairie:[['torche', -5, 1.2, 10], ['torche', 5, 1.2, 10]], manoir:[['torche', -5, 1.2, 10], ['torche', 5, 1.2, 10]], eglise:[['torche', -3, 1.2, 10], ['torche', 3, 1.2, 10]],
  camp_bucherons:[['feu', -4.3, 7.1, 11]], camp_chasse:[['feu', -3.6, 6.3, 11]], hutte_charbonnier:[['feu', 4.2, 14.2, 10], ['feu', 3.4, 8.6, 9]],
  forge:[['torche', -4, 1.2, 8], ['torche', 4, 1.2, 8]], fonderie:[['torche', -4, 1.2, 9], ['torche', 4, 1.2, 9]], cabane_peche:[['torche', 0, 1.2, 7]], fosse_miniere:[['torche', -5.5, 9, 9], ['torche', -2.5, 13.4, 9]],
  fromagerie:[['torche', -4, 1.2, 8], ['torche', 4, 1.2, 8]], grange:[['torche', 0, 1.2, 8]], entrepot:[['torche', 0, 1.2, 8]],
};
const SANS_TOIT = new Set(['marche', 'camp_colon', 'camp_bucherons', 'camp_chasse', 'hutte_charbonnier', 'puits', 'fosse_miniere', 'cimetiere']);   // lieux à ciel ouvert : pas de toit à garder dans l'ombre
const LUM_COUL = { feu:'255,160,60', torche:'255,175,80', fenetre:'255,205,120' };
const FRONT_LIBRE = 3;   // m : bande à l'avant de la parcelle (jardin, clôture, route) qui reste éclairée ; le reste de la parcelle (maison, toit) est re-noirci
let lumCache = { v:-1, n:-1, list:[] }, lumCanvas = null;
function sourcesLumiere() {
  const ne = typeof etalsMarche === 'function' ? etalsMarche().length : 0;
  if (lumCache.v === sceneV && lumCache.n === S.houses.length && lumCache.e === ne) return lumCache.list;
  const list = [];
  for (const h of S.houses) {
    const b = buildingOf(h);
    if (h.kind === 'marche') { for (const e of etalsMarche()) { const [u0, t0, u1] = cellMarche(h, e.c), [x, y] = local(h, (u0 + u1) / 2, (h.front || 1) * (t0 + 1.5 - h.l / 2)); list.push({ x, y, r:4, type:'torche' }); } continue; }   // le marché n'est pas éclairé : une petite lumière par étal installé
    const defs = LUMIERES[h.kind] || (b && b.cap && typeof occupation === 'function' && occupation(h) > 0 ? [['fenetre', 0, 3.2, 7]] : null);   // logement habité : une fenêtre éclairée, devant la façade
    if (!defs) continue;
    for (const [type, u, t, r] of defs) { const [x, y] = local(h, u, (h.front || 1) * (t - h.l / 2)); list.push({ x, y, r, type }); }
  }
  lumCache = { v:sceneV, n:S.houses.length, e:ne, list }; return list;
}
function drawLumieres() {
  if (typeof soleil !== 'function' || typeof wrap === 'undefined' || !wrap) return;
  if (!lumCanvas) {
    lumCanvas = document.createElement('canvas'); lumCanvas.id = 'lumieres'; lumCanvas.setAttribute('aria-hidden', 'true');
    lumCanvas.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:2';
    wrap.appendChild(lumCanvas); const v = document.getElementById('nuit'); if (v) v.style.display = 'none';          // ce calque remplace le voile de nuit
  }
  if (lumCanvas.width !== cv.width || lumCanvas.height !== cv.height) { lumCanvas.width = cv.width; lumCanvas.height = cv.height; }
  const c = lumCanvas.getContext('2d'), lum = soleil(REGION_METEO.lat, METEO.doy, heureCarte()).lumiere, voile = voileCiel(lum);
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, lumCanvas.width, lumCanvas.height);
  if (lum >= .97) return;                                                                      // plein jour : rien
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.fillStyle = voile; c.fillRect(0, 0, W, H);
  const k = Math.min(1, (1 - lum) * 1.5), sc = view.s, sources = sourcesLumiere();
  for (const L of sources) {
    const [X, Y] = toS(L.x, L.y), R = L.r * sc;
    if (X < -R || Y < -R || X > W + R || Y > H + R) continue;
    c.globalCompositeOperation = 'destination-out';                                              // le halo éclaircit la nuit, sur le sol
    let g = c.createRadialGradient(X, Y, 0, X, Y, R); g.addColorStop(0, `rgba(0,0,0,${(.95 * k).toFixed(3)})`); g.addColorStop(.6, `rgba(0,0,0,${(.5 * k).toFixed(3)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(X - R, Y - R, 2 * R, 2 * R);
    c.globalCompositeOperation = 'source-over';                                                  // lueur chaude
    g = c.createRadialGradient(X, Y, 0, X, Y, R * .8); g.addColorStop(0, `rgba(${LUM_COUL[L.type]},${(.34 * k).toFixed(3)})`); g.addColorStop(1, `rgba(${LUM_COUL[L.type]},0)`);
    c.fillStyle = g; c.fillRect(X - R, Y - R, 2 * R, 2 * R);
  }
  for (const h of S.houses) {                                                                    // les toits restent dans l'ombre : l'emprise du bâtiment est re-noircie
    if (SANS_TOIT.has(h.kind)) continue;
    const P = [[-h.w / 2, FRONT_LIBRE], [h.w / 2, FRONT_LIBRE], [h.w / 2, h.l], [-h.w / 2, h.l]].map(([u, t]) => { const q = local(h, u, (h.front || 1) * (t - h.l / 2)); return toS(q[0], q[1]); }); if (P.every(p => p[0] < -50 || p[0] > W + 50) || P.every(p => p[1] < -50 || p[1] > H + 50)) continue;
    c.beginPath(); P.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath();
    c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000'; c.fill();
    c.globalCompositeOperation = 'source-over'; c.fillStyle = voile; c.fill();
  }
  if (sc > .35) for (const L of sources) {                                                       // torches (poteau et flamme) et feux, constants
    if (L.type === 'fenetre') continue;
    const [X, Y] = toS(L.x, L.y), f = Math.max(2, (L.type === 'feu' ? .55 : .3) * sc);
    if (X < -20 || Y < -20 || X > W + 20 || Y > H + 20) continue;
    if (L.type === 'torche') { c.fillStyle = '#4a321c'; c.fillRect(X - f * .25, Y, f * .5, f * 1.6); }
    c.beginPath(); c.arc(X, Y, f, 0, Math.PI * 2); c.fillStyle = '#ff9a3c'; c.fill();
    c.beginPath(); c.arc(X, Y - f * .15, f * .55, 0, Math.PI * 2); c.fillStyle = '#ffe08a'; c.fill();
  }
}
