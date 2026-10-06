/* ---------- bûcherons : simulation ----------
   Chaque camp de bûcherons / loge de bûcheron dont la zone est définie a un habitant :
   il marche jusqu'à l'arbre de la zone le plus proche du bâtiment, l'abat (l'arbre
   disparaît définitivement), rapporte le bois au bâtiment et le stocke, puis repart,
   jusqu'à ce que la zone soit vide. Temps accéléré pour qu'on voie le travail. */
const LUMBER = { camp_bucherons:"bois d'œuvre", loge_bucheron:'bois de chauffage' };
const TAILLEURS = { tailleur_pierre:'pierre' };   // récolte de pierres (kind:'rock') au lieu d'arbres : elles vont au stock du village
const rocksInZone = z => flora.filter(f => f.kind === 'rock' && (f.x - z.x) ** 2 + (f.y - z.y) ** 2 <= z.r * z.r);
const WALK = 8, CUT_TIME = 2.5, DROP_TIME = .8; // m/s sur route (moitié hors route, deplacements.js) et secondes (accélérés)
const workers = new Map();
let floraVersion = 0;
const zoneKeyOf = z => z ? `${z.x},${z.y},${z.r}` : '';
const treesInZone = z => flora.filter(f => f.kind === 'tree' && (f.x - z.x) ** 2 + (f.y - z.y) ** 2 <= z.r * z.r);
const WORKER_STATE = { idle:'cherche un arbre', go:'en route vers un arbre', cut:'abat un arbre', back:'rapporte le bois', drop:'range le bois', done:'zone épuisée' };
const STONE_STATE = { idle:'cherche une pierre', go:'en route vers une pierre', cut:'taille une pierre', back:'rapporte la pierre', drop:'range la pierre', done:'plus de pierre dans la zone' };
/* ---------- forestiers : replantation ----------
   L'habitant d'une hutte de forestier va planter un jeune plant à un endroit libre de sa
   zone (pas d'arbre à moins de 4 m, ni eau, ni route, ni bâtiment), revient, recommence,
   tant que la zone n'est pas assez boisée (1 arbre pour 40 m²). Un plant devient un arbre
   après GROW secondes de simulation (temps accéléré) ; plants et arbres sont enregistrés. */
