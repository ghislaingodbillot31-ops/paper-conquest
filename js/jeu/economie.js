// ---------- Economie: temps de jeu, tresor (Or), production, stocks ----------
// Monnaie: l'Or. Le minerai d'or extrait par un atelier de mineur n'est
// qu'un stock comme un autre: il ne cree PAS de monnaie (pour l'instant).
// - Temps: 1 jour de jeu toutes les ECO.dayMs (60 s reelles). Les jours
//   manques pendant l'absence du joueur sont rattrapes (plafond).
// - Revenu: un impot fixe par region possedee et par jour.
// - Depenses: achat de regions (la premiere est offerte), batiments.
// - Production: chaque batiment produit chaque jour les ressources de sa
//   region selon leur niveau (faible 1, moyen 2, eleve 4 unites / jour),
//   rangees dans le stock de la region (sa capitale).
const ECO = { startGold:1000, dayMs:60000, taxPerRegion:15, regionBasePrice:400, maxCatchUpDays:240,
  startDate:new Date(2027, 2, 15), perLevel:[0, 1, 2, 4] };
const ECO_STORAGE_KEY = 'paperConquestEconomy';
const newEconomy = () => ({ gold:ECO.startGold, day:0, lastTick:Date.now(), stocks:{} });
let eco = newEconomy();
try{ const saved = JSON.parse(localStorage.getItem(ECO_STORAGE_KEY)); if(saved && typeof saved.gold === 'number') eco = Object.assign(newEconomy(), saved); }catch(e){}
const saveEconomy = () => { try{ localStorage.setItem(ECO_STORAGE_KEY, JSON.stringify(eco)); }catch(e){} };
const fmtGold = n => Math.floor(n).toLocaleString('fr-FR') + ' Or';
const goodName = k => (RESOURCES[k] && RESOURCES[k].name) || SEA_NAMES[k] || k;
// prix d'une nouvelle region: la premiere est offerte, puis 400, 800, 1 200 Or...
const regionPrice = () => ownedRegions.size * ECO.regionBasePrice;
function spendGold(n){ if(eco.gold < n) return false; eco.gold -= n; saveEconomy(); renderEconomy(); return true; }

// Ce qu'un batiment produit chaque jour dans une region: { ressource: unites }
const FARM_EXCLUDE = new Set(['bois', 'bois_chauffage', 'pierre']);   // scierie, carriere: plus tard
function productionOf(buildingId, regionId){
  const r = regionResources.get(regionId) || {}, out = {};
  const add = (k, lv) => { if(lv > 0) out[k] = Math.max(out[k] || 0, ECO.perLevel[lv]); };
  if(buildingId === 'mine') MINERALS.forEach(k => add(k, r[k] || 0));
  else if(buildingId === 'ferme') CROPS.filter(k => !FARM_EXCLUDE.has(k)).forEach(k => add(k, r[k] || 0));
  else if(buildingId === 'elevage') animalsOf('elevage').forEach(k => add(k, r[k] || 0));
  else if(buildingId === 'pecherie'){
    FRESH_FISH.forEach(k => add(k, r[k] || 0));                                    // fleuves et lacs
    regionFishingZones(regionId).forEach(z => z.fish.filter(k => SEA_FISH[k]).forEach(k => add(k, seaLevel(z, k))));   // mer
  }
  return out;
}
function productionText(buildingId, regionId){
  const prod = productionOf(buildingId, regionId), list = Object.entries(prod);
  return list.length ? 'Production : ' + list.map(([k, q]) => q + ' ' + goodName(k)).join(', ') + ' / jour.' : '';
}
// production totale d'une region par jour
function regionProduction(regionId){
  const out = {};
  regionBuildings(regionId).forEach(b => Object.entries(productionOf(b.type, regionId)).forEach(([k, q]) => { out[k] = (out[k] || 0) + q; }));
  return out;
}
const dailyIncome = () => ownedRegions.size * ECO.taxPerRegion;

