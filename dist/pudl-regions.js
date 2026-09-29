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
   are. The target may be another path, such as a page per category.
   Otherwise the browser navigates as it always would, so the worst case is
   an ordinary page load. Back and Forward swap the regions again when the
   part of the address they depend on has changed.

   A link outside every region, such as a tag or category link in an
   article in a window, does the same when it carries data-region-link, or
   sits inside an element that does:

     <div class="win-body" data-region-link>…</div>

   Without the attribute it is an ordinary link, since a window's content
   often links to pages that were never meant to be swapped in.

   The server renders what the address names, so the page fetched for an
   address is the page a bookmark of it would show; the script asks the
   server for nothing special.

   A same-page link that swaps regions carries the open windows in its address
   (the open, top, min and p.* parameters), and the script keeps those up to
   date as the windows change, so a middle-click or a copied link carries
   the windows as they are, not as they were when the page loaded.

   After a swap, pudl:regions-swap fires on the document. A page that
   renders links into its regions by script calls pudlRegions.refresh()
   afterwards, so they carry the live windows too. */
(function () {
  'use strict';

  var busy = null;          // AbortController of the fetch in flight
  var listPart = '';        // the address without window parameters, as the regions show it

  /* The links that swap regions: those inside a region, and those outside
     any that a project marks with data-region-link, on the link itself or
     on an element holding it, such as a window's body. */
  var LINKS = '[data-region] a[href], [data-region-link] a[href], a[data-region-link][href]';

  function isWinParam(name) {
    return name === 'open' || name === 'top' || name === 'min' || name.indexOf('p.') === 0;
  }

  /* The parameters that belong to what stays on screen rather than to what
     the regions show: the windows', and those of applets outside windows
     that keep their state in the page's query with data-applet-param. They
     are carried from address to address as they stand, and a change in
     them alone is no reason to fetch regions.

     Finding the applets' names walks the document, so it is done once per
     pass and the answer handed down: live() takes a snapshot of the names
     and of the live parameters in the current address, which pudl-windows.js
     writes unescaped and which are copied as written so addresses stay
     readable. */
  function live() {
    var applets = Object.create(null);
    document.querySelectorAll('[data-applet-param]').forEach(function (el) {
      if (!el.closest('.win')) applets[el.getAttribute('data-applet-param')] = true;
    });
    var isLive = function (name) { return isWinParam(name) || applets[name] === true; };
    var segs = location.search.replace(/^\?/, '').split('&').filter(function (seg) {
      if (!seg) return false;
      var name = seg.split('=')[0];
      try { name = decodeURIComponent(name); } catch (e) { /* leave as is */ }
      return isLive(name);
    });
    return { isLive: isLive, segs: segs };
  }

  /* An address with its own live parameters replaced by the current ones.
     Its other parameters are kept exactly as written, so a readable
     ?path=/notes stays readable rather than becoming %2F. */
  function withLiveWindows(url, now) {
    now = now || live();
    var parts = url.search.replace(/^\?/, '').split('&').filter(function (seg) {
      if (!seg) return false;
      var name = seg.split('=')[0];
      try { name = decodeURIComponent(name.replace(/\+/g, ' ')); } catch (e) { /* leave as is */ }
      return !now.isLive(name);
    });
    parts = parts.concat(now.segs);
    return url.pathname + (parts.length ? '?' + parts.join('&') : '') + url.hash;
  }

  function withoutWindows(url, now) {
    now = now || live();
    var q = new URLSearchParams(url.search);
    Array.from(q.keys()).forEach(function (k) { if (now.isLive(k)) q.delete(k); });
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
    var shown = withLiveWindows(parsed);
    var url = parsed.pathname === location.pathname ? shown : parsed.pathname + parsed.search + parsed.hash;
    if (!names.length) { location.assign(url); return; }

    if (busy) busy.abort();
    var ctl = busy = new AbortController();
    names.forEach(function (n) { current[n].setAttribute('aria-busy', 'true'); });

    /* The fetched regions join the page with its authority, so the fetch
       refuses another origin, a redirect to one included; the page then
       loads as an ordinary navigation, where the browser keeps origins
       apart. */
    fetch(url, { mode: 'same-origin', credentials: 'same-origin', headers: { Accept: 'text/html' }, signal: ctl.signal })
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
    var now = live();
    var want = null;
    try { want = href ? withoutWindows(new URL(href, location.href), now) : null; } catch (e) { want = null; }
    var same = want && Array.prototype.find.call(region.querySelectorAll('a[href]'), function (a) {
      return withoutWindows(new URL(a.href), now) === want;
    });
    var target = (id && region.querySelector('#' + CSS.escape(id))) || same;
    if (!target) {
      target = region;
      if (!region.hasAttribute('tabindex')) region.setAttribute('tabindex', '-1');
    }
    target.focus({ preventScroll: true });
  }

  /* === Keeping links current ============================================= */

  /* Same-page links that swap regions carry the live windows, and so do
     the window fields a server renders into a region's GET forms. */
  function refreshLinks() {
    var here = location.pathname;
    var now = live();
    document.querySelectorAll(LINKS).forEach(function (a) {
      if (a.hasAttribute('data-win-open')) return;
      var url;
      try { url = new URL(a.getAttribute('href'), location.href); } catch (e) { return; }
      if (url.origin !== location.origin || url.pathname !== here) return;
      var href = withLiveWindows(url, now);
      if (a.getAttribute('href') !== href) a.setAttribute('href', href);
    });
    var params = new URLSearchParams(now.segs.join('&'));
    document.querySelectorAll('[data-region] form').forEach(function (f) {
      if ((f.getAttribute('method') || 'get').toLowerCase() !== 'get') return;
      var hidden = Array.prototype.filter.call(f.querySelectorAll('input[type="hidden"]'), function (i) {
        return now.isLive(i.name);
      });
      if (!hidden.length) return;
      hidden.forEach(function (i) { i.remove(); });
      params.forEach(function (v, k) {
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
    var a = e.target.closest && e.target.closest(LINKS);
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
    /* A field left empty is left out of the address, so a cleared filter
       leaves no ?q= behind, and the address for no filter is the same
       whether the reader cleared the field or followed a plain link. */
    var data = new FormData(f, e.submitter || null);
    var q = new URLSearchParams();
    var now = live();
    data.forEach(function (v, k) { if (typeof v === 'string' && v !== '' && !now.isLive(k)) q.append(k, v); });
    url.search = q.toString();
    e.preventDefault();
    swap(url.pathname + url.search, true);
  });

  /* Back and Forward: the windows module puts the windows right, and this
     puts the regions right when the part of the address they show has
     changed. */
  window.addEventListener('popstate', function () {
    if (withoutWindows(new URL(location.href)) === listPart) return;
    swap(location.pathname + location.search + location.hash, false);
  });

  document.addEventListener('pudl:windows-change', refreshLinks);

  /* A page that renders a region's links by script, after a swap or at
     any other time, asks for them to carry the live windows again. */
  window.pudlRegions = { refresh: refreshLinks };

  function init() {
    listPart = withoutWindows(new URL(location.href));
    refreshLinks();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
