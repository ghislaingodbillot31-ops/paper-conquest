# Données des régions

Tout ce qui décrit les 500 régions du globe est ici. Le jeu lit ces fichiers au chargement ; il ne recalcule rien.

| Fichier | Contenu |
|---|---|
| `regions.json` | Une fiche par région (500), dans l'ordre des numéros de région |
| `zones-animales.json` | Les 37 zones de faune : nom, ensemble de continents, points d'ancrage, espèces |
| `formes.json` | Forme de chaque région pour la carte de sa capitale : contour, terres voisines (le reste est la mer), vrais fleuves et lacs, capitale, routes vers les voisines — en mètres de la carte (2 000 × 1 500 m). Généré par `node outils/build-formes.js` |

## Une fiche de région

```
{
  "id": 42, "pays": "RUS", "centre": [62.58, 63.89], "capitale": [62.0142, 63.9569], "aire_km2": 288434,
  "climat": { "biome": "taiga", "temperature_c": -3, "humidite": 1, "couleur": "#deead7" },
  "relief": { "type": "plaine", "montagne": 0, "volcan": 0, "bouclier": 0 },
  "sol": { "fertilite": 0.07, "qualite": 0 },
  "ressources": { "fer": 2 },
  "agriculture": { "seigle": 2, "bois": 2, "bois_chauffage": 2, "pierre": 2 },
  "animaux": { "zone": 6, "elevage": { "cheval": 2, "renne_dom": 2 }, "faune": { "elan": 2, "renne": 2, "castor": 2, "zibeline": 2, "hermine": 2 }, "predateurs": { "loup": 2, "ours_brun": 2, "lynx": 2 } },
  "peche": { "eau_douce": { "brochet": 3, "saumon": 2, "esturgeon": 3, "coregone": 3 }, "mer": [] },
  "eau": { "fleuves": ["Petchora", "Ob"], "lacs": 0, "cotiere": false, "cours_eau_carte": "fleuve" }
}
```

| Champ | Sens |
|---|---|
| `id` | Numéro de la région (celui affiché sur le globe) |
| `pays` | Code du pays réel (information, jamais affiché aux joueurs) |
| `centre` | Centre de la région, [longitude, latitude] en degrés |
| `capitale` | Position de la capitale, [longitude, latitude] : les routes partent d'ici |
| `aire_km2` | Surface de la région |
| `climat.biome` | Biome de la carte de région (voir la liste plus bas) |
| `climat.temperature_c` | Température moyenne annuelle, en °C |
| `climat.humidite` | 0 (désert) à 1 (très humide) |
| `climat.couleur` | Couleur de la région sur le globe |
| `relief.type` | `plaine`, `collines` ou `montagne` |
| `relief.montagne`, `volcan`, `bouclier` | 0 à 1 : présence de chaînes jeunes, de volcans, de vieux massifs |
| `sol.fertilite` | 0 à 1 |
| `sol.qualite` | 0 stérile, 1 pauvre, 2 moyen, 3 fertile, 4 très fertile |
| `ressources` | Minerais présents et leur abondance |
| `agriculture` | Cultures, bois et pierre, et leur rendement |
| `animaux.zone` | Numéro de la zone dans `zones-animales.json` (à partir de 0), ou `null` |
| `animaux.elevage`, `faune`, `predateurs` | Espèces présentes et leur abondance |
| `peche.eau_douce` | Poissons des fleuves et des lacs de la région, et leur abondance |
| `peche.mer` | Zones de pêche en mer touchées par le littoral (numéros dans `data/monde/fishing.json`) |
| `eau.fleuves` | Vrais fleuves qui traversent la région |
| `eau.lacs` | Nombre de lacs |
| `eau.cotiere` | La région a un littoral (ports possibles) |
| `eau.cours_eau_carte` | Cours d'eau de la carte de région : `fleuve`, `riviere`, `petite` ou `aucun` |

**Abondance** (ressources, agriculture, animaux, poissons) : 1 faible, 2 moyenne, 3 élevée. Une ressource absente n'est pas listée.

**Identifiants** : les noms affichés (Fer, Blé, Loup, Brochet…) sont dans le jeu, `js/jeu/ressources.js`.

- Minerais : `fer`, `sel`, `cuivre`, `plomb`, `etain`, `alun`, `argent`, `or`, `ambre`.
- Cultures : `ble`, `orge`, `seigle`, `avoine`, `lin`, `chanvre`, `garance`, `pastel`, `poivre`, `cannelle`, `girofle`, `muscade`, `safran`, `bois`, `bois_chauffage`, `pierre`.

**Biomes** : `polaire`, `toundra`, `taiga`, `tempere`, `prairie`, `subtropicale`, `mediterraneenne`, `mousson`, `desert_aride`, `xerophyte`, `steppe_aride`, `semi_aride`, `savane`, `savane_claire`, `tropicale_cad`, `tropicale`, `toundra_alpine`, `montagne`.

## Modifier les données

- **À la main** : modifiez une fiche dans `regions.json` et rechargez le jeu. Par exemple, ajoutez `"cuivre": 3` à la région 42, ou changez son biome.
- **Par les règles** : les règles de calcul sont dans `outils/modele-regions.js` (zones géologiques, gisements, règles des cultures, fertilité, biomes, température). Après une modification, régénérez depuis la racine du projet :

  ```
  node outils/build-regions.js
  ```

  La commande a besoin de `@turf/turf` et `topojson-client`. Attention : la régénération réécrit `regions.json` et efface les modifications faites à la main.
