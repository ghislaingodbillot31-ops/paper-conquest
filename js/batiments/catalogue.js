/* Bâtiments du jeu de base (façade × profondeur, en cases de 8 m).
   cap : habitants au plus ; turn : peut pivoter (façade ↔ profondeur) ; unique : un seul
   par village ; yard : arrière-cour au choix ; radius : rayon d'action (m). */
const PRESETS = [
  { id:'camp_colon', name:'Camp de colon', f:3, d:3, cap:5, turn:true, unique:true, ownShadow:true,
    use:'Point de départ : il faut le poser avant tout autre bâtiment, et il installe 5 villageois' },
  { id:'maison',      name:'Maison simple',            f:1, d:1, cap:2, turn:true, ownShadow:true,
    use:'Logement : 2 habitants au plus' },
  { id:'maison_cour', name:'Maison avec arrière-cour', f:1, d:3, cap:4, turn:false, yard:true, ownShadow:true,
    use:"Logement d'une famille (4 habitants au plus), avec arrière-cour : jardin, verger ou élevage" },
  { id:'manoir',      name:'Manoir',                   f:3, d:3, turn:true, unique:true,
    use:"Siège du pouvoir : permet la taxation et l'administration" },
  { id:'puits',       name:'Puits',                    f:1, d:1, turn:true, radius:48,
    use:'Eau potable ; permet de lutter contre les incendies' },
  { id:'marche',      name:'Marché',                   f:3, d:3, turn:true,
    use:"Place dédiée aux marchands ambulants de l'extérieur et aux artisans du village" },
  { id:'taverne',     name:'Taverne',                  f:2, d:2, turn:true,
    use:'Comble le besoin de divertissement ; stocke la bière' },
  { id:'eglise',      name:'Église en bois',           f:3, d:4, turn:false,
    use:'Comble le besoin spirituel ; fournit un cimetière' },
  { id:'cimetiere',   name:'Cimetière',                f:2, d:2, turn:true,
    use:'Cimetière supplémentaire : là où reposent les morts' },
  { id:'grande_maison', name:'Maison avec cour et jardin', f:3, d:3, cap:6, turn:false, yard:true,
    use:"Maison de 2 × 2 cases avec jardin latéral et arrière-cour (jardin, verger ou élevage) : 6 habitants au plus" },
  /* ressources : posés sur les cases à bâtir comme les autres, mais il leur faut ce
     qu'ils exploitent à portée (forêt) ; radius = zone de travail */
  { id:'camp_bucherons', zone:true, cat:'res', name:'Camp de bûcherons', f:2, d:2, turn:true, ownShadow:true, radius:70, need:'forest',
    use:"Abat les arbres pour produire du bois d'œuvre" },
  { id:'loge_bucheron', zone:true,  cat:'res', name:'Loge de bûcheron',  f:1, d:2, turn:true, radius:60, need:'forest',
    use:'Produit du bois de chauffage' },
  { id:'hutte_forestier', zone:true, cat:'res', name:'Hutte de forestier', f:1, d:1, turn:true, radius:60,
    use:'Replante des arbres pour éviter la déforestation' },
  { id:'camp_chasse', zone:true,    cat:'res', name:'Camp de chasse',    f:2, d:2, turn:true, radius:120, need:'forest',
    use:'Chasse le gibier pour la viande et les peaux' },
  { id:'hutte_cueillette', zone:true, cat:'res', name:'Hutte de cueillette', f:1, d:2, turn:true, radius:70, need:'forest',
    use:'Récolte des baies, puis des herbes une fois améliorée' },
  { id:'rucher', zone:true,         cat:'res', name:'Rucher',            f:1, d:1, turn:true, radius:50, limit:2,
    use:'Produit du miel (2 ruchers au plus par région)' },
  { id:'tailleur_pierre', zone:true, cat:'res', name:'Camp de tailleur de pierre', f:2, d:2, turn:true, radius:40, need:'rock',
    use:'Récolte les pierres de sa zone de travail (3 pierres au moins) et les verse au stock du village' },
  { id:'fosse_miniere', zone:true, cat:'res', name:'Fosse minière',     f:2, d:2, turn:true, radius:40,
    use:"Extrait le minerai de fer et l'argile ; améliorable en mine profonde" },
  // (ownShadow : le dessin fait lui-même ses ombres — pas d'ombre rectangulaire sous la cour)
  { id:'scierie', cat:'res', name:'Scierie', f:3, d:4, turn:true, ownShadow:true,
    job:{ type:'fetch', from:['camp_bucherons', 'loge_bucheron'], mat:'bois', reach:500, work:4, product:'planches' },
    use:'Scie en planches les grumes des bûcherons (camp ou loge à moins de 500 m)' },
];
/* Zone de travail : un cercle que le joueur pose après avoir construit le bâtiment
   (sélection → « Définir la zone de travail »). Rayon réglable jusqu'au maximum du
   bâtiment ; centre à moins de ZONE_REACH m du bâtiment ; la zone doit
   contenir ce que le bâtiment exploite (forêt). */
