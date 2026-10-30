/* Check effective browser palettes against categorical contrast/separation rules. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), crypto = require('crypto');
const assert = require('assert/strict'), pw = require('playwright');
const source = path.resolve(process.argv[2]), output = path.resolve(process.argv[3]);
const linear = c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
const lab = rgb => {
  const [r, g, b] = rgb.map(linear), l = Math.cbrt(.4122214708*r + .5363325363*g + .0514459929*b), m = Math.cbrt(.2119034982*r + .6806995451*g + .1073969566*b), s = Math.cbrt(.0883024619*r + .2817188376*g + .6299787005*b);
  return [.2104542553*l + .793617785*m - .0040720468*s, 1.9779984951*l - 2.428592205*m + .4505937099*s, .0259040371*l + .7827717662*m - .808675766*s];
};
const distance = (a, b) => { const x = lab(a), y = lab(b); return 100 * Math.hypot(...x.map((v, i) => v - y[i])); };
const hue = rgb => { const [, a, b] = lab(rgb); return (Math.atan2(b, a) * 180 / Math.PI + 360) % 360; };
const hueGap = (a, b) => { const d = Math.abs(hue(a) - hue(b)); return Math.min(d, 360 - d); };
const cvd = [
  [[.152286, 1.052583, -.204868], [.114503, .786281, .099216], [-.003882, -.048116, 1.051998]],
  [[.367322, .860646, -.227968], [.280085, .672501, .047413], [-.011820, .042940, .968881]]
];
const encoded = v => v <= .0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - .055;
const simulate = (rgb, matrix) => { const values = rgb.map(linear); return matrix.map(row => encoded(Math.min(1, Math.max(0, row.reduce((sum, v, i) => sum + v * values[i], 0))))); };
const lum = rgb => rgb.map(linear).reduce((v, c, i) => v + c * [.2126, .7152, .0722][i], 0);
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const canonical = {};
for (const theme of ['light', 'dark']) {
  const tokens = JSON.parse(fs.readFileSync('vendor/pudl-spec/tokens/palette.' + theme + '.tokens.json'));
  canonical[theme] = Object.fromEntries(Object.values(tokens).filter(v => v && typeof v === 'object').flatMap(g => Object.entries(g).filter(([, v]) => v && v.$value && v.$value.hex).map(([k, v]) => [k, [1, 3, 5].map(i => parseInt(v.$value.hex.slice(i, i + 2), 16) / 255)])));
}
async function main() {
  assert.ok(!fs.existsSync(output), 'output must be new'); fs.mkdirSync(output, { recursive: true });
  const skins = ['standard', 'bevel', 'gel', 'glaze'].filter(s => s === 'standard' || fs.existsSync(path.join(source, 'samples/skins-' + s + '.css')));
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/') { response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><html><head><link rel="stylesheet" href="/dist/pudl.css">' + skins.filter(s => s !== 'standard').map(s => '<link rel="stylesheet" href="/samples/skins-' + s + '.css">').join('') + '</head><body><span id="probe">Palette probe</span></body></html>'); return; }
    const file = path.resolve(source, '.' + url.pathname);
    if (!file.startsWith(source + path.sep) || !fs.existsSync(file)) { response.statusCode = 404; response.end(); return; }
    response.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : 'font/woff2'); response.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const results = [], observations = [];
  const check = (name, pass, detail) => results.push({ name, pass, detail });
  try {
    for (const engine of ['chromium', 'firefox', 'webkit']) {
      const browser = await pw[engine].launch();
      try {
        const page = await browser.newPage(); await page.goto('http://127.0.0.1:' + server.address().port);
        for (const theme of ['light', 'dark']) for (const skin of skins) {
          const colors = await page.evaluate(({ theme, skin }) => {
            document.documentElement.dataset.theme = theme; document.documentElement.dataset.skin = skin;
            const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1; const ctx = canvas.getContext('2d'), probe = document.getElementById('probe');
            return Object.fromEntries(['accent', 'danger', 'warn', 'positive', 'bg', 'surface', 'input-bg', ...Array.from({ length: 8 }, (_, i) => 'category-' + (i + 1))].map(token => {
              probe.style.color = 'var(--' + token + ')'; ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = getComputedStyle(probe).color; ctx.fillRect(0, 0, 1, 1); return [token, [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map(v => v / 255)];
            }));
          }, { theme, skin });
          observations.push({ engine, theme, skin, colors });
          const label = engine + '-' + theme + '-' + skin;
          for (let i = 1; i <= 8; i++) {
            const slot = colors['category-' + i];
            check(label + ' category ' + i + ' preserves canonical assignment', JSON.stringify(slot) === JSON.stringify(canonical[theme]['category-' + i]), slot);
            for (const base of ['bg', 'surface', 'input-bg']) { const ratio = contrast(slot, colors[base]); check(label + ' category ' + i + ' contrast on ' + base, ratio >= 3, ratio); }
            const gap = distance(slot, colors.accent); check(label + ' category ' + i + ' stays at least 8 OKLab units from accent', gap >= 8, gap);
            for (const status of ['warn', 'danger', 'positive']) {
              const separation = distance(slot, colors[status]), angle = hueGap(slot, colors[status]);
              check(label + ' category ' + i + ' separates from ' + status, separation >= 12 && angle >= 20, { separation, angle });
            }
            if (i < 8) {
              const next = colors['category-' + (i + 1)], normal = distance(slot, next);
              const simulated = Math.min(...cvd.map(matrix => distance(simulate(slot, matrix), simulate(next, matrix))));
              check(label + ' category ' + i + ' separates from next category', normal >= 15 && simulated >= 8, { normal, simulated });
            }
          }
        }
        await page.close();
      } finally { await browser.close(); }
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
  const inputs = Object.fromEntries(['dist/pudl.css', ...skins.filter(s => s !== 'standard').map(s => 'samples/skins-' + s + '.css')].map(f => [f, crypto.createHash('sha256').update(fs.readFileSync(path.join(source, f))).digest('hex')]));
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ source, inputs, observations, results }, null, 2));
  console.log(results.filter(r => r.pass).length + '/' + results.length + ' palette checks pass');
  for (const r of results.filter(r => !r.pass)) console.log('FAIL ' + JSON.stringify(r));
  process.exitCode = results.some(r => !r.pass) ? 1 : 0;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
