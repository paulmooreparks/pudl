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
    return layout && !layout.hasAttribute('data-md-persistent') && body && side ? { handle: handle, layout: layout, body: body, side: side } : null;
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

  /* Brings the divider's attributes up to date. l and now, the limits and
     the width, may be passed in by a caller that already knows them, since
     measuring them forces the page to be laid out. */
  function sync(p, l, now) {
    l = l || limits(p);
    now = now == null ? width(p) : now;
    var h = p.handle;
    if (!p.side.id) p.side.id = 'md-sidebar-' + (++uid);
    h.setAttribute('role', 'separator');
    h.setAttribute('aria-orientation', 'vertical');
    h.setAttribute('aria-controls', p.side.id);
    if (!h.hasAttribute('aria-label')) h.setAttribute('aria-label', 'Resize the list');
    if (!h.hasAttribute('tabindex')) h.tabIndex = 0;
    h.setAttribute('aria-valuemin', String(Math.round(l.min)));
    h.setAttribute('aria-valuemax', String(Math.round(l.max)));
    h.setAttribute('aria-valuenow', String(now));
    h.setAttribute('aria-valuetext', (h.getAttribute('data-md-valuetext') || '{n} pixels wide').split('{n}').join(String(now)));
  }

  /* The stylesheet holds the sidebar to the same limits, so the width set
     here is the width the sidebar takes, and nothing needs measuring. */
  function set(p, w, l) {
    l = l || limits(p);
    w = Math.round(Math.min(l.max, Math.max(l.min, w)));
    p.layout.style.setProperty('--md-sidebar-w', w + 'px');
    sync(p, l, w);
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
    /* Measured once, at the start. Pointer events can arrive several times
       a frame, so each one only notes where the pointer is, and the width
       follows once a frame. */
    var startX = e.clientX, lastX = startX;
    var startW = width(p);
    var original = p.layout.style.getPropertyValue('--md-sidebar-w');
    clearTimeout(timers.get(p.handle));
    var l = limits(p);
    var sign = rtl(p) ? -1 : 1;
    var moved = false, frame = 0;
    p.handle.setPointerCapture(e.pointerId);
    p.handle.classList.add('dragging');

    function step() {
      frame = 0;
      set(p, startW + sign * (lastX - startX), l);
    }
    function move(ev) {
      moved = true;
      lastX = ev.clientX;
      if (!frame) frame = requestAnimationFrame(step);
    }
    function end(ev) {
      p.handle.removeEventListener('pointermove', move);
      p.handle.removeEventListener('pointerup', end);
      p.handle.removeEventListener('pointercancel', end);
      var cancelled = ev.type === 'pointercancel';
      if (frame) { cancelAnimationFrame(frame); if (!cancelled) step(); }
      p.handle.classList.remove('dragging');
      if (p.handle.hasPointerCapture(e.pointerId)) p.handle.releasePointerCapture(e.pointerId);
      if (cancelled) {
        if (original) p.layout.style.setProperty('--md-sidebar-w', original);
        else p.layout.style.removeProperty('--md-sidebar-w');
        sync(p);
      } else if (moved) announce(p, false);
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
    set(p, w, l);
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
/* Persistent master-detail handles. The host owns pane navigation; requests
   never change presentation until the host renders the accepted state. */
(function () {
  'use strict';
  var records = new Map(), uid = 0, requestId = 0;
  function number(el, name, fallback) {
    var raw = el.getAttribute(name), n = raw === null || raw.trim() === '' ? NaN : Number(raw);
    return isFinite(n) && n >= 0 ? n : fallback;
  }
  function contentWidth(el) {
    var c = getComputedStyle(el);
    return Math.max(0, el.clientWidth - parseFloat(c.paddingLeft) - parseFloat(c.paddingRight));
  }
  function config(p) {
    var whole = contentWidth(p.body), track = p.handle.getBoundingClientRect().width;
    var available = Math.max(0, whole - track);
    var min = Math.min(number(p.layout, 'data-md-min', 180), available / 2);
    var raw = p.layout.getAttribute('data-md-max') || '50%';
    var max = /^\d+(\.\d+)?%$/.test(raw) ? whole * parseFloat(raw) / 100 : Number(raw);
    if (!isFinite(max) || max < 0) max = whole / 2;
    return { min: min, max: Math.max(min, Math.min(max, available)),
      threshold: Math.min(min, number(p.layout, 'data-md-collapse-threshold', 40)) };
  }
  function requested(p) {
    var raw = getComputedStyle(p.layout).getPropertyValue('--md-requested-w').trim();
    // The registered property resolves lengths, including rem, to pixels.
    return Math.max(0, parseFloat(raw) || 0);
  }
  function state(p) {
    return { width: requested(p), effectiveWidth: Math.round(p.side.getBoundingClientRect().width),
      collapsed: p.layout.hasAttribute('data-md-collapsed'), narrow: p.narrow,
      pane: p.layout.getAttribute('data-md-pane') === 'detail' ? 'detail' : 'list' };
  }
  function emit(p, source, kind) {
    p.layout.dispatchEvent(new CustomEvent('pudl:md-change', { bubbles: true,
      detail: { source: source, kind: kind, state: state(p) } }));
  }
  function hide(p, el, hidden) {
    if (hidden && el.contains(document.activeElement)) p.handle.focus({ preventScroll: true });
    if (hidden && !p.inert.has(el)) { p.inert.set(el, el.inert); el.inert = true; }
    if (!hidden && p.inert.has(el)) { el.inert = p.inert.get(el); p.inert.delete(el); }
  }
  function sync(p) {
    var w = contentWidth(p.layout), bodyWidth = contentWidth(p.body), narrow = w <= 640;
    var direction = getComputedStyle(p.body).direction;
    var pane = p.layout.getAttribute('data-md-pane') === 'detail' ? 'detail' : 'list';
    var changed = p.narrow !== undefined && narrow !== p.narrow;
    if ((p.span !== undefined && (p.span !== w || p.bodySpan !== bodyWidth || p.direction !== direction)) || changed) {
      if (p.cancel) p.cancel();
      p.request = ++requestId;
    }
    if (p.pane !== undefined && pane !== p.pane) p.request = ++requestId;
    p.span = w; p.bodySpan = bodyWidth; p.direction = direction; p.narrow = narrow; p.pane = pane;
    var c = config(p), collapsed = p.layout.hasAttribute('data-md-collapsed');
    // Move focus before applying the derived classes that hide content.
    hide(p, p.side, narrow ? pane === 'detail' : collapsed);
    hide(p, p.detail, narrow && pane === 'list');
    p.layout.toggleAttribute('data-md-narrow', narrow);
    var effective = Math.min(c.max, Math.max(c.min, requested(p))) + 'px';
    if (p.layout.style.getPropertyValue('--md-effective-w') !== effective) p.layout.style.setProperty('--md-effective-w', effective);
    var h = p.handle;
    if (!p.side.id) p.side.id = 'pudl-sidebar-' + (++uid);
    h.setAttribute('role', 'separator'); h.setAttribute('aria-orientation', 'vertical');
    h.setAttribute('aria-controls', p.side.id);
    if (!h.hasAttribute('tabindex')) h.tabIndex = 0;
    if (!h.hasAttribute('aria-label')) h.setAttribute('aria-label', 'Sidebar');
    h.setAttribute('aria-valuemin', '0');
    h.setAttribute('aria-valuemax', String(narrow ? 100 : Math.round(c.max)));
    h.setAttribute('aria-valuenow', String(narrow ? (pane === 'list' ? 100 : 0) : collapsed ? 0 : Math.round(p.side.getBoundingClientRect().width)));
    var key = narrow ? (pane === 'list' ? 'list' : 'detail') : collapsed ? 'collapsed' : null;
    var fallback = { list: 'List shown', detail: 'Detail shown', collapsed: 'Sidebar collapsed' };
    h.setAttribute('aria-valuetext', key ? h.getAttribute('data-md-' + key + '-text') || fallback[key] :
      (h.getAttribute('data-md-valuetext') || '{n} pixels wide').replace('{n}', h.getAttribute('aria-valuenow')));
    var help = h.getAttribute(narrow ? 'data-md-narrow-help' : 'data-md-wide-help') ||
      (narrow ? 'Drag or use arrow keys to switch panes. Enter toggles.' : 'Drag or use arrow keys to resize. Enter toggles. Double-click resets.');
    h.title = help; h.setAttribute('aria-description', help);
    p.layout.querySelectorAll('[data-md-action="toggle"]').forEach(function (b) {
      if (b.closest('[data-md-persistent]') !== p.layout) return;
      b.setAttribute('aria-controls', p.side.id);
      b.setAttribute('aria-expanded', String(narrow ? pane === 'list' : !collapsed));
    });
    if (changed) emit(p, 'presentation', 'presentation');
  }
  function record(layout) { refresh(); return records.get(layout); }
  function request(p, pane, source) {
    if (pane === p.pane) return;
    var id = p.request = ++requestId;
    p.layout.dispatchEvent(new CustomEvent('pudl:md-request', { bubbles: true,
      detail: { pane: pane, source: source, requestId: id } }));
  }
  function commit(p, source, kind) {
    sync(p); emit(p, source, kind);
    if (!p.narrow && !p.layout.hasAttribute('data-md-collapsed') && (kind === 'width' || kind === 'reset')) {
      p.layout.dispatchEvent(new CustomEvent('pudl:md-resize', { bubbles: true,
        detail: { width: Math.round(p.side.getBoundingClientRect().width), reset: kind === 'reset' } }));
    }
  }
  function width(p, value) {
    p.layout.style.setProperty('--md-sidebar-w', value + 'px');
    p.layout.removeAttribute('data-md-collapsed');
  }
  function command(p, action, source, step) {
    if (!p || !/^(toggle|expand|collapse|increase|decrease|reset|maximum)$/.test(action)) return false;
    if (p.cancel) p.cancel();
    sync(p);
    if (p.narrow) {
      var pane = /^(expand|increase|maximum)$/.test(action) ? 'list' : /^(collapse|decrease)$/.test(action) ? 'detail' : p.pane === 'list' ? 'detail' : 'list';
      request(p, pane, source); return true;
    }
    var s = state(p), c = config(p), kind = 'collapse';
    if (action === 'toggle') action = s.collapsed ? 'expand' : 'collapse';
    if (action === 'collapse') p.layout.setAttribute('data-md-collapsed', '');
    else if (action === 'expand') p.layout.removeAttribute('data-md-collapsed');
    else if (action === 'reset') { width(p, number(p.layout, 'data-md-default-width', 260)); kind = 'reset'; }
    else if (action === 'maximum') { width(p, c.max); kind = 'width'; }
    else {
      var target = s.collapsed ? (action === 'increase' ? Math.max(c.min, s.width) : 0) : s.effectiveWidth + (action === 'increase' ? 1 : -1) * (step || 16);
      if (target < c.threshold || target <= 0) p.layout.setAttribute('data-md-collapsed', '');
      else { width(p, Math.min(c.max, Math.max(c.min, target))); kind = 'width'; }
    }
    commit(p, source, kind); return true;
  }
  function fromHandle(e) {
    var h = e.target.closest && e.target.closest('.md-resize');
    var p = h && records.get(h.closest('[data-md-persistent]'));
    return p && p.handle === h ? p : null;
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-md-action]');
    if (!b || b.disabled || b.getAttribute('aria-disabled') === 'true') return;
    var p = record(b.closest('[data-md-persistent]'));
    if (command(p, b.getAttribute('data-md-action'), 'button')) e.preventDefault();
  });
  document.addEventListener('keydown', function (e) {
    var p = fromHandle(e);
    if (!p || e.target !== p.handle || e.altKey || e.ctrlKey || e.metaKey) return;
    var rtl = getComputedStyle(p.body).direction === 'rtl';
    var action = e.key === 'Enter' ? 'toggle' : e.key === 'Home' ? 'collapse' : e.key === 'End' ? 'maximum' :
      e.key === 'ArrowLeft' ? (rtl ? 'increase' : 'decrease') : e.key === 'ArrowRight' ? (rtl ? 'decrease' : 'increase') : null;
    if (action) { e.preventDefault(); command(p, action, 'keyboard', e.shiftKey ? 64 : 16); }
  });
  document.addEventListener('dblclick', function (e) { var p = fromHandle(e); if (p) command(p, 'reset', 'pointer'); });
  document.addEventListener('pointerdown', function (e) {
    var p = fromHandle(e);
    if (!p || e.button !== 0 || p.cancel) return;
    sync(p); e.preventDefault(); p.handle.focus({ preventScroll: true });
    var start = state(p), original = p.layout.style.getPropertyValue('--md-sidebar-w');
    var priority = p.layout.style.getPropertyPriority('--md-sidebar-w');
    var x = e.clientX, last = x, sign = getComputedStyle(p.body).direction === 'rtl' ? -1 : 1;
    var c = config(p), moved = false, ended = false;
    p.handle.setPointerCapture(e.pointerId); p.handle.classList.add('dragging');
    function restore() {
      if (original) p.layout.style.setProperty('--md-sidebar-w', original, priority);
      else p.layout.style.removeProperty('--md-sidebar-w');
      p.layout.toggleAttribute('data-md-collapsed', start.collapsed);
    }
    function preview() {
      var target = start.effectiveWidth + sign * (last - x);
      if (target < c.threshold || target <= 0) { restore(); p.layout.setAttribute('data-md-collapsed', ''); }
      else width(p, Math.min(c.max, Math.max(c.min, target)));
      sync(p);
    }
    function move(ev) {
      if (ev.pointerId !== e.pointerId) return;
      last = ev.clientX; moved = moved || last !== x;
      if (!start.narrow) preview();
    }
    function end(ev) {
      if (ended || (ev.pointerId !== undefined && ev.pointerId !== e.pointerId)) return;
      ended = true; p.cancel = null;
      p.handle.removeEventListener('pointermove', move);
      p.handle.removeEventListener('pointerup', end);
      p.handle.removeEventListener('pointercancel', end);
      p.handle.removeEventListener('lostpointercapture', end);
      p.handle.classList.remove('dragging');
      if (p.handle.hasPointerCapture(e.pointerId)) p.handle.releasePointerCapture(e.pointerId);
      if (ev.type !== 'pointerup') { restore(); queueMicrotask(refresh); return; }
      last = ev.clientX;
      if (start.narrow) {
        var delta = sign * (last - x), threshold = number(p.layout, 'data-md-gesture', 24);
        if (delta !== 0 && ((start.pane === 'detail' && delta >= threshold) || (start.pane === 'list' && delta <= -threshold)))
          request(p, start.pane === 'detail' ? 'list' : 'detail', 'pointer');
      } else if (moved || last !== x) {
        preview(); commit(p, 'pointer', p.layout.hasAttribute('data-md-collapsed') !== start.collapsed ? 'collapse' : 'width');
      }
    }
    p.cancel = function () { end({ type: 'cancel' }); };
    p.handle.addEventListener('pointermove', move);
    p.handle.addEventListener('pointerup', end);
    p.handle.addEventListener('pointercancel', end);
    p.handle.addEventListener('lostpointercapture', end);
  });
  var observer = new ResizeObserver(function () { refresh(); });
  function refresh() {
    records.forEach(function (p, el) {
      if (!el.isConnected || !el.hasAttribute('data-md-persistent') || !p.handle.isConnected || p.handle.closest('[data-md-persistent]') !== el || !p.side.isConnected || !p.detail.isConnected) {
        if (p.cancel) p.cancel();
        p.inert.forEach(function (old, pane) { pane.inert = old; });
        observer.unobserve(el); observer.unobserve(p.body); records.delete(el);
        el.removeAttribute('data-md-narrow'); el.style.removeProperty('--md-effective-w');
      }
    });
    document.querySelectorAll('.md-layout[data-md-persistent]').forEach(function (el) {
      var p = records.get(el);
      if (!p) {
        var body = el.querySelector(':scope > .md-body');
        var h = body && body.querySelector(':scope > .md-resize');
        var side = body && body.querySelector(':scope > .md-sidebar'), detail = body && body.querySelector(':scope > .md-detail');
        if (!h || !side || !detail) return;
        p = { layout: el, body: body, handle: h, side: side, detail: detail, inert: new Map(), request: 0 };
        if (el.hasAttribute('data-md-default-width') && !el.style.getPropertyValue('--md-sidebar-w'))
          el.style.setProperty('--md-sidebar-w', number(el, 'data-md-default-width', 260) + 'px');
        records.set(el, p); observer.observe(el); observer.observe(body);
      }
      sync(p);
    });
  }
  window.pudlMd = {
    refresh: refresh,
    state: function (el) { var p = record(el); return p ? state(p) : null; },
    command: function (el, action) { return command(record(el), action, 'api'); },
    setPane: function (el, pane, id) {
      var p = record(el);
      if (!p || !/^(list|detail)$/.test(pane) || (id !== undefined && id !== p.request)) return false;
      if (p.cancel) p.cancel();
      p.request = ++requestId; p.pane = pane; el.setAttribute('data-md-pane', pane);
      commit(p, 'host', 'pane'); return true;
    }
  };
  new MutationObserver(refresh).observe(document.documentElement, { subtree: true, childList: true, attributes: true,
    attributeFilter: ['data-md-persistent', 'data-md-pane', 'data-md-collapsed', 'data-md-min', 'data-md-max', 'dir', 'style'] });
  document.addEventListener('pudl:regions-swap', refresh);
  window.addEventListener('resize', refresh);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh); else refresh();
})();
