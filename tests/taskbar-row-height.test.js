/* A stack is a button and an ordinary taskbar entry is a link, so they take
   their line height from different places. Every entry in one taskbar row
   must still be the same height, whatever the skin, theme, execution state,
   text size and width, and across the switch between stacks and windows. */
const assert = require('assert/strict');
const { launch, ROOT, out } = require('./lib');

(async () => {
  const browser = await launch();
  let failures = 0;
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
    const errors = [];
    const peerIds = ['probe-action', 'probe-icon', 'probe-status', 'probe-status-link', 'probe-tray'];
    const peerMarkup = '<button class="btn" id="probe-action" style="font-size:10px">Action</button>' +
      '<button class="icon-btn" id="probe-icon" aria-label="Settings" style="font-size:14px"><span class="glyph" aria-hidden="true"></span></button>' +
      '<div class="status-area" id="probe-tray" aria-label="Status tray"><button class="status-item" id="probe-status">Ready</button>' +
      '<a class="status-item" id="probe-status-link" href="#status">Details</a></div>';
    page.on('pageerror', error => errors.push(error.message));
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
    async function load() {
      await page.goto(ROOT + '/tests/fixtures/taskbar-stacks-full.html');
      await page.waitForFunction(() => window.pudlWindows && pudlWindows.state().open.includes('child'));
      await page.evaluate(markup => document.getElementById('wide-bar').insertAdjacentHTML('beforeend', markup), peerMarkup);
      await settle();
    }
    async function width(value) {
      await page.evaluate(value => { document.getElementById('probe-bar').style.width = value + 'px'; }, value);
      await settle();
    }
    /* The heights of the entries that are showing, with what kind each is. */
    const rows = () => page.locator('#probe').evaluate(dock => Array.from(dock.children)
      .filter(node => node.classList.contains('win-tab') && node.getClientRects().length && node.getBoundingClientRect().height > 0)
      .map(node => ({ kind: node.hasAttribute('data-win-stack') ? 'stack' : 'window', height: node.getBoundingClientRect().height })));
    async function equalRow(label, expectKinds) {
      const found = await rows();
      const kinds = new Set(found.map(entry => entry.kind));
      for (const kind of expectKinds) assert(kinds.has(kind), label + ': the row shows a ' + kind + ' ' + JSON.stringify(found));
      const heights = found.map(entry => entry.height);
      assert(Math.max(...heights) - Math.min(...heights) < 0.5, label + ': entries differ in height ' + JSON.stringify(found));
      const peers = await page.locator('#wide-bar').evaluate(bar => Array.from(bar.querySelectorAll(
        ':scope > .btn, :scope > .icon-btn, :scope > .status-area, :scope > .status-area > .status-item'))
        .filter(node => node.getClientRects().length).map(node => ({ name: node.id || 'tray', height: node.getBoundingClientRect().height })));
      assert.deepEqual(peers.map(peer => peer.name).sort(), peerIds, label + ': all expected peers and tray actions are visible');
      for (const peer of peers) assert(Math.abs(peer.height - heights[0]) < .5, label + ': peer/action differs ' + JSON.stringify(peer));
      const rearFaces = await page.locator('#probe > [data-win-stack]').evaluateAll(stacks => stacks.filter(n => n.getClientRects().length).map(stack => {
        const box = stack.getBoundingClientRect(), dock = stack.parentElement.getBoundingClientRect();
        const edges = stack.querySelector('.win-stack-edges');
        const offsets = ['::before', '::after'].map(pseudo => getComputedStyle(edges, pseudo)).filter(style => style.display !== 'none')
          .map(style => new DOMMatrixReadOnly(style.transform).m42);
        return { offsets, fits: box.bottom + Math.max(...offsets) <= dock.bottom + .5 };
      }));
      for (const faces of rearFaces) {
        assert(faces.offsets.length > 0 && faces.offsets.every(offset => offset === 2 || offset === 4), label + ': visible rear offsets');
        assert(faces.fits, label + ': rear faces remain inside the actual dock');
      }
      return heights[0];
    }
    async function trayBoundary(label) {
      const paint = await page.locator('#wide-bar > .status-area').evaluate(tray => {
        const style = getComputedStyle(tray);
        return { width: parseFloat(style.outlineWidth), style: style.outlineStyle, color: style.outlineColor, background: style.backgroundColor,
          height: tray.getBoundingClientRect().height, actions: Array.from(tray.children).map(n => ({ id: n.id, height: n.getBoundingClientRect().height })) };
      });
      assert(paint.width >= 1 && paint.style !== 'none' && paint.color !== 'rgba(0, 0, 0, 0)' && paint.color !== paint.background,
        label + ': tray boundary remains visible ' + JSON.stringify(paint));
      assert.deepEqual(paint.actions.map(action => action.id).sort(), ['probe-status', 'probe-status-link'], label + ': both tray actions exist');
      assert(paint.height > 0 && paint.actions.every(action => action.height === paint.height), label + ': every inner action matches the visible tray');
      // Include the surrounding focus paint in the retained invented-fixture image.
      const box = await page.locator('#probe-tray').boundingBox();
      assert(box && box.width > 0 && box.height > 0, label + ': tray is rendered');
      await page.screenshot({ path: out('tray-' + label.replace(/[^a-z0-9]+/gi, '-') + '.png'),
        clip: { x: box.x - 6, y: box.y - 6, width: box.width + 12, height: box.height + 12 } });
    }
    async function scenario(name, action) {
      try { await load(); await action(); console.log('PASS ' + name); }
      catch (error) { failures++; console.error('FAIL ' + name, error); }
    }
    const states = () => page.evaluate(() => {
      const set = { a1: 'working', b1: 'waiting', a2: 'stuck', b2: 'idle' };
      Object.keys(set).forEach(key => document.querySelector('[data-win="' + key + '"]').setAttribute('data-win-state', set[key]));
    });

    await scenario('stacks and ordinary entries are one height at the default size', async () => {
      await width(1250);
      const ordinary = await equalRow('separate', ['window']);
      assert.equal(ordinary, 30, 'the normal row matches the requested 30px');
      await width(560);
      assert.equal(await equalRow('stacked', ['stack', 'window']), ordinary, 'stacking does not change the row height');
    });
    await scenario('the row keeps its height as the layout switches between windows and stacks', async () => {
      const seen = new Set();
      for (const value of [1250, 560, 1250, 560, 1250]) { await width(value); seen.add(Math.round((await equalRow('width ' + value, [])) * 10)); }
      assert.equal(seen.size, 1, 'one height throughout: ' + [...seen]);
    });
    for (const skin of ['standard', ...require('../skins/registry.json').map(entry => entry.id)]) {
      for (const theme of ['light', 'dark']) {
        await scenario(skin + ' ' + theme + ' with execution states', async () => {
          if (skin !== 'standard') await page.addStyleTag({ url: ROOT + '/dist/pudl-skin-' + skin + '.css' });
          await page.evaluate(({ skin, theme }) => { document.documentElement.dataset.skin = skin; document.documentElement.dataset.theme = theme; }, { skin, theme });
          await states();
          await width(1250);
          const ordinary = await equalRow('separate', ['window']);
          await width(560);
          assert.equal(await equalRow('stacked', ['stack', 'window']), ordinary);
          assert.equal(ordinary, 30, 'every skin keeps the requested normal height');
          await page.locator('#probe-status').hover(); await trayBoundary(skin + '-' + theme + '-hover');
          await page.mouse.down(); await trayBoundary(skin + '-' + theme + '-active'); await page.mouse.up();
          await page.locator('#probe-status').focus(); await page.keyboard.press('Tab');
          assert.equal(await page.locator('#probe-status-link').evaluate(n => n.matches(':focus-visible') && getComputedStyle(n).boxShadow !== 'none'), true, 'tray action keyboard focus remains visible');
          await trayBoundary(skin + '-' + theme + '-focus');
        });
      }
    }
    await scenario('enlarged text keeps stacks and windows level without clipping', async () => {
      await page.evaluate(() => { document.documentElement.style.fontSize = '150%'; });
      await states();
      await width(1250);
      const ordinary = await equalRow('separate', ['window']);
      assert(ordinary > 30, 'shared row grows with enlarged root text');
      await width(560);
      assert.equal(await equalRow('stacked', ['stack', 'window']), ordinary);
      assert.equal(await page.locator('#probe').evaluate(dock => Array.from(dock.children).every(node => {
        const box = node.getBoundingClientRect();
        /* Rear faces deliberately paint into the dock's reserved padding.
           Check the foreground content bounds independently of that paint. */
        return Array.from(node.children).filter(child => !child.classList.contains('win-stack-edges') && child.getClientRects().length)
          .every(child => { const content = child.getBoundingClientRect(); return content.top >= box.top - .5 && content.bottom <= box.bottom + .5; });
      })), true, 'no entry clips its foreground content');
    });
    await scenario('a narrow layout keeps stacks and windows level', async () => {
      await page.setViewportSize({ width: 520, height: 900 });
      await width(500);
      await equalRow('narrow separate', []);
      await page.evaluate(() => { document.querySelector('[data-win-layer]').setAttribute('data-win-taskbar-stacks', 'full'); });
      await width(300);
      await equalRow('narrow', ['stack']);
    });
    await scenario('a docked window is the same height as its neighbours', async () => {
      await page.evaluate(() => pudlWindows.dock('a3', 'left'));
      await settle();
      await width(1250);
      const ordinary = await equalRow('separate', ['window']);
      await width(560);
      assert.equal(await equalRow('stacked', ['stack']), ordinary);
    });
    await scenario('forced colors preserve equal action heights and the tray boundary', async () => {
      await page.setViewportSize({ width: 1500, height: 1000 });
      await page.emulateMedia({ forcedColors: 'active' });
      await width(560); await equalRow('forced colors', ['stack']);
      await page.locator('#probe-status').focus(); await page.keyboard.press('Tab');
      const focus = await page.locator('#probe-status-link').evaluate(n => {
        const style = getComputedStyle(n);
        const reference = document.createElement('span'); reference.style.color = 'Highlight'; n.append(reference);
        const highlight = getComputedStyle(reference).color; reference.remove();
        return { visible: n.matches(':focus-visible'), active: n === document.activeElement,
          width: parseFloat(style.outlineWidth), style: style.outlineStyle, color: style.outlineColor, highlight };
      });
      assert(focus.active && focus.visible && focus.width >= 2 && focus.style === 'solid' && focus.color === focus.highlight,
        'forced-color keyboard focus retains the system Highlight outline ' + JSON.stringify(focus));
      await trayBoundary('forced-colors-focus');
      await page.emulateMedia({ forcedColors: 'none' });
    });
    const touch = await browser.newPage({ viewport: { width: 1100, height: 900 }, hasTouch: true, isMobile: true });
    try {
      await touch.goto(ROOT + '/tests/fixtures/taskbar-stacks-full.html');
      await touch.waitForFunction(() => window.pudlWindows && pudlWindows.state().open.includes('child'));
      await touch.evaluate(markup => document.getElementById('wide-bar').insertAdjacentHTML('beforeend', markup), peerMarkup);
      const targets = await touch.locator('#wide-bar').evaluate(bar => ({ coarse: matchMedia('(pointer: coarse)').matches,
        buttons: Array.from(bar.querySelectorAll('.win-tab, .btn, .icon-btn, .status-area, .status-item')).filter(n => n.getClientRects().length)
          .map(n => ({ id: n.id, height: n.getBoundingClientRect().height, width: n.getBoundingClientRect().width, peer: n.matches('.win-tab, .btn, .icon-btn') })) }));
      assert.deepEqual(targets.buttons.filter(target => target.id.startsWith('probe-')).map(target => target.id).sort(), peerIds, 'touch page retains every expected peer and tray action');
      assert(targets.buttons.length > 3);
      assert(targets.buttons.every(target => target.height === 30), 'normal and coarse-media buttons all retain 30px height');
      if (targets.coarse) assert(targets.buttons.filter(target => target.peer).every(target => target.width >= 40), 'coarse peer minimum widths remain');
      console.log('PASS taskbar action height with coarse-pointer capability=' + targets.coarse);
    } finally { await touch.close(); }
    assert.equal(failures, 0, 'every scenario must pass');
    assert.deepEqual(errors, [], 'no browser errors');
    console.log('ALL PASSED');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
