const assert = require('assert/strict');
const { launch, ROOT } = require('./lib');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    let fail = true, requests = 0, release, routeReady;
    const held = new Promise(resolve => { routeReady = resolve; });
    await page.route('**/tests/fixtures/window-stack.html', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace('data-win-layer ', 'data-win-layer data-win-required="required" ') });
    });
    await page.route('**/stack-fragments/*.html', async route => {
      const key = new URL(route.request().url()).pathname.split('/').at(-1).replace('.html', '');
      requests++;
      if (key === 'slow') await new Promise(resolve => { release = resolve; routeReady(); });
      if (key === 'retry' && fail) return route.fulfill({ status: 503, body: 'Unavailable' });
      return route.fulfill({ contentType: 'text/html', body: '<section class="win" data-win="' + key + '"><header class="win-head"><h2 class="win-title">' + key + '</h2></header><div class="win-body"><input aria-label="Working input"></div></section>' });
    });
    await page.goto(ROOT + '/tests/fixtures/window-stack.html');
    await page.waitForFunction(() => !!window.pudlWindows);
    await page.waitForSelector('[data-win="required"]:not([data-win-restoring])');
    const result = await page.evaluate(async () => {
      const result = await pudlWindows.open('a');
      return { key: result.key, status: result.status, connected: result.window.isConnected, error: result.error, announced: arrivals.some(x => x.key === 'a') };
    });
    assert.deepEqual(result, { key: 'a', status: 'opened', connected: true, error: null, announced: true });
    assert.equal(await page.evaluate(async () => (await pudlWindows.open('a')).status), 'existing');
    assert.deepEqual(await page.evaluate(async () => {
      const result = await pudlWindows.open('retry');
      return { status: result.status, missing: result.window === null, error: result.error instanceof Error };
    }), { status: 'failed', missing: true, error: true });
    fail = false;
    assert.equal(await page.evaluate(async () => (await pudlWindows.open('retry')).status), 'opened');
    const started = page.waitForRequest('**/stack-fragments/slow.html');
    assert.equal(await page.evaluate(() => {
      window.slow = pudlWindows.replace('a', 'slow');
      return slow === pudlWindows.open('slow');
    }), true, 'open and replace share the in-flight result');
    await started; await held; release();
    assert.equal(await page.evaluate(async () => (await slow).status), 'opened');
    assert.equal(await page.locator('[data-win="a"]').count(), 0);
    assert.equal(await page.evaluate(async () => (await pudlWindows.replace('missing', 'slow')).status), 'existing');
    assert.equal(await page.evaluate(async () => (await pudlWindows.replace('required', 'blocked')).status), 'blocked');
    assert.equal(await page.evaluate(async () => (await pudlWindows.open('invalid key')).status), 'failed');
    assert.ok(requests >= 4);

    // Taskbar failure settlement follows the fetch result without a deadline.
    fail = true;
    await page.evaluate(() => {
      pudlWindows.close('retry'); window.settlements = [];
      pudlWindows.configureTaskbar({ destinations: [{ id: 'retry', label: 'Retry' }], pins: ['retry'] });
      const layer = document.querySelector('[data-win-layer]');
      layer.addEventListener('pudl:taskbar-activate', e => {
        e.preventDefault();
        e.detail.waitUntil(pudlWindows.open(e.detail.id).then(result => {
          if (result.status === 'failed') throw result.error;
        }));
      });
      layer.addEventListener('pudl:taskbar-activation-end', e => settlements.push(e.detail.status));
    });
    await page.locator('[data-win-pin="retry"]').click();
    await page.waitForFunction(() => settlements.length === 1);
    assert.deepEqual(await page.evaluate(() => settlements), ['failed']);
    assert.equal(await page.locator('[data-win-pin="retry"]').getAttribute('aria-busy'), 'false');
    fail = false;
    await page.locator('[data-win-pin="retry"]').click();
    await page.waitForFunction(() => settlements.length === 2);
    assert.deepEqual(await page.evaluate(() => settlements), ['failed', 'completed']);
    assert.deepEqual(errors, []);
    console.log('PASS open/replace completion, existing and blocked results, failed load retry, shared in-flight promise and immediate taskbar failure settlement');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
