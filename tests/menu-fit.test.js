/* A menu whose rows fit shows no scrollbar, at any display scale, from
   parkscomputing.com's Architecture/pudl-bug-menu-scrollbar.md. */
const { launch, ROOT, engine } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];
  /* Firefox does not emulate a device scale; the whole-number scale still
     catches the border. */
  const scales = engine === 'firefox' ? [1] : [1, 1.92, 1.25];
  for (const scale of scales) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: scale });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(ROOT + '/reference.html');
    await p.waitForFunction(() => document.querySelector('.menu-panel'));
    const over = [];
    for (const id of ['demo-menu', 'demo-launcher', 'md-trip-menu', 'md-account-menu']) {
      await p.evaluate(i => document.querySelector('[popovertarget="' + i + '"]').scrollIntoView({ block: 'center' }), id);
      await p.click('[popovertarget="' + id + '"]');
      await p.waitForFunction(i => { const el = document.getElementById(i); return el.matches(':popover-open') && !el.classList.contains('placing'); }, id);
      const r = await p.evaluate(i => {
        const el = document.getElementById(i);
        return { id: i, scroll: el.scrollHeight, client: el.clientHeight,
          fits: el.scrollHeight <= el.clientHeight && el.getBoundingClientRect().width >= 14 * parseFloat(getComputedStyle(document.documentElement).fontSize) - 1 };
      }, id);
      if (!r.fits) over.push(JSON.stringify(r));
      await p.keyboard.press('Escape');
    }
    check('at a scale of ' + scale + ', a menu whose rows fit has nothing to scroll', over.length === 0, over.join(' '));
    /* Playwright's Firefox can fail to close a context it has finished
       with, which says nothing about the page. */
    await ctx.close().catch(() => {});
  }
  /* A hovered row shows against its panel in both themes (from
     parkscomputing.com's menu bar notes: in the dark theme it did not). */
  for (const theme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(ROOT + '/reference.html');
    await p.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
    await p.evaluate(() => document.querySelector('[popovertarget="demo-menu"]').scrollIntoView({ block: 'center' }));
    await p.click('[popovertarget="demo-menu"]');
    await p.waitForFunction(() => { const el = document.getElementById('demo-menu'); return el.matches(':popover-open') && !el.classList.contains('placing'); });
    for (const sel of ['#demo-menu .menu-action', '#demo-menu .md-row']) {
      await p.hover(sel);
      const c = await p.evaluate(s => ({ row: getComputedStyle(document.querySelector(s)).backgroundColor, panel: getComputedStyle(document.getElementById('demo-menu')).backgroundColor }), sel);
      check(theme + ': a hovered ' + (sel.includes('action') ? 'action' : 'place') + ' row differs from its panel', c.row !== c.panel && !/rgba\(0, 0, 0, 0\)|transparent/.test(c.row), JSON.stringify(c));
    }
    await ctx.close().catch(() => {});
  }
  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
