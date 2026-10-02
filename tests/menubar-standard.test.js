const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' ' + detail : ''));
  if (!ok) failures++;
}
(async () => {
  const browser = await launch();
  const p = await browser.newPage({ viewport: { width: 1500, height: 800 } });
  const errors = [], warnings = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'warning') warnings.push(m.text()); });
  await p.goto(ROOT + '/tests/fixtures/menubar.html');
  await p.waitForFunction(() => document.querySelectorAll('[data-applet-state="running"]').length === 2);
  await p.evaluate(() => {
    const source = document.querySelector('[data-menubar-source]');
    source.innerHTML = '<li>Site<ul><li><button id="site-action" data-shortcut="Mod+Shift+Y">Site action</button></li></ul></li>' +
      '<li data-menubar-id="help">Aide<ul></ul></li>' +
      '<li data-menubar-id="window" data-menubar-windows>Fenêtres<ul></ul></li>' +
      '<li data-menubar-id="view">Affichage<ul><li><button>Site view</button></li></ul></li>' +
      '<li data-menubar-id="applets">Outils<ul><li><button>Launch</button></li></ul></li>' +
      '<li data-menubar-id="go">Aller<ul></ul></li>' +
      '<li data-menubar-id="custom">Custom<ul><li><button>Custom action</button></li></ul></li>' +
      '<li data-menubar-id="view">Duplicate<ul><li><button>Duplicate action</button></li></ul></li>';
    document.querySelector('#site-action').onclick = () => __log.push('site');
    window.__menus = () => ({
      titles: [
        { label: 'Notes', items: [{ label: 'About Notes', run() { __log.push('about'); } }] },
        { label: 'Domain', items: [{ label: 'Work', run() { __log.push('work'); } }] },
        { id: 'edit', label: 'Modifier', items: [{ label: 'Edit', run() {} }] },
        { id: 'file', label: 'Fichier', items: [{ label: 'Save', run() {} }] },
        { id: 'view', label: 'Forbidden local view', items: [{ label: 'Bad', run() {} }] }
      ],
      into: {
        view: [{ label: 'Nested', items: [{ label: 'Scoped action', shortcut: 'Mod+Shift+U', run() { __log.push('scoped'); } }] }],
        Aide: [{ label: 'Notes help', run() { __log.push('help'); } }],
        go: [{ label: 'Next note', run() { __log.push('next'); } }],
        window: [{ label: 'Forbidden window command', run() {} }],
        applets: [{ label: 'Forbidden launcher command', run() {} }],
        custom: [{ label: 'Forbidden custom command', run() {} }],
        missing: [{ label: 'Missing command', run() {} }]
      }
    });
    pudlWindows.raise('notes');
    pudlMenubar.refresh();
  });
  const site = p.locator('.menubar-menu:not(.menubar-front):not(.menubar-one) .menubar-title');
  const front = p.locator('.menubar-front .menubar-title');
  const panel = p.locator('#menubar-panel');
  const open = label => site.filter({ hasText: new RegExp('^' + label + '$') }).click();
  check('standard IDs order translated site menus and custom titles', (await site.allTextContents()).join('|') === 'Site|Aller|Outils|Custom|Affichage|Fenêtres|Aide');
  check('applet File and Edit IDs precede domain menus', (await front.allTextContents()).join('|') === 'Notes|Fichier|Modifier|Domain');
  await open('Affichage');
  check('ID contributions retain their owner heading', await panel.locator('.md-section-label').textContent() === 'Notes');
  await p.keyboard.press('Escape');
  await open('Aide');
  check('legacy labels route to translated declared slots', await panel.locator('.menu-action').textContent() === 'Notes help');
  await p.keyboard.press('Escape');
  check('invalid and duplicate contributions are diagnosed', ['duplicate site menu ID', 'window', 'applets', 'custom', 'missing'].every(x => warnings.some(w => w.includes(x))));

  const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
  await p.locator('#note').click();
  await p.keyboard.press(mod + '+Shift+U');
  check('nested contribution shortcut works in its applet', await p.evaluate(() => __log.filter(x => x === 'scoped').length) === 1);
  await p.mouse.click(1450, 760);
  await p.keyboard.press(mod + '+Shift+U');
  await p.keyboard.press(mod + '+Shift+Y');
  check('the contribution stays scoped while site shortcuts remain global', await p.evaluate(() => __log.filter(x => x === 'scoped').length === 1 && __log.includes('site')));

  await open('Fenêtres');
  check('generated Window menu includes capabilities and bulk actions', (await panel.textContent()).includes('Maximize') && (await panel.textContent()).includes('Close all windows'));
  check('generated Window menu excludes arbitrary applet injection and identity actions', !(await panel.textContent()).includes('Forbidden') && !(await panel.textContent()).includes('Copy the link'));
  await panel.locator('.menu-action').filter({ hasText: /^Maximize$/ }).click();
  check('generated commands update the workspace URL', /^maximized/.test(new URL(p.url()).searchParams.get('p.notes')));
  await open('Fenêtres');
  await panel.locator('.menu-action').filter({ hasText: /^Restore$/ }).click();
  check('generated commands read current window state', await p.evaluate(() => pudlWindows.state().place.notes.mode === 'floating'));
  await p.evaluate(() => { pudlWindows.minimize('counter'); pudlMenubar.refresh(); });
  await open('Fenêtres');
  await panel.locator('.menu-action').filter({ hasText: /\d+\. Counter$/ }).click();
  check('the window list restores and raises an existing window', await p.evaluate(() => pudlWindows.state().top === 'counter' && !pudlWindows.state().min.counter));
  await p.waitForFunction(() => document.querySelector('.menubar-front').getAttribute('aria-label') === 'Counter');
  check('empty shared slots disappear with their contributor', !(await site.allTextContents()).includes('Aide') && !(await site.allTextContents()).includes('Aller'));
  await front.filter({ hasText: /^Actions$/ }).click();
  await panel.locator('.menu-action').filter({ hasText: /^Add one$/ }).click();
  check('legacy commands remain executable under Actions', await p.locator('[data-applet="counter"]').textContent() === '1');

  await p.evaluate(() => { pudlWindows.raise('notes'); pudlMenubar.refresh(); });
  await front.filter({ hasText: /^Domain$/ }).click();
  await p.evaluate(() => pudlWindows.raise('counter'));
  await p.waitForFunction(() => !document.querySelector('#menubar-panel').matches(':popover-open'));
  check('changing the active applet closes its previous menu', await p.locator('.menubar-front').getAttribute('aria-label') === 'Counter');
  await p.evaluate(() => { pudlWindows.raise('notes'); pudlMenubar.refresh(); });
  await front.filter({ hasText: /^Domain$/ }).click();
  await p.evaluate(() => {
    const row = document.querySelector('#menubar-panel .menu-action');
    document.querySelector('[data-applet="notes"]').remove();
    row.click();
  });
  check('removal immediately before invocation cannot run a stale command', await p.evaluate(() => !__log.includes('work')));
  check('the invalid menu closes synchronously', !await panel.evaluate(el => el.matches(':popover-open')));
  await p.evaluate(() => { pudlWindows.raise('counter'); pudlMenubar.refresh(); });
  await front.filter({ hasText: /^Actions$/ }).click();
  await p.evaluate(() => pudlWindows.close('counter'));
  await p.waitForFunction(() => !document.querySelector('#menubar-panel').matches(':popover-open'));
  check('closing an active window invalidates its open popup', await front.count() === 0);

  await p.evaluate(() => {
    document.querySelector('.win[data-win="notes"]').addEventListener('pudl:window-closing', e => e.preventDefault(), { once: true });
    pudlWindows.open('article');
  });
  await p.waitForSelector('.win[data-win="article"]');
  await p.evaluate(() => pudlMenubar.refresh());
  await open('Fenêtres');
  await panel.locator('.menu-action').filter({ hasText: /^Close all windows$/ }).click();
  check('generated bulk close respects each window cancellation', await p.evaluate(() => {
    const state = pudlWindows.state();
    return state.open.includes('notes') && !state.open.includes('article');
  }));

  await p.goto(ROOT + '/tests/fixtures/window-menu.html');
  await p.waitForFunction(() => window.pudlWindows);
  const descriptor = await p.evaluate(() => {
    const commands = pudlWindows.menuCommands('counter');
    window.oldCommand = commands.find(c => c.id === 'maximize');
    return commands.map(c => c.id);
  });
  check('the public command source contains standard capabilities only', descriptor.includes('maximize') && descriptor.includes('snap') && !descriptor.some(x => x.startsWith('content:')));
  await p.evaluate(() => { pudlWindows.dock('counter', 'bottom'); oldCommand.run(); });
  check('a stale descriptor rechecks its capability before running', await p.evaluate(() => pudlWindows.state().place.counter.mode === 'dock-bottom'));
  check('missing windows have no standard commands', await p.evaluate(() => pudlWindows.menuCommands('missing').length === 0));
  await p.goto(ROOT + '/tests/fixtures/window-sizing.html');
  await p.waitForFunction(() => window.pudlWindows);
  check('content-sized windows omit unsupported layout commands', await p.evaluate(() => {
    const ids = pudlWindows.menuCommands('tool').map(c => c.id);
    return ids.includes('reset') && ids.includes('close') && !ids.some(id => ['maximize', 'snap', 'dock'].includes(id));
  }));
  await p.evaluate(() => {
    window.oldReset = pudlWindows.menuCommands('tool').find(c => c.id === 'reset');
    const w = document.querySelector('.win[data-win="tool"]');
    w.replaceWith(w.cloneNode(true));
    window.beforeStale = location.href;
    oldReset.run();
  });
  check('descriptors cannot act on a replacement DOM window with the same key', await p.evaluate(() => beforeStale === location.href));
  check('no browser errors', errors.length === 0, errors.join('|'));
  await browser.close();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
