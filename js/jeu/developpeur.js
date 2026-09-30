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
  { id:'animals', label:'Zones animales' },
];
const DEV_STORAGE_KEY = 'paperConquestDevFilters';
const devState = { land:true, towns:true, numbers:true, fishing:true, seas:true, animals:false };
try{ Object.assign(devState, JSON.parse(localStorage.getItem(DEV_STORAGE_KEY)) || {}); }catch(e){}

function setLayerVisible(layerId, visible){
  if(map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
}
function applyDevFilters(){
  setLayerVisible('paths', devState.land);
  setLayerVisible('villages', devState.towns);
  setLayerVisible('villages-halo', devState.towns);
  setLayerVisible('regions-label', devState.numbers);
  ['fishing-fill', 'fishing-line', 'fishing-label'].forEach(id => setLayerVisible(id, devState.fishing));
  setLayerVisible('sea-names', devState.seas);
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
