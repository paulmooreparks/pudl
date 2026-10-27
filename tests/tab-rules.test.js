/* Every tab strip PUDL draws keeps one rule. The tabs the reader can press
   stand on the strip's rule, 1px short of its edge, so the rule runs in
   front of them; the current tab reaches the edge and opens the rule into
   the content. A strip that hangs its tabs, a top dock's, mirrors this.
   Each kind is checked here, so a change to one cannot quietly break
   another. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined && !ok ? ' ' + JSON.stringify(detail) : ''));
  if (!ok) failures++;
}

/* The current tab's edge and the other tabs' edges, against the strip's
   rule edge: the foot, or the head where the tabs hang. */
function measure(strip, current, others, hang) {
  const s = strip.getBoundingClientRect();
  const edge = r => hang ? r.top : r.bottom;
  const gap = r => Math.round((hang ? edge(r) - s.top : s.bottom - edge(r)) * 2) / 2;
  return {
    current: current ? gap(current.getBoundingClientRect()) : null,
    others: others.map(o => gap(o.getBoundingClientRect()))
  };
}
const rule = (m, needOthers) => m.current === 0 && (needOthers ? m.others.length > 0 : true) && m.others.every(g => g === 1);

(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  /* Section tabs, page tabs, document tabs and a ribbon's tabs. */
  await page.goto(ROOT + '/reference.html');
  await page.waitForFunction(() => document.querySelector('.tabs.tabs-ready'));
  const kinds = await page.evaluate(m => {
    const measure = new Function('return ' + m)();
    const out = {};
    const take = (name, strip, current, others) => { if (strip && !out[name]) out[name] = measure(strip, current, others, false); };
    const bar = document.querySelector('.app-section-bar');
    if (bar) take('section tabs', bar, bar.querySelector('.section-tab[aria-current]:not([aria-current="false"]), .section-tab.active'), [...bar.querySelectorAll('.section-tab:not([aria-current]):not(.active)')]);
    const list = [...document.querySelectorAll('.tabs.tabs-ready > .tablist:not(.doc-tabs)')][0];
    if (list) take('page tabs', list, list.querySelector('[aria-selected="true"]'), [...list.querySelectorAll('[role="tab"]:not([aria-selected="true"])')]);
    const docs = document.querySelector('.tablist.doc-tabs');
    if (docs) take('document tabs', docs, docs.querySelector('[aria-selected="true"]'), [...docs.querySelectorAll('[role="tab"]:not([aria-selected="true"])')]);
    const rb = document.querySelector('.ribbon.ribbon-ready:not([data-ribbon-folded]) > .ribbon-bar');
    if (rb) take('ribbon tabs', rb, rb.querySelector('[role="tab"][aria-selected="true"]'), [...rb.querySelectorAll('[role="tab"]:not([aria-selected="true"])')]);
    return out;
  }, measure.toString());
  for (const name of ['section tabs', 'page tabs', 'document tabs', 'ribbon tabs']) {
    check(name + ': the others stand on the rule and the current tab opens it', kinds[name] && rule(kinds[name], true), kinds[name]);
  }

  /* A menu bar unfolded into a ribbon: its tabs stand on the topbar's rule. */
  await page.goto(ROOT + '/samples/menu-ribbon.html');
  await page.waitForFunction(() => window.pudlMenubar && document.querySelector('.menubar-title'));
  await page.evaluate(() => pudlMenubar.ribbon(true));
  await page.waitForSelector('.menubar-title[aria-selected="true"]');
  const menuRibbon = await page.evaluate(m => {
    const measure = new Function('return ' + m)();
    const cur = document.querySelector('.menubar-row .menubar-title[aria-selected="true"]');
    const top = cur.closest('.topbar'), rule = parseFloat(getComputedStyle(top).borderBottomWidth);
    const others = [...document.querySelectorAll('.menubar-row > .menubar-menu:not(.menubar-pins) > .menubar-title[role="tab"]:not([aria-selected="true"])')].filter(t => t.offsetParent);
    const r = measure(top, cur, others, false);
    /* The topbar's rule is its border, so standing on it is one border in. */
    return { current: r.current, others: r.others.map(g => g - rule + 1) };
  }, measure.toString());
  check('menu bar ribbon: the others stand on the topbar\'s rule and the current tab opens it', rule(menuRibbon, true), menuRibbon);

  /* Shared docks: tabs stand on the strip at the sides and the foot, and
     hang from it at the top. */
  await page.goto(ROOT + '/samples/shared-docks.html');
  await page.waitForSelector('[data-dock-key="workspace"]');
  const dock = (edge, hang) => page.evaluate(([m, edge, hang]) => {
    const measure = new Function('return ' + m)();
    const list = document.querySelector('[data-dock-edge="' + edge + '"]:not([data-dock-collapsed]):not([data-dock-rail]) .win-dock-tablist');
    if (!list) return null;
    return measure(list, list.querySelector('.win-dock-entry[data-selected]'), [...list.querySelectorAll('.win-dock-entry:not([data-selected])')], hang);
  }, [measure.toString(), edge, hang]);
  for (const edge of ['left', 'right', 'bottom']) {
    const m = await dock(edge, false);
    check(edge + ' dock: the others stand on the rule and the current tab opens it', m && rule(m, false), m);
  }
  await page.evaluate(() => { pudlWindows.dock('output', 'top'); pudlWindows.dock('problems', 'top'); });
  await page.waitForSelector('[data-dock-edge="top"] .win-dock-entry[data-selected]');
  const top = await dock('top', true);
  check('top dock: the others hang from the rule and the current tab opens it', top && rule(top, true), top);

  check('no errors', errors.length === 0, errors);
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
