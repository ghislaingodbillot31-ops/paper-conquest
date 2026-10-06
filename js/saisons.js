/* ---------- calendrier et saisons ----------
   Le jeu suit le vrai calendrier (jour et mois d'aujourd'hui, sans année) et les vraies saisons :
   - hémisphère nord : printemps 20 mars, été 21 juin, automne 23 septembre, hiver 21 décembre ; hémisphère sud : décalées de 6 mois ;
   - zone tropicale (|latitude| ≤ 15°) : saison sèche et saison des pluies (pluies de mai à octobre au nord, de novembre à avril au sud).
   Température d'une région au jour d'un an : moyenne annuelle (regions.json) + amplitude saisonnière (faible près de l'équateur, forte près des
   pôles) × cosinus de l'année (maximum vers le 19 juillet au nord, le 17 janvier au sud) + petites variations d'un jour à l'autre.
   Neige : s'installe après quelques jours sous 0 °C, d'autant plus que l'air est humide, et fond quand le froid cesse.
   Une région : { lat, tm (température annuelle moyenne, °C), hum (humidité 0 à 1) } ; le résultat : { doy, saison, temp, neige, gel }. */
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MOIS_JOURS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];                 // (pas d'année : février a toujours 28 jours)
const doyDe = (jour, mois) => MOIS_JOURS.slice(0, mois).reduce((a, b) => a + b, 0) + jour;   // mois 0 à 11 ; jour 1 à 31 → 1 à 365
function dateDe(doy) { let m = 0; while (m < 11 && doy > MOIS_JOURS[m]) { doy -= MOIS_JOURS[m]; m++; } return { jour:doy, mois:m }; }
const libelleDate = doy => { const d = dateDe(doy); return d.jour + (d.jour === 1 ? 'er ' : ' ') + MOIS[d.mois]; };
/* Horloge du jeu : 1 jour de jeu = 4 heures réelles (JOUR_MS), donc le temps du jeu va 6 fois plus vite que le réel (une année de jeu ≈ 61 jours réels).
   Au tout premier lancement, elle part de la vraie date et de la vraie heure (UTC) ; son point de départ est gardé dans le navigateur (partagé par le jeu
   et les cartes), donc elle continue entre les sessions. Pour la remettre à zéro : supprimer la clé TEMPS_KEY (le reset du jeu le fait).
   tempsJeu() → { doy : jour de l'année 1 à 365, h : heure UTC du jeu 0 à 24 }. */
const JOUR_MS = 4 * 3600 * 1000, TEMPS_KEY = 'paperConquestTemps';
function doyReel() { const n = new Date(); return doyDe(Math.min(n.getUTCDate(), MOIS_JOURS[n.getUTCMonth()]), n.getUTCMonth()); }
const TEMPS = (() => {
  try { const t = JSON.parse(localStorage.getItem(TEMPS_KEY)); if (t && t.debut && t.j0 >= 0) return t; } catch (e) {}
  const n = new Date(), t = { debut:Date.now(), j0:doyReel() - 1 + (n.getUTCHours() + n.getUTCMinutes() / 60) / 24 };   // (j0 : jours écoulés depuis le 1er janvier, avec la fraction du jour)
  try { localStorage.setItem(TEMPS_KEY, JSON.stringify(t)); } catch (e) {}
  return t;
})();
function tempsJeu() { const j = TEMPS.j0 + (Date.now() - TEMPS.debut) / JOUR_MS; return { doy:Math.floor(j % 365) + 1, h:(j % 1) * 24 }; }
const aujourdhui = () => tempsJeu().doy;                                              // le jour du jeu (1 à 365)

