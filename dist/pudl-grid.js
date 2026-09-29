/* PUDL grids. Load with defer.

   A data table whose rows are choices, a file list, an inbox or a picker,
   is a grid:

     <table class="data-table" role="grid" aria-label="Contents">
       <thead>…</thead>
       <tbody>
         <tr aria-selected="true"><td><a href="?open=notes.md">notes.md</a></td>…</tr>
         <tr aria-selected="false"><td><a href="?open=todo.md">todo.md</a></td>…</tr>
       </tbody>
     </table>

   Each row's first link is the row's own address, so without script the
   table is a list of links. With this script the grid is one stop in the
   Tab order, on the selected row; selection follows focus, which Up, Down,
   Home, End, Page Up and Page Down move; and Enter or a double-click
   opens the row by following its first link, so a link that opens a
   window or swaps regions does that as a click on it would. A row with no
   link fires pudl:row-open on the row for the host instead. Every change
   of selection fires pudl:row-select on the row.

   The selection is single. Links inside a row leave the Tab order, since
   the row stands for them, so a row's other actions belong on a toolbar
   that acts on the selected row, as a file manager's do. */
(function () {
  'use strict';

  var PAGE = 10;   // rows Page Up and Page Down move

  function gridOf(el) {
    var t = el && el.closest && el.closest('table.data-table[role="grid"]');
    return t || null;
  }

  function rows(table) {
    var body = table.tBodies[0];
    return body ? Array.prototype.filter.call(body.rows, function (r) { return !r.classList.contains('data-table-empty'); }) : [];
  }

  /* Gives a grid, and any rows added to it since, their states and tab
     stop. It can run again at any time. */
  function enhance(table) {
    var all = rows(table);
    all.forEach(function (r) {
      if (!r.hasAttribute('aria-selected')) r.setAttribute('aria-selected', 'false');
      if (!r.hasAttribute('tabindex')) r.tabIndex = -1;
      r.querySelectorAll('a[href]').forEach(function (a) { a.tabIndex = -1; });
    });
    var stops = all.filter(function (r) { return r.getAttribute('tabindex') === '0'; });
    if (stops.length !== 1) {
      var chosen = all.filter(function (r) { return r.getAttribute('aria-selected') === 'true'; })[0] || all[0];
      all.forEach(function (r) { r.tabIndex = -1; });
      if (chosen) chosen.tabIndex = 0;
    }
  }

  function select(table, row, focus) {
    if (!row) return;
    var changed = row.getAttribute('aria-selected') !== 'true';
    rows(table).forEach(function (r) {
      var on = r === row;
      r.setAttribute('aria-selected', on ? 'true' : 'false');
      r.tabIndex = on ? 0 : -1;
    });
    if (focus) row.focus();
    if (changed) row.dispatchEvent(new CustomEvent('pudl:row-select', { bubbles: true }));
  }

  function open(row) {
    var link = row.querySelector('a[href]');
    if (link) link.click();
    else row.dispatchEvent(new CustomEvent('pudl:row-open', { bubbles: true }));
  }

  function rowOf(table, el) {
    var r = el.closest('tr');
    return r && rows(table).indexOf(r) >= 0 ? r : null;
  }

  document.addEventListener('click', function (e) {
    var table = gridOf(e.target);
    if (!table) return;
    enhance(table);
    var row = rowOf(table, e.target);
    if (row) select(table, row, !e.target.closest('a[href], button, input, select, textarea'));
  });

  document.addEventListener('dblclick', function (e) {
    var table = gridOf(e.target);
    var row = table && rowOf(table, e.target);
    if (row && !e.target.closest('a[href], button, input, select, textarea')) open(row);
  });

  document.addEventListener('focusin', function (e) {
    var table = gridOf(e.target);
    if (!table || e.target.tagName !== 'TR') return;
    enhance(table);
    if (e.target.getAttribute('aria-selected') !== 'true') select(table, e.target, false);
  });

  document.addEventListener('keydown', function (e) {
    var table = gridOf(e.target);
    if (!table || e.target.tagName !== 'TR' || e.altKey || e.ctrlKey || e.metaKey) return;
    enhance(table);
    var all = rows(table);
    var i = all.indexOf(e.target);
    if (i < 0) return;
    var to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: all.length - 1,
               PageDown: Math.min(all.length - 1, i + PAGE), PageUp: Math.max(0, i - PAGE) }[e.key];
    if (to != null) {
      e.preventDefault();
      if (all[to]) select(table, all[to], true);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      open(e.target);
    }
  });

  function init() { document.querySelectorAll('table.data-table[role="grid"]').forEach(enhance); }
  window.pudlGrid = { enhance: enhance };
  document.addEventListener('pudl:window-open', init);
  document.addEventListener('pudl:regions-swap', init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
