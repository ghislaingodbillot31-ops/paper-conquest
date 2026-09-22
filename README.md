# Paper Conquest

Jeu de gestion politique et territoriale, rendu en une seule page HTML autonome (pas de build, pas de framework). Identité visuelle "papier & crayon" : palette claire, typographie manuscrite, carte du monde stylisée en continents dessinés à la main.

## Structure du projet

```
.
├── index.html                  # Redirection vers src/paper-conquest.html
├── src/
│   ├── paper-conquest.html     # Page principale (autonome, HTML/CSS/JS + Google Fonts)
│   └── data/
│       └── admin1.topojson     # Données des régions admin-1 (héritées de la version globe MapLibre, non utilisées par l'interface actuelle)
└── README.md
```

## Utiliser le projet

Ouvrir `src/paper-conquest.html` directement dans un navigateur (aucun serveur local requis, aucune dépendance externe au chargement à part les polices Google Fonts).

## Interface actuelle

- **Carte** : sélection de la région de départ (6 continents cliquables). Le choix se verrouille définitivement après validation et est conservé dans le `localStorage` du navigateur (persiste après reconnexion sur le même appareil, mais pas d'un appareil à l'autre).
- **Économie** / **Diplomatie** : tableaux de bord avec graphiques, classements et indicateurs — données fictives en attendant les vraies mécaniques de jeu.
- Autres entrées du menu (Population, Recherche, Construction, Réformes, Militaire, Journal, Classement) : emplacements réservés, prêts à recevoir leurs propres écrans.

## Hébergement

Le dépôt local n'a pas encore de remote GitHub configuré. Le lien de travail actuel est un aperçu privé publié via Claude Artifacts ; un lien public définitif nécessite de déployer ce dossier (par ex. GitHub Pages, en pointant sur `index.html`).

## Suivi des versions

Ce dossier est un dépôt Git. Pour voir l'historique complet :

```
git log --oneline --stat
```
