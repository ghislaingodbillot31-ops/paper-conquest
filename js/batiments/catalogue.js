/* Bâtiments du jeu de base (façade × profondeur, en cases de 8 m).
   cap : habitants au plus ; turn : peut pivoter (façade ↔ profondeur) ; unique : un seul
   par village ; yard : arrière-cour au choix ; radius : rayon d'action (m). */
const PRESETS = [
  { id:'camp_colon', name:'Camp de colon', f:3, d:3, cap:5, turn:true, unique:true, ownShadow:true,
    use:'Point de départ : il faut le poser avant tout autre bâtiment, et il installe 5 villageois' },
  { id:'maison',      name:'Maison simple',            f:2, d:2, cap:2, turn:true, ownShadow:true,
    use:'Logement : 2 habitants au plus' },
  { id:'maison_cour', name:'Maison avec arrière-cour', f:2, d:3, cap:4, turn:false, ownShadow:true,
    use:"Logement d'une famille (4 habitants au plus), avec une arrière-cour" },
  { id:'manoir',      name:'Manoir',                   f:3, d:3, turn:true, unique:true,
    use:"Siège du pouvoir : permet la taxation et l'administration" },
  { id:'mairie',      name:'Mairie',                   f:3, d:3, turn:true, unique:true,
    use:"Siège de la gestion du village : les décisions s'y prennent et les nouveaux arrivants s'y présentent (sans mairie, personne n'arrive)" },
  { id:'puits',       name:'Puits',                   f:1, d:1, turn:true, radius:48,
    use:'Eau potable ; permet de lutter contre les incendies' },
  { id:'marche',      name:'Marché',                   f:6, d:2, turn:true,
    use:"12 emplacements (2 × 6) : les ouvriers y installent après le travail un étal permanent de produits alimentaires" },
  { id:'taverne',     name:'Taverne',                  f:2, d:2, turn:true,
    use:'Comble le besoin de divertissement ; stocke la bière' },
  { id:'eglise',      name:'Église en bois',           f:3, d:4, turn:false,
    use:'Comble le besoin spirituel ; fournit un cimetière' },
  { id:'cimetiere',   name:'Cimetière',                f:2, d:2, turn:true,
    use:'Cimetière supplémentaire : là où reposent les morts' },
  { id:'grande_maison', name:'Maison avec cour et jardin', f:3, d:3, cap:6, turn:false,
    use:"Maison avec jardin latéral et arrière-cour : 6 habitants au plus" },
  /* ressources : posés sur les cases à bâtir comme les autres, mais il leur faut ce
     qu'ils exploitent à portée (forêt) ; radius = zone de travail */
  { id:'camp_bucherons', zone:true, cat:'res', name:'Camp de bûcherons', f:2, d:2, turn:true, ownShadow:true, radius:70, need:'forest',
    use:"Abat les arbres pour produire du bois d'œuvre" },
  { id:'loge_bucheron', zone:true,  cat:'res', name:'Loge de bûcheron',  f:1, d:2, turn:true, radius:60, need:'forest',
    use:'Abat un arbre puis le fend en 4 bûches de chauffage (100 au plus) ; il faut une hache' },
  { id:'hutte_forestier', zone:true, cat:'res', name:'Hutte de forestier', f:1, d:1, turn:true, radius:60,
    use:'Deux activités : récolter (graines en forêt, pousses à la hutte) et planter (les pousses prêtes), pour éviter la déforestation' },
  { id:'camp_chasse', zone:true,    cat:'res', name:'Camp de chasse',    f:2, d:2, turn:true, radius:120, need:'game',
    use:'Chasse le gibier du cercle avec des lances faites par les chasseurs eux-mêmes (silex + branche) ; l’animal est dépecé au camp : viande, peaux, os, tendons, graisse selon son poids' },
  { id:'hutte_cueillette', zone:true, cat:'res', name:'Hutte de cueillette', f:2, d:2, turn:true, radius:70, need:'fruit',
    use:"Cueille les fruits des arbres fruitiers et les baies des arbustes de sa zone de travail (qui doit en contenir) ; chaque plante a son propre potentiel et redonne des fruits à la saison suivante" },
  { id:'rucher', zone:true,         cat:'res', name:'Rucher',            f:1, d:1, turn:true, radius:50, limit:2,
    use:'Produit du miel (2 ruchers au plus par région)' },
  { id:'cabane_peche', cat:'res', name:'Cabane de pêche', f:2, d:2, turn:true, ownShadow:true, need:'water',
    job:{ type:'fish', work:8, product:'poisson' },
    use:"Le pêcheur travaille sur tous les points d'eau du village (étangs), sans zone à définir : il faut au moins un étang" },
  { id:'tailleur_pierre', zone:true, cat:'res', name:'Camp de tailleur de pierre', f:2, d:2, turn:true, radius:40, need:'rock',
    use:'Récolte les pierres de sa zone de travail (3 pierres au moins) et les verse au stock du village' },
  { id:'fosse_miniere', cat:'res', name:'Fosse minière',     f:3, d:3, turn:false, sur:'gisement', job:{ type:'site', on:'gisement', reach:0, work:30, product:'minerai' },
    use:"Se pose sur une zone de pépites (gisement) : le mineur descend dans la mine, remonte 4 kg de minerai toutes les 30 secondes (1 unité de pierre, silex, sel, alun ou ambre ; sur une carrière, la pierre est illimitée) et le range dans la cabane (stockage provisoire) ; il faut une pioche" },
  { id:'camp_mineur', cat:'res', name:'Camp de mineur', f:2, d:2, turn:true, job:{ type:'collect', accepts:'nonfood', from:['fosse_miniere'], reach:600, cap:2000, product:'minerais' },
    use:'Décharge les fosses minières (à moins de 600 m) et stocke toutes leurs ressources : minerais, silex, sel, alun, ambre' },
  // (ownShadow : le dessin fait lui-même ses ombres — pas d'ombre rectangulaire sous la cour)
  { id:'scierie', cat:'res', name:'Scierie', f:3, d:4, turn:true, ownShadow:true,
    job:{ type:'craft' },
    use:'Scie du bois en planches (file de production)' },
];
/* Zone de travail : un cercle que le joueur pose après avoir construit le bâtiment
   (sélection → « Définir la zone de travail »). Rayon réglable jusqu'au maximum du
   bâtiment ; centre à moins de ZONE_REACH m du bâtiment ; la zone doit
   contenir ce que le bâtiment exploite (forêt). */
