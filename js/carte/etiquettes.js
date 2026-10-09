/* ---------- étiquettes de la carte ----------
   Les noms des gisements (minerais, pierre…) et des arbres fruitiers sont dessinés ICI, à chaque image, par-dessus la carte et les personnages :
   le décor, lui, est peint dans des tuiles-images qui ne sont repeintes qu'après un zoom, donc un texte peint dans une tuile grossit ou rétrécit avec le zoom jusqu'à la prochaine peinture.
   Ici le texte est toujours à FONT_ETIQ (dessin.js), en pixels d'écran : même police et même taille à tous les zooms, avec un liseré (haloText) qui le garde lisible. */
function drawEtiquettes() {
  const s = view.s; if (s <= ETIQ_ZOOM_MIN) return;
  const [x0, y0] = toW(0, 0), [x1, y1] = toW(W, H);
  ctx.font = FONT_ETIQ; ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';                                                      // gisements : au-dessus de la tache
  for (const d of S.deposits || []) {
    const g = typeof GISEMENTS !== 'undefined' && GISEMENTS[d.kind]; if (!g) continue;
    if (d.c[0] + d.r * 1.3 < x0 || d.c[0] - d.r * 1.3 > x1 || d.c[1] + d.r * 1.3 < y0 || d.c[1] - d.r * 1.3 > y1) continue;
    const [X, Y] = toS(d.c[0], d.c[1] - d.r * 1.15); haloText(g.nom, X, Y, Col.ink, Col.sheet);
  }
  ctx.textBaseline = 'top';                                                         // arbres fruitiers : sous le pied
  for (const r of S.ressources || []) {
    if (r.cat !== 'fruitier' || !r.g || typeof FRUITIERS === 'undefined' || !FRUITIERS[r.key]) continue;
    if (r.x < x0 - 30 || r.x > x1 + 30 || r.y < y0 - 30 || r.y > y1 + 30) continue;
    const [X, Y] = toS(r.g[0], r.g[1] + 5); haloText(FRUITIERS[r.key].nom, X, Y + 2, Col.ink, Col.sheet);
  }
}
