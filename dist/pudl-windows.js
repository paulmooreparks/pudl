/* PUDL floating windows. Load after pudl-windows.css, at the end of <body>
   or with defer. The README sets out the markup and the URL grammar; this
   script only enhances what the server has already rendered.

   The URL is the whole state. A page with windows open can be bookmarked,
   reloaded and shared, and Back and Forward step between sets of open
   windows. Opening a window pushes a history entry, and every other change
   replaces the current one.

   Events, dispatched so a project can hook in without editing this file:
     pudl:window-place   on the layer, before a window opens with no placement
                         in the URL. A listener may set event.detail.placement
                         to {mode, x, y, w, h}, for example from saved state.
     pudl:window-open    on the window element, once it is in the page. Use it
                         to wire up the window's content, because scripts in a
                         fetched fragment do not run.
     pudl:windows-change on the layer, after every change, with the state in
                         event.detail. Use it to persist placements. */
(function () {
  'use strict';

  var MODES = ['floating', 'maximized', 'left', 'right'];
  var EDGES = ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'];
  var KEY_RE = /^[A-Za-z0-9_-]+$/;
  var SNAP_PX = 16;        // a drag ending this close to an edge snaps to it
  var CLICK_PX = 4;        // a press that moves less than this is a click
  var KEY_STEP = 0.02;     // arrow keys move or resize by this fraction
  var URL_DELAY = 300;     // ms of keyboard quiet before the URL is written

  var layer, ghost, srcTemplate;
  var state = { open: [], top: null, min: {}, place: {} };
  var wins = {};           // key -> window element
  var zOrder = [];         // keys, bottom to top
  var openers = {};        // key -> element that opened it, for returning focus
  var pending = {};        // key -> true while its window is loading
  var urlTimer = 0;
  var suppressClick = false;

  /* === State and URL ===================================================== */

  function copy(st) {
    var place = {};
    Object.keys(st.place).forEach(function (k) { place[k] = Object.assign({}, st.place[k]); });
    return { open: st.open.slice(), top: st.top, min: Object.assign({}, st.min), place: place };
  }

  function keyList(value) {
    var seen = {};
    return (value || '').split(',').filter(function (k) {
      if (!KEY_RE.test(k) || seen[k]) return false;
      seen[k] = true;
      return true;
    });
  }

  function clampPlacement(p, layerW, layerH) {
    var minW = Math.min(1, pxMin('--win-min-w', 320) / (layerW || 1));
    var minH = Math.min(1, pxMin('--win-min-h', 200) / (layerH || 1));
    var w = Math.min(1, Math.max(minW, p.w));
    var h = Math.min(1, Math.max(minH, p.h));
    return {
      mode: p.mode, w: w, h: h,
      x: Math.min(1 - w, Math.max(0, p.x)),
      y: Math.min(1 - h, Math.max(0, p.y))
    };
  }

  function validPlacement(p) {
    return !!p && MODES.indexOf(p.mode) >= 0 &&
      [p.x, p.y, p.w, p.h].every(function (n) { return typeof n === 'number' && isFinite(n) && n >= 0 && n <= 1; }) &&
      p.w > 0 && p.h > 0;
  }

  function parsePlacement(value) {
    var m = /^([a-z]+):([0-9.]+),([0-9.]+),([0-9.]+),([0-9.]+)$/.exec(value || '');
    if (!m) return null;
    var p = { mode: m[1], x: +m[2], y: +m[3], w: +m[4], h: +m[5] };
    return validPlacement(p) ? p : null;
  }

  function fmt(n) { return String(Math.round(n * 1000) / 1000); }

  function formatPlacement(p) {
    return p.mode + ':' + [p.x, p.y, p.w, p.h].map(fmt).join(',');
  }

  function readURL() {
    var q = new URLSearchParams(location.search);
    var st = { open: keyList(q.get('open')), top: null, min: {}, place: {} };
    keyList(q.get('min')).forEach(function (k) {
      if (st.open.indexOf(k) >= 0) st.min[k] = true;
    });
    st.open.forEach(function (k) {
      var p = parsePlacement(q.get('p.' + k));
      if (p) st.place[k] = p;
    });
    var top = q.get('top');
    st.top = (top && st.open.indexOf(top) >= 0 && !st.min[top]) ? top : null;
    return st;
  }

  /* The URL for a state, keeping every query parameter that is not ours.
     Keys, modes and numbers need no escaping, so the window parameters are
     written out by hand and stay readable. */
  function urlFor(st) {
    var q = new URLSearchParams(location.search);
    Array.from(q.keys()).forEach(function (k) {
      if (k === 'open' || k === 'top' || k === 'min' || k.indexOf('p.') === 0) q.delete(k);
    });
    var parts = [];
    var rest = q.toString();
    if (rest) parts.push(rest);
    if (st.open.length) {
      parts.push('open=' + st.open.join(','));
      if (st.top) parts.push('top=' + st.top);
      var mins = st.open.filter(function (k) { return st.min[k]; });
      if (mins.length) parts.push('min=' + mins.join(','));
      st.open.forEach(function (k) {
        if (st.place[k]) parts.push('p.' + k + '=' + formatPlacement(st.place[k]));
      });
    }
    return location.pathname + (parts.length ? '?' + parts.join('&') : '') + location.hash;
  }

  /* The topmost visible window other than the one given, for when the top
     window is minimised or closed. */
  function nextTop(st, except) {
    for (var i = zOrder.length - 1; i >= 0; i--) {
      var k = zOrder[i];
      if (k !== except && st.open.indexOf(k) >= 0 && !st.min[k]) return k;
    }
    return null;
  }

  /* === Operations, each returning a new state ============================= */

  function raised(st, key) {
    st = copy(st);
    delete st.min[key];
    st.top = key;
    return st;
  }

  function minimized(st, key) {
    st = copy(st);
    st.min[key] = true;
    if (st.top === key) st.top = nextTop(st, key);
    return st;
  }

  function maximizeToggled(st, key) {
    st = raised(st, key);
    var p = st.place[key];
    p.mode = p.mode === 'floating' ? 'maximized' : 'floating';
    return st;
  }

  function closed(st, key) {
    st = copy(st);
    st.open = st.open.filter(function (k) { return k !== key; });
    delete st.min[key];
    delete st.place[key];
    if (st.top === key) st.top = nextTop(st, key);
    return st;
  }

  /* A dock tab raises its window, or minimises it if it is already on top,
     as a taskbar does. */
  function tabbed(st, key) {
    return st.top === key && !st.min[key] ? minimized(st, key) : raised(st, key);
  }

  /* === Applying state to the page ======================================== */

  function setPlacement(el, p) {
    el.setAttribute('data-win-mode', p.mode);
    el.style.setProperty('--win-x', fmt(p.x));
    el.style.setProperty('--win-y', fmt(p.y));
    el.style.setProperty('--win-w', fmt(p.w));
    el.style.setProperty('--win-h', fmt(p.h));
  }

  function titleOf(key) {
    var t = wins[key] && wins[key].querySelector('.win-title');
    return t ? t.textContent.trim() : key;
  }

  function apply(st) {
    Object.keys(wins).forEach(function (k) {
      if (st.open.indexOf(k) < 0) { wins[k].remove(); delete wins[k]; }
    });
    zOrder = zOrder.filter(function (k) { return st.open.indexOf(k) >= 0; });
    st.open.forEach(function (k) { if (zOrder.indexOf(k) < 0) zOrder.push(k); });
    if (st.top) { zOrder.splice(zOrder.indexOf(st.top), 1); zOrder.push(st.top); }

    zOrder.forEach(function (k, i) {
      var el = wins[k];
      setPlacement(el, st.place[k]);
      el.hidden = !!st.min[k];
      el.classList.toggle('active', k === st.top);
      el.style.zIndex = String(i + 1);
    });
    state = st;
    updateLinks();
    renderDocks();
  }

  /* Every window button and dock tab is a real link to the state it
     produces, so middle-click, copy-link and a page without script all work. */
  function updateLinks() {
    state.open.forEach(function (k) {
      var el = wins[k];
      setHref(el.querySelector('[data-win-action="minimize"]'), urlFor(minimized(state, k)));
      setHref(el.querySelector('[data-win-action="close"]'), urlFor(closed(state, k)));
      var max = el.querySelector('[data-win-action="maximize"]');
      setHref(max, urlFor(maximizeToggled(state, k)));
      if (max) {
        var label = state.place[k].mode === 'floating' ? 'Maximize' : 'Restore';
        max.setAttribute('aria-label', label);
        max.setAttribute('title', label);
      }
    });
  }

  function setHref(a, href) { if (a && a.tagName === 'A') a.setAttribute('href', href); }

  function renderDocks() {
    document.querySelectorAll('[data-win-dock]').forEach(function (dock) {
      dock.textContent = '';
      state.open.forEach(function (k) {
        var a = document.createElement('a');
        a.className = 'win-tab' + (state.min[k] ? ' minimized' : '');
        a.href = urlFor(tabbed(state, k));
        a.setAttribute('data-win-tab', k);
        if (k === state.top) a.setAttribute('aria-current', 'true');
        a.textContent = titleOf(k);
        a.title = titleOf(k) + (state.min[k] ? ' (minimized)' : '');
        dock.appendChild(a);
      });
    });
  }

  /* Applies a state and records it in the URL. Opening a window pushes a
     history entry; everything else replaces the current one. */
  function commit(st, push) {
    clearTimeout(urlTimer);
    apply(st);
    var url = urlFor(st);
    if (url !== location.pathname + location.search + location.hash) {
      history[push ? 'pushState' : 'replaceState'](history.state, '', url);
    }
    layer.dispatchEvent(new CustomEvent('pudl:windows-change', { detail: copy(st) }));
  }

  /* For keyboard moves: the page follows each key at once, and the URL is
     written once the keys go quiet, since browsers limit how often a page
     may replace its history entry. */
  function commitSoon(st) {
    apply(st);
    clearTimeout(urlTimer);
    urlTimer = setTimeout(function () { commit(state, false); }, URL_DELAY);
  }

  /* === Loading and adopting windows ====================================== */

  function srcFor(key) {
    return srcTemplate ? srcTemplate.split('{key}').join(encodeURIComponent(key)) : '';
  }

  /* Finds a window's markup: in a <template> when the source starts with #,
     otherwise fetched from the server, which returns the same markup it
     renders into the page. */
  function load(key) {
    var src = srcFor(key);
    if (!src) return Promise.reject(new Error('no data-win-src on the layer'));
    var got;
    if (src.charAt(0) === '#') {
      var t = document.getElementById(src.slice(1));
      got = t ? Promise.resolve(t.content.cloneNode(true)) : Promise.reject(new Error('no template ' + src));
    } else {
      got = fetch(src, { credentials: 'same-origin', headers: { Accept: 'text/html' } })
        .then(function (r) {
          if (!r.ok) throw new Error(src + ' returned ' + r.status);
          return r.text();
        })
        .then(function (html) {
          var t = document.createElement('template');
          t.innerHTML = html;
          return t.content;
        });
    }
    return got.then(function (frag) {
      var el = frag.querySelector('.win[data-win="' + key + '"]') || frag.querySelector('.win');
      if (!el) throw new Error(src + ' holds no .win element');
      el.setAttribute('data-win', key);
      return document.importNode(el, true);
    });
  }

  function adopt(el) {
    var key = el.getAttribute('data-win');
    wins[key] = el;
    if (!el.parentNode || el.parentNode !== layer) layer.insertBefore(el, ghost);

    EDGES.forEach(function (edge) {
      if (el.querySelector(':scope > .win-rh[data-edge="' + edge + '"]')) return;
      var h = document.createElement('div');
      h.className = 'win-rh';
      h.setAttribute('data-edge', edge);
      h.setAttribute('aria-hidden', 'true');
      el.appendChild(h);
    });

    var title = el.querySelector('.win-title');
    if (title && !title.id) title.id = 'win-' + key + '-title';
    if (!el.hasAttribute('role')) el.setAttribute('role', 'dialog');
    if (title && !el.hasAttribute('aria-labelledby')) el.setAttribute('aria-labelledby', title.id);

    var head = el.querySelector('.win-head');
    if (head) {
      /* A link's native drag would take the pointer away from a title-bar drag. */
      head.querySelectorAll('a').forEach(function (a) { a.draggable = false; });
      head.tabIndex = 0;
      head.setAttribute('aria-label', 'Window: ' + titleOf(key) +
        '. Arrow keys move it, Shift with arrow keys resizes it, Enter maximizes or restores it.');
    }
    return el;
  }

  /* The placement a window opens with when the URL gives none: whatever a
     pudl:window-place listener supplies, then the server's style attribute,
     then a cascade from the top left. */
  function initialPlacement(key, el, index) {
    var ev = new CustomEvent('pudl:window-place', { detail: { key: key, placement: null } });
    layer.dispatchEvent(ev);
    if (validPlacement(ev.detail.placement)) return Object.assign({}, ev.detail.placement);

    var s = el.style;
    var fromStyle = {
      mode: MODES.indexOf(el.getAttribute('data-win-mode')) >= 0 ? el.getAttribute('data-win-mode') : 'floating',
      x: parseFloat(s.getPropertyValue('--win-x')), y: parseFloat(s.getPropertyValue('--win-y')),
      w: parseFloat(s.getPropertyValue('--win-w')), h: parseFloat(s.getPropertyValue('--win-h'))
    };
    if (validPlacement(fromStyle)) return fromStyle;

    var step = (index % 6) * 0.04;
    return { mode: 'floating', x: 0.06 + step, y: 0.05 + step, w: 0.55, h: 0.75 };
  }

  function announceOpen(el) {
    el.dispatchEvent(new CustomEvent('pudl:window-open', { bubbles: true }));
  }

  function focusWindow(key) {
    var head = wins[key] && wins[key].querySelector('.win-head');
    if (head) head.focus({ preventScroll: true });
  }

  function open(key, from) {
    if (wins[key]) {
      commit(raised(state, key), false);
      focusWindow(key);
      return;
    }
    if (pending[key]) return;
    pending[key] = true;
    load(key).then(function (el) {
      delete pending[key];
      if (wins[key]) return;            // opened meanwhile, by Back or Forward
      adopt(el);
      var st = copy(state);
      st.open.push(key);
      st.place[key] = clampPlacement(initialPlacement(key, el, st.open.length - 1), layer.clientWidth, layer.clientHeight);
      st.top = key;
      openers[key] = from || null;
      commit(st, true);
      announceOpen(el);
      focusWindow(key);
    }, function (err) {
      delete pending[key];
      /* The window could not be built, so fall back on the item's own page,
         which is where the link pointed all along. */
      if (window.console) console.warn('pudl-windows:', err.message);
      if (from && from.href) location.href = from.href;
    });
  }

  function close(key) {
    var back = openers[key];
    delete openers[key];
    commit(closed(state, key), false);
    if (back && back.isConnected) back.focus();
    else if (state.top) focusWindow(state.top);
  }

  /* Brings the page in line with a URL, after Back or Forward or at start. */
  function sync(push) {
    var st = readURL();
    var missing = st.open.filter(function (k) { return !wins[k]; });
    return Promise.all(missing.map(function (k) {
      return load(k).then(function (el) { adopt(el); announceOpen(el); return null; },
                          function (err) {
                            if (window.console) console.warn('pudl-windows:', err.message);
                            return k;
                          });
    })).then(function (failed) {
      failed.forEach(function (k) { if (k) st = closed(st, k); });
      st.open.forEach(function (k, i) {
        var p = st.place[k] || initialPlacement(k, wins[k], i);
        st.place[k] = clampPlacement(p, layer.clientWidth, layer.clientHeight);
      });
      if (!st.top) st.top = st.open.filter(function (k) { return !st.min[k]; }).pop() || null;
      commit(st, push);
    });
  }

  /* === Dragging, resizing and snapping =================================== */

  function snapAt(clientX, clientY, r) {
    if (clientY - r.top < SNAP_PX) return 'maximized';
    if (clientX - r.left < SNAP_PX) return 'left';
    if (r.right - clientX < SNAP_PX) return 'right';
    return null;
  }

  function showGhost(mode) {
    if (!mode) { ghost.hidden = true; return; }
    var g = { maximized: [0, 0, 100, 100], left: [0, 0, 50, 100], right: [50, 0, 50, 100] }[mode];
    ghost.style.left = g[0] + '%'; ghost.style.top = g[1] + '%';
    ghost.style.width = g[2] + '%'; ghost.style.height = g[3] + '%';
    ghost.hidden = false;
  }

  function pxMin(prop, fallback) {
    var v = parseFloat(getComputedStyle(layer).getPropertyValue(prop));
    return isFinite(v) ? v : fallback;
  }

  /* One pointer gesture on a window: a drag of the title bar or a resize
     from an edge. The window follows the pointer directly, and the state is
     committed once, when the pointer lifts. */
  function gesture(e, key, edge) {
    var el = wins[key];
    var target = e.currentTarget;
    var r = layer.getBoundingClientRect();
    var start = Object.assign({}, state.place[key]);
    var base = start, baseX = e.clientX, baseY = e.clientY;
    var cur = start, snap = null, moved = false;

    target.setPointerCapture(e.pointerId);

    function move(ev) {
      if (!moved) {
        if (Math.abs(ev.clientX - baseX) + Math.abs(ev.clientY - baseY) < CLICK_PX) return;
        moved = true;
        layer.classList.add('dragging');
        /* Dragging a maximised or snapped window lifts it back to its
           floating size, under the pointer, at the same point along the
           title bar. */
        if (!edge && start.mode !== 'floating') {
          var er = el.getBoundingClientRect();
          var along = (baseX - er.left) / (er.width || 1);
          base = {
            mode: 'floating', w: start.w, h: start.h,
            x: (baseX - r.left) / r.width - along * start.w,
            y: (er.top - r.top) / r.height
          };
        }
      }
      var dx = (ev.clientX - baseX) / r.width;
      var dy = (ev.clientY - baseY) / r.height;
      if (edge) {
        cur = resizeFrom(base, edge, dx, dy, r);
      } else {
        cur = clampPlacement({ mode: 'floating', x: base.x + dx, y: base.y + dy, w: base.w, h: base.h }, r.width, r.height);
        snap = snapAt(ev.clientX, ev.clientY, r);
        showGhost(snap);
      }
      setPlacement(el, cur);
    }

    function end(ev) {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', end);
      layer.classList.remove('dragging');
      showGhost(null);
      if (!moved) return;
      /* The click that follows a drag must not follow the title link. */
      suppressClick = true;
      setTimeout(function () { suppressClick = false; }, 0);
      var st = raised(state, key);
      if (ev.type === 'pointercancel') {
        commit(st, false);
        return;
      }
      st.place[key] = Object.assign({}, cur, { mode: snap || 'floating' });
      commit(st, false);
    }

    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);
  }

  function resizeFrom(p, edge, dx, dy, r) {
    var minW = Math.min(1, pxMin('--win-min-w', 320) / r.width);
    var minH = Math.min(1, pxMin('--win-min-h', 200) / r.height);
    var x = p.x, y = p.y, w = p.w, h = p.h;
    if (edge.indexOf('e') >= 0) w = Math.min(1 - p.x, Math.max(minW, p.w + dx));
    if (edge.indexOf('s') >= 0) h = Math.min(1 - p.y, Math.max(minH, p.h + dy));
    if (edge.indexOf('w') >= 0) {
      x = Math.max(0, Math.min(p.x + p.w - minW, p.x + dx));
      w = p.w + (p.x - x);
    }
    if (edge.indexOf('n') >= 0) {
      y = Math.max(0, Math.min(p.y + p.h - minH, p.y + dy));
      h = p.h + (p.y - y);
    }
    return { mode: 'floating', x: x, y: y, w: w, h: h };
  }

  /* === Keyboard ========================================================== */

  function onHeadKey(e, key) {
    if (e.target !== e.currentTarget) return;   // keys on the title link or buttons are theirs
    if (e.key === 'Enter') {
      e.preventDefault();
      commit(maximizeToggled(state, key), false);
      return;
    }
    var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!d || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    var st = raised(state, key);
    var p = st.place[key];
    p.mode = 'floating';
    if (e.shiftKey) { p.w += d[0] * KEY_STEP; p.h += d[1] * KEY_STEP; }
    else { p.x += d[0] * KEY_STEP; p.y += d[1] * KEY_STEP; }
    st.place[key] = clampPlacement(p, layer.clientWidth, layer.clientHeight);
    commitSoon(st);
  }

  /* === Wiring ============================================================ */

  function plainClick(e) {
    return e.button === 0 && !e.defaultPrevented && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
  }

  function onClick(e) {
    if (!plainClick(e)) return;

    var opener = e.target.closest('a[data-win-open]');
    if (opener) {
      var key = opener.getAttribute('data-win-open');
      if (KEY_RE.test(key)) { e.preventDefault(); open(key, opener); }
      return;
    }

    var tab = e.target.closest('[data-win-tab]');
    if (tab) {
      e.preventDefault();
      var k = tab.getAttribute('data-win-tab');
      var st = tabbed(state, k);
      commit(st, false);
      if (!st.min[k]) focusWindow(k);
      return;
    }

    var btn = e.target.closest('.win [data-win-action]');
    if (btn && layer.contains(btn)) {
      var action = btn.getAttribute('data-win-action');
      var wk = btn.closest('.win').getAttribute('data-win');
      if (action === 'minimize') { e.preventDefault(); commit(minimized(state, wk), false); }
      else if (action === 'maximize') { e.preventDefault(); commit(maximizeToggled(state, wk), false); }
      else if (action === 'close') { e.preventDefault(); close(wk); }
    }
  }

  function onPointerDown(e) {
    if (e.button !== 0) return;
    var el = e.target.closest('.win');
    if (!el || !layer.contains(el)) return;
    var key = el.getAttribute('data-win');

    /* A press anywhere in a window raises it at once, before any drag. */
    if (state.top !== key) commit(raised(state, key), false);

    var handle = e.target.closest('.win-rh');
    if (handle) {
      e.preventDefault();
      gesture({ currentTarget: handle, pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY },
              key, handle.getAttribute('data-edge'));
      return;
    }
    /* The title bar drags from anywhere but its buttons, the title link
       included; a press that does not move stays a click on the link. */
    var head = e.target.closest('.win-head');
    if (head && !e.target.closest('button, input, select, textarea, .win-chrome')) {
      e.preventDefault();
      gesture({ currentTarget: head, pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY }, key, null);
    }
  }

  function onDoubleClick(e) {
    var head = e.target.closest('.win-head');
    if (!head || !layer.contains(head) || e.target.closest('a, button, .win-chrome')) return;
    commit(maximizeToggled(state, head.closest('.win').getAttribute('data-win')), false);
  }

  /* Tabbing into a window behind others brings it to the top. */
  function onFocusIn(e) {
    var el = e.target.closest && e.target.closest('.win');
    if (!el || !layer.contains(el)) return;
    var key = el.getAttribute('data-win');
    if (state.top !== key && !state.min[key]) commit(raised(state, key), false);
  }

  function init() {
    layer = document.querySelector('[data-win-layer]');
    if (!layer) return;
    srcTemplate = layer.getAttribute('data-win-src') || '';

    ghost = document.createElement('div');
    ghost.className = 'win-ghost';
    ghost.hidden = true;
    layer.appendChild(ghost);

    layer.querySelectorAll(':scope > .win[data-win]').forEach(function (el) {
      if (KEY_RE.test(el.getAttribute('data-win'))) adopt(el);
      else el.remove();
    });
    zOrder = Object.keys(wins);

    layer.addEventListener('click', function (e) {
      if (suppressClick) { suppressClick = false; e.preventDefault(); e.stopPropagation(); }
    }, true);
    document.addEventListener('click', onClick);
    layer.addEventListener('pointerdown', onPointerDown);
    layer.addEventListener('dblclick', onDoubleClick);
    layer.addEventListener('focusin', onFocusIn);
    layer.addEventListener('keydown', function (e) {
      var head = e.target.closest && e.target.closest('.win-head');
      if (head && e.target === head) onHeadKey({
        target: e.target, currentTarget: head, key: e.key, shiftKey: e.shiftKey,
        altKey: e.altKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey,
        preventDefault: function () { e.preventDefault(); }
      }, head.closest('.win').getAttribute('data-win'));
    });
    window.addEventListener('popstate', function () { sync(false); });

    sync(false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
