// ---------------------------------------------------------------
// Donnees fictives -- toute l'interface est reelle (navigation,
// onglets, selection, verrouillage), seules les valeurs affichees
// sont des exemples en attendant les vraies mecaniques de jeu.
// ---------------------------------------------------------------
const NAV_ITEMS = [
  { view:'carte', label:'Carte', icon:'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2Z M9 4v14M15 6v14' },
  { view:'capitale', label:'Capitale', icon:'M3 20h18 M5 20V10 M9 20V10 M15 20V10 M19 20V10 M2.5 10h19L12 3.5Z' },
];

// Les 6 continents ne servent plus qu'a classer/colorer les vraies regions
// (voir plus bas): couleur (CSS, pour le petit croquis du panneau), couleur
// hexadecimale equivalente (WebGL MapLibre ne resout pas les var() CSS) et
// une accroche courte affichee dans le panneau de region.
const CONTINENTS = [
  { id:'namerica', name:'Amérique du Nord', color:'var(--reg-namerica)', tagline:'Une puissance industrielle et technologique établie.' },
  { id:'samerica', name:'Amérique du Sud', color:'var(--reg-samerica)', tagline:'Un géant agricole aux richesses naturelles immenses.' },
  { id:'europe', name:'Europe', color:'var(--reg-europe)', tagline:'Une région stable et stratégique.' },
  { id:'africa', name:'Afrique', color:'var(--reg-africa)', tagline:'Un continent jeune au potentiel de croissance rapide.' },
  { id:'asia', name:'Asie', color:'var(--reg-asia)', tagline:'Le cœur battant de l\'économie mondiale.' },
  { id:'oceania', name:'Océanie', color:'var(--reg-oceania)', tagline:'Isolée, stable, et riche en ressources naturelles.' },
];
const CONTINENT_BY_ID = {};
CONTINENTS.forEach(c => { CONTINENT_BY_ID[c.id] = c; });

// Regions NPC (comptoirs de commerce, pour le futur systeme d'echanges):
// non selectionnables comme point de depart, couleur violette distincte,
// mais restent pleinement integrees au reseau routier.
//  - 4 comptoirs d'Australie choisis a la main (449, 421, 477, 489);
//  - 38 comptoirs dans le reste du monde, choisis parmi les regions
//    cotieres (mer ouverte: pas la Caspienne ni l'Aral) ou traversees par
//    un grand fleuve navigable qui rejoint l'ocean (les deux a la fois de preference:
//    estuaires), au moins 1 800 km entre deux comptoirs, hors calotte,
//    grand Nord et deserts extremes. Tous accessibles en bateau.
const NPC_COLOR = '#8f5fa8';
const NPC_REGION_IDS = new Set([449, 421, 477, 489,
  21, 22, 23, 42, 52, 68, 77, 100, 111, 113, 134, 147, 182, 188, 222, 227, 236, 240, 248, 256, 261, 302, 311, 314, 319, 320, 329, 337,
  370, 372, 398, 403, 411, 435, 469, 486, 497, 499]);

const SITUATION_TABS = [
  { id:'economie', label:'Économie', series:[
    { name:'PIB mondial', color:'var(--chart-1)', values:[520,610,690,790,900] },
    { name:'Commerce mondial', color:'var(--chart-2)', values:[300,340,380,430,470] } ] },
  { id:'diplomatie', label:'Diplomatie', series:[
    { name:'Alliances actives', color:'var(--chart-1)', values:[38,41,44,47,52] },
    { name:'Tensions ouvertes', color:'var(--chart-3)', values:[14,16,13,15,11] } ] },
  { id:'militaire', label:'Militaire', series:[
    { name:'Dépenses militaires', color:'var(--chart-1)', values:[210,225,238,250,268] },
    { name:'Conflits actifs', color:'var(--chart-3)', values:[9,8,10,7,6] } ] },
];
const YEARS = [2025,2026,2027,2028,2029];

// Pas encore de puissances classees ni d'evenements: la partie commence
// sans economie.
const RANKING = [];
const EVENTS = [];

// ---------- Helpers ----------
function svgEl(tag, attrs){
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for(const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}
function iconCheck(){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 12l5 5 11-11"/></svg>'; }
function iconWarn(){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4l9 16H3Z"/><path d="M12 10v4M12 17h.01"/></svg>'; }

// ---------- Sidebar ----------
const sidebar = document.getElementById('sidebar');
NAV_ITEMS.forEach((item, i) => {
  const btn = document.createElement('button');
  btn.className = 'nav-item' + (i === 0 ? ' active' : '');
  btn.dataset.view = item.view;
  btn.dataset.label = item.dataLabel || item.label;
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">' +
    item.icon.split('M').filter(Boolean).map(seg => '<path d="M' + seg.trim() + '"/>').join('') + '</svg><span>' + item.label + '</span>';
  btn.addEventListener('click', () => switchView(btn));
  sidebar.appendChild(btn);
});
function switchView(activeBtn){
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b === activeBtn));
  const view = activeBtn.dataset.view;
  document.querySelectorAll('.view').forEach(v => v.hidden = v.dataset.view !== view);
  if(view === 'capitale' && typeof renderCapitalView === 'function') renderCapitalView();
}
const showView = view => switchView(document.querySelector('.nav-item[data-view="' + view + '"]'));
const currentView = () => { const b = document.querySelector('.nav-item.active'); return b ? b.dataset.view : null; };