const SAISONS = {
  printemps:{ nom:'Printemps' }, ete:{ nom:'Été' }, automne:{ nom:'Automne' }, hiver:{ nom:'Hiver' },
  seche:{ nom:'Saison sèche' }, pluies:{ nom:'Saison des pluies' },
};
const DOY_PRINTEMPS = doyDe(20, 2), DOY_ETE = doyDe(21, 5), DOY_AUTOMNE = doyDe(23, 8), DOY_HIVER = doyDe(21, 11);
// décalage de couleur du sol (R, V, B) à pleine force selon la saison...
const SAISON_TEINTE = { printemps:[-4, 9, -4], ete:[0, 0, 0], automne:[24, -7, -20], hiver:[-8, -6, 2], seche:[16, 4, -14], pluies:[-8, 10, -4] };
// ...mais c'est la température qui décide : un hiver doux ne change pas la couleur du sol (pleine force sous -2 °C), un automne chaud non plus (sous 8 °C),
// un printemps frais verdit à peine (pleine force dès 10 °C) ; la saison sèche jaunit d'autant plus que la région est sèche
const clair01 = v => Math.max(0, Math.min(1, v));
function teinteSol(m, hum) {
  const w = { hiver:clair01((8 - m.temp) / 10), automne:clair01((18 - m.temp) / 10), printemps:clair01((m.temp - 2) / 8), seche:clair01(1.15 - hum), pluies:1, ete:0 }[m.saison];
  return SAISON_TEINTE[m.saison].map(v => Math.round(v * w));
}
function saisonDe(lat, doy) {
  if (Math.abs(lat) <= 15) { const pluiesNord = doy >= doyDe(1, 4) && doy < doyDe(1, 10); return (lat >= 0) === pluiesNord ? 'pluies' : 'seche'; }
  const nord = doy >= DOY_HIVER || doy < DOY_PRINTEMPS ? 'hiver' : doy < DOY_ETE ? 'printemps' : doy < DOY_AUTOMNE ? 'ete' : 'automne';
  return lat >= 0 ? nord : { printemps:'automne', ete:'hiver', automne:'printemps', hiver:'ete' }[nord];   // au sud : saisons inversées aux mêmes dates
}
function tempDuJour(r, doy) {
  const a = Math.abs(r.lat), amp = a < 15 ? 1.5 : 1.5 + (a - 15) * .27, pic = r.lat >= 0 ? 200 : 17;
  const bruit = 2.2 * Math.sin(doy * .9 + r.lat) + 1.3 * Math.sin(doy * 2.3 + r.tm);
  return r.tm + amp * Math.cos(2 * Math.PI * (doy - pic) / 365) + bruit * Math.min(1, .35 + a / 60);
}
function meteo(r, doy) {
  const temp = tempDuJour(r, doy);
  let froid = 0; for (let k = 0; k < 21; k++) froid += Math.max(0, -tempDuJour(r, ((doy - 1 - k + 365) % 365) + 1));   // 21 derniers jours
  const neige = Math.max(0, Math.min(1, froid / 21 / 6)) * (.35 + .65 * Math.max(0, Math.min(1, r.hum)));
  return { doy, saison:saisonDe(r.lat, doy), temp:Math.round(temp * 10) / 10, neige:Math.round(neige * 100) / 100, gel:temp < -4 };
}
const decritMeteo = m => SAISONS[m.saison].nom + ' · ' + Math.round(m.temp) + ' °C' + (m.neige >= .15 ? ' · neige ' + Math.round(m.neige * 100) + ' %' : '');

/* Météo de la page de carte : la région vient de l'adresse (region.html?lat=…&tm=…&hum=…, posée par le jeu) ; sans elle (éditeur, essai), un climat
   tempéré. METEO sert au dessin du sol (paysage.js) ; l'éditeur la change avec le curseur de date. */
