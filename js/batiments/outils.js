/* ---------- progression des outils et armes (système générique) ----------
   Bois / silex → cuivre → bronze → fer → acier. On ne définit PAS une recette par objet : un objet (OBJETS) dit de quoi il est fait (nombre d'unités de tête, de manche, de
   liant, matériaux possibles, atelier) et un matériau (MATERIAUX) dit ce qui le compose et ses multiplicateurs ; recette(objet, matériau) calcule le reste (coût, durabilité,
   efficacité, dégâts). Pour ajouter un outil, une arme ou un matériau : une ligne dans OBJETS ou MATERIAUX.
   Un objet fabriqué est un article du stock nommé « hache (bronze) », « flèche (silex) »… Les objets restent dans l'atelier qui les a faits (compté dans le stock du village).
   Métallurgie (FUSIONS, fonderie) : minerai → métal, cuivre + étain → bronze, fer → acier (acier : fonderie améliorée en haut fourneau).
   Règle : sans outil adapté dans le stock (OUTIL_DE), un bâtiment ne travaille pas ; le meilleur outil du stock accélère le travail.
   ponytail: la durabilité est une donnée, pas encore une usure ; les objets ne sont pas encore ramassés par l'entrepôt. */
const MATERIAUX = {
  bois:     { label:'bois',     niv:0, tete:'bois',     eff:.9,  dur:.6, deg:.7 },
  primitif: { label:'silex',    niv:0, tete:'silex',     eff:1,   dur:1,  deg:1 },
  renforce: { label:'renforcé', niv:0, tete:'planches', eff:1,   dur:1.6, deg:1 },
  cuivre:   { label:'cuivre',   niv:1, tete:'cuivre',   eff:1.3, dur:1.6, deg:1.3 },
  bronze:   { label:'bronze',   niv:2, tete:'bronze',   eff:1.6, dur:2.5, deg:1.7 },
  fer:      { label:'fer',      niv:3, tete:'fer',      eff:2,   dur:4,   deg:2.2 },
  acier:    { label:'acier',    niv:4, tete:'acier',    eff:2.6, dur:6,   deg:3 },
};
const TOUS = ['primitif', 'cuivre', 'bronze', 'fer', 'acier'];
/* tete : unités de matériau (pierre, cuivre…) ; manche : bois ; liant : corde (version primitive seulement, sauf corde:1 toujours) ; plus : ajouts pour les versions métalliques ;
   qte : exemplaires par fabrication ; atelier : l'atelier des versions métalliques (les versions primitives se font aussi chez le menuisier). */
