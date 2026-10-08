/* Fenêtre de gestion d'un bâtiment : clic droit (sans glisser) sur un bâtiment.
   INFOS : fiche par id de bâtiment (rôle, production, besoin, main-d'œuvre max, notes). */
const INFOS = {
  camp_colon: { role:'Premier bâtiment à construire : accueille les premiers habitants et lance le village.', prod:'Aucune', besoin:'Aucun', cap:5, notes:['Peut être détruit quand les habitations prennent le relais.'] },
  maison: { role:'Logement des habitants.', cap:2 },
  maison_cour: { role:'Logement des habitants, avec une arrière-cour (décor : les extensions de maison n’existent plus, chaque métier est un bâtiment à part).', cap:4 },
  grande_maison: { role:'Logement des habitants, avec jardin et arrière-cour (décor).', cap:4 },
  manoir: { role:'Grande habitation pour accueillir davantage d’habitants.', cap:6, notes:["Peut être agrandi jusqu'à 10 habitants."] },
  mairie: { role:'Siège de la gestion du village : les décisions s’y prennent et les nouveaux arrivants s’y présentent.', prod:'Aucune', besoin:'Aucun', notes:['Les arrivants viennent à pied depuis le bord de la région, par les routes d’entrée, et attendent votre décision devant la mairie.', 'Sans mairie, plus personne ne se présente.'] },
  menuiserie: { role:'Atelier de menuisier : fabrique les objets en bois depuis sa file de production.', prod:'Corde, outils et armes primitifs (bois, silex), gourdin, boucliers de bois, flèches de bois', besoin:'Bois, planches, pierre, corde', main:2 },
  forge: { role:'Forge : outils et armes en métal, depuis sa file de production.', prod:'Outils et armes en cuivre, bronze, fer, acier', besoin:'Métaux de la fonderie + bois pour les manches', main:2 },
  archerie: { role:'Archerie : arcs, arbalètes et flèches, depuis sa file de production.', prod:'Arc, arbalète, flèches (bois, pierre, cuivre, bronze, fer, acier)', besoin:'Bois, corde, pointes', main:2 },
  armurerie: { role:'Armurerie : boucliers et armures, depuis sa file de production.', prod:'Boucliers (bois à acier), armures', besoin:'Planches, métaux, peaux', main:2 },
  cordonnerie: { role:'Atelier de cordonnier : transforme les peaux en chaussures.', prod:'Chaussures', besoin:'Peaux (extension enclos à chèvres d’une ferme à moins de 500 m)', main:2 },
  couture: { role:'Atelier de tailleur : transforme la laine en vêtements.', prod:'Vêtements', besoin:'Laine (bergerie à moins de 500 m)', main:2 },
  brasserie: { role:'Brasserie : brasse la bière avec les céréales.', prod:'Bière', besoin:'Grain (ferme à moins de 500 m)', main:2 },
  fonderie: { role:'Allumée (ON), elle fond en continu les minerais du stock en métaux et en alliages ; éteinte (OFF), elle s’arrête.', prod:'Fer, cuivre, étain, plomb, argent, or, bronze (cuivre + étain) ; acier avec le haut fourneau', besoin:'Minerais (fosse minière) et charbon de bois', main:6, notes:['Les fondeurs fondent ; les porteurs vont chercher les minerais (fosses) et le charbon de bois, à pied, à la charrette ou au chariot.', 'Choisissez la fabrication dans la fenêtre : elle se répète tant que les ressources du village le permettent.', 'Haut fourneau (amélioration) : débloque l’acier, obtenu à partir du fer.'] },
  marche: { role:'Vente de produits alimentaires (poisson, viande, pain, fromages…) : 12 emplacements, un étal par case.', main:'1 habitant par étal', notes:["Après la fin du travail, un ouvrier d'un bâtiment qui a de la nourriture en stock installe un étal.", "L'étal est permanent ; il disparaît avec son bâtiment. Il vend pendant les horaires du marché."] },
  taverne: { role:'Lieu de repos et de vie sociale.', prod:'Aucune', besoin:'Boissons produites par la brasserie', main:2 },
  eglise: { role:'Lieu de culte qui améliore le moral.', prod:'Moral', besoin:'Un homme de foi chargé de prêcher', main:'1 homme de foi' },
  cimetiere: { role:'Lieu d’inhumation des habitants décédés.', prod:'Aucune', besoin:'Tissu / lin', main:1 },
  puits: { role:"Eau potable quand aucune rivière ou source n'est accessible.", prod:'Eau potable', besoin:'Aucun', notes:["Les habitants viennent chercher l'eau pour les habitations et bâtiments ; tous peuvent l'utiliser."] },
  camp_bucherons: { role:'Exploite les ressources forestières : les bûcherons abattent, le porteur ramasse le bois.', prod:'Bois, branches', besoin:'Zone forestière exploitable', main:8 },
  loge_bucheron: { role:'L’ouvrier abat un arbre, le rapporte à la loge et le fend en bûches de chauffage, ou (autre travail) ramasse bâtons et brindilles sous les arbres sans rien couper.', prod:'Bois de chauffage : 4 bûches par arbre, stock de 100 au plus', besoin:'Zone forestière exploitable + hache', main:2 },
  hutte_forestier: { role:'Trois activités : récolter des graines d’arbres, les faire germer, planter les pousses.', prod:'Graines, pousses, jeunes arbres', besoin:'Zone forestière ; serpe pour récolter, pelle pour planter', main:2, notes:['Graines : 200 au plus à la hutte.', 'Germination : 1 à 3 semaines selon l’espèce.', 'Une pousse met plusieurs années (3 à 8) à devenir un arbre mature.'] },
  camp_chasse: { role:'Les chasseurs fabriquent leur lance (silex + branche), chassent le gibier du cercle, le rapportent et le dépècent au camp.', prod:'Viande, peaux, os, tendons, graisse', besoin:'Une zone de chasse avec du gibier ; silex et bâtons (de la loge de bûcheron) pour les lances', main:3 },
  hutte_cueillette: { role:'Cueille les fruits des arbres fruitiers et les baies des arbustes de sa zone de travail.', prod:'Fruits et baies', besoin:'Zone de travail contenant des arbres fruitiers ou des arbustes à baies', main:3, notes:['Chaque plante a son propre potentiel de récolte (de 70 % à 130 % de la moyenne de son espèce).', 'Une plante cueillie ne donne plus rien jusqu’à la saison suivante.'] },
  rucher: { role:'Produit du miel grâce aux abeilles.', prod:'Miel', besoin:'Abeilles + environnement adapté', main:2 },
  cabane_peche: { role:'Pêche à son spot de pêche, choisi le long d\'une rivière ou d\'un étang.', prod:'Poissons', besoin:"Un spot de pêche à choisir (obligatoire) ; sa richesse est estimée par le pêcheur d'après ses prises", main:5 },
  tailleur_pierre: { role:'Extrait et travaille la pierre et le silex.', prod:'Pierre de construction, pointes de flèches en silex', besoin:'Zone riche en pierre / silex', main:2 },
  camp_mineur: { role:'Décharge les fosses minières et stocke toutes leurs ressources (minerais, silex, sel…) jusqu’à ce que les bâtiments viennent les prendre.', prod:'Stockage des ressources des mines (2000)', besoin:'Des fosses minières à moins de 600 m', main:4 },
  fosse_miniere: { role:'Posée sur un gisement : le mineur descend dans la mine, remonte 4 kg de minerai toutes les 30 secondes et les range dans la cabane.', prod:'Minerai de fer, cuivre, étain, plomb, argent, or ; sel, alun, ambre (selon le gisement)', besoin:'Gisement à portée + pioche (sans pioche : travail à la main, lent)', main:6 },
  hutte_charbonnier: { role:'Coupe du bois dans sa zone, le stocke, puis le brûle en charbon de bois, gardé sur place pour la forge et la fonderie.', prod:'Charbon de bois', besoin:'Zone forestière : les bûcherons coupent, les charbonniers brûlent', main:6 },
  scierie: { role:'Transforme le bois de son stock en planches (bouton ON / OFF, pas de file d’attente).', prod:'1 bois → 3 planches', besoin:'Bois', main:2 },
  grange: { role:'Stocke les ressources périssables : viande, poissons, céréales, nourriture…', besoin:'Des habitants chargés de récupérer les ressources auprès des sites de production ; de 6 h à 7 h et de 17 h 30 à 21 h 30 ils tiennent les étals du marché, le reste du temps ils gèrent les points de collecte', main:6 },
  entrepot: { role:'Stocke les ressources non périssables et les surplus : bois, planches, minerais, matériaux…', besoin:'Des habitants chargés de récupérer les ressources ; de 6 h à 7 h et de 17 h 30 à 21 h 30 ils tiennent les étals du marché, le reste du temps ils récoltent les ressources', main:6 },
  relais: { role:'À définir', prod:'À définir', besoin:'À définir', main:'À définir' },
  poteau: { role:'Supprimé : le transport par charrette sera intégré aux bâtiments (charrette dans leur cour si l’espace le permet).' },
  comptoir: { role:'Vend les ressources et produits du village.', prod:'Aucune', besoin:'Ressources à vendre + routes commerciales débloquées vers les marchés extérieurs', main:5 },
  comptoir_betail: { role:"Importe des animaux d'élevage d'autres régions ou joueurs.", prod:'Aucune', besoin:"Commerce avec d'autres régions / joueurs", main:5 },
  ferme: { role:'Cultive des céréales de saison et accueille jusqu’à 3 extensions (jardin, verger, poulailler, enclos à chèvres, porcherie).', prod:'Céréales (grain) + produits des extensions (légumes, fruits, œufs, peaux, viande)', besoin:'Faux pour la récolte ; houe pour le jardin, serpe pour le verger', main:8 },
  bergerie: { role:'Élève des chèvres ou des moutons.', prod:'Laine, lait', besoin:'Animaux importés', main:3 },
  moulin: { role:'Transforme les céréales des champs.', prod:'Farine', besoin:'Céréales', main:3 },
  fromagerie: { role:'Transforme le lait en fromages : caillage, décaillage, égouttage, salage, puis affinage en cave.', prod:'Fromage frais, pâte molle, fromage de garde', besoin:'Lait des fermes, présure, sel', main:3 },
  four: { role:'Transforme la farine en pain.', prod:'Pain', besoin:'Farine', main:2 },
};
const gEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

