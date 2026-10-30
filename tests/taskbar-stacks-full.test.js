const assert = require('assert/strict');
const { launch, ROOT } = require('./lib');

(async () => {
  const browser = await launch();
  let failures = 0;
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const fixture = ROOT + '/tests/fixtures/taskbar-stacks-full.html';
    const roots = ['a1', 'b1', 'a2', 'b2', 'a3', 'u1', 'u2'];
    const state = () => page.evaluate(() => pudlWindows.state());
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
    const stack = (dock = '#probe') => page.locator(dock).getByRole('button', { name: /^Atlas,/ });
    const popup = () => page.getByRole('dialog', { name: 'Atlas', exact: true });
    async function width(value, id = 'probe-bar') {
      await page.evaluate(({ id, value }) => { document.getElementById(id).style.width = value + 'px'; }, { id, value });
      await settle();
    }
    async function mode(value) {
      await page.evaluate(value => {
        const layer = document.querySelector('[data-win-layer]');
        if (value) layer.setAttribute('data-win-taskbar-stacks', value);
        else layer.removeAttribute('data-win-taskbar-stacks');
      }, value);
      await settle();
    }
    async function load() {
      await page.goto(fixture);
      await page.waitForFunction(() => window.pudlWindows && pudlWindows.state().open.includes('child'));
      await settle();
    }
    const moreVisible = () => page.locator('#probe-bar .win-bar-more').isVisible();
    async function scenario(name, action) {
      try { await load(); await action(); console.log('PASS ' + name); }
      catch (error) { failures++; console.error('FAIL ' + name, error); }
    }
    // The existing separate-button layout provides an independent fit boundary.
    await load();
    await mode(null);
    let low = 350, high = 1250;
    while (high - low > 1) {
      const middle = Math.floor((low + high) / 2);
      await width(middle);
      if (await moreVisible()) low = middle; else high = middle;
    }
    const threshold = high;
    await width(threshold + 20);
    const gap = await page.locator('#probe').evaluate(node => parseFloat(getComputedStyle(node).columnGap) || 0);
    const reserve = 120 + gap;

    await scenario('full starts separate when ordinary buttons fit', async () => {
      assert.equal(await stack().count(), 0);
      assert.deepEqual(await page.locator('#probe > [data-win-tab]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-win-tab'))), roots);
    });
    await scenario('full stacks every eligible group before More independently per dock', async () => {
      const before = await state(), address = page.url();
      await width(threshold - 8);
      assert.equal(await stack().count(), 1, 'group-open is ignored in full mode');
      assert.equal(await page.locator('#probe').getByRole('button', { name: /^Beacon,/ }).count(), 1);
      assert.equal(await moreVisible(), false);
      assert.equal(await stack('#wide').count(), 0);
      assert.deepEqual(await state(), before);
      assert.equal(page.url(), address);
    });
    await scenario('return threshold requires one ordinary minimum width plus a gap', async () => {
      await width(threshold - 8);
      assert.equal(await stack().count(), 1);
      for (const value of [threshold + 8, threshold - 4, threshold + reserve - 8]) {
        await width(value); assert.equal(await stack().count(), 1);
      }
      await width(threshold + reserve + 8);
      assert.equal(await stack().count(), 0);
      await width(threshold + 8);
      assert.equal(await stack().count(), 0, 'a fresh fitting separate projection stays separate inside hysteresis');
    });
    await scenario('pinned popup defers widening until its last nested menu closes', async () => {
      await width(threshold - 8);
      await stack().focus(); await page.keyboard.press('Enter');
      await popup().getByRole('link').first().click({ button: 'right' });
      await width(threshold + reserve + 40);
      assert.equal(await stack().count(), 1);
      assert.equal(await popup().isVisible(), true);
      await page.keyboard.press('Escape');
      assert.equal(await stack().count(), 1, 'closing a nested menu does not end the pinned interaction');
      await page.keyboard.press('Escape');
      await settle();
      assert.equal(await stack().count(), 0, 'pending fit runs even without another width change');
      assert.equal(await page.evaluate(() => document.activeElement !== document.body), true);
    });
    await scenario('pending width is measured again rather than replayed on dismissal', async () => {
      await width(threshold - 8);
      await stack().focus(); await page.keyboard.press('Enter');
      await width(threshold + reserve + 40);
      await width(threshold - 16);
      await page.keyboard.press('Escape'); await settle();
      assert.equal(await stack().count(), 1);
    });
    await scenario('an ordinary owned menu defers narrowing and unrelated menus do not', async () => {
      await page.locator('#probe > [data-win-tab="a1"]').click({ button: 'right' });
      await width(threshold - 8);
      assert.equal(await stack().count(), 0);
      await page.keyboard.press('Escape'); await settle();
      assert.equal(await stack().count(), 1);
      await width(1250);
      await page.evaluate(() => {
        const owner = document.querySelector('#outside');
        pudlMenu.openAt(100, 100, [{ label: 'Unrelated action', run() {} }], { owner, for: owner });
      });
      await width(threshold - 8);
      assert.equal(await stack().count(), 1);
    });
    await scenario('filtered docks use their own represented roots at the threshold', async () => {
      await page.evaluate(() => pudlWindows.dock('a3', 'left'));
      await width(threshold - 8, 'filtered-bar');
      await width(threshold - 8);
      assert.equal(await stack().count(), 1);
      assert.equal(await stack('#filtered').count(), 0, 'omitting one long root leaves room for separate buttons');
      assert.deepEqual(await page.evaluate(() => pudlWindows.group('alpha', document.querySelector('#filtered'))), ['a1', 'a2']);
      await width(400, 'filtered-bar');
      assert.equal(await stack('#filtered').count(), 1);
      assert.match(await stack('#filtered').getAttribute('aria-label'), /2 windows/);
    });
    await scenario('stacks that still do not fit retain existing More behavior', async () => {
      await width(230);
      assert.equal(await stack().count(), 1);
      assert.equal(await moreVisible(), true);
      assert.equal(await stack().isVisible(), true, 'the active child keeps its root stack visible');
      const more = page.locator('#probe-bar .win-bar-more');
      await more.click();
      assert.equal(await page.getByRole('menu').first().isVisible(), true);
    });
    await scenario('Arrange cancellation releases a pending projection without history', async () => {
      const before = await state();
      const history = await page.evaluate(() => window.history.length);
      assert.equal(await page.evaluate(() => pudlWindows.arrangeTaskbar(document.querySelector('#probe'))), true);
      await page.getByRole('dialog', { name: 'Arrange taskbar', exact: true }).waitFor();
      await width(threshold - 8);
      assert.equal(await stack().count(), 0);
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await settle();
      assert.equal(await stack().count(), 1);
      assert.deepEqual(await state(), before);
      assert.equal(await page.evaluate(() => window.history.length), history);
    });
    await scenario('RTL full projection preserves canonical order and hysteresis', async () => {
      await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
      await width(threshold - 8);
      assert.equal(await stack().count(), 1);
      assert.deepEqual((await state()).taskbarOrder, roots);
      await width(threshold + 8);
      assert.equal(await stack().count(), 1);
      await width(threshold + reserve + 8);
      assert.equal(await stack().count(), 0);
    });
    await scenario('non-bar mirrors keep separate root links in full mode', async () => {
      await width(threshold - 8);
      assert.equal(await stack().count(), 1);
      assert.deepEqual(await page.locator('#mirror > [data-win-tab]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-win-tab'))), roots);
      assert.equal(await page.locator('#mirror > [data-win-stack]').count(), 0);
    });
    await scenario('an unrelated menu does not hold a dock projection', async () => {
      await page.evaluate(() => {
        const owner = document.querySelector('#outside');
        pudlMenu.openAt(100, 100, [{ label: 'Unrelated action', run() {} }], { owner, for: owner });
      });
      await width(threshold - 8);
      assert.equal(await stack().count(), 1);
      assert.equal(await page.getByRole('menuitem', { name: 'Unrelated action', exact: true }).isVisible(), true);
    });
    await scenario('title changes invalidate the ordinary measurement without a resize', async () => {
      await width(threshold - 8);
      assert.equal(await stack().count(), 1);
      await page.evaluate(keys => keys.forEach((key, index) => pudlWindows.retitle(key, 'W' + index)), roots);
      await settle();
      assert.equal(await stack().count(), 0, 'short separate titles fit with the required reserve');
      await page.evaluate(keys => keys.forEach(key => pudlWindows.retitle(key, 'A sufficiently long window title for ' + key)), roots);
      await settle();
      assert.equal(await stack().count(), 1, 'long separate titles cross the entry threshold again');
    });
    assert.equal(failures, 0, 'full-mode scenarios must pass');
    assert.deepEqual(errors, [], 'no browser errors');
    console.log('ALL PASSED');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
