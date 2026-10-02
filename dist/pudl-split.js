/* PUDL splitters. Load with defer.

     <div class="split" style="--split-a: 240px">
       <div class="split-pane">…</div>
       <div class="split-handle" aria-label="Resize the folders"
            data-split-min="140" data-split-max="60%"></div>
       <div class="split-pane">…</div>
     </div>

   The handle between two panes resizes the first, by pointer and by
   keyboard. It sets the first pane's size as a custom property on the
   .split, --split-a unless the handle's data-split-prop names another,
   and the stylesheet does the layout. On a .split.stacked the panes are
   one above the other and the handle moves up and down.

   The handle is a focusable separator in the ARIA window-splitter pattern,
   with its values kept current. The arrow keys along its axis move it a
   step, and with Shift a larger step; Home and End go to its limits; Enter
   or a double-click returns the stylesheet's own size. Its limits are
   data-split-min, in pixels, 80 unless it says otherwise, and
   data-split-max, in pixels or as a percentage of the split, by default
   all but the minimum, so the second pane never vanishes. The limits hold
   however the size was set, and are checked again as the split narrows.

   PUDL keeps no state. When a change ends, pudl:split fires on the handle
   with detail.size in pixels, or null after a return to the stylesheet's
   size, and a project that wants the size remembered stores it and
   renders it next time. The words the handle speaks come from its
   data-split-valuetext, with {n} for the size, or are "{n} pixels". */
