/* Host catalog content, routing and preferences. PUDL owns launcher presentation. */
(function () {
  'use strict';
  var requestedPlacement = new URL(location.href).searchParams.get('launcher');
  if (requestedPlacement === 'top' || requestedPlacement === 'taskbar') document.querySelector('[data-menubar]').removeAttribute('data-menubar-launcher');
  function boot() {
  var root = document.getElementById('host-launcher'), opener = pudlMenubar.launcherButton() || document.getElementById('host-title');
  if (pudlMenubar.launcherButton()) { document.getElementById('host-title').remove(); opener.id = 'host-title'; }
  var frame = document.getElementById('host-frame'), slot = document.getElementById('launcher-slot');
  var demo = document.body.dataset.demo, key = 'pudl-host-launcher-study:' + demo;
  var current = '', restoring = true, hydrated = new WeakSet();
  var placement = new URL(location.href).searchParams.get('launcher') || 'title';
  document.body.dataset.launcherPlacement = placement;
  if (placement === 'top' || placement === 'taskbar') {
    opener.hidden = false;
    opener.setAttribute('aria-label', 'Open launcher');
    if (placement === 'top') document.querySelector('.host-bar').prepend(opener);
    else document.querySelector('.win-bar').prepend(opener);
    document.body.dataset.defaultPresentation = 'popup';
    document.querySelectorAll('.study-switcher a').forEach(function (a) { var url = new URL(a.href); url.searchParams.set('launcher', placement); a.href = url.href; });
  }
  function load(name, fallback) { try { return JSON.parse(localStorage.getItem(key + ':' + name)) || fallback; } catch (_) { return fallback; } }
  function save(name, value) { try { localStorage.setItem(key + ':' + name, JSON.stringify(value)); } catch (_) { /* The demo also works without storage. */ } }
  function sizeKey() { return innerWidth <= 700 ? 'size-narrow' : 'size-wide'; }
  function visibleInvoker() { return placement === 'title' ? pudlMenubar.launcherButton({ visible: true }) || opener : opener; }
  function setAddress(push) {
    if (restoring) return;
    var url = new URL(location.href), state = pudlStart.state(root);
    [['catalog', current], ['section', state.category || (demo === 'content' ? 'all' : '')], ['find', state.query], ['view', demo === 'content' ? document.body.dataset.catalogView : '']].forEach(function (pair) {
      if (pair[1]) url.searchParams.set(pair[0], pair[1]); else url.searchParams.delete(pair[0]);
    });
    if (url.href !== location.href) history[push ? 'pushState' : 'replaceState'](null, '', url);
  }
  function presentation(next, focus) { pudlLauncher.present(root, next, { focus: focus }); }
  function popupSize() { pudlLauncher.resize(root, load(sizeKey(), { width: demo === 'content' ? 820 : 720, height: 600 })); }
  root.addEventListener('pudl:launcher-change', function (e) {
    current = e.detail.presentation; document.body.dataset.presentation = current;
    if (restoring) return;
    save('presentation', current);
    if (current === 'popup') save(sizeKey(), { width: e.detail.width, height: e.detail.height });
    setAddress(false);
  });
  pudlLauncher.enhance(root, { pane: slot, layout: frame, invoker: opener, anchor: visibleInvoker,
    placement: placement === 'taskbar' ? 'above' : 'below',
    size: load(sizeKey(), { width: demo === 'content' ? 820 : 720, height: 600 }) });
  root.addEventListener('pudl:start-change', function (e) { setAddress(e.detail.reason === 'category'); });
  document.addEventListener('pudl:split', function (e) {
    /* Persist the current visible size even if a preceding keyboard gesture's
       completion arrives after a pointer gesture. Null still means reset. */
    var name, element;
    if (e.target.classList.contains('outer-divider')) { name = 'pane-width'; element = slot; }
    if (e.target.classList.contains('category-divider')) { name = 'category-width'; element = root.querySelector('.start-categories'); }
    if (!element) return;
    var width = element.getBoundingClientRect().width;
    if (e.detail.size === null || width > 0) save(name, e.detail.size === null ? null : width);
  });
  document.getElementById('reset-size').addEventListener('click', function () {
    save(sizeKey(), { width: demo === 'content' ? 820 : 720, height: 600 });
    frame.style.removeProperty('--split-a'); root.querySelector('#category-split').style.removeProperty('--split-a'); save('pane-width', null); save('category-width', null);
    if (root.hasAttribute('popover')) popupSize(); pudlSplit.refresh(frame); pudlSplit.refresh(root);
  });
  function calculate(form) { var values = Array.from(form.querySelectorAll('input')).map(function (i) { return Number(i.value) || 0; }); form.querySelector('output').textContent = values.reduce(function (a, b) { return a + b; }, 0).toFixed(form.hasAttribute('data-expenses') ? 2 : 4).replace(/\.?(0+)$/, function (s) { return form.hasAttribute('data-expenses') ? s : ''; }); }
  function diagnostics(win) {
    var dl = win.querySelector('[data-diagnostics]'); if (!dl) return;
    dl.replaceChildren(); [['Viewport', innerWidth + ' × ' + innerHeight], ['Open windows', document.querySelectorAll('.win[data-win]').length], ['DOM elements', document.querySelectorAll('*').length]].forEach(function (pair) { var dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = pair[0]; dd.textContent = pair[1]; dl.append(dt, dd); });
  }
  function hydrate(win) {
    if (hydrated.has(win)) return; hydrated.add(win);
    var body = win.querySelector('.win-body'); body.setAttribute('data-applet', 'host-study-tool'); pudlApplets.boot(win); pudlApplets.start(win.dataset.win).then(updateMenus);
    win.querySelectorAll('[data-draft]').forEach(function (input) {
      input.value = load('draft-' + input.dataset.draft, ''); input.addEventListener('input', function () { save('draft-' + input.dataset.draft, input.value); win.querySelector('[data-draft-status]').textContent = 'Draft kept in this browser when storage is available.'; });
    });
    win.querySelectorAll('[data-calculator],[data-expenses]').forEach(function (form) { form.addEventListener('submit', function (e) { e.preventDefault(); }); form.addEventListener('input', function () { calculate(form); }); calculate(form); });
    win.querySelectorAll('[data-task]').forEach(function (input) { input.checked = load('task-' + input.dataset.task, false); input.addEventListener('change', function () { save('task-' + input.dataset.task, input.checked); }); });
    var colour = win.querySelector('[data-colour]');
    if (colour) colour.addEventListener('input', function () { win.querySelector('[data-colour-value]').textContent = colour.value; win.querySelector('.colour-sample').style.setProperty('--sample-colour', colour.value); });
    diagnostics(win);
  }
  function emptyWorkspace() { var empty = document.querySelector('.workspace-empty'); if (empty) empty.hidden = pudlWindows.state().open.length > 0; }
  function updateMenus() { pudlMenubar.refresh(); }
  pudlApplets.define('host-study-tool', {});
  pudlApplets.register('host-study-tool', {
    init: function (body) {
      var win = body.closest('.win'), active = win.dataset.win;
      return { menus: function () {
        var draft = body.querySelector('[data-draft]'), reader = !!body.querySelector('.reading-sample');
        var name = reader ? 'Reader' : draft ? 'Editor' : win.querySelector('.win-title').textContent;
        var titles = [{ label: name, glyph: reader ? 'document' : 'app', items: [
          { label: 'Browse catalog', run: function () { pudlLauncher.open(root); } },
          { label: 'Close window', run: function () { pudlWindows.close(active); } }
        ] }];
        if (draft || body.querySelector('[data-diagram-export]')) titles.push({ label: 'File', items: [{ label: draft ? 'Download text' : 'Export SVG', glyph: 'download', run: function () {
          if (!draft) { body.querySelector('[data-diagram-export]').click(); return; }
          var url = URL.createObjectURL(new Blob([draft.value], { type: 'text/plain;charset=utf-8' })), a = document.createElement('a');
          a.href = url; a.download = active + '.txt'; a.click(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        } }] });
        if (draft) titles.push({ label: 'Edit', items: [{ label: 'Select all', run: function () { draft.focus(); draft.select(); } }] });
        if (reader) titles.push({ label: 'Reading', items: [{ label: 'Go to beginning', run: function () { body.scrollTop = 0; body.tabIndex = -1; body.focus({ preventScroll: true }); } }] });
        var refresh = body.querySelector('[data-refresh-diagnostics]');
        if (refresh) titles[0].items.push({ label: 'Refresh diagnostics', run: function () { refresh.click(); } });
        var step = body.querySelector('[data-diagram-step]');
        if (step) titles.push({ label: 'Shape', items: [{ label: 'Change step label', run: function () { step.click(); } }] });
        return { titles: titles };
      } };
    }
  });
  document.addEventListener('pudl:windows-change', function () { emptyWorkspace(); updateMenus(); });
  document.addEventListener('pudl:window-open', function (e) { var win = e.target.closest('.win'); if (win) hydrate(win); });
  new MutationObserver(function (records) { if (records.some(function (r) { return Array.from(r.addedNodes).some(function (n) { return n.nodeType === 1 && (n.matches('.win') || n.querySelector('.win')); }); })) document.querySelectorAll('.win[data-win]').forEach(hydrate); }).observe(document.querySelector('.win-layer'), { childList: true, subtree: true });
  function openItem(id, from) {
    pudlLauncher.activated(root, from);
    var single = new URL(location.href).searchParams.get('mode') === 'standalone';
    if (single) document.getElementById('study-' + id).content.querySelector('.win').setAttribute('data-win-mode', 'maximized');
    if (single) { var before = pudlWindows.state().open.slice(); before.filter(function (k) { return k !== id; }).forEach(function (k) { pudlWindows.close(k); }); }
    pudlWindows.open(id, from); updateMenus();
    if (single) { var url = new URL(location.href); url.searchParams.set('item', id); history.replaceState(null, '', url); }
  }
  document.addEventListener('click', function (e) {
    var link = e.target.closest('[data-demo-open]'); if (!link || !link.closest('#host-launcher, .desktop-guide') || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); openItem(link.dataset.demoOpen, link);
  });
  document.querySelectorAll('[data-open-launcher]').forEach(function (button) { button.addEventListener('click', function () { pudlLauncher.open(root); }); });
  document.addEventListener('click', function (e) {
    var win = e.target.closest('.win'); if (!win) return;
    if (e.target.closest('[data-refresh-diagnostics]')) diagnostics(win);
    if (e.target.closest('[data-dismiss-notification]')) e.target.closest('.sample-notification').remove();
    if (e.target.closest('[data-diagram-step]')) { var label = win.querySelector('[data-diagram-label]'); label.textContent = label.textContent === 'Do the work' ? 'Review the result' : 'Do the work'; }
    if (e.target.closest('[data-diagram-export]')) {
      var svg = win.querySelector('svg').cloneNode(true); svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); svg.style.color = '#222'; svg.querySelectorAll('[fill="var(--surface)"]').forEach(function (el) { el.setAttribute('fill', '#fff'); el.setAttribute('stroke', '#4477bb'); });
      var url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' })), a = document.createElement('a'); a.href = url; a.download = 'launcher-study-diagram.svg'; a.click(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }
    var file = e.target.closest('[data-document]');
    if (file) {
      var id = file.dataset.document === 'Meeting notes' ? 'meeting-notes' : 'project-outline';
      if (load('draft-' + id, null) === null) save('draft-' + id, file.dataset.document + '\n\nThis is an editable sample document.');
      openItem(id, file);
    }
  });
  document.getElementById('theme-choice').addEventListener('click', function () { var light = document.documentElement.dataset.theme !== 'light'; document.documentElement.dataset.theme = light ? 'light' : 'dark'; document.querySelector('[data-theme-label]').textContent = light ? 'Dark theme' : 'Light theme'; save('theme', light ? 'light' : 'dark'); });
  document.querySelectorAll('button[data-catalog-view]').forEach(function (button) { button.addEventListener('click', function () { var view = button.dataset.catalogView; document.body.dataset.catalogView = view; document.querySelectorAll('button[data-catalog-view]').forEach(function (b) { b.setAttribute('aria-checked', String(b === button)); }); save('catalog-view', view); setAddress(false); }); });
  function hostName(value) { var name = value === 'gk' ? 'GK Companion' : 'Dinah'; document.querySelectorAll('[data-host-name],#launcher-heading').forEach(function (n) { n.textContent = name; }); opener.setAttribute('aria-label', 'Open ' + name + ' launcher'); document.querySelectorAll('[data-host-flavour]').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.hostFlavour === value)); }); }
  if (demo === 'tools') { hostName(new URL(location.href).searchParams.get('host')); document.querySelectorAll('[data-host-flavour]').forEach(function (button) { button.addEventListener('click', function () { hostName(button.dataset.hostFlavour); var url = new URL(location.href); url.searchParams.set('host', button.dataset.hostFlavour); history.replaceState(null, '', url); }); }); }
  function restore() {
    restoring = true; var params = new URL(location.href).searchParams;
    var section = params.has('section') ? params.get('section') : (demo === 'content' ? 'posts' : '');
    pudlStart.setState(root, { query: params.get('find') || '', category: section === 'all' ? '' : section });
    var view = params.get('view') || load('catalog-view', 'overview');
    document.body.dataset.catalogView = view === 'list' ? 'list' : 'overview';
    document.querySelectorAll('button[data-catalog-view]').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.catalogView === document.body.dataset.catalogView)); });
    presentation(params.get('catalog') || load('presentation', document.body.dataset.defaultPresentation), false); restoring = false;
  }
  window.addEventListener('popstate', restore);
  document.getElementById('reset-study').addEventListener('click', function () {
    try { Object.keys(localStorage).filter(function (k) { return k.startsWith(key + ':') && !k.startsWith(key + ':draft-') && !k.startsWith(key + ':task-'); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (_) {}
    location.href = location.pathname;
  });
  document.documentElement.dataset.theme = load('theme', 'dark');
  document.body.dataset.appMode = new URL(location.href).searchParams.get('mode') === 'standalone' ? 'standalone' : 'desktop';
  if (document.documentElement.dataset.theme === 'light') document.querySelector('[data-theme-label]').textContent = 'Dark theme';
  var pane = load('pane-width', null), divider = load('category-width', null);
  if (pane) frame.style.setProperty('--split-a', pane + 'px');
  if (divider) root.querySelector('#category-split').style.setProperty('--split-a', divider + 'px');
  document.body.dataset.catalogView = load('catalog-view', 'overview');
  restore();
  document.querySelectorAll('.win[data-win]').forEach(hydrate);
  emptyWorkspace();
  updateMenus();
  var item = new URL(location.href).searchParams.get('item');
  if (new URL(location.href).searchParams.get('mode') === 'standalone' && document.getElementById('study-' + item)) openItem(item, opener);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
