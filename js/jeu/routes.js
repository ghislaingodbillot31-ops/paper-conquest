// ---------- Reseau de chemins entre capitales ----------
// Calcule hors ligne (outils/build-routes.js, regles dans outils/reseau-routes.js) et lu dans
// data/monde/routes.json : le jeu ne fait plus ce calcul au chargement (4 a 5 s de gel).
// Chemins terrestres = vrais voisins (adjacence topojson), restant sur la terre, sans lac.
// Les deplacements par la mer passent par la navigation des bateaux (nav-grid.json).

// Normalise une longitude dans [-180,180]: nos polygones "deroules"
// (Russie/Alaska/Fidji, cf. unwrapGeometry) sortent de cette plage, ce qui
// fausserait un calcul de distance directe entre un point deroule et un
// point normal proche de l'antimeridien.
function normLon(lon){
  let l = lon % 360;
  if(l > 180) l -= 360;
  if(l < -180) l += 360;
  return l;
}
function geoDistance(a, b){
  return turf.distance([normLon(a[0]), a[1]], [normLon(b[0]), b[1]]);
}

// Routes et capitales lues dans data/monde/routes.json, puis affichees sur le globe
function addVillageNetwork(data){
  data.capitales.forEach(([id, coord]) => capitalById.set(id, coord));
  data.routes.forEach(([a, b, coords]) => addRoad(a, b, coords));
  const pathsFc = {
    type: 'FeatureCollection',
    features: data.routes.map(([, , coords]) => ({
      type: 'Feature', properties: { kind:'land' },
      geometry: { type: 'LineString', coordinates: coords },
    })),
  };
  const villagesFc = {
    type: 'FeatureCollection',
    features: data.capitales.map(([regionId, coord]) => ({
      type: 'Feature', properties: { regionId }, geometry: { type: 'Point', coordinates: coord },
    })),
  };
  map.addSource('paths', { type: 'geojson', data: pathsFc });
  map.addLayer({
    id: 'paths', type: 'line', source: 'paths',
    paint: {
      'line-color': '#6b4a2a', 'line-width': 1.4, 'line-opacity': 0.75,
      'line-dasharray': [2, 1.5],
    },
  });

  map.addSource('villages', { type: 'geojson', data: villagesFc });
  map.addLayer({
    id: 'villages-halo', type: 'circle', source: 'villages',
    paint: { 'circle-radius': 5.5, 'circle-color': '#f6efe0', 'circle-opacity': 0.9 },
  });
  map.addLayer({
    id: 'villages', type: 'circle', source: 'villages',
    paint: {
      'circle-radius': 3, 'circle-color': '#4a3418',
      'circle-stroke-color': '#f6efe0', 'circle-stroke-width': 1,
    },
  });
  applyDevFilters();
}
