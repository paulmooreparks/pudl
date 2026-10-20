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

  /* The control that is the toolbar's one tab stop. With cheap set, a stop
     that is still enabled and not inside anything hidden is kept as it is
     without measuring every control (0.69.3), since measuring makes the
     browser lay out a page that may still be being built; the full check,
     which also skips controls a fold has put out of sight, runs after a
     fold and as focus or the arrow keys move. A tab index is written only
     when it changes. */
  /* Whether a fold leaves a control in sight, read from the stages rather
     than measured: a folded group shows only its fold button, an open one
     everything but, and a group in More shows nothing. */
  function inSight(c, bar) {
    if (c.disabled || c.getAttribute('aria-disabled') === 'true' || c.closest('[hidden]')) return false;
    if (c.closest('.toolbar-more')) return bar.hasAttribute('data-toolbar-more');
    var g = c.closest('.toolbar-group'), st = g ? Number(g.getAttribute('data-toolbar-stage')) || 1 : 1;
    if (st >= 5) return false;
    return !!c.closest('.toolbar-fold') === (st >= 3);
  }

  function stop(bar, on, cheap) {
    var all = Array.prototype.filter.call(bar.querySelectorAll('button, a[href], input, select'), function (c) { return !c.closest('.menu-panel'); });
    if (cheap && !on) {
      /* New controls are tab stops until told otherwise, so of those that
         are, the first in sight is kept, without measuring. */
      var keep = all.filter(function (c) { return c.tabIndex === 0 && inSight(c, bar); })[0];
      /* With none, the first control in sight stands in now, and the full
         check runs in the next frame, when the page is laid out anyway. */
      if (!keep) {
        keep = all.filter(function (c) { return inSight(c, bar); })[0];
        if (keep && !bar.__stopCheck) {
          bar.__stopCheck = true;
          requestAnimationFrame(function () { bar.__stopCheck = false; if (!bar.contains(document.activeElement)) stop(bar, null); });
        }
      }
      if (keep) {
        all.forEach(function (c) { var t = c === keep ? 0 : -1; if (c.tabIndex !== t) c.tabIndex = t; });
        return;
      }
    }
    var live = controls(bar);
    if (!live.length) return;
    if (!on || live.indexOf(on) < 0) on = live.filter(function (c) { return c.tabIndex === 0; })[0] || live[0];
    all.forEach(function (c) { var t = c === on ? 0 : -1; if (c.tabIndex !== t) c.tabIndex = t; });
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
    (root || document).querySelectorAll('.toolbar').forEach(enhanceBar);
  }

  /* A toolbar watches only itself (0.69.3): a change inside it updates its
     tab stop and its menu buttons, and a folding toolbar folds again once
     the change is done. Nothing else in the page wakes it. */
  function enhanceBar(bar) {
      if (!bar.hasAttribute('role')) bar.setAttribute('role', 'toolbar');
      menus(bar);
      stop(bar, null, true);
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
      new MutationObserver(function () {
        menus(bar); stop(bar, null, true);
        bar.__dirty = true;
        if (bar.__fold) soonFit(bar);
      }).observe(bar, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['disabled', 'aria-disabled', 'hidden'] });
  }

  /* Folding again in the next frame, once however many changes come
     before it, since an application drawing its content may change a
     toolbar many times in one frame; or after 100 ms, when a hidden or
     headless page runs no frame for a while. pudl:toolbar-fit says when it
     is done. */
  function soonFit(bar) {
    if (bar.__fitSoon) return;
    bar.__fitSoon = true;
    var go = function () { if (!bar.__fitSoon) return; bar.__fitSoon = false; fit(bar); };
    requestAnimationFrame(go);
    setTimeout(go, 100);
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
    /* A change of width folds it again in the next frame; a change of what
       it holds, which its own observer sees, once the change is done. */
    if (window.ResizeObserver) new ResizeObserver(again).observe(bar);
    bar.__dirty = true;
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

  /* Folds the toolbar to its row, then says so with pudl:toolbar-fit on
     the toolbar (0.69.1), so a host or a test waiting on a new width
     knows when the folding is done rather than guessing. */
  /* It measures only when what it holds has changed since it last folded,
     or its width has (0.69.3); otherwise the folding it has is still
     right, and measuring would only make the browser lay the page out. */
  function fit(bar, force) {
    if (!bar.__fold || !bar.isConnected) return;
    var w = bar.clientWidth;
    if (!force && !bar.__dirty && w === bar.__fitWidth) return;
    bar.__dirty = false;
    bar.__fitWidth = w;
    foldTo(bar);
    stop(bar, null, true);
    bar.dispatchEvent(new CustomEvent('pudl:toolbar-fit', { bubbles: true }));
  }

  function foldTo(bar) {
    var f = bar.__fold;
    if (!f || !bar.isConnected || !bar.clientWidth) return;
    if (bar.querySelector('.menu-panel:popover-open')) return;
    f.groups.forEach(function (g) { g.setAttribute('data-toolbar-stage', '1'); });
    bar.removeAttribute('data-toolbar-more');
    if (fits(bar)) return;
    /* A group marked data-toolbar-keep, such as one holding a field, stays
       on the row as it is and never folds (0.69.0); the others fold
       around it. */
    var order = foldOrder(f.groups.filter(function (g) { return !g.hidden && g.getClientRects().length && !g.hasAttribute('data-toolbar-keep'); }));
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

  window.pudlToolbar = { enhance: function (root) { enhance(root); enhanceFolds(root); }, fit: function (bar) { fit(bar, true); } };

  /* Toolbars the page adds later are found among the nodes it adds, not by
     searching the whole page after every change anywhere in it (0.69.3). */
  new MutationObserver(function (records) {
    records.forEach(function (r) {
      Array.prototype.forEach.call(r.addedNodes, function (n) {
        if (n.nodeType !== 1) return;
        if (n.matches('.toolbar')) { enhanceBar(n); if (n.matches('[data-toolbar-fold]')) setupFold(n); }
        if (n.firstElementChild) n.querySelectorAll('.toolbar').forEach(function (b) { enhanceBar(b); if (b.matches('[data-toolbar-fold]')) setupFold(b); });
      });
    });
  }).observe(document.documentElement, { subtree: true, childList: true });
  document.addEventListener('pudl:regions-swap', function () { enhance(); enhanceFolds(); });
  function start() { enhance(); enhanceFolds(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
