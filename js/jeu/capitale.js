// ---------- Fenetres de gestion (capitale, comptoir...) a onglets ----------
// Une fenetre = { title, tabs, ctx, tab }. Pour ajouter un onglet a la
// capitale: une entree { id, label, render(el, regionId), live? } dans
// CAPITAL_TABS (live: rafraichi chaque seconde tant qu'il est affiche).
// (render appelle sa fonction a l'affichage : les onglets sont definis dans d'autres fichiers)
const CAPITAL_TABS = [
  { id:'carte', label:'Carte de la région', render:(el, id) => renderRegionMapTab(el, id) },
  { id:'plan', label:'Plan', render:(el, id) => renderPlanTab(el, id) },
  { id:'stocks', label:'Stocks', render:(el, id) => renderStocksTab(el, id), live:true },
  { id:'construction', label:'Construction', render:(el, id) => renderConstructionTab(el, id) },
  { id:'caravane', label:'Caravane', render:(el, id) => renderCaravanTab(el, id), live:true },
  { id:'voyage', label:'Voyage', render:(el, id) => renderVoyageTab(el, id), live:true },
];
// La capitale a sa propre vue (menu de gauche, meme taille que la carte);
// les autres fenetres (port, comptoir) restent en fenetre modale.
let capitalTab = CAPITAL_TABS[0].id, capitalRegion = null, winState = null;
function openWindow(state){
  winState = state;
  renderWindow();
  document.getElementById('capital-modal').hidden = false;
  document.getElementById('capital-close').focus();
}
// Barre d'onglets + contenu de l'onglet courant dans les elements donnes
function renderTabs(tabsEl, bodyEl, tabs, current, onPick, ctx){
  tabsEl.innerHTML = '';
  tabs.forEach(t => {
    const b = document.createElement('button');
    b.className = 'cap-tab'; b.type = 'button'; b.textContent = t.label; b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(t.id === current));
    b.addEventListener('click', () => onPick(t.id));
    tabsEl.appendChild(b);
  });
  const tab = tabs.find(t => t.id === current) || tabs[0];
  bodyEl._liveHtml = null;
  if(tab.id !== 'carte') bodyEl.classList.remove('has-map');
  tab.render(bodyEl, ctx);
}
function renderWindow(){
  const s = winState; if(!s) return;
  document.getElementById('capital-title').textContent = s.title;
  renderTabs(document.getElementById('capital-tabs'), document.getElementById('capital-body'), s.tabs, s.tab,
    id => { s.tab = id; renderWindow(); }, s.ctx);
}
function renderCapitalView(){
  const owned = [];   // (plus d'achat : la region affichee est celle sur laquelle on a clique)
  const title = document.getElementById('capview-title'), sw = document.getElementById('capview-switch');
  const tabsEl = document.getElementById('capview-tabs'), body = document.getElementById('capview-body');
  sw.hidden = owned.length < 2;
  document.getElementById('capview-select').innerHTML = owned.map(id => '<option value="' + id + '"' + (id === capitalRegion ? ' selected' : '') + '>' + id + '</option>').join('');
  // onglet « Carte de la region » : la carte du village occupe tout l'ecran
  document.querySelector('.capital-view').classList.toggle('plein-ecran', capitalRegion !== null && capitalTab === 'carte');
  if(capitalRegion === null){
    title.textContent = 'Capitale';
    tabsEl.innerHTML = ''; body._liveHtml = null;
    body.innerHTML = '<p class="cap-none">Aucune région affichée.<br>Cliquez sur une région de la carte pour l\'afficher.</p>';
    return;
  }
  title.textContent = 'Capitale — Région ' + capitalRegion;
  renderTabs(tabsEl, body, CAPITAL_TABS, capitalTab, id => { capitalTab = id; renderCapitalView(); }, capitalRegion);
}
document.getElementById('cap-globe').addEventListener('click', () => showView('carte'));
document.getElementById('cap-gestion').addEventListener('click', () => { capitalTab = 'plan'; renderCapitalView(); });
function openCapital(regionId){
  capitalRegion = regionId;
  showView('capitale');
}
// Ferme la fenetre modale et, depuis la vue Capitale, revient a la carte
// (placement d'un batiment, envoi d'une caravane...).
function closeCapital(){
  document.getElementById('capital-modal').hidden = true; winState = null;
  if(currentView() === 'capitale') showView('carte');
}
// Onglets "live" (Caravane, Voyage): rafraichis chaque seconde s'ils sont affiches
setInterval(() => {
  const live = (tabs, id) => { const t = tabs.find(x => x.id === id); return t && t.live ? t : null; };
  const w = winState && live(winState.tabs, winState.tab);
  if(w) w.render(document.getElementById('capital-body'), winState.ctx);
  const c = currentView() === 'capitale' && capitalRegion !== null && live(CAPITAL_TABS, capitalTab);
  if(c) c.render(document.getElementById('capview-body'), capitalRegion);
}, 1000);
