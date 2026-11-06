const assert = require('assert/strict');
const { launch, ROOT, out } = require('./lib');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(ROOT + '/samples/taskbar-pinning.html');
    await page.locator('.win-bar [data-win-pin="editor"]').waitFor();
    await page.evaluate(() => {
      const list = document.querySelector('[data-start-items]'), sample = list.querySelector('[data-win-pin-target]');
      for (const id of ['row-one', 'row-two', 'row-excluded', 'row-optout', 'row-failed', 'row-late']) {
        const row = sample.cloneNode(true);
        row.dataset.winPinTarget = id; row.dataset.winDestinationProvider = 'articles';
        if (id === 'row-optout') row.dataset.winPinnable = 'false';
        row.querySelector('.start-name').textContent = id;
        const link = row.querySelector('a'); link.removeAttribute('data-demo-open'); link.href = '/tests/fixtures/taskbar-provider-article.html?id=' + id;
        row.querySelector('[data-row-actions]').setAttribute('aria-label', 'Actions for ' + id);
        list.appendChild(row);
      }
      window.rowRequests = []; window.rowPending = {}; window.rowFail = true;
      window.rowProvider = { id: 'articles', resolve({ id, signal, scope }) {
        rowRequests.push({ id, scope });
        if (id === 'row-excluded') return { status: 'excluded' };
        if (id === 'row-failed' && rowFail) throw new Error('Temporary row failure');
        return new Promise(resolve => { rowPending[id] = { resolve, signal }; });
      } };
      window.rowResult = id => ({ status: 'available', destination: { id, label: id, href: '/tests/fixtures/taskbar-provider-article.html?id=' + id, glyph: 'file' } });
      pudlWindows.configureTaskbar({ providers: [rowProvider], pins: [], references: [], order: [], scope: 'guest' });
    });
    assert.deepEqual(await page.evaluate(() => rowRequests), [], 'catalog metadata does not enumerate providers');
    await page.evaluate(() => pudlLauncher.present(document.getElementById('host-launcher'), 'popup'));
    assert.deepEqual(await page.evaluate(() => rowRequests), [], 'opening the launcher does not enumerate providers');
    const row = id => page.locator('[data-win-pin-target="' + id + '"]');
    const menu = () => page.locator('.context-menu:popover-open');
    await row('row-one').hover();
    await row('row-one').locator('[data-row-actions]').click();
    const resolving = page.getByRole('menuitem', { name: 'Resolving destination', exact: true });
    await resolving.waitFor();
    assert.equal(await resolving.getAttribute('aria-disabled'), 'true');
    await page.evaluate(() => { window.focusedRow = document.activeElement; rowPending['row-one'].resolve(rowResult('row-one')); });
    await page.getByRole('menuitem', { name: 'Pin to taskbar', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => focusedRow === document.activeElement), true, 'resolution preserves the focused menu row');
    await page.keyboard.press('Enter');
    await page.locator('.win-bar [data-win-pin="row-one"]').waitFor();
    assert.deepEqual(await page.evaluate(() => rowRequests.map(r => r.id)), ['row-one']);
    assert.deepEqual(await page.evaluate(() => pudlWindows.state().open), [], 'pinning an unopened row does not open its window');
    assert.equal(await page.locator('#host-launcher').evaluate(node => node.matches(':popover-open')), true);
    await row('row-two').click({ button: 'right' });
    await resolving.waitFor();
    await page.evaluate(() => rowPending['row-two'].resolve(rowResult('row-two')));
    await page.getByRole('menuitem', { name: 'Pin to taskbar', exact: true }).click();
    assert.deepEqual(await page.evaluate(() => pudlWindows.taskbarState().references), [{ id: 'row-one', provider: 'articles' }, { id: 'row-two', provider: 'articles' }]);
    assert.deepEqual(await page.evaluate(() => rowRequests.map(r => r.id)), ['row-one', 'row-two'], 'pinning the first row does not suppress the next row lookup');
    await row('row-one').hover(); await row('row-one').locator('[data-row-actions]').click();
    await page.getByRole('menuitem', { name: 'Unpin from taskbar', exact: true }).click();
    assert.equal(await page.evaluate(() => rowRequests.length), 2, 'cached metadata is reused');
    await row('row-optout').click({ button: 'right' });
    assert.equal(await menu().count(), 0);
    assert.equal(await page.evaluate(() => rowRequests.some(r => r.id === 'row-optout')), false, 'explicit row exclusion performs no lookup');
    await row('row-excluded').hover(); await row('row-excluded').locator('[data-row-actions]').click();
    await page.waitForFunction(() => rowRequests.some(r => r.id === 'row-excluded'));
    await page.waitForFunction(() => !document.querySelector('.context-menu:popover-open'));
    assert.equal(await page.locator('#host-launcher').evaluate(node => node.matches(':popover-open')), true, 'resolver exclusion keeps the launcher open');
    await row('row-failed').hover(); await row('row-failed').locator('[data-row-actions]').click();
    await page.waitForFunction(() => rowRequests.some(r => r.id === 'row-failed'));
    assert.equal(await page.getByRole('menuitem', { name: 'Pin to taskbar', exact: true }).getAttribute('aria-disabled'), 'true');
    await page.evaluate(() => { rowFail = false; pudlWindows.refreshTaskbarDestinations({ ids: ['row-failed'] }); });
    await resolving.waitFor();
    await page.evaluate(() => rowPending['row-failed'].resolve(rowResult('row-failed')));
    await page.getByRole('menuitem', { name: 'Pin to taskbar', exact: true }).waitFor();
    await page.keyboard.press('Escape');
    await row('row-late').hover(); await row('row-late').locator('[data-row-actions]').click();
    await resolving.waitFor();
    await page.evaluate(() => {
      window.oldRow = rowPending['row-late'];
      pudlWindows.configureTaskbar({ providers: [{ id: 'articles', resolve: () => ({ status: 'forbidden' }) }], ...pudlWindows.taskbarState(), scope: 'account' });
      oldRow.resolve(rowResult('row-late'));
    });
    await page.waitForFunction(() => oldRow.signal.aborted);
    assert.equal(await page.getByRole('menuitem', { name: 'Pin to taskbar', exact: true }).getAttribute('aria-disabled'), 'true', 'stale row resolution cannot enable pinning after a principal change');
    await page.screenshot({ path: out('taskbar-provider-row-menu.png') });
    assert.deepEqual(errors, []);
    console.log('PASS unopened provider rows resolve lazily, update focused menus, save references, preserve popup, honor exclusions and reject stale principals');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
