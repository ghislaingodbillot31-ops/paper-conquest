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
/* PROFIL : toutes les 10 s, le journal du jeu (logs.js) reçoit le temps moyen par image (ms) des grandes étapes de la simulation et du dessin, trié du plus lent au plus rapide, avec les images par seconde
   et la plus longue image : de quoi trouver ce qui fait ramer. Chaque fonction est enveloppée d'un chronomètre (coût négligeable). */
(function () {
  const T = {}, N = {}, noms = ['simLoop', 'simTick', 'growSaplings', 'fauneStep', 'bateauxStep', 'marcheStep', 'arrivantsStep', 'poissonsStep', 'draw', 'presentScene', 'paintTile', 'drawFaune', 'drawBateaux', 'drawTerrestres', 'drawWorkers',
    'drawFrameMarks', 'drawHighlights', 'drawWorkZones', 'drawFauneNoms', 'drawEauPeche', 'drawDraft', 'drawScale', 'updateStatus', 'drawLumieres', 'sauverHabitants', 'sceneDiff', 'rendreStats', 'presentCimes', 'computeZones', 'save', 'commit', 'changed', 'computeOcc', 'computeFlora', 'jrActeur', 'etalsStep', 'messagesJour', 'drawGround', 'drawWoods', 'drawRoads', 'fauneLibre', 'fauneEau', 'fauneEnForet', 'fauneGroupe', 'fauneAnimal', 'fauneDirect', 'fauneCible', 'fauneSecours'];
  for (const n of noms) {
    const f = globalThis[n]; if (typeof f !== 'function') continue;
    globalThis[n] = function () { const t = performance.now(); try { return f.apply(this, arguments); } finally { T[n] = (T[n] || 0) + performance.now() - t; N[n] = (N[n] || 0) + 1; } };
  }
  let img = 0, plusLong = 0, prec = performance.now(), debut = prec;
  const rep = () => { const t = performance.now(); img++; plusLong = Math.max(plusLong, t - prec); prec = t; requestAnimationFrame(rep); };
  requestAnimationFrame(rep);
  setInterval(() => {
    if (typeof jeuLog !== 'function' || document.hidden) { for (const k in T) { T[k] = 0; N[k] = 0; } img = 0; plusLong = 0; debut = performance.now(); return; }
    const sec = (performance.now() - debut) / 1000, L = Object.keys(T).filter(k => T[k] / sec > 1).sort((p, q) => T[q] - T[p]).map(k => k + ' ' + (T[k] / sec).toFixed(0) + ' ms/s (' + (N[k] / sec).toFixed(1) + '/s, ' + (T[k] / N[k]).toFixed(1) + ' ms)');
    jeuLog('perf', Math.round(img / sec) + ' images/s · image la plus longue ' + Math.round(plusLong) + ' ms · ' + S.houses.length + ' bâtiments, ' + workers.size + ' habitants, ' + (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) + ' Mo · ' : '') + L.join(' | '));
    const hors = []; for (const [k, w] of workers) { if (w.horsT > 2) hors.push(k + ' ' + w.horsEtat + ' hors route ' + w.horsT.toFixed(0) + ' s vers ' + w.horsBut); w.horsT = 0; }
    if (hors.length) jeuLog('hors-route', hors.slice(0, 12).join(' | '));
    for (const k in T) { T[k] = 0; N[k] = 0; } img = 0; plusLong = 0; debut = performance.now();
  }, 10000);
})();
requestAnimationFrame(simLoop); // les bûcherons travaillent
