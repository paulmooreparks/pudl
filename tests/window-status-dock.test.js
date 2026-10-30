/* 0.95.2: a Window status popover opened from a shared dock, where the
   window's own header is hidden, still follows the window's status: detail,
   rows and reservation changes show live, and clearing every status closes
   it with focus on the dock tab. */
const assert = require('assert/strict');
const { launch, ROOT } = require('./lib');

(async () => {
  const browser = await launch();
  let failures = 0;
  try {
    const p = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    const errors = [];
    p.on('pageerror', error => errors.push(error.message));
    await p.goto(ROOT + '/tests/fixtures/window-status.html?shared=1');
    await p.waitForFunction(() => window.pudlWindows && document.querySelector('.win-status-toggle'));
    const settle = () => p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
    const popup = '.win-status-popover:popover-open';
    const win = p.locator('[data-win="status"]');
    await p.evaluate(() => {
      const w = document.querySelector('[data-win="status"]');
      w.removeAttribute('data-win-running');
      w.setAttribute('data-win-state', 'waiting');
      w.setAttribute('data-win-state-detail', 'Before');
      w.setAttribute('data-win-status-rows', '2');
      pudlWindows.dock('status', 'left');
    });
    await p.waitForFunction(() => !document.querySelector('[data-win="status"] .win-head').getClientRects().length);
    const set = (name, value) => win.evaluate((w, [name, value]) => { if (value === null) w.removeAttribute(name); else w.setAttribute(name, value); }, [name, value]);
    const rowsTo = n => win.locator('.win-statuses').evaluate((group, n) => {
      const have = () => [...group.querySelectorAll(':scope > .win-status:not(.win-execution)')];
      while (have().length > n) have().pop().remove();
      while (have().length < n) { const s = document.createElement('span'); s.className = 'win-status'; s.textContent = 'Row ' + (have().length + 1); group.insertBefore(s, group.querySelector('.win-status-toggle')); }
    }, n).then(settle);
    async function scenario(name, action) {
      try { await action(); console.log('PASS ' + name); }
      catch (error) { failures++; console.error('FAIL ' + name, error); }
    }
    const region = () => p.locator(popup + ' .win-status-rows');

    await scenario('the Window status command opens the popover with the header hidden', async () => {
      await rowsTo(2);
      await p.locator('[data-dock-key="status"]').click({ button: 'right' });
      await p.locator('.context-menu:popover-open').getByRole('menuitem', { name: 'Window status', exact: true }).click();
      await p.waitForSelector(popup);
      assert.equal(await region().evaluate(r => document.activeElement === r), true, 'focus is on the region');
    });
    await scenario('a detail change shows in the open popover and keeps the region and focus', async () => {
      await region().evaluate(r => { r.id = 'kept-region'; });
      await set('data-win-state-detail', 'After'); await settle();
      assert.equal(await p.locator(popup + ' .win-state').getAttribute('aria-label'), 'Waiting: After');
      assert.equal(await p.evaluate(() => document.activeElement.id), 'kept-region', 'the same region keeps focus');
    });
    await scenario('application rows added and removed show live', async () => {
      await rowsTo(4);
      assert.equal(await p.locator(popup + ' li').count(), 5, 'state row and four statuses');
      await rowsTo(1);
      assert.equal(await p.locator(popup + ' li').count(), 2);
    });
    await scenario('reservation changes show live', async () => {
      const before = await region().evaluate(r => r.getBoundingClientRect().height);
      await set('data-win-status-rows', '5'); await settle();
      const after = await region().evaluate(r => r.getBoundingClientRect().height);
      assert(after > before, 'a larger reservation grows the region: ' + before + ' to ' + after);
      await set('data-win-status-rows', 'x'); await settle();
      assert.equal(await p.locator(popup).evaluate(panel => panel.hasAttribute('data-win-status-rows')), false);
      await set('data-win-status-rows', '2'); await settle();
    });
    await scenario('scroll position survives live changes', async () => {
      await rowsTo(9);
      await region().evaluate(r => { r.scrollTop = 20; });
      await win.locator('.win-statuses > .win-status:not(.win-execution)').first().evaluate(s => { s.textContent = 'Changed'; });
      await settle();
      assert.equal(await region().evaluate(r => r.scrollTop), 20);
      await rowsTo(1);
    });
    await scenario('clearing every status closes the popover and returns focus to the dock tab', async () => {
      await set('data-win-state', null); await set('data-win-state-detail', null);
      await win.locator('.win-statuses').evaluate(group => group.querySelectorAll(':scope > .win-status:not(.win-execution)').forEach(s => s.remove()));
      await p.waitForFunction(() => !document.querySelector('.win-status-popover:popover-open'));
      assert.equal(await p.evaluate(() => { const a = document.activeElement; return a !== document.body && (a.hasAttribute('data-dock-key') || !!a.closest('[data-dock-key]')); }), true, 'focus is on the dock tab, not dropped');
    });
    assert.equal(failures, 0, 'every scenario must pass');
    assert.deepEqual(errors, [], 'no browser errors');
    console.log('ALL PASSED');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
