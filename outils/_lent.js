// serveur minimal pour outils/_cap.html : /slow repond (gif 1x1) apres 25 s. node outils/_lent.js
require('http').createServer((q, r) => setTimeout(() => { r.writeHead(200, { 'Content-Type':'image/gif' }); r.end(Buffer.from('R0lGODlhAQABAAAAACw=', 'base64')); }, 14000)).listen(9000);
