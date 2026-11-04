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

  function attr(el, name, value) {
    if (el.getAttribute(name) !== value) el.setAttribute(name, value);
  }

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
    attr(tree, 'role', 'tree');
    var all = nodes(tree);
    all.forEach(function (a) {
      attr(a.parentElement, 'role', 'none');
      attr(a, 'role', 'treeitem');
      var level = 1;
      for (var p = parentOf(tree, a); p; p = parentOf(tree, p)) level++;
      attr(a, 'aria-level', String(level));
      var g = groupOf(a);
      if (g) {
        attr(g, 'role', 'group');
        if (!g.id) g.id = 'pudl-tree-' + (++uid);
        attr(a, 'aria-owns', g.id);
        if (!a.hasAttribute('aria-expanded')) attr(a, 'aria-expanded', 'true');
      }
      var has = a.firstElementChild && a.firstElementChild.matches('.tree-toggle, .tree-spacer');
      if (!has) {
        var mark = document.createElement('span');
        mark.className = a.hasAttribute('aria-expanded') ? 'tree-toggle' : 'tree-spacer';
        attr(mark, 'aria-hidden', 'true');
        a.insertBefore(mark, a.firstChild);
      }
      nameToggle(tree, a);
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
      all.forEach(function (a) { if (a.tabIndex !== -1) a.tabIndex = -1; });
      if (cur || vis[0]) (cur || vis[0]).tabIndex = 0;
    }
    if (!tree.classList.contains('tree-ready')) tree.classList.add('tree-ready');
  }

  function focusNode(tree, a) {
    if (!a) return;
    nodes(tree).forEach(function (n) { if (n !== a && n.tabIndex !== -1) n.tabIndex = -1; });
    if (a.tabIndex !== 0) a.tabIndex = 0;
    a.focus();
  }

  /* On a tree marked data-tree-toggles="buttons" (0.96.9) each toggle is a
     named button for assistive technology and the pointer: a role of
     button, out of the Tab order since the node's keys open and close it,
     named "Expand" or "Collapse" and the node's name, from data-tree-label
     on the link or else its words. data-tree-text-expand and -collapse on
     the tree give the words. Elsewhere the toggle stays decorative. */
  function nameToggle(tree, a) {
    var mark = a.firstElementChild;
    if (!mark || !mark.classList.contains('tree-toggle')) return;
    if (tree.getAttribute('data-tree-toggles') !== 'buttons') {
      if (mark.getAttribute('aria-hidden') !== 'true') { attr(mark, 'aria-hidden', 'true'); mark.removeAttribute('role'); mark.removeAttribute('tabindex'); mark.removeAttribute('aria-label'); mark.removeAttribute('aria-expanded'); }
      return;
    }
    var open = a.getAttribute('aria-expanded') === 'true';
    var words = tree.getAttribute(open ? 'data-tree-text-collapse' : 'data-tree-text-expand') || (open ? 'Collapse' : 'Expand');
    var name = a.getAttribute('data-tree-label') || Array.prototype.filter.call(a.childNodes, function (n) { return n !== mark; }).map(function (n) { return n.textContent; }).join('').replace(/\s+/g, ' ').trim();
    mark.removeAttribute('aria-hidden');
    attr(mark, 'role', 'button');
    attr(mark, 'tabindex', '-1');
    attr(mark, 'aria-expanded', String(open));
    attr(mark, 'aria-label', words + (name ? ' ' + name : ''));
  }

  function toggle(a, open) {
    if (!a.hasAttribute('aria-expanded') || (a.getAttribute('aria-expanded') === 'true') === open) return;
    attr(a, 'aria-expanded', String(open));
    var tree = a.closest('.tree');
    if (tree) nameToggle(tree, a);
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
  /* A window that opens is set up on its own, not the whole page again (0.69.3). */
  document.addEventListener('pudl:window-open', function (e) { e.target.querySelectorAll('.tree').forEach(enhance); });
  document.addEventListener('pudl:regions-swap', init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
