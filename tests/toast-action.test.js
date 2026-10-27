/* A toast's one action (0.90.0): a raised button between the text and the
   dismiss button, run once when pressed, as a command or a function; the
   toast never leaves by itself and goes when the action is pressed. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined && !ok ? ' ' + JSON.stringify(detail) : ''));
  if (!ok) failures++;
}
(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 }, reducedMotion: 'reduce' });
  const errors = [], warnings = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'warning') warnings.push(m.text()); });
  await page.goto(ROOT + '/tests/fixtures/toast-action.html');
  await page.waitForFunction(() => window.pudlToast && window.pudlCommands && pudlCommands.find('app.restart'));
  const ran = () => page.evaluate(() => window.__ran.slice());

  /* A page command: its label, between text and dismiss, run once. */
  const shape = await page.evaluate(() => {
    const t = pudlToast('The update is ready. Restart now to install it.', { action: { run: 'app.restart' }, ms: 300 });
    t.id = 'cmd-toast';
    return [...t.children].map(c => c.className);
  });
  check('the action stands between the text and the dismiss button', JSON.stringify(shape) === JSON.stringify(['toast-text', 'btn btn-sm toast-action', 'toast-close']), shape);
  check('a command action takes the command\'s label', await page.locator('#cmd-toast .toast-action').innerText() === 'Restart now');
  await page.waitForTimeout(800);
  check('a toast with an action does not leave by itself, whatever its time', await page.locator('#cmd-toast').isVisible());
  await page.click('#cmd-toast .toast-action');
  await page.waitForFunction(() => !document.getElementById('cmd-toast'));
  check('pressing a command action runs it once and dismisses the toast', JSON.stringify(await ran()) === '["restart"]', await ran());

  /* A command in another scope, found from the scope given. */
  await page.evaluate(() => { window.__ran.length = 0; pudlToast('The download failed.', { action: { run: 'pane.retry', scope: document.getElementById('pane') } }).id = 'scoped'; });
  check('a scoped command action takes its label', await page.locator('#scoped .toast-action').innerText() === 'Try again');
  await page.click('#scoped .toast-action');
  await page.waitForFunction(() => !document.getElementById('scoped'));
  check('a scoped command action runs once', JSON.stringify(await ran()) === '["retry"]', await ran());

  /* A function. */
  await page.evaluate(() => { window.__ran.length = 0; pudlToast('Saved.', { action: { label: 'Undo', run: () => window.__ran.push('undo') } }).id = 'fn'; });
  await page.click('#fn .toast-action');
  await page.waitForFunction(() => !document.getElementById('fn'));
  check('a function action runs once', JSON.stringify(await ran()) === '["undo"]', await ran());

  /* A failure is raised as a danger toast. */
  await page.evaluate(() => { pudlToast('Downloading.', { action: { run: 'pane.fails', scope: document.getElementById('pane') } }).id = 'failing'; });
  await page.click('#failing .toast-action');
  await page.waitForSelector('.toast.danger');
  check('a failing action is reported as a danger toast', /failed again/.test(await page.locator('.toast.danger').innerText()));

  /* A disabled command keeps the button disabled, and the toast stays. */
  await page.evaluate(() => { pudlToast('Waiting.', { action: { run: 'app.locked' } }).id = 'locked'; pudlCommands.changed(); });
  await page.waitForFunction(() => document.querySelector('#locked .toast-action').disabled);
  check('a disabled command\'s action is disabled', await page.locator('#locked .toast-action').isDisabled());

  /* The server's toast with an action waits, and its action runs once. */
  await page.evaluate(() => { window.__ran.length = 0; });
  await page.waitForTimeout(600);
  check('a server toast with an action stays', await page.locator('#server-toast').isVisible());
  await page.click('#server-toast .toast-action');
  await page.waitForFunction(() => !document.getElementById('server-toast'));
  check('a server toast\'s command action runs once', JSON.stringify(await ran()) === '["restart"]', await ran());

  /* A long label ends in an ellipsis, with the text keeping its room. */
  const long = await page.evaluate(() => {
    const t = pudlToast('Short text.', { action: { label: 'Restart the application now and install every waiting update', run: () => {} } });
    const b = t.querySelector('.toast-action');
    return { cut: b.scrollWidth > b.clientWidth, within: b.getBoundingClientRect().right <= t.getBoundingClientRect().right, tip: b.getAttribute('data-tooltip') };
  });
  check('a long action label ends in an ellipsis inside the toast, its whole label its tooltip', long.cut && long.within && /every waiting update/.test(long.tip), long);

  /* Misuse is reported and leaves a plain toast. */
  const plain = await page.evaluate(() => pudlToast('No label.', { action: { run: () => {} } }).querySelectorAll('.toast-action').length);
  check('a function action without a label is left out and reported', plain === 0 && warnings.some(w => /needs a label/.test(w)), warnings);

  check('no errors', errors.length === 0, errors);
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
