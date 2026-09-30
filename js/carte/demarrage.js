/* ---------- démarrage ---------- */
fixGates();                                                                     // portes des anciens plans recalées sur les routes
{ const bn = (BIOMES[S.biome] || BIOMES.tempere).name;                        // titre de la page
  const title = PAGE === 'batiments' ? 'Éditeur de bâtiments' : PAGE === 'carte' ? 'Éditeur de carte' : GAME ? 'Région ' + GAME.region : 'Carte de région (essai)';
  document.title = title; $('map-title').textContent = title;
  $('map-sub').textContent = PAGE === 'batiments' ? 'Chaque bâtiment seul sur un carré de terrain · rue en haut'
    : bn + ' · terrain de 2 000 × 1 500 m · cases de 8 m le long des routes';
  if (PAGE === 'batiments') $('atelier-toggle').hidden = true; }
readColors();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readColors(); requestDraw(); });
new MutationObserver(() => { readColors(); requestDraw(); }).observe(document.documentElement, { attributes:true, attributeFilter:['data-theme'] });
new ResizeObserver(resize).observe(wrap);
if (document.fonts) document.fonts.ready.then(requestDraw);
computeFlora();
renderTool(); renderSel(); resize();
requestAnimationFrame(simLoop); // les bûcherons travaillent
