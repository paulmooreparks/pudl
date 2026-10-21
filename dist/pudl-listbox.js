/* PUDL list boxes. Load with defer.

   A list box is a list in a form from which the reader chooses one item
   or several, where a select is too small and check boxes too many. Its
   markup is a native select showing several rows, marked data-listbox:

     <div class="form-group">
       <label class="form-label" for="accounts">Accounts</label>
       <select class="form-select" id="accounts" name="accounts" multiple size="6" data-listbox>
         <option value="bill" selected>Billable</option>
         <optgroup label="Overhead">
           <option value="int">Internal</option>
           …
         </optgroup>
       </select>
     </div>

   Without this script it is the browser's own list. With it, the select
   is hidden, and a sunken list of rows stands in its place, as many rows
   tall as the select's size (six where it has none) and scrolling beyond
   that. The hidden select keeps the value, the name, required and
   disabled, and it is what the form sends. Each row of a list that takes
   several choices holds a check box, and each row of a list that takes
   one holds a radio button, because choosing in a list box sets state
   and those are the controls that invite a press to set it. They are
   drawings for the eye; the row itself is the option a screen reader
   hears, with aria-selected. An optgroup becomes a heading over its rows.

   The loudest complaint about the browser's list is that choosing several
   takes Ctrl and a click, which few people know, and that one plain click
   without it throws every other choice away. Here a press, or Space,
   switches the one row it is on and leaves the others as they were.
   Shift and a press, Shift+Space, or Shift with Up, Down, Home, End,
   PageUp or PageDown sets every row from the last row switched to the
   row the keyboard is on to what that last row was given, so a range can
   be chosen or let go. Ctrl+A (Cmd+A on a Mac) chooses every row, and,
   when every row is already chosen, chooses none. In a list that takes
   one choice, the choice follows the keyboard: Up, Down, Home, End,
   PageUp, PageDown and typing a row's first letters move to a row and
   choose it, and a press chooses the row pressed.

   The list is one stop in the Tab order. Up and Down move from row to
   row, Home and End to the first and the last, PageUp and PageDown by as
   many rows as the list shows, and letters typed in quick succession move
   to the next row whose words begin with them. The row the keyboard is on
   is lit as a focused menu row is, and it is the list's
   aria-activedescendant. A disabled option is dimmed and can be reached,
   but not chosen.

   Every choice the reader makes sets the options' selected and fires
   input and change on the select, once for each press or key. A script
   that adds, removes or disables options, or sets the selected attribute,
   is seen at once; a script that sets an option's selected property or
   the select's value calls pudlListbox.refresh(select) afterwards, or
   fires change on the select, since the browser reports neither. A form's
   reset is seen as well. pudlListbox.enhance(root) takes in lists added
   later. (0.74.0) */
