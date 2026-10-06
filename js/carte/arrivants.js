/* ---------- arrivants et logements (region.html) ----------
   Le camp de colon loge les 5 premiers villageois (5 au plus). Les suivants arrivent peu à peu depuis les bords de la région et
   demandent à rejoindre le village : une fenêtre d'événement s'ouvre sur le côté (Approuver / Refuser).
   Limite d'accueil : on n'accueille que s'il reste des places (camp 5 + capacité des maisons construites). Les habitants prennent
   possession des maisons dès qu'elles existent ; le camp ne garde que ceux que les maisons ne logent pas. Tant que le nombre
   de places n'augmente pas, aucune demande n'est faite.
   État sauvegardé à part du plan (clé arrivants) : { attente (arrivants acceptés), refuses, demande:{ n, de } | null, delai }. */
const ARR_KEY = KEY + '.arrivants', ARR_DELAI = [40, 70], ARR_PREMIER = 15, ARR_VISIBLES = 12;
const arrivants = { attente:0, refuses:0, demande:null, delai:ARR_PREMIER };
try { Object.assign(arrivants, JSON.parse(localStorage.getItem(ARR_KEY) || '{}')); } catch (e) {}
if (!S.houses.some(h => h.kind === 'camp_colon')) Object.assign(arrivants, { attente:0, demande:null, delai:ARR_PREMIER });   // partie neuve (plan régénéré) : plus d'arrivants en attente
const arrSave = () => { try { localStorage.setItem(ARR_KEY, JSON.stringify(arrivants)); } catch (e) {} };
const campColon = () => S.houses.find(h => h.kind === 'camp_colon') || null;
// villageois du village : les 5 du camp + les arrivants approuvés (les autres bâtiments n'en donnent pas)
const popVillage = () => campColon() ? CAMP_PLACES + arrivants.attente : 0;
const CAMP_PLACES = 5;
// places : le camp (5) + la capacité de chaque maison construite ; libres = places - habitants
const capaciteMaisons = () => S.houses.reduce((s, h) => h.kind === 'camp_colon' ? s : s + ((buildingOf(h) || {}).cap || 0), 0);
const capaciteVillage = () => campColon() ? CAMP_PLACES + capaciteMaisons() : 0;
const placesLibres = () => Math.max(0, capaciteVillage() - popVillage());
const logesAuCamp = () => campColon() ? Math.min(CAMP_PLACES, Math.max(0, popVillage() - capaciteMaisons())) : 0;   // ceux que les maisons ne logent pas
// habitants d'un logement : ils prennent les maisons dans l'ordre de construction, le camp garde le reste
function occupation(h) {
  if (h.kind === 'camp_colon') return logesAuCamp();
  const cap = (buildingOf(h) || {}).cap || 0; let reste = popVillage();
  for (const o of S.houses.slice().sort((x, y) => x.id - y.id)) { if (o.kind === 'camp_colon') continue; const c = (buildingOf(o) || {}).cap || 0; const k = Math.min(c, reste); if (o === h) return Math.min(cap, k); reste -= k; }
  return 0;
}

const COTES = ['du nord', 'du sud', "de l'est", "de l'ouest"];
const evt = document.createElement('aside');
evt.className = 'evenement'; evt.hidden = true; evt.setAttribute('role', 'alertdialog'); evt.setAttribute('aria-label', 'Événement');
evt.innerHTML = `<h2>Événement</h2><p id="evt-texte"></p>
  <div class="row"><button id="evt-ok">Approuver</button><button id="evt-non" class="danger">Refuser</button></div>`;
document.body.appendChild(evt);

function afficherDemande() {
  const d = arrivants.demande; evt.hidden = !d;
  if (!d) return;
  const libres = placesLibres(), ok = libres >= d.n;
  document.getElementById('evt-texte').textContent = `${d.n} villageois venus ${d.de} de la région demandent à rejoindre le village.` +
    (ok ? '' : ` Plus assez de places (${libres} libre${libres > 1 ? 's' : ''}) : construisez des habitations.`);
  document.getElementById('evt-ok').disabled = !ok;
}
function repondre(ok) {
  const d = arrivants.demande; if (!d) return;
  if (ok) { if (placesLibres() < d.n) { flash('Plus assez de places pour les accueillir', true); afficherDemande(); return; } arrivants.attente += d.n; flash(`${d.n} villageois accueillis`); } else arrivants.refuses += d.n;
  arrivants.demande = null; arrivants.delai = ARR_DELAI[0] + Math.random() * (ARR_DELAI[1] - ARR_DELAI[0]);
  arrSave(); afficherDemande(); lastStatus = ''; updateStatus(); requestDraw();
}
document.getElementById('evt-ok').addEventListener('click', () => repondre(true));
document.getElementById('evt-non').addEventListener('click', () => repondre(false));

