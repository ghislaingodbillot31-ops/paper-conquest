const TW = 2000, TH = 1500;
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
const KEY = PAGE === 'carte' ? 'editeurCarte.v1' : GAME ? 'paperConquestRegionMap.' + GAME.region : 'planVillageZonage.v11';
