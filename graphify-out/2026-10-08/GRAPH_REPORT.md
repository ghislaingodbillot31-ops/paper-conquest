# Graph Report - Paper Conquest 2.0  (2026-10-07)

## Corpus Check
- 14 files · ~482,256 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1795 nodes · 3114 edges · 102 communities (92 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 57 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Module elements
- Module build-waterways
- Module modele-regions
- Module build-fleuves-ne
- Module bateaux
- Module demarrage
- Module generateur
- Module paysage
- Module poissons
- Module jeu/capitale
- Module capture
- Module reseau-routes
- Module arrivants
- Module ressources
- Module saisons
- Module coller-frontieres-fleuves
- Module gestion
- Module animaux
- Module carte/eau
- Module caravane
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 82
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100

## God Nodes (most connected - your core abstractions)
1. `LP()` - 54 edges
2. `lpts()` - 47 edges
3. `lw()` - 45 edges
4. `pathS()` - 45 edges
5. `shiftS()` - 32 edges
6. `simTick()` - 29 edges
7. `yardLT()` - 26 edges
8. `stepJob()` - 19 edges
9. `initBoat()` - 18 edges
10. `beamLT()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `genereDepuisForme()` --indirect_call--> `inTerrain()`  [INFERRED]
  js/carte/forme.js → js/carte/geometrie.js
- `initSelection()` --indirect_call--> `closeCapital()`  [INFERRED]
  js/jeu/construction.js → js/jeu/capitale.js
- `genereDepuisForme()` --indirect_call--> `round2()`  [INFERRED]
  js/carte/forme.js → js/carte/geometrie.js
- `renderRegionPanel()` --indirect_call--> `toggleBoatPlacing()`  [INFERRED]
  js/jeu/regions.js → js/jeu/bateaux.js
- `hitAny()` --indirect_call--> `hitLake()`  [INFERRED]
  js/carte/fortifications.js → js/carte/poissons.js

## Import Cycles
- None detected.

## Communities (102 total, 10 thin omitted)

### Community 0 - "Module elements"
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

### Community 5 - "Module demarrage"
Cohesion: 0.06
Nodes (37): ACTIVITES, AMELIO, AMELIO_FONDERIE, ameliorable(), amelios(), BESOIN, BOIS_PAR_ARBRE, CARRY (+29 more)

### Community 6 - "Module generateur"
Cohesion: 0.07
Nodes (34): ACACIA_PAL, between(), BIOME_RIVER, biomeLook(), biomeOf(), BIOMES, CONIFER_PAL, CONIFER_STEPS (+26 more)

### Community 7 - "Module paysage"
Cohesion: 0.10
Nodes (38): builtPolys(), canopeeSur(), classifyWoods(), computeFlora(), contourSegments(), crown(), drawWoods(), flora (+30 more)

### Community 8 - "Module poissons"
Cohesion: 0.12
Nodes (39): accesPeche(), airePoly(), choisirEau(), comestible(), connuTexte(), corpsDEau(), coupDeLigne(), drawEauPeche() (+31 more)

### Community 9 - "Module jeu/capitale"
Cohesion: 0.09
Nodes (31): CAPITAL_TABS, closeCapital(), openWindow(), renderCapitalView(), renderTabs(), renderWindow(), BUILDINGS, coastCache (+23 more)

### Community 10 - "Module capture"
Cohesion: 0.11
Nodes (33): animauxCapturables(), captures, choisirCapture(), demarrerCapture(), drawCaptureCibles(), drawFaune(), fang(), FAUNE (+25 more)

### Community 11 - "Module reseau-routes"
Cohesion: 0.13
Nodes (30): addExtraRoads(), allWindingLegs(), anyLandPath(), bboxOfCoords(), bboxOverlap(), bearingDeg(), bearingTurn(), borderWaypoints() (+22 more)

### Community 12 - "Module arrivants"
Cohesion: 0.13
Nodes (30): afficherDemande(), afficherStock(), ARR_DELAI, arrivants, arrivantsDessin(), arrivantsStep(), arrSave(), campColon() (+22 more)

### Community 13 - "Module ressources"
Cohesion: 0.08
Nodes (29): applyResourceFilter(), CROPS, FISH_ZONE_COLORS, FISH_ZONE_TYPES, FISHING_ZONES, FRESH_FISH, FRESH_FISH_NAMES, freshFishAt() (+21 more)

### Community 14 - "Module saisons"
Cohesion: 0.09
Nodes (30): aujourdhui(), clair01(), dateDe(), DOY_AUTOMNE, DOY_ETE, DOY_HIVER, DOY_PRINTEMPS, doyDe() (+22 more)

### Community 15 - "Module coller-frontieres-fleuves"
Cohesion: 0.08
Nodes (29): before, cellKey(), coastNodes, cross(), decoded, encode(), finish(), fs (+21 more)

### Community 16 - "Module gestion"
Cohesion: 0.14
Nodes (30): BAT_CAT, BAT_ICONE, batHtml(), batLive(), batOnglet, batPousseHtml(), batStockHtml(), batZoneHtml() (+22 more)

### Community 17 - "Module animaux"
Cohesion: 0.17
Nodes (25): aBois(), aBrin(), aCorps(), aCorpsPath(), aCorpsPts(), aCourbe(), aCroco(), aEffile() (+17 more)

### Community 18 - "Module carte/eau"
Cohesion: 0.10
Nodes (20): bandCache, bandDiscs(), chaikinOpen(), drawPlantesEau(), isleWide(), joinTributary(), LAC_DIST, lakeShape() (+12 more)

### Community 19 - "Module caravane"
Cohesion: 0.16
Nodes (24): caravan, caravanCity(), caravanSend, caravanTo(), cityAt(), cityLabel(), drawCaravanIcon(), finishCaravan() (+16 more)

### Community 20 - "Community 20"
Cohesion: 0.10
Nodes (20): bbox(), fautifs(), fs, gap(), [kr, kv, kl], P(), R, segD() (+12 more)

### Community 21 - "Community 21"
Cohesion: 0.11
Nodes (20): CHARIOT, CHARRETTE, CORDE, efficaciteOutil(), FUSIONS, MANCHE, MATERIAUX, meilleurOutil() (+12 more)

### Community 22 - "Community 22"
Cohesion: 0.12
Nodes (22): actDe(), chargeCueilleur(), croissanceAns(), cueilleurEtat(), dansZone(), drawWorkZones(), especeDe(), foresterEtat() (+14 more)

### Community 23 - "Community 23"
Cohesion: 0.22
Nodes (21): peintBateau(), V_PROFIL, vBarque(), vBarqueCoque(), vBois(), vContours(), vCoque(), vEclairage() (+13 more)

### Community 24 - "Community 24"
Cohesion: 0.13
Nodes (19): coastZone(), fc, fs, hitsBox(), kmDeg(), labelPoint(), lands, nameSeed() (+11 more)

### Community 25 - "Community 25"
Cohesion: 0.09
Nodes (21): author, dependencies, @resvg/resvg-js, topojson-client, topojson-server, topojson-simplify, @turf/turf, description (+13 more)

### Community 26 - "Community 26"
Cohesion: 0.10
Nodes (14): BUILD_MENUS, categorieArticle(), CHARGE_CHARRETTE, chargeMax(), COUTS, EXT, FERME_EXT, FOOD_LIST (+6 more)

### Community 27 - "Community 27"
Cohesion: 0.15
Nodes (17): applyZone(), chaikin(), drawRoads(), EDGE, FILL, hubAt(), lisser(), PAT (+9 more)

### Community 28 - "Community 28"
Cohesion: 0.18
Nodes (20): drawTerrestres(), drawVoies(), marcheAu(), marcheCle(), marchePose(), marcher(), marcheRt, marcheStep() (+12 more)

### Community 29 - "Community 29"
Cohesion: 0.10
Nodes (15): boxes, eachCoord(), fc, fs, near(), out, path, regions (+7 more)

### Community 30 - "Community 30"
Cohesion: 0.23
Nodes (18): CH_CHEVAUX, chariotEtat(), chariotPas(), CHARIOTS, CHARIOTS_DEFAUT, chBancs(), chBois(), chCorde() (+10 more)

### Community 31 - "Community 31"
Cohesion: 0.16
Nodes (15): addRoadPoint(), finishDraft(), fixGates(), gateAnchors(), gateFromAnchor(), gateSpot(), hitAny(), hitGate() (+7 more)

### Community 32 - "Community 32"
Cohesion: 0.19
Nodes (20): accepte(), byDist(), capCollecte(), collectable(), dispo(), drawWorkers(), fermeExt(), hasOxen() (+12 more)

### Community 33 - "Community 33"
Cohesion: 0.21
Nodes (19): cleanTile(), drawDecor(), dropTile(), floraNear(), GPU, hit(), invalidateTiles(), markAllDirty() (+11 more)

### Community 34 - "Community 34"
Cohesion: 0.17
Nodes (14): CULTURE_DEFAUT, CULTURE_TYPE, cultureDe(), cultureId(), CULTURES, CULTURES_DEFAUT, cultureTexte(), cultureTick() (+6 more)

### Community 35 - "Community 35"
Cohesion: 0.19
Nodes (18): aireChamps(), aireSignee(), champAt(), champCentre(), champIssue(), champsDe(), clicChamp(), drawChampApercu() (+10 more)

### Community 36 - "Community 36"
Cohesion: 0.18
Nodes (16): ancrages, cellAt(), computeOcc(), computeZones(), crossesWallAtGates(), fitsAt(), footprint(), maxGrade() (+8 more)

### Community 37 - "Community 37"
Cohesion: 0.12
Nodes (16): ctx, fs, game, json(), out, P(), path, r4() (+8 more)

### Community 38 - "Community 38"
Cohesion: 0.12
Nodes (8): resample(), corners(), inTerrain(), roadLen(), ROADS, round2(), segLen(), shrunk()

### Community 39 - "Community 39"
Cohesion: 0.21
Nodes (15): carveRivieres(), CLASSE_FLEUVE, dansRegion(), ecarteDesFleuves(), frontCache, frontiereTerrestre(), genereDepuisForme(), masqueAt() (+7 more)

### Community 40 - "Community 40"
Cohesion: 0.22
Nodes (15): dailyIncome(), ECO, economyDay(), economyTick(), FARM_EXCLUDE, fmtGold(), goodName(), initEconomy() (+7 more)

### Community 41 - "Community 41"
Cohesion: 0.12
Nodes (15): [a,b,c,d], ad, [D,x0,y0,x1,y1,out], fc, fs, H, HH, k (+7 more)

### Community 42 - "Community 42"
Cohesion: 0.15
Nodes (10): chargeClimat(), drawable, freeCells, GALLERY_GROUPS, majHeure(), majSaison(), mini(), presetBtn() (+2 more)

### Community 43 - "Community 43"
Cohesion: 0.21
Nodes (15): buildings, drawMineIcon(), drawPortIcon(), initOwnership(), interactionBusy(), loadPlayerState(), ownedRegions, refreshOwnershipLayers() (+7 more)

### Community 44 - "Community 44"
Cohesion: 0.13
Nodes (13): ctx, fs, game, json(), path, read(), regions, ROOT (+5 more)

### Community 45 - "Community 45"
Cohesion: 0.18
Nodes (11): afficherCartes(), esc(), montrer(), nomForm, ONGLETS, OUTILS_CONSTRUCTION, ouvrir(), peindreVignettes() (+3 more)

### Community 46 - "Community 46"
Cohesion: 0.22
Nodes (13): NAV, NAV_VIRAGE, NAV_VITESSE, navBateauAu(), navBesoin(), navChemin(), navEau(), navGrille() (+5 more)

### Community 47 - "Community 47"
Cohesion: 0.25
Nodes (15): boisAuSol(), capCharge(), chargeAmelio(), charretteGaree(), cutTree(), etalsStep(), marcheOuvert(), niveau() (+7 more)

### Community 48 - "Community 48"
Cohesion: 0.19
Nodes (11): clampView(), Col, ctx, cv, fit(), fitContent(), minScale(), resize() (+3 more)

### Community 49 - "Community 49"
Cohesion: 0.14
Nodes (11): CONTINENT_BY_ID, CONTINENTS, EVENTS, NAV_ITEMS, NPC_REGION_IDS, RANKING, showView(), sidebar (+3 more)

### Community 50 - "Community 50"
Cohesion: 0.16
Nodes (13): fc, fillPolygon(), fs, H, land, latOf(), rows, [SRC, DST] (+5 more)

### Community 51 - "Community 51"
Cohesion: 0.23
Nodes (12): BAIE_HUM, BAIE_TM, baieConvenance(), baieFeuillage(), baieFruit(), BAIES, baiesCandidats(), baiesClimat() (+4 more)

### Community 52 - "Community 52"
Cohesion: 0.26
Nodes (13): coneS(), drawGate(), drawTower(), drawWalls(), FORT, FORT_LEVELS, lvlOf(), roundTowerS() (+5 more)

### Community 53 - "Community 53"
Cohesion: 0.26
Nodes (12): CAT_TEST, choixTest(), drawRessources(), drawRessourcesGhost(), effaceTest(), GLYPHES, glypheTest(), nomTest() (+4 more)

### Community 54 - "Community 54"
Cohesion: 0.21
Nodes (11): initFishingZones(), initFreshWaters(), initSeaLabels(), lakePolys, regionFishingZones(), regionResourcesHtml(), riverBoxes, SEA_LABELS (+3 more)

### Community 55 - "Community 55"
Cohesion: 0.21
Nodes (11): BRIDGE, bridgeCache, bridges(), drawBridges(), drawWater(), junctionCache, opts, ptInPoly() (+3 more)

### Community 56 - "Community 56"
Cohesion: 0.18
Nodes (11): dist(), fs, grid, K(), km(), mesh, out, t (+3 more)

### Community 57 - "Community 57"
Cohesion: 0.19
Nodes (11): arcs, chaikin(), dpSeg(), ends, fs, IN, key(), newArcs (+3 more)

### Community 58 - "Community 58"
Cohesion: 0.23
Nodes (8): affinerCave(), ANCIEN_PRODUIT, dureeEtape(), PRODUCTION_AUTO, PRODUCTIONS, produitDe(), produitsDe(), stepProduction()

### Community 59 - "Community 59"
Cohesion: 0.21
Nodes (6): drawHouse(), polyPath(), draw(), drawHighlights(), requestDraw(), strokeLine()

### Community 60 - "Community 60"
Cohesion: 0.32
Nodes (10): peintVillageois(), viChapeau(), viEll(), viLigne(), VILLAGEOIS, VILLAGEOIS_DE, VILLAGEOIS_DEFAUT, viOutil() (+2 more)

### Community 61 - "Community 61"
Cohesion: 0.35
Nodes (10): changed(), COLL, commit(), dims(), findById(), findSel(), flash(), ghost() (+2 more)

### Community 62 - "Community 62"
Cohesion: 0.40
Nodes (10): batimentSous(), contourner(), croise(), marcher(), porte(), procheRoute(), reseauRoutes(), surVoie() (+2 more)

### Community 63 - "Community 63"
Cohesion: 0.42
Nodes (9): drawDraft(), junctionOnRay(), linePoint(), nearestAnchor(), pointRoute(), snapToRoads(), tracePoint(), wallIssue() (+1 more)

### Community 64 - "Community 64"
Cohesion: 0.20
Nodes (3): fs, stub, vm

### Community 65 - "Community 65"
Cohesion: 0.31
Nodes (8): bete(), BUILD_DRAW, contenuExt(), EMPLACEMENTS_ETALS, especesEnclos(), extLT(), FERME_ZONES, MINE_REP

### Community 66 - "Community 66"
Cohesion: 0.33
Nodes (6): arbreFeuilles(), arbreFruit(), arbreLisse(), drawFruitiers(), FRUITIERS, peintArbre()

### Community 67 - "Community 67"
Cohesion: 0.36
Nodes (9): estProducteur(), etalNourriture(), etalsDe(), etalsMarche(), gardeDe(), gardePct(), jobOf(), marcheDe() (+1 more)

### Community 68 - "Community 68"
Cohesion: 0.22
Nodes (7): CH, fs, os, path, proc, { spawn }, [url, png, expr]

### Community 69 - "Community 69"
Cohesion: 0.22
Nodes (8): ctx, files, fs, html, [page, n], store, stub, vm

### Community 70 - "Community 70"
Cohesion: 0.25
Nodes (7): cr(), cross(), ex, fs, reg, t, tj

### Community 71 - "Community 71"
Cohesion: 0.36
Nodes (6): EMPTY_REGION, REGION_DATA, regionClimat(), regionInfo(), regionMeteo(), regionSoleil()

### Community 72 - "Community 72"
Cohesion: 0.25
Nodes (6): ctx, fs, ids, src, stub, vm

### Community 73 - "Community 73"
Cohesion: 0.36
Nodes (7): arcs, cr(), find(), fs, inter(), t, xing()

### Community 74 - "Community 74"
Cohesion: 0.48
Nodes (5): atelier, atelierHouse(), atelierSide(), drawAtelier(), fitAtelier()

### Community 75 - "Community 75"
Cohesion: 0.33
Nodes (6): drawLumieres(), LUM_COUL, lumCache, LUMIERES, SANS_TOIT, sourcesLumiere()

### Community 76 - "Community 76"
Cohesion: 0.38
Nodes (6): ANIMAL_COLORS, ANIMAL_ZONES, initAnimalZones(), regionAnimalZone, updateAnimalLayers(), zoneAnimals()

### Community 77 - "Community 77"
Cohesion: 0.29
Nodes (5): arcs, fs, out, t, use

### Community 78 - "Community 78"
Cohesion: 0.29
Nodes (7): cellOfPt(), lakeShape(), loinDesFrontieres(), loinDesRoutes(), onLand(), rayonKm(), tryLake()

### Community 79 - "Community 79"
Cohesion: 0.29
Nodes (5): ctx, fs, src, stub, vm

### Community 80 - "Community 80"
Cohesion: 0.29
Nodes (6): Hébergement, Paper Conquest, Régénérer les données, Structure du projet, Suivi des versions, Utiliser le projet

### Community 82 - "Community 82"
Cohesion: 0.47
Nodes (6): cadreEtAnneaux(), cheminAnneaux(), clipTerre(), drawBorder(), drawSea(), seaBands()

### Community 84 - "Community 84"
Cohesion: 0.60
Nodes (5): assouvir(), besoins(), capVivres(), foyerDe(), vivresTotal()

### Community 85 - "Community 85"
Cohesion: 0.60
Nodes (5): estRepos(), lieuDeRepos(), phaseJour(), reposNuit(), wkey()

### Community 86 - "Community 86"
Cohesion: 0.50
Nodes (4): applyDevFilters(), DEV_FILTERS, devState, setLayerVisible()

### Community 87 - "Community 87"
Cohesion: 0.50
Nodes (3): Données des régions, Modifier les données, Une fiche de région

### Community 88 - "Community 88"
Cohesion: 0.67
Nodes (3): monter(), dessiner(), erreurs()

## Knowledge Gaps
- **533 isolated node(s):** `GRASS`, `OAK`, `OLD_STRAW`, `SHINGLE`, `SLATE` (+528 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `simLoop()` connect `Module demarrage` to `Community 47`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `resize()` connect `Community 48` to `Module demarrage`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `hitAny()` connect `Community 31` to `Module poissons`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **What connects `GRASS`, `OAK`, `OLD_STRAW` to the rest of the system?**
  _533 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Module elements` be split into smaller, more focused modules?**
  _Cohesion score 0.09596364608393478 - nodes in this community are weakly interconnected._
- **Should `Module build-waterways` be split into smaller, more focused modules?**
  _Cohesion score 0.02666666666666667 - nodes in this community are weakly interconnected._
- **Should `Module modele-regions` be split into smaller, more focused modules?**
  _Cohesion score 0.062409288824383166 - nodes in this community are weakly interconnected._