const OBJETS = {
  hache:    { nom:'Hache',        type:'outil',     arme:true, mats:TOUS, atelier:'forge', tete:2, manche:1, liant:1, dur:100, eff:1, deg:10 },
  pioche:   { nom:'Pioche',       type:'outil',     mats:TOUS, atelier:'forge', tete:3, manche:1, liant:1, dur:100, eff:1, deg:6 },
  houe:     { nom:'Houe',         type:'outil',     mats:TOUS, atelier:'forge', tete:2, manche:1, liant:1, dur:90,  eff:1, deg:4 },
  pelle:    { nom:'Pelle',        type:'outil',     mats:TOUS, atelier:'forge', tete:2, manche:1, liant:1, dur:90,  eff:1, deg:3 },
  faucille: { nom:'Faucille',     type:'outil',     mats:TOUS, atelier:'forge', tete:1, manche:1, liant:1, dur:70,  eff:1, deg:4 },
  faux:     { nom:'Faux',         type:'outil',     mats:TOUS, atelier:'forge', tete:2, manche:2, liant:1, dur:90,  eff:1, deg:7 },
  serpe:    { nom:'Serpe',        type:'outil',     mats:TOUS, atelier:'forge', tete:1, manche:1, liant:1, dur:80,  eff:1, deg:6 },
  marteau:  { nom:'Marteau',      type:'outil',     arme:true, mats:TOUS, atelier:'forge', tete:2, manche:1, liant:1, dur:110, eff:1, deg:9 },
  couteau:  { nom:'Couteau',      type:'outil',     mats:TOUS, atelier:'forge', tete:1, manche:1, liant:1, dur:70,  eff:1, deg:5 },
  canne:    { nom:'Canne à pêche', type:'outil',    mats:['bois', 'fer'], atelier:'forge', tete:1, manche:2, corde:1, dur:60, eff:1, deg:0 },
  arc:      { nom:'Arc',          type:'arme',      mats:['bois'], atelier:'archerie', tete:0, manche:2, corde:1, dur:80, eff:1, deg:8, portee:true },
  arbalete: { nom:'Arbalète',     type:'arme',      mats:['bronze', 'fer', 'acier'], atelier:'archerie', tete:2, manche:2, corde:1, dur:120, eff:1, deg:14, portee:true },
  fleche:   { nom:'Flèche',       type:'munition',  mats:['bois', ...TOUS], atelier:'archerie', tete:1, manche:1, qte:5, dur:1, eff:1, deg:6, portee:true },
  gourdin:  { nom:'Gourdin',      type:'arme',      mats:['bois'], atelier:'menuiserie', tete:0, manche:3, dur:50, eff:1, deg:6 },
  dague:    { nom:'Dague',        type:'arme',      mats:TOUS, atelier:'forge', tete:1, manche:1, liant:1, dur:70, eff:1, deg:8 },
  epee:     { nom:'Épée',         type:'arme',      mats:['cuivre', 'bronze', 'fer', 'acier'], atelier:'forge', tete:3, manche:1, dur:120, eff:1, deg:16 },
  masse:    { nom:'Masse',        type:'arme',      mats:TOUS, atelier:'forge', tete:3, manche:2, liant:1, dur:110, eff:1, deg:12 },
  lance:    { nom:'Lance',        type:'arme',      mats:TOUS, atelier:'forge', tete:2, manche:2, liant:1, dur:90,  eff:1, deg:11 },
  pique:    { nom:'Pique',        type:'arme',      mats:TOUS, atelier:'forge', tete:2, manche:3, liant:1, dur:90,  eff:1, deg:10 },
  javelot:  { nom:'Javelot',      type:'arme',      mats:TOUS, atelier:'forge', tete:1, manche:2, liant:1, dur:40,  eff:1, deg:9, portee:true },
  bouclier: { nom:'Bouclier',     type:'bouclier',  mats:['bois', 'renforce', 'cuivre', 'fer', 'acier'], atelier:'armurerie', tete:4, manche:0, plus:{ planches:3 }, dur:100, eff:1, deg:0 },
  armure:   { nom:'Armure',       type:'armure',    mats:['cuivre', 'bronze', 'fer', 'acier'], atelier:'armurerie', tete:6, manche:0, plus:{ peaux:4 }, dur:200, eff:1, deg:0 },
};
const TYPES_OBJET = { materiau:'Matériaux', fromage:'Fromages', vehicule:'Véhicules', piece:'Pièces', outil:'Outils', arme:'Armes', munition:'Munitions', bouclier:'Boucliers', armure:'Armures' };
const nomObjet = (o, m) => o.nom.toLowerCase() + ' (' + MATERIAUX[m].label + ')';   // l'article du stock
function recette(objId, matId) {
  const o = OBJETS[objId], m = MATERIAUX[matId], cout = {}, add = (k, q) => { if (q) cout[k] = (cout[k] || 0) + q; };
  add(m.tete, o.tete); add('bois', o.manche);
  if (m.niv === 0 && matId !== 'renforce' && o.liant) add('corde', o.liant);
  if (o.corde) add('corde', o.corde);
  if (m.niv >= 1 || matId === 'renforce') for (const [k, q] of Object.entries(o.plus || {})) add(k, q);
  if (m.niv >= 1) add('charbon de bois', m.niv);                                     // les métaux se travaillent au charbon de bois
  const prim = m.niv === 0;
  return { id:objId + ':' + matId, objet:objId, mat:matId, nom:nomObjet(o, matId), type:o.type, cout, qte:o.qte || 1, tps:6 + m.niv * 2,
    ateliers:prim ? (o.atelier === 'forge' || o.atelier === 'menuiserie' ? ['menuiserie'] : ['menuiserie', o.atelier]) : [o.atelier],   // la forge ne fait QUE le métal : le primitif (silex + bois) et le bois sont au menuisier
    dur:Math.round(o.dur * m.dur), eff:Math.round(o.eff * m.eff * 100) / 100, deg:Math.round(o.deg * m.deg * 10) / 10 };
}
// la corde (liant des versions primitives) : fibres tirées de l'écorce, au menuisier
const CORDE = { id:'corde', nom:'corde', type:'materiau', cout:{ fibres:3 }, sort:{ corde:3 }, qte:3, tps:5, ateliers:['menuiserie'] };
// objets en bois du menuisier : véhicules et pièces (les charrettes sont ensuite posées sur les exploitations : fiche > charrettes)
const CHARRETTE = { id:'charrette', nom:'charrette à main', type:'vehicule', cout:{ bois:20, corde:2 }, sort:{ 'charrette à main':1 }, qte:1, tps:14, ateliers:['menuiserie'], dur:200, eff:1, deg:0 };
const CHARIOT = { id:'chariot', nom:'chariot', type:'vehicule', cout:{ bois:40, planches:20, corde:4 }, sort:{ chariot:1 }, qte:1, tps:20, ateliers:['menuiserie'], dur:300, eff:1, deg:0 };
const MANCHE = { id:'manche', nom:"manche d'outil", type:'piece', cout:{ bois:1 }, sort:{ "manche d'outil":3 }, qte:3, tps:4, ateliers:['menuiserie'], dur:60, eff:1, deg:0 };
const RECETTES = [CORDE, CHARRETTE, CHARIOT, MANCHE, ...Object.keys(OBJETS).flatMap(k => OBJETS[k].mats.map(m => recette(k, m)))];
const recetteDe = id => RECETTES.find(r => r.id === id) || null;
// métallurgie : id, entrées (coût), sorties, temps ; niv : niveau de fonderie requis (l'acier : haut fourneau)
/* Les minerais se comptent au KILO (1 unité = 1 kg). Une remontée de la mine donne MINERAI_KG kg de minerai (4 : l'ancienne unité) ; une fonte consomme 2 × MINERAI_KG kg de minerai pour un lingot (4 kg). */
const MINERAI_KG = 4, remontee = k => k.startsWith('minerai') ? MINERAI_KG : 1;
const FUSIONS = [
  { id:'fer',    nom:'Fer',    cout:{ 'minerai de fer':2 * MINERAI_KG, 'charbon de bois':2 },    sort:{ fer:1 },    tps:8 },
  { id:'cuivre', nom:'Cuivre', cout:{ 'minerai de cuivre':2 * MINERAI_KG, 'charbon de bois':2 }, sort:{ cuivre:1 }, tps:8 },
  { id:'etain',  nom:'Étain',  cout:{ "minerai d'étain":2 * MINERAI_KG, 'charbon de bois':2 },   sort:{ 'étain':1 }, tps:8 },
  { id:'plomb',  nom:'Plomb',  cout:{ 'minerai de plomb':2 * MINERAI_KG, 'charbon de bois':2 },  sort:{ plomb:1 },  tps:8 },
  { id:'argent', nom:'Argent', cout:{ "minerai d'argent":2 * MINERAI_KG, 'charbon de bois':2 },  sort:{ argent:1 }, tps:8 },
  { id:'or',     nom:'Or',     cout:{ "minerai d'or":2 * MINERAI_KG, 'charbon de bois':2 },      sort:{ or:1 },     tps:8 },
  { id:'bronze', nom:'Bronze (cuivre + étain)', cout:{ cuivre:3, 'étain':1, 'charbon de bois':1 }, sort:{ bronze:4 }, tps:10 },
  { id:'acier',  nom:'Acier (fer)', cout:{ fer:2, 'charbon de bois':3 }, sort:{ acier:1 }, tps:14, niv:1 },
].map(f => ({ ...f, id:'fusion:' + f.id }));
const fusionDe = id => FUSIONS.find(f => f.id === id) || null;
// ce que livre un gisement (S.deposits[].kind) : minerai, ou matière brute
const ORE = { pierre:'pierre', silex:'silex', fer:'minerai de fer', cuivre:'minerai de cuivre', etain:"minerai d'étain", plomb:'minerai de plomb', argent:"minerai d'argent", or:"minerai d'or", sel:'sel', alun:'alun', ambre:'ambre' };
/* RÈGLE : pour travailler, un bâtiment doit disposer d'au moins un outil adapté (OUTIL_DE) dans le stock du village ; sans lui, il s'arrête (l'ouvrier attend).
   Le meilleur outil du stock accélère ensuite le travail (efficacité). Clé : l'atelier ou le bâtiment (producerId : kind, ou extension d'arrière-cour). */
