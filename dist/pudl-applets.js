/* PUDL applets. Load with defer, after pudl-windows.js if the page has
   windows. An applet is interactive content that runs unchanged in a page
   of its own, embedded in an article, or inside a PUDL window. PUDL does
   not build or manage the applet; this script is only the handshake
   between the applet and whichever host it lands in.

   A site names each applet once, in a script it loads on every page after
   this one:

     pudlApplets.define('mixer', { src: '/js/mixer.js', css: '/css/mixer.css',
                                   page: '/apps/mixer', ver: '3' });

   and a mount needs only the name:

     <div data-applet="mixer"><noscript>…</noscript></div>

   ver is added to src and css as ?v=, so a new version is one edit. Only
   define() names an applet's script and stylesheet, because define() is
   called by the site's own script, whereas a page's markup can come from
   people other than its authors, and a mount naming a script would let
   them choose what runs with the page's authority. A mount may carry
   data-applet-page, a page on this origin that overrides the registry's.
   The order of loading does not matter: a mount that meets an undefined
   name waits for its define().

   The applet's script registers it:

     pudlApplets.register('mixer', {
       init: function (root, opts) { ...; return { destroy: function () {} }; }
     });

   init builds the applet inside root, finds and listens only within root,
   and returns an instance whose destroy() undoes everything it set up.
   opts carries:
     host     "window" inside a PUDL window, otherwise "page";
     fit      "fill" when the host gives a definite box to fill without
              scrolling, "flow" when the column gives the width and the page
              scrolls. A window fills and anything else flows, unless the
              mount's data-applet-fit says otherwise. The mount's
              data-applet-fit reads the answer, for the applet's stylesheet;
     ownsUrl  true only on the applet's own page, where it may keep its
              state in the address itself;
     pageUrl  the applet's own page, for a share link that works anywhere;
     instance the key this instance goes by: its window's key in a window,
              otherwise the applet's name, for a host that keeps each
              instance's state apart;
     state    the state the host kept for it, or a request left for it, a
              string, or null;
     changed  a function the applet calls, with its state string, when the
              state changes; it fires pudl:applet-change on the mount.

   The instance may also have state(), returning a string, and
   setState(s), taking one, and commands(), which the section on commands
   below sets out, and ready, a promise that settles when it can be used,
   such as once it has loaded what it shows; its window stays busy until
   then. The section on when an applet starts sets out start. PUDL keeps no applet state, with one opt-in: a
   mount outside a window with data-applet-param="name" has its state kept
   in the page's query under that name, replaced rather than pushed, so an
   applet embedded in an article can be shared by the article's address.
   Back and Forward hand a changed value to setState(). Any other host
   keeps the state where it likes: just before init, pudl:applet-state
   fires on the mount, with detail.instance, and whatever a listener puts
   in detail.state arrives as opts.state; pudl:applet-change says when to
   keep it again.

   Applets can ask each other for things without naming each other, by
   declaring the requests they serve; the section on requests below sets
   it out.

   A link carrying data-applet-preset="mixer" sets up a running mixer: its
   href is where it goes without script, and with an instance of that
   applet in the same window as the link, or like the link in no window,
   a plain click hands the link's state to setState() instead. The state
   is the value of the mount's data-applet-param if the link carries one,
   otherwise the link's whole query. A mount that keeps its state in the
   address gets the link's address as a new history entry, so Back undoes
   the preset.

   The runtime loads each stylesheet and script once, starts the applets in
   the page when it loads, those in each window as it opens and those in a
   region as pudl-regions.js swaps it in, and destroys them as their window
   closes or their region goes. boot(scope) and destroy(scope) are there
   for content a project adds or removes by other means. */
