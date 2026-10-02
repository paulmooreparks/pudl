const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name);
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto(ROOT + '/reference.html');
  const position = () => p.evaluate(() => ({ y: scrollY, url: location.href }));
  for (const selector of [
    '.seg a[href="#seg"]', '.section-tab[href="#tabs"]',
    '.filter-chip-x[href="#tabs"]', 'th a[href="#table"]',
    '.page-link[rel="next"]', '.md-chips-clear',
    '#row-exp-12 .md-meta', '.tree a[href="#trees"]',
    '[role="grid"] a[href="#grid"]'
  ]) {
    const link = p.locator(selector).first();
    await link.scrollIntoViewIfNeeded();
    const before = await position();
    await link.click();
    await p.waitForTimeout(50);
    check('sample link preserves scroll and URL: ' + selector,
      JSON.stringify(await position()) === JSON.stringify(before));
  }
  const next = p.locator('.page-link[rel="next"]');
  await next.focus();
  const before = await position();
  await p.keyboard.press('Enter');
  await p.waitForTimeout(50);
  check('keyboard activation preserves scroll and URL',
    JSON.stringify(await position()) === JSON.stringify(before));

  await p.click('[popovertarget="demo-menu"]');
  const menuBefore = await position();
  await p.click('#demo-menu a');
  await p.waitForTimeout(50);
  check('sample menu closes without navigation',
    JSON.stringify(await position()) === JSON.stringify(menuBefore) &&
    await p.locator('#demo-menu').evaluate(el => !el.matches(':popover-open')));

  await p.click('#tab-receipt');
  check('live panel tabs still update the URL', new URL(p.url()).hash === '#panel-receipt');
  await p.click('.win-demo-list [data-win-open="exp-12"]');
  check('live window links still open their window', await p.locator('.win[data-win="exp-12"]').isVisible());
  await p.locator('.topbar .topbar-pill[href="#menus"]').evaluate(el => el.click());
  await p.waitForURL(/#menus$/);
  check('reference navigation still follows section links', new URL(p.url()).hash === '#menus');
  await b.close();
  process.exitCode = failures ? 1 : 0;
})().catch(e => { console.error(e); process.exit(1); });
