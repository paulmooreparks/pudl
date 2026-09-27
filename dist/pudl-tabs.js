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
   panels does not fill the history. */
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

  function init() { document.querySelectorAll('.tabs').forEach(enhance); }
  window.pudlTabs = { enhance: init };
  document.addEventListener('pudl:window-open', init);
  document.addEventListener('pudl:regions-swap', init);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
