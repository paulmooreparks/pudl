const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (!ok ? ' ' + JSON.stringify(detail) : ''));
  if (!ok) failures++;
}
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(ROOT + '/tests/fixtures/window-menu.html');
    await page.waitForSelector('#win-menu-counter', { state: 'attached' });
    for (const skin of ['bevel', 'gel', 'glaze', 'matte', 'ink', 'alloy', 'glass']) {
      await page.addStyleTag({ url: ROOT + '/dist/pudl-skin-' + skin + '.css' });
    }
    await page.addStyleTag({ content: '* { transition: none !important; animation: none !important; }' });
    const settle = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const paint = () => page.evaluate(() => {
      const s = getComputedStyle(document.querySelector('[data-win="counter"] .win-head [data-win-action="menu"]'));
      return [s.backgroundColor, s.backgroundImage, s.boxShadow];
    });
    for (const theme of ['light', 'dark']) for (const skin of ['standard', 'bevel', 'gel', 'glaze', 'matte', 'ink', 'alloy', 'glass']) {
      await page.evaluate(({ theme, skin }) => {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-skin', skin);
      }, { theme, skin });
      await settle();
      const closed = await paint();
      await page.evaluate(() => document.querySelector('#win-menu-counter').showPopover());
      await settle();
      const open = await paint();
      check(theme + ' ' + skin + ' menu paints its invoker as open', JSON.stringify(open) !== JSON.stringify(closed), { closed, open });
      await page.keyboard.press('Escape');
      await settle();
      check(theme + ' ' + skin + ' Escape restores the invoker paint', JSON.stringify(await paint()) === JSON.stringify(closed));
    }
    await page.evaluate(() => {
      const win = document.querySelector('[data-win="counter"]');
      win.setAttribute('data-win-chrome', 'compact');
    });
    const compact = () => page.evaluate(() => {
      const head = document.querySelector('[data-win="counter"] .win-head');
      return [...head.querySelectorAll('[data-win-action]:not([data-win-action="menu"])')].every(el => getComputedStyle(el).display === 'none');
    });
    check('compact chrome hides secondary actions', await compact());
    await page.evaluate(() => {
      const win = document.querySelector('[data-win="counter"]');
      win.insertBefore(document.querySelector('#win-menu-counter'), win.firstChild);
    });
    const before = await paint();
    await page.evaluate(() => document.querySelector('#win-menu-counter').showPopover());
    await settle();
    check('a menu preceding its header still paints its invoker as open', JSON.stringify(await paint()) !== JSON.stringify(before));
    await page.evaluate(() => document.querySelector('#win-menu-counter').hidePopover());
    await settle();
    check('direct API dismissal restores the invoker paint', JSON.stringify(await paint()) === JSON.stringify(before));
    check('no page errors', !errors.length, errors);
  } finally { await browser.close(); }
  process.exitCode = failures ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 1; });
