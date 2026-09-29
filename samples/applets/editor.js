/* The Files sample's editor: a PUDL applet that edits the sample's text
   files, several at once, one document tab each.

   Its state is the file in view, file=/notes/today.md. In a page of its own
   it keeps that in the address; anywhere else it reports it through
   opts.changed and leaves the address alone. A request to open a file
   reaches a running editor through setState(), which opens the file in a
   new tab, or chooses its tab if it is open already.

   The files come from window.filesStore, which samples/files-app.js
   provides on every page that runs this applet. The tabs are PUDL's
   document tabs: pudl-tabs.js moves along them with the arrow keys and
   turns the close button and the Delete key into pudl:tab-close, and this
   applet decides whether to close, asking first when a file has unsaved
   changes. */
(function () {
  'use strict';

  var uid = 0;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fileFrom(s) {
    if (!s) return null;
    var v = new URLSearchParams(String(s).replace(/^\?/, '')).get('file');
    return v || null;
  }
  function stateOf(path) { return 'file=' + encodeURIComponent(path).replace(/%2F/g, '/'); }
  function nameOf(path) { return path.slice(path.lastIndexOf('/') + 1); }

  function init(root, opts) {
    var n = ++uid, id = 'files-editor-' + n;
    var off = new AbortController(), on = { signal: off.signal };
    var store = window.filesStore;
    var tabs = [];          // { k, path, name, saved, text, start, end }
    var active = -1, nextK = 0, told = null;

    root.textContent = '';
    root.classList.add('files-editor');
    root.innerHTML =
      '<div class="files-editor-bar">' +
        '<button class="btn btn-sm" type="button" data-ed="save" aria-keyshortcuts="Control+S" disabled>Save</button>' +
        '<span class="files-editor-status" role="status"></span>' +
      '</div>' +
      '<div class="tablist doc-tabs" role="tablist" aria-label="Open files"></div>' +
      '<div class="files-editor-panel" role="tabpanel" id="' + id + '-panel" hidden>' +
        '<textarea class="code-surface" id="' + id + '-text" spellcheck="false" autocomplete="off"></textarea>' +
      '</div>' +
      '<p class="files-editor-empty">No file is open. Choose one in the list of files and press Open.</p>' +
      '<dialog class="dialog" aria-labelledby="' + id + '-ask-title" aria-describedby="' + id + '-ask-body">' +
        '<h2 class="dialog-title" id="' + id + '-ask-title">Discard unsaved changes?</h2>' +
        '<p class="dialog-body" id="' + id + '-ask-body"></p>' +
        '<form class="dialog-actions" method="dialog">' +
          '<button class="btn" value="keep" autofocus>Keep editing</button>' +
          '<button class="btn btn-danger" value="discard">Discard</button>' +
        '</form>' +
      '</dialog>';

    var q = function (sel) { return root.querySelector(sel); };
    var el = {
      save: q('[data-ed="save"]'), status: q('.files-editor-status'), list: q('.doc-tabs'),
      panel: q('.files-editor-panel'), text: q('textarea'), empty: q('.files-editor-empty'),
      dialog: q('dialog'), askBody: q('.dialog-body')
    };

    function say(msg) { el.status.textContent = msg || ''; }
    function current() { return tabs[active] || null; }
    function dirty(t) { return t.text !== t.saved; }

    /* The state is the file in view. On its own page the applet keeps it
       in the address; everywhere it tells the host when it changes. */
    function announce() {
      var t = current();
      var s = t ? stateOf(t.path) : null;
      if (s === told) return;
      told = s;
      if (opts.ownsUrl) {
        history.replaceState(history.state, '', location.pathname + (s ? '?' + s : '') + location.hash);
      }
      if (opts.changed) opts.changed(s);
    }

    function renderTabs() {
      var focusIn = el.list.contains(document.activeElement);
      el.list.innerHTML = tabs.map(function (t, i) {
        var on = i === active;
        return '<button type="button" role="tab" id="' + id + '-tab-' + t.k + '" data-k="' + t.k + '"' +
          ' aria-controls="' + id + '-panel" aria-selected="' + on + '" tabindex="' + (on ? '0' : '-1') + '"' +
          ' title="' + esc(t.path) + '">' + esc(t.name) +
          (dirty(t) ? '<span class="doc-tab-dirty">unsaved</span>' : '') +
          '<span class="doc-tab-close" aria-hidden="true"></span></button>';
      }).join('');
      var t = current();
      el.panel.hidden = !t;
      el.empty.hidden = !!t;
      el.save.disabled = !t;
      if (t) {
        el.panel.setAttribute('aria-labelledby', id + '-tab-' + t.k);
        el.text.setAttribute('aria-label', 'Text of ' + t.name);
      }
      if (focusIn) {
        var sel = el.list.querySelector('[aria-selected="true"]');
        if (sel) sel.focus();
      }
    }

    /* Shows tab i, keeping the text and caret of the one it replaces. */
    function activate(i) {
      var prev = current();
      if (prev) { prev.start = el.text.selectionStart; prev.end = el.text.selectionEnd; }
      active = i;
      var t = current();
      el.text.value = t ? t.text : '';
      if (t) el.text.setSelectionRange(t.start || 0, t.end || 0);
      renderTabs();
      announce();
    }

    function open(path) {
      if (!store) { say('The files are not available on this page.'); return false; }
      for (var i = 0; i < tabs.length; i++) {
        if (tabs[i].path === path) { activate(i); return true; }
      }
      var text = store.read(path);
      if (text == null) { say('There is no file at ' + path + '.'); return false; }
      tabs.push({ k: ++nextK, path: path, name: nameOf(path), saved: text, text: text, start: 0, end: 0 });
      activate(tabs.length - 1);
      say('');
      return true;
    }

    function close(i) {
      if (!tabs[i]) return;
      var cur = current();
      if (cur && i !== active) { cur.start = el.text.selectionStart; cur.end = el.text.selectionEnd; }
      tabs.splice(i, 1);
      var next = i < active ? active - 1 : i === active ? Math.min(i, tabs.length - 1) : active;
      active = -1;              // the closed tab keeps no caret
      activate(next);
    }

    function save() {
      var t = current();
      if (!t || !store) return false;
      t.text = el.text.value;
      if (!store.write(t.path, t.text)) { say(t.name + ' could not be saved.'); return false; }
      t.saved = t.text;
      renderTabs();
      say('Saved ' + t.path + '.');
      return true;
    }

    /* Unsaved changes are never lost without asking, in the applet's own
       dialog; discard() runs only if the reader chooses Discard. */
    function ask(body, discard) {
      el.askBody.textContent = body;
      el.dialog.returnValue = '';
      el.dialog.addEventListener('close', function () {
        if (el.dialog.returnValue === 'discard') discard();
      }, { once: true, signal: off.signal });
      el.dialog.showModal();
    }

    function askToClose(i) {
      var t = tabs[i];
      var fromList = el.list.contains(document.activeElement);
      ask('The changes to ' + t.name + ' have not been saved. Discarding them closes its tab.', function () {
        close(tabs.indexOf(t));
        /* Delete can close one tab after another from the keyboard. */
        var sel = el.list.querySelector('[aria-selected="true"]');
        if (fromList) (sel || el.save).focus();
      });
    }

    /* In a window, closing the window asks the same question for every
       unsaved tab. The window's close is refused while the dialog asks,
       and made again, and let through, if the reader discards. */
    var win = root.closest('.win[data-win]');
    var letClose = false;
    if (win) {
      win.addEventListener('pudl:window-closing', function (e) {
        if (letClose || e.detail.key !== win.getAttribute('data-win')) return;
        var t = current();
        if (t) t.text = el.text.value;
        var unsaved = tabs.filter(dirty);
        if (!unsaved.length) return;
        e.preventDefault();
        if (el.dialog.open) return;
        var names = unsaved.map(function (x) { return x.name; }).join(', ');
        ask('The changes to ' + names + ' have not been saved. Discarding them closes the editor.', function () {
          letClose = true;
          window.pudlWindows.close(win.getAttribute('data-win'));
          letClose = false;
        });
      }, on);
    }

    el.list.addEventListener('pudl:tab-close', function (e) {
      var k = +e.target.getAttribute('data-k');
      var i = tabs.findIndex(function (t) { return t.k === k; });
      if (i < 0) return;
      if (i === active) tabs[i].text = el.text.value;
      if (dirty(tabs[i])) askToClose(i); else close(i);
    }, on);

    el.list.addEventListener('click', function (e) {
      var b = e.target.closest('[role="tab"]');
      if (!b) return;
      var k = +b.getAttribute('data-k');
      var i = tabs.findIndex(function (t) { return t.k === k; });
      if (i >= 0 && i !== active) activate(i);
    }, on);

    el.text.addEventListener('input', function () {
      var t = current();
      if (!t) return;
      var was = dirty(t);
      t.text = el.text.value;
      if (dirty(t) !== was) { renderTabs(); say(''); }
    }, on);

    el.save.addEventListener('click', save, on);
    root.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        save();
      }
    }, on);

    /* A file saved somewhere else, in another tab of the browser, reaches
       a tab here that has no unsaved changes of its own. */
    document.addEventListener('files:change', function (e) {
      var p = e.detail && e.detail.path;
      tabs.forEach(function (t, i) {
        if ((p && p !== t.path) || dirty(t)) return;
        var now = store.read(t.path);
        if (now == null || now === t.saved) return;
        t.saved = t.text = now;
        if (i === active) el.text.value = now;
      });
    }, on);

    renderTabs();
    var first = fileFrom(opts.state) || (opts.ownsUrl ? fileFrom(location.search) : null);
    if (first) open(first);

    return {
      state: function () { var t = current(); return t ? stateOf(t.path) : null; },
      setState: function (s) { var f = fileFrom(s); if (f) open(f); },
      destroy: function () {
        off.abort();
        if (el.dialog.open) el.dialog.close();
      }
    };
  }

  pudlApplets.register('editor', { init: init });
})();
