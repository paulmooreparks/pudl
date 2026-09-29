/* The Files sample's preview: a PUDL applet that shows a Markdown file as
   it reads, flat and read-only. It understands headings, paragraphs, lists,
   inline code, bold, italics, web links and fenced code blocks, which is
   enough for the sample's notes and articles and no more.

   Its state is the file it shows, file=/articles/elevation.md, kept in the
   address on its own page and reported through opts.changed elsewhere. It
   follows the file as it is saved. In a window it also puts the file's
   name in the window's title, so two previews can be told apart in the
   dock. */
(function () {
  'use strict';

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

  /* Inline marks within one escaped line. Code spans are cut out first,
     so nothing inside them is taken for a mark. */
  function inline(text) {
    return String(text).split(/(`[^`]+`)/).map(function (part, i) {
      if (i % 2) return '<code>' + esc(part.slice(1, -1)) + '</code>';
      return esc(part)
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener">$1</a>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
    }).join('');
  }

  /* Whole-line comments in a code block take the comment colour through
     PUDL's highlight.js classes; the rest stays plain. */
  function code(lines, lang) {
    var mark = /^(sh|bash|shell)$/i.test(lang) ? /^\s*#/ : /^(js|javascript|css)$/i.test(lang) ? /^\s*(\/\/|\/\*)/ : null;
    return lines.map(function (l) {
      return mark && mark.test(l) ? '<span class="hljs-comment">' + esc(l) + '</span>' : esc(l);
    }).join('\n');
  }

  function render(md) {
    var lines = String(md).replace(/\r\n?/g, '\n').split('\n');
    var out = [], para = [], list = null;
    function flush() {
      if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; }
      if (list) { out.push('<' + list.tag + '>' + list.items.map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + '</' + list.tag + '>'); list = null; }
    }
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i], m;
      if ((m = /^```\s*([\w-]*)\s*$/.exec(l))) {
        flush();
        var body = [];
        for (i++; i < lines.length && !/^```\s*$/.test(lines[i]); i++) body.push(lines[i]);
        /* A long line scrolls the block sideways, so the block is a tab
           stop, for a reader who scrolls with the keyboard. */
        out.push('<pre class="code" data-code-actions tabindex="0"><code' + (m[1] ? ' class="language-' + esc(m[1]) + '"' : '') + '>' + code(body, m[1]) + '</code></pre>');
      } else if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) {
        flush();
        var level = Math.min(6, m[1].length + 2);   // the window's title is the h2
        out.push('<h' + level + '>' + inline(m[2]) + '</h' + level + '>');
      } else if ((m = /^\s*([-*]|\d+\.)\s+(.*)$/.exec(l))) {
        var tag = /\d/.test(m[1]) ? 'ol' : 'ul';
        if (para.length || (list && list.tag !== tag)) flush();
        if (!list) list = { tag: tag, items: [] };
        list.items.push(m[2]);
      } else if (!l.trim()) {
        flush();
      } else {
        if (list) flush();
        para.push(l.trim());
      }
    }
    flush();
    return out.join('\n');
  }

  function init(root, opts) {
    var off = new AbortController();
    var store = window.filesStore;
    var path = null;
    /* In a window, the window's own title, "Preview 2" say, which the
       file's name is added to. */
    var win = root.closest('.win[data-win]');
    var key = win && win.getAttribute('data-win');
    var title = win && win.querySelector('.win-title');
    var base = title ? title.textContent.trim() : '';

    root.textContent = '';
    root.classList.add('files-preview');

    function show(p) {
      path = p;
      var text = store && p ? store.read(p) : null;
      if (text == null) {
        root.innerHTML = '<div class="empty-state"><p class="empty-state-title">' +
          (p ? 'There is no file at ' + esc(p) : 'No file to preview') + '</p>' +
          '<p class="empty-state-body">Choose a Markdown file in the list of files and press Preview.</p></div>';
      } else {
        root.innerHTML = '<p class="files-preview-path"><code>' + esc(p) + '</code></p>' +
          '<article class="files-preview-doc">' + render(text) + '</article>';
        /* Its code blocks gain Copy and Download, a download named by the
           block's language. */
        if (window.pudlCode) window.pudlCode.enhance(root);
      }
      if (key && window.pudlWindows) window.pudlWindows.retitle(key, p ? base + ': ' + nameOf(p) : base);
      var s = p ? stateOf(p) : null;
      if (opts.ownsUrl) history.replaceState(history.state, '', location.pathname + (s ? '?' + s : '') + location.hash);
      if (opts.changed) opts.changed(s);
    }

    document.addEventListener('files:change', function (e) {
      var p = e.detail && e.detail.path;
      if (path && (!p || p === path)) show(path);
    }, { signal: off.signal });

    show(fileFrom(opts.state) || (opts.ownsUrl ? fileFrom(location.search) : null));

    return {
      state: function () { return path ? stateOf(path) : null; },
      setState: function (s) { var f = fileFrom(s); if (f) show(f); },
      destroy: function () { off.abort(); }
    };
  }

  pudlApplets.register('preview', { init: init });
})();