const ZONE_REACH = Infinity, ZONE_MIN_R = 20, MIN_TREES = 10, MIN_ROCKS = 3, MIN_FRUITS = 3, MIN_GIBIER = 1; // une zone de bûcheron/chasse/cueillette : 10 arbres au moins
function zoneIssue(b, h, z) {
  if (!inTerrain([z.x, z.y])) return 'Hors du terrain';
  if (b.need === 'forest') { const n = treesInZone(z).length; if (n < MIN_TREES) return `Seulement ${n} arbre${n > 1 ? 's' : ''} dans la zone (${MIN_TREES} au moins)`; }
  if (b.need === 'game') { const n = gibierZone(z).length; if (n < MIN_GIBIER) return 'Aucun animal sauvage à chasser dans la zone'; }          // (camp de chasse : du gibier, pas des arbres)
  if (b.need === 'fruit') { const n = plantesZone(z).length; if (n < MIN_FRUITS) return `Seulement ${n} arbre${n > 1 ? 's' : ''} fruitier${n > 1 ? 's' : ''} ou arbuste${n > 1 ? 's' : ''} à baies dans la zone (${MIN_FRUITS} au moins)`; }
  if (b.need === 'rock') { const n = rocksInZone(z).length + silexInZone(z).length; if (n < MIN_ROCKS) return `Seulement ${n} pierre${n > 1 ? 's' : ''} dans la zone (${MIN_ROCKS} au moins)`; }
  return null;
}
// raison pour laquelle un bâtiment ne peut pas se poser ici, ou null (limite par région)
function needIssue(b, h) {
  // en partie (pas dans les éditeurs) : le camp de colon ouvre la construction
  const fonde = S.fonde || S.houses.some(o => o.kind === 'camp_colon');   // (le camp supprimé, le village reste fondé)
  if (GAME && b.id !== 'camp_colon' && !fonde) return "Posez d'abord le camp de colon";
  if (GAME && b.id === 'camp_colon' && S.fonde && !S.houses.some(o => o.kind === 'camp_colon')) return 'Le village est déjà fondé';
  if (GAME && !CONSTRUCTION_GRATUITE && h.id === undefined && b.cout) { const m = manque(b.cout); if (m) return m; }   // (un bâtiment déjà posé qu'on déplace ne repaie pas)
  if (b.sur === 'gisement' && !(S.deposits || []).some(d => segLen(d.c, [h.x, h.y]) <= d.r)) return 'À poser sur un gisement (zone de pépites)';
  if (b.need === 'water' && !(S.lakes || []).length) return "Aucun point d'eau dans ce village";
  if (b.limit && S.houses.filter(o => o.kind === b.id && o.id !== h.id).length >= b.limit) return `${b.limit} ${b.name.toLowerCase()}s au plus par région`;
  return null;
}
const FOOD_LIST = ['fromage frais', 'fromage à pâte molle', 'fromage de garde', 'lait', 'baies', 'légumes', 'œufs', 'pommes', 'pain', 'poisson', 'viande'];
/* Les extensions de maison et de bâtiment n'existent plus : chaque métier est un bâtiment à part (menuiserie, forge, archerie, armurerie, cordonnerie, couture, brasserie, fonderie).
   EXT ne reste que pour le DÉCOR de l'arrière-cour dessinée (dessins.js : yardLT) ; les fermes ont leurs propres extensions (FERME_EXT). */
