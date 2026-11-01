/* A searchable select whose options a script changes while its list is
   open: the list follows at once for what is typed, without touching the
   field, its text, its caret or a composition in progress, and keeps the
   row the keyboard is on while its option is there. A disabled option is
   never offered or chosen, and a row whose option was removed or disabled
   after it was drawn chooses nothing. A list left with no rows closes. */
const { launch, ROOT } = require('./lib');
(async () => {
  const b = await launch();
  let failed = 0;
  const check = (name, pass, detail) => { console.log((pass ? 'PASS ' : 'FAIL ') + name + (pass || detail === undefined ? '' : ' :: ' + JSON.stringify(detail))); if (!pass) failed++; };
  try {
    const p = await b.newPage({ viewport: { width: 900, height: 600 } });
    await p.goto(ROOT + '/tests/fixtures/combo-continuity.html');
    await p.waitForSelector('#pick-combo');
    const state = () => p.evaluate(() => {
      const f = document.getElementById('pick-combo'), list = document.getElementById(f.getAttribute('aria-controls'));
      const act = f.getAttribute('aria-activedescendant'), actEl = act && document.getElementById(act);
      return { open: list.matches(':popover-open'), rows: [...list.querySelectorAll('[role=option]')].map(r => r.textContent.trim()), active: actEl ? actEl.textContent.trim() : null,
        text: f.value, caret: f.selectionStart, focused: document.activeElement === f, select: document.getElementById('pick').value, mark: f.__mark === 1 };
    });
    const settle = () => p.waitForTimeout(100);
    await p.click('#pick-combo .combo-open, .combo-open').catch(() => {});
    await settle();
    let s = await state();
    check('the whole list does not offer the disabled option', s.open && !s.rows.includes('Gamma') && s.rows.includes('Alpha'), s);
    await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await settle();

    await p.focus('#pick-combo');
    await p.keyboard.press('Control+A');
    await p.keyboard.type('ta');
    await settle();
    await p.keyboard.press('ArrowDown');
    await p.evaluate(() => { const f = document.getElementById('pick-combo'); f.setSelectionRange(1, 1); f.__mark = 1; });
    s = await state();
    check('typing ta lists Beta, Delta and Eta, the keyboard on Beta', s.open && JSON.stringify(s.rows) === '["Beta","Delta","Eta"]' && s.active === 'Beta' && s.caret === 1, s);
    await p.evaluate(() => { const o = new Option('Zeta', 'zeta'); document.getElementById('pick').add(o); });
    await settle();
    s = await state();
    check('an option added while the list is open shows at once, text, caret and keyboard row kept', s.open && s.rows.includes('Zeta') && s.text === 'ta' && s.caret === 1 && s.focused && s.mark && s.active === 'Beta', s);
    await p.evaluate(() => { document.querySelector('#pick option[value=beta]').disabled = true; });
    await settle();
    s = await state();
    check('an option disabled while the list is open leaves it at once, text and caret kept', s.open && !s.rows.includes('Beta') && s.text === 'ta' && s.caret === 1 && s.focused, s);
    await p.evaluate(() => { document.querySelector('#pick option[value=delta]').textContent = 'Delta (renamed)'; });
    await settle();
    s = await state();
    check('an option renamed while the list is open shows its new words', s.rows.includes('Delta (renamed)'), s);
    const chose = await p.evaluate(() => {
      const f = document.getElementById('pick-combo'), list = document.getElementById(f.getAttribute('aria-controls'));
      const stale = [...list.querySelectorAll('[role=option]')].find(r => /Eta/.test(r.textContent) && !/Zeta/.test(r.textContent));
      const was = document.getElementById('pick').value;
      document.querySelector('#pick option[value=eta]').remove();
      stale.click();
      return { was, now: document.getElementById('pick').value, text: f.value };
    });
    await settle();
    s = await state();
    check('a row whose option was removed after it was drawn chooses nothing', chose.now === chose.was && chose.text === 'ta' && !s.rows.includes('Eta'), { chose, s });
    const chose2 = await p.evaluate(() => {
      const f = document.getElementById('pick-combo'), list = document.getElementById(f.getAttribute('aria-controls'));
      const stale = [...list.querySelectorAll('[role=option]')].find(r => /Zeta/.test(r.textContent));
      const was = document.getElementById('pick').value;
      document.querySelector('#pick option[value=zeta]').disabled = true;
      stale.click();
      return { was, now: document.getElementById('pick').value };
    });
    check('a row whose option was disabled after it was drawn chooses nothing', chose2.now === chose2.was, chose2);
    await settle();
    await p.evaluate(() => { const f = document.getElementById('pick-combo'); f.dispatchEvent(new CompositionEvent('compositionstart', { data: '' })); f.setSelectionRange(2, 2); });
    await p.evaluate(() => { document.getElementById('pick').add(new Option('Theta', 'theta')); });
    await settle();
    s = await state();
    check('during a composition the list follows and the field is untouched', s.open && s.rows.includes('Theta') && s.text === 'ta' && s.caret === 2 && s.focused, s);
    await p.evaluate(() => { document.getElementById('pick-combo').dispatchEvent(new CompositionEvent('compositionend', { data: '' })); });
    await p.evaluate(() => { ['delta', 'theta'].forEach(v => document.querySelector('#pick option[value=' + v + ']').remove()); });
    await settle();
    s = await state();
    check('a list left with no rows closes, the text kept', !s.open && s.text === 'ta' && s.focused, s);
    await p.keyboard.press('Control+A');
    await p.keyboard.type('al');
    await settle();
    await p.keyboard.press('ArrowDown');
    await p.keyboard.press('Enter');
    await settle();
    s = await state();
    check('choosing a current row still works', s.select === 'alpha' && !s.open, s);
    await p.focus('#pick-combo');
    await p.keyboard.press('Control+A');
    await p.keyboard.type('a');
    await settle();
    await p.keyboard.press('Escape'); await settle();
    await p.evaluate(() => document.getElementById('pick').add(new Option('Kappa', 'kappa')));
    await settle();
    check('an update after Escape leaves the list closed', !(await state()).open);
  } catch (e) { console.error(e); failed++; }
  finally { await b.close(); }
  if (failed) { console.log(failed + ' failed'); process.exitCode = 1; }
})();
