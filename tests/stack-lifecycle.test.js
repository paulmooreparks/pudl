/* 0.96.5: a taskbar stack's list sizes to its longest title up to a cap,
   its state column is as wide as the widest badge and no wider, and a
   window with no execution state may give a lifecycle word, drawn as a
   plain badge in a stack row and the folded Window status. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined && !ok ? ' ' + JSON.stringify(detail) : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const p = await b.newPage({ viewport: { width: 1300, height: 800 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/tests/fixtures/taskbar-stacks.html');
  await p.waitForFunction(() => window.pudlWindows && document.querySelector('#all [data-win-stack="alpha"]'));
  await p.evaluate(() => {
    const w = k => document.querySelector('.win[data-win="' + k + '"]');
    pudlWindows.retitle('a1', 'A window whose title runs on for a good deal longer than the old list allowed');
    w('a1').setAttribute('data-win-state', 'working'); w('a1').setAttribute('data-win-state-label', 'Background work');
    w('a2').setAttribute('data-win-state', 'stuck');
    w('a3').removeAttribute('data-win-state'); w('a3').setAttribute('data-win-lifecycle', 'Closed');
  });
  await p.locator('#all [data-win-stack="alpha"]').click();
  await p.waitForSelector('.win-stack-panel:popover-open');
  const read = () => p.evaluate(() => {
    const panel = document.querySelector('.win-stack-panel');
    const rows = [...panel.querySelectorAll('[data-stack-row]')].map(r => {
      const link = r.firstChild, mark = link.querySelector('.win-state'), title = link.querySelector('.win-item-title'), close = r.lastChild;
      const mr = mark.getBoundingClientRect(), tr = title.getBoundingClientRect(), cr = close.getBoundingClientRect();
      return { key: r.getAttribute('data-stack-row'), title: title.textContent, titleW: Math.round(tr.width), titleScroll: title.scrollWidth, clipped: title.scrollWidth > title.clientWidth + 1,
        badge: mark.classList.contains('badge'), state: mark.getAttribute('data-state'), lifecycle: mark.hasAttribute('data-lifecycle'), hidden: mark.hidden, words: mark.textContent.trim(),
        markW: Math.round(mr.width), colW: Math.round(link.querySelector('.win-item-state').getBoundingClientRect().width), colLeft: Math.round(link.querySelector('.win-item-state').getBoundingClientRect().left), colRight: Math.round(link.querySelector('.win-item-state').getBoundingClientRect().right),
        beforeClose: mr.right <= cr.left, before: getComputedStyle(mark, '::before').content, bg: getComputedStyle(mark).backgroundColor, color: getComputedStyle(mark).color, name: link.getAttribute('aria-label') };
    });
    return { panelW: Math.round(panel.getBoundingClientRect().width), rows };
  });
  let s = await read();
  const a1 = s.rows.find(r => r.key === 'a1'), a2 = s.rows.find(r => r.key === 'a2'), a3 = s.rows.find(r => r.key === 'a3');
  check('the list grows to its longest title, up to the cap', s.panelW > 380 && s.panelW <= 560, s.panelW);
  check('a long title is shown whole, or truncates only at the cap', a1 && (!a1.clipped || s.panelW === 560), a1 && [a1.clipped, s.panelW]);
  check('shorter titles are not cut short', a2 && !a2.clipped && a3 && !a3.clipped, [a2 && a2.clipped, a3 && a3.clipped]);
  const widest = Math.max(...s.rows.map(r => r.markW));
  check('the state column is as wide as the widest badge and no wider', s.rows.every(r => Math.abs(r.colW - widest) <= 1) && widest > 0, s.rows.map(r => [r.key, r.markW, r.colW]));
  check('every row\'s state column ends in one line before Close', new Set(s.rows.map(r => r.colRight)).size === 1 && s.rows.every(r => r.beforeClose), s.rows.map(r => [r.key, r.colRight]));
  check('a window with no state and a lifecycle word shows it as a plain badge with no glyph', a3 && a3.badge && a3.lifecycle && a3.state === '' && !a3.hidden && a3.words === 'Closed' && a3.before === 'none', a3);
  check('the plain badge is neutral, not a state colour', a3 && a1 && a3.bg !== a1.bg && a3.color !== a1.color, a3 && [a3.bg, a1.bg]);
  check('the row\'s name includes the lifecycle word', a3 && /Closed$/.test(a3.name), a3 && a3.name);
  const agg = await p.evaluate(() => document.querySelector('#all [data-win-stack="alpha"]').getAttribute('aria-label'));
  check('the lifecycle word adds nothing to the stack\'s count of states', /1 working/.test(agg) && /1 stuck/.test(agg) && !/Closed/.test(agg), agg);

  /* An execution state takes the word's place; removing it gives the word back. */
  await p.evaluate(() => document.querySelector('.win[data-win="a3"]').setAttribute('data-win-state', 'idle'));
  await p.waitForFunction(() => document.querySelector('.win-stack-panel [data-stack-row="a3"] .win-state').getAttribute('data-state') === 'idle');
  s = await read(); const idle = s.rows.find(r => r.key === 'a3');
  check('an execution state takes the lifecycle word\'s place', idle && idle.state === 'idle' && !idle.lifecycle && idle.words === 'Idle', idle);
  await p.evaluate(() => document.querySelector('.win[data-win="a3"]').removeAttribute('data-win-state'));
  await p.waitForFunction(() => document.querySelector('.win-stack-panel [data-stack-row="a3"] .win-state').hasAttribute('data-lifecycle'));
  await p.evaluate(() => document.querySelector('.win[data-win="a3"]').setAttribute('data-win-lifecycle', 'Retired'));
  await p.waitForFunction(() => document.querySelector('.win-stack-panel [data-stack-row="a3"] .win-state').textContent.trim() === 'Retired');
  check('a changed lifecycle word is followed live', true);
  await p.evaluate(() => document.querySelector('.win[data-win="a3"]').removeAttribute('data-win-lifecycle'));
  await p.waitForFunction(() => document.querySelector('.win-stack-panel [data-stack-row="a3"] .win-state').hidden);
  s = await read();
  check('without a state or a word the row keeps the empty column', s.rows.find(r => r.key === 'a3').colW === s.rows.find(r => r.key === 'a1').colW);
  await p.keyboard.press('Escape');

  /* The folded Window status. */
  await p.evaluate(() => { const w = document.querySelector('.win[data-win="a3"]'); w.setAttribute('data-win-lifecycle', 'Closed'); pudlWindows.raise('a3'); });
  const status = await p.evaluate(async () => {
    const win = document.querySelector('.win[data-win="a3"]');
    const btn = win.querySelector('.win-head button[popovertarget^="win-status-"]');
    if (!btn) return { none: true, head: win.querySelector('.win-head').innerHTML.slice(0, 300) };
    btn.click();
    await new Promise(r => setTimeout(r, 200));
    const panel = document.getElementById(btn.getAttribute('popovertarget'));
    const row = panel && panel.querySelector('.win-execution-row .win-state');
    return { open: !!panel && panel.matches(':popover-open'), badge: !!row && row.classList.contains('badge'), words: row && row.textContent.trim(), lifecycle: !!row && row.hasAttribute('data-lifecycle'), before: row && getComputedStyle(row, '::before').content };
  });
  check('the folded Window status shows the lifecycle word as a plain badge', status.badge && status.lifecycle && status.words === 'Closed' && status.before === 'none', status);
  await p.keyboard.press('Escape');

  check('no page errors', !errors.length, errors);
  await b.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