const GROW = 90, PLANT_TIME = 2, PLANT_DENSITY = 60;
function growSaplings() {
  if (!S.planted || !S.planted.length) return false;
  let grew = false;
  S.planted = S.planted.filter(s => {
    if ((S.simTime || 0) - s.b < GROW) return true;
    const g = { x:s.x, y:s.y, r:3.2 + Math.random() * 2.2, v:Math.random() };
    (S.grown = S.grown || []).push(g);
    flora.push({ x:g.x, y:g.y, r:g.r, kind:'tree', v:g.v });
    invalidateTiles(g.x, g.y, 15);
    grew = true; return false;
  });
  if (grew) { floraIdx = null; save(); }
  return grew;
}
function plantSpot(h) {
  const z = h.zone, near = treesInZone(z), saplings = S.planted || [];
  if (near.length + saplings.filter(s => segLen([s.x, s.y], [z.x, z.y]) <= z.r).length >= Math.PI * z.r * z.r / PLANT_DENSITY) return null;
  const water = [...Z.water.river, ...Z.water.lake];
  for (let k = 0; k < 40; k++) {
    const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * z.r, p = [round2(z.x + Math.cos(a) * d), round2(z.y + Math.sin(a) * d)];
    if (!inTerrain(p) || near.some(f => segLen([f.x, f.y], p) < 7) || saplings.some(s => segLen([s.x, s.y], p) < 7)) continue;
    if (water.some(w => p[0] >= w.bb[0] && p[0] <= w.bb[2] && p[1] >= w.bb[1] && p[1] <= w.bb[3] && inPoly(p, w.P))) continue;
    if (S.houses.some(o => inPoly(p, corners(o))) || S.roads.some(r => r.pts.slice(1).some((q, i) => ptSeg(p, r.pts[i], q).d < r.w / 2 + 1))) continue;
    return p;
  }
  return null;
}
function stepForester(h, dt) {
  let w = workers.get(h.id);
  if (!w || w.zone !== zoneKeyOf(h.zone)) { w = { x:w ? w.x : h.x, y:w ? w.y : h.y, state:'idle', zone:zoneKeyOf(h.zone), forester:true }; workers.set(h.id, w); }
  const before = w.state;
  const walkTo = (tx, ty) => marcher(w, tx, ty, WALK, dt); // par les routes si elles font gagner du temps
  if (w.state === 'idle' || w.state === 'done') {
    if ((w.t = (w.t || 0) - dt) <= 0) { const p = plantSpot(h); if (p) { w.dest = p; w.state = 'go'; } else { w.state = 'done'; w.t = 2; } }
  } else if (w.state === 'go') {
    if (walkTo(...w.dest)) { w.state = 'cut'; w.t = PLANT_TIME; } // « cut » : même animation (il creuse)
  } else if (w.state === 'cut') {
    if ((w.t -= dt) <= 0) { (S.planted = S.planted || []).push({ x:w.dest[0], y:w.dest[1], b:S.simTime || 0 }); h.stock = (h.stock || 0) + 1; save(); w.state = 'back'; }
  } else if (w.state === 'back') {
    if (walkTo(h.x, h.y)) { w.state = 'idle'; w.t = .8; }
  }
  if (w.state !== before && isOn('house', h.id, sel) && !zoneEdit) renderSel();
}
const FORESTER_STATE = { idle:'prépare des plants', go:'va planter', cut:'plante un arbre', back:'revient', done:'zone assez boisée' };
function cutTree(f) {
  S.cut.push(treeKey(f));
  const i = flora.indexOf(f); if (i >= 0) flora.splice(i, 1);
  if (f.wood) classifyWoods(); // une clairière s'ouvre : ses bords deviennent lisière
  floraIdx = null;
  invalidateTiles(f.x, f.y, f.wood ? 110 : 12); // le dégradé du bois change autour de la clairière
}
/* ---------- jour et nuit ----------
   Le jour, de l'aube au crépuscule du lieu (js/saisons.js), les habitants travaillent. La nuit, ils ne travaillent pas : chacun rentre se
   reposer dans son habitation (le n° de villageois du bâtiment où il travaille, voir logements()) ou, un sur trois, va à la taverne s'il
   y en a une. Au matin ils ressortent et reprennent leur journée depuis le début. */
