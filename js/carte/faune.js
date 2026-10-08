/* ---------- faune : des animaux qui vivent sur la carte ----------
   Un « foyer » est un repère de S.ressources { id, cat:'elevage'|'faune'|'predateur', key, x, y [, ab] } (ab : abondance 1 à 3 de la fiche de région).
   Chaque foyer devient un groupe d'animaux qui vit dans un secteur autour de lui (rayon r) : troupeau (mouton, bison, zèbre…), meute (loup, lion, hyène…),
   animal solitaire (ours, tigre, élan…). Ils sont simulés à chaque image (fauneStep, appelé par simLoop) et peints par-dessus la carte (drawFaune), jamais enregistrés.
   Comportement d'un groupe, par modes qui s'enchaînent :
     paitre  : chacun broute sur place ou fait quelques pas, sans s'éloigner du groupe ; de temps en temps le groupe se déplace
     marcher : le groupe va vers un point de son secteur, en restant groupé (cohésion + séparation + même cap) ; les prédateurs peuvent viser un troupeau voisin
     repos   : tout le monde s'arrête
     fuite   : un prédateur approche → le groupe part en courant, loin de lui
   Évitent l'eau, les bâtiments et (sauf les espèces des bois) les grandes forêts. Les espèces d'eau (hippopotame, crocodile, castor, capybara…) restent à la rive. */
const FAUNE_CATS = new Set(['elevage', 'faune', 'predateur']);
const FAUNE_CAT = { elevage:{ t:'troupeau', g:[6, 12], r:70 }, faune:{ t:'troupeau', g:[4, 8], r:110 }, predateur:{ t:'solitaire', g:[1, 1], r:160 } };
// par espèce : g taille du groupe · r rayon du secteur (m) · t type · bois (vit en forêt) · eau (vit à la rive)
const FAUNE = {
  mouton:{ g:[12, 24] }, chevre:{ g:[6, 12] }, chevre_cachemire:{ g:[6, 10] }, vache:{ g:[8, 14] }, zebu:{ g:[8, 14] }, buffle:{ g:[6, 10], eau:1 }, yak:{ g:[8, 12] },
  cheval:{ g:[5, 10], r:140 }, ane:{ g:[3, 6] }, chameau:{ g:[6, 12], r:160 }, chameau_bactriane:{ g:[6, 12], r:160 }, cochon:{ g:[3, 6], bois:1, r:50 },
  renne_dom:{ g:[10, 20] }, lama:{ g:[6, 10] }, alpaga:{ g:[6, 10] }, elephant_asie:{ g:[3, 6], r:140 }, dindon:{ g:[5, 8], r:40 }, cobaye:{ g:[3, 5], r:25 },
  cerf:{ g:[4, 8], bois:1 }, chevreuil:{ g:[2, 4], bois:1, r:80 }, sanglier:{ g:[4, 8], bois:1, r:90 }, elan:{ g:[1, 2], bois:1, t:'solitaire' },
  renne:{ g:[10, 20], r:160 }, bison:{ g:[12, 25], r:150 }, boeuf_musque:{ g:[8, 14] }, castor:{ g:[2, 4], eau:1, r:60 }, zibeline:{ g:[1, 1], bois:1, t:'solitaire', r:60 },
  renard:{ g:[1, 2], t:'solitaire', r:120 }, hermine:{ g:[1, 1], t:'solitaire', r:60 }, lievre:{ g:[1, 2], t:'solitaire', r:70 }, bouquetin:{ g:[5, 10], r:80 },
  saiga:{ g:[15, 30], r:160 }, gazelle:{ g:[10, 20], r:150 }, antilope:{ g:[6, 12], r:140 }, zebre:{ g:[10, 20], r:150 }, autruche:{ g:[3, 6], r:120 },
  nandou:{ g:[3, 6], r:110 }, emeu:{ g:[3, 6], r:110 }, casoar:{ g:[1, 2], bois:1, t:'solitaire', r:70 }, elephant_afrique:{ g:[4, 8], r:170 },
  hippopotame:{ g:[4, 8], eau:1, r:50 }, rhinoceros:{ g:[1, 2], t:'solitaire', r:120 }, tapir:{ g:[1, 2], bois:1, eau:1, t:'solitaire' }, capybara:{ g:[6, 12], eau:1, r:60 },
  guanaco:{ g:[6, 10] }, kangourou:{ g:[4, 8] }, lemurien:{ g:[6, 10], bois:1, r:50 },
  loup:{ g:[4, 7], t:'meute', bois:1, r:200 }, ours_brun:{ bois:1 }, ours_polaire:{}, ours_noir:{ bois:1 }, lion:{ g:[4, 7], t:'meute', r:200 }, tigre:{ bois:1 },
  leopard:{ bois:1 }, guepard:{ g:[2, 3] }, hyene:{ g:[5, 9], t:'meute', r:180 }, jaguar:{ bois:1, eau:1 }, puma:{ bois:1 }, crocodile:{ g:[2, 3], eau:1, r:50, t:'embuscade' },
  lynx:{ bois:1 }, panthere_neige:{}, dingo:{ g:[3, 5], t:'meute', r:180 },
};
const fauneParam = (cat, key) => ({ ...FAUNE_CAT[cat], ...FAUNE[key] });
const FAUNE_NOM = key => (typeof LAND_ANIMALS !== 'undefined' && LAND_ANIMALS[key] && LAND_ANIMALS[key].name) || key;

