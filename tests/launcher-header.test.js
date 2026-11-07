const assert = require('assert/strict');
const { launch, ROOT, out } = require('./lib');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    for (const sample of ['host-launcher-apps', 'host-launcher-content', 'host-launcher-tools', 'taskbar-pinning']) {
      await page.goto(ROOT + '/samples/' + sample + '.html');
      await page.waitForFunction(() => !!window.pudlLauncher?.state(document.getElementById('host-launcher')));
      const launcher = page.locator('#host-launcher');
      assert.equal(await launcher.locator('.start-header .popover-title').count(), 0);
      assert.ok((await launcher.getAttribute('aria-label')).endsWith(' launcher'), 'launcher retains its accessible name');
      assert.equal(await launcher.getAttribute('aria-labelledby'), null);
      await page.evaluate(() => pudlLauncher.present(document.getElementById('host-launcher'), 'popup'));
      const settings = launcher.getByRole('button', { name: 'Settings', exact: true });
      assert.equal(await settings.locator('.glyph').count(), 1);
      await settings.click();
      await page.locator('.win[data-win="settings"]').waitFor();
      await page.waitForFunction(() => pudlLauncher.state(document.getElementById('host-launcher')).presentation === 'closed');
      await page.locator('[data-study-theme]').selectOption('light');
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
      await page.reload();
      await page.locator('.win[data-win="settings"] [data-study-theme]').waitFor();
      assert.equal(await page.locator('[data-study-theme]').inputValue(), 'light', 'settings window and theme restore from the address and preferences');
      await page.evaluate(() => pudlWindows.close('settings'));
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => pudlLauncher.present(document.getElementById('host-launcher'), 'popup'));
      const bounds = await settings.boundingBox(), pin = await launcher.locator('[data-launcher-close]').boundingBox();
      assert.equal(await launcher.locator('[data-launcher-pin]').isVisible(),false);
      assert.ok(bounds.x + bounds.width <= pin.x, 'header actions leave pin controls clear at narrow widths');
      assert.equal(await launcher.locator('[data-start-query]').isVisible(), true);
      if (sample === 'host-launcher-tools') await page.screenshot({ path: out('launcher-header-actions-narrow.png') });
      await page.setViewportSize({ width: 1280, height: 900 });
    }
    assert.deepEqual(errors, []);
    console.log('PASS launcher headers omit duplicate titles, retain accessible names and provide working Settings with address restoration and narrow layout');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
