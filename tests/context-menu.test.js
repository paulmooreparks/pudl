/* Context menus (0.74.0): a right-click, Shift+F10 or the Menu key asks
   the page for rows by pudl:contextmenu and opens a menu of them at the
   point, where the browser's own menu opens if no one answers. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + (detail || '')));
  if (!ok) failures++;
}

(async () => {
  const browser = await launch();
  const p = await browser.newPage({ viewport: { width: 900, height: 600 } });
  await p.goto(ROOT + '/tests/fixtures/context-menu.html');
  await p.waitForFunction(() => window.pudlMenu && window.pudlMenu.openAt);
  const open = () => p.evaluate(() => Array.from(document.querySelectorAll('.context-menu')).filter(m => m.matches(':popover-open')).length);
  const rows = () => p.evaluate(() => Array.from(document.querySelectorAll('.context-menu:popover-open')).pop() ? Array.from(Array.from(document.querySelectorAll('.context-menu:popover-open')).pop().querySelectorAll(':scope > .menu-action')).map(r => r.querySelector('.menubar-words').textContent) : []);
  const focused = () => p.evaluate(() => { const a = document.activeElement; return a.closest('.context-menu') ? a.querySelector('.menubar-words').textContent : a.id; });
  const ran = () => p.evaluate(() => { const r = window.ran.join(','); window.ran = []; return r; });

  /* The pointer. */
  const box = await p.locator('#editor').boundingBox();
  await p.mouse.click(box.x + 40, box.y + 30, { button: 'right' });
  check('a right-click where the page answers opens a menu of its rows', await open() === 1 && JSON.stringify(await rows()) === JSON.stringify(['Cut', 'Copy', 'Paste', 'Wrap lines', 'Insert', 'Delete']), JSON.stringify(await rows()));
  check('and keeps the browser\'s own menu shut', await p.evaluate(() => window.lastNative) === false);
  const at = await p.evaluate(() => { const r = document.querySelector('.context-menu:popover-open').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; });
  check('it opens at the pointer', Math.abs(at[0] - (box.x + 40)) <= 1 && Math.abs(at[1] - (box.y + 30)) <= 1, JSON.stringify([at, box.x + 40, box.y + 30]));
  check('focus moves to its first row', await focused() === 'Cut');
  const look = await p.evaluate(() => {
    const m = document.querySelector('.context-menu:popover-open');
    const copy = m.querySelectorAll(':scope > .menu-action')[1], paste = m.querySelectorAll(':scope > .menu-action')[2], wrap = m.querySelectorAll(':scope > .menu-action')[3], ins = m.querySelectorAll(':scope > .menu-action')[4];
    return { role: m.getAttribute('role'), key: copy.querySelector('.menubar-shortcut').textContent, aria: copy.getAttribute('aria-keyshortcuts'), disabled: paste.getAttribute('aria-disabled'), reason: paste.querySelector('.menubar-detail').textContent, check: wrap.getAttribute('role') + ':' + wrap.getAttribute('aria-checked'), sub: ins.getAttribute('aria-haspopup') };
  });
  check('rows are a menu\'s: keys shown in the platform\'s form, a disabled row with its reason, a ticked row, a submenu', look.role === 'menu' && /Ctrl\+C|⌘C/.test(look.key) && /C$/.test(look.aria) && look.disabled === 'true' && look.reason === 'The clipboard is empty.' && look.check === 'menuitemcheckbox:true' && look.sub === 'menu', JSON.stringify(look));
  const lefts = await p.evaluate(() => Array.from(document.querySelectorAll('.context-menu:popover-open > .menu-action .menubar-words')).map(w => Math.round(w.getBoundingClientRect().left)));
  check('with glyphs, ticks and a warning mixed, every row\'s words start in one line', new Set(lefts).size === 1, JSON.stringify(lefts));
  await p.click('.context-menu:popover-open .menu-action:nth-of-type(2)');
  check('pressing a row runs it once and closes the menu', await ran() === 'copy' && await open() === 0);
  await p.mouse.click(box.x + 40, box.y + 30, { button: 'right' });
  await p.click('.context-menu:popover-open .menu-action[aria-disabled="true"]', { force: true });
  check('a disabled row does nothing', await ran() === '' && await open() === 1);
  await p.mouse.click(600, 500);
  check('a press outside closes it', await open() === 0);

  /* Firefox opens its own menu for Shift with a right-click without
     telling the page at all, which leaves the last result unset. */
  await p.evaluate(() => { window.lastNative = null; });
  await p.keyboard.down('Shift');
  await p.mouse.click(box.x + 40, box.y + 30, { button: 'right' });
  await p.keyboard.up('Shift');
  check('Shift with a right-click leaves the browser\'s own menu to open', await open() === 0 && await p.evaluate(() => window.lastNative) !== false);

  /* Nothing answers. */
  const pbox = await p.locator('#plain').boundingBox();
  await p.mouse.click(pbox.x + 20, pbox.y + 20, { button: 'right' });
  check('where nothing answers, no menu opens and the browser\'s own is left alone', await open() === 0 && await p.evaluate(() => window.lastNative) === true);

  /* The keyboard. */
  await p.focus('#editor');
  await p.keyboard.press('Shift+F10');
  check('Shift+F10 opens the menu at the focused element', await open() === 1 && await focused() === 'Cut');
  await p.keyboard.press('ArrowUp');
  check('Up from the first row wraps to the last', await focused() === 'Delete');
  await p.keyboard.press('ArrowDown');
  check('Down from the last wraps to the first', await focused() === 'Cut');
  await p.keyboard.press('i');
  check('a letter goes to the next row starting with it', await focused() === 'Insert');
  await p.keyboard.press('ArrowRight');
  check('Right opens a submenu with focus on its first row', await open() === 2 && await focused() === 'Link');
  await p.keyboard.press('ArrowLeft');
  check('Left closes it and goes back to its row', await open() === 1 && await focused() === 'Insert');
  await p.keyboard.press('ArrowRight');
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('Enter');
  check('Enter in a submenu runs its row and closes every level', await ran() === 'table' && await open() === 0);
  check('and focus goes back where it was', await focused() === 'editor');
  await p.keyboard.press('Shift+F10');
  await p.keyboard.press('Escape');
  check('Escape closes the menu and focus goes back', await open() === 0 && await focused() === 'editor');
  await p.keyboard.press('Shift+F10');
  await p.keyboard.press('w');
  await p.keyboard.press(' ');
  check('Space chooses too', await ran() === 'wrap' && await open() === 0);

  /* From a script, at an edge. */
  await p.evaluate(() => pudlMenu.openAt(innerWidth - 4, innerHeight - 4, [{ label: 'One', run() {} }, { label: 'Two', run() {} }]));
  const inside = await p.evaluate(() => { const r = document.querySelector('.context-menu:popover-open').getBoundingClientRect(); return r.right <= innerWidth && r.bottom <= innerHeight && r.left >= 0 && r.top >= 0; });
  check('pudlMenu.openAt opens one from a script, kept inside the window at its corner', inside);
  await p.keyboard.press('Escape');

  /* In a modal dialog. */
  await p.click('#open-dialog');
  const dbox = await p.locator('#in-dialog').boundingBox();
  await p.mouse.click(dbox.x + 10, dbox.y + 5, { button: 'right' });
  const inDialog = await p.evaluate(() => { const m = document.querySelector('.context-menu:popover-open'); return !!m && !!m.closest('dialog'); });
  check('in a modal dialog the menu lives in the dialog', inDialog);
  await p.click('.context-menu:popover-open .menu-action');
  check('and its rows can be pressed', await ran() === 'inside');

  await browser.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
