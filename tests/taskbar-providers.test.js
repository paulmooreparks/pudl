const assert = require('assert/strict');
const { launch, ROOT, out } = require('./lib');
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('**/stack-fragments/*.html', route => {
      const key = new URL(route.request().url()).pathname.split('/').at(-1).replace('.html', '');
      const app = key.startsWith('tool'), excluded = key === 'transient';
      return route.fulfill({ contentType: 'text/html', body: `<section class="win" data-win="${key}" data-win-glyph="file" data-win-icon="/provider-picture.svg" data-win-destination="${app ? 'tool' : key}" data-win-destination-provider="${app ? 'applets' : 'articles'}" ${excluded ? 'data-win-pinnable="false"' : ''}><header class="win-head"><h2 class="win-title">${key}</h2></header><div class="win-body"><input aria-label="Article input"></div></section>` });
    });
    let releasePicture;
    await page.route('**/provider-picture.svg', async route => {
      if (releasePicture === undefined) await new Promise(resolve => { releasePicture = resolve; });
      return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="blue"/></svg>' });
    });
    await page.route('**/broken-picture.svg', route => route.fulfill({ status: 404, body: '' }));
    await page.goto(ROOT + '/tests/fixtures/window-stack.html');
    await page.waitForFunction(() => !!window.pudlWindows);
    await page.evaluate(() => {
      window.providerCalls = []; window.policy = 'available';
      window.resolveArticle = ({ id }) => {
        providerCalls.push(id);
        if (policy !== 'available') return { status: policy };
        return { status: 'available', destination: { id, label: 'Article ' + id, href: '/tests/fixtures/taskbar-provider-article.html?id=' + id, icon: '/provider-picture.svg', glyph: 'file' } };
      };
      window.providers = [{ id: 'articles', resolve: resolveArticle }, { id: 'applets', resolve: ({ id }) => ({ status: 'available', destination: { id, label: 'Tool', command: true, glyph: 'app', icon: '/provider-picture.svg' } }) }];
      pudlWindows.configureTaskbar({ providers, pins: [], order: [], references: [] });
    });
    const open = key => page.evaluate(key => pudlWindows.open(key), key);
    const pin = id => page.locator('.win-bar [data-win-pin="' + id + '"]');
    for (const id of ['article-one', 'article-two']) {
      await open(id);
      await page.waitForFunction(id => providerCalls.includes(id), id);
      await page.waitForTimeout(50);
      await page.locator('.win-bar [data-win-tab="' + id + '"]').click({ button: 'right' });
      await page.getByRole('menuitem', { name: 'Pin to taskbar', exact: true }).click();
      await pin(id).waitFor();
    }
    assert.deepEqual(await page.evaluate(() => pudlWindows.taskbarState().pins), ['article-one', 'article-two']);
    assert.equal(await pin('article-one').locator('.win-item-glyph').isVisible(), true, 'loading pictures retain the glyph');
    releasePicture(); releasePicture = null;
    await page.waitForFunction(() => document.querySelector('[data-win-pin="article-one"] .win-item-icon')?.naturalWidth > 0);
    assert.equal(await pin('article-one').locator('.win-item-icon').isVisible(), true);
    await page.evaluate(() => { window.savedPins = pudlWindows.taskbarState(); pudlWindows.close('article-one'); pudlWindows.close('article-two'); });
    assert.equal(await pin('article-one').getAttribute('data-win-pin-running'), 'false');
    assert.equal(await pin('article-one').locator('.win-item-icon').isVisible(), true, 'close-last keeps destination picture');
    const saved = await page.evaluate(() => savedPins);
    assert.deepEqual(saved.references, [{ id: 'article-one', provider: 'articles' }, { id: 'article-two', provider: 'articles' }]);
    await page.reload();
    await page.waitForFunction(() => !!window.pudlWindows);
    await page.evaluate(saved => {
      window.providerCalls = []; window.policy = 'available';
      window.resolveArticle = ({ id }) => { providerCalls.push(id); return policy === 'available' ? { status: 'available', destination: { id, label: 'Article ' + id, href: '/tests/fixtures/taskbar-provider-article.html?id=' + id, icon: '/provider-picture.svg', glyph: 'file' } } : { status: policy }; };
      window.providers = [{ id: 'articles', resolve: resolveArticle }, { id: 'applets', resolve: ({ id }) => ({ status: 'available', destination: { id, label: 'Tool', command: true, icon: '/provider-picture.svg', glyph: 'app' } }) }];
      pudlWindows.configureTaskbar({ providers, ...saved });
    }, saved);
    await page.waitForFunction(() => document.querySelector('[data-win-pin="article-two"]')?.dataset.winPinStatus === 'available');
    assert.equal(await page.locator('.win[data-win="article-two"]').count(), 0, 'dormant resolution does not mount windows');
    await pin('article-two').locator('.win-item-icon:not([hidden])').waitFor();
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
      await page.screenshot({ path: out('taskbar-provider-pictures-' + theme + '.png') });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: out('taskbar-provider-pictures-narrow.png') });
    await page.setViewportSize({ width: 1440, height: 960 });
    assert.equal(await pin('article-two').getAttribute('href'), '/tests/fixtures/taskbar-provider-article.html?id=article-two');
    const newTab = page.context().waitForEvent('page');
    await pin('article-two').click({ modifiers: ['Control'] });
    const articleTab = await newTab;
    await articleTab.waitForURL('**/taskbar-provider-article.html?id=article-two', { timeout: 5000 });
    assert.equal(await articleTab.locator('h1').textContent({ timeout: 5000 }), 'Native article');
    await articleTab.close();
    const switched = await page.evaluate(async () => {
      policy = 'forbidden';
      const changed = pudlWindows.configureTaskbar({ providers, ...pudlWindows.taskbarState(), scope: 'another-principal' });
      const scrubbed = !document.querySelector('[data-win-pin="article-two"]').textContent.includes('Article article-two');
      await pudlWindows.refreshTaskbarDestinations({ provider: 'articles' });
      return { changed, scrubbed };
    });
    assert.deepEqual(switched, { changed: true, scrubbed: true }, 'scope changes invalidate unchanged callbacks and IDs synchronously');
    assert.equal(await pin('article-two').getAttribute('aria-disabled'), 'true');
    assert.equal(await pin('article-two').getAttribute('href'), null);
    assert.equal(await pin('article-two').locator('img').count(), 0);
    assert.equal(await pin('article-two').getAttribute('title').then(x => x.includes('Article article-two')), false, 'private label is scrubbed');
    assert.deepEqual(await page.evaluate(() => pudlWindows.taskbarState().pins), saved.pins);
    await pin('article-two').click({ button: 'right', force: true });
    await page.getByRole('menuitem', { name: 'Unpin from taskbar', exact: true }).click();
    assert.equal(await pin('article-two').count(), 0, 'forbidden pin remains removable');
    await page.evaluate(async () => { policy = 'available'; await pudlWindows.refreshTaskbarDestinations(); });
    for (const id of ['tool-one', 'tool-two', 'transient']) await open(id);
    await page.waitForTimeout(80);
    await page.evaluate(() => pudlWindows.pinTaskbar('tool', true));
    assert.equal(await pin('tool').getAttribute('data-win-stack'), 'pin:tool');
    assert.equal(await pin('tool').locator('.win-item-icon').count(), 1, 'multi-instance aggregate retains destination icon');
    await page.locator('.win-bar [data-win-tab="transient"]').click({ button: 'right' });
    assert.equal(await page.getByRole('menuitem', { name: 'Pin to taskbar', exact: true }).count(), 0);
    await page.keyboard.press('Escape');
    await page.evaluate(async () => {
      window.late = null; window.aborted = false;
      const slow = ({ id, signal }) => new Promise(resolve => { window.late = () => resolve({ status: 'available', destination: { id, label: 'OLD PRIVATE LABEL', command: true } }); signal.addEventListener('abort', () => { aborted = true; }); });
      pudlWindows.configureTaskbar({ providers: [{ id: 'articles', resolve: slow }], pins: ['article-one'], references: [{ id: 'article-one', provider: 'articles' }], order: ['pin:article-one'] });
      await Promise.resolve();
      pudlWindows.configureTaskbar({ providers: [{ id: 'articles', resolve: () => ({ status: 'forbidden' }) }], pins: ['article-one'], references: [{ id: 'article-one', provider: 'articles' }], order: ['pin:article-one'] });
      late();
    });
    await page.waitForFunction(() => document.querySelector('[data-win-pin="article-one"]')?.dataset.winPinStatus === 'forbidden');
    assert.equal(await page.evaluate(() => aborted), true);
    assert.equal(await pin('article-one').innerText().then(x => x.includes('OLD PRIVATE')), false);
    await page.evaluate(async () => {
      pudlWindows.configureTaskbar({ providers: [{ id: 'articles', resolve: ({ id }) => ({ status: 'available', destination: { id, label: 'Broken picture', href: '/article/' + id, icon: '/broken-picture.svg', glyph: 'file' } }) }], pins: ['article-one'], references: [{ id: 'article-one', provider: 'articles' }], order: [] });
    });
    await page.waitForFunction(() => document.querySelector('[data-win-pin="article-one"]')?.dataset.winPinStatus === 'available');
    await page.waitForFunction(() => !document.querySelector('[data-win-pin="article-one"] img'));
    assert.equal(await pin('article-one').locator('.win-item-glyph').isVisible(), true);
    const lifecycle = await page.evaluate(async () => {
      let fail = true, count = 0;
      const resolve = ({ id }) => { count++; if (fail) throw new Error('temporary provider failure'); return { status: 'available', destination: { id, label: 'Retry ready', command: true } }; };
      pudlWindows.configureTaskbar({ providers: [{ id: 'articles', resolve }], pins: ['article-one'], references: [{ id: 'article-one', provider: 'articles' }], order: ['pin:article-one'] });
      await pudlWindows.refreshTaskbarDestinations();
      const failed = document.querySelector('[data-win-pin="article-one"]').dataset.winPinStatus;
      fail = false; await pudlWindows.refreshTaskbarDestinations();
      const ready = document.querySelector('[data-win-pin="article-one"]').dataset.winPinStatus;
      pudlWindows.configureTaskbar({ providers: [], ...pudlWindows.taskbarState() });
      const unavailable = document.querySelector('[data-win-pin="article-one"]').dataset.winPinStatus;
      pudlWindows.configureTaskbar({ providers: [{ id: 'articles', pinnable: false, resolve }], ...pudlWindows.taskbarState() });
      await pudlWindows.refreshTaskbarDestinations();
      const excluded = document.querySelector('[data-win-pin="article-one"]').dataset.winPinStatus;
      const removed = pudlWindows.pinTaskbar('article-one', false);
      return { failed, ready, unavailable, excluded, removed, called: count > 0 };
    });
    assert.deepEqual(lifecycle, { failed: 'failed', ready: 'available', unavailable: 'unavailable', excluded: 'excluded', removed: true, called: true });
    await page.evaluate(async () => {
      const ids = Array.from({ length: 10 }, (_, i) => 'overview-' + i);
      window.overflowBroken = false;
      pudlWindows.configureTaskbar({
        providers: [{ id: 'articles', resolve: ({ id }) => ({ status: 'available', destination: { id, label: 'Overview article ' + id, command: true, icon: overflowBroken ? '/broken-picture.svg' : '/provider-picture.svg', glyph: 'file' } }) }],
        pins: ids, references: ids.map(id => ({ id, provider: 'articles' })), order: ids.map(id => 'pin:' + id)
      });
      await pudlWindows.refreshTaskbarDestinations();
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.win-bar-more:not([hidden])').click();
    await page.locator('.context-menu:popover-open .win-item-icon:not([hidden])').first().waitFor();
    await page.screenshot({ path: out('taskbar-provider-overflow.png') });
    await page.evaluate(async () => { overflowBroken = true; await pudlWindows.refreshTaskbarDestinations(); });
    assert.equal(await page.locator('.context-menu:popover-open .menu-action').filter({ hasText: 'Overview article' }).locator('.win-item-icon').count(), 0, 'overflow shares broken-picture fallback');
    await page.keyboard.press('Escape');
    const invalid = await page.evaluate(() => pudlWindows.configureTaskbar({ destinations: [{ id: 'unsafe', label: 'Unsafe', icon: 'javascript:alert(1)' }] }));
    assert.equal(invalid, false);
    assert.deepEqual(await page.evaluate(() => [
      pudlWindows.configureTaskbar({ providers: [{ id: 123, resolve() {} }] }),
      pudlWindows.configureTaskbar({ providers: [], references: [{ id: 123, provider: 'articles' }] }),
      pudlWindows.configureTaskbar({ providers: [], scope: 123 })
    ]), [false, false, false], 'malformed scope and identity values reject configuration');
    await page.screenshot({ path: out('taskbar-providers.png') });
    assert.deepEqual(errors, []);
    console.log('PASS provider defaults, two articles, dormant references, pictures, exclusions, canonical instances, principal races and image fallback');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
