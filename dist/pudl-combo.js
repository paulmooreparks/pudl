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
   select's value after a script has set it. (0.72.0)

   A token field (0.74.0) takes several values in one field, each shown as
   a chip with its own remove button, such as tags or recipients. It is a
   combo box marked data-combo-tokens, so suggestions, keys and
   data-combo-src all work for each value:

     <span class="combo" data-combo-tokens>
       <input class="form-input" id="tags" name="tags" list="tag-options" value="receipts, q4">
       <datalist id="tag-options">…</datalist>
     </span>

   Without the script the reader types the values into the one field,
   separated by commas, and that is what the form sends with the script
   too. With it, the input is hidden and keeps the joined value, a field
   to type one value in stands in its place, and the values gather below
   it as chips. data-combo-separator on the .combo sets what separates the
   values, a comma unless it says otherwise. The values are split at the
   separator, with any spaces around each value dropped, and joined with
   it; a separator of one punctuation character, such as "," or ";", is
   joined with a space after it ("receipts, q4"), and any other, such as
   " | " or " and ", is joined exactly as written.

   Enter, typing the separator, Tab and leaving the field each add what is
   typed as a value, looked up by its keys as a combo box does, so PHP
   typed becomes the peso's sign. A value already there, in any case, is
   not added again; its chip flashes instead. Pasted text with the
   separator in it is split at the separator and at new lines, and pasted
   text without it at commas and new lines, so a pasted list becomes a
   chip for each value. Backspace in the empty field takes the last chip
   back into the field to be mended, and pressing a chip's words does the
   same for that chip, so a typo never means deleting a chip and typing it
   again. The mended value goes back to the chip's place, and Escape puts
   the chip back as it was. Left in the empty field moves to the chips, which are one stop
   in the Tab order: Left and Right move along them and Right past the
   last returns to the field, Home and End go to the first and the last,
   Delete or Backspace removes the chip, and F2 takes it back into the
   field. data-combo-max on the .combo is the most values the field takes;
   at that many the field stops taking typing and says so below the chips.
   Each change to the values fires input and change once on the hidden
   input. Its words are the page's own where the .combo carries
   data-combo-text-remove ("Remove {v}"), data-combo-text-edit ("Press to
   change {v}"), data-combo-text-added ("{v} added"),
   data-combo-text-removed ("{v} removed"), data-combo-text-again ("{v} is
   there already") or data-combo-text-max ("That is the most this field
   takes, {n}. Remove one to add another."). pudlCombo.refresh(input)
   shows values a script has set on the hidden input. */
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
     select a searchable select keeps its value in, or null; and keeper,
     for a token field, is the hidden input that keeps its values. */
  function Combo(wrap, field, source, select, keeper) {
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
    /* A token field with no suggestions has nothing to open. */
    if (!keeper || wrap.hasAttribute('data-combo-src') || field.hasAttribute('data-combo-list')) wrap.appendChild(opener);

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
      /* The list opens on the side with room for it, or with more room,
         and never runs past the window's edge: it is held to the room
         there and scrolls (0.74.0). */
      panel.style.maxHeight = '';
      var natural = panel.offsetHeight, below = innerHeight - r.bottom - 12, above = r.top - 12;
      var up = natural > below && above > below;
      panel.style.maxHeight = Math.max(80, up ? above : below) + 'px';
      if (up) { panel.style.top = ''; panel.style.bottom = (innerHeight - r.top + 4) + 'px'; }
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
        /* In a token field every value already chosen is ticked. */
        row.setAttribute('aria-selected', (tok ? tok.has(o.value) : o.value === now) ? 'true' : 'false');
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
      if (tok) { tok.commit([o.value], true); lastQ = ''; return; }
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
      if (tok) { if (typed) tok.commit([typed]); return; }
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
      if (tok) tok.split();
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
        /* Enter in a token field with words typed adds them, and does not
           send the form. */
        if (tok && field.value.trim()) e.preventDefault();
        close();
        settle();
      } else if (e.key === 'Escape') {
        if (isOpen()) { e.preventDefault(); e.stopPropagation(); close(); return; }
        if (tok) {
          if (tok.escape()) { e.preventDefault(); e.stopPropagation(); }
        } else if (strict) {
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
      if (tok) return;
      var at = rows.map(function (r) { return r.option.value; }).indexOf(current());
      if (at >= 0) setActive(at);
    });

    addEventListener('resize', function () { if (isOpen()) place(); });
    addEventListener('scroll', function (e) {
      if (!isOpen() || panel.contains(e.target)) return;
      place();
    }, true);

    var tok = keeper ? tokens() : null;

    /* A token field's values, its chips, and the keys that move among
       them. The hidden input keeper holds the values joined, and is the
       only thing the form sends. */
    function tokens() {
      var sep = wrap.getAttribute('data-combo-separator') || ',';
      var cut = sep.trim() || sep;
      var joiner = sep.length === 1 && /[^\p{L}\p{N}\s]/u.test(sep) ? sep + ' ' : sep;
      var max = parseInt(wrap.getAttribute('data-combo-max'), 10) || 0;
      var values = [], rove = 0;
      /* A chip taken back into the field to be mended: its value, and the
         place among the chips it goes back to. */
      var pulled = null, pulledAt = -1;

      function parse(text) {
        var out = [];
        String(text || '').split(cut).forEach(function (v) {
          v = v.trim();
          if (v && !out.some(function (w) { return w.toLowerCase() === v.toLowerCase(); })) out.push(v);
        });
        return out;
      }
      function has(v) {
        v = String(v).toLowerCase();
        return values.some(function (w) { return w.toLowerCase() === v; });
      }
      function full() { return max > 0 && values.length >= max; }
      function say(name, fallback, v) {
        status.textContent = '';
        status.textContent = words(host, name, fallback).replace('{v}', v).replace('{n}', max);
      }

      var labelEl = field.labels && field.labels[0];
      var list = document.createElement('div');
      list.className = 'tokens';
      list.setAttribute('role', 'list');
      list.setAttribute('aria-label', labelEl ? labelEl.textContent.trim() : (field.getAttribute('aria-label') || ''));
      var note = document.createElement('div');
      note.className = 'tokens-note';
      note.id = id + '-note';
      var status = document.createElement('span');
      status.className = 'visually-hidden';
      status.setAttribute('aria-live', 'polite');
      wrap.parentNode.insertBefore(list, wrap.nextSibling);
      list.parentNode.insertBefore(note, list.nextSibling);
      note.parentNode.insertBefore(status, note.nextSibling);
      field.setAttribute('aria-describedby', ((field.getAttribute('aria-describedby') || '') + ' ' + note.id).trim());

      function buttons() { return Array.prototype.slice.call(list.querySelectorAll('.filter-chip-x')); }
      function render() {
        var hadFocus = document.activeElement === field;
        /* The chips are drawn afresh, so a chip that had the keyboard
           hands it to the chip now in its place. */
        var onChip = buttons().indexOf(document.activeElement);
        list.textContent = '';
        rove = Math.max(0, Math.min(rove, values.length - 1));
        values.forEach(function (v, i) {
          var chip = document.createElement('span');
          chip.className = 'filter-chip token';
          chip.setAttribute('role', 'listitem');
          var text = document.createElement('span');
          text.className = 'token-text';
          text.textContent = v;
          text.title = words(host, 'edit', 'Press to change {v}').replace('{v}', v);
          text.addEventListener('mousedown', function (e) { e.preventDefault(); });
          text.addEventListener('click', function () { if (!keeper.disabled) edit(i); });
          var x = document.createElement('button');
          x.type = 'button';
          x.className = 'filter-chip-x';
          x.tabIndex = i === rove ? 0 : -1;
          x.disabled = keeper.disabled;
          x.setAttribute('aria-label', words(host, 'remove', 'Remove {v}').replace('{v}', v));
          x.addEventListener('click', function () { remove(i, 'next'); });
          x.addEventListener('keydown', function (e) { chipKey(e, i); });
          x.addEventListener('focus', function () { rove = i; buttons().forEach(function (b, k) { b.tabIndex = k === i ? 0 : -1; }); });
          chip.appendChild(text);
          chip.appendChild(x);
          list.appendChild(chip);
        });
        field.disabled = keeper.disabled || full();
        field.required = keeper.required && !values.length;
        note.textContent = full() ? words(host, 'max', 'That is the most this field takes, {n}. Remove one to add another.').replace('{n}', max) : '';
        if (hadFocus && field.disabled && values.length) focusChip(values.length - 1);
        else if (onChip >= 0) { if (values.length) focusChip(Math.min(onChip, values.length - 1)); else if (!field.disabled) field.focus(); }
      }
      /* A script's change is the page's own, so it fires no change event,
         as a script setting a native input's value fires none (0.80.0). */
      function write(quiet) {
        keeper.value = values.join(joiner);
        if (!quiet) fire(keeper);
      }

      /* Before a value is added, however it comes, pudl:token-check on the
         input may refuse it with a message, or replace it with another,
         such as a link cleaned down to its domain (0.80.0). */
      function check(v) {
        var out = { value: v, refused: false, message: '' };
        keeper.dispatchEvent(new CustomEvent('pudl:token-check', { bubbles: true, detail: {
          value: v,
          refuse: function (message) { out.refused = true; out.message = String(message || ''); },
          replace: function (w) { if (w != null && String(w).trim()) out.value = String(w).trim(); }
        } }));
        return out;
      }

      /* The message of a refused value, under the field as a form error
         tied to it, until the reader changes what is typed. */
      var error = null;
      function showError(message) {
        if (!error) {
          error = document.createElement('p');
          error.className = 'form-error';
          error.id = id + '-error';
          error.hidden = true;
          /* After the chips and the note, so the chips still follow the
             field directly. */
          status.parentNode.insertBefore(error, status.nextSibling);
        }
        error.textContent = message;
        error.hidden = !message;
        field.toggleAttribute('aria-invalid', !!message);
        var ids = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(function (x) { return x && x !== error.id; });
        if (message) ids.unshift(error.id);
        if (ids.length) field.setAttribute('aria-describedby', ids.join(' ')); else field.removeAttribute('aria-describedby');
      }
      field.addEventListener('input', function () { if (error && !error.hidden) showError(''); });

      /* Adds each text as a value, looked up by its keys unless it is
         already a value, checked, and fires once for them all. A script's
         additions are quiet: no change event and nothing said. It answers
         what was added and what was refused. */
      function commit(texts, resolved, quiet) {
        var added = [], again = null, refused = [];
        texts.forEach(function (t) {
          t = String(t).trim();
          if (!t) return;
          var found = resolved ? null : byKey(t);
          var c = check(found ? found.value : t);
          if (c.refused) { refused.push({ value: t, message: c.message }); return; }
          var v = c.value;
          if (has(v)) { again = v; return; }
          if (full()) return;
          if (pulledAt >= 0 && pulledAt <= values.length) values.splice(pulledAt++, 0, v);
          else values.push(v);
          added.push(v);
        });
        pulled = null;
        pulledAt = -1;
        if (!quiet) {
          /* What was refused stays in the field to be mended, with why. */
          field.value = refused.map(function (r) { return r.value; }).join(joiner);
          lastQ = '';
          showError(refused.length ? refused[0].message : '');
        }
        if (added.length) {
          render();
          write(quiet);
          if (!quiet) say('added', '{v} added', added.join(joiner));
        }
        if (again && !quiet) flash(again);
        if (refused.length) keeper.dispatchEvent(new CustomEvent('pudl:token-refused', { bubbles: true, detail: { refused: refused, source: quiet ? 'script' : 'reader' } }));
        return { added: added, refused: refused };
      }
      function flash(v) {
        var at = -1;
        values.forEach(function (w, i) { if (w.toLowerCase() === String(v).toLowerCase()) at = i; });
        var chip = list.children[at];
        if (!chip) return;
        chip.classList.remove('is-again');
        void chip.offsetWidth;
        chip.classList.add('is-again');
        clearTimeout(chip.__pudlAgain);
        chip.__pudlAgain = setTimeout(function () { chip.classList.remove('is-again'); }, 1000);
        say('again', '{v} is there already', values[at]);
      }
      function remove(i, then) {
        var v = values.splice(i, 1)[0];
        if (v === undefined) return;
        render();
        write();
        say('removed', '{v} removed', v);
        if (!values.length) { field.focus(); return; }
        if (then === 'next') { if (i < values.length) focusChip(i); else field.focus(); }
        else focusChip(Math.max(0, i - 1));
      }
      /* Takes a chip's value back into the field to be mended. */
      function edit(i) {
        var typed = field.value.trim();
        var v = values[i];
        if (v === undefined) return;
        if (typed) { commit([typed]); i = values.indexOf(v); }
        values.splice(i, 1);
        pulled = v;
        pulledAt = i;
        render();
        write();
        field.value = v;
        field.focus();
        field.setSelectionRange(v.length, v.length);
      }
      function focusChip(i) {
        var b = buttons()[i];
        if (!b) return;
        rove = i;
        buttons().forEach(function (x, k) { x.tabIndex = k === i ? 0 : -1; });
        b.focus();
      }
      function chipKey(e, i) {
        var rtl = getComputedStyle(list).direction === 'rtl';
        var key = e.key === 'ArrowLeft' ? (rtl ? 'next' : 'back') : e.key === 'ArrowRight' ? (rtl ? 'back' : 'next') : e.key;
        if (key === 'back') { e.preventDefault(); if (i > 0) focusChip(i - 1); }
        else if (key === 'next') { e.preventDefault(); if (i < values.length - 1) focusChip(i + 1); else if (!field.disabled) field.focus(); }
        else if (key === 'Home') { e.preventDefault(); focusChip(0); }
        else if (key === 'End') { e.preventDefault(); focusChip(values.length - 1); }
        else if (key === 'Delete') { e.preventDefault(); remove(i, 'next'); }
        else if (key === 'Backspace') { e.preventDefault(); remove(i, 'back'); }
        else if (key === 'F2') { e.preventDefault(); edit(i); }
      }

      field.addEventListener('keydown', function (e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        var empty = field.value === '';
        if (e.key === 'Backspace' && empty && values.length) {
          e.preventDefault();
          close();
          edit(values.length - 1);
        } else if (e.key === (getComputedStyle(field).direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft') && empty && values.length) {
          e.preventDefault();
          close();
          focusChip(values.length - 1);
        }
      });
      /* Pasted text with the separator in it splits there and at new
         lines; pasted text without it splits at commas and new lines. */
      field.addEventListener('paste', function (e) {
        var text = e.clipboardData && e.clipboardData.getData('text');
        if (!text) return;
        var pieces = text.indexOf(cut) >= 0 ? text.split(/\r?\n/).reduce(function (all, line) { return all.concat(line.split(cut)); }, []) : text.split(/,|\r?\n/);
        if (pieces.length < 2) return;
        e.preventDefault();
        var start = field.selectionStart || 0, end = field.selectionEnd || 0;
        pieces[0] = field.value.slice(0, start) + pieces[0];
        pieces[pieces.length - 1] += field.value.slice(end);
        close();
        commit(pieces);
      });

      function sync() {
        values = parse(keeper.value);
        render();
      }
      new MutationObserver(sync).observe(keeper, { attributes: true, attributeFilter: ['disabled', 'required', 'value'] });
      var form = keeper.form;
      if (form) form.addEventListener('reset', function () { setTimeout(function () { field.value = ''; sync(); }, 0); });
      keeper.__pudlComboSync = sync;
      values = parse(keeper.value);
      render();

      /* The field's values for a script (0.80.0): each change is checked
         as a reader's is, redraws the chips and keeps the input's joined
         value, and fires no change event. */
      keeper.__pudlTokens = {
        values: function () { return values.slice(); },
        set: function (list) {
          values = [];
          pulled = null; pulledAt = -1;
          var r = commit((Array.isArray(list) ? list : []).map(String), false, true);
          render();
          write(true);
          /* Whether nothing was refused; repeats are dropped, not refused. */
          return r.refused.length === 0;
        },
        add: function (v) { return commit([String(v)], false, true).added.length > 0; },
        remove: function (v) {
          var at = -1;
          values.forEach(function (w, i) { if (w.toLowerCase() === String(v).trim().toLowerCase()) at = i; });
          if (at < 0) return false;
          values.splice(at, 1);
          render();
          write(true);
          return true;
        }
      };

      return {
        has: has,
        commit: commit,
        /* Escape puts back a chip taken into the field, as it was, or
           else clears what is typed. It says whether it did either. */
        escape: function () {
          if (pulled !== null) { commit([pulled], true); return true; }
          if (field.value) { field.value = ''; return true; }
          return false;
        },
        /* Typing the separator ends a value: everything before it is
           added, and what follows stays in the field. */
        split: function () {
          /* Spaces before a value are never part of it, so the space
             after a separator such as ", " is not left in the field. */
          if (/^\s+$/.test(field.value)) { field.value = ''; return; }
          if (field.value.indexOf(cut) < 0) return;
          var pieces = field.value.split(cut);
          var rest = pieces.pop().replace(/^\s+/, '');
          var r = commit(pieces);
          /* A refused value stays before what follows it, to be mended. */
          if (!field.disabled) field.value = r.refused.length ? field.value + joiner + rest : rest;
        }
      };
    }

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
    if (wrap.hasAttribute('data-combo-tokens')) { enhanceTokens(wrap); return; }
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

  /* A token field: the input the page wrote keeps the joined values,
     hidden, and a field to type one value in takes its place and its
     label. */
  function enhanceTokens(wrap) {
    var keeper = wrap.querySelector(':scope > input');
    if (!keeper) return;
    wrap.__pudlCombo = true;
    var listId = keeper.getAttribute('list');
    var source = (listId && document.getElementById(listId)) || document.createElement('datalist');
    var field = document.createElement('input');
    field.type = 'text';
    field.className = 'form-input';
    field.autocomplete = 'off';
    field.id = keeper.id ? keeper.id + '-combo' : 'pudl-combo-field-' + (++uid);
    if (listId) field.setAttribute('data-combo-list', listId);
    ['aria-describedby', 'aria-invalid', 'placeholder', 'aria-label', 'aria-labelledby', 'data-combo-complete'].forEach(function (a) {
      if (keeper.hasAttribute(a)) field.setAttribute(a, keeper.getAttribute(a));
    });
    keeper.removeAttribute('list');
    keeper.hidden = true;
    wrap.insertBefore(field, keeper);
    if (keeper.id) {
      document.querySelectorAll('label[for="' + CSS.escape(keeper.id) + '"]').forEach(function (l) { l.htmlFor = field.id; });
    }
    new Combo(wrap, field, source, null, keeper);
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
    refresh: function (el) { if (el && el.__pudlComboSync) el.__pudlComboSync(); },
    /* A token field's values, given its input (0.80.0): values(), set(list),
       add(value) and remove(value). Null for anything else. */
    tokens: function (el) { return (el && el.__pudlTokens) || null; }
  };
  document.addEventListener('pudl:window-open', function (e) { enhance(e.target); });
  document.addEventListener('pudl:regions-swap', function () { enhance(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { enhance(); });
  else enhance();
})();
