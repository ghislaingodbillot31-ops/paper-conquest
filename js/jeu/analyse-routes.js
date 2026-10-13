/* ---------- ANALYSE DES ROUTES COMMERCIALES (mode développeur, carte globale) ----------
   Bouton « Analyse des routes » du panneau Développeur : les routes défilent UNE PAR UNE, la route affichée est mise en évidence sur la carte, avec ses défauts mesurés
   (rivière traversée plusieurs fois, lac coupé, trop près de l'eau, traversées non perpendiculaires). Pour chacune :
     Valider    : la route est bonne, on la garde telle quelle ;
     Supprimer  : cette route ne sert à rien, on la supprime ;
     Modifier   : elle a un défaut, on le précise et il est corrigé — « Ne traverse pas la rivière en parallèle », « Traverse trop de fois la même rivière », « Trop proche de l'eau » ;
     Aléatoire  : on régénère UNIQUEMENT cette route avec une forme différente (entre les mêmes capitales).
   Les décisions sont gardées dans le navigateur (clé dominiumAnalyseRoutes) et appliquées au chargement du globe (appliquerAnalyseRoutes). « Enregistrer dans le jeu » écrit data/monde/routes.json par le serveur de logs
   (outils/serveur-logs.js) ; relancer ensuite node outils/build-formes.js pour que les cartes de région reprennent les nouvelles routes.
   La géométrie vient de js/jeu/routes-geo.js (partagée avec outils/lisser-routes.js). */
