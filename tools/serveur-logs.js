/* Serveur de logs (développement) : reçoit les logs du jeu envoyés par js/carte/logs.js et les écrit dans un fichier lisible par l'assistant.
   Lancement : node tools/serveur-logs.js   (ou tools/lancer-logs.bat)   —   port 8001, fichier : <dossier temporaire>/paper-conquest-logs/jeu.log (hors du projet : pas de rechargement de la page).
   GET /tail?n=200 : les n dernières lignes · DELETE /log : vide le fichier. Au-delà de 2 Mo, le fichier est tronqué à sa seconde moitié.
   BASE DE DONNÉES DÉVELOPPEUR (fichier <dossier de l'utilisateur>/.paper-conquest-dev/base.json) : les réglages faits en mode développeur (stocks maximum, heure, actions) y sont inscrits.
   Collections : stocks { type de bâtiment: { article: maximum } }, variables { nom: valeur }, actions [ { t, nom, detail } ], historique [ { t, collection, cle, ancien, nouveau } ].
   COMMANDES : POST /base/commande { nom, params } met une commande en attente ; le jeu l'interroge (GET /base/commandes), l'exécute puis la marque faite (POST /base/fait { id }).
   SAUVEGARDES DE PARTIE (dossier <dossier de l'utilisateur>/.paper-conquest-dev/sauvegardes, 40 au plus) : POST /base/sauvegarde { nom, cle, search, donnees } ; GET /base/sauvegardes (liste) ; GET /base/sauvegarde?nom=… (contenu).
   GET /base : tout · POST /base/set { collection, cle, valeur } (valeur null : supprime) · POST /base/action { nom, detail } · POST /base/sync { stocks } : le navigateur dépose ce qu'il a si la base est vide. */
