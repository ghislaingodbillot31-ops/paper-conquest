// Terrain d'une carte de region (m). 2000 x 1500 etait trop petit : une region de ~500 km tenait en 2 km.
// Meme valeur dans outils/build-formes.js (a regenerer apres tout changement).
const ECHELLE_TERRAIN = 2.4;                      // (3 jusqu'au 06/10 : 6000 × 4500 m, jugé trop grand ; les formes de data/regions/formes.json restent à l'échelle 3, voir ECHELLE_FORMES)
const TW = 2000 * ECHELLE_TERRAIN, TH = 1500 * ECHELLE_TERRAIN;
const CELL = 8, DEPTH = 4;
// muraille : même emprise qu'une route (une case), maçonnerie de 6 m au centre ;
// rayon des tours ; longueur d'une porte le long de la route (m)
const WALL_W = CELL, WALL_SURF = 6, TOWER_R = 6, GATE_L = CELL;
const ANG_STEP = Math.PI / 18; // routes orientées uniquement par pas de 10°
/* Trois pages partagent ces scripts (PAGE, défini par chaque page) :
   - 'region'    : carte d'une région du jeu (region.html?region=numéro&biome=…&river=…&seed=…),
                   un plan sauvegardé par région ; sans paramètre, plan d'essai ;
   - 'carte'     : éditeur du générateur de carte (editeur-carte.html) ;
   - 'batiments' : éditeur des bâtiments (editeur-batiments.html), sans carte. */
const GAME = (() => { try { const p = new URLSearchParams(location.search), r = +p.get('region');
  return r ? { region:r, biome:p.get('biome') || 'tempere', river:p.get('river') || 'auto', seed:+p.get('seed') || r * 7919 + 101 } : null; } catch (e) { return null; } })();
const KEY = PAGE === 'carte' ? (typeof MAPTEST !== 'undefined' ? 'mapTest.v1' : 'editeurCarte.v1') : GAME ? 'paperConquestRegionMap.' + GAME.region : 'planVillageZonage.v11';
