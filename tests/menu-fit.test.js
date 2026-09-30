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
        return { id: i, scroll: el.scrollHeight, client: el.clientHeight, fits: el.scrollHeight <= el.clientHeight };
      }, id);
      if (!r.fits) over.push(JSON.stringify(r));
      await p.keyboard.press('Escape');
    }
    check('at a scale of ' + scale + ', a menu whose rows fit has nothing to scroll', over.length === 0, over.join(' '));
    await ctx.close();
  }
  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
