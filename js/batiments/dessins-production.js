/* ---------- dessins des ateliers du plan de production (DOMINIUM) ----------
   Vue de dessus, peu de détails : chaque atelier a sa silhouette (toit, matière, outils) pour qu'on le reconnaisse d'un coup d'œil. Repère du bâtiment : u = en travers (de -w/2 à w/2), t = en profondeur depuis la rue (de 0 à l).
   Ce fichier ajoute les 19 nouveaux bâtiments et reprend les ateliers existants (fonderie [qui intègre l’ancienne forge], couture [qui intègre l’ancienne cordonnerie], brasserie), qui se ressemblaient trop. Chargé après dessins.js. */

// toits : tuile rouge, bardeau clair, ardoise sombre, pierre claire (lauze)
const TUILE = { hi:'#cdae7a', lo:'#8e6e42', mid:'#ae8b58', line:'rgba(60,40,20,.42)', ridge:'#6f512e' };                  // bardeau de bois doré (ex-tuile)
const BARDEAU = { hi:'#bfae8c', lo:'#8c7d5f', mid:'#a69673', line:'rgba(60,48,30,.4)', ridge:'#6f6247' };
const ARDOISE_SOMBRE = { hi:'#8c6a48', lo:'#4e3524', mid:'#6a4a32', line:'rgba(20,12,6,.5)', ridge:'#3a2616' };      // bois dur sombre (ex-ardoise)
const BRUN = { hi:'#a87a56', lo:'#6e4528', mid:'#8a5c3c', line:'rgba(40,22,10,.45)', ridge:'#4e2f1a' };                // bois brun foncé
const BLEU = { hi:'#aaa28c', lo:'#6f6757', mid:'#8a826f', line:'rgba(40,34,24,.42)', ridge:'#575040' };                   // bardeau patiné gris (ex-ardoise bleutée)
const VERT = { hi:'#b49a74', lo:'#7a6445', mid:'#98805c', line:'rgba(50,38,22,.42)', ridge:'#5e4a30' };                // bardeau de bois foncé
const LAUZE = { hi:'#cdbf9c', lo:'#9a8a68', mid:'#b5a582', line:'rgba(60,50,32,.4)', ridge:'#7f7152' };                // bardeau clair (ex-lauze)

// petites formes communes
const sol = (h, u0, t0, u1, t1, col) => { pathS(lpts(h, [[u0, t0], [u1, t0], [u1, t1], [u0, t1]])); ctx.fillStyle = col; ctx.fill(); };            // dalle ou bassin à plat
const disque = (h, cu, ct, r, col, bord) => {
  const s = view.s, [X, Y] = LP(h, cu, ct), R = Math.max(1.5, r * s);
  ctx.beginPath(); ctx.arc(X + r * .3 * s * SHADOW_K, Y + r * .4 * s * SHADOW_K, R, 0, Math.PI * 2); ctx.fillStyle = WOOD.shadow; ctx.fill();
  ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = bord || WOOD.edge; ctx.lineWidth = lw(.06); ctx.stroke();
};
const allee = (h, col) => sol(h, -2.6, .4, 2.6, 5.6, col || '#b3aa96');                                                                             // allée de terre battue devant l'atelier
const BORD = '#7a6a4e', BOUE = '#8a7b60';

