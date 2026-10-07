/* A persistent sidebar at either edge, and a peek at it while collapsed
   (from parkscomputing.com's pudl-proposal-sidebar-side.md and
   pudl-proposal-sidebar-peek.md, specification 0.13.0). */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];
  const open = async () => {
    const p = await b.newPage({ viewport: { width: 1200, height: 700 } });
    p.on('pageerror', e => errors.push(e.message));
    await p.emulateMedia({ reducedMotion: 'reduce' });
    await p.goto(ROOT + '/samples/persistent-sidebar.html');
    await p.waitForFunction(() => window.pudlMd && pudlMd.state(document.querySelector('.md-layout')));
    await p.evaluate(() => {
      window.__events = [];
      const l = document.querySelector('.md-layout');
      ['pudl:md-peek', 'pudl:md-change', 'pudl:md-resize'].forEach(n => l.addEventListener(n, e => __events.push(n + (e.detail && 'open' in e.detail ? ':' + e.detail.open : ''))));
    });
    return p;
  };
  const rect = (p, sel) => p.$eval(sel, el => { const r = el.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width) }; });
  const settle = p => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

  /* === The side ========================================================== */
  let p = await open();
  const startW = (await rect(p, '.md-sidebar')).w;
  await p.evaluate(() => document.querySelector('.md-layout').setAttribute('data-md-side', 'end'));
  await settle(p);
  let side = await rect(p, '.md-sidebar'), detail = await rect(p, '.md-detail'), body = await rect(p, '.md-body');
  check('at the end, the sidebar stands at the right of a left-to-right page, at once', side.l > detail.r - 1 && Math.abs(side.r - body.r) <= 1, JSON.stringify({ side, detail }));
  check('and keeps its width', side.w === startW, side.w + ' / ' + startW);
  check('its hairline faces the detail pane on its other side', await p.$eval('.md-sidebar', el => getComputedStyle(el).borderLeftWidth === '1px' && getComputedStyle(el).borderRightWidth === '0px'));
  await p.focus('.md-resize');
  await p.keyboard.press('ArrowLeft');
  await settle(p);
  check('Left on the handle widens it, as in a right-to-left page', (await rect(p, '.md-sidebar')).w === startW + 16, String((await rect(p, '.md-sidebar')).w));
  const h = await rect(p, '.md-resize');
  await p.mouse.move(h.l + h.w / 2, 300);
  await p.mouse.down();
  await p.mouse.move(h.l + h.w / 2 - 40, 300, { steps: 5 });
  await p.mouse.up();
  await settle(p);
  check('dragging the handle toward the middle widens it', (await rect(p, '.md-sidebar')).w === startW + 16 + 40, String((await rect(p, '.md-sidebar')).w));
  check('the document order is unchanged', await p.evaluate(() => { const k = [...document.querySelector('.md-body').children].map(c => c.className.split(' ')[0]); return k.join(',') === 'md-sidebar,md-resize,md-detail'; }));
  await p.evaluate(() => pudlMd.command(document.querySelector('.md-layout'), 'collapse'));
  await settle(p);
  const handleAtEdge = await rect(p, '.md-resize');
  check('collapsed, its handle is at the end edge', Math.abs(handleAtEdge.r - (await rect(p, '.md-body')).r) <= 1, JSON.stringify(handleAtEdge));
  await p.close();

  /* === The peek ========================================================== */
  for (const end of [false, true]) {
    const where = end ? 'at the end: ' : '';
    p = await open();
    const width = (await rect(p, '.md-sidebar')).w;
    await p.evaluate(e => {
      const l = document.querySelector('.md-layout');
      l.setAttribute('data-md-peek', '');
      if (e) l.setAttribute('data-md-side', 'end');
      pudlMd.command(l, 'collapse');
      __events.length = 0;
    }, end);
    await settle(p);
    const detailBefore = await rect(p, '.md-detail');
    const hd = await rect(p, '.md-resize');
    const peeking = () => p.evaluate(() => document.querySelector('.md-layout').hasAttribute('data-md-peek-open'));

    /* A pointer that only crosses the handle opens nothing. */
    await p.mouse.move(hd.l + hd.w / 2, 200);
    await p.waitForTimeout(80);
    await p.mouse.move(end ? hd.l - 300 : hd.r + 300, 200);
    await p.waitForTimeout(250);
    check(where + 'a pointer that only crosses the handle opens nothing', !(await peeking()));

    await p.mouse.move(hd.l + hd.w / 2, 250);
    await p.waitForTimeout(350);
    check(where + 'resting on the handle opens a peek', await peeking());
    const s = await rect(p, '.md-sidebar'), d = await rect(p, '.md-detail'), hh = await rect(p, '.md-resize'), bb = await rect(p, '.md-body');
    check(where + 'at the sidebar\'s own width, from its edge', s.w === width && (end ? Math.abs(s.r - bb.r) <= 1 : Math.abs(s.l - bb.l) <= 1), JSON.stringify({ s, width }));
    check(where + 'over the detail pane, which does not move', JSON.stringify(d) === JSON.stringify(detailBefore), JSON.stringify({ d, detailBefore }));
    check(where + 'with the handle at its side', end ? Math.abs(hh.r - s.l) <= 1 : Math.abs(hh.l - s.r) <= 1, JSON.stringify({ hh, s }));
    check(where + 'raised with a shadow, above the detail pane', await p.$eval('.md-sidebar', el => getComputedStyle(el).boxShadow !== 'none' && +getComputedStyle(el).zIndex > 0));

    await p.mouse.move(end ? s.r - 40 : s.l + 40, 300, { steps: 4 });
    await p.waitForTimeout(400);
    check(where + 'it stays open while the pointer is on it', await peeking());
    await p.mouse.move(end ? s.l - 300 : s.r + 300, 300, { steps: 2 });
    await p.waitForTimeout(150);
    check(where + 'a brief move off it does not close it at once', await peeking());
    await p.waitForTimeout(300);
    check(where + 'it closes once the pointer has been off it a moment', !(await peeking()));
    const ev = await p.evaluate(() => __events.join(','));
    check(where + 'pudl:md-peek says when it opens and closes, and nothing else changed', ev === 'pudl:md-peek:true,pudl:md-peek:false', ev);
    check(where + 'the sidebar is still collapsed', await p.evaluate(() => pudlMd.state(document.querySelector('.md-layout')).collapsed));

    /* Pressing the handle of a peek expands it where it stood. */
    await p.mouse.move(hd.l + hd.w / 2, 250);
    await p.waitForTimeout(350);
    const at = await rect(p, '.md-sidebar');
    await p.mouse.click(hd.l + hd.w / 2 + (end ? -width : width), 250);
    await settle(p);
    const after = await rect(p, '.md-sidebar');
    check(where + 'pressing the handle of a peek expands the sidebar for good, where the peek stood', !(await peeking()) && !(await p.evaluate(() => pudlMd.state(document.querySelector('.md-layout')).collapsed)) && after.l === at.l && after.w === at.w, JSON.stringify({ at, after }));
    await p.close();
  }

  /* === The keyboard, and choosing a row ================================== */
  p = await open();
  await p.evaluate(() => { const l = document.querySelector('.md-layout'); l.setAttribute('data-md-peek', ''); pudlMd.command(l, 'collapse'); });
  await settle(p);
  await p.keyboard.press('Shift');
  await p.focus('.md-resize');
  await p.waitForTimeout(50);
  check('focusing the handle from the keyboard opens a peek', await p.evaluate(() => document.querySelector('.md-layout').hasAttribute('data-md-peek-open')));
  await p.keyboard.press('ArrowDown');
  check('Down on the handle goes into the peeked list', await p.evaluate(() => document.activeElement.matches('.md-sidebar a')));
  await p.keyboard.press('Escape');
  check('Escape closes it and returns focus to the handle', await p.evaluate(() => !document.querySelector('.md-layout').hasAttribute('data-md-peek-open') && document.activeElement.matches('.md-resize')));
  await p.keyboard.press('Shift');
  await p.evaluate(() => { document.querySelector('.md-resize').blur(); });
  await p.focus('.md-resize');
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(100);
  check('choosing a row in the peek closes it', await p.evaluate(() => !document.querySelector('.md-layout').hasAttribute('data-md-peek-open')));
  await p.close();

  /* === Without data-md-peek nothing changes ============================== */
  p = await open();
  await p.evaluate(() => pudlMd.command(document.querySelector('.md-layout'), 'collapse'));
  await settle(p);
  const hz = await rect(p, '.md-resize');
  await p.mouse.move(hz.l + hz.w / 2, 250);
  await p.waitForTimeout(350);
  check('a layout without data-md-peek does not peek', !(await p.evaluate(() => document.querySelector('.md-layout').hasAttribute('data-md-peek-open'))));
  await p.close();

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
