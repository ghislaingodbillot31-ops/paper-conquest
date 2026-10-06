/* ---------- villageois : le dessin ----------
   14 types de villageois (un par métier), vus de dessus, face vers la droite (x) : épaules, tête, couvre-chef, bras et outil, comme les animaux (animaux.js).
   Un villageois : { nom, metier (texte), T largeur d'épaules en mètres, corps (tenue), peau, cheveux, chapeau:{ f:forme, c:couleur }, outil:{ f:forme, c:couleur }, tablier, sac, ... }
   Formes de chapeau : aucun | paille | bonnet | casque | toque | feutre | capuche | foulard | couronne. Formes d'outil : aucun | fourche | hache | pioche | marteau | canne | houlette |
   lance | panier | pain | rabot | arc | seau.
   peintVillageois(clé, x, y, L, angle) peint le villageois centré en (x, y), L pixels de large aux épaules. Réglages : editeur-villageois.html (clé villageois.v1). */
const VILLAGEOIS = {
  villageois:  { bottes:'#6a4a2a', nom:'Villageois',     metier:'sans métier particulier',          T:.58, corps:'#8a7a5a', peau:'#e2b48a', cheveux:'#5a3a22', chapeau:{ f:'aucun', c:'#8a6a3a' }, outil:{ f:'aucun', c:'#8a6238' } },
  paysan:      { bottes:'#d9b030', nom:'Paysan',         metier:'cultive, récolte (ferme)',         T:.58, corps:'#a89a68', peau:'#e0ac80', cheveux:'#6a4a2a', chapeau:{ f:'paille', c:'#e0c36a' }, outil:{ f:'aucun', c:'#8a6238' } },
  bucheron:    { bottes:'#3a2a20', nom:'Bûcheron',       metier:'abat les arbres',                  T:.58, carreaux:'#5a1a14', corps:'#c0402e', peau:'#dfa97e', cheveux:'#4a2e1a', chapeau:{ f:'bonnet', c:'#3a3a40' }, outil:{ f:'aucun', c:'#8a6238' } },
  forestier:   { bottes:'#3a2a1a', nom:'Forestier',      metier:'plante et soigne les arbres',      T:.58, corps:'#4f7a3c', peau:'#e2b48a', cheveux:'#7a5a2a', chapeau:{ f:'feutre', c:'#6a5a2a' }, outil:{ f:'aucun', c:'#8a6238' } },
  pecheur:     { bottes:'#3f8a3a', nom:'Pêcheur',        metier:'pêche en mer, rivière et lac',     T:.58, corps:'#3f6a8a', peau:'#d9a273', cheveux:'#3a2a1a', chapeau:{ f:'bonnet', c:'#e8d9a0' }, outil:{ f:'aucun', c:'#8a6238' } },
  berger:      { bottes:'#5a4a3a', nom:'Berger',         metier:'élève les bêtes',                  T:.58, corps:'#8a6a4a', peau:'#e0ac80', cheveux:'#5a4a3a', chapeau:{ f:'feutre', c:'#5a4a3a' }, outil:{ f:'aucun', c:'#8a6238' } },
  mineur:      { bottes:'#2a2a30', nom:'Mineur',         metier:'creuse la fosse minière',          T:.58, corps:'#6a6a70', peau:'#d49e78', cheveux:'#2a2018', chapeau:{ f:'casque', c:'#c9a050' }, outil:{ f:'aucun', c:'#8a6238' } },
  forgeron:    { bottes:'#2a1e18', nom:'Forgeron',       metier:'forge outils et armes',            T:.58, corps:'#6a4a3a', peau:'#d9a273', cheveux:'#2a1a10', chapeau:{ f:'feutre', c:'#4a3a30' }, outil:{ f:'aucun', c:'#8a6238' }, tablier:'#3a2e28' },
  boulanger:   { bottes:'#8a6a4a', nom:'Boulanger',      metier:'moud et cuit le pain',             T:.58, corps:'#efe9da', peau:'#e8bd94', cheveux:'#7a5a3a', chapeau:{ f:'toque', c:'#ffffff' }, outil:{ f:'aucun', c:'#c98a3a' }, tablier:'#ffffff' },
  menuisier:   { bottes:'#5a3a1a', nom:'Menuisier',      metier:'travaille le bois',                T:.6,  corps:'#9a7a4a', peau:'#dfa97e', cheveux:'#5a3a1a', chapeau:{ f:'foulard', c:'#c0b090' }, outil:{ f:'aucun', c:'#8a6238' }, tablier:'#6a4a2a' },
  tailleur:    { bottes:'#3a2a3a', nom:'Tailleur',       metier:'coud les vêtements',               T:.58, corps:'#7a4a7a', peau:'#e8bd94', cheveux:'#4a3a2a', chapeau:{ f:'feutre', c:'#5a3a5a' }, outil:{ f:'aucun', c:'#8a6238' } },
  marchand:    { bottes:'#4a2a1a', nom:'Marchand',       metier:'achète, vend, transporte',         T:.6,  corps:'#c8782a', peau:'#e0ac80', cheveux:'#4a3220', chapeau:{ f:'feutre', c:'#7a2a1a' }, outil:{ f:'aucun', c:'#8a6238' }, sac:'#8a6a3a' },
  soldat:      { bottes:'#3a3a40', nom:'Garde',          metier:'garde le village',                 T:.58, corps:'#8a8a94', peau:'#dba477', cheveux:'#2a2018', chapeau:{ f:'casque', c:'#9a9aa4' }, outil:{ f:'aucun', c:'#8a6238' } },
  enfant:      { bottes:'#6a4a2a', nom:'Enfant',         metier:'joue, aide aux champs',            T:.36, corps:'#c8a0a0', peau:'#e8bd94', cheveux:'#8a6a3a', chapeau:{ f:'aucun', c:'#000000' }, outil:{ f:'aucun', c:'#8a6238' } },
};
const VILLAGEOIS_DEFAUT = JSON.parse(JSON.stringify(VILLAGEOIS));
try { const o = JSON.parse(localStorage.getItem('villageois.v1') || '{}'); for (const k in o) if (VILLAGEOIS[k]) VILLAGEOIS[k] = { ...VILLAGEOIS_DEFAUT[k], ...o[k], chapeau:{ ...VILLAGEOIS_DEFAUT[k].chapeau, ...(o[k].chapeau || {}) }, outil:{ ...VILLAGEOIS_DEFAUT[k].outil, ...(o[k].outil || {}) } }; } catch (e) {}
// le métier d'un villageois d'après le bâtiment où il travaille (bâtiment inconnu : villageois simple)
const VILLAGEOIS_DE = { cabane_peche:'pecheur', camp_colon:'villageois', camp_bucherons:'bucheron', loge_bucheron:'bucheron', hutte_forestier:'forestier', scierie:'menuisier', menuisier:'menuisier', pecherie:'pecheur', camp_chasse:'soldat', hutte_cueillette:'villageois',
  rucher:'villageois', tailleur_pierre:'mineur', fosse_miniere:'mineur', ferme:'paysan', recolte:'paysan', agriculture:'paysan', bergerie:'berger', moulin:'boulanger', four:'boulanger', boulangerie:'boulanger',
  forgeron:'forgeron', armurier:'forgeron', fonderie:'forgeron', tailleur:'tailleur', cordonnier:'tailleur', marche:'marchand', comptoir:'marchand', comptoir_betail:'marchand', relais:'marchand',
  entrepot:'marchand', grange:'paysan', defense:'soldat', maison:'villageois', maison_cour:'villageois', potager:'paysan', poulailler:'paysan', verger:'paysan', chevres:'berger', brasserie:'villageois' };
