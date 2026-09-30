const BUILD_DRAW = {
  /* Scierie (3 × 4 cases, 24 × 32 m) : cour de terre battue close d'une clôture de perches,
     portail côté rue ; grande halle de sciage (toit à deux pans en bardeaux) d'où sort le
     chemin de roulement du chariot, une grume dessus ; parc à grumes en tas ; piles de
     planches qui sèchent sur liteaux ; tas de sciure ; charrette chargée ; loge du scieur. */
  scierie: h => {
    const w2 = h.w / 2, L = h.l, s = view.s;
    const yard = lpts(h, [[-w2 + .3, .3], [w2 - .3, .3], [w2 - .3, L - .3], [-w2 + .3, L - .3]]);
    pathS(yard); ctx.fillStyle = WOOD.yard; ctx.fill();                                          // cour
    if (s > 1.5) { const rnd = seeded(Math.round(h.x * 7 + h.y * 13)); ctx.fillStyle = WOOD.speck; for (let k = 0; k < 90; k++) { const [X, Y] = LP(h, -w2 + 1 + rnd() * (h.w - 2), 1 + rnd() * (L - 2)); ctx.beginPath(); ctx.arc(X, Y, Math.max(.5, .12 * s), 0, Math.PI * 2); ctx.fill(); } }
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
    const w2 = h.w / 2, L = h.l, s = view.s, rnd = seeded(Math.round(h.x * 3 + h.y * 7) + 5);
    pathS(lpts(h, softRect(-w2 + .3, .3, w2 - .3, L - .3, .8, .2, rnd))); ctx.fillStyle = WOOD.yard; ctx.fill(); // courtil
    if (s > 3) { ctx.fillStyle = 'rgba(110,130,70,.35)'; for (let k = 0; k < 30; k++) { const u = -w2 + .6 + rnd() * (h.w - 1.2), t = .6 + rnd() * (L - 1.2); if (Math.abs(u - .8) < .9 && t < 2.6) continue; const [X, Y] = LP(h, u, t); ctx.fillRect(X, Y, Math.max(1, .12 * s), Math.max(1, .2 * s)); } } // touffes d'herbe
    pathS(lpts(h, [[.1, .3], [1.5, .3], [1.3, 2.2], [.3, 2.2]])); ctx.fillStyle = 'rgba(150,126,86,.45)'; ctx.fill(); // sentier
    if (s > 2) for (const [u, t, r] of [[.75, .8, .22], [.95, 1.4, .2], [.65, 1.9, .2]]) {         // pierres plates du sentier
      const st = []; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, k = .8 + rnd() * .3; st.push([u + Math.cos(a) * r * k, t + Math.sin(a) * r * .8 * k]); }
      pathS(lpts(h, st)); ctx.fillStyle = '#b3ab99'; ctx.fill(); ctx.strokeStyle = 'rgba(60,50,40,.5)'; ctx.lineWidth = 1; ctx.stroke(); }
    vegPatchLT(h, -3.3, .9, -.7, 2.1);                                                          // potager
    wattleLT(h, -w2 + .25, .25, w2 - .25, L - .25, .1, 1.5);                                    // plessis, ouvert sur la rue
    cordwoodLT(h, 2.95, 3.2, 3.55, 6.4);                                                         // bois fendu contre le pignon
    const P = lpts(h, [[.3, 2.35], [1.3, 2.35], [1.3, 2.75], [.3, 2.75]]);                      // seuil de pierre
    pathS(P); ctx.fillStyle = WOOD.stone; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.05); ctx.stroke();
    thatchLT(h, -3.4, 2.7, 2.6, 7.4, 'u', STRAW);                                                // chaumière
    chimneyLT(h, -2.6, 5.05, .45);                                                               // cheminée en pignon
  },
  /* Maison avec arrière-cour (1 × 3 cases, 8 × 24 m) : chaumière côté rue comme la maison
     simple, puis l'arrière-cour close d'un plessis, selon son extension : potager, verger,
     poulailler, chèvres, ou un atelier d'artisan au fond (toit de bardeaux) et sa cour de
     travail. Sert aussi à la cour de la grande maison (_yardFrom : début de la cour). */
  maison_cour: h => {
    const w2 = h.w / 2, L = h.l, s = view.s, yard = yardOf(h), Y0 = h._yardFrom || CELL, own = !h._yardFrom;
    const rnd = seeded(Math.round(h.x * 3 + h.y * 7) + 9), craft = EXT[yard].grp === 'Artisanat';
    if (own) { pathS(lpts(h, softRect(-w2 + .3, .3, w2 - .3, L - .3, .8, .2, rnd))); ctx.fillStyle = WOOD.yard; ctx.fill(); } // courtil
    const ground = yard === 'verger' ? '#b3b673' : yard === 'potager' ? '#c2ad80' : craft ? WOOD.yard : '#bba27a';
    pathS(lpts(h, softRect(-w2 + .45, Y0 + .1, w2 - .45, L - .45, .5, .12, rnd))); ctx.fillStyle = ground; ctx.fill();
    if (s > 3 && yard === 'verger') { ctx.fillStyle = 'rgba(90,120,55,.4)'; for (let k = 0; k < 60; k++) { const [X, Y] = LP(h, -w2 + .7 + rnd() * (h.w - 1.4), Y0 + .5 + rnd() * (L - Y0 - 1)); ctx.fillRect(X, Y, Math.max(1, .1 * s), Math.max(1, .22 * s)); } }
    yardLT(h, yard, -w2 + .6, Y0 + .4, w2 - .6, L - .6);
    if (own) {
      wattleLT(h, -w2 + .25, .25, w2 - .25, L - .25, .1, 1.5, [[[-w2 + .25, Y0], [-.4, Y0]], [[.6, Y0], [w2 - .25, Y0]]]); // plessis, refend et barrière de la cour
      pathS(lpts(h, [[.1, .3], [1.5, .3], [1.3, 1.9], [.3, 1.9]])); ctx.fillStyle = 'rgba(150,126,86,.45)'; ctx.fill(); // sentier
      const P = lpts(h, [[.3, 1.95], [1.3, 1.95], [1.3, 2.35], [.3, 2.35]]); pathS(P); ctx.fillStyle = WOOD.stone; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.05); ctx.stroke();
      thatchLT(h, -3.4, 2.3, 3.4, 7.5, 'u', STRAW);                                               // chaumière
      chimneyLT(h, -2.6, 4.9, .45);
    } else wattleLT(h, -w2 + .25, Y0, w2 - .25, L - .25, null);
  },
  /* Camp de bûcherons (2 × 2 cases, 16 × 16 m) : clairière de terre battue sans clôture, en
     lisière de forêt ; hutte de chaume au fond, grumes ébranchées sur rondins de glissement,
     stère de bois fendu, chevalet avec scie, fagots liés, branchages, feu de camp, hache,
     ornières de débardage qui partent vers la forêt. */
  camp_bucherons: h => {
    const w2 = h.w / 2, L = h.l, s = view.s, rnd = seeded(Math.round(h.x * 5 + h.y * 11) + 1);
    const clear = lpts(h, softRect(-w2 + .5, .5, w2 - .5, L - .5, 2.6, .7, rnd));
    pathS(clear); ctx.fillStyle = WOOD.yard; ctx.fill();                                          // clairière
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
    const w2 = h.w / 2, L = h.l, s = view.s, rnd = seeded(Math.round(h.x * 3 + h.y * 11) + 21);
    groundLT(h, -w2 + .4, .4, w2 - .4, L - .4, '#c2b48f', '#aa9b76', .5);                        // cour de terre battue
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
  /* Puits (1 case) : margelle de pierre, treuil et corde, dallage autour, auge et seaux */
  puits: h => {
    const L = h.l, c = L / 2, s = view.s, rnd = seeded(Math.round(h.x * 5 + h.y * 3) + 4);
    groundLT(h, -3.6, .4, 3.6, L - .4, '#c0ae88', '#a8966f', 1.8);                                 // terre piétinée
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
  /* Marché (3 × 3 cases) : place de terre battue, carré pavé et croix de marché sur ses
     marches ; étals à auvents rayés, charrette, caisses, sacs, tonneaux et paniers */
  marche: h => {
    const w2 = h.w / 2, L = h.l, s = view.s;
    groundLT(h, -w2 + .3, .3, w2 - .3, L - .3, '#c6b791', '#ae9e79', 1.2);
    pathS(lpts(h, [[-5.4, 6.6], [5.4, 6.6], [5.4, 17.4], [-5.4, 17.4]])); ctx.fillStyle = '#b5ab96'; ctx.fill();
    if (s > 2.2) { const rnd = seeded(Math.round(h.x + h.y) + 8); ctx.strokeStyle = 'rgba(70,62,50,.3)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let t = 6.6, k = 0; t < 17.4; t += .5, k++) { ctx.moveTo(...LP(h, -5.4, t)); ctx.lineTo(...LP(h, 5.4, t)); for (let u = -5.4 + (k % 2) * .3 + rnd() * .1; u < 5.4; u += .6) { ctx.moveTo(...LP(h, u, t)); ctx.lineTo(...LP(h, u, Math.min(17.4, t + .5))); } }
      ctx.stroke(); }
    blockLT(h, -1.9, 10.1, 1.9, 13.9, true); blockLT(h, -1.2, 10.8, 1.2, 13.2);                     // marches
    blockLT(h, -.22, 10.9, .22, 13.1); blockLT(h, -.8, 11.4, .8, 11.8);                            // croix de marché
    const VEG = ['#6f8a3e', '#c98a3a', '#b9402b', '#86a04a'], CLOTH = ['#8a3b2e', '#3f5d7a', '#e6dcc4', '#c9b27a'], POT = ['#b47c55', '#9a6a44', '#cf9a6e'], BREAD = ['#c9924e', '#a8733a', '#e0b070'];
    stallLT(h, -11, 19.6, -5.4, 23, '#e8dfc6', '#8a3b2e', VEG);
    stallLT(h, -2.8, 19.6, 2.8, 23, '#e8dfc6', '#3f5d7a', CLOTH);
    stallLT(h, 5.4, 19.6, 11, 23, '#e8dfc6', '#5d7a3f', POT);
    stallLT(h, -11, 2.4, -6.2, 5.6, '#e8dfc6', '#a0762e', BREAD);
    stallLT(h, 6.2, 2.4, 11, 5.6, '#e8dfc6', '#6a3a5a', VEG);
    cartLT(h, -9.4, 8.4);
    for (const [u, t] of [[-7, 9.2], [-7.2, 10.3]]) sackLT(h, u, t, .38);
    crateLT(h, 8.6, 9, .45); crateLT(h, 9.6, 9.3, .4); crateLT(h, 9, 10.2, .42);
    barrelLT(h, 8.4, 13.4, .42); barrelLT(h, 9.4, 13.9, .4);
    basketLT(h, -7.4, 15.6, .4, ['#8e2b3c', '#6a1f2e']); basketLT(h, -6.6, 16.3, .38, ['#6f8a3e', '#86a04a']); basketLT(h, 7.4, 16.2, .4, ['#c98a3a', '#e0a64a']);
    for (const [u, t, a] of [[-3.8, 18.4, .4], [3.6, 5.4, 2.2], [-4.4, 4.6, -1]]) henLT(h, u, t, a, '#efe9dc');
  },
  /* Taverne (2 × 2 cases) : grande salle de chaume sur la rue, cheminée, enseigne ; cellier
     en appentis ; derrière, la cour aux tables et bancs, tonneaux, bois, plessis */
  taverne: h => {
    const w2 = h.w / 2, L = h.l, s = view.s;
    groundLT(h, -w2 + .3, .3, w2 - .3, L - .3, WOOD.yard, WOOD.speck, 1);
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
    const w2 = h.w / 2, L = h.l, s = view.s, rnd = seeded(Math.round(h.x * 7 + h.y * 5) + 3);
    groundLT(h, -w2 + .4, .4, w2 - .4, L - .4, GRASS.lush, null, .6);
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
    const w2 = h.w / 2, L = h.l, rnd = seeded(Math.round(h.x * 13 + h.y * 3) + 6);
    groundLT(h, -w2 + .4, .4, w2 - .4, L - .4, GRASS.lush, null, .6);
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
    const w2 = h.w / 2, L = h.l, hw = 2 * CELL, yard = yardOf(h), rnd = seeded(Math.round(h.x * 3 + h.y * 7) + 12);
    pathS(lpts(h, softRect(-w2 + .3, .3, w2 - .3, L - .3, .8, .2, rnd))); ctx.fillStyle = WOOD.yard; ctx.fill(); // courtil
    BUILD_DRAW.maison_cour({ ...h, yard, _yardFrom:hw });
    groundLT(h, 4.2, .7, w2 - .6, hw - .5, GRASS.lush, null, .5);                                 // jardin
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
  /* Loge de bûcheron (1 × 2 cases) : chaumière au fond ; devant, l'aire de fendage : billot
     équarri et hache, bûches fendues éparses, stères, grumes à fendre, fagots */
  loge_bucheron: h => {
    const L = h.l, s = view.s, rnd = seeded(Math.round(h.x * 5 + h.y * 9) + 2);
    groundLT(h, -3.6, .4, 3.6, L - .4, WOOD.yard, WOOD.speck, 1.4);
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
    groundLT(h, -3.6, .4, 3.6, L - .4, '#bda97f', '#a38f68', 1.4);
    nurseryLT(h, -3.2, .8, .4, 3.3, .45); nurseryLT(h, 1, .8, 3.3, 3.3, .75);
    for (const [u, t, r] of [[2.7, 5.1, .7], [2.5, 6.9, .6]]) { treeLT(h, u, t, r, OAK); }
    bucketLT(h, .7, 3.9);
    ctx.strokeStyle = '#6b5236'; ctx.lineWidth = lw(.08); ctx.beginPath(); ctx.moveTo(...LP(h, -1.5, 3.7)); ctx.lineTo(...LP(h, -.3, 3.9)); ctx.stroke(); // bêche
    thatchLT(h, -3.3, 4.2, 1.3, 7.5, 'u', STRAW);
  },
  /* Camp de chasse (2 × 2 cases) : clairière, abri de chaume, feu de camp, peaux tendues sur
     cadres, séchoir à viande, gibier, butte de tir et flèches, bois et fagots */
  camp_chasse: h => {
    const w2 = h.w / 2, L = h.l, rnd = seeded(Math.round(h.x * 5 + h.y * 11) + 8);
    pathS(lpts(h, softRect(-w2 + .5, .5, w2 - .5, L - .5, 2.6, .7, rnd))); ctx.fillStyle = '#c4b28a'; ctx.fill();
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
  /* Hutte de cueillette (1 × 2 cases) : cabane de chaume, paniers de baies et de pommes,
     séchoirs à herbes, carré de simples, buissons à baies */
  hutte_cueillette: h => {
    const L = h.l;
    groundLT(h, -3.6, .4, 3.6, L - .4, '#c0ad85', '#a8956e', 1.4);
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
    groundLT(h, -3.6, .4, 3.6, L - .4, GRASS.lush, null, 1.2);
    tuftsLT(h, -3.4, .6, 3.4, L - .6, 90, true);
    if (s > 1.5) { const rnd = seeded(Math.round(h.x + h.y * 3)); for (let u = -3; u < 3.1; u += .42) { const [X, Y] = LP(h, u, 1 + (rnd() - .5) * .1), r = Math.max(1, .2 * s); ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2); ctx.fillStyle = '#8a7fb8'; ctx.fill(); ctx.beginPath(); ctx.arc(X, Y + .1 * s, r * .8, 0, Math.PI * 2); ctx.fillStyle = '#6f8a4a'; ctx.fill(); } } // lavande
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
    groundLT(h, -w2 + .4, .4, w2 - .4, L - .4, '#cbc3b1', '#b2aa98', 1);
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
  /* Fosse minière (2 × 2 cases) : fosse à ciel ouvert creusée le long d'un filon, au contour
     irrégulier, bordée d'un bourrelet de déblais ; gradins dont les parois nord-ouest sont à
     l'ombre ; strates et veines de minerai (fer rouille, argile) ; au fond, puits boisé, treuil et flaque. Autour :
     tas de minerai de fer et d'argile, déblais, brouette, bois d'étai, cabane. */
  fosse_miniere: h => {
    const w2 = h.w / 2, L = h.l, s = view.s, cu = .5, ct = 8.2, rnd = seeded(Math.round(h.x * 3 + h.y * 11) + 77);
    groundLT(h, -w2 + .4, .4, w2 - .4, L - .4, '#b39a78', '#9c8462', 1.4);
    // contour d'un niveau : ovale allongé dans l'axe du filon (un peu penché), bords irréguliers
    const ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28], tilt = -.35;
    const level = (k, du = 0, dt = 0) => { const P = []; for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, q = 1 + .09 * Math.sin(3 * a + ph[0]) + .05 * Math.sin(5 * a + ph[1]) + .03 * Math.sin(9 * a + ph[2]);
      const x = Math.cos(a) * 5.6 * k * q, y = Math.sin(a) * 4.5 * k * q; P.push([cu + du + x * Math.cos(tilt) - y * Math.sin(tilt), ct + dt + x * Math.sin(tilt) + y * Math.cos(tilt)]); } return P; };
    // bourrelet de déblais tout autour de la fosse
    { const R = level(1.2), S = lpts(h, R); pathS(shiftS(S, .3, .4)); ctx.fillStyle = 'rgba(60,46,28,.18)'; ctx.fill(); pathS(S); ctx.fillStyle = '#bda37c'; ctx.fill(); ctx.strokeStyle = 'rgba(80,62,40,.35)'; ctx.lineWidth = lw(.05); ctx.stroke(); }
    chipsLT(h, cu, ct, 6.6, 70, '#8f7a5e');
    // gradins : chaque niveau est un trou dans le précédent ; l'ombre du bord nord-ouest tombe dedans
    const K = [1, .8, .61, .43, .27], lit = ['#a88c66', '#977b58', '#846b4b', '#715b3f', '#5d4b34'], dark = ['#6f5a3e', '#62503a', '#554431', '#473a2a', '#3a2f22'];
    const off = [[0, 0], [.15, .1], [.3, .15], [.4, .25], [.5, .3]];                                // les niveaux profonds se décalent vers le filon
    K.forEach((k, i) => {
      const P = lpts(h, level(k, ...off[i]));
      ctx.save(); pathS(P); ctx.clip();
      ctx.fillStyle = dark[i]; ctx.fill();                                                          // paroi et fond à l'ombre…
      pathS(shiftS(P, .55, .7)); ctx.fillStyle = lit[i]; ctx.fill();                                // …sauf là où le soleil entre
      if (s > 1.6) { ctx.strokeStyle = 'rgba(40,30,18,.28)'; ctx.lineWidth = 1; ctx.beginPath();      // strates de la paroi
        for (let j = 1; j <= 3; j++) { const Q = shiftS(P, .12 * j, .15 * j); Q.forEach((p, n) => { if (n % 2) return; const q = Q[(n + 1) % Q.length]; ctx.moveTo(...p); ctx.lineTo(...q); }); }
        ctx.stroke(); }
      ctx.restore();
      pathS(P); ctx.strokeStyle = 'rgba(38,28,16,.55)'; ctx.lineWidth = lw(.06); ctx.stroke();       // arête du gradin
    });
    // veines de minerai dans les parois : fer (rouille) et argile, en traînées obliques
    if (s > 1.2) { ctx.lineCap = 'round';
      // (chaque veine suit une strate : un arc du contour, à mi-hauteur d'une paroi)
      for (const [col, n, wd] of [['rgba(142,66,42,.75)', 6, .14], ['rgba(190,122,80,.7)', 4, .12]]) { ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, wd * s); ctx.beginPath();
        for (let k = 0; k < n; k++) { const i = Math.floor(rnd() * 4), kk = (K[i] + K[i + 1]) / 2 + .02, C = level(kk, (off[i][0] + off[i + 1][0]) / 2, (off[i][1] + off[i + 1][1]) / 2), n0 = Math.floor(rnd() * 40), len = 3 + Math.floor(rnd() * 4);
          for (let j = 0; j <= len; j++) { const p = C[(n0 + j) % 40]; j ? ctx.lineTo(...LP(h, ...p)) : ctx.moveTo(...LP(h, ...p)); } }
        ctx.stroke(); }
      ctx.lineCap = 'butt'; }
    // fond : flaque, puits boisé (cadre de rondins croisés aux angles), treuil
    const bu = cu + .5, bt = ct + .3;
    { const P = []; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; P.push([bu + 1.15 + Math.cos(a) * .55 * (1 + .2 * Math.sin(a * 3)), bt + .55 + Math.sin(a) * .32]); } pathS(lpts(h, P)); ctx.fillStyle = 'rgba(92,120,122,.75)'; ctx.fill(); }
    pathS(lpts(h, [[bu - .55, bt - .55], [bu + .55, bt - .55], [bu + .55, bt + .55], [bu - .55, bt + .55]])); ctx.fillStyle = '#120d09'; ctx.fill();
    for (const [a, b] of [[[bu - .85, bt - .75], [bu + .85, bt - .55]], [[bu - .85, bt + .55], [bu + .85, bt + .75]], [[bu - .75, bt - .85], [bu - .55, bt + .85]], [[bu + .55, bt - .85], [bu + .75, bt + .85]]]) beamLT(h, a[0], a[1], b[0], b[1]);
    windlassLT(h, bu, bt, 2);
    // sur les gradins : pic, étais
    if (s > 1.8) { ctx.strokeStyle = '#8a6a45'; ctx.lineWidth = lw(.07); ctx.beginPath(); ctx.moveTo(...LP(h, cu + 2.4, ct + 1.9)); ctx.lineTo(...LP(h, cu + 3.2, ct + 2.3)); ctx.stroke();
      ctx.strokeStyle = '#4c5053'; ctx.lineWidth = lw(.08); ctx.beginPath(); ctx.moveTo(...LP(h, cu + 3.05, ct + 1.95)); ctx.lineTo(...LP(h, cu + 3.35, ct + 2.6)); ctx.stroke(); } // pic
    for (const [u, t] of [[cu - 3.6, ct + 1.2], [cu + 3.9, ct - 1.4]]) beamLT(h, u - .12, t - .12, u + .12, t + .12); // étais
    // alentours
    heapLT(h, -5.6, 2.3, 1.4, 1, '#8a4a32', '#a55c3e');                                          // minerai de fer
    heapLT(h, 5.8, 2.4, 1.3, .95, '#b0704a', '#c98a5e');                                         // argile
    heapLT(h, -6, 13.9, 1.3, 1.4, '#8d7d66', '#a29279');                                         // déblais
    barrowLT(h, -3.2, 1.2, -.4, '#8a4a32');
    beamStackLT(h, -3.4, 14.2, .6, 3, .3);
    thatchLT(h, 3.4, 13, 7.3, 15.5, 'u', OLD_STRAW);
  },
  /* Ferme (3 × 3 cases) : cour de ferme close d'un plessis ; logis de chaume sur la rue, grande
     grange au fond et étable en bardeaux ; meules de foin, fumier, charrette de foin, auge,
     soue à cochons, poules */
  ferme: h => {
    const w2 = h.w / 2, L = h.l, s = view.s, rnd = seeded(Math.round(h.x * 7 + h.y * 3) + 5);
    groundLT(h, -w2 + .3, .3, w2 - .3, L - .3, WOOD.yard, WOOD.speck, 1);
    groundLT(h, -11, 9.6, -6.8, 14.2, '#8f7a5a', null, .3);                                       // soue boueuse
    pensLT(h, [[[-11, 9.6], [-6.8, 9.6]], [[-6.8, 9.6], [-6.8, 14.2]], [[-6.8, 14.2], [-11, 14.2]], [[-11, 14.2], [-11, 9.6]]]);
    pigLT(h, -9.6, 11.2, .6); pigLT(h, -8.2, 12.8, 2.8);
    heapLT(h, 3.2, 12.2, 1.6, 1.1, '#5e4a33', '#735c40');                                        // fumier
    waterTroughLT(h, -5.6, 10.6, -3.2, 11.3);
    for (let k = 0; k < 7; k++) henLT(h, -2 + rnd() * 4.4, 9.8 + rnd() * 3.6, rnd() * 6.3, ['#efe9dc', '#a9683a', '#5b4432'][k % 3]);
    stackLT(h, 7.6, 4.4, 2); stackLT(h, 9.6, 9.4, 1.6);
    wattleLT(h, -w2 + .25, .25, w2 - .25, L - .25, 1.6, 5);
    hayCartLT(h, 3.3, 2.6);
    gableLT(h, 7, 14.6, 11.4, 23.2, 't');                                                         // étable
    thatchLT(h, -11.2, 15.2, 6.6, 23.2, 'u', OLD_STRAW);                                          // grange
    thatchLT(h, -11.2, 1.4, .8, 8.4, 'u', STRAW);                                                 // logis
    chimneyLT(h, -9.6, 4.9, .55);
  },
  /* Bergerie (2 × 3 cases) : longue bergerie de chaume sur la rue ; derrière, le parc clos de
     claies tressées : moutons, râtelier à foin, abreuvoir, litière */
  bergerie: h => {
    const w2 = h.w / 2, L = h.l, rnd = seeded(Math.round(h.x * 3 + h.y * 13) + 7);
    groundLT(h, -w2 + .3, .3, w2 - .3, 10, WOOD.yard, WOOD.speck, .6);
    groundLT(h, -w2 + .4, 9.6, w2 - .4, L - .3, '#a9a878', null, .5);                            // parc brouté
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
    groundLT(h, -7.6, .4, 7.6, L - .4, '#bdb78a', null, 1.4);                                    // pré
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
    groundLT(h, -w2 + .3, .3, w2 - .3, L - .3, WOOD.yard, WOOD.speck, 1);
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
    groundLT(h, -w2 + .3, .3, w2 - .3, L - .3, WOOD.yard, WOOD.speck, 1);
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
    groundLT(h, -w2 + .3, .3, w2 - .3, L - .3, '#c8bfa9', '#b1a791', .6);
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
    groundLT(h, -w2 + .3, .3, w2 - .3, L - .3, WOOD.yard, WOOD.speck, 1);
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
    groundLT(h, -3.6, .4, 3.6, L - .4, '#b8a37c', '#a08b66', 1.8);
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
    groundLT(h, -w2 + .3, .3, w2 - .3, L - .3, '#c6b791', '#ae9e79', 1);
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
    const w2 = h.w / 2, L = h.l, rnd = seeded(Math.round(h.x * 9 + h.y * 7) + 3);
    groundLT(h, -w2 + .3, .3, w2 - .3, L - .3, '#b8a47e', '#9c8762', 1);
    groundLT(h, -11.4, 1, -.8, 12.8, '#a9a878', null, .4); groundLT(h, .8, 1, 11.4, 12.8, '#a9a878', null, .4);
    groundLT(h, .8, 14, 11.4, 23.2, '#8f7a5a', null, .4);
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
