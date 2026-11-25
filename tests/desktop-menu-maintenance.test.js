'use strict';
const assert = require('node:assert/strict');
const { launch, ROOT, out } = require('./lib');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const load = async () => {
      await page.goto(ROOT + '/tests/fixtures/desktop-menu-maintenance.html');
      await page.waitForSelector('.menubar-title');
    };
    const title = () => page.locator('.menubar-title[data-menu-id="site"]');
    const root = () => page.locator('#menubar-panel');
    const expanded = () => page.locator('.menubar-title[aria-expanded="true"], .menubar-glyph[aria-expanded="true"], .menubar-panel [aria-expanded="true"]').count();
    await load();
    for (const mode of ['escape', 'outside', 'programmatic', 'other']) {
      await title().click(); await root().waitFor({ state: 'visible' });
      if (mode === 'escape') await page.keyboard.press('Escape');
      else if (mode === 'outside') await page.locator('#outside').click();
      else if (mode === 'programmatic') await root().evaluate(n => n.hidePopover());
      else { await page.locator('.menubar-title[data-menu-id="other"]').click(); await page.keyboard.press('Escape'); }
      await page.waitForFunction(() => !pudlMenubar.isOpen());
      assert.equal(await expanded(), 0, mode + ' clears expansion');
      await title().click(); assert.equal(await root().isVisible(), true, mode + ' reopens on first activation');
      await page.keyboard.press('Escape');
    }
    console.log('PASS every root close path clears expansion and permits first-click reopening');
    await title().click();
    const unavailable = root().getByRole('menuitem', { name: /^Unavailable/ });
    assert.equal(await unavailable.getAttribute('title'), 'Connect first');
    assert.equal(await unavailable.locator('.menubar-detail').textContent(), 'Connection settings');
    const description = await unavailable.getAttribute('aria-describedby');
    assert.equal(await page.locator('#' + description).textContent(), 'Connect first');
    assert.equal(await page.locator('#' + description).getAttribute('class'), 'visually-hidden');
    assert.equal(await root().getByRole('menuitem', { name: /^Inline reason/ }).locator('.menubar-detail').textContent(), 'Local policy');
    assert.equal(await root().getByRole('menuitem', { name: /^Display copy/ }).locator('.menubar-shortcut').count(), 1);
    assert.equal(await root().getByRole('menuitem', { name: /^Bound location/ }).locator('.menubar-shortcut').count(), 0);
    assert.equal(await page.evaluate(() => pudlMenubar.shortcuts().some(c => c.label === 'Display copy')), false);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => {
      const event = new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true, cancelable: true });
      document.getElementById('outside').dispatchEvent(event); return event.defaultPrevented;
    }), false, 'display-only shortcut is never intercepted');
    console.log('PASS tooltip-only reasons retain detail/description and display-only reserved keys remain unbound');
    for (const dir of ['ltr', 'rtl']) {
      await page.evaluate(dir => { document.documentElement.dir = dir; }, dir);
      await title().click();
      const first = root().getByRole('menuitem', { name: 'First', exact: true });
      await first.focus(); await page.keyboard.press('ArrowRight');
      const second = page.locator('#menubar-sub > .menu-action').filter({ hasText: /^Second$/ });
      await second.focus(); await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('.menubar-panel:popover-open').count(), 3, 'three levels remain open');
      assert.equal(await first.getAttribute('aria-expanded'), 'true');
      assert.equal(await second.getAttribute('aria-expanded'), 'true');
      assert.equal(await page.locator('.menubar-sub:popover-open').evaluateAll(nodes => nodes.every(n => {
        const r = n.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + .5 && r.top >= 0 && r.bottom <= innerHeight + .5;
      })), true, dir + ' flyouts stay within viewport');
      const chain = await page.locator('.menubar-sub:popover-open').evaluateAll((nodes, dir) => nodes.map(popup => {
        const invoker = document.getElementById(popup.getAttribute('data-menu-anchor'));
        const row = invoker.getBoundingClientRect(), box = popup.getBoundingClientRect();
        const hit = document.elementFromPoint(row.x + row.width / 2, row.y + row.height / 2);
        return { ample: dir === 'rtl' ? row.left - box.width + 2 >= 12 : row.right + box.width - 2 <= innerWidth - 12,
          outward: dir === 'rtl' ? box.right <= row.left + 2.5 : box.left >= row.right - 2.5,
          invokerVisible: hit === invoker || invoker.contains(hit),
          row: { left: row.left, right: row.right }, popup: { left: box.left, right: box.right } };
      }), dir);
      assert.equal(chain.length, 2, 'both nested levels supply geometry');
      assert(chain.every(level => level.ample), dir + ' fixture has room for both outward levels ' + JSON.stringify(chain));
      assert(chain.every(level => level.outward), dir + ' every flyout continues outward when room exists ' + JSON.stringify(chain));
      assert(chain.every(level => level.invokerVisible), dir + ' top-layer children leave ancestor invokers hit-visible ' + JSON.stringify(chain));
      await page.screenshot({ path: out('nested-menu-' + dir + '.png') });
      await page.keyboard.press('ArrowLeft');
      assert.equal(await second.evaluate(n => n === document.activeElement), true, 'Left restores immediate invoker');
      assert.equal(await page.locator('.menubar-panel:popover-open').count(), 2);
      await page.keyboard.press('Escape');
      assert.equal(await first.evaluate(n => n === document.activeElement), true);
      await page.keyboard.press('Escape'); assert.equal(await expanded(), 0);
    }
    for (const dir of ['ltr', 'rtl']) {
      await page.setViewportSize({ width: 660, height: 800 });
      await page.evaluate(dir => { document.documentElement.dir = dir; }, dir);
      await title().click();
      await root().getByRole('menuitem', { name: 'First', exact: true }).click();
      const second = page.locator('#menubar-sub > .menu-action').filter({ hasText: /^Second$/ });
      await second.focus(); await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('.menubar-panel:popover-open').count(), 3, 'edge case keeps full-width flyouts');
      const fallback = await page.locator('#menubar-sub .menubar-sub').evaluate((popup, dir) => {
        const row = document.getElementById(popup.getAttribute('data-menu-anchor')).getBoundingClientRect();
        const box = popup.getBoundingClientRect();
        return { preferredFits: dir === 'rtl' ? row.left - box.width + 2 >= 0 : row.right + box.width - 2 <= innerWidth,
          flipped: dir === 'rtl' ? box.right > row.right : box.left < row.left,
          contained: box.left >= 0 && box.right <= innerWidth + .5 && box.top >= 0 && box.bottom <= innerHeight + .5 };
      }, dir);
      assert.equal(fallback.preferredFits, false, dir + ' edge fixture actually lacks preferred-side room');
      assert(fallback.flipped && fallback.contained, dir + ' insufficient room flips the leaf within the viewport ' + JSON.stringify(fallback));
      await page.screenshot({ path: out('nested-menu-edge-' + dir + '.png') });
      await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
      assert.equal(await expanded(), 0);
    }
    await page.setViewportSize({ width: 1200, height: 800 });
    await title().click();
    await root().getByRole('menuitem', { name: 'First', exact: true }).click();
    await page.locator('#menubar-sub > .menu-action').filter({ hasText: /^Second$/ }).click();
    await page.evaluate(() => { document.getElementById('nested-first').remove(); pudlMenubar.refresh(); });
    assert.equal(await page.locator('.menubar-sub:popover-open').count(), 0, 'source invalidation retires descendant chain');
    await page.keyboard.press('Escape');
    await load();
    // Four open levels leave two retired descendants in refresh's snapshot.
    await page.evaluate(() => {
      const list = document.querySelector('#nested-first > ul > li > ul');
      list.innerHTML = '<li id="middle-branch">Third<ul><li><button>Deep leaf</button></li></ul></li>';
      pudlMenubar.refresh();
    });
    await title().click();
    await root().getByRole('menuitem', { name: 'First', exact: true }).click();
    const retainedAncestor = page.locator('#menubar-sub');
    const secondInvoker = retainedAncestor.locator(':scope > .menu-action').filter({ hasText: /^Second$/ });
    await secondInvoker.click();
    await page.locator('.menubar-sub .menubar-sub > .menu-action').filter({ hasText: /^Third$/ }).click();
    assert.equal(await page.locator('.menubar-panel:popover-open').count(), 4, 'four panel levels are actually open');
    await page.evaluate(() => {
      document.querySelector('#nested-first > ul > li').replaceChildren(document.createTextNode('Second unavailable'));
      pudlMenubar.refresh();
    });
    assert.equal(await page.locator('.menubar-panel:popover-open').count(), 2, 'retired snapshot entries leave root and first ancestor open');
    assert.equal(await retainedAncestor.isVisible(), true);
    assert.equal(await root().getByRole('menuitem', { name: 'First', exact: true }).getAttribute('aria-expanded'), 'true');
    assert.equal(await retainedAncestor.locator('.menubar-sub').count(), 0, 'only the invalid intermediate branch and descendants retire');
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
    await load();
    await page.evaluate(() => { document.querySelector('[data-menubar]').setAttribute('data-menubar-host', 'desktop'); pudlMenubar.refresh(); });
    await title().click();
    assert.equal(await root().getByRole('menuitem', { name: /^Display copy/ }).locator('.menubar-shortcut').count(), 1, 'desktop display-only shortcut remains');
    assert.equal(await root().getByRole('menuitem', { name: /^Bound location/ }).locator('.menubar-shortcut').count(), 0, 'desktop still rejects bound reserved keys');
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 360, height: 700 });
    await title().click();
    await root().getByRole('menuitem', { name: 'First', exact: true }).click();
    assert.equal(await root().locator('.menubar-back').count(), 1, 'narrow submenu uses Back navigation');
    await root().getByRole('menuitem', { name: 'Second', exact: true }).click();
    await root().locator('.menubar-back').click();
    assert.equal(await root().getByRole('menuitem', { name: 'Second', exact: true }).count(), 1);
    await root().locator('.menubar-back').click();
    assert.equal(await root().locator('.menubar-back').count(), 0);
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto(ROOT + '/tests/fixtures/menubar.html');
    await page.waitForFunction(() => window.pudlWindows && pudlWindows.state().open.includes('notes'));
    await page.evaluate(() => {
      window.__menus = () => ({ reasons: 'tooltip', titles: [{ id: 'maintenance', label: 'Applet menu', items: [
        { label: 'App first', items: [{ label: 'App second', items: [{ label: 'App leaf', run() {} }] }] },
        { label: 'App unavailable', reason: 'Start server', detail: 'Applet detail', disabled: true, run() {} },
        { label: 'App copy', shortcut: 'Mod+C', bind: false, run() {} }
      ] }] });
      pudlWindows.raise('notes'); pudlMenubar.refresh();
    });
    await page.locator('.menubar-title[data-menu-id="maintenance"]').click();
    const appReason = root().getByRole('menuitem', { name: /^App unavailable/ });
    assert.equal(await appReason.getAttribute('title'), 'Start server');
    assert.equal(await appReason.locator('.menubar-detail').textContent(), 'Applet detail');
    assert.equal(await page.locator('#' + await appReason.getAttribute('aria-describedby')).getAttribute('class'), 'visually-hidden');
    assert.equal(await root().getByRole('menuitem', { name: /^App copy/ }).locator('.menubar-shortcut').count(), 1);
    await root().getByRole('menuitem', { name: 'App first', exact: true }).click();
    await page.locator('#menubar-sub > .menu-action').filter({ hasText: /^App second$/ }).click();
    assert.equal(await page.locator('.menubar-panel:popover-open').count(), 3, 'applet descriptors retain nested ancestors too');
    await page.locator('#menubar-sub .menubar-sub .menu-action').click();
    assert.equal(await expanded(), 0, 'applet leaf command clears every expanded invoker');
    assert.deepEqual(errors, []);
    console.log('PASS nested flyouts retain ancestors, direction-aware placement, branch focus and source invalidation');
  } finally { await browser.close(); }
})().catch(error => { console.error('FAIL desktop menu maintenance', error); process.exitCode = 1; });
