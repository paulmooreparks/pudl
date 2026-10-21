/* PUDL combo boxes and searchable selects. Load with defer.

   A combo box is a text field with a list of suggestions: the reader may
   type anything, or open the list and choose from it. Its markup is a
   native input with a datalist, wrapped:

     <span class="combo">
       <input class="form-input" id="currency" name="currency" list="currencies" autocomplete="off">
       <datalist id="currencies">
         <option value="PHP">Philippine peso</option>
         …
       </datalist>
     </span>

   Without this script the browser draws its own list, so the field works
   already. With it, PUDL's list takes the browser's place: an option's
   value goes into the field, and its text, where it has any, is a second
   line. A searchable select is a select whose value must be one of its
   options, marked data-combo:

     <span class="form-select-wrap">
       <select class="form-select" name="currency" data-combo>…</select>
     </span>

   Without the script it is a plain select. With it, a combo box stands in
   its place and filters the options as the reader types, and the hidden
   select keeps the value and is what the form sends. Leaving the field
   with text that matches no option puts the chosen one back.

   Typing filters the list to the options whose value or text contains
   what is typed. Down and Up move through it, wrapping; Alt+Down opens it
   without moving and Alt+Up closes it; Enter chooses the row the keyboard
   is on; Escape closes the list, and with it closed clears a combo box or
   puts a searchable select's choice back. Tab leaves with what was typed.
   The button at the field's end opens the whole list. Choosing fires
   input and change on the field, or on the select. data-combo-complete on
   the field or the select completes a match as the reader types, and is
   off unless asked for.

   data-combo-src on the .combo, or on the select, is an address on the
   page's own origin with {q} for what is typed. After a pause in typing
   the script asks it, and puts the option elements it returns, as HTML,
   into the list; a searchable select keeps its chosen option among them.
   Only an option's value, text and keys are taken.

   What the reader types to find an option need not be what it puts in the
   field. An option's data-combo-keys, separated by commas, are words to
   look it up by, unseen:

     <option value="₱" data-combo-keys="PHP, Philippines">PHP · Philippine peso</option>

   Typing PHP, peso or Philippines finds the row, and choosing it puts ₱ in
   the field. Leaving the field, or pressing Enter, with exactly a key
   typed that only one option has looks the option up and puts its value
   in the field too, so the reader with no ₱ on the keyboard types PHP and
   gets ₱. Showing the code in the text as well tells the reader why a row
   was found.

   The words the script uses are the page's own where the .combo or the
   select carries data-combo-text-open ("Show the suggestions"),
   data-combo-text-searching ("Searching…") or data-combo-text-more
   ("{n} more; type to narrow them."). pudlCombo.enhance(root) takes in
   fields added later, and pudlCombo.refresh(select) shows a searchable
   select's value after a script has set it. (0.72.0) */
