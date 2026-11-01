'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const pw = require('playwright');
const { ids, palette, contrast } = require('./palette-themes');
const { validate } = require('./skin-definition');
const root = path.resolve(__dirname, '..');
const { execFileSync } = require('node:child_process');
const output = path.join(root, 'tests/output/palette-refinements');
test('companion palettes remain valid complete opaque palette definitions', () => {
  for (const id of ids) validate({ version: 1, id, name: id, treatment: 'standard', radii: { radius: 0, 'radius-sm': 0, 'radius-xs': 0, 'radius-pill': 0 }, palette: { light: palette(id, 'light'), dark: palette(id, 'dark') } });
});
for (const engine of (process.env.PUDL_BROWSER ? [process.env.PUDL_BROWSER] : ['chromium', 'firefox', 'webkit'])) test(engine + ' companion palettes, focus and Glass title chrome', async () => {
  const browser = await pw[engine].launch();
  try {
    const p = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    let requests = 0; p.on('request', () => requests++);
    let original = true;
    await p.route('http://palette.test/**', async route => {
      let name = new URL(route.request().url()).pathname.slice(1);
      if (original && ['dist/pudl.css', 'dist/pudl-windows.css'].includes(name)) return route.fulfill({ contentType: 'text/css', body: execFileSync('git', ['show', 'cab552a:' + name], { cwd: root }) });
      if (process.env.PUDL_MIN === '1' && name.startsWith('dist/') && /\.(css|js)$/.test(name)) name = name.replace('dist/', 'dist/min/');
      if (process.env.PUDL_MIN === '1' && /^samples\/skins-[a-z]+\.css$/.test(name)) name = 'dist/min/pudl-skin-' + name.match(/skins-(.*)\.css$/)[1] + '.css';
      const file = path.join(root, name);
      if (!fs.existsSync(file)) return route.fulfill({ status: 404 });
      const ext = path.extname(file);
      let body = fs.readFileSync(file);
      /* Snapshot comparisons observe settled paint, including after reloads
         and media changes, rather than sampling a transition in progress. */
      if (ext === '.html') body = body.toString().replace('</head>', '<style>* { transition: none !important; animation: none !important; }</style></head>');
      /* Minified CSS is fulfilled at the readable URL. Resolve its parent
         addresses as they would resolve from the real dist/min/ location. */
      if (ext === '.css' && name.startsWith('dist/min/')) body = body.toString().replace(/url\((["']?)\.\.\//g, (all, quote) => 'url(' + quote + 'http://palette.test/dist/');
      await route.fulfill({ body, contentType: { '.css': 'text/css', '.js': 'text/javascript', '.html': 'text/html', '.woff2': 'font/woff2' }[ext] || 'application/octet-stream' });
    });
    const standardURL = 'http://palette.test/samples/skins.html?skin=standard&palette=standard';
    const stable = async () => { await p.addStyleTag({ content: '* { transition: none !important; animation: none !important; }' }); await p.mouse.move(0, 0); await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); };
    const snapshot = () => p.locator('.btn, .form-input, .form-textarea, .win-head, .win-body, .win-tab').evaluateAll(nodes => nodes.map(n => { const s = getComputedStyle(n), r = n.getBoundingClientRect(); return { bounds: [r.x, r.y, r.width, r.height], paint: [s.backgroundColor, s.backgroundImage, s.boxShadow, s.borderColor, s.color, s.outline] }; }));
    for (const form of ['light', 'dark']) {
      original = true; await p.goto(standardURL + '&theme=' + form); await p.waitForSelector('[data-win="editor"] textarea'); await p.evaluate(() => document.fonts.ready);
      await stable();
      await p.keyboard.press('Tab'); await p.getByRole('textbox', { name: 'Name', exact: true }).focus();
      const baseline = await snapshot();
      original = false; await p.goto(standardURL + '&theme=' + form); await p.waitForSelector('[data-win="editor"] textarea'); await p.evaluate(() => document.fonts.ready);
      await stable();
      await p.keyboard.press('Tab'); await p.getByRole('textbox', { name: 'Name', exact: true }).focus();
      assert.deepEqual(await snapshot(), baseline, 'Standard retains focused paint and geometry in ' + form);
    }
    await p.goto('http://palette.test/samples/skins.html?skin=bevel&palette=bevel');
    await p.waitForSelector('[data-win="editor"] textarea');
    await p.evaluate(() => document.fonts.ready);
    await stable();
    const settle = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const body = await p.locator('[data-win="editor"] .win-body').elementHandle();
    await p.locator('[data-win="editor"] textarea').fill('Kept edit');
    const baselineRequests = requests;
    for (const id of ids) for (const form of ['light', 'dark']) {
      await p.selectOption('#palette', id); await p.selectOption('#theme', form);
      const syntaxKeys = Object.keys(palette(id, form)).filter(key => key.startsWith('syntax-'));
      for (const skin of ['standard', 'bevel', 'gel', 'glaze', 'matte', 'ink', 'alloy', 'glass']) {
        await p.selectOption('#skin', skin); await settle();
        const colours = await p.evaluate(syntaxKeys => {
          const probe = document.createElement('span'); document.body.appendChild(probe);
          const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
          const ctx = canvas.getContext('2d');
          const keys = ['bg', 'surface', 'surface-alt', 'input-bg', 'recess-bg', 'text', 'text-muted', 'accent', 'accent-hover', 'on-accent', 'tb-bg', 'tb-fg', 'focus-ring', 'warn', 'danger', 'positive', ...Array.from({ length: 8 }, (_, i) => 'category-' + (i + 1)), ...syntaxKeys];
          const values = {};
          for (const key of keys) {
            probe.style.color = 'var(--' + key + ')'; ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = getComputedStyle(probe).color; ctx.fillRect(0, 0, 1, 1);
            values[key] = '#' + [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('');
          }
          probe.remove(); return values;
        }, syntaxKeys);
        const label = id + ' ' + form + ' ' + skin;
        for (const surface of ['bg', 'surface', 'surface-alt', 'input-bg', 'recess-bg']) {
          for (const fg of ['text', 'text-muted', 'accent', ...syntaxKeys]) assert(contrast(colours[fg], colours[surface]) >= 4.5, label + ' ' + fg + '/' + surface + ' ' + contrast(colours[fg], colours[surface]));
          if (skin !== 'standard') assert(contrast(colours['focus-ring'], colours[surface]) >= 3, label + ' focus/' + surface + ' ' + contrast(colours['focus-ring'], colours[surface]));
          for (const status of ['warn', 'danger', 'positive']) assert(contrast(colours[status], colours[surface]) >= 3, label + ' ' + status + '/' + surface);
          if (['bg', 'surface', 'input-bg'].includes(surface)) for (let i = 1; i <= 8; i++) assert(contrast(colours['category-' + i], colours[surface]) >= 3, label + ' category ' + i + '/' + surface);
        }
        assert(contrast(colours['on-accent'], colours.accent) >= 4.5, label + ' primary');
        assert(contrast(colours['on-accent'], colours['accent-hover']) >= 4.5, label + ' primary hover');
        assert(contrast(colours['tb-fg'], colours['tb-bg']) >= 4.5, label + ' topbar');
        assert.equal(await body.evaluate(n => n === document.querySelector('[data-win="editor"] .win-body')), true);
        assert.equal(await p.locator('[data-win="editor"] textarea').inputValue(), 'Kept edit');
      }
      await p.selectOption('#skin', id); await settle();
      await p.keyboard.press('Tab'); await p.getByRole('textbox', { name: 'Name', exact: true }).focus();
      fs.mkdirSync(output, { recursive: true });
      await p.screenshot({ path: path.join(output, engine + '-' + id + '-' + form + '-' + (process.env.PUDL_MIN === '1' ? 'min' : 'normal') + '.png'), fullPage: true });
    }
    assert.equal(requests, baselineRequests, 'switching palette, form and skin needs no request');
    await p.reload(); await p.waitForSelector('[data-win="editor"] textarea');
    assert.equal(await p.locator('#palette').inputValue(), 'glaze', 'URL restores the palette');
    await p.selectOption('#palette', 'standard'); await p.selectOption('#skin', 'glass');
    for (const form of ['light', 'dark']) {
      await p.selectOption('#theme', form); await settle();
      assert.equal(await p.locator('.win-title').first().evaluate(n => getComputedStyle(n).backgroundColor), 'rgba(0, 0, 0, 0)');
      await p.locator('[data-win="editor"] .win-head').click();
      await p.screenshot({ path: path.join(output, engine + '-glass-title-' + form + '.png'), fullPage: true });
    }
    await p.selectOption('#skin', 'standard');
    for (const media of [{ forcedColors: 'active', media: 'screen' }, { forcedColors: 'none', media: 'print' }]) {
      await p.emulateMedia(media); await p.evaluate(() => document.documentElement.dataset.palette = 'standard'); await settle();
      const baseline = await snapshot();
      /* Print hides the preview controls; palette selection itself is the
         documented root attribute and remains available to the host. */
      for (const id of ids) { await p.evaluate(id => document.documentElement.dataset.palette = id, id); await settle(); assert.deepEqual(await snapshot(), baseline, id + ' leaves ' + JSON.stringify(media) + ' component-owned'); }
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
