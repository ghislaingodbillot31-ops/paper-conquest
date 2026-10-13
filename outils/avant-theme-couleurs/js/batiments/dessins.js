// marché : cases de 8 × 8 (CELL), rangée après rangée ; cellMarche donne (u0, t0, u1, t1) de la case c, nbCellMarche leur nombre (2 × 6 = 12) ; le tenant d'un étal se place derrière (simulation.js : stepEtal)
const nbCellMarche = m => Math.max(1, Math.round(m.w / CELL)) * Math.max(1, Math.round(m.l / CELL));
const cellMarche = (m, c) => { const n = Math.max(1, Math.round(m.w / CELL)), i = c % n, j = Math.floor(c / n); return [-m.w / 2 + i * CELL, j * CELL, -m.w / 2 + (i + 1) * CELL, (j + 1) * CELL]; };
/* Emplacements des extensions de la ferme (u0, t0, u1, t1), dans l'ordre d'ajout. */
/* FERME : un BÂTIMENT DE BASE identique pour toutes les fermes (cour, logis, grange), dans les 14 premiers mètres depuis la rue ; l'extension (jardin, verger, poulailler, chèvres, porcherie, vaches, moutons) occupe tout le reste de la parcelle, derrière,
   sans jamais toucher au bâtiment principal : fermeZones(h) donne son rectangle (u0, t0, u1, t1), quelle que soit la longueur de la ferme (24 m posée avant l'agrandissement, ou 32 m). */