// appelé à chaque image par simLoop : décompte jusqu'à la prochaine demande (seulement une fois le camp posé)
function arrivantsStep(dt) {
  if (!campColon()) { if (!evt.hidden) { evt.hidden = true; } return false; }
  if (arrivants.demande) { if (evt.hidden) afficherDemande(); if (!evt.hidden && document.getElementById('evt-ok').disabled === (placesLibres() >= arrivants.demande.n)) afficherDemande(); return false; }   // (bouton Approuver à jour si des places apparaissent)
  if (placesLibres() < 1) return false;                     // limite d'accueil : pas de demande tant qu'il n'y a pas de place
  arrivants.delai -= dt;
  if (arrivants.delai > 0) return false;
  arrivants.demande = { n:Math.min(1 + Math.floor(Math.random() * 3), placesLibres()), de:COTES[Math.floor(Math.random() * COTES.length)] };
  arrSave(); afficherDemande(); return false;
}
// les habitants logés au camp, groupés autour du feu
function arrivantsDessin() {
  const c = campColon(); if (!c || !logesAuCamp() || typeof peintVillageois !== 'function') return;
  const s = view.s; if (s <= .5) return;
  const pts = corners(c), cx = pts.reduce((a, p) => a + p[0], 0) / 4, cy = pts.reduce((a, p) => a + p[1], 0) / 4;
  const V = VILLAGEOIS.villageois, Ls = Math.max(V.T * s * 2.2, 8), n = Math.min(logesAuCamp(), ARR_VISIBLES);
  for (let i = 0; i < n; i++) {
    const a = i * 2.399, r = 4 + (i % 3) * 2.2, [X, Y] = toS(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    const wx = cx + Math.cos(a) * r, wy = cy + Math.sin(a) * r; persos.push([wx, wy]);
    ctx.globalAlpha = voileBois(wx, wy); peintVillageois('villageois', X, Y, Ls, a + Math.PI); ctx.globalAlpha = 1;   // face au feu, sous les arbres
  }
}
afficherDemande();

/* ---- stock du village ----
   Le stock = TOUT ce qui est disponible dans le village : le stock central (S.stock : départ du camp, pierre du tailleur, poisson),
   plus ce que les bâtiments ont produit et pas encore déplacé (bois des camps de bûcherons, planches de la scierie, grain, œufs…)
   et le contenu des granges et entrepôts. Il se recalcule à chaque image : produit, consommé, utilisé ou ajouté, il suit.
   (Le compteur « récolté » du tailleur de pierre et celui du forestier ne comptent pas : la pierre est déjà dans S.stock.) */
const surStockCentral = h => TAILLEURS[h.kind] || h.kind === 'hutte_forestier';
function stockVillage() {
  const t = {};
  for (const [k, q] of Object.entries(S.stock || {})) if (q > 0) t[k] = q;
  for (const h of S.houses) {
    for (const [k, q] of Object.entries(h.inv || {})) if (q > 0) t[k] = (t[k] || 0) + q;
    const p = surStockCentral(h) ? null : productOf(h);
    if (p && (h.stock || 0) > 0) t[p] = (t[p] || 0) + h.stock;
  }
  return t;
}
// paie q unités de la ressource k : d'abord le stock central, puis ce que les bâtiments ont produit ou rangé
function retirerDuStock(k, q) {
  const st = S.stock || (S.stock = {}), c = Math.min(q, st[k] || 0); st[k] = (st[k] || 0) - c; q -= c;
  for (const h of S.houses) {
    if (q <= 0) break;
    if (h.inv && h.inv[k] > 0) { const x = Math.min(q, h.inv[k]); h.inv[k] -= x; q -= x; }
    if (q > 0 && !surStockCentral(h) && productOf(h) === k && (h.stock || 0) > 0) { const x = Math.min(q, h.stock); h.stock -= x; q -= x; }
  }
}
/* ---- boîte du stock (haut à gauche) : bois, planches, pierre et nourriture ---- */
const stockBox = document.createElement('aside');
stockBox.className = 'stock'; stockBox.hidden = true; stockBox.setAttribute('aria-label', 'Stock du village');
document.body.appendChild(stockBox);
let stockTexte = '';
function afficherStock() {
  const st = stockVillage(), show = !!(GAME && campColon());
  stockBox.hidden = !show; if (!show) return;
  const total = Object.values(st).reduce((s, n) => s + n, 0), el = document.getElementById('stock-total');
  if (el) { el.textContent = Math.floor(total); el.parentNode.title = 'Tout ce qui est disponible dans le village :\n' + (Object.entries(st).filter(([, q]) => q >= 1).sort((a, b) => b[1] - a[1]).map(([k, q]) => k + ' : ' + Math.floor(q)).join('\n') || 'rien'); }
  const nourriture = ['légumes', 'pain', 'pommes', 'œufs', 'poisson'].reduce((s, k) => s + (st[k] || 0), 0);
  const html = [['Bois', st.bois], ['Planches', st.planches], ['Pierre', st.pierre], ['Nourriture', nourriture]]
    .map(([n, q]) => `<span>${n} <b>${Math.max(0, Math.round(q || 0))}</b></span>`).join('');
  if (html !== stockTexte) { stockTexte = html; stockBox.innerHTML = html; }
}
