/* An applet may start when its window is seen, or when nothing else is
   starting, rather than when the window opens (0.66.0). A restored layout
   starts only the applets of the windows that can be seen, the idle ones
   follow one at a time, an unstarted window shows a loading line and is
   busy, and a host can ask and start one itself. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + (detail || '')));
  if (!ok) failures++;
}
const KEYS = ['docked', 'zoned', 'mini', 'behind', 'idle-1', 'idle-2', 'hosted', 'plain', 'front'];

(async () => {
  const browser = await launch();
  const p = await browser.newPage({ viewport: { width: 1280, height: 760 } });

  /* Lay the windows out, then load the layout's address afresh, as a
     reader returning to it would. */
  await p.goto(ROOT + '/tests/fixtures/applet-start.html');
  await p.waitForFunction(() => window.pudlWindows && window.pudlApplets);
  for (const k of KEYS) {
    await p.evaluate(k => pudlWindows.open(k), k);
    await p.waitForFunction(k => document.querySelector('.win[data-win="' + k + '"]'), k);
  }
  await p.evaluate(() => { pudlWindows.dock('docked', 'left'); pudlWindows.snap('zoned', 'right'); pudlWindows.minimize('mini'); pudlWindows.raise('front'); });
  await p.waitForTimeout(400);
  const url = p.url();
  await p.goto('about:blank');
  await p.goto(url);
  await p.waitForFunction(n => document.querySelectorAll('.win[data-win]').length === n, KEYS.length);
  await p.waitForFunction(() => window.starts.length >= 4);
  await p.waitForTimeout(60);

  const first = await p.evaluate(() => window.starts.map(s => s.key + ':' + s.reason));
  const firstKeys = first.map(s => s.split(':')[0]).sort();
  check('at first, only the docked, zoned and front windows start, with the window that starts on opening',
    JSON.stringify(firstKeys) === JSON.stringify(['docked', 'front', 'plain', 'zoned']), JSON.stringify(first));
  check('they start because they were seen, and the plain one because it opened',
    first.every(s => /^(docked|zoned|front):seen$|^plain:open$/.test(s)), JSON.stringify(first));

  const waiting = await p.evaluate(() => {
    const win = document.querySelector('.win[data-win="behind"]');
    const mount = win.querySelector('[data-applet]');
    const line = win.querySelector('.applet-waiting');
    return { busy: win.getAttribute('aria-busy'), state: mount.getAttribute('data-applet-state'),
      hidden: getComputedStyle(mount).display === 'none', line: !!line && line.getAttribute('role') === 'status' && !!line.querySelector('.spinner'),
      title: win.querySelector('.win-title').textContent };
  });
  check('a window not yet seen keeps its title, shows a loading line and is busy',
    waiting.busy === 'true' && waiting.state === 'waiting' && waiting.hidden && waiting.line && waiting.title === 'Behind', JSON.stringify(waiting));

  /* The idle windows follow, one at a time, each after everything before
     it is ready. */
  await p.waitForFunction(() => window.starts.filter(s => s.reason === 'idle').length === 2, null, { timeout: 5000 });
  const idle = await p.evaluate(() => {
    const at = k => window.starts.find(s => s.key === k).at;
    const firstReady = Math.max.apply(null, ['docked', 'zoned', 'front', 'plain'].map(k => window.readyAt[k]));
    return { one: at('idle-1'), two: at('idle-2'), firstReady, oneReady: window.readyAt['idle-1'] };
  });
  check('the first idle applet starts once the others are ready', idle.one >= idle.firstReady, JSON.stringify(idle));
  check('the second idle applet starts once the first is ready', idle.two >= idle.oneReady, JSON.stringify(idle));
  const behindStill = await p.evaluate(() => !window.starts.some(s => s.key === 'behind' || s.key === 'mini' || s.key === 'hosted'));
  check('the windows that start when seen still have not started', behindStill);
  await p.waitForFunction(() => !document.querySelector('.win[data-win="idle-2"]').hasAttribute('aria-busy'));
  check('a window is no longer busy once its applet is ready', true);

  /* A host asks about a window and starts it. */
  const hosted = await p.evaluate(async () => {
    const before = pudlApplets.started('hosted');
    await pudlApplets.start('hosted');
    const s = window.starts.find(x => x.key === 'hosted');
    return { before, after: pudlApplets.started('hosted'), reason: s && s.reason, ready: !!window.readyAt.hosted,
      busy: document.querySelector('.win[data-win="hosted"]').hasAttribute('aria-busy') };
  });
  check('started() says no, start() starts it and settles once it is ready',
    !hosted.before && hosted.after && hosted.reason === 'host' && hosted.ready && !hosted.busy, JSON.stringify(hosted));

  /* Restoring the minimised window starts it. */
  await p.evaluate(() => pudlWindows.raise('mini'));
  await p.waitForFunction(() => window.starts.some(s => s.key === 'mini'));
  check('restoring a minimised window starts its applet because it is seen',
    await p.evaluate(() => window.starts.find(s => s.key === 'mini').reason === 'seen'));

  /* Closing a window that was never seen starts nothing. */
  await p.evaluate(() => pudlWindows.close('behind'));
  await p.waitForFunction(() => !document.querySelector('.win[data-win="behind"]'));
  await p.waitForTimeout(300);
  check('a window closed before it was seen never starts its applet',
    await p.evaluate(() => !window.starts.some(s => s.key === 'behind')));

  await browser.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