const ZONE_REACH = 250, ZONE_MIN_R = 20, MIN_TREES = 10, MIN_ROCKS = 3; // une zone de bûcheron/chasse/cueillette : 10 arbres au moins
function zoneIssue(b, h, z) {
  if (!inTerrain([z.x, z.y])) return 'Hors du terrain';
  if (segLen([z.x, z.y], [h.x, h.y]) > ZONE_REACH) return `Trop loin du bâtiment (${ZONE_REACH} m au plus)`;
  if (b.need === 'forest') { const n = treesInZone(z).length; if (n < MIN_TREES) return `Seulement ${n} arbre${n > 1 ? 's' : ''} dans la zone (${MIN_TREES} au moins)`; }
  if (b.need === 'rock') { const n = rocksInZone(z).length; if (n < MIN_ROCKS) return `Seulement ${n} pierre${n > 1 ? 's' : ''} dans la zone (${MIN_ROCKS} au moins)`; }
  return null;
}
// raison pour laquelle un bâtiment ne peut pas se poser ici, ou null (limite par région)
function needIssue(b, h) {
  // en partie (pas dans les éditeurs) : le camp de colon ouvre la construction
  if (GAME && b.id !== 'camp_colon' && !S.houses.some(o => o.kind === 'camp_colon')) return "Posez d'abord le camp de colon";
  if (GAME && h.id === undefined && b.cout) { const m = manque(b.cout); if (m) return m; }   // (un bâtiment déjà posé qu'on déplace ne repaie pas)
  if (b.limit && S.houses.filter(o => o.kind === b.id && o.id !== h.id).length >= b.limit) return `${b.limit} ${b.name.toLowerCase()}s au plus par région`;
  return null;
}
const FOOD_LIST = ['légumes', 'œufs', 'pommes', 'pain'];
const NONFOOD_LIST = ['bois', 'planches', 'laine', 'peaux', 'pièces en bois', 'arcs et flèches', 'vêtements', 'chaussures', 'bière', 'outils et armes', 'armures'];
/* Extensions d'arrière-cour : une par cour (maison avec arrière-cour, maison avec cour et
   jardin). Production passive, ou atelier qui va chercher sa matière chez un producteur. */
