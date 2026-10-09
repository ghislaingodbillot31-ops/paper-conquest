# Graph Report - Paper Conquest 2.0  (2026-10-09)

## Corpus Check
- 106 files · ~542,032 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2148 nodes · 3824 edges · 108 communities (97 shown, 11 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 108 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- elements.js / LP()
- build-waterways.js / addLake()
- simulation.js / stepCueilleur()
- bateaux.js / regions.js
- modele-regions.js / regionProfile()
- build-fleuves-ne.js / kmDe()
- panneau.js / fortifications.js
- forme.js / geometrie.js
- poissons.js / drawEauPeche()
- carte/faune.js / fauneLibre()
- carte/routes.js / DOMINIUM world globe
- gestion.js / batHtml()
- cultures.js / valider-production.js
- paysage.js / computeFlora()
- generateur.js / generateRegion()
- dev.js / baseAction()
- construction.js / jeu/capitale.js
- stepJob() / stockPlein()
- reseau-routes.js / landPath()
- arrivants.js / arrivantsStep()
- ressources.js / applyResourceFilter()
- saisons.js / majNuit()
- coller-frontieres-fleuves.js / newArcs
- DOMINIUM (jeu de gestion pol / Editeur de carte
- animaux.js / aQuad()
- catalogue.js / chargeMax()
- caravane.js / initCaravan()
- carte/eau.js / joinTributary()
- outils.js / meilleurOutil()
- retirer-lacs-monde.js / controle-lacs-monde.js
- simTick() / besoins()
- tuiles.js / markDirty()
- vehicules.js / vVoilier()
- Arbres fruitiers sprite shee / Poirier (yellow pears)
- remplirMaison() / assouvir()
- build-fishing.js / ovalZone()
- package.json / dependencies
- terrestres.js / marcher()
- build-formes.js / boxes
- chariots.js / peintChariot()
- maxRes() / aBesoinStock()
- champs.js / clicChamp()
- zonage.js / computeZones()
- build-routes.js / read()
- economie.js / economyTick()
- _rendu.js / P()
- serveur-logs.js / baseSet()
- build-regions.js / read()
- carte/capitale.js / afficherCartes()
- navigation.js / navChemin()
- stepBucheron() / stepBucheronCharrette()
- World Climate Zones Map (Cli / World Climate Types Map (Les
- cadre.js / drawFormesSol()
- vue.js / resize()
- interface.js / showView()
- build-nav-grid.js / fillPolygon()
- production.js / stepProduction()
- baies.js / baiesCandidats()
- fortifications-dessin.js / drawGate()
- ressources-test.js / nomTest()
- peche.js / initFishingZones()
- villageois.js / peintVillageois()
- rendu.js / bridges()
- _controle-fleuves.js / dist()
- lisser-bords.js / newArcs
- dessin.js / polyPath()
- stats.js / rendreStats()
- deplacements.js / trajet()
- dessins.js / contenuExt()
- niveauDe() / nbTrav()
- trace.js / tracePoint()
- _region-page.js / addEventListener()
- arbres.js / peintArbre()
- decors.js / decorsValides()
- _cdp.js / CH
- _charge-page.js / ctx
- _controle-bords.js / cr()
- Paper Conquest world-map sta / Right region detail panel (E
- accueil.js / effacerPartie()
- donnees-regions.js / regionClimat()
- _lacs.js / ctx
- reparer-croisements.js / cr()
- Carte bathymetrique de l'arc / Ile principale avec 5 massif
- atelier.js / atelierSide()
- lumieres.js / drawLumieres()
- jeu/faune.js / initAnimalZones()
- arrondir-cotes.js / arcs
- tryLake() / cellOfPt()
- _croisements.js / ctx
- joueur.js / ecrireJoueur()
- stepChasseur() / proiesDe()
- developpeur.js / applyDevFilters()
- jeu/routes.js / geoDistance()
- base.js / GAME
- cellKm2() / latAt()
- cutAtConfluence() / fineCell()
- gkey() / posee()
- kmEntre() / voisins()
- r3() / resample()
- seaPoint() / snakeRiver()
- _chaine-lacs.sh / _chaine-lacs.sh script
- Capture tool page

## God Nodes (most connected - your core abstractions)
1. `LP()` - 54 edges
2. `lpts()` - 47 edges
3. `pathS()` - 45 edges
4. `lw()` - 45 edges
5. `simTick()` - 44 edges
6. `shiftS()` - 32 edges
7. `yardLT()` - 27 edges
8. `Arbres fruitiers sprite sheet (20 species, top view)` - 21 edges
9. `batHtml()` - 20 edges
10. `stepJob()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Arbres fruitiers (validation)` --semantically_similar_to--> `Arbustes a baies (26 especes)`  [INFERRED] [semantically similar]
  arbres-fruitiers.html → arbustes-baies.html
- `DOMINIUM (jeu de gestion politique et territoriale)` --references--> `Page d'accueil`  [INFERRED]
  README.md → accueil.html
- `DOMINIUM (jeu de gestion politique et territoriale)` --references--> `Arbre des ressources`  [INFERRED]
  README.md → arbre-ressources.html
- `DOMINIUM (jeu de gestion politique et territoriale)` --references--> `Arbres fruitiers (validation)`  [INFERRED]
  README.md → arbres-fruitiers.html
- `DOMINIUM (jeu de gestion politique et territoriale)` --references--> `Arbustes a baies (26 especes)`  [INFERRED]
  README.md → arbustes-baies.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Bottom dashboard panels (world situation, top 5, events)** — reference_e5196060_world_situation_chart, reference_e5196060_top5_powers, reference_e5196060_recent_events [EXTRACTED 1.00]
- **Eight world climate types in the legend** — reference_ig1100_5_climat_oceanique, reference_climat_continental, reference_climat_mediterraneen, reference_climat_polaire, reference_ig1100_5_climat_de_montagne, reference_climat_equatorial, reference_climat_tropical, reference_ig1100_5_climat_desertique [EXTRACTED 1.00]
- **World climate zone classification (10 zones)** — reference_climat_equatorial, reference_climat_tropical, reference_climat_mousson, reference_climat_mediterraneen, reference_climat_oceanique, reference_climat_chinois, reference_climat_aride, reference_climat_continental, reference_climat_montagnard, reference_climat_polaire [EXTRACTED 1.00]
- **Citrus trees** — arbres_fruitiers_oranger, arbres_fruitiers_citronnier [INFERRED 0.75]
- **Pages editeurs/validation DOMINIUM** — editeur_carte, editeur_batiments, editeur_animaux, decors_sol [INFERRED 0.75]
- **Studio hub tabs Jeu/Dev/Design** — c_usersghislaindesktoppaper_conquest_2_0_studio, c_usersghislaindesktoppaper_conquest_2_0_index, c_usersghislaindesktoppaper_conquest_2_0_region, c_usersghislaindesktoppaper_conquest_2_0_editeur_routes, c_usersghislaindesktoppaper_conquest_2_0_validation_production [INFERRED 0.75]
- **Nut-bearing trees** — arbres_fruitiers_amandier, arbres_fruitiers_noyer, arbres_fruitiers_noisetier, arbres_fruitiers_chataignier [INFERRED 0.85]

## Communities (108 total, 11 thin omitted)

### Community 0 - "elements.js / LP()"
Cohesion: 0.10
Nodes (87): addS(), anvilLT(), arrowsLT(), axeLT(), barrelLT(), barrowLT(), basketLT(), beamLT() (+79 more)

### Community 1 - "build-waterways.js / addLake()"
Cohesion: 0.03
Nodes (56): AUS_RANGES, AUS_RIDGE, avantOuverture, basins, BOX, boxesO, capCases, CAPITALES (+48 more)

### Community 2 - "simulation.js / stepCueilleur()"
Cohesion: 0.04
Nodes (68): actDe(), ACTIVITES, ALERTES, AMELIO, AMELIO_FONDERIE, ameliorable(), amelios(), AVEC_PORTEURS (+60 more)

### Community 3 - "bateaux.js / regions.js"
Cohesion: 0.07
Nodes (66): boat, boatHint(), boatStatusText(), cancelSend(), capitalById, createNavigator(), cellOf(), findPath() (+58 more)

### Community 4 - "modele-regions.js / regionProfile()"
Cohesion: 0.06
Nodes (45): applyWaterFish(), ARID_CENTERS, aridColor(), aridityAt(), band(), clamp01(), climateColorAt(), computeAnimalZones() (+37 more)

### Community 5 - "build-fleuves-ne.js / kmDe()"
Cohesion: 0.06
Nodes (47): bilanFin, boite(), boites, cases, chaikin(), chaines(), cours, densifie() (+39 more)

### Community 6 - "panneau.js / fortifications.js"
Cohesion: 0.07
Nodes (39): changed(), COLL, commit(), dims(), findById(), findSel(), flash(), ghost() (+31 more)

### Community 7 - "forme.js / geometrie.js"
Cohesion: 0.08
Nodes (34): aireAnneau(), anneauxPath(), bordsRegion(), cadreEtAnneaux(), carveRivieres(), cheminAnneaux(), CLASSE_FLEUVE, clipTerre() (+26 more)

### Community 8 - "poissons.js / drawEauPeche()"
Cohesion: 0.11
Nodes (44): accesPeche(), airePoly(), choisirEau(), comestible(), connuTexte(), corpsDEau(), coupDeLigne(), drawEauPeche() (+36 more)

### Community 9 - "carte/faune.js / fauneLibre()"
Cohesion: 0.09
Nodes (41): animauxCapturables(), captures, choisirCapture(), demarrerCapture(), drawCaptureCibles(), drawFaune(), drawFauneNoms(), eauMem (+33 more)

### Community 10 - "carte/routes.js / DOMINIUM world globe"
Cohesion: 0.07
Nodes (34): Route editor, DOMINIUM world globe, Map test page, Region game page, Generation rules page, DOMINIUM Studio hub, regle(), REGLES_DEF (+26 more)

### Community 11 - "gestion.js / batHtml()"
Cohesion: 0.11
Nodes (42): ANIMAUX_NOM, BAT_CAT, BAT_ICONE, batHtml(), batLive(), batOnglet, batPousseHtml(), batStockHtml() (+34 more)

### Community 12 - "cultures.js / valider-production.js"
Cohesion: 0.07
Nodes (32): Cultures et saisons editor, Production validation page, CULTURE_DEFAUT, CULTURE_TYPE, cultureDe(), cultureId(), CULTURES, CULTURES_DEFAUT (+24 more)

### Community 13 - "paysage.js / computeFlora()"
Cohesion: 0.10
Nodes (38): builtPolys(), classifyWoods(), computeFlora(), contourSegments(), crown(), drawWoods(), flora, floraCandidates() (+30 more)

### Community 14 - "generateur.js / generateRegion()"
Cohesion: 0.07
Nodes (34): ACACIA_PAL, between(), BIOME_RIVER, biomeLook(), biomeOf(), BIOMES, CONIFER_PAL, CONIFER_STEPS (+26 more)

### Community 15 - "dev.js / baseAction()"
Cohesion: 0.11
Nodes (36): appliquerStocksDev(), articlesDe(), baseAction(), baseEnvoyer(), baseVariable(), CAP_BASE, commandesFaites, cr() (+28 more)

### Community 16 - "construction.js / jeu/capitale.js"
Cohesion: 0.09
Nodes (31): CAPITAL_TABS, closeCapital(), openWindow(), renderCapitalView(), renderTabs(), renderWindow(), BUILDINGS, coastCache (+23 more)

### Community 17 - "stepJob() / stockPlein()"
Cohesion: 0.14
Nodes (34): accepte(), alerteBat(), byDist(), capCollecte(), collectable(), dispo(), donnerSurplus(), drawWorkers() (+26 more)

### Community 18 - "reseau-routes.js / landPath()"
Cohesion: 0.13
Nodes (30): addExtraRoads(), allWindingLegs(), anyLandPath(), bboxOfCoords(), bboxOverlap(), bearingDeg(), bearingTurn(), borderWaypoints() (+22 more)

### Community 19 - "arrivants.js / arrivantsStep()"
Cohesion: 0.13
Nodes (30): afficherDemande(), afficherStock(), ARR_DELAI, arrivants, arrivantsDessin(), arrivantsStep(), arrSave(), campColon() (+22 more)

### Community 20 - "ressources.js / applyResourceFilter()"
Cohesion: 0.08
Nodes (29): applyResourceFilter(), CROPS, FISH_ZONE_COLORS, FISH_ZONE_TYPES, FISHING_ZONES, FRESH_FISH, FRESH_FISH_NAMES, freshFishAt() (+21 more)

### Community 21 - "saisons.js / majNuit()"
Cohesion: 0.09
Nodes (30): aujourdhui(), clair01(), dateDe(), DOY_AUTOMNE, DOY_ETE, DOY_HIVER, DOY_PRINTEMPS, doyDe() (+22 more)

### Community 22 - "coller-frontieres-fleuves.js / newArcs"
Cohesion: 0.08
Nodes (29): before, cellKey(), coastNodes, cross(), decoded, encode(), finish(), fs (+21 more)

### Community 23 - "DOMINIUM (jeu de gestion pol / Editeur de carte"
Cohesion: 0.08
Nodes (29): Page d'accueil, Arbre des ressources, Arbres fruitiers (validation), Arbustes a baies (26 especes), Couleurs des biomes, Catalogue de batiments, Données des régions, Modifier les données (+21 more)

### Community 24 - "animaux.js / aQuad()"
Cohesion: 0.17
Nodes (25): aBois(), aBrin(), aCorps(), aCorpsPath(), aCorpsPts(), aCourbe(), aCroco(), aEffile() (+17 more)

### Community 25 - "catalogue.js / chargeMax()"
Cohesion: 0.09
Nodes (21): BUILD_MENUS, CAPACITE_KG, CHARGE_CHARRETTE, chargeHabitant(), chargeMax(), chargesTexte(), COUTS, EXT (+13 more)

### Community 26 - "caravane.js / initCaravan()"
Cohesion: 0.16
Nodes (24): caravan, caravanCity(), caravanSend, caravanTo(), cityAt(), cityLabel(), drawCaravanIcon(), finishCaravan() (+16 more)

### Community 27 - "carte/eau.js / joinTributary()"
Cohesion: 0.11
Nodes (18): bandCache, bandDiscs(), chaikinOpen(), drawPlantesEau(), joinTributary(), LAC_DIST, lakeShape(), lakeShapeCache (+10 more)

### Community 28 - "outils.js / meilleurOutil()"
Cohesion: 0.11
Nodes (20): CHARIOT, CHARRETTE, CORDE, efficaciteOutil(), FUSIONS, MANCHE, MATERIAUX, meilleurOutil() (+12 more)

### Community 29 - "retirer-lacs-monde.js / controle-lacs-monde.js"
Cohesion: 0.10
Nodes (20): bbox(), fautifs(), fs, gap(), [kr, kv, kl], P(), R, segD() (+12 more)

### Community 30 - "simTick() / besoins()"
Cohesion: 0.14
Nodes (23): approBatiment(), besoins(), courseCle(), estRepos(), finRemplissage(), foyerDe(), growSaplings(), lieuDeRepos() (+15 more)

### Community 31 - "tuiles.js / markDirty()"
Cohesion: 0.16
Nodes (22): cimesVues, cleanTile(), drawCimes(), drawDecor(), dropTile(), floraNear(), GPU, hit() (+14 more)

### Community 32 - "vehicules.js / vVoilier()"
Cohesion: 0.21
Nodes (22): Vehicles editor, peintBateau(), V_PROFIL, vBarque(), vBarqueCoque(), vBois(), vContours(), vCoque() (+14 more)

### Community 33 - "Arbres fruitiers sprite shee / Poirier (yellow pears)"
Cohesion: 0.11
Nodes (22): Abricotier (apricots), Amandier (almonds), Cerisier (red cherry pairs), Chataignier (chestnuts, spiky burrs), Citronnier (lemons), Cognassier (quinces), Dattier (date palm, fronds radiating), Figuier (figs) (+14 more)

### Community 34 - "remplirMaison() / assouvir()"
Cohesion: 0.14
Nodes (22): alimentsDe(), assouvir(), capAliment(), capVivres(), cibleSurplus(), enKg(), etalCible(), etalNourriture() (+14 more)

### Community 35 - "build-fishing.js / ovalZone()"
Cohesion: 0.13
Nodes (19): coastZone(), fc, fs, hitsBox(), kmDeg(), labelPoint(), lands, nameSeed() (+11 more)

### Community 36 - "package.json / dependencies"
Cohesion: 0.09
Nodes (21): author, dependencies, @resvg/resvg-js, topojson-client, topojson-server, topojson-simplify, @turf/turf, description (+13 more)

### Community 37 - "terrestres.js / marcher()"
Cohesion: 0.18
Nodes (20): drawTerrestres(), drawVoies(), marcheAu(), marcheCle(), marchePose(), marcher(), marcheRt, marcheStep() (+12 more)

### Community 38 - "build-formes.js / boxes"
Cohesion: 0.10
Nodes (15): boxes, eachCoord(), fc, fs, near(), out, path, regions (+7 more)

### Community 39 - "chariots.js / peintChariot()"
Cohesion: 0.23
Nodes (18): CH_CHEVAUX, chariotEtat(), chariotPas(), CHARIOTS, CHARIOTS_DEFAUT, chBancs(), chBois(), chCorde() (+10 more)

### Community 40 - "maxRes() / aBesoinStock()"
Cohesion: 0.17
Nodes (20): aBesoinStock(), aEnStock(), alertesMaj(), besoinsFonte(), deficits(), entreesDe(), intrantsFonte(), intrantsMin() (+12 more)

### Community 41 - "champs.js / clicChamp()"
Cohesion: 0.19
Nodes (18): aireChamps(), aireSignee(), champAt(), champCentre(), champIssue(), champsDe(), clicChamp(), drawChampApercu() (+10 more)

### Community 42 - "zonage.js / computeZones()"
Cohesion: 0.18
Nodes (16): ancrages, cellAt(), computeOcc(), computeZones(), crossesWallAtGates(), fitsAt(), footprint(), maxGrade() (+8 more)

### Community 43 - "build-routes.js / read()"
Cohesion: 0.12
Nodes (16): ctx, fs, game, json(), out, P(), path, r4() (+8 more)

### Community 44 - "economie.js / economyTick()"
Cohesion: 0.22
Nodes (15): dailyIncome(), ECO, economyDay(), economyTick(), FARM_EXCLUDE, fmtGold(), goodName(), initEconomy() (+7 more)

### Community 45 - "_rendu.js / P()"
Cohesion: 0.12
Nodes (15): [a,b,c,d], ad, [D,x0,y0,x1,y1,out], fc, fs, H, HH, k (+7 more)

### Community 46 - "serveur-logs.js / baseSet()"
Cohesion: 0.14
Nodes (16): ANCIEN, base, BASE_DIR, BASE_FILE, baseSet(), DIR, ecrire(), FILE (+8 more)

### Community 47 - "build-regions.js / read()"
Cohesion: 0.13
Nodes (13): ctx, fs, game, json(), path, read(), regions, ROOT (+5 more)

### Community 48 - "carte/capitale.js / afficherCartes()"
Cohesion: 0.18
Nodes (11): afficherCartes(), esc(), montrer(), nomForm, ONGLETS, OUTILS_CONSTRUCTION, ouvrir(), peindreVignettes() (+3 more)

### Community 49 - "navigation.js / navChemin()"
Cohesion: 0.22
Nodes (13): NAV, NAV_VIRAGE, NAV_VITESSE, navBateauAu(), navBesoin(), navChemin(), navEau(), navGrille() (+5 more)

### Community 50 - "stepBucheron() / stepBucheronCharrette()"
Cohesion: 0.23
Nodes (16): articleDe(), boisAuSol(), boisMax(), boisPlein(), capCharge(), chargeAmelio(), charretteGaree(), cutTree() (+8 more)

### Community 51 - "World Climate Zones Map (Cli / World Climate Types Map (Les"
Cohesion: 0.22
Nodes (16): World Climate Zones Map (Climat.webp), Climat Aride, Climat Chinois (subtropical humide), Climat Continental, Climat Equatorial, Climat Mediterraneen, Climat Montagnard, Climat Mousson (+8 more)

### Community 52 - "cadre.js / drawFormesSol()"
Cohesion: 0.24
Nodes (10): contourPath(), drawEauRelief(), drawFormesSol(), drawGround(), peindreNiveaux(), reliefChamp(), reliefEau(), reliefSol() (+2 more)

### Community 53 - "vue.js / resize()"
Cohesion: 0.19
Nodes (11): clampView(), Col, ctx, cv, fit(), fitContent(), minScale(), resize() (+3 more)

### Community 54 - "interface.js / showView()"
Cohesion: 0.14
Nodes (11): CONTINENT_BY_ID, CONTINENTS, EVENTS, NAV_ITEMS, NPC_REGION_IDS, RANKING, showView(), sidebar (+3 more)

### Community 55 - "build-nav-grid.js / fillPolygon()"
Cohesion: 0.16
Nodes (13): fc, fillPolygon(), fs, H, land, latOf(), rows, [SRC, DST] (+5 more)

### Community 56 - "production.js / stepProduction()"
Cohesion: 0.20
Nodes (11): affinerCave(), ANCIEN_PRODUIT, AUTO_SIMPLE, dureeEtape(), PRODUCTION_AUTO, PRODUCTIONS, produitDe(), produitsDe() (+3 more)

### Community 57 - "baies.js / baiesCandidats()"
Cohesion: 0.23
Nodes (12): BAIE_HUM, BAIE_TM, baieConvenance(), baieFeuillage(), baieFruit(), BAIES, baiesCandidats(), baiesClimat() (+4 more)

### Community 58 - "fortifications-dessin.js / drawGate()"
Cohesion: 0.26
Nodes (13): coneS(), drawGate(), drawTower(), drawWalls(), FORT, FORT_LEVELS, lvlOf(), roundTowerS() (+5 more)

### Community 59 - "ressources-test.js / nomTest()"
Cohesion: 0.26
Nodes (12): CAT_TEST, choixTest(), drawRessources(), drawRessourcesGhost(), effaceTest(), GLYPHES, glypheTest(), nomTest() (+4 more)

### Community 60 - "peche.js / initFishingZones()"
Cohesion: 0.21
Nodes (11): initFishingZones(), initFreshWaters(), initSeaLabels(), lakePolys, regionFishingZones(), regionResourcesHtml(), riverBoxes, SEA_LABELS (+3 more)

### Community 61 - "villageois.js / peintVillageois()"
Cohesion: 0.28
Nodes (11): Villagers editor, peintVillageois(), viChapeau(), viEll(), viLigne(), VILLAGEOIS, VILLAGEOIS_DE, VILLAGEOIS_DEFAUT (+3 more)

### Community 62 - "rendu.js / bridges()"
Cohesion: 0.21
Nodes (11): BRIDGE, bridgeCache, bridges(), drawBridges(), drawWater(), junctionCache, opts, ptInPoly() (+3 more)

### Community 63 - "_controle-fleuves.js / dist()"
Cohesion: 0.18
Nodes (11): dist(), fs, grid, K(), km(), mesh, out, t (+3 more)

### Community 64 - "lisser-bords.js / newArcs"
Cohesion: 0.19
Nodes (11): arcs, chaikin(), dpSeg(), ends, fs, IN, key(), newArcs (+3 more)

### Community 65 - "dessin.js / polyPath()"
Cohesion: 0.21
Nodes (6): drawHouse(), polyPath(), draw(), drawHighlights(), requestDraw(), strokeLine()

### Community 66 - "stats.js / rendreStats()"
Cohesion: 0.20
Nodes (6): JOURNEE, journeeHtml(), rendreStats(), STATS, STATS_DEFAUT, statsChoisies()

### Community 67 - "deplacements.js / trajet()"
Cohesion: 0.40
Nodes (10): batimentSous(), contourner(), croise(), marcher(), porte(), procheRoute(), reseauRoutes(), surVoie() (+2 more)

### Community 68 - "dessins.js / contenuExt()"
Cohesion: 0.27
Nodes (6): bete(), BUILD_DRAW, contenuExt(), especesEnclos(), extLT(), MINE_REP

### Community 69 - "niveauDe() / nbTrav()"
Cohesion: 0.40
Nodes (10): estPorteur(), estPorteurBois(), estPortHut(), horsFonte(), nbCharrettes(), nbFond(), nbPort(), nbPortHut() (+2 more)

### Community 70 - "trace.js / tracePoint()"
Cohesion: 0.42
Nodes (9): drawDraft(), junctionOnRay(), linePoint(), nearestAnchor(), pointRoute(), snapToRoads(), tracePoint(), wallIssue() (+1 more)

### Community 71 - "_region-page.js / addEventListener()"
Cohesion: 0.20
Nodes (3): fs, stub, vm

### Community 72 - "arbres.js / peintArbre()"
Cohesion: 0.33
Nodes (6): arbreFeuilles(), arbreFruit(), arbreLisse(), drawFruitiers(), FRUITIERS, peintArbre()

### Community 73 - "decors.js / decorsValides()"
Cohesion: 0.28
Nodes (7): DECOR_ROCHES, DECOR_TAILLE, DECORS_SOL, decorsCandidats(), decorSprites, decorsSignature(), decorsValides()

### Community 74 - "_cdp.js / CH"
Cohesion: 0.22
Nodes (7): CH, fs, os, path, proc, { spawn }, [url, png, expr]

### Community 75 - "_charge-page.js / ctx"
Cohesion: 0.22
Nodes (8): ctx, files, fs, html, [page, n], store, stub, vm

### Community 76 - "_controle-bords.js / cr()"
Cohesion: 0.25
Nodes (7): cr(), cross(), ex, fs, reg, t, tj

### Community 77 - "Paper Conquest world-map sta / Right region detail panel (E"
Cohesion: 0.28
Nodes (9): Paper Conquest world-map start screen mockup (hand-drawn paper style), Left navigation menu (Carte, Economie, Population, Diplomatie, Recherche, Construction, Reformes, Militaire, Journal, Classement), Hand-drawn paper/pencil sketch art style, Evenements recents news feed, Right region detail panel (Europe: info, starting advantages, difficulties, Selectionner button), Top 5 des puissances ranking table with power bars, Top bar: money, population, happiness, date, settings icons, Central colored-pencil world map: choose starting region (6 continents) (+1 more)

### Community 78 - "accueil.js / effacerPartie()"
Cohesion: 0.25
Nodes (3): enCours, grille, profil

### Community 79 - "donnees-regions.js / regionClimat()"
Cohesion: 0.36
Nodes (6): EMPTY_REGION, REGION_DATA, regionClimat(), regionInfo(), regionMeteo(), regionSoleil()

### Community 80 - "_lacs.js / ctx"
Cohesion: 0.25
Nodes (6): ctx, fs, ids, src, stub, vm

### Community 81 - "reparer-croisements.js / cr()"
Cohesion: 0.36
Nodes (7): arcs, cr(), find(), fs, inter(), t, xing()

### Community 82 - "Carte bathymetrique de l'arc / Ile principale avec 5 massif"
Cohesion: 0.29
Nodes (8): Carte bathymetrique de l'archipel (reference DOMINIUM), Zone desertique de sable au sud-ouest, Ile principale avec 5 massifs montagneux enneiges, Ilots satellites dans les eaux peu profondes, Lac central et reseau de rivieres, Lignes de profondeur (isobathes, intervalle 50 m), Echelle de profondeur de la mer (5 paliers, 0 a 1000+ m), Rose des vents et echelle (0-500 km)

### Community 83 - "atelier.js / atelierSide()"
Cohesion: 0.48
Nodes (5): atelier, atelierHouse(), atelierSide(), drawAtelier(), fitAtelier()

### Community 84 - "lumieres.js / drawLumieres()"
Cohesion: 0.33
Nodes (6): drawLumieres(), LUM_COUL, lumCache, LUMIERES, SANS_TOIT, sourcesLumiere()

### Community 85 - "jeu/faune.js / initAnimalZones()"
Cohesion: 0.38
Nodes (6): ANIMAL_COLORS, ANIMAL_ZONES, initAnimalZones(), regionAnimalZone, updateAnimalLayers(), zoneAnimals()

### Community 86 - "arrondir-cotes.js / arcs"
Cohesion: 0.29
Nodes (5): arcs, fs, out, t, use

### Community 87 - "tryLake() / cellOfPt()"
Cohesion: 0.29
Nodes (7): cellOfPt(), lakeShape(), loinDesFrontieres(), loinDesRoutes(), onLand(), rayonKm(), tryLake()

### Community 88 - "_croisements.js / ctx"
Cohesion: 0.29
Nodes (5): ctx, fs, src, stub, vm

### Community 91 - "stepChasseur() / proiesDe()"
Cohesion: 0.50
Nodes (5): DEPECAGE(), poidsDe(), proiesDe(), stepChasseur(), utiliseFonte()

### Community 92 - "developpeur.js / applyDevFilters()"
Cohesion: 0.50
Nodes (4): applyDevFilters(), DEV_FILTERS, devState, setLayerVisible()

## Knowledge Gaps
- **626 isolated node(s):** `AUS_RANGES`, `AUS_RIDGE`, `avantOuverture`, `basins`, `BOX` (+621 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `jobSites()` connect `stepJob() / stockPlein()` to `champs.js / clicChamp()`, `simulation.js / stepCueilleur()`, `forme.js / geometrie.js`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `inTerrain()` connect `forme.js / geometrie.js` to `stepJob() / stockPlein()`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `DOMINIUM world globe` connect `carte/routes.js / DOMINIUM world globe` to `construction.js / jeu/capitale.js`, `bateaux.js / regions.js`, `saisons.js / majNuit()`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **What connects `AUS_RANGES`, `AUS_RIDGE`, `avantOuverture` to the rest of the system?**
  _626 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `elements.js / LP()` be split into smaller, more focused modules?**
  _Cohesion score 0.09848484848484848 - nodes in this community are weakly interconnected._
- **Should `build-waterways.js / addLake()` be split into smaller, more focused modules?**
  _Cohesion score 0.02666666666666667 - nodes in this community are weakly interconnected._
- **Should `simulation.js / stepCueilleur()` be split into smaller, more focused modules?**
  _Cohesion score 0.039614957423176604 - nodes in this community are weakly interconnected._