const assert = require('assert/strict');
const { launch, ROOT, out } = require('./lib');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(ROOT + '/samples/taskbar-pinning.html');
    await page.locator('.win-bar [data-win-pin="editor"]').waitFor();
    await page.evaluate(async () => { await pudlWindows.open('editor'); pudlWindows.pinTaskbar('editor', false); });
    const menu = () => page.locator('.context-menu:popover-open');
    const entries = () => menu().evaluate(node => Array.from(node.children).map(child => child.matches('hr') ? '|' : child.querySelector('.menubar-words')?.textContent.trim()).filter(Boolean));
    const openMenu = async locator => { await locator.click({ button: 'right' }); await menu().waitFor(); return entries(); };
    const normalized = values => values.map(value => value === 'Unpin from taskbar' ? 'Pin to taskbar' : value);
    const normal = () => page.locator('.win-bar [data-win-tab="editor"]');
    const pin = () => page.locator('.win-bar [data-win-pin="editor"]');
    const unpinned = await openMenu(normal());
    await page.getByRole('menuitem', { name: 'Pin to taskbar', exact: true }).click();
    const pinned = await openMenu(pin());
    assert.deepEqual(normalized(pinned), normalized(unpinned), 'pinning preserves ordered labels and separator groups');
    assert.equal(pinned[0], 'Taskbar order');
    assert.equal(pinned.at(-1), 'Close');
    await page.evaluate(() => pudlWindows.minimize('editor'));
    await page.getByRole('menuitem', { name: 'Restore', exact: true }).waitFor();
    const livePin = await entries();
    assert.equal(livePin[0], 'Taskbar order'); assert.equal(livePin.at(-1), 'Close');
    await page.getByRole('menuitem', { name: 'Unpin from taskbar', exact: true }).click();
    await openMenu(normal());
    await page.evaluate(() => pudlWindows.raise('editor'));
    await page.getByRole('menuitem', { name: 'Minimize', exact: true }).waitFor();
    assert.deepEqual(normalized(await entries()), normalized(unpinned), 'ordinary live refresh uses the same composition');
    await page.keyboard.press('Escape');
    await page.evaluate(() => { pudlWindows.pinTaskbar('editor', true); pudlWindows.close('editor'); });
    const dormant = await openMenu(pin());
    assert.equal(dormant[0], 'Taskbar order');
    assert.ok(dormant.indexOf('Unpin from taskbar') < dormant.indexOf('Open'), 'taskbar controls stay in the leading group');
    await page.evaluate(() => {
      window.orderDestinations = [{ id: 'editor', label: 'Editor', glyph: 'pencil', newWindow: true, newWindowDisabled: true }, { id: 'meeting-notes', label: 'Meeting notes', glyph: 'file' }, { id: 'calculator', label: 'Calculator', glyph: 'app' }];
      pudlWindows.configureTaskbar({ destinations: orderDestinations });
    });
    assert.equal(await page.getByRole('menuitem', { name: 'New window', exact: true }).getAttribute('aria-disabled'), 'true');
    assert.deepEqual(await entries(), dormant, 'dormant live refresh preserves order and separators');
    await page.keyboard.press('Escape');
    await page.evaluate(async () => {
      orderDestinations[0].newWindowDisabled = false; pudlWindows.configureTaskbar({ destinations: orderDestinations });
      await pudlWindows.open('editor'); await pudlWindows.open('editor-copy');
      for (const key of ['editor', 'editor-copy']) {
        const win = document.querySelector('[data-win="' + key + '"]'); win.dataset.winGroup = 'editors'; win.dataset.winGroupLabel = 'Editors';
      }
      document.querySelector('[data-win-layer]').dataset.winTaskbarStacks = 'always';
      pudlWindows.pinTaskbar('editor', false);
    });
    const stack = page.locator('.win-bar [data-win-stack="editors"]');
    await stack.waitFor();
    const ordinaryStack = await openMenu(stack);
    assert.equal(ordinaryStack[0], 'Taskbar order');
    assert.ok(ordinaryStack.at(-1).startsWith('Close these'));
    await page.evaluate(() => pudlWindows.minimize('editor-copy'));
    assert.deepEqual(await entries(), ordinaryStack, 'ordinary stack live refresh preserves groups');
    await page.keyboard.press('Escape');
    await page.evaluate(() => pudlWindows.pinTaskbar('editor', true));
    const pinnedStack = await openMenu(pin());
    assert.equal(pinnedStack[0], 'Taskbar order');
    assert.ok(pinnedStack.at(-1).startsWith('Close these'));
    assert.deepEqual(pinnedStack.filter(x => !['New window', 'Unpin from taskbar'].includes(x)), ordinaryStack, 'stack membership adds only its destination commands to the leading group');
    await page.evaluate(() => pudlWindows.minimize('editor'));
    assert.deepEqual(await entries(), pinnedStack, 'pinned stack live refresh uses the same ordering');
    await page.screenshot({ path: out('taskbar-menu-order-stack.png') });
    await page.keyboard.press('Escape');
    await pin().focus(); await page.keyboard.press('ArrowDown');
    await page.locator('.win-stack-panel:popover-open').waitFor();
    await page.locator('.win-stack-panel [data-win-stack-row][data-win-tab="editor"]').click({ button: 'right' });
    const instance = await entries();
    assert.equal(instance[0], 'Taskbar order'); assert.equal(instance.at(-1), 'Close');
    assert.deepEqual(errors, []);
    console.log('PASS taskbar command order and separators across pin membership, dormant entries, ordinary/pinned stacks, instance menus and live refresh');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
