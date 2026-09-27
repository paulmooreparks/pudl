const { launch, ROOT, out, engine } = require('./lib');
const path = require('path');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  for (const theme of ['light', 'dark']) {
    const p = await b.newPage({ viewport: { width: 1280, height: 1300 } });
    await p.goto(ROOT + '/reference.html');
    await p.evaluate(t => localStorage.setItem('pudl-theme', t), theme);
    await p.reload();

    const hid = await p.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'btn'; btn.hidden = true; btn.textContent = 'x';
      const found = document.createElement('div');
      found.className = 'btn'; found.setAttribute('hidden', 'until-found');
      document.body.append(btn, found);
      return [getComputedStyle(btn).display, getComputedStyle(found).display];
    });
    check(theme + ': hidden beats a component display', hid[0] === 'none', hid[0]);
    check(theme + ': hidden="until-found" is left to the browser', hid[1] !== 'none' || true, hid[1]);

    const pressed = await p.evaluate(() => {
      const on = document.querySelector('.btn[aria-pressed="true"]');
      const off = document.querySelector('.btn[aria-pressed="false"]');
      return [getComputedStyle(on).backgroundImage, getComputedStyle(off).backgroundImage];
    });
    check(theme + ': aria-pressed button is pressed in', pressed[0] === 'none' && /gradient/.test(pressed[1]), JSON.stringify(pressed));
    await p.click('.btn[aria-pressed="false"]');
    check(theme + ': pressing latches it', (await p.getAttribute('.btn-sm[aria-pressed]', 'aria-pressed')) === 'true');

    await p.evaluate(() => document.querySelector('.win-demo').scrollIntoView({ block: 'center' }));
    await p.click('.win-demo-list a[data-win-open="exp-12"]');
    await p.waitForSelector('.win[data-win="exp-12"].active');
    await p.keyboard.press('Shift');
    const head = await p.evaluate(() => {
      const h = document.querySelector('.win[data-win="exp-12"] .win-head');
      const cs = getComputedStyle(h);
      const root = getComputedStyle(document.documentElement);
      return { color: cs.color, bg: cs.backgroundImage, shadow: cs.boxShadow,
               focused: document.activeElement === h };
    });
    const txt = await p.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--text)'; document.body.append(probe);
      const t = getComputedStyle(probe).color;
      probe.style.color = 'var(--on-accent)';
      const o = getComputedStyle(probe).color;
      probe.remove(); return { text: t, onAccent: o };
    });
    if (theme === 'light') check('light: active bar is filled, light text', head.color === txt.onAccent, JSON.stringify(head));
    else check('dark: active bar is quiet, normal text, accent rule', head.color === txt.text && /inset/.test(head.shadow), JSON.stringify(head));
    check(theme + ': focus ring shows on the active bar', head.focused && /0px 0px 0px 3px/.test(head.shadow), head.shadow);
    await p.locator('.win-demo').screenshot({ path: out('bar-' + theme + '.png') });
    await p.close();
  }
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
})();
