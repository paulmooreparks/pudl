/* Run existing behavior suites against immutable skin-styled fixtures. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { spawn } = require('child_process');
const assert = require('assert/strict'), crypto = require('crypto');
const source = path.resolve(process.argv[2] || 'tests/output/skins-bevel-corrected-source');
const output = path.resolve(process.argv[3] || 'tests/output/skins-bevel-behavior');
const skinIndex = process.argv.indexOf('--skin');
const skin = skinIndex < 0 ? 'bevel' : process.argv[skinIndex + 1];
assert.ok(['bevel', 'gel', 'glaze'].includes(skin), 'unknown skin');
const suites = ['context-menu', 'taskbar-stacks', 'snap', 'docked'];
let theme = 'light', injected = 0, skinRequests = 0;
async function main() {
  assert.ok(!fs.existsSync(output), 'output must be new'); fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost'), file = path.resolve(source, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(source + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { response.statusCode = 404; response.end(); return; }
    const ext = path.extname(file);
    let body = fs.readFileSync(file);
    if (ext === '.html') {
      body = body.toString('utf8').replace(/<html\b([^>]*)>/i, (_, attrs) => '<html' + attrs.replace(/\sdata-(?:theme|skin)="[^"]*"/g, '') + ' data-theme="' + theme + '" data-skin="' + skin + '">')
        .replace(/<\/head>/i, '<link rel="stylesheet" href="/samples/skins-' + skin + '.css"></head>');
      injected++;
    }
    if (url.pathname === '/samples/skins-' + skin + '.css') skinRequests++;
    response.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.json': 'application/json', '.svg': 'image/svg+xml' })[ext] || 'application/octet-stream');
    response.end(body);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const root = 'http://127.0.0.1:' + server.address().port, results = [];
  try {
    for (const form of ['light', 'dark']) for (const engine of ['chromium', 'firefox', 'webkit']) for (const suite of suites) {
      theme = form;
      const name = engine + '-' + form + '-' + suite, script = path.resolve('tests/' + suite + '.test.js');
      const before = { injected, skinRequests };
      const result = await new Promise(resolve => {
        const child = spawn(process.execPath, [script], { env: { ...process.env, PUDL_ROOT: root, PUDL_BROWSER: engine, PUDL_MIN: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
        let text = '', timedOut = false;
        child.stdout.on('data', b => { text += b; }); child.stderr.on('data', b => { text += b; });
        const timer = setTimeout(() => { timedOut = true; child.kill(); }, 180000);
        child.on('close', code => { clearTimeout(timer); resolve({ code, timedOut, text }); });
      });
      fs.writeFileSync(path.join(output, name + '.log'), result.text);
      const record = { name, code: result.code, timedOut: result.timedOut, htmlResponses: injected - before.injected, skinResponses: skinRequests - before.skinRequests, scriptHash: crypto.createHash('sha256').update(fs.readFileSync(script)).digest('hex') };
      record.pass = record.code === 0 && !record.timedOut && record.htmlResponses > 0 && record.skinResponses > 0;
      results.push(record); console.log((record.pass ? 'PASS ' : 'FAIL ') + name);
      fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ source, skin, results }, null, 2));
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
  console.log(results.filter(r => r.pass).length + '/' + results.length + ' ' + skin + ' behavior suite runs pass');
  process.exitCode = results.some(r => !r.pass) ? 1 : 0;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
