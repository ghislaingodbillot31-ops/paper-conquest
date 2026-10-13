# Graph Report - Paper Conquest 2.0  (2026-10-13)

## Corpus Check
- 182 files · ~574,539 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2455 nodes · 4176 edges · 142 communities (125 shown, 17 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 92 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- elements.js / LP()
- build-waterways.js / addLake()
- simulation.js
- js/jeu/bateaux.js
- modele-regions.js
- build-fleuves-ne.js
- panneau.js
- forme.js
- poissons.js
- carte/faune.js
- carte/routes.js
- gestion.js
- cultures.js
- js/carte/paysage.js
- js/carte/generateur.js
- js/carte/dev.js
- construction.js
- stepJob
- reseau-routes.js
- arrivants.js
- js/jeu/ressources.js
- js/saisons.js
- coller-frontieres-fleuves.js
- DOMINIUM (jeu de gestion politique et territoriale)
- js/carte/animaux.js
- catalogue.js
- js/jeu/caravane.js
- js/carte/eau.js
- outils.js
- retirer-lacs-monde.js
- simTick
- js/carte/tuiles.js
- js/carte/vehicules.js
- Arbres fruitiers sprite sheet (20 species, top view)
- remplirMaison
- build-fishing.js
- package.json
- js/carte/terrestres.js
- build-formes.js
- js/carte/chariots.js
- maxRes
- js/carte/champs.js
- zonage.js
- build-routes.js
- economie.js
- _rendu.js
- serveur-logs.js
- build-regions.js
- carte/capitale.js
- js/carte/navigation.js
- stepBucheron
- World Climate Zones Map (Climat.webp)
- cadre.js
- vue.js
- js/jeu/interface.js
- build-nav-grid.js
- production.js
- js/carte/baies.js
- js/carte/fortifications-dessin.js
- js/carte/ressources-test.js
- js/jeu/peche.js
- js/carte/villageois.js
- js/carte/rendu.js
- _controle-fleuves.js
- lisser-bords.js
- dessin.js
- stats.js
- deplacements.js
- js/batiments/dessins.js
- niveauDe
- trace.js
- _region-page.js
- js/carte/arbres.js
- js/carte/decors.js
- _cdp.js
- _charge-page.js
- _controle-bords.js
- Paper Conquest world-map start screen mockup (hand-drawn paper style)
- accueil.js
- js/jeu/donnees-regions.js
- _lacs.js
- reparer-croisements.js
- Carte bathymetrique de l'archipel (reference DOMINIUM)
- js/batiments/atelier.js
- js/carte/lumieres.js
- js/jeu/faune.js
- arrondir-cotes.js
- tryLake
- _croisements.js
- pointeur.js
- js/jeu/joueur.js
- stepChasseur
- developpeur.js
- js/jeu/routes.js
- base.js
- etiquettes.js
- logs.js
- jeu/eau.js
- tableaux.js
- cellKm2
- cutAtConfluence
- gkey
- kmEntre
- r3
- seaPoint
- _chaine-lacs.sh
- Community 106
- _lent.js
- Community 108
- Community 109
- Community 110
- Community 111
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- appliquer-theme.js
- Community 132
- valider-production.js
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140

## God Nodes (most connected - your core abstractions)
1. `LP()` - 54 edges
2. `lpts()` - 47 edges
3. `lw()` - 45 edges
4. `pathS()` - 45 edges
5. `simTick()` - 44 edges
6. `shiftS()` - 32 edges
7. `yardLT()` - 27 edges
8. `Arbres fruitiers sprite sheet (20 species, top view)` - 21 edges
9. `batHtml()` - 20 edges
10. `stepJob()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Arbres fruitiers (validation)` --semantically_similar_to--> `Arbustes a baies (26 especes)`  [INFERRED] [semantically similar]
  arbres-fruitiers.html → arbustes-baies.html
- `Regles fixes de generation` --conceptually_related_to--> `js/carte/regles.js`  [INFERRED]
  regles-generation.html → editeur-carte.html
- `Editeur Villageois (editeur-villageois.html)` --shares_data_with--> `Editeur de carte (editeur-carte.html)`  [INFERRED]
  editeur-villageois.html → editeur-carte.html
- `README (DOMINIUM)` --conceptually_related_to--> `DOMINIUM Studio (studio.html)`  [AMBIGUOUS]
  README.md → studio.html
- `Carte de la region (region.html)` --shares_data_with--> `Donnees des regions (data/regions, data/monde)`  [INFERRED]
  region.html → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Coquille jeu : accueil et carte joueur** — accueil_page, index_page, js_jeu_joueur_module, js_jeu_accueil_module, js_jeu_globe_module [EXTRACTED 1.00]
- **Bottom dashboard panels (world situation, top 5, events)** — reference_e5196060_world_situation_chart, reference_e5196060_top5_powers, reference_e5196060_recent_events [EXTRACTED 1.00]
- **Eight world climate types in the legend** — reference_ig1100_5_climat_oceanique, reference_climat_continental, reference_climat_mediterraneen, reference_climat_polaire, reference_ig1100_5_climat_de_montagne, reference_climat_equatorial, reference_climat_tropical, reference_ig1100_5_climat_desertique [EXTRACTED 1.00]
- **World climate zone classification (10 zones)** — reference_climat_equatorial, reference_climat_tropical, reference_climat_mousson, reference_climat_mediterraneen, reference_climat_oceanique, reference_climat_chinois, reference_climat_aride, reference_climat_continental, reference_climat_montagnard, reference_climat_polaire [EXTRACTED 1.00]
- **Studio regroupant les pages du jeu** — studio_page, studio_tabs_concept, dominium_game_concept [INFERRED 0.65]
- **Citrus trees** — arbres_fruitiers_oranger, arbres_fruitiers_citronnier [INFERRED 0.75]
- **Nut-bearing trees** — arbres_fruitiers_amandier, arbres_fruitiers_noyer, arbres_fruitiers_noisetier, arbres_fruitiers_chataignier [INFERRED 0.85]
- **Controle visuel par capture** — outils_controle_cap_page, region_page, firefox_screenshot_rationale [INFERRED 0.85]
- **Pipeline de carte de region** — region_page, map_generation_scripts_concept, pixijs_renderer_concept [INFERRED 0.85]
- **Pipeline commun des editeurs de carte** — editeur_carte_page, editeur_batiments_page, editeur_routes_page, map_test_page, region_page, js_carte_base_module, js_saisons_module, js_carte_regles_module, js_carte_generateur_module [INFERRED 0.85]

## Communities (142 total, 17 thin omitted)

### Community 0 - "elements.js / LP()"
Cohesion: 0.10
Nodes (87): addS(), anvilLT(), arrowsLT(), axeLT(), barrelLT(), barrowLT(), basketLT(), beamLT() (+79 more)

### Community 1 - "build-waterways.js / addLake()"
Cohesion: 0.04
Nodes (70): actDe(), ACTIVITES, ALERTES, AMELIO, AMELIO_FONDERIE, ameliorable(), amelios(), AVEC_PORTEURS (+62 more)

### Community 2 - "simulation.js"
Cohesion: 0.03
Nodes (56): AUS_RANGES, AUS_RIDGE, avantOuverture, basins, BOX, boxesO, capCases, CAPITALES (+48 more)

### Community 3 - "js/jeu/bateaux.js"
Cohesion: 0.06
Nodes (45): applyWaterFish(), ARID_CENTERS, aridColor(), aridityAt(), band(), clamp01(), climateColorAt(), computeAnimalZones() (+37 more)

### Community 4 - "modele-regions.js"
Cohesion: 0.06
Nodes (47): bilanFin, boite(), boites, cases, chaikin(), chaines(), cours, densifie() (+39 more)

### Community 5 - "build-fleuves-ne.js"
Cohesion: 0.10
Nodes (48): boat, boatHint(), boatStatusText(), cancelSend(), capitalById, createNavigator(), cellOf(), findPath() (+40 more)

### Community 6 - "panneau.js"
Cohesion: 0.08
Nodes (44): animauxCapturables(), captures, choisirCapture(), demarrerCapture(), drawCaptureCibles(), animauxVus(), drawFaune(), drawFauneNoms() (+36 more)

### Community 7 - "forme.js"
Cohesion: 0.06
Nodes (38): ACACIA_PAL, between(), BIOME_RIVER, biomeLook(), biomeOf(), BIOMES, CONIFER_PAL, CONIFER_STEPS (+30 more)

### Community 8 - "poissons.js"
Cohesion: 0.11
Nodes (43): accesPeche(), airePoly(), choisirEau(), comestible(), connuTexte(), corpsDEau(), coupDeLigne(), drawEauPeche() (+35 more)

### Community 9 - "carte/faune.js"
Cohesion: 0.11
Nodes (42): ANIMAUX_NOM, BAT_CAT, BAT_ICONE, batHtml(), batLive(), batOnglet, batPousseHtml(), batStockHtml() (+34 more)

### Community 10 - "carte/routes.js"
Cohesion: 0.07
Nodes (41): Accueil DOMINIUM (accueil.html), Bibliotheques CDN externes (pixi, maplibre, turf, topojson, Google Fonts), Editeur Animaux (editeur-animaux.html), Editeur de batiments (editeur-batiments.html), Editeur de carte (editeur-carte.html), Cultures et saisons (editeur-cultures.html), Editeur de routes (editeur-routes.html), Editeur Vehicules (editeur-vehicules.html) (+33 more)

### Community 11 - "gestion.js"
Cohesion: 0.10
Nodes (37): classifyWoods(), computeFlora(), contourSegments(), crown(), drawWoods(), flora, floraCandidates(), forestNoise() (+29 more)

### Community 12 - "cultures.js"
Cohesion: 0.08
Nodes (34): CAPITAL_TABS, closeCapital(), openWindow(), renderCapitalView(), renderTabs(), renderWindow(), BUILDINGS, coastCache (+26 more)

### Community 13 - "js/carte/paysage.js"
Cohesion: 0.08
Nodes (30): addRoadPoint(), deleteSel(), finishDraft(), fixGates(), gateAnchors(), gateFromAnchor(), gateSpot(), hitAny() (+22 more)

### Community 14 - "js/carte/generateur.js"
Cohesion: 0.11
Nodes (36): appliquerStocksDev(), articlesDe(), baseAction(), baseEnvoyer(), baseVariable(), CAP_BASE, commandesFaites, cr() (+28 more)

### Community 15 - "js/carte/dev.js"
Cohesion: 0.13
Nodes (30): addExtraRoads(), allWindingLegs(), anyLandPath(), bboxOfCoords(), bboxOverlap(), bearingDeg(), bearingTurn(), borderWaypoints() (+22 more)

### Community 16 - "construction.js"
Cohesion: 0.13
Nodes (30): afficherDemande(), afficherStock(), ARR_DELAI, arrivants, arrivantsDessin(), arrivantsStep(), arrSave(), campColon() (+22 more)

### Community 17 - "stepJob"
Cohesion: 0.08
Nodes (29): applyResourceFilter(), CROPS, FISH_ZONE_COLORS, FISH_ZONE_TYPES, FISHING_ZONES, FRESH_FISH, FRESH_FISH_NAMES, freshFishAt() (+21 more)

### Community 18 - "reseau-routes.js"
Cohesion: 0.09
Nodes (30): aujourdhui(), clair01(), dateDe(), DOY_AUTOMNE, DOY_ETE, DOY_HIVER, DOY_PRINTEMPS, doyDe() (+22 more)

### Community 19 - "arrivants.js"
Cohesion: 0.08
Nodes (29): before, cellKey(), coastNodes, cross(), decoded, encode(), finish(), fs (+21 more)

### Community 20 - "js/jeu/ressources.js"
Cohesion: 0.09
Nodes (21): bandCache, bandDiscs(), blocsGlace(), blocsMem, chaikinOpen(), drawBlocsGlace(), drawPlantesEau(), joinTributary() (+13 more)

### Community 21 - "js/saisons.js"
Cohesion: 0.12
Nodes (27): aireAnneau(), anneauxPath(), arrondirAngles(), bordsRegion(), cadreEtAnneaux(), carveRivieres(), cheminAnneaux(), CLASSE_FLEUVE (+19 more)

### Community 22 - "coller-frontieres-fleuves.js"
Cohesion: 0.14
Nodes (31): inTerrain(), accepte(), alerteBat(), byDist(), capCollecte(), collectable(), dispo(), donnerSurplus() (+23 more)

### Community 23 - "DOMINIUM (jeu de gestion politique et territoriale)"
Cohesion: 0.13
Nodes (25): applyZone(), boutsLibres(), chaikin(), drawRoads(), drawTroncons(), EDGE, filetsChemins(), FILL (+17 more)

### Community 24 - "js/carte/animaux.js"
Cohesion: 0.09
Nodes (21): BUILD_MENUS, CAPACITE_KG, CHARGE_CHARRETTE, chargeHabitant(), chargeMax(), chargesTexte(), COUTS, EXT (+13 more)

### Community 25 - "catalogue.js"
Cohesion: 0.15
Nodes (26): cimesVues, cleanTile(), drawCimes(), drawDecor(), dropTile(), floraNear(), GPU, hit() (+18 more)

### Community 26 - "js/jeu/caravane.js"
Cohesion: 0.17
Nodes (25): aBois(), aBrin(), aCorps(), aCorpsPath(), aCorpsPts(), aCourbe(), aCroco(), aEffile() (+17 more)

### Community 27 - "js/carte/eau.js"
Cohesion: 0.12
Nodes (27): alimentsDe(), assouvir(), besoins(), capAliment(), capVivres(), cibleSurplus(), enKg(), etalCible() (+19 more)

### Community 28 - "outils.js"
Cohesion: 0.17
Nodes (23): caravan, caravanCity(), caravanSend, caravanTo(), cityAt(), cityLabel(), finishCaravan(), hoveredCity (+15 more)

### Community 29 - "retirer-lacs-monde.js"
Cohesion: 0.11
Nodes (20): CHARIOT, CHARRETTE, CORDE, efficaciteOutil(), FUSIONS, MANCHE, MATERIAUX, meilleurOutil() (+12 more)

### Community 30 - "simTick"
Cohesion: 0.13
Nodes (24): approBatiment(), courseCle(), deficits(), estRepos(), finRemplissage(), growSaplings(), horsFonte(), lieuDeRepos() (+16 more)

### Community 31 - "js/carte/tuiles.js"
Cohesion: 0.15
Nodes (25): aBesoinStock(), aEnStock(), alertesMaj(), besoinsFonte(), entreesDe(), estPorteur(), estPorteurBois(), estPortHut() (+17 more)

### Community 32 - "js/carte/vehicules.js"
Cohesion: 0.10
Nodes (20): bbox(), fautifs(), fs, gap(), [kr, kv, kl], P(), R, segD() (+12 more)

### Community 33 - "Arbres fruitiers sprite sheet (20 species, top view)"
Cohesion: 0.09
Nodes (20): ajoutes, arcs, area(), aRetirer, boxes, centre(), cibles, done (+12 more)

### Community 34 - "remplirMaison"
Cohesion: 0.11
Nodes (22): Abricotier (apricots), Amandier (almonds), Cerisier (red cherry pairs), Chataignier (chestnuts, spiky burrs), Citronnier (lemons), Cognassier (quinces), Dattier (date palm, fronds radiating), Figuier (figs) (+14 more)

### Community 35 - "build-fishing.js"
Cohesion: 0.22
Nodes (21): peintBateau(), V_PROFIL, vBarque(), vBarqueCoque(), vBois(), vContours(), vCoque(), vEclairage() (+13 more)

### Community 36 - "package.json"
Cohesion: 0.27
Nodes (21): action(), adopter(), clicAjout(), coucheRoute(), creerBoite(), debutAjout(), dessiner(), enregistrer() (+13 more)

### Community 37 - "js/carte/terrestres.js"
Cohesion: 0.13
Nodes (19): coastZone(), fc, fs, hitsBox(), kmDeg(), labelPoint(), lands, nameSeed() (+11 more)

### Community 38 - "build-formes.js"
Cohesion: 0.09
Nodes (21): author, dependencies, @resvg/resvg-js, topojson-client, topojson-server, topojson-simplify, @turf/turf, description (+13 more)

### Community 39 - "js/carte/chariots.js"
Cohesion: 0.18
Nodes (20): drawTerrestres(), drawVoies(), marcheAu(), marcheCle(), marchePose(), marcher(), marcheRt, marcheStep() (+12 more)

### Community 40 - "maxRes"
Cohesion: 0.10
Nodes (16): arrondir(), donnees, eau, espacer(), F, fs, G, O (+8 more)

### Community 41 - "js/carte/champs.js"
Cohesion: 0.10
Nodes (15): boxes, eachCoord(), fc, fs, near(), out, path, regions (+7 more)

### Community 42 - "zonage.js"
Cohesion: 0.23
Nodes (18): CH_CHEVAUX, chariotEtat(), chariotPas(), CHARIOTS, CHARIOTS_DEFAUT, chBancs(), chBois(), chCorde() (+10 more)

### Community 43 - "build-routes.js"
Cohesion: 0.17
Nodes (14): CULTURE_DEFAUT, CULTURE_TYPE, cultureDe(), cultureId(), CULTURES, CULTURES_DEFAUT, cultureTexte(), cultureTick() (+6 more)

### Community 44 - "economie.js"
Cohesion: 0.19
Nodes (18): aireChamps(), aireSignee(), champAt(), champCentre(), champIssue(), champsDe(), clicChamp(), drawChampApercu() (+10 more)

### Community 45 - "_rendu.js"
Cohesion: 0.18
Nodes (16): ancrages, cellAt(), computeOcc(), computeZones(), crossesWallAtGates(), fitsAt(), footprint(), maxGrade() (+8 more)

### Community 46 - "serveur-logs.js"
Cohesion: 0.12
Nodes (16): ctx, fs, game, json(), out, P(), path, r4() (+8 more)

### Community 47 - "build-regions.js"
Cohesion: 0.13
Nodes (17): ANCIEN, base, BASE_DIR, BASE_FILE, baseSet(), DIR, ecrire(), FILE (+9 more)

### Community 48 - "carte/capitale.js"
Cohesion: 0.22
Nodes (15): dailyIncome(), ECO, economyDay(), economyTick(), FARM_EXCLUDE, fmtGold(), goodName(), initEconomy() (+7 more)

### Community 49 - "js/carte/navigation.js"
Cohesion: 0.12
Nodes (11): CONTINENT_BY_ID, CONTINENTS, EVENTS, NAV_ITEMS, NPC_REGION_IDS, RANKING, showView(), sidebar (+3 more)

### Community 50 - "stepBucheron"
Cohesion: 0.22
Nodes (16): buildings, choixDepart(), confirmerDepart(), initOwnership(), interactionBusy(), loadPlayerState(), ownedRegions, refreshOwnershipLayers() (+8 more)

### Community 51 - "World Climate Zones Map (Climat.webp)"
Cohesion: 0.16
Nodes (17): cache, fichiers, fs, HERBE, hslRgb(), imposee(), lab(), NOMS (+9 more)

### Community 52 - "cadre.js"
Cohesion: 0.12
Nodes (15): [a,b,c,d], ad, [D,x0,y0,x1,y1,out], fc, fs, H, HH, k (+7 more)

### Community 53 - "vue.js"
Cohesion: 0.13
Nodes (17): boite(), d, eau, FR, fs, PALIERS, path, plans (+9 more)

### Community 54 - "js/jeu/interface.js"
Cohesion: 0.14
Nodes (7): corners(), ptSeg(), roadLen(), ROADS, segLen(), shrunk(), simplifie()

### Community 55 - "build-nav-grid.js"
Cohesion: 0.24
Nodes (17): articleDe(), boisAuSol(), boisMax(), boisPlein(), capCharge(), chargeAmelio(), charretteGaree(), cutTree() (+9 more)

### Community 56 - "production.js"
Cohesion: 0.20
Nodes (13): clampView(), Col, ctx, cv, fit(), fitContent(), minScale(), resize() (+5 more)

### Community 57 - "js/carte/baies.js"
Cohesion: 0.13
Nodes (13): ctx, fs, game, json(), path, read(), regions, ROOT (+5 more)

### Community 58 - "js/carte/fortifications-dessin.js"
Cohesion: 0.15
Nodes (13): exporterMermaid(), validerProduction(), DIR, donnees, facultatif(), fs, i, index (+5 more)

### Community 59 - "js/carte/ressources-test.js"
Cohesion: 0.18
Nodes (11): afficherCartes(), esc(), montrer(), nomForm, ONGLETS, OUTILS_CONSTRUCTION, ouvrir(), peindreVignettes() (+3 more)

### Community 60 - "js/jeu/peche.js"
Cohesion: 0.22
Nodes (13): NAV, NAV_VIRAGE, NAV_VITESSE, navBateauAu(), navBesoin(), navChemin(), navEau(), navGrille() (+5 more)

### Community 61 - "js/carte/villageois.js"
Cohesion: 0.18
Nodes (14): BRIDGE, bridgeCache, bridges(), drawBridges(), drawWater(), junctionCache, opts, pontsConflits() (+6 more)

### Community 62 - "js/carte/rendu.js"
Cohesion: 0.22
Nodes (16): World Climate Zones Map (Climat.webp), Climat Aride, Climat Chinois (subtropical humide), Climat Continental, Climat Equatorial, Climat Mediterraneen, Climat Montagnard, Climat Mousson (+8 more)

### Community 63 - "_controle-fleuves.js"
Cohesion: 0.24
Nodes (10): contourPath(), drawEauRelief(), drawFormesSol(), drawGround(), peindreNiveaux(), reliefChamp(), reliefEau(), reliefSol() (+2 more)

### Community 64 - "lisser-bords.js"
Cohesion: 0.16
Nodes (13): fc, fillPolygon(), fs, H, land, latOf(), rows, [SRC, DST] (+5 more)

### Community 65 - "dessin.js"
Cohesion: 0.20
Nodes (11): affinerCave(), ANCIEN_PRODUIT, AUTO_SIMPLE, dureeEtape(), PRODUCTION_AUTO, PRODUCTIONS, produitDe(), produitsDe() (+3 more)

### Community 66 - "stats.js"
Cohesion: 0.23
Nodes (12): BAIE_HUM, BAIE_TM, baieConvenance(), baieFeuillage(), baieFruit(), BAIES, baiesCandidats(), baiesClimat() (+4 more)

### Community 67 - "deplacements.js"
Cohesion: 0.26
Nodes (13): coneS(), drawGate(), drawTower(), drawWalls(), FORT, FORT_LEVELS, lvlOf(), roundTowerS() (+5 more)

### Community 68 - "js/batiments/dessins.js"
Cohesion: 0.26
Nodes (12): CAT_TEST, choixTest(), drawRessources(), drawRessourcesGhost(), effaceTest(), GLYPHES, glypheTest(), nomTest() (+4 more)

### Community 69 - "niveauDe"
Cohesion: 0.21
Nodes (11): initFishingZones(), initFreshWaters(), initSeaLabels(), lakePolys, regionFishingZones(), regionResourcesHtml(), riverBoxes, SEA_LABELS (+3 more)

### Community 70 - "trace.js"
Cohesion: 0.14
Nodes (13): [A, B], fc, fs, ga, gb, jsts, rd, reste (+5 more)

### Community 71 - "_region-page.js"
Cohesion: 0.14
Nodes (12): bb, eau, fc, fs, lb, [nom, ...b], parts, r (+4 more)

### Community 72 - "js/carte/arbres.js"
Cohesion: 0.18
Nodes (11): dist(), fs, grid, K(), km(), mesh, out, t (+3 more)

### Community 73 - "js/carte/decors.js"
Cohesion: 0.19
Nodes (11): arcs, chaikin(), dpSeg(), ends, fs, IN, key(), newArcs (+3 more)

### Community 74 - "_cdp.js"
Cohesion: 0.24
Nodes (12): Banc d'essai de capture d'ecran, DOMINIUM (jeu de gestion politique), Pourquoi une image lente sur le port 9000, Scripts de generation de carte (js/carte, js/batiments), MapLibre GL (globe interactif), Banc d'essai de capture (cap.html), PixiJS (rendu des tuiles de carte), README (DOMINIUM) (+4 more)

### Community 75 - "_charge-page.js"
Cohesion: 0.21
Nodes (6): drawHouse(), polyPath(), draw(), drawHighlights(), requestDraw(), strokeLine()

### Community 76 - "_controle-bords.js"
Cohesion: 0.20
Nodes (6): JOURNEE, journeeHtml(), rendreStats(), STATS, STATS_DEFAUT, statsChoisies()

### Community 77 - "Paper Conquest world-map start screen mockup (hand-drawn paper style)"
Cohesion: 0.32
Nodes (10): peintVillageois(), viChapeau(), viEll(), viLigne(), VILLAGEOIS, VILLAGEOIS_DE, VILLAGEOIS_DEFAUT, viOutil() (+2 more)

### Community 78 - "accueil.js"
Cohesion: 0.20
Nodes (9): anneaux, dp(), fs, grille, lignes, r4(), sortie, t (+1 more)

### Community 79 - "js/jeu/donnees-regions.js"
Cohesion: 0.17
Nodes (10): fc, fs, gf, jsts, rd, t, tj, topo (+2 more)

### Community 80 - "_lacs.js"
Cohesion: 0.20
Nodes (9): allee(), ARDOISE_SOMBRE, BARDEAU, BLEU, BRUN, LAUZE, sol(), TUILE (+1 more)

### Community 81 - "reparer-croisements.js"
Cohesion: 0.35
Nodes (10): changed(), COLL, commit(), dims(), findById(), findSel(), flash(), ghost() (+2 more)

### Community 82 - "Carte bathymetrique de l'archipel (reference DOMINIUM)"
Cohesion: 0.40
Nodes (10): batimentSous(), contourner(), croise(), marcher(), porte(), procheRoute(), reseauRoutes(), surVoie() (+2 more)

### Community 83 - "js/batiments/atelier.js"
Cohesion: 0.20
Nodes (9): distBord(), eau, fc, fs, polys(), t, tj, ts (+1 more)

### Community 84 - "js/carte/lumieres.js"
Cohesion: 0.18
Nodes (9): boites, eau, fc, fs, t, tj, ts, turf (+1 more)

### Community 85 - "js/jeu/faune.js"
Cohesion: 0.18
Nodes (10): a, fc, fs, ids, jsts, rd, t, tj (+2 more)

### Community 86 - "arrondir-cotes.js"
Cohesion: 0.18
Nodes (10): fc, fs, ids, jsts, rd, regs, t, tj (+2 more)

### Community 87 - "tryLake"
Cohesion: 0.27
Nodes (6): bete(), BUILD_DRAW, contenuExt(), especesEnclos(), extLT(), MINE_REP

### Community 88 - "_croisements.js"
Cohesion: 0.42
Nodes (9): drawDraft(), junctionOnRay(), linePoint(), nearestAnchor(), pointRoute(), snapToRoads(), tracePoint(), wallIssue() (+1 more)

### Community 89 - "pointeur.js"
Cohesion: 0.20
Nodes (3): fs, stub, vm

### Community 90 - "js/jeu/joueur.js"
Cohesion: 0.33
Nodes (6): arbreFeuilles(), arbreFruit(), arbreLisse(), drawFruitiers(), FRUITIERS, peintArbre()

### Community 91 - "stepChasseur"
Cohesion: 0.28
Nodes (7): DECOR_ROCHES, DECOR_TAILLE, DECORS_SOL, decorsCandidats(), decorSprites, decorsSignature(), decorsValides()

### Community 92 - "developpeur.js"
Cohesion: 0.22
Nodes (7): CH, fs, os, path, proc, { spawn }, [url, png, expr]

### Community 93 - "js/jeu/routes.js"
Cohesion: 0.22
Nodes (8): ctx, files, fs, html, [page, n], store, stub, vm

### Community 94 - "base.js"
Cohesion: 0.25
Nodes (7): cr(), cross(), ex, fs, reg, t, tj

### Community 95 - "etiquettes.js"
Cohesion: 0.28
Nodes (9): Paper Conquest world-map start screen mockup (hand-drawn paper style), Left navigation menu (Carte, Economie, Population, Diplomatie, Recherche, Construction, Reformes, Militaire, Journal, Classement), Hand-drawn paper/pencil sketch art style, Evenements recents news feed, Right region detail panel (Europe: info, starting advantages, difficulties, Selectionner button), Top 5 des puissances ranking table with power bars, Top bar: money, population, happiness, date, settings icons, Central colored-pencil world map: choose starting region (6 continents) (+1 more)

### Community 96 - "logs.js"
Cohesion: 0.39
Nodes (6): formePlat(), genereMondePlat(), PLAT_COTES, platCourbe(), platReseau(), platRouteOk()

### Community 97 - "jeu/eau.js"
Cohesion: 0.25
Nodes (3): enCours, grille, profil

### Community 98 - "tableaux.js"
Cohesion: 0.36
Nodes (6): EMPTY_REGION, REGION_DATA, regionClimat(), regionInfo(), regionMeteo(), regionSoleil()

### Community 99 - "cellKm2"
Cohesion: 0.25
Nodes (6): ctx, fs, ids, src, stub, vm

### Community 100 - "cutAtConfluence"
Cohesion: 0.36
Nodes (7): arcs, cr(), find(), fs, inter(), t, xing()

### Community 101 - "gkey"
Cohesion: 0.29
Nodes (8): Carte bathymetrique de l'archipel (reference DOMINIUM), Zone desertique de sable au sud-ouest, Ile principale avec 5 massifs montagneux enneiges, Ilots satellites dans les eaux peu profondes, Lac central et reseau de rivieres, Lignes de profondeur (isobathes, intervalle 50 m), Echelle de profondeur de la mer (5 paliers, 0 a 1000+ m), Rose des vents et echelle (0-500 km)

### Community 102 - "kmEntre"
Cohesion: 0.29
Nodes (6): Données des régions, Modifier les données, Une fiche de région, formes.json (forme de region, build-formes.js), regions.json (fiches des 500 regions), zones-animales.json (37 zones de faune)

### Community 103 - "r3"
Cohesion: 0.48
Nodes (5): atelier, atelierHouse(), atelierSide(), drawAtelier(), fitAtelier()

### Community 104 - "seaPoint"
Cohesion: 0.33
Nodes (6): drawLumieres(), LUM_COUL, lumCache, LUMIERES, SANS_TOIT, sourcesLumiere()

### Community 105 - "_chaine-lacs.sh"
Cohesion: 0.43
Nodes (6): applyDevFilters(), applyLayerVisibility(), COUCHES_VILLES, DEV_FILTERS, devState, setLayerVisible()

### Community 106 - "Community 106"
Cohesion: 0.38
Nodes (6): ANIMAL_COLORS, ANIMAL_ZONES, initAnimalZones(), regionAnimalZone, updateAnimalLayers(), zoneAnimals()

### Community 107 - "_lent.js"
Cohesion: 0.29
Nodes (5): arcs, fs, out, t, use

### Community 108 - "Community 108"
Cohesion: 0.29
Nodes (7): cellOfPt(), lakeShape(), loinDesFrontieres(), loinDesRoutes(), onLand(), rayonKm(), tryLake()

### Community 109 - "Community 109"
Cohesion: 0.29
Nodes (5): ctx, fs, src, stub, vm

### Community 110 - "Community 110"
Cohesion: 0.29
Nodes (4): A, fs, t, tj

### Community 111 - "Community 111"
Cohesion: 0.29
Nodes (6): Hébergement, Paper Conquest, Régénérer les données, Structure du projet, Suivi des versions, Utiliser le projet

### Community 113 - "Community 113"
Cohesion: 0.40
Nodes (4): regle(), REGLES_DEF, reglesSignature(), reglesVal

### Community 115 - "Community 115"
Cohesion: 0.50
Nodes (5): DEPECAGE(), poidsDe(), proiesDe(), stepChasseur(), utiliseFonte()

### Community 117 - "Community 117"
Cohesion: 0.60
Nodes (4): dessinFaune(), dessinFauneCorps(), FAUNE_MARINE, initFauneMarine()

### Community 118 - "Community 118"
Cohesion: 0.67
Nodes (3): monter(), dessiner(), erreurs()

### Community 120 - "Community 120"
Cohesion: 0.83
Nodes (3): analyseCle(), analyseLire(), appliquerAnalyseRoutes()

### Community 123 - "Community 123"
Cohesion: 0.67
Nodes (3): js/jeu/faune-marine.js, js/jeu/icones-carte.js, Map Global icones (map-globale.html)

## Ambiguous Edges - Review These
- `README (DOMINIUM)` → `DOMINIUM Studio (studio.html)`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to

## Knowledge Gaps
- **799 isolated node(s):** `SATIETE`, `GRASS`, `OAK`, `OLD_STRAW`, `SHINGLE` (+794 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `README (DOMINIUM)` and `DOMINIUM Studio (studio.html)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `jobSites()` connect `coller-frontieres-fleuves.js` to `build-waterways.js / addLake()`, `economie.js`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `simLoop()` connect `simTick` to `build-waterways.js / addLake()`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `inTerrain()` connect `coller-frontieres-fleuves.js` to `js/jeu/interface.js`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `SATIETE`, `GRASS`, `OAK` to the rest of the system?**
  _799 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `elements.js / LP()` be split into smaller, more focused modules?**
  _Cohesion score 0.09848484848484848 - nodes in this community are weakly interconnected._
- **Should `build-waterways.js / addLake()` be split into smaller, more focused modules?**
  _Cohesion score 0.039649122807017545 - nodes in this community are weakly interconnected._