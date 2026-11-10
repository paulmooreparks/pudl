const assert = require('assert/strict');
const fs = require('fs');
const { launch, ROOT, out } = require('./lib');
const skins = ['standard', ...require('./skins/skin-list')(__dirname + '/..')];

(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
    const errors = [], records = [];
    page.on('pageerror', e => errors.push(e.message));
    const settle = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const stack = group => page.locator('#all > [data-win-stack="' + group + '"]');
    await page.goto(ROOT + '/tests/fixtures/taskbar-stacks.html');
    await stack('alpha').waitFor();
    await page.evaluate(async skins => {
      await Promise.all(skins.filter(s => s !== 'standard').map(s => new Promise((resolve, reject) => {
        const link = document.createElement('link'); link.rel = 'stylesheet';
        link.href = '/dist/pudl-skin-' + s + '.css'; link.onload = resolve; link.onerror = reject; document.head.append(link);
      })));
      await document.fonts.ready;
    }, skins);
    const geometry = () => page.locator('#all').evaluate(dock => ({
      bar: dock.parentElement.getBoundingClientRect().toJSON(),
      entries: [...dock.children].filter(n => n.getClientRects().length).map(n => ({
        id: n.getAttribute('data-win-stack') || n.getAttribute('data-win-tab') || n.className,
        rect: n.getBoundingClientRect().toJSON()
      }))
    }));
    const paint = group => stack(group).evaluate(button => {
      const edges = button.querySelector('.win-stack-edges'), one = getComputedStyle(edges, '::before'), two = getComputedStyle(edges, '::after');
      const rect = button.getBoundingClientRect(), dock = button.parentElement.getBoundingClientRect();
      const bar = getComputedStyle(button.closest('.win-bar'));
      const canvas = document.createElement('canvas'), context = canvas.getContext('2d'); canvas.width = canvas.height = 1;
      const rgb = color => { context.clearRect(0, 0, 1, 1); context.fillStyle = color; context.fillRect(0, 0, 1, 1); return [...context.getImageData(0, 0, 1, 1).data]; };
      const lum = c => c.slice(0, 3).reduce((sum, v, i) => { v /= 255; return sum + (v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4) * [.2126, .7152, .0722][i]; }, 0);
      const border = rgb(one.borderTopColor), ground = rgb(bar.backgroundColor), a = lum(border), b = lum(ground);
      return { count: button.querySelector('.win-stack-count').textContent, depth: button.getAttribute('data-win-stack-depth'),
        one: one.display, two: two.display, fill: one.backgroundImage, color: one.backgroundColor, border: one.borderTopColor, transform: one.transform,
        contrast: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), ground: bar.backgroundColor,
        opaqueBoundary: border[3] === 255 && ground[3] === 255 && bar.backgroundImage === 'none',
        radius: one.borderTopLeftRadius, frontRadius: getComputedStyle(button).borderTopLeftRadius,
        decorative: edges.getAttribute('aria-hidden') === 'true' && !edges.hasAttribute('tabindex'),
        fits: rect.bottom + 4 <= dock.bottom + .5 && (getComputedStyle(button).direction === 'rtl' ? rect.left - 4 >= dock.left - .5 : rect.right + 4 <= dock.right + .5) };
    });
    for (const theme of ['light', 'dark']) for (const skin of skins) for (const dir of ['ltr', 'rtl']) {
      await page.evaluate(({theme, skin, dir}) => { const root = document.documentElement; root.dataset.theme = theme; root.dataset.skin = skin; root.dir = dir; }, {theme, skin, dir});
      await page.evaluate(() => pudlWindows.raise('spare'));
      await settle();
      const before = await geometry(), a = await paint('alpha'), b = await paint('beta');
      assert.equal(a.depth, '2'); assert.equal(a.count, '3'); assert.equal(a.two, 'block');
      assert.equal(b.depth, '1'); assert.equal(b.count, '2'); assert.equal(b.two, 'none');
      assert.equal(a.one, 'block'); assert.ok(a.fill !== 'none' || a.color !== 'rgba(0, 0, 0, 0)', skin); assert.equal(a.radius, a.frontRadius);
      assert.ok(a.decorative && b.decorative && a.fits && b.fits);
      assert.ok(a.opaqueBoundary && b.opaqueBoundary && a.contrast >= 3 && b.contrast >= 3, JSON.stringify({theme, skin, dir, a, b}));
      assert.equal(await page.locator('#all > [data-win-tab="spare"]').evaluate(n => getComputedStyle(n).overflow), 'hidden', 'ordinary entries retain their clipping');
      assert.match(a.transform, dir === 'rtl' ? /-2, 2\)$/ : /2, 2\)$/);
      const hide = await page.addStyleTag({ content: '.win-stack-edges { display: none !important; }' });
      assert.deepEqual(await geometry(), before, 'rear paint never changes layout'); await hide.evaluate(n => n.remove());
      if (dir === 'ltr') await page.locator('.win-bar').last().screenshot({ path: out('stack-edges-' + skin + '-' + theme + '.png') });
      await page.evaluate(() => pudlWindows.raise('a1')); await settle();
      const current = await paint('alpha'), box = await stack('beta').boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await settle();
      const pressed = await paint('beta');
      assert.ok(current.contrast >= 3 && pressed.contrast >= 3 && current.fits && pressed.fits);
      assert.equal(pressed.border, b.border, 'rear outline does not take on pressed-state color');
      if (dir === 'ltr') await page.locator('.win-bar').last().screenshot({ path: out('stack-edges-states-' + skin + '-' + theme + '.png') });
      await page.mouse.up(); await page.keyboard.press('Escape');
      records.push({theme, skin, dir, a, b, current, pressed});
    }
    console.log('PASS two-window and larger stacks use skin-derived rear faces without changing layout in both themes and directions');

    await page.evaluate(() => { document.documentElement.dir = 'ltr'; document.documentElement.dataset.skin = 'standard'; });
    await stack('alpha').focus(); await page.keyboard.press('Enter');
    await page.locator('.win-stack-panel:popover-open').waitFor();
    assert.equal((await paint('alpha')).two, 'block');
    await page.keyboard.press('Escape');
    assert.equal(await stack('alpha').evaluate(n => n === document.activeElement), true);
    const rect = await stack('alpha').boundingBox();
    await page.mouse.click(rect.x + rect.width + 1, rect.y + rect.height / 2);
    await page.locator('.win-stack-panel:popover-open').waitFor();
    await page.keyboard.press('Escape');
    console.log('PASS rear edge belongs to the same chooser button and keyboard focus returns to that button');

    const pressedBox = await stack('alpha').boundingBox(), rearBeforePress = await paint('alpha');
    await page.mouse.move(pressedBox.x + pressedBox.width / 2, pressedBox.y + pressedBox.height / 2);
    await page.mouse.down();
    const rearWhilePressed = await paint('alpha');
    assert.equal(rearWhilePressed.fill, rearBeforePress.fill); assert.equal(rearWhilePressed.border, rearBeforePress.border);
    await page.mouse.up(); await page.keyboard.press('Escape');

    await page.evaluate(() => pudlWindows.raise('a1'));
    await settle();
    assert.equal(await stack('alpha').getAttribute('aria-current'), 'true');
    assert.equal((await paint('alpha')).two, 'block');
    await page.evaluate(() => document.querySelector('[data-win="a1"]').setAttribute('data-win-state', 'waiting'));
    await settle();
    assert.equal((await paint('alpha')).two, 'block');
    const beforeDeparture = await geometry();
    await page.evaluate(() => pudlWindows.close('a3')); await settle();
    assert.equal((await paint('alpha')).depth, '1'); assert.equal((await paint('alpha')).two, 'none');
    assert.deepEqual(await geometry(), beforeDeparture, 'three to two windows does not move the row');
    await page.evaluate(() => pudlWindows.open('a3')); await settle();
    assert.equal((await paint('alpha')).depth, '2');
    assert.deepEqual(await geometry(), beforeDeparture, 'two to three windows does not move the row');
    await page.evaluate(() => pudlWindows.open('fresh')); await settle();
    assert.equal((await paint('alpha')).depth, '2'); assert.equal((await paint('alpha')).count, '4');
    assert.deepEqual(await geometry(), beforeDeparture, 'larger stacks keep two rear faces and stable geometry');
    await page.evaluate(() => pudlWindows.close('fresh')); await settle();
    await page.evaluate(() => { pudlWindows.close('a3'); pudlWindows.close('a2'); }); await settle();
    assert.equal(await stack('alpha').count(), 0);
    assert.equal(await page.locator('#all > [data-win-tab="a1"] .win-stack-edges').count(), 0);
    assert.equal(await page.locator('#all > [data-win-tab="a1"]').evaluate(n => getComputedStyle(n).overflow), 'hidden');
    console.log('PASS current and state changes retain raised rear faces; joins, departures and singleton restoration update depth');

    await page.goto(ROOT + '/samples/taskbar-pinning.html');
    const pin = page.locator('.win-bar [data-win-pin="editor"]');
    await pin.click(); await page.getByRole('link', { name: 'Open second editor' }).click(); await settle();
    assert.equal(await pin.getAttribute('data-win-stack-depth'), '1');
    await page.setViewportSize({ width: 500, height: 700 }); await settle();
    assert.equal(await pin.locator('.win-stack-edges').count(), 1);
    await page.evaluate(() => pudlWindows.close('editor-copy')); await settle();
    assert.equal(await pin.getAttribute('data-win-stack-depth'), null);
    console.log('PASS pinned aggregates get rear faces while stacked and remove them when one window remains');

    await page.goto(ROOT + '/tests/fixtures/taskbar-stacks.html'); await stack('alpha').waitFor();
    await page.setViewportSize({ width: 320, height: 700 }); await settle();
    assert.equal(await stack('alpha').getAttribute('data-win-stack-depth'), '2');
    const folded = await page.locator('#all').evaluate(d => d.scrollWidth <= d.clientWidth + 1 || d.closest('.win-bar').hasAttribute('data-win-taskbar-scroll'));
    assert.ok(folded, 'rear faces do not create unmanaged overflow');
    await page.emulateMedia({ forcedColors: 'active' }); await settle();
    const forced = await paint('alpha'); assert.equal(forced.fill, 'none'); assert.notEqual(forced.border, 'rgba(0, 0, 0, 0)');
    await page.screenshot({path:out('stack-edges-forced.png')});
    console.log('PASS folded stacks retain their silhouette and forced colors has explicit rear outlines');
    await page.emulateMedia({ forcedColors: 'none' });
    await page.setViewportSize({width:1100,height:700});
    await page.evaluate(() => { document.documentElement.style.fontSize = '150%'; }); await settle();
    assert.ok((await paint('alpha')).fits, 'enlarged rear faces stay inside the dock');
    await page.locator('.win-bar').last().screenshot({path:out('stack-edges-enlarged.png')});
    const touch = await browser.newPage({viewport:{width:390,height:700},hasTouch:true,isMobile:true});
    await touch.goto(ROOT + '/tests/fixtures/taskbar-stacks.html');
    await touch.locator('#all [data-win-stack="alpha"]').waitFor();
    const coarse = await touch.locator('#all [data-win-stack="alpha"]').evaluate(n => ({
      rect:n.getBoundingClientRect().toJSON(), depth:n.getAttribute('data-win-stack-depth'), coarse:matchMedia('(pointer: coarse)').matches
    }));
    if (coarse.coarse) assert.ok(coarse.rect.width >= 40 && coarse.rect.height >= 40, 'touch targets keep both dimensions');
    assert.equal(coarse.depth, '2');
    await touch.screenshot({path:out('stack-edges-touch.png')}); await touch.close();
    console.log('PASS enlarged text and compact touch targets retain the rear faces');
    fs.writeFileSync(out('stack-edges.json'), JSON.stringify(records, null, 2));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(e => { console.error('FAIL taskbar stack edges', e); process.exitCode = 1; });
