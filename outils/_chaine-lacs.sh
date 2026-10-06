set -e
node --max-old-space-size=10000 outils/build-waterways.js outils/modele-regions.js data/monde/admin1.topojson data/monde/nav-grid.json data/monde > outils/_waterways.log 2>&1
node outils/arrondir-cotes.js
node outils/reparer-croisements.js
node outils/build-formes.js
node outils/controle-lacs-monde.js
echo CHAINE-OK
