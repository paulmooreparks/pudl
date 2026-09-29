/* What building the Files sample asked of PUDL: retitling a window,
   refusing a close, leaving the pane to the server, queuing requests to
   an applet still loading, and region links that keep their own
   parameters as written. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];

  /* === Retitling and refusing a close ================================== */
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/samples/article-reader.html?open=numerals&top=numerals');
  await p.waitForSelector('.win[data-win="numerals"]');
  const t = await p.evaluate(() => {
    pudlWindows.retitle('numerals', 'Figures that line up');
    const w = document.querySelector('.win[data-win="numerals"]');
    return { title: w.querySelector('.win-title').textContent, head: w.querySelector('.win-head').getAttribute('aria-label'),
             dock: document.querySelector('.win-tab[data-win-tab="numerals"]').textContent };
  });
  check('retitle: the title, the title bar\'s name and the dock tab follow', t.title === 'Figures that line up' &&
        /Figures that line up/.test(t.head) && t.dock === 'Figures that line up', JSON.stringify(t));

  await p.evaluate(() => {
    window.__closing = [];
    window.__refuse = e => { window.__closing.push(e.detail.key + ':' + e.detail.reason); e.preventDefault(); };
    document.addEventListener('pudl:window-closing', window.__refuse);
  });
  await p.click('.win[data-win="numerals"] [data-win-action="close"]');
  const kept = await p.evaluate(() => ({ open: !!document.querySelector('.win[data-win="numerals"]'), search: location.search, closing: window.__closing }));
  check('closing: a refused close keeps the window and the address', kept.open && /open=numerals/.test(kept.search) &&
        kept.closing.join() === 'numerals:button', JSON.stringify(kept));
  await p.evaluate(() => { document.removeEventListener('pudl:window-closing', window.__refuse); pudlWindows.close('numerals'); });
  check('closing: once nothing refuses, the window closes', await p.evaluate(() => !document.querySelector('.win[data-win="numerals"]')));

  /* === Leaving the pane to the server ================================== */
  await p.goto(ROOT + '/samples/article-reader.html');
  await p.waitForFunction(() => window.pudlWindows);
  const pane = await p.evaluate(async () => {
    const md = document.querySelector('.md-layout');
    document.querySelector('[data-win-layer]').setAttribute('data-win-pane', 'off');
    md.setAttribute('data-md-pane', 'detail');
    pudlWindows.minimizeAll();
    return md.getAttribute('data-md-pane');
  });
  check('pane: with data-win-pane="off" the windows leave the layout\'s pane alone', pane === 'detail', pane);

  /* === Region links keep their own parameters as written ================ */
  const raw = await p.evaluate(() => {
    const a = document.createElement('a');
    a.href = 'article-reader.html?path=/notes/today&q=a+b';
    a.id = 'raw';
    document.querySelector('.md-sidebar').append(a);
    pudlRegions.refresh();
    return a.getAttribute('href');
  });
  check('regions: a region link keeps its own parameters as written', /\?path=\/notes\/today&q=a\+b/.test(raw), raw);

  /* === Requests to an applet still loading queue up ===================== */
  const q = await b.newPage({ viewport: { width: 1280, height: 900 } });
  q.on('pageerror', e => errors.push(e.message));
  await q.goto(ROOT + '/tests/fixtures/applet-requests.html');
  await q.waitForFunction(() => window.pudlApplets && window.pudlApplets.request && window.pudlWindows);
  await q.evaluate(() => {
    pudlApplets.request('open', { path: 'first.txt', kind: 'text' });
    pudlApplets.request('open', { path: 'second.txt', kind: 'text' });
    pudlApplets.request('open', { path: 'third.txt', kind: 'text' });
  });
  await q.waitForFunction(() => window.__log.length >= 3, null, { timeout: 5000 }).catch(() => {});
  const log = await q.evaluate(() => window.__log);
  check('requests: those made while the applet loads all arrive, in order',
        log.join('|') === 'notepad init notepad file=first.txt|notepad set notepad file=second.txt|notepad set notepad file=third.txt', log.join('|'));

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
