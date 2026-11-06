const assert = require('assert/strict');
const { launch, ROOT } = require('./lib');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const delays = {};
    await page.route('**/stack-fragments/*.html', async route => {
      const key = new URL(route.request().url()).pathname.split('/').pop().replace('.html', '');
      if (delays[key]) await new Promise(resolve => setTimeout(resolve, delays[key]));
      if (key === 'failed') return route.fulfill({ status: 404, body: 'Missing' });
      await route.fulfill({ contentType: 'text/html', body: '<section class="win" data-win="' + key + '"' + (key === 'child' ? ' data-win-parent="b"' : '') + '><header class="win-head"><h2 class="win-title">' + key + '</h2><button class="win-btn" data-win-action="close" aria-label="Close"></button></header><div class="win-body"><input aria-label="Working text" value="Retained"></div></section>' });
    });
    const address = query => ROOT + '/tests/fixtures/window-stack.html?' + query;
    const state = () => page.evaluate(() => pudlWindows.state());
    async function settled(keys) {
      await page.waitForFunction(keys => window.pudlWindows && keys.every(k => document.querySelector('.win[data-win="' + k + '"]:not([data-win-restoring])')) && !document.querySelector('[data-win-restoring]'), keys);
    }
    await page.goto(address('open=a,b,c&top=c'));
    await settled(['a','b','c']);
    await page.evaluate(() => { pudlWindows.raise('a'); pudlWindows.raise('b'); pudlWindows.raise('a'); });
    assert.deepEqual((await state()).zOrder, ['c','b','a']);
    assert.equal(new URL(page.url()).searchParams.get('z.order'), 'c,b,a');
    const saved = await state();
    await page.reload(); await settled(['a','b','c']);
    assert.deepEqual((await state()).zOrder, saved.zOrder); assert.equal((await state()).top, saved.top);
    assert.ok(await page.evaluate(() => +document.querySelector('[data-win="a"]').style.zIndex > +document.querySelector('[data-win="b"]').style.zIndex));
    assert.deepEqual(await page.evaluate(() => { const s = pudlWindows.state(); s.zOrder.reverse(); return pudlWindows.state().zOrder; }), saved.zOrder, 'public state is detached');
    const pure = await page.evaluate(() => {
      const before = pudlWindows.state().zOrder.join(','), href = document.querySelector('[data-win-tab="c"]').href;
      return { before, after: pudlWindows.state().zOrder.join(','), href };
    });
    assert.equal(pure.before, pure.after); assert.equal(new URL(pure.href).searchParams.get('z.order'), 'b,a,c');
    await page.evaluate(() => pudlWindows.reorderTaskbar('c', { before: 'a' }));
    assert.deepEqual((await state()).zOrder, saved.zOrder);
    const taskbar = (await state()).taskbarOrder;
    await page.reload(); await settled(['a','b','c']); assert.deepEqual((await state()).taskbarOrder, taskbar);
    await page.evaluate(() => pudlWindows.minimize('a')); const minimized = await state();
    await page.reload(); await settled(['a','b','c']); assert.deepEqual((await state()).zOrder, minimized.zOrder); assert.equal((await state()).min.a, true);
    await page.goto(address('open=a,b,c&z.order=c,unknown,c,a&top=a'));
    await settled(['a','b','c']); assert.deepEqual((await state()).zOrder, ['b','c','a']);
    await page.goto(address('open=a,b,c&z.order=c,a,b'));
    await settled(['a','b','c']); assert.equal((await state()).top, 'b');
    await page.goto(address('open=a,b,c&z.order=&top=bad'));
    await settled(['a','b','c']); assert.deepEqual((await state()).zOrder, ['a','b','c']); assert.equal((await state()).top, 'c');
    await page.goto(address('open=a,b,c,child&z.order=child,c,a,b&top=child'));
    await settled(['a','b','c','child']); assert.deepEqual((await state()).zOrder, ['c','a','b','child']);
    const family = await state(); await page.reload(); await settled(['a','b','c','child']); assert.deepEqual((await state()).zOrder, family.zOrder);
    await page.evaluate(() => pudlWindows.rekey('b','renamed'));
    assert.ok((await state()).zOrder.includes('renamed')); assert.ok(!(await state()).zOrder.includes('b'));
    assert.equal(await page.locator('[data-win="child"]').getAttribute('data-win-parent'), 'renamed');
    await page.evaluate(() => pudlWindows.close('renamed'));
    assert.ok(!(await state()).zOrder.includes('child'));
    await page.goto(address('open=a,b,c&z.order=c,b,a&top=b&min=a,b,c'));
    await settled(['a','b','c']); const allMin = await state(); assert.equal(allMin.top, 'b'); assert.equal(allMin.min.b, true);
    await page.reload(); await settled(['a','b','c']); assert.deepEqual((await state()).zOrder, allMin.zOrder);
    await page.goto(address('open=a,b,c&z.order=c,b,a&top=a&p.c=zone:0,0,0.5,1&p.b=dock-left:0,0,0.3,1'));
    await settled(['a','b','c']);
    const band = await page.evaluate(() => Object.fromEntries(['a','b','c'].map(k => [k, +document.querySelector('[data-win="'+k+'"]').style.zIndex])));
    assert.ok(band.b > band.a && band.a > band.c, 'edge docks retain their band and floating/snapped surfaces retain logical order');
    const docked = await state(); await page.reload(); await settled(['a','b','c']); assert.deepEqual((await state()).zOrder, docked.zOrder);
    delays.a = 150; delays.b = 20; delays.c = 90;
    await page.goto(address('open=a,b,c&z.order=b,c,a&top=a'));
    await settled(['a','b','c']); assert.deepEqual((await state()).zOrder, ['b','c','a']);
    assert.ok(await page.evaluate(() => arrivals.every(a => a.restoring && a.visibility === 'hidden')), 'restored fragments are staged before announcement');
    const urlA = page.url();
    await page.evaluate(() => { const u = new URL(location); u.searchParams.set('z.order','a,b,c'); u.searchParams.set('top','c'); history.pushState({},'',u); dispatchEvent(new PopStateEvent('popstate')); });
    await page.waitForFunction(() => pudlWindows.state().top === 'c');
    await page.goBack(); await page.waitForFunction(() => pudlWindows.state().top === 'a');
    assert.deepEqual((await state()).zOrder, ['b','c','a']); assert.equal(page.url(), urlA);
    await page.goForward(); await page.waitForFunction(() => pudlWindows.state().top === 'c'); assert.deepEqual((await state()).zOrder, ['a','b','c']);
    await page.goto(address('open=a,failed,c&z.order=c,failed,a&top=a'));
    await settled(['a','c']); assert.deepEqual((await state()).zOrder, ['c','a']);
    assert.deepEqual(errors, []);
    console.log('PASS complete stack reload, normalization, detached state, candidate URLs, taskbar independence, minimization, families, rekey/close, dock bands, delayed load, history and failed fragments');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
