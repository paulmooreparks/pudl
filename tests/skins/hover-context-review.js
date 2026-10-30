/* Reproduce delayed stack hover while its group context command is open. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const assert = require('assert/strict'), pw = require('playwright');
const source = path.resolve(process.argv[2]), output = path.resolve(process.argv[3]);
async function main() {
  assert.ok(!fs.existsSync(output), 'output must be new'); fs.mkdirSync(output, { recursive: true });
  let skin = 'standard';
  const server = http.createServer((req, res) => {
    const file = path.resolve(source, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(source + path.sep) || !fs.existsSync(file)) { res.statusCode = 404; res.end(); return; }
    let body = fs.readFileSync(file);
    if (file.endsWith('.html') && skin !== 'standard') body = body.toString().replace('<html', '<html data-skin="' + skin + '"').replace('</head>', '<link rel="stylesheet" href="/samples/skins-' + skin + '.css"></head>');
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream'); res.end(body);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const results = [];
  try {
    for (const engine of ['chromium', 'firefox', 'webkit']) {
      const browser = await pw[engine].launch();
      try {
        for (skin of ['standard', 'bevel', 'gel', 'glaze']) {
          const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
          await page.goto('http://127.0.0.1:' + server.address().port + '/tests/fixtures/taskbar-stacks.html');
          await page.waitForFunction(() => window.pudlWindows && pudlWindows.state().open.includes('child'));
          const stack = page.locator('#all').getByRole('button', { name: /^Atlas,/ });
          await stack.click({ button: 'right' });
          // The pointer stays on the stack while the delayed hover boundary elapses.
          await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 800)));
          const before = await page.evaluate(() => ({ previews: [...document.querySelectorAll('.win-stack-panel')].filter(n => n.matches(':popover-open')).map(n => n.id), menus: [...document.querySelectorAll('.context-menu')].filter(n => n.matches(':popover-open')).map(n => n.id) }));
          let error = null;
          try { await page.getByRole('menuitem', { name: 'Close these 3 windows', exact: true }).click({ timeout: 1500 }); } catch (e) { error = e.message; }
          const open = await page.evaluate(() => pudlWindows.state().open);
          const pass = !error && ['a1', 'a2', 'a3'].every(id => !open.includes(id));
          const name = engine + '-' + skin;
          if (!pass) await page.screenshot({ path: path.join(output, name + '.png') });
          results.push({ name, pass, before, open, error }); console.log((pass ? 'PASS ' : 'FAIL ') + name);
          fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ source, results }, null, 2)); await page.close();
        }
      } finally { await browser.close(); }
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
  process.exitCode = results.some(r => !r.pass) ? 1 : 0;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
