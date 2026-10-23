/* The sidebar's head (0.82.0): the list's filter, menus, Clear all and
   chips at the head of the list's column, staying put as the list scrolls,
   going with the sidebar to either side, hidden with it when collapsed,
   fitting a narrow column and a phone's list pane, and chips shown only
   while there are some. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];
  const p = await b.newPage({ viewport: { width: 1100, height: 700 } });
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/tests/fixtures/sidebar-head.html');
  await p.waitForSelector('.md-list .md-row');

  const shape = () => p.evaluate(() => {
    const side = document.querySelector('.md-sidebar'), head = document.querySelector('.md-sidebar-head');
    const s = side.getBoundingClientRect(), h = head.getBoundingClientRect(), f = head.querySelector('.md-filter-group').getBoundingClientRect();
    return { headTop: Math.round(h.top - s.top), headLeft: Math.round(h.left), sideLeft: Math.round(s.left), headW: Math.round(h.width), sideW: Math.round(s.width),
      fieldFills: f.width >= h.width - 30, overflowX: side.scrollWidth > side.clientWidth + 1, visible: head.getClientRects().length > 0 && getComputedStyle(side).visibility !== 'hidden',
      chips: getComputedStyle(head.querySelector('.md-chips')).display };
  });
  const at = await shape();
  check('the head stands at the top of the sidebar, its field across it, without widening the column', at.headTop === 0 && at.fieldFills && !at.overflowX, JSON.stringify(at));
  check('with no chips, the chips row is hidden', at.chips === 'none', at.chips);

  await p.evaluate(() => { const s = document.querySelector('.md-sidebar'); s.scrollTop = 600; });
  const scrolled = await shape();
  check('the head stays put while the list scrolls under it', scrolled.headTop === 0, JSON.stringify(scrolled));

  await p.evaluate(() => { document.querySelector('.md-chips').innerHTML = '<span class="filter-chip"><span class="filter-chip-kind">Tag</span> windows <a class="filter-chip-x" href="#" aria-label="Remove windows"></a></span><span class="filter-chip"><span class="filter-chip-kind">Category</span> a rather long category name <a class="filter-chip-x" href="#" aria-label="Remove it"></a></span>'; });
  const chipped = await shape();
  check('with chips, they show under the tools and the column does not widen', chipped.chips !== 'none' && !chipped.overflowX, JSON.stringify(chipped));

  await p.evaluate(() => document.querySelector('.md-layout').setAttribute('data-md-side', 'end'));
  const end = await shape();
  check('at the end side, the head goes with the sidebar', Math.abs(end.headLeft - end.sideLeft) <= 1 && end.sideLeft > 500, JSON.stringify(end));
  await p.evaluate(() => { const l = document.querySelector('.md-layout'); l.removeAttribute('data-md-side'); l.setAttribute('data-md-collapsed', ''); });
  const collapsed = await shape();
  check('collapsed, the head is hidden with the list', !collapsed.visible, JSON.stringify(collapsed));
  await p.evaluate(() => document.querySelector('.md-layout').removeAttribute('data-md-collapsed'));

  /* A list swap leaves the head as it is. */
  const kept = await p.evaluate(() => {
    const field = document.querySelector('.md-filter'); field.value = 'typed';
    document.querySelector('.md-list').replaceWith(Object.assign(document.createElement('ul'), { className: 'md-list', innerHTML: '<li class="md-row"><a class="md-item" href="#x">One result</a></li>' }));
    return document.querySelector('.md-filter') === field && field.value === 'typed';
  });
  check('a list swap leaves the head and its field as they are', kept);

  await p.setViewportSize({ width: 380, height: 700 });
  await p.waitForTimeout(300);
  const phone = await shape();
  check('on a phone\'s list pane the head runs across it, nothing overflowing', phone.visible && phone.fieldFills && !phone.overflowX && phone.headW >= 340, JSON.stringify(phone));

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
