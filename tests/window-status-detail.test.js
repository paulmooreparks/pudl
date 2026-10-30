/* 0.95.2: the Window status popover lists its rows plainly, and a window's
   state detail joins the visible state words in the name and tooltip of its
   execution marks without ever being drawn. */
const assert = require('assert/strict');
const { launch, ROOT } = require('./lib');

(async () => {
  const browser = await launch();
  let failures = 0;
  try {
    const p = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    const errors = [];
    p.on('pageerror', error => errors.push(error.message));
    await p.goto(ROOT + '/tests/fixtures/window-status.html');
    await p.waitForFunction(() => window.pudlWindows && document.querySelector('.win-status-toggle'));
    const win = p.locator('[data-win="status"]');
    const settle = () => p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
    const set = (name, value) => win.evaluate((w, [name, value]) => { if (value === null) w.removeAttribute(name); else w.setAttribute(name, value); }, [name, value]);
    const mark = () => win.locator('.win-head > .win-statuses > .win-execution > .win-state');
    const names = () => mark().evaluate(m => ({ label: m.getAttribute('aria-label'), title: m.getAttribute('title'), tip: m.getAttribute('data-tooltip'), words: m.querySelector('.win-state-words').textContent }));
    async function scenario(name, action) {
      try { await action(); console.log('PASS ' + name); }
      catch (error) { failures++; console.error('FAIL ' + name, error); }
    }

    await scenario('without a detail the name and tooltip are the visible words, as before', async () => {
      await set('data-win-state', 'waiting'); await set('data-win-state-label', 'Waiting for approval'); await settle();
      assert.deepEqual(await names(), { label: 'Waiting for approval', title: 'Waiting for approval', tip: 'Waiting for approval', words: 'Waiting for approval' });
    });
    await scenario('a detail joins the label in the name and tooltip and is never drawn', async () => {
      await set('data-win-state-detail', 'The plan edits three files'); await settle();
      assert.deepEqual(await names(), { label: 'Waiting for approval: The plan edits three files', title: 'Waiting for approval: The plan edits three files', tip: 'Waiting for approval: The plan edits three files', words: 'Waiting for approval' });
      assert.equal(await win.evaluate(w => w.textContent.includes('The plan edits three files')), false, 'the detail is not in the window text');
    });
    await scenario('a blank detail changes nothing', async () => {
      await set('data-win-state-detail', '   '); await settle();
      assert.equal((await names()).label, 'Waiting for approval');
      await set('data-win-state-detail', ''); await settle();
      assert.equal((await names()).label, 'Waiting for approval');
    });
    await scenario('with no label the default word joins the detail', async () => {
      await set('data-win-state-label', null); await set('data-win-state-detail', ' Needs a decision '); await settle();
      assert.deepEqual(await names(), { label: 'Waiting: Needs a decision', title: 'Waiting: Needs a decision', tip: 'Waiting: Needs a decision', words: 'Waiting' });
    });
    await scenario('removing the detail restores the plain name', async () => {
      await set('data-win-state-detail', null); await settle();
      assert.equal((await names()).label, 'Waiting');
    });
    await scenario('a window with no state still has no mark name', async () => {
      await set('data-win-state-detail', 'Left over'); await set('data-win-state', null); await settle();
      assert.equal((await names()).label, '');
      await set('data-win-state-detail', null);
    });
    await scenario('the popover list has no bullets and no start indent', async () => {
      await set('data-win-state', 'working'); await settle();
      await win.locator('input').click();
      await win.evaluate(w => w.style.setProperty('--win-w', '.27')); await settle();
      await p.waitForFunction(() => document.querySelector('.win-statuses').hasAttribute('data-win-status-compact'));
      await win.locator('.win-status-toggle').click();
      await p.waitForSelector('.win-status-popover:popover-open');
      const list = await p.locator('.win-status-popover:popover-open ul').evaluate(ul => { const c = getComputedStyle(ul), li = getComputedStyle(ul.querySelector('li')); return { type: c.listStyleType, pad: c.paddingInlineStart, role: ul.getAttribute('role'), marker: li.listStyleType }; });
      assert.equal(list.type, 'none');
      assert.equal(list.pad, '0px');
      assert.equal(list.role, 'list');
      assert.equal(list.marker, 'none', 'rows draw no marker');
      const [rowLeft, panelLeft] = await p.locator('.win-status-popover:popover-open').evaluate(panel => [panel.querySelector('li').getBoundingClientRect().left - panel.getBoundingClientRect().left, parseFloat(getComputedStyle(panel).paddingLeft) + 1]);
      assert(rowLeft <= panelLeft + 4, 'rows start at the popover padding, not indented: ' + rowLeft + ' vs ' + panelLeft);
      await p.keyboard.press('Escape');
    });
    await scenario('the detail reaches the popover row mark', async () => {
      await set('data-win-state', 'stuck'); await set('data-win-state-label', 'Stuck'); await set('data-win-state-detail', 'No network'); await settle();
      await win.locator('.win-status-toggle').click();
      await p.waitForSelector('.win-status-popover:popover-open');
      assert.equal(await p.locator('.win-status-popover:popover-open .win-execution-row .win-state').getAttribute('aria-label'), 'Stuck: No network');
      await p.keyboard.press('Escape');
    });
    await scenario('taskbar entries and stack rows keep their context and carry the detail, and a stack carries counts only', async () => {
      const t = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
      await t.goto(ROOT + '/tests/fixtures/taskbar-stacks-full.html');
      await t.waitForFunction(() => window.pudlWindows && pudlWindows.state().open.includes('child'));
      const tick = () => t.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
      await t.evaluate(() => { const w = document.querySelector('[data-win="u1"]'); w.setAttribute('data-win-state', 'waiting'); w.setAttribute('data-win-state-label', 'Waiting for approval'); w.setAttribute('data-win-state-detail', 'The plan edits three files'); w.setAttribute('data-win-attention', '2'); });
      await tick();
      const tab = t.locator('#probe > [data-win-tab="u1"]');
      const name = await tab.getAttribute('aria-label');
      assert(name.includes('Independent first long document title'), 'the window title stays: ' + name);
      assert(name.includes('2 needing attention'), 'the count stays: ' + name);
      assert(name.includes('Waiting for approval: The plan edits three files'), 'the state and detail join: ' + name);
      assert((await tab.getAttribute('title')).includes('Waiting for approval: The plan edits three files'));
      assert.equal(await tab.locator('.win-state').getAttribute('aria-label'), 'Waiting for approval: The plan edits three files');
      await t.evaluate(() => { document.getElementById('probe-bar').style.width = '560px'; document.querySelector('[data-win="a1"]').setAttribute('data-win-state', 'working'); document.querySelector('[data-win="a1"]').setAttribute('data-win-state-detail', 'Reading the repository'); });
      await tick();
      const stack = t.locator('#probe').getByRole('button', { name: /^Atlas,/ });
      assert.equal(await stack.count(), 1);
      assert.equal((await stack.getAttribute('aria-label')).includes('Reading the repository'), false, 'a stack carries counts, not an individual detail: ' + await stack.getAttribute('aria-label'));
      await stack.focus(); await t.keyboard.press('Enter');
      const row = t.locator('.win-stack-row [data-win-tab="a1"]');
      await row.waitFor();
      assert((await row.getAttribute('aria-label')).includes('working'.charAt(0).toUpperCase() + 'orking: Reading the repository'), 'the stack row for one window carries its detail: ' + await row.getAttribute('aria-label'));
      await t.close();
    });
    assert.equal(failures, 0, 'every scenario must pass');
    assert.deepEqual(errors, [], 'no browser errors');
    console.log('ALL PASSED');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
