const { launch, ROOT, out } = require('./lib');
const assert = require('assert/strict');
(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', e => { errors.push(e.message); console.log('FAIL browser error ' + e.message + ' ' + e.stack); });
  const url = ROOT + '/tests/fixtures/split-docks.html';
  const groups = t => !t ? [] : t.type === 'group' ? [t] : [...groups(t.first), ...groups(t.second)];
  const state = () => page.evaluate(() => pudlWindows.state());
  const win = key => page.locator('.win[data-win="' + key + '"]');
  const dock = (key, edge, dest) => page.evaluate(([k, e, d]) => pudlWindows.dock(k, e, d), [key, edge, dest]);
  async function start(edge) {
    await page.goto(url); await page.waitForSelector('.win[data-win="e"]');
    await dock('a', edge); await dock('b', edge);
    await page.evaluate(e => pudlWindows.dockMode(e, 'open'), edge);
  }
  for (const edge of ['left', 'right', 'top', 'bottom']) {
    await start(edge);
    await dock('c', edge, { group: 'main', position: 'after' });
    let st = await state(), gs = groups(st.docks[edge].tree);
    assert.equal(gs.length, 2, edge + ' splits');
    assert.deepEqual(gs[0].order, ['a', 'b']);
    assert.equal(await win('b').isVisible(), true);
    assert.equal(await win('c').isVisible(), true);
    const b = await win('b').boundingBox(), c = await win('c').boundingBox();
    assert.ok(['left', 'right'].includes(edge) ? c.y >= b.y + b.height : c.x >= b.x + b.width, edge + ' panes do not overlap');
    await dock('d', edge, { group: gs[1].id, position: 'tab' });
    await page.locator('[data-dock-key="a"]').click();
    assert.equal(await win('d').isVisible(), true, 'other pane selection stays');
    await page.locator('#draft').fill('Keep this draft');
    await page.evaluate(() => window.keptDraft = document.querySelector('#draft'));
    await dock('e', edge, { group: gs[0].id, position: 'before' });
    st = await state(); gs = groups(st.docks[edge].tree);
    assert.equal(gs.length, 3, 'more than two panes');
    await page.evaluate(e => pudlWindows.dockArrange(e, 'equalize'), edge);
    const paneSizes = await page.locator('.win[data-win-dock-pane]:not([hidden])').evaluateAll((els, vertical) => els.map(el => vertical ? el.getBoundingClientRect().height : el.getBoundingClientRect().width), ['left', 'right'].includes(edge));
    assert.ok(Math.max(...paneSizes) - Math.min(...paneSizes) < 2, 'equalize accounts for divider tracks');
    const beforeSwap = groups((await state()).docks[edge].tree).map(g => g.order);
    await page.evaluate(([e, id]) => pudlWindows.dockArrange(e, 'swap', id), [edge, gs[0].id]);
    assert.deepEqual(groups((await state()).docks[edge].tree).map(g => g.order), [beforeSwap[1], beforeSwap[0], beforeSwap[2]]);
    assert.equal(await page.evaluate(() => window.keptDraft === document.querySelector('#draft')), true);
    assert.equal(await page.locator('#draft').inputValue(), 'Keep this draft');
    const isolated = await page.evaluate(e => { const copy = pudlWindows.state(); copy.docks[e].tree.first = null; return !!pudlWindows.state().docks[e].tree.first; }, edge);
    assert.equal(isolated, true, 'state is detached');
    const split = page.locator('.win-dock-splitter').first();
    await split.focus(); const before = Number(await split.getAttribute('aria-valuenow'));
    await page.keyboard.press(['left', 'right'].includes(edge) ? 'ArrowDown' : 'ArrowRight');
    assert.ok(Number(await split.getAttribute('aria-valuenow')) >= before);
    const saved = await state(), savedURL = page.url();
    assert.equal(await page.locator('#region-link').evaluate(a => new URL(a.href).searchParams.get('ds.' + a.ownerDocument.querySelector('.win-dock-group[data-dock-pane]').getAttribute('data-dock-edge'))), new URL(savedURL).searchParams.get('ds.' + edge), 'region link keeps the split');
    await page.reload(); await page.waitForSelector('.win-dock-splitter');
    assert.deepEqual((await state()).docks[edge], saved.docks[edge], 'URL round trip');
    await page.evaluate(e => pudlWindows.dockMode(e, 'rail'), edge);
    assert.equal(await page.locator('.win-dock-splitter').count(), 0);
    await page.locator('[data-dock-key="b"]').click();
    assert.equal(await win('b').isVisible(), true);
    await page.keyboard.press('Escape');
    await page.evaluate(e => pudlWindows.dockMode(e, 'open'), edge);
    assert.equal(await page.locator('.win-dock-splitter').count(), 2);
    await page.goto(savedURL); await page.waitForSelector('.win-dock-splitter');
    await page.evaluate(e => pudlWindows.dockArrange(e, 'merge'), edge);
    assert.equal((await state()).docks[edge].tree, undefined);
    assert.equal(new URL(page.url()).searchParams.has('ds.' + edge), false);
    assert.equal((await state()).open.length, 5);
    console.log('PASS ' + edge + ' independent tabs, three panes, mounted content, keyboard, URL, collapse and merge');
  }
  await start('right'); await dock('c', 'right', { group: 'main', position: 'after' });
  const original = (await state()).docks.right.tree;
  await page.setViewportSize({ width: 1440, height: 210 });
  await page.waitForFunction(() => pudlWindows.dockPresentation('right') === 'single' && !document.querySelector('.win-dock-splitter'));
  assert.equal(await page.locator('.win-dock-splitter').count(), 0);
  assert.deepEqual((await state()).docks.right.tree, original);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForSelector('.win-dock-splitter');
  await page.screenshot({ path: out('split-docks.png') });
  /* Drag a floating window into a split, then move a tab between panes. */
  await start('right');
  const rect = await win('b').boundingBox(), head = await win('c').locator('.win-head').boundingBox();
  await page.mouse.move(head.x + head.width / 2, head.y + 12); await page.mouse.down();
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height * .85, { steps: 8 });
  await page.waitForSelector('.win-dock-drop:not([hidden])');
  assert.equal(await page.locator('.win-dock-drop:not([hidden])').count(), 1);
  await page.mouse.up();
  await page.waitForSelector('.win-dock-splitter');
  let tree = (await state()).docks.right.tree, gs = groups(tree);
  assert.deepEqual(gs.map(g => g.order), [['a', 'b'], ['c']]);
  const aTab = await page.locator('[data-dock-key="a"]').boundingBox(), cRect = await win('c').boundingBox();
  await page.mouse.move(aTab.x + 12, aTab.y + 12); await page.mouse.down();
  await page.mouse.move(cRect.x + cRect.width / 2, cRect.y + cRect.height / 2, { steps: 8 }); await page.mouse.up();
  assert.deepEqual(groups((await state()).docks.right.tree).map(g => g.order), [['b'], ['c', 'a']]);
  console.log('PASS title and tab drags use pane drop targets');
  /* A divider drag is live, cancels with Escape, and records one undo step. */
  let handle = page.locator('.win-dock-splitter'), hb = await handle.boundingBox();
  const beforeDrag = (await state()).docks.right.tree.ratio, beforeURL = page.url();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await page.mouse.down();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + 75, { steps: 5 });
  await page.waitForFunction(ratio => pudlWindows.state().docks.right.tree.ratio !== ratio, beforeDrag);
  assert.notEqual((await state()).docks.right.tree.ratio, beforeDrag);
  assert.equal(page.url(), beforeURL);
  await page.keyboard.press('Escape'); await page.mouse.up();
  assert.equal((await state()).docks.right.tree.ratio, beforeDrag);
  hb = await handle.boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await page.mouse.down();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + 80, { steps: 5 }); await page.mouse.up();
  await page.waitForURL(u => u.href !== beforeURL);
  assert.notEqual(page.url(), beforeURL);
  await page.goBack(); await page.waitForFunction(r => pudlWindows.state().docks.right.tree.ratio === r, beforeDrag);
  console.log('PASS divider live resize, Escape and history');
  /* Minimized panes retain a tab strip and their saved membership. */
  await page.evaluate(() => pudlWindows.minimize('b'));
  assert.equal(await win('b').isVisible(), false);
  assert.equal(await page.locator('[data-dock-key="b"]').isVisible(), true);
  assert.ok((await win('a').boundingBox()).y < 60, 'a minimized pane gives its content space to its sibling');
  await page.locator('[data-dock-key="b"]').click();
  assert.equal(await win('b').isVisible(), true);
  await page.evaluate(() => { document.querySelector('[data-win="b"]').addEventListener('pudl:window-closing', e => e.preventDefault(), { once: true }); pudlWindows.close('b'); });
  assert.equal(groups((await state()).docks.right.tree).length, 2, 'refusal keeps pane');
  await page.evaluate(() => pudlWindows.close('b'));
  assert.equal((await state()).docks.right.tree, undefined, 'empty pane collapses');
  assert.deepEqual((await state()).docks.right.order, ['c', 'a']);
  console.log('PASS minimize, restoration, close refusal and empty pane removal');
  /* Menu destinations recheck room and expose explicit full-height merge. */
  await start('bottom');
  const commandId = 'dockto:bottom:main:after';
  assert.equal(await page.evaluate(id => pudlWindows.menuCommands('c').find(c => c.id === 'dock').items.find(c => c.id === id).disabled, commandId), false);
  await page.evaluate(id => pudlWindows.menuCommands('c').find(c => c.id === 'dock').items.find(c => c.id === id).run(), commandId);
  assert.equal(groups((await state()).docks.bottom.tree).length, 2);
  await page.evaluate(() => pudlWindows.menuCommands('d').find(c => c.id === 'dock').items.find(c => c.id === 'dockmerge:bottom').run());
  assert.equal((await state()).docks.bottom.tree, undefined);
  console.log('PASS menu split and full-width merge');
  /* Invalid restored trees retain the ordinary dock and every window. */
  const badURL = new URL(page.url());
  badURL.searchParams.set('ds.bottom', JSON.stringify({ v: 1, tree: { type: 'split', id: 'g1', axis: 'x', ratio: .5, first: { type: 'group', id: 'same', order: ['a'] }, second: { type: 'group', id: 'same', order: ['a'] } } }));
  await page.goto(badURL.href); await page.waitForSelector('.win[data-win="e"]');
  assert.equal((await state()).docks.bottom.tree, undefined);
  assert.equal((await state()).open.length, 5);
  console.log('PASS malformed tree fallback');
  /* A delayed response from an obsolete address cannot restore an old pane. */
  await start('left'); await dock('c', 'left', { group: 'main', position: 'after' });
  const raceURL = page.url();
  let releaseC, requestedC;
  const gate = new Promise(r => { releaseC = r; }), requestSeen = new Promise(r => { requestedC = r; });
  await page.route('**/tests/fixtures/split-docks.html*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('data-win-src="#tpl-{key}"', 'data-win-src="/split-window/{key}"') });
  });
  await page.route('**/split-window/*', async route => {
    const key = new URL(route.request().url()).pathname.split('/').pop();
    if (key === 'c') { requestedC(); await gate; }
    await route.fulfill({ contentType: 'text/html', body: '<section class="win" data-win="' + key + '" data-win-min="120,80"><header class="win-head"><h2 class="win-title">' + key + '</h2></header><div class="win-body">' + key + '</div></section>' });
  });
  await page.goto(raceURL); await requestSeen;
  const newer = new URL(raceURL); newer.searchParams.set('open', 'a,b,d,e'); newer.searchParams.delete('p.c'); newer.searchParams.set('top', 'b');
  await page.evaluate(href => { history.pushState(null, '', href); dispatchEvent(new PopStateEvent('popstate')); }, newer.href);
  await page.waitForFunction(() => pudlWindows.state().open.length === 4);
  const finished = page.waitForResponse(r => r.url().endsWith('/split-window/c'));
  releaseC(); await (await finished).finished();
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  assert.deepEqual((await state()).open, ['a', 'b', 'd', 'e']);
  assert.equal(await win('c').count(), 0);
  assert.equal((await state()).docks.left.tree, undefined);
  await page.unroute('**/tests/fixtures/split-docks.html*'); await page.unroute('**/split-window/*');
  console.log('PASS an obsolete asynchronous restore cannot bring back an old pane');
  /* Required and dock-only windows retain their restrictions inside panes. */
  await page.route('**/tests/fixtures/split-docks.html*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('data-win-default="a,b,c,d,e"', 'data-win-default="a,b,c,d,e" data-win-required="a"').replace('data-win="a" data-win-min', 'data-win="a" data-win-dock-only data-win-min') });
  });
  await start('left'); await dock('c', 'left', { group: 'main', position: 'after' });
  const requiredBefore = await state();
  await page.evaluate(() => { pudlWindows.close('a'); pudlWindows.dock('a', 'top', { group: 'main', position: 'tab' }); });
  assert.equal((await state()).place.a.mode, 'dock-left');
  assert.deepEqual((await state()).open, requiredBefore.open);
  const cg = groups((await state()).docks.left.tree).find(g => g.order.includes('c'));
  await dock('a', 'left', { group: cg.id, position: 'tab' });
  assert.deepEqual(groups((await state()).docks.left.tree).find(g => g.order.includes('a')).order, ['a', 'c']);
  await page.evaluate(() => pudlWindows.rekey('c', 'changed'));
  assert.ok(groups((await state()).docks.left.tree).some(g => g.order.includes('changed')));
  assert.equal(new URL(page.url()).searchParams.get('ds.left').includes('"c"'), false);
  await page.unroute('**/tests/fixtures/split-docks.html*');
  console.log('PASS required windows, dock-only policy and rekeying');
  /* Server strips and panels work without script and are adopted in place. */
  const serverTree = { type: 'split', id: 'root', axis: 'y', ratio: .5, first: { type: 'group', id: 'main', order: ['a', 'b'], selected: 'a' }, second: { type: 'group', id: 'g1', order: ['c'], selected: 'c' } };
  const serverURL = new URL(url);
  serverURL.searchParams.set('open', 'a,b,c'); serverURL.searchParams.set('top', 'c'); serverURL.searchParams.set('d.right', 'open');
  for (const key of ['a', 'b', 'c']) serverURL.searchParams.set('p.' + key, 'dock-right:0.1,0.1,0.5,0.5,0.25');
  serverURL.searchParams.set('ds.right', JSON.stringify({ v: 1, activeGroup: 'g1', tree: serverTree }));
  async function serveStrips(route) {
    const response = await route.fetch();
    const link = (key, pane) => {
      const dest = new URL(serverURL), tree = JSON.parse(JSON.stringify(serverTree));
      (pane === 'main' ? tree.first : tree.second).selected = key;
      dest.searchParams.set('top', key); dest.searchParams.set('ds.right', JSON.stringify({ v: 1, activeGroup: pane, tree }));
      return dest.href.replace(/&/g, '&amp;');
    };
    const strip = (id, keys, selected, y) => '<div class="win-dock-group" data-dock-edge="right" data-dock-pane="' + id + '" style="top:' + y + 'px;right:0;width:25%"><div class="tablist win-dock-tablist" role="tablist" aria-label="' + id + '">' + keys.map(key => '<div class="section-tab win-dock-entry" role="presentation" data-dock-entry="' + key + '"' + (key === selected ? ' data-selected' : '') + '><a id="server-tab-' + key + '" role="tab" data-dock-key="' + key + '" aria-selected="' + (key === selected) + '" href="' + link(key, id) + '">' + key + '</a></div>').join('') + '</div></div>';
    const panels = ['a', 'b', 'c'].map(key => '<section id="server-' + key + '" class="win" data-win="' + key + '" data-win-mode="dock-right" data-win-edge="right" data-win-min="120,80" data-win-dock-shared data-win-dock-pane="' + (key === 'c' ? 'g1' : 'main') + '" role="tabpanel" aria-labelledby="server-tab-' + key + '" style="--dock-pane-x:1080px;--dock-pane-y:' + (key === 'c' ? 506 : 0) + 'px;--dock-pane-w:360px;--dock-pane-h:494px"' + (key === 'b' ? ' hidden' : '') + '><header class="win-head"><h2 class="win-title">' + key + '</h2></header><div class="win-body">Server ' + key + '</div></section>').join('');
    let body = await response.text();
    body = body.replace('data-win-dock-splits></div>', 'data-win-dock-splits style="--dock-right:25%">' + strip('main', ['a', 'b'], 'a', 0) + strip('g1', ['c'], 'c', 506) + panels + '</div>');
    body = body.replace('</body>', '<script>window.serverPanel = document.querySelector("#server-a"); window.serverStrip = document.querySelector("[data-dock-pane=main]");</script></body>');
    await route.fulfill({ response, body });
  }
  const staticContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 1000 } });
  const staticPage = await staticContext.newPage();
  await staticPage.route('**/tests/fixtures/split-docks.html*', serveStrips);
  await staticPage.goto(serverURL.href);
  assert.equal(await staticPage.locator('#server-a').isVisible(), true);
  assert.equal(await staticPage.locator('#server-c').isVisible(), true);
  assert.equal(await staticPage.locator('#server-b').isVisible(), false);
  await staticContext.close();
  await page.route('**/tests/fixtures/split-docks.html*', serveStrips);
  await page.goto(serverURL.href); await page.waitForSelector('.win-dock-splitter');
  assert.equal(await page.evaluate(() => window.serverPanel === document.querySelector('#server-a') && window.serverStrip === document.querySelector('[data-dock-pane=main]')), true);
  await page.locator('[data-dock-key="b"]').click();
  assert.equal(await page.locator('#server-b').isVisible(), true);
  assert.equal(await page.locator('#server-c').isVisible(), true);
  await page.unroute('**/tests/fixtures/split-docks.html*');
  console.log('PASS static server rendering and adoption preserve panels and strips');
  if (browser.browserType().name() === 'chromium') {
    const touch = await browser.newPage({ hasTouch: true, viewport: { width: 1440, height: 1000 } });
    touch.on('pageerror', e => errors.push(e.message));
    await touch.goto(url); await touch.waitForSelector('.win[data-win="e"]');
    await touch.evaluate(() => { pudlWindows.dock('a', 'right'); pudlWindows.dock('b', 'right'); pudlWindows.dockMode('right', 'open'); });
    assert.equal(await touch.locator('[data-dock-key="b"]').evaluate(el => getComputedStyle(el).touchAction), 'auto');
    await touch.locator('[data-win="c"] [data-win-action="menu"]').tap();
    await touch.locator('#win-menu-c [data-win-cmd="dockto:right:main:after"]').tap();
    await touch.waitForSelector('.win-dock-splitter');
    assert.equal(Math.round((await touch.locator('.win-dock-splitter').boundingBox()).height), 20);
    await touch.close();
    console.log('PASS touch placement menus and the larger divider target');
  }
  /* The public sample also works on each edge and keeps the editor mounted. */
  await page.goto(ROOT + '/samples/split-docks.html'); await page.waitForSelector('.win-dock-splitter');
  await page.locator('textarea').fill('Sample draft');
  for (const edge of ['left', 'top', 'bottom', 'right']) {
    await page.locator('[data-demo-edge="' + edge + '"]').click();
    await page.waitForFunction(e => pudlWindows.state().docks[e] && !!pudlWindows.state().docks[e].tree, edge);
    assert.equal(await page.locator('textarea').inputValue(), 'Sample draft');
    assert.equal(await page.locator('.win-dock-splitter').count(), 1);
  }
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await page.screenshot({ path: out('split-docks-sample.png') });
  await page.emulateMedia({ forcedColors: 'active' });
  assert.notEqual(await page.locator('.win-dock-splitter').evaluate(e => getComputedStyle(e).borderTopStyle), 'none');
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; document.documentElement.setAttribute('data-theme', 'dark'); });
  await page.waitForFunction(() => {
    const entry = document.querySelector('[data-dock-entry="browser"]'), button = document.querySelector('[data-dock-menu="browser"]');
    return Math.abs(button.getBoundingClientRect().left - entry.getBoundingClientRect().left - 5) < 1;
  });
  await page.screenshot({ path: out('split-docks-dark-rtl.png') });
  await page.evaluate(() => pudlWindows.dockMode('right', 'auto'));
  await page.setViewportSize({ width: 390, height: 700 });
  await page.waitForFunction(() => !document.querySelector('.win-dock-splitter'));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  console.log('PASS public sample, forced colors, RTL and phone overflow');
  assert.deepEqual(errors, [], errors.join('\n'));
  console.log('PASS narrow presentation preserves the tree and restores it');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
