/* Candidate self-tests. Independent admission remains a separate review. */
'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const pw = require('playwright');
const { compile } = require('./skin-css');
const root = path.resolve(__dirname, '..');
const skins = ['matte', 'ink', 'alloy', 'alloy-bold', 'glass'];
const engines = process.env.PUDL_BROWSER ? [process.env.PUDL_BROWSER] : ['chromium', 'firefox', 'webkit'];
const min = process.env.PUDL_MIN === '1';
const asset = name => fs.readFileSync(path.join(root, 'dist', min ? 'min' : '', name), 'utf8');
const output = process.env.PUDL_OUTPUT_DIR || path.join(root, 'tests/output/material-skins', min ? 'minified' : 'normal');

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.getAnimations().filter(a => a.effect && Number.isFinite(a.effect.getComputedTiming().endTime)).map(a => a.finished.catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function routeAssets(page, fallback = false) {
  await page.route('http://materials.test/**', route => {
    let file = decodeURIComponent(new URL(route.request().url()).pathname).slice(1);
    if (min && /^dist\/[^/]+\.(css|js)$/.test(file)) file = file.replace('dist/', 'dist/min/');
    if (min && /^samples\/skins-[a-z-]+\.css$/.test(file)) file = 'dist/min/pudl-skin-' + file.match(/skins-(.*)\.css$/)[1] + '.css';
    const resolved = path.resolve(root, file);
    if (!resolved.startsWith(root + path.sep) || !fs.existsSync(resolved)) return route.abort();
    let body = fs.readFileSync(resolved);
    if (file.endsWith('.css')) {
      body = body.toString().replace(/url\((["']?)\.\.\//g, (_, quote) => 'url(' + quote + 'http://materials.test/dist/');
      /* Exercise the opaque feature-query path in a browser that supports blur. */
      if (fallback) body = body.replace(/@supports\s*\(backdrop-filter:\s*blur\(2px\)\)/g, '@supports (pudl-unsupported-filter: blur(2px))');
    }
    return route.fulfill({ body, contentType: ({ '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.json': 'application/json' })[path.extname(file)] || 'text/html' });
  });
}

function appearance(page, selector) {
  return page.locator(selector).evaluateAll(nodes => nodes.filter(node => node.getClientRects().length).map(node => {
    const style = getComputedStyle(node), rect = node.getBoundingClientRect();
    return { box: [rect.x + scrollX, rect.y + scrollY, rect.width, rect.height], padding: style.padding, border: [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth],
      semantics: [node.getAttribute('role'), node.getAttribute('aria-label'), node.getAttribute('aria-selected'), node.getAttribute('aria-pressed'), node.hasAttribute('disabled')],
      font: [style.fontFamily, style.fontSize, style.lineHeight], paint: [style.backgroundImage, style.backgroundColor, style.boxShadow, style.borderRadius, style.color] };
  }));
}

for (const engine of engines) {
  test(engine + ' material skins preserve live content and control geometry in both forms', async () => {
    const browser = await pw[engine].launch();
    try {
      const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, reducedMotion: 'reduce' });
      if (engine === 'chromium') {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
      }
      await routeAssets(page);
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://materials.test/samples/skins.html?skin=standard');
      await page.waitForFunction(() => document.querySelectorAll('.win').length === 2);
      await page.addScriptTag({ content: asset('pudl-skins.js') });
      await page.evaluate(skins => {
        for (const skin of skins) {
          const link = [...document.querySelectorAll('link')].find(node => node.getAttribute('href') === 'skins-' + skin + '.css');
          if (!pudlSkins.register(skin, link)) throw Error('Skin did not register: ' + skin);
        }
        window.keptInput = document.querySelector('main input');
        keptInput.value = 'Retained material edits';
        window.keptWindow = document.querySelector('.win[data-win="editor"]');
      }, skins);
      const fontSession = await page.context().newCDPSession(page); await fontSession.send('DOM.enable'); await fontSession.send('CSS.enable');
      const platformFonts = async () => {const doc=await fontSession.send('DOM.getDocument');const n=await fontSession.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'.win-stack-count'});return fontSession.send('CSS.getPlatformFontsForNode',{nodeId:n.nodeId});};
      const probe = label => page.evaluate(label => ({label, fonts:document.fonts.status, entries:[...document.querySelectorAll('.win-tab,.win-tab *')].map(n=>{const s=getComputedStyle(n),r=n.getBoundingClientRect();return {tag:n.className,text:n.textContent,rect:r.toJSON(),font:s.font,fontWeight:s.fontWeight,fontFamily:s.fontFamily,letterSpacing:s.letterSpacing,fontFeatureSettings:s.fontFeatureSettings,fontVariantNumeric:s.fontVariantNumeric,fontOpticalSizing:s.fontOpticalSizing,transform:s.transform,display:s.display};})}),label).then(async x=>{x.platformFonts=await platformFonts();console.log('GEOMETRY '+JSON.stringify(x));});
      const controls = 'main .btn, main .form-input, main .form-select, main .form-textarea, .win, .win-head, .win-btn, .win-tab';
      for (const theme of ['light', 'dark']) {
        await page.selectOption('#theme', theme);
        await page.evaluate(() => pudlSkins.select('standard')); await settle(page);
        const standard = await appearance(page, controls); await probe('standard '+theme);
        const signatures = new Set();
        for (const skin of skins) {
          await page.locator('main input').first().focus();
          const before = await page.evaluate(() => ({ state: pudlWindows.state(), url: location.href, history: history.length }));
          let requests = 0;
          const requested = () => requests++;
          page.on('request', requested);
          assert.equal(await page.evaluate(skin => pudlSkins.select(skin), skin), true);
          await settle(page); page.off('request', requested);
          const after = await appearance(page, controls); await probe(skin+' '+theme);
          assert.deepEqual(after.map(({ paint, ...geometry }) => geometry), standard.map(({ paint, ...geometry }) => geometry), skin + ' geometry');
          signatures.add(JSON.stringify(after[0].paint));
          assert.equal(requests, 0, 'selection fetches no assets');
          assert.deepEqual(await page.evaluate(() => ({ state: pudlWindows.state(), url: location.href, history: history.length })), before);
          assert.equal(await page.evaluate(() => keptInput === document.querySelector('main input') && keptInput === document.activeElement && keptInput.value === 'Retained material edits' && keptWindow === document.querySelector('.win[data-win="editor"]')), true);
          const button = page.getByRole('button', { name: 'Open', exact: true });
          const rest = await appearance(page, 'main .btn:first-child');
          await button.hover(); await settle(page);
          assert.notDeepEqual((await appearance(page, 'main .btn:first-child'))[0].paint, rest[0].paint, skin + ' hover');
          await page.mouse.down();
          try {
            await settle(page);
            assert.match((await button.evaluate(n => getComputedStyle(n).boxShadow)), /inset/, skin + ' pressed is sunken');
          } finally { await page.mouse.up(); }
          await page.mouse.move(0, 0);
          await page.keyboard.press('Tab'); await button.focus(); await settle(page);
          assert.equal(await button.evaluate(n => n.matches(':focus-visible') && getComputedStyle(n).boxShadow !== 'none'), true);
          await page.getByRole('button', { name: 'Actions', exact: true }).click();
          await page.getByRole('button', { name: 'Rename', exact: true }).waitFor({ state: 'visible' });
          await page.keyboard.press('Escape');
          await page.selectOption('#skin', skin); await settle(page);
          fs.mkdirSync(output, { recursive: true });
          await page.screenshot({ path: path.join(output, engine + '-' + skin + '-' + theme + '.png'), fullPage: true });
        }
        assert.equal(signatures.size, 4, 'the four material families have distinct rendered controls');
      }
      const host = await page.addStyleTag({ content: '[data-theme="light"] { --accent: #123456; } [data-theme="dark"] { --accent: #abcdef; }' });
      for (const theme of ['light', 'dark']) for (const skin of skins) {
        await page.selectOption('#theme', theme);
        await page.evaluate(skin => pudlSkins.select(skin), skin); await settle(page);
        assert.equal(await page.getByRole('button', { name: 'Save', exact: true }).evaluate(n => getComputedStyle(n).backgroundColor), theme === 'light' ? 'rgb(18, 52, 86)' : 'rgb(171, 205, 239)', skin + ' primary paint consumes the later host palette');
      }
      await host.evaluate(n => n.remove());
      for (const skin of skins) for (const theme of ['light', 'dark']) {
        await page.setViewportSize({ width: 360, height: 900 });
        await page.selectOption('#theme', theme); await page.selectOption('#skin', skin);
        await page.evaluate(skin => pudlSkins.select(skin), skin); await settle(page);
        assert.equal(await page.evaluate(() => document.documentElement.dataset.skin), skin, 'runtime and preview selection agree');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true, skin + ' narrow reflow');
        await page.evaluate(() => { document.documentElement.dir = 'rtl'; }); await settle(page);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true, skin + ' RTL reflow');
        await page.screenshot({ path: path.join(output, engine + '-' + skin + '-' + theme + '-narrow-rtl.png'), fullPage: true });
        await page.evaluate(() => { document.documentElement.dir = 'ltr'; });
      }
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  });

  test(engine + ' material skins leave forced colours and print component-owned', async () => {
    const browser = await pw[engine].launch();
    try {
      const page = await browser.newPage();
      await page.setContent('<button class="btn">Open</button><input class="form-input" value="Keep"><div data-skin="glass"><section class="win active"><header class="win-head"><h2 class="win-title">Title</h2></header><div class="win-body">Content</div></section></div>');
      await page.addStyleTag({ content: asset('pudl.css') + asset('pudl-windows.css') });
      await settle(page);
      const unselected = await appearance(page, 'button, input, .win, .win-head, .win-title, .win-body');
      await page.addStyleTag({ content: skins.map(skin => asset('pudl-skin-' + skin + '.css')).join('\n') });
      await settle(page);
      assert.deepEqual(await appearance(page, 'button, input, .win, .win-head, .win-title, .win-body'), unselected, 'a nested skin attribute cannot select a root skin');
      for (const theme of ['light', 'dark']) for (const media of [{ forcedColors: 'active', media: 'screen' }, { forcedColors: 'none', media: 'print' }]) {
        await page.emulateMedia(media);
        await page.evaluate(theme => { document.documentElement.dataset.theme = theme; document.documentElement.dataset.skin = 'standard'; }, theme);
        await settle(page);
        const standard = await appearance(page, 'button, input, .win, .win-head, .win-title, .win-body');
        for (const skin of skins) {
          await page.evaluate(skin => { document.documentElement.dataset.skin = skin; }, skin); await settle(page);
          assert.deepEqual(await appearance(page, 'button, input, .win, .win-head, .win-title, .win-body'), standard, skin + ' ' + JSON.stringify(media));
        }
      }
    } finally { await browser.close(); }
  });

  test(engine + ' Glass protects text over arbitrary backgrounds and falls back to opaque chrome', async () => {
    const browser = await pw[engine].launch();
    try {
      for (const fallback of [false, true]) {
        const page = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 1440, height: 1120 } });
        let cdp;
        if (engine === 'chromium') {
          cdp = await page.context().newCDPSession(page);
          await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
        }
        await routeAssets(page, fallback);
        await page.goto('http://materials.test/samples/skins.html?skin=glass');
        await page.waitForFunction(() => document.querySelectorAll('.win').length === 2);
        const darkBackdrop = new Map();
        for (const theme of ['light', 'dark']) for (const background of ['#000000', '#ffffff', 'repeating-linear-gradient(45deg, #000 0px 8px, #fff 8px 16px)']) {
          await page.selectOption('#theme', theme);
          await page.locator('.win-host').evaluate((n, background) => { n.style.background = background; }, background);
          await settle(page);
          const paints = await page.locator('.win.active').evaluate(win => {
            const head = getComputedStyle(win.querySelector('.win-head'));
            return { skin: document.documentElement.dataset.skin, supported: CSS.supports('backdrop-filter', 'blur(2px)'), reduced: matchMedia('(prefers-reduced-transparency: reduce)').matches, filter: head.backdropFilter, title: getComputedStyle(win.querySelector('.win-title')).backgroundColor, titleFill: head.backgroundImage, glass: getComputedStyle(win, '::before').backdropFilter, glassContent: getComputedStyle(win, '::before').content, enhanced: matchMedia('(prefers-reduced-transparency: no-preference)').matches,
              body: getComputedStyle(win.querySelector('.win-body')).backgroundColor, frame: getComputedStyle(win).backgroundColor, containingBlockFilter: getComputedStyle(win).backdropFilter };
          });
          assert.equal(paints.title, 'rgba(0, 0, 0, 0)', 'title text has no separate backing rectangle');
          assert.match(paints.body, /^rgb\(/, 'body reading surface is opaque');
          if (!fallback && paints.supported && paints.enhanced) {
            assert.equal(paints.glass, 'blur(2px)', 'frame and header share one decorative blur layer');
            assert.equal(paints.glassContent, '""');
            assert.equal(paints.frame, 'rgba(0, 0, 0, 0)', 'window fill does not mask the backdrop');
            if (background === '#000000' || background === '#ffffff') {
              for (const state of ['active', 'inactive']) {
                const window = page.locator(state === 'active' ? '.win.active' : '.win:not(.active)').first();
                const head = await window.locator('.win-head').boundingBox();
                for (const region of ['header', 'frame']) {
                  const clip = region === 'header'
                    ? { x: head.x + head.width - 110, y: head.y + 12, width: 20, height: 12 }
                    : { x: head.x + head.width + 1, y: head.y + 12, width: 2, height: 12 };
                  const raster = await page.screenshot({ clip });
                  const key = theme + state + region;
                  if (background === '#000000') darkBackdrop.set(key, raster);
                  else assert(!raster.equals(darkBackdrop.get(key)), state + ' ' + region + ' transmits the changed backdrop');
                }
              }
            }
          } else assert.match(paints.titleFill, /linear-gradient/, 'fallback title bar is opaque');
          assert.equal(paints.containingBlockFilter, 'none', 'window menus keep their viewport containing block');
          assert.equal(paints.filter, 'none', 'the header does not blur the shared backdrop twice');
          if (fallback) assert.match(paints.frame, /^rgb\(/, 'fallback frame is opaque');
          if (!fallback && background.startsWith('repeating-')) {
            fs.mkdirSync(output, { recursive: true });
            await page.screenshot({ path: path.join(output, engine + '-glass-' + theme + '-checkerboard.png'), fullPage: true });
          }
          await page.locator('.win.active [data-win-action="menu"]').click();
          const panel = page.locator('.win-menu:popover-open');
          await panel.waitFor({ state: 'visible' });
          assert.equal(await panel.evaluate(n => {
            const r = n.getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1;
          }), true, 'window menu remains inside viewport');
          await page.keyboard.press('Escape');
        }
        if (cdp) {
          const before = await appearance(page, '.win, .win-head, .win-title, .win-body');
          await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
          await settle(page);
          assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches), true);
          assert.equal(await page.locator('.win.active .win-head').evaluate(n => getComputedStyle(n).backdropFilter), 'none');
          assert.match(await page.locator('.win.active').evaluate(n => getComputedStyle(n).backgroundColor), /^rgb\(/);
          const after = await appearance(page, '.win, .win-head, .win-title, .win-body');
          assert.deepEqual(after.map(({ paint, ...geometry }) => geometry), before.map(({ paint, ...geometry }) => geometry));
        }
        await page.close();
      }
    } finally { await browser.close(); }
  });
}

test('catalogue admission matches the registry and admitted bytes stay pinned', () => {
  const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'dist/pudl-skins.json')));
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'skins/registry.json')));
  const crypto = require('node:crypto');
  for (const skin of skins) {
    assert.equal(catalogue.skins.find(entry => entry.id === skin).admitted, registry.find(entry => entry.id === skin).admitted);
    const definition = JSON.parse(fs.readFileSync(path.join(root, 'skins', skin + '.json')));
    assert.equal(fs.readFileSync(path.join(root, 'dist/pudl-skin-' + skin + '.css'), 'utf8'), compile(definition));
  }
  for (const entry of registry.filter(entry => entry.admitted)) {
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'dist/pudl-skin-' + entry.id + '.css'))).digest('hex'), entry.sha256);
  }
});
