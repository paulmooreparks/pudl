/* PUDL floating windows. Load after pudl-windows.css, at the end of <body>
   or with defer. The README sets out the markup and the URL grammar; this
   script only enhances what the server has already rendered.

   The URL is the whole state. A page with windows open can be bookmarked,
   reloaded and shared, and Back and Forward step between sets of open
   windows. Opening a window or changing a split dock's arrangement pushes
   a history entry; ordinary activation and placement replace the current one.

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
   docs/proposals/docked-windows.md sets out the rules. A layer with
   data-win-dock-tabs shares its side docks, and with data-win-dock-tabs=
   "all" its top and bottom docks too, under tab strips whose order the
   reader can change; docs/SHARED-DOCKS.md sets out those rules.

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
  /* The edges the window menu docks at, in the order it lists them. */
  var DOCK_EDGES = ['top', 'bottom', 'left', 'right'];
  var DOCK_WORDS = { top: 'Top', bottom: 'Bottom', left: 'Left', right: 'Right' };
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
  var restoreSerial = 0;
  var required = [];
  var dockGroups = {};
  var dockPeek = {};
  var dockRoles = new WeakMap();

  /* data-win-dock-tabs shares the side docks; data-win-dock-tabs="all"
     shares the top and bottom docks as well. */
  function sharedDocks() { return !!layer && layer.hasAttribute('data-win-dock-tabs'); }
  function sharedEdges() {
    if (!sharedDocks()) return [];
    return layer.getAttribute('data-win-dock-tabs') === 'all' ? ['left', 'right', 'top', 'bottom'] : ['left', 'right'];
  }
  function sharedEdge(edge) { return sharedEdges().indexOf(edge) >= 0; }
  function sideEdge(edge) { return edge === 'left' || edge === 'right'; }
  function splitEdge(edge) { return sharedEdge(edge) && layer.hasAttribute('data-win-dock-splits'); }
  function cloneTree(t) { return t ? JSON.parse(JSON.stringify(t)) : null; }
  function treeGroups(t) { return !t ? [] : t.type === 'group' ? [t] : treeGroups(t.first).concat(treeGroups(t.second)); }
  function treeNodes(t) { return !t || t.type === 'group' ? [] : [t].concat(treeNodes(t.first), treeNodes(t.second)); }
  function dockTree(st, edge) { return splitEdge(edge) && st.docks && st.docks[edge] && st.docks[edge].tree; }
  function groupFor(st, edge, key) { return treeGroups(dockTree(st, edge)).filter(function (g) { return g.order.indexOf(key) >= 0; })[0]; }
  function freshId(tree) {
    var used = treeGroups(tree).concat(treeNodes(tree)).map(function (t) { return t.id; }), i = 1;
    while (used.indexOf('g' + i) >= 0) i++;
    return 'g' + i;
  }
  /* Version 1 accepts one axis per edge. Bounds apply to restored data,
     independently of the screen size on which it was saved. */
  function validDockTree(raw, edge) {
    if (!raw || raw.v !== 1) return null;
    var seen = new Set(), keys = new Set(), count = 0;
    function visit(t, depth) {
      if (!t || depth > 32 || ++count > 255 || typeof t.id !== 'string' || !KEY_RE.test(t.id) || t.id.length > 80 || seen.has(t.id)) throw Error('dock tree');
      seen.add(t.id);
      if (t.type === 'group') {
        if (!Array.isArray(t.order) || t.order.length > 256) throw Error('dock group');
        var order = t.order.map(function (k) {
          if (typeof k !== 'string' || !KEY_RE.test(k) || keys.has(k)) throw Error('dock member');
          keys.add(k); return k;
        });
        return { type: 'group', id: t.id, order: order, selected: order.indexOf(t.selected) >= 0 ? t.selected : order[0] || null };
      }
      if (t.type !== 'split' || t.axis !== (sideEdge(edge) ? 'y' : 'x') || !Number.isFinite(t.ratio)) throw Error('dock split');
      return { type: 'split', id: t.id, axis: t.axis, ratio: Math.max(0.01, Math.min(0.99, t.ratio)), first: visit(t.first, depth + 1), second: visit(t.second, depth + 1) };
    }
    try { return visit(raw.tree, 0); } catch (err) { return null; }
  }
  function normalizeDockTree(st, edge, members, d) {
    if (!dockTree(st, edge)) return;
    function prune(t) {
      if (t.type === 'group') {
        t.order = t.order.filter(function (k) { return members.indexOf(k) >= 0; });
        t.order = required.filter(function (k) { return t.order.indexOf(k) >= 0; }).concat(t.order.filter(function (k) { return !requiredWindow(k); }));
        return t.order.length ? t : null;
      }
      t.first = prune(t.first); t.second = prune(t.second);
      return !t.first ? t.second : !t.second ? t.first : t;
    }
    d.tree = prune(d.tree);
    var groups = treeGroups(d.tree);
    if (!groups.length) { delete d.tree; delete d.activeGroup; return; }
    var activeGroup = groups.filter(function (g) { return g.id === d.activeGroup; })[0] || groups[0];
    members.forEach(function (k) { if (!groupFor(st, edge, k)) activeGroup.order.push(k); });
    groups.forEach(function (g) {
      if (g.order.indexOf(st.top) >= 0 && !st.min[st.top]) { g.selected = st.top; activeGroup = g; }
      if (g.order.indexOf(g.selected) < 0 || st.min[g.selected]) g.selected = g.order.filter(function (k) { return !st.min[k]; })[0] || g.order[0];
    });
    d.activeGroup = activeGroup.id;
    d.selected = activeGroup.selected;
    d.order = groups.reduce(function (all, g) { return all.concat(g.order); }, []);
    if (groups.length === 1) { delete d.tree; delete d.activeGroup; }
  }
  function dockBounds(edge) {
    var w = layer.clientWidth, h = layer.clientHeight;
    var top = dockSizePx('top'), bottom = dockSizePx('bottom');
    return sideEdge(edge) ? { x: edge === 'left' ? 0 : w - dockSizePx(edge), y: top, w: dockSizePx(edge), h: Math.max(0, h - top - bottom) }
      : { x: 0, y: edge === 'top' ? 0 : h - dockSizePx(edge), w: w, h: dockSizePx(edge) };
  }
  function dockSizePx(edge) {
    var value = getComputedStyle(layer).getPropertyValue('--dock-' + edge).trim();
    return value.indexOf('%') >= 0 ? parseFloat(value) / 100 * (sideEdge(edge) ? layer.clientWidth : layer.clientHeight) : parseFloat(value) || 0;
  }
  function dockTrack() { return matchMedia('(pointer: coarse)').matches ? 20 : 12; }
  function groupMin(g, edge) {
    return Math.max.apply(null, [80].concat(g.order.map(function (k) {
      return wins[k] ? pxOf(wins[k], sideEdge(edge) ? '--win-min-h' : '--win-min-w', sideEdge(edge) ? 200 : 320) + (sideEdge(edge) ? 40 : 0) : 80;
    })));
  }
  function treeMin(t, edge, st) {
    if (!t) return 0;
    if (t.type === 'group') return t.order.some(function (k) { return !st.min[k]; }) ? groupMin(t, edge) : sideEdge(edge) ? 40 : 80;
    var a = treeMin(t.first, edge, st), b = treeMin(t.second, edge, st);
    return a + b + (a && b ? dockTrack() : 0);
  }
  function treeShowing(t, st) { return treeGroups(t).some(function (g) { return g.order.some(function (k) { return !st.min[k]; }); }); }
  function splitPresentation(st, edge) {
    var tree = dockTree(st, edge);
    if (!tree) return 'single';
    if (railMode(st, edge)) return 'collapsed';
    var bounds = dockBounds(edge);
    return treeMin(tree, edge, st) > (sideEdge(edge) ? bounds.h : bounds.w) ? 'single' : 'split';
  }
  function paneFront(st, edge, key) {
    var g = groupFor(st, edge, key);
    return g && splitPresentation(st, edge) === 'split' ? g.selected : edgeFront(st, edge);
  }
  function splitDestination(st, key, edge, dest) {
    if (!splitEdge(edge) || !dest || restricted(key) || (dockOnly(key) && !sideEdge(edge))) return false;
    var groups = treeGroups(dockTree(st, edge));
    var g = groups.filter(function (item) { return item.id === dest.group; })[0];
    if (!g && dest.group === 'main' && !groups.length) g = { order: dockMembers(st, edge) };
    if (!g || ['tab', 'before', 'after'].indexOf(dest.position) < 0) return false;
    if (dest.position === 'tab') return true;
    if (treeNodes(dockTree(st, edge)).length >= 127) return false;
    function depth(t, id, n) { if (!t) return -1; if (t.id === id) return n; return t.type === 'split' ? Math.max(depth(t.first, id, n + 1), depth(t.second, id, n + 1)) : -1; }
    if (depth(dockTree(st, edge), dest.group, 0) >= 31) return false;
    if (splitPresentation(st, edge) === 'single' && groups.length > 1) return false;
    if (g.order.indexOf(key) >= 0 && g.order.length === 1) return false;
    var remaining = { order: g.order.filter(function (k) { return k !== key; }) };
    var need = groupMin(remaining, edge) + groupMin({ order: [key] }, edge) + dockTrack();
    var r = paneRects[edge] && paneRects[edge][dest.group];
    var bounds = r || dockBounds(edge);
    return !railMode(st, edge) && need <= (sideEdge(edge) ? bounds.h : bounds.w);
  }
  var paneRects = {}, paneSplitters = {};
  var dockDropPreview = null;
  function dockDropAt(key, x, y) {
    var outer = layer.getBoundingClientRect(), px = x - outer.left, py = y - outer.top;
    var specs = layoutDockPanes(state).specs;
    for (var i = 0; i < specs.length; i++) {
      var s = specs[i], edge = s.edge;
      if (!splitEdge(edge) || !s.members.length || restricted(key) || (dockOnly(key) && !sideEdge(edge))) continue;
      var r = s.rect || dockBounds(edge);
      if (px < r.x || px > r.x + r.w || py < r.y || py > r.y + r.h) continue;
      var pos = sideEdge(edge) ? (py - r.y) / r.h : (px - r.x) / r.w;
      var where = pos < 0.25 ? 'before' : pos > 0.75 ? 'after' : 'tab';
      var group = s.pane || { id: groupFor(state, edge, edgeFront(state, edge)) ? groupFor(state, edge, edgeFront(state, edge)).id : 'main' };
      var dest = { group: group.id, position: where };
      if (!splitDestination(state, key, edge, dest)) {
        dest.position = 'tab';
        if (!splitDestination(state, key, edge, dest)) continue;
      }
      return { edge: edge, destination: dest, rect: r };
    }
    /* The outer target creates a dock even when that edge is empty. */
    var edge = px <= SNAP_PX ? 'left' : px >= layer.clientWidth - SNAP_PX ? 'right' : py <= SNAP_PX ? 'top' : py >= layer.clientHeight - SNAP_PX ? 'bottom' : null;
    if (edge && splitEdge(edge) && !dockMembers(state, edge).length && (!dockOnly(key) || sideEdge(edge))) {
      var r = { x: 0, y: 0, w: layer.clientWidth, h: layer.clientHeight };
      if (sideEdge(edge)) { r.w *= DOCK_SIZE; if (edge === 'right') r.x = layer.clientWidth - r.w; }
      else { r.h *= DOCK_SIZE; if (edge === 'bottom') r.y = layer.clientHeight - r.h; }
      return { edge: edge, rect: r };
    }
    return null;
  }
  function showDockDrop(drop) {
    if (!drop) { if (dockDropPreview) dockDropPreview.hidden = true; return; }
    if (!dockDropPreview) { dockDropPreview = document.createElement('div'); dockDropPreview.className = 'win-dock-drop'; dockDropPreview.setAttribute('aria-hidden', 'true'); layer.appendChild(dockDropPreview); }
    var r = Object.assign({}, drop.rect), dest = drop.destination, where = dest && dest.position;
    if (where && where !== 'tab') {
      if (sideEdge(drop.edge)) { r.h /= 2; if (where === 'after') r.y += r.h; }
      else { r.w /= 2; if (where === 'after') r.x += r.w; }
    }
    rectStyle(dockDropPreview, r); dockDropPreview.hidden = false; dockDropPreview.style.zIndex = String(4 * state.open.length + 5);
    dockDropPreview.textContent = !dest ? text('dock-' + drop.edge, DOCK_WORDS[drop.edge]) : where === 'tab' ? text('dock-add-tab', 'Add as tab') : sideEdge(drop.edge)
      ? (where === 'before' ? text('dock-split-above', 'Split above') : text('dock-split-below', 'Split below'))
      : (where === 'before' ? text('dock-split-left', 'Split left') : text('dock-split-right', 'Split right'));
  }
  function placeInDock(st, key, edge, dest) {
    if (!splitDestination(st, key, edge, dest)) return null;
    var work = docked(st, key, edge), d = dockRecord(work, edge);
    if (!d.tree) d.tree = { type: 'group', id: 'main', order: dockMembers(st, edge), selected: d.selected };
    var target = treeGroups(d.tree).filter(function (g) { return g.id === dest.group; })[0];
    treeGroups(d.tree).forEach(function (g) { g.order = g.order.filter(function (k) { return k !== key; }); });
    if (dest.position === 'tab') { target.order.push(key); target.selected = key; d.activeGroup = target.id; }
    else {
      var leaf = { type: 'group', id: freshId(d.tree), order: [key], selected: key };
      var node = { type: 'split', id: '', axis: sideEdge(edge) ? 'y' : 'x', ratio: 0.5,
        first: dest.position === 'before' ? leaf : target, second: dest.position === 'before' ? target : leaf };
      node.id = freshId({ type: 'split', id: '', first: d.tree, second: leaf });
      function replace(t) { if (t === target) return node; if (t.type === 'split') { t.first = replace(t.first); t.second = replace(t.second); } return t; }
      d.tree = replace(d.tree); d.activeGroup = leaf.id;
    }
    return work;
  }
  function dockArrange(edge, action, groupId) {
    if (!dockTree(state, edge)) return;
    var work = copy(state), d = dockRecord(work, edge), groups = treeGroups(d.tree);
    if (action === 'merge') { d.order = groups.reduce(function (a, g) { return a.concat(g.order); }, []); delete d.tree; delete d.activeGroup; }
    else if (action === 'equalize') {
      var bounds = dockBounds(edge), length = sideEdge(edge) ? bounds.h : bounds.w, track = dockTrack();
      var unit = (length - (groups.length - 1) * track) / groups.length;
      function equal(t) {
        if (t.type === 'group') return 1;
        var a = equal(t.first), b = equal(t.second);
        var ratio = unit > 0 ? (a * unit + (a - 1) * track) / ((a + b) * unit + (a + b - 2) * track) : a / (a + b);
        t.ratio = Math.max(0.01, Math.min(0.99, ratio)); return a + b;
      }
      equal(d.tree);
    } else if (action === 'swap') {
      var i = groups.findIndex(function (g) { return g.id === groupId; });
      if (i < 0 || groups.length < 2) return;
      var a = groups[i], b = groups[(i + 1) % groups.length];
      var order = a.order, selected = a.selected;
      a.order = b.order; a.selected = b.selected; b.order = order; b.selected = selected;
    } else return;
    commit(work, true);
  }
  function requiredWindow(key) { return required.indexOf(key) >= 0; }
  function dockOnly(key) { return !!wins[key] && wins[key].hasAttribute('data-win-dock-only'); }
  function railThreshold() {
    var n = Number(layer.getAttribute('data-win-dock-rail-width'));
    return n > 0 && isFinite(n) ? n : 960;
  }
  function collapseThreshold() {
    var n = Number(layer.getAttribute('data-win-dock-collapse-height'));
    return n > 0 && isFinite(n) ? n : 600;
  }
  /* Whether automatic docks are collapsed at the layer's present size: the
     side docks by its width, the top and bottom docks by its height. */
  function autoCollapsed(edge) {
    return sideEdge(edge) ? layer.clientWidth <= railThreshold() : layer.clientHeight <= collapseThreshold();
  }
  /* A collapsed shared dock: an icon rail at a side, its tab strip alone at
     the top or bottom. Either slides a window out over the central area. */
  function railMode(st, edge) {
    return baseRail(st, edge) || !!roomRails[edge];
  }
  function baseRail(st, edge) {
    var d = st.docks && st.docks[edge];
    var mode = d ? d.mode : 'auto';
    var minimizedDock = dockTree(st, edge) ? dockMembers(st, edge).every(function (k) { return !!st.min[k]; }) : !!st.min[edgeFront(st, edge)];
    return minimizedDock || mode === 'rail' || (mode === 'auto' && autoCollapsed(edge));
  }

  /* Room to ask for (issue #16): a window marked data-win-room with a CSS
     length, such as "61rem", asks for that much width while it is in
     front. An automatic shared side dock that would leave it less shows
     as a rail, the widest first, for as long as the window is in front.
     Nothing is written to the address, and the dock is as it was once the
     window closes, loses the front or has room. A dock the reader pinned
     open stays open. */
  var roomRails = {};

  function lengthPx(value) {
    if (!value || !layer) return 0;
    var probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;height:0;width:' + value;
    if (!probe.style.width) return 0;
    layer.appendChild(probe);
    var px = probe.getBoundingClientRect().width;
    probe.remove();
    return px;
  }

  function roomFor(st) {
    var out = {};
    var key = active(st), el = key && wins[key];
    var room = el && lengthPx(el.getAttribute('data-win-room'));
    if (!room) return out;
    var p = effectivePlacement(st, key);
    if (!p || dockEdge(p) || contentSized(key)) return out;
    var z = zoneFilled(p), share = z ? z.w : p.w;
    var W = layer.clientWidth, inner = W, candidates = [];
    ['left', 'right'].forEach(function (edge) {
      var front = edgeFront(st, edge);
      if (!front) return;
      var size = (st.place[front].s != null ? st.place[front].s : DOCK_SIZE) * W;
      if (!sharedEdge(edge)) { inner -= st.min[front] ? pxMin('--win-head-docked', 30) + 1 : size; return; }
      if (baseRail(st, edge)) { inner -= 40; return; }
      var d = st.docks && st.docks[edge];
      inner -= size;
      if (!d || d.mode === 'auto') candidates.push({ edge: edge, size: size });
    });
    candidates.sort(function (a, b) { return b.size - a.size; });
    while (share * inner < room && candidates.length) {
      var c = candidates.shift();
      out[c.edge] = true;
      inner += c.size - 40;
    }
    return out;
  }
  function iconRail(st, edge) { return sideEdge(edge) && railMode(st, edge); }
  function dockRecord(st, edge) {
    if (!st.docks) st.docks = {};
    return st.docks[edge] || (st.docks[edge] = { mode: 'auto', selected: null });
  }
  /* A dock's tabs: its required windows first, in the layer's order, then
     the others in the order the reader gave them, and any the order does
     not mention in the order they opened. */
  function defaultMembers(st, edge) {
    var members = st.open.filter(function (k) { return shownEdge(st, k) === edge; });
    return required.filter(function (k) { return members.indexOf(k) >= 0; })
      .concat(members.filter(function (k) { return !requiredWindow(k); }));
  }
  function dockMembers(st, edge) {
    var members = defaultMembers(st, edge);
    var tree = dockTree(st, edge);
    if (tree) {
      var flat = treeGroups(tree).reduce(function (a, g) { return a.concat(g.order); }, []).filter(function (k) { return members.indexOf(k) >= 0; });
      return flat.concat(members.filter(function (k) { return flat.indexOf(k) < 0; }));
    }
    var order = st.docks && st.docks[edge] && st.docks[edge].order;
    if (!order) return members;
    var fixed = members.filter(requiredWindow), rest = members.filter(function (k) { return !requiredWindow(k); });
    var ranked = order.filter(function (k) { return rest.indexOf(k) >= 0; });
    return fixed.concat(ranked, rest.filter(function (k) { return ranked.indexOf(k) < 0; }));
  }
  /* Moves an ordinary tab to a place among the ordinary tabs of its dock,
     counted from the first of them. */
  function reordered(st, edge, key, index) {
    st = copy(st);
    var pane = groupFor(st, edge, key);
    var members = pane ? pane.order : dockMembers(st, edge);
    var rest = members.filter(function (k) { return !requiredWindow(k); });
    if (requiredWindow(key) || rest.indexOf(key) < 0) return st;
    rest.splice(rest.indexOf(key), 1);
    rest.splice(Math.max(0, Math.min(rest.length, index)), 0, key);
    if (pane) pane.order = members.filter(requiredWindow).concat(rest);
    else dockRecord(st, edge).order = members.filter(requiredWindow).concat(rest);
    return st;
  }
  function dockMode(edge, mode) {
    if (!sharedEdge(edge) || ['auto', 'open', 'rail'].indexOf(mode) < 0) return;
    var st = copy(state);
    dockRecord(st, edge).mode = mode;
    dockMembers(st, edge).forEach(function (key) { delete st.min[key]; });
    delete dockPeek[edge];
    commit(st, false);
    var hiddenFocus = document.activeElement && document.activeElement.closest('.win[hidden]');
    var toggle = layer.querySelector('.win-dock-group[data-dock-edge="' + edge + '"] .win-dock-toggle:not([hidden])');
    if (hiddenFocus && toggle) toggle.focus();
  }

  function normalizeDocks(st) {
    if (!sharedDocks()) return;
    sharedEdges().forEach(function (edge) {
      var members = dockMembers(st, edge), d = dockRecord(st, edge);
      /* The order keeps only the dock's windows, and goes when it is the
         default, so the address carries it only while it says something. */
      if (d.order) d.order = members.join(',') === defaultMembers(st, edge).join(',') ? undefined : members;
      if (!d.order) delete d.order;
      if (members.indexOf(st.top) >= 0) d.selected = st.top;
      if (members.indexOf(d.selected) < 0) d.selected = members[0] || null;
      if (d.size == null && members.length) d.size = st.place[d.selected].s || DOCK_SIZE;
      if (d.size != null) members.forEach(function (key) { st.place[key].s = d.size; });
      normalizeDockTree(st, edge, members, d);
      if (!d.tree && d.order && d.order.join(',') === defaultMembers(st, edge).join(',')) delete d.order;
      if (dockPeek[edge] !== d.selected || !railMode(st, edge) || st.min[d.selected]) delete dockPeek[edge];
    });
  }

  function closeDockTab(key, edge, reason) {
    var pane = groupFor(state, edge, key), candidates = pane && pane.order.filter(function (k) { return k !== key; });
    close(key, reason);
    if (wins[key]) return;
    var survivor = candidates && candidates.filter(function (k) { return state.open.indexOf(k) >= 0; })[0];
    var tab = survivor ? layer.querySelector('[data-dock-key="' + CSS.escape(survivor) + '"]') : layer.querySelector('.win-dock-group[data-dock-edge="' + edge + '"] [aria-selected="true"]');
    if (tab) tab.focus();
  }

  function dismissDockPeek(e) {
    if (!Object.keys(dockPeek).length || !e.target.closest) return;
    if (e.target.closest('[popover]:popover-open, dialog[open]')) return;
    var group = e.target.closest('.win-dock-group');
    var win = e.target.closest('.win'), key = win && win.getAttribute('data-win');
    var changed = false;
    Object.keys(dockPeek).forEach(function (edge) {
      if (group && group.getAttribute('data-dock-edge') === edge) return;
      if (dockPeek[edge] !== key) { delete dockPeek[edge]; changed = true; }
    });
    if (!changed) return;
    /* A press outside the windows, such as on a menu bar's title, is let
       finish first: hiding the peek changes what is in front, and a menu
       bar drawn again for that would lose the press before its click
       arrived (0.80.0). */
    if (layer.contains(e.target)) { apply(state); return; }
    var done = false;
    var finish = function () {
      if (done) return;
      done = true;
      document.removeEventListener('click', after);
      setTimeout(function () { apply(state); }, 0);
    };
    var after = function () { finish(); };
    document.addEventListener('click', after);
    setTimeout(finish, 700);
  }

  /* title, when given, is the tooltip in place of the spoken name. */
  function windowMark(node, key, title) {
    var win = wins[key];
    if (!win) return;
    var glyph = win.getAttribute('data-win-glyph') || 'app';
    if (!/^[a-z][a-z0-9-]*$/.test(glyph)) glyph = 'app';
    var count = Number(win.getAttribute('data-win-attention'));
    count = Number.isSafeInteger(count) && count > 0 ? count : 0;
    var running = win.hasAttribute('data-win-running');
    var progressText = (win.getAttribute('data-win-progress') || '').trim();
    var progress = progressText ? Number(progressText) : NaN;
    progress = isFinite(progress) && progress >= 0 && progress <= 100 ? Math.round(progress) : null;
    var icon = node.querySelector('.win-item-glyph');
    if (!icon) {
      node.innerHTML = '<span class="glyph win-item-glyph" aria-hidden="true"></span><span class="win-item-title"></span><span class="win-item-detail" hidden></span><span class="badge warn win-item-attention" aria-hidden="true"></span><span class="win-item-running" aria-hidden="true"></span><span class="win-item-progress" aria-hidden="true"></span>';
      icon = node.firstChild;
    }
    styleProp(icon, '--glyph', 'var(--glyph-' + glyph + ')');
    setHidden(icon, !win.hasAttribute('data-win-glyph') && !node.hasAttribute('data-dock-key'));
    setText(node.querySelector('.win-item-title'), titleOf(key));
    var detail = node.querySelector('.win-item-detail');
    if (detail) { setText(detail, detailOf(key)); setHidden(detail, !detailOf(key)); }
    var badge = node.querySelector('.win-item-attention');
    setHidden(badge, !count);
    setText(badge, count ? String(count) : '');
    setHidden(node.querySelector('.win-item-running'), !running);
    var meter = node.querySelector('.win-item-progress');
    setHidden(meter, progress === null);
    setText(meter, progress === null ? '' : progress + '%');
    var label = fullTitle(key) + (count ? ', ' + count + ' ' + text('attention', 'needing attention') : '') + (running ? ', ' + text('running', 'running') : '') + (progress === null ? '' : ', ' + progress + '%');
    setAttr(node, 'aria-label', label);
    setAttr(node, 'title', title || label);
  }

  /* Text and hidden set only when they differ (0.69.3); setting text to
     the text a node has still replaces it, which every observer of the
     page then hears about. */
  function setText(el, t) { if (el.textContent !== t) el.textContent = t; }
  function setHidden(el, h) { if (el.hidden !== h) el.hidden = h; }

  function soonPositionDockMenus(group) {
    if (group.__placeSoon) return;
    group.__placeSoon = true;
    var go = function () { if (!group.__placeSoon) return; group.__placeSoon = false; if (group.isConnected) positionDockMenus(group); };
    requestAnimationFrame(go);
    setTimeout(go, 100);
  }

  function positionDockMenus(group) {
    var bounds = group.getBoundingClientRect(), list = group.querySelector('.win-dock-tablist'), clip = list.getBoundingClientRect();
    var rtl = getComputedStyle(group).direction === 'rtl';
    group.querySelectorAll('[data-dock-menu]').forEach(function (button) {
      var entry = list.querySelector('[data-dock-entry="' + CSS.escape(button.getAttribute('data-dock-menu')) + '"]');
      if (!entry) { button.remove(); return; }
      var rail = group.hasAttribute('data-dock-rail');
      var rect = entry.getBoundingClientRect();
      var left = rtl ? rect.left + 5 : rect.right - 23;
      var top = Math.max(clip.top, Math.min(rect.top + (rect.height - 18) / 2, clip.top + list.clientHeight - 18));
      button.hidden = rail || left < clip.left - 1 || left + 18 > clip.left + list.clientWidth + 1;
      button.style.left = (left - bounds.left) + 'px';
      button.style.top = (top - bounds.top) + 'px';
    });
  }

  /* The step an arrow key takes along a dock's strip: 1 toward its end, -1
     toward its start, or 0 for a key across it. An icon rail runs down; a
     strip of text tabs runs in the writing direction. */
  function stripStep(group, edge, key) {
    if (iconRail(state, edge)) return key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0;
    var rtl = getComputedStyle(group).direction === 'rtl';
    return key === (rtl ? 'ArrowLeft' : 'ArrowRight') ? 1 : key === (rtl ? 'ArrowRight' : 'ArrowLeft') ? -1 : 0;
  }

  function focusDockTab(edge, key) {
    var tab = layer.querySelector('[data-dock-key="' + CSS.escape(key) + '"]'), group = tab && tab.closest('.win-dock-group');
    if (!tab) return;
    group.querySelectorAll('[role="tab"]').forEach(function (t) { t.tabIndex = t === tab ? 0 : -1; });
    tab.focus();
  }

  /* Alt+Shift with an arrow key along the strip moves the focused tab one
     place among the ordinary tabs. */
  function moveDockTab(edge, key, step) {
    if (requiredWindow(key)) return;
    var pane = groupFor(state, edge, key);
    var rest = (pane ? pane.order : dockMembers(state, edge)).filter(function (k) { return !requiredWindow(k); });
    var i = rest.indexOf(key);
    if (i < 0 || i + step < 0 || i + step >= rest.length) return;
    commit(reordered(state, edge, key, i + step), false);
    focusDockTab(edge, key);
  }

  /* Dragging an ordinary tab along its strip moves it. A mark shows where
     it will go, among the ordinary tabs only, since required windows keep
     the first places; Escape or a cancelled pointer leaves it where it was. */
  function dragDockTab(e, group, edge) {
    var tab = e.button === 0 && e.target.closest('[data-dock-key]');
    if (!tab || e.ctrlKey || e.metaKey || e.altKey) return;
    /* Preserve native strip scrolling on touch screens. Placement remains
       available through each tab's menu without a drag gesture. */
    if (splitEdge(edge) && e.pointerType === 'touch') return;
    var key = tab.getAttribute('data-dock-key');
    if (requiredWindow(key) && !splitEdge(edge)) return;
    var others = Array.from(group.querySelectorAll('.win-dock-entry')).filter(function (entry) {
      var k = entry.getAttribute('data-dock-entry');
      return k !== key && !requiredWindow(k);
    });
    if (!others.length && !splitEdge(edge)) return;
    var vertical = iconRail(state, edge), rtl = getComputedStyle(group).direction === 'rtl';
    var startX = e.clientX, startY = e.clientY, moving = false, index = -1, mark = null;
    var id = e.pointerId;
    var drop = null, outside = false;

    function placeAt(x, y) {
      var at = vertical ? y : x;
      index = others.filter(function (entry) {
        var r = entry.getBoundingClientRect(), mid = vertical ? r.top + r.height / 2 : r.left + r.width / 2;
        return vertical || !rtl ? mid < at : mid > at;
      }).length;
      var g = group.getBoundingClientRect();
      var ref = others[Math.min(index, others.length - 1)].getBoundingClientRect();
      var after = index >= others.length;
      if (vertical) {
        mark.style.left = (ref.left - g.left) + 'px';
        mark.style.width = ref.width + 'px';
        mark.style.height = '';
        mark.style.top = ((after ? ref.bottom : ref.top) - g.top - 1) + 'px';
      } else {
        var edgeX = (after !== rtl) ? ref.right : ref.left;
        mark.style.left = (edgeX - g.left - 1) + 'px';
        mark.style.top = (ref.top - g.top) + 'px';
        mark.style.height = ref.height + 'px';
        mark.style.width = '';
      }
    }
    function move(ev) {
      if (ev.pointerId !== id) return;
      if (!moving) {
        if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < CLICK_PX) return;
        moving = true;
        if (tab.setPointerCapture) try { tab.setPointerCapture(id); } catch (err) {}
        mark = document.createElement('div');
        mark.className = 'win-dock-mark';
        mark.setAttribute('aria-hidden', 'true');
        mark.toggleAttribute('data-vertical', vertical);
        group.appendChild(mark);
        group.setAttribute('data-dock-dragging', key);
      }
      ev.preventDefault();
      var bounds = group.getBoundingClientRect();
      outside = ev.clientX < bounds.left - 8 || ev.clientX > bounds.right + 8 || ev.clientY < bounds.top - 8 || ev.clientY > bounds.bottom + 8;
      drop = outside && splitEdge(edge) ? dockDropAt(key, ev.clientX, ev.clientY) : null;
      showDockDrop(drop);
      mark.hidden = outside;
      if (!outside && others.length) placeAt(ev.clientX, ev.clientY);
    }
    function finish(ev, keep) {
      document.removeEventListener('pointermove', move, true);
      document.removeEventListener('pointerup', up, true);
      document.removeEventListener('pointercancel', cancel, true);
      document.removeEventListener('keydown', escape, true);
      if (!moving) return;
      if (mark) mark.remove();
      showDockDrop(null);
      group.removeAttribute('data-dock-dragging');
      if (tab.hasPointerCapture && tab.hasPointerCapture(id)) tab.releasePointerCapture(id);
      /* The click a drag ends with does not select the tab. */
      group.__dragged = true;
      setTimeout(function () { group.__dragged = false; }, 0);
      if (keep && drop) {
        var work = drop.destination ? placeInDock(state, key, drop.edge, drop.destination) : docked(state, key, drop.edge);
        if (work) { commit(work, true); focusDockTab(drop.edge, key); }
      } else if (keep && !outside && index >= 0 && !requiredWindow(key)) {
        commit(reordered(state, edge, key, index), false);
        focusDockTab(edge, key);
      }
    }
    function up(ev) { if (ev.pointerId === id) finish(ev, true); }
    function cancel(ev) { if (ev.pointerId === id) finish(ev, false); }
    function escape(ev) {
      if (ev.key !== 'Escape' || !moving) return;
      ev.preventDefault();
      ev.stopPropagation();
      finish(ev, false);
    }
    document.addEventListener('pointermove', move, true);
    document.addEventListener('pointerup', up, true);
    document.addEventListener('pointercancel', cancel, true);
    document.addEventListener('keydown', escape, true);
  }

  function layoutDockPanes(st) {
    var specs = [], splits = [];
    paneRects = {};
    sharedEdges().forEach(function (edge) {
      paneRects[edge] = {};
      var tree = dockTree(st, edge), bounds = dockBounds(edge), mode = splitPresentation(st, edge);
      function layout(t, r) {
        if (t.type === 'group') {
          paneRects[edge][t.id] = r;
          specs.push({ edge: edge, pane: t, rect: r, members: t.order, selected: t.selected }); return;
        }
        var a = treeMin(t.first, edge, st), b = treeMin(t.second, edge, st);
        if (!a) { if (b) layout(t.second, r); return; }
        if (!b) { layout(t.first, r); return; }
        var vertical = sideEdge(edge), length = vertical ? r.h : r.w, track = dockTrack(), available = length - track;
        var firstShowing = treeShowing(t.first, st), secondShowing = treeShowing(t.second, st);
        var first = !firstShowing ? a : !secondShowing ? available - b : Math.max(a, Math.min(available - b, available * t.ratio));
        var r1 = Object.assign({}, r), r2 = Object.assign({}, r), handle = Object.assign({}, r);
        if (vertical) { r1.h = first; handle.y += first; handle.h = track; r2.y += first + track; r2.h -= first + track; }
        else { r1.w = first; handle.x += first; handle.w = track; r2.x += first + track; r2.w -= first + track; }
        if (firstShowing && secondShowing) splits.push({ edge: edge, node: t, rect: handle, length: available, min: a / available, max: 1 - b / available, ratio: first / available });
        layout(t.first, r1); layout(t.second, r2);
      }
      if (tree && mode === 'split') layout(tree, bounds);
      else specs.push({ edge: edge, members: dockMembers(st, edge), selected: edgeFront(st, edge) });
    });
    return { specs: specs, splits: splits };
  }
  function rectStyle(el, r) {
    ['left', 'top', 'width', 'height'].forEach(function (name, i) { styleProp(el, name, [r.x, r.y, r.w, r.h][i] + 'px'); });
    styleProp(el, 'right', 'auto'); styleProp(el, 'bottom', 'auto');
  }
  function outlineResize(win) {
    var mode = win && win.getAttribute('data-win-resize-mode');
    return (mode == null ? layer.getAttribute('data-win-resize-mode') : mode) === 'outline';
  }
  function resizePreview(r) {
    rectStyle(ghost, r);
    ghost.hidden = false;
  }
  function renderDockDividers(splits) {
    var wanted = new Set();
    splits.forEach(function (s) {
      var id = s.edge + '/' + s.node.id, el = paneSplitters[id]; wanted.add(id);
      if (!el) {
        el = document.createElement('div'); el.className = 'win-dock-splitter'; el.tabIndex = 0;
        el.setAttribute('role', 'separator'); el.id = 'pudl-dock-splitter-' + s.edge + '-' + s.node.id;
        el.addEventListener('keydown', function (e) {
          var now = el.__split, vertical = sideEdge(now.edge), delta = e.shiftKey ? 0.1 : 0.01, next;
          if (e.key === 'Enter') next = 0.5;
          else if (e.key === 'Home') next = now.min;
          else if (e.key === 'End') next = now.max;
          else if (e.key === (vertical ? 'ArrowUp' : 'ArrowLeft')) next = now.ratio - delta;
          else if (e.key === (vertical ? 'ArrowDown' : 'ArrowRight')) next = now.ratio + delta;
          else return;
          e.preventDefault(); e.stopPropagation(); setDockRatio(now.edge, now.node.id, next);
        });
        el.addEventListener('dblclick', function () { setDockRatio(el.__split.edge, el.__split.node.id, 0.5); });
        el.addEventListener('pointerdown', function (e) {
          if (e.button !== 0) return;
          e.preventDefault(); e.stopPropagation(); el.focus();
          var start = copy(state), now = el.__split, vertical = sideEdge(now.edge), at = vertical ? e.clientY : e.clientX, id = e.pointerId;
          var outline = outlineResize(), work = start, frame = 0, last = at;
          el.setPointerCapture(id); el.classList.add('dragging');
          function step() {
            frame = 0;
            work = copy(start);
            var n = treeNodes(dockTree(work, now.edge)).filter(function (t) { return t.id === now.node.id; })[0];
            n.ratio = Math.max(now.min, Math.min(now.max, now.ratio + (last - at) / now.length));
            if (outline) {
              var rect = Object.assign({}, now.rect);
              rect[vertical ? 'y' : 'x'] += (n.ratio - now.ratio) * now.length;
              resizePreview(rect);
            } else apply(work);
          }
          function move(ev) {
            if (ev.pointerId !== id) return;
            last = vertical ? ev.clientY : ev.clientX;
            if (!frame) frame = requestAnimationFrame(step);
          }
          function end(ev) {
            if (ev.pointerId != null && ev.pointerId !== id) return;
            cancelGesture = null;
            document.removeEventListener('pointermove', move, true); document.removeEventListener('pointerup', end, true);
            document.removeEventListener('pointercancel', end, true); document.removeEventListener('keydown', escape, true);
            el.classList.remove('dragging'); if (el.hasPointerCapture(id)) el.releasePointerCapture(id);
            if (frame) { cancelAnimationFrame(frame); if (ev.type === 'pointerup') step(); }
            showGhost(null);
            if (ev.type === 'pointerup') commit(outline ? work : state, true); else if (ev.type !== 'policy') apply(start);
          }
          function escape(ev) { if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); end(ev); } }
          document.addEventListener('pointermove', move, true); document.addEventListener('pointerup', end, true);
          document.addEventListener('pointercancel', end, true); document.addEventListener('keydown', escape, true);
          cancelGesture = function () { end({ type: 'policy' }); };
        });
        layer.appendChild(el); paneSplitters[id] = el;
      }
      el.__split = s; rectStyle(el, s.rect); el.style.zIndex = String(4 * state.open.length + 3);
      el.setAttribute('aria-orientation', sideEdge(s.edge) ? 'horizontal' : 'vertical');
      var primary = treeGroups(s.node.first);
      el.setAttribute('aria-label', text('dock-divider', '{title}, {edge} dock divider').replace('{title}', primary.map(function (g) { return fullTitle(g.selected); }).join(', ')).replace('{edge}', text('dock-' + s.edge, DOCK_WORDS[s.edge])));
      el.setAttribute('aria-valuenow', Math.round(s.ratio * 10000) / 100); el.setAttribute('aria-valuemin', Math.round(s.min * 10000) / 100); el.setAttribute('aria-valuemax', Math.round(s.max * 10000) / 100);
      el.setAttribute('aria-controls', primary.map(function (g) { return wins[g.selected] && wins[g.selected].id; }).filter(Boolean).join(' '));
    });
    Object.keys(paneSplitters).forEach(function (id) { if (!wanted.has(id)) { var el = paneSplitters[id]; if (el === document.activeElement) { var tab = layer.querySelector('[role="tab"][aria-selected="true"]'); if (tab) tab.focus(); } el.remove(); delete paneSplitters[id]; } });
  }
  function setDockRatio(edge, id, value) {
    if (!Number.isFinite(value)) return;
    var work = copy(state), node = treeNodes(dockTree(work, edge)).filter(function (t) { return t.id === id; })[0];
    if (!node) return;
    var current = paneSplitters[edge + '/' + id];
    node.ratio = current ? Math.max(current.__split.min, Math.min(current.__split.max, value)) : Math.max(0.01, Math.min(0.99, value));
    commit(work, true);
  }
  function renderDockGroups() {
    if (!sharedDocks()) return;
    var layout = layoutDockPanes(state), wantedGroups = new Set();
    state.open.forEach(function (k) { if (wins[k]) wins[k].removeAttribute('data-win-dock-pane'); });
    layout.specs.forEach(function (spec) {
      var edge = spec.edge, members = spec.members, groupId = spec.pane ? edge + '/' + spec.pane.id : edge;
      wantedGroups.add(groupId);
      var group = dockGroups[groupId];
      if (!group) {
        /* A strip the server drew is adopted, its tabs links to the
           addresses that select them, so a page without script can switch
           tabs too (issue #14); otherwise one is built. */
        group = layer.querySelector(':scope > .win-dock-group[data-dock-edge="' + edge + '"]' + (spec.pane ? '[data-dock-pane="' + spec.pane.id + '"]' : ':not([data-dock-pane])'));
        if (!group) {
          group = document.createElement('div');
          group.className = 'win-dock-group';
          group.setAttribute('data-dock-edge', edge);
          layer.appendChild(group);
        }
        if (!group.querySelector('.win-dock-tablist')) {
          var made = document.createElement('div');
          made.className = 'tablist win-dock-tablist';
          made.setAttribute('role', 'tablist');
          group.insertBefore(made, group.firstChild);
        }
        if (!group.querySelector('.win-dock-toggle')) {
          var toggleButton = document.createElement('button');
          toggleButton.type = 'button';
          toggleButton.className = 'icon-btn win-dock-toggle';
          toggleButton.innerHTML = '<span class="glyph" aria-hidden="true"></span>';
          group.appendChild(toggleButton);
        }
        dockGroups[groupId] = group;
        if (window.ResizeObserver) {
          group.__resizeObserver = new ResizeObserver(function () {
            if (group.__resizeFrame) return;
            group.__resizeFrame = requestAnimationFrame(function () {
              group.__resizeFrame = 0;
              if (!group.isConnected) return;
              var selectedTab = group.querySelector('[role="tab"][aria-selected="true"]');
              if (selectedTab) selectedTab.parentElement.scrollIntoView({ block: 'nearest', inline: 'nearest' });
              positionDockMenus(group);
            });
          });
          group.__resizeObserver.observe(group);
        }
        group.querySelector('.win-dock-tablist').addEventListener('scroll', function () { positionDockMenus(group); });
        group.querySelector('.win-dock-tablist').setAttribute('aria-label', text('dock-' + edge, DOCK_WORDS[edge]));
        group.addEventListener('click', function (e) {
          if (group.__dragged) { e.preventDefault(); return; }
          var menu = e.target.closest('[data-dock-menu]');
          if (menu) {
            var menuKey = menu.getAttribute('data-dock-menu');
            if (railMode(state, edge)) dockPeek[edge] = menuKey;
            commit(raised(state, menuKey), false);
            positionDockMenus(group);
            var panel = document.getElementById('win-menu-' + menuKey);
            panel.setAttribute('data-menu-anchor', menu.id);
            openMenu(menuKey);
            return;
          }
          var tab = e.target.closest('[data-dock-key]');
          if (tab) {
            /* A tab the server drew is a link; script selects in place. */
            e.preventDefault();
            var key = tab.getAttribute('data-dock-key');
            if (railMode(state, edge)) dockPeek[edge] = key;
            commit(raised(state, key), false);
            focusWindow(key);
          } else if (e.target.closest('.win-dock-toggle')) dockMode(edge, railMode(state, edge) ? 'open' : 'rail');
        });
        group.addEventListener('keydown', function (e) {
          var menu = e.target.closest('[data-dock-menu]');
          if (menu && e.key === 'ArrowDown') { e.preventDefault(); menu.click(); return; }
          var tab = e.target.closest('[data-dock-key]');
          if (tab && e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey) {
            var step = stripStep(group, edge, e.key);
            if (step) { e.preventDefault(); moveDockTab(edge, tab.getAttribute('data-dock-key'), step); }
            return;
          }
          if (!tab || e.altKey || e.ctrlKey || e.metaKey) return;
          if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
            e.preventDefault();
            group.querySelector('[data-dock-menu="' + CSS.escape(tab.getAttribute('data-dock-key')) + '"]').click();
            return;
          }
          if (e.shiftKey) { onHeadKey(e, tab.getAttribute('data-dock-key')); return; }
          /* Space selects a tab that is a link, as it does a button. */
          if (e.key === ' ' && tab.tagName === 'A') { e.preventDefault(); tab.click(); return; }
          var tabs = Array.from(group.querySelectorAll('[role="tab"]')), i = tabs.indexOf(tab), next;
          var along = stripStep(group, edge, e.key);
          if (e.key === 'Home') next = tabs[0];
          else if (e.key === 'End') next = tabs[tabs.length - 1];
          else if (along === 1) next = tabs[(i + 1) % tabs.length];
          else if (along === -1) next = tabs[(i + tabs.length - 1) % tabs.length];
          else if (e.key === 'Delete') { e.preventDefault(); closeDockTab(tab.getAttribute('data-dock-key'), edge, 'key'); return; }
          if (next) { e.preventDefault(); tabs.forEach(function (t) { t.tabIndex = t === next ? 0 : -1; }); next.focus(); }
        });
        group.addEventListener('focusout', function (e) {
          if (!group.contains(e.relatedTarget)) group.querySelectorAll('[role="tab"]').forEach(function (t) {
            t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1;
          });
        });
        group.addEventListener('pointerdown', function (e) { dragDockTab(e, group, edge); });
      }
      group.hidden = !members.length;
      var collapsed = railMode(state, edge), rail = iconRail(state, edge);
      var selected = spec.selected, list = group.querySelector('.win-dock-tablist');
      setAttr(list, 'aria-label', text('dock-' + edge, DOCK_WORDS[edge]) + (spec.pane ? ': ' + fullTitle(selected) : ''));
      if (spec.pane) {
        group.setAttribute('data-dock-pane', spec.pane.id);
        var strip = Object.assign({}, spec.rect, { h: 40 });
        if (edge === 'top') strip.y += spec.rect.h - 40;
        rectStyle(group, strip);
        members.forEach(function (k) {
          var win = wins[k]; if (!win) return;
          win.setAttribute('data-win-dock-pane', spec.pane.id);
          ['--dock-pane-x', '--dock-pane-y', '--dock-pane-w', '--dock-pane-h'].forEach(function (p, i) { styleProp(win, p, [spec.rect.x, spec.rect.y, spec.rect.w, spec.rect.h][i] + 'px'); });
        });
      }
      var firstPane = !spec.pane || spec === layout.specs.filter(function (s) { return s.edge === edge; })[0];
      var dockToggle = group.querySelector('.win-dock-toggle');
      dockToggle.hidden = !firstPane;
      if (edge === 'left' || rail) {
        if (group.firstElementChild !== dockToggle) group.insertBefore(dockToggle, list);
      } else if (list.nextElementSibling !== dockToggle) group.insertBefore(dockToggle, list.nextElementSibling);
      group.toggleAttribute('data-dock-rail', rail);
      group.toggleAttribute('data-dock-collapsed', collapsed);
      group.style.zIndex = String(4 * state.open.length + 2);
      list.setAttribute('aria-orientation', rail ? 'vertical' : 'horizontal');
      Array.from(list.children).forEach(function (tab) {
        if (members.indexOf(tab.getAttribute('data-dock-entry')) < 0) tab.remove();
      });
      members.forEach(function (key, i) {
        var tab = list.querySelector('[data-dock-key="' + CSS.escape(key) + '"]');
        if (!tab) {
          var entry = document.createElement('div');
          entry.className = 'section-tab win-dock-entry';
          entry.setAttribute('role', 'presentation');
          entry.setAttribute('data-dock-entry', key);
          tab = document.createElement('button');
          tab.type = 'button';
          tab.setAttribute('role', 'tab');
          tab.setAttribute('data-dock-key', key);
          entry.appendChild(tab);
        }
        if (tab.id !== 'pudl-dock-tab-' + key) tab.id = 'pudl-dock-tab-' + key;
        if (tab.tagName === 'A') {
          /* A link's native drag would take the pointer from a tab drag. */
          tab.draggable = false;
          var selecting = raised(state, key);
          dockRecord(selecting, edge).selected = key;
          setAttr(tab, 'href', urlFor(selecting));
        }
        if (!group.querySelector('[data-dock-menu="' + CSS.escape(key) + '"]')) {
          var menuButton = document.createElement('button');
          menuButton.type = 'button';
          menuButton.className = 'win-dock-menu';
          menuButton.id = 'pudl-dock-menu-' + key;
          menuButton.setAttribute('data-dock-menu', key);
          menuButton.setAttribute('aria-haspopup', 'menu');
          group.appendChild(menuButton);
        }
        var wrapper = tab.parentElement;
        var membership = groupFor(state, edge, key);
        wrapper.toggleAttribute('data-dock-boundary', !spec.pane && !!membership && i > 0 && membership.order[0] === key);
        wrapper.classList.toggle('section-tab', !rail);
        tab.classList.toggle('icon-btn', rail);
        tab.toggleAttribute('data-dock-peek', collapsed && dockPeek[edge] === key && !state.min[key]);
        if (list.children[i] !== wrapper) list.insertBefore(wrapper, list.children[i] || null);
        wrapper.toggleAttribute('data-selected', key === selected);
        wrapper.toggleAttribute('data-dock-only', dockOnly(key));
        var menuControl = group.querySelector('[data-dock-menu="' + CSS.escape(key) + '"]');
        menuControl.toggleAttribute('data-dock-only', dockOnly(key));
        var mt = key === selected ? 0 : -1;
        if (menuControl.tabIndex !== mt) menuControl.tabIndex = mt;
        setAttr(menuControl, 'aria-label', titleOf(key) + ': ' + text('menu', 'Window menu'));
        setAttr(menuControl, 'title', menuControl.getAttribute('aria-label'));
        windowMark(tab, key);
        var win = wins[key];
        if (!win) return;
        if (!win.id) win.id = 'pudl-dock-panel-' + key;
        setAttr(tab, 'aria-controls', win.id);
        setAttr(tab, 'aria-selected', String(key === selected));
        var focused = list.contains(document.activeElement) ? document.activeElement.closest('[role="tab"]') : null;
        var tt = (focused ? tab === focused : key === selected) ? 0 : -1;
        if (tab.tabIndex !== tt) tab.tabIndex = tt;
        if (!dockRoles.has(win)) dockRoles.set(win, { role: win.getAttribute('role'), label: win.getAttribute('aria-labelledby') });
        setAttr(win, 'role', 'tabpanel');
        setAttr(win, 'aria-labelledby', tab.id);
      });
      if (group.getAttribute('data-dock-selected') !== selected) {
        group.setAttribute('data-dock-selected', selected);
        var selectedTab = list.querySelector('[role="tab"][aria-selected="true"]');
        if (selectedTab) selectedTab.parentElement.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
      var toggle = group.querySelector('.win-dock-toggle'), label = collapsed ? text('dock-pin', 'Pin dock open') : text('dock-collapse', 'Collapse dock');
      setAttr(toggle, 'title', label);
      setAttr(toggle, 'aria-label', label);
      styleProp(toggle.firstChild, '--glyph', 'var(--glyph-' + (collapsed ? 'pin' : 'minimize') + ')');
      /* Placing the tabs' menu buttons measures each tab, so it waits for
         the next frame, when the page is laid out anyway, once however
         many times the windows are laid out before it (0.69.3). */
      soonPositionDockMenus(group);
    });
    Object.keys(dockGroups).forEach(function (id) {
      if (wantedGroups.has(id)) return;
      var old = dockGroups[id];
      if (old.__resizeObserver) old.__resizeObserver.disconnect();
      if (old.__resizeFrame) cancelAnimationFrame(old.__resizeFrame);
      old.remove(); delete dockGroups[id];
    });
    renderDockDividers(layout.splits);
    state.open.forEach(function (key) {
      var win = wins[key], saved = dockRoles.get(win);
      if (!saved || sharedEdge(shownEdge(state, key))) return;
      if (saved.role) win.setAttribute('role', saved.role); else win.removeAttribute('role');
      if (saved.label) win.setAttribute('aria-labelledby', saved.label); else win.removeAttribute('aria-labelledby');
      dockRoles.delete(win);
    });
  }

  /* A window's narrow policy: its own data-win-narrow, or else the layer's,
     which sets one for every window (issue #20). A window marked "keep",
     such as a strip docked at the bottom, keeps its placement. */
  function narrowPolicy(el) {
    if (!el) return null;
    return el.getAttribute('data-win-narrow') || (layer && layer.getAttribute('data-win-narrow')) || null;
  }

  /* Policy changes presentation without replacing the placement in the URL. */
  function restricted(key) {
    var el = wins[key];
    if (!el || contentSized(key) || narrowPolicy(el) !== 'maximized') return false;
    var width = Number(layer.getAttribute('data-win-narrow-width'));
    return layer.clientWidth <= (width > 0 && isFinite(width) ? width : NARROW);
  }

  function effectivePlacement(st, key) {
    var p = st.place[key];
    if (!p) return null;
    var out = Object.assign({}, p);
    if (out.zone) out.zone = Object.assign({}, out.zone);
    if (restricted(key) && !sharedEdge(dockEdge(p))) { out.mode = 'maximized'; delete out.zone; }
    return out;
  }

  /* === State and URL ===================================================== */

  function copy(st) {
    var place = {};
    Object.keys(st.place).forEach(function (k) {
      place[k] = Object.assign({}, st.place[k]);
      if (place[k].zone) place[k].zone = Object.assign({}, place[k].zone);
    });
    var out = { open: st.open.slice(), top: st.top, min: Object.assign({}, st.min), place: place, recent: recentOf(st) };
    out.taskbarOrder = taskbarKeys(st);
    if (!gridEmpty(st.grid)) out.grid = copyGrid(st.grid);
    if (st.docks) {
      out.docks = {};
      Object.keys(st.docks).forEach(function (edge) {
        out.docks[edge] = Object.assign({}, st.docks[edge]);
        if (st.docks[edge].order) out.docks[edge].order = st.docks[edge].order.slice();
        if (st.docks[edge].tree) out.docks[edge].tree = cloneTree(st.docks[edge].tree);
      });
    }
    return out;
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

  /* === The grid's lines (0.67.0) ==========================================
     The sixths grid has lines 0 to 6 across (x) and down (y), and a reader
     may move lines 1 to 5 with the splitters drawn where two snapped
     windows meet (docs/proposals/zone-splitters.md). A placement still
     holds its cells of the grid; only where the lines are drawn changes,
     so every snapped window with an edge on a moved line follows it. A
     state keeps the moved lines as grid: { x: { 3: 0.42 }, y: {} }, shares
     of the inner area, and a line nobody moved sits evenly between the
     nearest moved lines on either side, or the edges. A moved line is
     forgotten once no snapped window has an edge on it. In the address the
     moved lines are grid=x3:0.42,y3:0.6. */

  var drawGrid = null;     // the moved lines of the state being applied
  var LINE_GAP = 0.02;     // the least share of the inner area between two moved lines
  var LINE_STEP = 0.01;    // the share an arrow key moves a line, and a sixth with Shift

  function cells(z) { return sixths(z).split(',').map(Number); }

  function moved(grid, axis) { return (grid && grid[axis]) || {}; }

  /* Where line i of an axis is drawn, as a share of the inner area. */
  function linePos(grid, axis, i) {
    if (i <= 0) return 0;
    if (i >= 6) return 1;
    var m = moved(grid, axis);
    if (m[i] != null) return m[i];
    var lo = 0, loPos = 0, hi = 6, hiPos = 1, j;
    for (j = i - 1; j > 0; j--) if (m[j] != null) { lo = j; loPos = m[j]; break; }
    for (j = i + 1; j < 6; j++) if (m[j] != null) { hi = j; hiPos = m[j]; break; }
    return loPos + (hiPos - loPos) * (i - lo) / (hi - lo);
  }

  /* A zone's rectangle as the grid draws it now. */
  function warped(grid, z) {
    var c = cells(z);
    var x = linePos(grid, 'x', c[0]), y = linePos(grid, 'y', c[1]);
    return { x: x, y: y, w: linePos(grid, 'x', c[2]) - x, h: linePos(grid, 'y', c[3]) - y };
  }

  function copyGrid(grid) {
    return { x: Object.assign({}, moved(grid, 'x')), y: Object.assign({}, moved(grid, 'y')) };
  }

  function gridEmpty(grid) {
    return !Object.keys(moved(grid, 'x')).length && !Object.keys(moved(grid, 'y')).length;
  }

  /* grid=x3:0.42,y3:0.6, read leniently: a line out of range, a share out
     of range or out of order with the lines before it is left out. */
  function parseGrid(value) {
    var grid = { x: {}, y: {} };
    (value || '').split(',').forEach(function (part) {
      var m = /^([xy])([1-5]):([0-9.]+)$/.exec(part);
      if (!m) return;
      var axis = m[1], i = Number(m[2]), p = Number(m[3]);
      if (!(p > 0 && p < 1)) return;
      var lower = 0, upper = 1;
      Object.keys(grid[axis]).forEach(function (k) {
        if (+k < i) lower = Math.max(lower, grid[axis][k]);
        if (+k > i) upper = Math.min(upper, grid[axis][k]);
      });
      if (p - lower >= LINE_GAP && upper - p >= LINE_GAP) grid[axis][i] = p;
    });
    return grid;
  }

  function formatGrid(grid) {
    var parts = [];
    ['x', 'y'].forEach(function (axis) {
      Object.keys(moved(grid, axis)).sort().forEach(function (i) { parts.push(axis + i + ':' + fmt(grid[axis][i])); });
    });
    return parts.join(',');
  }

  /* The snapped windows a line move can change: each open window snapped
     to a zone, a half or a quarter, with its cells. A window the layer
     shows maximised for want of room is left out, since its zone is not
     drawn. */
  function snappedCells(st) {
    var out = [];
    st.open.forEach(function (k) {
      var p = st.place[k];
      if (!p || p.mode === 'maximized' || !zoneFilled(p)) return;
      out.push({ key: k, c: cells(zoneFilled(p)) });
    });
    return out;
  }

  /* The lines two open snapped windows meet across, minimised or covered
     or not, as { x3: true }: the lines a splitter divides, now or once the
     windows are shown again. */
  function dividingLines(st) {
    var ws = snappedCells(st), out = {};
    ['x', 'y'].forEach(function (axis) {
      var lo = axis === 'x' ? 0 : 1, hi = lo + 2, a0 = axis === 'x' ? 1 : 0, a1 = a0 + 2;
      ws.forEach(function (a) {
        ws.forEach(function (b) {
          if (a !== b && a.c[hi] === b.c[lo] && Math.max(a.c[a0], b.c[a0]) < Math.min(a.c[a1], b.c[a1])) out[axis + a.c[hi]] = true;
        });
      });
    });
    return out;
  }

  /* Forgets each moved line that no longer divides two snapped windows,
     such as the middle once one of two halves is closed or floated, and
     each that sits where the grid would put it anyway. */
  function pruneGrid(st) {
    if (gridEmpty(st.grid)) { delete st.grid; return; }
    var used = dividingLines(st);
    ['x', 'y'].forEach(function (axis) {
      Object.keys(st.grid[axis]).forEach(function (i) {
        if (!used[axis + i]) { delete st.grid[axis][i]; return; }
        var keep = st.grid[axis][i];
        delete st.grid[axis][i];
        if (Math.abs(linePos(st.grid, axis, +i) - keep) >= 0.0005) st.grid[axis][i] = keep;
      });
    });
    if (gridEmpty(st.grid)) delete st.grid;
  }

  /* Before line i moves, every other line two snapped windows meet across
     on the same axis is held where it is drawn now, so moving the first
     third's edge leaves the last third alone. */
  function pinLines(grid, st, axis, i) {
    var used = dividingLines(st);
    for (var j = 1; j < 6; j++) {
      if (j !== i && used[axis + j] && grid[axis][j] == null) grid[axis][j] = linePos(grid, axis, j);
    }
  }

  /* The least share of the inner area each snapped window may take on each
     axis: its least size, or the size its cells have on the plain grid if
     that is smaller, so a move never forces a window below the size it
     would have had anyway. */
  /* The least sizes are worked out again only when what they depend on
     has changed (0.69.3): the inner area's size, which windows are snapped
     where, and their own limits. Working them out reads each window's
     computed style, and the windows are laid out again on every frame of
     a drag. */
  var minsKey = '', minsCache = null;
  function gridMins(st) {
    var W = innerW(), H = innerH(), cellsList = snappedCells(st);
    var key = W + 'x' + H + '|' + cellsList.map(function (w) {
      var el = wins[w.key];
      return w.key + ':' + w.c.join(',') + ':' + restricted(w.key) + ':' + (el ? (el.getAttribute('data-win-min') || '') : '');
    }).join(';');
    if (key === minsKey && minsCache) return minsCache;
    var out = {};
    cellsList.forEach(function (w) {
      if (restricted(w.key)) return;
      var min = minFractions(W, H, wins[w.key]);
      out[w.key] = { c: w.c, w: Math.min(min.w, (w.c[2] - w.c[0]) / 6), h: Math.min(min.h, (w.c[3] - w.c[1]) / 6) };
    });
    minsKey = key;
    minsCache = out;
    return out;
  }

  function gridOk(grid, mins) {
    return Object.keys(mins).every(function (k) {
      var m = mins[k], c = m.c;
      return linePos(grid, 'x', c[2]) - linePos(grid, 'x', c[0]) >= m.w - 1e-6 &&
             linePos(grid, 'y', c[3]) - linePos(grid, 'y', c[1]) >= m.h - 1e-6;
    });
  }

  /* The nearest share to want that line i may move to: between the moved
     lines either side of it, and as far toward want as every snapped
     window's least size allows, found by halving from where it is. */
  function clampLine(grid, mins, axis, i, want) {
    var m = moved(grid, axis), lower = 0, upper = 1;
    Object.keys(m).forEach(function (k) {
      if (+k < i) lower = Math.max(lower, m[k]);
      if (+k > i) upper = Math.min(upper, m[k]);
    });
    want = Math.max(lower + LINE_GAP, Math.min(upper - LINE_GAP, want));
    var at = function (p) { var g = copyGrid(grid); g[axis][i] = p; return g; };
    if (gridOk(at(want), mins)) return want;
    var a = linePos(grid, axis, i), b = want;
    if (!gridOk(at(a), mins)) return a;
    for (var n = 0; n < 24; n++) {
      var mid = (a + b) / 2;
      if (gridOk(at(mid), mins)) a = mid; else b = mid;
    }
    return a;
  }

  /* After the inner area changes size, a moved line that now squeezes a
     window below its least size goes back toward where the grid puts it,
     and is forgotten if even that will not do. */
  function settleGrid(st) {
    if (gridEmpty(st.grid)) return;
    var mins = gridMins(st);
    if (gridOk(st.grid, mins)) return;
    ['x', 'y'].forEach(function (axis) {
      Object.keys(st.grid[axis]).forEach(function (i) {
        var keep = st.grid[axis][i];
        delete st.grid[axis][i];
        var plain = linePos(st.grid, axis, +i);
        st.grid[axis][i] = plain;
        if (!gridOk(st.grid, mins)) { delete st.grid[axis][i]; return; }
        st.grid[axis][i] = clampLine(st.grid, mins, axis, +i, keep);
      });
    });
    if (gridEmpty(st.grid)) delete st.grid;
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
    return e && !sharedEdge(e) && (e === 'left' || e === 'right') && narrowLayer() ? 'bottom' : e;
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
    var selected = st.docks && st.docks[edge] && st.docks[edge].selected;
    if (sharedEdge(edge) && selected && st.open.indexOf(selected) >= 0 && shownEdge(st, selected) === edge) return selected;
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
        if (sharedEdge(side)) v = railMode(st, side) ? '40px' : ((st.place[k].s || DOCK_SIZE) * 100) + '%';
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
    st.taskbarOrder = keyList(q.get('tb.order'));
    sharedEdges().forEach(function (edge) {
      var m = /^(auto|open|rail):([A-Za-z0-9_-]*)(?::([0-9.]*))?(?::([A-Za-z0-9_,-]*))?$/.exec(q.get('d.' + edge) || '');
      if (m) {
        if (!st.docks) st.docks = {};
        st.docks[edge] = { mode: m[1], selected: m[2] || null };
        var size = Number(m[3]);
        if (m[3] && size > 0 && size <= DOCK_MAX) st.docks[edge].size = size;
        var order = keyList(m[4]);
        if (order.length) st.docks[edge].order = order;
      }
      var raw = q.get('ds.' + edge);
      if (splitEdge(edge) && raw && raw.length <= 32768) {
        try {
          var split = JSON.parse(raw), tree = validDockTree(split, edge);
          if (tree) { var d = dockRecord(st, edge); d.tree = tree; d.activeGroup = split.activeGroup; }
        } catch (err) { /* An invalid split leaves the ordinary dock available. */ }
      }
    });
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
    var grid = parseGrid(q.get('grid'));
    if (!gridEmpty(grid)) st.grid = grid;
    return st;
  }

  /* A state's window parameters. Keys, modes and numbers need no escaping,
     so they are written out by hand and stay readable. */
  function windowParams(st) {
    var dockPreference = st.docks && Object.keys(st.docks).some(function (edge) { return st.docks[edge].mode !== 'auto' || st.docks[edge].size != null || !!st.docks[edge].order; });
    if (!st.open.length && !dockPreference) return [];
    var parts = ['open=' + st.open.join(',')];
    var taskOrder = taskbarKeys(st), defaultOrder = st.open.filter(function (k) { return !parentOf(st, k); });
    if (taskOrder.join(',') !== defaultOrder.join(',')) parts.push('tb.order=' + taskOrder.join(','));
    if (st.top) parts.push('top=' + st.top);
    var mins = st.open.filter(function (k) { return st.min[k]; });
    if (mins.length) parts.push('min=' + mins.join(','));
    st.open.forEach(function (k) {
      if (st.place[k]) parts.push('p.' + k + '=' + formatPlacement(st.place[k]));
    });
    if (!gridEmpty(st.grid)) parts.push('grid=' + formatGrid(st.grid));
    if (st.docks) ['left', 'right', 'top', 'bottom'].forEach(function (edge) {
      var d = st.docks[edge];
      if (!d) return;
      if (splitEdge(edge) && d.tree) parts.push('ds.' + edge + '=' + encodeURIComponent(JSON.stringify({ v: 1, activeGroup: d.activeGroup, tree: d.tree })));
      /* Only what the default would not give back is written (issue #13).
         Read without a selection, a dock selects the window in front if it
         holds it, or else its first tab; read without a size, a dock that
         holds windows takes the size their placements carry. */
      var members = dockMembers(st, edge);
      var chosen = members.indexOf(st.top) >= 0 ? st.top : members[0] || null;
      var selected = d.selected && d.selected !== chosen ? d.selected : '';
      var size = d.size != null && !members.length ? fmt(d.size) : '';
      if (d.mode === 'auto' && !selected && !size && !d.order) return;
      var value = d.mode + ':' + selected;
      if (size || d.order) value += ':' + size;
      if (d.order) value += ':' + d.order.join(',');
      parts.push('d.' + edge + '=' + value);
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

  /* Window-scoped parameters: the
     layer's data-win-params names prefixes, such as "r", and a parameter
     <prefix>.<key> then belongs to window <key>, as the article a reader
     window shows does. "p" is PUDL's own placement prefix and is never a
     host's. */
  function scopedPrefixes() {
    var raw = layer ? layer.getAttribute('data-win-params') || '' : '';
    return raw.split(/[\s,]+/).filter(function (p) { return /^[A-Za-z][A-Za-z0-9_-]*$/.test(p) && p !== 'p'; });
  }

  function scopedOwner(name) {
    var prefixes = scopedPrefixes();
    for (var i = 0; i < prefixes.length; i++) {
      var head = prefixes[i] + '.';
      if (name.indexOf(head) === 0 && KEY_RE.test(name.slice(head.length))) return { prefix: prefixes[i], key: name.slice(head.length) };
    }
    return null;
  }

  /* The URL for a state, keeping every query parameter that is not ours.
     On a page with default windows, the default state is written as no
     window parameters at all, so the page's plain address stays plain, and
     a state with no windows open is written as an empty open=, since no
     parameters would bring the defaults back. */
  function urlFor(st, rename) {
    /* The page's own parameters are kept exactly as written, so that a
       readable ?path=/notes stays readable rather than becoming %2F. A
       window-scoped parameter goes with its window: it is dropped when the
       window is not open, and follows it when it is re-keyed. */
    var parts = [];
    location.search.replace(/^\?/, '').split('&').forEach(function (seg) {
      if (!seg) return;
      var raw = seg.split('=')[0], k = raw;
      try { k = decodeURIComponent(k.replace(/\+/g, ' ')); } catch (e) { /* leave as is */ }
      if (k === 'open' || k === 'top' || k === 'min' || k === 'grid' || k === 'tb.order' || k.indexOf('p.') === 0 || (/^d\.(left|right|top|bottom)$/.test(k) && sharedEdge(k.slice(2))) || (/^ds\.(left|right|top|bottom)$/.test(k) && splitEdge(k.slice(3)))) return;
      var owner = scopedOwner(k);
      if (owner) {
        if (rename && owner.key === rename.from) { parts.push(owner.prefix + '.' + rename.to + seg.slice(raw.length)); return; }
        if (st.open.indexOf(owner.key) < 0) return;
      }
      parts.push(seg);
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
    if (sharedEdge(edge)) return paneFront(st, edge, key) !== key || (railMode(st, edge) && dockPeek[edge] !== key) || (!!dockTree(st, edge) && !!st.min[key]);
    if (edge) return edgeFront(st, edge) !== key;
    var p = parentOf(st, key);
    return !!(st.min[key] || (p && st.min[p]));
  }

  /* Whether a window can be seen (0.66.0): it is in front, or it is the
     window its dock shows and is not collapsed to its title bar, or it
     fills a zone that no window above it shares and no maximised window
     above it covers. A window partly showing behind another is not
     counted, and nothing is measured. On a narrow screen every window is
     maximised, so only the one in front is seen. */
  function shown(st, key) {
    if (!st || st.open.indexOf(key) < 0 || !wins[key] || isHidden(st, key)) return false;
    if (key === active(st)) return true;
    if (shownEdge(st, key)) return !st.min[key];
    var p = effectivePlacement(st, key);
    if (!p || p.mode === 'maximized' || !zoneFilled(p)) return false;
    var mine = sixths(zoneFilled(p));
    for (var i = zOrder.indexOf(key) + 1; i < zOrder.length; i++) {
      var k = zOrder[i];
      if (st.open.indexOf(k) < 0 || isHidden(st, k) || shownEdge(st, k)) continue;
      var q = effectivePlacement(st, k);
      if (!q) continue;
      if (q.mode === 'maximized') return false;
      if (zoneFilled(q) && sixths(zoneFilled(q)) === mine) return false;
    }
    return true;
  }

  /* Each window says once, with pudl:window-seen, when it is first seen,
     which pudl-applets.js waits for to start an applet that asks to start
     then. The windows already seen are kept by element, so a window that
     changes its key stays seen. */
  var seenWins = new WeakSet();
  function announceSeen(st) {
    st.open.forEach(function (k) {
      var el = wins[k];
      if (!el || seenWins.has(el) || !shown(st, k)) return;
      seenWins.add(el);
      el.dispatchEvent(new CustomEvent('pudl:window-seen', { bubbles: true, detail: { key: k } }));
    });
  }

  /* === Splitters between snapped windows (0.67.0) =========================
     A splitter is drawn on a grid line wherever two snapped windows that
     can be seen meet across it, as long as they share it, and moves that
     line for every snapped window with an edge on it. Where a vertical and
     a horizontal splitter cross inside both, as the four quarters do, a
     handle moves both lines at once. Each splitter is a focusable
     separator: the arrow keys move its line by a hundredth of the inner
     area, a sixth with Shift, Home and End to its limits, and Enter or a
     double-click returns the line to the grid. The elements are kept from
     one apply to the next, so a drag or the keyboard's focus survives the
     windows being laid out again. */

  var splitEls = {};       // splitter id -> its element

  function splitSegments(st) {
    var seen = [];
    st.open.forEach(function (k) {
      if (!shown(st, k) || shownEdge(st, k)) return;
      var p = effectivePlacement(st, k);
      if (!p || p.mode === 'maximized' || !zoneFilled(p)) return;
      seen.push({ key: k, c: cells(zoneFilled(p)) });
    });
    var lines = {};
    ['x', 'y'].forEach(function (axis) {
      /* Across x a window's left and right edges are cells 0 and 2 and it
         spans cells 1 to 3; across y, its top and bottom are 1 and 3. */
      var lo = axis === 'x' ? 0 : 1, hi = lo + 2, a0 = axis === 'x' ? 1 : 0, a1 = a0 + 2;
      seen.forEach(function (a) {
        seen.forEach(function (b) {
          if (a === b || a.c[hi] !== b.c[lo] || a.c[hi] <= 0 || a.c[hi] >= 6) return;
          var from = Math.max(a.c[a0], b.c[a0]), to = Math.min(a.c[a1], b.c[a1]);
          if (from >= to) return;
          var id = axis + a.c[hi];
          (lines[id] = lines[id] || []).push({ from: from, to: to, before: a.key, after: b.key });
        });
      });
    });
    var out = [];
    Object.keys(lines).forEach(function (id) {
      var cur = null;
      lines[id].sort(function (p, q) { return p.from - q.from; }).forEach(function (s) {
        if (cur && s.from <= cur.to) {
          cur.to = Math.max(cur.to, s.to);
          if (cur.before.indexOf(s.before) < 0) cur.before.push(s.before);
          if (cur.after.indexOf(s.after) < 0) cur.after.push(s.after);
        } else {
          cur = { axis: id[0], line: +id.slice(1), from: s.from, to: s.to, before: [s.before], after: [s.after] };
          out.push(cur);
        }
      });
    });
    return out;
  }

  function splitterEl(id, cls) {
    var el = splitEls[id];
    if (!el) {
      el = document.createElement('div');
      el.className = cls;
      layer.insertBefore(el, ghost);
      splitEls[id] = el;
    }
    return el;
  }

  function renderSplitters(st) {
    var segs = splitSegments(st), keep = {};
    var mins = segs.length ? gridMins(st) : {};
    var zOf = function (k) { return +(wins[k] && wins[k].style.zIndex) || 0; };
    var names = function (keys) { return keys.map(titleOf).join(text('splitter-and', ' and ')); };
    segs.forEach(function (s) {
      var id = s.axis + s.line + ':' + s.from + '-' + s.to;
      keep[id] = true;
      var el = splitterEl(id, 'win-splitter');
      var other = s.axis === 'x' ? 'y' : 'x';
      var at = linePos(st.grid, s.axis, s.line);
      var n = Math.round(at * 100);
      /* Written only where they change, since every change wakes whatever
         watches the page, and this runs on every frame of a drag. */
      var set = function (name, v) { if (el.getAttribute(name) !== v) el.setAttribute(name, v); };
      var prop = function (name, v) { if (el.style.getPropertyValue(name) !== v) el.style.setProperty(name, v); };
      set('role', 'separator');
      if (el.tabIndex !== 0) el.tabIndex = 0;
      set('aria-orientation', s.axis === 'x' ? 'vertical' : 'horizontal');
      set('data-win-grid', s.axis + s.line);
      prop('--split-at', String(at));
      prop('--split-from', String(linePos(st.grid, other, s.from)));
      prop('--split-to', String(linePos(st.grid, other, s.to)));
      var z = String(Math.max.apply(null, s.before.concat(s.after).map(zOf)) + 1);
      if (el.style.zIndex !== z) el.style.zIndex = z;
      set('aria-valuenow', String(n));
      /* The limits take a search each; they are worked out when a drag
         ends, not on each of its frames. */
      if (!layer.classList.contains('dragging') || !el.hasAttribute('aria-valuemin')) {
        set('aria-valuemin', String(Math.round(clampLine(st.grid, mins, s.axis, s.line, 0) * 100)));
        set('aria-valuemax', String(Math.round(clampLine(st.grid, mins, s.axis, s.line, 1) * 100)));
      }
      set('aria-valuetext', text('splitter-value', '{n}%').split('{n}').join(String(n)));
      set('aria-label', text('splitter', 'Resize {before} and {after}')
        .split('{before}').join(names(s.before)).split('{after}').join(names(s.after)));
    });
    segs.forEach(function (v) {
      if (v.axis !== 'x') return;
      segs.forEach(function (h) {
        if (h.axis !== 'y' || !(v.from < h.line && h.line < v.to && h.from < v.line && v.line < h.to)) return;
        var id = 'c' + v.line + ',' + h.line;
        keep[id] = true;
        var el = splitterEl(id, 'win-splitter-cross');
        var set = function (name, val) { if (el.getAttribute(name) !== val) el.setAttribute(name, val); };
        var prop = function (name, val) { if (el.style.getPropertyValue(name) !== val) el.style.setProperty(name, val); };
        set('aria-hidden', 'true');
        set('data-win-grid', 'x' + v.line + ' y' + h.line);
        prop('--split-x', String(linePos(st.grid, 'x', v.line)));
        prop('--split-y', String(linePos(st.grid, 'y', h.line)));
        var z = String(Math.max.apply(null, v.before.concat(v.after, h.before, h.after).map(zOf)) + 1);
        if (el.style.zIndex !== z) el.style.zIndex = z;
      });
    });
    Object.keys(splitEls).forEach(function (id) {
      if (keep[id]) return;
      splitEls[id].remove();
      delete splitEls[id];
    });
  }

  /* The lines a splitter or a crossing moves, as [axis, line] pairs. */
  function splitLines(el) {
    return el.getAttribute('data-win-grid').split(' ').map(function (g) { return [g[0], +g.slice(1)]; });
  }

  /* The state as it stands, with a grid to change. */
  function withGrid() {
    var work = copy(state);
    work.grid = copyGrid(state.grid);
    return work;
  }

  function forgetLines(lines) {
    var work = withGrid();
    lines.forEach(function (l) { delete work.grid[l[0]][l[1]]; });
    commit(work, false);
  }

  function onSplitterDown(e) {
    var el = e.target.closest && e.target.closest('.win-splitter, .win-splitter-cross');
    if (!el || e.button !== 0 || !layer.contains(el)) return;
    e.preventDefault();
    var lines = splitLines(el), r = innerRect(), mins = gridMins(state), work = withGrid();
    var outline = outlineResize(), start = copy(state), origin = layer.getBoundingClientRect();
    var previews = outline ? lines.map(function () {
      var preview = document.createElement('div');
      preview.className = 'win-ghost'; preview.hidden = true;
      preview.setAttribute('aria-hidden', 'true'); layer.appendChild(preview); return preview;
    }) : [];
    lines.forEach(function (l) { pinLines(work.grid, state, l[0], l[1]); });
    var lastX = e.clientX, lastY = e.clientY, frame = 0, movedAny = false;
    el.setPointerCapture(e.pointerId);
    el.classList.add('dragging');
    layer.classList.add('dragging');
    function step() {
      frame = 0;
      lines.forEach(function (l, i) {
        var f = l[0] === 'x' ? (lastX - r.left) / r.width : (lastY - r.top) / r.height;
        work.grid[l[0]][l[1]] = clampLine(work.grid, mins, l[0], l[1], f);
        if (outline) {
          var at = work.grid[l[0]][l[1]], vertical = l[0] === 'x';
          rectStyle(previews[i], { x: r.left - origin.left + (vertical ? at * r.width - 1 : 0), y: r.top - origin.top + (vertical ? 0 : at * r.height - 1), w: vertical ? 2 : r.width, h: vertical ? r.height : 2 });
          previews[i].hidden = false;
        }
      });
      if (outline) return;
      var view = copy(work);
      view.grid = copyGrid(work.grid);
      apply(view);
    }
    function move(ev) {
      lastX = ev.clientX; lastY = ev.clientY;
      if (!movedAny && Math.abs(lastX - e.clientX) + Math.abs(lastY - e.clientY) < CLICK_PX) return;
      movedAny = true;
      if (!frame) frame = requestAnimationFrame(step);
    }
    function up(ev) {
      if (frame) { cancelAnimationFrame(frame); if (!outline || ev.type === 'pointerup') step(); }
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.classList.remove('dragging');
      layer.classList.remove('dragging');
      previews.forEach(function (preview) { preview.remove(); });
      document.removeEventListener('keydown', escape, true);
      if (outline) {
        cancelGesture = null;
        if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
        if (movedAny && ev.type === 'pointerup') commit(work, true);
        else if (ev.type !== 'policy') apply(start);
      } else if (movedAny) commit(withGrid(), false);
    }
    function escape(ev) { if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); up({ type: 'escape' }); } }
    if (outline) {
      document.addEventListener('keydown', escape, true);
      cancelGesture = function () { up({ type: 'policy' }); };
    }
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  function onSplitterKey(e) {
    var el = e.target;
    if (!el.classList || !el.classList.contains('win-splitter') || !layer.contains(el)) return;
    var l = splitLines(el)[0], axis = l[0], i = l[1];
    var back = axis === 'x' ? 'ArrowLeft' : 'ArrowUp', fwd = axis === 'x' ? 'ArrowRight' : 'ArrowDown';
    var at = linePos(state.grid, axis, i), want;
    if (e.key === back || e.key === fwd) want = at + (e.key === fwd ? 1 : -1) * (e.shiftKey ? 1 / 6 : LINE_STEP);
    else if (e.key === 'Home') want = 0;
    else if (e.key === 'End') want = 1;
    else if (e.key === 'Enter') { e.preventDefault(); forgetLines([l]); return; }
    else return;
    e.preventDefault();
    var work = withGrid();
    pinLines(work.grid, state, axis, i);
    work.grid[axis][i] = clampLine(work.grid, gridMins(state), axis, i, want);
    commitSoon(work);
  }

  function onSplitterDoubleClick(e) {
    var el = e.target.closest && e.target.closest('.win-splitter, .win-splitter-cross');
    if (!el || !layer.contains(el)) return;
    forgetLines(splitLines(el));
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

  /* === The order the windows were last in front ============================
     Kept apart from the stacking order, which a docked window's strip and a
     child's family change: the open windows, the one most recently in
     front first, which state() reports as recent and the switcher below
     walks. */
  var recent = [];
  function trackRecent(st) {
    recent = recent.filter(function (k) { return st.open.indexOf(k) >= 0; });
    st.open.forEach(function (k) { if (recent.indexOf(k) < 0) recent.push(k); });
    if (st.top && st.open.indexOf(st.top) >= 0) { recent.splice(recent.indexOf(st.top), 1); recent.unshift(st.top); }
  }
  function recentOf(st) {
    var out = recent.filter(function (k) { return st.open.indexOf(k) >= 0; });
    st.open.forEach(function (k) { if (out.indexOf(k) < 0) out.push(k); });
    if (st.top && out.indexOf(st.top) > 0) { out.splice(out.indexOf(st.top), 1); out.unshift(st.top); }
    return out;
  }

  /* === The window switcher ===================================================
     On a layer marked data-win-switcher, Ctrl+Tab picks the window that
     was in front before the one in front now, each further Tab with Ctrl
     held the one after that, and Ctrl+Shift+Tab goes the other way; the
     arrow keys move the pick too. Letting go of Ctrl brings the picked
     window to the front, restoring it if it was minimised; Enter does the
     same; Escape, a lost window focus and a press outside the list let go
     without switching. A quick Ctrl+Tab flips between the two windows used
     last, and a list of the windows shows only when Ctrl is held longer
     than a moment, as a menu panel with no button, placed as a palette.
     Docked windows are left out; minimised ones are in. The keys are taken
     on the window in the capture phase and stopped there, ahead of every
     listener in a window, and a modal dialog keeps them. On a Mac the keys
     are the same, since Cmd+Tab is the platform's. */
  var SWITCH_SHOW_MS = 120;
  var picking = null, switchPanel = null;

  function switcherOn() { return !!layer && layer.hasAttribute('data-win-switcher'); }
  function switchable(st, k) {
    var p = effectivePlacement(st, k);
    return !p || !dockEdge(p);
  }
  function switchRows() {
    var list = switchPanel.querySelector('ul');
    list.textContent = '';
    picking.list.forEach(function (k, i) {
      var win = wins[k], glyph = (win && win.getAttribute('data-win-glyph')) || 'app';
      if (!/^[a-z][a-z0-9-]*$/.test(glyph)) glyph = 'app';
      var row = document.createElement('li');
      row.className = 'md-row';
      row.setAttribute('role', 'option');
      row.setAttribute('data-switch-key', k);
      var item = document.createElement('span');
      item.className = 'md-item';
      var icon = document.createElement('span');
      icon.className = 'glyph';
      icon.setAttribute('aria-hidden', 'true');
      icon.style.setProperty('--glyph', 'var(--glyph-' + glyph + ')');
      var name = document.createElement('span');
      name.textContent = titleOf(k);
      item.appendChild(icon);
      item.appendChild(name);
      var d = detailOf(k);
      if (d) { var meta = document.createElement('span'); meta.className = 'md-meta'; meta.textContent = d; item.appendChild(meta); }
      row.appendChild(item);
      list.appendChild(row);
      row.addEventListener('pointerdown', function (e) {
        e.preventDefault(); e.stopPropagation();
        if (!picking) return;
        picking.at = i;
        switchFinish();
      });
    });
    switchMark();
  }
  function switchMark() {
    switchPanel.querySelectorAll('li[data-switch-key]').forEach(function (row, i) {
      var on = i === picking.at;
      row.classList.toggle('active', on);
      row.setAttribute('aria-selected', String(on));
      if (on && switchPanel.matches(':popover-open')) row.scrollIntoView({ block: 'nearest' });
    });
  }
  function switchShow() {
    if (!picking) return;
    clearTimeout(picking.timer);
    if (switchPanel.matches(':popover-open')) return;
    switchRows();
    switchPanel.showPopover();
    switchMark();
  }
  function switchStart(back) {
    var st = state;
    var list = recentOf(st).filter(function (k) { return switchable(st, k); });
    if (list.length < 2) return false;
    /* The first Tab skips the window in front, but not a docked one that
       has the focus: the window wanted then is the undocked one used last. */
    var front = st.top && !st.min[st.top] && switchable(st, st.top) ? st.top : null;
    picking = { list: list, at: back ? list.length - 1 : (list[0] === front ? 1 : 0), timer: 0 };
    if (!switchPanel) {
      switchPanel = document.createElement('div');
      switchPanel.className = 'menu-panel win-switcher';
      switchPanel.setAttribute('popover', 'manual');
      switchPanel.setAttribute('aria-label', text('switcher', 'Switch windows'));
      switchPanel.innerHTML = '<ul class="row-list" role="listbox"></ul>';
      switchPanel.querySelector('ul').setAttribute('aria-label', text('switcher', 'Switch windows'));
      document.body.appendChild(switchPanel);
    }
    picking.timer = setTimeout(switchShow, SWITCH_SHOW_MS);
    return true;
  }
  function switchStep(by) {
    picking.at = (picking.at + by + picking.list.length) % picking.list.length;
    if (switchPanel.matches(':popover-open')) switchMark(); else switchShow();
  }
  function switchEnd() {
    var was = picking;
    picking = null;
    if (was) clearTimeout(was.timer);
    if (switchPanel && switchPanel.matches(':popover-open')) switchPanel.hidePopover();
    return was;
  }
  function switchFinish() {
    var was = switchEnd();
    if (!was) return;
    var k = was.list[was.at];
    if (wins[k] && state.open.indexOf(k) >= 0) { commit(raised(state, k), false); focusWindow(k); }
  }
  function onSwitchKeyDown(e) {
    if (picking) {
      if (e.key === 'Control' || e.key === 'Shift') return;
      if (!e.ctrlKey) { switchFinish(); return; }   // Ctrl went up where the page could not see it
      e.preventDefault(); e.stopPropagation();
      if (e.key === 'Tab') switchStep(e.shiftKey ? -1 : 1);
      else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') switchStep(1);
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') switchStep(-1);
      else if (e.key === 'Escape') switchEnd();
      else if (e.key === 'Enter') switchFinish();
      return;
    }
    if (!switcherOn() || e.key !== 'Tab' || !e.ctrlKey || e.altKey || e.metaKey || e.isComposing) return;
    if (document.querySelector('dialog:modal')) return;
    if (switchStart(e.shiftKey)) { e.preventDefault(); e.stopPropagation(); }
  }
  function onSwitchKeyUp(e) { if (picking && (e.key === 'Control' || !e.ctrlKey)) switchFinish(); }

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
    var edge = shownEdge(st, key);
    if (sharedEdge(edge)) {
      st.min[key] = true;
      if (st.top === key) st.top = nextTop(st, [key]);
      return st;
    }
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

  /* Closes every top-level window the reader may close, with its children;
     a required window stays (0.79.0). */
  function closable(st) {
    return st.open.filter(function (k) { return !parentOf(st, k) && !requiredWindow(k); });
  }
  function allClosed(st) {
    closable(st).forEach(function (k) { st = closed(st, k); });
    return st;
  }

  function maximizeToggled(st, key) {
    if (restricted(key) || dockOnly(key)) return copy(st);
    st = raised(st, key);
    var p = st.place[key];
    p.mode = p.mode === 'floating' ? 'maximized' : 'floating';
    return st;
  }

  /* Snaps a window to a zone, a name from ZONES or a rectangle, or with
     none, lets it float again. */
  function snapped(st, key, zone) {
    if (restricted(key) || dockOnly(key)) return copy(st);
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
    if (restricted(key) || (dockOnly(key) && edge !== 'left' && edge !== 'right')) return copy(st);
    st = raised(st, key);
    var p = st.place[key];
    var oldEdge = dockEdge(p);
    if (edge) {
      p.mode = 'dock-' + edge;
      if (p.s == null) p.s = DOCK_SIZE;
      if (edge !== oldEdge && dockTree(st, edge)) {
        var d = dockRecord(st, edge), groups = treeGroups(d.tree);
        var group = groups.filter(function (g) { return g.id === d.activeGroup; })[0] || groups[0];
        group.order.push(key); group.selected = key;
      }
    } else {
      p.mode = 'floating';
      /* A window marked data-win-undock="<zone>" leaves its dock for that
         zone, a half say, rather than for where it last floated. */
      var to = wins[key] && zoneName(wins[key].getAttribute('data-win-undock'));
      if (to) st.place[key] = inZoneNamed(p, to);
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

  /* Written only where a value changes (0.69.3): this runs for every window
     whenever the windows are laid out, on every frame of a splitter's
     drag among them, and each write wakes whatever watches the page. */
  function styleProp(el, name, value) {
    if (value == null) { if (el.style.getPropertyValue(name)) el.style.removeProperty(name); return; }
    if (el.style.getPropertyValue(name) !== value) el.style.setProperty(name, value);
  }

  function setPlacement(el, p) {
    if (el.getAttribute('data-win-mode') !== p.mode) el.setAttribute('data-win-mode', p.mode);
    styleProp(el, '--win-x', fmt(p.x));
    styleProp(el, '--win-y', fmt(p.y));
    styleProp(el, '--win-w', fmt(p.w));
    styleProp(el, '--win-h', fmt(p.h));
    if (p.s != null) styleProp(el, '--win-dock-size', fmt(p.s));
    /* A zone's rectangle, and a hairline on each side that meets another
       zone rather than the edge of the area. */
    if (p.mode === 'zone') {
      /* Drawn on the grid's lines as they are now. */
      var z = warped(drawGrid, p.zone), c = cells(p.zone);
      styleProp(el, '--zone-x', String(z.x));
      styleProp(el, '--zone-y', String(z.y));
      styleProp(el, '--zone-w', String(z.w));
      styleProp(el, '--zone-h', String(z.h));
      styleProp(el, '--zone-rule-e', c[2] < 6 ? '1px' : '0px');
      styleProp(el, '--zone-rule-s', c[3] < 6 ? '1px' : '0px');
    } else {
      ['--zone-x', '--zone-y', '--zone-w', '--zone-h', '--zone-rule-e', '--zone-rule-s'].forEach(function (v) { styleProp(el, v, null); });
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

  /* A window's detail, the second part of its title: data-win-detail on
     the window, which
     retitle's third argument sets. It is drawn after the title, in the
     title bar, the tabs and the menus, after the separator the layer's
     data-win-text-title-sep gives, " · " unless it says otherwise. The
     title alone is what titleOf and the heading say. */
  function detailOf(key) { return (wins[key] && wins[key].getAttribute('data-win-detail') || '').trim(); }
  function titleSep() { return text('title-sep', ' · '); }
  function fullTitle(key) { var d = detailOf(key); return titleOf(key) + (d ? titleSep() + d : ''); }
  function drawDetail(key) {
    var el = wins[key], head = el && el.querySelector('.win-head'), t = head && head.querySelector('.win-title');
    if (!t) return;
    var d = detailOf(key), span = head.querySelector(':scope > .win-title-detail');
    if (d && !span) { span = document.createElement('span'); span.className = 'win-title-detail'; t.after(span); }
    if (span) { span.textContent = d; span.hidden = !d; }
    if (layer) layer.style.setProperty('--win-title-sep', JSON.stringify(titleSep()));
  }

  /* A window sized by its content, data-win-size="content", has nothing to
     fill, so it always floats: an address or a script that asks for it
     maximised, snapped or docked leaves it floating where it is. */
  function contentSized(key) {
    return !!wins[key] && wins[key].getAttribute('data-win-size') === 'content';
  }

  var reviving = {};
  function revive(key) {
    if (reviving[key] || syncing) return;
    reviving[key] = true;
    load(key).then(function (el) {
      delete reviving[key];
      if (wins[key] || state.open.indexOf(key) < 0) return;
      adopt(el);
      announceOpen(el);
      apply(state);
    }, function (err) {
      delete reviving[key];
      if (window.console) console.warn('pudl-windows:', err.message);
      if (state.open.indexOf(key) >= 0 && !wins[key]) commit(closed(state, key), false);
    });
  }

  function apply(st) {
    if (taskbarDrag) taskbarDrag.cancel();
    st.taskbarOrder = taskbarKeys(st);
    st.open.forEach(function (k) {
      var p = st.place[k];
      if (p && dockOnly(k) && p.mode !== 'dock-left' && p.mode !== 'dock-right') {
        p.mode = 'dock-left';
        delete p.zone;
      }
      if (p && p.mode !== 'floating' && contentSized(k)) {
        st.place[k] = Object.assign({}, p, { mode: 'floating' });
        delete st.place[k].zone;
      }
    });
    normalizeDocks(st);
    roomRails = roomFor(st);
    setDocks(st);
    /* The grid's moved lines: those no snapped window uses are forgotten,
       and those that squeeze a window are let back. The halves are drawn
       by the stylesheet, from the middle line. */
    pruneGrid(st);
    settleGrid(st);
    drawGrid = st.grid || null;
    if (drawGrid && drawGrid.x[3] != null) layer.style.setProperty('--win-grid-x3', String(linePos(drawGrid, 'x', 3)));
    else layer.style.removeProperty('--win-grid-x3');
    /* A window leaving the page says so first, however it was closed, so
       its content can tear down what it set up, and says why, so a project
       can tell a reader closing it from the address moving on. */
    Object.keys(wins).forEach(function (k) {
      if (st.open.indexOf(k) >= 0) return;
      var gone = wins[k];
      if (gone.__winStatuses) gone.__winStatuses.destroy();
      delete wins[k];
      delete lastFocus[k];
      gone.dispatchEvent(new CustomEvent('pudl:window-close', { bubbles: true, detail: { key: k, reason: closing[k] || 'address' } }));
      gone.remove();
    });
    closing = {};
    zOrder = zOrder.filter(function (k) { return st.open.indexOf(k) >= 0; });
    st.open.forEach(function (k) { if (zOrder.indexOf(k) < 0) zOrder.push(k); });
    if (st.top) { zOrder.splice(zOrder.indexOf(st.top), 1); zOrder.push(st.top); }
    trackRecent(st);

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
    /* A window the arrangement names but whose element is not in the page,
       which a restore and another change racing each other can leave, is
       fetched again and placed when it arrives, rather than drawn now
       (0.80.0). */
    st.open.forEach(function (k) { if (!wins[k]) revive(k); });
    zOrder.forEach(function (k, i) {
      var el = wins[k];
      if (!el) return;
      var edge = shownEdge(st, k);
      setPlacement(el, effectivePlacement(st, k));
      el.toggleAttribute('data-win-restricted', restricted(k));
      labelHead(k);
      var hide = isHidden(st, k);
      if (el.hidden !== hide) el.hidden = hide;
      el.classList.toggle('active', k === front);
      if (edge) { if (el.getAttribute('data-win-edge') !== edge) el.setAttribute('data-win-edge', edge); }
      else el.removeAttribute('data-win-edge');
      el.classList.toggle('win-collapsed', !!edge && !sharedEdge(edge) && !!st.min[k]);
      el.toggleAttribute('data-win-dock-shared', sharedEdge(edge));
      el.toggleAttribute('data-win-dock-peek', sharedEdge(edge) && railMode(st, edge) && dockPeek[edge] === k);
      if (sharedEdge(edge)) styleProp(el, '--win-dock-panel-size', ((st.place[k].s || DOCK_SIZE) * 100) + '%');
      /* Two apart, so a splitter can sit just above the windows it
         divides and below the next window up. */
      var z = String(2 * ((edge ? zOrder.length : 0) + i + 1));
      if (el.style.zIndex !== z) el.style.zIndex = z;
    });
    setDocks(st);
    state = st;
    updateLinks();
    renderDocks();
    fitBarsSoon();
    renderDockGroups();
    renderRows();
    syncPane();
    renderSplitters(st);
    announceSeen(st);
    if (taskbarArrangement) taskbarArrangement.refresh();
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
        setAttr(mn, 'aria-label', ml);
        setAttr(mn, 'title', ml);
      }
      var closeButton = el.querySelector('[data-win-action="close"]');
      if (closeButton && closeButton.hidden !== requiredWindow(k)) closeButton.hidden = requiredWindow(k);
      setHref(closeButton, urlFor(requiredWindow(k) ? state : closed(state, k)));
      var max = el.querySelector('[data-win-action="maximize"]');
      setHref(max, urlFor(maximizeToggled(state, k)));
      if (max) {
        var label = restricted(k) ? text('restore-floating', 'Restore to floating') : state.place[k].mode === 'floating' ? text('maximize', 'Maximize') : text('restore', 'Restore');
        setAttr(max, 'aria-disabled', String(restricted(k)));
        setAttr(max, 'aria-label', label);
        setAttr(max, 'title', label);
      }
      var dock = el.querySelector('[data-win-action="dock"]');
      if (dock) {
        setAttr(dock, 'aria-disabled', String(restricted(k)));
        var isDocked = !!dockEdge(state.place[k]);
        setHref(dock, urlFor(docked(state, k, isDocked ? null : 'bottom')));
        var dl = isDocked ? text('undock', 'Undock') : text('dock', 'Dock at the bottom');
        setAttr(dock, 'aria-label', dl);
        setAttr(dock, 'title', dl);
      }
    });
  }

  /* An attribute set only when its value differs (0.69.3), since setting
     it to the value it has still tells everything watching the page that
     it changed, and the window buttons are set again whenever the windows
     are laid out. */
  function setAttr(el, name, value) { if (el.getAttribute(name) !== value) el.setAttribute(name, value); }
  function setHref(a, href) { if (a && a.tagName === 'A') setAttr(a, 'href', href); }

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
  /* The dock of open windows keeps its tabs from one layout to the next
     (0.69.3), each found by its window's key, moved only when out of
     place, and changed only where it differs; before, every tab was made
     again whenever the windows were laid out. */
  function renderDocks() {
    var front = active(state);
    var topRoot = front ? rootOf(state, front) : null;
    document.querySelectorAll('[data-win-dock]').forEach(function (dock) {
      var have = new Map(), entries = stackEntries(dock), focused = document.activeElement;
      if (stackPopup && stackPopup.button === focused) stackPopup.triggerHadFocus = true;
      Array.from(dock.children).forEach(function (a) {
        var id = a.hasAttribute('data-win-stack') ? 'group:' + a.getAttribute('data-win-stack') : a.getAttribute('data-win-tab');
        if (id && !have.has(id)) have.set(id, a); else a.remove();
      });
      have.forEach(function (a, id) { if (!entries.some(function (e) { return e.id === id; })) { a.remove(); have.delete(id); } });
      entries.forEach(function (entry, i) {
        var a = have.get(entry.id), k = entry.keys[0];
        if (!a) {
          a = document.createElement(entry.group ? 'button' : 'a');
          if (entry.group) { a.setAttribute('data-win-stack', entry.group); setupStack(a); }
          else a.setAttribute('data-win-tab', k);
        }
        if (dock.children[i] !== a) dock.insertBefore(a, dock.children[i] || null);
        var cls = 'win-tab' + (entry.group ? ' win-stack' : '') + (entry.keys.every(function (key) { return state.min[key]; }) ? ' minimized' : '');
        if (a.className !== cls) a.className = cls;
        if (taskbarReorderEnabled() && dock.closest('.win-bar')) { a.draggable = false; setAttr(a, 'aria-keyshortcuts', 'Alt+Shift+ArrowLeft Alt+Shift+ArrowRight'); }
        else a.removeAttribute('aria-keyshortcuts');
        if (entry.keys.indexOf(topRoot) >= 0) setAttr(a, 'aria-current', 'true'); else a.removeAttribute('aria-current');
        if (entry.group) stackMark(a, entry);
        else { setAttr(a, 'href', urlFor(tabbed(state, k))); windowMark(a, k, state.min[k] ? text('minimized', '{title} (minimized)').replace('{title}', fullTitle(k)) : fullTitle(k)); }
      });
      if (focused && !focused.isConnected && focused.hasAttribute('data-win-stack') && !stackPopup) recoverStackFocus(dock, focused.getAttribute('data-win-stack'));

    });
    if (stackPopup) stackPopup.refresh();
    refreshStackContext();
  }

  /* A list row whose link opens a window follows that window: the row of the
     window in front is marked current, and each open child gets a row of
     its own beneath its parent's, which goes when the child closes. */
  /* Only the rows whose link opens a window are looked at, not every row
     in the page, and a child's row is kept from one layout to the next and
     changed only where it differs (0.69.3); a long list no longer costs
     every window that is raised. */
  function renderRows() {
    var front = active(state);
    var topRoot = front ? rootOf(state, front) : null;
    var stale = new Set(document.querySelectorAll('.md-row-child[data-win-child]'));
    document.querySelectorAll('.md-row a[data-win-open]').forEach(function (link) {
      var row = link.closest('.md-row');
      if (!row || row.classList.contains('md-row-child') || row.__pudlSeen === renderRows.pass) return;
      row.__pudlSeen = renderRows.pass;
      var key = link.getAttribute('data-win-open');
      var current = key === topRoot && !isHidden(state, key);
      row.classList.toggle('active', current);
      if (current) setAttr(link, 'aria-current', 'true');
      else if (link.hasAttribute('aria-current')) link.removeAttribute('aria-current');
      /* A menu panel lists places, and a child window is not one, so a
         panel's rows are marked but gain no child rows. */
      if (state.open.indexOf(key) < 0 || row.closest('[popover]')) return;

      var after = row;
      childrenOf(state, key).forEach(function (c) {
        var child = after.nextElementSibling;
        if (!(child && child.getAttribute('data-win-child') === c)) {
          child = document.createElement('div');
          child.setAttribute('data-win-child', c);
          var made = document.createElement('a');
          made.className = 'md-item';
          made.setAttribute('data-win-tab', c);
          child.appendChild(made);
          after.after(child);
        }
        stale.delete(child);
        var cls = 'md-row md-row-child' + (c === front ? ' active' : '');
        if (child.className !== cls) child.className = cls;
        var a = child.firstElementChild;
        setAttr(a, 'href', urlFor(raised(state, c)));
        if (c === front) setAttr(a, 'aria-current', 'true'); else if (a.hasAttribute('aria-current')) a.removeAttribute('aria-current');
        setText(a, fullTitle(c));
        after = child;
      });
    });
    renderRows.pass++;
    stale.forEach(function (r) { r.remove(); });
  }
  renderRows.pass = 1;

  /* In a master-detail layout narrow enough to show one pane at a time, the
     windows are the detail pane: it shows while any window the reader
     opened does. A default window is part of the page rather than a record,
     so it does not turn the pane over by itself.

     A link marked data-win-back minimises every window, which also
     returns to the list, one marked data-win-restore brings them all
     back, and one marked data-win-close-all closes every window the reader
     may close (0.79.0). Each is a real link to the state it produces, and
     is marked aria-disabled while it would change nothing. */
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
    linkAll('a[data-win-close-all]', urlFor(allClosed(state)), closable(state).length > 0);
  }

  function linkAll(selector, href, useful) {
    document.querySelectorAll(selector).forEach(function (a) {
      a.setAttribute('href', href);
      if (useful) a.removeAttribute('aria-disabled');
      else a.setAttribute('aria-disabled', 'true');
    });
  }

  /* Applies a state and records it in the URL. Opening a window and split
     arrangement operations push history; ordinary placement replaces it. */
  function commit(st, push, rename) {
    clearTimeout(urlTimer);
    if (rename && taskbarArrangement) taskbarArrangement.remap(rename.from, rename.to);
    apply(st);
    var url = urlFor(st, rename);
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
    if (!head) return;
    var label = (restricted(key) ? text('head-restricted', 'Window: {title}. Placement is fixed at this workspace width. Shift F10 opens the window menu.') : text('head',
      'Window: {title}. Arrow keys move it, Shift with arrow keys resizes it, Enter maximizes or restores it.')
      ).split('{title}').join(titleOf(key));
    if (head.getAttribute('aria-label') !== label) head.setAttribute('aria-label', label);
  }

  /* Gives a window a new title, which the title bar's spoken name, its
     dock tab and its list row follow at once. */
  function retitle(key, title, detail) {
    var t = wins[key] && wins[key].querySelector('.win-title');
    if (!t) return;
    t.textContent = String(title);
    if (detail !== undefined) {
      if (detail) wins[key].setAttribute('data-win-detail', String(detail)); else wins[key].removeAttribute('data-win-detail');
    }
    drawDetail(key);
    labelHead(key);
    renderDocks();
    fitBarsSoon();
    renderDockGroups();
    renderRows();
  }

  /* === Updating a window in place =========================================
     A window's content can change without the page loading again (issue
     #17): a form marked data-win-submit is sent with fetch and the window
     takes the answer's content, and pudlWindows.reload(key) and update(key,
     markup) do the same from script. The window keeps its key, placement,
     place in the stack and dock tab; its body, title and status marks come
     from the new markup. Focus stays on the same field when the new body
     has it, by id or by name, and otherwise goes to the new body; a notice
     in the new content is announced. */
  var WINDOW_HEADER = 'X-PUDL-Window';
  var STATUS_ATTRS = ['data-win-glyph', 'data-win-attention', 'data-win-running', 'data-win-progress'];
  var announceRegion = null;

  function announce(words) {
    if (!words) return;
    if (!announceRegion) {
      announceRegion = document.createElement('div');
      announceRegion.className = 'visually-hidden';
      announceRegion.setAttribute('role', 'status');
      announceRegion.setAttribute('aria-live', 'polite');
      layer.appendChild(announceRegion);
    }
    /* Emptied first, so the same words said twice are said again. */
    announceRegion.textContent = '';
    setTimeout(function () { announceRegion.textContent = words; }, 50);
  }

  /* The window element in a piece of markup: the one with the key, or the
     only window it holds. */
  function windowIn(frag, key) {
    var el = frag.querySelector('.win[data-win="' + CSS.escape(key) + '"]');
    if (el) return el;
    var all = frag.querySelectorAll('.win');
    return all.length === 1 && !frag.querySelector('[data-win-layer]') ? all[0] : null;
  }

  function swapIn(key, fresh) {
    var win = wins[key];
    var body = win && win.querySelector('.win-body'), next = fresh && fresh.querySelector('.win-body');
    if (!body || !next) return false;
    var active = document.activeElement, held = body.contains(active) && active !== body;
    var id = held && active.id, name = held && active.getAttribute('name');
    var scroll = body.scrollTop;
    var nextBody = document.importNode(next, true);
    body.replaceWith(nextBody);
    if (!nextBody.hasAttribute('tabindex')) nextBody.tabIndex = 0;
    nextBody.scrollTop = scroll;
    /* A whole window brings its status marks; a body alone leaves them. */
    var whole = fresh.matches && fresh.matches('.win');
    if (whole) STATUS_ATTRS.forEach(function (a) {
      if (fresh.hasAttribute(a)) win.setAttribute(a, fresh.getAttribute(a));
      else win.removeAttribute(a);
    });
    var title = whole && fresh.querySelector('.win-title');
    if (title && (title.textContent.trim() !== titleOf(key) || (fresh.getAttribute('data-win-detail') || '') !== detailOf(key))) retitle(key, title.textContent.trim(), fresh.getAttribute('data-win-detail') || '');
    delete lastFocus[key];
    if (body.contains(active) || active === body || !active || active === document.body) {
      var same = (id && nextBody.querySelector('#' + CSS.escape(id))) ||
        (name && nextBody.querySelector('[name="' + CSS.escape(name) + '"]'));
      var target = same && canFocus(same) ? same : nextBody;
      if (held || active === body) target.focus({ preventScroll: true });
    }
    var notice = nextBody.querySelector('.notice, [role="alert"], [role="status"]');
    if (notice) announce(notice.textContent.replace(/\s+/g, ' ').trim());
    win.dispatchEvent(new CustomEvent('pudl:window-update', { bubbles: true, detail: { key: key } }));
    return true;
  }

  /* Takes a window's content again from its source. */
  function reload(key) {
    if (!wins[key]) return Promise.resolve(false);
    return load(key).then(function (el) { return swapIn(key, el); });
  }

  /* Gives a window new content from markup: a window element, or HTML
     holding one, or HTML holding only the new body. */
  function update(key, markup) {
    if (!wins[key] || markup == null) return false;
    var el = markup;
    if (typeof markup === 'string') {
      var t = document.createElement('template');
      t.innerHTML = markup;
      el = windowIn(t.content, key);
      if (!el) {
        /* Markup without a window is the new body, or holds it. */
        var wrap = document.createElement('div');
        var given = t.content.querySelector('.win-body');
        if (given) wrap.appendChild(given);
        else {
          var made = document.createElement('div');
          made.className = 'win-body';
          made.appendChild(t.content);
          wrap.appendChild(made);
        }
        el = wrap;
      }
    }
    return swapIn(key, el);
  }

  /* A form marked data-win-submit in a window is sent with fetch, naming
     the window in the X-PUDL-Window header, so the server can answer with
     that window, at any status, a refused form's errors included. An
     answer that holds the window gives it its new content. A redirect to
     another address is followed as the browser would follow it. Any other
     answer means the action happened but the server did not draw the
     window, so the page is loaded again from its own address. Only when
     the request could not be sent at all does the form go the ordinary
     way. Without script, the form posts as it always did. */
  var sending = new WeakSet();
  function onSubmit(e) {
    var form = e.target;
    if (e.defaultPrevented || !window.fetch || !form.hasAttribute || !form.hasAttribute('data-win-submit')) return;
    var win = form.closest('.win[data-win]');
    if (!win || !layer.contains(win)) return;
    var key = win.getAttribute('data-win');
    var method = (e.submitter && e.submitter.getAttribute('formmethod')) || form.getAttribute('method') || 'get';
    if (method.toLowerCase() !== 'post') return;
    e.preventDefault();
    if (sending.has(form)) return;
    sending.add(form);
    var action = (e.submitter && e.submitter.getAttribute('formaction')) || form.action;
    var data = new FormData(form, e.submitter || undefined);
    var enctype = (e.submitter && e.submitter.getAttribute('formenctype')) || form.enctype;
    var body = enctype === 'multipart/form-data' ? data : new URLSearchParams(data);
    var headers = { Accept: 'text/html' };
    headers[WINDOW_HEADER] = key;
    var winBody = win.querySelector('.win-body');
    if (winBody) winBody.setAttribute('aria-busy', 'true');
    var here = location.href;
    fetch(action, { method: 'POST', body: body, credentials: 'same-origin', headers: headers })
      .then(function (r) {
        return r.text().then(function (text) { return { r: r, text: text }; });
      }, function (err) {
        if (winBody) winBody.removeAttribute('aria-busy');
        sending.delete(form);
        HTMLFormElement.prototype.submit.call(form);
        throw err;
      })
      .then(function (got) {
        sending.delete(form);
        var now = wins[key] && wins[key].querySelector('.win-body');
        if (now) now.removeAttribute('aria-busy');
        var t = document.createElement('template');
        if ((got.r.headers.get('content-type') || '').indexOf('text/html') >= 0) t.innerHTML = got.text;
        var fresh = windowIn(t.content, key);
        if (fresh && wins[key] && (!got.r.redirected || sameAddress(got.r.url, here))) { swapIn(key, fresh); return; }
        if (got.r.redirected && !sameAddress(got.r.url, here)) { location.assign(got.r.url); return; }
        location.reload();
      })
      .catch(function () {});
  }

  function sameAddress(a, b) {
    try { var x = new URL(a, location.href), y = new URL(b, location.href); return x.origin === y.origin && x.pathname === y.pathname && x.search === y.search; }
    catch (err) { return false; }
  }

  function adopt(el) {
    var key = el.getAttribute('data-win');
    wins[key] = el;
    if (contentSized(key) && el.getAttribute('data-win-narrow') === 'maximized') console.warn('pudl-windows: data-win-narrow is ignored on content-sized window ' + key);
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
    drawDetail(key);
    if (!el.hasAttribute('role')) el.setAttribute('role', 'dialog');
    if (title && !el.hasAttribute('aria-labelledby')) el.setAttribute('aria-labelledby', title.id);

    var head = el.querySelector('.win-head');
    if (head) {
      /* A link's native drag would take the pointer away from a title-bar drag. */
      head.querySelectorAll('a').forEach(function (a) { a.draggable = false; });
      head.tabIndex = 0;
      labelHead(key);
      addMenu(el, key, head);
      setupStatuses(el, head);
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

  /* Statuses inherit the header palette. Only their own header and small
     status group are observed; transcript mutations do not trigger fits. */
  var statusId = 0;
  function setupStatuses(win, head) {
    var group = head.querySelector(':scope > .win-statuses');
    if (!group || win.__winStatuses) return;
    var button = document.createElement('button');
    button.type = 'button'; button.className = 'win-btn win-status-toggle';
    button.setAttribute('aria-label', text('status', 'Window status'));
    button.setAttribute('data-tooltip', text('status', 'Window status')); button.title = text('status', 'Window status');
    button.setAttribute('aria-haspopup', 'dialog');
    var glyph = document.createElement('span'); glyph.className = 'glyph'; glyph.style.setProperty('--glyph', 'var(--glyph-info)'); glyph.setAttribute('aria-hidden', 'true'); button.appendChild(glyph);
    var panel = document.createElement('div'); panel.className = 'popover win-status-popover'; panel.id = 'win-status-' + (++statusId);
    panel.setAttribute('popover', 'auto'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', text('status', 'Window status'));
    var close = document.createElement('button'); close.type = 'button'; close.className = 'btn btn-sm'; close.textContent = text('status-dismiss', 'Dismiss');
    close.setAttribute('popovertarget', panel.id); close.setAttribute('popovertargetaction', 'hide');
    /* The owning window may be hidden in a collapsed dock. Keep its
       read-only popup outside that hidden subtree. */
    var list = document.createElement('ul'); panel.append(list, close); layer.appendChild(panel);
    button.setAttribute('popovertarget', panel.id); group.appendChild(button);
    var frame = 0, disposed = false, menuReturnTarget = null;
    function statuses() { return Array.prototype.filter.call(group.querySelectorAll(':scope > .win-status'), function (s) { return !s.hidden && s.textContent.trim(); }); }
    function refresh() {
      list.textContent = '';
      statuses().forEach(function (s) { var row = document.createElement('li'); row.textContent = s.textContent.trim(); if (s.classList.contains('strong')) row.style.fontWeight = '700'; list.appendChild(row); });
    }
    function fit() {
      frame = 0;
      if (disposed || !win.isConnected) return;
      var returnFocus = document.activeElement === button || panel.contains(document.activeElement);
      group.hidden = !statuses().length;
      if (group.hidden) { if (panel.matches(':popover-open')) panel.hidePopover(); if (returnFocus && head.getClientRects().length) head.focus({ preventScroll: true }); return; }
      if (!head.getClientRects().length) return;
      group.removeAttribute('data-win-status-compact');
      var title = head.querySelector('.win-title');
      var vertical = getComputedStyle(head).writingMode !== 'horizontal-tb';
      var compact = vertical || head.scrollWidth > head.clientWidth + 1 || (title && title.scrollWidth > title.clientWidth + 1);
      group.toggleAttribute('data-win-status-compact', !!compact);
      if (!compact && panel.matches(':popover-open')) {
        panel.hidePopover();
      }
      if (!compact && returnFocus) head.focus({ preventScroll: true });
      if (panel.matches(':popover-open')) refresh();
    }
    function schedule() { if (!disposed && !frame) frame = requestAnimationFrame(fit); }
    var ro = window.ResizeObserver ? new ResizeObserver(schedule) : null;
    var title = head.querySelector('.win-title');
    if (ro) { ro.observe(head); ro.observe(group); if (title) ro.observe(title); }
    var mo = new MutationObserver(function (records) {
      if (records.some(function (r) { return r.target !== button && !(r.target === group && r.type === 'attributes'); })) schedule();
    });
    mo.observe(group, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'class', 'style'] });
    mo.observe(head, { childList: true });
    if (title) mo.observe(title, { subtree: true, childList: true, characterData: true });
    panel.addEventListener('beforetoggle', function (e) {
      if (e.newState === 'open') refresh();
      else if (menuReturnTarget && panel.contains(document.activeElement) && menuReturnTarget.isConnected && menuReturnTarget.getClientRects().length) menuReturnTarget.focus({ preventScroll: true });
    });
    win.__winStatuses = {
      available: function () { return statuses().length > 0; },
      open: function () {
        if (!statuses().length) return;
        var key = win.getAttribute('data-win');
        var candidates = [button, head].concat(Array.prototype.slice.call(document.querySelectorAll('[data-dock-key="' + CSS.escape(key) + '"], [data-win-tab="' + CSS.escape(key) + '"]')));
        var anchor = candidates.filter(function (c) { return c && c.getClientRects().length && !c.closest('.menu-panel, .context-menu'); })[0];
        if (!anchor) anchor = head.getClientRects().length ? head : null;
        if (!anchor) return;
        if (!anchor.id) anchor.id = 'win-status-anchor-' + (++statusId);
        menuReturnTarget = anchor; panel.setAttribute('data-menu-anchor', anchor.id); panel.showPopover();
      },
      destroy: function () { disposed = true; if (frame) cancelAnimationFrame(frame); if (panel.matches(':popover-open')) panel.hidePopover(); panel.remove(); if (ro) ro.disconnect(); mo.disconnect(); }
    };
    button.addEventListener('click', function () { menuReturnTarget = null; panel.removeAttribute('data-menu-anchor'); });
    if (document.fonts) document.fonts.ready.then(schedule);
    schedule();
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
    if (!btn && !sharedDocks() && !layer.hasAttribute('data-win-menu') && el.getAttribute('data-win-chrome') !== 'compact') return;
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
      /* The letter a menu bar gives the command, from the text table:
         data-win-text-<id>-mnemonic, beside its label. */
      return Object.assign({ id: id, label: label, mnemonic: text(id + '-mnemonic', '') || undefined, run: function () {
        if (wins[key] !== win || !win.isConnected) return;
        var available = menuCommands(key);
        function contains(items) { return items.some(function (c) { return !c.disabled && (c.id === id || (c.items && contains(c.items))); }); }
        if (contains(available)) runCommand(key, cmd);
      } }, extra || {});
    }
    var page = win.querySelector('.win-head a[data-win-action="page"]');
    if (win.__winStatuses && win.__winStatuses.available()) list.push(command('status', text('status', 'Window status'), 'status'));
    if (page) list.push(command('page', text('page', 'Open as a page'), 'page'));
    if (shareURL(key)) list.push(command('copy-link', text('copy-link', 'Copy the link'), 'copy-link'));
    var minId = dock ? (state.min[key] ? 'expand' : 'collapse') : (state.min[key] ? 'unminimize' : 'minimize');
    list.push(command(minId, dock ? (state.min[key] ? text('expand', 'Expand') : text('collapse', 'Collapse'))
      : (state.min[key] ? text('restore', 'Restore') : text('minimize', 'Minimize')), 'minimize'));
    if (fixed) list.push(command('restore', text('restore-floating', 'Restore to floating'), 'maximize', { disabled: true }));
    var floating = p.mode === 'floating';
    if (!dock && !sized && !fixed) {
      list.push(command(floating ? 'maximize' : 'restore', floating ? text('maximize', 'Maximize') : text('restore', 'Restore'), 'maximize'));
    }
    /* Resetting is the window's own command, so it ends the window's own
       commands, before the Snap and Dock lists (0.70.3). */
    if (!fixed && !dockOnly(key)) list.push(command('reset', sized ? text('reset-position', 'Reset position') : text('reset', 'Reset size and position'), 'reset'));
    if (!dock && !sized && !fixed) {
      var now = zoneFilled(p), here = now ? sixths(now) : '';
      list.push({ id: 'snap', label: text('snap', 'Snap to a zone'), mnemonic: text('snap-mnemonic', '') || undefined, items: Object.keys(ZONE_WORDS).map(function (name) {
        return command('snap:' + name, text('zone-' + name, ZONE_WORDS[name]), 'snap:' + name, { checked: here === ZONES[name].join(',') });
      }) });
    }
    /* Docking at any of the four edges, the one the window is docked at
       ticked, and Undock last on a docked window. */
    if (!sized && !fixed) {
      var edges = [];
      (dockOnly(key) ? ['left', 'right'] : DOCK_EDGES).forEach(function (edge) {
        var label = text('dock-' + edge, DOCK_WORDS[edge]), members = dockMembers(state, edge);
        if (!splitEdge(edge) || !members.length) { edges.push(command('dock:' + edge, label, 'dock:' + edge, { checked: dock === edge })); return; }
        var groups = treeGroups(dockTree(state, edge));
        if (!groups.length) groups = [{ id: 'main', order: members, selected: edgeFront(state, edge) }];
        groups.forEach(function (g, i) {
          var name = fullTitle(g.selected || g.order[0]) + (groups.length > 1 ? ' (' + (i + 1) + ')' : '');
          ['tab', 'before', 'after'].forEach(function (position) {
            var words = position === 'tab' ? text('dock-as-tab', 'As tab with {title}')
              : sideEdge(edge) ? (position === 'before' ? text('dock-above', 'Above {title}') : text('dock-below', 'Below {title}'))
                : (position === 'before' ? text('dock-left-of', 'Left of {title}') : text('dock-right-of', 'Right of {title}'));
            var id = 'dockto:' + edge + ':' + g.id + ':' + position;
            var allowed = splitDestination(state, key, edge, { group: g.id, position: position });
            edges.push(command(id, label + ': ' + words.replace('{title}', name), id, { disabled: !allowed, detail: allowed ? '' : text('dock-no-room', 'Not enough room, or the source pane would be empty') }));
          });
        });
        var full = sideEdge(edge) ? text('dock-full-height', 'Full height') : text('dock-full-width', 'Full width');
        var mergeId = 'dockmerge:' + edge;
        edges.push(command(mergeId, label + ': ' + full + (groups.length > 1 ? ', ' + text('dock-merge', 'merge panes') : ''), mergeId));
      });
      if (dock && !dockOnly(key)) edges.push('-', command('undock', text('undock', 'Undock'), 'undock'));
      list.push({ id: 'dock', label: text('dock-menu', 'Dock'), mnemonic: text('dock-mnemonic', '') || undefined, items: edges });
    }
    if (dockTree(state, dock) && !fixed) {
      ['equalize', 'swap', 'merge'].forEach(function (action) {
        var words = { equalize: 'Equalize panes', swap: 'Swap with next pane', merge: 'Merge panes' };
        var id = 'dockarrange:' + dock + ':' + action;
        list.push(command(id, text('dock-' + action + '-panes', words[action]), id));
      });
    }
    if (!requiredWindow(key)) list.push(command('close', text('close', 'Close'), 'close', { danger: true }));
    return list;
  }

  function buildMenu(panel, key) {
    var win = wins[key];
    if (!win) return;
    panel.textContent = '';
    var standard = menuCommands(key);
    /* A headed list is set apart by a line as well, so that the window's
       own commands above it read as a block of their own (0.70.3). */
    function heading(label) {
      if (panel.children.length) panel.appendChild(sep());
      var head = document.createElement('div');
      head.className = 'md-section-label';
      head.setAttribute('role', 'presentation');
      head.textContent = label;
      panel.appendChild(head);
    }
    standard.filter(function (c) { return c.id !== 'close'; }).forEach(function (c) {
      /* The layout picker and the Dock list each stand in the menu under a
         heading, since this menu has no submenus; Snap's heading (0.70.2)
         sets the zones of the layer apart from the edges a window docks
         at. */
      if (c.id === 'snap') { heading(text('snap-menu', 'Snap')); snapItems(panel, key); return; }
      if (c.id === 'dock') {
        heading(c.label);
        c.items.forEach(function (d) { panel.appendChild(d === '-' ? sep() : menuItem(d.label, d.id, d)); });
        return;
      }
      var cmd = ['expand', 'collapse', 'unminimize'].indexOf(c.id) >= 0 ? 'minimize' : c.id === 'restore' ? 'maximize' : c.id === 'undock' ? 'dock' : c.id;
      panel.appendChild(menuItem(c.label, cmd, c));
    });
    var own = contentCommands(win, key);
    menuRuns[key] = own;
    if (own.length) {
      if (panel.children.length) panel.appendChild(sep());
      own.forEach(function (c, i) { panel.appendChild(menuItem(c.label, 'content:' + i, c)); });
    }
    if (standard.some(function (c) { return c.id === 'close'; })) {
      if (panel.children.length) panel.appendChild(sep());
      panel.appendChild(menuItem(text('close', 'Close'), 'close', { danger: true }));
    }
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
    if (restricted(key) && (['maximize', 'dock', 'undock', 'reset'].indexOf(cmd) >= 0 || /^(snap|dock|dockto|dockmerge|dockarrange):/.test(cmd))) return;
    var p = state.place[key];
    if (cmd === 'page') {
      /* The link carries the command out itself, so its target and rel
         apply, as they do from the title bar. */
      var a = wins[key].querySelector('.win-head a[data-win-action="page"]');
      if (a) a.click();
    } else if (cmd === 'status') { if (wins[key].__winStatuses) wins[key].__winStatuses.open(); }
    else if (cmd === 'copy-link') copyLink(key);
    else if (cmd === 'minimize') commit(state.min[key] ? raised(state, key) : minimized(state, key), false);
    else if (cmd === 'maximize') commit(maximizeToggled(state, key), false);
    else if (cmd === 'dock') commit(docked(state, key, dockEdge(p) ? null : 'bottom'), false);
    else if (cmd === 'undock') { if (dockEdge(p)) commit(docked(state, key, null), false); }
    else if (cmd.indexOf('dock:') === 0) {
      var edge = cmd.slice(5);
      if (DOCK_EDGES.indexOf(edge) >= 0 && dockEdge(p) !== edge) commit(docked(state, key, edge), false);
    }
    else if (cmd.indexOf('dockto:') === 0) {
      var to = cmd.split(':'), work = placeInDock(state, key, to[1], { group: to[2], position: to[3] });
      if (work) commit(work, true);
    }
    else if (cmd.indexOf('dockmerge:') === 0) {
      var mergeEdge = cmd.slice(10);
      if (!splitEdge(mergeEdge) || (dockOnly(key) && !sideEdge(mergeEdge))) return;
      var merged = docked(state, key, mergeEdge), record = dockRecord(merged, mergeEdge);
      if (record.tree) record.order = treeGroups(record.tree).reduce(function (a, g) { return a.concat(g.order); }, []);
      delete record.tree; delete record.activeGroup;
      commit(merged, true);
    }
    else if (cmd.indexOf('dockarrange:') === 0) {
      var arrange = cmd.split(':'), pane = groupFor(state, arrange[1], key);
      dockArrange(arrange[1], arrange[2], pane && pane.id);
    }
    else if (cmd === 'reset') commit(resetPlaced(state, key), false);
    else if (cmd === 'close') {
      var side = shownEdge(state, key);
      if (sharedEdge(side)) closeDockTab(key, side, 'button');
      else close(key, 'button');
    }
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
    /* The key is read from the panel each time, since a re-keyed window
       keeps its panel. */
    max.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      stay();
      var k = panel.getAttribute('data-win-menu-for');
      if (panel.matches(':popover-open') || dockEdge(state.place[k]) || contentSized(k)) return;
      openTimer = setTimeout(function () {
        var k = panel.getAttribute('data-win-menu-for');
        if (max.matches(':hover') && wins[k] && !restricted(k) && !panel.matches(':popover-open')) panel.showPopover();
      }, HOVER_MS);
    });
    max.addEventListener('pointerleave', leave);
    max.addEventListener('pointerdown', function () { clearTimeout(openTimer); });
    panel.addEventListener('pointerenter', stay);
    var menuObserver = new MutationObserver(function () { if (!disposed && stackPopup && stackPopup.mode === 'preview') leave(); });
    menuObserver.observe(panel, { subtree: true, attributes: true, attributeFilter: ['data-menu-for'] });
    panel.addEventListener('pointerdown', function (e) { if (e.button === 0 && stackPopup) stackPopup.mode = 'pinned'; });
    panel.addEventListener('focusin', function () { if (stackPopup) stackPopup.mode = 'pinned'; });
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

  /* The placement a window opens with when the URL gives none, first found
     of: the zone a link opening it beside its opener asks for; whatever a
     pudl:window-place listener supplies, told the link that was followed;
     the window's own markup, when it says data-win-place="own"; the zone
     its opener's data-win-opens names for the windows opened from it; its
     opener's state when a link inside a window opened it; the server's
     style attribute; and the markup's mode with a cascade from the top
     left (issue #16). */
  function initialPlacement(key, el, index, host, link, beside) {
    if (beside) return inZoneNamed(markupPlacement(el, index), beside);
    var ev = new CustomEvent('pudl:window-place', {
      detail: { key: key, parent: el.getAttribute('data-win-parent') || null, opener: host || null, link: link || null, placement: null }
    });
    layer.dispatchEvent(ev);
    if (validPlacement(ev.detail.placement)) return Object.assign({}, ev.detail.placement);

    if (el.getAttribute('data-win-place') === 'own') return markupPlacement(el, index);

    var opens = host && wins[host] && zoneName(wins[host].getAttribute('data-win-opens'));
    if (opens) return inZoneNamed(markupPlacement(el, index), opens);

    var inherited = host && fromOpener(host);
    if (inherited) return inherited;

    return markupPlacement(el, index);
  }

  /* A zone's name, as ZONES has it, or null. */
  function zoneName(name) { return name && Object.prototype.hasOwnProperty.call(ZONES, name) ? name : null; }

  /* A placement moved into a named zone, keeping its floating geometry and
     strip size for when it leaves. */
  function inZoneNamed(p, name) {
    var out = Object.assign({}, p);
    delete out.zone;
    out.mode = 'floating';
    inZone(out, zoneOf(ZONES[name]));
    return out;
  }

  /* "Open beside" (issue #21): the zone a link marked data-win-beside opens
     its window in, the one it names, or else the half of the area the
     opener's middle is not in. */
  function besideZone(link, host) {
    var named = zoneName(link.getAttribute('data-win-beside'));
    if (named) return named;
    var p = host && effectivePlacement(state, host);
    if (!p || dockEdge(p)) return 'right';
    var z = zoneFilled(p);
    var middle = z ? z.x + z.w / 2 : p.x + p.w / 2;
    return middle < 0.5 ? 'right' : 'left';
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
    if (!el || state.min[key]) return;
    var edge = shownEdge(state, key);
    if (sharedEdge(edge) && railMode(state, edge) && dockPeek[edge] !== key) {
      dockPeek[edge] = key;
      apply(state);
    }
    var now = document.activeElement;
    if (now && el.contains(now) && !now.closest('.menu-panel')) return;
    var target = lastFocus[key];
    if (!(target && target.isConnected && el.contains(target) && canFocus(target))) {
      target = el.querySelector('.win-body [autofocus]');
      if (target && !canFocus(target)) target = null;
    }
    if (!target) {
      var head = el.querySelector('.win-head');
      target = head && canFocus(head) ? head : el.querySelector('.win-body');
    }
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

  /* beside, from a link marked data-win-beside, is the zone the window
     opens in; a maximised opener then takes the other half, so the two
     stand side by side. */
  function open(key, from, beside) {
    if (wins[key]) {
      commit(beside && !restricted(key) && !dockOnly(key) ? snapped(state, key, beside) : raised(state, key), false);
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
      var opener = host && wins[host] ? host : null;
      st.place[key] = clampPlacement(initialPlacement(key, el, st.open.length - 1, opener, from || null, beside || null),
                                     innerW(), innerH(), narrowPolicy(el) === 'maximized' ? { w: 0, h: 0 } : null);
      var other = { left: 'right', right: 'left' }[beside];
      if (other && opener && st.place[opener].mode === 'maximized' && !restricted(opener)) st.place[opener] = inZoneNamed(st.place[opener], other);
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
    if (requiredWindow(oldKey) || childrenOf(state, oldKey).some(requiredWindow)) return;
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
        st.place[key] = clampPlacement(initialPlacement(key, el, st.open.length - 1, null, from || null), innerW(), innerH(), narrowPolicy(el) === 'maximized' ? { w: 0, h: 0 } : null);
      } else {
        st.open.splice(st.open.indexOf(oldKey) + 1, 0, key);
        if (taskbarArrangement) taskbarArrangement.remap(oldKey, key);
        st.taskbarOrder = taskbarKeys(st).map(function (k) { return k === oldKey ? key : k; }).filter(function (k, i, all) { return all.indexOf(k) === i; });
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

  /* Gives an open window a new key and keeps everything else: its
     element, placement, place in the
     stack, focus and running content, where replaceWith opens a new window
     and closes the old. A reader window that turns to another story is
     the case. Every record kept by key moves to the new one, and so do the
     window's own panels and its window-scoped parameters. The change is a
     new history entry unless push is false. Re-keying to its own key
     brings the window forward; onto a key that is open or loading, it is
     refused. */
  function rekey(oldKey, key, push) {
    if (requiredWindow(oldKey) && oldKey !== key) return false;
    if (!wins[oldKey] || state.open.indexOf(oldKey) < 0) return false;
    if (oldKey === key) {
      commit(raised(state, key), false);
      focusWindow(key);
      return true;
    }
    if (wins[key] || pending[key]) return false;
    var el = wins[oldKey];
    var st = copy(state);
    st.open[st.open.indexOf(oldKey)] = key;
    st.taskbarOrder = st.taskbarOrder.map(function (k) { return k === oldKey ? key : k; });
    if (st.top === oldKey) st.top = key;
    [st.min, st.place].forEach(function (m) { move(m, oldKey, key); });
    Object.keys(st.docks || {}).forEach(function (edge) {
      if (st.docks[edge].selected === oldKey) st.docks[edge].selected = key;
      if (st.docks[edge].order) st.docks[edge].order = st.docks[edge].order.map(function (k) { return k === oldKey ? key : k; });
      treeGroups(dockTree(st, edge)).forEach(function (g) {
        g.order = g.order.map(function (k) { return k === oldKey ? key : k; });
        if (g.selected === oldKey) g.selected = key;
      });
      if (dockPeek[edge] === oldKey) dockPeek[edge] = key;
    });
    [wins, openers, closing, homes, menuRuns, lastFocus].forEach(function (m) { move(m, oldKey, key); });
    var z = zOrder.indexOf(oldKey);
    if (z >= 0) zOrder[z] = key;
    layer.querySelectorAll('.win[data-win-parent="' + CSS.escape(oldKey) + '"]').forEach(function (child) {
      child.setAttribute('data-win-parent', key);
    });
    el.setAttribute('data-win', key);
    if (el.id === 'pudl-dock-panel-' + oldKey) el.id = 'pudl-dock-panel-' + key;
    var savedRole = dockRoles.get(el);
    if (savedRole && savedRole.label) savedRole.label = savedRole.label.split(/\s+/).map(function (id) {
      return id === 'win-' + oldKey + '-title' ? 'win-' + key + '-title' : id;
    }).join(' ');
    renameIds(el, oldKey, key);
    commit(st, push !== false, { from: oldKey, to: key });
    el.dispatchEvent(new CustomEvent('pudl:window-rekey', { bubbles: true, detail: { oldKey: oldKey, key: key } }));
    return true;
  }

  function move(map, from, to) {
    if (!Object.prototype.hasOwnProperty.call(map, from)) return;
    map[to] = map[from];
    delete map[from];
  }

  /* The ids PUDL gives a window's parts carry its key, and the window's
     menu panels name it, so they follow it, with every reference to them
     inside the window. */
  function renameIds(el, oldKey, key) {
    [['win-menu-', ''], ['win-snap-', ''], ['win-max-', ''], ['win-', '-title']].forEach(function (pair) {
      var from = pair[0] + oldKey + pair[1], to = pair[0] + key + pair[1];
      var part = el.querySelector('#' + CSS.escape(from));
      if (!part) return;
      part.id = to;
      ['popovertarget', 'data-menu-anchor', 'aria-labelledby', 'aria-describedby', 'aria-controls'].forEach(function (attr) {
        el.querySelectorAll('[' + attr + ']').forEach(function (n) {
          var words = n.getAttribute(attr).split(/\s+/);
          var i = words.indexOf(from);
          if (i >= 0) { words[i] = to; n.setAttribute(attr, words.join(' ')); }
        });
        if (el.getAttribute(attr) && el.getAttribute(attr).split(/\s+/).indexOf(from) >= 0) {
          el.setAttribute(attr, el.getAttribute(attr).split(/\s+/).map(function (w) { return w === from ? to : w; }).join(' '));
        }
      });
    });
    el.querySelectorAll('[data-win-menu-for="' + CSS.escape(oldKey) + '"]').forEach(function (p) { p.setAttribute('data-win-menu-for', key); });
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
    if (family.some(requiredWindow)) return;
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
    var serial = ++restoreSerial;
    syncing++;
    var named = readURL();
    var st = named || { open: defaults.slice(), top: null, min: {}, place: {} };
    required.forEach(function (k) { if (st.open.indexOf(k) < 0) st.open.unshift(k); });
    dockPeek = {};
    var missing = st.open.filter(function (k) { return !wins[k]; });
    var loaded = {};
    return Promise.all(missing.map(function (k) {
      return load(k).then(function (el) { if (serial !== restoreSerial) return null; loaded[k] = el; adopt(el); announceOpen(el); return null; },
                          function (err) {
                            if (window.console) console.warn('pudl-windows:', err.message);
                            return k;
                          });
    })).then(function (failed) {
      syncing--;
      if (serial !== restoreSerial) return;
      failed.forEach(function (k) { if (k) st = closed(st, k); });
      /* A change made meanwhile from the arrangement before this one, such
         as one a listener on pudl:window-open makes, takes out the windows
         just loaded; they are put back, since this arrangement names them
         (0.80.0). */
      st.open.forEach(function (k) { if (!wins[k] && loaded[k]) adopt(loaded[k]); });
      st.open.filter(function (k) { return !wins[k]; }).forEach(function (k) { st = closed(st, k); });
      /* A placement the address gives keeps its size, which the address
         has already checked, and is only brought back inside the layer; a
         window's minimum size, measured against the room the docks leave
         at this moment, would otherwise rewrite the address on loading. */
      st.open.forEach(function (k, i) {
        st.place[k] = st.place[k] ? clampPlacement(st.place[k], innerW(), innerH(), { w: 0, h: 0 })
                                  : clampPlacement(initialPlacement(k, wins[k], i), innerW(), innerH(), narrowPolicy(wins[k]) === 'maximized' ? { w: 0, h: 0 } : null);
      });
      if (!st.top) st.top = st.open.filter(function (k) { return !st.min[k]; }).pop() || null;
      normalizeDocks(st);
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
      /* The zone as the grid's lines are drawn now, so a window dragged
         beside a moved line previews the space it will take. */
      var z = warped(state.grid, zoneOf(ZONES[snap]));
      var iw = '(100% - ' + L + ' - ' + R + ')', ih = '(100% - ' + T + ' - ' + B + ')';
      g = ['calc(' + L + ' + ' + iw + ' * ' + z.x + ')', 'calc(' + T + ' + ' + ih + ' * ' + z.y + ')',
           'calc(' + iw + ' * ' + z.w + ')', 'calc(' + ih + ' * ' + z.h + ')'];
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
    if (restricted(key) || (dockOnly(key) && !edge)) return;
    var el = wins[key];
    var beforeGesture = copy(state);
    var target = e.currentTarget;
    var outer = layer.getBoundingClientRect();
    var r = innerRect();
    var min = minFractions(r.width, r.height, el);
    var start = Object.assign({}, state.place[key]);
    var dockSide = shownEdge(state, key);
    var base = start, baseX = e.clientX, baseY = e.clientY;
    var lastX = baseX, lastY = baseY;
    var cur = start, snap = null, moved = false, frame = 0;
    var outline = !!edge && outlineResize(el), startBox = el.getBoundingClientRect();
    var dockDrop = null;
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
      if (outline) {
        var box = { x: startBox.left - outer.left, y: startBox.top - outer.top, w: startBox.width, h: startBox.height };
        if (dockSide === 'left' || dockSide === 'right') {
          box.w = s * outer.width;
          if (dockSide === 'right') box.x = outer.width - box.w;
        } else {
          box.h = s * outer.height;
          if (dockSide === 'bottom') box.y = outer.height - box.h;
        }
        resizePreview(box); return;
      }
      layer.style.setProperty('--dock-' + dockSide, (Math.round(s * 1000) / 10) + '%');
      el.style.setProperty('--win-dock-size', fmt(s));
      if (splitEdge(dockSide)) renderDockGroups();
    }

    function step() {
      frame = 0;
      if (edge && dockSide) { dockStep(); return; }
      var dx = (lastX - baseX) / r.width;
      var dy = (lastY - baseY) / r.height;
      if (edge) {
        cur = resizeFrom(base, edge, dx, dy, min);
        if (outline) resizePreview({ x: r.left - outer.left + cur.x * r.width, y: r.top - outer.top + cur.y * r.height, w: cur.w * r.width, h: cur.h * r.height });
        else setPlacement(el, cur);
        return;
      }
      cur = clampPlacement({ mode: 'floating', x: base.x + dx, y: base.y + dy, w: base.w, h: base.h, s: base.s }, r.width, r.height, min);
      el.style.transform = 'translate(' + (cur.x - base.x) * r.width + 'px, ' + (cur.y - base.y) * r.height + 'px)';
      dockDrop = sized ? null : dockDropAt(key, lastX, lastY);
      showDockDrop(dockDrop);
      var s = sized ? null : snapAt(lastX, lastY, r, outer);
      if (dockDrop) s = null;
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
      document.removeEventListener('keydown', escapeGesture, true);
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', end);
      /* The pointer may lift before the frame that would have followed its
         last move, so that move is taken now. */
      if (frame) { cancelAnimationFrame(frame); if (ev.type !== 'policy') step(); }
      layer.classList.remove('dragging');
      showGhost(null);
      showDockDrop(null);
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
      if (ev.type === 'escape' || (ev.type === 'pointercancel' && (outline || layer.hasAttribute('data-win-dock-splits')))) {
        if (target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId);
        apply(beforeGesture); return;
      }
      if (ev.type === 'pointercancel') {
        commit(st, false);
        return;
      }
      if (!edge && dockDrop) {
        var placed = dockDrop.destination ? placeInDock(state, key, dockDrop.edge, dockDrop.destination) : docked(state, key, dockDrop.edge);
        if (placed) { commit(placed, true); focusWindow(key); return; }
      }
      if (edge && dockSide) {
        st.place[key] = cur;
        if (sharedEdge(dockSide)) dockRecord(st, dockSide).size = cur.s;
      }
      else {
        st.place[key] = Object.assign({}, cur, { mode: 'floating' });
        if (snap === 'dock-bottom') {
          st.place[key].mode = snap;
          if (st.place[key].s == null) st.place[key].s = DOCK_SIZE;
        } else if (snap) inZone(st.place[key], zoneOf(ZONES[snap]));
      }
      commit(st, outline);
    }

    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);
    function escapeGesture(ev) { if (ev.key === 'Escape' && moved) { ev.preventDefault(); ev.stopPropagation(); end({ type: 'escape' }); } }
    document.addEventListener('keydown', escapeGesture, true);
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
      if (sharedEdge(side)) dockRecord(sd, side).size = pd.s;
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

  /* The taskbar's edges (0.79.0): a press in a .win-bar's padding, or in
     a gap between its controls, goes to the control nearest it along the
     bar, so a pointer thrown against the screen's edge still lands on a
     button. A right-click goes there only when that control is a window's
     button, whose menu it opens; elsewhere it opens the bar's own menu. */
  function barControl(bar, x) {
    var best = null, dist = Infinity;
    bar.querySelectorAll('a[href], button').forEach(function (c) {
      if (!c.getClientRects().length || c.closest('[popover]')) return;
      var r = c.getBoundingClientRect();
      var d = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
      if (d < dist) { dist = d; best = c; }
    });
    return dist <= 16 ? best : null;
  }

  /* How much of the window's foot a taskbar there takes, as
     --win-bar-clear on the root (0.80.0), so toasts stand clear of its tray
     and buttons rather than over them. It is the room from the top of the
     lowest taskbar along the foot to the window's foot, 0px with none.
     Read again as a taskbar changes size and as the window does. */
  function measureBars() {
    var clear = 0, h = window.innerHeight;
    document.querySelectorAll('.win-bar:not([data-win-bar-edge="top"])').forEach(function (bar) {
      if (!bar.getClientRects().length) return;
      var r = bar.getBoundingClientRect();
      if (r.bottom < h - 2 || r.top >= h) return;
      clear = Math.max(clear, h - r.top);
    });
    var v = Math.ceil(clear) + 'px';
    var root = document.documentElement;
    if (root.style.getPropertyValue('--win-bar-clear') !== v) root.style.setProperty('--win-bar-clear', v);
  }

  /* A taskbar short of room (0.81.2): its window buttons shrink by the
     stylesheet; then its tray shows glyphs and badges alone; then the
     windows that still do not fit, from the last, leave the dock for a
     More button after it, whose menu lists them. The button of the window
     in front always stays. Nothing scrolls. */
  var taskbarDrag = null, taskbarArrangement = null, taskbarLive = null;
  function taskbarReorderEnabled() { return !!layer && layer.hasAttribute('data-win-taskbar-reorder'); }
  function taskbarKeys(st) {
    var roots = st.open.filter(function (k) { return !parentOf(st, k); });
    return (st.taskbarOrder || []).concat(roots).filter(function (k, i, all) { return roots.indexOf(k) >= 0 && all.indexOf(k) === i; });
  }
  function taskbarProjection(dock) {
    return taskbarKeys(state).filter(function (k) { return !dock.hasAttribute('data-win-dock-omit-docked') || !shownEdge(state, k); });
  }
  function validGroupDock(dock) {
    return !!(layer && layer.isConnected && dock && dock.nodeType === 1 && dock.ownerDocument === document && dock.isConnected && dock.matches('[data-win-dock]'));
  }
  function groupKey(key) {
    var value = wins[key] && wins[key].getAttribute('data-win-group');
    return value && KEY_RE.test(value) ? value : null;
  }
  function groupMembers(key, dock) {
    if (typeof key !== 'string' || !KEY_RE.test(key) || (arguments.length > 1 && !validGroupDock(dock))) return [];
    return (arguments.length > 1 ? taskbarProjection(dock) : taskbarKeys(state)).filter(function (k) { return groupKey(k) === key; });
  }
  function stackEntries(dock, order) {
    var keys = (order || taskbarKeys(state)).filter(function (k) { return !dock.hasAttribute('data-win-dock-omit-docked') || !shownEdge(state, k); });
    var enabled = layer.getAttribute('data-win-taskbar-stacks') === 'always', expanded = layer.getAttribute('data-win-group-open'), seen = new Set();
    return keys.reduce(function (entries, k) {
      var group = enabled && groupKey(k), members = group && group !== expanded ? keys.filter(function (m) { return groupKey(m) === group; }) : [k];
      var stacked = members.length > 1, id = stacked ? 'group:' + group : k;
      if (!seen.has(id)) { seen.add(id); entries.push({ id: id, group: stacked ? group : null, keys: members }); }
      return entries;
    }, []);
  }
  var stackWarnings = new Set(), stackPopup = null, stackContext = null;
  function refreshStackContext() {
    if (!stackContext || !window.pudlMenu || !window.pudlMenu.updateContext) return;
    if (!stackContext.owner.hasAttribute('data-menu-for')) { stackContext = null; return; }
    var context = stackContext, rows = context.owner.isConnected ? context.rows() : [];
    var ownedFocus = document.activeElement && document.activeElement.closest('.context-menu');
    window.pudlMenu.updateContext(rows, context.owner);
    if (!rows.length && ownedFocus && context.dock) recoverStackFocus(context.dock, context.group || '', null);
  }
  function stackMetadata(group) {
    var members = groupMembers(group), leader = wins[members[0]];
    var label = leader && leader.getAttribute('data-win-group-label') || group;
    var glyph = leader && leader.getAttribute('data-win-group-glyph') || 'window';
    if (!/^[a-z][a-z0-9-]*$/.test(glyph)) glyph = 'window';
    members.forEach(function (k) {
      var name = wins[k].getAttribute('data-win-group-label'), icon = wins[k].getAttribute('data-win-group-glyph');
      if ((name && name !== label) || (icon && icon !== glyph)) {
        var warning = group + ':' + k + ':' + name + ':' + icon;
        if (!stackWarnings.has(warning)) { stackWarnings.add(warning); console.warn('pudl-windows: conflicting group metadata', group, k); }
      }
    });
    return { label: label, glyph: glyph };
  }
  function stackText(name, fallback, values) {
    return text(name, fallback).replace(/\{([a-z]+)\}/g, function (token, key) {
      return Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : token;
    });
  }
  function stackMark(button, entry) {
    var meta = stackMetadata(entry.group), count = 0, running = false;
    entry.keys.forEach(function (k) { var n = Number(wins[k].getAttribute('data-win-attention')); if (Number.isSafeInteger(n) && n > 0) count += n; running = running || wins[k].hasAttribute('data-win-running'); });
    if (!button.firstChild) button.innerHTML = '<span class="glyph win-item-glyph" aria-hidden="true"></span><span class="win-item-title"></span><span class="win-stack-count" aria-hidden="true"></span><span class="badge warn win-item-attention" aria-hidden="true"></span><span class="win-item-running" aria-hidden="true"></span>';
    styleProp(button.firstChild, '--glyph', 'var(--glyph-' + meta.glyph + ', var(--glyph-window))');
    setText(button.querySelector('.win-item-title'), meta.label);
    setText(button.querySelector('.win-stack-count'), String(entry.keys.length));
    var badge = button.querySelector('.win-item-attention'); setText(badge, String(count)); setHidden(badge, !count);
    setHidden(button.querySelector('.win-item-running'), !running);
    var name = stackText('stack-name', '{label}, {n} windows', { label: meta.label, n: entry.keys.length });
    if (count) name += stackText('stack-attention', ', {attention} needing attention', { attention: count });
    if (running) name += text('stack-running', ', running');
    setAttr(button, 'aria-label', name);
    setAttr(button, 'title', button.getAttribute('aria-label'));
  }
  function stackCommand(group, dock, action) {
    var targets = groupMembers(group, dock).map(function (key) { return { key: key, node: wins[key] }; });
    function eligible(target) { return validGroupDock(dock) && wins[target.key] === target.node && groupMembers(group, dock).indexOf(target.key) >= 0; }
    if (action === 'close') { targets.forEach(function (target) { if (eligible(target)) close(target.key, 'group'); }); return; }
    var st = copy(state), changed = false, keys = [];
    targets.forEach(function (target) { if (!eligible(target)) return; var k = target.key; keys.push(k); if (!!st.min[k] !== (action === 'minimize')) { changed = true; if (action === 'minimize') st.min[k] = true; else delete st.min[k]; } });
    if (!changed) return;
    var front = active(state);
    if (action === 'minimize' && front && keys.indexOf(rootOf(state, front)) >= 0) st.top = nextTop(st, st.open.filter(function (k) { return keys.indexOf(rootOf(st, k)) >= 0; }));
    if (action === 'restore' && !front && !active(st)) st.top = nextTop(st, []);
    commit(st, true);
  }
  function stackCommands(group, dock) {
    var keys = groupMembers(group, dock), n = keys.length;
    return [
      { id: 'group-minimize', label: stackText('stack-minimize', 'Minimize these {n} windows', { n: n }), glyph: 'minimize-all', disabled: !keys.some(function (k) { return !state.min[k]; }), run: function () { stackCommand(group, dock, 'minimize'); } },
      { id: 'group-restore', label: stackText('stack-restore', 'Restore these {n} windows', { n: n }), glyph: 'restore-all', disabled: !keys.some(function (k) { return state.min[k]; }), run: function () { stackCommand(group, dock, 'restore'); } },
      '-', { id: 'group-close', label: stackText('stack-close', 'Close these {n} windows', { n: n }), danger: true, disabled: !keys.some(function (k) { return ![k].concat(childrenOf(state, k)).some(requiredWindow); }), run: function () { stackCommand(group, dock, 'close'); } }
    ];
  }
  function activateStackRow(key) {
    if (!wins[key] || state.open.indexOf(key) < 0) return;
    if (stackPopup) stackPopup.close(false);
    var st = raised(state, frontOf(state, key)); commit(st, false); if (st.top) focusWindow(st.top);
  }
  function recoverStackFocus(dock, group, key) {
    var bar = dock.closest('.win-bar') || dock, keys = groupMembers(group, dock);
    var target = Array.from(dock.children).find(function (el) { return el.getAttribute('data-win-stack') === group && el.getClientRects().length; });
    [key].concat(keys).some(function (k) { if (target) return true; target = Array.from(dock.children).find(function (el) { return el.getAttribute('data-win-tab') === k && el.getClientRects().length; }); return !!target; });
    target = target || Array.from(bar.querySelectorAll('.win-bar-more, button, a[href]')).find(function (el) { return !el.disabled && el.getClientRects().length; });
    if (!target && bar.isConnected) { bar.tabIndex = -1; target = bar; }
    if (target) target.focus({ preventScroll: true });
  }
  function openStack(button, mode, keyboard) {
    var dock = button.parentElement, group = button.getAttribute('data-win-stack');
    if (stackPopup && stackPopup.button === button) {
      if (mode === 'pinned' && stackPopup.mode === 'preview') { stackPopup.mode = 'pinned'; if (keyboard) stackPopup.first(); }
      else if (mode === 'pinned') stackPopup.close(true);
      return;
    }
    if (stackPopup) stackPopup.close(false);
    var panel = document.createElement('div'); panel.className = 'popover win-stack-panel'; panel.setAttribute('data-popover-focus', 'manual'); panel.setAttribute('popover', 'manual'); panel.setAttribute('role', 'dialog');
    if (!button.id) button.id = 'pudl-stack-trigger-' + (++statusId); panel.setAttribute('data-menu-anchor', button.id);
    panel.id = 'pudl-stack-' + (++statusId); button.setAttribute('aria-controls', panel.id); button.setAttribute('aria-expanded', 'true');
    var rows = document.createElement('div'); rows.className = 'win-stack-rows'; panel.appendChild(rows); document.body.appendChild(panel);
    var rowMap = new Map(), previous = [], timer = 0, disposed = false;
    function owned() { return panel.contains(document.activeElement) || (document.activeElement && document.activeElement.closest('.menu-panel:popover-open') && panel.querySelector('[data-menu-for]')); }
    function place() {
      if (window.pudlMenu) { window.pudlMenu.place(panel); return; }
      panel.classList.remove('placing');
      var r = button.getBoundingClientRect(), width = panel.offsetWidth, height = panel.offsetHeight;
      var top = r.top >= height + 8 ? r.top - height - 4 : r.bottom + 4;
      panel.style.left = Math.max(4, Math.min(r.left, innerWidth - width - 4)) + 'px'; panel.style.top = Math.max(4, Math.min(top, innerHeight - height - 4)) + 'px';
    }
    function closePanel(recover) {
      if (disposed) return;
      var focus = owned() || document.activeElement === button || (stackPopup && stackPopup.triggerHadFocus && document.activeElement === document.body), key = document.activeElement && document.activeElement.closest('[data-stack-row]'); key = key && key.getAttribute('data-stack-row');
      disposed = true; clearTimeout(timer); menuObserver.disconnect(); if (panel.querySelector('[data-menu-for]') && window.pudlMenu) window.pudlMenu.closeContext(); panel.hidePopover(); panel.remove(); button.setAttribute('aria-expanded', 'false'); button.removeAttribute('aria-controls'); stackPopup = null;
      document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', escape, true); window.removeEventListener('resize', place);
      if (recover && focus) recoverStackFocus(dock, group, key);
    }
    function refresh() {
      if (disposed) return;
      var entry = stackEntries(dock).find(function (e) { return e.group === group; });
      if (!validGroupDock(dock) || !entry || !button.isConnected) { closePanel(true); return; }
      setAttr(panel, 'aria-label', stackText('stack-list', '{label}', { label: stackMetadata(group).label }));
      var focusNode = document.activeElement, activeRow = focusNode && focusNode.closest('[data-stack-row]'), focusedKey = activeRow && activeRow.getAttribute('data-stack-row'), focusWas = owned();
      var index = previous.indexOf(focusedKey), section = null;
      rows.querySelectorAll('.win-stack-section').forEach(function (h) { h.remove(); });
      rowMap.forEach(function (row, k) { if (entry.keys.indexOf(k) < 0) { row.remove(); rowMap.delete(k); } });
      var cursor = rows.firstChild;
      entry.keys.forEach(function (k) {
        var row = rowMap.get(k);
        if (!row) {
          row = document.createElement('div'); row.className = 'win-stack-row'; row.setAttribute('data-stack-row', k);
          var link = document.createElement('a'); link.className = 'win-stack-link'; link.setAttribute('data-win-tab', k); link.setAttribute('data-win-stack-row', '');
          link.addEventListener('click', function (e) { if (e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; e.preventDefault(); e.stopPropagation(); activateStackRow(k); });
          var remove = document.createElement('button'); remove.type = 'button'; remove.className = 'icon-btn win-stack-close'; remove.innerHTML = '<span class="glyph" style="--glyph:var(--glyph-close)" aria-hidden="true"></span>';
          remove.addEventListener('click', function () { var at = previous.indexOf(k), hadFocus = owned(); close(k, 'taskbar'); if (hadFocus) { if (stackPopup && stackPopup.panel === panel && previous.length) rowMap.get(previous[Math.min(Math.max(at, 0), previous.length - 1)]).firstChild.focus(); else recoverStackFocus(dock, group, k); } });
          row.append(link, remove); rowMap.set(k, row);
        }
        var nextSection = wins[k].getAttribute('data-win-section') || '';
        if (nextSection !== section) { section = nextSection; if (section) { var heading = document.createElement('h3'); heading.className = 'win-stack-section'; heading.textContent = section; rows.insertBefore(heading, cursor); } }
        if (row !== cursor) rows.insertBefore(row, cursor); cursor = row.nextSibling;
        setAttr(row.firstChild, 'href', urlFor(raised(state, frontOf(state, k)))); windowMark(row.firstChild, k);
        setAttr(row.lastChild, 'aria-label', stackText('stack-close-window', 'Close {title}', { title: fullTitle(k) }));
        row.lastChild.disabled = [k].concat(childrenOf(state, k)).some(requiredWindow);
      });
      if (focusWas && focusedKey && rowMap.has(focusedKey) && focusNode.isConnected) focusNode.focus({ preventScroll: true });
      if (focusWas && focusedKey && !rowMap.has(focusedKey) && entry.keys.length) rowMap.get(entry.keys[Math.min(Math.max(index, 0), entry.keys.length - 1)]).firstChild.focus();
      previous = entry.keys.slice(); if (panel.matches(':popover-open')) place();
      if (stackPopup) stackPopup.triggerHadFocus = false;
    }
    function outside(e) { if (!panel.contains(e.target) && !button.contains(e.target) && !e.target.closest('.menu-panel')) closePanel(false); }
    function escape(e) { if (e.key !== 'Escape' || document.querySelector('.menu-panel:popover-open')) return; e.preventDefault(); e.stopImmediatePropagation(); closePanel(true); }
    function leave() { clearTimeout(timer); timer = setTimeout(function () { if (stackPopup && stackPopup.mode === 'preview' && !panel.matches(':hover') && !button.matches(':hover') && !panel.querySelector('[data-menu-for]')) closePanel(true); }, 250); }
    var menuObserver = new MutationObserver(function () { if (!disposed && stackPopup && stackPopup.mode === 'preview') leave(); });
    menuObserver.observe(panel, { subtree: true, attributes: true, attributeFilter: ['data-menu-for'] });
    panel.addEventListener('pointerdown', function (e) { if (e.button === 0 && stackPopup) stackPopup.mode = 'pinned'; });
    panel.addEventListener('focusin', function () { if (stackPopup) stackPopup.mode = 'pinned'; });
    panel.addEventListener('pointerleave', leave); panel.addEventListener('pointerenter', function () { clearTimeout(timer); });
    stackPopup = { button: button, panel: panel, mode: mode, refresh: refresh, close: closePanel, leave: leave, first: function () { var link = rows.querySelector('a'); if (link) link.focus(); } };
    refresh(); var previousFocus = document.activeElement; panel.showPopover(); place(); if (keyboard) stackPopup.first(); else { if (previousFocus && previousFocus.isConnected) previousFocus.focus({ preventScroll: true }); stackPopup.mode = mode; }
    document.addEventListener('pointerdown', outside, true); document.addEventListener('keydown', escape, true); window.addEventListener('resize', place);
  }
  function setupStack(button) {
    var timer;
    button.type = 'button'; button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', function (e) { openStack(button, 'pinned', e.detail === 0); });
    button.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown') { e.preventDefault(); if (stackPopup && stackPopup.button === button) { stackPopup.mode = 'pinned'; stackPopup.first(); } else openStack(button, 'pinned', true); } });
    button.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') timer = setTimeout(function () { if (button.isConnected && button.matches(':hover')) openStack(button, 'preview', false); }, 500); });
    button.addEventListener('pointerleave', function () { clearTimeout(timer); if (stackPopup && stackPopup.button === button) stackPopup.leave(); });
  }
  function announceTaskbar(key, order, preview) {
    if (!taskbarLive) { taskbarLive = document.createElement('div'); taskbarLive.className = 'visually-hidden'; taskbarLive.setAttribute('role', 'status'); document.body.appendChild(taskbarLive); }
    taskbarLive.textContent = stackText(preview ? 'taskbar-preview-moved' : 'taskbar-moved', preview ? 'Preview places {title} at position {position} of {count}.' : '{title} moved to position {position} of {count}.', { title: entryTitle(key), position: order.indexOf(key) + 1, count: order.length });
  }
  function entryId(node) { return node.hasAttribute('data-win-stack') ? 'group:' + node.getAttribute('data-win-stack') : node.getAttribute('data-win-tab'); }
  function entryTitle(id) { return id && id.indexOf('group:') === 0 ? stackMetadata(id.slice(6)).label : fullTitle(id); }
  function entryOrder(dock, order) { return stackEntries(dock, order).map(function (entry) { return entry.id; }); }
  function movedEntryOrder(dock, order, id, destination) {
    var field = Object.keys(destination)[0], target = destination[field], entries = stackEntries(dock, order);
    var from = entries.find(function (e) { return e.id === id; }), to = entries.find(function (e) { return e.id === target; });
    if (!from || !to || from === to || ['before', 'after'].indexOf(field) < 0) return order;
    var display = entries.map(function (e) { return e.id; }), after = display.filter(function (k) { return k !== id; });
    after.splice(after.indexOf(target) + (field === 'after' ? 1 : 0), 0, id);
    if (after.join(',') === display.join(',')) return order;
    var members = from.group ? order.filter(function (k) { return groupKey(k) === from.group; }) : from.keys;
    var targets = to.group ? order.filter(function (k) { return groupKey(k) === to.group; }) : to.keys;
    var result = order.filter(function (k) { return members.indexOf(k) < 0; });
    var at = field === 'before' ? result.indexOf(targets[0]) : result.indexOf(targets[targets.length - 1]) + 1;
    result.splice.apply(result, [at, 0].concat(members)); return result;
  }
  function reorderEntry(dock, id, destination) {
    return setTaskbarOrder(movedEntryOrder(dock, taskbarKeys(state), id, destination), id, dock);
  }
  function internalOrderCommands(dock, key, group) {
    return ['earlier', 'later', 'first', 'last'].map(function (kind, n) {
      var members = groupMembers(group), index = members.indexOf(key);
      return { label: text('taskbar-' + kind, ['Move earlier', 'Move later', 'Move to beginning', 'Move to end'][n]), disabled: index < 0 || (n === 0 || n === 2 ? index === 0 : index === members.length - 1), run: function () {
        var order = taskbarKeys(state), live = groupMembers(group), at = live.indexOf(key);
        if (at < 0) return;
        var next = n === 2 ? 0 : n === 3 ? live.length - 1 : at + (n === 0 ? -1 : 1);
        if (next < 0 || next >= live.length || at === next) return;
        live.splice(at, 1); live.splice(next, 0, key); var i = 0;
        setTaskbarOrder(order.map(function (k) { return groupKey(k) === group ? live[i++] : k; }), null, null);
      } };
    });
  }
  function focusTaskbar(dock, key) {
    var tab = Array.from(dock.children).find(function (t) { return entryId(t) === key; });
    var bar = dock.closest('.win-bar');
    if (bar) fitBar(bar);
    var target = tab && tab.getClientRects().length ? tab : bar && bar.querySelector('.win-bar-more');
    if (target) target.focus({ preventScroll: true });
  }
  function setTaskbarOrder(order, key, dock) {
    if (!taskbarReorderEnabled()) return false;
    var before = taskbarKeys(state), st = copy(state);
    st.taskbarOrder = order;
    st.taskbarOrder = taskbarKeys(st);
    if (st.taskbarOrder.join(',') === before.join(',')) return false;
    var focused = document.activeElement && document.activeElement.closest && document.activeElement.closest('.win-bar [data-win-dock] > :is([data-win-tab], [data-win-stack])');
    var focusedDock = focused && focused.parentElement, focusedKey = focused && entryId(focused);
    commit(st, true);
    if (dock) focusTaskbar(dock, key);
    else if (focusedDock) focusTaskbar(focusedDock, focusedKey);
    if (key) announceTaskbar(key, dock ? entryOrder(dock) : taskbarKeys(state));
    return true;
  }
  function reorderTaskbar(key, destination, dock) {
    if (!taskbarReorderEnabled() || !destination || typeof destination !== 'object') return false;
    var fields = Object.keys(destination);
    if (fields.length !== 1 || ['before', 'after', 'edge'].indexOf(fields[0]) < 0) return false;
    var order = taskbarKeys(state), at = order.indexOf(key), field = fields[0], target = destination[field];
    if (at < 0 || (field === 'edge' ? ['start', 'end'].indexOf(target) < 0 : target === key || order.indexOf(target) < 0)) return false;
    order.splice(at, 1);
    var index = field === 'edge' ? (target === 'start' ? 0 : order.length) : order.indexOf(target) + (field === 'after' ? 1 : 0);
    order.splice(index, 0, key);
    return setTaskbarOrder(order, key, dock);
  }
  function taskbarOrderCommands(dock, key) {
    function move(kind) {
      var list = entryOrder(dock), i = list.indexOf(key);
      if (i < 0) return;
      var other = kind === 'first' ? list[0] : kind === 'last' ? list[list.length - 1] : list[i + (kind === 'earlier' ? -1 : 1)];
      if (!other || other === key) return;
      var destination = {}; destination[kind === 'earlier' || kind === 'first' ? 'before' : 'after'] = other;
      reorderEntry(dock, key, destination);
    }
    var list = entryOrder(dock), index = list.indexOf(key);
    return [
      { label: text('taskbar-earlier', 'Move earlier'), disabled: index <= 0, run: function () { move('earlier'); } },
      { label: text('taskbar-later', 'Move later'), disabled: index < 0 || index === list.length - 1, run: function () { move('later'); } },
      { label: text('taskbar-first', 'Move to beginning'), disabled: index <= 0, run: function () { move('first'); } },
      { label: text('taskbar-last', 'Move to end'), disabled: index < 0 || index === list.length - 1, run: function () { move('last'); } },
      '-', { label: text('taskbar-arrange', 'Arrange taskbar'), run: function () { arrangeTaskbar(dock, key); } }
    ];
  }
  function arrangeTaskbar(dock, selected) {
    if (!taskbarReorderEnabled() || !dock || !dock.closest('.win-bar') || !dock.isConnected) return false;
    if (taskbarArrangement) taskbarArrangement.close();
    var anchor = dock.closest('.win-bar').querySelector('.win-bar-arrange');
    if (!anchor) return false;
    var panel = document.createElement('div'); panel.className = 'popover win-taskbar-arrangement'; panel.id = 'pudl-taskbar-arrangement';
    panel.setAttribute('popover', 'auto'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', text('taskbar-arrange', 'Arrange taskbar'));
    if (!anchor.id) anchor.id = 'pudl-taskbar-arrange-' + (++statusId);
    panel.setAttribute('data-menu-anchor', anchor.id);
    var title = document.createElement('h2'); title.className = 'popover-title'; title.textContent = text('taskbar-arrange', 'Arrange taskbar');
    var list = document.createElement('select'); list.className = 'form-select'; list.size = 8; list.setAttribute('aria-label', text('taskbar-items', 'Taskbar windows'));
    var actions = document.createElement('div'); actions.className = 'toolbar win-taskbar-tools'; actions.setAttribute('role', 'toolbar'); actions.setAttribute('aria-label', text('taskbar-arrange', 'Arrange taskbar')); actions.setAttribute('data-toolbar-fold', '');
    var moveGroup = document.createElement('div'); moveGroup.className = 'toolbar-group'; moveGroup.setAttribute('aria-label', text('taskbar-order', 'Taskbar order')); moveGroup.setAttribute('data-toolbar-glyph', 'sort');
    var finishGroup = document.createElement('div'); finishGroup.className = 'toolbar-group'; finishGroup.setAttribute('aria-label', text('taskbar-apply', 'Apply order')); finishGroup.setAttribute('data-toolbar-glyph', 'check'); finishGroup.setAttribute('data-toolbar-priority', '10'); finishGroup.setAttribute('data-toolbar-end', '');
    actions.append(moveGroup, finishGroup);
    function actionButton(label, glyph, primary) {
      var button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn-sm' + (primary ? ' btn-primary' : ''); button.setAttribute('aria-label', label); button.setAttribute('data-toolbar-glyph-only', ''); button.title = label; button.setAttribute('data-tooltip', label);
      var icon = document.createElement('span'); icon.className = 'glyph'; icon.setAttribute('aria-hidden', 'true'); icon.style.setProperty('--glyph', 'var(--glyph-' + glyph + ')');
      var words = document.createElement('span'); words.className = 'toolbar-words'; words.textContent = label; button.append(icon, words); return button;
    }
    var draft = taskbarKeys(state), moves = [], disposed = false, renamedSelection = null;
    function shownDraft() { return entryOrder(dock, draft); }
    function draw() {
      if (disposed) return;
      var value = renamedSelection || list.value || selected, live = taskbarKeys(state);
      renamedSelection = null;
      draft = draft.filter(function (k) { return live.indexOf(k) >= 0; });
      live.forEach(function (k) { if (draft.indexOf(k) < 0) draft.push(k); });
      var shown = shownDraft(); list.textContent = '';
      shown.forEach(function (k) { var option = document.createElement('option'); option.value = k; option.textContent = entryTitle(k); list.appendChild(option); });
      if (shown.indexOf(value) >= 0) list.value = value; else if (shown.length) list.selectedIndex = 0;
      var i = shown.indexOf(list.value);
      moves.forEach(function (b, n) { b.disabled = i < 0 || (n === 0 || n === 2 ? i === 0 : i === shown.length - 1); });
    }
    ['earlier', 'later', 'first', 'last'].forEach(function (kind, n) {
      var b = actionButton(text('taskbar-' + kind, ['Move earlier', 'Move later', 'Move to beginning', 'Move to end'][n]), ['arrow-up', 'arrow-down', 'sort-up', 'sort-down'][n]);
      b.addEventListener('click', function () {
        var shown = shownDraft(), key = list.value, i = shown.indexOf(key);
        var target = kind === 'first' ? shown[0] : kind === 'last' ? shown[shown.length - 1] : shown[i + (kind === 'earlier' ? -1 : 1)];
        if (!target || target === key) return;
        var destination = {}; destination[kind === 'later' || kind === 'last' ? 'after' : 'before'] = target;
        draft = movedEntryOrder(dock, draft, key, destination);
        draw(); list.focus(); announceTaskbar(key, shownDraft(), true);
      }); moves.push(b); moveGroup.appendChild(b);
    });
    list.addEventListener('change', draw);
    function close() {
      if (disposed) return;
      var ownsFocus = panel.contains(document.activeElement) || document.activeElement === document.body;
      disposed = true;
      if (panel.matches(':popover-open')) panel.hidePopover();
      panel.remove(); taskbarArrangement = null;
      if (ownsFocus && anchor.isConnected && anchor.getClientRects().length) anchor.focus({ preventScroll: true });
    }
    var applyButton = actionButton(text('taskbar-apply', 'Apply order'), 'check', true);
    applyButton.addEventListener('click', function () { if (!dock.isConnected || !taskbarReorderEnabled()) { close(); return; } draw(); var key = list.value, order = draft.slice(); close(); setTaskbarOrder(order, key, null); });
    var cancel = actionButton(text('taskbar-cancel', 'Cancel'), 'close'); cancel.addEventListener('click', close);
    finishGroup.append(applyButton, cancel); panel.append(title, list, actions); document.body.appendChild(panel);
    taskbarArrangement = { refresh: draw, close: close, remap: function (from, to) { draft = draft.map(function (k) { return k === from ? to : k; }); if (list.value === from) renamedSelection = to; } };
    panel.addEventListener('toggle', function (e) { if (e.newState === 'closed') close(); });
    draw(); panel.showPopover(); if (window.pudlToolbar) window.pudlToolbar.enhance(panel); return true;
  }
  function dragTaskbar(e) {
    var tab = e.target.closest && e.target.closest('.win-bar [data-win-dock] > :is([data-win-tab], [data-win-stack])');
    if (!tab || !taskbarReorderEnabled() || e.button !== 0 || e.pointerType === 'touch' || e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
    var dock = tab.parentElement, key = entryId(tab), start = e.clientX, id = e.pointerId;
    var targets = Array.from(dock.children).filter(function (t) { return t !== tab && (t.hasAttribute('data-win-tab') || t.hasAttribute('data-win-stack')) && t.getClientRects().length; });
    if (!targets.length) return;
    var rtl = getComputedStyle(dock).direction === 'rtl', viewportWidth = innerWidth, viewportHeight = innerHeight;
    var moving = false, marker = null, destination = null, frame = 0, latest = null, ended = false;
    function cleanup() {
      if (ended) return;
      ended = true;
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', cancel); document.removeEventListener('keydown', escape, true);
      window.removeEventListener('blur', cancel); window.removeEventListener('resize', cancel); tab.removeEventListener('lostpointercapture', cancel);
      if (marker) marker.remove(); tab.classList.remove('win-taskbar-dragging'); taskbarDrag = null;
      if (tab.hasPointerCapture(id)) tab.releasePointerCapture(id);
      if (moving) window.addEventListener('pointerdown', clearSuppression, { once: true, capture: true });
      fitBarsSoon();
    }
    function cancel(event) {
      if (event && event.type === 'pointercancel' && event.pointerId !== id) return;
      if (!moving && latest && Math.abs(latest.clientX - start) >= 6) { moving = true; window.addEventListener('click', suppressClick, true); }
      destination = null;
      cleanup();
    }
    function escape(event) { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancel(); } }
    function move(event) {
      if (event.pointerId !== id) return;
      latest = { clientX: event.clientX, clientY: event.clientY, pointerId: id };
      if (!frame) frame = requestAnimationFrame(function () { frame = 0; preview(latest, false); });
    }
    function preview(event, ending) {
      if (!taskbarReorderEnabled() || innerWidth !== viewportWidth || innerHeight !== viewportHeight || (getComputedStyle(dock).direction === 'rtl') !== rtl) { cancel(); return; }
      if (!moving && Math.abs(event.clientX - start) < 6) return;
      if (!moving) {
        moving = true; if (!ending) tab.setPointerCapture(id); tab.classList.add('win-taskbar-dragging');
        marker = document.createElement('div'); marker.className = 'win-taskbar-marker'; marker.setAttribute('aria-hidden', 'true'); document.body.appendChild(marker);
        window.addEventListener('click', suppressClick, true);
      }
      var bounds = dock.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) { destination = null; marker.hidden = true; return; }
      var next = targets.find(function (t) { var r = t.getBoundingClientRect(); return rtl ? event.clientX > (r.left + r.right) / 2 : event.clientX < (r.left + r.right) / 2; });
      var target = next || targets[targets.length - 1], rect = target.getBoundingClientRect();
      destination = {}; destination[next ? 'before' : 'after'] = entryId(target);
      marker.setAttribute('data-label', stackText(next ? 'taskbar-before' : 'taskbar-after', next ? 'Before {title}' : 'After {title}', { title: entryTitle(destination[next ? 'before' : 'after']) }));
      marker.setAttribute('data-align', event.clientX > innerWidth / 2 ? 'end' : 'start');
      marker.toggleAttribute('data-below', bounds.top < 40);
      marker.hidden = false; marker.style.left = (next ? (rtl ? rect.right : rect.left) : (rtl ? rect.left : rect.right)) + 'px'; marker.style.top = bounds.top + 'px'; marker.style.height = bounds.height + 'px';
    }
    function clearSuppression() { window.removeEventListener('click', suppressClick, true); window.removeEventListener('pointerdown', clearSuppression, true); }
    function suppressClick(event) { if (event.detail && event.target.closest && event.target.closest('.win-bar') === dock.closest('.win-bar')) { event.preventDefault(); event.stopImmediatePropagation(); } clearSuppression(); }
    function up(event) { if (event.pointerId !== id) return; if (latest) preview({ clientX: event.clientX, clientY: event.clientY }, true); if (ended) return; var drop = moving && destination; cleanup(); if (drop) reorderEntry(dock, key, drop); }
    taskbarDrag = { dock: dock, cancel: cancel };
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', cancel); document.addEventListener('keydown', escape, true);
    window.addEventListener('blur', cancel); window.addEventListener('resize', cancel); tab.addEventListener('lostpointercapture', cancel);
  }
  function fitBar(bar) {
    var dock = bar.querySelector(':scope > [data-win-dock]');
    if (taskbarDrag && taskbarDrag.dock === dock) return;
    var arrange = bar.querySelector(':scope > .win-bar-arrange');
    if (taskbarReorderEnabled() && dock && !arrange) {
      arrange = document.createElement('button'); arrange.type = 'button'; arrange.className = 'icon-btn win-bar-arrange';
      arrange.setAttribute('aria-label', text('taskbar-arrange', 'Arrange taskbar')); arrange.title = text('taskbar-arrange', 'Arrange taskbar'); arrange.setAttribute('data-tooltip', arrange.title);
      arrange.addEventListener('click', function () { arrangeTaskbar(dock); }); dock.insertAdjacentElement('afterend', arrange);
    } else if (!taskbarReorderEnabled() && arrange) arrange.remove();
    if (!dock || !bar.getClientRects().length) return;
    var more = bar.querySelector(':scope > .win-bar-more');
    var tabs = Array.prototype.slice.call(dock.querySelectorAll(':scope > :is([data-win-tab], [data-win-stack])'));
    tabs.forEach(function (t) { t.removeAttribute('data-win-tab-over'); t.removeAttribute('data-win-tab-squeeze'); });
    bar.removeAttribute('data-win-bar-compact');
    /* Each button shrinks to 120px, or its own width where that is less,
       so a short title is never padded out. */
    dock.setAttribute('data-win-dock-measure', '');
    tabs.forEach(function (t) { t.style.setProperty('--win-tab-natural', Math.ceil(t.getBoundingClientRect().width) + 'px'); });
    dock.removeAttribute('data-win-dock-measure');
    function finished() {
      if (more && more.hidden) {
        var menuFocus = more.hasAttribute('data-menu-for') && document.activeElement && document.activeElement.closest('.context-menu');
        more.__over = []; refreshStackContext();
        if (menuFocus) recoverStackFocus(dock, '', null);
      }
      if (stackPopup && stackPopup.button.parentElement === dock && !stackPopup.button.getClientRects().length) stackPopup.close(true);
    }
    if (more) more.hidden = true;
    var over = function () { return dock.scrollWidth > dock.clientWidth + 1; };
    if (!over()) { finished(); return; }
    bar.setAttribute('data-win-bar-compact', '');
    /* A tray item showing its glyph alone keeps its words as its name. */
    bar.querySelectorAll(':scope > .status-area .status-item').forEach(function (it) {
      if (!it.hasAttribute('aria-label') && !it.hasAttribute('title')) it.setAttribute('aria-label', it.textContent.trim());
    });
    if (!over()) { finished(); return; }
    if (!more) {
      more = document.createElement('button');
      more.type = 'button';
      more.className = 'win-tab win-bar-more';
      more.setAttribute('aria-haspopup', 'menu');
      more.addEventListener('click', function () { openMore(more); });
      dock.insertAdjacentElement('afterend', more);
    }
    more.hidden = false;
    var gone = [];
    var order = tabs.slice().reverse().filter(function (t) { return t.getAttribute('aria-current') !== 'true'; });
    for (var i = 0; i < order.length && over(); i++) { order[i].setAttribute('data-win-tab-over', ''); gone.unshift(order[i]); }
    /* The front window's button, alone, may still be too wide for what is
       left; it then shrinks below its floor, its title cut further
       (0.82.1). */
    if (over()) tabs.forEach(function (t) { if (!t.hasAttribute('data-win-tab-over')) t.setAttribute('data-win-tab-squeeze', ''); });
    more.__over = gone;
    var stacked = gone.some(function (t) { return t.hasAttribute('data-win-stack'); });
    var total = gone.reduce(function (n, t) { return n + (t.hasAttribute('data-win-stack') ? groupMembers(t.getAttribute('data-win-stack'), dock).length : 1); }, 0);
    var words = stacked ? stackText('more-stacks', '{entries} more ({windows} windows)', { entries: gone.length, windows: total }) : text('more-windows', '{n} more').replace('{n}', gone.length);
    more.textContent = words;
    more.setAttribute('aria-label', stacked ? stackText('more-stacks-name', '{entries} more entries, {windows} windows', { entries: gone.length, windows: total }) : text('more-windows-name', '{n} more windows').replace('{n}', gone.length));
    refreshStackContext(); finished();
  }

  function openMore(more) {
    if (!window.pudlMenu || !window.pudlMenu.openAt) return;
    function moreRows() {
      if (more.hidden || !more.isConnected) return [];
      var rows = (more.__over || []).filter(function (t) { return t.isConnected; }).map(function (t) {
        var label = (t.getAttribute('aria-label') || t.textContent).trim();
        if (t.hasAttribute('data-win-stack')) {
          var group = t.getAttribute('data-win-stack'), dock = t.parentElement, items = [];
          groupMembers(group, dock).forEach(function (k) {
            var mark = document.createElement('a'); windowMark(mark, k);
            items.push({ id: 'window-' + k, label: mark.getAttribute('aria-label'), run: function () { activateStackRow(k); } });
            items.push({ id: 'commands-' + k, label: stackText('stack-window-commands', 'Commands for {title}', { title: fullTitle(k) }), items: menuCommands(k).concat(contentCommands(wins[k], k)) });
          });
          return { id: 'group-' + group, label: label, items: items.concat(['-']).concat(stackCommands(group, dock)) };
        }
        return { id: t.getAttribute('data-win-tab'), label: label, run: function () { t.click(); } };
      });
      if (taskbarReorderEnabled()) { if (rows.length) rows.push('-'); rows.push({ id: 'arrange', label: text('taskbar-arrange', 'Arrange taskbar'), run: function () { arrangeTaskbar(more.parentElement.querySelector('[data-win-dock]')); } }); }
      return rows;
    }
    var rows = moreRows(); stackContext = { owner: more, dock: more.parentElement.querySelector('[data-win-dock]'), rows: moreRows };
    var r = more.getBoundingClientRect();
    var low = (r.top + r.bottom) / 2 > window.innerHeight / 2;
    window.pudlMenu.openAt(Math.round(r.left), Math.round(low ? r.top - 4 : r.bottom + 4), rows,
      { owner: more, 'for': more, edges: { top: Math.round(r.top - 4), bottom: Math.round(r.bottom + 4) } });
  }

  var barsSoon = null;
  function fitBarsSoon() { if (barsSoon) barsSoon(); }
  function watchBars() {
    var pending = 0;
    var soon = function () { if (!pending) pending = requestAnimationFrame(function () { pending = 0; measureBars(); document.querySelectorAll('.win-bar').forEach(fitBar); }); };
    barsSoon = soon;
    var ro = window.ResizeObserver ? new ResizeObserver(soon) : null;
    var mo = new MutationObserver(soon);
    var watch = function () {
      document.querySelectorAll('.win-bar').forEach(function (b) {
        if (ro) { ro.observe(b); b.querySelectorAll(':scope > .status-area').forEach(function (s) { ro.observe(s); }); }
        mo.observe(b, { attributes: true, attributeFilter: ['data-win-bar-edge', 'hidden', 'class', 'style'] });
      });
      soon();
    };
    watch();
    window.addEventListener('resize', soon);
    document.addEventListener('pudl:windows-change', soon);
    document.addEventListener('pudl:regions-swap', watch);
  }

  function onBarEdge(e) {
    var bar = e.target.closest && e.target.closest('.win-bar');
    if (!bar || e.target.closest('a[href], button, input, select, textarea, [popover]')) return;
    var c = barControl(bar, e.clientX);
    if (!c || (e.type === 'contextmenu' && !c.hasAttribute('data-win-tab'))) return;
    e.preventDefault();
    /* Immediate, so a second layer's copy of this listener does not press
       the control again. */
    e.stopImmediatePropagation();
    if (e.type === 'click') { c.click(); return; }
    c.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: e.clientX, clientY: e.clientY, button: 2, buttons: 2 }));
  }

  function onClick(e) {
    /* On a layer marked data-win-beside-modifier, Ctrl or Cmd with a click
       on a link that would replace its window opens beside it instead. A
       middle click, and Shift, stay the browser's. */
    var modified = e.target.closest && e.target.closest('a[data-win-open][data-win-replace]');
    if (modified && e.button === 0 && !e.defaultPrevented && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey &&
        layer.hasAttribute('data-win-beside-modifier') && KEY_RE.test(modified.getAttribute('data-win-open'))) {
      e.preventDefault();
      open(modified.getAttribute('data-win-open'), modified, besideZone(modified, hostOf(modified)));
      return;
    }
    if (!plainClick(e)) return;

    var opener = e.target.closest('a[data-win-open]');
    if (opener) {
      var key = opener.getAttribute('data-win-open');
      if (!KEY_RE.test(key)) return;
      e.preventDefault();
      if (opener.hasAttribute('data-win-beside')) { open(key, opener, besideZone(opener, hostOf(opener))); return; }
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

    /* Each window is closed as its own Close would close it, so one that
       refuses, an editor with unsaved changes say, stays open. */
    var closeAll = e.target.closest('a[data-win-close-all]');
    if (closeAll) {
      e.preventDefault();
      if (closeAll.getAttribute('aria-disabled') !== 'true') closable(state).forEach(function (k) { if (state.open.indexOf(k) >= 0) close(k); });
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
    required = keyList((layer.getAttribute('data-win-required') || '').replace(/\s+/g, ','));

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
    document.addEventListener('submit', onSubmit);
    layer.addEventListener('pointerdown', onPointerDown);
    layer.addEventListener('pointerdown', onSplitterDown);
    layer.addEventListener('dblclick', onDoubleClick);
    layer.addEventListener('dblclick', onSplitterDoubleClick);
    layer.addEventListener('keydown', onSplitterKey);
    layer.addEventListener('focusin', onFocusIn);
    layer.addEventListener('keydown', function (e) {
      var head = e.target.classList && e.target.classList.contains('win-head') ? e.target : null;
      if (head && layer.contains(head)) onHeadKey(e, head.closest('.win').getAttribute('data-win'));
    });
    document.addEventListener('keydown', onEscape);
    document.addEventListener('click', onBarEdge, true);
    document.addEventListener('contextmenu', onBarEdge, true);
    watchBars();
    document.addEventListener('pointerdown', dragTaskbar);
    document.addEventListener('keydown', function (e) {
      if (e.defaultPrevented || !taskbarReorderEnabled() || !e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey || ['ArrowLeft', 'ArrowRight'].indexOf(e.key) < 0) return;
      var tab = e.target.closest && e.target.closest('.win-bar [data-win-dock] > :is([data-win-tab], [data-win-stack])');
      if (!tab) return;
      e.preventDefault();
      var rtl = getComputedStyle(tab.parentElement).direction === 'rtl';
      taskbarOrderCommands(tab.parentElement, entryId(tab))[(e.key === 'ArrowLeft') !== rtl ? 0 : 1].run();
    });
    window.addEventListener('keydown', onSwitchKeyDown, true);
    window.addEventListener('keyup', onSwitchKeyUp, true);
    window.addEventListener('blur', function () { switchEnd(); });
    window.addEventListener('pointerdown', function (e) { if (picking && !(switchPanel && switchPanel.contains(e.target))) switchEnd(); }, true);
    window.addEventListener('popstate', function () { sync(false); });

    /* A dock tab's right-click menu (0.79.0) is its window's menu: the
       window's own commands, then Snap and Dock, then what its content
       adds, then Close, the tab marked while it is open. An application
       answers for the tab itself by adding rows nearer the tab, or by
       calling preventDefault() on pudl:contextmenu; data-win-tab-menu="off"
       on the layer or the dock turns it off. */
    document.addEventListener('pudl:contextmenu', function (e) {
      if (e.defaultPrevented || !e.detail || (e.detail.count && e.detail.count())) return;
      var stack = e.target && e.target.closest && e.target.closest('[data-win-stack]');
      if (stack && !stack.closest('[data-win-tab-menu="off"]') && layer.getAttribute('data-win-tab-menu') !== 'off') {
        var stackDock = stack.parentElement, group = stack.getAttribute('data-win-stack'), commands = stackCommands(group, stackDock);
        if (taskbarReorderEnabled()) commands.push('-', { label: text('taskbar-order', 'Taskbar order'), items: taskbarOrderCommands(stackDock, 'group:' + group) });
        stackContext = { owner: stack, dock: stackDock, group: group, rows: function () { return groupMembers(group, stackDock).length ? stackCommands(group, stackDock).concat(taskbarReorderEnabled() ? ['-', { label: text('taskbar-order', 'Taskbar order'), items: taskbarOrderCommands(stackDock, 'group:' + group) }] : []) : []; } };
        e.detail.add(commands); if (e.detail.mark) e.detail.mark(stack); if (e.detail.anchor) e.detail.anchor(stack); return;
      }
      var tab = e.target && e.target.closest && e.target.closest('[data-win-tab], [data-dock-key], [data-dock-menu]');
      if (!tab || tab.closest('[data-win-tab-menu="off"]') || layer.getAttribute('data-win-tab-menu') === 'off') return;
      var key = tab.getAttribute('data-win-tab') || tab.getAttribute('data-dock-key') || tab.getAttribute('data-dock-menu');
      if (!wins[key]) return;
      function windowRows() {
        if (!wins[key]) return [];
      var all = menuCommands(key);
      var own = all.filter(function (c) { return !c.items && c.id !== 'close'; });
      var lists = all.filter(function (c) { return c.items; });
      var close = all.filter(function (c) { return c.id === 'close'; });
      var content = contentCommands(wins[key], key);
      var rows = [];
      var taskbarDock = tab.closest('.win-bar [data-win-dock]');
      if (taskbarReorderEnabled() && tab.hasAttribute('data-win-stack-row') && stackPopup) rows.push({ label: text('taskbar-order', 'Taskbar order'), items: internalOrderCommands(stackPopup.button.parentElement, key, stackPopup.button.getAttribute('data-win-stack')) });
      if (taskbarReorderEnabled() && taskbarDock) rows.push({ label: text('taskbar-order', 'Taskbar order'), items: taskbarOrderCommands(taskbarDock, key) });
      [own, lists, content, close].forEach(function (part) {
        if (!part.length) return;
        if (rows.length) rows.push('-');
        rows = rows.concat(part);
      });
        return rows;
      }
      var rows = windowRows();
      if (!rows.length) return;
      if (tab.hasAttribute('data-win-stack-row')) stackContext = { owner: tab, rows: windowRows };
      e.detail.add(rows);
      if (e.detail.mark) e.detail.mark(tab);
      if (e.detail.anchor) e.detail.anchor(tab);
    });

    /* The taskbar's own right-click menu (0.79.0), anywhere in a .win-bar
       but its dock's tabs: minimize all, restore all and close all, each
       disabled while it would change nothing. An application answers for
       its own controls by adding rows nearer them, or turns the menu off
       with data-win-bar-menu="off" on the bar. */
    document.addEventListener('pudl:contextmenu', function (e) {
      if (e.defaultPrevented || !e.detail || (e.detail.count && e.detail.count())) return;
      var bar = e.target && e.target.closest && e.target.closest('.win-bar');
      if (!bar || bar.getAttribute('data-win-bar-menu') === 'off' || e.target.closest('[data-win-tab], [data-win-stack]')) return;
      if (!bar.querySelector('[data-win-dock]')) return;
      var taskbarRows = [
        { label: text('minimize-all', 'Minimize all'), glyph: 'minimize-all', disabled: !anyShowing(state), run: function () { commit(allMinimized(state), false); } },
        { label: text('restore-all', 'Restore all'), glyph: 'restore-all', disabled: !anyMinimized(state), run: restoreAll },
        '-',
        { label: text('close-all', 'Close all windows'), danger: true, disabled: !closable(state).length, run: function () {
          closable(state).forEach(function (k) { if (state.open.indexOf(k) >= 0) close(k); });
        } }
      ];
      if (taskbarReorderEnabled()) taskbarRows.push('-', { label: text('taskbar-arrange', 'Arrange taskbar'), run: function () { arrangeTaskbar(bar.querySelector('[data-win-dock]')); } });
      e.detail.add(taskbarRows);
    });

    /* The window menu is built as it opens. beforetoggle does not bubble,
       so it is caught on the way down. */
    layer.addEventListener('beforetoggle', function (e) {
      var panel = e.target;
      if (e.newState !== 'open' || !panel.classList) return;
      if (panel.classList.contains('win-menu')) {
        var key = panel.getAttribute('data-win-menu-for'), edge = shownEdge(state, key);
        var useTab = sharedEdge(edge) && (!iconRail(state, edge) || dockOnly(key));
        if (useTab) panel.setAttribute('data-menu-anchor', (iconRail(state, edge) ? 'pudl-dock-tab-' : 'pudl-dock-menu-') + key);
        else panel.removeAttribute('data-menu-anchor');
        buildMenu(panel, key);
      }
      else if (panel.classList.contains('win-snap-panel')) {
        panel.textContent = '';
        snapItems(panel, panel.getAttribute('data-win-menu-for'));
      }
    }, true);

    /* A side dock moves to the bottom when the layer grows too narrow for
       it, and back when it widens again. */
    function refreshPolicy() {
      if (syncing || !state.open.length) return;
      var stamp = String(narrowLayer()) + ':' + (layer.hasAttribute('data-win-dock-splits') ? layer.clientWidth + ',' + layer.clientHeight : '') + ':' + sharedEdges().map(autoCollapsed).join(',') + ':' + Object.keys(roomFor(state)).join(',') + state.open.map(function (k) { return k + ':' + restricted(k); }).join(',');
      if (stamp === policyStamp) return;
      policyStamp = stamp;
      if (cancelGesture) cancelGesture();
      layer.querySelectorAll('.menu-panel:popover-open').forEach(function (p) { p.hidePopover(); });
      var focusedWindow = document.activeElement && document.activeElement.closest('.win');
      apply(state);
      if (focusedWindow && focusedWindow.hidden) {
        var focusedKey = focusedWindow.getAttribute('data-win');
        var railTab = layer.querySelector('[data-dock-key="' + CSS.escape(focusedKey) + '"]');
        if (railTab) railTab.focus();
      }
      layer.dispatchEvent(new CustomEvent('pudl:windows-policy', { bubbles: true }));
    }
    window.addEventListener('resize', refreshPolicy);
    var policyFrame = 0;
    if (window.ResizeObserver) new ResizeObserver(function () {
      if (!layer.hasAttribute('data-win-dock-splits')) { refreshPolicy(); return; }
      if (!policyFrame) policyFrame = requestAnimationFrame(function () { policyFrame = 0; refreshPolicy(); });
    }).observe(layer);
    new MutationObserver(refreshPolicy).observe(layer, { subtree: true, attributes: true,
      attributeFilter: ['data-win-narrow', 'data-win-narrow-width', 'data-win-size', 'data-win-dock-rail-width', 'data-win-dock-collapse-height', 'data-win-room'] });
    new MutationObserver(function () {
      document.querySelectorAll('[data-win-tab]').forEach(function (tab) { windowMark(tab, tab.getAttribute('data-win-tab')); });
      if (taskbarDrag) taskbarDrag.cancel();
      renderDocks(); fitBarsSoon(); renderDockGroups(); if (taskbarArrangement) taskbarArrangement.refresh();
    }).observe(layer, { subtree: true, attributes: true,
      attributeFilter: ['data-win-glyph', 'data-win-attention', 'data-win-running', 'data-win-progress', 'data-win-group', 'data-win-group-label', 'data-win-group-glyph', 'data-win-section', 'data-win-group-open', 'data-win-taskbar-stacks'] });
    new MutationObserver(function () { if (taskbarDrag) taskbarDrag.cancel(); renderDocks(); fitBarsSoon(); if (taskbarArrangement) taskbarArrangement.refresh(); }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-win-dock-omit-docked'] });
    new MutationObserver(function (records) {
      var changed = records.some(function (record) {
        return Array.from(record.addedNodes).concat(Array.from(record.removedNodes)).some(function (node) {
          return node.nodeType === 1 && (node.matches('[data-win-dock]') || node.querySelector('[data-win-dock]'));
        });
      });
      if (!changed) return;
      if (taskbarDrag) taskbarDrag.cancel();
      renderDocks(); fitBarsSoon();
      if (taskbarArrangement) taskbarArrangement.refresh();
    }).observe(document.body, { subtree: true, childList: true });
    new MutationObserver(function () {
      Object.keys(dockGroups).forEach(function (id) { soonPositionDockMenus(dockGroups[id]); });
    }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['dir'] });
    document.addEventListener('pointerdown', dismissDockPeek, true);
    document.addEventListener('focusin', dismissDockPeek);
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('dialog[open], [popover]:popover-open')) return;
      var edge = Object.keys(dockPeek)[0];
      if (!edge) return;
      e.preventDefault();
      var key = dockPeek[edge];
      delete dockPeek[edge];
      apply(state);
      var tab = layer.querySelector('[data-dock-key="' + CSS.escape(key) + '"]');
      if (tab) tab.focus();
    });

    /* When pudl-regions.js swaps parts of the page, the new list rows and
       dock need marking and linking as the old ones were. */
    document.addEventListener('pudl:regions-swap', function () { apply(state); });

    /* The script interface. Each function does exactly what the matching
       link or button does, the URL and history included, so a project never
       has to click PUDL's own buttons from script. */
    window.pudlWindows = {
      open: function (key, opener) { if (KEY_RE.test(key)) open(key, opener || null); },
      replace: function (oldKey, key) { if (KEY_RE.test(key)) replaceWith(oldKey, key, null); },
      rekey: function (oldKey, key, push) { return KEY_RE.test(key) && rekey(oldKey, key, push); },
      raise: function (key) {
        if (!wins[key]) return;
        commit(raised(state, key), false);
        focusWindow(key);
      },
      minimize: function (key) { if (wins[key]) commit(minimized(state, key), false); },
      dock: function (key, edge, destination) {
        if (!wins[key] || restricted(key) || (edge != null && SIDES.indexOf(edge) < 0)) return;
        var work = destination ? placeInDock(state, key, edge, destination) : docked(state, key, edge || null);
        if (work) commit(work, !!destination);
      },
      dockMode: dockMode,
      dockArrange: dockArrange,
      dockRatio: setDockRatio,
      group: groupMembers,
      reorderTaskbar: reorderTaskbar,
      arrangeTaskbar: function (dock) { return arrangeTaskbar(dock || document.querySelector('.win-bar [data-win-dock]')); },
      dockPresentation: function (edge) { return sharedEdge(edge) ? splitPresentation(state, edge) : null; },
      /* zone is a name from ZONES, a rectangle {x, y, w, h} of fractions,
         which is moved to the nearest sixths, or null to float again. */
      snap: function (key, zone) {
        if (!wins[key] || restricted(key) || (typeof zone === 'string' && zone !== 'floating' && !ZONES[zone])) return;
        commit(snapped(state, key, zone), false);
      },
      retitle: retitle,
      detailOf: detailOf,
      openMenu: function (key) { if (wins[key]) openMenu(key); },
      /* The switcher's keys, for a host's listing of keys, when it is on. */
      switcherKeys: function () {
        if (!switcherOn()) return [];
        return [{ key: 'Ctrl+Tab', label: text('switch-last', 'Switch to the last window') }, { key: 'Ctrl+Shift+Tab', label: text('switch-back', 'Switch back through the windows') }];
      },
      minimizeAll: function () { commit(allMinimized(state), false); },
      restoreAll: restoreAll,
      /* Closes every window the reader may close, each as a script's close
         would, so one that refuses stays (0.79.0). */
      closeAll: function () { closable(state).forEach(function (k) { if (state.open.indexOf(k) >= 0) close(k, 'script'); }); },
      close: function (key) { if (wins[key]) close(key, 'script'); },
      menuCommands: menuCommands,
      shareURL: shareURL,
      copyLink: copyLink,
      effectivePlacement: function (key) { return effectivePlacement(state, key); },
      /* Whether a window can be seen now, and whether it has been seen
         since it opened. */
      shown: function (key) { return shown(state, key); },
      /* Moves a line of the zones' grid, "x" or "y" and 1 to 5, to a share
         of the inner area, within its limits, or with null returns it to
         the grid. */
      grid: function (axis, line, position) {
        if ((axis !== 'x' && axis !== 'y') || !(line >= 1 && line <= 5)) return;
        if (position == null) { forgetLines([[axis, line]]); return; }
        var work = withGrid();
        pinLines(work.grid, state, axis, line);
        work.grid[axis][line] = clampLine(work.grid, gridMins(state), axis, line, Number(position));
        commit(work, false);
      },
      seen: function (key) { return !!wins[key] && seenWins.has(wins[key]); },
      reload: reload,
      update: update,
      state: function () { return copy(state); }
    };

    sync(false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
