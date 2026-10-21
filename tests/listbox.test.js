/* List boxes (0.74.0): a select showing several rows drawn as a sunken
   list of rows with check boxes or radio buttons; its label, its keys,
   ranges, type-ahead, disabled options, groups, and how it keeps in step
   with the select it stands in for. */
const { launch, ROOT, out } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + (detail || '')));
  if (!ok) failures++;
}

(async () => {
  const browser = await launch();
  const p = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  await p.goto(ROOT + '/tests/fixtures/listbox.html');
  await p.waitForFunction(() => window.pudlListbox && document.querySelectorAll('.listbox').length === 3);
  await p.evaluate(() => {
    window.heard = [];
    ['input', 'change'].forEach(t => document.addEventListener(t, e => window.heard.push(t + ':' + (e.target.id || e.target.name)), true));
  });
  const heard = () => p.evaluate(() => { const h = window.heard.join(','); window.heard = []; return h; });
  const box = id => '#' + id + ' + .listbox';
  const chosen = id => p.evaluate(id => Array.from(document.getElementById(id).selectedOptions).map(o => o.value).join(','), id);
  const shown = id => p.evaluate(sel => Array.from(document.querySelectorAll(sel + ' [role=option][aria-selected=true]')).map(r => r.textContent).join(','), box(id));
  const activeText = id => p.evaluate(sel => { const b = document.querySelector(sel), a = b.getAttribute('aria-activedescendant'); return a ? document.getElementById(a).textContent : null; }, box(id));
  const row = (id, text) => p.locator(box(id) + ' [role=option]', { hasText: new RegExp('^' + text + '$') });
  const focused = () => p.evaluate(() => document.activeElement.className);

  /* Enhancement. */
  const setup = await p.evaluate(() => {
    const s = document.getElementById('accounts'), b = s.nextElementSibling;
    const lab = (b.getAttribute('aria-labelledby') || '').split(' ').map(i => document.getElementById(i).textContent).join(' ');
    const r = b.querySelector('[role=option]');
    return {
      hidden: s.hidden, role: b.getAttribute('role'), multi: b.getAttribute('aria-multiselectable'), tab: b.tabIndex, lab,
      rows: b.querySelectorAll('[role=option]').length, mark: r.querySelector('input').type, markHidden: r.querySelector('input').getAttribute('aria-hidden'),
      markTab: r.querySelector('input').tabIndex, shown: Math.round((b.clientHeight - 8) / r.offsetHeight), scrolls: b.scrollHeight > b.clientHeight,
      sunken: getComputedStyle(b).boxShadow.includes('inset')
    };
  });
  check('the select is hidden behind a list box labelled by its label', setup.hidden && setup.role === 'listbox' && setup.lab === 'Accounts' && setup.tab === 0, JSON.stringify(setup));
  check('a select taking several choices is multiselectable, a check box on each row, hidden from readers and out of the Tab order',
    setup.multi === 'true' && setup.rows === 12 && setup.mark === 'checkbox' && setup.markHidden === 'true' && setup.markTab === -1, JSON.stringify(setup));
  check('the list is as many rows tall as the select\'s size and scrolls beyond it', setup.shown === 6 && setup.scrolls, JSON.stringify(setup));
  check('the list is sunken, as a field is', setup.sunken);
  check('the chosen options show as chosen', await shown('accounts') === 'Billable,Internal');

  await p.click('label[for=accounts]');
  check('pressing the label puts the keyboard in the list', (await focused()).includes('listbox'));
  check('on the first chosen row', await activeText('accounts') === 'Billable');

  /* A press switches one row and leaves the others. */
  await heard();
  await row('accounts', 'Non-billable').click();
  check('a press chooses one more row and leaves the others chosen', await chosen('accounts') === 'bill,nonbill,int');
  check('and fires input and change on the select once each', await heard() === 'input:accounts,change:accounts');
  await row('accounts', 'Billable').click();
  check('a press on a chosen row lets it go, and only it', await chosen('accounts') === 'nonbill,int' && await shown('accounts') === 'Non-billable,Internal');
  await heard();

  /* Keys. */
  await p.keyboard.press('ArrowDown');
  check('Down moves the keyboard without choosing', await activeText('accounts') === 'Non-billable' && await chosen('accounts') === 'nonbill,int' && await heard() === '');
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('Space');
  check('Space switches the row the keyboard is on', await chosen('accounts') === 'nonbill,int,train' && await heard() === 'input:accounts,change:accounts');
  await p.keyboard.press('Shift+ArrowDown');
  await p.keyboard.press('Shift+ArrowDown');
  await p.keyboard.press('Shift+ArrowDown');
  check('Shift+Down chooses a range from the last row switched, past a disabled one', await chosen('accounts') === 'nonbill,int,train,pre,sup', await chosen('accounts'));
  await p.keyboard.press('Shift+ArrowUp');
  check('Shift+Up shrinks the range again', await chosen('accounts') === 'nonbill,int,train,pre', await chosen('accounts'));
  await heard();

  await row('accounts', 'Internal').click();
  check('a press on Internal lets it go', await chosen('accounts') === 'nonbill,train,pre');
  await heard();
  await row('accounts', 'Pre-sales').click({ modifiers: ['Shift'] });
  check('Shift+press sets the range to what the last switched row was given', await chosen('accounts') === 'nonbill', await chosen('accounts'));
  check('which is one change for the whole range', await heard() === 'input:accounts,change:accounts');

  await p.keyboard.press('Control+a');
  check('Ctrl+A chooses every row that can be chosen', await chosen('accounts') === 'bill,nonbill,int,train,pre,sup,mkt,rnd,adm,hol,sick', await chosen('accounts'));
  await p.keyboard.press('Control+a');
  check('and again, with every row chosen, chooses none', await chosen('accounts') === '');

  /* Disabled options. */
  await row('accounts', 'Travel').click({ force: true });
  const travel = await p.evaluate(() => document.querySelector('#accounts + .listbox [aria-disabled=true]').textContent);
  check('a disabled option is marked, dimmed, and not chosen by a press', travel === 'Travel' && await chosen('accounts') === '' && await activeText('accounts') === 'Travel');
  await p.keyboard.press('Space');
  check('nor by Space, though the keyboard reaches it', await chosen('accounts') === '');

  /* Home, End, PageUp, PageDown, type-ahead. */
  await p.keyboard.press('End');
  check('End goes to the last row', await activeText('accounts') === 'Sick leave');
  const scrolled = await p.evaluate(() => { const b = document.querySelector('#accounts + .listbox'), r = document.getElementById(b.getAttribute('aria-activedescendant')); const br = b.getBoundingClientRect(), rr = r.getBoundingClientRect(); return rr.bottom <= br.bottom + 1 && rr.top >= br.top - 1 && b.scrollTop > 0; });
  check('and the list scrolls to show it', scrolled);
  await p.keyboard.press('Home');
  check('Home goes to the first', await activeText('accounts') === 'Billable');
  await p.keyboard.press('PageDown');
  const pd = await activeText('accounts');
  check('PageDown moves by a screenful', pd === 'Pre-sales', pd);
  await p.keyboard.press('PageUp');
  check('PageUp moves back by one', await activeText('accounts') === 'Billable');
  await p.keyboard.type('s');
  check('a letter moves to the next row it begins', await activeText('accounts') === 'Support');
  await p.keyboard.type('s');
  check('the same letter again moves on to the next', await activeText('accounts') === 'Sick leave');
  await p.waitForTimeout(700);
  await p.keyboard.type('ho');
  check('letters typed together find the row they begin', await activeText('accounts') === 'Holiday');
  check('and type-ahead in a list of several chooses nothing', await chosen('accounts') === '');

  /* One choice: the choice follows the keyboard. */
  const single = await p.evaluate(() => {
    const b = document.querySelector('#office + .listbox');
    return { multi: b.hasAttribute('aria-multiselectable'), mark: b.querySelector('[role=option] input').type,
      groups: Array.from(b.querySelectorAll('[role=group]')).map(g => document.getElementById(g.getAttribute('aria-labelledby')).textContent).join(','),
      inGroup: b.querySelector('[role=group] > [role=option]') !== null };
  });
  check('a select taking one choice has radio buttons and is not multiselectable', !single.multi && single.mark === 'radio', JSON.stringify(single));
  check('optgroups become groups labelled by their headings, holding their rows', single.groups === 'Asia,Europe' && single.inGroup, JSON.stringify(single));
  await p.focus(box('office'));
  await heard();
  await p.keyboard.press('ArrowDown');
  check('Down in a list of one chooses the next row', await chosen('office') === 'mnl' && await shown('office') === 'Manila' && await heard() === 'input:office,change:office');
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('ArrowDown');
  check('a disabled row is reached but not chosen', await activeText('office') === 'Bangkok' && await chosen('office') === 'kl');
  await p.keyboard.type('h');
  check('type-ahead chooses in a list of one', await chosen('office') === 'ham');
  await row('office', 'Lisbon').click();
  check('a press chooses the row and lets the last one go', await chosen('office') === 'lis' && await shown('office') === 'Lisbon');
  await row('office', 'Lisbon').click();
  check('a press on the chosen row keeps it chosen', await chosen('office') === 'lis');

  /* The form. */
  const sent = await p.evaluate(() => Array.from(new FormData(document.getElementById('form')).entries()).map(e => e.join('=')).join('&'));
  check('the form sends the selects\' values, and a list with none chosen sends nothing', sent === 'office=lis', sent);
  await row('accounts', 'Training').click();
  await row('accounts', 'Support').click();
  const sent2 = await p.evaluate(() => Array.from(new FormData(document.getElementById('form')).entries()).map(e => e.join('=')).join('&'));
  check('a list of several sends each chosen value', sent2 === 'accounts=train&accounts=sup&office=lis', sent2);

  /* Scripts. */
  await p.evaluate(() => {
    const s = document.getElementById('accounts');
    const o = document.createElement('option'); o.value = 'new'; o.textContent = 'New code'; s.appendChild(o);
    s.options[0].disabled = true;
    /* Travel's choice was never touched, so its selected attribute
       chooses it. */
    s.options[4].setAttribute('selected', '');
  });
  await p.waitForTimeout(50);
  const scripted = await p.evaluate(() => {
    const b = document.querySelector('#accounts + .listbox');
    return { last: Array.from(b.querySelectorAll('[role=option]')).pop().textContent, first: b.querySelector('[role=option]').getAttribute('aria-disabled'), shown: Array.from(b.querySelectorAll('[aria-selected=true]')).map(r => r.textContent).join(',') };
  });
  check('options a script adds, disables or marks selected show at once', scripted.last === 'New code' && scripted.first === 'true' && scripted.shown === 'Training,Travel,Support', JSON.stringify(scripted));
  await p.evaluate(() => { const s = document.getElementById('office'); s.value = 'tyo'; pudlListbox.refresh(s); });
  check('pudlListbox.refresh shows a value a script set', await shown('office') === 'Tokyo');
  await p.evaluate(() => { const s = document.getElementById('office'); s.value = 'ber'; s.dispatchEvent(new Event('change')); });
  check('so does change fired on the select', await shown('office') === 'Berlin');

  await p.evaluate(() => document.getElementById('form').reset());
  await p.waitForTimeout(50);
  check('a form reset shows the options the page chose', await shown('office') === 'Singapore' && (await shown('accounts')).includes('Internal'), await shown('office') + ' / ' + await shown('accounts'));

  check('and scrolls the list back to the first of them', await p.evaluate(() => document.querySelector('#office + .listbox').scrollTop === 0));

  /* A disabled select. */
  const off = await p.evaluate(() => { const b = document.querySelector('#closed + .listbox'); return { dis: b.getAttribute('aria-disabled'), tab: b.tabIndex }; });
  check('a disabled select gives a disabled list out of the Tab order', off.dis === 'true' && off.tab === -1, JSON.stringify(off));
  await row('closed', 'Backlog').click({ force: true });
  check('which a press does not change', await chosen('closed') === 'a');

  /* Tab passes through each list once. */
  await p.focus(box('accounts'));
  await p.keyboard.press('Tab');
  check('each list is one Tab stop', (await focused()).includes('listbox') && await p.evaluate(() => document.activeElement.previousElementSibling.id) === 'office');

  /* How it looks, in both themes. */
  await p.evaluate(() => { document.querySelector('#accounts + .listbox').focus(); });
  await p.keyboard.press('Home');
  await p.screenshot({ path: out('listbox-light.png') });
  await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await p.screenshot({ path: out('listbox-dark.png') });

  await browser.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
