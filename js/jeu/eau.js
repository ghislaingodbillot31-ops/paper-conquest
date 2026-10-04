// ---------- Rivieres et lacs du monde (navigables) ----------
// Generes hors ligne par outils/build-waterways.js (relief simule, ecoulement,
// traces "serpent", lacs a l'ecart des rivieres, ratio d'eau cible):
//  - data/monde/regions-water.topojson: les regions avec le lit des rivieres et
//    les lacs deja retires de la terre (on voit la mer dessous, meme
//    couleur); remplace la geometrie affichee, la topologie d'origine
//    (voisinages, cotes, routes) reste celle de admin1.topojson;
//  - data/monde/water.json: traces (largeur par point) et lacs, marques comme eau
//    dans la grille de navigation: les bateaux remontent les rivieres.
let waterData = null;   // { stats, rivers:[{ c:[[lon,lat]], w:[km] }], lakes:[{ p:[[lon,lat]], a:km2 }] }
// Marque rivieres et lacs comme eau dans la grille de navigation. Le haut
// des rivieres (moins de 5 km de large, pres de la source) n'est pas
// navigable; ailleurs au moins ~2 cases de large pour que le bateau passe.
function carveNav(nav, W, H, res, latTop, data){
  if(!data) return;
  for(const L of data.lakes){
    const poly = turf.polygon([L.p]), [x0, y0, x1, y1] = turf.bbox(poly);
    for(let y = Math.floor((latTop - y1) / res); y <= Math.ceil((latTop - y0) / res); y++){ if(y < 0 || y >= H) continue;
      for(let x = Math.floor((x0 + 180) / res); x <= Math.ceil((x1 + 180) / res); x++){
        const i = y * W + ((x % W) + W) % W;
        if(!nav[i] && turf.booleanPointInPolygon([-180 + (x + 0.5) * res, latTop - (y + 0.5) * res], poly)) nav[i] = 1; } }
  }
  for(const r of data.rivers){
    // points tous les ~4 km: on interpole pour un trace continu
    for(let k = 0; k < r.c.length; k++){
      if(r.w[k] < 5 && !r.k) continue;                       // (un canal, drapeau k, est navigable meme etroit)
      const next = r.c[Math.min(r.c.length - 1, k + 1)];
      for(const f of [0, 0.5]){
        const lon = r.c[k][0] + (next[0] - r.c[k][0]) * f, lat = r.c[k][1] + (next[1] - r.c[k][1]) * f;
        const rKm = r.k ? Math.max(r.w[k] / 2 + 2, 3.5) : Math.max(r.w[k] / 2 + 2, 7), ry = rKm / 110.57 / res, rx = rKm / (111.32 * Math.cos(lat * Math.PI / 180)) / res;
        const cy = (latTop - lat) / res, cx = (lon + 180) / res;
        for(let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++){ if(y < 0 || y >= H) continue;
          for(let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++){
            if(((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 > 1) continue;
            const i = y * W + ((x % W) + W) % W; if(!nav[i]) nav[i] = 1; } }
      }
    }
  }
}
