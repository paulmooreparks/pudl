/* Tabs in the topbar, the current one opening into the page, for
   parkscomputing.com's sections. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];
  for (const [width, theme] of [[1280, 'dark'], [1280, 'light'], [390, 'dark']]) {
    const p = await b.newPage({ viewport: { width, height: 700 } });
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(ROOT + '/tests/fixtures/topbar-tabs.html');
    await p.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
    const r = await p.evaluate(() => {
      const bar = document.querySelector('.topbar').getBoundingClientRect();
      const tabs = Array.from(document.querySelectorAll('.topbar-tabs > a'));
      const cur = tabs[0], other = tabs[1];
      const cs = getComputedStyle(cur);
      return {
        barBottom: Math.round(bar.bottom * 10) / 10,
        curBottom: Math.round(cur.getBoundingClientRect().bottom * 10) / 10,
        otherBottom: Math.round(other.getBoundingClientRect().bottom * 10) / 10,
        curBg: cs.backgroundColor, pageBg: getComputedStyle(document.body).backgroundColor,
        curColor: cs.color, text: getComputedStyle(document.body).color,
        underline: cs.textDecorationLine,
        otherTop: Math.round(other.getBoundingClientRect().top), curTop: Math.round(cur.getBoundingClientRect().top),
        lowest: Math.max.apply(null, Array.from(document.querySelectorAll('.topbar > *')).filter(el => getComputedStyle(el).display !== 'none').map(el => Math.round(el.getBoundingClientRect().top))),
        tabsTop: Math.round(document.querySelector('.topbar-tabs').getBoundingClientRect().top),
        fits: document.documentElement.scrollWidth <= window.innerWidth
      };
    });
    const at = width + 'px ' + theme + ': ';
    check(at + 'the current tab covers the topbar\'s bottom edge and takes the page\'s colour, so it opens into the page',
          Math.abs(r.curBottom - r.barBottom) <= 0.5 && r.curBg === r.pageBg && r.curColor === r.text, JSON.stringify(r));
    check(at + 'the other tabs stand on the topbar\'s bottom border, and the current one is taller',
          Math.abs(r.otherBottom - (r.barBottom - 1)) <= 0.5 && r.curTop < r.otherTop, JSON.stringify(r));
    check(at + 'the tabs are not underlined', r.underline === 'none', r.underline);
    if (width < 640) check(at + 'on a phone the tabs are the topbar\'s last row and the page fits', r.tabsTop === r.lowest && r.fits, JSON.stringify(r));
    await p.close();
  }
  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