// ---- terrain : où un animal peut poser le pied ----
let fauneFzCache = { seed:null, f:null };
const fauneEnForet = (x, y) => { if (fauneFzCache.seed !== S.landSeed) fauneFzCache = { seed:S.landSeed, f:forestNoise() }; return fauneFzCache.f(x, y) > biomeOf().flora.forest; };
// cailloux de la carte (flora de kind 'rock', y compris ceux des berges), rangés par cases de 16 m ; refaits quand la végétation change
let fauneRocheVer = -1, fauneRoches = new Map();
function fauneRocheCases() {
  if (fauneRocheVer === floraVersion) return fauneRoches;
  fauneRocheVer = floraVersion; fauneRoches = new Map();
  for (const r of flora) if (r.kind === 'rock') { const k = Math.floor(r.x / 16) + ',' + Math.floor(r.y / 16); if (!fauneRoches.has(k)) fauneRoches.set(k, []); fauneRoches.get(k).push(r); }
  return fauneRoches;
}
/* L'eau : les polygones d'eau du décor, MAIS AUSSI le tracé réellement dessiné (axe des rivières avec leur demi-largeur, contour lissé des lacs),
   avec une marge : un animal terrestre ne met jamais le pied dans l'eau, même à un raccord de polygones. */
/* Résultat gardé par case de 0,5 m (et par rayon) tant que l'eau ne change pas : un animal reste ~15 images dans la même case, et le test complet (tous les rivages, ~0,5 ms) revenait à chaque image pour chacun. */
let eauMem = new Map(), eauCle = null;
function fauneEau(x, y, rad = .4) {
  const cle = sceneV + '|' + S.rivers.length + '|' + S.lakes.length + '|' + (Z.water ? Z.water.river.length + ',' + Z.water.lake.length : 0);
  if (cle !== eauCle || eauMem.size > 300000) { eauMem = new Map(); eauCle = cle; }
  const k = ((Math.floor(x * 2) + 1000) * 16384 + Math.floor(y * 2) + 1000) * 64 + Math.round(rad * 10), v = eauMem.get(k);
  if (v !== undefined) return v;
  const r = fauneEauCalc(x, y, rad); eauMem.set(k, r); return r;
}
function fauneEauCalc(x, y, rad) {
  const m = rad + .6;
  for (const lst of [Z.water.river, Z.water.lake]) for (const q of lst) if (x > q.bb[0] - m && x < q.bb[2] + m && y > q.bb[1] - m && y < q.bb[3] + m && (inPoly([x, y], q.P) || q.P.some((p, i) => ptSeg([x, y], p, q.P[(i + 1) % q.P.length]).d < m))) return true;
  for (const rv of S.rivers) { const HW = riverHW(rv); for (let i = 0; i < rv.pts.length - 1; i++) { const a = rv.pts[i], b = rv.pts[i + 1], hw = Math.max(HW[i], HW[i + 1]) + m;
    if (x > Math.min(a[0], b[0]) - hw && x < Math.max(a[0], b[0]) + hw && y > Math.min(a[1], b[1]) - hw && y < Math.max(a[1], b[1]) + hw && ptSeg([x, y], a, b).d < Math.max(HW[i], HW[i + 1]) + m) return true; } }
  for (const lk of S.lakes) { const P = lakeShape(lk), bb = bbox(P); if (x > bb[0] - m && x < bb[2] + m && y > bb[1] - m && y < bb[3] + m && (inPoly([x, y], P) || P.some((p, i) => ptSeg([x, y], p, P[(i + 1) % P.length]).d < m))) return true; }
  return false;
}
// un animal qui se retrouve dans l'eau (carte modifiée, apparition…) est remis sur la terre ferme la plus proche
function fauneSecours(h, a) {
  for (let r = 2; r <= 90; r += 2) for (let k = 0; k < 16; k++) { const an = k / 16 * 6.28 + r, x = a.x + Math.cos(an) * r, y = a.y + Math.sin(an) * r; if (fauneLibre(x, y, h.p.bois, Math.max(.2, h.T * .22))) { a.x = x; a.y = y; a.v = 0; a.d = null; return true; } }
  return false;
}
// rad : demi-largeur de l'animal (m). Eau, cailloux, gisements, bâtiments et (sauf bois) grandes forêts sont infranchissables ; les arbres, eux, se traversent (par-dessous : drawFaune)
function fauneLibre(x, y, bois, rad = .4) {
  if (!inTerrain([x, y]) || !surTerre([x, y])) return false;
  const rc = fauneRocheCases(), cx = Math.floor(x / 16), cy = Math.floor(y / 16);
  for (let j = cy - 1; j <= cy + 1; j++) for (let i = cx - 1; i <= cx + 1; i++) for (const r of rc.get(i + ',' + j) || []) if (Math.hypot(r.x - x, r.y - y) < r.r * .9 + rad) return false;
  for (const d of S.deposits || []) if (Math.abs(d.c[0] - x) < d.r * 1.4 && Math.abs(d.c[1] - y) < d.r * 1.4 && inPoly([x, y], d.pts)) return false;
  if (fauneEau(x, y, rad)) return false;
  for (const h of S.houses) if (Math.abs(h.x - x) < 30 && Math.abs(h.y - y) < 30 && inPoly([x, y], corners(h))) return false;
  return bois || !fauneEnForet(x, y);
}
// vrai si l'on peut aller tout droit de (x0, y0) à (x1, y1) sans croiser d'eau ni d'obstacle (pas de 3 m) : deux points séparés par une rivière ne sont pas « directs »
function fauneDirect(x0, y0, x1, y1, bois, rad = .4) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 3);
  for (let i = 1; i < n; i++) if (!fauneLibre(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, bois, rad)) return false;
  return true;
}
// un point de rive proche de (x, y), à moins de R mètres : sommet d'un lac ou d'un fleuve, ramené de quelques mètres vers (x, y)
function fauneRive(x, y, R) {
  let best = null, bd = R;
  for (const lst of [Z.water.river, Z.water.lake]) for (const q of lst) for (let i = 0; i < q.P.length; i += 3) { const d = Math.hypot(q.P[i][0] - x, q.P[i][1] - y); if (d < bd) { bd = d; best = q.P[i]; } }
  if (!best) return null;
  const d = Math.hypot(x - best[0], y - best[1]) || 1, k = 12 / d;
  return [best[0] + (x - best[0]) * k, best[1] + (y - best[1]) * k];
}

