/* A row's actions button (0.81.0): shown only where it belongs with its
   place kept, opening the row's own context menu against itself with the
   row marked, closing on a second press, out of the Tab order and hidden
   from assistive technology, in a row list and in a tree; and a long press
   opening a context menu. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];
  const p = await b.newPage({ viewport: { width: 900, height: 700 } });
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/tests/fixtures/row-actions.html');
  await p.waitForFunction(() => window.pudlMenu);
  await p.mouse.move(800, 650);

  const shown = () => p.evaluate(() => [...document.querySelectorAll('[data-row-actions]')].map(btn => {
    const row = btn.closest('[data-name]');
    return row.getAttribute('data-name') + ':' + (getComputedStyle(btn).visibility === 'visible' ? 'shown' : 'hidden');
  }).join(' '));
  const at = await shown();
  check('at rest only the current row shows its button', at === 'Alpha:hidden Beta:shown Gamma:hidden articles:hidden site:hidden One:hidden Two:hidden', at);
  const kept = await p.evaluate(() => { const r = document.querySelector('[data-name="Alpha"] [data-row-actions]').getBoundingClientRect(); return r.width === 24 && r.height === 24; });
  check('a hidden button keeps its place', kept);
  const a11y = await p.evaluate(() => [...document.querySelectorAll('[data-row-actions]')].every(btn => btn.getAttribute('tabindex') === '-1' && btn.getAttribute('aria-hidden') === 'true' && btn.type === 'button'));
  check('the buttons are out of the Tab order and hidden from assistive technology', a11y);

  await p.hover('[data-name="Gamma"] .md-item');
  check('the row under the pointer shows its button', /Gamma:shown/.test(await shown()) && /Alpha:hidden/.test(await shown()), await shown());
  await p.hover('[data-name="articles"] > a');
  const nested = await shown();
  check('in a tree, only the node under the pointer shows it, not its parent', /articles:shown/.test(nested) && /site:hidden/.test(nested), nested);
  await p.focus('[data-name="Alpha"] .md-item');
  check('a row with focus in it shows its button', /Alpha:shown/.test(await shown()), await shown());

  /* Pressing it opens the row's own context menu against the button. */
  await p.hover('[data-name="Gamma"] .md-item');
  await p.click('[data-name="Gamma"] [data-row-actions]');
  await p.waitForSelector('.context-menu:popover-open');
  const menu = await p.evaluate(() => {
    const m = document.querySelector('.context-menu:popover-open'), btn = document.querySelector('[data-name="Gamma"] [data-row-actions]');
    const mr = m.getBoundingClientRect(), br = btn.getBoundingClientRect();
    return { rows: [...m.querySelectorAll('.menu-action')].map(r => r.textContent.trim()), marked: document.querySelector('[data-menu-for]') && document.querySelector('[data-menu-for]').getAttribute('data-name'),
      against: Math.abs(mr.left - br.left) < 2 && mr.top >= br.bottom, stays: getComputedStyle(btn).visibility };
  });
  check('the button opens the row\'s own menu, the one a right-click gives', JSON.stringify(menu.rows) === '["Open Gamma","Remove Gamma"]', JSON.stringify(menu));
  check('the menu opens against the button, with the row marked and its button kept in sight', menu.against && menu.marked === 'Gamma' && menu.stays === 'visible', JSON.stringify(menu));
  await p.click('[data-name="Gamma"] [data-row-actions]');
  await p.waitForTimeout(200);
  check('a second press on the button closes the menu', !(await p.evaluate(() => !!document.querySelector('.context-menu:popover-open'))));

  await p.hover('[data-name="articles"] > a');
  await p.click('[data-name="articles"] > [data-row-actions]');
  await p.waitForSelector('.context-menu:popover-open');
  await p.click('.context-menu:popover-open .menu-action >> text=Open articles');
  check('in a tree the button opens the node\'s menu and its commands run', JSON.stringify(await p.evaluate(() => window.__ran)) === '["open articles"]', JSON.stringify(await p.evaluate(() => window.__ran)));
  const treeShape = await p.evaluate(() => {
    const li = document.querySelector('[data-name="site"]'), a = li.querySelector(':scope > a').getBoundingClientRect(), btn = li.querySelector(':scope > [data-row-actions]').getBoundingClientRect();
    return Math.abs((a.top + a.bottom) / 2 - (btn.top + btn.bottom) / 2) < 3 && btn.left > a.left;
  });
  check('a tree node\'s button stands at the end of its own line, after its branch in the markup', treeShape);

  /* In a table the row is the tr, not the cell holding the button
     (0.81.1). */
  await p.hover('[data-name="Two"] td:first-child');
  check('in a table, pointing at any cell of a row shows its button', /Two:shown/.test(await shown()) && /One:hidden/.test(await shown()), await shown());
  await p.click('[data-name="Two"] [data-row-actions]');
  await p.waitForSelector('.context-menu:popover-open');
  const table = await p.evaluate(() => ({ rows: [...document.querySelector('.context-menu:popover-open').querySelectorAll('.menu-action')].map(r => r.textContent.trim()),
    marked: document.querySelector('[data-menu-for]').tagName, pressed: getComputedStyle(document.querySelector('[data-name="Two"] [data-row-actions]')).boxShadow.includes('inset') }));
  check('in a table, the button opens the row\'s menu, marks the row and is drawn pressed in', JSON.stringify(table.rows) === '["Open Two","Remove Two"]' && table.marked === 'TR' && table.pressed, JSON.stringify(table));
  await p.keyboard.press('Escape');

  /* A button in the lower half of the window, with room below it all the
     same, has its menu below it or above it, never over it, so a second
     press lands on the button and closes the menu (0.81.1). */
  await p.setViewportSize({ width: 900, height: 1000 });
  await p.evaluate(() => { document.body.style.paddingTop = '560px'; });
  await p.hover('[data-name="Gamma"] .md-item');
  await p.click('[data-name="Gamma"] [data-row-actions]');
  await p.waitForSelector('.context-menu:popover-open');
  const low = await p.evaluate(() => {
    const m = document.querySelector('.context-menu:popover-open').getBoundingClientRect(), b = document.querySelector('[data-name="Gamma"] [data-row-actions]').getBoundingClientRect();
    return { clear: m.top >= b.bottom || m.bottom <= b.top, menu: [Math.round(m.top), Math.round(m.bottom)], button: [Math.round(b.top), Math.round(b.bottom)], half: innerHeight / 2 };
  });
  check('a low button\'s menu opens clear of the button', low.clear && low.button[0] > low.half, JSON.stringify(low));
  await p.click('[data-name="Gamma"] [data-row-actions]');
  await p.waitForTimeout(200);
  check('and a second press on it closes the menu', !(await p.evaluate(() => !!document.querySelector('.context-menu:popover-open'))));
  await p.evaluate(() => { document.body.style.paddingTop = ''; });
  await p.setViewportSize({ width: 900, height: 700 });

  /* A long press opens a context menu where nothing else gives one. */
  if (b.browserType().name() === 'chromium') {
    const t = await b.newPage({ viewport: { width: 400, height: 700 }, hasTouch: true, isMobile: true });
    t.on('pageerror', e => errors.push(e.message));
    await t.goto(ROOT + '/tests/fixtures/row-actions.html');
    await t.waitForFunction(() => window.pudlMenu);
    const cdp = await t.context().newCDPSession(t);
    const box = await t.locator('[data-name="Alpha"] .md-item').boundingBox();
    const x = box.x + 20, y = box.y + box.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await t.waitForTimeout(800);
    const opened = await t.evaluate(() => { const m = document.querySelector('.context-menu:popover-open'); return m ? [...m.querySelectorAll('.menu-action')].map(r => r.textContent.trim()) : null; });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await t.waitForTimeout(200);
    check('a long press opens the row\'s context menu', JSON.stringify(opened) === '["Open Alpha","Remove Alpha"]', JSON.stringify(opened));
    check('lifting the finger after a long press follows no link', await t.evaluate(() => location.hash) === '', await t.evaluate(() => location.hash));
    const count = await t.evaluate(() => document.querySelectorAll('.context-menu:popover-open').length);
    check('one long press opens one menu', count === 1, String(count));
  }

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
