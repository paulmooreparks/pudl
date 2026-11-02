/* PUDL reorderable lists (0.97.0). Load with defer.

   A list whose items a reader may put in their own order is marked
   data-reorder. Its items are its child elements, whatever they are: li
   in a ul, rows in a div, sections in a pane. The list is in reorder mode
   while the attribute is "on", and out of it otherwise:

     <ul class="..." data-reorder="off" data-reorder-done="done-btn">
       <li data-reorder-id="inbox" data-reorder-fixed>Inbox</li>
       <li data-reorder-id="sources">Sources</li>
       <li data-reorder-id="chats" data-reorder-label="Chats">…</li>
     </ul>

   A host sets data-reorder="on", or calls pudlReorder.on(list), to start,
   and "off", or pudlReorder.off(list), to stop; the attribute is the
   state, so a page rendered with it on starts in the mode. While it is on
   the list carries data-reorder-active, whose value is its axis, x or y,
   under which the host hides what it wants hidden, such as each item's
   body; PUDL hides nothing, so it restores nothing. A list in a row is
   read as x, any other as y, and data-reorder-axis on the list says so
   where the layout does not.

   Each item that may move gains a grip, a button.reorder-grip drawn with
   the grip glyph and named "Move" and the item's name, from its
   data-reorder-label or else its words. The grip stands at the item's
   start, or inside an element of the item marked data-reorder-grip, so a
   host can put it where the item's own leading control stands and hide
   that control under data-reorder-active. An item marked
   data-reorder-fixed has no grip and keeps its place: the movable items
   move among the places the fixed ones leave, so a pinned first item
   stays first.

   The grip is the handle. Pressed and dragged, by mouse, pen or touch,
   its item follows the pointer along the list, and the item it will land
   before carries data-drop-target, PUDL's mark for a drop, or the list
   does when it will land last; letting go puts it there, and Escape puts
   it back. With a grip focused, Up and Down move the item one place (Left
   and Right in a list laid out in a row, mirrored right to left), Home
   and End to the ends, and Escape ends the mode. Each move is announced,
   "{name} moved to position {position} of {count}", and focus stays on
   the moved item's grip; nothing else on the page moves or scrolls.

   Before each move the list fires a cancelable, bubbling pudl:reorder
   with detail.order, the items' data-reorder-id values, or for an item
   with none its former position counting from 0, in the new order, and
   detail.item, the item moved. PUDL then moves the elements, so a page
   the server drew needs nothing more; a host that draws the list from its
   own model cancels the event and draws it again. The host saves the
   order. pudl:reorder-mode fires on the list, bubbling, with detail.on,
   as the mode starts and ends.

   data-reorder-done on the list gives the id of a control, such as a Done
   button, that ends the mode when pressed. The words are the list's:
   data-reorder-text-grip ("Move {name}"), -moved ("{name} moved to
   position {position} of {count}."), -keys (the grip's description) and
   -list and -item (what a screen reader calls the list and an item). */
