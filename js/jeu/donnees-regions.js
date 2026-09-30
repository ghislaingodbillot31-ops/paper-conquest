// ---------- Donnees des regions (data/regions/) ----------
// Tout ce qui decrit une region (climat, relief, sol, ressources, agriculture, animaux,
// peche, eau, capitale) vient de data/regions/regions.json ; les zones de faune de
// data/regions/zones-animales.json. Les regles qui produisent ces fichiers sont dans
// outils/modele-regions.js (regenerer : node outils/build-regions.js).
const REGION_DATA = new Map();   // numero de region -> fiche de regions.json
const EMPTY_REGION = { climat:{ biome:'tempere', couleur:'#a9db8e' }, sol:{ qualite:0 }, ressources:{}, agriculture:{},
  animaux:{ zone:null, elevage:{}, faune:{}, predateurs:{} }, peche:{ eau_douce:{}, mer:[] }, eau:{ fleuves:[], lacs:0, cotiere:false, cours_eau_carte:'petite' } };
const regionInfo = id => REGION_DATA.get(id) || EMPTY_REGION;
function loadRegionData(list, zones){
  ANIMAL_ZONES = zones.map(z => ({ name:z.nom, macro:z.ensemble, anchors:z.ancrages, elevage:z.elevage, faune:z.faune, predateur:z.predateurs, regions:[] }));
  list.forEach(r => {
    REGION_DATA.set(r.id, r);
    regionResources.set(r.id, { ...r.ressources, ...r.agriculture, ...r.animaux.elevage, ...r.animaux.faune, ...r.animaux.predateurs, ...r.peche.eau_douce });
    regionSoil.set(r.id, r.sol.qualite);
    if(r.eau.fleuves.length || r.eau.lacs) regionWaters.set(r.id, { rivers:r.eau.fleuves, lakes:r.eau.lacs });
    if(r.animaux.zone !== null && ANIMAL_ZONES[r.animaux.zone]){ regionAnimalZone.set(r.id, r.animaux.zone); ANIMAL_ZONES[r.animaux.zone].regions.push(r.id); }
  });
}
