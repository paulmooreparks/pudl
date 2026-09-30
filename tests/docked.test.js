/* Docked windows, from docs/proposals/docked-windows.md. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
const FIX = ROOT + '/tests/fixtures/docked.html';
(async () => {
  const b = await launch();
  const errors = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(FIX);
  await p.waitForFunction(() => window.pudlWindows);
  const box = sel => p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), h: Math.round(r.height), w: Math.round(r.width) }; }, sel);
  const q = () => p.evaluate(() => location.search);
  const layer = () => box('[data-win-layer]');

  const L = await layer();
  let site = await box('.win[data-win="site"]');
  check('a default window docked at the bottom holds the foot of the layer, across its width, and the address stays plain',
        site.bottom === L.bottom && site.w === L.w && Math.abs(site.h - L.h * 0.22) <= 1 && (await q()) === '', JSON.stringify({ site, L, q: await q() }));
  const head = await p.evaluate(() => Math.round(document.querySelector('.win[data-win="site"] .win-head').getBoundingClientRect().height));
  check('its title bar is thin', head === 30, String(head));
  const grip = await p.evaluate(() => {
    const h = document.querySelector('.win[data-win="site"] > .win-rh[data-edge="n"]');
    const a = getComputedStyle(h, '::after');
    return getComputedStyle(h).display !== 'none' && a.content !== 'none' && /svg/.test(a.maskImage || a.webkitMaskImage || '');
  });
  check('its free edge carries the grip at rest, so it can be seen to resize', grip);
  const flush = await p.evaluate(() => { const cs = getComputedStyle(document.querySelector('.win[data-win="site"]')); return cs.boxShadow === 'none' && cs.borderRadius === '0px' && cs.borderTopWidth === '1px'; });
  check('it is flush, with a hairline facing the workspace', flush);

  /* A maximised window fills what the dock leaves, and never covers it. */
  await p.click('#open-note');
  await p.waitForSelector('.win[data-win="note"]');
  let note = await box('.win[data-win="note"]');
  site = await box('.win[data-win="site"]');
  check('a maximised window ends where the dock begins', note.top === L.top && note.bottom === site.top, JSON.stringify({ note, site }));
  check('the address names the dock with its size', /p\.site=dock-bottom:[0-9.,]+,0\.22/.test(await q()), await q());

  /* A floating window cannot be dragged into the dock's strip. */
  await p.evaluate(() => { const s = pudlWindows.state(); pudlWindows.open('tool'); });
  await p.waitForSelector('.win[data-win="tool"]');
  const th = await box('.win[data-win="tool"] .win-head');
  await p.mouse.move(th.left + 60, th.top + 10);
  await p.mouse.down();
  await p.mouse.move(th.left + 60, L.bottom - 60, { steps: 8 });
  await p.mouse.up();
  const tool = await box('.win[data-win="tool"]');
  site = await box('.win[data-win="site"]');
  check('a floating window stops at the dock', tool.bottom <= site.top + 1, JSON.stringify({ tool, site }));

  /* Collapsing to the title bar, and expanding again. */
  await p.click('.win[data-win="site"] [data-win-action="minimize"]');
  site = await box('.win[data-win="site"]');
  note = await box('.win[data-win="note"]');
  const collapsed = await p.evaluate(() => ({ cls: document.querySelector('.win[data-win="site"]').classList.contains('win-collapsed'), label: document.querySelector('.win[data-win="site"] [data-win-action="minimize"]').getAttribute('aria-label') }));
  check('minimising a docked window collapses it to its title bar, in place', site.h === 31 && site.bottom === L.bottom && collapsed.cls && collapsed.label === 'Expand', JSON.stringify({ site, collapsed }));
  check('and the workspace grows to meet it', note.bottom === site.top, JSON.stringify({ note, site }));
  await p.click('.win[data-win="site"] .win-head .win-title');
  check('pressing a collapsed dock leaves it collapsed', await p.evaluate(() => document.querySelector('.win[data-win="site"]').classList.contains('win-collapsed')));
  await p.click('.win[data-win="site"] [data-win-action="minimize"]');
  site = await box('.win[data-win="site"]');
  check('its button expands it again', Math.abs(site.h - L.h * 0.22) <= 1, JSON.stringify(site));

  /* Resizing along its free edge. */
  const edge = await box('.win[data-win="site"] .win-rh[data-edge="n"]');
  await p.mouse.move(L.left + 400, edge.top + 3);
  await p.mouse.down();
  await p.mouse.move(L.left + 400, L.bottom - 240, { steps: 6 });
  await p.mouse.up();
  site = await box('.win[data-win="site"]');
  note = await box('.win[data-win="note"]');
  check('its free edge resizes it, and the workspace follows', Math.abs(site.h - 240) <= 3 && note.bottom === site.top && /p\.site=dock-bottom:[0-9.,]+,0\.4/.test(await q()), JSON.stringify({ site, q: await q() }));

  /* Keys on its title bar. */
  await p.focus('.win[data-win="site"] .win-head');
  await p.keyboard.press('Shift+ArrowUp');
  await p.waitForTimeout(400);
  const grown = await box('.win[data-win="site"]');
  check('Shift with the arrow into the workspace grows it', grown.h > site.h, JSON.stringify({ before: site.h, after: grown.h }));
  await p.keyboard.press('Enter');
  const floated = await p.evaluate(() => ({ mode: document.querySelector('.win[data-win="site"]').getAttribute('data-win-mode'), edge: document.querySelector('.win[data-win="site"]').hasAttribute('data-win-edge'),
                                            dock: getComputedStyle(document.querySelector('[data-win-layer]')).getPropertyValue('--dock-bottom').trim() }));
  check('Enter undocks it, and the strip is given back', floated.mode === 'floating' && !floated.edge && floated.dock === '0px', JSON.stringify(floated));

  /* The dock button docks it again. */
  await p.click('.win[data-win="site"] [data-win-action="dock"]');
  check('the dock button docks it at the bottom, at the size it had', await p.evaluate(() => document.querySelector('.win[data-win="site"]').getAttribute('data-win-edge') === 'bottom') &&
        /p\.site=dock-bottom:[0-9.,]+,0\.4/.test(await q()), await q());

  /* Dragging away undocks; dragging to the foot docks. */
  const sh = await box('.win[data-win="site"] .win-head');
  await p.mouse.move(sh.left + 300, sh.top + 12);
  await p.mouse.down();
  await p.mouse.move(sh.left + 300, L.top + 150, { steps: 10 });
  await p.mouse.up();
  check('dragging its title bar away undocks it', /p\.site=floating:/.test(await q()), await q());
  await p.evaluate(() => pudlWindows.raise('tool'));
  const nh = await box('.win[data-win="tool"] .win-head');
  await p.mouse.move(nh.left + 60, nh.top + 10);
  await p.mouse.down();
  await p.mouse.move(nh.left + 60, L.bottom - 30, { steps: 6 });
  await p.mouse.move(nh.left + 60, L.bottom - 4, { steps: 4 });
  const ghost = await p.locator('.win-ghost').waitFor({ state: 'visible', timeout: 2000 }).then(() => true, () => false);
  await p.mouse.up();
  check('dragging a window to the layer\'s foot shows where it will dock, and docks it', ghost && /p\.tool=dock-bottom:/.test(await q()) &&
        await p.evaluate(() => document.querySelector('.win[data-win="tool"]').getAttribute('data-win-edge') === 'bottom'), await q());

  /* Two docks on one edge: the newer shows, the other waits behind it. */
  await p.evaluate(() => pudlWindows.dock('site', 'bottom'));
  const two = await p.evaluate(() => ({ site: !document.querySelector('.win[data-win="site"]').hidden, tool: !document.querySelector('.win[data-win="tool"]').hidden }));
  check('an edge shows its newest docked window, the other behind it', two.site && !two.tool, JSON.stringify(two));
  await p.click('.win-tab[data-win-tab="tool"]');
  const swapped = await p.evaluate(() => ({ site: !document.querySelector('.win[data-win="site"]').hidden, tool: !document.querySelector('.win[data-win="tool"]').hidden }));
  check('the dock of open windows brings the other forward', !swapped.site && swapped.tool, JSON.stringify(swapped));

  /* A reload restores it all. */
  const before = await q();
  await p.reload();
  await p.waitForFunction(() => window.pudlWindows && document.querySelector('.win[data-win="tool"]'));
  const after = await p.evaluate(() => ({ q: location.search, tool: document.querySelector('.win[data-win="tool"]').getAttribute('data-win-edge') }));
  check('a reload keeps the docks', after.q === before && after.tool === 'bottom', JSON.stringify(after));

  /* A side dock on a narrow layer shows at the bottom. */
  await p.evaluate(() => pudlWindows.dock('tool', 'left'));
  const wide = await p.evaluate(() => document.querySelector('.win[data-win="tool"]').getAttribute('data-win-edge'));
  await p.setViewportSize({ width: 500, height: 800 });
  await p.waitForFunction(() => document.querySelector('.win[data-win="tool"]').getAttribute('data-win-edge') === 'bottom', null, { timeout: 3000 }).catch(() => {});
  const narrow = await p.evaluate(() => document.querySelector('.win[data-win="tool"]').getAttribute('data-win-edge'));
  check('a side dock shows on its side, and at the bottom of a narrow layer', wide === 'left' && narrow === 'bottom', wide + ' then ' + narrow);

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
