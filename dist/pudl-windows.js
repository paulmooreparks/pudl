/* PUDL floating windows. Load after pudl-windows.css, at the end of <body>
   or with defer. The README sets out the markup and the URL grammar; this
   script only enhances what the server has already rendered.

   The URL is the whole state. A page with windows open can be bookmarked,
   reloaded and shared, and Back and Forward step between sets of open
   windows. Opening a window pushes a history entry, and every other change
   replaces the current one.

   A page may have default windows, standing furniture such as a panel of
   site links, named on the layer with data-win-default="site,help". An
   address that names no windows opens them where their markup puts them,
   and the page's plain address stays plain while they are as it opened
   them. An address with open, even an empty open=, means exactly what it
   says, so closing the last window writes open= rather than bringing the
   defaults back.

   A window may be docked at an edge of the layer, mode dock-top,
   dock-bottom, dock-left or dock-right, and it then takes that strip from
   every other window, which lays itself out in what remains. It is flush,
   with a thin title bar; minimising collapses it to that bar; it resizes
   along its free edge; dragging it away undocks it, and dragging a window
   to the layer's foot docks it there. An edge shows one docked window at
   a time, and a side dock shows at the bottom of a narrow layer.
   docs/proposals/docked-windows.md sets out the rules.

   Events, dispatched so a project can hook in without editing this file:
     pudl:window-place   on the layer, before a window opens with no placement
                         in the URL. A listener may set event.detail.placement
                         to {mode, x, y, w, h}, for example from saved state.
                         event.detail.parent names a child window's parent.
     pudl:window-open    on the window element, once it is in the page. Use it
                         to wire up the window's content, because scripts in a
                         fetched fragment do not run.
     pudl:window-closing on the window element, before a reader's close or
                         a script's, and on each child closing with it;
                         cancelable, so an editor with unsaved changes can
                         keep its window open while it asks. detail.key and
                         detail.reason as below. A close by the address
                         cannot be refused.
     pudl:window-close   on the window element, just before it leaves the
                         page by any route. Use it to tear down what
                         pudl:window-open set up. event.detail.reason says
                         why: "button" or "key" when the reader closed it,
                         "script" from pudlWindows.close, "parent" when its
                         parent closed, "replace" when another window took
                         its place, and "address" when the address moved on,
                         by Back, Forward or a link.
     pudl:windows-change on the layer, after every change, with the state in
                         event.detail. Use it to persist placements.

   A layout whose detail pane holds a record of its own, with windows over
   it, puts data-win-pane="off" on the layer, and the script then leaves
   the layout's data-md-pane to the server.

   A window may be snapped to a zone of the area the docks leave, mode
   zone, on a grid of sixths: a drag to a side or the top snaps to a half
   or the whole, and at a corner to a quarter, and the layout picker in
   the window menu, or on the maximise button, reaches the thirds too.

   window.pudlWindows offers open, replace, raise, minimize, minimizeAll,
   restoreAll, dock, snap, retitle, close and state to scripts, each doing what
   the matching link or button does. shareURL and copyLink export a window's
   host-supplied address without changing the workspace. */
