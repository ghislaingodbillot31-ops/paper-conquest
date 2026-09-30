// Donnees des regions : data/regions/regions.json (une fiche par region), genere hors ligne.
// Regles : outils/modele-regions.js. Entrees : data/monde/* et data/regions/zones-animales.json.
// Les fonctions partagees avec le jeu (littoral, poissons des fleuves, listes de ressources...)
// sont lues dans js/jeu : une seule source.
// Usage (depuis la racine du projet, avec @turf/turf et topojson-client) :
//   node outils/build-regions.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const turf = require('@turf/turf'), topojson = require('topojson-client');
const ROOT = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(ROOT, f), 'utf8'), json = f => JSON.parse(read(f));
const t0 = Date.now(), log = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', ...a);

// ---- declarations reprises dans les scripts du jeu ----
const game = fs.readdirSync(path.join(ROOT, 'js/jeu')).filter(f => f.endsWith('.js')).map(f => read('js/jeu/' + f)).join('\n');
// declaration complete : si le motif finit par { [ ou (, jusqu'a sa fermeture ; sinon, jusqu'a la fin de la ligne
function grab(re){
  const m = game.match(re); if(!m) throw new Error('introuvable dans js/jeu : ' + re);
  let i = m.index + m[0].length - 1;
  if(!'{[('.includes(game[i])){ const e = game.indexOf('\n', i); return game.slice(m.index, e < 0 ? game.length : e); }
  for(let d = 0; i < game.length; i++){ const ch = game[i];
    if(ch === '{' || ch === '[' || ch === '(') d++;
    else if(ch === '}' || ch === ']' || ch === ')'){ d--; if(!d) break; } }
  let end = i + 1; while(game[end] === ')' || game[end] === ';') end++;
  return game.slice(m.index, end);
}
const shared = [/function unwrapRingLongitudes\(ring\)\{/, /function unwrapGeometry\(geom\)\{/, /function normLon\(lon\)\{/,
  /const coastCache = new Map\(\);/, /let arcUse = null;/, /function coastOf\(regionId\)\{/,
  /const MINERALS = \[/, /const CROPS = \[/, /const FRESH_FISH = \[/, /const LAND_ANIMALS = \{/, /const RIVER_FISH = \{/,
  /function freshFishAt\(lon, lat\)\{/, /const riverFish = r =>/, /const lakeFish = l =>/, /const riverLevel = r =>/, /const lakeLevel = l =>/,
  /const zoneAnimals = z =>/, /const ISO3_CONTINENT = \{/].map(grab).join(';\n');

// ---- contexte : bibliotheques, donnees, fonctions du jeu, modele ----
const ctx = vm.createContext({ turf, topojson, console, DATA:{
  topo:json('data/monde/admin1.topojson'), waterTopo:json('data/monde/regions-water.topojson'), water:json('data/monde/water.json'),
  fishing:json('data/monde/fishing.json'), zones:json('data/regions/zones-animales.json') } });
vm.runInContext(shared, ctx, { filename:'js/jeu (extraits)' });
vm.runInContext(read('outils/modele-regions.js'), ctx, { filename:'outils/modele-regions.js' });
log('modele charge');

// ---- calcul, comme le jeu le faisait au chargement ----
const regions = vm.runInContext(`(() => {
  var waterData = DATA.water; globalThis.waterData = waterData;
  const topo = DATA.topo, obj = topo.objects[Object.keys(topo.objects)[0]], geometries = obj.geometries, fc = topojson.feature(topo, obj);
  const colors = [];
  fc.features.forEach((f, i) => {
    f.id = i + 1;
    // couleur du climat au centre du plus grand anneau (avant deroulage), legere variation de teinte
    const ring = largestRing(f.geometry); let sx = 0, sy = 0; for(const [x, y] of ring){ sx += x; sy += y; }
    colors[i] = tintHex(climateColorAt(sy / ring.length, sx / ring.length), ((geometrySeed(f.geometry) % 9) - 4) * 0.03);
    unwrapGeometry(f.geometry);
    f.properties.clusterArea = Math.round(turf.area(f) / 1e6);
  });
  const carved = topojson.feature(DATA.waterTopo, DATA.waterTopo.objects.regions).features;
  fc.features.forEach((f, i) => { f.geometry = carved[i].geometry; });
  globalThis.regionsFc = fc; globalThis.regionTopo = topo; globalThis.regionGeoms = geometries;
  globalThis.regionFeature = id => fc.features[id - 1];
  // capitales : les regions du reseau routier (par continent, comme le jeu)
  const C = ISO3_CONTINENT, inNetwork = f => f.properties.adm0_a3 === 'AUS' || ['africa', 'europe', 'asia', 'namerica', 'samerica'].some(k => C[k].includes(f.properties.adm0_a3)) || (C.oceania.includes(f.properties.adm0_a3) && f.properties.adm0_a3 !== 'AUS');
  const capitals = fc.features.map(f => safeInteriorPoint(f));
  globalThis.capitalById = new Map(); fc.features.forEach((f, i) => { if(inNetwork(f)) capitalById.set(f.id, capitals[i]); });
  computeResources();                                    // minerais et cultures, sols, poissons d'eau douce
  globalThis.dAnchor = new Map();
  globalThis.ANIMAL_ZONES = DATA.zones.map(z => ({ name:z.nom, macro:z.ensemble, anchors:z.ancrages, elevage:z.elevage, faune:z.faune, predateur:z.predateurs }));
  computeAnimalZones();                                  // zone de faune et abondance des especes
  const seaZones = DATA.fishing.zones.map(z => ({ type:'Feature', properties:{}, geometry:z.geometry }));
  const r2 = x => Math.round(x * 100) / 100, pick = (res, keys) => Object.fromEntries(keys.filter(k => res[k]).map(k => [k, res[k]]));
  const animals = cat => Object.keys(LAND_ANIMALS).filter(k => LAND_ANIMALS[k].cat === cat);
  return fc.features.map((f, i) => {
    const id = f.id, res = regionResources.get(id) || {}, p = regionProfile(f), clim = regionClimate(id), biome = regionBiome(id);
    const relief = reliefOf(clim.lat, clim.lon, p.terrain), coast = coastOf(id), wat = regionWaters.get(id);
    const mer = coast ? seaZones.map((z, k) => { try{ return turf.booleanIntersects(z, coast.lines) ? k : -1; }catch(e){ return -1; } }).filter(k => k >= 0) : [];
    return {
      id, pays:f.properties.adm0_a3, centre:[r2(clim.lon), r2(clim.lat)], capitale:capitals[i], aire_km2:f.properties.clusterArea,
      climat:{ biome, temperature_c:temperatureAt(clim.abs, relief.montagne), humidite:r2(1 - clim.arid), couleur:colors[i] },
      relief:{ type:relief.type, montagne:r2(relief.montagne), volcan:r2(relief.volcan), bouclier:r2(relief.bouclier) },
      sol:{ fertilite:r2(p.fertility), qualite:regionSoil.get(id) },
      ressources:pick(res, MINERALS), agriculture:pick(res, CROPS),
      animaux:{ zone:regionAnimalZone.has(id) ? regionAnimalZone.get(id) : null, elevage:pick(res, animals('elevage')), faune:pick(res, animals('faune')), predateurs:pick(res, animals('predateur')) },
      peche:{ eau_douce:pick(res, FRESH_FISH), mer },
      eau:{ fleuves:wat ? wat.rivers : [], lacs:wat ? wat.lakes : 0, cotiere:!!coast, cours_eau_carte:regionRiverMode(id, biome) },
    };
  });
})()`, ctx, { filename:'build-regions (calcul)' });
log(regions.length, 'regions calculees');

// ---- ecriture : une region = quelques lignes, une ligne par theme ----
const J = v => JSON.stringify(v).replace(/":/g, '": ').replace(/,"/g, ', "');
const out = '[\n' + regions.map(r => '  {\n' + [
  `"id": ${r.id}, "pays": ${J(r.pays)}, "centre": ${J(r.centre)}, "capitale": ${J(r.capitale)}, "aire_km2": ${r.aire_km2}`,
  ...['climat', 'relief', 'sol', 'ressources', 'agriculture', 'animaux', 'peche', 'eau'].map(k => `${J(k)}: ${J(r[k])}`),
].map(l => '    ' + l).join(',\n') + '\n  }').join(',\n') + '\n]\n';
fs.writeFileSync(path.join(ROOT, 'data/regions/regions.json'), out);
log('data/regions/regions.json ecrit (' + Math.round(out.length / 1024) + ' Ko)');