(function () {
  'use strict';

  var STEP = 16;          // px per arrow key
  var STEP_BIG = 64;      // px per arrow key with Shift
  var QUIET = 300;        // ms of keyboard quiet before the change is announced
  var MIN = 80;           // px, the smallest either pane may be by default
  var timers = new WeakMap();
  var uid = 0;
  var cancelDrag = null;

  function single(p) { return /^(first|second)$/.test(p.split.getAttribute('data-split-pane')); }

  function parts(handle) {
    var split = handle.parentElement;
    if (!split || !split.classList.contains('split')) return null;
    var first = handle.previousElementSibling;
    if (!first) return null;
    var stacked = split.classList.contains('stacked');
    return { handle: handle, split: split, first: first, stacked: stacked,
             prop: handle.getAttribute('data-split-prop') || '--split-a' };
  }

  function span(p) {
    var r = p.split.getBoundingClientRect();
    var css = getComputedStyle(p.split);
    var edges = p.stacked ? ['Top', 'Bottom'] : ['Left', 'Right'];
    var space = p.stacked ? r.height : r.width;
    edges.forEach(function (edge) { space -= parseFloat(css['border' + edge + 'Width']) + parseFloat(css['padding' + edge]); });
    return Math.max(0, space);
  }

  function limits(p) {
    var whole = span(p);
    var track = p.handle.getBoundingClientRect();
    var available = Math.max(0, whole - (p.stacked ? track.height : track.width));
    var min = parseFloat(p.handle.getAttribute('data-split-min'));
    if (!isFinite(min)) min = MIN;
    min = Math.max(0, Math.min(min, available / 2));
    var maxAttr = p.handle.getAttribute('data-split-max');
    var max = available - min;
    if (maxAttr) {
      var n = parseFloat(maxAttr);
      if (isFinite(n)) max = Math.min(max, /%\s*$/.test(maxAttr) ? whole * n / 100 : n);
    }
    return { min: min, max: Math.max(min, max) };
  }

  function size(p) {
    var r = p.first.getBoundingClientRect();
    return Math.round(p.stacked ? r.height : r.width);
  }

  /* In a right-to-left split the first pane is on the right, so the handle
     widens it by moving left, and the arrow keys follow what they point at. */
  function sign(p) { return !p.stacked && getComputedStyle(p.split).direction === 'rtl' ? -1 : 1; }

  function sync(p, l, now) {
    l = l || limits(p);
    now = now == null ? size(p) : now;
    var h = p.handle;
    if (!p.first.id) p.first.id = 'pudl-split-' + (++uid);
    h.setAttribute('role', 'separator');
    h.setAttribute('aria-orientation', p.stacked ? 'horizontal' : 'vertical');
    h.setAttribute('aria-controls', p.first.id);
    if (!h.hasAttribute('tabindex')) h.tabIndex = 0;
    h.setAttribute('aria-valuemin', String(Math.round(l.min)));
    h.setAttribute('aria-valuemax', String(Math.round(l.max)));
    h.setAttribute('aria-valuenow', String(now));
    h.setAttribute('aria-valuetext', (h.getAttribute('data-split-valuetext') || '{n} pixels').split('{n}').join(String(now)));
  }

  function set(p, px, l) {
    l = l || limits(p);
    px = Math.round(Math.min(l.max, Math.max(l.min, px)));
    p.split.style.setProperty(p.prop, px + 'px');
    sync(p, l, px);
    return px;
  }

  function announce(p, px) {
    p.handle.dispatchEvent(new CustomEvent('pudl:split', { bubbles: true, detail: { size: px } }));
  }

  function handleOf(e) {
    var h = e.target.closest && e.target.closest('.split > .split-handle');
    var p = h && parts(h);
    return p && !single(p) && span(p) > 0 ? p : null;
  }

  document.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    var p = handleOf(e);
    if (!p) return;
    e.preventDefault();
    /* Measured once, at the start; the size follows the pointer once a
       frame however many pointer events arrive. */
    var start = p.stacked ? e.clientY : e.clientX;
    var last = start;
    var startSize = size(p);
    var original = p.split.style.getPropertyValue(p.prop);
    var l = limits(p);
    var dir = sign(p);
    var moved = false, frame = 0, px = startSize;
    p.handle.setPointerCapture(e.pointerId);
    p.handle.classList.add('dragging');
    function step() { frame = 0; px = set(p, startSize + dir * (last - start), l); }
    function move(ev) {
      moved = true;
      last = p.stacked ? ev.clientY : ev.clientX;
      if (!frame) frame = requestAnimationFrame(step);
    }
    function end(ev) {
      cancelDrag = null;
      p.handle.removeEventListener('pointermove', move);
      p.handle.removeEventListener('pointerup', end);
      p.handle.removeEventListener('pointercancel', end);
      var cancelled = ev.type === 'pointercancel' || ev.type === 'presentation';
      if (frame) { cancelAnimationFrame(frame); if (!cancelled) step(); }
      p.handle.classList.remove('dragging');
      if (p.handle.hasPointerCapture(e.pointerId)) p.handle.releasePointerCapture(e.pointerId);
      if (cancelled) {
        if (original) p.split.style.setProperty(p.prop, original);
        else p.split.style.removeProperty(p.prop);
        if (!single(p)) sync(p);
      } else if (moved) announce(p, px);
    }
    p.handle.addEventListener('pointermove', move);
    p.handle.addEventListener('pointerup', end);
    p.handle.addEventListener('pointercancel', end);
    cancelDrag = function () { end({ type: 'presentation' }); };
  });

  function reset(p) {
    p.split.style.removeProperty(p.prop);
    sync(p);
    announce(p, null);
  }

  document.addEventListener('dblclick', function (e) {
    var p = handleOf(e);
    if (p) reset(p);
  });

  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var p = handleOf(e);
    if (!p || e.target !== p.handle) return;
    if (e.key === 'Enter') { e.preventDefault(); reset(p); return; }
    var l = limits(p);
    var now = size(p);
    var step = (e.shiftKey ? STEP_BIG : STEP) * sign(p);
    var less = p.stacked ? 'ArrowUp' : 'ArrowLeft', more = p.stacked ? 'ArrowDown' : 'ArrowRight';
    var px;
    if (e.key === less) px = now - step;
    else if (e.key === more) px = now + step;
    else if (e.key === 'Home') px = l.min;
    else if (e.key === 'End') px = l.max;
    else return;
    e.preventDefault();
    px = set(p, px, l);
    clearTimeout(timers.get(p.handle));
    timers.set(p.handle, setTimeout(function () { announce(p, px); }, QUIET));
  });

  /* The limits follow the split's size, whatever changed it, a window being
     resized as much as the browser, and a set size beyond a new limit is
     brought back within it. */
  var watch = window.ResizeObserver ? new ResizeObserver(function () { syncAll(); }) : null;
  function syncAll() {
    document.querySelectorAll('.split > .split-handle').forEach(function (h) {
      var p = parts(h);
      if (!p) return;
      if (watch) watch.observe(p.split);
      if (single(p) || !span(p)) {
        clearTimeout(timers.get(h));
        if (h.classList.contains('dragging') && cancelDrag) cancelDrag();
        return;
      }
      var l = limits(p);
      var now = size(p);
      if (p.split.style.getPropertyValue(p.prop) && (now > l.max || now < l.min)) set(p, now, l);
      else sync(p, l, now);
    });
  }

  window.pudlSplit = { refresh: syncAll };
  new MutationObserver(syncAll).observe(document.documentElement, { subtree: true, attributes: true,
    attributeFilter: ['data-split-pane'] });
  window.addEventListener('resize', syncAll);
  document.addEventListener('pudl:regions-swap', syncAll);
  document.addEventListener('pudl:window-open', syncAll);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncAll);
  else syncAll();
})();