const FERME_BASE_T = 14.4;
const fermeZones = h => [[-11.4, FERME_BASE_T, 11.4, h.l - .6]];
/* Une extension de ferme dans son emplacement r : clôture, puis le contenu de sa sorte ; e = { k, n } (n : animaux, dessinés un par un, 12 au plus), ou rien : emplacement libre. */
// un animal dessiné avec son modèle d'espèce (animaux.js : peintAnimal), à (u, t) dans le repère du bâtiment
function bete(h, key, u, t, a) {
  const A = typeof ANIMAUX !== 'undefined' && ANIMAUX[key];
  if (!A || typeof peintAnimal !== 'function') { beastLT(h, u, t, a, 1, .6, '#d8d2c4', '#8a8478'); return; }
  const [X, Y] = LP(h, u, t); peintAnimal(key, X, Y, Math.max(3, A.T * view.s), a + (h.a || 0) * Math.PI / 180);
}
// les espèces des animaux d'un enclos (12 au plus) : celles capturées (e.esp), complétées par l'espèce habituelle de l'enclos
function especesEnclos(e) {
  const d = FERME_EXT[e.k] || {}, n = e.n === undefined ? 4 : e.n, out = [];
  for (const [k, q] of Object.entries(e.esp || {})) for (let i = 0; i < q; i++) out.push(k);
  while (out.length < n) out.push((d.especes || ['mouton'])[0]);
  return out.slice(0, Math.min(12, n));
}
function contenuExt(h, e, r, lst, principal) {
  const [u0, t0, u1, t1] = r, cu = (u0 + u1) / 2, ct = (t0 + t1) / 2, rnd = seeded(Math.round(sid(h) * 3 + sid(h) * 2 * 7) + Math.round(u0 * 5 + t0 * 3));
  const n = lst.length, spots = (k, a0, a1) => Array.from({ length:k }, () => [u0 + 1.2 + rnd() * (u1 - u0 - 2.4), a0 + rnd() * (a1 - a0)]);
  const abri = (col, hauteur) => { if (principal) thatchLT(h, u0 + .8, t1 - hauteur, u1 - .8, t1 - .7, 'u', col); };                                  // abri au fond de l'enclos
  switch (e.k) {
    case 'jardin':
      for (let t = t0 + .8; t + 2.4 < t1 - 1.6; t += 3.4) { vegPatchLT(h, u0 + .8, t, cu - .4, t + 2.4); vegPatchLT(h, cu + .4, t, u1 - .8, t + 2.4); }
      barrelLT(h, u1 - 1.2, t1 - 1.2, .42); heapLT(h, u0 + 1.4, t1 - 1.2, .9, .7, '#5e4a33', '#735c40'); break;                                  // tonneau, compost
    case 'verger':
      for (let t = t0 + 2.2, k = 0; t < t1 - .8; t += 3.8, k++) for (const f of k % 2 ? [.3, .74] : [.26, .7]) fruitTreeLT(h, u0 + (u1 - u0) * f, t, 1.55);
      break;
    case 'poulailler':
      abri(STRAW, 4.4); troughLT(h, u0 + .9, t1 - 6, u0 + 2.7, t1 - 5.6, '#c9b070');
      spots(n, t0 + .8, t1 - 5.4).forEach(([u, t], k) => bete(h, lst[k], u, t, rnd() * 6.3)); break;
    case 'chevres':
      abri(OLD_STRAW, 4.6); heapLT(h, u0 + 1.8, t1 - 6, 1, .8, '#c7b26a', '#dccb86'); waterTroughLT(h, u1 - 2.4, t0 + 1, u1 - 1.2, t0 + 3.2);
      spots(n, t0 + 1, t1 - 5.6).forEach(([u, t], k) => bete(h, lst[k], u, t, rnd() * 6.3)); break;
    case 'porcherie': {
      const m = lpts(h, softRect(u0 + .8, t0 + .8, u1 - .8, t1 - 5.4, 2, .6, rnd)); pathS(m); ctx.fillStyle = 'rgba(92,70,44,.45)'; ctx.fill();   // soue boueuse
      abri(OLD_STRAW, 4.4); waterTroughLT(h, u1 - 2.6, t1 - 6.2, u1 - 1.2, t1 - 5.6);
      spots(n, t0 + 1.4, t1 - 6).forEach(([u, t], k) => bete(h, lst[k], u, t, rnd() * 6.3)); break;
    }
    case 'vaches':
      abri(STRAW, 5.2); hayRackLT(h, u1 - 3, t1 - 6.4, u1 - 1.4, t1 - 5.8); waterTroughLT(h, u0 + 1, t0 + 1, u0 + 3.4, t0 + 1.7);
      spots(n, t0 + 2.2, t1 - 6.4).forEach(([u, t], k) => bete(h, lst[k], u, t, rnd() * 6.3)); break;
    case 'moutons':
      hayRackLT(h, cu - .8, ct - .3, cu + .8, ct + .3); waterTroughLT(h, u1 - 2.6, t1 - 1.8, u1 - 1.2, t1 - 1.2);
      spots(n, t0 + 1, t1 - 2).forEach(([u, t], k) => bete(h, lst[k], u, t, rnd() * 6.3)); break;
  }
  wattleLT(h, u0, t0, u1, t1, null);                                                                                                      // clôture de l'enclos
}
/* L'extension de la ferme (une seule) occupe TOUT l'espace libre de la parcelle : les zones rects (FERME_ZONES) ; les animaux se répartissent entre elles selon leur surface, l'abri est dans la première. */
function extLT(h, e, rects) {
  if (!e) { for (const [u0, t0, u1, t1] of rects) { tuftsLT(h, u0, t0, u1, t1, 14, false); for (const [u, t] of [[u0, t0], [u1, t0], [u0, t1], [u1, t1]]) beamLT(h, u - .12, t - .12, u + .12, t + .12); } return; }   // pas d'extension : piquets aux angles
  const lst = especesEnclos(e), aires = rects.map(r => (r[2] - r[0]) * (r[3] - r[1])), tot = aires.reduce((q, a) => q + a, 0);
  let k0 = 0;
  rects.forEach((r, i) => { const part = i === rects.length - 1 ? lst.length - k0 : Math.round(lst.length * aires[i] / tot); contenuExt(h, e, r, lst.slice(k0, k0 + part), i === 0); k0 += part; });
}
const MINE_REP = { puits:[-5.5, 7], porte:[-2.5, 13.4] };   // fosse minière : où le mineur descend et par où il entre dans la cabane (u, t)
const BUILD_DRAW = {
  /* Scierie (3 × 4 cases, 24 × 32 m) : cour de terre battue close d'une clôture de perches,
     portail côté rue ; grande halle de sciage (toit à deux pans en bardeaux) d'où sort le
     chemin de roulement du chariot, une grume dessus ; parc à grumes en tas ; piles de
     planches qui sèchent sur liteaux ; tas de sciure ; charrette chargée ; loge du scieur. */
  scierie: h => {
    const w2 = h.w / 2, L = h.l, s = view.s;
    const yard = lpts(h, [[-w2 + .3, .3], [w2 - .3, .3], [w2 - .3, L - .3], [-w2 + .3, L - .3]]);
    /* sol : celui du terrain */                                          // cour
    if (s > 1.5) { const rnd = seeded(Math.round(sid(h) * 7 + sid(h) * 2 * 13)); ctx.fillStyle = WOOD.speck; for (let k = 0; k < 90; k++) { const [X, Y] = LP(h, -w2 + 1 + rnd() * (h.w - 2), 1 + rnd() * (L - 2)); ctx.beginPath(); ctx.arc(X, Y, Math.max(.5, .12 * s), 0, Math.PI * 2); ctx.fill(); } }
    wattleLT(h, -w2 + .4, .4, w2 - .4, L - .4, -3.2, 3.2);
    planksLT(h, -11.1, 2, -9.3, 9);                                                               // planches refendues qui sèchent
    for (const [u, j] of [[-8.7, .2], [-8.1, 0], [-7.5, .4]]) beamLT(h, u, 2.4 + j, u + .5, 8.8 - j * .5); // poutres équarries
    beamStackLT(h, 5.6, 19.2, 11, 4, .5);
    logPileLT(h, 5.2, 11, 2.2, 3, .42); logPileLT(h, 3.9, 11, 6.6, 4, .38); logPileLT(h, 6.1, 11, 12.1, 2, .5); // parc à grumes (longueurs variées)
    sawPitLT(h, -6.2, 3.4, -3.2, 10.6);                                                           // fosse de sciage de long
    sawdustLT(h, -1.5, 9.3, .9, 1.2);                                                             // sciure remontée de la fosse
    trestleLT(h, 4.6, 16.6, 3.2);                                                                 // chevalet à équarrir
    if (s > 1.5) { offcutsLT(h, 4.4, 16.8, 1.6, 9, 11); offcutsLT(h, -1.4, 6, 1.1, 4, 23); }      // copeaux et chutes
    thatchLT(h, -10.8, 12, 1.4, 30.2, 't', OLD_STRAW);                                             // halle de sciage
    thatchLT(h, 4.2, 25, 10.9, 30.8, 'u', STRAW);                                                  // loge du scieur
    chimneyLT(h, 9.3, 26.6, .55);                                                                  // cheminée de pierre
    cartLT(h, 1.2, 3.4);                                                                          // charrette à l'entrée
  },
  /* Maison simple (1 case, 8 × 8 m) : chaumière paysanne, faîtage parallèle à la rue, cheminée
     de pierre en pignon ; courtil de terre battue clos d'un plessis ouvert sur la rue ; seuil de
     pierre et sentier, carré de potager devant, bois fendu contre le pignon. */
  maison: h => {
    const w2 = h.w / 2, L = h.l, s = view.s, rnd = seeded(Math.round(sid(h) * 3 + sid(h) * 2 * 7) + 5);
    /* sol : celui du terrain */ // courtil
    if (s > 3) { ctx.fillStyle = 'rgba(110,130,70,.35)'; for (let k = 0; k < 30; k++) { const u = -w2 + .6 + rnd() * (h.w - 1.2), t = .6 + rnd() * (L - 1.2); if (Math.abs(u - .8) < .9 && t < 3.4) continue; const [X, Y] = LP(h, u, t); ctx.fillRect(X, Y, Math.max(1, .12 * s), Math.max(1, .2 * s)); } } // touffes d'herbe
    pathS(lpts(h, [[.1, .3], [1.5, .3], [1.3, 3], [.3, 3]])); ctx.fillStyle = 'rgba(150,126,86,.45)'; ctx.fill(); // sentier
    if (s > 2) for (const [u, t, r] of [[.75, .9, .22], [.95, 1.6, .2], [.65, 2.3, .2]]) {         // pierres plates du sentier
      const st = []; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, k = .8 + rnd() * .3; st.push([u + Math.cos(a) * r * k, t + Math.sin(a) * r * .8 * k]); }
      pathS(lpts(h, st)); ctx.fillStyle = '#b3ab99'; ctx.fill(); ctx.strokeStyle = 'rgba(60,50,40,.5)'; ctx.lineWidth = 1; ctx.stroke(); }
    vegPatchLT(h, -4.6, .9, -1.4, 2.6);                                                         // potager
    wattleLT(h, -w2 + .25, .25, w2 - .25, L - .25, .1, 1.5);                                    // plessis, ouvert sur la rue
    cordwoodLT(h, 6.1, 5.5, 6.9, 11.5);                                                          // bois fendu contre le pignon
    const P = lpts(h, [[.3, 3], [1.3, 3], [1.3, 3.4], [.3, 3.4]]);                              // seuil de pierre
    pathS(P); ctx.fillStyle = WOOD.stone; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.05); ctx.stroke();
    thatchLT(h, -5.8, 3.4, 5.8, 14.4, 'u', STRAW);                                               // chaumière : la moitié de la parcelle
    chimneyLT(h, -4.3, 8.9, .55);                                                                // cheminée en pignon
  },
  /* Maison avec arrière-cour (2 × 3 cases, 16 × 24 m ; 1 × 3 avant le 07/10) : chaumière côté rue comme la maison
     simple, puis l'arrière-cour close d'un plessis, selon son extension : potager, verger,
     poulailler, chèvres, ou un atelier d'artisan au fond (toit de bardeaux) et sa cour de
     travail. Sert aussi à la cour de la grande maison (_yardFrom : début de la cour). */
  maison_cour: h => {
    const w2 = h.w / 2, L = h.l, s = view.s, yard = yardOf(h), Y0 = h._yardFrom || 15, own = !h._yardFrom;
    const rnd = seeded(Math.round(sid(h) * 3 + sid(h) * 2 * 7) + 9), craft = EXT[yard].grp === 'Artisanat';
    if (own) { /* sol : celui du terrain */ } // courtil
    /* sol : celui du terrain */
    if (s > 3 && yard === 'verger') { ctx.fillStyle = 'rgba(90,120,55,.4)'; for (let k = 0; k < 60; k++) { const [X, Y] = LP(h, -w2 + .7 + rnd() * (h.w - 1.4), Y0 + .5 + rnd() * (L - Y0 - 1)); ctx.fillRect(X, Y, Math.max(1, .1 * s), Math.max(1, .22 * s)); } }
    yardLT(h, yard, -w2 + .6, Y0 + .4, w2 - .6, L - .6);
    if (own) {
      wattleLT(h, -w2 + .25, .25, w2 - .25, L - .25, .1, 1.5, [[[-w2 + .25, Y0], [-.4, Y0]], [[.6, Y0], [w2 - .25, Y0]]]); // plessis, refend et barrière de la cour
      pathS(lpts(h, [[.1, .3], [1.5, .3], [1.3, 3], [.3, 3]])); ctx.fillStyle = 'rgba(150,126,86,.45)'; ctx.fill(); // sentier
      const P = lpts(h, [[.3, 3], [1.3, 3], [1.3, 3.4], [.3, 3.4]]); pathS(P); ctx.fillStyle = WOOD.stone; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.05); ctx.stroke();
      thatchLT(h, -5.8, 3.4, 5.8, 14.4, 'u', STRAW);                                              // chaumière : même emprise que la maison simple
      chimneyLT(h, -4.3, 8.9, .55);
    } else wattleLT(h, -w2 + .25, Y0, w2 - .25, L - .25, null);
  },
  /* Camp de bûcherons (2 × 2 cases, 16 × 16 m) : clairière de terre battue sans clôture, en
     lisière de forêt ; hutte de chaume au fond, grumes ébranchées sur rondins de glissement,
     stère de bois fendu, chevalet avec scie, fagots liés, branchages, feu de camp, hache,
     ornières de débardage qui partent vers la forêt. */
  camp_bucherons: h => {
    const w2 = h.w / 2, L = h.l, s = view.s, rnd = seeded(Math.round(sid(h) * 5 + sid(h) * 2 * 11) + 1);
    const clear = lpts(h, softRect(-w2 + .5, .5, w2 - .5, L - .5, 2.6, .7, rnd));
    /* sol : celui du terrain */                                          // clairière
    if (s > 1.5) { ctx.fillStyle = WOOD.speck; for (let k = 0; k < 50; k++) { const [X, Y] = LP(h, -w2 + 1.5 + rnd() * (h.w - 3), 1.5 + rnd() * (L - 3)); ctx.fillRect(X, Y, Math.max(1, .14 * s), Math.max(1, .14 * s)); } }
    if (s > 1.2) { ctx.strokeStyle = 'rgba(96,74,46,.35)'; ctx.lineWidth = Math.max(1, .3 * s); ctx.lineCap = 'round'; ctx.beginPath();   // ornières de débardage
      for (const e of [-.55, .55]) { ctx.moveTo(...LP(h, 1 + e, L - .3)); ctx.bezierCurveTo(...LP(h, 1.2 + e, 12), ...LP(h, .4 + e, 8), ...LP(h, .1 + e, 4.6)); }
      ctx.stroke(); ctx.lineCap = 'butt'; }
    for (const u of [-5.8, -1.8]) beamLT(h, u, .9, u + .45, 4.9);                                 // rondins de glissement
    logPileLT(h, -7.2, 1.6, 1.2, 3, .48);                                                        // grumes ébranchées
    cordwoodLT(h, 5, 1.2, 7.2, 8.6);                                                             // stère de bois fendu
    trestleLT(h, 2.6, 6.8, 2.8);                                                                 // chevalet et bûche à scier
    bucksawLT(h, 2.9, 6.8);
    if (s > 1.5) offcutsLT(h, 2.6, 7.9, 1.2, 6, 5);                                             // copeaux
    firePitLT(h, -4.3, 7.1, .75);                                                                // feu de camp
    for (const [u, t, a] of [[3.8, 12.4, .3], [6, 13.3, -.2], [4.6, 14.6, .15]]) fagotLT(h, u, t, 2.4, a); // fagots
    branchesLT(h, 5.8, 10.8, 1.6);                                                               // tas de branchages
    thatchLT(h, -7.2, 9.4, -1.6, 15.2, 'u', STRAW);                                               // hutte
    axeLT(h, -2.4, 5.6, -.6);                                                                    // hache posée
  },
  /* Manoir (3 × 3 cases, 24 × 24 m) : enceinte de pierre, portail côté rue, allée pavée ;
     logis au fond (toit de bardeaux en croupe, deux cheminées) flanqué d'une tour carrée à
     flèche d'ardoise ; écurie de chaume à gauche, meule, puits de la cour, potager et verger. */
  manoir: h => {
    const w2 = h.w / 2, L = h.l, s = view.s, rnd = seeded(Math.round(sid(h) * 3 + sid(h) * 2 * 11) + 21);
    /* sol : celui du terrain */                        // cour de terre battue
    pathS(lpts(h, [[-1.7, .5], [1.7, .5], [1.7, 13.6], [-1.7, 13.6]])); ctx.fillStyle = '#b3aa96'; ctx.fill(); // allée pavée
    if (s > 2.2) { ctx.strokeStyle = 'rgba(70,62,50,.35)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let t = .9, k = 0; t < 13.5; t += .5, k++) { ctx.moveTo(...LP(h, -1.7, t)); ctx.lineTo(...LP(h, 1.7, t)); for (let u = -1.7 + (k % 2) * .3; u < 1.7; u += .6) { ctx.moveTo(...LP(h, u, t - .5)); ctx.lineTo(...LP(h, u, t)); } }
      ctx.stroke(); }
    vegPatchLT(h, 4.4, 2, 7.4, 5.4); vegPatchLT(h, 8.2, 2, 11, 5.4); vegPatchLT(h, 4.4, 6.2, 7.4, 9.4); // potager du seigneur
    fruitTreeLT(h, 9.6, 8.4, 1.4); fruitTreeLT(h, 6, 11.6, 1.3);
    stoneWallLT(h, [[-2.3, .75], [-w2 + .75, .75], [-w2 + .75, L - .75], [w2 - .75, L - .75], [w2 - .75, .75], [2.3, .75]], .8, false);
    for (const u of [-2.7, 2.7]) blockLT(h, u - .6, .1, u + .6, 1.4);                              // piliers du portail
    wellLT(h, -4, 11.2, .95);
    thatchLT(h, -10.9, 1.8, -6.4, 9.8, 't', OLD_STRAW);                                            // écurie
    stackLT(h, -4.3, 3.2, 1.3);                                                                   // meule de foin
    for (const [u, t] of [[-5.6, 7.6], [-5.5, 8.6]]) barrelLT(h, u, t, .38);
    waterTroughLT(h, -6.1, 10.4, -5.5, 12.6);
    hipLT(h, -10.9, 13.6, 5.4, 22.6, SHINGLE);                                                     // logis
    chimneyLT(h, -7.4, 18.1, .6); chimneyLT(h, 1.6, 18.1, .6);
    towerLT(h, 8.3, 17.6, 3.1, SLATE);                                                             // tour
  },
  /* Mairie (3 × 3 cases) : parvis pavé côté rue, grande salle à toit de bardeaux, tour de l'horloge, cheminée, tonneaux de chaque côté du perron */
  mairie: h => {
    pathS(lpts(h, [[-3, .5], [3, .5], [3, 10], [-3, 10]])); ctx.fillStyle = '#b3aa96'; ctx.fill();   // parvis pavé
    blockLT(h, -2.4, 9.6, 2.4, 10.6);                                                               // perron
    for (const u of [-4.4, 4.4]) barrelLT(h, u, 8.8, .42);
    hipLT(h, -9, 10.6, 5.2, 21.6, SHINGLE);                                                         // salle
    chimneyLT(h, -5.4, 17, .6);
    towerLT(h, 8.2, 14.2, 3.1, SLATE);                                                              // tour de l'horloge
  },
  /* Ateliers à part (2 × 2 cases, brasserie 2 × 3) : cour devant, halle sous toit, cheminée, quelques accessoires du métier */
  /* Camp de mineur (2 × 2 cases, 16 × 16 m) : carreau de terre foulée où l'on décharge les mines — tas de minerai de fer, de cuivre, de silex et de sel, caisses, sacs, brouette — et abri de bois à toit de chaume au fond */
  camp_mineur: h => {
    pathS(lpts(h, [[-7.4, .6], [7.4, .6], [7.4, 8.6], [-7.4, 8.6]])); ctx.fillStyle = '#a89d88'; ctx.fill();
    heapLT(h, -4.4, 4.2, 2.3, 1.9, '#9c4a2e', '#c9754f'); heapLT(h, .4, 3.6, 2.1, 1.7, '#2f9a8a', '#c7783c'); heapLT(h, 5, 4.6, 2.2, 1.8, '#6b665c', '#a39d8e'); heapLT(h, 5.2, 8, 1.6, 1.3, '#e8e4da', '#ffffff');
    crateLT(h, -5.8, 7.4, .5); crateLT(h, -4.6, 8, .45); barrowLT(h, -1.6, 7.6, -.3, '#2b2622'); sackLT(h, 2.4, 7.8, .4, '#e6e0d0'); sackLT(h, 3.2, 8.4, .38, '#e6e0d0');
    gableLT(h, -6.8, 10, 1.2, 15.2, 'u'); beamLT(h, 3, 11, 5.4, 11.6); barrelLT(h, 4.6, 13.6, .42);
  },
  /* Atelier de menuiserie (3 × 3 cases, 24 × 24 m) : cour de sciage (tréteaux, scie de long, copeaux), grumes et bois fendu à gauche, planches empilées à droite, grande halle de bardeaux au fond et séchoir à planches (annexe).
     Les anciens ateliers de 2 × 2 cases gardent l'ancien dessin. */
  menuiserie: h => {
    if (h.w < 20) return BUILD_DRAW.menuiserie_ancien(h);
    pathS(lpts(h, [[-5.5, .4], [5.5, .4], [5.5, 8.6], [-5.5, 8.6]])); ctx.fillStyle = '#b3aa96'; ctx.fill();
    chipsLT(h, 0, 5, 6, 90, '#c9a76a');
    hipLT(h, -11, 9.4, 2.4, 22.6, SHINGLE); chimneyLT(h, -6, 14, .7);
    gableLT(h, 4.2, 10.4, 11, 22, 't');
    logPileLT(h, -11, -4.6, 2.2, 4, .5); logPileLT(h, -10.4, -5.4, 4.4, 3, .46); cordwoodLT(h, -11, 6, -7.6, 8.4);
    trestleLT(h, -2.6, 3.4, 3); bucksawLT(h, -2.2, 3.4); offcutsLT(h, 1, 5.6, 2, 12, 7);
    stackLT(h, 6.6, 3, 1.6); stackLT(h, 9.2, 2.6, 1.5); stackLT(h, 8.2, 6, 1.4); barrelLT(h, 10.6, 8.2, .45); crateLT(h, 5.8, 8.2, .5);
  },
  menuiserie_ancien: h => {
    pathS(lpts(h, [[-2.6, .4], [2.6, .4], [2.6, 5.6], [-2.6, 5.6]])); ctx.fillStyle = '#b3aa96'; ctx.fill();
    hipLT(h, -6.2, 5.8, 6.2, h.l - 1.2, SHINGLE); chimneyLT(h, 3, 10, .6);
    cordwoodLT(h, -7.4, 1.0, -3.6, 4.2); stackLT(h, 5.6, 3.2, 1.5); barrelLT(h, 4.2, 1.8, .4);
  },
  forge: h => {
    pathS(lpts(h, [[-2.6, .4], [2.6, .4], [2.6, 5.6], [-2.6, 5.6]])); ctx.fillStyle = '#8f8a82'; ctx.fill();
    hipLT(h, -6.2, 5.8, 6.2, h.l - 1.2, SLATE); chimneyLT(h, -2.4, 10.4, 1); chimneyLT(h, 3.2, 8.6, .6);
    barrelLT(h, 4.4, 1.6, .42); barrelLT(h, 5.4, 2.4, .4); crateLT(h, -5.4, 2.2, .5);
  },
  archerie: h => {
    pathS(lpts(h, [[-2.6, .4], [2.6, .4], [2.6, 5.6], [-2.6, 5.6]])); ctx.fillStyle = '#b3aa96'; ctx.fill();
    thatchLT(h, -6.2, 5.8, 6.2, h.l - 1.2, 'u', STRAW); chimneyLT(h, 3.2, 10, .5);
    stackLT(h, -5.2, 2.6, 1.3); barrelLT(h, 4.6, 2, .4); crateLT(h, 5.6, 3.6, .45);
  },
  armurerie: h => {
    pathS(lpts(h, [[-2.6, .4], [2.6, .4], [2.6, 5.6], [-2.6, 5.6]])); ctx.fillStyle = '#8f8a82'; ctx.fill();
    hipLT(h, -6.2, 5.8, 6.2, h.l - 1.2, SLATE); chimneyLT(h, 2.8, 10.2, .8);
    crateLT(h, -5.4, 2.4, .5); crateLT(h, -4.4, 3.2, .45); barrelLT(h, 5, 2.2, .42);
  },
  cordonnerie: h => {
    pathS(lpts(h, [[-2.6, .4], [2.6, .4], [2.6, 5.6], [-2.6, 5.6]])); ctx.fillStyle = '#b3aa96'; ctx.fill();
    hipLT(h, -6.2, 5.8, 6.2, h.l - 1.2, SHINGLE); chimneyLT(h, -3, 10, .5);
    barrelLT(h, 4.6, 2.2, .42); crateLT(h, -5.4, 2.4, .5);
  },
  couture: h => {
    pathS(lpts(h, [[-2.6, .4], [2.6, .4], [2.6, 5.6], [-2.6, 5.6]])); ctx.fillStyle = '#b3aa96'; ctx.fill();
    thatchLT(h, -6.2, 5.8, 6.2, h.l - 1.2, 'u', OLD_STRAW); chimneyLT(h, 3.2, 10, .5);
    crateLT(h, -5.2, 2.6, .5); crateLT(h, 5, 2.4, .45);
  },
  brasserie: h => {
    pathS(lpts(h, [[-2.6, .4], [2.6, .4], [2.6, 6.4], [-2.6, 6.4]])); ctx.fillStyle = '#b3aa96'; ctx.fill();
    hipLT(h, -6.4, 6.6, 6.4, h.l - 1.2, SHINGLE); chimneyLT(h, 3.4, 12, .9);
    for (const [u, t] of [[-6, 1.8], [-5, 2.8], [-6.4, 3.6], [5, 2], [5.8, 3.2]]) barrelLT(h, u, t, .45);
  },
  /* Fonderie (2 × 3 cases) : halle de pierre à toit d'ardoise, grande cheminée du fourneau, tas de minerai et de bois, tonneaux */
  fonderie: h => {
    pathS(lpts(h, [[-2.5, .5], [2.5, .5], [2.5, 6], [-2.5, 6]])); ctx.fillStyle = '#9a9488'; ctx.fill();   // cour de cendre
    hipLT(h, -6, 6.4, 6, 20.5, SLATE);
    chimneyLT(h, 2.6, 14, 1.1); chimneyLT(h, -2.6, 14, .7);
    cordwoodLT(h, -7.4, 1.4, -3.4, 4.4);
    for (const u of [4.4, 5.6]) barrelLT(h, u, 3.6, .42);
  },
  /* Camp de colon (3 × 3 cases) : clairière de terre battue, feu de camp, deux abris de chaume,
     chariot, caisses, sacs, tonneaux et bois fendu */
  camp_colon: h => {
    const w2 = h.w / 2, L = h.l, rnd = seeded(Math.round(sid(h) * 5 + sid(h) * 2 * 7) + 12);
    /* sol : celui du terrain */
    tuftsLT(h, -w2 + 1, 1, w2 - 1, L - 1, 90, false);
    firePitLT(h, 0, 12, .9);
    thatchLT(h, -10.5, 2.5, -4.5, 9, 'u', STRAW); thatchLT(h, 4.5, 2.5, 10.5, 9, 'u', OLD_STRAW);
    cartLT(h, -7.5, 15);
    crateLT(h, 6.2, 15.5, .5); crateLT(h, 7.3, 15.9, .45); crateLT(h, 6.6, 16.8, .42);
    for (const [u, t] of [[3.6, 11.4], [4.4, 12.2]]) sackLT(h, u, t, .4);
    barrelLT(h, -2.6, 18.6, .45); barrelLT(h, -1.6, 19.1, .42);
    cordwoodLT(h, 3.6, 18.4, 9, 20.4);
  },
  /* Cabane de pêche (2 × 2 cases) : cabane de chaume, séchoir à poissons, filet tendu, tonneaux, panier et caisse */
  cabane_peche: h => {
    const w2 = h.w / 2, L = h.l;
    thatchLT(h, -5.6, 2.4, .2, 8.6, 'u', STRAW);                                                     // cabane
    dryRackLT(h, -6, -1, 12.2, ['#a9b6be', '#8c9ea8', '#bcc7cd'], 6);                               // poissons qui sèchent
    ctx.strokeStyle = 'rgba(70,60,45,.7)'; ctx.lineWidth = lw(.05); ctx.beginPath();                  // filet tendu entre deux piquets
    for (let k = 0; k <= 6; k++) { ctx.moveTo(...LP(h, 2 + k * .9, 2.6)); ctx.lineTo(...LP(h, 2 + k * .9, 7.4)); }
    for (let k = 0; k <= 5; k++) { ctx.moveTo(...LP(h, 2, 2.6 + k * .96)); ctx.lineTo(...LP(h, 7.4, 2.6 + k * .96)); }
    ctx.stroke();
    barrelLT(h, 4.6, 10.4, .45); barrelLT(h, 5.6, 11, .42);
    basketLT(h, 1.6, 10.6, .45, ['#b08a4a', '#8a6a34']); crateLT(h, -3.4, 13.2, .45);
  },
  /* Puits (1 case) : margelle de pierre, treuil et corde, dallage autour, auge et seaux */
  puits: h => {
    const L = h.l, c = L / 2, s = view.s, rnd = seeded(Math.round(sid(h) * 5 + sid(h) * 2 * 3) + 4);
    /* sol : celui du terrain */                                 // terre piétinée
    tuftsLT(h, -3.4, .5, 3.4, L - .5, 40, false);
    for (let i = 0; i < 11; i++) {                                                                // dalles autour de la margelle
      const a = i / 11 * Math.PI * 2 + rnd() * .2, R = 1.75 + rnd() * .15, cu = Math.cos(a) * R, ct = c + Math.sin(a) * R, P = [];
      for (let k = 0; k < 6; k++) { const b = k / 6 * Math.PI * 2 + a, q = (.38 + rnd() * .1); P.push([cu + Math.cos(b) * q, ct + Math.sin(b) * q]); }
      pathS(lpts(h, P)); ctx.fillStyle = i % 3 ? '#aea797' : '#b9b2a2'; ctx.fill(); ctx.strokeStyle = 'rgba(60,52,40,.55)'; ctx.lineWidth = 1; ctx.stroke();
    }
    { const P = []; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; P.push([2 + Math.cos(a) * .9 * (1 + .15 * Math.sin(a * 3)), 6.6 + Math.sin(a) * .45]); }
      pathS(lpts(h, P)); ctx.fillStyle = 'rgba(111,150,156,.55)'; ctx.fill(); }                   // flaque
    wellLT(h, 0, c, 1.2);
    windlassLT(h, 0, c, 3.1);
    waterTroughLT(h, 2.1, 1.1, 3.3, 3.4);
    bucketLT(h, -2.3, 5.9); bucketLT(h, -2.8, 5.2);
  },
  /* Marché (6 × 2 cases) : place de terre battue découpée en 12 emplacements ; chaque étal installé (à auvent rayé, denrées sur le comptoir) occupe sa case, dans l'ordre d'installation */
  marche: h => {
    const w2 = h.w / 2, L = h.l, s = view.s;
    pathS(lpts(h, [[-w2, 0], [w2, 0], [w2, L], [-w2, L]])); ctx.fillStyle = '#b5ab96'; ctx.fill();                                   // sol
    if (s > 2.2) { const rnd = seeded(Math.round(sid(h) + sid(h) * 2) + 8); ctx.strokeStyle = 'rgba(70,62,50,.3)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let t = 0, k = 0; t < L; t += 1, k++) { ctx.moveTo(...LP(h, -w2, t)); ctx.lineTo(...LP(h, w2, t)); for (let u = -w2 + (k % 2) * .5 + rnd() * .1; u < w2; u += 1) { ctx.moveTo(...LP(h, u, t)); ctx.lineTo(...LP(h, u, Math.min(L, t + 1))); } }
      ctx.stroke(); }
    const n = nbCellMarche(h);
    for (let c = 0; c < n; c++) { const [u0, t0, u1, t1] = cellMarche(h, c); pathS(lpts(h, [[u0 + .4, t0 + .4], [u1 - .4, t0 + .4], [u1 - .4, t1 - .4], [u0 + .4, t1 - .4]])); ctx.strokeStyle = 'rgba(70,62,50,.35)'; ctx.lineWidth = lw(.06); ctx.stroke(); }   // (les emplacements)
    const COUL = { nourriture:['#6f8a3e', '#c98a3a', '#b9402b', '#86a04a'], grain:['#c9a74a', '#dcc070', '#b8923a'] };
    const TOILE = ['#8a3b2e', '#3f5d7a', '#5d7a3f', '#a0762e', '#6a3a5a', '#3f7a74'];
    for (const e of (h.etals || [])) { if (e.c >= n || !(S.houses || []).some(o => o.id === e.src)) continue; const [u0, t0, u1] = cellMarche(h, e.c); stallLT(h, u0 + 1.2, t0 + 2.6, u1 - 1.2, t0 + 6.4, '#e8dfc6', TOILE[e.c % TOILE.length], COUL.nourriture); }
  },
  /* Taverne (2 × 2 cases) : grande salle de chaume sur la rue, cheminée, enseigne ; cellier
     en appentis ; derrière, la cour aux tables et bancs, tonneaux, bois, plessis */
  taverne: h => {
    const w2 = h.w / 2, L = h.l, s = view.s;
    /* sol : celui du terrain */
    tableLT(h, -3.8, 11.7, 3.6, ['#c9924e', '#e8dcc0', '#8a5a2e']); tableLT(h, 1.8, 13.7, 3.6, ['#e8dcc0', '#c9924e']);
    for (const [u, t] of [[5.3, 10.2], [6.3, 10.6], [5.6, 11.3], [6.6, 11.6]]) barrelLT(h, u, t, .45);
    cordwoodLT(h, 6.5, 12.6, 7.3, 15.2);
    wattleLT(h, -7.6, 9.4, 7.6, 15.7, -6.9, -5.5);
    gableLT(h, 4.2, 1.6, 7.4, 7.8, 't');                                                          // cellier en appentis
    thatchLT(h, -7.3, 1.3, 4.4, 8.7, 'u', STRAW);                                                 // grande salle
    chimneyLT(h, -5.9, 5, .6);
    beamLT(h, -2.9, .5, -1, .8);                                                                  // banc devant la porte
    beamLT(h, 1.9, .3, 2.15, 1.5);                                                                // potence de l'enseigne
    const P = lpts(h, [[1.55, 1.1], [2.55, 1.1], [2.55, 1.5], [1.55, 1.5]]); pathS(P); ctx.fillStyle = '#8a3b2e'; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.05); ctx.stroke();
    barrelLT(h, 3.2, .8, .38);
  },
  /* Église en bois (3 × 4 cases) : enclos d'herbe ceint d'un muret, porte face au clocher ;
     clocher carré à flèche de bardeaux côté rue, nef et chœur plus étroit ; à droite le
     cimetière (tombes, croix, if) */
  eglise: h => {
    const w2 = h.w / 2, L = h.l, s = view.s, rnd = seeded(Math.round(sid(h) * 7 + sid(h) * 2 * 5) + 3);
    /* sol : celui du terrain */
    tuftsLT(h, -w2 + .8, .8, w2 - .8, L - .8, 260, true);
    pathS(lpts(h, [[-7.3, .5], [-4.7, .5], [-4.7, 2.6], [-7.3, 2.6]])); ctx.fillStyle = '#b8a47c'; ctx.fill(); // parvis
    pathS(lpts(h, [[-1.2, 15.4], [2.6, 15.4], [2.6, 17], [-1.2, 17]])); ctx.fillStyle = '#b8a47c'; ctx.fill(); // porte latérale
    for (let t = 3.2, r = 0; t < L - 2.6; t += 3.4, r++) for (let u = 3.2; u < w2 - 1.6; u += 1.9) {  // cimetière
      if ((u > 8 && t > 25) || (Math.abs(t - 16) < 1.8 && u < 4)) continue;
      const k = rnd(); if (k < .15) continue;
      graveLT(h, u + (rnd() - .5) * .2, t + (rnd() - .5) * .3, k > .8, k < .24);
    }
    treeLT(h, 9.4, 28.4, 2, YEW); treeLT(h, 3.4, 29.6, 1.3, YEW);
    stoneWallLT(h, [[-4.4, .7], [w2 - .7, .7], [w2 - .7, L - .7], [-w2 + .7, L - .7], [-w2 + .7, .7], [-7.6, .7]], .55, false);
    gableLT(h, -9, 26.4, -3, 31, 't');                                                            // chœur
    gableLT(h, -10.7, 8.2, -1.3, 27.4, 't');                                                      // nef
    gableLT(h, -1.8, 15.1, .4, 17.3, 'u');                                                        // porche de la porte latérale
    towerLT(h, -6, 5.4, 3, SHINGLE);                                                              // clocher
    topCrossLT(h, -6, 5.4, .55, .07, '#3b3a36');                                                  // croix du clocher, vue du dessus
  },
  /* Cimetière (2 × 2 cases) : pré clos d'un muret, porche couvert sur la rue, allée jusqu'au
     calvaire, rangs de tombes (croix de bois, stèles, terre fraîche), if */
  cimetiere: h => {
    const w2 = h.w / 2, L = h.l, rnd = seeded(Math.round(sid(h) * 13 + sid(h) * 2 * 3) + 6);
    /* sol : celui du terrain */
    tuftsLT(h, -w2 + .8, .8, w2 - .8, L - .8, 120, true);
    pathS(lpts(h, [[-.9, .5], [.9, .5], [.9, 8.4], [-.9, 8.4]])); ctx.fillStyle = '#b8a47c'; ctx.fill();
    for (const t of [2.1, 5.5, 9, 12.4]) for (const u of [-6.1, -4.3, -2.5, 2.5, 4.3, 6.1]) {
      if (u > 3.5 && t > 11) continue;
      const k = rnd(); if (k < .1) continue;
      graveLT(h, u, t + (rnd() - .5) * .3, k > .78, k < .22);
    }
    blockLT(h, -.9, 8.8, .9, 10.6, true);                                                         // calvaire : socle de pierre
    topCrossLT(h, 0, 9.7, 1.1, .14, '#7a5c3c');                                                   // grande croix, vue du dessus, au centre du socle
    treeLT(h, 5.4, 13.3, 1.9, YEW);
    stoneWallLT(h, [[-1.6, .75], [-w2 + .7, .75], [-w2 + .7, L - .7], [w2 - .7, L - .7], [w2 - .7, .75], [1.6, .75]], .55, false);
    gableLT(h, -2.1, .05, 2.1, 1.5, 'u', .4);                                                     // porche couvert (toit bas : ombre courte)
  },
  /* Maison avec cour et jardin (3 × 3 cases) : longère de chaume en L (deux cheminées),
     jardin d'agrément à droite (carrés d'herbes, fruitiers, banc, ruche), arrière-cour au fond
     (même extensions que la maison avec arrière-cour) */
  grande_maison: h => {
    const w2 = h.w / 2, L = h.l, hw = 2 * CELL, yard = yardOf(h), rnd = seeded(Math.round(sid(h) * 3 + sid(h) * 2 * 7) + 12);
    /* sol : celui du terrain */ // courtil
    BUILD_DRAW.maison_cour({ ...h, yard, _yardFrom:hw });
    /* sol : celui du terrain */                                 // jardin
    tuftsLT(h, 4.4, .8, w2 - .8, hw - .8, 80, true);
    vegPatchLT(h, 4.8, 1.3, 7.6, 4.1); vegPatchLT(h, 8.4, 1.3, 11.2, 4.1); vegPatchLT(h, 4.8, 4.9, 7.6, 7.3);
    fruitTreeLT(h, 9.6, 7.4, 1.7); fruitTreeLT(h, 8.4, 12.4, 1.6);
    beamLT(h, 4.8, 13.8, 6.8, 14.2); skepLT(h, 5.4, 10.4, .42); skepLT(h, 6.3, 10.6, .4);
    wattleLT(h, -w2 + .25, .25, w2 - .25, hw, -3, -1.4, [[[3.9, .25], [3.9, hw]]]);
    pathS(lpts(h, [[-2.9, .3], [-1.5, .3], [-1.7, 2], [-2.7, 2]])); ctx.fillStyle = 'rgba(150,126,86,.45)'; ctx.fill(); // sentier
    cordwoodLT(h, -3.4, 9.6, -2.7, 14.4);
    barrelLT(h, 2.4, 9.6, .4);
    thatchLT(h, -11.2, 7.6, -4.4, 15, 't', STRAW);                                                // aile en retour
    thatchLT(h, -11.2, 1.9, 3.2, 8.8, 'u', STRAW);                                                // corps de logis
    chimneyLT(h, -9.6, 5.35, .5); chimneyLT(h, 1.4, 5.35, .5); chimneyLT(h, -7.8, 13.2, .45);
  },
  /* Hutte du charbonnier (2 × 2 cases, 16 × 16 m) : la meule — grand dôme de bûches recouvert de terre et de gazon, cheminée centrale — fume à droite ; à gauche, les rondins à empiler
     et du bois fendu ; au fond la hutte de chaume ; sacs et brouette de charbon, fosse du foyer. */
  hutte_charbonnier: h => {
    const w2 = h.w / 2, L = h.l, s = view.s, rnd = seeded(Math.round(sid(h) * 5 + sid(h) * 2 * 11) + 3);
    pathS(lpts(h, softRect(-w2 + .5, .5, w2 - .5, L - .5, 2.4, .7, rnd))); ctx.fillStyle = 'rgba(70,58,44,.32)'; ctx.fill();            // sol noirci
    chipsLT(h, 2.5, 8.5, 7, 60, '#3b3530');
    heapLT(h, 3.4, 8.8, 4.3, 3.8, '#4a3f35', '#6a5a4a'); heapLT(h, 3.4, 8.6, 1.5, 1.3, '#2b2622', '#3d3631');                                  // la meule et sa cheminée
    if (s > 2) { ctx.strokeStyle = 'rgba(30,24,20,.35)'; ctx.lineWidth = 1; ctx.beginPath(); for (let a = 0; a < 6.3; a += .8) { ctx.moveTo(...LP(h, 3.4 + Math.cos(a) * 1.7, 8.6 + Math.sin(a) * 1.5)); ctx.lineTo(...LP(h, 3.4 + Math.cos(a) * 4, 8.8 + Math.sin(a) * 3.5)); } ctx.stroke(); }
    logPileLT(h, -7.4, -2.4, 2.4, 3, .42); logPileLT(h, -7.4, -2.4, 4, 2, .4);
    cordwoodLT(h, -7.4, 6.2, -6.6, 11.2);
    barrowLT(h, -3.4, 13.6, -.3, '#2b2622');
    for (const [u, t] of [[-1.8, 12.2], [-1, 13]]) sackLT(h, u, t, .4, '#3b3530');
    thatchLT(h, -7, 11.8, -1.2, 15.4, 'u', OLD_STRAW);                                                                                         // la hutte
    firePitLT(h, 4.2, 14.2, .6);
  },
  /* Fromagerie (2 × 3 cases, 16 × 24 m) : cour de terre close d'un plessis ; sur la rue, la laiterie de bardeaux (chaudron de lait sur son feu, faisselles d'osier, presse à pierres) ; au fond la cave d'affinage,
     un talus de pierre à porte basse, et le séchoir à claies où reposent les meules ; bidons de lait, tonneaux de saumure, sacs de sel. */
  fromagerie: h => {
    const w2 = h.w / 2, L = h.l, s = view.s, rnd = seeded(Math.round(sid(h) * 5 + sid(h) * 2 * 9) + 4);
    pathS(lpts(h, softRect(-w2 + .5, .5, w2 - .5, L - .5, 2.4, .7, rnd))); ctx.fillStyle = 'rgba(150,126,86,.3)'; ctx.fill();
    wattleLT(h, -w2 + .25, .25, w2 - .25, L - .25, 1.6, 5);
    const roue = (u, t, r) => { const [X, Y] = LP(h, u, t), R = Math.max(1.5, r * s); ctx.beginPath(); ctx.arc(X + .15 * s, Y + .2 * s, R, 0, Math.PI * 2); ctx.fillStyle = WOOD.shadow; ctx.fill(); ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2); ctx.fillStyle = '#e8c860'; ctx.fill(); ctx.strokeStyle = '#7a5a20'; ctx.lineWidth = Math.max(.8, R * .12); ctx.stroke(); ctx.beginPath(); ctx.arc(X - R * .2, Y - R * .2, R * .45, 0, Math.PI * 2); ctx.fillStyle = '#f5de8a'; ctx.fill(); };
    gableLT(h, -6, 1.8, 6, 9, 'u');                                                                                   // la laiterie
    // chaudron de lait sur son feu, devant la porte
    firePitLT(h, -3.6, 11.4, .75); { const [X, Y] = LP(h, -3.6, 11.4), R = Math.max(3, .85 * s); ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2); ctx.fillStyle = '#3a342e'; ctx.fill(); ctx.beginPath(); ctx.arc(X, Y, R * .75, 0, Math.PI * 2); ctx.fillStyle = '#f2efe6'; ctx.fill(); }
    // presse : poids de pierre sur un plateau de bois
    beamLT(h, 1, 10.6, 4.6, 12.2); blockLT(h, 1.9, 10.9, 3.4, 11.9, true);
    for (const [u, t] of [[4.8, 11], [5.8, 11.4], [5.3, 12.4]]) basketLT(h, u, t, .42, ['#d8c9a0', '#efe6c8']);          // faisselles d'osier
    // la cave : talus de pierre et de terre à porte basse
    heapLT(h, 0, 19.2, 5.4, 3, '#6a5f50', '#857a68'); blockLT(h, -1.6, 15.9, 1.6, 17.1, true);
    pathS(lpts(h, [[-1, 16.4], [1, 16.4], [1, 17.1], [-1, 17.1]])); ctx.fillStyle = '#1c1612'; ctx.fill();            // porte
    // séchoir à claies : meules à affiner
    hayRackLT(h, -6.4, 13.4, -4.2, 14.6); hayRackLT(h, 4.2, 13.8, 6.4, 15);
    for (const [u, t] of [[-5.8, 14], [-4.8, 14], [4.9, 14.4], [5.8, 14.4]]) roue(u, t, .5);
    for (const [u, t] of [[-6.2, 21.4], [-4.9, 21.6], [5.0, 21.5], [6.2, 21.2]]) barrelLT(h, u, t, .45);               // tonneaux de saumure
    for (const [u, t] of [[6.4, 17.4], [6.5, 18.4]]) sackLT(h, u, t, .4, '#e6e0d0');                                   // sel
    for (const [u, t] of [[-6.4, 18], [-6.5, 19]]) barrelLT(h, u, t, .36);                                             // bidons de lait
    roue(2.4, 15.2, .6);
  },
  /* Loge de bûcheron (1 × 2 cases) : chaumière au fond ; devant, l'aire de fendage : billot
     équarri et hache, bûches fendues éparses, stères, grumes à fendre, fagots */
  loge_bucheron: h => {
    const L = h.l, s = view.s, rnd = seeded(Math.round(sid(h) * 5 + sid(h) * 2 * 9) + 2);
    /* sol : celui du terrain */
    cordwoodLT(h, -3.3, 1, -2.5, 7.6); cordwoodLT(h, 2.5, 1, 3.3, 5.2);
    logPileLT(h, -1.9, 2.3, 5.6, 3, .34);
    if (s > 1.5) offcutsLT(h, .3, 3.4, 1.2, 10, 17);
    beamLT(h, -1.1, 2.6, -.2, 3.5); axeLT(h, -.65, 3.05, .7);                                      // billot et hache
    fagotLT(h, 1.2, 1.1, 2, .12);
    thatchLT(h, -3.3, 9, 3.3, 15.2, 'u', STRAW);
    chimneyLT(h, 2.1, 12.1, .45);
    cordwoodLT(h, -3.3, 9.3, -2.6, 13.8);
  },
  /* Hutte de forestier (1 case) : cabane de chaume, pépinière en planches (semis et plants),
     jeunes arbres tuteurés, seau d'arrosage */
  hutte_forestier: h => {
    const L = h.l;
    /* sol : celui du terrain */
    nurseryLT(h, -3.2, .8, .4, 3.3, .45); nurseryLT(h, 1, .8, 3.3, 3.3, .75);
    for (const [u, t, r] of [[2.7, 5.1, .7], [2.5, 6.9, .6]]) { treeLT(h, u, t, r, OAK); }
    bucketLT(h, .7, 3.9);
    ctx.strokeStyle = '#6b5236'; ctx.lineWidth = lw(.08); ctx.beginPath(); ctx.moveTo(...LP(h, -1.5, 3.7)); ctx.lineTo(...LP(h, -.3, 3.9)); ctx.stroke(); // bêche
    thatchLT(h, -3.3, 4.2, 1.3, 7.5, 'u', STRAW);
  },
  /* Camp de chasse (2 × 2 cases) : clairière, abri de chaume, feu de camp, peaux tendues sur
     cadres, séchoir à viande, gibier, butte de tir et flèches, bois et fagots */
  camp_chasse: h => {
    const w2 = h.w / 2, L = h.l, rnd = seeded(Math.round(sid(h) * 5 + sid(h) * 2 * 11) + 8);
    /* sol : celui du terrain */
    tuftsLT(h, -w2 + 1, 1, w2 - 1, L - 1, 70, false);
    hideFrameLT(h, 2.6, 2.3, 1.05); hideFrameLT(h, 5.6, 2.4, 1); hideFrameLT(h, 4.1, 5.6, .95);
    dryRackLT(h, 1.2, 6.8, 9.2, ['#7a2e24', '#8e3b2c', '#6a2a22'], 6);
    firePitLT(h, -3.6, 6.3, .7);
    beastLT(h, 3.8, 12.6, .35, 1.6, .55, '#8a6038', '#7a5230', at => { ctx.strokeStyle = '#d6c7a0'; ctx.lineWidth = lw(.05); ctx.beginPath(); for (const e of [-1, 1]) { ctx.moveTo(...LP(h, ...at(.95, e * .08))); ctx.lineTo(...LP(h, ...at(1.25, e * .38))); ctx.lineTo(...LP(h, ...at(1.45, e * .3))); } ctx.stroke(); }); // cerf abattu
    targetLT(h, -6, 2.4, .7); arrowsLT(h, -2.6, 2.6, 1.2, 6);
    cordwoodLT(h, 6.1, 9.6, 6.9, 12.6); fagotLT(h, 5.4, 14.2, 2.2, .2);
    barrelLT(h, -.4, 12.8, .45);
    thatchLT(h, -7, 9.4, -1.6, 15, 'u', OLD_STRAW);
  },
  /* Hutte de cueillette (2 × 2 cases, 16 × 16 m) : enclos de plessis, cabane de chaume au fond, paniers de baies et de pommes devant la porte, séchoirs à herbes, deux carrés de simples, buissons à baies.
     Les anciennes huttes de 1 × 2 cases gardent l'ancien dessin. */
  hutte_cueillette: h => {
    if (h.w < 12) return BUILD_DRAW.hutte_cueillette_ancien(h);
    const L = h.l;
    tuftsLT(h, -7.4, .8, 7.4, L - .8, 90, true);
    vegPatchLT(h, -7, 2.4, -3.6, 6.8); vegPatchLT(h, -2.8, 2.4, .6, 6.8);
    berryBushLT(h, 5.2, 3, 1, '#7a1f33'); berryBushLT(h, 6.6, 5.2, .9, '#2c2144'); berryBushLT(h, 4.4, 6, .8, '#7a1f33');
    dryRackLT(h, 1.5, 7.2, 9.6, ['#6f8a3e', '#86a04a', '#9a8f4e'], 8); dryRackLT(h, 1.5, 7.2, 11.4, ['#7d8f4a', '#5d7a38', '#a39a5a'], 8);
    thatchLT(h, -6.8, 9, -1, 14.6, 'u', STRAW);
    basketLT(h, -.2, 9.6, .45, ['#6a1f2e', '#8e2b3c', '#3b2244']); basketLT(h, -.15, 10.9, .42, ['#b9402b', '#d0503a']); basketLT(h, -.25, 12.2, .45, ['#6f8a3e', '#86a04a']);
    wattleLT(h, -7.6, .25, 7.6, L - .25, -1.4, 1.4);
  },
  hutte_cueillette_ancien: h => {
    const L = h.l;
    /* sol : celui du terrain */
    tuftsLT(h, -3.4, 7, 3.4, L - .6, 50, true);
    dryRackLT(h, -3, 3, 8.1, ['#6f8a3e', '#86a04a', '#9a8f4e'], 7); dryRackLT(h, -3, 3, 9.9, ['#7d8f4a', '#5d7a38', '#a39a5a'], 7);
    vegPatchLT(h, -3.2, 11.2, -.4, 14.9);
    berryBushLT(h, 1.7, 12, 1, '#7a1f33'); berryBushLT(h, 2.3, 14.5, .9, '#2c2144');
    thatchLT(h, -3.4, 1, 2.1, 6.4, 'u', STRAW);
    basketLT(h, 3, 1.8, .45, ['#6a1f2e', '#8e2b3c', '#3b2244']); basketLT(h, 3.05, 3.1, .42, ['#b9402b', '#d0503a']); basketLT(h, 2.95, 4.5, .45, ['#6f8a3e', '#86a04a']);
  },
  /* Rucher (1 case) : pré fleuri clos d'un plessis, ruches de paille sur leurs pierres,
     abri de chaume au fond et banc à ruches, rangée de lavande */
  rucher: h => {
    const L = h.l, s = view.s;
    /* sol : celui du terrain */
    tuftsLT(h, -3.4, .6, 3.4, L - .6, 90, true);
    if (s > 1.5) { const rnd = seeded(Math.round(sid(h) + sid(h) * 2 * 3)); for (let u = -3; u < 3.1; u += .42) { const [X, Y] = LP(h, u, 1 + (rnd() - .5) * .1), r = Math.max(1, .2 * s); ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2); ctx.fillStyle = '#8a7fb8'; ctx.fill(); ctx.beginPath(); ctx.arc(X, Y + .1 * s, r * .8, 0, Math.PI * 2); ctx.fillStyle = '#6f8a4a'; ctx.fill(); } } // lavande
    thatchLT(h, -3.2, 5.4, 3.2, 7.5, 'u', STRAW);
    beamLT(h, -3, 3.7, 3, 4.3);
    for (const u of [-2.2, 0, 2.2]) skepLT(h, u, 4, .52);
    for (const u of [-1.1, 1.1]) skepLT(h, u, 2.2, .5);
    wattleLT(h, -3.75, .25, 3.75, L - .25, -.7, .7);
  },
  /* Camp de tailleur de pierre (2 × 2 cases) : aire poudreuse d'éclats, blocs taillés rangés,
     blocs bruts, établi (banker) et bloc en cours, chèvre de levage, gravats, appentis */
  tailleur_pierre: h => {
    const w2 = h.w / 2, L = h.l, s = view.s;
    /* sol : celui du terrain */
    chipsLT(h, -1.6, 5.4, 2.4, 60); chipsLT(h, 3, 4, 2, 30);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) blockLT(h, -7 + c * 1.35, 1.2 + r * 1.05, -5.85 + c * 1.35, 2.05 + r * 1.05); // blocs taillés
    for (const [u, t, a, b] of [[-7.2, 8.6, 1.9, 1.4], [-4.8, 9.1, 1.5, 1.2], [-6.8, 10.5, 1.6, 1.1]]) blockLT(h, u, t, u + a, t + b, true); // blocs bruts
    heapLT(h, -4.4, 13.6, 2, 1.4, STONE.lo, STONE.mid);                                           // gravats
    beamLT(h, -2.8, 5.1, -.4, 5.9); blockLT(h, -2.3, 4.8, -1, 5.7);                               // banker
    blockLT(h, .2, 5, 1.2, 5.7, true);
    { const cu = 3.6, ct = 3.6;                                                                    // chèvre de levage : trois perches, un bloc suspendu
      blockLT(h, cu - .5, ct - .4, cu + .5, ct + .4);
      ctx.strokeStyle = '#6b5236'; ctx.lineWidth = lw(.12); ctx.beginPath();
      for (const a of [-.4, 1.7, 3.8]) { ctx.moveTo(...LP(h, cu, ct)); ctx.lineTo(...LP(h, cu + Math.cos(a) * 1.7, ct + Math.sin(a) * 1.7)); } ctx.stroke(); }
    barrowLT(h, 0, 9.4, .5, STONE.hi);
    barrelLT(h, 6.6, 1.6, .42);
    gableLT(h, 1.2, 10, 7.4, 15.3, 'u');                                                          // appentis
  },
  /* Fosse minière (3 × 3 cases, 24 × 24 m) : puits de mine boisé (cadre de rondins, treuil) bordé de ses déblais, rails de bois jusqu'à la grande cabane de bardeaux
     au fond (porte sur la cour) ; à droite de la cabane, un stockage latéral : abri ouvert où le minerai s'entasse (tas et caisses selon le contenu de la cabane).
     Le mineur descend par le puits, remonte avec un minerai, entre dans la cabane (repères : MINE_REP). */
  fosse_miniere: h => {
    const w2 = h.w / 2, L = h.l, s = view.s, rnd = seeded(Math.round(sid(h) * 3 + sid(h) * 2 * 11) + 77), dep = typeof gisementSous === 'function' ? gisementSous(h) : null, g = dep ? GISEMENTS[dep.kind] : null;
    const col = g ? g.couleur : '#8a4a32', hi = g ? g.clair : '#a55c3e', stock = Object.values(h.inv || {}).reduce((q, n) => q + n, 0), [pu, pt] = MINE_REP.puits, [du, dt] = MINE_REP.porte;
    /* sol : cour de terre battue */
    pathS(lpts(h, softRect(-w2 + .5, .5, w2 - .5, L - .5, 2.6, .7, rnd))); ctx.fillStyle = 'rgba(150,126,86,.38)'; ctx.fill();
    chipsLT(h, 0, 12, 11, 90, '#8f7a5e');
    // rails de bois du puits à la porte de la cabane
    ctx.strokeStyle = '#6b5236'; ctx.lineWidth = lw(.14); ctx.lineCap = 'round'; ctx.beginPath();
    for (const e of [-.45, .45]) { ctx.moveTo(...LP(h, pu + 1.4 + e, pt + 1.8)); ctx.lineTo(...LP(h, du + e, dt - .6)); }
    ctx.stroke(); ctx.lineCap = 'butt';
    for (let k = 0; k <= 5; k++) { const a = k / 5, u = pu + 1.4 + (du - pu - 1.4) * a, t = pt + 1.8 + (dt - .6 - pt - 1.8) * a; beamLT(h, u - .75, t - .08, u + .75, t + .08); }
    // déblais
    heapLT(h, pu - 3.6, pt - 1.6, 1.9, 1.4, '#8d7d66', '#a29279'); heapLT(h, pu + 3.4, pt - 2, 1.4, 1, '#8d7d66', '#a29279'); heapLT(h, pu - 3.4, pt + 2.6, 1.1, .9, col, hi);
    // le puits : trou noir, cadre de rondins croisés aux angles, treuil
    pathS(lpts(h, [[pu - 1.4, pt - 1.4], [pu + 1.4, pt - 1.4], [pu + 1.4, pt + 1.4], [pu - 1.4, pt + 1.4]])); ctx.fillStyle = '#120d09'; ctx.fill();
    for (const [a, b] of [[[pu - 1.7, pt - 1.5], [pu + 1.7, pt - 1.3]], [[pu - 1.7, pt + 1.3], [pu + 1.7, pt + 1.5]], [[pu - 1.5, pt - 1.7], [pu - 1.3, pt + 1.7]], [[pu + 1.3, pt - 1.7], [pu + 1.5, pt + 1.7]]]) beamLT(h, a[0], a[1], b[0], b[1]);
    windlassLT(h, pu, pt, 3.2);
    for (const [u, t] of [[pu - 2.4, pt - 2.4], [pu + 2.4, pt - 2.4]]) beamLT(h, u - .14, t - .14, u + .14, t + .14);   // étais
    // grande cabane de bardeaux, porte sur la cour
    gableLT(h, -9, 13, 3.5, 22.8, 'u');
    pathS(lpts(h, [[du - .9, dt - .8], [du + .9, dt - .8], [du + .9, dt], [du - .9, dt]])); ctx.fillStyle = '#2a1f14'; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.06); ctx.stroke();
    blockLT(h, du - .9, dt - 1.3, du + .9, dt - .85, false);                                      // seuil de pierre
    // stockage latéral : abri ouvert à droite de la cabane, tas de minerai selon le stock
    pathS(lpts(h, [[4.6, 11.4], [11, 11.4], [11, 22.8], [4.6, 22.8]])); ctx.fillStyle = 'rgba(96,74,46,.3)'; ctx.fill();
    gableLT(h, 4.6, 17.6, 11, 22.8, 'u', .5);                                                      // toit du fond de l'abri
    for (const [u, t] of [[4.8, 11.6], [10.8, 11.6], [4.8, 17.6], [10.8, 17.6]]) beamLT(h, u - .16, t - .16, u + .16, t + .16);   // poteaux
    const tas = Math.min(4, Math.ceil(stock / 3));
    [[6.2, 13.6, 1.3, 1], [8.8, 13.2, 1.5, 1.1], [10, 15.2, 1, .9], [6.8, 15.8, 1.1, .9]].slice(0, tas).forEach(([u, t, ru, rt]) => heapLT(h, u, t, ru, rt, col, hi));
    if (stock > 6) { crateLT(h, 5.6, 16.5, .55); }
    if (stock > 9) { crateLT(h, 7, 16.7, .55); crateLT(h, 6.3, 16.2, .5); }
    // alentours
    barrowLT(h, -9, 10.4, -.4, col);
    barrelLT(h, 1.6, 11.4, .45); barrelLT(h, 2.5, 11.6, .4);
    if (s > 1.8) { ctx.strokeStyle = '#8a6a45'; ctx.lineWidth = lw(.07); ctx.beginPath(); ctx.moveTo(...LP(h, -1, 9.6)); ctx.lineTo(...LP(h, -.2, 10.2)); ctx.stroke();
      ctx.strokeStyle = '#4c5053'; ctx.lineWidth = lw(.08); ctx.beginPath(); ctx.moveTo(...LP(h, -.15, 9.65)); ctx.lineTo(...LP(h, .15, 10.4)); ctx.stroke(); }   // pic posé
  },
  /* Ferme (3 × 4 cases, 24 × 32 m) : le bâtiment principal seulement — cour de terre battue close d'un plessis (portail sur la rue), logis de chaume sur la rue, grande grange,
     fumier, charrette de foin. Trois EMPLACEMENTS d'extension (FERME_SLOTS) clôturés ; chacune est dessinée par extLT selon sa sorte (jardin, verger, poulailler, enclos à chèvres,
     porcherie, enclos à vaches, enclos à moutons) avec autant d'animaux que l'enclos en contient. Dans l'atelier et les vignettes (sans extensions) : un exemple. */
  ferme: h => {
    const w2 = h.w / 2, L = h.l, s = view.s, rnd = seeded(Math.round(sid(h) * 7 + sid(h) * 2 * 3) + 5);
    /* sol : cour de terre battue devant (le bâtiment de base), le reste de la parcelle appartient à l'extension */
    pathS(lpts(h, softRect(-w2 + .5, .5, w2 - .5, FERME_BASE_T - .9, 2.6, .7, rnd))); ctx.fillStyle = 'rgba(150,126,86,.3)'; ctx.fill();
    chipsLT(h, -1, 8.5, 9, 60, '#8f7a5e');
    wattleLT(h, -w2 + .25, .25, w2 - .25, L - .25, 1.6, 5);                                         // clôture de la parcelle, portail sur la rue
    thatchLT(h, -11.2, 1.4, -3, 8.2, 'u', STRAW);                                                   // logis (devant, à gauche)
    chimneyLT(h, -9.4, 4.8, .55);
    thatchLT(h, 2.6, 1.4, 11.2, 11.4, 'u', OLD_STRAW);                                              // grange (devant, à droite)
    hayCartLT(h, -1.1, 9.8);                                                                        // charrette de foin entre les deux
    heapLT(h, -6.4, 11.4, 1.1, .8, '#5e4a33', '#735c40');                                           // fumier
    waterTroughLT(h, -10.4, 10.2, -8.2, 10.9);                                                      // abreuvoir
    barrelLT(h, -2.2, 3.2, .42); barrelLT(h, -1.5, 3.7, .38);
    extLT(h, h.id !== undefined && h.id < 0 ? { k:'vaches', n:5 } : (h.ext || [])[0], fermeZones(h));   // l'extension : dans le reste de la parcelle (atelier et vignettes : un exemple)
  },
  /* Bergerie (2 × 3 cases) : longue bergerie de chaume sur la rue ; derrière, le parc clos de
     claies tressées : moutons, râtelier à foin, abreuvoir, litière */
  bergerie: h => {
    const w2 = h.w / 2, L = h.l, rnd = seeded(Math.round(sid(h) * 3 + sid(h) * 2 * 13) + 7);
    /* sol : celui du terrain */
    /* sol : celui du terrain */                            // parc brouté
    tuftsLT(h, -w2 + .6, 10, w2 - .6, L - .6, 110, false);
    heapLT(h, -5.6, 21.6, 1.2, .9, '#c7b26a', '#dccb86');
    hayRackLT(h, -1.2, 15.2, 1.2, 16.2);
    waterTroughLT(h, 4.6, 10.9, 6.8, 11.6);
    for (let k = 0; k < 12; k++) { let u, t; do { u = -6.6 + rnd() * 13.2; t = 11 + rnd() * 12; } while (Math.abs(u) < 2 && Math.abs(t - 15.7) < 1.4); sheepLT(h, u, t, rnd() * 6.3); }
    wattleLT(h, -w2 + .4, 9.6, w2 - .4, L - .3, null);
    thatchLT(h, -7.4, .9, 7.4, 8.9, 'u', OLD_STRAW);
    beamLT(h, -1, 9, 1, 9.5);                                                                     // seuil de la porte du parc
  },
  /* Moulin à vent (2 × 2 cases, 16 × 16 m) : moulin-tour féodal sur sa butte herbeuse — tour
     ronde de pierre, toit conique de bardeaux, quatre grandes ailes montées à l'avant de la calotte,
     vues par la tranche (un trait devant la tour), leur ombre en croix au sud-est. Porte et marchepied côté rue, sacs de grain et de farine,
     meule de rechange, charrette de sacs ; maison du meunier et son courtil au fond. */
  moulin: h => {
    const L = h.l, s = view.s, mu = .8, mt = 8.6;
    /* sol : celui du terrain */                                    // pré
    tuftsLT(h, -7.4, .6, 7.4, L - .6, 110, true);
    // chemin de terre de la rue à la porte, et vers la maison du meunier
    pathS(lpts(h, [[-.1, .4], [1.7, .4], [1.8, 5.1], [-.2, 5.1]])); ctx.fillStyle = '#b9a57c'; ctx.fill();
    pathS(lpts(h, [[-3.6, 8.8], [-2.6, 8.4], [-3.4, 11.2], [-4.4, 11.2]])); ctx.fillStyle = 'rgba(185,165,124,.8)'; ctx.fill();
    // butte : herbe foulée, terre tassée au pied de la tour
    { const P = []; for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, k = 1 + .05 * Math.sin(a * 3 + 1); P.push([mu + Math.cos(a) * 5 * k, mt + Math.sin(a) * 4.8 * k]); }
      const S = lpts(h, P); pathS(shiftS(S, .5, .7)); ctx.fillStyle = 'rgba(60,60,30,.18)'; ctx.fill();
      pathS(S); ctx.fillStyle = '#b3ae7c'; ctx.fill(); ctx.strokeStyle = 'rgba(70,64,36,.35)'; ctx.lineWidth = lw(.06); ctx.stroke();
      pathS(lpts(h, P.map(([u, t]) => [mu + (u - mu) * .82, mt + (t - mt) * .82]))); ctx.fillStyle = '#c1ad84'; ctx.fill(); }
    // courtil du meunier : potager, plessis, poules
    vegPatchLT(h, -7, 6.2, -4.4, 9.4);
    wattleLT(h, -7.6, 5.8, -3.9, L - .4, -4.9, -3.9);
    for (const [u, t, a] of [[-5.6, 10.4, .5], [-6.6, 9.9, 2.4]]) henLT(h, u, t, a, '#efe9dc');
    // meule de rechange posée à plat : disque de pierre rayonné, œil au centre
    { const [X, Y] = LP(h, 5.8, 14.2), R = Math.max(2, .85 * s);
      ctx.beginPath(); ctx.arc(X + .2 * s, Y + .3 * s, R, 0, Math.PI * 2); ctx.fillStyle = WOOD.shadow; ctx.fill();
      ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2); ctx.fillStyle = '#a7a194'; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.06); ctx.stroke();
      if (s > 2) { ctx.strokeStyle = 'rgba(70,64,56,.55)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; ctx.moveTo(X + Math.cos(a) * R * .25, Y + Math.sin(a) * R * .25); ctx.lineTo(X + Math.cos(a + .35) * R * .92, Y + Math.sin(a + .35) * R * .92); } ctx.stroke(); }
      ctx.beginPath(); ctx.arc(X, Y, R * .16, 0, Math.PI * 2); ctx.fillStyle = '#3a352e'; ctx.fill(); }
    cartLT(h, 6.4, 9.6, 'sacs');                                                                     // charrette de sacs
    /* Ailes : vue strictement de dessus. Elles tournent dans un plan vertical face à la rue, au
       avant de la calotte, devant la tour : on ne les voit que par la tranche, soit un
       simple trait en travers (vergues et épaisseur du treillis). Seule leur ombre au sol, légère,
       trahit la croix. */
    const tw = [mu, mt], hub = [mu, mt - 4.7], R = 8, Z = 10;       // ailes bien devant la tour ; l'arbre (rotor) les relie en passant sous le toit
    const sails = [Math.PI / 4, Math.PI * 3 / 4, Math.PI * 5 / 4, Math.PI * 7 / 4];
    const plane = (a, proj) => { const du = Math.cos(a), dv = Math.sin(a); return (x, y) => proj(du * x - dv * y, dv * x + du * y); };
    const ground = (px, pv) => [hub[0] + px + (Z + pv) * .3, hub[1] + (Z + pv) * .4];              // ombre au sol
    ctx.beginPath(); for (const a of sails) { const at = plane(a, ground); addS(lpts(h, [at(0, -.25), at(R * .2, -.25), at(R * .2, -.95), at(R, -.8), at(R, .8), at(R * .2, .95), at(R * .2, .25), at(0, .25)])); }
    ctx.fillStyle = 'rgba(40,34,24,.13)'; ctx.fill();
    // arbre des ailes (rotor) : il sort de sous le toit et va jusqu'aux ailes ; dessiné avant la tour, qui le recouvre
    { const P = lpts(h, [[mu - .2, hub[1]], [mu + .2, hub[1]], [mu + .2, mt], [mu - .2, mt]]);
      pathS(shiftS(P, .3, .4)); ctx.fillStyle = WOOD.shadow; ctx.fill();
      pathS(P); ctx.fillStyle = '#7a5c3c'; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.05); ctx.stroke();
      pathS(lpts(h, [[mu - .16, hub[1]], [mu - .04, hub[1]], [mu - .04, mt], [mu - .16, mt]])); ctx.fillStyle = 'rgba(255,240,210,.25)'; ctx.fill(); }
    // tour ronde de pierre : longue ombre, maçonnerie appareillée, puis le toit conique
    { const [X, Y] = LP(h, ...tw), Rt = 3.5 * s, Rr = 3.05 * s;
      ctx.beginPath(); ctx.arc(X + 2.2 * s, Y + 2.9 * s, Rt, 0, Math.PI * 2); ctx.fillStyle = 'rgba(40,34,24,.3)'; ctx.fill();
      ctx.beginPath(); ctx.arc(X, Y, Rt, 0, Math.PI * 2); ctx.fillStyle = STONE.mid; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.1); ctx.stroke();
      ctx.beginPath(); ctx.arc(X - .12 * s, Y - .14 * s, Rt * .95, Math.PI * .75, Math.PI * 1.75); ctx.strokeStyle = STONE.cap; ctx.lineWidth = Math.max(1, .22 * s); ctx.stroke();
      if (s > 2) { ctx.strokeStyle = STONE.joint; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2 + (i % 2) * .06; ctx.moveTo(X + Math.cos(a) * Rr, Y + Math.sin(a) * Rr); ctx.lineTo(X + Math.cos(a) * Rt, Y + Math.sin(a) * Rt); } ctx.moveTo(X + (Rr + Rt) / 2, Y); ctx.arc(X, Y, (Rr + Rt) / 2, 0, Math.PI * 2); ctx.stroke(); }
      // toit conique : pans rayonnants teintés selon leur orientation (lumière du nord-ouest)
      const N = 32, hi = [184, 162, 126], lo = [104, 86, 66];
      for (let i = 0; i < N; i++) {
        const a0 = i / N * Math.PI * 2, a1 = (i + 1) / N * Math.PI * 2, am = (a0 + a1) / 2, k = (1 + (Math.cos(am) + Math.sin(am)) / Math.SQRT2) / 2;
        ctx.beginPath(); ctx.moveTo(X, Y); ctx.arc(X, Y, Rr, a0, a1 + .01); ctx.closePath();
        ctx.fillStyle = `rgb(${hi.map((v, j) => Math.round(v + (lo[j] - v) * k)).join(',')})`; ctx.fill();
      }
      if (s > 1.4) { ctx.strokeStyle = 'rgba(58,44,30,.4)'; ctx.lineWidth = 1; ctx.beginPath();          // rangs de bardeaux
        for (let r = Rr * .2; r < Rr; r += .5 * s) { ctx.moveTo(X + r, Y); ctx.arc(X, Y, r, 0, Math.PI * 2); }
        if (s > 3) for (let r = Rr * .2, j = 0; r < Rr - .1; r += .5 * s, j++) { const n = Math.max(6, Math.round(r * 2 * Math.PI / (.7 * s))); for (let i = 0; i < n; i++) { const a = (i + (j % 2) * .5) / n * Math.PI * 2, r2 = Math.min(Rr, r + .5 * s); ctx.moveTo(X + Math.cos(a) * r, Y + Math.sin(a) * r); ctx.lineTo(X + Math.cos(a) * r2, Y + Math.sin(a) * r2); } }
        ctx.stroke(); }
      ctx.beginPath(); ctx.arc(X, Y, Rr, 0, Math.PI * 2); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.14); ctx.stroke(); }
    // sacs de grain et de farine autour de la tour
    for (const [u, t, c] of [[-3, 10.6], [-3.3, 11.4, '#e8e2d2'], [-2.5, 11.5, '#e8e2d2'], [4.6, 8.5], [4.8, 9.4, '#e8e2d2']]) sackLT(h, u, t, .36, c);
    { // ailes vues par la tranche : vergue fine, deux filets de toile de part et d'autre, bouts des lattes
      const w = R * Math.SQRT1_2 + .7, x0 = R * .2 * Math.SQRT1_2, [hu, ht] = hub;
      const line = (u0, t0, u1, t1, col, wd) => { ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(...LP(h, u0, t0)); ctx.lineTo(...LP(h, u1, t1)); ctx.stroke(); };
      ctx.lineCap = 'round';
      line(hu - w + .25, ht + .3, hu + w + .25, ht + .3, WOOD.shadow, Math.max(1.2, .3 * s));
      for (const d of [-1, 1]) for (const y of [-.13, .13]) line(hu + d * x0, ht + y, hu + d * (w - .25), ht + y, '#efe8d6', Math.max(1, .1 * s));
      line(hu - w, ht, hu + w, ht, '#6b4f32', Math.max(1.2, .12 * s));
      if (s > 1.5) for (const d of [-1, 1]) for (let x = x0; x < w - .2; x += .5) line(hu + d * x, ht - .19, hu + d * x, ht + .19, '#5a4128', 1);
      ctx.lineCap = 'butt'; }
    thatchLT(h, -7.3, 11, -3.3, 15.4, 'u', STRAW); chimneyLT(h, -6.3, 13.2, .45);                   // maison du meunier
  },
  /* Four communal (2 × 2 cases) : fournil couvert de bardeaux sur la rue, grand four en
     coupole d'argile derrière, fagots et bois pour la chauffe, sacs de farine, table aux
     pains, tas de cendres */
  four: h => {
    const w2 = h.w / 2, L = h.l, s = view.s;
    /* sol : celui du terrain */
    heapLT(h, -6.2, 13.8, 1, .8, '#8f887c', '#a39d91');                                          // cendres
    for (const [u, t, a] of [[4.4, 2, .05], [4.6, 3.1, -.05], [4.3, 4.2, .1], [6.3, 2.6, 1.5]]) fagotLT(h, u, t, 2.2, a);
    cordwoodLT(h, 6.4, 8.6, 7.2, 14.8);
    for (const [u, t] of [[3, 7.4], [3.9, 7.7], [3.4, 8.5]]) sackLT(h, u, t, .38, '#e8e2d2');
    beamLT(h, -6.8, 10, -4.8, 11.4);                                                              // table aux pains
    if (s > 1.8) { ctx.fillStyle = '#b9803e'; for (let k = 0; k < 6; k++) { const [X, Y] = LP(h, -6.5 + (k % 3) * .6, 10.35 + Math.floor(k / 3) * .6); ctx.beginPath(); ctx.ellipse(X, Y, .24 * s, .18 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(80,46,20,.6)'; ctx.lineWidth = 1; ctx.stroke(); } }
    ovenLT(h, -1.4, 11.6, 2.4);                                                                   // four
    gableLT(h, -7.2, 1.3, 2.6, 8.4, 'u');                                                         // fournil
    chimneyLT(h, -1.4, 7.6, .6);
    barrelLT(h, 3.3, 1.2, .38);
  },
  /* Grange (2 × 3 cases) : grande grange de chaume, faîtage vers la rue, aire de battage
     pavée devant ses portes ; charrette de foin, meule, sacs de grain, tonneaux */
  grange: h => {
    const w2 = h.w / 2, L = h.l;
    /* sol : celui du terrain */
    pathS(lpts(h, [[-3.2, .6], [1.8, .6], [1.8, 3], [-3.2, 3]])); ctx.fillStyle = '#b3aa96'; ctx.fill(); // aire devant les portes
    tuftsLT(h, 4.6, 12, 7.4, L - .6, 40, false);
    hayCartLT(h, 6, 3.2);
    stackLT(h, 6, 11, 1.3);
    for (const [u, t] of [[5.4, 14.6], [6.4, 15], [5.8, 15.9], [5.3, 17.1], [6.5, 17.4]]) sackLT(h, u, t, .38);
    barrelLT(h, 5.8, 20.6, .42); barrelLT(h, 6.6, 21.4, .4);
    thatchLT(h, -7.3, 2.4, 4.3, 22.8, 't', OLD_STRAW);
  },
  /* Entrepôt (3 × 3 cases) : cour gravillonnée close de perches ; grande halle en bardeaux et son
     quai de chargement ; caisses, tonneaux, sacs, planches et poutres, charrette */
  entrepot: h => {
    const w2 = h.w / 2, L = h.l;
    /* sol : celui du terrain */
    for (const [u, t, a] of [[-10, 2.2, .5], [-8.9, 2.3, .45], [-10.1, 3.3, .48], [-8.8, 3.4, .5], [-9.4, 4.6, .45], [-7.6, 2.4, .42]]) crateLT(h, u, t, a);
    for (const [u, t] of [[-5.4, 2.2], [-4.4, 2.4], [-5.2, 3.2], [-4.2, 3.4], [-4.8, 4.3]]) barrelLT(h, u, t, .45);
    for (const [u, t] of [[2.2, 2.1], [3, 2.4], [2.4, 3.2], [3.2, 3.5], [2.6, 4.3]]) sackLT(h, u, t, .38);
    planksLT(h, 5.2, 1.4, 10.8, 3.8);
    beamStackLT(h, 5.2, 5.4, 10.8, 4, .42);
    cartLT(h, -1.2, 3.4);
    railFenceLT(h, -w2 + .4, .4, w2 - .4, L - .4, -3, 1.2);
    beamLT(h, -4.2, 9.1, 4.2, 10.4);                                                              // quai
    gableLT(h, -11.2, 10.2, 11.2, 23.2, 'u');                                                     // halle
  },
  /* Poste de relais (2 × 2 cases) : maison du relayeur (chaume), écurie des mulets (bardeaux) ;
     mulets à la barre d'attache, abreuvoir, bâts et ballots, clôture de perches */
  relais: h => {
    const w2 = h.w / 2, L = h.l;
    /* sol : celui du terrain */
    heapLT(h, -5.6, 13.6, 1, .8, '#c7b26a', '#dccb86');
    sackLT(h, -2.6, 10.6, .4, '#cdbb8e'); sackLT(h, -2, 11.4, .38); crateLT(h, -1.4, 12.6, .42); crateLT(h, -2.4, 13.2, .4);
    hitchRailLT(h, 1.8, 7, 3.3);
    for (const [u, c] of [[2.7, '#6e5a48'], [4.4, '#7d6450'], [6.1, '#5c4a3a']]) muleLT(h, u, 4.7, -Math.PI / 2, c);
    waterTroughLT(h, 2, 6.8, 6.6, 7.5);
    railFenceLT(h, -w2 + .4, .4, w2 - .4, L - .4, .8, 1.4);
    gableLT(h, -.4, 9.2, 7.4, 15.4, 'u');                                                         // écurie
    thatchLT(h, -7.3, 1.2, .8, 7.9, 'u', STRAW); chimneyLT(h, -5.8, 4.55, .5);                    // maison du relayeur
  },
  /* Poteau d'attache (1 case) : aire piétinée, barre d'attache, paire de bœufs au foin,
     joug posé, abreuvoir */
  poteau: h => {
    const L = h.l;
    /* sol : celui du terrain */
    tuftsLT(h, -3.4, .5, 3.4, L - .5, 30, false);
    heapLT(h, 0, 2.2, 2, .7, '#c7b26a', '#dccb86');
    hitchRailLT(h, -3, 3, 3.5);
    cowLT(h, -1.3, 5, -Math.PI / 2, '#8a5d3b'); cowLT(h, 1.3, 5.1, -Math.PI / 2 + .08, '#6b4a32');
    beamLT(h, -2.2, 6.9, .6, 7.15);                                                               // joug
    waterTroughLT(h, 2.6, 5.8, 3.3, 7.5);
  },
  /* Comptoir commercial (3 × 2 cases) : halle du comptoir (bardeaux, cheminée du bureau) ;
     devant, deux étals couverts, caisses, tonneaux, sacs, ballots d'étoffe, mulet bâté */
  comptoir: h => {
    const w2 = h.w / 2, L = h.l;
    /* sol : celui du terrain */
    stallLT(h, -10.6, 3.8, -4.6, 7, '#e8dfc6', '#3f5d7a', ['#8a3b2e', '#3f5d7a', '#c9b27a']);
    stallLT(h, 4.6, 3.8, 10.6, 7, '#e8dfc6', '#8a3b2e', ['#b47c55', '#c9924e', '#6f8a3e']);
    barrelLT(h, -2.4, 2.4, .42); barrelLT(h, -2.6, 3.4, .4); crateLT(h, -.8, 2.2, .45); crateLT(h, .2, 2.6, .42);
    sackLT(h, 1.8, 2.2, .38); sackLT(h, 2.5, 3, .38);
    for (const [u, t, c] of [[-1.4, 4.4, '#8a3b2e'], [-.4, 4.5, '#3f5d7a'], [.6, 4.4, '#c9b27a']]) { const P = lpts(h, [[u - .4, t - .25], [u + .4, t - .25], [u + .4, t + .25], [u - .4, t + .25]]); pathS(shiftS(P, .15, .2)); ctx.fillStyle = WOOD.shadow; ctx.fill(); pathS(P); ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.04); ctx.stroke(); } // ballots d'étoffe
    muleLT(h, 2.9, 5.8, Math.PI, '#6e5a48');
    gableLT(h, -11.2, 8, 11.2, 15.4, 'u');
    chimneyLT(h, -8, 11.7, .55);
  },
  /* Comptoir de bétail (3 × 3 cases) : parcs de perches (bœufs, moutons, porcs), allée de
     terre, étable de chaume, râteliers et abreuvoirs */
  comptoir_betail: h => {
    const w2 = h.w / 2, L = h.l, rnd = seeded(Math.round(sid(h) * 9 + sid(h) * 2 * 7) + 3);
    /* sol : celui du terrain */
    /* sol : celui du terrain */ /* sol : celui du terrain */
    /* sol : celui du terrain */
    tuftsLT(h, -11.2, 1.2, 11.2, 12.6, 140, false);
    const box = (u0, t0, u1, t1, g0, g1) => [[[u0, t0], [g0, t0]], [[g1, t0], [u1, t0]], [[u1, t0], [u1, t1]], [[u1, t1], [u0, t1]], [[u0, t1], [u0, t0]]];
    hayRackLT(h, -10.6, 5, -9.6, 8.6); waterTroughLT(h, -3.4, 11.4, -1.4, 12.1); waterTroughLT(h, 9, 1.6, 10.8, 2.3);
    heapLT(h, 9.8, 21.6, 1, .8, '#c7b26a', '#dccb86'); troughLT(h, 2, 22, 4.6, 22.7, '#a58a5c');
    for (const [u, t, a, c] of [[-6.8, 4, .3, '#8a5d3b'], [-4, 7.4, 2.4, '#6b4a32'], [-7.2, 10, -.6, '#b58a5a'], [-3.4, 3.2, 3.6, '#8a5d3b']]) cowLT(h, u, t, a, c);
    for (let k = 0; k < 8; k++) sheepLT(h, 2 + rnd() * 8.4, 3.4 + rnd() * 8.4, rnd() * 6.3);
    for (let k = 0; k < 4; k++) pigLT(h, 2.6 + rnd() * 7.6, 15.2 + rnd() * 5.4, rnd() * 6.3);
    pensLT(h, [...box(-11.4, 1, -.8, 12.8, -4.2, -2.4), ...box(.8, 1, 11.4, 12.8, 2.4, 4.2), ...box(.8, 14, 11.4, 23.2, 2.4, 4.2)]);
    thatchLT(h, -11.4, 14.8, -1.6, 23.2, 'u', OLD_STRAW);
  },
};
