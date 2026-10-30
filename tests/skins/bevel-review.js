/* Independent candidate review. This records findings and never admits a
   skin, changes shipped assets, or rewrites preservation expectations. */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const assert = require('assert/strict');
const pw = require('playwright');
const source = path.resolve(process.argv[2] || 'tests/output/skins-bevel-review-source');
const output = path.resolve(process.argv[3] || 'tests/output/skins-bevel-review');
const skinIndex = process.argv.indexOf('--skin');
const skinName = skinIndex < 0 ? 'bevel' : process.argv[skinIndex + 1];
assert.ok(['bevel', 'gel', 'glaze'].includes(skinName), 'unsupported review treatment');
const catalogue = JSON.parse(fs.readFileSync(path.join(source, 'dist/pudl-components.json')));
const cases = catalogue.components.flatMap(component => [{ name: 'rest' }]
  .concat((component.variants || []).map((variant, i) => ({ name: 'variant-' + i, variant })))
  .concat((component.states || []).map((state, i) => ({ name: 'state-' + i, state })))
  .map(test => ({ ...test, component, id: component.id + '-' + test.name })));
const html = '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/dist/pudl.css">' +
  '<link rel="stylesheet" href="/dist/pudl-windows.css"><link rel="stylesheet" href="/samples/skins-' + skinName + '.css">' +
  '<style>body{padding:16px;margin:0}.review-case{position:relative;padding:12px;background:var(--surface);margin-bottom:12px}' +
  '.review-case>dialog[open],.review-case>.popover{position:relative;inset:auto;margin:0}*{transition:none!important;animation:none!important}</style></head><body>' +
  cases.map(c => '<section class="review-case" id="' + c.id + '">' + c.component.template + '</section>').join('') + '</body></html>';
