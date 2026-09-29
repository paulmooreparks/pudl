/* PUDL trees. Load with defer.

   A tree is a hierarchy of places, nested lists of links:

     <ul class="tree" aria-label="Folders">
       <li><a href="?path=/" aria-expanded="true" aria-current="page">Site</a>
         <ul>
           <li><a href="?path=/articles" aria-expanded="false">articles</a>
             <ul>…</ul></li>
           <li><a href="?path=/about">about</a></li>
         </ul></li>
     </ul>

   The server marks each node that has children with aria-expanded on its
   link, "true" or "false", and the current node with aria-current. Without
   this script the tree is an indented list of links and every branch
   shows. With it, the tree follows the ARIA tree pattern, as the WAI-ARIA
   navigation tree does: each link is a treeitem, the tree is one stop in
   the Tab order, Up and Down move between the nodes showing, Right opens a
   node or moves into it, Left closes it or moves to its parent, Home and
   End go to the ends, typing a node's first letters moves to it, and Enter
   follows the link. Each node with children gains a toggle that opens and
   closes it by pointer.

   pudl:tree-toggle fires on the node's link when it opens or closes, with
   detail.open, so a host can remember which nodes are open, or fill in a
   branch's children as it opens; pudlTree.enhance(tree) takes in nodes a
   host has added. */
(function () {
  'use strict';

  var TYPE_RESET = 700;   // ms after which typed letters start a new search
  var uid = 0;
  var typed = '', typedAt = 0;

  function groupOf(a) {
    var n = a.nextElementSibling;
    return n && n.tagName === 'UL' ? n : null;
  }

  function parentOf(tree, a) {
    var ul = a.parentElement && a.parentElement.parentElement;
    return !ul || ul === tree ? null : ul.previousElementSibling;
  }

  function nodes(tree) {
    return Array.prototype.filter.call(tree.querySelectorAll('li > a'), function (a) {
      return a.closest('.tree') === tree;
    });
  }

  /* The nodes showing, in order: every node whose ancestors are all open. */
  function showing(tree) {
    var out = [];
    (function walk(ul) {
      Array.prototype.forEach.call(ul.children, function (li) {
        var a = li.querySelector(':scope > a');
        if (!a) return;
        out.push(a);
        var g = groupOf(a);
        if (g && a.getAttribute('aria-expanded') !== 'false') walk(g);
      });
    })(tree);
    return out;
  }

  /* Gives a tree, and any nodes added to it since, their roles, toggles and
     tab stops. It can run again at any time. */
  function enhance(tree) {
    tree.setAttribute('role', 'tree');
    var all = nodes(tree);
    all.forEach(function (a) {
      a.parentElement.setAttribute('role', 'none');
      a.setAttribute('role', 'treeitem');
      var level = 1;
      for (var p = parentOf(tree, a); p; p = parentOf(tree, p)) level++;
      a.setAttribute('aria-level', String(level));
      var g = groupOf(a);
      if (g) {
        g.setAttribute('role', 'group');
        if (!g.id) g.id = 'pudl-tree-' + (++uid);
        a.setAttribute('aria-owns', g.id);
        if (!a.hasAttribute('aria-expanded')) a.setAttribute('aria-expanded', 'true');
      }
      var has = a.firstElementChild && a.firstElementChild.matches('.tree-toggle, .tree-spacer');
      if (!has) {
        var mark = document.createElement('span');
        mark.className = a.hasAttribute('aria-expanded') ? 'tree-toggle' : 'tree-spacer';
        mark.setAttribute('aria-hidden', 'true');
        a.insertBefore(mark, a.firstChild);
      }
      /* A link is focusable by default, so a node new to the tree is taken
         out of the Tab order by its missing attribute, not its tabIndex. */
      if (!a.hasAttribute('tabindex')) a.tabIndex = -1;
    });
    var stops = all.filter(function (a) { return a.getAttribute('tabindex') === '0'; });
    if (stops.length !== 1) {
      var vis = showing(tree);
      var cur = vis.filter(function (a) {
        var c = a.getAttribute('aria-current');
        return c && c !== 'false';
      })[0];
      all.forEach(function (a) { a.tabIndex = -1; });
      if (cur || vis[0]) (cur || vis[0]).tabIndex = 0;
    }
    tree.classList.add('tree-ready');
  }

  function focusNode(tree, a) {
    if (!a) return;
    nodes(tree).forEach(function (n) { if (n !== a) n.tabIndex = -1; });
    a.tabIndex = 0;
    a.focus();
  }

  function toggle(a, open) {
    if (!a.hasAttribute('aria-expanded') || (a.getAttribute('aria-expanded') === 'true') === open) return;
    a.setAttribute('aria-expanded', String(open));
    a.dispatchEvent(new CustomEvent('pudl:tree-toggle', { bubbles: true, detail: { open: open } }));
  }

  function treeOf(el) {
    var t = el && el.closest && el.closest('.tree');
    return t && t.classList.contains('tree-ready') ? t : null;
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('.tree-toggle');
    var tree = treeOf(t);
    if (!tree) return;
    var a = t.parentElement;
    e.preventDefault();
    toggle(a, a.getAttribute('aria-expanded') !== 'true');
    focusNode(tree, a);
  });

  document.addEventListener('keydown', function (e) {
    var a = e.target;
    var tree = treeOf(a);
    if (!tree || a.getAttribute('role') !== 'treeitem' || e.altKey || e.ctrlKey || e.metaKey) return;
    enhance(tree);
    var list = showing(tree);
    var i = list.indexOf(a);
    var open = a.getAttribute('aria-expanded');
    var rtl = getComputedStyle(tree).direction === 'rtl';
    var key = e.key;
    if (rtl && key === 'ArrowRight') key = 'ArrowLeft';
    else if (rtl && key === 'ArrowLeft') key = 'ArrowRight';

    if (key === 'ArrowDown') focusNode(tree, list[i + 1]);
    else if (key === 'ArrowUp') focusNode(tree, list[i - 1]);
    else if (key === 'Home') focusNode(tree, list[0]);
    else if (key === 'End') focusNode(tree, list[list.length - 1]);
    else if (key === 'ArrowRight') {
      if (open === 'false') toggle(a, true);
      else if (open === 'true') focusNode(tree, groupOf(a) && groupOf(a).querySelector(':scope > li > a'));
    } else if (key === 'ArrowLeft') {
      if (open === 'true') toggle(a, false);
      else focusNode(tree, parentOf(tree, a));
    } else if (key.length === 1 && key !== ' ') {
      /* Type-ahead: the next node showing whose name starts with what has
         been typed, searching on from this one. */
      var now = Date.now();
      typed = (now - typedAt > TYPE_RESET ? '' : typed) + key.toLowerCase();
      typedAt = now;
      var from = typed.length === 1 ? i + 1 : i;
      for (var n = 0; n < list.length; n++) {
        var c = list[(from + n) % list.length];
        if (c.textContent.trim().toLowerCase().indexOf(typed) === 0) { focusNode(tree, c); break; }
      }
    } else return;
    e.preventDefault();
  });

  function init() { document.querySelectorAll('.tree').forEach(enhance); }
  window.pudlTree = { enhance: enhance };
  document.addEventListener('pudl:window-open', init);
  document.addEventListener('pudl:regions-swap', init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
