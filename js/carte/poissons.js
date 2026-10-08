/* ---------- poissons des étangs (région.html) ----------
   Chaque étang (S.lakes) a sa population : lk.fish = { k (capacité), sp:{ espèce: effectif }, vide }.
   - Espèces : celles de la région (data/regions/regions.json, peche.eau_douce, pondérées par leur abondance 1 à 3) plus,
     selon son climat (température, humidité), des espèces non comestibles. Comestible ou non : ESPECES ci-dessous.
   - Capacité : une case de 22 m² d'eau par poisson (superficie du plan d'eau), de 60 à 1 500.
   - Reproduction : croissance logistique (R par seconde), seulement pour une espèce d'au moins 2 poissons ; la population ne
     dépasse jamais la capacité.
   - Pêche : le filet retire des poissons de l'étang ; les comestibles vont au stock « poisson » du village, les non comestibles sont rejetés.
     À zéro poisson l'étang est « vide » : on ne pêche plus tant que le joueur n'a pas réintroduit des poissons et que
     la reproduction n'a pas ramené la population à 25 % de la capacité. */
const ESPECES = {
  brochet:{ nom:'Brochet' }, perche:{ nom:'Perche' }, coregone:{ nom:'Corégone' }, esturgeon:{ nom:'Esturgeon' }, truite:{ nom:'Truite' },
  truite_rouge:{ nom:'Truite rouge' }, saumon:{ nom:'Saumon' }, saumon_pacifique:{ nom:'Saumon du Pacifique' }, sandre:{ nom:'Sandre' },
  carpe:{ nom:'Carpe' }, carpe_amour:{ nom:'Carpe amour' }, anguille:{ nom:'Anguille' }, silure_americain:{ nom:'Silure américain' },
  silure_nil:{ nom:'Silure du Nil' }, tilapia:{ nom:'Tilapia' }, gourami:{ nom:'Gourami' }, capitaine:{ nom:'Capitaine' }, arapaima:{ nom:'Arapaïma' },
  surubi:{ nom:'Surubi' }, barramundi:{ nom:'Barramundi' }, pejerrey:{ nom:'Pejerrey' }, morue_murray:{ nom:'Morue de Murray' },
  carassin:{ nom:'Carassin', non:'chair vaseuse' },
  vairon:{ nom:'Vairon', non:'trop petit' }, epinoche:{ nom:'Épinoche', non:'trop petite' }, tetraodon:{ nom:'Tétrodon', non:'toxique' }, killi:{ nom:'Killi du désert', non:'minuscule' },
};
const comestible = id => !(ESPECES[id] && ESPECES[id].non);
const RATION = 2, PECHE_LOT = 5, REINTRO_LOT = 10, LAC_M2 = 22, REPRO = .012, VIDE_FIN = .25;
// espèces non comestibles présentes selon le climat de la région
function nonComestibles(tm, hum) {
  const l = [];
  if (tm <= 15) l.push('epinoche');
  if (tm >= 5 && tm <= 22) l.push('vairon');
  if (tm >= 22) l.push('tetraodon');
  if (hum <= .4) l.push('killi');
  return l.length ? l : ['vairon'];
}
const PAR_DEFAUT = { polaire:['coregone'], toundra:['coregone', 'brochet'], taiga:['brochet', 'perche'], tempere:['perche', 'brochet', 'carpe'], prairie:['carpe', 'perche'],
  subtropicale:['tilapia', 'carpe'], mediterraneenne:['carpe', 'anguille'], mousson:['tilapia', 'gourami'], desert_aride:['tilapia'], xerophyte:['tilapia'] };
