/* ---------- MAP TEST : ressources à poser et à supprimer ----------
   La page map-test.html génère une carte avec tout ce que le jeu connaît (js/jeu/ressources.js) : les 9 minerais (gisements, S.deposits), les animaux
   d'élevage, la faune sauvage, les prédateurs, les poissons d'eau douce et de mer, les cultures et le bois (repères, S.ressources). Deux outils :
   « Placer » pose l'élément choisi là où l'on clique ; « Gomme » supprime celui qu'on clique. Ctrl+Z annule. La carte est enregistrée à part
   (clé mapTest.v1). Un repère : { id, cat, key, x, y } ; peint par drawRessources (appelé par drawDecor). */
const CAT_TEST = [
  { id:'gisement', nom:'Minerais (gisements)', items:() => MINERALS,                              disque:'#7b7466', defaut:'⛏️' },
  { id:'elevage',  nom:'Animaux d’élevage',    items:() => animalsOf('elevage'),                   disque:'#c58b5a', defaut:'🐑' },
  { id:'faune',    nom:'Faune sauvage',        items:() => animalsOf('faune'),                     disque:'#6f9a5a', defaut:'🦌' },
  { id:'predateur',nom:'Prédateurs',           items:() => animalsOf('predateur'),                 disque:'#b5483f', defaut:'🐺' },
  { id:'poisson',  nom:'Poissons d’eau douce', items:() => FRESH_FISH,                             disque:'#3f7fc4', defaut:'🐟' },
  { id:'mer',      nom:'Poissons de mer',      items:() => Object.keys(SEA_FISH),                  disque:'#2f5fa8', defaut:'🐠' },
  { id:'villageois', nom:'Villageois',           items:() => Object.keys(VILLAGEOIS),               disque:'#c8a050', defaut:'🧑' },
  { id:'chariot',  nom:'Chariots et charrettes', items:() => Object.keys(CHARIOTS),                 disque:'#9a6a3a', defaut:'🛒' },
  { id:'bateau',   nom:'Bateaux (sur l’eau)',    items:() => Object.keys(VEHICULES),                 disque:'#3f7fc4', defaut:'⛵' },
  { id:'fruitier', nom:'Arbres fruitiers',     items:() => Object.keys(FRUITIERS),                 disque:'#6a8741', defaut:'🍎' },
  { id:'culture',  nom:'Cultures et bois',     items:() => CROPS,                                  disque:'#a89a3f', defaut:'🌾' },
];
const GLYPHES = { cheval:'🐴', ane:'🫏', vache:'🐄', zebu:'🐂', buffle:'🐃', yak:'🐃', mouton:'🐑', chevre:'🐐', chevre_cachemire:'🐐', cochon:'🐖', chameau:'🐫',
  chameau_bactriane:'🐪', lama:'🦙', alpaga:'🦙', elephant_asie:'🐘', elephant_afrique:'🐘', dindon:'🦃', cerf:'🦌', chevreuil:'🦌', sanglier:'🐗',
  bison:'🦬', lievre:'🐇', zebre:'🦓', hippopotame:'🦛', rhinoceros:'🦏', kangourou:'🦘', loup:'🐺', ours_brun:'🐻', ours_noir:'🐻', ours_polaire:'🐻‍❄️',
  lion:'🦁', tigre:'🐅', leopard:'🐆', jaguar:'🐆', guepard:'🐆', renard:'🦊', castor:'🦫', crocodile:'🐊', hyene:'🐺', lynx:'🐱', puma:'🐆',
  ble:'🌾', orge:'🌾', seigle:'🌾', avoine:'🌾', lin:'🌸', chanvre:'🌿', bois:'🌲', bois_chauffage:'🪵', pierre:'🪨', poivre:'🌶️', safran:'🌷',
  baleine:'🐋', phoque:'🦭', requin:'🦈', thon:'🐟' };
const nomTest = (cat, key) => (cat === 'villageois' ? VILLAGEOIS[key].nom : cat === 'chariot' ? CHARIOTS[key].nom : cat === 'bateau' ? VEHICULES[key].nom : cat === 'fruitier' ? FRUITIERS[key].nom : cat === 'mer' ? SEA_FISH[key] : (RESOURCES[key] || {}).name) || key;
const glypheTest = (cat, key) => GLYPHES[key] || CAT_TEST.find(c => c.id === cat).defaut;

