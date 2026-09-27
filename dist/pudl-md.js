/* PUDL master-detail. Load with defer. Makes the .md-resize divider between
   a master-detail sidebar and its detail pane move, by pointer and by
   keyboard.

   Dragging the divider sets --md-sidebar-w on the .md-layout, and the
   stylesheet holds the width between --md-sidebar-min (180px unless a theme
   says otherwise) and half the layout. With the divider focused, Left and
   Right move it a step, Shift with them a larger step, and Home and End go
   to the limits. A double-click returns it to the default width. On a
   layout narrow enough to show one pane at a time the divider is hidden,
   and nothing here applies.

   The divider is a focusable separator in the ARIA window-splitter pattern:
   the script gives it a tab stop and keeps aria-valuenow, aria-valuemin and
   aria-valuemax current, with aria-controls naming the sidebar.

   PUDL keeps no state. When a change ends, pudl:md-resize fires on the
   layout with detail.width in pixels, or detail.reset true after a
   double-click, and a project that wants the width remembered stores it.
   To avoid a jump on load, a project applies a stored width before the
   page is first drawn, from the server or from a line of inline script
   inside the layout; the README shows one. */
(function () {
  'use strict';

  var STEP = 16;          // px per arrow key
  var STEP_BIG = 64;      // px per arrow key with Shift
  var QUIET = 300;        // ms of keyboard quiet before the change is announced
  var timers = new WeakMap();
  var uid = 0;

  function parts(handle) {
    var layout = handle.closest('.md-layout');
    var body = handle.closest('.md-body');
    var side = body && body.querySelector(':scope > .md-sidebar');
    return layout && body && side ? { handle: handle, layout: layout, body: body, side: side } : null;
  }

  function limits(p) {
    var min = parseFloat(getComputedStyle(p.layout).getPropertyValue('--md-sidebar-min'));
    if (!isFinite(min)) min = 180;
    return { min: min, max: Math.max(min, p.body.clientWidth / 2) };
  }

  function width(p) { return Math.round(p.side.getBoundingClientRect().width); }

  /* In a right-to-left layout the sidebar is on the right, so the divider
     widens it by moving left, and the arrow keys follow what they point at. */
  function rtl(p) { return getComputedStyle(p.body).direction === 'rtl'; }

  function sync(p) {
    var l = limits(p);
    var h = p.handle;
    if (!p.side.id) p.side.id = 'md-sidebar-' + (++uid);
    h.setAttribute('role', 'separator');
    h.setAttribute('aria-orientation', 'vertical');
    h.setAttribute('aria-controls', p.side.id);
    if (!h.hasAttribute('aria-label')) h.setAttribute('aria-label', 'Resize the list');
    if (!h.hasAttribute('tabindex')) h.tabIndex = 0;
    h.setAttribute('aria-valuemin', String(Math.round(l.min)));
    h.setAttribute('aria-valuemax', String(Math.round(l.max)));
    h.setAttribute('aria-valuenow', String(width(p)));
    h.setAttribute('aria-valuetext', (h.getAttribute('data-md-valuetext') || '{n} pixels wide').split('{n}').join(String(width(p))));
  }

  function set(p, w) {
    var l = limits(p);
    w = Math.round(Math.min(l.max, Math.max(l.min, w)));
    p.layout.style.setProperty('--md-sidebar-w', w + 'px');
    sync(p);
  }

  function announce(p, reset) {
    p.layout.dispatchEvent(new CustomEvent('pudl:md-resize', {
      bubbles: true,
      detail: reset ? { width: width(p), reset: true } : { width: width(p), reset: false }
    }));
  }

  function handleFrom(e) {
    var h = e.target.closest && e.target.closest('.md-resize');
    return h && parts(h);
  }

  document.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    var p = handleFrom(e);
    if (!p) return;
    e.preventDefault();
    var startX = e.clientX;
    var startW = width(p);
    var sign = rtl(p) ? -1 : 1;
    var moved = false;
    p.handle.setPointerCapture(e.pointerId);
    p.handle.classList.add('dragging');

    function move(ev) {
      moved = true;
      set(p, startW + sign * (ev.clientX - startX));
    }
    function end() {
      p.handle.removeEventListener('pointermove', move);
      p.handle.removeEventListener('pointerup', end);
      p.handle.removeEventListener('pointercancel', end);
      p.handle.classList.remove('dragging');
      if (moved) announce(p, false);
    }
    p.handle.addEventListener('pointermove', move);
    p.handle.addEventListener('pointerup', end);
    p.handle.addEventListener('pointercancel', end);
  });

  document.addEventListener('dblclick', function (e) {
    var p = handleFrom(e);
    if (!p) return;
    p.layout.style.removeProperty('--md-sidebar-w');
    sync(p);
    announce(p, true);
  });

  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var p = handleFrom(e);
    if (!p || e.target !== p.handle) return;
    var l = limits(p);
    var w = width(p);
    var step = (e.shiftKey ? STEP_BIG : STEP) * (rtl(p) ? -1 : 1);
    if (e.key === 'ArrowLeft') w -= step;
    else if (e.key === 'ArrowRight') w += step;
    else if (e.key === 'Home') w = l.min;
    else if (e.key === 'End') w = l.max;
    else return;
    e.preventDefault();
    set(p, w);
    clearTimeout(timers.get(p.handle));
    timers.set(p.handle, setTimeout(function () { announce(p, false); }, QUIET));
  });

  function syncAll() {
    document.querySelectorAll('.md-resize').forEach(function (h) {
      var p = parts(h);
      if (p) sync(p);
    });
  }

  /* The limits follow the layout's width, and a region swap may bring in a
     new sidebar, so the divider's values are refreshed when either happens. */
  window.addEventListener('resize', syncAll);
  document.addEventListener('pudl:regions-swap', syncAll);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncAll);
  else syncAll();
})();
