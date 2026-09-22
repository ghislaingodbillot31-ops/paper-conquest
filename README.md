# Paper Conquest

Jeu de gestion politique et territoriale, rendu en une seule page HTML autonome (pas de build, pas de framework). Identité visuelle "papier & crayon" (palette claire, typographie manuscrite) posée sur un vrai globe interactif [MapLibre GL](https://maplibre.org/) (projection globe, [TopoJSON](https://github.com/topojson/topojson)) : chaque pays y est subdivisé en régions administratives synthétiques (admin-1), individuellement sélectionnables.

## Structure du projet

```
.
├── index.html                  # Redirection vers src/paper-conquest.html
├── src/
│   ├── paper-conquest.html     # Page principale (autonome, CDN pour MapLibre/TopoJSON/Turf + Google Fonts)
│   └── data/
│       └── admin1.topojson     # Données des régions admin-1
└── README.md
```

## Utiliser le projet

Ouvrir `src/paper-conquest.html` via un serveur local (le chargement de `data/admin1.topojson` nécessite `fetch`, donc pas de double-clic direct). Connexion internet requise pour charger MapLibre GL, TopoJSON et Turf depuis les CDN (jsdelivr) et les polices Google Fonts.

## Interface actuelle

- **Carte** : globe interactif (glisser pour tourner) où chaque région admin-1 est cliquable et colorée selon son continent. Le choix de départ se verrouille définitivement après validation et est conservé dans le `localStorage` du navigateur (persiste après reconnexion sur le même appareil, mais pas d'un appareil à l'autre).
- **Économie** / **Diplomatie** : tableaux de bord avec graphiques, classements et indicateurs — données fictives en attendant les vraies mécaniques de jeu.
- Autres entrées du menu (Population, Recherche, Construction, Réformes, Militaire, Journal, Classement) : emplacements réservés, prêts à recevoir leurs propres écrans.

## Hébergement

Le dépôt local n'a pas encore de remote GitHub configuré. Le lien de travail actuel est un aperçu privé publié via Claude Artifacts ; un lien public définitif nécessite de déployer ce dossier (par ex. GitHub Pages, en pointant sur `index.html`).

## Suivi des versions

Ce dossier est un dépôt Git. Pour voir l'historique complet :

```
git log --oneline --stat
```