const EXT = {
  potager:    { name:'Potager', grp:'Production' },
  poulailler: { name:'Poulailler', grp:'Production' },
  chevres:    { name:'Enclos à chèvres', grp:'Production' },
  verger:     { name:'Verger', grp:'Production' },
};
/* Extension de la ferme (une seule, sur tout l'espace libre de la parcelle), dessinées sur la parcelle de la ferme (dessins.js : extLT). h.ext = [{ k, n (animaux), culture, cul, t }].
   Cultures : jardin et verger suivent les saisons (cultures.js ; outil : houe, serpe). Élevage : l'enclos ne produit que s'il contient des animaux, capturés sur la carte par les fermiers
   (option Capture de la fiche) : chaque animal donne une unité toutes les `every` secondes ; cap = animaux au plus ; especes = espèces sauvages capturables (faune.js).
   Les céréales ne sont pas une extension : la ferme cultive des CHAMPS (champs.js). */
const FERME_EXT_MAX = 1;                       // une seule extension par ferme, qui occupe tout l'espace libre de la parcelle
const FERME_EXT = {
  jardin:     { nom:'Jardin potager',   cult:'legume', outil:'houe',  cout:{ bois:15 },            use:'légumes de saison (choisir la culture)' },
  verger:     { nom:'Verger',           cult:'fruit',  outil:'serpe', cout:{ bois:20, planches:5 }, use:'fruits de saison (choisir l’arbre)' },
  poulailler: { nom:'Poulailler',       cap:10, every:50,  produit:'œufs',   especes:['dindon'],                           cout:{ bois:15 },              use:'œufs : une poule en donne un toutes les 50 s' },
  chevres:    { nom:'Enclos à chèvres', cap:6,  every:80,  produit:'peaux',  especes:['chevre', 'chevre_cachemire'],       cout:{ bois:20 },              use:'peaux : une chèvre en donne une toutes les 80 s' },
  porcherie:  { nom:'Porcherie',        cap:6,  every:120, produit:'viande', especes:['cochon', 'sanglier'],               cout:{ bois:25, planches:5 },  use:'viande : un porc en donne une toutes les 120 s' },
  vaches:     { nom:'Enclos à vaches',  cap:6,  every:90,  produit:'lait',   especes:['vache', 'zebu', 'yak'],             cout:{ bois:25, planches:5 },  use:'lait : une vache en donne un toutes les 90 s' },
  moutons:    { nom:'Enclos à moutons', cap:8,  every:100, produit:'laine',  especes:['mouton'],                           cout:{ bois:20 },              use:'laine : un mouton en donne une toutes les 100 s' },
};
// anciennes arrière-cours (jardin / verger / élevage) → extensions équivalentes
const YARD_OLD = { jardin:'potager', verger:'verger', elevage:'chevres' };
const yardOf = h => YARD_OLD[h.yard] || (EXT[h.yard] ? h.yard : 'potager');   // (anciennes cours : un atelier d'avant devient un potager décoratif)
// liste déroulante groupée (Production / Artisanat)
const extOptions = current => ['Production', 'Artisanat'].map(g => `<optgroup label="${g}">` +
  Object.entries(EXT).filter(([, v]) => v.grp === g).map(([k, v]) => `<option value="${k}"${k === current ? ' selected' : ''}>${v.name}</option>`).join('') + '</optgroup>').join('');
