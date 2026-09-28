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

   ver is added to src and css as ?v=, so a new version is one edit. A mount
   may still carry data-applet-src, -css and -page, and each one it carries
   wins over the registry. The order of loading does not matter: a mount
   that meets an undefined name waits for its define().

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
     state    the state the host kept for it, a string, or null;
     changed  a function the applet calls, with its state string, when the
              state changes; it fires pudl:applet-change on the mount.

   The instance may also have state(), returning a string, and
   setState(s), taking one. PUDL keeps no applet state, with one opt-in: a
   mount outside a window with data-applet-param="name" has its state kept
   in the page's query under that name, replaced rather than pushed, so an
   applet embedded in an article can be shared by the article's address.
   Back and Forward hand a changed value to setState(). Any other host
   listens for pudl:applet-change and keeps the state where it likes.

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
  var running = [];        // { root, instance, param, last, fitSet }

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

  /* Where a mount's files are: each attribute it carries, else the
     registry's entry, with the registry's version on the registry's URLs. */
  function config(root) {
    var name = root.getAttribute('data-applet');
    var d = defs[name] || {};
    function pick(attr, key) {
      return root.hasAttribute(attr) ? root.getAttribute(attr) : versioned(d[key], d.ver);
    }
    return { name: name, src: pick('data-applet-src', 'src'), css: pick('data-applet-css', 'css'),
             page: root.getAttribute('data-applet-page') || d.page || null };
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
  }

  /* The script's promise, checked for having registered the name. */
  function loaded(name, src) {
    return ensureScript(src).then(function () {
      if (registry[name]) return registry[name];
      throw new Error(src + ' did not register an applet named ' + name);
    });
  }

  /* The applet's definition: at once if it is registered, after its script
     has loaded if the mount knows the script, or else whenever it is
     registered, by a define() naming its script or by a script the page
     loads itself. */
  function definition(name, src) {
    if (registry[name]) return Promise.resolve(registry[name]);
    if (src) return loaded(name, src);
    return new Promise(function (resolve) {
      (waiting[name] = waiting[name] || []).push(resolve);
    });
  }

  function define(name, cfg) {
    defs[name] = cfg || {};
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
  function writeParam(name, value) {
    var segs = location.search.replace(/^\?/, '').split('&').filter(function (seg) {
      if (!seg) return false;
      var k = seg.split('=')[0];
      try { k = decodeURIComponent(k.replace(/\+/g, ' ')); } catch (e) { /* leave as is */ }
      return k !== name;
    });
    if (value !== null && value !== '') segs.push(encodeURIComponent(name) + '=' + encodeURIComponent(value));
    var url = location.pathname + (segs.length ? '?' + segs.join('&') : '') + location.hash;
    if (url !== location.pathname + location.search + location.hash) history.replaceState(history.state, '', url);
  }

  /* === Starting and stopping ============================================== */

  function launch(root, def, c) {
    /* The window or region may have gone while the script was on its way. */
    if (!root.isConnected) return;
    var inWindow = !!root.closest('.win');
    var fit = root.getAttribute('data-applet-fit');
    var fitSet = false;
    if (fit !== 'fill' && fit !== 'flow') {
      fit = inWindow ? 'fill' : 'flow';
      root.setAttribute('data-applet-fit', fit);
      fitSet = true;
    }
    var param = inWindow ? null : root.getAttribute('data-applet-param');
    var pageUrl = c.page || location.pathname;
    var entry = { root: root, instance: null, param: param, last: param ? readParam(param) : null, fitSet: fitSet };
    var instance = def.init(root, {
      host: inWindow ? 'window' : 'page',
      fit: fit,
      ownsUrl: !inWindow && !param && samePage(pageUrl),
      pageUrl: pageUrl,
      state: entry.last,
      changed: function (s) {
        if (s === undefined && entry.instance && entry.instance.state) s = entry.instance.state();
        root.dispatchEvent(new CustomEvent('pudl:applet-change', { bubbles: true, detail: { state: s == null ? null : String(s) } }));
      }
    });
    entry.instance = instance || null;
    running.push(entry);
    root.setAttribute('data-applet-state', 'running');
  }

  function start(root) {
    root.setAttribute('data-applet-state', 'loading');
    var c = config(root);
    ensureCss(c.css);
    if (!c.src && !registry[c.name]) (unresolved[c.name] = unresolved[c.name] || []).push(root);
    definition(c.name, c.src).then(function (def) {
      if (root.getAttribute('data-applet-state') !== 'loading') return;
      launch(root, def, config(root));
    }).catch(function (err) { fail(root, err); });
  }

  function boot(scope) {
    (scope || document).querySelectorAll('[data-applet]:not([data-applet-state])').forEach(start);
    if (scope && scope.matches && scope.matches('[data-applet]:not([data-applet-state])')) start(scope);
  }

  /* Destroys the applets inside scope, or with no scope, those whose mount
     has left the document. */
  function destroy(scope) {
    running = running.filter(function (entry) {
      var inside = scope ? (scope === entry.root || scope.contains(entry.root)) : !entry.root.isConnected;
      if (!inside) return true;
      try { if (entry.instance && entry.instance.destroy) entry.instance.destroy(); }
      catch (err) { if (window.console) console.warn('pudl-applets:', err); }
      entry.root.removeAttribute('data-applet-state');
      if (entry.fitSet) entry.root.removeAttribute('data-applet-fit');
      return false;
    });
  }

  window.pudlApplets = { define: define, register: register, boot: boot, destroy: destroy };

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

  document.addEventListener('pudl:window-open', function (e) { boot(e.target); });
  document.addEventListener('pudl:window-close', function (e) { destroy(e.target); });
  /* A swapped region takes its applets with it and brings its own. */
  document.addEventListener('pudl:regions-swap', function () { destroy(); boot(document); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { boot(document); });
  else boot(document);
})();
