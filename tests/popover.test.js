/* Split buttons and popovers (0.74.0): a main key joined to a menu button
   whose menu lines up under the whole button, and a panel of any content
   anchored to its control, placed, focused and closed as it should be. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + (detail || '')));
  if (!ok) failures++;
}

(async () => {
  const browser = await launch();
  const p = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  await p.goto(ROOT + '/tests/fixtures/popover.html');
  await p.waitForFunction(() => window.pudlMenu);
  const rect = sel => p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), h: Math.round(r.height) }; }, sel);
  const open = id => p.evaluate(id => document.getElementById(id).matches(':popover-open'), id);
  const active = () => p.evaluate(() => document.activeElement.id);

  /* The split button. */
  const main = await rect('#save'), more = await rect('#split .menu-btn');
  check('a split button\'s keys are joined, one height, sharing a border', main.h === more.h && more.l === main.r - 1, JSON.stringify([main, more]));
  await p.click('#split .menu-btn');
  await p.waitForFunction(() => document.getElementById('save-more').matches(':popover-open') && !document.getElementById('save-more').classList.contains('placing'));
  const menu = await rect('#save-more');
  check('its menu lines up under the whole button, not only its caret', Math.abs(menu.l - main.l) <= 1 && menu.t >= main.b, JSON.stringify([menu, main]));
  await p.keyboard.press('Escape');

  /* A plain popover. */
  await p.click('#open-a');
  await p.waitForFunction(() => document.getElementById('pop-a').matches(':popover-open') && !document.getElementById('pop-a').classList.contains('placing'));
  const a = await rect('#pop-a'), ba = await rect('#open-a');
  check('a popover opens below its control, lined up with it', Math.abs(a.l - ba.l) <= 1 && a.t >= ba.b && a.t - ba.b <= 6, JSON.stringify([a, ba]));
  check('and takes focus into its first field', await active() === 'min');
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => document.activeElement.id === 'open-a', null, { timeout: 2000 }).catch(() => {});
  check('Escape closes it and focus goes back to its control', !(await open('pop-a')) && await active() === 'open-a');
  await p.click('#open-a');
  await p.mouse.click(900, 650);
  check('a press outside closes it', !(await open('pop-a')));

  /* With a pointer. */
  await p.click('#open-b');
  await p.waitForFunction(() => document.getElementById('pop-b').matches(':popover-open') && !document.getElementById('pop-b').classList.contains('placing'));
  const b = await rect('#pop-b'), bb = await rect('#open-b');
  const px = await p.evaluate(() => parseFloat(getComputedStyle(document.getElementById('pop-b')).getPropertyValue('--popover-pointer-x')));
  const side = await p.evaluate(() => document.getElementById('pop-b').getAttribute('data-menu-side'));
  check('a popover with a pointer stands off its control and aims at its middle', side === 'below' && b.t - bb.b >= 9 && Math.abs(b.l + px - (bb.l + bb.r) / 2) <= 1, JSON.stringify({ b, bb, px, side }));
  await p.keyboard.press('Escape');
  await p.click('#open-low');
  await p.waitForFunction(() => document.getElementById('pop-low').matches(':popover-open') && !document.getElementById('pop-low').classList.contains('placing'));
  const low = await rect('#pop-low'), bl = await rect('#open-low');
  check('near the foot of the window it opens above, its pointer turned down', await p.evaluate(() => document.getElementById('pop-low').getAttribute('data-menu-side')) === 'above' && low.b <= bl.t, JSON.stringify([low, bl]));
  await p.keyboard.press('Escape');

  /* With a title and a close key. */
  await p.click('#open-c');
  await p.waitForFunction(() => document.getElementById('pop-c').contains(document.activeElement), null, { timeout: 2000 }).catch(() => {});
  check('a popover with a head takes focus past its close key to its content', await active() === 'c-act');
  await p.click('#pop-c .popover-close');
  check('its close key closes it', !(await open('pop-c')));

  await browser.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