(function () {
  'use strict';

  var uid = 0;
  var TYPEAHEAD_MS = 600;

  function fire(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function Listbox(select) {
    var id = 'pudl-listbox-' + (++uid);
    var box = document.createElement('div');
    box.className = 'listbox';
    box.id = id;
    box.setAttribute('role', 'listbox');
    var rows = [];      /* One per option, in the select's order, each { el, mark, option }. */
    var active = -1;    /* The row the keyboard is on. */
    var anchor = -1;    /* The last row the reader switched, where a range starts. */
    var anchorOn = true;
    var before = null;  /* Which options were chosen when the anchor was set, for ranges. */
    var typed = '', typedAt = 0;

    function multiple() { return select.multiple; }
    function enabled(i) { var o = rows[i] && rows[i].option; return !!o && !o.disabled && !(o.parentNode && o.parentNode.disabled); }

    /* The select's label is the list's label. A label's for cannot point
       at a div, so the list is labelled by the label's id, and pressing
       the label puts the keyboard in the list as it would in the select. */
    function label() {
      var ids = [];
      if (select.id) {
        document.querySelectorAll('label[for="' + CSS.escape(select.id) + '"]').forEach(function (l) {
          if (!l.id) l.id = id + '-label';
          ids.push(l.id);
          if (!l.__pudlListbox) {
            l.__pudlListbox = true;
            l.addEventListener('click', function (e) { e.preventDefault(); if (!select.disabled) box.focus(); });
          }
        });
      }
      if (select.hasAttribute('aria-labelledby')) ids = select.getAttribute('aria-labelledby').split(/\s+/);
      if (ids.length) box.setAttribute('aria-labelledby', ids.join(' '));
      else if (select.hasAttribute('aria-label')) box.setAttribute('aria-label', select.getAttribute('aria-label'));
      if (select.hasAttribute('aria-describedby')) box.setAttribute('aria-describedby', select.getAttribute('aria-describedby'));
    }

    function makeRow(option, i) {
      var row = document.createElement('div');
      row.className = 'listbox-row';
      row.id = id + '-' + i;
      row.setAttribute('role', 'option');
      var mark = document.createElement('input');
      mark.type = multiple() ? 'checkbox' : 'radio';
      mark.tabIndex = -1;
      mark.setAttribute('aria-hidden', 'true');
      var text = document.createElement('span');
      text.className = 'listbox-text';
      text.textContent = option.label || option.textContent.trim();
      row.appendChild(mark);
      row.appendChild(text);
      return { el: row, mark: mark, option: option };
    }

    /* Draws the list again from the select, keeping the row the keyboard
       is on where it can. */
    function build() {
      var was = rows[active] && rows[active].option;
      box.textContent = '';
      rows = [];
      var groups = 0;
      Array.prototype.forEach.call(select.children, function (child) {
        if (child.tagName === 'OPTION') {
          var r = makeRow(child, rows.length);
          rows.push(r);
          box.appendChild(r.el);
        } else if (child.tagName === 'OPTGROUP') {
          var g = document.createElement('div');
          g.setAttribute('role', 'group');
          var head = document.createElement('div');
          head.className = 'listbox-group';
          head.id = id + '-g' + (++groups);
          head.setAttribute('role', 'presentation');
          head.textContent = child.label;
          g.setAttribute('aria-labelledby', head.id);
          g.appendChild(head);
          Array.prototype.forEach.call(child.children, function (o) {
            if (o.tagName !== 'OPTION') return;
            var r = makeRow(o, rows.length);
            rows.push(r);
            g.appendChild(r.el);
          });
          box.appendChild(g);
        }
      });
      active = -1;
      if (was) rows.forEach(function (r, i) { if (r.option === was) active = i; });
      if (anchor >= rows.length) anchor = -1;
      paint();
    }

    /* Shows the select's state: which rows are chosen and disabled, and
       the list's own state, from its select. */
    function paint() {
      var many = multiple();
      if (many) box.setAttribute('aria-multiselectable', 'true'); else box.removeAttribute('aria-multiselectable');
      box.style.setProperty('--listbox-rows', String(select.size > 1 ? select.size : 6));
      if (select.required) box.setAttribute('aria-required', 'true'); else box.removeAttribute('aria-required');
      if (select.disabled) { box.setAttribute('aria-disabled', 'true'); box.tabIndex = -1; }
      else { box.removeAttribute('aria-disabled'); box.tabIndex = 0; }
      rows.forEach(function (r, i) {
        var on = r.option.selected;
        r.el.setAttribute('aria-selected', on ? 'true' : 'false');
        if (enabled(i)) r.el.removeAttribute('aria-disabled'); else r.el.setAttribute('aria-disabled', 'true');
        if (r.mark.type !== (many ? 'checkbox' : 'radio')) r.mark.type = many ? 'checkbox' : 'radio';
        r.mark.checked = on;
        r.mark.disabled = !enabled(i) || select.disabled;
      });
      if (select.validity && select.validity.valid) box.removeAttribute('aria-invalid');
      setActive(active, true);
    }

    function setActive(i, quiet) {
      if (rows[active]) rows[active].el.classList.remove('is-active');
      active = rows[i] ? i : -1;
      if (active < 0) { box.removeAttribute('aria-activedescendant'); return; }
      rows[active].el.classList.add('is-active');
      box.setAttribute('aria-activedescendant', rows[active].el.id);
      if (!quiet) reveal(rows[active].el);
    }
    /* Scrolls the list, and only the list, to show a row. A row under a
       group's heading brings the heading into view with it when it is
       the group's first. */
    function reveal(el) {
      var origin = box.getBoundingClientRect().top + box.clientTop - box.scrollTop;
      var r = el.getBoundingClientRect();
      var top = r.top - origin, bottom = r.bottom - origin;
      var group = el.parentNode !== box ? el.parentNode : null;
      if (group && group.querySelector('.listbox-row') === el) top = group.getBoundingClientRect().top - origin;
      var pad = parseFloat(getComputedStyle(box).paddingTop) || 0;
      if (top - pad < box.scrollTop) box.scrollTop = top - pad;
      else if (bottom + pad > box.scrollTop + box.clientHeight) box.scrollTop = bottom + pad - box.clientHeight;
    }

    /* As the browser's list does, the list opens scrolled to its first
       chosen row. */
    function showChosen() {
      box.scrollTop = 0;
      for (var k = 0; k < rows.length; k++) if (rows[k].option.selected) { reveal(rows[k].el); return; }
    }

    function chosen() { return rows.map(function (r) { return r.option.selected; }); }
    function differs(was) { return rows.some(function (r, i) { return r.option.selected !== was[i]; }); }
    /* Ends one action of the reader's: if any choice changed, the select
       hears input and change once. */
    function done(was) {
      paint();
      if (differs(was)) fire(select);
    }

    function setAnchor(i) {
      anchor = i;
      anchorOn = rows[i] ? rows[i].option.selected : true;
      before = chosen();
    }
    /* Every enabled row from the anchor to row i takes the state the
       anchor was given, and every other row goes back to how it was when
       the anchor was set, so a range shrinks as well as grows. */
    function range(i) {
      if (anchor < 0 || !before) { setAnchor(active >= 0 ? active : i); }
      var lo = Math.min(anchor, i), hi = Math.max(anchor, i);
      rows.forEach(function (r, k) {
        if (!enabled(k)) return;
        r.option.selected = k >= lo && k <= hi ? anchorOn : before[k];
      });
    }
    function toggle(i) {
      if (!enabled(i)) return;
      rows[i].option.selected = !rows[i].option.selected;
      setAnchor(i);
    }
    function chooseOne(i) {
      if (!enabled(i)) return;
      if (!rows[i].option.selected) rows[i].option.selected = true;
    }

    /* Moves the keyboard to row i, choosing as the kind of list and the
       keys held say. */
    function moveTo(i, e) {
      if (!rows.length) return;
      i = Math.max(0, Math.min(rows.length - 1, i));
      var was = chosen();
      setActive(i);
      if (multiple()) { if (e && e.shiftKey) range(i); }
      else chooseOne(i);
      done(was);
    }
    function page() {
      var r = rows[0] && rows[0].el.offsetHeight;
      return r ? Math.max(1, Math.floor(box.clientHeight / r) - 1) : 5;
    }
    function find(text, from) {
      text = text.toLowerCase();
      for (var n = 0; n < rows.length; n++) {
        var k = (from + n) % rows.length;
        if (rows[k].el.textContent.trim().toLowerCase().indexOf(text) === 0) return k;
      }
      return -1;
    }

    box.addEventListener('keydown', function (e) {
      if (select.disabled) return;
      var mod = e.ctrlKey || e.metaKey;
      var start = active < 0 ? -1 : active;
      if (mod && !e.altKey && (e.key === 'a' || e.key === 'A')) {
        if (!multiple()) return;
        e.preventDefault();
        var was = chosen();
        var choosable = rows.filter(function (r, k) { return enabled(k); });
        var all = choosable.every(function (r) { return r.option.selected; });
        choosable.forEach(function (r) { r.option.selected = !all; });
        if (active >= 0) setAnchor(active);
        done(was);
        return;
      }
      if (e.altKey || (mod && e.key !== 'Home' && e.key !== 'End')) return;
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); moveTo(start + 1, e); return;
        case 'ArrowUp': e.preventDefault(); moveTo(start < 0 ? 0 : start - 1, e); return;
        case 'Home': e.preventDefault(); moveTo(0, e); return;
        case 'End': e.preventDefault(); moveTo(rows.length - 1, e); return;
        case 'PageDown': e.preventDefault(); moveTo((start < 0 ? 0 : start) + page(), e); return;
        case 'PageUp': e.preventDefault(); moveTo((start < 0 ? 0 : start) - page(), e); return;
        case ' ':
          if (typed && Date.now() - typedAt < TYPEAHEAD_MS) break;
          e.preventDefault();
          if (active < 0) { setActive(0); }
          var was2 = chosen();
          if (multiple()) { if (e.shiftKey) range(active); else toggle(active); }
          else chooseOne(active);
          done(was2);
          return;
      }
      if (e.key.length === 1 && !mod) {
        var now = Date.now();
        typed = now - typedAt < TYPEAHEAD_MS ? typed + e.key : e.key;
        typedAt = now;
        /* The same letter again moves on to the next row it begins;
           letters that grow a word stay on a row that still matches. */
        var same = typed.length > 1 && typed.split('').every(function (c) { return c === typed[0]; });
        var hit = same ? find(typed[0], start + 1) : find(typed, typed.length > 1 ? Math.max(0, start) : start + 1);
        if (hit >= 0) { e.preventDefault(); moveTo(hit, null); }
      }
    });

    box.addEventListener('mousedown', function (e) {
      /* The press keeps the keyboard in the list rather than on the
         drawn check box, and a Shift+press selects no text. */
      e.preventDefault();
      if (!select.disabled) box.focus({ preventScroll: true });
    });
    box.addEventListener('click', function (e) {
      if (select.disabled) return;
      var row = e.target.closest && e.target.closest('.listbox-row');
      if (!row || !box.contains(row)) return;
      var i = -1;
      rows.forEach(function (r, k) { if (r.el === row) i = k; });
      if (i < 0) return;
      var was = chosen();
      setActive(i);
      if (!enabled(i)) { paint(); return; }
      if (multiple()) { if (e.shiftKey) range(i); else toggle(i); }
      else chooseOne(i);
      done(was);
    });
    box.addEventListener('focus', function () {
      paint();
      if (active < 0 && rows.length) {
        var first = -1;
        rows.forEach(function (r, k) { if (first < 0 && r.option.selected) first = k; });
        setActive(first >= 0 ? first : 0);
      }
    });

    /* The select keeps the value, so the list is drawn from it whenever it
       may have changed. */
    var redraw = function () { build(); };
    new MutationObserver(function (list) {
      var structural = list.some(function (m) {
        return m.type === 'childList' || m.attributeName === 'label' || m.attributeName === 'multiple' || m.target !== select;
      });
      if (structural) build(); else paint();
    }).observe(select, { attributes: true, attributeFilter: ['disabled', 'required', 'multiple', 'size', 'selected', 'label'], childList: true, subtree: true, characterData: true });
    select.addEventListener('change', paint);
    select.addEventListener('input', paint);
    select.addEventListener('invalid', function () {
      box.setAttribute('aria-invalid', 'true');
      box.focus();
    });
    var form = select.form;
    if (form) form.addEventListener('reset', function () { setTimeout(function () { anchor = -1; before = null; paint(); showChosen(); }, 0); });
    select.__pudlListboxSync = redraw;

    label();
    build();
    var outer = select.closest('.form-select-wrap') || select;
    outer.parentNode.insertBefore(box, outer.nextSibling);
    outer.hidden = true;
    if (outer !== select) select.hidden = true;
    showChosen();
  }

  function enhanceOne(select) {
    if (select.__pudlListbox || !(select.multiple || select.size > 1)) return;
    select.__pudlListbox = true;
    new Listbox(select);
  }

  function enhance(root) {
    root = root || document;
    if (root.matches && root.matches('select[data-listbox]')) enhanceOne(root);
    root.querySelectorAll('select[data-listbox]').forEach(enhanceOne);
  }

  window.pudlListbox = {
    enhance: enhance,
    refresh: function (select) { if (select && select.__pudlListboxSync) select.__pudlListboxSync(); }
  };
  document.addEventListener('pudl:window-open', function (e) { enhance(e.target); });
  document.addEventListener('pudl:regions-swap', function () { enhance(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { enhance(); });
  else enhance();
})();
