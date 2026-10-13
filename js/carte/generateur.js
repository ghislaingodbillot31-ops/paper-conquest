/* ---------- état : région générée d'après son biome ----------
   Une région = de l'herbe, de la végétation, une grande route en serpentin qui traverse
   la carte d'ouest en est par le milieu, et l'eau propre au biome (rivière, affluents,
   lacs ou mares). Tout est tiré d'une graine : même graine + même biome = même région. */
/* Les 18 biomes (liste de l'utilisateur, 29/09). Chacun règle :
   - l'eau : nombre de rivières (une au plus), leur largeur et leurs méandres, les lacs ;
   - la végétation : seuil des grandes forêts (≥ 1 = aucune forêt), bosquets (dense/mid),
     arbres isolés (sparse), buissons, rochers ;
   - son aspect (look) : sol clair / foncé, taches (neige, dunes) au-delà d'un seuil de bruit,
     eau, essences d'arbres (f feuillu, c conifère, a acacia, p palmier, avec leur part),
     teintes des arbres [seul, lisière 1, lisière 2] et paliers de l'intérieur des forêts.
   « tempere » est la référence validée (forêt feuillue tempérée). */
const REF_LOOK = {
  ground:'#7d9455', groundDark:'#6b8048', vary:.5, species:{ f:1 },
  pal:[['#5f7d3c', '#83a056', '#3d5528'], ['#4f6e36', '#6f8f4c', '#334a24'], ['#6b7a34', '#8f9c4e', '#454f22']],
  steps:['#4c6a34', '#43602f', '#3a552b', '#314a26', '#283f21'],
};
const CONIFER_PAL = [['#6f9a6a', '#93bb8a', '#46684a'], ['#56805a', '#79a079', '#365540'], ['#466e50', '#679070', '#2c4838']];
const CONIFER_STEPS = ['#3f6450', '#375a4a', '#305044', '#29463d', '#223c36'];
const ACACIA_PAL = [['#a3a750', '#c4c674', '#6d7034'], ['#8e9644', '#b0b666', '#5d6430'], ['#7b853e', '#9ca65c', '#4f572c']];
const DRY_BUSH = ['#a3a06c', '#c2bf8c', '#6f6c45'];
const NO_FOREST = { forest:2, dense:2, mid:2 };
const BIOMES = {
  polaire:       { name:'Inlandsis et désert polaire', rivers:[0, 0], lakes:[0, 2], lakeR:[40, 90],
    river:{ amp:[40, 70], cycles:[2, 3], w0:6, w1:12 }, flora:{ ...NO_FOREST, sparse:0, bush:0, rocks:.004 },
    look:{ garde:true, valide:true, edge:'transparent', neigeTex:1, relief2:['#dfeefc', '#d3e6f8'], route:['#a9cff0', '#7fb0dc'], ground:'#eaf6ff', groundDark:'#bfdfff', patch:'#7fb6e6', patchAt:.6, water:'#7fb6e6', grevA:'#eaf6ff', grevB:'#bfdfff', foam:'#bfdfff', shallow:'#bfdfff', species:{} } },   // palette : #EAF6FF #BFDFFF #7FB6E6 #3E7FB1 #1E3A5F
  toundra:       { name:'Toundra', rivers:[1, 1], lakes:[4, 8], lakeR:[14, 35],
    river:{ amp:[60, 100], cycles:[2.5, 3.5], w0:5, w1:12 }, flora:{ ...NO_FOREST, dense:.66, mid:.58, sparse:.01, bush:.25, rocks:.003 },
    look:{ garde:true, valide:true, edge:'transparent', relief2:['#b5ad68', '#a9b08f'], reliefK:.7, ground:'#9a9d60', groundDark:'#858850', patch:'#e6dfc6', patchAt:.72, species:{ c:1 }, small:.6,   // thème couleurs : mousse, brume, parchemin (neige résiduelle), pierre, eau grise
      water:'#62808a', shallow:'#98a292', foam:'#98a292', grevA:'#b5ad8a', grevB:'#86806f', route:['#cbbe92', '#6a5238'],
      pal:[['#7c8160', '#98a292', '#566244'], ['#6c7455', '#86906f', '#4d5a3e'], ['#566244', '#6f7a58', '#2e3a2e']], steps:['#566244', '#4d5a3e', '#445038', '#3b4632', '#2e3a2e'], bushPal:['#7c8160', '#566244', '#2e3a2e'] } },
  taiga:         { name:'Taïga', rivers:[1, 1], lakes:[2, 4], lakeR:[30, 70],
    river:{ amp:[50, 90], cycles:[2, 3], w0:8, w1:18 }, flora:{ forest:.52, dense:.6, mid:.54, sparse:.03, bush:.05 },
    look:{ garde:true, relief2:['#8c9868', '#9d9c76'], reliefK:.7, ground:'#7a885e', groundDark:'#68764f', vary:.5, patch:'#b9b79a', patchAt:.78, species:{ c:1 },
  water:'#3f5f6b', shallow:'#6f8a86', foam:'#a9b8b0', grevA:'#5f6e4c', grevB:'#4f5c3f', route:['#a8946a', '#5a4a34'],
  pal:[['#3f5a43', '#5a7a58', '#253a2b'], ['#355040', '#4c6c50', '#1f3326'], ['#2c4636', '#426048', '#192c22']],
  steps:['#2f4a39', '#2a4334', '#253c2f', '#1f352a', '#1a2e25'], bushPal:['#5d6b45', '#7a8660', '#3d4a30'] } },
  tempere:       { name:'Forêt feuillue caducifoliée tempérée', rivers:[1, 1], lakes:[1, 2], lakeR:[45, 80],
    river:{ amp:[50, 90], cycles:[1.8, 2.6], w0:10, w1:24 }, flora:{ forest:.62, dense:.6, mid:.53, sparse:.02, bush:.06 }, look:{ garde:true, relief2:['#b2c060', '#d0bf62'], reliefK:.7, saison:1, ground:'#8eaa5e', groundDark:'#7a9650', vary:.5, patch:'#a3a265', patchAt:.8, species:{ f:1 },
  water:'#4a7c8c', shallow:'#86aaa6', foam:'#c3d4cc', grevA:'#7d9455', grevB:'#6b8048', route:['#c4ad7c', '#6e5a3c'],
  pal:[['#5f7d3c', '#83a056', '#3d5528'], ['#4f6e36', '#6f8f4c', '#334a24'], ['#6b7a34', '#8f9c4e', '#454f22']],
  steps:['#4c6a34', '#43602f', '#3a552b', '#314a26', '#283f21'], bushPal:['#6a8442', '#8aa25c', '#465a2c'] } },
  prairie:       { name:'Prairie', rivers:[1, 1], lakes:[0, 1], lakeR:[40, 70],
    river:{ amp:[40, 70], cycles:[1.5, 2.2], w0:12, w1:28 }, flora:{ forest:.72, dense:.7, mid:.64, sparse:.006, bush:.05 },
    look:{ garde:true, relief2:['#b6c868', '#86a456'], reliefK:.7, saison:1, ground:'#9cb65a', groundDark:'#86a04c', vary:.5, patch:'#c8c07a', patchAt:.7, species:{ f:1 },
  water:'#4f86a0', shallow:'#8db4b8', foam:'#cfdcd4', grevA:'#9aa45c', grevB:'#88924e', route:['#c9b07a', '#7a6240'],
  pal:[['#6d8240', '#8ea45a', '#485a2c'], ['#5c7238', '#7a9150', '#3c4e26'], ['#7a8a44', '#9aa862', '#52602e']],
  steps:['#5a7038', '#506532', '#465a2d', '#3c4f28', '#334423'], bushPal:['#7f8c4a', '#a0aa68', '#57602f'] } },
  // forêts tropicales et voisines : palette #C7CFAB #85A243 #657A30 #1C2F19 #7C9392
  subtropicale:  { name:'Forêt sempervirente subtropicale', rivers:[1, 1], lakes:[1, 2], lakeR:[35, 70],
    river:{ amp:[50, 90], cycles:[2, 2.8], w0:12, w1:26 }, flora:{ forest:.52, dense:.58, mid:.52, sparse:.03, bush:.06 },
    look:{ garde:true, relief2:['#b2cb66', '#6f9c58'], reliefK:.7, saison:1, ground:'#8cb85a', groundDark:'#74a04a', vary:.5,
  water:'#3f7f86', shallow:'#7c9392', foam:'#c7cfab', grevA:'#7f9c46', grevB:'#627a34', route:['#b89a62', '#5e4a2c'],
  pal:[['#7fb050', '#a3cc6c', '#4f7f36'], ['#5f9444', '#82b25a', '#3a6a2c'], ['#5f9444', '#82b25a', '#3a6a2c']],   // arbres : deux verts seulement (clair pour les isolés, plus foncé pour les bois)
  steps:['#6b8a4a', '#5c7a40', '#4d6a38', '#3b5730', '#2b4426'], bushPal:['#7fb050', '#a3cc6c', '#4f7f36'] } },
  mediterraneenne:{ name:'Forêt sempervirente méditerranéenne', rivers:[1, 1], lakes:[0, 1], lakeR:[25, 45],
    river:{ amp:[40, 80], cycles:[2, 3], w0:5, w1:12 }, flora:{ forest:.64, dense:.62, mid:.55, sparse:.03, bush:.22 },
    look:{ garde:true, relief2:['#c0cb64', '#76a45c'], reliefK:.7, saison:1, ground:'#a4bc5a', groundDark:'#8aa44c', vary:.5, patch:'#d8cfb0', patchAt:.72, species:{ f:.7, c:.3 },
  water:'#2f7fa6', shallow:'#6fb3c0', foam:'#d6ebe8', grevA:'#a39f6a', grevB:'#8c8a58', route:['#d6c49a', '#8a7048'],
  pal:[['#6b7a48', '#8b9a66', '#45502e'], ['#5a6e44', '#7a8e60', '#3a4a2c'], ['#4c6640', '#6a8458', '#2f4428']],
  steps:['#4e6440', '#465a3a', '#3e5034', '#36462e', '#2e3c28'], bushPal:['#7d8452', '#9ea172', '#545a36'] } },
  mousson:       { name:'Forêt de mousson', rivers:[1, 1], lakes:[1, 3], lakeR:[30, 60],
    river:{ amp:[70, 110], cycles:[2.2, 3.2], w0:12, w1:30 }, flora:{ forest:.55, dense:.6, mid:.53, sparse:.03, bush:.08 },
    look:{ garde:true, relief2:['#a4c868', '#639448'], reliefK:.7, saison:1, ground:'#84ae52', groundDark:'#6c9842', vary:.5, patch:'#a69468', patchAt:.8,
  water:'#5e7b6a', shallow:'#93a07e', foam:'#c7cfab', grevA:'#6f9440', grevB:'#557532', route:['#b08a58', '#5e4528'],
  pal:[['#c7cfab', '#85a243', '#657a30'], ['#85a243', '#657a30', '#3a5022'], ['#657a30', '#4a6226', '#26391d']],
  steps:['#6f8a38', '#657a30', '#566b2a', '#445a24', '#33481f'], bushPal:['#85a243', '#657a30', '#1c2f19'] } },
  desert_aride:  { name:'Désert aride', rivers:[0, 0], lakes:[0, 1], lakeR:[18, 30],
    river:{ amp:[40, 70], cycles:[2, 3], w0:6, w1:12 }, flora:{ ...NO_FOREST, sparse:.0015, bush:.02, rocks:.002 },
    look:{ garde:true, relief2:['#e9cca0', '#dcbb8f'], reliefK:.7, ground:'#e4c79c', groundDark:'#c9a176', patch:'#d2d9d8', patchAt:.6, species:{ p:1 },
  water:'#2f50a8', shallow:'#5f8fb8', foam:'#d2d9d8', grevA:'#d9c3a9', grevB:'#bf9b7a', route:['#c9ab88', '#8a5e40'],
  pal:[['#7d8a4a', '#a0aa66', '#4f5a2e'], ['#6c7a40', '#8e9a5a', '#434e28'], ['#5c6a38', '#7c8a50', '#38431f']],
  bushPal:['#bf9b7a', '#a67458', '#734b34'] } },   // palette désert : #D2D9D8 #D9C3A9 #BF9B7A #A67458 #734B34
  xerophyte:     { name:'Désert et broussaille xérophytes', rivers:[0, 0], lakes:[0, 0], lakeR:[18, 30],
    river:{ amp:[40, 70], cycles:[2, 3], w0:6, w1:12 }, flora:{ ...NO_FOREST, sparse:.004, bush:.18, rocks:.003 },
    look:{ garde:true, relief2:['#e0cd9c', '#c3b289'], reliefK:.7, ground:'#d8c9a6', groundDark:'#c2b088', patch:'#e8d8b0', patchAt:.7, species:{ a:1 },
  water:'#3d7fa0', shallow:'#7fb0b8', foam:'#e2e4d6', grevA:'#d6bc86', grevB:'#c4a670', route:['#c8a670', '#866440'],
  pal:ACACIA_PAL, bushPal:DRY_BUSH } },
  steppe_aride:  { name:'Steppe aride', rivers:[0, 1], lakes:[0, 1], lakeR:[18, 35],
    river:{ amp:[40, 70], cycles:[1.8, 2.6], w0:5, w1:11 }, flora:{ ...NO_FOREST, sparse:.002, bush:.08 },
    look:{ garde:true, relief2:['#e0c38c', '#cfb27c'], reliefK:.7, saison:1, ground:'#d9b982', groundDark:'#c2a470', patch:'#d8cc9c', patchAt:.72, species:{ a:1 },
  water:'#4a7f98', shallow:'#89aeb0', foam:'#d8dccc', grevA:'#bfb07a', grevB:'#a99c68', route:['#c4a874', '#7e6542'],
  pal:ACACIA_PAL, bushPal:['#9c9762', '#bcb684', '#6a6640'] } },
  semi_aride:    { name:'Désert semi-aride', rivers:[0, 1], lakes:[0, 0], lakeR:[18, 30],
    river:{ amp:[40, 70], cycles:[2, 3], w0:4, w1:9 }, flora:{ ...NO_FOREST, sparse:.003, bush:.1, rocks:.002 },
    look:{ garde:true, relief2:['#d7c39a', '#c7b489'], reliefK:.7, saison:1, ground:'#d4bf92', groundDark:'#c2aa7c', patch:'#e6d8b4', patchAt:.66, species:{ a:1 },
  water:'#3f7c9c', shallow:'#80aeb4', foam:'#e0e0d2', grevA:'#d4bf92', grevB:'#c2aa7c', route:['#caa878', '#86643e'],
  pal:ACACIA_PAL, bushPal:DRY_BUSH } },
  savane:        { name:'Savane', rivers:[1, 1], lakes:[0, 2], lakeR:[15, 35],
    river:{ amp:[50, 90], cycles:[2, 2.8], w0:8, w1:18 }, flora:{ ...NO_FOREST, dense:.6, mid:.55, sparse:.02, bush:.05 },
    look:{ garde:true, relief2:['#e0c987', '#c9b873'], reliefK:.7, saison:1, ground:'#d6bd7a', groundDark:'#c0a864', patch:'#9aa56b', patchAt:.7, species:{ a:1 },
  water:'#5a7f76', shallow:'#9aa58a', foam:'#e8dfc8', grevA:'#d8c29b', grevB:'#c2ab82', route:['#b88e5e', '#7a5232'],
  pal:[['#9aa56b', '#c3cb93', '#5c7a56'], ['#7e9461', '#9aa56b', '#456046'], ['#5c7a56', '#8aa07c', '#2c3f35']],
  bushPal:['#9aa56b', '#5c7a56', '#2c3f35'] } },
  savane_claire: { name:'Savane et forêt claire', rivers:[1, 1], lakes:[1, 1], lakeR:[20, 40],
    river:{ amp:[50, 90], cycles:[2, 2.8], w0:8, w1:20 }, flora:{ forest:.64, dense:.6, mid:.54, sparse:.03, bush:.06 },
    look:{ garde:true, relief2:['#b6c26e', '#97ac5a'], reliefK:.7, saison:1, ground:'#a9b564', groundDark:'#8c9e52', patch:'#d8c29b', patchAt:.7, vary:.5, species:{ a:.5, f:.5 },
  water:'#5a7f76', shallow:'#9aa58a', foam:'#e8dfc8', grevA:'#9aa56b', grevB:'#8b9a62', route:['#b88e5e', '#7a5232'],
  pal:[['#9aa56b', '#c3cb93', '#5c7a56'], ['#7e9461', '#9aa56b', '#456046'], ['#5c7a56', '#8aa07c', '#2c3f35']],
  bushPal:['#9aa56b', '#5c7a56', '#2c3f35'],
  steps:['#6c8960', '#5c7a56', '#516e4d', '#44603f', '#38523a'] } },
  tropicale_cad: { name:'Forêt tropicale caducifoliée', rivers:[1, 1], lakes:[0, 2], lakeR:[25, 50],
    river:{ amp:[60, 100], cycles:[2, 3], w0:12, w1:26 }, flora:{ forest:.55, dense:.6, mid:.53, sparse:.03, bush:.07 },
    look:{ garde:true, relief2:['#b0ba68', '#aaa65e'], reliefK:.7, saison:1, ground:'#a1ac5a', groundDark:'#88943f', vary:.5, patch:'#b9a66a', patchAt:.7,
  water:'#4d7f80', shallow:'#88a296', foam:'#c7cfab', grevA:'#94a04e', grevB:'#7a863e', route:['#b88e5e', '#7a5232'],
  pal:[['#c7cfab', '#85a243', '#657a30'], ['#85a243', '#657a30', '#3e5424'], ['#657a30', '#4e6428', '#2a3f1f']],
  steps:['#7a9440', '#657a30', '#566b2a', '#455c25', '#344b20'], bushPal:['#85a243', '#657a30', '#1c2f19'] } },
  tropicale:     { name:'Forêt sempervirente tropicale', rivers:[1, 1], lakes:[1, 3], lakeR:[25, 55],
    river:{ amp:[80, 130], cycles:[2.4, 3.4], w0:14, w1:34 }, flora:{ forest:.44, dense:.55, mid:.5, sparse:.05, bush:.08 },
    look:{ garde:true, relief2:['#90ba60', '#69974c'], reliefK:.7, saison:1, ground:'#78a050', groundDark:'#5f8844', vary:.5, species:{ f:.8, p:.2 },
  water:'#3d5f52', shallow:'#6f8a6e', foam:'#b7c4a2', grevA:'#58783a', grevB:'#45602e', route:['#a07a4c', '#54401f'],
  pal:[['#85a243', '#a8bf6a', '#4a6126'], ['#657a30', '#85a243', '#2c4220'], ['#4e6428', '#657a30', '#1c2f19']],
  steps:['#657a30', '#556a2a', '#425a25', '#2f4620', '#1c2f19'], bushPal:['#85a243', '#657a30', '#1c2f19'] } },
  toundra_alpine:{ name:'Toundra alpine', rivers:[1, 1], lakes:[1, 2], lakeR:[15, 30],
    river:{ amp:[30, 60], cycles:[3, 5], w0:4, w1:9 }, flora:{ ...NO_FOREST, sparse:.004, bush:.12, rocks:.02 },
    look:{ garde:true, valide:true, relief2:['#b0c18a', '#9fb279'], reliefK:.7, saison:1, ground:'#a7b980', groundDark:'#8b9d68', patch:'#eef0ee', patchAt:.62, species:{ c:1 }, small:.6,
  water:'#4f9aa8', shallow:'#8fc3c4', foam:'#d8ecea', grevA:'#a7a597', grevB:'#76746a', route:['#b6a888', '#6a6050'],
  pal:[['#4f6a50', '#6c8a6a', '#33483a'], ['#45604a', '#5f7e62', '#2c4032'], ['#3c5644', '#56725a', '#26392d']],
  bushPal:['#8e8d68', '#aaa983', '#606047'] } },
  montagne:      { name:'Forêt de montagne', rivers:[1, 1], lakes:[1, 2], lakeR:[18, 40],
    river:{ amp:[40, 80], cycles:[2.8, 4], w0:6, w1:12 }, flora:{ forest:.54, dense:.6, mid:.54, sparse:.03, bush:.06, rocks:.008 },
    look:{ garde:true, relief2:['#7fa05a', '#6a8d4e'], reliefK:.7, saison:1, ground:'#759858', groundDark:'#5f8248', vary:.5, patch:'#eef0ee', patchAt:.78, species:{ c:.75, f:.25 },
  water:'#4a8a9c', shallow:'#88b6ba', foam:'#d4e6e4', grevA:'#6a7a52', grevB:'#5a6846', route:['#b0a07c', '#62553e'],
  pal:CONIFER_PAL, steps:CONIFER_STEPS, bushPal:['#5f7050', '#7d8e6c', '#3e4c36'] } },
};
for (const b of Object.values(BIOMES)) b.tribs = [0, 0]; // une seule rivière, jamais d'affluent
/* Trois tailles de cours d'eau (demande du 29/09) : largeur à la source → à la sortie de la
   carte (m), ampleur et nombre des méandres. Le fleuve est large, aux boucles amples et
   lentes ; la petite rivière est étroite et très sinueuse. */