const villageoisDe = kind => VILLAGEOIS_DE[kind] || 'villageois';
const VI_INK = '#2b2118';
const vsMel = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.substr(i, 2), 16) * (1 - t) + parseInt(b.substr(i, 2), 16) * t).toString(16).padStart(2, '0')).join('');
const viEll = (x, y, rx, ry, col, rot = 0, st = true) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, 7); if (col) { ctx.fillStyle = col; ctx.fill(); } if (st) ctx.stroke(); };
const viLigne = (pts, w, col) => { const lw = ctx.lineWidth, tr = () => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); }; tr(); ctx.lineWidth = w + lw * 2; ctx.strokeStyle = VI_INK; ctx.stroke(); tr(); ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke(); ctx.lineWidth = lw; ctx.strokeStyle = VI_INK; };
// outil tenu devant soi (les mains sont en (.1, ±.12)) ; longueurs en largeurs d'épaules
function viOutil(f, c) {
  const bois = '#8a6238', fer = '#9aa0a8';
  switch (f) {
    case 'fourche': viLigne([[-.2, -.04], [.95, -.04]], .035, bois); for (const y of [-.12, -.04, .04]) viLigne([[.95, y === -.04 ? -.04 : -.04 + (y + .04) * .6], [1.2, y]], .02, fer); break;
    case 'hache': viLigne([[-.15, -.06], [.75, -.06]], .04, bois); ctx.beginPath(); ctx.moveTo(.75, -.06); ctx.lineTo(.92, -.2); ctx.lineTo(.98, .1); ctx.lineTo(.75, -.02); ctx.closePath(); ctx.fillStyle = fer; ctx.fill(); ctx.stroke(); break;
    case 'pioche': viLigne([[-.15, -.06], [.8, -.06]], .04, bois); viLigne([[.7, -.32], [.76, -.06], [.7, .22]], .045, fer); break;
    case 'marteau': viLigne([[-.1, -.06], [.6, -.06]], .045, bois); ctx.beginPath(); ctx.rect(.54, -.2, .2, .28); ctx.fillStyle = '#7a7e86'; ctx.fill(); ctx.stroke(); break;
    case 'canne': viLigne([[-.2, -.06], [1.4, -.06]], .02, '#6a4a2a'); viLigne([[1.4, -.06], [1.55, .05]], .008, '#f3efe3'); viEll(1.58, .08, .04, .04, '#e8442a'); break;
    case 'houlette': viLigne([[-.2, -.06], [1.1, -.06]], .03, bois); ctx.beginPath(); ctx.arc(1.1, -.14, .1, Math.PI * .5, Math.PI * 1.7); ctx.lineWidth = .03; ctx.strokeStyle = bois; ctx.stroke(); break;
    case 'lance': viLigne([[-.35, -.06], [1.3, -.06]], .03, bois); ctx.beginPath(); ctx.moveTo(1.3, -.14); ctx.lineTo(1.5, -.06); ctx.lineTo(1.3, .02); ctx.closePath(); ctx.fillStyle = fer; ctx.fill(); ctx.stroke(); break;
    case 'panier': viEll(.5, 0, .22, .2, '#b08a4a'); viEll(.5, 0, .14, .12, '#7a5a2a', 0, false); break;
    case 'pain': viEll(.5, -.02, .24, .12, c || '#c98a3a', .15); viLigne([[.4, -.08], [.46, .04]], .012, vsMel(c || '#c98a3a', '#000000', .3)); viLigne([[.52, -.1], [.58, .02]], .012, vsMel(c || '#c98a3a', '#000000', .3)); break;
    case 'rabot': ctx.beginPath(); ctx.rect(.25, -.18, .5, .24); ctx.fillStyle = '#b08a4a'; ctx.fill(); ctx.stroke(); viLigne([[.4, -.06], [.6, -.06]], .02, '#7a5a2a'); break;
    case 'arc': ctx.beginPath(); ctx.arc(.4, -.06, .5, -1.1, 1.1); ctx.lineWidth = .035; ctx.strokeStyle = bois; ctx.stroke(); break;
    case 'seau': viEll(.45, .02, .16, .16, '#8a6a3a'); viEll(.45, .02, .1, .1, '#3a6a9a', 0, false); break;
  }
}
function viChapeau(f, c, hr) {
  switch (f) {
    case 'paille': viEll(0, 0, hr * 1.55, hr * 1.55, c); viEll(0, 0, hr * .85, hr * .85, vsMel(c, '#000000', .15), 0, false); break;
    case 'bonnet': viEll(-.01, 0, hr * 1.4, hr * 1.4, c); viEll(.0, 0, hr * .7, hr * .7, vsMel(c, '#ffffff', .15), 0, false); break;
    case 'casque': viEll(0, 0, hr * 1.45, hr * 1.45, c); ctx.beginPath(); ctx.moveTo(-hr * 1.1, 0); ctx.lineTo(hr * 1.1, 0); ctx.lineWidth *= .8; ctx.stroke(); ctx.lineWidth /= .8; break;
    case 'toque': viEll(0, 0, hr * 1.5, hr * 1.5, c); viEll(0, 0, hr * .9, hr * .9, vsMel(c, '#c0c8d0', .2), 0, false); break;
    case 'feutre': viEll(0, 0, hr * 1.55, hr * 1.55, c); viEll(0, 0, hr * .85, hr * .85, vsMel(c, '#000000', .2), 0, false); break;
    case 'foulard': viEll(-hr * .1, 0, hr * 1.35, hr * 1.3, c); break;
    case 'capuche': viEll(-hr * .25, 0, hr * 1.3, hr * 1.25, c); break;
    case 'couronne': viEll(0, 0, hr * 1.1, hr * 1.1, null); ctx.strokeStyle = '#d9a521'; ctx.lineWidth *= 2; ctx.stroke(); ctx.lineWidth /= 2; ctx.strokeStyle = VI_INK; break;
  }
}
// ombrage : un reflet clair en haut à gauche et un creux sombre en bas à droite, clippés dans la forme (rend les aplats moins plats)
function viRelief(x, y, rx, ry, rot = 0) {
  ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, 7); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.13)'; ctx.beginPath(); ctx.ellipse(x - rx * .25, y - ry * .3, rx * .75, ry * .6, rot, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(20,10,40,.12)'; ctx.beginPath(); ctx.ellipse(x + rx * .45, y + ry * .55, rx * .8, ry * .55, rot, 0, 7); ctx.fill(); ctx.restore();
}
function peintVillageois(k, x, y, L, ang = 0) {
  const a = VILLAGEOIS[k]; if (!a) return;
  const sc = L / .55;                                                          // L : largeur aux épaules ; le dessin est fait pour des épaules de .55 unité
  ctx.save(); ctx.translate(x + L * .08, y + L * .1); ctx.rotate(ang); ctx.scale(sc, sc); ctx.fillStyle = 'rgba(30,40,70,.28)'; ctx.beginPath(); ctx.ellipse(0, 0, .26, a.T * .62, 0, 0, 7); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sc, sc); ctx.lineJoin = ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.4, Math.min(2.4, sc * .085)) / sc; ctx.strokeStyle = VI_INK;
  const hr = .14, bw = a.T / 2 * 1.08, hasTool = a.outil.f !== 'aucun';
  const th = .3, ct = Math.cos(th), st = Math.sin(th), O = [.08, bw * .62];                           // outil tenu en diagonale, sur le côté (angle th)
  const at = (u, v) => [O[0] + u * ct - v * st, O[1] + u * st + v * ct];
  if (a.sac) viEll(-.2, 0, .14, bw * .6, a.sac);                               // sac dans le dos
  if (hasTool) { ctx.save(); ctx.translate(O[0], O[1]); ctx.rotate(th); ctx.translate(0, .06); viOutil(a.outil.f, a.outil.c); ctx.restore(); }
  viEll(-.03, 0, .19, hasTool ? bw : bw * 1.1, a.corps); viRelief(-.03, 0, .19, hasTool ? bw : bw * 1.1);                // épaules et dos
  if (a.carreaux) { ctx.save(); ctx.beginPath(); ctx.ellipse(-.03, 0, .17, bw, 0, 0, 7); ctx.clip(); ctx.strokeStyle = a.carreaux; ctx.lineWidth = .028; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(-.2, i * .09); ctx.lineTo(.14, i * .09); ctx.moveTo(-.03 + i * .05, -bw); ctx.lineTo(-.03 + i * .05, bw); ctx.stroke(); } ctx.restore(); ctx.strokeStyle = VI_INK; ctx.lineWidth = Math.max(1.4, Math.min(2.4, sc * .085)) / sc; }
  if (a.tablier) viEll(.02, 0, .1, bw * .55, a.tablier, 0, false);
  const h1 = hasTool ? at(.02, 0) : [.14, bw * .95], h2 = hasTool ? at(.24, 0) : [.14, -bw * .95];
  if (hasTool) {                                                               // avec un outil : les bras se voient, mains sur le manche ; sinon, seulement les épaules (vue de dessus)
    viLigne([[0, -(bw - .05)], [.16, -bw * .5], h2], .09, a.corps);
    viLigne([[0, bw - .05], [.12, bw * .75], h1], .09, a.corps);
    viEll(h1[0], h1[1], .055, .055, a.peau); viEll(h2[0], h2[1], .055, .055, a.peau);
  }
  viEll(.04, 0, hr, hr, a.peau); viRelief(.04, 0, hr, hr);                     // tête
  if (a.chapeau.f === 'aucun' || a.chapeau.f === 'foulard') { ctx.save(); ctx.beginPath(); ctx.ellipse(.04, 0, hr, hr, 0, 0, 7); ctx.clip(); viEll(-.02, 0, hr * .95, hr * 1.02, a.cheveux, 0, false); ctx.restore(); }
  ctx.save(); ctx.translate(.04, 0); viChapeau(a.chapeau.f, a.chapeau.c, hr * 1.2); if (a.chapeau.f !== 'aucun') viRelief(0, 0, hr * 1.5, hr * 1.5); ctx.restore();
  ctx.restore();
}