let METEO = null;
const meteoRegion = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const REGION_METEO = { lon:meteoRegion.has('lon') ? +meteoRegion.get('lon') : null, lat:meteoRegion.has('lat') ? +meteoRegion.get('lat') : 48, tm:meteoRegion.has('tm') ? +meteoRegion.get('tm') : 10, hum:meteoRegion.has('hum') ? +meteoRegion.get('hum') : .7 };
let JOUR_AUTO = true;                                                                // vrai : la météo suit le jeu ; faux : un jour imposé (curseur de l'éditeur)
function fixeJour(doy, auto = false) { JOUR_AUTO = auto; METEO = meteo(REGION_METEO, doy); return METEO; }
fixeJour(aujourdhui(), true);

/* ---------- jour et nuit ----------
   Heure solaire locale d'une région = heure UTC du jeu + longitude / 15. Déclinaison du soleil selon le jour de l'année,
   lever et coucher selon la latitude (jours très longs en été près des pôles, nuit polaire en hiver). La lumière va de 0 (nuit, soleil à -6° sous
   l'horizon) à 1 (jour, soleil à 10° au-dessus) : crépuscules progressifs. Sur les cartes, un voile (div #nuit, sans effet sur les clics) assombrit et bleuit
   l'écran la nuit, et rougeoie à l'aube et au crépuscule. */
const RAD = Math.PI / 180;
function soleil(lat, doy, h) {
  const dec = 23.44 * Math.sin(2 * Math.PI * (doy - 81) / 365) * RAD, phi = lat * RAD, c = -Math.tan(phi) * Math.tan(dec);
  const demi = c <= -1 ? 12 : c >= 1 ? 0 : Math.acos(c) / RAD / 15;                   // demi-journée en heures (12 : jour polaire, 0 : nuit polaire)
  const elev = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos((h - 12) * 15 * RAD)) / RAD;
  return { lever:12 - demi, coucher:12 + demi, elev, lumiere:Math.max(0, Math.min(1, (elev + 6) / 16)), polaire:c <= -1 ? 'jour' : c >= 1 ? 'nuit' : null };
}
function heureSolaire(lon) { return (tempsJeu().h + (lon || 0) / 15 + 24) % 24; }          // heure solaire locale d'après l'heure du jeu
const libelleHeure = h => { const m = Math.round(((h % 24) + 24) % 24 * 60); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
// voile du ciel : couleur et opacité selon la lumière (0 nuit ... 1 jour)
function voileCiel(L) {
  if (L >= .97) return 'rgba(0,0,0,0)';
  const crep = Math.max(0, 1 - Math.abs(L - .3) / .3), nuit = [12, 20, 56], aube = [150, 70, 60];
  const rgb = nuit.map((v, i) => Math.round(v + (aube[i] - v) * crep * .8));
  return 'rgba(' + rgb.join(',') + ',' + (.62 * (1 - L) ** 1.1).toFixed(3) + ')';
}
let HEURE_FIXE = null;                                                              // null : l'heure réelle ; sinon une heure imposée (curseur de l'éditeur)
function heureCarte() { return HEURE_FIXE ?? heureSolaire(REGION_METEO.lon); }
function majNuit() {
  const el = typeof document !== 'undefined' && document.getElementById('nuit'); if (!el) return null;
  const s = soleil(REGION_METEO.lat, METEO.doy, heureCarte()); el.style.background = voileCiel(s.lumiere); return s;
}
function fixeHeure(h) { HEURE_FIXE = h; return majNuit(); }
if (typeof document !== 'undefined' && typeof PAGE !== 'undefined' && PAGE !== 'batiments') {
  const wrap = document.getElementById('wrap');
  if (wrap) { const v = document.createElement('div'); v.id = 'nuit'; v.setAttribute('aria-hidden', 'true');
    v.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:1;transition:background 1s'; wrap.appendChild(v);
    majNuit();
    setInterval(() => {                                                              // le temps du jeu avance : voile de nuit, et jour/météo quand le jour change
      if (JOUR_AUTO && aujourdhui() !== METEO.doy) { fixeJour(aujourdhui(), true); if (typeof markAllDirty === 'function') markAllDirty(); }
      majNuit(); }, 20000); }
}
