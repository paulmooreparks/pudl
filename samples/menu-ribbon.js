/* The applets of menu-ribbon.html: an editor, a reader and notes, each
   giving the menu bar its menus through menus(). Their commands carry
   glyphs, and the well-known ones say glyphOnly, so the same menus unfold
   into a ribbon. Each shows the last command it ran. */
(function () {
  'use strict';
  function said(root, words) {
    var s = root.querySelector('.applet-status');
    if (s) s.innerHTML = 'Last command: <b>' + words + '</b>';
  }
  function refresh() { if (window.pudlMenubar) window.pudlMenubar.refresh(); }

  pudlApplets.define('editor', {});
  pudlApplets.register('editor', {
    init: function (root) {
      root.innerHTML = '<div class="applet-pad"><textarea class="form-textarea" aria-label="Text">Unfold the menus with Show as ribbon, at the far right of the top bar.\n\nThe Editor\'s File, Edit, Insert, Format and View menus become tabs where they stand, and each tab\'s row of tools appears under the bar.</textarea><p class="applet-status">Last command: none</p></div>';
      var s = { bold: false, italic: false, code: false, style: 'normal', view: 'edit', wrap: true };
      var run = function (words, fn) { return function () { if (fn) fn(); said(root, words); refresh(); }; };
      return {
        menus: function () {
          return { titles: [
            { label: 'Editor', glyph: 'pencil', items: [
              { label: 'About the Editor', run: run('About') }] },
            { label: 'File', items: [
              { label: 'New', glyph: 'file', run: run('New') },
              { label: 'Open…', glyph: 'folder', shortcut: 'Mod+O', bind: false, run: run('Open') },
              { label: 'Save', glyph: 'download', shortcut: 'Mod+S', run: run('Save') },
              '-',
              { label: 'Export', items: [
                { label: 'PDF', run: run('Export as PDF') },
                { label: 'HTML', run: run('Export as HTML') }] },
              '-',
              { label: 'Close document', run: run('Close document'), danger: true }] },
            { label: 'Edit', items: [
              { heading: 'History' },
              { label: 'Undo', glyph: 'back', glyphOnly: true, shortcut: 'Mod+Z', bind: false, run: run('Undo') },
              { label: 'Redo', glyph: 'forward', glyphOnly: true, shortcut: 'Mod+Y', bind: false, run: run('Redo') },
              { heading: 'Clipboard' },
              { label: 'Cut', glyph: 'strike', run: run('Cut') },
              { label: 'Copy', glyph: 'copy', glyphOnly: true, run: run('Copy') },
              { label: 'Paste', glyph: 'clip', run: run('Paste') },
              { heading: 'Find' },
              { label: 'Find…', glyph: 'search', shortcut: 'Mod+F', bind: false, run: run('Find') }] },
            { label: 'Insert', items: [
              { label: 'Table', glyph: 'table', run: run('Insert a table') },
              { label: 'Picture', glyph: 'image', run: run('Insert a picture') },
              { label: 'Link', glyph: 'link', glyphOnly: true, run: run('Insert a link') },
              { label: 'Code block', glyph: 'code', run: run('Insert a code block') }] },
            { label: 'Format', items: [
              { heading: 'Text' },
              { label: 'Bold', glyph: 'bold', glyphOnly: true, checked: s.bold, shortcut: 'Mod+B', bind: false, run: run('Bold', function () { s.bold = !s.bold; }) },
              { label: 'Italic', glyph: 'italic', glyphOnly: true, checked: s.italic, shortcut: 'Mod+I', bind: false, run: run('Italic', function () { s.italic = !s.italic; }) },
              { label: 'Code', glyph: 'code', glyphOnly: true, checked: s.code, run: run('Code', function () { s.code = !s.code; }) },
              { heading: 'Paragraph' },
              { label: 'Normal', radio: 'style', checked: s.style === 'normal', run: run('Normal', function () { s.style = 'normal'; }) },
              { label: 'Heading 1', radio: 'style', checked: s.style === 'h1', run: run('Heading 1', function () { s.style = 'h1'; }) },
              { label: 'Heading 2', radio: 'style', checked: s.style === 'h2', run: run('Heading 2', function () { s.style = 'h2'; }) },
              { heading: 'Lists' },
              { label: 'Bulleted list', glyph: 'list', glyphOnly: true, run: run('Bulleted list') },
              { label: 'Numbered list', glyph: 'list-numbered', glyphOnly: true, run: run('Numbered list') }] }
          ],
          /* View is the site's, and the Editor adds to it, as an applet
             may add to a shared title. */
          into: { view: [
            { label: 'Edit', radio: 'view', checked: s.view === 'edit', run: run('Edit', function () { s.view = 'edit'; }) },
            { label: 'Preview', radio: 'view', checked: s.view === 'preview', run: run('Preview', function () { s.view = 'preview'; }) },
            { label: 'Split', radio: 'view', checked: s.view === 'split', run: run('Split', function () { s.view = 'split'; }) },
            '-',
            { label: 'Word wrap', checked: s.wrap, run: run('Word wrap', function () { s.wrap = !s.wrap; }) }] } };
        },
        destroy: function () {}
      };
    }
  });

  pudlApplets.define('reader', {});
  pudlApplets.register('reader', {
    init: function (root) {
      var stories = ['A field guide to menu bars', 'Ribbons, twenty years on', 'Why toolbars fold'];
      var s = { list: 'top', pinned: false };
      root.innerHTML = '<div class="applet-pad"><ul class="story-list"></ul><p class="applet-status">Last command: none</p></div>';
      function draw() {
        root.querySelector('.story-list').innerHTML = stories.map(function (t, i) { return '<li' + (i === 0 && s.pinned ? ' class="pinned"' : '') + '>' + t + '</li>'; }).join('');
      }
      draw();
      var run = function (words, fn) { return function () { if (fn) fn(); draw(); said(root, words); refresh(); }; };
      return {
        menus: function () {
          return { titles: [
            { label: 'Reader', glyph: 'list', items: [{ label: 'About the Reader', run: run('About') }] },
            { label: 'Feed', items: [
              { label: 'Refresh', glyph: 'reload',shortcut: 'F5', bind: false, run: run('Refresh') },
              { heading: 'Show' },
              { label: 'Top', radio: 'list', checked: s.list === 'top', run: run('Top', function () { s.list = 'top'; }) },
              { label: 'New', radio: 'list', checked: s.list === 'new', run: run('New', function () { s.list = 'new'; }) },
              { label: 'Best', radio: 'list', checked: s.list === 'best', run: run('Best', function () { s.list = 'best'; }) }] },
            { label: 'Story', items: [
              { heading: 'Keep' },
              { label: 'Pin this story', glyph: 'pin', checked: s.pinned, run: run('Pin this story', function () { s.pinned = !s.pinned; }) },
              { label: 'Add a note…', glyph: 'pencil', run: run('Add a note') },
              { heading: 'Open' },
              { label: 'Open the original', glyph: 'forward', run: run('Open the original') },
              { label: 'Open in a new window', glyph: 'new-window', run: run('Open in a new window') },
              '-',
              { label: 'Hide this story', danger: true, run: run('Hide this story') }] }
          ] };
        },
        destroy: function () {}
      };
    }
  });

  /* Pins, a resident applet: its root is the pins command bar the server
     drew, which it leaves as it is, and its Pins menu stays in the menu
     bar whatever is in front. Pin this window adds the front window's
     button to the bar, or takes it away. */
  pudlApplets.define('pins', {});
  pudlApplets.register('pins', {
    init: function (root) {
      var group = root.querySelector('.toolbar-group');
      function front() {
        var st = window.pudlWindows && window.pudlWindows.state();
        var key = st && st.top && !st.min[st.top] ? st.top : null;
        var win = key && document.querySelector('.win[data-win="' + key + '"]');
        return win ? { key: key, title: win.querySelector('.win-title').textContent.trim() } : null;
      }
      function pinOf(key) { return group.querySelector('a[data-win-open="' + key + '"]'); }
      return {
        menus: function () {
          var f = front();
          return { titles: [
            { label: 'Pins', glyph: 'pin', items: [
              { label: 'Pin this window', glyph: 'pin', checked: !!(f && pinOf(f.key)), disabled: !f, run: function () {
                var f = front();
                if (!f) return;
                var a = pinOf(f.key);
                if (a) a.remove();
                else {
                  a = document.createElement('a');
                  a.className = 'btn btn-sm';
                  a.href = '?open=' + f.key;
                  a.setAttribute('data-win-open', f.key);
                  a.innerHTML = '<span class="glyph" style="--glyph: var(--glyph-window)" aria-hidden="true"></span><span class="toolbar-words"></span>';
                  a.lastChild.textContent = f.title;
                  group.appendChild(a);
                }
                refresh();
              } },
              '-',
              { label: 'Manage pins', glyph: 'gear', run: function () {} }] }
          ] };
        },
        destroy: function () {}
      };
    }
  });

  pudlApplets.define('notes', {});
  pudlApplets.register('notes', {
    init: function (root) {
      var s = { dates: true };
      root.innerHTML = '<div class="applet-pad"><textarea class="form-textarea" aria-label="Note">A note.</textarea><p class="applet-status">Last command: none</p></div>';
      var run = function (words, fn) { return function () { if (fn) fn(); said(root, words); refresh(); }; };
      return {
        menus: function () {
          return { titles: [
            { label: 'Notes', glyph: 'document', items: [{ label: 'About Notes', run: run('About') }] },
            { label: 'Note', items: [
              { label: 'New note', glyph: 'plus', run: run('New note') },
              { label: 'Show dates', checked: s.dates, run: run('Show dates', function () { s.dates = !s.dates; }) },
              '-',
              { label: 'Delete note', danger: true, run: run('Delete note') }] }
          ] };
        },
        destroy: function () {}
      };
    }
  });
})();
