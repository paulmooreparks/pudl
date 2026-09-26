/* PUDL applets. Load with defer, after pudl-windows.js if the page has
   windows. An applet is interactive content that runs unchanged in a full
   page or inside a PUDL window. PUDL does not build or manage the applet;
   this script is only the handshake between the applet and its host.

   The page marks where an applet goes:

     <div class="applet" data-applet="mixer"
          data-applet-src="/js/mixer.js" data-applet-css="/css/mixer.css"
          data-applet-page="/apps/mixer"></div>

   and the applet's script registers itself:

     pudlApplets.register('mixer', {
       init: function (root, opts) { ...; return { destroy: function () {} }; }
     });

   init builds the applet inside root, finds and listens only within root,
   and returns an instance whose destroy() undoes everything it set up.
   opts.host is "page" or "window", opts.ownsUrl is true only in a page,
   where the applet may keep its state in the URL, and opts.pageUrl is the
   applet's own page, for a share link that works from anywhere.

   The runtime loads each applet's stylesheet and script once, starts the
   applets in the page when it loads, starts those in each window as it
   opens, and destroys them as the window closes. boot(scope) and
   destroy(scope) are there for content a project adds or removes by other
   means. */
(function () {
  'use strict';

  var registry = {};
  var waiting = {};        // name -> resolvers for applets whose script is still arriving
  var scripts = {};        // src -> promise of the script having run
  var running = [];        // { root, instance }

  function register(name, def) {
    registry[name] = def;
    (waiting[name] || []).forEach(function (resolve) { resolve(def); });
    delete waiting[name];
  }

  function ensureCss(href) {
    if (!href) return;
    var have = Array.prototype.some.call(document.querySelectorAll('link[rel="stylesheet"]'), function (l) {
      return l.getAttribute('href') === href;
    });
    if (have) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function ensureScript(src) {
    if (!scripts[src]) {
      scripts[src] = new Promise(function (resolve, reject) {
        var el = document.createElement('script');
        el.src = src;
        el.onload = resolve;
        el.onerror = function () { reject(new Error('could not load ' + src)); };
        document.head.appendChild(el);
      });
    }
    return scripts[src];
  }

  /* The applet's definition: at once if it is registered, otherwise after
     its script has loaded and registered it. */
  function definition(name, src) {
    if (registry[name]) return Promise.resolve(registry[name]);
    var registered = new Promise(function (resolve) {
      (waiting[name] = waiting[name] || []).push(resolve);
    });
    if (!src) return registered;
    return ensureScript(src).then(function () {
      if (registry[name]) return registry[name];
      throw new Error(src + ' did not register an applet named ' + name);
    });
  }

  function start(root) {
    var name = root.getAttribute('data-applet');
    root.setAttribute('data-applet-state', 'loading');
    ensureCss(root.getAttribute('data-applet-css'));
    definition(name, root.getAttribute('data-applet-src')).then(function (def) {
      /* The window may have closed while the script was on its way. */
      if (!root.isConnected) return;
      var inWindow = !!root.closest('.win');
      var instance = def.init(root, {
        host: inWindow ? 'window' : 'page',
        ownsUrl: !inWindow,
        pageUrl: root.getAttribute('data-applet-page') || location.pathname
      });
      running.push({ root: root, instance: instance || null });
      root.setAttribute('data-applet-state', 'running');
    }).catch(function (err) {
      root.setAttribute('data-applet-state', 'error');
      if (window.console) console.warn('pudl-applets:', err.message);
    });
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
      return false;
    });
  }

  window.pudlApplets = { register: register, boot: boot, destroy: destroy };

  document.addEventListener('pudl:window-open', function (e) { boot(e.target); });
  document.addEventListener('pudl:window-close', function (e) { destroy(e.target); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { boot(document); });
  else boot(document);
})();