let poissonsRegion = null;   // { liste:{ espèce: abondance }, tm, hum } une fois les données de la région lues
const REGION_ID = GAME ? GAME.region : (typeof FORME_ID !== 'undefined' ? FORME_ID : null);
(async () => {
  let r = null;
  try { if (REGION_ID) r = (await (await fetch('data/regions/regions.json')).json()).find(x => x.id === REGION_ID) || null; } catch (e) {}
  const biome = (r && r.climat && r.climat.biome) || S.biome, tm = r ? r.climat.temperature_c : 12, hum = r ? r.climat.humidite : .7;
  const liste = r && r.peche && Object.keys(r.peche.eau_douce || {}).length ? { ...r.peche.eau_douce } : Object.fromEntries((PAR_DEFAUT[biome] || PAR_DEFAUT.tempere).map(k => [k, 2]));
  poissonsRegion = { liste, tm, hum };
  if (sel && sel.type === 'lake') renderSel();
})();
const lacId = () => S.lakes.forEach((l, i) => { if (l.id == null) l.id = i + 1; });
function airePoly(P) { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; }
const totalPoissons = f => Object.values(f.sp).reduce((s, n) => s + n, 0);
// la population d'un étang (créée au premier accès, avec des tirages propres à l'étang : toujours la même au départ)
function poissonsLac(lk) {
  if (lk.fish) return lk.fish;
  if (!poissonsRegion) return null;
  lacId();
  const rnd = seeded(S.landSeed * 17 + lk.id * 131), k = Math.max(60, Math.min(1500, Math.round(airePoly(lakeShape(lk)) / LAC_M2)));
  const poids = {}; for (const [e, a] of Object.entries(poissonsRegion.liste)) poids[e] = a * 3;
  for (const e of nonComestibles(poissonsRegion.tm, poissonsRegion.hum)) poids[e] = 1;
  const somme = Object.values(poids).reduce((s, n) => s + n, 0), depart = k * (.7 + rnd() * .25), sp = {};
  for (const [e, w] of Object.entries(poids)) sp[e] = Math.round(depart * w / somme * 10) / 10;
  return lk.fish = { k, sp, vide:false };
}
let poissonsSave = 0;
// appelé à chaque image par simLoop : reproduction
function poissonsStep(dt) {
  if (!poissonsRegion) return false;
  let change = false;
  for (const lk of S.lakes) {
    const f = poissonsLac(lk); if (!f) continue;
    const N = totalPoissons(f);
    if (N >= 1 && N < f.k) for (const e in f.sp) if (f.sp[e] >= 2) { f.sp[e] = Math.min(f.sp[e] + REPRO * f.sp[e] * (1 - N / f.k) * dt, f.sp[e] * 1.5); change = true; }
    if (f.vide && totalPoissons(f) >= VIDE_FIN * f.k) { f.vide = false; change = true; }
  }
  if (majJourPeche()) change = true;                                                // chaque jour : potentiel des spots de pêche
  poissonsSave += dt;
  if (change && poissonsSave > 10) { poissonsSave = 0; save(); }
  if (change && sel && sel.type === 'lake') majLac();
  return false;
}
function pecher(lk, n = PECHE_LOT, versStock = true) {
  const f = poissonsLac(lk); if (!f || f.vide) return 0;
  let pris = 0;
  for (let i = 0; i < n; i++) {
    const N = totalPoissons(f); if (N < 1) break;
    let t = Math.random() * N, e = null;
    for (const k in f.sp) { t -= f.sp[k]; if (t <= 0) { e = k; break; } }
    e = e || Object.keys(f.sp)[0];
    if (f.sp[e] < 1) { f.sp[e] = 0; continue; }
    f.sp[e] -= 1;                                                          // le filet prend tout : un poisson non comestible est rejeté, mort
    if (!comestible(e)) continue;
    pris++;
  }
  for (const k in f.sp) if (f.sp[k] < 1) f.sp[k] = 0;
  if (totalPoissons(f) < 1) { f.vide = true; for (const k in f.sp) f.sp[k] = 0; }   // plus un poisson : l'étang est vide
  save();
  return pris;
}
function reintroduire(lk, e, n = REINTRO_LOT) {
  const f = poissonsLac(lk); if (!f) return;
  f.sp[e] = Math.min((f.sp[e] || 0) + n, f.k);
  save();
}
// fiche de l'étang (panneau de sélection)
const lacOf = () => { const o = findSel(); return o && sel.type === 'lake' ? o : null; };
function rendreLac(body, lk) {
  const f = poissonsLac(lk);
  if (!f) { body.innerHTML = '<p class="muted">Étang : lecture des poissons de la région…</p>'; return; }
  const edibles = Object.keys(f.sp).filter(comestible);
  body.innerHTML = `
    <dl class="kv"><dt>Étang</dt><dd>n° ${lk.id} · ${fmt(airePoly(lakeShape(lk)), 0)} m²</dd>
    <dt>Poissons</dt><dd><b id="lac-n"></b> / ${f.k} <span class="muted" id="lac-p"></span></dd>
    <dt>État</dt><dd id="lac-etat"></dd></dl>
    <div class="lac-barre"><i id="lac-bar"></i></div>
    <table class="lac-tab"><tbody>${Object.keys(f.sp).map(e => `<tr><td>${ESPECES[e] ? ESPECES[e].nom : e}</td>
      <td class="muted">${comestible(e) ? 'comestible' : 'non comestible (' + ESPECES[e].non + ')'}</td><td id="lac-${e}"></td>
      <td>${comestible(e) ? `<button data-reintro="${e}" title="Ajoute ${REINTRO_LOT} poissons de cette espèce">Réintroduire</button>` : ''}</td></tr>`).join('')}</tbody></table>
    <div class="row" style="margin-top:8px"><button id="lac-pecher">Pêcher ${PECHE_LOT} poissons</button></div>
    <p class="muted" style="margin-top:8px">Le filet prend tout : les poissons non comestibles sont rejetés (et retirés de l'étang). À zéro poisson, l'étang est vide : réintroduisez des poissons, puis attendez leur reproduction (25 % de la capacité) avant de pêcher à nouveau.</p>`;
  $('lac-pecher').addEventListener('click', () => { const n = pecher(lk); flash(n ? `${n} poisson${n > 1 ? 's' : ''} pêché${n > 1 ? 's' : ''}` : 'Rien de comestible dans le filet', !n); majLac(); lastStatus = ''; });
  body.querySelectorAll('[data-reintro]').forEach(b => b.addEventListener('click', () => { reintroduire(lk, b.dataset.reintro); flash(`${ESPECES[b.dataset.reintro].nom} : ${REINTRO_LOT} poissons réintroduits`); majLac(); }));
  majLac();
}
// met à jour les chiffres de la fiche sans la reconstruire
function majLac() {
  const lk = lacOf(), f = lk && lk.fish; if (!f || !$('lac-n').isConnected) return;
  const N = totalPoissons(f);
  $('lac-n').textContent = Math.floor(N); $('lac-p').textContent = `(${Math.round(N / f.k * 100)} %)`; $('lac-bar').style.width = Math.min(100, N / f.k * 100) + '%';
  $('lac-etat').textContent = f.vide ? `Étang vide : réintroduisez des poissons (pêche impossible jusqu'à ${Math.ceil(VIDE_FIN * f.k)} poissons)` : 'Peuplé : on peut pêcher';
  for (const e in f.sp) if ($('lac-' + e)) $('lac-' + e).textContent = Math.floor(f.sp[e]);
  $('lac-pecher').disabled = !!f.vide;
}
// sélection d'un étang : clic dans l'eau (outil de sélection)
function hitLake(x, y) {
  lacId();
  for (const lk of S.lakes) { const P = lakeShape(lk); if (inPoly([x, y], P)) return lk; }
  return null;
}

