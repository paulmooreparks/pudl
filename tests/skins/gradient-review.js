/* Measure rendered text over the actual glossy and striped backgrounds. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), crypto = require('crypto');
const { execFileSync } = require('child_process');
const pw = require('playwright'), assert = require('assert/strict');
const source = path.resolve(process.argv[2]), output = path.resolve(process.argv[3]);
const skin = process.argv.includes('--skin') ? process.argv[process.argv.indexOf('--skin') + 1] : 'gel';
if (!['gel', 'glaze'].includes(skin)) throw new Error('skin must be gel or glaze');
async function settle(page) {
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all(document.getAnimations().filter(a => a.effect && Number.isFinite(a.effect.getComputedTiming().endTime)).map(a => a.finished.catch(() => {}))); });
}
async function main() {
  assert.ok(!fs.existsSync(output), 'output must be new'); fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((request, response) => {
    const file = path.resolve(source, '.' + new URL(request.url, 'http://localhost').pathname);
    if (!file.startsWith(source + path.sep) || !fs.existsSync(file)) { response.statusCode = 404; response.end(); return; }
    response.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream'); response.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const results = [], browsers = {};
  try {
    for (const engine of ['chromium', 'firefox', 'webkit']) {
      const browser = await pw[engine].launch(); browsers[engine] = browser.version();
      try {
        for (const theme of ['light', 'dark']) {
          const page = await browser.newPage({ viewport: { width: 1280, height: 1400 }, deviceScaleFactor: 1, reducedMotion: 'reduce' }); page.setDefaultTimeout(10000);
          const errors = []; page.on('pageerror', e => errors.push(e.message));
          await page.goto('http://127.0.0.1:' + server.address().port + '/samples/skins.html?skin=' + skin + '&theme=' + theme);
          await page.waitForFunction(() => document.querySelectorAll('.win').length === 2);
          await page.addStyleTag({ content: '*{transition:none!important;animation:none!important}' }); await settle(page);
          const cases = [
            { id: 'ordinary', selector: 'main .btn:not(.btn-primary):not(.btn-danger)', text: 'Open', states: ['rest', 'hover', 'pressed', 'focus'] },
            { id: 'primary', selector: 'main .btn-primary', text: 'Save', states: ['rest', 'hover', 'pressed', 'focus'] },
            { id: 'danger', selector: 'main .btn-danger', text: 'Delete', states: ['rest', 'hover', 'pressed', 'focus'] },
            { id: 'latched', selector: 'main .btn[aria-pressed="true"]', text: 'Pinned', states: ['rest'] },
            { id: 'primary-latched', selector: 'main .btn-primary[aria-pressed="true"]', text: 'Selected', states: ['rest'] },
            { id: 'active-title', selector: '.win.active .win-title', states: ['rest'] }
          ];
          for (const test of cases) for (const state of test.states) {
            let control = page.locator(test.selector); if (test.text) control = control.filter({ hasText: new RegExp('^' + test.text + '$') }); control = control.first();
            await control.scrollIntoViewIfNeeded(); await page.mouse.move(0, 0);
            if (state === 'hover' || state === 'pressed') await control.hover();
            if (state === 'pressed') await page.mouse.down();
            if (state === 'focus') { await page.keyboard.press('Tab'); await control.focus(); }
            await settle(page);
            const metadata = await control.evaluate(node => {
              const s = getComputedStyle(node), canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
              const ctx = canvas.getContext('2d'); ctx.fillStyle = s.color; ctx.fillRect(0, 0, 1, 1);
              const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT), textRects = []; let text;
              while ((text = walker.nextNode())) if (text.nodeValue.trim()) { const range = document.createRange(); range.selectNodeContents(text); for (const r of range.getClientRects()) if (r.width && r.height) textRects.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom }); }
              return { foreground: [...ctx.getImageData(0, 0, 1, 1).data], textRects, color: s.color, background: s.backgroundImage, originalStyle: node.getAttribute('style') };
            });
            const name = engine + '-' + theme + '-' + test.id + '-' + state;
            const normal = path.join(output, name + '-normal.png'), base = path.join(output, name + '-background.png'), meta = path.join(output, name + '.json');
            await page.screenshot({ path: normal, caret: 'hide' });
            await control.evaluate(node => { node.style.setProperty('color', 'transparent', 'important'); node.style.setProperty('text-shadow', 'none', 'important'); });
            await page.screenshot({ path: base, caret: 'hide' });
            await control.evaluate((node, style) => { if (style === null) node.removeAttribute('style'); else node.setAttribute('style', style); }, metadata.originalStyle);
            fs.writeFileSync(meta, JSON.stringify(metadata, null, 2));
            const pixels = JSON.parse(execFileSync('python', [path.join(__dirname, 'gradient-pixels.py'), normal, base, meta], { encoding: 'utf8' }));
            const pass = metadata.foreground[3] === 255 && pixels.pass;
            results.push({ name, pass, pixels }); console.log((pass ? 'PASS ' : 'FAIL ') + name + ' ' + pixels.minimumContrast.toFixed(3));
            if (state === 'pressed') await page.mouse.up(); await page.mouse.move(0, 0); await page.evaluate(() => document.activeElement.blur());
          }
          results.push({ name: engine + '-' + theme + '-no-page-errors', pass: errors.length === 0, errors }); await page.close();
        }
      } finally { await browser.close(); }
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
  const inputs = Object.fromEntries(['dist/pudl.css', 'dist/pudl-windows.css', 'samples/skins-' + skin + '.css', 'samples/skins.js', 'samples/skins.html'].map(f => [f, crypto.createHash('sha256').update(fs.readFileSync(path.join(source, f))).digest('hex')]));
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ source, inputs, browsers, results }, null, 2));
  console.log(results.filter(r => r.pass).length + '/' + results.length + ' rendered gradient checks pass');
  process.exitCode = results.some(r => !r.pass) ? 1 : 0;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
