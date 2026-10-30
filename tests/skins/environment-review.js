/* Supplemental preview reflow and retention under alternate font/direction conditions. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), crypto = require('crypto');
const assert = require('assert/strict'), pw = require('playwright');
const source = path.resolve(process.argv[2]), output = path.resolve(process.argv[3]);
const conditionIndex = process.argv.indexOf('--conditions');
const conditions = conditionIndex < 0 ? ['rtl', 'blocked-font', 'system-font', 'large-text'] : process.argv[conditionIndex + 1].split(',');
assert.ok(conditions.every(c => ['rtl', 'blocked-font', 'system-font', 'large-text'].includes(c)), 'unknown environment condition');
async function main() {
  assert.ok(!fs.existsSync(output), 'output must be new'); fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((req, res) => {
    const file = path.resolve(source, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(source + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.statusCode = 404; res.end(); return; }
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream'); res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const results = [], browsers = {};
  try {
    for (const engine of ['chromium', 'firefox', 'webkit']) {
      const browser = await pw[engine].launch(); browsers[engine] = browser.version();
      try {
        for (const theme of ['light', 'dark']) for (const skin of ['bevel', 'gel', 'glaze']) for (const condition of conditions) {
          const page = await browser.newPage({ viewport: { width: 360, height: 900 }, reducedMotion: 'reduce' });
          const errors = []; page.on('pageerror', error => errors.push(error.message));
          let blockedFonts = 0;
          if (condition === 'blocked-font') await page.route('**/*.woff2', route => { blockedFonts++; return route.abort(); });
          await page.goto('http://127.0.0.1:' + server.address().port + '/samples/skins.html?skin=' + skin + '&theme=' + theme);
          if (condition === 'system-font') await page.addStyleTag({ url: 'http://127.0.0.1:' + server.address().port + '/dist/pudl-fonts-system.css' });
          await page.waitForFunction(() => document.querySelectorAll('.win').length === 2);
          const enlargement = await page.evaluate(async condition => {
            if (condition === 'rtl') document.documentElement.dir = 'rtl';
            const field = document.querySelector('main input'), before = parseFloat(getComputedStyle(field).fontSize);
            if (condition === 'large-text') {
              const measurements = [...document.querySelectorAll('body *')].map(node => { const s = getComputedStyle(node); return { node, size: parseFloat(s.fontSize), line: parseFloat(s.lineHeight) }; });
              measurements.forEach(({ node, size, line }) => { node.style.fontSize = size * 2 + 'px'; if (Number.isFinite(line)) node.style.lineHeight = String(line / size); });
            }
            await document.fonts.ready;
            return { before, after: parseFloat(getComputedStyle(field).fontSize) };
          }, condition);
          const field = page.locator('main input').first(); await field.fill('Supplemental edited value'); await field.focus();
          const observation = await page.evaluate(() => {
            const field = document.querySelector('main input'), root = document.documentElement;
            const nodes = [...document.querySelectorAll('main .btn, main input, main select, main textarea')].filter(n => n.getBoundingClientRect().width);
            return { effective: root.dataset.skin, direction: getComputedStyle(root).direction, fontSize: getComputedStyle(root).fontSize, width: root.clientWidth, scrollWidth: root.scrollWidth, value: field.value, focused: field === document.activeElement,
              controls: nodes.map(n => { const r = n.getBoundingClientRect(); return { text: n.textContent.trim(), left: r.left, right: r.right, width: r.width, height: r.height }; }),
              activeAnimations: document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getComputedTiming().iterations === Infinity).length };
          });
          const name = engine + '-' + theme + '-' + skin + '-' + condition;
          const pass = errors.length === 0 && observation.effective === skin && observation.scrollWidth <= observation.width + 1 && observation.value === 'Supplemental edited value' && observation.focused && observation.activeAnimations === 0 && observation.controls.every(c => c.width > 0 && c.height >= 24 && c.left >= -1 && c.right <= observation.width + 1) && (condition !== 'blocked-font' || blockedFonts > 0) && (condition !== 'rtl' || observation.direction === 'rtl') && (condition !== 'large-text' || enlargement.after === 2 * enlargement.before);
          await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true, caret: 'hide' });
          results.push({ name, pass, condition, blockedFonts, errors, enlargement, observation }); console.log((pass ? 'PASS ' : 'FAIL ') + name);
          await page.close();
        }
      } finally { await browser.close(); }
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
  const inputs = Object.fromEntries(['dist/pudl.css', 'dist/pudl-windows.css', 'samples/skins-bevel.css', 'samples/skins-gel.css', 'samples/skins-glaze.css'].map(f => [f, crypto.createHash('sha256').update(fs.readFileSync(path.join(source, f))).digest('hex')]));
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ source, browsers, inputs, results }, null, 2));
  process.exitCode = results.some(r => !r.pass) ? 1 : 0;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
