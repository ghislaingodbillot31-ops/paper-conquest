/* ---------- bûcherons : simulation ----------
   Chaque camp de bûcherons / loge de bûcheron dont la zone est définie a un habitant :
   il marche jusqu'à l'arbre de la zone le plus proche du bâtiment, l'abat (l'arbre
   disparaît définitivement), rapporte le bois au bâtiment et le stocke, puis repart,
   jusqu'à ce que la zone soit vide. Temps accéléré pour qu'on voie le travail. */
/* Bûcherons : l'arbre abattu laisse du bois AU SOL (h.sol : tas { x, y, n } à l'endroit où il est tombé) : BOIS_PAR_ARBRE (camp : 2 bois ; loge : le tronc est fendu sur place en 4 bûches).
   L'ouvrier continue d'abattre jusqu'à ce qu'il y ait TAS bois au sol, puis il fait les allers-retours : il ramasse (sa charge : 1 dépôt à la main, 10 avec la charrette, 30 avec le chariot)
   et rapporte au bâtiment, jusqu'à ce que le sol soit vide ; il reprend alors l'abattage (h.haul : transport en cours). */
const BOIS_PAR_ARBRE = { camp_bucherons:4, loge_bucheron:4, hutte_charbonnier:4 }, TAS = 20, FENDRE_TEMPS = 4;
const boisAuSol = h => (h.sol || []).reduce((s, e) => s + e.n, 0);
const LUMBER = { camp_bucherons:"bois d'œuvre", loge_bucheron:'bois de chauffage', hutte_charbonnier:'bois à brûler' };
const TAILLEURS = { tailleur_pierre:'pierre' };   // récolte de pierres (kind:'rock') au lieu d'arbres : elles vont au stock du village
const silexInZone = z => flora.filter(f => f.kind === 'silex' && (f.x - z.x) ** 2 + (f.y - z.y) ** 2 <= z.r * z.r);
const rocksInZone = z => flora.filter(f => f.kind === 'rock' && (f.x - z.x) ** 2 + (f.y - z.y) ** 2 <= z.r * z.r);
const WALK = 8, CUT_TIME = 16, DROP_TIME = .8; // m/s sur route (moitié hors route, deplacements.js) et secondes (accélérés)
const workers = new Map();
/* Un habitant qui commence à travailler dans un bâtiment (pose du bâtiment, nouvelle équipe…) ne surgit pas dedans : il part de sa maison (le logement qui lui est attribué), ou, s'il n'en a pas, du camp de colon où il campe en attendant. */
function departHabitant(k) {
  const id = typeof k === 'string' ? +k.split('#')[0] : k, h = findById('house', id); if (!h) return null;
  let maison = null;
  try { const trav = S.houses.filter(o => o === h || workers.has(o.id)).sort((a, b) => a.id - b.id), n = trav.indexOf(h) + 1, m = logements().maisons.find(([, occ]) => occ.includes(n)); maison = m ? m[0] : null; } catch (e) {}
  const camp = typeof campColon === 'function' ? campColon() : null, o = maison || camp;
  return o ? [o.x, o.y] : null;
}
const workersSetBrut = Map.prototype.set;
workers.set = function (k, w) {
  if (!this.has(k) && w && !w.passive && typeof w.x === 'number' && !w.repris) { const p = departHabitant(k); if (p && (Math.abs(p[0] - w.x) > 1 || Math.abs(p[1] - w.y) > 1)) { w.x = p[0]; w.y = p[1]; w.chemin = null; } }
  return workersSetBrut.call(this, k, w);
};
/* N travailleurs = N ouvriers réels : le premier est workers.get(h.id), les suivants workers.get(h.id + '#' + n). SLOT = l'ouvrier en cours de traitement (simTick). */
let SLOT = 0;
const wkey = h => SLOT ? h.id + '#' + SLOT : h.id;
let floraVersion = 0;
const zoneKeyOf = z => z ? `${z.x},${z.y},${z.r}` : '';
// le gibier d'une zone : les animaux sauvages (pas les prédateurs ni l'élevage) dans le cercle, libres
const gibierZone = z => typeof troupeaux === 'undefined' ? [] : troupeaux.filter(g => g.cat === 'faune').flatMap(g => g.an.filter(a => !(a.captif && !a.captif.chasse) && (a.x - z.x) ** 2 + (a.y - z.y) ** 2 <= z.r * z.r).map(a => ({ g, a })));
const treesInZone = z => flora.filter(f => f.kind === 'tree' && (f.x - z.x) ** 2 + (f.y - z.y) ** 2 <= z.r * z.r);
const WORKER_STATE = { idle:'cherche un arbre', go:'en route vers un arbre', cut:'abat un arbre', back:'rapporte le bois', drop:'range le bois', done:'zone épuisée', goCart:'mène sa charrette dans la zone', versCharrette:'porte le bois à la charrette', prend:'reprend la charrette pleine', fend:'fend le tronc en bûches', goPile:'va ramasser le bois au sol', sansoutil:'sans outil : il en attend un', plein:'stock plein : il attend d’être vidé' };
const STONE_STATE = { idle:'cherche une pierre', go:'en route vers une pierre', cut:'taille une pierre', back:'rapporte la pierre', drop:'range la pierre', done:'plus de pierre dans la zone', sansoutil:'sans outil : il en attend un', plein:'stock plein : il attend d’être vidé' };
/* ---------- forestiers : replantation ----------
   L'habitant d'une hutte de forestier va planter un jeune plant à un endroit libre de sa
   zone (pas d'arbre à moins de 4 m, ni eau, ni route, ni bâtiment), revient, recommence,
   tant que la zone n'est pas assez boisée (1 arbre pour 40 m²). Un plant devient un arbre
   après GROW secondes de simulation (temps accéléré) ; plants et arbres sont enregistrés. */
