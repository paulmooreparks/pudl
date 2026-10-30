/* Headed Chromium session for a native browser-command zoom review. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), crypto = require('crypto');
const assert = require('assert/strict'), pw = require('playwright');
const source = path.resolve(process.argv[2]), output = path.resolve(process.argv[3]);
async function main() {
  assert.ok(!fs.existsSync(output), 'output must be new'); fs.mkdirSync(output, { recursive: true });
  let browser, page, baseline, completed = false;
  const measure = () => page.evaluate(() => ({ dpr: devicePixelRatio, innerWidth, outerWidth, visualScale: visualViewport.scale, documentWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/__capture') {
      try {
        const zoomed = await measure(), results = [];
        const actualTwoHundred = Math.abs(zoomed.dpr / baseline.dpr - 2) < .01 && Math.abs(baseline.innerWidth / zoomed.innerWidth - 2) < .03 && Math.abs(zoomed.visualScale - 1) < .01;
        for (const skin of ['bevel', 'gel', 'glaze']) for (const theme of ['light', 'dark']) {
          await page.locator('#skin').selectOption(skin); await page.locator('#theme').selectOption(theme);
          await page.evaluate(async () => { await document.fonts.ready; });
          const field = page.locator('main input').first(); await field.fill('Zoom review edited value'); await field.focus();
          const observation = await page.evaluate(() => {
            const root = document.documentElement, field = document.querySelector('main input');
            return { skin: root.dataset.skin, theme: root.dataset.theme, width: root.clientWidth, scrollWidth: root.scrollWidth, retained: field.value === 'Zoom review edited value' && field === document.activeElement,
              fields: [...document.querySelectorAll('input,select')].map(n => { const s = getComputedStyle(n), r = n.getBoundingClientRect(); return { tag: n.tagName, height: r.height, fontSize: s.fontSize, lineHeight: s.lineHeight, clientHeight: n.clientHeight }; }) };
          });
          const pass = actualTwoHundred && observation.skin === skin && observation.theme === theme && observation.scrollWidth <= observation.width + 1 && observation.retained;
          results.push({ name: skin + '-' + theme, pass, observation });
          await page.screenshot({ path: path.join(output, skin + '-' + theme + '-200.png'), fullPage: true, caret: 'hide' });
        }
        const inputs = Object.fromEntries(['dist/pudl.css', 'dist/pudl-windows.css', ...['bevel', 'gel', 'glaze'].map(s => 'samples/skins-' + s + '.css')].map(f => [f, crypto.createHash('sha256').update(fs.readFileSync(path.join(source, f))).digest('hex')]));
        const record = { source, method: 'Native browser zoom command through Windows Computer Use; no emulation or CSS transform', browser: browser.version(), baseline, zoomed, actualTwoHundred, inputs, results };
        fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(record, null, 2)); completed = true;
        res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(record));
      } catch (e) { res.statusCode = 500; res.end(e.stack); }
      return;
    }
    if (url.pathname === '/__finish') { res.end('Closing dedicated zoom session'); await browser.close(); server.close(); process.exitCode = completed ? 0 : 1; return; }
    const file = path.resolve(source, '.' + url.pathname);
    if (!file.startsWith(source + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.statusCode = 404; res.end(); return; }
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream'); res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  browser = await pw.chromium.launch({ headless: false, args: ['--window-size=1280,1000'] });
  const context = await browser.newContext({ viewport: null, reducedMotion: 'reduce' }); page = await context.newPage();
  await page.goto('http://127.0.0.1:' + server.address().port + '/samples/skins.html?skin=bevel&theme=light');
  await page.evaluate(async () => { document.title = 'PUDL actual zoom review'; await document.fonts.ready; }); baseline = await measure();
  fs.writeFileSync(path.join(output, 'session.json'), JSON.stringify({ base: 'http://127.0.0.1:' + server.address().port, baseline }, null, 2));
  console.log('Dedicated zoom session ready at http://127.0.0.1:' + server.address().port);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
