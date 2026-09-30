# Paper Conquest

Jeu de gestion politique et territoriale, en pages HTML simples (pas de build, pas de framework). Identité visuelle "papier & crayon" posée sur un vrai globe interactif [MapLibre GL](https://maplibre.org/) : 500 régions compactes, individuellement sélectionnables, chacune avec sa propre carte générée (campagne, routes, bâtiments, fortifications).

## Structure du projet

```
.
├── index.html               # Le jeu : globe, régions, routes, pêche, économie, capitale
├── region.html              # Carte d'une région (ouverte par le jeu, onglet « Carte de la région »)
├── editeur-carte.html       # Fenêtre d'édition du générateur de carte (biome, paysage, fleuve)
├── editeur-batiments.html   # Fenêtre de gestion et de modification des bâtiments (atelier)
├── css/
│   ├── jeu.css              # Styles du jeu
│   ├── carte.css            # Styles des pages de carte (région et éditeurs)
│   └── maplibre-gl.css      # Copie locale de la feuille MapLibre
├── js/
│   ├── jeu/                 # Systèmes du jeu : globe, données des régions, routes, bateaux, caravane,
│   │                        #   ressources, faune, pêche, eau, régions, capitale, construction, économie
│   ├── carte/               # Générateur et rendu des cartes de région : relief, eau, paysage, zonage,
│   │                        #   routes, simulation, fortifications, outils, panneau
│   └── batiments/           # Bâtiments : catalogue, atelier, éléments de dessin, dessins de chaque bâtiment
├── data/
│   ├── monde/               # Géographie : admin1.topojson (les 500 régions), regions-water.topojson,
│   │                        #   water.json (fleuves et lacs), fishing.json (pêche en mer), nav-grid.json (bateaux),
│   │                        #   routes.json (capitales et routes entre elles, précalculées)
│   └── regions/             # Caractéristiques des régions — voir data/regions/LISEZMOI.md
│       ├── regions.json     #   une fiche par région : climat, température, humidité, relief, sol,
│       │                    #   ressources, agriculture, animaux, pêche, eau, capitale
│       ├── zones-animales.json
│       └── formes.json      #   forme de chaque région pour la carte de sa capitale (contour, mer, fleuves, lacs, routes)
└── outils/                  # Scripts Node qui génèrent les données (hors ligne)
```

Le décor des cartes (sol, eau, routes, végétation, bâtiments) est peint en tuiles puis affiché par la carte graphique avec [PixiJS](https://pixijs.com/) (`js/carte/tuiles.js`) ; sans WebGL, les mêmes tuiles sont affichées en Canvas 2D. Ce qui bouge (habitants, aperçus, sélection) est dessiné par-dessus à chaque image.

Les trois pages de carte partagent les mêmes scripts `js/carte` et `js/batiments`. Chacune déclare son mode avec `const PAGE = 'region' | 'carte' | 'batiments'`.

## Utiliser le projet

Ouvrez `index.html` via un serveur local, par exemple `npx serve .` ou `python -m http.server`. Le chargement des données passe par `fetch`, donc un double-clic sur le fichier ne suffit pas. Une connexion internet est nécessaire pour MapLibre GL, TopoJSON, Turf (jsdelivr) et Google Fonts.

- **Modifier une région** (ressources, biome, sol…) : éditez `data/regions/regions.json`, puis rechargez.
- **Modifier le générateur de carte** : ouvrez `editeur-carte.html`. Le code se trouve dans `js/carte/`.
- **Modifier un bâtiment** : ouvrez `editeur-batiments.html`. Le catalogue est dans `js/batiments/catalogue.js`, les dessins dans `js/batiments/dessins.js`.

## Régénérer les données

Depuis la racine du projet, avec `@turf/turf` et `topojson-client` installés :

| Commande | Produit |
|---|---|
| `node outils/build-regions.js` | `data/regions/regions.json` (règles : `outils/modele-regions.js`) |
| `node outils/build-formes.js` | `data/regions/formes.json` : forme de chaque région pour la carte de sa capitale — à relancer après `build-routes` |
| `node outils/build-routes.js` | `data/monde/routes.json` : routes entre capitales (règles : `outils/reseau-routes.js`) — à relancer après `build-regions` si les capitales changent |
| `node outils/build-waterways.js outils/modele-regions.js data/monde/admin1.topojson data/monde/nav-grid.json data/monde` | `water.json`, `regions-water.topojson` (fleuves réels : `outils/rivers-world.json`) |
| `node outils/build-fishing.js data/monde/admin1.topojson outils/fishing-zones.json data/monde/fishing.json` | Zones de pêche en mer |
| `node outils/build-nav-grid.js data/monde/admin1.topojson data/monde/nav-grid.json` | Grille de navigation des bateaux |

Attention : `build-regions.js` réécrit `regions.json` et efface les modifications faites à la main.

## Hébergement

Le dépôt local n'a pas encore de remote GitHub. Le lien de travail actuel est un aperçu privé publié via Claude Artifacts. Pour obtenir un lien public définitif, déployez ce dossier (par exemple sur GitHub Pages) en pointant sur `index.html`.

## Suivi des versions

```
git log --oneline --stat
```
