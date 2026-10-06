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
  poissonsSave += dt;
  if (change && poissonsSave > 10) { poissonsSave = 0; save(); }
  if (change && sel && sel.type === 'lake') majLac();
  return false;
}
function pecher(lk, n = PECHE_LOT) {
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
    pris++; const st = S.stock || (S.stock = {}); st.poisson = (st.poisson || 0) + RATION;
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
