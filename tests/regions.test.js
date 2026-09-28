const { launch, ROOT, out, engine } = require('./lib');
const path = require('path');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => errors.push(e.message));
  const windowFetches = [];
  p.on('request', r => { if (/\/windows\//.test(r.url())) windowFetches.push(r.url()); });
  const loads = [];
  p.on('load', () => loads.push(p.url()));
  const S = ROOT + '/samples/';
  const url = () => p.evaluate(() => location.pathname.split('/').pop() + decodeURIComponent(location.search));

  await p.goto(S + 'article-reader.html');
  await p.click('.md-sidebar a[data-win-open="url-state"]');
  await p.waitForSelector('.win[data-win="url-state"]');
  await p.click('.win[data-win="url-state"] [data-win-action="maximize"]');
  await p.click('.md-sidebar a[data-win-open="mixing"]');
  await p.waitForSelector('.win[data-win="mixing"] [data-applet-state="running"]');
  await p.evaluate(() => {
    const r = document.querySelector('.win[data-win="mixing"] input[type="range"]');
    r.value = '70'; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true }));
    const body = document.querySelector('.win[data-win="mixing"] .win-body');
    body.scrollTop = 120;
    document.querySelectorAll('.win').forEach(w => { w.__marker = w.getAttribute('data-win'); });
  });
  const before = await url();
  const fetchesBefore = windowFetches.length;
  const loadsBefore = loads.length;

  await p.click('.section-tab[href="article-reader-design.html"]');
  await p.waitForFunction(() => /design/.test(location.pathname));
  await p.waitForFunction(() => !document.querySelector('[data-region][aria-busy]'));
  let u = await url();
  check('the tab pushes its address with the live windows', /^article-reader-design\.html\?open=url-state,mixing&top=mixing&p\.url-state=floating:.*&p\.mixing=maximized:/.test(u), u);
  check('the list is the Design list', (await p.locator('.md-sidebar .md-row').count()) === 3);
  check('the Design tab is current', await p.evaluate(() => new URL(document.querySelector('.section-tab[aria-current]').href).pathname.endsWith('article-reader-design.html')));
  check('the title follows', /^Design/.test(await p.title()), await p.title());
  const kept = await p.evaluate(() => {
    const w = [...document.querySelectorAll('.win')].map(w => w.__marker);
    const r = document.querySelector('.win[data-win="mixing"] input[type="range"]').value;
    const st = document.querySelector('.win[data-win="mixing"] .win-body').scrollTop;
    return { w, r, st };
  });
  check('the windows are the same elements', JSON.stringify(kept.w) === '["url-state","mixing"]', JSON.stringify(kept));
  check('the applet kept its state', kept.r === '70', kept.r);
  check('the window kept its scroll', kept.st === 120, String(kept.st));
  check('no window was fetched again', windowFetches.length === fetchesBefore, windowFetches.slice(fetchesBefore).join(','));
  check('the page did not reload', loads.length === loadsBefore, loads.join(','));
  check('the new list marks the window in front', await p.locator('.md-sidebar .md-row.active a[data-win-open="mixing"]').count() === 1);

  await p.click('.section-tab[href="article-reader-engineering.html"]');
  await p.waitForFunction(() => /engineering/.test(location.pathname));
  await p.waitForFunction(() => !document.querySelector('[data-region][aria-busy]'));
  check('Engineering shows one article', (await p.locator('.md-sidebar .md-row').count()) === 1);

  await p.goBack();
  await p.waitForFunction(() => document.querySelectorAll('.md-sidebar .md-row').length === 3);
  check('Back swaps the list back', /design/.test(await url()));
  await p.goBack();
  await p.waitForFunction(() => document.querySelectorAll('.md-sidebar .md-row').length === 4);
  check('Back again returns to All', (await url()) === before, await url());
  check('windows survived Back and Forward', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.win')].map(w => w.__marker))) === '["url-state","mixing"]');
  check('still no reload', loads.length === loadsBefore);

  // A window change after the swap, then Back across it: the windows module and regions agree.
  await p.click('.section-tab[href="article-reader-design.html"]');
  await p.waitForFunction(() => /design/.test(location.pathname) && !document.querySelector('[data-region][aria-busy]'));
  await p.click('.md-sidebar a[data-win-open="numerals"]');
  await p.waitForSelector('.win[data-win="numerals"]');
  await p.goBack();
  await p.waitForFunction(() => !document.querySelector('.win[data-win="numerals"]'));
  check('Back over a window change touches only the windows', /design/.test(await url()) &&
    (await p.locator('.md-sidebar .md-row').count()) === 3, await url());

  // The current tab does nothing.
  const l0 = loads.length, f0 = windowFetches.length;
  await p.click('.section-tab[aria-current]');
  await p.waitForTimeout(300);
  check('the current tab does nothing', loads.length === l0 && windowFetches.length === f0 && /design/.test(await url()));

  // Keyboard: focus lands on the same tab in the new bar.
  await p.focus('.section-tab[href="article-reader-engineering.html"]');
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => /engineering/.test(location.pathname) && !document.querySelector('[data-region][aria-busy]'));
  check('focus returns to the tab that was pressed', await p.evaluate(() =>
    document.activeElement && document.activeElement.href && new URL(document.activeElement.href).pathname.endsWith('article-reader-engineering.html')));

  // Stale links are refreshed with the live windows.
  await p.evaluate(() => {
    const a = document.createElement('a');
    a.id = 'stale'; a.href = 'article-reader-engineering.html?cat=x&open=gone';
    a.textContent = 'stale';
    document.querySelector('.md-sidebar').append(a);
  });
  await p.evaluate(() => window.pudlWindows.minimize('url-state'));
  const stale = await p.getAttribute('#stale', 'href');
  check('a same-page link carries the live windows', /^\/samples\/article-reader-engineering\.html\?cat=x&open=url-state,mixing/.test(stale) && !/gone/.test(stale), stale);

  // A GET form in a region is a soft navigation too.
  await p.evaluate(() => {
    const f = document.createElement('form');
    f.method = 'get'; f.action = 'article-reader-design.html'; f.id = 'tf';
    f.innerHTML = '<input name="q" value="colour"><button id="tb">Go</button>';
    document.querySelector('.md-sidebar').append(f);
  });
  const l1 = loads.length;
  await p.click('#tb');
  await p.waitForFunction(() => /design/.test(location.pathname) && /q=colour/.test(location.search) && !document.querySelector('[data-region][aria-busy]'));
  check('a region form swaps and keeps the windows', loads.length === l1 && /open=url-state,mixing/.test(await url()), await url());

  // A page without the same regions is an ordinary navigation.
  await p.evaluate(() => {
    const a = document.createElement('a');
    a.id = 'away'; a.href = '../reference.html'; a.textContent = 'away';
    document.querySelector('.md-sidebar').append(a);
  });
  await p.click('#away');
  await p.waitForURL(/reference\.html/);
  check('an incompatible page is a full navigation', /reference\.html$/.test(p.url()), p.url());

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
