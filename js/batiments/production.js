/* ---------- système de production : file d'attente (générique) ----------
   Tout bâtiment qui fabrique ou transforme des ressources a une LISTE DE PRODUITS (PRODUCTIONS[type de bâtiment] : liste, ou fonction du bâtiment pour les listes qui dépendent de son niveau) et une FILE D'ATTENTE (h.file : les identifiants de
   produits, dans l'ordre). Fiche du bâtiment > Production : chaque produit montre ses ressources et un bouton « Créer » qui ajoute +1 unité à la file.
   - Les productions se font dans l'ordre de la file, une à la fois (stepProduction) ; le bâtiment ne lance une production que si les matériaux sont disponibles dans le stock du village ; ils sont consommés au LANCEMENT ;
     à la fin, le produit est rangé dans le bâtiment (h.inv) et on passe automatiquement au suivant.
   - Matériaux manquants : la production reste en tête de file, une icône d'avertissement le signale, et elle reprend toute seule dès que les matériaux sont là.
   Un produit : { id, nom, cout:{ ressource: quantité }, sort:{ produit: quantité } (sinon qte × nom), tps (secondes), type (rangement dans la liste) }.
   Produit à ÉTAPES (fromagerie) : etapes:[[nom, secondes], …] obligatoires dans l'ordre (stepProduction), puis affinage:{ jours } : le produit passe à la CAVE du bâtiment (h.cave, CAVE_MAX) où il affine pendant ces jours de jeu,
   en parallèle du reste de la file ; il n'est terminé (rangé dans h.inv) qu'à la fin de l'affinage (affinerCave).
   Pour ajouter un produit à un bâtiment : une ligne dans PRODUCTIONS ; pour un nouveau bâtiment de production : son type de job est { type:'craft' } et une entrée dans PRODUCTIONS. Rien d'autre. */
const PRODUCTIONS = {
  menuiserie: h => recettesDe('menuiserie', niveau(h)), forge: h => recettesDe('forge', niveau(h)), archerie: h => recettesDe('archerie', niveau(h)), armurerie: h => recettesDe('armurerie', niveau(h)),
  moulin:[{ id:'farine', nom:'Farine', type:'materiau', cout:{ grain:2 }, sort:{ farine:2 }, tps:8 }],
  four:[{ id:'pain', nom:'Pain', type:'materiau', cout:{ farine:2 }, sort:{ pain:3 }, tps:10 }],
  brasserie:[{ id:'biere', nom:'Bière', type:'materiau', cout:{ grain:3 }, sort:{ 'bière':1 }, tps:15 }],
  cordonnerie:[{ id:'chaussures', nom:'Chaussures', type:'materiau', cout:{ peaux:2 }, sort:{ chaussures:1 }, tps:12 }],
  couture:[{ id:'vetements', nom:'Vêtements', type:'materiau', cout:{ laine:3 }, sort:{ 'vêtements':1 }, tps:12 }],
  /* Fromagerie : lait → caillage (présure, ferments) → décaillage et brassage → égouttage et moulage (pressage pour les pâtes pressées) → salage → affinage à la cave (en jours de jeu). La présure animale se prépare ici. */
  fromagerie:[
    { id:'presure', nom:'Présure animale', type:'materiau', cout:{ viande:1 }, sort:{ 'présure':3 }, tps:6 },
    { id:'fromage_frais', nom:'Fromage frais (jonchée, caillé)', type:'fromage', cout:{ lait:4, 'présure':1 }, sort:{ 'fromage frais':2 }, etapes:[['Caillage', 8], ['Décaillage et brassage', 6], ['Égouttage et moulage', 10], ['Salage', 4]], affinage:{ jours:1 } },
    { id:'pate_molle', nom:'Pâte molle (type Maroilles, Munster)', type:'fromage', cout:{ lait:8, 'présure':1, sel:1 }, sort:{ 'fromage à pâte molle':2 }, etapes:[['Caillage', 10], ['Décaillage et brassage', 8], ['Égouttage et moulage', 12], ['Salage (saumure)', 8]], affinage:{ jours:35 } },
    { id:'pate_pressee_3', nom:'Pâte pressée (type Comté), 3 mois', type:'fromage', cout:{ lait:20, 'présure':2, sel:2 }, sort:{ 'fromage de garde':1 }, etapes:[['Caillage', 12], ['Décaillage et brassage', 10], ['Égouttage et pressage', 16], ['Salage à sec', 8]], affinage:{ jours:90 } },
    { id:'pate_pressee_12', nom:'Pâte pressée (type Beaufort), 12 mois', type:'fromage', cout:{ lait:20, 'présure':2, sel:3 }, sort:{ 'fromage de garde':1 }, etapes:[['Caillage', 12], ['Décaillage et brassage', 10], ['Égouttage et pressage', 16], ['Salage à sec', 8]], affinage:{ jours:365 } },
  ],
  tailleur_pierre:[{ id:'pierre_taillee', nom:'Pierre taillée', type:'materiau', cout:{ pierre:2 }, sort:{ 'pierre taillée':1 }, tps:10 }, { id:'pointes', nom:'Pointes de flèche en silex', type:'materiau', cout:{ silex:1 }, sort:{ 'pointes de flèche':3 }, tps:8 }],
};
/* Fonderie : pas de file d'attente, juste ON / OFF (bouton État de la fiche). Allumée, elle fond en continu tout ce que le stock du village permet (stepFonte), chaque métal ayant son propre ON / OFF (h.fonte) : un lingot à la fois, dans l'ordre des FUSIONS
   (métaux simples, puis les alliages), en consommant le minerai et le charbon de bois ; les métaux sont rangés dans la fonderie. */
