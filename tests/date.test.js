/* Date and time fields (0.74.0): a date or time input marked data-date,
   hidden behind a text field that writes its value in the field's language
   and calendar, or as ISO where there is no language, with an echo line
   under it; typing in many forms; the calendar with its year and month
   chooser; the list of times; their keys, events, range, and their place
   in a dialog. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + (detail || '')));
  if (!ok) failures++;
}

(async () => {
  const browser = await launch();
  const p = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  await p.goto(ROOT + '/tests/fixtures/date.html');
  await p.waitForFunction(() => window.pudlDate && document.getElementById('due-text'));
  /* What the page hears from the hidden inputs, which are the ones a form
     and its scripts read. */
  await p.evaluate(() => {
    window.heard = [];
    ['input', 'change'].forEach(t => document.addEventListener(t, e => { if (e.target.hidden) window.heard.push(t + ':' + e.target.id); }, true));
  });
  const heard = () => p.evaluate(() => { const h = window.heard.join(','); window.heard = []; return h; });
  const val = id => p.evaluate(id => document.getElementById(id).value, id);
  const text = id => p.inputValue('#' + id + '-text');
  /* The words come from the browser's own formatting, whose punctuation
     differs between builds of its locale data (Linux WebKit writes
     "Thursday 22 October 2026"), so commas are left out when comparing. */
  const echo = id => p.evaluate(id => document.getElementById(id).parentElement.querySelector('.date-echo').textContent.replace(/,/g, ''), id);
  const panelOf = id => p.evaluate(id => document.getElementById(id + '-text').getAttribute('aria-controls'), id);
  const inPanel = async (id, sel) => '#' + await panelOf(id) + ' ' + sel;
  const open = async id => p.evaluate(l => document.getElementById(l).matches(':popover-open'), await panelOf(id));
  const focused = () => p.evaluate(() => document.activeElement.getAttribute('data-date') || document.activeElement.getAttribute('data-month') || document.activeElement.id);
  const type = async (id, s, key) => { await p.fill('#' + id + '-text', s); await heard(); await p.keyboard.press(key || 'Tab'); };
  const today = await p.evaluate(() => { const n = new Date(); return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0'); });
  const plusDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const year = today.slice(0, 4);

  /* Enhancement. */
  const setup = await p.evaluate(() => {
    const due = document.getElementById('due'), f = document.getElementById('due-text'), wrap = f.parentElement, o = wrap.querySelector('.combo-open'), e = wrap.nextElementSibling;
    return {
      hidden: due.hidden, after: due.nextElementSibling === wrap, wrap: wrap.className,
      label: !!document.querySelector('label[for="due-text"]') && !document.querySelector('label[for="due"]'),
      described: f.getAttribute('aria-describedby') === 'due-help ' + e.id, echo: e.className + '|' + e.getAttribute('aria-live'),
      opener: [o.tabIndex, o.hasAttribute('data-toolbar-skip'), o.getAttribute('aria-label'), o.getAttribute('aria-haspopup'), o.getAttribute('aria-expanded')].join('|'),
      time: document.getElementById('at-text').parentElement.className + '|' + document.querySelector('#at + .combo .combo-open').getAttribute('aria-haspopup'),
      local: document.getElementById('stamp').hidden || !!document.getElementById('stamp-text')
    };
  });
  check('a date input is hidden behind a .combo.date-field after it', setup.hidden && setup.after && setup.wrap === 'combo date-field', JSON.stringify(setup));
  check('its label moves to the field, and the echo, a polite live line, joins its aria-describedby', setup.label && setup.described && setup.echo === 'date-echo|polite', JSON.stringify(setup));
  check('the opener is raised, out of the Tab order and skipped by a toolbar, and opens a dialog', setup.opener === '-1|true|Choose a date|dialog|false', setup.opener);
  check('a time input becomes a .combo.time-field whose opener opens a list', setup.time === 'combo time-field|listbox', setup.time);
  check('a datetime-local input is left as the browser draws it', !setup.local);

  /* How each field writes its value. */
  const shown = {};
  for (const id of ['isod', 'isot', 'due', 'birth', 'long', 'us', 'ust', 'jp', 'jpt', 'th', 'hijri', 'heb']) shown[id] = await text(id);
  check('with no language a date is written yyyy-mm-dd and a time HH:MM', shown.isod === '2026-10-22' && shown.isot === '21:30', JSON.stringify(shown));
  check('en-GB writes day/month/year, and data-date-style gives medium and long forms', shown.due === '22/10/2026' && shown.birth === '22 Oct 2026' && shown.long === '22 October 2026', JSON.stringify(shown));
  check('a 12-hour language writes 9:30 PM, a 24-hour one 21:30', shown.ust === '9:30 PM' && shown.jpt === '21:30', JSON.stringify(shown));
  check('Japanese writes its era, Thai its Buddhist year', shown.jp === 'R8/10/22' && shown.th === '22/10/2569', JSON.stringify(shown));
  check('Hijri and Hebrew dates are written in their own calendars and digits', shown.hijri.includes('١٤٤٨') && shown.heb === '11 בחשוון 5787', JSON.stringify(shown));
  const sent = await p.evaluate(() => Array.from(new FormData(document.getElementById('form')).entries()).map(e => e.join('=')));
  check('the form sends ISO Gregorian values under the inputs\' names, and nothing from the fields',
    ['isod=2026-10-22', 'due=2026-10-22', 'jp=2026-10-22', 'th=2026-10-22', 'hijri=2026-10-22', 'heb=2026-10-22', 'ust=21:30'].every(s => sent.includes(s)) && !sent.some(e => e.includes('-text')), JSON.stringify(sent));

  /* The echo. */
  check('the echo says the value in full words', await echo('due') === 'Thursday 22 October 2026' && await echo('ust') === '9:30 at night', await echo('due') + ' / ' + await echo('ust'));
  check('an empty field\'s echo gives an example in its own form and in ISO', await echo('us') === 'e.g. 12/31/' + year + ' or ' + year + '-12-31', await echo('us'));
  await p.fill('#birth-text', '2/1/2026');
  check('while typing, the echo says the date the text will give, which settles 2/1', await echo('birth') === 'Friday 2 January 2026' && await val('birth') === '2026-10-22', await echo('birth'));
  await p.fill('#birth-text', '2/1/20x6');
  check('text that is not a date yet says so, with an example', (await echo('birth')).startsWith('Not a date yet; e.g. 31 Dec ' + year + ' or ' + year + '-12-31'), await echo('birth'));
  await p.fill('#due-text', '2027-03-01');
  check('a date outside the range is told as such', await echo('due') === 'Monday 1 March 2027 is outside the dates allowed', await echo('due'));

  /* Typing. */
  await type('due', '2026-11-05');
  check('typing a date as yyyy-mm-dd and leaving sets the value and writes it out', await val('due') === '2026-11-05' && await text('due') === '05/11/2026');
  check('and fires input and change on the hidden input once each', await heard() === 'input:due,change:due');
  await type('due', '3.2.26', 'Enter');
  check('numbers in the language\'s order with any separator and a short year are read', await val('due') === '2026-02-03', await val('due'));
  await type('due', '31/02/2026');
  const refused = { value: await val('due'), text: await text('due'), invalid: await p.getAttribute('#due-text', 'aria-invalid') };
  check('a date that does not exist leaves the value, keeps the text, and marks the field invalid', refused.value === '2026-02-03' && refused.text === '31/02/2026' && refused.invalid === 'true', JSON.stringify(refused));
  check('and fires nothing', await heard() === '');
  await type('due', '2027-01-01');
  check('a date outside min and max is refused too', await val('due') === '2026-02-03' && await p.getAttribute('#due-text', 'aria-invalid') === 'true');
  await type('due', '22/10/2026');
  check('the next good entry clears the mark', await val('due') === '2026-10-22' && await p.getAttribute('#due-text', 'aria-invalid') === null);
  await p.click('#due-text');
  await heard();
  await p.keyboard.press('Tab');
  check('leaving a field whose text is unchanged fires nothing', await heard() === '');
  await type('birth', '5 March 1980');
  check('a month name is read', await val('birth') === '1980-03-05' && await text('birth') === '5 Mar 1980', await val('birth'));
  await type('birth', 'sept 9 1999');
  check('an abbreviated month in any place among the numbers is read', await val('birth') === '1999-09-09', await val('birth'));
  await type('birth', '2026-10-22T08:00:00Z');
  check('a pasted ISO timestamp gives its date', await val('birth') === '2026-10-22');
  await type('birth', '+3');
  check('+3 is three days from today', await val('birth') === plusDays(today, 3), await val('birth'));
  await type('birth', '-1');
  check('-1 is yesterday', await val('birth') === plusDays(today, -1));
  await type('birth', 't');
  check('t is today', await val('birth') === today);
  await type('birth', 'Tomorrow');
  check('the language\'s word for tomorrow is read', await val('birth') === plusDays(today, 1));
  await type('birth', '1/1/75');
  check('a two-digit year is the one nearest today', await val('birth') === (2075 - +year <= 50 ? '2075-01-01' : '1975-01-01'), await val('birth'));
  await type('us', '10/9/2026');
  check('a field inside lang="en-US" reads month first', await val('us') === '2026-10-09' && await text('us') === '10/09/2026', await val('us') + ' ' + await text('us'));
  await type('us', '');
  check('an emptied field clears the value', await val('us') === '' && await text('us') === '');
  const orders = [];
  for (const [id, s] of [['due', '2026 oct 28'], ['due', '28 oct 2026'], ['due', 'oct 28 2026'], ['due', 'October 28, 2026'], ['due', '2026/10/28'], ['due', '2026.10.28'],
    ['us', '2026 oct 28'], ['us', '28 October 2026'], ['us', '2026-Oct-28'], ['th', '2569 oct 28']]) {
    await type(id, '');
    await type(id, s);
    if (await val(id) !== '2026-10-28') orders.push(id + ': ' + s + ' -> ' + await val(id));
  }
  check('with a month name the year may come first, middle or last, and four digits first are year, month, day in any language', !orders.length, orders.join('; '));
  await type('due', '22/10/2026');

  /* Other calendars. */
  await type('jp', 'H5/3/1');
  check('Japanese: an era initial before the year is read', await val('jp') === '1993-03-01', await val('jp'));
  await type('jp', '平成31年4月30日');
  check('Japanese: an era written out, with 年 月 日, is read', await val('jp') === '2019-04-30', await val('jp'));
  await type('jp', 'H31/5/1');
  check('Japanese: a date its era had ended by is refused', await val('jp') === '2019-04-30' && await p.getAttribute('#jp-text', 'aria-invalid') === 'true');
  await type('jp', '8/10/22');
  check('Japanese: a year with no era is in the present era', await val('jp') === '2026-10-22', await val('jp'));
  await type('jp', '2026/10/23');
  check('Japanese: a year of four digits is Gregorian', await val('jp') === '2026-10-23', await val('jp'));
  await type('jp', '今日');
  check('Japanese: 今日 is today', await val('jp') === today);
  await type('th', '1/1/2570');
  check('Thai: a Buddhist year is read, 543 after the Gregorian', await val('th') === '2027-01-01' && await text('th') === '01/01/2570', await val('th') + ' ' + await text('th'));
  await type('th', '5 March 2569');
  check('Thai: an English month name is read as well', await val('th') === '2026-03-05', await val('th'));
  await type('hijri', '١‏/٩‏/١٤٤٨');
  const ramadan = await p.evaluate(() => {
    const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' });
    for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2028, 0, 1); t += 864e5) {
      const o = {}; f.formatToParts(t).forEach(x => { o[x.type] = x.value; });
      if (o.year === '1448' && o.month === '9' && o.day === '1') return new Date(t).toISOString().slice(0, 10);
    }
  });
  check('Hijri: a date typed in Arabic digits is found in its calendar', await val('hijri') === ramadan, await val('hijri') + ' vs ' + ramadan);
  await type('heb', '1 בכסלו 5787');
  const kislev = await p.evaluate(v => new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(v + 'T00:00:00Z')), await val('heb'));
  check('Hebrew: a month name joined to its ב is read', kislev === '1 בכסלו 5787', kislev);

  /* The calendar. */
  await p.click('#due + .combo .combo-open');
  const cal = await p.evaluate(id => {
    const d = document.getElementById(id), t = d.querySelector('.date-title');
    return { role: d.getAttribute('role'), modal: d.getAttribute('aria-modal'), label: d.getAttribute('aria-label'), title: t.textContent, key: t.tagName + '|' + t.className,
      live: t.getAttribute('aria-live'), grid: d.querySelector('table').getAttribute('role'),
      head: Array.from(d.querySelectorAll('th')).map(t => t.textContent).join(''),
      chosen: Array.from(d.querySelectorAll('[aria-selected="true"]')).map(c => c.getAttribute('data-date')).join(),
      clear: d.querySelector('.date-clear').hidden, expanded: document.getElementById('due-text').getAttribute('aria-expanded') };
  }, await panelOf('due'));
  check('the opener opens a calendar dialog with the field\'s label', await open('due') && cal.role === 'dialog' && cal.modal === 'false' && cal.label === 'Due' && cal.grid === 'grid' && cal.expanded === 'true', JSON.stringify(cal));
  check('the month is a raised key that speaks its changes, and the week starts on Monday in en-GB', cal.title === 'October 2026' && cal.key === 'BUTTON|btn btn-sm date-title' && cal.live === 'polite' && cal.head === 'MTWTFSS', JSON.stringify(cal));
  check('focus is on the chosen day, pressed in, and a required field has no Clear', await focused() === '2026-10-22' && cal.chosen === '2026-10-22' && cal.clear, JSON.stringify(cal));
  const placed = await p.evaluate(id => { const f = document.querySelector('#due + .combo').getBoundingClientRect(), r = document.getElementById(id).getBoundingClientRect(); return Math.abs(r.top - f.bottom - 4) <= 1 && Math.abs(r.left - f.left) <= 1; }, await panelOf('due'));
  check('the calendar opens under the field', placed);
  const heights = async () => p.evaluate(id => ['.date-prev', '.date-title', '.date-next'].map(s => document.getElementById(id).querySelector(s).getBoundingClientRect().height).join(), await panelOf('due'));
  const light = await heights();
  await p.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  const dark = await heights();
  await p.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  check('the month key is as tall as the arrow keys beside it, in both themes', new Set(light.split(',')).size === 1 && light === dark, light + ' / ' + dark);
  const keys = [];
  for (const k of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp', 'Shift+PageDown', 'Shift+PageUp']) {
    await p.keyboard.press(k);
    keys.push(await focused());
  }
  check('arrows move by day and week, Home and End to the week\'s ends, PageUp and PageDown by month, with Shift by year',
    keys.join() === '2026-10-23,2026-10-30,2026-10-29,2026-10-22,2026-10-19,2026-10-25,2026-11-25,2026-10-25,2027-10-25,2026-10-25', keys.join());
  await p.keyboard.press('PageDown');
  await p.keyboard.press('ArrowDown');
  check('the heading follows the month', await p.textContent(await inPanel('due', '.date-title')) === 'December 2026');
  await heard();
  await p.keyboard.press('Enter');
  check('Enter chooses the day, closes, and returns focus to the field', await val('due') === '2026-12-02' && !(await open('due')) && await focused() === 'due-text' && await text('due') === '02/12/2026');
  check('choosing fires input and change on the hidden input once each', await heard() === 'input:due,change:due');
  await p.keyboard.press('ArrowDown');
  check('Down in the field opens the calendar on the chosen day', await open('due') && await focused() === '2026-12-02');
  await p.keyboard.press('ArrowRight');
  await p.keyboard.press('Escape');
  check('Escape closes without choosing and returns focus to the field', !(await open('due')) && await val('due') === '2026-12-02' && await focused() === 'due-text');
  await p.keyboard.press('Alt+ArrowDown');
  await p.keyboard.press('Alt+ArrowUp');
  check('Alt+Down opens it and Alt+Up closes it', !(await open('due')) && await focused() === 'due-text');

  /* Days out of range. */
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('Shift+PageDown');
  const off = await p.evaluate(() => [document.activeElement.getAttribute('aria-disabled'), getComputedStyle(document.activeElement).textDecorationLine].join());
  await p.keyboard.press('Enter');
  check('a day outside min and max is marked disabled and struck through, and Enter does not choose it', off === 'true,line-through' && await open('due') && await val('due') === '2026-12-02', off);
  await p.click(await inPanel('due', '[data-date="2027-12-05"]'), { force: true });
  check('nor does pressing it', await open('due') && await val('due') === '2026-12-02');
  check('the next month key is disabled past max', await p.evaluate(s => document.querySelector(s).disabled, await inPanel('due', '.date-next')));
  await p.keyboard.press('Shift+PageUp');
  await p.click(await inPanel('due', '.date-prev'));
  check('the previous month key turns the month', await p.textContent(await inPanel('due', '.date-title')) === 'November 2026');
  await heard();
  await p.click(await inPanel('due', '[data-date="2026-11-17"]'));
  check('pressing a day chooses it', await val('due') === '2026-11-17' && !(await open('due')) && await heard() === 'input:due,change:due');
  await p.click('#due + .combo .combo-open');
  await p.click('#after');
  check('a press outside closes the calendar', !(await open('due')));
  await p.click('#off + .combo .combo-open', { force: true });
  check('a disabled field is disabled and its opener opens nothing', await p.evaluate(() => document.getElementById('off-text').disabled) && !(await open('off')));

  /* The year and month chooser, Today and Clear. */
  await type('birth', '22/10/2026');
  await p.click('#birth + .combo .combo-open');
  await p.click(await inPanel('birth', '.date-title'));
  const ch = await p.evaluate(id => {
    const d = document.getElementById(id);
    return { months: d.querySelectorAll('.date-month').length, current: (d.querySelector('.date-month[aria-current="true"]') || {}).textContent, year: d.querySelector('.date-year input').value,
      grid: d.querySelector('.date-grid').hidden, expanded: d.querySelector('.date-title').getAttribute('aria-expanded') };
  }, await panelOf('birth'));
  check('the month key opens a chooser of the year\'s twelve months, this one pressed in, the year in a field', ch.months === 12 && ch.current === 'Oct' && ch.year === '2026' && ch.grid && ch.expanded === 'true' && await focused() === '2026-10-01', JSON.stringify(ch));
  await p.keyboard.press('ArrowLeft');
  await p.keyboard.press('ArrowUp');
  check('the arrows move among the months', await focused() === '2026-06-01', await focused());
  for (let i = 0; i < 3; i++) await p.click(await inPanel('birth', '.date-earlier'));
  check('the minus key steps the year back', await p.inputValue(await inPanel('birth', '.date-year input')) === '2023');
  await p.fill(await inPanel('birth', '.date-year input'), '1980');
  await p.keyboard.press('Enter');
  check('a year typed in the field shows its months', await p.inputValue(await inPanel('birth', '.date-year input')) === '1980' && await p.textContent(await inPanel('birth', '.date-title')) === '1980');
  await p.click(await inPanel('birth', '.date-month:nth-child(3)'));
  check('choosing a month shows its days, on the same day of the month', await p.textContent(await inPanel('birth', '.date-title')) === 'March 1980' && await focused() === '1980-03-22', await focused());
  await p.keyboard.press('Enter');
  check('and a birthday decades back is chosen in a few presses', await val('birth') === '1980-03-22');
  await p.click('#birth + .combo .combo-open');
  await p.click(await inPanel('birth', '.date-title'));
  await p.keyboard.press('Escape');
  check('Escape in the chooser goes back to the days', await open('birth') && await focused() === '1980-03-22');
  await p.click(await inPanel('birth', '.date-today'));
  check('Today goes to today and focuses it', await focused() === today && await p.evaluate(s => document.querySelector(s).getAttribute('aria-current'), await inPanel('birth', '[data-date="' + today + '"]')) === 'date');
  await heard();
  await p.click(await inPanel('birth', '.date-clear'));
  check('Clear empties a field that is not required, and closes', await val('birth') === '' && await text('birth') === '' && !(await open('birth')) && await heard() === 'input:birth,change:birth');
  await p.click('#jp + .combo .combo-open');
  await p.click(await inPanel('jp', '.date-title'));
  check('the Japanese chooser shows the era year beside the number', await p.textContent(await inPanel('jp', '.date-year-name')) === '令和8年', await p.textContent(await inPanel('jp', '.date-year-name')));
  await p.click(await inPanel('jp', '.date-year input'));
  await p.mouse.wheel(0, -100);
  await p.mouse.wheel(0, -100);
  await p.mouse.wheel(0, 100);
  check('the wheel steps the focused year field, up for later', await p.inputValue(await inPanel('jp', '.date-year input')) === '2027' && await p.textContent(await inPanel('jp', '.date-year-name')) === '令和9年');
  await p.keyboard.press('Escape');
  await p.keyboard.press('Escape');

  /* Calendars other than the Gregorian. */
  const monthCheck = async (id, value, cal) => {
    await p.evaluate(([id, v]) => { const i = document.getElementById(id); i.value = v; pudlDate.refresh(i); }, [id, value]);
    await p.click('#' + id + ' + .combo .combo-open');
    const got = await p.evaluate(([l, cal, v]) => {
      const d = document.getElementById(l);
      const f = new Intl.DateTimeFormat('en-u-ca-' + cal + '-nu-latn', { year: 'numeric', month: 'numeric', timeZone: 'UTC' });
      const key = t => f.format(t);
      const t0 = Date.parse(v + 'T00:00:00Z'), k = key(t0);
      let n = 0;
      for (let t = t0 - 40 * 864e5; t < t0 + 40 * 864e5; t += 864e5) if (key(t) === k) n++;
      return { cells: d.querySelectorAll('td[data-date]').length, days: n, title: d.querySelector('.date-title').textContent };
    }, [await panelOf(id), cal, value]);
    await p.keyboard.press('Escape');
    return got;
  };
  const hj = await monthCheck('hijri', '2026-10-22', 'islamic-umalqura');
  check('Hijri: the grid shows its month\'s 29 or 30 days, under its own month and year', (hj.cells === 29 || hj.cells === 30) && hj.cells === hj.days && hj.title.includes('١٤٤٨'), JSON.stringify(hj));
  const hb = await monthCheck('heb', '2026-10-22', 'hebrew');
  check('Hebrew: the grid shows Heshvan\'s days', hb.cells === hb.days && hb.title === 'חשוון 5787', JSON.stringify(hb));
  const jg = await monthCheck('jp', '2026-10-22', 'japanese');
  check('Japanese: the heading has the era, and the days are numbers alone', jg.title === '令和8年10月' && jg.cells === 31 && await p.textContent(await inPanel('jp', '[data-date="2026-10-01"]')) === '1', JSON.stringify(jg));
  const tg = await monthCheck('th', '2026-10-22', 'buddhist');
  check('Thai: the heading has the Buddhist year', tg.title === 'ตุลาคม 2569', JSON.stringify(tg));
  await p.evaluate(() => { const i = document.getElementById('hijri'); pudlDate.refresh(i); });
  await p.click('#hijri + .combo .combo-open');
  const before = await focused();
  await p.keyboard.press('PageDown');
  const after = await p.evaluate(v => new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { month: 'numeric', timeZone: 'UTC' }).format(new Date(v + 'T00:00:00Z')), await focused());
  const was = await p.evaluate(v => new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { month: 'numeric', timeZone: 'UTC' }).format(new Date(v + 'T00:00:00Z')), before);
  check('Hijri: PageDown goes to the next Hijri month', +after === +was % 12 + 1, was + ' -> ' + after);
  await p.keyboard.press('Escape');

  /* Times. */
  await p.click('#at + .combo .combo-open');
  const list = await p.evaluate(id => {
    const l = document.getElementById(id), rows = Array.from(l.querySelectorAll('[role=option]'));
    return { role: l.getAttribute('role'), n: rows.length, first: rows[0].textContent, last: rows[rows.length - 1].textContent, lit: (l.querySelector('.is-active') || {}).textContent, ticked: (l.querySelector('[aria-selected="true"]') || {}).textContent };
  }, await panelOf('at'));
  check('the time opener opens a list at the step, inside min and max', await open('at') && list.role === 'listbox' && list.n === 41 && list.first === '08:00' && list.last === '18:00', JSON.stringify(list));
  check('the row of the value is ticked and lit, and focus stays in the field', list.lit === '13:30' && list.ticked === '13:30' && await focused() === 'at-text', JSON.stringify(list));
  await p.keyboard.press('ArrowDown');
  await heard();
  await p.keyboard.press('Enter');
  check('Down and Enter choose the next time', await val('at') === '13:45' && await text('at') === '13:45' && !(await open('at')) && await heard() === 'input:at,change:at');
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('Escape');
  check('Down opens the list and Escape closes it', !(await open('at')) && await val('at') === '13:45');
  await p.fill('#at-text', '10:10');
  await p.keyboard.press('ArrowDown');
  check('the list lights the row nearest the time typed', await p.textContent(await inPanel('at', '.is-active')) === '10:15');
  await p.keyboard.press('Escape');
  await type('at', '7am');
  check('a time before min is refused', await p.getAttribute('#at-text', 'aria-invalid') === 'true');
  await type('at', '25:00');
  check('a time that does not exist is refused', await p.getAttribute('#at-text', 'aria-invalid') === 'true');
  const forms = [];
  for (const [s, want] of [['9', '09:00'], ['930', '09:30'], ['0930', '09:30'], ['9:30', '09:30'], ['9.30', '09:30'], ['21:30', '21:30'], ['9:30pm', '21:30'], ['9 P.M.', '21:00'], ['12 am', '00:00'], ['12:15 p.m.', '12:15']]) {
    await type('ust', s);
    const got = await val('ust');
    if (got !== want) forms.push(s + ' -> ' + got);
  }
  check('times are read as 9, 930, 0930, 9:30, 9.30 and 21:30, with am or pm in any case and with dots', !forms.length, forms.join('; '));
  await p.fill('#ust-text', '9');
  check('an hour alone in a 12-hour language is in the morning, and the echo says so', await echo('ust') === '9:00 in the morning', await echo('ust'));
  await p.keyboard.press('Tab');
  await type('jpt', '午後9:30');
  check('the language\'s own word for pm is read', await val('jpt') === '21:30', await val('jpt'));
  await p.click('#ust + .combo .combo-open');
  check('a 12-hour list writes its times the language\'s way', await p.textContent(await inPanel('ust', '[role=option]')) === '12:00 AM');
  await p.keyboard.press('Escape');
  const scale = {};
  for (const id of ['t5', 't6', 't30']) {
    await p.click('#' + id + ' + .combo .combo-open');
    scale[id] = await p.evaluate(l => { const r = document.getElementById(l).querySelectorAll('[role=option]'); return r.length + ' ' + r[1].textContent + ' ' + r[r.length - 1].textContent; }, await panelOf(id));
    await p.keyboard.press('Escape');
  }
  check('data-time-list sets the list\'s interval in minutes, 5 or 6, and with no step the list is every half hour',
    scale.t5 === '288 00:05 23:55' && scale.t6 === '240 00:06 23:54' && scale.t30 === '48 00:30 23:30', JSON.stringify(scale));
  await type('at', '13:37');
  check('a time off the input\'s step is refused, and the echo says why', await p.getAttribute('#at-text', 'aria-invalid') === 'true' && await echo('at') === '13:37 is not one of the times allowed', await echo('at'));
  await type('t30', '13:37');
  check('with no step any minute is taken', await val('t30') === '13:37');
  await type('t30', '23:59');

  /* The wheel. */
  await p.focus('#t30-text');
  await p.hover('#t30-text');
  await heard();
  await p.mouse.wheel(0, -100);
  check('a wheel notch up over a focused time field steps it a minute, wrapping past midnight', await val('t30') === '00:00' && await text('t30') === '00:00' && await echo('t30') === '00:00');
  check('and fires input and change for the notch', await heard() === 'input:t30,change:t30');
  await p.mouse.wheel(0, 100);
  await p.mouse.wheel(0, 100);
  check('a notch down steps it back', await val('t30') === '23:58');
  await p.focus('#after');
  await p.hover('#t30-text');
  await p.mouse.wheel(0, -100);
  check('a field the page scrolls past without focus is never changed', await val('t30') === '23:58');
  await type('at', '17:45');
  await p.focus('#at-text');
  await p.hover('#at-text');
  await p.mouse.wheel(0, -100);
  check('the wheel steps by the input\'s step', await val('at') === '18:00');
  await p.mouse.wheel(0, -100);
  check('and stops at max rather than wrapping', await val('at') === '18:00');

  /* refresh, reset and state. */
  await p.evaluate(() => { const d = document.getElementById('due'); d.value = '2026-06-30'; pudlDate.refresh(d); });
  check('pudlDate.refresh shows a value a script set', await text('due') === '30/06/2026' && await echo('due') === 'Tuesday 30 June 2026');
  await p.evaluate(() => document.getElementById('form').reset());
  await p.waitForTimeout(50);
  check('resetting the form shows the values it put back', await text('due') === '22/10/2026' && await text('at') === '13:30', await text('due') + ' ' + await text('at'));
  await p.evaluate(() => document.getElementById('long').setAttribute('disabled', ''));
  await p.waitForTimeout(20);
  check('a state set on the hidden input later reaches the field', await p.evaluate(() => document.getElementById('long-text').disabled));

  /* In a dialog. */
  await p.click('#open-dialog');
  await p.click('#dlgd + .combo .combo-open');
  const inDialog = await p.evaluate(id => document.getElementById(id).closest('dialog') !== null, await panelOf('dlgd'));
  check('in a modal dialog the calendar lives in the dialog and opens', inDialog && await open('dlgd') && await focused() === '2026-05-10');
  await p.keyboard.press('Escape');
  check('Escape closes the calendar and leaves the dialog open', !(await open('dlgd')) && await p.evaluate(() => document.getElementById('dlg').open));
  await p.click('#dlgd + .combo .combo-open');
  await p.click(await inPanel('dlgd', '[data-date="2026-05-12"]'));
  check('and a day can be pressed there', await val('dlgd') === '2026-05-12' && await text('dlgd') === '12/05/2026');

  /* Where Intl.Locale cannot say which day starts the week, the table
     does: Monday in Britain, Sunday in the United States and Thailand. */
  const q = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  await q.addInitScript(() => {
    delete Intl.Locale.prototype.getWeekInfo;
    Object.defineProperty(Intl.Locale.prototype, 'weekInfo', { get() { return undefined; }, configurable: true });
  });
  await q.goto(ROOT + '/tests/fixtures/date.html');
  await q.waitForFunction(() => window.pudlDate && document.getElementById('due-text'));
  const heads = await q.evaluate(() => ['due', 'us', 'th'].map(id => {
    const l = document.getElementById(document.getElementById(id + '-text').getAttribute('aria-controls'));
    return l.querySelector('th').getAttribute('abbr');
  }).join());
  check('without weekInfo the week starts by the fallback table', heads === 'Monday,Sunday,วันอาทิตย์', heads);

  await browser.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
