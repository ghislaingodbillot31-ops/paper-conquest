/* Règles de génération : distances (en mètres, bord contre bord) entre les types d'éléments posés sur la carte.
   Chaque règle a une valeur par défaut ; l'onglet « Règles de génération » de l'éditeur (regles-generation.html) les modifie et, à la validation, les enregistre dans le navigateur (REGLES_CLE).
   Les pages de jeu et d'édition ouvertes les relisent aussitôt (événement « storage ») : la végétation et les cailloux sont recalculés avec les nouvelles distances, sans recharger.
   regle('id') : valeur en cours. */
const REGLES_CLE = 'reglesGeneration.v1';
const REGLES_DEF = [
  { id:'roche_roche',  groupe:'Cailloux et pierres', nom:'Entre deux cailloux',          def:.8, min:0, max:6,  pas:.1, aide:'Vide minimum entre les bords de deux cailloux, rochers ou pierres : jamais l’un sur l’autre.' },
  { id:'roche_eau',    groupe:'Cailloux et pierres', nom:'Caillou ↔ eau',                def:.4, min:0, max:10, pas:.1, aide:'Un caillou ne se pose jamais dans une rivière ou un lac, mais peut être au bord (îles exceptées : leur grève est entourée d’eau).' },
  { id:'roche_route',  groupe:'Cailloux et pierres', nom:'Caillou ↔ route',              def:.3, min:0, max:10, pas:.1, aide:'Distance minimum entre un caillou et la chaussée d’une route (0 : juste au bord).' },
  { id:'deco_eau',     groupe:'Décors du sol',       nom:'Fleurs, touffes, feuilles ↔ eau',   def:3, min:0, max:20, pas:.5, aide:'Distance minimum entre un décor du sol (fleur, touffe d’herbe, buisson décoratif, feuilles, champignons, souche) et l’eau.' },
  { id:'deco_route',   groupe:'Décors du sol',       nom:'Décors du sol ↔ route',        def:.3, min:0, max:10, pas:.1, aide:'Distance minimum entre un décor du sol et la chaussée.' },
  { id:'arbre_eau',    groupe:'Arbres et buissons',  nom:'Arbre ↔ eau',                  def:10, min:0, max:40, pas:1, aide:'Vide entre le bord du houppier d’un arbre et l’eau (rivières et lacs ; les arbres des îles sont exceptés).' },
  { id:'arbre_mer',    groupe:'Arbres et buissons',  nom:'Arbre ↔ mer',                  def:6, min:0, max:40, pas:1, aide:'Vide entre le bord du houppier et la mer (cartes à forme réelle).' },
  { id:'arbre_route',  groupe:'Arbres et buissons',  nom:'Arbre ↔ route',                def:0, min:0, max:15, pas:.5, aide:'Marge supplémentaire entre un arbre et la chaussée (0 : seulement le tronc ne doit pas être sur la route).' },
  { id:'buisson_eau',  groupe:'Arbres et buissons',  nom:'Buisson ↔ eau',                def:1.5, min:0, max:15, pas:.5, aide:'Vide entre un buisson et l’eau.' },
  { id:'buisson_route',groupe:'Arbres et buissons',  nom:'Buisson ↔ route',              def:.5, min:0, max:15, pas:.5, aide:'Vide entre un buisson et la chaussée.' },
  { id:'animal_roche',       groupe:'Animaux', nom:'Passage près des gros cailloux', def:1, min:0, max:8,  pas:.25, aide:'Distance minimale à laquelle un animal passe d’un gros caillou (rayon de 1,2 m et plus) ; les petits cailloux sont simplement contournés.' },
  { id:'animal_eau',         groupe:'Animaux', nom:'Passage près de l’eau',           def:4, min:0, max:15, pas:.5,  aide:'Distance minimale à laquelle un animal terrestre passe de l’eau (les espèces d’eau, comme l’hippopotame ou le castor, vivent à la rive).' },
  { id:'animal_peur_dist',   groupe:'Animaux', nom:'Détection d’un danger',          def:55, min:10, max:200, pas:5, aide:'Distance à laquelle un groupe repère un prédateur ou un très gros animal et s’enfuit.' },
  { id:'animal_peur_humain', groupe:'Animaux', nom:'Fuite devant un habitant',       def:22, min:0, max:100, pas:2, aide:'Distance à laquelle les animaux sauvages s’écartent d’un habitant (les prédateurs : la moitié). 0 : aucune fuite. Les troupeaux d’élevage ne fuient pas.' },
  { id:'gisement_meme',  groupe:'Gisements', nom:'Entre deux gisements identiques', def:350, min:0, max:1000, pas:10, aide:'Distance minimale entre les bords de deux gisements du même minerai (jamais côte à côte). Ne joue qu’à la génération d’une nouvelle carte.' },
  { id:'gisement_autre', groupe:'Gisements', nom:'Entre deux gisements différents',  def:40, min:0, max:500, pas:10, aide:'Distance minimale entre les bords de deux gisements de minerais différents. Ne joue qu’à la génération d’une nouvelle carte.' },
  { id:'route_rive',  groupe:'Routes', nom:'Route ↔ fleuve (régions)',  def:28, min:5, max:80, pas:1, aide:'Distance à laquelle une route de région longe un fleuve ou une rivière, mesurée depuis la berge. Ne joue qu’à la génération d’une région.' },
  { id:'pont_droit',  groupe:'Routes', nom:'Alignement avant et après un pont', def:40, min:0, max:120, pas:5, aide:'Longueur de route parfaitement droite, dans l’axe du pont, avant et après chaque pont (le pont est toujours droit et perpendiculaire à la rivière). Ne joue qu’à la génération d’une région.' },
  { id:'pont_marge',  groupe:'Routes', nom:'Pont : marge hors de l’eau',  def:12, min:0, max:60, pas:1, aide:'Distance entre le bord de l’eau et le point où la route est déjà dans l’axe du pont.' },
];
let reglesVal = {};
function reglesCharge() { try { const o = JSON.parse(localStorage.getItem(REGLES_CLE) || '{}'); reglesVal = o && typeof o === 'object' ? o : {}; } catch (e) { reglesVal = {}; } }
reglesCharge();
const regle = id => { const v = reglesVal[id]; if (typeof v === 'number' && isFinite(v)) return v; const d = REGLES_DEF.find(r => r.id === id); return d ? d.def : 0; };
const reglesSignature = () => REGLES_DEF.map(r => regle(r.id)).join(',');
// une autre page (l'éditeur de règles) a validé de nouvelles valeurs : on les relit et on recalcule la végétation tout de suite
if (typeof window !== 'undefined') window.addEventListener('storage', e => {
  if (e.key !== REGLES_CLE) return;
  reglesCharge();
  if (typeof computeFlora === 'function') { computeFlora(); if (typeof markAllDirty === 'function') markAllDirty(); if (typeof requestDraw === 'function') requestDraw(); }
});
