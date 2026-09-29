/* Applets that declare the requests they serve, from parkscomputing.com's
   Architecture/pudl-proposal-applet-handlers.md. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/tests/fixtures/applet-requests.html');
  await p.waitForFunction(() => window.pudlApplets && window.pudlApplets.request && window.pudlWindows);
  const log = () => p.evaluate(() => window.__log.slice());
  const open = () => p.evaluate(() => pudlWindows.state().open.join(','));

  const can = await p.evaluate(() => [pudlApplets.can('open', 'text'), pudlApplets.can('open', 'image'), pudlApplets.can('open'),
                                      pudlApplets.can('toString'), pudlApplets.request('nothing', { path: 'x' })]);
  check('can says what would answer, and a request nothing serves returns false', JSON.stringify(can) === '[true,false,true,false,false]', JSON.stringify(can));

  /* A reused applet: the first request opens it, the next reaches it. */
  await p.evaluate(() => pudlApplets.request('open', { path: '~/notes/a.txt', kind: 'text' }, document.getElementById('caller')));
  await p.waitForSelector('.win[data-win="notepad"] [data-applet-state="running"]', { state: 'attached' });
  let got = await p.getAttribute('.win[data-win="notepad"] [data-applet]', 'data-got');
  check('a request with nothing open opens a window whose applet starts with the state', got === 'file=~/notes/a.txt', got);
  check('the applet hears its instance key', (await p.getAttribute('.win[data-win="notepad"] [data-applet]', 'data-instance')) === 'notepad');
  await p.evaluate(() => pudlApplets.request('open', { path: 'b.txt', kind: 'text' }));
  got = await p.getAttribute('.win[data-win="notepad"] [data-applet]', 'data-got');
  check('the next request goes to the open instance through setState', got === 'file=b.txt' && (await open()) === 'notepad' &&
        (await log()).some(l => l === 'notepad set notepad file=b.txt'), JSON.stringify(await log()));

  /* An unrelated window keyed like an instance is never taken for one. */
  await p.evaluate(() => pudlWindows.open('shell-2'));
  await p.waitForSelector('.win[data-win="shell-2"]');

  /* A host's kept state loses to a request's, and hears the instance. */
  await p.evaluate(() => {
    window.__asked = [];
    document.addEventListener('pudl:applet-state', e => { window.__asked.push(e.detail.instance); e.detail.state = 'cwd=/host'; });
  });

  /* An applet that opens a new window each time, up to its limit. */
  for (const d of ['/a', '/b', '/c']) {
    await p.evaluate(d => pudlApplets.request('shell', { path: d, run: d === '/b' ? 'ls' : null }), d);
    await p.waitForFunction(n => document.querySelectorAll('[data-applet="shell"][data-applet-state="running"]').length === n, ['/a', '/b', '/c'].indexOf(d) + 1);
  }
  const shells = await p.evaluate(() => [...document.querySelectorAll('[data-applet="shell"]')].map(m => m.closest('.win').getAttribute('data-win') + ' ' + m.getAttribute('data-got')));
  check('each request opens a new instance, skipping a key an unrelated window holds',
        shells.join('|') === 'shell cwd=/a|shell-3 cwd=/b&run=ls|shell-4 cwd=/c', shells.join('|'));
  check('a request\'s state wins over the host\'s, and the host hears each instance', JSON.stringify(await p.evaluate(() => window.__asked)) === '["shell","shell-3","shell-4"]',
        JSON.stringify(await p.evaluate(() => window.__asked)));
  const titles = await p.evaluate(() => ['shell-3', 'shell-4'].map(k => {
    const t = document.querySelector('.win[data-win="' + k + '"] .win-title');
    return t.textContent + '#' + t.id;
  }));
  check('a numbered window takes its applet\'s template, numbered, with a title id of its own', titles.join('|') === 'Shell 3#win-shell-3-title|Shell 4#win-shell-4-title', titles.join('|'));
  await p.evaluate(() => pudlApplets.request('shell', { path: '/d' }));
  const atLimit = await p.evaluate(() => ({ count: document.querySelectorAll('[data-applet="shell"]').length,
                                              newest: document.querySelector('.win[data-win="shell-4"] [data-applet]').getAttribute('data-got'),
                                              top: pudlWindows.state().top }));
  check('at the limit, the newest instance takes the request', atLimit.count === 3 && atLimit.newest === 'cwd=/d' && atLimit.top === 'shell-4', JSON.stringify(atLimit));

  /* === A page without windows ========================================== */
  const q = await ctx.newPage();
  q.on('pageerror', e => errors.push(e.message));
  await q.goto(ROOT + '/tests/fixtures/applet-requests-page.html');
  await q.waitForFunction(() => window.pudlApplets && window.pudlApplets.request);
  const [tab] = await Promise.all([
    ctx.waitForEvent('page'),
    q.evaluate(() => pudlApplets.request('open', { path: 'c.txt', kind: 'text' }))
  ]);
  await tab.waitForLoadState('commit');
  check('on the applet\'s own page, a request opens its page in a new tab', /applet-requests-page\.html\?file=c\.txt$/.test(tab.url()) && /applet-requests-page\.html$/.test(q.url()), tab.url());
  await Promise.all([
    q.waitForURL(/default-windows\.html\?cwd=\/e$/),
    q.evaluate(() => pudlApplets.request('shell', { path: '/e' }))
  ]);
  check('on another page without windows, a request goes to the applet\'s page', /default-windows\.html\?cwd=\/e$/.test(q.url()), q.url());

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
