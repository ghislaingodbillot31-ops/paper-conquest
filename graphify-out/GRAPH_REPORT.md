# Graph Report - Paper Conquest 2.0  (2026-10-06)

## Corpus Check
- 98 files · ~446,375 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1540 nodes · 2599 edges · 86 communities (75 shown, 11 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 60 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `717a831f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- elements.js
- build-waterways.js
- modele-regions.js
- build-fleuves-ne.js
- bateaux.js
- panneau.js
- carte/eau.js
- construction.js
- paysage.js
- reseau-routes.js
- simulation.js
- ressources.js
- coller-frontieres-fleuves.js
- generateur.js
- caravane.js
- build-fishing.js
- package.json
- build-formes.js
- forme.js
- tuiles.js
- build-routes.js
- carte/routes.js
- regions.js
- economie.js
- _rendu.js
- build-regions.js
- vue.js
- interface.js
- build-nav-grid.js
- carte/capitale.js
- fortifications-dessin.js
- zonage.js
- peche.js
- rendu.js
- _controle-fleuves.js
- lisser-bords.js
- catalogue.js
- dessin.js
- trace.js
- _controle-bords.js
- _lacs.js
- reparer-croisements.js
- atelier.js
- jeu/faune.js
- arrondir-cotes.js
- tryLake
- _croisements.js
- deplacements.js
- developpeur.js
- donnees-regions.js
- carte-region.js
- jeu/routes.js
- dessins.js
- base.js
- cellKm2
- cutAtConfluence
- gkey
- kmEntre
- r3
- seaPoint
- saisons.js
- animaux.js
- carte/faune.js
- arrivants.js
- retirer-lacs-monde.js
- vehicules.js
- terrestres.js
- chariots.js
- poissons.js
- navigation.js
- baies.js
- ressources-test.js
- villageois.js
- _region-page.js
- arbres.js
- _cdp.js
- _charge-page.js
- Paper Conquest
- gisements.js
- Données des régions
- _chaine-lacs.sh

## God Nodes (most connected - your core abstractions)
1. `LP()` - 54 edges
2. `lpts()` - 47 edges
3. `pathS()` - 45 edges
4. `lw()` - 45 edges
5. `shiftS()` - 32 edges
6. `yardLT()` - 26 edges
7. `initBoat()` - 18 edges
8. `beamLT()` - 15 edges
9. `aQuad()` - 13 edges
10. `vVoilier()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `genereDepuisForme()` --indirect_call--> `inTerrain()`  [INFERRED]
  js/carte/forme.js → js/carte/geometrie.js
- `genereDepuisForme()` --indirect_call--> `round2()`  [INFERRED]
  js/carte/forme.js → js/carte/geometrie.js
- `hitAny()` --indirect_call--> `hitLake()`  [INFERRED]
  js/carte/fortifications.js → js/carte/poissons.js
- `renderRegionPanel()` --indirect_call--> `toggleBoatPlacing()`  [INFERRED]
  js/jeu/regions.js → js/jeu/bateaux.js
- `initSelection()` --indirect_call--> `closeCapital()`  [INFERRED]
  js/jeu/construction.js → js/jeu/capitale.js

## Import Cycles
- None detected.

## Communities (86 total, 11 thin omitted)

### Community 0 - "elements.js"
Cohesion: 0.09
Nodes (86): addS(), anvilLT(), arrowsLT(), axeLT(), barrelLT(), barrowLT(), basketLT(), beamLT() (+78 more)

### Community 1 - "build-waterways.js"
Cohesion: 0.03
Nodes (56): AUS_RANGES, AUS_RIDGE, avantOuverture, basins, BOX, boxesO, capCases, CAPITALES (+48 more)

### Community 2 - "modele-regions.js"
Cohesion: 0.06
Nodes (45): applyWaterFish(), ARID_CENTERS, aridColor(), aridityAt(), band(), clamp01(), climateColorAt(), computeAnimalZones() (+37 more)

### Community 3 - "build-fleuves-ne.js"
Cohesion: 0.06
Nodes (47): bilanFin, boite(), boites, cases, chaikin(), chaines(), cours, densifie() (+39 more)

### Community 4 - "bateaux.js"
Cohesion: 0.10
Nodes (48): boat, boatHint(), boatStatusText(), cancelSend(), capitalById, createNavigator(), cellOf(), findPath() (+40 more)

### Community 5 - "panneau.js"
Cohesion: 0.07
Nodes (39): changed(), COLL, commit(), dims(), findById(), findSel(), flash(), ghost() (+31 more)

### Community 6 - "carte/eau.js"
Cohesion: 0.06
Nodes (27): bandCache, bandDiscs(), chaikinOpen(), drawPlantesEau(), isleWide(), joinTributary(), LAC_DIST, lakeShape() (+19 more)

### Community 7 - "construction.js"
Cohesion: 0.09
Nodes (31): CAPITAL_TABS, closeCapital(), openWindow(), renderCapitalView(), renderTabs(), renderWindow(), BUILDINGS, coastCache (+23 more)

### Community 8 - "paysage.js"
Cohesion: 0.10
Nodes (37): builtPolys(), canopeeSur(), classifyWoods(), computeFlora(), contourSegments(), crown(), drawWoods(), flora (+29 more)

### Community 9 - "reseau-routes.js"
Cohesion: 0.13
Nodes (30): addExtraRoads(), allWindingLegs(), anyLandPath(), bboxOfCoords(), bboxOverlap(), bearingDeg(), bearingTurn(), borderWaypoints() (+22 more)

### Community 10 - "simulation.js"
Cohesion: 0.10
Nodes (37): inTerrain(), byDist(), CARRY, collectable(), cutTree(), drawWorkers(), drawWorkZones(), estNuit() (+29 more)

### Community 11 - "ressources.js"
Cohesion: 0.08
Nodes (29): applyResourceFilter(), CROPS, FISH_ZONE_COLORS, FISH_ZONE_TYPES, FISHING_ZONES, FRESH_FISH, FRESH_FISH_NAMES, freshFishAt() (+21 more)

### Community 12 - "coller-frontieres-fleuves.js"
Cohesion: 0.08
Nodes (29): before, cellKey(), coastNodes, cross(), decoded, encode(), finish(), fs (+21 more)

### Community 13 - "generateur.js"
Cohesion: 0.10
Nodes (27): ACACIA_PAL, between(), BIOME_RIVER, biomeLook(), biomeOf(), BIOMES, CONIFER_PAL, CONIFER_STEPS (+19 more)

### Community 14 - "caravane.js"
Cohesion: 0.16
Nodes (24): caravan, caravanCity(), caravanSend, caravanTo(), cityAt(), cityLabel(), drawCaravanIcon(), finishCaravan() (+16 more)

### Community 15 - "build-fishing.js"
Cohesion: 0.13
Nodes (19): coastZone(), fc, fs, hitsBox(), kmDeg(), labelPoint(), lands, nameSeed() (+11 more)

### Community 16 - "package.json"
Cohesion: 0.09
Nodes (21): author, dependencies, @resvg/resvg-js, topojson-client, topojson-server, topojson-simplify, @turf/turf, description (+13 more)

### Community 17 - "build-formes.js"
Cohesion: 0.10
Nodes (15): boxes, eachCoord(), fc, fs, near(), out, path, regions (+7 more)

### Community 18 - "forme.js"
Cohesion: 0.17
Nodes (21): cadreEtAnneaux(), carveRivieres(), cheminAnneaux(), CLASSE_FLEUVE, clipTerre(), dansRegion(), drawBorder(), drawSea() (+13 more)

### Community 19 - "tuiles.js"
Cohesion: 0.21
Nodes (19): cleanTile(), drawDecor(), dropTile(), floraNear(), GPU, hit(), invalidateTiles(), markAllDirty() (+11 more)

### Community 20 - "build-routes.js"
Cohesion: 0.12
Nodes (16): ctx, fs, game, json(), out, P(), path, r4() (+8 more)

### Community 21 - "carte/routes.js"
Cohesion: 0.17
Nodes (15): applyZone(), chaikin(), drawRoads(), EDGE, FILL, hubAt(), lisser(), PAT (+7 more)

### Community 22 - "regions.js"
Cohesion: 0.21
Nodes (15): buildings, drawMineIcon(), drawPortIcon(), initOwnership(), interactionBusy(), loadPlayerState(), ownedRegions, refreshOwnershipLayers() (+7 more)

### Community 23 - "economie.js"
Cohesion: 0.22
Nodes (15): dailyIncome(), ECO, economyDay(), economyTick(), FARM_EXCLUDE, fmtGold(), goodName(), initEconomy() (+7 more)

### Community 24 - "_rendu.js"
Cohesion: 0.12
Nodes (15): [a,b,c,d], ad, [D,x0,y0,x1,y1,out], fc, fs, H, HH, k (+7 more)

### Community 25 - "build-regions.js"
Cohesion: 0.13
Nodes (13): ctx, fs, game, json(), path, read(), regions, ROOT (+5 more)

### Community 26 - "vue.js"
Cohesion: 0.19
Nodes (11): clampView(), Col, ctx, cv, fit(), fitContent(), minScale(), resize() (+3 more)

### Community 27 - "interface.js"
Cohesion: 0.14
Nodes (11): CONTINENT_BY_ID, CONTINENTS, EVENTS, NAV_ITEMS, NPC_REGION_IDS, RANKING, showView(), sidebar (+3 more)

### Community 28 - "build-nav-grid.js"
Cohesion: 0.16
Nodes (13): fc, fillPolygon(), fs, H, land, latOf(), rows, [SRC, DST] (+5 more)

### Community 29 - "carte/capitale.js"
Cohesion: 0.22
Nodes (11): afficherCartes(), esc(), montrer(), nomForm, ONGLETS, OUTILS_CONSTRUCTION, ouvrir(), peindreVignettes() (+3 more)

### Community 30 - "fortifications-dessin.js"
Cohesion: 0.26
Nodes (13): coneS(), drawGate(), drawTower(), drawWalls(), FORT, FORT_LEVELS, lvlOf(), roundTowerS() (+5 more)

### Community 31 - "zonage.js"
Cohesion: 0.20
Nodes (16): ancrages, cellAt(), computeOcc(), computeZones(), crossesWallAtGates(), fitsAt(), footprint(), maxGrade() (+8 more)

### Community 32 - "peche.js"
Cohesion: 0.21
Nodes (11): initFishingZones(), initFreshWaters(), initSeaLabels(), lakePolys, regionFishingZones(), regionResourcesHtml(), riverBoxes, SEA_LABELS (+3 more)

### Community 33 - "rendu.js"
Cohesion: 0.21
Nodes (11): BRIDGE, bridgeCache, bridges(), drawBridges(), drawWater(), junctionCache, opts, ptInPoly() (+3 more)

### Community 34 - "_controle-fleuves.js"
Cohesion: 0.18
Nodes (11): dist(), fs, grid, K(), km(), mesh, out, t (+3 more)

### Community 35 - "lisser-bords.js"
Cohesion: 0.19
Nodes (11): arcs, chaikin(), dpSeg(), ends, fs, IN, key(), newArcs (+3 more)

### Community 36 - "catalogue.js"
Cohesion: 0.13
Nodes (10): BUILD_MENUS, COUTS, EXT, FOOD_LIST, manque(), needIssue(), NONFOOD_LIST, PRESETS (+2 more)

### Community 37 - "dessin.js"
Cohesion: 0.23
Nodes (7): drawHouse(), haloText(), polyPath(), draw(), drawHighlights(), requestDraw(), strokeLine()

### Community 38 - "trace.js"
Cohesion: 0.42
Nodes (9): drawDraft(), junctionOnRay(), linePoint(), nearestAnchor(), pointRoute(), snapToRoads(), tracePoint(), wallIssue() (+1 more)

### Community 39 - "_controle-bords.js"
Cohesion: 0.25
Nodes (7): cr(), cross(), ex, fs, reg, t, tj

### Community 40 - "_lacs.js"
Cohesion: 0.25
Nodes (6): ctx, fs, ids, src, stub, vm

### Community 41 - "reparer-croisements.js"
Cohesion: 0.36
Nodes (7): arcs, cr(), find(), fs, inter(), t, xing()

### Community 42 - "atelier.js"
Cohesion: 0.48
Nodes (5): atelier, atelierHouse(), atelierSide(), drawAtelier(), fitAtelier()

### Community 43 - "jeu/faune.js"
Cohesion: 0.38
Nodes (6): ANIMAL_COLORS, ANIMAL_ZONES, initAnimalZones(), regionAnimalZone, updateAnimalLayers(), zoneAnimals()

### Community 44 - "arrondir-cotes.js"
Cohesion: 0.29
Nodes (5): arcs, fs, out, t, use

### Community 45 - "tryLake"
Cohesion: 0.29
Nodes (7): cellOfPt(), lakeShape(), loinDesFrontieres(), loinDesRoutes(), onLand(), rayonKm(), tryLake()

### Community 46 - "_croisements.js"
Cohesion: 0.29
Nodes (5): ctx, fs, src, stub, vm

### Community 48 - "deplacements.js"
Cohesion: 0.44
Nodes (9): batimentSous(), contourner(), croise(), marcher(), porte(), procheRoute(), reseauRoutes(), trajet() (+1 more)

### Community 49 - "developpeur.js"
Cohesion: 0.50
Nodes (4): applyDevFilters(), DEV_FILTERS, devState, setLayerVisible()

### Community 50 - "donnees-regions.js"
Cohesion: 0.36
Nodes (6): EMPTY_REGION, REGION_DATA, regionClimat(), regionInfo(), regionMeteo(), regionSoleil()

### Community 65 - "saisons.js"
Cohesion: 0.09
Nodes (29): aujourdhui(), clair01(), dateDe(), DOY_AUTOMNE, DOY_ETE, DOY_HIVER, DOY_PRINTEMPS, doyDe() (+21 more)

### Community 66 - "animaux.js"
Cohesion: 0.17
Nodes (25): aBois(), aBrin(), aCorps(), aCorpsPath(), aCorpsPts(), aCourbe(), aCroco(), aEffile() (+17 more)

### Community 67 - "carte/faune.js"
Cohesion: 0.14
Nodes (27): drawFaune(), fang(), FAUNE, FAUNE_CAT, FAUNE_CATS, FAUNE_NOM(), fauneAnimal(), fauneCentre() (+19 more)

### Community 68 - "arrivants.js"
Cohesion: 0.17
Nodes (23): afficherDemande(), afficherStock(), ARR_DELAI, arrivants, arrivantsDessin(), arrivantsStep(), arrSave(), campColon() (+15 more)

### Community 69 - "retirer-lacs-monde.js"
Cohesion: 0.10
Nodes (20): bbox(), fautifs(), fs, gap(), [kr, kv, kl], P(), R, segD() (+12 more)

### Community 70 - "vehicules.js"
Cohesion: 0.22
Nodes (21): peintBateau(), V_PROFIL, vBarque(), vBarqueCoque(), vBois(), vContours(), vCoque(), vEclairage() (+13 more)

### Community 71 - "terrestres.js"
Cohesion: 0.18
Nodes (20): drawTerrestres(), drawVoies(), marcheAu(), marcheCle(), marchePose(), marcher(), marcheRt, marcheStep() (+12 more)

### Community 72 - "chariots.js"
Cohesion: 0.23
Nodes (18): CH_CHEVAUX, chariotEtat(), chariotPas(), CHARIOTS, CHARIOTS_DEFAUT, chBancs(), chBois(), chCorde() (+10 more)

### Community 73 - "poissons.js"
Cohesion: 0.24
Nodes (19): airePoly(), comestible(), coupDeLigne(), ESPECES, hitLake(), lacId(), lacOf(), majLac() (+11 more)

### Community 74 - "navigation.js"
Cohesion: 0.22
Nodes (13): NAV, NAV_VIRAGE, NAV_VITESSE, navBateauAu(), navBesoin(), navChemin(), navEau(), navGrille() (+5 more)

### Community 75 - "baies.js"
Cohesion: 0.23
Nodes (12): BAIE_HUM, BAIE_TM, baieConvenance(), baieFeuillage(), baieFruit(), BAIES, baiesCandidats(), baiesClimat() (+4 more)

### Community 76 - "ressources-test.js"
Cohesion: 0.26
Nodes (12): CAT_TEST, choixTest(), drawRessources(), drawRessourcesGhost(), effaceTest(), GLYPHES, glypheTest(), nomTest() (+4 more)

### Community 77 - "villageois.js"
Cohesion: 0.32
Nodes (10): peintVillageois(), viChapeau(), viEll(), viLigne(), VILLAGEOIS, VILLAGEOIS_DE, VILLAGEOIS_DEFAUT, viOutil() (+2 more)

### Community 78 - "_region-page.js"
Cohesion: 0.20
Nodes (3): fs, stub, vm

### Community 79 - "arbres.js"
Cohesion: 0.33
Nodes (6): arbreFeuilles(), arbreFruit(), arbreLisse(), drawFruitiers(), FRUITIERS, peintArbre()

### Community 80 - "_cdp.js"
Cohesion: 0.22
Nodes (7): CH, fs, os, path, proc, { spawn }, [url, png, expr]

### Community 81 - "_charge-page.js"
Cohesion: 0.22
Nodes (8): ctx, files, fs, html, [page, n], store, stub, vm

### Community 82 - "Paper Conquest"
Cohesion: 0.29
Nodes (6): Hébergement, Paper Conquest, Régénérer les données, Structure du projet, Suivi des versions, Utiliser le projet

### Community 83 - "gisements.js"
Cohesion: 0.40
Nodes (4): drawDeposits(), GISEMENTS, rochesCache, rochesDe()

### Community 84 - "Données des régions"
Cohesion: 0.50
Nodes (3): Données des régions, Modifier les données, Une fiche de région

## Knowledge Gaps
- **475 isolated node(s):** `atelier`, `PRESETS`, `FOOD_LIST`, `NONFOOD_LIST`, `EXT` (+470 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `inTerrain()` connect `simulation.js` to `forme.js`, `carte/eau.js`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `genereDepuisForme()` connect `forme.js` to `simulation.js`, `carte/eau.js`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `atelier`, `PRESETS`, `FOOD_LIST` to the rest of the system?**
  _475 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `elements.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09404388714733543 - nodes in this community are weakly interconnected._
- **Should `build-waterways.js` be split into smaller, more focused modules?**
  _Cohesion score 0.02666666666666667 - nodes in this community are weakly interconnected._
- **Should `modele-regions.js` be split into smaller, more focused modules?**
  _Cohesion score 0.062409288824383166 - nodes in this community are weakly interconnected._
- **Should `build-fleuves-ne.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06274509803921569 - nodes in this community are weakly interconnected._