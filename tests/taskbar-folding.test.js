const assert = require('assert/strict');
const { launch, ROOT, out } = require('./lib');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 850 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(ROOT + '/tests/fixtures/taskbar-folding.html');
    await page.locator('.win-bar [data-win-pin="settings"]').waitFor();
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
    async function height() {
      const heights = await page.locator('.win-bar :is(.win-tab,.btn,.icon-btn)').evaluateAll(nodes => nodes.filter(n => n.getClientRects().length).map(n => n.getBoundingClientRect().height));
      assert.ok(Math.max(...heights) - Math.min(...heights) < .5, 'one height: ' + heights);
      return heights[0];
    }
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      await page.setViewportSize({ width: 1440, height: 850 }); await settle();
      assert.equal(await page.locator('.win-bar').getAttribute('data-win-bar-glyphs'), null);
      const initial = await height();
      const names = await page.locator('.win-bar .win-dock .win-tab').evaluateAll(ns => ns.map(n => n.getAttribute('aria-label')));
      await page.setViewportSize({ width: 480, height: 850 }); await settle();
      assert.equal(await page.locator('.win-bar').getAttribute('data-win-bar-glyphs'), '');
      await height();
      assert.deepEqual(await page.locator('.win-bar .win-dock .win-tab').evaluateAll(ns => ns.map(n => n.getAttribute('aria-label'))), names);
      assert.equal(await page.locator('.win-bar .win-bar-more:visible').count(), 0, 'fold before overflowing');
      assert.ok(await page.locator('.win-bar .win-dock').evaluate(n => n.scrollWidth <= n.clientWidth + 1));
      for (const key of ['notes','terminal']) {
        assert.equal(await page.locator('.win-bar [data-win-tab="'+key+'"]').evaluate(n=>getComputedStyle(n,'::after').maskImage !== 'none'), true, 'identity fallback remains visible');
      }
      await page.locator('.win-bar [data-win-pin="settings"]').focus();
      if (await page.evaluate(()=>pudlWindows.state().top==='settings' && !pudlWindows.state().min.settings)) {
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(()=>!!pudlWindows.state().min.settings),true);
        await page.locator('.win-bar [data-win-pin="settings"]').focus();
      }
      await page.keyboard.press('Enter'); await page.locator('.win[data-win="settings"]').waitFor(); await settle();
      await height();
      await page.locator('.win-bar [data-win-pin="editor"]').click({button:'right'});
      await page.getByRole('menuitem',{name:'Unpin from taskbar',exact:true}).waitFor();await page.keyboard.press('Escape');
      await page.screenshot({path:out('taskbar-folding-'+theme+'.png')});
      await page.setViewportSize({ width: 210, height: 850 });await settle();
      await page.locator('.win-bar-more:visible').click();await page.locator('.context-menu:popover-open').waitFor();await page.keyboard.press('Escape');
      await page.setViewportSize({ width: 1440, height: 850 });await settle();
      assert.equal(await page.locator('.win-bar').getAttribute('data-win-bar-glyphs'),null);
      assert.equal(await page.locator('.win-bar .win-bar-more:visible').count(),0);
      assert.equal(await page.locator('.mirror [data-win-tab-over]').count(),0,'other window lists stay unchanged');
    }
    await page.goto(ROOT + '/tests/fixtures/taskbar-folding.html?wrapped');
    await page.locator('.win-bar [data-win-pin="settings"]').waitFor();
    await page.setViewportSize({width:390,height:850});await settle();
    await height();
    assert.equal(await page.locator('.win-bar').getAttribute('data-win-bar-glyphs'),'');
    for (const selector of ['#quit','#session']) {
      const measured=await page.locator(selector).evaluate(n=>{const g=n.querySelector('.glyph,.win-item-glyph');const a=n.getBoundingClientRect(),b=g.getBoundingClientRect();return {width:a.width,start:b.left-a.left,end:a.right-b.right};});
      assert.ok(measured.width<45, 'single glyph button fits glyph and padding '+JSON.stringify(measured));
      assert.ok(Math.abs(measured.start-measured.end)<1, 'single glyph is centered '+JSON.stringify(measured));
    }
    await page.setViewportSize({width:180,height:850});await settle();
    assert.equal(await page.locator('#session').isVisible(),false);
    await page.locator('.win-bar-more:visible').click();await page.getByRole('menuitem',{name:'Session',exact:true}).click();
    await page.getByRole('menu',{name:'Session actions',exact:true}).waitFor();
    const anchor=await page.locator('.win-bar-more').boundingBox(),panel=await page.locator('#session-menu').boundingBox();
    assert.ok(panel.y+panel.height<=anchor.y+1,'overflowed menu anchors above the visible More button');
    await page.keyboard.press('Escape');
    await page.setViewportSize({width:1440,height:850});await settle();
    assert.equal(await page.locator('.win-bar').getAttribute('data-win-bar-glyphs'),null);
    assert.equal(await page.locator('#session').isVisible(),true);
    assert.deepEqual(errors,[]);
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
