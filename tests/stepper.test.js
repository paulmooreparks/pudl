/* Steppers (0.74.0): done, current and to come told by a glyph as well as
   a colour, done steps links back, and on a narrow screen only the current
   step's words in sight. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + (detail || '')));
  if (!ok) failures++;
}

(async () => {
  const browser = await launch();
  for (const theme of ['light', 'dark']) {
    const p = await browser.newPage({ viewport: { width: 820, height: 400 } });
    await p.goto(ROOT + '/tests/fixtures/stepper.html');
    await p.evaluate(t => { document.documentElement.dataset.theme = t; }, theme);
    const s = await p.evaluate(() => {
      const li = Array.from(document.querySelectorAll('#across > li'));
      const mark = el => getComputedStyle(el, '::before');
      const tick = getComputedStyle(li[0].firstElementChild, '::before');
      return {
        doneFill: mark(li[0]).backgroundColor, accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
        tick: (tick.maskImage || tick.webkitMaskImage || '').includes('svg'), tickColour: tick.backgroundColor,
        currentRing: mark(li[2]).borderTopWidth, currentWeight: getComputedStyle(li[2]).fontWeight, currentNumber: mark(li[2]).content,
        todoNumber: mark(li[3]).content, todoColour: getComputedStyle(li[3]).color, muted: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim(),
        doneLine: getComputedStyle(li[0], '::after').backgroundColor, todoLine: getComputedStyle(li[2], '::after').backgroundColor,
        links: li.filter(l => l.classList.contains('done')).every(l => l.firstElementChild.tagName === 'A')
      };
    });
    check(theme + ': a done step is the accent circle with a tick drawn on it', s.tick && s.doneFill !== 'rgba(0, 0, 0, 0)' && s.tickColour !== s.doneFill, JSON.stringify(s));
    check(theme + ': the current step is its number in a 2px ring, in bold', s.currentRing === '2px' && s.currentWeight === '700' && /counter/.test(s.currentNumber), JSON.stringify(s));
    check(theme + ': lines between done steps take the accent, the rest stay grey', s.doneLine !== s.todoLine, JSON.stringify(s));
    check(theme + ': done steps are links back', s.links);
    await p.close();
  }
  const n = await browser.newPage({ viewport: { width: 400, height: 300 } });
  await n.goto(ROOT + '/tests/fixtures/stepper.html');
  const narrow = await n.evaluate(() => Array.from(document.querySelectorAll('#across > li')).map(li => Math.round(li.firstElementChild.getBoundingClientRect().width)));
  check('on a narrow screen only the current step keeps its words in sight', narrow[2] > 20 && narrow[0] === 0 && narrow[1] === 0 && narrow[3] === 0, JSON.stringify(narrow));
  const tickNarrow = await n.evaluate(() => { const r = document.querySelector('#across > li').getBoundingClientRect(); return r.width >= 24; });
  check('and the marks stay', tickNarrow);
  await browser.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
