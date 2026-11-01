/* A command menu open while its commands change stays open and shows
   their state now: a redraw that changes nothing leaves its rows as they
   are, a changed tick or disabled row is drawn in place, focus stays on the
   same command, matched by its id even where labels repeat, and the scroll
   stays where the reader left it. A command's own panel among the rows
   keeps its field, text and caret while the rows around it change. A
   focused command that goes or is disabled passes focus to the first
   enabled row, in sight. A menu whose command goes from the registry, is
   disabled or hidden, or whose button or whole menu leaves the page,
   closes, with focus on a control of its toolbar that still works. Rows
   of the same commands in a folded group's menu stay current too. Focus
   the reader moved elsewhere stays there, and Escape and choosing a row
   still close the menu. */
const { launch, ROOT } = require('./lib');
(async () => {
  const b = await launch();
  let failed = 0;
  const check = (name, pass, detail) => { console.log((pass ? 'PASS ' : 'FAIL ') + name + (pass || detail === undefined ? '' : ' :: ' + JSON.stringify(detail))); if (!pass) failed++; };
  try {
    const p = await b.newPage({ viewport: { width: 1000, height: 360 } });
    let panel;
    async function fresh(flags) {
      await p.goto(ROOT + '/tests/fixtures/command-menu-continuity.html');
      await p.waitForSelector('#mode-btn.menu-btn');
      if (flags) { await p.evaluate(f => { Object.assign(__f, f); pudlCommands.changed(); }, flags); await settle(); }
      panel = await p.evaluate(() => document.getElementById('mode-btn').getAttribute('popovertarget'));
      /* Every close of the menu and every time focus leaves one of its rows. */
      await p.evaluate(id => {
        window.__events = [];
        document.getElementById(id).addEventListener('toggle', e => { if (e.newState === 'closed') __events.push('closed'); });
        document.addEventListener('focusout', e => { if (e.target.closest && e.target.closest('#' + id)) __events.push('focusout ' + e.target.textContent.trim()); }, true);
      }, panel);
    }
    const state = () => p.evaluate(id => {
      const m = document.getElementById(id), a = document.activeElement, mr = m.getBoundingClientRect(), ar = a.getBoundingClientRect();
      return { open: m.matches(':popover-open'), focus: a ? (a.textContent || a.id).trim() : null, focusId: a && a.id, inMenu: m.contains(a), connected: !!a && a.isConnected && a !== document.body,
        disabled: !!a && (a.disabled || a.getAttribute('aria-disabled') === 'true'), checked: [...m.querySelectorAll('[aria-checked="true"]')].map(r => r.textContent.trim()),
        off: [...m.querySelectorAll('[aria-disabled="true"]')].map(r => r.textContent.trim()), scroll: m.scrollTop,
        inSight: m.contains(a) && ar.top >= mr.top - 1 && ar.bottom <= mr.bottom + 1 };
    }, panel);
    const settle = () => p.waitForTimeout(120);
    async function openTo(label) {
      await p.keyboard.press('Escape'); await settle();
      await p.focus('#mode-btn');
      await p.keyboard.press('ArrowDown');
      await p.waitForFunction(id => document.getElementById(id).matches(':popover-open'), panel);
      for (let i = 0; i < 40 && (await state()).focus !== label; i++) await p.keyboard.press('ArrowDown');
      return state();
    }
    /* An update, with the state read in the same task as it, and again
       once it has settled, and what closed or lost focus in between. */
    async function update(fn) {
      await p.evaluate(() => { document.activeElement.__mark = 1; window.__events = []; });
      const now = await p.evaluate(([fn, id]) => { (new Function(fn))(); pudlCommands.changed(); return new Promise(r => queueMicrotask(() => r({ same: document.activeElement.__mark === 1, open: document.getElementById(id).matches(':popover-open') }))); }, [fn, panel]);
      await settle();
      return { now, same: await p.evaluate(() => document.activeElement.__mark === 1), events: await p.evaluate(() => window.__events.slice()) };
    }
    const kept = r => r.now.same && r.now.open && r.same && !r.events.length;
    const ran = () => p.evaluate(() => __f.log.slice());

    await fresh();
    let s = await openTo('Mode B');
    check('the keyboard reaches Mode B in the open menu', s.open && s.focus === 'Mode B' && s.inMenu, s);
    await p.evaluate(id => { document.getElementById(id).querySelectorAll('.menu-action').forEach(r => { r.__row = 1; }); }, panel);
    let r, all = true;
    for (let i = 0; i < 3; i++) { r = await update(''); all = all && kept(r); }
    s = await state();
    const same = await p.evaluate(id => [...document.getElementById(id).querySelectorAll('.menu-action')].every(r => r.__row === 1), panel);
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
    r = await update("__f.mode = 'a';");
    s = await state();
    check('a redraw keeps the scroll and focus on a row further down', kept(r) && s.focus === 'Item 12' && before.scroll > 0 && Math.abs(s.scroll - before.scroll) <= 1 && JSON.stringify(s.checked) === '["Mode A"]', { before, r, s });
    await p.evaluate(() => { __f.dropItem = 'item-12'; pudlCommands.changed(); }); await settle();
    s = await state();
    check('a scrolled focused command that goes passes focus to the first enabled row, brought into sight', s.open && s.focus === 'Mode A' && s.inSight, s);
    await p.evaluate(() => { __f.dropItem = null; pudlCommands.changed(); }); await settle();
    await p.keyboard.press('Escape'); await settle();
    check('Escape still closes the menu', !(await state()).open);
    await openTo('Mode B');
    await p.keyboard.press('Enter'); await settle();
    s = await state();
    check('choosing a row runs it once and closes the menu', !s.open && (await ran()).filter(x => x === 'b').length === 1, s);
    await p.click('#mode-btn');
    await p.waitForFunction(id => document.getElementById(id).matches(':popover-open'), panel);
    await p.evaluate(() => document.getElementById('elsewhere').focus());
    await p.evaluate(() => { __f.mode = 'c'; pudlCommands.changed(); }); await settle();
    check('an update leaves focus the reader moved elsewhere', (await state()).focusId === 'elsewhere');
    await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await settle();
    await openTo('Mode A');
    await p.keyboard.press('Escape');
    await p.evaluate(() => pudlCommands.changed()); await settle();
    check('Escape then an update leaves the menu closed', !(await state()).open);

    /* Two rows with the same words and different commands. */
    await fresh({ dups: true });
    await openTo('Mode C');
    await p.keyboard.press('ArrowDown');
    s = await state();
    check('the keyboard reaches the first row labelled Same', s.focus === 'Same', s);
    r = await update('__f.dupsSwap = true;');
    await p.keyboard.press('Enter'); await settle();
    check('rows labelled alike and swapped keep focus on the same command, which is the one that runs', kept(r) && JSON.stringify((await ran()).filter(x => x.startsWith('dup'))) === '["dup-a"]', { r, log: await ran() });
    await fresh({ dups: true });
    await openTo('Mode C');
    await p.keyboard.press('ArrowDown');
    await p.evaluate(() => { __f.dupReplace = true; pudlCommands.changed(); }); await settle();
    s = await state();
    check('a command replaced by another with the same words moves focus to the first enabled row, not to the new command', s.open && s.focus === 'Mode A', s);
    await p.keyboard.press('Enter'); await settle();
    check('and choosing then runs that row\'s command', JSON.stringify((await ran()).filter(x => x !== 'tidy')) === '["a"]', await ran());

    /* A command's own panel among the rows. */
    await fresh({ withPanel: true });
    await p.focus('#mode-btn'); await p.keyboard.press('ArrowDown');
    await p.waitForFunction(id => document.getElementById(id).matches(':popover-open'), panel);
    await p.focus('#menu-find');
    await p.keyboard.type('abcd');
    await p.evaluate(() => document.getElementById('menu-find').setSelectionRange(2, 2));
    await p.evaluate(() => { document.getElementById('menu-find').__mark = 1; });
    const draws = await p.evaluate(() => __f.panelDraws);
    r = await update("__f.mode = 'b'; __f.bOff = false;");
    s = await state();
    const field = await p.evaluate(() => { const f = document.getElementById('menu-find'); return { mark: f.__mark, value: f.value, caret: f.selectionStart, focused: document.activeElement === f }; });
    check('a panel\'s field keeps its text, caret and focus while the rows around it update', field.mark === 1 && field.value === 'abcd' && field.caret === 2 && field.focused && JSON.stringify(s.checked) === '["Mode B"]' && (await p.evaluate(() => __f.panelDraws)) === draws, { field, s });
    await p.evaluate(() => { __f.bOff = true; pudlCommands.changed(); }); await settle();
    s = await state();
    check('a row beside the panel shows as disabled at once', s.off.includes('Mode B') && s.open, s);
    await p.locator('#' + panel + ' .menu-action').filter({ hasText: /^Mode C/ }).click(); await settle();
    check('a row beside the panel runs its command as it is now', (await ran()).includes('c'));

    /* The menu's command taken out of the registry: its button stays in
       the page but does nothing, so focus goes to Tidy. */
    await fresh();
    await openTo('Mode C');
    await p.evaluate(() => { __f.removed = true; pudlCommands.changed(); }); await settle();
    s = await state();
    check('when the menu\'s command leaves the registry, the menu closes and focus moves to a working control of its toolbar', !s.open && s.focusId === 'first-tool', s);
    await fresh();
    await openTo('Mode C');
    await p.evaluate(() => { __f.gone = true; pudlCommands.changed(); }); await settle();
    s = await state();
    check('when the menu\'s command is hidden, the menu closes and focus moves to a control of its toolbar', !s.open && s.focusId === 'first-tool', s);
    await fresh();
    await openTo('Mode C');
    await p.evaluate(() => { __f.modeOff = true; pudlCommands.changed(); }); await settle();
    s = await state();
    check('when the menu\'s command is disabled, the menu closes and focus moves to an enabled control of its toolbar', !s.open && s.focusId === 'first-tool', s);
    await fresh();
    await openTo('Mode C');
    await p.evaluate(() => { document.getElementById('mode-btn').remove(); pudlCommands.changed(); }); await settle();
    s = await state();
    check('when the menu\'s button leaves the page, the menu closes and focus moves to a control of its toolbar', !s.open && s.focusId === 'first-tool', s);
    await fresh();
    await openTo('Mode C');
    await p.evaluate(() => { document.getElementById('mode-btn').closest('.menu').remove(); pudlCommands.changed(); }); await settle();
    check('when the whole menu leaves the page, focus moves to a control of its toolbar', (await p.evaluate(() => document.activeElement.id)) === 'first-tool');

    /* The same menu folded into a narrow toolbar's group menu. */
    await fresh();
    const fold = await p.evaluate(() => { const b = document.querySelector('#folded .toolbar-fold > .menu-btn'); return b && b.getClientRects().length > 0 ? b.getAttribute('popovertarget') : null; });
    check('the narrow toolbar folds its group into a menu', !!fold);
    if (fold) {
      const fstate = () => p.evaluate(id => {
        const m = document.getElementById(id), a = document.activeElement, mr = m.getBoundingClientRect(), ar = a.getBoundingClientRect();
        return { open: m.matches(':popover-open'), focus: (a.textContent || a.id).trim(), inMenu: m.contains(a), checked: [...m.querySelectorAll('[aria-checked="true"]')].map(r => r.textContent.trim()),
          off: [...m.querySelectorAll('[aria-disabled="true"]')].map(r => r.textContent.trim()), scroll: m.scrollTop, inSight: m.contains(a) && ar.top >= mr.top - 1 && ar.bottom <= mr.bottom + 1,
          anchor: !!document.querySelector('[popovertarget="' + id + '"]') && document.querySelector('[popovertarget="' + id + '"]').isConnected };
      }, fold);
      await p.evaluate(id => { window.__fe = []; document.getElementById(id).addEventListener('toggle', e => { if (e.newState === 'closed') __fe.push('closed'); }); }, fold);
      await p.locator('#folded .toolbar-fold > .menu-btn').focus();
      await p.keyboard.press('ArrowDown');
      await p.waitForFunction(id => document.getElementById(id).matches(':popover-open'), fold);
      for (let i = 0; i < 40 && (await fstate()).focus !== 'Mode B'; i++) await p.keyboard.press('ArrowDown');
      s = await fstate();
      check('fold: the keyboard reaches Mode B in the folded group\'s menu', s.open && s.focus === 'Mode B', s);
      await p.evaluate(() => { document.activeElement.__mark = 1; });
      for (let i = 0; i < 3; i++) { await p.evaluate(() => pudlCommands.changed()); await settle(); }
      await p.evaluate(() => { __f.mode = 'c'; pudlCommands.changed(); }); await settle();
      s = await fstate();
      check('fold: updates leave it open at its button, focus on Mode B, with the tick current', s.open && s.anchor && s.focus === 'Mode B' && (await p.evaluate(() => document.activeElement.__mark === 1)) && JSON.stringify(s.checked) === '["Mode C"]' && !(await p.evaluate(() => __fe.length)), s);
      for (let i = 0; i < 30 && (await fstate()).focus !== 'Item 12'; i++) await p.keyboard.press('ArrowDown');
      const fb = await fstate();
      await p.evaluate(() => { __f.mode = 'a'; pudlCommands.changed(); }); await settle();
      s = await fstate();
      check('fold: a scrolled row keeps focus and scroll through an update', s.focus === 'Item 12' && Math.abs(s.scroll - fb.scroll) <= 1 && JSON.stringify(s.checked) === '["Mode A"]', { fb, s });
      await p.evaluate(() => { __f.dropItem = 'item-12'; pudlCommands.changed(); }); await settle();
      s = await fstate();
      check('fold: a focused command that goes passes focus to the first enabled row, in sight', s.open && s.inMenu && s.focus !== 'Item 12' && s.inSight, s);
      await p.evaluate(() => { __f.dropItem = null; __f.bOff = true; pudlCommands.changed(); }); await settle();
      check('fold: a disabled command shows as disabled at once', (await fstate()).off.includes('Mode B'));
      await p.keyboard.press('Escape'); await settle();
      check('fold: Escape still closes it', !(await fstate()).open);
    }
  } catch (e) { console.error(e); failed++; }
  finally { await b.close(); }
  if (failed) { console.log(failed + ' failed'); process.exitCode = 1; }
})();