(function () {
  'use strict';

  var MODES = ['floating', 'maximized', 'left', 'right', 'zone', 'dock-top', 'dock-bottom', 'dock-left', 'dock-right'];
  /* The named zones, as [left, top, right, bottom] in sixths of the inner
     area. The halves and the whole are modes of their own, left, right and
     maximized, which every zone that equals one becomes. */
  var ZONES = {
    maximized: [0, 0, 6, 6], left: [0, 0, 3, 6], right: [3, 0, 6, 6], top: [0, 0, 6, 3], bottom: [0, 3, 6, 6],
    'top-left': [0, 0, 3, 3], 'top-right': [3, 0, 6, 3], 'bottom-left': [0, 3, 3, 6], 'bottom-right': [3, 3, 6, 6],
    'left-third': [0, 0, 2, 6], 'middle-third': [2, 0, 4, 6], 'right-third': [4, 0, 6, 6],
    'left-two-thirds': [0, 0, 4, 6], 'right-two-thirds': [2, 0, 6, 6]
  };
  var ZONE_WORDS = {
    left: 'Left half', right: 'Right half', top: 'Top half', bottom: 'Bottom half',
    'top-left': 'Top left quarter', 'top-right': 'Top right quarter',
    'bottom-left': 'Bottom left quarter', 'bottom-right': 'Bottom right quarter',
    'left-third': 'Left third', 'middle-third': 'Middle third', 'right-third': 'Right third',
    'left-two-thirds': 'Left two thirds', 'right-two-thirds': 'Right two thirds'
  };
  /* The layouts the picker offers, each a set of zones that fill the area. */
  var LAYOUTS = [
    ['halves', 'Halves', ['left', 'right']],
    ['quarters', 'Quarters', ['top-left', 'top-right', 'bottom-left', 'bottom-right']],
    ['thirds', 'Thirds', ['left-third', 'middle-third', 'right-third']],
    ['two-one', 'Two thirds and one third', ['left-two-thirds', 'right-third']],
    ['one-two', 'One third and two thirds', ['left-third', 'right-two-thirds']]
  ];
  var SIDES = ['top', 'bottom', 'left', 'right'];
  var DOCK_SIZE = 0.25;    // a docked window's strip, as a fraction of the layer, when nothing says otherwise
  var DOCK_MAX = 0.8;      // the most of the layer a dock may take
  var NARROW = 640;        // at or below this layer width a side dock shows at the bottom
  var EDGES = ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'];
  var KEY_RE = /^[A-Za-z0-9_-]+$/;
  var SNAP_PX = 16;        // a drag ending this close to an edge snaps to it
  var CORNER_PX = 64;      // and this close to the edge across it as well, to that corner's quarter
  var HOVER_MS = 500;      // a pointer resting this long on the maximise button opens the layout picker
  var CLICK_PX = 4;        // a press that moves less than this is a click
  var KEY_STEP = 0.02;     // arrow keys move or resize by this fraction
  var URL_DELAY = 300;     // ms of keyboard quiet before the URL is written

  var layer, ghost, inner, srcTemplate;
  var state = { open: [], top: null, min: {}, place: {} };
  var wins = {};           // key -> window element
  var zOrder = [];         // keys, bottom to top
  var openers = {};        // key -> element that opened it, for returning focus
  var pending = {};        // key -> true while its window is loading
  var urlTimer = 0;
  var suppressClick = false;
  var defaults = [];       // keys of the windows open when the address names none
  var bare = null;         // the window parameters of the state an address naming none produced
  var closing = {};        // key -> why its window is about to close, for pudl:window-close
  var homes = {};          // key -> the placement its markup gave it, which reset returns it to
  var menuRuns = {};       // key -> the content's commands in its open window menu, by index
  var lastFocus = {};      // key -> the element that last had focus in the window, which it gets back
  var cancelGesture = null;
  var policyStamp = '';
  var syncing = 0;

  /* Policy changes presentation without replacing the placement in the URL. */
  function restricted(key) {
    var el = wins[key];
    if (!el || contentSized(key) || el.getAttribute('data-win-narrow') !== 'maximized') return false;
    var width = Number(layer.getAttribute('data-win-narrow-width'));
    return layer.clientWidth <= (width > 0 && isFinite(width) ? width : NARROW);
  }

  function effectivePlacement(st, key) {
    var p = st.place[key];
    if (!p) return null;
    var out = Object.assign({}, p);
    if (out.zone) out.zone = Object.assign({}, out.zone);
    if (restricted(key)) { out.mode = 'maximized'; delete out.zone; }
    return out;
  }

  /* === State and URL ===================================================== */

  function copy(st) {
    var place = {};
    Object.keys(st.place).forEach(function (k) {
      place[k] = Object.assign({}, st.place[k]);
      if (place[k].zone) place[k].zone = Object.assign({}, place[k].zone);
    });
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

  /* The smallest a window may be, as fractions of a layer of that size, and
     the largest, mw and mh. A window's own data-win-min and data-win-max,
     set on it as --win-min-w and so on, win over the layer's. */
  function minFractions(layerW, layerH, el) {
    var from = el || layer;
    return {
      w: Math.min(1, pxOf(from, '--win-min-w', 320) / (layerW || 1)),
      h: Math.min(1, pxOf(from, '--win-min-h', 200) / (layerH || 1)),
      mw: Math.min(1, pxOf(from, '--win-max-w', Infinity) / (layerW || 1)),
      mh: Math.min(1, pxOf(from, '--win-max-h', Infinity) / (layerH || 1))
    };
  }

  /* min, from minFractions(), may be passed in by a caller that clamps many
     times over, since finding it reads the layer's computed style. A
     docked window's strip size, s, is kept, within its limits. */
  function clampPlacement(p, layerW, layerH, min) {
    min = min || minFractions(layerW, layerH);
    var w = Math.min(min.mw != null ? Math.max(min.w, min.mw) : 1, Math.max(min.w, p.w));
    var h = Math.min(min.mh != null ? Math.max(min.h, min.mh) : 1, Math.max(min.h, p.h));
    var out = {
      mode: p.mode, w: w, h: h,
      x: Math.min(1 - w, Math.max(0, p.x)),
      y: Math.min(1 - h, Math.max(0, p.y))
    };
    if (p.s != null) out.s = Math.min(DOCK_MAX, Math.max(0.05, p.s));
    if (p.zone) out.zone = p.zone;
    return out;
  }

  function fraction(n) { return typeof n === 'number' && isFinite(n) && n >= 0 && n <= 1; }

  function validPlacement(p) {
    return !!p && MODES.indexOf(p.mode) >= 0 &&
      [p.x, p.y, p.w, p.h].every(fraction) &&
      p.w > 0 && p.h > 0 &&
      (p.s == null || (fraction(p.s) && p.s > 0)) &&
      (p.mode !== 'zone' || !!gridZone(p.zone));
  }

  /* === Zones ===============================================================
     A zone is a rectangle of the inner area on a grid of sixths, which
     holds halves, thirds and quarters. A placement in mode zone carries it
     as zone: {x, y, w, h}, fractions of the inner area. */

  /* The rectangle, moved to the nearest sixths, or null if nothing is left
     of it there. */
  function gridZone(z) {
    if (!z || ![z.x, z.y, z.w, z.h].every(fraction)) return null;
    var l = Math.round(z.x * 6), t = Math.round(z.y * 6);
    var r = Math.min(6, Math.round((z.x + z.w) * 6)), b = Math.min(6, Math.round((z.y + z.h) * 6));
    return r > l && b > t ? zoneOf([l, t, r, b]) : null;
  }

  function zoneOf(s) { return { x: s[0] / 6, y: s[1] / 6, w: (s[2] - s[0]) / 6, h: (s[3] - s[1]) / 6 }; }

  function sixths(z) {
    return [Math.round(z.x * 6), Math.round(z.y * 6), Math.round((z.x + z.w) * 6), Math.round((z.y + z.h) * 6)].join(',');
  }

  /* The zone a placement fills, for the modes that fill one. */
  function zoneFilled(p) {
    if (!p) return null;
    if (p.mode === 'zone') return p.zone;
    return ['maximized', 'left', 'right'].indexOf(p.mode) >= 0 ? zoneOf(ZONES[p.mode]) : null;
  }

  /* Puts a placement in a zone. A zone that is a half or the whole takes
     that mode instead, so every arrangement has one spelling. */
  function inZone(p, z) {
    z = gridZone(z);
    if (!z) return;
    var s = sixths(z);
    var named = ['maximized', 'left', 'right'].filter(function (m) { return ZONES[m].join(',') === s; })[0];
    p.mode = named || 'zone';
    if (named) delete p.zone;
    else p.zone = z;
  }

  /* A placement is mode:x,y,w,h. A docked one adds its strip's size,
     dock-bottom:0.06,0.05,0.55,0.75,0.22, and a zone adds its rectangle,
     zone:0.06,0.05,0.55,0.75,0,0,0.5,0.5. The first four numbers are always
     the floating geometry to return to. A zone that is a half or the whole
     reads as left, right or maximized. */
  function parsePlacement(value) {
    var m = /^([a-z-]+):([0-9.]+(?:,[0-9.]+){3,7})$/.exec(value || '');
    if (!m) return null;
    var n = m[2].split(',').map(Number);
    var p = { mode: m[1], x: n[0], y: n[1], w: n[2], h: n[3] };
    if (p.mode === 'zone') {
      if (n.length !== 8) return null;
      p.zone = gridZone({ x: n[4], y: n[5], w: n[6], h: n[7] });
      if (!p.zone) return null;
      inZone(p, p.zone);
    } else if (n.length === 5) p.s = n[4];
    else if (n.length !== 4) return null;
    return validPlacement(p) ? p : null;
  }

  function fmt(n) { return String(Math.round(n * 1000) / 1000); }

  function formatPlacement(p) {
    var nums = [p.x, p.y, p.w, p.h];
    if (dockEdge(p)) nums.push(p.s != null ? p.s : DOCK_SIZE);
    if (p.mode === 'zone') nums.push(p.zone.x, p.zone.y, p.zone.w, p.zone.h);
    return p.mode + ':' + nums.map(fmt).join(',');
  }

  /* === Docked windows ======================================================
     A docked window holds an edge of the layer, and takes that strip from
     every other window, which lays itself out in what remains, the inner
     area. An edge shows one docked window at a time, the one highest in
     the stack; the others wait behind it and come forward from the dock. */

  function dockEdge(p) { return p && p.mode.indexOf('dock-') === 0 ? p.mode.slice(5) : null; }

  function narrowLayer() { return !!layer && layer.clientWidth <= NARROW; }

  /* The edge a docked window shows on: its own, except that a side dock
     shows at the bottom of a layer too narrow to have room beside it. */
  function shownEdge(st, key) {
    var e = dockEdge(effectivePlacement(st, key));
    return e && (e === 'left' || e === 'right') && narrowLayer() ? 'bottom' : e;
  }

  /* The stacking order a state implies: the order as it stands, windows
     new to it on top, and the state's top window above them all. */
  function stackOf(st) {
    var order = zOrder.filter(function (k) { return st.open.indexOf(k) >= 0; });
    st.open.forEach(function (k) { if (order.indexOf(k) < 0) order.push(k); });
    if (st.top && order.indexOf(st.top) >= 0) { order.splice(order.indexOf(st.top), 1); order.push(st.top); }
    return order;
  }

  function edgeFront(st, edge) {
    var order = stackOf(st);
    for (var i = order.length - 1; i >= 0; i--) {
      if (st.place[order[i]] && shownEdge(st, order[i]) === edge) return order[i];
    }
    return null;
  }

  /* The size of the layer's inner area, which the docks leave. */
  function innerRect() { return inner ? inner.getBoundingClientRect() : layer.getBoundingClientRect(); }
  function innerW() { return innerRect().width || layer.clientWidth; }
  function innerH() { return innerRect().height || layer.clientHeight; }

  /* Sets the strips the docks take, as lengths on the layer, which the
     stylesheet lays every window out by. A collapsed dock takes its title
     bar's height. */
  function setDocks(st) {
    SIDES.forEach(function (side) {
      var k = edgeFront(st, side);
      var v = '0px';
      if (k) {
        var head = wins[k].querySelector('.win-head');
        var rect = head && head.getBoundingClientRect();
        v = st.min[k] ? ((rect ? (side === 'left' || side === 'right' ? rect.width : rect.height) : pxMin('--win-head-docked', 30)) + 1) + 'px'
          : (Math.round((st.place[k].s != null ? st.place[k].s : DOCK_SIZE) * 1000) / 10) + '%';
      }
      layer.style.setProperty('--dock-' + side, v);
    });
  }

  /* The state an address names, or null when it names no windows at all,
     which means the page's default windows. An empty open= names none. */
  function readURL() {
    var q = new URLSearchParams(location.search);
    if (!q.has('open')) return null;
    var st = { open: keyList(q.get('open')), top: null, min: {}, place: {} };
    keyList(q.get('min')).forEach(function (k) {
      if (st.open.indexOf(k) >= 0) st.min[k] = true;
    });
    st.open.forEach(function (k) {
      var p = parsePlacement(q.get('p.' + k));
      if (p) st.place[k] = p;
    });
    /* top may name a minimised window, after every window was minimised: it
       is then the window that comes back in front on restoring them. */
    var top = q.get('top');
    st.top = (top && st.open.indexOf(top) >= 0) ? top : null;
    return st;
  }

  /* A state's window parameters. Keys, modes and numbers need no escaping,
     so they are written out by hand and stay readable. */
  function windowParams(st) {
    if (!st.open.length) return [];
    var parts = ['open=' + st.open.join(',')];
    if (st.top) parts.push('top=' + st.top);
    var mins = st.open.filter(function (k) { return st.min[k]; });
    if (mins.length) parts.push('min=' + mins.join(','));
    st.open.forEach(function (k) {
      if (st.place[k]) parts.push('p.' + k + '=' + formatPlacement(st.place[k]));
    });
    return parts;
  }

  /* Whether a state is the one an address naming no windows opened. It is
     known once such an address has been seen, and compared as the window
     parameters it would write, so a default window the reader has moved,
     minimised or closed is no longer the default. */
  function isDefault(st) {
    return bare !== null && windowParams(st).join('&') === bare;
  }

  /* The URL for a state, keeping every query parameter that is not ours.
     On a page with default windows, the default state is written as no
     window parameters at all, so the page's plain address stays plain, and
     a state with no windows open is written as an empty open=, since no
     parameters would bring the defaults back. */
  function urlFor(st) {
    /* The page's own parameters are kept exactly as written, so that a
       readable ?path=/notes stays readable rather than becoming %2F. */
    var parts = location.search.replace(/^\?/, '').split('&').filter(function (seg) {
      if (!seg) return false;
      var k = seg.split('=')[0];
      try { k = decodeURIComponent(k.replace(/\+/g, ' ')); } catch (e) { /* leave as is */ }
      return !(k === 'open' || k === 'top' || k === 'min' || k.indexOf('p.') === 0);
    });
    var mine = windowParams(st);
    if (defaults.length) {
      if (isDefault(st)) mine = [];
      else if (!mine.length) mine = ['open='];
    }
    parts = parts.concat(mine);
    return location.pathname + (parts.length ? '?' + parts.join('&') : '') + location.hash;
  }

  /* A child window names its parent with data-win-parent. The relation is a
     fact about the content, so it lives in the markup, not the URL. It
     holds only while the parent is open and is itself a top-level window;
     otherwise the window stands on its own. */
  function parentOf(st, key) {
    var el = wins[key];
    var p = el && el.getAttribute('data-win-parent');
    if (!p || p === key || st.open.indexOf(p) < 0) return null;
    var pe = wins[p];
    var grand = pe && pe.getAttribute('data-win-parent');
    return grand && st.open.indexOf(grand) >= 0 ? null : p;
  }

  function rootOf(st, key) { return parentOf(st, key) || key; }

  function childrenOf(st, key) {
    return st.open.filter(function (k) { return parentOf(st, k) === key; });
  }

  /* A docked window shows while it is the front of its edge, minimised or
     not, since minimising a docked window collapses it to its title bar
     rather than hiding it. */
  function isHidden(st, key) {
    var edge = shownEdge(st, key);
    if (edge) return edgeFront(st, edge) !== key;
    var p = parentOf(st, key);
    return !!(st.min[key] || (p && st.min[p]));
  }

  /* The window in front, the active one: top, unless top is hidden, in
     which case no window is active. */
  function active(st) {
    return st.top && !isHidden(st, st.top) ? st.top : null;
  }

  /* The topmost visible window outside the given set, for when the top
     window is minimised or closed. */
  function nextTop(st, except) {
    for (var i = zOrder.length - 1; i >= 0; i--) {
      var k = zOrder[i];
      if (except.indexOf(k) < 0 && st.open.indexOf(k) >= 0 && !isHidden(st, k)) return k;
    }
    return null;
  }

  /* === Operations, each returning a new state ============================= */

  function raised(st, key) {
    st = copy(st);
    delete st.min[key];
    delete st.min[rootOf(st, key)];
    st.top = key;
    return st;
  }

  /* A press or focus in a window brings it to the front. A collapsed dock
     it brings to the front stays collapsed; its own button or its tab in
     the dock expands it. */
  function fronted(st, key) {
    if (!dockEdge(st.place[key])) return raised(st, key);
    st = copy(st);
    st.top = key;
    return st;
  }

  /* The minimise button: on a docked window it collapses the window to its
     title bar, and expands it again. */
  function minimizeToggled(st, key) {
    return dockEdge(st.place[key]) && st.min[key] ? raised(st, key) : minimized(st, key);
  }

  /* Minimising a window hides its children with it. A child has no dock tab
     to come back from, so a child is never minimised on its own. */
  function minimized(st, key) {
    if (parentOf(st, key)) return copy(st);
    st = copy(st);
    st.min[key] = true;
    if (st.top && rootOf(st, st.top) === key) st.top = nextTop(st, [key].concat(childrenOf(st, key)));
    return st;
  }

  /* Minimises every top-level window, which shows the page beneath them.
     top stays, now naming a hidden window, so that restoring them brings
     the same window back in front, after a reload too. */
  function allMinimized(st) {
    st = copy(st);
    st.open.forEach(function (k) { if (!parentOf(st, k)) st.min[k] = true; });
    return st;
  }

  /* Restores every minimised top-level window, the reverse of
     allMinimized(): the window top names comes back in front, or with none
     named, the one highest in the stack. */
  function allRestored(st) {
    st = copy(st);
    st.open.forEach(function (k) { if (!parentOf(st, k)) delete st.min[k]; });
    if (!st.top) st.top = nextTop(st, []);
    return st;
  }

  /* Whether minimising all, or restoring all, would change anything. */
  function anyShowing(st) {
    return st.open.some(function (k) { return !parentOf(st, k) && !st.min[k]; });
  }
  function anyMinimized(st) {
    return st.open.some(function (k) { return !parentOf(st, k) && st.min[k]; });
  }

  function maximizeToggled(st, key) {
    if (restricted(key)) return copy(st);
    st = raised(st, key);
    var p = st.place[key];
    p.mode = p.mode === 'floating' ? 'maximized' : 'floating';
    return st;
  }

  /* Snaps a window to a zone, a name from ZONES or a rectangle, or with
     none, lets it float again. */
  function snapped(st, key, zone) {
    if (restricted(key)) return copy(st);
    st = raised(st, key);
    var p = st.place[key];
    if (zone == null || zone === 'floating') { p.mode = 'floating'; return st; }
    var z = typeof zone === 'string' ? (ZONES[zone] ? zoneOf(ZONES[zone]) : null) : gridZone(zone);
    if (z) inZone(p, z);
    return st;
  }

  /* Docks a window at an edge, or with no edge, undocks it back to where
     it floated. A window keeps its strip's size while undocked, so docking
     it again brings it back as it was. */
  function docked(st, key, edge) {
    if (restricted(key)) return copy(st);
    st = raised(st, key);
    var p = st.place[key];
    if (edge) {
      p.mode = 'dock-' + edge;
      if (p.s == null) p.s = DOCK_SIZE;
    } else {
      p.mode = 'floating';
    }
    return st;
  }

  /* Closing a window closes its children with it. */
  function closed(st, key) {
    var gone = [key].concat(childrenOf(st, key));
    var top = st.top;
    st = copy(st);
    st.top = gone.indexOf(top) >= 0 ? nextTop(st, gone) : top;
    st.open = st.open.filter(function (k) { return gone.indexOf(k) < 0; });
    gone.forEach(function (k) { delete st.min[k]; delete st.place[k]; });
    return st;
  }

  /* The window a top-level window's tab or row brings forward: its topmost
     child if it has one, since that child covers it, or else itself. */
  function frontOf(st, key) {
    var kids = childrenOf(st, key);
    for (var i = zOrder.length - 1; i >= 0; i--) {
      if (kids.indexOf(zOrder[i]) >= 0) return zOrder[i];
    }
    return key;
  }

  /* A dock tab raises its window, or minimises it if it is already in
     front, as a taskbar does. A child's row in a list only raises it. */
  function tabbed(st, key) {
    if (parentOf(st, key)) return raised(st, key);
    var inFront = st.top && rootOf(st, st.top) === key && !st.min[key];
    return inFront ? minimized(st, key) : raised(st, frontOf(st, key));
  }

  /* === Applying state to the page ======================================== */

  function setPlacement(el, p) {
    el.setAttribute('data-win-mode', p.mode);
    el.style.setProperty('--win-x', fmt(p.x));
    el.style.setProperty('--win-y', fmt(p.y));
    el.style.setProperty('--win-w', fmt(p.w));
    el.style.setProperty('--win-h', fmt(p.h));
    if (p.s != null) el.style.setProperty('--win-dock-size', fmt(p.s));
    /* A zone's rectangle, and a hairline on each side that meets another
       zone rather than the edge of the area. */
    if (p.mode === 'zone') {
      el.style.setProperty('--zone-x', fmt(p.zone.x));
      el.style.setProperty('--zone-y', fmt(p.zone.y));
      el.style.setProperty('--zone-w', fmt(p.zone.w));
      el.style.setProperty('--zone-h', fmt(p.zone.h));
      el.style.setProperty('--zone-rule-e', p.zone.x + p.zone.w < 0.999 ? '1px' : '0px');
      el.style.setProperty('--zone-rule-s', p.zone.y + p.zone.h < 0.999 ? '1px' : '0px');
    } else {
      ['--zone-x', '--zone-y', '--zone-w', '--zone-h', '--zone-rule-e', '--zone-rule-s'].forEach(function (v) { el.style.removeProperty(v); });
    }
  }

  /* The words this script writes into the page, in English unless the layer
     carries a data-win-text-<name> attribute with the page's own. {title}
     stands for the window's title. */
  function text(name, fallback) {
    return (layer && layer.getAttribute('data-win-text-' + name)) || fallback;
  }

  function titleOf(key) {
    var t = wins[key] && wins[key].querySelector('.win-title');
    return t ? t.textContent.trim() : key;
  }

  /* A window sized by its content, data-win-size="content", has nothing to
     fill, so it always floats: an address or a script that asks for it
     maximised, snapped or docked leaves it floating where it is. */
  function contentSized(key) {
    return !!wins[key] && wins[key].getAttribute('data-win-size') === 'content';
  }

  function apply(st) {
    st.open.forEach(function (k) {
      var p = st.place[k];
      if (p && p.mode !== 'floating' && contentSized(k)) {
        st.place[k] = Object.assign({}, p, { mode: 'floating' });
        delete st.place[k].zone;
      }
    });
    /* A window leaving the page says so first, however it was closed, so
       its content can tear down what it set up, and says why, so a project
       can tell a reader closing it from the address moving on. */
    Object.keys(wins).forEach(function (k) {
      if (st.open.indexOf(k) >= 0) return;
      var gone = wins[k];
      delete wins[k];
      delete lastFocus[k];
      gone.dispatchEvent(new CustomEvent('pudl:window-close', { bubbles: true, detail: { key: k, reason: closing[k] || 'address' } }));
      gone.remove();
    });
    closing = {};
    zOrder = zOrder.filter(function (k) { return st.open.indexOf(k) >= 0; });
    st.open.forEach(function (k) { if (zOrder.indexOf(k) < 0) zOrder.push(k); });
    if (st.top) { zOrder.splice(zOrder.indexOf(st.top), 1); zOrder.push(st.top); }

    /* Children stack directly above their parent, and the active window's
       family goes to the top. */
    var roots = zOrder.filter(function (k) { return !parentOf(st, k); });
    if (st.top) {
      var topRoot = rootOf(st, st.top);
      roots.splice(roots.indexOf(topRoot), 1);
      roots.push(topRoot);
    }
    var ordered = [];
    roots.forEach(function (r) {
      ordered.push(r);
      zOrder.forEach(function (k) { if (parentOf(st, k) === r) ordered.push(k); });
    });
    zOrder = ordered;

    /* Docked windows stack above the rest, though nothing is let into their
       strips, so that a drag's ghost or a window's shadow never crosses one. */
    var front = active(st);
    zOrder.forEach(function (k, i) {
      var el = wins[k];
      var edge = shownEdge(st, k);
      setPlacement(el, effectivePlacement(st, k));
      el.toggleAttribute('data-win-restricted', restricted(k));
      labelHead(k);
      el.hidden = isHidden(st, k);
      el.classList.toggle('active', k === front);
      if (edge) el.setAttribute('data-win-edge', edge);
      else el.removeAttribute('data-win-edge');
      el.classList.toggle('win-collapsed', !!edge && !!st.min[k]);
      el.style.zIndex = String((edge ? zOrder.length : 0) + i + 1);
    });
    setDocks(st);
    state = st;
    updateLinks();
    renderDocks();
    renderRows();
    syncPane();
  }

  /* Every window button and dock tab is a real link to the state it
     produces, so middle-click, copy-link and a page without script all work. */
  function updateLinks() {
    state.open.forEach(function (k) {
      var el = wins[k];
      var mn = el.querySelector('[data-win-action="minimize"]');
      setHref(mn, urlFor(minimizeToggled(state, k)));
      if (mn) {
        var ml = shownEdge(state, k) ? (state.min[k] ? text('expand', 'Expand') : text('collapse', 'Collapse')) : text('minimize', 'Minimize');
        mn.setAttribute('aria-label', ml);
        mn.setAttribute('title', ml);
      }
      setHref(el.querySelector('[data-win-action="close"]'), urlFor(closed(state, k)));
      var max = el.querySelector('[data-win-action="maximize"]');
      setHref(max, urlFor(maximizeToggled(state, k)));
      if (max) {
        var label = restricted(k) ? text('restore-floating', 'Restore to floating') : state.place[k].mode === 'floating' ? text('maximize', 'Maximize') : text('restore', 'Restore');
        max.setAttribute('aria-disabled', String(restricted(k)));
        max.setAttribute('aria-label', label);
        max.setAttribute('title', label);
      }
      var dock = el.querySelector('[data-win-action="dock"]');
      if (dock) {
        dock.setAttribute('aria-disabled', String(restricted(k)));
        var isDocked = !!dockEdge(state.place[k]);
        setHref(dock, urlFor(docked(state, k, isDocked ? null : 'bottom')));
        var dl = isDocked ? text('undock', 'Undock') : text('dock', 'Dock at the bottom');
        dock.setAttribute('aria-label', dl);
        dock.setAttribute('title', dl);
      }
    });
  }

  function setHref(a, href) { if (a && a.tagName === 'A') a.setAttribute('href', href); }

  /* A host may export a chosen state without changing the reader's workspace.
     The share address is independent of the title bar's Open as a page link. */
  function shareURL(key) {
    key = key == null ? active(state) : key;
    var win = Object.prototype.hasOwnProperty.call(wins, key) && wins[key];
    if (!win) return null;
    var page = win.querySelector('.win-head a[data-win-action="page"][href]');
    var href = win.hasAttribute('data-win-href') ? win.getAttribute('data-win-href') : page && page.getAttribute('href');
    if (!href || !href.trim()) return null;
    try {
      var url = new URL(href, win.baseURI);
      return /^(https?:)$/.test(url.protocol) ? url.href : null;
    } catch (err) { return null; }
  }

  function copyLink(key) {
    key = key == null ? active(state) : key;
    var href = shareURL(key);
    if (!href) return Promise.resolve(false);
    var win = wins[key];
    function done(ok) {
      win.dispatchEvent(new CustomEvent('pudl:window-link-copy', { bubbles: true, detail: { key: key, href: href, ok: ok } }));
      return ok;
    }
    function byHand() {
      window.prompt(text('copy-link-manual', 'Copy this link:'), href);
      return done(false);
    }
    if (!navigator.clipboard || !navigator.clipboard.writeText) return Promise.resolve(byHand());
    try {
      return navigator.clipboard.writeText(href).then(function () { return done(true); }, byHand);
    } catch (err) { return Promise.resolve(byHand()); }
  }

  /* The dock has a tab for each top-level window only. */
  function renderDocks() {
    var front = active(state);
    var topRoot = front ? rootOf(state, front) : null;
    document.querySelectorAll('[data-win-dock]').forEach(function (dock) {
      dock.textContent = '';
      state.open.forEach(function (k) {
        if (parentOf(state, k)) return;
        var a = document.createElement('a');
        a.className = 'win-tab' + (state.min[k] ? ' minimized' : '');
        a.href = urlFor(tabbed(state, k));
        a.setAttribute('data-win-tab', k);
        if (k === topRoot) a.setAttribute('aria-current', 'true');
        a.textContent = titleOf(k);
        a.title = state.min[k] ? text('minimized', '{title} (minimized)').split('{title}').join(titleOf(k)) : titleOf(k);
        dock.appendChild(a);
      });
    });
  }

  /* A list row whose link opens a window follows that window: the row of the
     window in front is marked current, and each open child gets a row of
     its own beneath its parent's, which goes when the child closes. */
  function renderRows() {
    document.querySelectorAll('.md-row-child[data-win-child]').forEach(function (r) { r.remove(); });
    var front = active(state);
    var topRoot = front ? rootOf(state, front) : null;
    document.querySelectorAll('.md-row').forEach(function (row) {
      var link = row.querySelector('a[data-win-open]');
      if (!link) return;
      var key = link.getAttribute('data-win-open');
      var current = key === topRoot && !isHidden(state, key);
      row.classList.toggle('active', current);
      if (current) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
      /* A menu panel lists places, and a child window is not one, so a
         panel's rows are marked but gain no child rows. */
      if (state.open.indexOf(key) < 0 || row.closest('[popover]')) return;

      var after = row;
      childrenOf(state, key).forEach(function (c) {
        var child = document.createElement('div');
        child.className = 'md-row md-row-child' + (c === front ? ' active' : '');
        child.setAttribute('data-win-child', c);
        var a = document.createElement('a');
        a.className = 'md-item';
        a.href = urlFor(raised(state, c));
        a.setAttribute('data-win-tab', c);
        if (c === front) a.setAttribute('aria-current', 'true');
        a.textContent = titleOf(c);
        child.appendChild(a);
        after.after(child);
        after = child;
      });
    });
  }

  /* In a master-detail layout narrow enough to show one pane at a time, the
     windows are the detail pane: it shows while any window the reader
     opened does. A default window is part of the page rather than a record,
     so it does not turn the pane over by itself.

     A link marked data-win-back minimises every window, which also
     returns to the list, and one marked data-win-restore brings them all
     back. Each is a real link to the state it produces, and is marked
     aria-disabled while it would change nothing. */
  function syncPane() {
    /* A layout whose detail pane holds a record of its own, with windows
       floating over it, leaves the pane to the server: its layer carries
       data-win-pane="off". */
    var md = layer.getAttribute('data-win-pane') === 'off' ? null : layer.closest('.md-layout');
    if (md) {
      var any = state.open.some(function (k) { return defaults.indexOf(k) < 0 && !isHidden(state, k); });
      md.setAttribute('data-md-pane', any ? 'detail' : 'list');
    }
    linkAll('a[data-win-back]', urlFor(allMinimized(state)), anyShowing(state));
    linkAll('a[data-win-restore]', urlFor(allRestored(state)), anyMinimized(state));
  }

  function linkAll(selector, href, useful) {
    document.querySelectorAll(selector).forEach(function (a) {
      a.setAttribute('href', href);
      if (useful) a.removeAttribute('aria-disabled');
      else a.setAttribute('aria-disabled', 'true');
    });
  }

  /* Applies a state and records it in the URL. Opening a window pushes a
     history entry; everything else replaces the current one. */
  function commit(st, push) {
    clearTimeout(urlTimer);
    apply(st);
    var url = urlFor(st);
    if (url !== location.pathname + location.search + location.hash) {
      /* Firefox and Safari throw once a page changes its address too often
         in a short time, which quick clicking between windows can reach.
         The page is already right, so the address is written again once
         things are quiet. */
      try { history[push ? 'pushState' : 'replaceState'](history.state, '', url); }
      catch (err) { urlTimer = setTimeout(function () { commit(state, false); }, URL_DELAY * 10); }
    }
    layer.dispatchEvent(new CustomEvent('pudl:windows-change', { bubbles: true, detail: copy(st) }));
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
     renders into the page. The markup joins the page with the page's own
     authority, so it must come from the page's own origin as HTML: the
     fetch refuses another origin, a redirect to one included.

     A numbered window, such as an applet's second instance "terminal-2",
     whose template the page does not have, takes the template of the key
     without its number, "terminal", with the number added to its title.
     A server answers a numbered key itself. */
  function load(key) {
    var src = srcFor(key);
    if (!src) return Promise.reject(new Error('no data-win-src on the layer'));
    var got, number = null;
    if (src.charAt(0) === '#') {
      var t = document.getElementById(src.slice(1));
      var m = !t && /^(.+)-([2-9])$/.exec(key);
      if (m) {
        t = document.getElementById(srcFor(m[1]).slice(1));
        if (t) number = m[2];
      }
      got = t ? Promise.resolve(t.content.cloneNode(true)) : Promise.reject(new Error('no template ' + src));
    } else {
      got = fetch(src, { mode: 'same-origin', credentials: 'same-origin', headers: { Accept: 'text/html' } })
        .then(function (r) {
          if (!r.ok) throw new Error(src + ' returned ' + r.status);
          if ((r.headers.get('content-type') || '').indexOf('text/html') < 0) throw new Error(src + ' is not HTML');
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
      /* A numbered copy of a template gives up the title's id, so that
         adopt() names it for this key and it never repeats another's. */
      var title = number && el.querySelector('.win-title');
      if (title) {
        title.appendChild(document.createTextNode(' ' + number));
        title.removeAttribute('id');
        el.removeAttribute('aria-labelledby');
      }
      return document.importNode(el, true);
    });
  }

  /* The title bar's spoken name, which carries the window's title. */
  function labelHead(key) {
    var head = wins[key] && wins[key].querySelector('.win-head');
    if (head) head.setAttribute('aria-label', (restricted(key) ? text('head-restricted', 'Window: {title}. Placement is fixed at this workspace width. Shift F10 opens the window menu.') : text('head',
      'Window: {title}. Arrow keys move it, Shift with arrow keys resizes it, Enter maximizes or restores it.')
      ).split('{title}').join(titleOf(key)));
  }

  /* Gives a window a new title, which the title bar's spoken name, its
     dock tab and its list row follow at once. */
  function retitle(key, title) {
    var t = wins[key] && wins[key].querySelector('.win-title');
    if (!t) return;
    t.textContent = String(title);
    labelHead(key);
    renderDocks();
    renderRows();
  }

  function adopt(el) {
    var key = el.getAttribute('data-win');
    wins[key] = el;
    if (contentSized(key) && el.hasAttribute('data-win-narrow')) console.warn('pudl-windows: data-win-narrow is ignored on content-sized window ' + key);
    if (!el.parentNode || el.parentNode !== layer) layer.insertBefore(el, ghost);

    EDGES.forEach(function (edge) {
      if (el.querySelector(':scope > .win-rh[data-edge="' + edge + '"]')) return;
      var h = document.createElement('div');
      h.className = 'win-rh';
      h.setAttribute('data-edge', edge);
      h.setAttribute('aria-hidden', 'true');
      el.appendChild(h);
    });

    /* A user-sized window's limits, data-win-min="w,h" and data-win-max="w,h"
       in pixels, become the properties the stylesheet and the resize
       gestures read, so they hold however the size was reached. */
    [['data-win-min', '--win-min-'], ['data-win-max', '--win-max-']].forEach(function (lim) {
      var m = /^\s*(\d+)\s*,\s*(\d+)\s*$/.exec(el.getAttribute(lim[0]) || '');
      if (!m) return;
      el.style.setProperty(lim[1] + 'w', m[1] + 'px');
      el.style.setProperty(lim[1] + 'h', m[2] + 'px');
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
      labelHead(key);
      addMenu(el, key, head);
    }

    /* Where reset returns the window: the placement its markup gave it as
       it arrived. */
    if (!homes[key]) homes[key] = markupPlacement(el, Object.keys(wins).length - 1);

    /* A window's body scrolls, and a reader with only a keyboard can
       scroll it only by focusing something inside it. Content with no link
       or field has nothing to focus, so the body itself is a tab stop. */
    var body = el.querySelector('.win-body');
    if (body && !body.hasAttribute('tabindex')) body.tabIndex = 0;
    return el;
  }

  /* === The window menu =====================================================
     A menu at the left of the title bar, on every window of a layer marked
     data-win-menu, or on a window whose markup carries a button with
     data-win-action="menu". It holds the window's own commands first, then
     below a separator the commands of what the window holds: those an
     applet's instance offers through commands(), and those any content
     adds when pudl:window-menu fires on the window. It is built afresh each
     time it opens, so its labels are always true. */

  function addMenu(el, key, head) {
    var btn = head.querySelector('[data-win-action="menu"]');
    if (!btn && !layer.hasAttribute('data-win-menu') && el.getAttribute('data-win-chrome') !== 'compact') return;
    var id = 'win-menu-' + key;
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'win-btn';
      btn.setAttribute('data-win-action', 'menu');
      head.insertBefore(btn, head.firstChild);
    }
    btn.setAttribute('popovertarget', id);
    btn.setAttribute('aria-label', text('menu', 'Window menu'));
    if (!document.getElementById(id)) {
      var panel = document.createElement('div');
      panel.className = 'menu-panel win-menu';
      panel.id = id;
      panel.setAttribute('popover', '');
      panel.setAttribute('data-win-menu-for', key);
      el.appendChild(panel);
    }
    addSnapPanel(el, key);
  }

  function menuItem(label, cmd, opts) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'menu-action';
    b.setAttribute('data-win-cmd', cmd);
    b.textContent = label;
    if (opts && opts.checked != null) b.setAttribute('aria-pressed', opts.checked ? 'true' : 'false');
    if (opts && opts.disabled) b.disabled = true;
    if (opts && opts.danger) b.classList.add('danger');
    return b;
  }

  function sep() {
    var hr = document.createElement('hr');
    hr.className = 'menu-sep';
    return hr;
  }

  /* The commands of what a window holds. */
  function contentCommands(win, key) {
    var list = [];
    function add(label, run, opts) {
      if (typeof label !== 'string' || typeof run !== 'function') return;
      list.push({ label: label, run: run, checked: opts && opts.checked, disabled: opts && opts.disabled });
    }
    /* With a menu bar on the page an applet's commands live in its menu
       there, and the window menu keeps the window's own, so each command
       has one home. */
    if (window.pudlApplets && window.pudlApplets.commandsIn && !document.querySelector('[data-menubar]')) {
      window.pudlApplets.commandsIn(win).forEach(function (c) { add(c.label, c.run, c); });
    }
    win.dispatchEvent(new CustomEvent('pudl:window-menu', { bubbles: true, detail: { key: key, add: add } }));
    return list;
  }

  /* Standard window commands shared by window chrome and site menus. */
  function menuCommands(key) {
    if (key == null) key = state.top && !state.min[state.top] ? state.top : null;
    var win = key && wins[key];
    if (!win || !win.isConnected) return [];
    var p = effectivePlacement(state, key), dock = dockEdge(p), sized = contentSized(key), fixed = restricted(key), list = [];
    function command(id, label, cmd, extra) {
      return Object.assign({ id: id, label: label, run: function () {
        if (wins[key] !== win || !win.isConnected) return;
        var available = menuCommands(key);
        function contains(items) { return items.some(function (c) { return !c.disabled && (c.id === id || (c.items && contains(c.items))); }); }
        if (contains(available)) runCommand(key, cmd);
      } }, extra || {});
    }
    var page = win.querySelector('.win-head a[data-win-action="page"]');
    if (page) list.push(command('page', text('page', 'Open as a page'), 'page'));
    if (shareURL(key)) list.push(command('copy-link', text('copy-link', 'Copy the link'), 'copy-link'));
    var minId = dock ? (state.min[key] ? 'expand' : 'collapse') : (state.min[key] ? 'unminimize' : 'minimize');
    list.push(command(minId, dock ? (state.min[key] ? text('expand', 'Expand') : text('collapse', 'Collapse'))
      : (state.min[key] ? text('restore', 'Restore') : text('minimize', 'Minimize')), 'minimize'));
    if (fixed) list.push(command('restore', text('restore-floating', 'Restore to floating'), 'maximize', { disabled: true }));
    if (!dock && !sized && !fixed) {
      var floating = p.mode === 'floating';
      list.push(command(floating ? 'maximize' : 'restore', floating ? text('maximize', 'Maximize') : text('restore', 'Restore'), 'maximize'));
      var now = zoneFilled(p), here = now ? sixths(now) : '';
      list.push({ id: 'snap', label: text('snap', 'Snap to a zone'), items: Object.keys(ZONE_WORDS).map(function (name) {
        return command('snap:' + name, text('zone-' + name, ZONE_WORDS[name]), 'snap:' + name, { checked: here === ZONES[name].join(',') });
      }) });
    }
    if (!sized && !fixed) list.push(command(dock ? 'undock' : 'dock', dock ? text('undock', 'Undock') : text('dock', 'Dock at the bottom'), 'dock'));
    if (!fixed) list.push(command('reset', sized ? text('reset-position', 'Reset position') : text('reset', 'Reset size and position'), 'reset'));
    list.push(command('close', text('close', 'Close'), 'close', { danger: true }));
    return list;
  }

  function buildMenu(panel, key) {
    var win = wins[key];
    if (!win) return;
    panel.textContent = '';
    var standard = menuCommands(key);
    standard.filter(function (c) { return c.id !== 'close'; }).forEach(function (c) {
      if (c.id === 'snap') { snapItems(panel, key); return; }
      var cmd = ['expand', 'collapse', 'unminimize'].indexOf(c.id) >= 0 ? 'minimize' : c.id === 'restore' ? 'maximize' : c.id === 'undock' ? 'dock' : c.id;
      panel.appendChild(menuItem(c.label, cmd, c));
    });
    var own = contentCommands(win, key);
    menuRuns[key] = own;
    if (own.length) {
      panel.appendChild(sep());
      own.forEach(function (c, i) { panel.appendChild(menuItem(c.label, 'content:' + i, c)); });
    }
    panel.appendChild(sep());
    panel.appendChild(menuItem(text('close', 'Close'), 'close', { danger: true }));
  }

  /* The layout picker: a thumbnail of each layout, each of its zones a
     button that snaps the window there. Its buttons are menu rows, so the
     arrow keys reach them in order, and each says its zone in words. The
     zone the window fills is marked aria-current. */
  function snapItems(panel, key) {
    if (restricted(key)) return;
    var now = zoneFilled(state.place[key]);
    var here = now ? sixths(now) : null;
    var box = document.createElement('div');
    box.className = 'win-snap';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', text('snap', 'Snap to a zone'));
    LAYOUTS.forEach(function (lay) {
      var g = document.createElement('div');
      g.className = 'win-snap-layout';
      g.setAttribute('role', 'group');
      g.setAttribute('aria-label', text('layout-' + lay[0], lay[1]));
      lay[2].forEach(function (name) {
        var z = ZONES[name];
        var b = menuItem('', 'snap:' + name);
        b.classList.add('win-snap-zone');
        b.setAttribute('aria-label', text('zone-' + name, ZONE_WORDS[name]));
        b.style.setProperty('--zl', z[0]);
        b.style.setProperty('--zt', z[1]);
        b.style.setProperty('--zr', z[2]);
        b.style.setProperty('--zb', z[3]);
        if (here === z.join(',')) b.setAttribute('aria-current', 'true');
        g.appendChild(b);
      });
      box.appendChild(g);
    });
    panel.appendChild(box);
  }

  function runCommand(key, cmd) {
    if (!wins[key]) return;
    if (restricted(key) && (['maximize', 'dock', 'reset'].indexOf(cmd) >= 0 || cmd.indexOf('snap:') === 0)) return;
    var p = state.place[key];
    if (cmd === 'page') {
      /* The link carries the command out itself, so its target and rel
         apply, as they do from the title bar. */
      var a = wins[key].querySelector('.win-head a[data-win-action="page"]');
      if (a) a.click();
    } else if (cmd === 'copy-link') copyLink(key);
    else if (cmd === 'minimize') commit(state.min[key] ? raised(state, key) : minimized(state, key), false);
    else if (cmd === 'maximize') commit(maximizeToggled(state, key), false);
    else if (cmd === 'dock') commit(docked(state, key, dockEdge(p) ? null : 'bottom'), false);
    else if (cmd === 'reset') commit(resetPlaced(state, key), false);
    else if (cmd === 'close') close(key, 'button');
    else if (cmd.indexOf('content:') === 0) {
      var c = (menuRuns[key] || [])[+cmd.slice(8)];
      if (c && !c.disabled) c.run();
    } else runSnap(key, cmd);
    if (cmd !== 'close' && wins[key] && !isHidden(state, key)) focusWindow(key);
  }

  function runSnap(key, cmd) {
    var name = cmd.indexOf('snap:') === 0 ? cmd.slice(5) : null;
    if (name && ZONES[name]) commit(snapped(state, key, name), false);
  }

  /* The picker also opens from the maximise button, when a mouse rests on
     it for a moment, in a panel of its own placed against the button. It
     closes when the pointer has left both the button and the panel. */
  function addSnapPanel(el, key) {
    var max = el.querySelector('.win-head [data-win-action="maximize"]');
    if (!max) return;
    if (!max.id) max.id = 'win-max-' + key;
    var id = 'win-snap-' + key;
    var panel = document.getElementById(id);
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'menu-panel win-snap-panel';
      panel.id = id;
      panel.setAttribute('popover', '');
      panel.setAttribute('data-win-menu-for', key);
      panel.setAttribute('data-menu-anchor', max.id);
      panel.setAttribute('aria-label', text('snap', 'Snap to a zone'));
      el.appendChild(panel);
    }
    var openTimer = 0, closeTimer = 0;
    function stay() { clearTimeout(closeTimer); }
    function leave() {
      clearTimeout(openTimer);
      closeTimer = setTimeout(function () { if (panel.matches(':popover-open')) panel.hidePopover(); }, 300);
    }
    max.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      stay();
      if (panel.matches(':popover-open') || dockEdge(state.place[key]) || contentSized(key)) return;
      openTimer = setTimeout(function () {
        if (max.matches(':hover') && wins[key] && !restricted(key) && !panel.matches(':popover-open')) panel.showPopover();
      }, HOVER_MS);
    });
    max.addEventListener('pointerleave', leave);
    max.addEventListener('pointerdown', function () { clearTimeout(openTimer); });
    panel.addEventListener('pointerenter', stay);
    panel.addEventListener('pointerleave', leave);
  }

  /* Returns a window to the placement its markup gave it. */
  function resetPlaced(st, key) {
    if (restricted(key)) return copy(st);
    st = raised(st, key);
    var home = homes[key] || markupPlacement(wins[key], 0);
    st.place[key] = clampPlacement(Object.assign({}, home), innerW(), innerH(), contentSized(key) ? { w: 0, h: 0 } : null);
    return st;
  }

  function openMenu(key) {
    var panel = document.getElementById('win-menu-' + key);
    if (!panel) return;
    function focusFirst() {
      var first = panel.querySelector('.menu-action:not(:disabled)');
      if (first) first.focus();
    }
    if (panel.matches(':popover-open')) { focusFirst(); return; }
    /* pudl-menu.js hides a panel until the toggle event has placed it, and
       a hidden row cannot take focus, so focus waits for that event. */
    panel.addEventListener('toggle', focusFirst, { once: true });
    panel.showPopover();
  }

  /* The key of the window an element sits in, or null. */
  function hostOf(elm) {
    var w = elm && elm.closest && elm.closest('.win');
    return w && layer.contains(w) && wins[w.getAttribute('data-win')] ? w.getAttribute('data-win') : null;
  }

  /* A window opened from a link inside another window opens in that
     window's state: maximised from maximised, the same half from a snapped
     half, and from a floating window, floating one step down and to the
     right, so the opener stays in sight behind it. A step that would run
     past the edge starts again near the top left. */
  var OPENER_STEP = 0.03;
  function fromOpener(host) {
    var p = state.place[host];
    /* A window opened from a docked one opens as it would from the page,
       since a dock's strip belongs to the dock. */
    if (!p || dockEdge(p)) return null;
    var x = p.x + OPENER_STEP, y = p.y + OPENER_STEP;
    if (x + p.w > 1) x = OPENER_STEP;
    if (y + p.h > 1) y = OPENER_STEP;
    var out = { mode: p.mode, x: x, y: y, w: p.w, h: p.h };
    if (p.mode === 'zone') out.zone = p.zone;
    return out;
  }

  /* The placement a window opens with when the URL gives none: whatever a
     pudl:window-place listener supplies, then its opener's state when a link
     inside a window opened it, then the server's style attribute, then the
     markup's mode with a cascade from the top left. */
  function initialPlacement(key, el, index, host) {
    var ev = new CustomEvent('pudl:window-place', {
      detail: { key: key, parent: el.getAttribute('data-win-parent') || null, opener: host || null, placement: null }
    });
    layer.dispatchEvent(ev);
    if (validPlacement(ev.detail.placement)) return Object.assign({}, ev.detail.placement);

    var inherited = host && fromOpener(host);
    if (inherited) return inherited;

    return markupPlacement(el, index);
  }

  /* The placement a window's markup gives it: the position in its style
     if it has one, else its mode with a cascade from the top left. */
  function markupPlacement(el, index) {
    var s = el.style;
    var mode = MODES.indexOf(el.getAttribute('data-win-mode')) >= 0 ? el.getAttribute('data-win-mode') : 'floating';
    /* A docked window's strip comes from --win-dock-size in its style. */
    var size = parseFloat(s.getPropertyValue('--win-dock-size'));
    var dockSize = dockEdge({ mode: mode }) ? (isFinite(size) && size > 0 && size <= 1 ? size : DOCK_SIZE) : null;
    var fromStyle = {
      mode: mode,
      x: parseFloat(s.getPropertyValue('--win-x')), y: parseFloat(s.getPropertyValue('--win-y')),
      w: parseFloat(s.getPropertyValue('--win-w')), h: parseFloat(s.getPropertyValue('--win-h'))
    };
    if (dockSize != null) fromStyle.s = dockSize;
    /* A zone comes from --zone-x, --zone-y, --zone-w and --zone-h. */
    var zone = mode === 'zone' ? gridZone({
      x: parseFloat(s.getPropertyValue('--zone-x')), y: parseFloat(s.getPropertyValue('--zone-y')),
      w: parseFloat(s.getPropertyValue('--zone-w')), h: parseFloat(s.getPropertyValue('--zone-h'))
    }) : null;
    if (mode === 'zone' && !zone) mode = fromStyle.mode = 'floating';
    if (zone) inZone(fromStyle, zone);
    if (validPlacement(fromStyle)) return fromStyle;

    /* The markup's mode still counts without numbers, so a window can open
       maximised, snapped or docked, and the cascade gives it somewhere to
       restore to. */
    var step = (index % 6) * 0.04;
    var cascade = { mode: mode, x: 0.06 + step, y: 0.05 + step, w: 0.55, h: 0.75 };
    if (dockSize != null) cascade.s = dockSize;
    if (zone) inZone(cascade, zone);
    return cascade;
  }

  function announceOpen(el) {
    el.dispatchEvent(new CustomEvent('pudl:window-open', { bubbles: true }));
  }

  /* A window the reader brings forward takes the keyboard, as an activated
     window does on the desktop: focus goes back to what last had it in that
     window, or the first time, to an element marked autofocus, or else to
     the title bar, where the keys that move and resize the window work. A
     window that already holds focus keeps it where it is. The window's own
     menus are not part of what it holds, since they close as they act. */
  function focusWindow(key) {
    var el = wins[key];
    if (!el) return;
    var now = document.activeElement;
    if (now && el.contains(now) && !now.closest('.menu-panel')) return;
    var target = lastFocus[key];
    if (!(target && target.isConnected && el.contains(target) && canFocus(target))) {
      target = el.querySelector('.win-body [autofocus]');
      if (target && !canFocus(target)) target = null;
    }
    target = target || el.querySelector('.win-head');
    if (target) target.focus({ preventScroll: true });
  }

  function canFocus(t) {
    if (t.disabled || t.closest('[hidden], [inert]')) return false;
    return t.getClientRects().length > 0;
  }

  /* A window that has to be fetched arrives some time after the reader
     asked for it, and by then they may have moved on, to a menu, a field
     or another window. It takes focus only if focus is still where it was
     when they asked, or has fallen back to the page, so it never pulls the
     reader away from something they chose in the meantime. */
  function focusUnmoved(asked) {
    var now = document.activeElement;
    return now === asked || !now || now === document.body || now === document.documentElement;
  }

  function open(key, from) {
    if (wins[key]) {
      commit(raised(state, key), false);
      focusWindow(key);
      return;
    }
    if (pending[key]) return;
    pending[key] = true;
    var host = hostOf(from);              // read now: the opener may close while this loads
    var asked = document.activeElement;
    load(key).then(function (el) {
      delete pending[key];
      if (wins[key]) return;            // opened meanwhile, by Back or Forward
      var take = focusUnmoved(asked);
      adopt(el);
      var st = copy(state);
      st.open.push(key);
      st.place[key] = clampPlacement(initialPlacement(key, el, st.open.length - 1, host && wins[host] ? host : null),
                                     innerW(), innerH(), el.getAttribute('data-win-narrow') === 'maximized' ? { w: 0, h: 0 } : null);
      st.top = key;
      openers[key] = from || null;
      commit(st, true);
      announceOpen(el);
      if (take) focusWindow(key);
    }, function (err) {
      delete pending[key];
      /* The window could not be built, so fall back on the item's own page,
         which is where the link pointed all along. */
      if (window.console) console.warn('pudl-windows:', err.message);
      if (from && from.href) location.href = from.href;
    });
  }

  /* Opens a window in place of another, as a link does in a browser tab:
     the new window takes the old one's place in the dock and its placement,
     the old one closes, and the whole move is one history entry, so Back
     returns to the old window. If the new window is already open it is
     brought forward and the old one closes. */
  function replaceWith(oldKey, key, from) {
    if (!wins[oldKey] || oldKey === key) { open(key, from); return; }
    if (wins[key]) {
      markClosing(oldKey, 'replace');
      commit(closed(raised(state, key), oldKey), true);
      focusWindow(key);
      return;
    }
    if (pending[key]) return;
    pending[key] = true;
    var asked = document.activeElement;
    load(key).then(function (el) {
      delete pending[key];
      if (wins[key]) return;
      /* Judged before the old window closes, since closing it would drop
         focus to the page if focus was inside it. */
      var take = focusUnmoved(asked);
      adopt(el);
      var st = copy(state);
      if (!wins[oldKey] || st.open.indexOf(oldKey) < 0) {
        st.open.push(key);
        st.place[key] = clampPlacement(initialPlacement(key, el, st.open.length - 1), innerW(), innerH(), el.getAttribute('data-win-narrow') === 'maximized' ? { w: 0, h: 0 } : null);
      } else {
        st.open.splice(st.open.indexOf(oldKey) + 1, 0, key);
        st.place[key] = Object.assign({}, st.place[oldKey]);
        delete st.min[key];
        markClosing(oldKey, 'replace');
        st = closed(st, oldKey);
      }
      st.top = key;
      openers[key] = null;
      commit(st, true);
      announceOpen(el);
      if (take) focusWindow(key);
    }, function (err) {
      delete pending[key];
      if (window.console) console.warn('pudl-windows:', err.message);
      if (from && from.href) location.href = from.href;
    });
  }

  /* Notes why a window and its children are about to close, which
     pudl:window-close reports. */
  function markClosing(key, reason) {
    closing[key] = reason;
    childrenOf(state, key).forEach(function (c) { closing[c] = 'parent'; });
  }

  function restoreAll() {
    commit(allRestored(state), false);
    if (state.top) focusWindow(state.top);
  }

  /* reason is "button", "key" or "script", for pudl:window-close. */
  function close(key, reason) {
    /* Before a reader's close, or a script's, the window and each child
       closing with it may refuse, as an editor with unsaved changes does
       while it asks about them. A close by the address, by Back or a link,
       cannot be refused, since the address has already moved. */
    var family = [key].concat(childrenOf(state, key));
    var refused = family.some(function (k) {
      return !wins[k].dispatchEvent(new CustomEvent('pudl:window-closing', {
        bubbles: true, cancelable: true, detail: { key: k, reason: k === key ? reason : 'parent' }
      }));
    });
    if (refused) return;
    var back = openers[key];
    delete openers[key];
    markClosing(key, reason);
    commit(closed(state, key), false);
    if (back && back.isConnected) back.focus();
    else if (state.top) focusWindow(state.top);
  }

  /* Brings the page in line with a URL, after Back or Forward or at start.
     An address that names no windows opens the page's default windows. */
  function sync(push) {
    syncing++;
    var named = readURL();
    var st = named || { open: defaults.slice(), top: null, min: {}, place: {} };
    var missing = st.open.filter(function (k) { return !wins[k]; });
    return Promise.all(missing.map(function (k) {
      return load(k).then(function (el) { adopt(el); announceOpen(el); return null; },
                          function (err) {
                            if (window.console) console.warn('pudl-windows:', err.message);
                            return k;
                          });
    })).then(function (failed) {
      syncing--;
      failed.forEach(function (k) { if (k) st = closed(st, k); });
      /* A placement the address gives keeps its size, which the address
         has already checked, and is only brought back inside the layer; a
         window's minimum size, measured against the room the docks leave
         at this moment, would otherwise rewrite the address on loading. */
      st.open.forEach(function (k, i) {
        st.place[k] = st.place[k] ? clampPlacement(st.place[k], innerW(), innerH(), { w: 0, h: 0 })
                                  : clampPlacement(initialPlacement(k, wins[k], i), innerW(), innerH(), wins[k].getAttribute('data-win-narrow') === 'maximized' ? { w: 0, h: 0 } : null);
      });
      if (!st.top) st.top = st.open.filter(function (k) { return !st.min[k]; }).pop() || null;
      if (!named && defaults.length) bare = windowParams(st).join('&');
      commit(st, push);
    });
  }

  /* === Dragging, resizing and snapping =================================== */

  /* Where a drag released here would land, as dock-bottom or a name from
     ZONES. At a side of the inner area a window snaps to that half, or to
     a quarter when the pointer is at a corner too; at the top it
     maximises, or takes a top quarter at a corner. At the foot of the
     layer it docks, except at a bottom corner, which is a quarter. */
  function snapAt(clientX, clientY, r, outer) {
    var nearL = clientX - r.left < SNAP_PX, nearR = r.right - clientX < SNAP_PX;
    var nearT = clientY - r.top < SNAP_PX;
    var cornerT = clientY - r.top < CORNER_PX, cornerB = r.bottom - clientY < CORNER_PX;
    var cornerL = clientX - r.left < CORNER_PX, cornerR = r.right - clientX < CORNER_PX;
    if (nearL || nearR) {
      var side = nearL ? 'left' : 'right';
      return cornerT ? 'top-' + side : cornerB ? 'bottom-' + side : side;
    }
    if (outer.bottom - clientY < SNAP_PX) return 'dock-bottom';
    if (nearT) return cornerL ? 'top-left' : cornerR ? 'top-right' : 'maximized';
    return null;
  }

  /* The outline of where a window will land, in the terms the stylesheet
     lays windows out by, so it matches the docks' strips exactly. */
  var L = 'var(--dock-left, 0px)', R = 'var(--dock-right, 0px)', T = 'var(--dock-top, 0px)', B = 'var(--dock-bottom, 0px)';
  function showGhost(snap) {
    if (!snap) { ghost.hidden = true; return; }
    var g;
    if (snap === 'dock-bottom') {
      var bottom = state.open.some(function (k) { return shownEdge(state, k) === 'bottom'; }) ? B : (DOCK_SIZE * 100) + '%';
      g = ['0px', 'calc(100% - ' + bottom + ')', '100%', bottom];
    } else {
      var z = ZONES[snap];
      var iw = '(100% - ' + L + ' - ' + R + ')', ih = '(100% - ' + T + ' - ' + B + ')';
      g = ['calc(' + L + ' + ' + iw + ' * ' + z[0] + ' / 6)', 'calc(' + T + ' + ' + ih + ' * ' + z[1] + ' / 6)',
           'calc(' + iw + ' * ' + (z[2] - z[0]) + ' / 6)', 'calc(' + ih + ' * ' + (z[3] - z[1]) + ' / 6)'];
    }
    ghost.style.left = g[0]; ghost.style.top = g[1];
    ghost.style.width = g[2]; ghost.style.height = g[3];
    ghost.hidden = false;
  }

  function pxMin(prop, fallback) { return pxOf(layer, prop, fallback); }

  function pxOf(el, prop, fallback) {
    var v = parseFloat(getComputedStyle(el).getPropertyValue(prop));
    return isFinite(v) ? v : fallback;
  }

  /* One pointer gesture on a window: a drag of the title bar or a resize
     from an edge. Pointer events can arrive several times a frame, so each
     one only notes where the pointer is, and the window follows once a
     frame. A dragged window moves by transform, which the compositor
     handles without laying the window out or repainting it; a resized one
     has to be laid out, but only once a frame. The state is committed
     once, when the pointer lifts. */
  function gesture(e, key, edge) {
    if (restricted(key)) return;
    var el = wins[key];
    var target = e.currentTarget;
    var outer = layer.getBoundingClientRect();
    var r = innerRect();
    var min = minFractions(r.width, r.height, el);
    var start = Object.assign({}, state.place[key]);
    var dockSide = shownEdge(state, key);
    var base = start, baseX = e.clientX, baseY = e.clientY;
    var lastX = baseX, lastY = baseY;
    var cur = start, snap = null, moved = false, frame = 0;
    /* A window sized by its content moves at the size it has, which its
       placement does not record, and never snaps, since a zone is a size. */
    var sized = contentSized(key);
    if (sized) {
      var box = el.getBoundingClientRect();
      base = start = Object.assign({}, start, { w: Math.min(1, box.width / r.width), h: Math.min(1, box.height / r.height) });
      min = { w: 0, h: 0 };
    }

    target.setPointerCapture(e.pointerId);

    function begin() {
      moved = true;
      layer.classList.add('dragging');
      if (edge) return;
      /* Dragging a docked window away undocks it: its strip is given back
         to the inner area, which the rest of the drag is measured in. */
      if (dockSide) {
        var free = copy(state);
        free.place[key].mode = 'floating';
        setDocks(free);
        el.removeAttribute('data-win-edge');
        el.classList.remove('win-collapsed');
        r = innerRect();
        min = minFractions(r.width, r.height, el);
      }
      /* Dragging a maximised, snapped or docked window lifts it back to its
         floating size, under the pointer, at the same point along the
         title bar. */
      if (start.mode !== 'floating') {
        var er = el.getBoundingClientRect();
        var along = (baseX - er.left) / (er.width || 1);
        base = {
          mode: 'floating', w: start.w, h: start.h,
          x: (baseX - r.left) / r.width - along * start.w,
          y: dockSide ? (baseY - r.top - 12) / r.height : (er.top - r.top) / r.height
        };
        if (start.s != null) base.s = start.s;
        setPlacement(el, base);
      }
      el.classList.add('win-moving');
    }

    /* Resizing a docked window moves its free edge, and the strip, and
       every other window with it, follows. */
    function dockStep() {
      var head = pxMin('--win-head-docked', 30);
      var span = dockSide === 'left' || dockSide === 'right' ? outer.width : outer.height;
      var reach = { bottom: outer.bottom - lastY, top: lastY - outer.top, left: lastX - outer.left, right: outer.right - lastX }[dockSide];
      var s = Math.min(DOCK_MAX, Math.max((head + 60) / span, reach / span));
      cur = Object.assign({}, start, { s: s });
      layer.style.setProperty('--dock-' + dockSide, (Math.round(s * 1000) / 10) + '%');
      el.style.setProperty('--win-dock-size', fmt(s));
    }

    function step() {
      frame = 0;
      if (edge && dockSide) { dockStep(); return; }
      var dx = (lastX - baseX) / r.width;
      var dy = (lastY - baseY) / r.height;
      if (edge) {
        cur = resizeFrom(base, edge, dx, dy, min);
        setPlacement(el, cur);
        return;
      }
      cur = clampPlacement({ mode: 'floating', x: base.x + dx, y: base.y + dy, w: base.w, h: base.h, s: base.s }, r.width, r.height, min);
      el.style.transform = 'translate(' + (cur.x - base.x) * r.width + 'px, ' + (cur.y - base.y) * r.height + 'px)';
      var s = sized ? null : snapAt(lastX, lastY, r, outer);
      if (s !== snap) { snap = s; showGhost(s); }
    }

    function move(ev) {
      if (!moved) {
        if (Math.abs(ev.clientX - baseX) + Math.abs(ev.clientY - baseY) < CLICK_PX) return;
        begin();
      }
      lastX = ev.clientX;
      lastY = ev.clientY;
      if (!frame) frame = requestAnimationFrame(step);
    }

    function end(ev) {
      cancelGesture = null;
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', end);
      /* The pointer may lift before the frame that would have followed its
         last move, so that move is taken now. */
      if (frame) { cancelAnimationFrame(frame); if (ev.type !== 'policy') step(); }
      layer.classList.remove('dragging');
      showGhost(null);
      el.classList.remove('win-moving');
      el.style.transform = '';
      if (ev.type === 'policy') {
        if (moved) {
          suppressClick = true;
          function releaseClick() {
            document.removeEventListener('pointerup', releaseClick, true);
            document.removeEventListener('pointercancel', releaseClick, true);
            setTimeout(function () { suppressClick = false; }, 0);
          }
          document.addEventListener('pointerup', releaseClick, true);
          document.addEventListener('pointercancel', releaseClick, true);
        }
        if (target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId);
        return;
      }
      if (!moved) return;
      /* The click that follows a drag must not follow the title link. */
      suppressClick = true;
      setTimeout(function () { suppressClick = false; }, 0);
      var st = raised(state, key);
      if (ev.type === 'pointercancel') {
        commit(st, false);
        return;
      }
      if (edge && dockSide) st.place[key] = cur;
      else {
        st.place[key] = Object.assign({}, cur, { mode: 'floating' });
        if (snap === 'dock-bottom') {
          st.place[key].mode = snap;
          if (st.place[key].s == null) st.place[key].s = DOCK_SIZE;
        } else if (snap) inZone(st.place[key], zoneOf(ZONES[snap]));
      }
      commit(st, false);
    }

    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);
    cancelGesture = function () { end({ type: 'policy' }); };
  }

  function resizeFrom(p, edge, dx, dy, min) {
    var minW = min.w, minH = min.h;
    var maxW = min.mw != null ? Math.max(minW, min.mw) : 1, maxH = min.mh != null ? Math.max(minH, min.mh) : 1;
    var x = p.x, y = p.y, w = p.w, h = p.h;
    if (edge.indexOf('e') >= 0) w = Math.min(1 - p.x, maxW, Math.max(minW, p.w + dx));
    if (edge.indexOf('s') >= 0) h = Math.min(1 - p.y, maxH, Math.max(minH, p.h + dy));
    if (edge.indexOf('w') >= 0) {
      x = Math.max(0, p.x + p.w - maxW, Math.min(p.x + p.w - minW, p.x + dx));
      w = p.w + (p.x - x);
    }
    if (edge.indexOf('n') >= 0) {
      y = Math.max(0, p.y + p.h - maxH, Math.min(p.y + p.h - minH, p.y + dy));
      h = p.h + (p.y - y);
    }
    var out = { mode: 'floating', x: x, y: y, w: w, h: h };
    if (p.s != null) out.s = p.s;
    return out;
  }

  /* === Keyboard ========================================================== */

  /* Keys pressed on the title bar itself; keys on the title link or the
     buttons inside it are theirs. */
  function onHeadKey(e, key) {
    /* The keys that open a context menu open the window menu. */
    if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) {
      if (document.getElementById('win-menu-' + key)) { e.preventDefault(); openMenu(key); }
      return;
    }
    if (restricted(key)) return;
    var side = shownEdge(state, key);
    if (e.key === 'Enter') {
      e.preventDefault();
      commit(side ? docked(state, key, null) : maximizeToggled(state, key), false);
      return;
    }
    var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!d || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    /* A docked window stays where it is; Shift with the arrow keys moves
       its free edge, the arrow pointing into the workspace growing it. */
    if (side) {
      if (!e.shiftKey) return;
      var grow = { bottom: -d[1], top: d[1], left: d[0], right: -d[0] }[side];
      if (!grow) return;
      var sd = raised(state, key);
      var pd = sd.place[key];
      pd.s = Math.min(DOCK_MAX, Math.max(0.05, (pd.s != null ? pd.s : DOCK_SIZE) + grow * KEY_STEP));
      commitSoon(sd);
      return;
    }
    /* A window sized by its content moves with the arrow keys at the size
       it has, and Shift does nothing, since its content sets its size. */
    var sized = contentSized(key);
    if (sized && e.shiftKey) return;
    var st = raised(state, key);
    var p = st.place[key];
    p.mode = 'floating';
    var W = innerW(), H = innerH();
    if (sized) {
      var box = wins[key].getBoundingClientRect();
      p.w = Math.min(1, box.width / W);
      p.h = Math.min(1, box.height / H);
    }
    if (e.shiftKey) { p.w += d[0] * KEY_STEP; p.h += d[1] * KEY_STEP; }
    else { p.x += d[0] * KEY_STEP; p.y += d[1] * KEY_STEP; }
    st.place[key] = clampPlacement(p, W, H, sized ? { w: 0, h: 0 } : minFractions(W, H, wins[key]));
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
      if (!KEY_RE.test(key)) return;
      e.preventDefault();
      var host = opener.hasAttribute('data-win-replace') && opener.closest('.win');
      if (host && layer.contains(host)) replaceWith(host.getAttribute('data-win'), key, opener);
      else open(key, opener);
      return;
    }

    var tab = e.target.closest('[data-win-tab]');
    if (tab) {
      e.preventDefault();
      var st = tabbed(state, tab.getAttribute('data-win-tab'));
      commit(st, false);
      if (st.top) focusWindow(st.top);
      return;
    }

    var back = e.target.closest('a[data-win-back]');
    if (back) {
      e.preventDefault();
      if (back.getAttribute('aria-disabled') !== 'true') commit(allMinimized(state), false);
      return;
    }

    var restore = e.target.closest('a[data-win-restore]');
    if (restore) {
      e.preventDefault();
      if (restore.getAttribute('aria-disabled') !== 'true') restoreAll();
      return;
    }

    var cmd = e.target.closest('[data-win-menu-for] [data-win-cmd]');
    if (cmd && layer.contains(cmd)) {
      e.preventDefault();
      if (!cmd.disabled) runCommand(cmd.closest('[data-win-menu-for]').getAttribute('data-win-menu-for'), cmd.getAttribute('data-win-cmd'));
      return;
    }

    var btn = e.target.closest('.win [data-win-action]');
    if (btn && layer.contains(btn)) {
      var action = btn.getAttribute('data-win-action');
      var wk = btn.closest('.win').getAttribute('data-win');
      if (action === 'minimize') { e.preventDefault(); commit(minimizeToggled(state, wk), false); }
      else if (action === 'maximize') { e.preventDefault(); commit(maximizeToggled(state, wk), false); }
      else if (action === 'dock') { e.preventDefault(); commit(docked(state, wk, dockEdge(state.place[wk]) ? null : 'bottom'), false); }
      else if (action === 'close') { e.preventDefault(); close(wk, 'button'); }
    }
  }

  function onPointerDown(e) {
    if (e.button !== 0) return;
    var el = e.target.closest('.win');
    if (!el || !layer.contains(el)) return;
    var key = el.getAttribute('data-win');

    /* A press anywhere in a window raises it at once, before any drag. */
    if (state.top !== key) commit(fronted(state, key), false);

    /* A press on the frame or the title bar is cancelled below, so that a
       drag selects no text, and a cancelled press moves no focus, so the
       window is given the keyboard here, or keys would still go to the
       window behind. A press in the body focuses what it lands on, as
       usual. */
    var handle = e.target.closest('.win-rh');
    if (handle) {
      e.preventDefault();
      focusWindow(key);
      gesture({ currentTarget: handle, pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY },
              key, handle.getAttribute('data-edge'));
      return;
    }
    /* The title bar drags from anywhere but its buttons, the title link
       included; a press that does not move stays a click on the link. */
    var head = e.target.closest('.win-head');
    if (head && !e.target.closest('button, input, select, textarea, .win-chrome')) {
      e.preventDefault();
      focusWindow(key);
      gesture({ currentTarget: head, pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY }, key, null);
    }
  }

  function onDoubleClick(e) {
    var head = e.target.closest('.win-head');
    if (!head || !layer.contains(head) || e.target.closest('a, button, .win-chrome')) return;
    var k = head.closest('.win').getAttribute('data-win');
    commit(dockEdge(state.place[k]) ? docked(state, k, null) : maximizeToggled(state, k), false);
  }

  /* Tabbing into a window behind others brings it to the top. */
  function onFocusIn(e) {
    var el = e.target.closest && e.target.closest('.win');
    if (!el || !layer.contains(el)) return;
    var key = el.getAttribute('data-win');
    /* Remembered, so that bringing the window forward later gives focus
       back to what had it. */
    if (!e.target.closest('.menu-panel')) lastFocus[key] = e.target;
    if (state.top !== key && !isHidden(state, key)) commit(fronted(state, key), false);
  }

  /* Escape closes a child window that is in front, as a lightbox does,
     unless the key is meant for a field in the page. Escape never closes a
     top-level window, so a stray key cannot lose a reader's place. */
  function onEscape(e) {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    var top = state.top;
    if (!top || !parentOf(state, top) || isHidden(state, top)) return;
    var t = e.target;
    if (t && t.closest && t.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return;
    e.preventDefault();
    close(top, 'key');
  }

  function init() {
    layer = document.querySelector('[data-win-layer]');
    if (!layer) return;
    srcTemplate = layer.getAttribute('data-win-src') || '';
    /* The layer names the default windows, not the windows themselves,
       because a default window the address has closed is not in the page. */
    defaults = keyList(layer.getAttribute('data-win-default'));

    ghost = document.createElement('div');
    ghost.className = 'win-ghost';
    ghost.hidden = true;
    layer.appendChild(ghost);

    /* An empty box laid out as the inner area, which the docks leave, for
       measuring it. */
    inner = document.createElement('div');
    inner.className = 'win-inner';
    inner.setAttribute('aria-hidden', 'true');
    layer.appendChild(inner);

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
      var head = e.target.classList && e.target.classList.contains('win-head') ? e.target : null;
      if (head && layer.contains(head)) onHeadKey(e, head.closest('.win').getAttribute('data-win'));
    });
    document.addEventListener('keydown', onEscape);
    window.addEventListener('popstate', function () { sync(false); });

    /* The window menu is built as it opens. beforetoggle does not bubble,
       so it is caught on the way down. */
    layer.addEventListener('beforetoggle', function (e) {
      var panel = e.target;
      if (e.newState !== 'open' || !panel.classList) return;
      if (panel.classList.contains('win-menu')) buildMenu(panel, panel.getAttribute('data-win-menu-for'));
      else if (panel.classList.contains('win-snap-panel')) {
        panel.textContent = '';
        snapItems(panel, panel.getAttribute('data-win-menu-for'));
      }
    }, true);

    /* A side dock moves to the bottom when the layer grows too narrow for
       it, and back when it widens again. */
    function refreshPolicy() {
      if (syncing || !state.open.length) return;
      var stamp = String(narrowLayer()) + state.open.map(function (k) { return k + ':' + restricted(k); }).join(',');
      if (stamp === policyStamp) return;
      policyStamp = stamp;
      if (cancelGesture) cancelGesture();
      layer.querySelectorAll('.menu-panel:popover-open').forEach(function (p) { p.hidePopover(); });
      apply(state);
      layer.dispatchEvent(new CustomEvent('pudl:windows-policy', { bubbles: true }));
    }
    window.addEventListener('resize', refreshPolicy);
    if (window.ResizeObserver) new ResizeObserver(refreshPolicy).observe(layer);
    new MutationObserver(refreshPolicy).observe(layer, { subtree: true, attributes: true,
      attributeFilter: ['data-win-narrow', 'data-win-narrow-width', 'data-win-size'] });

    /* When pudl-regions.js swaps parts of the page, the new list rows and
       dock need marking and linking as the old ones were. */
    document.addEventListener('pudl:regions-swap', function () { apply(state); });

    /* The script interface. Each function does exactly what the matching
       link or button does, the URL and history included, so a project never
       has to click PUDL's own buttons from script. */
    window.pudlWindows = {
      open: function (key, opener) { if (KEY_RE.test(key)) open(key, opener || null); },
      replace: function (oldKey, key) { if (KEY_RE.test(key)) replaceWith(oldKey, key, null); },
      raise: function (key) {
        if (!wins[key]) return;
        commit(raised(state, key), false);
        focusWindow(key);
      },
      minimize: function (key) { if (wins[key]) commit(minimized(state, key), false); },
      dock: function (key, edge) {
        if (!wins[key] || restricted(key) || (edge != null && SIDES.indexOf(edge) < 0)) return;
        commit(docked(state, key, edge || null), false);
      },
      /* zone is a name from ZONES, a rectangle {x, y, w, h} of fractions,
         which is moved to the nearest sixths, or null to float again. */
      snap: function (key, zone) {
        if (!wins[key] || restricted(key) || (typeof zone === 'string' && zone !== 'floating' && !ZONES[zone])) return;
        commit(snapped(state, key, zone), false);
      },
      retitle: retitle,
      minimizeAll: function () { commit(allMinimized(state), false); },
      restoreAll: restoreAll,
      close: function (key) { if (wins[key]) close(key, 'script'); },
      menuCommands: menuCommands,
      shareURL: shareURL,
      copyLink: copyLink,
      effectivePlacement: function (key) { return effectivePlacement(state, key); },
      state: function () { return copy(state); }
    };

    sync(false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