// ---- génération : tout ce qu'on crée, une fois ----
function placeTestResources(seed) {
  const rnd = seeded(seed * 29 + 5), out = [], M = 220, add = (cat, key, p) => out.push({ id:out.length + 1, cat, key, x:round2(p[0]), y:round2(p[1]) });
  const eau = [...(Z.water.river || []), ...(Z.water.lake || [])];
  const surEau = (p, r) => eau.length && hitsAny([[p[0] - r, p[1] - r], [p[0] + r, p[1] - r], [p[0] + r, p[1] + r], [p[0] - r, p[1] + r]], eau);
  // animaux et cultures : quatre massifs (un par catégorie terrestre), hors de l'eau et des routes
  const e = TW / 6000, massifs = { elevage:[1500 * e, 1200 * e], faune:[4300 * e, 1300 * e], predateur:[4200 * e, 3300 * e], culture:[1500 * e, 3300 * e] }, cible = [];   // (positions réglées pour 6000 × 4500 m)
  for (const cat of ['elevage', 'faune', 'predateur', 'culture']) {
    const items = CAT_TEST.find(c => c.id === cat).items(), [cx, cy] = massifs[cat], R = 260 + Math.sqrt(items.length) * (FAUNE_CATS.has(cat) ? 190 : 120);
    for (const key of items) for (let t = 0; t < 800; t++) {
      const a = rnd() * 6.283, r = Math.sqrt(rnd()) * R, p = FORME ? [M + rnd() * (TW - 2 * M), M + rnd() * (TH - 2 * M)] : [cx + Math.cos(a) * r, cy + Math.sin(a) * r];   // (forme réelle : n'importe où dans la région)
      if (!dansRegion(p) || p[0] < M || p[1] < M || p[0] > TW - M || p[1] > TH - M || surEau(p, 25) || distToRoads(p) < 25) continue;
      if (out.some(o => Math.hypot(o.x - p[0], o.y - p[1]) < (FAUNE_CATS.has(cat) && FAUNE_CATS.has(o.cat) ? 230 : 110))) continue;
      add(cat, key, p); break;
    }
  }
  // poissons : sur l'eau (lacs et cours d'eau)
  const eaux = [];
  for (const lk of S.lakes) { const b = bbox(lk.pts); for (let t = 0; t < 400; t++) { const p = [b[0] + rnd() * (b[2] - b[0]), b[1] + rnd() * (b[3] - b[1])]; if (inPoly(p, lk.pts)) eaux.push(p); } }
  for (const rv of S.rivers) for (let i = 4; i < rv.pts.length - 4; i += 3) eaux.push(rv.pts[i]);
  for (const cat of ['poisson', 'mer']) for (const key of CAT_TEST.find(c => c.id === cat).items()) for (let t = 0; t < 300 && eaux.length; t++) {
    const p = eaux[Math.floor(rnd() * eaux.length)];
    if (out.some(o => Math.hypot(o.x - p[0], o.y - p[1]) < 55)) continue;
    add(cat, key, p); break;
  }
  return out;
}

// ---- dessin ----
function drawRessources() {
  const list = S.ressources || [], s = view.s, [x0, y0] = toW(0, 0), [x1, y1] = toW(W, H), m = 40 / s;
  const rayon = Math.max(8, Math.min(17, s * 10));
  for (const r of list) {
    if (r.cat === 'fruitier' || (FAUNE_CATS.has(r.cat) && tool !== 'ressource' && tool !== 'gomme')) continue;                                             // (peints par drawFruitiers : arbres.js)
    if (r.x < x0 - m || r.x > x1 + m || r.y < y0 - m || r.y > y1 + m) continue;
    const [X, Y] = toS(r.x, r.y), c = CAT_TEST.find(k => k.id === r.cat);
    ctx.beginPath(); ctx.arc(X, Y, rayon, 0, Math.PI * 2); ctx.fillStyle = c.disque; ctx.globalAlpha = .88; ctx.fill(); ctx.globalAlpha = 1;
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#fffdf3'; ctx.stroke();
    ctx.font = Math.round(rayon * 1.15) + 'px "Segoe UI Emoji","Apple Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
    ctx.fillText(glypheTest(r.cat, r.key), X, Y + 1);
    if (s > .3) { ctx.font = '600 15px "Barlow Condensed", sans-serif'; ctx.textBaseline = 'top'; haloText(nomTest(r.cat, r.key), X, Y + rayon + 2, Col.ink, Col.sheet); }
  }
}
// fantôme de l'élément choisi sous le curseur (outil « Placer ») ou cercle de la gomme
function drawRessourcesGhost() {
  if (!cursor || (tool !== 'ressource' && tool !== 'gomme') || (drag && drag.kind === 'pan')) return;
  const [X, Y] = toS(...cursor), rayon = Math.max(8, Math.min(17, view.s * 10));
  ctx.beginPath(); ctx.arc(X, Y, tool === 'gomme' ? Math.max(14, 18) : rayon, 0, Math.PI * 2);
  if (tool === 'gomme') { ctx.strokeStyle = '#d64541'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]); return; }
  const { cat, key } = choixTest(); ctx.globalAlpha = .6; ctx.fillStyle = CAT_TEST.find(c => c.id === cat).disque; ctx.fill(); ctx.globalAlpha = 1;
  ctx.font = Math.round(rayon * 1.15) + 'px "Segoe UI Emoji","Apple Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(glypheTest(cat, key), X, Y + 1);
}