const OUTIL_DE = { camp_bucherons:'hache', loge_bucheron:'hache', tailleur_pierre:'pioche', fosse_miniere:'pioche', ferme:'faux', bergerie:'couteau', cabane_peche:'canne' };
const outilDe = h => h.kind === 'loge_bucheron' && typeof actDe === 'function' && actDe(h) === 'ramasser' ? null : h.kind === 'hutte_forestier' ? (typeof actDe === 'function' && actDe(h) === 'germiner' ? null : (typeof actDe === 'function' ? actDe(h) === 'planter' : h.mode === 'planter') ? 'pelle' : 'serpe') : OUTIL_DE[producerId(h)];   // forestier : serpe pour cueillir, pelle pour planter
function meilleurOutilDe(t) {
  if (!t) return null;
  const st = typeof stockVillage === 'function' ? stockVillage() : {};
  let best = null;
  for (const m of OBJETS[t].mats) { const r = recette(t, m); if (((st[r.nom] || 0) + (st[r.nom.replace('(silex)', '(pierre)')] || 0)) > 0 && (!best || r.eff > best.eff)) best = r; }   // (anciens noms « (pierre) » encore dans une partie enregistrée)
  return best;
}
const meilleurOutil = h => meilleurOutilDe(outilDe(h));
const outilManque = h => { const t = outilDe(h); return t && !meilleurOutil(h) ? OBJETS[t].nom.toLowerCase() : null; };
const outilManqueDe = t => t && !meilleurOutilDe(t) ? OBJETS[t].nom.toLowerCase() : null;   // nom de l'outil qui manque, ou null
const efficaciteOutil = h => { const b = meilleurOutil(h); return b ? b.eff : 1; };
// recettes qu'un bâtiment peut fabriquer (id du bâtiment : forge, menuiserie, archerie, armurerie ; 'fonderie' : les fusions, selon son niveau)
const recettesDe = (atelier, niveau = 0) => atelier === 'fonderie' ? FUSIONS.filter(f => (f.niv || 0) <= niveau) : RECETTES.filter(r => r.ateliers.includes(atelier));
