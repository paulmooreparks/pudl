/* The settled signal (docs/SETTLED.md): pudlSettled() stays pending while
   reported work is outstanding and resolves after a quiet frame, a
   cancelled frame or timer stops counting, a resize observation is
   delivered before the promise resolves, and pudl:settled fires once per
   busy spell. A windowed page settles after a viewport change with its
   dock strips already measured. */
const { launch, ROOT, settled, resize } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined && !ok ? ' ' + JSON.stringify(detail) : ''));
  if (!ok) failures++;
}
(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(ROOT + '/tests/fixtures/settled.html');

  check('an idle page settles', await page.evaluate(() => window.pudlSettled().then(() => true)));

  const held = await page.evaluate(async () => {
    const frames = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 0)))));
    let events = 0, resolved = false;
    document.addEventListener('pudl:settled', () => { events++; });
    const done = pudlBusy();
    pudlSettled().then(() => { resolved = true; });
    await frames();
    const whileBusy = resolved;
    done(); done();
    await pudlSettled();
    await frames();
    return { whileBusy, resolved, events };
  });
  check('the promise stays pending while reported work is outstanding', held.whileBusy === false, held);
  check('it resolves once the work is done, and the event fires once', held.resolved === true && held.events === 1, held);

  const chain = await page.evaluate(async () => {
    const ran = [];
    pudlBusy.timeout(() => { ran.push('timer'); pudlBusy.frame(() => { ran.push('frame'); pudlBusy.timeout(() => ran.push('last'), 30); }); }, 30);
    await pudlSettled();
    return ran;
  });
  check('work queued by queued work is waited for', JSON.stringify(chain) === '["timer","frame","last"]', chain);

  const cancelled = await page.evaluate(async () => {
    let ran = 0;
    pudlBusy.cancelFrame(pudlBusy.frame(() => { ran++; }));
    pudlBusy.cancelTimeout(pudlBusy.timeout(() => { ran++; }, 60000));
    await pudlSettled();
    return ran;
  });
  check('a cancelled frame or timer no longer counts', cancelled === 0, cancelled);

  const observed = await page.evaluate(async () => {
    const box = document.getElementById('box');
    let widths = [];
    const observer = pudlBusy.ResizeObserver(entries => { widths.push(Math.round(entries[0].contentRect.width)); });
    observer.observe(box);
    await pudlSettled();
    box.style.width = '240px';
    await pudlSettled();
    observer.disconnect();
    return widths;
  });
  check('a size change is observed before the promise resolves', observed[observed.length - 1] === 240, observed);

  /* A real page: after a viewport change the dock strip has been measured
     by the time settled() returns, and waiting longer changes nothing. */
  await page.goto(ROOT + '/tests/fixtures/dock-overflow.html');
  await settled(page);
  const strip = () => page.evaluate(() => [...document.querySelectorAll('.win-dock-group')].map(g => [...g.querySelectorAll('[data-dock-entry]')].map(e => e.hidden).join()).join('|') + ' ' + [...document.querySelectorAll('.win-dock-more')].map(m => m.hidden).join());
  await resize(page, { width: 700, height: 700 });
  const narrow = await strip();
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));
  check('a windowed page is stable once it has settled after a resize', narrow === await strip(), narrow);
  await resize(page, { width: 1400, height: 700 });
  const wide = await strip();
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));
  check('and again after it widens', wide === await strip() , wide);

  check('no page errors', errors.length === 0, errors);
  await browser.close();
  if (failures) { console.log('FAIL ' + failures + ' checks'); process.exit(1); }
})().catch(e => { console.error('FAIL ' + e.message); process.exit(1); });
