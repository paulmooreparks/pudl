'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('fs');
const path = require('path');
const pw = require('playwright');
const script = fs.readFileSync(path.join(__dirname, process.env.PUDL_MIN ? '../dist/min/pudl-skins.js' : '../dist/pudl-skins.js'), 'utf8');
for (const engine of (process.env.PUDL_BROWSER ? [process.env.PUDL_BROWSER] : ['chromium', 'firefox', 'webkit'])) {
  test(engine + ' selects only available skins and preserves content and navigation', async () => {
    const browser = await pw[engine].launch();
    try {
      const page = await browser.newPage();
      await page.route('http://skins.test/**', route => route.fulfill({ contentType: route.request().url().endsWith('.css') ? 'text/css' : 'text/html',
        body: route.request().url().endsWith('.css') ? ':root[data-skin="bevel"] { --probe: 1; }' : '<link id="skin" rel="stylesheet" href="/bevel.css"><input id="editor" value="keep">' }));
      await page.goto('http://skins.test/');
      await page.addScriptTag({ content: script });
      let result = await page.evaluate(() => {
        const api = pudlSkins, link = document.getElementById('skin'), editor = document.getElementById('editor');
        window.keptEditor = editor; editor.focus(); editor.value = 'edited';
        window.keptHistory = history.length; window.keptURL = location.href;
        const unknown = api.select('missing');
        const fallback = api.current();
        const invalid = api.register('bad', document.createElement('link'));
        const registered = api.register('bevel', link);
        const selected = api.select('bevel');
        return { unknown, fallback, invalid, registered, selected, current: api.current(), available: api.available(),
          preserved: editor === window.keptEditor && editor.value === 'edited' && document.activeElement === editor && history.length === window.keptHistory && location.href === window.keptURL };
      });
      assert.deepEqual(result, { unknown: false, fallback: 'standard', invalid: false, registered: true, selected: true, current: 'bevel', available: ['standard', 'bevel'], preserved: true });
      result = await page.evaluate(() => {
        const api = pudlSkins, sheet = document.getElementById('skin').sheet;
        const changes = [];
        document.addEventListener('pudl:skin-change', event => changes.push(event.detail.skin));
        sheet.disabled = true;
        const available = api.available();
        const fallback = api.refresh();
        const attribute = document.documentElement.dataset.skin;
        const current = api.current();
        api.refresh();
        sheet.disabled = false;
        const restored = api.refresh();
        return { available, fallback, attribute, current, restored, changes, preference: api.preference(),
          preserved: document.activeElement === window.keptEditor && window.keptEditor.value === 'edited' && history.length === window.keptHistory && location.href === window.keptURL };
      });
      assert.deepEqual(result, { available: ['standard'], fallback: 'standard', attribute: 'standard', current: 'standard', restored: 'bevel',
        changes: ['standard', 'bevel'], preference: 'bevel', preserved: true });
      await page.evaluate(() => document.getElementById('skin').remove());
      await page.waitForFunction(() => document.documentElement.dataset.skin === 'standard');
      assert.equal(await page.evaluate(() => pudlSkins.preference()), 'bevel');
      await page.reload();
      await page.addScriptTag({ content: script });
      assert.equal(await page.evaluate(() => pudlSkins.current()), 'standard', 'saved preference cannot select an unregistered sheet');
      assert.equal(await page.evaluate(() => pudlSkins.register('bevel', document.getElementById('skin')) && pudlSkins.current()), 'bevel');
      await page.evaluate(() => document.getElementById('skin').media = '(max-width: 1px)');
      await page.waitForFunction(() => pudlSkins.current() === 'standard');
      result = await page.evaluate(() => {
        const api = pudlSkins;
        const before = api.preference();
        const invalid = api.select('bad id');
        return { before, after: api.preference(), invalid, available: api.available() };
      });
      assert.deepEqual(result, { before: 'bevel', after: 'bevel', invalid: false, available: ['standard'] });
    } finally { await browser.close(); }
  });
}
