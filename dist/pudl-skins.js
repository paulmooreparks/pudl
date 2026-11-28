/* Optional skin selection. Register a loaded stylesheet link with
   pudlSkins.register(id, link), then select(id). Registration establishes
   availability only; build-time conformance admits supported skin files.
   No URLs are discovered or fetched by this script.

   A skin stylesheet shows that it has loaded and applies by setting the
   custom property --pudl-skin-<id> on the root, which the skin compiler
   writes into every skin file. The script reads that property's computed
   value. A link whose stylesheet failed to load, is disabled, or has a
   media condition that does not match leaves the property unset, so the
   skin is unavailable. A link's sheet object is no evidence of loading.

   Call refresh() after CSSOM availability changes such as
   link.sheet.disabled; those do not produce DOM attribute mutations. */
(function () {
  'use strict';
  var KEY = 'pudl-skin', root = document.documentElement;
  var entries = Object.create(null);
  var persist = root.getAttribute('data-pudl-persistence') !== 'host';
  function valid(id) { return typeof id === 'string' && /^[a-z][a-z0-9-]{0,39}$/.test(id); }
  function saved() {
    if (!persist) return null;
    try { var value = localStorage.getItem(KEY); return valid(value) ? value : null; }
    catch (e) { return null; }
  }
  var pref = saved() || (valid(root.getAttribute('data-skin')) ? root.getAttribute('data-skin') : 'standard');
  var current = null, booting = true;
  /* The property is read when a skin is registered and again whenever its
     answer can have changed: fresh is true for refresh(), current(),
     available(), a link's load or error event, a change to a link's
     attributes and a media change. Other DOM changes reuse the last
     reading, so an unrelated insertion costs no style calculation. */
  function ready(entry, fresh) {
    var link = entry.link;
    if (!(link.isConnected && link.ownerDocument === document && link.relList.contains('stylesheet') &&
      !link.disabled && !!link.sheet && !link.sheet.disabled && link.href === entry.href && link.media === entry.mediaText &&
      (!link.media || window.matchMedia(link.media).matches))) return false;
    if (fresh || entry.marked === undefined) {
      entry.marked = getComputedStyle(root).getPropertyValue('--pudl-skin-' + entry.id).trim() !== '';
    }
    return entry.marked;
  }
  function apply(fresh) {
    if (booting) return current;
    var next = pref === 'standard' || !entries[pref] || !ready(entries[pref], fresh) ? 'standard' : pref;
    var changed = next !== current || root.getAttribute('data-skin-pref') !== pref;
    current = next;
    if (root.getAttribute('data-skin') !== current) root.setAttribute('data-skin', current);
    if (root.getAttribute('data-skin-pref') !== pref) root.setAttribute('data-skin-pref', pref);
    if (changed) document.dispatchEvent(new CustomEvent('pudl:skin-change', { detail: { skin: current, preference: pref } }));
    return current;
  }
  function reread() { apply(true); }
  function unregister(id) {
    var entry = entries[id];
    if (!entry) return;
    if (entry.media) entry.media.removeEventListener('change', reread);
    delete entries[id];
  }
  window.pudlSkins = {
    register: function (id, link) {
      if (!valid(id) || id === 'standard' || !(link instanceof HTMLLinkElement)) return false;
      var entry = { id: id, link: link, href: link.href, mediaText: link.media, media: null, marked: undefined };
      if (!ready(entry, true)) return false;
      unregister(id);
      if (link.media) {
        entry.media = window.matchMedia(link.media);
        entry.media.addEventListener('change', reread);
      }
      entries[id] = entry;
      apply();
      return true;
    },
    unregister: function (id) { unregister(id); apply(); },
    select: function (id) {
      if (!valid(id)) return false;
      pref = id;
      try { if (persist) localStorage.setItem(KEY, pref); } catch (e) { /* storage blocked */ }
      apply();
      return current === id;
    },
    preference: function () { return pref; },
    current: function () { return apply(true); },
    refresh: function () { return apply(true); },
    available: function () { return ['standard'].concat(Object.keys(entries).filter(function (id) { return ready(entries[id], true); }).sort()); }
  };
  /* A changed URL needs a new successful registration. Removing or disabling
     a sheet immediately makes its selection unavailable on the next update. */
  new MutationObserver(function (records) {
    var links = records.some(function (record) { return record.target instanceof HTMLLinkElement; });
    if (!links && !records.some(function (record) { return record.type === 'childList'; })) return;
    Object.keys(entries).forEach(function (id) {
      var entry = entries[id];
      if (!entry.link.isConnected || entry.link.href !== entry.href || entry.link.media !== entry.mediaText) unregister(id);
    });
    apply(links);
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['href', 'rel', 'disabled', 'media'] });
  /* A stylesheet that finishes or fails after registration, for example
     one enabled again, changes what applies. load and error do not bubble,
     so they are heard in the capture phase. */
  function settled(event) { if (event.target instanceof HTMLLinkElement) apply(true); }
  document.addEventListener('load', settled, true);
  document.addEventListener('error', settled, true);
  window.addEventListener('storage', function (event) {
    if (!persist || (event.key !== KEY && event.key !== null)) return;
    pref = saved() || 'standard';
    apply();
  });
  /* Register declared links before reconciling the first effective
     selection. A declared link that has not loaded, or failed, is refused
     like any other. */
  document.querySelectorAll('link[data-pudl-skin]').forEach(function (link) {
    window.pudlSkins.register(link.getAttribute('data-pudl-skin'), link);
  });
  booting = false;
  apply();
})();
