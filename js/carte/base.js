// Terrain d'une carte de region (m). 2000 x 1500 etait trop petit : une region de ~500 km tenait en 2 km.
// Meme valeur dans outils/build-formes.js (a regenerer apres tout changement).
const ECHELLE_TERRAIN = 1.6;                      // (2,4 jusqu'au 06/10 : routes, bâtiments et décor paraissent 1,5 fois plus grands ; 3 avant : 6000 × 4500 m, jugé trop grand ; les formes de data/regions/formes.json restent à l'échelle 3, voir ECHELLE_FORMES)
const TW = 2000 * ECHELLE_TERRAIN, TH = 1500 * ECHELLE_TERRAIN;
const CELL = 8, DEPTH = 4;
// muraille : même emprise qu'une route (une case), maçonnerie de 6 m au centre ;
// rayon des tours ; longueur d'une porte le long de la route (m)
const WALL_W = CELL, WALL_SURF = 6, TOWER_R = 6, GATE_L = CELL;
// routes commerciales (celles de la région) : ni supprimables ni modifiables ; seules celles tracées par le joueur (libre) le sont
// (l'éditeur de routes, editeur-routes.html, déclare EDIT_ROUTES : là, toutes les routes se modifient)
const routeFixe = r => PAGE === 'region' && !r.libre && typeof EDIT_ROUTES === 'undefined';
const COIN_NET = 45 * Math.PI / 180; // virage à partir duquel un angle de route reste franc (routes.js, zonage.js)
const ANG_ROUTE = Math.PI / 6;   // construction de route : pas de 30° (règle du 06/10 ; 10° avant)
const ANG_STEP = Math.PI / 18; // routes orientées uniquement par pas de 10°
/* Trois pages partagent ces scripts (PAGE, défini par chaque page) :
   - 'region'    : carte d'une région du jeu (region.html?region=numéro&biome=…&river=…&seed=…),
                   un plan sauvegardé par région ; sans paramètre, plan d'essai ;
   - 'carte'     : éditeur du générateur de carte (editeur-carte.html) ;
   - 'batiments' : éditeur des bâtiments (editeur-batiments.html), sans carte. */
const GAME = (() => { try { const p = new URLSearchParams(location.search), r = +p.get('region');
  return r ? { region:r, biome:p.get('biome') || 'tempere', river:p.get('river') || 'auto', seed:+p.get('seed') || r * 7919 + 101 } : null; } catch (e) { return null; } })();
// éditeur de routes (editeur-routes.html déclare EDIT_ROUTES) : un monde plat et vert, sans carte ni végétation, avec son propre plan
const MONDE_PLAT = typeof EDIT_ROUTES !== 'undefined';
const KEY = MONDE_PLAT ? 'editeurRoutes.v1' : PAGE === 'carte' ? (typeof MAPTEST !== 'undefined' ? 'mapTest.v1' : 'editeurCarte.v1') : GAME ? 'paperConquestRegionMap.' + GAME.region : 'planVillageZonage.v11';
/* RÉGÉNÉRATION GÉNÉRALE UNIQUE (demandée le 07/10) : toutes les régions générées (plans sauvegardés, noms de village, arrivants, drapeaux) sont effacées une seule fois ;
   chaque région sera regénérée d'après sa forme avec les paramètres actuels (échelle du terrain, routes, végétation). À supprimer ensuite. */
try { if (PAGE === 'region' && !localStorage.getItem('regen.tout.v1')) { for (const k of Object.keys(localStorage)) if (k.startsWith('paperConquestRegionMap.')) localStorage.removeItem(k); localStorage.setItem('regen.tout.v1', '1'); } } catch (e) {}
