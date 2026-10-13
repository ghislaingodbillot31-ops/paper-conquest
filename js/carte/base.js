// renommage du jeu en DOMINIUM : les sauvegardes du navigateur (paperConquest…) sont reprises sous leur nouveau nom
try { for (const k of Object.keys(localStorage)) if (k.startsWith('paperConquest')) { const n = 'dominium' + k.slice(13); if (localStorage.getItem(n) === null) localStorage.setItem(n, localStorage.getItem(k)); localStorage.removeItem(k); } } catch (e) {}
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
  return r ? { region:r, biome:p.get('biome') || 'tempere', river:p.get('river') || 'auto', seed:+p.get('seed') || r * 7919 + 101, essai:p.has('essai') } : null; } catch (e) { return null; } })();
// éditeur de routes (editeur-routes.html déclare EDIT_ROUTES) : un monde plat et vert, sans carte ni végétation, avec son propre plan
const MONDE_PLAT = typeof EDIT_ROUTES !== 'undefined';
const KEY = MONDE_PLAT ? 'editeurRoutes.v12' : GAME && GAME.essai ? 'biomeEssai.' + GAME.biome : PAGE === 'carte' ? (typeof MAPTEST !== 'undefined' ? 'mapTest.v1' : 'editeurCarte.v1') : GAME ? 'dominiumRegionMap.' + GAME.region : 'planVillageZonage.v11';
if (GAME && GAME.essai) { try { localStorage.removeItem(KEY); } catch (e) {} document.head.insertAdjacentHTML('beforeend', '<style>body > :not(.canvas-wrap){display:none!important}</style>'); }   // page Dev « Biomes générés » : région regénérée à chaque ouverture, jamais gardée
/* RÉGÉNÉRATION GÉNÉRALE UNIQUE (demandée le 07/10, rejouée le 12/10 : clé regen.tout.v5) : toutes les cartes générées sont effacées une seule fois — régions du jeu (plans, noms de village, arrivants, drapeaux)
   ET cartes d'essai des pages Dev (map-test : mapTest.v1, éditeur de carte : editeurCarte.v1), qui gardaient d'anciens tracés. Elles sont regénérées avec le générateur actuel. Pour la rejouer : changer le numéro de clé. */
const REGEN_CLE = 'regen.tout.v8';   // (13/10 : les 18 biomes validés — sol à zones de couleur, textures rendues — régions regénérées)
/* Régénération de certaines régions seulement (« regen la 80 ») : leur carte enregistrée est effacée une fois ; pour une autre région, ajouter son numéro ET changer la clé. */
const REGEN_REGIONS = { cle:'regen.regions.v2', ids:[80, 47] };
try { if (PAGE === 'region' && !localStorage.getItem(REGEN_REGIONS.cle)) { for (const id of REGEN_REGIONS.ids) localStorage.removeItem('dominiumRegionMap.' + id); localStorage.setItem(REGEN_REGIONS.cle, '1'); } } catch (e) {}
try { if ((PAGE === 'region' || PAGE === 'carte') && !localStorage.getItem(REGEN_CLE)) { for (const k of Object.keys(localStorage)) if (/^(dominiumRegionMap.|mapTest.v1|editeurCarte.v1)/.test(k)) localStorage.removeItem(k); localStorage.setItem(REGEN_CLE, '1'); } } catch (e) {}
