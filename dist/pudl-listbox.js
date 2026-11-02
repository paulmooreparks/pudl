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
   later. (0.74.0)

   A rich list box (0.97.0) holds rows the host writes, each with more
   than a line of words: a title, a second line and a badge, such as an
   execution-state badge. Its markup is the list itself:

     <div class="listbox" data-listbox="multiple" aria-label="Members" data-listbox-rows="8">
       <div class="listbox-group">Open</div>
       <div class="listbox-row" data-value="a1" aria-selected="true">
         <span class="listbox-title">Atlas</span>
         <span class="listbox-detail">Studio</span>
         <span class="badge" data-state="working">Working</span>
       </div>
       …
     </div>

   data-listbox is "multiple" or "single". A row's data-value is what it
   stands for, aria-selected="true" chooses it, and data-disabled makes it
   reachable but not choosable. A heading and the rows after it, up to the
   next heading, are wrapped in a div.listbox-section, a group, as the
   list is taken in, unless the host wrote them in one already. The keys,
   the presses and the choosing are the native-backed list's. A row or
   heading the host hides with hidden, as a find field filtering the list
   does, is out of every key: the arrows, Home and End, PageUp and
   PageDown, type-ahead, Shift ranges and Ctrl+A pass it by, and it keeps
   its choice; a section whose rows are all hidden hides with them. A
   change fires bubbling pudl:listbox-change on the list with
   detail.values. pudlListbox.value(list) gives the choice, an array for a
   multiple list and a value or null for a single one. data-listbox-for
   gives the id of a field in a form that takes the choice: a select's
   options are chosen to match, an input's value is the values joined by
   commas, and either hears input and change. data-disabled on the list
   disables it. */
