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

   window.pudlWindows offers open, replace, raise, minimize, minimizeAll,
   restoreAll, retitle, close and state
   to scripts, each doing what the matching link or button does. */
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
  var defaults = [];       // keys of the windows open when the address names none
  var bare = null;         // the window parameters of the state an address naming none produced
  var closing = {};        // key -> why its window is about to close, for pudl:window-close

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

  /* The smallest a window may be, as fractions of a layer of that size. */
  function minFractions(layerW, layerH) {
    return {
      w: Math.min(1, pxMin('--win-min-w', 320) / (layerW || 1)),
      h: Math.min(1, pxMin('--win-min-h', 200) / (layerH || 1))
    };
  }

  /* min, from minFractions(), may be passed in by a caller that clamps many
     times over, since finding it reads the layer's computed style. */
  function clampPlacement(p, layerW, layerH, min) {
    min = min || minFractions(layerW, layerH);
    var w = Math.min(1, Math.max(min.w, p.w));
    var h = Math.min(1, Math.max(min.h, p.h));
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

  function isHidden(st, key) {
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
    st = raised(st, key);
    var p = st.place[key];
    p.mode = p.mode === 'floating' ? 'maximized' : 'floating';
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

  function apply(st) {
    /* A window leaving the page says so first, however it was closed, so
       its content can tear down what it set up, and says why, so a project
       can tell a reader closing it from the address moving on. */
    Object.keys(wins).forEach(function (k) {
      if (st.open.indexOf(k) >= 0) return;
      var gone = wins[k];
      delete wins[k];
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

    var front = active(st);
    zOrder.forEach(function (k, i) {
      var el = wins[k];
      setPlacement(el, st.place[k]);
      el.hidden = isHidden(st, k);
      el.classList.toggle('active', k === front);
      el.style.zIndex = String(i + 1);
    });
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
      setHref(el.querySelector('[data-win-action="minimize"]'), urlFor(minimized(state, k)));
      setHref(el.querySelector('[data-win-action="close"]'), urlFor(closed(state, k)));
      var max = el.querySelector('[data-win-action="maximize"]');
      setHref(max, urlFor(maximizeToggled(state, k)));
      if (max) {
        var label = state.place[k].mode === 'floating' ? text('maximize', 'Maximize') : text('restore', 'Restore');
        max.setAttribute('aria-label', label);
        max.setAttribute('title', label);
      }
    });
  }

  function setHref(a, href) { if (a && a.tagName === 'A') a.setAttribute('href', href); }

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
    if (head) head.setAttribute('aria-label', text('head',
      'Window: {title}. Arrow keys move it, Shift with arrow keys resizes it, Enter maximizes or restores it.')
      .split('{title}').join(titleOf(key)));
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
      labelHead(key);
    }

    /* A window's body scrolls, and a reader with only a keyboard can
       scroll it only by focusing something inside it. Content with no link
       or field has nothing to focus, so the body itself is a tab stop. */
    var body = el.querySelector('.win-body');
    if (body && !body.hasAttribute('tabindex')) body.tabIndex = 0;
    return el;
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
    if (!p) return null;
    var x = p.x + OPENER_STEP, y = p.y + OPENER_STEP;
    if (x + p.w > 1) x = OPENER_STEP;
    if (y + p.h > 1) y = OPENER_STEP;
    return { mode: p.mode, x: x, y: y, w: p.w, h: p.h };
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

    var s = el.style;
    var mode = MODES.indexOf(el.getAttribute('data-win-mode')) >= 0 ? el.getAttribute('data-win-mode') : 'floating';
    var fromStyle = {
      mode: mode,
      x: parseFloat(s.getPropertyValue('--win-x')), y: parseFloat(s.getPropertyValue('--win-y')),
      w: parseFloat(s.getPropertyValue('--win-w')), h: parseFloat(s.getPropertyValue('--win-h'))
    };
    if (validPlacement(fromStyle)) return fromStyle;

    /* The markup's mode still counts without numbers, so a window can open
       maximised, and the cascade gives it somewhere to restore to. */
    var step = (index % 6) * 0.04;
    return { mode: mode, x: 0.06 + step, y: 0.05 + step, w: 0.55, h: 0.75 };
  }

  function announceOpen(el) {
    el.dispatchEvent(new CustomEvent('pudl:window-open', { bubbles: true }));
  }

  function focusWindow(key) {
    var head = wins[key] && wins[key].querySelector('.win-head');
    if (head) head.focus({ preventScroll: true });
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
                                     layer.clientWidth, layer.clientHeight);
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
        st.place[key] = clampPlacement(initialPlacement(key, el, st.open.length - 1), layer.clientWidth, layer.clientHeight);
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
      failed.forEach(function (k) { if (k) st = closed(st, k); });
      st.open.forEach(function (k, i) {
        var p = st.place[k] || initialPlacement(k, wins[k], i);
        st.place[k] = clampPlacement(p, layer.clientWidth, layer.clientHeight);
      });
      if (!st.top) st.top = st.open.filter(function (k) { return !st.min[k]; }).pop() || null;
      if (!named && defaults.length) bare = windowParams(st).join('&');
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
     from an edge. Pointer events can arrive several times a frame, so each
     one only notes where the pointer is, and the window follows once a
     frame. A dragged window moves by transform, which the compositor
     handles without laying the window out or repainting it; a resized one
     has to be laid out, but only once a frame. The state is committed
     once, when the pointer lifts. */
  function gesture(e, key, edge) {
    var el = wins[key];
    var target = e.currentTarget;
    var r = layer.getBoundingClientRect();
    var min = minFractions(r.width, r.height);
    var start = Object.assign({}, state.place[key]);
    var base = start, baseX = e.clientX, baseY = e.clientY;
    var lastX = baseX, lastY = baseY;
    var cur = start, snap = null, moved = false, frame = 0;

    target.setPointerCapture(e.pointerId);

    function begin() {
      moved = true;
      layer.classList.add('dragging');
      if (edge) return;
      /* Dragging a maximised or snapped window lifts it back to its
         floating size, under the pointer, at the same point along the
         title bar. */
      if (start.mode !== 'floating') {
        var er = el.getBoundingClientRect();
        var along = (baseX - er.left) / (er.width || 1);
        base = {
          mode: 'floating', w: start.w, h: start.h,
          x: (baseX - r.left) / r.width - along * start.w,
          y: (er.top - r.top) / r.height
        };
        setPlacement(el, base);
      }
      el.classList.add('win-moving');
    }

    function step() {
      frame = 0;
      var dx = (lastX - baseX) / r.width;
      var dy = (lastY - baseY) / r.height;
      if (edge) {
        cur = resizeFrom(base, edge, dx, dy, min);
        setPlacement(el, cur);
        return;
      }
      cur = clampPlacement({ mode: 'floating', x: base.x + dx, y: base.y + dy, w: base.w, h: base.h }, r.width, r.height, min);
      el.style.transform = 'translate(' + (cur.x - base.x) * r.width + 'px, ' + (cur.y - base.y) * r.height + 'px)';
      var s = snapAt(lastX, lastY, r);
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
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', end);
      /* The pointer may lift before the frame that would have followed its
         last move, so that move is taken now. */
      if (frame) { cancelAnimationFrame(frame); step(); }
      layer.classList.remove('dragging');
      showGhost(null);
      el.classList.remove('win-moving');
      el.style.transform = '';
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

  function resizeFrom(p, edge, dx, dy, min) {
    var minW = min.w, minH = min.h;
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

  /* Keys pressed on the title bar itself; keys on the title link or the
     buttons inside it are theirs. */
  function onHeadKey(e, key) {
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

    var btn = e.target.closest('.win [data-win-action]');
    if (btn && layer.contains(btn)) {
      var action = btn.getAttribute('data-win-action');
      var wk = btn.closest('.win').getAttribute('data-win');
      if (action === 'minimize') { e.preventDefault(); commit(minimized(state, wk), false); }
      else if (action === 'maximize') { e.preventDefault(); commit(maximizeToggled(state, wk), false); }
      else if (action === 'close') { e.preventDefault(); close(wk, 'button'); }
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
    if (state.top !== key && !isHidden(state, key)) commit(raised(state, key), false);
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
      retitle: retitle,
      minimizeAll: function () { commit(allMinimized(state), false); },
      restoreAll: restoreAll,
      close: function (key) { if (wins[key]) close(key, 'script'); },
      state: function () { return copy(state); }
    };

    sync(false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
