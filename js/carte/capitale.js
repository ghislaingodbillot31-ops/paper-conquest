/* ---------- interface de la capitale (region.html) ----------
   La carte occupe tout l'écran et reste toujours visible, à la manière de Manor Lords.
   En haut : nombre de villageois et nom du village (modifiable une seule fois).
   En bas : onglets Route, Construction, Aide ; leurs panneaux se posent sur la carte. */
const NOM_KEY = KEY + '.nom';
let village = { nom:GAME ? `Village de la région ${GAME.region}` : 'Village', fixe:false };
try { Object.assign(village, JSON.parse(localStorage.getItem(NOM_KEY) || '{}')); } catch (e) {}
const ONGLETS = ['route', 'construction', 'aide'];
const OUTILS_CONSTRUCTION = ['house', 'wall', 'tower', 'gate'];
// sans camp de colon, le menu s'ouvre sur Résidentiel, où il se trouve
let onglet = null, categorie = GAME && !S.houses.some(h => h.kind === 'camp_colon') ? 'residentiel' : BUILD_MENUS[0].id;
const esc = t => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/* ---- nom du village ---- */
function afficherNom() {
  $('nom-village').textContent = village.nom;
  document.title = village.nom;
  $('nom-edit').hidden = village.fixe;
}
const nomForm = document.createElement('form');
nomForm.className = 'nom-form'; nomForm.hidden = true;
nomForm.innerHTML = `<label for="nom-input">Nom du village <span class="muted">— modifiable une seule fois</span></label>
  <input id="nom-input" maxlength="32" autocomplete="off" spellcheck="false">
  <p class="muted" id="nom-msg"></p>
  <div class="row"><button type="submit" id="nom-ok">Valider</button><button type="button" id="nom-annuler">Annuler</button></div>`;
document.querySelector('.bandeau').appendChild(nomForm);
let nomArme = false; // deuxième clic = confirmation (le nom devient définitif)
const desarmerNom = () => { nomArme = false; $('nom-ok').textContent = 'Valider'; $('nom-msg').textContent = ''; };
$('nom-edit').addEventListener('click', () => {
  if (village.fixe) return;
  nomForm.hidden = false; $('nom-input').value = village.nom; desarmerNom();
  $('nom-input').focus(); $('nom-input').select();
});
$('nom-input').addEventListener('input', desarmerNom);
$('nom-input').addEventListener('keydown', e => { if (e.key === 'Escape') nomForm.hidden = true; });
$('nom-annuler').addEventListener('click', () => { nomForm.hidden = true; });
nomForm.addEventListener('submit', e => {
  e.preventDefault();
  const n = $('nom-input').value.trim().replace(/\s+/g, ' ');
  if (n.length < 2) { $('nom-msg').textContent = 'Le nom doit compter au moins 2 lettres.'; return; }
  if (!nomArme) { nomArme = true; $('nom-msg').textContent = `« ${n} » sera le nom définitif du village.`; $('nom-ok').textContent = 'Confirmer'; return; }
  village = { nom:n, fixe:true };
  try { localStorage.setItem(NOM_KEY, JSON.stringify(village)); } catch (err) {}
  nomForm.hidden = true; afficherNom(); flash(`Le village s'appelle désormais ${n}`);
});

/* ---- onglets du bas ---- */
function montrer(o) {
  onglet = o;
  for (const t of ONGLETS) document.getElementById('tiroir-' + t).hidden = onglet !== t;
  if (onglet === 'construction') afficherCartes();
}
// Les onglets ne font qu'ouvrir ou fermer leur panneau : le mode placement (bâtiment, route,
// fortification) reste actif ; seule Échap le quitte.
function ouvrir(o) {
  montrer(onglet === o ? null : o);
  syncBarre();
}
// appelé par renderTool (panneau.js) : un outil qui vient d'être choisi au clavier ouvre son onglet
let dernierOutil = 'select';
function syncBarre() {
  const neuf = tool !== dernierOutil; dernierOutil = tool;
  const t = tool === 'road' ? 'route' : OUTILS_CONSTRUCTION.includes(tool) ? 'construction' : null;
  // outil choisi au clavier (2, 4, 5, 6) : on montre sa catégorie ; ensuite, le joueur parcourt librement les catégories
  if (neuf && tool === 'house') { const m = BUILD_MENUS.find(x => x.ids && x.ids.includes(preset.id)); if (m && m.id !== categorie) { categorie = m.id; if (onglet === 'construction') afficherCartes(); } }
  if (neuf && ['wall', 'tower', 'gate'].includes(tool) && categorie !== 'defense') { categorie = 'defense'; if (onglet === 'construction') afficherCartes(); }
  if (neuf && t && !onglet) montrer(t);
  for (const b of document.querySelectorAll('[data-onglet]')) b.setAttribute('aria-pressed', String(b.dataset.onglet === onglet));
  for (const c of document.querySelectorAll('#cartes [data-id]')) c.setAttribute('aria-pressed', String(tool === 'house' && c.dataset.id === preset.id));
  for (const c of document.querySelectorAll('#cartes [data-outil]')) c.setAttribute('aria-pressed', String(tool === c.dataset.outil));
}
document.querySelectorAll('[data-onglet]').forEach(b => b.addEventListener('click', () => ouvrir(b.dataset.onglet)));

