/* PUDL toolbars. Load with defer.

   A toolbar is a row of groups of raised controls, as a page editor's is:

     <div class="toolbar" role="toolbar" aria-label="Formatting">
       <div class="toolbar-group" role="group" aria-label="Text">
         <button type="button" class="icon-btn" aria-label="Bold" aria-pressed="false">…</button>
         …
       </div>
       <div class="toolbar-group" role="group" aria-label="Table">
         <div class="menu"><button type="button" class="icon-btn menu-btn" popovertarget="…" aria-label="Table">…</button>
           <div class="menu-panel" id="…" popover>…</div></div>
       </div>
     </div>

   The toolbar is one stop in the Tab order, on the last control used or
   the first: Left and Right move along its enabled controls, Home and End
   to its ends, and Tab leaves. A control in the state the cursor is in
   carries aria-pressed="true" and is drawn pressed in. A menu button whose
   every row is disabled is disabled with them, and enabled again when a
   row is; the script watches the rows. pudlToolbar.enhance(root) takes in
   toolbars a host has added. */
(function () {
  'use strict';

  function controls(bar) {
    return Array.prototype.filter.call(bar.querySelectorAll('button, a[href], input, select'), function (c) {
      return !c.closest('.menu-panel') && !c.disabled && c.getAttribute('aria-disabled') !== 'true' && c.getClientRects().length > 0;
    });
  }

  function stop(bar, on) {
    var all = Array.prototype.filter.call(bar.querySelectorAll('button, a[href], input, select'), function (c) { return !c.closest('.menu-panel'); });
    var live = controls(bar);
    if (!live.length) return;
    if (!on || live.indexOf(on) < 0) on = live.filter(function (c) { return c.tabIndex === 0; })[0] || live[0];
    all.forEach(function (c) { c.tabIndex = c === on ? 0 : -1; });
  }

  /* A menu button is disabled while its rows all are. */
  function menus(bar) {
    bar.querySelectorAll('.menu > .menu-btn[popovertarget]').forEach(function (b) {
      var p = document.getElementById(b.getAttribute('popovertarget'));
      if (!p) return;
      var rows = p.querySelectorAll('.menu-action');
      if (!rows.length) return;
      var any = Array.prototype.some.call(rows, function (r) { return !r.disabled && r.getAttribute('aria-disabled') !== 'true'; });
      /* Set only on a change: setting it again would be a mutation the
         observer below answers, without end. */
      if (b.disabled === any) b.disabled = !any;
    });
  }

  function enhance(root) {
    (root || document).querySelectorAll('.toolbar').forEach(function (bar) {
      if (!bar.hasAttribute('role')) bar.setAttribute('role', 'toolbar');
      menus(bar);
      stop(bar, null);
      if (bar.__ready) return;
      bar.__ready = true;
      bar.addEventListener('keydown', function (e) {
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        if (e.target.closest('.menu-panel')) return;
        var list = controls(bar), i = list.indexOf(e.target.closest('button, a[href], input, select')), next;
        if (i < 0) return;
        var rtl = getComputedStyle(bar).direction === 'rtl';
        if (e.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) next = list[(i + 1) % list.length];
        else if (e.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) next = list[(i + list.length - 1) % list.length];
        else if (e.key === 'Home') next = list[0];
        else if (e.key === 'End') next = list[list.length - 1];
        else return;
        e.preventDefault();
        stop(bar, next);
        next.focus();
      });
      bar.addEventListener('focusin', function (e) {
        var c = e.target.closest('button, a[href], input, select');
        if (c && !c.closest('.menu-panel')) stop(bar, c);
      });
      new MutationObserver(function () { menus(bar); stop(bar, null); })
        .observe(bar, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled', 'aria-disabled', 'hidden'] });
    });
  }

  window.pudlToolbar = { enhance: enhance };
  new MutationObserver(function () { enhance(); }).observe(document.documentElement, { subtree: true, childList: true });
  document.addEventListener('pudl:regions-swap', function () { enhance(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { enhance(); }); else enhance();
})();
