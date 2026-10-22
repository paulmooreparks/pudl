/* PUDL applet actions (preview, docs/proposals/applet-actions.md). Load
   with defer, after pudl-applets.js. An applet publishes actions, which a
   script, the page, a command or an agent calls by reference, with input
   and output checked against their schemas, without opening the applet's
   window unless the action is about a window.

   An applet's define() names its manifest:

     pudlApplets.define('dice', { src: '/js/dice.js', ver: '3', actions: '/js/dice-actions.json' });

     { "id": "example.dice", "version": "1.0.0", "apiVersion": 1,
       "title": "Dice", "description": "…",
       "module": "dice-actions.js",     optional, beside the manifest
       "actions": [ { "ref": "example.dice/roll@1", "title", "description",
                      "inputSchema", "outputSchema",
                      "capabilities": [], "replay": "pure",
                      "handles": "open",   optional: a handles verb, below
                      "live": true } ] }   optional: run by the open applet

   pudlApplets.publish(url) adds a manifest that belongs to no applet, such
   as the page's own actions. The manifest is stamped with the applet's
   ver, as its script is.

   replay says what running again means. "pure": no effect beyond its
   result, so it may run anywhere and any number of times. "once": it has
   effects, so a host never runs it again unasked; a caller that may retry
   passes opts.id, and a second call with that id returns the first record.
   "human": it asks a person a question, in a dialog, and waits.

   The module hands its handlers over:

     pudlApplets.provide('example.dice', { 'roll@1': function (input, ctx) { return { output: { … } }; } });

   A handler resolves to { output, artifacts, request }: output an object;
   artifacts, with artifact.create, a list of { key, name, mime, data },
   each put into the output under its key as a descriptor; request, with
   attention.request and replay "human", a question { title, body, fields:
   [{ name, label, type: text|boolean|choice, required, choices }] }, whose
   answer becomes output.response. ctx is the invocation (invocation,
   owner, signal, beside(rel), load(src)) and only the services the action
   declared: open(verb, request) with window.open, notify(text, kind) with
   notification.post, and whatever the project gives its own capabilities.

   An action marked live is answered by the applet that is running: it
   attaches handlers as it starts, pudlApplets.attach(id, handlers), which
   returns the function that detaches them, and the broker hands the call
   to the newest. A module's handler may do the same by hand with
   pudlApplets.attached(id, ms).

   Requests are actions. An action with handles is one of the applet's
   handles verbs, answered by bringing its window, as pudlApplets.request
   does, or on a page without windows its page in a new tab, so an action
   never navigates the page that called it. Every handles verb an applet
   declares without such an action is published for it as <applet>/<verb>@1.

   Capabilities are a closed list. PUDL's are artifact.create,
   attention.request, notification.post and window.open; a project adds its
   own with pudlApplets.capability(name, give), where give(ctx, record)
   returns the services the handler gets, such as { files: … }. A manifest
   naming any other is refused. A caller passes opts.grant, the
   capabilities it holds, or "all"; with none it holds artifact.create
   alone. For an action needing more, a host may set pudlApplets.confirm,
   a function given { action, missing, owner } that resolves true to let it
   run, so a person decides what an agent may do for them.

   Calling:
     pudlApplets.catalog()                 the manifests, as callers see them
     pudlApplets.describe(ref)             one action
     pudlApplets.run(ref, input, opts)     its output, or an error saying why not
     pudlApplets.invoke(ref, input, opts)  its record, once done, failed,
                                           cancelled or waiting for a person
     pudlApplets.status(id), wait(id), cancel(id), artifact(id), invocations()
     pudlApplets.problems()                manifests that were refused, and why
   opts: id, owner { kind, id }, grant, runMs (60 s), answerMs (10 min).
   pudl:applet-invocation fires on the document as each record changes.

   window.pudlActions is the same functions under an earlier name, which
   the applet package format also used. It is deprecated, says so once in
   the console, and goes at PUDL 1.0. */
