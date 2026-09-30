/* Windows sized by their content, and limits on windows the reader sizes,
   from parkscomputing.com's Architecture/pudl-proposal-window-sizing.md. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
const FIX = ROOT + '/tests/fixtures/window-sizing.html';
(async () => {
  const b = await launch();
  const errors = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(FIX);
  await p.waitForFunction(() => window.pudlWindows && document.querySelector('[data-applet="barcodes"][data-applet-state="running"]'));
  const box = sel => p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; }, sel);
  const L = await box('[data-win-layer]');
  const tool = () => box('.win[data-win="tool"]');

  let t = await tool();
  check('a content-sized window takes its content\'s width, whatever its placement says', t.w < 520 && t.w > 420, JSON.stringify({ t, L }));
  check('and its height', t.h < L.h * 0.6, JSON.stringify(t));
  check('its applet is told to flow', (await p.getAttribute('[data-applet="barcodes"]', 'data-got-fit')) === 'flow');

  /* The applet's content changes, and the window follows it both ways. */
  await p.selectOption('#bc-layout', '6');
  const grown = await tool();
  check('when the content grows the window grows, from the same top-left corner', grown.h > t.h + 100 && grown.left === t.left && grown.top === t.top, JSON.stringify({ t, grown }));
  await p.selectOption('#bc-layout', '2');
  const shrunk = await tool();
  check('and when it shrinks the window shrinks', shrunk.h === t.h && shrunk.left === t.left, JSON.stringify({ t, shrunk }));

  const hidden = await p.evaluate(() => {
    const w = document.querySelector('.win[data-win="tool"]');
    const shown = s => { const el = w.querySelector(s); return el && getComputedStyle(el).display !== 'none'; };
    return { max: shown('[data-win-action="maximize"]'), dock: shown('[data-win-action="dock"]'), rh: shown(':scope > .win-rh'), min: shown('[data-win-action="minimize"]') };
  });
  check('it has no resize edges and no maximise or dock button, and keeps minimise', !hidden.max && !hidden.dock && !hidden.rh && hidden.min, JSON.stringify(hidden));

  /* An address or a script cannot maximise, snap or dock it. */
  await p.evaluate(() => { pudlWindows.snap('tool', 'left'); });
  check('snap leaves it floating', (await p.evaluate(() => pudlWindows.state().place.tool.mode)) === 'floating');
  await p.evaluate(() => { pudlWindows.dock('tool', 'bottom'); });
  check('dock leaves it floating', (await p.evaluate(() => pudlWindows.state().place.tool.mode)) === 'floating');
  await p.focus('.win[data-win="tool"] .win-head');
  await p.keyboard.press('Enter');
  check('Enter on its title bar does not maximise it', (await p.evaluate(() => pudlWindows.state().place.tool.mode)) === 'floating');

  /* Its menu. */
  await p.click('.win[data-win="tool"] [data-win-action="menu"]');
  await p.waitForFunction(() => { const m = document.getElementById('win-menu-tool'); return m.matches(':popover-open') && !m.classList.contains('placing'); });
  const rows = await p.evaluate(() => Array.from(document.querySelectorAll('#win-menu-tool > *')).map(el => el.matches('.menu-sep') ? '|' : el.matches('.win-snap') ? 'picker' : el.textContent));
  check('its menu has no maximise, zones or dock, and offers Reset position', rows.join(',') === 'Minimize,Reset position,|,Close', rows.join(','));
  await p.keyboard.press('Escape');

  /* Dragging moves it and never snaps. */
  const head = await box('.win[data-win="tool"] .win-title');
  await p.mouse.move(head.left + 10, head.top + 5);
  await p.mouse.down();
  await p.mouse.move(head.left + 60, head.top + 40, { steps: 3 });
  await p.mouse.move(L.left + 2, L.top + L.h / 2, { steps: 8 });
  await p.mouse.up();
  const dragged = await tool();
  check('a drag to the left edge moves it there and does not snap it',
        (await p.evaluate(() => pudlWindows.state().place.tool.mode)) === 'floating' && Math.abs(dragged.left - L.left) <= 2 && dragged.w === t.w, JSON.stringify({ dragged, t }));

  /* Near the bottom right it stops at the edge and its body scrolls. */
  await p.evaluate(() => { const s = pudlWindows.state(); });
  await p.goto(FIX + '?open=tool,term&p.tool=floating:0.7,0.6,0.2,0.2&p.term=floating:0.5,0.3,0.4,0.5');
  await p.waitForFunction(() => document.querySelector('[data-applet="barcodes"][data-applet-state="running"]'));
  await p.selectOption('#bc-layout', '6');
  const capped = await tool();
  const scroll = await p.evaluate(() => { const b = document.querySelector('.win[data-win="tool"] .win-body'); return b.scrollHeight > b.clientHeight + 1; });
  check('placed near the corner, it stops at the right and bottom and its body scrolls',
        capped.right <= L.right + 1 && capped.bottom <= L.bottom + 1 && scroll, JSON.stringify({ capped, L, scroll }));

  /* Limits on a window the reader sizes. */
  const term = () => box('.win[data-win="term"]');
  let tm = await term();
  const handle = await box('.win[data-win="term"] > .win-rh[data-edge="se"]');
  await p.mouse.move(handle.left + 2, handle.top + 2);
  await p.mouse.down();
  await p.mouse.move(handle.left - 600, handle.top - 400, { steps: 8 });
  await p.mouse.up();
  tm = await term();
  check('a window with a smallest size cannot be dragged smaller', tm.w >= 399 && tm.h >= 249, JSON.stringify(tm));
  const h2 = await box('.win[data-win="term"] > .win-rh[data-edge="se"]');
  await p.mouse.move(h2.left + 2, h2.top + 2);
  await p.mouse.down();
  await p.mouse.move(h2.left + 900, h2.top + 900, { steps: 8 });
  await p.mouse.up();
  tm = await term();
  check('nor larger than its largest', tm.w <= 701 && tm.h <= 501, JSON.stringify(tm));
  await p.goto(FIX + '?open=term&p.term=floating:0.1,0.1,0.9,0.9');
  await p.waitForFunction(() => window.pudlWindows);
  tm = await term();
  check('an address asking for more than its largest size is held to it', tm.w <= 701 && tm.h <= 501, JSON.stringify(tm));

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
