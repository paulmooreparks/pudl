/* Capture immutable pre-sweep observations. This script never updates an
   existing capture directory and never writes shipped assets. */
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const cp = require('child_process');
const os = require('os');
const assert = require('assert/strict');
const pw = require('playwright');

const repo = path.resolve(__dirname, '../..');
const arg = name => { const i = process.argv.indexOf(name); return i < 0 ? null : process.argv[i + 1]; };
const source = path.resolve(arg('--source') || repo);
const destination = arg('--out');
const engines = (arg('--engines') || 'chromium,firefox,webkit').split(',');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const hashes = root => Object.fromEntries(['dist', 'samples', 'tests/fixtures'].flatMap(dir => walk(path.join(root, dir))).concat(['reference.html', 'package-lock.json', 'source-state.json', 'tests/skins/structure.html'].map(file => path.join(root, file)).filter(file => fs.existsSync(file))).sort().map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))]));
const props = ['display', 'position', 'boxSizing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'gap', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius', 'backgroundColor', 'backgroundImage', 'boxShadow', 'outlineStyle', 'outlineWidth', 'outlineOffset', 'outlineColor', 'color', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'overflowX', 'overflowY', 'opacity', 'content', 'maskImage'];

async function observe(page, selector) {
  return page.evaluate(({ selector, props }) => Array.from(document.querySelectorAll(selector), node => {
    const rect = node.getBoundingClientRect();
    const styles = pseudo => { const cs = getComputedStyle(node, pseudo); return Object.fromEntries(props.map(key => [key, cs[key]])); };
    const round = value => Math.round(value * 1000) / 1000;
    return {
      tag: node.tagName, role: node.getAttribute('role'), label: node.getAttribute('aria-label'),
      state: Object.fromEntries(Array.from(node.attributes).filter(a => /^(aria-|disabled|required|readonly|checked)/.test(a.name)).map(a => [a.name, a.value])),
      focused: node === document.activeElement, focusVisible: node.matches(':focus-visible'),
      rect: { x: rect.width || rect.height ? round(rect.x + scrollX) : 0, y: rect.width || rect.height ? round(rect.y + scrollY) : 0, width: round(rect.width), height: round(rect.height) },
      client: [node.clientWidth, node.clientHeight], scroll: [node.scrollWidth, node.scrollHeight],
      style: styles(null), before: styles('::before'), after: styles('::after')
    };
  }), { selector, props });
}

async function settleStyle(page, selector) {
  await page.locator(selector).evaluate(async node => {
    const finite = node.getAnimations({ subtree: true }).filter(animation => animation.effect && Number.isFinite(animation.effect.getComputedTiming().endTime));
    await Promise.all(finite.map(animation => animation.finished.catch(() => {})));
  });
}

async function settleLayout(page) {
  await page.evaluate(async () => {
    let previous = '', same = 0;
    for (let frame = 0; frame < 120; frame++) {
      await new Promise(resolve => requestAnimationFrame(resolve));
      const current = JSON.stringify(Array.from(document.querySelectorAll('body *'), node => {
        const r = node.getBoundingClientRect();
        return [node.tagName, node.className, node.getAttribute('aria-expanded'), r.x, r.y, r.width, r.height];
      }));
      same = current === previous ? same + 1 : 0; previous = current;
      if (same >= 3) return;
    }
    throw new Error('Live layout did not become stable across consecutive frames');
  });
}

