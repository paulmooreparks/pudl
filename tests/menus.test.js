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
  const isOpen = (p, id) => p.evaluate(id => document.getElementById(id).matches(':popover-open'), id);
  const placed = (p, id) => p.waitForFunction(id => {
    const el = document.getElementById(id);
    return el.matches(':popover-open') && !el.classList.contains('placing') && el.style.top;
  }, id);

  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  watch(page);
  await page.goto(ROOT + '/reference.html');
  await page.evaluate(() => document.getElementById('menus').scrollIntoView());

  const btn = page.locator('[popovertarget="demo-menu"]');
  await btn.click();
  await placed(page, 'demo-menu');
  check('menu opens', await isOpen(page, 'demo-menu'));
  const geo = await page.evaluate(() => {
    const b = document.querySelector('[popovertarget="demo-menu"]').getBoundingClientRect();
    const p = document.getElementById('demo-menu');
    const r = p.getBoundingClientRect();
    return { bl: b.left, bb: b.bottom, pl: r.left, pt: r.top, placing: p.classList.contains('placing'),
             pressed: getComputedStyle(document.querySelector('[popovertarget="demo-menu"]')).backgroundImage };
  });
  check('panel opens against its button', Math.abs(geo.pl - geo.bl) < 2 && Math.abs(geo.pt - geo.bb - 4) < 2, JSON.stringify(geo));
  check('panel is not left hidden', !geo.placing);
  check('button looks pressed while open', geo.pressed === 'none', geo.pressed);
  const closedLook = await page.evaluate(() => {
    const b = document.querySelector('[popovertarget="md-trip-menu"]');
    return getComputedStyle(b).backgroundImage;
  });
  check('a closed menu button stays raised', /gradient/.test(closedLook), closedLook);
  await page.screenshot({ path: out('menu-open.png'), clip: { x: 0, y: 0, width: 1280, height: 600 } });

  await page.keyboard.press('Escape');
  check('Escape closes', !(await isOpen(page, 'demo-menu')));

  await btn.click();
  await page.mouse.click(1200, 900);
  check('outside click closes', !(await isOpen(page, 'demo-menu')));

  await btn.focus();
  await page.keyboard.press('ArrowDown');
  check('Down on the button opens and enters', await isOpen(page, 'demo-menu') &&
    (await page.evaluate(() => document.activeElement.textContent.trim())) === 'Receipt');
  await page.keyboard.press('ArrowDown');
  check('Down moves to the next row', (await page.evaluate(() => document.activeElement.textContent.trim())) === 'Approval history');
  await page.keyboard.press('End');
  check('End moves to the last row', /Delete expense/.test(await page.evaluate(() => document.activeElement.textContent)));
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowUp');
  check('Up from the first row returns to the button', await page.evaluate(() =>
    document.activeElement.getAttribute('popovertarget') === 'demo-menu'));

  await btn.click();
  if (!(await isOpen(page, 'demo-menu'))) await btn.click();
  await page.click('#demo-menu .menu-action >> nth=0');
  check('choosing an action closes', !(await isOpen(page, 'demo-menu')));

  // The toolbar menus in the master-detail demo.
  await page.evaluate(() => document.getElementById('md').scrollIntoView());
  await page.click('[popovertarget="md-trip-menu"]');
  check('toolbar Trip menu opens', await isOpen(page, 'md-trip-menu'));
  await page.keyboard.press('Escape');

  // The launcher in the windows demo.
  await page.evaluate(() => document.querySelector('.win-demo').scrollIntoView({ block: 'center' }));
  await page.click('[popovertarget="demo-launcher"]');
  check('launcher opens', await isOpen(page, 'demo-launcher'));
  await page.click('#demo-launcher .md-filter');
  await page.keyboard.type('din');
  const vis = await page.evaluate(() => {
    const p = document.getElementById('demo-launcher');
    return {
      rows: [...p.querySelectorAll('.md-row')].filter(r => !r.hidden).map(r => r.textContent.trim()),
      labels: [...p.querySelectorAll('.md-section-label')].filter(l => !l.hidden).map(l => l.textContent.trim())
    };
  });
  check('filter narrows the rows', JSON.stringify(vis.rows) === '["Team dinner"]', JSON.stringify(vis.rows));
  check('filter hides emptied sections', JSON.stringify(vis.labels) === '["Team"]', JSON.stringify(vis.labels));
  await page.keyboard.press('Enter');
  await page.waitForSelector('.win[data-win="exp-14"]');
  check('Enter opens the first row left', true);
  check('opening a window closes the launcher', !(await isOpen(page, 'demo-launcher')));
  await page.click('[popovertarget="demo-launcher"]');
  check('filter is cleared after closing', await page.evaluate(() =>
    document.querySelector('#demo-launcher .md-filter').value === '' &&
    [...document.querySelectorAll('#demo-launcher .md-row')].every(r => !r.hidden)));
  check('launcher marks the window in front', await page.locator('#demo-launcher .md-row.active a[data-win-open="exp-14"]').count() === 1);
  await page.keyboard.press('Escape');

  await page.click('a[data-win-open="exp-12"] >> nth=1');
  await page.waitForSelector('.win[data-win="exp-12"]');
  await page.click('.win[data-win="exp-12"] a[data-win-open="exp-12-receipt"]');
  await page.waitForSelector('.win[data-win="exp-12-receipt"]');
  check('child rows appear in the sidebar only', await page.locator('.win-demo-list .md-row-child').count() === 1 &&
    await page.locator('#demo-launcher .md-row-child').count() === 0);

  /* Near the bottom of the window, a panel opens upward. */
  const low = await browser.newPage({ viewport: { width: 1280, height: 700 } });
  watch(low);
  await low.goto(ROOT + '/reference.html');
  await low.evaluate(() => {
    const b = document.querySelector('[popovertarget="demo-menu"]');
    window.scrollBy(0, b.getBoundingClientRect().bottom - window.innerHeight + 20);
  });
  await low.click('[popovertarget="demo-menu"]');
  await placed(low, 'demo-menu');
  const up = await low.evaluate(() => {
    const b = document.querySelector('[popovertarget="demo-menu"]').getBoundingClientRect();
    const r = document.getElementById('demo-menu').getBoundingClientRect();
    return { panelBottom: r.bottom, btnTop: b.top };
  });
  check('panel opens upward near the bottom', up.panelBottom <= up.btnTop, JSON.stringify(up));

  /* The sample on a phone: the launcher is a sheet. */
  const ph = await browser.newPage({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  watch(ph);
  await ph.goto(ROOT + '/samples/article-reader.html');
  await ph.click('[popovertarget="launcher"]');
  await placed(ph, 'launcher');
  const sheet = await ph.evaluate(() => {
    const r = document.getElementById('launcher').getBoundingClientRect();
    return { l: r.left, w: r.width, vw: document.documentElement.clientWidth, sheet: document.getElementById('launcher').classList.contains('sheet') };
  });
  check('phone: launcher opens as a full-width sheet', sheet.sheet && Math.abs(sheet.l) < 1 && Math.abs(sheet.w - sheet.vw) < 1, JSON.stringify(sheet));
  await ph.screenshot({ path: out('menu-phone.png') });
  await ph.click('#launcher a[data-win-open="url-state"]');
  await ph.waitForSelector('.win[data-win="url-state"]');
  check('phone: choosing an article opens it and closes the sheet', !(await isOpen(ph, 'launcher')) &&
    await ph.locator('.win[data-win="url-state"]').isVisible());
  check('phone: launcher stays reachable from inside an article', await ph.locator('[popovertarget="launcher"]').isVisible());

  check('no errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
