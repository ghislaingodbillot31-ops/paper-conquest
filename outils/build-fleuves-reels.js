// Vrai cours des fleuves du jeu (outils/rivers-world.json), d'apres Natural Earth 10m
// (ne_10m_rivers_lake_centerlines, domaine public : https://www.naturalearthdata.com).
// Pour chaque fleuve, les villes traversees (champ « villes ») servent de guide : on retient les
// troncons Natural Earth qui portent un de ses noms (table ALIAS) et longent ce guide, on les met
// bout a bout dans le sens du courant (de la source vers l'aval), et on complete par le guide la ou
// Natural Earth s'arrete (source lointaine, liaison inventee comme l'Euphrate vers la mer Noire).
// Le resultat remplace « pts » (trace: 'reel') ; un fleuve absent de Natural Earth garde ses villes
// (trace: 'villes'). Relancable : le guide d'origine est garde dans « villes ».
// Usage (depuis la racine, avec @turf/turf) :
//   node outils/build-fleuves-reels.js <ne_10m_rivers_lake_centerlines.geojson>
const fs = require('fs'), path = require('path'), turf = require('@turf/turf');
const FILE = path.join(__dirname, 'rivers-world.json');
const [NE] = process.argv.slice(2);
if(!NE){ console.log('Usage : node outils/build-fleuves-reels.js <ne_10m_rivers_lake_centerlines.geojson>'); process.exit(1); }
// noms Natural Earth du cours principal de chaque fleuve (troncons renommes d'amont en aval)
const ALIAS = {
  'Nil':['Nile', 'El Bahr el Abyad', 'Bahr el Jebel', 'Albert Nile', 'Victoria Nile', 'Rosetta Branch'], 'Congo':['Congo', 'Lualaba'], 'Niger':['Niger'],
  'Zambèze':['Zambezi'], 'Orange':['Orange'], 'Limpopo':['Limpopo'], 'Sénégal':['Senegal', 'Bafing'], 'Volta':['Volta', 'Mouhoun', 'Black Volta'],
  'Gambie':['Gambia'], 'Ogooué':['Ogooue'], 'Cuanza':['Cuanza'], 'Rufiji':['Rufiji', 'Great Ruaha'], 'Juba':['Jubba', 'Genale'], 'Okavango':['Cubango', 'Okavango'],
  'Chari':['Chari'], 'Nil Bleu':['El Bahr el Azraq', 'Abay', 'Blue Nile'], 'Bénoué':['Benue'], 'Oubangui':['Ubangi', 'Uele'], 'Kasaï':['Kasai'],
  'Amazone':['Amazonas', 'Amazon', 'Solimoes', 'Ucayali'], 'Paraná':['Parana'], 'Orénoque':['Orinoco'], 'São Francisco':['Sao Francisco'], 'Tocantins':['Tocantins'],
  'Uruguay':['Uruguay'], 'Magdalena':['Magdalena'], 'Rio Negro':['Negro'], 'Madeira':['Madeira', 'Mamore'], 'Purus':['Purus'], 'Tapajós':['Tapajos', 'Juruena', 'Teles Pires'], 'Xingu':['Xingu'],
  'Paraguay':['Paraguay', 'Paraguai'], 'Mississippi':['Mississippi'], 'Missouri':['Missouri'], 'Ohio':['Ohio'], 'Arkansas':['Arkansas'], 'Rio Grande':['Rio Grande'],
  'Colorado':['Colorado'], 'Columbia':['Columbia'], 'Yukon':['Yukon'], 'Mackenzie':['Mackenzie'], 'Saint-Laurent':['St. Lawrence', 'Saint-Laurent'],
  'Nelson':['Nelson'], 'Saskatchewan':['Saskatchewan', 'South Saskatchewan'], 'Fraser':['Fraser'], 'Volga':['Volga'], 'Danube':['Danube', 'Donau', 'Duna', 'Dunav', 'Dunarea'],
  'Dniepr':['Dnipro', 'Dnieper', 'Dnyapro', 'Dnepr'], 'Don':['Don'], 'Rhin':['Rhine', 'Rhin', 'Rhein'], 'Elbe':['Elbe', 'Labe'], 'Oder':['Oder', 'Odra'],
  'Vistule':['Vistula', 'Wisla'], 'Loire':['Loire'], 'Seine':['Seine'], 'Rhône':['Rhone', 'Rhne'], 'Garonne':['Garonne'], 'Tage':['Tajo', 'Tejo'], 'Èbre':['Ebro'],
  'Douro':['Duero', 'Douro'], 'Guadalquivir':['Guadalquivir'], 'Pô':['Po'], 'Tamise':['Thames'], 'Dniestr':['Dniester', 'Nistru'], 'Dvina du Nord':['Severnaya Dvina', 'Sukhona'],
  'Petchora':['Pechora'], 'Oural':['Ural'], 'Daugava':['Daugava', 'Zapadnaya Dvina'], 'Niémen':['Neman', 'Nemunas'], 'Glomma':['Glomma'], 'Kama':['Kama'], 'Oka':['Oka'],
  'Tisza':['Tisa', 'Tisza'], 'Save':['Sava'], 'Moselle':['Mosel', 'Moselle'], 'Main':['Main'], 'Yangtsé':['Chang Jiang', 'Yangtze', 'Jinsha', 'Tongtian'], 'Fleuve Jaune':['Huang'],
  'Mékong':['Mekong', 'Lancang'], 'Gange':['Ganges', 'Ganga'], 'Brahmapoutre':['Brahmaputra', 'Yarlung', 'Maquan', 'Dihang', 'Jamuna'], 'Indus':['Indus'],
  'Ob':['Ob', 'Malaya Ob', 'Biya'], 'Irtych':['Ertis', 'Irtysh', 'Ertix'], 'Ienisseï':['Yenisey', 'Verkhniy Yenisey', 'Bol\'shoy Yenisey'], 'Angara':['Angara'], 'Léna':['Lena'],
  'Amour':['Amur', 'Heilong Jiang', 'Shilka'], 'Songhua':['Songhua', 'Di\'er Songhua'], 'Syr-Daria':['Syr Darya', 'Naryn'], 'Amou-Daria':['Amu Darya', 'Panj'],
  'Tigre':['Tigris', 'Dicle', 'Shatt al Arab'], 'Euphrate':['Euphrates', 'Al Furat', 'Firat'], 'Irrawaddy':['Ayeyarwady', 'Irrawaddy'], 'Salouen':['Salween', 'Nu', 'Thanlwin'],
  'Rivière des Perles':['Xi', 'Hongshui', 'Nanpan', 'Zhu Jiang'], 'Fleuve Rouge':['Hong', 'Yuan'], 'Chao Phraya':['Chao Phraya', 'Ping'], 'Godavari':['Godavari'],
  'Krishna':['Krishna'], 'Narmada':['Narmada'], 'Mahanadi':['Mahana Nadi', 'Mahanadi'], 'Yamuna':['Yamuna'], 'Kolyma':['Kolyma'], 'Indiguirka':['Indigirka'], 'Koura':['Kura'],
  'Tarim':['Tarim', 'Yarkant'], 'Murray':['Murray'], 'Darling':['Darling', 'Barwon'], 'Fitzroy':['Fitzroy'], 'Victoria':['Victoria'], 'Burdekin':['Burdekin'], 'Fly':['Fly'], 'Sepik':['Sepik'],
};
const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’`]/g, '\'').replace(/\s+/g, ' ').trim().toLowerCase();
const doc = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const lines = f => f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
const ne = JSON.parse(fs.readFileSync(NE, 'utf8')).features.filter(f => f.geometry).flatMap(f => lines(f).map(c => ({ name:norm(f.properties.name), alt:norm(f.properties.name_alt), c })));
function densify(pts, stepKm){ const out = [pts[0]];
  for(let i = 1; i < pts.length; i++){ const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.round(turf.distance(a, b) / stepKm));
    for(let k = 1; k <= n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
  return out; }
const report = [];
// distance approchee (km) entre deux points proches
const km = (a, b) => { const k = Math.cos((a[1] + b[1]) / 2 * Math.PI / 180); return Math.hypot((a[0] - b[0]) * k * 111.32, (a[1] - b[1]) * 110.57); };
const lenOf = c => { let L = 0; for(let i = 1; i < c.length; i++) L += km(c[i - 1], c[i]); return L; };
for(const R of doc.rivers){
  const guide = R.villes || R.pts; R.villes = guide;
  const names = (ALIAS[R.n] || []).map(norm);
  const G = densify(guide, 5), gd = p => { let d = Infinity; for(let i = 0; i < G.length; i += 2) d = Math.min(d, km(G[i], p)); return d; };
  // troncons candidats : un des noms et a moins de 120 km du guide ; ou sans nom et collé au guide (20 km en moyenne)
  const cand = [];
  if(names.length) for(const s of ne){
    const named = names.includes(s.name) || names.includes(s.alt);
    if(!named && s.name) continue;
    const pr = s.c.filter((_, i) => i % 3 === 0 || i === s.c.length - 1).map(gd), mean = pr.reduce((a, d) => a + d, 0) / pr.length;
    if(named ? Math.min(...pr) > 120 : mean > 20) continue;
    cand.push({ c:s.c, len:lenOf(s.c), named });
  }
  if(!cand.some(s => s.named)){ R.pts = guide; R.trace = 'villes'; report.push([R.n, 'villes (absent de Natural Earth)', 0]); continue; }
  /* Reseau des troncons : sommets = leurs bouts (a 1 km pres) ; aretes = les troncons (un troncon
     sans nom compte 1,5 fois sa longueur) ; entre deux bouts a moins de 12 km, un raccord (2 fois
     sa longueur). Le cours = le plus court chemin du bout le plus proche de la source du guide au
     bout le plus proche de son aval : un seul bras dans un delta, jamais d'aller-retour. */
  const nodes = [], nodeOf = p => { for(let i = 0; i < nodes.length; i++) if(km(nodes[i], p) < 1) return i; nodes.push(p); return nodes.length - 1; };
  const adj = [], link = (a, b, w, c) => { (adj[a] = adj[a] || []).push({ to:b, w, c }); (adj[b] = adj[b] || []).push({ to:a, w, c:c.slice().reverse() }); };
  for(const s of cand) link(nodeOf(s.c[0]), nodeOf(s.c[s.c.length - 1]), s.len * (s.named ? 1 : 1.5), s.c);
  const near = p => { let bi = 0, bd = Infinity; nodes.forEach((q, i) => { const d = km(q, p); if(d < bd){ bd = d; bi = i; } }); return { i:bi, d:bd }; };
  const s0 = near(guide[0]), s1 = near(guide[guide.length - 1]);
  // raccords de plus en plus longs (12, 40, 100, 250 km) tant que la source n'est pas reliee a l'aval
  // (troncons separes par un lac ou un marais : le Sudd sur le Nil…)
  let dist, prev, linked = 0;
  for(const G of [12, 40, 100, 250]){
    for(let a = 0; a < nodes.length; a++) for(let b = a + 1; b < nodes.length; b++){ const d = km(nodes[a], nodes[b]); if(d >= linked && d < G) link(a, b, d * 2 + 1, [nodes[a], nodes[b]]); }
    linked = G;
    dist = nodes.map(() => Infinity); prev = nodes.map(() => null); dist[s0.i] = 0;
    const open = new Set([s0.i]);
    while(open.size){ let u = -1; for(const i of open) if(u < 0 || dist[i] < dist[u]) u = i; open.delete(u); if(u === s1.i) break;
      for(const e of adj[u] || []) if(dist[u] + e.w < dist[e.to]){ dist[e.to] = dist[u] + e.w; prev[e.to] = { from:u, c:e.c }; open.add(e.to); } }
    if(isFinite(dist[s1.i])) break;
  }
  // arrivee : le bout d'aval s'il est atteint, sinon le bout atteint le plus proche de l'aval du guide
  let end = s1.i;
  if(!isFinite(dist[end])){ let bd = Infinity; nodes.forEach((q, i) => { if(isFinite(dist[i]) && km(q, guide[guide.length - 1]) < bd){ bd = km(q, guide[guide.length - 1]); end = i; } }); }
  const parts = []; for(let v = end; prev[v]; v = prev[v].from) parts.unshift(prev[v].c);
  let pts = []; for(const c of parts) pts.push(...(pts.length ? c.slice(1) : c));
  if(pts.length < 2){ R.pts = guide; R.trace = 'villes'; report.push([R.n, 'villes (troncons non relies)', 0]); continue; }
  // au-dela de Natural Earth : le guide, jusqu'au point du guide le plus proche du vrai cours
  const cut = (p, fromStart) => { let bi = 0, bd = Infinity; G.forEach((q, i) => { const d = km(q, p); if(d < bd){ bd = d; bi = i; } }); return fromStart ? G.slice(0, bi) : G.slice(bi + 1); };
  const head = km(pts[0], guide[0]) > 40 ? cut(pts[0], true) : [], tail = km(pts[pts.length - 1], guide[guide.length - 1]) > 40 ? cut(pts[pts.length - 1], false) : [];
  pts = [...head, ...pts, ...tail];
  pts = turf.simplify(turf.lineString(pts), { tolerance:0.01 }).geometry.coordinates.map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)]);
  R.pts = pts; R.trace = 'reel';
  const real = lenOf(pts) - lenOf(head) - lenOf(tail);
  report.push([R.n, parts.length + ' troncons, ' + Math.round(real / lenOf(pts) * 100) + ' % reel' + (head.length ? ' · amont par les villes' : '') + (tail.length ? ' · aval par les villes' : ''), pts.length]);
}
doc._doc = 'Fleuves reels (listes Wikipedia \'Liste de fleuves dans le monde classes par continent\' et Wiklimat \'Liste des principaux fleuves\') et principaux affluents. pts = vrai cours [lon, lat], de la source vers l\'aval (Natural Earth 10m, domaine public ; outils/build-fleuves-reels.js), trace: reel ; a defaut (fleuve absent de Natural Earth) : les villes traversees, trace: villes. villes = cours approche par les villes (guide). cls: 1 geant, 2 grand, 3 moyen. end: sea (se jette en mer), join (affluent: finit sur son fleuve, liste apres lui), inland (bassin interieur). start (facultatif): sea (commence en mer: liaison navigable, pas de source) ou join (bras qui part d\'un fleuve deja liste); une liaison garde toute sa largeur.';
const J = v => JSON.stringify(v);
fs.writeFileSync(FILE, '{\n  "_doc": ' + J(doc._doc) + ',\n  "rivers": [\n' + doc.rivers.map(R => '    { ' + Object.entries(R).map(([k, v]) => J(k) + ':' + J(v)).join(', ') + ' }').join(',\n') + '\n  ]\n}\n');
for(const [n, what, np] of report) console.log(n.padEnd(20), what, np ? '· ' + np + ' points' : '');
console.log('reels :', doc.rivers.filter(r => r.trace === 'reel').length, '/', doc.rivers.length);
