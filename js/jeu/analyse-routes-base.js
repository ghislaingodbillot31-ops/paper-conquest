/* ---------- décisions de l'analyse des routes : lecture et application (chargé AVANT globe.js) ----------
   Chargé avant js/jeu/globe.js : les routes du globe sont lues de façon asynchrone et pouvaient arriver AVANT js/jeu/analyse-routes.js, auquel cas les suppressions, modifications et ajouts n'étaient pas appliqués
   (les routes supprimées réapparaissaient). Les décisions sont gardées à DEUX endroits : le navigateur (localStorage, clé dominiumAnalyseRoutes) et le DISQUE (data/monde/routes.json réécrit à chaque action et
   data/monde/analyse-routes.json, par le serveur de logs). */
const ANALYSE_CLE = 'dominiumAnalyseRoutes';
const analyseLire = () => { try { const o = JSON.parse(localStorage.getItem(ANALYSE_CLE) || '{}'); return { dec:o.dec || {}, mod:o.mod || {}, add:o.add || {} }; } catch (e) { return { dec:{}, mod:{}, add:{} }; } };
const analyseCle = r => r[0] + '-' + r[1];
// appliqué au chargement du globe : routes supprimées retirées, routes modifiées remplacées, routes AJOUTÉES entre deux villes ajoutées
function appliquerAnalyseRoutes(routes) {
  const { dec, mod, add } = analyseLire(), vues = new Set(routes.map(analyseCle));
  return routes.filter(r => dec[analyseCle(r)] !== 's').map(r => mod[analyseCle(r)] ? [r[0], r[1], mod[analyseCle(r)]] : r).concat(Object.entries(add).filter(([k]) => !vues.has(k) && dec[k] !== 's').map(([k, c]) => [+k.split('-')[0], +k.split('-')[1], c]));
}
