/* ---------- capture d'animaux par les fermiers ----------
   Fiche d'une ferme > une extension d'élevage > « Capturer » : on clique sur un animal sauvage de la carte (de l'espèce de l'enclos, cerclé). Le fermier (le travailleur n° 1) part, rejoint l'animal,
   le capture (CAPTURE_TEMPS s) ; l'animal le suit ensuite jusqu'à la ferme et rejoint l'enclos (e.n + 1, enclos plein : on relâche). État runtime : captures (pas sauvegardé).
   Un animal capturé est marqué a.captif (faune.js : il ne fait plus partie de la vie du groupe) : { suit:false } il attend, { suit:true, w } il suit le fermier. */
const CAPTURE_TEMPS = 4;
const captures = new Map();                                                      // id de la ferme → { k, g (groupe sauvage), a (animal), etat }
const animauxCapturables = k => (typeof troupeaux === 'undefined' ? [] : troupeaux).filter(g => g.cat !== 'predateur' && (FERME_EXT[k].especes || []).includes(g.key)).flatMap(g => g.an.filter(a => !a.captif).map(a => ({ g, a })));
function demarrerCapture(h, k) {
  const e = (h.ext || []).find(x => x.k === k), d = FERME_EXT[k]; if (!e || !d || !d.cap) return;
  if (captures.has(h.id)) { flash('Un fermier est déjà parti capturer un animal', true); return; }
  if ((e.n === undefined ? 2 : e.n) >= d.cap) { flash('Enclos plein', true); return; }
  if (!nbTrav(h)) { flash('Affectez un travailleur à la ferme', true); return; }
  if (!animauxCapturables(k).length) { flash(`Aucun animal capturable sur la carte (${d.especes.map(FAUNE_NOM).join(', ')})`, true); return; }
  captureEdit = { id:h.id, k }; renderSel(); requestDraw(); flash('Cliquez sur un animal sauvage à capturer (cerclé) · Échap : annuler');
}
function choisirCapture() {
  const h = findById('house', captureEdit.id); if (!h || !cursor) { captureEdit = null; return; }
  let best = null, bd = Math.max(5, 16 / view.s);
  for (const c of animauxCapturables(captureEdit.k)) { const d = segLen([c.a.x, c.a.y], cursor); if (d < bd) { bd = d; best = c; } }
  if (!best) { flash('Cliquez sur un animal capturable (cerclé)', true); return; }
  captures.set(h.id, { k:captureEdit.k, g:best.g, a:best.a, etat:null });
  best.a.captif = { suit:false }; best.a.v = 0; best.a.d = null;                                  // l'animal s'arrête : le fermier arrive
  const nom = FAUNE_NOM(best.g.key); captureEdit = null; renderSel(); requestDraw(); flash(`Un fermier part capturer : ${nom}`);
}
// pas du travailleur n° 1 de la ferme h ; renvoie vrai quand il est pris par la capture (le travail normal est suspendu)
function stepCapture(h, w, dt) {
  const c = captures.get(h.id); if (!c) return false;
  if (!c.g.an.includes(c.a)) { captures.delete(h.id); return false; }                              // (l'animal a disparu)
  const before = w.state, marche = (x, y) => marcher(w, x, y, WALK, dt);
  if (!c.etat) {
    if (w.state !== 'idle' && w.state !== 'wait') return false;                                       // il termine d'abord son travail en cours
    c.etat = 'go'; w.state = 'capGo'; w.carry = null; w.chemin = null;
  }
  if (c.etat === 'go') { if (marche(c.a.x, c.a.y)) { c.etat = 'prend'; w.state = 'capPrend'; w.t = CAPTURE_TEMPS; } }
  else if (c.etat === 'prend') { if ((w.t -= dt) <= 0) { c.etat = 'retour'; w.state = 'capBack'; w.chemin = null; c.a.captif = { suit:true, w }; } }
  else if (c.etat === 'retour') {
    if (marche(h.x, h.y)) {                                                                          // à la ferme : l'animal rejoint l'enclos
      const e = (h.ext || []).find(x => x.k === c.k), d = FERME_EXT[c.k], n = e ? (e.n === undefined ? 2 : e.n) : 0;
      c.g.an.splice(c.g.an.indexOf(c.a), 1); captures.delete(h.id);
      if (e && n < d.cap) { e.n = n + 1; (e.esp = e.esp || {})[c.g.key] = (e.esp[c.g.key] || 0) + 1; flash(`${FAUNE_NOM(c.g.key)} capturé : ${d.nom} (${e.n} / ${d.cap})`); save(); } else { c.a.captif = null; c.a.x = h.x; c.a.y = h.y; c.g.an.push(c.a); flash('Enclos plein : animal relâché', true); }
      w.state = 'idle'; w.t = 0; w.carry = null; w.chemin = null;
    }
  }
  if (w.state !== before && isOn('house', h.id, sel) && !zoneEdit) renderSel();
  return true;
}
// les animaux capturables sont cerclés pendant le choix
function drawCaptureCibles() {
  if (!captureEdit) return;
  const s = view.s;
  hint('Cliquez sur un animal sauvage à capturer (Échap : annuler)');
  for (const { g, a } of animauxCapturables(captureEdit.k)) {
    const [X, Y] = toS(a.x, a.y), r = Math.max(8, g.T * 1.2 * s), sur = cursor && segLen([a.x, a.y], cursor) < Math.max(5, 16 / s);
    ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2); ctx.strokeStyle = sur ? Col.accent : Col.good || '#4a8a3f'; ctx.lineWidth = sur ? 3 : 2; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
  }
}
