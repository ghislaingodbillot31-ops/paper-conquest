// Routes entre capitales : data/monde/routes.json, genere hors ligne (le calcul prenait 4 a 5 s
// au chargement du jeu). Regles : outils/reseau-routes.js. Entrees : data/monde/admin1.topojson,
// data/monde/water.json (lacs), data/regions/regions.json (position des capitales).
// Usage (depuis la racine du projet, avec @turf/turf et topojson-client) :
//   node outils/build-routes.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const turf = require('@turf/turf'), topojson = require('topojson-client');
const ROOT = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(ROOT, f), 'utf8'), json = f => JSON.parse(read(f));
const t0 = Date.now(), log = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', ...a);

// ---- declarations reprises dans les scripts du jeu (une seule source) ----
const game = fs.readdirSync(path.join(ROOT, 'js/jeu')).filter(f => f.endsWith('.js')).map(f => read('js/jeu/' + f)).join('\n');
function grab(re){
  const m = game.match(re); if(!m) throw new Error('introuvable dans js/jeu : ' + re);
  let i = m.index + m[0].length - 1;
  for(let d = 0; i < game.length; i++){ const ch = game[i];
    if(ch === '{' || ch === '[' || ch === '(') d++;
    else if(ch === '}' || ch === ']' || ch === ')'){ d--; if(!d) break; } }
  let end = i + 1; while(game[end] === ')' || game[end] === ';') end++;
  return game.slice(m.index, end);
}
const shared = [/function unwrapRingLongitudes\(ring\)\{/, /function unwrapGeometry\(geom\)\{/, /function normLon\(lon\)\{/,
  /function geoDistance\(a, b\)\{/, /const ISO3_CONTINENT = \{/].map(grab).join(';\n');

const regions = json('data/regions/regions.json');
const ctx = vm.createContext({ turf, topojson, console, DATA:{ topo:json('data/monde/admin1.topojson'), water:json('data/monde/water.json') },
  CAPITALS:new Map(regions.map(r => [r.id, r.capitale])) });
vm.runInContext(shared, ctx, { filename:'js/jeu (extraits)' });
vm.runInContext('var waterData = DATA.water; const regionInfo = id => ({ capitale:CAPITALS.get(id) });', ctx);
vm.runInContext(read('outils/reseau-routes.js'), ctx, { filename:'outils/reseau-routes.js' });
log('regles chargees');

// ---- calcul : un reseau independant par continent (jamais de faux voisinage par-dessus un ocean) ----
const out = vm.runInContext(`(() => {
  const topo = DATA.topo, obj = topo.objects[Object.keys(topo.objects)[0]], geometries = obj.geometries, fc = topojson.feature(topo, obj);
  fc.features.forEach((f, i) => { f.id = i + 1; unwrapGeometry(f.geometry); f.land = { type:'Feature', properties:{}, geometry:f.geometry }; });
  const C = ISO3_CONTINENT, iso = f => f.properties.adm0_a3;
  const filters = [
    f => iso(f) === 'AUS',
    f => C.africa.includes(iso(f)), f => C.europe.includes(iso(f)), f => C.asia.includes(iso(f)),
    f => C.namerica.includes(iso(f)), f => C.samerica.includes(iso(f)),
    f => C.oceania.includes(iso(f)) && iso(f) !== 'AUS',
  ];
  const capitales = [], routes = [], capitalById = new Map();
  filters.forEach(filterFn => {
    const idx = []; fc.features.forEach((f, i) => { if(filterFn(f)) idx.push(i); });
    if(!idx.length) return;
    const { villages, edges } = buildRegionNetwork(topo, { features:idx.map(i => fc.features[i]) }, idx.map(i => geometries[i]));
    villages.forEach(v => { capitales.push([v.regionId, v.coord]); capitalById.set(v.regionId, v.coord); });
    edges.forEach(e => { if(e.kind === 'land' && e.b !== null) routes.push([villages[e.a].regionId, villages[e.b].regionId, e.coords]); });
  });
  MANUAL_ROADS.forEach(r => {
    const a = capitalById.get(r.a), b = capitalById.get(r.b);
    if(!a || !b){ console.warn('Route manuelle ignoree (capitale absente):', r.a, r.b); return; }
    routes.push([r.a, r.b, [a, ...r.via, b]]);
  });
  console.log('routes de reparation (continents voisins) :', repairConnectivity(topo, fc, geometries, routes, capitalById));
  return { capitales, routes };
})()`, ctx, { filename:'build-routes (calcul)' });
log(out.capitales.length, 'capitales,', out.routes.length, 'routes');

// ---- ecriture : coordonnees a 4 decimales (11 m, invisible sur le globe), une route par ligne ----
const r4 = x => Math.round(x * 1e4) / 1e4, P = p => [r4(p[0]), r4(p[1])];
const txt = '{\n"capitales": [\n' + out.capitales.map(([id, c]) => JSON.stringify([id, P(c)])).join(',\n') +
  '\n],\n"routes": [\n' + out.routes.map(([a, b, c]) => JSON.stringify([a, b, c.map(P)])).join(',\n') + '\n]\n}\n';
fs.writeFileSync(path.join(ROOT, 'data/monde/routes.json'), txt);
log('data/monde/routes.json ecrit (' + Math.round(txt.length / 1024) + ' Ko)');
