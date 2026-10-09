/* ---------- écran d'accueil : titre → personnage → (globe : choix de la région) → jeu ---------- */
const $ = id => document.getElementById(id);
const GLOBE = 'index.html';
// partie en cours : régions possédées ou bâtiments enregistrés
function partieEnCours() {
  try { return Object.keys(localStorage).some(k => /^dominium(Owned|Buildings|RegionMap\.)/.test(k) && !['', '[]', '{}', 'null'].includes(localStorage.getItem(k))); } catch (e) { return false; }
}
// nouvelle partie : tout est effacé sauf le profil et les réglages développeur
function effacerPartie() {
  try { for (const k of Object.keys(localStorage)) if (k.startsWith('dominium') && k !== JOUEUR_CLE && !k.startsWith('dominiumDev') && k !== 'dominiumStocksDev') localStorage.removeItem(k); } catch (e) {}
}

let portrait = 0;
function montrer(id) {
  for (const e of document.querySelectorAll('.etape')) e.hidden = e.id !== id;
  const f = document.querySelector('#' + id + ' input, #' + id + ' .btn:not([hidden])'); if (f) f.focus();
}

// ---- titre ----
const profil = lireJoueur(), enCours = partieEnCours();
if (enCours) { $('btn-continuer').hidden = false; $('continuer-sous').textContent = profil ? profil.nom : ''; }
$('btn-continuer').onclick = () => { if (profil) location.href = GLOBE; else montrer('etape-perso'); };   // (ancienne partie sans personnage : on le crée, la partie est gardée)
$('btn-nouvelle').onclick = () => {
  if (!enCours) return montrer('etape-perso');
  $('modale').hidden = false; $('modale-non').focus();
};
$('modale-non').onclick = () => { $('modale').hidden = true; $('btn-nouvelle').focus(); };
$('modale-oui').onclick = () => { effacerPartie(); $('modale').hidden = true; montrer('etape-perso'); };
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('modale').hidden) $('modale-non').click(); });

// ---- personnage ----
if (profil) { $('nom').value = profil.nom; portrait = profil.portrait; }
const grille = $('portraits');
PORTRAITS.forEach((_, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'portrait'; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', 'Portrait ' + (i + 1)); b.innerHTML = portraitSVG(i);
  b.onclick = () => { portrait = i; maj(); };
  grille.appendChild(b);
});
function maj() {
  [...grille.children].forEach((b, i) => { b.setAttribute('aria-checked', i === portrait); b.tabIndex = i === portrait ? 0 : -1; });
  $('perso-suivant').disabled = !$('nom').value.trim();
}
grille.addEventListener('keydown', e => {
  const d = { ArrowRight:1, ArrowDown:1, ArrowLeft:-1, ArrowUp:-1 }[e.key]; if (!d) return;
  e.preventDefault(); portrait = (portrait + d + PORTRAITS.length) % PORTRAITS.length; maj(); grille.children[portrait].focus();
});
$('nom').addEventListener('input', maj);
$('nom').addEventListener('keydown', e => { if (e.key === 'Enter' && !$('perso-suivant').disabled) $('perso-suivant').click(); });
$('perso-retour').onclick = () => montrer('etape-titre');
$('perso-suivant').onclick = () => { if (ecrireJoueur({ nom:$('nom').value, portrait })) location.href = GLOBE; };
maj();