(function () {
  'use strict';

  var registry = {};       // name -> the applet's definition, from register()
  var defs = {};           // name -> where its files are, from define()
  var waiting = {};        // name -> resolvers for applets whose script is still arriving
  var unresolved = {};     // name -> mounts that met the name before define()
  var scripts = {};        // src -> promise of the script having run
  var running = [];        // { root, name, instance, param, last, ownsUrl, fitSet }

  function register(name, def) {
    registry[name] = def;
    (waiting[name] || []).forEach(function (resolve) { resolve(def); });
    delete waiting[name];
  }

  function abs(url) { return new URL(url, document.baseURI).href; }

  function versioned(url, ver) {
    if (!url) return null;
    if (!ver) return url;
    var u = new URL(url, document.baseURI);
    u.searchParams.set('v', ver);
    return u.href;
  }

  function sameOrigin(url) {
    try { return new URL(url, document.baseURI).origin === location.origin; } catch (e) { return false; }
  }

  /* Where a mount's files are: the registry's entry, with its version on
     the script and stylesheet. A mount's data-applet-page overrides the
     registry's page when it is on this origin, since an applet may put its
     page in a link. */
  function config(root) {
    var name = root.getAttribute('data-applet');
    var d = defs[name] || {};
    var page = root.getAttribute('data-applet-page');
    if (page && !sameOrigin(page)) page = null;
    return { name: name, src: versioned(d.src, d.ver), css: versioned(d.css, d.ver), page: page || d.page || null };
  }

  /* Up to 0.22 a mount could name its own script and stylesheet. Those
     attributes are no longer read, and a mount that still carries them
     says so once, since it would otherwise wait for a define() in silence. */
  function warnRetired(root) {
    if (!root.hasAttribute('data-applet-src') && !root.hasAttribute('data-applet-css')) return;
    if (window.console) console.warn('pudl-applets: data-applet-src and data-applet-css are no longer read; name the files of "' +
                                     root.getAttribute('data-applet') + '" with pudlApplets.define()');
  }

  function ensureCss(href) {
    if (!href) return;
    var want = abs(href);
    var have = Array.prototype.some.call(document.querySelectorAll('link[rel="stylesheet"]'), function (l) {
      return l.href === want;
    });
    if (have) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function ensureScript(src) {
    var key = abs(src);
    if (!scripts[key]) {
      scripts[key] = new Promise(function (resolve, reject) {
        var el = document.createElement('script');
        el.src = src;
        el.onload = resolve;
        el.onerror = function () { reject(new Error('could not load ' + src)); };
        document.head.appendChild(el);
      });
    }
    return scripts[key];
  }

  function fail(root, err) {
    root.setAttribute('data-applet-state', 'error');
    if (window.console) console.warn('pudl-applets:', err.message);
    settle(root);
  }

  /* The script's promise, checked for having registered the name. */
  function loaded(name, src) {
    return ensureScript(src).then(function () {
      if (registry[name]) return registry[name];
      throw new Error(src + ' did not register an applet named ' + name);
    });
  }

  /* The applet's definition: at once if it is registered, after its script
     has loaded if the registry names it, or else whenever it is
     registered, by a later define() naming its script or by a script the
     page loads itself. */
  function definition(name, src) {
    if (registry[name]) return Promise.resolve(registry[name]);
    if (src) return loaded(name, src);
    return new Promise(function (resolve) {
      (waiting[name] = waiting[name] || []).push(resolve);
    });
  }

  function define(name, cfg) {
    defs[name] = cfg || {};
    /* For pudl-actions.js, which reads the manifests define() names. */
    document.dispatchEvent(new CustomEvent('pudl:applet-define', { detail: { name: name } }));
    var roots = unresolved[name] || [];
    delete unresolved[name];
    roots.forEach(function (root) {
      if (!root.isConnected || root.getAttribute('data-applet-state') !== 'loading') return;
      var c = config(root);
      ensureCss(c.css);
      if (c.src && !registry[name]) loaded(name, c.src).catch(function (err) { fail(root, err); });
    });
  }

  /* === The page's address ================================================= */

  /* The applet's own page is this page when the paths agree, ignoring an
     index file, an .html extension and a trailing slash, since servers
     answer to all of them. */
  function samePage(url) {
    function norm(p) { return p.replace(/\/index\.html?$/, '/').replace(/\.html?$/, '').replace(/\/+$/, ''); }
    return norm(new URL(url, location.href).pathname) === norm(location.pathname);
  }

  function readParam(name) {
    return new URLSearchParams(location.search).get(name);
  }

  /* Replaces one parameter in the address and leaves every other one as
     written, since the windows write theirs unescaped for readability. */
  function writeParam(name, value, push) {
    var segs = location.search.replace(/^\?/, '').split('&').filter(function (seg) {
      if (!seg) return false;
      var k = seg.split('=')[0];
      try { k = decodeURIComponent(k.replace(/\+/g, ' ')); } catch (e) { /* leave as is */ }
      return k !== name;
    });
    if (value !== null && value !== '') segs.push(encodeURIComponent(name) + '=' + encodeURIComponent(value));
    var url = location.pathname + (segs.length ? '?' + segs.join('&') : '') + location.hash;
    if (url === location.pathname + location.search + location.hash) return;
    if (push) history.pushState(null, '', url);
    else history.replaceState(history.state, '', url);
  }

  /* === Starting and stopping ============================================== */

  function launch(root, def, c, reason) {
    /* The window or region may have gone while the script was on its way. */
    if (!root.isConnected) { settle(root); return; }
    var inWindow = !!root.closest('.win');
    var fit = root.getAttribute('data-applet-fit');
    var fitSet = false;
    /* A window gives a definite box to fill, unless it is sized by its
       content, when the content's own size is what sizes the window. */
    if (fit !== 'fill' && fit !== 'flow') {
      fit = inWindow && !root.closest('.win[data-win-size="content"]') ? 'fill' : 'flow';
      root.setAttribute('data-applet-fit', fit);
      fitSet = true;
    }
    var param = inWindow ? null : root.getAttribute('data-applet-param');
    var pageUrl = c.page || location.pathname;
    var host = inWindow ? 'window' : 'page';
    var ownsUrl = !inWindow && !param && samePage(pageUrl);
    var inst = instanceKey(root, c.name);
    var entry = { root: root, name: c.name, instance: null, param: param, last: param ? readParam(param) : null,
                  ownsUrl: ownsUrl, fitSet: fitSet };
    /* The host's turn to hand over the state it kept, such as a window's
       from wherever it keeps the reader's continuity. A request the reader
       made just now, which opened this window, wins over it. */
    var ask = new CustomEvent('pudl:applet-state', { bubbles: true,
      detail: { name: c.name, instance: inst, host: host, fit: fit, param: param, state: entry.last } });
    root.dispatchEvent(ask);
    var state = ask.detail.state == null ? null : String(ask.detail.state);
    /* Requests that arrived while the applet was on its way queue up: the
       first is the state it starts with, and the rest reach setState() in
       order once it runs, so none is lost. */
    var queued = Object.prototype.hasOwnProperty.call(handed, inst) ? handed[inst] : [];
    delete handed[inst];
    if (queued.length) state = queued[0];
    var instance = def.init(root, {
      host: host,
      fit: fit,
      instance: inst,
      ownsUrl: ownsUrl,
      pageUrl: pageUrl,
      state: state,
      changed: function (s) {
        if (s === undefined && entry.instance && entry.instance.state) s = entry.instance.state();
        root.dispatchEvent(new CustomEvent('pudl:applet-change', { bubbles: true, detail: { state: s == null ? null : String(s) } }));
      },
      /* Says the instance's commands have changed state (preview,
         docs/proposals/toolbar-commands.md). */
      commandsChanged: function () { if (window.pudlCommands) window.pudlCommands.changed(); }
    });
    entry.instance = instance || null;
    commandsFor(entry);
    running.push(entry);
    root.setAttribute('data-applet-state', 'running');
    if (!inWindow && entry.instance && typeof entry.instance.commands === 'function') addCommandRow(entry);
    if (entry.instance && entry.instance.setState) {
      queued.slice(1).forEach(function (s) { entry.instance.setState(s); });
    }
    root.dispatchEvent(new CustomEvent('pudl:applet-start', { bubbles: true,
      detail: { name: c.name, instance: inst, reason: reason || 'open' } }));
    /* The applet is ready when init returns, or when the promise its
       instance offers as ready settles, whichever way it settles. */
    var ready = entry.instance && entry.instance.ready;
    if (ready && typeof ready.then === 'function') ready.then(function () { settle(root); }, function () { settle(root); });
    else settle(root);
  }

  /* === Commands and toolbars (preview) =====================================
     An instance's commandTable() is its commands, which pudl-commands.js
     registers with the mount as their scope, so its menus, toolbars, keys
     and agents all reach them by id. Its toolbars() describe toolbars of
     those ids:
       [{ label, ribbon, groups: [{ label, glyph, priority, end, items: ['bold',
          { choice: 'view' }, …] }] }]
     drawn into the mount's [data-toolbar-slot] if it has one, or else
     before the mount, folding as room runs out. */
  function commandsFor(entry) {
    var inst = entry.instance;
    if (!inst || !window.pudlCommands) return;
    if (typeof inst.commandTable === 'function') {
      /* One table, shared with the toolbars drawn beside the mount, so
         pudl-commands.js knows them for one scope. */
      entry.commandTable = function () { return inst.commandTable(); };
      entry.unregister = window.pudlCommands.register(entry.root, entry.commandTable);
    }
    if (typeof inst.toolbars !== 'function') return;
    var bars;
    try { bars = inst.toolbars(); } catch (err) { if (window.console) console.warn('pudl-applets:', err); return; }
    if (!Array.isArray(bars) || !bars.length) return;
    var holder = document.createElement('div');
    holder.className = 'applet-toolbars';
    bars.forEach(function (t) {
      var bar = document.createElement('div');
      bar.className = 'toolbar';
      bar.setAttribute('role', 'toolbar');
      bar.setAttribute('aria-label', t.label || '');
      bar.setAttribute('data-toolbar-fold', '');
      /* ribbon: 'hide' gives the toolbar way to the menu bar's ribbon, for
         one that repeats the ribbon's commands (0.80.1). */
      if (t.ribbon === 'hide') bar.setAttribute('data-toolbar-ribbon', 'hide');
      (t.groups || []).forEach(function (g) {
        var group = document.createElement('div');
        group.className = 'toolbar-group';
        if (g.label) group.setAttribute('data-toolbar-group', g.label);
        if (g.glyph) group.setAttribute('data-toolbar-glyph', g.glyph);
        if (g.priority != null) group.setAttribute('data-toolbar-priority', String(g.priority));
        if (g.end) group.setAttribute('data-toolbar-end', '');
        (g.items || []).forEach(function (item) {
          var c;
          if (item && typeof item === 'object' && item.choice) {
            c = document.createElement('div');
            c.setAttribute('data-command-choice', item.choice);
          } else {
            c = document.createElement('button');
            c.type = 'button';
            c.setAttribute('data-command', String(item));
          }
          group.appendChild(c);
        });
        bar.appendChild(group);
      });
      holder.appendChild(bar);
    });
    var slot = entry.root.querySelector('[data-toolbar-slot]');
    if (slot) slot.appendChild(holder);
    else entry.root.parentNode.insertBefore(holder, entry.root);
    entry.toolbars = holder;
    /* Toolbars drawn before the mount are outside it, so they are a scope
       of the same commands. */
    if (!slot && typeof inst.commandTable === 'function') {
      var off = window.pudlCommands.register(holder, entry.commandTable);
      var first = entry.unregister;
      entry.unregister = function () { if (first) first(); off(); };
    }
  }

  /* === When an applet starts ===============================================
     An applet in a window may ask to start later than the window's opening
     (0.66.0), with start in define() or register(), or data-applet-start on
     its mount, which wins:

       "open"  as the window opens, the default;
       "seen"  the first time the window is seen, which pudl-windows.js says
               with pudl:window-seen: in front, shown in a dock, or filling a
               zone nothing covers;
       "idle"  as "seen", and also, while not yet seen, once every applet
               started before it is ready, one at a time.

     Outside a window the applet starts at once. Until it starts, its mount
     is hidden, a loading line stands in its place, and the window is marked
     aria-busy, which stays until the applet is ready. A window closed before
     it was seen never starts its applet. pudl:applet-start fires on the
     mount as it starts, with detail.reason "open", "seen", "idle" or
     "host", and started(key) and start(key) let a host ask whether a
     window's applets have started and start them now. */

  var IDLE_DELAY = 120;    // ms between one idle applet being ready and the next starting
  var parked = [];         // mounts waiting for their window to be seen, in the order they arrived
  var starting = new Set();// mounts started and not yet ready
  var readiness = new WeakMap(); // mount -> { promise, resolve } for its being ready
  var idleTimer = 0;

  function policyOf(root) {
    var name = root.getAttribute('data-applet');
    var p = root.getAttribute('data-applet-start') || (defs[name] && defs[name].start) || (registry[name] && registry[name].start);
    return p === 'seen' || p === 'idle' ? p : 'open';
  }

  function windowOf(root) { return root.closest('.win[data-win]'); }

  function unseen(root) {
    var win = windowOf(root);
    return !!(win && window.pudlWindows && window.pudlWindows.seen && !window.pudlWindows.seen(win.getAttribute('data-win')));
  }

  /* A window is busy while any applet in it is waiting, loading or not yet
     ready. */
  function markBusy(root, on) {
    root.toggleAttribute('data-applet-busy', on);
    var win = windowOf(root);
    if (!win) return;
    if (win.querySelector('[data-applet][data-applet-busy]')) win.setAttribute('aria-busy', 'true');
    else win.removeAttribute('aria-busy');
  }

  function readinessOf(root) {
    var r = readiness.get(root);
    if (!r) {
      r = {};
      r.promise = new Promise(function (resolve) { r.resolve = resolve; });
      readiness.set(root, r);
    }
    return r;
  }

  function settle(root) {
    starting.delete(root);
    markBusy(root, false);
    readinessOf(root).resolve();
    readiness.delete(root);
    scheduleIdle();
  }

  function park(root) {
    starting.delete(root);
    root.setAttribute('data-applet-state', 'waiting');
    var line = document.createElement('div');
    line.className = 'loading applet-waiting';
    line.setAttribute('role', 'status');
    var spin = document.createElement('span');
    spin.className = 'spinner';
    spin.setAttribute('aria-hidden', 'true');
    line.appendChild(spin);
    line.appendChild(document.createTextNode(' ' + (root.getAttribute('data-applet-text-loading') || 'Loading…')));
    root.parentNode.insertBefore(line, root);
    parked.push(root);
    scheduleIdle();
  }

  function unpark(root, reason) {
    var i = parked.indexOf(root);
    if (i < 0) return;
    parked.splice(i, 1);
    var line = root.previousElementSibling;
    if (line && line.classList.contains('applet-waiting')) line.remove();
    root.setAttribute('data-applet-state', 'loading');
    starting.add(root);
    var name = root.getAttribute('data-applet');
    try { launch(root, registry[name], config(root), reason); }
    catch (err) { fail(root, err); }
  }

  /* The next idle applet starts once nothing else is starting, after a
     moment, so the window in front is drawn first. */
  function scheduleIdle() {
    if (idleTimer || starting.size) return;
    idleTimer = setTimeout(function () {
      idleTimer = 0;
      if (starting.size) return;
      parked = parked.filter(function (r) { return r.isConnected; });
      var next = parked.find(function (r) { return policyOf(r) === 'idle'; });
      if (next) unpark(next, 'idle');
    }, IDLE_DELAY);
  }

  function start(root) {
    root.setAttribute('data-applet-state', 'loading');
    starting.add(root);
    readinessOf(root);
    markBusy(root, true);
    var c = config(root);
    warnRetired(root);
    ensureCss(c.css);
    if (!c.src && !registry[c.name]) (unresolved[c.name] = unresolved[c.name] || []).push(root);
    definition(c.name, c.src).then(function (def) {
      if (root.getAttribute('data-applet-state') !== 'loading') return;
      var policy = policyOf(root);
      if (policy !== 'open' && unseen(root)) park(root);
      else launch(root, def, config(root), policy === 'open' || !windowOf(root) ? 'open' : 'seen');
    }).catch(function (err) { fail(root, err); });
  }

  /* Whether every applet in a window has started, and starting them now,
     for a host command that needs every instance, such as saving every
     open document. start(key) answers a promise that settles when they are
     all ready. */
  function windowEl(key) {
    return document.querySelector('.win[data-win="' + (window.CSS && CSS.escape ? CSS.escape(key) : key) + '"]');
  }

  function started(key) {
    var win = windowEl(key);
    return !!win && !win.querySelector('[data-applet]:not([data-applet-state="running"]):not([data-applet-state="error"])');
  }

  function startWindow(key) {
    var win = windowEl(key);
    if (!win) return Promise.resolve();
    parked.slice().forEach(function (r) { if (win.contains(r)) unpark(r, 'host'); });
    return Promise.all(Array.prototype.map.call(win.querySelectorAll('[data-applet]'), function (r) {
      var w = readiness.get(r);
      return w ? w.promise : null;
    })).then(function () {});
  }

  document.addEventListener('pudl:window-seen', function (e) {
    parked.slice().forEach(function (r) { if (e.target.contains(r)) unpark(r, 'seen'); });
  });

  function boot(scope) {
    (scope || document).querySelectorAll('[data-applet]:not([data-applet-state])').forEach(start);
    if (scope && scope.matches && scope.matches('[data-applet]:not([data-applet-state])')) start(scope);
  }

  /* Destroys the applets inside scope, or with no scope, those whose mount
     has left the document. */
  function destroy(scope) {
    /* An applet that never started, or is not yet ready, is let go too, so
       it does not hold up the idle ones. */
    function gone(root) { return scope ? (scope === root || scope.contains(root)) : !root.isConnected; }
    parked = parked.filter(function (root) {
      if (!gone(root)) return true;
      root.removeAttribute('data-applet-state');
      return false;
    });
    starting.forEach(function (root) { if (gone(root)) settle(root); });
    running = running.filter(function (entry) {
      var inside = scope ? (scope === entry.root || scope.contains(entry.root)) : !entry.root.isConnected;
      if (!inside) return true;
      try { if (entry.instance && entry.instance.destroy) entry.instance.destroy(); }
      catch (err) { if (window.console) console.warn('pudl-applets:', err); }
      entry.root.removeAttribute('data-applet-state');
      if (entry.fitSet) entry.root.removeAttribute('data-applet-fit');
      if (entry.row) entry.row.remove();
      if (entry.unregister) entry.unregister();
      if (entry.toolbars) entry.toolbars.remove();
      return false;
    });
  }

  /* === Commands ============================================================
     An instance may offer commands of its own with commands(), returning
     [{ label, run, checked, disabled }], asked afresh each time they are
     shown so each label and tick is current. checked, when given, makes
     the command one that switches on and off. In a window the commands
     join the window menu, which asks for them with commandsIn(); on a page
     they get a menu of their own, in a row above the applet. */

  /* A row may be the id of a command in the applet's command table, which
     pudl-commands.js turns into the row (0.68.1). */
  function resolveRows(list, root) {
    return window.pudlCommands && window.pudlCommands.menuRows ? window.pudlCommands.menuRows(list, root) : list;
  }
  function resolveMenus(m, root) {
    if (!m || typeof m !== 'object') return m;
    var out = Object.assign({}, m);
    if (Array.isArray(m.titles)) out.titles = m.titles.map(function (t) { return t && Array.isArray(t.items) ? Object.assign({}, t, { items: resolveRows(t.items, root) }) : t; });
    if (m.into && typeof m.into === 'object') {
      out.into = {};
      Object.keys(m.into).forEach(function (k) { out.into[k] = resolveRows(m.into[k], root); });
    }
    return out;
  }

  function commandsOf(entry) {
    var list;
    try { list = resolveRows(entry.instance.commands(), entry.root); }
    catch (err) { if (window.console) console.warn('pudl-applets:', err); return []; }
    return (Array.isArray(list) ? list : []).filter(function (c) {
      return c && typeof c.label === 'string' && typeof c.run === 'function';
    });
  }

  /* The commands of the running applets inside scope, in document order. */
  function commandsIn(scope) {
    var out = [];
    running.forEach(function (entry) {
      if (!entry.root.isConnected || !entry.instance || typeof entry.instance.commands !== 'function') return;
      if (scope && scope !== entry.root && !scope.contains(entry.root)) return;
      out = out.concat(commandsOf(entry));
    });
    return out;
  }

  /* The applet a menu bar shows a menu for: the first running inside scope
     that offers menus() or commands(), skipping those in windows when
     outside is true. Its functions are asked afresh at each call, so the
     menu is always current. */
  function menuSourceIn(scope, outside) {
    for (var i = 0; i < running.length; i++) {
      var entry = running[i], inst = entry.instance;
      if (!entry.root.isConnected || !inst) continue;
      if (scope && scope !== document && scope !== entry.root && !scope.contains(entry.root)) continue;
      if (outside && entry.root.closest('.win')) continue;
      if (entry.root.hasAttribute('data-applet-resident')) continue;
      var src = menuSource(entry);
      if (src) return src;
    }
    return null;
  }

  function menuSource(entry) {
    var inst = entry.instance;
    var hasMenus = typeof inst.menus === 'function', hasCommands = typeof inst.commands === 'function';
    if (!hasMenus && !hasCommands) return null;
    return {
      name: entry.name, root: entry.root, _instance: inst,
      menus: hasMenus ? function (inst, name, root) {
        return function () {
          try { return resolveMenus(inst.menus(), root); } catch (err) { if (window.console) console.warn('pudl-applets: ' + name + '.menus():', err); return null; }
        };
      }(inst, entry.name, entry.root) : null,
      commands: hasCommands ? function (e) { return function () { return commandsOf(e); }; }(entry) : null
    };
  }

  /* Resident applets (preview): those whose root has data-applet-resident,
     such as one for the reader's pins, are never the menu bar's front
     applet; their menus stay in the bar whatever is in front, in document
     order. */
  function residentSources() {
    var out = [];
    running.forEach(function (entry) {
      if (!entry.root.isConnected || !entry.instance || !entry.root.hasAttribute('data-applet-resident')) return;
      var src = menuSource(entry);
      if (src) out.push(src);
    });
    out.sort(function (a, b) { return a.root.compareDocumentPosition(b.root) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1; });
    return out;
  }

  var rows = 0;
  function addCommandRow(entry) {
    /* With a menu bar on the page, an applet's commands live in its menu
       there, so they get no row of their own. */
    if (document.querySelector('[data-menubar]')) return;
    var id = 'applet-commands-' + (++rows);
    var row = document.createElement('div');
    row.className = 'applet-commands';
    var menu = document.createElement('div');
    menu.className = 'menu';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm menu-btn';
    btn.setAttribute('popovertarget', id);
    var gear = document.createElement('span');
    gear.className = 'glyph';
    gear.style.setProperty('--glyph', 'var(--glyph-gear)');
    gear.setAttribute('aria-hidden', 'true');
    btn.appendChild(gear);
    btn.appendChild(document.createTextNode(' ' + (entry.root.getAttribute('data-applet-text-commands') || 'Commands')));
    var panel = document.createElement('div');
    panel.className = 'menu-panel';
    panel.id = id;
    panel.setAttribute('popover', '');
    var shown = [];
    panel.addEventListener('beforetoggle', function (e) {
      if (e.newState !== 'open') return;
      shown = commandsOf(entry);
      panel.textContent = '';
      shown.forEach(function (c, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'menu-action';
        b.textContent = c.label;
        b.setAttribute('data-applet-cmd', String(i));
        if (c.checked != null) b.setAttribute('aria-pressed', c.checked ? 'true' : 'false');
        if (c.disabled) b.disabled = true;
        panel.appendChild(b);
      });
      if (!shown.length) {
        var none = document.createElement('p');
        none.className = 'menu-empty';
        none.textContent = entry.root.getAttribute('data-applet-text-no-commands') || 'No commands just now';
        panel.appendChild(none);
      }
    });
    panel.addEventListener('click', function (e) {
      var b = e.target.closest('[data-applet-cmd]');
      if (!b || b.disabled) return;
      var c = shown[+b.getAttribute('data-applet-cmd')];
      if (c) c.run();
    });
    menu.appendChild(btn);
    menu.appendChild(panel);
    row.appendChild(menu);
    entry.root.parentNode.insertBefore(row, entry.root);
    entry.row = row;
  }

  /* === Requests ============================================================
     An applet may declare in define() the requests it serves, and how many
     windows of it may be open at once:

       handles: { verb: { param, kinds, extra, reuse } }, instances: n

     A caller asks with request(verb, { path, kind, ...extra }, from), and
     never names an applet; can(verb, kind) says whether anything would
     answer. The verbs and kinds are the project's own words, which PUDL
     only routes. The first applet defined that serves the verb, and the
     kind if it lists kinds, answers, with the state param=path, followed
     by any extra parameters the request carries.

     On a page with windows, the request goes to the newest open instance,
     whose window comes forward and whose setState() takes the state; or,
     with none open, or when the verb says reuse: false, to a new instance
     in a new window while fewer than instances of them are open (keys name,
     name-2 and so on, to name-9), which takes the state as it starts. On a
     page without windows, the browser goes to the applet's page with the
     state as its query, in a new tab when that page is this one. */

  var handed = {};         // window key -> states requests left, in order, for an instance still on its way
  var MAX_INSTANCES = 9;

  /* The key an applet's instance goes by: its window's, or in no window,
     the applet's name. */
  function instanceKey(root, name) {
    var win = root.closest('.win[data-win]');
    return win ? win.getAttribute('data-win') : name;
  }

  function handlerFor(verb, kind) {
    var names = Object.keys(defs);
    for (var i = 0; i < names.length; i++) {
      var d = defs[names[i]];
      var h = d.handles && Object.prototype.hasOwnProperty.call(d.handles, verb) ? d.handles[verb] : null;
      if (!h) continue;
      if (kind && h.kinds && h.kinds.indexOf(kind) < 0) continue;
      return { name: names[i], h: h, def: d };
    }
    return null;
  }

  /* The request as a state string, with a path's slashes and tildes left
     readable. */
  function stateOf(h, req) {
    var pairs = [[h.param, req.path]];
    (h.extra || []).forEach(function (k) { pairs.push([k, req[k]]); });
    return pairs.filter(function (p) { return p[0] && p[1] != null && p[1] !== ''; }).map(function (p) {
      return encodeURIComponent(p[0]) + '=' + encodeURIComponent(p[1]).replace(/%2F/g, '/').replace(/%7E/g, '~');
    }).join('&');
  }

  /* The keys of the applet's windows, in the order they opened: the open
     windows that hold a mount of it, found by the mount rather than by the
     key, so an unrelated window keyed like an instance is never taken for
     one, and the windows a request has opened that are still on their way. */
  function instanceKeys(name) {
    var open = window.pudlWindows.state().open;
    var arriving = Object.keys(handed).filter(function (k) {
      return open.indexOf(k) < 0 && (k === name || k.indexOf(name + '-') === 0);
    });
    return open.filter(function (k) {
      if (Object.prototype.hasOwnProperty.call(handed, k)) return true;
      var win = document.querySelector('.win[data-win="' + k + '"]');
      return !!(win && Array.prototype.some.call(win.querySelectorAll('[data-applet]'), function (m) {
        return m.getAttribute('data-applet') === name;
      }));
    }).concat(arriving);
  }

  /* The first key of name, name-2 … name-9 that no window holds. The limit
     counts the applet's own windows, not the numbers, so a key an
     unrelated window already holds is passed over rather than counted. */
  function freeKey(name) {
    var taken = window.pudlWindows.state().open;
    for (var n = 1; n <= MAX_INSTANCES; n++) {
      var k = n === 1 ? name : name + '-' + n;
      if (taken.indexOf(k) < 0 && !Object.prototype.hasOwnProperty.call(handed, k)) return k;
    }
    return null;
  }

  function deliver(key, name, state) {
    window.pudlWindows.raise(key);
    var entry = running.find(function (x) {
      return x.name === name && x.root.isConnected && instanceKey(x.root, name) === key;
    });
    if (entry && entry.instance && entry.instance.setState) entry.instance.setState(state);
    else (handed[key] = handed[key] || []).push(state);
  }

  function request(verb, req, from) {
    req = req || {};
    var found = handlerFor(verb, req.kind);
    if (!found) return false;
    var state = stateOf(found.h, req);

    if (!(window.pudlWindows && document.querySelector('[data-win-layer]'))) {
      var page = found.def.page;
      if (!page || !sameOrigin(page)) return false;
      var url = page + (state ? (page.indexOf('?') < 0 ? '?' : '&') + state : '');
      if (samePage(page)) window.open(url, '_blank', 'noopener');
      else location.assign(url);
      return true;
    }

    var mine = instanceKeys(found.name);
    if (found.h.reuse === false || !mine.length) {
      var limit = Math.min(found.def.instances || 1, MAX_INSTANCES);
      var key = mine.length < limit ? freeKey(found.name) : null;
      if (key) {
        handed[key] = [state];
        window.pudlWindows.open(key, from || null);
        return true;
      }
    }
    deliver(mine[mine.length - 1], found.name, state);
    return true;
  }

  function can(verb, kind) { return !!handlerFor(verb, kind); }

  /* A window a request was opening that closed, or never arrived, takes
     its handed state with it. */
  document.addEventListener('pudl:window-close', function (e) {
    delete handed[e.detail && e.detail.key];
  });

  /* Merged into what is there, so pudl-actions.js may load either side. */
  window.pudlApplets = Object.assign(window.pudlApplets || {}, { define: define, register: register, boot: boot, destroy: destroy, request: request, can: can,
                         commandsIn: commandsIn, menuSourceIn: menuSourceIn, residentSources: residentSources,started: started, start: startWindow,
                         /* What each define() said, for pudl-actions.js: { name: { actions, handles, page, ver } }. */
                         definitions: function () {
                           var out = {};
                           Object.keys(defs).forEach(function (n) {
                             var d = defs[n];
                             out[n] = { actions: d.actions || null, handles: d.handles || null, page: d.page || null, ver: d.ver || null, title: d.title || null };
                           });
                           return out;
                         } });

  /* A mount with data-applet-param keeps its state in the page's query. */
  document.addEventListener('pudl:applet-change', function (e) {
    var root = e.target;
    var entry = running.find(function (x) { return x.root === root; });
    if (!entry || !entry.param) return;
    entry.last = e.detail && e.detail.state != null ? e.detail.state : null;
    writeParam(entry.param, entry.last);
  });

  /* Back and Forward hand such an applet the state the address now holds. */
  window.addEventListener('popstate', function () {
    running.forEach(function (entry) {
      if (!entry.param || !entry.root.isConnected) return;
      var now = readParam(entry.param);
      if (now === entry.last) return;
      entry.last = now;
      if (entry.instance && entry.instance.setState) entry.instance.setState(now);
    });
  });

  /* The instance a preset link sets up: one of its applet in the same
     window as the link, or like the link in none, the nearest before the
     link, else the first after it. */
  function presetTarget(link) {
    var name = link.getAttribute('data-applet-preset');
    var win = link.closest('.win');
    var pool = running.filter(function (x) {
      return x.name === name && x.root.isConnected && x.instance && x.instance.setState && x.root.closest('.win') === win;
    });
    var before = pool.filter(function (x) { return x.root.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING; });
    return before.length ? before[before.length - 1] : pool[0] || null;
  }

  /* Caught on the way down, so that no other script, such as regions,
     treats the click as a navigation first. */
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var link = e.target.closest && e.target.closest('a[data-applet-preset][href]');
    if (!link) return;
    var entry = presetTarget(link);
    if (!entry) return;
    var url = new URL(link.href);
    if (url.origin !== location.origin) return;
    var s = entry.param && url.searchParams.has(entry.param) ? url.searchParams.get(entry.param) : url.search.replace(/^\?/, '');
    e.preventDefault();
    if (entry.param) {
      entry.last = s;
      writeParam(entry.param, s, true);
    } else if (entry.ownsUrl && samePage(url.href)) {
      history.pushState(null, '', url.pathname + url.search + url.hash);
    }
    entry.instance.setState(s);
  }, true);

  document.addEventListener('pudl:window-open', function (e) { boot(e.target); });
  document.addEventListener('pudl:window-close', function (e) { destroy(e.target); });
  /* A swapped region takes its applets with it and brings its own. */
  document.addEventListener('pudl:regions-swap', function () { destroy(); boot(document); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { boot(document); });
  else boot(document);
})();