const http = require('http'), fs = require('fs'), os = require('os'), path = require('path');
const DIR = path.join(os.tmpdir(), 'paper-conquest-logs'), FILE = path.join(DIR, 'jeu.log'), PORT = 8001, MAX = 2 * 1024 * 1024;
fs.mkdirSync(DIR, { recursive:true });
const BASE_DIR = path.join(os.homedir(), '.paper-conquest-dev'), BASE_FILE = path.join(BASE_DIR, 'base.json');
fs.mkdirSync(BASE_DIR, { recursive:true });
let base = { stocks:{}, variables:{}, actions:[], historique:[], commandes:[] };
try { base = { ...base, ...JSON.parse(fs.readFileSync(BASE_FILE, 'utf8')) }; } catch (e) {}
const SAUV_DIR = path.join(BASE_DIR, 'sauvegardes'); fs.mkdirSync(SAUV_DIR, { recursive:true });
const nomSur = n => String(n).replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 80);
const sauver = () => fs.writeFileSync(BASE_FILE, JSON.stringify(base, null, 1));
const garder = (L, n = 1000) => { if (L.length > n) L.splice(0, L.length - n); };
function baseSet(c, cle, valeur) {
  base[c] = base[c] || {}; const ancien = base[c][cle] === undefined ? null : base[c][cle];
  if (valeur === null || valeur === undefined) delete base[c][cle]; else base[c][cle] = valeur;
  base.historique.push({ t:new Date().toISOString(), collection:c, cle, ancien, nouveau:valeur === undefined ? null : valeur }); garder(base.historique); sauver();
  ecrire([hh(Date.now()) + ' BASE  ' + c + '.' + cle + ' = ' + JSON.stringify(valeur)]);
}
const hh = t => new Date(t).toISOString().slice(11, 23);
const ecrire = lignes => { fs.appendFileSync(FILE, lignes.join('\n') + '\n'); try { if (fs.statSync(FILE).size > MAX) { const b = fs.readFileSync(FILE); fs.writeFileSync(FILE, b.subarray(b.length >> 1)); } } catch (e) {} };
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.method === 'POST' && req.url.startsWith('/log')) {
    let body = ''; req.on('data', c => { body += c; if (body.length > 5e6) req.destroy(); });
    req.on('end', () => { try { const L = JSON.parse(body); ecrire(L.map(e => hh(e.t) + ' ' + String(e.n).toUpperCase().padEnd(5) + ' ' + e.m)); res.writeHead(204); } catch (e) { res.writeHead(400); } res.end(); });
    return;
  }
  if (req.url.startsWith('/base')) {
    if (req.method === 'GET' && req.url === '/base/sauvegardes') { const L = fs.readdirSync(SAUV_DIR).filter(f => f.endsWith('.json')).sort().map(f => ({ nom:f.slice(0, -5), taille:fs.statSync(path.join(SAUV_DIR, f)).size })); res.writeHead(200, { 'Content-Type':'application/json; charset=utf-8' }); return res.end(JSON.stringify(L)); }
    if (req.method === 'GET' && req.url.startsWith('/base/sauvegarde?')) { try { const t = fs.readFileSync(path.join(SAUV_DIR, nomSur(new URL(req.url, 'http://x').searchParams.get('nom')) + '.json'), 'utf8'); res.writeHead(200, { 'Content-Type':'application/json; charset=utf-8' }); return res.end(t); } catch (e) { res.writeHead(404); return res.end(); } }
    if (req.method === 'GET' && req.url === '/base/commandes') { res.writeHead(200, { 'Content-Type':'application/json; charset=utf-8' }); return res.end(JSON.stringify((base.commandes || []).filter(c => !c.fait))); }
    if (req.method === 'GET') { res.writeHead(200, { 'Content-Type':'application/json; charset=utf-8' }); return res.end(JSON.stringify(base)); }
    let body = ''; req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const d = body ? JSON.parse(body) : {};
        if (req.url === '/base/set') baseSet(d.collection, d.cle, d.valeur);
        else if (req.url === '/base/action') { base.actions.push({ t:new Date().toISOString(), nom:d.nom, detail:d.detail === undefined ? null : d.detail }); garder(base.actions); sauver(); ecrire([hh(Date.now()) + ' ACTION ' + d.nom + ' ' + JSON.stringify(d.detail === undefined ? '' : d.detail)]); }
        else if (req.url === '/base/sauvegarde') { fs.writeFileSync(path.join(SAUV_DIR, nomSur(d.nom) + '.json'), JSON.stringify({ cle:d.cle, search:d.search, t:new Date().toISOString(), donnees:d.donnees })); const L = fs.readdirSync(SAUV_DIR).filter(f => f.endsWith('.json')).sort(); while (L.length > 40) fs.unlinkSync(path.join(SAUV_DIR, L.shift())); ecrire([hh(Date.now()) + ' SAUV  ' + nomSur(d.nom) + ' (' + String(d.donnees || '').length + ' octets)']); }
        else if (req.url === '/base/commande') { base.commandes = base.commandes || []; const id = (base.commandes.reduce((m, c) => Math.max(m, c.id), 0)) + 1; base.commandes.push({ id, nom:d.nom, params:d.params || {}, t:new Date().toISOString(), fait:false }); garder(base.commandes, 100); sauver(); ecrire([hh(Date.now()) + ' CMD   ' + d.nom + ' ' + JSON.stringify(d.params || {})]); }
        else if (req.url === '/base/fait') { const c = (base.commandes || []).find(x => x.id === d.id); if (c) { c.fait = true; c.faitLe = new Date().toISOString(); sauver(); ecrire([hh(Date.now()) + ' CMD   fait ' + c.nom + ' #' + c.id]); } }
        else if (req.url === '/base/sync') { if (!Object.keys(base.stocks).length && d.stocks) for (const [k, v] of Object.entries(d.stocks)) baseSet('stocks', k, v); }
        res.writeHead(204);
      } catch (e) { res.writeHead(400); }
      res.end();
    });
    return;
  }
  if (req.method === 'GET' && req.url.startsWith('/tail')) { const n = +(new URL(req.url, 'http://x').searchParams.get('n')) || 100; let t = ''; try { t = fs.readFileSync(FILE, 'utf8').split('\n').slice(-n).join('\n'); } catch (e) {} res.writeHead(200, { 'Content-Type':'text/plain; charset=utf-8' }); return res.end(t); }
  if (req.method === 'DELETE') { fs.writeFileSync(FILE, ''); res.writeHead(204); return res.end(); }
  res.writeHead(200, { 'Content-Type':'text/plain; charset=utf-8' }); res.end('Serveur de logs Paper Conquest : POST /log, GET /tail?n=100, DELETE /log, GET /base\nLogs : ' + FILE + '\nBase : ' + BASE_FILE + '\n');
}).listen(PORT, () => console.log('Logs du jeu -> ' + FILE + '\nBase de données développeur -> ' + BASE_FILE + '\n(http://localhost:' + PORT + ')'));
