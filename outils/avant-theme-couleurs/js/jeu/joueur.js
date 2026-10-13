/* ---------- profil du joueur (nom + portrait), mémorisé dans ce navigateur ----------
   Partagé par l'écran d'accueil (accueil.html, création) et le globe (index.html, affichage). */
const JOUEUR_CLE = 'dominiumJoueur';
// portraits : un croquis simple (peau, cheveux, couvre-chef) tracé en SVG, sans fichier image
const PORTRAITS = [
  { peau:'#f1cfa6', cheveux:'#5a3a22', coiffe:'bonnet', fond:'#d9c9a0' },
  { peau:'#e0a878', cheveux:'#2a1c12', coiffe:'chapeau', fond:'#b7c7a0' },
  { peau:'#c98b5f', cheveux:'#1d1510', coiffe:'aucune', fond:'#c4b6d0' },
  { peau:'#8d5a3b', cheveux:'#14100c', coiffe:'foulard', fond:'#e0b9a0' },
  { peau:'#f4d8b8', cheveux:'#b9892c', coiffe:'aucune', fond:'#a9c3cf' },
  { peau:'#e6b891', cheveux:'#9a3d22', coiffe:'bonnet', fond:'#cfd6a0' },
  { peau:'#a9714a', cheveux:'#3a2a20', coiffe:'chapeau', fond:'#d6b0b0' },
  { peau:'#f1cfa6', cheveux:'#c9c4b8', coiffe:'foulard', fond:'#b8cdb0' },
];
function portraitSVG(i) {
  const p = PORTRAITS[((i % PORTRAITS.length) + PORTRAITS.length) % PORTRAITS.length], ink = '#3c3527';
  const coiffe = {
    aucune:`<path d="M26 40 Q32 20 50 20 Q68 20 74 40 Q64 30 50 30 Q36 30 26 40Z" fill="${p.cheveux}" stroke="${ink}" stroke-width="1.6"/>`,
    bonnet:`<path d="M25 42 Q26 16 50 16 Q74 16 75 42 Z" fill="#8a5a3c" stroke="${ink}" stroke-width="1.6"/><rect x="24" y="38" width="52" height="7" rx="3" fill="#b9935a" stroke="${ink}" stroke-width="1.6"/>`,
    chapeau:`<ellipse cx="50" cy="38" rx="34" ry="7" fill="#6d5238" stroke="${ink}" stroke-width="1.6"/><path d="M33 38 Q34 14 50 14 Q66 14 67 38Z" fill="#7d6044" stroke="${ink}" stroke-width="1.6"/>`,
    foulard:`<path d="M24 44 Q24 16 50 16 Q76 16 76 44 Q62 34 50 34 Q38 34 24 44Z" fill="#b5623a" stroke="${ink}" stroke-width="1.6"/>`,
  }[p.coiffe];
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="14" fill="${p.fond}"/>
    <path d="M14 100 Q16 70 50 68 Q84 70 86 100Z" fill="#8a6f4a" stroke="${ink}" stroke-width="1.6"/>
    <rect x="43" y="56" width="14" height="14" fill="${p.peau}" stroke="${ink}" stroke-width="1.6"/>
    <ellipse cx="50" cy="44" rx="19" ry="22" fill="${p.peau}" stroke="${ink}" stroke-width="1.6"/>
    ${coiffe}
    <circle cx="43" cy="46" r="1.8" fill="${ink}"/><circle cx="57" cy="46" r="1.8" fill="${ink}"/>
    <path d="M44 56 Q50 60 56 56" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/></svg>`;
}
function lireJoueur() { try { const j = JSON.parse(localStorage.getItem(JOUEUR_CLE) || 'null'); return j && typeof j.nom === 'string' && j.nom ? j : null; } catch (e) { return null; } }
function ecrireJoueur(j) { try { localStorage.setItem(JOUEUR_CLE, JSON.stringify({ nom:String(j.nom).trim().slice(0, 24), portrait:j.portrait | 0 })); return true; } catch (e) { return false; } }

// mode développeur (même réglage que la carte de région : Ctrl + Maj + D, ou ?dev dans l'adresse) : hors de ce mode, le joueur ne voit que la carte de sa région, sans zones de pêche ni lignes de circulation
const estDev = () => { if (window.name === 'jeu-joueur') return false;   // (cadre « Jeu » du studio : version joueur, jamais de mode développeur)
  try { return localStorage.getItem('dominiumDev') === '1' || /[?&]dev\b/.test(location.search); } catch (e) { return false; } };
