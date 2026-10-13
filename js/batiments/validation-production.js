/* ---------- validateur de la production (données : data/production/*.json) ----------
   Une seule fonction, validerProduction(donnees), utilisée par la page validation-production.html (onglet Dev du studio) et par la commande outils/valider-production.js.
   Elle ne modifie rien : elle lit les ressources, les ateliers et les recettes, et rend un rapport.

   donnees = { index, ressources, ateliers, recettes, couts, foyers, services, commerce }  (les quatre derniers : couts_construction.json, besoins_foyers.json, besoins_services.json, commerce.json ; facultatifs)
     - index      : { filieres:[{ id, nom, ordre, migree }] }  (une filière « migrée » a ses recettes saisies)
     - ressources : [{ id, nom, categorie, filiere, final, type, depart, attendu:[ateliers], unSeulIngredientVoulu }]
     - ateliers   : [{ id, nom, filiere }]
     - recettes   : [{ id, atelier, entrees:[{ressource, qte}], sorties:[…], sousProduits:[…], outils:[ressource] }]  (toutes filières migrées confondues)

   Règle d'or : une erreur n'est levée que pour ce qui appartient à une filière MIGRÉE. Le reste est « en attente » (information) : on ne peut pas reprocher à la filière Métal de ne pas encore avoir de cuir. */
