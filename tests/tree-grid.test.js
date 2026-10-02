/* Trees, path bars, grids, glyphs as elements and drop targets, from
   parkscomputing.com's Architecture/pudl-proposal-tree-crumbs-editor.md. */
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
  await p.goto(ROOT + '/reference.html');
  await p.waitForFunction(() => window.pudlTree && window.pudlGrid);
  const focused = () => p.evaluate(() => document.activeElement.textContent.trim());

  /* === Tree =============================================================== */
  const t = await p.evaluate(() => {
    const tree = document.querySelector('#trees ~ .demo .tree');
    const items = [...tree.querySelectorAll('a')];
    const apps = items.find(a => a.textContent.trim() === 'apps');
    return {
      role: tree.getAttribute('role'), ready: tree.classList.contains('tree-ready'),
      items: items.filter(a => a.getAttribute('role') === 'treeitem').length, total: items.length,
      owns: !!document.getElementById(apps.getAttribute('aria-owns')),
      groupRole: apps.nextElementSibling.getAttribute('role'),
      level: items.find(a => a.textContent.trim() === 'files').getAttribute('aria-level'),
      appsKidsHidden: getComputedStyle(apps.nextElementSibling).display === 'none',
      stops: items.filter(a => a.getAttribute('tabindex') === '0').map(a => a.textContent.trim()),
      toggles: tree.querySelectorAll('.tree-toggle').length, raised: /gradient/.test(getComputedStyle(tree.querySelector('.tree-toggle')).backgroundImage)
    };
  });
  check('tree: the links are treeitems of a tree, groups owned by their nodes', t.role === 'tree' && t.ready && t.items === t.total && t.owns && t.groupRole === 'group' && t.level === '3', JSON.stringify(t));
  check('tree: a closed branch is hidden', t.appsKidsHidden);
  check('tree: one tab stop, on the current node', t.stops.length === 1 && t.stops[0] === 'articles', JSON.stringify(t.stops));
  check('tree: each node with children has a raised toggle', t.toggles === 3 && t.raised, JSON.stringify(t));

  await p.evaluate(() => {
    window.__toggles = [];
    document.addEventListener('pudl:tree-toggle', e => window.__toggles.push(e.target.textContent.trim() + ':' + e.detail.open));
  });
  await p.focus('#trees ~ .demo .tree a[aria-current]');
  const walk = [];
  for (const k of ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowLeft', 'ArrowLeft', 'Home', 'End']) {
    await p.keyboard.press(k);
    walk.push(await focused());
  }
  check('tree: the arrow keys, Home and End walk the showing nodes, opening and closing',
        walk.join(',') === 'coincidences.md,elevation.md,apps,apps,files,apps,apps,site,about.md', walk.join(','));
  check('tree: pudl:tree-toggle says which node opened and closed', JSON.stringify(await p.evaluate(() => window.__toggles)) === '["apps:true","apps:false"]',
        JSON.stringify(await p.evaluate(() => window.__toggles)));
  await p.keyboard.press('Home');
  await p.keyboard.press('e');
  check('tree: typing a name moves to it', (await focused()) === 'elevation.md', await focused());
  const tabs = await p.evaluate(() => [...document.querySelectorAll('#trees ~ .demo .tree a')].filter(a => a.getAttribute('tabindex') === '0').length);
  check('tree: the tab stop moves with focus', tabs === 1);
  await p.click('#trees ~ .demo .tree a[aria-expanded="false"] .tree-toggle');
  check('tree: the toggle opens a branch without following the link',
        await p.evaluate(() => [...document.querySelectorAll('#trees ~ .demo .tree a')].find(a => a.textContent.trim() === 'apps').getAttribute('aria-expanded') === 'true' && location.hash === ''));

  /* === Path bar =========================================================== */
  const path = await p.evaluate(() => {
    const li = document.querySelectorAll('.path li');
    return { n: li.length, sep: getComputedStyle(li[1], '::before').content, first: getComputedStyle(li[0], '::before').content,
             mask: getComputedStyle(li[1], '::before').maskImage || getComputedStyle(li[1], '::before').webkitMaskImage };
  });
  check('path: separators are drawn and silent, between places only', path.n === 3 && path.sep === '""' && path.first === 'none' && /svg/.test(path.mask), JSON.stringify(path));

  /* === Grid =============================================================== */
  const g = await p.evaluate(() => {
    const rows = [...document.querySelectorAll('#grid ~ .demo table[role="grid"] tbody tr')];
    return { stops: rows.map(r => r.getAttribute('tabindex')).join(','), links: [...document.querySelectorAll('#grid ~ .demo table[role="grid"] a')].every(a => a.tabIndex === -1) };
  });
  check('grid: one tab stop, on the selected row, and its links out of the Tab order', g.stops === '0,-1,-1,-1' && g.links, JSON.stringify(g));
  await p.evaluate(() => {
    window.__sel = 0;
    document.addEventListener('pudl:row-select', () => window.__sel++);
    history.replaceState(null, '', location.pathname);
    /* Use real page addresses for navigation checks. The reference page's
       placeholder fragment links intentionally stay in their examples. */
    document.querySelectorAll('#grid ~ .demo table[role="grid"] a[href]').forEach(a => {
      a.setAttribute('href', location.pathname + '#grid');
    });
  });
  await p.focus('#grid ~ .demo table[role="grid"] tbody tr[aria-selected="true"]');
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('ArrowDown');
  const moved = await p.evaluate(() => ({
    sel: [...document.querySelectorAll('#grid ~ .demo tbody tr')].map(r => r.getAttribute('aria-selected')).join(','),
    focus: document.activeElement.textContent.trim().slice(0, 8), events: window.__sel
  }));
  check('grid: the arrow keys move the selection with focus', moved.sel === 'false,false,true,false' && moved.focus === 'build.sh' && moved.events === 2, JSON.stringify(moved));
  await p.keyboard.press('Enter');
  await p.waitForURL(/#grid$/);
  check('grid: Enter opens the row by its first link', await p.evaluate(() => location.hash === '#grid'));
  await p.evaluate(() => history.replaceState(null, '', location.pathname));
  await p.dblclick('#grid ~ .demo tbody tr:nth-child(4) td:nth-child(2)');
  await p.waitForURL(/#grid$/);
  check('grid: a double-click opens the row', await p.evaluate(() => location.hash === '#grid' &&
        document.querySelector('#grid ~ .demo tbody tr:nth-child(4)').getAttribute('aria-selected') === 'true'));

  /* === Glyphs and drop targets ============================================ */
  const gl = await p.evaluate(() => {
    const el = document.querySelector('#grid ~ .demo .demo-row .glyph');
    const cs = getComputedStyle(el);
    const zone = document.querySelector('#grid ~ .demo .drop-zone[data-drop-over]');
    const idle = document.querySelector('#grid ~ .demo .data-table-wrap.drop-zone');
    return { mask: /svg/.test(cs.maskImage || cs.webkitMaskImage), w: el.getBoundingClientRect().width, font: parseFloat(cs.fontSize),
             hint: getComputedStyle(zone.querySelector('.drop-hint')).display, ring: /inset/.test(getComputedStyle(zone).boxShadow) || getComputedStyle(zone).boxShadow !== 'none',
             target: getComputedStyle(document.querySelector('[data-drop-target]')).boxShadow !== 'none', idleRing: getComputedStyle(idle).boxShadow };
  });
  check('glyph: an element draws a glyph token at the text size', gl.mask && Math.abs(gl.w - gl.font) < 0.5, JSON.stringify(gl));
  check('drop: a zone being dragged over is ringed and shows its hint; an idle zone does not', gl.ring && gl.hint === 'block' && gl.target && gl.idleRing === 'none', JSON.stringify(gl));

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
