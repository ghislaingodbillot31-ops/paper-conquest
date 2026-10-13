// Routes commerciales de la carte globale : MÊMES RÈGLES que les routes des régions (12/10).
//   node outils/lisser-routes.js            (depuis la racine du projet ; lit outils/routes.avant-lissage.json — l'original, copié au premier lancement — et data/monde/water.json, écrit data/monde/routes.json)
// Étapes (chaque route est passée en kilomètres locaux : projection équirectangulaire autour de son milieu) :
//   1. rééchantillonnage tous les PAS km, bouts fixes (les capitales ne bougent jamais) ; arrondi : aucun coin de plus de ANGLE_MAX°.
//   2. EAU : une même route ne traverse JAMAIS deux fois la même rivière (la partie en trop est ramenée sur la rive de départ, sinon court-circuitée) ; une route ne traverse jamais un lac (contournement par le rivage) ;
//      elle reste à MARGE_EAU km des lacs et des rivières qu'elle ne traverse pas (la zone de 35 km autour d'un pont est exemptée).
//   3. ESPACEMENT : deux routes qui vont dans le même sens restent à ESPACE_PARALLELE km l'une de l'autre au moins (sauf à moins de ZONE_VILLE km d'une capitale, où elles convergent) : les routes qui partent vers des
//      destinations différentes ne se superposent plus. Retour à l'étape 2 (l'écartement a pu pousser une route dans l'eau).
//   4. PONTS : chaque traversée de rivière devient un pont DROIT de 2 x PONT_DEMI km, perpendiculaire à la rivière, raccordé par des Bézier tangentes (RACCORD km) ; une traversée trop près d'un bout de route ou d'un autre
//      pont (< PONT_ESPACE km), ou presque parallèle à la rivière, est laissée telle quelle.
const fs = require('fs'), path = require('path'), G = require('../js/jeu/routes-geo.js');     // (la géométrie des routes est partagée avec l'analyse du globe : js/jeu/routes-geo.js)
const ROOT = path.join(__dirname, '..'), F = path.join(ROOT, 'data/monde/routes.json');
const ESPACE_PARALLELE = 12, ZONE_VILLE = 45, ANGLE_PARALLELE = 35;                                  // km (le globe : 500 m n'est pas visible) ; degrés
const O = { ...G.defauts }, D = Math.PI / 180, len = G.len, arrondir = P => G.arrondir(P, O);
const SAUV = path.join(__dirname, 'routes.avant-lissage.json');
if (!fs.existsSync(SAUV)) fs.copyFileSync(F, SAUV);                                                // (l'original est toujours la source : relancer le script ne lisse jamais deux fois)
const donnees = JSON.parse(fs.readFileSync(SAUV, 'utf8')), eau = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/monde/water.json'), 'utf8'));
const S = { ponts:0, ignores:0, coinsAvant:0, coinsApres:0, doubles:0, doublesResolus:0, lacsCoupes:0, lacsResolus:0, repousses:0, espaces:0 };
const routes = donnees.routes.map(([a, b, coords]) => { const st = G.prepare(a, b, coords, eau, O); S.coinsAvant += G.coins(coords.map(st.vers), O); return st; });
routes.forEach(st => G.eviterEau(st, O, S));                                                         // 2. eau
// ---- 3. espacement des routes parallèles (coordonnées lon/lat communes) ----
function espacer() {
  const L = routes.map(st => st.P.map(st.retour)), kxp = lat => Math.cos(lat * D) * 111.32, cell = 0.4;
  for (let ronde = 0; ronde < 18; ronde++) {
    const grille = new Map(); L.forEach((P, r) => P.forEach((q, i) => { const k = Math.floor(q[0] / cell) + ',' + Math.floor(q[1] / cell); (grille.get(k) || grille.set(k, []).get(k)).push([r, i]); }));
    const dep = L.map(P => P.map(() => [0, 0])); let ajuste = 0;
    const cap = (P, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], k = kxp(P[i][1]); return Math.atan2((b[1] - a[1]) * 110.57, (b[0] - a[0]) * k); };
    const villeP = (P, i) => len([P[i][0] * kxp(P[i][1]), P[i][1] * 110.57], [P[0][0] * kxp(P[i][1]), P[0][1] * 110.57]) < ZONE_VILLE || len([P[i][0] * kxp(P[i][1]), P[i][1] * 110.57], [P[P.length - 1][0] * kxp(P[i][1]), P[P.length - 1][1] * 110.57]) < ZONE_VILLE;
    L.forEach((P, r) => { for (let i = 1; i < P.length - 1; i++) {
      if (villeP(P, i)) continue;
      const gx = Math.floor(P[i][0] / cell), gy = Math.floor(P[i][1] / cell), k = kxp(P[i][1]), ang = cap(P, i);
      for (let u = gx - 1; u <= gx + 1; u++) for (let v = gy - 1; v <= gy + 1; v++) for (const [r2, j] of grille.get(u + ',' + v) || []) {
        if (r2 <= r || j < 1 || j >= L[r2].length - 1 || villeP(L[r2], j)) continue;
        const q = L[r2][j], dx = (q[0] - P[i][0]) * k, dy = (q[1] - P[i][1]) * 110.57, d = Math.hypot(dx, dy);
        if (d >= ESPACE_PARALLELE || d < .01) continue;
        let da = Math.abs(ang - cap(L[r2], j)) % Math.PI; da = Math.min(da, Math.PI - da); if (da > ANGLE_PARALLELE * D) continue;               // (seulement les routes qui vont dans le même sens)
        const m = (ESPACE_PARALLELE - d) / 2 * .6, ux = dx / d, uy = dy / d;
        dep[r][i][0] -= ux * m; dep[r][i][1] -= uy * m; dep[r2][j][0] += ux * m; dep[r2][j][1] += uy * m; ajuste++; } } });
    if (!ajuste) break;
    if (!ronde) S.espaces = ajuste;
    L.forEach((P, r) => { P.forEach((q, i) => { q[0] += dep[r][i][0] / kxp(q[1]); q[1] += dep[r][i][1] / 110.57; }); });
    L.forEach((P, r) => { const st = routes[r], km = P.map(st.vers); st.P = arrondir(km); L[r] = st.P.map(st.retour); });
  }
  routes.forEach((st, r) => { st.P = L[r].map(st.vers); });
}
espacer();

