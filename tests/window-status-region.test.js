/* 0.95.2: the Window status popover keeps its rows in a named scroll region
   that is a tab stop, and a window that sets data-win-status-rows reserves
   that many rows so Dismiss does not move as rows change. */
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
    const popup = '.win-status-popover:popover-open';
    await win.locator('input').click();
    await win.evaluate(w => w.style.setProperty('--win-w', '.27'));
    await win.evaluate(w => { w.removeAttribute('data-win-running'); w.removeAttribute('data-win-state'); });
    /* A long title keeps the header compact however few statuses there are. */
    await p.evaluate(() => pudlWindows.retitle('status', 'A very long conversation title that keeps the status group folded '.repeat(3)));
    await p.waitForFunction(() => document.querySelector('.win-statuses').hasAttribute('data-win-status-compact'));

    /* Make the group hold exactly n application statuses. */
    const rowsTo = n => win.locator('.win-statuses').evaluate((group, n) => {
      const have = () => [...group.querySelectorAll(':scope > .win-status:not(.win-execution)')];
      while (have().length > n) have().pop().remove();
      while (have().length < n) { const s = document.createElement('span'); s.className = 'win-status'; s.textContent = 'Row ' + (have().length + 1); group.insertBefore(s, group.querySelector('.win-status-toggle')); }
    }, n).then(settle);
    const setRows = value => win.evaluate((w, value) => { if (value === null) w.removeAttribute('data-win-status-rows'); else w.setAttribute('data-win-status-rows', value); }, value);
    const open = async () => { await win.locator('.win-status-toggle').click(); await p.waitForSelector(popup); await settle(); };
    const close = async () => { await p.keyboard.press('Escape'); await p.waitForFunction(() => !document.querySelector('.win-status-popover:popover-open')); };
    const geometry = () => p.locator(popup).evaluate(panel => {
      const region = panel.querySelector('.win-status-rows'), dismiss = panel.querySelector(':scope > .btn');
      const box = panel.getBoundingClientRect();
      return { region: region.getBoundingClientRect().height, scrollable: region.scrollHeight > region.clientHeight + 1, dismissTop: dismiss.getBoundingClientRect().top - box.top, panelHeight: box.height, panelBottom: box.bottom, viewport: innerHeight, dismissBottom: dismiss.getBoundingClientRect().bottom };
    });
    async function scenario(name, action) {
      try { await action(); console.log('PASS ' + name); }
      catch (error) { failures++; console.error('FAIL ' + name, error); await p.keyboard.press('Escape').catch(() => {}); }
    }

    await scenario('the rows are in a named region that is a tab stop and takes focus on opening', async () => {
      await setRows(null); await rowsTo(2); await open();
      const info = await p.locator(popup + ' .win-status-rows').evaluate(r => ({ role: r.getAttribute('role'), name: r.getAttribute('aria-label'), tab: r.tabIndex, focused: document.activeElement === r }));
      assert.deepEqual(info, { role: 'region', name: 'Window status', tab: 0, focused: true });
      await close();
    });
    await scenario('the region keeps focus while rows change', async () => {
      await open();
      await rowsTo(4);
      assert.equal(await p.evaluate(() => document.activeElement.className), 'win-status-rows');
      await rowsTo(1);
      assert.equal(await p.evaluate(() => document.activeElement.className), 'win-status-rows');
      await close();
    });
    await scenario('Escape returns focus to the control that opened the popover', async () => {
      await win.locator('.win-status-toggle').focus(); await p.keyboard.press('Enter'); await p.waitForSelector(popup);
      await close();
      assert.equal(await p.evaluate(() => document.activeElement.classList.contains('win-status-toggle')), true);
    });
    await scenario('with a reservation Dismiss does not move as one to six rows change', async () => {
      await setRows('6'); await rowsTo(1); await open();
      const base = await geometry();
      for (const n of [2, 3, 6, 7, 9, 4, 1]) {
        await rowsTo(n);
        const g = await geometry();
        assert.equal(g.dismissTop, base.dismissTop, n + ' rows move Dismiss');
        assert.equal(g.region, base.region, n + ' rows change the region');
        assert.equal(g.scrollable, n > 6, n + ' rows scroll only beyond the reservation');
      }
      await close();
    });
    await scenario('the reservation counts the execution row', async () => {
      await win.evaluate(w => w.setAttribute('data-win-state', 'working'));
      await setRows('3'); await rowsTo(2); await open();
      assert.equal((await geometry()).scrollable, false, 'a state row and two statuses fit in three');
      await rowsTo(3);
      assert.equal((await geometry()).scrollable, true, 'a state row and three statuses are four rows');
      await close();
      await win.evaluate(w => w.removeAttribute('data-win-state'));
    });
    await scenario('rows beyond the reservation stay reachable', async () => {
      await setRows('2'); await rowsTo(8); await open();
      await p.locator(popup + ' .win-status-rows').evaluate(r => r.scrollTo(0, r.scrollHeight));
      assert.equal(await p.locator(popup + ' li').last().evaluate(li => { const r = li.getBoundingClientRect(), g = li.closest('.win-status-rows').getBoundingClientRect(); return r.bottom <= g.bottom + 1 && r.top >= g.top - 1; }), true, 'the last row can be scrolled into view');
      await close();
    });
    await scenario('the scroll position survives a row change and only clamps when content shrinks', async () => {
      await setRows('2'); await rowsTo(8); await open();
      await p.locator(popup + ' .win-status-rows').evaluate(r => { r.scrollTop = 30; });
      await win.locator('.win-status:not(.win-execution)').first().evaluate(s => { s.textContent = 'Changed'; });
      await settle();
      assert.equal(await p.locator(popup + ' .win-status-rows').evaluate(r => r.scrollTop), 30);
      await rowsTo(2);
      const clamped = await p.locator(popup + ' .win-status-rows').evaluate(r => ({ top: r.scrollTop, h: r.scrollHeight, c: r.clientHeight, n: r.querySelectorAll('li').length })); assert.equal(clamped.top, 0, 'clamped to the shorter content ' + JSON.stringify(clamped));
      await close();
    });
    await scenario('anything but a whole number from 1 to 6 is no reservation', async () => {
      await rowsTo(1);
      for (const value of ['0', '7', '-1', '3.5', ' 2', '2 ', '+2', '02', 'two', '']) {
        await setRows(value); await open();
        assert.equal(await p.locator(popup).evaluate(panel => panel.hasAttribute('data-win-status-rows')), false, JSON.stringify(value) + ' is not a reservation');
        await close();
      }
    });
    await scenario('enlarged text grows the reservation and keeps every row reachable', async () => {
      await setRows('3'); await rowsTo(3); await open();
      const normal = await geometry();
      await close();
      await p.evaluate(() => { document.documentElement.style.setProperty('--text-md', '28px'); }); await settle();
      await open();
      const big = await geometry();
      assert(big.region > normal.region, 'the reserved region grew with the text: ' + normal.region + ' to ' + big.region);
      await p.locator(popup + ' .win-status-rows').evaluate(r => r.scrollTo(0, r.scrollHeight));
      assert.equal(await p.locator(popup + ' li').last().evaluate(li => { const r = li.getBoundingClientRect(), g = li.closest('.win-status-rows').getBoundingClientRect(); return r.bottom <= g.bottom + 1; }), true);
      await close();
      await p.evaluate(() => { document.documentElement.style.removeProperty('--text-md'); });
    });
    await scenario('a short viewport keeps the popover and Dismiss on screen', async () => {
      await setRows('6'); await rowsTo(6); await p.setViewportSize({ width: 1400, height: 260 }); await settle();
      await open();
      const g = await geometry();
      assert(g.panelBottom <= g.viewport + 1, 'the popover fits the viewport: ' + JSON.stringify(g));
      assert(g.dismissBottom <= g.viewport + 1, 'Dismiss is on screen');
      await close();
      await p.setViewportSize({ width: 1400, height: 900 });
    });
    await scenario('changing, removing or breaking the reservation while open refreshes the popover', async () => {
      await rowsTo(2); await setRows('2'); await open();
      const g2 = await geometry();
      await setRows('4'); await settle();
      const g4 = await geometry();
      assert(g4.region > g2.region, 'a larger reservation grows the region: ' + g2.region + ' to ' + g4.region);
      await setRows('7'); await settle();
      assert.equal(await p.locator(popup).evaluate(panel => panel.hasAttribute('data-win-status-rows')), false, 'an invalid value ends the reservation');
      await setRows('3'); await settle();
      assert.equal(await p.locator(popup).evaluate(panel => panel.getAttribute('data-win-status-rows')), '3');
      await setRows(null); await settle();
      assert.equal(await p.locator(popup).evaluate(panel => panel.hasAttribute('data-win-status-rows')), false, 'removing the attribute ends the reservation');
      await close();
    });
    const LONG = 'A very long conversation title that keeps the status group folded '.repeat(3);
    const replacement = (title, rows) => '<section class="win" data-win="status"' + (rows ? ' data-win-status-rows="' + rows + '"' : '') + '><header class="win-head"><h2 class="win-title">' + title + '</h2><div class="win-statuses"><span class="win-status">Row 1</span></div></header><div class="win-body"><input class="form-input" aria-label="Note" value="x"></div></section>';
    await scenario('a whole replacement window brings its reservation to the open popover', async () => {
      await rowsTo(2); await setRows(null); await open();
      await p.evaluate(markup => pudlWindows.update('status', markup), replacement(LONG, 5));
      await settle();
      assert.equal(await win.getAttribute('data-win-status-rows'), '5', 'the window took the attribute');
      assert.equal(await p.locator(popup).evaluate(panel => panel.getAttribute('data-win-status-rows')), '5', 'the open popover shows it');
      await p.evaluate(markup => pudlWindows.update('status', markup), replacement(LONG, 0));
      await settle();
      assert.equal(await win.getAttribute('data-win-status-rows'), null, 'a replacement without it removes it');
      assert.equal(await p.locator(popup).evaluate(panel => panel.hasAttribute('data-win-status-rows')), false, 'the open popover drops it');
      await close();
    });
    await scenario('a replacement with a short title un-folds the chips, closing the popover and focusing the header', async () => {
      await setRows(null); await open();
      await p.evaluate(markup => pudlWindows.update('status', markup), replacement('Agent', 0));
      await p.evaluate(() => pudlWindows.retitle('status', 'Agent'));
      await p.waitForFunction(() => !document.querySelector('.win-status-popover:popover-open'));
      assert.equal(await win.locator('.win-head').evaluate(h => document.activeElement === h), true, 'focus returns to the header');
      /* Put the long title back for the scenarios after this one. */
      await p.evaluate(title => pudlWindows.retitle('status', title), LONG);
      await p.waitForFunction(() => document.querySelector('.win-statuses').hasAttribute('data-win-status-compact'));
    });
    /* The panel is a child of the window layer, which lets the pointer through. */
    await scenario('a real click on Dismiss closes the popover and does not reach the surface beneath', async () => {
      await setRows(null); await rowsTo(2); await open();
      await p.evaluate(() => { window.__hits = []; document.addEventListener('click', e => window.__hits.push(e.target.className || e.target.tagName), true); });
      const box = await p.locator(popup + ' > .btn').boundingBox();
      await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await p.waitForFunction(() => !document.querySelector('.win-status-popover:popover-open'));
      const hits = await p.evaluate(() => window.__hits);
      assert.deepEqual(hits.map(h => /btn/.test(h)), [true], 'only Dismiss received the click: ' + JSON.stringify(hits));
    });
    await scenario('the wheel scrolls the status rows and, at their ends, not the surface beneath', async () => {
      await setRows('2'); await rowsTo(8); await open();
      await p.evaluate(() => {
        let under = document.getElementById('underlay');
        if (!under) { under = document.createElement('div'); under.id = 'underlay'; under.style.cssText = 'position:fixed;inset:0;overflow:auto;z-index:0'; under.innerHTML = '<div style="height:6000px"></div>'; document.body.appendChild(under); }
        under.scrollTop = 0;
      });
      const box = await p.locator(popup + ' .win-status-rows').boundingBox();
      await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      const read = () => p.evaluate(() => ({ rows: document.querySelector('.win-status-popover:popover-open .win-status-rows').scrollTop, under: document.getElementById('underlay').scrollTop, page: scrollY }));
      await p.mouse.wheel(0, 30); await settle();
      let now = await read();
      assert(now.rows > 0, 'the wheel scrolled the rows');
      assert.equal(now.under + now.page, 0, 'the surface beneath did not scroll');
      for (let i = 0; i < 6; i++) await p.mouse.wheel(0, 400);
      await settle(); now = await read();
      const max = await p.locator(popup + ' .win-status-rows').evaluate(r => r.scrollHeight - r.clientHeight);
      assert(Math.abs(now.rows - max) <= 1, 'the rows reached their end');
      await p.mouse.wheel(0, 400); await settle(); now = await read();
      assert.equal(now.under + now.page, 0, 'the wheel at the end of the rows does not scroll the surface beneath');
      for (let i = 0; i < 8; i++) await p.mouse.wheel(0, -400);
      await settle(); now = await read();
      assert.equal(now.rows, 0, 'the rows scrolled back to the start');
      await p.mouse.wheel(0, -400); await settle(); now = await read();
      assert.equal(now.under + now.page, 0, 'the wheel at the start of the rows does not scroll the surface beneath');
      await close();
      await p.evaluate(() => document.getElementById('underlay').remove());
    });
    await scenario('the popover closes when no statuses remain and focus goes back to a showing control', async () => {
      await win.evaluate(w => { w.removeAttribute('data-win-state'); w.removeAttribute('data-win-running'); });
      await setRows(null); await rowsTo(2); await open();
      await win.locator('.win-statuses').evaluate(group => group.querySelectorAll(':scope > .win-status:not(.win-execution)').forEach(s => { s.hidden = true; }));
      await p.waitForFunction(() => !document.querySelector('.win-status-popover:popover-open'));
      assert.equal(await p.evaluate(() => document.activeElement !== document.body), true, 'focus is not dropped on the page');
    });
    assert.equal(failures, 0, 'every scenario must pass');
    assert.deepEqual(errors, [], 'no browser errors');
    console.log('ALL PASSED');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