(function () {
  'use strict';
  if (window.pudlApplets && window.pudlApplets.invoke) return;

  var PROVIDER_ID = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
  var RECORD_ID = /^[A-Za-z0-9_-]{1,128}$/;
  var KEEP = 200;
  var RUN_MS = 60000, ANSWER_MS = 10 * 60000;

  var here = document.currentScript ? document.currentScript.src : location.href;
  function beside(rel, base) { return new URL(rel, base || here).href; }
  /* A PUDL script this one loads sits beside it, minified in dist/min/ when
     this one is (0.73.0), and the vendored library is in dist/vendor/,
     one folder up from the minified copies. */
  var MIN = /\/min\/[^/]+\.js$/.test(new URL(here).pathname);
  function sibling(name) { return beside(name + '.js'); }
  function vendored(rel) { return beside((MIN ? '../' : '') + 'vendor/' + rel); }
  var C = null;   // pudlActionsCore, once validatorLib() has loaded it

  /* === Loading ============================================================ */

  var scripts = {};
  function loadScript(src) {
    if (!scripts[src]) {
      scripts[src] = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = src;
        s.onload = function () { resolve(); };
        s.onerror = function () { delete scripts[src]; reject(new Error('could not load ' + src)); };
        document.head.appendChild(s);
      });
    }
    return scripts[src];
  }

  /* The shared rules, stamped as this file is, then the schema library. */
  var schemaLib = null;
  function validatorLib() {
    if (!schemaLib) {
      schemaLib = (window.pudlActionsCore ? Promise.resolve() : loadScript(sibling('pudl-actions-core') + new URL(here).search))
        .then(function () {
          C = window.pudlActionsCore;
          return import(vendored('cfworker-json-schema-4.1.1/index.js'));
        })
        .catch(function (err) {
          schemaLib = null;
          throw new Error('the schema validator could not be loaded (' + err.message + ')');
        });
    }
    return schemaLib;
  }

  /* === Capabilities ======================================================= */

  var services = {};   // a project's capability -> give(ctx, rec)
  function capabilityList() { return (C ? C.CAPABILITIES : []).concat(Object.keys(services)); }
  function capability(name, give) {
    if (!/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/.test(name || '')) throw new Error('a capability is a dotted name, such as files.read');
    services[name] = typeof give === 'function' ? give : function () { return {}; };
    catalogReady = null;
  }

  /* === The catalog ======================================================== */

  var published = [];        // manifests no applet owns
  var catalogReady = null;
  var providers = {};        // provider id -> handlers its module gave
  var providerWaits = {};

  function sources() {
    var defs = window.pudlApplets && window.pudlApplets.definitions ? window.pudlApplets.definitions() : {};
    var out = Object.keys(defs).filter(function (n) { return defs[n].actions || defs[n].handles; }).map(function (n) {
      var d = defs[n];
      return { applet: n, title: d.title || n,
               manifest: d.actions ? d.actions + (d.ver ? (d.actions.indexOf('?') < 0 ? '?' : '&') + 'v=' + encodeURIComponent(d.ver) : '') : null,
               handles: d.handles || null, page: d.page || null };
    });
    return out.concat(published.map(function (url) { return { applet: null, manifest: url, handles: null, page: null }; }));
  }

  function load() {
    if (!catalogReady) {
      var list = sources();
      catalogReady = Promise.all([validatorLib()].concat(list.map(function (s) {
        if (!s.manifest) return Promise.resolve({ source: s, manifest: null });
        return fetch(s.manifest, { credentials: 'same-origin' }).then(function (r) {
          if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
          return r.json();
        }).then(function (m) { return { source: s, manifest: m }; }, function (err) {
          return { source: s, error: (s.applet || s.manifest) + ': the manifest could not be read (' + err.message + ')' };
        });
      }))).then(function (all) {
        return build(all[0], all.slice(1));
      }, function (err) { catalogReady = null; throw err; });
    }
    return catalogReady;
  }

  /* The action a handles verb is, for an applet whose manifest does not
     already make one of it. */
  function requestManifest(source, id, verbs) {
    return {
      id: id, version: '1.0.0', apiVersion: 1, title: source.title,
      description: 'What ' + source.title + ' opens when it is asked.',
      actions: verbs.map(function (verb) {
        var h = source.handles[verb], props = { path: { type: 'string', description: 'What to ' + verb + ', in ' + (h.param || 'its') + '.' } };
        if (h.kinds && h.kinds.length) props.kind = { type: 'string', enum: h.kinds.slice() };
        (h.extra || []).forEach(function (k) { props[k] = { type: 'string' }; });
        return {
          ref: id + '/' + verb + '@1', title: verb.charAt(0).toUpperCase() + verb.slice(1) + ' in ' + source.title,
          description: 'Asks ' + source.title + ' to ' + verb + ' something, which brings its window, or its page in a new tab.',
          inputSchema: { type: 'object', properties: props, additionalProperties: false },
          outputSchema: { type: 'object', required: ['opened'], properties: { opened: { const: true }, view: { enum: ['window', 'tab'] } } },
          capabilities: ['window.open'], replay: 'once', handles: verb
        };
      })
    };
  }

  function build(lib, loaded) {
    var state = { manifests: [], actions: {}, problems: [] };
    var ids = {}, caps = capabilityList();
    function add(source, m) {
      var entries = C.checkManifest(lib, m, ids, function (verb) { return !!(source.handles && source.handles[verb]); }, caps);
      ids[m.id] = true;
      entries.forEach(function (e) { e.source = source; state.actions[e.action.ref] = e; });
      state.manifests.push(C.publicManifest(m));
    }
    loaded.forEach(function (l) {
      if (l.error) { state.problems.push(l.error); return; }
      var s = l.source, covered = {};
      if (l.manifest) {
        try {
          add(s, l.manifest);
          (l.manifest.actions || []).forEach(function (a) { if (a.handles) covered[a.handles] = true; });
        } catch (err) {
          state.problems.push((l.manifest && l.manifest.id || s.applet || s.manifest) + ': ' + err.message);
        }
      }
      var verbs = Object.keys(s.handles || {}).filter(function (v) { return !covered[v] && /^[a-z][a-z0-9-]*$/.test(v); });
      if (s.applet && verbs.length) {
        var id = ids[s.applet] ? s.applet + '.requests' : s.applet;
        try { add(s, requestManifest(s, id, verbs)); }
        catch (err) { state.problems.push(s.applet + '\'s requests: ' + err.message); }
      }
    });
    return state;
  }

  function invalidate() { catalogReady = null; }
  document.addEventListener('pudl:applet-define', invalidate);

  function publish(url) {
    if (published.indexOf(url) < 0) published.push(url);
    invalidate();
  }

  function provide(id, handlers) {
    if (!PROVIDER_ID.test(id || '') || !handlers || typeof handlers !== 'object') throw new Error('provide needs a provider id and its handlers');
    providers[id] = handlers;
    (providerWaits[id] || []).forEach(function (w) { w(); });
    delete providerWaits[id];
  }

  /* === Live handlers ======================================================
     An action on an applet's open window is run by the applet itself: while
     it runs it attaches handlers for those actions, and detaches them as it
     goes. attached(id, ms) gives the newest instance's, waiting up to ms
     for one that is opening. */
  var live = {};
  var liveWaits = {};

  function attach(id, handlers) {
    if (!PROVIDER_ID.test(id || '') || !handlers || typeof handlers !== 'object') throw new Error('attach needs a provider id and its handlers');
    (live[id] = live[id] || []).push(handlers);
    (liveWaits[id] || []).forEach(function (w) { w(); });
    delete liveWaits[id];
    return function () { var at = (live[id] || []).indexOf(handlers); if (at >= 0) live[id].splice(at, 1); };
  }
  function attached(id, ms) {
    var got = function () { var l = live[id]; return l && l.length ? l[l.length - 1] : null; };
    if (got() || !ms) return Promise.resolve(got());
    return new Promise(function (resolve) { (liveWaits[id] = liveWaits[id] || []).push(resolve); setTimeout(resolve, ms); }).then(got);
  }

  function moduleUrl(e) {
    var url = new URL(e.provider.module, new URL(e.source.manifest, location.href));
    /* The module is stamped as its manifest is, so a raised ver reaches both. */
    if (!url.search) url.search = new URL(e.source.manifest, location.href).search;
    return url.href;
  }

  function handlerFor(e) {
    if (e.action.handles != null) return Promise.resolve(windowHandler(e));
    var id = e.provider.id;
    if (e.action.live) {
      return Promise.resolve(function (input, ctx) {
        return attached(id, 3000).then(function (h) {
          if (!h || typeof h[e.local] !== 'function') throw new Error('no open ' + (e.source.title || id) + ' answers ' + e.action.ref);
          return h[e.local](input, ctx);
        });
      });
    }
    var got = function () {
      var h = providers[id] && providers[id][e.local];
      if (typeof h !== 'function') throw new Error(id + '\'s module gives no handler for ' + e.local);
      return h;
    };
    if (providers[id]) return Promise.resolve().then(got);
    return loadScript(moduleUrl(e)).then(function () {
      if (providers[id]) return got();
      return new Promise(function (resolve) { (providerWaits[id] = providerWaits[id] || []).push(resolve); setTimeout(resolve, 3000); }).then(got);
    });
  }

  /* === Windows ============================================================ */

  function stateOf(h, req) {
    var pairs = [[h.param, req.path]];
    (h.extra || []).forEach(function (k) { pairs.push([k, req[k]]); });
    return pairs.filter(function (p) { return p[0] && p[1] != null && p[1] !== ''; }).map(function (p) {
      return encodeURIComponent(p[0]) + '=' + encodeURIComponent(p[1]).replace(/%2F/g, '/').replace(/%7E/g, '~');
    }).join('&');
  }

  /* On a page with windows, the window comes, as pudlApplets.request
     brings it; on one without, the applet's page opens in a new tab, so the
     page that asked is never navigated away from. */
  function openWindow(source, verb, req) {
    var h = source.handles && source.handles[verb];
    if (!h) throw new Error((source.applet || 'this applet') + ' does not handle ' + verb);
    req = Object.assign({}, req);
    if (!req.kind && h.kinds && h.kinds.length) req.kind = h.kinds[0];
    if (window.pudlWindows && document.querySelector('[data-win-layer]')) {
      if (!window.pudlApplets.request(verb, req, null)) throw new Error('nothing on this page opens it');
      return { opened: true, view: 'window' };
    }
    if (!source.page) throw new Error((source.applet || 'this applet') + ' has no page to open');
    var state = stateOf(h, req);
    var w = window.open(source.page + (state ? (source.page.indexOf('?') < 0 ? '?' : '&') + state : ''), '_blank');
    if (!w) throw new Error('the browser did not open the new tab');
    w.opener = null;
    return { opened: true, view: 'tab' };
  }

  function windowHandler(e) {
    return function (input) { return { output: openWindow(e.source, e.action.handles, input) }; };
  }

  /* === The handler's context ============================================== */

  function contextFor(rec, e, signal) {
    var caps = e.action.capabilities, base = e.provider.module && e.source.manifest ? moduleUrl(e) : here;
    var ctx = {
      invocation: rec.id, owner: rec.owner, signal: signal,
      beside: function (rel) { return beside(rel, base); },
      load: function (src) { return loadScript(beside(src, base)); }
    };
    if (caps.indexOf('window.open') >= 0) {
      ctx.open = function (verb, req) {
        var src = sources().filter(function (s) { return s.handles && s.handles[verb]; })[0];
        if (!src) throw new Error('nothing here handles ' + verb);
        return openWindow(src, verb, req || {});
      };
    }
    if (caps.indexOf('notification.post') >= 0) {
      ctx.notify = function (text, kind) {
        return (window.pudlToast ? Promise.resolve() : loadScript(sibling('pudl-toast'))).then(function () {
          window.pudlToast(String(text), { kind: kind === 'info' ? undefined : kind, sticky: kind === 'danger' || kind === 'warn' });
        });
      };
    }
    caps.forEach(function (c) {
      if (!services[c]) return;
      var given = services[c](ctx, rec) || {};
      Object.keys(given).forEach(function (k) { if (!(k in ctx)) ctx[k] = given[k]; });
    });
    return Object.freeze(ctx);
  }

  /* === Invocations ======================================================== */

  var records = new Map();

  function newId() {
    var b = new Uint8Array(16);
    crypto.getRandomValues(b);
    return Array.prototype.map.call(b, function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join('');
  }

  function view(rec) {
    return JSON.parse(JSON.stringify({
      id: rec.id, action: rec.action, owner: rec.owner, status: rec.status, version: rec.version,
      input: rec.input, output: rec.output, error: rec.error || undefined, request: rec.request || undefined,
      artifacts: rec.artifacts.map(function (a) { return a.descriptor; }),
      created: rec.created, updated: rec.updated, deadline: rec.deadline || undefined
    }));
  }

  function changed(rec) {
    rec.version++;
    rec.updated = new Date().toISOString();
    document.dispatchEvent(new CustomEvent('pudl:applet-invocation', { detail: view(rec) }));
  }

  function finish(rec, status, error) {
    if (rec.status === 'done' || rec.status === 'failed' || rec.status === 'cancelled') return;
    rec.status = status;
    if (error) rec.error = error;
    if (rec.timer) { clearTimeout(rec.timer); rec.timer = 0; }
    if (rec.dialog) { var d = rec.dialog; rec.dialog = null; if (d.open) d.close(); d.remove(); }
    changed(rec);
    rec.settle();
  }

  function keep() {
    if (records.size <= KEEP) return;
    for (var it of records) {
      var r = it[1];
      if (r.status !== 'running' && r.status !== 'waiting') { records.delete(it[0]); if (records.size <= KEEP) return; }
    }
  }

  async function sha256(bytes) {
    if (!(window.crypto && crypto.subtle)) return null;
    var d = await crypto.subtle.digest('SHA-256', bytes);
    return Array.prototype.map.call(new Uint8Array(d), function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join('');
  }

  async function describeData(data) {
    var bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data instanceof ArrayBuffer ? new Uint8Array(data) : data instanceof Uint8Array ? data : null;
    if (!bytes) return null;
    return { size: bytes.length, sha256: await sha256(bytes), keep: typeof data === 'string' ? data : bytes };
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* A question for the person, as a dialog only they can answer. */
  function ask(rec, q) {
    return new Promise(function (resolve) {
      var dlg = document.createElement('dialog'), id = 'applet-ask-' + rec.id;
      dlg.className = 'dialog applet-ask';
      dlg.setAttribute('aria-labelledby', id + '-title');
      dlg.innerHTML =
        '<form method="dialog">' +
          '<h3 class="dialog-title" id="' + id + '-title">' + esc(q.title) + '</h3>' +
          '<div class="dialog-body">' +
            (q.body ? '<p>' + esc(q.body) + '</p>' : '') +
            q.fields.map(function (f, i) {
              var fid = id + '-' + i, label = esc(f.label || f.name);
              if (f.type === 'boolean') return '<div class="form-group"><label class="check"><input type="checkbox" name="' + esc(f.name) + '"> ' + label + '</label></div>';
              if (f.type === 'choice') {
                return '<div class="form-group"><label class="form-label" for="' + fid + '">' + label + '</label>' +
                  '<span class="form-select-wrap"><select class="form-select" id="' + fid + '" name="' + esc(f.name) + '"' + (f.required ? ' required' : '') + '>' +
                  '<option value="">Choose…</option>' + f.choices.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') +
                  '</select></span></div>';
              }
              return '<div class="form-group"><label class="form-label" for="' + fid + '">' + label + '</label>' +
                '<textarea class="form-textarea" rows="2" id="' + fid + '" name="' + esc(f.name) + '"' + (f.required ? ' required' : '') + '></textarea></div>';
            }).join('') +
            '<p class="form-help">Asked by ' + esc(rec.action) + (rec.owner && rec.owner.kind ? ' for ' + esc(rec.owner.kind) : '') + '.</p>' +
          '</div>' +
          '<div class="dialog-actions">' +
            '<button type="button" class="btn" data-ask="cancel">Don\'t Answer</button>' +
            '<button type="submit" class="btn btn-primary">Answer</button>' +
          '</div>' +
        '</form>';
      document.body.appendChild(dlg);
      rec.dialog = dlg;
      var answered = false;
      dlg.querySelector('form').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var form = ev.target, response = {};
        if (!form.reportValidity()) return;
        q.fields.forEach(function (f) {
          var c = form.elements[f.name];
          response[f.name] = f.type === 'boolean' ? !!c.checked : c.value;
        });
        answered = true;
        resolve(response);
        dlg.close();
      });
      dlg.querySelector('[data-ask="cancel"]').addEventListener('click', function () { dlg.close(); });
      dlg.addEventListener('close', function () { if (!answered) resolve(null); });
      dlg.showModal();
    });
  }

  async function execute(rec, e, input) {
    var controller = new AbortController();
    rec.controller = controller;
    rec.timer = setTimeout(function () { finish(rec, 'failed', 'the action did not finish within ' + Math.round(rec.limits.run / 1000) + ' seconds'); controller.abort(); }, rec.limits.run);
    try {
      var handler = await handlerFor(e);
      if (rec.status !== 'running') return;
      var stopped = new Promise(function (resolve, reject) {
        controller.signal.addEventListener('abort', function () { reject(new Error('stopped')); });
      });
      var result = await Promise.race([Promise.resolve().then(function () { return handler(input, contextFor(rec, e, controller.signal)); }), stopped]);
      if (rec.status !== 'running') return;
      var output = await C.accept(rec, e, result, describeData);
      if (rec.status !== 'running') return;
      if (!result.request) {
        C.check(e.output, output, 'output from ' + e.action.ref);
        rec.output = output;
        finish(rec, 'done');
        return;
      }
      var q = C.checkRequest(result.request);
      clearTimeout(rec.timer);
      rec.output = output;
      rec.request = q;
      rec.status = 'waiting';
      rec.deadline = new Date(Date.now() + rec.limits.answer).toISOString();
      rec.timer = setTimeout(function () { finish(rec, 'failed', 'nobody answered in time'); }, rec.limits.answer);
      changed(rec);
      rec.waited();
      var response = await ask(rec, q);
      if (rec.status !== 'waiting') return;
      if (response == null) { finish(rec, 'cancelled', 'the question was not answered'); return; }
      output = Object.assign({}, output, { response: response });
      C.check(e.output, output, 'output from ' + e.action.ref);
      rec.output = output;
      finish(rec, 'done');
    } catch (err) {
      finish(rec, 'failed', err && err.message || String(err));
    }
  }

  function sameCall(rec, ref, input) { return rec.action === ref && JSON.stringify(rec.input) === JSON.stringify(input); }

  /* The capabilities a caller holds: its grant, "all", or by default
     artifact.create alone; and for what is missing, the host's confirm. */
  async function allowed(e, opts) {
    var grant = opts.grant === 'all' ? capabilityList() : (opts.grant || ['artifact.create']);
    var missing = e.action.capabilities.filter(function (c) { return grant.indexOf(c) < 0; });
    if (!missing.length) return;
    var confirm = window.pudlApplets && window.pudlApplets.confirm;
    if (typeof confirm === 'function') {
      var yes = await confirm({ action: C.publicAction(e.action), missing: missing.slice(), owner: opts.owner || { kind: 'page' } });
      if (yes === true) return;
      throw new Error(e.action.ref + ' needs ' + missing.join(', ') + ', which was not allowed');
    }
    throw new Error(e.action.ref + ' needs ' + missing.join(', ') + ', which this caller was not granted');
  }

  async function invoke(ref, input, opts) {
    opts = opts || {};
    var cat = await load();
    var e = cat.actions[ref];
    if (!e) throw new Error('there is no action ' + ref + (cat.problems.length ? ' (some manifests were refused; problems() says why)' : ''));
    input = C.asJSON(input == null ? {} : input, 'the input');
    C.check(e.input, input, 'input to ' + ref);
    if (opts.id != null) {
      if (!RECORD_ID.test(String(opts.id))) throw new Error('an invocation id is 1 to 128 letters, digits, - and _');
      var had = records.get(String(opts.id));
      if (had) {
        if (!sameCall(had, ref, input)) throw new Error('invocation ' + opts.id + ' was a different call');
        await had.started;
        return view(had);
      }
    }
    await allowed(e, opts);
    var now = new Date().toISOString();
    var rec = {
      id: opts.id != null ? String(opts.id) : newId(), action: ref, owner: opts.owner || { kind: 'page' },
      status: 'running', version: 0, input: input, output: null, error: '', request: null, artifacts: [],
      created: now, updated: now, deadline: null,
      limits: { run: opts.runMs || RUN_MS, answer: opts.answerMs || ANSWER_MS }
    };
    rec.done = new Promise(function (resolve) { rec.settle = resolve; });
    rec.started = new Promise(function (resolve) { rec.waited = resolve; });
    rec.done.then(rec.waited);
    records.set(rec.id, rec);
    keep();
    changed(rec);
    execute(rec, e, input);
    await rec.started;
    return view(rec);
  }

  function find(id) {
    var rec = records.get(String(id));
    if (!rec) throw new Error('there is no invocation ' + id);
    return rec;
  }

  async function wait(id) {
    var rec = find(id);
    await rec.done;
    return view(rec);
  }

  async function run(ref, input, opts) {
    var v = await invoke(ref, input, opts);
    if (v.status === 'waiting' || v.status === 'running') v = await wait(v.id);
    if (v.status !== 'done') throw new Error(ref + ' ' + (v.status === 'cancelled' ? 'was cancelled' : 'failed') + (v.error ? ': ' + v.error : ''));
    return v.output;
  }

  function cancel(id) {
    var rec = find(id);
    if (rec.status !== 'running' && rec.status !== 'waiting') return false;
    finish(rec, 'cancelled', 'cancelled');
    if (rec.controller) rec.controller.abort();
    return true;
  }

  function artifact(id) {
    var dot = String(id).lastIndexOf('.');
    var rec = find(dot > 0 ? String(id).slice(0, dot) : id);
    var a = rec.artifacts.filter(function (x) { return x.descriptor.id === String(id); })[0];
    if (!a) throw new Error('there is no artifact ' + id);
    return Object.assign({}, a.descriptor, { data: a.data });
  }

  var api = {
    actionsApiVersion: 1,
    capabilities: function () { return validatorLib().then(capabilityList); },
    capability: capability,
    catalog: function () { return load().then(function (s) { return JSON.parse(JSON.stringify(s.manifests)); }); },
    problems: function () { return load().then(function (s) { return s.problems.slice(); }); },
    describe: function (ref) {
      return load().then(function (s) {
        var e = s.actions[ref];
        if (!e) throw new Error('there is no action ' + ref);
        return C.publicAction(e.action);
      });
    },
    publish: publish,
    invoke: invoke,
    run: run,
    wait: wait,
    status: function (id) { return view(find(id)); },
    cancel: cancel,
    artifact: artifact,
    invocations: function () { return Array.from(records.values()).reverse().map(view); },
    provide: provide,
    attach: attach,
    attached: attached
  };
  window.pudlApplets = Object.assign(window.pudlApplets || {}, api);

  /* The name the first hosts used, kept until 1.0. */
  var warned = false;
  var old = {};
  Object.keys(api).forEach(function (k) {
    old[k] = typeof api[k] === 'function' ? function () {
      if (!warned && window.console) { warned = true; console.warn('pudl-actions: window.pudlActions is deprecated and goes at PUDL 1.0; use pudlApplets.' + k + ' and the rest on pudlApplets'); }
      return api[k].apply(null, arguments);
    } : api[k];
  });
  old.apiVersion = 1;
  window.pudlActions = Object.freeze(old);
  document.dispatchEvent(new CustomEvent('pudl:actions-ready'));
})();
