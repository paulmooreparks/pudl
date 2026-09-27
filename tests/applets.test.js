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
  const watch = p => {
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') { if (!/favicon|404/.test(m.text())) errors.push(m.text()); } });
  };

  /* === The article reader =============================================== */
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  watch(p);
  const SAMPLE = ROOT + '/samples/article-reader.html';
  await p.goto(SAMPLE);
  const q = () => p.evaluate(() => decodeURIComponent(location.search));
  await p.evaluate(() => {
    window.__closed = [];
    document.addEventListener('pudl:window-close', e => window.__closed.push(e.detail.key + ':' + e.target.isConnected));
  });

  await p.click('.md-sidebar a[data-win-open="mixing"]');
  await p.waitForSelector('.win[data-win="mixing"] [data-applet-state="running"]');
  check('applet starts when its window opens', true);
  const share = await p.getAttribute('.win[data-win="mixing"] .mixer-foot a', 'href');
  check('in a window its link points at its own page', /^colour-mixer\.html\?a=6b9bd1&b=121417&p=24$/.test(share), share);
  const before = await q();
  await p.evaluate(() => {
    const r = document.querySelector('.win[data-win="mixing"] input[type="range"]');
    r.value = '70'; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true }));
  });
  check('in a window it leaves the URL alone', (await q()) === before, await q());
  check('in a window its link follows the mix', /p=70$/.test(await p.getAttribute('.win[data-win="mixing"] .mixer-foot a', 'href')));
  await p.locator('.win[data-win="mixing"]').screenshot({ path: out('applet-window.png') });

  await p.click('.win[data-win="mixing"] [data-win-action="close"]');
  const closed = await p.evaluate(() => window.__closed);
  check('pudl:window-close fires before removal', JSON.stringify(closed) === '["mixing:true"]', JSON.stringify(closed));

  // Replace in place, then Back.
  await p.click('.md-sidebar a[data-win-open="elevation"]');
  await p.waitForSelector('.win[data-win="elevation"]');
  await p.click('.win[data-win="elevation"] a[data-win-replace]');
  await p.waitForSelector('.win[data-win="url-state"]');
  let s = await q();
  check('Next replaces the window', /open=url-state(&|$)/.test(s) && !/elevation/.test(s) &&
    await p.locator('.win[data-win="elevation"]').count() === 0, s);
  check('replacement keeps the placement', /p\.url-state=maximized:/.test(s), s);
  await p.goBack();
  await p.waitForSelector('.win[data-win="elevation"]');
  s = await q();
  check('Back returns to the replaced window', /open=elevation(&|$)/.test(s) &&
    await p.locator('.win[data-win="url-state"]').count() === 0, s);

  // Replacing with a window that is already open.
  await p.click('.md-sidebar a[data-win-open="numerals"]');
  await p.waitForSelector('.win[data-win="numerals"]');
  await p.click('.md-sidebar a[data-win-open="mixing"]');
  await p.waitForSelector('.win[data-win="mixing"] [data-applet-state="running"]');
  await p.click('.win[data-win="mixing"] a[data-win-replace]');
  await p.waitForFunction(() => !document.querySelector('.win[data-win="mixing"]'));
  s = await q();
  check('replacing with an open window raises it and closes this one', /top=numerals/.test(s) && !/mixing/.test(s), s);

  // The script interface.
  const api = await p.evaluate(async () => {
    const W = window.pudlWindows;
    W.close('numerals'); W.close('elevation');
    W.open('url-state');
    await new Promise(r => setTimeout(r, 100));
    const a = W.state();
    W.minimize('url-state');
    const bb = W.state();
    W.raise('url-state');
    const c = W.state();
    return { a: a.open.join(','), top: a.top, min: Object.keys(bb.min).join(','), raised: c.top, minAfter: Object.keys(c.min).length };
  });
  check('pudlWindows.open, minimize, raise, state', api.a === 'url-state' && api.top === 'url-state' && api.min === 'url-state' &&
    api.raised === 'url-state' && api.minAfter === 0, JSON.stringify(api));

  /* === The applet in its own page ======================================= */
  const m = await b.newPage({ viewport: { width: 1000, height: 800 } });
  watch(m);
  await m.goto(ROOT + '/samples/colour-mixer.html?a=ff0000&b=0000ff&p=50');
  await m.waitForSelector('[data-applet-state="running"]');
  const hex = await m.textContent('.mixer .kv-table tr:nth-child(2) code');
  check('in a page it reads its state from the URL', hex === '#800080', hex);
  await m.evaluate(() => {
    const r = document.querySelector('input[type="range"]');
    r.value = '25'; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true }));
  });
  check('in a page a change goes into the URL', /p=25/.test(await m.evaluate(() => location.search)));
  await m.goBack();
  await m.waitForFunction(() => document.querySelector('input[type="range"]').value === '50');
  check('in a page Back undoes the change', true);
  await m.screenshot({ path: out('applet-page.png') });

  const torn = await m.evaluate(async () => {
    const root = document.querySelector('[data-applet]');
    pudlApplets.destroy(root);
    const empty = root.children.length === 0 && !root.hasAttribute('data-applet-state');
    history.pushState(null, '', '?a=00ff00&b=ffffff&p=10');
    history.back();
    await new Promise(r => setTimeout(r, 200));
    return { empty, still: root.children.length === 0 };
  });
  check('destroy takes the applet down', torn.empty, JSON.stringify(torn));
  check('destroy removes its window listeners too', torn.still, JSON.stringify(torn));

  check('no errors or warnings', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