const RIVER_CLASS = {
  petite:  { name:'Petite rivière', w0:3,  w1:8,   amp:[30, 60],   cycles:[3, 4.5] },
  riviere: { name:'Rivière',        w0:10, w1:24,  amp:[50, 90],   cycles:[1.8, 2.8] },
  fleuve:  { name:'Fleuve',         w0:68, w1:112, amp:[140, 220], cycles:[1, 1.5], harm:.06 }, // grandes boucles lentes, sans petites ondulations
};
// cours d'eau par défaut de chaque biome (mode « selon le biome »)
const BIOME_RIVER = { polaire:null, toundra:'petite', taiga:'riviere', tempere:'riviere', prairie:'riviere',
  subtropicale:'fleuve', mediterraneenne:'petite', mousson:'fleuve', desert_aride:null, xerophyte:null,
  steppe_aride:'petite', semi_aride:'petite', savane:'riviere', savane_claire:'riviere', tropicale_cad:'riviere',
  tropicale:'fleuve', toundra_alpine:'petite', montagne:'petite' };
const OLD_BIOMES = { foret:'tempere', marais:'tempere', lacs:'tempere', aride:'desert_aride' }; // anciens plans
const biomeOf = () => BIOMES[S && S.biome] || BIOMES.tempere;
// Couleurs remises à zéro (demande du 11/10) : tout est gris, en attendant de poser les couleurs région par région.
const GRIS = ['#c4c4c4', '#8f8f8f', '#5a5a5a'];
const NEUTRE = { ground:'#a8a8a8', groundDark:'#9a9a9a', patch:null, pal:[GRIS, GRIS, GRIS], bushPal:GRIS, steps:['#7a7a7a', '#707070', '#666', '#5c5c5c', '#525252'] };
/* Liserés des plans d'eau (lacs, rivières, mer) aux couleurs de la TERRE du biome, pour tous les biomes (demande du 12/10) : grève = sol, liseré de grève et trait de berge = sol foncé, écume = sol éclairci.
   Un biome peut imposer son trait de berge avec « edge » (transparent pour le polaire et la toundra). Résultat gardé par biome. */
