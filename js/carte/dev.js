/* ---------- mode développeur : journal des ressources ----------
   Activé / désactivé par Ctrl + Maj + D (ou en ouvrant la page avec ?dev) ; le choix est gardé dans le navigateur (clé DEV_CLE). Désactivé, il ne coûte rien : rien n'est enregistré ni affiché.
   Activé, un panneau (en bas à gauche) liste chaque mouvement de ressource : ENTRÉE (production, dépôt : la quantité augmente dans un bâtiment), SORTIE (consommation, prélèvement : elle diminue),
   TRANSFERT (d'un bâtiment à un autre, même quantité, au même instant), avec qui l'a fait (le bâtiment et le numéro de l'ouvrier, son état) et pour quel bâtiment.
   Principe : on photographie les contenus de tous les bâtiments (inv, mat, stock, vivres) avant chaque ouvrier de simTick (jrActeur) et on compare : toute variation est attribuée à l'ouvrier qui vient d'agir,
   Historique par bâtiment (JR.hist : tout ce qui entre, sort, est pris pour lui ou déposé par lui, sans limite pratique) : en sélectionnant un bâtiment, le panneau n'affiche que le sien.
   quel que soit le code qui l'a causée (rien à instrumenter). Les changements hors des ouvriers (clic du joueur : construction payée, amélioration…) sont attribués à « Joueur / système ». */
const DEV_CLE = 'paperConquestDev';
/* BASE DE DONNÉES DÉVELOPPEUR : tout réglage fait ici (stocks maximum, heure, actions) est inscrit sur le serveur de logs (tools/serveur-logs.js, fichier ~/.paper-conquest-dev/base.json) en plus du navigateur ;
   au chargement, le navigateur reprend ce que contient la base. Sans serveur, rien ne casse : le navigateur garde ses valeurs. */
const BASE_URL = 'http://localhost:8001/base'; let baseHorsLigne = 0;
function baseEnvoyer(chemin, corps) {
  if (Date.now() < baseHorsLigne) return Promise.resolve(null);
  return fetch(BASE_URL + chemin, { method:'POST', headers:{ 'Content-Type':'text/plain' }, body:JSON.stringify(corps), keepalive:true }).catch(() => { baseHorsLigne = Date.now() + 30000; return null; });
}
const baseVariable = (collection, cle, valeur) => { baseEnvoyer('/set', { collection, cle, valeur }); if (typeof jeuLog === 'function') jeuLog('base ' + collection + '.' + cle, valeur); };    // inscrit (ou supprime : valeur null) une variable
const baseAction = (nom, detail) => { baseEnvoyer('/action', { nom, detail }); if (typeof jeuLog === 'function') jeuLog('action développeur ' + nom, detail); };
const JR = { vue:true, voies:false, infos:false, actif:false, ev:[], hist:new Map(), snap:new Map(), cur:null, max:500, pause:false, filtre:'' };
try { JR.actif = localStorage.getItem(DEV_CLE) === '1' || /[?&]dev\b/.test(location.search); } catch (e) {}
const jrNom = h => { const m = S.houses.filter(o => o.kind === h.kind).sort((a, b) => a.id - b.id); return h.type + (m.length > 1 ? ' n°' + (m.indexOf(h) + 1) : ''); };
function jrPhoto() {
  const m = new Map();
  for (const h of S.houses) {
    const o = {}, add = (k, q) => { if (q > 0) o[k] = (o[k] || 0) + q; };
    for (const [k, q] of Object.entries(h.inv || {})) add(k, q);
    for (const [k, q] of Object.entries(h.mat || {})) add(k, q);
    for (const [k, q] of Object.entries(h.vivres || {})) add(k, q);
    const p = typeof surStockCentral === 'function' && surStockCentral(h) ? null : productOf(h); if (p && h.stock > 0) add(p, h.stock);
    m.set(h.id, o);
  }
  return m;
}
const jrQui = c => !c ? 'Joueur / système' : jrNom(c.h) + ' · ouvrier ' + (c.slot + 1) + (c.w && c.w.state ? ' (' + c.w.state + ')' : '');
function jrDiff(avant, apres, c) {
  const par = new Map();                                                                    // article → [{ h, d }]
  for (const [id, o] of apres) {
    const a = avant.get(id) || {};
    for (const k of new Set([...Object.keys(o), ...Object.keys(a)])) { const d = Math.round(((o[k] || 0) - (a[k] || 0)) * 100) / 100; if (d) { if (!par.has(k)) par.set(k, []); par.get(k).push({ id, d }); } }
  }
  for (const [id, a] of avant) if (!apres.has(id)) for (const [k, q] of Object.entries(a)) { if (!par.has(k)) par.set(k, []); par.get(k).push({ id, d:-q, supprime:true }); }   // (bâtiment supprimé)
  const nom = id => { const h = S.houses.find(o => o.id === id); return h ? jrNom(h) : 'bâtiment supprimé'; };
  const heure = libelleHeure(heureCarte()), jour = Math.floor(jourJeu()), qui = jrQui(c), pour = c ? jrNom(c.h) : null;
  const pousse = e => {
    const ev = { jour, heure, qui, pour, pourId:c ? c.h.id : null, ...e }; JR.ev.unshift(ev);
    for (const id of new Set([ev.deId, ev.versId, ev.pourId].filter(x => x != null))) { let l = JR.hist.get(id); if (!l) JR.hist.set(id, l = []); l.push(ev); if (l.length > 5000) l.shift(); }          // (par bâtiment : du plus ancien au plus récent)
  };
  for (const [k, L] of par) {
    const neg = L.filter(x => x.d < 0), pos = L.filter(x => x.d > 0);
    if (neg.length === 1 && pos.length === 1 && Math.abs(neg[0].d + pos[0].d) < .011) pousse({ type:'transfert', art:k, q:pos[0].d, de:nom(neg[0].id), vers:nom(pos[0].id), deId:neg[0].id, versId:pos[0].id });
    else { for (const x of pos) pousse({ type:'entrée', art:k, q:x.d, vers:nom(x.id), versId:x.id }); for (const x of neg) pousse({ type:'sortie', art:k, q:-x.d, de:nom(x.id), deId:x.id }); }
  }
  if (JR.ev.length > JR.max) JR.ev.length = JR.max;
}
// appelé au début de chaque ouvrier de simTick (c = null : fin du tour) : les variations depuis l'appel précédent sont attribuées à l'ouvrier précédent
function jrActeur(h, slot) {
  if (!JR.actif || JR.pause) { JR.snap = new Map(); JR.cur = null; return; }
  const maintenant = jrPhoto();
  if (JR.snap.size) jrDiff(JR.snap, maintenant, JR.cur);
  JR.snap = maintenant; JR.cur = h ? { h, slot, w:workers.get(slot ? h.id + '#' + slot : h.id) } : null;
}
/* COMMANDES À DISTANCE : le serveur de logs garde une file de commandes (POST /base/commande) que le jeu interroge toutes les 4 s et exécute une fois. Commande « nouvelle_partie » { region } : la partie enregistrée (carte, bâtiments, arrivants,
   nom du village, habitants) est supprimée et le jeu s'ouvre sur la région demandée, régénérée à neuf (même adresse que le choix de région de la barre du haut). */
