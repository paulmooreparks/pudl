/* PUDL toolbars. Load with defer.

   A toolbar is a row of groups of raised controls, as a page editor's is:

     <div class="toolbar" role="toolbar" aria-label="Formatting">
       <div class="toolbar-group" role="group" aria-label="Text">
         <button type="button" class="icon-btn" aria-label="Bold" aria-pressed="false">…</button>
         …
       </div>
       <div class="toolbar-group" role="group" aria-label="Table">
         <div class="menu"><button type="button" class="icon-btn menu-btn" popovertarget="…" aria-label="Table">…</button>
           <div class="menu-panel" id="…" popover>…</div></div>
       </div>
     </div>

   The toolbar is one stop in the Tab order, on the last control used or
   the first: Left and Right move along its enabled controls, Home and End
   to its ends, and Tab leaves. A control in the state the cursor is in
   carries aria-pressed="true" and is drawn pressed in. A menu button whose
   every row is disabled is disabled with them, and enabled again when a
   row is; the script watches the rows. pudlToolbar.enhance(root) takes in
   toolbars a host has added. */
(function () {
  'use strict';

  function controls(bar) {
    return Array.prototype.filter.call(bar.querySelectorAll('button, a[href], input, select'), function (c) {
      return !c.closest('.menu-panel') && !c.disabled && c.getAttribute('aria-disabled') !== 'true' && c.getClientRects().length > 0;
    });
  }

  function stop(bar, on) {
    var all = Array.prototype.filter.call(bar.querySelectorAll('button, a[href], input, select'), function (c) { return !c.closest('.menu-panel'); });
    var live = controls(bar);
    if (!live.length) return;
    if (!on || live.indexOf(on) < 0) on = live.filter(function (c) { return c.tabIndex === 0; })[0] || live[0];
    all.forEach(function (c) { c.tabIndex = c === on ? 0 : -1; });
  }

  /* A menu button is disabled while its rows all are. */
  function menus(bar) {
    bar.querySelectorAll('.menu > .menu-btn[popovertarget]').forEach(function (b) {
      var p = document.getElementById(b.getAttribute('popovertarget'));
      if (!p) return;
      var rows = p.querySelectorAll('.menu-action');
      if (!rows.length) return;
      var any = Array.prototype.some.call(rows, function (r) { return !r.disabled && r.getAttribute('aria-disabled') !== 'true'; });
      /* Set only on a change: setting it again would be a mutation the
         observer below answers, without end. */
      if (b.disabled === any) b.disabled = !any;
    });
  }

  function enhance(root) {
    (root || document).querySelectorAll('.toolbar').forEach(function (bar) {
      if (!bar.hasAttribute('role')) bar.setAttribute('role', 'toolbar');
      menus(bar);
      stop(bar, null);
      if (bar.__ready) return;
      bar.__ready = true;
      bar.addEventListener('keydown', function (e) {
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        if (e.target.closest('.menu-panel')) return;
        var list = controls(bar), i = list.indexOf(e.target.closest('button, a[href], input, select')), next;
        if (i < 0) return;
        var rtl = getComputedStyle(bar).direction === 'rtl';
        if (e.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) next = list[(i + 1) % list.length];
        else if (e.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) next = list[(i + list.length - 1) % list.length];
        else if (e.key === 'Home') next = list[0];
        else if (e.key === 'End') next = list[list.length - 1];
        else return;
        e.preventDefault();
        stop(bar, next);
        next.focus();
      });
      bar.addEventListener('focusin', function (e) {
        var c = e.target.closest('button, a[href], input, select');
        if (c && !c.closest('.menu-panel')) stop(bar, c);
      });
      new MutationObserver(function () { menus(bar); stop(bar, null); })
        .observe(bar, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled', 'aria-disabled', 'hidden'] });
    });
  }

  /* === Folding (preview, docs/proposals/toolbar-commands.md) ==============
     A toolbar marked data-toolbar-fold keeps to one row. Each group may
     carry data-toolbar-group, its name, shown before its controls;
     data-toolbar-glyph, its glyph; data-toolbar-priority, a number, higher
     kept open longer; and data-toolbar-end, which keeps it at the row's
     end and folds it last. As room runs out each group passes, one step
     at a time, through five stages, which data-toolbar-stage says:
       1  its name, then each control with its glyph and words
       2  its name, then each control as its glyph alone
       3  one menu button with its glyph and name, whose menu holds the
          group's commands
       4  that menu button with its glyph alone
       5  a section of the More menu at the row's end
     Every group reaches stage 2 before any reaches 3, then lower
     priorities and the groups furthest along fold first. As the row
     widens the same steps run back. Nothing is lost by folding: the
     group's menu holds every command, ticked, as radio rows or under a
     heading as each needs. */
  var foldUid = 0;

  function el(tag, cls, attrs) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }

  function foldGlyph(name) {
    var g = el('span', 'glyph', { 'aria-hidden': 'true' });
    g.style.setProperty('--glyph', 'var(--glyph-' + name + ')');
    return g;
  }

  function foldMenu(cls, glyph, words) {
    var wrap = el('div', 'menu ' + cls);
    var id = 'pudl-fold-' + (++foldUid);
    var b = el('button', 'btn btn-sm menu-btn', { type: 'button', popovertarget: id, 'aria-label': words });
    if (glyph) b.appendChild(foldGlyph(glyph));
    var w = el('span', 'toolbar-words');
    w.textContent = words;
    b.appendChild(w);
    var panel = el('div', 'menu-panel', { id: id, popover: '' });
    wrap.append(b, panel);
    return { wrap: wrap, panel: panel };
  }

  function nameOf(group) {
    return group.getAttribute('data-toolbar-group') || group.getAttribute('aria-label') || '';
  }

  /* A group's commands as menu rows: a command's own row where a control
     names one, else a row that presses the control. */
  function groupRows(group, panel) {
    var C = window.pudlCommands;
    var parts = Array.prototype.filter.call(group.children, function (c) {
      return !c.classList.contains('toolbar-label') && !c.classList.contains('toolbar-fold') && !c.hidden;
    });
    /* A group of one menu is that menu: its rows need no heading of their
       own under the group's. */
    var heading = parts.length === 1 ? function () {} : headingIn;
    parts.forEach(function (c) {
      if (c.matches('.seg, [data-command-choice]')) {
        heading(panel, c.getAttribute('aria-label'));
        c.querySelectorAll('button').forEach(function (b) { panel.appendChild(proxyRow(b, true)); });
        return;
      }
      var btn = c.matches('button, a') ? c : c.querySelector(':scope > button, :scope > a');
      if (!btn) return;
      var id = btn.getAttribute('data-command');
      var cmd = id && C ? C.find(id, btn) : null;
      if (cmd && C.value(cmd, 'items')) {
        heading(panel, C.value(cmd, 'label'));
        var items = (C.value(cmd, 'items') || []).map(function (x) { return typeof x === 'string' && x !== '-' ? C.find(x, btn) : x; }).filter(Boolean);
        C.rows(panel, items, btn);
      } else if (cmd) C.rows(panel, [cmd], btn);
      else if (btn.matches('.menu-btn') && btn.getAttribute('popovertarget')) {
        var inner = document.getElementById(btn.getAttribute('popovertarget'));
        heading(panel, btn.getAttribute('aria-label') || btn.textContent.trim());
        if (inner) inner.querySelectorAll('.menu-action').forEach(function (r) { panel.appendChild(proxyRow(r, false)); });
      } else panel.appendChild(proxyRow(btn, false));
    });
  }

  function headingIn(panel, text) {
    if (!text) return;
    var h = el('div', 'md-section-label');
    h.textContent = text;
    panel.appendChild(h);
  }

  function proxyRow(ctl, radio) {
    var r = el('button', 'menu-action', { type: 'button' });
    var pressed = ctl.getAttribute('aria-pressed');
    if (pressed != null) {
      r.setAttribute('role', radio ? 'menuitemradio' : 'menuitemcheckbox');
      r.setAttribute('aria-pressed', pressed);
      r.setAttribute('aria-checked', pressed);
    } else {
      var g = ctl.querySelector('.glyph');
      if (g) r.appendChild(g.cloneNode(true));
    }
    var w = el('span', 'menu-words');
    w.textContent = ctl.getAttribute('aria-label') || ctl.textContent.trim();
    r.appendChild(w);
    if (ctl.disabled || ctl.getAttribute('aria-disabled') === 'true') r.setAttribute('aria-disabled', 'true');
    r.addEventListener('click', function () {
      if (r.getAttribute('aria-disabled') === 'true') return;
      var p = r.closest('[popover]');
      if (p && p.hidePopover) p.hidePopover();
      ctl.click();
    });
    return r;
  }

  function setupFold(bar) {
    if (bar.__fold) return bar.__fold;
    var groups = Array.prototype.filter.call(bar.children, function (g) { return g.classList.contains('toolbar-group'); });
    groups.forEach(function (g) {
      var name = nameOf(g), glyph = g.getAttribute('data-toolbar-glyph');
      if (!g.hasAttribute('role')) g.setAttribute('role', 'group');
      if (name && !g.hasAttribute('aria-label')) g.setAttribute('aria-label', name);
      if (g.hasAttribute('data-toolbar-group') && !g.querySelector(':scope > .toolbar-label')) {
        var label = el('span', 'toolbar-label', { 'aria-hidden': 'true' });
        label.textContent = name;
        g.insertBefore(label, g.firstChild);
      }
      var fold = foldMenu('toolbar-fold', glyph, name || 'More');
      g.appendChild(fold.wrap);
      fold.panel.addEventListener('beforetoggle', function (e) {
        if (e.newState !== 'open') return;
        fold.panel.textContent = '';
        groupRows(g, fold.panel);
      });
    });
    var more = foldMenu('toolbar-more', null, bar.getAttribute('data-toolbar-more-text') || 'More');
    bar.appendChild(more.wrap);
    more.panel.addEventListener('beforetoggle', function (e) {
      if (e.newState !== 'open') return;
      more.panel.textContent = '';
      groups.forEach(function (g) {
        if (g.getAttribute('data-toolbar-stage') !== '5') return;
        headingIn(more.panel, nameOf(g));
        groupRows(g, more.panel);
      });
    });
    bar.__fold = { groups: groups };
    var pending = 0;
    var again = function () { if (!pending) pending = requestAnimationFrame(function () { pending = 0; fit(bar); }); };
    if (window.ResizeObserver) new ResizeObserver(again).observe(bar);
    document.addEventListener('pudl:commands-change', again);
    fit(bar);
    return bar.__fold;
  }

  /* The order groups fold in: those at the end last, then lower priority
     first, then the one furthest along the row. */
  function foldOrder(groups) {
    return groups.map(function (g, i) { return { g: g, i: i, p: Number(g.getAttribute('data-toolbar-priority')) || 0, end: g.hasAttribute('data-toolbar-end') }; })
      .sort(function (a, b) { return (a.end - b.end) || (a.p - b.p) || (b.i - a.i); })
      .map(function (x) { return x.g; });
  }

  function fits(bar) { return bar.scrollWidth <= bar.clientWidth + 1; }

  function fit(bar) {
    var f = bar.__fold;
    if (!f || !bar.isConnected || !bar.clientWidth) return;
    if (bar.querySelector('.menu-panel:popover-open')) return;
    f.groups.forEach(function (g) { g.setAttribute('data-toolbar-stage', '1'); });
    bar.removeAttribute('data-toolbar-more');
    if (fits(bar)) return;
    var order = foldOrder(f.groups.filter(function (g) { return !g.hidden && g.getClientRects().length; }));
    for (var stage = 2; stage <= 5; stage++) {
      for (var i = 0; i < order.length; i++) {
        var g = order[i];
        if (stage === 4 && !g.getAttribute('data-toolbar-glyph')) continue;
        g.setAttribute('data-toolbar-stage', String(stage));
        if (stage === 5) bar.setAttribute('data-toolbar-more', '');
        if (fits(bar)) return;
      }
    }
  }

  function enhanceFolds(root) {
    (root || document).querySelectorAll('.toolbar[data-toolbar-fold]').forEach(setupFold);
  }

  window.pudlToolbar = { enhance: function (root) { enhance(root); enhanceFolds(root); }, fit: fit };
  new MutationObserver(function () { enhanceFolds(); }).observe(document.documentElement, { subtree: true, childList: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { enhanceFolds(); }); else enhanceFolds();
  new MutationObserver(function () { enhance(); }).observe(document.documentElement, { subtree: true, childList: true });
  document.addEventListener('pudl:regions-swap', function () { enhance(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { enhance(); }); else enhance();
})();
