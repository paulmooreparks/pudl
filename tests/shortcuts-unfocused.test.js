/* 0.96.7: a shortcut pressed with nothing focused goes to the front
   window's command scopes, or on a page with no window layer to its one
   applet's; two applets and nothing focused is no one's key; a modal
   dialog and a focused field keep their own behaviour. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined && !ok ? ' ' + JSON.stringify(detail) : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const p = await b.newPage({ viewport: { width: 1300, height: 800 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  const ran = () => p.evaluate(() => { const r = __ran.slice(); __ran.length = 0; return r; });
  const prevented = () => p.evaluate(() => { const r = __prevented.slice(); __prevented.length = 0; return r; });
  const blur = () => p.evaluate(() => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); return document.activeElement === document.body; });

  await p.goto(ROOT + '/tests/fixtures/shortcuts-unfocused.html');
  await p.waitForFunction(() => window.pudlWindows && pudlWindows.state().open.length === 2 && window.pudlCommands);

  await p.evaluate(() => pudlWindows.raise('b'));
  check('the fixture starts with nothing focused', await blur());
  await p.keyboard.press('F9');
  let r = await ran(), pv = await prevented();
  check('with nothing focused, F9 goes to the front window\'s applet and is taken', r.join() === 'mount-b:F9' && pv.includes('F9:true'), { r, pv });
  await p.keyboard.press('Control+S');
  r = await ran(); pv = await prevented();
  check('a key the browser binds goes to the front window\'s applet too, and is taken from the browser', r.join() === 'mount-b:Mod+S' && pv.some(x => /^s:true$/i.test(x)), { r, pv });

  /* Activating a window by its title bar leaves focus on the body. */
  await p.locator('.win[data-win="a"] .win-head').click();
  await p.waitForFunction(() => pudlWindows.state().top === 'a');
  await blur();
  await p.keyboard.press('F9');
  r = await ran();
  check('after activating another window by its title bar, its applet gets the key', r.join() === 'mount-a:F9', r);

  /* The page's own scope still answers, after the window's. */
  await p.keyboard.press('F8');
  r = await ran();
  check('a key only the page binds still reaches the page', r.join() === 'page:F8', r);

  /* A focused field inside a window: its own scope, as before. */
  await p.evaluate(() => pudlWindows.raise('b'));
  await p.focus('#field-a');
  await p.keyboard.press('F9');
  r = await ran();
  check('a key pressed in a window\'s field goes to that window, not the front one', r.join() === 'mount-a:F9', r);

  /* A focused field outside every window: no guess is made. */
  await p.focus('#outside');
  await p.keyboard.press('F9');
  r = await ran(); pv = await prevented();
  check('a key pressed in a field outside the windows goes to no applet and is left alone', r.length === 0 && pv.includes('F9:false'), { r, pv });

  /* A modal dialog keeps the key. */
  await p.evaluate(() => document.getElementById('modal').showModal());
  await blur();
  await p.keyboard.press('F9');
  r = await ran();
  check('with a modal dialog open nothing runs', r.length === 0, r);
  await p.evaluate(() => document.getElementById('modal').close());

  /* A page with no window layer and one mount. */
  await p.goto(ROOT + '/tests/fixtures/shortcuts-unfocused.html?page');
  await p.waitForFunction(() => window.pudlCommands && document.getElementById('mount-p1'));
  await blur();
  await p.keyboard.press('F9');
  r = await ran();
  check('on a page with one applet and nothing focused, the key goes to it', r.join() === 'mount-p1:F9', r);

  /* Two mounts and nothing focused: no one's key. */
  await p.goto(ROOT + '/tests/fixtures/shortcuts-unfocused.html?two');
  await p.waitForFunction(() => window.pudlCommands && document.getElementById('mount-p2'));
  await blur();
  await p.keyboard.press('F9');
  r = await ran(); pv = await prevented();
  check('on a page with two applets and nothing focused, no guess is made', r.length === 0 && pv.includes('F9:false'), { r, pv });
  await p.keyboard.press('F8');
  r = await ran();
  check('the page\'s own key still works there', r.join() === 'page:F8', r);

  check('no page errors', !errors.length, errors);
  await b.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
