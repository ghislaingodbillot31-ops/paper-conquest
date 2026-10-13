/* Validateur de la production en ligne de commande :  node outils/valider-production.js [--mermaid fichier.mmd]
   Lit data/production/*.json, applique js/batiments/validation-production.js et affiche le rapport. Code de sortie 1 s'il y a des erreurs (utile avant de valider une filière). */
const fs = require('fs'), path = require('path');
const { validerProduction, exporterMermaid } = require('../js/batiments/validation-production.js');
const DIR = path.join(__dirname, '..', 'data', 'production'), lire = f => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
const index = lire('index.json'), recettes = [];
for (const f of index.filieres) if ((f.migree || f.anticipee) && fs.existsSync(path.join(DIR, f.fichier))) recettes.push(...lire(f.fichier).recettes);   // (migrée, ou recettes saisies à l'avance)
const facultatif = f => fs.existsSync(path.join(DIR, f)) ? lire(f) : null;
const donnees = { index, ressources:lire('ressources.json'), ateliers:lire('ateliers.json'), recettes, couts:facultatif('couts_construction.json'), foyers:facultatif('besoins_foyers.json'), services:facultatif('besoins_services.json'), commerce:facultatif('commerce.json') };
const rapport = validerProduction(donnees);
const bloc = (titre, liste) => { console.log('\n' + titre + ' (' + liste.length + ')'); liste.forEach(x => console.log('  - ' + x.message)); };
console.log('Filières migrées : ' + rapport.stats.filieresMigrees.join(', ') + ' · ' + rapport.stats.recettes + ' recettes · ' + rapport.stats.ressources + ' ressources · ' + rapport.stats.ateliers + ' ateliers');
console.log('Ressources sans débouché : ' + rapport.stats.sansDebouche + ' · débouchés par type : ' + Object.entries(rapport.stats.debouchesParType).map(([k, v]) => k + ' ' + v).join(', '));
bloc('ERREURS', rapport.erreurs); bloc('AVERTISSEMENTS', rapport.avertissements); bloc('EN ATTENTE (filières pas encore migrées)', rapport.attente);
const i = process.argv.indexOf('--mermaid');
if (i > 0 && process.argv[i + 1]) { fs.writeFileSync(process.argv[i + 1], exporterMermaid(donnees)); console.log('\nGraphe Mermaid écrit dans ' + process.argv[i + 1]); }
process.exit(rapport.erreurs.length ? 1 : 0);
