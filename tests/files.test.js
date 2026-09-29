/* The Files sample, driven as a reader would drive it: the folder tree and
   the path bar, the grid of a folder's contents, opening files in the
   editor through requests, the editor's document tabs, unsaved changes and
   saving, previews in windows of their own, and dropping files in. */
const { launch, ROOT } = require('./lib');
const { AxeBuilder } = require('@axe-core/playwright');
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
}
const S = ROOT + '/samples/';

(async () => {
  const b = await launch();
  const errors = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(e.message));

  /* Every run starts from the sample's own files. */
  await p.goto(S + 'files.html');
  await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await p.goto(S + 'files.html?path=/notes');
  await p.waitForFunction(() => window.pudlTree && window.pudlGrid && window.pudlApplets && window.pudlWindows);

  const GRID = '[data-region="folder"] table[role="grid"]';
  const EDITOR = '.win[data-win="editor"]';
  const tabNames = () => p.$$eval(EDITOR + ' .doc-tabs > [role="tab"]', ts => ts.map(t => t.childNodes[0].textContent + (t.querySelector('.doc-tab-dirty') ? '*' : '') + (t.getAttribute('aria-selected') === 'true' ? '!' : '')));
  const rowOf = name => `${GRID} tbody tr:has(a:text-is("${name}"))`;
  const inFolder = (path, name) => p.waitForFunction(([path, name]) => new URLSearchParams(location.search).get('path') === path &&
    document.querySelector('[data-region="folder"] [aria-current="location"]').textContent === name, [path, name]);

  /* === The tree and the path bar ========================================== */
  const tree = await p.evaluate(() => {
    const t = document.querySelector('[data-region="tree"] ul.tree');
    const cur = t.querySelectorAll('a[aria-current]');
    const byName = n => [...t.querySelectorAll('a')].find(a => a.textContent.trim() === n);
    return {
      role: t.getAttribute('role'), label: t.getAttribute('aria-label'),
      current: [...cur].map(a => a.textContent.trim() + ':' + a.getAttribute('aria-current')),
      notesOpen: byName('notes').getAttribute('aria-expanded'), rootOpen: byName('Files').getAttribute('aria-expanded'),
      draftsShows: getComputedStyle(byName('drafts')).display !== 'none',
      stops: [...t.querySelectorAll('a')].filter(a => a.getAttribute('tabindex') === '0').map(a => a.textContent.trim())
    };
  });
  check('tree: a labelled tree after script, with the current folder marked and the only tab stop',
        tree.role === 'tree' && tree.label === 'Folders' && tree.current.join() === 'notes:page' && tree.stops.join() === 'notes', JSON.stringify(tree));
  check('tree: expanded along the current path', tree.rootOpen === 'true' && tree.notesOpen === 'true' && tree.draftsShows, JSON.stringify(tree));
  const path = await p.evaluate(() => {
    const nav = document.querySelector('[data-region="folder"] nav.path.mono');
    return { label: nav.getAttribute('aria-label'), items: [...nav.querySelectorAll('li')].map(li => (li.firstElementChild.tagName === 'A' ? 'a:' : 'here:') + li.textContent.trim()),
             current: nav.querySelector('[aria-current]').getAttribute('aria-current') };
  });
  check('path bar: the ancestors as links and the folder as the current location',
        path.label === 'Location' && path.items.join() === 'a:files,here:notes' && path.current === 'location', JSON.stringify(path));

  /* === The grid =========================================================== */
  const grid = await p.evaluate(g => {
    const t = document.querySelector(g);
    const rows = [...t.tBodies[0].rows];
    return {
      label: t.getAttribute('aria-label'),
      rows: rows.map(r => r.querySelector('a').textContent + ':' + r.querySelector('.glyph').getAttribute('style').match(/glyph-(\w+)/)[1] + ':' + r.cells[1].textContent),
      hidden: rows.every(r => r.querySelector('.glyph').getAttribute('aria-hidden') === 'true'),
      stops: rows.filter(r => r.getAttribute('tabindex') === '0').length,
      linkStops: [...t.querySelectorAll('a')].filter(a => a.tabIndex !== -1).length,
      wrap: t.parentElement.matches('.data-table-wrap.drop-zone') && !!t.parentElement.querySelector('.drop-hint'),
      detailTab: document.querySelector('.md-detail').getAttribute('tabindex')
    };
  }, GRID);
  check('grid: the folder\'s contents, folders first, each with the glyph of its kind',
        grid.rows.join('|') === 'drafts:folder:Folder|today.md:document:Markdown|todo.txt:file:Text', grid.rows.join('|'));
  check('grid: labelled, glyphs hidden, one tab stop, links out of the Tab order, inside a drop zone',
        grid.label === 'Contents of notes' && grid.hidden && grid.stops === 1 && grid.linkStops === 0 && grid.wrap && grid.detailTab === '0', JSON.stringify(grid));
  const tools = () => p.evaluate(() => ['open', 'preview'].map(a => document.querySelector(`[data-act="${a}"]`).disabled).join());
  check('toolbar: Open and Preview wait for a selected row', (await tools()) === 'true,true', await tools());

  /* Moving to another folder swaps only the regions. */
  await p.evaluate(() => { window.__stay = 1; });
  await p.click('[data-region="tree"] a:text-is("scripts")');
  await inFolder('/scripts', 'scripts');
  const moved = await p.evaluate(g => ({ stay: window.__stay, rows: [...document.querySelectorAll(g + ' tbody tr a')].map(a => a.textContent),
                                         cur: document.querySelector('[data-region="tree"] a[aria-current]').textContent.trim(),
                                         tree: document.querySelector('[data-region="tree"] ul.tree').getAttribute('role'), title: document.title }), GRID);
  check('navigation: a folder in the tree swaps the regions without a page load', moved.stay === 1 && moved.rows.join() === 'build.sh,check-links.js' &&
        moved.cur === 'scripts' && moved.tree === 'tree' && /^scripts, Files/.test(moved.title), JSON.stringify(moved));
  check('grid: scripts take the script glyph', await p.evaluate(g => [...document.querySelectorAll(g + ' .glyph')].every(x => /glyph-script/.test(x.getAttribute('style'))), GRID));
  await p.goBack();
  await inFolder('/notes', 'notes');
  check('navigation: Back swaps the regions back', await p.evaluate(() => window.__stay === 1));

  /* === Opening files through requests ===================================== */
  await p.evaluate(() => {
    window.__requests = [];
    const real = pudlApplets.request;
    pudlApplets.request = function (verb, req, from) { window.__requests.push(verb + ' ' + req.path + ' ' + req.kind); return real.apply(this, arguments); };
  });
  await p.click(`${GRID} a:text-is("today.md")`);
  await p.waitForSelector(EDITOR + ' .doc-tabs > [role="tab"]');
  let opened = await p.evaluate(() => ({ requests: window.__requests.slice(), url: location.href, open: pudlWindows.state().open.join() }));
  check('open: clicking a file asks for it to be opened, and the editor window opens', opened.requests.join() === 'open /notes/today.md doc' &&
        opened.open === 'editor' && new URL(opened.url).searchParams.get('path') === '/notes', JSON.stringify(opened));
  check('editor: the file shows in a tab', JSON.stringify(await tabNames()) === '["today.md!"]' &&
        /^# Today/.test(await p.inputValue(EDITOR + ' textarea.code-surface')), JSON.stringify(await tabNames()));

  /* Enter on a row opens its file in the same window, as a second tab. */
  await p.focus(rowOf('todo.txt'));
  await p.keyboard.press('Enter');
  await p.waitForFunction(e => document.querySelectorAll(e + ' .doc-tabs > [role="tab"]').length === 2, EDITOR);
  opened = await p.evaluate(() => ({ requests: window.__requests.slice(), open: pudlWindows.state().open.join(), wins: document.querySelectorAll('.win').length }));
  check('open: Enter on a row asks too, and the file opens in a second tab of the same window',
        opened.requests[1] === 'open /notes/todo.txt text' && opened.open === 'editor' && opened.wins === 1 && JSON.stringify(await tabNames()) === '["today.md","todo.txt!"]',
        JSON.stringify(opened) + ' ' + JSON.stringify(await tabNames()));
  check('toolbar: a text file enables Open and not Preview', (await tools()) === 'false,true', await tools());

  /* Double-click on the first file brings its tab back. */
  await p.dblclick(rowOf('today.md') + ' .glyph');
  await p.waitForFunction(e => document.querySelector(e + ' .doc-tabs > [aria-selected="true"]').textContent.startsWith('today.md'), EDITOR);
  check('open: a double-click on an open file\'s row chooses its tab', JSON.stringify(await tabNames()) === '["today.md!","todo.txt"]', JSON.stringify(await tabNames()));

  /* === Editing, saving and discarding ===================================== */
  await p.click(EDITOR + ' textarea.code-surface');
  await p.keyboard.press('Control+End');
  await p.keyboard.type('- Saved from the test.');
  check('editor: typing marks the tab unsaved', JSON.stringify(await tabNames()) === '["today.md*!","todo.txt"]' &&
        (await p.textContent(EDITOR + ' .doc-tab-dirty')) === 'unsaved', JSON.stringify(await tabNames()));
  await p.keyboard.press('Control+s');
  await p.waitForFunction(e => !document.querySelector(e + ' .doc-tab-dirty'), EDITOR);
  check('editor: Ctrl+S saves to the store and clears the mark', /Saved from the test/.test(await p.evaluate(() => filesStore.read('/notes/today.md'))) &&
        /^Saved \/notes\/today\.md/.test(await p.textContent(EDITOR + ' .files-editor-status')));

  await p.click(EDITOR + ' .doc-tabs > [role="tab"]:nth-child(2)');
  await p.click(EDITOR + ' textarea.code-surface');
  await p.keyboard.type('Not kept. ');
  await p.focus(EDITOR + ' .doc-tabs > [aria-selected="true"]');
  await p.keyboard.press('Delete');
  await p.waitForSelector(EDITOR + ' dialog.dialog[open]');
  const dlg = await p.evaluate(e => {
    const d = document.querySelector(e + ' dialog[open]');
    return { title: document.getElementById(d.getAttribute('aria-labelledby')).textContent, body: d.querySelector('.dialog-body').textContent,
             buttons: [...d.querySelectorAll('button')].map(x => x.textContent + ':' + x.className) };
  }, EDITOR);
  check('editor: Delete on an unsaved tab asks in a labelled dialog', dlg.title === 'Discard unsaved changes?' && /todo\.txt/.test(dlg.body) &&
        dlg.buttons.join() === 'Keep editing:btn,Discard:btn btn-danger', JSON.stringify(dlg));
  await p.click(EDITOR + ' dialog[open] button:text-is("Discard")');
  await p.waitForFunction(e => document.querySelectorAll(e + ' .doc-tabs > [role="tab"]').length === 1, EDITOR);
  check('editor: Discard closes the tab and keeps the file as it was', JSON.stringify(await tabNames()) === '["today.md!"]' &&
        !/Not kept/.test(await p.evaluate(() => filesStore.read('/notes/todo.txt'))), JSON.stringify(await tabNames()));

  /* A clean tab closes at once from its close button. */
  await p.focus(rowOf('todo.txt'));
  await p.keyboard.press('Enter');
  await p.waitForFunction(e => document.querySelectorAll(e + ' .doc-tabs > [role="tab"]').length === 2, EDITOR);
  await p.click(EDITOR + ' .doc-tabs > [role="tab"]:nth-child(2) .doc-tab-close');
  await p.waitForFunction(e => document.querySelectorAll(e + ' .doc-tabs > [role="tab"]').length === 1, EDITOR);
  check('editor: a saved tab closes from its close button without asking', !(await p.$(EDITOR + ' dialog[open]')));

  /* Saving lasts: reload, and open the file again. */
  await p.reload();
  await p.waitForFunction(e => window.pudlApplets && document.querySelector(e + ' .doc-tabs > [role="tab"]'), EDITOR);
  const back = await p.evaluate(e => ({ text: document.querySelector(e + ' textarea').value, tabs: document.querySelectorAll(e + ' .doc-tabs > [role="tab"]').length }), EDITOR);
  check('reload: the editor window comes back with its file', back.tabs === 1 && /Saved from the test/.test(back.text), JSON.stringify(back));
  await p.click(EDITOR + ' .win-btn[data-win-action="close"]');
  await p.waitForFunction(() => !document.querySelector('.win'));
  /* Two requests in a row, the second made while the editor's script may
     still be loading: both files open, in order, in one window. */
  await p.evaluate(() => {
    pudlApplets.request('open', { path: '/notes/today.md', kind: 'doc' });
    pudlApplets.request('open', { path: '/notes/todo.txt', kind: 'text' });
  });
  await p.waitForFunction(e => document.querySelectorAll(e + ' .doc-tabs > [role="tab"]').length === 2, EDITOR);
  check('open: two rapid requests give two tabs in one window', JSON.stringify(await tabNames()) === '["today.md","todo.txt!"]' &&
        (await p.evaluate(() => document.querySelectorAll('.win').length)) === 1, JSON.stringify(await tabNames()));
  await p.click(EDITOR + ' .doc-tabs > [role="tab"]:nth-child(1)');
  check('save: reopening the file after a reload shows the edit', /Saved from the test/.test(await p.inputValue(EDITOR + ' textarea.code-surface')));
  check('grid: the saved file\'s size follows the save', await p.evaluate(g => /\d+ B/.test(document.querySelector(g + ' tr[data-path="/notes/today.md"] td.num').textContent), GRID));

  /* === Previews =========================================================== */
  await p.click('[data-region="tree"] a:text-is("articles")');
  await inFolder('/articles', 'articles');
  check('navigation: the editor window stays open across folders', await p.evaluate(() => pudlWindows.state().open.join() === 'editor'));
  await p.click(rowOf('elevation.md') + ' .glyph');
  check('toolbar: a Markdown file enables Preview', (await tools()) === 'false,false', await tools());
  await p.click('[data-act="preview"]');
  await p.waitForSelector('.win[data-win="preview"] .files-preview-doc h3');
  const pv = await p.evaluate(() => {
    const w = document.querySelector('.win[data-win="preview"]');
    return { title: w.querySelector('.win-title').textContent, h: w.querySelector('h3').textContent, code: !!w.querySelector('pre.code .hljs-comment'),
             list: w.querySelectorAll('.files-preview-doc li').length, fit: w.querySelector('[data-applet]').getAttribute('data-applet-fit') };
  });
  check('preview: Preview opens a window that shows the file read-only', pv.title === 'Preview: elevation.md' && pv.h === 'Raised means pressable' &&
        pv.code && pv.list === 3 && pv.fit === 'flow', JSON.stringify(pv));
  await p.click(rowOf('coincidences.md') + ' .glyph');
  await p.click('[data-act="preview"]');
  await p.waitForSelector('.win[data-win="preview-2"] .files-preview-doc h3');
  const pv2 = await p.evaluate(() => ({ open: pudlWindows.state().open.join(), top: pudlWindows.state().top,
    titles: ['preview', 'preview-2'].map(k => document.querySelector(`.win[data-win="${k}"] .win-title`).textContent),
    first: document.querySelector('.win[data-win="preview"] h3').textContent }));
  check('preview: a second Preview opens a second window, numbered, since the request does not reuse one',
        pv2.open === 'editor,preview,preview-2' && pv2.top === 'preview-2' && pv2.titles[1] === 'Preview 2: coincidences.md' &&
        pv2.titles[0] === 'Preview: elevation.md' && pv2.first === 'Raised means pressable', JSON.stringify(pv2));

  /* === Dropping files ===================================================== */
  const drag = (target, kinds, names) => p.evaluate(({ target, kinds, names }) => {
    const el = document.querySelector(target);
    const dt = new DataTransfer();
    names.forEach(n => dt.items.add(new File([n.endsWith('.png') ? '\u0000PNG' : 'Dropped ' + n + '\n'], n, { type: n.endsWith('.png') ? 'image/png' : 'text/plain' })));
    const seen = [];
    kinds.forEach(k => {
      let ev = new DragEvent(k, { bubbles: true, cancelable: true, dataTransfer: dt });
      if (!ev.dataTransfer) { ev = new Event(k, { bubbles: true, cancelable: true }); Object.defineProperty(ev, 'dataTransfer', { value: dt }); }
      el.dispatchEvent(ev);
      const zone = document.querySelector('[data-region="folder"] .drop-zone');
      seen.push(k + ':' + zone.hasAttribute('data-drop-over') + ':' + !!document.querySelector('[data-drop-target]') + ':' + ev.defaultPrevented);
    });
    return seen;
  }, { target, kinds, names });

  const ZONE = '[data-region="folder"] .drop-zone';
  const seen = await drag(ZONE + ' tbody tr:first-child td:nth-child(2)', ['dragenter', 'dragover', 'drop'], ['dropped.txt', 'photo.png']);
  check('drop: the zone is marked while files are over it and unmarked after the drop',
        seen.join('|') === 'dragenter:true:false:true|dragover:true:false:true|drop:false:false:true', seen.join('|'));
  await p.waitForFunction(g => [...document.querySelectorAll(g + ' tbody a')].some(a => a.textContent === 'dropped.txt'), GRID);
  const dropped = await p.evaluate(g => ({ row: document.querySelector(g + ' tr[data-path="/articles/dropped.txt"] .glyph').getAttribute('style'),
    text: filesStore.read('/articles/dropped.txt'), png: filesStore.exists('/articles/photo.png'),
    toasts: [...document.querySelectorAll('.toast')].map(t => t.className + ':' + t.textContent.trim()) }), GRID);
  check('drop: a text file joins the folder, in the grid and the store', /glyph-file/.test(dropped.row) && dropped.text === 'Dropped dropped.txt\n', JSON.stringify(dropped));
  check('drop: a file that is not text is refused with a warning', !dropped.png && dropped.toasts.some(t => /warn/.test(t) && /photo\.png is not a text file/.test(t)) &&
        dropped.toasts.some(t => /positive/.test(t) && /Added dropped\.txt to \/articles/.test(t)), JSON.stringify(dropped.toasts));

  const leave = await drag(ZONE, ['dragenter', 'dragleave'], ['x.txt']);
  check('drop: leaving the zone unmarks it', leave.join('|') === 'dragenter:true:false:true|dragleave:false:false:false', leave.join('|'));
  const plain = await p.evaluate(z => {
    const el = document.querySelector(z);
    const ev = new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: new DataTransfer() });
    el.dispatchEvent(ev);
    const marked = el.hasAttribute('data-drop-over');
    el.dispatchEvent(new DragEvent('dragleave', { bubbles: true, cancelable: true, dataTransfer: new DataTransfer() }));
    return marked;
  }, ZONE);
  check('drop: a drag carrying no files is not taken', plain === false);

  /* Onto a folder's row: the row is the target, and the file goes there. */
  await p.click('[data-region="tree"] a:text-is("notes")');
  await inFolder('/notes', 'notes');
  const HOSTILE = '<img src=x onerror="window.__ran=1">idea".md';
  const onRow = await drag(GRID + ' tr[data-path="/notes/drafts"] td:nth-child(3)', ['dragenter', 'dragover', 'drop'], [HOSTILE, 'a\\b.txt']);
  check('drop: a folder\'s row is the target while files are over it', onRow[0] === 'dragenter:true:true:true' && onRow[2] === 'drop:false:false:true', onRow.join('|'));
  await p.waitForFunction(n => filesStore.exists('/notes/drafts/' + n), HOSTILE);
  const drafts = await p.evaluate(() => ({ count: document.querySelector('tr[data-path="/notes/drafts"] td.num').textContent, img: !!document.querySelector('[data-region="folder"] img'),
    refused: [...document.querySelectorAll('.toast.warn')].some(t => /a\\b\.txt cannot be kept here/.test(t.textContent)) }));
  check('drop: onto a folder\'s row, the file goes into that folder; a name with a slash is refused', drafts.count === '2 items' && !drafts.img && drafts.refused, JSON.stringify(drafts));
  await p.click(rowOf('drafts') + ' a');
  await inFolder('/notes/drafts', 'drafts');
  const esc = await p.evaluate(g => ({ names: [...document.querySelectorAll(g + ' tbody a')].map(a => a.textContent), img: !!document.querySelector('[data-region="folder"] img'),
                                       ran: !!window.__ran, path: [...document.querySelectorAll('[data-region="folder"] nav.path li')].map(li => li.textContent).join('/') }), GRID);
  check('grid: a dropped file\'s untrusted name shows as text, in the row and its link', esc.names.includes(HOSTILE) && !esc.img && !esc.ran && esc.path === 'files/notes/drafts', JSON.stringify(esc));
  await p.click(`${GRID} a:text-is(${JSON.stringify(HOSTILE)})`);
  await p.waitForFunction(() => [...document.querySelectorAll('.win[data-win="editor"] .doc-tabs > [role="tab"]')].some(t => /idea/.test(t.textContent)));
  check('editor: the dropped file opens, its name escaped in the tab', await p.evaluate(n => {
    const tab = document.querySelector('.win[data-win="editor"] .doc-tabs > [aria-selected="true"]');
    return tab.childNodes[0].textContent === n && !tab.querySelector('img') && !window.__ran;
  }, HOSTILE));

  /* === axe, with the windows full ========================================= */
  await p.click('.win[data-win="editor"] textarea.code-surface');
  await p.keyboard.type('Unsaved. ');
  await p.click(rowOf('window-titles.md') + ' .glyph');
  await p.click('[data-act="preview"]');
  await p.waitForSelector('.win[data-win="preview"] .files-preview-doc');
  for (const theme of ['light', 'dark']) {
    await p.evaluate(t => pudlSetTheme(t), theme);
    const r = await new AxeBuilder({ page: p }).withRules(['color-contrast', 'scrollable-region-focusable', 'aria-allowed-attr', 'aria-allowed-role',
      'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'button-name', 'link-name', 'label']).analyze();
    const found = r.violations.map(v => v.id + ' ' + v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(', '));
    check('axe, ' + theme + ': tree, grid, document tabs, editor and previews', found.length === 0, found.join(' | '));
  }

  /* === Closing the editor with unsaved changes ============================ */
  check('retitle: the dock follows the previews\' titles', await p.evaluate(() => {
    const tabs = [...document.querySelectorAll('[data-win-dock] [data-win-tab]')].map(t => t.textContent.trim());
    const head = document.querySelector('.win[data-win="preview-2"] .win-head').getAttribute('aria-label');
    return tabs.includes('Preview 2: coincidences.md') && /Preview 2: coincidences\.md/.test(head);
  }));
  await p.evaluate(() => { window.__closes = []; document.addEventListener('pudl:window-close', e => window.__closes.push(e.detail.key + ':' + e.detail.reason)); });
  await p.evaluate(() => pudlWindows.raise('editor'));
  await p.click(EDITOR + ' .win-btn[data-win-action="close"]');
  await p.waitForSelector(EDITOR + ' dialog[open]');
  let still = await p.evaluate(e => ({ open: pudlWindows.state().open.includes('editor'), body: document.querySelector(e + ' dialog[open] .dialog-body').textContent }), EDITOR);
  check('close: the editor refuses to close with unsaved changes, and asks', still.open && /idea/.test(still.body) && /closes the editor/.test(still.body), JSON.stringify(still));
  await p.click(EDITOR + ' dialog[open] button:text-is("Keep editing")');
  still = await p.evaluate(() => ({ open: pudlWindows.state().open.includes('editor'), closes: window.__closes.slice() }));
  check('close: Keep editing keeps the window and its text', still.open && still.closes.length === 0 &&
        /Unsaved\./.test(await p.inputValue(EDITOR + ' textarea.code-surface')), JSON.stringify(still));
  await p.click(EDITOR + ' .win-btn[data-win-action="close"]');
  await p.waitForSelector(EDITOR + ' dialog[open]');
  await p.click(EDITOR + ' dialog[open] button:text-is("Discard")');
  await p.waitForFunction(() => !document.querySelector('.win[data-win="editor"]'));
  still = await p.evaluate(() => ({ open: pudlWindows.state().open.join(), closes: window.__closes.slice(), url: location.search }));
  check('close: Discard closes the window, as a script close', still.open === 'preview,preview-2,preview-3' && still.closes.join() === 'editor:script' &&
        !/editor/.test(still.url), JSON.stringify(still));

  /* === The editor's own page ============================================== */
  const q = await ctx.newPage();
  q.on('pageerror', e => errors.push(e.message));
  await q.goto(S + 'editor.html?file=/notes/today.md');
  await q.waitForSelector('[data-applet="editor"] .doc-tabs > [role="tab"]');
  check('editor page: the applet runs in a page of its own, with the file from the address, flowing',
        /Saved from the test/.test(await q.inputValue('textarea.code-surface')) && (await q.getAttribute('[data-applet="editor"]', 'data-applet-fit')) === 'flow');
  await q.close();

  /* === Resetting ========================================================== */
  await p.click('.files-foot button:text-is("Reset the sample")');
  await p.waitForSelector('#reset[open]');
  await Promise.all([p.waitForNavigation(), p.click('#reset button:text-is("Reset")')]);
  await p.waitForFunction(() => window.filesStore);
  check('reset: the sample starts over', await p.evaluate(() => !/Saved from the test/.test(filesStore.read('/notes/today.md')) && !filesStore.exists('/articles/dropped.txt')));

  check('no page errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(failures ? failures + ' FAILED' : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
