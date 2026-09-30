// Modele des regions : les regles qui produisent data/regions/regions.json.
// Utilise par outils/build-regions.js (et outils/build-waterways.js pour le relief et l'aridite).
// Le jeu ne calcule plus rien de tout cela : il lit le resultat dans data/regions/.
// Contenu : couleur du climat sur le globe, aridite, geologie et gisements, regles de score
// des ressources et des cultures, fertilite des sols, position des capitales, repartition de
// la faune, biome et cours d'eau de la carte de region, temperature et relief.
// Fonctions attendues dans le contexte (lues dans les scripts du jeu par build-regions.js) :
// normLon, coastOf, riverFish, lakeFish, riverLevel, lakeLevel, zoneAnimals,
// MINERALS, CROPS, ainsi que regionsFc, regionFeature, capitalById, waterData, ANIMAL_ZONES.

// Couleur "carte physique" par climat plutot que par pays: le jeu ne doit
// pas reveler les vraies frontieres politiques (les joueurs creent leurs
// propres pays sur ce globe), seulement le relief/climat qu'on verrait sur
// un vrai globe. Degrade continu sur deux axes (temperature + aridite),
// jamais de zones a bordure dure.
function lerp(a, b, t){ return a + (b - a) * t; }
function smooth01(t){ t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
function lerpColor(c1, c2, t){
  t = smooth01(t);
  const p1 = parseInt(c1.slice(1), 16), p2 = parseInt(c2.slice(1), 16);
  const r = Math.round(lerp((p1 >> 16) & 255, (p2 >> 16) & 255, t));
  const g = Math.round(lerp((p1 >> 8) & 255, (p2 >> 8) & 255, t));
  const b = Math.round(lerp(p1 & 255, p2 & 255, t));
  const h = v => v.toString(16).padStart(2, '0');
  return '#' + h(r) + h(g) + h(b);
}

const COL_DEEP_FOREST = '#1f6b3c'; // grosse foret (equatoriale, humide)
const COL_FOREST      = '#a9db8e'; // pays forestier (foret temperee)
const COL_COLD        = '#f5f7f5'; // pays froid
const COL_HOT_DRY     = '#f0932b'; // climat tres chaud (desert le plus chaud)
const COL_DESERT      = '#f4e28c'; // desert / steppe seche

// Chaine humide (foret dense->claire->neige) selon la latitude absolue.
function humidColor(absLat){
  if(absLat < 12) return lerpColor(COL_DEEP_FOREST, COL_FOREST, absLat / 12);
  if(absLat < 55) return COL_FOREST;
  if(absLat < 68) return lerpColor(COL_FOREST, COL_COLD, (absLat - 55) / 13);
  return COL_COLD;
}
// Chaine seche (orange brulant->jaune desert->neige), memes paliers.
function aridColor(absLat){
  if(absLat < 25) return lerpColor(COL_HOT_DRY, COL_DESERT, absLat / 25);
  if(absLat < 55) return COL_DESERT;
  if(absLat < 68) return lerpColor(COL_DESERT, COL_COLD, (absLat - 55) / 13);
  return COL_COLD;
}

// Centres de desert [lat, lon, rayon en degres], pour une aridite continue
// (score qui s'attenue en douceur avec la distance).
const ARID_CENTERS = [
  [23, 10, 20],    // Sahara
  [20, 45, 15],    // Peninsule arabique
  [40, 75, 18],    // deserts d'Asie centrale (Gobi, Taklamakan, Kyzylkoum)
  [28, -108, 12],  // sud-ouest des Etats-Unis / Mexique
  [-25, 133, 18],  // interieur australien
  [-24, -69, 8],   // Atacama
  [-23, 18, 12],   // Kalahari / Namib
];
function aridityAt(lat, lon){
  let best = 0;
  for(const [clat, clon, radius] of ARID_CENTERS){
    const d = Math.hypot(lat - clat, lon - clon);
    const score = smooth01(1 - d / (radius * 2));
    if(score > best) best = score;
  }
  return best;
}

// Couleur finale: interpole entre la chaine humide et la chaine seche
// selon l'aridite locale, elle-meme continue -- aucune des deux
// dimensions ne cree de bordure nette.
function climateColorAt(lat, lon){
  const absLat = Math.abs(lat);
  const aridity = aridityAt(lat, lon);
  return lerpColor(humidColor(absLat), aridColor(absLat), aridity);
}

// Eclaircit/assombrit une couleur hex vers le blanc (amt>0) ou le noir
// (amt<0). Sert a decliner plusieurs teintes distinctes a l'interieur
// d'une meme sous-region.
function tintHex(hex, amt){
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = amt >= 0 ? 255 : 0;
  const p = Math.abs(amt);
  const c = v => Math.round(v + (mix - v) * p).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}

// Plus grand anneau (exterieur) d'une geometrie, pour son centroide.
function largestRing(geom){
  const rings = geom.type === 'Polygon' ? [geom.coordinates[0]]
    : geom.coordinates.map(poly => poly[0]);
  let best = rings[0], bestArea = 0;
  for(const ring of rings){
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for(const [x, y] of ring){
      if(x < minX) minX = x; if(x > maxX) maxX = x;
      if(y < minY) minY = y; if(y > maxY) maxY = y;
    }
    const area = (maxX - minX) * (maxY - minY);
    if(area > bestArea){ bestArea = area; best = ring; }
  }
  return best;
}

// Empreinte numerique stable d'une geometrie (centroide approche de son
// plus grand anneau), graine deterministe pour la variation de teinte.
function geometrySeed(geom){
  const ring = largestRing(geom);
  let sx = 0, sy = 0;
  for(const [x, y] of ring){ sx += x; sy += y; }
  const cx = Math.round((sx / ring.length) * 1000);
  const cy = Math.round((sy / ring.length) * 1000);
  let h = 0;
  const s = cx + ',' + cy;
  for(let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}


// ----------------------------------------------------------------
const clamp01 = x => Math.max(0, Math.min(1, x));
// fenetre climatique douce [a, b] avec transition de largeur s
const band = (x, a, b, s = 5) => clamp01(Math.min((x - a) / s + 1, (b - x) / s + 1));
// rendement selon la fertilite F (0..1): soft = culture peu exigeante
const yieldOf = (F, soft = 0) => (0.2 + 0.9 * F) * (1 - soft) + soft;

// bruit de valeur lisse (0..1), meme famille que les frontieres ondulees
function geoHash(ix, iy, s){ let h = (ix * 374761393 + iy * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967295; }
function geoNoise(lon, lat, seed, waveKm){
  const x = lon * 111.2 * Math.cos(lat * Math.PI / 180) / waveKm, y = lat * 111.2 / waveKm;
  const layer = (x, y, s) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = geoHash(ix, iy, s), b = geoHash(ix + 1, iy, s), c = geoHash(ix, iy + 1, s), d = geoHash(ix + 1, iy + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  return (layer(x, y, seed) * 0.65 + layer(x * 2.3, y * 2.3, seed + 31) * 0.35);
}


// ----------------------------------------------------------------
// Regles de score de chaque ressource (profil de la region -> 0..1). Les noms sont dans le jeu (RESOURCES).
const SCORES = {
  // Naturel: p.terrain = contexte geologique (GEO_TERRAIN), p.deposit =
  // gisements historiques connus (GEO_DEPOSITS), p.geo = variation locale.
  // local(): la variation ne joue que la ou le contexte existe, pour que
  // les minerais localises ne debordent jamais hors de leur terrain.
  fer:           { score:p => { const t = p.terrain;
    return 0.2 + t.montagne * 0.3 + t.sediment * 0.25 + t.ancien * 0.15 + p.deposit.fer * 0.7 + p.geo.fer * 0.35; } },
  sel:           { score:p => { const t = p.terrain;
    return local(Math.max(t.evaporite, t.desert * 0.65, p.coastal ? 0.25 + t.desert * 0.5 : 0), p.geo.sel); } },
  cuivre:        { score:p => { const t = p.terrain;
    return local(Math.max(t.volcan * 0.7, t.montagne * 0.55) + t.desert * t.montagne * 0.1 + p.deposit.cuivre * 0.75, p.geo.cuivre); } },
  plomb:         { score:p => { const t = p.terrain;
    return local(t.karst * 0.45 + t.montagne * 0.35 + p.deposit.plomb * 0.75 + p.deposit.argent * 0.25, p.geo.plomb) + t.sediment * 0.1; } },
  etain:         { score:p => local(p.terrain.granite * 1.05 + p.terrain.granite * p.terrain.montagne * 0.1, p.geo.etain) },
  alun:          { score:p => local(p.terrain.hydrothermal * 0.95 + p.terrain.volcan * 0.35, p.geo.alun) },
  argent:        { score:p => { const t = p.terrain;
    return local(p.deposit.argent * 0.95 + t.volcan * t.montagne * 0.5 + p.deposit.plomb * 0.25 + p.deposit.cuivre * 0.15, p.geo.argent); } },
  or:            { score:p => { const t = p.terrain;
    return local(p.deposit.or * 0.95 + t.ancien * 0.45 + t.alluvial * 0.3, p.geo.or); } },
  // Ambre: cote sud et est de la Baltique, le plus riche au Sambland
  ambre:         { score:p => p.coastal && p.lon > 9 && p.lon < 30 && p.lat > 53 && p.lat < 61
    ? 0.4 + 0.6 * smooth01(1 - geoDist(p.lat, p.lon, 54.9, 20.2) / 8) : 0 },
  // Sol / Qualite: p.fertility (0..1), p.absLat (climat), p.arid/p.humid
  ble:           { score:p => band(p.absLat, 25, 55, 8) * (1 - p.arid * 0.8) * yieldOf(p.fertility) },
  orge:          { score:p => band(p.absLat, 20, 62, 8) * (1 - p.arid * 0.5) * yieldOf(p.fertility, 0.25) },
  seigle:        { score:p => band(p.absLat, 45, 64, 5) * (1 - p.arid * 0.6) * yieldOf(p.fertility, 0.4) },
  avoine:        { score:p => band(p.absLat, 40, 62, 5) * p.humid * yieldOf(p.fertility, 0.15) },
  lin:           { score:p => band(p.absLat, 40, 60, 5) * p.humid * yieldOf(p.fertility) },
  chanvre:       { score:p => band(p.absLat, 28, 58, 6) * (1 - p.arid * 0.7) * yieldOf(p.fertility) },
  garance:       { score:p => band(p.absLat, 30, 50, 5) * band(p.arid, 0.05, 0.55, 0.12) * yieldOf(p.fertility) },
  pastel:        { score:p => band(p.absLat, 40, 56, 4) * p.humid * yieldOf(p.fertility) },
  poivre:        { score:p => p.tropical * p.humid * band(p.absLat, 0, 14, 3) * spiceOrigin(p, 'poivre') * yieldOf(p.fertility) },
  cannelle:      { score:p => p.tropical * p.humid * band(p.absLat, 0, 10, 3) * (p.coastal ? 1 : 0.5) * spiceOrigin(p, 'cannelle') * yieldOf(p.fertility) },
  girofle:       { score:p => p.tropical * p.humid * band(p.absLat, 0, 8, 2) * (p.coastal ? 1 : 0.3) * spiceOrigin(p, 'girofle') * yieldOf(p.fertility) },
  muscade:       { score:p => p.tropical * p.humid * band(p.absLat, 0, 8, 2) * (p.coastal ? 1 : 0.3) * spiceOrigin(p, 'muscade') * yieldOf(p.fertility) },
  safran:        { score:p => band(p.absLat, 30, 42, 3) * band(p.arid, 0.25, 0.7, 0.12) * spiceOrigin(p, 'safran') * yieldOf(p.fertility, 0.5) },
  bois:          { score:p => p.forest * yieldOf(p.fertility, 0.5) },
  bois_chauffage:{ score:p => (p.forest * 0.8 + p.humid * 0.25) * yieldOf(p.fertility, 0.5) },
  // sols minces et rocheux: la pierre affleure la ou la terre est pauvre
  pierre:        { score:p => (1 - p.fertility) * 0.45 + p.terrain.montagne * 0.4 + p.geo.pierre * 0.3 },
};

// ----------------------------------------------------------------
// Berceaux historiques des epices: le climat seul les mettrait dans toute
// la zone tropicale, leurs vraies terres d'origine sont bien plus etroites.
const SPICE_ORIGINS = {
  poivre:[[11,76,5],[0,101,6],[-7,108,4],[13,101,4]],       // Malabar, Sumatra, Java, Siam
  cannelle:[[7.5,80.7,4],[10,77,4],[15,105,4]],             // Ceylan, sud de l'Inde, Indochine
  girofle:[[0.8,127.5,8],[-3.5,128.2,8]],                   // Moluques (Ternate, Ambon), iles fondues dans de grandes regions
  muscade:[[-4.5,129.9,8],[-3.5,128.2,8]],                  // iles Banda
  safran:[[34,58,5],[34,75,3],[39,-3,3],[38,22,3],[39,34,4]], // Perse, Cachemire, Castille, Grece, Anatolie
};
const spiceOrigin = (p, k) => 0.15 + zoneScore(p.lat, p.lon, SPICE_ORIGINS[k], 1.3) * 1.5;

// ----------------------------------------------------------------
const soilLevelOf = F => F < 0.15 ? 0 : F < 0.35 ? 1 : F < 0.55 ? 2 : F < 0.75 ? 3 : 4;
// Terres reellement tres fertiles: tchernoziom, loess, grandes plaines
// alluviales et deltas (y compris en climat sec: Nil, Mesopotamie, Indus).
const FERTILE_ZONES = [[49,36,9],[53,62,5],[-34,-61,6],[41,-93,7],[51,-104,5],[36,112,6],[26,82,8],[28,31,3.5],[33,44.5,3.5],
  [45,10.5,2.5],[48.7,2,3],[47,20,3],[44.5,26,3],[-7.3,110,4],[10,105.8,3],[31,117,5],[21,106,2],[23.5,90,3],[30,72,4],
  [37,-120.5,3],[32,-91,4],[30.5,105,3],[37.5,-5.5,2],[0,32,3],[18,95.5,3],[15,100.5,2.5],[-23,-50,4],[52,6,2.5],[51,-0.5,2]];
function soilFertility(p){
  const moist = clamp01(p.humid * 1.1 - 0.05), warm = 1 - p.cold;
  // sols tropicaux humides lessives (lateritiques, Amazonie, Congo): pauvres
  const base = moist * warm * (1 - p.terrain.montagne * 0.5) * (1 - p.tropical * moist * 0.6);
  const zone = zoneScore(p.lat, p.lon, FERTILE_ZONES);
  // sols volcaniques (Java, Campanie, Ethiopie) et plaines alluviales enrichis
  const F = base * 0.85 + p.terrain.volcan * moist * 0.2 + zone * 0.45 + p.terrain.alluvial * 0.1 + (p.geo.sol - 0.5) * 0.2;
  return clamp01(Math.max(F, zone * 0.9));
}
const RESOURCE_SEEDS = { fer:11, etain:23, cuivre:37, plomb:41, argent:53, or:67, alun:71, sel:83, pierre:97, sol:149 };

// ----------------------------------------------------------------
// ---------- Geologie (minerais "Naturel") ----------
// Contextes geologiques reels, en zones [lat, lon, rayon en degres]:
// score 1 au centre, nul au-dela du rayon. Le terrain d'une region croise
// ces zones avec son climat (desert) et son littoral; les gisements
// historiques connus renforcent localement chaque minerai.
const GEO_TERRAIN = {
  // chaines de montagnes jeunes (orogenese alpine, cordilleres)
  montagne:[[46,10,4.5],[42.7,0.5,2.5],[47,24,4],[43,19,3.5],[42.5,44,3],[38,40,5],[32,52,5],[29,84,7],[34,92,8],[36,70,5],[42,80,5],
    [49,88,4],[52,97,4],[45,-112,9],[38,-106,6],[22,-104,6],[-5,-78,6],[-18,-68,6],[-32,-70,5],[-45,-72,4],[32,-5,4],[10,39,5],
    [37,138,5],[15,121,5],[24,100,5],[-5,142,4],[-43,171,3],[22,40,4],[62,-150,6],[65,130,6],[56,159,4],[40,-4,2.5],[37,-3.5,2]],
  // arcs volcaniques, rifts et points chauds
  volcan:[[40.5,14.5,3],[37.5,15,1.5],[37.5,25,2.5],[65,-19,3],[38.5,34,3],[40,44.5,2.5],[-2,36,5],[12,41,3.5],[5,10,2],[28,-16,2],
    [36,138,5],[52,157,5],[12,123,5],[-7,110,6],[0,100,4],[-8,120,4],[-6,148,4],[-39,176,3],[-2,-78,4],[-17,-70,4],[-38,-71,4],
    [13,-88,4],[19,-100,4],[45,-122,4],[57,-158,5],[20,-157,2],[44,-110,3],[45.5,3,1.5],[50.5,7,1.5],[15,44,3],[38.5,70,2]],
  // boucliers et massifs anciens (roches precambriennes, vieilles montagnes)
  ancien:[[55,-85,14],[64,25,7],[48.5,30,3],[62,110,10],[-12,-50,11],[5,-60,6],[10,-6,9],[-5,23,8],[-24,28,6],[-4,34,4],[18,78,8],
    [-26,120,9],[20,36,6],[38,114,6],[58,60,5],[38,-80,6],[63,13,5],[57,-4.5,2],[49.5,14,3],[45.5,2.5,2],[-28,150,6],[-19,-44,5],[64,-139,4]],
  // bassins sedimentaires et plateformes calcaires
  sediment:[[48.5,2.5,3.5],[52,-1,3],[51,9,3],[50,20,4],[55,40,9],[40,-98,9],[37,-86,4],[44,-84,4],[27,45,6],[30,-5,4],[-31,129,4],
    [-30,-62,7],[34,108,5],[40,-4,3],[38,-2,2],[48,-100,6]],
  // karsts (calcaires fissures, plomb-zinc de type Mississippi)
  karst:[[44,17,3],[44.3,3.2,1.5],[25,107,5],[20,-89,3],[37.5,-91,4],[37,-86,3],[37.5,33,3],[33,48,4],[54,-2,2],[50.4,18.8,2],[42.5,-5,2]],
  // provinces granitiques stanniferes
  granite:[[50.3,-5,1.8],[48,-3,2],[42,-8,3],[50.5,13,2],[4,101.5,6],[-2.5,106.5,2.5],[23.4,103,3],[-19,-66,4],[9.8,8.9,2],[-2,28,3],
    [51,115,4],[-42,146,2],[16,98,3],[-17,31,2],[69,139,4],[45,135,3],[-17,145,3],[-10,-63,3],[-21.5,15.5,2.5],[-7.3,27.4,3],
    [49,80,3],[25,112,3],[64,-165,3],[43,11,1.5]],
  // bassins evaporitiques (sel gemme, lacs sales, anciennes mers asséchees)
  evaporite:[[52.5,12,5],[47.6,13.5,1.5],[50,20,2],[48.5,6.5,2],[53.2,-2.5,1.5],[41.9,1.7,1.5],[46,24,3],[59,56,4],[31.5,35.5,2],
    [14,40.5,2.5],[22,-4,4],[18.7,12.9,3],[34,53,5],[32.7,72.5,2],[30,104,4],[37,95,4],[41,-112.5,3],[30,-92,4],[43,-84,3],
    [-21,-68,4],[-20.5,25.5,3],[45,50,5],[45,60,4],[-28.5,137.5,4],[53,104,3],[36,10,2],[35,-1,2]],
  // activite hydrothermale (alunite: Tolfa, Phocee, Karahisar, Solfatares...)
  hydrothermal:[[42.2,11.9,1.8],[38.6,27,2],[40.3,38.4,2],[40.8,14.1,1.2],[38.5,14.9,1],[50.3,13,1.5],[14,44,2],[36.5,138.5,3],
    [-38.5,176.2,2],[64,-20,2],[44.6,-110.5,2],[-23,-68,3],[37,-3,1.5],[31,119,3]],
};
const GEO_DEPOSITS = {
  fer:[[49.3,6,2],[67.8,20.2,3],[47.5,14.9,1.5],[42.8,10.3,1],[43.2,-3,1.5],[47.9,33.4,2],[51,37,3],[53.4,59,2],[50.8,8,1.5],
    [47.5,-92.5,3],[54,-67,4],[-6,-50.5,3],[-20,-43.8,2.5],[-22.5,118,4],[41,123,2.5],[22,85.5,3],[7.6,-8.5,2.5],[22.7,-12.5,2.5],
    [33.5,-86.8,2],[60,15,2],[52.5,-1.5,1.5],[28,112,3]],
  cuivre:[[35,33,1.5],[37.7,-6.6,2],[60.6,15.6,1.5],[51.6,11.5,1.3],[48.7,19.1,1.3],[30.5,35.2,1.5],[23.5,57,2.5],[38.3,39.8,2],
    [-24,-69,5],[-15,-72,3],[33,-111,4],[46,-112.5,2],[47.2,-88.4,2],[-12.5,27.5,4],[47.8,67.7,2.5],[43,106.9,2.5],[26.1,103.1,2],
    [36.6,139.4,1.5],[-4,137,2],[29,34,1.5],[57,60,3],[44.5,22,1.5]],
  plomb:[[54,-2,2],[51.3,-2.7,1],[51.8,10.6,1.5],[50.4,18.8,2],[39.3,8.5,1.5],[37.7,24,1],[44.2,3.5,2],[38.2,-3.7,3],[42.9,20.9,2],
    [37.5,-91,4],[-32,141.5,2],[-20.7,139.5,2],[24,108,5],[23,-102.5,3],[-10.7,-76.3,2],[34.5,-2,2],[37.5,33,2],[41.5,24.5,2]],
  argent:[[37.7,24,1],[51.8,10.6,1.3],[50.5,13,1.8],[49.9,15.3,1.5],[47.3,11.7,1.2],[48.45,18.9,1.2],[-19.6,-65.75,2.5],
    [22.5,-102,4],[-10.7,-76.3,2],[37.7,-6.6,2],[39.3,8.5,1.3],[42.6,21.4,1.5],[39.3,-119.6,2],[47.5,-115.9,2],[35.1,132.4,1.5],
    [40.5,39.5,1.5],[35.5,69.8,2],[41,69.5,2],[44.2,3.5,1.5]],
  or:[[-26.2,27.9,2.5],[6,-1.8,3],[13,-11,3],[21,33,4],[-19,30,3],[56,60,4],[46.2,23,2],[62,150,5],[58,114,4],[64,-139,3],
    [38.5,-120.7,2.5],[-19.5,-43.5,3],[-30.7,121.5,3],[-37.5,144,2],[6,-75.5,3],[-13,-72,2],[-45,169.5,2],[42.5,-7,2],
    [48.5,15,1.5],[-6,35,3],[15,76,2.5],[48,121,3],[31,34.5,1]],
};
// distance en degres (longitude ramenee a la latitude), antimeridien gere
function geoDist(lat, lon, clat, clon){
  const dl = ((lon - clon + 540) % 360) - 180;
  return Math.hypot(lat - clat, dl * Math.cos((lat + clat) * Math.PI / 360));
}
const local = (base, noise) => base > 0.02 ? base + noise * 0.25 : 0;
const zoneScore = (lat, lon, zones, reach = 1) => zones.reduce((best, [clat, clon, r]) => Math.max(best, smooth01(1 - geoDist(lat, lon, clat, clon) / (r * reach))), 0);
// portee elargie pour les contextes tres localises: une region du jeu est
// bien plus vaste qu'un district minier, son centre doit pouvoir y tomber
const GEO_REACH = { granite:1.6, volcan:1.25, hydrothermal:1.5 };
function geoTerrain(lat, lon, arid, humid){
  const t = {};
  for(const [k, zones] of Object.entries(GEO_TERRAIN)) t[k] = zoneScore(lat, lon, zones, GEO_REACH[k]);
  t.desert = arid;
  // hors bassin identifie: plaine basse ni montagneuse ni bouclier = sedimentaire modere
  t.sediment = Math.max(t.sediment, 0.35 * (1 - t.montagne) * (1 - t.ancien) * (1 - t.volcan));
  // lits de rivieres: plaines humides en aval des massifs anciens ou aurifères
  t.alluvial = humid * (1 - t.montagne * 0.5) * Math.max(t.ancien, zoneScore(lat, lon, GEO_DEPOSITS.or));
  return t;
}

// Profil d'une region (a remplacer par l'etude des sols)
function regionProfile(f){
  const c = capitalById.get(f.id) || turf.centroid(f).geometry.coordinates;
  const lon = ((c[0] + 540) % 360) - 180, lat = c[1], absLat = Math.abs(lat);
  const arid = aridityAt(lat, lon), humid = 1 - arid;
  const cold = smooth01((absLat - 48) / 20), tropical = 1 - smooth01((absLat - 12) / 12);
  const coastal = !!coastOf(f.id);
  const geo = {}; for(const [k, s] of Object.entries(RESOURCE_SEEDS)) geo[k] = geoNoise(lon, lat, s, 700);
  const terrain = geoTerrain(lat, lon, arid, humid);
  const deposit = {}; for(const [k, zones] of Object.entries(GEO_DEPOSITS)) deposit[k] = zoneScore(lat, lon, zones);
  const forest = clamp01(humid * 1.15 - 0.1) * (1 - smooth01((absLat - 64) / 8)) * (1 - terrain.montagne * 0.25);
  const p = { lon, lat, absLat, arid, humid, cold, tropical, coastal, forest, geo, terrain, deposit };
  p.fertility = soilFertility(p);
  return p;
}
// Part cible de regions (0..1), decroissante selon l'abondance reelle
// (fer > sel > cuivre > plomb > etain > alun > argent > or): les 30 %
// superieurs des regions retenues sont riches, les autres moyennes.
// L'ambre, sans part cible, garde des seuils fixes (cote balte).
// Cultures: seuils fixes sur le rendement, sauf les epices (rares) et la
// pierre (sinon presente presque partout).
const RESOURCE_SHARE = { fer:0.42, sel:0.3, cuivre:0.2, plomb:0.15, etain:0.09, alun:0.07, argent:0.055, or:0.045,
  poivre:0.07, cannelle:0.05, girofle:0.03, muscade:0.03, safran:0.05, pierre:0.4 };
const levelOf = s => s >= 0.7 ? 3 : s >= 0.5 ? 2 : s >= 0.33 ? 1 : 0;
const regionResources = new Map();  // numero de region -> { ressource: niveau }
const regionSoil = new Map();       // numero de region -> niveau de fertilite (0..4)
function computeResources(){
  const feats = regionsFc.features, profiles = feats.map(regionProfile), res = feats.map(() => ({}));
  for(const id of [...MINERALS, ...CROPS]){
    const scores = profiles.map(p => Math.max(0, SCORES[id].score(p) || 0));
    const share = RESOURCE_SHARE[id];
    if(share === undefined){ scores.forEach((s, i) => { const lv = levelOf(s); if(lv) res[i][id] = lv; }); continue; }
    const ranked = scores.map((s, i) => [s, i]).filter(x => x[0] > 0).sort((x, y) => y[0] - x[0]).slice(0, Math.round(share * feats.length));
    ranked.forEach(([, i], k) => { const q = k / ranked.length; res[i][id] = q < 0.25 ? 3 : q < 0.6 ? 2 : 1; });
  }
  feats.forEach((f, i) => { regionResources.set(f.id, res[i]); regionSoil.set(f.id, soilLevelOf(profiles[i].fertility)); });
  applyWaterFish();
}
// Eau douce: chaque fleuve et chaque lac donne ses poissons aux regions
// qu'il traverse (grand fleuve ou grand lac: riche, sinon moyen).
const regionWaters = new Map();   // numero de region -> { rivers:[noms], lakes:n }
function applyWaterFish(){
  if(!waterData) return;
  const give = (rid, fish, lv) => { const r = regionResources.get(rid); if(!r) return; fish.forEach(k => { r[k] = Math.max(r[k] || 0, lv); }); };
  const note = rid => { if(!regionWaters.has(rid)) regionWaters.set(rid, { rivers:[], lakes:0 }); return regionWaters.get(rid); };
  waterData.rivers.forEach(r => { const fish = riverFish(r), lv = riverLevel(r);
    (r.r || []).forEach(rid => { give(rid, fish, lv); note(rid).rivers.push(r.n); }); });
  waterData.lakes.forEach(l => { if(!l.r) return; give(l.r, lakeFish(l), lakeLevel(l)); note(l.r).lakes++; });
}


// ----------------------------------------------------------------
const regionAnimalZone = new Map();   // numero de region -> indice de zone
function macroOf([lon, lat]){
  if(lon < -25) return 'ameriques';
  if((lon >= 112 && lat < -10) || (lon >= 140 && lat < 0) || lon >= 165) return lat < 0 ? 'oceanie' : 'eurasie';
  return 'eurasie';
}
// chaque region -> zone du point d'ancrage le plus proche (meme ensemble de continents)
function computeAnimalZones(){
  ANIMAL_ZONES.forEach(z => { z.regions = []; });
  regionsFc.features.forEach(f => {
    let c; try{ c = turf.centroid(f).geometry.coordinates; }catch(e){ return; }
    const m = macroOf(c); let best = -1, bd = Infinity;
    ANIMAL_ZONES.forEach((z, k) => { if(z.macro !== m) return; for(const a of z.anchors){ const d = turf.distance(c, a); if(d < bd){ bd = d; best = k; } } });
    if(best < 0) return;
    regionAnimalZone.set(f.id, best); ANIMAL_ZONES[best].regions.push(f.id); dAnchor.set(f.id, bd);
  });
  // abondance: le tiers des regions le plus proche d'un point d'ancrage
  // (coeur de la zone) eleve, le tiers suivant moyen, la peripherie faible
  ANIMAL_ZONES.forEach(z => {
    const sorted = z.regions.slice().sort((a, b) => dAnchor.get(a) - dAnchor.get(b));
    sorted.forEach((id, k) => { const q = k / sorted.length, lv = q < 1 / 3 ? 3 : q < 2 / 3 ? 2 : 1;
      const r = regionResources.get(id); if(r) zoneAnimals(z).forEach(a => { r[a] = Math.max(r[a] || 0, lv); }); });
  });
}

// ----------------------------------------------------------------
// Position de capitale garantie loin de toute frontiere (jamais "a
// cheval" entre deux regions): on essaie plusieurs points candidats
// (centre de masse, centroide, point-sur-feature, plus une grille dans
// l'emprise de la region) et on garde celui dont la distance a la
// frontiere la plus proche est maximale -- une approximation rapide du
// "pole d'inaccessibilite" sans dependance externe.
// Densite de grille et simplification du contour adaptees a la SURFACE
// reelle de la region (turf.area): une grande region (ex. un Etat
// australien) a plus a gagner d'une grille fine, une petite n'en a pas
// besoin: son interieur est deja proche de la frontiere partout. Le
// contour est simplifie avant les mesures de distance (calcul par
// sommets, donc couteux sur un tres long trait de cote) avec une
// tolerance elle aussi liee a la taille de la region -- suffisant pour
// choisir un bon point interieur sans re-suivre chaque micro-detail des
// LIMITES DE FRONTIERE.
function safeInteriorPoint(feature){
  const bounds = turf.bbox(feature);
  const areaKm2 = turf.area(feature) / 1e6;
  const GRID = areaKm2 > 200000 ? 7 : areaKm2 > 20000 ? 6 : areaKm2 > 2000 ? 5 : 4;
  let boundaryLine;
  try{ boundaryLine = turf.polygonToLine(feature); }catch(e){ boundaryLine = null; }
  let lines = boundaryLine ? (boundaryLine.type === 'FeatureCollection' ? boundaryLine.features : [boundaryLine]) : [];
  const tolerance = Math.max(0.01, Math.sqrt(areaKm2) / 4000);
  lines = lines.map(l => { try{ return turf.simplify(l, { tolerance, highQuality:false }); }catch(e){ return l; } });
  function distToBoundary(pt){
    let min = Infinity;
    lines.forEach(l => {
      try{ const d = turf.pointToLineDistance(pt, l, { units:'kilometers' }); if(d < min) min = d; }catch(e){}
    });
    return min === Infinity ? 0 : min;
  }
  const candidates = [];
  const tryAdd = (pt) => { if(pt && turf.booleanPointInPolygon(pt, feature)) candidates.push(pt); };
  try{ tryAdd(turf.centerOfMass(feature).geometry.coordinates); }catch(e){}
  try{ tryAdd(turf.centroid(feature).geometry.coordinates); }catch(e){}
  try{ tryAdd(turf.pointOnFeature(feature).geometry.coordinates); }catch(e){}
  for(let gx = 0; gx < GRID; gx++){
    for(let gy = 0; gy < GRID; gy++){
      const x = bounds[0] + (bounds[2]-bounds[0]) * (gx+0.5)/GRID;
      const y = bounds[1] + (bounds[3]-bounds[1]) * (gy+0.5)/GRID;
      tryAdd([x, y]);
    }
  }
  if(!candidates.length) return turf.pointOnFeature(feature).geometry.coordinates;
  let best = candidates[0], bestD = -1;
  candidates.forEach(c => { const d = distToBoundary(c); if(d > bestD){ bestD = d; best = c; } });
  return best;
}


// ----------------------------------------------------------------
const MOUNTAINS = [                      // [lat min, lat max, lon min, lon max, biome]
  [27, 38, 75, 102, 'toundra_alpine'],   // Tibet, Himalaya
  [44, 48.5, 5, 16, 'montagne'],         // Alpes
  [36, 56, -125, -105, 'montagne'],      // Rocheuses
  [-40, 5, -79, -66, 'montagne'],        // Andes
  [38, 44, 40, 50, 'montagne'],          // Caucase
];
// zones seches pour le choix du biome (plus fines que les teintes du globe) : [lat, lon, rayon en degres]
const DRYLANDS = [[24, 8, 13], [24, 26, 11], [21, -8, 9], [18, 45, 11], [29, 40, 7], [32, 55, 9], [42, 62, 9], [42, 90, 11], [27, 71, 5],
  [31, -110, 8], [39, -116, 6], [-25, 133, 15], [-24, -69, 6], [-45, -69, 5], [-24, 18, 8], [8, 45, 6]];
const drynessAt = (lat, lon) => DRYLANDS.reduce((b, [a, o, r]) => Math.max(b, smooth01(1 - Math.hypot(lat - a, lon - o) / (r * 1.4))), 0);
function regionClimate(id){
  const ring = largestRing(regionFeature(id).geometry);
  let sx = 0, sy = 0; for(const [x, y] of ring){ sx += x; sy += y; }
  const lat = sy / ring.length, lon = ((sx / ring.length) + 540) % 360 - 180;
  return { lat, lon, abs:Math.abs(lat), arid:drynessAt(lat, lon) };
}
function regionBiome(id){
  const { lat, lon, abs, arid } = regionClimate(id), inBox = ([a, b, c, d]) => lat >= a && lat <= b && lon >= c && lon <= d;
  if(abs >= 72) return 'polaire';
  if(abs >= 64) return 'toundra';
  const m = MOUNTAINS.find(inBox); if(m && arid < .6) return m[4];
  if(abs >= 54) return 'taiga';
  if(arid >= .62) return abs < 32 ? 'desert_aride' : 'semi_aride';
  if(arid >= .45) return abs < 26 ? 'xerophyte' : 'steppe_aride';
  if(arid >= .3) return abs < 26 ? 'savane' : 'prairie';
  if(abs < 8) return 'tropicale';
  if(abs < 16) return lat > 0 && lon > 65 && lon < 125 ? 'mousson' : 'tropicale_cad';
  if(abs < 23) return 'savane_claire';
  if(lat > 29 && lat < 45 && lon > -10 && lon < 42) return 'mediterraneenne';
  if(abs < 34) return 'subtropicale';
  if((lat > 30 && lat < 54 && lon > -110 && lon < -92) || (lat > 43 && lat < 54 && lon > 35 && lon < 120) || (lat < -28 && lat > -40 && lon > -65 && lon < -56)) return 'prairie';
  return 'tempere';
}
// cours d'eau de la carte : le plus grand vrai fleuve qui traverse la region ; sinon une
// petite riviere (aucune dans les deserts et les glaces)
function regionRiverMode(id, biome){
  const cls = waterData ? waterData.rivers.filter(r => (r.r || []).includes(id)).map(r => r.cls || 3) : [];
  if(cls.length){ const c = Math.min(...cls); return c === 1 ? 'fleuve' : c === 2 ? 'riviere' : 'petite'; }
  return ['polaire', 'desert_aride', 'xerophyte'].includes(biome) ? 'aucun' : 'petite';
}

// ----------------------------------------------------------------
// Temperature moyenne annuelle (degres C) : selon la latitude, moins l'altitude des massifs
const TEMP_BY_LAT = [[0, 27], [20, 25], [30, 20], [40, 14], [50, 7], [60, 0], [70, -8], [80, -18], [90, -25]];
function temperatureAt(absLat, montagne){
  let k = 1; while(k < TEMP_BY_LAT.length - 1 && TEMP_BY_LAT[k][0] < absLat) k++;
  const [a0, t0] = TEMP_BY_LAT[k - 1], [a1, t1] = TEMP_BY_LAT[k], t = Math.max(0, Math.min(1, (absLat - a0) / (a1 - a0)));
  return Math.round(t0 + (t1 - t0) * t - montagne * 7);
}
// Relief : plaine, collines ou montagne (chaines jeunes du modele geologique et grands massifs)
function reliefOf(lat, lon, terrain){
  const box = MOUNTAINS.some(([a, b, c, d]) => lat >= a && lat <= b && lon >= c && lon <= d);
  const montagne = Math.max(terrain.montagne, box ? 0.8 : 0);
  return { type:montagne >= 0.55 ? 'montagne' : montagne >= 0.25 ? 'collines' : 'plaine', montagne, volcan:terrain.volcan, bouclier:terrain.ancien };
}