/* ---------- le pêcheur et les spots de pêche ----------
   Le long de chaque rivière (un spot tous les ~TRONCON_M m) et sur la rive de chaque étang (un tous les ~SPOT_LAC_M m) il y a des SPOTS DE PÊCHE (points d'attache). Un spot : rec = { pot, connu, essais, prises } rangé dans
   rv.sp / lk.sp. La cabane doit avoir un spot (h.eau : { t:'riviere', n, k } ou { t:'lac', id, k }, choisi dans la fiche puis un clic sur le spot) : sans lui, personne ne pêche.
   - pot : le potentiel RÉEL du spot (0 à 100 %, tiré au hasard au départ), caché au joueur : la chance de prendre un poisson à chaque coup de ligne. Plus il est bas, plus un poisson met de temps à venir. Il ne change
     qu'une fois par jour (majJourPeche) : pour chaque poisson pris la veille, le spot perd COUP_JOUR et un autre spot du même plan d'eau le gagne (les poissons se déplacent).
   - connu : ce que le joueur sait du spot, déduit par le pêcheur de ce qu'il a pris : le taux de réussite du dernier jour pêché (null : inconnu). Mis à jour une fois par jour, comme le potentiel.
   Le pêcheur pêche à son spot jusqu'à PECHE_JOUR (10) poissons, puis range son matériel et rentre ; ses poissons restent à la cabane. Pour changer de zone, le joueur choisit un autre spot. */
