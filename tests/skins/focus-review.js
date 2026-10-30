/* Independent rendered focus contrast, with original Standard as a control. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { execFileSync } = require('child_process');
const pw = require('playwright'), assert = require('assert/strict');
const source = path.resolve(process.argv[2] || 'tests/output/skins-bevel-corrected-source');
const output = path.resolve(process.argv[3] || 'tests/output/skins-bevel-focus');
const skinIndex = process.argv.indexOf('--skin');
const skinName = skinIndex < 0 ? 'bevel' : process.argv[skinIndex + 1];
assert.ok(['bevel', 'gel', 'glaze'].includes(skinName), 'unknown focus treatment');
const scenarios = [
  { id: 'button-card', wrapper: 'section class="card"', control: '<button class="btn" id="control">Open</button>' },
  { id: 'danger-card', wrapper: 'section class="card"', control: '<button class="btn btn-danger" id="control">Delete</button>' },
  { id: 'invalid-field-card', wrapper: 'section class="card"', control: '<input class="form-input" aria-invalid="true" id="control" value="Invalid value">' },
  { id: 'invalid-listbox-card', wrapper: 'section class="card"', control: '<div class="listbox" role="listbox" aria-label="Invalid choice" aria-invalid="true" tabindex="0" id="control"><div role="option">Choice</div></div>' },
  ...['bg', 'surface-alt', 'input-bg', 'recess-bg'].map(token => ({ id: 'button-' + token, wrapper: 'section style="padding:24px;background:var(--' + token + ')"', control: '<button class="btn" id="control">Open</button>' })),
  { id: 'active-window-close', wrapper: 'section class="win active"', control: '<header class="win-head"><h2 class="win-title">Window</h2><nav class="win-chrome"><button class="win-btn" data-win-action="close" aria-label="Close" id="control"></button></nav></header>' },
  { id: 'topbar-status', wrapper: 'header class="topbar"', control: '<div class="status-area"><button class="status-item" id="control">Ready</button></div>' },
  { id: 'menubar-status', wrapper: 'header class="topbar"', control: '<div data-menubar></div><div class="status-area"><button class="status-item" id="control">Ready</button></div>' },
  // The catalogue requires the window manager, which activates on focus.
  // Keep this CSS-only state as a diagnostic; live-focus-review gates it.
  { id: 'inactive-window-close', diagnosticOnly: true, wrapper: 'section class="win"', control: '<header class="win-head"><h2 class="win-title">Window</h2><nav class="win-chrome"><button class="win-btn" data-win-action="close" aria-label="Close" id="control"></button></nav></header>' }
];
function sceneHTML(scene) {
  return '<!doctype html><html><head><link rel="stylesheet" href="/dist/pudl.css"><link rel="stylesheet" href="/dist/pudl-windows.css"><link rel="stylesheet" href="/samples/skins-' + skinName + '.css"><style>body{padding:32px;margin:0}.card{padding:24px}.win{position:relative;inset:auto;width:500px;height:80px}*{transition:none!important;animation:none!important}</style></head><body><' + scene.wrapper + '>' + scene.control + '</' + scene.wrapper.split(' ')[0] + '></body></html>';
}
async function main() {
  assert.ok(!fs.existsSync(output), 'output must be new'); fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/') {
      const scene = scenarios.find(s => s.id === url.searchParams.get('case')) || scenarios[0];
      response.setHeader('Content-Type', 'text/html');
      response.end(sceneHTML(scene)); return;
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
        for (const theme of ['light', 'dark']) for (const skin of ['standard', skinName]) for (const scene of (process.argv.includes('--extended') && skin === skinName ? scenarios : [scenarios[0]])) {
          const page = await browser.newPage({ viewport: { width: 600, height: 300 } });
          if (skin === 'standard') await page.route('**/dist/pudl.css', route => route.fulfill({ contentType: 'text/css', body: fs.readFileSync('tests/output/skins-source-20261030-1702/dist/pudl.css') }));
          await page.goto(base + '/?case=' + scene.id);
          await page.evaluate(async ({ theme, skin }) => { document.documentElement.dataset.theme = theme; document.documentElement.dataset.skin = skin; await document.fonts.ready; }, { theme, skin });
          const control = page.locator('#control'), box = await control.boundingBox();
          const paint = () => control.evaluate(node => { const s = getComputedStyle(node); return { focused: node.matches(':focus-visible'), outline: s.outline, shadow: s.boxShadow, colors: [s.color, s.backgroundColor, s.backgroundImage, s.borderColor] }; });
          const before = await paint(), name = engine + '-' + theme + '-' + skin + (scene.id === 'button-card' ? '' : '-' + scene.id);
          const beforeFile = path.join(output, name + '-before.png'), afterFile = path.join(output, name + '-after.png');
          await page.screenshot({ path: beforeFile, caret: 'hide' });
          await page.keyboard.press('Tab'); await page.screenshot({ path: afterFile, caret: 'hide' });
          const after = await paint();
          const twoColor = skin === skinName && scene.id === 'active-window-close';
          const args = [path.join(__dirname, 'focus-pixels.py'), beforeFile, afterFile, String(box.x), String(box.y), String(box.x + box.width), String(box.y + box.height)];
          if (twoColor) args.push('--two-color');
          let pixels, rounded = skin === skinName && skinName !== 'bevel';
          if (rounded) {
            const metadata = await control.evaluate((node, { scene, twoColor }) => {
              const s = getComputedStyle(node), r = node.getBoundingClientRect(), canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
              const ctx = canvas.getContext('2d');
              ctx.fillStyle = s.getPropertyValue(scene.startsWith('invalid-') ? '--focus-ring-danger' : scene === 'topbar-status' ? '--tb-focus-ring' : '--focus-ring'); ctx.fillRect(0, 0, 1, 1);
              return { bounds: { x: r.x, y: r.y, width: r.width, height: r.height }, radius: parseFloat(s.borderTopLeftRadius), twoColor, ringColor: [...ctx.getImageData(0, 0, 1, 1).data] };
            }, { scene: scene.id, twoColor });
            const meta = path.join(output, name + '-rounded.json'); fs.writeFileSync(meta, JSON.stringify(metadata, null, 2));
            pixels = JSON.parse(execFileSync('python', [path.join(__dirname, 'rounded-focus-pixels.py'), afterFile, meta], { encoding: 'utf8' }));
          } else pixels = JSON.parse(execFileSync('python', args, { encoding: 'utf8' }));
          const result = { name, scenario: scene.id, admissionGate: skin === skinName && !scene.diagnosticOnly, before, after, pixels, pass: after.focused && (rounded ? pixels.pass : twoColor ? pixels.twoColor.pass : pixels.minimumSideContrast >= 3) };
          results.push(result);
          const metric = rounded ? 'rounded perimeter ' + pixels.passingProfiles + '/' + pixels.perimeterProfiles + ', minimum surface contrast ' + pixels.minimumSurfaceContrast.toFixed(3) : twoColor ? 'two-color edges and area ' + JSON.stringify({ white: pixels.twoColor.whitePainted, black: pixels.twoColor.blackPainted, profiles: pixels.twoColor.passingProfiles }) : 'minimum adjacent ring contrast ' + pixels.minimumSideContrast.toFixed(3);
          console.log((result.pass ? 'PASS ' : result.admissionGate ? 'FAIL ' : 'CONTROL ') + name + ' ' + metric);
          await page.close();
        }
      } finally { await browser.close(); }
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ source, skin: skinName, results }, null, 2));
  process.exitCode = results.some(r => r.admissionGate && !r.pass) ? 1 : 0;
}
module.exports = { scenarios, sceneHTML };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
