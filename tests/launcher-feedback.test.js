const assert = require('assert/strict');
const { launch, ROOT, out } = require('./lib');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(ROOT + '/tests/fixtures/launcher.html');
    await page.waitForFunction(() => window.fixtureReady);
    await page.evaluate(() => {
      window.executions = 0;
      const root = document.getElementById('catalog-a');
      document.getElementById('item-a').addEventListener('click', () => {
        executions++; document.getElementById('outside-a').focus();
      });
      const extra = document.createElement('button'); extra.type = 'button'; extra.textContent = 'Actions'; extra.id = 'auxiliary';
      document.getElementById('item-a').parentElement.appendChild(extra);
      const header = document.createElement('button'); header.type = 'button'; header.id = 'header-action'; header.dataset.launcherActivate = ''; header.textContent = 'Home';
      root.querySelector('header').appendChild(header);
      document.getElementById('disabled-a').addEventListener('click', () => { executions += 100; });
      header.addEventListener('click', event => { event.preventDefault(); executions++; pudlLauncher.activated(root, header); });
    });
    const root = page.locator('#catalog-a');
    const open = () => page.evaluate(() => pudlLauncher.open(document.getElementById('catalog-a')));
    const waitClosed = () => page.waitForFunction(() => pudlLauncher.state(document.getElementById('catalog-a')).presentation === 'closed');
    const waitFeedback = () => page.waitForFunction(() => !document.querySelector('[data-launcher-selected]'));
    await open();
    const immediate = await page.evaluate(async () => {
      const root = document.getElementById('catalog-a'), item = document.getElementById('item-a');
      window.feedbackStarted = performance.now(); item.click(); item.click();
      const synchronousExecutions = executions; await Promise.resolve();
      return { executions: synchronousExecutions, visible: root.matches(':popover-open'), selected: item.parentElement.hasAttribute('data-launcher-selected'), focus: document.activeElement.id, background: getComputedStyle(item.parentElement).backgroundColor };
    });
    assert.equal(immediate.executions, 1, 'the original action runs synchronously and a repeated click is blocked');
    assert.equal(immediate.visible, true); assert.equal(immediate.selected, true);
    assert.notEqual(immediate.background, 'rgba(0, 0, 0, 0)');
    assert.equal(immediate.focus, 'outside-a');
    await waitClosed();
    assert.ok(await page.evaluate(() => performance.now() - feedbackStarted >= 175), 'dismissal waits for the feedback interval');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'outside-a', 'dismissal preserves destination focus');
    await open(); await page.locator('#auxiliary').click();
    assert.equal(await root.evaluate(el => el.matches(':popover-open')), true);
    assert.equal(await root.locator('[data-launcher-selected]').count(), 0);
    await page.locator('#disabled-a').dispatchEvent('click');
    assert.equal(await root.locator('[data-launcher-selected]').count(), 0);
    await page.locator('#item-a').focus(); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => executions), 2);
    await waitClosed();
    await open();
    await page.evaluate(() => { const root = document.getElementById('catalog-a'); document.getElementById('item-a').click(); pudlLauncher.activated(root, document.getElementById('item-a')); pudlLauncher.close(root); pudlLauncher.open(root); });
    await page.waitForTimeout(230);
    assert.equal(await root.evaluate(el => el.matches(':popover-open')), true, 'a stale dismissal cannot close a reopened popup');
    await page.evaluate(() => { const root = document.getElementById('catalog-a'); document.getElementById('item-a').click(); pudlLauncher.activated(root, document.getElementById('item-a')); pudlLauncher.pin(root, true); });
    await page.waitForTimeout(230);
    assert.equal(await page.evaluate(() => pudlLauncher.state(document.getElementById('catalog-a')).presentation), 'pane');
    await page.locator('#item-a').focus(); await page.keyboard.press('Space');
    assert.equal(await root.locator('[data-launcher-selected]').count(), 1);
    await waitFeedback();
    assert.equal(await page.evaluate(() => pudlLauncher.state(document.getElementById('catalog-a')).presentation), 'pane');
    await page.evaluate(() => pudlLauncher.pin(document.getElementById('catalog-a'), false));
    await open(); await page.locator('#header-action').click();
    await waitClosed();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open();
    await page.evaluate(() => document.getElementById('item-a').click());
    assert.equal(await root.locator('[data-launcher-selected]').count(), 1, 'reduced motion retains static confirmation');
    await waitClosed();
    await open();
    const native = await page.evaluate(() => {
      const root = document.getElementById('catalog-a');
      const row = document.createElement('li'); row.dataset.startItem = ''; row.className = 'md-row';
      const a = document.createElement('a'); a.href = '#native'; a.textContent = 'Native link'; row.appendChild(a); root.querySelector('[data-start-items]').appendChild(row);
      const requests = [];
      // Inspect whether PUDL canceled the original event without navigating the test page.
      function request(properties) {
        const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...properties });
        a.addEventListener('click', e => { e.preventDefault(); }, { once: true });
        let canceledAtCapture = false;
        a.addEventListener('click', e => { canceledAtCapture = e.defaultPrevented; }, { once: true, capture: true });
        a.dispatchEvent(event); requests.push({ canceledAtCapture, selected: row.hasAttribute('data-launcher-selected') });
      }
      request({ ctrlKey: true }); request({ metaKey: true }); request({ shiftKey: true }); request({ button: 1 });
      a.target = '_blank'; request({}); a.removeAttribute('target'); a.download = 'file'; request({});
      return requests;
    });
    assert.ok(native.every(r => !r.canceledAtCapture && !r.selected));
    await page.evaluate(() => {
      const root = document.getElementById('catalog-a'); document.getElementById('item-a').click(); pudlLauncher.activated(root, document.getElementById('item-a')); pudlLauncher.destroy(root);
    });
    await page.waitForTimeout(230);
    assert.equal(await root.locator('[data-launcher-selected]').count(), 0);
    await page.reload(); await page.waitForFunction(() => window.fixtureReady);
    await open();
    await page.evaluate(() => {
      document.addEventListener('click', e => { if (e.target.id === 'item-a') e.preventDefault(); }, { once: true });
      document.getElementById('item-a').click();
    });
    assert.equal(await root.locator('[data-launcher-selected]').count(), 0, 'a rejected managed action is not confirmed');
    assert.equal(await root.evaluate(el => el.matches(':popover-open')), true);
    // Heading spacing uses the same tokens in both category placements and narrow views.
    await page.goto(ROOT + '/samples/host-launcher-content.html');
    await page.waitForFunction(() => document.body.dataset.presentation);
    for (const width of [1200, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const side of ['left', 'right']) {
        const padding = await page.locator('.start-heading').evaluate((el, side) => {
          el.closest('[data-start]').setAttribute('data-start-side', side);
          const style = getComputedStyle(el), tokens = getComputedStyle(document.documentElement);
          return { top: style.paddingTop, bottom: style.paddingBottom, expectedTop: tokens.getPropertyValue('--space-3').trim(), expectedBottom: tokens.getPropertyValue('--space-2').trim() };
        }, side);
        assert.equal(padding.top, padding.expectedTop); assert.equal(padding.bottom, padding.expectedBottom);
      }
    }
    await page.screenshot({ path: out('launcher-heading-narrow.png') });
    assert.deepEqual(errors, []);
    console.log('PASS immediate execution, feedback, duplicate guard, keyboard, cancellation, pinned mode, native exclusions, reduced motion and heading insets');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
