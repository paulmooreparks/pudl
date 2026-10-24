/* Combo boxes and searchable selects (0.72.0): a field that takes any
   value with a list of suggestions, and a select that filters as the
   reader types; their keys, events, options from the server, and their
   place in a toolbar and a dialog. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + (detail || '')));
  if (!ok) failures++;
}

(async () => {
  const browser = await launch();
  const p = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  await p.goto(ROOT + '/tests/fixtures/combo.html');
  await p.waitForFunction(() => window.pudlCombo && document.querySelector('#currency').getAttribute('role') === 'combobox');
  await p.evaluate(() => {
    window.heard = [];
    ['input', 'change'].forEach(t => document.addEventListener(t, e => window.heard.push(t + ':' + (e.target.id || e.target.name)), true));
  });
  const listOf = id => p.evaluate(id => document.getElementById(id).getAttribute('aria-controls'), id);
  const open = async id => p.evaluate(l => document.getElementById(l).matches(':popover-open'), await listOf(id));
  const rows = async id => p.evaluate(l => Array.from(document.querySelectorAll('#' + l + ' [role=option]')).map(r => r.textContent + (r.getAttribute('aria-selected') === 'true' ? '*' : '')), await listOf(id));
  const heard = () => p.evaluate(() => { const h = window.heard.join(','); window.heard = []; return h; });
  const val = id => p.inputValue('#' + id);

  const setup = await p.evaluate(() => {
    const f = document.getElementById('currency');
    return { list: f.hasAttribute('list'), opener: !!f.parentElement.querySelector('.combo-open'), expanded: f.getAttribute('aria-expanded'), auto: f.getAttribute('aria-autocomplete') };
  });
  check('the browser\'s list gives way to PUDL\'s, with an opener at the field\'s end', !setup.list && setup.opener && setup.expanded === 'false' && setup.auto === 'list', JSON.stringify(setup));

  /* Typing filters. */
  await p.fill('#currency', '');
  await p.click('#currency');
  await p.keyboard.type('dol');
  check('typing filters the list to the options whose value or text holds it', JSON.stringify(await rows('currency')) === JSON.stringify(['SGDSingapore dollar', 'USDUS dollar', 'HKDHong Kong dollar']), JSON.stringify(await rows('currency')));
  check('and opens it', await open('currency') && await p.getAttribute('#currency', 'aria-expanded') === 'true');
  const under = async () => p.evaluate(l => { const f = document.querySelector('.combo:has(#currency)').getBoundingClientRect(), r = document.getElementById(l).getBoundingClientRect(); return Math.abs(r.top - f.bottom - 4) <= 1 && Math.abs(r.left - f.left) <= 1; }, await listOf('currency'));
  check('the list opens under the field, even with pudl-menu.js on the page', await under());
  await p.evaluate(() => { document.body.style.paddingBottom = '2000px'; window.scrollBy(0, 40); });
  await p.waitForFunction(() => window.scrollY >= 40);
  await p.waitForFunction(l => {
    const field = document.querySelector('.combo:has(#currency)').getBoundingClientRect();
    const list = document.getElementById(l).getBoundingClientRect();
    return Math.abs(list.top - field.bottom - 4) <= 1 && Math.abs(list.left - field.left) <= 1;
  }, await listOf('currency'));
  check('and follows the field as the page scrolls', await under());
  await p.evaluate(() => { window.scrollTo(0, 0); document.body.style.paddingBottom = ''; });
  await p.keyboard.type('zzz');
  check('a list with no match closes rather than standing empty', !(await open('currency')));
  await p.fill('#currency', '');
  await heard();
  await p.keyboard.type('dol');
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('ArrowDown');
  const ad = await p.getAttribute('#currency', 'aria-activedescendant');
  check('Down moves through the rows, announced through aria-activedescendant', !!ad && await p.evaluate(id => document.getElementById(id).textContent, ad) === 'USDUS dollar');
  await heard();
  await p.keyboard.press('Enter');
  check('Enter chooses the row, putting its value in the field', await val('currency') === 'USD' && !(await open('currency')));
  check('choosing fires input and change on the field once each', await heard() === 'input:currency,change:currency');
  await p.focus('#tb1');
  check('and leaving afterwards fires no second change', !(await heard()).includes('change'));

  /* Escape twice, Tab, the opener, Alt+Down. */
  await p.click('#currency');
  await p.keyboard.press('Control+a');
  await p.keyboard.type('u');
  const wasOpen = await open('currency');
  await p.keyboard.press('Escape');
  check('Escape closes the list and keeps what was typed', wasOpen && !(await open('currency')) && await val('currency') === 'u');
  await p.keyboard.press('Escape');
  check('Escape again clears the field', await val('currency') === '');
  await p.keyboard.type('eu');
  await p.keyboard.press('Tab');
  check('Tab leaves with what was typed, not with a row', await val('currency') === 'eu');
  await p.fill('#currency', 'EUR');
  await p.keyboard.press('Escape');
  check('filling the field opened the filtered list, and Escape closed it', !(await open('currency')));
  await p.click('.combo:has(#currency) .combo-open');
  check('the opener shows the whole list, the field\'s value ticked, and keeps focus in the field',
    (await rows('currency')).length === 5 && (await rows('currency')).includes('EUREuro*') && await p.evaluate(() => document.activeElement.id) === 'currency');
  await p.click('.combo:has(#currency) .combo-open');
  check('pressing the opener again closes the list', !(await open('currency')));
  await p.keyboard.press('Alt+ArrowDown');
  check('Alt+Down opens the list without moving to a row', await open('currency') && !(await p.getAttribute('#currency', 'aria-activedescendant')));
  await p.keyboard.press('Alt+ArrowUp');
  check('Alt+Up closes it', !(await open('currency')));
  await p.fill('#currency', '');
  await p.keyboard.press('ArrowDown');
  check('Down in an empty field opens the whole list', (await rows('currency')).length === 5);
  await p.click('#' + await listOf('currency') + ' [role=option]:nth-child(2)');
  check('pressing a row chooses it', await val('currency') === 'SGD');

  /* Looking an option up by a key that is not its value. */
  await p.click('#sign');
  await p.keyboard.type('php');
  check('an option is found by its unseen keys', JSON.stringify(await rows('sign')) === JSON.stringify(['₱Philippine peso']), JSON.stringify(await rows('sign')));
  await heard();
  await p.keyboard.press('Tab');
  await p.waitForFunction(() => document.getElementById('sign').value === '₱', null, { timeout: 2000 }).catch(() => {});
  check('leaving with exactly a key typed puts the option\'s value in the field', await val('sign') === '₱');
  check('and fires input and change for it', (await heard()).includes('input:sign,change:sign'));
  await p.fill('#sign', '');
  await p.click('#sign');
  await p.keyboard.type('HKD');
  await p.keyboard.press('Escape');
  await p.keyboard.press('Enter');
  check('so does Enter with no row lit', await val('sign') === 'HK$');
  await p.fill('#sign', '');
  await p.keyboard.type('dollar');
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('Enter');
  check('choosing a row found by its text puts its value in the field', await val('sign') === 'S$');
  await p.fill('#sign', '');
  await p.keyboard.type('PH');
  await p.keyboard.press('Escape');
  await p.keyboard.press('Tab');
  check('text that is only part of a key is left as typed', await val('sign') === 'PH');
  await p.fill('#sign', '');
  await p.click('#sign');
  await p.keyboard.type('hong kong');
  await p.keyboard.press('Escape');
  await p.keyboard.press('Tab');
  await p.waitForFunction(() => document.getElementById('sign').value === 'HK$', null, { timeout: 2000 }).catch(() => {});
  check('a key of several words, between commas, looks its option up', await val('sign') === 'HK$');
  await p.fill('#sign', '');
  await p.click('#sign');
  await p.keyboard.type('nordic');
  check('a key two options share finds both', (await rows('sign')).length === 2, JSON.stringify(await rows('sign')));
  await p.keyboard.press('Escape');
  await p.keyboard.press('Tab');
  check('but looks neither up', await val('sign') === 'nordic');

  /* Completion, only where it is asked for. */
  await p.click('#completing');
  await p.keyboard.type('H');
  const comp = await p.evaluate(() => { const f = document.getElementById('completing'); return [f.value, f.selectionStart, f.selectionEnd]; });
  check('data-combo-complete completes a match, the completed part selected', comp[0] === 'HKD' && comp[1] === 1 && comp[2] === 3, JSON.stringify(comp));
  await p.click('#currency');
  await p.fill('#currency', '');
  await p.keyboard.type('H');
  check('and without it nothing is completed', await val('currency') === 'H');
  await p.keyboard.press('Escape');

  /* The searchable select. */
  const sel = await p.evaluate(() => ({ hidden: document.getElementById('world').closest('.form-select-wrap').hidden, field: document.getElementById('world-combo').value, label: document.querySelector('label[for="world-combo"]') !== null }));
  check('a searchable select is hidden behind a field showing its choice, and its label moves to the field', sel.hidden && sel.field === 'SGD · Singapore dollar' && sel.label, JSON.stringify(sel));
  await p.click('#world-combo');
  await p.keyboard.press('Control+a');
  await p.keyboard.type('kron');
  check('typing in it filters its options', JSON.stringify(await rows('world-combo')) === JSON.stringify(['DKK · Danish krone', 'NOK · Norwegian krone']), JSON.stringify(await rows('world-combo')));
  await heard();
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('Enter');
  check('choosing sets the select, fires input and change on it, and shows its words', await p.inputValue('#world') === 'DKK' && await val('world-combo') === 'DKK · Danish krone' && await heard() === 'input:world,change:world');
  await p.keyboard.press('Control+a');
  await p.keyboard.type('nothing like it');
  await p.focus('#tb1'); await p.waitForTimeout(50);
  check('leaving with words that match no option puts the choice back', await p.inputValue('#world') === 'DKK' && await val('world-combo') === 'DKK · Danish krone');
  await p.click('#world-combo');
  await p.keyboard.press('Control+a');
  await p.keyboard.type('chf');
  await p.keyboard.press('Escape');
  await p.focus('#tb1'); await p.waitForFunction(() => document.getElementById('world').value === 'CHF', null, { timeout: 2000 }).catch(() => {});
  check('leaving with an option\'s value typed chooses it', await p.inputValue('#world') === 'CHF' && await val('world-combo') === 'CHF · Swiss franc');
  const sent = await p.evaluate(() => Array.from(new FormData(document.getElementById('form')).entries()).map(e => e.join('=')).join('&'));
  check('the form sends the select\'s value and nothing from the field', sent.includes('world=CHF') && !sent.includes('world-combo'), sent);
  await p.evaluate(() => { document.getElementById('world').value = 'NOK'; pudlCombo.refresh(document.getElementById('world')); });
  check('pudlCombo.refresh shows a value a script set', await val('world-combo') === 'NOK · Norwegian krone');

  /* Options from the server. */
  await p.click('#page');
  await p.keyboard.type('plan');
  await p.waitForFunction(id => document.querySelectorAll('#' + id + ' [role=option]').length > 0, await listOf('page'));
  check('options come from the server after a pause, filtered by what is typed',
    JSON.stringify(await rows('page')) === JSON.stringify(['Plan 09 - Data Export v1.0', 'Plan 09 - Data Export v1.1', 'Plan 08 - Mobile PaymentsPayments in the App']), JSON.stringify(await rows('page')));
  const safe = await p.evaluate(() => ({ injected: !!window.comboInjected, html: Array.from(document.getElementById('pages').options).some(o => o.children.length) }));
  check('only an option\'s value and text are taken from the answer', !safe.injected && !safe.html, JSON.stringify(safe));
  await p.keyboard.press('Escape');

  /* In a toolbar, the opener is never a stop. */
  await p.focus('#tb1');
  await p.keyboard.press('ArrowRight');
  check('in a toolbar the arrow keys go from a button onto the field', await p.evaluate(() => document.activeElement.id) === 'tbc');
  await p.keyboard.press('ArrowRight');
  check('and from the field\'s end past the opener to the next button', await p.evaluate(() => document.activeElement.id) === 'tb2');
  check('the opener is out of the Tab order', await p.evaluate(() => document.querySelector('.combo:has(#tbc) .combo-open').tabIndex) === -1);

  /* In a dialog. */
  await p.click('#open-dialog');
  await p.click('#dlgc');
  await p.keyboard.press('ArrowDown');
  const inDialog = await p.evaluate(id => document.getElementById(id).closest('dialog') !== null, await listOf('dlgc'));
  check('in a modal dialog the list lives in the dialog and opens', inDialog && await open('dlgc'));
  await p.click('#' + await listOf('dlgc') + ' [role=option]:nth-child(3)');
  check('and a row can be pressed there', await val('dlgc') === 'USD');

  await browser.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
