const assert = require('assert/strict');
const { launch, ROOT } = require('./lib');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(ROOT + '/samples/taskbar-pinning.html');
    const pin = page.locator('.win-bar [data-win-pin="editor"]');
    await pin.click();
    await page.waitForSelector('.win[data-win="editor"]');
    const commands = () => page.evaluate(() => pudlWindows.menuCommands('editor').map(c => c.id));
    assert.ok((await commands()).includes('taskbar-unpin'));
    await pin.click({ button: 'right' });
    assert.ok(await page.getByRole('menuitem', { name: 'Maximize', exact: true }).isVisible());
    await page.getByRole('menuitem', { name: 'Unpin from taskbar', exact: true }).click();
    assert.ok((await commands()).includes('taskbar-pin'));
    assert.equal(await page.locator('.win[data-win="editor"]').count(), 1);
    const menuButton = page.locator('.win[data-win="editor"] .win-head [data-win-action="menu"]');
    await menuButton.click();
    await page.locator('.win-menu:popover-open [data-win-cmd="taskbar-pin"]').click();
    assert.ok((await commands()).includes('taskbar-unpin'));
    await page.evaluate(() => pudlWindows.menuCommands('editor').find(c => c.id === 'taskbar-unpin').run());
    assert.equal(await pin.count(), 0);
    assert.equal(await page.evaluate(() => pudlWindows.state().top), 'editor');
    await page.locator('.win-bar [data-win-tab="editor"]').focus();
    await page.keyboard.press('Shift+F10');
    await page.getByRole('menuitem', { name: 'Pin to taskbar', exact: true }).click();
    assert.equal(await pin.count(), 1);
    await page.locator('[data-menu-id="window"]').click();
    await page.getByRole('menuitem', { name: 'Unpin from taskbar', exact: true }).click();
    assert.equal(await pin.count(), 0, 'active Window menu shares destination membership');
    assert.equal(await page.evaluate(() => pudlWindows.state().top), 'editor');
    await page.evaluate(() => pudlWindows.pinTaskbar('editor', true));

    // Intercept host requests before the sample's synchronous adapter.
    await page.evaluate(() => {
      window.requests = []; window.completions = [];
      const layer = document.querySelector('[data-win-layer]');
      layer.addEventListener('pudl:taskbar-activate', e => {
        e.stopImmediatePropagation(); e.preventDefault();
        requests.push({ id: e.detail.id, action: e.detail.action });
        e.detail.waitUntil(new Promise((resolve, reject) => { window.finish = resolve; window.fail = reject; }));
        window.lateWait = e.detail.waitUntil;
      }, true);
      layer.addEventListener('pudl:taskbar-activation-end', e => completions.push({ action: e.detail.action, status: e.detail.status }));
      pudlWindows.configureTaskbar({ destinations: [{ id: 'editor', label: 'Editor', newWindow: true }], pins: ['editor'] });
    });
    await pin.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'New window', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[data-win-pin="editor"]').getAttribute('aria-busy') === 'true');
    await page.evaluate(() => {
      const c = pudlWindows.menuCommands('editor').find(c => c.id === 'taskbar-new');
      if (!c.disabled) throw Error('New window should be pending');
      c.run();
    });
    assert.equal(await page.evaluate(() => requests.length), 1);
    // A busy creation request must not disable an existing instance.
    await page.evaluate(() => pudlWindows.minimize('editor'));
    await pin.click();
    assert.equal(await page.evaluate(() => !!pudlWindows.state().min.editor), false);
    await page.evaluate(() => fail(new Error('Simulated load failure')));
    await page.waitForFunction(() => completions.length === 1);
    assert.deepEqual(await page.evaluate(() => completions), [{ action: 'new', status: 'failed' }]);
    assert.equal(await pin.getAttribute('aria-busy'), 'false');
    assert.equal(await page.evaluate(() => { try { lateWait(Promise.resolve()); return false; } catch (_) { return true; } }), true);
    await page.evaluate(() => pudlWindows.close('editor'));
    await pin.click(); await pin.click({ force: true });
    assert.equal(await page.evaluate(() => requests.length), 2, 'repeated dormant clicks share pending activation');
    await page.evaluate(() => finish());
    await page.waitForFunction(() => completions.length === 2);
    await pin.click();
    assert.equal(await page.evaluate(() => requests.length), 3, 'settled request permits retry');
    await page.evaluate(() => finish());
    await page.waitForFunction(() => completions.length === 3);
    await page.evaluate(() => pudlWindows.configureTaskbar({ destinations: [{ id: 'editor', label: 'Editor', disabled: true }], pins: ['editor'] }));
    await pin.click({ button: 'right', force: true });
    assert.equal(await page.getByRole('menuitem', { name: 'Open', exact: true }).getAttribute('aria-disabled'), 'true');
    await page.getByRole('menuitem', { name: 'Unpin from taskbar', exact: true }).click();
    assert.equal(await pin.count(), 0);
    let releaseFragment;
    await page.route('**/samples/taskbar-pinning.html', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace('data-win-src="#study-{key}"', 'data-win-src="/pin-test/{key}"') });
    });
    await page.route('**/pin-test/*', async route => {
      const key = new URL(route.request().url()).pathname.split('/').at(-1);
      if (key === 'delayed') await new Promise(resolve => { releaseFragment = resolve; });
      await route.fulfill({ contentType: 'text/html', body: '<section class="win" data-win="' + key + '"><header class="win-head"><h2 class="win-title">Test window</h2></header><div class="win-body"><input aria-label="Test input"></div></section>' });
    });
    await page.goto(ROOT + '/samples/taskbar-pinning.html');
    await page.evaluate(() => { pudlWindows.open('calculator'); pudlWindows.open('meeting-notes'); });
    await page.waitForSelector('.win[data-win="meeting-notes"]');
    await page.waitForSelector('.win[data-win="calculator"]');
    await page.evaluate(() => pudlWindows.raise('calculator'));
    const requested = page.waitForRequest('**/pin-test/delayed');
    await page.evaluate(() => { pudlWindows.open('delayed'); });
    await requested;
    await page.evaluate(() => pudlWindows.raise('calculator'));
    await page.locator('.win[data-win="calculator"] .win-body').focus();
    releaseFragment();
    await page.waitForSelector('.win[data-win="delayed"]');
    assert.equal(await page.evaluate(() => pudlWindows.state().top), 'calculator', 'late fragment cannot replace intervening activation');
    assert.equal(await page.evaluate(() => document.activeElement.closest('[data-win]').dataset.win), 'calculator');
    assert.deepEqual(errors, []);
    console.log('PASS shared pin commands, running/dormant menus, keyboard access, pending requests, failure/retry and unavailable unpin');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
