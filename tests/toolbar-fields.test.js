/* A field in a toolbar keeps its own keys and is a Tab stop of its own
   (0.70.1): Left, Right, Home and
   End edit the field, Left at its start and Right at its end move on, a
   number field keeps its arrows always, and Tab moves from field to field
   as in a form, while the toolbar's one stop stays on its buttons. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + (detail || '')));
  if (!ok) failures++;
}

const PAGE = `<!doctype html><html lang="en"><head><link rel="stylesheet" href="/dist/pudl.css">
<script src="/dist/pudl-toolbar.js" defer></script></head><body>
<button id="before" type="button">Before</button>
<div class="toolbar" role="toolbar" aria-label="Score">
  <div class="toolbar-group" role="group" aria-label="Play">
    <button id="b1" type="button" class="icon-btn" aria-label="Play">P</button>
    <button id="b2" type="button" class="icon-btn" aria-label="Restart">R</button>
  </div>
  <div class="toolbar-group" role="group" aria-label="Find" data-toolbar-keep>
    <input id="q" type="search" aria-label="Find">
  </div>
  <div class="toolbar-group" role="group" aria-label="Bars" data-toolbar-keep>
    <input id="first" type="number" aria-label="First bar" value="1">
    <input id="last" type="number" aria-label="Last bar" value="8">
  </div>
  <div class="toolbar-group" role="group" aria-label="View">
    <button id="b3" type="button" class="icon-btn" aria-label="Zoom">Z</button>
  </div>
</div>
<button id="after" type="button">After</button>
</body></html>`;

(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  await page.route('**/toolbar-fields', route => route.fulfill({ contentType: 'text/html', body: PAGE }));
  await page.goto(ROOT + '/toolbar-fields');
  await page.waitForFunction(() => document.getElementById('b2').tabIndex === -1);
  const active = () => page.evaluate(() => document.activeElement.id);
  const caret = () => page.evaluate(() => document.activeElement.selectionStart);
  const tabs = () => page.evaluate(() => ['b1', 'b2', 'q', 'first', 'last', 'b3'].map(id => document.getElementById(id).tabIndex).join(','));

  check('every field is a Tab stop and the toolbar is one more, on its first button', await tabs() === '0,-1,0,0,0,-1', await tabs());

  await page.focus('#before');
  await page.keyboard.press('Tab');
  check('Tab enters the toolbar on its stop', await active() === 'b1', await active());
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  check('Right moves from a button onto a field, its caret at the start', await active() === 'q' && await caret() === 0, await active());
  check('arrowing onto a field leaves the toolbar\'s stop on the last button', await tabs() === '-1,0,0,0,0,-1', await tabs());

  await page.keyboard.type('abc');
  await page.keyboard.press('ArrowLeft');
  check('Left moves the caret in a field', await active() === 'q' && await caret() === 2, `${await active()} ${await caret()}`);
  await page.keyboard.press('Home');
  check('Home moves the caret to the field\'s start', await active() === 'q' && await caret() === 0, `${await active()} ${await caret()}`);
  await page.keyboard.press('End');
  check('End moves the caret to the field\'s end', await active() === 'q' && await caret() === 3, `${await active()} ${await caret()}`);
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowLeft');
  check('Left at the field\'s start moves to the control before', await active() === 'b2', await active());
  await page.keyboard.press('ArrowRight');
  check('Right from the button comes back in at the field\'s start', await active() === 'q' && await caret() === 0, await active());
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowRight');
  check('Right at the field\'s end moves to the control after', await active() === 'first', await active());

  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Home');
  check('a number field keeps Left, Right and Home', await active() === 'first', await active());
  await page.keyboard.press('Tab');
  check('Tab goes from one field to the next', await active() === 'last', await active());
  await page.keyboard.press('Shift+Tab');
  check('Shift+Tab comes back', await active() === 'first', await active());
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  check('Shift+Tab from the first field reaches the toolbar\'s stop', await active() === 'b2', await active());
  await page.keyboard.press('End');
  check('End from a button goes to the last control', await active() === 'b3', await active());
  await page.keyboard.press('Home');
  check('Home from a button goes to the first control', await active() === 'b1', await active());
  await page.focus('#last');
  await page.keyboard.press('Tab');
  check('Tab from the last field leaves the toolbar', await active() === 'after', await active());

  await browser.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
