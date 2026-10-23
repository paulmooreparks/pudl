/* A restore racing another change (0.80.0): a window the address names is
   adopted, then a listener on pudl:window-open makes a change from the
   arrangement as it was before the restore, which takes the new window
   out again, and then the restore commits. PUDL used to throw from
   setPlacement there; it now fetches the window again and places it. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => errors.push(e.stack || e.message));
  await p.addInitScript(() => {
    let once = false;
    document.addEventListener('pudl:window-open', e => {
      if (once || !e.target.matches('[data-win="numerals"]')) return;
      once = true;
      /* A change from the arrangement before the restore landed. */
      window.pudlWindows.minimizeAll();
    });
  });
  await p.goto(ROOT + '/samples/article-reader.html?open=numerals&top=numerals');
  const placed = await p.waitForFunction(() => {
    const w = document.querySelector('.win[data-win="numerals"]');
    return w && w.style.zIndex && window.pudlWindows.state().open.indexOf('numerals') >= 0;
  }, null, { timeout: 8000 }).then(() => true, () => false);
  check('the window the address names is placed in the end', placed);
  check('nothing throws while the restore and the change race', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
