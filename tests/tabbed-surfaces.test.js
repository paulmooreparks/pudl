/* Tabs that fill a dialog or a window and keep one size (0.71.0): choosing
   a tab never resizes or moves the dialog or the window, the bar runs from
   edge to edge, and a panel out of sight cannot be seen or focused. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + (detail || '')));
  if (!ok) failures++;
}

(async () => {
  const browser = await launch();
  const p = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await p.goto(ROOT + '/tests/fixtures/tabbed-surfaces.html');
  await p.waitForFunction(() => document.querySelectorAll('.tabs-ready').length === 4 && window.pudlWindows);
  const rect = sel => p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right) }; }, sel);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  /* A dialog. */
  await p.click('#open');
  const before = await rect('#settings');
  await p.click('#t-tall');
  const after = await rect('#settings');
  check('choosing a taller tab leaves the dialog\'s size and place as they were', same(before, after), JSON.stringify([before, after]));
  check('the dialog was already as tall as its tallest panel', before.h > 420, JSON.stringify(before));
  await p.click('#t-short');
  check('and so does choosing the shorter tab again', same(before, await rect('#settings')));
  const bar = await rect('#settings .tablist');
  check('the dialog\'s tab bar runs from edge to edge', Math.abs(bar.x - before.x) <= 1 && Math.abs(bar.r - before.r) <= 1, JSON.stringify([bar, before]));
  const away = await p.evaluate(() => ({ vis: getComputedStyle(document.getElementById('deep')).visibility, hidden: document.getElementById('p-tall').hidden }));
  check('a panel out of sight stays hidden, and its controls invisible', away.hidden && away.vis === 'hidden', JSON.stringify(away));
  await p.focus('#t-short');
  await p.keyboard.press('Tab');
  await p.keyboard.press('Tab');
  check('Tab never reaches a control in a panel out of sight', await p.evaluate(() => document.activeElement.id) !== 'deep');
  await p.keyboard.press('Escape');

  /* A dialog whose tabs follow each panel. */
  await p.click('#open-each');
  const e1 = await rect('#each');
  await p.click('#e-tall');
  const e2 = await rect('#each');
  check('data-tabs-size="each" lets a dialog follow each panel\'s size', e2.h > e1.h + 300, JSON.stringify([e1, e2]));
  await p.keyboard.press('Escape');

  /* A window the reader sizes. */
  const w1 = await rect('.win[data-win="prefs"]'), wb = await rect('.win[data-win="prefs"] .win-body');
  const wbar = await rect('.win[data-win="prefs"] .tablist');
  check('a window\'s tab bar runs from edge to edge of its body, at its top', Math.abs(wbar.x - wb.x) <= 1 && Math.abs(wbar.r - wb.r) <= 1 && Math.abs(wbar.y - wb.y) <= 1, JSON.stringify([wbar, wb]));
  await p.$eval('#w-tall', b => b.click());
  check('choosing a taller tab leaves the window as it was', same(w1, await rect('.win[data-win="prefs"]')));
  const scroll = await p.evaluate(() => ({ panel: document.getElementById('wp-tall').scrollHeight > document.getElementById('wp-tall').clientHeight, body: document.querySelector('.win[data-win="prefs"] .win-body').scrollTop }));
  check('the tall panel scrolls on its own, and the bar stays in place', scroll.panel && scroll.body === 0, JSON.stringify(scroll));
  const fill = await p.evaluate(() => { const b = document.querySelector('.win[data-win="prefs"] .win-body').getBoundingClientRect(), s = document.getElementById('wp-short'); return Math.abs(b.bottom - s.getBoundingClientRect().bottom); });
  await p.$eval('#w-short', b => b.click());
  check('a short panel fills the rest of the window', fill <= 1 && await p.evaluate(() => { const b = document.querySelector('.win[data-win="prefs"] .win-body').getBoundingClientRect(); return Math.abs(b.bottom - document.getElementById('wp-short').getBoundingClientRect().bottom) <= 1; }));

  /* A window sized by its content. */
  const s1 = await rect('.win[data-win="sized"]');
  await p.$eval('#s-wide', b => b.click());
  const s2 = await rect('.win[data-win="sized"]');
  check('a window sized by its content keeps the size of its widest panel', same(s1, s2) && s1.w >= 440, JSON.stringify([s1, s2]));

  await browser.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