// Un jour de jeu: impots, puis production de chaque region
function economyDay(){
  eco.day++;
  eco.gold += dailyIncome();
  ownedRegions.forEach(id => {
    const prod = regionProduction(id), st = eco.stocks[id] = eco.stocks[id] || {};
    Object.entries(prod).forEach(([k, q]) => { st[k] = (st[k] || 0) + q; });
  });
}
function economyTick(){
  const due = Math.floor((Date.now() - eco.lastTick) / ECO.dayMs);
  if(due > 0){
    for(let i = 0; i < Math.min(due, ECO.maxCatchUpDays); i++) economyDay();
    eco.lastTick += due * ECO.dayMs;
    saveEconomy();
    if(selectedId !== null && ownedRegions.has(selectedId)) renderRegionPanel();
  }
  renderEconomy();
}
function renderEconomy(){
  const g = document.getElementById('eco-gold'); if(!g) return;
  g.textContent = fmtGold(eco.gold);
  document.getElementById('eco-gold-delta').textContent = '+' + dailyIncome() + ' / jour';
  document.getElementById('topbar-date').textContent = libelleDate(aujourdhui());   // le vrai jour et le vrai mois, sans année (js/saisons.js)
  const left = Math.max(0, Math.ceil((eco.lastTick + ECO.dayMs - Date.now()) / 1000));
  document.getElementById('topbar-time').textContent = libelleHeure(tempsJeu().h) + ' · récolte dans ' + left + ' s';   // heure du jeu (1 jour de jeu = 4 h réelles) ; la production reste une fois par minute
}
function initEconomy(){
  economyTick();                    // rattrape les jours manques
  setInterval(economyTick, 1000);
}

// Onglet Stocks de la capitale: tresor, revenu, stock et production de la region
function renderStocksTab(el, regionId){
  const st = eco.stocks[regionId] || {}, prod = regionProduction(regionId);
  const keys = [...new Set([...Object.keys(st), ...Object.keys(prod)])];
  const cats = [
    ['Minerais et gisements', k => MINERALS.includes(k)], ['Cultures', k => CROPS.includes(k)],
    ['Élevage', k => LAND_ANIMALS[k] && LAND_ANIMALS[k].cat === 'elevage'], ['Pêche', k => FRESH_FISH.includes(k) || !!SEA_FISH[k]],
  ];
  const rows = cats.map(([label, test]) => {
    const ks = keys.filter(test).sort((a, b) => (st[b] || 0) - (st[a] || 0));
    return ks.length ? '<tr class="cat"><td colspan="3">' + label + '</td></tr>' + ks.map(k => '<tr><td>' + goodName(k) + '</td><td class="n">' +
      Math.floor(st[k] || 0).toLocaleString('fr-FR') + '</td><td class="n">' + (prod[k] ? '<span class="eco-plus">+' + prod[k] + '</span>' : '—') + '</td></tr>').join('') : '';
  }).join('');
  const nb = regionBuildings(regionId).filter(b => b.type !== 'port').length;
  setLiveHtml(el,
    '<div class="eco-cards">' +
      '<div class="eco-card"><div class="k">Trésor</div><div class="v">' + fmtGold(eco.gold) + '</div><div class="s">monnaie de tout le royaume</div></div>' +
      '<div class="eco-card"><div class="k">Revenu</div><div class="v eco-plus">+' + dailyIncome() + ' / jour</div><div class="s">impôts : ' + ownedRegions.size + ' région(s) × ' + ECO.taxPerRegion + ' Or</div></div>' +
      '<div class="eco-card"><div class="k">Jour ' + eco.day + '</div><div class="v">' + document.getElementById('topbar-date').textContent + '</div><div class="s">1 jour = ' + (ECO.dayMs / 1000) + ' s réelles</div></div>' +
    '</div>' +
    '<div class="region-section-title">Stocks de la région ' + regionId + '</div>' +
    (rows ? '<table class="eco-table"><thead><tr><th>Ressource</th><th class="n">Stock</th><th class="n">Production / jour</th></tr></thead><tbody>' + rows + '</tbody></table>'
      : '<p class="cap-empty">' + (nb ? 'La production arrive au prochain jour.' : 'Aucune production : construisez une ferme, une pêcherie, un élevage ou un atelier de mineur (onglet Construction).') + '</p>') +
    '<p class="cap-empty">Le minerai d\'or extrait est un stock : il ne crée pas de monnaie.</p>');
}
