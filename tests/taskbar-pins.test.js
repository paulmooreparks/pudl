const { launch, ROOT, out } = require('./lib');
const assert = require('assert/strict');
(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(ROOT + '/samples/taskbar-pinning.html');
  const pin = id => page.locator('.win-bar [data-win-pin="' + id + '"]');
  await pin('editor').waitFor();
  assert.equal(await pin('editor').getAttribute('data-win-pin-running'), 'false');
  await page.evaluate(() => {
    window.pinEvents = [];
    document.addEventListener('pudl:taskbar-change', e => pinEvents.push(e.detail));
  });
  await pin('editor').click();
  await page.waitForSelector('.win[data-win="editor"]');
  assert.equal(await pin('editor').getAttribute('data-win-pin-running'), 'true');
  assert.equal(await page.locator('.win-bar [data-win-tab="editor"]').count(), 1);
  await pin('editor').click();
  assert.equal(await page.evaluate(() => !!pudlWindows.state().min.editor), true, 'a foreground taskbar window minimizes whether pinned or unpinned');
  await pin('editor').click();
  assert.equal(await page.evaluate(() => !!pudlWindows.state().min.editor), false, 'the same taskbar entry restores its minimized window');
  await page.reload();
  await page.locator('.win[data-win="editor"]').waitFor();
  assert.equal(await pin('editor').getAttribute('data-win-pin-running'), 'true', 'restored root retains its destination');
  assert.equal(await page.locator('.win-bar [data-win-tab="editor"]').count(), 1, 'refresh does not add a duplicate ordinary entry');
  await page.evaluate(() => pudlWindows.minimize('editor'));
  await pin('editor').click();
  assert.equal(await page.evaluate(() => !!pudlWindows.state().min.editor), false);
  await page.getByRole('link', { name: 'Open second editor' }).click();
  await page.waitForSelector('.win[data-win="editor-copy"]');
  assert.equal(await pin('editor').getAttribute('data-win-stack'), 'pin:editor');
  await pin('editor').focus(); await page.keyboard.press('ArrowDown');
  await page.waitForSelector('.win-stack-panel:popover-open');
  assert.equal(await page.locator('.win-stack-panel [data-win-stack-row]').count(), 2);
  await page.keyboard.press('Escape');
  await page.evaluate(() => pudlWindows.close('editor-copy'));
  assert.equal(await pin('editor').getAttribute('data-win-stack'), null);
  await page.locator('[data-win-pin-toggle="meeting-notes"]').click();
  await pin('meeting-notes').click();
  await page.waitForSelector('.win[data-win="meeting-notes"]');
  assert.deepEqual(await page.evaluate(() => pudlWindows.taskbarState().pins), ['editor', 'meeting-notes']);
  // Existing keyboard ordering handles dormant pins and running destinations.
  await page.locator('[data-win-pin-toggle="calculator"]').click();
  await pin('calculator').focus(); await page.keyboard.press('Alt+Shift+ArrowLeft');
  assert.deepEqual(await page.evaluate(() => pudlWindows.taskbarState().order), ['pin:editor', 'pin:calculator', 'pin:meeting-notes']);
  assert.equal(await pin('calculator').evaluate(el => el === document.activeElement), true);
  await page.locator('.win-bar-arrange').click();
  await page.waitForSelector('.win-taskbar-arrangement:popover-open');
  const arrangement = page.locator('.win-taskbar-arrangement');
  await arrangement.locator('select').selectOption('pin:calculator');
  await arrangement.getByRole('button', { name: 'Unpin from taskbar', exact: true }).click();
  assert.equal(await pin('calculator').count(), 0);
  await page.keyboard.press('Escape');
  await page.evaluate(() => pudlWindows.close('editor'));
  assert.equal(await pin('editor').getAttribute('data-win-pin-running'), 'false');
  await pin('editor').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Unpin from taskbar', exact: true }).click();
  assert.equal(await pin('editor').count(), 0);
  await page.locator('[data-win-pin-toggle="editor"]').click();
  await pin('editor').click(); await page.waitForSelector('.win[data-win="editor"]');
  await page.evaluate(() => pudlWindows.pinTaskbar('editor', false));
  assert.equal(await page.locator('.win[data-win="editor"]').count(), 1, 'unpin preserves windows');
  assert.equal(await page.locator('.win-bar [data-win-tab="editor"]').count(), 1);
  await page.locator('.win-bar [data-win-tab="editor"]').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Pin to taskbar', exact: true }).click();
  // Bulk controls retain persistent entries, including when every window closes.
  await page.locator('.win-bar [data-win-close-all]').click();
  assert.deepEqual(await page.evaluate(() => pudlWindows.state().open), []);
  assert.equal(await pin('editor').count(), 1);
  assert.equal(await pin('meeting-notes').count(), 1);
  await page.reload(); await pin('editor').waitFor();
  assert.deepEqual(await page.evaluate(() => pudlWindows.state().open), []);
  assert.equal(await pin('meeting-notes').count(), 1, 'host restores persistent pins');
  const unchanged = await page.evaluate(async () => {
    const destinations = [
      { id: 'editor', label: 'Editor', kind: 'applet', glyph: 'pencil' },
      { id: 'meeting-notes', label: 'Meeting notes', kind: 'page', glyph: 'file' },
      { id: 'calculator', label: 'Calculator', kind: 'applet', glyph: 'app' }
    ];
    const preferences = pudlWindows.taskbarState();
    const options = { destinations, ...preferences };
    pudlWindows.configureTaskbar(options);
    await new Promise(resolve => setTimeout(resolve, 150));
    const observer = new MutationObserver(() => {});
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
    const changed = pudlWindows.configureTaskbar(options);
    const mutations = observer.takeRecords().length; observer.disconnect();
    return { changed, mutations };
  });
  assert.deepEqual(unchanged, { changed: false, mutations: 0 });
  const invalid = await page.evaluate(() => [
    pudlWindows.configureTaskbar({ destinations: [{ id: 'bad', label: 'Bad', href: 'javascript:alert(1)' }] }),
    pudlWindows.configureTaskbar({ destinations: [{ id: 'bad', label: 'Bad', href: 'http://[' }] }),
    pudlWindows.pinTaskbar('unknown', true)
  ]);
  assert.deepEqual(invalid, [false, false, false]);
  // Launcher actions use PUDL's standard row-actions control and menu.
  await page.evaluate(() => pudlLauncher.open(document.getElementById('host-launcher')));
  await page.locator('[data-win-pin-target="editor"]').hover();
  await page.locator('[data-win-pin-target="editor"] [data-row-actions]').click();
  assert.equal(await page.locator('#host-launcher').evaluate(el => el.matches(':popover-open')), true, 'item actions keep the launcher open');
  await page.screenshot({ path: out('taskbar-pins-launcher.png') });
  await page.getByRole('menuitem', { name: 'Unpin from taskbar', exact: true }).click();
  assert.equal(await pin('editor').count(), 0);
  assert.equal(await page.locator('#host-launcher').evaluate(el => el.matches(':popover-open')), true, 'pinning is an item action rather than destination activation');
  await page.locator('[data-win-pin-target="calculator"]').hover();
  await page.locator('[data-win-pin-target="calculator"] [data-row-actions]').click();
  await page.evaluate(() => pudlLauncher.close(document.getElementById('host-launcher')));
  assert.equal(await page.locator('.context-menu').count(), 0, 'closing a popup removes its owned context menu');
  await page.evaluate(() => pudlWindows.pinTaskbar('editor', true));
  await pin('editor').focus(); await page.keyboard.press('Shift+F10');
  await page.getByRole('menuitem', { name: 'Unpin from taskbar', exact: true }).waitFor();
  await page.keyboard.press('Escape');
  // Section membership is explicit; ordering cannot interleave pins with windows.
  await page.evaluate(() => pudlWindows.open('files'));
  await page.waitForSelector('.win[data-win="files"]');
  assert.equal(await page.evaluate(() => pudlWindows.reorderTaskbarEntry('pin:editor', { after: 'files' })), false);
  assert.ok((await page.evaluate(() => pudlWindows.taskbarState().order)).indexOf('pin:editor') < (await page.evaluate(() => pudlWindows.taskbarState().order)).indexOf('files'));
  assert.equal(await page.evaluate(() => pudlWindows.reorderTaskbarEntry('pin:editor', { after: 'files' })), false);
  assert.ok((await page.evaluate(() => pudlWindows.state().taskbarOrder)).every(key => !key.startsWith('pin:')));
  // Removing every pin restores the existing window-order API's behavior.
  await page.evaluate(() => { pudlWindows.pinTaskbar('editor', false); pudlWindows.pinTaskbar('meeting-notes', false); pudlWindows.open('calculator'); });
  await page.waitForSelector('.win[data-win="calculator"]');
  assert.equal(await page.evaluate(() => pudlWindows.reorderTaskbar('calculator', { before: 'files' })), true);
  assert.deepEqual(await page.locator('.win-bar [data-win-tab]').evaluateAll(els => els.map(el => el.dataset.winTab)), ['calculator', 'files']);
  // Dormant navigation keeps its real link, and unavailable destinations do not activate.
  await page.evaluate(() => {
    window.activationRequests = 0;
    document.addEventListener('pudl:taskbar-activate', () => activationRequests++);
    pudlWindows.configureTaskbar({ destinations: [
      { id: 'help', label: 'Help', href: '/reference.html' },
      { id: 'offline', label: 'Unavailable', href: '/offline/', disabled: true }
    ], pins: ['help', 'offline'], order: [] });
  });
  assert.equal(await pin('help').getAttribute('href'), '/reference.html');
  await pin('offline').focus(); await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => activationRequests), 0);
  assert.equal(await pin('offline').getAttribute('aria-disabled'), 'true');
  assert.equal(await pin('offline').getAttribute('href'), null, 'unavailable navigation cannot bypass activation through a modified click');
  // A narrow bar exposes every dormant destination through the real More menu.
  await page.evaluate(() => {
    const destinations = Array.from({ length: 14 }, (_, i) => ({ id: 'item-' + i, label: 'Saved destination ' + i }));
    pudlWindows.configureTaskbar({ destinations, pins: destinations.map(d => d.id), order: [] });
    pudlWindows.close('files'); pudlWindows.close('calculator');
  });
  await page.setViewportSize({ width: 390, height: 800 });
  await page.locator('.win-pins-more').waitFor({ state: 'visible' });
  await page.locator('.win-pins-more').click();
  await page.getByRole('menuitem', { name: /^Saved destination 13, pinned, not open$/ }).click();
  assert.equal(await page.evaluate(() => activationRequests), 1);
  await page.screenshot({ path: out('taskbar-pins-narrow.png') });
  assert.ok(await page.locator('.win-bar').isVisible());
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.evaluate(() => {
    pudlWindows.configureTaskbar({ destinations: [
      { id: 'editor', label: 'Editor', kind: 'applet', glyph: 'pencil' },
      { id: 'meeting-notes', label: 'Meeting notes', kind: 'page', glyph: 'file' },
      { id: 'calculator', label: 'Calculator', glyph: 'list-numbered' }
    ], pins: ['editor', 'meeting-notes', 'calculator'], order: [] });
    pudlWindows.open('editor'); pudlWindows.open('meeting-notes');
  });
  await page.waitForSelector('.win[data-win="meeting-notes"]');
  await page.evaluate(() => document.documentElement.dataset.theme = 'light');
  await page.screenshot({ path: out('taskbar-pins-light.png') });
  await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
  await page.screenshot({ path: out('taskbar-pins-dark.png') });
  assert.deepEqual(errors, []);
  console.log('PASS persistent destination lifecycle, grouping, pin management, ordering, restore, bulk controls, validation and unchanged updates');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