// ---- pose des foyers (régions du jeu, d'après la fiche de la région ; la map test pose les siens) ----
// items : [{ cat, key, ab }] → foyers dans des endroits libres, à l'écart les uns des autres
function placeFoyers(seed, items) {
  const rnd = seeded(seed * 41 + 9), out = [], M = 160;
  let id = Math.max(0, ...(S.ressources || []).map(r => r.id || 0));
  const B = biomeOf().flora, fz = forestNoise();
  for (const it of items) {
    const p = fauneParam(it.cat, it.key);
    for (let t = 0; t < 400; t++) {
      let x = M + rnd() * (TW - 2 * M), y = M + rnd() * (TH - 2 * M);
      if (p.eau) { const r = fauneRive(x, y, 400); if (r) { x = r[0]; y = r[1]; } }
      const foret = fz(x, y) > B.forest - (t < 250 ? .02 : -1);                                     // (espèce des bois : dans la forêt ; les autres : à découvert ; sur la fin, on ne regarde plus)
      if (t < 250 && !!p.bois !== foret && !p.eau) continue;
      if (!dansRegion([x, y]) || !fauneLibre(x, y, true) || distToRoads([x, y]) < 30) continue;
      if (out.some(o => Math.hypot(o.x - x, o.y - y) < (o.rr + p.r) * .9)) continue;
      out.push({ id:++id, cat:it.cat, key:it.key, x:round2(x), y:round2(y), ab:it.ab || 2, rr:p.r }); break;
    }
  }
  return out.map(({ rr, ...o }) => o);
}

