/* Independent runtime lifecycle checks. No registration is conformance admission. */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const assert = require('assert/strict');
const pw = require('playwright');
const runtime = fs.readFileSync(path.resolve(process.argv[2] || 'dist/pudl-skins.js'));
const output = path.resolve(process.argv[3] || 'tests/output/skins-runtime-review');
const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, ...(detail === undefined ? {} : { detail }) }); }
async function checkpoint(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function main() {
  assert.ok(!fs.existsSync(output), 'output must be new'); fs.mkdirSync(output, { recursive: true });
  const requests = [];
  const server = http.createServer((request, response) => {
    requests.push(request.url);
    if (request.url === '/runtime.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(runtime); return; }
    if (request.url.startsWith('/bevel.css')) { response.setHeader('Content-Type', 'text/css'); response.end(':root[data-skin="bevel"] { --availability-probe: loaded; }'); return; }
    if (request.url === '/missing.css') { response.statusCode = 404; response.end(); return; }
    response.setHeader('Content-Type', 'text/html');
    response.end('<!doctype html><html data-theme="dark"><head><link id="skin" rel="stylesheet" href="/bevel.css"><script src="/runtime.js" defer></script></head><body><input id="editor" value="original"></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port, browsers = {};
  try {
    for (const engine of ['chromium', 'firefox', 'webkit']) {
      const browser = await pw[engine].launch(); browsers[engine] = browser.version();
      const context = await browser.newContext({ viewport: { width: 1000, height: 700 } });
      context.setDefaultTimeout(10000);
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      async function fresh() { await page.goto(base); await page.evaluate(() => { localStorage.clear(); pudlSkins.select('standard'); }); }
      async function selected() { await fresh(); return page.evaluate(() => pudlSkins.register('bevel', document.getElementById('skin')) && pudlSkins.select('bevel')); }
      try {
        check(engine + ' loaded sheet registration and selection', await selected());
        const preservation = await page.evaluate(() => {
          const editor = document.getElementById('editor'); editor.focus(); editor.value = 'edited'; editor.setSelectionRange(1, 4);
          const url = location.href, length = history.length, events = [];
          document.addEventListener('pudl:skin-change', e => events.push(e.detail));
          pudlSkins.select('missing'); const unavailable = [pudlSkins.current(), pudlSkins.preference()]; pudlSkins.select('bevel');
          return { unchanged: editor === document.getElementById('editor') && document.activeElement === editor && editor.value === 'edited' && editor.selectionStart === 1 && editor.selectionEnd === 4 && history.length === length && location.href === url && document.documentElement.dataset.theme === 'dark', unavailable, events };
        });
        check(engine + ' preserves mounted input, selection, focus, URL, history and theme', preservation.unchanged, preservation);
        check(engine + ' unavailable preference and change event detail', JSON.stringify(preservation.unavailable) === '["standard","missing"]' && JSON.stringify(preservation.events) === '[{"skin":"standard","preference":"missing"},{"skin":"bevel","preference":"bevel"}]', preservation);
        const beforeRequests = requests.length;
        await page.evaluate(() => pudlSkins.select('never-offered'));
        await checkpoint(page);
        check(engine + ' selecting unavailable skin makes no network request', requests.length === beforeRequests);

        await selected();
        await page.evaluate(() => { document.getElementById('skin').disabled = true; }); await checkpoint(page);
        const disabled = await page.evaluate(() => ({ root: document.documentElement.dataset.skin, disabled: document.getElementById('skin').disabled, preference: pudlSkins.preference() }));
        check(engine + ' link.disabled automatically falls back', disabled.root === 'standard' && disabled.preference === 'bevel', disabled);

        await selected();
        await page.evaluate(() => { document.getElementById('skin').sheet.disabled = true; }); await checkpoint(page);
        const sheetDisabled = await page.evaluate(() => {
          const available = pudlSkins.available(), current = pudlSkins.current();
          return { root: document.documentElement.dataset.skin, linkDisabled: document.getElementById('skin').disabled, sheetDisabled: document.getElementById('skin').sheet.disabled, current, available, paint: getComputedStyle(document.documentElement).getPropertyValue('--availability-probe').trim() };
        });
        check(engine + ' disabled CSSStyleSheet cannot remain available', sheetDisabled.root === 'standard' && sheetDisabled.current === 'standard' && !sheetDisabled.available.includes('bevel'), sheetDisabled);
        const refreshed = await page.evaluate(() => {
          const events = []; document.addEventListener('pudl:skin-change', event => events.push(event.detail));
          const link = document.getElementById('skin'); link.sheet.disabled = false;
          const enabled = pudlSkins.refresh(), again = pudlSkins.refresh();
          link.sheet.disabled = true;
          const disabled = pudlSkins.refresh(), repeated = pudlSkins.refresh();
          return { enabled, again, disabled, repeated, events, preference: pudlSkins.preference(), root: document.documentElement.dataset.skin };
        });
        check(engine + ' explicit CSSOM refresh restores and revokes without duplicate events', refreshed.enabled === 'bevel' && refreshed.again === 'bevel' && refreshed.disabled === 'standard' && refreshed.repeated === 'standard' && refreshed.events.length === 2 && refreshed.preference === 'bevel' && refreshed.root === 'standard', refreshed);

        await selected();
        await page.evaluate(() => document.getElementById('skin').remove()); await checkpoint(page);
        check(engine + ' removal automatically falls back', await page.evaluate(() => document.documentElement.dataset.skin === 'standard' && pudlSkins.preference() === 'bevel'));

        await selected();
        await page.evaluate(() => { document.getElementById('skin').media = 'screen'; }); await checkpoint(page);
        check(engine + ' changed matching media revokes registration', await page.evaluate(() => document.documentElement.dataset.skin === 'standard' && !pudlSkins.available().includes('bevel')));
        check(engine + ' changed matching media can be registered again', await page.evaluate(() => pudlSkins.register('bevel', document.getElementById('skin')) && pudlSkins.current() === 'bevel'));

        await selected();
        await page.evaluate(() => { const link = document.getElementById('skin'); link.media = '(min-width: 700px)'; pudlSkins.register('bevel', link); });
        await page.setViewportSize({ width: 600, height: 700 }); await checkpoint(page);
        check(engine + ' media-query mismatch automatically falls back', await page.evaluate(() => document.documentElement.dataset.skin === 'standard' && pudlSkins.preference() === 'bevel'));
        await page.setViewportSize({ width: 1000, height: 700 }); await checkpoint(page);
        check(engine + ' matching media restores retained preference', await page.evaluate(() => document.documentElement.dataset.skin === 'bevel'));

        await selected();
        await Promise.all([page.waitForResponse(response => response.url().endsWith('/bevel.css?changed')), page.evaluate(() => { document.getElementById('skin').href = '/bevel.css?changed'; })]); await checkpoint(page);
        check(engine + ' changed href revokes registration after successful reload', await page.evaluate(() => document.documentElement.dataset.skin === 'standard' && !pudlSkins.available().includes('bevel')));

        await selected();
        const other = await context.newPage(); await other.goto(base);
        await other.evaluate(() => localStorage.setItem('pudl-skin', 'missing-from-other-tab'));
        await page.waitForFunction(() => document.documentElement.dataset.skin === 'standard');
        check(engine + ' actual cross-tab storage retains unavailable preference', await page.evaluate(() => pudlSkins.preference() === 'missing-from-other-tab'));
        await other.evaluate(() => localStorage.removeItem('pudl-skin'));
        await page.waitForFunction(() => pudlSkins.preference() === 'standard'); await other.close();

        await fresh();
        check(engine + ' invalid, reserved and disconnected registration rejected', await page.evaluate(() => !pudlSkins.register('standard', document.getElementById('skin')) && !pudlSkins.register('bad id', document.getElementById('skin')) && !pudlSkins.register('bevel', document.createElement('link'))));
        const blocked = await context.newPage();
        await blocked.addInitScript(() => { Storage.prototype.getItem = function () { throw new DOMException('Blocked', 'SecurityError'); }; Storage.prototype.setItem = function () { throw new DOMException('Blocked', 'SecurityError'); }; });
        await blocked.goto(base);
        check(engine + ' blocked storage retains usable in-page selection', await blocked.evaluate(() => pudlSkins.register('bevel', document.getElementById('skin')) && pudlSkins.select('bevel') && pudlSkins.current() === 'bevel')); await blocked.close();
        check(engine + ' no runtime page errors', !errors.length, errors);
        console.log('RUNTIME ' + engine);
      } finally { await context.close(); await browser.close(); }
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
  const report = { runtimeHash: crypto.createHash('sha256').update(runtime).digest('hex'), browsers, results };
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(report, null, 2));
  console.log(results.length + ' checks; ' + results.filter(r => !r.ok).length + ' findings');
  for (const r of results.filter(r => !r.ok)) console.log('FAIL ' + JSON.stringify(r));
  process.exitCode = results.some(r => !r.ok) ? 1 : 0;
}
main().catch(error => {
  fs.writeFileSync(path.join(output, 'interrupted-results.json'), JSON.stringify({ runtimeHash: crypto.createHash('sha256').update(runtime).digest('hex'), results, error: String(error.stack || error) }, null, 2));
  console.error(error); process.exitCode = 1;
});
