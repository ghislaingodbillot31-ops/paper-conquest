/* ---------- démarrage ---------- */
fixGates();                                                                     // portes des anciens plans recalées sur les routes
if (document.getElementById('map-title')) {                                   // titre de la page (éditeurs ; la capitale affiche le nom du village)
  const bn = (BIOMES[S.biome] || BIOMES.tempere).name;
  const title = PAGE === 'batiments' ? 'Éditeur de bâtiments' : PAGE === 'carte' ? (typeof MAPTEST !== 'undefined' ? 'Map test' : 'Éditeur de carte') : GAME ? 'Région ' + GAME.region : 'Carte de région (essai)';
  document.title = title; $('map-title').textContent = title;
  $('map-sub').textContent = PAGE === 'batiments' ? 'Chaque bâtiment seul sur un carré de terrain · rue en haut'
    : bn + ' · terrain de ' + (TW).toLocaleString('fr-FR') + ' × ' + (TH).toLocaleString('fr-FR') + ' m · cases de 8 m le long des routes';
  if (PAGE === 'batiments') $('atelier-toggle').hidden = true; }
readColors();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readColors(); requestDraw(); });
new MutationObserver(() => { readColors(); requestDraw(); }).observe(document.documentElement, { attributes:true, attributeFilter:['data-theme'] });
new ResizeObserver(resize).observe(wrap);
if (document.fonts) document.fonts.ready.then(() => { touchScene(); requestDraw(); }); // graduations redessinées avec la bonne police
computeZones();   // (chargé avant routes.js au premier calcul : refait avec le tracé lissé, places de carrefour comprises)
computeFlora();
sceneDiff(); // état de départ du décor (les changements suivants ne repeignent que ce qui bouge)
renderTool(); renderSel(); resize();
if (MONDE_PLAT) { view.s = 1; view.ox = W / 2 - 1500 * view.s; view.oy = H / 2 - 1300 * view.s; clampView(); requestDraw(); }   // éditeur de routes : le monde plat, centré sur les routes
requestAnimationFrame(simLoop); // les bûcherons travaillent