const eclaircir = (h, k) => '#' + (h.match(/[0-9a-f]{2}/gi) || ['80', '80', '80']).slice(0, 3).map(v => Math.round(parseInt(v, 16) + (255 - parseInt(v, 16)) * k).toString(16).padStart(2, '0')).join('');
const assombrir = (h, k) => '#' + (h.match(/[0-9a-f]{2}/gi) || ['80', '80', '80']).slice(0, 3).map(v => Math.round(parseInt(v, 16) * (1 - k)).toString(16).padStart(2, '0')).join('');
let lookMem = { src:null, v:null };
const biomeLook = () => {
  const src = biomeOf().look;
  if (lookMem.src === src) return lookMem.v;
  const l = { ...REF_LOOK, ...src, ...(src.garde ? {} : NEUTRE) };
  if (!l.relief2) { l.relief2 = [eclaircir(l.ground, .07), assombrir(l.ground, .06)]; l.reliefK = .7; l.saison = 1; }   // biome pas encore posé à la main : trois couleurs très proches du sol, calculées
  l.grevA = l.grevB = l.foam = l.edge = l.ground;   // (13/10 : plus aucun liseré sombre ni clair au bord de l'eau : tout est de la couleur de la terre)
  lookMem = { src, v:l };
  return l;
};
const goDeg = (p, deg, len) => [round2(p[0] + Math.cos(deg * Math.PI / 180) * len), round2(p[1] + Math.sin(deg * Math.PI / 180) * len)];
/* Grande route en serpentin : elle entre par le bord ouest vers le milieu de la hauteur et
   sort à l'est. Tronçons de 3 cases ; le cap suit une onde (amplitude 45 à 65°, longueur
   d'onde 700 à 1 100 m, soit des boucles de 100 à 150 m de part et d'autre) arrondie au pas de 10°, avec un rappel vers le milieu de la carte.
   Le dessin lissé en fait une route qui ondule sans angle. */
