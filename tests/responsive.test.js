const { launch, ROOT } = require('./lib');
const assert = require('node:assert/strict');
(async () => {
  const browser = await launch();
  const p = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  p.setDefaultTimeout(10000);
  const errors = [], warnings = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', e => { if (e.type() === 'warning') warnings.push(e.text()); });
  await p.goto(ROOT + '/tests/fixtures/responsive.html');
  await p.waitForFunction(() => window.pudlWindows && pudlWindows.state().open.length === 3);
  await p.evaluate(() => {
    pudlWindows.raise('reader');
    window.savedElement = document.querySelector('[data-win="reader"]');
    window.savedInput = savedElement.querySelector('input');
    savedElement.querySelector('.win-body').scrollTop = 100;
    window.savedPlacement = pudlWindows.state().place.reader;
    window.savedCommands = pudlWindows.menuCommands('reader');
  });
  const url = p.url(), history = await p.evaluate(() => window.history.length);
  await p.setViewportSize({ width: 500, height: 900 });
  await p.waitForFunction(() => document.querySelector('[data-win="reader"]').hasAttribute('data-win-restricted'));
  assert.equal(p.url(), url);
  assert.equal(await p.evaluate(() => window.history.length), history);
  assert(await p.evaluate(() => JSON.stringify(pudlWindows.state().place.reader) === JSON.stringify(savedPlacement)));
  assert(await p.evaluate(() => {
    const r = savedElement.getBoundingClientRect(), l = document.querySelector('[data-win-layer]').getBoundingClientRect();
    return Math.abs(r.width - l.width) < 2 && savedInput === savedElement.querySelector('input') && savedElement.querySelector('.win-body').scrollTop === 100;
  }));
  assert.equal(await p.evaluate(() => pudlWindows.effectivePlacement('reader').mode), 'maximized');
  assert.equal(await p.evaluate(() => pudlWindows.effectivePlacement('tool').mode), 'floating');
  assert(warnings.some(w => w.includes('ignored on content-sized')));
  await p.evaluate(() => {
    savedCommands.find(c => c.id === 'maximize').run();
    savedCommands.find(c => c.id === 'dock').run();
    savedCommands.find(c => c.id === 'reset').run();
    savedCommands.find(c => c.id === 'snap').items[0].run();
    pudlWindows.snap('reader', 'right'); pudlWindows.dock('reader', 'bottom');
    const restore = pudlWindows.menuCommands('reader').find(c => c.id === 'restore');
    if (!restore.disabled) throw Error('Restore must be disabled');
    restore.run();
    const detached = pudlWindows.effectivePlacement('reader'); detached.mode = 'left';
  });
  await p.locator('[data-win="reader"] .win-head').focus();
  await p.keyboard.press('ArrowLeft'); await p.keyboard.press('Shift+ArrowRight'); await p.keyboard.press('Enter');
  assert.equal(p.url(), url);
  await p.evaluate(() => pudlWindows.open('extra'));
  await p.waitForFunction(() => pudlWindows.state().open.includes('extra'));
  assert.equal(await p.evaluate(() => pudlWindows.effectivePlacement('extra').mode), 'maximized');
  assert.equal(await p.evaluate(() => pudlWindows.state().place.extra.w), .4);
  await p.evaluate(() => pudlWindows.close('extra'));
  await p.evaluate(() => {
    pudlWindows.minimize('reader');
    if (!savedElement.hidden) throw Error('Restricted window must hide on minimize');
    pudlWindows.menuCommands('reader').find(c => c.id === 'unminimize').run();
    if (savedElement.hidden) throw Error('Unminimize must show the window');
  });
  await p.setViewportSize({ width: 1100, height: 900 });
  await p.waitForFunction(() => !savedElement.hasAttribute('data-win-restricted'));
  assert(await p.evaluate(() => JSON.stringify(pudlWindows.state().place.reader) === JSON.stringify(savedPlacement)));
  console.log('PASS responsive presentation preserves URL placement, identity, scroll and command policy');

  // An opted-in dock suspends its strip; an unrestricted dock keeps its own.
  await p.evaluate(() => { pudlWindows.dock('reader', 'left'); pudlWindows.dock('notes', 'top'); pudlWindows.raise('reader'); });
  const dockURL = p.url();
  await p.setViewportSize({ width: 500, height: 900 });
  await p.waitForFunction(() => savedElement.hasAttribute('data-win-restricted'));
  assert.equal(p.url(), dockURL);
  await p.evaluate(() => pudlWindows.minimize('reader'));
  const minimizedDockURL = p.url();
  await p.setViewportSize({ width: 1100, height: 900 });
  await p.waitForFunction(() => document.querySelector('[data-win="reader"]').classList.contains('win-collapsed'));
  assert.equal(p.url(), minimizedDockURL);
  assert(await p.locator('[data-win="reader"]').evaluate(w => w.querySelector('.win-head').getBoundingClientRect().width >= 40));
  await p.setViewportSize({ width: 500, height: 900 });
  await p.waitForFunction(() => document.querySelector('[data-win="reader"]').hidden);
  assert.equal(p.url(), minimizedDockURL);
  await p.evaluate(() => pudlWindows.raise('reader'));
  assert.equal(p.url(), dockURL);
  assert(await p.evaluate(() => {
    const l = document.querySelector('[data-win-layer]');
    return l.style.getPropertyValue('--dock-bottom') === '0px' && l.style.getPropertyValue('--dock-top') !== '0px' && !savedElement.hasAttribute('data-win-edge');
  }));
  await p.reload();
  await p.waitForFunction(() => window.pudlWindows && pudlWindows.state().place.reader);
  assert.equal(await p.evaluate(() => pudlWindows.state().place.reader.mode), 'dock-left');
  assert.equal(await p.evaluate(() => pudlWindows.effectivePlacement('reader').mode), 'maximized');
  await p.setViewportSize({ width: 1100, height: 900 });
  await p.waitForFunction(() => document.querySelector('[data-win="reader"]').getAttribute('data-win-edge') === 'left');
  assert.equal(p.url(), dockURL);
  await p.evaluate(() => { pudlWindows.dock('notes', null); pudlWindows.dock('reader', null); });
  console.log('PASS restricted docking survives direct URLs and mixed dock policies');

  // The generated site Window menu uses the same restrictions and closes on transition.
  await p.click('.menubar-title', { strict: false });
  await p.keyboard.press('Escape');
  await p.locator('.menubar-title').filter({ hasText: 'Window' }).click();
  await p.waitForFunction(() => document.querySelector('.menubar-panel:popover-open'));
  await p.evaluate(() => document.querySelector('[data-win-layer]').setAttribute('data-win-narrow-width', '1200'));
  await p.waitForFunction(() => !document.querySelector('.menubar-panel:popover-open'));
  await p.locator('.menubar-title').filter({ hasText: 'Window' }).click();
  await p.waitForFunction(() => document.querySelector('.menubar-panel:popover-open'));
  assert(await p.locator('.menubar-panel .menu-action').filter({ hasText: 'Restore to floating' }).isDisabled());
  await p.keyboard.press('Escape');
  await p.evaluate(() => document.querySelector('[data-win-layer]').removeAttribute('data-win-narrow-width'));
  await p.waitForFunction(() => !document.querySelector('[data-win="reader"]').hasAttribute('data-win-restricted'));

  // Change the workspace container, without changing the browser viewport, during a drag.
  const head = p.locator('[data-win="reader"] .win-head');
  const box = await head.boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.mouse.down(); await p.mouse.move(box.x + box.width / 2 + 30, box.y + 30);
  const beforeDrag = p.url();
  await p.evaluate(() => document.querySelector('.win-host').style.width = '500px');
  await p.waitForFunction(() => document.querySelector('[data-win="reader"]').hasAttribute('data-win-restricted'));
  await p.mouse.up();
  assert.equal(p.url(), beforeDrag);
  assert.equal(await p.locator('.win-moving').count(), 0);
  await p.click('[data-win="reader"] [data-win-action="menu"]');
  await p.waitForFunction(() => document.querySelector('#win-menu-reader').matches(':popover-open'));
  await p.evaluate(() => document.querySelector('.win-host').style.width = '');
  await p.waitForFunction(() => !document.querySelector('#win-menu-reader').matches(':popover-open'));
  assert(await p.locator('#sidebar').isVisible());
  await p.evaluate(() => pudlWindows.minimize('reader'));
  await p.click('[data-win-tab="reader"]');
  assert(await p.locator('[data-win="reader"]').isVisible());
  console.log('PASS policy transitions cancel gestures and menus; the external taskbar restores windows');

  // Compact chrome retains the menu and separates its glyph size from its target.
  assert(await p.evaluate(() => {
    const w = document.querySelector('[data-win="reader"]'), b = w.querySelector('[data-win-action="menu"]');
    return b.getBoundingClientRect().width === 40 && getComputedStyle(b, '::before').width === '20px' && getComputedStyle(w.querySelector('[data-win-action="maximize"]')).display === 'none';
  }));
  console.log('PASS compact chrome retains an accessible menu with independent target and glyph sizing');

  // Both splitter axes retain the value and mounted contents while presenting one pane.
  for (const stacked of [false, true]) {
    await p.evaluate(stacked => {
      const s = document.querySelector('#split-test'); s.classList.toggle('stacked', stacked);
      s.style.width = '500px'; s.style.height = '300px'; s.style.setProperty('--split-a', '150px');
      window.firstInput = s.querySelector('input'); pudlSplit.refresh();
    }, stacked);
    for (const pane of ['first', 'second', 'first']) {
      await p.evaluate(pane => document.querySelector('#split-test').setAttribute('data-split-pane', pane), pane);
      await p.waitForTimeout(40);
      assert.equal(await p.locator('#split-test').evaluate(s => s.style.getPropertyValue('--split-a')), '150px');
      assert.equal(await p.locator('#split-test .split-handle').isVisible(), false);
    }
    await p.evaluate(() => document.querySelector('#split-test').removeAttribute('data-split-pane'));
    await p.locator('#split-test .split-handle').focus();
    await p.keyboard.press(stacked ? 'ArrowDown' : 'ArrowRight');
    assert.equal(await p.locator('#split-test').evaluate(s => s.style.getPropertyValue('--split-a')), '166px');
    assert(await p.evaluate(() => firstInput === document.querySelector('#split-test input')));
    await p.keyboard.press('End');
    const geometry = await p.locator('#split-test').evaluate(s => {
      const h = s.children[1].getBoundingClientRect(), a = s.children[0].getBoundingClientRect(), b = s.children[2].getBoundingClientRect();
      return s.classList.contains('stacked') ? [h.height, h.top - a.bottom, b.top - h.bottom, b.height] : [h.width, h.left - a.right, b.left - h.right, b.width];
    });
    assert.deepEqual(geometry, [18, 0, 0, 80]);
    await p.locator('#split-test .split-handle').scrollIntoViewIfNeeded();
    const handle = await p.locator('#split-test .split-handle').boundingBox();
    const saved = await p.locator('#split-test').evaluate(s => s.style.getPropertyValue('--split-a'));
    await p.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await p.mouse.down();
    await p.mouse.move(handle.x + handle.width / 2 - 30, handle.y + handle.height / 2 - 30);
    await p.locator('#split-test .split-handle').dispatchEvent('pointercancel');
    await p.mouse.up();
    assert.equal(await p.locator('#split-test').evaluate(s => s.style.getPropertyValue('--split-a')), saved);
    await p.evaluate(() => { const s = document.querySelector('#split-test'); s.style.width = '100px'; s.style.height = '100px'; pudlSplit.refresh(); });
    assert.equal(await p.locator('#split-test .split-handle').getAttribute('aria-valuemax'), '41');
  }
  console.log('PASS both splitter axes preserve mounted panes and respect actual track space and impossible minima');

  // Desktop submenus share the viewport bounds; narrow submenus reveal Back and their first command.
  await p.setViewportSize({ width: 1100, height: 1000 });
  await p.evaluate(() => {
    document.querySelector('[data-menubar-source] li ul').innerHTML = '<li>Nested<ul>' +
      Array.from({ length: 50 }, (_, i) => '<li><button>Nested command ' + i + '</button></li>').join('') + '</ul></li>';
    pudlMenubar.refresh();
  });
  await p.locator('.menubar-title').filter({ hasText: 'Site' }).click();
  await p.locator('#menubar-panel > .menu-action').filter({ hasText: 'Nested' }).hover();
  await p.waitForFunction(() => document.querySelector('#menubar-sub:popover-open.menu-more-below'));
  assert(await p.locator('#menubar-sub').evaluate(m => m.getBoundingClientRect().height > 700 && m.getBoundingClientRect().bottom <= innerHeight));
  await p.setViewportSize({ width: 1100, height: 300 });
  await p.waitForFunction(() => document.querySelector('#menubar-sub').getBoundingClientRect().bottom <= innerHeight);
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape');
  await p.setViewportSize({ width: 500, height: 700 });
  await p.locator('.menubar-title').filter({ hasText: 'Site' }).click();
  await p.locator('#menubar-panel > .menu-action').filter({ hasText: 'Nested' }).click();
  await p.waitForFunction(() => document.querySelector('#menubar-panel').textContent.includes('Back'));
  assert(await p.locator('#menubar-panel').evaluate(m => {
    const first = m.querySelector('.menu-action').getBoundingClientRect();
    return m.scrollTop === 0 && first.top >= m.getBoundingClientRect().top;
  }));
  await p.keyboard.press('Escape');
  console.log('PASS desktop submenus follow viewport changes and narrow submenus start with Back');

  // A long menu uses the available height and keeps independent cues out of command rows.
  await p.setViewportSize({ width: 500, height: 1000 });
  await p.evaluate(() => {
    const button = document.querySelector('#long-button'); button.style.cssText = 'position:fixed;top:5px;left:5px;z-index:1000';
    const panel = document.querySelector('#long-menu');
    for (let i = 0; i < 50; i++) { const b = document.createElement('button'); b.className = 'menu-action'; b.textContent = 'Command ' + i; panel.appendChild(b); }
    button.click();
  });
  await p.waitForFunction(() => document.querySelector('#long-menu').classList.contains('menu-more-below'));
  const initial = await p.locator('#long-menu').evaluate(m => ({ height: m.getBoundingClientRect().height, above: m.classList.contains('menu-more-above'), bottom: m.getBoundingClientRect().bottom, pointer: getComputedStyle(m, '::after').pointerEvents }));
  assert(initial.height > 700 && initial.bottom <= 1000 && !initial.above && initial.pointer === 'none', JSON.stringify(initial));
  await p.locator('#long-menu').evaluate(m => { m.scrollTop = 200; pudlMenu.place(m); });
  assert.equal(await p.locator('#long-menu').evaluate(m => m.scrollTop), 200);
  await p.waitForFunction(() => document.querySelector('#long-menu').classList.contains('menu-more-above'));
  assert(await p.locator('#long-menu').evaluate(m => m.classList.contains('menu-more-below')));
  await p.locator('#long-menu').evaluate(m => m.lastElementChild.focus());
  await p.keyboard.press('End');
  await p.waitForFunction(() => !document.querySelector('#long-menu').classList.contains('menu-more-below'));
  await p.setViewportSize({ width: 500, height: 180 });
  await p.waitForFunction(() => document.querySelector('#long-menu').getBoundingClientRect().bottom <= innerHeight);
  await p.locator('#long-menu').evaluate(m => { m.innerHTML = '<button class="menu-action">Back</button><button class="menu-action">First command</button>'; });
  await p.waitForFunction(() => document.querySelector('#long-menu').scrollTop === 0);
  console.log('PASS menus fill the visible height, track both overflow directions and reset replaced content');

  // URL restoration can adopt one fragment while another remains in flight.
  let releaseFragment;
  const heldFragment = new Promise(resolve => { releaseFragment = resolve; });
  await p.route('**/windows/url-state.html', async route => {
    await heldFragment;
    await route.continue();
  });
  await p.goto(ROOT + '/samples/article-reader.html?open=url-state,url-state-parse&top=url-state-parse');
  await p.waitForSelector('[data-win="url-state-parse"]', { state: 'attached' });
  await p.setViewportSize({ width: 1100, height: 900 });
  await p.waitForTimeout(50);
  assert.equal(await p.locator('[data-win="url-state-parse"]').count(), 1);
  releaseFragment();
  await p.waitForFunction(() => window.pudlWindows && pudlWindows.state().open.length === 2);
  assert.equal(await p.locator('.win').count(), 2);
  console.log('PASS a policy refresh during partial URL loading preserves both requested windows');
  assert.deepEqual(errors, []);
  await browser.close();
  console.log('ALL PASSED');
})().catch(e => {
  const location = (e.stack || '').match(/at .*responsive\.test\.js:\d+:\d+/);
  console.error('FAIL responsive workspace ' + (location ? location[0] : '') + ' ' + e.message.replace(/\s+/g, ' '));
  process.exit(1);
});
