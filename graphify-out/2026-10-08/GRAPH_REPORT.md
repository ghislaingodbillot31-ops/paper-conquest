# Graph Report - Paper Conquest 2.0  (2026-10-08)

## Corpus Check
- 110 files · ~503,092 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1964 nodes · 3521 edges · 104 communities (94 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 68 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5cd21419`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- elements.js
- Module build-waterways
- Module modele-regions
- Module build-fleuves-ne
- Module bateaux
- simulation.js
- generateur.js
- paysage.js
- poissons.js
- construction.js
- carte/faune.js
- reseau-routes.js
- arrivants.js
- ressources.js
- saisons.js
- coller-frontieres-fleuves.js
- gestion.js
- animaux.js
- carte/eau.js
- caravane.js
- retirer-lacs-monde.js
- outils.js
- stepForester
- vehicules.js
- build-fishing.js
- package.json
- catalogue.js
- carte/routes.js
- terrestres.js
- build-formes.js
- chariots.js
- panneau.js
- stepJob
- tuiles.js
- cultures.js
- champs.js
- zonage.js
- build-routes.js
- geometrie.js
- forme.js
- economie.js
- _rendu.js
- dev.js
- regions.js
- build-regions.js
- carte/capitale.js
- navigation.js
- simTick
- vue.js
- interface.js
- build-nav-grid.js
- baies.js
- fortifications-dessin.js
- ressources-test.js
- peche.js
- rendu.js
- _controle-fleuves.js
- lisser-bords.js
- production.js
- dessin.js
- villageois.js
- serveur-logs.js
- deplacements.js
- trace.js
- _region-page.js
- dessins.js
- arbres.js
- stats.js
- _cdp.js
- _charge-page.js
- _controle-bords.js
- donnees-regions.js
- _lacs.js
- reparer-croisements.js
- atelier.js
- lumieres.js
- jeu/faune.js
- arrondir-cotes.js
- tryLake
- _croisements.js
- Paper Conquest
- cheminAnneaux
- besoins
- wkey
- developpeur.js
- Données des régions
- monter
- carte-region.js
- jeu/routes.js
- base.js
- cellKm2
- cutAtConfluence
- gkey
- kmEntre
- r3
- seaPoint
- _chaine-lacs.sh
- niveauDe

## God Nodes (most connected - your core abstractions)
1. `LP()` - 54 edges
2. `lpts()` - 47 edges
3. `pathS()` - 45 edges
4. `lw()` - 45 edges
5. `simTick()` - 43 edges
6. `shiftS()` - 32 edges
7. `yardLT()` - 26 edges
8. `batHtml()` - 19 edges
9. `stepJob()` - 19 edges
10. `initBoat()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `jobSites()` --indirect_call--> `pointsDeChamp()`  [INFERRED]
  js/carte/simulation.js → js/carte/champs.js
- `genereDepuisForme()` --indirect_call--> `inTerrain()`  [INFERRED]
  js/carte/forme.js → js/carte/geometrie.js
- `genereDepuisForme()` --indirect_call--> `round2()`  [INFERRED]
  js/carte/forme.js → js/carte/geometrie.js
- `hitAny()` --indirect_call--> `hitLake()`  [INFERRED]
  js/carte/fortifications.js → js/carte/poissons.js
- `jobSites()` --indirect_call--> `inTerrain()`  [INFERRED]
  js/carte/simulation.js → js/carte/geometrie.js

## Import Cycles
- None detected.

## Communities (104 total, 10 thin omitted)

### Community 0 - "elements.js"
Cohesion: 0.10
Nodes (86): addS(), anvilLT(), arrowsLT(), axeLT(), barrelLT(), barrowLT(), basketLT(), beamLT() (+78 more)

### Community 1 - "Module build-waterways"
Cohesion: 0.03
Nodes (56): AUS_RANGES, AUS_RIDGE, avantOuverture, basins, BOX, boxesO, capCases, CAPITALES (+48 more)

### Community 2 - "Module modele-regions"
Cohesion: 0.06
Nodes (45): applyWaterFish(), ARID_CENTERS, aridColor(), aridityAt(), band(), clamp01(), climateColorAt(), computeAnimalZones() (+37 more)

### Community 3 - "Module build-fleuves-ne"
Cohesion: 0.06
Nodes (47): bilanFin, boite(), boites, cases, chaikin(), chaines(), cours, densifie() (+39 more)

### Community 4 - "Module bateaux"
Cohesion: 0.10
Nodes (48): boat, boatHint(), boatStatusText(), cancelSend(), capitalById, createNavigator(), cellOf(), findPath() (+40 more)

### Community 5 - "simulation.js"
Cohesion: 0.04
Nodes (63): ACTIVITES, ALERTES, AMELIO, AMELIO_FONDERIE, ameliorable(), amelios(), AVEC_PORTEURS, BESOIN (+55 more)

### Community 6 - "generateur.js"
Cohesion: 0.07
Nodes (34): ACACIA_PAL, between(), BIOME_RIVER, biomeLook(), biomeOf(), BIOMES, CONIFER_PAL, CONIFER_STEPS (+26 more)

### Community 7 - "paysage.js"
Cohesion: 0.10
Nodes (37): builtPolys(), classifyWoods(), computeFlora(), contourSegments(), crown(), drawWoods(), flora, floraCandidates() (+29 more)

### Community 8 - "poissons.js"
Cohesion: 0.11
Nodes (43): accesPeche(), airePoly(), choisirEau(), comestible(), connuTexte(), corpsDEau(), coupDeLigne(), drawEauPeche() (+35 more)

### Community 9 - "construction.js"
Cohesion: 0.09
Nodes (31): CAPITAL_TABS, closeCapital(), openWindow(), renderCapitalView(), renderTabs(), renderWindow(), BUILDINGS, coastCache (+23 more)

### Community 10 - "carte/faune.js"
Cohesion: 0.10
Nodes (36): animauxCapturables(), captures, choisirCapture(), demarrerCapture(), drawCaptureCibles(), drawFaune(), drawFauneNoms(), eauMem (+28 more)

### Community 11 - "reseau-routes.js"
Cohesion: 0.13
Nodes (30): addExtraRoads(), allWindingLegs(), anyLandPath(), bboxOfCoords(), bboxOverlap(), bearingDeg(), bearingTurn(), borderWaypoints() (+22 more)

### Community 12 - "arrivants.js"
Cohesion: 0.13
Nodes (30): afficherDemande(), afficherStock(), ARR_DELAI, arrivants, arrivantsDessin(), arrivantsStep(), arrSave(), campColon() (+22 more)

### Community 13 - "ressources.js"
Cohesion: 0.08
Nodes (29): applyResourceFilter(), CROPS, FISH_ZONE_COLORS, FISH_ZONE_TYPES, FISHING_ZONES, FRESH_FISH, FRESH_FISH_NAMES, freshFishAt() (+21 more)

### Community 14 - "saisons.js"
Cohesion: 0.09
Nodes (30): aujourdhui(), clair01(), dateDe(), DOY_AUTOMNE, DOY_ETE, DOY_HIVER, DOY_PRINTEMPS, doyDe() (+22 more)

### Community 15 - "coller-frontieres-fleuves.js"
Cohesion: 0.08
Nodes (29): before, cellKey(), coastNodes, cross(), decoded, encode(), finish(), fs (+21 more)

### Community 16 - "gestion.js"
Cohesion: 0.11
Nodes (41): ANIMAUX_NOM, BAT_CAT, BAT_ICONE, batHtml(), batLive(), batOnglet, batPousseHtml(), batStockHtml() (+33 more)

### Community 17 - "animaux.js"
Cohesion: 0.17
Nodes (25): aBois(), aBrin(), aCorps(), aCorpsPath(), aCorpsPts(), aCourbe(), aCroco(), aEffile() (+17 more)

### Community 18 - "carte/eau.js"
Cohesion: 0.10
Nodes (20): bandCache, bandDiscs(), chaikinOpen(), drawPlantesEau(), isleWide(), joinTributary(), LAC_DIST, lakeShape() (+12 more)

### Community 19 - "caravane.js"
Cohesion: 0.16
Nodes (24): caravan, caravanCity(), caravanSend, caravanTo(), cityAt(), cityLabel(), drawCaravanIcon(), finishCaravan() (+16 more)

### Community 20 - "retirer-lacs-monde.js"
Cohesion: 0.10
Nodes (20): bbox(), fautifs(), fs, gap(), [kr, kv, kl], P(), R, segD() (+12 more)

### Community 21 - "outils.js"
Cohesion: 0.11
Nodes (20): CHARIOT, CHARRETTE, CORDE, efficaciteOutil(), FUSIONS, MANCHE, MATERIAUX, meilleurOutil() (+12 more)

### Community 22 - "stepForester"
Cohesion: 0.24
Nodes (11): actDe(), croissanceAns(), foresterEtat(), forestierTick(), germinationJours(), grainesTotal(), hashEspece(), plantSpot() (+3 more)

### Community 23 - "vehicules.js"
Cohesion: 0.22
Nodes (21): peintBateau(), V_PROFIL, vBarque(), vBarqueCoque(), vBois(), vContours(), vCoque(), vEclairage() (+13 more)

### Community 24 - "build-fishing.js"
Cohesion: 0.13
Nodes (19): coastZone(), fc, fs, hitsBox(), kmDeg(), labelPoint(), lands, nameSeed() (+11 more)

### Community 25 - "package.json"
Cohesion: 0.09
Nodes (21): author, dependencies, @resvg/resvg-js, topojson-client, topojson-server, topojson-simplify, @turf/turf, description (+13 more)

### Community 26 - "catalogue.js"
Cohesion: 0.09
Nodes (21): BUILD_MENUS, CAPACITE_KG, CHARGE_CHARRETTE, chargeHabitant(), chargeMax(), chargesTexte(), COUTS, EXT (+13 more)

### Community 27 - "carte/routes.js"
Cohesion: 0.16
Nodes (18): applyZone(), chaikin(), drawRoads(), EDGE, filetsChemins(), FILL, hubAt(), lisser() (+10 more)

### Community 28 - "terrestres.js"
Cohesion: 0.18
Nodes (20): drawTerrestres(), drawVoies(), marcheAu(), marcheCle(), marchePose(), marcher(), marcheRt, marcheStep() (+12 more)

### Community 29 - "build-formes.js"
Cohesion: 0.10
Nodes (15): boxes, eachCoord(), fc, fs, near(), out, path, regions (+7 more)

### Community 30 - "chariots.js"
Cohesion: 0.23
Nodes (18): CH_CHEVAUX, chariotEtat(), chariotPas(), CHARIOTS, CHARIOTS_DEFAUT, chBancs(), chBois(), chCorde() (+10 more)

### Community 31 - "panneau.js"
Cohesion: 0.07
Nodes (39): changed(), COLL, commit(), dims(), findById(), findSel(), flash(), ghost() (+31 more)

### Community 32 - "stepJob"
Cohesion: 0.11
Nodes (41): accepte(), alerteBat(), approBatiment(), byDist(), capCollecte(), collectable(), deficits(), dispo() (+33 more)

### Community 33 - "tuiles.js"
Cohesion: 0.17
Nodes (21): cimesVues, cleanTile(), drawCimes(), drawDecor(), dropTile(), floraNear(), GPU, hit() (+13 more)

### Community 34 - "cultures.js"
Cohesion: 0.17
Nodes (14): CULTURE_DEFAUT, CULTURE_TYPE, cultureDe(), cultureId(), CULTURES, CULTURES_DEFAUT, cultureTexte(), cultureTick() (+6 more)

### Community 35 - "champs.js"
Cohesion: 0.19
Nodes (18): aireChamps(), aireSignee(), champAt(), champCentre(), champIssue(), champsDe(), clicChamp(), drawChampApercu() (+10 more)

### Community 36 - "zonage.js"
Cohesion: 0.18
Nodes (16): ancrages, cellAt(), computeOcc(), computeZones(), crossesWallAtGates(), fitsAt(), footprint(), maxGrade() (+8 more)

### Community 37 - "build-routes.js"
Cohesion: 0.12
Nodes (16): ctx, fs, game, json(), out, P(), path, r4() (+8 more)

### Community 38 - "geometrie.js"
Cohesion: 0.12
Nodes (8): resample(), corners(), inTerrain(), roadLen(), ROADS, round2(), segLen(), shrunk()

### Community 39 - "forme.js"
Cohesion: 0.21
Nodes (15): carveRivieres(), CLASSE_FLEUVE, dansRegion(), ecarteDesFleuves(), frontCache, frontiereTerrestre(), genereDepuisForme(), masqueAt() (+7 more)

### Community 40 - "economie.js"
Cohesion: 0.22
Nodes (15): dailyIncome(), ECO, economyDay(), economyTick(), FARM_EXCLUDE, fmtGold(), goodName(), initEconomy() (+7 more)

### Community 41 - "_rendu.js"
Cohesion: 0.12
Nodes (15): [a,b,c,d], ad, [D,x0,y0,x1,y1,out], fc, fs, H, HH, k (+7 more)

### Community 42 - "dev.js"
Cohesion: 0.14
Nodes (28): appliquerStocksDev(), articlesDe(), baseAction(), baseEnvoyer(), baseVariable(), CAP_BASE, commandesFaites, devMontrer() (+20 more)

### Community 43 - "regions.js"
Cohesion: 0.21
Nodes (15): buildings, drawMineIcon(), drawPortIcon(), initOwnership(), interactionBusy(), loadPlayerState(), ownedRegions, refreshOwnershipLayers() (+7 more)

### Community 44 - "build-regions.js"
Cohesion: 0.13
Nodes (13): ctx, fs, game, json(), path, read(), regions, ROOT (+5 more)

### Community 45 - "carte/capitale.js"
Cohesion: 0.18
Nodes (11): afficherCartes(), esc(), montrer(), nomForm, ONGLETS, OUTILS_CONSTRUCTION, ouvrir(), peindreVignettes() (+3 more)

### Community 46 - "navigation.js"
Cohesion: 0.22
Nodes (13): NAV, NAV_VIRAGE, NAV_VITESSE, navBateauAu(), navBesoin(), navChemin(), navEau(), navGrille() (+5 more)

### Community 47 - "simTick"
Cohesion: 0.17
Nodes (27): articleDe(), boisAuSol(), boisMax(), boisPlein(), capCharge(), chargeAmelio(), charretteGaree(), cutTree() (+19 more)

### Community 48 - "vue.js"
Cohesion: 0.19
Nodes (11): clampView(), Col, ctx, cv, fit(), fitContent(), minScale(), resize() (+3 more)

### Community 49 - "interface.js"
Cohesion: 0.14
Nodes (11): CONTINENT_BY_ID, CONTINENTS, EVENTS, NAV_ITEMS, NPC_REGION_IDS, RANKING, showView(), sidebar (+3 more)

### Community 50 - "build-nav-grid.js"
Cohesion: 0.16
Nodes (13): fc, fillPolygon(), fs, H, land, latOf(), rows, [SRC, DST] (+5 more)

### Community 51 - "baies.js"
Cohesion: 0.23
Nodes (12): BAIE_HUM, BAIE_TM, baieConvenance(), baieFeuillage(), baieFruit(), BAIES, baiesCandidats(), baiesClimat() (+4 more)

### Community 52 - "fortifications-dessin.js"
Cohesion: 0.26
Nodes (13): coneS(), drawGate(), drawTower(), drawWalls(), FORT, FORT_LEVELS, lvlOf(), roundTowerS() (+5 more)

### Community 53 - "ressources-test.js"
Cohesion: 0.26
Nodes (12): CAT_TEST, choixTest(), drawRessources(), drawRessourcesGhost(), effaceTest(), GLYPHES, glypheTest(), nomTest() (+4 more)

### Community 54 - "peche.js"
Cohesion: 0.21
Nodes (11): initFishingZones(), initFreshWaters(), initSeaLabels(), lakePolys, regionFishingZones(), regionResourcesHtml(), riverBoxes, SEA_LABELS (+3 more)

### Community 55 - "rendu.js"
Cohesion: 0.21
Nodes (11): BRIDGE, bridgeCache, bridges(), drawBridges(), drawWater(), junctionCache, opts, ptInPoly() (+3 more)

### Community 56 - "_controle-fleuves.js"
Cohesion: 0.18
Nodes (11): dist(), fs, grid, K(), km(), mesh, out, t (+3 more)

### Community 57 - "lisser-bords.js"
Cohesion: 0.19
Nodes (11): arcs, chaikin(), dpSeg(), ends, fs, IN, key(), newArcs (+3 more)

### Community 58 - "production.js"
Cohesion: 0.20
Nodes (11): affinerCave(), ANCIEN_PRODUIT, AUTO_SIMPLE, dureeEtape(), PRODUCTION_AUTO, PRODUCTIONS, produitDe(), produitsDe() (+3 more)

### Community 59 - "dessin.js"
Cohesion: 0.21
Nodes (6): drawHouse(), polyPath(), draw(), drawHighlights(), requestDraw(), strokeLine()

### Community 60 - "villageois.js"
Cohesion: 0.32
Nodes (10): peintVillageois(), viChapeau(), viEll(), viLigne(), VILLAGEOIS, VILLAGEOIS_DE, VILLAGEOIS_DEFAUT, viOutil() (+2 more)

### Community 61 - "serveur-logs.js"
Cohesion: 0.15
Nodes (15): base, BASE_DIR, BASE_FILE, baseSet(), DIR, ecrire(), FILE, fs (+7 more)

### Community 62 - "deplacements.js"
Cohesion: 0.40
Nodes (10): batimentSous(), contourner(), croise(), marcher(), porte(), procheRoute(), reseauRoutes(), surVoie() (+2 more)

### Community 63 - "trace.js"
Cohesion: 0.42
Nodes (9): drawDraft(), junctionOnRay(), linePoint(), nearestAnchor(), pointRoute(), snapToRoads(), tracePoint(), wallIssue() (+1 more)

### Community 64 - "_region-page.js"
Cohesion: 0.20
Nodes (3): fs, stub, vm

### Community 65 - "dessins.js"
Cohesion: 0.27
Nodes (7): bete(), BUILD_DRAW, contenuExt(), especesEnclos(), extLT(), FERME_ZONES, MINE_REP

### Community 66 - "arbres.js"
Cohesion: 0.33
Nodes (6): arbreFeuilles(), arbreFruit(), arbreLisse(), drawFruitiers(), FRUITIERS, peintArbre()

### Community 67 - "stats.js"
Cohesion: 0.20
Nodes (6): JOURNEE, journeeHtml(), rendreStats(), STATS, STATS_DEFAUT, statsChoisies()

### Community 68 - "_cdp.js"
Cohesion: 0.22
Nodes (7): CH, fs, os, path, proc, { spawn }, [url, png, expr]

### Community 69 - "_charge-page.js"
Cohesion: 0.22
Nodes (8): ctx, files, fs, html, [page, n], store, stub, vm

### Community 70 - "_controle-bords.js"
Cohesion: 0.25
Nodes (7): cr(), cross(), ex, fs, reg, t, tj

### Community 71 - "donnees-regions.js"
Cohesion: 0.36
Nodes (6): EMPTY_REGION, REGION_DATA, regionClimat(), regionInfo(), regionMeteo(), regionSoleil()

### Community 72 - "_lacs.js"
Cohesion: 0.25
Nodes (6): ctx, fs, ids, src, stub, vm

### Community 73 - "reparer-croisements.js"
Cohesion: 0.36
Nodes (7): arcs, cr(), find(), fs, inter(), t, xing()

### Community 74 - "atelier.js"
Cohesion: 0.48
Nodes (5): atelier, atelierHouse(), atelierSide(), drawAtelier(), fitAtelier()

### Community 75 - "lumieres.js"
Cohesion: 0.33
Nodes (6): drawLumieres(), LUM_COUL, lumCache, LUMIERES, SANS_TOIT, sourcesLumiere()

### Community 76 - "jeu/faune.js"
Cohesion: 0.38
Nodes (6): ANIMAL_COLORS, ANIMAL_ZONES, initAnimalZones(), regionAnimalZone, updateAnimalLayers(), zoneAnimals()

### Community 77 - "arrondir-cotes.js"
Cohesion: 0.29
Nodes (5): arcs, fs, out, t, use

### Community 78 - "tryLake"
Cohesion: 0.29
Nodes (7): cellOfPt(), lakeShape(), loinDesFrontieres(), loinDesRoutes(), onLand(), rayonKm(), tryLake()

### Community 79 - "_croisements.js"
Cohesion: 0.29
Nodes (5): ctx, fs, src, stub, vm

### Community 80 - "Paper Conquest"
Cohesion: 0.29
Nodes (6): Hébergement, Paper Conquest, Régénérer les données, Structure du projet, Suivi des versions, Utiliser le projet

### Community 82 - "cheminAnneaux"
Cohesion: 0.47
Nodes (6): cadreEtAnneaux(), cheminAnneaux(), clipTerre(), drawBorder(), drawSea(), seaBands()

### Community 84 - "besoins"
Cohesion: 0.19
Nodes (18): alimentsDe(), assouvir(), besoins(), capVivres(), courseCle(), etalCible(), etalNourriture(), etalsMarche() (+10 more)

### Community 85 - "wkey"
Cohesion: 0.19
Nodes (15): aBesoinStock(), aEnStock(), alertesMaj(), besoinsFonte(), entreesDe(), intrantsFonte(), intrantsMin(), manqueFonte() (+7 more)

### Community 86 - "developpeur.js"
Cohesion: 0.50
Nodes (4): applyDevFilters(), DEV_FILTERS, devState, setLayerVisible()

### Community 87 - "Données des régions"
Cohesion: 0.50
Nodes (3): Données des régions, Modifier les données, Une fiche de région

### Community 88 - "monter"
Cohesion: 0.67
Nodes (3): monter(), dessiner(), erreurs()

### Community 102 - "niveauDe"
Cohesion: 0.40
Nodes (10): estPorteur(), estPorteurBois(), estPortHut(), horsFonte(), nbCharrettes(), nbFond(), nbPort(), nbPortHut() (+2 more)

## Knowledge Gaps
- **569 isolated node(s):** `atelier`, `PRESETS`, `FOOD_LIST`, `EXT`, `FERME_EXT` (+564 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `jobSites()` connect `stepJob` to `champs.js`, `simulation.js`, `geometrie.js`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `inTerrain()` connect `geometrie.js` to `stepJob`, `forme.js`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `round2()` connect `geometrie.js` to `forme.js`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **What connects `atelier`, `PRESETS`, `FOOD_LIST` to the rest of the system?**
  _569 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `elements.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09596364608393478 - nodes in this community are weakly interconnected._
- **Should `Module build-waterways` be split into smaller, more focused modules?**
  _Cohesion score 0.02666666666666667 - nodes in this community are weakly interconnected._
- **Should `Module modele-regions` be split into smaller, more focused modules?**
  _Cohesion score 0.062409288824383166 - nodes in this community are weakly interconnected._