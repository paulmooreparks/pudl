/* A command in the menu markup that holds a picture shows it as its
   row's icon (0.64.0), and its words are unchanged by it. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + (detail || '')));
  if (!ok) failures++;
}
(async () => {
  const browser = await launch();
  const p = await browser.newPage({ viewport: { width: 1280, height: 700 } });
  await p.goto(ROOT + '/tests/fixtures/menubar.html');
  await p.waitForFunction(() => document.querySelector('.menubar-front') &&
    document.querySelectorAll('[data-applet-state="running"]').length === 2);
  await p.locator('.menubar-menu:not(.menubar-front):not(.menubar-one) .menubar-title').first().click();
  const row = p.locator('#menubar-panel .menu-action').filter({ hasText: /^Coincidences$/ });
  check('the command with a picture is listed by its words alone', await row.count() === 1);
  const icon = await row.evaluate(r => { const i = r.querySelector('.menubar-icon img'); return i ? { src: i.getAttribute('src').slice(0, 14), first: r.firstElementChild.classList.contains('menubar-icon'), hidden: r.querySelector('.menubar-icon').getAttribute('aria-hidden') } : null; });
  check('its picture is the row\'s icon, before the words and hidden from readers', !!icon && icon.src === 'data:image/svg' && icon.first && icon.hidden === 'true', JSON.stringify(icon));
  const plain = p.locator('#menubar-panel .menu-action').filter({ hasText: /^Home$/ });
  check('a command without a picture has no icon', await plain.evaluate(r => !r.querySelector('.menubar-icon')));
  await p.keyboard.press('Escape');
  await browser.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