/* Transport par charrette : ce que le ramasseur (grange, entrepôt) peut charger en UN trajet. Sans charrette : 1 article. Charrette à main (niveau 1) : CHARGE_CHARRETTE[catégorie] ;
   chariot de transport (niveau 2) : voir chargeMax (CAPACITE_KG). Tout article du stock appartient à une catégorie (categorieArticle) : tout ce qui est transportable est donc défini ici. */
const CHARGE_CHARRETTE = { nourriture:20, grain:30, bois:10, chauffage:20, planches:10, pierre:10, minerai:12, metal:12, matiere:20, objets:20 };
const METAUX = ['fer', 'cuivre', 'étain', 'plomb', 'argent', 'or', 'bronze', 'acier'];
function categorieArticle(a) {
  if (FOOD_LIST.includes(a)) return 'nourriture';
  if (a === 'grain' || a === 'farine' || a === 'malt') return 'grain';
  if (a === 'bois') return 'bois';
  if (a === 'bois de chauffage') return 'chauffage';
  if (a === 'planches') return 'planches';
  if (a === 'pierre') return 'pierre';
  if (a.startsWith('minerai') || a === 'sel' || a === 'alun' || a === 'ambre') return 'minerai';
  if (METAUX.includes(a)) return 'metal';
  if (['laine', 'peaux', 'corde', 'lait', 'miel', 'fibres'].includes(a)) return 'matiere';
  return 'objets';                                               // outils, armes, vêtements, bière…
}
/* CHARGE D'UN HABITANT, par ressource, d'après le POIDS d'une unité (kg) : un habitant porte CHARGE_KG kg, donc chargeHabitant(article) = CHARGE_KG / poids (de 1 à 100 unités). Tous les habitants portent la même chose : si le bûcheron porte 5 bâtons,
   tout le monde porte 5 bâtons. Toute nouvelle ressource : une ligne dans RESSOURCES (sinon une pièce de 1 kg, soit 10 unités). Charrette à main : 25 kg ; chariot : × CHARRETTE_X × CHARIOT_X (50 bois au chariot). */
const CHARGE_KG = 10, CAPACITE_KG = [CHARGE_KG, 25, 125];   // capacité en kg : habitant à pied, charrette à main, chariot (50 bois = 125 kg)
/* DÉFINITION DES RESSOURCES : [unité de mesure, poids en kg d'une unité]. Unités : « kg » (la quantité est un poids : 1 unité = 1 kg), « L » (litres de liquide : 1 unité = 1 L, 1 kg), « pièce » (objets, bûches, planches, peaux… comptés à
   la pièce ; poids d'une pièce). Toute ressource (actuelle ou à venir) a UNE ligne ici : sans ligne, elle compte pour une pièce de 1 kg. */