// ---- simulation ----
let troupeaux = [], fauneSig = '', fauneAcc = 0, fauneMoteur = null;
const fvit = T => Math.min(1.8, .5 + .35 * T);                                                       // vitesse de marche (m/s), selon la taille
const fang = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
function fauneCree(f) {
  const sp = ANIMAUX[f.key]; if (!sp) return null;
  const p = fauneParam(f.cat, f.key), rnd = seeded(f.id * 977 + Math.round(f.x)), ab = f.ab || 2;
  const n = Math.max(1, Math.round(p.g[0] + (p.g[1] - p.g[0]) * (ab - 1) / 2)), T = sp.T, spread = 4 + 3 * Math.sqrt(n) * Math.sqrt(T);
  const h = { f, key:f.key, cat:f.cat, p, n, T, spread, home:[f.x, f.y], mode:'paitre', t:3 + rnd() * 20, tp:null, an:[], bloque:0 };
  for (let i = 0; i < n; i++) for (let k = 0; k < 30; k++) {
    const a = rnd() * 6.28, d = Math.sqrt(rnd()) * spread, x = f.x + Math.cos(a) * d, y = f.y + Math.sin(a) * d;
    if (!fauneLibre(x, y, p.bois) || !fauneDirect(f.x, f.y, x, y, p.bois) || h.an.some(o => Math.hypot(o.x - x, o.y - y) < T * 1.2)) continue;
    const jeune = f.cat !== 'predateur' && n >= 4 && rnd() < .18;
    h.an.push({ x, y, a:rnd() * 6.28, v:0, ph:rnd() * 6, s:(jeune ? .55 : .93 + rnd() * .14), jeune, t:rnd() * 6, d:null }); break;
  }
  return h.an.length ? h : null;
}
function fauneCentre(h) { let x = 0, y = 0, n = 0; for (const a of h.an) { if (a.captif) continue; x += a.x; y += a.y; n++; } return n ? [x / n, y / n] : [h.home[0], h.home[1]]; }   // (les animaux capturés ne comptent plus)
function fauneCible(h, c) {                                                                          // où aller : prédateur → souvent vers un troupeau ; espèce d'eau → la rive ; sinon un point du secteur
  const R = h.p.r;
  if (h.cat === 'predateur' && Math.random() < .55) {
    let best = null, bd = 450;
    for (const o of troupeaux) if (o.cat !== 'predateur') { const q = o.c || o.home, d = Math.hypot(q[0] - c[0], q[1] - c[1]); if (d < bd) { bd = d; best = q; } }
    if (best) { h.chasse = true; return [best[0] + (Math.random() - .5) * 50, best[1] + (Math.random() - .5) * 50]; }
  }
  h.chasse = false;
  for (let k = 0; k < 14; k++) {
    const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * (h.cat === 'predateur' ? R : Math.min(R, 55));            // (un troupeau change de pâturage de quelques dizaines de mètres, un prédateur parcourt tout son secteur)
    let p = [c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d];
    const dh = Math.hypot(p[0] - h.home[0], p[1] - h.home[1]); if (dh > R) p = [h.home[0] + (p[0] - h.home[0]) / dh * R * .9, h.home[1] + (p[1] - h.home[1]) / dh * R * .9];
    if (h.p.eau && Math.random() < .7) p = fauneRive(p[0], p[1], R + 60) || p;
    if (fauneLibre(p[0], p[1], h.p.bois) && fauneDirect(c[0], c[1], p[0], p[1], h.p.bois)) return p;   // (pas de pâturage de l'autre côté d'une rivière : le troupeau resterait bloqué sur la rive)
  }
  return c;
}
function fauneMode(h, mode, dur) { h.mode = mode; h.t = dur; h.bloque = 0; }
function fauneSuite(h, c) {                                                                          // fin d'un mode : quel est le suivant
  const p = h.p, r = Math.random();
  if (h.mode === 'marcher' || h.mode === 'fuite') return fauneMode(h, h.cat === 'predateur' ? 'repos' : 'paitre', 45 + Math.random() * 75);
  if (h.mode === 'repos') { if (p.t === 'embuscade' && r < .6) return fauneMode(h, 'repos', 40 + Math.random() * 60); h.tp = fauneCible(h, c); return fauneMode(h, 'marcher', 60); }
  if (h.cat === 'predateur') { h.tp = fauneCible(h, c); return fauneMode(h, 'marcher', 70); }
  if (r < .45) { h.tp = fauneCible(h, c); return fauneMode(h, 'marcher', 60); }
  return fauneMode(h, r < .65 ? 'repos' : 'paitre', 30 + Math.random() * 60);
}
function fauneAnimal(h, a, c, dt) {
  if (a.captif) {                                                                                    // capturé : il attend le fermier, puis le suit (2 m derrière lui) jusqu'à la ferme (capture.js)
    const f = a.captif.w; a.v = 0;
    if (a.captif.suit && f) { const d = Math.hypot(f.x - a.x, f.y - a.y); if (d > 1.8) { const v = Math.min(d - 1.8, fvit(h.T) * 1.6 * dt); a.a = Math.atan2(f.y - a.y, f.x - a.x); a.x += Math.cos(a.a) * v; a.y += Math.sin(a.a) * v; a.ph += v * 3.2 / Math.max(.3, h.T * .4); a.v = .6; } }
    return;
  }
  if ((a.chk = (a.chk === undefined ? Math.random() : a.chk) - dt) <= 0) { a.chk = 1.5; if (fauneEau(a.x, a.y, Math.max(.2, h.T * .22))) fauneSecours(h, a); }   // (jamais dans l'eau)
  const T = h.T, run = h.mode === 'fuite' ? 3.2 : h.chasse && h.mode === 'marcher' ? 1.7 : 1, vw = fvit(T) * (a.jeune ? .8 : 1) * (h.cat === 'predateur' ? 1.1 : 1);
  let want = a.a, v = 0, turn = 2.4;
  const dc = Math.hypot(c[0] - a.x, c[1] - a.y);
  if (h.mode === 'marcher' || h.mode === 'fuite') {
    let vx = h.tp[0] - a.x, vy = h.tp[1] - a.y; const dd = Math.hypot(vx, vy) || 1; vx /= dd; vy /= dd;
    const k = Math.min(1, dc / h.spread) * (h.mode === 'fuite' ? .4 : 1.1);                           // cohésion
    vx += (c[0] - a.x) / (dc || 1) * k; vy += (c[1] - a.y) / (dc || 1) * k;
    for (const o of h.an) if (o !== a) { const dx = a.x - o.x, dy = a.y - o.y, d = Math.hypot(dx, dy); if (d < T * 1.3 && d > .01) { vx += dx / d * (T * 1.3 - d) / T * 1.6; vy += dy / d * (T * 1.3 - d) / T * 1.6; } }   // séparation
    want = Math.atan2(vy, vx); v = vw * run * (a.jeune && h.mode !== 'fuite' ? 1.1 : 1); turn = h.mode === 'fuite' ? 5 : 2.6;
  } else if (h.mode === 'paitre') {
    if ((a.t -= dt) <= 0) {                                                                           // brouter sur place, ou quelques pas
      if (Math.random() < .35) { const an = dc > h.spread * 1.2 ? Math.atan2(c[1] - a.y, c[0] - a.x) + (Math.random() - .5) : Math.random() * 6.28, d = 2 + Math.random() * 4; a.d = [a.x + Math.cos(an) * d, a.y + Math.sin(an) * d]; a.t = 3 + Math.random() * 5; }
      else { a.d = null; a.t = 3 + Math.random() * 8; a.a += (Math.random() - .5) * 1.2; want = a.a; }
    }
    if (a.d) { const dd = Math.hypot(a.d[0] - a.x, a.d[1] - a.y); if (dd < .6) a.d = null; else { want = Math.atan2(a.d[1] - a.y, a.d[0] - a.x); v = vw * .22; turn = 1.6; } }
  }
  a.a += Math.max(-turn * dt, Math.min(turn * dt, fang(want - a.a)));
  a.v += (v - a.v) * Math.min(1, dt * 4);
  if (a.v > .02) {
    const nx = a.x + Math.cos(a.a) * a.v * dt, ny = a.y + Math.sin(a.a) * a.v * dt;
    const rad = Math.max(.2, T * .22);
    if (fauneLibre(nx, ny, h.p.bois, rad)) { a.x = nx; a.y = ny; a.ph += a.v * dt * 3.2 / Math.max(.3, T * .4); h.bloque = Math.max(0, h.bloque - dt); }
    else {                                                                                            // obstacle : on contourne (cap tourné du côté libre), sinon on s'arrête
      let ok = false;
      for (const dA of [.6, -.6, 1.2, -1.2, 1.9, -1.9]) { const q = a.a + dA; if (fauneLibre(a.x + Math.cos(q) * Math.max(1.5, T) * .8, a.y + Math.sin(q) * Math.max(1.5, T) * .8, h.p.bois, rad)) { a.a += dA * .5; a.v *= .6; ok = true; break; } }
      if (!ok) { a.a += (Math.random() < .5 ? 1 : -1) * 1.3; a.v = 0; a.d = null; }
      h.bloque += dt * .5;
    }
  }
}
function fauneGroupe(h, dt) {
  const c = h.c = fauneCentre(h);
  if (h.cat !== 'predateur' && h.mode !== 'fuite') {                                                  // un prédateur approche : fuite, à l'opposé
    for (const o of troupeaux) if (o.cat === 'predateur') for (const q of o.an) {
      const dx = c[0] - q.x, dy = c[1] - q.y, d = Math.hypot(dx, dy);
      if (d < 55 + h.spread) { const k = 90 / (d || 1); h.tp = [c[0] + dx * k, c[1] + dy * k]; if (!fauneLibre(h.tp[0], h.tp[1], h.p.bois)) h.tp = [h.home[0], h.home[1]]; fauneMode(h, 'fuite', 5 + Math.random() * 4); break; }
    }
  }
  if (h.mode === 'marcher' || h.mode === 'fuite') { if (Math.hypot(h.tp[0] - c[0], h.tp[1] - c[1]) < 5 + h.spread * .4 || h.bloque > 4) h.t = 0; }
  if ((h.t -= dt) <= 0) fauneSuite(h, c);
  for (const a of h.an) fauneAnimal(h, a, c, dt);
}
// pas de simulation ; renvoie vrai quand il faut redessiner (des animaux sont à l'écran, ~30 images par seconde)
let fauneVu = -1, fauneDelai = 0;                                                      // (la liste des foyers n'est relue que si le décor a changé, ou une fois par seconde : la filtrer à chaque image coûtait ~30 ms)
function fauneStep(dt) {
  fauneDelai -= dt;
  if (sceneV !== fauneVu || fauneDelai <= 0) {
  fauneVu = sceneV; fauneDelai = 1;
  const foyers = (S.ressources || []).filter(r => FAUNE_CATS.has(r.cat) && ANIMAUX[r.key]), sig = foyers.map(r => r.id + r.key + r.x + r.y + (r.ab || '')).join('|') + S.landSeed;
  if (sig !== fauneSig) {
    fauneSig = sig; const keep = new Map(troupeaux.map(h => [h.f.id + h.f.key + h.f.x + h.f.y + (h.f.ab || ''), h]));
    troupeaux = foyers.map(f => keep.get(f.id + f.key + f.x + f.y + (f.ab || '')) || fauneCree(f)).filter(Boolean);
  }
  }
  if (!troupeaux.length) return false;
  const [vx0, vy0] = toW(0, 0), [vx1, vy1] = toW(W, H), MV = 200;                       // (hors de la vue, un troupeau n'avance que par pas de 0,5 s : même comportement, 30 fois moins de calcul)
  for (const h of troupeaux) { const c = h.c || h.home; if (c[0] > vx0 - MV && c[0] < vx1 + MV && c[1] > vy0 - MV && c[1] < vy1 + MV) { fauneGroupe(h, dt + (h.acc || 0)); h.acc = 0; } else if ((h.acc = (h.acc || 0) + dt) >= .5) { fauneGroupe(h, h.acc); h.acc = 0; } }
  fauneAcc += dt; if (fauneAcc < 1 / 30) return false;
  fauneAcc = 0;
  const [x0, y0] = toW(0, 0), [x1, y1] = toW(W, H), m = 30;
  return troupeaux.some(h => h.an.some(a => a.x > x0 - m && a.x < x1 + m && a.y > y0 - m && a.y < y1 + m));
}

