/* 0.97.0: a taskbar status area that folds into one Status item, all at
   once or item by item, decided on reserved widths so a live count never
   folds or unfolds anything; the Status item's tone, count and name; its
   menu; a folded item's popover placed against it; and a stack row's
   detail that repeats data-win-group-detail. */
const { launch, ROOT } = require('./lib');
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined && !ok ? ' ' + JSON.stringify(detail) : ''));
  if (!ok) failures++;
}
(async () => {
  const b = await launch();
  const p = await b.newPage({ viewport: { width: 1300, height: 800 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(ROOT + '/tests/fixtures/status-fold.html');
  await p.waitForFunction(() => window.pudlWindows && pudlWindows.state().open.length === 4 && document.querySelector('#tray-all > .status-fold'));
  const settle = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 60)))));
  const width = async (id, w) => { await p.evaluate(([id, w]) => { document.getElementById(id).style.width = w + 'px'; }, [id, w]); await settle(); };
  const tray = id => p.evaluate(id => {
    const t = document.getElementById(id), f = t.querySelector('.status-fold');
    return { folded: [...t.querySelectorAll('[data-status-folded]')].map(n => n.id), fold: !f.hidden, compact: t.closest('.win-bar').hasAttribute('data-win-bar-compact'),
      badge: f.querySelector('.badge').hidden ? '' : f.querySelector('.badge').textContent, tone: f.getAttribute('data-tone'), name: f.getAttribute('aria-label'),
      glyph: f.firstElementChild.style.getPropertyValue('--glyph'), keep: !!document.getElementById('account') && document.getElementById('account').getClientRects().length > 0 };
  }, id);
  const folds = () => p.evaluate(() => { const r = __folds.slice(); __folds.length = 0; return r; });

  let s = await tray('tray-all');
  check('with room, nothing is folded and the Status item is hidden', !s.folded.length && !s.fold, s);
  await folds();

  /* Narrow the bar until the tray folds. */
  let w = 1200;
  while (w > 200 && !(await tray('tray-all')).fold) { w -= 20; await width('wrap-all', w); }
  s = await tray('tray-all');
  check('short of room, every foldable item folds at once and the account stays', JSON.stringify(s.folded) === '["queue","runs","mail","tasks"]' && s.fold && s.keep && s.compact, { s, w });
  check('pudl:status-fold says how many folded', JSON.stringify(await folds()) === '["tray-all:4"]');
  check('the Status item counts the folded items\' numbers and takes the most urgent tone', s.badge === '5' && s.tone === 'stuck' && /glyph-warning/.test(s.glyph), s);
  check('its name says what it holds', /^Status: Queue: 3 waiting, Runs: 2 stuck, Mail: nothing new, Tasks$/.test(s.name), s.name);

  /* Find the narrowest width at which it stays unfolded. */
  while (w < 1200 && (await tray('tray-all')).fold) { w += 2; await width('wrap-all', w); }
  s = await tray('tray-all');
  check('given room again, it unfolds', !s.fold && !s.folded.length, { s, w });
  await folds();
  await p.evaluate(() => { document.querySelector('#queue .badge').textContent = '99+'; const m = document.querySelector('#mail .badge'); m.hidden = false; m.textContent = '12'; });
  await settle();
  s = await tray('tray-all');
  check('at the edge, counts growing within their reserve fold nothing', !s.fold && !(await folds()).length, { s, w });
  await p.evaluate(() => { document.querySelector('#queue .badge').textContent = '3'; const m = document.querySelector('#mail .badge'); m.hidden = true; m.textContent = ''; });
  await width('wrap-all', w - 2);
  s = await tray('tray-all');
  check('and a step narrower folds it, whatever the counts read', s.fold, { s, w: w - 2 });
  await folds();
  await width('wrap-all', w);
  await p.evaluate(() => { document.querySelector('#queue .badge').textContent = '7'; });
  await width('wrap-all', w - 2);
  check('folded, a count changing leaves it folded', (await tray('tray-all')).fold);
  check('and its total follows the count at once', (await tray('tray-all')).badge === '9', await tray('tray-all'));

  /* A known zero reads 0; a count not known yet leaves the total blank. */
  await p.evaluate(() => { document.querySelector('#queue .badge').textContent = '0'; document.querySelector('#runs .badge').textContent = '0'; });
  await settle();
  check('when every counting badge reads 0, the total reads 0, plainly', (await tray('tray-all')).badge === '0', await tray('tray-all'));
  await p.evaluate(() => { const m = document.querySelector('#mail .badge'); m.hidden = false; m.textContent = ''; m.setAttribute('data-status-pending', ''); });
  await settle();
  check('while a badge\'s count is pending, the total is blank', (await tray('tray-all')).badge === '', await tray('tray-all'));
  await p.evaluate(() => { const m = document.querySelector('#mail .badge'); m.removeAttribute('data-status-pending'); m.textContent = '4'; });
  await settle();
  check('once it arrives, the total counts it', (await tray('tray-all')).badge === '4', await tray('tray-all'));
  await p.evaluate(() => { document.querySelector('#queue .badge').textContent = '3'; document.querySelector('#runs .badge').textContent = '2'; const m = document.querySelector('#mail .badge'); m.hidden = true; m.textContent = ''; });
  await settle();

  /* A hidden item is not folded, listed, named or toned, and joins when shown. */
  let h = await tray('tray-all');
  check('an item the host hides is not folded, named or toned', !h.folded.includes('update') && !/newer build/.test(h.name) && h.tone !== 'accent', h);
  await p.evaluate(() => { document.getElementById('update').hidden = false; });
  await settle();
  h = await tray('tray-all');
  check('shown again, it folds with the others and is named', h.folded.includes('update') && /newer build/.test(h.name), h);
  await p.evaluate(() => { document.getElementById('update').hidden = true; });
  await settle();
  h = await tray('tray-all');
  check('hidden again, it leaves the fold', !h.folded.includes('update') && !/newer build/.test(h.name) && !(await p.evaluate(() => document.getElementById('update').hasAttribute('data-status-folded'))), h);

  /* An item may give a tone its badge does not show. */
  await p.evaluate(() => { const q = document.querySelector('#queue .badge'); q.classList.remove('warn'); const r = document.querySelector('#runs .badge'); r.removeAttribute('data-state'); document.getElementById('tasks').setAttribute('data-status-tone', 'waiting'); });
  await settle();
  check('an item\'s data-status-tone gives the Status item its tone when no badge is more urgent', (await tray('tray-all')).tone === 'waiting' && /glyph-pause/.test((await tray('tray-all')).glyph), await tray('tray-all'));
  await p.evaluate(() => { document.querySelector('#runs .badge').setAttribute('data-state', 'stuck'); });
  await settle();
  check('and a more urgent badge still wins', (await tray('tray-all')).tone === 'stuck', await tray('tray-all'));
  await p.evaluate(() => { document.querySelector('#queue .badge').classList.add('warn'); document.getElementById('tasks').removeAttribute('data-status-tone'); });
  await settle();

  /* The Status item's menu. */
  await p.locator('#tray-all > .status-fold').click();
  await p.waitForSelector('.context-menu:popover-open');
  const menu = await p.evaluate(() => [...document.querySelectorAll('.context-menu:popover-open .menu-action')].map(r => r.textContent.replace(/\s+/g, ' ').trim()));
  check('its menu lists the folded items, each with its badge as a second line', menu.length === 4 && /^Queue: 3 waiting\s*3$/.test(menu[0]) && /^Runs: 2 stuck\s*2$/.test(menu[1]) && menu[2] === 'Mail: nothing new', menu);
  await p.locator('.context-menu:popover-open .menu-action', { hasText: 'Tasks' }).click();
  await p.waitForSelector('#tasks-pop:popover-open:not(.placing)');
  const placed = await p.evaluate(() => { const pop = document.getElementById('tasks-pop').getBoundingClientRect(), f = document.querySelector('#tray-all > .status-fold').getBoundingClientRect(); return { near: pop.left <= f.right + 2 && pop.right >= f.left - 2, popL: pop.left, fL: f.left }; });
  check('choosing a folded item presses it, and its popover is placed against the Status item', placed.near, placed);
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => !document.getElementById('tasks-pop').matches(':popover-open'));
  check('closing that popover returns focus to the Status item', await p.evaluate(() => document.activeElement && document.activeElement.classList.contains('status-fold')));

  await folds();
  await width('wrap-all', 1200);
  s = await tray('tray-all');
  check('widened, it unfolds and says so', !s.fold && JSON.stringify(await folds()) === '["tray-all:0"]', s);

  /* Item by item. */
  let wi = 1200, seen = [], prefix = true, last = 0;
  while (wi > 160) {
    wi -= 10; await width('wrap-items', wi);
    const t = await tray('tray-items');
    if (t.folded.join() !== ['i1', 'i2', 'i3'].slice(0, t.folded.length).join() || t.folded.length < last) prefix = false;
    last = t.folded.length;
    if (t.folded.length && !seen.includes(t.folded.length)) seen.push(t.folded.length);
    if (t.folded.length === 3) break;
  }
  check('a tray marked bare folds only as many items as it must, from the first, more as room shrinks', prefix && seen[0] < 3 && seen.includes(3), { seen, wi });

  /* A stack row's detail that repeats data-win-group-detail. */
  const dock = '#bar-all .win-dock';
  await width('wrap-all', 1200);
  await p.locator(dock + ' [data-win-stack="chats"]').click();
  await p.waitForSelector('.win-stack-panel:popover-open');
  const rows = await p.evaluate(() => [...document.querySelectorAll('.win-stack-panel [data-stack-row]')].map(r => ({ key: r.getAttribute('data-stack-row'), hidden: r.firstChild.querySelector('.win-item-detail').hidden, name: r.firstChild.getAttribute('aria-label') })));
  check('a stack row whose detail repeats data-win-group-detail draws no detail, and one that differs does', rows.find(r => r.key === 'c').hidden && !rows.find(r => r.key === 'd').hidden && /Harbour/.test(rows.find(r => r.key === 'c').name), rows);
  await p.keyboard.press('Escape');

  check('no page errors', !errors.length, errors);
  await b.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