/* ---- construction : catégories, puis cartes des bâtiments ---- */
function afficherCartes() {
  const m = BUILD_MENUS.find(x => x.id === categorie) || BUILD_MENUS[0];
  $('categories').innerHTML = BUILD_MENUS.map(x =>
    `<button role="tab" data-cat="${x.id}" aria-selected="${x.id === m.id}">${x.name}</button>`).join('');
  $('cartes').innerHTML = m.tools
    ? m.tools.map(([id, name]) => `<button class="carte" data-outil="${id}"><span class="vignette outil-${id}" aria-hidden="true"></span><b>${name}</b></button>`).join('')
    : m.ids.map(id => PRESETS.find(p => p.id === id)).filter(Boolean).map(p =>
      `<button class="carte" data-id="${p.id}" title="${esc(p.use)}"><canvas class="vignette" data-v="${p.id}" aria-hidden="true"></canvas>` +
      `<b>${p.name}</b><span>${p.f} × ${p.d} cases${p.cap ? ` · ${p.cap} hab.` : ''}</span>${p.cout ? `<span class="cout">${coutTexte(p.cout)}</span>` : ''}</button>`).join('');
  peindreVignettes([...$('cartes').querySelectorAll('canvas[data-v]')]);
  syncBarre();
}
$('categories').addEventListener('click', e => {
  const b = e.target.closest('[data-cat]'); if (!b) return;
  categorie = b.dataset.cat; afficherCartes();
});
$('cartes').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.outil) { setTool(b.dataset.outil); return; }
  preset = PRESETS.find(p => p.id === b.dataset.id); custom = null; swapped = false;
  if (tool !== 'house') setTool('house'); else renderTool();
});

/* Vignettes : chaque bâtiment est peint une fois, seul, comme dans l'atelier, dans sa propre
   image (même méthode que les tuiles du décor, voir paintWith). */
const VIGNETTE = 84, vignettes = new Map();
function peindreVignettes(list) {
  for (const c of list) {
    const id = c.dataset.v;
    if (!vignettes.has(id)) {
      const b = PRESETS.find(p => p.id === id), n = Math.round(VIGNETTE * (window.devicePixelRatio || 1));
      const h = { id:-1, x:0, y:0, a:0, w:b.f * CELL, l:b.d * CELL, f:b.f, d:b.d, kind:b.id, type:b.name, front:1, ...(b.yard ? { yard:'potager' } : {}) };
      const img = document.createElement('canvas'); img.width = img.height = n;
      const g = img.getContext('2d');
      g.fillStyle = biomeLook().ground; g.fillRect(0, 0, n, n);
      try { paintWith(g, n, n, n / (Math.max(h.w, h.l) + 4), n / 2, n / 2, () => { alignPatterns(); drawHouse(h, 'normal'); }); }
      catch (err) { console.warn('vignette', id, err); }
      vignettes.set(id, img);
    }
    const img = vignettes.get(id);
    c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
  }
}

/* ---- fiche de sélection, touche Échap ---- */
$('fiche-close').addEventListener('click', () => { sel = null; zoneEdit = null; renderSel(); requestDraw(); });
// Échap sert uniquement à quitter le mode placement (un tracé en cours est abandonné avec lui) ;
// hors placement, pointeur.js garde la main (zone de travail, sélection)
addEventListener('keydown', e => {
  if (e.key !== 'Escape' || (e.target.closest && e.target.closest('input,textarea,select'))) return;
  if (tool === 'select') return;
  e.stopImmediatePropagation();
  draft = null; setTool('select'); flash('Mode placement quitté');
}, true);
// un bouton cliqué ne garde pas le focus : Entrée, R, Suppr… restent pour la carte
document.addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.closest('form')) b.blur(); });

afficherNom();
