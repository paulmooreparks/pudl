/* Command bars and ribbons (0.78.0): a command bar's menu group is a menu
   bar that folds last into the menu glyph alone, its menus becoming
   submenus with their headings; a fold menu holds a select as a submenu,
   a switching key and a stepper as rows that keep it open, a field as a
   popover, and a menu as a submenu, shown in place on a narrow window; a
   glyph-only command shows its glyph alone; a toolbar can hide its
   captions; and a ribbon shows one tab's row at a time, folds into a
   menu bar of the same names and back, remembers that, and keeps its
   band one height so nothing on it moves. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + (detail || '')));
  if (!ok) failures++;
}

(async () => {
  const browser = await launch();
  const p = await browser.newPage({ viewport: { width: 1300, height: 900 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/tests/fixtures/command-bar.html');
  await p.waitForFunction(() => window.pudlToolbar && document.querySelector('#cb .toolbar-fold') && document.querySelector('#rb.ribbon-ready'));
  await p.evaluate(() => { window.__fits = 0; document.addEventListener('pudl:toolbar-fit', () => { window.__fits++; }); });
  const width = async (wrap, w) => {
    await p.evaluate(([wrap, w]) => { window.__before = window.__fits; document.getElementById(wrap).style.width = w + 'px'; }, [wrap, w]);
    await p.waitForFunction(() => window.__fits > window.__before, null, { timeout: 5000 }).catch(() => {});
    await p.waitForTimeout(50);
  };
  const stages = () => p.evaluate(() => {
    const s = {};
    document.querySelectorAll('#cb > .toolbar-group').forEach(g => { s[g.getAttribute('data-toolbar-group') || 'Menus'] = +g.getAttribute('data-toolbar-stage'); });
    return s;
  });
  const open = () => p.evaluate(() => [...document.querySelectorAll('.menu-panel:popover-open, .popover:popover-open')].map(x => x.id || x.className));
  const log = () => p.evaluate(() => { const l = window.log.join(','); window.log = []; return l; });
  const focused = () => p.evaluate(() => { const a = document.activeElement; return /^pudl-/.test(a.id) || !a.id ? a.textContent.trim() : a.id; });

  /* Wide: words, glyph-only, captions. */
  const look = await p.evaluate(() => {
    const r = document.getElementById('refresh');
    return {
      words: getComputedStyle(r.querySelector('.toolbar-words')).display,
      name: r.getAttribute('aria-label'), tip: r.getAttribute('data-tooltip'),
      captions: [...document.querySelectorAll('#cb .toolbar-label')].map(l => getComputedStyle(l).display),
      ribbonCaptions: [...document.querySelectorAll('#rb-home .toolbar-label')].map(l => getComputedStyle(l).display)
    };
  });
  check('a glyph-only command shows its glyph alone, its words its name and tooltip', look.words === 'none' && look.name === 'Refresh' && look.tip === 'Refresh', JSON.stringify(look));
  check('a toolbar with captions set to none shows no group names, and another shows them', look.captions.length && look.captions.every(d => d === 'none') && look.ribbonCaptions.every(d => d !== 'none'), JSON.stringify(look));

  /* The menu bar. */
  await p.click('.menubar-title[popovertarget="m-go"]');
  await p.waitForTimeout(100);
  const go = await p.evaluate(() => {
    const t = document.querySelector('.menubar-title[popovertarget="m-go"]');
    return { expanded: t.getAttribute('aria-expanded'), haspopup: t.getAttribute('aria-haspopup'), bg: getComputedStyle(t).backgroundColor, other: getComputedStyle(document.querySelector('.menubar-title[popovertarget="m-view"]')).backgroundColor };
  });
  check('a command bar title opens its menu, says so and is pressed in', JSON.stringify(await open()) === '["m-go"]' && go.expanded === 'true' && go.haspopup === 'menu' && go.bg !== go.other, JSON.stringify(go));
  await p.focus('#go-front');
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(100);
  check('Right in an open menu opens the next menu with focus on its first row', JSON.stringify(await open()) === '["m-view"]' && await focused() === 'view-wrap', JSON.stringify([await open(), await focused()]));
  await p.keyboard.press('ArrowLeft');
  await p.waitForTimeout(100);
  check('Left goes back', JSON.stringify(await open()) === '["m-go"]', JSON.stringify(await open()));
  await p.hover('.menubar-title[popovertarget="m-help"]');
  await p.waitForTimeout(150);
  check('the pointer moving onto another title opens its menu', JSON.stringify(await open()) === '["m-help"]', JSON.stringify(await open()));
  await p.keyboard.press('Escape');
  await p.mouse.move(5, 880);

  /* A plain panel ticks a menuitemcheckbox by aria-checked. */
  await p.click('.menubar-title[popovertarget="m-view"]');
  await p.waitForTimeout(100);
  const tick = await p.evaluate(() => {
    const row = document.getElementById('view-wrap'), zoom = document.getElementById('view-zoom');
    const words = el => { const r = document.createRange(); r.selectNodeContents(el); return [...r.getClientRects()].map(x => Math.round(x.left)); };
    return { tick: getComputedStyle(row, '::before').visibility, glyph: getComputedStyle(zoom.querySelector('.glyph')).color !== getComputedStyle(zoom).color };
  });
  check('a plain menu ticks a checked row and mutes its glyphs', tick.tick === 'visible' && tick.glyph, JSON.stringify(tick));
  const lefts = () => p.evaluate(() => ['view-wrap', 'view-zoom', 'view-pin', 'view-plain'].map(id => {
    const row = document.getElementById(id), text = [...row.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
    const r = document.createRange(); r.selectNodeContents(text);
    return Math.round(r.getClientRects()[0].left);
  }));
  const onLefts = await lefts();
  const pinOn = await p.evaluate(() => { const r = document.getElementById('view-pin'); return { tick: getComputedStyle(r, '::before').display !== 'none' && getComputedStyle(r, '::before').visibility === 'visible', glyph: getComputedStyle(r.querySelector('.glyph')).display }; });
  await p.evaluate(() => document.getElementById('view-pin').setAttribute('aria-checked', 'false'));
  const offLefts = await lefts();
  const pinOff = await p.evaluate(() => { const r = document.getElementById('view-pin'); return { tick: getComputedStyle(r, '::before').display, glyph: getComputedStyle(r.querySelector('.glyph')).display }; });
  check('a row with a tick and a glyph keeps to the one column: the tick while on, the glyph while off', new Set(onLefts).size === 1 && new Set(offLefts).size === 1 && pinOn.tick && pinOn.glyph === 'none' && pinOff.tick === 'none' && pinOff.glyph !== 'none', JSON.stringify({ onLefts, offLefts, pinOn, pinOff }));
  await p.keyboard.press('Escape');

  /* Folding: the menu group folds last, into its glyph alone. */
  await width('cb-wrap', 300);
  const narrow = await stages();
  check('at its narrowest the menu group has folded no further than any other', Object.keys(narrow).every(k => narrow.Menus <= narrow[k]) && narrow.Menus >= 3, JSON.stringify(narrow));
  const btn = await p.evaluate(() => {
    const b = document.querySelector('#cb [data-toolbar-menus] > .toolbar-fold .menu-btn');
    return { words: getComputedStyle(b.querySelector('.toolbar-words')).display, name: b.getAttribute('aria-label') };
  });
  check('the folded menu group is the menu glyph alone, named Menus', btn.words === 'none' && btn.name === 'Menus', JSON.stringify(btn));

  /* Folded menus are submenus with their headings. */
  await p.click('#cb [data-toolbar-menus] > .toolbar-fold .menu-btn');
  await p.waitForTimeout(100);
  const menuRows = await p.evaluate(() => [...document.querySelectorAll('#cb [data-toolbar-menus] > .toolbar-fold .menu-panel > .menu-action')].map(r => r.textContent.trim() + (r.classList.contains('menubar-has-sub') ? '>' : '')));
  check('the folded menus are one row each that opens a submenu', JSON.stringify(menuRows) === '["Go>","View>","Help>"]', JSON.stringify(menuRows));
  await p.click('#cb [data-toolbar-menus] > .toolbar-fold .menu-panel > .menu-action >> text=Go');
  await p.waitForTimeout(150);
  const sub = await p.evaluate(() => {
    const s = document.querySelector('.toolbar-sub:popover-open');
    if (!s) return null;
    const row = document.getElementById(s.getAttribute('data-menu-anchor'));
    return { kids: [...s.children].map(c => c.matches('.md-section-label') ? '#' + c.textContent : c.matches('.menu-sep') ? '-' : c.textContent.trim()), beside: s.getBoundingClientRect().left >= row.getBoundingClientRect().right - 4, expanded: row.getAttribute('aria-expanded'), parentOpen: !!row.closest('.menu-panel:popover-open') };
  });
  check('a submenu opens beside its row with the menu\'s headings and separators, the menu still open', sub && JSON.stringify(sub.kids) === '["#Feeds","Front page","-","#Yours","Saved stories"]' && sub.beside && sub.expanded === 'true' && sub.parentOpen, JSON.stringify(sub));
  await p.click('.toolbar-sub:popover-open .menu-action >> text=Front page');
  await p.waitForTimeout(100);
  check('choosing in a submenu runs the command and closes every menu', await log() === 'go-front' && (await open()).length === 0, JSON.stringify(await open()));

  await p.click('#cb [data-toolbar-menus] > .toolbar-fold .menu-btn');
  await p.waitForTimeout(100);
  await p.focus('#cb [data-toolbar-menus] > .toolbar-fold .menu-panel > .menu-action');
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(150);
  check('Right on a submenu row opens it with focus on its first row', await focused() === 'Front page', await focused());
  await p.keyboard.press('ArrowLeft');
  await p.waitForTimeout(100);
  check('Left closes it and goes back to its row', await focused() === 'Go' && (await open()).length === 1, JSON.stringify([await focused(), await open()]));
  await p.keyboard.press('Escape');

  /* Fold menus hold choices, selects, switches, steppers, fields and
     menus. */
  const foldOf = name => '#cb > .toolbar-group[data-toolbar-group="' + name + '"] > .toolbar-fold';
  const rowsIn = sel => p.evaluate(sel => [...document.querySelectorAll(sel + ' > *')].map(c => c.matches('.md-section-label') ? '#' + c.textContent : (c.getAttribute('role') || '') + ':' + c.textContent.trim().replace(/\s+/g, ' ')), sel);
  check('the Feed and Format groups are folded into menus of their own', narrow.Feed >= 3 && narrow.Feed < 5 && narrow.Format >= 3 && narrow.Format < 5, JSON.stringify(narrow));
  await p.click(foldOf('Feed') + ' .menu-btn');
  await p.waitForTimeout(100);
  const feed = await rowsIn(foldOf('Feed') + ' .menu-panel');
  check('a folded group holds its command and its choices, ticked, under the choices\' name', JSON.stringify(feed) === JSON.stringify(['menuitem:Refresh', '#List', 'menuitemradio:Top', 'menuitemradio:New']) && await p.evaluate(s => document.querySelector(s + ' .menu-action[role="menuitemradio"]').getAttribute('aria-checked'), foldOf('Feed')) === 'true', JSON.stringify(feed));
  await p.keyboard.press('Escape');
  await p.click(foldOf('Format') + ' .menu-btn');
  await p.waitForTimeout(100);
  const format = await rowsIn(foldOf('Format') + ' .menu-panel');
  check('a folded group holds a select with its value, a switch and a stepper', JSON.stringify(format) === JSON.stringify(['menuitem:FontInter', 'menuitemcheckbox:Bold', 'menuitem:Smaller text', 'menuitem:Larger text']), JSON.stringify(format));
  await p.click(foldOf('Format') + ' .menu-action >> text=Bold');
  await p.waitForTimeout(80);
  const boldRow = await p.evaluate(s => document.querySelector(s + ' .menu-action[role="menuitemcheckbox"]').getAttribute('aria-checked'), foldOf('Format'));
  check('a switch row presses its key, ticks, and keeps the menu open', boldRow === 'true' && await p.evaluate(() => document.getElementById('bold').getAttribute('aria-pressed')) === 'true' && (await open()).length === 1, JSON.stringify([boldRow, await open()]));
  await p.click(foldOf('Format') + ' .menu-action >> text=Larger text');
  await p.click(foldOf('Format') + ' .menu-action >> text=Larger text');
  check('a stepper row can be pressed again and again with the menu open', (await log()).indexOf('larger,larger') >= 0 && (await open()).length === 1);
  await p.click(foldOf('Format') + ' .menu-action >> text=Font');
  await p.waitForTimeout(150);
  const fontSub = await p.evaluate(() => { const s = document.querySelector('.toolbar-sub:popover-open'); return s ? [...s.querySelectorAll('.menu-action')].map(r => r.textContent + ':' + r.getAttribute('aria-checked')) : null; });
  check('a select folds into a submenu of its options, the current one ticked', JSON.stringify(fontSub) === '["Inter:true","Georgia:false","Mono:false"]', JSON.stringify(fontSub));
  await p.click('.toolbar-sub:popover-open .menu-action >> text=Georgia');
  await p.waitForTimeout(100);
  check('choosing an option sets the select, fires change and closes the menus', await p.inputValue('#font') === 'Georgia' && (await log()).indexOf('font=Georgia') >= 0 && (await open()).length === 0, JSON.stringify(await open()));

  await p.click('#cb > .toolbar-more .menu-btn');
  await p.waitForTimeout(100);
  const more = await rowsIn('#cb > .toolbar-more .menu-panel');
  check('More holds the groups gone furthest, a field and a menu among them', JSON.stringify(more) === JSON.stringify(['#Find', 'menuitem:Find…', '#Share', 'menuitem:Copy link', 'menuitem:Export']), JSON.stringify(more));
  await p.click('#cb > .toolbar-more .menu-action >> text=Find');
  await p.waitForTimeout(150);
  const pop = await p.evaluate(() => { const o = document.querySelector('.toolbar-field-popover:popover-open'); return { open: !!o, holds: !!(o && o.contains(document.getElementById('find'))), focused: document.activeElement.id }; });
  check('a field folds into a row that opens the field itself in a popover, focused', pop.open && pop.holds && pop.focused === 'find', JSON.stringify(pop));
  await p.keyboard.type('menus');
  /* Escape in a search field clears it first, as the browser does, so the
     popover is closed by a press outside. */
  await p.mouse.click(5, 880);
  await p.waitForTimeout(100);
  const home = await p.evaluate(() => ({ back: !!document.getElementById('find').closest('#cb .toolbar-group'), value: document.getElementById('find').value, pops: document.querySelectorAll('.toolbar-field-popover').length }));
  check('closing the popover puts the field back in its group with what was typed', home.back && home.value === 'menus' && home.pops === 0, JSON.stringify(home));

  /* On a narrow window a submenu shows in place, with Back. */
  await p.setViewportSize({ width: 600, height: 900 });
  await p.waitForTimeout(150);
  await p.click('#cb > .toolbar-more .menu-btn');
  await p.waitForTimeout(150);
  await p.click('#cb > .toolbar-more .menu-action >> text=Export');
  await p.waitForTimeout(150);
  const drill = await p.evaluate(() => [...document.querySelectorAll('#cb > .toolbar-more .menu-panel > *')].map(c => c.matches('.md-section-label') ? '#' + c.textContent : c.matches('.menu-sep') ? '-' : c.textContent.trim()));
  check('on a narrow window a submenu replaces the menu, Back first', drill[0] === 'Export' && drill.indexOf('#Formats') > 0 && drill.indexOf('PDF') > 0 && !(await p.evaluate(() => !!document.querySelector('.toolbar-sub:popover-open'))), JSON.stringify(drill));
  await p.click('#cb > .toolbar-more .menubar-back');
  await p.waitForTimeout(100);
  const backRows = await p.evaluate(() => [...document.querySelectorAll('#cb > .toolbar-more .menu-panel > .md-section-label')].map(c => c.textContent));
  check('Back brings the menu\'s rows back', backRows.indexOf('Share') >= 0, JSON.stringify(backRows));
  await p.keyboard.press('Escape');
  await p.setViewportSize({ width: 1300, height: 900 });
  await width('cb-wrap', 1200);

  /* The ribbon. */
  const tabsState = () => p.evaluate(() => ({ home: !document.getElementById('rb-home').hidden, insert: !document.getElementById('rb-insert').hidden, sel: [...document.querySelectorAll('#rb [role="tab"]')].map(t => t.getAttribute('aria-selected')).join() }));
  check('a ribbon shows the chosen tab\'s row alone', JSON.stringify(await tabsState()) === JSON.stringify({ home: true, insert: false, sel: 'true,false' }), JSON.stringify(await tabsState()));
  await p.click('#tab-insert');
  check('choosing another tab shows its row', JSON.stringify(await tabsState()) === JSON.stringify({ home: false, insert: true, sel: 'false,true' }), JSON.stringify(await tabsState()));
  await p.focus('#tab-insert');
  await p.keyboard.press('ArrowLeft');
  check('the arrow keys move along the tabs and choose them', (await tabsState()).home && await focused() === 'tab-home');
  const tablistKids = await p.evaluate(() => [...document.querySelector('#rb .tablist').children].every(c => c.getAttribute('role') === 'tab'));
  check('the tab list holds only tabs, with Show as ribbon beside it', tablistKids && await p.evaluate(() => !!document.querySelector('#rb .ribbon-bar > .ribbon-toggle[aria-pressed="true"]')));
  const geom = () => p.evaluate(() => {
    const r = document.getElementById('rb'), top = r.getBoundingClientRect().top;
    const t = [...r.querySelectorAll('.ribbon-toggle')].find(x => x.offsetParent);
    const band = r.querySelector('.ribbon-bar').offsetParent ? r.querySelector('.ribbon-bar') : r.querySelector('.ribbon-menus');
    const b = t.getBoundingClientRect();
    return { band: band.getBoundingClientRect().height, x: Math.round(b.left), y: Math.round(b.top - top), below: Math.round(document.getElementById('below').getBoundingClientRect().top) };
  });
  const shown = await geom();
  await p.click('#rb .ribbon-bar .ribbon-toggle');
  await p.waitForTimeout(100);
  const folded = await geom();
  const fold = await p.evaluate(() => ({ folded: document.getElementById('rb').hasAttribute('data-ribbon-folded'), pressed: document.querySelector('#rb .ribbon-menus .ribbon-toggle').getAttribute('aria-pressed'), titles: [...document.querySelectorAll('#rb .ribbon-menus .menubar-title')].map(t => t.textContent).join(), tabs: !!document.querySelector('#rb .ribbon-bar').offsetParent, kept: localStorage.getItem('pudl-ribbon:rb') }));
  check('Show as ribbon folds the ribbon into a menu bar of the same names, released, and remembers it', fold.folded && fold.pressed === 'false' && fold.titles === 'Home,Insert' && !fold.tabs && fold.kept === 'folded', JSON.stringify(fold));
  check('the band is one height either way and the toggle does not move', shown.band === folded.band && shown.x === folded.x && shown.y === folded.y && folded.below < shown.below, JSON.stringify([shown, folded]));
  await p.click('#rb .ribbon-menus .menubar-title >> text=Home');
  await p.waitForTimeout(100);
  const homeMenu = await p.evaluate(() => [...document.querySelector('#rb .ribbon-menus .menu-panel:popover-open').children].map(c => c.matches('.md-section-label') ? '#' + c.textContent : c.matches('.menu-sep') ? '-' : c.textContent.trim()));
  check('a folded tab\'s menu holds its groups under their names, separated', JSON.stringify(homeMenu) === '["#Clipboard","Paste","Copy","-","#Font","Size11","Bold"]', JSON.stringify(homeMenu));
  await p.click('#rb .ribbon-menus .menu-panel:popover-open .menu-action >> text=Paste');
  check('a row there runs the command', (await log()).indexOf('paste') >= 0);
  await p.reload();
  await p.waitForFunction(() => document.querySelector('#rb.ribbon-ready'));
  check('the ribbon stays folded after a reload', await p.evaluate(() => document.getElementById('rb').hasAttribute('data-ribbon-folded')));
  await p.click('#rb .ribbon-menus .ribbon-toggle');
  await p.waitForTimeout(100);
  check('pressing Show as ribbon again brings the tabs back', await p.evaluate(() => !document.getElementById('rb').hasAttribute('data-ribbon-folded') && !!document.querySelector('#rb .ribbon-bar').offsetParent && localStorage.getItem('pudl-ribbon:rb') === 'ribbon'));

  check('no errors', errors.length === 0, errors.join('; '));
  await browser.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