function estNuit() {
  if (typeof soleil !== 'function') return false;
  const h = heureCarte(), so = soleil(REGION_METEO.lat, METEO.doy, h);
  if (so.polaire) return so.polaire === 'nuit';
  return h < so.lever || h >= so.coucher;
}
// où dort l'habitant du bâtiment h : la taverne (un sur trois), sinon son logement, sinon son lieu de travail
function lieuDeRepos(h) {
  const taverne = S.houses.find(o => o.kind === 'taverne');
  if (taverne && (h.id * 7) % 3 === 0) return [taverne.x, taverne.y];
  if (typeof logements === 'function') {
    const trav = S.houses.filter(o => workers.has(o.id)).sort((a, b) => a.id - b.id), n = trav.indexOf(h) + 1, L = logements();
    const maison = L.maisons.find(([, occ]) => occ.includes(n));
    if (maison) return [maison[0].x, maison[0].y];
    const camp = campColon(); if (camp && L.camp.includes(n)) return [camp.x, camp.y];
  }
  return [h.x, h.y];
}
// vrai tant que l'habitant du bâtiment h se repose ou rentre se reposer (le travail du jour est alors suspendu)
function reposNuit(h, dt) {
  const w = workers.get(h.id); if (!w || w.passive) return false;
  if (!estNuit()) {
    if (w.nuit) { w.nuit = null; w.dedans = false; w.chemin = null; w.state = 'idle'; w.t = 0; w.carry = false; w.target = null; w.panier = 0; }   // le matin : il ressort et commence sa journée
    return false;
  }
  if (!w.nuit) { w.nuit = 'go'; w.carry = false; w.target = null; w.chemin = null; w.repos = lieuDeRepos(h); }
  if (w.nuit === 'go' && marcher(w, w.repos[0], w.repos[1], WALK, dt)) { w.nuit = 'dedans'; w.dedans = true; }
  return w.nuit === 'go';                                                // (vrai : il marche encore, il faut redessiner)
}
function simTick(dt) {
  let active = false, panelDirty = false;
  const taken = new Set([...workers.values()].map(w => w.target && treeKey(w.target)).filter(Boolean));
  for (const h of S.houses) {
    if (workers.has(h.id) && !workers.get(h.id).passive && estNuit()) { if (reposNuit(h, dt)) active = true; continue; }   // la nuit : pas de travail
    if (workers.has(h.id) && workers.get(h.id).nuit) reposNuit(h, dt);                                                    // le matin : il ressort
    const job = jobOf(h);
    if (job) { active = stepJob(h, job, dt) || active; continue; }
    if (h.kind === 'hutte_forestier' && h.zone) { stepForester(h, dt); active = true; continue; }
    if (!(LUMBER[h.kind] || TAILLEURS[h.kind]) || !h.zone) { workers.delete(h.id); continue; }
    let w = workers.get(h.id);
    // nouvelle zone, ou végétation recalculée (annuler…) : l'habitant repart du bâtiment
    if (!w || w.zone !== zoneKeyOf(h.zone) || w.version !== floraVersion) {
      w = { x:w ? w.x : h.x, y:w ? w.y : h.y, state:'idle', zone:zoneKeyOf(h.zone), version:floraVersion, carry:w ? w.carry : false };
      workers.set(h.id, w);
    }
    active = true;
    const before = w.state;
    const sp = WALK * (hasOxen(h) ? 1.5 : 1); // les bœufs tirent le bois : trajets plus rapides
    const walkTo = (tx, ty) => marcher(w, tx, ty, sp, dt);
    if (w.state === 'idle' || w.state === 'done') {
      if (w.carry) { w.state = 'back'; }
      else {
        const t = (TAILLEURS[h.kind] ? rocksInZone : treesInZone)(h.zone).filter(f => !taken.has(treeKey(f))).sort((a, b) => (a.x - h.x) ** 2 + (a.y - h.y) ** 2 - ((b.x - h.x) ** 2 + (b.y - h.y) ** 2))[0];
        if (t) { w.target = t; taken.add(treeKey(t)); w.state = 'go'; } else w.state = 'done';
      }
    } else if (w.state === 'go') {
      if (walkTo(w.target.x, w.target.y)) { w.state = 'cut'; w.t = CUT_TIME; }
    } else if (w.state === 'cut') {
      if ((w.t -= dt) <= 0) { w.yield = Math.max(1, Math.round(w.target.r)); cutTree(w.target); w.target = null; w.carry = true; w.state = 'back'; }
    } else if (w.state === 'back') {
      if (walkTo(h.x, h.y)) { w.state = 'drop'; w.t = DROP_TIME; }
    } else if (w.state === 'drop') {
      if ((w.t -= dt) <= 0) {
        w.carry = false; const n = TAILLEURS[h.kind] ? w.yield || 1 : 1; h.stock = (h.stock || 0) + n;
        if (TAILLEURS[h.kind]) { const st = S.stock || (S.stock = {}); st.pierre = (st.pierre || 0) + n; }
        save(); w.state = 'idle'; }
    }
    if (w.state !== before && isOn('house', h.id, sel)) panelDirty = true;
  }
  if (panelDirty && !zoneEdit) renderSel();
  return active;
}
/* ---------- métiers : moteur générique ----------
   Chaque bâtiment (ou extension d'arrière-cour) peut avoir un métier (job) :
   - site    : l'ouvrier va travailler sur des lieux (champs, pâturages), rapporte le produit ;
   - fetch   : il va chercher une matière chez un producteur (bâtiment ou extension), la
               rapporte et la transforme sur place ;
   - passive : production sans déplacement (poulailler, potager…), jusqu'à un plafond ;
   - collect : grange / entrepôt, qui ramassent les produits des autres pour les stocker ;
   - sell    : comptoir commercial, qui vend le contenu des granges et entrepôts contre de l'Or ;
   - relay   : poste de relais, dont les mulets vont aux confins de la région et reviennent.
   Chaque unité ramassée est retirée du stock de la source au moment où on la réserve. */