const PECHE_JOUR = 10, PECHE_RAYON = 1000, TRONCON_M = 60, SPOT_LAC_M = 60, COUP_JOUR = .03;
const tronconsCache = new WeakMap();
function tronconsRiviere(rv) {                                              // positions des spots d'une rivière : [{ k, c:centre, i:segment }]
  const P = rv.pts, key = P.length + ':' + P[0] + ':' + P[P.length - 1], hit = tronconsCache.get(rv); if (hit && hit.key === key) return hit.l;
  const cum = [0]; for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + segLen(P[i - 1], P[i]));
  const tot = cum[cum.length - 1], n = Math.max(1, Math.round(tot / TRONCON_M)), l = [];
  const at = d => { let i = 1; while (i < P.length - 1 && cum[i] < d) i++; const t = Math.max(0, Math.min(1, (d - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1))); return { c:[P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t], i:i - 1 }; };
  for (let k = 0; k < n; k++) { const m = at((k + .5) * tot / n); l.push({ k, c:m.c, i:m.i }); }
  tronconsCache.set(rv, { key, l }); return l;
}
const lacSpotsCache = new WeakMap();
function lacSpotsPos(lk) {                                                  // positions des spots d'un étang : points de sa rive
  const P = lakeShape(lk), hit = lacSpotsCache.get(lk); if (hit && hit.n === P.length) return hit.l;
  const cum = [0]; for (let i = 1; i <= P.length; i++) cum.push(cum[i - 1] + segLen(P[i - 1], P[i % P.length]));
  const tot = cum[P.length], n = Math.max(3, Math.round(tot / SPOT_LAC_M)), l = [];
  for (let k = 0; k < n; k++) { const d = (k + .5) * tot / n; let i = 1; while (i < P.length && cum[i] < d) i++; const a = P[i - 1], b = P[i % P.length], t = (d - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1); l.push({ k, c:[a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] }); }
  lacSpotsCache.set(lk, { n:P.length, l }); return l;
}
const spotsPos = c => c.kind === 'lac' ? lacSpotsPos(c.lk) : tronconsRiviere(c.rv);
function spotsDe(c) {                                                       // les spots (enregistrements) d'une rivière ou d'un étang, créés au premier accès
  const o = c.kind === 'lac' ? c.lk : c.rv, pos = spotsPos(c);
  if (!o.sp || o.sp.length !== pos.length) {
    const rnd = seeded(Math.round((c.kind === 'lac' ? o.c[0] * 7 + o.c[1] * 13 : o.pts[0][0] * 7 + o.pts[0][1] * 13)) + pos.length);
    o.sp = pos.map(() => ({ pot:round2(rnd()), connu:null, essais:0, prises:0 }));
  }
  return o.sp;
}
const potentielLac = lk => { const f = poissonsLac(lk); return !f || f.vide ? 0 : Math.min(1, totalPoissons(f) / (.8 * f.k)); };
// tous les plans d'eau : [{ kind, lk | rv, n | id }]
const corpsDEau = () => [...S.rivers.map((rv, n) => ({ kind:'riviere', rv, n })), ...(lacId(), S.lakes.map(lk => ({ kind:'lac', lk, id:lk.id })))];
// le spot choisi par une cabane : { ...plan d'eau, k, rec, pos }, ou null
/* Un spot par pêcheur : h.eaux[numéro du pêcheur] (h.eau : le spot du premier, ancien format). Un spot déjà pris par un autre pêcheur (de n'importe quelle cabane) ne peut pas être choisi. */
const refPeche = (h, slot) => h.eaux ? h.eaux[slot] || null : slot === 0 ? h.eau || null : null;
function poseRef(h, slot, ref) { h.eaux = h.eaux || (h.eau ? [h.eau] : []); h.eaux[slot] = ref; h.eau = h.eaux[0] || null; }
const memeSpot = (a, b) => !!a && !!b && a.t === b.t && a.k === b.k && (a.t === 'lac' ? a.id === b.id : a.n === b.n);
function spotPris(ref, h, slot) {                                                          // un autre pêcheur y pêche déjà
  for (const o of S.houses) if (o.kind === 'cabane_peche') for (let i = 0; i < Math.max(1, nbReel(o)); i++) if (!(o === h && i === slot) && memeSpot(refPeche(o, i), ref)) return true;
  return false;
}
function eauDe(h, slot = SLOT) {
  const e = refPeche(h, slot); if (!e) return null;
  const c = e.t === 'lac' ? (lacId(), S.lakes.filter(l => l.id === e.id).map(lk => ({ kind:'lac', lk, id:lk.id }))[0]) : S.rivers[e.n] && { kind:'riviere', rv:S.rivers[e.n], n:e.n };
  if (!c) return null;
  if (e.k == null) { const P = spotsPos(c); let bd = Infinity; P.forEach(t => { const d = segLen(t.c, [h.x, h.y]); if (d < bd) { bd = d; e.k = t.k; } }); }   // plan d'eau défini avant les spots : le spot le plus proche de la cabane
  const pos = spotsPos(c)[e.k]; return pos ? { ...c, k:e.k, rec:spotsDe(c)[e.k], pos } : null;
}
const connuTexte = rec => rec && rec.connu != null ? rec.connu + ' %' : '?';
function eauTexte(h, slot = 0) {
  const e = eauDe(h, slot); if (!e) return 'à choisir (obligatoire pour pêcher)';
  return `${e.kind === 'lac' ? 'étang n° ' + e.lk.id : 'rivière n° ' + (e.n + 1)} · spot ${e.k + 1} · potentiel estimé : ${e.rec.connu != null ? e.rec.connu + ' % (d\'après la pêche du dernier jour)' : 'inconnu (pas encore pêché ici)'}${spotPeche(h, e).inaccessible ? ' · INACCESSIBLE : il faut un pont' : ''}`;
}
// un point de terre ferme près de c (hors de l'eau avec une marge, hors bâtiment), en essayant les directions dirs dans l'ordre : là où le pêcheur se tient
function pointDeTerre(c, dirs, dmin) {
  for (let d = dmin; d <= 45; d += 1.5) for (const v of dirs) { const p = [c[0] + v[0] * d, c[1] + v[1] * d]; if (inTerrain(p) && !fauneEau(p[0], p[1], 1.2) && !batimentSous(p)) return p; }
  return null;
}
/* Personne ne traverse l'eau : seul un pont (route) permet de franchir une rivière. Chemin de la cabane à un point B (aller et retour, les mêmes trajets que la marche du pêcheur : trajet(), deplacements.js) :
   ok = aucun tronçon hors route ne traverse l'eau ; len = longueur totale. */
