const assert = require('assert/strict');
const { launch, ROOT } = require('./lib');
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
    await page.evaluate(() => {
      document.querySelector('[data-menubar]').addEventListener('pudl:menubar-launcher', e => { e.preventDefault(); window.requested = { toggle: e.detail.toggle, focus: e.detail.focus, target: e.detail.target.id }; });
    });
    await glyph.click(); assert.equal(await open(), false);
    assert.deepEqual(await page.evaluate(() => window.requested), { toggle: true, focus: 'first', target: 'catalog' });
    console.log('PASS native title toggle, default hamburger and keyboard activation, expanded state, retained identity and cancelable host request');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