// (analyseLire, analyseCle, appliquerAnalyseRoutes : js/jeu/analyse-routes-base.js, chargé avant globe.js)
(function () {
  const A = { actif:false, tout:null, eau:null, etats:new Map(), liste:[], i:0, filtre:true, ...analyseLire() }, O = { ...RoutesGeo.defauts };
  let boite = null, st = null, diag = null, listeAuto = null;
  /* SAUVEGARDE À CHAQUE ACTION : navigateur (localStorage) tout de suite, puis disque 400 ms plus tard (serveur de logs : décisions dans data/monde/analyse-routes.json ET routes finales dans data/monde/routes.json ;
     les formes des régions suivent 8 s après). L'état s'affiche dans le panneau. */
  let envoiT = null, etatTxt = '';
  const afficherEtat = t => { etatTxt = t; if (boite) { const e = boite.querySelector('.an-etat'); if (e) e.textContent = t; } };
  async function envoyer() {
    if (!A.tout) return;
    const finales = appliquerAnalyseRoutes(A.tout), caps = [...capitalById].map(([id, c]) => [id, c]);
    try {
      const rep = await fetch('http://localhost:8001/routes/sauver', { method:'POST', headers:{ 'Content-Type':'text/plain' }, body:JSON.stringify({ dec:A.dec, mod:A.mod, add:A.add, capitales:caps, routes:finales }) });
      const h = new Date().toTimeString().slice(0, 8);
      afficherEtat(rep.ok ? '💾 Enregistré sur le disque à ' + h + ' (' + finales.length + ' routes)' : '⚠ Échec de l’enregistrement sur le disque (' + h + ')');
    } catch (e) { afficherEtat('⚠ Serveur de logs injoignable : décisions gardées seulement dans ce navigateur (node outils/serveur-logs.js)'); }
  }
  const sauver = () => { try { localStorage.setItem(ANALYSE_CLE, JSON.stringify({ dec:A.dec, mod:A.mod, add:A.add })); } catch (e) {} afficherEtat('… enregistrement'); clearTimeout(envoiT); envoiT = setTimeout(envoyer, 400); };
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  // terre : un point est sur la terre s'il est dans une région. Les fleuves sont CREUSÉS dans les contours : un point d'un fleuve n'est dans aucune région ; il compte comme terre si ses quatre voisins à 3 km (nord, sud, est, ouest) en font presque tous partie.
  const boites = new Map(), dansRegion = (lon, lat) => { for (const f of regionsFc.features) { let b = boites.get(f); if (!b) boites.set(f, b = turf.bbox(f)); if (lon >= b[0] && lon <= b[2] && lat >= b[1] && lat <= b[3] && turf.booleanPointInPolygon(turf.point([lon, lat]), f)) return true; } return false; };
  const surTerre = (lon, lat) => dansRegion(lon, lat) || [[0, .03], [0, -.03], [.04, 0], [-.04, 0]].filter(([dx, dy]) => dansRegion(lon + dx, lat + dy)).length >= 3;
  const defauts = d => [d.doubles ? 'rivière traversée plusieurs fois' : '', d.lacs ? 'coupe un lac' : '', d.tropPres ? 'trop près de l\'eau (' + d.tropPres + ' pts)' : '', d.obliques ? d.obliques + ' traversée(s) non perpendiculaire(s)' : ''].filter(Boolean);
  const avecDefaut = d => d.doubles || d.lacs || d.tropPres || d.obliques;

  function coucheRoute(coords) {
    const fc = { type:'FeatureCollection', features:coords ? [{ type:'Feature', properties:{}, geometry:{ type:'LineString', coordinates:coords } }] : [] };
    if (map.getSource('analyse-route')) map.getSource('analyse-route').setData(fc);
    else { map.addSource('analyse-route', { type:'geojson', data:fc });
      map.addLayer({ id:'analyse-halo', type:'line', source:'analyse-route', paint:{ 'line-color':'#ffffff', 'line-width':8, 'line-opacity':.85 } });
      map.addLayer({ id:'analyse-route', type:'line', source:'analyse-route', paint:{ 'line-color':'#e0561b', 'line-width':4 } }); }
  }
  function rafraichirChemins() {                                                                     // la couche « paths » reflète les décisions en cours
    const src = map.getSource('paths'); if (!src || !A.tout) return;
    src.setData({ type:'FeatureCollection', features:A.tout.filter(r => A.dec[analyseCle(r)] !== 's').map(r => ({ type:'Feature', properties:{ kind:'land' }, geometry:{ type:'LineString', coordinates:A.mod[analyseCle(r)] || r[2] } })) });
  }
  function etat(r) {                                                                                  // état géométrique d'une route (préparé une fois)
    const k = analyseCle(r); let e = A.etats.get(k);
    if (!e) { e = RoutesGeo.prepare(r[0], r[1], A.mod[k] || r[2], A.eau, O); A.etats.set(k, e); }
    return e;
  }
  function dessiner() {
    const r = A.liste[A.i]; if (!r) { montrer(); return; }
    const k = analyseCle(r); st = etat(r); diag = RoutesGeo.diagnostic(st, O);
    const coords = A.mod[k] || r[2]; coucheRoute(coords);
    const bb = coords.reduce((m, c) => [Math.min(m[0], c[0]), Math.min(m[1], c[1]), Math.max(m[2], c[0]), Math.max(m[3], c[1])], [1e9, 1e9, -1e9, -1e9]);
    map.fitBounds([[bb[0], bb[1]], [bb[2], bb[3]]], { padding:{ top:90, bottom:90, left:80, right:80 }, maxZoom:7, duration:500 });
    montrer();
  }
  function montrer(msg) {
    if (!boite) return;
    const r = A.liste[A.i], d = diag, k = r && analyseCle(r), decision = k ? ({ v:'✔ validée', s:'✖ supprimée', m:'✎ modifiée', n:'➕ nouvelle (non validée)' }[A.dec[k]] || '') : '';
    boite.querySelector('.an-titre').textContent = 'Analyse des routes' + (A.liste.length ? ' · ' + (A.i + 1) + ' / ' + A.liste.length : '');
    boite.querySelector('.an-corps').innerHTML = !r ? '<p>' + (A.tout ? 'Aucune route à examiner.' : 'Chargement des données d\'eau…') + '</p>'
      : '<p><b>Région ' + r[0] + ' ↔ région ' + r[1] + '</b> · ' + d.km + ' km ' + (decision ? '· <i>' + decision + '</i>' : '') + '</p>'
      + (avecDefaut(d) ? '<ul>' + defauts(d).map(x => '<li>⚠ ' + esc(x) + '</li>').join('') + '</ul>' : '<p class="an-ok">✔ aucun défaut mesuré</p>')
      + (msg ? '<p class="an-msg">' + esc(msg) + '</p>' : '');
    boite.querySelector('.an-modif').style.display = A.menuModif ? 'flex' : 'none';
    boite.querySelectorAll('[data-an]').forEach(b => { b.disabled = !r && !['quitter', 'enregistrer', 'filtre', 'choisir', 'ajouter'].includes(b.dataset.an); });
  }
  function suivant(delta = 1) { A.menuModif = false; if (A.manuel) { selectionner(); return; } A.i = Math.max(0, Math.min(A.liste.length - 1, A.i + delta)); if (A.i >= A.liste.length) A.i = A.liste.length - 1; dessiner(); }
  function adopter(msg) {                                                                               // la route de st remplace celle affichée
    const r = A.liste[A.i], k = analyseCle(r), c = RoutesGeo.sortie(st, O); if (A.add[k]) { A.add[k] = c; A.tout = A.tout.map(x => analyseCle(x) === k ? [x[0], x[1], c] : x); } else { A.mod[k] = c; A.dec[k] = 'm'; } sauver();
    A.etats.set(k, st); A.liste[A.i] = [r[0], r[1], c]; rafraichirChemins(); diag = RoutesGeo.diagnostic(st, O); coucheRoute(c); montrer(msg);
  }
  function action(a) {
    const r = A.liste[A.i], k = r && analyseCle(r);
    if (a === 'valider') { A.dec[k] = 'v'; sauver(); suivant(); }
    else if (a === 'supprimer') { if (A.add[k]) { delete A.add[k]; delete A.dec[k]; A.tout = A.tout.filter(x => analyseCle(x) !== k); A.etats.delete(k); } else A.dec[k] = 's'; sauver(); rafraichirChemins(); if (A.i >= A.liste.length - 1) { A.liste.splice(A.i, 1); A.i = Math.max(0, A.liste.length - 1); } else A.liste.splice(A.i, 1); A.menuModif = false; if (A.manuel) { selectionner(); return; } dessiner(); }
    else if (a === 'modifier') { A.menuModif = !A.menuModif; montrer(); }
    else if (['parallele', 'double', 'proche'].includes(a)) { RoutesGeo.corriger(st, a, O); A.menuModif = false; adopter('Corrigée : ' + ({ parallele:'traversée perpendiculaire', double:'une seule traversée par rivière', proche:'plus loin de l\'eau' })[a] + '. Validez, ou corrigez encore.'); }
    else if (a === 'aleatoire') { const m = RoutesGeo.aleatoire(st, O, Math.random, surTerre, 60); if (!m) { montrer('Aucune forme valide trouvée : la route est gardée.'); return; } st = m.st; adopter('Nouvelle forme générée' + (avecDefaut(m.diag) ? ' (défauts restants)' : ' sans défaut') + '. Validez, ou relancez.'); }
    else if (a === 'ajouter') { if (A.ajout) { retourListe(); } else debutAjout(); }
    else if (a === 'choisir') { if (A.manuel || A.choix) { retourListe(); } else selectionner(); }
    else if (a === 'precedent') suivant(-1);
    else if (a === 'passer') suivant(1);
    else if (a === 'filtre') { A.filtre = !A.filtre; preparerListe(); }
    else if (a === 'enregistrer') enregistrer();
    else if (a === 'quitter') fermer();
  }
  /* Choix MANUEL d'une route : on clique sur la carte, la route la plus proche (à 14 px au plus) devient la route examinée, avec les mêmes boutons. Après une décision, on peut en choisir une autre ; « Choisir une route » (de nouveau)
     ou « Passer » revient à la liste des routes avec défauts. */
  function selectionner() {
    if (!A.manuel) listeAuto = { liste:A.liste, i:A.i }; A.choix = true; A.manuel = false; A.menuModif = false; map.getCanvas().style.cursor = 'crosshair'; coucheRoute(null); diag = null;
    boite.querySelector('.an-titre').textContent = 'Analyse des routes · choix manuel';
    boite.querySelector('.an-corps').innerHTML = '<p><b>Cliquez sur la route à examiner</b> sur la carte.</p><p>Elle s’affichera avec ses défauts et les boutons Valider, Supprimer, Modifier et Aléatoire.</p>';
    boite.querySelector('.an-modif').style.display = 'none';
    boite.querySelector('[data-an=choisir]').textContent = '↩ Retour à la liste';
  }
  function retourListe() {
    A.choix = false; A.manuel = false; A.ajout = null; map.getCanvas().style.cursor = ''; boite.querySelector('[data-an=choisir]').textContent = '🖱 Choisir une route'; boite.querySelector('[data-an=ajouter]').textContent = '➕ Ajouter une route';
    if (listeAuto) { A.liste = listeAuto.liste.filter(r => A.dec[analyseCle(r)] !== 's'); A.i = Math.min(listeAuto.i, Math.max(0, A.liste.length - 1)); listeAuto = null; } dessiner();
  }
  function routeProche(lngLat) {
    const px = 14, degParPx = 360 / (512 * Math.pow(2, map.getZoom())), tol = px * degParPx, cl = Math.cos(lngLat.lat * Math.PI / 180); let best = null;
    for (const r of A.tout) { if (A.dec[analyseCle(r)] === 's') continue;
      const C = A.mod[analyseCle(r)] || r[2]; let bb = [1e9, 1e9, -1e9, -1e9]; for (const c of C) { if (c[0] < bb[0]) bb[0] = c[0]; if (c[1] < bb[1]) bb[1] = c[1]; if (c[0] > bb[2]) bb[2] = c[0]; if (c[1] > bb[3]) bb[3] = c[1]; }
      if (lngLat.lng < bb[0] - tol / cl || lngLat.lng > bb[2] + tol / cl || lngLat.lat < bb[1] - tol || lngLat.lat > bb[3] + tol) continue;
      for (let i = 0; i < C.length - 1; i++) { const ax = (C[i][0] - lngLat.lng) * cl, ay = C[i][1] - lngLat.lat, bx = (C[i + 1][0] - lngLat.lng) * cl, by = C[i + 1][1] - lngLat.lat, dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-12, t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)), d = Math.hypot(ax + dx * t, ay + dy * t);
        if (d < tol && (!best || d < best.d)) best = { d, r }; } }
    return best && best.r;
  }
  /* AJOUTER une route entre deux villes : on clique sur la première ville, puis sur la seconde (capitale la plus proche, 16 px au plus). Si les deux villes sont déjà reliées, la route existante est affichée. Sinon une route est
     générée entre elles (ligne droite redressée par les règles de l'eau, sinon forme aléatoire sur la terre), montrée avec les boutons habituels : Valider la garde, Supprimer l'annule, Aléatoire en tire une autre. */
  function debutAjout() {
    if (!A.manuel && !A.choix && !listeAuto) listeAuto = { liste:A.liste, i:A.i }; A.ajout = { a:null }; A.choix = false; A.manuel = false; A.menuModif = false; map.getCanvas().style.cursor = 'crosshair'; coucheRoute(null); diag = null;
    boite.querySelector('.an-titre').textContent = 'Ajouter une route · ville 1';
    boite.querySelector('.an-corps').innerHTML = '<p><b>Cliquez sur la première ville</b> (point blanc sur la carte).</p>';
    boite.querySelector('.an-modif').style.display = 'none'; boite.querySelector('[data-an=ajouter]').textContent = '↩ Annuler l’ajout';
  }
  function villeProche(pt) {
    let best = null; for (const [id, c] of capitalById) { const s = map.project(c), d = Math.hypot(s.x - pt.x, s.y - pt.y); if (d < 16 && (!best || d < best.d)) best = { d, id }; } return best && best.id;
  }
  function clicAjout(e) {
    const id = villeProche(e.point);
    if (id == null) { boite.querySelector('.an-corps').innerHTML = '<p><b>Cliquez sur ' + (A.ajout.a === null ? 'la première' : 'la seconde') + ' ville</b>.</p><p class="an-msg">Aucune ville à cet endroit : zoomez ou visez un point blanc.</p>'; return; }
    if (A.ajout.a === null) { A.ajout.a = id; boite.querySelector('.an-titre').textContent = 'Ajouter une route · ville 2'; boite.querySelector('.an-corps').innerHTML = '<p>Ville 1 : région <b>' + id + '</b>.</p><p><b>Cliquez sur la seconde ville.</b></p>'; return; }
    if (id === A.ajout.a) return;
    const a = Math.min(A.ajout.a, id), b = Math.max(A.ajout.a, id), k = a + '-' + b, deja = A.tout.find(r => analyseCle(r) === k || analyseCle(r) === b + '-' + a);
    A.ajout = null; map.getCanvas().style.cursor = ''; boite.querySelector('[data-an=ajouter]').textContent = '➕ Ajouter une route';
    if (deja) { A.manuel = true; A.liste = [deja]; A.i = 0; dessiner(); montrer('Ces deux villes sont déjà reliées : voici la route existante.'); return; }
    const A1 = capitalById.get(a), B1 = capitalById.get(b), L = Math.hypot((B1[0] - A1[0]) * Math.cos((A1[1] + B1[1]) / 2 * Math.PI / 180) * 111.32, (B1[1] - A1[1]) * 110.57), n = Math.max(4, Math.ceil(L / 6)), droite = [];
    for (let i = 0; i <= n; i++) droite.push([A1[0] + (B1[0] - A1[0]) * i / n, A1[1] + (B1[1] - A1[1]) * i / n]);
    let s = RoutesGeo.prepare(a, b, droite, A.eau, O); RoutesGeo.eviterEau(s, O); RoutesGeo.ponts(s, O);
    const horsTerre = c => c.P.some((q, i) => i > 2 && i < c.P.length - 3 && i % 2 === 0 && !c.rivs.some(R => R.some((v, j) => j < R.length - 1 && RoutesGeo.nearSeg(q, v, R[j + 1]).d < 5)) && !surTerre(...c.retour(q)));
    if (horsTerre(s) || avecDefaut(RoutesGeo.diagnostic(s, O))) { const m = RoutesGeo.aleatoire(s, O, Math.random, surTerre, 120, true); if (m) s = m.st; else if (horsTerre(s)) { boite.querySelector('.an-titre').textContent = 'Ajouter une route · impossible'; boite.querySelector('.an-corps').innerHTML = '<p class="an-msg">Impossible de relier les régions ' + a + ' et ' + b + ' par la terre : la mer est entre elles. Aucune route créée.</p><p>Cliquez sur « Ajouter une route » pour choisir deux autres villes.</p>'; return; } }
    const coords = RoutesGeo.sortie(s, O); A.add[k] = coords; A.dec[k] = 'n'; A.tout.push([a, b, coords]); A.etats.set(k, s); sauver(); rafraichirChemins();
    A.manuel = true; A.liste = [[a, b, coords]]; A.i = 0; dessiner(); montrer('Route créée entre les régions ' + a + ' et ' + b + '. Validez-la, relancez l’aléatoire ou supprimez-la.');
  }
  function surClic(e) {
    if (A.actif && A.ajout) { clicAjout(e); return; }
    if (!A.actif || !A.choix) return;
    const r = routeProche(e.lngLat); if (!r) { boite.querySelector('.an-corps').innerHTML = '<p><b>Cliquez sur la route à examiner</b> sur la carte.</p><p class="an-msg">Aucune route à cet endroit : zoomez ou visez la ligne en pointillés.</p>'; return; }
    A.choix = false; A.manuel = true; map.getCanvas().style.cursor = ''; A.liste = [r]; A.i = 0; boite.querySelector('[data-an=choisir]').textContent = '↩ Retour à la liste'; dessiner();
  }
  async function enregistrer() { clearTimeout(envoiT); await envoyer(); montrer(etatTxt + ' — les formes des régions sont reconstruites 8 s plus tard.'); }
  function preparerListe() {
    A.liste = A.tout.filter(r => A.dec[analyseCle(r)] !== 's' && (!A.filtre || avecDefaut(RoutesGeo.diagnostic(etat(r), O)) && A.dec[analyseCle(r)] !== 'v')); A.i = 0; A.menuModif = false;
    boite.querySelector('[data-an=filtre]').textContent = A.filtre ? 'Routes avec défauts : oui' : 'Routes avec défauts : toutes';
    A.liste.length ? dessiner() : (diag = null, coucheRoute(null), montrer());
  }
  async function ouvrir() {
    if (A.actif) return; A.actif = true; creerBoite(); montrer();
    if (!A.eau) A.eau = await (await fetch('data/monde/water.json')).json();
    try { const srv = await (await fetch('http://localhost:8001/routes/analyse')).json(), vide = !Object.keys(A.dec).length && !Object.keys(A.mod).length && !Object.keys(A.add).length;
      if (vide && srv && srv.dec && Object.keys(srv.dec).length) { A.dec = srv.dec; A.mod = srv.mod || {}; A.add = srv.add || {}; try { localStorage.setItem(ANALYSE_CLE, JSON.stringify({ dec:A.dec, mod:A.mod, add:A.add })); } catch (e) {} afficherEtat('Décisions reprises depuis le disque (' + Object.keys(A.dec).length + ')'); } } catch (e) {}   // (navigateur vide : les décisions du disque sont reprises)
    A.tout = (await (await fetch('data/monde/routes.json')).json()).routes;                          // (le fichier d'origine : les décisions locales s'appliquent par-dessus)
    A.tout = A.tout.map(r => A.mod[analyseCle(r)] ? [r[0], r[1], A.mod[analyseCle(r)]] : r);
    for (const [k, c] of Object.entries(A.add)) if (!A.tout.some(r => analyseCle(r) === k)) A.tout.push([+k.split('-')[0], +k.split('-')[1], c]);                // (routes ajoutées à la main)
    setLayerVisible('paths', true); if (!A.clicAttache) { map.on('click', surClic); A.clicAttache = true; }
    montrer('Calcul des défauts…'); setTimeout(preparerListe, 30);
  }
  function fermer() { A.actif = false; A.choix = false; A.ajout = null; A.manuel = false; if (map.getCanvas()) map.getCanvas().style.cursor = ''; if (boite) { boite.remove(); boite = null; } coucheRoute(null); applyDevFilters(); }
  function creerBoite() {
    boite = document.createElement('div'); boite.id = 'analyse-routes';
    boite.style.cssText = 'position:fixed;left:228px;bottom:18px;z-index:40;width:360px;padding:12px 14px;background:#1d2d3a;color:#e9e4d3;border:1px solid #d9b25f;border-radius:10px;font:500 13px/1.35 system-ui,sans-serif;box-shadow:0 6px 24px #0009';
    const btn = (a, t, c) => '<button data-an="' + a + '" style="padding:6px 10px;border-radius:6px;border:1px solid #0006;font:600 13px system-ui;cursor:pointer;background:' + (c || '#2d4254') + ';color:' + (c ? '#14212b' : '#e9e4d3') + '">' + t + '</button>';
    boite.innerHTML = '<div class="an-titre" style="font-weight:700;margin-bottom:6px"></div><div class="an-corps" style="min-height:64px"></div>'
      + '<div class="an-modif" style="margin:6px 0;display:none;flex-direction:column;gap:4px">' + btn('parallele', 'Ne traverse pas la rivière en parallèle') + btn('double', 'Traverse trop de fois la même rivière') + btn('proche', 'Elle est trop proche de l\'eau') + '</div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">' + btn('valider', '✔ Valider', '#7fd18b') + btn('supprimer', '✖ Supprimer', '#e8847a') + btn('modifier', '✎ Modifier', '#e0c36a') + btn('aleatoire', '🎲 Aléatoire', '#8fc0e8') + '</div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;font-size:12px">' + btn('choisir', '🖱 Choisir une route') + btn('ajouter', '➕ Ajouter une route') + btn('precedent', '◀') + btn('passer', 'Passer ▶') + btn('filtre', 'Routes avec défauts : oui') + btn('enregistrer', 'Enregistrer dans le jeu') + btn('quitter', 'Quitter') + '</div>';
    boite.insertAdjacentHTML('beforeend', '<div class="an-etat" style="margin-top:8px;font-size:11px;opacity:.85"></div>'); afficherEtat(etatTxt);
    boite.addEventListener('click', e => { const b = e.target.closest('[data-an]'); if (b && !b.disabled) action(b.dataset.an); });
    document.body.appendChild(boite);
  }
  document.addEventListener('DOMContentLoaded', () => {
    const liste = document.getElementById('dev-filter-list'); if (!liste) return;
    const b = document.createElement('button'); b.className = 'dev-filter'; b.type = 'button'; b.innerHTML = '<i></i><span>Analyse des routes</span>'; b.addEventListener('click', ouvrir); liste.appendChild(b);
  });
  window.analyseRoutes = { ouvrir, A, surTerre };
})();
