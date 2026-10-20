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
  const width = async w => {
    await p.evaluate(w => { const r = document.getElementById('stage-width'); r.value = w; r.dispatchEvent(new Event('input')); }, w);
    /* The toolbar refolds in the frame after its size changes, which a
       busy machine may take a while to reach. */
    await p.waitForFunction(() => { const bar = document.querySelector('.applet-toolbars .toolbar'); return bar.scrollWidth <= bar.clientWidth + 1; }, null, { timeout: 3000 }).catch(() => {});
    await p.waitForTimeout(100);
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

  /* The reference page's hand-written folding toolbar. */
  await p.goto(ROOT + '/reference.html#toolbar-fold');
  await p.waitForTimeout(300);
  const ref = await p.evaluate(async () => {
    const box = document.getElementById('ref-fold-box'), bar = box.querySelector('.toolbar');
    box.style.width = '260px';
    await new Promise(r => setTimeout(r, 200));
    return { fits: bar.scrollWidth <= bar.clientWidth + 1, stages: [...bar.querySelectorAll(':scope > .toolbar-group')].map(g => g.getAttribute('data-toolbar-stage')) };
  });
  check('the reference page\'s toolbar folds to fit', ref.fits && ref.stages.some(s => +s >= 3), JSON.stringify(ref));
  check('no page errors', errors.length === 0, errors.join(' | '));

  await browser.close();
  console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
