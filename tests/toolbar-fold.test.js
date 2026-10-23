/* Folding toolbars and declared commands (preview,
   docs/proposals/toolbar-commands.md): the commands sample folds its
   groups in order as it narrows and back as it widens, every command
   stays in a menu, the controls follow the commands' state, the keys
   work, and an agent lists and runs the commands by id. The reference
   page's hand-written folding toolbar folds too. */
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
  await p.goto(ROOT + '/samples/commands.html');
  await p.waitForSelector('.applet-toolbars .toolbar-group [data-command="bold"] .glyph');
  /* The toolbar refolds once it has been laid out at its new width, which
     a headless browser may take a while to reach, and says so with
     pudl:toolbar-fit; each width waits for that rather than a fixed time. */
  await p.evaluate(() => { window.__fits = 0; document.addEventListener('pudl:toolbar-fit', () => { window.__fits++; }); });
  const width = async w => {
    const changed = await p.evaluate(w => {
      const r = document.getElementById('stage-width'), was = r.value;
      window.__fitsBefore = window.__fits;
      r.value = w; r.dispatchEvent(new Event('input'));
      return String(was) !== String(w);
    }, w);
    if (changed) await p.waitForFunction(() => window.__fits > window.__fitsBefore, null, { timeout: 10000 }).catch(() => {});
    else await p.evaluate(() => pudlToolbar.fit(document.querySelector('.applet-toolbars .toolbar')));
    return p.evaluate(() => {
      const bar = document.querySelector('.applet-toolbars .toolbar');
      const stages = {};
      bar.querySelectorAll(':scope > .toolbar-group').forEach(g => { stages[g.getAttribute('data-toolbar-group')] = +g.getAttribute('data-toolbar-stage'); });
      return { stages, fits: bar.scrollWidth <= bar.clientWidth + 1, more: bar.hasAttribute('data-toolbar-more') };
    });
  };
  const wide = await width(1200), mid = await width(700), narrow = await width(280);
  check('the toolbar fits its row at every width', wide.fits && mid.fits && narrow.fits, JSON.stringify([wide, mid, narrow]));
  check('groups fold further as the row narrows', Object.keys(wide.stages).every(k => wide.stages[k] <= mid.stages[k] && mid.stages[k] <= narrow.stages[k]), JSON.stringify([wide.stages, mid.stages, narrow.stages]));
  check('the File group, kept to the end, has not gone into More', narrow.stages.File < 5 && narrow.more, JSON.stringify(narrow));
  check('the highest priority of the rest is folded no further than the lowest', narrow.stages.Text <= narrow.stages.Insert, JSON.stringify(narrow.stages));
  const back = await width(1200);
  check('widening unfolds them again', JSON.stringify(back.stages) === JSON.stringify(wide.stages), JSON.stringify([back.stages, wide.stages]));


  /* Every command is in the More menu at the narrowest width. */
  await width(280);
  await p.click('.applet-toolbars .toolbar-more .menu-btn');
  await p.waitForTimeout(150);
  const rows = await p.evaluate(() => [...document.querySelectorAll('.toolbar-more .menu-panel .menu-words')].map(r => r.textContent));
  check('More holds the folded groups\' commands', ['Heading 2', 'Bulleted List', 'Horizontal Rule', 'Open', 'Next Comment', 'Split', 'Word Wrap'].every(t => rows.includes(t)), JSON.stringify(rows));
  const ticked = await p.evaluate(() => [...document.querySelectorAll('.toolbar-more .menu-panel .menu-action[aria-checked="true"] .menu-words')].map(r => r.textContent));
  check('chosen and switched-on commands are ticked there', ticked.includes('Open') && ticked.includes('Split') && ticked.includes('Word Wrap') && ticked.includes('Paragraph'), JSON.stringify(ticked));
  await p.keyboard.press('Escape');

  /* State, keys, and the agent's view. */
  await width(1200);
  await p.click('textarea');
  await p.keyboard.press('Control+End');
  await p.keyboard.type(' x');
  await p.waitForTimeout(80);
  const saveOn = await p.evaluate(() => !document.querySelector('[data-command="save"]').disabled);
  await p.keyboard.press('Control+s');
  await p.waitForTimeout(80);
  const saveOff = await p.evaluate(() => document.querySelector('[data-command="save"]').disabled);
  check('Save follows its state and answers its key', saveOn && saveOff);
  const agent = await p.evaluate(async () => {
    const m = document.querySelector('[data-applet="notes"]');
    const list = pudlCommands.list(m);
    let refused = null;
    try { await pudlCommands.run('save', undefined, m); } catch (e) { refused = e.message; }
    await pudlCommands.run('view-preview', undefined, m);
    return { ids: list.map(c => c.id), save: list.find(c => c.id === 'save'), refused, view: m.querySelector('.notes').getAttribute('data-view') };
  });
  await p.waitForTimeout(80);
  agent.pressed = await p.evaluate(() => document.querySelector('[data-command="view-preview"]').getAttribute('aria-pressed'));
  check('an agent lists every command with its state', agent.ids.length > 20 && agent.save.disabled === true && agent.save.reason && agent.save.action === 'sample.notes/save@1', JSON.stringify(agent.save));
  check('a disabled command refuses an agent with its reason', agent.refused === 'Nothing has changed since it was saved.', agent.refused);
  await p.waitForTimeout(80);
  check('a command an agent runs changes what the reader sees', agent.view === 'preview' && agent.pressed === 'true', JSON.stringify(agent));

  /* Groups whose commands are all hidden leave the row (0.68.1). */
  await p.evaluate(() => pudlCommands.run('view-preview', undefined, document.querySelector('[data-applet="notes"]')));
  await p.waitForTimeout(150);
  const hiddenGroups = await p.evaluate(() => [...document.querySelectorAll('.applet-toolbars .toolbar-group')].filter(g => g.hidden).map(g => g.getAttribute('data-toolbar-group')).sort().join());
  check('in Preview the editing groups leave the toolbar', hiddenGroups === 'Insert,Lists,Style,Text', hiddenGroups);
  await p.evaluate(() => pudlCommands.run('view-split', undefined, document.querySelector('[data-applet="notes"]')));
  await p.waitForTimeout(150);
  check('and come back with the text', await p.evaluate(() => ![...document.querySelectorAll('.applet-toolbars .toolbar-group')].some(g => g.hidden)));

  /* Menu rows named by command id (0.68.1). */
  const menu = await p.evaluate(() => {
    const m = document.querySelector('[data-applet="notes"]');
    const warn = console.warn; let warned = 0; console.warn = function () { warned++; };
    const rows = pudlCommands.menuRows(['-', 'bold', '-', '-', 'save', 'no-such-command', '-', 'style', '-'], m);
    pudlCommands.menuRows(['no-such-command'], m);
    console.warn = warn;
    return { rows: rows.map(r => r === '-' ? '-' : r.label + (r.shortcut ? '|' + r.shortcut : '') + (r.disabled ? '|disabled:' + r.reason : '') + (r.items ? '|items:' + r.items.length : '') + (r.checked != null ? '|checked' : '')), warned };
  });
  check('a menu of command ids becomes rows with each command\'s words, key and state, tidy separators',
    JSON.stringify(menu.rows) === JSON.stringify(['Bold|Mod+B|checked', '-', 'Save|Mod+S|disabled:Nothing has changed since it was saved.', '-', 'Paragraph Style|items:4']), JSON.stringify(menu.rows));
  check('an unknown id is reported once and left out', menu.warned === 1, String(menu.warned));

  /* Command features added in 0.69.0. */
  await width(1200);
  const named = await p.getAttribute('[data-command="new-comment"]', 'aria-label');
  check('a badge is part of the control\'s name', named === 'New Comment, 1 open', named);
  const tone = async () => p.evaluate(() => { const c = document.querySelector('[data-command="checks"]'); const g = c.querySelector('.glyph'); return { tone: c.getAttribute('data-tone'), glyph: g && g.style.getPropertyValue('--glyph'), color: getComputedStyle(c).color, label: c.getAttribute('aria-label') }; });
  const calm = await tone();
  await p.click('textarea');
  await p.keyboard.press('Control+Home');
  await p.keyboard.press('End');
  await p.keyboard.type('  ');
  await p.waitForTimeout(150);
  const alarm = await tone();
  check('a tone colours a control, and a toned command without a glyph takes the status glyph',
    calm.tone === 'positive' && /check/.test(calm.glyph) && alarm.tone === 'danger' && /stop/.test(alarm.glyph) && alarm.color !== calm.color && alarm.label === 'Checks, 1', JSON.stringify([calm, alarm]));
  /* A detail and a panel, on a toolbar of their own so the layout of the
     sample's does not matter. */
  await p.evaluate(() => {
    const box = document.createElement('div');
    box.id = 'own-box';
    box.innerHTML = '<div class="toolbar"><div class="toolbar-group"><button type="button" data-command="pick"></button><button type="button" data-command="grid"></button></div></div>';
    document.querySelector('main').prepend(box);
    window.__picked = '';
    pudlCommands.register(box, [
      { id: 'pick', label: 'Pick', glyph: 'plus', items: ['pick-one'] },
      { id: 'pick-one', label: 'One', detail: 'The first of them.', run: () => {} },
      { id: 'grid', label: 'Grid', glyph: 'table', panel: c => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn grid-cell'; b.textContent = 'cell'; b.onclick = () => { window.__picked = 'cell'; }; c.appendChild(b); } }
    ]);
  });
  await p.waitForSelector('#own-box [data-command="grid"] .glyph');
  await p.click('#own-box [data-command="pick"]');
  await p.waitForTimeout(100);
  const details = await p.evaluate(() => [...document.querySelectorAll('.menu-panel:popover-open .menu-row-detail')].map(d => d.textContent));
  check('a command\'s detail is its menu row\'s second line', details.includes('The first of them.'), JSON.stringify(details));
  await p.keyboard.press('Escape');
  await p.click('#own-box [data-command="grid"]');
  await p.waitForTimeout(100);
  await p.click('.menu-panel:popover-open .grid-cell');
  check('a command with a panel draws it in its own menu, and what it draws works', await p.evaluate(() => window.__picked === 'cell'));
  await p.keyboard.press('Escape');
  await p.evaluate(() => document.getElementById('own-box').remove());
  await width(280);
  await p.click('.applet-toolbars .toolbar-more .menu-btn');
  await p.waitForTimeout(100);
  const inMore = await p.evaluate(() => document.querySelectorAll('.toolbar-more .menu-panel .menu-command-panel .notes-symbols button').length);
  check('and in a folded group\'s menu, under its name', inMore === 12, String(inMore));
  await p.keyboard.press('Escape');
  await width(1200);

  /* bind: false, and commands of one id in two scopes. */
  const scoped = await p.evaluate(async () => {
    const make = (name) => {
      const box = document.createElement('div');
      box.innerHTML = '<div class="toolbar"><div class="toolbar-group"><button type="button" data-command="refresh"></button></div></div><input class="scoped-' + name + '">';
      document.body.appendChild(box);
      return box;
    };
    const a = make('a'), b = make('b');
    a.querySelector('.toolbar').style.display = 'none';
    const ran = window.__ran = [];
    pudlCommands.register(a, [{ id: 'refresh', label: 'Refresh', run: () => ran.push('a') }]);
    pudlCommands.register(b, [{ id: 'refresh', label: 'Refresh', run: () => ran.push('b') },
                             { id: 'only-b', label: 'Only B', run: () => ran.push('only-b') },
                             { id: 'shown-key', label: 'Shown Key', glyph: 'pin', glyphOnly: true, shortcut: 'Mod+Alt+J', bind: false, run: () => ran.push('bound!') }]);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const shownA = pudlCommands.list(a).find(c => c.id === 'refresh').shown;
    const shownB = pudlCommands.list(b).find(c => c.id === 'refresh').shown;
    await pudlCommands.run('refresh', undefined, a);
    let strict = null;
    try { await pudlCommands.run('only-b', undefined, a); } catch (e) { strict = e.message; }
    const row = pudlCommands.menuRows(['shown-key'], b)[0];
    /* A command whose items are a choice, given as objects (0.69.1). */
    let picked = 'b';
    pudlCommands.register(b, [{ id: 'provider', label: 'Provider', items: ['a', 'b'].map(p => ({ id: 'provider-' + p, label: p.toUpperCase(), choice: 'provider', checked: () => picked === p, run: () => { picked = p; } })) }]);
    const sub = pudlCommands.menuRows(['provider'], b)[0].items.map(r => r.label + ':' + r.radio + ':' + r.checked + ':' + (typeof r.run));
    window.__sub = sub;
    b.querySelector('input').focus();
    return { shownA, shownB, ran, strict, row: { shortcut: row.shortcut, bind: row.bind, glyphOnly: row.glyphOnly } };
  });
  await p.keyboard.press('Control+Alt+j');
  await p.waitForTimeout(50);
  const ranAfterKey = await p.evaluate(() => window.__ran.slice());
  check('a command is described by its own scope\'s controls only', scoped.shownA === 'none' && scoped.shownB === 'toolbar', JSON.stringify(scoped));
  check('run with an element runs only that element\'s command', JSON.stringify(scoped.ran) === '["a"]' && scoped.strict === 'there is no command only-b', JSON.stringify(scoped));
  const sub = await p.evaluate(() => window.__sub);
  check('a submenu\'s choice given as command objects becomes radio rows with their state', JSON.stringify(sub) === '["A:provider:false:function","B:provider:true:function"]', JSON.stringify(sub));
  check('bind: false shows the key in a menu row and does not bind it', scoped.row.shortcut === 'Mod+Alt+J' && scoped.row.bind === false && !ranAfterKey.includes('bound!'), JSON.stringify([scoped.row, ranAfterKey]));
  check('a command marked glyphOnly keeps the mark in its menu row, for the ribbon', scoped.row.glyphOnly === true, JSON.stringify(scoped.row));

  /* The reference page's hand-written folding toolbar. */
  await p.goto(ROOT + '/reference.html#toolbar-fold');
  await p.waitForTimeout(300);
  const ref = await p.evaluate(async () => {
    const box = document.getElementById('ref-fold-box'), bar = box.querySelector('.toolbar');
    /* Waits for the folding to report, not for a fixed time. */
    await new Promise(r => { bar.addEventListener('pudl:toolbar-fit', r, { once: true }); box.style.width = '340px'; setTimeout(r, 10000); });
    return { fits: bar.scrollWidth <= bar.clientWidth + 1, stages: [...bar.querySelectorAll(':scope > .toolbar-group')].map(g => g.getAttribute('data-toolbar-stage')),
      find: bar.querySelector('[data-toolbar-group="Find"]').getAttribute('data-toolbar-stage'), field: !!bar.querySelector('input[type="search"]').getClientRects().length };
  });
  check('the reference page\'s toolbar folds to fit', ref.fits && ref.stages.some(s => +s >= 3), JSON.stringify(ref));
  check('a kept group stays on the row, unfolded', ref.find === '1' && ref.field, JSON.stringify(ref));

  /* A page that draws a group's contents again, as a list of pins is drawn
     again, takes folding's own parts with it; they come back, and the
     toolbar's least width is still its folded width, not its padding. */
  const redrawn = await p.evaluate(async () => {
    const bar = document.querySelector('#ref-fold-box .toolbar'), g = bar.querySelector(':scope > .toolbar-group:not([data-toolbar-keep])');
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm';
    b.innerHTML = '<span class="glyph" style="--glyph: var(--glyph-pin)" aria-hidden="true"></span><span class="toolbar-words">Pinned</span>';
    await new Promise(r => { bar.addEventListener('pudl:toolbar-fit', r, { once: true }); g.replaceChildren(b); setTimeout(r, 10000); });
    return { fold: g.lastElementChild.classList.contains('toolbar-fold'), label: g.firstElementChild.classList.contains('toolbar-label'),
      least: parseFloat(getComputedStyle(bar).getPropertyValue('--toolbar-least')), pad: parseFloat(getComputedStyle(bar).paddingLeft) + parseFloat(getComputedStyle(bar).paddingRight) };
  });
  check('a group drawn again gets its caption and fold menu back, and the toolbar its folded width', redrawn.fold && redrawn.label && redrawn.least > redrawn.pad + 20, JSON.stringify(redrawn));

  /* A control folded to its glyph alone takes its words as its name and
     tooltip, keeps a name of its own, and gives back only what folding
     gave when its group opens out (0.80.0). */
  const naming = await p.evaluate(async () => {
    const box = document.createElement('div');
    box.style.width = '900px';
    const btn = (g, w, own) => '<button type="button" class="btn btn-sm"' + (own ? ' aria-label="' + own + '"' : '') + '><span class="glyph" style="--glyph: var(--glyph-' + g + ')" aria-hidden="true"></span><span class="toolbar-words">' + w + '</span></button>';
    box.innerHTML = '<div class="toolbar" role="toolbar" aria-label="Test" data-toolbar-fold>' +
      '<div class="toolbar-group" data-toolbar-group="One" data-toolbar-glyph="copy">' + btn('copy', 'Copy everything') + btn('link', 'Link it', 'Own name') + '</div>' +
      '<div class="toolbar-group" data-toolbar-group="Two" data-toolbar-glyph="list">' + btn('list', 'Bulleted list') + btn('table', 'Insert a table') + '</div></div>';
    document.body.appendChild(box);
    const bar = box.firstChild;
    const fitTo = w => new Promise(r => { bar.addEventListener('pudl:toolbar-fit', r, { once: true }); box.style.width = w + 'px'; setTimeout(r, 3000); });
    const read = () => [...bar.querySelectorAll(':scope > .toolbar-group > button')].map(c => ({ stage: c.parentNode.getAttribute('data-toolbar-stage'), words: c.querySelector('.toolbar-words').textContent, name: c.getAttribute('aria-label'), tip: c.getAttribute('data-tooltip') }));
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const wide = read();
    let w = 900, folded = read();
    while (w > 120 && !folded.some(c => c.stage === '2')) { w -= 20; await fitTo(w); folded = read(); }
    await fitTo(900);
    const open = read();
    box.remove();
    return { wide, folded, open };
  });
  const bareNow = naming.folded.filter(c => c.stage === '2');
  check('a control folded to its glyph alone is named and tipped by its words, keeping a name of its own',
    bareNow.length > 0 && bareNow.every(c => c.tip === c.words && c.name === (c.words === 'Link it' ? 'Own name' : c.words)), JSON.stringify(naming.folded));
  check('opening out takes back only what folding gave',
    naming.open.every(c => c.stage === '1' && !c.tip && c.name === (c.words === 'Link it' ? 'Own name' : null)), JSON.stringify(naming.open));
  check('no page errors', errors.length === 0, errors.join(' | '));

  await browser.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
