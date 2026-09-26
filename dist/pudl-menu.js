/* PUDL menus. Load after pudl.css, with defer or at the end of <body>.

   A menu panel is an HTML popover, so it opens, closes and stacks above
   everything without this script. The script adds three things:
     - it places the panel against the button that opened it, below the
       button or above it when there is more room there, and on a narrow
       screen as a sheet across the full width;
     - Up and Down move between the panel's rows, and Down on the button
       opens the panel and moves into it;
     - an .md-filter input in a panel narrows its rows as the reader types,
       hides a section whose rows all go, and Enter follows the first row
       that is left. Without script the filter is whatever form holds it. */
(function () {
  'use strict';

  var GAP = 4;          // px between the button and the panel
  var EDGE = 8;         // px the panel keeps from the edges of the window
  var NARROW = 640;     // at or below this window width the panel is a sheet
  var ITEMS = 'a.md-item, .menu-action, .md-filter';

  function invokerOf(panel) {
    return panel.id ? document.querySelector('[popovertarget="' + CSS.escape(panel.id) + '"]') : null;
  }

  function isOpen(panel) { return panel.matches(':popover-open'); }

  /* Places an open panel against its button. The panel is a popover in the
     top layer, which is positioned against the window, so the button's
     rectangle is all that is needed. */
  function place(panel) {
    var btn = invokerOf(panel);
    if (!btn) return;
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
    panel.style.maxHeight = '';
    var natural = panel.scrollHeight;
    var down = narrow || below >= natural || below >= above;
    panel.style.maxHeight = Math.max(120, Math.min(natural, down ? below : above)) + 'px';

    if (!narrow) {
      var w = panel.offsetWidth;
      panel.style.left = Math.max(EDGE, Math.min(r.left, vw - w - EDGE)) + 'px';
    }
    panel.style.top = (down ? r.bottom + GAP : Math.max(EDGE, r.top - GAP - panel.offsetHeight)) + 'px';
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
      empty.textContent = 'Nothing matches.';
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
    if (e.newState === 'open') panel.classList.add('placing');
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

  function placeOpen() {
    document.querySelectorAll('.menu-panel').forEach(function (p) { if (isOpen(p)) place(p); });
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
