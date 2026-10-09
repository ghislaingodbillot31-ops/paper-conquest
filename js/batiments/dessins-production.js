/* ---------- dessins des ateliers du plan de production (DOMINIUM) ----------
   Vue de dessus, peu de détails : chaque atelier a sa silhouette (toit, matière, outils) pour qu'on le reconnaisse d'un coup d'œil. Repère du bâtiment : u = en travers (de -w/2 à w/2), t = en profondeur depuis la rue (de 0 à l).
   Ce fichier ajoute les 19 nouveaux bâtiments et reprend 7 ateliers existants (forge, armurerie, fonderie, archerie, cordonnerie, couture, brasserie), qui se ressemblaient trop. Chargé après dessins.js. */

// toits : tuile rouge, bardeau clair, ardoise sombre, pierre claire (lauze)
const TUILE = { hi:'#d0724a', lo:'#9b4228', mid:'#b95a38', line:'rgba(60,24,14,.4)', ridge:'#7d3220' };
const BARDEAU = { hi:'#bfae8c', lo:'#8c7d5f', mid:'#a69673', line:'rgba(60,48,30,.4)', ridge:'#6f6247' };
const ARDOISE_SOMBRE = { hi:'#6b7077', lo:'#42464b', mid:'#565b61', line:'rgba(10,12,14,.45)', ridge:'#33363a' };
const BRUN = { hi:'#a87a56', lo:'#6e4528', mid:'#8a5c3c', line:'rgba(40,22,10,.45)', ridge:'#4e2f1a' };                // bois brun foncé
const BLEU = { hi:'#8396b0', lo:'#566a85', mid:'#6a7f9a', line:'rgba(20,28,44,.45)', ridge:'#3f5068' };                // ardoise bleutée
const VERT = { hi:'#93b7a4', lo:'#5f8573', mid:'#759c88', line:'rgba(24,48,38,.4)', ridge:'#4a6b5b' };                 // cuivre vert-de-gris
const LAUZE = { hi:'#d3ccba', lo:'#a49d8c', mid:'#bab3a2', line:'rgba(60,54,44,.4)', ridge:'#8a8374' };

// petites formes communes
const sol = (h, u0, t0, u1, t1, col) => { pathS(lpts(h, [[u0, t0], [u1, t0], [u1, t1], [u0, t1]])); ctx.fillStyle = col; ctx.fill(); };            // dalle ou bassin à plat
const disque = (h, cu, ct, r, col, bord) => {
  const s = view.s, [X, Y] = LP(h, cu, ct), R = Math.max(1.5, r * s);
  ctx.beginPath(); ctx.arc(X + r * .3 * s, Y + r * .4 * s, R, 0, Math.PI * 2); ctx.fillStyle = WOOD.shadow; ctx.fill();
  ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = bord || WOOD.edge; ctx.lineWidth = lw(.06); ctx.stroke();
};
const allee = (h, col) => sol(h, -2.6, .4, 2.6, 5.6, col || '#b3aa96');                                                                             // allée de terre battue devant l'atelier
const BORD = '#7a6a4e', BOUE = '#8a7b60';