const PRODUCTION_AUTO = new Set(['fonderie', 'hutte_charbonnier', 'scierie']);
/* Hutte du charbonnier et scierie : pas de file d'attente non plus, un bouton ON / OFF par produit (h.fonte[id] === false : éteint) : allumée, elle transforme en continu le bois en charbon de bois / en planches (stepAutoSimple). La hutte brûle son propre
   bois (propre) ; la scierie scie le bois de SON stock (rapporté par ses porteurs, comme les matières de tout atelier). */
const AUTO_SIMPLE = { hutte_charbonnier:{ id:'charbon', nom:'Charbon de bois', cout:{ bois:4 }, sort:{ 'charbon de bois':1 }, tps:20, propre:true }, scierie:{ id:'planches', nom:'Planches', cout:{ bois:1 }, sort:{ planches:3 }, tps:6 } };   // propre : le bois vient du stock de la hutte (coupé par ses bûcherons), pas du village
function stepAutoSimple(h, w, dt) {
  const R = AUTO_SIMPLE[h.kind];
  if (w.enCours) { if ((w.t -= dt) > 0) { w.etat = 'fabrique'; return; } h.inv = h.inv || {}; for (const [k, q] of Object.entries(R.sort)) h.inv[k] = (h.inv[k] || 0) + q; w.enCours = false; w.etat = null; save(); }
  if (h.fonte && h.fonte[R.id] === false) { w.etat = 'éteint'; return; }                       // (bouton OFF : la fabrication est arrêtée)
  if (!R.propre && stockPlein(h)) { w.etat = 'plein'; return; }
  if (sortiePleine(h, R.sort)) { w.etat = 'plein'; return; }                                // (le charbon a son maximum)
  if (R.propre ? (h.stock || 0) < R.cout.bois : manqueFonte(h, R.cout)) { w.etat = 'manque'; w.manque = manqueTexteFonte(h, R.cout) || ''; return; }   // (matières du bâtiment : ses porteurs les rapportent)
  if (R.propre) h.stock -= R.cout.bois; else for (const [k, q] of Object.entries(R.cout)) utiliseFonte(h, k, q);
  w.enCours = true; w.tTot = R.tps / Math.max(1, nbTrav(h)); w.t = w.tTot; w.etat = 'fabrique';
}
function stepFonte(h, w, dt) {
  if (AUTO_SIMPLE[h.kind]) return stepAutoSimple(h, w, dt);
  if (w.enCours) { if ((w.t -= dt) > 0) { w.etat = 'fabrique'; return; } const R = fusionDe(w.cur); h.inv = h.inv || {}; if (R) for (const [k, q] of Object.entries(R.sort)) h.inv[k] = (h.inv[k] || 0) + q; w.enCours = false; w.etat = null; save(); }
  const R = recettesDe('fonderie', niveau(h)).find(r => (!h.fonte || h.fonte[r.id] !== false) && !sortiePleine(h, r.sort) && !manqueFonte(h, r.cout));   // (chaque métal a son maximum)   // (fontes éteintes : ignorées ; elle ne fond que ce que ses porteurs ont rapporté)
  if (!R) { w.etat = stockPlein(h) ? 'plein' : nbPorteurs(h) ? 'attend les porteurs' : 'aucun porteur'; return; }                                              // (pas assez de minerai ou de charbon de bois : elle attend)
  for (const [k, q] of Object.entries(R.cout)) utiliseFonte(h, k, q);
  w.enCours = true; w.cur = R.id; w.tTot = R.tps / nbFond(h); w.t = w.tTot; w.etat = 'fabrique';
}
const produitsDe = h => { const p = PRODUCTIONS[h.kind]; return typeof p === 'function' ? p(h) : (p || []); };
const produitDe = (h, id) => produitsDe(h).find(r => r.id === id) || null;
const sortieTexte = r => Object.entries(r.sort || { [r.nom]:r.qte || 1 }).map(([k, q]) => (q > 1 ? q + ' ' : '') + k).join(', ');
const CAVE_MAX = 24;
const dureeEtape = (h, R, i) => (R.etapes ? R.etapes[i][1] : R.tps) / Math.max(1, nbTrav(h));    // (plus d'ouvriers : plus vite)
function affinerCave(h) {                                                                          // les produits de la cave : terminés quand leur affinage est fini
  if (!h.cave || !h.cave.length) return;
  const j = jourJeu(); let fini = false;
  h.cave = h.cave.filter(c => { if (j - c.j0 < c.jours) return true; h.inv = h.inv || {}; for (const [k, q] of Object.entries(c.sort)) h.inv[k] = (h.inv[k] || 0) + q; fini = true; return false; });
  if (fini) save();
}
// un pas de la production d'un bâtiment (w : son ouvrier passif) : lance le produit de tête de file si les matériaux sont là, enchaîne ses étapes, puis le termine
function stepProduction(h, w, dt) {
  affinerCave(h);
  const file = h.file = h.file || [], R = file.length ? produitDe(h, file[0]) : null;
  if (file.length && !R) { file.shift(); w.enCours = false; return; }                         // (produit qui n'existe plus : retiré)
  w.manque = null;
  if (!R) { w.etat = 'file vide'; w.enCours = false; return; }
  if (!w.enCours) {
    if (stockPlein(h)) { w.etat = 'plein'; return; }
    if (R.affinage && (h.cave || []).length >= CAVE_MAX) { w.etat = 'cave pleine'; return; }     // pas de place à l'affinage : la file attend
    const m = manqueTexteFonte(h, R.cout); if (m) { w.etat = 'manque'; w.manque = m; return; }                // (matières du bâtiment : bouton « Remplir le stock »)                // matériaux manquants : reste en tête de file, reprend tout seul
    for (const [k, q] of Object.entries(R.cout)) utiliseFonte(h, k, q);                          // les matériaux sont consommés au lancement
    w.enCours = true; w.etape = 0; w.tTot = dureeEtape(h, R, 0); w.t = w.tTot; w.etat = 'fabrique';
  } else if ((w.t -= dt) <= 0) {
    if (R.etapes && w.etape + 1 < R.etapes.length) { w.etape++; w.tTot = dureeEtape(h, R, w.etape); w.t = w.tTot; w.etat = 'fabrique'; return; }   // étape suivante
    if (R.affinage) (h.cave = h.cave || []).push({ nom:R.nom, sort:R.sort || { [R.nom]:R.qte || 1 }, j0:jourJeu(), jours:R.affinage.jours });         // à la cave : il affine
    else { h.inv = h.inv || {}; for (const [k, q] of Object.entries(R.sort || { [R.nom]:R.qte || 1 })) h.inv[k] = (h.inv[k] || 0) + q; }
    file.shift(); w.enCours = false; w.etat = null; save();
  } else w.etat = 'fabrique';
}
const etapeTexte = (h, R, w) => R && R.etapes && w ? `étape ${(w.etape || 0) + 1}/${R.etapes.length} : ${R.etapes[w.etape || 0][0]}` : '';
// bâtiments qui avaient un stock « produit » (ancien système de transformation) : il passe dans leur contenu, où la production range désormais ses produits
const ANCIEN_PRODUIT = { scierie:'planches', hutte_charbonnier:'charbon de bois', moulin:'farine', four:'pain', brasserie:'bière', cordonnerie:'chaussures', couture:'vêtements' };
setTimeout(() => { try { let n = 0; for (const h of S.houses) { const p = ANCIEN_PRODUIT[h.kind]; if (p && h.stock > 0) { h.inv = h.inv || {}; h.inv[p] = (h.inv[p] || 0) + h.stock; h.stock = 0; n++; } } if (n) save(); } catch (e) {} }, 0);
// minerais au kilo : les stocks enregistrés avant (unités de 4 kg) sont multipliés par 4, une seule fois
setTimeout(() => { try { if (S.minerauxEnKg) return; for (const h of S.houses) for (const m of [h.inv, h.mat]) for (const k of Object.keys(m || {})) if (k.startsWith('minerai')) m[k] = Math.round(m[k] * MINERAI_KG); S.minerauxEnKg = 1; save(); } catch (e) {} }, 0);
// camp de mineur : il ne garde que ce que les mines produisent (un stockage mal rempli par d'anciens trajets est vidé de ce qui n'y a rien à faire)
setTimeout(() => { try { let n = 0; const ok = new Set(Object.values(ORE)); for (const h of S.houses) if (h.kind === 'camp_mineur') for (const k of Object.keys(h.inv || {})) if (!ok.has(k)) { delete h.inv[k]; n++; } if (n) save(); } catch (e) {} }, 0);
// outils primitifs : « (pierre) » devient « (silex) » dans les stocks déjà enregistrés
setTimeout(() => { try { let n = 0; for (const h of S.houses) for (const m of [h.inv, h.mat]) for (const k of Object.keys(m || {})) if (k.endsWith(' (pierre)')) { const k2 = k.replace(' (pierre)', ' (silex)'); m[k2] = (m[k2] || 0) + m[k]; delete m[k]; n++; } if (n) save(); } catch (e) {} }, 0);
