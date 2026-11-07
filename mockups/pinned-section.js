/* Prototype host adapter. Quit never calls a native bridge. */
(function () {
  'use strict';
  var layer = document.querySelector('[data-win-layer]');
  var prefsKey = 'pudl-pinned-section-taskbar';
  function read(key, fallback) { try { var value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); } catch (_) { return fallback; } }
  function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }
  var prefs = read(prefsKey, {});
  layer.addEventListener('pudl:taskbar-change', function (e) { save(prefsKey, { version:2, pins:e.detail.pins, order:e.detail.order, references:e.detail.references || [] }); });
  layer.addEventListener('pudl:taskbar-activate', function (e) { e.preventDefault(); e.detail.waitUntil(e.detail.id === 'quit' ? requestQuit() : pudlWindows.open(e.detail.id, e.detail.opener)); });
  var catalog = [
    { id:'settings', label:'Settings', glyph:'gear', kind:'applet' }, { id:'editor', label:'Editor', glyph:'pencil', kind:'applet' },
    { id:'quit', label:'Quit Dinah', glyph:'close', kind:'applet', command:true },
    { id:'terminal', label:'Terminal', glyph:'terminal', kind:'applet' }, { id:'notes', label:'Meeting notes', glyph:'file', kind:'page' },
    { id:'pudl-docs', label:'PUDL documentation', glyph:'link', kind:'link', href:'https://github.com/paulmooreparks/pudl' }
  ];
  var menuDefaults = read('pudl-pinned-section-menus', read('pudl-pinned-section-view', true) ? ['view'] : []);
  var pins = Array.isArray(prefs.pins) ? prefs.pins.slice() : ['settings','editor','quit'];
  if (prefs.version !== 2 && Array.isArray(menuDefaults)) menuDefaults.forEach(function (id) { var key = pudlMenubar.siteMenuDestinationId(id); if (key && pins.indexOf(key) === -1) pins.push(key); });
  pudlWindows.configureTaskbar({destinations:catalog,pins:pins,order:Array.isArray(prefs.order) ? prefs.order : ['pin:settings','pin:quit','pin:editor'],references:prefs.references || []});
  if (prefs.version !== 2) save(prefsKey,Object.assign({version:2},pudlWindows.taskbarState()));
  function syncSettings() { document.querySelectorAll('.win #theme').forEach(function (select) { select.value = document.documentElement.dataset.theme; }); }
  function setTheme(value) {
    document.documentElement.dataset.theme = value;
    try { localStorage.setItem('pudl-pinned-section-theme', value); } catch (_) {}
    syncSettings();
  }
  syncSettings();
  document.addEventListener('pudl:window-open', syncSettings);
  document.addEventListener('change', function (e) { if (e.target.id === 'theme') setTheme(e.target.value); });
  document.addEventListener('input', function (e) { if (e.target.id === 'draft') document.getElementById('unsaved').checked = true; });
  var quit = document.getElementById('quit-dialog');
  var quitPending = null, settleQuit = null;
  function requestQuit() {
    if (quitPending) return quitPending;
    if (!document.getElementById('unsaved').checked) { exit(); return Promise.resolve(); }
    quitPending = new Promise(function (resolve) { settleQuit = resolve; });
    quit.showModal();
    return quitPending;
  }
  quit.addEventListener('close', function () { var done = settleQuit; settleQuit = null; quitPending = null; if (done) done(); });
  function exit() { if (quit.open) quit.close(); document.getElementById('exited').hidden = false; document.getElementById('restart').focus(); }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-quit]')) requestQuit();
    if (e.target.closest('[data-theme-toggle]')) setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    var choice = e.target.closest('[data-set-theme]');
    if (choice) { setTheme(choice.dataset.setTheme); }
  });
  document.getElementById('quit-cancel').onclick = function () { quit.close(); };
  document.getElementById('quit-discard').onclick = exit;
  document.getElementById('quit-save').onclick = function () { document.getElementById('unsaved').checked = false; exit(); };
  document.getElementById('restart').onclick = function () { document.getElementById('exited').hidden = true; var pin = document.querySelector('[data-win-pin="quit"]'); if (pin) pin.focus(); };
})();
