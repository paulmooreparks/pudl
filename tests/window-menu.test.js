/* The window menu, from parkscomputing.com's
   Architecture/pudl-proposal-window-menu.md. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
const FIX = ROOT + '/tests/fixtures/window-menu.html';
(async () => {
  const b = await launch();
  const errors = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(FIX);
  await p.waitForFunction(() => window.pudlWindows && document.querySelector('[data-applet="counter"][data-applet-state="running"]'));

  const btn = k => '.win[data-win="' + k + '"] .win-head [data-win-action="menu"]';
  const panel = k => '#win-menu-' + k;
  const rows = k => p.evaluate(s => Array.from(document.querySelector(s).children).map(el =>
    el.matches('.menu-sep') ? '|' : el.matches('.win-snap') ? 'picker' : el.textContent + (el.hasAttribute('aria-pressed') ? '[' + el.getAttribute('aria-pressed') + ']' : '') + (el.disabled ? '(off)' : '')), panel(k));
  const openMenu = async k => {
    await p.click(btn(k));
    await p.waitForFunction(s => { const el = document.querySelector(s); return el.matches(':popover-open') && !el.classList.contains('placing'); }, panel(k));
  };
  const choose = async (k, label) => {
    await openMenu(k);
    await p.click(panel(k) + ' .menu-action >> text="' + label + '"');
  };

  const first = await p.evaluate(s => { const b = document.querySelector(s); return b && b === b.parentNode.firstElementChild && b.getAttribute('aria-label'); }, btn('counter'));
  check('a layer marked data-win-menu gives each window a menu button at the left of its title bar', first === 'Window menu', String(first));

  await openMenu('counter');
  let r = await rows('counter');
  check('the window commands come first, then the applet\'s, then Close after a separator',
        r.join(',') === 'Open as a page,Copy the link,Minimize,Maximize,picker,Dock at the bottom,Reset size and position,|,Add one,Wrap lines[false],Clear(off),|,Close', r.join(','));
  const placed = await p.evaluate(([bs, ps]) => {
    const a = document.querySelector(bs).getBoundingClientRect(), m = document.querySelector(ps).getBoundingClientRect();
    return Math.abs(m.left - a.left) <= 2 && m.top >= a.bottom - 1;
  }, [btn('counter'), panel('counter')]);
  check('the menu opens under its button', placed);
  await p.keyboard.press('Escape');

  await choose('counter', 'Add one');
  await choose('counter', 'Wrap lines');
  const got = await p.evaluate(() => { const m = document.querySelector('[data-applet="counter"]'); return m.getAttribute('data-count') + ' ' + m.getAttribute('data-wrap'); });
  check('choosing an applet\'s command runs it', got === '1 true', got);
  await openMenu('counter');
  r = await rows('counter');
  check('the menu is built afresh, with the tick and the enabled state current', r.indexOf('Wrap lines[true]') >= 0 && r.indexOf('Clear') >= 0, r.join(','));
  const tick = await p.evaluate(s => getComputedStyle(document.querySelector(s + ' [aria-pressed="true"]'), '::before').visibility, panel('counter'));
  check('a command that is on shows a tick', tick === 'visible', tick);
  /* The indent that lines words up beside ticks leaves the layout picker's
     zones alone (from parkscomputing.com's
     Architecture/pudl-bug-snap-zone-indent.md). */
  const overlap = await p.evaluate(s => {
    const bad = [];
    document.querySelectorAll(s + ' .win-snap-layout').forEach(g => {
      const lr = g.getBoundingClientRect();
      const zs = Array.from(g.querySelectorAll('.win-snap-zone')).map(z => z.getBoundingClientRect());
      zs.forEach((a, i) => {
        if (a.left < lr.left - 0.5 || a.right > lr.right + 0.5) bad.push('outside');
        zs.slice(i + 1).forEach(b => { if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) bad.push('overlap'); });
      });
    });
    return bad;
  }, panel('counter'));
  check('in a menu with ticked commands, the layout picker\'s zones stay inside their thumbnails and apart', overlap.length === 0, overlap.join(','));
  await p.keyboard.press('Escape');

  await choose('counter', 'Maximize');
  check('Maximize maximises the window', await p.evaluate(() => /p\.counter=maximized/.test(location.search)), await p.evaluate(() => location.search));
  await openMenu('counter');
  r = await rows('counter');
  check('and the menu then offers Restore', r.indexOf('Restore') >= 0, r.join(','));
  await p.keyboard.press('Escape');
  await choose('counter', 'Restore');

  await p.evaluate(() => { const w = document.querySelector('.win[data-win="counter"]'); });
  const home = await p.evaluate(() => pudlWindows.state().place.counter);
  const h = await p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left, y: r.top }; }, '.win[data-win="counter"] .win-title');
  await p.mouse.move(h.x + 20, h.y + 5);
  await p.mouse.down();
  await p.mouse.move(h.x + 220, h.y + 105, { steps: 6 });
  await p.mouse.up();
  const moved = await p.evaluate(() => pudlWindows.state().place.counter);
  await choose('counter', 'Reset size and position');
  const back = await p.evaluate(() => pudlWindows.state().place.counter);
  check('Reset returns a moved window to where its markup put it',
        moved.x !== home.x && Math.abs(back.x - 0.05) < 0.002 && Math.abs(back.y - 0.05) < 0.002 && Math.abs(back.w - 0.4) < 0.002,
        JSON.stringify({ home, moved, back }));

  await openMenu('notes');
  r = await rows('notes');
  check('plain content adds its commands through pudl:window-menu', r.join(',') === 'Minimize,Maximize,picker,Dock at the bottom,Reset size and position,|,Shout,|,Close', r.join(','));
  await p.click(panel('notes') + ' .menu-action >> text="Shout"');
  check('and they run', (await p.textContent('#notes-text')) === 'PLAIN CONTENT.');

  await choose('notes', 'Dock at the bottom');
  check('Dock at the bottom docks it', await p.evaluate(() => /p\.notes=dock-bottom/.test(location.search)));
  await openMenu('notes');
  r = await rows('notes');
  check('a docked window\'s menu offers Collapse and Undock, and no Maximize', r.join(',') === 'Collapse,Undock,Reset size and position,|,Shout,|,Close', r.join(','));
  await p.keyboard.press('Escape');
  await choose('notes', 'Undock');

  /* The keyboard: the context-menu keys on the title bar, arrows through the rows. */
  await p.focus('.win[data-win="notes"] .win-head');
  await p.keyboard.press('Shift+F10');
  await p.waitForFunction(s => document.querySelector(s).contains(document.activeElement), panel('notes'), { timeout: 3000 }).catch(() => {});
  const focused = await p.evaluate(() => document.activeElement.textContent);
  check('Shift+F10 on the title bar opens the menu with focus on its first command', focused === 'Minimize', focused);
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('Enter');
  check('the arrow keys and Enter choose a command', await p.evaluate(() => /p\.notes=maximized/.test(location.search)), await p.evaluate(() => location.search));

  await choose('notes', 'Close');
  check('Close closes the window', await p.evaluate(() => pudlWindows.state().open.indexOf('notes') < 0));

  /* Open as a page follows the title bar's link, its target included
     (from parkscomputing.com's Architecture/pudl-bug-menu-page-target.md). */
  await p.evaluate(() => { const a = document.querySelector('.win[data-win="counter"] a[data-win-action="page"]'); a.target = '_blank'; a.rel = 'noopener'; });
  const here = p.url();
  const [tab] = await Promise.all([p.context().waitForEvent('page', { timeout: 5000 }).catch(() => null), choose('counter', 'Open as a page')]);
  if (tab) await tab.waitForLoadState().catch(() => {});
  check('Open as a page with a link that targets a new tab opens one, and leaves this page where it was',
        !!tab && /window-menu-page\.html/.test(tab.url()) && p.url() === here, (tab ? tab.url() : 'no tab') + ' ' + p.url());
  if (tab) await tab.close();
  await p.evaluate(() => document.querySelector('.win[data-win="counter"] a[data-win-action="page"]').removeAttribute('target'));
  await Promise.all([p.waitForURL(/window-menu-page\.html/, { timeout: 5000 }).catch(() => {}), choose('counter', 'Open as a page')]);
  check('and with no target it goes there in this tab', /window-menu-page\.html/.test(p.url()), p.url());

  /* On its own page, the applet's commands get a menu of their own. */
  await p.goto(ROOT + '/tests/fixtures/window-menu-page.html');
  await p.waitForSelector('.applet-commands .menu-btn');
  const before = await p.evaluate(() => document.querySelector('.applet-commands').nextElementSibling.matches('[data-applet="counter"]'));
  check('an applet on a page gets a command menu in a row above it', before);
  await p.click('.applet-commands .menu-btn');
  await p.waitForFunction(() => document.querySelector('.applet-commands .menu-panel').matches(':popover-open'));
  await p.click('.applet-commands .menu-action >> text="Add one"');
  check('and its commands run from there', (await p.getAttribute('[data-applet="counter"]', 'data-count')) === '1');
  await p.evaluate(() => pudlApplets.destroy(document));
  check('destroying the applet takes the row with it', (await p.$('.applet-commands')) === null);

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
