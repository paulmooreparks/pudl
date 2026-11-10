/* A path bar keeps to one line (0.97.7): the places above the current one
   shrink to ellipses, the current place shrinks last, and when they still
   do not fit the bar scrolls sideways, starting scrolled to its end. A
   scrolled-off place is still in the Tab order and comes into view as it
   takes focus. A bar marked .wrap wraps as before. */
const { launch, ROOT, out, engine } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined && !ok ? ' ' + JSON.stringify(detail) : ''));
  if (!ok) failures++;
}
(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const settle = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

  /* The bar's geometry: whether it is one line, which places are cut, and
     which are wholly inside the bar's box. */
  /* A place is in view within a pixel and a half: an engine may rest a pixel
     short of the bar's end after the bar's width changes by a fraction. */
  const read = id => page.evaluate(id => {
    const nav = document.getElementById(id), ol = nav.querySelector('ol'), n = nav.getBoundingClientRect();
    const places = [...ol.children].map(li => {
      const r = li.getBoundingClientRect(), el = li.firstElementChild;
      return { name: el.textContent, title: el.getAttribute('title'), cut: el.scrollWidth > el.clientWidth + 1, inView: r.left >= n.left - 1.5 && r.right <= n.right + 1.5, top: Math.round(r.top) };
    });
    return { height: n.height, lines: new Set(places.map(p => p.top)).size, scrolls: nav.scrollWidth > nav.clientWidth + 1, olLeft: ol.getBoundingClientRect().left - n.left, olRight: n.right - ol.getBoundingClientRect().right, places };
  }, id);

  async function deepBar(label) {
    const d = await read('deep');
    check(label + ': eight places on one line', d.places.length === 8 && d.lines === 1, d);
    check(label + ': the leading places end in an ellipsis', d.places.slice(0, 7).every(p => p.cut), d.places);
    check(label + ': the current place is whole', !d.places[7].cut, d.places[7]);
    check(label + ': the current place is in view at load', d.places[7].inView && d.scrolls, d);
    check(label + ': the first place starts out of view', !d.places[0].inView, d.places[0]);
    check(label + ': each shortened place has its whole name as its tooltip', d.places.every(p => p.title === p.name), d.places);
  }

  await page.goto(ROOT + '/tests/fixtures/path-bar.html');
  await settle();
  await deepBar('light');
  await page.screenshot({ path: out('path-bar-light.png'), clip: { x: 0, y: 0, width: 480, height: 120 } });
  const shortBar = await read('short');
  check('a short path in a wide box is one line, uncut, unscrolled and at the start', shortBar.lines === 1 && !shortBar.scrolls && shortBar.places.every(p => !p.cut && p.inView) && shortBar.olLeft < 1, shortBar);
  check('the short bar and the deep bar are the same height', Math.abs(shortBar.height - (await read('deep')).height) < 1);
  const wrapped = await read('wrapped');
  check('.wrap wraps as before', wrapped.lines > 1 && !wrapped.scrolls && wrapped.places.every(p => !p.cut && p.inView), wrapped);

  /* Tabbing back to the first place scrolls it into view. */
  await page.locator('#deep a').last().focus();
  /* Playwright's WebKit moves Tab past links, as Safari does by default,
     so there the first place takes focus by script; what is checked is
     that a place out of view comes into view as it takes focus. */
  if (engine === 'webkit') await page.locator('#deep a').first().focus();
  else for (let i = 0; i < 6; i++) await page.keyboard.press('Shift+Tab');
  check('Shift+Tab reaches the first place', await page.evaluate(() => document.activeElement === document.querySelector('#deep a')));
  let d = await read('deep');
  check('the focused first place is scrolled into view', d.places[0].inView && !d.places[7].inView, d);
  await page.locator('#deep a').last().focus();
  d = await read('deep');
  check('focusing the last link scrolls the end back into view', d.places[6].inView, d);

  /* A toolbar holding the bar keeps its height as it narrows and widens. */
  const toolbarHeight = () => page.locator('#bar .toolbar').evaluate(t => t.getBoundingClientRect().height);
  const heights = [await toolbarHeight()];
  for (const w of ['24em', '18em', '60em', '30em']) {
    await page.evaluate(w => { document.getElementById('bar').style.width = w; }, w);
    await settle();
    heights.push(await toolbarHeight());
  }
  check('a toolbar holding the bar never changes height as it narrows and widens', heights.every(h => Math.abs(h - heights[0]) < 1), heights);
  const inbar = await read('inbar');
  check('the bar in the toolbar stays one line with the current place in view', inbar.lines === 1 && inbar.places[7].inView, inbar);

  await page.goto(ROOT + '/tests/fixtures/path-bar.html');
  await page.evaluate(() => { document.documentElement.setAttribute('data-theme', 'dark'); });
  await settle();
  await deepBar('dark');
  await page.screenshot({ path: out('path-bar-dark.png'), clip: { x: 0, y: 0, width: 480, height: 120 } });

  /* A right-to-left page mirrors the bar: its end is on the left. */
  await page.goto(ROOT + '/tests/fixtures/path-bar.html');
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
  await settle();
  await deepBar('right to left');
  const rtlShort = await read('short');
  check('right to left: a short path starts at the right', rtlShort.olRight < 1 && !rtlShort.scrolls, rtlShort);
  await page.locator('#deep a').first().focus();
  if (process.env.PUDL_PATH_WAIT === '1') await page.waitForFunction(() => {
    const n=document.querySelector('#deep'),a=n.querySelector('a'),r=a.getBoundingClientRect(),b=n.getBoundingClientRect();
    return document.activeElement===a && r.left>=b.left-1.5 && r.right<=b.right+1.5;
  },null,{timeout:5000});
  d = await read('deep');
  console.log('RTLINITIAL '+JSON.stringify({state:d,active:await page.evaluate(()=>document.activeElement.outerHTML),fonts:await page.evaluate(()=>document.fonts.status)}));
  check('right to left: focusing the first place scrolls it into view', d.places[0].inView, d);

  await settle(); console.log('RTLAFTER2 '+JSON.stringify(await read('deep')));
  await settle(); console.log('RTLAFTER4 '+JSON.stringify(await read('deep')));

  /* Forced colours keep the drawn separators. */
  await page.goto(ROOT + '/tests/fixtures/path-bar.html');
  await page.emulateMedia({ forcedColors: 'active' });
  await settle();
  await deepBar('forced colours');
  const sep = await page.evaluate(() => {
    const li = document.querySelectorAll('#deep li')[1], c = getComputedStyle(li, '::before');
    return { width: c.width, bg: c.backgroundColor, adjust: c.forcedColorAdjust };
  });
  check('forced colours: the separators are still drawn', sep.width === '12px' && !/rgba\(0, 0, 0, 0\)|transparent/.test(sep.bg), sep);

  /* A place shorter than the 3em floor keeps its own width (0.97.8): a
     root "/" sits tight against the separator after it. */
  const tight = await page.evaluate(() => {
    const nav = document.createElement('nav'); nav.className = 'path mono'; nav.setAttribute('aria-label', 'Short');
    nav.innerHTML = '<ol><li><a href="#root" title="/">/</a></li><li><a href="#home" title="~">~</a></li><li><span aria-current="location" title="site">site</span></li></ol>';
    nav.style.width = '600px'; document.body.appendChild(nav);
    const lis = [...nav.querySelectorAll('li')], out = lis.map(li => {
      const a = li.firstElementChild, sep = getComputedStyle(li, '::before');
      const sepWidth = sep.content === 'none' ? 0 : parseFloat(sep.width) + parseFloat(sep.marginLeft) + parseFloat(sep.marginRight);
      return { li: li.getBoundingClientRect().width - sepWidth, content: a.scrollWidth };
    });
    const em = parseFloat(getComputedStyle(lis[0]).fontSize);
    nav.remove();
    return { out, em };
  });
  check('a place shorter than 3em is no wider than its own content', tight.out.slice(0, 2).every(p => p.li <= p.content + 1 && p.li < 3 * tight.em - 1), tight);

  check('no page errors', errors.length === 0, errors);
  await browser.close();
  if (failures) { console.log('FAIL ' + failures + ' checks'); process.exit(1); }
})().catch(e => { console.error('FAIL ' + e.message); process.exit(1); });