// état en direct (stock du bâtiment, ouvrier) : même fiche que le panneau de sélection ; rafraîchi chaque seconde
function gestionLive(h) {
  const J = jobOf(h), w = workers.get(h.id), row = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
  if (J) return jobSheet(h, J);
  const outil = outilDe(h) ? (t => row('Outil', t ? `${t.nom} (efficacité ×${t.eff})` : `aucun : il lui faut ${outilManque(h)}, le travail est à l’arrêt`))(meilleurOutil(h)) : '';
  if (LUMBER[h.kind]) return outil + row('Au sol', `${boisAuSol(h)} bois · tas de ${TAS} avant le transport${h.haul ? ' (transport en cours)' : ''}`) + row('Stock', `${h.stock || 0} / ${stockMax(h)} ${LUMBER[h.kind]}`) + row('Bûcheron', WORKER_STATE[(w || { state:'idle' }).state]) + row('Chargement', `${(w && w.charge) || 0} / ${(w && w.lim) || capCharge(h)}`);
  if (TAILLEURS[h.kind]) return outil + row('Stock', `${h.stock || 0} / ${stockMax(h)} pierre`) + row('Tailleur', STONE_STATE[(w || { state:'idle' }).state]);
  if (h.kind === 'hutte_cueillette') { const P = h.zone ? plantesZone(h.zone) : [], mures = P.filter(p => fruitEtat(p).dispo > 0); return row('Plantes dans la zone', `${P.length} (${mures.length} mûres · ${mures.reduce((s, p) => s + fruitEtat(p).dispo, 0)} fruits à cueillir)`) + row('Porte', `${chargeCueilleur(w || {})} / ${CUEILLETTE.PORTE}`) + row('Stock', `${invTotal(h)} / ${stockMax(h)}`) + row('Cueilleur', cueilleurEtat(h, w)); }
  if (h.kind === 'hutte_forestier') return outil + row('Graines', `${grainesTotal(h)} / ${FORET.MAX_GRAINES}`) + row('Germination', `${(h.germe || []).length} en cours · ${poussesTotal(h)} pousse(s) prête(s)`) + row('Portent', `${somme(w && w.graines)} graines · ${somme(w && w.pousses)} pousses`) + row('Plantés en tout', h.stock || 0) + row('Forestier', foresterEtat(h, w));
  return '';
}
/* Réglages : activer / désactiver le bâtiment, travailleurs à l'intérieur (au plus INFOS.main, et seulement des villageois libres). */
const travMax = h => { const m = (INFOS[h.kind] || {}).main; return typeof m === 'number' ? m : 0; };
const travUtilises = () => S.houses.reduce((s, o) => s + (travMax(o) ? nbTrav(o) : 0) + nbPorteurs(o), 0);
function gestionAmelio(h) {
  if (!ameliorable(h)) return '';
  const L = amelios(h), n = niveauH(h), A = L[n + 1], fonte = h.kind === 'fonderie', collecte = (jobOf(h) || {}).type === 'collect', detail = a => collecte ? 'par trajet : ' + chargesTexte(n + 1) : a.charge ? chargeAmelio(h, n + 1) + ' par trajet' : a.effet;
  const cur = fonte ? (n ? L[n].nom : 'fourneau simple') : collecte ? (n ? L[n].nom + ' (' + chargesTexte(n) + ')' : 'à bras (1 article par trajet)') : n ? L[n].nom + ' (' + chargeAmelio(h, n) + ' par trajet)' : 'à bras (1 par trajet)', titre = fonte ? 'Fonderie' : 'Transport';
  if (!A) return `<div class="g-amelio"><small>${titre} : ${cur} · niveau maximum</small></div>`;
  const m = manque(A.cout);
  return `<div class="g-amelio"><small>${titre} : ${cur}</small><button data-g="amelio"${m ? ' disabled' : ''}>Niveau ${n + 1} : ${A.nom} (${coutTexte(A.cout)})</button><small>${m || detail(A)}</small></div>`;
}
/* Charrettes : celle d'une exploitation sert à UN seul ouvrier ; on peut en avoir plusieurs, au plus autant que d'ouvriers au maximum (travMax). Chaque charrette se fabrique au prix du niveau en cours. */
function gestionCharrettes(h) {
  const n = niveauDe(h, 0); if (!n || h.kind === 'fonderie') return '';
  const max = Math.max(1, travMax(h)), k = nbCharrettes(h), A = AMELIO[n], m = manque(A.cout);
  return `<div class="g-amelio"><small>${A.nom} : ${k} / ${max} (une par ouvrier)</small>${k < max ? `<button data-g="charrette+"${m ? ' disabled' : ''}>Ajouter une charrette (${coutTexte(A.cout)})</button><small>${m || ''}</small>` : '<small>Une charrette par ouvrier au maximum</small>'}</div>`;
}
/* Fonderie : répartition fondeurs / porteurs, et véhicule des porteurs (charrette à main : 10 par trajet, chariot : 30). */
function porteursEtatHtml(h) {   // (ancienne fonderie à porteurs intégrés : plus utilisée)                                                          // fonderie : ce que fait chaque porteur, et pourquoi il n'a rien à faire
  if (phaseJour() !== 'travail') return `<div class="bat-ligne"><span>Porteurs</span><b>repos : hors des heures de travail (8 h–12 h, 14 h–18 h)</b></div>`;
  const dem = besoinsFonte(h), sans = dem.filter(([k]) => !sourcesDe(h, k).length).map(([k]) => k);
  return Array.from({ length:nbPort(h) }, (_, i) => { const w = workers.get(h.id + '#' + (nbFond(h) + i)), idle = !w || w.state === 'idle' || w.state === 'wait';
    const t = idle ? (!dem.length ? 'stock rempli' : sans.length === dem.length ? 'rien à rapporter : ' + sans.join(', ') + ' introuvable' : 'se prépare') : (PORT_ETAT[w.state] || w.state) + (w.load ? ' : ' + w.load : '');
    return `<div class="bat-ligne"><span>Porteur ${i + 1}</span><b>${gEsc(t)}</b></div>`; }).join('');
}
const PORT_ETAT = { idle:'cherche', wait:'attend', go:'part chercher', take:'charge', back:'rapporte', drop:'dépose' };
function portageHtml(o) {                                                                  // porteurs du site : transfèrent les ressources, ne travaillent pas
  const n = nbPorteurs(o), libres = Math.max(0, popVillage() - travUtilises()), c = o.cartP || 0, bouton = k => `<button data-g="cartp:${k}"${manque(AMELIO[k].cout) ? ' disabled' : ''}>${AMELIO[k].nom} (${coutTexte(AMELIO[k].cout)})</button>`;
  const etat = Array.from({ length:n }, (_, i) => { const w = workers.get(o.id + '#p' + i); const t = !w ? (phaseJour() === 'travail' ? 'se prépare' : 'repos') : (w.state === 'idle' || w.state === 'wait') ? (w.rien ? 'rien à transférer' : 'cherche') : (PORT_ETAT[w.state] || w.state) + (w.load ? ' : ' + w.load : ''); return `<div class="bat-ligne"><span>Porteur ${i + 1}</span><b>${gEsc(t)}</b></div>`; }).join('');
  const dem = n ? deficits(o).slice(0, 5).map(([k, d]) => { const src = sourcesDe(o, k)[0]; return `<small>${gEsc(k)} : manque ${Math.ceil(d)} · ${src ? 'chez ' + gEsc(src.type) + ' (' + Math.floor(dispo(src, k)) + ' en stock)' : 'aucun bâtiment n’en a'}</small>`; }).join('<br>') : '';
  const off = o.kind === 'fonderie' ? FUSIONS.filter(f => o.fonte && o.fonte[f.id] === false).map(f => f.nom) : [];
  const diag = (dem || off.length || phaseJour() !== 'travail') ? `<p class="bat-aide">${phaseJour() !== 'travail' ? 'Repos : les porteurs ne travaillent qu’aux heures de travail.<br>' : ''}${dem}${off.length ? '<br>Fontes éteintes (OFF) : ' + gEsc(off.join(', ')) : ''}</p>` : '';
  return `<h4>Porteurs</h4><div class="bat-ligne"><span>Transfert des ressources${URGENCES.has(o.id) && !(o.porteurs > 0) ? ' (porteur automatique : matières à rapporter)' : ''}</span><span class="bat-ctl"><button data-g="pg-"${n <= 0 ? ' disabled' : ''} aria-label="Un porteur de moins">−</button><b>${n} / ${PORTEURS_MAX}</b><button data-g="pg+"${n >= PORTEURS_MAX || !libres ? ' disabled' : ''} aria-label="Un porteur de plus">+</button></span></div>${etat}${diag}
  <div class="g-amelio"><small>Transport : ${c ? AMELIO[c].nom + ' (' + chargesTexte(c) + ')' : 'à pied (charge selon le poids : ' + chargesTexte(0) + ')'}</small>${c < 1 ? bouton(1) : ''}${c < 2 ? bouton(2) : ''}</div>`;
}
function gestionPorteurs(h) {
  const fond = h.kind === 'fonderie', hut = h.kind === 'hutte_charbonnier', nom = fond ? 'fondeur' : hut ? 'charbonnier' : 'bûcheron', nomP = hut ? 'bûcheron' : 'porteur';
  const nb = nbReel(h), p = nbPort(h), c = h.cartP || 0, bouton = n => `<button data-g="cartp:${n}"${manque(AMELIO[n].cout) ? ' disabled' : ''}>${AMELIO[n].nom} (${coutTexte(AMELIO[n].cout)})</button>`;
  return `<h4>${fond ? 'Fondeurs et porteurs' : hut ? 'Charbonniers et bûcherons' : 'Bûcherons et porteur'}</h4><div class="bat-ligne"><span>${nbFond(h)} ${nom}${nbFond(h) > 1 ? 's' : ''}</span><span class="bat-ctl"><button data-g="port-"${p <= 0 ? ' disabled' : ''} aria-label="Un porteur de moins">−</button><b>${p} ${nomP}${p > 1 ? 's' : ''}</b><button data-g="port+"${p >= nb - 1 || p >= AVEC_PORTEURS[h.kind] ? ' disabled' : ''} aria-label="Un porteur de plus">+</button></span></div>
  ${fond ? `${fond ? porteursEtatHtml(h) : ''}<div class="g-amelio"><small>Transport : ${c ? AMELIO[c].nom + ' (' + chargesTexte(c) + ')' : 'à pied (charge selon le poids : ' + chargesTexte(0) + ')'}</small>${c < 1 ? bouton(1) : ''}${c < 2 ? bouton(2) : ''}</div>` : ''}`;
}
// entrepôt : extensions de stockage (350, 500, 750)
function gestionStockage(h) {
  if (h.kind !== 'entrepot') return '';
  const n = h.stk || 0, A = STOCKAGE_EXT[n];
  if (!A) return `<div class="g-amelio"><small>Capacité : ${ENTREPOT_CAP[n]} · extensions de stockage au maximum</small></div>`;
  const m = manque(A.cout);
  return `<div class="g-amelio"><small>Capacité : ${ENTREPOT_CAP[n]}</small><button data-g="stk"${m ? ' disabled' : ''}>Extension de stockage ${n + 1} : ${A.cap} (${coutTexte(A.cout)})</button><small>${m || ''}</small></div>`;
}
/* Production (production.js) : la liste des produits du bâtiment, chacun avec ses ressources et un bouton « Créer » (+1 dans la file), puis la file d'attente (mise à jour chaque seconde). */
function prodFileHtml(h) {
  const file = h.file || [], w = workers.get(h.id), enCours = !!(w && w.enCours);
  if (!file.length) return '<p class="bat-vide">File vide</p>';
  return '<ol class="prod-file">' + file.map((id, i) => {
    const r = produitDe(h, id), m = r ? manqueTexteFonte(h, r.cout) : 'produit inconnu', encours = i === 0 && enCours;
    const avert = m && !encours ? ` <span class="prod-avert" title="Matériaux manquants : ${gEsc(String(m).replace('Il manque ', ''))}">⚠</span>` : '';
    return `<li><span>${gEsc(r ? r.nom : id)}${encours ? ` <small>(${etapeTexte(h, r, w) ? etapeTexte(h, r, w) + ' · ' : ''}${Math.round((1 - w.t / (w.tTot || 1)) * 100)} %)</small>` : ''}${avert}</span><button data-g="retire:${i}"${encours ? ' disabled' : ''} title="Retirer de la file" aria-label="Retirer de la file">✕</button></li>`;
  }).join('') + '</ol>';
}
// fonderie : une ligne par métal : « Fer  [minerai de fer : stock]  ON / OFF » ; chaque fonte s'allume ou s'éteint séparément (h.fonte[id] === false : éteinte)
function fonteHtml(h) {
  if (!PRODUCTION_AUTO.has(h.kind)) return '';
  if (AUTO_SIMPLE[h.kind]) {                                                                // un seul produit : bouton ON / OFF pour lancer ou arrêter la fabrication
    const R = AUTO_SIMPLE[h.kind], on = !h.fonte || h.fonte[R.id] !== false, w = workers.get(h.id), etat = !on ? 'arrêtée' : !w || !w.etat ? 'prête' : w.etat === 'fabrique' ? 'fabrique' : w.etat === 'manque' ? 'attend les matières' : w.etat === 'plein' ? 'stock plein' : w.etat;
    return `<div class="prod-liste"><div class="prod-ligne"><span class="prod-nom">${gEsc(R.nom)}<small>${gEsc(coutTexte(R.cout))} → ${gEsc(Object.entries(R.sort).map(([k, q]) => q + ' ' + k).join(', '))}</small></span><span class="fonte-stock">${gEsc(etat)}</span><button data-g="fonte:${R.id}" class="bat-etat fonte-btn ${on ? 'on' : 'off'}">${on ? 'ON' : 'OFF'}</button></div></div>`;
  }
  const niv = niveau(h), n = k => Math.floor(aEnStock(h, k));   // (stock de la fonderie : ce que ses porteurs ont rapporté)
  const lignes = FUSIONS.map(f => {
    const on = !h.fonte || h.fonte[f.id] !== false, ok = (f.niv || 0) <= niv;
    const ing = Object.entries(f.cout).filter(([k]) => k !== 'charbon de bois').map(([k, q]) => `${gEsc(k)} : <b${n(k) < q ? ' class="prod-avert"' : ''}>${n(k)}</b>`).join(' · ');
    return `<div class="prod-ligne"><span class="prod-nom">${gEsc(f.nom)}</span><span class="fonte-stock">${ok ? ing : 'haut fourneau requis'}</span><button data-g="fonte:${f.id}" class="bat-etat fonte-btn ${on ? 'on' : 'off'}"${ok ? '' : ' disabled'}>${on ? 'ON' : 'OFF'}</button></div>`;
  }).join('');
  return `<p class="bat-aide">Charbon de bois : <b>${n('charbon de bois')}</b></p><div class="prod-liste">${lignes}</div>`;
}
// cave d'affinage : produits qui affinent (reste en jours de jeu)
function caveHtml(h) {
  const c = h.cave || []; if (!c.length && h.kind !== 'fromagerie') return '';
  const j = jourJeu();
  return `<h4>Cave d'affinage · ${c.length} / ${CAVE_MAX}</h4>` + (c.length ? '<ul class="bat-stock">' + c.map(x => `<li><span>${gEsc(x.nom)}</span><b>${Math.max(0, Math.ceil(x.jours - (j - x.j0)))} j</b></li>`).join('') + '</ul>' : '<p class="bat-vide">Cave vide</p>');
}
function gestionProduction(h) {
  const L = produitsDe(h); if (!L.length) return '';
  const types = [...new Set(L.map(r => r.type || ''))], titre = t => TYPES_OBJET[t] || (t === '' ? 'Produits' : t);
  const lignes = types.map(t => (types.length > 1 ? `<div class="prod-titre">${gEsc(titre(t))}</div>` : '') + L.filter(r => (r.type || '') === t).map(r => `<div class="prod-ligne"><span class="prod-nom">${gEsc(r.nom)}<small>${gEsc(coutTexte(r.cout))} → ${gEsc(sortieTexte(r))}</small></span><button data-g="creer:${r.id}">Créer</button></div>`).join('')).join('');
  return `<h4>Production</h4><div class="prod-liste">${lignes}</div><h4>File d'attente</h4><div id="prod-file">${prodFileHtml(h)}</div>${caveHtml(h)}`;
}
// hutte de forestier : activité récolter (graines, pousses) ou planter
// culture de saison (potager, verger, ferme) : choix de la culture ; calendrier et état (cultures.js)
function gestionCulture(h) {
  if (!cultivee(h)) return '';
  const t = CULTURE_TYPE[producerId(h)], cur = cultureId(h), c = cultureDe(h);
  const opts = Object.entries(CULTURES).filter(([, x]) => x.type === t).map(([k, x]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${x.nom}</option>`).join('');
  return `<div class="g-fab"><label>Culture<select data-cul>${opts}</select></label><small>${c ? 'Plantation : ' + plageTexte(c.plantation) + ' · Récolte : ' + plageTexte(c.recolte) + ' · Pousse : ' + c.pousse + ' j · Fenêtre de récolte : ' + c.fenetre + ' j · Rendement : ' + c.rendement : ''}</small><small>${cultureTexte(h)}</small></div>`;
}
// ferme : extensions (jusqu'à FERME_EXT_MAX, une de chaque sorte)
function gestionFerme(h) {
  if (h.kind !== 'ferme') return '';
  const L = h.ext || [], libres = Object.entries(FERME_EXT).filter(([k]) => !L.some(e => e.k === k));
  const lignes = L.map(e => {
    const d = FERME_EXT[e.k]; let sel = '', st = d.use, capt = '';
    if (d.cap) { const n = e.n === undefined ? 2 : e.n; st = `${n} / ${d.cap} animaux · ${d.use}`; capt = ` <button data-g="capture:${e.k}"${n >= d.cap ? ' disabled' : ''} title="Un fermier part capturer un animal sauvage de la carte">Capturer</button>`; }
    if (d.cult) {
      const cur = cultureId(e, d.cult, CULTURE_DEFAUT[e.k]), opts = Object.entries(CULTURES).filter(([, x]) => x.type === d.cult).map(([k, x]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${x.nom}</option>`).join('');
      sel = ` <select data-extcul="${e.k}">${opts}</select>`; st = cultureTexte(e, d.cult, CULTURE_DEFAUT[e.k]);
    }
    return `<div class="g-ext"><b>${d.nom}</b>${sel}${capt}<button data-g="extdel:${e.k}" title="Retirer cette extension">✕</button><small>${st}</small></div>`;
  }).join('');
  return lignes ? `<div class="g-fab">${lignes}</div>` : '';
}
const gestionBarre = h => gestionAmelio(h) + gestionCharrettes(h) + gestionStockage(h) + gestionCulture(h);
function gestionModif(h, a) {
  const max = travMax(h), nb = nbReel(h);
  if (a === 'actif') h.actif = h.actif === false;
  else if (a.startsWith('fonte:')) { h.fonte = h.fonte || {}; const id = a.slice(6); h.fonte[id] = h.fonte[id] === false; }     // ON / OFF d'une fonte (OFF → ON, sinon → OFF)
  else if (a.startsWith('creer:')) { const f = h.file = h.file || []; if (f.length < 99 && produitDe(h, a.slice(6))) f.push(a.slice(6)); }                 // +1 unité dans la file
  else if (a.startsWith('retire:')) { const i = +a.slice(7), w = workers.get(h.id); if (!(i === 0 && w && w.enCours)) (h.file || []).splice(i, 1); }       // (la production en cours ne se retire pas)
  else if (a.startsWith('act:')) { h.act = a.slice(4); for (const k of [...workers.keys()]) if ((typeof k === 'string' ? +k.split('#')[0] : k) === h.id) workers.delete(k); }   // un nouvel ordre : les ouvriers changent d'activité
  else if (a === 'charrette+') { const A = AMELIO[niveauDe(h, 0)]; if (A && nbCharrettes(h) < Math.max(1, travMax(h)) && !manque(A.cout)) { for (const [k, q] of Object.entries(A.cout)) retirerDuStock(k, q); h.nbCh = nbCharrettes(h) + 1; } }
  else if (a === 'stk') { const A = STOCKAGE_EXT[h.stk || 0]; if (A && !manque(A.cout)) { for (const [k, q] of Object.entries(A.cout)) retirerDuStock(k, q); h.stk = (h.stk || 0) + 1; } }
  else if (a === 'garder+' || a === 'garder-') h.garder = Math.max(0, Math.min(50, (h.garder === undefined ? 10 : h.garder) + (a === 'garder+' ? 5 : -5)));
  else if (a === 'pousse-toggle') h.prod = { ...(h.prod || {}), actif:!(h.prod && h.prod.actif) };
  else if (a.startsWith('extdel:')) h.ext = (h.ext || []).filter(e => e.k !== a.slice(7));
  else if (['cb+', 'cb-', 'cp+', 'cp-'].includes(a)) {                                                    // camp de bûcherons : un bûcheron ou un porteur de plus ou de moins
    const plus = a[2] === '+', c = a.slice(0, 2); let fb = nbFond(h), fp = nbPort(h);
    if (plus && (fb + fp >= max || popVillage() - travUtilises() <= 0)) return;
    if (c === 'cb') { if (!plus && (fb <= 1 || fp > fb - 1)) return; fb += plus ? 1 : -1; }
    else { if ((plus && fp >= fb) || (!plus && fp <= 0)) return; fp += plus ? 1 : -1; }
    h.nb = fb + fp; h.port = fp;
  }
  else if (['hc+', 'hc-', 'hb+', 'hb-', 'hp+', 'hp-'].includes(a)) {                                  // hutte du charbonnier : un métier de plus ou de moins (le total des travailleurs suit)
    const plus = a[2] === '+', c = a.slice(0, 2); let fc = nbFond(h), fb = nbPort(h), fp = nbPortHut(h);
    if (plus && (fc + fb + fp >= max || popVillage() - travUtilises() <= 0)) return;
    if (c === 'hc') { if (!plus && fc <= 1) return; fc += plus ? 1 : -1; }
    else if (c === 'hb') { if (!plus && fb <= 0) return; fb += plus ? 1 : -1; }
    else { if ((plus && fp >= 2) || (!plus && fp <= 0)) return; fp += plus ? 1 : -1; }
    h.nb = fc + fb + fp; h.port = fb; h.pt = fp;
  }
  else if (a === 'pg+') h.porteurs = Math.min(PORTEURS_MAX, nbPorteurs(h) + 1);
  else if (a === 'pg-') h.porteurs = Math.max(0, nbPorteurs(h) - 1);
  else if (a === 'appro') { if (h.appro) finRemplissage(h, 'remplissage arrêté'); else lancerRemplissage(h); }
  else if (a === 'port+') h.port = Math.min(AVEC_PORTEURS[h.kind] || 0, nbPort(h) + 1);
  else if (a === 'port-') h.port = Math.max(0, nbPort(h) - 1);
  else if (a.startsWith('cartp:')) { const n = +a.slice(6), A = AMELIO[n]; if (A && n > (h.cartP || 0) && !manque(A.cout)) { for (const [k, q] of Object.entries(A.cout)) retirerDuStock(k, q); h.cartP = n; } }
  else if (a === 'moins') h.nb = Math.max(0, nb - 1);
  else if (a === 'plus' && nb < max && popVillage() > travUtilises()) h.nb = nb + 1;
  else if (a === 'amelio') { const A = amelios(h)[niveauH(h) + 1]; if (A && !manque(A.cout)) { for (const [k, q] of Object.entries(A.cout)) retirerDuStock(k, q); h.niv = niveauH(h) + 1; } }
  save(); requestDraw();
}
/* ---------- fiche d'un bâtiment (clic gauche) : même habillage « papier » que le tiroir de construction (carte.css : .fiche, .tiroir, .bat) ----------
   Structure fixe : en-tête (vignette, nom, catégorie), description, puis seulement les sections utiles au bâtiment : travailleurs, état, stock, habitants,
   zone de travail, réglages propres au métier, activité. Le clic droit ne fait rien sur un bâtiment. */
