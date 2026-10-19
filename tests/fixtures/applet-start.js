/* The probe applet for applet-start.html: it records each start, with its
   window, its reason and the time, and is ready 150ms after it starts. */
window.starts = [];
window.readyAt = {};
document.addEventListener('pudl:applet-start', function (e) {
  window.starts.push({ key: e.detail.instance, reason: e.detail.reason, at: performance.now() });
});
pudlApplets.register('probe', {
  init: function (root, opts) {
    root.textContent = 'Started';
    var ready = new Promise(function (resolve) {
      setTimeout(function () { window.readyAt[opts.instance] = performance.now(); resolve(); }, 150);
    });
    return { ready: ready, destroy: function () {} };
  }
});
