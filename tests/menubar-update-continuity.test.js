/* An open menu, submenu or ribbon dropdown outlasts the page's updates:
   a redraw of the commands that changes nothing, a redraw that changes a
   command's state, a rename or reorder of commands with stable ids, and a
   retitle of the window in front, which builds the bar again. Through
   each, the popup is never closed, its anchor and scroll stay, focus never
   leaves the focused row, and the rows show the current state. When the
   focused command goes or is disabled, focus moves to the first enabled
   row of its menu; when a submenu or dropdown's own command goes or is
   disabled, it closes and focus moves to its enabled row in the menu
   around it, else that menu's first enabled row, else the title or tab.
   Narrow sheets and the collapsed bar's submenus shown in the panel's
   place keep their place too. Escape, a press outside and choosing a
   command still close the popup, and an update right after them does not
   bring it back or take focus. */
const { launch, ROOT } = require('./lib');
(async () => {
  const b = await launch();
  let failed = 0;
  const check = (name, pass, detail) => { console.log((pass ? 'PASS ' : 'FAIL ') + name + (pass || detail === undefined ? '' : ' :: ' + JSON.stringify(detail))); if (!pass) failed++; };
  try {
    const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
    await p.goto(ROOT + '/tests/fixtures/menubar-freshness.html');
    await p.waitForFunction(() => window.pudlMenubar && document.querySelector('[data-applet="notes"][data-applet-state="running"]'));
    /* The Notes applet's File menu, read afresh each time from flags. */
    await p.evaluate(() => {
      window.__flags = { lowerOff: false, titleGone: false, noCase: false, caseOff: false, mode: 'a', rename: false, reorder: false, extra: 0 };
      window.__menus = () => {
        const f = window.__flags;
        let cases = [{ id: 'upper', label: 'Upper case', run: () => __log.push('upper') },
          { id: 'lower', label: f.rename ? 'Small letters' : 'Lower case', disabled: f.lowerOff, run: () => __log.push('lower') }];
        if (!f.titleGone) cases.push({ id: 'title', label: 'Title case', run: () => __log.push('title') });
        if (f.reorder) cases = cases.slice().reverse();
        cases.push('-', { id: 'mode-a', label: 'Mode A', radio: 'mode', checked: f.mode === 'a', run: () => { f.mode = 'a'; } }, { id: 'mode-b', label: 'Mode B', radio: 'mode', checked: f.mode === 'b', run: () => { f.mode = 'b'; } });
        for (let i = 0; i < f.extra; i++) cases.push({ id: 'extra-' + i, label: 'Extra ' + i, run: () => __log.push('extra ' + i) });
        const file = [{ id: 'save', label: 'Save', run: () => __log.push('save') }, { id: 'new', label: 'New window', run: () => {} }, '-'];
        if (!f.noCase) file.push({ id: 'case', label: 'Change case', disabled: f.caseOff, items: cases });
        file.push({ id: 'print', label: 'Print', run: () => __log.push('print') });
        return { titles: [{ label: 'Notes', items: [{ label: 'About Notes', run: () => {} }] }, { label: 'File', items: file }] };
      };
      pudlWindows.raise('notes');
      /* Every close of a popup and every time focus leaves a menu row. */
      window.__events = [];
      document.addEventListener('toggle', e => { if (e.newState === 'closed' && e.target.matches('.menu-panel')) __events.push('closed ' + (e.target.id || 'panel')); }, true);
      document.addEventListener('focusout', e => { if (e.target.closest && e.target.closest('.menu-panel')) __events.push('focusout ' + e.target.textContent.trim()); }, true);
    });
    await p.waitForFunction(() => [...document.querySelectorAll('.menubar-front .menubar-title')].some(x => x.textContent === 'File'));
    const state = () => p.evaluate(() => {
      const a = document.activeElement, panel = document.getElementById('menubar-panel'), sub = document.getElementById('menubar-sub');
      const anchor = panel && document.getElementById(panel.getAttribute('data-menu-anchor'));
      const drop = document.querySelector('#menubar-ribbon-row .menu-panel:popover-open');
      const dropBtn = drop && document.querySelector('[popovertarget="' + drop.id + '"]');
      const rowsOf = host => host ? [...host.querySelectorAll(':scope > .menu-action')].filter(r => r.getClientRects().length) : [];
      const firstOn = host => { const r = rowsOf(host).find(x => !x.classList.contains('menubar-back') && x.getAttribute('aria-disabled') !== 'true'); return r ? r.textContent.trim() : null; };
      return {
        panel: !!panel && panel.matches(':popover-open'), sub: !!sub && sub.isConnected && sub.matches(':popover-open'),
        sheet: !!panel && panel.classList.contains('sheet'), back: !!panel && !!panel.querySelector(':scope > .menubar-back'),
        anchor: anchor ? anchor.textContent.trim() : null, anchorConnected: !!anchor && anchor.isConnected,
        focus: a ? (a.querySelector('.menubar-words, .toolbar-words') || a).textContent.trim() : null, el: a, focusConnected: !!a && a.isConnected && a !== document.body,
        focusDisabled: !!a && (a.disabled || a.getAttribute('aria-disabled') === 'true'), focusInSub: !!sub && sub.contains(a), focusRole: a && a.getAttribute('role'),
        drop: drop ? drop.getAttribute('aria-label') : null, dropBtnConnected: !!dropBtn && dropBtn.isConnected,
        checked: [...document.querySelectorAll('[role=menuitemradio], [role=menuitemcheckbox]')].filter(r => r.getClientRects().length && r.getAttribute('aria-checked') === 'true').map(r => r.textContent.trim()),
        scroll: { panel: panel ? panel.scrollTop : 0, sub: sub ? sub.scrollTop : 0, drop: drop ? drop.scrollTop : 0 },
        firstPanel: firstOn(panel), firstSub: firstOn(sub), firstDrop: firstOn(drop),
      };
    });
    /* An update, with the state read in the same task as it and again once
       everything it set off has run, and what closed or lost focus. */
    const marked = () => p.evaluate(() => { document.activeElement.__mark = 1; window.__events = []; });
    async function update(fn, arg) {
      const now = await p.evaluate(([fn, arg]) => {
        (new Function('arg', fn))(arg);
        const a = document.activeElement;
        return { same: a.__mark === 1, open: !!document.querySelector('#menubar-panel:popover-open, #menubar-ribbon-row .menu-panel:popover-open') };
      }, [fn.toString().replace(/^[^{]*{|}$/g, ''), arg]);
      await p.waitForTimeout(150);
      const later = await p.evaluate(() => ({ same: document.activeElement.__mark === 1, events: window.__events.slice() }));
      return { now, later };
    }
    const noop = () => { pudlCommands.changed(); pudlMenubar.refresh(); };
    const retitle = arg => { pudlWindows.retitle('notes', 'Notes ' + arg); };
    const flag = arg => { Object.assign(__flags, arg); pudlCommands.changed(); };
    const settle = () => p.waitForTimeout(150);
    const keepsAll = r => r.now.same && r.now.open && r.later.same && !r.later.events.length;
    const fileTitle = () => p.locator('.menubar-front .menubar-title').filter({ hasText: /^File$/ });

    /* The standard menu, by keyboard: File, Change case, Lower case. */
    async function openTo(row) {
      await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await settle();
      await fileTitle().focus();
      await p.keyboard.press('ArrowDown');
      await p.waitForFunction(() => document.getElementById('menubar-panel').matches(':popover-open'));
      for (let i = 0; i < 8 && (await state()).focus !== 'Change case'; i++) await p.keyboard.press('ArrowDown');
      await p.keyboard.press('ArrowRight');
      await p.waitForFunction(() => document.getElementById('menubar-sub') && document.getElementById('menubar-sub').matches(':popover-open'));
      for (let i = 0; i < 40 && (await state()).focus !== row; i++) await p.keyboard.press('ArrowDown');
      return state();
    }
    let s = await openTo('Lower case');
    check('menu: the keyboard reaches Lower case in the open submenu', s.panel && s.sub && s.focus === 'Lower case' && s.focusInSub, s);
    let n = 0;
    for (const [name, fn] of [['a redraw that changes nothing', noop], ['a retitle of the window in front', retitle]]) {
      await marked();
      let all = true, last;
      for (let i = 0; i < 3; i++) { last = await update(fn, ++n); all = all && keepsAll(last); }
      s = await state();
      check('menu: through ' + name + ', menu and submenu never close and focus never leaves Lower case', all && s.sub && s.focus === 'Lower case' && s.anchorConnected && s.anchor === 'File', { last, s });
    }
    await marked();
    let r = await update(flag, { mode: 'b' });
    s = await state();
    check('menu: a changed tick shows in the open submenu, nothing closing', keepsAll(r) && JSON.stringify(s.checked) === '["Mode B"]', { r, s });
    await marked();
    r = await update(flag, { rename: true });
    s = await state();
    check('menu: a command renamed under its id keeps focus on its row', keepsAll(r) && s.focus === 'Small letters', { r, s });
    await marked();
    r = await update(flag, { reorder: true });
    s = await state();
    check('menu: rows reordered around the focused one keep focus on it', keepsAll(r) && s.focus === 'Small letters', { r, s });
    await p.keyboard.press('ArrowDown');
    check('menu: the keyboard goes on from the row\'s new place', (await state()).focus === 'Upper case');
    await p.evaluate(() => Object.assign(__flags, { rename: false, reorder: false })); await p.evaluate(() => pudlCommands.changed()); await settle();

    s = await openTo('Title case');
    await p.evaluate(() => { __flags.titleGone = true; pudlCommands.changed(); }); await settle();
    s = await state();
    check('menu: when the focused command goes, focus moves to the first enabled row of its submenu', s.sub && s.focusInSub && s.focus === 'Upper case' && s.firstSub === 'Upper case', s);
    await p.evaluate(() => { __flags.titleGone = false; pudlCommands.changed(); }); await settle();
    s = await openTo('Lower case');
    await p.evaluate(() => { __flags.lowerOff = true; pudlCommands.changed(); }); await settle();
    s = await state();
    check('menu: when the focused command is disabled, focus moves to the first enabled row of its submenu', s.sub && s.focusInSub && !s.focusDisabled && s.focus === 'Upper case', s);
    await p.evaluate(() => { __flags.lowerOff = false; pudlCommands.changed(); }); await settle();
    s = await openTo('Lower case');
    await p.evaluate(() => { __flags.caseOff = true; pudlCommands.changed(); }); await settle();
    s = await state();
    check('menu: when the submenu\'s command is disabled, it closes and focus moves to the menu\'s first enabled row', s.panel && !s.sub && !s.focusDisabled && s.focusConnected && s.focus === 'Save' && s.anchor === 'File', s);
    await p.evaluate(() => { __flags.caseOff = false; pudlCommands.changed(); }); await settle();
    s = await openTo('Lower case');
    await p.evaluate(() => { __flags.noCase = true; pudlCommands.changed(); }); await settle();
    s = await state();
    check('menu: when the submenu\'s command goes, it closes and focus moves to the menu\'s first enabled row', s.panel && !s.sub && s.focusConnected && s.focus === 'Save', s);
    await p.evaluate(() => { __flags.noCase = false; pudlCommands.changed(); }); await settle();

    /* A long submenu scrolled to its foot keeps its scroll. */
    await p.evaluate(() => { __flags.extra = 40; pudlCommands.changed(); });
    s = await openTo('Extra 30');
    const before = s.scroll.sub;
    await marked();
    r = await update(flag, { mode: 'a' });
    s = await state();
    check('menu: a scrolled submenu keeps its scroll and focus through a state change', keepsAll(r) && before > 0 && Math.abs(s.scroll.sub - before) <= 1 && s.focus === 'Extra 30' && JSON.stringify(s.checked) === '["Mode A"]', { before, r, s });
    await p.evaluate(() => { __flags.extra = 0; pudlCommands.changed(); }); await settle();

    /* The pointer over a row while an update comes. */
    s = await openTo('Lower case');
    const lower = p.locator('#menubar-sub .menu-action').filter({ hasText: /^Upper case/ });
    await lower.hover();
    await marked();
    r = await update(noop, 0);
    s = await state();
    check('menu: an update under the pointer leaves the menu and submenu open', r.now.open && r.later.events.filter(e => e.startsWith('closed')).length === 0 && s.sub, { r, s });
    await lower.click(); await settle();
    check('menu: choosing a row after an update runs it once and closes the menu', !(await state()).panel && (await p.evaluate(() => __log.filter(x => x === 'upper').length)) === 1);

    /* Dismissal followed at once by an update stays dismissed. */
    s = await openTo('Lower case');
    await p.evaluate(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    await p.keyboard.press('Escape');
    await p.keyboard.press('Escape');
    await p.evaluate(() => { pudlCommands.changed(); pudlMenubar.refresh(); }); await settle();
    s = await state();
    check('menu: Escape then an update leaves the menu closed', !s.panel && !s.sub, s);
    await openTo('Lower case');
    await p.mouse.click(700, 700); await settle();
    await marked();
    await p.evaluate(() => { pudlCommands.changed(); pudlMenubar.refresh(); pudlWindows.retitle('notes', 'Notes after'); }); await settle();
    s = await state();
    check('menu: a press outside closes menu and submenu, and an update after it leaves them closed and focus where it was', !s.panel && !s.sub && (await p.evaluate(() => document.activeElement.__mark === 1)), s);

    /* A menu opened with the pointer, with focus left elsewhere. */
    await fileTitle().click();
    await p.waitForFunction(() => document.getElementById('menubar-panel').matches(':popover-open'));
    await p.evaluate(() => document.getElementById('note').focus());
    await p.evaluate(() => { pudlCommands.changed(); pudlWindows.retitle('notes', 'Notes again'); }); await settle();
    check('menu: an update leaves focus the reader left elsewhere', (await p.evaluate(() => document.activeElement.id)) === 'note' && (await state()).panel);
    await p.mouse.click(700, 700); await settle();

    /* A narrow window: the panel is a sheet and a submenu takes its place.
       At 600 pixels the bar keeps its titles; at 420 it collapses to one
       menu, whose titles are rows leading to their commands. */
    for (const [width, mode] of [[600, 'b'], [420, 'a']]) {
    await p.setViewportSize({ width, height: 800 });
    await settle();
    const collapsed = await p.evaluate(() => !!document.querySelector('.menubar-one .menubar-title') && document.querySelector('.menubar-one .menubar-title').getClientRects().length > 0);
    check(width + 'px: the bar is ' + (width === 420 ? 'collapsed' : 'not collapsed'), collapsed === (width === 420));
    if (collapsed) {
      await p.locator('.menubar-one .menubar-title').focus();
      await p.keyboard.press('ArrowDown');
      await p.waitForFunction(() => document.getElementById('menubar-panel').matches(':popover-open'));
      for (let i = 0; i < 20 && (await state()).focus !== 'File'; i++) await p.keyboard.press('ArrowDown');
      await p.keyboard.press('ArrowRight');
    } else {
      await fileTitle().focus();
      await p.keyboard.press('ArrowDown');
    }
    await p.waitForFunction(() => document.getElementById('menubar-panel').matches(':popover-open'));
    for (let i = 0; i < 10 && (await state()).focus !== 'Change case'; i++) await p.keyboard.press('ArrowDown');
    await p.keyboard.press('ArrowRight');
    for (let i = 0; i < 10 && (await state()).focus !== 'Lower case'; i++) await p.keyboard.press('ArrowDown');
    s = await state();
    check(width + 'px narrow (' + (collapsed ? 'collapsed bar' : 'sheet') + '): the keyboard reaches Lower case in a submenu shown in the panel\'s place', s.panel && s.sheet && s.back && s.focus === 'Lower case', s);
    let allNarrow = true, lastNarrow;
    await marked();
    for (const fn of [noop, retitle, noop]) { lastNarrow = await update(fn, ++n); allNarrow = allNarrow && keepsAll(lastNarrow); }
    s = await state();
    check(width + 'px narrow: updates and a retitle keep the submenu in the panel\'s place with focus on Lower case', allNarrow && s.back && s.focus === 'Lower case', { lastNarrow, s });
    await p.evaluate(mode => { __flags.mode = mode; pudlCommands.changed(); }, mode); await settle();
    check(width + 'px narrow: a changed tick shows there', JSON.stringify((await state()).checked) === JSON.stringify([mode === 'a' ? 'Mode A' : 'Mode B']));
    await p.keyboard.press('ArrowLeft'); await settle();
    s = await state();
    check(width + 'px narrow: Back after the updates shows the level above with focus on Change case', s.panel && s.focus === 'Change case' && (collapsed ? s.back : !s.back), s);
    await p.keyboard.press('ArrowRight'); await settle();
    for (let i = 0; i < 10 && (await state()).focus !== 'Lower case'; i++) await p.keyboard.press('ArrowDown');
    await p.evaluate(() => { __flags.caseOff = true; pudlCommands.changed(); }); await settle();
    s = await state();
    check(width + 'px narrow: when the submenu\'s command is disabled, its row\'s menu shows with focus on its first enabled row', s.panel && !s.focusDisabled && s.focusConnected && s.focus === s.firstPanel && s.focus !== 'Back', s);
    await p.evaluate(() => { __flags.caseOff = false; pudlCommands.changed(); }); await settle();
    await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await settle();
    }
    await p.setViewportSize({ width: 1400, height: 900 });
    await settle();

    /* The ribbon: File's tab, the Change case dropdown, Lower case. */
    await p.evaluate(() => pudlMenubar.ribbon(true));
    await fileTitle().click();
    const caseButton = () => p.locator('#menubar-ribbon-row .menu > .menu-btn').filter({ hasText: /Change case/ });
    await caseButton().waitFor();
    async function openDrop(row) {
      await p.keyboard.press('Escape'); await settle();
      await caseButton().focus();
      await p.keyboard.press('ArrowDown');
      await p.waitForFunction(() => !!document.querySelector('#menubar-ribbon-row .menu-panel:popover-open'));
      for (let i = 0; i < 40 && (await state()).focus !== row; i++) await p.keyboard.press('ArrowDown');
      return state();
    }
    s = await openDrop('Lower case');
    check('ribbon: the keyboard reaches Lower case in the open dropdown', s.drop === 'Change case' && s.focus === 'Lower case', s);
    for (const [name, fn] of [['a redraw that changes nothing', noop], ['a retitle of the window in front', retitle]]) {
      await marked();
      let all = true, last;
      for (let i = 0; i < 3; i++) { last = await update(fn, ++n); all = all && keepsAll(last); }
      s = await state();
      check('ribbon: through ' + name + ', the dropdown never closes and focus never leaves Lower case', all && s.drop === 'Change case' && s.dropBtnConnected && s.focus === 'Lower case', { last, s });
    }
    await marked();
    r = await update(flag, { mode: 'a' });
    s = await state();
    check('ribbon: a changed tick shows in the open dropdown, nothing closing', keepsAll(r) && JSON.stringify(s.checked) === '["Mode A"]', { r, s });
    await marked();
    r = await update(flag, { rename: true, reorder: true });
    s = await state();
    check('ribbon: a renamed and reordered command keeps focus on its row', keepsAll(r) && s.focus === 'Small letters', { r, s });
    await p.evaluate(() => { Object.assign(__flags, { rename: false, reorder: false }); pudlCommands.changed(); }); await settle();
    s = await openDrop('Title case');
    await p.evaluate(() => { __flags.titleGone = true; pudlCommands.changed(); }); await settle();
    s = await state();
    check('ribbon: when the focused command goes, focus moves to the dropdown\'s first enabled row', s.drop === 'Change case' && s.focus === 'Upper case', s);
    await p.evaluate(() => { __flags.titleGone = false; pudlCommands.changed(); }); await settle();
    await p.evaluate(() => { __flags.extra = 40; pudlCommands.changed(); }); await settle();
    s = await openDrop('Extra 30');
    const dropBefore = s.scroll.drop;
    await marked();
    r = await update(flag, { mode: 'b' });
    s = await state();
    check('ribbon: a scrolled dropdown keeps its scroll and focus through a state change', keepsAll(r) && dropBefore > 0 && Math.abs(s.scroll.drop - dropBefore) <= 1 && s.focus === 'Extra 30', { dropBefore, r, s });
    await p.evaluate(() => { __flags.extra = 0; pudlCommands.changed(); }); await settle();
    s = await openDrop('Lower case');
    await p.evaluate(() => { __flags.caseOff = true; pudlCommands.changed(); }); await settle();
    s = await state();
    const button = await p.evaluate(() => { const b = [...document.querySelectorAll('#menubar-ribbon-row .menu > .menu-btn')].find(x => /Change case/.test(x.textContent)); return b && b.disabled; });
    check('ribbon: when the dropdown\'s command is disabled, it closes, its button is disabled and focus moves to the tab', !s.drop && button === true && s.focus === 'File' && s.focusConnected, { s, button });
    await p.evaluate(() => { __flags.caseOff = false; pudlCommands.changed(); }); await settle();
    s = await openDrop('Lower case');
    await p.evaluate(() => { __flags.noCase = true; pudlCommands.changed(); }); await settle();
    s = await state();
    check('ribbon: when the dropdown\'s command goes, focus moves to the tab', !s.drop && s.focus === 'File' && s.focusConnected, s);
    await p.evaluate(() => { __flags.noCase = false; pudlCommands.changed(); }); await settle();
    s = await openDrop('Upper case');
    await p.locator('#menubar-ribbon-row .menu-panel:popover-open .menu-action').filter({ hasText: /^Upper case/ }).hover();
    await update(noop, 0);
    await p.locator('#menubar-ribbon-row .menu-panel:popover-open .menu-action').filter({ hasText: /^Upper case/ }).click(); await settle();
    s = await state();
    check('ribbon: choosing a row after an update runs it once and closes the dropdown', !s.drop && (await p.evaluate(() => __log.filter(x => x === 'upper').length)) === 2, s);
    await openDrop('Lower case');
    await p.keyboard.press('Escape');
    await p.evaluate(() => { pudlCommands.changed(); pudlMenubar.refresh(); }); await settle();
    check('ribbon: Escape then an update leaves the dropdown closed', !(await state()).drop);
    await openDrop('Lower case');
    await p.mouse.click(700, 700);
    await p.evaluate(() => { pudlCommands.changed(); pudlMenubar.refresh(); }); await settle();
    s = await state();
    check('ribbon: a press outside then an update leaves it closed', !s.drop, s);
    await p.evaluate(() => pudlMenubar.ribbon(false));
  } catch (e) { console.error(e); failed++; }
  finally { await b.close(); }
  if (failed) { console.log(failed + ' failed'); process.exitCode = 1; }
})();
