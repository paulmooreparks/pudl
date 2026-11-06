/* Interactive host studies use real catalog, splitter and window controls. */
const assert = require('assert/strict');
const { launch, ROOT, out } = require('./lib');
(async () => {
  const browser = await launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    for (const kind of ['apps', 'content', 'tools']) {
      await page.goto(ROOT + '/samples/host-launcher-' + kind + '.html');
      await page.waitForFunction(() => window.pudlStart && document.body.dataset.presentation);
      const root = page.locator('#host-launcher');
      await page.locator('#host-title').click();
      assert.equal(await root.isVisible(), false, 'title toggles the visible launcher closed');
      assert.equal(await page.locator('#host-title').getAttribute('aria-expanded'), 'false');
      await page.locator('#host-title').click();
      assert.equal(await root.isVisible(), true, 'title toggles the launcher open again');
      if (kind !== 'content') {
        const panel = await root.boundingBox(), title = await page.locator('#host-title').boundingBox();
        assert.ok(Math.abs(panel.y - title.y - title.height - 6) < 2, 'popup anchors under the host title');
        await root.locator('details').evaluate(el => { el.open = true; });
        await page.locator('#launcher-width').fill('680'); await page.locator('#launcher-width').press('Tab');
        await page.waitForFunction(() => Math.abs(document.getElementById('host-launcher').getBoundingClientRect().width - 680) < 2);
        await root.locator('details').evaluate(el => { el.open = false; });
      }
      const query = root.locator('[data-start-query]');
      await query.fill('unfindable'); assert.equal(await root.locator('[data-start-empty]').isVisible(), true);
      await root.locator('[data-start-clear]').first().click();
      const before = await root.locator('[data-start-item]:visible').count(); assert.ok(before >= 4);
      if (kind !== 'content') await page.locator('#keep-open').click();
      await page.waitForFunction(() => document.body.dataset.presentation === 'pane');
      assert.equal(await page.locator('#keep-open').getAttribute('aria-pressed'), 'true', 'pin stays pressed in the persistent pane');
      assert.equal(await page.locator('#keep-open .glyph').count(), 1, 'pin uses the shared glyph');
      const handle = page.locator('.outer-divider'), slot = page.locator('#launcher-slot');
      const width = (await slot.boundingBox()).width;
      await handle.focus(); await handle.press('ArrowLeft'); assert.ok((await slot.boundingBox()).width < width);
      const box = await handle.boundingBox(), moved = (await slot.boundingBox()).width;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 32, box.y + box.height / 2, { steps: 4 }); await page.mouse.up();
      assert.ok((await slot.boundingBox()).width > moved + 20);
      const savedWidth = (await slot.boundingBox()).width;
      const category = kind === 'apps' ? 'create' : kind === 'content' ? 'factoids' : 'utilities';
      await root.locator('[data-start-category-key="' + category + '"]').click();
      const matches = await root.locator('[data-start-item]:visible').count(); assert.ok(matches < before && matches > 0);
      await page.locator('#collapse-launcher').click();
      assert.equal(await root.isVisible(), false);
      await page.locator('#host-title').click(); assert.equal(await root.isVisible(), true);
      assert.equal(await root.locator('[data-start-item]:visible').count(), matches);
      await page.reload(); await page.waitForFunction(() => document.body.dataset.presentation === 'pane');
      assert.ok(Math.abs((await slot.boundingBox()).width - savedWidth) < 2, 'pane width is remembered');
      assert.equal(await root.locator('[data-start-category-key="' + category + '"]').getAttribute('aria-current'), 'page');
      await root.locator('[data-start-category-key=""]').click();
      const target = kind === 'apps' ? 'editor' : kind === 'content' ? 'experience' : 'notes';
      await root.locator('[data-demo-open="' + target + '"]').click();
      await page.waitForSelector('.win[data-win="' + target + '"]');
      if (kind !== 'content') {
        await page.locator('.win[data-win="' + target + '"] textarea').fill('A draft kept while browsing');
        await page.locator('#host-title').focus();
        await root.locator('[data-demo-open="' + target + '"]').click();
        assert.equal(await page.locator('.win[data-win="' + target + '"] textarea').inputValue(), 'A draft kept while browsing');
        assert.equal(await page.locator('.win[data-win="' + target + '"]').count(), 1, 'activation raises the existing window');
      }
      if (kind === 'content') {
        const scroll = await root.locator('[data-start-items]').evaluate(el => { el.scrollTop = 70; return el.scrollTop; });
        await page.locator('#host-title').click(); await page.locator('#host-title').click();
        assert.equal(await root.locator('[data-start-items]').evaluate(el => el.scrollTop), scroll, 'title toggle retains browsing position');
        await page.locator('button[data-catalog-view="list"]').click();
        assert.equal(await root.locator('.story-excerpt').first().isVisible(), false);
        await page.locator('button[data-catalog-view="overview"]').click();
        assert.equal(await root.locator('.story-excerpt').first().isVisible(), true);
      }
      for (const theme of ['dark', 'light']) {
        await page.evaluate(t => document.documentElement.dataset.theme = t, theme);
        await page.screenshot({ path: out('host-' + kind + '-' + theme + '.png') });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await root.isVisible(), true);
      await page.screenshot({ path: out('host-' + kind + '-narrow.png') });
      await page.locator('#keep-open').click();
      const narrow = await root.boundingBox(); assert.ok(narrow.x >= 0 && narrow.x + narrow.width <= 391);
      await query.focus(); await query.press('Escape');
      await page.waitForFunction(() => !document.getElementById('host-launcher').matches(':popover-open'));
      assert.equal(await page.evaluate(() => document.activeElement.id), 'host-title');
      await page.setViewportSize({ width: 1440, height: 1000 });
      console.log('PASS ' + kind + ' title opener, filtering, pane resizing, persistence, collapse, windows, themes and narrow popup');
    }
    await page.goto(ROOT + '/samples/host-launcher-apps.html?mode=standalone&item=editor&catalog=closed');
    await page.waitForSelector('.win[data-win="editor"]');
    await page.locator('#host-title').click();
    await page.locator('[data-demo-open="colours"]').click();
    await page.waitForFunction(() => document.querySelectorAll('.win[data-win]').length === 1 && document.querySelector('.win[data-win="colours"]'));
    await page.locator('[data-colour]').fill('#ff4400');
    assert.equal(await page.locator('[data-colour-value]').innerText(), '#ff4400');
    await page.locator('#host-title').click(); await page.locator('[data-demo-open="diagrams"]').click();
    await page.locator('[data-diagram-step]').click();
    assert.equal(await page.locator('[data-diagram-label]').textContent(), 'Review the result');
    const download = page.waitForEvent('download'); await page.locator('[data-diagram-export]').click();
    const exported = await download;
    assert.equal(exported.suggestedFilename(), 'launcher-study-diagram.svg');
    assert.equal(await exported.failure(), null, 'SVG download completes before navigation');
    await page.goto(ROOT + '/samples/host-launcher-tools.html?catalog=pane&section=utilities&host=gk');
    await page.waitForFunction(() => document.body.dataset.presentation === 'pane');
    assert.equal(await page.locator('[data-host-name]').innerText(), 'GK Companion');
    await page.locator('[data-demo-open="calculator"]').click();
    await page.locator('[data-calculator] [name="a"]').fill('18.5');
    assert.equal(await page.locator('[data-calculator] output').innerText(), '26');
    await page.locator('#host-launcher [data-start-category-key=""]').click();
    await page.locator('[data-demo-open="tasks"]').click();
    await page.locator('[data-task="0"]').check();
    await page.locator('[data-demo-open="expenses"]').click();
    await page.locator('[data-expenses] input').first().fill('10');
    assert.equal(await page.locator('[data-expenses] output').innerText(), '28.20');
    await page.reload(); await page.waitForSelector('[data-task="0"]');
    assert.equal(await page.locator('[data-task="0"]').isChecked(), true);
    await page.goto(ROOT + '/samples/host-launcher-content.html?catalog=pane&section=posts');
    await page.locator('[data-start-category-key="factoids"]').click();
    await page.locator('[data-start-category-key="feeds"]').click();
    await page.goBack();
    await page.waitForFunction(() => pudlStart.state(document.getElementById('host-launcher')).category === 'factoids');
    await page.goForward();
    await page.waitForFunction(() => pudlStart.state(document.getElementById('host-launcher')).category === 'feeds');
    await page.locator('[data-start-category-key=""]').click();
    await page.locator('button[data-catalog-view="list"]').click();
    await page.locator('[data-demo-open="cheerp"]').click();
    await page.waitForSelector('.win[data-win="cheerp"]');
    const shared = await browser.newPage();
    await shared.goto(page.url());
    await shared.waitForSelector('.win[data-win="cheerp"]');
    assert.equal(await shared.locator('[data-start-item]:visible').count(), 10);
    assert.equal(await shared.locator('button[data-catalog-view="list"]').getAttribute('aria-pressed'), 'true');
    await shared.close();
    assert.deepEqual(errors, []);
    console.log('PASS standalone switching, diagram export, colour picker, host choice, calculator, expenses, checklist, history, clean-context shared URL and no page errors');
  } catch (error) {
    console.error(error);
    throw error;
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