(function () {
  'use strict';

  var uid = 0;
  var TYPEAHEAD_MS = 600;

  function fire(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /* What both kinds of list share: the row the keyboard is on, the keys,
     the presses and how a choice is made. The owner supplies the rows and
     how a row's choice is read and set:

       a.rows        the rows, each { el, mark }, in order
       a.multiple()  whether several may be chosen
       a.disabled()  whether the whole list is disabled
       a.isOn(i)     whether row i is chosen
       a.setOn(i, v) choose row i or let it go; a single list lets go of
                     the others itself
       a.enabled(i)  whether row i may be chosen
       a.paint()     show the rows' state
       a.changed()   say a change was made, once per action */
  function Core(box, a) {
    var active = -1;    /* The row the keyboard is on. */
    var anchor = -1;    /* The last row the reader switched, where a range starts. */
    var anchorOn = true;
    var before = null;  /* Which rows were chosen when the anchor was set, for ranges. */
    var typed = '', typedAt = 0;

    /* A row hidden by the host, or in a hidden section, is out of the
       keys. */
    function visible(i) {
      var r = a.rows[i];
      if (!r || r.el.hidden) return false;
      var s = r.el.parentElement;
      return !(s && s !== box && s.hidden);
    }
    function shown() { var out = []; for (var i = 0; i < a.rows.length; i++) if (visible(i)) out.push(i); return out; }

    function setActive(i, quiet) {
      if (a.rows[active]) a.rows[active].el.classList.remove('is-active');
      active = a.rows[i] ? i : -1;
      if (active < 0) { box.removeAttribute('aria-activedescendant'); return; }
      a.rows[active].el.classList.add('is-active');
      box.setAttribute('aria-activedescendant', a.rows[active].el.id);
      if (!quiet) reveal(a.rows[active].el);
    }
    /* Scrolls the list, and only the list, to show a row. A row under a
       group's heading brings the heading into view with it when it is
       the group's first. */
    function reveal(el) {
      var origin = box.getBoundingClientRect().top + box.clientTop - box.scrollTop;
      var r = el.getBoundingClientRect();
      var top = r.top - origin, bottom = r.bottom - origin;
      var group = el.parentNode !== box ? el.parentNode : null;
      if (group && group.querySelector('.listbox-row:not([hidden])') === el) top = group.getBoundingClientRect().top - origin;
      var pad = parseFloat(getComputedStyle(box).paddingTop) || 0;
      if (top - pad < box.scrollTop) box.scrollTop = top - pad;
      else if (bottom + pad > box.scrollTop + box.clientHeight) box.scrollTop = bottom + pad - box.clientHeight;
    }
    /* As the browser's list does, the list opens scrolled to its first
       chosen row. */
    function showChosen() {
      box.scrollTop = 0;
      for (var k = 0; k < a.rows.length; k++) if (visible(k) && a.isOn(k)) { reveal(a.rows[k].el); return; }
    }

    function chosen() { return a.rows.map(function (r, i) { return a.isOn(i); }); }
    function differs(was) { return a.rows.some(function (r, i) { return a.isOn(i) !== was[i]; }); }
    /* Ends one action of the reader's: if any choice changed, the owner
       says so once. */
    function done(was) {
      paint();
      if (differs(was)) a.changed();
    }
    function paint() { a.paint(); setActive(active, true); }

    function setAnchor(i) {
      anchor = i;
      anchorOn = a.rows[i] ? a.isOn(i) : true;
      before = chosen();
    }
    /* Every enabled row showing from the anchor to row i takes the state
       the anchor was given, and every other row goes back to how it was
       when the anchor was set, so a range shrinks as well as grows. A
       hidden row keeps its choice. */
    function range(i) {
      if (anchor < 0 || !before || before.length !== a.rows.length) setAnchor(active >= 0 ? active : i);
      var lo = Math.min(anchor, i), hi = Math.max(anchor, i);
      a.rows.forEach(function (r, k) {
        if (!a.enabled(k) || !visible(k)) return;
        var want = k >= lo && k <= hi ? anchorOn : before[k];
        if (a.isOn(k) !== want) a.setOn(k, want);
      });
    }
    function toggle(i) {
      if (!a.enabled(i)) return;
      a.setOn(i, !a.isOn(i));
      setAnchor(i);
    }
    function chooseOne(i) {
      if (!a.enabled(i)) return;
      if (!a.isOn(i)) a.setOn(i, true);
    }

    /* Moves the keyboard to the showing row at place p among those
       showing, choosing as the kind of list and the keys held say. */
    function moveTo(p, e) {
      var vis = shown();
      if (!vis.length) return;
      var i = vis[Math.max(0, Math.min(vis.length - 1, p))];
      var was = chosen();
      setActive(i);
      if (a.multiple()) { if (e && e.shiftKey) range(i); }
      else chooseOne(i);
      done(was);
    }
    function page() {
      var vis = shown(), r = vis.length && a.rows[vis[0]].el.offsetHeight;
      return r ? Math.max(1, Math.floor(box.clientHeight / r) - 1) : 5;
    }
    function words(i) { var t = a.rows[i].el.querySelector('.listbox-title, .listbox-text'); return (t || a.rows[i].el).textContent.trim().toLowerCase(); }
    /* The place, among the rows showing, of the next row from place from
       whose words begin with text. */
    function find(text, from) {
      text = text.toLowerCase();
      var vis = shown();
      for (var n = 0; n < vis.length; n++) {
        var k = (from + n) % vis.length;
        if (words(vis[k]).indexOf(text) === 0) return k;
      }
      return -1;
    }

    box.addEventListener('keydown', function (e) {
      if (a.disabled()) return;
      var mod = e.ctrlKey || e.metaKey;
      var vis = shown(), at = vis.indexOf(active);
      /* A key that moves or chooses ends a run of typed letters, so a
         Space after it chooses rather than types. */
      if (e.key.length !== 1 || mod) typed = '';
      if (mod && !e.altKey && (e.key === 'a' || e.key === 'A')) {
        if (!a.multiple()) return;
        e.preventDefault();
        var was = chosen();
        var choosable = vis.filter(function (k) { return a.enabled(k); });
        var all = choosable.every(function (k) { return a.isOn(k); });
        choosable.forEach(function (k) { if (a.isOn(k) === all) a.setOn(k, !all); });
        if (active >= 0) setAnchor(active);
        done(was);
        return;
      }
      if (e.altKey || (mod && e.key !== 'Home' && e.key !== 'End')) return;
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); moveTo(at + 1, e); return;
        case 'ArrowUp': e.preventDefault(); moveTo(at < 0 ? 0 : at - 1, e); return;
        case 'Home': e.preventDefault(); moveTo(0, e); return;
        case 'End': e.preventDefault(); moveTo(vis.length - 1, e); return;
        case 'PageDown': e.preventDefault(); moveTo((at < 0 ? 0 : at) + page(), e); return;
        case 'PageUp': e.preventDefault(); moveTo((at < 0 ? 0 : at) - page(), e); return;
        case ' ':
          if (typed && Date.now() - typedAt < TYPEAHEAD_MS) break;
          e.preventDefault();
          if (active < 0 || !visible(active)) { if (!vis.length) return; setActive(vis[0]); }
          var was2 = chosen();
          if (a.multiple()) { if (e.shiftKey) range(active); else toggle(active); }
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
        var hit = same ? find(typed[0], at + 1) : find(typed, typed.length > 1 ? Math.max(0, at) : at + 1);
        if (hit >= 0) { e.preventDefault(); moveTo(hit, null); }
      }
    });

    box.addEventListener('mousedown', function (e) {
      /* The press keeps the keyboard in the list rather than on the
         drawn check box, and a Shift+press selects no text. */
      e.preventDefault();
      if (!a.disabled()) box.focus({ preventScroll: true });
    });
    box.addEventListener('click', function (e) {
      if (a.disabled()) return;
      var row = e.target.closest && e.target.closest('.listbox-row');
      if (!row || !box.contains(row)) return;
      var i = -1;
      a.rows.forEach(function (r, k) { if (r.el === row) i = k; });
      if (i < 0) return;
      var was = chosen();
      setActive(i);
      if (!a.enabled(i)) { paint(); return; }
      if (a.multiple()) { if (e.shiftKey) range(i); else toggle(i); }
      else chooseOne(i);
      done(was);
    });
    box.addEventListener('focus', function () {
      paint();
      if (active < 0 || !visible(active)) {
        var vis = shown(), first = -1;
        vis.forEach(function (k) { if (first < 0 && a.isOn(k)) first = k; });
        setActive(first >= 0 ? first : (vis.length ? vis[0] : -1));
      }
    });

    return {
      paint: paint,
      showChosen: showChosen,
      /* The rows were drawn again: keep the keyboard on the same row
         where it still is. */
      rebuilt: function (keepEl) {
        active = -1;
        if (keepEl) a.rows.forEach(function (r, i) { if (r.el === keepEl) active = i; });
        if (anchor >= a.rows.length) anchor = -1;
        before = null;
        paint();
      },
      activeEl: function () { return a.rows[active] ? a.rows[active].el : null; },
      reset: function () { anchor = -1; before = null; }
    };
  }

  function mark(multiple) {
    var m = document.createElement('input');
    m.type = multiple ? 'checkbox' : 'radio';
    m.tabIndex = -1;
    m.setAttribute('aria-hidden', 'true');
    return m;
  }

  /* === A list box over a native select ==================================== */

  function Listbox(select) {
    var id = 'pudl-listbox-' + (++uid);
    var box = document.createElement('div');
    box.className = 'listbox';
    box.id = id;
    box.setAttribute('role', 'listbox');
    var a = {
      rows: [],          /* One per option, in the select's order, each { el, mark, option }. */
      multiple: function () { return select.multiple; },
      disabled: function () { return select.disabled; },
      isOn: function (i) { return !!a.rows[i] && a.rows[i].option.selected; },
      setOn: function (i, v) { a.rows[i].option.selected = v; },
      enabled: function (i) { var o = a.rows[i] && a.rows[i].option; return !!o && !o.disabled && !(o.parentNode && o.parentNode.disabled); },
      paint: paint,
      changed: function () { fire(select); }
    };
    var core = Core(box, a);

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
      var m = mark(select.multiple);
      var text = document.createElement('span');
      text.className = 'listbox-text';
      text.textContent = option.label || option.textContent.trim();
      row.appendChild(m);
      row.appendChild(text);
      return { el: row, mark: m, option: option };
    }

    /* Draws the list again from the select, keeping the row the keyboard
       is on where it can. */
    function build() {
      var wasEl = core.activeEl(), was = null;
      a.rows.forEach(function (r) { if (r.el === wasEl) was = r.option; });
      box.textContent = '';
      a.rows = [];
      var groups = 0;
      Array.prototype.forEach.call(select.children, function (child) {
        if (child.tagName === 'OPTION') {
          var r = makeRow(child, a.rows.length);
          a.rows.push(r);
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
            var r = makeRow(o, a.rows.length);
            a.rows.push(r);
            g.appendChild(r.el);
          });
          box.appendChild(g);
        }
      });
      var keep = null;
      a.rows.forEach(function (r) { if (r.option === was) keep = r.el; });
      core.rebuilt(keep);
    }

    /* Shows the select's state: which rows are chosen and disabled, and
       the list's own state, from its select. */
    function paint() {
      var many = select.multiple;
      if (many) box.setAttribute('aria-multiselectable', 'true'); else box.removeAttribute('aria-multiselectable');
      box.style.setProperty('--listbox-rows', String(select.size > 1 ? select.size : 6));
      if (select.required) box.setAttribute('aria-required', 'true'); else box.removeAttribute('aria-required');
      if (select.disabled) { box.setAttribute('aria-disabled', 'true'); box.tabIndex = -1; }
      else { box.removeAttribute('aria-disabled'); box.tabIndex = 0; }
      a.rows.forEach(function (r, i) {
        var on = r.option.selected;
        r.el.setAttribute('aria-selected', on ? 'true' : 'false');
        if (a.enabled(i)) r.el.removeAttribute('aria-disabled'); else r.el.setAttribute('aria-disabled', 'true');
        if (r.mark.type !== (many ? 'checkbox' : 'radio')) r.mark.type = many ? 'checkbox' : 'radio';
        r.mark.checked = on;
        r.mark.disabled = !a.enabled(i) || select.disabled;
      });
      if (select.validity && select.validity.valid) box.removeAttribute('aria-invalid');
    }

    /* The select keeps the value, so the list is drawn from it whenever it
       may have changed. */
    new MutationObserver(function (list) {
      var structural = list.some(function (m) {
        return m.type === 'childList' || m.attributeName === 'label' || m.attributeName === 'multiple' || m.target !== select;
      });
      if (structural) build(); else core.paint();
    }).observe(select, { attributes: true, attributeFilter: ['disabled', 'required', 'multiple', 'size', 'selected', 'label'], childList: true, subtree: true, characterData: true });
    select.addEventListener('change', core.paint);
    select.addEventListener('input', core.paint);
    select.addEventListener('invalid', function () {
      box.setAttribute('aria-invalid', 'true');
      box.focus();
    });
    var form = select.form;
    if (form) form.addEventListener('reset', function () { setTimeout(function () { core.reset(); core.paint(); core.showChosen(); }, 0); });
    select.__pudlListboxSync = build;

    label();
    build();
    var outer = select.closest('.form-select-wrap') || select;
    outer.parentNode.insertBefore(box, outer.nextSibling);
    outer.hidden = true;
    if (outer !== select) select.hidden = true;
    core.showChosen();
  }

  /* === A rich list box, rows written by the host (0.97.0) ================= */

  function RichList(box) {
    var id = box.id || (box.id = 'pudl-listbox-' + (++uid));
    var a = {
      rows: [],
      multiple: function () { return box.getAttribute('data-listbox') === 'multiple'; },
      disabled: function () { return box.hasAttribute('data-disabled'); },
      isOn: function (i) { return !!a.rows[i] && a.rows[i].el.getAttribute('aria-selected') === 'true'; },
      setOn: function (i, v) {
        if (v && !a.multiple()) a.rows.forEach(function (r, k) { if (k !== i && r.el.getAttribute('aria-selected') !== 'false') r.el.setAttribute('aria-selected', 'false'); });
        a.rows[i].el.setAttribute('aria-selected', v ? 'true' : 'false');
      },
      enabled: function (i) { return !!a.rows[i] && !a.rows[i].el.hasAttribute('data-disabled'); },
      paint: paint,
      changed: changed
    };
    var quiet = false;
    var core = Core(box, a);

    /* A heading and the rows after it stand in a group, so a screen reader
       hears which group a row is in. */
    function group() {
      Array.prototype.slice.call(box.children).forEach(function (c) {
        if (!c.classList.contains('listbox-group')) return;
        var s = document.createElement('div');
        s.className = 'listbox-section';
        box.insertBefore(s, c);
        var n = c, next;
        do { next = n.nextElementSibling; s.appendChild(n); n = next; } while (n && !n.classList.contains('listbox-group') && !n.classList.contains('listbox-section'));
      });
      box.querySelectorAll(':scope > .listbox-section').forEach(function (s, k) {
        s.setAttribute('role', 'group');
        var head = s.querySelector(':scope > .listbox-group');
        if (head) {
          if (!head.id) head.id = id + '-g' + (k + 1);
          head.setAttribute('role', 'presentation');
          s.setAttribute('aria-labelledby', head.id);
        }
      });
    }

    /* A section whose rows are all hidden hides with them. */
    function sections() {
      box.querySelectorAll(':scope > .listbox-section').forEach(function (s) {
        var rows = s.querySelectorAll(':scope > .listbox-row');
        var none = rows.length > 0 && Array.prototype.every.call(rows, function (r) { return r.hidden; });
        if (s.hidden !== none) s.hidden = none;
      });
    }

    function build() {
      var keep = core.activeEl();
      quiet = true;
      group();
      a.rows = Array.prototype.map.call(box.querySelectorAll(':scope > .listbox-row, :scope > .listbox-section > .listbox-row'), function (row, i) {
        if (!row.id) row.id = id + '-r' + i;
        row.setAttribute('role', 'option');
        if (!row.hasAttribute('aria-selected')) row.setAttribute('aria-selected', 'false');
        var m = row.querySelector(':scope > input[aria-hidden="true"]');
        if (!m) { m = mark(a.multiple()); row.insertBefore(m, row.firstChild); }
        return { el: row, mark: m };
      });
      box.setAttribute('role', 'listbox');
      sections();
      core.rebuilt(keep && keep.isConnected ? keep : null);
      quiet = false;
    }

    function paint() {
      var was = quiet;
      quiet = true;
      var many = a.multiple();
      if (many) { if (box.getAttribute('aria-multiselectable') !== 'true') box.setAttribute('aria-multiselectable', 'true'); }
      else if (box.hasAttribute('aria-multiselectable')) box.removeAttribute('aria-multiselectable');
      var n = Number(box.getAttribute('data-listbox-rows'));
      box.style.setProperty('--listbox-rows', String(n > 0 ? n : 6));
      if (a.disabled()) { box.setAttribute('aria-disabled', 'true'); box.tabIndex = -1; }
      else { if (box.hasAttribute('aria-disabled')) box.removeAttribute('aria-disabled'); box.tabIndex = 0; }
      a.rows.forEach(function (r, i) {
        var on = a.isOn(i);
        if (a.enabled(i)) { if (r.el.hasAttribute('aria-disabled')) r.el.removeAttribute('aria-disabled'); }
        else if (r.el.getAttribute('aria-disabled') !== 'true') r.el.setAttribute('aria-disabled', 'true');
        if (r.mark.type !== (many ? 'checkbox' : 'radio')) r.mark.type = many ? 'checkbox' : 'radio';
        r.mark.checked = on;
        r.mark.disabled = !a.enabled(i) || a.disabled();
      });
      quiet = was;
    }

    function value() {
      var on = a.rows.filter(function (r, i) { return a.isOn(i); }).map(function (r) { return r.el.getAttribute('data-value'); });
      return a.multiple() ? on : (on.length ? on[0] : null);
    }

    function changed() {
      var v = value(), values = Array.isArray(v) ? v : (v == null ? [] : [v]);
      var forId = box.getAttribute('data-listbox-for'), target = forId && document.getElementById(forId);
      if (target) {
        if (target.tagName === 'SELECT') Array.prototype.forEach.call(target.options, function (o) { o.selected = values.indexOf(o.value) >= 0; });
        else target.value = values.join(',');
        fire(target);
      }
      box.dispatchEvent(new CustomEvent('pudl:listbox-change', { bubbles: true, detail: { values: values } }));
    }

    /* Rows the host adds, removes, hides, chooses or disables are seen at
       once. */
    new MutationObserver(function (list) {
      if (quiet) return;
      var structural = list.some(function (m) {
        return m.type === 'childList' && (m.target === box || (m.target.classList && m.target.classList.contains('listbox-section')));
      });
      if (structural) build();
      else { quiet = true; sections(); quiet = false; core.paint(); }
    }).observe(box, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'aria-selected', 'data-disabled', 'data-listbox', 'data-listbox-rows'] });

    box.__pudlListboxSync = build;
    box.__pudlListboxValue = value;
    build();
    core.showChosen();
  }

  function enhanceOne(el) {
    if (el.__pudlListbox) return;
    if (el.tagName === 'SELECT') {
      if (!(el.multiple || el.size > 1)) return;
      el.__pudlListbox = true;
      new Listbox(el);
    } else {
      el.__pudlListbox = true;
      new RichList(el);
    }
  }

  var LISTS = 'select[data-listbox], .listbox[data-listbox]';
  function enhance(root) {
    root = root || document;
    if (root.matches && root.matches(LISTS)) enhanceOne(root);
    root.querySelectorAll(LISTS).forEach(enhanceOne);
  }

  window.pudlListbox = {
    enhance: enhance,
    refresh: function (el) { if (el && el.__pudlListboxSync) el.__pudlListboxSync(); },
    /* The choice in a rich list box: an array for a multiple list, a value
       or null for a single one (0.97.0). */
    value: function (el) { return el && el.__pudlListboxValue ? el.__pudlListboxValue() : null; }
  };
  document.addEventListener('pudl:window-open', function (e) { enhance(e.target); });
  document.addEventListener('pudl:regions-swap', function () { enhance(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { enhance(); });
  else enhance();
})();
