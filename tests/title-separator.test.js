const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { launch, ROOT, out } = require('./lib');

(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const separator = selector => page.locator(selector).evaluate(n => JSON.parse(getComputedStyle(n, '::before').content));
    // Exercise stylesheet defaults without the window script's inline token.
    await page.setContent('<link rel="stylesheet" href="' + ROOT + '/dist/pudl.css"><link rel="stylesheet" href="' + ROOT + '/dist/pudl-windows.css"><span class="win-title-detail">Detail</span><span class="win-item-detail">Detail</span>');
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.win-title-detail'), '::before').content !== 'none');
    assert.equal(await separator('.win-title-detail'), ' \u00b7 ');
    assert.equal(await separator('.win-item-detail'), ' \u00b7 ');
    await page.goto(ROOT + '/tests/fixtures/taskbar-stacks.html?no-stacks');
    await page.locator('#all [data-win-tab="spare"]').waitFor();
    await page.evaluate(() => { pudlWindows.retitle('spare', 'Sample', 'OneX777'); pudlWindows.raise('spare'); });
    const title = '.win[data-win="spare"] .win-title-detail';
    const item = '#all [data-win-tab="spare"] .win-item-detail';
    await page.waitForFunction(() => document.querySelector('.win[data-win="spare"] .win-title-detail')?.textContent === 'OneX777');
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      assert.equal(await separator(title), ' \u00b7 ');
      assert.equal(await separator(item), ' \u00b7 ');
      const name = await page.locator('#all [data-win-tab="spare"]').getAttribute('aria-label');
      assert.ok(name.includes('Sample \u00b7 OneX777'), name);
      assert.equal([...name].filter(c => c === '\u00b7').length, 1);
      await page.screenshot({ path: out('title-separator-' + theme + '.png') });
    }
    await page.evaluate(() => {
      document.querySelector('[data-win-layer]').setAttribute('data-win-text-title-sep', ' / ');
      pudlWindows.retitle('spare', 'Sample', 'Custom');
    });
    await page.waitForFunction(() => document.querySelector('#all [data-win-tab="spare"]').getAttribute('aria-label').includes('Sample / Custom'));
    assert.equal(await separator(title), ' / ');
    assert.equal(await separator(item), ' / ');
    for (const name of ['pudl-windows.css', 'pudl-windows.js']) {
      const data = fs.readFileSync(path.join(__dirname, '../dist', name));
      const text = new TextDecoder('utf-8', { fatal: true }).decode(data);
      assert.ok(text.includes(' \u00b7 '), name + ' contains the single UTF-8 middle dot');
      assert.ok(!text.includes('\u00c3\u201a\u00c2\u00b7'), name + ' excludes the released double encoding');
    }
    assert.deepEqual(errors, []);
    console.log('PASS CSS and script title separators contain one middle dot; title, taskbar and custom separators agree');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
