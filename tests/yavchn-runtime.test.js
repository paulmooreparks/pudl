/* The four runtime features YAVCHN patched into its copies of PUDL
   (YAVCHN's PUDL-PROPOSAL.md, Part A), now PUDL's own: window-scoped
   address parameters, pudlRegions.reload(), collapsed segment choices that
   swap regions, and pudlWindows.rekey(). */
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
  const loads = [];
  p.on('load', () => loads.push(p.url()));
  const S = ROOT + '/samples/';
  const q = () => p.evaluate(() => decodeURIComponent(location.search));
  const settled = () => p.waitForFunction(() => !document.querySelector('[data-region][aria-busy]'));

  await p.goto(S + 'article-reader.html');
  await p.evaluate(() => document.querySelector('[data-win-layer]').setAttribute('data-win-params', 'r'));

  /* === A1: window-scoped parameters ===================================== */
  await p.click('.md-sidebar a[data-win-open="url-state"]');
  await p.waitForSelector('.win[data-win="url-state"]');
  await p.evaluate(() => {
    const u = new URL(location.href);
    u.searchParams.set('r.url-state', 'chapter-2');
    u.searchParams.set('r.nowhere', 'x');
    u.searchParams.set('q.url-state', 'kept');
    history.replaceState(history.state, '', u.pathname + u.search.replace(/%2C/g, ','));
    pudlWindows.raise('url-state');
  });
  let s = await q();
  check('a declared parameter of an open window stays', /r\.url-state=chapter-2/.test(s), s);
  check('one for a window that is not open goes', !/r\.nowhere/.test(s), s);
  check('an undeclared prefix is the page\'s own and stays', /q\.url-state=kept/.test(s), s);
  const loadsBefore = loads.length;
  await p.click('.section-tab[href="article-reader-design.html"]');
  await p.waitForFunction(() => /design/.test(location.pathname));
  await settled();
  s = await q();
  check('it travels with the windows when the regions swap to another page', /r\.url-state=chapter-2/.test(s) && /open=url-state/.test(s), s);
  check('without loading the page', loads.length === loadsBefore, loads.join(','));
  await p.goBack();
  await p.waitForFunction(() => !/design/.test(location.pathname));
  await settled();
  check('and with Back', /r\.url-state=chapter-2/.test(await q()), await q());

  /* === A4: re-keying a window =========================================== */
  await p.evaluate(() => {
    const w = document.querySelector('.win[data-win="url-state"]');
    w.__marker = 'same';
    window.__rekeys = [];
    document.addEventListener('pudl:window-rekey', e => __rekeys.push(e.detail.oldKey + '>' + e.detail.key));
    window.__h = history.length;
  });
  const done = await p.evaluate(() => pudlWindows.rekey('url-state', 'story-9'));
  const after = await p.evaluate(() => {
    const w = document.querySelector('.win[data-win="story-9"]');
    return {
      same: !!w && w.__marker === 'same',
      state: JSON.stringify(pudlWindows.state().open), place: !!pudlWindows.state().place['story-9'],
      events: __rekeys.join(','), pushed: history.length === __h + 1,
      menu: w && w.querySelector('[data-win-menu-for="story-9"]') !== null || !document.querySelector('[data-win-menu-for="url-state"]')
    };
  });
  s = await q();
  check('rekey gives the window a new key and keeps its element', done === true && after.same, JSON.stringify(after));
  check('its state, placement and window-scoped parameter move to the new key', after.state.includes('story-9') && !after.state.includes('url-state') && after.place && /r\.story-9=chapter-2/.test(s) && !/r\.url-state/.test(s) && /p\.story-9=/.test(s), s);
  check('pudl:window-rekey tells both keys', after.events === 'url-state>story-9', JSON.stringify(after));
  check('its panels follow the key', after.menu);
  await p.goBack();
  await p.waitForFunction(() => /open=url-state/.test(decodeURIComponent(location.search)));
  check('it is a new history entry: Back returns to the old key', /r\.url-state=chapter-2/.test(await q()), await q());
  /* Forward would ask the sample's server for a window called story-9,
     which it has none of, so the window is re-keyed again instead. */
  await p.waitForSelector('.win[data-win="url-state"]');
  check('re-keying again from there works', await p.evaluate(() => pudlWindows.rekey('url-state', 'story-9')));
  check('rekey onto a key that is open is refused', await p.evaluate(() => {
    pudlWindows.open('mixing');
    return new Promise(r => setTimeout(() => r(pudlWindows.rekey('story-9', 'mixing') === false && !!document.querySelector('.win[data-win="story-9"]')), 400));
  }));
  check('rekey without push replaces the history entry', await p.evaluate(() => {
    const h = history.length;
    return pudlWindows.rekey('story-9', 'story-10', false) && history.length === h && /story-10/.test(location.search);
  }), await q());
  check('rekey to its own key brings it forward', await p.evaluate(() => pudlWindows.rekey('story-10', 'story-10') && pudlWindows.state().top === 'story-10'));
  await p.click('.win[data-win="story-10"] [data-win-action="close"]');
  await p.waitForFunction(() => !document.querySelector('.win[data-win="story-10"]'));
  check('closing the window takes its window-scoped parameter away', !/r\.story-10/.test(await q()), await q());

  /* === A2: reloading the regions ======================================== */
  const reload = await p.evaluate(async () => {
    const list = document.querySelector('[data-region="list"]');
    list.__old = true;
    const h = history.length, before = location.href;
    const ok = await pudlRegions.reload();
    return { ok, replaced: !document.querySelector('[data-region="list"]').__old, sameEntry: history.length === h && location.href === before };
  });
  check('reload() swaps the regions in place and resolves true', reload.ok === true && reload.replaced, JSON.stringify(reload));
  check('with no new history entry and the address unchanged', reload.sameEntry);
  await p.route('**/article-reader.html*', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>x</title><p>No regions here.</p>' }));
  const failed = await p.evaluate(async () => {
    const list = document.querySelector('[data-region="list"]');
    list.__kept = true;
    try { await pudlRegions.reload(); return 'resolved'; } catch (e) {
      return { rejected: true, kept: document.querySelector('[data-region="list"]').__kept === true, busy: list.hasAttribute('aria-busy') };
    }
  });
  await p.unroute('**/article-reader.html*');
  const loadsNow = loads.length;
  await p.waitForTimeout(300);
  check('a reload whose page has other regions rejects, leaves the regions and never navigates', failed.rejected && failed.kept && !failed.busy && loads.length === loadsNow, JSON.stringify(failed));

  /* === A3: collapsed segment choices swap regions ======================= */
  await p.setViewportSize({ width: 390, height: 800 });
  await p.evaluate(() => {
    const region = document.querySelector('[data-region="sections"]');
    const nav = document.createElement('nav');
    nav.className = 'seg';
    nav.id = 'category';
    nav.setAttribute('data-seg-menu', '');
    nav.setAttribute('aria-label', 'Category');
    nav.innerHTML = '<a href="article-reader.html" aria-current="page">All</a><a href="article-reader-design.html">Design</a>';
    region.prepend(nav);
    pudlMenu.refresh();
  });
  await p.waitForSelector('#category + .seg-menu .menu-btn', { state: 'visible', timeout: 5000 });
  const loadsSeg = loads.length;
  await p.click('#category + .seg-menu .menu-btn');
  await p.click('#category + .seg-menu .seg-choice >> text=Design');
  await p.waitForFunction(() => /design/.test(location.pathname));
  await settled();
  check('a collapsed segment\'s choice swaps the regions, as the segment does, without loading the page', loads.length === loadsSeg, loads.slice(loadsSeg).join(','));

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
