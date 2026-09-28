/* The article reader keeps each windowed applet's state for the rest of the
   visit, so a window closed and opened again finds the applet as it was
   left. PUDL keeps no applet state: it asks the host for the state before
   an applet starts, with pudl:applet-state, and says when it changes, with
   pudl:applet-change. This is the host's side, keyed by window. */
(function () {
  'use strict';
  var KEY = 'pudl-sample-applets';
  function kept() {
    try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function windowOf(mount) {
    var w = mount.closest('.win');
    return w ? w.getAttribute('data-win') : null;
  }
  document.addEventListener('pudl:applet-state', function (e) {
    var k = windowOf(e.target);
    var s = k && kept()[k];
    if (s != null) e.detail.state = s;
  });
  document.addEventListener('pudl:applet-change', function (e) {
    var k = windowOf(e.target);
    if (!k) return;
    var all = kept();
    all[k] = e.detail.state;
    try { sessionStorage.setItem(KEY, JSON.stringify(all)); } catch (err) { /* not kept, then */ }
  });
})();
