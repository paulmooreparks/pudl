/* Minimise-all and restore-all, with the window in front kept in the
   address, and list metadata that wraps. From parkscomputing.com's
   Architecture/pudl-proposal-meta-wrap-restore-all.md. */
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
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/samples/article-reader.html?open=numerals,elevation&top=numerals' +
               '&p.numerals=floating:0.1,0.1,0.4,0.5&p.elevation=floating:0.3,0.2,0.4,0.5');
  await p.waitForSelector('.win[data-win="elevation"]');
  /* A desktop's toolbar pair, added as a server would render it. */
  await p.evaluate(() => {
    const bar = document.querySelector('.md-toolbar');
    bar.insertAdjacentHTML('beforeend',
      '<a class="btn btn-sm" id="min-all" data-win-back href="?">Minimise all</a>' +
      '<a class="btn btn-sm" id="restore-all" data-win-restore href="?">Restore all</a>');
    pudlWindows.raise('numerals');
  });
  const links = () => p.evaluate(() => ({
    back: document.getElementById('min-all').getAttribute('aria-disabled'),
    restore: document.getElementById('restore-all').getAttribute('aria-disabled'),
    restoreHref: document.getElementById('restore-all').getAttribute('href')
  }));
  let l = await links();
  check('with windows showing, only minimise-all is live', l.back === null && l.restore === 'true', JSON.stringify(l));

  await p.click('#min-all');
  const minned = await p.evaluate(() => ({
    search: location.search,
    shown: [...document.querySelectorAll('.win')].filter(w => !w.hidden).length,
    active: document.querySelectorAll('.win.active').length
  }));
  check('minimise-all hides every window and keeps the front one in top=', minned.shown === 0 && minned.active === 0 &&
        /top=numerals/.test(minned.search) && /min=numerals,elevation/.test(minned.search), JSON.stringify(minned));
  l = await links();
  check('then only restore-all is live', l.back === 'true' && l.restore === null, JSON.stringify(l));
  check('a disabled link-button takes no clicks', await p.evaluate(() => getComputedStyle(document.getElementById('min-all')).pointerEvents === 'none'));

  /* The answer survives a reload. */
  await p.reload();
  await p.waitForFunction(() => window.pudlWindows && document.querySelector('.win[data-win="elevation"]'));
  await p.evaluate(() => {
    const bar = document.querySelector('.md-toolbar');
    bar.insertAdjacentHTML('beforeend', '<a class="btn btn-sm" id="restore-all" data-win-restore href="?">Restore all</a>');
    pudlWindows.minimize('numerals');
  });
  l = await links().catch(() => ({}));
  const href = await p.getAttribute('#restore-all', 'href');
  await p.click('#restore-all');
  const restored = await p.evaluate(() => ({
    search: location.pathname + location.search,
    shown: [...document.querySelectorAll('.win')].filter(w => !w.hidden).length,
    front: (document.querySelector('.win.active') || {}).getAttribute ? document.querySelector('.win.active').getAttribute('data-win') : null
  }));
  check('after a reload, restore-all brings every window back with the same one in front',
        restored.shown === 2 && restored.front === 'numerals' && !/min=/.test(restored.search), JSON.stringify(restored));
  check('the restore link\'s href is the state it produces', href === restored.search, href + ' vs ' + restored.search);

  /* The script interface does the same. */
  await p.evaluate(() => pudlWindows.minimizeAll());
  check('pudlWindows.minimizeAll', await p.evaluate(() => [...document.querySelectorAll('.win')].every(w => w.hidden)));
  await p.evaluate(() => pudlWindows.restoreAll());
  check('pudlWindows.restoreAll', await p.evaluate(() => [...document.querySelectorAll('.win')].every(w => !w.hidden) &&
        document.querySelector('.win.active').getAttribute('data-win') === 'numerals'));

  /* Metadata wraps; the title keeps its ellipsis. */
  const meta = await p.evaluate(() => {
    const row = document.createElement('div');
    row.className = 'md-row';
    row.innerHTML = '<a class="md-item" href="#">A title long enough to need an ellipsis in a narrow sidebar, surely' +
      '<span class="md-meta">21 September 2026</span>' +
      '<span class="md-meta">A description long enough that it cannot fit on one line of the sidebar and has to wrap onto another.</span></a>';
    document.querySelector('.md-sidebar').prepend(row);
    const m = row.querySelectorAll('.md-meta')[1];
    const lh = parseFloat(getComputedStyle(m).lineHeight) || 16;
    const item = row.querySelector('.md-item');
    return { ws: getComputedStyle(m).whiteSpace, lines: Math.round(m.getBoundingClientRect().height / lh),
             fits: m.scrollWidth <= m.clientWidth + 1, itemWs: getComputedStyle(item).whiteSpace };
  });
  check('list metadata wraps and fits the row', /normal|wrap/.test(meta.ws) && meta.lines >= 2 && meta.fits, JSON.stringify(meta));
  check('the title stays on one line', meta.itemWs === 'nowrap', meta.itemWs);

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