/* Routes de formes variées (demande du 29/09) : la route entre par un bord et sort par un
   autre — opposé ou voisin, pas forcément ouest → est — et suit une des formes :
   - serpentin : ondule régulièrement autour de la ligne directe ;
   - sinueuse  : dérive lentement, au gré d'un bruit ;
   - arc       : une seule grande courbe ;
   - droite    : presque rectiligne, légers écarts ;
   - coudée    : deux longs tronçons de part et d'autre d'un coude.
   Toujours des tronçons de 3 cases orientés par pas de 10° (règle du zonage). */
const ROAD_STYLES = ['serpentin', 'sinueuse', 'arc', 'droite', 'coudee'];
function edgePoint(edge, t) {
  return edge === 'O' ? [0, round2(TH * t)] : edge === 'E' ? [TW, round2(TH * t)] : edge === 'N' ? [round2(TW * t), 0] : [round2(TW * t), TH];
}
function traceRoad(rnd, start, target, style, firstHeading = null) {
  const A = 35 + rnd() * 25, lam = 500 + rnd() * 500, ph = rnd() * 6.28, bend = (rnd() < .5 ? -1 : 1) * (30 + rnd() * 25);
  const drift = valueNoise(Math.floor(rnd() * 1e6)), total = segLen(start, target);
  const elbow = [start[0] + (target[0] - start[0]) * (.35 + rnd() * .3), start[1] + (target[1] - start[1]) * (.35 + rnd() * .3)];
  const n0 = [-(target[1] - start[1]) / total, (target[0] - start[0]) / total], eo = (rnd() - .5) * total * .5;
  const way = style === 'coudee' ? [elbow[0] + n0[0] * eo, elbow[1] + n0[1] * eo] : null;
  let p = start, walked = 0, last = firstHeading, passed = false, done = false, legs = 2;
  const pts = [p];
  const angDiff = (a, b) => ((a - b) % 360 + 540) % 360 - 180;
  for (let k = 0; k < 600 && !done; k++) {
    const aim = way && !passed ? way : target;
    if (way && !passed && segLen(p, way) < 80) passed = true;
    const base = Math.atan2(aim[1] - p[1], aim[0] - p[0]) * 180 / Math.PI, prog = Math.min(1, walked / total);
    let off = style === 'serpentin' ? A * Math.sin(2 * Math.PI * walked / lam + ph)
      : style === 'sinueuse' ? (drift(walked / 180, 3.3) - .5) * 130
      : style === 'arc' ? bend * (1 - 2 * prog)
      : style === 'droite' ? (drift(walked / 250, 7.1) - .5) * 24 : 0;
    // à l'approche du point visé, la route se redresse vers lui (pas de crochet au bout)
    off = Math.max(-70, Math.min(70, off)) * Math.min(1, segLen(p, aim) / 220);
    let deg = Math.round((base + off) / 10) * 10;
    // PAS D'ANGLE : d'un tronçon de 24 m au suivant, la route tourne de 10° au plus ; un grand
    // virage se fait donc en courbe (90° sur ~200 m), jamais en coude
    if (last !== null) { const d = angDiff(deg, last); if (Math.abs(d) > 10) deg = last + Math.sign(d) * 10; }
    // route coudée ou droite : virage encore plus ample (10° tous les 48 m) — le coude
    // devient une longue courbe
    if (last !== null && (style === 'coudee' || style === 'droite') && deg !== last && legs < 2) deg = last;
    legs = deg !== last ? 1 : legs + 1;
    deg = ((deg % 360) + 360) % 360;
    const q = goDeg(p, deg, 3 * CELL);
    walked += 3 * CELL;
    if (!inTerrain(q)) {
      // sortie de la carte : la route s'arrête exactement sur le bord, dans son prolongement
      const d = [Math.cos(deg * Math.PI / 180), Math.sin(deg * Math.PI / 180)];
      const tx = d[0] > 1e-9 ? (TW - p[0]) / d[0] : d[0] < -1e-9 ? -p[0] / d[0] : Infinity;
      const ty = d[1] > 1e-9 ? (TH - p[1]) / d[1] : d[1] < -1e-9 ? -p[1] / d[1] : Infinity;
      const e = goDeg(p, deg, Math.min(tx, ty));
      pts.push([Math.max(0, Math.min(TW, e[0])), Math.max(0, Math.min(TH, e[1]))]);
      done = true; break;
    }
    if (deg === last && pts.length > 1) pts[pts.length - 1] = q; else pts.push(q);
    p = q; last = deg;
  }
  if (!done) pts.push(target.slice()); // (garde-fou : ne devrait pas arriver)
  return pts;
}
// la grande route traverse vraiment la région : elle passe à moins de 400 m du centre
// (sinon on retire : pas de route qui ne fait que couper un coin de la carte)
function mainRoad(rnd) {
  const edges = ['O', 'E', 'N', 'S'], opp = { O:'E', E:'O', N:'S', S:'N' };
  let best = null;
  for (let t = 0; t < 25; t++) {
    const a = edges[Math.floor(rnd() * 4)];
    const side = edges.filter(e => e !== a && e !== opp[a]);
    const b = rnd() < .6 ? opp[a] : side[Math.floor(rnd() * 2)];                  // bord opposé ou voisin
    const start = edgePoint(a, .2 + rnd() * .6), target = edgePoint(b, .2 + rnd() * .6);
    const style = ROAD_STYLES[Math.floor(rnd() * ROAD_STYLES.length)];
    const inward = { O:0, E:180, N:90, S:270 }[a]; // la route entre perpendiculairement au bord
    const pts = traceRoad(rnd, start, target, style, inward);
    const dc = Math.min(...pts.slice(1).map((q, i) => ptSeg([TW / 2, TH / 2], pts[i], q).d));
    // pénalités : route qui longe le bord, qui se recoupe, trop courte
    const bad = edgeRun(pts) > 40 || selfCross(pts) || roadLen({ pts }) < 1000;
    const score = dc + (bad ? 5000 : 0);
    if (!best || score < best.score) best = { pts, style, edges:[a, b], dc, score };
    if (dc < 400 && !bad) break;
  }
  return best;
}
// longueur (m) d'une route qui passe à moins de 40 m du bord de la carte, hors de ses 80
// premiers et derniers mètres (une route doit entrer puis s'écarter du bord, pas le longer)
function edgeRun(pts) {
  const P = resample(pts, 4), n = P.length;
  let run = 0;
  for (let i = 20; i < n - 20; i++) { const [x, y] = P[i]; if (x < 40 || y < 40 || x > TW - 40 || y > TH - 40) run += 4; }
  return run;
}
// la ligne se recoupe-t-elle ? (et croise-t-elle une autre ligne, hors des `skip` premiers mètres)
function selfCross(pts) {
  const Q = resample(pts, 8);
  for (let i = 0; i < Q.length - 1; i++) for (let j = i + 2; j < Q.length - 1; j++) if (segCross(Q[i], Q[i + 1], Q[j], Q[j + 1])) return true;
  return false;
}
function linesCross(A, B, skip) {
  const P = resample(A, 8), Q = resample(B, 8).slice(Math.ceil(skip / 8));
  for (let i = 0; i < P.length - 1; i++) for (let j = 0; j < Q.length - 1; j++) if (segCross(P[i], P[i + 1], Q[j], Q[j + 1])) return true;
  return false;
}
const between = (rnd, [a, b]) => a + rnd() * (b - a);
const countIn = (rnd, [a, b]) => a + Math.floor(rnd() * (b - a + 1));
// la route et une rivière : jamais à moins de 2 m l'une de l'autre, sauf au pont (30° au moins)
function riverFitsRoads(rv, espace = regle('pont_espace')) {
  const keep = S.rivers; S.rivers = [rv];
  const ok = S.roads.every(r => r.pts.slice(1).every((q, i) => !riverMarginIssue(r.pts[i], q, r.w)));
  S.rivers = keep;
  if (!ok) return false;
  // ponts raisonnables : la route franchit la rivière assez en travers (37° au moins), là où
  // elle n'est pas élargie par un méandre (au plus 1,4 fois sa largeur normale), et à plus de
  // 60 m de tout carrefour
  const HW = riverHW(rv), P = rv.pts, n = P.length;
  const joints = S.roads.filter(r => r.id !== 1).map(r => r.pts[0]), ponts = [];   // ponts : centres des passages, deux ponts jamais côte à côte (règle pont_espace)
  for (const r of S.roads) for (let k = 0; k < r.pts.length - 1; k++) {
    const a = r.pts[k], b = r.pts[k + 1], bb = bbox([a, b]);
    for (let i = 0; i < n - 1; i++) {
      const c = P[i], d = P[i + 1];
      if (Math.max(c[0], d[0]) < bb[0] || Math.min(c[0], d[0]) > bb[2] || Math.max(c[1], d[1]) < bb[1] || Math.min(c[1], d[1]) > bb[3]) continue;
      const x = segCross(a, b, c, d);
      if (!x) continue;
      const L = segLen(a, b) || 1, dl = segLen(c, d) || 1;
      const sin = Math.abs(((b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0])) / (L * dl));
      const base = (rv.w0 + (rv.w1 - rv.w0) * i / (n - 1)) / 2;
      if (sin < .6 || HW[i] > base * 1.4) return false;
      if (joints.some(j => segLen(j, x) < 60)) return false;
      if (ponts.some(q => { const d = segLen(q, x); return d > 6 && d < espace; })) return false;   // (d > 6 : le même croisement vu deux fois)
      ponts.push(x);
    }
  }
  // longueur réelle de route sur l'eau : chaque passage ne dépasse pas la largeur locale de la
  // rivière divisée par sin 37°, plus 20 m (une route ne file jamais dans le lit d'un fleuve)
  const G = 64, grid = new Map(); // tronçons de rivière rangés par seaux de 64 m (rapide)
  for (let i = 0; i < n - 1; i++) {
    const m = HW[i] + 22, b0 = bbox([P[i], P[i + 1]]);
    for (let gx = Math.floor((b0[0] - m) / G); gx <= Math.floor((b0[2] + m) / G); gx++) for (let gy = Math.floor((b0[1] - m) / G); gy <= Math.floor((b0[3] + m) / G); gy++) {
      const key = gx + ',' + gy; if (!grid.has(key)) grid.set(key, []); grid.get(key).push(i);
    }
  }
  // (même règle avec une marge de 20 m autour de l'eau : une route ne s'approche d'une rivière
  // que pour la franchir ; elle ne la longe jamais à quelques mètres de la berge)
  // une route et la rivière ne sortent pas de la carte au même endroit : 30 m au moins entre le
  // bout de la route (sur le bord) et la berge
  for (const r of S.roads) for (const e of [r.pts[0], r.pts[r.pts.length - 1]]) {
    if (!(e[0] < 1 || e[1] < 1 || e[0] > TW - 1 || e[1] > TH - 1)) continue;
    for (let i = 0; i < n - 1; i++) if (ptSeg(e, P[i], P[i + 1]).d < HW[i] + 30) return false;
  }
  // Passage dans la bande « eau + marge » : s'il traverse vraiment l'eau, il ne dépasse pas la
  // longueur d'un pont franc ; s'il ne la traverse pas (la route frôle la rivière), il reste
  // très court (30 m au plus)
  for (const [margin, extra] of [[0, 20], [20, 60]]) for (const r of S.roads) {
    const Q = resample(r.pts, 2);
    let run = 0, maxHW = 0, crossed = false, prev = null;
    // « traverse » = passe vraiment d'une rive à l'autre (croise l'axe de la rivière) ; une route
    // qui entre dans l'eau sans la traverser n'a droit qu'à quelques mètres (6 m dans l'eau,
    // 30 m dans la marge)
    const tooLong = () => run && (crossed ? run > 2 * maxHW / .6 + extra : run > (margin ? 30 : 6));
    for (const q of Q) {
      let near = false, hwq = 0, cut = false;
      for (const i of grid.get(Math.floor(q[0] / G) + ',' + Math.floor(q[1] / G)) || []) {
        const t = ptSeg(q, P[i], P[i + 1]);
        if (t.d < HW[i] + margin) { near = true; hwq = HW[i] + margin; }
        if (prev && segCross(prev, q, P[i], P[i + 1])) cut = true;
      }
      if (near) { run += 2; maxHW = Math.max(maxHW, hwq); crossed = crossed || cut; }
      else { if (tooLong()) return false; run = 0; maxHW = 0; crossed = false; }
      prev = q;
    }
    if (tooLong()) return false;
  }
  return true;
}
function distToRoads(p) {
  let d = Infinity;
  for (const r of S.roads) { const q = r.pts; for (let i = 0; i < q.length - 1; i++) d = Math.min(d, ptSeg(p, q[i], q[i + 1]).d - r.w / 2); }
  return d;
}
// riverMode : 'auto' (selon le biome), 'aucun', 'petite', 'riviere' ou 'fleuve'
function generateRegion(biome, seed, riverMode = 'auto') {
  if (FORME) { genereDepuisForme(biome, seed); return; } // forme réelle de la région (forme.js)
  const B = BIOMES[biome] || BIOMES.tempere, rnd = seeded(seed * 31 + 7);
  const mr = mainRoad(rnd), road = mr.pts;
  S = {
    echelle:ECHELLE_TERRAIN, nextId:200, houses:[], walls:[], towers:[], gates:[],
    roads:[{ id:1, kind:'pave', w:CELL, pts:road }],
    rivers:[], lakes:[], biome, riverMode, landSeed:seed, reliefSeed:537, roadStyle:mr.style,
    gold:5000, cut:[], planted:[], grown:[], simTime:0, ressources:[],
  };
  // carrefours : 2 à 4 chemins empierrés se détachent de la grande route (en T), à au moins 140 m les
  // uns des autres, chacun partant vers un bord ; refusés s'ils longent le bord, se recoupent,
  // recoupent la grande route ou un autre chemin, sont trop courts ou trop rasants
  const frk = seeded(seed * 7 + 11), want = 2 + Math.floor(frk() * 3), junctions = [];
  if (road.length > 6) {
    const cand = road.map((q, i) => ({ i, d:segLen(q, [TW / 2, TH / 2]) })).filter(c => c.i > 1 && c.i < road.length - 2).sort((a, b) => a.d - b.d);
    for (let t = 0; t < 60 && S.roads.length <= want; t++) {
      const vi = cand[Math.floor(frk() * Math.min(cand.length, 14))].i;
      if (junctions.some(j => segLen(j, road[vi]) < 140)) continue;
      const e = ['O', 'E', 'N', 'S'][Math.floor(frk() * 4)], target = edgePoint(e, .2 + frk() * .6);
      // le chemin quitte franchement la route (50° à 130° de son axe), jamais presque parallèle
      const tg = Math.atan2(road[vi + 1][1] - road[vi - 1][1], road[vi + 1][0] - road[vi - 1][0]) * 180 / Math.PI;
      let h0 = Math.atan2(target[1] - road[vi][1], target[0] - road[vi][0]) * 180 / Math.PI;
      const rel = ((h0 - tg) % 360 + 540) % 360 - 180, sgn = rel >= 0 ? 1 : -1;
      if (Math.abs(rel) < 60) h0 = tg + sgn * 60; else if (Math.abs(rel) > 120) h0 = tg + sgn * 120;
      const pts = traceRoad(frk, road[vi].slice(), target, frk() < .5 ? 'sinueuse' : 'arc', Math.round(h0 / 10) * 10);
      // angle réel sur ses 40 premiers mètres : 45° au moins avec la grande route
      const R40 = resample(pts, 4), q40 = R40[Math.min(R40.length - 1, 10)];
      let a40 = Math.abs(((Math.atan2(q40[1] - pts[0][1], q40[0] - pts[0][0]) * 180 / Math.PI - tg) % 360 + 540) % 360 - 180);
      a40 = Math.min(a40, 180 - a40);
      if (pts.length < 4 || a40 < 45 || roadLen({ pts }) < 250 || edgeRun(pts) > 40 || selfCross(pts) || linesCross(road, pts, 40)) continue;
      if (S.roads.slice(1).some(r => linesCross(r.pts, pts, 0))) continue;
      S.roads.push({ id:S.roads.length + 1, kind:'gravier', w:CELL, pts });
      junctions.push(road[vi]);
    }
  }
  // orientation générale de la route : la rivière la croisera plutôt en travers
  const dirRoad = [road[road.length - 1][0] - road[0][0], road[road.length - 1][1] - road[0][1]];
  const riverNS = Math.abs(dirRoad[0]) >= Math.abs(dirRoad[1]);
  const cls = riverMode === 'auto' ? BIOME_RIVER[biome] : riverMode === 'aucun' ? null : riverMode;
  const RC = RIVER_CLASS[cls] || RIVER_CLASS.riviere;
  // repère du bourg : la route au milieu de la carte
  const mid = road.reduce((b, q) => segLen(q, [TW / 2, TH / 2]) < segLen(b, [TW / 2, TH / 2]) ? q : b);
  S.bourg = [[Math.round(mid[0]), Math.round(mid[1])]];
  // rivière principale, du nord au sud : elle croise la route par un pont
  const nAuto = countIn(rnd, B.rivers);
  const nR = !cls ? 0 : riverMode === 'auto' ? nAuto : 1; // choix forcé : toujours un cours d'eau
  for (let k = 0; k < nR; k++) {
    for (let t = 0; t < 60; t++) {
      // du nord au sud si la route va plutôt d'ouest en est, sinon d'ouest en est
      const u1 = .2 + rnd() * .6, du = (rnd() - .5) * .35, u2 = Math.max(.12, Math.min(.88, u1 + du));
      const [ra, rb] = riverNS ? [[TW * u1, -12], [TW * u2, TH + 12]] : [[-12, TH * u1], [TW + 12, TH * u2]];
      const rv = makeRiverPath(ra, rb, { amp:between(rnd, RC.amp), cycles:between(rnd, RC.cycles), phase:rnd() * 6.28, w0:(RC.w0 + RC.w1) / 2, w1:(RC.w0 + RC.w1) / 2, harm:RC.harm });
      rv.cls = cls;
      if (!riverFitsRoads(rv, t < 45 ? regle('pont_espace') : regle('pont_espace') / 3) || S.rivers.some(o => riverGap(o, rv.pts.filter((_, i) => i % 5 === 0)) < 150)) continue;   // (en dernier recours, après 45 essais, la distance entre ponts est réduite au tiers)
      S.rivers.push(rv); break;
    }
  }
  // affluents : ils partent d'un bord (ouest ou est) et rejoignent la rivière principale
  const main = S.rivers[0], nT = main ? countIn(rnd, B.tribs) : 0;
  for (let k = 0; k < nT; k++) {
    for (let t = 0; t < 60; t++) {
      const ic = Math.round(main.pts.length * (.2 + rnd() * .6)), conf = main.pts[ic];
      // l'affluent naît en amont (plus au nord que sa confluence) : il descend vers la rivière
      const west = rnd() < .5, start = [west ? -12 : TW + 12, Math.max(60, conf[1] - 200 - rnd() * 600)];
      if (Math.abs(start[0] - conf[0]) < 400) continue;
      const head = makeRiverPath(start, conf, { amp:between(rnd, B.river.amp) * .6, cycles:between(rnd, B.river.cycles), phase:rnd() * 6.28, w0:B.river.w0 * .6, w1:B.river.w1 * .65 });
      // confluence douce, en « Y », dans le sens du courant (voir joinTributary)
      let pts = null;
      try { pts = joinTributary(head.pts, main.pts, ic); } catch (e) { console.warn('confluence', e); }
      if (!pts) continue;
      const at = joinTributary.last, tr = { pts, w0:head.w0, w1:head.w1, joined:4, mouth:riverHW(main)[at] };
      // l'affluent ne touche les autres rivières qu'à sa confluence
      const body = tr.pts.slice(0, Math.floor(tr.pts.length * .85)).filter((_, i) => i % 4 === 0);
      if (!riverFitsRoads(tr) || S.rivers.some(o => riverGap(o, body) < 60)) continue;
      main.confl = [...(main.confl || []), at]; // la rivière principale s'élargit en aval
      S.rivers.push(tr); break;
    }
  }
  // lacs ou mares : à l'écart de la route, des rivières, de la mer et des autres lacs (LAC_DIST)
  const nL = Math.min(1, countIn(rnd, B.lakes));                          // UN SEUL grand lac (demande du 12/10), pas une poussière de petits étangs
  for (let k = 0; k < nL; k++) {
    for (let t = 0; t < 80; t++) {
      const R = between(rnd, B.lakeR) * ECHELLE_TERRAIN * (3.6 - 2.6 * t / 79), m = R * 1.3 + 30;   // (rayon ×3,6 au départ, réduit jusqu'à ×1 si la place manque)   // (rayons réglés pour 2000 × 1500 m : × l'échelle du terrain)
      const c = [m + rnd() * (TW - 2 * m), m + rnd() * (TH - 2 * m)];
      const lk = makeLake(round2(c[0]), round2(c[1]), R, rnd() * 6.28, rnd() * 6.28);
      if (!lacLibre(lk)) continue;                                        // à l'écart de tout (LAC_DIST, eau.js)
      S.lakes.push(lk); break;
    }
  }
  S.roads = [];                       // PLUS DE ROUTES générées (demande du 12/10)
  computeZones();
  S.deposits = placeDeposits(seed);
  if (typeof placeTestResources === 'function') { S.ressources = placeTestResources(seed); S.testInit = true; S.ressources.push(...placeFruitiers(seed, Object.keys(FRUITIERS))); S.fruitiersInit = 2; }   // (map-test.html : animaux, poissons, cultures, tous les arbres fruitiers)
  else S.ressources = placeFruitiers(seed, fruitiersDuBiome(S.biome, seed));
}
let S;
// les plans enregistrés avant les fortifications n'ont pas ces listes
const OLD_KINDS = { sentier:'terre', chemin:'gravier', rue:'pave' }; // anciens types de route
const normalize = o => {
  for (const k of ['houses', 'roads', 'walls', 'towers', 'gates']) if (!Array.isArray(o[k])) o[k] = [];
  delete o.owned; delete o.fields; delete o.parcelMesh; // ancien cadastre, supprimé
  for (const h of o.houses) { if (h.kind === 'forge') h.kind = 'fonderie'; else if (h.kind === 'archerie') h.kind = 'menuiserie'; else if (h.kind === 'armurerie') h.kind = 'fonderie'; else if (h.kind === 'cordonnerie') h.kind = 'couture'; else if (h.kind === 'scriptorium') h.kind = 'eglise'; else if (h.kind === 'atelier_monetaire' || h.kind === 'bas_fourneau') h.kind = 'fonderie'; else if (h.kind === 'tonnellerie') h.kind = 'menuiserie'; else if (h.kind === 'atelier_tissage') h.kind = 'corderie'; else if (h.kind === 'teinturerie_foulerie') h.kind = 'tannerie'; else if (h.kind === 'maison_cour') h.kind = 'maison'; }   // bâtiments supprimés (13/10) : forge → fonderie, archerie → menuiserie, maison avec cour → maison
  if (typeof o.gold !== 'number') o.gold = 5000;
  for (const r of o.roads) if (OLD_KINDS[r.kind]) r.kind = OLD_KINDS[r.kind];
  for (const w of o.walls) w.w = WALL_W; // murailles : une case de large, comme les routes
  for (const k of ['walls', 'towers', 'gates']) for (const f of o[k]) if (!f.lvl) f.lvl = 3; // ouvrages d'avant les niveaux : en pierre
  if (!o.landSeed) o.landSeed = 20260928; // graine du paysage (herbe, arbres, buissons)
  if (!BIOMES[o.biome]) o.biome = OLD_BIOMES[o.biome] || 'tempere';
  if (!Array.isArray(o.cut)) o.cut = [];  // arbres abattus (clés « x,y »), définitivement
  if (!Array.isArray(o.planted)) o.planted = []; // jeunes plants des forestiers
  if (!Array.isArray(o.grown)) o.grown = [];     // plants devenus arbres
  if (!Array.isArray(o.ressources)) o.ressources = [];   // repères de la map test
  if (!Array.isArray(o.deposits)) o.deposits = [];   // gisements de minerai (plans d'avant : aucun)
  if (!Array.isArray(o.champs)) o.champs = [];       // champs (zones entourées de routes) : plans d'avant : aucun
  if (o.biome === 'polaire') { o.deposits = []; o.ressources = o.ressources.filter(r => ['manchot', 'phoque', 'morse', 'ours_polaire'].includes(r.key)); if (o.ressources.length < 6) { o.ressources = []; delete o.fauneInit; } }   // désert polaire : ni gisement ni autre ressource, même dans un plan déjà enregistré ; seuls phoque, morse et ours polaire
  o.deposits.forEach(reduireGisement);                // (anciens grands affleurements : réduits à une petite zone de pépites)
  if (!o.reliefSeed) o.reliefSeed = 4417;  // graine du relief
  // une seule rivière / un seul lac dans les plans d'avant : on passe aux listes
  if (!Array.isArray(o.rivers)) o.rivers = o.river ? [o.river] : [];
  if (!Array.isArray(o.lakes)) o.lakes = o.lake ? [o.lake] : [];
  delete o.river; delete o.lake;
  try { softenConfluences(o.rivers); } catch (e) { console.warn('confluences', e); } // anciens affluents : raccord en « Y »
  return o;
};
try {
  const o = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (PAGE !== 'batiments' && o && Array.isArray(o.houses) && Array.isArray(o.roads) && !(MONDE_PLAT && !o.roads.length)) {   // (éditeur de routes : un plan sans aucune route est regénéré d'après sa graine)
    if (MONDE_PLAT && o.platSeed) formePlat(o.platSeed);                             // éditeur de routes : la côte de la graine est reconstruite
    if (o.forme && !GAME) chargeForme(o.forme.id);                                  // éditeur : la région choisie
    // région du jeu : un plan d'avant les formes réelles (rectangle) est remplacé par la vraie forme
    if (!(GAME && FORME && (!(o.forme && o.forme.v === FORMES_V) || o.echelle !== ECHELLE_TERRAIN))) {   // (plan d'une autre échelle de terrain : région régénérée)
      S = normalize(o); computeZones(); if (typeof carveRivieres === 'function') try { carveRivieres(); } catch (e) { console.warn('carve', e); } } // (portes recalées au démarrage)
  }
} catch (e) {}
if (!S) { if (PAGE === 'batiments') { S = normalize({ nextId:1 }); computeZones(); } // éditeur de bâtiments : pas de région
  else if (MONDE_PLAT) genereMondePlat(platGraine());                    // éditeur de routes : carte d'essai tirée d'une graine (monde-plat.js)
  else if (GAME) generateRegion(BIOMES[GAME.biome] ? GAME.biome : 'tempere', GAME.seed, GAME.river); // région du jeu : générée d'après son climat
  else { if (PAGE === 'carte' && typeof MAPTEST === 'undefined') { try { chargeForme(+localStorage.getItem('editeurCarte.forme') || 1); } catch (e) {} }   // éditeur : la dernière région choisie (sinon la n° 1), plus le terrain d'essai
    generateRegion('tempere', 20260929); } }                          // première ouverture : une région de plaine tempérée
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
addEventListener('pagehide', save);   // la progression est enregistrée quand la région est déchargée (retour au globe, fermeture de la page)

let tool = 'select', preset = PRESETS[0], custom = null, swapped = false, roadKind = ROADS[1], yardKind = 'potager';
let snapLen = true;   // (murailles seulement : longueur en cases entières)
let captureEdit = null;                                      // choix d'un animal à capturer pour une ferme en cours : { id, k }
let eauEdit = null;                                          // choix du plan d'eau d'une cabane de pêche en cours : { id }
let deplacer = null;                                         // déplacement d'un bâtiment en cours : { id, preview }
let sel = null, hover = null, cursor = null, draft = null, drag = null, pinch = null, spaceDown = false;
const undoStack = [], pointers = new Map();
