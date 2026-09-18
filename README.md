# Globe Filaire

Globe terrestre interactif "filaire" (wireframe), rendu en une seule page HTML autonome avec [D3.js](https://d3js.org/) (projection orthographique) et [TopoJSON](https://github.com/topojson/topojson) pour les tracés continentaux. Rotation à la souris/tactile, thème papier ancien.

## Structure du projet

```
.
├── src/
│   └── globe-filaire.html      # Version actuelle (à jour)
├── versions/
│   └── v1/
│       └── globe-filaire.html  # Première version (archive)
├── docs/                       # Notes / documentation future
└── README.md
```

- **`src/`** contient toujours la dernière version fonctionnelle du projet.
- **`versions/`** archive les versions précédentes pour référence, avec un sous-dossier par version.
- L'historique détaillé des changements est dans l'historique Git (`git log`), qui fait office de trace complète du projet.

## Utiliser le projet

Ouvrir `src/globe-filaire.html` directement dans un navigateur (double-clic ou glisser-déposer). Connexion internet requise pour charger D3.js et TopoJSON depuis les CDN (cdnjs / jsdelivr).

## Suivi des versions

Ce dossier est un dépôt Git. Pour voir l'historique complet :

```
git log --oneline --stat
```

Pour toute nouvelle modification, créer un commit avec un message clair afin de garder une trace exploitable du projet.