/* SAUVEGARDES DE SÉCURITÉ : la partie (carte, bâtiments…) est copiée sur le serveur toutes les 5 minutes et AVANT toute « nouvelle partie » (dossier ~/.paper-conquest-dev/sauvegardes, 40 au plus). Commande « restaurer » { nom } : remet une de ces copies. */
function sauvegarderPartie(raison) {
  try { const d = localStorage.getItem(KEY); if (!d) return Promise.resolve(null); const t = new Date().toISOString().replace(/[:.]/g, '-'); return baseEnvoyer('/sauvegarde', { nom:t + '_' + raison + '_' + (typeof GAME !== 'undefined' && GAME ? 'region' + GAME.region : 'carte'), cle:KEY, search:location.search, donnees:d }); } catch (e) { return Promise.resolve(null); }
}
setInterval(() => { if (!window.__nouvellePartie && !document.hidden) sauvegarderPartie('auto'); }, 300000);
async function restaurerPartie(p) {
  const b = await (await fetch(BASE_URL + '/sauvegarde?nom=' + encodeURIComponent(p.nom))).json();
  window.__nouvellePartie = true; window.save = () => {};
  localStorage.setItem(b.cle, b.donnees); if (typeof HABITANTS_CLE !== 'undefined') localStorage.removeItem(HABITANTS_CLE);
  if (typeof flash === 'function') flash('Partie restaurée : ' + p.nom);
  setTimeout(() => { location.search = b.search; }, 1500);
}
async function nouvellePartie(p) {
  await sauvegarderPartie('avant-nouvelle-partie');                                                   // (copie de sécurité avant d'effacer)
  const list = await (await fetch('data/regions/regions.json')).json(), r = list.find(x => x.id === +p.region); if (!r) throw new Error('région inconnue ' + p.region);
  window.__nouvellePartie = true; window.save = () => {};                                                // (plus aucun enregistrement : ni la carte ni les habitants de l'ancienne partie ne sont réécrits)
  for (const k of Object.keys(localStorage)) if (k.startsWith(KEY) || k === HABITANTS_CLE || k.startsWith('paperConquestRegionMap.' + r.id)) localStorage.removeItem(k);
  if (typeof flash === 'function') flash('Nouvelle partie : région ' + r.id + ' (' + r.pays + ', ' + r.climat.biome + ', ' + r.climat.temperature_c + ' °C)');
  const q = new URLSearchParams({ region:r.id, biome:r.climat.biome, river:r.eau.cours_eau_carte, seed:r.id * 7919 + 101, lon:r.centre[0], lat:r.centre[1], tm:r.climat.temperature_c, hum:r.climat.humidite });
  if (new URLSearchParams(location.search).has('test')) q.set('test', '1');
  setTimeout(() => { location.search = '?' + q.toString(); }, 1500);
}
let commandesFaites = new Set(); let commandeEnCours = false;
setInterval(async () => {
  if (commandeEnCours || document.hidden || Date.now() < baseHorsLigne || typeof fetch !== 'function') return;
  try {
    const L = await (await fetch(BASE_URL + '/commandes')).json();
    for (const c of L) if (!commandesFaites.has(c.id)) {
      commandeEnCours = true; commandesFaites.add(c.id);
      baseEnvoyer('/fait', { id:c.id });
      if (c.nom === 'restaurer') { baseAction('partie restaurée', c.params); await restaurerPartie(c.params); }
      if (c.nom === 'vider_stock') { let n = 0; for (const h of S.houses) if (h.kind === c.params.kind) { h.stock = 0; h.inv = {}; h.mat = {}; n++; } baseAction('stock vidé', { ...c.params, batiments:n }); save(); if (typeof renderSel === 'function') renderSel(); }   // (stock d'un type de bâtiment remis à 0)
      if (c.nom === 'nouvelle_partie') { baseAction('nouvelle partie', c.params); await nouvellePartie(c.params); }
    }
  } catch (e) { baseHorsLigne = Date.now() + 30000; }
}, 4000);
// ---- définition des stocks (onglet développeur > « Définir les stocks ») ----
/* Pour chaque type de bâtiment, le joueur règle le MAXIMUM de chaque ressource (matières nécessaires et produits) puis valide : les valeurs s'appliquent tout de suite (CAP_RES, simulation.js), sont gardées dans le navigateur
   (clé STOCKS_DEV_CLE) et affichées en JSON, à transmettre pour les inscrire définitivement dans le code. Seules les valeurs qui diffèrent du défaut sont gardées. */