const EXT = {
  potager:    { name:'Potager', grp:'Production', job:{ type:'passive', every:15, cap:20, product:'légumes' } },
  poulailler: { name:'Poulailler', grp:'Production', job:{ type:'passive', every:12, cap:20, product:'œufs' } },
  chevres:    { name:'Enclos à chèvres', grp:'Production', job:{ type:'passive', every:25, cap:20, product:'peaux' } },
  verger:     { name:'Verger de pommiers', grp:'Production', job:{ type:'passive', every:30, cap:20, product:'pommes', note:'saisonnier' } },
  flechier:   { name:'Atelier de fléchier/arc', grp:'Artisanat', job:{ type:'fetch', from:['camp_bucherons', 'loge_bucheron'], mat:'bois', reach:500, work:4, product:'arcs et flèches' } },
  menuisier:  { name:'Atelier de menuisier', grp:'Artisanat', job:{ type:'fetch', from:['camp_bucherons', 'loge_bucheron'], mat:'bois', reach:500, work:4, product:'pièces en bois' } },
  brasserie:  { name:'Extension de brasserie', grp:'Artisanat', job:{ type:'fetch', from:['malterie'], mat:'malt', reach:500, work:4, product:'bière' } },
  cordonnier: { name:'Atelier de cordonnier', grp:'Artisanat', job:{ type:'fetch', from:['chevres'], mat:'peaux', reach:500, work:4, product:'chaussures' } },
  tailleur:   { name:'Atelier de tailleur', grp:'Artisanat', job:{ type:'fetch', from:['bergerie'], mat:'laine', reach:500, work:4, product:'vêtements' } },
  forgeron:   { name:'Atelier de forgeron', grp:'Artisanat', job:{ type:'fetch', from:['fonderie'], mat:'barres de fer', reach:500, work:5, product:'outils et armes' } },
  boulangerie:{ name:'Extension de boulangerie', grp:'Artisanat', job:{ type:'fetch', from:['moulin'], mat:'farine', reach:500, work:2, product:'pain' } },
  armurier:   { name:"Atelier d'armurier", grp:'Artisanat', job:{ type:'fetch', from:['fonderie'], mat:'barres de fer', reach:500, work:6, product:'armures' } },
};
// anciennes arrière-cours (jardin / verger / élevage) → extensions équivalentes
const YARD_OLD = { jardin:'potager', verger:'verger', elevage:'chevres' };
const yardOf = h => YARD_OLD[h.yard] || (EXT[h.yard] ? h.yard : 'potager');
// liste déroulante groupée (Production / Artisanat)
const extOptions = current => ['Production', 'Artisanat'].map(g => `<optgroup label="${g}">` +
  Object.entries(EXT).filter(([, v]) => v.grp === g).map(([k, v]) => `<option value="${k}"${k === current ? ' selected' : ''}>${v.name}</option>`).join('') + '</optgroup>').join('');
// Logistique et commerce
PRESETS.push(
  { id:'grange',   cat:'logi', name:'Grange',   f:2, d:3, turn:true, job:{ type:'collect', accepts:FOOD_LIST, reach:300, cap:400, product:'nourriture' },
    use:'Stocke et distribue la nourriture : ramasse légumes, œufs, pommes et pain à moins de 300 m' },
  { id:'entrepot', cat:'logi', name:'Entrepôt', f:3, d:3, turn:true, job:{ type:'collect', accepts:NONFOOD_LIST, reach:300, cap:250, product:'ressources' },
    use:'Stocke jusqu’à 250 unités de ressources non alimentaires (bois, laine, peaux, objets fabriqués), à moins de 300 m' },
  { id:'relais',   cat:'logi', name:'Poste de relais', f:2, d:2, turn:true, job:{ type:'relay', product:'troc' },
    use:'Permet le troc entre régions via des mulets (les échanges avec les autres régions viendront plus tard)' },
  { id:'poteau',   cat:'logi', name:'Poteau d’attache', f:1, d:1, turn:true, radius:200,
    use:'Écurie de bœufs pour tirer le bois et la pierre : les bûcherons et ouvriers à moins de 200 m vont 50 % plus vite' },
  { id:'comptoir', cat:'com',  name:'Comptoir commercial', f:3, d:2, turn:true, job:{ type:'sell', reach:500, product:'Or' },
    use:'Commerce avec les marchands : vend le contenu des granges et entrepôts (à moins de 500 m) contre de l’Or' },
  { id:'comptoir_betail', cat:'com', name:'Comptoir de bétail', f:3, d:3, turn:true, radius:200,
    use:'Commerce du bétail ; son parc sert de pâturage aux bergeries et ses bœufs accélèrent les ouvriers à moins de 200 m' },
);

/* Agriculture. Les bâtiments ont un métier (job) : aller travailler les terres autour
   d'eux (site) ou aller chercher une matière chez un autre bâtiment (fetch), puis
   rapporter et stocker leur produit. */
