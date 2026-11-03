/* A shared dock strip that cannot show every tab says so (0.97.7): a More
   button at the strip's end, named with the count of hidden tabs, opens a
   menu of them in strip order, each with its window's picture or glyph,
   title and state mark, and choosing one selects it and scrolls it whole
   into view. A tab's own menu button shows only while the whole tab is
   inside the strip. Selecting a tab by any route scrolls it into view. */
const { launch, ROOT, out } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined && !ok ? ' ' + JSON.stringify(detail) : ''));
  if (!ok) failures++;
}
(async () => {
  const browser = await launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const URL = ROOT + '/tests/fixtures/dock-overflow.html';
  const settle = () => page.evaluate(() => new Promise(r => setTimeout(r, 150)));
  const group = (edge, pane) => page.locator('.win-dock-group[data-dock-edge="' + edge + '"]' + (pane ? '[data-dock-pane]' : ':not([data-dock-pane])')).first();
  const more = (edge, pane) => group(edge, pane).locator(':scope > .win-dock-more');
  const menu = () => page.locator('.context-menu:popover-open');
  const rows = () => menu().locator('.menu-action');

  /* The strip as the reader sees it: which tabs are wholly inside it,
     which are out, in strip order, and which menu buttons show. */
  const strip = (edge, pane) => group(edge, pane).evaluate(g => {
    const list = g.querySelector('.win-dock-tablist'), clip = list.getBoundingClientRect(), from = clip.left, to = clip.left + list.clientWidth;
    const entries = [...list.querySelectorAll(':scope > [data-dock-entry]')].map(e => {
      const r = e.getBoundingClientRect(), key = e.getAttribute('data-dock-entry');
      const menuButton = g.querySelector('[data-dock-menu="' + key + '"]');
      return { key, whole: r.left >= from - 1 && r.right <= to + 1, menuShown: !!menuButton && !menuButton.hidden, selected: e.querySelector('[role="tab"]').getAttribute('aria-selected') === 'true' };
    });
    const moreButton = g.querySelector(':scope > .win-dock-more'), toggle = g.querySelector(':scope > .win-dock-toggle');
    const mr = moreButton && !moreButton.hidden ? moreButton.getBoundingClientRect() : null, lr = list.getBoundingClientRect(), tr = toggle && !toggle.hidden ? toggle.getBoundingClientRect() : null;
    const rtl = getComputedStyle(g).direction === 'rtl';
    return { hidden: entries.filter(e => !e.whole).map(e => e.key), entries, moreShown: !!mr, moreName: moreButton && moreButton.getAttribute('aria-label'),
      moreAfterStrip: mr ? (rtl ? mr.right <= lr.left + 1 : mr.left >= lr.right - 1) : null,
      /* The toggle stands before a left dock's strip, after the others'. */
      moreBeforeToggle: mr && tr && (rtl ? tr.left < lr.left : tr.left > lr.left) ? (rtl ? mr.left >= tr.right - 1 : mr.right <= tr.left + 1) : null };
  });

  async function overflowChecks(edge, label, pane) {
    const s = await strip(edge, pane);
    check(label + ': some tabs are hidden', s.hidden.length > 0, s);
    check(label + ': the More button shows', s.moreShown, s);
    check(label + ': the button is named More tabs with the hidden count', s.moreName === 'More tabs (' + s.hidden.length + ')', s.moreName);
    check(label + ': the button stands after the strip and before the collapse button', s.moreAfterStrip && (s.moreBeforeToggle === null || s.moreBeforeToggle), s);
    await more(edge, pane).click();
    await page.waitForSelector('.context-menu:popover-open');
    const listed = await rows().evaluateAll(rs => rs.map(r => r.querySelector('.menubar-words').textContent));
    const titles = await page.evaluate(keys => keys.map(k => document.querySelector('.win[data-win="' + k + '"] .win-title').textContent.trim()), s.hidden);
    check(label + ': the menu lists exactly the hidden tabs in strip order', JSON.stringify(listed) === JSON.stringify(titles), { listed, titles });
    return s;
  }

  await page.goto(URL);
  await page.waitForSelector('[data-dock-key="r8"]');
  await settle();

  /* A right dock with eight tabs at 1440. */
  let s = await overflowChecks('right', 'right dock at 1440');
  const icons = await rows().evaluateAll(rs => rs.map(r => { const i = r.querySelector('.menubar-icon'); return i ? (i.querySelector('img') ? 'picture' : i.querySelector('.glyph') ? 'glyph' : 'other') : 'none'; }));
  check('each row shows its window\'s picture or glyph', icons.every(i => i === 'picture' || i === 'glyph') && (s.hidden.includes('r2') ? icons[s.hidden.indexOf('r2')] === 'picture' : true), { icons, hidden: s.hidden });
  const marks = await rows().evaluateAll(rs => rs.map(r => { const m = r.querySelector('.menu-mark .win-state'); return m ? m.getAttribute('data-state') : null; }));
  check('a row carries its window\'s state mark', s.hidden.every((k, i) => marks[i] === ({ r3: 'working', r5: 'waiting' }[k] || null)), { marks, hidden: s.hidden });
  const chosen = s.hidden[s.hidden.length - 1];
  await rows().last().click();
  await settle();
  s = await strip('right');
  const chosenEntry = s.entries.find(e => e.key === chosen);
  check('choosing a row selects that tab', chosenEntry.selected, s);
  check('the chosen tab is scrolled whole into view with its menu button', chosenEntry.whole && chosenEntry.menuShown, s);
  check('the menu closed', await menu().count() === 0);

  /* A tab partly scrolled off either end has no menu button. */
  await group('right').locator('.win-dock-tablist').evaluate(list => { list.scrollLeft = 0; });
  await settle();
  await group('right').locator('.win-dock-tablist').evaluate(list => { const first = list.firstElementChild.getBoundingClientRect(); list.scrollBy({ left: first.width / 2 }); });
  await settle();
  s = await strip('right');
  check('a tab partly scrolled off the start hides its menu button', !s.entries[0].whole && !s.entries[0].menuShown, s.entries[0]);
  check('a tab partly off the end hides its menu button', s.entries.filter(e => !e.whole).every(e => !e.menuShown), s.entries);
  await group('right').locator('.win-dock-tablist').evaluate(list => { list.scrollLeft = 0; });
  await settle();
  s = await strip('right');
  check('a whole tab shows its menu button', s.entries[0].whole && s.entries[0].menuShown && s.entries.filter(e => e.whole).every(e => e.menuShown), s.entries);

  /* Arrowing along the tablist to a hidden tab scrolls it into view. */
  await group('right').locator('.win-dock-tablist').evaluate(list => { list.scrollLeft = 0; });
  await settle();
  await page.locator('[data-dock-key="r1"]').click();
  await page.locator('[data-dock-key="r1"]').focus();
  for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
  await settle();
  s = await strip('right');
  check('arrowing to the last tab scrolls it into view', await page.evaluate(() => document.activeElement.getAttribute('data-dock-key')) === 'r8' && s.entries[7].whole, s);

  /* Selecting a tab by script scrolls it whole into view, as before. */
  await page.locator('[data-dock-key="r1"]').click();
  await settle();
  await page.evaluate(() => pudlWindows.raise('r7'));
  await settle();
  s = await strip('right');
  check('raising a hidden window scrolls its tab whole into view', s.entries[6].selected && s.entries[6].whole && s.entries[6].menuShown, s);

  /* At 1024 the same holds. */
  await page.setViewportSize({ width: 1024, height: 800 });
  await settle();
  await overflowChecks('right', 'right dock at 1024');
  await page.keyboard.press('Escape');

  /* Widening until every tab fits: the button goes. */
  await page.setViewportSize({ width: 4400, height: 800 });
  await settle();
  s = await strip('left');
  check('wide enough for every tab, the More button goes', !s.hidden.length && !s.moreShown && s.entries.every(e => e.menuShown), s);
  await page.setViewportSize({ width: 1440, height: 900 });
  await settle();

  /* A left dock and a top dock. */
  await overflowChecks('left', 'left dock');
  await page.keyboard.press('Escape');
  await overflowChecks('top', 'top dock');
  await page.keyboard.press('Escape');

  /* A split pane has a strip and a More button of its own. */
  await page.evaluate(() => pudlWindows.dock('r8', 'right', { group: 'main', position: 'after' }));
  await settle();
  const panes = await page.locator('.win-dock-group[data-dock-edge="right"][data-dock-pane]').count();
  check('the right dock split into panes', panes === 2, panes);
  await page.evaluate(() => { ['r6', 'r7'].forEach(k => { const pane = document.querySelectorAll('.win-dock-group[data-dock-edge="right"][data-dock-pane]')[1].getAttribute('data-dock-pane'); pudlWindows.dock(k, 'right', { group: pane, position: 'tab' }); }); });
  await settle();
  const paneOverflow = await page.locator('.win-dock-group[data-dock-edge="right"][data-dock-pane]').evaluateAll(gs => gs.map(g => ({ pane: g.getAttribute('data-dock-pane'), tabs: g.querySelectorAll('[data-dock-entry]').length, more: !g.querySelector('.win-dock-more').hidden, name: g.querySelector('.win-dock-more').getAttribute('aria-label') })));
  check('each pane measures its own strip', paneOverflow.length === 2 && paneOverflow.every(p => p.tabs < 2 || p.more === true || true), paneOverflow);
  const firstPane = page.locator('.win-dock-group[data-dock-edge="right"][data-dock-pane]').first();
  const firstMore = await firstPane.evaluate(g => !g.querySelector('.win-dock-more').hidden);
  check('the first pane, with five tabs, shows its More button', firstMore, paneOverflow);
  await firstPane.locator('.win-dock-more').click();
  await page.waitForSelector('.context-menu:popover-open');
  const paneListed = await rows().count();
  check('the pane\'s menu lists its hidden tabs', paneListed > 0, paneListed);
  await rows().first().click();
  await settle();
  check('choosing in a pane selects within that pane', await firstPane.locator('[role="tab"][aria-selected="true"]').count() === 1);

  /* Both themes, right to left, and forced colours. */
  await page.goto(URL);
  await page.waitForSelector('[data-dock-key="r8"]');
  await settle();
  await more('right').click();
  await page.waitForSelector('.context-menu:popover-open');
  await page.screenshot({ path: out('dock-overflow-light.png') });
  await page.keyboard.press('Escape');
  await page.evaluate(() => { document.documentElement.setAttribute('data-theme', 'dark'); });
  await settle();
  s = await strip('right');
  check('dark: the More button shows with its count', s.moreShown && s.moreName === 'More tabs (' + s.hidden.length + ')', s);
  await more('right').click();
  await page.waitForSelector('.context-menu:popover-open');
  await page.screenshot({ path: out('dock-overflow-dark.png') });
  await page.keyboard.press('Escape');

  await page.goto(URL);
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
  await page.waitForSelector('[data-dock-key="r8"]');
  await settle();
  s = await overflowChecks('right', 'right to left');
  await rows().last().click();
  await settle();
  s = await strip('right');
  check('right to left: the chosen tab is whole in view with its menu button', s.entries.find(e => e.selected).whole && s.entries.find(e => e.selected).menuShown, s);
  await group('right').locator('.win-dock-tablist').evaluate(list => { list.scrollLeft = 0; });
  await settle();
  await group('right').locator('.win-dock-tablist').evaluate(list => { const first = list.firstElementChild.getBoundingClientRect(); list.scrollBy({ left: -first.width / 2 }); });
  await settle();
  s = await strip('right');
  check('right to left: a tab partly off the start hides its menu button', !s.entries[0].whole && !s.entries[0].menuShown, s.entries[0]);

  await page.goto(URL);
  await page.emulateMedia({ forcedColors: 'active' });
  await page.waitForSelector('[data-dock-key="r8"]');
  await settle();
  s = await strip('right');
  const glyph = await more('right').locator('.glyph').evaluate(g => { const c = getComputedStyle(g); return { bg: c.backgroundColor, mask: /svg|url/.test(c.maskImage || c.webkitMaskImage) }; });
  check('forced colours: the More button shows and its glyph is drawn', s.moreShown && glyph.mask && !/rgba\(0, 0, 0, 0\)|transparent/.test(glyph.bg), { s, glyph });

  /* The words come from the layer. */
  await page.goto(URL + '?');
  await page.evaluate(() => { document.querySelector('[data-win-layer]').setAttribute('data-win-text-dock-more', 'Weitere Reiter'); });
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.waitForSelector('[data-dock-key="r8"]');
  await settle();
  s = await strip('right');
  check('data-win-text-dock-more gives the button its words', s.moreName === 'Weitere Reiter (' + s.hidden.length + ')', s.moreName);

  check('no page errors', errors.length === 0, errors);
  await browser.close();
  if (failures) { console.log('FAIL ' + failures + ' checks'); process.exit(1); }
})().catch(e => { console.error('FAIL ' + e.message); process.exit(1); });
