/* A standalone application composes host and document menus while retaining
   the document's command ownership and shortcut scope. */
const { launch, ROOT, out } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + detail : ''));
  if (!ok) failures++;
}
(async () => {
  const browser = await launch();
  const p = await browser.newPage({ viewport: { width: 1600, height: 800 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.route('**/tests/fixtures/menubar.html', async route => {
    const response = await route.fetch();
    let html = await response.text();
    html = html.replace('data-menubar aria-label', 'data-menubar data-menubar-host="desktop" data-menubar-composition="application" data-menubar-ribbon aria-label');
    html = html.replace('<script src="../../dist/pudl-menu.js"', '<script src="../../dist/pudl-toolbar.js" defer></script><script src="../../dist/pudl-menu.js"');
    await route.fulfill({ response, body: html });
  });
  await p.goto(ROOT + '/tests/fixtures/menubar.html');
  await p.waitForSelector('#note');
  await p.locator('#note').click();
  const group = p.locator('.menubar-application');
  await p.waitForFunction(() => document.querySelector('.menubar-application').textContent.includes('File'));
  const names = await group.locator(':scope > .menubar-title').evaluateAll(nodes => nodes.map(n => n._menu.title.label));
  check('one application group contains identity, File and shared menus', JSON.stringify(names) === JSON.stringify(['Example', 'File', 'View', 'Window', 'Help']), JSON.stringify(names));
  check('the application has one group glyph and no separate front group', await group.locator(':scope > .menubar-glyph').count() === 1 && await p.locator('.menubar-front').count() === 0);
  const identity = group.locator('.menubar-title[data-menu-id=site]');
  const panel = p.locator('#menubar-panel');
  await p.keyboard.press('Alt+f');
  check('the visible File title receives its desktop mnemonic', await panel.evaluate(n => n.matches(':popover-open')) && (await panel.innerText()).includes('Save'));
  await p.keyboard.press('Escape');
  await identity.click();
  check('identity commands precede the host commands', (await panel.innerText()).indexOf('About Notes') < (await panel.innerText()).indexOf('Home'));
  await panel.getByRole('menuitem', { name: 'About Notes', exact: true }).click();
  check('the merged identity invokes its original document command', await p.evaluate(() => __log.includes('about')));
  await group.getByRole('menuitem', { name: 'View', exact: true }).click();
  check('shared menu contributions omit the redundant document heading', await panel.getByRole('menuitemcheckbox', { name: 'Wrap lines', exact: true }).count() === 1 && !await panel.getByText('Notes', { exact: true }).count());
  await p.keyboard.press('Escape');
  await p.locator('#note').focus();
  await p.keyboard.press('Control+s');
  check('document shortcuts retain their content scope', await p.evaluate(() => __log.includes('save')));
  await group.getByRole('menuitem', { name: 'File', exact: true }).click();
  check('command state refreshes after a shortcut', await panel.getByRole('menuitem', { name: /Save/ }).getAttribute('aria-disabled') === 'true');
  await p.keyboard.press('Escape');
  await p.locator('.menubar-ribbon-toggle').click();
  await group.getByRole('tab', { name: 'Example', exact: true }).click();
  check('the identity ribbon includes document and host commands', await p.locator('#menubar-ribbon-row').getByRole('button', { name: 'About Notes', exact: true }).count() === 1 && (await p.locator('#menubar-ribbon-row').innerText()).includes('Home'));
  await group.getByRole('tab', { name: 'File', exact: true }).click();
  check('the ribbon selects one application tab', await p.locator('[role="tab"][aria-selected="true"]').count() === 1);
  await p.locator('.menubar-ribbon-toggle').click();
  await p.setViewportSize({ width: 320, height: 800 });
  await p.waitForSelector('.menubar-collapsed');
  await p.locator('.menubar-one .menubar-title').click();
  check('the collapsed menu lists one identity with File beside shared titles', await panel.getByRole('menuitem', { name: 'Example', exact: true }).count() === 1 && await panel.getByRole('menuitem', { name: 'File', exact: true }).count() === 1 && !await panel.getByText('Notes', { exact: true }).count());
  await p.keyboard.press('Escape');
  await p.setViewportSize({ width: 1600, height: 800 });
  await p.waitForFunction(() => !document.querySelector('.menubar-collapsed'));
  await p.locator('#note').focus();
  await identity.focus();
  await p.keyboard.press('Enter');
  await panel.getByRole('menuitem', { name: 'About Notes', exact: true }).focus();
  await p.mouse.move(1500, 780);
  await p.evaluate(() => pudlMenubar.refresh());
  check('a keyboard-opened identity keeps its focused document command through refresh', await panel.getByRole('menuitem', { name: 'About Notes', exact: true }).evaluate(n => n === document.activeElement));
  await p.evaluate(() => {
    window.__menus = () => ({ titles: [
      { label: 'Notes', items: [] },
      { id: 'file', label: 'File', items: [{ label: 'Replacement', run() { __log.push('replacement'); } }] }
    ] });
  });
  await panel.getByRole('menuitem', { name: 'About Notes', exact: true }).click();
  check('a removed identity command cannot invoke from an old row', await p.evaluate(() => __log.filter(x => x === 'about').length === 1));
  await p.keyboard.press('Escape');
  await p.evaluate(() => pudlMenubar.refresh());
  check('an empty applet identity does not consume its File menu', await group.getByRole('menuitem', { name: 'File', exact: true }).count() === 1);
  const siteMenus = await p.evaluate(() => pudlMenubar.siteMenus());
  check('application composition does not promote document menus into site pin destinations', !siteMenus.some(m => m.id === 'file'));
  await p.locator('[data-applet="counter"]').click();
  await p.waitForFunction(() => !document.querySelector('.menubar-application').textContent.includes('File'));
  await group.locator('.menubar-title[data-menu-id=site]').click();
  check('switching documents drops the old identity commands', !await panel.getByRole('menuitem', { name: 'About Notes', exact: true }).count());
  await p.goto(ROOT + '/samples/application-menu.html');
  await p.waitForFunction(() => document.querySelector('.menubar-application').textContent.includes('File'));
  check('a page applet without a window uses the same composition', await p.locator('.menubar-application > .menubar-title').count() === 5);
  await p.locator('.menubar-application > .menubar-title[data-menu-id="site"]').click();
  await panel.getByRole('menuitem', { name: 'About this document', exact: true }).click();
  check('the composed page identity invokes its document command', (await p.getByRole('status').innerText()).includes('supplies commands'));
  for (const theme of ['light', 'dark']) {
    await p.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
    await p.screenshot({ path: out('application-menu-' + theme + '.png') });
  }
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
