/* A command menu open while its commands change stays open and shows
   their state now: a redraw that changes nothing leaves its rows as they
   are, a changed tick or disabled row is drawn in place, focus stays on the
   same command and the scroll where the reader left it. A command that is
   disabled passes focus to an enabled row; a menu whose command goes
   closes, with focus on a control of its toolbar still in the page. Focus
   the reader moved elsewhere stays there, and Escape and choosing a row
   still close the menu. */
const { launch, ROOT } = require('./lib');
(async () => {
  const b = await launch();
  let failed = 0;
  const check = (name, pass, detail) => { console.log((pass ? 'PASS ' : 'FAIL ') + name + (pass || detail === undefined ? '' : ' :: ' + JSON.stringify(detail))); if (!pass) failed++; };
  try {
    const p = await b.newPage({ viewport: { width: 1000, height: 360 } });
    await p.goto(ROOT + '/tests/fixtures/command-menu-continuity.html');
    await p.waitForSelector('#mode-btn.menu-btn');
    const panel = await p.evaluate(() => document.getElementById('mode-btn').getAttribute('popovertarget'));
    const state = () => p.evaluate(id => {
      const m = document.getElementById(id), a = document.activeElement;
      return { open: m.matches(':popover-open'), focus: a ? (a.textContent || a.id).trim() : null, focusId: a && a.id, inMenu: m.contains(a), connected: !!a && a.isConnected && a !== document.body,
        disabled: !!a && (a.disabled || a.getAttribute('aria-disabled') === 'true'), checked: [...m.querySelectorAll('[aria-checked="true"]')].map(r => r.textContent.trim()),
        off: [...m.querySelectorAll('[aria-disabled="true"]')].map(r => r.textContent.trim()), scroll: m.scrollTop };
    }, panel);
    const settle = () => p.waitForTimeout(120);
    async function openTo(label) {
      await p.focus('#mode-btn');
      await p.keyboard.press('ArrowDown');
      await p.waitForFunction(id => document.getElementById(id).matches(':popover-open'), panel);
      for (let i = 0; i < 30 && (await state()).focus !== label; i++) await p.keyboard.press('ArrowDown');
      return state();
    }
    /* Every close of the menu and every time focus leaves one of its rows,
       and an update with the state read in the same task as it. */
    await p.evaluate(id => {
      window.__events = [];
      document.getElementById(id).addEventListener('toggle', e => { if (e.newState === 'closed') __events.push('closed'); });
      document.addEventListener('focusout', e => { if (e.target.closest && e.target.closest('#' + id)) __events.push('focusout ' + e.target.textContent.trim()); }, true);
    }, panel);
    async function update(fn) {
      await p.evaluate(() => { document.activeElement.__mark = 1; window.__events = []; });
      const now = await p.evaluate(([fn, id]) => { (new Function(fn))(); pudlCommands.changed(); return new Promise(r => queueMicrotask(() => r({ same: document.activeElement.__mark === 1, open: document.getElementById(id).matches(':popover-open') }))); }, [fn, panel]);
      await settle();
      return { now, same: await p.evaluate(() => document.activeElement.__mark === 1), events: await p.evaluate(() => window.__events.slice()) };
    }
    const kept = r => r.now.same && r.now.open && r.same && !r.events.length;
    let s = await openTo('Mode B');
    check('the keyboard reaches Mode B in the open menu', s.open && s.focus === 'Mode B' && s.inMenu, s);
    await p.evaluate(id => { document.getElementById(id).querySelectorAll('.menu-action').forEach(r => { r.__mark = 1; }); }, panel);
    let r, all = true;
    for (let i = 0; i < 3; i++) { r = await update(''); all = all && kept(r); }
    s = await state();
    const same = await p.evaluate(id => [...document.getElementById(id).querySelectorAll('.menu-action')].every(r => r.__mark === 1), panel);
    check('a redraw that changes nothing leaves the open menu, its rows and focus as they were, at once and after', all && s.open && s.focus === 'Mode B' && same, { r, s });
    r = await update("__f.mode = 'c';");
    s = await state();
    check('a changed tick shows in the open menu, nothing closing and focus never leaving Mode B', kept(r) && JSON.stringify(s.checked) === '["Mode C"]' && s.focus === 'Mode B' && s.inMenu, { r, s });
    r = await update('__f.reverse = true;');
    s = await state();
    check('rows reordered around the focused one keep focus on it', kept(r) && s.focus === 'Mode B', { r, s });
    await p.keyboard.press('ArrowDown');
    check('the keyboard goes on from the row\'s new place', (await state()).focus === 'Mode A');
    await update('__f.reverse = false;');
    await p.keyboard.press('ArrowDown');
    check('the keyboard goes on from where it was after the order is restored', (await state()).focus === 'Mode B');
    await p.evaluate(() => { __f.bOff = true; pudlCommands.changed(); }); await settle();
    s = await state();
    check('a focused command that is disabled passes focus to the menu\'s first enabled row', s.open && s.inMenu && !s.disabled && s.focus === 'Mode A' && s.off.includes('Mode B'), s);
    await p.evaluate(() => { __f.bOff = false; pudlCommands.changed(); }); await settle();
    for (let i = 0; i < 30 && (await state()).focus !== 'Item 12'; i++) await p.keyboard.press('ArrowDown');
    const before = await state();
    await p.evaluate(() => { __f.mode = 'a'; pudlCommands.changed(); }); await settle();
    s = await state();
    check('a redraw keeps the scroll and focus on a row further down', s.open && s.focus === 'Item 12' && before.scroll > 0 && Math.abs(s.scroll - before.scroll) <= 1 && JSON.stringify(s.checked) === '["Mode A"]', { before, s });
    await p.keyboard.press('Escape'); await settle();
    check('Escape still closes the menu', !(await state()).open);
    await openTo('Mode B');
    await p.keyboard.press('Enter'); await settle();
    s = await state();
    check('choosing a row runs it once and closes the menu', !s.open && (await p.evaluate(() => __f.log.filter(x => x === 'b').length)) === 1, s);
    await p.click('#mode-btn');
    await p.waitForFunction(id => document.getElementById(id).matches(':popover-open'), panel);
    await p.evaluate(() => document.getElementById('elsewhere').focus());
    await p.evaluate(() => { __f.mode = 'c'; pudlCommands.changed(); }); await settle();
    s = await state();
    check('an update leaves focus the reader moved elsewhere', s.focusId === 'elsewhere', s);
    await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await settle();
    await openTo('Mode C');
    await p.evaluate(() => { __f.gone = true; pudlCommands.changed(); }); await settle();
    s = await state();
    check('when the menu\'s command goes, the menu closes and focus moves to a control of its toolbar', !s.open && s.connected && !s.disabled && s.focusId === 'first-tool', s);
    await p.evaluate(() => { __f.gone = false; pudlCommands.changed(); }); await settle();
    await openTo('Mode C');
    await p.evaluate(() => { __f.modeOff = true; pudlCommands.changed(); }); await settle();
    s = await state();
    check('when the menu\'s command is disabled, the menu closes and focus moves to an enabled control of its toolbar', !s.open && s.connected && !s.disabled && s.focusId === 'first-tool', s);
    await p.evaluate(() => { __f.modeOff = false; pudlCommands.changed(); }); await settle();
    await openTo('Mode A');
    await p.keyboard.press('Escape');
    await p.evaluate(() => pudlCommands.changed()); await settle();
    check('Escape then an update leaves the menu closed', !(await state()).open);
  } catch (e) { console.error(e); failed++; }
  finally { await b.close(); }
  if (failed) { console.log(failed + ' failed'); process.exitCode = 1; }
})();
