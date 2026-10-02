/* The expense tracker sample, driven as a reader would drive it: sorting,
   filtering and paging the list, acting on several expenses at once, the
   life of one expense from draft to paid, the forms refusing and accepting,
   trips, reports, and resetting the data. */
const { launch, ROOT, out, engine } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
const S = ROOT + '/samples/';
/* A one-pixel PNG, standing in for a photo of a receipt. */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

(async () => {
  const b = await launch();
  const errors = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(e.message));

  const rows = () => p.$$eval('.data-table tbody tr:not(.data-table-empty) td[data-label="Expense"]', tds => tds.map(td => td.textContent.trim()));
  const amounts = () => p.$$eval('.data-table tbody td[data-label="Amount"]', tds => tds.map(td => td.textContent.trim()));
  const sortOf = name => p.$eval(`.data-table th:has(> a:text-is("${name}"))`, th => th.getAttribute('aria-sort'));
  const toast = async () => { await p.waitForSelector('.toast .toast-text', { timeout: 3000 }); return p.textContent('.toast .toast-text'); };
  const go = async (url) => { await p.goto(S + url); };
  /* Every submission here loads a document. Same-address actions first
     replace the history entry, which can satisfy waitForNavigation before
     the subsequent reload has rendered the updated record. */
  const submitAndWait = async (selector) => { await Promise.all([p.waitForEvent('load'), p.click(selector)]); };

  /* Every run starts from the seeded data. */
  await go('expenses.html');
  await p.evaluate(() => localStorage.clear());
  await go('expenses.html');

  /* === Sorting ========================================================== */
  check('list: sorted by date, newest first, by default', (await sortOf('Date')) === 'descending' && (await rows())[0] === 'Hotel deposit, Shinjuku');
  await submitAndWait('.data-table th > a:text-is("Amount")');
  check('sort: a header link sorts by its column', /sort=amount/.test(p.url()) && (await sortOf('Amount')) === 'descending' && (await sortOf('Date')) === 'none', p.url());
  /* Amounts in different currencies sort by their value in dollars. */
  check('sort: largest amount first, across currencies', JSON.stringify((await rows()).slice(0, 2)) === '["Flight, Singapore to Tokyo","Hotel, Makati, three nights"]', JSON.stringify(await rows()));
  await submitAndWait('.data-table th > a:text-is("Amount")');
  check('sort: pressing it again reverses the order', (await sortOf('Amount')) === 'ascending' && (await rows())[0] === 'Ride to the venue', JSON.stringify(await rows()));
  await submitAndWait('.data-table th > a:text-is("Expense")');
  const byName = await rows();
  check('sort: text columns start A to Z', (await sortOf('Expense')) === 'ascending' && JSON.stringify(byName) === JSON.stringify(byName.slice().sort((a, c) => a.localeCompare(c))), JSON.stringify(byName));
  check('sort: the caption says the order', /sorted by description, A to Z/.test(await p.textContent('.data-table caption')));

  /* === Paging =========================================================== */
  await go('expenses.html');
  check('pages: eight to a page', (await rows()).length === 8 && /Showing 1 to 8 of 13/.test(await p.textContent('.pagination-summary')));
  await submitAndWait('.page-link[rel="next"]');
  check('pages: Next goes to the second page', /page=2/.test(p.url()) && (await rows()).length === 5 &&
    (await p.getAttribute('.page-link[aria-current="page"]', 'href')) === 'expenses.html?page=2');
  check('pages: Next is disabled on the last page', (await p.getAttribute('.page-link[rel="next"]', 'aria-disabled')) === 'true');
  await submitAndWait('.data-table th > a:text-is("Amount")');
  check('pages: sorting returns to the first page', !/page=/.test(p.url()) && (await rows()).length === 8);

  /* === Filtering ======================================================== */
  await go('expenses.html');
  await p.fill('.md-filter', 'taxi');
  await Promise.all([p.waitForNavigation(), p.press('.md-filter', 'Enter')]);
  check('filter: the search narrows the list', JSON.stringify(await rows()) === '["Taxi from the airport"]', JSON.stringify(await rows()));
  check('filter: the search shows as a filter chip', /taxi/.test(await p.textContent('.filter-chip')));
  await p.hover('.filter-chip-x');
  await p.waitForSelector('.tooltip:popover-open', { timeout: 2000 });
  check('filter: the chip\'s × is named by a tooltip', (await p.textContent('.tooltip')) === 'Remove the search filter');
  await submitAndWait('.filter-chip-x');
  check('filter: the × removes it', (await rows()).length === 8 && !(await p.$('.filter-chip')));

  await p.click('.menu-btn[popovertarget="trip-menu"]');
  await p.waitForSelector('#trip-menu:popover-open');
  await submitAndWait('#trip-menu a:text-is("Tokyo, November")');
  check('filter: the trip menu filters by trip', (await rows()).length === 2 && /trip=tokyo-nov/.test(p.url()));
  await p.click('.menu-btn[popovertarget="trip-menu"]');
  check('filter: the menu marks the trip in force', (await p.textContent('#trip-menu [aria-current]')) === 'Tokyo, November');
  await p.keyboard.press('Escape');
  await p.click('.menu-btn[popovertarget="state-menu"]');
  await submitAndWait('#state-menu a:text-is("Draft")');
  check('filter: filters combine', (await rows()).length === 2 && (await p.$$('.filter-chip')).length === 2 && !!(await p.$('.clear-filters')));
  await p.fill('.md-filter', 'zzz');
  await Promise.all([p.waitForNavigation(), p.press('.md-filter', 'Enter')]);
  check('filter: the search keeps the other filters', /trip=tokyo-nov/.test(p.url()) && /state=draft/.test(p.url()));
  check('filter: nothing matching says so', !!(await p.$('.data-table-empty')));
  await submitAndWait('.clear-filters');
  check('filter: Clear all clears them', (await rows()).length === 8 && !(await p.$('.filter-chip')));

  await submitAndWait('.notice .btn:text-is("Show only these")');
  check('notice: shows the expenses with no receipt', (await rows()).length === 4 && !(await p.$('.notice.warn')));
  await go('expenses.html');
  await p.click('.notice-close');
  check('notice: the × dismisses it', await p.$eval('.notice.warn', n => n.hidden));

  await submitAndWait('.seg a:text-is("Paid")');
  check('paid: the Paid view lists the paid expenses', (await rows()).length === 4 && !(await p.$('.data-table-check')) &&
    (await p.getAttribute('.seg a:text-is("Paid")', 'aria-current')) === 'page');

  /* === Several at once ================================================== */
  await go('expenses.html?trip=tokyo-nov&state=draft');
  check('select: the bulk buttons wait for a choice', await p.$eval('#bulk button[value="submit"]', btn => btn.disabled));
  await p.check('input[name="id"] >> nth=0');
  const partial = await p.$eval('#select-all', c => c.indeterminate);
  await p.check('#select-all');
  const all = await p.$$eval('input[name="id"]', cs => cs.every(c => c.checked));
  check('select: select-all is partly checked, then checks every row', partial && all);
  check('select: a chosen row is marked', await p.$eval('.data-table tbody tr', tr => getComputedStyle(tr).boxShadow !== 'none'));
  await submitAndWait('#bulk button[value="submit"]');
  check('select: Submit selected submits the drafts', /2 expenses submitted/.test(await toast()) && (await rows()).length === 0);
  await go('expenses.html?q=ride');
  await p.check('input[name="id"] >> nth=0');
  await p.click('#bulk [commandfor="bulk-delete"]');
  check('select: Delete selected asks first', await p.$eval('#bulk-delete', d => d.matches(':modal')));
  await submitAndWait('#bulk-delete button[value="delete"]');
  check('select: and then deletes', /1 expense deleted/.test(await toast()) && (await rows()).length === 0);

  /* === One expense, from draft to paid ================================== */
  await go('expenses.html?q=team+dinner');
  await submitAndWait('.data-table a:text-is("Team dinner")');
  await p.waitForFunction(() => document.querySelector('.tabs.tabs-ready'));
  check('record: opens from the list', /expense\.html\?id=5/.test(p.url()) && (await p.textContent('h1')) === 'Team dinner');
  await submitAndWait('button:text-is("Submit for approval")');
  check('record: Submit moves it on', /submitted/.test(await toast()) && (await p.textContent('.record-meta .badge')) === 'submitted');
  await p.click('button:text-is("Reject…")');
  await p.click('#reject button[type="submit"]');
  check('record: a rejection needs a reason', await p.$eval('#reject', d => d.open) && /expense\.html\?id=5$/.test(p.url()));
  await p.fill('#reason', 'Team dinners come from the team budget.');
  await submitAndWait('#reject button[type="submit"]');
  check('record: rejected, with the reason shown', (await p.textContent('.record-meta .badge')) === 'rejected' && /team budget/.test(await p.textContent('.notice.danger')));
  await submitAndWait('button:text-is("Return to draft")');
  await submitAndWait('button:text-is("Submit for approval")');
  await p.click('.menu-btn[popovertarget="more"]');
  await submitAndWait('#more button:text-is("Withdraw to draft")');
  check('record: More withdraws it to draft', (await p.textContent('.record-meta .badge')) === 'draft');
  await submitAndWait('button:text-is("Submit for approval")');
  await submitAndWait('button:text-is("Approve")');
  await submitAndWait('button:text-is("Mark as paid back")');
  check('record: approved and paid back', (await p.textContent('.record-meta .badge')) === 'paid' && !(await p.$('a:text-is("Edit")')));
  await p.click('#tab-history');
  const hist = await p.$$eval('#history li', lis => lis.length);
  check('record: its history records each step', hist === 9, String(hist));
  await go('expenses.html?view=paid');
  check('record: a paid expense moves to Paid', (await rows()).includes('Team dinner'));

  /* === The receipt ====================================================== */
  await go('expense.html?id=8#receipt');
  await p.waitForFunction(() => document.querySelector('.tabs.tabs-ready'));
  check('receipt: #receipt opens its tab', await p.$eval('#receipt', el => !el.hidden));
  await p.setInputFiles('#receipt-file', { name: 'yardstick.png', mimeType: 'image/png', buffer: PNG });
  await submitAndWait('.attach-receipt button[type="submit"]');
  await p.waitForFunction(() => document.querySelector('.tabs.tabs-ready'));
  check('receipt: attaching shows the picture', /attached/.test(await toast()) && !!(await p.$('#receipt img.receipt-image')) && await p.$eval('#receipt', el => !el.hidden));
  check('receipt: the warning goes', !(await p.$('.record-meta .badge.warn')));
  await submitAndWait('.receipt-actions button[value="remove"]');
  /* The navigation can resolve before the page's script has drawn the
     record, so the check waits for the badge itself. */
  check('receipt: and it can be removed', await p.waitForSelector('.record-meta .badge.warn', { timeout: 5000 }).then(() => true, () => false));

  /* === Duplicate and delete ============================================= */
  await go('expense.html?id=2');
  await p.click('.menu-btn[popovertarget="more"]');
  await submitAndWait('#more button:text-is("Duplicate")');
  check('duplicate: opens the copy to edit', /expense-edit\.html\?id=\d+/.test(p.url()) && (await p.inputValue('#title')) === 'Client dinner, Poblacion (copy)');
  await go('expense.html?id=2');
  await p.click('.menu-btn[popovertarget="more"]');
  await p.click('#more button:text-is("Delete…")');
  check('delete: asks in a modal dialog', await p.$eval('#delete', d => d.matches(':modal')));
  await p.keyboard.press('Escape');
  check('delete: Escape keeps it', !(await p.$eval('#delete', d => d.open)));
  await p.click('.menu-btn[popovertarget="more"]');
  await p.click('#more button:text-is("Delete…")');
  await submitAndWait('#delete button[type="submit"]');
  check('delete: returns to the list with a toast', /expenses\.html/.test(p.url()) && (await toast()) === 'Expense deleted.' && !(await rows()).includes('Client dinner, Poblacion'));

  /* === The expense form ================================================= */
  await go('expense-edit.html?trip=manila-oct');
  await p.fill('#date', '');
  await p.click('button.btn-primary[type="submit"]');
  await p.waitForSelector('#form-notice');
  const refused = await p.evaluate(() => ({
    focus: document.activeElement.id,
    invalid: [...document.querySelectorAll('[aria-invalid="true"]')].map(e => e.id),
    links: document.querySelectorAll('#form-notice a').length
  }));
  check('form: an empty form is refused, field by field', refused.focus === 'form-notice' && refused.links === 4 &&
    JSON.stringify(refused.invalid) === '["title","merchant","date","amount"]', JSON.stringify(refused));
  await p.fill('#title', 'Dinner, last night');
  await p.fill('#merchant', 'Gallery by Chele');
  await p.fill('#date', '2026-11-02');
  await p.fill('#amount', '-5');
  await p.click('button.btn-primary[type="submit"]');
  await p.waitForSelector('#form-notice');
  check('form: what was typed is kept', (await p.inputValue('#title')) === 'Dinner, last night' && (await p.inputValue('#merchant')) === 'Gallery by Chele');
  check('form: the date is checked against the trip', /after the trip ended on 22 October 2026/.test(await p.textContent('#date-error')));
  check('form: the amount must be positive', /greater than zero/.test(await p.textContent('#amount-error')));
  await p.fill('#date', '2026-10-22');
  await p.fill('#amount', '4,380.50');
  await p.setInputFiles('#receipt', { name: 'chele.png', mimeType: 'image/png', buffer: PNG });
  await submitAndWait('button.btn-primary[type="submit"]');
  check('form: a good expense is saved and shown', (await toast()) === 'Expense saved.' && (await p.textContent('h1')) === 'Dinner, last night' &&
    /PHP 4,380.50/.test(await p.textContent('#details')));
  const id = new URL(p.url()).searchParams.get('id');
  await p.reload();
  check('form: it is still there after a reload', (await p.textContent('h1')) === 'Dinner, last night');
  await submitAndWait('a:text-is("Edit")');
  await p.fill('#notes', 'For the client and two of ours.');
  await p.check('input[name="account"][value="internal"]');
  await submitAndWait('button.btn-primary[type="submit"]');
  check('form: editing keeps the record', p.url().endsWith('expense.html?id=' + id) && /two of ours/.test(await p.textContent('#details')) && /Internal/.test(await p.textContent('#details')));
  await go('expense-edit.html');
  await p.fill('#title', 'Water');
  await p.fill('#merchant', '7-Eleven');
  await p.fill('#date', '2026-10-18');
  await p.fill('#amount', '65');
  await submitAndWait('button[value="another"]');
  check('form: Save and add another opens a fresh form', /expense-edit\.html/.test(p.url()) && (await p.inputValue('#title')) === '' && /next one/.test(await toast()));
  await go('expense-edit.html?id=1');
  check('form: an approved expense cannot be edited', !(await p.$('form[data-action="save-expense"]')) && /no longer be changed/.test(await p.textContent('main')));

  /* === Trips ============================================================ */
  await go('trips.html');
  check('trips: lists the trips', (await p.$$('.data-table tbody tr')).length === 3);
  await submitAndWait('.data-table th > a:text-is("Total (USD)")');
  check('trips: sort by total', (await p.$eval('.data-table th:has(> a:text-is("Total (USD)"))', th => th.getAttribute('aria-sort'))) === 'descending' &&
    (await p.textContent('.data-table tbody tr td a')) === 'Manila, October');
  await submitAndWait('a.btn-primary:text-is("New trip")');
  await p.fill('#name', 'Jakarta, December');
  await p.fill('#destination', 'Jakarta, Indonesia');
  await p.fill('#start', '2026-12-08');
  await p.fill('#end', '2026-12-04');
  await p.click('button.btn-primary[type="submit"]');
  await p.waitForSelector('#form-notice');
  check('trips: a trip cannot end before it begins', /cannot end before/.test(await p.textContent('#end-error')));
  await p.fill('#end', '2026-12-11');
  await submitAndWait('button.btn-primary[type="submit"]');
  check('trips: a new trip is created', /trip\.html\?id=jakarta-december/.test(p.url()) && !!(await p.$('.empty-state')));
  await submitAndWait('a.btn-primary:text-is("Add an expense")');
  check('trips: Add an expense starts with the trip chosen', (await p.inputValue('#trip')) === 'jakarta-december');
  await p.fill('#title', 'Taxi');
  await p.fill('#merchant', 'Bluebird');
  await p.fill('#date', '2026-12-08');
  await p.fill('#amount', '1');
  await submitAndWait('button.btn-primary[type="submit"]');
  await go('trip.html?id=jakarta-december');
  check('trips: the trip lists its expense', (await p.$$('.data-table tbody tr')).length === 1);
  await p.click('.menu-btn[popovertarget="more"]');
  await submitAndWait('#more button:text-is("Close the trip")');
  check('trips: a closed trip says so and takes no more', /closed/.test(await p.textContent('.record-meta')) && !(await p.$('a.btn-primary:text-is("Add an expense")')));
  await p.click('.menu-btn[popovertarget="more"]');
  await p.click('#more button:text-is("Delete…")');
  check('trips: deleting names what goes with it', /one expense/.test(await p.textContent('#delete .dialog-body')));
  await submitAndWait('#delete button[type="submit"]');
  check('trips: a deleted trip is gone', /trips\.html/.test(p.url()) && (await p.$$('.data-table tbody tr')).length === 3);

  /* === Reports ========================================================== */
  await go('reports.html');
  check('reports: totals for every trip', (await p.$$('.stat')).length === 4 && !!(await p.$('caption:text-is("By trip")')));
  await p.click('.menu-btn[popovertarget="report-trip"]');
  await submitAndWait('#report-trip a:text-is("Singapore, September")');
  check('reports: one trip at a time', (await p.textContent('h1')) === 'Singapore, September' && !(await p.$('caption:text-is("By trip")')));
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-download-csv]')]);
  const text = require('fs').readFileSync(await dl.path(), 'utf8');
  check('reports: CSV of the expenses behind them', dl.suggestedFilename() === 'expenses-singapore-sep.csv' && text.split('\r\n').filter(Boolean).length === 5 &&
    /^id,date,description/.test(text), dl.suggestedFilename());

  /* === Section tabs ===================================================== */
  await submitAndWait('.section-tab:text-is("Trips")');
  check('sections: Trips is reachable and current', (await p.getAttribute('.section-tab:text-is("Trips")', 'aria-current')) === 'page');
  await submitAndWait('.section-tab:text-is("Reports")');
  check('sections: Reports is reachable and current', (await p.getAttribute('.section-tab:text-is("Reports")', 'aria-current')) === 'page');
  await go('trip.html?id=tokyo-nov');
  check('sections: a trip belongs to Trips', (await p.getAttribute('.section-tab:text-is("Trips")', 'aria-current')) === 'true');

  /* === Reset ============================================================ */
  await p.click('.sample-foot button:text-is("Reset the sample data")');
  check('reset: asks first', await p.$eval('#reset', d => d.matches(':modal')));
  await submitAndWait('#reset button[type="submit"]');
  check('reset: the data is as it started', /back as it started/.test(await toast()) && (await rows()).length === 8 &&
    /of 13/.test(await p.textContent('.pagination-summary')));
  await go('expense.html?id=999');
  check('missing: an unknown record says so', /no such expense/.test(await p.textContent('.empty-state-title')));
  await go('expenses-archived.html');
  await p.waitForURL(/view=paid/);
  check('archive: the old address leads to Paid', (await rows()).length === 4);

  /* === Phones =========================================================== */
  const ph = await b.newPage({ viewport: { width: 393, height: 851 }, isMobile: true });
  ph.on('pageerror', e => errors.push(e.message));
  for (const pg of ['expenses.html', 'expense.html?id=1', 'expense-edit.html', 'trips.html', 'trip.html?id=manila-oct', 'trip-edit.html', 'reports.html']) {
    await ph.goto(S + pg);
    const over = await ph.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    check('phone: ' + pg + ' fits', !over);
  }
  await ph.goto(S + 'expenses.html');
  check('phone: the table stacks into cards', await ph.evaluate(() => getComputedStyle(document.querySelector('.data-table td')).display === 'flex'));
  const st = await ph.evaluate(() => {
    const cap = document.querySelector('.data-table caption'), wrap = document.querySelector('.data-table-wrap');
    const cell = [...document.querySelectorAll('td[data-label="State"]')].find(td => td.querySelectorAll('.badge').length === 2);
    const [x, y] = cell.querySelectorAll('.badge');
    return { cap: cap.getBoundingClientRect().width / wrap.clientWidth, gap: y.getBoundingClientRect().left - x.getBoundingClientRect().right,
             check: document.querySelector('td.data-table-check input').getBoundingClientRect().right > wrap.getBoundingClientRect().right - 40 };
  });
  check('phone: a stacked table\'s caption spans the table', st.cap > 0.9, String(st.cap));
  check('phone: two badges in a stacked cell stay together', st.gap < 16, String(st.gap));
  check('phone: a stacked row\'s checkbox sits with the values', st.check);
  await ph.goto(S + 'expense-edit.html?id=3');
  const hs = await ph.evaluate(() => ['title', 'date', 'trip', 'amount', 'currency'].map(id => document.getElementById(id).getBoundingClientRect().height));
  check('forms: text, date and select fields are one height', new Set(hs).size === 1, JSON.stringify(hs));
  await ph.screenshot({ path: out('expenses-phone.png'), fullPage: true });
  await p.goto(S + 'expenses.html');
  await p.screenshot({ path: out('expenses.png'), fullPage: true });

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
