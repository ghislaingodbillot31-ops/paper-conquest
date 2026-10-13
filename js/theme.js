/* ---------- thème de couleurs : 16 couleurs fixes, ternes, pour tous les designs ----------
   Tout part des deux couleurs du globe : l'herbe claire (la terre, #A59E72) et l'herbe foncée (la mer, #3F493B), qui remplacent l'herbe vive des régions.
   Les 14 autres sont des teintes sourdes de la même famille (terre, mousse, pierre, eau grise, ocre, brique), sans couleur vive.
   Les mêmes valeurs sont en variables CSS dans css/theme.css (--c-<id>). */
const THEME = [
  { id:'encre',        nom:'Encre',          hex:'#2b2618', usage:'traits, textes, contours gravés' },
  { id:'herbe',        nom:'Herbe claire',   hex:'#a59e72', usage:'sol des régions, terre du globe (couleur de base)' },
  { id:'herbe-sombre', nom:'Herbe foncée',   hex:'#3f493b', usage:'ombres du sol, mer du globe (couleur de base)' },
  { id:'parchemin',    nom:'Parchemin',      hex:'#e6dfc6', usage:'fonds clairs, papier, panneaux' },
  { id:'sable',        nom:'Sable',          hex:'#cbbe92', usage:'berges, plages, routes claires' },
  { id:'argile',       nom:'Argile',         hex:'#a06b48', usage:'toits, terre cuite, contours des régions possédées' },
  { id:'brun',         nom:'Brun',           hex:'#6a5238', usage:'bois, mines, chemins de terre' },
  { id:'mousse',       nom:'Mousse',         hex:'#7c8160', usage:'prairies, herbe d’entre-deux' },
  { id:'feuillage',    nom:'Feuillage',      hex:'#566244', usage:'arbres, buissons, cultures' },
  { id:'foret',        nom:'Forêt profonde', hex:'#2e3a2e', usage:'grands bois, ombres végétales' },
  { id:'eau',          nom:'Eau',            hex:'#62808a', usage:'rivières, lacs, bassins' },
  { id:'brume',        nom:'Brume',          hex:'#98a292', usage:'zones de pêche, lointains, voiles' },
  { id:'pierre',       nom:'Pierre',         hex:'#86806f', usage:'rochers, murailles, ponts' },
  { id:'ocre',         nom:'Ocre',           hex:'#b38b3e', usage:'monnaie, mise en valeur, régions possédées' },
  { id:'violet',       nom:'Violet sourd',   hex:'#6e5a72', usage:'comptoirs, commerce' },
  { id:'brique',       nom:'Brique',         hex:'#8a4a3b', usage:'alertes, refus, danger' },
];
const COULEUR = Object.fromEntries(THEME.map(c => [c.id, c.hex]));   // COULEUR.herbe, COULEUR['herbe-sombre']…