// ---- outils ----
const choixTest = () => ({ cat:$('test-cat').value, key:$('test-item').value });
const rafraichit = (x, y, r = 130) => { touchScene(); markDirty([x - r, y - r, x + r, y + r]); save(); requestDraw(); };
function placeTest(p) {
  if (!inTerrain(p)) return;
  const { cat, key } = choixTest(); if (!key) return;
  if (cat === 'bateau') { placeBateau(p, key); return; }
  if (cat === 'villageois') { placeVillageois(p, key); return; }
  if (cat === 'chariot') { placeChariot(p, key); return; }
  commit();
  if (cat === 'gisement') {                                                       // un gisement : un affleurement de 70 m de rayon
    const r = 70, ph = [p[0] * .013, p[1] * .017], pts = [];
    for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2, rr = r * (1 + .22 * Math.sin(3 * a + ph[0]) + .1 * Math.sin(5 * a + ph[1])); pts.push([round2(p[0] + Math.cos(a) * rr), round2(p[1] + Math.sin(a) * rr)]); }
    S.deposits.push({ kind:key, c:[round2(p[0]), round2(p[1])], r, pts, seed:Math.floor(p[0] * 7 + p[1] * 13) % 1000000 });
  } else S.ressources.push({ id:Math.max(0, ...S.ressources.map(o => o.id)) + 1, cat, key, x:round2(p[0]), y:round2(p[1]) });
  rafraichit(p[0], p[1]); flash(nomTest(cat, key) + ' posé');
}
function effaceTest(p) {
  const seuil = Math.max(18 / view.s, 10);
  let best = null, bd = seuil;
  for (const r of S.ressources) { const d = Math.hypot(r.x - p[0], r.y - p[1]); if (d < bd) { bd = d; best = { list:S.ressources, o:r, nom:nomTest(r.cat, r.key), x:r.x, y:r.y }; } }
  for (const d of S.deposits) { const dd = Math.hypot(d.c[0] - p[0], d.c[1] - p[1]) - d.r; if (dd < bd) { bd = dd; best = { list:S.deposits, o:d, nom:(GISEMENTS[d.kind] || {}).nom, x:d.c[0], y:d.c[1], r:d.r + 60 }; } }
  for (const b of S.bateaux || []) { const d = Math.hypot(b.x - p[0], b.y - p[1]) - VEHICULES[b.kind].T * .4; if (d < bd) { bd = d; best = { list:S.bateaux, o:b, nom:VEHICULES[b.kind].nom, x:b.x, y:b.y, r:VEHICULES[b.kind].T + 60 }; } }
  { const h = marcheAu(p); if (h) { const d = 0; if (d < bd) { bd = d; best = { list:h.type === 'v' ? S.villageois : S.chariots, o:h.o, nom:h.type === 'v' ? VILLAGEOIS[h.o.kind].nom : CHARIOTS[h.o.kind].nom, x:h.o.x, y:h.o.y, r:60 }; } } }
  if (!best) { flash('Rien à supprimer ici', true); return; }
  commit(); best.list.splice(best.list.indexOf(best.o), 1); rafraichit(best.x, best.y, best.r || 130); flash(best.nom + ' supprimé');
}
const RESSOURCE_OUTILS = { ressource:placeTest, gomme:effaceTest };

// ---- panneau ----
function remplitItems() {
  const c = CAT_TEST.find(k => k.id === $('test-cat').value);
  $('test-item').innerHTML = c.items().map(k => `<option value="${k}">${glypheTest(c.id, k)} ${nomTest(c.id, k)}</option>`).join('');
}
$('test-cat').innerHTML = CAT_TEST.map(c => `<option value="${c.id}">${c.nom}</option>`).join('');
$('test-cat').addEventListener('change', () => { remplitItems(); setTool('ressource'); });
$('test-item').addEventListener('change', () => setTool('ressource'));
remplitItems();
$('test-clear').addEventListener('click', () => {
  if (!S.ressources.length && !S.deposits.length) return;
  commit(); S.ressources = []; S.deposits = []; S.bateaux = []; S.villageois = []; S.chariots = []; touchScene(); markAllDirty(); save(); requestDraw(); flash('Tout est supprimé (Ctrl+Z pour annuler)');
});
$('test-regen').addEventListener('click', () => { commit(); generateRegion('tempere', 1 + Math.floor(Math.random() * 2147483000), 'auto'); sel = null; draft = null; changed(true); fit(); flash('Map test régénérée (Ctrl+Z pour annuler)'); });

fixeHeure(12);   // la map test s'ouvre en plein jour (curseur « Heure » pour tester la nuit)
// première ouverture : la map test reçoit tout ce que le jeu connaît (les cartes enregistrées avant gardent ce qu'elles ont)
if (!S.testInit) { S.ressources = placeTestResources(S.landSeed); S.testInit = true; save(); }
if (S.fruitiersInit !== 2) { S.ressources = S.ressources.filter(r => r.cat !== 'fruitier'); S.ressources.push(...placeFruitiers(S.landSeed, Object.keys(FRUITIERS))); S.fruitiersInit = 2; touchScene(); save(); }   // (cartes enregistrées avant les arbres fruitiers, ou avec les anciens bosquets de 3 : on replante)
