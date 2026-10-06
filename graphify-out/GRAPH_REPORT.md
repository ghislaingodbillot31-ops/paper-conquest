# Graph Report - Paper Conquest 2.0  (2026-10-06)

## Corpus Check
- 85 files · ~174,389 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1168 nodes · 1962 edges · 65 communities (54 shown, 11 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 53 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Dessins de bâtiments
- Génération des fleuves
- Modèle des régions
- Fleuves Natural Earth
- Bateaux
- Actions de l'éditeur
- Eau (carte)
- Fenêtre capitale
- Paysage et végétation
- Réseau de routes
- Simulation
- Ressources et pêche
- Frontières et fleuves
- Générateur de carte
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
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
- Community 48
- Community 49
- Community 50
- Community 52
- Community 53
- Community 54
- Community 55
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63

## God Nodes (most connected - your core abstractions)
1. `LP()` - 55 edges
2. `lpts()` - 48 edges
3. `pathS()` - 46 edges
4. `lw()` - 45 edges
5. `shiftS()` - 32 edges
6. `yardLT()` - 26 edges
7. `initBoat()` - 18 edges
8. `beamLT()` - 15 edges
9. `kmDe()` - 12 edges
10. `beastLT()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `genereDepuisForme()` --indirect_call--> `round2()`  [INFERRED]
  js/carte/forme.js → js/carte/geometrie.js
- `initSelection()` --indirect_call--> `closeCapital()`  [INFERRED]
  js/jeu/construction.js → js/jeu/capitale.js
- `requestDraw()` --indirect_call--> `draw()`  [INFERRED]
  js/carte/dessin.js → js/carte/dessin-principal.js
- `resample()` --indirect_call--> `round2()`  [INFERRED]
  js/carte/eau.js → js/carte/geometrie.js
- `renderSel()` --indirect_call--> `swap()`  [INFERRED]
  js/carte/panneau.js → js/carte/fortifications.js

## Import Cycles
- None detected.

## Communities (65 total, 11 thin omitted)

### Community 0 - "Dessins de bâtiments"
Cohesion: 0.10
Nodes (87): addS(), anvilLT(), arrowsLT(), axeLT(), barrelLT(), barrowLT(), basketLT(), beamLT() (+79 more)

### Community 1 - "Génération des fleuves"
Cohesion: 0.03
Nodes (56): AUS_RANGES, AUS_RIDGE, avantOuverture, basins, BOX, boxesO, capCases, CAPITALES (+48 more)

### Community 2 - "Modèle des régions"
Cohesion: 0.06
Nodes (45): applyWaterFish(), ARID_CENTERS, aridColor(), aridityAt(), band(), clamp01(), climateColorAt(), computeAnimalZones() (+37 more)

### Community 3 - "Fleuves Natural Earth"
Cohesion: 0.06
Nodes (47): bilanFin, boite(), boites, cases, chaikin(), chaines(), cours, densifie() (+39 more)

### Community 4 - "Bateaux"
Cohesion: 0.11
Nodes (47): boat, boatHint(), boatStatusText(), cancelSend(), capitalById, createNavigator(), cellOf(), findPath() (+39 more)

### Community 5 - "Actions de l'éditeur"
Cohesion: 0.07
Nodes (36): changed(), COLL, commit(), dims(), findById(), findSel(), flash(), ghost() (+28 more)

### Community 6 - "Eau (carte)"
Cohesion: 0.06
Nodes (23): bandCache, bandDiscs(), chaikinOpen(), isleWide(), joinTributary(), LAC_DIST, lakeShapeCache, resample() (+15 more)

### Community 7 - "Fenêtre capitale"
Cohesion: 0.09
Nodes (31): CAPITAL_TABS, closeCapital(), openWindow(), renderCapitalView(), renderTabs(), renderWindow(), BUILDINGS, coastCache (+23 more)

### Community 8 - "Paysage et végétation"
Cohesion: 0.11
Nodes (35): builtPolys(), classifyWoods(), computeFlora(), contourSegments(), crown(), drawWoods(), flora, floraCandidates() (+27 more)

### Community 9 - "Réseau de routes"
Cohesion: 0.13
Nodes (30): addExtraRoads(), allWindingLegs(), anyLandPath(), bboxOfCoords(), bboxOverlap(), bearingDeg(), bearingTurn(), borderWaypoints() (+22 more)

### Community 10 - "Simulation"
Cohesion: 0.12
Nodes (31): inTerrain(), byDist(), CARRY, collectable(), cutTree(), drawWorkers(), drawWorkZones(), FORESTER_STATE (+23 more)

### Community 11 - "Ressources et pêche"
Cohesion: 0.08
Nodes (29): applyResourceFilter(), CROPS, FISH_ZONE_COLORS, FISH_ZONE_TYPES, FISHING_ZONES, FRESH_FISH, FRESH_FISH_NAMES, freshFishAt() (+21 more)

### Community 12 - "Frontières et fleuves"
Cohesion: 0.08
Nodes (29): before, cellKey(), coastNodes, cross(), decoded, encode(), finish(), fs (+21 more)

### Community 13 - "Générateur de carte"
Cohesion: 0.10
Nodes (27): ACACIA_PAL, between(), BIOME_RIVER, biomeLook(), biomeOf(), BIOMES, CONIFER_PAL, CONIFER_STEPS (+19 more)

### Community 14 - "Community 14"
Cohesion: 0.16
Nodes (24): caravan, caravanCity(), caravanSend, caravanTo(), cityAt(), cityLabel(), drawCaravanIcon(), finishCaravan() (+16 more)

### Community 15 - "Community 15"
Cohesion: 0.13
Nodes (19): coastZone(), fc, fs, hitsBox(), kmDeg(), labelPoint(), lands, nameSeed() (+11 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (21): author, dependencies, @resvg/resvg-js, topojson-client, topojson-server, topojson-simplify, @turf/turf, description (+13 more)

### Community 17 - "Community 17"
Cohesion: 0.10
Nodes (15): boxes, eachCoord(), fc, fs, near(), out, path, regions (+7 more)

### Community 18 - "Community 18"
Cohesion: 0.21
Nodes (18): cadreEtAnneaux(), cheminAnneaux(), CLASSE_FLEUVE, clipTerre(), dansRegion(), drawBorder(), drawMouths(), drawSea() (+10 more)

### Community 19 - "Community 19"
Cohesion: 0.21
Nodes (19): cleanTile(), drawDecor(), dropTile(), floraNear(), GPU, hit(), invalidateTiles(), markAllDirty() (+11 more)

### Community 20 - "Community 20"
Cohesion: 0.12
Nodes (16): ctx, fs, game, json(), out, P(), path, r4() (+8 more)

### Community 21 - "Community 21"
Cohesion: 0.18
Nodes (14): applyZone(), chaikin(), drawRoads(), EDGE, FILL, hubAt(), PAT, pinEnd() (+6 more)

### Community 22 - "Community 22"
Cohesion: 0.20
Nodes (16): toggleBoatPlacing(), buildings, drawMineIcon(), drawPortIcon(), initOwnership(), interactionBusy(), loadPlayerState(), ownedRegions (+8 more)

### Community 23 - "Community 23"
Cohesion: 0.22
Nodes (15): dailyIncome(), ECO, economyDay(), economyTick(), FARM_EXCLUDE, fmtGold(), goodName(), initEconomy() (+7 more)

### Community 24 - "Community 24"
Cohesion: 0.12
Nodes (16): [a,b,c,d], ad, [D,x0,y0,x1,y1,out], fc, fs, H, HH, k (+8 more)

### Community 25 - "Community 25"
Cohesion: 0.13
Nodes (13): ctx, fs, game, json(), path, read(), regions, ROOT (+5 more)

### Community 26 - "Community 26"
Cohesion: 0.19
Nodes (11): clampView(), Col, ctx, cv, fit(), fitContent(), minScale(), resize() (+3 more)

### Community 27 - "Community 27"
Cohesion: 0.14
Nodes (11): CONTINENT_BY_ID, CONTINENTS, EVENTS, NAV_ITEMS, NPC_REGION_IDS, RANKING, showView(), sidebar (+3 more)

### Community 28 - "Community 28"
Cohesion: 0.16
Nodes (13): fc, fillPolygon(), fs, H, land, latOf(), rows, [SRC, DST] (+5 more)

### Community 29 - "Community 29"
Cohesion: 0.22
Nodes (11): afficherCartes(), esc(), montrer(), nomForm, ONGLETS, OUTILS_CONSTRUCTION, ouvrir(), peindreVignettes() (+3 more)

### Community 30 - "Community 30"
Cohesion: 0.26
Nodes (13): coneS(), drawGate(), drawTower(), drawWalls(), FORT, FORT_LEVELS, lvlOf(), roundTowerS() (+5 more)

### Community 31 - "Community 31"
Cohesion: 0.26
Nodes (13): cellAt(), computeOcc(), computeZones(), crossesWallAtGates(), fitsAt(), footprint(), maxGrade(), placeAt() (+5 more)

### Community 32 - "Community 32"
Cohesion: 0.21
Nodes (11): initFishingZones(), initFreshWaters(), initSeaLabels(), lakePolys, regionFishingZones(), regionResourcesHtml(), riverBoxes, SEA_LABELS (+3 more)

### Community 33 - "Community 33"
Cohesion: 0.21
Nodes (11): BRIDGE, bridgeCache, bridges(), drawBridges(), drawWater(), junctionCache, opts, ptInPoly() (+3 more)

### Community 34 - "Community 34"
Cohesion: 0.18
Nodes (11): dist(), fs, grid, K(), km(), mesh, out, t (+3 more)

### Community 35 - "Community 35"
Cohesion: 0.19
Nodes (11): arcs, chaikin(), dpSeg(), ends, fs, IN, key(), newArcs (+3 more)

### Community 36 - "Community 36"
Cohesion: 0.17
Nodes (6): BUILD_MENUS, EXT, FOOD_LIST, NONFOOD_LIST, PRESETS, YARD_OLD

### Community 37 - "Community 37"
Cohesion: 0.23
Nodes (7): drawHouse(), haloText(), polyPath(), draw(), drawHighlights(), requestDraw(), strokeLine()

### Community 38 - "Community 38"
Cohesion: 0.44
Nodes (8): drawDraft(), junctionOnRay(), linePoint(), nearestAnchor(), snapToRoads(), tracePoint(), wallIssue(), wallSegOk()

### Community 39 - "Community 39"
Cohesion: 0.25
Nodes (7): cr(), cross(), ex, fs, reg, t, tj

### Community 40 - "Community 40"
Cohesion: 0.25
Nodes (6): ctx, fs, ids, src, stub, vm

### Community 41 - "Community 41"
Cohesion: 0.36
Nodes (7): arcs, cr(), find(), fs, inter(), t, xing()

### Community 42 - "Community 42"
Cohesion: 0.48
Nodes (5): atelier, atelierHouse(), atelierSide(), drawAtelier(), fitAtelier()

### Community 43 - "Community 43"
Cohesion: 0.38
Nodes (6): ANIMAL_COLORS, ANIMAL_ZONES, initAnimalZones(), regionAnimalZone, updateAnimalLayers(), zoneAnimals()

### Community 44 - "Community 44"
Cohesion: 0.29
Nodes (5): arcs, fs, out, t, use

### Community 45 - "Community 45"
Cohesion: 0.29
Nodes (7): cellOfPt(), lakeShape(), loinDesFrontieres(), loinDesRoutes(), onLand(), rayonKm(), tryLake()

### Community 46 - "Community 46"
Cohesion: 0.29
Nodes (5): ctx, fs, src, stub, vm

### Community 48 - "Community 48"
Cohesion: 0.80
Nodes (4): marcher(), procheRoute(), reseauRoutes(), trajet()

### Community 49 - "Community 49"
Cohesion: 0.50
Nodes (4): applyDevFilters(), DEV_FILTERS, devState, setLayerVisible()

## Knowledge Gaps
- **379 isolated node(s):** `atelier`, `PRESETS`, `FOOD_LIST`, `NONFOOD_LIST`, `EXT` (+374 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `round2()` connect `Eau (carte)` to `Community 18`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `inTerrain()` connect `Simulation` to `Eau (carte)`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `atelier`, `PRESETS`, `FOOD_LIST` to the rest of the system?**
  _379 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dessins de bâtiments` be split into smaller, more focused modules?**
  _Cohesion score 0.09508881922675026 - nodes in this community are weakly interconnected._
- **Should `Génération des fleuves` be split into smaller, more focused modules?**
  _Cohesion score 0.02666666666666667 - nodes in this community are weakly interconnected._
- **Should `Modèle des régions` be split into smaller, more focused modules?**
  _Cohesion score 0.062409288824383166 - nodes in this community are weakly interconnected._
- **Should `Fleuves Natural Earth` be split into smaller, more focused modules?**
  _Cohesion score 0.06274509803921569 - nodes in this community are weakly interconnected._