/* ---------- géométrie des routes commerciales (carte globale) : UNE seule source, utilisée par outils/lisser-routes.js (Node) ET par l'analyse des routes du globe (navigateur) ----------
   Une route = une suite de points [lon, lat] entre deux capitales. Chaque fonction travaille en kilomètres locaux (projection équirectangulaire autour du milieu de la route, voir prepare()).
   Règles : aucun coin (arrondir) · une même route ne traverse jamais deux fois la même rivière ni un lac (eviterEau) · MARGE km de distance aux plans d'eau · ponts droits perpendiculaires (ponts).
   Chaque réglage se passe dans l'objet `o` (RoutesGeo.defauts). */
(function (root) {
  const G = {};
  G.defauts = { marge:2, angleMax:14, pas:6, pontDemi:3, raccord:30, pontEspace:60, virageMax:100, zoneExempt:35 };
  const D = Math.PI / 180, len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]), unit = (a, b) => { const l = len(a, b) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
  G.len = len; G.unit = unit;
  function resample(P, step) {                                                                    // un point tous les `step` km, premier et dernier conservés
    const out = [P[0]]; let reste = step, a = P[0];
    for (let i = 1; i < P.length; i++) { let b = P[i], d = len(a, b);
      while (d >= reste) { const t = reste / d; a = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; out.push(a); d = len(a, b); reste = step; }
      reste -= d; a = b; }
    if (len(out[out.length - 1], P[P.length - 1]) > step * .3) out.push(P[P.length - 1]); else out[out.length - 1] = P[P.length - 1];
    return out;
  }
  function arrondir(P, o) {                                                                       // aucun coin de plus de angleMax° sur ±3 points ; les deux bouts ne bougent pas
    let Q = P.map(q => q.slice()); const cap = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
    for (let it = 0; it < 80; it++) {
      const n = Q.length, mal = new Uint8Array(n); let un = false;
      for (let i = 3; i < n - 3; i++) { let t = cap(Q[i], Q[i + 3]) - cap(Q[i - 3], Q[i]); t = Math.abs(Math.atan2(Math.sin(t), Math.cos(t))); if (t > o.angleMax * D) { un = true; for (let k = Math.max(1, i - 6); k <= Math.min(n - 2, i + 6); k++) mal[k] = 1; } }
      if (!un) break;
      Q = Q.map((q, i) => { if (!mal[i]) return q; let sx = 0, sy = 0, c = 0; for (let k = Math.max(0, i - 3); k <= Math.min(n - 1, i + 3); k++) { sx += Q[k][0]; sy += Q[k][1]; c++; } return [sx / c, sy / c]; });
    }
    return Q;
  }
  const croise = (a, b, c, d) => { const e = [b[0] - a[0], b[1] - a[1]], f = [d[0] - c[0], d[1] - c[1]], den = e[0] * f[1] - e[1] * f[0]; if (Math.abs(den) < 1e-9) return null;
    const g = [c[0] - a[0], c[1] - a[1]], t = (g[0] * f[1] - g[1] * f[0]) / den, v = (g[0] * e[1] - g[1] * e[0]) / den; return t < 0 || t > 1 || v < 0 || v > 1 ? null : { t, p:[a[0] + e[0] * t, a[1] + e[1] * t], tan:unit(c, d) }; };
  function bez(p0, d0, p1, d1) { const L = len(p0, p1), k = L * .4, c1 = [p0[0] + d0[0] * k, p0[1] + d0[1] * k], c2 = [p1[0] - d1[0] * k, p1[1] - d1[1] * k], n = Math.max(6, Math.ceil(L / 1.5)), out = [];
    for (let i = 0; i <= n; i++) { const u = i / n, w = 1 - u; out.push([w * w * w * p0[0] + 3 * w * w * u * c1[0] + 3 * w * u * u * c2[0] + u * u * u * p1[0], w * w * w * p0[1] + 3 * w * w * u * c1[1] + 3 * w * u * u * c2[1] + u * u * u * p1[1]]); } return out; }
  const nearSeg = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)); const q = [a[0] + dx * t, a[1] + dy * t]; return { d:len(p, q), q }; };
  const dansPoly = (p, R) => { let c = false; for (let i = 0, j = R.length - 1; i < R.length; j = i++) if ((R[i][1] > p[1]) !== (R[j][1] > p[1]) && p[0] < (R[j][0] - R[i][0]) * (p[1] - R[i][1]) / (R[j][1] - R[i][1]) + R[i][0]) c = !c; return c; };
  const coins = (P, o) => { let n = 0; const R = resample(P, o.pas); for (let i = 3; i < R.length - 3; i++) { let t = Math.atan2(R[i + 3][1] - R[i][1], R[i + 3][0] - R[i][0]) - Math.atan2(R[i][1] - R[i - 3][1], R[i][0] - R[i - 3][0]); t = Math.abs(Math.atan2(Math.sin(t), Math.cos(t))); if (t > 35 * D) { n++; i += 4; } } return n; };
  Object.assign(G, { resample, arrondir, croise, bez, nearSeg, dansPoly, coins });

  /* Préparation : kilomètres locaux + rivières et lacs voisins (eau = { rivers:[{c}], lakes:[{p}] }, water.json). Retourne l'état st d'une route. */
  G.prepare = (a, b, coords, eau, o) => {
    const lon0 = coords.reduce((s, c) => s + c[0], 0) / coords.length, lat0 = coords.reduce((s, c) => s + c[1], 0) / coords.length, kx = Math.cos(lat0 * D) * 111.32, ky = 110.57;
    const vers = c => [(c[0] - lon0) * kx, (c[1] - lat0) * ky], retour = p => [lon0 + p[0] / kx, lat0 + p[1] / ky];
    const bb = coords.reduce((m, c) => [Math.min(m[0], c[0]), Math.min(m[1], c[1]), Math.max(m[2], c[0]), Math.max(m[3], c[1])], [1e9, 1e9, -1e9, -1e9]);
    const rivs = eau.rivers.filter(r => r.c && r.c.some(c => c[0] > bb[0] - .6 && c[0] < bb[2] + .6 && c[1] > bb[1] - .6 && c[1] < bb[3] + .6)).map(r => r.c.map(vers));
    const lacs = eau.lakes.filter(l => l.p.length > 3 && l.p.some(c => c[0] > bb[0] - .4 && c[0] < bb[2] + .4 && c[1] > bb[1] - .4 && c[1] < bb[3] + .4)).map(l => l.p.map(vers));
    return { a, b, lon0, lat0, kx, ky, vers, retour, rivs, lacs, P:arrondir(resample(coords.map(vers), o.pas), o) };
  };
  const croisements = (st, Q) => { const r = []; for (let i = 0; i < Q.length - 1; i++) st.rivs.forEach((R, k) => { for (let j = 0; j < R.length - 1; j++) { const x = croise(Q[i], Q[i + 1], R[j], R[j + 1]); if (x) r.push({ i, k, p:x.p, tan:x.tan }); } }); return r; };
  const coupeEau = (st, a, b, k) => { const R = st.rivs[k]; return R.some((q, j) => j < R.length - 1 && croise(a, b, q, R[j + 1])); }, coupeLac = (st, a, b) => st.lacs.some(L => L.some((q, j) => croise(a, b, q, L[(j + 1) % L.length])));
  const lacsCoupes = (st, Q) => st.lacs.map((L, k) => ({ L, k, x:[] })).filter(r => { for (let i = 0; i < Q.length - 1; i++) for (let j = 0; j < r.L.length; j++) { const x = croise(Q[i], Q[i + 1], r.L[j], r.L[(j + 1) % r.L.length]); if (x) r.x.push({ i, p:x.p }); } return r.x.length; });
  const aDouble = st => { const par = new Map(); croisements(st, st.P).forEach(c => par.set(c.k, (par.get(c.k) || 0) + 1)); return [...par.values()].some(n => n >= 2); };
  G.croisements = croisements;

  /* Diagnostic d'une route : doubles (rivières traversées plusieurs fois), lacs (coupés), tropPres (points à moins de marge km d'un plan d'eau hors zone de pont), obliques (traversées qui ne sont pas perpendiculaires à
     la rivière : moins de 70°). Retourne { doubles, lacs, tropPres, obliques, km }. */
  G.diagnostic = (st, o) => {
    const cr = croisements(st, st.P), par = new Map(); cr.forEach(c => par.set(c.k, (par.get(c.k) || 0) + 1));
    const exempt = q => cr.some(c => len(c.p, q) < o.zoneExempt); let proches = 0;
    for (let i = 2; i < st.P.length - 2; i++) { const q = st.P[i]; let d = 1e9;
      for (const L of st.lacs) { if (dansPoly(q, L)) { d = 0; break; } for (let j = 0; j < L.length; j++) d = Math.min(d, nearSeg(q, L[j], L[(j + 1) % L.length]).d); }
      if (d >= o.marge && !exempt(q)) for (const R of st.rivs) for (let j = 0; j < R.length - 1; j++) d = Math.min(d, nearSeg(q, R[j], R[j + 1]).d);
      if (d < o.marge - .05) proches++; }
    let obliques = 0;
    for (const c of cr) { const a = st.P[c.i], b = st.P[c.i + 1], t = unit(a, b), cos = Math.abs(t[0] * c.tan[0] + t[1] * c.tan[1]); if (Math.asin(Math.min(1, cos)) / D > 20) obliques++; }          // (angle entre la route et la rivière : 90° = perpendiculaire ; ici on compte les traversées à plus de 20° de la perpendiculaire)
    return { doubles:[...par.values()].filter(n => n >= 2).length, lacs:lacsCoupes(st, st.P).length, tropPres:proches, obliques, km:Math.round(st.P.reduce((s, q, i) => i ? s + len(st.P[i - 1], q) : 0, 0)) };
  };

  /* Eau : (a) une même rivière traversée plusieurs fois (symétrie de la boucle, puis raccourci), (b) lacs contournés, (c) distance de sécurité. stats : compteurs facultatifs. o.marge : distance (km). */
  G.eviterEau = (st, o, stats) => {
    stats = stats || {};
    for (let passe = 0; passe < 14; passe++) {
      const par = new Map(); croisements(st, st.P).forEach(c => { if (!par.has(c.k)) par.set(c.k, []); par.get(c.k).push(c); });
      const paire = [...par.values()].find(l => l.length >= 2); if (!paire) break;
      if (stats.doubles !== undefined && !passe) stats.doubles++;
      const k = paire[0].k, R = st.rivs[k], n0 = croisements(st, st.P).filter(c => c.k === k).length; let ok = false;
      { const Q = st.P.map(q => q.slice());
        for (let i = paire[0].i + 1; i <= paire[1].i; i++) { let b = { d:1e9, q:null }; for (let j = 0; j < R.length - 1; j++) { const t = nearSeg(Q[i], R[j], R[j + 1]); if (t.d < b.d) b = t; } Q[i] = [2 * b.q[0] - Q[i][0], 2 * b.q[1] - Q[i][1]]; }       // symétrie : q' = 2·proche − q
        for (let i = paire[0].i + 1; i <= paire[1].i; i++) { let b = { d:1e9, q:null }; for (let j = 0; j < R.length - 1; j++) { const t = nearSeg(Q[i], R[j], R[j + 1]); if (t.d < b.d) b = t; } if (b.d < o.marge) { const d = b.d || .01, f = (o.marge - b.d + .3) / d; Q[i] = [Q[i][0] + (Q[i][0] - b.q[0]) * f, Q[i][1] + (Q[i][1] - b.q[1]) * f]; } }
        const P2 = arrondir(resample(Q, o.pas), o), n1 = croisements({ rivs:st.rivs }, P2).filter(c => c.k === k).length;
        if (n1 < n0 && !lacsCoupes(st, P2).length) { st.P = P2; ok = true; } }
      for (let ext = 0; ext < 12 && !ok; ext++) {
        const ia = Math.max(1, paire[0].i - 3 - ext * 3), ib = Math.min(st.P.length - 2, paire[1].i + 4 + ext * 3); if (ib - ia < 3) break;
        const courbe = bez(st.P[ia], unit(st.P[ia - 1], st.P[ia]), st.P[ib], unit(st.P[ib], st.P[ib + 1])), libre = C => C.every((q, j) => !j || (!coupeEau(st, C[j - 1], q, k) && !coupeLac(st, C[j - 1], q)));
        const droite = resample([st.P[ia], st.P[ib]], 1.5), choix = libre(courbe) ? courbe : libre(droite) ? droite : null; if (!choix) continue;
        st.P = resample([...st.P.slice(0, ia), ...choix, ...st.P.slice(ib + 1)], o.pas); ok = true; }
      if (!ok) break; else if (stats.doublesResolus !== undefined && !aDouble(st)) stats.doublesResolus++;
    }
    for (let passe = 0; passe < 6; passe++) {
      const cl = lacsCoupes(st, st.P); if (!cl.length) break;
      if (stats.lacsCoupes !== undefined && !passe) stats.lacsCoupes++;
      const { L, x } = cl[0], i1 = x[0].i, i2 = x[x.length - 1].i, cx = L.reduce((s, q) => s + q[0], 0) / L.length, cy = L.reduce((s, q) => s + q[1], 0) / L.length;
      const proche = p => L.reduce((m, q, j) => len(p, q) < len(p, L[m]) ? j : m, 0), va = proche(x[0].p), vb = proche(x[x.length - 1].p), n = L.length;
      const arc = sens => { const out = []; let j = va, guard = 0; while (guard++ <= n) { out.push(L[j]); if (j === vb) break; j = (j + sens + n) % n; } return out; };
      const lg = a => a.reduce((s, q, i) => i ? s + len(a[i - 1], q) : 0, 0), A = arc(1), B = arc(-1), C = lg(A) <= lg(B) ? A : B;
      const dehors = C.map(q => { const d = len(q, [cx, cy]) || 1; return [q[0] + (q[0] - cx) / d * (o.marge + 1.5), q[1] + (q[1] - cy) / d * (o.marge + 1.5)]; });
      const P2 = arrondir(resample([...st.P.slice(0, i1 + 1), ...dehors, ...st.P.slice(i2 + 1)], o.pas), o);
      if (lacsCoupes(st, P2).length < cl.length) { st.P = P2; if (stats.lacsResolus !== undefined && !lacsCoupes(st, st.P).length) stats.lacsResolus++; } else break;
    }
    { const cr = croisements(st, st.P), exempt = q => cr.some(c => len(c.p, q) < o.zoneExempt);
      for (let it = 0; it < 60; it++) { let bouge = false;
        for (let i = 2; i < st.P.length - 2; i++) { const q = st.P[i]; let best = { d:1e9, q:null };
          for (const L of st.lacs) { if (dansPoly(q, L)) { best = { d:0, q:L.reduce((m, c) => len(q, c) < len(q, m) ? c : m, L[0]) }; break; } for (let j = 0; j < L.length; j++) { const t = nearSeg(q, L[j], L[(j + 1) % L.length]); if (t.d < best.d) best = t; } }
          if (!exempt(q)) for (const R of st.rivs) for (let j = 0; j < R.length - 1; j++) { const t = nearSeg(q, R[j], R[j + 1]); if (t.d < best.d) best = t; }
          if (best.q && best.d < o.marge) { const d = best.d || .01, k = (o.marge - best.d + .3) / d; st.P[i] = [q[0] + (q[0] - best.q[0]) * k, q[1] + (q[1] - best.q[1]) * k]; bouge = true; if (stats.repousses !== undefined && !it) stats.repousses++; } }
        if (!bouge) break; }
      st.P = arrondir(st.P, o); }
  };

  /* Ponts : chaque traversée de rivière devient un pont droit et perpendiculaire (demi-longueur pontDemi) raccordé par des Bézier (raccord km). Retourne le nombre de ponts posés ; stats.ignores compte les traversées laissées. */
  G.ponts = (st, o, stats) => {
    stats = stats || {}; let P = st.P, n = 0; const trouves = croisements(st, P).map(c => ({ i:c.i, p:c.p, tan:c.tan }));
    trouves.sort((u, v) => v.i - u.i);                                                            // de l'aval à l'amont : les indices restent valables
    const derniers = [];
    for (const x of trouves) {
      if (derniers.some(q => len(q, x.p) < o.pontEspace)) { stats.ignores = (stats.ignores || 0) + 1; continue; }
      let ia = x.i, ib = x.i + 1; while (ia > 0 && len(P[ia], x.p) < o.raccord) ia--; while (ib < P.length - 1 && len(P[ib], x.p) < o.raccord) ib++;
      if (ia < 2 || ib > P.length - 3 || len(P[ia], x.p) < o.raccord * .6 || len(P[ib], x.p) < o.raccord * .6) { stats.ignores = (stats.ignores || 0) + 1; continue; }   // (trop près d'un bout : on n'y touche pas)
      const nrm = [-x.tan[1], x.tan[0]], s = Math.sign((P[ia][0] - x.p[0]) * nrm[0] + (P[ia][1] - x.p[1]) * nrm[1]) || 1;
      const A = [x.p[0] + nrm[0] * s * o.pontDemi, x.p[1] + nrm[1] * s * o.pontDemi], B = [x.p[0] - nrm[0] * s * o.pontDemi, x.p[1] - nrm[1] * s * o.pontDemi], ax = unit(A, B);
      const d0 = unit(P[ia - 1], P[ia]), d2 = unit(P[ib], P[ib + 1]);
      if (ax[0] * d0[0] + ax[1] * d0[1] < Math.cos(o.virageMax * D) || ax[0] * d2[0] + ax[1] * d2[1] < Math.cos(o.virageMax * D)) { stats.ignores = (stats.ignores || 0) + 1; continue; }
      P = [...P.slice(0, ia), ...bez(P[ia], d0, A, ax), ...bez(B, ax, P[ib], d2), ...P.slice(ib + 1)];
      n++; derniers.push(x.p);
    }
    st.P = P; return n;
  };

  // résultat : points [lon, lat] rééchantillonnés
  G.sortie = (st, o) => resample(st.P, o.pas).map(st.retour);

  /* Corrections demandées dans l'analyse (une par défaut) : 'parallele' (ponts perpendiculaires, plus tolérants), 'double' (rivière traversée plusieurs fois), 'proche' (trop près de l'eau : marge doublée).
     Retourne le diagnostic après correction. */
  G.corriger = (st, defaut, o) => {
    const oo = Object.assign({}, o);
    if (defaut === 'parallele') { Object.assign(oo, { virageMax:140, raccord:14, pontEspace:25 }); G.ponts(st, oo); }
    else if (defaut === 'double') { for (let t = 0; t < 3; t++) G.eviterEau(st, oo); }
    else if (defaut === 'proche') { oo.marge = o.marge * 2.5; G.eviterEau(st, oo); G.ponts(st, oo); }
    return G.diagnostic(st, o);
  };

  /* Régénération aléatoire d'UNE route : une forme différente entre les mêmes capitales. nombres de variantes testées : essais ; surTerre(lon, lat) facultatif (la route reste sur la terre). Retourne { st, diag } de la meilleure
     variante (aucun défaut si possible), ou null. rnd : fonction aléatoire (0 à 1). */
  G.aleatoire = (st, o, rnd, surTerre, essais = 60, strict) => {
    const A = st.P[0], B = st.P[st.P.length - 1], L = len(A, B), u = unit(A, B), n = [-u[1], u[0]], ref = st.P.slice(); let meilleur = null;
    /* La nouvelle route doit être DIFFÉRENTE de l'actuelle : au moins un point à seuil km de l'ancien tracé (max), et en moyenne seuil/3 km — seuil = 7 % de la distance entre les capitales (12 km au minimum), puis réduit si rien ne convient. */
    const seuil0 = Math.max(12, L * .07), ecart = c => { let mx = 0, s = 0, k = 0; c.P.forEach((q, i) => { if (i % 2) return; let d = 1e9; for (let j = 0; j < ref.length - 1; j++) d = Math.min(d, nearSeg(q, ref[j], ref[j + 1]).d); mx = Math.max(mx, d); s += d; k++; }); return { mx, moy:s / k }; };
    const enMer = (c, tol) => { if (!surTerre || tol >= 1) return false; let m = 0, tot = 0; c.P.forEach((q, i) => { if (i < 3 || i > c.P.length - 4 || i % 2) return; tot++; if (c.rivs.some(R => R.some((v, j) => j < R.length - 1 && nearSeg(q, v, R[j + 1]).d < 5))) return; if (!surTerre(...c.retour(q))) m++; }); return m > Math.max(1, tot * tol); };   // (bouts près des capitales ignorés ; un point à moins de 5 km d'un fleuve est de la terre : les fleuves sont creusés dans les contours)
    /* Quatre paliers, du plus strict au plus tolérant (une route enregistrée ou courte, près d'une côte, n'a parfois aucune variante au premier palier) : la forme tirée est toujours différente de l'actuelle. */
    const paliers = strict ? [{ f:1, tol:.03 }, { f:.6, tol:.05 }, { f:.4, tol:.08 }] : [{ f:1, tol:.03 }, { f:.6, tol:.08 }, { f:.4, tol:.2 }, { f:.3, tol:1 }];   // strict (ajout d'une route entre deux villes) : jamais de variante en mer
    for (const { f, tol } of paliers) {
      const seuil = seuil0 * f;
      for (let t = 0; t < essais; t++) {
        const k = 1 + Math.floor(rnd() * 4), amp = Math.min(strict ? 260 : 130, Math.max(seuil * 1.5, L * (.05 + rnd() * (strict ? .3 : .15)))), pts = [A];
        const signe = rnd() < .5 ? 1 : -1;
        for (let i = 1; i <= k; i++) { const fr = i / (k + 1), off = (rnd() < .3 ? -signe : signe) * amp * (.4 + rnd() * .9) * Math.sin(Math.PI * fr) ** .6; pts.push([A[0] + u[0] * L * fr + n[0] * off, A[1] + u[1] * L * fr + n[1] * off]); }
        pts.push(B);
        let Q = arrondir(resample(pts, 6), o);
        for (let s = 0; s < 3 && Q.length > 3; s++) { const R = [Q[0]]; for (let i = 0; i < Q.length - 1; i++) R.push([.75 * Q[i][0] + .25 * Q[i + 1][0], .75 * Q[i][1] + .25 * Q[i + 1][1]], [.25 * Q[i][0] + .75 * Q[i + 1][0], .25 * Q[i][1] + .75 * Q[i + 1][1]]); R.push(Q[Q.length - 1]); Q = R; }   // (lissage de Chaikin)
        const c = { ...st, P:arrondir(resample(Q, o.pas), o) };
        if (enMer(c, tol)) continue;
        G.eviterEau(c, o); G.ponts(c, o);
        if (enMer(c, tol)) continue;
        const e = ecart(c); if (e.mx < seuil || e.moy < seuil / 3) continue;                              // (trop semblable à la route actuelle : on en tire une autre)
        const diag = G.diagnostic(c, o), score = diag.doubles * 100 + diag.lacs * 100 + diag.tropPres + diag.obliques * 3;
        if (!meilleur || score < meilleur.score) meilleur = { st:c, diag, score, palier:paliers.indexOf(paliers.find(x => x.f === f)) };
        if (!score) return meilleur;
      }
      if (meilleur) return meilleur;                                                                       // (une variante valable à ce palier : inutile d'être plus tolérant)
    }
    return meilleur;
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = G; else root.RoutesGeo = G;
})(typeof window !== 'undefined' ? window : globalThis);
