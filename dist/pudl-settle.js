/* Optional. Tells a page, a host or a test when PUDL has finished the work
   it queued, so nothing has to guess with a delay. docs/SETTLED.md is the
   contract. Load this script before the other PUDL scripts; a script that
   has already run does not report to it.

     await pudlSettled();                 // resolves when PUDL is settled
     document.addEventListener('pudl:settled', ...)
     var done = pudlBusy(); ... done();   // a host reports its own work

   PUDL is settled when the page has loaded, its fonts have loaded, no
   reported work is outstanding, and one whole animation frame has then
   passed in which no work was reported and no observed element changed
   size. The order this relies on is the HTML event loop's: within one
   frame the browser runs animation frame callbacks and then delivers
   resize observations, and a timer task cannot run in the middle of that. */
(function () {
  'use strict';
  if (window.pudlSettled) return;
  /* The browser's functions are looked up at each call, so a page that
     replaces one of them later is still obeyed. */
  function nativeFrame(fn) { return window.requestAnimationFrame(fn); }
  function nativeCancelFrame(id) { window.cancelAnimationFrame(id); }
  function nativeTimeout(fn, ms) { return window.setTimeout(fn, ms); }
  function nativeCancelTimeout(id) { window.clearTimeout(id); }
  /* outstanding counts reported work not yet done. activity changes each
     time anything is reported, so a frame in which it did not change was
     a quiet one. */
  var outstanding = 0, activity = 0, watching = false, unsettled = true, waiters = [];

  function watch() {
    if (watching || outstanding) return;
    watching = true;
    var seen = activity;
    nativeFrame(function () {
      nativeTimeout(function () {
        watching = false;
        if (outstanding) return;
        if (activity !== seen) { watch(); return; }
        var resolve = waiters; waiters = [];
        if (unsettled) { unsettled = false; document.dispatchEvent(new CustomEvent('pudl:settled')); }
        resolve.forEach(function (fn) { fn(); });
      }, 0);
    });
  }
  function busy() {
    var open = true;
    outstanding++; activity++; unsettled = true;
    return function () {
      if (!open) return;
      open = false; outstanding--;
      watch();
    };
  }
  /* A frame or a timer that PUDL queues is outstanding until it has run or
     been cancelled. */
  function queue(start, cancel) {
    var dones = Object.create(null);
    return {
      start: function (fn, delay) {
        var done = busy();
        var id = start(function (value) { delete dones[id]; try { fn(value); } finally { done(); } }, delay);
        dones[id] = done;
        return id;
      },
      cancel: function (id) {
        cancel(id);
        if (dones[id]) { var done = dones[id]; delete dones[id]; done(); }
      }
    };
  }
  var frames = queue(nativeFrame, nativeCancelFrame), timers = queue(nativeTimeout, nativeCancelTimeout);
  busy.frame = frames.start;
  busy.cancelFrame = frames.cancel;
  busy.timeout = timers.start;
  busy.cancelTimeout = timers.cancel;
  /* A resize observation is work the browser starts, so each delivery
     counts as activity. */
  busy.ResizeObserver = function (callback) {
    return new window.ResizeObserver(function (entries, observer) {
      activity++; unsettled = true;
      try { callback(entries, observer); } finally { watch(); }
    });
  };

  function loaded() {
    return document.readyState === 'complete' ? Promise.resolve() :
      new Promise(function (resolve) { window.addEventListener('load', function () { resolve(); }, { once: true }); });
  }
  function settled() {
    return loaded()
      .then(function () { return document.fonts.ready; })
      .then(function () { return new Promise(function (resolve) { waiters.push(resolve); watch(); }); })
      .then(function () { return document.fonts.status === 'loading' ? settled() : undefined; });
  }
  window.pudlBusy = busy;
  window.pudlSettled = settled;
})();
