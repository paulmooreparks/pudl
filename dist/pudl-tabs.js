/* PUDL tabs within a page. Load with defer.

   Markup, in the ARIA tab pattern:

     <div class="tabs">
       <div class="tablist" role="tablist" aria-label="Expense">
         <button role="tab" id="tab-details" aria-controls="details" aria-selected="true">Details</button>
         <button role="tab" id="tab-receipt" aria-controls="receipt">Receipt</button>
       </div>
       <section role="tabpanel" id="details" aria-labelledby="tab-details">…</section>
       <section role="tabpanel" id="receipt" aria-labelledby="tab-receipt">…</section>
     </div>

   Without this script every panel shows, one after another, and the tab
   list is hidden. With it, one panel shows at a time; a tab is chosen by
   pressing it, or with the arrow keys, Home and End once the tab list has
   focus; the tab list is one stop in the Tab order; and the chosen panel's
   id is the address's fragment, so a link to #receipt opens that panel and
   a reload keeps it. The fragment is replaced, not pushed, so switching
   panels does not fill the history.

   Document tabs, a .tablist.doc-tabs of tabs that come and go as an
   editor's files do, are the host's to choose between and to close, since
   which document is open is the host's state:

     <div class="tablist doc-tabs" role="tablist" aria-label="Open files">
       <a role="tab" href="?file=today.md" aria-selected="true">today.md<span
          class="doc-tab-dirty">unsaved</span><span class="doc-tab-close" aria-hidden="true"></span></a>
       <a role="tab" href="?file=notes.md" aria-selected="false">notes.md<span
          class="doc-tab-close" aria-hidden="true"></span></a>
     </div>

   A tab is a link to the address that shows its document, or a button
   the host handles. This script makes the list one stop in the Tab order,
   on the selected tab; the arrow keys, Home and End move focus along it,
   and Enter or Space chooses, as the tab itself does. Pressing a tab's
   close button, or Delete on the focused tab, fires pudl:tab-close on the
   tab rather than following it, so the host can ask about unsaved changes
   before it removes the tab. */
