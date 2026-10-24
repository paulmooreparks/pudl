const { launch, ROOT } = require('./lib');
const assert = require('assert/strict');
(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const win = key => page.locator('.win[data-win="' + key + '"]');
  const settle = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  async function start() {
    await page.goto(ROOT + '/tests/fixtures/split-docks.html');
    await page.waitForSelector('[data-win="e"]');
    await page.evaluate(() => document.querySelector('[data-win-layer]').setAttribute('data-win-resize-mode', 'outline'));
  }
  async function drag(handle, dx, dy) {
    const box = await handle.boundingBox();
    assert.ok(box, 'resize handle exists');
    const point = await handle.evaluate(el => {
      const r = el.getBoundingClientRect();
      for (const y of [.5, .9, .1]) for (const x of [.5, .9, .1]) {
        const at = { x: r.x + r.width * x, y: r.y + r.height * y };
        if (document.elementFromPoint(at.x, at.y) === el) return at;
      }
      return null;
    });
    assert.ok(point, 'resize handle has an exposed hit target');
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + dx, point.y + dy, { steps: 5 });
    await settle();
  }
  await start();
  await page.evaluate(() => pudlWindows.raise('a'));
  const before = await win('a').boundingBox(), address = page.url();
  await drag(win('a').locator('.win-rh[data-edge="se"]'), 100, 60);
  assert.deepEqual(await win('a').boundingBox(), before, 'floating content does not resize during drag');
  assert.equal(page.url(), address, 'preview does not write address state');
  assert.ok(await page.locator('.win-ghost:not([hidden])').isVisible());
  await page.mouse.up();
  const after = await win('a').boundingBox();
  assert.ok(after.width > before.width + 90 && after.height > before.height + 50);
  await page.goBack(); await settle();
  assert.ok(Math.abs((await win('a').boundingBox()).width - before.width) < 2, 'one Back restores the original size');
  const restored = await win('a').boundingBox();
  await drag(win('a').locator('.win-rh[data-edge="se"]'), 60, 40);
  await page.keyboard.press('Escape'); await page.mouse.up();
  assert.deepEqual(await win('a').boundingBox(), restored, 'Escape cancels outline resize');
  await page.evaluate(() => document.querySelector('[data-win-layer]').addEventListener('pointerdown', e => { window.resizePointer = e.pointerId; }, { once: true, capture: true }));
  const cancelURL = page.url();
  await drag(win('a').locator('.win-rh[data-edge="se"]'), 50, 30);
  await win('a').locator('.win-rh[data-edge="se"]').dispatchEvent('pointercancel', { pointerId: await page.evaluate(() => window.resizePointer), bubbles: true });
  await page.mouse.up();
  assert.deepEqual(await win('a').boundingBox(), restored, 'pointer cancellation discards frame preview');
  assert.equal(page.url(), cancelURL, 'pointer cancellation adds no history state');
  await win('a').evaluate(el => el.setAttribute('data-win-resize-mode', 'live'));
  await drag(win('a').locator('.win-rh[data-edge="se"]'), 40, 30);
  assert.ok((await win('a').boundingBox()).width > restored.width + 30, 'window can override outline mode with live resizing');
  await page.mouse.up();
  await win('a').evaluate(el => el.removeAttribute('data-win-resize-mode'));
  await page.evaluate(() => { pudlWindows.dock('a', 'left'); pudlWindows.dockMode('left', 'open'); });
  const dockBefore = await win('a').boundingBox();
  await drag(win('a').locator('.win-rh[data-edge="e"]'), 70, 0);
  assert.deepEqual(await win('a').boundingBox(), dockBefore, 'dock content stays fixed during outline resize');
  await page.mouse.up();
  assert.ok((await win('a').boundingBox()).width > dockBefore.width + 60);
  await page.evaluate(() => pudlWindows.dock('b', 'left', { group: 'main', position: 'after' }));
  const paneBefore = await win('a').boundingBox();
  await drag(page.locator('.win-dock-splitter'), 0, 50);
  assert.deepEqual(await win('a').boundingBox(), paneBefore, 'dock pane divider keeps content fixed');
  await page.mouse.up();
  assert.ok((await win('a').boundingBox()).height > paneBefore.height + 40);
  await start();
  await page.evaluate(() => { pudlWindows.snap('a', 'left'); pudlWindows.snap('b', 'right'); });
  const zoneBefore = await win('a').boundingBox();
  await drag(page.locator('.win-splitter').first(), 70, 0);
  assert.deepEqual(await win('a').boundingBox(), zoneBefore, 'tile content stays fixed');
  await page.mouse.up();
  assert.ok((await win('a').boundingBox()).width > zoneBefore.width + 60);
  const gridAfter = await win('a').boundingBox(), gridURL = page.url();
  await drag(page.locator('.win-splitter').first(), -40, 0);
  await page.keyboard.press('Escape'); await page.mouse.up();
  assert.deepEqual(await win('a').boundingBox(), gridAfter, 'Escape cancels a grid outline');
  assert.equal(page.url(), gridURL);
  for (const edge of ['left', 'right', 'top', 'bottom']) {
    await start();
    await page.evaluate(edge => { pudlWindows.dock('a', edge); pudlWindows.dockMode(edge, 'open'); pudlWindows.raise('a'); }, edge);
    const before = await win('a').boundingBox();
    const handle = { left: 'e', right: 'w', top: 's', bottom: 'n' }[edge];
    await drag(win('a').locator('.win-rh[data-edge="' + handle + '"]'), edge === 'left' ? 40 : edge === 'right' ? -40 : 0, edge === 'top' ? 40 : edge === 'bottom' ? -40 : 0);
    assert.deepEqual(await win('a').boundingBox(), before, edge + ' dock defers layout');
    await page.mouse.up();
    const after = await win('a').boundingBox();
    assert.ok((edge === 'left' || edge === 'right') ? after.width > before.width + 30 : after.height > before.height + 30, edge + ' dock commits ' + JSON.stringify({ before, after }));
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
