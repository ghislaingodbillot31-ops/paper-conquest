/* ---------- cultures : saisons, pousse et récolte (système réel) ----------
   Légumes et céréales : on les plante au bon moment de l'année (mois de plantation), ils poussent un certain temps (pousse, en jours de jeu), puis ne se récoltent que pendant les
   mois de récolte, pendant une fenêtre limitée (fenetre, en jours) : passé ce délai, ce qui n'a pas été récolté est perdu. Fruits d'arbres : pas de plantation, ils ne sont mûrs
   que pendant les mois de récolte ; une fois récoltés (ou la saison passée), il n'y a plus rien sur l'arbre jusqu'à l'année suivante.
   Une culture : { nom, type:'legume'|'cereale'|'fruit', produit (article du stock), plantation:[mois début, mois fin] | null, recolte:[mois début, mois fin],
   pousse (jours de jeu), fenetre (jours de jeu), rendement (unités par saison et par bâtiment), cadence (secondes par unité récoltée par un potager ou un verger) }.
   Mois de 1 (janvier) à 12 ; une plage qui passe l'an (ex. 11 à 2) est permise. 1 mois de jeu = 24 h réelles (saisons.js).
   Les valeurs se modifient dans le dashboard développeur (editeur-cultures.html, ou le bouton Cultures du test jeu) : « Valider » les enregistre (clé cultures.v1) et le jeu les prend
   en compte aussitôt, y compris dans les autres onglets ouverts. Le tableau de référence est dans Notion (CULTURES ET SAISONS). */
