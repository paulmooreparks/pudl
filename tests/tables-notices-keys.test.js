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
  const watch = p => p.on('pageerror', e => errors.push(e.message));
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  watch(p);
  await p.goto(ROOT + '/reference.html');

  /* === Data table ======================================================== */
  const dt = await p.evaluate(() => {
    const t = document.querySelector('#table ~ .demo .data-table');
    const g = (el, ps) => getComputedStyle(el, ps || null);
    const sorted = t.querySelector('th[aria-sort="descending"] > a');
    const unsorted = t.querySelector('th[aria-sort="none"] > a');
    const num = t.querySelector('td.num');
    const sel = t.querySelector('tr:has(input:checked)');
    const plain = t.querySelectorAll('tbody tr')[1];
    const empty = document.querySelector('.data-table-empty td');
    return {
      sortedBg: g(sorted).backgroundImage, sortedGlyph: g(sorted, '::after').maskImage, sortedWeight: g(sorted).fontWeight,
      unsortedGlyph: g(unsorted, '::after').maskImage, numAlign: g(num).textAlign,
      selBg: g(sel).backgroundColor, selEdge: g(sel).boxShadow, plainBg: g(plain).backgroundColor,
      emptyAlign: g(empty).textAlign, sticky: g(t.querySelector('thead th')).position
    };
  });
  check('table: a sortable header is raised', /gradient/.test(dt.sortedBg), dt.sortedBg);
  check('table: the sorted column shows its direction', /3.5 6L8 11.5/.test(decodeURIComponent(dt.sortedGlyph)) && dt.sortedWeight === '700');
  check('table: an unsorted column shows both arrows', /4.5 6.5L8 3/.test(decodeURIComponent(dt.unsortedGlyph)));
  check('table: numbers align to the end', dt.numAlign === 'end', dt.numAlign);
  check('table: a selected row is tinted and edged', dt.selBg !== dt.plainBg && /inset/.test(dt.selEdge), JSON.stringify(dt).slice(0, 200));
  check('table: the header stays in view', dt.sticky === 'sticky');
  check('table: the empty row is centred', dt.emptyAlign === 'center');
  const stack = await p.evaluate(() => {
    const wrap = document.querySelector('#table ~ .demo .data-table-wrap');
    wrap.style.width = '380px';
    const td = wrap.querySelector('tbody td[data-label="Expense"]');
    const r = { display: getComputedStyle(td).display, label: getComputedStyle(td, '::before').content,
                head: getComputedStyle(wrap.querySelector('thead')).position };
    wrap.style.width = '';
    return r;
  });
  check('table: stacked when narrow, with labels', stack.display === 'flex' && (stack.label === '"Expense"' || stack.label === 'attr(data-label)') && stack.head === 'absolute', JSON.stringify(stack));
  await p.evaluate(() => document.getElementById('table').scrollIntoView());
  await p.screenshot({ path: out('table17.png'), clip: { x: 0, y: 0, width: 1280, height: 560 } });

  /* === Notices =========================================================== */
  const nt = await p.evaluate(() => [...document.querySelectorAll('#notices ~ .demo .notice')].map(n =>
    decodeURIComponent(getComputedStyle(n, '::before').maskImage)));
  check('notices: each kind has its own glyph', new Set(nt).size === 4, String(new Set(nt).size));
  await p.click('.notice.positive .notice-close');
  check('notices: the dismiss button hides the notice', await p.evaluate(() => document.querySelector('.notice.positive').hidden));
  await p.evaluate(() => document.getElementById('notices').scrollIntoView());
  await p.screenshot({ path: out('notices17.png'), clip: { x: 0, y: 0, width: 1280, height: 520 } });

  /* === Toasts ============================================================ */
  await p.evaluate(() => pudlToast('Quick one', { kind: 'positive', ms: 600 }));
  const reg = await p.evaluate(() => { const r = document.querySelector('.toast-region'); return [r.getAttribute('role'), r.getAttribute('aria-live'), r.children.length]; });
  check('toasts: a script toast lands in a live region', reg[0] === 'status' && reg[1] === 'polite' && reg[2] === 1, JSON.stringify(reg));
  await p.waitForFunction(() => !document.querySelector('.toast'), null, { timeout: 3000 });
  check('toasts: it leaves by itself', true);
  await p.evaluate(() => pudlToast('Hold me', { ms: 700 }));
  await p.hover('.toast');
  await p.waitForTimeout(1200);
  check('toasts: it waits while the pointer is on it', await p.locator('.toast').count() === 1);
  await p.mouse.move(10, 10);
  await p.waitForFunction(() => !document.querySelector('.toast'), null, { timeout: 3000 });
  check('toasts: and leaves once the pointer does', true);
  await p.evaluate(() => pudlToast('Stays', { sticky: true }));
  await p.waitForTimeout(700);
  await p.click('.toast .toast-close');
  await p.waitForFunction(() => !document.querySelector('.toast'), null, { timeout: 2000 });
  check('toasts: a sticky toast stays until dismissed', true);

  const s = await b.newPage();
  watch(s);
  await s.goto(ROOT + '/reference.html');
  await s.setContent(`<!doctype html><html><head>
    <link rel="stylesheet" href="${ROOT}/dist/pudl.css"><script src="${ROOT}/dist/pudl-toast.js" defer></script></head>
    <body><div class="toast-region" role="status" aria-live="polite"><div class="toast positive" data-toast-ms="800"><p class="toast-text">Expense saved.</p></div></div>
    <script>
      window.toastLifecycle = [];
      const region = document.querySelector('.toast-region');
      const toast = region.querySelector('.toast');
      const observer = new MutationObserver(records => records.forEach(record => {
        if (Array.from(record.removedNodes).includes(toast)) toastLifecycle.push('removed');
        if (Array.from(record.addedNodes).includes(toast)) toastLifecycle.push('added');
      }));
      observer.observe(region, { childList: true });
    </script></body></html>`);
  /* Observe the lifecycle before the deferred script runs. A busy browser
     may finish re-inserting the toast before a timed assertion reaches it. */
  await s.waitForFunction(() => toastLifecycle.includes('added'), null, { timeout: 3000 });
  const lifecycle = await s.evaluate(() => toastLifecycle.join(','));
  check('toasts: a server toast is re-inserted after load so it is announced', lifecycle === 'removed,added', lifecycle);
  await s.waitForFunction(() => !document.querySelector('.toast'), null, { timeout: 3000 });
  check('toasts: and then leaves by itself', true);

  /* === Menus by key ====================================================== */
  await p.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); });
  await p.keyboard.press('/');
  await p.waitForFunction(() => document.getElementById('demo-launcher').matches(':popover-open'));
  check('key: / opens the launcher with focus in its filter', await p.evaluate(() => document.activeElement.matches('#demo-launcher .md-filter')));
  check('key: the launcher button announces the key', (await p.getAttribute('[popovertarget="demo-launcher"]', 'aria-keyshortcuts')) === '/');
  await p.keyboard.type('/');
  check('key: inside the filter the key types', (await p.inputValue('#demo-launcher .md-filter')) === '/');
  await p.keyboard.press('Escape');
  await p.evaluate(() => { const m = document.getElementById('demo-launcher'); if (m.matches(':popover-open')) m.hidePopover(); });
  await p.focus('.form-input');
  await p.keyboard.press('/');
  check('key: in a text field the key types and nothing opens', !(await p.evaluate(() => document.getElementById('demo-launcher').matches(':popover-open'))) &&
    (await p.inputValue('.form-input')) === '/');

  const g = await b.newPage({ viewport: { width: 1200, height: 800 } });
  watch(g);
  await g.goto(ROOT + '/reference.html');
  await g.setContent(`<!doctype html><html><head>
    <link rel="stylesheet" href="${ROOT}/dist/pudl.css"><script src="${ROOT}/dist/pudl-menu.js" defer></script></head>
    <body><p>Page</p>
    <nav class="menu-panel" id="go" popover data-menu-key="g" aria-label="Go to">
      <form action="${ROOT}/reference.html" method="get"><input class="md-filter" type="search" name="go" aria-label="Go to"></form>
      <div class="md-row"><a class="md-item" href="#one">Alpha</a></div>
      <div class="md-row"><a class="md-item" href="#two">Beta</a></div>
    </nav></body></html>`);
  await g.waitForTimeout(100);
  await g.keyboard.press('g');
  await g.waitForFunction(() => document.getElementById('go').matches(':popover-open'));
  const pal = await g.evaluate(() => { const r = document.getElementById('go').getBoundingClientRect(); return { top: Math.round(r.top), mid: Math.round(r.left + r.width / 2) }; });
  check('palette: a panel with no button opens near the top centre', Math.abs(pal.top - 120) <= 2 && Math.abs(pal.mid - 600) <= 2, JSON.stringify(pal));
  await g.keyboard.type('bet');
  await g.keyboard.press('Enter');
  await g.waitForFunction(() => location.hash === '#two');
  check('palette: Enter follows the match', true);
  await g.waitForFunction(() => !document.getElementById('go').matches(':popover-open'));
  await g.evaluate(() => document.activeElement && document.activeElement.blur());
  await g.keyboard.press('g');
  await g.waitForFunction(() => document.getElementById('go').matches(':popover-open') &&
    document.activeElement && document.activeElement.matches('#go .md-filter'));
  await g.keyboard.type('some-article-slug');
  await Promise.all([g.waitForURL(/go=some-article-slug/, { waitUntil: 'commit' }), g.keyboard.press('Enter')]);
  check('palette: with no match, Enter submits the form to the server', /reference\.html\?go=some-article-slug/.test(g.url()), g.url());

  /* === Forced colours ==================================================== */
  const f = await b.newPage();
  watch(f);
  await f.emulateMedia({ forcedColors: 'active' });
  await f.goto(ROOT + '/reference.html');
  const fc = await f.evaluate(() => getComputedStyle(document.querySelector('.notice.danger'), '::before').backgroundColor);
  check('forced colours: notice glyphs stay painted', fc !== 'rgba(0, 0, 0, 0)', fc);

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
