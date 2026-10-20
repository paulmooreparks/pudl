/* an application's second batch (docs/proposals/menu-bar-keys-and-toolbar.md, specification
   0.22.0): a desktop host's keys, mnemonics on every platform, function
   keys from a field, more of a markup row, radio rows from markup, the
   listing of keys, the toolbar, the glyphs, and a window title's detail. */
const { launch, ROOT, out } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined && !ok ? ' ' + JSON.stringify(detail) : ''));
  if (!ok) failures++;
}
const FIX = ROOT + '/tests/fixtures/desktop-menubar.html';
(async () => {
  const b = await launch();
  const errors = [], warnings = [];
  const ctx = await b.newContext({ viewport: { width: 1400, height: 800 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'warning' && /pudl-menubar/.test(m.text())) warnings.push(m.text()); });
  await p.goto(FIX);
  await p.waitForFunction(() => document.querySelector('.menubar-row .menubar-title') && document.querySelectorAll('[data-applet-state="running"]').length === 1);
  const log = () => p.evaluate(() => window.__log.splice(0));
  const active = () => p.evaluate(() => { const a = document.activeElement; return a.id || (a.classList.contains('menubar-title') ? 'title:' + a.textContent.trim() : a.querySelector && a.querySelector('.menubar-words') ? 'row:' + a.querySelector('.menubar-words').textContent : a.tagName); });
  const panelOpen = () => p.evaluate(() => { const m = document.getElementById('menubar-panel'); return m && m.matches(':popover-open'); });
  const waitOpen = () => p.waitForFunction(() => { const m = document.getElementById('menubar-panel'); return m.matches(':popover-open') && !m.classList.contains('placing'); });
  /* Escape closes the panel; the next key waits for the close to settle,
     as a person's next press would. */
  const escape = async () => { await p.keyboard.press('Escape'); await p.waitForFunction(() => !document.getElementById('menubar-panel').matches(':popover-open')); };
  const onFirstTitle = () => p.evaluate(() => document.activeElement === document.querySelector('.menubar-row .menubar-title'));
  const letters = sel => p.evaluate(s => [...document.querySelectorAll(s)].map(t => (t.getAttribute('data-letter') || '-')).join(''), sel);
  const raise = async k => { await p.evaluate(k => pudlWindows.raise(k), k); await p.waitForFunction(() => document.querySelector('.menubar-front') && document.querySelector('.menubar-front').offsetParent); };
  await raise('editor');

  /* 1. The desktop host's keys. */
  check('desktop: Mod+N and Mod+W are accepted as shortcuts', !warnings.some(w => /Mod\+N on "New Document/.test(w)) && !warnings.some(w => /Mod\+W/.test(w)));
  check('desktop: a chord that is a title\'s letter is refused and says which title', warnings.some(w => /Alt\+D on "Clashes with Documents" is the letter that opens the title "Documents"/.test(w)), warnings);
  await p.locator('#editor-text').focus();
  await p.keyboard.press('Control+w');
  check('desktop: Mod+W runs its row from a field', (await log()).includes('close-doc'));

  /* 2. The letters: declared, assigned, warned. */
  const titleLetters = await letters('.menubar-row > .menubar-menu:not(.menubar-one) .menubar-title');
  const titleWords = await p.evaluate(() => { const t = document.querySelector('.menubar-title[data-letter="d"]'); return { kids: t.children.length, gap: t.querySelector('.menubar-words').getBoundingClientRect().width < 90, text: t.textContent }; });
  check('a title\'s words stay one child of the button, so the letter opens no gap', titleWords.kids === 1 && titleWords.text === 'Documents' && titleWords.gap, titleWords);
  check('every title has its declared letter, the identity included', titleLetters === 'gdvwhoe', titleLetters);
  check('a letter not in the label, and a repeated one, are warned and replaced', warnings.some(w => /"Export" declares the letter "z", which is not in its label/.test(w)) && warnings.some(w => /"Send" declares the letter "s", which "Settings…"|"Send" declares the letter "s", which "Save"/.test(w)), warnings.filter(w => /declares/.test(w)));
  await p.click('.menubar-title:has-text("Documents")');
  await waitOpen();
  const docLetters = await p.evaluate(() => [...document.querySelectorAll('#menubar-panel > .menu-action')].map(r => r.querySelector('.menubar-words').textContent + '=' + r.getAttribute('data-letter')).join(','));
  check('rows take declared letters, then the first free letter of a word, then any letter', docLetters === 'New Document…=n,Open…=o,Close=c,Save=s,Save As…=v,Export=e,Send=d,Recent=r', docLetters);
  check('a panel opened with the pointer shows no underlines', await p.evaluate(() => getComputedStyle(document.querySelector('#menubar-panel .mnemonic')).textDecorationLine === 'none'));
  await escape();

  /* 3. Letters inside the bar, on every platform: a plain letter opens a
     title once focus is in the bar, and runs a row in a panel. */
  await p.locator('.menubar-title:has-text("Documents")').focus();
  check('focus in the bar underlines the titles\' letters', await p.evaluate(() => getComputedStyle(document.querySelector('.menubar-title .mnemonic')).textDecorationLine === 'underline'));
  await p.keyboard.press('h');
  await waitOpen();
  check('a letter on a title opens the title that has it, first row focused', (await active()) === 'row:Keyboard Shortcuts');
  check('a panel opened from the keyboard underlines its letters', await p.evaluate(() => getComputedStyle(document.querySelector('#menubar-panel .mnemonic')).textDecorationLine === 'underline'));
  await escape();
  await p.keyboard.press('d');
  await waitOpen();
  await p.keyboard.press('v');
  check('a row\'s letter runs the row and closes the panel', (await log()).includes('save-as') && !(await panelOpen()));
  check('and focus goes back to where it was before the bar', (await active()) === 'editor-text');
  await p.locator('.menubar-title:has-text("Documents")').focus();
  await p.keyboard.press('d');
  await waitOpen();
  await p.keyboard.press('r');
  await p.waitForFunction(() => document.getElementById('menubar-sub') && document.getElementById('menubar-sub').matches(':popover-open'));
  check('a submenu row\'s letter opens it with the first row focused', (await active()) === 'row:1. Plan 12 One-Pager');
  await p.keyboard.press('2');
  check('a numbered row takes its digit', (await log()).includes('recent-2'));
  await p.locator('.menubar-title:has-text("Documents")').focus();
  await p.keyboard.press('d');
  await waitOpen();
  await p.keyboard.press('n');
  check('a disabled row\'s letter does nothing but focus it', (await panelOpen()) && (await active()) === 'row:New Document…' && !(await log()).length);
  await p.keyboard.press('x');
  check('a letter no row has does nothing', (await panelOpen()) && (await active()) === 'row:New Document…');
  await escape();
  await escape();
  check('Escape from a title with no panel returns focus to where it was', (await active()) === 'editor-text');

  /* 4. The accelerators, under the desktop host. */
  await p.locator('#editor-text').focus();
  await p.keyboard.press('Alt');
  check('Alt alone moves focus to the first title, from a field', await onFirstTitle(), await active());
  await escape();
  await p.locator('#editor-text').focus();
  await p.keyboard.down('Alt');
  await p.keyboard.press('Tab');
  await p.keyboard.up('Alt');
  check('Alt with another key between does nothing', !(await onFirstTitle()));
  await p.locator('#editor-text').focus();
  await p.keyboard.press('F10');
  check('F10 moves focus to the first title', await onFirstTitle(), await active());
  await escape();
  await p.locator('#editor-text').focus();
  await p.keyboard.down('Alt');
  const held = await p.evaluate(() => getComputedStyle(document.querySelector('.menubar-title .mnemonic')).textDecorationLine);
  await p.keyboard.press('o');
  await p.keyboard.up('Alt');
  await waitOpen();
  /* Focus reaches the first row a moment after the panel opens, which a
     busy machine can stretch. */
  await p.waitForFunction(() => document.activeElement && document.activeElement.classList.contains('menu-action'), null, { timeout: 3000 }).catch(() => {});
  check('Alt held underlines the titles\' letters', held === 'underline');
  check('Alt with a letter opens that title from a field, first row focused, the front applet\'s included', (await active()) === 'row:Save');
  await escape();
  check('the underlines go when Alt is released and focus leaves', await p.evaluate(() => !document.querySelector('.menubar-row').classList.contains('menubar-letters')));
  const keyed = await p.evaluate(() => document.querySelector('.menubar-title[data-letter="d"]').getAttribute('aria-keyshortcuts'));
  check('a title\'s chord is exposed', keyed === 'Alt+D', keyed);

  /* 5. Function keys from a field. */
  await p.locator('#editor-text').focus();
  await p.keyboard.press('F1');
  await p.keyboard.press('Shift+F1');
  const fk = await log();
  check('F1 and Shift+F1 run their rows from a field', fk.includes('help-keys') && fk.includes('help-about'), fk);
  await p.evaluate(() => document.getElementById('editor-text').addEventListener('keydown', e => { if (e.key === 'F3') e.preventDefault(); }, { once: true }));
  await p.keyboard.press('F3');
  check('a field that takes a function key keeps it', !(await log()).includes('find-next'));
  await p.keyboard.press('F3');
  check('and otherwise a front row\'s function key runs from the field', (await log()).includes('find-next'));

  /* 6. More of a markup row, and radio rows. */
  await p.click('.menubar-title:has-text("Documents")');
  await waitOpen();
  const extras = await p.evaluate(() => {
    const row = id => [...document.querySelectorAll('#menubar-panel .menu-action')].find(r => r.querySelector('.menubar-words').textContent.startsWith(id));
    const nd = row('New Document'), op = row('Open');
    return { reason: nd.querySelector('.menubar-detail').textContent, described: document.getElementById(nd.getAttribute('aria-describedby')).textContent, tip: nd.title, detail: op.querySelector('.menubar-detail').textContent };
  });
  check('a disabled row shows its reason as its second line, tooltip and description', extras.reason === 'Open a workspace first' && extras.described === extras.reason && extras.tip === extras.reason, extras);
  check('a row shows its detail as a second line', extras.detail === 'From this workspace');
  await escape();
  await p.click('.menubar-title:has-text("an application")');
  await waitOpen();
  const ident = await p.evaluate(() => { const rows = [...document.querySelectorAll('#menubar-panel .menu-action')]; return { glyph: rows[0].querySelector('.glyph.menubar-icon') && rows[0].querySelector('.glyph.menubar-icon').style.getPropertyValue('--glyph'), danger: rows[1].classList.contains('danger') }; });
  check('a markup row takes a glyph and is drawn dangerous', ident.glyph === 'var(--glyph-gear)' && ident.danger, ident);
  await escape();
  await p.click('.menubar-title:has-text("View")');
  await waitOpen();
  const radio = await p.evaluate(() => [...document.querySelectorAll('#menubar-panel .menu-action')].map(r => r.getAttribute('role') + ':' + r.getAttribute('aria-checked')).join(','));
  check('a markup list marked radio is exposed as radio rows', radio === 'menuitemradio:true,menuitemradio:false,menuitemradio:false', radio);
  await escape();
  await raise('editor');
  await p.click('.menubar-front .menubar-title:has-text("Edit")');
  await waitOpen();
  const appletRadio = await p.evaluate(() => [...document.querySelectorAll('#menubar-panel .menu-action')].filter(r => r.getAttribute('aria-checked')).map(r => r.getAttribute('role')).join(','));
  check('an applet\'s radio rows are still radio rows', appletRadio === 'menuitemradio,menuitemradio');
  await escape();

  /* 7. The listing of keys. */
  const listing = await p.evaluate(() => pudlMenubar.shortcuts().map(s => s.key + '|' + s.label + '|' + s.title + '|' + s.source + '|' + s.disabled).sort());
  check('shortcuts() lists every key with its row, title, source and state', listing.includes('Mod+N|New Document…|Documents|host|true') && listing.includes('Mod+S|Save|Document|front|false') && listing.includes('F3|Find Next|Edit|front|false') && listing.includes('F1|Keyboard Shortcuts|Help|host|false'), listing);
  check('a key bound twice in one source is reported once, with both labels', warnings.filter(w => /F1 is bound to both "Keyboard Shortcuts" and "Also F1"/.test(w)).length === 1, warnings.filter(w => /bound to both/.test(w)));
  check('a front row sharing a host row\'s key is not reported', !warnings.some(w => /bound to both.*Save/.test(w)));

  /* 8. The window menu's generated commands take their letters. */
  await p.click('.menubar-title:has-text("Window")');
  await waitOpen();
  const winRow = await p.evaluate(() => { const r = [...document.querySelectorAll('#menubar-panel .menu-action')].find(x => x.querySelector('.menubar-words').textContent === 'Minimize'); return r && r.getAttribute('data-letter'); });
  check('a window command\'s letter comes from data-win-text-<id>-mnemonic', winRow === 'm', winRow);
  const winList = await p.evaluate(() => [...document.querySelectorAll('#menubar-panel .menu-action')].map(x => x.querySelector('.menubar-words').textContent).filter(t => /^\d\./.test(t)));
  check('the Window list shows the title and its detail', winList[0] === '1. Plan 12 One-Pager: Report Layout · Customers', winList);
  await escape();

  /* 9. A window title's detail. */
  const detail = await p.evaluate(() => {
    const w = document.querySelector('.win[data-win="editor"]'), d = w.querySelector('.win-title-detail');
    const tab = document.querySelector('[data-win-tab="editor"]');
    return { shown: d && !d.hidden && d.textContent, titleOnly: w.querySelector('.win-title').textContent, tabDetail: tab.querySelector('.win-item-detail').textContent, tabLabel: tab.getAttribute('aria-label'), none: document.querySelector('.win[data-win="log"] .win-title-detail') === null, sep: getComputedStyle(d, '::before').content };
  });
  check('the detail is drawn after the title in the title bar and the taskbar, and the title stays itself', detail.shown === 'Customers' && detail.titleOnly.startsWith('Plan 12') && detail.tabDetail === 'Customers' && detail.tabLabel === 'Plan 12 One-Pager: Report Layout · Customers' && detail.none && /·/.test(detail.sep), detail);
  await p.evaluate(() => pudlWindows.retitle('editor', 'Plan 12', 'Customer'));
  check('retitle with a detail changes both', await p.evaluate(() => document.querySelector('.win[data-win="editor"] .win-title').textContent === 'Plan 12' && pudlWindows.detailOf('editor') === 'Customer' && document.querySelector('[data-win-tab="editor"] .win-item-detail').textContent === 'Customer'));
  await p.evaluate(() => pudlWindows.retitle('editor', 'Plan 12 One-Pager: Report Layout', 'Customers'));
  const widths = await p.evaluate(async () => {
    const w = document.querySelector('.win[data-win="editor"]'), head = w.querySelector('.win-head');
    const t = () => head.querySelector('.win-title').getBoundingClientRect().width, d = () => head.querySelector('.win-title-detail').getBoundingClientRect().width;
    const out = { wide: { t: t(), d: d() } };
    w.style.setProperty('--win-w', '0.32'); await new Promise(r => requestAnimationFrame(r));
    out.mid = { t: t(), d: d(), ch: parseFloat(getComputedStyle(head.querySelector('.win-title-detail')).minWidth) };
    w.style.setProperty('--win-w', '0.24'); await new Promise(r => requestAnimationFrame(r));
    out.narrow = { t: t(), d: d() };
    w.style.setProperty('--win-w', '0.5');
    return out;
  });
  check('as room shrinks the detail gives way first and keeps its floor, and the title keeps most of the room', widths.mid.d < widths.wide.d && widths.mid.t > widths.mid.d && widths.narrow.d >= widths.mid.ch - 1 && widths.narrow.t < widths.mid.t, widths);
  check('the window menu opens from script', await p.evaluate(async () => { pudlWindows.openMenu('editor'); await new Promise(r => setTimeout(r, 100)); return document.getElementById('win-menu-editor').matches(':popover-open'); }));
  await escape();

  /* 10. The toolbar. */
  const tb = await p.evaluate(() => ({ role: document.getElementById('toolbar').getAttribute('role'), stops: [...document.querySelectorAll('#toolbar button')].filter(b => !b.closest('.menu-panel') && b.tabIndex === 0).map(b => b.id).join(','), pressed: getComputedStyle(document.getElementById('tb-bold')).boxShadow.includes('inset'), menuOff: document.getElementById('tb-table').disabled }));
  check('a toolbar is one tab stop, its pressed button pressed in, and a menu with only disabled rows disabled', tb.role === 'toolbar' && tb.stops === 'tb-bold' && tb.pressed && tb.menuOff, tb);
  await p.locator('#tb-bold').focus();
  await p.keyboard.press('ArrowRight');
  await p.keyboard.press('ArrowRight');
  check('the arrow keys move along the enabled buttons, skipping a disabled one', (await active()) === 'tb-strike');
  await p.keyboard.press('End');
  check('End moves to the last enabled control', (await active()) === 'tb-numbered');
  await p.keyboard.press('Home');
  check('Home moves to the first', (await active()) === 'tb-bold');
  await p.evaluate(() => document.getElementById('tb-insert-table').removeAttribute('aria-disabled'));
  await p.waitForFunction(() => !document.getElementById('tb-table').disabled);
  check('the menu button is enabled again once a row is', true);
  await p.keyboard.press('End');
  check('and is then the last control', (await active()) === 'tb-table');
  const tbw = await p.evaluate(() => { const w = [...document.querySelectorAll('#toolbar .toolbar-group')].map(g => g.getBoundingClientRect()); return { wide: w.every(r => r.y === w[0].y) }; });
  await p.evaluate(() => { document.getElementById('toolbar').style.width = '200px'; });
  const tbn = await p.evaluate(() => { const w = [...document.querySelectorAll('#toolbar .toolbar-group')].map(g => g.getBoundingClientRect()); const within = [...document.querySelectorAll('#toolbar .toolbar-group')].every(g => { const bs = [...g.querySelectorAll('button')].filter(b => !b.closest('.menu-panel')).map(b => b.getBoundingClientRect().y); return bs.every(y => Math.abs(y - bs[0]) < 1); }); return { wrapped: w.some(r => r.y !== w[0].y), within }; });
  await p.evaluate(() => { document.getElementById('toolbar').style.width = ''; });
  check('a narrow toolbar wraps with its groups whole', tbw.wide && tbn.wrapped && tbn.within, { tbw, tbn });

  /* 11. The glyphs. */
  const glyphs = await p.evaluate(() => { const cs = getComputedStyle(document.documentElement); return ['board', 'ticket', 'pencil-off', 'new-window', 'bold', 'italic', 'underline', 'strike', 'code', 'list', 'list-numbered', 'quote', 'table', 'panel', 'colour', 'paragraph'].filter(g => !/svg/.test(cs.getPropertyValue('--glyph-' + g))); });
  check('the sixteen glyphs are tokens', glyphs.length === 0, glyphs);
  await p.screenshot({ path: out('desktop-menubar.png') });

  /* 12. Without the desktop host: the browser's keys stay refused, the
     accelerators stay the browser's, and the letters still work inside
     the bar. */
  const q = await ctx.newPage();
  const qw = [];
  q.on('console', m => { if (m.type() === 'warning' && /pudl-menubar/.test(m.text())) qw.push(m.text()); });
  await q.route('**/desktop-menubar.html', async route => { const r = await route.fetch(); await route.fulfill({ response: r, body: (await r.text()).replace(' data-menubar-host="desktop"', '') }); });
  await q.goto(FIX);
  await q.waitForFunction(() => document.querySelectorAll('[data-applet-state="running"]').length === 1);
  check('browser: Mod+N is refused', qw.some(w => /Mod\+N on "New Document/.test(w)));
  await q.locator('#editor-text').focus();
  await q.keyboard.press('Alt');
  await q.keyboard.press('F10');
  check('browser: Alt alone and F10 leave focus where it is', await q.evaluate(() => document.activeElement.id === 'editor-text'));
  await q.locator('.menubar-title:has-text("Documents")').focus();
  await q.keyboard.press('h');
  await q.waitForFunction(() => document.getElementById('menubar-panel').matches(':popover-open'));
  check('browser: a letter in the bar still opens its title', await q.evaluate(() => document.activeElement.querySelector('.menubar-words').textContent === 'Keyboard Shortcuts'));
  check('browser: no chord is exposed on a title', await q.evaluate(() => !document.querySelector('.menubar-title[data-letter="d"]').hasAttribute('aria-keyshortcuts')));
  await q.close();

  /* 13. On a Mac: the accelerator is Ctrl+Option, Alt alone still works, F10 is the system's. */
  const mac = await b.newContext({ viewport: { width: 1400, height: 800 } });
  await mac.addInitScript(() => { Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' }); });
  const m = await mac.newPage();
  await m.goto(FIX);
  await m.waitForFunction(() => document.querySelectorAll('[data-applet-state="running"]').length === 1);
  await m.locator('#editor-text').focus();
  await m.keyboard.press('F10');
  check('mac: F10 is the system\'s', await m.evaluate(() => document.activeElement.id === 'editor-text'));
  await m.keyboard.press('Alt');
  check('mac: Option alone moves focus to the bar', await m.evaluate(() => document.activeElement.classList.contains('menubar-title')));
  await m.keyboard.press('Escape');
  await m.locator('#editor-text').focus();
  await m.keyboard.press('Alt+d');
  check('mac: Option with a letter is left to the system', await m.evaluate(() => document.activeElement.id === 'editor-text'));
  await m.keyboard.press('Control+Alt+d');
  await m.waitForFunction(() => document.getElementById('menubar-panel').matches(':popover-open'));
  check('mac: Ctrl+Option with a letter opens the title', await m.evaluate(() => document.activeElement.querySelector('.menubar-words').textContent === 'New Document…'));
  check('mac: the chord exposed is Control+Alt', await m.evaluate(() => document.querySelector('.menubar-title[data-letter="d"]').getAttribute('aria-keyshortcuts') === 'Control+Alt+D'));
  await mac.close();

  check('no page errors occurred', !errors.length, errors);
  await b.close();
  process.exit(failures ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
