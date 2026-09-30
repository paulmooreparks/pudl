/* Snap zones, from parkscomputing.com's
   Architecture/pudl-proposal-snap-zones.md. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
const FIX = ROOT + '/tests/fixtures/window-menu.html';
(async () => {
  const b = await launch();
  const errors = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(FIX);
  await p.waitForFunction(() => window.pudlWindows && document.querySelector('[data-applet-state="running"]'));
  const box = sel => p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; }, sel);
  const L = await box('[data-win-layer]');
  const win = k => box('.win[data-win="' + k + '"]');
  const place = k => p.evaluate(k => pudlWindows.state().place[k], k);
  const near = (a, b) => Math.abs(a - b) <= 1;
  const fills = (r, x0, y0, x1, y1) => near(r.left, L.left + L.w * x0) && near(r.top, L.top + L.h * y0) && near(r.right, L.left + L.w * x1) && near(r.bottom, L.top + L.h * y1);

  /* From script, by name and by rectangle. */
  await p.evaluate(() => pudlWindows.snap('notes', 'top-left'));
  let r = await win('notes');
  check('snap(key, "top-left") fills the top left quarter', fills(r, 0, 0, 0.5, 0.5), JSON.stringify({ r, L }));
  check('and the address carries the zone after the floating geometry', /p\.notes=zone:[0-9.]+,[0-9.]+,[0-9.]+,[0-9.]+,0,0,0\.5,0\.5(&|$)/.test(await p.evaluate(() => location.search)), await p.evaluate(() => location.search));
  await p.evaluate(() => pudlWindows.snap('notes', { x: 0.3, y: 0, w: 0.4, h: 1 }));
  let pl = await place('notes');
  check('a rectangle is moved to the nearest sixths', pl.mode === 'zone' && near(pl.zone.x * 600, 200) && near(pl.zone.w * 600, 200), JSON.stringify(pl));
  await p.evaluate(() => pudlWindows.snap('notes', { x: 0, y: 0, w: 0.5, h: 1 }));
  check('a zone that is a half becomes the half', (await place('notes')).mode === 'left');

  /* Reading an address. */
  const url = FIX + '?open=counter,notes&p.notes=zone:0.1,0.1,0.4,0.5,0.667,0,0.333,1&p.counter=zone:0.05,0.05,0.4,0.5,0.5,0,0.5,1';
  await p.goto(url);
  await p.waitForFunction(() => window.pudlWindows);
  r = await win('notes');
  check('an address with a zone opens the window there', fills(r, 4 / 6, 0, 1, 1), JSON.stringify(r));
  pl = await place('counter');
  check('an address zone that is a half reads as the half', pl.mode === 'right', JSON.stringify(pl));
  const rule = await p.evaluate(() => getComputedStyle(document.querySelector('.win[data-win="notes"]')).borderLeftWidth + ' ' + getComputedStyle(document.querySelector('.win[data-win="notes"]')).borderRightWidth);
  check('a zone is flush, with no rule on the side at the edge of the area', rule === '0px 0px', rule);

  /* Restore from a zone. */
  const maxLabel = await p.getAttribute('.win[data-win="counter"] [data-win-action="maximize"]', 'aria-label');
  check('the maximise button of a snapped window reads Restore', maxLabel === 'Restore', maxLabel);
  await p.evaluate(() => pudlWindows.snap('counter', null));
  check('snap(key, null) floats it again', (await place('counter')).mode === 'floating');

  /* Dragging. */
  async function drag(k, x, y) {
    const t = await box('.win[data-win="' + k + '"] .win-title');
    await p.mouse.move(t.left + 10, t.top + 5);
    await p.mouse.down();
    await p.mouse.move(t.left + 60, t.top + 40, { steps: 3 });
    await p.mouse.move(x, y, { steps: 8 });
    await p.mouse.up();
  }
  await drag('counter', L.right - 2, L.top + 2);
  pl = await place('counter');
  check('a drag ending at the top right corner snaps to the top right quarter', pl.mode === 'zone' && pl.zone.x === 0.5 && pl.zone.y === 0 && pl.zone.h === 0.5, JSON.stringify(pl));
  await drag('counter', L.left + 2, L.top + L.h / 2);
  check('a drag ending at the middle of the left side snaps to the left half', (await place('counter')).mode === 'left');
  await drag('counter', L.left + 2, L.bottom - 2);
  pl = await place('counter');
  check('a drag ending at the bottom left corner takes that quarter, not the dock', pl.mode === 'zone' && pl.zone.x === 0 && pl.zone.y === 0.5, JSON.stringify(pl));
  await drag('counter', L.left + L.w / 2, L.bottom - 2);
  check('along the bottom edge a drag still docks', (await place('counter')).mode === 'dock-bottom');
  await p.evaluate(() => pudlWindows.dock('counter', null));

  /* The picker in the window menu. */
  await p.click('.win[data-win="notes"] [data-win-action="menu"]');
  await p.waitForFunction(() => { const m = document.getElementById('win-menu-notes'); return m.matches(':popover-open') && !m.classList.contains('placing'); });
  const zones = await p.evaluate(() => Array.from(document.querySelectorAll('#win-menu-notes .win-snap-zone')).map(b => b.getAttribute('aria-label')));
  check('the window menu offers the halves, quarters, thirds and two thirds with one third, each named', zones.length === 13 && zones.indexOf('Middle third') >= 0 && zones.indexOf('Top left quarter') >= 0, zones.join(', '));
  const cur = await p.evaluate(() => Array.from(document.querySelectorAll('#win-menu-notes .win-snap-zone[aria-current="true"]')).map(b => b.getAttribute('aria-label')));
  check('the zone the window fills is marked current, in every layout that has it', cur.join(',') === 'Right third,Right third', cur.join(','));
  await p.click('#win-menu-notes .win-snap-zone[aria-label="Middle third"]');
  pl = await place('notes');
  check('choosing a zone snaps the window there', pl.mode === 'zone' && near(pl.zone.x * 600, 200) && near(pl.zone.w * 600, 200), JSON.stringify(pl));

  /* The picker on the maximise button, after a moment's hover. */
  const mx = await box('.win[data-win="counter"] [data-win-action="maximize"]');
  await p.mouse.move(mx.left + mx.w / 2, mx.top + mx.h / 2);
  await p.waitForFunction(() => document.getElementById('win-snap-counter').matches(':popover-open'), null, { timeout: 3000 }).catch(() => {});
  const hovered = await p.evaluate(() => document.getElementById('win-snap-counter').matches(':popover-open'));
  check('resting on the maximise button opens the layout picker', hovered);
  if (hovered) {
    const pb = await box('#win-snap-counter');
    check('under the button', pb.top >= mx.bottom && pb.left <= mx.left && pb.right >= mx.right, JSON.stringify({ pb, mx }));
    await p.click('#win-snap-counter .win-snap-zone[aria-label="Left two thirds"]');
    pl = await place('counter');
    check('and a zone chosen there snaps the window', pl.mode === 'zone' && pl.zone.x === 0 && near(pl.zone.w * 600, 400), JSON.stringify(pl));
  }

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