const GROW = 90, PLANT_TIME = 2, PLANT_DENSITY = 60;
function growSaplings() {
  if (!S.planted || !S.planted.length) return false;
  const j = jourJeu(); let grew = false;
  S.planted = S.planted.filter(s => {
    if (s.j !== undefined ? j - s.j < s.an * 365 : (S.simTime || 0) - s.b < GROW) return true;   // (anciens plants : GROW secondes ; nouveaux : s.an ans de jeu)
    const g = { x:s.x, y:s.y, r:3.2 + Math.random() * 2.2, v:Math.random(), sp:s.sp };
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
/* Hutte de forestier : trois activités (travail demandé, h.act ; fiche « Travail demandé »).
   - Récolter : le forestier cueille des graines d'arbres en forêt (dans sa zone) et les rapporte à la hutte, par espèce (h.graines : { espèce: n }, 200 au plus, FORET.MAX_GRAINES) ;
   - Germiner : les ouvriers restent à la hutte et mettent des graines à germer : GRAINES_PAR_POUSSE graines donnent une pousse après germinationJours(espèce) jours de jeu (1 à 3 semaines) ;
     la germination suit le temps du jeu et se termine même si l'activité change (h.germe : [{ sp, j0, dur }], pousses prêtes : h.pousses) ;
   - Planter : il prend des pousses prêtes (PORTE_POUSSES au plus par trajet) et les plante une à une dans sa zone. Une pousse devient un arbre après croissanceAns(espèce) ans de jeu (3 à 8 ans) :
     S.planted = [{ x, y, sp, j (jour de plantation), an }] puis S.grown. */
const FORET = { PORTE_GRAINES:30, PORTE_POUSSES:10, GRAINES_PAR_POUSSE:3, GRAINES_PAR_ARBRE:5, MAX_GRAINES:200, MAX_POUSSES:40, CUEILLETTE:3, LOTS:4 };
const hashEspece = k => [...String(k)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const germinationJours = sp => 7 + hashEspece(sp) % 15;                                         // 7 à 21 jours : 1 à 3 semaines selon l'espèce
const croissanceAns = sp => 3 + hashEspece(sp + 'c') % 6;                                       // 3 à 8 ans pour devenir un arbre mature
const somme = m => Object.values(m || {}).reduce((q, n) => q + n, 0);
const grainesTotal = h => somme(h.graines), poussesTotal = h => somme(h.pousses);
const poussesPretes = poussesTotal;
function forestierTick(h) {                                                                      // germination : suit le temps du jeu, quelle que soit l'activité
  const j = jourJeu(); let fini = false;
  h.germe = (h.germe || []).filter(b => { if (j - b.j0 < b.dur) return true; (h.pousses = h.pousses || {})[b.sp] = (h.pousses[b.sp] || 0) + 1; fini = true; return false; });
  if (actDe(h) === 'germiner') while ((h.germe || []).length < FORET.LOTS * Math.max(1, nbTrav(h)) && poussesTotal(h) + (h.germe || []).length < FORET.MAX_POUSSES) {   // les ouvriers lancent de nouvelles germinations
    const sp = Object.keys(h.graines || {}).find(k => h.graines[k] >= FORET.GRAINES_PAR_POUSSE); if (!sp) break;
    h.graines[sp] -= FORET.GRAINES_PAR_POUSSE; (h.germe = h.germe || []).push({ sp, j0:j, dur:germinationJours(sp) }); fini = true;
  }
  if (fini) save();
}
function stepForester(h, dt) {
  let w = workers.get(wkey(h));
  if (!w || w.zone !== zoneKeyOf(h.zone)) { w = { x:w ? w.x : h.x, y:w ? w.y : h.y, state:'idle', zone:zoneKeyOf(h.zone), forester:true, graines:{}, pousses:{} }; workers.set(wkey(h), w); }
  w.graines = w.graines || {}; w.pousses = w.pousses || {};
  const before = w.state, planter = actDe(h) === 'planter', walkTo = (tx, ty) => marcher(w, tx, ty, WALK, dt);
  w.carry = somme(w.graines) > 0 || somme(w.pousses) > 0;
  if (w.state === 'idle' || w.state === 'done') {
    if (outilManque(h)) { w.state = 'done'; }                                          // règle : pas d'outil adapté, pas de travail
    else if ((w.t = (w.t || 0) - dt) <= 0) {
      if (!planter) {                                                                  // récolter
        const plein = grainesTotal(h) + somme(w.graines) >= FORET.MAX_GRAINES;
        const arbres = somme(w.graines) >= FORET.PORTE_GRAINES || plein ? [] : treesInZone(h.zone).sort((a, b) => (a.x - h.x) ** 2 + (a.y - h.y) ** 2 - ((b.x - h.x) ** 2 + (b.y - h.y) ** 2)), t = arbres[Math.floor(Math.random() * Math.min(3, arbres.length))];   // un des 3 arbres les plus proches
        if (t) { w.target = t; w.dest = [t.x, t.y]; w.state = 'go'; } else if (somme(w.graines)) w.state = 'back'; else { w.state = 'done'; w.t = 2; }
      } else {                                                                         // planter
        if (!somme(w.pousses)) {                                                       // il charge des pousses prêtes
          let reste = FORET.PORTE_POUSSES;
          for (const k of Object.keys(h.pousses || {})) { const n = Math.min(reste, Math.floor(h.pousses[k])); if (n > 0) { h.pousses[k] -= n; w.pousses[k] = (w.pousses[k] || 0) + n; reste -= n; } }
          if (!somme(w.pousses)) { w.state = 'done'; w.t = 2; }
        }
        if (somme(w.pousses)) { const p = plantSpot(h); if (p) { w.dest = p; w.state = 'go'; } else w.state = 'back'; }
      }
    }
  } else if (w.state === 'go') {
    if (walkTo(...w.dest)) { w.state = 'cut'; w.t = planter ? PLANT_TIME : FORET.CUEILLETTE; }   // « cut » : il cueille ou il creuse
  } else if (w.state === 'cut') {
    if ((w.t -= dt) <= 0) {
      if (planter) {
        const k = Object.keys(w.pousses).find(q => w.pousses[q] > 0);
        if (k) { w.pousses[k]--; (S.planted = S.planted || []).push({ x:w.dest[0], y:w.dest[1], sp:k, j:jourJeu(), an:croissanceAns(k) }); h.stock = (h.stock || 0) + 1; save(); }
        w.state = somme(w.pousses) ? 'idle' : 'back'; w.t = 0;
      } else {
        const sp = (w.target && w.target.sp) || 'arbre'; w.graines[sp] = (w.graines[sp] || 0) + FORET.GRAINES_PAR_ARBRE; w.target = null; w.state = 'idle'; w.t = 0;
      }
    }
  } else if (w.state === 'back') {
    if (walkTo(h.x, h.y)) {                                                              // à la hutte : il dépose ses graines (200 au plus) ; les pousses non plantées y retournent
      h.graines = h.graines || {}; h.pousses = h.pousses || {};
      for (const [k, q] of Object.entries(w.graines)) { const place = Math.max(0, FORET.MAX_GRAINES - grainesTotal(h)); h.graines[k] = (h.graines[k] || 0) + Math.min(q, place); }
      for (const [k, q] of Object.entries(w.pousses)) h.pousses[k] = (h.pousses[k] || 0) + q;
      w.graines = {}; w.pousses = {}; save(); w.state = 'idle'; w.t = .8;
    }
  }
  if (w.state !== before && isOn('house', h.id, sel) && !zoneEdit) renderSel();
}
// état du forestier (fiche) selon son activité
const foresterEtat = (h, w) => { w = w || { state:'idle' }; const p = actDe(h) === 'planter', ou = outilManque(h);
  return ou ? 'sans outil : il lui faut ' + ou : { idle:p ? 'prépare ses pousses' : 'cherche un arbre', go:p ? 'va planter' : 'va cueillir des graines', cut:p ? 'plante une pousse' : 'cueille des graines', back:'revient à la hutte',
    done:p ? 'aucune pousse prête' : 'rien à cueillir' }[w.state] || ''; };
/* Hutte de cueillette : le cueilleur ne travaille que dans sa zone, sur les arbres fruitiers (S.ressources) et les arbustes à baies (flora, kind 'baie').
   Chaque plante a son potentiel S.fruits[clé].pot (0,7 à 1,3, tiré une fois) qui multiplie la récolte de son espèce. Les fruits mûrissent à la saison de l'espèce (mois de récolte
   de cultures.js ; baies : SAISON_BAIES) ; cueillie, la plante tombe à 0 jusqu'à la saison suivante. Il en rapporte au plus ~PORTE à la hutte (h.inv). */
const CUEILLETTE = { PORTE:12, TEMPS:3, SAISON_BAIES:[6, 10] };   // ponytail: une seule saison pour toutes les baies, une saison par espèce si besoin
const dansZone = (p, z) => (p.x - z.x) ** 2 + (p.y - z.y) ** 2 <= z.r * z.r;
const plantesZone = z => [...(S.ressources || []).filter(r => r.cat === 'fruitier' && FRUITIERS[r.key] && dansZone(r, z)), ...(typeof BAIES === 'undefined' ? [] : flora.filter(f => f.kind === 'baie' && BAIES[f.sp] && dansZone(f, z)))];
const produitCueilli = p => p.sp ? 'baies' : (CULTURES[p.key] || {}).produit || 'fruits';
const fruitCle = p => (p.sp ? 'b' : 'f') + p.x + ',' + p.y;
// les fruits ne se voient sur la plante qu'à la saison de son espèce, et tant qu'elle n'a pas été cueillie (dessin : peintArbre, peintBaie)
function fruitsVisibles(p) {
  const c = p.sp ? null : CULTURES[p.key], j = jourJeu();
  if (!moisDans(moisDeJour(j), c ? c.recolte : CUEILLETTE.SAISON_BAIES)) return false;
  const e = (S.fruits || {})[fruitCle(p)];
  return !e || e.an !== Math.floor(j / 365) || e.dispo > 0;
}
function fruitEtat(p) {                                                            // { pot, an, dispo } de la plante p, à jour de la saison
  const F = S.fruits = S.fruits || {}, k = fruitCle(p), c = p.sp ? null : CULTURES[p.key];
  const e = F[k] = F[k] || { pot:round2(.7 + (Math.random() + Math.random()) * .3), an:-1, dispo:0 }, j = jourJeu(), an = Math.floor(j / 365);
  if (!moisDans(moisDeJour(j), c ? c.recolte : CUEILLETTE.SAISON_BAIES)) e.dispo = 0;
  else if (e.an !== an) { e.an = an; e.dispo = Math.max(1, Math.round((c ? c.rendement / 4 : p.sp ? BAIES[p.sp].baie.n / 2 : 8) * e.pot)); }
  return e;
}
/* Infobulle d'une plante : en survolant un arbre fruitier ou un arbuste à baies (outil de sélection) : nom, produit, saison, potentiel, état. */
const planteBulle = document.createElement('div');
planteBulle.style.cssText = 'position:fixed; z-index:50; display:none; pointer-events:none; max-width:260px; padding:8px 10px; border:1px solid #2f2a24; border-radius:4px; background:rgba(255,252,240,.97); color:#2f2a24; font:13px/1.4 "IBM Plex Mono", monospace; box-shadow:0 2px 8px rgba(0,0,0,.25)';
document.body.appendChild(planteBulle);
function plantePointee(c) {
  let best = null, bd = Infinity;
  const test = (p, R) => { const d = Math.hypot(p.x - c[0], p.y - c[1]); if (d < R && d < bd) { bd = d; best = p; } };
  for (const r of S.ressources || []) if (r.cat === 'fruitier' && FRUITIERS[r.key]) test(r, ARBRE_R * (FRUITIERS[r.key].r || 1));
  if (typeof BAIES !== 'undefined') for (const f of flora) if (f.kind === 'baie' && BAIES[f.sp]) test(f, Math.max(f.r, 2));
  return best;
}
function planteTexte(p) {
  const bush = !!p.sp, a = bush ? BAIES[p.sp] : FRUITIERS[p.key], c = bush ? null : CULTURES[p.key], e = fruitEtat(p), saison = c ? c.recolte : CUEILLETTE.SAISON_BAIES;
  const genre = bush ? { arbuste:'Arbuste à baies', rampant:'Plante rampante à baies', liane:'Liane à fruits' }[a.type] : 'Arbre fruitier';
  const origine = bush ? `Terrain : ${a.terrain} · ${a.tm[0]} à ${a.tm[1]} °C` : `Région d'origine : ${a.biomes.join(', ')}`;
  const etat = !moisDans(moisDeJour(jourJeu()), saison) ? `hors saison : prochains fruits en ${MOIS_C[saison[0] - 1]}` : e.dispo > 0 ? `${e.dispo} ${produitCueilli(p)} mûrs à cueillir` : "déjà cueilli : plus rien jusqu'à la saison suivante";
  return `<b>${a.nom}</b><br>${genre}<br>${origine}<br>Produit : ${produitCueilli(p)} · récolte ${plageTexte(saison)}<br>Potentiel : ${Math.round(e.pot * 100)} %<br>${etat}`;
}
function planteTip(e, c) {                                                       // c : position du curseur dans le monde, ou null pour masquer
  const p = c && plantePointee(c);
  if (!p) { planteBulle.style.display = 'none'; return; }
  planteBulle.innerHTML = planteTexte(p); planteBulle.style.display = 'block';
  planteBulle.style.left = Math.max(4, Math.min(e.clientX + 16, innerWidth - 276)) + 'px'; planteBulle.style.top = Math.max(4, Math.min(e.clientY + 16, innerHeight - planteBulle.offsetHeight - 4)) + 'px';
}
/* Travail demandé (h.act) : les bâtiments à plusieurs activités n'en font qu'une à la fois, celle qu'on leur demande (fiche : « Travail demandé ») ; changer d'ordre arrête l'activité en cours. */
const ACTIVITES = { loge_bucheron:[['fendre', 'Abattre et fendre du bois'], ['ramasser', 'Ramasser bâtons et brindilles']], hutte_forestier:[['recolter', 'Récolter des graines'], ['germiner', 'Faire germer'], ['planter', 'Planter']], tailleur_pierre:[['pierre', 'Tailler la pierre'], ['silex', 'Ramasser du silex'], ['fabriquer', 'Fabriquer (file de production)']], hutte_cueillette:[['fruits', 'Cueillir fruits et baies'], ['fibres', 'Récolter des fibres'], ['pousses', 'Produire des pousses']], cabane_peche:[['peche', 'Pêcher'], ['huile', "Produire de l'huile de poisson"]] };
const actDe = h => (ACTIVITES[h.kind] || []).some(a => a[0] === h.act) ? h.act : h.kind === 'hutte_forestier' && h.mode === 'planter' ? 'planter' : (ACTIVITES[h.kind] || [[null]])[0][0];   // (anciennes huttes : h.mode)
const FIBRES_PAR_PLANTE = 3;
/* Pousses de la hutte de cueillette : chaque plante cueillie laisse des graines de son espèce (h.graines : { espèce: n }, 'baie:x' pour un arbuste). On règle le stock de graines à GARDER dans la hutte
   (h.garder, 10 par défaut) et on demande le travail « Produire des pousses » : GRAINES graines au-dessus de la réserve donnent une pousse en TEMPS secondes (h.pousses : { espèce: n }, h.coursPousse).
   Les pousses prêtes restent dans la hutte, en attendant d'être plantées dans les vergers (à venir). */
const POUSSE = { GRAINES:3, TEMPS:45, MAX:40, MAX_GRAINES:90, PAR_FRUIT:.25 };
const nomPlante = k => String(k).startsWith('baie:') ? ((typeof BAIES !== 'undefined' && BAIES[k.slice(5)]) || {}).nom || k : (FRUITIERS[k] || {}).nom || k;
const especeDe = p => p.sp ? 'baie:' + p.sp : p.key;
function pousseCueillette(h, dt) {
  const p = h.prod || {};                                                                       // (actif quand le travail demandé est « Produire des pousses »)
  h.graines = h.graines || {}; h.pousses = h.pousses || {};
  if (!h.coursPousse) {
    const garder = h.garder === undefined ? 10 : h.garder, esp = (p.espece ? [p.espece] : Object.keys(h.graines)).find(k => (h.graines[k] || 0) - garder >= POUSSE.GRAINES);
    if (!esp || Object.values(h.pousses).reduce((q, n) => q + n, 0) >= POUSSE.MAX) return;
    h.graines[esp] -= POUSSE.GRAINES; h.coursPousse = { esp, t:POUSSE.TEMPS };
  } else if ((h.coursPousse.t -= dt) <= 0) { h.pousses[h.coursPousse.esp] = (h.pousses[h.coursPousse.esp] || 0) + 1; h.coursPousse = null; save(); }
}
const chargeCueilleur = w => Object.values(w.charge || {}).reduce((s, q) => s + q, 0);
function stepCueilleur(h, dt) {
  let w = workers.get(wkey(h));
  if (!w || w.zone !== zoneKeyOf(h.zone)) { w = { x:w ? w.x : h.x, y:w ? w.y : h.y, state:'idle', zone:zoneKeyOf(h.zone), charge:{}, graines:{} }; workers.set(wkey(h), w); }
  w.graines = w.graines || {};
  const before = w.state, walkTo = (tx, ty) => marcher(w, tx, ty, WALK, dt);
  w.carry = chargeCueilleur(w) > 0;
  if (w.state === 'idle' || w.state === 'done' || w.state === 'plein') {
    if ((w.t = (w.t || 0) - dt) > 0) return;
    if (!w.carry && stockPlein(h)) { w.state = 'plein'; w.t = 1; return; }
    const fib = actDe(h) === 'fibres', jour = Math.floor(jourJeu()), pris = new Set([...workers.values()].map(o => o.cible)), p = chargeCueilleur(w) >= CUEILLETTE.PORTE ? null
      : plantesZone(h.zone).filter(q => !pris.has(q) && (fib ? fruitEtat(q).jf !== jour : fruitEtat(q).dispo > 0)).sort((a, b) => (a.x - h.x) ** 2 + (a.y - h.y) ** 2 - ((b.x - h.x) ** 2 + (b.y - h.y) ** 2))[0];
    if (p) { w.cible = p; w.dest = [p.x, p.y]; w.state = 'go'; } else if (w.carry) w.state = 'back'; else { w.state = 'done'; w.t = 2; }
  } else if (w.state === 'go') {
    if (walkTo(...w.dest)) { w.state = 'cut'; w.t = CUEILLETTE.TEMPS; }
  } else if (w.state === 'cut') {
    if ((w.t -= dt) <= 0) {                                                        // il vide la plante : 0 jusqu'à la prochaine saison
      const e = fruitEtat(w.cible);
      if (actDe(h) === 'fibres') { w.charge.fibres = (w.charge.fibres || 0) + FIBRES_PAR_PLANTE; e.jf = Math.floor(jourJeu()); }      // fibres : une fois par jour et par plante
      else { const k = produitCueilli(w.cible), g = especeDe(w.cible); w.charge[k] = (w.charge[k] || 0) + e.dispo; w.graines[g] = (w.graines[g] || 0) + Math.max(1, Math.round(e.dispo * POUSSE.PAR_FRUIT)); e.dispo = 0; if (w.cible.sp) invalidateTiles(w.cible.x, w.cible.y, 6); }
      w.cible = null; save(); w.state = 'idle'; w.t = 0;
    }
  } else if (w.state === 'back') {
    if (walkTo(h.x, h.y)) { w.state = 'drop'; w.t = DROP_TIME; }
  } else if (w.state === 'drop') {
    if ((w.t -= dt) <= 0) { h.inv = h.inv || {}; for (const [k, q] of Object.entries(w.charge)) h.inv[k] = (h.inv[k] || 0) + q; w.charge = {};
      h.graines = h.graines || {}; for (const [k, q] of Object.entries(w.graines)) if (Object.values(h.graines).reduce((t, n) => t + n, 0) < POUSSE.MAX_GRAINES) h.graines[k] = (h.graines[k] || 0) + q; w.graines = {};   // les graines restent à la hutte
      w.carry = false; save(); w.state = 'idle'; w.t = 0; }
  }
  if (w.state !== before && isOn('house', h.id, sel) && !zoneEdit) renderSel();
}
const cueilleurEtat = (h, w) => ({ idle:actDe(h) === 'fibres' ? 'cherche des fibres' : 'cherche une plante mûre', go:'va cueillir', cut:'cueille', back:'rapporte la récolte', drop:'range', done:h.zone && plantesZone(h.zone).length ? 'rien de mûr à cette saison' : 'aucune plante fruitière dans la zone', plein:'stock plein' }[(w || { state:'idle' }).state] || '');
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
/* ---------- la journée des villageois (heure du lieu : heureCarte, saisons.js) ----------
   06 h : ils se lèvent, mangent (dans les vivres de leur maison), boivent (au puits), puis travaillent. 12 h : pause déjeuner, ils arrêtent de travailler (ils rentrent à leur lieu de travail). 14 h : reprise.
   18 h : fin du travail. Le marché ouvre deux fois, de 6 h à 7 h et de 17 h 30 à 21 h 30 (entre les deux, les ouvriers des granges et entrepôts gèrent les points de collecte et récoltent les ressources) : les habitants y vont chercher leur nourriture (elle remplit les vivres de leur maison), puis rentrent se reposer ; les ouvriers affectés aux étals des
   granges et entrepôts quittent leur collecte et tiennent les étals pendant l'ouverture, puis reprennent leur activité (le lendemain si c'est la nuit). Jusqu'à 6 h : nuit, repos à la maison (ou à la taverne, un sur trois). */
const HORAIRE = { LEVER:6, TRAVAIL:8, PAUSE:12, REPRISE:14, FIN:18, MARCHE:[[6.5, 8], [18.5, 21.5]], RETOUR:21.5, COUCHER:22 };   // réveil 6 h, marché du matin 6 h 30 – 8 h, début du travail 8 h
const NUIT_ACTIVE = true;
function phaseJour() {                                                          // 'matin' (réveil, marché) | 'travail' | 'pause' | 'soir' (marché, taverne) | 'retour' (vers la maison) | 'nuit' (couchés)
  if (!NUIT_ACTIVE || typeof heureCarte !== 'function') return 'travail';
  const H = heureCarte();
  if (H >= HORAIRE.LEVER && H < HORAIRE.TRAVAIL) return 'matin';
  if (H >= HORAIRE.TRAVAIL && H < HORAIRE.PAUSE) return 'travail';
  if (H >= HORAIRE.PAUSE && H < HORAIRE.REPRISE) return 'pause';
  if (H >= HORAIRE.REPRISE && H < HORAIRE.FIN) return 'travail';
  if (H >= HORAIRE.FIN && H < HORAIRE.RETOUR) return 'soir';
  if (H >= HORAIRE.RETOUR && H < HORAIRE.COUCHER) return 'retour';
  return 'nuit';
}
const estRepos = () => phaseJour() !== 'travail';
const marcheOuvert = () => { if (!NUIT_ACTIVE || typeof heureCarte !== 'function') return true; const H = heureCarte(); return HORAIRE.MARCHE.some(([a, b]) => H >= a && H < b); };   // le marché ouvre deux fois : 6 h 30 – 8 h et 18 h 30 – 21 h 30
/* N° du villageois (1, 2, 3…) qu'est l'ouvrier SLOT du bâtiment h : les bâtiments à ouvriers dans l'ordre de construction, chacun avec ses N travailleurs (et non un seul par bâtiment : sinon les maisons des derniers villageois n'avaient personne pour faire leurs courses). 0 : aucun. */
function numVillageois(h, slot = SLOT) {
  let n = 0;
  for (const o of S.houses.slice().sort((a, b) => a.id - b.id)) { if (!workers.has(o.id)) continue; if (o === h) return n + slot + 1; n += Math.max(1, nbTrav(o)); }
  return 0;
}
// où dort l'habitant du bâtiment h : la taverne (un sur trois), sinon son logement, sinon son lieu de travail
function lieuDeRepos(h) {
  if (phaseJour() === 'pause') return [h.x, h.y];                                          // pause déjeuner : sur place, à son lieu de travail
  const taverne = S.houses.find(o => o.kind === 'taverne');
  if (taverne && phaseJour() === 'soir' && (h.id * 7) % 3 === 0) return [taverne.x, taverne.y];       // le soir (avant 21 h 30) : un sur trois à la taverne ; ensuite tout le monde rentre
  if (typeof logements === 'function') {
    const n = numVillageois(h), L = logements();
    const maison = L.maisons.find(([, occ]) => occ.includes(n));
    if (maison) return [maison[0].x, maison[0].y];
    const camp = campColon(); if (camp && L.camp.includes(n)) return [camp.x, camp.y];
  }
  return [h.x, h.y];
}
// vrai tant que l'habitant du bâtiment h se repose ou rentre se reposer (le travail du jour est alors suspendu)
function reposNuit(h, dt) {
  const w = workers.get(wkey(h)); if (!w || w.passive) return false;
  if (!estRepos()) {
    if (w.nuit) {                                                                              // le matin (ou après la pause) : il ressort et reprend sa journée
      w.nuit = null; w.dedans = false; w.chemin = null; w.state = 'idle'; w.t = 0; w.carry = false; w.target = null; w.panier = 0;
      if (w.dormi) { w.sati = Math.min(w.sati === undefined ? 90 : w.sati, BESOIN.SEUIL - 1); w.soif = Math.min(w.soif === undefined ? 90 : w.soif, BESOIN.SEUIL - 1); w.soiree = false; w.dormi = false; }   // 6 h : il mange et boit avant de travailler
    }
    return false;
  }
  const ph = phaseJour();
  if (!w.nuit) { w.nuit = 'go'; w.carry = false; w.target = null; w.chemin = null; w.repos = lieuDeRepos(h); w.reposPhase = ph; w.dormi = ph !== 'pause'; w.bes = null; }
  else if (w.reposPhase !== ph) {                                                              // la phase change (ex. 21 h 30 : retour de la taverne à la maison)
    w.reposPhase = ph; const r = lieuDeRepos(h);
    if (r[0] !== w.repos[0] || r[1] !== w.repos[1]) { w.repos = r; w.chemin = null; if (w.nuit === 'dedans') { w.nuit = 'go'; w.dedans = false; } }
    if (ph !== 'pause' && w.nuit === 'go') w.dormi = true;
  }
  if (w.nuit === 'go' && ph === 'nuit') { w.x = w.repos[0]; w.y = w.repos[1]; w.nuit = 'dedans'; w.dedans = true; w.chemin = null; return false; }   // 22 h : couchés, plus personne dehors
  if (w.nuit === 'go' && marcher(w, w.repos[0], w.repos[1], WALK, dt)) { w.nuit = 'dedans'; w.dedans = true; }
  return w.nuit === 'go';                                                // (vrai : il marche encore, il faut redessiner)
}
/* ---------- faim et soif ----------
   Chaque villageois au travail (un ouvrier = un villageois) a sa satiété (w.sati) et sa soif (w.soif) : 100 = comblé, elles baissent avec le temps. Sous BESOIN.SEUIL, entre deux tâches (jamais au milieu d'un trajet) :
   - soif : il va au puits le plus proche, boit, puis reprend son activité ;
   - faim : s'il y a de la nourriture dans le stockage de sa maison (h.vivres, capacité = habitants × VIVRES_PAR_HAB), il rentre manger ; sinon il va à un étal de nourriture (étal du marché tenu par un villageois, vendant un
     aliment encore en stock), mange, et rapporte de quoi remplir sa maison (6 unités au plus par visite).
   Tous les aliments sont mangeables par tous ; chacun a sa valeur de satiété (SATIETE) : le plus rassasiant est mangé d'abord, en quantité juste suffisante pour combler la faim. */
const BESOIN = { FAIM:.1333, SOIF:.1333,   /* (par seconde réelle : 40 points en 4 h de jeu — de 100 % au réveil à ~60 % à midi, puis ~60 % de nouveau à 18 h ; pas de baisse pendant la nuit) */ SEUIL:35, MANGE_T:4, BOIT_T:3, VIVRES_PAR_HAB:10 };
const SATIETE = { 'fromage frais':20, 'fromage à pâte molle':25, 'fromage de garde':32, baies:6, pommes:12, 'légumes':14, 'œufs':14, lait:12, poisson:22, pain:30, viande:260 };   // (satiété par unité ; la viande se compte au KILO : 260 par kg, soit 250 g pour combler 65 points de faim)
const qteArr = x => Math.round(x * 100) / 100;                                                // (les kilos se comptent au centième : 10 g)
const enKg = a => typeof uniteDe === 'function' && uniteDe(a) === 'kg';
const seuilVivre = .1;                                                                         // (quantité minimale utile : 100 g)
const satiete = a => SATIETE[a] !== undefined ? SATIETE[a] : 10;
/* STOCK DES MAISONS : un maximum PAR ALIMENT et PAR HABITANT (VIVRES_MAX_HAB, dans l'unité de l'aliment : kg, litres ou pièces). Exemple : un foyer de 2 habitants garde au plus 2 kg de viande, 20 œufs, 2 L de lait et 4 pains. */
const VIVRES_MAX_HAB = { viande:1, 'œufs':10, lait:1, pain:2, poisson:2, 'légumes':3, pommes:3, baies:2, 'fromage frais':1, 'fromage à pâte molle':1, 'fromage de garde':1 };
const habitantsDe = h => typeof occupation === 'function' ? occupation(h) : 0;
const capAliment = (h, a) => habitantsDe(h) * (VIVRES_MAX_HAB[a] === undefined ? 2 : VIVRES_MAX_HAB[a]);
/* Une PORTION = un repas (65 points de satiété). Un foyer n'a plus qu'une portion par habitant (ou moins) : ses habitants refont les courses à la prochaine ouverture du marché. */
const PORTION = 65;
const portionsDe = f => Object.entries(f.vivres || {}).reduce((q, [a, n]) => q + n * satiete(a) / PORTION, 0);
const vivresFaibles = f => portionsDe(f) <= habitantsDe(f) + .01;
const placeAliment = (h, a) => Math.max(0, qteArr(capAliment(h, a) - ((h.vivres || {})[a] || 0)));
const capVivres = h => FOOD_LIST.reduce((q, a) => q + capAliment(h, a), 0);                    // (somme des maximums : pour l'affichage)
const vivresTotal = h => Object.values(h.vivres || {}).reduce((q, n) => q + n, 0);
function foyerDe(h) {                                                                      // la maison où loge le villageois de ce bâtiment (voir lieuDeRepos)
  if (typeof logements !== 'function') return null;
  const n = numVillageois(h), m = logements().maisons.find(([, occ]) => occ.includes(n));
  return m ? m[0] : null;
}
const courseCle = () => Math.floor(jourJeu()) + (heureCarte() < 12 ? 'm' : 's');                // une course par ouverture du marché (matin / soir) et par jour de jeu
function etalsNourriture(h) {                                                               // tous les étals tenus (aliment encore en stock), du plus proche au plus lointain : [{ o:bâtiment, r:aliment, d }]
  const L = [];
  for (const e of etalsMarche()) { const o = S.houses.find(x => x.id === e.src); if (o && etalTenu(e) && stockVendable(o, e.r) >= seuilVivre) L.push({ o, r:e.r, d:segLen([o.x, o.y], [h.x, h.y]) }); }
  return L.sort((a, b) => a.d - b.d);
}
const etalNourriture = h => etalsNourriture(h)[0] || null;
// aux heures du marché, les habitants remplissent la maison de nourriture (tous les aliments des étals, jusqu'à la capacité de la maison, qui dépend de ses habitants)
function remplirMaison(h) {
  const f = foyerDe(h); if (!f) return;
  for (const e of etalsNourriture(h)) {
    const place = placeAliment(f, e.r); if (place < seuilVivre) continue;
    const dispo = stockVendable(e.o, e.r), ex = Math.min(place, enKg(e.r) ? Math.floor(dispo * 10) / 10 : Math.floor(dispo)); if (ex > 0) { retirerStock(e.o, e.r, ex); (f.vivres = f.vivres || {})[e.r] = qteArr((f.vivres[e.r] || 0) + ex); }
  }
}
/* Surplus des maisons : tout ce qui dépasse le maximum d'un aliment (VIVRES_MAX_HAB × habitants) retourne au camp qui fournit : le camp de chasse le plus proche pour la viande (ou un bâtiment qui produit l'aliment), sinon le camp de colon.
   Vérifié toutes les 10 s (un foyer qui perd des habitants voit aussi son stock diminué) ; une maison sans habitant n'est pas touchée. */
function cibleSurplus(f, a) {
  const d = o => segLen([o.x, o.y], [f.x, f.y]);
  const prod = S.houses.filter(o => o !== f && !(buildingOf(o) || {}).cap && (productOf(o) === a || (a === 'viande' && o.kind === 'camp_chasse') || (a === 'poisson' && o.kind === 'cabane_peche'))).sort((p, q) => d(p) - d(q))[0];
  return prod || (typeof campColon === 'function' && campColon()) || null;
}
function rectifierVivres() {
  let change = false;
  for (const f of S.houses) {
    if (!f.vivres || !(buildingOf(f) || {}).cap || habitantsDe(f) <= 0) continue;
    for (const a of Object.keys(f.vivres)) {
      const max = capAliment(f, a), v = f.vivres[a] || 0; if (v <= max + .004) continue;
      const c = cibleSurplus(f, a); if (!c) continue;
      const q = qteArr(v - max); c.inv = c.inv || {}; c.inv[a] = qteArr((c.inv[a] || 0) + q); f.vivres[a] = qteArr(max); change = true;
      if (typeof jeuLog === 'function') jeuLog('surplus rendu', q + ' ' + a + ' : ' + f.id + ' → ' + c.kind);
    }
  }
  if (change) save();
}
setTimeout(() => { rectifierVivres(); setInterval(rectifierVivres, 10000); }, 8000);
function assouvir(h, w, b) {
  if (b.type === 'eau') { w.soif = 100; return; }
  if (b.type === 'maison') {                                                                // dans les vivres de sa maison : le plus rassasiant d'abord, jusqu'à satiété
    const st = b.f.vivres || {};
    for (const a of Object.keys(st).sort((p, q) => satiete(q) - satiete(p))) {
      if (enKg(a)) { while (w.sati < 100 && st[a] > .004) { const n = Math.min(st[a], Math.max(.05, Math.ceil((100 - w.sati) / satiete(a) * 20) / 20)); st[a] = qteArr(st[a] - n); w.sati = Math.min(100, w.sati + n * satiete(a)); } }   // (au kilo : 200 à 300 g par repas)
      else while (w.sati < 100 && st[a] >= 1) { st[a]--; w.sati = Math.min(100, w.sati + satiete(a)); }
      if (w.sati >= 100) break;
    }
    return;
  }
  const o = b.e.o, a = b.e.r, n = enKg(a) ? Math.min(qteArr(Math.ceil((100 - w.sati) / satiete(a) * 20) / 20), qteArr(stockVendable(o, a))) : Math.min(Math.ceil((100 - w.sati) / satiete(a)), Math.floor(stockVendable(o, a)));   // à l'étal : juste la quantité qui comble la faim (au kilo pour la viande : par pas de 50 g)
  retirerStock(o, a, n); w.sati = Math.min(100, w.sati + n * satiete(a));
  remplirMaison(h);                                                                          // il remplit aussi la maison
}
// vrai quand le villageois w (du bâtiment h) est occupé par un besoin : son travail est alors suspendu
function besoins(h, w, dt, soir = false) {
  if (!w.bes) {
    if (soir) {                                                                              // 18 h : trajet au marché (ouvert) pour la nourriture, puis repos
      if (!marcheOuvert()) return false;                                                 // (le marché n'est pas encore ouvert : il attend)
      const e = etalNourriture(h), m = S.houses.filter(o => o.kind === 'marche').sort(byDist(h))[0];
      const fo = foyerDe(h);
      if (fo && !vivresFaibles(fo) && w.sati >= BESOIN.SEUIL) { w.soiree = true; return false; }          // (la maison est approvisionnée : pas de course)
      if (!(e && m)) { if (!m || heureCarte() >= 20.5 || phaseJour() === 'matin' && heureCarte() >= 7.5) w.soiree = true; return false; }   // (pas encore d'étal tenu : il attend un peu)
      w.bes = { type:'etal', dest:[m.x, m.y], e, etat:'go', soir:true }; w.state = 'bGo'; w.chemin = null; w.dedans = false; w.visible = true; w.nuit = null;   // (visible : il est dessiné sur la place du marché)
    } else {
    if (!['idle', 'wait', 'done', 'plein', 'sansoutil'].includes(w.state)) return false;
    let b = null;
    if (w.soif < BESOIN.SEUIL || (w.repas && w.soif < 98)) {
      const p = S.houses.filter(o => o.kind === 'puits').sort(byDist(h))[0];
      if (h.kind === 'cabane_peche' && typeof eauDe === 'function') {                          // un pêcheur boit à son spot (au bord de l'eau qu'il pêche), pas au puits lointain : il y retourne pêcher aussitôt
        const e = eauDe(h, SLOT), sp = e && spotPeche(h, e);
        if (sp && !sp.inaccessible && (!p || segLen(sp.rive, [h.x, h.y]) < segLen([p.x, p.y], [h.x, h.y]) * 1.5)) b = { type:'eau', dest:sp.rive.slice() };
      }
      if (!b && p) b = { type:'eau', dest:[p.x, p.y] };
    }
    if (!b && (w.sati < BESOIN.SEUIL || (w.repas && w.sati < 98))) {
      const f = foyerDe(h);
      if (f && vivresTotal(f) >= seuilVivre) b = { type:'maison', dest:[f.x, f.y], f };
      else if (marcheOuvert()) { const e = etalNourriture(h), m = S.houses.filter(o => o.kind === 'marche').sort(byDist(h))[0]; if (e && m) b = { type:'etal', dest:[m.x, m.y], e, courses:courseCle() }; }   // (marché ouvert : 6 h – 7 h, 17 h 30 – 21 h 30)
    }
    if (!b && marcheOuvert() && w.courses !== courseCle()) {                                // la course : pendant l'ouverture, s'il ne reste qu'une portion par habitant (vivresFaibles), il va remplir sa maison de nourriture
      const f = foyerDe(h), e = f && vivresFaibles(f) && etalsNourriture(h).find(q => placeAliment(f, q.r) >= seuilVivre), m = S.houses.filter(o => o.kind === 'marche').sort(byDist(h))[0];   // (une course seulement s'il y a un aliment à acheter et de la place pour lui)
      if (f && e && m) b = { type:'etal', dest:[m.x, m.y], e, courses:courseCle() }; else w.courses = courseCle();
    }
    if (!b) return false;
    w.bes = { ...b, etat:'go' }; w.state = 'bGo'; w.chemin = null; w.dedans = false; w.visible = b.type === 'etal';
    }
  }
  const b = w.bes, avant = w.state, marche = (x, y) => marcher(w, x, y, WALK, dt);
  if (b.etat === 'go') { if (marche(...b.dest)) { b.etat = 'prend'; w.state = 'bPrend'; w.t = b.type === 'eau' ? BESOIN.BOIT_T : BESOIN.MANGE_T; } }
  else if (b.etat === 'prend') { if ((w.t -= dt) <= 0) { assouvir(h, w, b); if (b.type === 'etal') w.courses = courseCle(); save(); w.visible = false; if (b.soir) { w.bes = null; w.soiree = true; w.state = 'idle'; w.t = 0; w.chemin = null; } else { b.etat = 'retour'; w.state = 'bBack'; w.chemin = null; } } }
  else if (b.etat === 'retour') { if (marche(h.x, h.y)) { w.bes = null; w.state = 'idle'; w.t = 0; } }
  if (w.state !== avant && isOn('house', h.id, sel) && !zoneEdit) renderSel();
  return true;
}
/* LES TROIS REPAS : au réveil (le matin), à midi (pause) et le soir (fin du travail), chaque villageois BOIT puis MANGE jusqu'à 100 % : la faim et la soif baissent de 40 points en 4 h de jeu (BESOIN), donc il part à 100 % le matin, est à ~60 % à midi, remange et reboit
   (retour à 100 %), est à ~60 % à 18 h, mange et boit de nouveau, puis fait ses courses au marché (stock de la maison). besoins() l'envoie boire (puits, ou son spot pour un pêcheur), manger (vivres de sa maison, sinon un étal tenu) puis revenir à son lieu de repos (à midi : son
   lieu de travail). Sans eau ni nourriture à portée, il abandonne ce repas. Un repas par période et par jour de jeu (w.repasFait). Renvoie vrai tant qu'il est en route. */
function repas(h, w, dt, ph) {
  if (!w || w.passive) return false;
  const cle = Math.floor(jourJeu()) + ph;
  if (w.repasFait === cle) return false;
  if (w.repasCle !== cle) {                                                                  // début du repas
    w.repasCle = cle; w.repasT = 0; w.repas = true;
    if (!w.bes && !['idle', 'wait', 'done', 'plein', 'sansoutil'].includes(w.state)) { w.state = 'idle'; w.carry = false; w.target = null; w.chemin = null; w.t = 0; }
    w.nuit = null; w.dedans = false; w.dormi = false;
  }
  if ((w.repasT += dt) > 240) { w.repasFait = cle; w.repas = false; w.bes = null; return false; }            // (garde-fou : un repas ne dure pas plus de 4 minutes)
  if (besoins(h, w, dt)) return true;
  w.repasFait = cle; w.repas = false; return false;                                          // plus rien à boire ni à manger (ou rien de disponible)
}
/* Réglages du joueur (fenêtre de gestion) : h.actif === false = bâtiment arrêté ; h.nb = travailleurs à l'intérieur (1 par défaut).
   N travailleurs = N ouvriers qui travaillent chacun de leur côté (voir wkey). */
const SORTIES = new Map();   // minuterie de sortie par travailleur (clé wkey)
const SORTIE_DELAI = 3;   // secondes entre deux sorties de la porte (un travailleur par rang, plus un petit décalage selon le bâtiment)
const nbReel = h => h.nb === undefined ? (h.kind === 'camp_bucherons' || h.kind === 'hutte_charbonnier' ? 2 : 1) : h.nb;       // travailleurs réglés (la fonderie en a deux au départ : un fondeur, un porteur)
const nbTrav = h => h.actif === false ? 0 : nbReel(h);
/* Fonderie : des FONDEURS fondent (stepFonte), des PORTEURS (h.port, parmi les travailleurs) vont chercher à pied, à la charrette ou au chariot (h.cartP : 0, 1, 2) les ingrédients des fontes allumées
   (minerais des fosses, charbon de bois…) dans les autres bâtiments et les rapportent à la fonderie (h.mat) ; la fonte ne consomme que ce stock. Les porteurs sont les derniers travailleurs (SLOT >= nbFond). */
const AVEC_PORTEURS = { camp_bucherons:4, hutte_charbonnier:4 };   // (hutte du charbonnier : les « porteurs » sont ses bûcherons, qui coupent le bois à brûler)                                  // bâtiments à porteurs : nombre maximal de porteurs (camp de bûcherons : les bûcherons coupent, le porteur ramasse)
const PORT_MAX = 4, MAT_CAP = 24;
/* Hutte du charbonnier : trois métiers — charbonniers (slots du début : fabriquent le charbon), bûcherons (h.port : coupent les arbres), porteurs (h.pt, 2 au plus, les derniers slots : transportent le bois coupé jusqu'à la hutte).
   Camp de bûcherons : bûcherons (début) et porteur (fin, h.port). nbFond = ceux qui font le travail principal ; horsFonte(h, slot) : le slot est un bûcheron ou un porteur. */
const nbPortHut = h => h.kind === 'hutte_charbonnier' ? Math.max(0, Math.min(2, h.pt || 0, nbTrav(h) - 1)) : 0;
const nbPort = h => AVEC_PORTEURS[h.kind] ? Math.max(0, Math.min(AVEC_PORTEURS[h.kind], h.port === undefined ? 1 : h.port, nbTrav(h) - 1 - nbPortHut(h), h.kind === 'camp_bucherons' ? Math.floor(nbTrav(h) / 2) : 99)) : 0;   // (camp de bûcherons : au plus autant de porteurs que de bûcherons)
const nbFond = h => Math.max(1, nbTrav(h) - nbPort(h) - nbPortHut(h));
const horsFonte = (h, slot) => !!AVEC_PORTEURS[h.kind] && slot >= nbFond(h);
const estPorteur = (h, slot) => !!AVEC_PORTEURS[h.kind] && slot >= nbFond(h) && (h.kind !== 'hutte_charbonnier' || slot < nbFond(h) + nbPort(h));   // (camp : le porteur ; hutte : les bûcherons)
const estPortHut = (h, slot) => h.kind === 'hutte_charbonnier' && slot >= nbFond(h) + nbPort(h);                                                     // (hutte : les porteurs)
const estPorteurBois = (h, slot) => h.kind === 'camp_bucherons' ? estPorteur(h, slot) : estPortHut(h, slot);
const aEnStock = (h, k) => ((h.mat || {})[k] || 0) + ((h.inv || {})[k] || 0);
const manqueFonte = (h, cout) => Object.entries(cout).some(([k, q]) => aEnStock(h, k) < q);
function utiliseFonte(h, k, q) { const m = h.mat = h.mat || {}, x = Math.min(q, m[k] || 0); m[k] = (m[k] || 0) - x; if (q - x > 0) h.inv[k] -= q - x; }
function intrantsFonte(h) {                                                                 // stock minimum de la fonderie : trois fontes d'avance de chaque matière des fontes allumées
  const need = {}, m = {};
  for (const R of recettesDe('fonderie', niveauDe(h, 0))) if (!h.fonte || h.fonte[R.id] !== false) for (const [k, q] of Object.entries(R.cout)) need[k] = Math.max(need[k] || 0, q);
  for (const [k, q] of Object.entries(need)) m[k] = Math.min(MAT_CAP, 3 * q);
  return m;
}
const besoinsFonte = h => Object.entries(intrantsFonte(h)).map(([k, m]) => [k, m - aEnStock(h, k)]).filter(([, d]) => d > 0).sort((a, b) => b[1] - a[1]);   // [[article, manque]], le plus manquant d'abord
function stepPorteur(h, dt) {
  let w = workers.get(wkey(h));
  if (!w || !w.porteur) { w = { x:h.x, y:h.y, state:'idle', porteur:true, job:true, jobType:'porteur' }; workers.set(wkey(h), w); }
  const walkTo = (x, y) => marcher(w, x, y, WALK, dt), before = w.state;
  switch (w.state) {
    case 'idle': case 'wait': {
      if ((w.t = (w.t || 0) - dt) > 0) break;
      let best = null;
      for (const [k, d] of besoinsFonte(h)) {
        const src = sourcesDe(h, k)[0];
        if (src && (!best || d > best.d)) best = { k, d, src };
      }
      if (!best) { w.state = 'wait'; w.t = 1; break; }
      w.load = best.k; w.n = Math.max(1, Math.min(chargeMax(best.k, h.cartP || 0), Math.ceil(best.d), Math.floor(best.src.inv[best.k])));   // (charge d'un habitant selon le poids : catalogue.js)
      best.src.inv[best.k] -= w.n; w.charge = 0; w.dest = [best.src.x, best.src.y]; w.state = 'go'; break;
    }
    case 'go': if (walkTo(...w.dest)) { w.state = 'take'; w.t = .8; } break;
    case 'take': if ((w.t -= dt) <= 0) { w.carry = CARRY[w.load] || 'stall-b'; w.charge = w.n; w.state = 'back'; } break;
    case 'back': if (walkTo(h.x, h.y)) { w.state = 'drop'; w.t = DROP_TIME; } break;
    case 'drop': if ((w.t -= dt) <= 0) { h.mat = h.mat || {}; h.mat[w.load] = (h.mat[w.load] || 0) + w.n; w.n = 0; w.charge = 0; w.carry = null; w.state = 'idle'; w.t = 0; save(); } break;
  }
  if (w.state !== before && isOn('house', h.id, sel) && !zoneEdit) renderSel();
  return true;
}
/* Bûcherons avec une charrette (niveau 1 : à main, 2 : chariot) : le travailleur mène sa charrette dans la zone, la GARE devant le premier arbre, abat les arbres alentour
   et la remplit (le bois de chaque arbre y est chargé), puis reprend la charrette pleine, la ramène au bâtiment et la vide ; il repart avec la charrette vide.
   w.parc : où la charrette est garée ; w.charge / w.lim : bois dans la charrette / sa capacité (10 à main, 30 chariot). Sans charrette : le bois reste au sol (stepBucheron). */
function stepBucheronCharrette(h, w, dt, taken, walkTo) {
  const loge = h.kind === 'loge_bucheron', par = BOIS_PAR_ARBRE[h.kind];
  const prochain = from => treesInZone(h.zone).filter(f => !taken.has(treeKey(f))).sort((a, b) => (a.x - from[0]) ** 2 + (a.y - from[1]) ** 2 - ((b.x - from[0]) ** 2 + (b.y - from[1]) ** 2))[0];
  const apresCoupe = () => {                                                              // le bois de l'arbre abattu va dans la charrette
    const t = w.dest; w.logs = par;
    if (Math.hypot(t[0] - w.parc[0], t[1] - w.parc[1]) < 3) { w.charge += par; w.logs = 0; w.state = 'idle'; } else { w.carry = true; w.state = 'versCharrette'; }
  };
  switch (w.state) {
    case 'idle': case 'done': case 'plein': case 'sansoutil': {
      if (outilManque(h)) { w.state = 'sansoutil'; return; }
      if (!w.parc) {                                                                       // nouveau trajet : il part avec la charrette vide
        if (stockPlein(h)) { w.state = 'plein'; return; }
        w.charge = 0; w.carry = false; w.logs = 0; w.lim = Math.max(par, Math.min(capCharge(h), maxRes(h, articleDe(h)) - (h.stock || 0)));
        const t = prochain([h.x, h.y]);
        if (!t) { w.state = 'done'; return; }
        w.target = t; taken.add(treeKey(t)); w.parc = [t.x, t.y]; w.dest = w.parc; w.state = 'goCart'; return;
      }
      if (w.charge >= w.lim) { w.state = 'prend'; return; }                                // pleine : il reprend la charrette
      const t = prochain(w.parc);
      if (t) { w.target = t; taken.add(treeKey(t)); w.state = 'go'; } else if (w.charge > 0) w.state = 'prend'; else { w.parc = null; w.state = 'done'; }
      return;
    }
    case 'goCart': if (walkTo(w.parc[0], w.parc[1])) { w.dest = [w.target.x, w.target.y]; w.state = 'cut'; w.t = tpsTravail(h, CUT_TIME); } return;   // (la charrette est gare, il coupe)
    case 'go': if (walkTo(w.target.x, w.target.y)) { w.dest = [w.target.x, w.target.y]; w.state = 'cut'; w.t = tpsTravail(h, CUT_TIME); } return;
    case 'cut': if ((w.t -= dt) <= 0) { cutTree(w.target); w.target = null; if (loge) { w.state = 'fend'; w.t = tpsTravail(h, FENDRE_TEMPS); } else apresCoupe(); } return;
    case 'fend': if ((w.t -= dt) <= 0) apresCoupe(); return;
    case 'versCharrette': if (walkTo(w.parc[0], w.parc[1])) { w.charge += w.logs; w.logs = 0; w.carry = false; w.state = 'idle'; } return;
    case 'prend': if (walkTo(w.parc[0], w.parc[1])) { w.carry = true; w.state = 'back'; } return;                  // il reprend la charrette pleine
    case 'back': if (walkTo(h.x, h.y)) { w.state = 'drop'; w.t = DROP_TIME; } return;
    case 'drop': if ((w.t -= dt) <= 0) { h.stock = (h.stock || 0) + (w.charge || 0); w.charge = 0; w.carry = false; w.parc = null; save(); w.state = 'idle'; } return;
  }
}
/* Camp de bûcherons avec porteur : les bûcherons abattent (le bois reste au sol, en tas), le porteur (à pied, avec une charrette ou un chariot) va de tas en tas, charge sur place (la charrette est garée près du bois),
   puis rapporte sa charge au camp. */
function stepBucheronPorteur(h, w, dt, walkTo) {
  const sol = h.sol = h.sol || [], autres = [...workers].filter(([k, q]) => q !== w && q.rolePort === true && (typeof k === 'string' ? +k.split('#')[0] : k) === h.id).map(([, q]) => q);   // (les autres porteurs du bâtiment)
  const tas = (de, r) => sol.filter(e => e.n > 0 && !autres.some(q => q.entree === e) && Math.hypot(e.x - de[0], e.y - de[1]) <= r).sort((a, b) => Math.hypot(a.x - de[0], a.y - de[1]) - Math.hypot(b.x - de[0], b.y - de[1]))[0];
  switch (w.state) {
    case 'goCart': if (w.cartMode) { if (walkTo(w.parc[0], w.parc[1])) { w.state = 'load'; w.t = 0; } return; } if (!sol.includes(w.entree)) { w.state = w.charge > 0 ? 'back' : 'idle'; w.carry = w.charge > 0; return; } if (walkTo(w.parc[0], w.parc[1])) { w.state = 'load'; w.t = 1.2; } return;
    case 'load': if (w.cartMode) {                                                              // garé au bord de la route : les bûcherons viennent le charger
      w.t += dt; const arbres = treesInZone(h.zone).length;
      const tp = w.charge < w.lim && tas(w.parc, 25); if (tp) { const n = Math.min(tp.n, w.lim - w.charge); tp.n -= n; w.charge += n; w.t = 0; if (tp.n <= 0) sol.splice(sol.indexOf(tp), 1); save(); }     // (les tas au sol, près du chariot garé, sont chargés)
      if (w.charge >= w.lim || (w.charge > 0 && (!arbres || w.t > 120))) { w.carry = true; w.state = 'back'; }          // plein (ou plus rien à couper) : il repart
      else if (!w.charge && !arbres) { w.state = 'idle'; w.parc = null; w.t = 0; }
      return;
    }
    if ((w.t -= dt) > 0) return; {
      const e = w.entree, n = Math.min(e.n, w.lim - w.charge); e.n -= n; w.charge += n; if (e.n <= 0 && sol.includes(e)) sol.splice(sol.indexOf(e), 1); save();
      const suite = w.charge < w.lim && tas(w.parc, 25);
      if (suite) { w.entree = suite; w.parc = [suite.x, suite.y]; w.state = 'goCart'; } else { w.carry = true; w.state = 'back'; }
    } return;
    case 'back': if (walkTo(h.x, h.y)) { w.state = 'drop'; w.t = DROP_TIME; } return;
    case 'drop': if ((w.t -= dt) <= 0) { h.stock = (h.stock || 0) + (w.charge || 0); w.charge = 0; w.carry = false; w.parc = null; save(); w.state = 'idle'; w.t = 0; } return;
    default: {                                                                                // idle, attente, plein, ancien état d'un bûcheron
      if (w.state !== 'idle' && w.state !== 'wait' && w.state !== 'plein') { w.state = 'idle'; w.t = 0; w.carry = false; w.charge = 0; w.parc = null; }
      if ((w.t = (w.t || 0) - dt) > 0) return;
      if (boisPlein(h)) { w.state = 'plein'; w.t = 1; return; }
      if (niveau(h) >= 1) {                                                                   // charrette ou chariot : il ne roule pas dans la terre, il se gare sur le bord de la route le plus proche du bois
        const arbres = treesInZone(h.zone).sort((a, b) => (a.x - h.x) ** 2 + (a.y - h.y) ** 2 - ((b.x - h.x) ** 2 + (b.y - h.y) ** 2)), libres = arbres.filter(f => !autres.some(q => q.parc && Math.hypot(q.parc[0] - f.x, q.parc[1] - f.y) < 25));   // (chaque porteur se gare à son propre endroit)
        const t = libres[0] || arbres[0] || tas([h.x, h.y], 1e9);   // (plus d'arbre : les tas restés au sol)
        if (!t) { w.state = 'wait'; w.t = 1; return; }
        const R = reseauRoutes(), pr = R.segs.length ? procheRoute(R, [t.x, t.y], true) : null;      // (la charrette se gare le long d'une route, jamais d'un chemin)
        w.parc = pr && pr.d < segLen([h.x, h.y], [t.x, t.y]) ? [pr.q[0], pr.q[1]] : [t.x, t.y]; w.gare = null;
        if (pr && pr.d < segLen([h.x, h.y], [t.x, t.y])) {                                       // le chariot est posé le long de la route, du côté du bois, parallèle à la chaussée
          const A = R.N[pr.a], B = R.N[pr.b], L = segLen(A, B) || 1, ux = (B[0] - A[0]) / L, uy = (B[1] - A[1]) / L, cote = ((t.x - pr.q[0]) * -uy + (t.y - pr.q[1]) * ux) >= 0 ? 1 : -1, dec = ((S.roads[R.roadOf[pr.a]] || {}).w || 8) / 2 + 1;
          w.gare = [pr.q[0] - uy * cote * dec, pr.q[1] + ux * cote * dec]; w.gareAng = Math.atan2(uy, ux);
        }
        w.lim = Math.max(1, Math.min(capCharge(h), boisMax(h) - (h.stock || 0))); w.charge = 0; w.carry = false; w.entree = null; w.cartMode = true; w.state = 'goCart'; return;
      }
      w.cartMode = false;
      const e = tas([h.x, h.y], 1e9);
      if (!e) { w.state = 'wait'; w.t = 1; return; }
      w.lim = Math.max(1, Math.min(capCharge(h), maxRes(h, articleDe(h)) - (h.stock || 0))); w.charge = 0; w.carry = false; w.entree = e; w.parc = [e.x, e.y]; w.state = 'goCart';
    }
  }
}
/* Camp de chasse : chaque chasseur dépend de lui-même. Il fabrique sa lance de chasse au camp (CHASSE.LANCE : silex + branche — du bois — pris dans le stock du village ; elle sert CHASSE.USAGES chasses), puis choisit un animal sauvage
   (faune, pas les prédateurs ni les bêtes trop grosses) DANS LE CERCLE du camp (sa zone), le rejoint, le tue, le porte au camp et le dépèce : selon son poids (POIDS, en kg ; × taille³ pour un jeune) il donne plus ou moins de viande
   comestible, de peaux, d'os, de tendons et de graisse (DEPECAGE), rangés au camp (h.inv). L'animal visé s'immobilise (a.captif.chasse) ; sans chasseur en route, il est libéré (proiesDe). */
const CHASSE = { LANCE:{ silex:2, 'bâtons':1 }, USAGES:5, FAB:10, TUE:4 }, POIDS_MAX = 700;
const POIDS = { cerf:120, chevreuil:25, sanglier:90, elan:350, renne:100, bison:600, boeuf_musque:350, castor:20, zibeline:1.5, renard:6, hermine:.3, lievre:4, bouquetin:80, saiga:40, gazelle:25, antilope:60, zebre:300,
  autruche:100, nandou:25, emeu:40, casoar:40, tapir:200, capybara:50, guanaco:100, kangourou:40, lemurien:3 };
const poidsDe = (key, a) => Math.max(.2, (POIDS[key] || Math.round(30 * ((typeof ANIMAUX !== 'undefined' && ANIMAUX[key] || {}).T || 1) ** 2.5)) * (a.s || 1) ** 3);
/* RENDEMENT DE CHAQUE ANIMAL (pour un animal de taille normale, POIDS) : [viande en KILOS, peaux, os (pièces de 1 kg), tendons, graisse en kg]. Un animal plus ou moins gros (a.s) rapporte proportionnellement à son poids (cube de sa taille).
   Viande ≈ 45 % du poids vif (le reste : peau, os, abats, perte) : un sanglier de 90 kg donne ~45 kg de viande (comptée au kilo : un repas = 200 à 300 g). Pour régler un animal : changer sa ligne. */
const RENDEMENT = {
  cerf:[54, 1, 8, 12, 4], chevreuil:[11, 1, 2, 4, 1], sanglier:[45, 1, 7, 8, 10], elan:[170, 1, 25, 30, 14], renne:[48, 1, 7, 10, 6], bison:[300, 2, 45, 40, 36], boeuf_musque:[160, 1, 25, 28, 20],
  castor:[8, 1, 1, 3, 2], zibeline:[.5, 1, 0, 0, 0], renard:[2, 1, 1, 1, 0], hermine:[.1, 1, 0, 0, 0], lievre:[1.8, 1, 0, 1, 0], bouquetin:[38, 1, 6, 8, 3], saiga:[19, 1, 3, 5, 2], gazelle:[11, 1, 2, 4, 1], antilope:[28, 1, 5, 6, 2],
  zebre:[140, 1, 20, 24, 8], autruche:[45, 1, 5, 6, 5], nandou:[11, 1, 1, 3, 1], emeu:[18, 1, 2, 4, 3], casoar:[17, 1, 2, 4, 2], tapir:[95, 1, 14, 16, 8], capybara:[23, 1, 3, 5, 3], guanaco:[48, 1, 7, 10, 4], kangourou:[19, 1, 2, 5, 1], lemurien:[.5, 1, 0, 0, 0],
};
function DEPECAGE(key, p) {
  const b = RENDEMENT[key] || [p * .45, p >= 5 ? 1 : 0, p * .08, p / 15, p * .05], k = POIDS[key] ? p / POIDS[key] : 1, q = v => Math.max(0, Math.round(v * k * 10) / 10);   // (au dixième de kilo)
  const o = { viande:q(b[0]), peaux:b[1] ? Math.max(1, Math.round(q(b[1]))) : 0, os:Math.round(q(b[2])), tendons:Math.round(q(b[3])), graisse:Math.round(q(b[4])) };
  return o;
}
function proiesDe(h) {
  if (typeof troupeaux === 'undefined') return [];
  const visees = new Set([...workers.values()].map(w => w.proie && w.proie.a).filter(Boolean));
  for (const g of troupeaux) for (const a of g.an) if (a.captif && a.captif.chasse && !visees.has(a)) a.captif = null;           // (chasseur parti : l'animal est libéré)
  return troupeaux.filter(g => g.cat === 'faune').flatMap(g => g.an.filter(a => !a.captif && Math.hypot(a.x - h.zone.x, a.y - h.zone.y) <= h.zone.r && poidsDe(g.key, a) <= POIDS_MAX).map(a => ({ g, a })));
}
function stepChasseur(h, w, dt, walkTo) {
  const before = w.state;
  switch (w.state) {
    case 'idle': case 'wait': case 'done': case 'plein': case 'sansarme': {
      if ((w.t = (w.t || 0) - dt) > 0) break;
      if (stockPlein(h)) { w.state = 'plein'; w.t = 1; break; }
      if (!(w.arme > 0)) {                                                                  // il fabrique sa lance
        if (manqueFonte(h, CHASSE.LANCE)) { w.state = 'sansarme'; w.t = 1; break; }                 // (le silex et le bois sont dans le stock du camp : bouton « Remplir le stock »)
        for (const [k, q] of Object.entries(CHASSE.LANCE)) utiliseFonte(h, k, q);
        w.state = 'fab'; w.t = CHASSE.FAB; break;
      }
      const p = proiesDe(h).sort((u, v) => Math.hypot(u.a.x - h.x, u.a.y - h.y) - Math.hypot(v.a.x - h.x, v.a.y - h.y))[0];
      if (!p) { w.state = 'done'; w.t = 2; break; }
      w.proie = p; p.a.captif = { suit:false, chasse:true }; p.a.v = 0; p.a.d = null; w.state = 'go'; break;
    }
    case 'fab': if ((w.t -= dt) <= 0) { w.arme = CHASSE.USAGES; w.state = 'idle'; w.t = 0; } break;
    case 'go': {
      const p = w.proie; if (!p || !p.g.an.includes(p.a)) { w.proie = null; w.state = 'idle'; w.t = 0; break; }
      if (walkTo(p.a.x, p.a.y)) { w.state = 'tue'; w.t = CHASSE.TUE; } break;
    }
    case 'tue': if ((w.t -= dt) <= 0) {
      const p = w.proie; w.proie = null;
      if (p && p.g.an.includes(p.a)) { p.g.an.splice(p.g.an.indexOf(p.a), 1); w.poids = poidsDe(p.g.key, p.a); w.espece = p.g.key; w.arme--; w.carry = CARRY.viande || 'stall-a'; w.state = 'back'; } else w.state = 'idle';
    } break;
    case 'back': if (walkTo(h.x, h.y)) { w.state = 'depece'; w.t = 3 + w.poids / 40; } break;
    case 'depece': if ((w.t -= dt) <= 0) {
      h.inv = h.inv || {}; for (const [k, q] of Object.entries(DEPECAGE(w.espece, w.poids))) if (q) h.inv[k] = qteArr((h.inv[k] || 0) + q);
      w.carry = null; w.poids = 0; w.state = 'idle'; w.t = 0; save();
    } break;
    default: w.state = 'idle'; w.t = 0;
  }
  if (w.state !== before && isOn('house', h.id, sel) && !zoneEdit) renderSel();
}
/* Remplir le stock : un bâtiment de fabrication (atelier, camp de chasse…) ne travaille qu'avec SES matières (h.mat : stock du bâtiment, aEnStock). Le bouton « Remplir le stock » de sa fiche (h.appro) annule les actions en cours de
   ses ouvriers ; chacun part alors chercher dans les autres bâtiments (à pied ou avec le véhicule de transport) les matières qui manquent au stock minimum (intrantsMin : deux lances par chasseur, les deux premières
   fabrications de la file…), une charge d’habitant (chargeHabitant, selon le poids) à la fois, et les rapporte (courriers : clé « id#a0 »). Fini quand le minimum est atteint, ou que plus rien n'est disponible ailleurs : les ouvriers reprennent leur travail. */
const COLLECTE_PAUSE = true;                                                           // en pause : les granges et entrepôts ne ramassent plus rien, chaque bâtiment garde ses ressources (les ouvriers qui remplissent un stock vont les chercher chez le bâtiment qui les a)
const sourcesDe = (h, k) => S.houses.filter(o => o !== h && dispo(o, k) >= 1).sort((a, b) => (((jobOf(a) || {}).type === 'collect') - ((jobOf(b) || {}).type === 'collect')) || segLen([a.x, a.y], [h.x, h.y]) - segLen([b.x, b.y], [h.x, h.y]));   // les bâtiments qui ont l'article d'abord (les entrepôts seulement en dernier recours), du plus proche au plus lointain
const aBesoinStock = h => h.kind === 'camp_chasse' || h.kind === 'fonderie' || (!!AUTO_SIMPLE[h.kind] && !AUTO_SIMPLE[h.kind].propre) || (!PRODUCTION_AUTO.has(h.kind) && typeof produitsDe === 'function' && produitsDe(h).length > 0);
function intrantsMin(h) {
  const m = {}, add = (c, f = 1) => { for (const [k, q] of Object.entries(c)) m[k] = (m[k] || 0) + q * f; };
  if (h.kind === 'camp_chasse') add(CHASSE.LANCE, 2 * Math.max(1, nbReel(h)));
  else if (h.kind === 'fonderie') Object.assign(m, intrantsFonte(h));
  else if (AUTO_SIMPLE[h.kind] && !AUTO_SIMPLE[h.kind].propre) add(AUTO_SIMPLE[h.kind].cout, 5 * Math.max(1, nbReel(h)));       // (scierie : de quoi scier cinq fois par ouvrier)
  else if (aBesoinStock(h)) for (const id of (h.file || []).slice(0, 2)) { const R = produitDe(h, id); if (R) add(R.cout); }
  for (const [k, q] of Object.entries(RESERVE_ATELIER[h.kind] || {})) m[k] = Math.max(m[k] || 0, q);
  return m;
}
const RESERVE_ATELIER = { menuiserie:{ bois:40, planches:20, corde:8, silex:12, fibres:9, 'bâtons':8 } };   // gros stock de matières de fabrication de l'atelier de menuiserie (le remplissage vise au moins ça)
const deficits = h => Object.entries(intrantsMin(h)).map(([k, q]) => [k, q - aEnStock(h, k)]).filter(([, d]) => d > 0).sort((a, b) => b[1] - a[1]);
const manqueTexteFonte = (h, cout) => { const m = Object.entries(cout).filter(([k, q]) => aEnStock(h, k) < q).map(([k, q]) => Math.ceil(q - aEnStock(h, k)) + ' ' + k); return m.length ? 'Il manque ' + m.join(', ') : null; };
function finRemplissage(h, msg) {
  h.appro = false; for (const k of [...workers.keys()]) if (typeof k === 'string' && k.startsWith(h.id + '#a')) workers.delete(k);
  if (msg && typeof flash === 'function') flash(h.type + ' : ' + msg); save();
}
function lancerRemplissage(h) {                                                          // annule tout : les ouvriers laissent leur travail (ce qu'ils portaient retourne au bâtiment)
  h.appro = true;
  for (const k of [...workers.keys()]) {
    if (typeof k === 'string' && k.includes('#a')) continue;
    if ((typeof k === 'string' ? +k.split('#')[0] : k) !== h.id) continue;
    const w = workers.get(k); if (w.passive) continue;                                   // (la fabrication en cours garde son minuteur : elle est seulement suspendue)
    if (w.n > 0 && w.load) { h.inv = h.inv || {}; h.inv[w.load] = (h.inv[w.load] || 0) + w.n; }
    workers.delete(k);
  }
  save();
}
function poserCharge(h, w) {                                                             // la charge est posée à destination : stock de matières du bâtiment (mat), ou contenu d'un entrepôt (inv)
  const d = w.dst || h, m = w.into === 'inv' ? (d.inv = d.inv || {}) : (d.mat = d.mat || {});
  if (w.n > 0 && w.load) m[w.load] = (m[w.load] || 0) + w.n;
  w.n = 0; w.charge = 0; w.carry = null; w.dst = null; w.into = null;
}
/* PORTEURS DE SITE (h.porteurs, 0 à PORTEURS_MAX par bâtiment qui a besoin de ressources ou en produit) : ils ne travaillent pas, ils transfèrent. Pendant les heures de travail, un porteur
   (1) rapporte au bâtiment les matières qui manquent à son stock minimum (intrantsMin), chez le bâtiment qui les a ; sinon (2) emporte le SURPLUS du bâtiment (au-dessus de son stock permanent) vers le bâtiment qui en
   manque, ou à défaut vers un entrepôt. Une charge d'habitant à la fois (chargeMax : à pied, charrette ou chariot du site, h.cartP). Corps : clé « id#p0 », « id#p1 ». Les ouvriers, eux, fabriquent et récoltent. */
const PORTEURS_MAX = 2;
const portageOK = h => typeof travMax === 'function' && travMax(h) > 0 && !AVEC_PORTEURS[h.kind] && h.kind !== 'fosse_miniere' && (jobOf(h) || {}).type !== 'collect' && (aBesoinStock(h) || estProducteur(h));
const nbPorteurs = h => portageOK(h) ? Math.min(PORTEURS_MAX, Math.max(h.porteurs === undefined ? (h.kind === 'fonderie' ? 1 : 0) : h.porteurs, URGENCES.has(h.id) ? 1 : 0)) : 0;
/* PORTEUR AUTOMATIQUE : un bâtiment à qui il manque de quoi fabriquer (de quoi faire au moins UN outil par ouvrier : une lance par chasseur ; la recette de tête de file d'un atelier) alors qu'un autre bâtiment (le camp de colon…) a ces matières
   reçoit un porteur d'office, même si le joueur n'en a réglé aucun ; il le garde jusqu'à ce que le stock minimum soit rempli. */
const URGENCES = new Set();
function urgentManque(h) {
  if (h.kind === 'camp_chasse') return Object.entries(CHASSE.LANCE).some(([k, q]) => aEnStock(h, k) < q * Math.max(1, nbReel(h)));
  if (AUTO_SIMPLE[h.kind] && !AUTO_SIMPLE[h.kind].propre) return manqueFonte(h, AUTO_SIMPLE[h.kind].cout);
  if (aBesoinStock(h) && h.kind !== 'fonderie') { const R = (h.file || []).length ? produitDe(h, h.file[0]) : null; return !!R && manqueFonte(h, R.cout); }
  return false;
}
function urgencesMaj() {
  for (const h of S.houses) {
    if (!portageOK(h) || h.actif === false || !nbReel(h)) { URGENCES.delete(h.id); continue; }
    const D = deficits(h).filter(([k]) => sourcesDe(h, k).length);
    if (URGENCES.has(h.id)) { if (!D.length) URGENCES.delete(h.id); }
    else if (D.length && urgentManque(h)) URGENCES.add(h.id);
  }
}
function surplusDe(h) {
  const L = [], besoin = Object.keys(intrantsMin(h)), add = (k, q) => { const s = Math.floor(q - gardeDe(h, k)); if (s >= 1 && !besoin.includes(k)) L.push([k, s]); };
  for (const [k, q] of Object.entries(h.inv || {})) add(k, q);
  const p = productOf(h); if (p && (h.stock || 0) > 0) add(p, h.stock);
  return L.sort((a, b) => b[1] - a[1]);
}
function donnerSurplus(h, w) {                                                          // vrai si une mission « emporter le surplus » est lancée
  for (const [k, n] of surplusDe(h)) {
    let d = null, into = 'mat', manque = 1e9;
    for (const o of S.houses.filter(o => o !== h).sort(byDist(h))) { const e = deficits(o).find(([x, q]) => x === k && q >= 1); if (e) { d = o; manque = Math.ceil(e[1]); break; } }
    if (!d) { d = S.houses.filter(o => { const J = jobOf(o) || {}; return J.type === 'collect' && accepte(J, k) && (!J.from || J.from.includes(h.kind)) && invTotal(o) < capCollecte(o, J); }).sort(byDist(h))[0]; into = 'inv'; }
    if (!d) continue;
    const q = Math.max(1, Math.min(chargeMax(k, h.cartP || 0), n, manque, Math.floor(dispo(h, k))));
    prendre(h, k, q); w.load = k; w.n = q; w.dst = d; w.into = into; w.dest = [h.x, h.y]; w.charge = 0; w.rien = false; w.state = 'go'; return true;
  }
  return false;
}
function portageTick(dt) {
  const travail = phaseJour() === 'travail';
  for (const [k, w] of [...workers]) if (typeof k === 'string' && k.includes('#p')) {
    const o = findById('house', +k.split('#')[0]);
    if (!o || !travail || +k.split('#p')[1] >= nbPorteurs(o) || o.actif === false) { if (o && w.n > 0) { poserCharge(o, w); save(); } workers.delete(k); }
  }
  if (!travail) return;
  for (const h of S.houses) {
    const n = h.actif === false ? 0 : nbPorteurs(h); if (!n) continue;
    const bodies = [], enRoute = {};
    for (let i = 0; i < n; i++) { const key = h.id + '#p' + i; let w = workers.get(key); if (!w) { w = { x:h.x, y:h.y, state:'idle', donne:true, job:true, jobType:'porteur' }; workers.set(key, w); } bodies.push(w); if (w.n > 0 && w.dst === h) enRoute[w.load] = (enRoute[w.load] || 0) + w.n; }
    const need = deficits(h).map(([k, d]) => [k, d - (enRoute[k] || 0)]).filter(([, d]) => d > 0);
    for (const w of bodies) stepCourrier(h, w, dt, need);
  }
}
function stepCourrier(h, w, dt, need) {
  const walkTo = (x, y) => marcher(w, x, y, WALK, dt);
  switch (w.state) {
    case 'wait': if ((w.t -= dt) <= 0) w.state = 'idle'; return;
    case 'go': if (walkTo(...w.dest)) { w.state = 'take'; w.t = .8; } return;
    case 'take': if ((w.t -= dt) <= 0) { w.carry = CARRY[w.load] || 'stall-b'; w.charge = w.n; w.state = 'back'; } return;
    case 'back': { const d = w.dst || h; if (walkTo(d.x, d.y)) { w.state = 'drop'; w.t = DROP_TIME; } return; }
    case 'drop': if ((w.t -= dt) <= 0) { poserCharge(h, w); w.state = 'idle'; save(); } return;
    default: {                                                                           // idle : la matière qui manque le plus, à la source la plus proche
      let best = null;
      for (const [k, d] of need) { const src = sourcesDe(h, k)[0]; if (src && (!best || d > best.d)) best = { k, d, src }; }
      if (!best) { if (w.donne && donnerSurplus(h, w)) return; w.rien = true; w.state = 'wait'; w.t = 1; return; }
      w.rien = false; w.load = best.k; w.n = Math.max(1, Math.min(chargeMax(best.k, h.cartP || 0), Math.ceil(best.d), Math.floor(dispo(best.src, best.k))));
      prendre(best.src, best.k, w.n); w.dest = [best.src.x, best.src.y]; w.dst = h; w.into = 'mat'; w.charge = 0; w.state = 'go';
    }
  }
}
function approBatiment(h, dt) {
  const n = Math.max(1, nbTrav(h)), cours = [], enRoute = {};
  for (let i = 0; i < n; i++) { const key = h.id + '#a' + i; let w = workers.get(key); if (!w) { w = { x:h.x, y:h.y, state:'idle', appro:true, job:true, jobType:'courrier' }; workers.set(key, w); } cours.push(w); if (w.n > 0) enRoute[w.load] = (enRoute[w.load] || 0) + w.n; }
  const reel = deficits(h), need = reel.map(([k, d]) => [k, d - (enRoute[k] || 0)]).filter(([, d]) => d > 0);
  if (phaseJour() === 'nuit') { for (const w of cours) w.dedans = true; return; }       // la nuit : tout le monde est couché, le remplissage reprend le matin
  for (const w of cours) { w.dedans = false; stepCourrier(h, w, dt, need); }
  if (cours.every(w => (w.state === 'idle' || w.state === 'wait') && !(w.n > 0))) {
    if (!reel.length) finRemplissage(h, 'stock rempli');
    else if (cours.every(w => w.rien)) finRemplissage(h, 'remplissage impossible, introuvable ailleurs : ' + reel.map(([k]) => k).join(', '));
  }
}
// messages sur les bâtiments (rafraîchis chaque seconde) : outil prévu absent, matières manquantes
const ALERTES = new Map(); let alertesT = 0;
function alertesMaj(dt) {
  if ((alertesT -= dt) > 0) return; alertesT = 1; ALERTES.clear(); urgencesMaj();
  for (const h of S.houses) {
    if (!nbTrav(h) || h.appro || URGENCES.has(h.id)) continue;                              // (porteur automatique en route : pas d'alerte)
    const t = typeof outilManque === 'function' ? outilManque(h) : null; let a = null;
    if (t) a = 'Pas de ' + t + ' prévu : les ouvriers ne travaillent pas';
    else if (h.kind === 'camp_chasse') { if (manqueFonte(h, CHASSE.LANCE) && ![...workers].some(([k, w]) => (typeof k === 'string' ? +k.split('#')[0] : k) === h.id && w.arme > 0)) a = 'Manque pour les lances (' + manqueTexteFonte(h, CHASSE.LANCE).replace('Il manque ', '') + ') : ajoutez un porteur'; }
    else if (aBesoinStock(h)) { const w = workers.get(h.id); if (w && w.etat === 'manque' && w.manque) a = String(w.manque).replace('Il manque', 'Manque') + ' : ajoutez un porteur'; }
    if (a) ALERTES.set(h.id, a);
  }
}
const alerteBat = h => ALERTES.get(h.id) || null;
const boisMax = h => maxRes(h, productOf(h) || 'bois');                 // le maximum de bois du bâtiment (hutte du charbonnier : CAP_RES, le charbon a le sien)
const boisPlein = h => h.kind === 'hutte_charbonnier' ? (h.stock || 0) >= boisMax(h) : stockPlein(h);
/* Loge de bûcheron, travail « Ramasser bâtons et brindilles » : l'ouvrier ne coupe rien. Il va sous les arbres de sa zone (un endroit après l'autre), ramasse RAMASSAGE (par type : 5 bâtons, 20 brindilles à chaque sortie, à régler ici),
   rentre et les range dans la loge (h.inv). Aucun outil. Les bâtons servent aux lances du camp de chasse. */
const RAMASSAGE = { 'bâtons':chargeHabitant('bâtons'), brindilles:chargeHabitant('brindilles') }, RAMASSE_TEMPS = 6;   // (une charge d'habitant : 5 bâtons, 20 brindilles)
function stepRamasseur(h, w, dt, walkTo) {
  switch (w.state) {
    case 'go': if (walkTo(w.dest[0], w.dest[1])) { w.state = 'ramasse'; w.t = tpsTravail(h, RAMASSE_TEMPS); } return;
    case 'ramasse': if ((w.t -= dt) <= 0) { w.carry = true; w.state = 'back'; } return;
    case 'back': if (walkTo(h.x, h.y)) { w.state = 'drop'; w.t = DROP_TIME; } return;
    case 'drop': if ((w.t -= dt) <= 0) { h.inv = h.inv || {}; for (const [k, q] of Object.entries(RAMASSAGE)) h.inv[k] = Math.min(maxRes(h, k), (h.inv[k] || 0) + q); w.carry = false; w.state = 'idle'; w.t = 0; save(); } return;
    default: {
      if (w.state !== 'idle' && w.state !== 'wait' && w.state !== 'plein' && w.state !== 'done') { w.state = 'idle'; w.carry = false; }
      if ((w.t = (w.t || 0) - dt) > 0) return;
      if (Object.keys(RAMASSAGE).every(k => ((h.inv || {})[k] || 0) >= maxRes(h, k))) { w.state = 'plein'; w.t = 1; return; }   // (chaque article a son maximum : on s'arrête quand tous sont pleins)
      const arbres = treesInZone(h.zone).sort((a, b) => (a.x - h.x) ** 2 + (a.y - h.y) ** 2 - ((b.x - h.x) ** 2 + (b.y - h.y) ** 2)).slice(0, 15);
      if (!arbres.length) { w.state = 'done'; w.t = 2; return; }
      const t = arbres[(w.i = (w.i || 0) + 1) % arbres.length]; w.dest = [t.x, t.y]; w.state = 'go';
    }
  }
}
function stepBucheron(h, w, dt, taken, walkTo) {
  const porteur = (h.kind === 'camp_bucherons' && nbPort(h) > 0) || nbPortHut(h) > 0;                                                         // avec un porteur, les bûcherons ne font que couper
  if (niveau(h) >= 1) { stepBucheronCharrette(h, w, dt, taken, walkTo); return; }        // avec une charrette : elle reste devant le bois coupé
  const sol = h.sol = h.sol || [], tot = boisAuSol(h), loge = h.kind === 'loge_bucheron';
  if (w.state === 'idle' || w.state === 'done' || w.state === 'plein' || w.state === 'sansoutil') {
    if (w.carry && !w.lim) { w.charge = w.charge || 1; w.lim = w.charge; }
    if (!w.carry && outilManque(h)) { w.state = 'sansoutil'; return; }                    // règle : pas d'outil adapté, pas de travail
    if (!w.carry) { w.charge = 0; w.lim = Math.max(1, Math.min(capCharge(h), maxRes(h, articleDe(h)) - (h.stock || 0))); }
    if (!porteur && !h.haul && tot >= TAS) h.haul = true;                                              // le tas de 20 est fait : allers-retours
    if (h.haul && !tot) h.haul = false;                                                    // sol vide : on reprend l'abattage
    const chargePleine = w.carry && w.charge >= w.lim;
    if (chargePleine) { w.state = 'back'; return; }
    if (!porteur && (h.haul || (tot > 0 && !treesInZone(h.zone).some(f => !taken.has(treeKey(f)))))) {  // ramasser le bois au sol
      if (boisPlein(h) && !w.carry) { w.state = 'plein'; return; }
      const e = sol.slice().sort((a, b) => (a.x - w.x) ** 2 + (a.y - w.y) ** 2 - ((b.x - w.x) ** 2 + (b.y - w.y) ** 2))[0];
      if (e) { w.entree = e; w.dest = [e.x, e.y]; w.state = 'goPile'; } else w.state = w.carry ? 'back' : 'done';
      return;
    }
    if (!w.carry && (h.stock || 0) + tot >= boisMax(h)) { w.state = 'plein'; return; }     // pas de place pour ce qu'il abattrait
    const t = treesInZone(h.zone).filter(f => !taken.has(treeKey(f))).sort((a, b) => (a.x - h.x) ** 2 + (a.y - h.y) ** 2 - ((b.x - h.x) ** 2 + (b.y - h.y) ** 2))[0];
    if (t) { w.target = t; taken.add(treeKey(t)); w.state = 'go'; } else w.state = w.carry ? 'back' : 'done';
  } else if (w.state === 'go') {
    if (walkTo(w.target.x, w.target.y)) { w.state = 'cut'; w.t = tpsTravail(h, CUT_TIME); }
  } else if (w.state === 'cut') {
    if ((w.t -= dt) <= 0) { const t = w.target; cutTree(t); w.target = null; w.dest = [t.x, t.y]; if (loge) { w.state = 'fend'; w.t = tpsTravail(h, FENDRE_TEMPS); } else {
      const p = porteur ? [...workers].filter(([k, q]) => (typeof k === 'string' ? +k.split('#')[0] : k) === h.id && q.cartMode && q.state === 'load' && q.parc && q.charge < q.lim).sort((a, b) => Math.hypot(a[1].parc[0] - w.x, a[1].parc[1] - w.y) - Math.hypot(b[1].parc[0] - w.x, b[1].parc[1] - w.y))[0] : null;   // (le chariot garé le plus proche, pas encore plein)
      if (p) { w.logs = BOIS_PAR_ARBRE[h.kind]; w.cible = p[1]; w.carry = true; w.state = 'versCharrette'; }                 // le chariot est garé : il y porte le bois
      else { sol.push({ x:t.x, y:t.y, n:BOIS_PAR_ARBRE[h.kind] }); save(); w.state = 'idle'; } } }
  } else if (w.state === 'versCharrette') {
    const c = w.cible;
    if (!c || c.state !== 'load' || !c.parc) { (h.sol = h.sol || []).push({ x:w.x, y:w.y, n:w.logs }); w.logs = 0; w.carry = false; w.state = 'idle'; save(); }   // (le chariot est reparti : le bois reste au sol)
    else if (walkTo(c.parc[0], c.parc[1])) { c.charge += w.logs; c.t = 0; w.logs = 0; w.carry = false; w.state = 'idle'; }   // (le chariot attend jusqu'à 120 s depuis le dernier chargement)
  } else if (w.state === 'fend') {                                                          // loge : il fend le tronc sur place ; les bûches restent au sol
    if ((w.t -= dt) <= 0) { sol.push({ x:w.dest[0], y:w.dest[1], n:BOIS_PAR_ARBRE[h.kind] }); save(); w.state = 'idle'; }
  } else if (w.state === 'goPile') {
    if (!sol.includes(w.entree)) { w.state = 'idle'; return; }                             // (déjà ramassé par un autre)
    if (walkTo(w.dest[0], w.dest[1])) {
      const n = Math.min(w.entree.n, w.lim - w.charge); w.entree.n -= n; w.charge += n; w.carry = true;
      if (w.entree.n <= 0) sol.splice(sol.indexOf(w.entree), 1);
      save(); w.state = 'idle';
    }
  } else if (w.state === 'back') {
    if (walkTo(h.x, h.y)) { w.state = 'drop'; w.t = DROP_TIME; }
  } else if (w.state === 'drop') {
    if ((w.t -= dt) <= 0) { w.carry = false; const n = w.charge || 1; w.charge = 0; h.stock = (h.stock || 0) + n; save(); w.state = 'idle'; }
  }
}
/* Collisions : villageois, charrettes et groupes d'arrivants ne se superposent pas. Après chaque pas de simulation, deux personnages trop proches sont repoussés l'un de l'autre ;
   une charrette garée (w.parc) est un obstacle fixe (sauf pour son propriétaire, qui doit la charger). Rayons en mètres : villageois R_PERSO, avec sa charrette R_CHARRETTE. */
const R_PERSO = 1.5, R_CHARRETTE = 2.3, R_GAREE = 1.4;
const charretteGaree = (w, h) => h && LUMBER[h.kind] && niveau(h) && w.parc && !['goCart', 'back', 'drop', 'idle', 'done', 'plein', 'sansoutil', 'prend'].includes(w.state);
/* Règles (pour ne jamais bloquer un travail) : seul un personnage QUI MARCHE est repoussé ; celui qui travaille sur place (coupe, charge, décharge) ne bouge pas et sert d'obstacle ;
   un personnage proche de sa destination (4 m) n'est pas repoussé, pour qu'il puisse arriver ; près de son propre bâtiment (porte) : aucun repoussement. */
const MARCHE = ['go', 'bGo', 'bBack', 'capGo', 'capBack', 'goCart', 'versCharrette', 'prend', 'back', 'goPile', 'goPlant'];
/* Espace entre les personnages : chacun garde R_PERSO (R_CHARRETTE avec sa charrette) de distance. Un personnage qui marche contourne ceux qu'il croise (poussée latérale douce) ; à l'arrivée
   (4 m de la destination) il est encore un peu repoussé pour ne pas se superposer. Deux personnages à l'arrêt qui se chevauchent s'écartent doucement. Anti-blocage : un personnage qui marche sans avancer
   (moins de 1,2 m en 2,5 s) devient « fantôme » 3 s : il traverse les autres pour se dégager. Jamais poussé dans un bâtiment. */
const COLLISIONS = false;                                              // false : les personnages et leurs charrettes ne se bloquent plus (ils se traversent)
function separerPersonnages(dt = .05) {
  if (!COLLISIONS) return;
  const mob = [], fixes = [];
  const bloque = (w, marche) => {                                                    // vrai : il marche sans avancer depuis 2,5 s
    if (!marche) { w.bloc = 0; w.sx = w.x; w.sy = w.y; return false; }
    if (w.sx === undefined) { w.sx = w.x; w.sy = w.y; w.bloc = 0; }
    if (Math.hypot(w.x - w.sx, w.y - w.sy) > 1.2) { w.sx = w.x; w.sy = w.y; w.bloc = 0; } else w.bloc = (w.bloc || 0) + dt;
    return w.bloc > 2.5;
  };
  for (const [key, w] of workers) {
    if (w.passive || w.dedans || (typeof batimentSous === 'function' && !w.visible && batimentSous([w.x, w.y]))) continue;
    const h = findById('house', typeof key === 'string' ? +key.split('#')[0] : key);
    if (h && charretteGaree(w, h)) fixes.push({ x:w.parc[0] - 1.2, y:w.parc[1] + .8, r:R_GAREE, key });
    if (h && segLen([w.x, w.y], [h.x, h.y]) < Math.max(h.w, h.l) / 2 + 2) continue;   // (sur le pas de sa porte : pas de collision, il doit pouvoir entrer)
    const dest = w.chemin ? [w.chemin.x, w.chemin.y] : null, marche = MARCHE.includes(w.state) || w.nuit === 'go';
    if (w.fantome > 0) w.fantome -= dt; else if (bloque(w, marche)) { w.fantome = 3; w.bloc = 0; }
    mob.push({ o:w, key, marche, fantome:w.fantome > 0, arrive:!!dest && Math.hypot(w.x - dest[0], w.y - dest[1]) < 4,
      r:h && niveau(h) && !charretteGaree(w, h) && (w.carry || w.charge > 0 || ['goCart', 'back', 'prend'].includes(w.state)) ? R_CHARRETTE : R_PERSO });
  }
  if (typeof groupe !== 'undefined' && groupe && !batimentSous([groupe.x, groupe.y])) mob.push({ o:groupe, key:'groupe', marche:true, arrive:false, r:R_CHARRETTE });
  const libre = (a, x, y) => !(typeof batimentSous === 'function' && !a.o.visible && !batimentSous([a.o.x, a.o.y]) && batimentSous([x, y]));   // jamais poussé dans un bâtiment
  const pousse = (a, dx, dy, d, min, part, force) => {
    if (a.fantome || (!a.marche && !force)) return;
    const k = (min - d) * part * (a.arrive ? .35 : 1) / d, x = a.o.x - dx * k, y = a.o.y - dy * k;
    if (libre(a, x, y)) { a.o.x = x; a.o.y = y; }
  };
  for (let i = 0; i < mob.length; i++) {
    for (let j = i + 1; j < mob.length; j++) {
      const a = mob[i], b = mob[j], dx = b.o.x - a.o.x, dy = b.o.y - a.o.y, d = Math.hypot(dx, dy), min = a.r + b.r;
      if (d >= min || a.fantome || b.fantome) continue;
      if (d < .01) { a.o.x += .3; b.o.x -= .3; continue; }                            // (même point : on les sépare)
      if (!a.marche && !b.marche) { if (d < min * .6) { pousse(a, dx, dy, d, min, .08, true); pousse(b, -dx, -dy, d, min, .08, true); } continue; }
      const part = a.marche && b.marche ? .2 : .35;                                   // un seul marche : c'est lui qui contourne
      pousse(a, dx, dy, d, min, part); pousse(b, -dx, -dy, d, min, part);
    }
    for (const f of fixes) {
      const a = mob[i]; if (a.key === f.key) continue;                                // son propriétaire peut s'en approcher
      const dx = f.x - a.o.x, dy = f.y - a.o.y, d = Math.hypot(dx, dy), min = a.r + f.r;
      if (d < min && d > .01) pousse(a, dx, dy, d, min, .35);
    }
  }
}
/* Étals du marché (2 × 6 cases, un étal par case, 12 au plus). Seuls les ALIMENTS (FOOD_LIST : poisson, viande, pain, fromages…) se vendent. Après la fin du travail (HORAIRE.FIN) et jusqu'à la fermeture du marché, un ouvrier d'un
   bâtiment qui a un aliment en stock va au marché et y INSTALLE un étal (une case libre, un aliment différent par ouvrier) : l'étal devient PERMANENT (m.etals : { c:case, src:bâtiment, slot:ouvrier, r:aliment }) et reste, tenu ou non, tant que le
   bâtiment existe (il disparaît avec lui). Les habitants y prennent la nourriture GRATUITEMENT quand son tenant est à sa place (pas de monnaie pour l'instant). Il faut un marché. */
const ETAL_TEMPS = 20;
const marcheDe = () => S.houses.find(o => o.kind === 'marche') || null;
const stockVendable = (o, r) => (productOf(o) === r ? (o.stock || 0) : 0) + ((o.inv || {})[r] || 0);       // (le stock du bâtiment, pas ses matières de fabrication)
function retirerStock(o, r, n) { const i = Math.min(n, (o.inv || {})[r] || 0); if (i) o.inv[r] = qteArr(o.inv[r] - i); if (n - i > 0 && productOf(o) === r) o.stock = Math.max(0, qteArr((o.stock || 0) - (n - i))); }
const alimentsDe = o => FOOD_LIST.filter(r => stockVendable(o, r) >= seuilVivre).sort((a, b) => stockVendable(o, b) - stockVendable(o, a));
const etalsMarche = () => { const m = marcheDe(); return m && m.etals ? m.etals.filter(e => S.houses.some(o => o.id === e.src)) : []; };      // (l'étal d'un bâtiment disparu n'existe plus)
const etalTenu = e => { const w = workers.get(e.slot ? e.src + '#' + e.slot : e.src); return !!(w && w.state === 'etal' && w.surPlace); };
const tenueEtal = () => NUIT_ACTIVE && typeof heureCarte === 'function' && marcheOuvert() && phaseJour() !== 'travail';       // (les étals sont tenus hors des heures de travail : marché du matin 6 h 30 – 8 h, du soir dès la fin du travail)
function etalCible(h, slot) {                                                               // l'étal de cet ouvrier, ou la case libre où il en installera un : { c, e } ou { c, r }
  const m = marcheDe(); if (!m || h.actif === false || h.kind === 'marche') return null;   // (tout bâtiment qui a de la nourriture en stock : chasse, pêche, cueillette, fromagerie, four…)
  const E = m.etals || [], e = E.find(q => q.src === h.id && q.slot === slot); if (e) return { c:e.c, e };
  const r = alimentsDe(h).find(a => !E.some(q => q.src === h.id && q.r === a)); if (!r) return null;
  const pris = new Set(E.map(q => q.c)); for (let c = 0; c < nbCellMarche(m); c++) if (!pris.has(c)) return { c, r };
  return null;
}
function etalsStep(dt) {
  const m = marcheDe(); if (!m || !m.etals) return;
  const n = m.etals.length; m.etals = m.etals.filter(e => S.houses.some(o => o.id === e.src)); if (m.etals.length !== n) save();      // le bâtiment disparaît : son étal aussi
  for (const e of m.etals) {                                                                  // (pas de monnaie pour l'instant : les habitants prennent la nourriture gratuitement, voir etalsNourriture)
    const o = S.houses.find(x => x.id === e.src);
    if (stockVendable(o, e.r) < seuilVivre) { const r2 = alimentsDe(o).find(a => !m.etals.some(q => q !== e && q.src === e.src && q.r === a)); if (r2) e.r = r2; else continue; }      // (aliment épuisé : un autre)
  }
}
// l'ouvrier qui tient (ou va installer) un étal : il marche jusqu'à sa case du marché, derrière l'étal (dessins.js : cellMarche) ; arrivé, il installe l'étal s'il n'existe pas encore
function stepEtal(h, dt, cib) {
  const m = marcheDe(); let w = workers.get(wkey(h));
  if (!w) { w = { x:h.x, y:h.y, state:'idle', i:0, job:true, jobType:(jobOf(h) || {}).type, jobProduct:(jobOf(h) || {}).product, passive:false }; workers.set(wkey(h), w); }
  if (w.state !== 'etal') { w.state = 'etal'; w.surPlace = false; w.carry = null; w.target = null; w.chemin = null; w.dedans = false; w.visible = true;   // (visible : dessiné derrière son étal, dans l'emprise du marché)
    w.nuit = null; w.bes = null;
    if (w.dormi) { w.sati = Math.min(w.sati === undefined ? 90 : w.sati, BESOIN.SEUIL - 1); w.soif = Math.min(w.soif === undefined ? 90 : w.soif, BESOIN.SEUIL - 1); w.soiree = false; w.dormi = false; }
  }
  const [u0, t0, u1] = cellMarche(m, cib.c), q = local(m, (u0 + u1) / 2, (m.front || 1) * (t0 + 7.2 - m.l / 2));
  if (!marcher(w, q[0], q[1], WALK, dt)) { w.surPlace = false; return; }
  w.surPlace = true;
  if (!cib.e) { m.etals = m.etals || []; if (!m.etals.some(x => x.c === cib.c)) { m.etals.push({ c:cib.c, src:h.id, slot:SLOT, r:cib.r }); save(); } }      // installation : l'étal devient permanent
  if (w.courses !== courseCle()) { remplirMaison(h); w.courses = courseCle(); save(); }   // arrivé à l'étal : il remplit aussi sa propre maison
}
// messages de la journée : chaque passage d'heure importante annonce ce qui change (pas de message si l'heure saute de plus d'une heure : réglage de l'heure)
const MESSAGES_JOUR = [[6, 'Nouveau jour : les villageois se réveillent'], [6.5, 'Ouverture du marché du matin'], [8, 'Début du travail · fin du marché du matin'], [12, 'Pause midi'], [14, 'Reprise du travail'], [18.5, 'Ouverture du marché du soir'],
  [18, 'Fin du travail'], [21.5, 'Fin du marché : tout le monde rentre'], [22, 'Il est 22 h : ton village s’endort']];
let heurePrec = null;
function messagesJour() {
  if (typeof heureCarte !== 'function' || typeof flash !== 'function') return;
  const H = heureCarte(), P = heurePrec; heurePrec = H; if (P === null) return;
  const d = ((H - P) % 24 + 24) % 24; if (d === 0 || d > 1) return;
  for (const [t, msg] of MESSAGES_JOUR) if (d > 0 && (P <= H ? t > P && t <= H : t > P || t <= H)) flash(msg);
}
/* PERSISTANCE DES HABITANTS : les habitants (workers) sont enregistrés dans le navigateur toutes les 2 s et à la fermeture de la page, et repris au premier pas de simulation. Une mise à jour du code (rechargement de la page) ne les
   remet donc pas à zéro : chacun reprend là où il était (position, charge, besoins, minuteurs). Les références vers d'autres objets (arbre visé, animal chassé, spot de pêche, tas au sol…) ne se sauvent pas : l'habitant qui en avait
   une repart de l'état « libre » (idle) et la choisit de nouveau ; l'attente d'une fabrication, la faim, la soif, les trajets des porteurs et la charge portée sont conservés. Valable 30 minutes. */
const HABITANTS_CLE = 'paperConquestHabitants', REFS_HABITANTS = new Set(['target', 'proie', 'entree', 'cible', 'dst', 'chemin', 'bes', 'e', 'spot']), ETATS_A_REPRENDRE = ['cut', 'goPile', 'bGo', 'bPrend', 'bBack', 'capGo', 'capPrend', 'capBack', 'install', 'peche', 'range', 'tue'];
let habitantsRestaures = false;
function sauverHabitants() {
  if (!habitantsRestaures || window.__nouvellePartie) return;
  try {
    const L = [];
    for (const [k, w] of workers) {
      const o = {}; for (const [f, v] of Object.entries(w)) if (!REFS_HABITANTS.has(f) && typeof v !== 'function') o[f] = v;
      if (w.target || w.proie || w.spot || w.entree || w.cible) o._ref = 1;
      if (w.dst) o._dst = w.dst.id;
      L.push([k, o]);
    }
    localStorage.setItem(HABITANTS_CLE, JSON.stringify({ t:Date.now(), L }));
  } catch (e) {}
}
function restaurerHabitants() {
  try {
    const d = JSON.parse(localStorage.getItem(HABITANTS_CLE) || 'null'); if (!d || !Array.isArray(d.L) || Date.now() - d.t > 1800000) return;
    for (const [k, o] of d.L) {
      const id = typeof k === 'string' ? +k.split('#')[0] : k;
      if (!findById('house', id) || workers.has(k)) continue;
      const w = { ...o }; if (o._dst) w.dst = findById('house', o._dst); delete w._dst;
      if (w._ref || ETATS_A_REPRENDRE.includes(w.state)) { w.state = 'idle'; w.t = 0; w.chemin = null; w.target = null; if (!w.donne && !w.porteur) w.carry = false; }                // (il choisit de nouveau sa cible)
      delete w._ref; w.repris = true; workers.set(k, w); delete w.repris;                       // (repris tels quels : pas de départ depuis la maison)
    }
  } catch (e) {}
}
setInterval(sauverHabitants, 2000); addEventListener('pagehide', sauverHabitants); addEventListener('beforeunload', sauverHabitants);
function simTick(dt0) {
  if (!habitantsRestaures) { restaurerHabitants(); habitantsRestaures = true; }                // (premier pas : on reprend les habitants enregistrés)
  etalsStep(dt0); messagesJour();
  let active = false, panelDirty = false;
  const taken = new Set([...workers.values()].map(w => w.target && treeKey(w.target)).filter(Boolean));
  for (const k of [...workers.keys()]) if (typeof k === 'string') { const [id, i] = k.split('#'), o = findById('house', +id); if (!o || +i >= nbTrav(o)) workers.delete(k); }   // ouvriers en trop (réglage réduit, bâtiment arrêté)
  for (const h of S.houses) for (SLOT = 0; SLOT < Math.max(1, nbTrav(h)); SLOT++) {
    const dt = dt0;
    if (typeof JR !== 'undefined' && JR.actif) jrActeur(h, SLOT);                         // mode développeur : journal des ressources (dev.js)
    { const wv = workers.get(wkey(h)); if (wv && !wv.passive) { if (phaseJour() !== 'nuit') { wv.sati = Math.max(0, (wv.sati === undefined ? 90 : wv.sati) - BESOIN.FAIM * dt); wv.soif = Math.max(0, (wv.soif === undefined ? 90 : wv.soif) - BESOIN.SOIF * dt); } } }   // faim et soif (ils ne baissent pas pendant la nuit)
    if (!nbTrav(h)) { workers.delete(h.id); continue; }   // arrêté ou sans travailleur : personne ne sort
    if (h.appro) { if (!SLOT) approBatiment(h, dt); active = true; continue; }       // « Remplir le stock » : les ouvriers vont chercher les matières (voir approBatiment)
    if (SLOT && ['passive', 'craft'].includes((jobOf(h) || {}).type) && !horsFonte(h, SLOT)) { workers.delete(wkey(h)); continue; }   // (production passive : un minuteur, pas d'ouvriers en plus ; sauf les porteurs de la fonderie)
    const wk = wkey(h);
    const cibEtal = tenueEtal() ? etalCible(h, SLOT) : null;
    if (cibEtal) { stepEtal(h, dt, cibEtal); active = true; continue; }   // après la fin du travail, marché ouvert : l'ouvrier tient (ou installe) son étal
    { const we = workers.get(wk); if (we && we.state === 'etal') { we.state = 'idle'; we.surPlace = false; we.visible = false; we.t = 0; we.chemin = null; } }   // le marché ferme : l'ouvrier reprend son travail (collecte, récolte)
    if (estRepos()) {                                                                       // pause, soir, nuit : pas de travail (sauf les productions passives)
      const w0r = workers.get(wk), J0 = jobOf(h);
      if (!(J0 && (J0.type === 'passive' || J0.type === 'craft')) || horsFonte(h, SLOT)) {
        if (!w0r || w0r.passive) continue;                                                  // (personne n'est sorti)
        const ph0 = phaseJour();
        if ((ph0 === 'matin' || ph0 === 'pause' || ph0 === 'soir') && repas(h, w0r, dt, ph0)) { active = true; continue; }   // les trois repas du jour : réveil, midi, soir
        if (ph0 === 'matin' && marcheOuvert() && w0r.matin !== Math.floor(jourJeu())) { w0r.matin = Math.floor(jourJeu()); w0r.soiree = false; }   // (6 h 30 : nouvelle visite du marché)
        if ((ph0 === 'soir' || ph0 === 'matin' && marcheOuvert()) && !w0r.soiree && besoins(h, w0r, dt, true)) { active = true; continue; }   // 18 h (ou 6 h 30) : d'abord le marché
        if (reposNuit(h, dt)) active = true;
        continue;
      }
    } else if (workers.has(wk) && workers.get(wk).nuit) reposNuit(h, dt);                  // le matin : il ressort
    {                                                                                      // minuterie de sortie : les travailleurs d'un bâtiment ne sortent pas tous en même temps (le travailleur n'existe même pas avant sa sortie)
      const w0 = workers.get(wk);
      const dedans = !w0 || (!w0.passive && typeof batimentSous === 'function' && batimentSous([w0.x, w0.y]) === h), pret = !w0 || ['idle', 'done', 'plein', 'sansoutil', 'wait'].includes(w0.state);
      if (!dedans || (w0 && w0.passive)) SORTIES.delete(wk);
      else if (pret) {
        let t = SORTIES.get(wk); if (t === undefined) t = SLOT * SORTIE_DELAI + (h.id % 3) * (SORTIE_DELAI / 3);
        if (t > 0) { SORTIES.set(wk, t - dt); active = true; continue; }
        SORTIES.set(wk, 0);
      }
    }
    { const w1 = workers.get(wk); if (w1 && !w1.passive && besoins(h, w1, dt)) { active = true; continue; } }   // faim ou soif : il va manger ou boire d'abord
    if (TAILLEURS[h.kind] && actDe(h) === 'fabriquer') {                                       // le tailleur de pierre fabrique depuis sa file de production (travail demandé)
      let wt = workers.get(wk); if (!wt || !wt.passive) { wt = { x:h.x, y:h.y, state:'idle', job:true, jobType:'craft', passive:true }; workers.set(wk, wt); }
      if (!SLOT) stepProduction(h, wt, dt);
      continue;
    }
    if (h.kind === 'fonderie' && estPorteur(h, SLOT)) { active = stepPorteur(h, dt) || active; continue; }
    const job = h.kind === 'hutte_charbonnier' && horsFonte(h, SLOT) ? null : jobOf(h);   // (bûcherons de la hutte du charbonnier : pas de métier de fabrication)
    if (job) { active = stepJob(h, job, dt) || active; continue; }
    if (h.kind === 'hutte_forestier') {
      if (!SLOT) forestierTick(h);
      if (actDe(h) === 'germiner') { workers.delete(wkey(h)); continue; }                       // les ouvriers font germer des graines à la hutte
      if (h.zone) { stepForester(h, dt); active = true; continue; }
    }
    if (h.kind === 'hutte_cueillette') {
      if (actDe(h) === 'pousses') { if (!SLOT) pousseCueillette(h, dt * Math.max(1, nbTrav(h))); workers.delete(wkey(h)); continue; }   // les ouvriers produisent des pousses à la hutte : plus de cueillette
      if (h.zone) { stepCueilleur(h, dt); active = true; continue; }
    }
    if (h.kind === 'camp_chasse') {                                                           // chasseurs : voir stepChasseur
      if (!h.zone) { workers.delete(wk); continue; }
      let wc = workers.get(wk);
      if (!wc || wc.zone !== zoneKeyOf(h.zone)) { wc = { x:wc ? wc.x : h.x, y:wc ? wc.y : h.y, state:'idle', zone:zoneKeyOf(h.zone), arme:wc ? wc.arme : 0 }; workers.set(wk, wc); }
      active = true; stepChasseur(h, wc, dt, (x, y) => marcher(wc, x, y, WALK, dt)); continue;
    }
    if (!(LUMBER[h.kind] || TAILLEURS[h.kind]) || !h.zone) { workers.delete(wk); continue; }
    let w = workers.get(wk);
    // nouvelle zone, ou végétation recalculée (annuler…) : l'habitant repart du bâtiment
    if (!w || w.zone !== zoneKeyOf(h.zone) || w.version !== floraVersion) {
      w = { x:w ? w.x : h.x, y:w ? w.y : h.y, state:'idle', zone:zoneKeyOf(h.zone), version:floraVersion, carry:w ? w.carry : false };
      workers.set(wk, w);
    }
    active = true;
    const before = w.state;
    const sp = WALK * (hasOxen(h) ? 1.5 : 1); // les bœufs tirent le bois : trajets plus rapides
    const walkTo = (tx, ty) => marcher(w, tx, ty, sp, dt);
    if (((h.kind === 'camp_bucherons' && nbPort(h)) || h.kind === 'hutte_charbonnier') && w.rolePort !== estPorteurBois(h, SLOT)) { w.rolePort = estPorteurBois(h, SLOT); w.state = 'idle'; w.target = null; w.parc = null; w.carry = false; w.charge = 0; }   // (changement de rôle : bûcheron ↔ porteur)
    if ((h.kind === 'camp_bucherons' || h.kind === 'hutte_charbonnier') && estPorteurBois(h, SLOT)) { stepBucheronPorteur(h, w, dt, walkTo); if (w.state !== before && isOn('house', h.id, sel)) panelDirty = true; continue; }
    if (h.kind === 'loge_bucheron' && actDe(h) === 'ramasser') { stepRamasseur(h, w, dt, walkTo); if (w.state !== before && isOn('house', h.id, sel)) panelDirty = true; continue; }
    if (LUMBER[h.kind]) { stepBucheron(h, w, dt, taken, walkTo); if (w.state !== before && isOn('house', h.id, sel)) panelDirty = true; continue; }
    if (w.state === 'idle' || w.state === 'done' || w.state === 'plein' || w.state === 'sansoutil') {
      if (w.carry && !w.lim) { w.charge = 1; w.lim = 1; }                                  // (reprise d'une partie sans véhicule)
      if (!w.carry && outilManque(h)) w.state = 'sansoutil';                                  // règle : pas d'outil adapté, pas de travail
      else if (!w.carry && stockPlein(h)) w.state = 'plein';
      else {
        if (!w.carry) { w.charge = 0; w.lim = Math.max(1, Math.min(capCharge(h), maxRes(h, articleDe(h)) - (h.stock || 0))); }   // nouveau trajet : on ne charge pas plus que le stock ne peut recevoir
        const t = w.carry && w.charge >= w.lim ? null : (TAILLEURS[h.kind] ? (actDe(h) === 'silex' ? silexInZone : rocksInZone) : treesInZone)(h.zone).filter(f => !taken.has(treeKey(f))).sort((a, b) => (a.x - h.x) ** 2 + (a.y - h.y) ** 2 - ((b.x - h.x) ** 2 + (b.y - h.y) ** 2))[0];
        if (t) { w.target = t; taken.add(treeKey(t)); w.state = 'go'; } else w.state = w.carry ? 'back' : 'done';   // chargement plein, ou plus rien à prendre : retour au bâtiment
      }
    } else if (w.state === 'go') {
      if (walkTo(w.target.x, w.target.y)) { w.state = 'cut'; w.t = tpsTravail(h, CUT_TIME); }
    } else if (w.state === 'cut') {
      if ((w.t -= dt) <= 0) { w.charge = (w.charge || 0) + (TAILLEURS[h.kind] ? (w.target.kind === 'silex' ? 2 : Math.max(1, Math.round(w.target.r))) : 1); cutTree(w.target); w.target = null; w.carry = true; w.state = 'idle'; }   // chargé : il en reprend un autre tant que le véhicule n'est pas plein
    } else if (w.state === 'back') {
      if (walkTo(h.x, h.y)) { w.state = 'drop'; w.t = DROP_TIME; }
    } else if (w.state === 'drop') {
      if ((w.t -= dt) <= 0) {
        w.carry = false; const n = w.charge || 1; w.charge = 0;
        if (TAILLEURS[h.kind] && actDe(h) === 'silex') { h.inv = h.inv || {}; h.inv.silex = (h.inv.silex || 0) + n; } else h.stock = (h.stock || 0) + n;   // le silex se range dans la cabane (h.inv), la pierre est le produit du camp
        save(); w.state = 'idle'; }
    }
    if (w.state !== before && isOn('house', h.id, sel)) panelDirty = true;
  }
  SLOT = 0;
  portageTick(dt0);
  alertesMaj(dt0);
  if (typeof JR !== 'undefined' && JR.actif) jrActeur(null);
  separerPersonnages(dt0);
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
/* Stock PERMANENT de chaque bâtiment qui produit : une part de sa capacité (stockMax), 70 % par défaut (h.gardePct, curseur de l'onglet STOCK de la fiche), gardée pour sa production ;
   les granges et entrepôts ne prennent que le surplus au-dessus (par article). */
const estProducteur = o => !!(productOf(o) || o.kind === 'hutte_cueillette' || (jobOf(o) || {}).type === 'craft');
const gardePct = o => o.gardePct !== undefined ? o.gardePct : o.kind === 'fosse_miniere' ? 0 : estProducteur(o) ? 70 : 0;   // (une mine ne garde rien : le camp de mineur prend tout)
const gardeDe = (o, a) => (jobOf(o) || {}).type === 'collect' ? 0 : Math.round(gardePct(o) / 100 * stockMax(o));
const VALUE = { 'légumes':2, 'œufs':2, 'pommes':2, 'pain':3, 'bois':2, 'planches':4, 'laine':3, 'peaux':3, 'pièces en bois':5,
  'arcs et flèches':8, 'vêtements':8, 'chaussures':6, 'bière':4, 'outils et armes':10, 'armures':14 };
const CARRY = { 'poisson':'sheep', 'grain':'stall-b', 'laine':'sheep', 'farine':'sheep', 'pain':'earth-edge', 'bois':'earth-edge', 'planches':'f-fallow', 'légumes':'f-alfalfa',
  'œufs':'sheep', 'pommes':'stall-a', 'peaux':'ore-clay', 'marchandises':'stall-a', 'Or':'stall-b' };
/* Chaque bâtiment qui produit a un stock maximum : une fois plein, son ouvrier ne travaille plus tant qu'on ne vide pas le stock
   (granges et entrepôts ramassent ; sans stockage, la production s'arrête). Passif : le plafond de son métier. */
const STOCK_MAX = { fromagerie:80, hutte_charbonnier:400, camp_bucherons:50, loge_bucheron:100, camp_chasse:200, hutte_cueillette:30, rucher:20, cabane_peche:50, tailleur_pierre:50, scierie:60, fonderie:80, menuiserie:200, forge:60, archerie:60, armurerie:60, cordonnerie:40, couture:40, brasserie:60, ferme:150, bergerie:40, moulin:50, four:40 };
/* Améliorations de transport (bûcherons et tailleur de pierre) : niveau 1 = charrette à main, niveau 2 = chariot de transport. Le travailleur prend son
   véhicule, va dans la zone, le charge (arbre après arbre, ou pierre après pierre) puis le rapporte au bâtiment et le décharge. Sans amélioration : 1 par trajet. */
const AMELIO = [null, { nom:'Charrette à main', cout:{ 'charrette à main':1 }, charge:10 }, { nom:'Chariot de transport', cout:{ chariot:1 }, charge:30 }];   // (objets fabriqués par le menuisier)
const AMELIO_FONDERIE = [null, { nom:'Haut fourneau', cout:{ bois:60, pierre:60, fer:20 }, effet:'Débloque la fabrication d’acier' }];
const ameliorable = h => !!(LUMBER[h.kind] || TAILLEURS[h.kind] || h.kind === 'fonderie' || (jobOf(h) || {}).type === 'collect');   // collecteurs (grange, entrepôt) : leur charrette
const amelios = h => h.kind === 'fonderie' ? AMELIO_FONDERIE : AMELIO;
const nbCharrettes = h => h.nbCh === undefined ? 1 : h.nbCh;                 // charrettes de l'exploitation : une par ouvrier (au plus le nombre maximal d'ouvriers)
const niveauH = h => ameliorable(h) ? Math.min(amelios(h).length - 1, h.niv || 0) : 0;      // niveau d'amélioration du bâtiment (indépendant de l'ouvrier)
const niveauDe = (h, slot) => { const n = niveauH(h); if (h.kind === 'camp_bucherons' && nbPort(h)) return estPorteur(h, slot) ? n : 0; if (nbPortHut(h)) return estPortHut(h, slot) ? n : 0; /* (la charrette du camp sert au porteur seul) */ return n && (h.kind === 'fonderie' || slot < nbCharrettes(h)) ? n : 0; };   // la charrette à main sert à UN seul ouvrier
const niveau = h => niveauDe(h, SLOT);
const articleDe = h => TAILLEURS[h.kind] ? (actDe(h) === 'silex' ? 'silex' : 'pierre') : (productOf(h) || 'bois');       // ce que transporte la charrette d'un bûcheron ou d'un tailleur de pierre
const chargeAmelio = (h, n) => chargeMax(articleDe(h), n);                      // (selon le poids : 50 bois au chariot)
const capCharge = h => (LUMBER[h.kind] || TAILLEURS[h.kind]) && niveau(h) ? chargeAmelio(h, niveau(h)) : BOIS_PAR_ARBRE[h.kind] || 1;   // à la main : un dépôt (2 bois au camp, 4 bûches à la loge)
/* Entrepôt : capacité 250, puis 3 extensions de stockage (h.stk) : 350, 500, 750 (prix en proportion de l'augmentation). */
const ENTREPOT_CAP = [250, 350, 500, 750];
const STOCKAGE_EXT = [{ cap:350, cout:{ bois:60, planches:20 } }, { cap:500, cout:{ bois:100, planches:40, pierre:20 } }, { cap:750, cout:{ bois:180, planches:80, pierre:60 } }];
const capCollecte = (h, job) => h.kind === 'entrepot' ? ENTREPOT_CAP[Math.min(3, h.stk || 0)] : job.cap;
const stockMax = h => { const J = jobOf(h); return J && J.type === 'passive' ? J.cap : STOCK_MAX[h.kind] || 30; };
/* STOCK PAR RESSOURCE : chaque article a son propre maximum dans chaque bâtiment (maxRes), au lieu d'un stockage global. Par défaut : CAP_KG (200 kg) ÷ poids d'une unité (catalogue.js), de 5 à 400 ; surcharge par type de bâtiment
   (CAP_RES) ou par bâtiment (h.max). Un bâtiment est « plein » quand sa production (sortiesPrincipales) atteint son maximum : il s'arrête pour cet article (les granges et entrepôts gardent un total global, capCollecte). */
const CAP_SORTIE_KG = 100;
/* Maximum de chaque article dans un bâtiment (réaliste, pas un stockage global) :
   - matières NÉCESSAIRES (entreesDe) : ce qu'il faut pour quelques fabrications (maxEntree) — le camp de chasse : 2 silex et 1 bâton par lance, (chasseurs + 2) lances = 10 silex pour 3 chasseurs ; la fonderie : 3 fontes ; un atelier : une
     fois et demie la plus grosse recette (au moins sa réserve) ;
   - produits : CAP_SORTIE_KG (100 kg) ÷ poids d'une unité, de 8 à 60 pièces (120 kg ou L) (CAP_RES : valeurs propres à un bâtiment) ; surcharge d'un bâtiment : h.max. */
const CAP_RES = {
  hutte_charbonnier:{ bois:60, 'charbon de bois':80 }, camp_bucherons:{ bois:80 }, loge_bucheron:{ 'bois de chauffage':100, 'bâtons':30, brindilles:100 },
  camp_chasse:{ viande:80, peaux:12, os:30, tendons:10, graisse:20 }, fosse_miniere:{}, tailleur_pierre:{ pierre:60, silex:60 },
};
/* MAXIMUMS VALIDÉS en mode développeur (onglet « Définir les stocks », base de données ~/.paper-conquest-dev/base.json, validés le 07/10/2026) : ils remplacent les valeurs par défaut ci-dessus. */
const STOCKS_VALIDES = {
  loge_bucheron:{"bâtons":80,brindilles:300},
  camp_chasse:{silex:12,"bâtons":8,viande:300,peaux:60,os:50,tendons:40,graisse:50},
  cabane_peche:{poisson:200},
  tailleur_pierre:{pierre:150,silex:120,"pierre taillée":60,"pointes de flèche":50},
  fosse_miniere:{"minerai de fer":200},
  scierie:{bois:10,planches:80},
  menuiserie:{fibres:50,corde:30,planches:120,silex:30,"charrette à main":4,chariot:2,"hache (silex)":10,"pioche (silex)":10,"houe (silex)":10,"pelle (silex)":10,"faucille (silex)":10,"faux (silex)":10,"serpe (silex)":10,"marteau (silex)":10,"couteau (silex)":10,"canne à pêche (bois)":10,"arc (bois)":10,"flèche (bois)":120,"flèche (silex)":120,"gourdin (bois)":10,"dague (silex)":10,"masse (silex)":10,"lance (silex)":10,"pique (silex)":10,"javelot (silex)":10,"bouclier (bois)":10,"bouclier (renforcé)":8},
  forge:{cuivre:60,bois:60,"charbon de bois":200,bronze:50,fer:60,acier:60,"hache (cuivre)":10,"hache (bronze)":10,"hache (fer)":10,"hache (acier)":10,"pioche (cuivre)":10,"pioche (bronze)":10,"pioche (fer)":10,"pioche (acier)":10,"houe (cuivre)":10,"houe (bronze)":10,"houe (fer)":10,"houe (acier)":10,"pelle (cuivre)":10,"pelle (bronze)":10,"pelle (fer)":10,"pelle (acier)":10,"faucille (cuivre)":10,"faucille (bronze)":10,"faucille (fer)":10,"faucille (acier)":10,"faux (cuivre)":10,"faux (bronze)":10,"faux (fer)":10,"faux (acier)":10,"serpe (cuivre)":10,"serpe (bronze)":10,"serpe (fer)":10,"serpe (acier)":10,"marteau (cuivre)":10,"marteau (bronze)":10,"marteau (fer)":10,"marteau (acier)":10,"couteau (cuivre)":10,"couteau (bronze)":10,"couteau (fer)":10,"couteau (acier)":10,"canne à pêche (fer)":10,"dague (cuivre)":10,"dague (bronze)":10,"dague (fer)":10,"dague (acier)":10,"épée (cuivre)":10,"épée (bronze)":10,"épée (fer)":10,"épée (acier)":10,"masse (cuivre)":10,"masse (bronze)":10,"masse (fer)":10,"masse (acier)":10,"lance (cuivre)":10,"lance (bronze)":10,"lance (fer)":10,"lance (acier)":10,"pique (cuivre)":10,"pique (bronze)":10,"pique (fer)":10,"pique (acier)":10,"javelot (cuivre)":10,"javelot (bronze)":10,"javelot (fer)":10,"javelot (acier)":10},
  archerie:{bois:30,corde:20,"charbon de bois":30,fer:10,acier:10,cuivre:10},
  armurerie:{bois:30,planches:40,cuivre:30,"charbon de bois":30,fer:30,acier:30},
  cordonnerie:{peaux:30},
  brasserie:{grain:200,"bière":200},
  hutte_charbonnier:{"charbon de bois":200},
  fonderie:{"minerai de fer":200,"charbon de bois":100,"minerai de cuivre":200,"minerai d'étain":200,"minerai de plomb":200,"minerai d'argent":200,"minerai d'or":200,cuivre:75,"étain":75,fer:75,plomb:75,argent:75,or:75,bronze:75,acier:75},
  moulin:{grain:120,farine:200},
  fromagerie:{viande:40,lait:200,"présure":10,sel:30,"fromage de garde":50},
  four:{farine:20,pain:100},
};
for (const k of Object.keys(STOCKS_VALIDES)) CAP_RES[k] = { ...(CAP_RES[k] || {}), ...STOCKS_VALIDES[k] };
function maxEntree(h, k) {
  if (h.kind === 'camp_chasse') return Math.max(2, (CHASSE.LANCE[k] || 0) * (Math.max(1, nbReel(h)) + 2));
  if (h.kind === 'fonderie') return (intrantsFonte(h)[k] || 4);
  let m = 0; for (const R of produitsDe(h)) m = Math.max(m, (R.cout || {})[k] || 0);
  return Math.max(4, Math.ceil(m * 1.5), (RESERVE_ATELIER[h.kind] || {})[k] || 0);
}
function maxRes(h, k) {
  if (h.max && h.max[k]) return h.max[k];
  const o = (CAP_RES[h.kind] || {})[k]; if (o) return o;
  const sortie = Math.max(8, Math.min(uniteDe(k) === 'pièce' ? 60 : 120, Math.round(CAP_SORTIE_KG / poidsUnite(k))));   // (60 pièces au plus ; 120 kg ou L)
  return entreesDe(h).includes(k) ? Math.max(maxEntree(h, k), sortiesDe(h).includes(k) ? sortie : 0) : sortie;            // (une matière à la fois nécessaire et produite : le plus grand des deux)
}
const stockDe = (h, k) => (productOf(h) === k ? (h.stock || 0) : 0) + ((h.inv || {})[k] || 0) + ((h.mat || {})[k] || 0);
const sortiePleine = (h, sort) => Object.keys(sort || {}).some(k => stockDe(h, k) >= maxRes(h, k));
function sortiesPrincipales(h) {                                                          // les articles que le bâtiment produit et dont le maximum le bloque
  const J = jobOf(h) || {};
  if (J.type === 'collect') return [];
  if (h.kind === 'camp_chasse') return ['viande'];
  if (AUTO_SIMPLE[h.kind]) return Object.keys(AUTO_SIMPLE[h.kind].sort);
  if (J.on === 'gisement') { const d = gisementSous(h); return d ? [ORE[d.kind] || 'minerai'] : []; }
  if (J.type === 'craft' && !PRODUCTION_AUTO.has(h.kind)) { const R = (h.file || []).length ? produitDe(h, h.file[0]) : null; return R ? Object.keys(R.sort || { [R.nom]:1 }) : []; }   // (la fabrication de tête de file)
  const p = productOf(h); return p ? [p] : [];
}
function sortiesDe(h) {                                                                    // tous les articles que le bâtiment peut produire (affichés dans son stock même à 0)
  const L = new Set(sortiesPrincipales(h));
  if (h.kind === 'loge_bucheron') ['bois de chauffage', 'bâtons', 'brindilles'].forEach(k => L.add(k));
  else if (h.kind === 'camp_chasse') ['viande', 'peaux', 'os', 'tendons', 'graisse'].forEach(k => L.add(k));
  else if (h.kind === 'fonderie') FUSIONS.forEach(f => Object.keys(f.sort).forEach(k => L.add(k)));
  else if (aBesoinStock(h)) for (const id of (h.file || []).slice(0, 3)) { const R = produitDe(h, id); if (R) Object.keys(R.sort || { [R.nom]:1 }).forEach(k => L.add(k)); }   // (atelier : les fabrications de tête de file)
  return [...L];
}
function entreesDe(h) {                                                                   // les matières dont le bâtiment a besoin pour produire
  const m = new Set();
  if (h.kind === 'camp_chasse') Object.keys(CHASSE.LANCE).forEach(k => m.add(k));
  else if (h.kind === 'fonderie') FUSIONS.forEach(f => Object.keys(f.cout).forEach(k => m.add(k)));
  else if (AUTO_SIMPLE[h.kind]) Object.keys(AUTO_SIMPLE[h.kind].cout).forEach(k => m.add(k));
  else if (aBesoinStock(h)) for (const R of produitsDe(h)) Object.keys(R.cout || {}).forEach(k => m.add(k));
  return [...m];
}
const stockPlein = h => {
  if (h.kind === 'fonderie') { const L = recettesDe('fonderie', niveauDe(h, 0)).filter(r => !h.fonte || h.fonte[r.id] !== false); return L.length > 0 && L.every(r => sortiePleine(h, r.sort)); }
  const s = sortiesPrincipales(h);
  return s.length ? s.some(k => stockDe(h, k) >= maxRes(h, k)) : (h.stock || 0) + invTotal(h) >= stockMax(h);                 // (sans production connue : total du bâtiment)
};
const tpsTravail = (h, base) => base / efficaciteOutil(h);               // le meilleur outil du stock accélère le travail (outils.js)
// ce que produit un bâtiment (pour le trouver comme source) et son identifiant de producteur
const producerId = h => (buildingOf(h) || {}).yard ? yardOf(h) : h.kind;
function productOf(h) {
  if (typeof cultivee === 'function' && cultivee(h)) { const c = cultureDe(h); if (c) return c.produit; }   // potager, verger, ferme : l'article de la culture choisie
  if (h.kind === 'loge_bucheron') return 'bois de chauffage';
  if (LUMBER[h.kind]) return 'bois';
  if (TAILLEURS[h.kind]) return 'pierre';
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
  if (job.on === 'champ') return champsDe(h).flatMap(pointsDeChamp).map(c => ({ c, area:900 })).sort((a, b) => segLen(a.c, [h.x, h.y]) - segLen(b.c, [h.x, h.y]));   // la ferme travaille ses champs (outil Champ)
  const pts = [0, 1, 2, 3].map(k => [h.x + Math.cos(k * Math.PI / 2 + .6) * 30, h.y + Math.sin(k * Math.PI / 2 + .6) * 30])
    .filter(inTerrain).map(c => ({ c, area:900 }));
  if (job.on === 'paturage') S.houses.filter(o => o.kind === 'comptoir_betail').forEach(o => pts.push({ c:[o.x, o.y], area:o.w * o.l }));
  return pts.filter(s => segLen(s.c, [h.x, h.y]) <= job.reach).sort((a, b) => segLen(a.c, [h.x, h.y]) - segLen(b.c, [h.x, h.y]));
}
const byDist = h => (a, b) => segLen([a.x, a.y], [h.x, h.y]) - segLen([b.x, b.y], [h.x, h.y]);
const jobSources = (h, job) => S.houses.filter(o => o !== h && [].concat(job.from).includes(producerId(o)) && segLen([o.x, o.y], [h.x, h.y]) <= job.reach).sort(byDist(h));
// ce qu'un collecteur peut prendre chez un producteur (en laissant un peu de matière première)
const accepte = (job, a) => Array.isArray(job.accepts) ? job.accepts.includes(a) : !FOOD_LIST.includes(a);   // grange : les vivres ; entrepôt : tout le reste
const dispo = (o, a) => (productOf(o) === a ? (o.stock || 0) : 0) + ((o.inv || {})[a] || 0);        // ce qu'un bâtiment a de l'article a : produit en stock + objets, minerais, produits d'extension (inv)
function prendre(o, a, n) { if (productOf(o) === a) { const x = Math.min(n, o.stock || 0); o.stock -= x; n -= x; } if (n > 0 && o.inv) o.inv[a] = Math.max(0, (o.inv[a] || 0) - n); }
function collectable(o, job) {                                                                        // l'article qu'un ramasseur peut prendre ici (en laissant un peu de matière première), ou null
  if ((jobOf(o) || {}).type === 'collect' || o.kind === 'hutte_charbonnier') return null;
  if (job.from ? !job.from.includes(o.kind) : o.kind === 'fosse_miniere') return null;                  // (le camp de mineur décharge les mines, et elles seulement)   // (hutte du charbonnier : son bois et son charbon restent sur place, pour les bâtiments qui en ont besoin)
  for (const a of new Set([productOf(o), ...Object.keys(o.inv || {})])) {
    if (!a || !accepte(job, a)) continue;
    if (dispo(o, a) > gardeDe(o, a)) return a;
  }
  return null;
}
function jobLabel(b, w, job = b && b.job) {
  if (!job) return '';
  const st = w ? w.state : 'idle';
  if (w && w.attendSaison && (st === 'wait' || st === 'idle')) return 'attend la saison de récolte';
  if (w && w.sansOutil && (st === 'wait' || st === 'idle')) return 'il lui faut : ' + w.sansOutil;
  if (w && w.plein && (st === 'wait' || st === 'idle')) return 'stock plein : il attend d’être vidé';
  if (w && w.bes) return { eau:'va boire au puits', maison:'rentre manger chez lui', etal:'va manger à un étal' }[w.bes.type] + (w.bes.etat === 'retour' ? ' · retourne au travail' : '');
  if (w && ['capGo', 'capPrend', 'capBack'].includes(st)) return { capGo:'part capturer un animal', capPrend:"capture l'animal", capBack:"ramène l'animal à la ferme" }[st];
  if (job.on === 'gisement') return { idle:'se repose dans la cabane', go:'va au puits de mine', descend:'descend dans la mine', work:'extrait du minerai (1 toutes les 30 s)', remonte:'remonte de la mine', back:'rapporte le minerai à la cabane', drop:'range le minerai', wait:'aucun gisement sous la fosse' }[st] || '';
  if (job.type === 'passive') return (w && w.full) ? `stock plein (${job.cap})` : `produit : ${job.product}${job.note ? ' (' + job.note + ')' : ''}`;
  if (job.type === 'site') {
    const where = job.on === 'champ' ? 'les champs' : 'les pâturages';
    return { idle:'se prépare', go:`va sur ${where}`, work:job.on === 'champ' ? 'travaille le champ' : 'tond les moutons',
      back:`rapporte ${job.product === 'grain' ? 'le grain' : 'la laine'}`, drop:'range', wait:job.on === 'champ' ? 'aucun champ : créez-en un (menu Agriculture > Champ)' : `aucun pâturage à portée (${job.reach} m)` }[st] || '';
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
  if (job.type === 'fish') return { idle:'se prépare', go:'part pêcher', install:'installe sa canne et son seau', peche:`pêche (${w && w.panier || 0} / ${typeof PECHE_JOUR === 'number' ? PECHE_JOUR : 10})`, range:'range son matériel', back:'retourne à la cabane', drop:'verse ses poissons au stock', huile:"presse l'huile de poisson", wait:w && w.sansEau ? 'spot de pêche à choisir' : w && w.inacc ? 'spot inaccessible : il faut un pont' : w && w.eauVide ? 'étang vide' : 'attend' }[st] || '';
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
  if (o.kind === 'ferme') rows.push(['Extensions', (o.ext || []).map(e => FERME_EXT[e.k].nom).join(' · ') || `aucune (jusqu'à ${FERME_EXT_MAX})`]);
  if (cultivee(o)) { rows.push(['Champs', `${champsDe(o).length} · ${fmt(aireChamps(o), 0)} m²${aireChamps(o) ? '' : ' : aucun, culture à l’arrêt (menu Agriculture > Champ)'}`]); const c = cultureDe(o); if (c) rows.push(['Culture', `${c.nom} · plantation ${plageTexte(c.plantation)} · récolte ${plageTexte(c.recolte)}`], ['Saison', cultureTexte(o)]); }
  if (J.type === 'collect') {
    const inv = Object.entries(o.inv || {}).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`).join(', ');
    rows.push(['Stock', `${invTotal(o)} / ${capCollecte(o, J)}`], ['Contenu', inv || 'vide']);
  } else if (J.type === 'sell') {
    rows.push(['Ventes', `${o.sold || 0} Or gagnés`]);
  } else if (J.type === 'fish') {
    rows.push(['Spot de pêche', typeof eauTexte === 'function' ? eauTexte(o) : ''], ['Pêche', `${typeof PECHE_JOUR === 'number' ? PECHE_JOUR : 10} poissons par sortie`], ['Stock', `${o.stock || 0} / ${stockMax(o)} poisson`]);
  } else if (J.type === 'craft' && PRODUCTION_AUTO.has(o.kind)) {
    const inv = Object.entries(o.inv || {}).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`).join(', '), R = w && w.enCours ? fusionDe(w.cur) : null;
    rows.push(['État', !w ? 'prête' : w.etat === 'fabrique' ? 'fond : ' + (R ? R.nom : '') + ' (' + Math.round((1 - w.t / (w.tTot || 1)) * 100) + ' %)' : w.etat === 'plein' ? 'stock plein' : 'allumée : rien à fondre (minerai ou charbon de bois manquant)'], ['Stock', `${invTotal(o)} / ${stockMax(o)}`], ['Contenu', inv || 'vide']);
  } else if (J.type === 'craft') {
    const file = o.file || [], R = file.length ? produitDe(o, file[0]) : null, inv = Object.entries(o.inv || {}).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`).join(', ');
    const etat = !w ? 'prêt' : w.etat === 'manque' ? '⚠ matériaux manquants : ' + w.manque : w.etat === 'fabrique' ? 'fabrique : ' + (R ? R.nom + (R.etapes ? ' · ' + etapeTexte(o, R, w) : '') : '') + ' (' + Math.round((1 - w.t / (w.tTot || 1)) * 100) + ' %)' : w.etat === 'plein' ? 'stock plein' : w.etat === 'cave pleine' ? 'cave pleine : la file attend' : 'file vide';
    rows.push(['File de production', file.length ? file.length + ' en attente' : 'vide'], ['État', etat], ['Stock', `${invTotal(o)} / ${stockMax(o)}`], ['Contenu', inv || 'vide']);
  } else if (J.on === 'gisement') {
    const dep = gisementSous(o), inv = Object.entries(o.inv || {}).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`).join(', ');
    rows.push(['Stock', `${invTotal(o)} / ${stockMax(o)}`], ['Contenu', inv || 'vide'], ['Gisement', dep ? (GISEMENTS[dep.kind] || {}).nom : 'aucun : déplacez la fosse sur un gisement']);
  } else if (J.type !== 'relay') {
    const inv = Object.entries(o.inv || {}).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`).join(', ');
    rows.push(['Stock', `${o.stock || 0} / ${stockMax(o)} ${J.product}`]);
    if (inv) rows.push(['Produits des extensions', inv]);
  }
  if (J.type === 'site') {
    const l = jobSites(o, J);
    rows.push(['Terres', J.on === 'gisement' ? 'gisements à portée' : J.on === 'champ' ? `${champsDe(o).length} champ(s) · ${fmt(aireChamps(o), 0)} m²` : `autour de la bergerie${l.length > 4 ? ' + parc à bétail' : ''}`]);
  } else if (J.type === 'fetch') {
    const l = jobSources(o, J), src = l.find(x => (x.stock || 0) > 0) || l[0];
    rows.push(['Matière', J.mat], ['Source', src ? `${src.type} à ${fmt(segLen([src.x, src.y], [o.x, o.y]), 0)} m · stock ${src.stock || 0}` : `aucune à ${J.reach} m`]);
  }
  if (!['collect', 'sell', 'relay', 'passive'].includes(J.type)) {                                  // qui vide ce bâtiment ? la grange ou l'entrepôt le plus proche à portée (sinon le stock se remplit et le travail s'arrête)
    const art = Object.keys(o.inv || {}).find(k => o.inv[k] > 0) || productOf(o) || 'minerai';
    const ramasseurs = S.houses.filter(c => c !== o && (jobOf(c) || {}).type === 'collect' && segLen([c.x, c.y], [o.x, o.y]) <= jobOf(c).reach && accepte(jobOf(c), art)).sort(byDist(o));
    const proche = S.houses.filter(c => (jobOf(c) || {}).type === 'collect' && accepte(jobOf(c), art)).sort(byDist(o))[0];
    rows.push(['Ramassage', ramasseurs[0] ? `${ramasseurs[0].type} à ${fmt(segLen([ramasseurs[0].x, ramasseurs[0].y], [o.x, o.y]), 0)} m` : `PERSONNE : aucun${proche ? ' (' + proche.type + ' à ' + fmt(segLen([proche.x, proche.y], [o.x, o.y]), 0) + ' m, portée ' + jobOf(proche).reach + ' m)' : ' entrepôt ni grange adaptés'} : construisez-en un à moins de ${proche ? jobOf(proche).reach : 300} m`]);
  }
  if (outilDe(o)) { const t = meilleurOutil(o); rows.push(['Outil', t ? `${t.nom} (efficacité ×${t.eff})` : `aucun : il lui faut ${outilManque(o)}, le travail est à l’arrêt`]); }
  if (hasOxen(o) && J.type !== 'passive') rows.push(['Bœufs', 'trajets 50 % plus rapides']);
  rows.push([J.type === 'passive' ? 'Production' : 'Ouvrier', jobLabel(null, w, J)]);
  return rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
}
/* Extensions de la ferme (h.ext : [{ k, culture, cul, t }], FERME_EXT) : production passive rangée dans la ferme (h.inv). Jardin et verger : saisons (cultures.js). */
function fermeExt(h, dt) {
  if (h.ext && h.ext.length > FERME_EXT_MAX) h.ext.length = FERME_EXT_MAX;                      // (anciennes fermes à plusieurs extensions : seule la première reste)
  for (const e of h.ext || []) {
    const d = FERME_EXT[e.k]; if (!d) continue;
    const plein = stockPlein(h);
    if (d.cult) {
      const def = CULTURE_DEFAUT[e.k], ok = !outilManqueDe(d.outil);
      cultureTick(e, d.cult, def, ok);
      const c = cultureDe(e, d.cult, def), cul = e.cul;
      if (!c || !cul || cul.etat !== 'mur' || cul.reste <= 0 || plein || !ok) continue;
      if ((e.t = (e.t === undefined ? c.cadence : e.t) - dt) <= 0) { h.inv = h.inv || {}; h.inv[c.produit] = (h.inv[c.produit] || 0) + 1; cul.reste--; e.t = c.cadence; save(); }
    } else {                                                                                     // élevage : chaque animal produit une unité toutes les d.every secondes
      if (e.n === undefined) e.n = 2;                                                              // (enclos d'avant les captures)
      if (!plein && e.n > 0 && (e.t = (e.t === undefined ? d.every : e.t) - dt * e.n) <= 0) { h.inv = h.inv || {}; h.inv[d.produit] = (h.inv[d.produit] || 0) + 1; e.t = d.every; save(); }
    }
  }
}
/* Fosse minière : le mineur sort de la cabane, va au puits, descend (il disparaît sous terre), extrait 1 minerai (job.work s, plus vite avec une bonne pioche),
   remonte avec, retourne à la cabane, y entre et y range le minerai (stockage provisoire, h.inv), se repose, puis ressort. Repères : MINE_REP (dessins.js).
   w.visible : il est dessiné même s'il est dans l'emprise du bâtiment (la cour de la fosse). */
function stepMineur(h, job, w, dt) {
  const dep = gisementSous(h), pt = k => local(h, MINE_REP[k][0], (h.front || 1) * (MINE_REP[k][1] - h.l / 2)), walkTo = (tx, ty) => marcher(w, tx, ty, WALK, dt), before = w.state;
  w.sansOutil = outilManque(h); w.plein = stockPlein(h);
  switch (w.state) {
    case 'idle': case 'wait':
      w.dedans = true; w.visible = false;
      if ((w.t = (w.t || 0) - dt) > 0) break;
      if (!dep || w.sansOutil || w.plein) { w.state = 'wait'; w.t = 1; break; }
      [w.x, w.y] = pt('porte'); w.chemin = null; w.dedans = false; w.visible = true; w.dest = pt('puits'); w.state = 'go'; break;
    case 'go': if (walkTo(...w.dest)) { w.state = 'descend'; w.t = 2; } break;
    case 'descend': if ((w.t -= dt) <= 0) { w.dedans = true; w.state = 'work'; w.t = tpsTravail(h, job.work); } break;
    case 'work': if ((w.t -= dt) <= 0) { w.dedans = false; w.carry = 'ore-clay'; w.state = 'remonte'; w.t = 2; } break;
    case 'remonte': if ((w.t -= dt) <= 0) { w.dest = pt('porte'); w.state = 'back'; } break;
    case 'back':
      if (walkTo(...w.dest)) {
        w.dedans = true; w.visible = false; w.carry = false; w.state = 'drop'; w.t = 1.5;
        if (dep) { const k = ORE[dep.kind] || 'minerai'; h.inv = h.inv || {}; h.inv[k] = (h.inv[k] || 0) + remontee(k); save(); }
      } break;
    case 'drop': if ((w.t -= dt) <= 0) { w.state = 'idle'; w.t = 3; } break;
  }
  if (w.state !== before && isOn('house', h.id, sel) && !zoneEdit) renderSel();
  return true;
}
function stepJob(h, job, dt) {
  let w = workers.get(wkey(h));
  if (!w || w.jobType !== job.type || w.jobProduct !== job.product) {
    w = { x:h.x, y:h.y, state:'idle', i:0, job:true, jobType:job.type, jobProduct:job.product, passive:job.type === 'passive' || job.type === 'craft' };
    workers.set(wkey(h), w);
  }
  if (!SLOT && h.kind === 'ferme') { cultureTick(h, 'cereale', 'ble', !outilManque(h) && aireChamps(h) > 0, aireChamps(h) / AIRE_REF); fermeExt(h, dt); }                              // saison : plantation, pousse, maturité (cultures.js)
  if (job.on === 'gisement') return stepMineur(h, job, w, dt);
  if (!SLOT && h.kind === 'ferme' && typeof stepCapture === 'function' && stepCapture(h, w, dt)) return true;   // capture d'un animal (capture.js)
  if (job.type === 'fish') return typeof stepPecheur === 'function' ? stepPecheur(h, job, w, dt) : false;   // le pêcheur : poissons.js
  const before = w.state;
  const speed = WALK * (hasOxen(h) ? 1.5 : 1);
  const walkTo = (tx, ty) => marcher(w, tx, ty, speed, dt);
  if (job.type === 'passive') {                             // pas de déplacement : un minuteur
    w.full = (h.stock || 0) >= job.cap; w.sansOutil = outilManque(h);
    if (cultivee(h)) {                                      // culture de saison : on ne cueille que ce qui est mûr (une fois cueilli, ce n'est plus sur l'arbre ni au champ)
      const c = cultureDe(h), cul = h.cul;
      if (!c || !cul || cul.etat !== 'mur' || cul.reste <= 0 || w.full || w.sansOutil) return false;
      if ((w.t = (w.t === undefined ? c.cadence : w.t) - dt) <= 0) { h.stock = (h.stock || 0) + 1; cul.reste--; w.t = c.cadence; save(); }
      return false;
    }
    if (!w.full && !w.sansOutil && (w.t = (w.t === undefined ? job.every : w.t) - dt) <= 0) { h.stock = (h.stock || 0) + 1; w.t = job.every; save(); }
    return false;                                           // rien à animer
  }
  if (job.type === 'craft') { (PRODUCTION_AUTO.has(h.kind) ? stepFonte : stepProduction)(h, w, dt); return false; }          // file de production (production.js)
  switch (w.state) {
    case 'idle': case 'wait': {
      if ((w.t = (w.t || 0) - dt) > 0) break;               // en attente : on revérifie chaque seconde
      const waitOne = () => { w.state = 'wait'; w.t = 1; };
      w.sansOutil = (job.type === 'site' || job.type === 'fetch') && outilManque(h);
      if (w.sansOutil) { waitOne(); break; }                   // règle : pas d'outil adapté, pas de travail
      w.plein = (job.type === 'site' || job.type === 'fetch') && stockPlein(h);
      if (w.plein) { waitOne(); break; }                       // stock plein : on ne produit plus
      w.attendSaison = cultivee(h) && !(h.cul && h.cul.etat === 'mur' && h.cul.reste > 0);
      if (w.attendSaison) { waitOne(); break; }                  // hors saison de récolte, rien à cueillir
      if (job.type === 'site') {
        const sites = jobSites(h, job);
        if (!sites.length) { waitOne(); break; }
        const si = sites[w.i++ % sites.length]; w.dest = si.c; w.kind = si.kind; w.state = 'go';
      } else if (job.type === 'fetch') {
        const src = jobSources(h, job).find(o => dispo(o, job.mat) >= 1);
        if (!src) { waitOne(); break; }
        prendre(src, job.mat, 1); w.load = job.mat || 'grain'; w.dest = [src.x, src.y]; w.state = 'go';
      } else if (job.type === 'collect') {
        if (COLLECTE_PAUSE && h.kind !== 'camp_mineur') { waitOne(); break; }                                            // (pause de la collecte)
        w.full = invTotal(h) >= capCollecte(h, job);
        const src = w.full ? null : S.houses.filter(o => o !== h && segLen([o.x, o.y], [h.x, h.y]) <= job.reach && collectable(o, job)).sort(byDist(h))[0];
        if (!src) { waitOne(); break; }
        w.load = collectable(src, job); const niv = niveau(h), garde = gardeDe(src, w.load);
        w.n = Math.max(1, Math.min(chargeMax(w.load, niv), Math.floor(dispo(src, w.load) - garde), capCollecte(h, job) - invTotal(h)));   // charrette : plusieurs articles d'un coup (niveau 0 : un seul)
        prendre(src, w.load, w.n); w.charge = 0; w.dest = [src.x, src.y]; w.state = 'go';
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
      if (job.type === 'site') { w.state = 'work'; w.t = tpsTravail(h, job.work); }
      else if (job.type === 'relay') { w.state = 'work'; w.t = 4; }
      else { w.state = 'take'; w.t = .8; }
      break;
    case 'take':
      if ((w.t -= dt) <= 0) { w.carry = CARRY[w.load] || 'stall-b'; w.charge = w.n || 0; w.state = 'back'; }   // (le véhicule n'est chargé qu'après la prise)
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
      if (job.type === 'site') { if (job.on === 'gisement') { const k = ORE[w.kind] || 'minerai'; h.inv = h.inv || {}; h.inv[k] = (h.inv[k] || 0) + remontee(k); } else { h.stock = (h.stock || 0) + 1; if (cultivee(h) && h.cul) h.cul.reste = Math.max(0, h.cul.reste - 1); } save(); w.state = 'idle'; w.t = 0; }
      else if (job.type === 'fetch') { w.state = 'work'; w.t = tpsTravail(h, job.work); }   // la matière arrive : on la transforme
      else if (job.type === 'collect') { h.inv = h.inv || {}; h.inv[w.load] = (h.inv[w.load] || 0) + (w.n || 1); w.n = 0; w.charge = 0; save(); w.state = 'idle'; w.t = 0; }
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
    const g = Math.min(1, p.j !== undefined ? (jourJeu() - p.j) / (p.an * 365) : ((S.simTime || 0) - p.b) / GROW), [X, Y] = toS(p.x, p.y);
    ctx.beginPath(); ctx.arc(X, Y, Math.max(1.2, (.5 + 1.3 * g) * s), 0, Math.PI * 2);
    ctx.fillStyle = Col.bush; ctx.fill(); ctx.strokeStyle = Col['tree-dark']; ctx.lineWidth = .8; ctx.stroke();
  }
  if (s > .5) for (const o of S.houses) for (const e of o.sol || []) {                           // bois laissé au sol : petites bûches couchées
    const [X, Y] = toS(e.x, e.y), L = Math.max(5, 1.8 * s), W = Math.max(2, .45 * s);
    for (let i = 0; i < Math.min(e.n, 12); i++) {
      const a = (i * 2.4 + e.x) % 3.14, dx = ((i % 4) - 1.5) * W * 1.1, dy = (Math.floor(i / 4) - 1) * W * 1.15;
      ctx.save(); ctx.translate(X + dx, Y + dy); ctx.rotate(a * .3); ctx.fillStyle = '#9a6a3a'; ctx.strokeStyle = '#4a321c'; ctx.lineWidth = 1;
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-L / 2, -W / 2, L, W, W / 2); else ctx.rect(-L / 2, -W / 2, L, W); ctx.fill(); ctx.stroke(); ctx.restore();
    }
  }
  for (const [key, w] of workers) {
    const id = typeof key === 'string' ? +key.split('#')[0] : key;                              // (ouvriers supplémentaires : clé 'id#n')
    if (w.passive || w.dedans) continue; // production sans déplacement ; ou habitant rentré dans son logement
    if (!w.visible && typeof batimentSous === 'function' && batimentSous([w.x, w.y])) continue;   // il entre : il atteint la porte puis disparaît à l'intérieur (jamais peint au-dessus d'un bâtiment)
    const [X, Y] = toS(w.x, w.y), r = Math.max(3.5, .9 * s);
    persos.push([w.x, w.y]); ctx.globalAlpha = voileBois(w.x, w.y);     // sous les arbres (voir canopeeSur)
    if (w.state === 'cut') { // coups de hache : anneau qui pulse
      ctx.beginPath(); ctx.arc(X, Y, r * (1.8 + .6 * Math.sin(now * 12)), 0, Math.PI * 2);
      ctx.strokeStyle = Col.accent; ctx.lineWidth = 1.5; ctx.stroke();
    }
    const slot = typeof key === 'string' ? +key.split('#')[1] || 0 : 0, hs = typeof VILLAGEOIS !== 'undefined' && findById('house', id), vk = hs && villageoisDe(hs.kind), V = vk && VILLAGEOIS[vk], Ls = V ? Math.max(V.T * s * 2.2, 8) : 0, nv = hs ? (typeof key === 'string' && key.includes('#p') ? hs.cartP || 0 : niveauDe(hs, slot)) : 0;       // (un peu plus grands que nature : à 8 px par mètre, un homme ne ferait que 4 px)
    const garee = nv && LUMBER[hs.kind] && w.parc && !['goCart', 'back', 'drop', 'idle', 'done', 'plein', 'sansoutil', 'prend'].includes(w.state) || (nv && LUMBER[hs.kind] && w.parc && w.state === 'idle' && w.charge < w.lim);
    if (garee && typeof peintChariot === 'function') {                                              // charrette garée devant le bois coupé (se remplit pendant qu'il abat)
      const k = nv === 1 ? 'charrette' : 'chariot_bois', A = CHARIOTS[k], L = Math.max(A.T * s * 2.2, 10), [PX, PY] = w.gare ? toS(w.gare[0], w.gare[1]) : toS(w.parc[0] - 1.2, w.parc[1] + .8), C0 = A.charge;
      if (!(w.charge > 0)) A.charge = 'aucune'; else if (A.charge === 'aucune') A.charge = LUMBER[hs.kind] ? 'bois' : hs.kind === 'fonderie' ? 'minerai' : 'marchandises';
      CH_SANS_PERSO = true; try { peintChariot(k, PX, PY, L, w.gare ? w.gareAng : .5); } finally { CH_SANS_PERSO = false; } A.charge = C0;
    }
    if (V && s > .5 && nv && !garee && typeof peintChariot === 'function') {                                // avec une amélioration : charrette à bras ou chariot, tiré par le travailleur (vide à l'aller, chargé au retour)
      if (w.px !== undefined && Math.hypot(w.x - w.px, w.y - w.py) > .02) w.ang = Math.atan2(w.y - w.py, w.x - w.px);
      else if (w.chemin && w.chemin.etapes && w.chemin.etapes.length) { const p0 = w.chemin.etapes[0].p; if (Math.hypot(p0[0] - w.x, p0[1] - w.y) > .05) w.ang = Math.atan2(p0[1] - w.y, p0[0] - w.x); }   // à l'arrêt : tourné vers où il va (pas de charrette à l'envers à la sortie)
      w.px = w.x; w.py = w.y;
      const k = nv === 1 ? 'charrette' : hs.kind === 'fonderie' || TAILLEURS[hs.kind] ? 'chariot_minerai' : LUMBER[hs.kind] ? 'chariot_bois' : 'chariot_marchandises', A = CHARIOTS[k], L = Math.max(A.T * s * 2.2, 10), xt = .5 + (A.traction === 'cheval' ? 1.9 : .6) / A.T, an = w.ang || 0, C0 = A.charge;
      if (!(w.charge > 0)) A.charge = 'aucune'; else if (A.charge === 'aucune') A.charge = LUMBER[hs.kind] ? 'bois' : hs.kind === 'fonderie' ? 'minerai' : 'marchandises';
      const cx = X - Math.cos(an) * xt * L, cy = Y - Math.sin(an) * xt * L;
      const mCh = 2.2 * A.T, ax = w.x - Math.cos(an) * xt * mCh, ay = w.y - Math.sin(an) * xt * mCh, bx = ax - Math.cos(an) * .5 * mCh, by = ay - Math.sin(an) * .5 * mCh;
      const dansBat = typeof batimentSous === 'function' && (batimentSous([ax, ay]) || batimentSous([bx, by]));               // la charrette est encore dans le bâtiment (sortie de la porte) : on ne la peint pas par-dessus
      const tB = performance.now() / 1000, dA = ((an - (w.angB === undefined ? an : w.angB) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI, dtB = Math.max(.016, tB - (w.tB || tB - .016));
      w.braq = (w.braq || 0) + (Math.max(-.6, Math.min(.6, dA / dtB * .35)) - (w.braq || 0)) * .25; w.angB = an; w.tB = tB;                // l'essieu avant (chariots à 4 roues) pivote dans les virages
      if (!dansBat) { CH_SANS_PERSO = true; try { peintChariot(k, cx, cy, L, an, w.braq); } finally { CH_SANS_PERSO = false; } }
      A.charge = C0;
      const seat = A.traction === 'cheval' ? [cx + Math.cos(an) * .35 * L, cy + Math.sin(an) * .35 * L] : [X, Y];                    // le travailleur : à la poignée de la charrette, ou sur le siège du chariot
      peintVillageois(vk, seat[0], seat[1], Ls, an);
    } else if (V && s > .5) {                                                                              // villageois du métier du bâtiment, tourné dans le sens de la marche
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
  { const hc = sel && sel.type === 'house' ? findById('house', sel.id) : null;                // camp de chasse sélectionné : le gibier détecté dans sa zone est cerclé
    if (hc && hc.kind === 'camp_chasse' && hc.zone && s > .3) for (const { g, a } of proiesDe(hc)) { const [X, Y] = toS(a.x, a.y); ctx.beginPath(); ctx.arc(X, Y, Math.max(8, g.T * 1.2 * s), 0, Math.PI * 2); ctx.strokeStyle = Col.accent; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]); } }
  // stock au-dessus de chaque bâtiment qui produit
  if (s > .9) for (const h of S.houses) {
    const J = jobOf(h), store = J && J.type === 'collect';
    const product = LUMBER[h.kind] ? productOf(h) : TAILLEURS[h.kind] ? 'pierre' : J && J.type !== 'relay' && J.type !== 'sell' ? J.product : null;
    const b = buildingOf(h), logement = b && b.cap && typeof occupation === 'function', inv = J && (J.type === 'craft' || J.on === 'gisement');
    if (!product && !logement && !inv) continue;
    // sous un logement : ses habitants
    const lignes = [];   // (rien sous les bâtiments : stock dans l'onglet STOCK de la fiche, habitants dans sa section Habitants)
    const bas = Math.max(...corners(h).map(p => p[1])), [X] = toS(h.x, h.y);   // sous le bâtiment : le nom (survol, sélection) est au-dessus
    ctx.font = '600 14px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    lignes.forEach((t, i) => haloText(t, X, bas * s + view.oy + 4 + i * 16, Col.ink, Col.sheet));
    if (store ? invTotal(h) >= capCollecte(h, J) : (product || inv) && stockPlein(h)) haloText('⚠ BÂTIMENT PLEIN', X, bas * s + view.oy + 4 + lignes.length * 16, Col.bad, Col.sheet);   // message sur le bâtiment : le stock est plein, la production s'arrête
  }
  if (s > .5) for (const h of S.houses) if (h.kind === 'camp_bucherons' && (h.stock || 0) >= 1) {      // le bois stocké au camp : un tas de bûches (une bûche pour 2 de stock, 36 au plus) dans la clairière
    const n = Math.min(36, Math.ceil(h.stock / 2)), L = Math.max(4, 1 * s), W = Math.max(2, .42 * s);
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const u = -1.2 + (i % 3) * 1.05, t = 14.6 - Math.floor(i / 3) * .55, a = LP(h, u - .45, t), b = LP(h, u + .45, t);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.strokeStyle = '#4a321c'; ctx.lineWidth = W + 1.6; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.strokeStyle = i % 2 ? '#a8733c' : '#b98a56'; ctx.lineWidth = W; ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  if (s > .5) for (const h of S.houses) {                                                  // message sur le bâtiment : outil absent, matières manquantes
    const a = alerteBat(h); if (!a) continue;
    const bas = Math.max(...corners(h).map(p => p[1])), [X] = toS(h.x, h.y);
    ctx.font = '600 14px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; haloText('⚠ ' + a, X, bas * s + view.oy + 22, Col.bad, Col.sheet);
  }
}
// boucle d'animation : tourne en continu, ne redessine que s'il y a des bûcherons au travail
let lastTs = null, moisPrec = 0;
function simLoop(ts) {
  const dt = lastTs === null ? 0 : Math.min(.1, (ts - lastTs) / 1000);
  lastTs = ts;
  S.simTime = (S.simTime || 0) + dt; // horloge de simulation (croissance des plants)
  const mois = moisDeJour(jourJeu()); if (mois !== moisPrec) { if (moisPrec) markAllDirty(); moisPrec = mois; }   // nouveau mois : les fruits apparaissent ou disparaissent des arbustes (décor en cache)
  const grew = growSaplings();
  const faune = typeof fauneStep === 'function' && fauneStep(dt), nav = typeof bateauxStep === 'function' && bateauxStep(dt), marche = typeof marcheStep === 'function' && marcheStep(dt);
  const arr = typeof arrivantsStep === 'function' && arrivantsStep(dt);
  if (typeof poissonsStep === 'function') poissonsStep(dt);
  if (simTick(dt) || grew || faune || nav || marche || arr) requestDraw();
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
    const info = a.b.need === 'game' ? ` · ${gibierZone(a.z).length} animaux sauvages` : a.b.need === 'forest' || a.b.id === 'hutte_forestier' ? ` · ${treesInZone(a.z).length} arbres` : a.b.need === 'fruit' ? ` · ${plantesZone(a.z).length} plantes fruitières` : a.b.need === 'rock' ? ` · ${rocksInZone(a.z).length} pierres` : '';
    haloText(a.why || `Zone de travail · rayon ${a.z.r} m${info}`, X, Y - 4, a.why ? Col.bad : Col.ink, Col.sheet);
  }
}
