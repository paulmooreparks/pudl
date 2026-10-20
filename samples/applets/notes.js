/* Notes, a sample applet for PUDL's commands and folding toolbars
   (docs/proposals/toolbar-commands.md). It is a small Markdown note
   editor. Every command is declared once in commandTable(), with its
   words, glyph, key and state; toolbars() lays the commands out in named
   groups; and PUDL draws the toolbar, folds it as the room runs out,
   answers the keys and lets an agent list and run the same commands. */
(function () {
  'use strict';

  var START = '# Shopping\n\nThings to buy **before Friday**:\n\n- Coffee\n- Bread\n- A *good* notebook\n\n> Remember the receipts.\n';

  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* Enough Markdown for a preview: headings, lists, quotes, bold, italic
     and code. */
  function render(text) {
    var inline = function (s) {
      return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
    };
    var out = [], list = null;
    text.split('\n').forEach(function (line) {
      var m;
      if ((m = /^(- |\d+\. )(.*)$/.exec(line))) {
        var kind = m[1] === '- ' ? 'ul' : 'ol';
        if (list !== kind) { if (list) out.push('</' + list + '>'); out.push('<' + kind + '>'); list = kind; }
        out.push('<li>' + inline(m[2]) + '</li>');
        return;
      }
      if (list) { out.push('</' + list + '>'); list = null; }
      if ((m = /^(#{1,3}) (.*)$/.exec(line))) out.push('<h' + (m[1].length + 1) + '>' + inline(m[2]) + '</h' + (m[1].length + 1) + '>');
      else if ((m = /^> ?(.*)$/.exec(line))) out.push('<blockquote>' + inline(m[1]) + '</blockquote>');
      else if (/^---$/.test(line)) out.push('<hr>');
      else if (line.trim()) out.push('<p>' + inline(line) + '</p>');
    });
    if (list) out.push('</' + list + '>');
    return out.join('');
  }

  function init(root, opts) {
    root.innerHTML =
      '<div class="notes" data-view="split">' +
        '<div class="notes-panes">' +
          '<textarea class="form-input notes-text" spellcheck="false" aria-label="Note"></textarea>' +
          '<div class="notes-preview" aria-label="Preview"></div>' +
          '<aside class="notes-comments" aria-label="Comments"></aside>' +
        '</div>' +
        '<p class="notes-status" role="status"></p>' +
      '</div>';
    var box = root.querySelector('.notes'), ta = root.querySelector('textarea'), preview = root.querySelector('.notes-preview');
    var commentsEl = root.querySelector('.notes-comments'), status = root.querySelector('.notes-status');
    var saved = START, view = 'split', wrap = true, shown = 'open', current = -1;
    var comments = [{ line: 2, text: 'Is Friday right?', resolved: false }, { line: 6, text: 'Which brand?', resolved: true }];
    ta.value = START;

    function changed() { opts.commandsChanged(); }
    function say(t) { status.textContent = t; }
    function dirty() { return ta.value !== saved; }

    /* The line the cursor is on, and its start and end. */
    function lineAt() {
      var v = ta.value, s = ta.selectionStart;
      var start = v.lastIndexOf('\n', s - 1) + 1, end = v.indexOf('\n', s);
      if (end < 0) end = v.length;
      return { start: start, end: end, text: v.slice(start, end), number: v.slice(0, start).split('\n').length - 1 };
    }
    function setLine(text) {
      var l = lineAt();
      ta.setRangeText(text, l.start, l.end, 'end');
      update();
    }
    /* Whether the selection sits inside a pair of markers, such as **. */
    function inside(mark) {
      var l = lineAt(), before = l.text.slice(0, ta.selectionStart - l.start);
      if (mark === '*') before = before.replace(/\*\*/g, '');
      return before.split(mark).length % 2 === 0;
    }
    function wrapWith(mark) {
      var a = ta.selectionStart, b = ta.selectionEnd, sel = ta.value.slice(a, b);
      if (sel.startsWith(mark) && sel.endsWith(mark) && sel.length >= mark.length * 2) ta.setRangeText(sel.slice(mark.length, -mark.length), a, b, 'select');
      else ta.setRangeText(mark + (sel || 'text') + mark, a, b, 'select');
      ta.focus();
      update();
    }
    function prefix(p, re) {
      var l = lineAt();
      setLine(re.test(l.text) ? l.text.replace(re, '') : p + l.text.replace(/^(#{1,3} |- |\d+\. |> )/, ''));
    }
    function style() {
      var m = /^(#{1,3}) /.exec(lineAt().text);
      return m ? 'h' + m[1].length : 'paragraph';
    }
    function setStyle(s) {
      var t = lineAt().text.replace(/^#{1,3} /, '');
      setLine(s === 'paragraph' ? t : '#'.repeat(+s.slice(1)) + ' ' + t);
    }
    function insert(text) { ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end'); ta.focus(); update(); }

    function visible() { return comments.filter(function (c) { return shown === 'all' || (shown === 'open' && !c.resolved); }); }
    function goComment(step) {
      var list = visible();
      if (!list.length) return;
      var i = list.indexOf(comments[current]);
      i = i < 0 ? (step > 0 ? 0 : list.length - 1) : (i + step + list.length) % list.length;
      current = comments.indexOf(list[i]);
      var lines = ta.value.split('\n'), pos = lines.slice(0, list[i].line).join('\n').length + (list[i].line ? 1 : 0);
      ta.focus();
      ta.setSelectionRange(pos, pos);
      drawComments();
      changed();
    }
    function drawComments() {
      commentsEl.hidden = shown === 'off';
      commentsEl.innerHTML = visible().map(function (c) {
        var i = comments.indexOf(c);
        return '<div class="card notes-comment' + (i === current ? ' current' : '') + '"><div class="notes-comment-line">Line ' + (c.line + 1) +
          (c.resolved ? ' · <span class="badge positive">Resolved</span>' : '') + '</div><div>' + esc(c.text) + '</div></div>';
      }).join('') || '<p class="form-help">No comments to show.</p>';
    }
    function update() {
      preview.innerHTML = render(ta.value);
      box.setAttribute('data-view', view);
      ta.style.whiteSpace = wrap ? 'pre-wrap' : 'pre';
      ta.style.overflowX = wrap ? 'hidden' : 'auto';
      drawComments();
      changed();
    }
    ['input', 'select', 'keyup', 'click', 'focus'].forEach(function (t) { ta.addEventListener(t, t === 'input' ? update : changed); });
    document.addEventListener('selectionchange', changed);

    var openCount = function () { return comments.filter(function (c) { return !c.resolved; }).length; };
    var trailing = function () {
      var out = [];
      ta.value.split('\n').forEach(function (l, i) { if (/[ \t]+$/.test(l)) out.push(i); });
      return out;
    };
    var noComments = function () { return visible().length === 0; };
    var STYLES = { paragraph: 'Paragraph', h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3' };

    var table = [
      { id: 'style', label: 'Paragraph Style', glyph: 'paragraph', current: function () { return STYLES[style()]; },
        items: ['style-paragraph', 'style-h1', 'style-h2', 'style-h3'] },
      { id: 'style-paragraph', label: 'Paragraph', choice: 'style', checked: function () { return style() === 'paragraph'; }, run: function () { setStyle('paragraph'); }, shortcut: 'Mod+Alt+0' },
      { id: 'style-h1', label: 'Heading 1', choice: 'style', checked: function () { return style() === 'h1'; }, run: function () { setStyle('h1'); }, shortcut: 'Mod+Alt+1' },
      { id: 'style-h2', label: 'Heading 2', choice: 'style', checked: function () { return style() === 'h2'; }, run: function () { setStyle('h2'); }, shortcut: 'Mod+Alt+2' },
      { id: 'style-h3', label: 'Heading 3', choice: 'style', checked: function () { return style() === 'h3'; }, run: function () { setStyle('h3'); }, shortcut: 'Mod+Alt+3' },
      { id: 'bold', label: 'Bold', glyph: 'bold', shortcut: 'Mod+B', checked: function () { return inside('**'); }, run: function () { wrapWith('**'); } },
      { id: 'italic', label: 'Italic', glyph: 'italic', shortcut: 'Mod+I', checked: function () { return inside('*'); }, run: function () { wrapWith('*'); } },
      { id: 'code', label: 'Code', glyph: 'code', shortcut: 'Mod+E', checked: function () { return inside('`'); }, run: function () { wrapWith('`'); } },
      { id: 'bullets', label: 'Bulleted List', glyph: 'list', checked: function () { return /^- /.test(lineAt().text); }, run: function () { prefix('- ', /^- /); } },
      { id: 'numbers', label: 'Numbered List', glyph: 'list-numbered', checked: function () { return /^\d+\. /.test(lineAt().text); }, run: function () { prefix('1. ', /^\d+\. /); } },
      { id: 'quote', label: 'Quote', glyph: 'quote', checked: function () { return /^> /.test(lineAt().text); }, run: function () { prefix('> ', /^> /); } },
      { id: 'insert', label: 'Insert', glyph: 'plus', items: ['insert-rule', 'insert-date', 'insert-link'] },
      { id: 'insert-rule', label: 'Horizontal Rule', glyph: 'minus', detail: 'A line across the note, between sections.', run: function () { insert('\n---\n'); } },
      { id: 'insert-date', label: 'Today\'s Date', glyph: 'board', detail: 'As year, month and day.', run: function () { insert(new Date().toISOString().slice(0, 10)); } },
      { id: 'insert-link', label: 'Link…', glyph: 'link', shortcut: 'Mod+K', detail: 'Around the selected words.', run: function () { wrapWith('['); } },
      /* A command that draws its own menu: a grid of symbols, in its own
         menu and in a folded group's. */
      { id: 'insert-symbol', label: 'Insert Symbol', glyph: 'diamond',
        panel: function (box) {
          var grid = document.createElement('div');
          grid.className = 'notes-symbols';
          grid.setAttribute('role', 'group');
          grid.setAttribute('aria-label', 'Symbols');
          ['→', '←', '✓', '✗', '★', '•', '…', '—', '±', '×', '°', '€'].forEach(function (s) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'btn btn-sm';
            b.textContent = s;
            b.setAttribute('aria-label', 'Insert ' + s);
            b.addEventListener('click', function () {
              var p = b.closest('[popover]');
              if (p && p.hidePopover) p.hidePopover();
              insert(s);
            });
            grid.appendChild(b);
          });
          box.appendChild(grid);
        } },
      /* A status shown by tone: the lines that end in spaces, in the
         danger colour while there are any. */
      { id: 'checks', label: 'Checks', glyph: function () { return trailing().length ? null : 'check'; },
        tone: function () { return trailing().length ? 'danger' : 'positive'; },
        badge: function () { return String(trailing().length); },
        detail: 'Lines that end in spaces.',
        run: function () {
          var t = trailing();
          if (!t.length) { say('No line ends in spaces.'); return; }
          var lines = ta.value.split('\n'), pos = lines.slice(0, t[0]).join('\n').length + (t[0] ? 1 : 0) + lines[t[0]].length;
          ta.focus();
          ta.setSelectionRange(pos, pos);
          say('Line ' + (t[0] + 1) + ' ends in spaces.');
        } },
      { id: 'comments-off', label: 'Off', choice: 'comments-shown', choiceLabel: 'Show Comments', checked: function () { return shown === 'off'; }, run: function () { shown = 'off'; update(); } },
      { id: 'comments-open', label: 'Open', choice: 'comments-shown', choiceLabel: 'Show Comments', checked: function () { return shown === 'open'; }, run: function () { shown = 'open'; update(); } },
      { id: 'comments-all', label: 'All', choice: 'comments-shown', choiceLabel: 'Show Comments', checked: function () { return shown === 'all'; }, run: function () { shown = 'all'; update(); } },
      { id: 'new-comment', label: 'New Comment', glyph: 'comments', shortcut: 'Mod+Alt+M', badge: function () { return openCount() + ' open'; },
        run: function () { comments.push({ line: lineAt().number, text: 'A new comment on this line.', resolved: false }); if (shown === 'off') shown = 'open'; current = comments.length - 1; update(); say('Comment added.'); } },
      { id: 'previous-comment', label: 'Previous Comment', glyph: 'arrow-up', disabled: noComments, reason: 'No comments are shown.', run: function () { goComment(-1); } },
      { id: 'next-comment', label: 'Next Comment', glyph: 'arrow-down', disabled: noComments, reason: 'No comments are shown.', run: function () { goComment(1); } },
      { id: 'resolve-comment', label: 'Resolve', glyph: 'tick', disabled: function () { return !comments[current] || comments[current].resolved; },
        reason: 'Go to an open comment first.', action: 'sample.notes/resolve-comment@1', run: function () { comments[current].resolved = true; update(); say('Comment resolved.'); } },
      { id: 'view-edit', label: 'Edit', choice: 'view', choiceLabel: 'View', checked: function () { return view === 'edit'; }, run: function () { view = 'edit'; update(); } },
      { id: 'view-split', label: 'Split', choice: 'view', choiceLabel: 'View', checked: function () { return view === 'split'; }, run: function () { view = 'split'; update(); } },
      { id: 'view-preview', label: 'Preview', choice: 'view', choiceLabel: 'View', checked: function () { return view === 'preview'; }, run: function () { view = 'preview'; update(); } },
      { id: 'wrap', label: 'Word Wrap', glyph: 'size', checked: function () { return wrap; }, shortcut: 'Alt+Z', run: function () { wrap = !wrap; update(); } },
      { id: 'save', label: 'Save', glyph: 'download', shortcut: 'Mod+S', disabled: function () { return !dirty(); }, reason: 'Nothing has changed since it was saved.',
        action: 'sample.notes/save@1', run: function () { saved = ta.value; say('Saved.'); changed(); } },
      /* Two commands that call the note's actions, as any script could: a
         pure one a module answers, and one that asks the person. */
      { id: 'word-count', label: 'Word Count', glyph: 'info', action: 'sample.notes/stats@1',
        run: function () {
          return pudlApplets.run('sample.notes/stats@1', { text: ta.value }, { grant: 'all', owner: { kind: 'person' } }).then(function (o) {
            say(o.words + ' words, ' + o.lines + ' lines, ' + o.headings + (o.headings === 1 ? ' heading.' : ' headings.'));
          });
        } },
      { id: 'name-note', label: 'Name the Note…', glyph: 'pencil', action: 'sample.notes/ask-title@1',
        run: function () {
          var first = /^# (.*)$/.exec(ta.value.split('\n')[0]);
          return pudlApplets.run('sample.notes/ask-title@1', { suggestion: first ? first[1] : '' }, { grant: 'all', owner: { kind: 'person' } }).then(function (o) {
            if (!o.response || !o.response.title) return;
            var lines = ta.value.split('\n');
            if (/^# /.test(lines[0])) lines[0] = '# ' + o.response.title; else lines.unshift('# ' + o.response.title, '');
            ta.value = lines.join('\n');
            update();
          }, function (err) { say(err.message); });
        } },
      { id: 'discard', label: 'Discard Changes', danger: true, disabled: function () { return !dirty(); }, reason: 'Nothing has changed since it was saved.',
        run: function () { ta.value = saved; update(); say('Changes discarded.'); } }
    ];

    /* In Preview there is no text to edit, so the editing commands hide,
       and the groups that hold only them leave the toolbar. */
    ['style', 'bold', 'italic', 'code', 'bullets', 'numbers', 'quote', 'insert', 'insert-symbol'].forEach(function (id) {
      table.filter(function (c) { return c.id === id; })[0].hidden = function () { return view === 'preview'; };
    });

    update();

    /* The actions that read and change the open note are answered here,
       by the running editor, for as long as it runs. */
    var detach = null;
    function attachLive() {
      if (detach || !window.pudlApplets || !pudlApplets.attach) return;
      detach = pudlApplets.attach('sample.notes', {
        'read@1': function () {
          return { output: { text: ta.value, unsaved: dirty(), comments: comments.map(function (c) { return { line: c.line, text: c.text, resolved: c.resolved }; }) } };
        },
        'save@1': function (input, ctx) {
          if (!dirty()) return { output: { saved: false } };
          saved = ta.value;
          say('Saved, by ' + (ctx.owner && ctx.owner.kind || 'a caller') + '.');
          changed();
          return Promise.resolve(ctx.notify && ctx.notify('The note was saved.', 'positive')).then(function () { return { output: { saved: true } }; });
        },
        'resolve-comment@1': function (input) {
          var c = comments.filter(function (x) { return x.line === input.line && !x.resolved; })[0];
          if (!c) return { output: { resolved: false } };
          c.resolved = true;
          update();
          return { output: { resolved: true } };
        }
      });
    }
    attachLive();
    document.addEventListener('pudl:actions-ready', attachLive);

    return {
      commandTable: function () { return table; },
      toolbars: function () {
        return [{ label: 'Note', groups: [
          { label: 'Style', glyph: 'paragraph', priority: 1, items: ['style'] },
          { label: 'Text', glyph: 'bold', priority: 3, items: ['bold', 'italic', 'code'] },
          { label: 'Lists', glyph: 'list', priority: 1, items: ['bullets', 'numbers', 'quote'] },
          { label: 'Insert', glyph: 'plus', priority: 0, items: ['insert', 'insert-symbol'] },
          { label: 'Comments', glyph: 'comments', priority: 2, items: [{ choice: 'comments-shown' }, 'new-comment', 'previous-comment', 'next-comment', 'resolve-comment'] },
          { label: 'View', glyph: 'panel', priority: 1, items: [{ choice: 'view' }, 'wrap'] },
          { label: 'Tools', glyph: 'gear', priority: 0, items: ['checks', 'word-count', 'name-note'] },
          { label: 'File', glyph: 'document', priority: 4, end: true, items: ['save', 'discard'] }
        ] }];
      },
      destroy: function () {
        document.removeEventListener('selectionchange', changed);
        document.removeEventListener('pudl:actions-ready', attachLive);
        if (detach) detach();
      }
    };
  }

  window.pudlApplets.register('notes', { init: init });
})();
