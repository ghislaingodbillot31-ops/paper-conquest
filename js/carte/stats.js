/* ---------- statistiques du village (panneau de droite permanent, region.html) ----------
   Le panneau de droite occupe toute la hauteur de l'écran et ne se ferme jamais. Quand rien n'est sélectionné il affiche des STATISTIQUES PERSONNALISÉES : le joueur choisit celles qu'il veut voir
   (bouton « Personnaliser » : cases à cocher, enregistrées dans le navigateur, clé STATS_CLE). Chaque statistique : { id, groupe, nom, val() → texte }. Ajouter une statistique = une ligne dans STATS.
   Rafraîchi chaque seconde tant que rien n'est sélectionné. */
const STATS_CLE = 'paperConquestStats', STATS_DEFAUT = ['hab', 'trav', 'or', 'date', 'nourriture', 'bois', 'pierre', 'satiete', 'actifs', 'pleins'];
const stk = k => Math.floor((stockVillage()[k] || 0));
const somme_ = (liste, st = stockVillage()) => Math.floor(liste.reduce((q, k) => q + (st[k] || 0), 0));
const ouvriersVivants = () => [...workers.values()].filter(w => !w.passive);
const moyenne = (liste, f) => liste.length ? Math.round(liste.reduce((q, w) => q + (w[f] === undefined ? 90 : w[f]), 0) / liste.length) + ' %' : '—';
const STATS = [
  { id:'hab',        groupe:'Village',     nom:'Habitants',                 val:() => `${popVillage()} · ${placesLibres()} places libres${logements().sansAbri ? ' · ' + logements().sansAbri + ' sans abri' : ''}` },
  { id:'trav',       groupe:'Village',     nom:'Travailleurs',              val:() => `${travUtilises()} occupés · ${Math.max(0, popVillage() - travUtilises())} libres` },
  { id:'or',         groupe:'Village',     nom:'Or',                        val:() => fmt(S.gold, 0) },
  { id:'bat',        groupe:'Village',     nom:'Bâtiments',                 val:() => S.houses.length },
  { id:'date',       groupe:'Village',     nom:'Date et heure',             val:() => libelleDate(JOUR_AUTO ? aujourdhui() : METEO.doy) + ' · ' + libelleHeure(heureCarte()) },
  { id:'nourriture', groupe:'Stocks',      nom:'Nourriture',                val:() => somme_(FOOD_LIST) },
  { id:'bois',       groupe:'Stocks',      nom:'Bois',                      val:() => stk('bois') },
  { id:'planches',   groupe:'Stocks',      nom:'Planches',                  val:() => stk('planches') },
  { id:'pierre',     groupe:'Stocks',      nom:'Pierre',                    val:() => stk('pierre') },
  { id:'charbon',    groupe:'Stocks',      nom:'Charbon de bois',           val:() => stk('charbon de bois') },
  { id:'minerais',   groupe:'Stocks',      nom:'Minerais',                  val:() => { const st = stockVillage(); return Math.floor(Object.keys(st).filter(k => k.startsWith('minerai')).reduce((q, k) => q + st[k], 0)); } },
  { id:'metaux',     groupe:'Stocks',      nom:'Métaux',                    val:() => somme_(METAUX) },
  { id:'satiete',    groupe:'Besoins',     nom:'Satiété moyenne',           val:() => moyenne(ouvriersVivants(), 'sati') },
  { id:'soif',       groupe:'Besoins',     nom:'Soif comblée (moyenne)',    val:() => moyenne(ouvriersVivants(), 'soif') },
  { id:'vivres',     groupe:'Besoins',     nom:'Vivres des maisons',        val:() => { const m = S.houses.filter(h => (buildingOf(h) || {}).cap); return `${Math.floor(m.reduce((q, h) => q + vivresTotal(h), 0))} / ${m.reduce((q, h) => q + capVivres(h), 0)}`; } },
  { id:'actifs',     groupe:'Production',  nom:'Bâtiments en activité',     val:() => S.houses.filter(h => (jobOf(h) || LUMBER[h.kind] || TAILLEURS[h.kind] || ACTIVITES[h.kind]) && nbTrav(h) > 0).length },
  { id:'pleins',     groupe:'Production',  nom:'Bâtiments pleins',          val:() => S.houses.filter(h => estProducteur(h) && stockPlein(h)).length },
  { id:'arretes',    groupe:'Production',  nom:'Bâtiments arrêtés (OFF)',   val:() => S.houses.filter(h => h.actif === false).length },
  { id:'files',      groupe:'Production',  nom:'Fabrications en attente',   val:() => S.houses.reduce((q, h) => q + (h.file || []).length, 0) },
  { id:'champs',     groupe:'Agriculture', nom:'Champs',                    val:() => `${(S.champs || []).length} · ${fmt((S.champs || []).reduce((q, c) => q + c.aire, 0), 0)} m²` },
  { id:'elevage',    groupe:'Agriculture', nom:"Animaux d'élevage",         val:() => S.houses.reduce((q, h) => q + (h.ext || []).reduce((p, e) => p + (e.n || 0), 0), 0) },
  { id:'sauvages',   groupe:'Agriculture', nom:'Animaux sauvages',          val:() => (typeof troupeaux === 'undefined' ? [] : troupeaux).reduce((q, g) => q + g.an.length, 0) },
  { id:'marche',     groupe:'Marché',      nom:'Marché',                    val:() => marcheDe() ? (marcheOuvert() ? 'ouvert' : 'fermé') + ' · ' + etalsMarche().length + ' étals' : 'aucun marché' },
  { id:'ventes',     groupe:'Marché',      nom:'Ventes des étals (Or)',     val:() => S.houses.reduce((q, h) => q + (h.vendu || 0), 0) },
];
// la journée (horaires : HORAIRE, simulation.js) : [début, fin, texte] ; la période en cours est mise en valeur
const JOURNEE = [[6, 6.5, 'Réveil'], [6.5, 8, 'Marché du matin : étals tenus'], [8, 12, 'Travail'], [12, 14, 'Pause de midi'], [14, 18, 'Travail'], [18, 18.5, 'Fin du travail'], [18.5, 21.5, 'Marché du soir : étals tenus'], [21.5, 22, 'Retour à la maison'], [22, 30, 'Nuit : tout le monde dort']];
function journeeHtml() {
  const H = heureCarte(), h = H < 6 ? H + 24 : H, f = x => String(Math.floor(x % 24)) + (x % 1 ? ' h 30' : ' h');
  return '<h4>Journée · ' + libelleHeure(H) + '</h4>' + JOURNEE.map(([a, b, t]) => '<div class="bat-ligne' + (h >= a && h < b ? ' jour-now' : '') + '"><span>' + t + '</span><b>' + f(a) + ' – ' + f(b) + '</b></div>').join('');
}
let statsEdition = false;
function statsChoisies() { try { const l = JSON.parse(localStorage.getItem(STATS_CLE) || 'null'); if (Array.isArray(l)) return l.filter(id => STATS.some(s => s.id === id)); } catch (e) {} return STATS_DEFAUT.slice(); }
const statsSauve = l => { try { localStorage.setItem(STATS_CLE, JSON.stringify(l)); } catch (e) {} };
function rendreStats(body) {
  const choix = statsChoisies(), esc_ = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  if (statsEdition) {
    const groupes = [...new Set(STATS.map(s => s.groupe))];
    body.innerHTML = '<div class="bat"><h3 class="bat-nom">Statistiques</h3><p class="bat-desc">Cochez les statistiques à afficher.</p>' + groupes.map(g => `<h4>${g}</h4>` + STATS.filter(s => s.groupe === g).map(s => `<label class="stat-case"><input type="checkbox" data-statchk="${s.id}"${choix.includes(s.id) ? ' checked' : ''}> ${esc_(s.nom)}</label>`).join('')).join('') + '<div class="bat-btns bat-pied"><button data-stat="ok">Terminer</button></div></div>';
    return;
  }
  const groupes = [...new Set(STATS.filter(s => choix.includes(s.id)).map(s => s.groupe))];
  body.innerHTML = '<div class="bat stats"><h3 class="bat-nom">' + esc_(typeof village !== 'undefined' ? village.nom : 'Village') + '</h3><span class="bat-cat">Statistiques du village</span>' + journeeHtml() +
    (groupes.length ? groupes.map(g => `<h4>${g}</h4>` + STATS.filter(s => s.groupe === g && choix.includes(s.id)).map(s => { let v; try { v = s.val(); } catch (e) { v = '—'; } return `<div class="bat-ligne"><span>${esc_(s.nom)}</span><b>${esc_(v)}</b></div>`; }).join('')).join('') : '<p class="bat-vide">Aucune statistique choisie.</p>') +
    '<div class="bat-btns bat-pied"><button data-stat="edit">Personnaliser</button></div><p class="bat-aide">Cliquez un bâtiment pour voir sa fiche.</p></div>';
}
(function () {
  const body = document.getElementById('sel-body'); if (!body) return;
  body.addEventListener('click', e => { const b = e.target.closest('[data-stat]'); if (!b || findSel()) return; statsEdition = b.dataset.stat === 'edit'; rendreStats(body); });
  body.addEventListener('change', e => { const t = e.target; if (!t.dataset || !('statchk' in t.dataset)) return; const l = statsChoisies().filter(id => id !== t.dataset.statchk); if (t.checked) l.push(t.dataset.statchk); statsSauve(STATS.map(s => s.id).filter(id => l.includes(id))); });
  if (typeof renderSel === 'function') renderSel();                                                                 // le panneau est permanent : il s'affiche dès le chargement
  setInterval(() => { if (!findSel() && !statsEdition && !document.hidden) rendreStats(body); }, 1000);          // rien de sélectionné : les chiffres suivent le jeu
})();
