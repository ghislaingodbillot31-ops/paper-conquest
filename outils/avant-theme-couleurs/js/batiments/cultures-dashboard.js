/* ---------- dashboard développeur : cultures et saisons ----------
   Tableau des cultures (cultures.js) : on renseigne mois de plantation et de récolte et toutes les durées, on modifie en direct (le calendrier se redessine) et on VALIDE :
   les valeurs sont alors enregistrées (cultures.v1) et le jeu les prend en compte aussitôt (même dans les autres onglets). « Exporter » donne le JSON à coller dans Notion ou à me transmettre.
   Utilisé par editeur-cultures.html (onglet Cultures du studio) et par le bouton « Cultures » du test jeu (region.html?test=1). */
(function () {
  const TYPES = { legume:'Légume', cereale:'Céréale', fruit:'Fruit d’arbre' };
  const clone = o => JSON.parse(JSON.stringify(o));
  const heures = j => { const ms = typeof JOUR_MS !== 'undefined' ? JOUR_MS : 12 * 24 * 3600 * 1000 / 365, h = j * ms / 3600000; return h >= 48 ? (h / 24).toFixed(1) + ' j réels' : h.toFixed(1) + ' h réelles'; };
  const css = `.cd{font:13px/1.35 "Barlow",system-ui,sans-serif; color:var(--cd-ink,#1e3a4c); background:var(--cd-bg,#f5f7f2); padding:14px; box-sizing:border-box; height:100%; overflow:auto}
  .cd h2{margin:0 0 4px; font:700 20px "Barlow Condensed",system-ui,sans-serif; letter-spacing:.04em} .cd p{margin:0 0 10px; color:var(--cd-soft,#5b7080)}
  .cd .barre{display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin:10px 0; position:sticky; top:-14px; background:var(--cd-bg,#f5f7f2); padding:8px 0; z-index:2}
  .cd button{font:inherit; padding:5px 12px; border:1px solid var(--cd-line,#b9c5c0); background:var(--cd-btn,#fff); color:inherit; border-radius:4px; cursor:pointer}
  .cd button.ok{background:#2f7d4f; color:#fff; border-color:#2f7d4f} .cd button.on{background:var(--cd-ink,#1e3a4c); color:var(--cd-bg,#f5f7f2)} .cd button:disabled{opacity:.45; cursor:not-allowed}
  .cd .msg{margin-left:auto; font-weight:600} .cd .msg.bad{color:#c23b30} .cd .msg.good{color:#2f7d4f}
  .cd table{border-collapse:collapse; width:100%; min-width:1100px} .cd th,.cd td{border-bottom:1px solid var(--cd-line,#d3dbd7); padding:4px 6px; text-align:left; vertical-align:middle}
  .cd th{position:sticky; top:34px; background:var(--cd-bg,#f5f7f2); font-weight:600; font-size:12px; z-index:1}
  .cd input,.cd select{font:inherit; padding:3px 5px; border:1px solid var(--cd-line,#b9c5c0); border-radius:3px; background:var(--cd-btn,#fff); color:inherit; box-sizing:border-box}
  .cd input[type=number]{width:62px} .cd input.nom{width:130px} .cd input.prod{width:120px} .cd .err{border-color:#c23b30; background:#fdeceb}
  .cd .cal{display:grid; grid-template-columns:repeat(12,14px); gap:1px} .cd .cal i{height:14px; border-radius:2px; background:#e3e8e5; font-style:normal; font-size:8px; text-align:center; line-height:14px; color:#6b7b86}
  .cd .cal i.p{background:#6bbf7a} .cd .cal i.r{background:#e8a33a} .cd .cal i.pr{background:linear-gradient(135deg,#6bbf7a 50%,#e8a33a 50%)}
  .cd small{color:var(--cd-soft,#5b7080)} .cd .leg{display:flex; gap:12px; margin:4px 0 0; font-size:12px} .cd .leg b{display:inline-block; width:12px; height:12px; border-radius:2px; vertical-align:-2px; margin-right:4px}
  .cd textarea{width:100%; height:200px; font:12px "IBM Plex Mono",monospace; box-sizing:border-box}`;
  function monter(root) {
    if (!document.getElementById('cd-css')) { const s = document.createElement('style'); s.id = 'cd-css'; s.textContent = css; document.head.appendChild(s); }
    let draft = clone(CULTURES), filtre = 'tous', msg = null;
    const mois = (v, id, vide) => `<select data-k="${id}">${vide ? '<option value="">-</option>' : ''}${MOIS_C.map((n, i) => `<option value="${i + 1}"${v === i + 1 ? ' selected' : ''}>${i + 1} ${n}</option>`).join('')}</select>`;
    const cal = c => `<div class="cal">${MOIS_C.map((n, i) => { const p = moisDans(i + 1, c.plantation), r = moisDans(i + 1, c.recolte); return `<i class="${p && r ? 'pr' : p ? 'p' : r ? 'r' : ''}" title="${n}${p ? ' : plantation' : ''}${r ? ' : récolte' : ''}">${n[0].toUpperCase()}</i>`; }).join('')}</div>`;
    function erreurs(c) {
      const e = new Set(), m = v => Number.isInteger(v) && v >= 1 && v <= 12;
      if (!c.nom || !String(c.nom).trim()) e.add('nom'); if (!c.produit || !String(c.produit).trim()) e.add('produit');
      if (!c.recolte || !m(c.recolte[0]) || !m(c.recolte[1])) e.add('recolte');
      if (c.type !== 'fruit' && (!c.plantation || !m(c.plantation[0]) || !m(c.plantation[1]))) e.add('plantation');
      if (c.type !== 'fruit' && !(c.pousse >= 1)) e.add('pousse'); if (!(c.fenetre >= 1)) e.add('fenetre'); if (!(c.rendement >= 1)) e.add('rendement'); if (!(c.cadence >= 1)) e.add('cadence');
      return e;
    }
    const nbErr = () => Object.values(draft).reduce((s, c) => s + erreurs(c).size, 0);
    const modifie = () => JSON.stringify(draft) !== JSON.stringify(CULTURES);
    function dessiner() {
      const lignes = Object.entries(draft).filter(([, c]) => filtre === 'tous' || c.type === filtre).map(([id, c]) => {
        const e = erreurs(c), cl = k => e.has(k) ? ' err' : '', fruit = c.type === 'fruit', p = c.plantation || [null, null];
        return `<tr data-id="${id}"><td><input class="nom${cl('nom')}" data-k="nom" value="${String(c.nom).replace(/"/g, '&quot;')}"></td>
          <td><select data-k="type">${Object.entries(TYPES).map(([k, n]) => `<option value="${k}"${c.type === k ? ' selected' : ''}>${n}</option>`).join('')}</select></td>
          <td><input class="prod${cl('produit')}" data-k="produit" value="${String(c.produit).replace(/"/g, '&quot;')}"></td>
          <td>${fruit ? '<small>aucune (arbre)</small>' : mois(p[0], 'p0', true) + ' à ' + mois(p[1], 'p1', true)}</td>
          <td>${mois(c.recolte[0], 'r0') + ' à ' + mois(c.recolte[1], 'r1')}</td>
          <td>${fruit ? '<small>-</small>' : `<input type="number" min="1" data-k="pousse" class="${cl('pousse')}" value="${c.pousse}"><br><small>${heures(c.pousse)}</small>`}</td>
          <td><input type="number" min="1" data-k="fenetre" class="${cl('fenetre')}" value="${c.fenetre}"><br><small>${heures(c.fenetre)}</small></td>
          <td><input type="number" min="1" data-k="rendement" class="${cl('rendement')}" value="${c.rendement}"></td>
          <td><input type="number" min="1" data-k="cadence" class="${cl('cadence')}" value="${c.cadence}"></td>
          <td data-cal>${cal(c)}</td>
          <td>${CULTURES_DEFAUT[id] ? '' : '<button data-act="suppr" title="Supprimer cette culture">✕</button>'}</td></tr>`;
      }).join('');
      const nb = nbErr(), mod = modifie();
      root.innerHTML = `<div class="cd"><h2>Cultures et saisons <small>· développeur</small></h2>
        <p>Mois de plantation, mois de récolte et durées de chaque culture. Modifiez en direct puis <b>Valider</b> : le jeu utilise aussitôt ces valeurs. Durées en jours de jeu (1 mois de jeu = 24 h réelles).</p>
        <div class="barre"><button class="ok" data-act="valider"${nb || !mod ? ' disabled' : ''}>Valider${mod ? ' *' : ''}</button><button data-act="annuler"${mod ? '' : ' disabled'}>Annuler les modifications</button>
          <button data-act="defaut">Valeurs par défaut</button><button data-act="export">Exporter JSON</button><button data-act="import">Importer JSON</button><button data-act="ajout">+ Culture</button>
          ${['tous', 'legume', 'cereale', 'fruit'].map(k => `<button data-f="${k}" class="${filtre === k ? 'on' : ''}">${k === 'tous' ? 'Tout' : TYPES[k] + 's'}</button>`).join('')}
          <span class="msg ${msg && msg.bad ? 'bad' : 'good'}">${nb ? nb + ' champ(s) invalide(s)' : msg ? msg.t : mod ? 'Modifications non validées' : ''}</span></div>
        <table><thead><tr><th>Culture</th><th>Type</th><th>Article produit</th><th>Mois de plantation</th><th>Mois de récolte</th><th>Pousse (jours)</th><th>Fenêtre de récolte (jours)</th><th>Rendement</th><th>Cadence (s/unité)</th><th>Calendrier</th><th></th></tr></thead><tbody>${lignes}</tbody></table>
        <div class="leg"><span><b style="background:#6bbf7a"></b>plantation</span><span><b style="background:#e8a33a"></b>récolte</span><span><b style="background:linear-gradient(135deg,#6bbf7a 50%,#e8a33a 50%)"></b>les deux</span></div>
        <p style="margin-top:10px"><small>Pousse : jours entre la plantation et la maturité. Fenêtre : jours pendant lesquels la culture mûre peut être récoltée, ensuite elle est perdue. Rendement : unités par saison et par bâtiment. Cadence : secondes par unité cueillie (potager, verger). Les fruits n'ont pas de plantation : ils ne mûrissent que pendant les mois de récolte, puis il n'y en a plus jusqu'à l'année suivante.</small></p>
        <div data-zone></div></div>`;
    }
    root.addEventListener('input', e => {
      const t = e.target, tr = t.closest('tr[data-id]'), k = t.dataset && t.dataset.k; if (!tr || !k) return;
      const c = draft[tr.dataset.id], v = t.type === 'number' ? parseFloat(t.value) : t.value;
      if (k === 'p0' || k === 'p1') { const o = c.plantation || [null, null]; o[k === 'p0' ? 0 : 1] = t.value === '' ? null : +t.value; c.plantation = o[0] === null && o[1] === null ? null : o; }
      else if (k === 'r0' || k === 'r1') c.recolte[k === 'r0' ? 0 : 1] = +t.value;
      else if (k === 'type') { c.type = t.value; if (c.type === 'fruit') c.plantation = null; else if (!c.plantation) c.plantation = [3, 4]; msg = null; dessiner(); return; }
      else c[k] = v;
      msg = null; const ok = nbErr() === 0, mod = modifie();                     // (on ne redessine pas tout : on garde le focus de saisie)
      tr.querySelector('[data-cal]').innerHTML = cal(c);
      const bv = root.querySelector('[data-act=valider]'), ba = root.querySelector('[data-act=annuler]'), m = root.querySelector('.msg');
      bv.disabled = !ok || !mod; ba.disabled = !mod; bv.textContent = 'Valider' + (mod ? ' *' : '');
      m.className = 'msg ' + (ok ? 'good' : 'bad'); m.textContent = ok ? (mod ? 'Modifications non validées' : '') : nbErr() + ' champ(s) invalide(s)';
      t.classList.toggle('err', erreurs(c).has(k));
    });
    root.addEventListener('change', e => { const k = e.target.dataset && e.target.dataset.k; if (k === 'pousse' || k === 'fenetre' || k === 'type') dessiner(); });
    root.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.f) { filtre = b.dataset.f; dessiner(); return; }
      const a = b.dataset.act, zone = () => root.querySelector('[data-zone]');
      if (a === 'valider') { if (nbErr()) return; sauverCultures(draft); chargerCultures(); draft = clone(CULTURES); msg = { t:'Validé : le jeu utilise ces valeurs (enregistrées dans le navigateur).' }; dessiner(); }
      else if (a === 'annuler') { draft = clone(CULTURES); msg = { t:'Modifications annulées.' }; dessiner(); }
      else if (a === 'defaut') { if (confirm('Remettre toutes les cultures aux valeurs par défaut (brouillon, à valider) ?')) { draft = clone(CULTURES_DEFAUT); msg = null; dessiner(); } }
      else if (a === 'export') { zone().innerHTML = '<p>JSON des cultures (à copier) :</p><textarea readonly></textarea>'; const ta = zone().querySelector('textarea'); ta.value = JSON.stringify(draft, null, 1); ta.select(); try { navigator.clipboard.writeText(ta.value); } catch (er) {} }
      else if (a === 'import') { zone().innerHTML = '<p>Collez le JSON puis importez (brouillon, à valider) :</p><textarea></textarea><br><button data-act="import-ok">Importer</button>'; }
      else if (a === 'import-ok') { try { const o = JSON.parse(zone().querySelector('textarea').value); if (!o || typeof o !== 'object') throw 0; draft = clone(o); msg = null; dessiner(); } catch (er) { msg = { t:'JSON invalide', bad:true }; dessiner(); } }
      else if (a === 'ajout') { let n = 1; while (draft['culture_' + n]) n++; draft['culture_' + n] = { nom:'Nouvelle culture', type:filtre === 'tous' ? 'legume' : filtre, produit:'légumes', plantation:filtre === 'fruit' ? null : [3, 5], recolte:[7, 9], pousse:90, fenetre:40, rendement:20, cadence:6 }; msg = null; dessiner(); }
      else if (a === 'suppr') { delete draft[b.closest('tr').dataset.id]; msg = null; dessiner(); }
    });
    dessiner();
    return { rafraichir() { draft = clone(CULTURES); dessiner(); } };
  }
  window.montrerCultures = monter;
})();
