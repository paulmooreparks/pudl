const assert = require('assert/strict');
const { launch, ROOT, out } = require('./lib');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
    await page.goto(ROOT + '/tests/fixtures/menubar-launcher.html');
    await page.waitForSelector('.menubar-ready');
    const identity = page.locator('[data-menu-id="site"]'), glyph = page.locator('.menubar-menu:not(.menubar-one) .menubar-glyph');
    const open = () => page.locator('#catalog').evaluate(el => el.matches(':popover-open'));
    await identity.click(); assert.equal(await open(), true);
    await identity.click(); assert.equal(await open(), false);
    await glyph.click(); assert.equal(await open(), true);
    await glyph.click(); assert.equal(await open(), false);
    await identity.focus(); await identity.press('ArrowDown'); assert.equal(await open(), true);
    assert.equal(await identity.getAttribute('aria-expanded'), 'true');
    assert.equal(await glyph.getAttribute('aria-expanded'), 'true');
    assert.equal(await page.evaluate(() => {
      const before = pudlMenubar.launcherButton(), li = document.createElement('li');
      li.innerHTML = 'Help<ul><li><a href="#help">Help</a></li></ul>';
      document.querySelector('[data-menubar-source]').append(li); pudlMenubar.refresh();
      return pudlMenubar.launcherButton() === before;
    }), true, 'identity control survives a menu rebuild');
    await page.locator('#catalog').evaluate(el => el.hidePopover());
    await page.evaluate(() => document.querySelector('[data-menubar]').style.maxWidth = '130px');
    await page.setViewportSize({ width: 240, height: 800 });
    await page.waitForSelector('.menubar-collapsed');
    await page.locator('.menubar-one .menubar-title').click();
    const foldedLauncher = page.getByRole('menuitem', { name: 'Open launcher', exact: true });
    await foldedLauncher.waitFor();
    assert.match(await foldedLauncher.locator('.glyph').getAttribute('style'), /glyph-app/);
    assert.ok(await page.locator('#menubar-panel .md-section-label').filter({ hasText: 'Example' }).isVisible());
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      await page.screenshot({ path: out('folded-launcher-' + theme + '.png') });
    }
    await foldedLauncher.click(); assert.equal(await open(), true);
    await page.locator('#catalog').evaluate(el => el.hidePopover());
    await page.evaluate(() => {
      document.querySelector('[data-menubar]').setAttribute('data-menubar-launcher-label', 'Ouvrir le lanceur');
      pudlMenubar.refresh();
    });
    await page.locator('.menubar-one .menubar-title').click();
    await page.getByRole('menuitem', { name: 'Ouvrir le lanceur', exact: true }).click();
    assert.equal(await open(), true);
    await page.locator('#catalog').evaluate(el => el.hidePopover());
    await page.evaluate(() => document.querySelector('[data-menubar]').style.maxWidth = '');
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.waitForFunction(() => !document.querySelector('.menubar-row').classList.contains('menubar-collapsed') && document.querySelector('[data-menu-id="site"]').getClientRects().length);
    assert.match(await identity.textContent(), /Example/);
    await page.evaluate(() => {
      document.querySelector('[data-menubar]').addEventListener('pudl:menubar-launcher', e => { e.preventDefault(); window.requested = { toggle: e.detail.toggle, focus: e.detail.focus, target: e.detail.target.id }; });
    });
    await glyph.click(); assert.equal(await open(), false);
    assert.deepEqual(await page.evaluate(() => window.requested), { toggle: true, focus: 'first', target: 'catalog' });
    console.log('PASS native title toggle, default hamburger and keyboard activation, expanded state, retained identity and cancelable host request');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
