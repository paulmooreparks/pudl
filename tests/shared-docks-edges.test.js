/* Shared docks on every edge, and tabs that move. data-win-dock-tabs="all" shares
   the top and bottom docks under a strip on their inner side, which
   collapses to the strip alone, by mode or by the layer's height; and a
   tab can be dragged, or moved with Alt+Shift and the arrow keys, to a new
   place among the ordinary tabs of its dock, which the address keeps. */
const { launch, ROOT, out } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined && !ok ? ' ' + JSON.stringify(detail) : ''));
  if (!ok) failures++;
}
(async () => {
  const browser = await launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 850 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const SAMPLE = ROOT + '/samples/shared-docks.html';
  const win = key => page.locator('.win[data-win="' + key + '"]');
  const tab = key => page.locator('[data-dock-key="' + key + '"]');
  const group = edge => page.locator('[data-dock-edge="' + edge + '"]');
  const order = edge => page.locator('[data-dock-edge="' + edge + '"] [role="tab"]').evaluateAll(ts => ts.map(t => t.getAttribute('data-dock-key')));
  const docks = () => page.evaluate(() => pudlWindows.state().docks);
  const ready = async url => { await page.goto(url); await page.waitForSelector('[data-dock-key="workspace"]'); };

  /* The bare attribute keeps 0.55.0's meaning: the side docks only. */
  await page.route('**/samples/shared-docks.html*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('data-win-dock-tabs="all"', 'data-win-dock-tabs') });
  });
  await ready(SAMPLE);
  check('the bare attribute leaves the bottom dock unshared', await group('bottom').count() === 0 && await win('problems').getAttribute('data-win-dock-shared') === null);
  check('the bare attribute shows one bottom window at a time, as before', (await win('output').isVisible()) !== (await win('problems').isVisible()));
  check('the bare attribute writes no top or bottom dock state', await page.evaluate(() => !('top' in (pudlWindows.state().docks || {})) && !('bottom' in (pudlWindows.state().docks || {}))));
  await page.unroute('**/samples/shared-docks.html*');

  /* An opted-in bottom dock shares the edge under one strip. */
  await ready(SAMPLE);
  check('the bottom windows share one strip', JSON.stringify(await order('bottom')) === '["output","problems"]');
  const strip = await group('bottom').boundingBox(), shown = await win('output').isVisible() ? 'output' : 'problems';
  const body = await win(shown).locator('.win-body').boundingBox();
  check('a bottom strip runs the width of the layer above its content', strip.width > 1300 && strip.y + strip.height <= body.y + 1, { strip, body });
  check('a shared bottom window hides its title bar', !(await win(shown).locator('.win-head').isVisible()));
  await tab('problems').click();
  check('a bottom tab selects its window', await win('problems').isVisible() && !(await win('output').isVisible()));
  await page.locator('#problem-filter').fill('Kept');
  await tab('output').click();
  await tab('problems').click();
  check('switching bottom tabs keeps the content mounted', await page.locator('#problem-filter').inputValue() === 'Kept');
  const heightBefore = (await win('problems').boundingBox()).height;
  await tab('problems').focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('Shift+ArrowUp');
  await page.waitForTimeout(400);
  const grown = (await win('problems').boundingBox()).height;
  await tab('output').click();
  check('Shift+ArrowUp grows the bottom dock, and every tab shares the height', grown > heightBefore + 20 && Math.abs((await win('output').boundingBox()).height - grown) < 2, { heightBefore, grown });
  await page.reload();
  await page.waitForSelector('[data-dock-key="output"]');
  check('the bottom dock\'s height survives reloading', Math.abs((await win('output').boundingBox()).height - grown) < 2);
  check('a dock whose settings are all defaults stays out of the address', await page.evaluate(() => !/[?&]d\.bottom=/.test(location.search)));

  /* Collapsed, the strip stays and a tab slides its window out. */
  await page.evaluate(() => pudlWindows.dockMode('bottom', 'rail'));
  const collapsed = await group('bottom').boundingBox();
  check('a collapsed bottom dock keeps its strip of text tabs alone', await group('bottom').getAttribute('data-dock-collapsed') !== null && await group('bottom').getAttribute('data-dock-rail') === null && collapsed.height === 40 && !(await win('output').isVisible()) && !(await win('problems').isVisible()));
  check('a collapsed strip keeps each tab\'s menu button', await page.locator('[data-dock-menu="problems"]').isVisible());
  const note = await win('note').boundingBox();
  await tab('problems').click();
  const slide = await win('problems').boundingBox(), left = await group('left').boundingBox();
  check('a tab slides its window out over the central area, above the strip', await win('problems').isVisible() && slide.x >= left.x + left.width - 1 && slide.y + slide.height <= collapsed.y + 1 && JSON.stringify(await win('note').boundingBox()) === JSON.stringify(note), { slide, collapsed });
  check('the slid-out tab is pressed', await tab('problems').evaluate(el => el.hasAttribute('data-dock-peek')));
  check('a bottom slideout keeps its title bar', await win('problems').locator('.win-head').isVisible());
  await page.keyboard.press('Escape');
  check('Escape retracts a bottom slideout and returns focus to its tab', !(await win('problems').isVisible()) && await tab('problems').evaluate(el => el === document.activeElement));
  await tab('output').click();
  await page.locator('#editor').click();
  check('working elsewhere retracts a bottom slideout', !(await win('output').isVisible()));
  check('the collapsed mode is in the address', await page.evaluate(() => /[?&]d\.bottom=rail:/.test(location.search)));
  await page.locator('[data-dock-edge="bottom"] .win-dock-toggle').click();
  check('Pin opens the bottom dock again', await page.evaluate(() => pudlWindows.state().docks.bottom.mode === 'open') && await win('output').isVisible());
  await page.evaluate(() => pudlWindows.dockMode('bottom', 'auto'));

  /* The height threshold. */
  await page.setViewportSize({ width: 1400, height: 600 });
  await page.waitForSelector('[data-dock-edge="bottom"][data-dock-collapsed]');
  check('an automatic bottom dock collapses at or below 600px of layer height', !(await win('output').isVisible()) && await page.evaluate(() => document.querySelector('[data-win-layer]').clientHeight <= 600));
  check('the side docks stay open at that width', await group('left').getAttribute('data-dock-rail') === null);
  await page.evaluate(() => document.querySelector('[data-win-layer]').setAttribute('data-win-dock-collapse-height', '400'));
  await page.waitForSelector('[data-dock-edge="bottom"]:not([data-dock-collapsed])');
  check('data-win-dock-collapse-height moves the threshold', await win('output').isVisible());
  await page.evaluate(() => document.querySelector('[data-win-layer]').removeAttribute('data-win-dock-collapse-height'));
  await page.setViewportSize({ width: 1400, height: 850 });
  await page.waitForSelector('[data-dock-edge="bottom"]:not([data-dock-collapsed])');

  /* A top dock: the strip on its inner side, below its content. */
  await page.evaluate(() => { pudlWindows.dock('output', 'top'); pudlWindows.dock('problems', 'top'); });
  const topStrip = await group('top').boundingBox(), topShown = await win('problems').boundingBox();
  check('a top strip runs below its windows\' content, next to the work area', await group('top').isVisible() && Math.abs(topStrip.y + topStrip.height - (topShown.y + topShown.height)) < 2 && topStrip.y > topShown.y + 20, { topStrip, topShown });
  check('the side docks start below the top dock', (await group('left').boundingBox()).y >= topStrip.y + topStrip.height - 1);
  const topBefore = topShown.height;
  await tab('problems').focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('Shift+ArrowDown');
  await page.waitForTimeout(400);
  check('Shift+ArrowDown grows the top dock', (await win('problems').boundingBox()).height > topBefore + 20);
  await page.keyboard.press('ArrowLeft');
  check('the arrow keys move along a top strip', await tab('output').evaluate(el => el === document.activeElement));
  await page.evaluate(() => pudlWindows.dockMode('top', 'rail'));
  await tab('output').click();
  const topSlide = await win('output').boundingBox(), topCollapsed = await group('top').boundingBox();
  check('a collapsed top dock slides its window out below the strip', await win('output').isVisible() && topSlide.y >= topCollapsed.y + topCollapsed.height - 1);
  await page.keyboard.press('Escape');
  await page.evaluate(() => { pudlWindows.dockMode('top', 'auto'); pudlWindows.dock('output', 'bottom'); pudlWindows.dock('problems', 'bottom'); });

  /* Tab order by keyboard. */
  const changes = [];
  await page.exposeFunction('recordChange', d => changes.push(d));
  await page.evaluate(() => document.querySelector('[data-win-layer]').addEventListener('pudl:windows-change', e => recordChange(e.detail.docks)));
  await tab('problems').focus();
  await page.keyboard.press('Alt+Shift+ArrowLeft');
  check('Alt+Shift+ArrowLeft moves the focused tab one place', JSON.stringify(await order('bottom')) === '["problems","output"]');
  check('the moved tab keeps focus', await tab('problems').evaluate(el => el === document.activeElement));
  check('the order is in the state', JSON.stringify((await docks()).bottom.order) === '["problems","output"]');
  check('pudl:windows-change reports the order', changes.length && JSON.stringify(changes[changes.length - 1].bottom.order) === '["problems","output"]');
  check('the address carries the order as a fourth field', await page.evaluate(() => /[?&]d\.bottom=auto:\w*:[0-9.]*:problems,output(&|$)/.test(location.search)));
  await page.keyboard.press('Alt+Shift+ArrowLeft');
  check('a tab at the start goes no further', JSON.stringify(await order('bottom')) === '["problems","output"]');
  await page.reload();
  await page.waitForSelector('[data-dock-key="problems"]');
  check('the order survives reloading', JSON.stringify(await order('bottom')) === '["problems","output"]');
  await tab('problems').focus();
  await page.keyboard.press('Alt+Shift+ArrowRight');
  check('moving back to the default order drops the field', JSON.stringify(await order('bottom')) === '["output","problems"]' && await page.evaluate(() => !/d\.bottom=[^&]*:output,problems/.test(location.search) && !pudlWindows.state().docks.bottom.order));

  /* Required windows keep the first places. */
  await page.evaluate(() => pudlWindows.dock('flows', 'left'));
  check('the left dock lists the required window first', JSON.stringify(await order('left')) === '["workspace","chats","flows"]');
  await tab('flows').focus();
  await page.keyboard.press('Alt+Shift+ArrowLeft');
  await page.keyboard.press('Alt+Shift+ArrowLeft');
  check('an ordinary tab cannot move before a required one', JSON.stringify(await order('left')) === '["workspace","flows","chats"]');
  await tab('workspace').focus();
  await page.keyboard.press('Alt+Shift+ArrowRight');
  check('a required tab does not move', JSON.stringify(await order('left')) === '["workspace","flows","chats"]');

  /* Tab order by pointer. */
  const drag = async (key, toKey, side, opts = {}) => {
    await tab(key).scrollIntoViewIfNeeded();
    const from = await tab(key).boundingBox(), to = await page.locator('[data-dock-entry="' + toKey + '"]').boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    /* A narrow strip scrolls, so a tab may start off the screen, where a
       pointer cannot be released; the drop stays on the screen. */
    const x = Math.max(2, side === 'after' ? to.x + to.width - 4 : to.x + 4);
    await page.mouse.move(x, to.y + to.height / 2, { steps: 8 });
    if (opts.beforeUp) await opts.beforeUp();
    await page.mouse.up();
  };
  await drag('chats', 'flows', 'before', { beforeUp: async () => {
    check('a drag shows an insertion mark', await page.locator('.win-dock-mark').isVisible());
  } });
  check('dragging a tab moves it', JSON.stringify(await order('left')) === '["workspace","chats","flows"]');
  check('a drag leaves no mark behind', await page.locator('.win-dock-mark').count() === 0);
  await drag('flows', 'workspace', 'before');
  check('a tab dragged before a required one stops after it', JSON.stringify(await order('left')) === '["workspace","flows","chats"]', await order("left"));
  await drag('workspace', 'chats', 'after');
  check('a required tab cannot be dragged', JSON.stringify(await order('left')) === '["workspace","flows","chats"]');
  await drag('flows', 'chats', 'after', { beforeUp: async () => { await page.keyboard.press('Escape'); } });
  check('Escape cancels a drag', JSON.stringify(await order('left')) === '["workspace","flows","chats"]' && await page.locator('.win-dock-mark').count() === 0);
  check('Escape during a drag leaves the windows as they were', await page.evaluate(() => pudlWindows.state().open.length) === 6);

  /* An icon rail is dragged along its length. */
  await page.evaluate(() => pudlWindows.dockMode('left', 'rail'));
  const railFrom = await tab('chats').boundingBox(), railTo = await tab('flows').boundingBox();
  await page.mouse.move(railFrom.x + railFrom.width / 2, railFrom.y + railFrom.height / 2);
  await page.mouse.down();
  await page.mouse.move(railTo.x + railTo.width / 2, railTo.y + 4, { steps: 8 });
  await page.mouse.up();
  check('a tab is dragged up an icon rail', JSON.stringify(await order('left')) === '["workspace","chats","flows"]');
  check('the drag did not slide the window out', !(await win('chats').isVisible()));
  await tab('chats').focus();
  await page.keyboard.press('Alt+Shift+ArrowDown');
  check('Alt+Shift+ArrowDown moves a tab down an icon rail', JSON.stringify(await order('left')) === '["workspace","flows","chats"]');
  await page.evaluate(() => pudlWindows.dockMode('left', 'auto'));

  /* The other keys on a bottom tab are as at the sides. */
  await tab('problems').focus();
  await page.keyboard.press('Shift+F10');
  await page.waitForSelector('#win-menu-problems:popover-open');
  check('Shift+F10 opens a bottom tab\'s window menu', await page.locator('#win-menu-problems [data-win-cmd="close"]').isVisible());
  await page.keyboard.press('Escape');
  await tab('problems').focus();
  await page.keyboard.press('Delete');
  check('Delete closes an ordinary bottom tab and focuses the one left', await win('problems').count() === 0 && await tab('output').evaluate(el => el === document.activeElement));
  await page.evaluate(() => pudlWindows.open('problems'));
  await page.waitForSelector('[data-dock-key="problems"]');

  /* A window opened later goes at the end; an address without the field
     keeps the default order, which is the order the windows opened in. */
  const plain = await page.evaluate(() => location.search.replace(/(d\.left=[a-z]+:\w*:[0-9.]*):[\w,]+/, '$1'));
  await page.evaluate(() => { pudlWindows.close('chats'); });
  await page.evaluate(() => { pudlWindows.open('chats'); });
  await page.waitForSelector('[data-dock-key="chats"]');
  check('a window opened later goes at the end', JSON.stringify(await order('left')) === '["workspace","flows","chats"]');
  await ready(SAMPLE + plain);
  check('an address without the order keeps the default order', JSON.stringify(await order('left')) === '["workspace","chats","flows"]');

  await page.evaluate(() => document.documentElement.dataset.theme = 'light');
  await page.screenshot({ path: out('shared-docks-edges-light.png') });
  await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
  await page.screenshot({ path: out('shared-docks-edges-dark.png') });
  check('no page errors occurred', !errors.length, errors);
  await browser.close();
  process.exit(failures ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
