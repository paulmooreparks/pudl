/* What the stem-to-stern review of 0.21 changed: windows move by transform
   while dragged and their placement does not reach their content, every
   fetch and file a page's markup can name stays on the page's origin, and
   the sidebar's minimum may be written in any length. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];

  /* A dragged window moves by transform, and commits its placement once. */
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/samples/article-reader.html?open=numerals&p.numerals=floating:0.1,0.1,0.5,0.6');
  await p.waitForSelector('.win[data-win="numerals"]');
  const head = await p.locator('.win[data-win="numerals"] .win-head').boundingBox();
  await p.mouse.move(head.x + 80, head.y + head.height / 2);
  await p.mouse.down();
  await p.mouse.move(head.x + 180, head.y + head.height / 2 + 60, { steps: 8 });
  await p.waitForFunction(() => document.querySelector('.win[data-win="numerals"]').style.transform !== '');
  const during = await p.evaluate(() => {
    const w = document.querySelector('.win[data-win="numerals"]');
    return { x: w.style.getPropertyValue('--win-x'), moving: w.classList.contains('win-moving'), url: location.search };
  });
  await p.mouse.up();
  const after = await p.evaluate(() => {
    const w = document.querySelector('.win[data-win="numerals"]');
    return { x: w.style.getPropertyValue('--win-x'), transform: w.style.transform, moving: w.classList.contains('win-moving'), url: location.search };
  });
  check('a dragged window moves by transform, its placement untouched', during.moving && during.x === '0.1' && /0\.1,0\.1,/.test(during.url), JSON.stringify(during));
  check('release commits the placement and clears the transform', !after.moving && after.transform === '' && after.x !== '0.1' && !/0\.1,0\.1,/.test(after.url), JSON.stringify(after));

  /* The placement is the window's own: content inside does not inherit it. */
  const inherited = await p.evaluate(() => {
    const w = document.querySelector('.win[data-win="numerals"]');
    return { win: getComputedStyle(w).getPropertyValue('--win-x').trim(), body: getComputedStyle(w.querySelector('.win-body')).getPropertyValue('--win-x').trim() };
  });
  check('content in a window does not inherit its placement', inherited.win !== inherited.body && +inherited.body === 0.06, JSON.stringify(inherited));

  /* A sidebar minimum in rem is honoured by the divider. */
  await p.evaluate(() => document.querySelector('.md-layout').style.setProperty('--md-sidebar-min', '12rem'));
  await p.focus('.md-resize');
  await p.keyboard.press('Home');
  const side = await p.evaluate(() => ({ w: Math.round(document.querySelector('.md-sidebar').getBoundingClientRect().width), min: document.querySelector('.md-resize').getAttribute('aria-valuemin') }));
  check('the divider honours a minimum written in rem', side.w === 192 && side.min === '192', JSON.stringify(side));

  /* A window's markup must be HTML from the page's own origin. */
  const q = await b.newPage({ viewport: { width: 1280, height: 900 } });
  q.on('pageerror', e => errors.push(e.message));
  await q.route('**/samples/windows/numerals.html', route => route.fulfill({ status: 200, contentType: 'text/plain', body: '<div class="win" data-win="numerals"><div class="win-head"><h2 class="win-title">plain</h2></div></div>' }));
  await q.goto(ROOT + '/samples/article-reader.html');
  const warned = new Promise(res => q.on('console', m => { if (/is not HTML/.test(m.text())) res(true); }));
  await q.evaluate(() => pudlWindows.open('numerals'));
  const got = await Promise.race([warned, new Promise(res => setTimeout(() => res(false), 3000))]);
  check('a window whose markup is not HTML is refused', got && await q.locator('.win[data-win="numerals"]').count() === 0);

  /* A mount may not name a script or stylesheet on another origin. */
  await q.goto(ROOT + '/samples/colour-mixer.html');
  await q.waitForFunction(() => window.pudlApplets);
  const mount = await q.evaluate(() => {
    const m = document.createElement('div');
    m.setAttribute('data-applet', 'elsewhere');
    m.setAttribute('data-applet-src', 'https://example.com/applet.js');
    document.body.append(m);
    pudlApplets.boot(m);
    return { state: m.getAttribute('data-applet-state'), loaded: !!document.querySelector('script[src="https://example.com/applet.js"]') };
  });
  check('a mount naming another origin fails and loads nothing', mount.state === 'error' && !mount.loaded, JSON.stringify(mount));
  const css = await q.evaluate(() => {
    const m = document.createElement('div');
    m.setAttribute('data-applet', 'elsewhere-css');
    m.setAttribute('data-applet-css', 'https://example.com/applet.css');
    document.body.append(m);
    pudlApplets.boot(m);
    return { state: m.getAttribute('data-applet-state'), loaded: !!document.querySelector('link[href="https://example.com/applet.css"]') };
  });
  check('a mount naming a stylesheet on another origin fails and loads nothing', css.state === 'error' && !css.loaded, JSON.stringify(css));

  /* A toast's kind is one of the kinds, never an arbitrary class. */
  await q.goto(ROOT + '/reference.html');
  await q.waitForFunction(() => window.pudlToast);
  const toast = await q.evaluate(() => [pudlToast('x', { kind: 'positive leaving' }).className, pudlToast('y', { kind: 'warn' }).className]);
  check('a toast takes only a known kind', toast[0] === 'toast' && toast[1] === 'toast warn', JSON.stringify(toast));

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
