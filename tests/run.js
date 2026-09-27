/* Runs every suite in tests/ against a static server over the repository,
   in each engine named on the command line:

     node tests/run.js                       # chromium
     node tests/run.js chromium firefox webkit
     node tests/run.js firefox regions       # one engine, suites matching "regions"

   A suite is a script that prints PASS and FAIL lines and exits non-zero
   on any failure. Screenshots and PDFs land in tests/output/. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = Number(process.env.PUDL_PORT || 8765);
const ENGINES = ['chromium', 'firefox', 'webkit'];

const args = process.argv.slice(2);
const engines = args.filter(a => ENGINES.includes(a));
const filters = args.filter(a => !ENGINES.includes(a));
if (!engines.length) engines.push('chromium');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json',
  '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8'
};

function serve() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let file = path.join(ROOT_DIR, decodeURIComponent(url.pathname));
    if (!file.startsWith(ROOT_DIR)) { res.writeHead(403); res.end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

function runSuite(file, engine) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, [path.join(__dirname, file)], {
      env: Object.assign({}, process.env, { PUDL_BROWSER: engine, PUDL_ROOT: 'http://127.0.0.1:' + PORT }),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let outText = '';
    child.stdout.on('data', d => { outText += d; });
    child.stderr.on('data', d => { outText += d; });
    child.on('close', code => resolve({ code, outText }));
  });
}

(async () => {
  const suites = fs.readdirSync(__dirname)
    .filter(f => f.endsWith('.test.js'))
    .filter(f => !filters.length || filters.some(x => f.includes(x)))
    .sort();
  const server = await serve();
  const results = [];
  for (const engine of engines) {
    for (const suite of suites) {
      const started = Date.now();
      const { code, outText } = await runSuite(suite, engine);
      const lines = outText.split('\n').filter(l => l.trim() && !/^\s*\u001b\[2m/.test(l));
      const failed = lines.filter(l => /^FAIL /.test(l));
      const secs = ((Date.now() - started) / 1000).toFixed(1);
      console.log((code === 0 ? 'ok   ' : 'FAIL ') + engine.padEnd(9) + suite.padEnd(34) + secs + 's');
      /* The failed checks, or where the suite stopped if it threw. */
      if (code !== 0) (failed.length ? failed : lines.slice(-6)).slice(0, 10).forEach(l => console.log('       ' + l.slice(0, 220)));
      results.push({ engine, suite, code });
    }
  }
  server.close();
  const bad = results.filter(r => r.code !== 0);
  console.log('\n' + (results.length - bad.length) + ' of ' + results.length + ' suite runs passed');
  process.exit(bad.length ? 1 : 0);
})();