const CULTURES_CLE = 'cultures.v1';
const MOIS_C = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const CULTURES_DEFAUT = {
  // légumes (potager)
  pomme_de_terre: { nom:'Pomme de terre', type:'legume', produit:'pommes de terre', plantation:[3, 5],  recolte:[7, 9],   pousse:100, fenetre:40, rendement:24, cadence:6 },
  carotte:        { nom:'Carotte',        type:'legume', produit:'carottes',        plantation:[3, 7],  recolte:[6, 10],  pousse:80,  fenetre:50, rendement:24, cadence:6 },
  chou:           { nom:'Chou',           type:'legume', produit:'choux',           plantation:[4, 6],  recolte:[9, 11],  pousse:110, fenetre:45, rendement:20, cadence:6 },
  poireau:        { nom:'Poireau',        type:'legume', produit:'poireaux',        plantation:[3, 6],  recolte:[9, 12],  pousse:120, fenetre:60, rendement:24, cadence:6 },
  oignon:         { nom:'Oignon',         type:'legume', produit:'oignons',         plantation:[2, 4],  recolte:[7, 8],   pousse:120, fenetre:35, rendement:24, cadence:6 },
  ail:            { nom:'Ail',            type:'legume', produit:'ail',             plantation:[10, 11], recolte:[6, 7],  pousse:240, fenetre:35, rendement:20, cadence:6 },
  haricot:        { nom:'Haricot',        type:'legume', produit:'haricots',        plantation:[5, 6],  recolte:[8, 9],   pousse:70,  fenetre:35, rendement:20, cadence:6 },
  petit_pois:     { nom:'Petit pois',     type:'legume', produit:'petits pois',     plantation:[3, 5],  recolte:[6, 7],   pousse:70,  fenetre:30, rendement:18, cadence:6 },
  navet:          { nom:'Navet',          type:'legume', produit:'navets',          plantation:[7, 9],  recolte:[10, 12], pousse:60,  fenetre:50, rendement:22, cadence:6 },
  salade:         { nom:'Salade',         type:'legume', produit:'salades',         plantation:[3, 9],  recolte:[5, 10],  pousse:50,  fenetre:30, rendement:18, cadence:6 },
  courge:         { nom:'Courge',         type:'legume', produit:'courges',         plantation:[5, 6],  recolte:[9, 10],  pousse:110, fenetre:50, rendement:16, cadence:6 },
  // céréales (ferme)
  ble:            { nom:'Blé',            type:'cereale', produit:'grain',          plantation:[10, 11], recolte:[7, 8],  pousse:270, fenetre:30, rendement:60, cadence:6 },
  orge:           { nom:'Orge',           type:'cereale', produit:'grain',          plantation:[3, 4],  recolte:[7, 8],   pousse:120, fenetre:30, rendement:55, cadence:6 },
  avoine:         { nom:'Avoine',         type:'cereale', produit:'grain',          plantation:[3, 4],  recolte:[8, 9],   pousse:130, fenetre:30, rendement:55, cadence:6 },
  seigle:         { nom:'Seigle',         type:'cereale', produit:'grain',          plantation:[9, 10], recolte:[7, 8],   pousse:290, fenetre:30, rendement:50, cadence:6 },
  // fruits d'arbres (verger ; mêmes noms que les arbres de la carte)
  pommier:        { nom:'Pommier',        type:'fruit', produit:'pommes',     plantation:null, recolte:[9, 10],  pousse:0, fenetre:40, rendement:40, cadence:6 },
  poirier:        { nom:'Poirier',        type:'fruit', produit:'poires',     plantation:null, recolte:[8, 10],  pousse:0, fenetre:40, rendement:36, cadence:6 },
  cerisier:       { nom:'Cerisier',       type:'fruit', produit:'cerises',    plantation:null, recolte:[6, 7],   pousse:0, fenetre:25, rendement:30, cadence:6 },
  prunier:        { nom:'Prunier',        type:'fruit', produit:'prunes',     plantation:null, recolte:[8, 9],   pousse:0, fenetre:30, rendement:34, cadence:6 },
  pecher:         { nom:'Pêcher',         type:'fruit', produit:'pêches',     plantation:null, recolte:[7, 9],   pousse:0, fenetre:35, rendement:30, cadence:6 },
  abricotier:     { nom:'Abricotier',     type:'fruit', produit:'abricots',   plantation:null, recolte:[6, 8],   pousse:0, fenetre:30, rendement:30, cadence:6 },
  cognassier:     { nom:'Cognassier',     type:'fruit', produit:'coings',     plantation:null, recolte:[10, 11], pousse:0, fenetre:35, rendement:24, cadence:6 },
  figuier:        { nom:'Figuier',        type:'fruit', produit:'figues',     plantation:null, recolte:[8, 9],   pousse:0, fenetre:30, rendement:28, cadence:6 },
  olivier:        { nom:'Olivier',        type:'fruit', produit:'olives',     plantation:null, recolte:[11, 12], pousse:0, fenetre:45, rendement:40, cadence:6 },
  oranger:        { nom:'Oranger',        type:'fruit', produit:'oranges',    plantation:null, recolte:[12, 3],  pousse:0, fenetre:60, rendement:36, cadence:6 },
  citronnier:     { nom:'Citronnier',     type:'fruit', produit:'citrons',    plantation:null, recolte:[11, 3],  pousse:0, fenetre:60, rendement:30, cadence:6 },
  grenadier:      { nom:'Grenadier',      type:'fruit', produit:'grenades',   plantation:null, recolte:[10, 11], pousse:0, fenetre:35, rendement:24, cadence:6 },
  amandier:       { nom:'Amandier',       type:'fruit', produit:'amandes',    plantation:null, recolte:[8, 9],   pousse:0, fenetre:35, rendement:30, cadence:6 },
  noyer:          { nom:'Noyer',          type:'fruit', produit:'noix',       plantation:null, recolte:[9, 10],  pousse:0, fenetre:40, rendement:36, cadence:6 },
  noisetier:      { nom:'Noisetier',      type:'fruit', produit:'noisettes',  plantation:null, recolte:[9, 10],  pousse:0, fenetre:40, rendement:30, cadence:6 },
  chataignier:    { nom:'Châtaignier',    type:'fruit', produit:'châtaignes', plantation:null, recolte:[10, 11], pousse:0, fenetre:40, rendement:36, cadence:6 },
  murier:         { nom:'Mûrier',         type:'fruit', produit:'mûres',      plantation:null, recolte:[6, 8],   pousse:0, fenetre:30, rendement:24, cadence:6 },
  dattier:        { nom:'Dattier',        type:'fruit', produit:'dattes',     plantation:null, recolte:[10, 12], pousse:0, fenetre:50, rendement:40, cadence:6 },
  neflier:        { nom:'Néflier',        type:'fruit', produit:'nèfles',     plantation:null, recolte:[11, 12], pousse:0, fenetre:30, rendement:20, cadence:6 },
  sorbier:        { nom:'Sorbier',        type:'fruit', produit:'sorbes',     plantation:null, recolte:[9, 10],  pousse:0, fenetre:30, rendement:20, cadence:6 },
};
const CULTURES = {};
function chargerCultures() {
  for (const k of Object.keys(CULTURES)) delete CULTURES[k];
  for (const [k, c] of Object.entries(CULTURES_DEFAUT)) CULTURES[k] = JSON.parse(JSON.stringify(c));
  try { const o = JSON.parse(localStorage.getItem(CULTURES_CLE) || '{}'); for (const k in o) CULTURES[k] = { ...(CULTURES[k] || {}), ...o[k] }; } catch (e) {}
  if (typeof FOOD_LIST !== 'undefined') for (const c of Object.values(CULTURES)) if (c.type !== 'cereale' && !FOOD_LIST.includes(c.produit)) FOOD_LIST.push(c.produit);   // les grange ramassent les légumes et fruits
}
function sauverCultures(liste) { try { localStorage.setItem(CULTURES_CLE, JSON.stringify(liste || CULTURES)); return true; } catch (e) { return false; } }
chargerCultures();
addEventListener('storage', e => { if (e.key === CULTURES_CLE) chargerCultures(); });   // validé dans le dashboard (autre onglet ou cadre) : pris en compte aussitôt
// ---- calendrier ----
const moisDans = (m, p) => !p ? false : p[0] <= p[1] ? m >= p[0] && m <= p[1] : m >= p[0] || m <= p[1];
const MJ_C = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function jourJeu() {                                                         // jours de jeu écoulés (continu) : l'horloge de saisons.js, sinon le calendrier réel
  if (typeof TEMPS !== 'undefined' && typeof JOUR_MS !== 'undefined') return TEMPS.j0 + (Date.now() - TEMPS.debut) / JOUR_MS;
  const n = new Date(); return MJ_C.slice(0, n.getUTCMonth()).reduce((a, b) => a + b, 0) + n.getUTCDate() - 1;
}
const moisDeJour = j => { let d = Math.floor(j % 365), m = 0; while (m < 11 && d >= MJ_C[m]) { d -= MJ_C[m]; m++; } return m + 1; };   // 1 à 12
// ---- cycle d'une culture : ferme (céréales) ou extension de ferme (jardin : légumes ; verger : fruits) ----
// un « porteur » p a { culture, cul } : la ferme elle-même, ou une extension de ferme { k, culture, cul }
const CULTURE_DEFAUT = { ferme:'ble', jardin:'carotte', verger:'pommier' }, CULTURE_TYPE = { ferme:'cereale', jardin:'legume', verger:'fruit' };
const cultivee = h => h.kind === 'ferme';                                   // la ferme cultive des céréales (ses extensions : voir FERME_EXT)
const cultureId = (p, type = CULTURE_TYPE[p.kind], def = CULTURE_DEFAUT[p.kind]) => { const c = CULTURES[p.culture]; return c && c.type === type ? p.culture : def; };
const cultureDe = (p, type = CULTURE_TYPE[p.kind], def = CULTURE_DEFAUT[p.kind]) => CULTURES[cultureId(p, type, def)] || null;
/* p.cul : { id, etat:'attente'|'pousse'|'mur'|'recolte'|'perdu', plante (jour), reste (unités à récolter), finMur (jour), an } ; change de culture : on repart à zéro.
   peutPlanter : faux s'il manque l'outil adapté (on ne plante pas sans outil). */
