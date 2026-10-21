/* Token fields (0.74.0): a combo box marked data-combo-tokens, whose
   values gather below it as chips. What adds a value, separators of each
   kind, duplicates, pasting, mending a chip, moving among the chips by
   keys, keys that look a value up, a most, and what the form sends. */
const { launch, ROOT, out } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + (detail || '')));
  if (!ok) failures++;
}

(async () => {
  const browser = await launch();
  const p = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  await p.goto(ROOT + '/tests/fixtures/token-field.html');
  await p.waitForFunction(() => window.pudlCombo && document.querySelectorAll('.tokens').length === 5);
  await p.evaluate(() => {
    window.heard = [];
    ['input', 'change'].forEach(t => document.addEventListener(t, e => { if (e.target.name) window.heard.push(t + ':' + e.target.name); }, true));
  });
  const heard = () => p.evaluate(() => { const h = window.heard.join(','); window.heard = []; return h; });
  const chips = id => p.evaluate(id => Array.from(document.getElementById(id).closest('.combo').nextElementSibling.querySelectorAll('.token-text')).map(t => t.textContent).join('|'), id);
  const val = id => p.evaluate(id => document.getElementById(id).value, id);
  const typed = id => p.inputValue('#' + id + '-combo');
  const focusLabel = () => p.evaluate(() => { const a = document.activeElement; return a.getAttribute('aria-label') || a.id; });
  const paste = (id, text) => p.evaluate(([id, text]) => {
    const f = document.getElementById(id + '-combo');
    f.focus();
    const e = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(e, 'clipboardData', { value: { getData: () => text } });
    f.dispatchEvent(e);
  }, [id, text]);

  /* Enhancement. */
  const setup = await p.evaluate(() => {
    const k = document.getElementById('tags'), f = document.getElementById('tags-combo'), list = k.closest('.combo').nextElementSibling;
    return {
      hidden: k.hidden, name: f.name, label: document.querySelector('label[for="tags-combo"]') !== null, role: f.getAttribute('role'),
      list: list.className + '/' + list.getAttribute('role') + '/' + list.getAttribute('aria-label'),
      item: list.firstElementChild.getAttribute('role') + '/' + list.firstElementChild.className,
      remove: list.querySelector('.filter-chip-x').getAttribute('aria-label'),
      tabs: Array.from(list.querySelectorAll('.filter-chip-x')).map(b => b.tabIndex).join(','),
      below: list.getBoundingClientRect().top >= f.getBoundingClientRect().bottom
    };
  });
  check('the input is hidden behind a field to type in, which takes its label and sends nothing', setup.hidden && setup.name === '' && setup.label && setup.role === 'combobox', JSON.stringify(setup));
  check('the values are chips in a list below the field', setup.list === 'tokens/list/Tags' && setup.item === 'listitem/filter-chip token' && setup.below, JSON.stringify(setup));
  check('each chip has a remove button saying what it removes, one of them in the Tab order', setup.remove === 'Remove receipts' && setup.tabs === '0,-1', JSON.stringify(setup));
  check('the chips are the input\'s values', await chips('tags') === 'receipts|q4');

  /* What adds a value. */
  await p.click('#tags-combo');
  await heard();
  await p.keyboard.type('travel');
  await p.keyboard.press('Enter');
  check('Enter adds what is typed', await chips('tags') === 'receipts|q4|travel' && await typed('tags') === '');
  check('the input keeps the values joined by the separator and a space', await val('tags') === 'receipts, q4, travel');
  check('and fires input and change on it once', await heard() === 'input:tags,change:tags');
  await p.keyboard.type('meals,');
  check('typing the separator adds a value', await chips('tags') === 'receipts|q4|travel|meals' && await typed('tags') === '');
  await p.keyboard.type('mileage');
  await p.keyboard.press('Tab');
  await p.waitForTimeout(50);
  check('Tab adds a value', (await chips('tags')).endsWith('|mileage'));
  check('and goes on to the chips', (await focusLabel()) === 'Remove receipts');
  await p.click('#tags-combo');
  await p.keyboard.type('lunch');
  await p.click('#after');
  await p.waitForTimeout(50);
  check('leaving the field adds a value', (await chips('tags')).endsWith('|lunch'));
  await p.click('#tags-combo');
  await p.keyboard.type('mi');
  await p.keyboard.press('ArrowDown');
  const ticked = await p.evaluate(() => { const l = document.getElementById(document.getElementById('tags-combo').getAttribute('aria-controls')); return Array.from(l.querySelectorAll('[aria-selected=true]')).map(r => r.textContent).join(','); });
  check('the suggestions tick the values already chosen', ticked === 'mileageMileage', ticked);
  await p.keyboard.press('Escape');
  await p.keyboard.press('Escape');
  check('Escape closes the suggestions and then clears what is typed', await typed('tags') === '');

  /* Duplicates. */
  await heard();
  await p.keyboard.type('Receipts');
  await p.keyboard.press('Enter');
  const again = await p.evaluate(() => document.querySelector('#tags').closest('.combo').nextElementSibling.firstElementChild.classList.contains('is-again'));
  check('a value already there, in another case, is not added again', await chips('tags') === 'receipts|q4|travel|meals|mileage|lunch' && await typed('tags') === '' && await heard() === '');
  check('its chip flashes instead', again);

  /* Mending a chip. */
  await p.keyboard.press('Backspace');
  check('Backspace in the empty field takes the last chip back into the field', await typed('tags') === 'lunch' && await chips('tags') === 'receipts|q4|travel|meals|mileage');
  await p.keyboard.type('es');
  await p.keyboard.press('Enter');
  check('to be mended and added again', (await chips('tags')).endsWith('|lunches'));
  await p.locator('.token-text', { hasText: /^q4$/ }).click();
  check('pressing a chip\'s words takes it into the field', await typed('tags') === 'q4' && await p.evaluate(() => document.activeElement.id) === 'tags-combo' && !(await chips('tags')).includes('q4'));
  await p.keyboard.press('Backspace');
  await p.keyboard.type('3');
  await p.keyboard.press('Enter');
  check('and the mended value goes back to the chip\'s place', await chips('tags') === 'receipts|q3|travel|meals|mileage|lunches', await chips('tags'));
  await p.locator('.token-text', { hasText: /^travel$/ }).click();
  await p.keyboard.press('Escape');
  check('Escape puts a chip taken into the field back as it was', await chips('tags') === 'receipts|q3|travel|meals|mileage|lunches' && await typed('tags') === '', await chips('tags'));

  /* Moving among the chips. */
  await p.focus('#tags-combo');
  await p.keyboard.press('ArrowLeft');
  check('Left in the empty field moves to the last chip', await focusLabel() === 'Remove lunches');
  await p.keyboard.press('ArrowLeft');
  check('Left moves back along the chips', await focusLabel() === 'Remove mileage');
  await p.keyboard.press('ArrowRight');
  await p.keyboard.press('ArrowRight');
  check('Right past the last chip returns to the field', await focusLabel() === 'tags-combo');
  await p.keyboard.press('ArrowLeft');
  await p.keyboard.press('Home');
  check('Home goes to the first chip', await focusLabel() === 'Remove receipts');
  await heard();
  await p.keyboard.press('Delete');
  check('Delete removes the chip, and the keyboard stays on the next', await chips('tags') === 'q3|travel|meals|mileage|lunches' && await focusLabel() === 'Remove q3' && await heard() === 'input:tags,change:tags');
  await p.keyboard.press('ArrowRight');
  await p.keyboard.press('Backspace');
  check('Backspace removes the chip, and the keyboard goes to the one before', await chips('tags') === 'q3|meals|mileage|lunches' && await focusLabel() === 'Remove q3');
  await p.keyboard.press('Enter');
  check('the remove button removes its chip when pressed', await chips('tags') === 'meals|mileage|lunches' && await focusLabel() === 'Remove meals');
  await p.keyboard.press('F2');
  check('F2 takes the chip into the field', await typed('tags') === 'meals' && await focusLabel() === 'tags-combo');
  await p.keyboard.press('Escape');
  check('the chips are one stop in the Tab order', (await p.evaluate(() => Array.from(document.querySelectorAll('.combo:has(#tags) + .tokens .filter-chip-x')).filter(b => b.tabIndex === 0).length)) === 1);

  /* Separators of other kinds. */
  check('a ";" separator splits only at ";", so a value may hold a comma', await chips('people') === 'Cruz, Ana|Reyes, Jun');
  await p.click('#people-combo');
  await p.keyboard.type('Tan, Mei;');
  check('typing ";" adds the value', await chips('people') === 'Cruz, Ana|Reyes, Jun|Tan, Mei' && await val('people') === 'Cruz, Ana; Reyes, Jun; Tan, Mei', await val('people'));
  check('" | " splits at "|" and spaces', await chips('path') === 'Home|Reports');
  await p.click('#path-combo');
  await p.keyboard.type('Q4|Draft | ');
  check('typing "|" adds a value, and the separator joins the values as written', await chips('path') === 'Home|Reports|Q4|Draft' && await val('path') === 'Home | Reports | Q4 | Draft' && await typed('path') === '', await val('path') + '/' + await typed('path'));

  /* Pasting. */
  await heard();
  await paste('tags', 'alpha, beta\ngamma');
  check('pasted text splits at commas and new lines into several chips', await chips('tags') === 'meals|mileage|lunches|alpha|beta|gamma', await chips('tags'));
  check('with one change for them all', await heard() === 'input:tags,change:tags');
  await paste('people', 'Lim, Ken; Ong, Sue\nSy, Al');
  check('pasted text holding the separator splits only there and at new lines', await chips('people') === 'Cruz, Ana|Reyes, Jun|Tan, Mei|Lim, Ken|Ong, Sue|Sy, Al', await chips('people'));
  await paste('path', 'x, y, Home');
  check('a pasted value already there is left out', await chips('path') === 'Home|Reports|Q4|Draft|x|y', await chips('path'));

  /* Keys look each value up. */
  await p.click('#signs-combo');
  await p.keyboard.type('php');
  await p.keyboard.press('Enter');
  await p.keyboard.type('SGD,');
  check('a value typed as an option\'s key becomes the option\'s value', await chips('signs') === '₱|S$', await chips('signs'));
  await p.keyboard.type('euro');
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('Enter');
  check('choosing a suggestion adds its value', await chips('signs') === '₱|S$|€' && await typed('signs') === '');
  await p.keyboard.type('eur');
  await p.keyboard.press('Escape');
  await p.keyboard.press('Enter');
  check('and a key for a value already there adds nothing', await chips('signs') === '₱|S$|€');

  /* The most. */
  await p.click('#three-combo');
  await p.keyboard.type('three,');
  const full = await p.evaluate(() => { const f = document.getElementById('three-combo'), n = document.getElementById(f.getAttribute('aria-describedby').split(' ').pop()); return { dis: f.disabled, note: n.textContent, focus: document.activeElement.getAttribute('aria-label') }; });
  check('at the most, the field takes no more typing and says so', await chips('three') === 'one|two|three' && full.dis && /most/.test(full.note), JSON.stringify(full));
  check('and the keyboard goes to the last chip', full.focus === 'Remove three', JSON.stringify(full));
  await p.keyboard.press('Delete');
  const freed = await p.evaluate(() => { const f = document.getElementById('three-combo'), n = document.getElementById(f.getAttribute('aria-describedby').split(' ').pop()); return { dis: f.disabled, note: n.textContent }; });
  check('removing one lets the field take typing again', !freed.dis && freed.note === '', JSON.stringify(freed));

  /* The form, scripts and reset. */
  const sent = await p.evaluate(() => Array.from(new FormData(document.getElementById('form')).entries()).map(e => e.join('=')).join('&'));
  check('the form sends the joined values and nothing from the typing fields', sent.includes('tags=meals, mileage, lunches, alpha, beta, gamma') && sent.includes('signs=₱, S$, €') && !sent.includes('-combo'), sent);
  await p.evaluate(() => { const k = document.getElementById('tags'); k.value = 'one,two'; pudlCombo.refresh(k); });
  check('pudlCombo.refresh shows values a script set', await chips('tags') === 'one|two');
  await p.evaluate(() => document.getElementById('form').reset());
  await p.waitForTimeout(50);
  check('a form reset shows the page\'s values again', await chips('tags') === 'receipts|q4' && await chips('people') === 'Cruz, Ana|Reyes, Jun' && await chips('signs') === '');

  /* A plain combo box is as it was. */
  const plain = await p.evaluate(() => { const f = document.getElementById('plain'); return { role: f.getAttribute('role'), hidden: f.hidden, tokens: !!f.closest('.combo').nextElementSibling }; });
  check('a combo box without data-combo-tokens is untouched', plain.role === 'combobox' && !plain.hidden && !plain.tokens, JSON.stringify(plain));

  /* How it looks, in both themes. */
  await p.click('#tags-combo');
  await p.keyboard.type('trav');
  await p.click('#three-combo');
  await p.keyboard.type('three,');
  await p.click('#tags-combo');
  await p.keyboard.type('m');
  await p.screenshot({ path: out('token-field-light.png') });
  await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await p.screenshot({ path: out('token-field-dark.png') });

  await browser.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
