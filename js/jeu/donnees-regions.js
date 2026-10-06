// ---------- Donnees des regions (data/regions/) ----------
// Tout ce qui decrit une region (climat, relief, sol, ressources, agriculture, animaux,
// peche, eau, capitale) vient de data/regions/regions.json ; les zones de faune de
// data/regions/zones-animales.json. Les regles qui produisent ces fichiers sont dans
// outils/modele-regions.js (regenerer : node outils/build-regions.js).
const REGION_DATA = new Map();   // numero de region -> fiche de regions.json
const EMPTY_REGION = { climat:{ biome:'tempere', couleur:'#a9db8e' }, sol:{ qualite:0 }, ressources:{}, agriculture:{},
  animaux:{ zone:null, elevage:{}, faune:{}, predateurs:{} }, peche:{ eau_douce:{}, mer:[] }, eau:{ fleuves:[], lacs:0, cotiere:false, cours_eau_carte:'petite' } };
const regionInfo = id => REGION_DATA.get(id) || EMPTY_REGION;
// climat d'une region pour js/saisons.js : latitude de sa capitale, temperature annuelle moyenne, humidite
const regionClimat = id => { const r = regionInfo(id), c = r.climat || {}; return { lon:(r.centre || [0, 48])[0], lat:(r.centre || [0, 48])[1], tm:c.temperature_c ?? 10, hum:c.humidite ?? .7 }; };
const regionSoleil = id => { const c = regionClimat(id), h = heureSolaire(c.lon); return { h, ...soleil(c.lat, aujourdhui(), h) }; };   // soleil de la region maintenant (heure reelle)
const regionMeteo = id => meteo(regionClimat(id), aujourdhui());                       // meteo du jour (vrai jour et vrai mois)
function loadRegionData(list, zones){
  ANIMAL_ZONES = zones.map(z => ({ name:z.nom, macro:z.ensemble, anchors:z.ancrages, elevage:z.elevage, faune:z.faune, predateur:z.predateurs, regions:[] }));
  list.forEach(r => {
    REGION_DATA.set(r.id, r);
    regionResources.set(r.id, { ...r.ressources, ...r.agriculture, ...r.animaux.elevage, ...r.animaux.faune, ...r.animaux.predateurs, ...r.peche.eau_douce });
    regionSoil.set(r.id, r.sol.qualite);
    if(r.eau.fleuves.length || r.eau.lacs) regionWaters.set(r.id, { rivers:RIVIERES_EN_MER ? [] : r.eau.fleuves, lakes:r.eau.lacs });
    if(r.animaux.zone !== null && ANIMAL_ZONES[r.animaux.zone]){ regionAnimalZone.set(r.id, r.animaux.zone); ANIMAL_ZONES[r.animaux.zone].regions.push(r.id); }
  });
}
