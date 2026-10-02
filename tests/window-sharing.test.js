const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const browser = await launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await context.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(() => {
    window.copied = [];
    window.copyEvents = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: text => { window.copied.push(text); return Promise.resolve(); }
    } });
    document.addEventListener('pudl:window-link-copy', e => window.copyEvents.push(e.detail));
  });
  const sample = ROOT + '/samples/shared-window.html';
  const snapshot = () => p.evaluate(() => ({
    url: location.href, history: history.state, length: history.length, state: pudlWindows.state()
  }));
  await p.goto(sample);
  await p.waitForFunction(() => window.pudlWindows && pudlWindows.state().top === 'article');
  await p.click('[data-win-open="notes"]');
  await p.waitForFunction(() => pudlWindows.state().top === 'notes');
  await p.evaluate(() => {
    pudlWindows.snap('article', 'left');
    pudlWindows.raise('article');
    history.replaceState({ host: 'preserve me' }, '', location.href);
  });
  const before = await snapshot();
  check('the host can export a selected state from the front window', await p.evaluate(() => pudlWindows.shareURL()) === sample);
  check('a window without a share or page address has no share URL', await p.evaluate(() => pudlWindows.shareURL('notes')) === null);
  check('unknown windows have no share URL', await p.evaluate(() => pudlWindows.shareURL('missing')) === null);
  check('inherited object names are not windows', await p.evaluate(() => pudlWindows.shareURL('toString')) === null);
  check('copying a window without an address returns false', await p.evaluate(() => pudlWindows.copyLink('notes')) === false);
  check('no copy attempt is reported without an address', await p.evaluate(() => copyEvents.length === 0));
  await p.click('.win[data-win="article"] [data-win-action="menu"]');
  await p.locator('#win-menu-article [data-win-cmd="copy-link"]').click();
  await p.waitForFunction(() => copied.length === 1);
  check('the window menu copies the crafted article address', await p.evaluate(() => copied[0]) === sample);
  check('sharing preserves the URL, history entry and full workspace', JSON.stringify(await snapshot()) === JSON.stringify(before));
  check('successful copying reports its result', await p.evaluate(() => copyEvents[0].ok && copyEvents[0].key === 'article' && copyEvents[0].href === copied[0]));

  const fresh = await p.context().newPage();
  await fresh.goto(await p.evaluate(() => copied[0]));
  await fresh.waitForFunction(() => window.pudlWindows && pudlWindows.state().top === 'article');
  check('a fresh visit restores the exported article alone without private history', await fresh.evaluate(() =>
    history.state === null && pudlWindows.state().open.join(',') === 'article' && pudlWindows.state().place.article.mode === 'maximized'));
  await fresh.goto(before.url);
  await fresh.waitForFunction(() => window.pudlWindows && pudlWindows.state().open.length === 2);
  check('the workspace URL independently restores the larger arrangement', JSON.stringify(await fresh.evaluate(() => pudlWindows.state())) === JSON.stringify(before.state));
  await fresh.reload();
  await fresh.waitForFunction(() => window.pudlWindows && pudlWindows.state().open.length === 2);
  check('reload restores the workspace from its URL', JSON.stringify(await fresh.evaluate(() => pudlWindows.state())) === JSON.stringify(before.state));
  await fresh.goBack();
  await fresh.waitForFunction(() => window.pudlWindows && pudlWindows.state().open.join(',') === 'article');
  check('Back restores the crafted article view', await fresh.evaluate(() => pudlWindows.state().place.article.mode) === 'maximized');
  await fresh.goForward();
  await fresh.waitForFunction(() => window.pudlWindows && pudlWindows.state().open.length === 2);
  check('Forward restores the complete workspace', JSON.stringify(await fresh.evaluate(() => pudlWindows.state())) === JSON.stringify(before.state));
  await fresh.close();
  const noScript = await browser.newPage({ javaScriptEnabled: false });
  await noScript.goto(sample);
  check('the crafted address serves its article without JavaScript', await noScript.locator('.win[data-win="article"] .win-body').isVisible());
  await noScript.close();

  await p.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('denied')); });
  const dialog = new Promise(resolve => p.once('dialog', async d => {
    const value = d.defaultValue();
    await d.dismiss();
    resolve(value);
  }));
  const denied = p.evaluate(() => pudlWindows.copyLink('article'));
  check('a refused clipboard write offers the crafted URL for manual copying', await dialog === sample);
  check('manual copying does not claim clipboard success', await denied === false);
  await p.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }); });
  const absentDialog = new Promise(resolve => p.once('dialog', async d => {
    const value = d.defaultValue(); await d.dismiss(); resolve(value);
  }));
  const absent = p.evaluate(() => pudlWindows.copyLink());
  check('a missing clipboard API offers the same manual fallback', await absentDialog === sample && await absent === false);

  for (const href of ['', 'javascript:alert(1)', 'data:text/html,example', 'http://[']) {
    await p.evaluate(href => document.querySelector('[data-win="article"]').setAttribute('data-win-href', href), href);
    check('unusable share address is not offered: ' + JSON.stringify(href), await p.evaluate(() => pudlWindows.shareURL('article')) === null);
  }
  await p.click('.win[data-win="article"] [data-win-action="menu"]');
  check('an invalid share URL omits the window menu command', await p.locator('#win-menu-article [data-win-cmd="copy-link"]').count() === 0);
  await p.keyboard.press('Escape');
  await p.evaluate(() => document.querySelector('[data-win="article"]').setAttribute('data-win-href', '/samples/shared-window.html?view=reading#article'));
  check('root-relative addresses preserve their chosen query and fragment', await p.evaluate(() => pudlWindows.shareURL('article')) === sample + '?view=reading#article');
  await p.evaluate(() => document.querySelector('[data-win="article"]').setAttribute('data-win-href', 'https://example.com/story?view=reading#part'));
  check('a host can export an absolute content address', await p.evaluate(() => pudlWindows.shareURL('article')) === 'https://example.com/story?view=reading#part');

  await p.goto(ROOT + '/tests/fixtures/menubar.html?open=article');
  await p.waitForSelector('.menubar-front .menubar-title');
  check('the existing Open as a page link remains the share fallback', (await p.evaluate(() => pudlWindows.shareURL('article'))).endsWith('#article-page'));
  await p.evaluate(() => document.querySelector('.win[data-win="article"]').setAttribute('data-win-href', '../../samples/shared-window.html'));
  await p.locator('.menubar-front .menubar-title').first().click();
  await p.locator('#menubar-panel .menu-action').filter({ hasText: /^Copy the link$/ }).click();
  await p.waitForFunction(() => copied.length === 1);
  check('the article menu uses the same crafted URL as the window menu', await p.evaluate(() => copied[0]) === sample);
  check('Open as a page retains its independent destination', (await p.locator('.win[data-win="article"] [data-win-action="page"]').getAttribute('href')) === '#article-page');
  await p.evaluate(() => document.querySelector('.win[data-win="article"]').setAttribute('data-win-href', ''));
  await p.locator('.menubar-front .menubar-title').first().click();
  check('an explicit empty address also removes the article menu copy command', await p.locator('#menubar-panel .menu-action').filter({ hasText: /^Copy the link$/ }).count() === 0);
  check('no browser errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
