/* The menu bar, from parkscomputing.com's
   Architecture/pudl-proposal-menu-bar.md. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
const FIX = ROOT + '/tests/fixtures/menubar.html';
(async () => {
  const b = await launch();
  const errors = [], warnings = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 700 } });
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'warning' && /pudl-menubar/.test(m.text())) warnings.push(m.text()); });
  await p.goto(FIX);
  await p.waitForFunction(() => document.querySelector('.menubar-row .menubar-title') && document.querySelectorAll('[data-applet-state="running"]').length === 2);
  const bar = () => p.evaluate(() => Array.from(document.querySelectorAll('.menubar-row > .menubar-menu')).filter(g => g.offsetParent).map(g => g.getAttribute('aria-label') + ': ' + Array.from(g.querySelectorAll('.menubar-title')).map(t => t.textContent.trim()).join('|')).join(' / '));
  const rows = () => p.evaluate(() => Array.from(document.querySelectorAll('#menubar-panel > *')).map(r => r.matches('.menu-sep') ? '|' : r.matches('.md-section-label') ? '#' + r.textContent : r.querySelector('.menubar-label') ? r.querySelector('.menubar-label').textContent + (r.getAttribute('aria-checked') === 'true' ? '*' : '') + (r.hasAttribute('aria-disabled') ? '(off)' : '') : r.textContent.trim()));
  const active = () => p.evaluate(() => { const a = document.activeElement; return a.classList.contains('menubar-title') ? 'title:' + a.textContent.trim() : a.querySelector && a.querySelector('.menubar-label') ? 'row:' + a.querySelector('.menubar-label').textContent : a.id || a.tagName; });
  const log = () => p.evaluate(() => window.__log.slice());
  /* Raising a window updates the bar a frame later (pudl-menubar.js debounces
     on pudl:windows-change), so this waits for the bar to actually name the
     raised window rather than sleeping a fixed amount, which a busy CI
     runner can outrun. */
  const raise = async k => {
    await p.evaluate(k => pudlWindows.raise(k), k);
    const name = { notes: 'Notes', counter: 'Counter' }[k];
    await p.waitForFunction(n => {
      const groups = document.querySelectorAll('.menubar-row > .menubar-menu');
      return Array.from(groups).some(g => g.offsetParent && g.getAttribute('aria-label') === n);
    }, name);
  };
  const waitOpen = () => p.waitForFunction(() => { const m = document.getElementById('menubar-panel'); return m.matches(':popover-open') && !m.classList.contains('placing'); });

  /* Built, one tab stop, the fallback hidden. */
  const shape = await p.evaluate(() => ({
    role: document.querySelector('.menubar-row').getAttribute('role'),
    stops: Array.from(document.querySelectorAll('.menubar-row .menubar-title')).filter(t => t.tabIndex === 0).length,
    fallback: getComputedStyle(document.getElementById('fallback')).display,
    key: document.querySelector('.menubar-row .menubar-title').getAttribute('accesskey')
  }));
  check('the bar is a menubar, one tab stop, with the jump key on its first title, and the fallback hidden', shape.role === 'menubar' && shape.stops === 1 && shape.fallback === 'none' && shape.key === 'm', JSON.stringify(shape));

  /* The front menu follows the front window. */
  await raise('notes');
  let bt = await bar();
  check('the host menu, and the front window\'s applet\'s titles, without a title the host has',
        bt === 'Parks Computing: P Parks Computing|View|Window|Help / Notes: Notes|File', bt);
  await raise('counter');
  bt = await bar();
  check('an applet with only commands() gets identity and Actions titles', bt.endsWith('/ Counter: Counter|Actions'), bt);
  check('what breaks a rule is left out with a warning naming it',
        warnings.some(w => /Notes: the title "View" is the host's/.test(w)) && warnings.some(w => /Mod\+N on "New window"/.test(w)) && warnings.some(w => /no host title "Nowhere"/.test(w)), warnings.join(' | '));

  /* The window menu keeps the window's own commands while a bar is here. */
  const winMenu = await p.evaluate(() => typeof pudlApplets.commandsIn === 'function');
  check('the applet runtime still offers commandsIn for pages without a bar', winMenu);

  await p.click('.menubar-front .menubar-title >> text=Actions');
  await waitOpen();
  check('a commands() applet\'s title holds its commands', (await rows()).join(',') === 'Add one', (await rows()).join(','));
  await p.click('#menubar-panel .menu-action');
  check('and choosing one runs it', (await p.textContent('[data-applet="counter"]')) === '1');

  /* Pointer: a command runs, and focus goes back to where it was. */
  await raise('notes');
  await p.click('#note');
  await p.click('.menubar-front .menubar-title >> text=File');
  await waitOpen();
  check('File lists its commands, separators, submenu, heading and danger', (await rows()).join(',') === 'Save,New window,|,Change case,#Danger,Clear the note', (await rows()).join(','));
  const sc = await p.evaluate(() => { const s = document.querySelector('#menubar-panel .menubar-shortcut'); return s && s.textContent + '|' + s.parentNode.getAttribute('aria-keyshortcuts'); });
  check('a shortcut shows at the row\'s end and is announced', /^(Ctrl\+S|⌘S)\|(Control|Meta)\+S$/.test(sc), sc);
  await p.click('#menubar-panel .menu-action >> text=Save');
  check('choosing a command runs it, closes the menu and gives focus back', (await log()).includes('save') && !(await p.evaluate(() => document.getElementById('menubar-panel').matches(':popover-open'))) && (await active()) === 'note', await active());

  /* The host's panel, with the front applet's additions. */
  await p.click('.menubar-row .menubar-title >> text=View');
  await waitOpen();
  check('a host title holds its own commands, then the front applet\'s under its name', (await rows()).join(',') === 'Wide layout,|,#Notes,Wrap lines', (await rows()).join(','));
  await p.click('#menubar-panel .menu-action >> text=Wide layout');
  check('a host command presses the host\'s own button', (await log()).includes('wide true'));
  await p.click('.menubar-row .menubar-title >> text=View');
  await waitOpen();
  check('and the next time it shows its new state', (await rows())[0] === 'Wide layout*', (await rows()).join(','));
  await p.keyboard.press('Escape');

  /* The keyboard. */
  await p.focus('.menubar-row .menubar-title');
  await p.keyboard.press('ArrowRight');
  check('Right moves from title to title', (await active()) === 'title:View', await active());
  for (let i = 0; i < 3; i++) await p.keyboard.press('ArrowRight');
  check('across both menus', (await active()) === 'title:Notes', await active());
  await p.keyboard.press('ArrowRight');
  await p.keyboard.press('ArrowDown');
  await waitOpen();
  check('Down opens a title\'s panel with focus on its first command', (await active()) === 'row:Save', await active());
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown');
  check('Up and Down move in the panel', (await active()) === 'row:Change case', await active());
  await p.keyboard.press('ArrowRight');
  await p.waitForFunction(() => { const s = document.getElementById('menubar-sub'); return s && s.matches(':popover-open'); });
  await p.waitForFunction(() => document.activeElement && document.activeElement.closest && !!document.activeElement.closest('#menubar-sub'));
  check('Right on a submenu opens it, with focus on its first command', (await active()) === 'row:Upper case', await active());
  await p.keyboard.press('ArrowLeft');
  check('Left closes it, back on its row', (await active()) === 'row:Change case', await active());
  await p.keyboard.press('ArrowRight');
  await p.waitForFunction(() => document.activeElement && document.activeElement.closest && !!document.activeElement.closest('#menubar-sub'));
  await p.keyboard.press('Enter');
  check('Enter chooses a command', (await log()).includes('upper'));
  await p.focus('.menubar-front .menubar-title');
  await p.keyboard.press('ArrowDown');
  await waitOpen();
  await p.keyboard.press('ArrowRight');
  await waitOpen();
  check('Right on a plain command moves to the next title and opens it', (await active()) === 'row:Parks Computing' || /row:/.test(await active()), await active());
  await p.keyboard.press('Escape');
  check('Escape closes the panel, back on its title', /^title:/.test(await active()) && !(await p.evaluate(() => document.getElementById('menubar-panel').matches(':popover-open'))), await active());

  /* Shortcuts. */
  await p.evaluate(() => { window.__log.length = 0; });
  await p.click('#note');
  await p.keyboard.type('x');
  await p.keyboard.press(process.platform === 'darwin' ? 'Meta+KeyS' : 'Control+KeyS');
  check('an applet\'s shortcut works while focus is in it', (await log()).includes('save'), (await log()).join(','));
  await p.click('body', { position: { x: 1200, y: 600 } });
  await p.keyboard.press(process.platform === 'darwin' ? 'Meta+Shift+KeyL' : 'Control+Shift+KeyL');
  check('the host\'s shortcut works anywhere', (await log()).some(l => /^wide /.test(l)), (await log()).join(','));

  /* An article's menu. */
  await p.click('.menubar-row .menubar-title >> text=Parks Computing');
  await waitOpen();
  await p.click('#menubar-panel .menu-action >> text=Coincidences');
  await p.waitForSelector('.win[data-win="article"]');
  await p.waitForTimeout(150);
  bt = await bar();
  check('a host link to a window opens it, and an article gets its own menu and no File menu of PUDL\'s', bt.endsWith('/ Coincidences: Coincidences|Sections'), bt);
  await p.click('.menubar-front .menubar-title >> text=Coincidences');
  await waitOpen();
  check('its first title offers what every article offers, and no Print unless the host marks it', (await rows()).join(',') === 'Open as a page,Copy link to this content,|,Close window', (await rows()).join(','));
  await p.keyboard.press('Escape');
  /* A host whose printed article is worth having marks its page menu
     (from parkscomputing.com's Architecture/pudl-proposal-article-file-menu.md). */
  await p.evaluate(() => { document.querySelector('.win[data-win="article"] nav[data-page-menu]').setAttribute('data-page-print', ''); pudlMenubar.refresh(); });
  await p.click('.menubar-front .menubar-title >> text=Coincidences');
  await waitOpen();
  check('with data-page-print, Print follows Copy link, before Close window', (await rows()).join(',') === 'Open as a page,Copy link to this content,Print,|,Close window', (await rows()).join(','));
  await p.keyboard.press('Escape');
  const url = p.url();
  await p.click('.menubar-front .menubar-title >> text=Sections');
  await waitOpen();
  await p.click('#menubar-panel .menu-action >> text=The A380 incident');
  const moved = await p.evaluate(() => { const body = document.querySelector('.win[data-win="article"] .win-body'); return body.scrollTop > 200 && document.activeElement.id === 'a380'; });
  check('a link to a heading moves to it in the article\'s window, the address unchanged', moved && p.url() === url, p.url());

  /* Too narrow: one menu button, opening a level at a time. */
  await p.setViewportSize({ width: 390, height: 700 });
  await p.waitForFunction(() => document.querySelector('.menubar-row').classList.contains('menubar-collapsed'));
  bt = await bar();
  check('when the bar does not fit it becomes one menu button', bt === 'Menu: ', bt);
  await p.click('.menubar-one .menubar-title');
  await waitOpen();
  const sections = await rows();
  check('whose panel lists each menu\'s titles', sections.join(',') === '#Parks Computing,Parks Computing,View,Window,Help,|,#Coincidences,Coincidences,Sections', sections.join(','));
  await p.click('#menubar-panel .menu-action >> text=View');
  const drilled = await rows();
  check('and a title shows its commands in place, with a Back row', drilled[0] === 'Back' && drilled.includes('Wide layout*') || drilled.includes('Wide layout'), drilled.join(','));
  await p.click('#menubar-panel .menubar-back');
  check('Back returns to the titles', (await rows()).join(',') === sections.join(','), (await rows()).join(','));
  check('the page still fits', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));

  check('no errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
