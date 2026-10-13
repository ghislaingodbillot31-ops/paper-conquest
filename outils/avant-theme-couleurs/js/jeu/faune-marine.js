/* ---------- faune marine du globe (décor) ----------
   Des créatures dessinées à la plume (baleines, requins, dauphins, tortues, poulpes, serpents de mer) nagent dans les mers, comme sur une
   vieille carte au trésor. Positions tirées une fois pour toutes (graine fixe) au large : jamais sur une terre ni près d'une côte. Pas d'interaction.
   Espèce selon la latitude ; dessin par canevas (images ajoutées à la carte), calque placé SOUS les régions. */
const FAUNE_MARINE = {
  baleine:  { zones:[[28, 80]], w:78, h:56 }, requin:   { zones:[[0, 38]], w:64, h:38 }, dauphin: { zones:[[0, 50]], w:50, h:38 },
  tortue:   { zones:[[0, 28]], w:44, h:36 }, poulpe:   { zones:[[0, 80]], w:50, h:56 }, serpent: { zones:[[20, 80]], w:84, h:36 },
  kraken:   { zones:[[0, 80]], w:76, h:76, rare:true },   // rare : posé à la main, un par grand océan
};
function dessinFauneCorps(g, k, w, h) {
  const cx = w / 2, cy = h / 2;
  g.lineWidth = 1.6; g.lineJoin = g.lineCap = 'round'; g.strokeStyle = '#1e241a'; g.fillStyle = 'rgba(232,220,176,0.92)';
  const fin = () => { g.fill(); g.stroke(); };
  g.beginPath();
  if (k === 'baleine') {
    g.moveTo(6, cy + 2); g.bezierCurveTo(10, cy - 16, 44, cy - 14, 58, cy + 2); g.bezierCurveTo(64, cy + 6, 66, cy - 2, 72, cy - 10);
    g.bezierCurveTo(72, cy - 2, 76, cy + 4, 72, cy + 10); g.bezierCurveTo(66, cy + 6, 62, cy + 12, 54, cy + 12); g.bezierCurveTo(32, cy + 16, 12, cy + 12, 6, cy + 2); fin();
    g.beginPath(); g.arc(20, cy - 2, 1.4, 0, 6.3); g.fillStyle = '#1e241a'; g.fill();
    g.beginPath(); g.moveTo(16, cy - 12); g.quadraticCurveTo(14, cy - 20, 10, cy - 22); g.moveTo(16, cy - 12); g.quadraticCurveTo(18, cy - 20, 22, cy - 22); g.stroke();   // le jet
  } else if (k === 'requin') {
    g.moveTo(4, cy + 4); g.bezierCurveTo(14, cy - 4, 36, cy - 6, 50, cy + 2); g.lineTo(60, cy - 8); g.lineTo(58, cy + 4); g.lineTo(60, cy + 12); g.lineTo(48, cy + 6);
    g.bezierCurveTo(34, cy + 12, 14, cy + 10, 4, cy + 4); fin();
    g.beginPath(); g.moveTo(26, cy - 3); g.lineTo(32, cy - 14); g.lineTo(38, cy - 3); fin();   // l'aileron dorsal
    g.beginPath(); g.arc(14, cy + 2, 1.2, 0, 6.3); g.fillStyle = '#1e241a'; g.fill();
  } else if (k === 'dauphin') {
    g.moveTo(4, cy - 2); g.quadraticCurveTo(8, cy - 4, 14, cy - 4); g.bezierCurveTo(22, cy - 16, 38, cy - 12, 42, cy + 6); g.lineTo(48, cy + 2); g.lineTo(46, cy + 10); g.lineTo(40, cy + 10);
    g.bezierCurveTo(30, cy + 12, 18, cy + 4, 14, cy + 2); g.quadraticCurveTo(8, cy + 2, 4, cy - 2); fin();
    g.beginPath(); g.arc(14, cy - 2, 1.1, 0, 6.3); g.fillStyle = '#1e241a'; g.fill();
  } else if (k === 'tortue') {
    g.ellipse(cx, cy, 14, 11, 0, 0, 6.3); fin();
    g.beginPath(); g.arc(cx + 18, cy, 5, 0, 6.3); fin();
    for (const [x, y] of [[-9, -12], [-9, 12], [9, -12], [9, 12]]) { g.beginPath(); g.ellipse(cx + x, cy + y, 6, 3, x > 0 ? .5 : -.5, 0, 6.3); fin(); }
    g.beginPath(); g.moveTo(cx - 8, cy); g.lineTo(cx + 8, cy); g.moveTo(cx, cy - 10); g.lineTo(cx, cy + 10); g.stroke();
  } else if (k === 'poulpe') {
    g.arc(cx, 14, 11, Math.PI, 0); g.lineTo(cx + 9, 24); g.lineTo(cx - 9, 24); g.closePath(); fin();
    for (let i = 0; i < 6; i++) { const x = cx - 10 + i * 4; g.beginPath(); g.moveTo(x, 24); g.bezierCurveTo(x + (i % 2 ? 6 : -6), 32, x + (i % 2 ? -6 : 6), 38, x + (i - 2.5) * 1.5, h - 3); g.stroke(); }
    g.beginPath(); g.arc(cx - 4, 14, 1.2, 0, 6.3); g.arc(cx + 4, 14, 1.2, 0, 6.3); g.fillStyle = '#1e241a'; g.fill();
  } else if (k === 'kraken') {   // tentacules qui sortent de l'eau, avec ventouses (le bas est coupé par la ligne d'eau)
    const tentacule = (pts, ws) => { for (let i = 0; i < pts.length - 1; i++) { g.lineCap = 'round'; g.strokeStyle = '#1e241a'; g.lineWidth = ws[i] + 3; g.beginPath(); g.moveTo(pts[i][0], pts[i][1]); g.quadraticCurveTo(pts[i][2], pts[i][3], pts[i + 1][0], pts[i + 1][1]); g.stroke(); }
      for (let i = 0; i < pts.length - 1; i++) { g.strokeStyle = 'rgba(232,220,176,0.95)'; g.lineWidth = ws[i]; g.beginPath(); g.moveTo(pts[i][0], pts[i][1]); g.quadraticCurveTo(pts[i][2], pts[i][3], pts[i + 1][0], pts[i + 1][1]); g.stroke(); }
      g.fillStyle = '#1e241a'; for (let i = 0; i < pts.length - 1; i++) for (let t = .25; t < 1; t += .35) { const u = 1 - t, x = u * u * pts[i][0] + 2 * u * t * pts[i][2] + t * t * pts[i + 1][0], y = u * u * pts[i][1] + 2 * u * t * pts[i][3] + t * t * pts[i + 1][1]; g.beginPath(); g.arc(x, y, Math.max(.6, ws[i] * .11), 0, 6.3); g.fill(); } };
    tentacule([[36, 52, 30, 44], [34, 38, 32, 26], [42, 18, 52, 6], [58, 14, 64, 20], [56, 24, 50, 24]], [10, 8.5, 7, 5.2]);                    // le grand tentacule, enroulé
    tentacule([[15, 52, 10, 44], [14, 38, 15, 30], [20, 22, 22, 14], [16, 12, 12, 14]], [7, 6, 4.5]);                                     // tentacule de gauche, crochet
    tentacule([[58, 52, 63, 46], [62, 40, 66, 34], [68, 30, 70, 22], [64, 20, 62, 24]], [6.5, 5.5, 4]);                                   // tentacule de droite
  } else {   // serpent de mer : trois bosses et une tête
    g.moveTo(2, cy + 8); for (let i = 0; i < 3; i++) g.arc(14 + i * 20, cy + 8, 9, Math.PI, 0);
    g.lineTo(66, cy + 8); g.quadraticCurveTo(70, cy - 14, 76, cy - 12); g.quadraticCurveTo(82, cy - 12, 80, cy - 6); g.lineTo(72, cy - 6); g.quadraticCurveTo(72, cy + 4, 70, cy + 8);
    g.lineTo(66, cy + 8); g.moveTo(2, cy + 8); g.stroke(); g.fillStyle = 'rgba(232,220,176,0.92)'; g.fill();
    g.beginPath(); g.arc(77, cy - 9, 1.1, 0, 6.3); g.fillStyle = '#1e241a'; g.fill();
  }
}
// à moitié dans l'eau : seul le haut du corps dépasse (coupé à la ligne d'eau), bordé d'une ligne de vagues
function dessinFaune(g, k, w, h) {
  const wl = Math.round(h * .62);
  g.save(); g.beginPath(); g.rect(-2, -2, w + 4, wl + 2); g.clip(); dessinFauneCorps(g, k, w, h); g.restore();
  g.save(); g.strokeStyle = '#1e241a'; g.lineWidth = 1.6; g.lineCap = 'round'; g.fillStyle = 'rgba(232,220,176,0.92)';
  g.beginPath(); g.moveTo(0, wl); for (let x = 0; x < w; x += 8) g.quadraticCurveTo(x + 2, wl - 3, x + 4, wl), g.quadraticCurveTo(x + 6, wl + 3, x + 8, wl);
  g.stroke(); g.globalAlpha = .55; g.beginPath(); g.moveTo(6, wl + 7); for (let x = 6; x < w - 8; x += 8) g.quadraticCurveTo(x + 2, wl + 4, x + 4, wl + 7), g.quadraticCurveTo(x + 6, wl + 10, x + 8, wl + 7); g.stroke(); g.restore();
}
function initFauneMarine() {
  if (!regionsFc || map.getSource('faune-marine')) return;
  const boites = regionsFc.features.map(f => turf.bbox(f));
  const terre = (lon, lat) => { for (let k = 0; k < boites.length; k++) { const b = boites[k]; if (lon >= b[0] && lon <= b[2] && lat >= b[1] && lat <= b[3] && turf.booleanPointInPolygon([lon, lat], regionsFc.features[k])) return true; } return false; };
  let seed = 20261011; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const noms = Object.keys(FAUNE_MARINE), pts = [];
  for (let essai = 0; essai < 4000 && pts.length < 35; essai++) {
    const lon = -178 + rnd() * 356, lat = -62 + rnd() * 132, ref = rnd(), A = Math.abs(lat);
    if (pts.some(p => Math.hypot((p[0] - lon) * Math.cos(lat * Math.PI / 180), p[1] - lat) < 9)) continue;                   // espacées
    if ([[0, 0], [4, 0], [-4, 0], [0, 4], [0, -4], [3, 3], [-3, -3], [3, -3], [-3, 3]].some(([a, b]) => terre(lon + a, lat + b))) continue;   // au large
    const ok = noms.filter(n => A >= FAUNE_MARINE[n].zones[0][0] && A <= FAUNE_MARINE[n].zones[0][1]);
    pts.push([lon, lat, ok.filter(n => !FAUNE_MARINE[n].rare)[Math.floor(ref * ok.filter(n => !FAUNE_MARINE[n].rare).length)]]);
  }
  for (const [lon, lat] of [[-38, 32], [-140, 12], [82, -28]]) pts.push([lon, lat, 'kraken']);   // les krakens : un seul par grand océan (Atlantique, Pacifique, Indien)
  for (const n of noms) {
    const { w, h } = FAUNE_MARINE[n], pr = 2;
    for (const sens of [1, -1]) {
      const c = document.createElement('canvas'); c.width = w * pr; c.height = h * pr; const g = c.getContext('2d'); g.scale(pr * sens, pr); if (sens < 0) g.translate(-w, 0);
      dessinFaune(g, n, w, h); map.addImage('mer:' + n + ':' + sens, g.getImageData(0, 0, c.width, c.height), { pixelRatio:pr });
    }
  }
  map.addSource('faune-marine', { type:'geojson', data:turf.featureCollection(pts.map(([lon, lat, n], i) => turf.point([lon, lat], { img:'mer:' + n + ':' + (i % 2 ? 1 : -1), rot:Math.round(rnd() * 24 - 12) }))) });
  map.addLayer({ id:'faune-marine', type:'symbol', source:'faune-marine', layout:{ 'icon-image':['get', 'img'], 'icon-rotate':['get', 'rot'], 'icon-allow-overlap':true,
    'icon-size':['interpolate', ['linear'], ['zoom'], 1, .6, 4, 1, 7, 1.5] }, paint:{ 'icon-opacity':.9 } }, 'regions');
}
