const { launch, ROOT, out, engine } = require('./lib');
const path = require('path');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];
  const watch = p => { p.on('pageerror', e => errors.push(e.message)); };
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  watch(p);
  await p.goto(ROOT + '/reference.html');
  const token = n => p.evaluate(n => { const s = document.createElement('span'); s.style.color = 'var(' + n + ')'; document.body.append(s); const c = getComputedStyle(s).color; s.remove(); return c; }, n);

  /* === Forms ============================================================= */
  const fm = await p.evaluate(() => {
    const a = document.getElementById('f-amount');
    const lbl = document.querySelector('label[for="f-amount"]');
    const file = document.getElementById('f-receipt');
    return { border: getComputedStyle(a).borderTopColor, star: getComputedStyle(lbl, '::after').content,
             help: getComputedStyle(document.getElementById('f-amount-help')).color,
             fileBtn: getComputedStyle(file, '::file-selector-button').backgroundImage };
  });
  check('forms: an invalid field has a danger border', fm.border === await token('--danger'), fm.border);
  check('forms: a required field\'s label carries an asterisk', /\*/.test(fm.star), fm.star);
  check('forms: help text is muted', fm.help === await token('--text-muted'));
  /* WebKit draws the button raised but does not report computed styles for
     ::file-selector-button, so there the check cannot read it. */
  if (engine !== 'webkit') check('forms: a file field\'s button is raised', /gradient/.test(fm.fileBtn), fm.fileBtn);
  await p.focus('#f-amount');
  const ring = await p.evaluate(() => getComputedStyle(document.getElementById('f-amount')).boxShadow);
  check('forms: an invalid field focuses with a danger ring', ring.split('0px 0px 0px 3px').length > 1, ring);

  /* === Tabs within a page ================================================ */
  const vis = () => p.evaluate(() => ['panel-details', 'panel-receipt', 'panel-history'].map(id => !document.getElementById(id).hidden));
  check('tabs: one panel shows at a time', JSON.stringify(await vis()) === '[true,false,false]', JSON.stringify(await vis()));
  check('tabs: one tab stop for the list', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('#panels ~ .demo [role="tab"]')].map(t => t.tabIndex))) === '[0,-1,-1]');
  await p.click('#tab-receipt');
  check('tabs: pressing a tab shows its panel and records it', JSON.stringify(await vis()) === '[false,true,false]' &&
    (await p.evaluate(() => location.hash)) === '#panel-receipt');
  await p.keyboard.press('ArrowRight');
  check('tabs: arrow keys move and choose', JSON.stringify(await vis()) === '[false,false,true]' &&
    (await p.evaluate(() => document.activeElement.id)) === 'tab-history');
  await p.keyboard.press('Home');
  check('tabs: Home goes to the first', JSON.stringify(await vis()) === '[true,false,false]');
  const selBg = await p.evaluate(() => [getComputedStyle(document.getElementById('tab-details')).backgroundColor, getComputedStyle(document.getElementById('tab-receipt')).backgroundImage]);
  check('tabs: the chosen tab is flat, the others raised', /gradient/.test(selBg[1]) && selBg[0] !== 'rgba(0, 0, 0, 0)', JSON.stringify(selBg));
  await p.goto(ROOT + '/reference.html#panel-history');
  await p.waitForFunction(() => document.querySelector('.tabs.tabs-ready'));
  check('tabs: a link to a panel opens it', JSON.stringify(await vis()) === '[false,false,true]');
  const noJs = await b.newPage();
  watch(noJs);
  await noJs.goto(ROOT + '/reference.html');
  await noJs.setContent(`<!doctype html><html><head><link rel="stylesheet" href="${ROOT}/dist/pudl.css"></head><body>
    <div class="tabs"><div class="tablist" role="tablist"><button role="tab" aria-controls="a" aria-selected="true">A</button><button role="tab" aria-controls="b">B</button></div>
    <section role="tabpanel" id="a">One</section><section role="tabpanel" id="b">Two</section></div></body></html>`);
  const nj = await noJs.evaluate(() => [getComputedStyle(document.querySelector('.tablist')).display, !document.getElementById('b').hidden && getComputedStyle(document.getElementById('b')).display]);
  check('tabs: without the script every panel shows and the list hides', nj[0] === 'none' && nj[1] === 'block', JSON.stringify(nj));

  /* === Empty, loading, pagination ======================================== */
  const misc = await p.evaluate(() => ({
    empty: getComputedStyle(document.querySelector('.empty-state'), '::before').maskImage,
    spin: getComputedStyle(document.querySelector('.spinner')).animationName,
    role: document.querySelector('.loading').getAttribute('role'),
    cur: getComputedStyle(document.querySelector('.page-link[aria-current]')).backgroundImage,
    other: getComputedStyle(document.querySelector('.page-link:not([aria-current]):not([rel])')).backgroundImage,
    prev: getComputedStyle(document.querySelector('.page-link[rel="prev"]'), '::before').maskImage,
    next: getComputedStyle(document.querySelector('.page-link[rel="next"]'), '::after').transform
  }));
  check('empty: the empty state draws its glyph', /svg/.test(misc.empty));
  check('loading: the spinner spins inside a status', misc.spin === 'pudl-spin' && misc.role === 'status');
  check('pages: the current page is pressed in, the others raised', misc.cur === 'none' && /gradient/.test(misc.other), JSON.stringify(misc).slice(0, 160));
  check('pages: previous and next carry mirrored glyphs', /svg/.test(misc.prev) && /matrix\(-1/.test(misc.next), misc.next);

  /* === Tooltips ========================================================== */
  await p.evaluate(() => document.querySelector('.icon-btn[aria-label="Drag to reorder"]').scrollIntoView({ block: 'center' }));
  await p.hover('.icon-btn[aria-label="Drag to reorder"]');
  await p.waitForSelector('.tooltip:popover-open', { timeout: 2000 });
  const tt = await p.evaluate(() => {
    const t = document.querySelector('.tooltip'), btn = document.querySelector('.icon-btn[aria-label="Drag to reorder"]');
    return { text: t.textContent, role: t.getAttribute('role'), above: t.getBoundingClientRect().bottom <= btn.getBoundingClientRect().top };
  });
  check('tooltips: hovering an icon button names it, above it', tt.text === 'Drag to reorder' && tt.role === 'tooltip' && tt.above, JSON.stringify(tt));
  const tb = await p.locator('.tooltip').boundingBox();
  await p.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 3 });
  await p.waitForTimeout(300);
  check('tooltips: it stays while the pointer is on it', await p.evaluate(() => document.querySelector('.tooltip').matches(':popover-open')));
  await p.keyboard.press('Escape');
  check('tooltips: Escape dismisses it', !(await p.evaluate(() => document.querySelector('.tooltip').matches(':popover-open'))));
  await p.mouse.move(5, 5);
  /* Focus the button before it, then reach it by keyboard. */
  await p.evaluate(() => document.querySelector('.icon-btn[aria-label="Drag to reorder"]').focus());
  await p.keyboard.press('Tab');
  await p.waitForFunction(() => document.activeElement && document.activeElement.matches('.icon-btn.danger'));
  const kf = await p.evaluate(() => ({ open: document.querySelector('.tooltip').matches(':popover-open'), text: document.querySelector('.tooltip').textContent }));
  check('tooltips: keyboard focus shows it at once', kf.open && kf.text === 'Remove', JSON.stringify(kf));

  /* === Forced colours ==================================================== */
  const f = await b.newPage();
  watch(f);
  await f.emulateMedia({ forcedColors: 'active' });
  await f.goto(ROOT + '/reference.html');
  await f.waitForFunction(() => document.querySelector('.tabs.tabs-ready'));
  const fc = await f.evaluate(() => {
    const probe = document.createElement('span'); probe.style.color = 'Highlight'; document.body.append(probe);
    const hl = getComputedStyle(probe).color; probe.remove();
    return { hl, tab: getComputedStyle(document.getElementById('tab-details')).backgroundColor,
             page: getComputedStyle(document.querySelector('.page-link[aria-current]')).backgroundColor };
  });
  check('forced colours: the chosen tab and current page take the highlight', fc.tab === fc.hl && fc.page === fc.hl, JSON.stringify(fc));

  /* === The expense sample ================================================ */
  const s = await b.newPage({ viewport: { width: 1280, height: 900 } });
  watch(s);
  await s.goto(ROOT + '/samples/expenses.html');
  await s.screenshot({ path: out('expenses18.png') });
  await s.click('.data-table a[href="expense.html"] >> nth=0');
  await s.waitForURL(/expense\.html/);
  await s.waitForFunction(() => document.querySelector('.tabs.tabs-ready'));
  await s.screenshot({ path: out('expense18.png') });
  await s.click('[commandfor="delete"][command="show-modal"]');
  check('sample: Delete asks in a modal dialog', await s.evaluate(() => document.getElementById('delete').matches(':modal')));
  await Promise.all([s.waitForURL(/expenses\.html\?deleted=1/), s.click('#delete button[type="submit"]')]);
  await s.waitForSelector('.toast', { timeout: 3000 });
  check('sample: deleting returns to the list with a toast', (await s.textContent('.toast .toast-text')) === 'Expense deleted.');
  await s.goto(ROOT + '/samples/expense.html#history');
  await s.waitForFunction(() => document.querySelector('.tabs.tabs-ready'));
  check('sample: #history opens the history panel', await s.evaluate(() => !document.getElementById('history').hidden && document.getElementById('details').hidden));
  await s.goto(ROOT + '/samples/expense-edit.html');
  await s.screenshot({ path: out('edit18.png'), fullPage: true });
  await Promise.all([s.waitForURL(/saved=1/), s.click('button[type="submit"].btn-primary')]);
  await s.waitForSelector('.toast', { timeout: 3000 });
  check('sample: saving returns to the list with a toast', (await s.textContent('.toast .toast-text')) === 'Expense saved.');
  await s.goto(ROOT + '/samples/expenses-archived.html');
  check('sample: the archive shows its empty state', await s.locator('.empty-state').isVisible());

  const ph = await b.newPage({ viewport: { width: 393, height: 851 }, isMobile: true });
  watch(ph);
  for (const pg of ['expenses.html', 'expense.html', 'expense-edit.html', 'expenses-archived.html']) {
    await ph.goto(ROOT + '/samples/' + pg);
    const over = await ph.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    check('phone: ' + pg + ' fits', !over);
  }
  await ph.goto(ROOT + '/samples/expenses.html');
  check('phone: the table stacks into cards', await ph.evaluate(() => getComputedStyle(document.querySelector('.data-table td')).display === 'flex'));
  await ph.screenshot({ path: out('expenses-phone18.png'), fullPage: true });

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
