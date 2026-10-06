// ouvre une page dans Chromium (sans fenetre) via le protocole DevTools, attend, evalue du JS et capture l'ecran : node outils/_cdp.js <url> <sortie.png> "<expression JS>"
const { spawn } = require('child_process'), fs = require('fs'), os = require('os');
const path = require('path'), CH = path.join(process.env.LOCALAPPDATA, 'ms-playwright', 'chromium-1243', 'chrome-win64', 'chrome.exe'), [url, png, expr] = process.argv.slice(2), port = 9333 + Math.floor(Math.random() * 500);
const proc = spawn(CH, ['--headless=new', ...(process.env.GL ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : ['--disable-gpu']), '--no-sandbox', '--remote-debugging-port=' + port, '--user-data-dir=' + fs.mkdtempSync(path.join(os.tmpdir(), 'cdp')), '--window-size=1200,800', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (tabs.length) break; } catch (e) {} await sleep(500); }
  const ws = new WebSocket(tabs[0].webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const wait = new Map(), logs = [];
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && wait.has(d.id)) { wait.get(d.id)(d); wait.delete(d.id); } else if (d.method === 'Runtime.exceptionThrown') logs.push('EXC ' + d.params.exceptionDetails.text + ' ' + (d.params.exceptionDetails.exception && d.params.exceptionDetails.exception.description || '').slice(0, 300)); else if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(d.params.type)) logs.push(d.params.type + ' ' + d.params.args.map(a => a.value || a.description || '').join(' ').slice(0, 300)); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable'); await send('Page.navigate', { url });
  await sleep(+process.env.ATTENTE || 20000);
  const r = await send('Runtime.evaluate', { expression: expr || '1', returnByValue: true, awaitPromise: true });
  console.log('valeur:', JSON.stringify(r.result && r.result.result && r.result.result.value), r.result && r.result.exceptionDetails ? JSON.stringify(r.result.exceptionDetails).slice(0, 300) : '');
  console.log(logs.slice(0, 8).join('\n'));
  const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(png, Buffer.from(s.result.data, 'base64'));
  proc.kill(); process.exit(0);
})().catch(e => { console.log('ECHEC', e.message); proc.kill(); process.exit(1); });