Object.assign(BUILD_DRAW, {
  /* ====== atelier existant repris : plus de détails qui les distinguent ====== */
  fonderie: h => {                                                    // fonderie 3 × 3 (avec la forge et le bas fourneau) : palissade à portail, allée ; à gauche la FORGE (enclume, bac de trempe, lingots) et le BAS FOURNEAU d'argile (loupe de fer, scories) ; à droite le grand four de pierre, minerais et charbon ; l'atelier de bois dur au fond
    const L = h.l, s = view.s;
    wattleLT(h, -11.6, .4, 11.6, L - .4, -1.8, 1.8);
    pathS(lpts(h, [[-1.2, .3], [1.2, .3], [1.2, 13.6], [-1.2, 13.6]])); ctx.fillStyle = 'rgba(150,126,86,.5)'; ctx.fill();                                // allée du portail à l'atelier
    anvilLT(h, -8.4, 3.8); waterTroughLT(h, -6.6, 3.2, -4.8, 4.4); beamLT(h, -10.8, 3.2, -9.6, 4.4); blockLT(h, -10.7, 3.3, -9.7, 4.3, false);        // la forge : enclume, bac de trempe, billot
    for (const [u, t] of [[-8.6, 6.4], [-7.4, 6.4], [-8, 7.1]]) blockLT(h, u - .5, t - .3, u + .5, t + .3, false);                                    // lingots empilés
    { const [X, Y] = LP(h, -7.4, 10.4), R = 1.5 * s;                                                                                              // le bas fourneau : tour d'argile, gueule noire, loupe
      ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2); ctx.fillStyle = '#b47c55'; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.1); ctx.stroke();
      ctx.beginPath(); ctx.arc(X - R * .1, Y - R * .12, R * .72, 0, Math.PI * 2); ctx.fillStyle = '#cf9a6e'; ctx.fill(); ctx.beginPath(); ctx.arc(X, Y, R * .42, 0, Math.PI * 2); ctx.fillStyle = '#1c1612'; ctx.fill(); }
    heapLT(h, -9.9, 12, 1.1, .85, '#4a4540', '#6a645c'); heapLT(h, -4.6, 11.2, 1, .8, '#8a5a3a', '#a8714b');                                       // scories, minerai de fer
    { const [X, Y] = LP(h, 7, 7.2), R = 2.2 * s;                                                                                                   // le grand four de fonderie : pierre, gueule noire, braise
      ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2); ctx.fillStyle = STONE.mid; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.1); ctx.stroke();
      ctx.beginPath(); ctx.arc(X - R * .1, Y - R * .12, R * .8, 0, Math.PI * 2); ctx.fillStyle = STONE.hi; ctx.fill();
      ctx.beginPath(); ctx.arc(X, Y, R * .5, 0, Math.PI * 2); ctx.fillStyle = '#1c1612'; ctx.fill(); ctx.beginPath(); ctx.arc(X, Y, R * .3, 0, Math.PI * 2); ctx.fillStyle = '#e0702a'; ctx.fill(); ctx.beginPath(); ctx.arc(X - R * .05, Y - R * .05, R * .14, 0, Math.PI * 2); ctx.fillStyle = '#f7c050'; ctx.fill(); }
    heapLT(h, 4.6, 2.8, 1.5, 1.1, '#8a5a3a', '#a8714b'); heapLT(h, 7.6, 3, 1.2, .9, '#5c5a58', '#7a7876'); heapLT(h, 9.4, 11.4, 1.2, .95, '#2b2622', '#3d3631');   // minerais (fer, étain) et charbon
    crateLT(h, 3.6, 11, .5); barrelLT(h, 4.6, 11.4, .42);
    hipLT(h, -9.4, 13.8, 9.4, 22.8, HARDWOOD); chimneyLT(h, -5.6, 17.6, .9); chimneyLT(h, 0, 17.6, .9); chimneyLT(h, 5.6, 17.6, .9);                    // l'atelier, toit de bois dur
  },
  couture: h => {                                                     // atelier de tailleur (avec l'ex-cordonnerie), propre et rangé : palissade à portail, allée, atelier de chaume au fond, étoffes qui sèchent à gauche, peaux tendues à droite, table de coupe et balles de laine au centre
    const w2 = h.w / 2, L = h.l;
    wattleLT(h, -7.6, .4, 7.6, L - .4, -1.6, 1.6);
    pathS(lpts(h, [[-1.2, .3], [1.2, .3], [1.2, 9.4], [-1.2, 9.4]])); ctx.fillStyle = 'rgba(150,126,86,.5)'; ctx.fill();                                // allée du portail à l'atelier
    clothLineLT(h, -7, -1.8, 2.4, ['#b0392f', '#3b5ba6', '#d6c7a0', '#5d7a3f']);                                                                       // étoffes qui sèchent, à gauche
    hideFrameLT(h, 3.4, 2.8, .8); hideFrameLT(h, 5.8, 2.8, .8);                                                                                         // peaux tendues, à droite
    tableLT(h, -3.4, 6.4, 3.2, false);                                                                                                                  // table de coupe
    sackLT(h, 4.4, 6.2, .55, '#e6dcc6'); sackLT(h, 5.4, 6.8, .5, '#e6dcc6'); sackLT(h, 6.4, 6.2, .55, '#e6dcc6');                                      // balles de laine
    barrelLT(h, 3.2, 7.4, .42); basketLT(h, -6.4, 7.6, .45, ['#d8c9a0', '#efe6c8']);
    thatchLT(h, -6.4, 10, 6.4, 15.2, 'u', OLD_STRAW); chimneyLT(h, 3.4, 12.2, .5);                                                                      // l'atelier, toit de chaume
  },
  brasserie: h => {                                                   // brasserie lisible comme une chaîne, de l'entrée vers le fond : grain en sacs et en tas (à gauche), séchage du malt (à droite), cuve de maische et chaudron de cuivre sur son feu, tonneaux de fermentation, puis la brasserie et son enseigne (une chope)
    const L = h.l, s = view.s;
    wattleLT(h, -7.6, .4, 7.6, L - .4, -1.6, 1.6);
    pathS(lpts(h, [[-1.2, .3], [1.2, .3], [1.2, 13.4], [-1.2, 13.4]])); ctx.fillStyle = 'rgba(150,126,86,.5)'; ctx.fill();                                // allée du portail à la porte
    // 1. le grain : sacs et tas d'orge
    for (const [u, t] of [[-6.4, 2.4], [-5.3, 3.2], [-6.3, 4.1]]) sackLT(h, u, t, .5, '#e6dcc6'); heapLT(h, -3.4, 3, 1.2, .95, '#d9b84a', '#efd27a');
    // 2. le séchage du malt : un carré de grain étalé
    sol(h, 2.4, 1.4, 6.8, 5.4, '#dcc47c'); if (s > 2) { ctx.fillStyle = 'rgba(150,110,40,.5)'; for (let k = 0; k < 60; k++) { const [X, Y] = LP(h, 2.6 + (k * 37 % 41) / 10, 1.6 + (k * 23 % 37) / 10); ctx.fillRect(X, Y, Math.max(1, .1 * s), Math.max(1, .08 * s)); } }
    ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.1); pathS(lpts(h, [[2.4, 1.4], [6.8, 1.4], [6.8, 5.4], [2.4, 5.4]])); ctx.stroke();
    // 3. le brassage : cuve de maische en bois avec sa pagaie, chaudron de cuivre sur son feu
    disque(h, -4.2, 8.8, 1.5, '#8a6240', '#4a321c'); disque(h, -4.2, 8.8, 1.1, '#d9c58a', '#8a7440'); beamLT(h, -5.8, 8.7, -2.8, 8.9);
    firePitLT(h, 4.2, 8.8, 1.2); disque(h, 4.2, 8.8, 1.4, '#b87333', '#6e3f17'); disque(h, 4, 8.6, .9, '#d9964a');
    // 4. la fermentation : deux rangées de tonneaux
    for (const u of [-6.8, -5.7, -4.6, -3.5, 3.5, 4.6, 5.7, 6.8]) barrelLT(h, u, 11.6, .45);
    // 5. la brasserie, avec une chope en enseigne à côté de la porte
    hipLT(h, -6.8, 13.4, 6.8, 22.8, TUILE); chimneyLT(h, 4, 17.2, 1);
    beamLT(h, -2.6, 12.4, -2.35, 13.4); disque(h, -2.1, 12.9, .5, '#e6c250', '#8a6a1a'); disque(h, -2.1, 12.9, .3, '#fff3c4');
  },

  /* ====== les 19 nouveaux ====== */
  glaisiere: h => {                                                   // glaisière soignée : palissade à portail, grande fosse d'argile en terrasses (ocre, orange, argile mouillée) avec sa flaque et son passage de planches, bassin de décantation, briques d'argile qui sèchent en rangs, tas d'argile et de sable, abri de chaume
    const s = view.s, rnd = seeded(Math.round(sid(h) * 5 + 41));
    wattleLT(h, -7.6, .4, 7.6, h.l - .4, -1.6, 1.6);
    pathS(lpts(h, [[-1.2, .3], [1.2, .3], [1.2, 6.8], [-1.2, 6.8]])); ctx.fillStyle = 'rgba(150,126,86,.5)'; ctx.fill();                                // allée du portail à la fosse
    const cu = -2.4, ct = 6.8, rx = 3.5, ry = 2.8, P = []; for (let i = 0; i < 30; i++) { const an = i / 30 * Math.PI * 2, k = 1 + .08 * Math.sin(an * 3 + 1) + .04 * Math.sin(an * 5); P.push([cu + Math.cos(an) * rx * k, ct + Math.sin(an) * ry * k]); }
    const terr = (k, col, ed) => { pathS(lpts(h, P.map(([u, t]) => [cu + (u - cu) * k, ct + (t - ct) * k]))); ctx.fillStyle = col; ctx.fill(); if (ed) { ctx.strokeStyle = ed; ctx.lineWidth = lw(.08); ctx.stroke(); } };
    terr(1.14, '#9aa05e', null); terr(1, '#c49a62', '#6a4a2a'); terr(.78, '#a9703c', '#6a4a2a'); terr(.54, '#7a4f30', '#4a3022');                  // lèvre d'herbe, terrasses d'argile du clair au foncé
    { const [X, Y] = LP(h, cu - .3, ct + .1); ctx.beginPath(); ctx.ellipse(X, Y, 1 * s, .6 * s, 0, 0, Math.PI * 2); ctx.fillStyle = '#7f98a0'; ctx.fill(); ctx.strokeStyle = '#3e555c'; ctx.lineWidth = lw(.05); ctx.stroke(); ctx.beginPath(); ctx.ellipse(X - .25 * s, Y - .15 * s, .4 * s, .2 * s, 0, 0, Math.PI * 2); ctx.fillStyle = '#a8bcc2'; ctx.fill(); }   // la flaque
    beamLT(h, -.5, 6.2, .9, 7.4);                                                                          // passage de planches du bord vers la fosse
    sol(h, 3.2, 5.4, 6.8, 9, '#c9a578'); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.12); pathS(lpts(h, [[3.2, 5.4], [6.8, 5.4], [6.8, 9], [3.2, 9]])); ctx.stroke();   // bassin de décantation, bordé de bois
    if (s > 2) { ctx.strokeStyle = 'rgba(120,90,50,.45)'; ctx.lineWidth = 1; ctx.beginPath(); for (let y = 6; y < 8.8; y += .7) { ctx.moveTo(...LP(h, 3.5, y)); ctx.lineTo(...LP(h, 6.5, y + .15)); } ctx.stroke(); }
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) { const u = 3.1 + k * 1.05, t = 1.5 + r * .8; pathS(lpts(h, [[u, t], [u + .8, t], [u + .8, t + .55], [u, t + .55]])); ctx.fillStyle = '#c08a5a'; ctx.fill(); ctx.strokeStyle = '#7a4c28'; ctx.lineWidth = 1; ctx.stroke(); }   // briques d'argile qui sèchent, en rangs
    heapLT(h, 5.2, 11.8, 1.4, 1.1, '#b98a5e', '#d1a074'); heapLT(h, -5.2, 11.8, 1.4, 1.1, '#d8c690', '#eadcab');                                          // tas d'argile et de sable
    barrowLT(h, -2.2, 10.4, -.3, '#a9825c');
    thatchLT(h, -2.2, 11.4, 2.2, 15.2, 'u', OLD_STRAW);                                                                                                  // l'abri
  },
  marais_salant: h => {                                                // marais salant lisible : palissade à portail, chenal d'eau de mer franchi par un pont de planches, allée centrale entre deux rangées de bassins dont l'eau s'éclaircit jusqu'au sel blanc (eau de mer → saumure → sel), tas de sel, cabane de chaume, brouette
    wattleLT(h, -11.6, .4, 11.6, h.l - .4, -1.8, 1.8);
    sol(h, -11.2, .8, 11.2, 2, '#7fa6b5'); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.08); pathS(lpts(h, [[-11.2, .8], [11.2, .8], [11.2, 2], [-11.2, 2]])); ctx.stroke();   // le chenal d'eau de mer
    for (const k of [0, 1, 2, 3]) beamLT(h, -1.4, .5 + k * .4, 1.4, .8 + k * .4);                                                                   // pont de planches sur le chenal, dans l'axe du portail
    pathS(lpts(h, [[-1.2, 2], [1.2, 2], [1.2, 12.2], [-1.2, 12.2]])); ctx.fillStyle = 'rgba(150,126,86,.5)'; ctx.fill();                              // allée centrale
    const eaux = ['#a9bcc4', '#cfdbd8', '#f0f2ef'];                                                                                                  // du bassin d'eau de mer au bassin de sel
    for (const [u0, u1] of [[-10.6, -6.8], [-6.4, -2.6], [2.6, 6.4], [6.8, 10.6]]) eaux.forEach((c, r) => { const t = 2.8 + r * 3; sol(h, u0, t, u1, t + 2.6, BOUE); sol(h, u0 + .3, t + .3, u1 - .3, t + 2.3, c); });
    for (const [u, t] of [[-4.6, 13.8], [-1.8, 13.8]]) heapLT(h, u, t, 1.2, .9, '#eef0ec', '#ffffff');                                                // tas de sel
    for (const u of [3.4, 6.2, 9]) heapLT(h, u, 13.8, 1.2, .9, '#eef0ec', '#ffffff');
    thatchLT(h, -10.4, 12.6, -6.4, 15.2, 'u', OLD_STRAW); barrowLT(h, -8.4, 11.4, 0, '#eef0ec');                                                    // la cabane du saunier et sa brouette
  },
  pressoir: h => {                                                    // pressoir lisible de l'entrée vers le fond : paniers de fruits alignés (raisin, pommes, olives, noix), grande presse à vis à gauche, cuve de moût à droite, rangée de tonneaux, grange de bardeaux
    wattleLT(h, -7.6, .4, 7.6, h.l - .4, -1.6, 1.6);
    pathS(lpts(h, [[-1.2, .3], [1.2, .3], [1.2, 13.2], [-1.2, 13.2]])); ctx.fillStyle = 'rgba(150,126,86,.5)'; ctx.fill();                                // allée du portail à la grange
    for (const [u, c] of [[-5.8, ['#6b2f4a', '#8a3a56']], [-3.8, ['#c4573a', '#d9744f']], [3.8, ['#6f7a3a', '#8f9a52']], [5.8, ['#8a6a3a', '#a8864e']]]) basketLT(h, u, 3.4, .7, c);   // paniers : raisin, pommes, olives, noix
    beamLT(h, -6.2, 6.2, -1.6, 10.6); disque(h, -3.9, 8.4, 1.5, '#9c7a45', '#4e3a22'); beamLT(h, -5.8, 8.2, -2, 8.6); disque(h, -3.9, 8.4, .45, '#4e3a22', '#2a1f14');   // la presse : plateau, plaque de pressage, vis et barre
    disque(h, 3.9, 8.4, 2.1, '#8a6240', '#4a321c'); disque(h, 3.9, 8.4, 1.6, '#6b2a3a', '#3e1822');                                                      // la cuve de moût
    for (let k = 0; k < 6; k++) barrelLT(h, -5.6 + k * 2.24, 12, .5);                                                                                     // tonneaux alignés
    gableLT(h, -6.6, 13.6, 6.6, 22.8, 'u');                                                                                                               // la grange du pressoir
  },
  boucherie: h => {                                                   // boucherie lisible : palissade à portail, allée ; à gauche la grande table de découpe avec ses morceaux de viande et le billot ; à droite les peaux tendues, le tas d'os, le bac d'eau et les tonneaux de graisse ; la boucherie au fond
    const s = view.s;
    wattleLT(h, -7.6, .4, 7.6, h.l - .4, -1.6, 1.6);
    pathS(lpts(h, [[-1.2, .3], [1.2, .3], [1.2, 9.8], [-1.2, 9.8]])); ctx.fillStyle = 'rgba(150,126,86,.5)'; ctx.fill();                                // allée du portail à la boucherie
    beamLT(h, -6.8, 3.4, -2, 5.4);                                                                                                                       // la table de découpe
    bete(h, 'cochon', -4.6, 4.4, 0);                                                                                                        // une carcasse (un porc entier) déposée sur la table
    if (s > 1.8) for (const [u, t, c] of [[-6.2, 3.9, '#a8453a'], [-6.1, 4.9, '#e8dcc0'], [-2.7, 3.9, '#a8453a'], [-2.6, 4.9, '#a8453a']]) { const [X, Y] = LP(h, u, t); ctx.beginPath(); ctx.ellipse(X, Y, .24 * s, .16 * s, 0, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = '#4a1f18'; ctx.lineWidth = 1; ctx.stroke(); }   // quelques morceaux déjà découpés aux deux bouts
    disque(h, -4.4, 7.6, .75, '#a67c4e', '#5a3d20'); disque(h, -4.4, 7.6, .5, '#c49a62');                                                               // le billot
    hideFrameLT(h, 3.2, 4.4, .8); hideFrameLT(h, 5.6, 4.4, .8);                                                                                          // peaux tendues
    heapLT(h, 3.2, 7.8, 1.1, .85, '#d8cdb4', '#efe6d0');                                                                                                  // tas d'os
    troughLT(h, 4.6, 7, 6.8, 8.2, '#5a7f8f'); barrelLT(h, 2.6, 2, .45); barrelLT(h, 6.6, 2, .45);                                                       // bac d'eau, tonneaux de graisse
    hipLT(h, -6, 10.2, 6, 15.2, TUILE); chimneyLT(h, 3.2, 12.6, .5);                                                                                    // la boucherie
  },
  saloir_fumoir: h => {                                                // saloir-fumoir lisible : palissade à portail, allée ; à gauche le SALAGE (sel en sacs et en tas, tonneaux de saumure alignés) ; à droite le SÉCHAGE (deux claies, poisson puis viande) ; au fond le FUMOIR de chaume à grande cheminée qui fume
    const s = view.s;
    wattleLT(h, -7.6, .4, 7.6, h.l - .4, -1.6, 1.6);
    pathS(lpts(h, [[-1.2, .3], [1.2, .3], [1.2, 9.8], [-1.2, 9.8]])); ctx.fillStyle = 'rgba(150,126,86,.5)'; ctx.fill();                                // allée du portail au fumoir
    for (let k = 0; k < 3; k++) sackLT(h, -6.4 + k * 1.2, 2.4, .45, '#eceae0'); heapLT(h, -2.3, 2.8, .8, .65, '#eef0ec', '#ffffff');                       // le sel : sacs alignés et petit tas
    for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) barrelLT(h, -6 + k * 1.7, 5.6 + r * 1.5, .5);                                              // les tonneaux de saumure, en deux rangs de trois
    const claie = (t0, cols) => { beamLT(h, 2.4, t0, 6.8, t0 + .2); beamLT(h, 2.4, t0 + 1.4, 6.8, t0 + 1.6); if (s > 1.6) for (let k = 0; k < 5; k++) { const [X, Y] = LP(h, 2.9 + k * .85, t0 + .8); ctx.beginPath(); ctx.ellipse(X, Y, .3 * s, .17 * s, 0, 0, Math.PI * 2); ctx.fillStyle = cols[k % 2]; ctx.fill(); ctx.strokeStyle = 'rgba(60,30,20,.6)'; ctx.lineWidth = 1; ctx.stroke(); } };
    claie(2.4, ['#c98a6a', '#d6a37e']); claie(5.6, ['#a8453a', '#8a3a2e']);                                                                            // deux claies de séchage : poisson, puis viande
    thatchLT(h, -4.8, 10.2, 4.8, 15.2, 'u', OLD_STRAW); chimneyLT(h, 0, 12.6, 1.3);                                                                  // le fumoir
    if (s > 1.2) { const [X, Y] = LP(h, 0, 12.6); ctx.fillStyle = 'rgba(130,130,130,.28)'; for (const [dx, dy, r] of [[.5, -.6, 1.1], [1.4, -1.5, 1.3], [2.5, -2.4, 1.5]]) { ctx.beginPath(); ctx.arc(X + dx * s, Y + dy * s, r * s, 0, Math.PI * 2); ctx.fill(); } }   // la fumée
  },
  chandellerie_savonnerie: h => {                                      // chandellerie-savonnerie lisible : palissade à portail, allée ; à gauche la CHANDELLE (chaudron de suif sur son feu, claie de chandelles, tas de cire) ; à droite le SAVON (barres de savon alignées, tonneaux de potasse) ; l'atelier de chaume au fond
    const s = view.s;
    wattleLT(h, -7.6, .4, 7.6, h.l - .4, -1.6, 1.6);
    pathS(lpts(h, [[-1.2, .3], [1.2, .3], [1.2, 9.8], [-1.2, 9.8]])); ctx.fillStyle = 'rgba(150,126,86,.5)'; ctx.fill();                                // allée du portail à l'atelier
    firePitLT(h, -4.8, 3.4, 1.1); disque(h, -4.8, 3.4, 1.2, '#2e2a28', '#111'); disque(h, -4.8, 3.4, .8, '#e8dcaa', '#8a7a4a');                          // le chaudron de suif sur son feu
    beamLT(h, -7, 6, -2.4, 6.2); beamLT(h, -7, 7.6, -2.4, 7.8);                                                                                          // la claie de chandelles
    if (s > 1.6) for (let k = 0; k < 6; k++) { const [X, Y] = LP(h, -6.5 + k * .8, 6.9); ctx.beginPath(); ctx.ellipse(X, Y, .13 * s, .45 * s, 0, 0, Math.PI * 2); ctx.fillStyle = k % 2 ? '#f2e8c0' : '#fff5d2'; ctx.fill(); ctx.strokeStyle = 'rgba(100,80,40,.6)'; ctx.lineWidth = 1; ctx.stroke(); }
    heapLT(h, -6, 9.2, .9, .65, '#d9b84a', '#ecd57a');                                                                                                   // la cire d'abeille
    for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) { const u = 2.6 + k * 1.1, t = 2.4 + r * .8; pathS(lpts(h, [[u, t], [u + .9, t], [u + .9, t + .6], [u, t + .6]])); ctx.fillStyle = r ? '#cfd9b0' : '#efe8cc'; ctx.fill(); ctx.strokeStyle = '#7a7a52'; ctx.lineWidth = 1; ctx.stroke(); }   // barres de savon alignées : blanc et vert
    barrelLT(h, 3.2, 6.6, .5); barrelLT(h, 4.8, 6.6, .5); barrelLT(h, 6.4, 6.6, .5);                                                                    // la potasse
    thatchLT(h, -6.2, 10.2, 6.2, 15.2, 'u', OLD_STRAW); chimneyLT(h, 3.4, 12.6, .7);                                                                    // l'atelier
  },
  orfevre: h => {                                                     // orfèvre, disposition propre : la BOUTIQUE donne sur la rue (à droite, avec son étal de bijoux devant), le portail est sur le côté gauche et son allée longe le mur jusqu'à l'ATELIER, une cour de travail au fond (four d'argile, creuset, établi, enclume, lingots)
    const s = view.s;
    wattleLT(h, -7.6, .4, 7.6, h.l - .4, -6.4, -3.6);                                                                                                    // portail à gauche, pas au centre
    pathS(lpts(h, [[-6.2, .3], [-3.8, .3], [-3.8, 9.8], [-6.2, 9.8]])); ctx.fillStyle = 'rgba(150,126,86,.5)'; ctx.fill();                              // l'allée longe le mur gauche
    hipLT(h, -2.4, 3.2, 7.2, 8.6, BLEU); chimneyLT(h, 4.6, 5.6, .5);                                                                                     // la boutique, côté rue
    pathS(lpts(h, [[-3.4, 5], [-2.4, 5], [-2.4, 5.8], [-3.4, 5.8]])); ctx.fillStyle = WOOD.stone; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.05); ctx.stroke();   // son seuil, sur l'allée
    beamLT(h, -1.8, 1.2, 6.6, 2.6); for (let k = 0; k < 8; k++) { const [X, Y] = LP(h, -1.2 + k * 1, 1.9); ctx.beginPath(); ctx.arc(X, Y, Math.max(1, .24 * s), 0, Math.PI * 2); ctx.fillStyle = ['#d9b84a', '#cfd4d6', '#d98a2a'][k % 3]; ctx.fill(); ctx.strokeStyle = '#4a3a1a'; ctx.lineWidth = 1; ctx.stroke(); }   // l'étal de bijoux, devant la boutique : or, argent, ambre
    { const [X, Y] = LP(h, -5, 11.8), R = 1.2 * s; ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2); ctx.fillStyle = '#b47c55'; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.08); ctx.stroke(); ctx.beginPath(); ctx.arc(X, Y, R * .5, 0, Math.PI * 2); ctx.fillStyle = '#1c1612'; ctx.fill(); ctx.beginPath(); ctx.arc(X, Y, R * .3, 0, Math.PI * 2); ctx.fillStyle = '#e0702a'; ctx.fill(); }   // le four d'argile, à braise
    disque(h, -3, 13.6, .45, '#d9b84a', '#8a6a1a');                                                                                                      // le creuset d'or
    beamLT(h, -1, 11, 5.8, 12.4); anvilLT(h, 1.4, 11.7);                                                                                                 // l'établi et l'enclume
    for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) { const u = 1.4 + k * 1.3, t = 13.6 + r * .9; pathS(lpts(h, [[u, t], [u + 1, t], [u + 1, t + .6], [u, t + .6]])); ctx.fillStyle = r ? '#cfd4d6' : '#d9b84a'; ctx.fill(); ctx.strokeStyle = '#4a3a1a'; ctx.lineWidth = 1; ctx.stroke(); }   // les lingots, alignés
  },
  tannerie: h => {                                                    // tannerie (24 × 24 m) : portail à droite, allée le long du mur ; au centre-gauche la GRILLE DES FOSSES, de la chaux blanche au tan brun (peaux → chaux → eau → écorce) ; à droite les peaux tendues sur cadres ; au fond le grand séchoir de chaume, les rouleaux de cuir et le tas d'écorce
    const s = view.s;
    wattleLT(h, -11.6, .4, 11.6, h.l - .4, 5.4, 8.6);
    pathS(lpts(h, [[5.6, .3], [8.4, .3], [8.4, 11], [5.6, 11]])); ctx.fillStyle = 'rgba(150,126,86,.5)'; ctx.fill();                                    // allée du portail, le long du mur droit
    [[-10.6, '#d4dccc'], [-6.2, '#8fa39a'], [-1.8, '#7a5030']].forEach(([u, c]) => [2.4, 6.4].forEach(t => { sol(h, u, t, u + 3.8, t + 3.4, '#6b4a2e'); sol(h, u + .3, t + .3, u + 3.5, t + 3.1, c); }));   // les fosses : chaux, eau, tan
    for (const [u, t] of [[7, 13.4], [10, 13.4], [7, 17.4], [10, 17.4]]) hideFrameLT(h, u, t, 1);                                                          // peaux tendues sur cadres, alignées
    for (let k = 0; k < 4; k++) { const [X, Y] = LP(h, -10 + k * 1.3, 12.4); ctx.beginPath(); ctx.ellipse(X, Y, .5 * s, .4 * s, 0, 0, Math.PI * 2); ctx.fillStyle = '#9a6a3a'; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = 1; ctx.stroke(); }   // rouleaux de cuir
    heapLT(h, 4.6, 12.6, 1.4, 1.1, '#6b4f32', '#85663f');                                                                                                // le tas d'écorce à tan
    barrelLT(h, 3.2, 3.4, .4); barrelLT(h, 3.2, 4.6, .4); barrelLT(h, 3.2, 5.8, .4);                                                                     // tonneaux de tan, alignés contre les fosses
    for (let k = 0; k < 3; k++) sackLT(h, -10 + k * 1.2, 1.5, .4, '#e8e4da');                                                                            // sacs de chaux, alignés devant la fosse blanche
    clothLineLT(h, 5, 11, 15.2, ['#3b5ba6', '#b0392f', '#d6a52a', '#6a3a8a', '#e8e2c8']);                                                                // étoffes teintes qui sèchent (ex-teinturerie)
    for (const [u, col, bord] of [[5.4, '#3b5ba6', '#1f2f5a'], [7, '#b0392f', '#5a1a14'], [8.6, '#d6a52a', '#7a5a10'], [10.2, '#6a3a8a', '#321a46']]) disque(h, u, 20.6, .75, col, bord);   // les cuves de teinture : bleu, rouge, jaune, violet
    troughLT(h, 1.2, 19.6, 4.2, 22.4, '#8aa6b0');                                                                                                         // le bac de foulage
    thatchLT(h, -10.6, 15.4, -.6, 22.4, 'u', OLD_STRAW);                                                                                                 // le séchoir de chaume
  },
  corderie: h => {                                                    // corderie-tissage (16 × 32 m), disposition en longueur : portail à droite et allée le long du mur droit ; devant, le TISSAGE (métier à tisser à cadre, étoffes, sacs de laine) ; derrière, la CORDERIE : un long hangar à gauche et quatre cordes tendues le long de la piste, bottes de chanvre au départ, rouleaux de corde à l'arrivée
    const s = view.s;
    wattleLT(h, -7.6, .4, 7.6, h.l - .4, 4.4, 7.2);
    pathS(lpts(h, [[4.6, .3], [7, .3], [7, 12.6], [4.6, 12.6]])); ctx.fillStyle = 'rgba(150,126,86,.5)'; ctx.fill();                                    // allée du portail, le long du mur droit
    beamLT(h, -6.6, 2.6, -1.4, 3); beamLT(h, -6.6, 6.6, -1.4, 7); beamLT(h, -6.6, 2.6, -6.2, 7); beamLT(h, -1.8, 2.6, -1.4, 7);                          // le métier à tisser : cadre de bois
    if (s > 1.6) { ctx.strokeStyle = 'rgba(200,180,130,.9)'; ctx.lineWidth = 1; ctx.beginPath(); for (let u = -5.8; u < -2; u += .5) { ctx.moveTo(...LP(h, u, 3)); ctx.lineTo(...LP(h, u, 5.4)); } ctx.stroke(); }   // les fils de chaîne
    pathS(lpts(h, [[-5.9, 5.4], [-1.9, 5.4], [-1.9, 6.6], [-5.9, 6.6]])); ctx.fillStyle = '#c9b48a'; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.05); ctx.stroke();   // l'étoffe tissée
    for (let k = 0; k < 3; k++) sackLT(h, -6.4 + k * 1.2, 9.2, .5, '#e6dcc6');                                                                           // sacs de laine alignés
    for (let k = 0; k < 3; k++) { const [X, Y] = LP(h, -2 + k * 1.2, 9.2); ctx.beginPath(); ctx.ellipse(X, Y, .4 * s, .5 * s, 0, 0, Math.PI * 2); ctx.fillStyle = ['#c9b48a', '#8a6a4a', '#d6c7a0'][k]; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = 1; ctx.stroke(); }   // rouleaux d'étoffe
    thatchLT(h, -7.4, 13.6, -3.8, 30.4, 'u', STRAW);                                                                                                     // le long hangar de la corderie
    ctx.strokeStyle = '#a58a5a'; ctx.lineWidth = lw(.12); ctx.beginPath(); for (const u of [-1.4, -.2, 1, 2.2]) { ctx.moveTo(...LP(h, u, 14.4)); ctx.lineTo(...LP(h, u, 28.8)); } ctx.stroke();   // les cordes tendues
    for (const t of [14.4, 28.8]) for (const u of [-1.4, -.2, 1, 2.2]) disque(h, u, t, .2, '#6b4f32');
    for (let k = 0; k < 3; k++) stackLT(h, -1.6 + k * 1.6, 12.6, .6, STRAW);                                                                            // bottes de chanvre, au départ de la piste
    for (let k = 0; k < 2; k++) disque(h, -.4 + k * 1.8, 30.4, .75, '#a58a5a', '#6e5a38');                                                                // rouleaux de corde, à l'arrivée
  },
  four_chaux: h => {                                                  // four à chaux (portail à droite) : à gauche le CALCAIRE (tas et blocs alignés), au centre le FOUR en cône de pierre à gueule noire et braise, à droite la CHAUX VIVE (tas blancs, sacs alignés) et le bac de mortier ; fagots alignés pour la cuisson
    const s = view.s;
    wattleLT(h, -7.6, .4, 7.6, h.l - .4, 3.6, 6.4);
    pathS(lpts(h, [[3.6, .3], [6.4, .3], [6.4, 9.4], [3.6, 9.4]])); ctx.fillStyle = 'rgba(150,126,86,.5)'; ctx.fill();                                // allée du portail, côté droit
    heapLT(h, -5.2, 3, 1.5, 1.1, '#9a968c', '#b6b2a8'); for (let k = 0; k < 3; k++) blockLT(h, -6.8 + k * 1.5, 5.4, -5.6 + k * 1.5, 6.2, true);            // le calcaire : un tas et trois blocs alignés
    { const [X, Y] = LP(h, -1.6, 10.2), R = 2.9 * s; ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2); ctx.fillStyle = '#8f8a82'; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.1); ctx.stroke();
      ctx.beginPath(); ctx.arc(X - R * .1, Y - R * .12, R * .8, 0, Math.PI * 2); ctx.fillStyle = '#a8a398'; ctx.fill(); ctx.beginPath(); ctx.arc(X, Y, R * .45, 0, Math.PI * 2); ctx.fillStyle = '#2a2622'; ctx.fill(); ctx.beginPath(); ctx.arc(X, Y, R * .22, 0, Math.PI * 2); ctx.fillStyle = '#e0702a'; ctx.fill(); }   // le four : cône de pierre vu du haut, gueule et braise
    pathS(lpts(h, [[-2.3, 6.7], [-.9, 6.7], [-.9, 7.5], [-2.3, 7.5]])); ctx.fillStyle = '#1c1612'; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.05); ctx.stroke();   // l'enfournement, côté rue
    for (let k = 0; k < 3; k++) fagotLT(h, -6.8 + k * .8, 12.4, 2, 1.57);                                                                                  // fagots de cuisson, alignés
    heapLT(h, 2.8, 12.6, 1.2, .9, '#f2f0e6', '#ffffff'); heapLT(h, 6.2, 12.6, 1.2, .9, '#f2f0e6', '#ffffff');                                              // la chaux vive
    troughLT(h, .2, 2.6, 3, 4, '#cfcac0'); for (let k = 0; k < 3; k++) sackLT(h, 1 + k * 1, 6.6, .4, '#e8e4da');                                         // le bac de mortier, et trois sacs de chaux alignés
  },
  tuilerie_poterie: h => {                                            // tuilerie-poterie (24 × 16 m, portail à gauche) : colonne gauche l'ARGILE (tas, tour de potier), au centre les POTS qui sèchent en rangs puis le FOUR en dôme, à droite les TUILES qui sèchent en grille ; abri de chaume au fond
    const s = view.s;
    wattleLT(h, -11.6, .4, 11.6, h.l - .4, -10.4, -7.6);
    pathS(lpts(h, [[-10.2, .3], [-7.8, .3], [-7.8, 8], [-10.2, 8]])); ctx.fillStyle = 'rgba(150,126,86,.5)'; ctx.fill();                                // allée du portail, côté gauche
    heapLT(h, -10, 10, 1.3, 1, '#a8764f', '#c08e62'); disque(h, -6.6, 5.2, .9, '#8a6a46', '#4a321c'); disque(h, -6.6, 5.2, .35, '#c9a574', '#6a4a2a');      // l'argile, et le tour de potier
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) disque(h, -4 + k * 1.6, 2.4 + r * 1.6, .55, '#b3764a', '#6e4526');                              // les pots qui sèchent : trois rangs de quatre
    { const [X, Y] = LP(h, -.2, 9.6), R = 2.4 * s; ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2); ctx.fillStyle = '#b47c55'; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.1); ctx.stroke(); ctx.beginPath(); ctx.arc(X - R * .1, Y - R * .12, R * .72, 0, Math.PI * 2); ctx.fillStyle = '#cf9a6e'; ctx.fill(); }   // le four en dôme
    pathS(lpts(h, [[-.9, 7.1], [.5, 7.1], [.5, 7.9], [-.9, 7.9]])); ctx.fillStyle = '#1c1612'; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.05); ctx.stroke();
    for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { const u = 4.4 + k * 1.8, t = 2 + r * 1.5; sol(h, u, t, u + 1.4, t + 1, '#c8603c'); ctx.strokeStyle = '#7a3a22'; ctx.lineWidth = 1; pathS(lpts(h, [[u, t], [u + 1.4, t], [u + 1.4, t + 1], [u, t + 1]])); ctx.stroke(); }   // les tuiles qui sèchent : grille de 4 x 4
    thatchLT(h, 3, 11.6, 11, 15, 'u', OLD_STRAW);                                                                                                         // l'abri de chaume, au fond à droite
  },
  verrerie: h => {                                                    // verrerie (portail à gauche, halle à droite) : devant le SABLE et la POTASSE (tas et sacs alignés), au centre le FOUR À VERRE rond à braise puis la table des PIÈCES de verre ; la halle de bardeaux à grande cheminée au fond
    const s = view.s;
    wattleLT(h, -7.6, .4, 7.6, h.l - .4, -6.4, -3.6);
    pathS(lpts(h, [[-6.2, .3], [-3.8, .3], [-3.8, 9.8], [-6.2, 9.8]])); ctx.fillStyle = 'rgba(150,126,86,.5)'; ctx.fill();                                // allée du portail, côté gauche
    heapLT(h, 2.4, 2.8, 1.4, 1.1, '#e0d09a', '#eee0b0'); for (let k = 0; k < 3; k++) sackLT(h, 4.4 + k * 1.1, 2.6, .4, '#e8e4da');                      // le sable et la potasse
    { const [X, Y] = LP(h, 2.6, 7), R = 1.9 * s; ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2); ctx.fillStyle = STONE.mid; ctx.fill(); ctx.strokeStyle = WOOD.edge; ctx.lineWidth = lw(.1); ctx.stroke(); ctx.beginPath(); ctx.arc(X, Y, R * .5, 0, Math.PI * 2); ctx.fillStyle = '#1c1612'; ctx.fill(); ctx.beginPath(); ctx.arc(X, Y, R * .3, 0, Math.PI * 2); ctx.fillStyle = '#f08a2a'; ctx.fill(); ctx.beginPath(); ctx.arc(X - R * .05, Y - R * .05, R * .13, 0, Math.PI * 2); ctx.fillStyle = '#fbd060'; ctx.fill(); }   // le four à verre : rond, de pierre, à braise
    beamLT(h, -2.4, 6, 0, 8); for (let k = 0; k < 3; k++) disque(h, -1.8 + k * .6, 6.6 + (k % 2) * .8, .26, '#7fb8b0', '#3a6a66');                          // la table des pièces de verre
    for (let k = 0; k < 3; k++) fagotLT(h, 5.4 + k * .8, 9, 1.8, 1.57);                                                                                    // fagots, alignés
    hipLT(h, -2.8, 10.6, 7.2, 15.2, VERT); chimneyLT(h, 3, 12.8, 1.3);                                                                                    // la halle de bardeaux à grande cheminée
  },
  garnison: h => {                                                    // garnison (24 x 24 m) : palissade à portail central, cour de terre ; au fond à gauche le CASERNEMENT de bois dur, la tour de guet en angle ; au premier plan l'ENTRAINEMENT (quatre bottes de paille en cible et flèches alignées) ; à droite l'ÉCURIE de passage (barre d'attache et abreuvoir)
    sol(h, -11, 1, 11, 23, '#a89c80'); railFenceLT(h, -11.6, .6, 11.6, 23.4, -1.8, 1.8);
    for (const u of [-6.6, -2.2, 2.2, 6.6]) stackLT(h, u, 5, 1.1, STRAW); arrowsLT(h, 0, 8.4, 6, 5);                                                      // l'entraînement : bottes de cible alignées, flèches posées à terre
    hitchRailLT(h, 4, 10.4, 12.4); troughLT(h, 4.4, 13.8, 7.6, 14.9, '#5a7f8f');                                                                          // la barre d'attache et l'abreuvoir
    hipLT(h, -10.4, 14.4, -1.6, 22.4, ARDOISE_SOMBRE); chimneyLT(h, -6, 18.4, .7);                                                                          // le casernement, toit de bois dur
    towerLT(h, 8.8, 19.8, 1.8, ARDOISE_SOMBRE);                                                                                                           // la tour de guet
  },
});
