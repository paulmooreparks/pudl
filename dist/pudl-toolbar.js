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

   The toolbar is one stop in the Tab order, on the last button used or
   the first: Left and Right move along its enabled controls, Home and End
   to its ends, and Tab leaves. A field a reader types in keeps its own
   keys and is a Tab stop of its own, as in a form (0.70.1): Left, Right,
   Home and End move its caret, Left with the caret at the field's start
   moves to the control before and Right at its end to the control after,
   and a field that does not say where its caret is, such as a number
   field, keeps them always and is left with Tab. A control in the state
   the cursor is in carries aria-pressed="true" and is drawn pressed in. A menu button whose
   every row is disabled is disabled with them, and enabled again when a
   row is; the script watches the rows. pudlToolbar.enhance(root) takes in
   toolbars a host has added. */
(function () {
  'use strict';

  /* A control marked data-toolbar-skip is part of another, such as a combo
     box's opener (0.72.0), and is never one of the toolbar's stops. */
  var CONTROL = 'button:not([data-toolbar-skip]), a[href]:not([data-toolbar-skip]), input:not([data-toolbar-skip]), select:not([data-toolbar-skip]), textarea:not([data-toolbar-skip])';

  function controls(bar) {
    return Array.prototype.filter.call(bar.querySelectorAll(CONTROL), function (c) {
      return !c.closest('.menu-panel') && !c.closest('[hidden]') && !c.disabled && c.getAttribute('aria-disabled') !== 'true' && c.getClientRects().length > 0;
    });
  }

  /* A field a reader types in or sets with the arrow keys: a text area, or
     an input other than a box, a button, a file or a colour. A range is one,
     since its arrows set its value. */
  function isField(c) {
    if (c.tagName === 'TEXTAREA') return true;
    if (c.tagName !== 'INPUT') return false;
    return !/^(checkbox|radio|button|submit|reset|image|file|color)$/.test(c.type);
  }

  /* Whether the caret is at the field's start, or with forward at its end,
     with nothing selected. HTML gives selectionStart only for text, search,
     URL, telephone and password fields and text areas, and null for every
     other type, which then never lets an arrow key leave
     (https://html.spec.whatwg.org/multipage/input.html#do-not-apply). */
  function atEdge(c, forward) {
    var s, e;
    try { s = c.selectionStart; e = c.selectionEnd; } catch (err) { return false; }
    if (typeof s !== 'number' || s !== e) return false;
    return forward ? s === c.value.length : s === 0;
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
    var all = [];
    /* Every field is a Tab stop of its own, and the toolbar's one stop is
       among the rest (0.70.1). */
    Array.prototype.forEach.call(bar.querySelectorAll(CONTROL), function (c) {
      if (c.closest('.menu-panel')) return;
      if (isField(c)) { if (c.tabIndex !== 0) c.tabIndex = 0; }
      else all.push(c);
    });
    if (on && isField(on)) on = null;
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
    var live = controls(bar).filter(function (c) { return !isField(c); });
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
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        if (e.target.isContentEditable || e.target.closest('.menu-panel')) return;
        if (!/^(ArrowLeft|ArrowRight|Home|End)$/.test(e.key)) return;
        var c = e.target.closest(CONTROL), list = controls(bar), i = list.indexOf(c), next;
        if (i < 0) return;
        var rtl = getComputedStyle(bar).direction === 'rtl';
        var forward = e.key === (rtl ? 'ArrowLeft' : 'ArrowRight');
        var back = e.key === (rtl ? 'ArrowRight' : 'ArrowLeft');
        /* A field keeps its keys but at its edges (0.70.1). */
        if (isField(c) && !((forward || back) && atEdge(c, forward))) return;
        if (forward) next = list[(i + 1) % list.length];
        else if (back) next = list[(i + list.length - 1) % list.length];
        else if (e.key === 'Home') next = list[0];
        else next = list[list.length - 1];
        e.preventDefault();
        if (isField(next)) {
          next.focus();
          /* Entering a field, the caret starts at the edge it came in by. */
          try { var at = forward ? 0 : next.value.length; next.setSelectionRange(at, at); } catch (err) { /* no caret */ }
        } else {
          stop(bar, next);
          next.focus();
        }
      });
      bar.addEventListener('focusin', function (e) {
        var c = e.target.closest(CONTROL);
        if (c && !c.closest('.menu-panel') && !isField(c)) stop(bar, c);
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

  /* A group's commands as menu rows (0.78.0 for fields and menus), so
     nothing is lost by folding: a command's own row where a control names
     one, else a row that presses the control; a segmented control's
     choices as radio rows under its name; a select as a row whose submenu
     holds its options; a field typed into as a row that opens the field in
     a popover against the fold button; a set of keys that step a value as
     rows that keep the menu open; and a menu as a row that opens it beside
     as a submenu. anchor is what a field's popover stands against. */
  function groupRows(group, panel, anchor) {
    var C = window.pudlCommands;
    var parts = Array.prototype.filter.call(group.children, function (c) {
      return !c.classList.contains('toolbar-label') && !c.classList.contains('toolbar-fold') && !c.hidden;
    });
    /* A group of one menu is that menu: its rows need no heading of their
       own under the group's. */
    var only = parts.length === 1;
    var heading = only ? function () {} : headingIn;
    parts.forEach(function (c) {
      if (c.matches('.menubar-menu')) {
        c.querySelectorAll('.menubar-title[popovertarget]').forEach(function (t) {
          panel.appendChild(subRow(panel, t.textContent.trim(), null, function (into) {
            copyMenu(document.getElementById(t.getAttribute('popovertarget')), into);
          }));
        });
        return;
      }
      if (c.matches('.seg, [data-command-choice]')) {
        heading(panel, c.getAttribute('aria-label'));
        c.querySelectorAll('button').forEach(function (b) { panel.appendChild(proxyRow(b, true)); });
        return;
      }
      var field = fieldIn(c);
      if (field && field.tagName === 'SELECT' && !field.multiple) { panel.appendChild(selectRow(panel, field)); return; }
      if (field && /^(checkbox|radio)$/.test(field.type)) { panel.appendChild(proxyRow(field, field.type === 'radio')); return; }
      if (field) { panel.appendChild(fieldRow(group, c, field, anchor)); return; }
      var btn = c.matches('button, a') ? c : c.querySelector(':scope > button, :scope > a');
      /* Keys that step a value, such as a stepper's minus and plus, stay
         in the menu as rows that keep it open. */
      if (!c.matches('button, a, .menu')) {
        var keys = c.querySelectorAll('button');
        if (keys.length > 1) {
          keys.forEach(function (k) { panel.appendChild(proxyRow(k, false, true)); });
          return;
        }
      }
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
        if (!inner) return;
        if (only) copyMenu(inner, panel);
        else panel.appendChild(subRow(panel, btn.getAttribute('aria-label') || btn.textContent.trim(), btn.querySelector('.glyph'), function (into) { copyMenu(inner, into); }));
      } else panel.appendChild(proxyRow(btn, false));
    });
  }

  function headingIn(panel, text) {
    if (!text) return;
    var h = el('div', 'md-section-label');
    h.textContent = text;
    panel.appendChild(h);
  }

  /* The field a part of a group is or holds, if any. A field inside a
     menu's panel belongs to the menu. */
  function fieldIn(c) {
    if (c.matches('input:not([type="hidden"]), select, textarea')) return c;
    if (c.matches('.menu, .seg')) return null;
    var f = c.querySelector('select, input:not([type="hidden"]), textarea');
    return f && !f.closest('.menu-panel') ? f : null;
  }

  function fieldName(field, part, group) {
    var l = field.labels && field.labels[0];
    return field.getAttribute('aria-label') || (l && l.textContent.trim()) || part.getAttribute('data-toolbar-label') ||
      field.getAttribute('placeholder') || nameOf(group);
  }

  /* The panel a row stands in, and the one that opened that, out to the
     menu the reader first opened, which closing closes them all. */
  function rootOf(panel) {
    while (panel && panel.__parentPanel) panel = panel.__parentPanel;
    return panel;
  }
  function closeAll(panel) {
    var root = rootOf(panel);
    if (root && root.matches(':popover-open')) root.hidePopover();
  }

  /* A row standing for a control. A row for a control that switches
     something is ticked and keeps the menu open, so several can be set in
     turn, and so does a row marked to step a value; any other row closes
     the menu and presses the control. */
  function proxyRow(ctl, radio, step) {
    var r = el('button', 'menu-action', { type: 'button', role: 'menuitem' });
    var state = function () {
      if (ctl.type === 'checkbox' || ctl.type === 'radio') return ctl.checked ? 'true' : 'false';
      var p = ctl.getAttribute('aria-pressed');
      if (p != null) return p;
      return /^menuitem(checkbox|radio)$/.test(ctl.getAttribute('role') || '') ? ctl.getAttribute('aria-checked') : null;
    };
    var on = state();
    var checks = on != null;
    if (checks) {
      r.setAttribute('role', radio || ctl.getAttribute('role') === 'menuitemradio' ? 'menuitemradio' : 'menuitemcheckbox');
      r.setAttribute('aria-checked', on);
    } else {
      var g = ctl.querySelector && ctl.querySelector(':scope > .glyph, :scope > .menubar-icon');
      if (g) r.appendChild(g.cloneNode(true));
    }
    if (ctl.classList && (ctl.classList.contains('danger') || ctl.classList.contains('btn-danger') || ctl.getAttribute('data-tone') === 'danger')) r.classList.add('danger');
    var w = el('span', 'menu-words');
    var words = ctl.querySelector && ctl.querySelector('.menubar-words, .toolbar-words');
    w.textContent = ctl.getAttribute('aria-label') || (ctl.labels && ctl.labels[0] && ctl.labels[0].textContent.trim()) || (words ? words.textContent : ctl.textContent).trim();
    r.appendChild(w);
    if (ctl.disabled || ctl.getAttribute('aria-disabled') === 'true') r.setAttribute('aria-disabled', 'true');
    var keep = step || (checks && !radio);
    r.addEventListener('click', function (e) {
      if (r.getAttribute('aria-disabled') === 'true') return;
      if (keep) {
        /* The menu script closes a menu when a row is chosen; this one
           stays. */
        e.stopPropagation();
        ctl.click();
        var now = state();
        if (now != null) r.setAttribute('aria-checked', now);
        return;
      }
      closeAll(r.closest('[popover]'));
      ctl.click();
    });
    return r;
  }

  /* A menu's rows copied into another panel: its actions as rows that
     press them, its headings, separators and place rows as they are. */
  function copyMenu(source, into) {
    if (!source) return;
    Array.prototype.forEach.call(source.children, function (c) {
      if (c.matches('.menu-action')) into.appendChild(proxyRow(c, false));
      else if (c.matches('.menu-check')) {
        var box = c.querySelector('input');
        if (box) into.appendChild(proxyRow(box, false));
      } else if (c.matches('.md-section-label, .menu-sep, .md-row')) into.appendChild(c.cloneNode(true));
    });
  }

  /* A row that opens a submenu beside it, built by fill when it opens. On
     a window 640px wide or less a submenu cannot stand beside its row, so
     the row shows it in the panel's place with a Back row first. */
  var subUid = 0;
  var NARROW = window.matchMedia ? window.matchMedia('(max-width: 640px)') : { matches: false };
  function subRow(panel, words, glyph, fill, detail) {
    var id = 'pudl-sub-' + (++subUid);
    var r = el('button', 'menu-action menubar-has-sub', { type: 'button', role: 'menuitem', id: id + '-row',
      'aria-haspopup': 'menu', 'aria-expanded': 'false', popovertarget: id });
    if (glyph) r.appendChild(glyph.cloneNode(true));
    var label = el('span', 'menubar-label');
    var w = el('span', 'menubar-words');
    w.textContent = words;
    label.appendChild(w);
    if (detail) {
      var d = el('span', 'menubar-detail');
      d.textContent = detail;
      label.appendChild(d);
    }
    r.appendChild(label);
    var sub = el('div', 'menu-panel toolbar-sub', { id: id, popover: '', role: 'menu', 'aria-label': words,
      'data-menu-placement': 'beside', 'data-menu-anchor': r.id });
    sub.__parentPanel = panel;
    sub.addEventListener('beforetoggle', function (e) {
      if (e.newState !== 'open') return;
      sub.textContent = '';
      fill(sub);
    });
    sub.addEventListener('toggle', function (e) {
      var open = e.newState === 'open';
      r.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open && sub.__keys) {
        sub.__keys = false;
        var first = sub.querySelector('.menu-action:not([aria-disabled="true"]), a.md-item');
        if (first) first.focus();
      }
      if (!open && (!document.activeElement || document.activeElement === document.body || sub.contains(document.activeElement))) r.focus({ preventScroll: true });
    });
    sub.addEventListener('keydown', function (e) {
      var back = getComputedStyle(sub).direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
      if (e.key === back) { e.preventDefault(); e.stopPropagation(); sub.hidePopover(); r.focus(); }
    });
    r.addEventListener('click', function (e) {
      /* Opening a submenu is not choosing, so the menu stays open; and a
         press on the row of a submenu already open, as one the pointer
         opened by resting there, leaves it open. */
      e.stopPropagation();
      if (!NARROW.matches && sub.matches(':popover-open')) { e.preventDefault(); return; }
      if (!NARROW.matches) return;
      e.preventDefault();
      drillIn(panel, words, fill);
    });
    r.addEventListener('keydown', function (e) {
      var into = getComputedStyle(r).direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
      if (e.key !== into) return;
      e.preventDefault();
      e.stopPropagation();
      if (NARROW.matches) { drillIn(panel, words, fill); return; }
      sub.__keys = true;
      if (!sub.matches(':popover-open')) r.click(); else { var f = sub.querySelector('.menu-action, a.md-item'); if (f) f.focus(); }
    });
    /* The pointer resting on a row opens its submenu, and moving onto
       another row of the same panel closes it. */
    r.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse' || NARROW.matches || sub.matches(':popover-open')) return;
      r.click();
    });
    panel.addEventListener('pointerover', function (e) {
      var other = e.target.closest && e.target.closest('.menu-action');
      if (other && other !== r && other.parentElement === panel && sub.matches(':popover-open')) sub.hidePopover();
    });
    document.body.appendChild(sub);
    var root = rootOf(panel);
    root.addEventListener('toggle', function gone(ev) {
      if (ev.newState !== 'closed') return;
      root.removeEventListener('toggle', gone);
      sub.remove();
    });
    return r;
  }

  /* A submenu shown in its panel's place, with a Back row first that
     brings the panel's rows back. */
  function drillIn(panel, words, fill) {
    var kept = document.createDocumentFragment();
    while (panel.firstChild) kept.appendChild(panel.firstChild);
    var back = el('button', 'menu-action menubar-back', { type: 'button', role: 'menuitem' });
    var bw = el('span', 'menu-words');
    bw.textContent = words;
    back.appendChild(bw);
    back.setAttribute('aria-label', 'Back from ' + words);
    back.addEventListener('click', function (e) {
      e.stopPropagation();
      panel.textContent = '';
      panel.appendChild(kept);
      var first = panel.querySelector('.menu-action, a.md-item');
      if (first) first.focus();
    });
    panel.appendChild(back);
    panel.appendChild(el('hr', 'menu-sep'));
    fill(panel);
    back.focus();
  }

  /* A select folds into a row whose submenu holds its options, the
     current one ticked and shown as the row's second line. */
  function selectRow(panel, select) {
    var group = select.closest('.toolbar-group');
    var words = fieldName(select, select, group);
    var current = select.selectedOptions && select.selectedOptions[0];
    return subRow(panel, words, null, function (into) {
      Array.prototype.forEach.call(select.options, function (o) {
        if (o.hidden) return;
        var r = el('button', 'menu-action', { type: 'button', role: 'menuitemradio', 'aria-checked': o.selected ? 'true' : 'false' });
        var w = el('span', 'menu-words');
        w.textContent = o.textContent.trim();
        r.appendChild(w);
        if (o.disabled) r.setAttribute('aria-disabled', 'true');
        r.addEventListener('click', function (e) {
          e.stopPropagation();
          if (o.disabled) return;
          select.value = o.value;
          select.dispatchEvent(new Event('input', { bubbles: true }));
          select.dispatchEvent(new Event('change', { bubbles: true }));
          closeAll(into);
        });
        into.appendChild(r);
      });
    }, current ? current.textContent.trim() : '');
  }

  /* A field typed into folds into a row that opens the field itself in a
     popover against the fold button, focus in it; the field goes back to
     its group when the popover closes. */
  var popUid = 0;
  function fieldRow(group, part, field, anchor) {
    var words = fieldName(field, part, group);
    var r = el('button', 'menu-action', { type: 'button', role: 'menuitem', 'aria-haspopup': 'dialog' });
    r.appendChild(foldGlyph(field.type === 'search' ? 'search' : 'pencil'));
    var w = el('span', 'menu-words');
    w.textContent = words + '…';
    r.appendChild(w);
    if (field.disabled) r.setAttribute('aria-disabled', 'true');
    r.addEventListener('click', function (e) {
      e.stopPropagation();
      if (field.disabled) return;
      var at = anchor || group.querySelector(':scope > .toolbar-fold > .menu-btn');
      closeAll(r.closest('[popover]'));
      if (at && !at.id) at.id = 'pudl-fold-btn-' + (++popUid);
      var pop = el('div', 'popover toolbar-field-popover', { popover: '', role: 'dialog', 'aria-label': words });
      if (at) pop.setAttribute('data-menu-anchor', at.id);
      var mark = document.createComment('folded field');
      part.parentNode.insertBefore(mark, part);
      pop.appendChild(part);
      document.body.appendChild(pop);
      pop.addEventListener('toggle', function (ev) {
        if (ev.newState !== 'closed') return;
        mark.parentNode.insertBefore(part, mark);
        mark.remove();
        pop.remove();
        if (at && at.isConnected && (!document.activeElement || document.activeElement === document.body)) at.focus({ preventScroll: true });
      });
      pop.showPopover();
      field.focus();
    });
    return r;
  }

  function setupFold(bar) {
    if (bar.__fold) return bar.__fold;
    bar.__fold = { groups: [] };
    foldParts(bar);
    var pending = 0;
    var again = function () { if (!pending) pending = requestAnimationFrame(function () { pending = 0; fit(bar); }); };
    /* A change of width folds it again in the next frame; a change of what
       it holds, which its own observer sees, once the change is done. */
    if (window.ResizeObserver) new ResizeObserver(again).observe(bar);
    /* A menu's toggle event does not bubble, so it is caught on the way
       down; it fires after the menu has closed. */
    bar.addEventListener('toggle', function (e) {
      if (e.newState !== 'closed' || !bar.__fitLater || !e.target.matches || !e.target.matches('.menu-panel')) return;
      if (bar.querySelector('.menu-panel:popover-open')) return;
      bar.__fitLater = false;
      fit(bar, true);
    }, true);
    bar.__dirty = true;
    fit(bar);
    return bar.__fold;
  }

  /* The parts folding adds: each group's caption at its start and its fold
     menu at its end, and the toolbar's More menu at its end. A page that
     draws a group's contents again, as a list of pins is drawn again, may
     take them away with the old contents, so they are put back each time
     what the toolbar holds changes, and a group the page adds later joins
     the folding (0.79.1). Nothing moves that is already in its place. */
  function foldParts(bar) {
    var f = bar.__fold;
    f.groups = Array.prototype.filter.call(bar.children, function (g) { return g.classList.contains('toolbar-group'); });
    f.groups.forEach(function (g) {
      /* A command bar's menu group (0.78.0) is named Menus, shows the
         menu glyph, and folds after every other group into that glyph
         alone. */
      var menusGroup = g.hasAttribute('data-toolbar-menus');
      if (menusGroup) {
        if (!g.hasAttribute('aria-label')) g.setAttribute('aria-label', 'Menus');
        if (!g.hasAttribute('data-toolbar-glyph')) g.setAttribute('data-toolbar-glyph', 'menu');
        if (!g.hasAttribute('data-toolbar-priority')) g.setAttribute('data-toolbar-priority', '1000000');
      }
      var name = nameOf(g), glyph = g.getAttribute('data-toolbar-glyph');
      if (!g.hasAttribute('role')) g.setAttribute('role', 'group');
      if (name && !g.hasAttribute('aria-label')) g.setAttribute('aria-label', name);
      if (g.hasAttribute('data-toolbar-group')) {
        var label = g.querySelector(':scope > .toolbar-label');
        if (!label) {
          label = el('span', 'toolbar-label', { 'aria-hidden': 'true' });
          label.textContent = name;
        }
        if (g.firstChild !== label) g.insertBefore(label, g.firstChild);
      }
      var wrap = g.querySelector(':scope > .toolbar-fold');
      if (!wrap) {
        var fold = foldMenu('toolbar-fold', glyph, name || 'More');
        if (menusGroup) fold.wrap.querySelector('.menu-btn').setAttribute('data-toolbar-glyph-only', '');
        fold.panel.addEventListener('beforetoggle', function (e) {
          if (e.newState !== 'open') return;
          fold.panel.textContent = '';
          groupRows(g, fold.panel);
        });
        wrap = fold.wrap;
      }
      if (g.lastElementChild !== wrap) g.appendChild(wrap);
    });
    var moreWrap = bar.querySelector(':scope > .toolbar-more');
    if (!moreWrap) {
      var more = foldMenu('toolbar-more', null, bar.getAttribute('data-toolbar-more-text') || 'More');
      more.panel.addEventListener('beforetoggle', function (e) {
        if (e.newState !== 'open') return;
        more.panel.textContent = '';
        var at = more.wrap.querySelector('.menu-btn');
        bar.__fold.groups.forEach(function (g) {
          if (g.getAttribute('data-toolbar-stage') !== '5') return;
          headingIn(more.panel, nameOf(g));
          groupRows(g, more.panel, at);
        });
      });
      moreWrap = more.wrap;
    }
    if (bar.lastElementChild !== moreWrap) bar.appendChild(moreWrap);
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
    /* Folding while one of its menus is open would take the menu's button
       from under it, so the work waits, undone and still owed, and is done
       when the menu closes (0.93.1). */
    if (bar.querySelector('.menu-panel:popover-open')) { bar.__fitLater = true; return; }
    var changed = bar.__dirty || force;
    bar.__dirty = false;
    bar.__fitWidth = w;
    if (changed) { foldParts(bar); least(bar); }
    foldTo(bar);
    nameFolded(bar);
    stop(bar, null, true);
    bar.dispatchEvent(new CustomEvent('pudl:toolbar-fit', { bubbles: true }));
  }

  /* The widths the toolbar needs unfolded and folded as far as it goes,
     as --toolbar-most and --toolbar-least on it, so a host laying out
     several things that fold, such as a topbar, can share its room among
     them (0.79.0). They are measured when what the toolbar holds
     changes, not as its width does. */
  function foldable(f) {
    return foldOrder(f.groups.filter(function (g) { return !g.hidden && g.getClientRects().length && !g.hasAttribute('data-toolbar-keep'); }));
  }

  function span(bar) {
    var lo = Infinity, hi = -Infinity;
    Array.prototype.forEach.call(bar.children, function (c) {
      var r = c.getBoundingClientRect();
      if (!r.width) return;
      lo = Math.min(lo, r.left); hi = Math.max(hi, r.right);
    });
    var cs = getComputedStyle(bar);
    var w = hi > lo ? hi - lo : 0;
    return Math.ceil(w + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth));
  }

  function least(bar) {
    var f = bar.__fold;
    if (!f || !bar.isConnected) return;
    if (bar.querySelector('.menu-panel:popover-open')) return;
    var was = f.groups.map(function (g) { return g.getAttribute('data-toolbar-stage'); });
    var more = bar.hasAttribute('data-toolbar-more');
    var groups = foldable(f);
    groups.forEach(function (g) { g.setAttribute('data-toolbar-stage', '1'); });
    bar.removeAttribute('data-toolbar-more');
    bar.style.setProperty('--toolbar-most', span(bar) + 'px');
    /* Folded furthest is the narrower of every group as its menu button
       and every group in More, which may be the wider. */
    groups.forEach(function (g) { g.setAttribute('data-toolbar-stage', g.getAttribute('data-toolbar-glyph') ? '4' : '3'); });
    var low = span(bar);
    if (groups.length > 1) {
      groups.forEach(function (g) { g.setAttribute('data-toolbar-stage', '5'); });
      bar.setAttribute('data-toolbar-more', '');
      low = Math.min(low, span(bar));
    }
    bar.style.setProperty('--toolbar-least', low + 'px');
    f.groups.forEach(function (g, i) { if (was[i] == null) g.removeAttribute('data-toolbar-stage'); else g.setAttribute('data-toolbar-stage', was[i]); });
    if (more) bar.setAttribute('data-toolbar-more', ''); else bar.removeAttribute('data-toolbar-more');
  }

  /* A control shown as its glyph alone, its group at stage 2, takes its
     words as its accessible name and its tooltip while its words are
     hidden, as a glyph-only command does (0.80.0). Only a name this gives
     is taken back when the group opens out again; one the control had of
     its own, such as a choice's state, is never touched. */
  function nameFolded(bar) {
    var f = bar.__fold;
    if (!f) return;
    f.groups.forEach(function (g) {
      var bare = g.getAttribute('data-toolbar-stage') === '2';
      g.querySelectorAll(':scope :is(button, a):has(> .glyph):has(> .toolbar-words)').forEach(function (c) {
        if (c.closest('.toolbar-fold, .menu-panel') || c.hasAttribute('data-toolbar-glyph-only')) return;
        var words = c.querySelector(':scope > .toolbar-words').textContent.trim();
        if (bare && words) {
          if (c.__pudlFoldName || !c.hasAttribute('aria-label')) { c.setAttribute('aria-label', words); c.__pudlFoldName = true; }
          if (c.__pudlFoldTip || (!c.hasAttribute('data-tooltip') && !c.hasAttribute('title'))) { c.setAttribute('data-tooltip', words); c.__pudlFoldTip = true; }
        } else {
          if (c.__pudlFoldName) { c.removeAttribute('aria-label'); c.__pudlFoldName = false; }
          if (c.__pudlFoldTip) { c.removeAttribute('data-tooltip'); c.__pudlFoldTip = false; }
        }
      });
    });
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
    var order = foldable(f);
    /* A toolbar of one group stops at that group's menu button, since
       More would only hold the same commands under a vaguer name. */
    var last = order.length > 1 ? 5 : 4;
    for (var stage = 2; stage <= last; stage++) {
      for (var i = 0; i < order.length; i++) {
        var g = order[i];
        if (stage === 4 && !g.getAttribute('data-toolbar-glyph')) continue;
        g.setAttribute('data-toolbar-stage', String(stage));
        if (stage === 5) bar.setAttribute('data-toolbar-more', '');
        if (fits(bar)) return;
      }
    }
  }

  /* Widths measured before the page's fonts arrived are measured again. */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () {
    document.querySelectorAll('.toolbar[data-toolbar-fold]').forEach(function (bar) {
      if (!bar.__fold) return;
      bar.__dirty = true;
      fit(bar);
    });
  });

  function enhanceFolds(root) {
    (root || document).querySelectorAll('.toolbar[data-toolbar-fold]').forEach(setupFold);
  }

  /* === Glyph-only commands (0.78.0) =======================================
     A control marked data-toolbar-glyph-only shows its glyph alone at every
     stage; its words, which the stylesheet hides, become its accessible
     name and its tooltip where it has none. */
  function glyphOnly(root) {
    (root || document).querySelectorAll('.toolbar [data-toolbar-glyph-only]').forEach(function (c) {
      var w = c.querySelector(':scope > .toolbar-words');
      var words = w ? w.textContent.trim() : '';
      if (!words) return;
      if (!c.hasAttribute('aria-label')) c.setAttribute('aria-label', words);
      if (!c.hasAttribute('data-tooltip') && !c.hasAttribute('title')) c.setAttribute('data-tooltip', words);
    });
  }

  /* === Menu bars in a toolbar (0.78.0) ====================================
     A .menubar-menu in a command bar's menu group, or on a folded ribbon,
     behaves as a menu bar: each title says whether its menu is open; while
     one menu is open, Left and Right open the menu before or after it with
     focus on its first row, and the pointer moving onto another title
     opens that title's menu. */
  function menuBar(mb) {
    if (mb.__menuBar) return;
    mb.__menuBar = true;
    var titles = function () { return Array.prototype.slice.call(mb.querySelectorAll('.menubar-title[popovertarget]')); };
    var panelOf = function (t) { return document.getElementById(t.getAttribute('popovertarget')); };
    titles().forEach(function (t) {
      var p = panelOf(t);
      if (!p) return;
      t.setAttribute('aria-haspopup', 'menu');
      t.setAttribute('aria-expanded', p.matches(':popover-open') ? 'true' : 'false');
      if (!p.hasAttribute('role')) p.setAttribute('role', 'menu');
      if (!p.hasAttribute('aria-label')) p.setAttribute('aria-label', t.textContent.trim());
      p.addEventListener('toggle', function (e) { t.setAttribute('aria-expanded', e.newState === 'open' ? 'true' : 'false'); });
      p.addEventListener('keydown', function (e) {
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
        var rtl = getComputedStyle(mb).direction === 'rtl';
        var step = e.key === (rtl ? 'ArrowLeft' : 'ArrowRight') ? 1 : e.key === (rtl ? 'ArrowRight' : 'ArrowLeft') ? -1 : 0;
        if (!step) return;
        /* A row that opens a submenu takes the arrow into it. */
        if (step === 1 && e.target.closest && e.target.closest('.menubar-has-sub')) return;
        var list = titles().filter(function (x) { return x.getClientRects().length; });
        var i = list.indexOf(t);
        if (i < 0 || list.length < 2) return;
        e.preventDefault();
        var next = list[(i + step + list.length) % list.length];
        openTitle(next, true);
      });
      t.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse' || p.matches(':popover-open')) return;
        var open = titles().some(function (x) { var q = panelOf(x); return x !== t && q && q.matches(':popover-open'); });
        if (open) openTitle(t, false);
      });
    });
    function openTitle(t, keys) {
      var p = panelOf(t);
      if (!p) return;
      t.focus({ preventScroll: true });
      if (!p.matches(':popover-open')) t.click();
      /* A panel is placed when it opens, and one still hidden for placing
         cannot take focus, so it is placed now. */
      if (window.pudlMenu && window.pudlMenu.place) window.pudlMenu.place(p);
      if (keys) {
        var first = p.querySelector('.menu-action:not([aria-disabled="true"]), a.md-item, .menu-check input');
        if (first) first.focus();
      }
    }
  }

  /* === Ribbons (0.78.0) ===================================================
     A .ribbon holds a .tablist of tabs, each with aria-controls naming the
     folding toolbar that is its row, and those toolbars after it:

       <div class="ribbon" id="editor-ribbon" aria-label="Editor">
         <div class="tablist" role="tablist" aria-label="Editor">
           <button role="tab" aria-controls="r-home" aria-selected="true">Home</button>
           <button role="tab" aria-controls="r-insert">Insert</button>
         </div>
         <div class="toolbar" id="r-home" aria-label="Home" data-toolbar-fold>…</div>
         <div class="toolbar" id="r-insert" aria-label="Insert" data-toolbar-fold>…</div>
       </div>

     One row shows at a time, under its tab. Show as ribbon, built at the
     end of the tabs, folds the ribbon into a menu bar of the same names,
     each menu holding its tab's groups under their names, and back; the
     choice is kept in localStorage under the ribbon's id. The chosen tab is
     momentary and is not part of the address. */
  function ribbon(r) {
    if (r.__ribbon) return;
    var list = r.querySelector(':scope > .tablist');
    if (!list) return;
    r.__ribbon = true;
    var tabs = Array.prototype.slice.call(list.querySelectorAll(':scope > [role="tab"]'));
    var rows = Array.prototype.slice.call(r.querySelectorAll(':scope > .toolbar'));
    var rowOf = function (tab, i) { return document.getElementById(tab.getAttribute('aria-controls')) || rows[i]; };
    var toggleText = r.getAttribute('data-ribbon-toggle-text') || 'Show as ribbon';
    tabs.forEach(function (tab, i) {
      var row = rowOf(tab, i);
      if (!row) return;
      var label = tab.getAttribute('aria-label') || tab.textContent.trim();
      if (!tab.hasAttribute('data-tooltip')) tab.setAttribute('data-tooltip', label);
      if (!tab.hasAttribute('title')) tab.setAttribute('title', label);
      if (!tab.id) tab.id = (r.id || 'pudl-ribbon') + '-tab-' + i;
      if (!row.id) row.id = (r.id || 'pudl-ribbon') + '-row-' + i;
      tab.setAttribute('aria-controls', row.id);
      if (!tab.getAttribute('type') && tab.tagName === 'BUTTON') tab.type = 'button';
      if (!row.hasAttribute('aria-label')) row.setAttribute('aria-label', tab.textContent.trim());
    });
    function choose(tab, focus) {
      tabs.forEach(function (t, i) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var row = rowOf(t, i);
        if (row) row.hidden = !on;
      });
      if (focus) tab.focus();
    }
    choose(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0], false);
    list.addEventListener('click', function (e) {
      var tab = e.target.closest('[role="tab"]');
      if (tab && list.contains(tab)) choose(tab, false);
    });
    list.addEventListener('keydown', function (e) {
      var tab = e.target.closest('[role="tab"]');
      if (!tab || e.altKey || e.ctrlKey || e.metaKey) return;
      var rtl = getComputedStyle(list).direction === 'rtl';
      var i = tabs.indexOf(tab), next = null;
      if (e.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) next = tabs[(i + 1) % tabs.length];
      else if (e.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) next = tabs[(i + tabs.length - 1) % tabs.length];
      else if (e.key === 'Home') next = tabs[0];
      else if (e.key === 'End') next = tabs[tabs.length - 1];
      if (!next) return;
      e.preventDefault();
      choose(next, true);
    });

    function toggle() {
      var b = el('button', 'btn btn-sm ribbon-toggle', { type: 'button', 'aria-pressed': 'true' });
      b.appendChild(foldGlyph('ribbon'));
      var w = el('span', 'toolbar-words');
      w.textContent = toggleText;
      b.appendChild(w);
      b.addEventListener('click', function () { fold(!r.hasAttribute('data-ribbon-folded'), true); });
      return b;
    }
    /* The toggle stands beside the tab list in one band, since a tab list
       holds only tabs. */
    var inTabs = toggle();
    var head = el('div', 'ribbon-bar');
    r.insertBefore(head, list);
    head.append(list, inTabs);
    var chooser = el('button', 'btn btn-sm menu-btn ribbon-tabs', { type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false' });
    chooser.textContent = r.getAttribute('data-ribbon-tabs-text') || 'Ribbon tabs';
    function openTabs() {
      if (!window.pudlMenu || !window.pudlMenu.openAt) return;
      var rect = chooser.getBoundingClientRect();
      var entries = tabs.filter(function (tab) { return !tab.hidden; }).map(function (tab) {
        return { label: tab.getAttribute('aria-label') || tab.textContent.trim(), radio: true, checked: tab.getAttribute('aria-selected') === 'true', disabled: tab.disabled || tab.getAttribute('aria-disabled') === 'true', run: function () { choose(tab, false); } };
      });
      var panel = window.pudlMenu.openAt(getComputedStyle(chooser).direction === 'rtl' ? rect.right : rect.left, rect.bottom + 4, entries,
        { owner: chooser, 'for': chooser, label: chooser.textContent, edges: { top: rect.top - 4, bottom: rect.bottom + 4 } });
      if (!panel) return;
      chooser.setAttribute('aria-expanded', 'true');
      chooser.setAttribute('aria-controls', panel.id);
      panel.addEventListener('toggle', function closed(e) {
        if (e.newState !== 'closed') return;
        chooser.setAttribute('aria-expanded', 'false'); chooser.removeAttribute('aria-controls');
        panel.removeEventListener('toggle', closed);
      });
    }
    chooser.addEventListener('click', openTabs);
    chooser.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown') { e.preventDefault(); openTabs(); } });
    head.insertBefore(chooser, inTabs);
    chooser.hidden = true;
    function fitTabs() {
      if (!head.getClientRects().length) return;
      /* Measure without the chooser so that it cannot cause its own
         overflow or keep itself visible after the titles fit again. */
      chooser.hidden = true;
      var clipped = list.scrollWidth > list.clientWidth + 1;
      var panel = document.getElementById(chooser.getAttribute('aria-controls'));
      if (!clipped) {
        var returnFocus = document.activeElement === chooser || (panel && panel.contains(document.activeElement));
        if (panel && panel.matches(':popover-open')) panel.hidePopover();
        if (returnFocus) {
          var selected = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0];
          if (selected) selected.focus();
        }
      }
      chooser.hidden = !clipped;
    }
    var fitTabsFrame = 0;
    function scheduleTabsFit() {
      if (!fitTabsFrame) fitTabsFrame = requestAnimationFrame(function () { fitTabsFrame = 0; fitTabs(); });
    }
    if (window.ResizeObserver) { var tabsResize = new ResizeObserver(scheduleTabsFit); tabsResize.observe(head); tabsResize.observe(list); }
    new MutationObserver(scheduleTabsFit).observe(list, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'class', 'style'] });
    if (document.fonts) document.fonts.ready.then(scheduleTabsFit);

    /* The menu bar the ribbon folds into: a title for each tab, whose menu
       holds the tab's groups in order, each under its name, in the rows a
       fold menu holds; a field opens against the title. */
    var bar = el('div', 'ribbon-menus');
    var mb = el('div', 'menubar-menu');
    mb.appendChild(el('span', 'menubar-glyph', { 'aria-hidden': 'true' }));
    tabs.forEach(function (tab, i) {
      var row = rowOf(tab, i);
      if (!row) return;
      var wrap = el('div', 'menu');
      var id = row.id + '-menu';
      var t = el('button', 'menubar-title menu-btn', { type: 'button', popovertarget: id });
      t.textContent = tab.textContent.trim();
      var p = el('div', 'menu-panel', { id: id, popover: '' });
      p.addEventListener('beforetoggle', function (e) {
        if (e.newState !== 'open') return;
        p.textContent = '';
        Array.prototype.forEach.call(row.querySelectorAll(':scope > .toolbar-group'), function (g, n) {
          if (n) p.appendChild(el('hr', 'menu-sep'));
          headingIn(p, nameOf(g));
          groupRows(g, p, t);
        });
      });
      wrap.append(t, p);
      mb.appendChild(wrap);
    });
    var inBar = toggle();
    bar.append(mb, inBar);
    r.insertBefore(bar, head);
    menuBar(mb);

    var key = 'pudl-ribbon:' + (r.id || location.pathname);
    function fold(on, remember) {
      var hadFocus = r.contains(document.activeElement);
      if (on) r.setAttribute('data-ribbon-folded', ''); else r.removeAttribute('data-ribbon-folded');
      inTabs.setAttribute('aria-pressed', on ? 'false' : 'true');
      inBar.setAttribute('aria-pressed', on ? 'false' : 'true');
      if (remember) { try { localStorage.setItem(key, on ? 'folded' : 'ribbon'); } catch (e) { /* not kept */ } }
      if (hadFocus) (on ? inBar : inTabs).focus();
      scheduleTabsFit();
      r.dispatchEvent(new CustomEvent('pudl:ribbon-fold', { bubbles: true, detail: { folded: on } }));
    }
    var kept = null;
    try { kept = localStorage.getItem(key); } catch (e) { /* none */ }
    fold(kept === 'folded' || (kept == null && r.hasAttribute('data-ribbon-folded')), false);
    r.classList.add('ribbon-ready');
  }

  function enhanceRibbons(root) {
    (root || document).querySelectorAll('.ribbon').forEach(ribbon);
    (root || document).querySelectorAll('.toolbar-group[data-toolbar-menus] .menubar-menu').forEach(menuBar);
    glyphOnly(root);
  }

  window.pudlToolbar = { enhance: function (root) { enhance(root); enhanceFolds(root); enhanceRibbons(root); }, fit: function (bar) { fit(bar, true); } };

  /* Toolbars the page adds later are found among the nodes it adds, not by
     searching the whole page after every change anywhere in it (0.69.3). */
  new MutationObserver(function (records) {
    records.forEach(function (r) {
      Array.prototype.forEach.call(r.addedNodes, function (n) {
        if (n.nodeType !== 1) return;
        if (n.matches('.toolbar')) { enhanceBar(n); if (n.matches('[data-toolbar-fold]')) setupFold(n); }
        if (n.firstElementChild) n.querySelectorAll('.toolbar').forEach(function (b) { enhanceBar(b); if (b.matches('[data-toolbar-fold]')) setupFold(b); });
        if (n.matches('.ribbon, .toolbar') || (n.firstElementChild && n.querySelector('.ribbon, .toolbar'))) enhanceRibbons(n.parentNode || n);
      });
    });
  }).observe(document.documentElement, { subtree: true, childList: true });
  document.addEventListener('pudl:regions-swap', function () { enhance(); enhanceFolds(); enhanceRibbons(); });
  function start() { enhance(); enhanceFolds(); enhanceRibbons(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