(function (racine, fabrique) {
  if (typeof module === 'object' && module.exports) module.exports = fabrique(); else racine.ValidationProduction = fabrique();
})(this, function () {
  const CATEGORIES_NATURELLES = ['Naturel', 'Importé'];       // ces ressources n'ont pas besoin d'être produites par une recette
  const TYPES_FINAUX = ['outil', 'arme', 'armure'];           // outils et armes s'usent puis se remplacent : ils ne sont pas des culs-de-sac

  function validerProduction(d) {
    const migrees = new Set(d.index.filieres.filter(f => f.migree).map(f => f.id));
    const res = new Map(d.ressources.map(r => [r.id, r])), ateliers = new Map(d.ateliers.map(a => [a.id, a]));
    const erreurs = [], avertissements = [], attente = [];
    const signaler = (liste, code, message, ressource) => liste.push({ code, message, ressource:ressource || null });
    const nom = id => (res.get(id) || { nom:id }).nom;

    // qui produit quoi, qui utilise quoi (recettes des filières migrées)
    const produit = new Map(), utilise = new Map();
    const ajoute = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
    for (const r of d.recettes) {
      for (const s of [...r.sorties, ...(r.sousProduits || [])]) ajoute(produit, s.ressource, r.id);
      for (const e of r.entrees) ajoute(utilise, e.ressource, r.id);
      for (const o of r.outils || []) ajoute(utilise, o, r.id);
    }

    // 1. recettes : atelier existant, ressources connues, entrées présentes
    for (const r of d.recettes) {
      if (!ateliers.has(r.atelier)) signaler(erreurs, 'atelier-inexistant', 'Recette « ' + r.id + ' » : l\'atelier « ' + r.atelier + ' » n\'existe pas.');
      for (const x of [...r.entrees, ...r.sorties, ...(r.sousProduits || [])]) if (!res.has(x.ressource)) signaler(erreurs, 'ressource-inconnue', 'Recette « ' + r.id + ' » : la ressource « ' + x.ressource + ' » n\'est pas dans ressources.json.', x.ressource);
      for (const o of r.outils || []) if (!res.has(o)) signaler(erreurs, 'ressource-inconnue', 'Recette « ' + r.id + ' » : l\'outil « ' + o + ' » n\'est pas dans ressources.json.', o);
      if (!r.entrees.length && !r.extraction) signaler(avertissements, 'recette-sans-entree', 'Recette « ' + r.id + ' » : aucune entrée (pour une récolte, ajoute « extraction: true »).');
    }

    // 2. cul-de-sac : une ressource d'une filière migrée qui n'entre dans aucune recette (et n'est ni finale, ni un outil)
    for (const r of d.ressources) {
      if (r.final || TYPES_FINAUX.includes(r.type) || utilise.has(r.id)) continue;
      if (!produit.has(r.id) && !migrees.has(r.filiere)) continue;                       // (ni produite ni utilisée, d'une filière à venir : rien à dire)
      const utilisateurs = (r.attendu || []).map(a => ateliers.get(a)).filter(Boolean);
      const enAttente = utilisateurs.length && utilisateurs.every(a => !migrees.has(a.filiere));
      if (enAttente) signaler(attente, 'cul-de-sac-attendu', nom(r.id) + ' : sera utilisée par ' + utilisateurs.map(a => a.nom).join(', ') + ' (filière pas encore migrée).', r.id);
      // (sinon : la règle 6 « débouchés » ci-dessous la signale si elle ne sert vraiment à rien : coût de construction, besoin de foyer, export…)
    }

    // 3. inatteignable : utilisée en entrée mais ni produite, ni naturelle, ni importée, ni dans le stock de départ
    for (const [id] of utilise) {
      const r = res.get(id); if (!r || produit.has(id) || CATEGORIES_NATURELLES.includes(r.categorie) || r.depart) continue;
      if (migrees.has(r.filiere)) signaler(erreurs, 'inatteignable', nom(id) + ' : utilisée par des recettes mais jamais produite (catégorie ' + r.categorie + ').', id);
      else signaler(attente, 'inatteignable-attendu', nom(id) + ' : sera produite par la filière « ' + r.filiere + ' » (pas encore migrée).', id);
    }
    for (const r of d.ressources) if (migrees.has(r.filiere) && !produit.has(r.id) && !CATEGORIES_NATURELLES.includes(r.categorie) && !r.depart && !utilise.has(r.id))
      signaler(erreurs, 'inatteignable', nom(r.id) + ' : jamais produite (catégorie ' + r.categorie + ').', r.id);

    // 4. outils, armes et armures : au moins deux ingrédients (le gourdin, arme primitive, est une exception voulue)
    for (const r of d.recettes) for (const s of r.sorties) {
      const x = res.get(s.ressource); if (!x || !TYPES_FINAUX.includes(x.type) || x.unSeulIngredientVoulu) continue;
      if (r.entrees.length < 2) signaler(avertissements, 'un-seul-ingredient', 'Recette « ' + r.id + ' » (' + nom(x.id) + ') : ' + r.entrees.length + ' seul ingrédient.', x.id);
    }

    // 5. cycles (composantes fortement connexes, algorithme de Tarjan) : entrée → sortie, et outil → sortie
    const succ = new Map(); const arete = (a, b) => ajoute(succ, a, b);
    for (const r of d.recettes) for (const s of r.sorties) { for (const e of r.entrees) arete(e.ressource, s.ressource); for (const o of r.outils || []) arete(o, s.ressource); }
    let indice = 0; const idx = new Map(), bas = new Map(), pile = [], surPile = new Set(), cycles = [];
    const visiter = v => {
      idx.set(v, indice); bas.set(v, indice); indice++; pile.push(v); surPile.add(v);
      for (const w of succ.get(v) || []) { if (!idx.has(w)) { visiter(w); bas.set(v, Math.min(bas.get(v), bas.get(w))); } else if (surPile.has(w)) bas.set(v, Math.min(bas.get(v), idx.get(w))); }
      if (bas.get(v) === idx.get(v)) { const c = []; let w; do { w = pile.pop(); surPile.delete(w); c.push(w); } while (w !== v); if (c.length > 1 || (succ.get(v) || []).includes(v)) cycles.push(c); }
    };
    for (const v of succ.keys()) if (!idx.has(v)) visiter(v);
    /* 5b. démarrage : en partant des ressources de la nature, des importées et du stock de départ (les ressources des filières pas encore migrées sont supposées disponibles),
       on « lance » toutes les recettes dont les entrées et les outils sont disponibles, jusqu'à ce qu'il n'y en ait plus. Une recette jamais lancée ne peut pas démarrer. */
    // fermeture(exclus) : toutes les ressources qu'on peut obtenir au démarrage, sans compter celles de « exclus » dans le stock de départ
    const extraites = new Set(d.recettes.filter(r => r.extraction).flatMap(r => r.sorties.map(x => x.ressource)));
    const fermeture = (exclus = new Set()) => {
      // une ressource naturelle qu'une recette d'EXTRACTION produit n'est disponible qu'une fois cette recette lancée (il faut son outil : la pioche pour le minerai)
      const dispo = new Set(d.ressources.filter(r => (CATEGORIES_NATURELLES.includes(r.categorie) && !extraites.has(r.id)) || (r.depart && !exclus.has(r.id)) || !migrees.has(r.filiere)).map(r => r.id));
      const lancees = new Set();
      for (let change = true; change;) {
        change = false;
        for (const r of d.recettes) if (!lancees.has(r.id) && r.entrees.every(e => dispo.has(e.ressource)) && (r.outils || []).every(o => dispo.has(o))) {
          lancees.add(r.id); change = true;
          for (const x of [...r.sorties, ...(r.sousProduits || [])]) dispo.add(x.ressource);
        }
      }
      return { dispo, lancees };
    };
    const { dispo, lancees } = fermeture();
    for (const r of d.recettes) if (!lancees.has(r.id)) {
      const manque = [...r.entrees.map(e => e.ressource), ...(r.outils || [])].filter(x => !dispo.has(x));
      signaler(erreurs, 'recette-bloquee', 'Recette « ' + r.id + ' » (' + (ateliers.get(r.atelier) || { nom:r.atelier }).nom + ') ne peut jamais démarrer : il manque ' + manque.map(nom).join(', ') + '.');
    }
    /* 5c. outil refabricable : pour chaque outil exigé par une recette, on refait le calcul SANS cet outil dans le stock de départ (le joueur l'a perdu). S'il n'est pas refabricable, il est requis par sa propre
       chaîne de fabrication (la pioche sert à extraire le fer de la pioche) : « démarrage impossible » s'il n'a pas de stock de départ, « irremplaçable » s'il en a un. Une recette primitive de secours règle le cas. */
    const outilsRequis = new Set(d.recettes.flatMap(r => r.outils || []));
    for (const t of outilsRequis) {
      if (!res.has(t) || !migrees.has((res.get(t) || {}).filiere)) continue;
      const sans = fermeture(new Set([t])).dispo;
      if (sans.has(t)) continue;
      if ((res.get(t) || {}).depart) signaler(avertissements, 'outil-irremplacable', nom(t) + ' : si le joueur le perd, il ne peut plus le refabriquer (sa propre chaîne de fabrication l\'exige). Il n\'existe que par le stock de départ : ajoute une recette primitive de secours.', t);
      else signaler(erreurs, 'demarrage-impossible', nom(t) + ' : requis par sa propre chaîne de fabrication, sans stock de départ ni recette primitive : impossible à obtenir.', t);
    }
    for (const c of cycles) {
      const amorce = c.every(id => dispo.has(id));
      signaler(amorce ? attente : erreurs, 'cycle', 'Cycle : ' + c.map(nom).join(' ↔ ') + (amorce ? ' — il démarre grâce au stock de départ.' : ' — ne peut pas démarrer (voir les recettes bloquées).'));
    }

    /* 6. débouchés : toute ressource, MÊME « final », doit servir à quelque chose. Un bien final doit être consommé par quelqu'un, sinon le fabriquer n'a pas de sens.
       Un débouché est : une recette (entrée ou outil), un utilisateur prévu (attendu), un coût de construction, d'amélioration ou d'entretien, un besoin de foyer (direct ou par groupe d'aliments),
       un besoin de service ou d'équipement, un export du comptoir, ou un outil de chasse de niveau. */
    const deb = new Map(), ajouteD = (id, type) => { if (!deb.has(id)) deb.set(id, new Set()); deb.get(id).add(type); };
    const inconnue = (id, fichier) => { if (!res.has(id)) signaler(erreurs, 'reference-inconnue', fichier + ' : la ressource « ' + id + ' » n\'est pas dans ressources.json.', id); };
    for (const [id] of utilise) ajouteD(id, 'recette');
    for (const r of d.ressources) if ((r.attendu || []).length) ajouteD(r.id, 'prévu');
    for (const a of d.ateliers) for (const n of a.niveauxOutils || []) for (const o of n.outils || []) ajouteD(o, 'outil de chasse');
    if (d.couts) {
      const c = d.couts, lieu = 'couts_construction.json';
      for (const niv of Object.values(c.niveaux || {})) for (const p of niv.parties) for (const x of p.ressources) { ajouteD(x.ressource, 'construction'); inconnue(x.ressource, lieu); }
      for (const b of c.batiments || []) { if (!ateliers.has(b.atelier)) signaler(erreurs, 'atelier-inexistant', lieu + ' : l\'atelier « ' + b.atelier + ' » n\'existe pas.'); for (const e of b.entretien || []) { ajouteD(e.ressource, 'entretien'); inconnue(e.ressource, lieu); } }
      for (const e of c.entretien_routes || []) { ajouteD(e.ressource, 'entretien'); inconnue(e.ressource, lieu); }
      for (const a of c.ameliorations || []) for (const x of a.couts) { ajouteD(x.ressource, 'amélioration'); inconnue(x.ressource, lieu); }
    }
    if (d.foyers) {
      const f = d.foyers, groupes = f.groupesAliments || {}, lieu = 'besoins_foyers.json';
      for (const niv of f.niveaux) for (const bz of niv.besoins) {
        if (bz.type === 'groupe') { if (!groupes[bz.groupe]) signaler(erreurs, 'reference-inconnue', lieu + ' : le groupe « ' + bz.groupe + ' » n\'existe pas.'); for (const id of (groupes[bz.groupe] || { ressources:[] }).ressources) { ajouteD(id, 'foyer'); inconnue(id, lieu); } }
        else { ajouteD(bz.ressource, 'foyer'); inconnue(bz.ressource, lieu); }
      }
    }
    if (d.services) {
      const lieu = 'besoins_services.json';
      for (const sv of d.services.services) {
        if (!ateliers.has(sv.atelier)) signaler(erreurs, 'atelier-inexistant', lieu + ' : l\'atelier « ' + sv.atelier + ' » n\'existe pas.');
        for (const bz of sv.besoins) { ajouteD(bz.ressource, 'service'); inconnue(bz.ressource, lieu); }
        for (const e of sv.equipement || []) for (const a of e.armes) { ajouteD(a, 'service'); inconnue(a, lieu); }
      }
      for (const e of d.services.equipements || []) { if (!ateliers.has(e.atelier)) signaler(erreurs, 'atelier-inexistant', lieu + ' : l\'atelier « ' + e.atelier + ' » n\'existe pas.'); for (const id of e.ressources) { ajouteD(id, 'équipement'); inconnue(id, lieu); } }
    }
    if (d.commerce) for (const id of d.commerce.exports || []) { ajouteD(id, 'export'); inconnue(id, 'commerce.json'); }
    const sansDebouche = d.ressources.filter(r => !deb.has(r.id));
    for (const r of sansDebouche) signaler(erreurs, 'sans-debouche', nom(r.id) + ' : aucun débouché' + (r.final ? ' (« final » ne suffit pas : qui la consomme ?)' : '') + '.', r.id);
    const parType = {}; for (const set of deb.values()) for (const t of set) parType[t] = (parType[t] || 0) + 1;

    const stats = {
      sansDebouche:sansDebouche.length, debouchesParType:parType,
      filieresMigrees:[...migrees], ressources:d.ressources.length, ateliers:d.ateliers.length, recettes:d.recettes.length,
      recettesAvecSousProduit:d.recettes.filter(r => (r.sousProduits || []).length).length, recettesMultiIngredients:d.recettes.filter(r => r.entrees.length >= 2).length,
    };
    return { erreurs, avertissements, attente, stats };
  }

  // export du graphe en Mermaid (flowchart) : ressources en rectangles, recettes en ovales ; trait pointillé = outil ou sous-produit
  function exporterMermaid(d) {
    const res = new Map(d.ressources.map(r => [r.id, r])), at = new Map(d.ateliers.map(a => [a.id, a]));
    const id = new Map(); const n = x => { if (!id.has(x)) id.set(x, 'n' + id.size); return id.get(x); };
    const txt = s => String(s).replace(/"/g, "'");
    const lignes = ['flowchart LR'];
    d.recettes.forEach((r, i) => {
      const rn = 'r' + i;
      lignes.push('  ' + rn + '(["' + txt((at.get(r.atelier) || { nom:r.atelier }).nom + ' : ' + r.id) + '"])');
      for (const e of r.entrees) lignes.push('  ' + n(e.ressource) + '["' + txt((res.get(e.ressource) || { nom:e.ressource }).nom) + '"] --> ' + rn);
      for (const o of r.outils || []) lignes.push('  ' + n(o) + '["' + txt((res.get(o) || { nom:o }).nom) + '"] -.->|outil| ' + rn);
      for (const s of r.sorties) lignes.push('  ' + rn + ' --> ' + n(s.ressource) + '["' + txt((res.get(s.ressource) || { nom:s.ressource }).nom) + '"]');
      for (const s of r.sousProduits || []) lignes.push('  ' + rn + ' -.->|sous-produit| ' + n(s.ressource) + '["' + txt((res.get(s.ressource) || { nom:s.ressource }).nom) + '"]');
    });
    return lignes.join('\n');
  }
  return { validerProduction, exporterMermaid };
});