routes.forEach(st => G.eviterEau(st, O));                                                            // (l'écartement a pu pousser une route dans l'eau)
// ---- 4. ponts ----
const sortie = routes.map(st => { S.ponts += G.ponts(st, O, S); S.coinsApres += G.coins(st.P, O); return [st.a, st.b, G.sortie(st, O)]; });
const r4 = x => Math.round(x * 1e4) / 1e4, Pt = p => [r4(p[0]), r4(p[1])];
const txt = '{\n"capitales": [\n' + donnees.capitales.map(([id, c]) => JSON.stringify([id, Pt(c)])).join(',\n') + '\n],\n"routes": [\n' + sortie.map(([a, b, c]) => JSON.stringify([a, b, c.map(Pt)])).join(',\n') + '\n]\n}\n';
fs.writeFileSync(F, txt);
console.log(`eau : ${S.doubles} routes à rivière traversée plusieurs fois (${S.doublesResolus} corrigées) · ${S.lacsCoupes} routes coupant un lac (${S.lacsResolus} contournées) · ${S.repousses} points repoussés`);
console.log(`espacement : ${S.espaces} points de routes parallèles trop proches (< ${ESPACE_PARALLELE} km) écartés`);
console.log(`${sortie.length} routes lissées · ${S.ponts} ponts droits perpendiculaires · ${S.ignores} traversées laissées telles quelles · coins > 35° : ${S.coinsAvant} avant, ${S.coinsApres} après · ${Math.round(txt.length / 1024)} Ko`);
