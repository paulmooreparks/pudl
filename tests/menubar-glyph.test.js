const { launch, ROOT, engine } = require('./lib');
let failures = 0;
function check(name, ok) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name);
  if (!ok) failures++;
}
(async () => {
  const browser = await launch();
  const p = await browser.newPage({ viewport: { width: 1280, height: 700 } });
  await p.goto(ROOT + '/tests/fixtures/menubar.html');
  await p.waitForFunction(() => document.querySelector('.menubar-front') &&
    document.querySelectorAll('[data-applet-state="running"]').length === 2);
  const isOpen = () => p.locator('#menubar-panel').evaluate(el => el.matches(':popover-open'));
  const glyphs = ['.menubar-menu:not(.menubar-front):not(.menubar-one) > .menubar-glyph', '.menubar-front > .menubar-glyph'];
  for (const selector of glyphs) {
    await p.locator(selector).click();
    check('clicking the glyph leaves its first menu open: ' + selector, await isOpen());
    check('the glyph selects its own group\'s first title', await p.locator(selector).evaluate(g => {
      const first = g.parentElement.querySelector('.menubar-title');
      return first.getAttribute('aria-expanded') === 'true' && document.querySelector('#menubar-panel').getAttribute('aria-labelledby') === first.id;
    }));
    await p.keyboard.press('Escape');
    await p.locator(selector).click({ button: 'right' });
    check('a secondary click does not open the menu', !await isOpen());
    await p.keyboard.press('Escape');
    await p.locator(selector).click();
    await p.locator(selector).click();
    check('clicking the same glyph again closes its first menu', !await isOpen());
    await p.keyboard.press('Escape');
  }
  await p.locator(glyphs[0]).click();
  await p.locator(glyphs[1]).click();
  check('clicking another group\'s glyph switches to that group', await isOpen() && await p.locator('.menubar-front .menubar-title').first().getAttribute('aria-expanded') === 'true');
  await p.keyboard.press('Escape');
  await p.evaluate(() => pudlWindows.raise('notes'));
  await p.waitForFunction(() => document.querySelector('.menubar-front').getAttribute('aria-label') === 'Notes');
  await p.click('#note');
  await p.locator(glyphs[1]).click();
  await p.locator('#menubar-panel .menu-action').filter({ hasText: /^About Notes$/ }).click();
  check('a command opened from the glyph returns focus to the prior control', await p.locator('#note').evaluate(el => document.activeElement === el));
  await p.setViewportSize({ width: 390, height: 700 });
  await p.waitForSelector('.menubar-collapsed');
  await p.locator('.menubar-one .menubar-glyph').click();
  check('the collapsed menu glyph still opens its menu', await isOpen());
  await p.locator('.menubar-one .menubar-glyph').click();
  check('the collapsed glyph toggles its menu closed', !await isOpen());
  // Firefox's test adapter does not support touch emulation.
  if (engine !== 'firefox') {
    const mobile = await browser.newPage({ viewport: { width: 390, height: 700 }, hasTouch: true });
    await mobile.goto(ROOT + '/tests/fixtures/menubar.html');
    await mobile.waitForFunction(() => document.querySelector('.menubar-collapsed') &&
      document.querySelectorAll('[data-applet-state="running"]').length === 2);
    const mobileGlyph = mobile.locator('.menubar-one .menubar-glyph');
    await mobileGlyph.tap();
    check('a mobile tap opens the menu', await mobile.locator('#menubar-panel').evaluate(el => el.matches(':popover-open')));
    await mobileGlyph.tap();
    check('a second mobile tap closes the menu', !await mobile.locator('#menubar-panel').evaluate(el => el.matches(':popover-open')));
  }
  await browser.close();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
