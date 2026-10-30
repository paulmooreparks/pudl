/* Optional skin selection. Register an already-loaded stylesheet link with
   pudlSkins.register(id, link), then select(id). Registration establishes
   availability only; build-time conformance admits supported skin files.
   No URLs are discovered or fetched by this script. Call refresh() after
   CSSOM availability changes such as link.sheet.disabled; those do not
   produce DOM attribute mutations. */
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
  function ready(entry) {
    var link = entry.link;
    return link.isConnected && link.ownerDocument === document && link.relList.contains('stylesheet') &&
      !link.disabled && !!link.sheet && !link.sheet.disabled && link.href === entry.href && link.media === entry.mediaText &&
      (!link.media || window.matchMedia(link.media).matches);
  }
  function apply() {
    if (booting) return current;
    var next = pref === 'standard' || !entries[pref] || !ready(entries[pref]) ? 'standard' : pref;
    var changed = next !== current || root.getAttribute('data-skin-pref') !== pref;
    current = next;
    root.setAttribute('data-skin', current);
    root.setAttribute('data-skin-pref', pref);
    if (changed) document.dispatchEvent(new CustomEvent('pudl:skin-change', { detail: { skin: current, preference: pref } }));
    return current;
  }
  function unregister(id) {
    var entry = entries[id];
    if (!entry) return;
    if (entry.media) entry.media.removeEventListener('change', apply);
    delete entries[id];
  }
  window.pudlSkins = {
    register: function (id, link) {
      if (!valid(id) || id === 'standard' || !(link instanceof HTMLLinkElement)) return false;
      var entry = { link: link, href: link.href, mediaText: link.media, media: null };
      if (!ready(entry)) return false;
      unregister(id);
      if (link.media) {
        entry.media = window.matchMedia(link.media);
        entry.media.addEventListener('change', apply);
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
    current: function () { return apply(); },
    refresh: function () { return apply(); },
    available: function () { return ['standard'].concat(Object.keys(entries).filter(function (id) { return ready(entries[id]); }).sort()); }
  };
  /* A changed URL needs a new successful registration. Removing or disabling
     a sheet immediately makes its selection unavailable on the next update. */
  new MutationObserver(function (records) {
    if (!records.some(function (record) { return record.type === 'childList' || record.target instanceof HTMLLinkElement; })) return;
    Object.keys(entries).forEach(function (id) {
      var entry = entries[id];
      if (!entry.link.isConnected || entry.link.href !== entry.href || entry.link.media !== entry.mediaText) unregister(id);
    });
    apply();
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['href', 'rel', 'disabled', 'media'] });
  window.addEventListener('storage', function (event) {
    if (!persist || (event.key !== KEY && event.key !== null)) return;
    pref = saved() || 'standard';
    apply();
  });
  /* Static links are loaded before a classic initializer runs. Register
     declared assets before reconciling the first effective selection. */
  document.querySelectorAll('link[data-pudl-skin]').forEach(function (link) {
    window.pudlSkins.register(link.getAttribute('data-pudl-skin'), link);
  });
  booting = false;
  apply();
})();
