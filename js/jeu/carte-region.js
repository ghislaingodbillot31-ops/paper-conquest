// ---------- Carte de la region (onglet de la capitale) ----------
// La carte de la capitale (region.html : campagne, rivieres, forets, routes, zonage,
// batiments et fortifications) generee pour CETTE region : biome deduit de son climat
// reel (latitude, aridite, grandes plaines, massifs), cours d'eau selon les vrais fleuves
// qui la traversent, graine = numero de la region (meme region, meme carte). Chaque region
// garde son propre plan (sauvegarde locale de la page, une cle par region).
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
function renderRegionMapTab(el, regionId){
  if(!regionFeature(regionId)){ el.innerHTML = ''; return; }
  const biome = regionBiome(regionId), river = regionRiverMode(regionId, biome);
  const src = 'region.html?region=' + regionId + '&biome=' + biome + '&river=' + river + '&seed=' + (regionId * 7919 + 101);
  const cur = el.querySelector('iframe.region-map');
  if(cur && cur.dataset.src === src) return;              // deja affichee : on ne recharge pas
  el.classList.add('has-map');
  el.innerHTML = '<iframe class="region-map" title="Carte de la région ' + regionId + '" src="' + src + '" data-src="' + src + '"></iframe>';
}

// ---------- Plan de la region (onglet de la capitale) ----------
// Carte detaillee dessinee en SVG: la region (fleuves et lacs deja creuses
// dans ses terres, couleur de la mer comme sur le globe), ses voisines en
// plus clair, le nom des fleuves qui la traversent, la capitale, les
// routes qui en partent et les batiments construits; echelle et nord.
// Base pour les prochains details (routes supplementaires, villages...).
const PLAN_W = 1000;
const BUILDING_ICONS = { port:'⚓', mine:'⛏️', ferme:'🌾', pecherie:'🎣', elevage:'🐄' };
function renderPlanTab(el, regionId){
  const f = regionFeature(regionId); if(!f){ el.innerHTML = ''; return; }
  const [bx0, by0, bx1, by1] = turf.bbox(f);
  const lon0 = (bx0 + bx1) / 2, lat0 = (by0 + by1) / 2, kx = Math.cos(lat0 * Math.PI / 180);
  // cadre: la region + une marge de 22 %, format du dessin selon la region
  const padX = (bx1 - bx0) * 0.22 + 0.3, padY = (by1 - by0) * 0.22 + 0.3;
  const vx0 = bx0 - padX, vx1 = bx1 + padX, vy0 = by0 - padY, vy1 = by1 + padY;
  const scale = PLAN_W / ((vx1 - vx0) * kx), H = Math.round((vy1 - vy0) * scale);
  // longitude ramenee pres du centre (antimeridien), puis projection
  const nl = lon => lon + 360 * Math.round((lon0 - lon) / 360);
  const X = lon => ((nl(lon) - vx0) * kx * scale).toFixed(1), Y = lat => ((vy1 - lat) * scale).toFixed(1);
  const ringPath = ring => { const off = 360 * Math.round((lon0 - ring[0][0]) / 360);
    return 'M' + ring.map(([x, y]) => X(x + off) + ' ' + Y(y)).join('L') + 'Z'; };
  const geomPath = g => (g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []).map(poly => poly.map(ringPath).join('')).join('');
  const inView = b => !(nl(b[2]) < vx0 - 1 || nl(b[0]) > vx1 + 1 || b[3] < vy0 || b[1] > vy1);
  let svg = '';
  // regions voisines (et toutes celles visibles dans le cadre)
  const others = regionsFc.features.filter(o => o.id !== regionId && inView(turf.bbox(o)));
  svg += others.map(o => '<path d="' + geomPath(o.geometry) + '" fill="' + o.properties.fillColor + '" fill-opacity="0.45" fill-rule="evenodd" stroke="rgba(60,53,39,0.45)" stroke-width="1"/>').join('');
  // la region
  svg += '<path d="' + geomPath(f.geometry) + '" fill="' + f.properties.fillColor + '" fill-rule="evenodd" stroke="#3c3527" stroke-width="2.2"/>';
  // routes qui partent de la capitale
  (roadGraph.get(regionId) || []).forEach(r => {
    svg += '<path d="M' + r.coords.map(([x, y]) => X(x) + ' ' + Y(y)).join('L') + '" fill="none" stroke="#6b4a2a" stroke-width="2.4" stroke-dasharray="7 5" stroke-linecap="round" opacity="0.85"/>';
  });
  // numeros des regions voisines
  svg += others.map(o => { let c; try{ c = turf.pointOnFeature(o).geometry.coordinates; }catch(e){ return ''; }
    if(nl(c[0]) < vx0 || nl(c[0]) > vx1 || c[1] < vy0 || c[1] > vy1) return '';
    return '<text x="' + X(c[0]) + '" y="' + Y(c[1]) + '" class="pl-num">' + o.id + '</text>'; }).join('');
  // noms des fleuves qui traversent la region (au point du fleuve le plus central)
  if(waterData){
    const land = topojson.feature(regionTopo, regionGeoms[regionId - 1]), mid = [lon0, lat0];
    waterData.rivers.filter(r => (r.r || []).includes(regionId)).forEach(r => {
      let best = -1, bd = Infinity;
      r.c.forEach((q, k) => { if(!turf.booleanPointInPolygon(q, land)) return; const d = geoDistance(q, mid); if(d < bd){ bd = d; best = k; } });
      if(best < 0) return;
      const a = r.c[Math.max(0, best - 2)], b = r.c[Math.min(r.c.length - 1, best + 2)];
      let ang = Math.atan2(-(b[1] - a[1]), (nl(b[0]) - nl(a[0])) * kx) * 180 / Math.PI;
      if(ang > 90) ang -= 180; if(ang < -90) ang += 180;
      svg += '<text x="' + X(r.c[best][0]) + '" y="' + Y(r.c[best][1]) + '" class="pl-river" transform="rotate(' + ang.toFixed(0) + ' ' + X(r.c[best][0]) + ' ' + Y(r.c[best][1]) + ')" dy="-9">' + r.n + '</text>';
    });
  }
  // batiments
  regionBuildings(regionId).forEach(b => { if(!b.pos) return;
    svg += '<text x="' + X(b.pos[0]) + '" y="' + Y(b.pos[1]) + '" class="pl-bld">' + (BUILDING_ICONS[b.type] || '■') + '</text>'; });
  // capitale
  const cap = capitalById.get(regionId);
  if(cap) svg += '<circle cx="' + X(cap[0]) + '" cy="' + Y(cap[1]) + '" r="8" fill="#b3261e" stroke="#fff" stroke-width="3"/>' +
    '<text x="' + X(cap[0]) + '" y="' + Y(cap[1]) + '" dy="-15" class="pl-cap">Capitale</text>';
  // echelle et nord
  const kmPerPx = 110.57 / scale, target = kmPerPx * 160, steps = [10, 20, 25, 50, 100, 200, 250, 500, 1000];
  const km = steps.find(v => v >= target) || 1000, px = km / kmPerPx;
  svg += '<g transform="translate(24 ' + (H - 26) + ')"><rect x="-8" y="-24" width="' + (px + 16) + '" height="36" rx="6" fill="rgba(250,246,236,0.85)"/>' +
    '<path d="M0 0H' + px.toFixed(1) + 'M0 -6V6M' + px.toFixed(1) + ' -6V6" stroke="#3c3527" stroke-width="2.5"/>' +
    '<text x="' + (px / 2).toFixed(1) + '" y="-9" class="pl-scale">' + km + ' km</text></g>';
  svg += '<g transform="translate(' + (PLAN_W - 36) + ' 40)"><circle r="20" fill="rgba(250,246,236,0.85)"/><path d="M0 -14L7 8L0 3L-7 8Z" fill="#3c3527"/><text y="-22" class="pl-scale">N</text></g>';
  const rivers = waterData ? waterData.rivers.filter(r => (r.r || []).includes(regionId)).map(r => r.n) : [];
  const lakes = regionWaters.get(regionId) ? regionWaters.get(regionId).lakes : 0;
  el.innerHTML = '<div class="plan-wrap">' +
    '<div class="plan-head"><div class="cap-intro">Région ' + regionId + ' — ' + Math.round(f.properties.clusterArea || 0).toLocaleString('fr-FR') + ' km² · ' +
      (rivers.length ? 'traversée par : ' + rivers.join(', ') : 'aucun grand fleuve') + (lakes ? ' · ' + lakes + ' lac' + (lakes > 1 ? 's' : '') : '') + '</div>' +
      '<button class="boat-btn" type="button" id="plan-see">Voir sur la carte</button></div>' +
    '<svg class="plan-svg" style="max-width:calc((100vh - 290px) * ' + (PLAN_W / H).toFixed(3) + ')" viewBox="0 0 ' + PLAN_W + ' ' + H + '" role="img" aria-label="Plan de la région ' + regionId + '">' +
      '<style>.pl-num{font:600 13px sans-serif;fill:#3c3527;opacity:.55;text-anchor:middle}' +
      '.pl-river{font:italic 700 15px sans-serif;fill:#1f4f73;text-anchor:middle;paint-order:stroke;stroke:#e8f3f6;stroke-width:4px}' +
      '.pl-cap{font:700 15px sans-serif;fill:#3c2a14;text-anchor:middle;paint-order:stroke;stroke:#faf6ec;stroke-width:4px}' +
      '.pl-bld{font-size:22px;text-anchor:middle;dominant-baseline:middle}.pl-scale{font:700 13px sans-serif;fill:#3c3527;text-anchor:middle}</style>' +
      svg + '</svg>' +
    '<div class="plan-legend"><span><i class="cap"></i>Capitale</span><span><i></i>Route</span><span><i class="water"></i>Mer, fleuves et lacs (navigables)</span>' +
      '<span>⚓ ⛏️ 🌾 🎣 🐄 Bâtiments</span><span>Régions voisines en clair, avec leur numéro</span></div></div>';
  const btn = el.querySelector('#plan-see');
  if(btn) btn.addEventListener('click', () => { showView('carte'); try{ map.fitBounds(turf.bbox(f), { padding:60, maxZoom:6, duration:800 }); }catch(e){} selectRegion(regionId); });
}
