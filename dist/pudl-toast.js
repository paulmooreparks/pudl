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
   from data-toast-close-label on the region, or is "Dismiss".

   A toast may carry one action (0.90.0), the one obvious next step, as a
   small raised button between its text and its dismiss button:

     pudlToast('The update is ready. Restart now to install it.',
               { action: { run: 'app.restart' } });

   run is a pudl-commands id, whose label, state and handling the button
   takes from the command, so the step has one name everywhere, or a
   function, with label then required; scope, an element, says where to
   look the command up, and label stands in until the command is found. The server writes the same
   thing as a button.toast-action inside the .toast, with data-command, or
   as a link. A toast with an action never leaves by itself, since a
   button on a timer fails a reader slow to reach it. Pressing the action
   runs it, as the person's own choice, and dismisses the toast; a failure
   is raised as a danger toast. The step must also be offered somewhere
   that lasts, such as the application's notifications. */
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
    if (t.hasAttribute('data-toast-armed') || t.hasAttribute('data-toast-sticky') || t.querySelector('.toast-action')) return;
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

  /* The action's button, or null, reported, when it has nothing to run or
     no words to show. */
  function actionButton(a) {
    if (!a) return null;
    var C = window.pudlCommands, label = a.label;
    if (typeof a.run === 'string') {
      var cmd = C && C.find(a.run, a.scope || undefined);
      if (cmd) label = String(C.value(cmd, 'label') || a.run).replace(/…$/, '');
      if (!cmd && !C) { console.warn('pudlToast: action ' + a.run + ' needs pudl-commands.js'); return null; }
    } else if (typeof a.run !== 'function') {
      console.warn('pudlToast: an action needs run, a command id or a function'); return null;
    }
    if (!label) { console.warn('pudlToast: an action needs a label'); return null; }
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-sm toast-action';
    b.textContent = label;
    b.setAttribute('data-tooltip', label);
    if (typeof a.run === 'string') b.setAttribute('data-command', a.run);
    else b.__toastRun = a.run;
    if (a.scope) b.__toastScope = a.scope;
    return b;
  }

  /* A command button pudl-commands has bound runs from its own handler, so
     the step is run once; one whose command it could not see from the
     toast, such as a window's, is run here in the scope given. */
  function runAction(b) {
    var id = b.getAttribute('data-command'), done;
    if (id && b.__pudlBound) return;
    try {
      if (b.__toastRun) done = b.__toastRun();
      else if (id && window.pudlCommands) done = window.pudlCommands.run(id, undefined, b.__toastScope, { grant: 'all', owner: { kind: 'person' } });
    } catch (err) { done = Promise.reject(err); }
    Promise.resolve(done).catch(function (err) {
      window.pudlToast(err && err.message ? err.message : String(err), { kind: 'danger' });
    });
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
    var act = actionButton(opts.action);
    if (act) t.appendChild(act);
    t.appendChild(closeButton(r.getAttribute('data-toast-close-label') || 'Dismiss'));
    /* A live region announces what is added to it after it exists, so a
       region made just now for a dialog gets its first toast a moment
       later, as the server's toasts do on load. */
    if (fresh) setTimeout(function () { r.appendChild(t); arm(t); }, 150);
    else { r.appendChild(t); arm(t); }
    return t;
  };

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.toast .toast-action');
    if (a) {
      if (a.getAttribute('aria-disabled') === 'true' || a.disabled) return;
      if (a.tagName === 'BUTTON') { e.preventDefault(); runAction(a); }
      dismiss(a.closest('.toast'));
      return;
    }
    var b = e.target.closest && e.target.closest('.notice-close, .toast-close');
    if (!b) return;
    e.preventDefault();
    dismiss(b.closest('.notice, .toast'));
  });

  /* Toasts that arrive in content, rather than in the region: a window's
     body fetched after the page loaded, or regions swapped in, can carry
     .toast elements, usually hidden, as a page carries them in its region
     They move into the region, shown,
     and are announced, so the same markup serves a page and a window. */
  function takeIn(scope) {
    if (!scope || !scope.querySelectorAll) return;
    var found = Array.prototype.filter.call(scope.querySelectorAll('.toast'), function (t) { return !t.closest('.toast-region'); });
    if (scope.classList && scope.classList.contains('toast') && !scope.closest('.toast-region')) found.push(scope);
    if (!found.length) return;
    var fresh = !document.querySelector('.toast-region:not(dialog .toast-region)');
    var r = region();
    found.forEach(function (t) {
      t.remove();
      t.hidden = false;
      if (!t.querySelector('.toast-close')) t.appendChild(closeButton(r.getAttribute('data-toast-close-label') || 'Dismiss'));
    });
    setTimeout(function () { found.forEach(function (t) { r.appendChild(t); arm(t); }); }, fresh ? 150 : 0);
  }

  function init() {
    var r = document.querySelector('.toast-region');
    if (r) {
      region();
      var server = Array.prototype.slice.call(r.querySelectorAll(':scope > .toast'));
      if (server.length) {
        server.forEach(function (t) { t.remove(); });
        setTimeout(function () {
          server.forEach(function (t) { r.appendChild(t); arm(t); });
        }, 150);
      }
    }
    /* Windows the server rendered into the page carry theirs too. */
    setTimeout(function () { document.querySelectorAll('.win').forEach(takeIn); }, 150);
  }

  document.addEventListener('pudl:window-open', function (e) { takeIn(e.target); });
  document.addEventListener('pudl:regions-swap', function (e) {
    (e.detail && e.detail.regions || []).forEach(function (name) {
      takeIn(document.querySelector('[data-region="' + CSS.escape(name) + '"]'));
    });
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
