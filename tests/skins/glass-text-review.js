/* Render text, a text-hidden halo backing, and a neutral solid glyph mask. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const pw = require('playwright');
const [source, destination, engine = 'chromium', palette = 'standard', form = 'normal'] = process.argv.slice(2);
if (!source || !destination || !['chromium', 'firefox', 'webkit'].includes(engine) || !['standard', 'bevel', 'gel', 'glaze'].includes(palette) || !['normal', 'min'].includes(form)) throw Error('Usage: node glass-text-review.js <source> <new-output> [engine] [palette] [normal|min]');
const root = path.resolve(source), output = path.resolve(destination);
if (fs.existsSync(output)) throw Error('Output must be a new directory');
fs.mkdirSync(output, { recursive: true });
const prefix = '/dist/' + (form === 'min' ? 'min/' : '');
const links = ['pudl.css', 'pudl-windows.css', 'pudl-skin-glass.css'].concat(palette === 'standard' ? [] : ['pudl-theme-' + palette + '.css']);
const inputs = Object.fromEntries(links.map(file => {
  const relative = prefix.slice(1) + file;
  return [relative, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex')];
}));
const html = `<!doctype html><html data-skin="glass" data-palette="${palette}"><head><meta charset="utf-8">${links.map(file => '<link rel="stylesheet" href="' + prefix + file + '">').join('')}<style>body{margin:0}.win-host{height:500px}.win{left:60px;top:70px;width:1000px;height:250px;z-index:1}*{transition:none!important;animation:none!important}</style></head><body><div class="win-host"><div class="win-layer"><section class="win active"><header class="win-head"><h2 class="win-title">Glass contrast title</h2><span class="win-title-detail">Window detail text</span><div class="win-statuses"><span class="win-status">Host status text</span></div><nav class="win-chrome"><button class="win-btn" data-win-action="close" aria-label="Close"></button></nav></header><div class="win-body">Opaque body</div></section></div></div></body></html>`;
const server = http.createServer((req, res) => {
  if (req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(html); }
  const relative = new URL(req.url, 'http://localhost').pathname.slice(1);
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (error, bytes) => {
    const type = file.endsWith('.css') ? 'text/css; charset=utf-8' : file.endsWith('.woff2') ? 'font/woff2' : 'text/plain';
    res.writeHead(error ? 404 : 200, { 'Content-Type': type }); res.end(error ? '' : bytes);
  });
});
const neutralCSS = 'html,body,body *{background:white!important;color:white!important;border-color:white!important;box-shadow:none!important;text-shadow:none!important;filter:none!important;backdrop-filter:none!important;opacity:1!important}body *::before,body *::after{background:white!important;filter:none!important;backdrop-filter:none!important;color:white!important;text-shadow:none!important}';
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const results = [];
  try {
    browser = await pw[engine].launch();
    const page = await browser.newPage({ viewport: { width: 1200, height: 600 } });
    if (engine === 'chromium') {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
    }
    await page.goto('http://127.0.0.1:' + server.address().port + '/');
    await page.evaluate(() => document.fonts.ready);
    const mode = await page.evaluate(() => ({ enabled: matchMedia('(prefers-reduced-transparency: no-preference)').matches, blur: getComputedStyle(document.querySelector('.win'), '::before').backdropFilter }));
    if (!mode.enabled || mode.blur !== 'blur(2px)') throw Error('Translucent path is not active; this run cannot certify it');
    for (const theme of ['light', 'dark']) for (const [backdrop, background] of Object.entries({ black: '#000', white: '#fff', pattern: 'repeating-linear-gradient(90deg,#000 0px 80px,#fff 80px 160px)' })) for (const active of [true, false]) {
      await page.evaluate(({ theme, background, active }) => {
        document.documentElement.dataset.theme = theme;
        document.querySelector('.win-host').style.background = background;
        document.querySelector('.win').classList.toggle('active', active);
      }, { theme, background, active });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      for (const [part, selector] of Object.entries({ title: '.win-title', detail: '.win-title-detail', status: '.win-status' })) {
        const name = theme + '-' + backdrop + '-' + (active ? 'active' : 'inactive') + '-' + part;
        const node = page.locator(selector);
        const metadata = await node.evaluate(node => {
          const range = document.createRange(); range.selectNodeContents(node);
          return { textRects: [...range.getClientRects()].map(r => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom })), originalStyle: node.getAttribute('style') };
        });
        const normal = path.join(output, name + '.png'), backing = path.join(output, name + '-background.png'), mask = path.join(output, name + '-mask.png'), meta = path.join(output, name + '.json');
        const restore = () => node.evaluate((node, style) => { if (style === null) node.removeAttribute('style'); else node.setAttribute('style', style); }, metadata.originalStyle);
        await page.screenshot({ path: normal });
        await node.evaluate(node => node.style.setProperty('color', 'transparent', 'important'));
        await page.screenshot({ path: backing }); await restore();
        const neutral = await page.addStyleTag({ content: neutralCSS });
        await node.evaluate(node => node.style.setProperty('color', 'black', 'important'));
        await page.screenshot({ path: mask }); await restore(); await neutral.evaluate(node => node.remove());
        fs.writeFileSync(meta, JSON.stringify(metadata, null, 2) + '\n');
        const pixels = JSON.parse(execFileSync('python', [path.join(__dirname, 'glass-text-pixels.py'), normal, backing, mask, meta], { encoding: 'utf8' }));
        results.push({ name, ...pixels });
        console.log((pixels.pass ? 'PASS ' : 'FAIL ') + name + ' core=' + pixels.minimumContrast.toFixed(3) + ' edge=' + pixels.minimumEdgeContrast.toFixed(3));
      }
    }
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ engine, version: browser.version(), palette, form, mode, inputs, results }, null, 2) + '\n');
    if (results.some(result => !result.pass)) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