const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, ...(detail === undefined ? {} : { detail }) }); }
async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.getAnimations().filter(a => a.effect && Number.isFinite(a.effect.getComputedTiming().endTime)).map(a => a.finished.catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
async function dangerStates(page) {
  const button = page.locator('main .btn-danger');
  const read = () => button.evaluate(node => {
    const s = getComputedStyle(node), r = node.getBoundingClientRect();
    return { paint: ['color', 'backgroundColor', 'backgroundImage', 'boxShadow', 'borderTopColor', 'borderTopWidth', 'fontSize', 'fontFamily'].map(p => s[p]), bounds: [r.width, r.height] };
  });
  await page.mouse.move(0, 0); await settle(page);
  const rest = await read();
  await button.hover(); await settle(page); const hover = await read();
  await page.mouse.down(); await settle(page); const pressed = await read();
  await page.mouse.up(); await page.mouse.move(0, 0); await settle(page);
  return { rest, hover, pressed };
}
async function geometry(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('.review-case, .review-case *'), node => {
    const s = getComputedStyle(node), r = node.getBoundingClientRect();
    return { tag: node.tagName, rect: [r.x, r.y, r.width, r.height], client: [node.clientWidth, node.clientHeight],
      box: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'display', 'position'].map(p => s[p]) };
  }));
}
async function initialize(page, theme) {
  await page.evaluate(({ cases, theme }) => {
    document.documentElement.dataset.theme = theme;
    for (const c of cases) {
      const host = document.getElementById(c.id);
      for (const node of host.querySelectorAll('[id]')) {
        const old = node.id, fresh = c.id + '-' + old;
        for (const ref of host.querySelectorAll('[for], [aria-labelledby], [aria-describedby], [popovertarget]')) {
          for (const attr of ['for', 'aria-labelledby', 'aria-describedby', 'popovertarget']) if (ref.hasAttribute(attr)) ref.setAttribute(attr, ref.getAttribute(attr).split(' ').map(id => id === old ? fresh : id).join(' '));
        }
        node.id = fresh;
      }
      if (c.variant) {
        const targets = c.variant.on ? [...host.querySelectorAll(c.variant.on)] : [host.firstElementChild];
        if (!targets.length) throw Error(c.id + ': missing variant target');
        targets.forEach(node => node.classList.add(c.variant.class));
      }
      if (c.state) {
        const node = c.state.on ? host.querySelector(c.state.on) : host.firstElementChild;
        if (!node) throw Error(c.id + ': missing state target');
        if (c.state.attribute) node.setAttribute(c.state.attribute, c.state.value || '');
        if (c.state.class) node.classList.add(c.state.class);
      }
      for (const dialog of host.querySelectorAll('dialog')) dialog.setAttribute('open', '');
    }
  }, { cases, theme });
  await settle(page);
}
async function surfaces(page) {
  return page.evaluate(components => components.flatMap(c => (c.parts || []).map(part => {
    const host = document.getElementById(c.id + '-rest'), node = host.querySelector(part.selector);
    if (!node) return { id: c.id, selector: part.selector, missing: true };
    const s = getComputedStyle(node, part.pseudo || null);
    return { id: c.id, selector: part.selector, surface: part.surface, background: s.backgroundImage, shadow: s.boxShadow };
  })), catalogue.components);
}
async function contrast(page, selector) {
  return page.locator(selector).evaluateAll(nodes => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const rgba = css => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].map(v => v / 255); };
    const over = (a, b) => [...a.slice(0, 3).map((v, i) => v * a[3] + b[i] * (1 - a[3])), 1];
    const luminance = rgb => rgb.slice(0, 3).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
    const ratio = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    return nodes.filter(n => n.getBoundingClientRect().width && !n.disabled).map(node => {
      const s = getComputedStyle(node), chain = []; let parent = node;
      while (parent) { chain.unshift(parent); parent = parent.parentElement; }
      let outside = [1, 1, 1, 1];
      for (const n of chain.slice(0, -1)) outside = over(rgba(getComputedStyle(n).backgroundColor), outside);
      const bg = over(rgba(s.backgroundColor), outside);
      const foreground = over(rgba(s.color), bg);
      const gradientStops = (s.backgroundImage.match(/(?:rgba?|color)\([^)]*\)/g) || []).map(css => ({ css, ratio: ratio(foreground, over(rgba(css), outside)) }));
      return { text: (node.textContent || node.value || node.getAttribute('aria-label') || '').trim().slice(0, 60), class: node.className,
        gradient: s.backgroundImage, foreground: s.color, background: s.backgroundColor, textRatio: ratio(over(rgba(s.color), bg), bg),
        gradientStops,
        borderRatio: ratio(rgba(s.borderTopColor), bg), boundaryRatio: Math.max(ratio(over(rgba(s.borderTopColor), outside), outside), ratio(bg, outside)),
        width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height };
    });
  });
}
async function main() {
  assert.ok(!fs.existsSync(output), 'output must be new'); fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/catalogue') { response.setHeader('Content-Type', 'text/html'); response.end(html); return; }
    const file = path.resolve(source, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(source + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { response.statusCode = 404; response.end(); return; }
    response.setHeader('Content-Type', ({ '.css': 'text/css', '.js': 'text/javascript', '.html': 'text/html', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream');
    response.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port, browsers = {};
  try {
    for (const engine of ['chromium', 'firefox', 'webkit']) {
      const browser = await pw[engine].launch(); browsers[engine] = browser.version();
      try {
        for (const theme of ['light', 'dark']) {
          const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, reducedMotion: 'reduce' });
          const errors = []; page.on('pageerror', e => errors.push(e.message));
          const label = engine + '-' + theme;
          await page.goto(base + '/catalogue'); await initialize(page, theme);
          const before = await geometry(page);
          await page.evaluate(skin => { document.documentElement.dataset.skin = skin; }, skinName); await settle(page);
          const after = await geometry(page);
          check(label + ' all 154 catalogue cases retain geometry and type', JSON.stringify(before) === JSON.stringify(after), { cases: cases.length, nodes: after.length });
          const paints = await surfaces(page);
          fs.writeFileSync(path.join(output, label + '-surfaces.json'), JSON.stringify(paints, null, 2));
          for (const part of paints) {
            let ok = !part.missing;
            if (part.surface === 'raised') ok = ok && /inset/.test(part.shadow) && (skinName === 'bevel' ? part.background === 'none' : /gradient/.test(part.background));
            if (part.surface === 'sunken') ok = ok && /inset/.test(part.shadow) && part.background === 'none';
            if (['flat', 'list', 'link', 'handle'].includes(part.surface)) ok = ok && !/inset/.test(part.shadow) && part.background === 'none';
            check(label + ' ' + part.id + ' ' + part.selector + ' retains ' + part.surface + ' surface', ok, ok ? undefined : part);
          }
          for (const media of [{ forcedColors: 'active', media: 'screen' }, { forcedColors: 'none', media: 'print' }]) {
            await page.emulateMedia(media);
            await page.evaluate(() => { document.documentElement.dataset.skin = 'standard'; }); await settle(page);
            const standard = await page.locator('#button-rest .btn').evaluate(n => { const s = getComputedStyle(n); return [s.backgroundImage, s.boxShadow, s.borderRadius, s.color, s.borderColor]; });
            await page.evaluate(skin => { document.documentElement.dataset.skin = skin; }, skinName); await settle(page);
            const bevel = await page.locator('#button-rest .btn').evaluate(n => { const s = getComputedStyle(n); return [s.backgroundImage, s.boxShadow, s.borderRadius, s.color, s.borderColor]; });
            check(label + ' ' + JSON.stringify(media) + ' excludes ' + skinName + ' paint', JSON.stringify(standard) === JSON.stringify(bevel));
          }
          await page.close();
          for (const width of [1280, 360]) {
            const preview = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
            preview.on('pageerror', e => errors.push(e.message));
            await preview.goto(base + '/samples/skins.html?theme=' + theme + '&skin=standard');
            await preview.waitForFunction(() => document.querySelectorAll('.win').length === 2);
            await settle(preview);
            const standardContrasts = await contrast(preview, 'main .btn, main .form-input, main .form-select, main .form-textarea');
            fs.writeFileSync(path.join(output, label + '-' + width + '-standard-contrast.json'), JSON.stringify(standardContrasts, null, 2));
            if (width === 1280) {
              const candidateStates = await dangerStates(preview);
              const original = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
              const frozen = path.resolve('tests/output/skins-source-20261030-1702');
              await original.route('**/dist/pudl.css', route => route.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(frozen, 'dist/pudl.css')) }));
              await original.route('**/dist/pudl-windows.css', route => route.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(frozen, 'dist/pudl-windows.css')) }));
              await original.goto(base + '/samples/skins.html?theme=' + theme + '&skin=standard');
              await original.waitForFunction(() => document.querySelectorAll('.win').length === 2); await settle(original);
              const originalStates = await dangerStates(original);
              check(label + ' Standard danger rest/hover/pressed paint and bounds match original frozen styles', JSON.stringify(candidateStates) === JSON.stringify(originalStates), { original: originalStates, candidate: candidateStates });
              await original.close();
            }
            await preview.locator('main input.form-input').first().fill('Verification edited this value');
            await preview.evaluate(() => { window.reviewInput = document.querySelector('main input.form-input'); window.reviewHistoryLength = history.length; });
            await preview.selectOption('#skin', skinName); await settle(preview);
            check(label + '-' + width + ' skin change preserves edited node and history length', await preview.evaluate(() => window.reviewInput === document.querySelector('main input.form-input') && window.reviewInput.value === 'Verification edited this value' && history.length === window.reviewHistoryLength));
            const dimensions = await preview.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
            check(label + '-' + width + ' preview fits viewport', dimensions.scroll <= dimensions.client + 1, dimensions);
            const contrasts = await contrast(preview, 'main .btn, main .form-input, main .form-select, main .form-textarea');
            fs.writeFileSync(path.join(output, label + '-' + width + '-contrast.json'), JSON.stringify(contrasts, null, 2));
            for (const c of contrasts.filter(c => c.gradient === 'none')) {
              check(label + '-' + width + ' text ' + c.text + ' reaches 4.5:1', c.textRatio >= 4.5, c);
              check(label + '-' + width + ' boundary ' + c.text + ' reaches 3:1', c.boundaryRatio >= 3, c);
              check(label + '-' + width + ' control ' + c.text + ' reaches 24px in both dimensions', c.width >= 24 && c.height >= 24, c);
            }
            if (width === 1280) {
              const button = preview.locator('main .btn-danger');
              const states = {};
              for (const state of ['rest', 'hover', 'pressed']) {
                if (state === 'rest') await preview.mouse.move(0, 0);
                else await button.hover();
                if (state === 'pressed') await preview.mouse.down();
                await settle(preview);
                states[state] = (await contrast(preview, 'main .btn-danger'))[0];
                // Gradient text is measured against actual rendered pixels by
                // gradient-review.js rather than an assumed solid fill.
                if (states[state].gradient === 'none') check(label + ' destructive text ' + state + ' reaches 4.5:1', states[state].textRatio >= 4.5, states[state]);
              }
              await preview.mouse.up(); await preview.mouse.move(0, 0); await settle(preview);
              fs.writeFileSync(path.join(output, label + '-danger-states.json'), JSON.stringify(states, null, 2));
            }
            await preview.screenshot({ path: path.join(output, label + '-' + width + '.png'), fullPage: true });
            await preview.close();
          }
          check(label + ' no browser errors', !errors.length, errors);
          console.log('REVIEW ' + label);
        }
      } finally { await browser.close(); }
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
  const inputs = Object.fromEntries(['dist/pudl.css', 'dist/pudl-windows.css', 'samples/skins.html', 'samples/skins.js', 'samples/skins-' + skinName + '.css', 'skins/' + skinName + '.json'].map(f => [f, crypto.createHash('sha256').update(fs.readFileSync(path.join(source, f))).digest('hex')]));
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ skin: skinName, inputs, browsers, cases: cases.length, results }, null, 2));
  console.log(results.length + ' checks; ' + results.filter(r => !r.ok).length + ' findings');
  for (const finding of results.filter(r => !r.ok)) console.log('FAIL ' + JSON.stringify(finding));
  process.exitCode = results.some(r => !r.ok) ? 1 : 0;
}
main().catch(e => { console.error(e); process.exitCode = 1; });
