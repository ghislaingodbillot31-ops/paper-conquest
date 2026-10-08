/* ---------- logs du jeu envoyés au serveur de logs (tools/serveur-logs.js, port 8001) ----------
   Chargé en premier sur la page : il capte les erreurs (window.onerror, promesses rejetées), console.error / warn / log, et chaque 15 s un état résumé du village (jeuLog('état', …)). Les messages partent par paquets toutes les 2 s
   (sans serveur : nouvel essai toutes les 30 s, silencieux). jeuLog(message, donnée) : un message à soi, depuis n'importe quel code. */
(function () {
  const URL_LOGS = 'http://localhost:8001/log', page = (location.pathname.split('/').pop() || 'index');
  let buf = [], pause = 0, vu = 0;
  const txt = a => { if (a instanceof Error) return a.stack || a.message; if (typeof a === 'object' && a !== null) { try { return JSON.stringify(a); } catch (e) { return String(a); } } return String(a); };
  const push = (n, args) => { buf.push({ t:Date.now(), n, m:'[' + page + '] ' + args.map(txt).join(' ') }); if (buf.length > 300) buf.shift(); };
  for (const k of ['error', 'warn', 'log']) { const o = console[k]; console[k] = function (...a) { push(k, a); return o.apply(console, a); }; }
  window.addEventListener('error', e => push('error', [e.message + ' @ ' + (e.filename || '').split('/').pop() + ':' + e.lineno + ':' + e.colno, e.error && e.error.stack || '']));
  window.addEventListener('unhandledrejection', e => push('error', ['promesse rejetée :', e.reason && e.reason.stack || e.reason]));
  window.jeuLog = (m, d) => push('info', d === undefined ? [m] : [m, d]);
  function envoyer() {
    if (!buf.length || Date.now() < pause) return;
    const b = buf; buf = [];
    fetch(URL_LOGS, { method:'POST', headers:{ 'Content-Type':'text/plain' }, body:JSON.stringify(b), keepalive:true }).catch(() => { pause = Date.now() + 30000; buf = b.concat(buf).slice(-300); });
  }
  push('info', ['page ouverte', location.search]);                                       // (adresse avec la région, pour savoir quelle partie est jouée)
  setInterval(envoyer, 2000);
  setInterval(() => {                                                                   // état résumé du village : heure, bâtiments avec leurs ouvriers (états) et leur stock
    try {
      if (typeof S === 'undefined' || !S.houses || !S.houses.length || Date.now() < pause) return;
      const E = S.houses.filter(h => typeof workers !== 'undefined' && (workers.has(h.id) || [...workers.keys()].some(k => typeof k === 'string' && k.startsWith(h.id + '#')))).map(h => {
        const ws = [...workers].filter(([k]) => (typeof k === 'string' ? +k.split('#')[0] : k) === h.id).map(([k, w]) => (typeof k === 'string' ? k.split('#')[1] : '0') + ':' + (w.state || (w.passive ? 'passif' : '?')) + (w.load ? '(' + w.load + ' ' + (w.n || w.charge || 0) + ')' : ''));
        const inv = Object.entries({ ...(h.inv || {}), ...(h.mat || {}) }).filter(([, q]) => q >= 1).map(([k, q]) => k + ' ' + Math.floor(q)).join(', ');
        return h.id + ' ' + h.kind + '@' + Math.round(h.x) + ',' + Math.round(h.y) + ' nb=' + (h.nb === undefined ? '-' : h.nb) + (h.actif === false ? ' ARRÊTÉ' : '') + (h.gardePct !== undefined ? ' garde=' + h.gardePct + '%' : '') + (h.porteurs !== undefined ? ' port=' + h.porteurs : '') + (h.stock ? ' stock=' + Math.floor(h.stock) : '') + ' [' + ws.join(' ') + ']' + (inv ? ' {' + inv + '}' : '');
      });
      push('info', ['état', (typeof heureCarte === 'function' ? 'heure ' + heureCarte().toFixed(2) + ' ' : '') + (typeof phaseJour === 'function' ? phaseJour() : ''), S.houses.length + ' bâtiments', E.join(' | ')]);
    } catch (e) { push('warn', ['état impossible :', e.message]); }
  }, 15000);
})();
