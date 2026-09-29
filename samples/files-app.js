/* The Files sample's stand-in server, and the store its applets share.

   A server would render the folder tree and the folder's contents from the
   address, ?path=/notes, and keep the files. GitHub Pages serves files and
   nothing else, so this script plays both parts in the browser. It keeps a
   small fixed set of folders and files, with the reader's edits and the
   files they drop in stored in localStorage under one key, and it renders
   the page's two regions from the address before the page is first drawn.

   Moving between folders swaps only those two regions, through
   pudl-regions.js, so an editor window with unsaved text stays open while
   the reader browses. pudl-regions.js fetches the same page for the new
   address, and this script fills the fetched regions in again when
   pudl:regions-swap fires, as the server would have filled them.

   The store is window.filesStore, so the editor and the preview can reach
   it on this page and on their own pages, which load this script too. On
   those pages there is no browser to render, and only the store runs.

   Load it with defer, before the PUDL scripts, so the page is rendered by
   the time they look at it. */
(() => {
  'use strict';

  const KEY = 'pudl-files-sample';
  const KEPT = 'pudl-files-windows';
  const MAX_BYTES = 256 * 1024;

  /* === The files ========================================================= */

  const FOLDERS = ['/', '/apps', '/articles', '/notes', '/notes/drafts', '/scripts'];
  const LINKS = {
    '/apps/article-reader': 'article-reader.html',
    '/apps/colour-mixer': 'colour-mixer.html',
    '/apps/expenses': 'expenses.html'
  };
  const lines = (...l) => l.join('\n') + '\n';

  function seed() {
    return {
      '/README.md': lines(
        '# Files',
        '',
        'This is a small file browser built with PUDL. The folders are a tree on the left, and the folder you are in is a grid of its contents on the right.',
        '',
        'Open a file to edit it in a window, or preview a Markdown file to read it. Drop text files onto the list to add them to the folder.',
        '',
        'Everything you change stays in this browser.'),
      '/articles/coincidences.md': lines(
        '# Coincidences',
        '',
        'Two readers opened the same article within a minute of each other, from opposite sides of the world, and both of them wrote to ask about the same footnote.',
        '',
        '## What they asked',
        '',
        'Neither had seen the other\'s question. Both wanted to know why the footnote pointed at a page that no longer existed.',
        '',
        'The page had moved, and the link had not moved with it.'),
      '/articles/elevation.md': lines(
        '# Raised means pressable',
        '',
        'A control that can be pressed stands up from the page, with a highlight along its top edge and a shadow beneath it. A field that takes input is sunk into the page, and everything else lies flat.',
        '',
        '## In practice',
        '',
        '- Buttons are raised.',
        '- Fields, and the editor you may be reading this in, are sunken.',
        '- Text, tables and code blocks are flat.',
        '',
        'Two of the tokens behind the effect:',
        '',
        '```css',
        '/* A raised control\'s face. */',
        '--raise-grad: linear-gradient(var(--raise-top), var(--surface-alt));',
        '--entry-shadow: inset 0 1px 2px color-mix(in srgb, var(--shade) var(--depth), transparent);',
        '```'),
      '/articles/url-state.md': lines(
        '# Keeping state in the URL',
        '',
        'Every arrangement worth sharing is an address. The folder you are looking at is one, and so is each window you open:',
        '',
        '```',
        'files.html?path=/notes&open=editor&top=editor',
        '```',
        '',
        'Reload the page and it comes back as you left it. Send the address to someone and they see what you saw, apart from what lives only in your browser.'),
      '/notes/today.md': lines(
        '# Today',
        '',
        '- Draft the release notes for 0.27.',
        '- Try the file browser on a phone.',
        '- Answer the question about window titles.'),
      '/notes/todo.txt': lines(
        'Buy coffee beans.',
        'Renew the domain before the end of the month.',
        'Back up the photos from the trip.'),
      '/notes/drafts/window-titles.md': lines(
        '# Window titles',
        '',
        'A window\'s title says what is in it. When an applet opens a second copy of itself, the title carries a number, so the dock can tell the two apart.',
        '',
        'The preview changes its title to name the file it shows.'),
      '/scripts/build.sh': lines(
        '#!/bin/sh',
        '# Copies the site into public/, ready to serve.',
        'set -e',
        'rm -rf public',
        'mkdir -p public',
        'cp -r dist samples reference.html public/',
        'echo "Built public/"'),
      '/scripts/check-links.js': lines(
        '// Lists the links on a page that point nowhere.',
        'const links = [...document.querySelectorAll(\'a[href]\')];',
        'const empty = links.filter(a => !a.getAttribute(\'href\').trim());',
        'console.log(empty.length + \' links point nowhere\');'),
      '/apps/about.txt': lines(
        'Each entry here is a link to another PUDL sample.',
        'Opening one leaves this page.')
    };
  }

  const dirOf = p => p.slice(0, p.lastIndexOf('/')) || '/';
  const nameOf = p => p === '/' ? '' : p.slice(p.lastIndexOf('/') + 1);
  const isFolder = p => FOLDERS.indexOf(p) >= 0;
  const joinPath = (dir, name) => (dir === '/' ? '' : dir) + '/' + name;

  /* A file's kind, in the words the applets' requests use. */
  function kindOf(p) {
    if (isFolder(p)) return 'folder';
    if (Object.prototype.hasOwnProperty.call(LINKS, p)) return 'link';
    if (/\.md$/i.test(p)) return 'doc';
    if (/\.(sh|js)$/i.test(p)) return 'script';
    return 'text';
  }

  /* A stored file map is taken only if every key is a path in a known
     folder and every value is text, since localStorage can hold anything. */
  function valid(map) {
    if (!map || typeof map !== 'object') return false;
    return Object.keys(map).every(k => typeof map[k] === 'string' && k.charAt(0) === '/' && isFolder(dirOf(k)) && !isFolder(k));
  }

  /* The files live in localStorage. When the browser will not keep them,
     as in some private windows, the sample still works for the visit. */
  let persistent = true;
  function load() {
    try {
      const s = localStorage.getItem(KEY);
      if (s) {
        const d = JSON.parse(s);
        if (d && d.version === 1 && valid(d.files)) return d.files;
      }
    } catch (err) { persistent = false; }
    return seed();
  }
  let files = load();

  function keep() {
    try { localStorage.setItem(KEY, JSON.stringify({ version: 1, files })); return true; } catch (err) { persistent = false; return false; }
  }

  function changed(path) {
    document.dispatchEvent(new CustomEvent('files:change', { detail: { path: path } }));
  }

  /* Another tab saved: take its files and say so. */
  window.addEventListener('storage', e => {
    if (e.key !== KEY) return;
    files = load();
    changed(null);
  });

  function bytes(text) { return new TextEncoder().encode(text).length; }

  function list(folder) {
    if (!isFolder(folder)) return null;
    const out = [];
    FOLDERS.forEach(f => { if (f !== '/' && dirOf(f) === folder) out.push({ path: f, name: nameOf(f), kind: 'folder', count: 0 }); });
    out.forEach(e => { e.count = list(e.path).length; });
    Object.keys(LINKS).forEach(l => { if (dirOf(l) === folder) out.push({ path: l, name: nameOf(l), kind: 'link', href: LINKS[l] }); });
    Object.keys(files).forEach(f => { if (dirOf(f) === folder) out.push({ path: f, name: nameOf(f), kind: kindOf(f), size: bytes(files[f]) }); });
    const rank = { folder: 0 };
    return out.sort((a, b) => ((rank[a.kind] === 0 ? 0 : 1) - (rank[b.kind] === 0 ? 0 : 1)) || a.name.localeCompare(b.name));
  }

  window.filesStore = {
    read: p => Object.prototype.hasOwnProperty.call(files, p) ? files[p] : null,
    write(p, text) {
      if (typeof p !== 'string' || !isFolder(dirOf(p)) || isFolder(p) || kindOf(p) === 'link') return false;
      files[p] = String(text);
      keep();
      changed(p);
      return true;
    },
    list,
    kindOf,
    isFolder,
    exists: p => isFolder(p) || Object.prototype.hasOwnProperty.call(files, p) || Object.prototype.hasOwnProperty.call(LINKS, p),
    persistent: () => persistent,
    reset() {
      try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEPT); } catch (err) { /* nothing kept */ }
      files = seed();
      changed(null);
    }
  };

  /* === Keeping the applets' windows across a reload ======================
     PUDL keeps no applet state. A request hands a new window its file in
     memory, which a reload forgets, so this host keeps each window's state
     for the visit, keyed by the window, as the article reader does. */

  function kept() { try { return JSON.parse(sessionStorage.getItem(KEPT)) || {}; } catch (err) { return {}; } }
  function keepFor(key, state) {
    const all = kept();
    if (state == null) delete all[key]; else all[key] = state;
    try { sessionStorage.setItem(KEPT, JSON.stringify(all)); } catch (err) { /* not kept, then */ }
  }
  const windowOf = el => { const w = el.closest && el.closest('.win[data-win]'); return w ? w.getAttribute('data-win') : null; };
  document.addEventListener('pudl:applet-state', e => {
    const k = windowOf(e.target);
    const s = k && kept()[k];
    if (typeof s === 'string') e.detail.state = s;
  });
  document.addEventListener('pudl:applet-change', e => {
    const k = windowOf(e.target);
    if (k) keepFor(k, e.detail.state);
  });
  /* A window the reader closed forgets its file; one the address moved
     past keeps it, since Back brings it again. */
  document.addEventListener('pudl:window-close', e => {
    const why = e.detail && e.detail.reason;
    if (why === 'button' || why === 'key' || why === 'script') keepFor(e.detail.key, null);
  });

  /* === Rendering ========================================================= */

  const app = document.querySelector('.md-layout[data-files-app]');
  if (!app) return;

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ESC[c]);

  const GLYPHS = { folder: 'folder', link: 'link', doc: 'document', script: 'script', text: 'file', home: 'home' };
  const KIND_NAMES = { folder: 'Folder', link: 'Link', doc: 'Markdown', script: 'Script', text: 'Text' };
  const glyph = kind => `<span class="glyph" style="--glyph: var(--glyph-${GLYPHS[kind] || 'file'})" aria-hidden="true"></span>`;

  function size(e) {
    if (e.kind === 'folder') return e.count === 1 ? '1 item' : e.count + ' items';
    if (e.size == null) return '';
    return e.size < 1024 ? e.size + ' B' : (e.size / 1024).toFixed(1) + ' KB';
  }

  /* A path in an address, with its slashes left readable. */
  const addr = p => encodeURIComponent(p).replace(/%2F/g, '/');

  /* A folder's address. pudl-regions.js adds the open windows to it, when
     this script asks, so a middle-click keeps them. */
  const folderHref = p => 'files.html?path=' + addr(p);
  const refreshLinks = () => { if (window.pudlRegions) window.pudlRegions.refresh(); };

  function requested() {
    const q = new URLSearchParams(location.search);
    let p = q.get('path');
    if (p != null) p = p.replace(/\/+$/, '') || '/';
    return { has: q.has('path'), path: p == null ? '/' : p };
  }

  function treeNode(p, current) {
    const kids = FOLDERS.filter(f => f !== '/' && dirOf(f) === p);
    const along = p === current || current.indexOf(p === '/' ? '/' : p + '/') === 0;
    return `<li><a href="${esc(folderHref(p))}"${kids.length ? ` aria-expanded="${along}"` : ''}${p === current ? ' aria-current="page"' : ''}>` +
      glyph(p === '/' ? 'home' : 'folder') + esc(p === '/' ? 'Files' : nameOf(p)) + '</a>' +
      (kids.length ? '<ul>' + kids.map(k => treeNode(k, current)).join('') + '</ul>' : '') + '</li>';
  }

  function renderTree(current) {
    return `<ul class="tree" aria-label="Folders">${treeNode('/', current)}</ul>`;
  }

  function pathBar(p) {
    const chain = ['/'];
    p.split('/').filter(Boolean).forEach(part => chain.push(joinPath(chain[chain.length - 1], part)));
    return '<nav class="path mono" aria-label="Location"><ol>' + chain.map((c, i) => {
      const label = esc(c === '/' ? 'files' : nameOf(c));
      return '<li>' + (i === chain.length - 1 ? `<span aria-current="location">${label}</span>` : `<a href="${esc(folderHref(c))}">${label}</a>`) + '</li>';
    }).join('') + '</ol></nav>';
  }

  let selected = null;     // the path of the selected row, kept across re-renders

  function row(e) {
    let link;
    if (e.kind === 'folder') link = `<a href="${esc(folderHref(e.path))}">${esc(e.name)}</a>`;
    else if (e.kind === 'link') link = `<a href="${esc(e.href)}">${esc(e.name)}</a>`;
    else link = `<a href="${esc('editor.html?file=' + addr(e.path))}" data-file="${esc(e.path)}" data-kind="${esc(e.kind)}">${esc(e.name)}</a>`;
    return `<tr aria-selected="${e.path === selected}" data-path="${esc(e.path)}" data-kind="${esc(e.kind)}"${e.kind === 'folder' ? ' data-folder' : ''}>` +
      `<td>${glyph(e.kind)} ${link}</td><td>${KIND_NAMES[e.kind]}</td><td class="num">${esc(size(e))}</td></tr>`;
  }

  function renderFolder(p) {
    const entries = window.filesStore.list(p);
    const back = '<a class="md-back" href="files.html">Folders</a>';
    if (!entries) {
      return back + `<div class="empty-state">
        <p class="empty-state-title">There is no folder at ${esc(p)}</p>
        <p class="empty-state-body">It may have been a folder of files you dropped in before the sample was reset.</p>
        <div class="empty-state-actions"><a class="btn" href="${esc(folderHref('/'))}">Go to Files</a></div>
      </div>`;
    }
    if (!entries.some(e => e.path === selected)) selected = null;
    const label = p === '/' ? 'Files' : nameOf(p);
    const rows = entries.length ? entries.map(row).join('')
      : '<tr class="data-table-empty"><td colspan="3">This folder is empty. Drop text files here to add them.</td></tr>';
    return back + pathBar(p) +
      `<div class="files-tools">
        <button class="btn btn-sm" type="button" data-act="open" disabled>Open</button>
        <button class="btn btn-sm" type="button" data-act="preview" disabled>Preview</button>
        <span class="files-count">${entries.length === 1 ? '1 item' : entries.length + ' items'}</span>
      </div>
      <div class="data-table-wrap drop-zone" data-drop-folder="${esc(p)}">
        <table class="data-table" role="grid" aria-label="${esc('Contents of ' + label)}">
          <thead><tr><th scope="col">Name</th><th scope="col">Kind</th><th scope="col" class="num">Size</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p class="drop-hint">Drop text files here to add them to this folder</p>
      </div>`;
  }

  const region = name => document.querySelector(`[data-region="${name}"]`);

  /* Keeps the toolbar in step with the selected row: Open for any row,
     Preview only for a Markdown file. */
  function syncTools() {
    const folder = region('folder');
    const r = folder && folder.querySelector('table[role="grid"] tr[aria-selected="true"]');
    selected = r ? r.getAttribute('data-path') : null;
    const open = folder && folder.querySelector('[data-act="open"]');
    const preview = folder && folder.querySelector('[data-act="preview"]');
    if (open) open.disabled = !r;
    if (preview) preview.disabled = !(r && r.getAttribute('data-kind') === 'doc');
  }

  /* The folder's contents again, after a drop or a save, with focus kept
     on the row it was on. */
  function refreshFolder() {
    const folder = region('folder');
    if (!folder) return;
    const at = document.activeElement;
    const focusPath = at && folder.contains(at) && at.closest('tr[data-path]') ? at.closest('tr[data-path]').getAttribute('data-path') : null;
    folder.innerHTML = renderFolder(requested().path);
    const grid = folder.querySelector('table[role="grid"]');
    if (grid && window.pudlGrid) window.pudlGrid.enhance(grid);
    syncTools();
    refreshLinks();
    if (focusPath) {
      const r = Array.prototype.find.call(folder.querySelectorAll('tr[data-path]'), x => x.getAttribute('data-path') === focusPath);
      if (r) r.focus();
    }
  }

  function render() {
    const want = requested();
    const exists = window.filesStore.isFolder(want.path);
    const tree = region('tree');
    const folder = region('folder');
    selected = null;
    if (tree) tree.innerHTML = renderTree(exists ? want.path : '');
    if (folder) folder.innerHTML = renderFolder(want.path);
    document.title = (exists ? (want.path === '/' ? 'Files' : nameOf(want.path) + ', Files') : 'Not found, Files') + ', a PUDL Sample';
    /* The detail pane shows whenever the address names a folder, windows
       or none; the layer's data-win-pane="off" leaves this to the page. */
    app.setAttribute('data-md-pane', want.has ? 'detail' : 'list');
    if (window.pudlTree && tree) tree.querySelectorAll('.tree').forEach(t => window.pudlTree.enhance(t));
    const grid = folder && folder.querySelector('table[role="grid"]');
    if (grid && window.pudlGrid) window.pudlGrid.enhance(grid);
    refreshLinks();
  }

  render();
  document.addEventListener('pudl:regions-swap', render);

  /* The applets' windows open over the right of the folder, so the names
     in the list stay in reach, each a step down from the one before. On a
     phone there is no room beside the list, so they open maximised. */
  const layer = app.querySelector('[data-win-layer]');
  if (layer) {
    layer.addEventListener('pudl:window-place', e => {
      if (e.detail.parent) return;
      const step = (layer.querySelectorAll('.win').length % 4) * 0.03;
      e.detail.placement = { mode: layer.clientWidth < 560 ? 'maximized' : 'floating', x: 0.38 + step, y: 0.03 + step, w: 0.58, h: 0.86 };
    });
  }
  document.addEventListener('files:change', refreshFolder);
  document.addEventListener('pudl:row-select', syncTools);

  /* === Opening ===========================================================
     A file's link goes to the editor's own page without script. With
     script, it asks for the file to be opened, and whichever applet serves
     the request answers, in a window on this page. Caught on the way
     down, so pudl-regions.js never treats the click as a navigation. */

  function ask(verb, path, kind, from) {
    return !!(window.pudlApplets && window.pudlApplets.request(verb, { path, kind }, from));
  }

  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[data-file]');
    if (!a || !app.contains(a)) return;
    if (ask('open', a.getAttribute('data-file'), a.getAttribute('data-kind'), a)) e.preventDefault();
  }, true);

  /* The toolbar acts on the selected row. */
  app.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const r = region('folder').querySelector('table[role="grid"] tr[aria-selected="true"]');
    if (!r) return;
    const link = r.querySelector('a[href]');
    if (b.getAttribute('data-act') === 'open') {
      if (link.hasAttribute('data-file')) {
        if (!ask('open', link.getAttribute('data-file'), link.getAttribute('data-kind'), b)) location.assign(link.href);
      } else link.click();
    } else if (b.getAttribute('data-act') === 'preview' && r.getAttribute('data-kind') === 'doc') {
      if (!ask('preview', r.getAttribute('data-path'), 'doc', b) && window.pudlToast) window.pudlToast('Nothing here can preview this file.', { kind: 'warn' });
    }
  });

  /* === Dropping files ====================================================
     PUDL draws the drop targets and the host runs them. While files are
     dragged over the list, the list is the zone; over a folder's row, the
     row is the target, and the files go into that folder. Only drags that
     carry files count, and only text files are taken. */

  const stage = app.querySelector('.files-stage');
  let depth = 0;

  const carriesFiles = e => !!(e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0);
  const zoneOf = e => e.target.closest && e.target.closest('.drop-zone[data-drop-folder]');

  function clearDrop() {
    depth = 0;
    app.querySelectorAll('[data-drop-over]').forEach(z => z.removeAttribute('data-drop-over'));
    app.querySelectorAll('[data-drop-target]').forEach(r => r.removeAttribute('data-drop-target'));
  }

  function mark(e, zone) {
    zone.setAttribute('data-drop-over', '');
    const r = e.target.closest('tr[data-folder]');
    zone.querySelectorAll('[data-drop-target]').forEach(x => { if (x !== r) x.removeAttribute('data-drop-target'); });
    if (r) r.setAttribute('data-drop-target', '');
  }

  stage.addEventListener('dragenter', e => {
    const zone = zoneOf(e);
    if (!zone || !carriesFiles(e)) return;
    e.preventDefault();
    depth++;
    mark(e, zone);
  });
  stage.addEventListener('dragover', e => {
    const zone = zoneOf(e);
    if (!zone || !carriesFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    mark(e, zone);
  });
  /* dragenter on the element being entered comes before dragleave on the
     one being left, so the count reaches nought only when the drag has
     left the zone altogether. */
  stage.addEventListener('dragleave', e => {
    if (!zoneOf(e) || !carriesFiles(e)) return;
    depth = Math.max(0, depth - 1);
    if (!depth) clearDrop();
  });
  stage.addEventListener('drop', e => {
    const zone = zoneOf(e);
    if (!zone || !carriesFiles(e)) return;
    e.preventDefault();
    const r = e.target.closest('tr[data-folder]');
    const into = r ? r.getAttribute('data-path') : zone.getAttribute('data-drop-folder');
    const dropped = Array.prototype.slice.call(e.dataTransfer.files || []);
    clearDrop();
    addFiles(dropped, into);
  });
  window.addEventListener('dragend', clearDrop);
  window.addEventListener('drop', clearDrop);

  /* A dropped file's name comes from the reader's computer, so it is
     taken only if it could be a name in this store. */
  function cleanName(n) {
    n = String(n || '').trim();
    if (!n || n === '.' || n === '..' || n.length > 100 || /[\/\\\u0000-\u001f\u007f]/.test(n)) return null;
    return n;
  }
  const isText = f => /^text\//.test(f.type) || /\.(md|txt|sh|js|json|csv|css|html)$/i.test(f.name);

  /* A name already taken gets a number, so a drop never replaces a file. */
  function freePath(dir, name) {
    let p = joinPath(dir, name);
    const dot = name.lastIndexOf('.');
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    for (let n = 2; window.filesStore.exists(p); n++) p = joinPath(dir, stem + '-' + n + ext);
    return p;
  }

  async function addFiles(list, dir) {
    if (!window.filesStore.isFolder(dir)) return;
    const added = [];
    for (const f of list) {
      const name = cleanName(f.name);
      if (!name) {
        if (window.pudlToast) window.pudlToast('A file named ' + String(f.name).slice(0, 100) + ' cannot be kept here, because its name has a slash or a control character in it.', { kind: 'warn' });
        continue;
      }
      let text = null;
      if (isText(f) && f.size <= MAX_BYTES) {
        try { text = await f.text(); } catch (err) { text = null; }
      }
      if (text == null || text.indexOf('\u0000') >= 0) {
        if (window.pudlToast) window.pudlToast(name + ' is not a text file of 256 KB or less, so it was not added.', { kind: 'warn' });
        continue;
      }
      const p = freePath(dir, name);
      if (window.filesStore.write(p, text)) added.push(nameOf(p));
    }
    if (added.length && window.pudlToast) {
      window.pudlToast('Added ' + added.join(', ') + ' to ' + dir + '.', { kind: 'positive' });
    }
  }

  /* === The foot of the sidebar: where the files live, and starting over == */

  const foot = app.querySelector('.files-foot');
  if (foot) {
    foot.innerHTML = `${window.filesStore.persistent()
      ? 'A sample: its files live in this browser, and nothing leaves it.'
      : 'A sample: this browser is not keeping its files, so changes last only until you leave the page.'}
      <button class="link" type="button" commandfor="reset" command="show-modal">Reset the sample</button>`;
  }
  const reset = document.getElementById('reset');
  if (reset) {
    reset.addEventListener('close', () => {
      if (reset.returnValue !== 'reset') return;
      window.filesStore.reset();
      location.assign('files.html');
    });
  }
})();