const RAW = ['bois', 'laine', 'peaux'];                 // matières premières : on en laisse aux artisans
const RAW_KEEP = 4;
const VALUE = { 'légumes':2, 'œufs':2, 'pommes':2, 'pain':3, 'bois':2, 'planches':4, 'laine':3, 'peaux':3, 'pièces en bois':5,
  'arcs et flèches':8, 'vêtements':8, 'chaussures':6, 'bière':4, 'outils et armes':10, 'armures':14 };
const CARRY = { 'poisson':'sheep', 'grain':'stall-b', 'laine':'sheep', 'farine':'sheep', 'pain':'earth-edge', 'bois':'earth-edge', 'planches':'f-fallow', 'légumes':'f-alfalfa',
  'œufs':'sheep', 'pommes':'stall-a', 'peaux':'ore-clay', 'marchandises':'stall-a', 'Or':'stall-b' };
// ce que produit un bâtiment (pour le trouver comme source) et son identifiant de producteur
const producerId = h => (buildingOf(h) || {}).yard ? yardOf(h) : h.kind;
function productOf(h) {
  if (LUMBER[h.kind]) return 'bois';
  const j = jobOf(h);
  return j && j.product || null;
}
function jobOf(h) {
  const b = buildingOf(h);
  if (b && b.yard) return (EXT[yardOf(h)] || {}).job || null;
  return b && b.job || null;
}
// bœufs d'un poteau d'attache ou d'un comptoir de bétail à moins de 200 m : charrois plus rapides
const hasOxen = h => S.houses.some(o => (o.kind === 'poteau' || o.kind === 'comptoir_betail') && segLen([o.x, o.y], [h.x, h.y]) <= 200);
const invTotal = h => Object.values(h.inv || {}).reduce((s, n) => s + n, 0);
// lieux de travail : quatre coins de terre à 30 m autour du bâtiment, sur le terrain
// (+ le parc d'un comptoir de bétail pour les moutons)
function jobSites(h, job) {
  const pts = [0, 1, 2, 3].map(k => [h.x + Math.cos(k * Math.PI / 2 + .6) * 30, h.y + Math.sin(k * Math.PI / 2 + .6) * 30])
    .filter(inTerrain).map(c => ({ c, area:900 }));
  if (job.on === 'paturage') S.houses.filter(o => o.kind === 'comptoir_betail').forEach(o => pts.push({ c:[o.x, o.y], area:o.w * o.l }));
  return pts.filter(s => segLen(s.c, [h.x, h.y]) <= job.reach).sort((a, b) => segLen(a.c, [h.x, h.y]) - segLen(b.c, [h.x, h.y]));
}
const byDist = h => (a, b) => segLen([a.x, a.y], [h.x, h.y]) - segLen([b.x, b.y], [h.x, h.y]);
const jobSources = (h, job) => S.houses.filter(o => o !== h && [].concat(job.from).includes(producerId(o)) && segLen([o.x, o.y], [h.x, h.y]) <= job.reach).sort(byDist(h));
// ce qu'un collecteur peut prendre chez un producteur (en laissant un peu de matière première)
function collectable(o, accepts) {
  const p = productOf(o);
  if (!p || !accepts.includes(p)) return null;
  const keep = RAW.includes(p) ? RAW_KEEP : 0;
  return (o.stock || 0) > keep ? p : null;
}
function jobLabel(b, w, job = b && b.job) {
  if (!job) return '';
  const st = w ? w.state : 'idle';
  if (job.type === 'passive') return (w && w.full) ? `stock plein (${job.cap})` : `produit : ${job.product}${job.note ? ' (' + job.note + ')' : ''}`;
  if (job.type === 'site') {
    const where = job.on === 'champ' ? 'les champs' : 'les pâturages';
    return { idle:'se prépare', go:`va sur ${where}`, work:job.on === 'champ' ? 'travaille le champ' : 'tond les moutons',
      back:`rapporte ${job.product === 'grain' ? 'le grain' : 'la laine'}`, drop:'range', wait:`aucun ${job.on === 'champ' ? 'champ' : 'pâturage'} à portée (${job.reach} m)` }[st] || '';
  }
  if (job.type === 'fetch') {
    const mat = job.mat || (job.from === 'ferme' ? 'grain' : 'farine');
    return { idle:'se prépare', go:`va chercher : ${mat}`, take:'charge', back:`rapporte : ${mat}`, drop:'range',
      work:`fabrique : ${job.product}`, wait:`attend : ${mat} (source à moins de ${job.reach} m)` }[st] || '';
  }
  if (job.type === 'collect') return { idle:'se prépare', go:'va ramasser des produits', take:'charge', back:'rapporte au stock', drop:'range',
    wait:w && w.full ? `plein (${job.cap})` : 'rien à ramasser à portée' }[st] || '';
  if (job.type === 'sell') return { idle:'se prépare', go:'va chercher des marchandises', take:'charge', back:'rapporte au comptoir', drop:'vend aux marchands',
    wait:'rien à vendre (granges et entrepôts vides)' }[st] || '';
  if (job.type === 'fish') return { idle:'se prépare', go:"part pêcher (lac ou rivière)", install:'installe sa canne et son seau', peche:`pêche (${w && w.panier || 0} / ${typeof PECHE_JOUR === 'number' ? PECHE_JOUR : 5})`, range:'range son matériel', back:'retourne au village', drop:'verse ses poissons au stock', wait:'aucun point d\'eau poissonneux' }[st] || '';
  if (job.type === 'relay') return { idle:'prépare les mulets', go:'mène les mulets aux confins de la région', work:'troc avec les régions voisines (à venir)',
    back:'revient avec les mulets', drop:'dételle' }[st] || '';
  return '';
}
// point de sortie de la région le plus proche : bout de route sur le bord de la carte, sinon le bord
function regionExit(h) {
  const ends = S.roads.flatMap(r => [r.pts[0], r.pts[r.pts.length - 1]]).filter(p => p[0] < 1 || p[0] > TW - 1 || p[1] < 1 || p[1] > TH - 1);
  if (ends.length) return ends.sort((a, b) => segLen(a, [h.x, h.y]) - segLen(b, [h.x, h.y]))[0];
  const c = [[0, h.y], [TW, h.y], [h.x, 0], [h.x, TH]];
  return c.sort((a, b) => segLen(a, [h.x, h.y]) - segLen(b, [h.x, h.y]))[0];
}
// lignes de la fiche d'un bâtiment (ou de son extension) selon son métier
function jobSheet(o, J) {
  const w = workers.get(o.id), rows = [];
  const yard = (buildingOf(o) || {}).yard ? EXT[yardOf(o)] : null;
  if (yard) rows.push(['Extension', yard.name]);
  if (J.type === 'collect') {
    const inv = Object.entries(o.inv || {}).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`).join(', ');
    rows.push(['Stock', `${invTotal(o)} / ${J.cap}`], ['Contenu', inv || 'vide']);
  } else if (J.type === 'sell') {
    rows.push(['Ventes', `${o.sold || 0} Or gagnés`]);
  } else if (J.type === 'fish') {
    rows.push(['Zone de travail', `tous les lacs et rivières du village (${S.lakes.length} étang${S.lakes.length > 1 ? 's' : ''}, ${S.rivers.length} cours d'eau)`], ['Poissons pêchés', `${typeof PECHE_JOUR === 'number' ? PECHE_JOUR : 5} par sortie, versés au stock à son retour`]);
  } else if (J.type !== 'relay') {
    rows.push(['Stock', `${o.stock || 0} ${J.product}${J.cap ? ` (${J.cap} au plus)` : ''}`]);
  }
  if (J.type === 'site') {
    const l = jobSites(o, J);
    rows.push(['Terres', J.on === 'champ' ? 'autour de la ferme' : `autour de la bergerie${l.length > 4 ? ' + parc à bétail' : ''}`]);
  } else if (J.type === 'fetch') {
    const l = jobSources(o, J), src = l.find(x => (x.stock || 0) > 0) || l[0];
    rows.push(['Matière', J.mat], ['Source', src ? `${src.type} à ${fmt(segLen([src.x, src.y], [o.x, o.y]), 0)} m · stock ${src.stock || 0}` : `aucune à ${J.reach} m`]);
  }
  if (hasOxen(o) && J.type !== 'passive') rows.push(['Bœufs', 'trajets 50 % plus rapides']);
  rows.push([J.type === 'passive' ? 'Production' : 'Ouvrier', jobLabel(null, w, J)]);
  return rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
}
function stepJob(h, job, dt) {
  let w = workers.get(h.id);
  if (!w || w.jobType !== job.type || w.jobProduct !== job.product) {
    w = { x:h.x, y:h.y, state:'idle', i:0, job:true, jobType:job.type, jobProduct:job.product, passive:job.type === 'passive' };
    workers.set(h.id, w);
  }
  if (job.type === 'fish') return typeof stepPecheur === 'function' ? stepPecheur(h, job, w, dt) : false;   // le pêcheur : poissons.js
  const before = w.state;
  const speed = WALK * (hasOxen(h) ? 1.5 : 1);
  const walkTo = (tx, ty) => marcher(w, tx, ty, speed, dt);
  if (job.type === 'passive') {                             // pas de déplacement : un minuteur
    w.full = (h.stock || 0) >= job.cap;
    if (!w.full && (w.t = (w.t === undefined ? job.every : w.t) - dt) <= 0) { h.stock = (h.stock || 0) + 1; w.t = job.every; save(); }
    return false;                                           // rien à animer
  }
  switch (w.state) {
    case 'idle': case 'wait': {
      if ((w.t = (w.t || 0) - dt) > 0) break;               // en attente : on revérifie chaque seconde
      const waitOne = () => { w.state = 'wait'; w.t = 1; };
      if (job.type === 'site') {
        const sites = jobSites(h, job);
        if (!sites.length) { waitOne(); break; }
        w.dest = sites[w.i++ % sites.length].c; w.state = 'go';
      } else if (job.type === 'fetch') {
        const src = jobSources(h, job).find(o => (o.stock || 0) >= 1);
        if (!src) { waitOne(); break; }
        src.stock -= 1; w.load = job.mat || 'grain'; w.dest = [src.x, src.y]; w.state = 'go';
      } else if (job.type === 'collect') {
        w.full = invTotal(h) >= job.cap;
        const src = w.full ? null : S.houses.filter(o => o !== h && segLen([o.x, o.y], [h.x, h.y]) <= job.reach && collectable(o, job.accepts)).sort(byDist(h))[0];
        if (!src) { waitOne(); break; }
        w.load = collectable(src, job.accepts); src.stock -= 1; w.dest = [src.x, src.y]; w.state = 'go';
      } else if (job.type === 'sell') {
        const store = S.houses.filter(o => (o.kind === 'grange' || o.kind === 'entrepot') && invTotal(o) > 0 && segLen([o.x, o.y], [h.x, h.y]) <= job.reach).sort(byDist(h))[0];
        if (!store) { waitOne(); break; }
        // la marchandise qui se vend le plus cher
        const p = Object.keys(store.inv).filter(k => store.inv[k] > 0).sort((a, b) => (VALUE[b] || 1) - (VALUE[a] || 1))[0];
        store.inv[p] -= 1; w.load = p; w.dest = [store.x, store.y]; w.state = 'go';
      } else if (job.type === 'relay') {
        w.dest = regionExit(h); w.state = 'go';
      }
      break;
    }
    case 'go':
      if (!walkTo(...w.dest)) break;
      if (job.type === 'site') { w.state = 'work'; w.t = job.work; }
      else if (job.type === 'relay') { w.state = 'work'; w.t = 4; }
      else { w.state = 'take'; w.t = .8; }
      break;
    case 'take':
      if ((w.t -= dt) <= 0) { w.carry = CARRY[w.load] || 'stall-b'; w.state = 'back'; }
      break;
    case 'work':
      if ((w.t -= dt) > 0) break;
      if (job.type === 'site') { w.carry = CARRY[job.product] || 'stall-b'; w.state = 'back'; }
      else if (job.type === 'relay') { w.state = 'back'; }
      else { h.stock = (h.stock || 0) + 1; save(); w.state = 'idle'; w.t = 0; } // fabrication terminée
      break;
    case 'back':
      if (walkTo(h.x, h.y)) { w.state = 'drop'; w.t = DROP_TIME; }
      break;
    case 'drop':
      if ((w.t -= dt) > 0) break;
      w.carry = null;
      if (job.type === 'site') { h.stock = (h.stock || 0) + 1; save(); w.state = 'idle'; w.t = 0; }
      else if (job.type === 'fetch') { w.state = 'work'; w.t = job.work; }   // la matière arrive : on la transforme
      else if (job.type === 'collect') { h.inv = h.inv || {}; h.inv[w.load] = (h.inv[w.load] || 0) + 1; save(); w.state = 'idle'; w.t = 0; }
      else if (job.type === 'sell') { S.gold += VALUE[w.load] || 1; h.sold = (h.sold || 0) + (VALUE[w.load] || 1); save(); w.state = 'idle'; w.t = 0; }
      else { w.state = 'idle'; w.t = 3; }
      break;
  }
  if (w.state !== before && isOn('house', h.id, sel) && !zoneEdit) renderSel();
  return true;
}
function drawWorkers() {
  const s = view.s, now = performance.now() / 1000;
  // jeunes plants des forestiers : petits ronds vert clair qui grossissent en poussant
  if (S.planted && S.planted.length && s > .5) for (const p of S.planted) {
    const g = Math.min(1, ((S.simTime || 0) - p.b) / GROW), [X, Y] = toS(p.x, p.y);
    ctx.beginPath(); ctx.arc(X, Y, Math.max(1.2, (.5 + 1.3 * g) * s), 0, Math.PI * 2);
    ctx.fillStyle = Col.bush; ctx.fill(); ctx.strokeStyle = Col['tree-dark']; ctx.lineWidth = .8; ctx.stroke();
  }
  for (const [id, w] of workers) {
    if (w.passive || w.dedans) continue; // production sans déplacement ; ou habitant rentré dans son logement
    const [X, Y] = toS(w.x, w.y), r = Math.max(3.5, .9 * s);
    persos.push([w.x, w.y]); ctx.globalAlpha = voileBois(w.x, w.y);     // sous les arbres (voir canopeeSur)
    if (w.state === 'cut') { // coups de hache : anneau qui pulse
      ctx.beginPath(); ctx.arc(X, Y, r * (1.8 + .6 * Math.sin(now * 12)), 0, Math.PI * 2);
      ctx.strokeStyle = Col.accent; ctx.lineWidth = 1.5; ctx.stroke();
    }
    const hs = typeof VILLAGEOIS !== 'undefined' && findById('house', id), vk = hs && villageoisDe(hs.kind), V = vk && VILLAGEOIS[vk], Ls = V ? Math.max(V.T * s * 2.2, 8) : 0;       // (un peu plus grands que nature : à 8 px par mètre, un homme ne ferait que 4 px)
    if (V && s > .5) {                                                                              // villageois du métier du bâtiment, tourné dans le sens de la marche
      if (w.px !== undefined && Math.hypot(w.x - w.px, w.y - w.py) > .02) w.ang = Math.atan2(w.y - w.py, w.x - w.px);
      w.px = w.x; w.py = w.y;
      const pose = vk === 'pecheur' && (w.state === 'install' || w.state === 'peche' || w.state === 'range'), V0 = VILLAGEOIS.pecheur.outil;
      if (pose) VILLAGEOIS.pecheur.outil = { f:'canne', c:'#8a6238' };                                  // canne déployée au bord de l'eau
      peintVillageois(vk, X, Y, Ls, w.ang || 0);
      if (pose) { VILLAGEOIS.pecheur.outil = V0;
        const bx = X + Math.cos((w.ang || 0) + 1.9) * Ls * .8, by = Y + Math.sin((w.ang || 0) + 1.9) * Ls * .8, br = Math.max(2.2, s * .45);      // seau posé à côté de lui
        ctx.beginPath(); ctx.ellipse(bx, by, br, br, 0, 0, Math.PI * 2); ctx.fillStyle = '#8a6a3a'; ctx.fill(); ctx.strokeStyle = VI_INK; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(bx, by, br * .6, br * .6, 0, 0, Math.PI * 2); ctx.fillStyle = '#3a6a9a'; ctx.fill(); }
    } else { ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2);
      ctx.fillStyle = Col.accent; ctx.fill(); ctx.strokeStyle = Col.sheet; ctx.lineWidth = 1.5; ctx.stroke(); }
    // ce qu'il porte : bûche, gerbe de grain, laine, sac de farine, pains
    ctx.globalAlpha = 1;
    if (w.carry) { ctx.fillStyle = Col[w.carry === true ? 'earth-edge' : w.carry]; ctx.strokeStyle = Col['house-edge']; ctx.lineWidth = .8; ctx.fillRect(X + r * .6, Y - r * 1.6, r * 2.2, r * .9); ctx.strokeRect(X + r * .6, Y - r * 1.6, r * 2.2, r * .9); }
  }
  if (typeof arrivantsDessin === 'function') arrivantsDessin();
  canopeeSur();                                                        // les houppiers repassent par-dessus les personnages
  // stock au-dessus de chaque bâtiment qui produit
  if (s > .9) for (const h of S.houses) {
    const J = jobOf(h), store = J && J.type === 'collect';
    const product = LUMBER[h.kind] ? 'bois' : TAILLEURS[h.kind] ? 'pierre' : J && J.type !== 'relay' && J.type !== 'sell' ? J.product : null;
    if (!product) continue;
    const top = Math.min(...corners(h).map(p => p[1])), [X] = toS(h.x, h.y);
    ctx.font = '600 14px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    haloText(store ? `${invTotal(h)} / ${J.cap}` : `${h.stock || 0} ${product}`, X, top * s + view.oy - 4, Col.ink, Col.sheet);
  }
}
// boucle d'animation : tourne en continu, ne redessine que s'il y a des bûcherons au travail
let lastTs = null;
function simLoop(ts) {
  const dt = lastTs === null ? 0 : Math.min(.1, (ts - lastTs) / 1000);
  lastTs = ts;
  S.simTime = (S.simTime || 0) + dt; // horloge de simulation (croissance des plants)
  const grew = growSaplings();
  const faune = typeof fauneStep === 'function' && fauneStep(dt), nav = typeof bateauxStep === 'function' && bateauxStep(dt), marche = typeof marcheStep === 'function' && marcheStep(dt);
  if (typeof arrivantsStep === 'function') arrivantsStep(dt);
  if (typeof poissonsStep === 'function') poissonsStep(dt);
  if (simTick(dt) || grew || faune || nav || marche) requestDraw();
  requestAnimationFrame(simLoop);
}
function drawWorkZones() {
  const s = view.s;
  const circle = (z, stroke, alpha, dash, width) => {
    const [X, Y] = toS(z.x, z.y);
    ctx.beginPath(); ctx.arc(X, Y, z.r * s, 0, Math.PI * 2);
    ctx.globalAlpha = alpha; ctx.fillStyle = stroke; ctx.fill(); ctx.globalAlpha = 1;
    ctx.setLineDash(dash); ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); ctx.setLineDash([]);
  };
  const link = (h, z, col) => { ctx.setLineDash([3, 4]); ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(...toS(h.x, h.y)); ctx.lineTo(...toS(z.x, z.y)); ctx.stroke(); ctx.setLineDash([]); };
  for (const h of S.houses) {
    if (!h.zone) continue;
    const focus = isOn('house', h.id, sel) || isOn('house', h.id, hover);
    if (!focus && tool !== 'select') continue;               // hors sélection : zones discrètes
    circle(h.zone, Col.accent, focus ? .12 : .04, focus ? [8, 5] : [3, 6], focus ? 2 : 1);
    if (focus) link(h, h.zone, Col.accent);
  }
  const a = zoneAtCursor();
  if (a) {
    const col = a.why ? Col.bad : Col.accent;
    circle(a.z, col, .15, [8, 5], 2); link(a.h, a.z, col);
    const [X, Y] = toS(a.z.x, a.z.y - a.z.r);
    ctx.font = '600 15px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    const info = a.b.need === 'forest' || a.b.id === 'hutte_forestier' ? ` · ${treesInZone(a.z).length} arbres` : a.b.need === 'rock' ? ` · ${rocksInZone(a.z).length} pierres` : '';
    haloText(a.why || `Zone de travail · rayon ${a.z.r} m${info}`, X, Y - 4, a.why ? Col.bad : Col.ink, Col.sheet);
  }
}
