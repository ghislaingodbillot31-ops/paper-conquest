/* ---------- panneau ---------- */
// (chaque page n'a que ses propres sections : une commande absente de la page devient un élément détaché, sans effet)
const $ = id => document.getElementById(id) || document.createElement('div');
function setTool(t) {
  zoneEdit = null;
  if (draft && t !== tool) { draft = null; flash('Tracé non validé abandonné'); }
  tool = t; hover = null; renderTool(); requestDraw();
}
function renderTool() {
  for (const b of document.querySelectorAll('[data-tool]')) b.setAttribute('aria-pressed', b.dataset.tool === tool);
  for (const k of ['house', 'road', 'wall', 'tower', 'gate']) $(k + '-opts').hidden = tool !== k;
  for (const b of $('presets').children) b.setAttribute('aria-pressed', b.dataset.id === preset.id);
  $('swap').setAttribute('aria-pressed', swapped);
  $('swap').disabled = !preset.turn;
  $('yard-row').hidden = !preset.yard;
  $('build-info').innerHTML = `<b>${preset.name}</b> · ${preset.f} × ${preset.d} cases (${preset.f * CELL} × ${preset.d * CELL} m)<br>${preset.use}` +
      (preset.unique ? '<br>Un seul par village.' : '') + (preset.turn ? '' : '<br>Orientation fixe : façade sur la rue.');
  for (const b of $('road-kinds').children) b.setAttribute('aria-pressed', tool === 'road' && b.dataset.id === roadKind.id);
  cv.style.cursor = tool === 'select' ? 'default' : 'crosshair';
  if (typeof syncBarre === 'function') syncBarre(); // interface de la capitale (region.html)
}
const mini = (f, d) => `<span class="mini" style="grid-template-columns:repeat(${f},9px)">${'<i></i>'.repeat(f * d)}</span>`;
// liste groupée : bâtiments du village, puis bâtiments de ressources
const presetBtn = p => `
  <button class="preset" data-id="${p.id}" id="preset-${p.id}">
    ${mini(p.f, p.d)}<b>${p.name}</b><span>${p.f} × ${p.d}${p.cap ? ` · ${p.cap} hab.` : ''}</span>
  </button>`;
$('presets').innerHTML =
  '<h3 class="group">Village</h3>' + PRESETS.filter(p => !p.cat).map(presetBtn).join('') +
  '<h3 class="group">Agriculture</h3>' + PRESETS.filter(p => p.cat === 'agri').map(presetBtn).join('') +
  '<h3 class="group">Logistique et stockage</h3>' + PRESETS.filter(p => p.cat === 'logi').map(presetBtn).join('') +
  '<h3 class="group">Commerce</h3>' + PRESETS.filter(p => p.cat === 'com').map(presetBtn).join('') +
  '<h3 class="group">Ressources</h3>' + PRESETS.filter(p => p.cat === 'res').map(presetBtn).join('');
$('yard').innerHTML = extOptions(yardKind);
$('yard').addEventListener('change', e => { yardKind = e.target.value; requestDraw(); });
$('road-kinds').innerHTML = ROADS.map(r => `<button data-id="${r.id}" id="kind-${r.id}">${r.name}<kbd>${{ terre:'battue', gravier:'empierré', pave:'pierre' }[r.id]}</kbd></button>`).join('');
$('presets').addEventListener('click', e => {
  const b = e.target.closest('[data-id]'); if (!b) return;
  preset = PRESETS.find(p => p.id === b.dataset.id); custom = null; swapped = false;
  if (tool !== 'house') setTool('house'); else renderTool();
});
$('swap').addEventListener('click', swap);
$('road-kinds').addEventListener('click', e => {
  const b = e.target.closest('[data-id]'); if (!b) return;
  roadKind = ROADS.find(r => r.id === b.dataset.id);
  if (draft && draft.type === 'road') { draft.w = roadKind.w; draft.kind = roadKind.id; }
  if (tool !== 'road') setTool('road'); else { renderTool(); requestDraw(); }
});
document.querySelectorAll('[data-tool]').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
$('snap-len').addEventListener('change', e => { snapLen = e.target.checked; requestDraw(); });
$('finish-road').addEventListener('click', finishDraft);
$('undo-point').addEventListener('click', removeLastPoint);
$('cancel-road').addEventListener('click', () => { draft = null; requestDraw(); });
$('finish-wall').addEventListener('click', finishDraft);
$('undo-wall-point').addEventListener('click', removeLastPoint);
$('cancel-wall').addEventListener('click', () => { draft = null; requestDraw(); });
/* Tirage au hasard d'une rivière ou d'un lac, en évitant ce qui est déjà construit.
   Rivière : ne recouvre ni bâtiment, ni tour, ni porte (elle peut croiser routes et
   murailles : pont, grille d'eau). Lac : ne touche rien et reste à 12 m de la rivière. */