const RESSOURCES = {
  // bois et végétaux
  bois:['pièce', 2.5], 'bois de chauffage':['pièce', 2], 'bâtons':['pièce', 2], brindilles:['pièce', .5], planches:['pièce', 3], fibres:['pièce', .3], corde:['pièce', .5], "manche d'outil":['pièce', .5], 'pièces en bois':['pièce', 1],
  // pierre et minéraux
  pierre:['pièce', 5], 'pierre taillée':['pièce', 8], silex:['pièce', .5], 'pointes de flèche':['pièce', .05], 'charbon de bois':['kg', 1], sel:['kg', 1], alun:['kg', 1], ambre:['pièce', .2],
  // nourriture
  grain:['kg', 1], farine:['kg', 1], malt:['kg', 1], pain:['pièce', .5], 'légumes':['pièce', .5], pommes:['pièce', .3], baies:['pièce', .1], 'œufs':['pièce', .06], lait:['L', 1], 'fromage frais':['pièce', 1], 'fromage à pâte molle':['pièce', 1.5],
  'fromage de garde':['pièce', 4], 'présure':['pièce', .1], poisson:['pièce', 1.5], viande:['kg', 1], miel:['kg', 1], 'huile de poisson':['L', 1], 'bière':['L', 1],
  // matières animales et textiles
  laine:['kg', 1], peaux:['pièce', 3], os:['pièce', 1], tendons:['pièce', .1], graisse:['kg', 1], chaussures:['pièce', 1], 'vêtements':['pièce', 1],
  // métaux (lingots)
  'minerai de fer':['kg', 1], 'minerai de cuivre':['kg', 1], "minerai d'étain":['kg', 1], 'minerai de plomb':['kg', 1], "minerai d'argent":['kg', 1], "minerai d'or":['kg', 1],   // minerais : au kilo
  fer:['pièce', 4], cuivre:['pièce', 4], 'étain':['pièce', 3], plomb:['pièce', 6], argent:['pièce', 4], or:['pièce', 6], bronze:['pièce', 4], acier:['pièce', 4],
  // objets
  'outils et armes':['pièce', 2], 'arcs et flèches':['pièce', 2], armures:['pièce', 10], 'charrette à main':['pièce', 40], chariot:['pièce', 100],
};
function ressourceDe(a) {                                                               // [unité, poids d'une unité en kg]
  if (RESSOURCES[a]) return RESSOURCES[a];
  if (a.startsWith('minerai')) return ['kg', 1];
  if (a.startsWith('graines')) return ['pièce', .05];
  if (a.startsWith('pousses')) return ['pièce', .5];
  if (a.startsWith('armure')) return ['pièce', 10];
  if (a.startsWith('bouclier') || a.startsWith('arbalète')) return ['pièce', 4];
  if (a.startsWith('flèche')) return ['pièce', .1];
  if (/\(.+\)$/.test(a)) return ['pièce', 2];                                          // outils et armes fabriqués (« hache (fer) »…)
  return ['pièce', 1];
}
const poidsUnite = a => ressourceDe(a)[1];
const uniteDe = a => ressourceDe(a)[0];
const quantiteTexte = (a, n) => n + (uniteDe(a) === 'pièce' ? '' : ' ' + uniteDe(a));      // « 12 L », « 40 kg », « 6 »
const chargeHabitant = a => Math.max(1, Math.min(100, Math.floor(CHARGE_KG / poidsUnite(a))));
/* Charge d'un porteur, d'une charrette ou d'un chariot : CAPACITE_KG[niveau] ÷ poids d'une unité (au moins 1) : à pied 10 kg, charrette 25 kg, chariot 125 kg. Ex. bois (2,5 kg) : 4, 10 et 50 ; pierre (5 kg) : 2, 5 et 25. */
const chargeMax = (a, niv) => !niv ? chargeHabitant(a) : Math.max(1, Math.floor(CAPACITE_KG[Math.min(2, niv)] / poidsUnite(a)));
const chargesTexte = niv => ['bâtons', 'bois', 'planches', 'pierre', 'minerai de fer', 'grain', 'viande', 'fer'].map(a => a + ' ' + chargeMax(a, niv)).join(' · ');
// Logistique et commerce
PRESETS.push(
  { id:'grange',   cat:'logi', name:'Grange',   f:2, d:3, turn:true, job:{ type:'collect', accepts:FOOD_LIST, reach:300, cap:400, product:'nourriture' },
    use:'Stocke et distribue la nourriture : ramasse légumes, œufs, pommes et pain à moins de 300 m' },
  { id:'entrepot', cat:'logi', name:'Entrepôt', f:3, d:3, turn:true, job:{ type:'collect', accepts:'nonfood', reach:300, cap:250, product:'ressources' },
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

// Ateliers (chacun un bâtiment à part) : fabrication à la commande (outils.js) pour la menuiserie, la forge, l'archerie et l'armurerie ; les autres transforment une matière prise chez un producteur
PRESETS.push(
  { id:'menuiserie', cat:'ind', name:'Atelier de menuiserie', f:3, d:3, turn:true, job:{ type:'craft' },
    use:'Grand atelier de menuisier (3 × 3 cases, gros stock de matières) : corde, outils et armes primitifs (bois, silex), gourdin, boucliers de bois, flèches de bois, charrettes et chariots' },
  { id:'forge',      cat:'ind', name:'Forge',                 f:2, d:2, turn:true, job:{ type:'craft' },
    use:'Forgeron : outils et armes en cuivre, bronze, fer et acier (métaux de la fonderie)' },
  { id:'archerie',   cat:'ind', name:'Archerie',              f:2, d:2, turn:true, job:{ type:'craft' },
    use:'Fléchier : arcs, arbalètes et flèches de tous les matériaux' },
  { id:'armurerie',  cat:'ind', name:'Armurerie',             f:2, d:2, turn:true, job:{ type:'craft' },
    use:'Armurier : boucliers et armures' },
  { id:'cordonnerie', cat:'ind', name:'Atelier de cordonnier', f:2, d:2, turn:true, job:{ type:'craft' },
    use:'Fabrique des chaussures avec des peaux (file de production)' },
  { id:'couture',    cat:'ind', name:'Atelier de tailleur',   f:2, d:2, turn:true, job:{ type:'craft' },
    use:'Fabrique des vêtements avec de la laine (file de production)' },
  { id:'brasserie',  cat:'ind', name:'Brasserie',             f:2, d:3, turn:true, job:{ type:'craft' },
    use:'Brasse de la bière avec du grain (file de production ; la taverne en a besoin)' },
);

// Charbonnier : transforme le bois en charbon de bois (forge et fonderie en ont besoin)
PRESETS.push(
  { id:'hutte_charbonnier', zone:true, cat:'ind', name:'Hutte du charbonnier', f:2, d:2, turn:true, ownShadow:true, radius:60, need:'forest', job:{ type:'craft' },
    use:'Abat du bois dans sa zone, le stocke, puis le brûle en grande quantité en charbon de bois, gardé sur place pour la forge et la fonderie (ni la grange ni l’entrepôt n’y touchent)' },
);

// Métallurgie (outils.js : FUSIONS) : minerai → métal, cuivre + étain → bronze ; fer → acier avec le haut fourneau (amélioration)
PRESETS.push(
  { id:'fonderie', cat:'ind', name:'Fonderie', f:2, d:3, turn:true, job:{ type:'craft' },
    use:'Fait fondre les minerais en métaux (fer, cuivre, étain, plomb, argent, or), allie cuivre et étain en bronze ; le haut fourneau (amélioration) donne l’acier' },
);

/* Agriculture. Les bâtiments ont un métier (job) : aller travailler les terres autour
   d'eux (site) ou aller chercher une matière chez un autre bâtiment (fetch), puis
   rapporter et stocker leur produit. */
PRESETS.push(
  { id:'ferme',    cat:'agri', name:'Ferme',    f:3, d:4, turn:true, job:{ type:'site', on:'champ', reach:250, work:4, product:'grain' },
    use:'Cultive des céréales sur des champs (zones entourées de routes, outil Champ) et élève des animaux capturés dans son extension (une seule : jardin, verger ou enclos, sur tout l’espace libre)' },
  { id:'bergerie', cat:'agri', name:'Bergerie', f:2, d:3, turn:true, job:{ type:'site', on:'paturage', reach:250, work:3, product:'laine' },
    use:'Récolte la laine des moutons qui paissent autour de la bergerie (ou au parc d’un comptoir de bétail)' },
  { id:'moulin',   cat:'agri', name:'Moulin à vent', f:2, d:2, turn:true, job:{ type:'craft' },
    use:'Transforme le grain en farine (file de production)' },
  { id:'fromagerie', cat:'agri', name:'Fromagerie', f:2, d:3, turn:true, job:{ type:'craft' },
    use:'Transforme le lait des fermes en fromages (frais, pâte molle, pâte pressée) : caillage, décaillage, égouttage, salage, puis affinage en cave (file de production)' },
  { id:'four',     cat:'agri', name:'Four communal', f:2, d:2, turn:true, job:{ type:'craft' },
    use:'Transforme la farine en pain (file de production)' },
);
/* Coût de construction (ressources du village) et stock donné par le camp de colon.
   Le stock du village est S.stock { ressource: quantité } ; le camp le remplit une fois, à sa pose. */
const COUTS = {
  maison:{ bois:10 }, maison_cour:{ bois:25 }, grande_maison:{ bois:40, planches:10 }, manoir:{ bois:60, planches:40, pierre:30 }, mairie:{ bois:50, planches:30, pierre:20 },
  puits:{ pierre:15 }, marche:{ bois:40, planches:10 }, taverne:{ bois:35, planches:15 }, eglise:{ bois:60, planches:30, pierre:20 }, cimetiere:{ pierre:10 },
  camp_bucherons:{ bois:15 }, loge_bucheron:{ bois:8 }, hutte_forestier:{ bois:6 }, camp_chasse:{ bois:12 }, hutte_cueillette:{ bois:8 }, rucher:{ bois:5 },
  tailleur_pierre:{ bois:15 }, fromagerie:{ bois:35, pierre:15 }, hutte_charbonnier:{ bois:30 }, cabane_peche:{ bois:20 }, fosse_miniere:{ bois:25 }, camp_mineur:{ bois:25, pierre:10 }, scierie:{ bois:40, pierre:10 }, fonderie:{ bois:50, pierre:40 }, menuiserie:{ bois:40, planches:10 }, forge:{ bois:30, pierre:30 }, archerie:{ bois:35, planches:10 }, armurerie:{ bois:30, pierre:30, planches:10 }, cordonnerie:{ bois:30 }, couture:{ bois:30 }, brasserie:{ bois:40, pierre:10 },
  grange:{ bois:30 }, entrepot:{ bois:40, planches:10 }, relais:{ bois:20 }, poteau:{ bois:5 }, comptoir:{ bois:30, planches:10 }, comptoir_betail:{ bois:40 },
  ferme:{ bois:30 }, bergerie:{ bois:25 }, moulin:{ bois:30, pierre:15 }, four:{ bois:5, pierre:20 },
};
PRESETS.forEach(p => { if (COUTS[p.id]) p.cout = COUTS[p.id]; });
const STOCK_DEPART = { silex:60, 'charbon de bois':20, bois:150, planches:20, pierre:40, corde:20, 'hache (silex)':2, 'pioche (silex)':2, 'pelle (silex)':1, 'houe (silex)':1, 'faux (silex)':1, 'serpe (silex)':1, 'couteau (silex)':1, 'faucille (silex)':1, 'canne à pêche (bois)':1, légumes:40, pain:30, pommes:20 };   // (outils primitifs de départ ; corde : pas encore produite)
const CONSTRUCTION_GRATUITE = true;   // provisoire (tests) : construire ne coûte rien et n'exige aucune ressource ; remettre à false pour réactiver les coûts
const coutTexte = cout => Object.entries(cout || {}).map(([k, q]) => q + ' ' + k).join(', ');
// ce qui manque au village pour payer ce coût (texte), ou null
function manque(cout) {
  const st = typeof stockVillage === 'function' ? stockVillage() : (S.stock || {});   // tout le stock du village
  const m = Object.entries(cout || {}).filter(([k, q]) => (st[k] || 0) < q).map(([k, q]) => (q - (st[k] || 0)) + ' ' + k);
  return m.length ? 'Il manque ' + m.join(', ') : null;
}
const buildingOf = h => PRESETS.find(p => p.id === h.kind) || null;

/* Menus de construction de la capitale (onglet Construction) : catégorie → bâtiments, dans
   l'ordre d'affichage. Un bâtiment absent de ces listes n'est pas proposé au joueur.
   Défense : les outils de fortification (muraille, tour, porte), pas des bâtiments. */
const BUILD_MENUS = [
  { id:'recolte',     name:'Récolte',     ids:['camp_bucherons', 'loge_bucheron', 'hutte_forestier', 'camp_chasse', 'hutte_cueillette', 'rucher', 'cabane_peche', 'tailleur_pierre', 'fosse_miniere', 'camp_mineur'] },
  { id:'stockage',    name:'Stockage',    ids:['grange', 'entrepot', 'relais', 'poteau', 'comptoir', 'comptoir_betail'] },
  { id:'residentiel', name:'Résidentiel', ids:['camp_colon', 'maison', 'maison_cour', 'grande_maison', 'manoir', 'mairie', 'marche', 'taverne', 'eglise'] },
  { id:'agriculture', name:'Agriculture', tools:[['champ', 'Champ']], ids:['ferme', 'bergerie', 'fromagerie'] },
  { id:'industrie',   name:'Industrie',   ids:['scierie', 'hutte_charbonnier', 'fonderie', 'menuiserie', 'forge', 'archerie', 'armurerie', 'cordonnerie', 'couture', 'brasserie', 'moulin', 'four'] },
  { id:'decoratif',   name:'Décoratif',   ids:['puits', 'cimetiere'] },
  { id:'defense',     name:'Défense',     tools:[['wall', 'Fortification'], ['tower', 'Tour'], ['gate', 'Porte']] },
];