Object.assign(BUILD_DRAW, {
  /* ====== atelier existant repris : plus de détails qui les distinguent ====== */
  forge: h => {                                                       // toit d'ardoise grise, enclume, bac de trempe, tas de charbon
    allee(h, '#8f8a82');
    hipLT(h, -6.2, 5.8, 6.2, h.l - 1.2, SLATE); chimneyLT(h, -2.4, 10.4, 1); chimneyLT(h, 3.2, 8.6, .6);
    anvilLT(h, -4.6, 2.6); troughLT(h, 3, 1.2, 5.8, 2.6, '#5a7f8f'); heapLT(h, -6.6, 4.2, 1, .8, '#2a2826', '#3c3a37'); barrelLT(h, 5.6, 4.2, .4);
  },
  armurerie: h => {                                                   // toit de bardeau brun, râtelier d'armes, cibles-boucliers, enclume
    allee(h, '#8f8a82');
    hipLT(h, -6.2, 5.8, 6.2, h.l - 1.2, BARDEAU); chimneyLT(h, 2.8, 10.2, .8);
    targetLT(h, -5.4, 2.4, .8); targetLT(h, -3.6, 3.4, .7); arrowsLT(h, 3.4, 2.4, 2.2, 5); anvilLT(h, 5.4, 4);
  },
  fonderie: h => {                                                    // toit d'ardoise sombre, deux grandes cheminées, minerai, lingots, scories
    sol(h, -3, .4, 3, 6, '#7d786f');
    hipLT(h, -6, 6.4, 6, 20.5, ARDOISE_SOMBRE); chimneyLT(h, 2.6, 14, 1.1); chimneyLT(h, -2.6, 14, .7);
    heapLT(h, -6.4, 3.2, 1.4, 1.1, '#8a5a3a', '#a8714b'); heapLT(h, 6.2, 4, 1.2, 1, '#5c5a58', '#7a7876'); crateLT(h, 4.2, 2, .45); crateLT(h, 5, 2.6, .4);
  },
  archerie: h => {                                                    // toit de chaume, deux cibles, faisceaux de flèches, bois d'arc qui sèche
    allee(h, '#b3aa96');
    thatchLT(h, -6.2, 5.8, 6.2, h.l - 1.2, 'u', STRAW); chimneyLT(h, 3.2, 10, .5);
    targetLT(h, -5, 2.4, .9); targetLT(h, 4.6, 2.6, .9); arrowsLT(h, -1.6, 2.4, 2.4, 4); stackLT(h, 6.2, 5, .8, STRAW);
  },
  cordonnerie: h => {                                                 // toit de bardeau, peaux tendues, cuve de tannage
    allee(h, '#b3aa96');
    hipLT(h, -6.2, 5.8, 6.2, h.l - 1.2, SHINGLE); chimneyLT(h, -3, 10, .5);
    hideFrameLT(h, -5.4, 2.6, .9); hideFrameLT(h, 5, 2.4, .8); barrelLT(h, 2.4, 2, .42); crateLT(h, -2.4, 4, .45);
  },
  couture: h => {                                                     // toit de vieux chaume, étoffes qui sèchent, balles de laine
    allee(h, '#b3aa96');
    thatchLT(h, -6.2, 5.8, 6.2, h.l - 1.2, 'u', OLD_STRAW); chimneyLT(h, 3.2, 10, .5);
    clothLineLT(h, -6, 3, 2.4, ['#b0392f', '#3b5ba6', '#d6c7a0']); sackLT(h, 5, 2.2, .6, '#e6dcc6'); sackLT(h, 6, 3.4, .55, '#e6dcc6');
  },
  brasserie: h => {                                                   // toit de tuile, chaudron de cuivre, cuve de maische, tonneaux
    allee(h, '#b3aa96');
    hipLT(h, -6.4, 6.6, 6.4, h.l - 1.2, TUILE); chimneyLT(h, 3.4, 12, .9);
    disque(h, -5, 2.6, 1.3, '#b87333', '#6e3f17'); troughLT(h, 2.2, 1.2, 5.6, 3, '#d9b84a'); for (const [u, t] of [[-6.4, 5], [5.2, 5], [6, 3.4]]) barrelLT(h, u, t, .45);
  },

  /* ====== les 19 nouveaux ====== */
  glaisiere: h => {                                                   // fosses d'argile, tas d'argile et de sable, abri de chaume
    for (const [u, t, r] of [[-4, 4.6, 2.2], [3.4, 4, 1.9], [-.4, 10, 2.1]]) { disque(h, u, t, r, '#7a5a3c', '#4a3622'); disque(h, u - .2, t - .2, r * .62, '#a9825c', '#8a6a46'); }
    heapLT(h, 6, 10.8, 1.5, 1.2, '#b98a5e', '#d1a074'); heapLT(h, -6.2, 12, 1.4, 1.1, '#d8c690', '#eadcab');
    thatchLT(h, -7.4, 5.4, -4, 8.4, 'u', OLD_STRAW); crateLT(h, 6.4, 6.6, .4);
  },
  marais_salant: h => {                                               // bassins d'évaporation, tas de sel, cabane
    sol(h, -11.4, .8, 11.4, 2.4, '#7fa6b5');                           // chenal d'eau de mer
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const u = -10 + i * 5.2, t = 3.6 + j * 3.8; sol(h, u, t, u + 4.6, t + 3.2, BOUE); sol(h, u + .3, t + .3, u + 4.3, t + 2.9, j ? '#e8ecea' : '#a9bcc4'); }
    heapLT(h, 8.6, 13.4, 1.5, 1.1, '#eef0ec', '#ffffff'); heapLT(h, 5.4, 13.6, 1.1, .9, '#eef0ec', '#ffffff');
    thatchLT(h, -10.8, 11.4, -6.6, 15, 'u', OLD_STRAW); barrowLT(h, -3.2, 13, 0, '#eef0ec');
  },
  pressoir: h => {                                                    // grange à toit de tuile, grande presse à vis, cuve de moût, paniers de raisin
    thatchLT(h, -6.4, 9, 6.4, 22.8, 'u', STRAW); chimneyLT(h, 3.4, 17, .6);
    troughLT(h, -6.4, 2, -1.4, 6.4, '#6b2a3a'); beamLT(h, -6.8, 3.6, 0.6, 4.4); disque(h, 3.4, 3.6, 1.1, '#9c7a45', '#4e3a22');
    basketLT(h, 5.4, 6.2, .7, ['#6b2f4a', '#8a3a56']); basketLT(h, 3.6, 6.8, .6, ['#c4573a', '#d9744f']); barrelLT(h, 6.2, 2.2, .5); barrelLT(h, 5.2, 1.4, .45);
  },
  boucherie: h => {                                                   // toit de tuile, étal et billot, jambons suspendus, peaux, bac
    allee(h, '#b9aa96');
    hipLT(h, -6.2, 5.8, 6.2, h.l - 1.2, TUILE); chimneyLT(h, 3, 10, .5);
    tableLT(h, 4.6, 2.8, 2.4, false); dryRackLT(h, -4.4, .6, 2.6, ['#a8453a', '#c9826a', '#a8453a'], 3); hideFrameLT(h, -5.6, 4.6, .8); troughLT(h, 1.2, 1, 3.8, 2, '#5a7f8f');
  },
  saloir_fumoir: h => {                                               // cabane enfumée à grande cheminée, tonneaux de saumure, claies de poisson
    thatchLT(h, -5.6, 6.2, 5.6, 14.4, 'u', OLD_STRAW); chimneyLT(h, 0, 10.2, 1.5);
    for (const [u, t] of [[-6.4, 2], [-5, 3], [-6.6, 4.2], [-4.6, 4.8]]) barrelLT(h, u, t, .5);
    dryRackLT(h, 1, 7, 2.4, ['#c98a6a', '#d6a37e', '#c98a6a', '#d6a37e'], 4); sackLT(h, 5.6, 4.6, .5, '#eceae0'); sackLT(h, 6.4, 3.6, .45, '#eceae0');
  },
  chandellerie_savonnerie: h => {                                     // chaudron de suif, claies de chandelles, blocs de savon, tas de cire
    allee(h, '#b9aa96');
    thatchLT(h, -6.2, 5.8, 6.2, h.l - 1.2, 'u', OLD_STRAW); chimneyLT(h, 3.4, 10, .7);
    disque(h, -5, 3, 1.2, '#2e2a28', '#111'); dryRackLT(h, .6, 6.6, 2.4, ['#f2e8c0', '#f2e8c0', '#e8dcaa', '#f2e8c0'], 4); crateLT(h, 5.6, 4.8, .5); heapLT(h, -6.4, 5.4, .9, .7, '#d9b84a', '#ecd57a');
  },
  tonnellerie: h => {                                                 // douelles empilées, tonneaux finis, tréteau, cerclage
    hipLT(h, -6.2, 6.4, 6.2, h.l - 1.2, BRUN); chimneyLT(h, -3, 10.6, .5);
    planksLT(h, -7.6, 1, -5.2, 5.4); for (const [u, t] of [[-3.2, 2], [-1.8, 3.2], [-.4, 2.2], [1.2, 3.4], [2.8, 2.3]]) barrelLT(h, u, t, .52);
    trestleLT(h, 5.2, 3.2, 3);
  },
  bas_fourneau: h => {                                                // cheminée d'argile, charbon, minerai, scories, abri du souffleur
    ovenLT(h, 0, 8, 2.6); firePitLT(h, 0, 4, 1);
    heapLT(h, -5.4, 3.8, 1.8, 1.4, '#2c2a28', '#403d3a'); heapLT(h, 5.6, 4.6, 1.6, 1.2, '#5c5a58', '#7a7876'); heapLT(h, 5.8, 11.4, 1.5, 1.2, '#8a5a3a', '#a8714b');
    thatchLT(h, -7.2, 9.6, -3.6, 14, 'u', OLD_STRAW); cordwoodLT(h, -7.4, 1, -3.4, 2);
  },
  orfevre: h => {                                                     // petite maison de tuile, établi, creuset doré
    allee(h, '#b3aa96');
    hipLT(h, -6.2, 5.8, 6.2, h.l - 1.2, BLEU); chimneyLT(h, 3.4, 10.4, .5);
    tableLT(h, -4.4, 2.8, 2.4, false); disque(h, 4.8, 2.6, .5, '#d9b84a', '#8a6a1a'); crateLT(h, 3.4, 4.2, .4);
  },
  atelier_monetaire: h => {                                           // enclos de pierre, bâtiment d'ardoise sombre, tour de garde (atelier du seigneur)
    stoneWallLT(h, [[-7.6, 1], [7.6, 1], [7.6, 15], [-7.6, 15]], .9, true);
    hipLT(h, -4.4, 5, 4.4, 12.4, ARDOISE_SOMBRE); chimneyLT(h, 2.2, 8.6, .6);
    towerLT(h, -5.8, 3.2, 1.4, ARDOISE_SOMBRE); crateLT(h, 4.2, 3, .4); disque(h, 5.4, 13.2, .4, '#c9c2b0', '#6e6a5e');
  },
  tannerie: h => {                                                    // fosses de tannage, peaux sur cadres, tas d'écorce, fosse à la chaux
    for (const [u, t] of [[-10, 3.6], [-5.4, 3.6], [-10, 8], [-5.4, 8]]) troughLT(h, u, t, u + 4, t + 3.4, '#6b4a2e');
    troughLT(h, 0, 3.6, 3.4, 6.6, '#c9d1c4');                                                                        // chaux
    hideFrameLT(h, 6.6, 4.6, 1.1); hideFrameLT(h, 9.6, 5.4, 1); hideFrameLT(h, 7, 9.6, 1.1);
    heapLT(h, -8, 15.4, 2, 1.6, '#6b4f32', '#85663f'); thatchLT(h, -1, 14.6, 8.6, 21.6, 'u', OLD_STRAW); barrelLT(h, 9.6, 14.2, .5);
  },
  corderie: h => {                                                    // longue corderie : hangar étroit, cordes tendues, bottes de chanvre
    thatchLT(h, -4.4, 3, 4.4, 28, 'u', STRAW);
    ctx.strokeStyle = '#a58a5a'; ctx.lineWidth = lw(.12); ctx.beginPath(); for (const u of [-6.6, -5.8, 6, 6.8]) { ctx.moveTo(...LP(h, u, 3.6)); ctx.lineTo(...LP(h, u, 28.4)); } ctx.stroke();
    for (const t of [3.6, 12, 20, 28.4]) for (const u of [-6.6, 6.8]) disque(h, u, t, .22, '#6b4f32');
    stackLT(h, -7, 30, .9, STRAW); stackLT(h, -5.4, 30.4, .8, STRAW); disque(h, 5.2, 30, .8, '#a58a5a', '#6e5a38'); disque(h, 6.8, 30.4, .6, '#a58a5a', '#6e5a38');
  },
  atelier_tissage: h => {                                             // toit de bardeau, métier sur cadre, étoffes, balles de laine
    allee(h, '#b3aa96');
    thatchLT(h, -6.2, 5.8, 6.2, h.l - 1.2, 'u', STRAW); chimneyLT(h, 3.4, 10, .5);
    troughLT(h, -6.6, 1.2, -2.6, 3.8, '#c9b48a'); clothLineLT(h, .6, 6.6, 2.6, ['#c9b48a', '#8a6a4a', '#d6c7a0']); sackLT(h, 5.6, 4.6, .6, '#e6dcc6'); sackLT(h, 6.4, 3.6, .55, '#e6dcc6');
  },
  teinturerie_foulerie: h => {                                        // cuves de couleur, étoffes teintes qui sèchent, bac de foulage
    thatchLT(h, -11, 8.4, -1.4, 15, 'u', OLD_STRAW);
    for (const [u, col, bord] of [[-7, '#3b5ba6', '#1f2f5a'], [-3.2, '#b0392f', '#5a1a14'], [.6, '#d6a52a', '#7a5a10'], [4.4, '#6a3a8a', '#321a46']]) disque(h, u, 3.6, 1.5, col, bord);
    clothLineLT(h, 1, 10.6, 9, ['#3b5ba6', '#b0392f', '#d6a52a', '#6a3a8a', '#e8e2c8']); clothLineLT(h, 1, 10.6, 12.4, ['#e8e2c8', '#d6a52a', '#b0392f', '#3b5ba6']);
    troughLT(h, 7.4, 1.2, 11, 4, '#8aa6b0');
  },
  four_chaux: h => {                                                  // four à chaux en cône de pierre, calcaire et chaux vive, bois
    disque(h, 0, 7.4, 3.2, '#8f8a82', '#4a463e'); disque(h, 0, 7.4, 1.5, '#2a2622', '#111'); disque(h, 0, 5.4, .7, '#1c1815', '#111');
    heapLT(h, -5.8, 3.2, 1.8, 1.3, '#e8e4d6', '#f8f6ee'); heapLT(h, 5.6, 4, 1.4, 1.1, '#f2f0e6', '#ffffff'); cordwoodLT(h, -7.4, 9.6, -3.4, 13.4); crateLT(h, 5.8, 11, .4);
  },
  tuilerie_poterie: h => {                                            // four en dôme, tuiles qui sèchent, poteries, tas d'argile, abri
    ovenLT(h, -7.4, 10.4, 2.6); thatchLT(h, -10.6, 2, -4.6, 6.6, 'u', OLD_STRAW);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) sol(h, -1.4 + i * 2, 2 + j * 1.5, -.3 + i * 2, 2.9 + j * 1.5, '#c8603c');
    for (const [u, t, r] of [[6, 9.4, .6], [7.6, 10.6, .5], [8.8, 9, .55], [5.4, 11.8, .5]]) disque(h, u, t, r, '#b3764a', '#6e4526');
    heapLT(h, 9, 3.6, 1.5, 1.1, '#a8764f', '#c08e62');
  },
  verrerie: h => {                                                    // halle à grande cheminée, sable, éclats de verre, bois à brûler
    hipLT(h, -5.8, 5.8, 5.8, h.l - 1.2, VERT); chimneyLT(h, 0, 10.6, 1.4);
    heapLT(h, -5.4, 3.2, 1.6, 1.2, '#e0d09a', '#eee0b0'); for (const [u, t] of [[3.4, 2.4], [4.4, 3.4], [5.4, 2.6]]) disque(h, u, t, .36, '#7fb8b0', '#3a6a66');
    cordwoodLT(h, -7.4, 6, -6.4, 14); crateLT(h, 5.6, 5, .45);
  },
  garnison: h => {                                                    // enceinte de pieux, casernement d'ardoise, tour de guet, cibles et armes
    sol(h, -11, 1, 11, 23, '#a89c80'); railFenceLT(h, -11.4, .6, 11.4, 23.4, -2.6, 2.6);
    hipLT(h, -9.6, 12.4, -1.2, 21.6, ARDOISE_SOMBRE); chimneyLT(h, -5.4, 17, .6); towerLT(h, 8.6, 18.6, 1.7, ARDOISE_SOMBRE);
    targetLT(h, 4.4, 6, .9); targetLT(h, 8.4, 6.6, .9); arrowsLT(h, 3, 13, 2.6, 5); hitchRailLT(h, -8, -1.8, 4);
  },
  scriptorium: h => {                                                 // petit édifice de pierre claire à tourelle, jardin de simples, puits
    hipLT(h, -5.2, 5.6, 5.2, h.l - 1.4, LAUZE); towerLT(h, 6.4, 6.6, 1.1, LAUZE); chimneyLT(h, -2.8, 9.6, .5);
    vegPatchLT(h, -6.6, 1.2, -1.8, 4.2); vegPatchLT(h, 1.8, 1.2, 6.6, 4.2); wellLT(h, 0, 2.8, .6);
  },
});
