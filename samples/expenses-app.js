/* The expense tracker's stand-in server.

   PUDL expects a server to render each page from its address and to handle
   each form, answering with a redirect and perhaps a toast. GitHub Pages
   serves files and nothing else, so this script plays the server's part in
   the browser: it keeps the data in localStorage, renders each page's
   <main> from the address before the page is first drawn, and handles the
   forms marked data-action as a server would handle a POST, redirecting
   afterwards so that a reload never repeats anything.

   Everything a reader can do is still an address: the list's filter, sort
   order and page, each record, each form. Links are links and forms are
   forms; only their handling lives here. Load it with defer, before the
   PUDL scripts, so that it has rendered the page by the time they look. */
(() => {
  'use strict';

  const KEY = 'pudl-expenses-sample';
  const FLASH = 'pudl-expenses-flash';
  const LAST_LIST = 'pudl-expenses-last-list';
  const PER_PAGE = 8;
  const RATES = { PHP: 0.0175, SGD: 0.74, USD: 1, JPY: 0.0068 };
  const CURRENCIES = Object.keys(RATES);
  const ACCOUNTS = { billable: 'Billable', 'non-billable': 'Not billable', internal: 'Internal' };
  const CATEGORIES = {
    lodging: 'Lodging', flights: 'Flights', ground: 'Ground transport', meals: 'Meals',
    comms: 'Phone and data', supplies: 'Supplies', other: 'Other'
  };
  /* The states an expense passes through, in order, and the badge each wears. */
  const STATES = {
    draft: { label: 'draft', badge: '' },
    submitted: { label: 'submitted', badge: 'accent' },
    approved: { label: 'approved', badge: 'positive' },
    rejected: { label: 'rejected', badge: 'danger' },
    paid: { label: 'paid', badge: 'positive' }
  };
  const STATE_ORDER = Object.keys(STATES);
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'];

  /* === The data ========================================================== */

  function seed() {
    const at = (d, t) => d + 'T' + t + ':00Z';
    const r = (name, kb) => ({ name, size: kb * 1024, type: /\.pdf$/.test(name) ? 'application/pdf' : 'image/jpeg' });
    const trips = [
      { id: 'manila-oct', name: 'Manila, October', destination: 'Manila, Philippines', start: '2026-10-15', end: '2026-10-22',
        purpose: 'Planning workshop with the client', customer: 'Harbour Bank', currency: 'PHP', status: 'open' },
      { id: 'singapore-sep', name: 'Singapore, September', destination: 'Singapore', start: '2026-09-07', end: '2026-09-11',
        purpose: 'Partner conference', customer: '', currency: 'SGD', status: 'closed' },
      { id: 'tokyo-nov', name: 'Tokyo, November', destination: 'Tokyo, Japan', start: '2026-11-09', end: '2026-11-13',
        purpose: 'Project kick-off', customer: 'Kanda Logistics', currency: 'JPY', status: 'open' }
    ];
    const e = (id, trip, date, title, merchant, category, amount, currency, account, state, receipt, notes, history) =>
      ({ id, trip, date, title, merchant, category, amount, currency, account, state, receipt, notes: notes || '', reason: '', history });
    const expenses = [
      e(1, 'manila-oct', '2026-10-19', 'Hotel, Makati, three nights', 'Makati Garden Hotel', 'lodging', 21600, 'PHP', 'billable', 'approved',
        r('receipt-makati-garden.pdf', 212), 'Room rate agreed with the client in advance.',
        [{ at: at('2026-10-21', '09:12'), text: 'Approved by accounts.' }, { at: at('2026-10-19', '11:40'), text: 'Submitted with its receipt.' }, { at: at('2026-10-19', '11:32'), text: 'Created.' }]),
      e(2, 'manila-oct', '2026-10-18', 'Client dinner, Poblacion', 'Toyo Eatery', 'meals', 8450, 'PHP', 'billable', 'submitted',
        r('toyo-eatery.jpg', 96), 'Dinner for four with the client\'s project team.',
        [{ at: at('2026-10-18', '14:05'), text: 'Submitted with its receipt.' }, { at: at('2026-10-18', '14:01'), text: 'Created.' }]),
      e(3, 'manila-oct', '2026-10-16', 'Airport transfer', 'Makati Garden Hotel', 'ground', 1200, 'PHP', 'billable', 'submitted', null, '',
        [{ at: at('2026-10-16', '10:20'), text: 'Submitted; the receipt is to follow.' }, { at: at('2026-10-16', '10:18'), text: 'Created.' }]),
      e(4, 'manila-oct', '2026-10-16', 'Taxi from the airport', 'Grab', 'ground', 640, 'PHP', 'billable', 'submitted', null, '',
        [{ at: at('2026-10-16', '10:25'), text: 'Submitted; the receipt is to follow.' }, { at: at('2026-10-16', '10:24'), text: 'Created.' }]),
      e(5, 'manila-oct', '2026-10-15', 'Team dinner', 'Manam, Greenbelt', 'meals', 6800, 'PHP', 'non-billable', 'draft',
        r('manam-greenbelt.jpg', 88), 'Our own team, the night we arrived.',
        [{ at: at('2026-10-15', '13:50'), text: 'Created.' }]),
      e(6, 'manila-oct', '2026-10-15', 'SIM card and data', 'Globe Telecom', 'comms', 1450, 'PHP', 'internal', 'rejected',
        r('globe-sim.jpg', 41), '',
        [{ at: at('2026-10-17', '08:30'), text: 'Rejected by accounts: roaming is covered by the company plan.' }, { at: at('2026-10-15', '09:10'), text: 'Submitted with its receipt.' }, { at: at('2026-10-15', '09:02'), text: 'Created.' }]),
      e(7, 'manila-oct', '2026-10-15', 'Flight, Singapore to Manila', 'Singapore Airlines', 'flights', 412, 'SGD', 'billable', 'approved',
        r('sq-e-ticket.pdf', 158), '',
        [{ at: at('2026-10-16', '02:00'), text: 'Approved by accounts.' }, { at: at('2026-10-02', '06:15'), text: 'Submitted with its receipt.' }, { at: at('2026-10-02', '06:12'), text: 'Created.' }]),
      e(8, 'manila-oct', '2026-10-17', 'Coffee with the client', 'Yardstick Coffee', 'meals', 780, 'PHP', 'billable', 'draft', null, '',
        [{ at: at('2026-10-17', '03:40'), text: 'Created.' }]),
      e(9, 'manila-oct', '2026-10-20', 'Printing for the workshop', 'Print Express, Legazpi', 'supplies', 2300, 'PHP', 'billable', 'submitted',
        r('print-express.jpg', 73), 'Forty copies of the workbook.',
        [{ at: at('2026-10-20', '01:30'), text: 'Submitted with its receipt.' }, { at: at('2026-10-20', '01:28'), text: 'Created.' }]),
      e(10, 'manila-oct', '2026-10-20', 'Ride to the venue', 'Grab', 'ground', 380, 'PHP', 'billable', 'draft', null, '',
        [{ at: at('2026-10-20', '00:45'), text: 'Created.' }]),
      e(11, 'manila-oct', '2026-10-21', 'Lunch, workshop day', 'Wildflour, Salcedo', 'meals', 5200, 'PHP', 'billable', 'submitted',
        r('wildflour.jpg', 102), 'Lunch for the workshop\'s twelve attendees.',
        [{ at: at('2026-10-21', '07:10'), text: 'Submitted with its receipt.' }, { at: at('2026-10-21', '07:08'), text: 'Created.' }]),
      e(12, 'singapore-sep', '2026-09-10', 'Hotel, Tanjong Pagar, three nights', 'Hotel Miramar', 'lodging', 780, 'SGD', 'internal', 'paid',
        r('miramar-folio.pdf', 190), '',
        [{ at: at('2026-09-25', '02:00'), text: 'Paid back with the September expenses.' }, { at: at('2026-09-14', '05:00'), text: 'Approved by accounts.' }, { at: at('2026-09-11', '10:00'), text: 'Submitted with its receipt.' }, { at: at('2026-09-11', '09:55'), text: 'Created.' }]),
      e(13, 'singapore-sep', '2026-09-07', 'Flight, Manila to Singapore', 'Philippine Airlines', 'flights', 11800, 'PHP', 'internal', 'paid',
        r('pal-e-ticket.pdf', 144), '',
        [{ at: at('2026-09-25', '02:00'), text: 'Paid back with the September expenses.' }, { at: at('2026-09-14', '05:00'), text: 'Approved by accounts.' }, { at: at('2026-09-07', '12:00'), text: 'Submitted with its receipt.' }, { at: at('2026-09-07', '11:58'), text: 'Created.' }]),
      e(14, 'singapore-sep', '2026-09-08', 'Taxi to the conference', 'ComfortDelGro', 'ground', 32.5, 'SGD', 'internal', 'paid',
        r('cdg-receipt.jpg', 22), '',
        [{ at: at('2026-09-25', '02:00'), text: 'Paid back with the September expenses.' }, { at: at('2026-09-14', '05:00'), text: 'Approved by accounts.' }, { at: at('2026-09-08', '01:10'), text: 'Submitted with its receipt.' }, { at: at('2026-09-08', '01:09'), text: 'Created.' }]),
      e(15, 'singapore-sep', '2026-09-09', 'Dinner with partners', 'Burnt Ends', 'meals', 186, 'SGD', 'non-billable', 'paid',
        r('burnt-ends.jpg', 64), '',
        [{ at: at('2026-09-25', '02:00'), text: 'Paid back with the September expenses.' }, { at: at('2026-09-14', '05:00'), text: 'Approved by accounts.' }, { at: at('2026-09-09', '15:30'), text: 'Submitted with its receipt.' }, { at: at('2026-09-09', '15:28'), text: 'Created.' }]),
      e(16, 'tokyo-nov', '2026-11-09', 'Flight, Singapore to Tokyo', 'Japan Airlines', 'flights', 640, 'USD', 'billable', 'draft',
        r('jal-e-ticket.pdf', 131), 'Booked early for the fare.',
        [{ at: at('2026-09-20', '04:00'), text: 'Created.' }]),
      e(17, 'tokyo-nov', '2026-11-09', 'Hotel deposit, Shinjuku', 'Hotel Gracery Shinjuku', 'lodging', 18000, 'JPY', 'billable', 'draft',
        r('gracery-deposit.pdf', 87), '',
        [{ at: at('2026-09-20', '04:10'), text: 'Created.' }])
    ];
    return { version: 1, nextId: 18, trips, expenses };
  }

  /* The data lives in localStorage. When the browser will not keep it, as
     in some private windows, the sample still works for the page in view. */
  let persistent = true;
  function load() {
    try {
      const s = localStorage.getItem(KEY);
      if (s) {
        const db = JSON.parse(s);
        if (db && db.version === 1) return db;
      }
    } catch (err) { persistent = false; }
    return seed();
  }
  const db = load();

  function store() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); return true; } catch (err) {
      /* Most likely the quota: drop the pictures of receipts and try again. */
      db.expenses.forEach(x => { if (x.receipt) delete x.receipt.data; });
      try { localStorage.setItem(KEY, JSON.stringify(db)); return true; } catch (err2) { persistent = false; return false; }
    }
  }

  function session(key, value) {
    try {
      if (value === undefined) { const v = sessionStorage.getItem(key); sessionStorage.removeItem(key); return v; }
      sessionStorage.setItem(key, value);
    } catch (err) { /* no session storage: nothing to carry */ }
    return null;
  }
  function peek(key) { try { return sessionStorage.getItem(key); } catch (err) { return null; } }

  const tripOf = id => db.trips.find(t => t.id === id);
  const expenseOf = id => db.expenses.find(x => String(x.id) === String(id));
  const tripName = id => (tripOf(id) || { name: 'No trip' }).name;
  const usd = x => x.amount * RATES[x.currency];
  const needsReceipt = x => !x.receipt && x.state !== 'paid' && x.state !== 'rejected';
  const nowIso = () => new Date().toISOString();
  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* === Formatting ======================================================== */

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ESC[c]);

  function num(n, cur) {
    const d = cur === 'JPY' ? 0 : 2;
    return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  const money = (n, cur) => cur + ' ' + num(n, cur);
  function longDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return d + ' ' + MONTHS[m - 1] + ' ' + y;
  }
  function shortDate(iso) {
    const [, m, d] = iso.split('-').map(Number);
    return d + ' ' + MONTHS[m - 1].slice(0, 3);
  }
  function dateRange(a, b) {
    const [ya, ma] = a.split('-');
    const [yb, mb] = b.split('-');
    if (ya === yb && ma === mb) return Number(a.slice(8)) + ' to ' + longDate(b);
    if (ya === yb) return shortDate(a) + ' to ' + longDate(b);
    return longDate(a) + ' to ' + longDate(b);
  }
  function stamp(iso) {
    const d = new Date(iso);
    return d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear() + ', ' +
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function kb(bytes) { return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB'; }
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : (many || one + 's'));
  const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
  const count = (n, one, many) => (WORDS[n] || n) + ' ' + (n === 1 ? one : (many || one + 's'));

  const badge = state => `<span class="badge ${STATES[state].badge}">${STATES[state].label}</span>`;
  const receiptBadge = x => needsReceipt(x) ? ' <span class="badge warn">no receipt</span>' : '';

  /* An address on this site, from a page and its query. Empty values drop out. */
  function href(page, query) {
    const q = new URLSearchParams();
    Object.keys(query || {}).forEach(k => {
      const v = query[k];
      if (v !== undefined && v !== null && v !== '') q.set(k, v);
    });
    const s = q.toString();
    return page + (s ? '?' + s : '');
  }

  const params = new URLSearchParams(location.search);
  const main = document.querySelector('main[data-page]');

  /* A page whose record is gone, or never was. */
  function missing(what, back, backText) {
    document.title = 'Not found, a PUDL Sample';
    return `<div class="data-table-wrap"><div class="empty-state">
      <p class="empty-state-title">There is no such ${what}</p>
      <p class="empty-state-body">It may have been deleted, or the sample data may have been reset.</p>
      <div class="empty-state-actions"><a class="btn" href="${back}">${backText}</a></div>
    </div></div>`;
  }

  /* A menu of links that each set one filter, the current one marked. */
  function filterMenu(id, label, current, options, link, size) {
    const rows = options.map(([value, text]) =>
      `<div class="md-row"><a class="md-item" href="${esc(link(value))}"${String(value) === String(current || '') ? ' aria-current="true"' : ''}>${esc(text)}</a></div>`).join('');
    return `<div class="menu">
      <button class="btn ${size === undefined ? 'btn-sm ' : size}menu-btn" type="button" popovertarget="${id}">${esc(label)}</button>
      <nav class="menu-panel" id="${id}" popover aria-label="${esc(label)}">${rows}</nav>
    </div>`;
  }

  function sortHeader(key, label, sort, dir, link, cls) {
    const on = sort.key === key;
    const aria = on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
    return `<th${cls ? ` class="${cls}"` : ''} aria-sort="${aria}"><a href="${esc(link(key, on ? (sort.dir === 'asc' ? 'desc' : 'asc') : dir[key]))}">${label}</a></th>`;
  }

  function pagination(label, page, pages, total, first, last, link) {
    if (!total) return '';
    const nums = [];
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
      else if (nums[nums.length - 1] !== '…') nums.push('…');
    }
    const links = nums.map(n => n === '…' ? '<span class="page-gap">…</span>'
      : `<a class="page-link" href="${esc(link(n))}"${n === page ? ' aria-current="page"' : ''}${n === page ? '' : ` aria-label="Page ${n}"`}>${n}</a>`).join('');
    const prev = page > 1 ? `<a class="page-link" rel="prev" href="${esc(link(page - 1))}">Previous</a>` : '<a class="page-link" rel="prev" aria-disabled="true">Previous</a>';
    const next = page < pages ? `<a class="page-link" rel="next" href="${esc(link(page + 1))}">Next</a>` : '<a class="page-link" rel="next" aria-disabled="true">Next</a>';
    return `<nav class="pagination" aria-label="${label}">
      <span class="pagination-summary">Showing ${first} to ${last} of ${total}</span>
      ${pages > 1 ? prev + links + next : ''}
    </nav>`;
  }

  function sorter(key, get, dir) {
    return (a, b) => {
      const va = get(a), vb = get(b);
      const c = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
      return (dir === 'asc' ? c : -c) || b.date.localeCompare(a.date) || b.id - a.id;
    };
  }

  /* === The expense list ================================================== */

  const EXPENSE_SORTS = {
    title: { label: 'description', get: x => x.title.toLowerCase(), dir: 'asc', words: ['A to Z', 'Z to A'] },
    date: { label: 'date', get: x => x.date, dir: 'desc', words: ['oldest first', 'newest first'] },
    trip: { label: 'trip', get: x => tripName(x.trip).toLowerCase(), dir: 'asc', words: ['A to Z', 'Z to A'] },
    account: { label: 'account', get: x => ACCOUNTS[x.account], dir: 'asc', words: ['A to Z', 'Z to A'] },
    state: { label: 'state', get: x => STATE_ORDER.indexOf(x.state), dir: 'asc', words: ['draft first', 'paid first'] },
    amount: { label: 'amount', get: x => usd(x), dir: 'desc', words: ['smallest first', 'largest first'] }
  };

  function renderExpenses() {
    const archived = params.get('view') === 'paid';
    const f = {
      view: archived ? 'paid' : '',
      q: (params.get('q') || '').trim(),
      trip: tripOf(params.get('trip')) ? params.get('trip') : '',
      account: ACCOUNTS[params.get('account')] ? params.get('account') : '',
      state: !archived && STATES[params.get('state')] && params.get('state') !== 'paid' ? params.get('state') : '',
      receipt: !archived && params.get('receipt') === 'missing' ? 'missing' : ''
    };
    const key = EXPENSE_SORTS[params.get('sort')] ? params.get('sort') : 'date';
    const sort = { key, dir: params.get('dir') === 'asc' || params.get('dir') === 'desc' ? params.get('dir') : EXPENSE_SORTS[key].dir };
    const withSort = Object.assign({}, f, { sort: key === 'date' ? '' : key, dir: sort.dir === EXPENSE_SORTS[key].dir ? '' : sort.dir });
    const link = over => href('expenses.html', Object.assign({}, withSort, { page: '' }, over));
    session(LAST_LIST, link({ page: params.get('page') || '' }));
    document.title = (archived ? 'Paid expenses' : 'Expenses') + ', a PUDL Sample';

    const pool = db.expenses.filter(x => archived ? x.state === 'paid' : x.state !== 'paid');
    const words = f.q.toLowerCase().split(/\s+/).filter(Boolean);
    const rows = pool.filter(x =>
      (!f.trip || x.trip === f.trip) && (!f.account || x.account === f.account) &&
      (!f.state || x.state === f.state) && (!f.receipt || needsReceipt(x)) &&
      words.every(w => (x.title + ' ' + x.merchant + ' ' + x.notes + ' ' + tripName(x.trip) + ' ' + CATEGORIES[x.category]).toLowerCase().includes(w)))
      .sort(sorter(key, EXPENSE_SORTS[key].get, sort.dir));

    const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
    const page = Math.min(pages, Math.max(1, parseInt(params.get('page'), 10) || 1));
    const shown = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    /* The notice about receipts counts every open expense, whatever the filter. */
    const due = db.expenses.filter(needsReceipt);
    const notice = !archived && due.length && !f.receipt ? `
      <div class="notice warn" role="status">
        <div class="notice-content">
          <p class="notice-title">${count(due.length, 'expense has', 'expenses have')} no receipt yet</p>
          <p class="notice-body">${due.slice(0, 3).map(x => `<a href="expense.html?id=${x.id}#receipt">${esc(x.title)}</a>`).join(', ')}${due.length > 3 ? ' and ' + plural(due.length - 3, 'more') : ''}. Accounts pays nothing back without one.</p>
          <div class="notice-actions"><a class="btn btn-sm" href="${esc(link({ receipt: 'missing', state: '' }))}">Show only these</a></div>
        </div>
        <button class="notice-close" type="button" aria-label="Dismiss"></button>
      </div>` : '';

    const chips = [];
    const chip = (kind, text, drop) => chips.push(`<span class="filter-chip"><span class="filter-chip-kind">${kind}</span> ${esc(text)} <a class="filter-chip-x" href="${esc(link(drop))}" aria-label="Remove the ${kind} filter">×</a></span>`);
    if (f.q) chip('search', '“' + f.q + '”', { q: '' });
    if (f.trip) chip('trip', tripName(f.trip), { trip: '' });
    if (f.account) chip('account', ACCOUNTS[f.account], { account: '' });
    if (f.state) chip('state', STATES[f.state].label, { state: '' });
    if (f.receipt) chip('receipt', 'missing', { receipt: '' });
    const filtered = chips.length > 0;
    if (chips.length > 1) chips.push(`<a class="link-muted clear-filters" href="${esc(href('expenses.html', { view: f.view }))}">Clear all</a>`);

    const hidden = Object.keys(withSort).filter(k => k !== 'q' && withSort[k]).map(k => `<input type="hidden" name="${k}" value="${esc(withSort[k])}">`).join('');
    const menus = filterMenu('trip-menu', 'Trip', f.trip, [['', 'All trips']].concat(db.trips.map(t => [t.id, t.name])), v => link({ trip: v })) +
      filterMenu('account-menu', 'Account', f.account, [['', 'All accounts']].concat(Object.entries(ACCOUNTS)), v => link({ account: v })) +
      (archived ? '' : filterMenu('state-menu', 'State', f.state, [['', 'Any state']].concat(STATE_ORDER.filter(s => s !== 'paid').map(s => [s, STATES[s].label[0].toUpperCase() + STATES[s].label.slice(1)])), v => link({ state: v })));

    const sortLink = (k, d) => href('expenses.html', Object.assign({}, f, { sort: k === 'date' ? '' : k, dir: d === EXPENSE_SORTS[k].dir ? '' : d }));
    const dirs = Object.fromEntries(Object.entries(EXPENSE_SORTS).map(([k, s]) => [k, s.dir]));
    const H = (k, label, cls) => sortHeader(k, label, sort, dirs, sortLink, cls);
    const selectable = !archived;

    const body = shown.length ? shown.map(x => `
      <tr>
        ${selectable ? `<td class="data-table-check" data-label="Select"><input type="checkbox" name="id" value="${x.id}" form="bulk" aria-label="Select ${esc(x.title)}"></td>` : ''}
        <td data-label="Expense"><a href="expense.html?id=${x.id}">${esc(x.title)}</a></td>
        <td data-label="Date"><time datetime="${x.date}">${x.date}</time></td>
        <td data-label="Trip">${esc(tripName(x.trip))}</td>
        <td data-label="Account">${ACCOUNTS[x.account]}</td>
        <td data-label="State">${badge(x.state)}${receiptBadge(x)}</td>
        <td class="num" data-label="Amount">${money(x.amount, x.currency)}</td>
      </tr>`).join('') : `
      <tr class="data-table-empty"><td colspan="${selectable ? 7 : 6}">Nothing matches these filters. <a href="${esc(href('expenses.html', { view: f.view }))}">Clear them</a> to see every ${archived ? 'paid' : 'open'} expense.</td></tr>`;

    const empty = !pool.length;
    const table = empty ? `
      <div class="data-table-wrap"><div class="empty-state">
        <p class="empty-state-title">${archived ? 'Nothing paid back yet' : 'No open expenses'}</p>
        <p class="empty-state-body">${archived ? 'Expenses move here once accounts has paid them back, so the open list only holds what still needs doing.' : 'Everything has been paid back. A new expense starts here.'}</p>
        <div class="empty-state-actions">${archived ? '<a class="btn" href="expenses.html">Back to open expenses</a>' : '<a class="btn" href="expense-edit.html">New expense</a>'}</div>
      </div></div>` : `
      <div class="data-table-wrap">
        <table class="data-table stack">
          <caption>${filtered ? 'Matching' : archived ? 'Paid' : 'Open'} expenses, sorted by ${EXPENSE_SORTS[key].label}, ${EXPENSE_SORTS[key].words[sort.dir === 'asc' ? 0 : 1]}</caption>
          <thead>
            <tr>
              ${selectable ? '<th class="data-table-check"><input type="checkbox" id="select-all" aria-label="Select every expense on this page"></th>' : ''}
              ${H('title', 'Expense')}${H('date', 'Date')}${H('trip', 'Trip')}${H('account', 'Account')}${H('state', 'State')}${H('amount', 'Amount', 'num')}
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>`;

    const bulk = selectable && shown.length ? `
      <form class="bulk-bar" id="bulk" data-action="bulk">
        <span class="bulk-count" id="bulk-count" aria-live="polite">Select expenses to act on several at once.</span>
        <button class="btn btn-sm" type="submit" name="op" value="submit" disabled>Submit selected</button>
        <button class="btn btn-sm btn-danger" type="button" commandfor="bulk-delete" command="show-modal" disabled>Delete selected…</button>
      </form>
      <dialog class="dialog" id="bulk-delete" aria-labelledby="bulk-delete-title">
        <h2 class="dialog-title" id="bulk-delete-title">Delete the selected expenses?</h2>
        <p class="dialog-body">They and their receipts will be removed for good.</p>
        <div class="dialog-actions">
          <button class="btn" type="button" commandfor="bulk-delete" command="close" autofocus>Keep them</button>
          <button class="btn btn-danger" type="submit" form="bulk" name="op" value="delete">Delete them</button>
        </div>
      </dialog>` : '';

    const total = rows.reduce((s, x) => s + usd(x), 0);
    return `
    <div class="app-head">
      <h1>${archived ? 'Paid expenses' : 'Expenses'}</h1>
      <a class="btn btn-primary" href="${esc(href('expense-edit.html', { trip: f.trip }))}">New expense</a>
    </div>
    <div class="app-stack">
      ${notice}
      <div>
        <div class="app-tools">
          <form class="md-filter-group" action="expenses.html" method="get" role="search">
            ${hidden}
            <input class="md-filter" type="search" name="q" value="${esc(f.q)}" placeholder="Filter expenses…" aria-label="Filter expenses">
            <button class="icon-btn md-filter-go" type="submit" aria-label="Apply the filter"></button>
          </form>
          <div class="seg" aria-label="Which expenses">
            <a href="expenses.html"${archived ? '' : ' aria-current="page"'}>Open</a>
            <a href="expenses.html?view=paid"${archived ? ' aria-current="page"' : ''}>Paid</a>
          </div>
          ${menus}
        </div>
        ${chips.length ? `<div class="app-chips">${chips.join('')}</div>` : ''}
        ${bulk}
        ${table}
      </div>
      ${empty ? '' : `<div class="app-foot">
        ${pagination('Pages of expenses', page, pages, rows.length, rows.length ? (page - 1) * PER_PAGE + 1 : 0, Math.min(rows.length, page * PER_PAGE), n => link({ page: n > 1 ? n : '' }))}
        ${rows.length ? `<span class="sample-note">Total of ${plural(rows.length, 'expense')}: <strong>${money(total, 'USD')}</strong></span>` : ''}
      </div>`}
    </div>`;
  }

  /* The list's checkboxes: one for every row on the page, and the bulk
     buttons, which wait until something is chosen. */
  function wireSelection() {
    const all = document.getElementById('select-all');
    const form = document.getElementById('bulk');
    if (!form) return;
    const boxes = () => Array.from(document.querySelectorAll('input[name="id"][form="bulk"]'));
    const sync = () => {
      const n = boxes().filter(b => b.checked).length;
      form.querySelectorAll('button').forEach(b => { b.disabled = n === 0; });
      document.getElementById('bulk-count').textContent = n ? plural(n, 'expense') + ' selected.' : 'Select expenses to act on several at once.';
      if (all) { all.checked = n > 0 && n === boxes().length; all.indeterminate = n > 0 && n < boxes().length; }
    };
    document.addEventListener('change', e => {
      if (e.target === all) boxes().forEach(b => { b.checked = all.checked; });
      if (e.target === all || boxes().includes(e.target)) sync();
    });
    sync();
  }

  /* === One expense ======================================================= */

  function renderExpense() {
    const x = expenseOf(params.get('id'));
    const back = peek(LAST_LIST) || 'expenses.html';
    if (!x) return missing('expense', back, 'Back to the expenses');
    document.title = x.title + ', a PUDL Sample';
    const trip = tripOf(x.trip);
    const editable = x.state === 'draft' || x.state === 'submitted' || x.state === 'rejected';
    const act = (to, text, cls) => `<button class="btn ${cls || ''}" type="submit" name="to" value="${to}" form="move">${text}</button>`;
    let actions = '';
    if (x.state === 'draft') actions = act('submitted', 'Submit for approval', 'btn-primary');
    if (x.state === 'submitted') actions = act('approved', 'Approve', 'btn-primary') + '<button class="btn" type="button" commandfor="reject" command="show-modal">Reject…</button>';
    if (x.state === 'approved') actions = act('paid', 'Mark as paid back', 'btn-primary');
    if (x.state === 'rejected') actions = act('draft', 'Return to draft', 'btn-primary');

    const menu = `<div class="menu">
      <button class="btn menu-btn" type="button" popovertarget="more">More</button>
      <div class="menu-panel" id="more" popover aria-label="More actions">
        ${x.state === 'submitted' ? '<button class="menu-action" type="submit" name="to" value="draft" form="move">Withdraw to draft</button>' : ''}
        <button class="menu-action" type="submit" form="duplicate">Duplicate</button>
        <button class="menu-action" type="button" data-copy-link>Copy a link to this expense</button>
        <button class="menu-action" type="button" onclick="window.print()">Print</button>
        ${x.state !== 'paid' ? '<hr class="menu-sep"><button class="menu-action danger" type="button" commandfor="delete" command="show-modal">Delete…</button>' : ''}
      </div>
    </div>`;

    let notice = '';
    if (x.state === 'rejected') notice = `<div class="notice danger" role="status"><div class="notice-content">
      <p class="notice-title">Accounts rejected this expense</p>
      <p class="notice-body">${esc(x.reason || (x.history.find(h => /^Rejected/.test(h.text)) || { text: '' }).text.replace(/^Rejected by accounts: /, '')) || 'No reason was given.'} Return it to draft to change it and submit it again.</p>
    </div></div>`;
    else if (needsReceipt(x)) notice = `<div class="notice warn" role="status"><div class="notice-content">
      <p class="notice-title">No receipt yet</p>
      <p class="notice-body">Accounts pays nothing back without one. <a href="#receipt">Attach it on the Receipt tab</a>.</p>
    </div></div>`;
    else if (x.state === 'paid') notice = `<div class="notice positive" role="status"><div class="notice-content">
      <p class="notice-title">Paid back</p>
      <p class="notice-body">This expense is closed and can no longer be changed.</p>
    </div></div>`;

    const r = x.receipt;
    const preview = r ? (r.data ? `<img class="receipt-image" src="${r.data}" alt="The receipt for ${esc(x.title)}">`
      : `<div class="receipt-thumb">${esc(r.name)}</div>`) : '';
    const receipt = r ? `
      <div class="receipt">
        ${preview}
        <div>
          <p class="form-help">${esc(r.name)}, ${kb(r.size)}.</p>
          ${editable ? `<form data-action="receipt" class="receipt-actions"><input type="hidden" name="id" value="${x.id}">
            <button class="btn btn-sm btn-danger" type="submit" name="op" value="remove">Remove the receipt</button></form>` : ''}
        </div>
      </div>` : `
      <div class="empty-state">
        <p class="empty-state-title">No receipt attached</p>
        <p class="empty-state-body">A photo or a PDF of the receipt, up to 10 MB.${x.state === 'paid' || x.state === 'rejected' ? '' : ' Accounts pays nothing back without one.'}</p>
      </div>`;
    const attach = editable || (x.state === 'approved' && !r) ? `
      <form data-action="receipt" class="attach-receipt">
        <input type="hidden" name="id" value="${x.id}">
        <div class="form-group">
          <label class="form-label" for="receipt-file">${r ? 'Replace the receipt' : 'Attach a receipt'}</label>
          <input class="form-file" id="receipt-file" name="receipt" type="file" accept="image/*,application/pdf" required>
        </div>
        <button class="btn" type="submit" name="op" value="attach">Attach</button>
      </form>` : '';

    return `
    <p class="app-back"><a href="${esc(back)}">Back to the expenses</a></p>
    <div class="app-head">
      <h1>${esc(x.title)}</h1>
      ${actions}
      ${editable ? `<a class="btn" href="expense-edit.html?id=${x.id}">Edit</a>` : ''}
      ${menu}
    </div>
    <form id="move" data-action="move" hidden><input type="hidden" name="id" value="${x.id}"></form>
    <form id="duplicate" data-action="duplicate" hidden><input type="hidden" name="id" value="${x.id}"></form>
    <p class="record-meta">
      ${badge(x.state)}${receiptBadge(x)}
      <span class="chip">${esc(tripName(x.trip))}</span>
      <span class="chip">${ACCOUNTS[x.account]}</span>
      <span class="chip">${CATEGORIES[x.category]}</span>
    </p>
    ${notice ? `<div class="app-stack" style="margin-bottom: var(--space-4)">${notice}</div>` : ''}
    <div class="tabs">
      <div class="tablist" role="tablist" aria-label="Expense">
        <button role="tab" id="tab-details" aria-controls="details" aria-selected="true">Details</button>
        <button role="tab" id="tab-receipt" aria-controls="receipt">Receipt</button>
        <button role="tab" id="tab-history" aria-controls="history">History</button>
      </div>
      <section role="tabpanel" id="details" aria-labelledby="tab-details">
        <table class="kv-table">
          <tr><th>Merchant</th><td>${esc(x.merchant)}</td></tr>
          <tr><th>Date</th><td><time datetime="${x.date}">${longDate(x.date)}</time></td></tr>
          <tr><th>Trip</th><td>${trip ? `<a href="trip.html?id=${esc(trip.id)}">${esc(trip.name)}</a>` : 'None'}</td></tr>
          <tr><th>Category</th><td>${CATEGORIES[x.category]}</td></tr>
          <tr><th>Amount</th><td><data value="${x.amount}">${money(x.amount, x.currency)}</data>${x.currency === 'USD' ? '' : ` <span class="text-muted">(about ${money(usd(x), 'USD')})</span>`}</td></tr>
          <tr><th>Account</th><td>${ACCOUNTS[x.account]}${x.account === 'billable' && trip && trip.customer ? ', charged to ' + esc(trip.customer) : ''}</td></tr>
          <tr><th>Notes</th><td>${esc(x.notes) || '<span class="text-muted">None</span>'}</td></tr>
        </table>
      </section>
      <section role="tabpanel" id="receipt" aria-labelledby="tab-receipt">
        ${receipt}
        ${attach}
      </section>
      <section role="tabpanel" id="history" aria-labelledby="tab-history">
        <ol class="history">
          ${x.history.map(h => `<li><time datetime="${h.at}">${stamp(h.at)}</time> ${esc(h.text)}</li>`).join('')}
        </ol>
      </section>
    </div>

    <dialog class="dialog" id="delete" aria-labelledby="delete-title">
      <h2 class="dialog-title" id="delete-title">Delete this expense?</h2>
      <p class="dialog-body">${esc(x.title)}, ${money(x.amount, x.currency)}, and its receipt will be removed for good.${x.state === 'approved' ? ' It has been approved, so accounts will be told.' : ''}</p>
      <form class="dialog-actions" data-action="delete">
        <input type="hidden" name="id" value="${x.id}">
        <button class="btn" type="button" commandfor="delete" command="close" autofocus>Keep it</button>
        <button class="btn btn-danger" type="submit">Delete the expense</button>
      </form>
    </dialog>
    <dialog class="dialog" id="reject" aria-labelledby="reject-title">
      <h2 class="dialog-title" id="reject-title">Reject this expense?</h2>
      <p class="dialog-body">As the approver, say why, so the person who claimed it knows what to change.</p>
      <form data-action="reject">
        <input type="hidden" name="id" value="${x.id}">
        <div class="form-group">
          <label class="form-label" for="reason">Reason</label>
          <textarea class="form-textarea" id="reason" name="reason" required></textarea>
        </div>
        <div class="dialog-actions">
          <button class="btn" type="button" commandfor="reject" command="close">Cancel</button>
          <button class="btn btn-danger" type="submit">Reject the expense</button>
        </div>
      </form>
    </dialog>`;
  }

  /* === The expense form ================================================== */

  function expenseForm(v, errors, editing) {
    const err = (name, id) => errors[name] ? ` aria-invalid="true" aria-describedby="${id}-error${id === 'amount' ? ' amount-help' : ''}"` : (id === 'amount' ? ' aria-describedby="amount-help"' : '');
    const msg = (name, id) => errors[name] ? `<p class="form-error" id="${id}-error">${esc(errors[name])}</p>` : '';
    const names = { title: 'the description', merchant: 'the merchant', date: 'the date', trip: 'the trip', amount: 'the amount' };
    const wrong = Object.keys(errors);
    const notice = wrong.length ? `
      <div class="notice danger" role="alert" tabindex="-1" id="form-notice" style="margin-bottom: var(--space-4);">
        <div class="notice-content">
          <p class="notice-title">The expense was not saved</p>
          <p class="notice-body">${wrong.length === 1 ? 'One field needs' : count(wrong.length, 'field') + ' need'} attention: ${wrong.map(k => `<a href="#${k}">${names[k]}</a>`).join(wrong.length === 2 ? ' and ' : ', ')}.</p>
        </div>
      </div>` : '';
    const opts = (map, cur) => Object.entries(map).map(([k, t]) => `<option value="${esc(k)}"${k === cur ? ' selected' : ''}>${esc(t)}</option>`).join('');
    const x = editing && expenseOf(editing);
    const openTrips = db.trips.filter(t => t.status === 'open' || t.id === v.trip);
    return `${notice}
    ${x && (x.state === 'submitted' || x.state === 'rejected') ? `<div class="notice" role="status" style="margin-bottom: var(--space-4);"><div class="notice-content">
      <p class="notice-body">This expense is ${x.state}. Saving a change returns it to draft, to be submitted again.</p></div></div>` : ''}
    <form data-action="save-expense" novalidate>
      ${editing ? `<input type="hidden" name="id" value="${esc(editing)}">` : ''}
      <div class="form-group">
        <label class="form-label" for="title">Description</label>
        <input class="form-input" id="title" name="title" value="${esc(v.title)}" required${err('title', 'title')}>
        ${msg('title', 'title')}
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="merchant">Merchant</label>
          <input class="form-input" id="merchant" name="merchant" value="${esc(v.merchant)}" required${err('merchant', 'merchant')}>
          ${msg('merchant', 'merchant')}
        </div>
        <div class="form-group">
          <label class="form-label" for="date">Date</label>
          <input class="form-input" id="date" name="date" type="date" value="${esc(v.date)}" required${err('date', 'date')}>
          ${msg('date', 'date')}
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="trip">Trip</label>
          <select class="form-select" id="trip" name="trip" required${err('trip', 'trip')}>
            <option value="">Choose a trip</option>${opts(Object.fromEntries(openTrips.map(t => [t.id, t.name])), v.trip)}
          </select>
          ${msg('trip', 'trip')}
        </div>
        <div class="form-group">
          <label class="form-label" for="category">Category</label>
          <select class="form-select" id="category" name="category">${opts(CATEGORIES, v.category)}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="amount">Amount</label>
          <input class="form-input" id="amount" name="amount" inputmode="decimal" value="${esc(v.amount)}" required${err('amount', 'amount')}>
          <p class="form-help" id="amount-help">As printed on the receipt.</p>
          ${msg('amount', 'amount')}
        </div>
        <div class="form-group">
          <label class="form-label" for="currency">Currency</label>
          <select class="form-select" id="currency" name="currency">${opts(Object.fromEntries(CURRENCIES.map(c => [c, c])), v.currency)}</select>
        </div>
      </div>
      <fieldset class="form-fieldset">
        <legend>Account</legend>
        <div class="form-options inline">
          ${Object.entries(ACCOUNTS).map(([k, t]) => `<label class="check"><input type="radio" name="account" value="${k}"${v.account === k ? ' checked' : ''}> ${t}</label>`).join('')}
        </div>
      </fieldset>
      <div class="form-group">
        <label class="form-label" for="notes">Notes</label>
        <textarea class="form-textarea" id="notes" name="notes">${esc(v.notes)}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label" for="receipt">Receipt</label>
        <input class="form-file" id="receipt" name="receipt" type="file" accept="image/*,application/pdf" aria-describedby="receipt-help">
        <p class="form-help" id="receipt-help">A photo or PDF, up to 10 MB.${x && x.receipt ? ` The current receipt, ${esc(x.receipt.name)}, is kept unless you choose another.` : ''}</p>
      </div>
      <div class="dialog-actions form-actions">
        <button class="btn btn-primary" type="submit">Save</button>
        ${editing ? '' : '<button class="btn" type="submit" name="then" value="another">Save and add another</button>'}
        <a class="btn" href="${editing ? 'expense.html?id=' + esc(editing) : esc(peek(LAST_LIST) || 'expenses.html')}">Cancel</a>
      </div>
    </form>`;
  }

  function renderExpenseEdit(values, errors) {
    const id = params.get('id');
    const x = id && expenseOf(id);
    if (id && !x) return missing('expense', 'expenses.html', 'Back to the expenses');
    if (x && !(x.state === 'draft' || x.state === 'submitted' || x.state === 'rejected')) {
      document.title = 'Edit expense, a PUDL Sample';
      return `<div class="app-head"><h1>Edit expense</h1></div>
      <div class="notice warn" role="status"><div class="notice-content">
        <p class="notice-title">This expense can no longer be changed</p>
        <p class="notice-body">It has been ${x.state === 'paid' ? 'paid back' : 'approved'}. <a href="expense.html?id=${x.id}">Back to the expense</a>.</p>
      </div></div>`;
    }
    document.title = (x ? 'Edit expense' : 'New expense') + ', a PUDL Sample';
    const tripParam = tripOf(params.get('trip')) ? params.get('trip') : (db.trips.find(t => t.status === 'open') || {}).id || '';
    const v = values || (x ? Object.assign({}, x, { amount: num(x.amount, x.currency).replace(/,/g, '') }) : {
      title: '', merchant: '', date: today(), trip: tripParam, category: 'meals', amount: '',
      currency: (tripOf(tripParam) || { currency: 'USD' }).currency, account: 'billable', notes: ''
    });
    return `<div class="app-head"><h1>${x ? 'Edit expense' : 'New expense'}</h1></div>` + expenseForm(v, errors || {}, x ? String(x.id) : '');
  }

  function validateExpense(v) {
    const e = {};
    if (!v.title) e.title = 'Say what the expense was for.';
    if (!v.merchant) e.merchant = 'Name the merchant, as on the receipt.';
    const trip = tripOf(v.trip);
    if (!trip) e.trip = 'Choose the trip the expense belongs to.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date) || isNaN(Date.parse(v.date))) e.date = 'Give the date on the receipt.';
    else if (trip && v.date > trip.end) e.date = 'The date is after the trip ended on ' + longDate(trip.end) + '.';
    else if (trip && v.date < addDays(trip.start, -30)) e.date = 'The date is more than 30 days before the trip began on ' + longDate(trip.start) + '.';
    const raw = String(v.amount).replace(/,/g, '').trim();
    const n = Number(raw);
    const places = v.currency === 'JPY' ? 0 : 2;
    if (!raw || !isFinite(n) || n <= 0) e.amount = 'The amount must be a number greater than zero.';
    else if ((raw.split('.')[1] || '').length > places) e.amount = places ? 'The amount can have at most two decimal places.' : 'Yen amounts are whole numbers.';
    else if (n > 1e9) e.amount = 'The amount is too large.';
    return e;
  }
  function addDays(iso, n) {
    const d = new Date(iso + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  /* === Trips ============================================================= */

  const tripExpenses = t => db.expenses.filter(x => x.trip === t.id);
  const tripTotal = t => tripExpenses(t).reduce((s, x) => s + usd(x), 0);
  const TRIP_SORTS = {
    name: { label: 'name', get: t => t.name.toLowerCase(), dir: 'asc', words: ['A to Z', 'Z to A'] },
    start: { label: 'dates', get: t => t.start, dir: 'desc', words: ['earliest first', 'latest first'] },
    count: { label: 'expenses', get: t => tripExpenses(t).length, dir: 'desc', words: ['fewest first', 'most first'] },
    total: { label: 'total', get: t => tripTotal(t), dir: 'desc', words: ['smallest first', 'largest first'] },
    status: { label: 'status', get: t => t.status, dir: 'asc', words: ['closed first', 'open first'] }
  };
  const tripBadge = t => t.status === 'open' ? '<span class="badge accent">open</span>' : '<span class="badge">closed</span>';

  function renderTrips() {
    document.title = 'Trips, a PUDL Sample';
    const key = TRIP_SORTS[params.get('sort')] ? params.get('sort') : 'start';
    const sort = { key, dir: params.get('dir') === 'asc' || params.get('dir') === 'desc' ? params.get('dir') : TRIP_SORTS[key].dir };
    const rows = db.trips.slice().sort((a, b) => {
      const va = TRIP_SORTS[key].get(a), vb = TRIP_SORTS[key].get(b);
      const c = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
      return (sort.dir === 'asc' ? c : -c) || b.start.localeCompare(a.start);
    });
    const link = (k, d) => href('trips.html', { sort: k === 'start' ? '' : k, dir: d === TRIP_SORTS[k].dir ? '' : d });
    const dirs = Object.fromEntries(Object.entries(TRIP_SORTS).map(([k, s]) => [k, s.dir]));
    const H = (k, label, cls) => sortHeader(k, label, sort, dirs, link, cls);
    const table = rows.length ? `
      <div class="data-table-wrap">
        <table class="data-table stack">
          <caption>Trips, sorted by ${TRIP_SORTS[key].label}, ${TRIP_SORTS[key].words[sort.dir === 'asc' ? 0 : 1]}</caption>
          <thead><tr>${H('name', 'Trip')}${H('start', 'Dates')}${H('status', 'Status')}${H('count', 'Expenses', 'num')}${H('total', 'Total (USD)', 'num')}</tr></thead>
          <tbody>${rows.map(t => `
            <tr>
              <td data-label="Trip"><a href="trip.html?id=${esc(t.id)}">${esc(t.name)}</a></td>
              <td data-label="Dates">${dateRange(t.start, t.end)}</td>
              <td data-label="Status">${tripBadge(t)}</td>
              <td class="num" data-label="Expenses">${tripExpenses(t).length}</td>
              <td class="num" data-label="Total (USD)">${num(tripTotal(t), 'USD')}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : `
      <div class="data-table-wrap"><div class="empty-state">
        <p class="empty-state-title">No trips yet</p>
        <p class="empty-state-body">A trip gathers the expenses of one journey, so they can be approved and reported together.</p>
        <div class="empty-state-actions"><a class="btn" href="trip-edit.html">New trip</a></div>
      </div></div>`;
    return `
    <div class="app-head">
      <h1>Trips</h1>
      <a class="btn btn-primary" href="trip-edit.html">New trip</a>
    </div>
    ${table}`;
  }

  function renderTrip() {
    const t = tripOf(params.get('id'));
    if (!t) return missing('trip', 'trips.html', 'Back to the trips');
    document.title = t.name + ', a PUDL Sample';
    const xs = tripExpenses(t).sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
    const sum = f => xs.filter(f).reduce((s, x) => s + usd(x), 0);
    const nights = Math.round((Date.parse(t.end) - Date.parse(t.start)) / 864e5);
    const stat = (label, value, note) => `<div class="card stat"><p class="card-subtitle">${label}</p><p class="stat-value">${value}</p><p class="card-desc">${note}</p></div>`;
    const waiting = xs.filter(x => x.state === 'submitted').length;
    const table = xs.length ? `
      <div class="data-table-wrap">
        <table class="data-table stack">
          <caption>The trip's expenses, by date</caption>
          <thead><tr><th>Expense</th><th>Date</th><th>State</th><th class="num">Amount</th></tr></thead>
          <tbody>${xs.map(x => `
            <tr>
              <td data-label="Expense"><a href="expense.html?id=${x.id}">${esc(x.title)}</a></td>
              <td data-label="Date"><time datetime="${x.date}">${x.date}</time></td>
              <td data-label="State">${badge(x.state)}${receiptBadge(x)}</td>
              <td class="num" data-label="Amount">${money(x.amount, x.currency)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : `
      <div class="data-table-wrap"><div class="empty-state">
        <p class="empty-state-title">No expenses on this trip yet</p>
        <p class="empty-state-body">Add each one as it happens, with a photo of its receipt.</p>
        ${t.status === 'open' ? `<div class="empty-state-actions"><a class="btn" href="expense-edit.html?trip=${esc(t.id)}">Add an expense</a></div>` : ''}
      </div></div>`;
    return `
    <p class="app-back"><a href="trips.html">Back to the trips</a></p>
    <div class="app-head">
      <h1>${esc(t.name)}</h1>
      ${t.status === 'open' ? `<a class="btn btn-primary" href="expense-edit.html?trip=${esc(t.id)}">Add an expense</a>` : ''}
      <a class="btn" href="trip-edit.html?id=${esc(t.id)}">Edit</a>
      <div class="menu">
        <button class="btn menu-btn" type="button" popovertarget="more">More</button>
        <div class="menu-panel" id="more" popover aria-label="More actions">
          <a class="menu-action" href="${esc(href('expenses.html', { trip: t.id }))}">Show in the expense list</a>
          <a class="menu-action" href="${esc(href('reports.html', { trip: t.id }))}">Report on this trip</a>
          <button class="menu-action" type="submit" form="trip-status">${t.status === 'open' ? 'Close the trip' : 'Reopen the trip'}</button>
          <hr class="menu-sep">
          <button class="menu-action danger" type="button" commandfor="delete" command="show-modal">Delete…</button>
        </div>
      </div>
    </div>
    <form id="trip-status" data-action="trip-status" hidden><input type="hidden" name="id" value="${esc(t.id)}"></form>
    <p class="record-meta">${tripBadge(t)} <span class="chip">${esc(t.currency)}</span>${t.customer ? ` <span class="chip">${esc(t.customer)}</span>` : ''}</p>
    <div class="app-stack">
      ${t.status === 'closed' ? '<div class="notice" role="status"><div class="notice-content"><p class="notice-body">This trip is closed, so no more expenses can be added to it. Reopen it from More to add one.</p></div></div>' : ''}
      <div class="card">
        <table class="kv-table">
          <tr><th>Destination</th><td>${esc(t.destination)}</td></tr>
          <tr><th>Dates</th><td>${dateRange(t.start, t.end)}, ${plural(nights, 'night')}</td></tr>
          <tr><th>Purpose</th><td>${esc(t.purpose) || '<span class="text-muted">None given</span>'}</td></tr>
          <tr><th>Billable to</th><td>${esc(t.customer) || '<span class="text-muted">Nobody; the trip is internal</span>'}</td></tr>
        </table>
      </div>
      <div class="stats">
        ${stat('Total', money(sum(() => true), 'USD'), plural(xs.length, 'expense'))}
        ${stat('Waiting for approval', money(sum(x => x.state === 'submitted'), 'USD'), plural(waiting, 'expense'))}
        ${stat('Approved, not yet paid', money(sum(x => x.state === 'approved'), 'USD'), plural(xs.filter(x => x.state === 'approved').length, 'expense'))}
        ${stat('Paid back', money(sum(x => x.state === 'paid'), 'USD'), plural(xs.filter(x => x.state === 'paid').length, 'expense'))}
      </div>
      ${table}
    </div>
    <dialog class="dialog" id="delete" aria-labelledby="delete-title">
      <h2 class="dialog-title" id="delete-title">Delete this trip?</h2>
      <p class="dialog-body">${esc(t.name)} will be removed${xs.length ? `, and with it ${count(xs.length, 'expense').toLowerCase()} and ${xs.length === 1 ? 'its receipt' : 'their receipts'}` : ''}. This cannot be undone.</p>
      <form class="dialog-actions" data-action="delete-trip">
        <input type="hidden" name="id" value="${esc(t.id)}">
        <button class="btn" type="button" commandfor="delete" command="close" autofocus>Keep it</button>
        <button class="btn btn-danger" type="submit">Delete the trip</button>
      </form>
    </dialog>`;
  }

  function renderTripEdit(values, errors) {
    const id = params.get('id');
    const t = id && tripOf(id);
    if (id && !t) return missing('trip', 'trips.html', 'Back to the trips');
    document.title = (t ? 'Edit trip' : 'New trip') + ', a PUDL Sample';
    errors = errors || {};
    const v = values || t || { name: '', destination: '', start: today(), end: addDays(today(), 3), purpose: '', customer: '', currency: 'USD' };
    const names = { name: 'the name', destination: 'the destination', start: 'the first day', end: 'the last day' };
    const wrong = Object.keys(errors);
    const err = (k) => errors[k] ? ` aria-invalid="true" aria-describedby="${k}-error"` : '';
    const msg = (k) => errors[k] ? `<p class="form-error" id="${k}-error">${esc(errors[k])}</p>` : '';
    const field = (k, label, extra) => `<div class="form-group">
        <label class="form-label" for="${k}">${label}</label>
        <input class="form-input" id="${k}" name="${k}" value="${esc(v[k])}"${extra || ''}${err(k)}>
        ${msg(k)}
      </div>`;
    return `<div class="app-head"><h1>${t ? 'Edit trip' : 'New trip'}</h1></div>
    ${wrong.length ? `<div class="notice danger" role="alert" tabindex="-1" id="form-notice" style="margin-bottom: var(--space-4);"><div class="notice-content">
      <p class="notice-title">The trip was not saved</p>
      <p class="notice-body">${wrong.length === 1 ? 'One field needs' : count(wrong.length, 'field') + ' need'} attention: ${wrong.map(k => `<a href="#${k}">${names[k]}</a>`).join(wrong.length === 2 ? ' and ' : ', ')}.</p>
    </div></div>` : ''}
    <form data-action="save-trip" novalidate>
      ${t ? `<input type="hidden" name="id" value="${esc(t.id)}">` : ''}
      <div class="form-row">${field('name', 'Name', ' required placeholder="Manila, October"')}${field('destination', 'Destination', ' required')}</div>
      <div class="form-row">${field('start', 'First day', ' type="date" required')}${field('end', 'Last day', ' type="date" required')}</div>
      ${field('purpose', 'Purpose')}
      <div class="form-row">
        ${field('customer', 'Billable to', ' aria-describedby="customer-help"').replace('</div>', '<p class="form-help" id="customer-help">The customer, if any of the trip is charged to one.</p></div>')}
        <div class="form-group">
          <label class="form-label" for="currency">Local currency</label>
          <select class="form-select" id="currency" name="currency">${CURRENCIES.map(c => `<option${c === v.currency ? ' selected' : ''}>${c}</option>`).join('')}</select>
        </div>
      </div>
      <div class="dialog-actions form-actions">
        <button class="btn btn-primary" type="submit">Save</button>
        <a class="btn" href="${t ? 'trip.html?id=' + esc(t.id) : 'trips.html'}">Cancel</a>
      </div>
    </form>`;
  }

  function validateTrip(v) {
    const e = {};
    if (!v.name) e.name = 'Give the trip a name, such as the place and the month.';
    else if (db.trips.some(t => t.name.toLowerCase() === v.name.toLowerCase() && t.id !== v.id)) e.name = 'Another trip already has this name.';
    if (!v.destination) e.destination = 'Say where the trip goes.';
    const ok = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
    if (!ok(v.start)) e.start = 'Give the day the trip begins.';
    if (!ok(v.end)) e.end = 'Give the day the trip ends.';
    else if (ok(v.start) && v.end < v.start) e.end = 'The trip cannot end before it begins.';
    return e;
  }

  /* === Reports =========================================================== */

  function renderReports() {
    const trip = tripOf(params.get('trip'));
    document.title = (trip ? trip.name + ' report' : 'Reports') + ', a PUDL Sample';
    const xs = db.expenses.filter(x => !trip || x.trip === trip.id);
    const sum = list => list.reduce((s, x) => s + usd(x), 0);
    const total = sum(xs);
    const stat = (label, list, note) => `<div class="card stat"><p class="card-subtitle">${label}</p><p class="stat-value">${money(sum(list), 'USD')}</p><p class="card-desc">${note || plural(list.length, 'expense')}</p></div>`;
    const breakdown = (caption, head, groups) => {
      const rows = groups.map(([label, list]) => [label, list, sum(list)]).filter(r => r[1].length).sort((a, b) => b[2] - a[2]);
      return `<div class="data-table-wrap"><table class="data-table stack">
        <caption>${caption}</caption>
        <thead><tr><th>${head}</th><th class="num">Expenses</th><th class="num">Amount (USD)</th><th class="share-col">Share</th></tr></thead>
        <tbody>${rows.map(([label, list, amount]) => {
          const pct = total ? Math.round(amount / total * 100) : 0;
          return `<tr><td data-label="${head}">${label}</td><td class="num" data-label="Expenses">${list.length}</td>
            <td class="num" data-label="Amount (USD)">${num(amount, 'USD')}</td>
            <td data-label="Share"><span class="share"><span class="share-bar" style="width: ${Math.max(pct, 1)}%"></span><span class="share-pct">${pct}%</span></span></td></tr>`;
        }).join('')}</tbody>
      </table></div>`;
    };
    const by = (map, field) => Object.entries(map).map(([k, label]) => [label, xs.filter(x => x[field] === k)]);
    const menu = filterMenu('report-trip', trip ? 'Trip: ' + trip.name : 'Trip: all', trip ? trip.id : '',
      [['', 'All trips']].concat(db.trips.map(t => [t.id, t.name])), v => href('reports.html', { trip: v }), '');
    const body = xs.length ? `
      <div class="stats">
        ${stat('Everything claimed', xs)}
        ${stat('Billable to customers', xs.filter(x => x.account === 'billable'))}
        ${stat('Waiting for approval', xs.filter(x => x.state === 'submitted'))}
        ${stat('Paid back', xs.filter(x => x.state === 'paid'))}
      </div>
      ${breakdown('By category', 'Category', by(CATEGORIES, 'category'))}
      ${breakdown('By account', 'Account', by(ACCOUNTS, 'account'))}
      ${breakdown('By state', 'State', STATE_ORDER.map(s => [badge(s), xs.filter(x => x.state === s)]))}
      ${trip ? '' : breakdown('By trip', 'Trip', db.trips.map(t => [`<a href="${esc(href('reports.html', { trip: t.id }))}">${esc(t.name)}</a>`, xs.filter(x => x.trip === t.id)]))}` : `
      <div class="data-table-wrap"><div class="empty-state">
        <p class="empty-state-title">Nothing to report yet</p>
        <p class="empty-state-body">${trip ? 'This trip has no expenses.' : 'There are no expenses.'} A report sums them by category, account and state once there are some.</p>
        <div class="empty-state-actions"><a class="btn" href="${esc(href('expense-edit.html', { trip: trip && trip.id }))}">New expense</a></div>
      </div></div>`;
    return `
    <div class="app-head">
      <h1>${trip ? esc(trip.name) : 'All trips'}</h1>
      ${menu}
      <button class="btn" type="button" data-download-csv${xs.length ? '' : ' disabled'}>Download CSV</button>
      <button class="btn" type="button" onclick="window.print()">Print</button>
    </div>
    <div class="app-stack">
      <div class="notice" role="note"><div class="notice-content">
        <p class="notice-body">Amounts in other currencies are shown in US dollars at fixed sample rates: ${CURRENCIES.filter(c => c !== 'USD').map(c => `1 ${c} = ${RATES[c]} USD`).join(', ')}.</p>
      </div></div>
      ${body}
    </div>`;
  }

  function csv() {
    const trip = tripOf(params.get('trip'));
    const xs = db.expenses.filter(x => !trip || x.trip === trip.id).sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
    const cell = v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
    const lines = [['id', 'date', 'description', 'merchant', 'trip', 'category', 'account', 'state', 'currency', 'amount', 'amount_usd', 'receipt']]
      .concat(xs.map(x => [x.id, x.date, x.title, x.merchant, tripName(x.trip), CATEGORIES[x.category], ACCOUNTS[x.account], x.state,
        x.currency, x.amount, usd(x).toFixed(2), x.receipt ? x.receipt.name : '']));
    const blob = new Blob([lines.map(l => l.map(cell).join(',')).join('\r\n') + '\r\n'], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'expenses-' + (trip ? trip.id : 'all-trips') + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* === Handling forms, as the server would ============================== */

  function readFile(file) {
    return new Promise(resolve => {
      if (!file || !file.name) { resolve(null); return; }
      const r = { name: file.name, size: file.size, type: file.type };
      /* A small picture is kept so that the Receipt tab can show it; larger
         files and PDFs keep only their name, as localStorage is small. */
      if (!/^image\//.test(file.type) || file.size > 400 * 1024) { resolve(r); return; }
      const reader = new FileReader();
      reader.onload = () => { r.data = reader.result; resolve(r); };
      reader.onerror = () => resolve(r);
      reader.readAsDataURL(file);
    });
  }

  function log(x, text) { x.history.unshift({ at: nowIso(), text }); }

  const MOVES = {
    submitted: { from: ['draft'], text: x => x.receipt ? 'Submitted with its receipt.' : 'Submitted; the receipt is to follow.', flash: 'Expense submitted for approval.' },
    approved: { from: ['submitted'], text: () => 'Approved.', flash: 'Expense approved.' },
    paid: { from: ['approved'], text: () => 'Paid back.', flash: 'Expense marked as paid back. It is now under Paid.' },
    draft: { from: ['submitted', 'rejected'], text: x => x.state === 'submitted' ? 'Withdrawn to draft.' : 'Returned to draft.', flash: 'Expense returned to draft.' }
  };

  const ACTIONS = {
    async 'save-expense'(form, data, submitter) {
      const id = data.get('id');
      const x = id && expenseOf(id);
      const v = {
        title: data.get('title').trim(), merchant: data.get('merchant').trim(), date: data.get('date'),
        trip: data.get('trip'), category: data.get('category'), amount: data.get('amount').trim(),
        currency: data.get('currency'), account: data.get('account') || 'billable', notes: data.get('notes').trim()
      };
      const errors = validateExpense(v);
      if (Object.keys(errors).length) return { render: renderExpenseEdit(v, errors) };
      const receipt = await readFile(data.get('receipt'));
      const fields = Object.assign({}, v, { amount: Number(v.amount.replace(/,/g, '')) });
      if (x) {
        const was = x.state;
        Object.assign(x, fields);
        if (receipt) x.receipt = receipt;
        if (was !== 'draft') { x.state = 'draft'; log(x, 'Edited, and returned to draft.'); } else log(x, 'Edited.');
        if (receipt) log(x, 'Receipt attached: ' + receipt.name + '.');
        store();
        return { go: 'expense.html?id=' + x.id, flash: 'Expense saved.' };
      }
      const n = Object.assign({ id: db.nextId++, state: 'draft', receipt, reason: '', history: [] }, fields);
      log(n, 'Created' + (receipt ? ' with its receipt.' : '.'));
      db.expenses.push(n);
      store();
      if (submitter && submitter.value === 'another') return { go: href('expense-edit.html', { trip: n.trip }), flash: 'Expense saved. Ready for the next one.' };
      return { go: 'expense.html?id=' + n.id, flash: 'Expense saved.' };
    },
    move(form, data, submitter) {
      const x = expenseOf(data.get('id'));
      const to = submitter && submitter.value;
      const m = MOVES[to];
      if (!x || !m || !m.from.includes(x.state)) return { go: location.href, flash: 'That change could not be made; the expense has moved on.', kind: 'warn' };
      log(x, m.text(x));
      x.state = to;
      if (to === 'draft') x.reason = '';
      store();
      return { go: 'expense.html?id=' + x.id, flash: m.flash };
    },
    reject(form, data) {
      const x = expenseOf(data.get('id'));
      const reason = (data.get('reason') || '').trim();
      if (!reason) { form.querySelector('textarea').focus(); return null; }
      if (!x || x.state !== 'submitted') return { go: location.href };
      x.state = 'rejected';
      x.reason = reason;
      log(x, 'Rejected: ' + reason);
      store();
      return { go: 'expense.html?id=' + x.id, flash: 'Expense rejected.' };
    },
    delete(form, data) {
      const x = expenseOf(data.get('id'));
      if (x) { db.expenses.splice(db.expenses.indexOf(x), 1); store(); }
      return { go: peek(LAST_LIST) || 'expenses.html', flash: 'Expense deleted.' };
    },
    duplicate(form, data) {
      const x = expenseOf(data.get('id'));
      if (!x) return { go: 'expenses.html' };
      const n = Object.assign({}, x, { id: db.nextId++, title: x.title + ' (copy)', state: 'draft', receipt: null, reason: '',
        history: [] });
      log(n, 'Created as a copy of “' + x.title + '”.');
      db.expenses.push(n);
      store();
      return { go: 'expense-edit.html?id=' + n.id, flash: 'A copy was made. Change what differs, and save.' };
    },
    async receipt(form, data, submitter) {
      const x = expenseOf(data.get('id'));
      if (!x) return { go: 'expenses.html' };
      if (submitter && submitter.value === 'remove') {
        log(x, 'Receipt removed: ' + x.receipt.name + '.');
        x.receipt = null;
        store();
        return { go: 'expense.html?id=' + x.id + '#receipt', flash: 'Receipt removed.' };
      }
      const r = await readFile(data.get('receipt'));
      if (!r) { form.querySelector('input[type="file"]').focus(); return null; }
      x.receipt = r;
      log(x, 'Receipt attached: ' + r.name + '.');
      store();
      return { go: 'expense.html?id=' + x.id + '#receipt', flash: 'Receipt attached.' };
    },
    bulk(form, data, submitter) {
      const ids = data.getAll('id');
      const op = submitter && submitter.value;
      const xs = ids.map(expenseOf).filter(Boolean);
      if (!xs.length) return null;
      if (op === 'delete') {
        db.expenses = db.expenses.filter(x => !xs.includes(x));
        store();
        return { go: location.href, flash: plural(xs.length, 'expense') + ' deleted.' };
      }
      const drafts = xs.filter(x => x.state === 'draft');
      drafts.forEach(x => { log(x, MOVES.submitted.text(x)); x.state = 'submitted'; });
      store();
      const skipped = xs.length - drafts.length;
      return {
        go: location.href,
        flash: (drafts.length ? plural(drafts.length, 'expense') + ' submitted for approval.' : 'Nothing was submitted.') +
          (skipped ? ' ' + plural(skipped, 'expense was', 'expenses were') + ' not a draft, so ' + (skipped === 1 ? 'it was' : 'they were') + ' left as ' + (skipped === 1 ? 'it was' : 'they were') + '.' : ''),
        kind: drafts.length ? 'positive' : 'warn'
      };
    },
    'save-trip'(form, data) {
      const id = data.get('id');
      const t = id && tripOf(id);
      const v = {
        id: id || '', name: data.get('name').trim(), destination: data.get('destination').trim(), start: data.get('start'), end: data.get('end'),
        purpose: data.get('purpose').trim(), customer: data.get('customer').trim(), currency: data.get('currency')
      };
      const errors = validateTrip(v);
      if (Object.keys(errors).length) return { render: renderTripEdit(v, errors) };
      if (t) {
        Object.assign(t, v, { id: t.id });
        store();
        return { go: 'trip.html?id=' + encodeURIComponent(t.id), flash: 'Trip saved.' };
      }
      let slug = v.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'trip';
      for (let i = 2; tripOf(slug); i++) slug = slug.replace(/-\d+$/, '') + '-' + i;
      db.trips.push(Object.assign({}, v, { id: slug, status: 'open' }));
      store();
      return { go: 'trip.html?id=' + encodeURIComponent(slug), flash: 'Trip created. Its expenses go here.' };
    },
    'trip-status'(form, data) {
      const t = tripOf(data.get('id'));
      if (!t) return { go: 'trips.html' };
      t.status = t.status === 'open' ? 'closed' : 'open';
      store();
      return { go: 'trip.html?id=' + encodeURIComponent(t.id), flash: t.status === 'open' ? 'Trip reopened.' : 'Trip closed.' };
    },
    'delete-trip'(form, data) {
      const t = tripOf(data.get('id'));
      if (t) {
        db.trips.splice(db.trips.indexOf(t), 1);
        db.expenses = db.expenses.filter(x => x.trip !== t.id);
        store();
      }
      return { go: 'trips.html', flash: 'Trip deleted.' };
    },
    reset() {
      try { localStorage.removeItem(KEY); } catch (err) { /* nothing kept */ }
      Object.assign(db, seed());
      return { go: 'expenses.html', flash: 'The sample data is back as it started.' };
    }
  };

  document.addEventListener('submit', async e => {
    const form = e.target;
    const action = form.getAttribute && ACTIONS[form.getAttribute('data-action')];
    if (!action) return;
    e.preventDefault();
    const submitter = e.submitter || null;
    const data = new FormData(form, submitter);
    const answer = await action(form, data, submitter);
    if (!answer) return;
    if (answer.render) {
      main.innerHTML = answer.render;
      const notice = document.getElementById('form-notice');
      if (notice) notice.focus();
      return;
    }
    if (answer.flash) session(FLASH, JSON.stringify({ text: answer.flash, kind: answer.kind || 'positive' }));
    /* An answer that names the page already in view reloads it, since
       going to its own address, or a fragment of it, would not. */
    const to = new URL(answer.go, location.href);
    if (to.pathname === location.pathname && to.search === location.search) {
      history.replaceState(history.state, '', to.href);
      location.reload();
    } else location.assign(to.href);
  });

  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('[data-copy-link], [data-download-csv]');
    if (!t) return;
    if (t.hasAttribute('data-download-csv')) { csv(); return; }
    const done = () => window.pudlToast && pudlToast('Link copied.', { kind: 'positive' });
    const url = location.href.split('#')[0];
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, () => window.pudlToast && pudlToast('The link could not be copied: ' + url, { kind: 'warn' }));
  });

  /* === Rendering the page ================================================ */

  const RENDER = {
    expenses: renderExpenses, expense: renderExpense, 'expense-edit': () => renderExpenseEdit(),
    trips: renderTrips, trip: renderTrip, 'trip-edit': () => renderTripEdit(), reports: renderReports
  };

  if (main && RENDER[main.dataset.page]) {
    main.innerHTML = RENDER[main.dataset.page]();
    wireSelection();
  }

  /* What the server would say after a redirect: the toast it would render,
     which pudl-toast.js then makes heard. */
  const flash = session(FLASH);
  const region = document.querySelector('.toast-region');
  if (flash && region) {
    try {
      const f = JSON.parse(flash);
      region.innerHTML = `<div class="toast ${esc(f.kind)}"><p class="toast-text">${esc(f.text)}</p><button class="toast-close" type="button" aria-label="Dismiss"></button></div>`;
    } catch (err) { /* a malformed flash says nothing */ }
  }

  /* The foot of every page: where the data lives, and how to start over. */
  const foot = document.querySelector('.sample-foot');
  if (foot) {
    foot.innerHTML = `<p class="sample-note">${persistent
      ? 'A sample: its data lives in this browser, and nothing leaves it.'
      : 'A sample: this browser is not keeping its data, so changes last only until you leave the page.'}
      <button class="link" type="button" commandfor="reset" command="show-modal">Reset the sample data</button></p>
    <dialog class="dialog" id="reset" aria-labelledby="reset-title">
      <h2 class="dialog-title" id="reset-title">Reset the sample data?</h2>
      <p class="dialog-body">Every trip and expense goes back to how the sample started, and anything you added or changed is lost.</p>
      <form class="dialog-actions" data-action="reset">
        <button class="btn" type="button" commandfor="reset" command="close" autofocus>Keep my changes</button>
        <button class="btn btn-danger" type="submit">Reset</button>
      </form>
    </dialog>`;
  }
})();
