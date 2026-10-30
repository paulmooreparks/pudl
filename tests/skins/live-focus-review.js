/* Exercise keyboard activation before measuring the live window indicator. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { execFileSync } = require('child_process');
const assert = require('assert/strict'), pw = require('playwright');
const source = path.resolve(process.argv[2]), output = path.resolve(process.argv[3]);
const skinIndex = process.argv.indexOf('--skin');
const skin = skinIndex < 0 ? 'bevel' : process.argv[skinIndex + 1];
assert.ok(['bevel', 'gel', 'glaze'].includes(skin), 'unknown skin');
async function main() {
  assert.ok(!fs.existsSync(output), 'output must be new'); fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((request, response) => {
    const file = path.resolve(source, '.' + new URL(request.url, 'http://localhost').pathname);
    if (!file.startsWith(source + path.sep) || !fs.existsSync(file)) { response.statusCode = 404; response.end(); return; }
    response.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream'); response.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const results = [];
  try {
    for (const engine of ['chromium', 'firefox', 'webkit']) {
      const browser = await pw[engine].launch();
      try {
        for (const theme of ['light', 'dark']) {
          const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } }); page.setDefaultTimeout(10000);
          await page.goto('http://127.0.0.1:' + server.address().port + '/samples/skins.html?skin=' + skin + '&theme=' + theme);
          await page.waitForFunction(() => document.querySelectorAll('.win').length === 2);
          await page.evaluate(async () => { await document.fonts.ready; });
          const control = page.locator('[data-win="editor"] .win-btn[data-win-action="close"]');
          const initiallyInactive = await control.evaluate(node => !node.closest('.win').classList.contains('active'));
          const name = engine + '-' + theme, beforeFile = path.join(output, name + '-before.png'), afterFile = path.join(output, name + '-after.png');
          await page.screenshot({ path: beforeFile, caret: 'hide' });
          await page.keyboard.press('Tab'); await control.focus();
          await page.waitForFunction(() => document.querySelector('[data-win="editor"]').classList.contains('active'));
          const bounds = await control.boundingBox();
          await page.screenshot({ path: afterFile, caret: 'hide' });
          const state = await control.evaluate(node => ({ active: node.closest('.win').classList.contains('active'), focused: node === document.activeElement, focusVisible: node.matches(':focus-visible'), shadow: getComputedStyle(node).boxShadow }));
          let pixels;
          if (skin === 'bevel') {
            pixels = JSON.parse(execFileSync('python', [path.join(__dirname, 'focus-pixels.py'), beforeFile, afterFile, String(bounds.x), String(bounds.y), String(bounds.x + bounds.width), String(bounds.y + bounds.height), '--two-color'], { encoding: 'utf8' }));
          } else {
            const radius = await control.evaluate(node => parseFloat(getComputedStyle(node).borderTopLeftRadius));
            const metadata = path.join(output, name + '-rounded.json');
            fs.writeFileSync(metadata, JSON.stringify({ bounds, radius, twoColor: true }));
            pixels = JSON.parse(execFileSync('python', [path.join(__dirname, 'rounded-focus-pixels.py'), afterFile, metadata], { encoding: 'utf8' }));
          }
          const pass = initiallyInactive && state.active && state.focused && state.focusVisible && (skin === 'bevel' ? pixels.twoColor.pass : pixels.pass);
          results.push({ name, initiallyInactive, bounds, state, pixels, pass }); console.log((pass ? 'PASS ' : 'FAIL ') + name);
          await page.close();
        }
      } finally { await browser.close(); }
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ source, skin, results }, null, 2));
  process.exitCode = results.some(r => !r.pass) ? 1 : 0;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