function cultureTick(p, type = CULTURE_TYPE[p.kind], def = CULTURE_DEFAUT[p.kind], peutPlanter = true, echelle = 1) {   // echelle : multiplie le rendement (ferme : surface des champs / AIRE_REF)
  const c = cultureDe(p, type, def); if (!c) return null;
  const id = cultureId(p, type, def); if (!p.cul || p.cul.id !== id) p.cul = { id, etat:'attente', plante:null, reste:0, finMur:0, an:-1 };
  const cul = p.cul, avant = cul.etat, j = jourJeu(), m = moisDeJour(j), an = Math.floor(j / 365), fruit = c.type === 'fruit', enRecolte = moisDans(m, c.recolte);
  if (cul.etat === 'attente') {
    if (fruit) { if (enRecolte && cul.an !== an) { cul.an = an; cul.reste = Math.max(1, Math.round(c.rendement * echelle)); cul.finMur = j + c.fenetre; cul.etat = 'mur'; } }   // les fruits mûrissent à la saison
    else if (moisDans(m, c.plantation) && peutPlanter) { cul.plante = j; cul.etat = 'pousse'; }                                              // on plante au bon mois (il faut l'outil adapté)
  } else if (cul.etat === 'pousse') {
    if (j - cul.plante >= c.pousse && enRecolte) { cul.reste = Math.max(1, Math.round(c.rendement * echelle)); cul.finMur = j + c.fenetre; cul.etat = 'mur'; }
  } else if (cul.etat === 'mur') {
    if (cul.reste <= 0) cul.etat = 'recolte';                                                                                                // tout est récolté : plus rien sur l'arbre ou au champ
    else if (j > cul.finMur || !enRecolte) { cul.etat = 'perdu'; cul.reste = 0; }                                                            // trop tard : perdu
  } else if (!enRecolte) cul.etat = 'attente';                                                                                               // récolté ou perdu : on attend la saison suivante
  if (cul.etat !== avant && typeof save === 'function') save();
  return cul;
}
// fruits d'un arbre de la carte : mûrs (visibles) seulement pendant les mois de récolte de son espèce
function fruitsSurArbre(a) {
  const c = Object.values(CULTURES).find(x => x.type === 'fruit' && x.nom === a.nom);
  return !c || moisDans(moisDeJour(jourJeu()), c.recolte);
}
const plageTexte = p => !p ? '-' : p[0] === p[1] ? MOIS_C[p[0] - 1] : MOIS_C[p[0] - 1] + ' à ' + MOIS_C[p[1] - 1];
function cultureTexte(p, type = CULTURE_TYPE[p.kind], def = CULTURE_DEFAUT[p.kind]) {
  const c = cultureDe(p, type, def), cul = p.cul; if (!c) return '';
  const j = jourJeu(), etat = !cul ? 'attente' : cul.etat;
  return { attente:c.type === 'fruit' ? 'attend la saison des fruits' : 'attend la saison de plantation', pousse:cul ? `en croissance (${Math.max(0, Math.ceil(c.pousse - (j - cul.plante)))} j restants)` : '',
    mur:cul ? `mûr : ${Math.ceil(cul.reste)} à récolter (${Math.max(0, Math.ceil(cul.finMur - j))} j pour tout cueillir)` : '', recolte:'récolté : plus rien jusqu’à la prochaine saison', perdu:'récolte perdue (trop tard)' }[etat];
}
