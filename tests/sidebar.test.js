const { launch, ROOT, out, engine } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/reference.html');
  await p.evaluate(() => document.getElementById('md').scrollIntoView());
  const H = '.layout-demo .md-resize', SIDE = '.layout-demo .md-sidebar';
  const w = () => p.evaluate(s => Math.round(document.querySelector(s).getBoundingClientRect().width), SIDE);
  await p.evaluate(() => {
    window.__ev = [];
    document.addEventListener('pudl:md-resize', e => window.__ev.push(JSON.stringify(e.detail)));
  });

  const aria = await p.evaluate(h => {
    const d = document.querySelector(h);
    return { tab: d.tabIndex, now: d.getAttribute('aria-valuenow'), min: d.getAttribute('aria-valuemin'),
             max: d.getAttribute('aria-valuemax'), controls: d.getAttribute('aria-controls'),
             side: document.querySelector('.layout-demo .md-sidebar').id };
  }, H);
  check('the divider is a focusable splitter with its values', aria.tab === 0 && aria.now === '260' && aria.min === '180' &&
    +aria.max > 260 && aria.controls === aria.side, JSON.stringify(aria));

  const box = await p.locator(H).boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await p.mouse.move(cx, cy);
  await p.mouse.down();
  await p.mouse.move(cx + 100, cy, { steps: 8 });
  await p.mouse.up();
  check('dragging widens the list', Math.abs((await w()) - 360) <= 1, String(await w()));
  let ev = await p.evaluate(() => window.__ev);
  check('the event fires once, when the drag ends', ev.length === 1 && JSON.parse(ev[0]).width === await w() && !JSON.parse(ev[0]).reset, JSON.stringify(ev));

  const bodyW = await p.evaluate(() => document.querySelector('.layout-demo .md-body').clientWidth);
  let bx = (await p.locator(H).boundingBox()).x;
  await p.mouse.move(bx + 3, cy); await p.mouse.down(); await p.mouse.move(Math.min(bx + 900, 1270), cy, { steps: 6 }); await p.mouse.up();
  check('the list stops at half the layout', Math.abs((await w()) - bodyW / 2) <= 1, (await w()) + ' of ' + bodyW);
  bx = (await p.locator(H).boundingBox()).x;
  await p.mouse.move(bx + 3, cy); await p.mouse.down(); await p.mouse.move(Math.max(bx - 900, 10), cy, { steps: 6 }); await p.mouse.up();
  check('the list stops at its minimum', (await w()) === 180, String(await w()));

  await p.focus(H);
  await p.evaluate(() => { window.__ev = []; });
  await p.keyboard.press('ArrowRight');
  check('Right moves it a step', (await w()) === 196, String(await w()));
  await p.keyboard.press('Shift+ArrowRight');
  check('Shift with Right moves it further', (await w()) === 260, String(await w()));
  await p.keyboard.press('End');
  check('End goes to the maximum', Math.abs((await w()) - bodyW / 2) <= 1);
  await p.keyboard.press('Home');
  check('Home goes to the minimum', (await w()) === 180);
  check('keys are not announced one by one', (await p.evaluate(() => window.__ev.length)) === 0);
  await p.waitForTimeout(450);
  ev = await p.evaluate(() => window.__ev);
  check('keys are announced once they go quiet', ev.length === 1 && JSON.parse(ev[0]).width === 180, JSON.stringify(ev));
  check('aria-valuenow follows', (await p.getAttribute(H, 'aria-valuenow')) === '180');

  await p.dblclick(H);
  ev = await p.evaluate(() => window.__ev);
  check('a double-click resets to the default', (await w()) === 260 && JSON.parse(ev[ev.length - 1]).reset === true, JSON.stringify(ev));

  const clamped = await p.evaluate(() => {
    const l = document.querySelector('.layout-demo .md-layout');
    l.style.setProperty('--md-sidebar-w', '5000px');
    const a = Math.round(document.querySelector('.layout-demo .md-sidebar').getBoundingClientRect().width);
    l.style.setProperty('--md-sidebar-w', '10px');
    const c = Math.round(document.querySelector('.layout-demo .md-sidebar').getBoundingClientRect().width);
    l.style.removeProperty('--md-sidebar-w');
    return { a, c, half: document.querySelector('.layout-demo .md-body').clientWidth / 2 };
  });
  check('the stylesheet enforces the limits by itself', Math.abs(clamped.a - clamped.half) <= 1 && clamped.c === 180, JSON.stringify(clamped));

  await p.setViewportSize({ width: 900, height: 1000 });
  await p.waitForTimeout(200);
  const after = await p.evaluate(() => ({
    max: +document.querySelector('.layout-demo .md-resize').getAttribute('aria-valuemax'),
    half: Math.round(document.querySelector('.layout-demo .md-body').clientWidth / 2)
  }));
  check('the maximum follows the layout', Math.abs(after.max - after.half) <= 1, JSON.stringify(after));

  /* === The sample ======================================================== */
  const s = await b.newPage({ viewport: { width: 1280, height: 800 } });
  s.on('pageerror', e => errors.push(e.message));
  await s.addInitScript(() => {
    /* The sidebar's width in the first frame in which it exists. */
    window.__first = null;
    (function look() {
      requestAnimationFrame(() => {
        const side = document.querySelector('.md-sidebar');
        if (side && side.getBoundingClientRect().width) window.__first = Math.round(side.getBoundingClientRect().width);
        else look();
      });
    })();
  });
  await s.goto(ROOT + '/samples/article-reader.html?open=url-state&top=url-state');
  await s.evaluate(() => localStorage.removeItem('reader-sidebar-w'));
  await s.reload();
  await s.waitForSelector('.win[data-win="url-state"]');
  const win0 = await s.evaluate(() => Math.round(document.querySelector('.win[data-win="url-state"]').getBoundingClientRect().width));
  const sb = await s.locator('.md-resize').boundingBox();
  await s.mouse.move(sb.x + 3, sb.y + 200); await s.mouse.down(); await s.mouse.move(sb.x + 83, sb.y + 200, { steps: 6 }); await s.mouse.up();
  const win1 = await s.evaluate(() => Math.round(document.querySelector('.win[data-win="url-state"]').getBoundingClientRect().width));
  check('sample: a window in the detail pane follows the divider', win0 - win1 >= 79 && win0 - win1 <= 81, win0 + ' -> ' + win1);
  check('sample: the width is stored', (await s.evaluate(() => localStorage.getItem('reader-sidebar-w'))) === '340px');
  await s.reload();
  await s.waitForFunction(() => window.__first !== null);
  check('sample: the stored width is there from the first frame', (await s.evaluate(() => window.__first)) === 340, String(await s.evaluate(() => window.__first)));

  await s.click('.section-tab[href="article-reader-design.html"]');
  await s.waitForFunction(() => /design/.test(location.pathname) && !document.querySelector('[data-region][aria-busy]'));
  const ctl = await s.evaluate(() => document.querySelector('.md-resize').getAttribute('aria-controls') === document.querySelector('.md-sidebar').id);
  check('sample: after a region swap the divider controls the new list', ctl);
  await s.evaluate(() => localStorage.removeItem('reader-sidebar-w'));

  const ph = await b.newPage({ viewport: { width: 393, height: 851 }, isMobile: true });
  await ph.goto(ROOT + '/samples/article-reader.html');
  check('phone: the divider is hidden', !(await ph.locator('.md-resize').isVisible()));

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