// ---- dessin ----
// les animaux marchent sous les arbres : les houppiers qui les recouvrent sont repeints par-dessus (mêmes modèles que le décor, donc sans raccord)
// intérieur des grands bois : l'aplat sombre du massif seulement (sans contour ni ombre, ils sont déjà sur le décor)
function fauneSousArbres(vus) {
  if (!vus.length || typeof floraNear !== 'function') return;
  const s = view.s, seen = new Set(), arbres = [];
  for (const [h, a] of vus) {
    const ra = h.T * a.s * .7;
    for (const f of floraNear(a.x - 16, a.y - 16, a.x + 16, a.y + 16)) {
      if (f.kind !== 'tree' || seen.has(f)) continue;
      if (Math.hypot(f.x - a.x, f.y - a.y) < (f.inner ? Math.max(f.r * 1.25, 5.8) : f.r) + ra) { seen.add(f); arbres.push(f); }
    }
  }
  if (!arbres.length) return;
  arbres.sort((p, q) => p.y - q.y);
  const masse = arbres.filter(f => f.inner);
  if (masse.length) { ctx.fillStyle = biomeLook().steps[0]; ctx.beginPath(); for (const f of masse) { const X = f.x * s + view.ox, Y = f.y * s + view.oy, R = Math.max(f.r * 1.25, 5.8) * s; ctx.moveTo(X + R, Y); ctx.arc(X, Y, R, 0, Math.PI * 2); } ctx.fill(); }
  for (const f of arbres) if (!f.inner) stampTree(ctx, f, f.x * s + view.ox, f.y * s + view.oy, s);
}
function drawFaune() {
  if (!troupeaux.length) return;
  const s = view.s, [x0, y0] = toW(0, 0), [x1, y1] = toW(W, H), m = 30, vus = [];
  for (const h of troupeaux) for (const a of h.an) if (a.x > x0 - m && a.x < x1 + m && a.y > y0 - m && a.y < y1 + m) vus.push([h, a]);
  vus.sort((p, q) => p[1].y - q[1].y);
  for (const [h, a] of vus) {
    const [X, Y] = toS(a.x, a.y), L = h.T * a.s * s;
    if (L < 3) { ctx.fillStyle = ANIMAUX[h.key].c; ctx.beginPath(); ctx.arc(X, Y, Math.max(1.2, L * .6), 0, 7); ctx.fill(); continue; }
    peintAnimal(h.key, X, Y, L, a.a + (a.v > .05 ? Math.sin(a.ph) * .05 : 0));
  }
  fauneSousArbres(vus);
}
// les noms des groupes : dessinés après la couche de cimes (draw), donc par-dessus les arbres
function drawFauneNoms() {
  if (!troupeaux.length) return;
  const s = view.s, [x0, y0] = toW(0, 0), [x1, y1] = toW(W, H);
  if (s > .12) for (const h of troupeaux) {
    if (!h.c || h.c[0] < x0 - 60 || h.c[0] > x1 + 60 || h.c[1] < y0 - 60 || h.c[1] > y1 + 60) continue;
    const [X, Y] = toS(h.c[0], h.c[1] - h.spread - h.T * 1.2);
    ctx.font = '600 14px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    haloText(FAUNE_NOM(h.key) + (h.an.length > 1 ? ' ×' + h.an.length : '') + (h.mode === 'fuite' ? ' !' : ''), X, Y, Col.ink, Col.sheet);
  }
}

// ---- régions du jeu : les animaux de la fiche de la région (data/regions/regions.json), posés une fois, à l'ouverture de la carte ----
if (typeof GAME !== 'undefined' && GAME && typeof MAPTEST === 'undefined' && !S.fauneInit && typeof fetch === 'function') {
  fetch('data/regions/regions.json').then(r => r.json()).then(all => {
    const fiche = (Array.isArray(all) ? all : Object.values(all)).find(r => r.id === GAME.region); if (!fiche || !fiche.animaux) return;
    const items = [];
    for (const [src, cat] of [['elevage', 'elevage'], ['faune', 'faune'], ['predateurs', 'predateur']]) for (const [key, ab] of Object.entries(fiche.animaux[src] || {})) items.push({ cat, key, ab });
    S.ressources = (S.ressources || []).concat(placeFoyers(GAME.seed, items)); S.fauneInit = 1; save(); requestDraw();
  }).catch(() => {});
}
