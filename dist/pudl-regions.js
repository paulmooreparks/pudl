/* PUDL regions. Load with defer. A navigation that changes only part of a
   page, such as a category tab or a filter, replaces only that part, and
   leaves the rest of the page alone: open windows keep their scroll
   positions and running applets keep running.

   A project marks the parts a navigation may replace:

     <nav class="app-section-bar" data-region="sections">…</nav>
     <nav class="md-sidebar" data-region="list">…</nav>

   A plain click on a same-origin link inside a region, or a GET form
   submitted inside one, fetches the target page exactly as the browser
   would. If that page has a region of every name this page has, and the
   same window layer, each region is replaced by its counterpart and the
   address is pushed, carrying the open windows, which stay where they
   are. The target may be another path, such as a page per category. Otherwise the browser navigates as it always would, so
   the worst case is an ordinary page load. Back and Forward swap the
   regions again when the part of the address they depend on has changed.

   The server renders what the address names, so the page fetched for an
   address is the page a bookmark of it would show; the script asks the
   server for nothing special.

   A same-page link inside a region carries the open windows in its address
   (the open, top, min and p.* parameters), and the script keeps those up to
   date as the windows change, so a middle-click or a copied link carries
   the windows as they are, not as they were when the page loaded.

   After a swap, pudl:regions-swap fires on the document. */
