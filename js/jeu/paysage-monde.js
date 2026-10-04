/* ---------- Vue « Paysage » : le monde entier peint comme une carte de région ----------
   ESSAI. Un bouton sur le globe peint toutes les terres à partir des fiches des régions, avec le
   peintre commun (js/commun/paysage-peint.js). L'image (4096 px, Mercator) est peinte une seule fois,
   à la demande, par tranches (la page reste fluide), puis posée sur le globe sous les couches de jeu
   (frontières, régions possédées, filtres). */
const PAYSAGE_S = 4096;
let paysageEtat = 'vide';   // vide -> calcul -> pret
const mercY = lat => { const l = Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI / 180; return (1 - Math.log(Math.tan(l) + 1 / Math.cos(l)) / Math.PI) / 2; };
// contours des régions en pixels Mercator, recopiés 3 fois (longitudes déroulées au-delà de ±180)
function anneauxMonde(feature, S){
  const polys = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates, rings = [];
  for(const dx of [-S, 0, S]) for(const poly of polys) for(const ring of poly) rings.push(ring.map(([lon, lat]) => [(lon + 180) / 360 * S + dx, mercY(lat) * S]));
  return rings;
}
async function basculePaysage(){
  const btn = document.getElementById('paysage-btn'); if(!btn || typeof regionsFc === 'undefined' || !regionsFc) return;
  if(paysageEtat === 'calcul') return;
  if(paysageEtat === 'vide'){
    paysageEtat = 'calcul'; btn.disabled = true; const t0 = performance.now();
    try{
      const canvas = await peintPaysage(PAYSAGE_S, PAYSAGE_S, regionsFc.features.map(f => ({ id: f.id, rings: anneauxMonde(f, PAYSAGE_S) })), regionInfo,
        { fieldDiv: 4, flou: 6, bruit: 1 / 34, progres: p => { btn.textContent = '🌿 Peinture ' + p + ' %'; } });
      map.addSource('paysage', { type: 'canvas', canvas, coordinates: [[-180, 85.0511], [180, 85.0511], [180, -85.0511], [-180, -85.0511]], animate: false });
      const ordre = map.getStyle().layers.map(l => l.id), apres = ordre[ordre.indexOf('regions') + 1];   // juste au-dessus du remplissage des régions
      map.addLayer({ id: 'paysage', type: 'raster', source: 'paysage', paint: { 'raster-fade-duration': 0, 'raster-resampling': 'linear' } }, apres);
      console.log('Paysage du monde peint en', Math.round(performance.now() - t0), 'ms');
      paysageEtat = 'pret';
    }catch(e){ console.error('Paysage impossible :', e); paysageEtat = 'vide'; btn.disabled = false; btn.textContent = '🌿 Paysage'; return; }
    btn.disabled = false; btn.setAttribute('aria-pressed', 'true'); btn.textContent = '🌿 Paysage'; return;
  }
  const on = btn.getAttribute('aria-pressed') !== 'true';
  map.setLayoutProperty('paysage', 'visibility', on ? 'visible' : 'none');
  btn.setAttribute('aria-pressed', String(on));
}
document.getElementById('paysage-btn')?.addEventListener('click', basculePaysage);