const BAT_CAT = { res:'Ressources', logi:'Logistique', com:'Commerce', agri:'Agriculture' };
const vivreTexte = (a, n, max) => { const u = uniteDe(a), f = x => qteArr(x).toLocaleString('fr-FR', { maximumFractionDigits:2 }), s = max === undefined ? f(n) : f(n) + ' / ' + f(max); return u === 'kg' ? s + ' kg' : u === 'L' ? s + ' L' : s + (Math.max(n, max || 0) >= 2 ? ' pièces' : ' pièce'); };   // stock exact : en kilos, en litres ou en pièces
const BAT_ICONE = { 'bâtons':'🪵', brindilles:'🌿', bois:'🪵', 'bois de chauffage':'🪵', planches:'🪵', pierre:'🪨', poisson:'🐟', baies:'🫐', pommes:'🍎', grain:'🌾', 'légumes':'🥕', 'œufs':'🥚', viande:'🍖', miel:'🍯', laine:'🐑', peaux:'🦌', pain:'🍞', 'bière':'🍺' };
function stockLignes(h, avecGraines) {                                                    // ce qui se trouve dans le bâtiment : [article, quantité]
  const L = Object.entries(h.inv || {}).filter(([, n]) => n >= 1).map(([k, n]) => [k, Math.floor(n)]);
  for (const [k, n] of Object.entries(h.mat || {})) if (n >= 1) { const e = L.find(x => x[0] === k); if (e) e[1] += Math.floor(n); else L.push([k, Math.floor(n)]); }   // (matières apportées par les porteurs)
  const p = surStockCentral(h) ? null : productOf(h);
  if (p && (h.stock || 0) >= 1) L.unshift([p, Math.floor(h.stock)]);
  if (avecGraines) for (const c of h.cave || []) { const nom = c.nom + ' (en affinage)', e = L.find(x => x[0] === nom); if (e) e[1]++; else L.push([nom, 1]); }
  if (avecGraines) for (const [pre, m] of [['graines de ', h.graines], ['pousses de ', h.pousses]]) for (const [k, n] of Object.entries(m || {})) if (n >= 1) L.push([pre + nomPlante(k).toLowerCase(), Math.floor(n)]);
  return L;
}
let batOnglet = { id:null, tab:'infos' };                                          // onglet ouvert de la fiche (par bâtiment)
const stockeDesBiens = h => !(buildingOf(h) || {}).cap && !!(productOf(h) || jobOf(h) || h.kind === 'camp_colon' || h.kind === 'hutte_forestier' || stockLignes(h).length);
const sansStock = html => html.replace(/<dt>(Stock|Contenu|Produits des extensions)<\/dt><dd>.*?<\/dd>/g, '');   // (les lignes de stock sont dans l'onglet STOCK)
const besoinsLigne = h => { const w = workers.get(h.id); return w && !w.passive ? `<dt>Villageois</dt><dd>rassasié ${Math.round(w.sati === undefined ? 90 : w.sati)} % · désaltéré ${Math.round(w.soif === undefined ? 90 : w.soif)} %</dd>` : ''; };   // (100 % : comblé)
const batLive = h => besoinsLigne(h) + sansStock(gestionLive(h));
/* Hutte de forestier : graines par espèce (200 au plus en tout), pousses prêtes à planter et germinations en cours (jours restants, avancement) — mis à jour chaque seconde. */
function forestierHtml(h) {
  const nom = k => (typeof nomPlante === 'function' ? nomPlante(k) : k), g = Object.entries(h.graines || {}).filter(([, n]) => n >= 1), p = Object.entries(h.pousses || {}).filter(([, n]) => n >= 1), j = jourJeu();
  const lot = (h.germe || []).map(b => { const reste = Math.max(0, Math.ceil(b.dur - (j - b.j0))), pct = Math.min(100, Math.round((j - b.j0) / b.dur * 100)); return `<li><span>🌱 ${gEsc(nom(b.sp))}</span><b>${reste} j · ${pct} %</b></li>`; }).join('');
  return `<h4>Graines · ${grainesTotal(h)} / ${FORET.MAX_GRAINES}</h4>` + (g.length ? '<ul class="bat-stock">' + g.map(([k, n]) => `<li><span>🌰 ${gEsc(nom(k))}</span><b>${Math.floor(n)}</b></li>`).join('') + '</ul>' : '<p class="bat-vide">Aucune graine</p>')
    + `<h4>Germination · ${(h.germe || []).length} en cours</h4>` + (lot ? '<ul class="bat-stock">' + lot + '</ul>' : '<p class="bat-vide">Rien ne germe (travail demandé « Faire germer », ${FORET.GRAINES_PAR_POUSSE} graines par pousse)</p>'.replace('${FORET.GRAINES_PAR_POUSSE}', FORET.GRAINES_PAR_POUSSE))
    + `<h4>Pousses prêtes · ${poussesTotal(h)}</h4>` + (p.length ? '<ul class="bat-stock">' + p.map(([k, n]) => `<li><span>🌿 ${gEsc(nom(k))}</span><b>${Math.floor(n)}</b></li>`).join('') + '</ul>' : '<p class="bat-vide">Aucune pousse prête à planter</p>');
}
function batStockHtml(h) {
  if (h.kind === 'hutte_forestier') return forestierHtml(h);                                                    // onglet STOCK : les matières nécessaires puis ce que contient le bâtiment, chaque ressource avec son maximum et son unité
  const J = jobOf(h), coll = J && J.type === 'collect', L = stockLignes(h, true);
  const ligne = (k, n, max, plus = '') => `<li><span>${BAT_ICONE[k] || (k.startsWith('graines') ? '🌰' : k.startsWith('pousses') ? '🌱' : '▫')} ${gEsc(k[0].toUpperCase() + k.slice(1))}${plus}</span><b${max && n >= max ? ' class="prod-avert"' : ''}>${max ? n + ' / ' + quantiteTexte(k, max) : quantiteTexte(k, n)}</b></li>`;
  if (coll) { const cap = capCollecte(h, J), tot = stockLignes(h).reduce((q, [, n]) => q + n, 0);
    const LL = h.kind === 'camp_mineur' ? Object.values(ORE).map(k => [k, Math.floor((L.find(x => x[0] === k) || [0, 0])[1])]) : L;      // camp de mineur : tous les produits des gisements, même à 0
    return `<h4>Stock · ${tot} / ${cap}</h4><div class="bat-barre"><i style="width:${Math.min(100, tot / cap * 100)}%"></i></div>` + (LL.length ? '<ul class="bat-stock">' + LL.map(([k, n]) => ligne(k, n, 0)).join('') + '</ul>' : '<p class="bat-vide">Vide</p>'); }
  const ent = entreesDe(h), vus = new Set();
  let html = '';
  if (ent.length) html += '<h4>Matières nécessaires</h4><ul class="bat-stock">' + ent.map(k => { vus.add(k); return ligne(k, Math.floor(stockDe(h, k)), maxRes(h, k)); }).join('') + '</ul>';
  const autres = L.filter(([k]) => !vus.has(k)).map(([k, n]) => { vus.add(k); return ligne(k, n, k.includes('(en affinage)') ? 0 : maxRes(h, k)); });
  for (const k of sortiesDe(h)) if (!vus.has(k)) { vus.add(k); autres.push(ligne(k, 0, maxRes(h, k))); }
  html += '<h4>Stock</h4>' + stockPermanentHtml(h) + (autres.length ? '<ul class="bat-stock">' + autres.join('') + '</ul>' : '<p class="bat-vide">Vide</p>');
  return html;
}
const stockPermanentHtml = h => { const J = jobOf(h); return J && J.type === 'collect' ? '' : `<div class="bat-ligne"><span>Stock permanent <small>(le surplus part à la grange ou à l’entrepôt)</small></span><span class="bat-curseur"><input type="range" min="0" max="100" step="5" value="${gardePct(h)}" data-garde aria-label="Stock permanent"><b id="garde-val">${gardePct(h)} %</b></span></div>`; };
function batPousseHtml(o) {                                                  // hutte de cueillette : réserve de graines et production de pousses
  const garder = o.garder === undefined ? 10 : o.garder, esp = (o.prod && o.prod.espece) || '';
  const somme = m => Object.values(m || {}).reduce((q, n) => q + n, 0), opts = Object.keys(o.graines || {}).map(k => `<option value="${gEsc(k)}"${k === esp ? ' selected' : ''}>${gEsc(nomPlante(k))}</option>`).join('');
  const c = o.coursPousse ? ` · en cours : ${gEsc(nomPlante(o.coursPousse.esp))} (${Math.ceil(o.coursPousse.t)} s)` : '';
  return `<h4>Pousses</h4>
    <div class="bat-ligne"><span>Graines à garder dans la hutte</span><span class="bat-ctl"><button data-g="garder-"${garder <= 0 ? ' disabled' : ''}>−</button><b>${garder}</b><button data-g="garder+"${garder >= 50 ? ' disabled' : ''}>+</button></span></div>
    <div class="bat-ligne"><span>Espèce à faire pousser</span><select data-pespece><option value="">Toutes (au-dessus de la réserve)</option>${opts}</select></div>
    <p class="bat-aide">Graines : ${Math.floor(somme(o.graines))} · pousses prêtes : ${Math.floor(somme(o.pousses))} (à planter plus tard dans les vergers)${c}. ${POUSSE.GRAINES} graines au-dessus de la réserve donnent une pousse en ${POUSSE.TEMPS} s, avec le travail demandé « Produire des pousses ».</p>`;
}
function batZoneInfo(o, b) {
  const n = b.need === 'game' ? ` · ${gibierZone(o.zone).length} animaux sauvages` : b.need === 'forest' || b.id === 'hutte_forestier' ? ` · ${treesInZone(o.zone).length} arbres` : b.need === 'fruit' ? ` · ${plantesZone(o.zone).length} plantes fruitières` : b.need === 'rock' ? ` · ${rocksInZone(o.zone).length} pierres` : '';
  return `rayon ${o.zone.r} m${n}`;
}
function batZoneHtml(o, b) {
  let c;
  if (zoneEdit && zoneEdit.id === o.id) c = `<p class="bat-aide">Cliquez sur la carte pour poser le centre de la zone. <kbd>Échap</kbd> pour annuler.</p>
    <label class="bat-rayon">Rayon : <b id="zone-r-val">${zoneEdit.r} m</b><input id="zone-r" type="range" min="${ZONE_MIN_R}" max="${b.radius}" step="5" value="${zoneEdit.r}"></label>
    <div class="bat-btns"><button data-g="zone-cancel">Annuler</button></div>`;
  else if (o.zone) c = `<p class="bat-aide">${batZoneInfo(o, b)}</p><div class="bat-btns"><button data-g="zone-edit">Modifier la zone</button><button data-g="zone-del" class="danger">Supprimer la zone</button></div>`;
  else c = '<p class="bat-aide"><b style="color:var(--bad)">Aucune zone définie</b></p><div class="bat-btns"><button data-g="zone-edit">Définir la zone</button></div>';
  return '<h4>Zone de travail</h4>' + c;
}
/* Panneau d'un bâtiment (simple) : nom, courte description, travailleurs, type d'exploitation (une seule activité), animaux, stock, production, état. Les réglages secondaires (améliorations, charrettes,
   extensions, culture, stock permanent) sont repliés dans « Options ». */