const builtPolys = () => [
  ...S.houses.map(h => shrunk(h)), ...S.towers.map(towerPoly), ...S.gates.map(gatePoly),
].map(P => ({ P, bb:bbox(P) }));
const linePolys = list => list.flatMap(o => o.pts.slice(1).map((q, i) => segRect(o.pts[i], q, o.w || WALL_W))).map(P => ({ P, bb:bbox(P) }));
function tryWater(make, ok) {
  for (let n = 0; n < 80; n++) { const w = make(); if (ok(w)) return w; }
  return null;
}
$('new-river').addEventListener('click', () => {
  const built = builtPolys();
  const rv = tryWater(() => {
    const vertical = Math.random() < .5, span = vertical ? TW : TH, len = vertical ? TH : TW;
    // méandres proportionnés à la carte : 2 à 4 grandes boucles, et des sinuosités plus fines
    const a1 = len * (.02 + Math.random() * .03), a2 = len * (.005 + Math.random() * .01), m = a1 + a2 + 40;
    return makeRiver({ vertical, base:m + Math.random() * (span - 2 * m),
      a1, f1:(2 + Math.random() * 2) * 2 * Math.PI / len, p1:Math.random() * 6.28,
      a2, f2:(7 + Math.random() * 5) * 2 * Math.PI / len, p2:Math.random() * 6.28 });
  }, rv => {
    const { river } = waterPolys([rv], []);
    if (river.some(q => built.some(b => bbHit(q.bb, b.bb) && polysOverlap(q.P, b.P)))) return false;
    // les lacs gardent leurs distances, et la nouvelle rivière ne coupe pas les autres
    if (S.lakes.some(lk => riverGap(rv, lk.pts) < rv.w1 / 2 + 12)) return false;
    return S.rivers.every(o => riverGap(rv, o.pts.filter((_, i) => i % 3 === 0)) > rv.w1 / 2 + o.w1 / 2 + 20);
  });
  if (!rv) { flash('Pas de place pour une rivière sans toucher vos bâtiments ni les autres cours d\'eau', true); return; }
  commit(); S.rivers.push(rv); changed(true); flash('Rivière ajoutée');
});
$('new-lake').addEventListener('click', () => {
  const blockers = [...builtPolys(), ...linePolys(S.roads), ...linePolys(S.walls)];
  const lk = tryWater(() => {
    const R = 25 + Math.random() * 55, m = R * 1.3 + 8;
    return makeLake(round2(m + Math.random() * (TW - 2 * m)), round2(m + Math.random() * (TH - 2 * m)), R, Math.random() * 6.28, Math.random() * 6.28);
  }, lk => {
    const P = lk.pts.map((p, i) => [lk.c, p, lk.pts[(i + 1) % lk.pts.length]]);
    if (P.some(t => blockers.some(b => bbHit(bbox(t), b.bb) && polysOverlap(t, b.P)))) return false;
    // un lac ne touche jamais une rivière, ni un autre lac
    if (S.rivers.some(rv => riverGap(rv, lk.pts) < rv.w1 / 2 + 12)) return false;
    return S.lakes.every(o => Math.min(...lk.pts.map(p => Math.min(...o.pts.map(q => segLen(p, q))))) > 30);
  });
  if (!lk) { flash('Pas de place libre pour un lac', true); return; }
  commit(); S.lakes.push(lk); changed(true); flash('Lac ajouté');
});
$('new-relief').addEventListener('click', () => {
  commit(); S.reliefSeed = 1 + Math.floor(Math.random() * 2147483000); changed(true);
  flash('Nouveau relief. Les cases trop pentues disparaissent ; Ctrl+Z pour revenir');
});
$('show-contours').addEventListener('change', e => setOpt('contours', e.target.checked));
$('show-grid').addEventListener('change', e => setOpt('grid', e.target.checked));
$('show-contours').checked = opts.contours;
$('show-grid').checked = opts.grid;
$('new-land').addEventListener('click', () => {
  commit(); S.landSeed = 1 + Math.floor(Math.random() * 2147483000); changed(false);
  flash('Nouvelle végétation. Ctrl+Z pour revenir à la précédente');
});
$('del-river').addEventListener('click', () => { if (!S.rivers.length) return; commit(); S.rivers.pop(); changed(true); });
$('del-lake').addEventListener('click', () => { if (!S.lakes.length) return; commit(); S.lakes.pop(); changed(true); });
$('biome').innerHTML = Object.entries(BIOMES).map(([k, b]) => `<option value="${k}">${b.name}</option>`).join('');
$('biome').value = S.biome;
$('river-mode').value = S.riverMode || 'auto';
const newRegion = (biome, seed) => {
  const mode = $('river-mode').value;
  commit(); generateRegion(biome, seed, mode); sel = null; draft = null; changed(true); fit();
  const rv = S.rivers[0], what = rv ? RIVER_CLASS[rv.cls].name.toLowerCase() : 'sans cours d\'eau';
  flash(`${BIOMES[biome].name} (${what}) : nouvelle région. Ctrl+Z pour revenir à la précédente`);
};
$('biome').addEventListener('change', e => newRegion(e.target.value, S.landSeed));
$('river-mode').addEventListener('change', () => newRegion($('biome').value, S.landSeed)); // même région, autre cours d'eau
$('new-region').addEventListener('click', () => newRegion($('biome').value, 1 + Math.floor(Math.random() * 2147483000)));
// éditeur : forme réelle d'une région du globe (vide : terrain rectangulaire)
$('forme-id').value = FORME_ID || '';
$('forme-id').addEventListener('change', e => { const id = Math.round(+e.target.value) || null; chargeForme(id); if (id && !FORME) flash('Région inconnue', true); newRegion($('biome').value, S.landSeed); });
$('undo').addEventListener('click', undo);
$('zin').addEventListener('click', () => zoomAt(W / 2, H / 2, 1.35));
$('zout').addEventListener('click', () => zoomAt(W / 2, H / 2, 1 / 1.35));
$('zfit').addEventListener('click', () => atelier.on ? fitAtelier() : fit());
$('zhome').addEventListener('click', () => atelier.on ? fitAtelier() : fitContent());
// atelier : liste complète des bâtiments (un clic l'affiche seul sur son carré), bouton carte / atelier
const GALLERY_GROUPS = [['', 'Village'], ['res', 'Ressources'], ['logi', 'Logistique'], ['com', 'Commerce'], ['agri', 'Agriculture']];
const drawable = PRESETS.filter(p => BUILD_DRAW[p.id]);
$('gallery').innerHTML = GALLERY_GROUPS.map(([cat, name]) => {
  const list = drawable.filter(p => (p.cat || '') === cat);
  return list.length ? `<p class="group">${name}</p>` + list.map(p => `<button class="gcard" data-kind="${p.id}" aria-pressed="false">${p.name}</button>`).join('') : '';
}).join('');
const syncAtelier = () => {
  $('atelier-toggle').textContent = atelier.on ? 'Voir la carte' : 'Voir l\'atelier';
  for (const b of document.querySelectorAll('.gcard')) b.setAttribute('aria-pressed', String(b.dataset.kind === atelier.kind));
};
syncAtelier();
for (const b of document.querySelectorAll('.gcard')) b.addEventListener('click', () => {
  atelier.kind = b.dataset.kind; atelier.on = true; saveAtelier(); syncAtelier(); fitAtelier();
});
$('atelier-toggle').addEventListener('click', () => {
  atelier.on = !atelier.on; saveAtelier(); syncAtelier();
  if (atelier.on) fitAtelier(); else fit();
});
$('zgrid').addEventListener('click', () => { setOpt('grid', !opts.grid); flash(opts.grid ? 'Quadrillage affiché' : 'Quadrillage masqué'); });
syncGridButton();
let clearArmed = null;
$('clear').addEventListener('click', e => {
  const b = e.currentTarget;
  if (!clearArmed) {
    b.textContent = 'Confirmer : tout effacer';
    clearArmed = setTimeout(() => { b.textContent = 'Vider le plan'; clearArmed = null; }, 3000);
    return;
  }
  clearTimeout(clearArmed); clearArmed = null; b.textContent = 'Vider le plan';
  commit(); S = normalize({ nextId:S.nextId }); sel = null; draft = null; changed(true);
  flash('Plan vidé. Ctrl+Z pour revenir en arrière');
});
$('json').addEventListener('click', () => { $('json-text').value = JSON.stringify(S, null, 1); $('json-dlg').hidden = false; });
$('json-close').addEventListener('click', () => { $('json-dlg').hidden = true; });
$('json-copy').addEventListener('click', () => {
  const t = $('json-text');
  navigator.clipboard.writeText(t.value).then(() => flash('Plan copié'), () => { t.select(); flash('Sélectionné : faites Ctrl+C'); });
});
$('json-import').addEventListener('click', () => {
  try {
    const o = JSON.parse($('json-text').value);
    if (!o || !Array.isArray(o.houses) || !Array.isArray(o.roads)) throw 0;
    commit();
    normalize(o);
    const ids = ['houses', 'roads', 'walls', 'towers', 'gates'].flatMap(k => o[k].map(x => x.id));
    S = { nextId:o.nextId || 1 + Math.max(0, ...ids), houses:o.houses, roads:o.roads, walls:o.walls, towers:o.towers, gates:o.gates, rivers:o.rivers, lakes:o.lakes, landSeed:o.landSeed, reliefSeed:o.reliefSeed, gold:o.gold, bourg:o.bourg, biome:o.biome, cut:o.cut || [], planted:o.planted || [], grown:o.grown || [], simTime:o.simTime || 0 };
    sel = null; draft = null; computeZones(); fixGates(); changed(true); $('json-dlg').hidden = true; flash('Plan importé');
  } catch (err) { flash('Ce texte n\'est pas un plan valide (il faut des listes "houses" et "roads")', true); }
});

