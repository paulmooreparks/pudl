const { launch, ROOT } = require('./lib');
const assert = require('assert');
(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(ROOT + '/samples/annotations.html');
  await page.waitForFunction(() => window.pudlAnnotations && document.querySelector('[data-notes-beside]'));
  assert(await page.evaluate(() => {
    const a = document.querySelector('#note-one').getBoundingClientRect(), b = document.querySelector('#note-two').getBoundingClientRect();
    return b.top >= a.bottom && document.querySelector('#body').getBoundingClientRect().width === 480;
  }), 'notes avoid collisions without resizing the body');
  await page.evaluate(() => {
    const range = document.createRange(); range.selectNodeContents(document.querySelector('#first'));
    const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
  });
  await page.waitForSelector('#passage-actions:not([hidden])');
  await page.click('[data-selection-action]');
  assert((await page.textContent('#result')).includes('quote: A selection'), 'pointer action retains range');
  await page.focus('[data-selection-action]');
  await page.keyboard.press('Enter');
  assert((await page.textContent('#result')).includes('quote: A selection'), 'keyboard action retains range');
  await page.evaluate(() => {
    window.escapeSeen = false;
    document.addEventListener('keydown', e => { if (e.key === 'Escape') window.escapeSeen = !e.defaultPrevented; });
  });
  await page.keyboard.press('Escape');
  assert(await page.evaluate(() => document.querySelector('#passage-actions').hidden && window.escapeSeen), 'Escape dismisses without consumption');
  await page.setViewportSize({ width: 600, height: 800 });
  await page.waitForFunction(() => !document.querySelector('[data-notes-beside]'));
  await page.click('.note-marker');
  assert(await page.evaluate(() => document.activeElement.id === 'note-one'), 'marker focuses mounted note');
  await page.click('#note-one .note-back');
  assert(await page.evaluate(() => document.activeElement.id === 'first'), 'return focuses passage without URL changes');
  assert(!new URL(page.url()).hash);
  await page.evaluate(() => {
    const range = document.createRange(); range.selectNodeContents(document.querySelector('#second'));
    window.rangeAccepted = pudlAnnotations.setRange(document.querySelector('#article'), document.querySelector('#note-one'), range);
  });
  assert(await page.evaluate(() => window.rangeAccepted), 'Range anchors accepted');
  await page.evaluate(() => pudlAnnotations.destroy(document.querySelector('main')));
  assert(await page.locator('.note-marker').count() === 0, 'destroy removes generated controls');
  await page.evaluate(() => pudlAnnotations.enhance(document.querySelector('main')));
  assert(await page.locator('.note-marker').count() === 2, 'reenhancement is idempotent');
  await page.evaluate(() => {
    const range = document.createRange(); range.setStart(document.querySelector('#first').firstChild, 0);
    range.setEnd(document.querySelector('#result'), 0);
    getSelection().removeAllRanges(); getSelection().addRange(range);
  });
  await page.waitForFunction(() => document.querySelector('#passage-actions').hidden);
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.evaluate(() => { document.querySelector('#article').dir = 'rtl'; pudlAnnotations.refresh(); });
  await page.waitForFunction(() => document.querySelector('[data-notes-beside]') && document.querySelector('#note-one').getBoundingClientRect().right < document.querySelector('#body').getBoundingClientRect().left);
  await page.emulateMedia({ media: 'print' });
  assert(await page.evaluate(() => getComputedStyle(document.querySelector('#note-one')).position === 'static'), 'print restores note flow');
  await page.emulateMedia({ media: 'screen' });

  await page.goto(ROOT + '/tests/fixtures/desktop-menubar.html');
  await page.waitForSelector('.menubar-title');
  await page.addScriptTag({ url: ROOT + '/dist/pudl-tooltip.js' });
  await page.focus('#editor-text');
  await page.keyboard.press('Alt');
  await page.waitForSelector('.tooltip:popover-open');
  await page.keyboard.press('Escape');
  assert(await page.evaluate(() => document.activeElement.id === 'editor-text' && !document.querySelector('.tooltip:popover-open')), 'same Escape dismisses tooltip and returns to editor');
  assert(await page.evaluate(() => {
    const details = document.createElement('details'); details.open = true;
    details.innerHTML = '<summary id="return-summary">Return here</summary><p>Content</p>'; document.body.append(details);
    window.returns = [];
    document.addEventListener('pudl:menubar-return-focus', e => window.returns.push(e.detail.reason));
    return pudlMenubar.focus({ returnTo: details.firstChild });
  }), 'native summary accepted without tag whitelist');
  await page.keyboard.press('Escape');
  assert(await page.evaluate(() => document.activeElement.id === 'return-summary' && window.returns[0] === 'escape'));
  await page.evaluate(() => {
    const frame = document.createElement('iframe'); frame.id = 'return-frame'; frame.srcdoc = '<input id="child">'; document.body.append(frame);
    pudlMenubar.focus({ returnTo: frame });
  });
  await page.keyboard.press('Enter');
  await page.waitForSelector('#menubar-panel:popover-open');
  await page.evaluate(() => pudlMenubar.focus());
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  assert(await page.evaluate(() => document.activeElement.id === 'return-frame'), 'repeat entry from panel retains frame target');
  await page.evaluate(() => { pudlMenubar.focus({ returnTo: document.querySelector('#editor-text') }); document.querySelector('#editor-text').disabled = true; });
  const count = await page.evaluate(() => window.returns.length);
  await page.keyboard.press('Escape');
  assert(await page.evaluate(n => window.returns.length === n, count), 'disabled return target emits no return event');
  await page.focus('#return-summary');
  await page.evaluate(() => { document.querySelector('#editor-text').disabled = false; pudlMenubar.focus(); });
  await page.keyboard.press('Enter');
  await page.waitForSelector('#menubar-panel:popover-open');
  await page.evaluate(() => pudlMenubar.refresh());
  assert(await page.evaluate(() => document.querySelector('#menubar-panel').matches(':popover-open')), 'unchanged redraw retains open menu');
  await page.evaluate(() => {
    document.querySelector('[data-menubar-source] > li').setAttribute('data-menu-glyph', 'home');
    pudlMenubar.refresh();
  });
  await page.waitForSelector('#menubar-panel:popover-open');
  assert(await page.evaluate(() => document.querySelector('#menubar-panel').matches(':popover-open')), 'rebuilt surviving title reopens');
  await page.evaluate(() => { document.querySelector('[data-menubar-source] > li').remove(); pudlMenubar.refresh(); });
  assert(await page.evaluate(() => !document.querySelector('#menubar-panel').matches(':popover-open')), 'removed title does not reopen');

  await page.goto(ROOT + '/samples/shared-docks.html');
  await page.waitForSelector('[data-dock-key="workspace"]');
  await page.evaluate(() => {
    const header = document.createElement('header'); header.className = 'topbar';
    header.innerHTML = '<nav class="menubar" data-menubar><ul data-menubar-source hidden><li>Site<ul><li><button>About</button></li></ul></li><li data-menubar-id="go">Go<ul><li><button>Logs</button></li></ul></li></ul></nav>';
    document.body.prepend(header);
    pudlWindows.dockMode('left', 'rail');
  });
  await page.addScriptTag({ url: ROOT + '/dist/pudl-menubar.js' });
  await page.click('[data-dock-key="workspace"]');
  await page.waitForSelector('.win[data-win="workspace"][data-win-dock-peek]');
  await page.locator('.menubar-title').filter({ hasText: 'Go' }).click();
  await page.waitForFunction(() => !document.querySelector('.win[data-win="workspace"][data-win-dock-peek]'));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert(await page.evaluate(() => document.querySelector('#menubar-panel').matches(':popover-open')), 'site menu survives deferred dock-peek dismissal');
  assert.deepStrictEqual(errors, []);
  await browser.close();
  console.log('PASS annotation, menu redraw, focus and tooltip regressions');
})().catch(error => { console.log('FAIL ' + error.message + ' ' + error.stack); process.exit(1); });
