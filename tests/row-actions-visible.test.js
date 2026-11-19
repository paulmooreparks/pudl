const assert = require('assert');
const { launch, ROOT, out } = require('./lib');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
    await page.goto(ROOT + '/tests/fixtures/row-actions.html');
    await page.waitForFunction(() => window.pudlMenu);
    await page.addScriptTag({ url: ROOT + '/dist/pudl-md.js' });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      await page.mouse.move(800, 650);
      const buttons = page.locator('[data-row-actions]');
      const before = await buttons.evaluateAll(bs => bs.map(b => {
        const r = b.getBoundingClientRect(); return [r.x, r.y, r.width, r.height];
      }));
      for (let i = 0; i < await buttons.count(); i++) {
        assert.equal(await buttons.nth(i).getAttribute('aria-label'), 'Actions');
        assert.equal(await buttons.nth(i).evaluate(b => getComputedStyle(b).visibility), 'visible');
      }
      const alpha = page.locator('[data-name="Alpha"] [data-row-actions]');
      await page.focus('[data-name="Alpha"] .md-item');
      await page.keyboard.press('Tab');
      assert(await alpha.evaluate(b => b === document.activeElement));
      await page.keyboard.press('Shift+Tab');
      if (browser.browserType().name() !== 'webkit') {
        assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Alpha');
        await page.keyboard.press('Tab');
      } else {
        console.log('QUALIFIED WebKit default Tab policy skips links on reverse traversal');
        await alpha.focus();
      }
      for (const key of ['Enter', 'Space']) {
        await page.keyboard.press(key);
        await page.waitForSelector('.context-menu:popover-open');
        await page.keyboard.press('Escape');
        assert(await alpha.evaluate(b => b === document.activeElement));
      }
      await page.hover('[data-name="Gamma"] .md-item');
      const after = await buttons.evaluateAll(bs => bs.map(b => {
        const r = b.getBoundingClientRect(); return [r.x, r.y, r.width, r.height];
      }));
      assert.deepEqual(after, before);
      await page.mouse.move(800, 650);
      await page.screenshot({ path: out('row-actions-' + theme + '.png') });
      console.log('PASS ' + theme + ' visibility, native activation, focus return and geometry');
    }
    const expected = ['Alpha', 'Beta', 'Gamma', 'site', 'articles', 'One', 'Two'];
    for (const direction of ['Tab', 'Shift+Tab']) {
      await page.locator('[data-name="' + (direction === 'Tab' ? 'Alpha' : 'Two') + '"] [data-row-actions]').focus();
      const seen = new Set();
      for (let i = 0; i < 30 && seen.size < expected.length; i++) {
        const name = await page.evaluate(() => document.activeElement.matches('[data-row-actions]') ? document.activeElement.closest('[data-name]').dataset.name : null);
        if (name) seen.add(name);
        await page.keyboard.press(direction);
      }
      assert.deepEqual([...seen].sort(), expected.slice().sort());
    }
    console.log('PASS real Tab and Shift+Tab reach every list, tree and table action');
    await page.evaluate(() => {
      for (let i = 0; i < 2; i++) {
        const box = document.createElement('div');
        box.dataset.name = 'Box' + i;
        box.className = 'box';
        document.body.append(box);
      }
    });
    await page.evaluate(() => {
      for (let i = 0; i < 2; i++) document.querySelector('[data-name="Box' + i + '"]').innerHTML = '<button data-row-actions id="dynamic' + i + '"></button>';
    });
    await page.waitForFunction(() => document.querySelector('#dynamic1').getAttribute('aria-label') === 'Actions');
    assert.equal(await page.locator('#dynamic0').getAttribute('aria-label'), 'Actions');
    await page.evaluate(() => {
      const extra = document.createElement('div');
      extra.innerHTML = '<button id="before">Before</button><div data-name="Box"><button data-row-actions id="named" aria-label="Actions for Box"></button><button data-row-actions id="words">More options</button><button data-row-actions id="disabled" disabled></button><span hidden><button data-row-actions id="hidden"></button></span><span inert><button data-row-actions id="inert"></button></span></div><button id="after">After</button>';
      document.body.append(extra);
    });
    assert.equal(await page.locator('#named').getAttribute('aria-label'), 'Actions for Box');
    assert.equal(await page.getByRole('button', { name: 'Actions for Box', exact: true }).count(), 1);
    assert.equal(await page.locator('#words').getAttribute('aria-label'), null);
    await page.focus('#before');
    for (const id of ['named', 'words', 'after']) {
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), id);
    }
    console.log('PASS separate dynamic subtrees, authored names and disabled/hidden/inert Tab semantics');
    await page.focus('#dynamic0');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'dynamic1');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'dynamic0');
    console.log('PASS box actions traverse in both directions');
    for (const selector of ['[data-name="site"] > [data-row-actions]', '[data-name="articles"] > [data-row-actions]', '[data-name="One"] [data-row-actions]']) {
      await page.locator(selector).focus();
      await page.keyboard.press('ArrowDown');
      assert(await page.locator(selector).evaluate(b => b === document.activeElement));
      await page.keyboard.press('Enter');
      await page.waitForSelector('.context-menu:popover-open');
      await page.keyboard.press('Escape');
      assert(await page.locator(selector).evaluate(b => b === document.activeElement));
    }
    console.log('PASS tree and table actions retain native activation and focus under roving handlers');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
