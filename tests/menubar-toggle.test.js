const { launch, ROOT } = require('./lib');
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
  const panel = p.locator('#menubar-panel');
  const isOpen = () => panel.evaluate(el => el.matches(':popover-open'));
  const titles = p.locator('.menubar-menu:not(.menubar-front):not(.menubar-one) .menubar-title');
  const first = titles.nth(0), second = titles.nth(1);
  await first.click();
  check('a title opens its menu', await isOpen());
  await first.click();
  check('clicking the open title closes its menu', !await isOpen());
  await p.keyboard.press('Escape');
  await first.click();
  await second.hover();
  check('hover switches the open menu', await isOpen() && await second.getAttribute('aria-expanded') === 'true');
  check('the switched menu is anchored to its title', await panel.getAttribute('data-menu-anchor') === await second.getAttribute('id'));
  await second.click();
  check('clicking the title opened by hover closes its menu', !await isOpen());
  await p.keyboard.press('Escape');
  await second.focus();
  await p.keyboard.press('Enter');
  check('Enter opens the focused title', await isOpen());
  await second.focus();
  await p.keyboard.press('Enter');
  check('Enter still moves focus into the open menu', await isOpen() && await panel.evaluate(el => el.contains(document.activeElement)));
  await p.keyboard.press('Escape');
  await first.click();
  await p.mouse.click(1250, 680);
  check('an outside click still dismisses the menu', !await isOpen());
  await p.setViewportSize({ width: 390, height: 700 });
  await p.waitForSelector('.menubar-collapsed');
  const collapsed = p.locator('.menubar-one .menubar-title');
  await collapsed.click();
  check('the collapsed title opens its menu', await isOpen());
  await collapsed.click();
  check('the collapsed title toggles its menu closed', !await isOpen());
  await browser.close();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
