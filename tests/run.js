/* Runs every suite in tests/ against a static server over the repository,
   in each engine named on the command line:

     node tests/run.js                       # chromium
     node tests/run.js chromium firefox webkit
     node tests/run.js firefox regions       # one engine, suites matching "regions"

   A suite is a script that prints PASS and FAIL lines and exits non-zero
   on any failure. Screenshots and PDFs land in tests/output/.

   Each suite runs in a process and a browser of its own, so suites run
   several at a time, across every engine: PUDL_JOBS of them, by default
   half the machine's processors up to eight. A suite that runs longer
   than PUDL_SUITE_TIMEOUT seconds, 120 by default, is stopped and counted
   as failed, so one that hangs cannot hold up the run. */
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = Number(process.env.PUDL_PORT || 8765);
const ENGINES = ['chromium', 'firefox', 'webkit'];
const JOBS = Math.max(1, Number(process.env.PUDL_JOBS) || Math.min(8, Math.floor(os.cpus().length / 2) || 1));
const SUITE_TIMEOUT = 1000 * (Number(process.env.PUDL_SUITE_TIMEOUT) || 120);

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
    let outText = '', timedOut = false;
    child.stdout.on('data', d => { outText += d; });
    child.stderr.on('data', d => { outText += d; });
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, SUITE_TIMEOUT);
    child.on('close', code => {
      clearTimeout(timer);
      if (timedOut) outText += '\nFAIL the suite ran longer than ' + SUITE_TIMEOUT / 1000 + 's and was stopped';
      resolve({ code: timedOut ? 1 : code, outText });
    });
  });
}

(async () => {
  const suites = fs.readdirSync(__dirname)
    .filter(f => f.endsWith('.test.js'))
    .filter(f => !filters.length || filters.some(x => f.includes(x)))
    .sort();
  const server = await serve();
  const runStarted = Date.now();
  const queue = [];
  engines.forEach(engine => suites.forEach(suite => queue.push({ engine, suite })));
  const results = [];

  /* Each worker takes the next suite until none are left, and reports it
     as it finishes. */
  async function worker() {
    for (let job = queue.shift(); job; job = queue.shift()) {
      const started = Date.now();
      const { code, outText } = await runSuite(job.suite, job.engine);
      const lines = outText.split('\n').filter(l => l.trim() && !/^\s*\u001b\[2m/.test(l));
      const failed = lines.filter(l => /^FAIL /.test(l));
      const secs = (Date.now() - started) / 1000;
      console.log((code === 0 ? 'ok   ' : 'FAIL ') + job.engine.padEnd(9) + job.suite.padEnd(34) + secs.toFixed(1) + 's');
      /* The failed checks, or where the suite stopped if it threw. */
      if (code !== 0) (failed.length ? failed : lines.slice(-6)).slice(0, 10).forEach(l => console.log('       ' + l.slice(0, 220)));
      results.push({ engine: job.engine, suite: job.suite, code, secs });
    }
  }
  await Promise.all(Array.from({ length: Math.min(JOBS, queue.length) }, worker));
  server.close();

  const bad = results.filter(r => r.code !== 0);
  const slow = results.slice().sort((a, b) => b.secs - a.secs).slice(0, 5)
    .map(r => r.engine + ' ' + r.suite.replace('.test.js', '') + ' ' + r.secs.toFixed(1) + 's').join(', ');
  console.log('\nSlowest: ' + slow);
  console.log((results.length - bad.length) + ' of ' + results.length + ' suite runs passed in ' +
              ((Date.now() - runStarted) / 1000).toFixed(0) + 's, ' + JOBS + ' at a time');
  process.exit(bad.length ? 1 : 0);
})();