function renderSel() {
  const o = findSel(), body = $('sel-body');
  $('fiche').hidden = !o; // capitale : la fiche de sélection ne s'affiche que s'il y a une sélection
  if (!o) { body.innerHTML = '<p class="muted">Cliquez un bâtiment pour le déplacer, le pivoter ou le supprimer. Cliquez une route pour changer son type. Cliquez une muraille, une tour ou une porte pour la supprimer.</p>'; return; }
  const del = '<button id="sdel" class="danger">Supprimer</button>';
  const fortRow = (type, o) => { const L = lvlOf(o), names = FORT_LEVELS[type];
    return { dl:`<dt>Niveau</dt><dd>${L} / 3 · ${names[L - 1]}</dd>`, btn:L < 3 ? `<button id="sup">Améliorer en ${names[L].toLowerCase()}</button>` : '' }; };
  if (sel.type === 'wall') {
    const n = S.towers.filter(t => o.pts.some(q => segLen(q, [t.x, t.y]) < .6)).length;
    body.innerHTML = `
      <dl class="kv"><dt>Fortification</dt><dd>${fmt(roadLen(o))} m · emprise 1 case (${WALL_W} m)</dd>${fortRow('wall', o).dl}
      <dt>Tronçons</dt><dd>${o.pts.length - 1}${segLen(o.pts[0], o.pts[o.pts.length - 1]) < .01 ? ' · enceinte fermée' : ''}</dd>
      <dt>Tours</dt><dd>${n}</dd></dl>
      <div class="row">${fortRow('wall', o).btn}${del}</div>
      <p class="muted" style="margin-top:8px">Supprimer la muraille retire les tours qui ne sont plus sur une fortification.</p>`;
  } else if (sel.type === 'tower') {
    body.innerHTML = `
      <dl class="kv"><dt>Tour</dt><dd>emprise de ${TOWER_R * 2} m</dd>${fortRow('tower', o).dl}
      <dt>Position</dt><dd>${fmt(o.x)} ; ${fmt(o.y)} m</dd></dl>
      <div class="row">${fortRow('tower', o).btn}${del}</div>`;
  } else if (sel.type === 'gate') {
    const r = roadThroughGate(o);
    body.innerHTML = `
      <dl class="kv"><dt>Porte</dt><dd>passage de ${WALL_SURF} m à travers la fortification</dd>${fortRow('gate', o).dl}
      <dt>Route</dt><dd>${r ? roadType(r).name : 'aucune (une route peut partir d\'ici)'}</dd></dl>
      <div class="row">${fortRow('gate', o).btn}${del}</div>`;
  } else if (sel.type === 'house') {
    const b = buildingOf(o);
    const yardSel = b && b.yard
      ? `<div class="row" style="margin-bottom:8px"><label for="syard">Arrière-cour<select id="syard">${extOptions(yardOf(o))}</select></label></div>`
      : '';
    body.innerHTML = `
      <dl class="kv"><dt>Bâtiment</dt><dd>${o.type}</dd>
      ${b ? `<dt>Rôle</dt><dd>${b.use}</dd>` : ''}
      ${b && b.cap ? `<dt>Habitants</dt><dd>${b.cap} au plus</dd>` : ''}
      ${b && b.radius && !b.zone ? `<dt>Portée</dt><dd>${b.radius} m autour</dd>` : ''}
      ${b && b.zone ? `<dt>Zone de travail</dt><dd>${o.zone ? `rayon ${o.zone.r} m, à ${fmt(segLen([o.x, o.y], [o.zone.x, o.zone.y]), 0)} m${b.need === 'forest' || b.id === 'hutte_forestier' ? ` · ${treesInZone(o.zone).length} arbres` : ''}` : '<b style="color:var(--bad)">à définir</b>'}</dd>` : ''}
      ${o.kind === 'hutte_forestier' && o.zone ? `<dt>Plants en terre</dt><dd>${(S.planted || []).filter(s => segLen([s.x, s.y], [o.zone.x, o.zone.y]) <= o.zone.r).length} (arbres au bout de ${GROW} s)</dd>
      <dt>Plantés en tout</dt><dd>${o.stock || 0}</dd>
      <dt>Forestier</dt><dd>${FORESTER_STATE[(workers.get(o.id) || { state:'idle' }).state]}</dd>` : ''}
      ${LUMBER[o.kind] && o.zone ? `<dt>Arbres dans la zone</dt><dd>${treesInZone(o.zone).length}</dd>
      <dt>Stock</dt><dd>${o.stock || 0} ${LUMBER[o.kind]}</dd>
      <dt>Bûcheron</dt><dd>${WORKER_STATE[(workers.get(o.id) || { state:'idle' }).state]}</dd>` : ''}
      ${(J => J ? jobSheet(o, J) : '')(jobOf(o))}
      ${b && b.limit ? `<dt>Limite</dt><dd>${S.houses.filter(x => x.kind === b.id).length} / ${b.limit} sur la région</dd>` : ''}
      <dt>Cases</dt><dd>${o.f} × ${o.d} (façade × profondeur) · ${o.w} × ${o.l} m</dd></dl>
      ${yardSel}
      <div class="row">
        ${!b || b.turn ? '<button id="srot">Pivoter</button>' : ''}
        <button id="sdel" class="danger" style="margin-left:auto">Supprimer</button>
      </div>`;
    if ($('srot')) $('srot').addEventListener('click', swap);
    if ($('syard')) $('syard').addEventListener('change', e => { commit(); o.yard = e.target.value; changed(false); });
    // zone de travail : bouton pour la définir / la déplacer, et réglage du rayon pendant la pose
    if (b && b.zone) {
      const box = document.createElement('div');
      box.style.marginTop = '10px';
      box.innerHTML = zoneEdit && zoneEdit.id === o.id
        ? `<p class="muted" style="margin:0 0 6px">Cliquez sur la carte pour poser le centre de la zone (à ${ZONE_REACH} m au plus du bâtiment, sur votre domaine). <kbd>Échap</kbd> pour annuler.</p>
           <label class="check" for="zone-r" style="flex-direction:column;align-items:stretch">Rayon : <b id="zone-r-val">${zoneEdit.r} m</b>
           <input id="zone-r" type="range" min="${ZONE_MIN_R}" max="${b.radius}" step="5" value="${zoneEdit.r}"></label>
           <div class="row" style="margin-top:6px"><button id="zone-cancel">Annuler</button></div>`
        : `<button id="zone-edit">${o.zone ? 'Déplacer la zone de travail' : 'Définir la zone de travail'}</button>`;
      body.appendChild(box);
      if ($('zone-edit')) $('zone-edit').addEventListener('click', () => { zoneEdit = { id:o.id, r:o.zone ? o.zone.r : b.radius }; renderSel(); requestDraw(); });
      if ($('zone-r')) $('zone-r').addEventListener('input', e => { zoneEdit.r = +e.target.value; $('zone-r-val').textContent = zoneEdit.r + ' m'; requestDraw(); });
      if ($('zone-cancel')) $('zone-cancel').addEventListener('click', () => { zoneEdit = null; renderSel(); requestDraw(); });
    }
  } else {
    body.innerHTML = `
      <dl class="kv"><dt>Longueur</dt><dd>${fmt(roadLen(o))} m</dd>
      <dt>Revêtement</dt><dd>${roadType(o).name}</dd>
      <dt>Largeur</dt><dd>${fmt(roadType(o).surf)} m de chaussée · emprise 1 case (${o.w} m)</dd>
      <dt>Tronçons</dt><dd>${o.pts.length - 1}</dd></dl>
      <div class="row">
        <label for="skind">Revêtement<select id="skind">${ROADS.map(r => `<option value="${r.id}"${r.id === o.kind ? ' selected' : ''}>${r.name}</option>`).join('')}</select></label>
        <button id="sdel" class="danger" style="margin-left:auto;align-self:flex-end">Supprimer</button>
      </div>
      <p class="muted" style="margin-top:8px">Supprimer la route laisse les bâtiments en place ; seules ses cases libres disparaissent.</p>`;
    $('skind').addEventListener('change', e => {
      const k = ROADS.find(r => r.id === e.target.value);
      // l'emprise reste d'une case : changer de type ne déplace ni cases ni bâtiments
      commit(); o.w = k.w; o.kind = k.id; changed(true);
    });
  }
  $('sdel').addEventListener('click', deleteSel);
  if ($('sup')) $('sup').addEventListener('click', () => { commit(); o.lvl = Math.min(3, lvlOf(o) + 1); changed(false); flash(`Amélioré : ${FORT_LEVELS[sel.type][o.lvl - 1].toLowerCase()}`); });
}
function updateStatus() {
  const built = S.houses.reduce((s, h) => s + h.w * h.l, 0);
  const cap = S.houses.reduce((s, h) => s + ((buildingOf(h) || {}).cap || 0), 0); // logements
  if (freeCells.v !== sceneV) { let n = 0; for (const c of Z.cells) if (c.occ === null) n++; freeCells.n = n; freeCells.v = sceneV; } // (une fois par changement du décor)
  const free = freeCells.n;
  const len = S.roads.reduce((s, r) => s + roadLen(r), 0);
  const c = cursor && inTerrain(cursor)
    ? `x <b>${fmt(cursor[0])}</b> · y <b>${fmt(cursor[1])}</b> m` + (RELIEF_ON ? ` · altitude <b>${fmt(hAt(...cursor))}</b> m` : '')
    : 'hors terrain';
  const html =
    `<span>${c}</span><span>Trésor <b>${fmt(S.gold, 0)}</b> Or</span>` +
    `<span><b>${S.houses.length}</b> bâtiments · logements pour <b>${cap}</b> habitants</span>` +
    `<span><b>${free}</b> cases libres</span><span><b>${fmt(len, 0)}</b> m de routes</span>` +
    `<span><b>${fmt(S.walls.reduce((s, w) => s + roadLen(w), 0), 0)}</b> m de murailles · <b>${S.towers.length}</b> tours · <b>${S.gates.length}</b> portes</span>` +
    `<span>1 case = 8 × 8 m</span>`;
  // la barre d'état n'est réécrite que si son texte change (pas de mise en page à chaque image)
  if (html !== lastStatus) { lastStatus = html; $('status').innerHTML = html; $('villageois').textContent = fmt(cap, 0); }
}
let lastStatus = '';
const freeCells = { v:-1, n:0 };
