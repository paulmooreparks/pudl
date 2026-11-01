/* An open menu, submenu or ribbon dropdown outlasts the page's updates:
   a redraw of the commands that changes nothing, a redraw that changes a
   command's state, and a retitle of the window in front, which builds the
   bar again. It stays open at the same anchor, focus stays on the same
   command, and the rows show the current state. When the focused command
   is disabled or goes, focus moves to an enabled row, or to a control
   still in the bar, never to one that has left the page. Escape, a press
   outside and choosing a command still close it. */
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
      window.__flags = { lowerOff: false, noCase: false, lowerGone: false, mode: 'a' };
      window.__menus = () => {
        const f = window.__flags, cases = [{ label: 'Upper case', run: () => __log.push('upper') }];
        if (!f.lowerGone) cases.push({ label: 'Lower case', disabled: f.lowerOff, run: () => __log.push('lower') });
        cases.push({ label: 'Title case', run: () => __log.push('title') });
        cases.push('-', { label: 'Mode A', radio: 'mode', checked: f.mode === 'a', run: () => { f.mode = 'a'; } }, { label: 'Mode B', radio: 'mode', checked: f.mode === 'b', run: () => { f.mode = 'b'; } });
        const file = [{ label: 'Save', run: () => __log.push('save') }, { label: 'New window', run: () => {} }, '-'];
        if (!f.noCase) file.push({ label: 'Change case', items: cases });
        file.push({ label: 'Print', run: () => __log.push('print') });
        return { titles: [{ label: 'Notes', items: [{ label: 'About Notes', run: () => {} }] }, { label: 'File', items: file }] };
      };
      pudlWindows.raise('notes');
    });
    await p.waitForFunction(() => [...document.querySelectorAll('.menubar-front .menubar-title')].some(x => x.textContent === 'File'));
    const state = () => p.evaluate(() => {
      const a = document.activeElement, panel = document.getElementById('menubar-panel'), sub = document.getElementById('menubar-sub');
      const anchor = panel && document.getElementById(panel.getAttribute('data-menu-anchor'));
      const drop = document.querySelector('#menubar-ribbon-row .menu-panel:popover-open');
      const dropBtn = drop && document.querySelector('[popovertarget="' + drop.id + '"]');
      return {
        panel: !!panel && panel.matches(':popover-open'), sub: !!sub && sub.matches(':popover-open') && sub.isConnected,
        anchor: anchor ? anchor.textContent.trim() : null, anchorConnected: !!anchor && anchor.isConnected,
        focus: a ? (a.querySelector('.menubar-words') || a).textContent.trim() : null, focusConnected: !!a && a.isConnected && a !== document.body,
        focusDisabled: !!a && (a.disabled || a.getAttribute('aria-disabled') === 'true'), focusInSub: !!sub && sub.contains(a),
        drop: drop ? drop.getAttribute('aria-label') : null, dropBtn: dropBtn ? dropBtn.textContent.trim() : null, dropBtnConnected: !!dropBtn && dropBtn.isConnected,
        checked: [...document.querySelectorAll('[role=menuitemradio]')].filter(r => r.getClientRects().length && r.getAttribute('aria-checked') === 'true').map(r => r.textContent.trim()),
      };
    });
    const updates = {
      'a redraw that changes nothing': () => p.evaluate(() => { pudlCommands.changed(); pudlMenubar.refresh(); }),
      'a retitle of the window in front': (i) => p.evaluate(i => pudlWindows.retitle('notes', 'Notes ' + i), i),
    };
    const settle = () => p.waitForTimeout(120);

    /* The standard menu, reached by keyboard: File, Change case, Lower case. */
    const fileTitle = p.locator('.menubar-front .menubar-title').filter({ hasText: /^File$/ });
    async function openToLower() {
      await fileTitle.focus();
      await p.keyboard.press('ArrowDown');
      await p.waitForFunction(() => document.getElementById('menubar-panel').matches(':popover-open'));
      for (let i = 0; i < 6 && (await state()).focus !== 'Change case'; i++) await p.keyboard.press('ArrowDown');
      await p.keyboard.press('ArrowRight');
      await p.waitForFunction(() => document.getElementById('menubar-sub') && document.getElementById('menubar-sub').matches(':popover-open'));
      await p.keyboard.press('ArrowDown');
      return state();
    }
    let s0 = await openToLower();
    check('the keyboard reaches Lower case in the open submenu', s0.panel && s0.sub && s0.focus === 'Lower case' && s0.focusInSub, s0);
    let n = 0;
    for (const [name, update] of Object.entries(updates)) {
      for (let i = 0; i < 3; i++) { await update(++n); await settle(); }
      const s = await state();
      check('menu: after ' + name + ', menu and submenu stay open with focus on Lower case', s.panel && s.sub && s.focus === 'Lower case' && s.focusInSub && s.anchorConnected && s.anchor === 'File', s);
    }
    await p.keyboard.press('ArrowDown');
    check('menu: the keyboard goes on from where it was', (await state()).focus === 'Title case');
    await p.keyboard.press('ArrowUp');
    await p.evaluate(() => { __flags.mode = 'b'; pudlCommands.changed(); }); await settle();
    let s = await state();
    check('menu: a changed check shows in the open submenu', JSON.stringify(s.checked) === '["Mode B"]' && s.sub && s.focus === 'Lower case', s);
    await p.evaluate(() => { __flags.lowerOff = true; pudlCommands.changed(); }); await settle();
    s = await state();
    check('menu: a focused command that is disabled passes focus to an enabled row beside it', s.sub && s.focusConnected && !s.focusDisabled && s.focusInSub && ['Upper case', 'Title case'].includes(s.focus), s);
    await p.evaluate(() => { __flags.lowerOff = false; __flags.noCase = true; pudlCommands.changed(); }); await settle();
    s = await state();
    check('menu: when the submenu goes, focus moves to an enabled row of the menu still open', s.panel && !s.sub && s.focusConnected && !s.focusDisabled && !s.focusInSub && s.anchor === 'File', s);
    await p.keyboard.press('Escape');
    await settle();
    check('menu: Escape still closes it', !(await state()).panel);
    await p.evaluate(() => { __flags.noCase = false; });

    /* A menu opened with the pointer, with focus left where it was. */
    await p.evaluate(() => { const t = document.getElementById('note'); t.focus(); });
    await fileTitle.click();
    await p.waitForFunction(() => document.getElementById('menubar-panel').matches(':popover-open'));
    const before = await p.evaluate(() => document.activeElement.id || document.activeElement.className);
    await p.evaluate(() => pudlCommands.changed()); await settle();
    const after = await p.evaluate(() => document.activeElement.id || document.activeElement.className);
    check('menu: an update does not take focus the reader left elsewhere', before === after && (await state()).panel, { before, after });
    await p.mouse.click(700, 700);
    await settle();
    check('menu: a press outside still closes it', !(await state()).panel);
    await fileTitle.click();
    await p.locator('#menubar-panel .menu-action').filter({ hasText: /^Print/ }).click();
    await settle();
    check('menu: choosing a command runs it once and closes the menu', !(await state()).panel && (await p.evaluate(() => __log.filter(x => x === 'print').length)) === 1);

    /* The ribbon: File's tab, the Change case dropdown, Lower case. */
    await p.evaluate(() => pudlMenubar.ribbon(true));
    await fileTitle.click();
    const caseButton = () => p.locator('#menubar-ribbon-row .menu > .menu-btn').filter({ hasText: /Change case/ });
    await caseButton().waitFor();
    async function openDrop() {
      await caseButton().focus();
      await p.keyboard.press('ArrowDown');
      await p.waitForFunction(() => !!document.querySelector('#menubar-ribbon-row .menu-panel:popover-open'));
      for (let i = 0; i < 4 && (await state()).focus !== 'Lower case'; i++) await p.keyboard.press('ArrowDown');
      return state();
    }
    s0 = await openDrop();
    check('ribbon: the keyboard reaches Lower case in the open dropdown', s0.drop === 'Change case' && s0.focus === 'Lower case', s0);
    for (const [name, update] of Object.entries(updates)) {
      for (let i = 0; i < 3; i++) { await update(++n); await settle(); }
      s = await state();
      check('ribbon: after ' + name + ', the dropdown stays open at its button with focus on Lower case', s.drop === 'Change case' && s.dropBtnConnected && /Change case/.test(s.dropBtn) && s.focus === 'Lower case' && s.focusConnected, s);
    }
    await p.keyboard.press('ArrowDown');
    check('ribbon: the keyboard goes on from where it was', (await state()).focus === 'Title case');
    await p.keyboard.press('ArrowUp');
    await p.evaluate(() => { __flags.mode = 'a'; pudlCommands.changed(); }); await settle();
    s = await state();
    check('ribbon: a changed check shows in the open dropdown', JSON.stringify(s.checked) === '["Mode A"]' && s.drop === 'Change case' && s.focus === 'Lower case', s);
    await p.evaluate(() => { __flags.lowerGone = true; pudlCommands.changed(); }); await settle();
    s = await state();
    check('ribbon: when the focused command goes, focus moves to an enabled row of the open dropdown', s.drop === 'Change case' && s.focusConnected && !s.focusDisabled && ['Upper case', 'Title case'].includes(s.focus), s);
    await p.evaluate(() => { __flags.lowerGone = false; pudlCommands.changed(); }); await settle();
    await p.locator('#menubar-ribbon-row .menu-panel:popover-open .menu-action').filter({ hasText: /^Upper case/ }).click();
    await settle();
    s = await state();
    check('ribbon: choosing a command runs it once and closes the dropdown', !s.drop && (await p.evaluate(() => __log.filter(x => x === 'upper').length)) === 1, s);
    await openDrop();
    await p.keyboard.press('Escape'); await settle();
    check('ribbon: Escape still closes the dropdown', !(await state()).drop);
    await openDrop();
    await p.evaluate(() => { __flags.noCase = true; pudlCommands.changed(); }); await settle();
    s = await state();
    check('ribbon: when the dropdown goes, focus moves to a control still in the bar', !s.drop && s.focusConnected, s);
    await p.evaluate(() => pudlMenubar.ribbon(false));
  } catch (e) { console.error(e); failed++; }
  finally { await b.close(); }
  if (failed) { console.log(failed + ' failed'); process.exitCode = 1; }
})();
