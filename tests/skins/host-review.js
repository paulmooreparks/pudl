/* Independent host-owned initialization and persistence checks. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), crypto = require('crypto');
const assert = require('assert/strict'), pw = require('playwright');
const source = path.resolve(process.argv[2]), output = path.resolve(process.argv[3]);
const scripts = Object.fromEntries(['pudl-theme.js', 'pudl-skins.js'].map(f => [f, fs.readFileSync(path.join(source, f), 'utf8')]));
async function main() {
  assert.ok(!fs.existsSync(output), 'output must be new'); fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/skin.css' ? 'text/css' : 'text/html');
    res.end(req.url === '/skin.css' ? ':root[data-skin="gel"]{--test-skin:gel}' : '<html data-pudl-persistence="host"><head><link id="skin" rel="stylesheet" href="/skin.css"></head><body><input value="original"></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const results = [];
  try {
    for (const engine of ['chromium', 'firefox', 'webkit']) {
      const browser = await pw[engine].launch();
      try {
        for (const initial of ['light', 'dark', 'system']) for (const boot of ['explicit', 'declarative-loaded', 'declarative-disabled']) {
          const page = await browser.newPage({ colorScheme: 'light' });
          await page.goto('http://127.0.0.1:' + server.address().port);
          await page.evaluate(({ initial, boot }) => {
            document.documentElement.dataset.themePref = initial; document.documentElement.dataset.skin = 'gel';
            if (boot !== 'explicit') document.querySelector('#skin').dataset.pudlSkin = 'gel';
            if (boot === 'declarative-disabled') document.querySelector('#skin').disabled = true;
            window.skinEvents = []; document.addEventListener('pudl:skin-change', e => skinEvents.push(e.detail));
            window.storageCalls = 0; Object.defineProperty(window, 'localStorage', { get() { storageCalls++; throw new Error('Host owns persistence'); } });
            window.originalField = document.querySelector('input'); originalField.value = 'Edited'; originalField.focus(); originalField.setSelectionRange(1, 3);
            window.originalURL = location.href; window.originalHistory = history.length;
          }, { initial, boot });
          for (const script of Object.values(scripts)) await page.addScriptTag({ content: script });
          await page.evaluate(() => {
            window.bootInitial = { theme: pudlThemePreference(), effectiveTheme: document.documentElement.dataset.theme, preference: pudlSkins.preference(), effectiveSkin: pudlSkins.current(), events: skinEvents.slice() };
            document.querySelector('#skin').disabled = false;
          });
          await page.waitForFunction(() => { const link = document.querySelector('#skin'); return link.sheet && !link.disabled && !link.sheet.disabled; });
          const observation = await page.evaluate(() => {
            const initial = window.bootInitial;
            const registered = pudlSkins.register('gel', document.querySelector('#skin')), selected = pudlSkins.current();
            pudlSetTheme('dark'); pudlSkins.select('missing');
            window.dispatchEvent(new StorageEvent('storage', { key: 'pudl-theme', newValue: 'light' }));
            window.dispatchEvent(new StorageEvent('storage', { key: 'pudl-skin', newValue: 'standard' }));
            const unavailable = { theme: pudlThemePreference(), preference: pudlSkins.preference(), effective: pudlSkins.current() };
            pudlSkins.select('gel');
            return { initial, registered, selected, unavailable, restored: pudlSkins.current(), storageCalls, retained: originalField === document.querySelector('input') && originalField.value === 'Edited' && originalField === document.activeElement && originalField.selectionStart === 1 && originalField.selectionEnd === 3 && location.href === originalURL && history.length === originalHistory };
          });
          const expectedInitial = boot === 'declarative-loaded' ? 'gel' : 'standard';
          const pass = observation.initial.theme === initial && observation.initial.effectiveTheme === (initial === 'system' ? 'light' : initial) && observation.initial.preference === 'gel' && observation.initial.effectiveSkin === expectedInitial && observation.initial.events.length === 1 && observation.initial.events[0].skin === expectedInitial && observation.registered && observation.selected === 'gel' && observation.unavailable.theme === 'dark' && observation.unavailable.preference === 'missing' && observation.unavailable.effective === 'standard' && observation.restored === 'gel' && observation.storageCalls === 0 && observation.retained;
          results.push({ name: engine + '-' + initial + '-' + boot, pass, observation }); console.log((pass ? 'PASS ' : 'FAIL ') + engine + '-' + initial + '-' + boot); await page.close();
        }
      } finally { await browser.close(); }
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
  const inputs = Object.fromEntries(Object.entries(scripts).map(([name, text]) => [name, crypto.createHash('sha256').update(text).digest('hex')]));
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ source, inputs, results }, null, 2)); process.exitCode = results.some(r => !r.pass) ? 1 : 0;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