const STOCKS_DEV_CLE = 'paperConquestStocksDev', CAP_BASE = JSON.parse(JSON.stringify(CAP_RES));
let stocksDev = {}; try { stocksDev = JSON.parse(localStorage.getItem(STOCKS_DEV_CLE) || '{}') || {}; } catch (e) {}
function appliquerStocksDev() { for (const k of new Set([...Object.keys(CAP_BASE), ...Object.keys(stocksDev), ...Object.keys(CAP_RES)])) CAP_RES[k] = { ...(CAP_BASE[k] || {}), ...(stocksDev[k] || {}) }; }
appliquerStocksDev();
if (typeof fetch === 'function') fetch(BASE_URL).then(r => r.json()).then(b => {                       // la base du serveur fait foi ; si elle est vide, le navigateur y dépose ses valeurs
  if (b && b.stocks && Object.keys(b.stocks).length) { stocksDev = b.stocks; try { localStorage.setItem(STOCKS_DEV_CLE, JSON.stringify(stocksDev)); } catch (e) {} appliquerStocksDev(); }
  else if (Object.keys(stocksDev).length) baseEnvoyer('/sync', { stocks:stocksDev });
}).catch(() => { baseHorsLigne = Date.now() + 30000; });
function maxBase(h, k) { const c = CAP_RES[h.kind]; CAP_RES[h.kind] = CAP_BASE[h.kind] || {}; try { return maxRes(h, k); } finally { CAP_RES[h.kind] = c; } }
const majuscule = k => k[0].toUpperCase() + k.slice(1);
function articlesDe(h) {                                                                  // matières nécessaires, produits, et valeurs déjà réglées
  const ent = entreesDe(h), sor = new Set(sortiesDe(h));
  if (aBesoinStock(h) && h.kind !== 'camp_chasse') for (const R of produitsDe(h)) Object.keys(R.sort || { [R.nom]:1 }).forEach(k => sor.add(k));
  const L = new Map(); ent.forEach(k => L.set(k, 'entrée')); sor.forEach(k => { if (!L.has(k)) L.set(k, 'produit'); });
  Object.keys(stocksDev[h.kind] || {}).forEach(k => { if (!L.has(k)) L.set(k, 'autre'); });
  return L;
}
let dsBox = null;
function stocksRendre() {
  const kind = dsBox.querySelector('#ds-kind').value, h = S.houses.find(o => o.kind === kind) || { id:-1, kind, type:kind, inv:{}, nb:1 };
  const lignes = [...articlesDe(h)].map(([k, t]) => { const d = maxBase(h, k), v = (stocksDev[kind] || {})[k] ?? d; return '<tr><td>' + jrEsc(majuscule(k)) + ' <small>(' + jrEsc(uniteDe(k)) + ')</small></td><td>' + t + '</td><td><input type="number" min="1" step="1" data-k="' + jrEsc(k) + '" data-d="' + d + '" value="' + v + '"></td><td>' + d + '</td></tr>'; });
  dsBox.querySelector('#ds-liste').innerHTML = '<table><tr><th>Ressource</th><th></th><th>Maximum</th><th>Défaut</th></tr>' + (lignes.join('') || '<tr><td colspan="4">Ce bâtiment n’a pas de stock à régler.</td></tr>') + '</table>';
  dsBox.querySelector('#ds-json').value = JSON.stringify(stocksDev, null, 1);
}
function stocksMontrer() {
  if (!dsBox) {
    const st = document.createElement('style');
    st.textContent = '#ds{position:fixed;left:310px;top:90px;width:min(560px,calc(100vw - 340px));max-height:calc(100% - 140px);z-index:42;display:flex;flex-direction:column;gap:8px;padding:12px 14px;background:var(--hud,#17140f);color:var(--hud-ink,#eadfc8);border:1.5px solid var(--hud-edge,#7a6a4a);border-radius:6px;box-shadow:0 6px 24px rgba(0,0,0,.5);font:13px "IBM Plex Mono",monospace}'
      + '#ds h3{margin:0;font:600 18px "Barlow Condensed",sans-serif;letter-spacing:.08em}#ds header{display:flex;gap:8px;align-items:center}#ds header h3{flex:1}#ds #ds-liste{overflow:auto;flex:1;min-height:120px}#ds table{width:100%;border-collapse:collapse}#ds td,#ds th{padding:3px 6px;text-align:left;border-bottom:1px solid #2a2418}'
      + '#ds input[type=number]{width:80px;background:#0d0b08;color:inherit;border:1px solid #4a3f2c;border-radius:3px;padding:2px 4px;font:inherit}#ds select,#ds textarea{background:#0d0b08;color:inherit;border:1px solid #4a3f2c;border-radius:3px;font:inherit}#ds textarea{height:90px;width:100%;resize:vertical}#ds .ds-b{display:flex;gap:8px;flex-wrap:wrap}';
    document.head.appendChild(st);
    dsBox = document.createElement('aside'); dsBox.id = 'ds'; dsBox.setAttribute('aria-label', 'Définir les stocks');
    const kinds = PRESETS.filter(p => { try { const f = { id:-1, kind:p.id, type:p.name, inv:{}, nb:1 }; return entreesDe(f).length || sortiesDe(f).length || estProducteur(f) || CAP_RES[p.id]; } catch (e) { return false; } });
    dsBox.innerHTML = '<header><h3>Définir les stocks</h3><button id="ds-x" aria-label="Fermer">×</button></header><label>Bâtiment : <select id="ds-kind">' + kinds.map(p => '<option value="' + p.id + '">' + jrEsc(p.name) + '</option>').join('') + '</select></label>'
      + '<div id="ds-liste"></div><div class="ds-b"><button id="ds-ok">Valider</button><button id="ds-raz">Remettre les défauts de ce bâtiment</button><button id="ds-copie">Copier le JSON</button></div>'
      + '<small>Valider applique les maximums tout de suite et les garde dans ce navigateur. Copie le JSON ci-dessous et envoie-le : je l’inscris dans le code.</small><textarea id="ds-json" readonly></textarea>';
    document.body.appendChild(dsBox);
    dsBox.querySelector('#ds-kind').addEventListener('change', stocksRendre);
    dsBox.querySelector('#ds-x').addEventListener('click', () => { dsBox.hidden = true; });
    dsBox.querySelector('#ds-ok').addEventListener('click', () => {
      const kind = dsBox.querySelector('#ds-kind').value, v = {};
      dsBox.querySelectorAll('#ds-liste input[data-k]').forEach(i => { const n = Math.round(+i.value); if (n > 0 && n !== +i.dataset.d) v[i.dataset.k] = n; });
      if (Object.keys(v).length) stocksDev[kind] = v; else delete stocksDev[kind];
      try { localStorage.setItem(STOCKS_DEV_CLE, JSON.stringify(stocksDev)); } catch (e) {}
      appliquerStocksDev(); stocksRendre(); if (typeof renderSel === 'function') renderSel();
      baseVariable('stocks', kind, Object.keys(v).length ? v : null); baseAction('stocks validés', { batiment:kind, valeurs:v });
      if (typeof flash === 'function') flash('Stocks validés : ' + (Object.keys(v).length ? Object.keys(v).length + ' valeur(s) pour ce bâtiment' : 'défauts rétablis'));
    });
    dsBox.querySelector('#ds-raz').addEventListener('click', () => { const k = dsBox.querySelector('#ds-kind').value; delete stocksDev[k]; try { localStorage.setItem(STOCKS_DEV_CLE, JSON.stringify(stocksDev)); } catch (e) {} appliquerStocksDev(); stocksRendre(); baseVariable('stocks', k, null); baseAction('stocks remis par défaut', { batiment:k }); });
    dsBox.querySelector('#ds-copie').addEventListener('click', () => { const t = dsBox.querySelector('#ds-json'); t.select(); try { navigator.clipboard.writeText(t.value); if (typeof flash === 'function') flash('JSON copié'); } catch (e) { document.execCommand('copy'); } });
  }
  dsBox.hidden = false; stocksRendre();
}
// ---- onglet développeur (à gauche, visible seulement en mode dev) : actions de maintenance ----
function resetHabitants() {                                                                // tous les villageois repartent de leur bâtiment, rassasiés, sans rien porter ni aucun ordre en cours
  baseAction('reset des habitants', { ouvriers:workers.size });
  workers.clear(); if (typeof SORTIES !== 'undefined') SORTIES.clear(); if (typeof captures !== 'undefined') captures.clear();
  if (typeof troupeaux !== 'undefined') for (const g of troupeaux) for (const a of g.an) if (a.captif) a.captif = null;                    // (animaux visés ou capturés : libérés)
  for (const h of S.houses) { h.appro = false; h.haul = false; }
  JR.snap = new Map(); save(); if (typeof renderSel === 'function') renderSel(); if (typeof requestDraw === 'function') requestDraw();
  if (typeof flash === 'function') flash('Habitants réinitialisés');
}
function supprimerAuSol() {                                                                // le bois laissé au sol par les bûcherons
  let n = 0; for (const h of S.houses) if (h.sol && h.sol.length) { n += h.sol.reduce((q, e) => q + e.n, 0); h.sol = []; h.haul = false; }
  baseAction('ressources au sol supprimées', { quantite:n });
  for (const w of workers.values()) if (w.entree) w.entree = null;
  JR.snap = new Map(); save(); if (typeof requestDraw === 'function') requestDraw();
  if (typeof flash === 'function') flash(n ? n + ' ressources au sol supprimées' : 'Aucune ressource au sol');
}
let devTab = null, devPan = null;
function devMontrer() {
  if (!JR.actif) { if (devTab) devTab.hidden = true; if (devPan) devPan.hidden = true; if (dsBox) dsBox.hidden = true; return; }
  if (!devTab) {
    const st = document.createElement('style');
    st.textContent = '#dev-tab{position:fixed;left:0;top:50%;transform:translateY(-50%);z-index:41;writing-mode:vertical-rl;padding:14px 7px;background:var(--hud,#17140f);color:var(--hud-ink,#eadfc8);border:1.5px solid var(--hud-edge,#7a6a4a);border-left:0;border-radius:0 8px 8px 0;font:600 16px "Barlow Condensed",sans-serif;letter-spacing:.14em;cursor:pointer}'
      + '#dev-pan{position:fixed;left:40px;top:90px;width:260px;z-index:41;display:flex;flex-direction:column;gap:8px;padding:12px 14px;background:var(--hud,#17140f);color:var(--hud-ink,#eadfc8);border:1.5px solid var(--hud-edge,#7a6a4a);border-radius:6px;box-shadow:var(--hud-shadow,0 6px 24px rgba(0,0,0,.5))}'
      + '#dev-pan h3{margin:0 0 2px;font:600 18px "Barlow Condensed",sans-serif;letter-spacing:.08em}#dev-pan small{opacity:.7}#dev-pan button{width:100%;text-align:left}';
    document.head.appendChild(st);
    devTab = document.createElement('button'); devTab.id = 'dev-tab'; devTab.textContent = 'DÉVELOPPEUR'; devTab.setAttribute('aria-expanded', 'false');
    devPan = document.createElement('aside'); devPan.id = 'dev-pan'; devPan.hidden = true; devPan.setAttribute('aria-label', 'Développeur');
    devPan.innerHTML = '<h3>Développeur</h3><button data-dev="habitants">Reset des habitants</button><small>Annule tous les ordres, les vide de ce qu’ils portent et les ramène à leur bâtiment.</small>'
      + '<button data-dev="sol">Supprimer les ressources au sol</button><small>Efface le bois laissé au sol par les bûcherons.</small>'
      + '<button data-dev="stocks">Définir les stocks</button><small>Règle le maximum de chaque ressource par bâtiment, puis valide.</small>'
      + '<button data-dev="infos" id="dev-infos">Infos des habitants : afficher</button><small>Au-dessus de chaque habitant : satiété, soif, ce qu’il fait et où il va.</small>'
      + '<button data-dev="voies" id="dev-voies">Lignes de circulation : afficher</button><small>Les deux voies de chaque route (droite et gauche) avec le sens de la marche.</small>'
      + '<button data-dev="journal">Journal des ressources : afficher / masquer</button><button data-dev="quitter">Quitter le mode développeur</button>';
    document.body.append(devTab, devPan);
    devTab.addEventListener('click', () => { devPan.hidden = !devPan.hidden; devTab.setAttribute('aria-expanded', String(!devPan.hidden)); });
    devPan.addEventListener('click', e => {
      const a = e.target.closest('[data-dev]'); if (!a) return;
      if (a.dataset.dev === 'habitants') { if (confirm('Réinitialiser tous les habitants ? Leurs ordres et ce qu’ils portent sont perdus.')) resetHabitants(); }
      else if (a.dataset.dev === 'sol') { if (confirm('Supprimer toutes les ressources au sol ?')) supprimerAuSol(); }
      else if (a.dataset.dev === 'stocks') stocksMontrer();
      else if (a.dataset.dev === 'journal') { JR.vue = !JR.vue; baseAction('journal des ressources', { visible:JR.vue }); jrMontrer(); }
      else if (a.dataset.dev === 'infos') { JR.infos = !JR.infos; a.textContent = 'Infos des habitants : ' + (JR.infos ? 'masquer' : 'afficher'); baseAction('infos des habitants', { visibles:JR.infos }); requestDraw(); }
      else if (a.dataset.dev === 'voies') { JR.voies = !JR.voies; a.textContent = 'Lignes de circulation : ' + (JR.voies ? 'masquer' : 'afficher'); baseAction('lignes de circulation', { visibles:JR.voies }); requestDraw(); }
      else if (a.dataset.dev === 'quitter') jrBascule(false);
    });
  }
  devTab.hidden = false;
}
// ---- panneau ----
const jrEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
let jrBox = null;
function jrTexte(e) {
  const art = jrEsc(e.art[0].toUpperCase() + e.art.slice(1)), q = Math.round(e.q * 100) / 100;
  if (e.type === 'transfert') return `<b>${q} ${art}</b> : ${jrEsc(e.de)} → ${jrEsc(e.vers)}`;
  if (e.type === 'entrée') return `<b>+${q} ${art}</b> dans ${jrEsc(e.vers)}` + (e.pour && e.pour === e.vers ? ' (production / dépôt)' : '');
  return `<b>−${q} ${art}</b> de ${jrEsc(e.de)}` + (e.pour ? (e.pour === e.de ? ' (consommé)' : ' pour ' + jrEsc(e.pour)) : ' (payé / consommé)');
}
let jrSig = '';
function jrRendre() {
  if (!jrBox) return; const f = JR.filtre.toLowerCase();
  const h = typeof sel !== 'undefined' && sel && sel.type === 'house' ? S.houses.find(o => o.id === sel.id) : null, src = h ? (JR.hist.get(h.id) || []).slice().reverse() : JR.ev;   // sélection : l'historique complet de ce bâtiment seulement
  const sig = (h ? h.id : '*') + '|' + src.length + '|' + (src[0] ? src[0].heure + src[0].art + src[0].q : '') + '|' + f; if (sig === jrSig) return; jrSig = sig;
  jrBox.querySelector('#jr-titre').textContent = h ? 'DEV · historique : ' + jrNom(h) + ' (' + src.length + ')' : 'DEV · journal des ressources (rien de sélectionné : tout le village)';
  const L = src.filter(e => !f || (e.art + ' ' + (e.de || '') + ' ' + (e.vers || '') + ' ' + e.qui).toLowerCase().includes(f)).slice(0, h ? 2000 : 200);
  jrBox.querySelector('#jr-liste').innerHTML = L.length ? L.map(e => `<div class="jr-l jr-${e.type === 'transfert' ? 't' : e.type === 'entrée' ? 'e' : 's'}"><span class="jr-h">J${e.jour} ${e.heure}</span><span class="jr-m">${jrTexte(e)}</span><span class="jr-q">${jrEsc(e.qui)}</span></div>`).join('') : '<div class="jr-vide">Aucun mouvement pour le moment</div>';
}
function jrMontrer() {
  devMontrer();
  if (!JR.actif || !JR.vue) { if (jrBox) jrBox.hidden = true; return; }
  if (!jrBox) {
    const st = document.createElement('style');
    st.textContent = '#jr{position:fixed;left:10px;bottom:70px;width:min(640px,calc(100vw - 540px));height:300px;z-index:40;display:flex;flex-direction:column;background:#17140f;color:#eadfc8;border:1.5px solid #7a6a4a;border-radius:6px;font:12px "IBM Plex Mono",monospace;box-shadow:0 6px 24px rgba(0,0,0,.5)}'
      + '#jr header{display:flex;gap:6px;align-items:center;padding:6px 8px;border-bottom:1px solid #4a3f2c}#jr header b{flex:1;font-size:12px;letter-spacing:.06em}#jr input{background:#0d0b08;color:inherit;border:1px solid #4a3f2c;border-radius:3px;padding:2px 6px;width:130px;font:inherit}'
      + '#jr button{background:#2a2418;color:inherit;border:1px solid #6a5a3c;border-radius:3px;padding:1px 8px;cursor:pointer;font:inherit}#jr-liste{overflow:auto;flex:1}'
      + '.jr-l{display:grid;grid-template-columns:78px 1fr 230px;gap:8px;padding:2px 8px;border-bottom:1px solid #2a2418}.jr-h{color:#9a8a68}.jr-q{color:#9a8a68;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + '.jr-e .jr-m b{color:#7fc96a}.jr-s .jr-m b{color:#e0795a}.jr-t .jr-m b{color:#e0c260}.jr-vide{padding:14px;color:#9a8a68}';
    document.head.appendChild(st);
    jrBox = document.createElement('aside'); jrBox.id = 'jr';
    jrBox.innerHTML = '<header><b id="jr-titre">DEV · journal des ressources</b><input id="jr-f" placeholder="filtrer…"><button id="jr-p">Pause</button><button id="jr-c">Vider</button><button id="jr-x" aria-label="Fermer">×</button></header><div id="jr-liste"></div>';
    document.body.appendChild(jrBox);
    jrBox.querySelector('#jr-f').addEventListener('input', e => { JR.filtre = e.target.value; jrSig = ''; jrRendre(); });
    jrBox.querySelector('#jr-p').addEventListener('click', e => { JR.pause = !JR.pause; e.target.textContent = JR.pause ? 'Reprendre' : 'Pause'; });
    jrBox.querySelector('#jr-c').addEventListener('click', () => { JR.ev.length = 0; JR.hist.clear(); jrSig = ''; jrRendre(); });
    jrBox.querySelector('#jr-x').addEventListener('click', () => jrBascule(false));
  }
  jrBox.hidden = false; jrSig = ''; jrRendre();
}
function jrBascule(v = !JR.actif) { baseAction(v ? 'mode développeur activé' : 'mode développeur désactivé'); JR.actif = v; JR.snap = new Map(); JR.cur = null; try { localStorage.setItem(DEV_CLE, v ? '1' : '0'); } catch (e) {} jrMontrer(); if (typeof requestDraw === 'function') requestDraw(); if (typeof flash === 'function') flash(v ? 'Mode développeur activé (H ou Ctrl + Maj + D pour le quitter) · lignes de circulation affichées' : 'Mode développeur désactivé'); }
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) { e.preventDefault(); jrBascule(); return; }
  if ((e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey && !e.altKey && !(e.target.closest && e.target.closest('input,textarea,select'))) { e.preventDefault(); jrBascule(); }   // H : mode développeur
});
setInterval(() => { if (JR.actif && jrBox && !jrBox.hidden && !document.hidden) jrRendre(); }, 700);
jrMontrer();