function catalogueHTML(catalogue, inventory) {
  const families = inventory.split('\n').filter(line => line.startsWith('| ') && line.includes('`')).map(line => {
    const cells = line.split('|'); return { name: cells[1].trim(), ids: Array.from(cells[2].matchAll(/`([^`]+)`/g), m => m[1]) };
  });
  const html = families.map((family, index) => {
    const components = catalogue.components.filter(c => family.ids.includes(c.id));
    return '<section class="skin-family" id="family-' + index + '"><h1>' + family.name + '</h1>' + components.map(c => {
      const cases = [{ name: 'rest' }].concat((c.variants || []).map((v, i) => ({ name: 'variant-' + i, variant: v })), (c.states || []).map((s, i) => ({ name: 'state-' + i, state: s })));
      return cases.map(test => '<article class="skin-case" id="case-' + c.id + '-' + test.name + '" data-component="' + c.id + '" data-case="' + test.name + '"><h2>' + c.id + ' / ' + test.name + '</h2><div class="skin-body">' + c.template + '</div></article>').join('');
    }).join('') + '</section>';
  }).join('');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="/dist/pudl.css"><link rel="stylesheet" href="/dist/pudl-windows.css"><style>body{margin:0;padding:16px}.skin-family{margin-bottom:24px;padding:12px;background:var(--bg)}.skin-family>h1{font:700 16px Inter;margin:0 0 16px}.skin-case{padding:12px;margin-bottom:12px;border:1px solid var(--border);background:var(--surface)}.skin-case>h2{font:400 12px Inter;margin:0 0 8px}.skin-body{position:relative;min-height:40px}.skin-body>dialog[open]{position:relative;inset:auto;margin:0}.skin-body>.popover{position:relative;inset:auto;margin:0}</style></head><body>' + html + '</body></html>';
}

async function settleFonts(page, requests) {
  await page.evaluate(async () => {
    for (const spec of ['400 15px Inter', '700 15px Inter', 'italic 400 15px Inter']) await document.fonts.load(spec, 'Baseline 0123');
    await document.fonts.ready;
    if (!document.fonts.check('400 15px Inter', 'Baseline 0123')) throw new Error('Inter did not load');
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  assert.ok(requests.some(url => /Inter-latin\.woff2/.test(url)), 'bundled Latin font response must be observed');
}

async function catalogueCapture(browser, rootURL, settings, output, catalogue, results) {
  const context = await browser.newContext({ viewport: { width: settings.width, height: 900 }, deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'UTC', reducedMotion: 'reduce', colorScheme: settings.theme, forcedColors: settings.forcedColors });
  const page = await context.newPage();
  const fontResponses = [], errors = [];
  page.on('response', response => { if (/\.woff2/.test(response.url()) && response.ok()) fontResponses.push(response.url().split('/').pop()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(rootURL + '/__skins_catalogue');
  await page.evaluate(({ settings, catalogue }) => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dir = settings.direction;
    if (settings.standard) document.documentElement.dataset.skin = 'standard';
    for (const component of catalogue.components) {
      for (const host of document.querySelectorAll('[data-component="' + component.id + '"]')) {
        const body = host.querySelector('.skin-body');
        // Each template instance has local ID references even when duplicated.
        for (const element of body.querySelectorAll('[id]')) {
          const old = element.id, fresh = host.id + '-' + old;
          for (const reference of body.querySelectorAll('[for], [aria-labelledby], [aria-describedby], [popovertarget]')) {
            for (const attr of ['for', 'aria-labelledby', 'aria-describedby', 'popovertarget']) if (reference.hasAttribute(attr)) reference.setAttribute(attr, reference.getAttribute(attr).split(' ').map(id => id === old ? fresh : id).join(' '));
          }
          element.id = fresh;
        }
        const name = host.dataset.case;
        const variant = name.startsWith('variant-') && component.variants[Number(name.slice(8))];
        const state = name.startsWith('state-') && component.states[Number(name.slice(6))];
        if (variant) {
          const targets = variant.on ? Array.from(body.querySelectorAll(variant.on)) : [body.firstElementChild];
          if (!targets.length) throw new Error(component.id + ': missing declared variant target ' + variant.on);
          targets.forEach(target => target.classList.add(variant.class));
        }
        if (state) {
          const target = state.on ? body.querySelector(state.on) : body.firstElementChild;
          if (!target) throw new Error(component.id + ': missing declared state target ' + state.on);
          if (state.attribute) target.setAttribute(state.attribute, state.value || '');
          if (state.class) target.classList.add(state.class);
        }
        for (const dialog of body.querySelectorAll('dialog')) dialog.setAttribute('open', '');
      }
    }
  }, { settings, catalogue });
  await settleFonts(page, fontResponses);
  const data = { settings, fontResponses: [...new Set(fontResponses)].sort(), cases: {}, interactions: {}, errors };
  for (const component of catalogue.components) {
    for (const host of await page.locator('[data-component="' + component.id + '"]').all()) {
      const id = await host.getAttribute('id');
      const parts = [];
      for (const part of component.parts || []) {
        const selector = '#' + id + ' .skin-body ' + part.selector;
        const observed = await observe(page, selector);
        assert.ok(observed.length, component.id + ': missing ' + part.selector);
        parts.push({ selector: part.selector, pseudo: part.pseudo || null, surface: part.surface, observed });
      }
      data.cases[id] = parts;
    }
  }
  fs.mkdirSync(output, { recursive: true });
  for (const family of await page.locator('.skin-family').all()) {
    if (!(await family.locator('.skin-case').count())) continue;
    await family.screenshot({ path: path.join(output, (await family.getAttribute('id')) + '.png'), animations: 'disabled', caret: 'hide' });
  }
  for (const id of ['button', 'icon-button', 'text-field', 'select', 'switch', 'segmented', 'section-tabs']) {
    const selector = '#case-' + id + '-rest .skin-body';
    const control = page.locator(selector).locator('button, input, select, textarea, a[href], [tabindex]').first();
    if (!await control.count() || !await control.isVisible()) { data.interactions[id] = { skipped: 'template control is not rendered' }; continue; }
    await control.hover();
    await settleStyle(page, selector);
    data.interactions[id] = { hover: await observe(page, selector + ' *') };
    await page.mouse.move(0, 0);
    await page.keyboard.press('Tab'); await control.focus();
    await settleStyle(page, selector);
    data.interactions[id].focus = await observe(page, selector + ' *');
    await page.locator(selector).screenshot({ path: path.join(output, 'focus-' + id + '.png'), animations: 'disabled', caret: 'hide' });
    if (await control.evaluate(node => node.tagName === 'BUTTON')) {
      const rect = await control.boundingBox();
      await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2); await page.mouse.down();
      await settleStyle(page, selector);
      data.interactions[id].pressed = await observe(page, selector + ' *');
      await page.mouse.move(0, 0); await page.mouse.up();
    }
  }
  fs.writeFileSync(path.join(output, 'observations.json'), JSON.stringify(data, null, 2) + '\n');
  results.push({ name: path.basename(output), cases: Object.keys(data.cases).length, errors });
  await context.close();
}

async function structuralCapture(browser, rootURL, settings, output, results) {
  const context = await browser.newContext({ viewport: { width: settings.width, height: 900 }, deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'UTC', reducedMotion: 'reduce', colorScheme: settings.theme, forcedColors: settings.forcedColors });
  fs.mkdirSync(output, { recursive: true });
  const observations = {}, errors = [], fontResponses = [];
  const page = await context.newPage();
  page.on('response', response => { if (/\.woff2/.test(response.url()) && response.ok()) fontResponses.push(response.url().split('/').pop()); });
  page.on('pageerror', error => errors.push(error.message));
  async function load(url, ready) {
    await page.goto(rootURL + url);
    if (ready) await page.waitForFunction(ready);
    await page.evaluate(settings => {
      document.documentElement.dataset.theme = settings.theme;
      document.documentElement.dir = settings.direction;
      if (settings.standard) document.documentElement.dataset.skin = 'standard';
      else document.documentElement.removeAttribute('data-skin');
    }, settings);
    await settleFonts(page, fontResponses);
    await page.mouse.move(0, 0);
  }
  async function record(name, selector) {
    await settleStyle(page, 'body');
    await settleLayout(page);
    await settleStyle(page, 'body');
    const data = await observe(page, selector);
    assert.ok(data.length, 'missing live structure: ' + name);
    observations[name] = data;
    await page.screenshot({ path: path.join(output, name + '.png'), animations: 'disabled', caret: 'hide' });
  }
  try {
    await load('/samples/native-window.html', () => !!window.nativeDemo);
    await page.evaluate(() => nativeDemo.update({ fullscreen: true }));
    await record('native-topbar', '.topbar, .topbar .menubar-title, .native-window-controls, [data-native-action]');
    await load('/tests/fixtures/desktop-menubar.html', () => !!document.querySelector('.menubar-title'));
    await record('menu-bar', '.topbar, [data-menubar], .menubar-title');
    await page.locator('.menubar-title:visible, .menubar-toggle:visible').first().click();
    await page.locator('.menu-panel:popover-open').first().waitFor();
    await record('menu-bar-open', '.menu-panel:popover-open, .menu-panel:popover-open .menu-action');
    await load('/tests/fixtures/window-status.html', () => !!window.pudlWindows && pudlWindows.state().open.includes('status'));
    await record('window-status', '.win, .win-head, .win-body, .win-status, .win-btn');
    await load('/tests/fixtures/taskbar-stacks.html', () => !!window.pudlWindows && pudlWindows.state().open.includes('child'));
    await record('windows-taskbar', '.win, .win-head, .win-body, .win-btn, .win-bar, .win-tab, .win-item-glyph, .win-item-attention, .win-item-running');
    const trigger = page.locator('#all [data-win-stack="alpha"]');
    await trigger.focus(); await page.keyboard.press('Enter');
    await page.locator('.win-stack-panel:popover-open').waitFor();
    await record('stack-popup', '.win-stack-panel, .win-stack-row, .win-stack-link, .win-stack-close, .win-stack-section');
    await page.locator('.win-stack-link').first().click({ button: 'right' });
    await page.locator('.context-menu:popover-open').first().waitFor();
    await record('stack-context', '.context-menu:popover-open, .context-menu:popover-open .menu-action');
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
    await page.evaluate(() => pudlWindows.arrangeTaskbar(document.querySelector('#all')));
    await page.locator('.win-taskbar-arrangement:popover-open').waitFor();
    await record('taskbar-arrange', '.win-taskbar-arrangement, .win-taskbar-arrangement select, .win-taskbar-arrangement button');
    await page.keyboard.press('Escape');
    await page.evaluate(() => pudlWindows.dock('a1', 'left'));
    await record('window-docked', '.win, .win-head, .win-body, .win-btn, .win-dock-entry');
    await page.evaluate(() => pudlWindows.minimize('a1'));
    await record('window-docked-minimized', '.win, .win-head, .win-body, .win-btn, .win-dock-entry');
    await page.evaluate(() => { pudlWindows.raise('a1'); pudlWindows.dock('a1', null); pudlWindows.snap('a1', 'left'); });
    await record('window-snapped', '.win, .win-head, .win-body, .win-btn');
    await page.locator('[data-win="a1"] .win-head').dispatchEvent('dblclick');
    await record('window-maximized', '.win, .win-head, .win-body, .win-btn');
    await load('/tests/skins/structure.html', () => !!window.pudlToast);
    await page.evaluate(() => pudlToast('A persistent capture notification.', { action: { label: 'Apply action', run() {} } }));
    await record('content-structures', '[data-region], [data-applet], [data-applet] .btn, .toast-region, .toast, .toast-action, .toast-close, .diff, .diff-line, .diff-sign, .visually-hidden');
    await page.locator('#tooltip-probe').focus();
    await page.locator('[role="tooltip"]').waitFor();
    await record('tooltip', '[role="tooltip"], #tooltip-probe');
    assert.deepEqual(errors, [], 'live fixtures have browser errors');
    fs.writeFileSync(path.join(output, 'observations.json'), JSON.stringify({ settings, observations, errors, fontResponses: [...new Set(fontResponses)].sort() }, null, 2) + '\n');
    results.push({ name: path.basename(output), structures: Object.keys(observations).length, errors });
  } finally { await context.close(); }
}

async function main() {
  assert.ok(destination, '--out must name a new capture directory');
  const output = path.resolve(destination);
  assert.ok(!fs.existsSync(output), 'capture output already exists; expected artifacts are never overwritten');
  const before = hashes(source);
  const catalogue = JSON.parse(fs.readFileSync(path.join(source, 'dist/pudl-components.json'), 'utf8'));
  const inventory = fs.readFileSync(path.join(__dirname, 'COVERAGE.md'), 'utf8');
  fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/__skins_catalogue') { response.setHeader('Content-Type', 'text/html'); response.end(catalogueHTML(catalogue, inventory)); return; }
    const file = path.resolve(source, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(source + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { response.statusCode = 404; response.end(); return; }
    const types = { '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.html': 'text/html', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
    response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    response.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const rootURL = 'http://127.0.0.1:' + server.address().port;
  const manifest = { status: 'capture-in-progress', sourceHashes: before, harnessHash: sha(fs.readFileSync(__filename)), inventoryHash: sha(Buffer.from(inventory)), os: { platform: process.platform, release: os.release(), arch: os.arch() }, node: process.version, playwright: require('playwright/package.json').version, actualBrowsers: {}, results: [], exclusions: ['System-font and blocked-font modes are separate regression gates.', 'Actual browser zoom and manual assistive technology checks are not covered.', 'Contrast and target-size conformance are independent gates, not inferred from the baseline.'] };
  manifest.scope = { catalogue: arg('--phase') !== 'structural', liveStructures: arg('--phase') !== 'catalogue' };
  manifest.conditions = { deviceScaleFactor: 1, locale: 'en-US', timezone: 'UTC', reducedMotion: 'reduce', font: 'bundled Inter', viewportHeight: 900, rasterAllowance: 'Exact by default; optional live-only maximum 100 differing pixels with per-channel difference at most 12.' };
  try {
    for (const engine of engines) {
      const browser = await pw[engine].launch();
      try {
        manifest.actualBrowsers[engine] = { version: browser.version(), executable: pw[engine].executablePath(), headless: true };
        const selections = arg('--selections') === 'absent' ? [false] : [false, true];
        for (const width of (arg('--widths') || '1280,360').split(',').map(Number)) for (const theme of (arg('--themes') || 'light,dark').split(',')) for (const standard of selections) {
          const settings = { width, theme, standard, direction: arg('--direction') || 'ltr', forcedColors: arg('--forced-colors') || 'none' };
          const name = engine + '-' + width + '-' + theme + '-' + (standard ? 'standard' : 'absent') + (settings.direction === 'rtl' ? '-rtl' : '') + (settings.forcedColors === 'active' ? '-forced' : '');
          if (arg('--phase') !== 'structural') await catalogueCapture(browser, rootURL, settings, path.join(output, name), catalogue, manifest.results);
          if (arg('--phase') !== 'catalogue') await structuralCapture(browser, rootURL, settings, path.join(output, name + '-live'), manifest.results);
          console.log('CAPTURE ' + name);
        }
      } finally { await browser.close(); }
    }
    assert.deepEqual(hashes(source), before, 'source snapshot changed during capture');
    manifest.status = 'captured; repeatability and visual acceptance pending';
  } finally {
    fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
