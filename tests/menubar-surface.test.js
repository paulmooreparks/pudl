/* A menu bar's menu, and the pills beside it, have a plain button's
   surface in every theme, so the bar's controls look uniform (Parks
   Computing's proposal, specification 0.24.2). Measured on the reference
   page, whose topbar holds a menu bar and pills, against a neutral .btn. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined && !ok ? ' ' + JSON.stringify(detail) : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  for (const theme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 700 } });
    await ctx.addInitScript(t => { try { localStorage.setItem('pudl-theme', t); } catch (e) {} }, theme);
    const p = await ctx.newPage();
    await p.goto(ROOT + '/reference.html');
    await p.waitForSelector('.menubar-row .menubar-menu');
    const s = await p.evaluate(() => {
      const look = el => { const c = getComputedStyle(el); return { bg: c.backgroundImage, border: c.borderTopColor, shadow: c.boxShadow }; };
      const btn = document.createElement('button'); btn.className = 'btn'; btn.textContent = 'x';
      document.querySelector('main, .ref, body').appendChild(btn);
      const out = { menu: look(document.querySelector('.menubar-row .menubar-menu:not(.menubar-one)')), btn: look(btn), pill: look(document.querySelector('.topbar .topbar-pill')) };
      btn.remove();
      return out;
    });
    check(theme + ': a menu group at rest has a plain button\'s fill, border and shadow', s.menu.bg === s.btn.bg && s.menu.border === s.btn.border && s.menu.shadow === s.btn.shadow, s);
    check(theme + ': the pills beside it have the same fill', s.pill.bg === s.btn.bg, s);
    await ctx.close();
  }
  await b.close();
  process.exit(failures ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
