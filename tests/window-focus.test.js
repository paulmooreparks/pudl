/* Raising a window gives it the keyboard, from parkscomputing.com's
   Architecture/pudl-bug-raise-focus.md. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const errors = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/tests/fixtures/window-focus.html');
  await p.waitForFunction(() => window.pudlWindows);
  const active = () => p.evaluate(() => { const a = document.activeElement; return a.id || (a.classList.contains('win-head') ? 'head:' + a.closest('.win').getAttribute('data-win') : a.tagName); });
  const pressHead = async k => {
    const r = await p.evaluate(k => { const t = document.querySelector('.win[data-win="' + k + '"] .win-title').getBoundingClientRect(); return { x: t.left + 10, y: t.top + 5 }; }, k);
    await p.mouse.click(r.x, r.y);
  };

  /* The reader's case: typed in the terminal, then the editor, then
     pressed the terminal's title bar. */
  await p.click('#sh'); await p.keyboard.type('ls');
  await p.click('#ed'); await p.keyboard.type('hello');
  await pressHead('term');
  check('pressing a window\'s title bar gives focus back to what last had it in that window', (await active()) === 'sh', await active());
  await p.keyboard.type(' -l');
  check('so what the reader types next goes there', (await p.inputValue('#sh')) === 'ls -l' && (await p.inputValue('#ed')) === 'hello');

  /* A window nobody has typed in yet takes its autofocus element, or else
     its title bar. */
  await pressHead('notes');
  check('the first time, a window gives focus to its autofocus element', (await active()) === 'note', await active());
  await p.evaluate(() => document.getElementById('ed').blur());
  await p.evaluate(() => { const s = document.getElementById('sh'); s.remove(); });
  await pressHead('editor');
  check('a window whose remembered element is still there gets it back', (await active()) === 'ed', await active());
  await pressHead('term');
  check('and one whose remembered element has gone gives the title bar the keyboard', (await active()) === 'head:term', await active());

  /* A press inside a window's body keeps what it pressed. */
  await p.click('#ed');
  check('a press in the body focuses what it lands on', (await active()) === 'ed');

  /* The dock of open windows raises with the keyboard too. */
  await p.click('#note');
  await p.click('.win-dock [data-win-tab="editor"], .win-dock a:has-text("Editor")');
  check('bringing a window forward from the dock gives it the keyboard', (await active()) === 'ed', await active());

  /* A press on a title bar of the window that already holds focus moves
     nothing. */
  await p.click('#ed');
  await pressHead('editor');
  check('a press on the title bar of the window already holding focus leaves focus where it is', (await active()) === 'ed', await active());

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
