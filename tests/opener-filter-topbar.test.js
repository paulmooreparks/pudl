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
  const SAMPLE = ROOT + '/samples/article-reader.html';

  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  watch(p);
  const q = () => p.evaluate(() => decodeURIComponent(location.search));

  // Maximised begets maximised.
  await p.goto(SAMPLE);
  await p.click('.md-sidebar a[data-win-open="elevation"]');
  await p.waitForSelector('.win[data-win="elevation"]');
  await p.click('.win[data-win="elevation"] a[data-win-open="elevation-tokens"]');
  await p.waitForSelector('.win[data-win="elevation-tokens"]');
  check('from a maximized window, maximized', /p\.elevation-tokens=maximized:/.test(await q()), await q());

  // Floating begets floating, one step on.
  await p.goto(SAMPLE + '?open=elevation&top=elevation&p.elevation=floating:0.2,0.1,0.5,0.6');
  await p.waitForSelector('.win[data-win="elevation"]');
  await p.evaluate(() => document.addEventListener('pudl:window-place', e => { window.__opener = e.detail.opener; }, true));
  await p.click('.win[data-win="elevation"] a[data-win-open="elevation-tokens"]');
  await p.waitForSelector('.win[data-win="elevation-tokens"]');
  check('from a floating window, floating one step on', /p\.elevation-tokens=floating:0\.23,0\.13,0\.5,0\.6/.test(await q()), await q());
  check('pudl:window-place names the opener', (await p.evaluate(() => window.__opener)) === 'elevation');

  // Past the edge, the step starts again near the top left.
  await p.goto(SAMPLE + '?open=url-state&top=url-state&p.url-state=floating:0.45,0.25,0.55,0.75');
  await p.waitForSelector('.win[data-win="url-state"]');
  await p.click('.win[data-win="url-state"] a[data-win-open="url-state-example"]');
  await p.waitForSelector('.win[data-win="url-state-example"]');
  check('a step past the edge wraps', /p\.url-state-example=floating:0\.03,0\.03,0\.55,0\.75/.test(await q()), await q());

  // A snapped half begets the same half.
  await p.goto(SAMPLE + '?open=url-state&top=url-state&p.url-state=left:0.1,0.1,0.5,0.6');
  await p.waitForSelector('.win[data-win="url-state"]');
  await p.click('.win[data-win="url-state"] a[data-win-open="url-state-parse"]');
  await p.waitForSelector('.win[data-win="url-state-parse"]');
  check('from a snapped half, the same half', /p\.url-state-parse=left:/.test(await q()), await q());

  // Opening from outside any window keeps the markup's default.
  await p.goto(SAMPLE + '?open=elevation&top=elevation&p.elevation=floating:0.2,0.1,0.5,0.6');
  await p.waitForSelector('.win[data-win="elevation"]');
  await p.click('.md-sidebar a[data-win-open="numerals"]');
  await p.waitForSelector('.win[data-win="numerals"]');
  check('from the sidebar, the markup default', /p\.numerals=maximized:/.test(await q()), await q());

  // A child can be restored and maximized again.
  await p.click('.md-sidebar a[data-win-open="elevation"]');
  await p.click('.win[data-win="elevation"] a[data-win-open="elevation-tokens"]');
  await p.waitForSelector('.win[data-win="elevation-tokens"]');
  await p.click('.win[data-win="elevation-tokens"] [data-win-action="maximize"]');
  check('a child maximizes from its button', /p\.elevation-tokens=maximized:/.test(await q()), await q());

  /* === The filter's apply button ======================================== */
  const r = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  watch(r);
  await r.goto(ROOT + '/reference.html');
  await r.evaluate(() => document.getElementById('md').scrollIntoView());
  const grp = await r.evaluate(() => {
    const g = document.querySelector('.layout-demo .md-filter-group');
    const i = g.querySelector('.md-filter').getBoundingClientRect();
    const btn = g.querySelector('.md-filter-go');
    const bb = btn.getBoundingClientRect();
    const mask = getComputedStyle(btn, '::before').maskImage || getComputedStyle(btn, '::before').webkitMaskImage;
    return { gap: bb.left - i.right, sameHeight: Math.abs(bb.height - i.height) < 1, mask: String(mask).slice(0, 30),
             bg: getComputedStyle(btn).backgroundImage };
  });
  check('input and button are joined', grp.gap <= 0 && grp.gap > -2 && grp.sameHeight, JSON.stringify(grp));
  check('the button draws its glyph from the stylesheet', /svg/.test(grp.mask), grp.mask);
  check('the button is raised', /gradient/.test(grp.bg), grp.bg);
  await r.locator('.layout-demo .md-toolbar').screenshot({ path: out('filter-group.png') });
  await r.fill('.layout-demo .md-filter', 'hotel');
  await r.click('.layout-demo .md-filter-go');
  await r.waitForFunction(() => /q=hotel/.test(location.search));
  check('the button submits the filter', true);

  /* === Topbar link hover ==================================================
     Built as a probe rather than read from the reference page's own
     topbar: the reference page's .brand is now the menu bar's fallback
     content, hidden once pudl-menubar.js builds the bar, so hovering it
     would never reach :hover. This tests the stylesheet's rule for .brand
     directly. */
  for (const theme of ['light', 'dark']) {
    await r.evaluate(t => localStorage.setItem('pudl-theme', t), theme);
    await r.goto(ROOT + '/reference.html');
    await r.evaluate(() => {
      const a = document.createElement('a');
      a.className = 'brand'; a.href = '#'; a.textContent = 'Brand';
      a.id = 'hover-probe-brand';
      document.querySelector('.topbar').append(a);
    });
    await r.hover('#hover-probe-brand');
    const c = await r.evaluate(() => {
      const a = document.getElementById('hover-probe-brand');
      const probe = document.createElement('span');
      document.querySelector('.topbar').append(probe);
      probe.style.color = 'var(--tb-link-hover)'; const want = getComputedStyle(probe).color;
      probe.style.color = 'var(--accent-hover)'; const page = getComputedStyle(probe).color;
      probe.remove();
      const got = getComputedStyle(a).color;
      a.remove();
      return { got, want, page };
    });
    check(theme + ': the brand hovers in --tb-link-hover', c.got === c.want && c.got !== c.page, JSON.stringify(c));
  }

  /* === Phone ============================================================= */
  const ph = await b.newPage({ viewport: { width: 393, height: 851 }, isMobile: true });
  watch(ph);
  await ph.goto(ROOT + '/reference.html');
  const fit = await ph.evaluate(() => {
    const g = document.querySelector('.md-layout[data-md-pane="list"] .md-filter-group').getBoundingClientRect();
    const t = document.querySelector('.md-layout[data-md-pane="list"] .md-toolbar').getBoundingClientRect();
    return { g: Math.round(g.width), t: Math.round(t.width), over: document.documentElement.scrollWidth > document.documentElement.clientWidth };
  });
  check('phone: the filter group spans the toolbar row', !fit.over && fit.g > fit.t - 40, JSON.stringify(fit));

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
