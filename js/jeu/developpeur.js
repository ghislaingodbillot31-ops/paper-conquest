// ---------- Onglet DEVELOPPEUR: afficher/masquer les couches ----------
// Les couches sont creees de facon asynchrone (apres le calcul du
// reseau): applyDevFilters() est rappele a leur creation et ignore
// simplement celles qui n'existent pas encore. Choix memorise par
// navigateur (localStorage), la carte marche aussi sans.
const DEV_FILTERS = [
  { id:'land', label:'Voie terrestre' },
  { id:'towns', label:'Ville' },
  { id:'numbers', label:'Numéro' },
  { id:'fishing', label:'Zones de pêche' },
  { id:'seas', label:'Noms des mers' },
  { id:'marine', label:'Faune marine' },
  { id:'animals', label:'Zones animales' },
  { id:'colors', label:'Couleurs des régions' },
];
const DEV_STORAGE_KEY = 'dominiumDevFilters.v2';   // (v2 : nouveaux réglages par défaut du 12/10 — les anciens choix enregistrés sont abandonnés)
// carte globale par défaut : seulement les terres et les noms des mers (ni villes, ni routes, ni numéros, ni zones)
const devState = { land:false, towns:false, numbers:false, fishing:false, seas:true, marine:true, animals:false, colors:false };
try{ Object.assign(devState, JSON.parse(localStorage.getItem(DEV_STORAGE_KEY)) || {}); }catch(e){}

function setLayerVisible(layerId, visible){
  if(map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
}
// tout ce qui représente une ville : villages, comptoirs et ports, capitales (créés par plusieurs fichiers, parfois après coup)
const COUCHES_VILLES = ['villages', 'villages-halo', 'npc-ports', 'npc-ports-dir', 'npc-ports-text', 'npc-ports-halo', 'npc-ports-hl', 'npc-capitals', 'npc-capitals-halo', 'npc-capitals-hl', 'capitals-owned', 'capitals-owned-halo'];
function applyLayerVisibility(){
  setLayerVisible('paths', devState.land);
  COUCHES_VILLES.forEach(id => setLayerVisible(id, devState.towns));
  setLayerVisible('faune-marine', devState.marine);
}
map.on('idle', applyLayerVisibility);   // (les couches créées plus tard prennent aussi le réglage ; sans effet si rien ne change)
function applyDevFilters(){
  applyLayerVisibility();
  setLayerVisible('regions-label', devState.numbers);
  ['fishing-fill', 'fishing-line', 'fishing-label'].forEach(id => setLayerVisible(id, devState.fishing));
  setLayerVisible('sea-names', devState.seas);
  // terre unie (couleur du crâne de la carte au trésor) ; en dev, couleur du climat de chaque région
  if(map.getLayer('regions')) { const sel = ['boolean', ['feature-state', 'selected'], false]; map.setPaintProperty('regions', 'fill-color', devState.colors ? ['case', sel, ['get', 'fillColorSel'], ['get', 'fillColor']] : ['case', sel, ['case', ['get', 'isNpc'], eclaircir(NPC_COLOR, 0.28), eclaircir(COULEUR.herbe, 0.28)], ['case', ['get', 'isNpc'], NPC_COLOR, COULEUR.herbe]]); }
  if(typeof updateAnimalLayers === 'function') updateAnimalLayers();
}

(function initDevPanel(){
  const tab = document.getElementById('dev-tab');
  const box = document.getElementById('dev-filters');
  DEV_FILTERS.forEach(f => {
    const btn = document.createElement('button');
    btn.className = 'dev-filter';
    btn.innerHTML = '<i></i><span>' + f.label + '</span>';
    btn.setAttribute('aria-pressed', String(devState[f.id]));
    btn.addEventListener('click', () => {
      devState[f.id] = !devState[f.id];
      btn.setAttribute('aria-pressed', String(devState[f.id]));
      try{ localStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(devState)); }catch(e){}
      applyDevFilters();
    });
    document.getElementById('dev-filter-list').appendChild(btn);
  });
  tab.addEventListener('click', () => {
    const open = box.hidden;
    box.hidden = !open;
    tab.setAttribute('aria-expanded', String(open));
  });
})();
