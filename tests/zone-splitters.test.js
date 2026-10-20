/* Splitters between snapped windows move the zones' grid lines (0.67.0,
   docs/proposals/zone-splitters.md): halves, two and one, quarters with
   the crossing handle, thirds, the keys, the double-click, the limits,
   the address, and no splitter where none belongs. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + (detail || '')));
  if (!ok) failures++;
}
const near = (a, b, d) => Math.abs(a - b) <= (d || 0.01);

(async () => {
  const browser = await launch();
  const p = await browser.newPage({ viewport: { width: 1200, height: 700 } });

  async function layout(snaps) {
    await p.goto(ROOT + '/tests/fixtures/zone-splitters.html');
    await p.waitForFunction(() => window.pudlWindows);
    for (const [k, zone] of snaps) {
      await p.evaluate(k => pudlWindows.open(k), k);
      await p.waitForFunction(k => document.querySelector('.win[data-win="' + k + '"]'), k);
      await p.evaluate(([k, zone]) => pudlWindows.snap(k, zone), [k, zone]);
    }
    await p.waitForTimeout(100);
  }
  /* Each window's rectangle as shares of the inner area, and the
     splitters and crossings drawn. */
  const look = () => p.evaluate(() => {
    const inner = document.querySelector('.win-inner').getBoundingClientRect();
    const share = el => { const r = el.getBoundingClientRect(); return { x: (r.left - inner.left) / inner.width, y: (r.top - inner.top) / inner.height, w: r.width / inner.width, h: r.height / inner.height }; };
    const wins = {};
    document.querySelectorAll('.win[data-win]').forEach(w => { wins[w.getAttribute('data-win')] = share(w); });
    const splitters = [...document.querySelectorAll('.win-splitter')].map(s => ({ grid: s.getAttribute('data-win-grid'), ...share(s), now: +s.getAttribute('aria-valuenow'), label: s.getAttribute('aria-label') }));
    const crosses = [...document.querySelectorAll('.win-splitter-cross')].map(s => s.getAttribute('data-win-grid'));
    return { wins, splitters, crosses, url: location.search, inner: { left: inner.left, top: inner.top, width: inner.width, height: inner.height } };
  });
  async function drag(selector, toX, toY) {
    const box = await p.locator(selector).boundingBox();
    const sx = box.x + box.width / 2, sy = box.y + box.height / 2;
    await p.mouse.move(sx, sy);
    await p.mouse.down();
    await p.mouse.move((sx + toX) / 2, (sy + toY) / 2);
    await p.mouse.move(toX, toY);
    await p.mouse.up();
    await p.waitForTimeout(80);
  }

  /* Halves. */
  await layout([['a', 'left'], ['b', 'right']]);
  let v = await look();
  check('two halves have one vertical splitter on the middle line, the full height',
    v.splitters.length === 1 && v.splitters[0].grid === 'x3' && near(v.splitters[0].h, 1) && v.splitters[0].now === 50, JSON.stringify(v.splitters));
  check('the splitter is named for the windows either side', v.splitters[0].label === 'Resize Alpha and Bravo', v.splitters[0].label);
  await drag('.win-splitter', v.inner.left + v.inner.width * 0.4, v.inner.top + 200);
  v = await look();
  check('dragging it to 40% makes the left half 40% and the right 60%', near(v.wins.a.w, 0.4) && near(v.wins.b.x, 0.4) && near(v.wins.b.w, 0.6), JSON.stringify(v.wins));
  check('the address keeps the moved line', /grid=x3:0\.4\b/.test(v.url), v.url);
  const url = v.url;
  await p.goto(ROOT + '/tests/fixtures/zone-splitters.html' + url);
  await p.waitForFunction(() => document.querySelectorAll('.win[data-win]').length === 2);
  await p.waitForTimeout(100);
  v = await look();
  check('the address restores the moved line', near(v.wins.a.w, 0.4) && v.splitters[0].now === 40, JSON.stringify(v.wins));

  /* Keys. */
  await p.focus('.win-splitter');
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(50);
  v = await look();
  check('an arrow key moves the line a hundredth', v.splitters[0].now === 41 && near(v.wins.a.w, 0.41), JSON.stringify(v.splitters));
  await p.keyboard.press('Shift+ArrowRight');
  await p.waitForTimeout(50);
  v = await look();
  check('Shift with an arrow moves it a sixth', near(v.wins.a.w, 0.41 + 1 / 6, 0.012), JSON.stringify(v.wins.a));
  await p.keyboard.press('Home');
  await p.waitForTimeout(50);
  v = await look();
  const minW = await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.win[data-win="a"]')).getPropertyValue('--win-min-w')) || 320);
  check('Home takes it to its limit, where the left window keeps its least size',
    Math.abs(v.wins.a.w * v.inner.width - Math.min(minW, v.inner.width / 2)) <= 3, JSON.stringify({ w: v.wins.a.w * v.inner.width, minW }));
  await p.keyboard.press('Enter');
  await p.waitForTimeout(400);
  v = await look();
  check('Enter returns the line to the middle and the address forgets it', near(v.wins.a.w, 0.5) && !/grid=/.test(v.url), v.url);
  check('the splitter keeps the focus', await p.evaluate(() => document.activeElement.classList.contains('win-splitter')));

  /* Double-click. */
  await drag('.win-splitter', v.inner.left + v.inner.width * 0.65, v.inner.top + 200);
  await p.dblclick('.win-splitter');
  await p.waitForTimeout(80);
  v = await look();
  check('a double-click returns the line to the grid', near(v.wins.a.w, 0.5) && !/grid=/.test(v.url), JSON.stringify({ a: v.wins.a, url: v.url }));

  /* Floating one of the halves forgets the line. */
  await drag('.win-splitter', v.inner.left + v.inner.width * 0.35, v.inner.top + 200);
  await p.evaluate(() => pudlWindows.snap('b', 'floating'));
  await p.waitForTimeout(80);
  v = await look();
  check('with one half floated there is no splitter, and the line is forgotten', v.splitters.length === 0 && !/grid=/.test(v.url) && near(v.wins.a.w, 0.5), JSON.stringify({ s: v.splitters, url: v.url }));

  /* Two on one side and one on the other. */
  await layout([['a', 'left'], ['b', 'top-right'], ['c', 'bottom-right']]);
  v = await look();
  const vert = v.splitters.find(s => s.grid === 'x3'), horiz = v.splitters.find(s => s.grid === 'y3');
  check('two and one have a full-height splitter and one across the right half only',
    v.splitters.length === 2 && vert && near(vert.h, 1) && horiz && near(horiz.x, 0.5) && near(horiz.w, 0.5) && !v.crosses.length, JSON.stringify(v.splitters));
  await drag('.win-splitter[data-win-grid="y3"]', v.inner.left + v.inner.width * 0.75, v.inner.top + v.inner.height * 0.4);
  v = await look();
  check('the horizontal one changes the two on the right and leaves the left half whole',
    near(v.wins.b.h, 0.4) && near(v.wins.c.y, 0.4) && near(v.wins.c.h, 0.6) && near(v.wins.a.h, 1), JSON.stringify(v.wins));
  await drag('.win-splitter[data-win-grid="x3"]', v.inner.left + v.inner.width * 0.6, v.inner.top + 100);
  v = await look();
  check('the vertical one moves all three windows\' shared edge', near(v.wins.a.w, 0.6) && near(v.wins.b.x, 0.6) && near(v.wins.c.x, 0.6), JSON.stringify(v.wins));

  /* Quarters and the crossing. */
  await layout([['a', 'top-left'], ['b', 'top-right'], ['c', 'bottom-left'], ['d', 'bottom-right']]);
  v = await look();
  check('quarters have one splitter each way, across the whole area, and a crossing',
    v.splitters.length === 2 && v.splitters.every(s => near(s.grid[0] === 'x' ? s.h : s.w, 1)) && v.crosses.length === 1, JSON.stringify(v));
  await drag('.win-splitter-cross', v.inner.left + v.inner.width * 0.35, v.inner.top + v.inner.height * 0.6);
  v = await look();
  check('dragging the crossing moves both lines', near(v.wins.a.w, 0.35) && near(v.wins.a.h, 0.6) && near(v.wins.d.x, 0.35) && near(v.wins.d.y, 0.6), JSON.stringify(v.wins));

  /* Thirds. */
  await layout([['a', 'left-third'], ['b', 'middle-third'], ['c', 'right-third']]);
  v = await look();
  check('thirds have two splitters', v.splitters.map(s => s.grid).sort().join() === 'x2,x4', JSON.stringify(v.splitters));
  await drag('.win-splitter[data-win-grid="x2"]', v.inner.left + v.inner.width * 0.4, v.inner.top + 100);
  v = await look();
  check('moving the first leaves the right third alone', near(v.wins.a.w, 0.4) && near(v.wins.b.x, 0.4) && near(v.wins.c.x, 2 / 3) && near(v.wins.c.w, 1 / 3), JSON.stringify(v.wins));
  await p.dblclick('.win-splitter[data-win-grid="x2"]');
  await p.waitForTimeout(80);
  v = await look();
  check('returning it to the grid leaves nothing in the address', !/grid=/.test(v.url) && near(v.wins.a.w, 1 / 3), v.url);

  /* A window snapped after a line moved takes the stretched cells. */
  await layout([['a', 'left'], ['b', 'right']]);
  v = await look();
  await drag('.win-splitter', v.inner.left + v.inner.width * 0.4, v.inner.top + 200);
  await p.evaluate(() => { pudlWindows.open('c'); });
  await p.waitForFunction(() => document.querySelector('.win[data-win="c"]'));
  await p.evaluate(() => pudlWindows.snap('c', 'bottom-right'));
  await p.waitForTimeout(80);
  v = await look();
  check('a window snapped after the line moved fills the cells as they are now', near(v.wins.c.x, 0.4) && near(v.wins.c.w, 0.6), JSON.stringify(v.wins.c));

  /* No splitter beside empty space, or on a narrow screen. */
  await layout([['a', 'left'], ['b', 'top-right']]);
  v = await look();
  check('a splitter runs only where two windows share the line', v.splitters.length === 1 && near(v.splitters[0].h, 0.5), JSON.stringify(v.splitters));
  await p.evaluate(() => document.querySelector('[data-win-layer]').setAttribute('data-win-narrow', 'maximized'));
  await p.setViewportSize({ width: 390, height: 700 });
  await p.waitForTimeout(200);
  v = await look();
  check('a narrow screen has no splitters', v.splitters.length === 0, JSON.stringify(v.splitters));

  await browser.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