(function () {
  'use strict';

  var busy = null;          // AbortController of the fetch in flight
  var listPart = '';        // the address without window parameters, as the regions show it

  function isWinParam(name) {
    return name === 'open' || name === 'top' || name === 'min' || name.indexOf('p.') === 0;
  }

  /* The raw window parameters in the current address. pudl-windows.js writes
     them unescaped, and they are copied as written so addresses stay
     readable. */
  function liveWindowParams() {
    return location.search.replace(/^\?/, '').split('&').filter(function (seg) {
      if (!seg) return false;
      var name = seg.split('=')[0];
      try { name = decodeURIComponent(name); } catch (e) { /* leave as is */ }
      return isWinParam(name);
    });
  }

  /* An address with its own window parameters replaced by the live ones. */
  function withLiveWindows(url) {
    var q = new URLSearchParams(url.search);
    Array.from(q.keys()).forEach(function (k) { if (isWinParam(k)) q.delete(k); });
    var parts = [];
    var rest = q.toString();
    if (rest) parts.push(rest);
    parts = parts.concat(liveWindowParams());
    return url.pathname + (parts.length ? '?' + parts.join('&') : '') + url.hash;
  }

  function withoutWindows(url) {
    var q = new URLSearchParams(url.search);
    Array.from(q.keys()).forEach(function (k) { if (isWinParam(k)) q.delete(k); });
    q.sort();
    return url.pathname + '?' + q.toString();
  }

  function regionsIn(doc) {
    var map = {};
    doc.querySelectorAll('[data-region]').forEach(function (el) { map[el.getAttribute('data-region')] = el; });
    return map;
  }

  function layerSrc(doc) {
    var l = doc.querySelector('[data-win-layer]');
    return l ? l.getAttribute('data-win-src') || '' : null;
  }

  /* === Swapping ========================================================== */

  /* Fetches the page for a target and swaps in its regions. The target is
     the address the link or form named. On the same path it is fetched with
     the live windows, since that is the page it names; on another path it
     is fetched as named, and if it proves compatible the pushed address
     carries the live windows, because they stay on screen. */
  function swap(target, push) {
    var current = regionsIn(document);
    var names = Object.keys(current);
    var parsed = new URL(target, location.href);
    var url = parsed.pathname === location.pathname ? withLiveWindows(parsed) : parsed.pathname + parsed.search + parsed.hash;
    var shown = withLiveWindows(parsed);
    if (!names.length) { location.assign(url); return; }

    if (busy) busy.abort();
    var ctl = busy = new AbortController();
    names.forEach(function (n) { current[n].setAttribute('aria-busy', 'true'); });

    fetch(url, { credentials: 'same-origin', headers: { Accept: 'text/html' }, signal: ctl.signal })
      .then(function (r) {
        var type = r.headers.get('content-type') || '';
        if (!r.ok || type.indexOf('text/html') < 0) throw new Error('not a page');
        return r.text();
      })
      .then(function (html) {
        if (ctl !== busy) return;
        busy = null;
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var next = regionsIn(doc);
        var fits = names.every(function (n) { return next[n]; }) && layerSrc(doc) === layerSrc(document);
        if (!fits) { location.assign(url); return; }

        var active = document.activeElement;
        var focusIn = null;
        names.forEach(function (n) { if (current[n].contains(active)) focusIn = n; });
        var focusId = active && active.id;
        var focusHref = active && active.getAttribute && active.getAttribute('href');

        names.forEach(function (n) {
          var fresh = document.importNode(next[n], true);
          current[n].replaceWith(fresh);
        });
        if (doc.title) document.title = doc.title;
        if (push) history.pushState(history.state, '', shown);
        listPart = withoutWindows(new URL(location.href));

        if (focusIn) restoreFocus(regionsIn(document)[focusIn], focusId, focusHref);
        refreshLinks();
        document.dispatchEvent(new CustomEvent('pudl:regions-swap', { detail: { url: url, regions: names } }));
      })
      .catch(function (err) {
        if (err && err.name === 'AbortError') return;
        busy = null;
        names.forEach(function (n) { if (current[n].isConnected) current[n].removeAttribute('aria-busy'); });
        location.assign(url);
      });
  }

  /* Focus goes back where it was, as near as the new region allows: the
     element with the same id, else the link to the same address, window
     parameters aside, else the region itself. */
  function restoreFocus(region, id, href) {
    var want = null;
    try { want = href ? withoutWindows(new URL(href, location.href)) : null; } catch (e) { want = null; }
    var same = want && Array.prototype.find.call(region.querySelectorAll('a[href]'), function (a) {
      return withoutWindows(new URL(a.href)) === want;
    });
    var target = (id && region.querySelector('#' + CSS.escape(id))) || same;
    if (!target) {
      target = region;
      if (!region.hasAttribute('tabindex')) region.setAttribute('tabindex', '-1');
    }
    target.focus({ preventScroll: true });
  }

  /* === Keeping links current ============================================= */

  /* Same-page links inside regions carry the live windows, and so do the
     window fields a server renders into a region's GET forms. */
  function refreshLinks() {
    var here = location.pathname;
    document.querySelectorAll('[data-region] a[href]').forEach(function (a) {
      if (a.hasAttribute('data-win-open')) return;
      var url;
      try { url = new URL(a.getAttribute('href'), location.href); } catch (e) { return; }
      if (url.origin !== location.origin || url.pathname !== here) return;
      a.setAttribute('href', withLiveWindows(url));
    });
    var live = new URLSearchParams(liveWindowParams().join('&'));
    document.querySelectorAll('[data-region] form').forEach(function (f) {
      if ((f.getAttribute('method') || 'get').toLowerCase() !== 'get') return;
      var hidden = Array.prototype.filter.call(f.querySelectorAll('input[type="hidden"]'), function (i) {
        return isWinParam(i.name);
      });
      if (!hidden.length) return;
      hidden.forEach(function (i) { i.remove(); });
      live.forEach(function (v, k) {
        var i = document.createElement('input');
        i.type = 'hidden'; i.name = k; i.value = v;
        f.appendChild(i);
      });
    });
  }

  /* === Events ============================================================ */

  function plainClick(e) {
    return e.button === 0 && !e.defaultPrevented && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
  }

  document.addEventListener('click', function (e) {
    if (!plainClick(e)) return;
    var a = e.target.closest && e.target.closest('[data-region] a[href]');
    if (!a) return;
    /* Links that act on windows or menus belong to those scripts, and links
       meant for another tab or a download to the browser. */
    if (a.matches('[data-win-open], [data-win-tab], [data-win-back], [data-win-action], [target]:not([target="_self"]), [download]')) return;
    if (a.closest('.menu-panel')) return;
    var url = new URL(a.href);
    if (url.origin !== location.origin) return;
    /* A link to what the regions already show would reload the page and
       every window with it, for nothing, so it does nothing; a link to a
       fragment of it is left to the browser, which only scrolls. */
    if (withoutWindows(url) === listPart) {
      if (!url.hash) e.preventDefault();
      return;
    }
    e.preventDefault();
    swap(url.pathname + url.search + url.hash, true);
  });

  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (e.defaultPrevented || !f.closest || !f.closest('[data-region]')) return;
    var method = ((e.submitter && e.submitter.getAttribute('formmethod')) || f.getAttribute('method') || 'get').toLowerCase();
    if (method !== 'get') return;
    var action = (e.submitter && e.submitter.getAttribute('formaction')) || f.getAttribute('action') || location.href;
    var url = new URL(action, location.href);
    if (url.origin !== location.origin) return;
    var data = new FormData(f, e.submitter || null);
    var q = new URLSearchParams();
    data.forEach(function (v, k) { if (typeof v === 'string' && !isWinParam(k)) q.append(k, v); });
    url.search = q.toString();
    e.preventDefault();
    swap(url.pathname + url.search, true);
  });

  /* Back and Forward: the windows module puts the windows right, and this
     puts the regions right when the part of the address they show has
     changed. */
  window.addEventListener('popstate', function () {
    var now = withoutWindows(new URL(location.href));
    if (now === listPart) return;
    swap(location.pathname + location.search + location.hash, false);
  });

  document.addEventListener('pudl:windows-change', refreshLinks);

  function init() {
    listPart = withoutWindows(new URL(location.href));
    refreshLinks();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