// ---- infos au-dessus des habitants (option de l'onglet développeur) : satiété, soif, ce qu'il fait, où il va ----
function quefaitIl(h, w, cle) {
  const lieu = { eau:'le puits', maison:'sa maison', etal:'le marché' };
  let t;
  if (w.nuit) t = w.nuit === 'dedans' ? 'se repose chez lui' : 'rentre se reposer → sa maison';
  else if (w.state === 'etal') t = w.surPlace ? 'tient son étal' : 'va au marché installer / tenir son étal';
  else if (w.bes) t = { eau:'va boire', maison:'rentre manger', etal:'va manger à un étal' }[w.bes.type] + (w.bes.etat === 'retour' ? ' → retourne au travail' : ' → ' + (lieu[w.bes.type] || ''));
  else {
    const J = typeof jobOf === 'function' ? jobOf(h) : null;
    t = J && typeof jobLabel === 'function' ? jobLabel(typeof buildingOf === 'function' ? buildingOf(h) : null, w, J) : '';
    if (!t) t = { idle:'attend / se prépare', wait:'attend', go:'se déplace', back:'rentre au bâtiment', drop:'range', cut:'abat un arbre', fend:'fend le bois', goPile:'va au tas de bois', goCart:'va à la charrette', load:'charge la charrette', work:'travaille', plein:'stock plein', sansoutil:'il lui manque un outil', done:'a fini' }[w.state] || w.state;
    if (w.dest && ['go', 'goPile', 'goCart'].includes(w.state)) t += ' → (' + Math.round(w.dest[0]) + ', ' + Math.round(w.dest[1]) + ')';
  }
  const role = typeof cle === 'string' && cle.includes('#p') ? 'porteur · ' : typeof cle === 'string' && cle.includes('#a') ? 'coursier · ' : '';
  return role + t;
}
const kgDe = (a, n) => qteArr(poidsUnite(a) * n);
function portePar(h, w) {                                                       // { porte : ce qu'il transporte et combien (avec le poids), sur : ce qu'il a sur lui (outil, arme, véhicule) }
  const L = [], S_ = [];
  try {
    const enRoute = w.carry || ['back', 'drop', 'range', 'depece'].includes(w.state);
    if (w.load && w.n > 0 && enRoute) L.push(quantiteTexte(w.load, qteArr(w.n)) + ' ' + w.load + ' (' + kgDe(w.load, w.n) + ' kg)');
    else if (h.kind === 'loge_bucheron' && typeof RAMASSAGE !== 'undefined' && w.carry && ['back', 'drop'].includes(w.state)) L.push(Object.entries(RAMASSAGE).map(([k, q]) => q + ' ' + k + ' (' + kgDe(k, q) + ' kg)').join(' + '));
    if (w.logs > 0) L.push(w.logs + ' bûches (' + kgDe(typeof LUMBER !== 'undefined' && LUMBER[h.kind] || 'bois', w.logs) + ' kg)');
    if (w.charge > 0 && w.lim) { const a = typeof articleDe === 'function' ? articleDe(h) : 'bois'; L.push(w.charge + ' / ' + w.lim + ' ' + a + ' dans la charrette (' + kgDe(a, w.charge) + ' kg)'); }
    if (w.panier > 0) L.push(w.panier + ' poisson' + (w.panier > 1 ? 's' : '') + ' (' + qteArr(w.panier * (typeof RATION === 'number' ? RATION : 2)) + ' kg)');
    if (w.poids > 0) L.push('carcasse ' + (w.espece || 'animal') + ' (' + Math.round(w.poids) + ' kg)');
    if (!L.length && w.carry && w.charge > 0 && !w.load) L.push(w.charge + ' ' + (typeof productOf === 'function' && productOf(h) || 'unités'));
    if (!L.length && w.carry === true) L.push('un chargement (' + (typeof productOf === 'function' && productOf(h) || 'inconnu') + ')');
    if (w.arme > 0) S_.push('lance (' + w.arme + ' usage' + (w.arme > 1 ? 's' : '') + ')');
    const t = typeof outilDe === 'function' && outilDe(h), b = t && typeof meilleurOutil === 'function' && meilleurOutil(h);
    if (b) S_.push(b.nom);
    const niv = typeof niveau === 'function' ? niveau(h) : 0; if (niv >= 1 && (h.kind === 'camp_bucherons' || h.kind === 'hutte_charbonnier' || h.kind === 'fonderie')) S_.push(['', 'charrette à main', 'chariot'][niv] || '');
  } catch (e) {}
  return { porte:L.join(' + '), sur:S_.filter(Boolean).join(', ') };
}
function drawInfosHab() {
  const s = view.s; if (s < .3) return;
  const [x0, y0] = toW(0, 0), [x1, y1] = toW(W, H), m = 20, hs = new Map(S.houses.map(h => [h.id, h]));
  ctx.save(); ctx.font = '600 11px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  for (const [k, w] of workers) {
    if (w.passive || w.dedans || w.x < x0 - m || w.x > x1 + m || w.y < y0 - m || w.y > y1 + m) continue;
    const h = hs.get(typeof k === 'string' ? +k.split('#')[0] : k); if (!h) continue;
    const [X, Y] = toS(w.x, w.y), sat = Math.round(w.sati === undefined ? 90 : w.sati), soif = Math.round(w.soif === undefined ? 90 : w.soif), bas = Y - 16;
    const { porte, sur } = portePar(h, w); let y = bas;
    haloText(quefaitIl(h, w, k), X, y, Col.ink, Col.sheet); y -= 13;
    haloText('Sat ' + sat + ' % · Soif ' + soif + ' %', X, y, sat < BESOIN.SEUIL || soif < BESOIN.SEUIL ? Col.bad : Col.ink, Col.sheet); y -= 13;
    if (porte) { haloText('Porte : ' + porte, X, y, '#8a4a00', Col.sheet); y -= 13; }
    if (sur) haloText('Sur lui : ' + sur, X, y, '#2f5d8a', Col.sheet);
  }
  ctx.restore();
}
// ---- lignes de circulation (option de l'onglet développeur) : les deux voies de chaque route (droite et gauche), avec le sens de la marche ; deplacements.js (surVoie) en suit la voie de droite.
//   - route qui FINIT sur une autre (T) : ses deux lignes traversent la chaussée et s'arrêtent sur la ligne de l'autre côté ; les croisements en croix gardent les lignes des deux routes entières ;
//   - chaque bâtiment : une ligne de sa porte, droit vers la route, jusqu'à la ligne de circulation de l'autre côté (les deux lignes de la route). ----
let voiesCache = { k:null, v:null };
function voiesCalcul() {                                                         // tracés redécoupés tous les 2 m, prolongements aux jonctions en T, accès des bâtiments ; recalculé seulement si les routes ou les bâtiments changent
  const k = (typeof roadsSig === 'function' ? roadsSig() : S.roads.length) + '|' + S.houses.map(h => h.id + ',' + h.x + ',' + h.y + ',' + h.a).join(';');
  if (voiesCache.k === k) return voiesCache.v;
  const axes = S.roads.map(r => ({ r, Q:smoothPts(r), off:Math.min(VOIE, (r.w || 8) / 4) })), cr = (a, b) => a[0] * b[1] - a[1] * b[0];
  const routes = axes.map(({ r, Q }) => {
    const P = resample(Q, 2), ext = { debut:null, fin:null };
    for (const bout of ['debut', 'fin']) {
      const e = bout === 'debut' ? r.pts[0] : r.pts[r.pts.length - 1], dedans = bout === 'debut' ? P[Math.min(P.length - 1, 3)] : P[Math.max(0, P.length - 4)];
      let best = null;
      for (const o of axes) { if (o.r === r) continue; for (let j = 0; j < o.Q.length - 1; j++) { const t = ptSeg(e, o.Q[j], o.Q[j + 1]); if (t.d < 1.5 && (!best || t.d < best.d)) best = { d:t.d, o, a:o.Q[j], b:o.Q[j + 1], q:t.q }; } }
      if (!best) continue;
      const oe0 = best.o.r.pts[0], oe1 = best.o.r.pts[best.o.r.pts.length - 1];
      if (segLen(best.q, oe0) < 4 || segLen(best.q, oe1) < 4) continue;                          // (deux routes qui se rejoignent par leurs bouts : pas un T)
      const L = segLen(best.a, best.b) || 1, u = [(best.b[0] - best.a[0]) / L, (best.b[1] - best.a[1]) / L];
      let nb = [-u[1], u[0]]; if ((dedans[0] - best.q[0]) * nb[0] + (dedans[1] - best.q[1]) * nb[1] < 0) nb = [-nb[0], -nb[1]];   // normale de la grande route, côté de la branche
      ext[bout] = { u, base:[best.q[0] - nb[0] * best.o.off, best.q[1] - nb[1] * best.o.off] };    // la ligne de circulation de l'autre côté
    }
    return { r, P, ext, off:Math.min(VOIE, (r.w || 8) / 4) };
  });
  const acces = [];
  for (const h of S.houses) {
    let best = null;
    for (const o of axes) for (let j = 0; j < o.Q.length - 1; j++) { const t = ptSeg([h.x, h.y], o.Q[j], o.Q[j + 1]); if (!best || t.d < best.d) best = { d:t.d, o, q:t.q }; }
    if (!best || best.d > 45 || typeof porte !== 'function') continue;
    const D = porte(h, best.q), dl = segLen(D, best.q); if (dl < .3) continue;
    const n = [(best.q[0] - D[0]) / dl, (best.q[1] - D[1]) / dl];
    acces.push([D, [best.q[0] + n[0] * best.o.off, best.q[1] + n[1] * best.o.off]]);
  }
  return (voiesCache = { k, v:{ routes, acces } }).v;
}
function drawVoiesDev() {
  const { routes, acces } = voiesCalcul(); ctx.save(); ctx.setLineDash([8, 7]); ctx.lineWidth = 1.5; ctx.globalAlpha = .75; ctx.strokeStyle = '#2f6fd0'; ctx.fillStyle = '#2f6fd0';
  for (const { P, ext, off } of routes) {
    if (P.length < 2) continue;
    for (const side of [1, -1]) {
      const L = P.map((q, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return { p:[q[0] - dy / l * off * side, q[1] + dx / l * off * side], d:[dx / l, dy / l] }; });
      const prolonge = (pt, dir, e) => {                                                   // prolonge le bout de la ligne jusqu'à la ligne de circulation de l'autre côté de la grande route
        if (!e) return null; const c = cr(dir, e.u); if (Math.abs(c) < .15) return null;
        const t = cr([e.base[0] - pt[0], e.base[1] - pt[1]], e.u) / c; return t > 0 && t < 20 ? [pt[0] + dir[0] * t, pt[1] + dir[1] * t] : null;
      };
      const debut = prolonge(L[0].p, [-L[0].d[0], -L[0].d[1]], ext.debut), fin = prolonge(L[L.length - 1].p, L[L.length - 1].d, ext.fin);
      const pts = L.map(x => x.p); if (debut) pts.unshift(debut); if (fin) pts.push(fin);
      ctx.beginPath(); pts.forEach((q, i) => { const [sx, sy] = toS(q[0], q[1]); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); }); ctx.stroke(); ctx.setLineDash([]);
      for (let i = 6; i < L.length; i += 12) { const [ax, ay] = toS(L[i].p[0], L[i].p[1]); ctx.save(); ctx.translate(ax, ay); ctx.rotate(Math.atan2(L[i].d[1] * side, L[i].d[0] * side)); ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill(); ctx.restore(); }   // flèche : sens de circulation de la voie
      ctx.setLineDash([8, 7]);
    }
  }
  ctx.beginPath(); for (const [a, b] of acces) { const [x0, y0] = toS(a[0], a[1]), [x1, y1] = toS(b[0], b[1]); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); } ctx.stroke();      // accès des bâtiments
  ctx.restore();
}
const cr = (a, b) => a[0] * b[1] - a[1] * b[0];
