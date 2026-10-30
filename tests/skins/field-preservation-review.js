/* Compare default one-line fields with frozen Standard, then inspect text growth. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), crypto = require('crypto');
const assert = require('assert/strict'), pw = require('playwright');
const source = path.resolve(process.argv[2]), output = path.resolve(process.argv[3]);
const original = path.resolve('tests/output/skins-source-20261030-1702');
const controlOriginal = process.argv.includes('--control-original');
const html = '<!doctype html><html><head><link rel="stylesheet" href="/dist/pudl.css">' + ['bevel', 'gel', 'glaze'].map(s => '<link rel="stylesheet" href="/samples/skins-' + s + '.css">').join('') + '</head><body><main style="padding:24px;display:grid;gap:12px;width:360px">' + ['text', 'password', 'number', 'search', 'date', 'time', 'email'].map(t => '<input aria-label="' + t + '" class="form-input" type="' + t + '" value="' + (t === 'number' ? '12' : t === 'date' ? '2026-10-30' : t === 'time' ? '12:30' : 'Example') + '">').join('') + '<select aria-label="native" class="form-select"><option>Location</option></select><span class="form-select-wrap"><select aria-label="wrapped" class="form-select"><option>Location</option></select></span></main></body></html>';
async function main() {
  assert.ok(!fs.existsSync(output), 'output must be new'); fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/') { res.setHeader('Content-Type', 'text/html'); res.end(html); return; }
    const file = path.resolve(source, '.' + url.pathname);
    if (!file.startsWith(source + path.sep) || !fs.existsSync(file)) { res.statusCode = 404; res.end(); return; }
    res.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : 'font/woff2'); res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const results = [], read = page => page.locator('input,select').evaluateAll(nodes => nodes.map(n => {
    const s = getComputedStyle(n), r = n.getBoundingClientRect();
    return { label: n.getAttribute('aria-label'), bounds: [r.x, r.y, r.width, r.height], client: [n.clientWidth, n.clientHeight], styles: Object.fromEntries(['fontSize', 'fontFamily', 'lineHeight', 'paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth', 'borderRadius', 'color', 'backgroundColor', 'backgroundImage', 'boxShadow'].map(p => [p, s[p]])) };
  }));
  try {
    for (const engine of ['chromium', 'firefox', 'webkit']) {
      const browser = await pw[engine].launch();
      try {
        for (const theme of ['light', 'dark']) for (const direction of ['ltr', 'rtl']) {
          const images = [], observations = [];
          for (const mode of ['original', 'candidate']) {
            const page = await browser.newPage({ viewport: { width: 600, height: 900 }, reducedMotion: 'reduce' });
            if (mode === 'original' || controlOriginal) await page.route('**/dist/pudl.css', route => route.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(original, 'dist/pudl.css')) }));
            await page.goto('http://127.0.0.1:' + server.address().port);
            await page.evaluate(async ({ theme, direction }) => { document.documentElement.dataset.theme = theme; document.documentElement.dir = direction; await document.fonts.load('14px Inter', 'Location Example'); await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); }, { theme, direction });
            observations.push(await read(page)); images.push(await page.screenshot({ caret: 'hide' }));
            fs.writeFileSync(path.join(output, engine + '-' + theme + '-' + direction + '-' + mode + '.png'), images.at(-1));
            if (mode === 'candidate' && !controlOriginal) for (const skin of ['standard', 'bevel', 'gel', 'glaze']) {
              await page.evaluate(skin => { document.documentElement.dataset.skin = skin; document.querySelectorAll('input,select').forEach(n => { n.style.fontSize = '28px'; }); }, skin);
              const enlarged = await read(page);
              const pass = enlarged.every(o => { const s = o.styles, requiredLine = s.lineHeight === 'normal' ? 1.25 * parseFloat(s.fontSize) : parseFloat(s.lineHeight); return o.bounds[3] >= 53 && o.bounds[3] - ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'].reduce((sum, p) => sum + parseFloat(s[p]), 0) + 1 >= requiredLine; });
              results.push({ name: engine + '-' + theme + '-' + direction + '-' + skin + '-enlarged', pass, observations: enlarged });
              await page.screenshot({ path: path.join(output, engine + '-' + theme + '-' + direction + '-' + skin + '-enlarged.png'), caret: 'hide' });
            }
            await page.close();
          }
          const pass = JSON.stringify(observations[0]) === JSON.stringify(observations[1]) && images[0].equals(images[1]) && observations[1].every(o => o.bounds[3] === 36);
          results.push({ name: engine + '-' + theme + '-' + direction + '-default-preservation', pass, observations });
        }
      } finally { await browser.close(); }
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
  const inputHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(source, 'dist/pudl.css'))).digest('hex');
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ source, original, controlOriginal, inputHash, results }, null, 2));
  console.log(results.filter(r => r.pass).length + '/' + results.length + ' field profiles pass'); process.exitCode = results.some(r => !r.pass) ? 1 : 0;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