(function () {
  'use strict';

  var LIMIT = 100;
  var uid = 0;

  function words(host, name, fallback) {
    return (host && host.getAttribute('data-combo-text-' + name)) || fallback;
  }

  function fire(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /* What is typed, marked where it is found in a row's words. The words
     go in as text, never as markup. */
  function marked(text, q) {
    var frag = document.createDocumentFragment();
    var at = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
    if (at < 0) { frag.appendChild(document.createTextNode(text)); return frag; }
    frag.appendChild(document.createTextNode(text.slice(0, at)));
    var m = document.createElement('mark');
    m.textContent = text.slice(at, at + q.length);
    frag.appendChild(m);
    frag.appendChild(document.createTextNode(text.slice(at + q.length)));
    return frag;
  }

  function sameOrigin(url) {
    try { return new URL(url, location.href).origin === location.origin; } catch (e) { return false; }
  }

  /* One combo box. field is the text input the reader types in; source is
     the datalist or the select whose options it offers; select is the
     select a searchable select keeps its value in, or null. */
  function Combo(wrap, field, source, select) {
    var host = select || wrap;
    var strict = !!select;
    var complete = field.hasAttribute('data-combo-complete') || (select && select.hasAttribute('data-combo-complete'));
    var src = host.getAttribute('data-combo-src');
    var id = 'pudl-combo-' + (++uid);
    var rows = [], active = -1, timer = 0, asking = null, lastQ = null;

    var opener = document.createElement('button');
    opener.type = 'button';
    opener.className = 'icon-btn combo-open';
    opener.tabIndex = -1;
    opener.setAttribute('data-toolbar-skip', '');
    opener.setAttribute('aria-label', words(host, 'open', 'Show the suggestions'));
    opener.setAttribute('aria-expanded', 'false');
    wrap.appendChild(opener);

    var panel = document.createElement('div');
    /* Drawn as a menu panel is, but not one, so pudl-menu.js, which places
       menu panels against their buttons, leaves it to this script. */
    panel.className = 'combo-list';
    panel.id = id + '-list';
    panel.setAttribute('role', 'listbox');
    panel.setAttribute('popover', 'manual');
    var label = field.id && document.querySelector('label[for="' + CSS.escape(field.id) + '"]');
    if (label) panel.setAttribute('aria-label', label.textContent.trim());
    /* Inside a modal dialog the list must be in the dialog, since all else
       is inert while it is open. */
    (wrap.closest('dialog') || document.body).appendChild(panel);

    field.setAttribute('role', 'combobox');
    field.setAttribute('aria-autocomplete', complete ? 'both' : 'list');
    field.setAttribute('aria-expanded', 'false');
    field.setAttribute('aria-controls', panel.id);
    opener.setAttribute('aria-controls', panel.id);

    function options() {
      return Array.prototype.map.call(source.querySelectorAll('option'), function (o) {
        var text = o.textContent.trim();
        var keys = (o.getAttribute('data-combo-keys') || '').split(',').map(function (k) { return k.trim(); }).filter(Boolean);
        return strict
          ? { value: o.value, label: text || o.value, detail: '', keys: keys }
          : { value: o.value, label: o.value, detail: text && text !== o.value ? text : '', keys: keys };
      });
    }
    /* The one option one of whose keys, or whose value, is exactly what is
       typed: what the reader types to look an option up, such as PHP for
       the peso's sign, rather than what it puts in the field. Text that
       several options share, such as kr, looks nothing up. */
    function byKey(typed) {
      typed = typed.trim().toLowerCase();
      if (!typed) return null;
      var hits = options().filter(function (o) {
        return o.value.toLowerCase() === typed || o.keys.some(function (k) { return k.toLowerCase() === typed; });
      });
      return hits.length === 1 ? hits[0] : null;
    }
    function chosenLabel() {
      var o = select.options[select.selectedIndex];
      return o ? (o.textContent.trim() || o.value) : '';
    }
    function current() { return strict ? select.value : field.value; }

    function isOpen() { return panel.matches(':popover-open'); }
    function place() {
      var r = wrap.getBoundingClientRect();
      panel.style.minWidth = r.width + 'px';
      panel.style.left = Math.max(8, Math.min(r.left, innerWidth - panel.offsetWidth - 8)) + 'px';
      var below = innerHeight - r.bottom;
      if (panel.offsetHeight > below - 8 && r.top > below) { panel.style.top = ''; panel.style.bottom = (innerHeight - r.top + 4) + 'px'; }
      else { panel.style.bottom = ''; panel.style.top = (r.bottom + 4) + 'px'; }
    }
    function open() {
      if (!isOpen()) panel.showPopover();
      field.setAttribute('aria-expanded', 'true');
      opener.setAttribute('aria-expanded', 'true');
      place();
    }
    function close() {
      if (isOpen()) panel.hidePopover();
      field.setAttribute('aria-expanded', 'false');
      opener.setAttribute('aria-expanded', 'false');
      field.removeAttribute('aria-activedescendant');
      active = -1;
    }

    function note(text) {
      var n = document.createElement('div');
      n.className = 'combo-note';
      n.textContent = text;
      panel.appendChild(n);
    }
    function draw(list, q) {
      panel.textContent = '';
      var now = current();
      rows = list.slice(0, LIMIT).map(function (o, i) {
        var row = document.createElement('div');
        row.className = 'menu-action combo-row';
        row.id = id + '-' + i;
        row.setAttribute('role', 'option');
        row.setAttribute('aria-selected', o.value === now ? 'true' : 'false');
        var text = document.createElement('span');
        text.className = 'menu-row-text';
        var main = document.createElement('span');
        main.appendChild(marked(o.label, q));
        text.appendChild(main);
        if (o.detail) {
          var d = document.createElement('span');
          d.className = 'menu-row-detail';
          d.appendChild(marked(o.detail, q));
          text.appendChild(d);
        }
        row.appendChild(text);
        row.addEventListener('pointerdown', function (e) { e.preventDefault(); });
        row.addEventListener('click', function () { choose(o); });
        panel.appendChild(row);
        return { el: row, option: o };
      });
      if (list.length > LIMIT) note(words(host, 'more', '{n} more; type to narrow them.').replace('{n}', list.length - LIMIT));
      active = -1;
      field.removeAttribute('aria-activedescendant');
    }
    function setActive(i) {
      if (rows[active]) rows[active].el.classList.remove('is-active');
      active = rows[i] ? i : -1;
      if (active < 0) { field.removeAttribute('aria-activedescendant'); return; }
      rows[active].el.classList.add('is-active');
      rows[active].el.scrollIntoView({ block: 'nearest' });
      field.setAttribute('aria-activedescendant', rows[active].el.id);
    }
    function matching(q) {
      var all = options();
      if (!q) return all;
      q = q.toLowerCase();
      return all.filter(function (o) {
        return o.label.toLowerCase().indexOf(q) >= 0 || o.value.toLowerCase().indexOf(q) >= 0 || o.detail.toLowerCase().indexOf(q) >= 0 ||
          o.keys.some(function (k) { return k.toLowerCase().indexOf(q) >= 0; });
      });
    }
    function show(list, q) {
      if (!list.length) { close(); return false; }
      draw(list, q);
      open();
      return true;
    }

    function choose(o) {
      close();
      if (strict) {
        field.value = o.label;
        if (select.value !== o.value) { select.value = o.value; fire(select); }
      } else if (field.value !== o.value) {
        field.value = o.value;
        field.__pudlComboSaid = o.value;
        fire(field);
      }
      field.setSelectionRange(field.value.length, field.value.length);
    }
    /* Leaving the field, or Enter with no row lit. Text that is exactly an
       option's key or value looks that option up and takes its value, so
       PHP typed becomes the peso's sign. A searchable select never keeps
       text that is not an option: its words typed exactly choose it too,
       and anything else puts the choice back. */
    function settle() {
      var typed = field.value.trim();
      if (!strict) {
        var found = byKey(typed);
        if (found && found.value !== field.value) choose(found);
        return;
      }
      if (typed && typed.toLowerCase() !== chosenLabel().toLowerCase()) {
        var lower = typed.toLowerCase();
        var hit = byKey(typed) || options().filter(function (o) { return o.label.toLowerCase() === lower; })[0];
        if (hit) { choose(hit); return; }
      }
      field.value = chosenLabel();
    }

    /* Options from the server, after a pause in typing. */
    function ask(q) {
      clearTimeout(timer);
      if (asking) { asking.abort(); asking = null; }
      if (!q) { close(); return; }
      timer = setTimeout(function () {
        var url = src.replace('{q}', encodeURIComponent(q));
        if (!sameOrigin(url)) return;
        var ctl = asking = new AbortController();
        panel.textContent = '';
        rows = [];
        note(words(host, 'searching', 'Searching…'));
        open();
        fetch(url, { signal: ctl.signal, credentials: 'same-origin', headers: { Accept: 'text/html' } }).then(function (res) {
          var type = res.headers.get('content-type') || '';
          if (!res.ok || !sameOrigin(res.url) || type.indexOf('text/html') !== 0) throw new Error('refused');
          return res.text();
        }).then(function (html) {
          if (asking !== ctl) return;
          asking = null;
          var t = document.createElement('template');
          t.innerHTML = html;
          var keep = strict ? select.options[select.selectedIndex] : null;
          Array.prototype.slice.call(source.querySelectorAll('option')).forEach(function (o) { if (o !== keep) o.remove(); });
          Array.prototype.forEach.call(t.content.querySelectorAll('option'), function (o) {
            if (keep && o.value === keep.value) return;
            var fresh = document.createElement('option');
            fresh.value = o.value;
            fresh.textContent = o.textContent;
            if (o.hasAttribute('data-combo-keys')) fresh.setAttribute('data-combo-keys', o.getAttribute('data-combo-keys'));
            source.appendChild(fresh);
          });
          if (document.activeElement === field) show(matching(field.value), field.value);
        }).catch(function () {
          if (asking === ctl) { asking = null; close(); }
        });
      }, 250);
    }

    field.addEventListener('input', function (e) {
      if (!e.isTrusted) return;
      var q = field.value;
      if (complete && e.inputType && e.inputType.indexOf('insert') === 0 && q) {
        var lower = q.toLowerCase();
        var hit = options().filter(function (o) { return o.label.toLowerCase().indexOf(lower) === 0; })[0];
        if (hit && hit.label.length > q.length) {
          field.value = q + hit.label.slice(q.length);
          field.setSelectionRange(q.length, field.value.length);
        }
      }
      lastQ = q;
      if (src) { ask(q); return; }
      if (!q) { close(); return; }
      show(matching(q), q);
    });

    field.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey) return;
      var q = lastQ === field.value ? field.value : '';
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isOpen()) {
          var list = q ? matching(q) : options();
          if (!show(list.length ? list : options(), list.length ? q : '')) return;
          if (!e.altKey) setActive(0);
        } else if (!e.altKey && rows.length) setActive((active + 1) % rows.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (e.altKey) { close(); return; }
        if (!isOpen()) { if (show(options(), '')) setActive(rows.length - 1); return; }
        if (rows.length) setActive(active <= 0 ? rows.length - 1 : active - 1);
      } else if (e.key === 'Enter') {
        if (isOpen() && rows[active]) { e.preventDefault(); choose(rows[active].option); return; }
        if (strict && isOpen() && rows.length === 1) { e.preventDefault(); choose(rows[0].option); return; }
        close();
        settle();
      } else if (e.key === 'Escape') {
        if (isOpen()) { e.preventDefault(); e.stopPropagation(); close(); return; }
        if (strict) {
          if (field.value !== chosenLabel()) { e.preventDefault(); e.stopPropagation(); field.value = chosenLabel(); }
        } else if (field.value && !field.required) {
          e.preventDefault(); e.stopPropagation();
          field.value = '';
          fire(field);
        }
      } else if (e.key === 'Tab') {
        close();
      }
    });
    /* A browser's own change for a chosen value comes before the field is
       focused again, if it comes at all. */
    field.addEventListener('focus', function () { field.__pudlComboSaid = undefined; });
    field.addEventListener('blur', function () {
      setTimeout(function () {
        if (document.activeElement === field) return;
        close();
        settle();
      }, 0);
    });

    opener.addEventListener('pointerdown', function (e) { e.preventDefault(); });
    opener.addEventListener('click', function () {
      if (field.disabled || field.readOnly) return;
      if (isOpen()) { close(); field.focus(); return; }
      field.focus();
      if (!show(options(), '')) return;
      var at = rows.map(function (r) { return r.option.value; }).indexOf(current());
      if (at >= 0) setActive(at);
    });

    addEventListener('resize', function () { if (isOpen()) place(); });
    addEventListener('scroll', function (e) {
      if (!isOpen() || panel.contains(e.target)) return;
      place();
    }, true);

    if (strict) {
      field.value = chosenLabel();
      var sync = function () {
        field.disabled = select.disabled;
        field.required = select.required;
        if (document.activeElement !== field) field.value = chosenLabel();
      };
      new MutationObserver(sync).observe(select, { attributes: true, attributeFilter: ['disabled', 'required'], childList: true, subtree: true });
      select.addEventListener('change', sync);
      var form = select.form;
      if (form) form.addEventListener('reset', function () { setTimeout(sync, 0); });
      select.__pudlComboSync = sync;
    }
  }

  function enhanceCombo(wrap) {
    if (wrap.__pudlCombo) return;
    var field = wrap.querySelector(':scope > input');
    var listId = field && field.getAttribute('list');
    var source = listId && document.getElementById(listId);
    if (!source) return;
    wrap.__pudlCombo = true;
    /* The browser's own list gives way to PUDL's. */
    field.setAttribute('data-combo-list', listId);
    field.removeAttribute('list');
    if (!field.hasAttribute('autocomplete')) field.setAttribute('autocomplete', 'off');
    new Combo(wrap, field, source, null);
  }

  function enhanceSelect(select) {
    if (select.__pudlCombo || select.multiple || select.size > 1) return;
    select.__pudlCombo = true;
    var outer = select.closest('.form-select-wrap') || select;
    var wrap = document.createElement('span');
    wrap.className = 'combo combo-select';
    var field = document.createElement('input');
    field.type = 'text';
    field.className = 'form-input';
    field.autocomplete = 'off';
    field.spellcheck = false;
    field.id = (select.id ? select.id + '-combo' : 'pudl-combo-field-' + (++uid));
    ['aria-describedby', 'aria-invalid', 'placeholder'].forEach(function (a) { if (select.hasAttribute(a)) field.setAttribute(a, select.getAttribute(a)); });
    field.disabled = select.disabled;
    field.required = select.required;
    wrap.appendChild(field);
    outer.parentNode.insertBefore(wrap, outer.nextSibling);
    outer.hidden = true;
    /* The select's label names the field the reader now types in. */
    if (select.id) {
      document.querySelectorAll('label[for="' + CSS.escape(select.id) + '"]').forEach(function (l) { l.htmlFor = field.id; });
    }
    if (select.hasAttribute('aria-label')) field.setAttribute('aria-label', select.getAttribute('aria-label'));
    if (select.hasAttribute('aria-labelledby')) field.setAttribute('aria-labelledby', select.getAttribute('aria-labelledby'));
    new Combo(wrap, field, select, select);
  }

  function enhance(root) {
    root = root || document;
    root.querySelectorAll('.combo').forEach(enhanceCombo);
    root.querySelectorAll('select[data-combo]').forEach(enhanceSelect);
  }

  /* Choosing a row fires change at once. The browser may fire its own when
     the reader then leaves the field, for the same value, and that second
     one is dropped here, before anything else hears it, since a listener
     on the window in the capture phase is the first a DOM event reaches.
     A change for any other value goes through. */
  window.addEventListener('change', function (e) {
    var f = e.target;
    if (!e.isTrusted || !f || f.__pudlComboSaid === undefined) return;
    var said = f.__pudlComboSaid;
    f.__pudlComboSaid = undefined;
    if (f.value === said) e.stopImmediatePropagation();
  }, true);

  window.pudlCombo = {
    enhance: enhance,
    refresh: function (select) { if (select && select.__pudlComboSync) select.__pudlComboSync(); }
  };
  document.addEventListener('pudl:window-open', function (e) { enhance(e.target); });
  document.addEventListener('pudl:regions-swap', function () { enhance(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { enhance(); });
  else enhance();
})();