const eauSur = (p, q) => { const n = Math.ceil(segLen(p, q) / 2); for (let i = 1; i < n; i++) if (fauneEau(p[0] + (q[0] - p[0]) * i / n, p[1] + (q[1] - p[1]) * i / n, -.4)) return true; return false; };
function accesPeche(h, B) {
  let ok = true, len = 0;
  for (const [A, Z] of [[[h.x, h.y], B], [B, [h.x, h.y]]]) { let prev = A; for (const st of trajet(A, Z)) { len += segLen(prev, st.p); if (!st.route && eauSur(prev, st.p)) ok = false; prev = st.p; } }
  return { ok, len };
}
const spotCache = new Map();
// le lieu de pêche de la cabane : le spot choisi, avec le point d'eau (eau) et la berge de terre où se tenir (rive). Rivière : les deux berges sont essayées, on prend celle dont le chemin ne traverse pas l'eau et qui est la plus courte
// (inaccessible : aucune berge n'est atteignable sans pont).
function spotPeche(h, e) {
  const cle = h.id + ':' + e.kind + ':' + (e.kind === 'lac' ? e.id : e.n) + ':' + e.k + '@' + sceneV + ':' + Math.round(h.x) + ',' + Math.round(h.y), hit = spotCache.get(cle); if (hit) return hit;
  const t = e.pos.c; let res;
  if (e.kind === 'lac') {
    const P = lakeShape(e.lk), g = [P.reduce((q, p) => q + p[0], 0) / P.length, P.reduce((q, p) => q + p[1], 0) / P.length], L = segLen(g, t) || 1, v = [(t[0] - g[0]) / L, (t[1] - g[1]) / L];
    res = { kind:'lac', lk:e.lk, rec:e.rec, eau:t, rive:pointDeTerre(t, [v], 2) || [t[0] + v[0] * 6, t[1] + v[1] * 6] };
  } else {
    const R = e.rv.pts, a = R[e.pos.i], b = R[e.pos.i + 1], dl = segLen(a, b) || 1, n = [-(b[1] - a[1]) / dl, (b[0] - a[0]) / dl];
    const cands = [n, [-n[0], -n[1]]].map(v => pointDeTerre(t, [v], 1)).filter(Boolean).map(rive => ({ rive, ...accesPeche(h, rive) })).sort((p, q) => (q.ok - p.ok) || (p.len - q.len));
    const c = cands[0];
    res = { kind:'riviere', rv:e.rv, rec:e.rec, eau:t, rive:c ? c.rive : [t[0] + n[0] * 8, t[1] + n[1] * 8], inaccessible:!c || !c.ok };
  }
  if (spotCache.size > 200) spotCache.clear();
  spotCache.set(cle, res); return res;
}
// un coup de ligne : 1 si un poisson comestible est pris (chance = potentiel réel du spot, que le joueur ne voit pas)
function coupDeLigne(spot) {
  const r = spot.rec; r.essais++;
  if (Math.random() >= r.pot) return 0;
  const n = spot.kind === 'lac' ? pecher(spot.lk, 1, false) : 1;
  r.prises += n; return n;
}
// une fois par jour : le pêcheur en déduit le potentiel connu du spot (taux de réussite), le potentiel réel baisse avec les prises et remonte
function majJourPeche() {
  if (typeof jourJeu !== 'function' || !poissonsRegion) return false;
  const j = Math.floor(jourJeu()); if (S.jourPeche === undefined) { S.jourPeche = j; return false; }
  if (j === S.jourPeche) return false;
  S.jourPeche = j;
  for (const c of corpsDEau()) {
    const recs = spotsDe(c), n = recs.length;
    recs.forEach((r, i) => {                                                  // ce qui est pris à un spot passe à un autre spot du plan d'eau
      if (!r.prises || n < 2) return;
      const q = Math.min(r.pot, COUP_JOUR * r.prises), k = (i + 1 + Math.floor(Math.random() * (n - 1))) % n;
      r.pot = Math.max(0, r.pot - q); recs[k].pot = Math.min(1, recs[k].pot + q);
    });
  }
  for (const c of corpsDEau()) for (const r of spotsDe(c)) {
    if (r.essais) r.connu = Math.round(r.prises / r.essais * 100);
    r.essais = r.prises = 0;
  }
  save(); return true;
}
/* Travail demandé « Produire de l'huile de poisson » : les pêcheurs restent à la cabane et pressent le poisson de son stock (HUILE.POISSONS unités donnent 1 huile en HUILE.TEMPS s, par ouvrier). */
const HUILE = { POISSONS:4, TEMPS:20 };
function stepHuile(h, w, dt) {
  w.dedans = true; w.visible = false; w.carry = null;
  if ((h.stock || 0) < HUILE.POISSONS) { w.state = 'wait'; w.t = undefined; return true; }
  w.state = 'huile'; w.t = (w.t === undefined ? HUILE.TEMPS : w.t) - dt;
  if (w.t <= 0) { h.stock -= HUILE.POISSONS; h.inv = h.inv || {}; h.inv['huile de poisson'] = (h.inv['huile de poisson'] || 0) + 1; w.t = HUILE.TEMPS; save(); }
  return true;
}
function stepPecheur(h, job, w, dt) {
  if (actDe(h) === 'huile') return stepHuile(h, w, dt);
  if (w.dedans) { w.dedans = false; w.state = 'idle'; w.t = 0; }                                  // (retour à la pêche)
  const before = w.state, vite = WALK * (hasOxen(h) ? 1.5 : 1), marche = (x, y) => marcher(w, x, y, vite, dt);
  switch (w.state) {
    case 'idle': case 'wait': {
      if ((w.t = (w.t || 0) - dt) > 0) break;
      const eau = eauDe(h);
      if (w.sansEau = !eau) { w.state = 'wait'; w.t = 1; break; }                             // règle : pas de spot de pêche choisi, pas de pêche
      if (w.sansOutil = outilManque(h)) { w.state = 'wait'; w.t = 1; break; }                 // règle : pas d'outil adapté, pas de pêche
      if (w.plein = stockPlein(h)) { w.state = 'wait'; w.t = 1; break; }                      // cabane pleine : il ne pêche plus
      if (w.eauVide = eau.kind === 'lac' && potentielLac(eau.lk) <= 0) { w.state = 'wait'; w.t = 1; break; }
      const sp = spotPeche(h, eau);
      if (w.inacc = !!sp.inaccessible) { w.state = 'wait'; w.t = 1; break; }                // spot de l'autre côté d'une rivière sans pont : il n'y va pas
      w.spot = sp; w.panier = 0; w.state = 'go'; break;
    }
    case 'go':
      if (marche(w.spot.rive[0], w.spot.rive[1])) { w.ang = Math.atan2(w.spot.eau[1] - w.y, w.spot.eau[0] - w.x); w.state = 'install'; w.t = 3; }   // face à l'eau
      break;
    case 'install': if ((w.t -= dt) <= 0) { w.state = 'peche'; w.t = tpsTravail(h, job.work); } break;
    case 'peche':
      if ((w.t -= dt) > 0) break;
      w.panier += coupDeLigne(w.spot);
      if (w.panier >= PECHE_JOUR || (w.spot.kind === 'lac' && potentielLac(w.spot.lk) <= 0)) { w.state = 'range'; w.t = 2.5; } else w.t = tpsTravail(h, job.work);
      break;
    case 'range': if ((w.t -= dt) <= 0) { w.carry = w.panier ? CARRY.poisson : null; w.state = 'back'; } break;
    case 'back': if (marche(h.x, h.y)) { w.state = 'drop'; w.t = DROP_TIME; } break;
    case 'drop':
      if ((w.t -= dt) > 0) break;
      if (w.panier) { h.stock = (h.stock || 0) + RATION * w.panier; save(); }   // les poissons restent à la cabane (comme le bois au camp) : le stock du village les compte, la grange vient les ramasser
      w.panier = 0; w.carry = null; w.state = 'idle'; w.t = 0; break;
  }
  if (w.state !== before && isOn('house', h.id, sel) && !zoneEdit) renderSel();
  return true;
}
/* Choix du spot (eauEdit : { id } de la cabane) : un clic sur un spot de pêche, à moins de PECHE_RAYON de la cabane. */
function refSpotSous(p, h) {
  let best = null, bd = Math.max(8, 14 / view.s);
  for (const c of corpsDEau()) for (const t of spotsPos(c)) {
    const d = segLen(p, t.c); if (d < bd && (!h || segLen(t.c, [h.x, h.y]) <= PECHE_RAYON)) { bd = d; best = c.kind === 'lac' ? { t:'lac', id:c.id, k:t.k } : { t:'riviere', n:c.n, k:t.k }; }
  }
  return best;
}
function choisirEau() {
  const h = findById('house', eauEdit.id), slot = eauEdit.slot || 0, ref = cursor && h && refSpotSous(cursor, h);
  if (!h) { eauEdit = null; return; }
  if (!ref) { flash('Cliquez sur un spot de pêche (point d\'attache le long d\'une rivière ou d\'un étang)', true); return; }
  if (spotPris(ref, h, slot)) { flash('Ce spot est déjà utilisé par un autre pêcheur', true); return; }
  commit(); poseRef(h, slot, ref); eauEdit = null; changed(false); flash('Spot de pêche choisi pour le pêcheur ' + (slot + 1));
  const e = eauDe(h, slot);                                                              // ce pêcheur, en route ou à la pêche, change tout de suite de spot (il garde ses poissons)
  if (e && spotPeche(h, e).inaccessible) flash("Spot inaccessible : il faut un pont pour y arriver sans traverser la rivière", true);
  const w = workers.get(slot ? h.id + '#' + slot : h.id);
  if (e && w && ['go', 'install', 'peche', 'range'].includes(w.state)) {
    const sp = spotPeche(h, e); w.chemin = null; w.carry = null;
    if (sp.inaccessible) { w.state = 'wait'; w.t = 0; w.inacc = true; } else { w.spot = sp; w.state = 'go'; }
  }
}
// affichage : pendant le choix, tous les spots à portée avec le potentiel connu (« ? » : inconnu) ; sinon le spot de la cabane sélectionnée
function drawEauPeche() {
  const h = eauEdit ? findById('house', eauEdit.id) : sel && sel.type === 'house' ? findById('house', sel.id) : null;
  if (!h || h.kind !== 'cabane_peche') return;
  const s = view.s, r = Math.max(5, 2.6 * s), terre = (t, e) => {                                                // la rive de terre où le pêcheur se tient : un petit carré relié au spot
    const sp = spotPeche(h, e), [X, Y] = toS(sp.rive[0], sp.rive[1]), [X0, Y0] = toS(t.c[0], t.c[1]), q = Math.max(3, 1.1 * s);
    ctx.setLineDash([3, 3]); ctx.strokeStyle = Col.accent; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X, Y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = sp.inaccessible ? Col.bad : '#8a6a3a'; ctx.fillRect(X - q, Y - q, q * 2, q * 2); ctx.strokeStyle = Col.sheet; ctx.lineWidth = 1.2; ctx.strokeRect(X - q, Y - q, q * 2, q * 2);
  }, pastille = (t, rec, actif, pris) => {
    const [X, Y] = toS(t.c[0], t.c[1]);
    ctx.beginPath(); ctx.moveTo(X, Y - r); ctx.lineTo(X + r, Y); ctx.lineTo(X, Y + r); ctx.lineTo(X - r, Y); ctx.closePath();                       // un losange : point d'attache
    ctx.fillStyle = pris ? '#3a3a3a' : rec.connu == null ? '#9aa4a8' : `hsl(${Math.round(rec.connu * 1.1)},60%,45%)`; ctx.fill(); ctx.strokeStyle = actif ? Col.accent : Col.sheet; ctx.lineWidth = actif ? 3 : 1.5; ctx.stroke();
    if (s > .3) { ctx.font = '600 12px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; haloText(pris ? 'pris' : connuTexte(rec), X, Y - r - 2, Col.ink, Col.sheet); }
  };
  if (eauEdit) {
    hint("Pêcheur " + ((eauEdit.slot || 0) + 1) + " : cliquez sur un spot libre (Échap : annuler) · % = potentiel estimé, ? = inconnu, pris = déjà utilisé");
    const slot = eauEdit.slot || 0, sous = cursor && refSpotSous(cursor, h), e0 = eauDe(h, slot);
    for (const c of corpsDEau()) { const recs = spotsDe(c); for (const t of spotsPos(c)) if (segLen(t.c, [h.x, h.y]) <= PECHE_RAYON) pastille(t, recs[t.k], !!sous && !spotPris(sous, h, slot) && sous.k === t.k && (sous.t === 'lac' ? c.kind === 'lac' && c.id === sous.id : c.kind === 'riviere' && c.n === sous.n) || !!e0 && e0.kind === c.kind && e0.k === t.k && (c.kind === 'lac' ? e0.id === c.id : e0.n === c.n), spotPris(c.kind === 'lac' ? { t:'lac', id:c.id, k:t.k } : { t:'riviere', n:c.n, k:t.k }, h, slot)); }
    return;
  }
  for (let i = 0; i < Math.max(1, nbReel(h)); i++) { const e = eauDe(h, i); if (e) { terre(e.pos, e); pastille(e.pos, e.rec, true); } }
}
