# Paper Conquest

Jeu de gestion politique et territoriale, rendu en une seule page HTML autonome (pas de build, pas de framework). Identité visuelle "papier & crayon" (palette claire, typographie manuscrite) posée sur un vrai globe interactif [MapLibre GL](https://maplibre.org/) (projection globe, [TopoJSON](https://github.com/topojson/topojson)) : chaque pays y est subdivisé en régions administratives synthétiques (admin-1), individuellement sélectionnables.

## Structure du projet

```
.
├── index.html                  # Redirection vers src/paper-conquest.html
├── src/
│   ├── paper-conquest.html     # Jeu principal : globe, régions, économie, capitale (CDN pour MapLibre/TopoJSON/Turf + Google Fonts)
│   ├── capitale.html           # Carte d'une région (générateur de campagne, routes, zonage, bâtiments, fortifications)
│   └── data/
│       ├── admin1.topojson         # Les 500 régions
│       ├── regions-water.topojson  # Les régions avec fleuves et lacs creusés
│       ├── water.json              # Fleuves et lacs réels
│       ├── fishing.json            # Zones de pêche en mer
│       └── nav-grid.json           # Grille de navigation des bateaux (mer / terre, ~5 km)
├── docs/                       # Scripts Node de génération des données (régions, fleuves, pêche, grille de navigation)
└── README.md
```

`capitale.html` s'ouvre dans l'onglet **Carte de la région** de la capitale, pour chaque région possédée : la carte est générée d'après le climat réel de la région (biome), les vrais fleuves qui la traversent et son numéro (même région, même carte), puis chaque région garde son propre plan. Ouverte seule (sans paramètre), c'est la page de travail : plan de test et atelier des bâtiments.

## Utiliser le projet

Ouvrir `src/paper-conquest.html` via un serveur local (le chargement de `data/admin1.topojson` nécessite `fetch`, donc pas de double-clic direct). Connexion internet requise pour charger MapLibre GL, TopoJSON et Turf depuis les CDN (jsdelivr) et les polices Google Fonts.

## Interface actuelle

- **Carte** : globe interactif (glisser pour tourner) où chaque région admin-1 est cliquable et colorée selon son continent. Le choix de départ se verrouille définitivement après validation et est conservé dans le `localStorage` du navigateur (persiste après reconnexion sur le même appareil, mais pas d'un appareil à l'autre).
- **Capitale** : onglets de gestion de chaque région possédée — Carte de la région (campagne, routes, zonage, bâtiments, fortifications en palissade, bois ou pierre), Plan, Stocks, Construction, Caravane, Voyage.

## Hébergement

Le dépôt local n'a pas encore de remote GitHub configuré. Le lien de travail actuel est un aperçu privé publié via Claude Artifacts ; un lien public définitif nécessite de déployer ce dossier (par ex. GitHub Pages, en pointant sur `index.html`).

## Suivi des versions

Ce dossier est un dépôt Git. Pour voir l'historique complet :

```
git log --oneline --stat
```