(function () {
  'use strict';

  function tabsOf(list) {
    return Array.prototype.filter.call(list.children, function (el) { return el.getAttribute('role') === 'tab'; });
  }

  function panelOf(tab) {
    var id = tab.getAttribute('aria-controls');
    return id ? document.getElementById(id) : null;
  }

  function select(tab, opts) {
    opts = opts || {};
    var list = tab.parentElement;
    tabsOf(list).forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      var p = panelOf(t);
      if (p) p.hidden = !on;
    });
    if (opts.focus) tab.focus();
    var panel = panelOf(tab);
    if (opts.record && panel && panel.id && location.hash !== '#' + panel.id) {
      history.replaceState(history.state, '', location.pathname + location.search + '#' + panel.id);
    }
  }

  function enhance(wrap) {
    if (wrap.classList.contains('tabs-ready')) return;
    var list = wrap.querySelector(':scope > [role="tablist"]');
    if (!list) return;
    var tabs = tabsOf(list);
    if (!tabs.length) return;
    tabs.forEach(function (t) {
      var p = panelOf(t);
      if (p && !p.hasAttribute('tabindex')) p.tabIndex = 0;
      if (t.tagName === 'BUTTON' && !t.hasAttribute('type')) t.type = 'button';
    });
    var fromHash = location.hash && tabs.find(function (t) { return '#' + t.getAttribute('aria-controls') === location.hash; });
    var chosen = fromHash || tabs.find(function (t) { return t.getAttribute('aria-selected') === 'true'; }) || tabs[0];
    select(chosen);
    wrap.classList.add('tabs-ready');
  }

  document.addEventListener('click', function (e) {
    var tab = e.target.closest && e.target.closest('.tabs-ready > [role="tablist"] > [role="tab"]');
    if (!tab) return;
    e.preventDefault();
    select(tab, { record: true });
  });

  document.addEventListener('keydown', function (e) {
    var tab = e.target.closest && e.target.closest('.tabs-ready > [role="tablist"] > [role="tab"]');
    if (!tab || e.altKey || e.ctrlKey || e.metaKey) return;
    var tabs = tabsOf(tab.parentElement);
    var i = tabs.indexOf(tab);
    var rtl = getComputedStyle(tab.parentElement).direction === 'rtl';
    var next = null;
    if (e.key === 'ArrowRight') next = tabs[(i + (rtl ? -1 : 1) + tabs.length) % tabs.length];
    else if (e.key === 'ArrowLeft') next = tabs[(i + (rtl ? 1 : -1) + tabs.length) % tabs.length];
    else if (e.key === 'Home') next = tabs[0];
    else if (e.key === 'End') next = tabs[tabs.length - 1];
    else return;
    e.preventDefault();
    select(next, { focus: true, record: true });
  });

  /* Following a link to one of the panels, on the same page, opens it. */
  window.addEventListener('hashchange', function () {
    var tab = location.hash && document.querySelector('.tabs-ready > [role="tablist"] > [role="tab"][aria-controls="' + CSS.escape(location.hash.slice(1)) + '"]');
    if (tab) select(tab);
  });

  /* === Document tabs ===================================================== */

  function docTabs(list) {
    return Array.prototype.filter.call(list.children, function (el) { return el.getAttribute('role') === 'tab'; });
  }

  /* One tab stop, on the selected tab. It can run again whenever the host
     has added or removed tabs. */
  function enhanceDocs(list) {
    var tabs = docTabs(list);
    var chosen = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
    tabs.forEach(function (t) { t.tabIndex = t === chosen ? 0 : -1; });
  }

  function closeTab(tab) {
    tab.dispatchEvent(new CustomEvent('pudl:tab-close', { bubbles: true }));
  }

  /* Caught on the way down, so a close button inside a link never follows
     the link, whatever other script listens for clicks. */
  document.addEventListener('click', function (e) {
    var x = e.target.closest && e.target.closest('.doc-tabs > [role="tab"] .doc-tab-close');
    if (!x) return;
    e.preventDefault();
    e.stopPropagation();
    closeTab(x.closest('[role="tab"]'));
  }, true);

  document.addEventListener('keydown', function (e) {
    var tab = e.target.closest && e.target.closest('.doc-tabs > [role="tab"]');
    if (!tab || e.altKey || e.ctrlKey || e.metaKey) return;
    var list = tab.parentElement;
    enhanceDocs(list);
    if (e.key === 'Delete') { e.preventDefault(); closeTab(tab); return; }
    var tabs = docTabs(list);
    var i = tabs.indexOf(tab);
    var rtl = getComputedStyle(list).direction === 'rtl';
    var next = null;
    if (e.key === 'ArrowRight') next = tabs[(i + (rtl ? -1 : 1) + tabs.length) % tabs.length];
    else if (e.key === 'ArrowLeft') next = tabs[(i + (rtl ? 1 : -1) + tabs.length) % tabs.length];
    else if (e.key === 'Home') next = tabs[0];
    else if (e.key === 'End') next = tabs[tabs.length - 1];
    else if (e.key === ' ' && tab.tagName === 'A') { e.preventDefault(); tab.click(); return; }
    else return;
    e.preventDefault();
    tabs.forEach(function (t) { t.tabIndex = t === next ? 0 : -1; });
    next.focus();
  });

  function init() {
    document.querySelectorAll('.tabs').forEach(enhance);
    document.querySelectorAll('.doc-tabs').forEach(enhanceDocs);
  }
  window.pudlTabs = { enhance: init };
  document.addEventListener('focusout', function (e) {
    /* Focus left a document tab list: the tab stop returns to the selected
       tab, so Tab brings the reader back to the document in view. */
    var list = e.target.closest && e.target.closest('.doc-tabs');
    if (list && !list.contains(e.relatedTarget)) enhanceDocs(list);
  });
  document.addEventListener('pudl:window-open', init);
  document.addEventListener('pudl:regions-swap', init);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
