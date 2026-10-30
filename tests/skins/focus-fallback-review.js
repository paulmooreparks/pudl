/* Compare the changed focus paths to original Standard rendered inputs. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), crypto = require('crypto');
const assert = require('assert/strict'), pw = require('playwright');
const { scenarios, sceneHTML } = require('./focus-review');
const source = path.resolve(process.argv[2]), output = path.resolve(process.argv[3]);
const original = path.resolve('tests/output/skins-source-20261030-1702');
async function main() {
  assert.ok(!fs.existsSync(output), 'output must be new'); fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/') {
      response.setHeader('Content-Type', 'text/html');
      let html = sceneHTML(scenarios.find(s => s.id === url.searchParams.get('case')));
      if (fs.existsSync(path.join(source, 'samples/skins-gel.css'))) html = html.replace('</head>', '<link rel="stylesheet" href="/samples/skins-gel.css"></head>');
      if (fs.existsSync(path.join(source, 'samples/skins-glaze.css'))) html = html.replace('</head>', '<link rel="stylesheet" href="/samples/skins-glaze.css"></head>');
      response.end(html); return;
    }
    const file = path.resolve(source, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(source + path.sep) || !fs.existsSync(file)) { response.statusCode = 404; response.end(); return; }
    response.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : 'font/woff2'); response.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port, results = [];
  try {
    for (const engine of ['chromium', 'firefox', 'webkit']) {
      const browser = await pw[engine].launch();
      try {
        for (const theme of ['light', 'dark']) for (const selection of ['absent', 'standard']) for (const scene of scenarios.filter(s => ['button-card', 'danger-card', 'active-window-close', 'inactive-window-close', 'topbar-status', 'menubar-status'].includes(s.id))) {
          const observations = [];
          const name = engine + '-' + theme + '-' + selection + '-' + scene.id;
          for (const mode of ['original', 'candidate']) {
            const page = await browser.newPage({ viewport: { width: 600, height: 300 } });
            if (mode === 'original') for (const css of ['pudl.css', 'pudl-windows.css']) await page.route('**/dist/' + css, route => route.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(original, 'dist', css)) }));
            await page.goto(base + '/?case=' + scene.id);
            await page.evaluate(async ({ theme, selection }) => { document.documentElement.dataset.theme = theme; if (selection === 'standard') document.documentElement.dataset.skin = 'standard'; else delete document.documentElement.dataset.skin; await document.fonts.ready; }, { theme, selection });
            const control = page.locator('#control');
            const read = () => control.evaluate(node => { const s = getComputedStyle(node), r = node.getBoundingClientRect(); return { rect: [r.x, r.y, r.width, r.height], focus: node.matches(':focus-visible'), styles: Object.fromEntries(['outlineStyle', 'outlineWidth', 'outlineColor', 'outlineOffset', 'boxShadow', 'backgroundImage', 'backgroundColor', 'borderColor', 'borderWidth', 'borderRadius', 'color', 'padding', 'fontFamily', 'fontSize'].map(p => [p, s[p]])) }; });
            const before = await read(), beforeImage = await page.screenshot({ caret: 'hide' });
            await page.keyboard.press('Tab');
            const after = await read(), afterImage = await page.screenshot({ caret: 'hide' });
            const dir = path.join(output, mode); fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, name + '-before.png'), beforeImage); fs.writeFileSync(path.join(dir, name + '-after.png'), afterImage);
            observations.push({ before, after, beforeRaster: crypto.createHash('sha256').update(beforeImage).digest('hex'), afterRaster: crypto.createHash('sha256').update(afterImage).digest('hex') });
            await page.close();
          }
          const result = { name, pass: JSON.stringify(observations[0]) === JSON.stringify(observations[1]), original: observations[0], candidate: observations[1] };
          results.push(result); console.log((result.pass ? 'PASS ' : 'FAIL ') + name);
        }
        for (const scene of scenarios.filter(s => ['active-window-close', 'topbar-status', 'menubar-status'].includes(s.id))) {
          const paints = [];
          for (const skin of ['standard', 'bevel']) {
            const page = await browser.newPage({ viewport: { width: 600, height: 300 }, forcedColors: 'active' });
            await page.goto(base + '/?case=' + scene.id); await page.evaluate(skin => { document.documentElement.dataset.skin = skin; }, skin); await page.keyboard.press('Tab');
            paints.push(await page.locator('#control').evaluate(node => { const s = getComputedStyle(node); return [s.outlineStyle, s.outlineWidth, s.outlineColor, s.boxShadow, s.backgroundColor, s.color]; })); await page.close();
          }
          const pass = JSON.stringify(paints[0]) === JSON.stringify(paints[1]) && paints[1][0] === 'solid' && paints[1][1] === '2px';
          results.push({ name: engine + '-forced-' + scene.id, pass, paints }); console.log((pass ? 'PASS ' : 'FAIL ') + engine + '-forced-' + scene.id);
        }
      } finally { await browser.close(); }
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ source, original, results }, null, 2));
  console.log(results.filter(r => r.pass).length + '/' + results.length + ' Standard fallback and forced-colour comparisons pass');
  process.exitCode = results.some(r => !r.pass) ? 1 : 0;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