(function () {
  'use strict';

  var LIST = '[data-reorder]';
  var THRESHOLD = 4;
  var active = new Set();
  var observers = new WeakMap();
  var live = null, keysEl = null;

  function text(list, key, fallback, values) {
    var s = list.getAttribute('data-reorder-text-' + key) || fallback;
    return s.replace(/\{([a-z]+)\}/g, function (all, k) { return values && Object.prototype.hasOwnProperty.call(values, k) ? String(values[k]) : all; });
  }
  function isOn(list) { return list.getAttribute('data-reorder') === 'on'; }
  function items(list) { return Array.prototype.filter.call(list.children, function (c) { return c.tagName !== 'TEMPLATE' && c.tagName !== 'SCRIPT'; }); }
  function movable(it) { return !it.hasAttribute('data-reorder-fixed'); }
  function gripOf(it) { return it.querySelector('.reorder-grip'); }
  /* An item's name: its data-reorder-label, else the words it shows,
     leaving out what is hidden from sight or from a screen reader and the
     words of its buttons and fields, which name those and not the item. */
  var SKIP = '.reorder-grip, [aria-hidden="true"], button, input, select, textarea, [role="button"]';
  function nameOf(it) {
    var label = it.getAttribute('data-reorder-label');
    if (label) return label.trim();
    var words = [], walk = document.createTreeWalker(it, NodeFilter.SHOW_TEXT), n;
    while ((n = walk.nextNode())) {
      var host = n.parentElement;
      if (!host || (host !== it && host.closest(SKIP) && it.contains(host.closest(SKIP))) || !host.getClientRects().length) continue;
      words.push(n.nodeValue);
    }
    return words.join(' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  }
  /* A role a screen reader can describe: a list or list item by tag or
     by an explicit role. A generic element takes no role description. */
  function described(el) { return el.hasAttribute('role') || /^(UL|OL|LI)$/.test(el.tagName); }
  function horizontal(list) {
    var axis = list.getAttribute('data-reorder-axis');
    if (axis) return axis === 'x';
    var cs = getComputedStyle(list);
    return /flex/.test(cs.display) && /^row/.test(cs.flexDirection);
  }
  function rtl(list) { return getComputedStyle(list).direction === 'rtl'; }

  function announce(words) {
    if (!live) {
      live = document.createElement('div');
      live.className = 'visually-hidden';
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      document.body.appendChild(live);
    }
    live.textContent = '';
    setTimeout(function () { live.textContent = words; }, 50);
  }
  function keysFor(list) {
    var custom = list.getAttribute('data-reorder-text-keys');
    if (custom) {
      if (!list.__reorderKeys) {
        var el = document.createElement('span');
        el.className = 'visually-hidden';
        el.id = 'pudl-reorder-keys-' + Math.random().toString(36).slice(2);
        document.body.appendChild(el);
        list.__reorderKeys = el;
      }
      if (list.__reorderKeys.textContent !== custom) list.__reorderKeys.textContent = custom;
      return list.__reorderKeys.id;
    }
    if (!keysEl) {
      keysEl = document.createElement('span');
      keysEl.className = 'visually-hidden';
      keysEl.id = 'pudl-reorder-keys';
      keysEl.textContent = 'Use the arrow keys to move it, Home and End to move it to the ends.';
      document.body.appendChild(keysEl);
    }
    return keysEl.id;
  }
  function setAttr(el, name, value) { if (el.getAttribute(name) !== value) el.setAttribute(name, value); }

  /* === The mode =========================================================== */

  function sync(list) {
    var on = isOn(list) && list.isConnected;
    var was = active.has(list);
    if (on) {
      if (!was) {
        active.add(list);
        list.setAttribute('data-reorder-active', horizontal(list) ? 'x' : 'y');
        if (described(list)) list.setAttribute('aria-roledescription', text(list, 'list', 'reorderable list'));
        var mo = new MutationObserver(function () { if (active.has(list)) dress(list); });
        mo.observe(list, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-reorder-fixed', 'data-reorder-label', 'data-reorder-grip'] });
        observers.set(list, mo);
      }
      dress(list);
      if (!was) list.dispatchEvent(new CustomEvent('pudl:reorder-mode', { bubbles: true, detail: { on: true } }));
    } else if (was) {
      active.delete(list);
      var o = observers.get(list); if (o) { o.disconnect(); observers.delete(list); }
      if (drag && drag.list === list) cancelDrag();
      var focusWas = list.contains(document.activeElement) && document.activeElement.classList.contains('reorder-grip') ? document.activeElement.closest(LIST + ' > *') : null;
      items(list).forEach(function (it) {
        var g = gripOf(it); if (g) g.remove();
        if (it.getAttribute('aria-roledescription') === text(list, 'item', 'movable item')) it.removeAttribute('aria-roledescription');
      });
      list.removeAttribute('data-reorder-active');
      if (list.getAttribute('aria-roledescription') === text(list, 'list', 'reorderable list')) list.removeAttribute('aria-roledescription');
      if (focusWas) refocus(list, focusWas);
      list.dispatchEvent(new CustomEvent('pudl:reorder-mode', { bubbles: true, detail: { on: false } }));
    }
  }

  /* Focus that was on a grip as the mode ends goes to the first thing in
     its item that takes focus, else to the list. */
  function refocus(list, item) {
    var t = item && item.isConnected ? item.querySelector('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') : null;
    if (!t) { if (!list.hasAttribute('tabindex')) list.tabIndex = -1; t = list; }
    t.focus({ preventScroll: true });
  }

  /* Each movable item has a grip; a fixed one has none. */
  function dress(list) {
    var keys = keysFor(list);
    items(list).forEach(function (it) {
      var g = gripOf(it);
      if (!movable(it)) {
        if (g) g.remove();
        return;
      }
      if (described(it)) setAttr(it, 'aria-roledescription', text(list, 'item', 'movable item'));
      var slot = it.querySelector('[data-reorder-grip]');
      if (!g) {
        g = document.createElement('button');
        g.type = 'button';
        g.className = 'reorder-grip';
        g.addEventListener('pointerdown', pointerDown);
        g.addEventListener('keydown', keyDown);
        g.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); });
      }
      if (slot ? g.parentElement !== slot : it.firstChild !== g) {
        if (slot) slot.appendChild(g); else it.insertBefore(g, it.firstChild);
      }
      setAttr(g, 'aria-label', text(list, 'grip', 'Move {name}', { name: nameOf(it) }));
      setAttr(g, 'aria-describedby', keys);
    });
  }

  /* === Moving ============================================================= */

  /* The new order of all items when the movable ones take a new order:
     the movable items fill the places they held, so the fixed ones keep
     theirs. */
  function withMovables(all, movables) {
    var out = all.slice(), i = 0;
    all.forEach(function (it, at) { if (movable(it)) out[at] = movables[i++]; });
    return out;
  }

  /* Puts the list's elements in the given order without moving keep, the
     item with focus or under the pointer, since moving an element takes
     focus from it: the items around it move instead, and only those that
     are out of place. */
  function arrange(list, order, keep) {
    var k = order.indexOf(keep), prev = keep, next = keep, j, i;
    for (j = k + 1; j < order.length; j++) {
      if (prev.nextElementSibling !== order[j]) list.insertBefore(order[j], prev.nextSibling);
      prev = order[j];
    }
    for (i = k - 1; i >= 0; i--) {
      if (next.previousElementSibling !== order[i]) list.insertBefore(order[i], next);
      next = order[i];
    }
  }

  function idOf(it, all) { var id = it.getAttribute('data-reorder-id'); return id != null ? id : all.indexOf(it); }

  /* Moves item so the movable items read as movables; true when it moved. */
  function commit(list, item, movables) {
    var all = items(list);
    var order = withMovables(all, movables);
    if (order.every(function (it, i) { return it === all[i]; })) return false;
    var ev = new CustomEvent('pudl:reorder', { bubbles: true, cancelable: true, detail: { order: order.map(function (it) { return idOf(it, all); }), item: item } });
    var go = list.dispatchEvent(ev);
    if (go) arrange(list, order, item);
    announce(text(list, 'moved', '{name} moved to position {position} of {count}.', { name: nameOf(item), position: order.indexOf(item) + 1, count: order.length }));
    return true;
  }

  function keyDown(e) {
    var g = e.currentTarget, item = g.closest(LIST + ' > *'), list = item && item.parentElement;
    if (!list || !active.has(list) || drag) return;
    if (e.key === 'Escape') { e.preventDefault(); off(list); return; }
    var x = horizontal(list), back = rtl(list);
    var step = 0, to = null;
    if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      if (e.key === (x ? (back ? 'ArrowRight' : 'ArrowLeft') : 'ArrowUp')) step = -1;
      else if (e.key === (x ? (back ? 'ArrowLeft' : 'ArrowRight') : 'ArrowDown')) step = 1;
      else if (e.key === 'Home') to = 'first';
      else if (e.key === 'End') to = 'last';
    }
    if (!step && !to) return;
    e.preventDefault();
    var movables = items(list).filter(movable), at = movables.indexOf(item);
    var others = movables.filter(function (m) { return m !== item; });
    var k = to === 'first' ? 0 : to === 'last' ? others.length : Math.max(0, Math.min(others.length, at + step));
    others.splice(k, 0, item);
    commit(list, item, others);
    if (document.activeElement !== g && g.isConnected) g.focus({ preventScroll: true });
  }

  /* === Dragging =========================================================== */

  var drag = null;

  function pointerDown(e) {
    if (e.button !== 0 || drag) return;
    var g = e.currentTarget, item = g.closest(LIST + ' > *'), list = item && item.parentElement;
    if (!list || !active.has(list)) return;
    e.preventDefault();
    g.focus({ preventScroll: true });
    try { g.setPointerCapture(e.pointerId); } catch (err) { /* a pointer the page did not see begin */ }
    drag = { list: list, item: item, grip: g, id: e.pointerId, x: e.clientX, y: e.clientY, started: false, k: null, axisX: horizontal(list), back: rtl(list) };
    g.addEventListener('pointermove', pointerMove);
    g.addEventListener('pointerup', pointerUp);
    g.addEventListener('pointercancel', cancelDrag);
    g.addEventListener('lostpointercapture', lostCapture);
  }

  function clearMarks() {
    if (!drag) return;
    drag.list.removeAttribute('data-drop-target');
    items(drag.list).forEach(function (it) { it.removeAttribute('data-drop-target'); });
  }

  /* Where the dragged item would land: before the first other movable item
     whose middle the pointer has not passed, in reading order, else last. */
  function landing(e) {
    var others = items(drag.list).filter(function (it) { return movable(it) && it !== drag.item; });
    var at = drag.axisX ? e.clientX : e.clientY;
    for (var j = 0; j < others.length; j++) {
      var r = others[j].getBoundingClientRect();
      var mid = drag.axisX ? r.left + r.width / 2 : r.top + r.height / 2;
      if (drag.axisX && drag.back ? at > mid : at < mid) return { k: j, others: others };
    }
    return { k: others.length, others: others };
  }

  function pointerMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.started) {
      if (Math.abs(drag.axisX ? dx : dy) < THRESHOLD) return;
      drag.started = true;
      drag.item.classList.add('dragging');
      document.addEventListener('keydown', escapeDrag, true);
    }
    drag.item.style.transform = drag.axisX ? 'translateX(' + dx + 'px)' : 'translateY(' + dy + 'px)';
    var l = landing(e);
    if (l.k !== drag.k) {
      clearMarks();
      drag.k = l.k;
      (l.k < l.others.length ? l.others[l.k] : drag.list).setAttribute('data-drop-target', '');
    }
  }

  function pointerUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag;
    if (!d.started) { endDrag(); return; }
    var l = landing(e);
    endDrag();
    l.others.splice(l.k, 0, d.item);
    commit(d.list, d.item, l.others);
    if (d.grip.isConnected) d.grip.focus({ preventScroll: true });
  }

  function escapeDrag(e) {
    if (e.key !== 'Escape' || !drag) return;
    e.preventDefault(); e.stopPropagation();
    cancelDrag();
  }
  function lostCapture() { if (drag && drag.started) cancelDrag(); else endDrag(); }
  function cancelDrag() { endDrag(); }

  function endDrag() {
    if (!drag) return;
    var d = drag;
    clearMarks();
    d.item.classList.remove('dragging');
    d.item.style.transform = '';
    if (!d.item.getAttribute('style')) d.item.removeAttribute('style');
    d.grip.removeEventListener('pointermove', pointerMove);
    d.grip.removeEventListener('pointerup', pointerUp);
    d.grip.removeEventListener('pointercancel', cancelDrag);
    d.grip.removeEventListener('lostpointercapture', lostCapture);
    document.removeEventListener('keydown', escapeDrag, true);
    try { if (d.grip.hasPointerCapture(d.id)) d.grip.releasePointerCapture(d.id); } catch (err) { /* already released */ }
    drag = null;
  }

  /* === Ending the mode from a Done control ================================ */

  document.addEventListener('click', function (e) {
    if (!active.size || !e.target.closest) return;
    active.forEach(function (list) {
      var id = list.getAttribute('data-reorder-done');
      if (id && e.target.closest('#' + CSS.escape(id))) off(list);
    });
  });

  /* === Public ============================================================= */

  function on(list) { if (list && list.matches(LIST)) list.setAttribute('data-reorder', 'on'); }
  function off(list) { if (list && list.matches(LIST)) list.setAttribute('data-reorder', 'off'); }
  function order(list) { var all = items(list); return all.map(function (it) { return idOf(it, all); }); }

  window.pudlReorder = { on: on, off: off, order: order };

  function start() {
    document.querySelectorAll(LIST).forEach(sync);
    new MutationObserver(function (records) {
      records.forEach(function (r) { if (r.target.matches && r.target.matches(LIST)) sync(r.target); else if (active.has(r.target)) sync(r.target); });
      active.forEach(function (list) { if (!list.isConnected) sync(list); });
    }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['data-reorder'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
