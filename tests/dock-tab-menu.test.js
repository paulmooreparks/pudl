const { launch, ROOT } = require('./lib');
const assert = require('assert/strict');
(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  for (const rtl of [false, true]) {
    await page.goto(ROOT + '/tests/fixtures/split-docks.html');
    await page.waitForSelector('[data-win="e"]');
    await page.evaluate(rtl => {
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      for (const k of ['a', 'b', 'c', 'd', 'e']) pudlWindows.dock(k, 'right');
      pudlWindows.dockMode('right', 'open');
    }, rtl);
    // Reserve a classic scrollbar's space even on overlay-scrollbar engines.
    await page.addStyleTag({ content: '.win-dock-tablist { padding-bottom: 15px; box-sizing: border-box; }' });
    await page.locator('[data-dock-key="a"]').click();
    await page.waitForFunction(() => !document.querySelector('[data-dock-menu="a"]').hidden);
    const active = await page.locator('[data-dock-menu="a"]').boundingBox();
    const strip = await page.locator('[data-dock-edge="right"] .win-dock-tablist').boundingBox();
    assert.ok(active.y >= strip.y && active.y + active.height <= strip.y + strip.height, 'active menu stays visible with scrollbar space');
    await page.locator('[data-dock-edge="right"] .win-dock-tablist').evaluate(e => { e.scrollLeft = getComputedStyle(e).direction === 'rtl' ? -35 : 35; });
    await page.waitForFunction(() => !document.querySelector('[data-dock-menu="a"]').hidden);
    assert.ok(await page.locator('[data-dock-menu="a"]').isVisible(), 'partly clipped tab retains its visible menu button');
    for (const key of ['b', 'c']) {
      await page.locator('[data-dock-key="' + key + '"]').scrollIntoViewIfNeeded();
      await page.locator('[data-dock-menu="' + key + '"]').click();
      await page.waitForSelector('#win-menu-' + key + ':popover-open:not(.placing)');
      const menu = await page.locator('#win-menu-' + key).boundingBox();
      const button = await page.locator('[data-dock-menu="' + key + '"]').boundingBox();
      assert.ok(button && menu.x + menu.width >= button.x && menu.x <= button.x + button.width, 'menu stays anchored after selecting another tab');
      await page.keyboard.press('Escape');
    }
    await page.locator('[data-dock-key="b"]').click({ button: 'right' });
    await page.waitForSelector('.context-menu:popover-open');
    assert.ok(await page.locator('.context-menu:popover-open').innerText().then(t => t.includes('Close')), 'right-click offers window commands');
    assert.equal(await page.locator('[data-dock-key="c"]').getAttribute('aria-selected'), 'true', 'right-click does not change selection');
    await page.keyboard.press('Escape');
    await page.locator('[data-dock-key="a"]').focus();
    await page.keyboard.press('Shift+F10');
    await page.waitForSelector('#win-menu-a:popover-open:not(.placing)');
    await page.keyboard.press('Escape');
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