PRESETS.push(
  { id:'ferme',    cat:'agri', name:'Ferme',    f:3, d:3, turn:true, job:{ type:'site', on:'champ', reach:250, work:4, product:'grain' },
    use:'Emploie les ouvriers qui cultivent les terres autour de la ferme ; produit du grain' },
  { id:'bergerie', cat:'agri', name:'Bergerie', f:2, d:3, turn:true, job:{ type:'site', on:'paturage', reach:250, work:3, product:'laine' },
    use:'Récolte la laine des moutons qui paissent autour de la bergerie (ou au parc d’un comptoir de bétail)' },
  { id:'moulin',   cat:'agri', name:'Moulin à vent', f:2, d:2, turn:true, job:{ type:'fetch', from:'ferme', mat:'grain', reach:500, work:3, product:'farine' },
    use:'Transforme le grain (pris à la ferme la plus proche, à moins de 500 m) en farine' },
  { id:'four',     cat:'agri', name:'Four communal', f:2, d:2, turn:true, job:{ type:'fetch', from:'moulin', mat:'farine', reach:500, work:3, product:'pain' },
    use:'Transforme la farine (prise au moulin le plus proche, à moins de 500 m) en pain' },
);
/* Coût de construction (ressources du village) et stock donné par le camp de colon.
   Le stock du village est S.stock { ressource: quantité } ; le camp le remplit une fois, à sa pose. */
const COUTS = {
  maison:{ bois:10 }, maison_cour:{ bois:25 }, grande_maison:{ bois:40, planches:10 }, manoir:{ bois:60, planches:40, pierre:30 },
  puits:{ pierre:15 }, marche:{ bois:40, planches:10 }, taverne:{ bois:35, planches:15 }, eglise:{ bois:60, planches:30, pierre:20 }, cimetiere:{ pierre:10 },
  camp_bucherons:{ bois:15 }, loge_bucheron:{ bois:8 }, hutte_forestier:{ bois:6 }, camp_chasse:{ bois:12 }, hutte_cueillette:{ bois:8 }, rucher:{ bois:5 },
  tailleur_pierre:{ bois:15 }, fosse_miniere:{ bois:25 }, scierie:{ bois:40, pierre:10 },
  grange:{ bois:30 }, entrepot:{ bois:40, planches:10 }, relais:{ bois:20 }, poteau:{ bois:5 }, comptoir:{ bois:30, planches:10 }, comptoir_betail:{ bois:40 },
  ferme:{ bois:30 }, bergerie:{ bois:25 }, moulin:{ bois:30, pierre:15 }, four:{ bois:5, pierre:20 },
};
PRESETS.forEach(p => { if (COUTS[p.id]) p.cout = COUTS[p.id]; });
const STOCK_DEPART = { bois:150, planches:20, pierre:40, légumes:40, pain:30, pommes:20 };
const coutTexte = cout => Object.entries(cout || {}).map(([k, q]) => q + ' ' + k).join(', ');
// ce qui manque au village pour payer ce coût (texte), ou null
function manque(cout) {
  const st = S.stock || {};
  const m = Object.entries(cout || {}).filter(([k, q]) => (st[k] || 0) < q).map(([k, q]) => (q - (st[k] || 0)) + ' ' + k);
  return m.length ? 'Il manque ' + m.join(', ') : null;
}
const buildingOf = h => PRESETS.find(p => p.id === h.kind) || null;

/* Menus de construction de la capitale (onglet Construction) : catégorie → bâtiments, dans
   l'ordre d'affichage. Un bâtiment absent de ces listes n'est pas proposé au joueur.
   Défense : les outils de fortification (muraille, tour, porte), pas des bâtiments. */
const BUILD_MENUS = [
  { id:'recolte',     name:'Récolte',     ids:['camp_bucherons', 'loge_bucheron', 'hutte_forestier', 'camp_chasse', 'hutte_cueillette', 'rucher', 'tailleur_pierre', 'fosse_miniere'] },
  { id:'stockage',    name:'Stockage',    ids:['grange', 'entrepot', 'relais', 'poteau', 'comptoir', 'comptoir_betail'] },
  { id:'residentiel', name:'Résidentiel', ids:['camp_colon', 'maison', 'maison_cour', 'grande_maison', 'manoir', 'marche', 'taverne', 'eglise'] },
  { id:'agriculture', name:'Agriculture', ids:['ferme', 'bergerie'] },
  { id:'industrie',   name:'Industrie',   ids:['scierie', 'moulin', 'four'] },
  { id:'decoratif',   name:'Décoratif',   ids:['puits', 'cimetiere'] },
  { id:'defense',     name:'Défense',     tools:[['wall', 'Fortification'], ['tower', 'Tour'], ['gate', 'Porte']] },
];
