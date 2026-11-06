const assert = require('assert/strict');
const { launch, ROOT } = require('./lib');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(ROOT + '/tests/fixtures/launcher.html');
    await page.waitForFunction(() => window.fixtureReady);
    const root = page.locator('#catalog-a'), pin = root.locator('[data-launcher-pin]');
    const state = key => page.evaluate(key => pudlLauncher.state(document.getElementById('catalog-'+key)), key || 'a');
    await page.locator('#launch-a').click(); await pin.click();
    assert.equal((await state()).presentation, 'pane');
    await pin.click(); assert.equal((await state()).presentation, 'popup');
    await pin.click(); await page.locator('#item-a').click(); await pin.click();
    assert.equal((await state()).presentation, 'closed');
    await page.locator('#launch-a').click(); await pin.click(); await page.locator('#outside-a').click(); await pin.click();
    assert.equal((await state()).presentation, 'closed');
    await page.locator('#launch-a').click(); await pin.click();
    await page.locator('#disabled-a').dispatchEvent('click'); await pin.click();
    assert.equal((await state()).presentation, 'popup', 'disabled destinations do not consume return intent');
    await root.locator('[data-start-query]').fill('Editor'); await pin.click();
    await page.evaluate(() => { window.savedItem = document.getElementById('item-a'); pudlStart.setState(document.getElementById('catalog-a'), {category:'tools'}); });
    await page.evaluate(() => pudlLauncher.close(document.getElementById('catalog-a')));
    assert.equal((await state()).presentation, 'collapsed');
    await page.evaluate(() => pudlLauncher.open(document.getElementById('catalog-a')));
    assert.equal(await page.evaluate(() => document.getElementById('item-a') === savedItem), true);
    assert.equal(await root.locator('[data-start-query]').inputValue(), 'Editor');
    assert.equal(await page.evaluate(async () => {
      let mutations=0; const root=document.getElementById('catalog-a'), observer=new MutationObserver(r=>mutations+=r.length);
      observer.observe(root,{subtree:true,attributes:true,childList:true});
      pudlLauncher.present(root,'pane'); await Promise.resolve(); observer.disconnect(); return mutations;
    }), 0, 'unchanged presentation does not rewrite the catalog');
    await page.locator('#launch-b').click();
    assert.equal((await state('b')).presentation, 'popup');
    assert.equal((await state()).presentation, 'pane', 'second launcher leaves first pinned');
    await page.evaluate(() => pudlLauncher.pin(document.getElementById('catalog-b'),true));
    await page.evaluate(() => pudlLauncher.pin(document.getElementById('catalog-a'),false));
    assert.equal((await state()).presentation, 'closed', 'interaction with another launcher clears return intent');
    assert.equal((await state('b')).presentation, 'pane');
    assert.equal(await page.evaluate(() => pudlLauncher.resize(document.getElementById('catalog-a'),{width:-1})), false);
    await page.evaluate(() => { pudlLauncher.resize(document.getElementById('catalog-a'),{width:4000,height:2000}); pudlLauncher.open(document.getElementById('catalog-a')); });
    await page.waitForFunction(() => {const r=document.getElementById('catalog-a').getBoundingClientRect();return r.right<=innerWidth && r.bottom<=innerHeight;});
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(() => document.getElementById('catalog-a').getBoundingClientRect().width<=374);
    await page.evaluate(() => pudlLauncher.pin(document.getElementById('catalog-a'),true));
    assert.equal(await page.evaluate(() => {
      const root=document.getElementById('catalog-a'); pudlLauncher.destroy(root);
      return root.parentNode===document.body && root.nextElementSibling.id==='after-a' && root.getAttribute('role')==='dialog' && root.hasAttribute('popover') && !root.hasAttribute('data-launcher') && pudlLauncher.state(root)===null && root.querySelector('[data-launcher-pin]').getAttribute('aria-pressed')==='false' && document.activeElement===document.getElementById('launch-a');
    }), true, 'destroy restores original placement, attributes and control state');
    assert.equal(await page.evaluate(() => pudlLauncher.open(document.getElementById('catalog-a'))), false);
    await page.evaluate(() => { const root=document.getElementById('catalog-a'); pudlLauncher.enhance(root,optionsFor('a')); pudlLauncher.enhance(root,optionsFor('a')); });
    await page.locator('#launch-a').click();
    assert.equal((await state()).presentation, 'popup', 'reinitialization adds one set of handlers');
    assert.deepEqual(errors, []);
    console.log('PASS independent launchers, pin intent, disabled destinations, retained catalog, no-op presentation, bounded geometry, destroy and reinitialization');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
