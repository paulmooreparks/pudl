/* PUDL menus. Load after pudl.css, with defer or at the end of <body>.

   A menu panel is an HTML popover, so it opens, closes and stacks above
   everything without this script. The script adds four things:
     - it places the panel against the button that opened it, below the
       button or above it when there is more room there, and on a narrow
       screen as a sheet across the full width;
     - Up and Down move between the panel's rows, and Down on the button
       opens the panel and moves into it;
     - an .md-filter input in a panel narrows its rows as the reader types,
       hides a section whose rows all go, and Enter follows the first row
       that is left, or, with none left, submits the form the filter sits
       in. Without script the filter is whatever form holds it;
     - a panel carrying data-menu-key, such as "/", opens when that key is
       pressed outside an editable field, with focus in its filter, and a
       panel with no button opens as a palette near the top of the window. */
(function () {
  'use strict';

  var GAP = 4;          // px between the button and the panel
  var EDGE = 8;         // px the panel keeps from the edges of the window
  var NARROW = 640;     // at or below this window width the panel is a sheet
  var MIN_BELOW = 240;  // px below a button that keeps a long panel there, scrolling
  var ITEMS = 'a.md-item, .menu-action, .md-filter, .menu-check input';

  /* An explicit anchor selects the placement when several controls target
     one panel. Otherwise use its native popover invoker. */
  function invokerOf(panel) {
    var anchor = panel.getAttribute('data-menu-anchor');
    var explicit = anchor ? document.getElementById(anchor) : null;
    if (explicit) return explicit;
    return panel.id ? document.querySelector('[popovertarget="' + CSS.escape(panel.id) + '"]') : null;
  }

  function isOpen(panel) { return panel.matches(':popover-open'); }

  /* The panels this script places: menu panels, and popovers (0.74.0), a
     panel of any content anchored to the control that opened it, which is
     placed as a menu is but has no rows to move through. */
  var PLACED = '.menu-panel, .popover';
  var openPanels = new Set(Array.prototype.filter.call(document.querySelectorAll(PLACED), isOpen));
  function placed(el) { return !!(el && el.classList && (el.classList.contains('menu-panel') || el.classList.contains('popover'))); }
  var opening = new WeakSet();

  var insets;
  function viewport() {
    if (!insets) {
      insets = document.createElement('div');
      insets.className = 'menu-viewport-insets';
      insets.setAttribute('aria-hidden', 'true');
      document.body.appendChild(insets);
    }
    var css = getComputedStyle(insets), v = window.visualViewport;
    var left = (v ? v.offsetLeft : 0) + parseFloat(css.paddingLeft);
    var top = (v ? v.offsetTop : 0) + parseFloat(css.paddingTop);
    return { left: left, top: top,
      right: (v ? v.offsetLeft + v.width : document.documentElement.clientWidth) - parseFloat(css.paddingRight),
      bottom: (v ? v.offsetTop + v.height : window.innerHeight) - parseFloat(css.paddingBottom) };
  }

  function cues(panel) {
    panel.classList.toggle('menu-more-above', panel.scrollTop > 1);
    panel.classList.toggle('menu-more-below', panel.scrollHeight - panel.clientHeight - panel.scrollTop > 1);
    var r = panel.getBoundingClientRect();
    panel.style.setProperty('--menu-cue-left', r.left + 'px');
    panel.style.setProperty('--menu-cue-width', r.width + 'px');
    panel.style.setProperty('--menu-cue-top', r.top + 'px');
    panel.style.setProperty('--menu-cue-bottom', (r.bottom - 18) + 'px');
  }

  function fitHeight(panel, available, natural) {
    panel.classList.toggle('menu-overflow', natural > available);
    panel.style.maxHeight = Math.max(0, available) + 'px';
  }

  /* Places an open panel against its button. The panel is a popover in the
     top layer, which is positioned against the window, so the button's
     rectangle is all that is needed. */
  function place(panel) {
    var scroll = opening.has(panel) ? 0 : panel.scrollTop;
    opening.delete(panel);
    if (panel.__menuAt) { placeAtPoint(panel, panel.__menuAt, scroll); return; }
    var btn = invokerOf(panel);
    if (!btn) { placeAsPalette(panel, scroll); return; }
    /* A split button's menu lines up under the whole button, not only its
       caret (0.74.0). */
    var r = (btn.closest('.split-btn') || btn).getBoundingClientRect();
    /* A popover with a pointer stands off a little further, for the
       pointer, and the pointer is aimed at the middle of its control. */
    var pointer = panel.classList.contains('popover') && panel.classList.contains('pointer');
    var gap = pointer ? GAP + 7 : GAP;
    if (pointer) r = { top: r.top - (gap - GAP), bottom: r.bottom + (gap - GAP), left: r.left, right: r.right, width: r.width, height: r.height };
    var aim = btn.getBoundingClientRect();
    var v = viewport(), vw = v.right - v.left;
    var beside = panel.getAttribute('data-menu-placement') === 'beside';
    var narrow = !beside && vw <= NARROW;

    panel.classList.toggle('sheet', narrow);
    panel.style.margin = '0';
    panel.style.inset = 'auto';
    panel.style.width = narrow ? vw + 'px' : '';
    panel.style.left = narrow ? v.left + 'px' : '';
    panel.style.minWidth = 'min(14rem, ' + vw + 'px)';
    panel.style.maxWidth = narrow ? vw + 'px' : 'min(22rem, ' + vw + 'px)';

    var bottomAnchor = Math.max(v.top, Math.min(v.bottom, r.bottom + GAP));
    var topAnchor = Math.max(v.top, Math.min(v.bottom, r.top - GAP));
    var below = Math.max(0, v.bottom - bottomAnchor - EDGE);
    var above = Math.max(0, topAnchor - v.top - EDGE);
    /* The panel's natural height is its whole rectangle, borders included
       and unrounded, rounded up: scrollHeight leaves out the border and
       rounds down, which left a panel a fraction short of its content and
       showing a scrollbar it did not need. */
    panel.classList.remove('menu-overflow');
    panel.style.maxHeight = 'none';
    var natural = Math.ceil(panel.getBoundingClientRect().height);
    if (beside) {
      fitHeight(panel, v.bottom - v.top - EDGE * 2, natural);
      var width = panel.offsetWidth;
      panel.style.left = Math.max(v.left, Math.min(v.right - width, r.right + width + EDGE <= v.right ? r.right - 2 : r.left - width + 2)) + 'px';
      panel.style.top = Math.max(v.top + EDGE, Math.min(r.top - 6, v.bottom - panel.offsetHeight - EDGE)) + 'px';
      panel.scrollTop = scroll;
      cues(panel);
      return;
    }
    /* A panel drops below its button, as a desktop's menus do. It opens
       above only when it does not fit below and either fits whole above or
       has less than MIN_BELOW below; otherwise it stays below, shortened,
       and scrolls, rather than flipping up over the page when only its
       length is the trouble (0.77.1). */
    var down = below >= natural || below >= above || (above < natural && below >= MIN_BELOW);
    fitHeight(panel, down ? below : above, natural);

    if (!narrow) {
      /* The panel lines up with the button's start edge: its left in a
         left-to-right page, its right in a right-to-left one. */
      var w = panel.offsetWidth;
      var start = getComputedStyle(btn).direction === 'rtl' ? r.right - w : r.left;
      panel.style.left = Math.max(v.left, Math.min(start, v.right - w - EDGE)) + 'px';
    }
    panel.style.top = (down ? bottomAnchor : Math.max(v.top, topAnchor - panel.offsetHeight)) + 'px';
    panel.setAttribute('data-menu-side', down ? 'below' : 'above');
    if (pointer) {
      var pr = panel.getBoundingClientRect();
      var x = Math.max(14, Math.min(pr.width - 14, aim.left + aim.width / 2 - pr.left));
      panel.style.setProperty('--popover-pointer-x', x + 'px');
    }
    panel.scrollTop = scroll;
    cues(panel);
  }

  /* A panel with no button, summoned only by its key, opens where keyboard
     palettes conventionally sit: centred, a little below the top of the
     window. */
  function placeAsPalette(panel, scroll) {
    var v = viewport(), vw = v.right - v.left, vh = v.bottom - v.top;
    var narrow = vw <= NARROW;
    panel.classList.toggle('sheet', narrow);
    panel.style.margin = '0';
    panel.style.inset = 'auto';
    panel.style.width = narrow ? vw + 'px' : '';
    panel.style.minWidth = 'min(14rem, ' + vw + 'px)';
    panel.style.maxWidth = narrow ? vw + 'px' : 'min(22rem, ' + vw + 'px)';
    var top = v.top + (narrow ? 0 : Math.round(vh * 0.15));
    panel.classList.remove('menu-overflow');
    panel.style.maxHeight = 'none';
    fitHeight(panel, v.bottom - top - EDGE, Math.ceil(panel.getBoundingClientRect().height));
    panel.style.left = (narrow ? v.left : Math.max(v.left, v.left + Math.round((vw - panel.offsetWidth) / 2))) + 'px';
    panel.style.top = top + 'px';
    panel.scrollTop = scroll;
    cues(panel);
  }

  /* A context menu opens at a point, the pointer's or the focused
     element's (0.74.0): its top left corner there, or its bottom left when
     there is more room above, kept inside the window, and as tall as the
     room allows, scrolling past that. */
  function placeAtPoint(panel, at, scroll) {
    var v = viewport();
    panel.classList.remove('sheet');
    panel.style.margin = '0';
    panel.style.inset = 'auto';
    panel.style.width = '';
    panel.style.minWidth = 'min(14rem, ' + (v.right - v.left) + 'px)';
    panel.style.maxWidth = 'min(22rem, ' + (v.right - v.left) + 'px)';
    panel.classList.remove('menu-overflow');
    panel.style.maxHeight = 'none';
    var natural = Math.ceil(panel.getBoundingClientRect().height);
    /* A menu opened against an element knows both its edges, and opens
       below the element or above it, never over it (0.81.1); one opened
       at a point opens below the point or above it. */
    var downAt = at.bottom != null ? at.bottom : at.y, upAt = at.top != null ? at.top : at.y;
    var below = Math.max(0, v.bottom - downAt - EDGE), above = Math.max(0, upAt - v.top - EDGE);
    var down = below >= natural || below >= above;
    fitHeight(panel, down ? below : above, natural);
    var w = panel.offsetWidth;
    var rtl = getComputedStyle(document.documentElement).direction === 'rtl';
    var left = rtl ? at.x - w : at.x;
    panel.style.left = Math.max(v.left + EDGE, Math.min(left, v.right - w - EDGE)) + 'px';
    panel.style.top = (down ? downAt : Math.max(v.top + EDGE, upAt - panel.offsetHeight)) + 'px';
    panel.scrollTop = scroll;
    cues(panel);
  }

  function items(panel) {
    return Array.prototype.filter.call(panel.querySelectorAll(ITEMS), function (el) {
      return el.offsetParent !== null || el === document.activeElement;
    });
  }

  /* === Filtering ========================================================== */

  function applyFilter(input) {
    var panel = input.closest('.menu-panel');
    var q = input.value.trim().toLowerCase();
    var rows = panel.querySelectorAll('.md-row');
    var shown = 0;
    rows.forEach(function (row) {
      var hit = !q || row.textContent.toLowerCase().indexOf(q) >= 0;
      row.hidden = !hit;
      if (hit) shown++;
    });

    /* A section label goes when every row under it has gone. */
    panel.querySelectorAll('.md-section-label').forEach(function (label) {
      var any = false;
      for (var el = label.nextElementSibling; el && !el.matches('.md-section-label, .menu-sep'); el = el.nextElementSibling) {
        if (el.matches('.md-row') && !el.hidden) { any = true; break; }
      }
      label.hidden = !any;
    });

    var empty = panel.querySelector('.menu-empty');
    if (!empty) {
      empty = document.createElement('p');
      empty.className = 'menu-empty';
      empty.textContent = panel.getAttribute('data-menu-empty') || 'Nothing matches.';
      input.parentNode.insertBefore(empty, input.nextSibling);
    }
    empty.hidden = !(q && shown === 0);
  }

  function resetFilter(panel) {
    var input = panel.querySelector('.md-filter');
    if (input && input.value) { input.value = ''; applyFilter(input); }
  }

  /* === Events ============================================================= */

  /* The beforetoggle and toggle events are not bubbling events, so they are
     caught on the way down. The panel stays hidden from the moment it opens
     until it has been placed. */
  document.addEventListener('beforetoggle', function (e) {
    var panel = e.target;
    if (!placed(panel)) return;
    if (e.newState === 'open') openPanels.add(panel); else openPanels.delete(panel);
    /* The filter starts empty every time the panel opens. beforetoggle
       fires for every opening, whereas the toggle events of a quick close
       and reopen can be merged into one, so the clearing belongs here. */
    if (e.newState === 'open') {
      opening.add(panel);
      panel.classList.add('placing');
      resetFilter(panel);
    }
  }, true);

  var watchers = new WeakMap();
  document.addEventListener('toggle', function (e) {
    var panel = e.target;
    if (!placed(panel)) return;
    if (e.newState === 'open') {
      place(panel);
      panel.classList.remove('placing');
      /* A popover takes focus into its first field, or its first control,
         so the reader can use it at once; when it closes, the browser
         returns focus to the control that opened it. */
      if (panel.classList.contains('popover') && panel.getAttribute('data-popover-focus') !== 'manual' && (!panel.contains(document.activeElement) || document.activeElement.matches('.popover-close'))) {
        var first = panel.querySelector('[autofocus]') ||
          panel.querySelector('input:not([type=hidden]):not(:disabled), select:not(:disabled), textarea:not(:disabled)') ||
          panel.querySelector('button:not(.popover-close):not(:disabled), a[href], [tabindex]:not([tabindex="-1"])');
        if (first) first.focus();
      }
      if (!watchers.has(panel)) {
        var observer = new MutationObserver(function (records) {
          if (!isOpen(panel)) return;
          records = records.filter(function (r) {
            var target = r.target.nodeType === 1 ? r.target : r.target.parentElement;
            if (!target || target.closest('.menu-panel') !== panel) return false;
            if (r.type !== 'childList') return true;
            return Array.prototype.some.call(r.addedNodes, function (n) { return !n.classList || !n.classList.contains('menu-panel'); }) ||
              Array.prototype.some.call(r.removedNodes, function (n) { return !n.classList || !n.classList.contains('menu-panel'); });
          });
          if (!records.length) return;
          if (records.some(function (r) { return r.type === 'childList' && r.target === panel; })) panel.scrollTop = 0;
          place(panel);
        });
        watchers.set(panel, observer);
        panel.addEventListener('scroll', function () { cues(panel); });
      }
      watchers.get(panel).observe(panel, { childList: true, subtree: true, characterData: true,
        attributes: true, attributeFilter: ['hidden'] });
    } else {
      if (watchers.has(panel)) watchers.get(panel).disconnect();
      panel.classList.remove('placing');
      resetFilter(panel);
      /* A popover gives focus back to its control. The browser does this
         where it knows which element had focus before, and an engine that
         does not focus a button when it is pressed does not know, so focus
         left on nothing, or left inside the closed popover, goes back to
         the control that opened it. */
      if (panel.classList.contains('popover') && panel.getAttribute('data-popover-focus') !== 'manual' && (!document.activeElement || document.activeElement === document.body || panel.contains(document.activeElement))) {
        var opener = invokerOf(panel);
        if (opener && opener.isConnected) opener.focus({ preventScroll: true });
      }
    }
  }, true);

  /* An open panel follows its button when the page scrolls or the window
     resizes, once a frame however many events arrive. Scrolling the
     panel's own rows moves nothing, so it is ignored. */
  var placing = 0;
  function placeOpen(e) {
    if (e && e.type === 'scroll' && e.target.closest && e.target.closest(PLACED)) return;
    if (placing) return;
    /* Scrolling anywhere comes here, many times a second; with no menu
       open there is nothing to place (0.69.3). */
    if (!openPanels.size) return;
    placing = requestAnimationFrame(function () {
      placing = 0;
      openPanels.forEach(function (p) {
        if (p.isConnected && isOpen(p)) place(p); else openPanels.delete(p);
      });
    });
  }
  window.addEventListener('resize', placeOpen);
  window.addEventListener('scroll', placeOpen, true);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', placeOpen);
    window.visualViewport.addEventListener('scroll', placeOpen);
  }

  document.addEventListener('input', function (e) {
    if (e.target.matches && e.target.matches('.menu-panel .md-filter')) applyFilter(e.target);
  });

  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target;
    if (!t || !t.closest) return;

    /* Down on a menu button opens its panel if need be and moves into it. */
    var btn = t.closest('.menu-btn[popovertarget]');
    if (btn && e.key === 'ArrowDown') {
      var target = document.getElementById(btn.getAttribute('popovertarget'));
      if (!target) return;
      e.preventDefault();
      if (!isOpen(target)) target.showPopover();
      /* The toggle event that places a panel comes a moment later, and a
         panel still hidden for placing cannot take focus, so place it now. */
      place(target);
      target.classList.remove('placing');
      var first = items(target)[0];
      if (first) first.focus();
      return;
    }

    var panel = t.closest('.menu-panel');
    if (!panel || !isOpen(panel)) return;

    if (e.key === 'Enter' && t.matches('.md-filter')) {
      var hit = panel.querySelector('.md-row:not([hidden]) a.md-item');
      if (hit) { e.preventDefault(); hit.click(); }
      return;
    }

    var list = items(panel);
    var i = list.indexOf(t);
    var next = null;
    if (e.key === 'ArrowDown') next = list[Math.min(list.length - 1, i + 1)];
    else if (e.key === 'ArrowUp') next = i <= 0 ? null : list[i - 1];
    else if (e.key === 'Home' && !t.matches('.md-filter')) next = list[0];
    else if (e.key === 'End' && !t.matches('.md-filter')) next = list[list.length - 1];
    else return;

    e.preventDefault();
    if (next) next.focus();
    else {
      var b = invokerOf(panel);
      if (b) b.focus();
    }
  });

  /* A panel carrying data-menu-key opens when that key is pressed anywhere
     outside an editable field, with focus in its filter, or on its first
     row if it has no filter. Inside a field the key types as usual. */
  function editable(el) {
    return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  }

  function summon(panel) {
    if (!isOpen(panel)) panel.showPopover();
    place(panel);
    panel.classList.remove('placing');
    var target = panel.querySelector('.md-filter') || items(panel)[0];
    if (target) target.focus();
  }

  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    if (!e.key || e.key.length !== 1 || editable(document.activeElement)) return;
    var panel = Array.prototype.find.call(document.querySelectorAll('.menu-panel[data-menu-key]'), function (p) {
      return p.getAttribute('data-menu-key') === e.key;
    });
    if (!panel) return;
    e.preventDefault();
    summon(panel);
  });

  /* A menu's button announces the key that also opens it. */
  function markShortcuts() {
    document.querySelectorAll('.menu-panel[data-menu-key]').forEach(function (p) {
      var btn = invokerOf(p);
      if (btn && !btn.hasAttribute('aria-keyshortcuts')) btn.setAttribute('aria-keyshortcuts', p.getAttribute('data-menu-key'));
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', markShortcuts);
  else markShortcuts();

  /* === Segmented controls on a phone ======================================
     A segmented control marked data-seg-menu becomes, on a narrow screen, a
     pop-up button, as Finder's view switcher does in a narrow window: the
     button shows the current choice, and its menu lists every choice with a
     tick on the current one. The page renders only the segments; this
     builds the button beside them, and the stylesheet shows one or the
     other by the width of the screen. A choice that is a link stays a link
     to the same address, and a choice that is a button presses the
     segment, so the page's own handlers run as they always do. */
  var segs = 0;
  function currentOf(seg) {
    return seg.querySelector('[aria-pressed="true"], [aria-checked="true"], [aria-current]:not([aria-current="false"]), .active');
  }
  function choicesOf(seg) { return Array.prototype.slice.call(seg.querySelectorAll(':scope > button, :scope > a')); }

  function segMenu(seg) {
    if (seg.nextElementSibling && seg.nextElementSibling.classList.contains('seg-menu')) return;
    var id = 'seg-menu-' + (++segs);
    var wrap = document.createElement('div');
    wrap.className = 'menu seg-menu';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm menu-btn';
    btn.setAttribute('popovertarget', id);
    var label = document.createElement('span');
    label.className = 'menu-btn-label';
    btn.appendChild(label);
    var panel = document.createElement('div');
    panel.className = 'menu-panel seg-menu-panel';
    panel.id = id;
    panel.setAttribute('popover', '');
    var name = seg.getAttribute('aria-label');
    if (name) panel.setAttribute('aria-label', name);
    wrap.appendChild(btn);
    wrap.appendChild(panel);
    seg.parentNode.insertBefore(wrap, seg.nextSibling);

    function relabel() {
      var cur = currentOf(seg);
      var words = cur ? cur.textContent.trim() : '';
      label.textContent = words || (name || '');
      if (name) btn.setAttribute('aria-label', words ? name + ': ' + words : name);
    }
    relabel();
    new MutationObserver(relabel).observe(seg, { subtree: true, childList: true, characterData: true,
      attributes: true, attributeFilter: ['aria-pressed', 'aria-checked', 'aria-current', 'class'] });

    panel.addEventListener('beforetoggle', function (e) {
      if (e.newState !== 'open') return;
      panel.textContent = '';
      var cur = currentOf(seg);
      choicesOf(seg).forEach(function (c) {
        var row;
        if (c.tagName === 'A') {
          row = document.createElement('a');
          row.setAttribute('href', c.getAttribute('href') || '');
          if (c === cur) row.setAttribute('aria-current', c.getAttribute('aria-current') || 'true');
        } else {
          row = document.createElement('button');
          row.type = 'button';
          row.setAttribute('aria-pressed', c === cur ? 'true' : 'false');
          row.addEventListener('click', function () { c.click(); });
          if (c.disabled) row.disabled = true;
        }
        row.className = 'menu-action seg-choice';
        row.textContent = c.textContent.trim();
        panel.appendChild(row);
      });
    });
  }
  function segMenus() { document.querySelectorAll('.seg[data-seg-menu]').forEach(segMenu); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', segMenus);
  else segMenus();
  document.addEventListener('pudl:regions-swap', segMenus);
  /* place(panel) places an open panel at once and shows it, for a script
     that opens a panel and moves focus into it in the same moment, such as
     the menu bar, since a panel is hidden until the toggle event that
     places it, and toggle events can be merged. */
  /* === Context menus (0.74.0) =============================================
     A right-click, Shift+F10 or the Menu key fires pudl:contextmenu on what
     it was over or what has focus, bubbling, with detail.add(rows), the
     point, whether the keyboard opened it, and the target. Whatever adds
     rows gets a menu of them at the point, and the browser's own menu does
     not open; where nothing adds a row, the browser's menu opens as it
     always has. pudlMenu.openAt(x, y, rows, { owner, label, for }) opens
     one from a script.

     The target is whatever was under the pointer, often a label or glyph
     inside a row, so the page says which element the menu is for, with
     detail.mark(element) or openAt's for (0.76.0). That element carries
     data-menu-for while the menu is open, however it closes, and the
     stylesheet keeps it lit as it was under the pointer, so the reader
     can see what the commands act on. One element is marked at a time.

     A row is the menu bar's: { label, run, disabled, checked, radio,
     danger, detail, shortcut, glyph, items }, or '-' for a separator, or a
     command's id, which pudl-commands.js turns into its row. A shortcut is
     shown in the platform's form and bound by nothing here, since the key
     belongs to whatever owns it, such as the field for Ctrl+C. Rows with
     items open a submenu beside them.

     Up and Down move through the rows, wrapping, Home and End go to the
     ends, a letter goes to the next row starting with it, Right opens a
     submenu and Left closes it, Enter and Space choose, and Escape closes
     one level. A press outside, Tab, or the window losing focus closes the
     menu, and focus goes back to where it was. Shift with a right-click
     leaves the browser's own menu to open. */
  var MAC = /Mac|iPhone|iPad|iPod/.test(navigator.platform || '');
  function keyShown(k) {
    var parts = k.split('+'), key = parts.pop();
    if (MAC) {
      var sym = { Ctrl: '⌃', Alt: '⌥', Shift: '⇧', Mod: '⌘' };
      return ['Ctrl', 'Alt', 'Shift', 'Mod'].filter(function (m) { return parts.indexOf(m) >= 0; }).map(function (m) { return sym[m]; }).join('') + key;
    }
    return parts.map(function (m) { return m === 'Mod' ? 'Ctrl' : m; }).concat(key).join('+');
  }
  function keyAria(k) {
    return k.split('+').map(function (p) { return p === 'Mod' ? (MAC ? 'Meta' : 'Control') : p === 'Ctrl' ? 'Control' : p; }).join('+');
  }

  var ctx = { panels: [], owner: null, marked: null, quiet: false };
  var ctxUid = 0;

  function rowsFrom(list, target) {
    var out = [];
    (list || []).forEach(function (r) {
      if (typeof r === 'string' && r !== '-') {
        if (window.pudlCommands && window.pudlCommands.menuRows) out = out.concat(window.pudlCommands.menuRows([r], target));
      } else if (r) out.push(r);
    });
    return out;
  }

  function closeContext(level) {
    level = level || 0;
    while (ctx.panels.length > level) {
      var p = ctx.panels.pop();
      if (p.__parentRow) p.__parentRow.setAttribute('aria-expanded', 'false');
      if (isOpen(p)) p.hidePopover();
      p.remove();
    }
    if (level === 0) {
      if (ctx.marked) ctx.marked.removeAttribute('data-menu-for');
      ctx.marked = null;
      var owner = ctx.owner;
      ctx.owner = null;
      if (owner && owner.isConnected && (!document.activeElement || document.activeElement === document.body)) owner.focus({ preventScroll: true });
    }
  }

  function ctxRows(panel) {
    return Array.prototype.slice.call(panel.querySelectorAll(':scope > .menu-action'));
  }

  function fillContext(panel, rows) {
    rows.forEach(function (c) {
      if (c === '-' || (c && c.separator)) {
        var hr = document.createElement('hr');
        hr.className = 'menu-sep';
        hr.setAttribute('role', 'separator');
        panel.appendChild(hr);
        return;
      }
      if (!c || typeof c.label !== 'string') return;
      var r = document.createElement('button');
      r.type = 'button';
      r.className = 'menu-action';
      r.setAttribute('role', 'menuitem');
      r.tabIndex = -1;
      if (c.glyph) {
        var g = document.createElement('span');
        g.className = 'glyph';
        g.setAttribute('aria-hidden', 'true');
        g.style.setProperty('--glyph', 'var(--glyph-' + c.glyph + ')');
        r.appendChild(g);
      }
      var words = document.createElement('span');
      words.className = 'menubar-label';
      var main = document.createElement('span');
      main.className = 'menubar-words';
      main.textContent = c.label;
      words.appendChild(main);
      var detail = c.disabled && c.reason ? c.reason : c.detail;
      if (detail) {
        var d = document.createElement('span');
        d.className = 'menubar-detail';
        d.textContent = detail;
        words.appendChild(d);
      }
      r.appendChild(words);
      if (c.checked !== undefined && c.checked !== null) {
        r.setAttribute('role', c.radio ? 'menuitemradio' : 'menuitemcheckbox');
        r.setAttribute('aria-checked', c.checked ? 'true' : 'false');
      }
      if (c.disabled) r.setAttribute('aria-disabled', 'true');
      if (c.danger) r.classList.add('danger');
      var key = c.shortcut || c.key;
      if (key) {
        var s = document.createElement('span');
        s.className = 'menubar-shortcut';
        s.setAttribute('aria-hidden', 'true');
        s.textContent = keyShown(key);
        r.appendChild(s);
        r.setAttribute('aria-keyshortcuts', keyAria(key));
      }
      if (c.items && c.items.length) {
        r.setAttribute('aria-haspopup', 'menu');
        r.setAttribute('aria-expanded', 'false');
        r.classList.add('menubar-has-sub');
      }
      r.id = panel.id + '-' + panel.children.length;
      r._row = c;
      panel.appendChild(r);
    });
  }

  /* Update an owned context menu without replacing its focused row. Stable
     row ids also keep open submenus attached when labels or counts change. */
  function updateContext(rows, mark) {
    if (!mark || mark.nodeType !== 1 || !ctx.panels.length || ctx.marked !== mark) return false;
    function update(panel, items) {
      var oldRows = ctxRows(panel), focus = document.activeElement, index = oldRows.indexOf(focus);
      var fresh = document.createElement('div'); fresh.id = panel.id + '-refresh-' + (++ctxUid); fillContext(fresh, rowsFrom(items, ctx.owner));
      var retained = new Set(), cursor = panel.firstChild;
      Array.from(fresh.children).forEach(function (made) {
        var model = made._row, prior = model && oldRows.find(function (r) { return !retained.has(r) && (model.id ? r._row.id === model.id : r._row.label === model.label); });
        var row = prior || made;
        if (prior) {
          var id = prior.id, expanded = prior.getAttribute('aria-expanded'), controls = prior.getAttribute('aria-controls');
          Array.from(prior.attributes).forEach(function (a) { prior.removeAttribute(a.name); });
          Array.from(made.attributes).forEach(function (a) { prior.setAttribute(a.name, a.value); });
          prior.id = id; prior.replaceChildren.apply(prior, Array.from(made.childNodes)); prior._row = model;
          if (expanded === 'true' && model.items && model.items.length) { prior.setAttribute('aria-expanded', 'true'); prior.setAttribute('aria-controls', controls); }
        }
        retained.add(row); if (row !== cursor) panel.insertBefore(row, cursor); cursor = row.nextSibling;
      });
      Array.from(panel.children).forEach(function (r) { if (!retained.has(r)) r.remove(); });
      var sub = ctx.panels[panel.__level + 1];
      if (sub) {
        if (!retained.has(sub.__parentRow) || !sub.__parentRow._row.items || !sub.__parentRow._row.items.length) {
          var ownedFocus = ctx.panels.slice(panel.__level + 1).some(function (p) { return p.contains(focus); });
          var parentIndex = oldRows.indexOf(sub.__parentRow); closeContext(panel.__level + 1);
          if (ownedFocus) { var surviving = ctxRows(panel); if (surviving.length) surviving[Math.min(Math.max(parentIndex, 0), surviving.length - 1)].focus(); }
        }
        else { sub.setAttribute('aria-label', sub.__parentRow._row.label); update(sub, sub.__parentRow._row.items); }
      }
      if (index >= 0 && retained.has(focus)) focus.focus({ preventScroll: true });
      if (index >= 0 && !retained.has(focus)) { var next = ctxRows(panel); if (next.length) next[Math.min(index, next.length - 1)].focus(); }
      place(panel);
    }
    if (!rows || !rows.length) { closeContext(0); return true; }
    update(ctx.panels[0], rows); return true;
  }

  function buildContext(rows, at, label, level, parentRow) {
    var panel = document.createElement('div');
    panel.className = 'menu-panel context-menu';
    panel.id = 'pudl-context-' + (++ctxUid);
    panel.setAttribute('popover', 'manual');
    panel.setAttribute('role', 'menu');
    if (label) panel.setAttribute('aria-label', label);
    fillContext(panel, rows);
    (document.querySelector('dialog[open]:modal') || document.body).appendChild(panel);
    if (parentRow) {
      panel.setAttribute('data-menu-placement', 'beside');
      panel.setAttribute('data-menu-anchor', parentRow.id);
      panel.__parentRow = parentRow;
      parentRow.setAttribute('aria-expanded', 'true');
      parentRow.setAttribute('aria-controls', panel.id);
    } else {
      panel.__menuAt = at;
    }
    panel.__level = level;
    panel.showPopover();
    place(panel);
    panel.classList.remove('placing');
    ctx.panels.push(panel);
    panel.addEventListener('click', function (e) {
      var r = e.target.closest('.menu-action');
      if (!r || r.parentElement !== panel) return;
      e.stopPropagation();
      choose(panel, r);
    });
    /* The row under a pointer that moves takes focus. A menu that opens
       under a pointer at rest leaves focus where the keyboard put it. */
    panel.addEventListener('pointermove', function (e) {
      var r = e.target.closest('.menu-action');
      if (r && r.parentElement === panel && document.activeElement !== r) r.focus({ preventScroll: true });
    });
    panel.addEventListener('keydown', function (e) { ctxKey(panel, e); });
    return panel;
  }

  function openSub(panel, row) {
    closeContext(panel.__level + 1);
    var sub = buildContext(rowsFrom(row._row.items, ctx.owner), null, row._row.label, panel.__level + 1, row);
    var first = ctxRows(sub)[0];
    if (first) first.focus();
  }

  function choose(panel, r) {
    var c = r._row;
    if (c.items && c.items.length) { openSub(panel, r); return; }
    if (c.disabled) return;
    closeContext(0);
    if (typeof c.run === 'function') c.run();
  }

  function ctxKey(panel, e) {
    if (e.ctrlKey || e.metaKey) return;
    var rows = ctxRows(panel), i = rows.indexOf(document.activeElement), next = null;
    var rtl = getComputedStyle(panel).direction === 'rtl';
    var inKey = rtl ? 'ArrowLeft' : 'ArrowRight', outKey = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === 'ArrowDown') next = rows[(i + 1) % rows.length];
    else if (e.key === 'ArrowUp') next = rows[(i <= 0 ? rows.length : i) - 1];
    else if (e.key === 'Home') next = rows[0];
    else if (e.key === 'End') next = rows[rows.length - 1];
    else if (e.key === inKey) { if (rows[i] && rows[i]._row.items) { openSub(panel, rows[i]); } e.preventDefault(); e.stopPropagation(); return; }
    else if (e.key === outKey || e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      if (panel.__level > 0) { var row = panel.__parentRow; closeContext(panel.__level); row.focus(); }
      else if (e.key === 'Escape') closeContext(0);
      return;
    }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); if (rows[i]) choose(panel, rows[i]); return; }
    else if (e.key === 'Tab') { e.preventDefault(); closeContext(0); return; }
    else if (e.key.length === 1 && !e.altKey) {
      var letter = e.key.toLowerCase();
      for (var n = 1; n <= rows.length; n++) {
        var cand = rows[(i + n) % rows.length];
        if (cand.textContent.trim().toLowerCase().indexOf(letter) === 0) { next = cand; break; }
      }
      if (!next) return;
    } else return;
    e.preventDefault();
    e.stopPropagation();
    if (next) next.focus();
  }

  function openAt(x, y, rows, opts) {
    opts = opts || {};
    closeContext(0);
    rows = rowsFrom(rows, opts.owner);
    if (!rows.some(function (r) { return r && r !== '-' && typeof r.label === 'string'; })) return null;
    ctx.owner = opts.owner || document.activeElement;
    var point = { x: x, y: y };
    /* opts.edges, the top and bottom edges of an element the menu opens
       against, as anchorPoint gives them (0.81.1). */
    if (opts.edges && opts.edges.top != null) { point.top = opts.edges.top; point.bottom = opts.edges.bottom; }
    var panel = buildContext(rows, point, opts.label, 0, null);
    var mark = opts['for'];
    if (mark && mark.nodeType === 1) {
      mark.setAttribute('data-menu-for', panel.id);
      ctx.marked = mark;
    }
    var first = ctxRows(panel).filter(function (r) { return r.getAttribute('aria-disabled') !== 'true'; })[0] || ctxRows(panel)[0];
    if (first) first.focus({ preventScroll: true });
    return panel;
  }

  /* Asks the page for rows, by pudl:contextmenu on the target. */
  function ask(target, x, y, keyboard) {
    var asked = { rows: [], mark: null };
    var detail = {
      x: x, y: y, keyboard: keyboard, target: target,
      add: function (r) { asked.rows = asked.rows.concat(Array.isArray(r) ? r : [r]); },
      mark: function (el) { asked.mark = el && el.nodeType === 1 ? el : null; },
      /* How many rows have been given so far, so a handler further out,
         such as PUDL's own for a dock tab, gives way to one nearer the
         target (0.79.0). */
      count: function () { return asked.rows.length; },
      /* Opens the menu against an element's edge, as a menu button's
         would, rather than at the pointer, where it would cover a small
         target such as a taskbar button (0.79.0). */
      anchor: function (el) { asked.anchor = el && el.nodeType === 1 ? el : null; }
    };
    /* Cancelable, so a page can say that nothing further out should
       answer, as it would for an event of its own (0.79.0). */
    target.dispatchEvent(new CustomEvent('pudl:contextmenu', { bubbles: true, cancelable: true, detail: detail }));
    return asked;
  }

  /* Where a menu summoned from the keyboard opens: under the focused
     element's start, or at the caret's line in a text field, kept on
     screen. */
  /* Where a menu anchored to an element opens: at its start, against its
     top edge when it sits in the lower half of the viewport, so the menu
     opens above it, and against its bottom edge otherwise. */
  function anchorPoint(el) {
    var r = el.getBoundingClientRect();
    var rtl = getComputedStyle(el).direction === 'rtl';
    var low = (r.top + r.bottom) / 2 > viewport().bottom / 2;
    /* Both edges go with the point, so the menu opens below the element
       or above it, never over it, whichever has the room (0.81.1). */
    return { x: Math.round(rtl ? r.right : r.left), y: Math.round(low ? r.top - 4 : r.bottom + 4), top: Math.round(r.top - 4), bottom: Math.round(r.bottom + 4) };
  }

  function keyboardPoint(el) {
    var r = el.getBoundingClientRect();
    var rtl = getComputedStyle(el).direction === 'rtl';
    return { x: Math.round(rtl ? r.right - 8 : r.left + 8), y: Math.round(Math.min(r.bottom, r.top + 24)) };
  }

  document.addEventListener('contextmenu', function (e) {
    /* The keyboard already asked, and either opened a menu or found no
       rows, in which case the browser's own menu is left to open. */
    if (ctx.quiet) {
      ctx.quiet = false;
      if (ctx.panels.length) e.preventDefault();
      return;
    }
    if (e.defaultPrevented || !e.target || !e.target.closest) return;
    if (e.target.closest('.context-menu')) { e.preventDefault(); return; }
    /* Shift with a right-click always gives the browser's own menu, with
       its spelling suggestions and its copy, paste and inspect, the thing
       readers miss most where a page replaces it. */
    if (e.shiftKey) return;
    var asked = ask(e.target, e.clientX, e.clientY, false);
    if (!asked.rows.length) return;
    e.preventDefault();
    var at = asked.anchor ? anchorPoint(asked.anchor) : { x: e.clientX, y: e.clientY };
    openAt(at.x, at.y, asked.rows, { edges: at, owner: document.activeElement && document.activeElement !== document.body ? document.activeElement : e.target, 'for': asked.mark });
  });

  document.addEventListener('keydown', function (e) {
    var summon = e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey);
    if (!summon) { ctx.quiet = false; return; }
    if (e.defaultPrevented) return;
    var target = document.activeElement && document.activeElement !== document.body ? document.activeElement : document.body;
    if (target.closest && target.closest('.context-menu')) { e.preventDefault(); return; }
    var at = keyboardPoint(target);
    var asked = ask(target, at.x, at.y, true);
    ctx.quiet = true;
    if (!asked.rows.length) return;
    e.preventDefault();
    if (asked.anchor) at = anchorPoint(asked.anchor);
    openAt(at.x, at.y, asked.rows, { edges: at, owner: target, 'for': asked.mark });
  });

  document.addEventListener('pointerdown', function (e) {
    ctx.quiet = false;
    if (!ctx.panels.length) return;
    if (e.target.closest && e.target.closest('.context-menu')) return;
    /* What opened the menu that this press closes, so a press on the
       control that opened it closes it rather than opening it again. */
    ctx.closedBy = ctx.owner;
    closeContext(0);
  }, true);
  window.addEventListener('blur', function () { if (ctx.panels.length) closeContext(0); });
  window.addEventListener('resize', function () { if (ctx.panels.length) closeContext(0); });

  /* === A row's actions button (0.81.0) ====================================
     A button marked data-row-actions, the last thing in a row of a list,
     a tree or a table, opens the row's context menu: pressing it fires
     pudl:contextmenu on the row, so the page gives the same rows it gives
     a right-click, and the menu opens against the button with the row
     marked. It shows only on the row under the pointer, the selected or
     current row, a row with focus in it and a row whose menu is open;
     elsewhere it keeps its place empty, so nothing shifts. The keyboard
     reaches the same menu with Shift+F10 or the Menu key on the row, so
     the button is for the pointer: it is no stop in the Tab order and is
     hidden from assistive technology. Left empty it shows the more
     glyph. A row is the nearest element holding the button as a child, or
     a table row holding it in a cell. */
  function rowOf(el) {
    for (var n = el; n && n !== document.body; n = n.parentElement) {
      /* A cell holding the button belongs to its table row (0.81.1). */
      if (n.tagName === 'TD' || n.tagName === 'TH') continue;
      if (n.querySelector(':scope > [data-row-actions]')) return n;
      if (n.tagName === 'TR' && n.querySelector(':scope > :is(td, th) > [data-row-actions]')) return n;
    }
    return null;
  }

  function readyButtons(root) {
    (root || document).querySelectorAll('[data-row-actions]').forEach(function (b) {
      if (b.__pudlRowActions) return;
      b.__pudlRowActions = true;
      b.setAttribute('tabindex', '-1');
      b.setAttribute('aria-hidden', 'true');
      if (b.tagName === 'BUTTON' && !b.hasAttribute('type')) b.type = 'button';
    });
  }
  new MutationObserver(function (records) {
    for (var i = 0; i < records.length; i++) {
      var added = records[i].addedNodes;
      for (var k = 0; k < added.length; k++) {
        var n = added[k];
        if (n.nodeType === 1 && (n.hasAttribute('data-row-actions') || (n.firstElementChild && n.querySelector('[data-row-actions]')))) { readyButtons(n.parentNode || n); return; }
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { readyButtons(); });
  else readyButtons();

  /* The row under a mouse or pen, and the row with focus in it, each
     marked on the row itself, since a nested row's parent also holds the
     pointer and the focus. A finger has no hover. */
  var hot = null, focusRow = null;
  function setRow(which, row) {
    var was = which === 'hot' ? hot : focusRow;
    if (was === row) return;
    if (was) was.removeAttribute(which === 'hot' ? 'data-row-hot' : 'data-row-focus');
    if (row) row.setAttribute(which === 'hot' ? 'data-row-hot' : 'data-row-focus', '');
    if (which === 'hot') hot = row; else focusRow = row;
  }
  document.addEventListener('pointerover', function (e) {
    if (e.pointerType === 'touch') return;
    setRow('hot', e.target.closest ? rowOf(e.target) : null);
  });
  document.documentElement.addEventListener('pointerleave', function () { setRow('hot', null); });
  document.addEventListener('focusin', function (e) {
    if (e.target.closest && e.target.closest('.context-menu')) return;
    setRow('focus', e.target.closest ? rowOf(e.target) : null);
  });

  function openRowMenu(row, btn) {
    var asked = ask(row, 0, 0, false);
    if (!asked.rows.length) return;
    var at = anchorPoint(btn);
    openAt(at.x, at.y, asked.rows, { edges: at, owner: btn, 'for': asked.mark || row });
  }
  /* A press on the button opens the menu; a press while its menu is open
     closes it, as a menu button does: the press's pointerdown has already
     closed the menu, and says which control had opened it. */
  document.addEventListener('pointerdown', function (e) {
    if (!(e.target.closest && e.target.closest('[data-row-actions]'))) ctx.closedBy = null;
  });
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-row-actions]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (ctx.closedBy === btn) { ctx.closedBy = null; return; }
    ctx.closedBy = null;
    var row = rowOf(btn);
    if (row) openRowMenu(row, btn);
  });

  /* === A long press (0.81.0) ==============================================
     Holding a finger still on anything with a context menu for half a
     second opens it, as a right-click does, since some browsers give a
     long press no context menu event. Where the browser does give one,
     the press is answered once. A finger that moves, lifts or scrolls
     first is not a long press. */
  var press = null;
  function endPress() { if (press) { clearTimeout(press.timer); press = null; } }
  document.addEventListener('pointerdown', function (e) {
    endPress();
    if (e.pointerType !== 'touch' || !e.isPrimary || !e.target.closest || e.target.closest('.context-menu, input, textarea, select, [contenteditable="true"]')) return;
    var target = e.target, x = e.clientX, y = e.clientY;
    press = { x: x, y: y, timer: setTimeout(function () {
      press = null;
      /* The browser's own long-press menu came first and opened it. */
      if (ctx.panels.length) return;
      var asked = ask(target, x, y, false);
      if (!asked.rows.length) return;
      var at = asked.anchor ? anchorPoint(asked.anchor) : { x: x, y: y };
      openAt(at.x, at.y, asked.rows, { edges: at, owner: target, 'for': asked.mark || rowOf(target) });
      /* The browser's own long-press menu and the click that follows the
         finger lifting are this press's, and are let go. */
      ctx.longPress = Date.now();
    }, 500) };
  }, true);
  document.addEventListener('pointermove', function (e) {
    if (press && (Math.abs(e.clientX - press.x) > 10 || Math.abs(e.clientY - press.y) > 10)) endPress();
  }, true);
  ['pointerup', 'pointercancel', 'scroll'].forEach(function (t) { document.addEventListener(t, endPress, true); });
  document.addEventListener('contextmenu', function (e) {
    if (ctx.longPress && Date.now() - ctx.longPress < 1500) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  document.addEventListener('click', function (e) {
    if (ctx.longPress && Date.now() - ctx.longPress < 1500 && !(e.target.closest && e.target.closest('.context-menu'))) {
      ctx.longPress = 0;
      e.preventDefault(); e.stopImmediatePropagation();
    }
  }, true);

  window.pudlMenu = {
    refresh: segMenus,
    place: function (panel) { if (isOpen(panel)) { place(panel); panel.classList.remove('placing'); } },
    openAt: openAt,
    updateContext: updateContext,
    closeContext: function () { closeContext(0); }
  };

  /* Choosing a row or an action closes the panel. A row that leaves the page
     would close it anyway, but a row that opens a window, or an action that
     stays on the page, would otherwise leave it open. */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var chosen = t.closest('.menu-panel a.md-item, .menu-panel .menu-action');
    if (!chosen) return;
    var panel = chosen.closest('.menu-panel');
    if (panel && isOpen(panel)) panel.hidePopover();
  });

  /* A filter menu: a panel marked
     data-filter-menu holds checkbox rows, each box belonging to the
     filter's form, by its form attribute or by sitting in it. Ticking a box
     sends the form at once. Where pudl-regions.js turns that into a swap of
     the regions that hold the menu, the panel with the same id opens again
     on the new page, once every other listener has rebuilt it, with focus
     on the same box, so several boxes can be ticked in a row. Where the
     form loads a whole page, the browser does. */
  var reopen = null;
  document.addEventListener('change', function (e) {
    var box = e.target;
    if (!box || box.type !== 'checkbox' || !box.closest) return;
    var panel = box.closest('.menu-panel[data-filter-menu]');
    if (!panel || !panel.id || !box.form) return;
    reopen = { panel: panel.id, name: box.name, value: box.value };
    if (box.form.requestSubmit) box.form.requestSubmit(); else box.form.submit();
  });
  document.addEventListener('pudl:regions-swap', function () {
    var was = reopen;
    reopen = null;
    if (!was) return;
    requestAnimationFrame(function () {
      var panel = document.getElementById(was.panel);
      if (!panel || !panel.showPopover || isOpen(panel)) return;
      panel.showPopover();
      /* A panel hidden for placing cannot take focus, so it is placed now. */
      place(panel);
      panel.classList.remove('placing');
      var box = panel.querySelector('input[type="checkbox"][name="' + CSS.escape(was.name) + '"][value="' + CSS.escape(was.value) + '"]');
      if (box) box.focus();
    });
  });
})();
