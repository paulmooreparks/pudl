/* A window fetched over a slow network must not take focus from whatever
   the reader moved to while it was on its way, such as the "/" palette.
   Reported from parkscomputing.com (Architecture/pudl-bug-summon-focus.md
   in that repository). */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];
  const slow = async page => {
    await page.route('**/samples/windows/*.html', async route => {
      await new Promise(r => setTimeout(r, 600));
      await route.continue();
    });
  };

  /* The reader asks for a window, then presses "/" before it arrives. */
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => errors.push(e.message));
  await slow(p);
  await p.goto(ROOT + '/samples/article-reader.html');
  await p.click('.md-sidebar a[data-win-open="elevation"]');
  await p.keyboard.press('/');
  const early = await p.evaluate(() => document.activeElement.className);
  await p.waitForSelector('.win[data-win="elevation"]');
  await p.waitForTimeout(200);
  const late = await p.evaluate(() => ({ cls: document.activeElement.className, open: document.getElementById('launcher').matches(':popover-open') }));
  check('the palette takes focus at once', early === 'md-filter', early);
  check('a window arriving later leaves focus in the palette', late.cls === 'md-filter' && late.open, JSON.stringify(late));

  /* The reader asks for a window and waits: it takes focus as before. */
  const q = await b.newPage({ viewport: { width: 1280, height: 900 } });
  q.on('pageerror', e => errors.push(e.message));
  await slow(q);
  await q.goto(ROOT + '/samples/article-reader.html');
  await q.click('.md-sidebar a[data-win-open="numerals"]');
  await q.waitForSelector('.win[data-win="numerals"]');
  await q.waitForTimeout(100);
  check('a window the reader waited for takes focus', await q.evaluate(() => document.activeElement.classList.contains('win-head')));

  /* The same holds for a window that replaces another. */
  await q.click('.md-sidebar a[data-win-open="elevation"]');
  await q.waitForSelector('.win[data-win="elevation"]');
  await q.evaluate(() => document.querySelector('.win[data-win="elevation"] a[data-win-replace]').focus());
  await q.keyboard.press('Enter');
  await q.keyboard.press('/');
  await q.waitForSelector('.win[data-win="url-state"]');
  await q.waitForTimeout(200);
  check('a replacing window arriving later leaves focus in the palette', await q.evaluate(() => document.activeElement.className === 'md-filter'));

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
