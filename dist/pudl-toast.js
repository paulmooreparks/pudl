/* PUDL toasts and notices. Load with defer.

   A toast is a passing confirmation, "Saved", in a live region at the foot
   of the window. The server can render toasts into a .toast-region, as it
   would after a form posts and redirects, and a script can raise one:

     pudlToast('Expense saved', { kind: 'positive' });

   kind is 'positive', 'warn' or 'danger', or absent for information. A
   toast leaves by itself after five seconds, or data-toast-ms on it, and
   waits while the pointer or focus is on it; data-toast-sticky keeps it
   until the reader dismisses it. Screen readers announce a toast as it
   appears. A live region does not announce what was already on the page
   when it loaded, so the script re-inserts the server's toasts a moment
   after load, which makes them heard.

   A .notice-close or .toast-close button dismisses the notice or toast it
   sits in. The dismiss button's label on a toast raised by script comes
   from data-toast-close-label on the region, or is "Dismiss". */
(function () {
  'use strict';

  var DURATION = 5000;
  var LEAVE = 200;
  var KINDS = ['positive', 'warn', 'danger'];

  function reduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function live(r) {
    if (!r.hasAttribute('role')) r.setAttribute('role', 'status');
    if (!r.hasAttribute('aria-live')) r.setAttribute('aria-live', 'polite');
    return r;
  }

  function region() {
    var r = document.querySelector('.toast-region:not(dialog .toast-region)');
    if (!r) {
      r = document.createElement('div');
      r.className = 'toast-region';
      document.body.appendChild(r);
    }
    return live(r);
  }

  /* While a modal dialog is open, everything outside it is inert and sits
     under its backdrop, so a toast raised then goes in a region inside the
     dialog, where the reader can see it, hear it and dismiss it. The toasts
     still there when the dialog closes move back to the page's region. */
  function dialogRegion(d) {
    var r = d.querySelector(':scope > .toast-region');
    if (r) return r;
    r = live(document.createElement('div'));
    r.className = 'toast-region';
    r.setAttribute('data-toast-close-label', region().getAttribute('data-toast-close-label') || 'Dismiss');
    d.appendChild(r);
    d.addEventListener('close', function () {
      var home = region();
      Array.prototype.slice.call(r.children).forEach(function (t) { home.appendChild(t); });
      r.remove();
    }, { once: true });
    return r;
  }

  function openModal() {
    var open = document.querySelectorAll('dialog[open]');
    for (var i = open.length - 1; i >= 0; i--) if (open[i].matches(':modal')) return open[i];
    return null;
  }

  function dismiss(el) {
    if (!el || !el.isConnected) return;
    if (el.classList.contains('notice')) { el.hidden = true; return; }
    el.classList.add('leaving');
    setTimeout(function () { el.remove(); }, reduced() ? 0 : LEAVE);
  }

  /* Starts a toast's clock, which pauses while the reader is on it. */
  function arm(t) {
    if (t.hasAttribute('data-toast-armed') || t.hasAttribute('data-toast-sticky')) return;
    t.setAttribute('data-toast-armed', '');
    var left = parseInt(t.getAttribute('data-toast-ms'), 10) || DURATION;
    var timer = 0, started = 0, held = 0;
    function run() {
      if (held) return;
      started = Date.now();
      timer = setTimeout(function () { dismiss(t); }, left);
    }
    function hold() {
      held++;
      if (held === 1) { clearTimeout(timer); left -= Date.now() - started; }
    }
    function release() {
      held = Math.max(0, held - 1);
      run();
    }
    t.addEventListener('mouseenter', hold);
    t.addEventListener('mouseleave', release);
    t.addEventListener('focusin', hold);
    t.addEventListener('focusout', release);
    run();
  }

  function closeButton(label) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'toast-close';
    b.setAttribute('aria-label', label);
    return b;
  }

  window.pudlToast = function (message, opts) {
    opts = opts || {};
    var modal = openModal();
    var fresh = modal && !modal.querySelector(':scope > .toast-region');
    var r = modal ? dialogRegion(modal) : region();
    var t = document.createElement('div');
    t.className = 'toast';
    if (KINDS.indexOf(opts.kind) >= 0) t.classList.add(opts.kind);
    if (opts.sticky) t.setAttribute('data-toast-sticky', '');
    if (opts.ms) t.setAttribute('data-toast-ms', String(opts.ms));
    var p = document.createElement('p');
    p.className = 'toast-text';
    p.textContent = message;
    t.appendChild(p);
    t.appendChild(closeButton(r.getAttribute('data-toast-close-label') || 'Dismiss'));
    /* A live region announces what is added to it after it exists, so a
       region made just now for a dialog gets its first toast a moment
       later, as the server's toasts do on load. */
    if (fresh) setTimeout(function () { r.appendChild(t); arm(t); }, 150);
    else { r.appendChild(t); arm(t); }
    return t;
  };

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.notice-close, .toast-close');
    if (!b) return;
    e.preventDefault();
    dismiss(b.closest('.notice, .toast'));
  });

  function init() {
    var r = document.querySelector('.toast-region');
    if (!r) return;
    region();
    var server = Array.prototype.slice.call(r.querySelectorAll(':scope > .toast'));
    if (!server.length) return;
    server.forEach(function (t) { t.remove(); });
    setTimeout(function () {
      server.forEach(function (t) { r.appendChild(t); arm(t); });
    }, 150);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
