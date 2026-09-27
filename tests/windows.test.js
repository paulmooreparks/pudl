const { launch, ROOT, out, engine } = require('./lib');
const path = require('path');

const BASE = ROOT + '/reference.html';
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}

(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1300 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) errors.push(r.status() + ' ' + r.url()); });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') if (!/favicon|404/.test(m.text())) errors.push(m.text()); });

  await page.goto(BASE);
  await page.evaluate(() => { localStorage.setItem('pudl-theme', 'light'); });
  await page.goto(BASE);
  await page.evaluate(() => document.querySelector('.win-demo').scrollIntoView({block:'center'}));
  const q = () => page.evaluate(() => decodeURIComponent(location.search));

  await page.click('.win-demo-list a[data-win-open="exp-12"]');
  await page.waitForSelector('.win[data-win="exp-12"]');
  let s = await q();
  check('open pushes URL', /open=exp-12/.test(s) && /top=exp-12/.test(s) && /p\.exp-12=floating:/.test(s), s);
  check('focus on title bar', await page.evaluate(() => document.activeElement.classList.contains('win-head')));

  await page.click('.win-demo-list a[data-win-open="exp-13"]');
  await page.waitForSelector('.win[data-win="exp-13"]');
  s = await q();
  check('second window on top', /open=exp-12,exp-13/.test(s) && /top=exp-13/.test(s), s);
  check('dock has two tabs', (await page.locator('.win-tab').count()) === 2);
  check('only one active', (await page.locator('.win.active').count()) === 1);

  // Drag exp-13 by its title bar.
  const head = page.locator('.win[data-win="exp-13"] .win-head');
  let b = await head.boundingBox();
  const before = await page.locator('.win[data-win="exp-13"]').boundingBox();
  await page.mouse.move(b.x + 60, b.y + 10);
  await page.mouse.down();
  await page.mouse.move(b.x - 40, b.y + 60, { steps: 8 });
  await page.mouse.up();
  const after = await page.locator('.win[data-win="exp-13"]').boundingBox();
  check('drag moves window', Math.abs(after.x - before.x + 100) < 3 && Math.abs(after.y - before.y - 50) < 3,
    `dx=${after.x - before.x} dy=${after.y - before.y}`);

  // Clicking exp-12 raises it.
  await page.locator('.win[data-win="exp-12"] .win-body').click({ position: { x: 5, y: 5 }, force: true });
  s = await q();
  check('click raises', /top=exp-12/.test(s), s);

  // A still click on a background window's title bar raises it too.
  b = await head.boundingBox();
  await page.mouse.click(b.x + 12, b.y + b.height / 2);
  s = await q();
  check('title bar click raises', /top=exp-13/.test(s), s);
  const pos = await page.locator('.win[data-win="exp-13"]').boundingBox();
  check('title bar click does not move', Math.abs(pos.x - after.x) < 1 && Math.abs(pos.y - after.y) < 1);
  await page.locator('.win[data-win="exp-12"] .win-body').click({ position: { x: 5, y: 5 }, force: true });

  // Resize exp-12 from its south-east corner.
  const w12 = page.locator('.win[data-win="exp-12"]');
  const r0 = await w12.boundingBox();
  const se = await page.locator('.win[data-win="exp-12"] .win-rh[data-edge="se"]').boundingBox();
  await page.mouse.move(se.x + se.width / 2, se.y + se.height / 2);
  await page.mouse.down();
  await page.mouse.move(se.x + se.width / 2 - 80, se.y + se.height / 2 - 40, { steps: 6 });
  await page.mouse.up();
  const r1 = await w12.boundingBox();
  check('resize from corner', Math.abs(r0.width - r1.width - 80) < 3 && Math.abs(r0.height - r1.height - 40) < 3,
    `dw=${r0.width - r1.width} dh=${r0.height - r1.height}`);

  // Resize from the west edge: x moves, right edge stays.
  const w = await page.locator('.win[data-win="exp-12"] .win-rh[data-edge="w"]').boundingBox();
  await page.mouse.move(w.x + w.width / 2, w.y + w.height / 2);
  await page.mouse.down();
  await page.mouse.move(w.x + w.width / 2 - 50, w.y + w.height / 2, { steps: 5 });
  await page.mouse.up();
  const r2 = await w12.boundingBox();
  check('resize from west edge', Math.abs((r2.x + r2.width) - (r1.x + r1.width)) < 3 && Math.abs(r2.x - r1.x + 50) < 3);

  await page.screenshot({ path: out('win-two.png'), clip: await page.locator('.win-demo').boundingBox() });

  await page.click('.win-tab[data-win-tab="exp-13"]');
  // Drag exp-13 against the left edge of the layer to snap it.
  const layerBox = await page.locator('[data-win-layer]').boundingBox();
  b = await head.boundingBox();
  await page.mouse.move(b.x + 60, b.y + 10);
  await page.mouse.down();
  await page.mouse.move(layerBox.x + 30, b.y + 40, { steps: 6 });
  await page.mouse.move(layerBox.x + 4, b.y + 40, { steps: 4 });
  check('ghost shows while snapping', await page.locator('.win-ghost').isVisible());
  await page.mouse.up();
  s = await q();
  check('snap left', /p\.exp-13=left:/.test(s), s);
  const snapped = await page.locator('.win[data-win="exp-13"]').boundingBox();
  check('snapped fills left half', Math.abs(snapped.width - layerBox.width / 2) < 3 && Math.abs(snapped.height - layerBox.height) < 3);

  // Drag it back out: floating again at its old size.
  b = await head.boundingBox();
  await page.mouse.move(b.x + 100, b.y + 10);
  await page.mouse.down();
  await page.mouse.move(b.x + 300, b.y + 120, { steps: 8 });
  await page.mouse.up();
  s = await q();
  const un = await page.locator('.win[data-win="exp-13"]').boundingBox();
  check('drag out of snap restores floating size', /p\.exp-13=floating:/.test(s) && Math.abs(un.width - before.width) < 3, s);

  // Double-click title to maximise, again to restore.
  await head.dblclick({ position: { x: 40, y: 10 } });
  s = await q();
  check('double-click maximises', /p\.exp-13=maximized:/.test(s), s);
  await head.dblclick({ position: { x: 40, y: 10 } });
  check('double-click restores', /p\.exp-13=floating:/.test(await q()));

  // Minimise exp-12 with its button.
  await page.click('.win[data-win="exp-12"] [data-win-action="minimize"]');
  s = await q();
  check('minimise', /min=exp-12/.test(s) && !(await page.locator('.win[data-win="exp-12"]').isVisible()) && /top=exp-13/.test(s), s);
  check('dock marks minimised', await page.locator('.win-tab.minimized[data-win-tab="exp-12"]').count() === 1);

  // Hrefs are real state links.
  const closeHref = await page.getAttribute('.win[data-win="exp-13"] [data-win-action="close"]', 'href');
  check('close href is the closed state', /open=exp-12/.test(closeHref) && !/exp-13/.test(closeHref), closeHref);

  // Keyboard move.
  await head.focus();
  const k0 = await page.locator('.win[data-win="exp-13"]').boundingBox();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  const k1 = await page.locator('.win[data-win="exp-13"]').boundingBox();
  check('arrow keys move', k1.x < k0.x - 5, `dx=${k1.x - k0.x}`);
  await page.keyboard.press('Shift+ArrowDown');
  const k2 = await page.locator('.win[data-win="exp-13"]').boundingBox();
  check('shift+arrow resizes', k2.height > k1.height + 3);
  await page.waitForTimeout(450);
  const sKeys = await q();
  check('URL written after keys go quiet', sKeys !== s, sKeys);

  // Reload restores everything.
  const boxBefore = await page.locator('.win[data-win="exp-13"]').boundingBox();
  await page.reload();
  await page.waitForSelector('.win[data-win="exp-13"]');
  const boxAfter = await page.locator('.win[data-win="exp-13"]').boundingBox();
  check('reload restores geometry', Math.abs(boxAfter.x - boxBefore.x) < 2 && Math.abs(boxAfter.width - boxBefore.width) < 2);
  check('reload restores minimised', !(await page.locator('.win[data-win="exp-12"]').isVisible()));
  check('reload keeps URL', (await q()) === sKeys, await q());

  // Dock tab restores the minimised window.
  await page.click('.win-tab[data-win-tab="exp-12"]');
  s = await q();
  check('dock tab restores', !/min=/.test(s) && /top=exp-12/.test(s) && await page.locator('.win[data-win="exp-12"]').isVisible(), s);

  // Close with the button; focus returns somewhere sensible.
  await page.click('.win[data-win="exp-12"] [data-win-action="close"]');
  s = await q();
  check('close', !/exp-12/.test(s) && (await page.locator('.win[data-win="exp-12"]').count()) === 0, s);

  // Back and forward.
  await page.goto(BASE);
  await page.click('.win-demo-list a[data-win-open="exp-12"]');
  await page.waitForSelector('.win[data-win="exp-12"]');
  await page.click('.win-demo-list a[data-win-open="exp-14"]');
  await page.waitForSelector('.win[data-win="exp-14"]');
  await page.goBack();
  await page.waitForFunction(() => !document.querySelector('.win[data-win="exp-14"]'));
  check('back closes the last opened', (await page.locator('.win[data-win="exp-12"]').count()) === 1);
  await page.goForward();
  await page.waitForSelector('.win[data-win="exp-14"]');
  check('forward reopens it', true);

  // Modified click is left to the browser.
  const opened = await page.evaluate(() => {
    const a = document.querySelector('.win-demo-list a[data-win-open="exp-13"]');
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    a.dispatchEvent(ev);
    return ev.defaultPrevented;
  });
  check('ctrl-click not intercepted', !opened);

  await page.evaluate(() => { localStorage.setItem('pudl-theme', 'dark'); });
  await page.reload();
  await page.waitForSelector('.win[data-win="exp-14"]');
  await page.evaluate(() => document.querySelector('.win-demo').scrollIntoView({block:'center'}));
  await page.screenshot({ path: out('win-dark.png'), clip: await page.locator('.win-demo').boundingBox() });

  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
