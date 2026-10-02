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
  var ITEMS = 'a.md-item, .menu-action, .md-filter';

  /* An explicit anchor selects the placement when several controls target
     one panel. Otherwise use its native popover invoker. */
  function invokerOf(panel) {
    var anchor = panel.getAttribute('data-menu-anchor');
    var explicit = anchor ? document.getElementById(anchor) : null;
    if (explicit) return explicit;
    return panel.id ? document.querySelector('[popovertarget="' + CSS.escape(panel.id) + '"]') : null;
  }

  function isOpen(panel) { return panel.matches(':popover-open'); }

  /* Places an open panel against its button. The panel is a popover in the
     top layer, which is positioned against the window, so the button's
     rectangle is all that is needed. */
  function place(panel) {
    var btn = invokerOf(panel);
    if (!btn) { placeAsPalette(panel); return; }
    var r = btn.getBoundingClientRect();
    var vw = document.documentElement.clientWidth;
    var vh = window.innerHeight;
    var narrow = vw <= NARROW;

    panel.classList.toggle('sheet', narrow);
    panel.style.margin = '0';
    panel.style.inset = 'auto';
    panel.style.width = narrow ? vw + 'px' : '';
    panel.style.left = narrow ? '0px' : '';

    var below = vh - r.bottom - GAP - EDGE;
    var above = r.top - GAP - EDGE;
    /* The panel's natural height is its whole rectangle, borders included
       and unrounded, rounded up: scrollHeight leaves out the border and
       rounds down, which left a panel a fraction short of its content and
       showing a scrollbar it did not need. */
    panel.style.maxHeight = '';
    var natural = Math.ceil(panel.getBoundingClientRect().height);
    var down = narrow || below >= natural || below >= above;
    panel.style.maxHeight = Math.max(120, Math.min(natural, down ? below : above)) + 'px';

    if (!narrow) {
      /* The panel lines up with the button's start edge: its left in a
         left-to-right page, its right in a right-to-left one. */
      var w = panel.offsetWidth;
      var start = getComputedStyle(btn).direction === 'rtl' ? r.right - w : r.left;
      panel.style.left = Math.max(EDGE, Math.min(start, vw - w - EDGE)) + 'px';
    }
    panel.style.top = (down ? r.bottom + GAP : Math.max(EDGE, r.top - GAP - panel.offsetHeight)) + 'px';
  }

  /* A panel with no button, summoned only by its key, opens where keyboard
     palettes conventionally sit: centred, a little below the top of the
     window. */
  function placeAsPalette(panel) {
    var vw = document.documentElement.clientWidth;
    var vh = window.innerHeight;
    var narrow = vw <= NARROW;
    panel.classList.toggle('sheet', narrow);
    panel.style.margin = '0';
    panel.style.inset = 'auto';
    panel.style.width = narrow ? vw + 'px' : '';
    var top = narrow ? 0 : Math.round(vh * 0.15);
    panel.style.maxHeight = Math.max(160, vh - top - EDGE) + 'px';
    panel.style.left = narrow ? '0px' : Math.max(EDGE, Math.round((vw - panel.offsetWidth) / 2)) + 'px';
    panel.style.top = top + 'px';
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
    if (!panel.classList || !panel.classList.contains('menu-panel')) return;
    /* The filter starts empty every time the panel opens. beforetoggle
       fires for every opening, whereas the toggle events of a quick close
       and reopen can be merged into one, so the clearing belongs here. */
    if (e.newState === 'open') {
      panel.classList.add('placing');
      resetFilter(panel);
    }
  }, true);

  document.addEventListener('toggle', function (e) {
    var panel = e.target;
    if (!panel.classList || !panel.classList.contains('menu-panel')) return;
    if (e.newState === 'open') {
      place(panel);
      panel.classList.remove('placing');
    } else {
      panel.classList.remove('placing');
      resetFilter(panel);
    }
  }, true);

  /* An open panel follows its button when the page scrolls or the window
     resizes, once a frame however many events arrive. Scrolling the
     panel's own rows moves nothing, so it is ignored. */
  var placing = 0;
  function placeOpen(e) {
    if (e && e.type === 'scroll' && e.target.closest && e.target.closest('.menu-panel')) return;
    if (placing) return;
    placing = requestAnimationFrame(function () {
      placing = 0;
      document.querySelectorAll('.menu-panel').forEach(function (p) { if (isOpen(p)) place(p); });
    });
  }
  window.addEventListener('resize', placeOpen);
  window.addEventListener('scroll', placeOpen, true);

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
  window.pudlMenu = {
    refresh: segMenus,
    place: function (panel) { if (isOpen(panel)) { place(panel); panel.classList.remove('placing'); } }
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
})();