const ANIMAUX_NOM = { poulailler:'Poules', chevres:'Chèvres', porcherie:'Porcs', vaches:'Vaches', moutons:'Moutons' };
const CHASSE_ETAT = { idle:'cherche une proie', wait:'attend', done:'aucun gibier dans la zone', plein:'camp plein', sansarme:'sans lance : il manque du silex ou du bois', fab:'fabrique sa lance', go:'part chasser', tue:'tue sa proie', back:'rapporte sa proie', depece:'dépèce sa proie' };
function chasseHtml(o) {                                                                    // camp de chasse : le gibier détecté dans la zone, et ce que fait chaque chasseur
  if (!o.zone) return '<h4>Gibier</h4><p class="bat-aide">Définissez la zone de chasse.</p>';
  const cnt = {}; for (const p of proiesDe(o)) cnt[p.g.key] = (cnt[p.g.key] || 0) + 1;
  const liste = Object.entries(cnt).map(([k, n]) => FAUNE_NOM(k) + ' ×' + n).join(' · ') || 'aucun animal sauvage dans la zone';
  const ch = Array.from({ length:nbTrav(o) }, (_, i) => { const w = workers.get(i ? o.id + '#' + i : o.id); return `<div class="bat-ligne"><span>Chasseur ${i + 1}</span><b>${CHASSE_ETAT[w && w.state] || 'se prépare'}${w && w.arme > 0 ? ' · lance ' + w.arme : ''}</b></div>`; }).join('');
  return `<h4>Gibier dans la zone</h4><p class="bat-aide">${gEsc(liste)}</p>` + ch;
}
function rolesCampHtml(o) {                                                               // camp de bûcherons : bûcherons (abattent) et porteurs (ramassent et transportent), jamais plus de porteurs que de bûcherons
  const max = travMax(o), nb = nbReel(o), libres = Math.max(0, popVillage() - travUtilises()), fb = nbFond(o), fp = nbPort(o);
  const roles = [['cb', 'Bûcheron', 'abat les arbres', fb, 1, nb >= max || !libres, fp > fb - 1], ['cp', 'Porteur', 'ramasse et transporte le bois', fp, 0, nb >= max || !libres || fp >= fb, false]];
  return '<h4>Équipe</h4>' + roles.map(([c, nom, role, n, min, pasPlus, pasMoins]) => `<div class="bat-ligne"><span><b>${nom}</b> : ${role}</span><span class="bat-ctl"><button data-g="${c}-"${n <= min || pasMoins ? ' disabled' : ''} aria-label="Un ${nom.toLowerCase()} de moins">−</button><b>${n}</b><button data-g="${c}+"${pasPlus ? ' disabled' : ''} aria-label="Un ${nom.toLowerCase()} de plus">+</button></span></div>`).join('') + `<p class="bat-aide">${nb} / ${max} travailleurs · au plus autant de porteurs que de bûcherons</p>`;
}
function rolesHutHtml(o) {                                                                // hutte du charbonnier : charbonniers (fabriquent le charbon), bûcherons (coupent les arbres), porteurs (transportent le bois)
  const nb = nbReel(o), max = travMax(o), libres = Math.max(0, popVillage() - travUtilises()), roles = [['hc', 'Charbonnier', 'fabrique le charbon', nbFond(o), 1], ['hb', 'Bûcheron', 'coupe les arbres', nbPort(o), 0], ['hp', 'Porteur', 'transporte le bois', nbPortHut(o), 0]];
  return '<h4>Équipe</h4>' + roles.map(([c, nom, role, n, min]) => `<div class="bat-ligne"><span><b>${nom}</b> : ${role}</span><span class="bat-ctl"><button data-g="${c}-"${n <= min ? ' disabled' : ''} aria-label="Un ${nom.toLowerCase()} de moins">−</button><b>${n}</b><button data-g="${c}+"${nb >= max || !libres || (c === 'hp' && n >= 2) ? ' disabled' : ''} aria-label="Un ${nom.toLowerCase()} de plus">+</button></span></div>`).join('') + `<p class="bat-aide">${nb} / ${max} travailleurs</p>`;
}
function batHtml(o) {
  const b = buildingOf(o), I = INFOS[o.kind] || {}, max = travMax(o), sections = [];
  if (max && o.kind === 'hutte_charbonnier') sections.push(rolesHutHtml(o));
  else if (max && o.kind === 'camp_bucherons') sections.push(rolesCampHtml(o));
  else if (max) {
    const nb = nbReel(o), libres = Math.max(0, popVillage() - travUtilises());
    sections.push(`<h4>Travailleurs</h4><div class="bat-ligne"><span class="bat-ctl"><button data-g="moins"${nb <= 0 ? ' disabled' : ''} aria-label="Retirer un travailleur">−</button><b>${nb} / ${max}</b><button data-g="plus"${nb >= max || !libres ? ' disabled' : ''} aria-label="Ajouter un travailleur">+</button></span></div>`);
    if (AVEC_PORTEURS[o.kind]) sections.push(gestionPorteurs(o));
    if (portageOK(o)) sections.push(portageHtml(o));
  }
  if (b && b.cap) sections.push(`<h4>Type</h4><div class="bat-ligne"><span>${gEsc(b.name)}</span></div><h4>Habitants</h4><div class="bat-ligne"><span>Habitants</span><b>${typeof occupation === 'function' ? occupation(o) : 0} / ${b.cap}</b></div><h4>Réserves</h4>${[...new Set(['viande', 'œufs', 'lait', 'pain', ...Object.keys(o.vivres || {}).filter(k => (o.vivres[k] || 0) > .004)])].map(k => `<div class="bat-ligne"><span>${gEsc(k[0].toUpperCase() + k.slice(1))}</span><b>${vivreTexte(k, (o.vivres || {})[k] || 0, capAliment(o, k))}</b></div>`).join('')}`);
  if (o.kind === 'ferme') { const cur = (o.ext || [])[0]; sections.push(`<h4>Type d'exploitation</h4><select data-fermetype><option value=""${cur ? '' : ' selected'}>Céréales (champs)</option>${Object.entries(FERME_EXT).map(([k, d]) => `<option value="${k}"${cur && cur.k === k ? ' selected' : ''}>${gEsc(d.nom)}${coutTexte(d.cout) ? ' (' + coutTexte(d.cout) + ')' : ''}</option>`).join('')}</select>${gestionFerme(o)}`); }
  if (ACTIVITES[o.kind]) sections.push(`<h4>Type d'exploitation</h4><select data-actsel>${ACTIVITES[o.kind].map(([id, nom]) => `<option value="${id}"${actDe(o) === id ? ' selected' : ''}>${gEsc(nom)}</option>`).join('')}</select>`);
  const ani = (o.ext || []).filter(e => ANIMAUX_NOM[e.k] && FERME_EXT[e.k] && FERME_EXT[e.k].cap).map(e => `<div class="bat-ligne"><span>${ANIMAUX_NOM[e.k]}</span><b>${e.n === undefined ? 2 : e.n}</b></div>`).join('');
  if (ani) sections.push('<h4>Animaux</h4>' + ani);
  if (o.kind === 'hutte_cueillette') sections.push(`<div id="bat-pousses">${batPousseHtml(o)}</div>`);
  if (o.kind === 'hutte_forestier') sections.push(`<div id="bat-foret">${forestierHtml(o)}</div>`);
  if (o.kind === 'cabane_peche') sections.push('<div id="bat-eau"><h4>Pêcheurs</h4>' + (eauEdit && eauEdit.id === o.id
    ? `<p class="bat-aide">Pêcheur ${(eauEdit.slot || 0) + 1} : cliquez sur un spot libre de la carte (losanges le long des rivières et des étangs ; les spots déjà utilisés sont grisés). <kbd>Échap</kbd> pour annuler.</p><div class="bat-btns"><button data-g="eau-cancel">Annuler</button></div>`
    : Array.from({ length: Math.max(1, nbReel(o)) }, (_, i) => `<div class="bat-ligne"><span><b>Pêcheur ${i + 1}</b> · ${gEsc(eauTexte(o, i))}</span><button data-g="eau-edit:${i}">${eauDe(o, i) ? 'Changer' : 'Choisir'}</button></div>`).join('')) + '</div>');
  if (b && b.zone) sections.push(`<div id="bat-zone">${batZoneHtml(o, b)}</div>`);
  if (o.kind === 'camp_chasse') sections.push(chasseHtml(o));
  { const p = gestionProduction(o); if (p) sections.push(p); }
  if (PRODUCTION_AUTO.has(o.kind)) sections.push(`<h4>Production</h4><div id="fonte-liste">${fonteHtml(o)}</div>`);
  if (aBesoinStock(o)) { const min = intrantsMin(o), L = Object.entries(min).map(([k, q]) => `${gEsc(k)} : <b${aEnStock(o, k) < q ? ' class="prod-avert"' : ''}>${Math.floor(aEnStock(o, k))} / ${q}</b>`).join(' · ');
    sections.push(`<h4>Stock minimum</h4><p class="bat-aide">${L || 'Rien à préparer (file de production vide)'}</p>`); }
  if (max) sections.push(`<h4>État</h4><button data-g="actif" class="bat-etat ${o.actif !== false ? 'on' : 'off'}">${o.actif !== false ? '🟢 ACTIVÉ' : '🔴 DÉSACTIVÉ'}</button>`);
  const reg = gestionBarre(o);
  if (reg) sections.push(`<details class="bat-options"><summary>Options</summary><div class="bat-reglages" id="g-ctrl">${reg}</div></details>`);
  const stocke = stockeDesBiens(o), onglet = stocke && batOnglet.id === o.id && batOnglet.tab === 'stock' ? 'stock' : 'infos';
  const onglets = stocke ? `<div class="bat-onglets" role="tablist"><button data-g="onglet:infos" aria-pressed="${onglet === 'infos'}">INFOS</button><button data-g="onglet:stock" aria-pressed="${onglet === 'stock'}">STOCK</button></div>` : '';
  const yard = b && b.yard ? `<label class="bat-cour">Arrière-cour<select id="syard">${extOptions(yardOf(o))}</select></label>` : '';
  return `<div class="bat">
    <div class="bat-tete"><div><h3 class="bat-nom">${gEsc(o.type)}</h3></div></div>
    <p class="bat-desc">${gEsc(I.role || (b && b.use) || '')}</p>
    ${alerteBat(o) ? `<p class="bat-alerte" style="color:var(--bad);font-weight:600">⚠ ${gEsc(alerteBat(o))}</p>` : ''}
    ${onglets}${onglet === 'stock' ? `<div id="bat-stock">${batStockHtml(o)}</div>` : sections.join('')}
    <div class="bat-btns bat-pied">${yard}<button data-g="deplacer">Déplacer</button>${!b || b.turn ? '<button data-g="pivoter">Pivoter</button>' : ''}<button data-g="supprimer" class="danger">Supprimer</button></div>
  </div>`;
}
function renderBatiment(body, o) {
  body.innerHTML = batHtml(o);
  const b = buildingOf(o);
  if ($('syard')) $('syard').addEventListener('change', e => { commit(); o.yard = e.target.value; delete o.commande; changed(false); });
  if ($('zone-r')) $('zone-r').addEventListener('input', e => { zoneEdit.r = +e.target.value; $('zone-r-val').textContent = zoneEdit.r + ' m'; requestDraw(); });
}
(function () {
  const body = document.getElementById('sel-body'); if (!body) return;
  const maj = h => { const ff = document.getElementById('bat-foret'); if (ff) ff.innerHTML = forestierHtml(h); const fl = document.getElementById('fonte-liste'); if (fl) fl.innerHTML = fonteHtml(h); const pf = document.getElementById('prod-file'); if (pf) pf.innerHTML = prodFileHtml(h); const s = document.getElementById('bat-stock'); if (s) s.innerHTML = batStockHtml(h); const lv = document.getElementById('g-live'); if (lv) lv.innerHTML = batLive(h); };
  body.addEventListener('click', e => {
    const t = e.target.closest('[data-g]'), h = sel && sel.type === 'house' ? findById('house', sel.id) : null; if (!t || !h) return;
    const a = t.dataset.g, b = buildingOf(h);
    if (a === 'deplacer') { deplacer = { id:h.id }; zoneEdit = null; flash('Cliquez sur la carte pour poser le bâtiment · Échap pour annuler'); requestDraw(); }
    else if (a.startsWith('capture:')) { if (typeof demarrerCapture === 'function') demarrerCapture(h, a.slice(8)); }
    else if (a.startsWith('onglet:')) { batOnglet = { id:h.id, tab:a.slice(7) }; renderSel(); }
    else if (a.startsWith('eau-edit')) { eauEdit = { id:h.id, slot:+a.slice(9) || 0 }; deplacer = null; zoneEdit = null; renderSel(); requestDraw(); }
    else if (a === 'eau-cancel') { eauEdit = null; renderSel(); requestDraw(); }
    else if (a === 'pivoter') swap();
    else if (a === 'supprimer') deleteSel();
    else if (a === 'zone-edit') { zoneEdit = { id:h.id, r:h.zone ? h.zone.r : b.radius }; renderSel(); requestDraw(); }
    else if (a === 'zone-cancel') { zoneEdit = null; renderSel(); requestDraw(); }
    else if (a === 'zone-del') { commit(); delete h.zone; changed(false); flash('Zone de travail supprimée'); }
    else { gestionModif(h, a); renderSel(); }
  });
  body.addEventListener('input', e => {                                                     // curseur du stock permanent : réglage en direct
    const t = e.target, h = sel && sel.type === 'house' ? findById('house', sel.id) : null; if (!h || !t.dataset || !('garde' in t.dataset)) return;
    h.gardePct = +t.value; const v = document.getElementById('garde-val'); if (v) v.textContent = t.value + ' %'; save();
  });
  body.addEventListener('change', e => {
    const t = e.target, h = sel && sel.type === 'house' ? findById('house', sel.id) : null; if (!h || !t.dataset) return;
    if ('actsel' in t.dataset) { gestionModif(h, 'act:' + t.value); renderSel(); return; }
    if ('fermetype' in t.dataset) {                                                         // ferme : une seule activité à la fois (céréales, ou l'extension choisie)
      const k = t.value, cur = (h.ext || [])[0], d = FERME_EXT[k];
      if ((cur && cur.k === k) || (!cur && !k)) return;
      if (d) { const m = manque(d.cout); if (m) { flash(m, true); renderSel(); return; } for (const [r2, q] of Object.entries(d.cout)) retirerDuStock(r2, q); h.ext = [{ k, culture:undefined, cul:null, n:0 }]; } else h.ext = [];
      save(); renderSel(); return;
    }
    if ('extadd' in t.dataset) {                                                            // ferme : ajouter une extension (payée sur le stock du village)
      const k = t.value, d = FERME_EXT[k], L = h.ext = h.ext || [];
      if (!d || L.length >= FERME_EXT_MAX || L.some(x => x.k === k)) return;
      const m = manque(d.cout); if (m) { flash(m, true); renderSel(); return; }
      for (const [r, q] of Object.entries(d.cout)) retirerDuStock(r, q);
      L.push({ k, culture:undefined, cul:null, n:0 }); save(); renderSel();
    } else if ('extcul' in t.dataset) { const x = (h.ext || []).find(o => o.k === t.dataset.extcul); if (x) { x.culture = t.value; x.cul = null; save(); renderSel(); } }
    else if ('cul' in t.dataset) { h.culture = t.value; h.cul = null; save(); renderSel(); }
    else if ('pespece' in t.dataset) { h.prod = { ...(h.prod || {}), espece:t.value }; save(); renderSel(); }
  });
  setInterval(() => { const h = sel && sel.type === 'house' && findById('house', sel.id); if (h && !$('fiche').hidden) maj(h); }, 1000);   // stock et activité suivent le jeu
})();
