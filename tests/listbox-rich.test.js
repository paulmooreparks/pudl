/* 0.97.0: rich list boxes. Rows the host writes with a title, a second
   line and a badge; groups; the native-backed list's keys and presses;
   rows hidden by a find field out of every key and keeping their choice;
   a section hiding with its rows; the change event, the value and a form
   field that takes the choice; a single list. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined && !ok ? ' ' + JSON.stringify(detail) : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const p = await b.newPage({ viewport: { width: 900, height: 800 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/tests/fixtures/listbox-rich.html');
  await p.waitForFunction(() => window.pudlListbox && document.querySelector('#members[role=listbox]'));
  const value = id => p.evaluate(id => pudlListbox.value(document.getElementById(id)), id);
  const activeRow = () => p.evaluate(() => { const l = document.activeElement; const r = l && l.getAttribute('aria-activedescendant') && document.getElementById(l.getAttribute('aria-activedescendant')); return r ? r.getAttribute('data-value') : null; });
  const changes = () => p.evaluate(() => { const r = __changes.slice(); __changes.length = 0; return r; });

  const shape = await p.evaluate(() => {
    const l = document.getElementById('members'), rows = [...l.querySelectorAll('.listbox-row')], secs = [...l.querySelectorAll(':scope > .listbox-section')];
    const r0 = rows[0], t = r0.querySelector('.listbox-title').getBoundingClientRect(), d = r0.querySelector('.listbox-detail').getBoundingClientRect(), bd = r0.querySelector('.badge').getBoundingClientRect();
    return { role: l.getAttribute('role'), multi: l.getAttribute('aria-multiselectable'), tab: l.tabIndex, opts: rows.every(r => r.getAttribute('role') === 'option'),
      marks: rows.every(r => r.firstElementChild.type === 'checkbox'), on: rows.map(r => r.getAttribute('aria-selected')), secs: secs.length, grp: secs.every(s => s.getAttribute('role') === 'group' && document.getElementById(s.getAttribute('aria-labelledby'))),
      disabled: rows[2].getAttribute('aria-disabled'), detailUnder: d.top >= t.bottom - 1, badgeEnd: bd.left > t.right };
  });
  check('the list takes the listbox pattern, rows as options with check boxes, groups labelled by their headings', shape.role === 'listbox' && shape.multi === 'true' && shape.tab === 0 && shape.opts && shape.marks && shape.secs === 2 && shape.grp, shape);
  check('a row\'s second line stands under its title and its badge at its end', shape.detailUnder && shape.badgeEnd, shape);
  check('the host\'s chosen and disabled rows are kept', JSON.stringify(shape.on) === '["true","false","false","false","false"]' && shape.disabled === 'true', shape);

  /* Presses. */
  await p.locator('#members .listbox-row[data-value="beacon"]').click();
  check('a press switches one row and leaves the others', JSON.stringify(await value('members')) === '["atlas","beacon"]', await value('members'));
  check('the change is told once, with the values, and the form field follows', JSON.stringify(await changes()) === '["members:atlas,beacon"]' && JSON.stringify(await p.evaluate(() => [...document.getElementById('picked').selectedOptions].map(o => o.value))) === '["atlas","beacon"]');
  await p.locator('#members .listbox-row[data-value="cobalt"]').click({ force: true });
  check('a disabled row is reached but not chosen', JSON.stringify(await value('members')) === '["atlas","beacon"]' && await activeRow() === 'cobalt');

  /* Keys. */
  await p.keyboard.press('ArrowDown');
  check('Down moves to the next row, across a group\'s heading', await activeRow() === 'delta');
  await p.keyboard.press('Space');
  check('Space switches the row', JSON.stringify(await value('members')) === '["atlas","beacon","delta"]');
  await p.keyboard.press('Shift+ArrowDown');
  check('Shift with Down sets a range to what its first row was given', JSON.stringify(await value('members')) === '["atlas","beacon","delta","ember"]', await value('members'));
  await p.keyboard.press('Home');
  await p.keyboard.type('em');
  check('typing a title\'s first letters moves to it', await activeRow() === 'ember');
  await p.keyboard.press('Control+A');
  check('Ctrl+A with every choosable row chosen lets them all go, leaving the disabled one alone', JSON.stringify(await value('members')) === '[]', await value('members'));
  await p.keyboard.press('Control+A');
  check('and again chooses them all', JSON.stringify(await value('members')) === '["atlas","beacon","delta","ember"]', await value('members'));
  await changes();

  /* A find field hiding rows. */
  await p.fill('#find', 'e');
  await p.waitForFunction(() => document.querySelector('#members .listbox-row[data-value="atlas"]').hidden);
  const filtered = await p.evaluate(() => ({ secs: [...document.querySelectorAll('#members > .listbox-section')].map(s => s.hidden) }));
  await p.fill('#find', 'em');
  await p.waitForFunction(() => document.querySelector('#members > .listbox-section').hidden);
  check('a section whose rows are all hidden hides with them', (await p.evaluate(() => [...document.querySelectorAll('#members > .listbox-section')].map(s => s.hidden))).join() === 'true,false' && filtered.secs.join() === 'false,false', filtered);
  await p.fill('#find', 'e');
  await p.waitForFunction(() => !document.querySelector('#members > .listbox-section').hidden);
  await p.focus('#members');
  await p.keyboard.press('Home');
  const firstShown = await activeRow();
  await p.keyboard.press('ArrowDown');
  const second = await activeRow();
  await p.keyboard.press('ArrowDown');
  const third = await activeRow();
  check('the arrows and Home pass hidden rows by', firstShown === 'beacon' && second === 'delta' && third === 'ember', [firstShown, second, third]);
  await p.keyboard.press('Control+A');
  check('Ctrl+A acts on the rows showing; a hidden row keeps its choice', JSON.stringify(await value('members')) === '["atlas"]', await value('members'));
  await p.keyboard.press('Control+A');
  await p.keyboard.press('Home');
  await p.keyboard.press('Space');
  await p.keyboard.press('Shift+End');
  check('a Shift range passes hidden rows by too', JSON.stringify(await value('members')) === '["atlas"]', await value('members'));
  await p.fill('#find', '');

  /* A single list. */
  check('a single list gives its value and radio buttons', await value('single') === 'y' && await p.evaluate(() => document.querySelector('#single .listbox-row input').type === 'radio' && !document.getElementById('single').hasAttribute('aria-multiselectable')));
  await p.focus('#single');
  await p.keyboard.press('ArrowDown');
  check('in a single list the choice follows the keys, one row chosen', await value('single') === 'z' && await p.evaluate(() => document.querySelectorAll('#single [aria-selected="true"]').length === 1));
  await p.locator('#single .listbox-row[data-value="x"]').click();
  check('a press chooses the row pressed', await value('single') === 'x');

  /* A row the host adds is taken in. */
  await p.evaluate(() => { const r = document.createElement('div'); r.className = 'listbox-row'; r.dataset.value = 'w'; r.innerHTML = '<span class="listbox-title">Wolfram</span>'; document.getElementById('single').appendChild(r); });
  await p.waitForFunction(() => document.querySelector('#single .listbox-row[data-value="w"][role=option] input'));
  check('a row the host adds is taken in', true);

  /* The page puts the keyboard on a row it has just added. */
  await p.evaluate(() => { const l = document.getElementById('members'); const r = document.createElement('div'); r.className = 'listbox-row'; r.dataset.value = 'fresh'; r.setAttribute('aria-selected', 'true'); r.innerHTML = '<span class="listbox-title">Fresh</span>'; l.querySelector('.listbox-section:last-child').appendChild(r); });
  const before = await value('members');
  const found = await p.evaluate(() => pudlListbox.activate(document.getElementById('members'), 'fresh'));
  await p.focus('#members');
  check('activate puts the keyboard on the row given, leaves the choice alone, and the list keeps it on focus', found && await activeRow() === 'fresh' && JSON.stringify(await value('members')) === JSON.stringify(before), { found, active: await activeRow(), before, after: await value('members') });
  check('activate with a value no row has says so', await p.evaluate(() => pudlListbox.activate(document.getElementById('members'), 'nobody')) === false);
  check('no page errors', !errors.length, errors);
  await b.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
