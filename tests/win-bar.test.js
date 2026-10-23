/* The taskbar (preview): PUDL's glyphs on its own controls, minimize all
   and restore all sharing one place, close all as a real link that each
   window may refuse, the page's own buttons on either side of the dock, the
   tray, and presses at the bar's edge reaching the nearest control. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];
  const p = await b.newPage({ viewport: { width: 1400, height: 800 } });
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/samples/menu-ribbon.html');
  await p.waitForSelector('.win-dock [data-win-tab="reader"]');

  const shape = await p.evaluate(() => {
    const bar = document.querySelector('.win-bar');
    const mask = sel => { const s = getComputedStyle(document.querySelector(sel), '::before'); return s.maskImage || s.webkitMaskImage; };
    const kids = Array.from(bar.children).filter(k => k.getClientRects().length).map(k => k.id || k.className.split(' ')[0]);
    return { kids, back: mask('[data-win-back]'), close: mask('[data-win-close-all]'), restoreShown: !!document.querySelector('[data-win-restore]').getClientRects().length };
  });
  check('the page\'s button, the dock, the tray and PUDL\'s controls stand in the order the markup gives',
    shape.kids.join(',') === 'sidebar-toggle,win-dock,status-area,icon-btn,icon-btn', shape.kids.join(','));
  check('PUDL\'s controls with no picture of their own take PUDL\'s glyphs, each its own',
    /svg/.test(shape.back) && /svg/.test(shape.close) && shape.back !== shape.close);
  check('restore all stays hidden while minimize all is the useful one', !shape.restoreShown);

  /* Toasts stand above a taskbar along the foot, and drop back when it
     moves to the top (0.80.0). */
  const toasts = async () => p.evaluate(async () => {
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    let region = document.querySelector('.toast-region');
    if (!region) { region = document.createElement('div'); region.className = 'toast-region'; region.innerHTML = '<div class="toast">Saved</div>'; document.body.appendChild(region); }
    const bar = document.querySelector('.win-bar').getBoundingClientRect();
    return { regionBottom: Math.round(region.getBoundingClientRect().bottom), barTop: Math.round(bar.top), clear: getComputedStyle(document.documentElement).getPropertyValue('--win-bar-clear'), h: innerHeight };
  });
  const atFoot = await toasts();
  check('toasts stand above a taskbar along the foot', atFoot.regionBottom <= atFoot.barTop && parseFloat(atFoot.clear) > 0, JSON.stringify(atFoot));
  await p.evaluate(() => document.getElementById('bar-top').click());
  const atTop = await toasts();
  check('with the taskbar at the top, toasts keep to the foot', atTop.clear === '0px' && atTop.regionBottom > atTop.h - 40, JSON.stringify(atTop));
  await p.evaluate(() => { document.getElementById('bar-bottom').click(); document.querySelector('.toast-region').remove(); });

  /* The bar's edges: a press in its bottom padding under a dock button
     brings that window forward; a right-click there opens its menu. The
     press is 2px from the edge, since Firefox's driver drops one on the
     viewport's last row. */
  const bar = await p.locator('.win-bar').boundingBox();
  const tab = await p.locator('.win-dock [data-win-tab="reader"]').boundingBox();
  await p.mouse.click(tab.x + tab.width / 2, bar.y + bar.height - 2);
  await p.waitForFunction(() => pudlWindows.state().top === 'reader');
  check('a press at the bar\'s edge reaches the button above it', true);
  await p.mouse.click(tab.x + tab.width / 2, bar.y + bar.height - 2, { button: 'right' });
  const menu = await p.waitForFunction(() => document.querySelector('.context-menu:popover-open')).then(() => true, () => false);
  check('a right-click at the bar\'s edge opens that button\'s menu', menu);
  await p.keyboard.press('Escape');

  /* The bar's own menu, anywhere but a window's button, including on
     PUDL's own controls. */
  const barMenu = async (x, y) => {
    await p.mouse.click(x, y, { button: 'right' });
    await p.waitForFunction(() => document.querySelector('.context-menu:popover-open'));
    const rows = await p.evaluate(() => [...document.querySelector('.context-menu:popover-open').children].map(c => c.matches('.menu-sep') ? '-' : c.textContent.trim() + (c.getAttribute('aria-disabled') === 'true' ? '(off)' : '')).join('|'));
    await p.keyboard.press('Escape');
    return rows;
  };
  const back = await p.locator('[data-win-back]').boundingBox();
  const middle = await barMenu(bar.x + bar.width / 2, bar.y + bar.height / 2);
  const onBack = await barMenu(back.x + back.width / 2, back.y + back.height / 2);
  check('a right-click on the bar, or on its own controls, opens its menu, each row disabled while it would change nothing',
    middle === 'Minimize all|Restore all(off)|-|Close all windows' && onBack === middle, middle + ' / ' + onBack);

  /* Above the window area: its rule along its foot, and a window button's
     menu opening below it. */
  await p.evaluate(() => document.getElementById('bar-top').click());
  await p.click('.win-dock [data-win-tab="notes"]', { button: 'right' });
  await p.waitForFunction(() => document.querySelector('.context-menu:popover-open'));
  const top = await p.evaluate(() => {
    const bar = document.querySelector('.win-bar'), cs = getComputedStyle(bar);
    return { rule: cs.borderTopWidth + '/' + cs.borderBottomWidth, below: document.querySelector('.context-menu:popover-open').getBoundingClientRect().top >= bar.getBoundingClientRect().top + 20 };
  });
  check('at the top, the bar\'s rule runs along its foot and a button\'s menu opens below it', top.rule === '0px/1px' && top.below, JSON.stringify(top));
  await p.keyboard.press('Escape');
  await p.evaluate(() => document.getElementById('bar-bottom').click());

  /* Minimize all, then restore all in its place. */
  await p.click('[data-win-back]');
  await p.waitForFunction(() => document.querySelector('[data-win-restore]').getClientRects().length > 0);
  check('with every window minimized, restore all takes minimize all\'s place',
    await p.evaluate(() => !document.querySelector('[data-win-back]').getClientRects().length));
  await p.click('[data-win-restore]');
  await p.waitForFunction(() => document.querySelector('[data-win-back]').getClientRects().length > 0);

  /* Close all: a real link to the state with no windows, and a window that
     refuses its close stays. */
  const href = await p.getAttribute('[data-win-close-all]', 'href');
  check('close all is a link to the state with no windows', /[?&]open=(&|$)/.test(href), href);
  await p.evaluate(() => document.addEventListener('pudl:window-closing', e => { if (e.detail.key === 'editor') e.preventDefault(); }));
  await p.click('[data-win-close-all]');
  await p.waitForFunction(() => pudlWindows.state().open.length === 1);
  const after = await p.evaluate(() => ({ open: pudlWindows.state().open, disabled: document.querySelector('[data-win-close-all]').getAttribute('aria-disabled') }));
  check('close all closes each window as its own Close would, so one that refuses stays', after.open.join() === 'editor' && after.disabled !== 'true', JSON.stringify(after));
  await p.evaluate(() => { location.hash = ''; });
  await p.goto(ROOT + '/samples/menu-ribbon.html');
  await p.waitForSelector('.win-dock [data-win-tab="reader"]');
  await p.evaluate(() => pudlWindows.closeAll());
  await p.waitForFunction(() => pudlWindows.state().open.length === 0);
  check('with nothing left to close, close all is marked disabled', await p.getAttribute('[data-win-close-all]', 'aria-disabled') === 'true');

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
