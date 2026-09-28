/* Default windows (issue #8) and links inside windows that swap regions
   (issue #7). */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];
  const FIX = ROOT + '/tests/fixtures/default-windows.html';

  /* === Default windows ================================================== */
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(FIX);
  await p.waitForFunction(() => window.pudlWindows);
  await p.evaluate(() => {
    window.__closed = [];
    document.addEventListener('pudl:window-close', e => window.__closed.push(e.detail.key + ':' + e.detail.reason));
  });
  const q = () => p.evaluate(() => location.search);

  check('a bare address opens the default window', await p.locator('.win[data-win="panel"]').isVisible());
  check('and stays bare', (await q()) === '', await q());

  await p.click('#open-note');
  await p.waitForSelector('.win[data-win="note"]');
  let s = await q();
  check('opening another window names both', /open=panel,note/.test(s), s);

  await p.click('.win[data-win="panel"] [data-win-action="close"]');
  s = await q();
  check('closing the default window leaves the other named', /^\?open=note/.test(s), s);
  await p.click('.win[data-win="note"] [data-win-action="close"]');
  s = await q();
  check('closing the last window writes an empty open=', s === '?open=', s);
  check('the close reasons are the button', JSON.stringify(await p.evaluate(() => window.__closed)) === '["panel:button","note:button"]',
        JSON.stringify(await p.evaluate(() => window.__closed)));

  await p.reload();
  await p.waitForFunction(() => window.pudlWindows);
  check('an empty open= keeps the default window closed', await p.locator('.win[data-win="panel"]').count() === 0 && (await q()) === '?open=');

  /* Back to the bare address opens the defaults again. */
  const r = await b.newPage({ viewport: { width: 1280, height: 900 } });
  r.on('pageerror', e => errors.push(e.message));
  await r.goto(FIX);
  await r.waitForFunction(() => window.pudlWindows);
  await r.click('#open-note');
  await r.waitForSelector('.win[data-win="note"]');
  await r.click('.win[data-win="panel"] [data-win-action="close"]');
  await r.evaluate(() => {
    window.__closed = [];
    document.addEventListener('pudl:window-close', e => window.__closed.push(e.detail.key + ':' + e.detail.reason));
  });
  await r.goBack();
  await r.waitForSelector('.win[data-win="panel"]');
  const back = await r.evaluate(() => ({ search: location.search, note: !!document.querySelector('.win[data-win="note"]'), closed: window.__closed }));
  check('Back to the bare address reopens the default window', back.search === '' && !back.note, JSON.stringify(back));
  check('a window the address closed says so', back.closed.join() === 'note:address', back.closed.join());

  /* Moving the default window makes the address say where it is. */
  await r.focus('.win[data-win="panel"] .win-head');
  await r.keyboard.press('ArrowUp');
  await r.waitForFunction(() => /p\.panel=/.test(location.search), null, { timeout: 3000 }).catch(() => {});
  s = await r.evaluate(() => location.search);
  check('a moved default window is named in the address', /open=panel/.test(s) && /p\.panel=floating:/.test(s), s);

  /* === Links inside a window ============================================ */
  const w = await b.newPage({ viewport: { width: 1280, height: 900 } });
  w.on('pageerror', e => errors.push(e.message));
  await w.goto(ROOT + '/samples/article-reader.html?open=elevation&top=elevation');
  await w.waitForSelector('.win[data-win="elevation"]');
  await w.evaluate(() => { document.querySelector('.win[data-win="elevation"]').__mark = true; });
  await w.click('.win[data-win="elevation"] .win-body a[href="article-reader-design.html"]');
  await w.waitForFunction(() => /design/.test(location.pathname) && !document.querySelector('[data-region][aria-busy]'));
  const kept = await w.evaluate(() => ({
    path: location.pathname, search: location.search,
    same: !!(document.querySelector('.win[data-win="elevation"]') || {}).__mark
  }));
  check('a data-region-link in a window swaps the regions and keeps the window', kept.same && /open=elevation/.test(kept.search), JSON.stringify(kept));

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
