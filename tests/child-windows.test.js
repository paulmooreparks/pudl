const { launch, ROOT, out, engine } = require('./lib');
const path = require('path');

let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}

(async () => {
  const browser = await launch();
  const errors = [];
  function watch(page) {
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) errors.push(r.status() + ' ' + r.url()); });
  }

  /* === Reference page ==================================================== */
  const page = await browser.newPage({ viewport: { width: 1280, height: 1300 } });
  watch(page);
  const REF = ROOT + '/reference.html';
  await page.goto(REF);
  await page.evaluate(() => document.querySelector('.win-demo').scrollIntoView({ block: 'center' }));
  const q = () => page.evaluate(() => decodeURIComponent(location.search));

  await page.click('.win-demo-list a[data-win-open="exp-12"]');
  await page.waitForSelector('.win[data-win="exp-12"]');
  check('opening an expense marks its row', await page.locator('.win-demo-list .md-row.active a[data-win-open="exp-12"]').count() === 1);

  /* .card-desc, not the hidden page menu, which names the same target for
     the menu bar to read. */
  await page.click('.win[data-win="exp-12"] .card-desc a[data-win-open="exp-12-receipt"]');
  await page.waitForSelector('.win[data-win="exp-12-receipt"]');
  let s = await q();
  check('child opens and is in the URL', /open=exp-12,exp-12-receipt/.test(s) && /top=exp-12-receipt/.test(s), s);
  check('child opens in its floating parent\'s state, one step on', /p\.exp-12-receipt=floating:0\.39,0\.07,0\.5,0\.72/.test(s), s);
  check('dock shows only the parent', await page.locator('.win-tab').count() === 1 &&
    await page.locator('.win-tab[data-win-tab="exp-12"]').count() === 1);
  check('dock marks parent current while child in front',
    (await page.getAttribute('.win-tab[data-win-tab="exp-12"]', 'aria-current')) === 'true');
  const childRow = page.locator('.md-row-child[data-win-child="exp-12-receipt"]');
  check('child row appears', await childRow.count() === 1);
  check('child row sits under its parent', await page.evaluate(() => {
    const p = document.querySelector('.win-demo-list a[data-win-open="exp-12"]').closest('.md-row');
    return p.nextElementSibling && p.nextElementSibling.getAttribute('data-win-child') === 'exp-12-receipt';
  }));
  check('child row names the child', (await childRow.textContent()).trim() === 'Receipt: Hotel, Makati');
  check('parent row and child row both marked', await page.locator('.win-demo-list .md-row.active').count() === 2);
  const z = await page.evaluate(() => [
    +document.querySelector('.win[data-win="exp-12"]').style.zIndex,
    +document.querySelector('.win[data-win="exp-12-receipt"]').style.zIndex]);
  check('child stacks above parent', z[1] > z[0], JSON.stringify(z));

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.win[data-win="exp-12-receipt"]'));
  s = await q();
  check('Escape closes the child', !/receipt/.test(s) && /top=exp-12/.test(s), s);
  check('child row goes with it', await childRow.count() === 0);
  check('focus returns to the link that opened it', await page.evaluate(() =>
    document.activeElement && document.activeElement.getAttribute('data-win-open') === 'exp-12-receipt'));

  await page.keyboard.press('Escape');
  check('Escape leaves a top-level window alone', await page.locator('.win[data-win="exp-12"]').count() === 1);

  // Open another expense, then the child, and check the family comes forward together.
  await page.click('.win-demo-list a[data-win-open="exp-13"]');
  await page.waitForSelector('.win[data-win="exp-13"]');
  check('other expense takes the row mark', await page.locator('.win-demo-list .md-row.active a[data-win-open="exp-13"]').count() === 1 &&
    await page.locator('.win-demo-list .md-row.active a[data-win-open="exp-12"]').count() === 0);
  await page.click('.win-tab[data-win-tab="exp-12"]');
  await page.click('.win[data-win="exp-12"] .card-desc a[data-win-open="exp-12-receipt"]');
  await page.waitForSelector('.win[data-win="exp-12-receipt"]');
  await page.click('.win-tab[data-win-tab="exp-13"]');
  check('child row stays while its parent is behind', await page.locator('.md-row-child[data-win-child="exp-12-receipt"]').count() === 1);
  await page.click('.win-tab[data-win-tab="exp-12"]');
  s = await q();
  check('parent tab brings the child to the front', /top=exp-12-receipt/.test(s), s);
  const z2 = await page.evaluate(() => ['exp-12', 'exp-12-receipt', 'exp-13'].map(k => +document.querySelector('.win[data-win="' + k + '"]').style.zIndex));
  check('family stacks above the other window', z2[0] > z2[2] && z2[1] > z2[0], JSON.stringify(z2));

  // Minimise the parent from its tab: the child hides too.
  await page.click('.win-tab[data-win-tab="exp-12"]');
  s = await q();
  check('minimizing parent hides child', /min=exp-12/.test(s) &&
    !(await page.locator('.win[data-win="exp-12-receipt"]').isVisible()) &&
    !(await page.locator('.win[data-win="exp-12"]').isVisible()), s);
  check('front passes to the other window', /top=exp-13/.test(s), s);

  await page.reload();
  await page.waitForSelector('.win[data-win="exp-12-receipt"]', { state: 'attached' });
  check('reload keeps the child row', await page.locator('.md-row-child[data-win-child="exp-12-receipt"]').count() === 1);
  check('reload keeps the child hidden with its parent', !(await page.locator('.win[data-win="exp-12-receipt"]').isVisible()));

  await page.click('.win-tab[data-win-tab="exp-12"]');
  check('restoring parent shows child', await page.locator('.win[data-win="exp-12-receipt"]').isVisible());

  await page.evaluate(() => document.querySelector('.win[data-win="exp-12"] [data-win-action="close"]').click());
  s = await q();
  check('closing parent closes child', !/exp-12/.test(s) && await page.locator('.win[data-win="exp-12-receipt"]').count() === 0, s);

  /* === Article reader sample, desktop ==================================== */
  const SAMPLE = ROOT + '/samples/article-reader.html';
  const sp = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  watch(sp);
  await sp.goto(SAMPLE);
  const sq = () => sp.evaluate(() => decodeURIComponent(location.search));
  await sp.click('.md-sidebar a[data-win-open="url-state"]');
  await sp.waitForSelector('.win[data-win="url-state"]');
  s = await sq();
  check('sample: article opens maximized', /p\.url-state=maximized:/.test(s), s);
  const host = await sp.locator('.win-host').boundingBox();
  const wb = await sp.locator('.win[data-win="url-state"]').boundingBox();
  check('sample: article fills the stage', Math.abs(wb.width - host.width) < 2 && Math.abs(wb.height - host.height) < 2);
  await sp.click('a[data-win-open="url-state-example"]');
  await sp.waitForSelector('.win[data-win="url-state-example"]');
  await sp.keyboard.press('Escape');
  await sp.click('a[data-win-open="url-state-parse"]');
  await sp.waitForSelector('.win[data-win="url-state-parse"]');
  await sp.keyboard.press('Escape');
  await sp.click('a[data-win-open="url-state-example"]');
  await sp.waitForSelector('.win[data-win="url-state-example"]');
  // Reopen the second listing through the URL route: open it then check two rows.
  await sp.goto(SAMPLE + '?open=url-state,url-state-example,url-state-parse&top=url-state-parse');
  await sp.waitForSelector('.win[data-win="url-state-parse"]');
  const rows = await sp.evaluate(() => [...document.querySelectorAll('.md-row-child')].map(r => r.getAttribute('data-win-child')));
  check('sample: two listings, two rows, in order', JSON.stringify(rows) === '["url-state-example","url-state-parse"]', JSON.stringify(rows));
  check('sample: URL without placements still opens maximized', await sp.evaluate(() =>
    document.querySelector('.win[data-win="url-state"]').getAttribute('data-win-mode') === 'maximized'));
  await sp.locator('.md-sidebar').screenshot({ path: out('sample-sidebar.png') });
  await sp.screenshot({ path: out('sample-desktop.png') });

  /* === Article reader sample, phone ====================================== */
  const ph = await browser.newPage({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  watch(ph);
  await ph.goto(SAMPLE);
  check('phone: list shows first', await ph.locator('.md-sidebar').isVisible() && !(await ph.locator('.reader-stage').isVisible()));
  await ph.click('.md-sidebar a[data-win-open="elevation"]');
  await ph.waitForSelector('.win[data-win="elevation"]');
  check('phone: article replaces the list', !(await ph.locator('.md-sidebar').isVisible()) && await ph.locator('.win[data-win="elevation"]').isVisible());
  check('phone: back link shows', await ph.locator('.md-back').isVisible());
  check('phone: nothing overflows', await ph.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  await ph.screenshot({ path: out('sample-phone-article.png') });
  await ph.click('.md-back');
  const ps = await ph.evaluate(() => decodeURIComponent(location.search));
  check('phone: back returns to the list, article kept minimized', await ph.locator('.md-sidebar').isVisible() && /min=elevation/.test(ps), ps);
  await ph.click('.md-sidebar a[data-win-open="elevation"]');
  check('phone: tapping the article again brings it back', await ph.locator('.win[data-win="elevation"]').isVisible());

  check('no errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
