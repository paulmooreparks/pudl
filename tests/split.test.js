/* Splitters, from parkscomputing.com's Architecture/pudl-proposal-splitter.md. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
const SIDE = '#split ~ .demo .split:not(.stacked)';
const STACK = '#split ~ .demo .split.stacked';
(async () => {
  const b = await launch();
  const errors = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/reference.html');
  await p.waitForFunction(() => window.pudlSplit);
  await p.evaluate(() => { window.__sizes = []; document.addEventListener('pudl:split', e => window.__sizes.push(e.detail.size)); });
  const info = sel => p.evaluate(s => {
    const split = document.querySelector(s), h = split.querySelector('.split-handle'), first = split.querySelector('.split-pane');
    const r = split.getBoundingClientRect(), f = first.getBoundingClientRect();
    return { role: h.getAttribute('role'), orient: h.getAttribute('aria-orientation'), now: +h.getAttribute('aria-valuenow'), min: +h.getAttribute('aria-valuemin'),
             max: +h.getAttribute('aria-valuemax'), controls: h.getAttribute('aria-controls') === first.id, tab: h.tabIndex,
             first: Math.round(split.classList.contains('stacked') ? f.height : f.width), whole: Math.round(split.classList.contains('stacked') ? r.height : r.width),
             prop: split.style.getPropertyValue('--split-a') };
  }, sel);

  let a = await info(SIDE);
  check('the handle is a focusable separator with its values', a.role === 'separator' && a.orient === 'vertical' && a.controls && a.tab === 0 &&
        a.min === 100 && Math.abs(a.max - Math.round((a.whole) * 0.7)) <= 1 && a.now === a.first && Math.abs(a.first - a.whole / 2) <= 4, JSON.stringify(a));

  /* By pointer. */
  await p.locator(SIDE + ' .split-handle').scrollIntoViewIfNeeded();
  const hb = await p.locator(SIDE + ' .split-handle').boundingBox();
  await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await p.mouse.down();
  await p.mouse.move(hb.x + hb.width / 2 - 120, hb.y + hb.height / 2, { steps: 6 });
  await p.mouse.up();
  const dragged = await info(SIDE);
  check('dragging the handle sets the first pane\'s size on the split, and says so', Math.abs(dragged.first - (a.first - 120)) <= 3 &&
        dragged.prop === dragged.first + 'px' && dragged.now === dragged.first && (await p.evaluate(() => window.__sizes)).slice(-1)[0] === dragged.first, JSON.stringify(dragged));

  /* By keyboard, within its limits. */
  await p.focus(SIDE + ' .split-handle');
  await p.keyboard.press('ArrowRight');
  const stepped = await info(SIDE);
  await p.keyboard.press('Home');
  const home = await info(SIDE);
  await p.keyboard.press('End');
  const end = await info(SIDE);
  check('the arrow keys step, and Home and End go to the limits', stepped.first === dragged.first + 16 && home.first === 100 && Math.abs(end.first - end.max) <= 1, JSON.stringify({ stepped: stepped.first, home: home.first, end: end.first, max: end.max }));
  await p.waitForTimeout(400);
  check('the keyboard\'s change is announced once it goes quiet', (await p.evaluate(() => window.__sizes)).slice(-1)[0] === end.first);
  await p.keyboard.press('Enter');
  const back = await info(SIDE);
  check('Enter returns the stylesheet\'s size, and says so with null', back.prop === '' && Math.abs(back.first - back.whole / 2) <= 4 &&
        (await p.evaluate(() => window.__sizes)).slice(-1)[0] === null, JSON.stringify(back));

  /* Stacked. */
  const s = await info(STACK);
  await p.focus(STACK + ' .split-handle');
  await p.keyboard.press('ArrowDown');
  const s2 = await info(STACK);
  check('a stacked split\'s handle is horizontal and moves with Up and Down', s.orient === 'horizontal' && s2.first === s.first + 16, JSON.stringify({ s, s2 }));

  /* The limits hold as the split narrows. */
  await p.keyboard.press('End');
  await p.evaluate(s => { document.querySelector(s).style.height = '150px'; }, STACK);
  await p.waitForTimeout(300);
  const narrowed = await info(STACK);
  check('a size beyond a new limit is brought back within it', narrowed.first <= narrowed.max && narrowed.max === narrowed.whole - 60, JSON.stringify(narrowed));

  /* Right to left. */
  await p.evaluate(s => document.querySelector(s).setAttribute('dir', 'rtl'), SIDE);
  const r0 = await info(SIDE);
  await p.focus(SIDE + ' .split-handle');
  await p.keyboard.press('ArrowLeft');
  const r1 = await info(SIDE);
  check('right to left, the arrow pointing into the second pane widens the first', r1.first === r0.first + 16, JSON.stringify({ r0: r0.first, r1: r1.first }));

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
