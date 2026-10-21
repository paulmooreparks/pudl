/* PUDL meters, sliders, number fields, password fields, pictures and
   avatars. Load with defer. Every control here is native markup that works
   without the script, and the script adds what markup alone cannot do.

   A progress bar needs no script. It is <progress class="progress">, and
   pudl.css draws it.

   A meter is a native meter of class .meter, usually in a .meter-row with
   its name and its value in words:

     <div class="meter-row">
       <span class="meter-label" id="fuel-name">Fuel</span>
       <meter class="meter" min="0" max="100" low="20" high="50" optimum="90"
              value="35" aria-labelledby="fuel-name"></meter>
       <span class="meter-value">35%</span>
     </div>

   The meter's low, high and optimum attributes already say which way is
   good. Low fuel is bad, so optimum sits above high; a high pollution
   reading is bad, so optimum sits below low; and low and high set the
   thresholds. An attribute to turn a meter round is therefore not needed.
   The script works out the band the value falls in as the HTML
   specification's meter algorithm does, optimum, suboptimum or even less
   good, and sets data-band="good", "fair" or "poor" on the meter and on its
   .meter-row. The stylesheet colours the fill by band and leads the words
   with a glyph for fair and poor, so colour never stands alone. On a
   .meter.marks the fill stays in the accent and the script sets
   --meter-low and --meter-high, the thresholds as percentages of the
   track, where the stylesheet draws a mark for each threshold the meter
   has. Without the script a meter is drawn in the accent. A change to the
   meter's attributes, which is what setting meter.value makes, is followed.

   A slider is <input type="range" class="form-range">. The script keeps
   --range-fill, the value as a percentage of the track, in step with the
   value, which fills the track in the accent up to the thumb in Chromium
   and WebKit (Firefox fills it itself), and keeps every <output for="ID">
   of the slider showing its value, written in the page's language. A
   slider says a value roughly. Where the exact value matters, put a number
   field beside it and have the application keep the two in step.

   A number field is a native number input in a .number-field:

     <span class="number-field">
       <input class="form-input" type="number" id="guests" name="guests"
              value="3" min="0" max="20" step="1">
     </span>

   A browser's number input refuses a decimal comma in most languages and
   draws its spin buttons differently in each engine, or not at all. So, as
   a date field is in pudl-date.js, the input is hidden, keeps its value,
   its name, min, max and step, and is what the form sends, always as a
   plain number. A text field takes its place, with a minus key and a plus
   key joined at its end. The field writes the number as the nearest lang
   attribute's language does, with its digits, decimal sign and grouping,
   and where there is no language, as plain digits with a point and no
   grouping. The reader may type the number that way, in any script's
   digits, with a leading minus. Letters, such as the e a browser's number
   input accepts, are refused. Leaving the field, or pressing Enter, takes
   what is typed: the number is moved to the nearest step counted from min,
   or from 0 where there is no min, and held inside min and max. The field
   shows it written out again, and input and change fire on the hidden
   input, once. An empty field clears the value. Text that is not a number
   leaves the value as it was and marks the field aria-invalid until the
   next good entry.

   Up and Down step by one step, and PageUp and PageDown by ten. The keys
   step once when pressed and repeat while held, and each is disabled at
   the end of the range it moves toward. The mouse wheel steps by one step,
   but only while the field has focus and the pointer is over the field or
   its keys, so a page scrolled past an unfocused field never changes it.
   The input's disabled, readonly, required, placeholder and aria-*
   attributes are copied to the field and kept in step, and a form reset
   shows the reset value.

   A password field is a password input in a .password-field:

     <span class="password-field">
       <input class="form-input" type="password" id="pw" name="pw" autocomplete="current-password">
     </span>

   The input stays where it is, and the script adds a key at its end that
   shows the password: a raised key reading Show, pressed in, with
   aria-pressed="true", and reading Hide while the password shows. With
   data-password-toggle="glyph" on the .password-field or the input, the
   key is the eye glyph instead, the struck-out eye while the password
   shows, and its label says what it will do. A press keeps focus and the
   caret where they were in the field. The password is hidden again when
   its form is sent, so the browser offers to save it as a password. While
   the field has focus and Caps Lock is on, a line under the field,
   .password-caps, a status region, says so. Paste is never blocked.

   A picture is an img in a .figure, and an avatar is a .avatar that may
   hold an img. A picture that fails to load marks its .figure data-broken,
   and the script puts the picture's alternative text in its place, over
   the quiet fill; an avatar's picture that fails shows the initials of
   the avatar's aria-label instead. A .figure's img with width and height
   keeps their proportion, so the page never jumps as pictures arrive.

   A .avatar.tint takes a soft tint from the name in its aria-label. The
   hue is the 32-bit FNV-1a hash of the name's UTF-16 code units, trimmed
   and in lower case, taken modulo 360, so the same name has the same tint
   on every page and in every implementation that follows this rule. A hue
   set by the page, as --avatar-hue on the avatar, is kept. An
   .avatar-status with an aria-label is given role="img" where it has no
   role.

   The words the script uses are the page's own where the input, or an
   element around it, has data-number-text-NAME or
   data-password-text-NAME, for these names and their English defaults.
   For a number field they are decrease ("Decrease") and increase
   ("Increase"). For a password field they are show ("Show"), hide
   ("Hide"), show-label ("Show the password"), hide-label ("Hide the
   password") and caps ("Caps Lock is on").

   pudlFields.enhance(root) takes in controls added later, and
   pudlFields.refresh(element) shows a value a script has set on a slider,
   a meter or a number field's input. (0.74.0) */
(function () {
  'use strict';

  var uid = 0;
  /* The zero of each script's run of ten decimal digits that a reader may
     type, so ١٢ and ２２ are read as 12 and 22. */
  var ZEROS = [0x660, 0x6F0, 0x7C0, 0x966, 0x9E6, 0xA66, 0xAE6, 0xB66, 0xBE6, 0xC66, 0xCE6, 0xD66, 0xDE6, 0xE50, 0xED0, 0xF20, 0x1040, 0x17E0, 0x1810, 0xFF10];

  function words(el, kind, name, fallback) {
    var attr = 'data-' + kind + '-text-' + name;
    var host = el.closest('[' + attr + ']');
    return (host && host.getAttribute(attr)) || fallback;
  }

  function fire(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function each(root, selector, fn) {
    if (root.matches && root.matches(selector)) fn(root);
    root.querySelectorAll(selector).forEach(fn);
  }

  /* The element's language: the nearest lang attribute's, or null where
     there is none or it is empty. */
  function langOf(el) {
    var host = el.closest('[lang]');
    var lang = host ? host.getAttribute('lang').trim() : '';
    if (!lang) return null;
    try { return Intl.getCanonicalLocales(lang)[0]; } catch (e) { return null; }
  }

  /* Text as typed, with every script's digits made ASCII, the marks that
     only steer the direction of text taken out, and the minus sign made a
     hyphen. */
  function plain(text) {
    var out = '';
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i), digit = -1;
      for (var z = 0; z < ZEROS.length; z++) if (c >= ZEROS[z] && c < ZEROS[z] + 10) { digit = c - ZEROS[z]; break; }
      out += digit >= 0 ? String(digit) : text[i];
    }
    return out.replace(/[‎‏؜‪-‮⁦-⁩]/g, '').replace(/[−﹣－]/g, '-').trim();
  }

  /* How many decimal places a number has, for a step such as 0.01. */
  function places(n) {
    for (var d = 0; d < 15; d++) {
      var scaled = n * Math.pow(10, d);
      if (Math.abs(Math.round(scaled) - scaled) < 1e-9 * Math.max(1, Math.abs(scaled))) return d;
    }
    return 15;
  }

  /* How a language writes numbers: its decimal sign, its grouping sign and
     the sizes of its groups, the last group and the ones before it, which
     differ in Indian grouping (12,34,567). With no language, numbers are
     plain: a point, and no grouping when written, though a comma between
     groups of three is understood when typed. */
  var locales = {};
  function numbering(lang) {
    var key = lang || '';
    if (locales[key]) return locales[key];
    var o = { lang: lang, decimal: '.', group: ',', primary: 3, secondary: 3 };
    if (lang) {
      try {
        var ints = [];
        new Intl.NumberFormat(lang, { useGrouping: true }).formatToParts(1234567.5).forEach(function (p) {
          if (p.type === 'decimal') o.decimal = plain(p.value) || p.value;
          else if (p.type === 'group') o.group = p.value;
          else if (p.type === 'integer') ints.push(p.value.length);
        });
        if (ints.length > 1) o.primary = ints[ints.length - 1];
        o.secondary = ints.length > 2 ? ints[ints.length - 2] : o.primary;
        /* A space of any width between groups is lost with the rest of the
           spaces typed, so it needs no checking. */
        if (/^\s$/.test(o.group)) o.group = null;
      } catch (e) { o.lang = null; }
    }
    return (locales[key] = o);
  }

  function formatter(loc, dp) {
    if (!loc.lang) return function (n) { return dp == null ? String(n) : n.toFixed(dp); };
    var nf = new Intl.NumberFormat(loc.lang, { minimumFractionDigits: dp == null ? 0 : dp, maximumFractionDigits: dp == null ? 20 : dp });
    return function (n) { return nf.format(n); };
  }

  /* Whether integer digits split by the grouping sign are grouped as the
     language groups them. */
  function grouped(parts, loc) {
    if (parts.length < 2 || !parts[0].length || parts[0].length > loc.secondary) return false;
    for (var i = 1; i < parts.length; i++) {
      var want = i === parts.length - 1 ? loc.primary : loc.secondary;
      if (parts[i].length !== want) return false;
    }
    return true;
  }

  /* A number as the reader typed it, or null where it is not one. */
  function parse(text, loc) {
    var t = plain(text).replace(/\s+/g, '');
    var sign = /^[-+]/.exec(t);
    if (sign) t = t.slice(1);
    var dec = loc.decimal, grp = loc.group;
    /* Where the language's decimal sign is one of its script's own, a
       point typed on a Latin keyboard is a decimal sign too. */
    if (dec !== '.' && dec !== ',' && grp !== '.') t = t.split('.').join(dec);
    if (grp && t.indexOf(grp) >= 0) {
      var at = t.indexOf(dec);
      var whole = at >= 0 ? t.slice(0, at) : t;
      if (grouped(whole.split(grp), loc)) {
        t = whole.split(grp).join('') + (at >= 0 ? t.slice(at) : '');
      } else if (at < 0 && (grp === '.' || grp === ',') && t.split(grp).length === 2) {
        /* One point or comma, where the language groups with it but no
           group of the right size follows, is the reader's decimal sign:
           1.5 typed in German is one and a half. The field writes the
           number back in the language's way, so the reader sees what was
           taken. */
        t = t.split(grp).join(dec);
      } else {
        return null;
      }
    }
    if (dec !== '.') t = t.split(dec).join('.');
    if (!/^(\d+\.?\d*|\.\d+)$/.test(t)) return null;
    var n = Number(t);
    if (!isFinite(n)) return null;
    return sign && sign[0] === '-' && n !== 0 ? -n : n;
  }

  /* ---- Meters ---- */

  /* The band a meter's value falls in, as the HTML specification's meter
     algorithm, and Chromium's and WebKit's code, find it: where optimum is
     below low, the region from min to low is good; where it is above high,
     the region from high to max is good; otherwise the region from low to
     high is good. The IDL attributes give each number already clamped as
     the specification says. */
  function band(m) {
    var v = m.value, low = m.low, high = m.high, opt = m.optimum;
    if (opt < low) return v <= low ? 'good' : v <= high ? 'fair' : 'poor';
    if (opt > high) return v >= high ? 'good' : v >= low ? 'fair' : 'poor';
    return v >= low && v <= high ? 'good' : 'fair';
  }

  function drawMeter(m) {
    var b = band(m);
    var row = m.parentElement && m.parentElement.classList.contains('meter-row') ? m.parentElement : null;
    var hosts = row ? [m, row] : [m];
    var span = m.max - m.min;
    var marks = m.classList.contains('marks');
    hosts.forEach(function (el) {
      el.setAttribute('data-band', b);
      ['low', 'high'].forEach(function (end) {
        if (marks && span > 0 && m.hasAttribute(end)) {
          el.style.setProperty('--meter-' + end, ((m[end] - m.min) / span * 100) + '%');
          el.style.setProperty('--meter-' + end + '-mark', 'block');
        } else {
          el.style.removeProperty('--meter-' + end);
          el.style.removeProperty('--meter-' + end + '-mark');
        }
      });
    });
  }

  function enhanceMeter(m) {
    if (m.__pudlMeter) { drawMeter(m); return; }
    m.__pudlMeter = true;
    drawMeter(m);
    new MutationObserver(function () { drawMeter(m); })
      .observe(m, { attributes: true, attributeFilter: ['value', 'min', 'max', 'low', 'high', 'optimum', 'class'] });
  }

  /* ---- Sliders ---- */

  function drawRange(r) {
    var min = r.min === '' || isNaN(+r.min) ? 0 : +r.min;
    var max = r.max === '' || isNaN(+r.max) ? 100 : +r.max;
    var v = +r.value;
    r.style.setProperty('--range-fill', (max > min ? Math.max(0, Math.min(100, (v - min) / (max - min) * 100)) : 0) + '%');
    if (!r.id) return;
    var step = r.getAttribute('step');
    var dp = step && step.trim().toLowerCase() === 'any' ? null : Math.max(places(+step || 1), places(min));
    var write = formatter(numbering(langOf(r)), dp);
    Array.prototype.forEach.call(document.querySelectorAll('output'), function (o) {
      if (o.htmlFor && o.htmlFor.contains(r.id)) o.textContent = write(v);
    });
  }

  function enhanceRange(r) {
    r.__pudlRange = true;
    drawRange(r);
  }

  /* ---- Number fields ---- */

  function NumberField(input, wrap) {
    var id = 'pudl-number-' + (++uid);
    var loc = numbering(langOf(wrap));
    var min, max, step, base, dp, write;
    var bad = false, shown = '', timer = 0, copied = [];

    var field = document.createElement('input');
    field.type = 'text';
    field.className = 'form-input';
    field.autocomplete = 'off';
    field.spellcheck = false;
    field.id = input.id ? input.id + '-text' : id + '-field';
    field.setAttribute('role', 'spinbutton');

    function key(kind, fallback) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'icon-btn number-step number-' + kind;
      b.tabIndex = -1;
      b.setAttribute('data-toolbar-skip', '');
      b.setAttribute('aria-label', words(input, 'number', kind, fallback));
      b.setAttribute('aria-controls', field.id);
      return b;
    }
    var down = key('decrease', 'Decrease');
    var up = key('increase', 'Increase');

    wrap.insertBefore(field, input.nextSibling);
    wrap.appendChild(down);
    wrap.appendChild(up);
    input.hidden = true;
    /* The input's label is now the label of the field the reader types in. */
    if (input.id) {
      document.querySelectorAll('label[for="' + CSS.escape(input.id) + '"]').forEach(function (l) { l.htmlFor = field.id; });
    }

    function attr(name) {
      var s = input.getAttribute(name);
      if (s == null || !s.trim()) return null;
      var n = Number(s);
      return isFinite(n) ? n : null;
    }
    function settings() {
      min = attr('min');
      max = attr('max');
      if (min != null && max != null && max < min) max = min;
      var s = (input.getAttribute('step') || '').trim().toLowerCase();
      step = s === 'any' ? null : (attr('step') > 0 ? attr('step') : 1);
      base = min != null ? min : 0;
      dp = step == null ? null : Math.max(places(step), places(base));
      write = formatter(loc, dp);
      field.inputMode = step != null && dp === 0 ? 'numeric' : 'decimal';
      if (min != null) field.setAttribute('aria-valuemin', min); else field.removeAttribute('aria-valuemin');
      if (max != null) field.setAttribute('aria-valuemax', max); else field.removeAttribute('aria-valuemax');
    }

    function value() { return input.value === '' || !isFinite(+input.value) ? null : +input.value; }
    function tidy(n) { return dp == null ? n : Number(n.toFixed(dp)); }
    /* A number moved to the nearest step from min, or from 0, and held
       inside min and max, landing on a step at max too. */
    function snap(n) {
      if (step != null) n = base + Math.round((n - base) / step) * step;
      if (max != null && n > max) n = step != null ? base + Math.floor((max - base) / step + 1e-9) * step : max;
      if (min != null && n < min) n = min;
      return tidy(n);
    }
    function locked() { return field.disabled || field.readOnly; }

    function invalid() {
      if (bad || input.getAttribute('aria-invalid') === 'true') field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
    }
    function keys() {
      var v = value();
      down.disabled = field.disabled || (v != null && min != null && v <= min);
      up.disabled = field.disabled || (v != null && max != null && v >= max);
    }
    function show() {
      var v = value();
      shown = field.value = v == null ? '' : write(v);
      if (v == null) { field.removeAttribute('aria-valuenow'); field.removeAttribute('aria-valuetext'); }
      else { field.setAttribute('aria-valuenow', v); field.setAttribute('aria-valuetext', shown); }
      keys();
    }
    function set(n) {
      var s = n == null ? '' : String(n);
      var changed = input.value !== s;
      input.value = s;
      bad = false;
      invalid();
      show();
      if (changed) fire(input);
    }
    /* Takes what is typed. False where it is not a number. */
    function commit() {
      if (field.value === shown && !bad) return true;
      if (!field.value.trim()) { set(null); return true; }
      var n = parse(field.value, loc);
      if (n == null) { bad = true; invalid(); return false; }
      set(snap(n));
      return true;
    }
    /* Steps by k steps from the value, or from what is typed where that is
       a number. From an empty field the first step lands next to 0. */
    function stepBy(k) {
      if (locked()) return false;
      var from = value();
      if (field.value !== shown) {
        var typed = field.value.trim() ? parse(field.value, loc) : null;
        if (typed != null) from = snap(typed);
      }
      var before = input.value;
      set(snap((from == null ? 0 : from) + k * (step == null ? 1 : step)));
      return input.value !== before;
    }

    field.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var k = { ArrowUp: 1, ArrowDown: -1, PageUp: 10, PageDown: -10 }[e.key];
      if (k) { e.preventDefault(); stepBy(k); return; }
      /* A refused entry is not sent with the form; a good one is taken and
         the Enter goes on to the form, as a native field's does. */
      if (e.key === 'Enter' && !commit()) e.preventDefault();
    });
    field.addEventListener('blur', commit);

    /* A key steps once when pressed and, held, repeats after a pause. A
       mouse press puts focus in the field, so the wheel and the arrow keys
       go on from there; a finger's press does not, so a phone does not
       raise its keyboard for a tap on plus. */
    function stop() { clearTimeout(timer); timer = 0; }
    function hold(btn, k) {
      btn.addEventListener('pointerdown', function (e) {
        if (e.button !== 0 || btn.disabled) return;
        e.preventDefault();
        if (e.pointerType !== 'touch' && document.activeElement !== field) field.focus();
        stop();
        if (!stepBy(k)) return;
        timer = setTimeout(function again() {
          if (stepBy(k)) timer = setTimeout(again, 60); else stop();
        }, 400);
      });
      btn.addEventListener('pointerup', stop);
      btn.addEventListener('pointerleave', stop);
      btn.addEventListener('pointercancel', stop);
      /* A press from assistive technology or a script, which comes with no
         pointer, steps once. */
      btn.addEventListener('click', function (e) { if (e.detail === 0) stepBy(k); });
    }
    hold(down, -1);
    hold(up, 1);
    document.addEventListener('pointerup', stop, true);
    addEventListener('blur', stop);

    /* The wheel steps by one step, only while the field has focus and the
       pointer is over the field or its keys. Otherwise the page scrolls as
       it would anywhere else. A touchpad sends many small turns, so steps
       come no faster than one each 40ms. */
    var lastWheel = 0;
    wrap.addEventListener('wheel', function (e) {
      if (document.activeElement !== field || locked() || !e.deltaY) return;
      e.preventDefault();
      var now = Date.now();
      if (now - lastWheel < 40) return;
      lastWheel = now;
      stepBy(e.deltaY < 0 ? 1 : -1);
    }, { passive: false });

    /* The input's state, copied to the field and kept in step. */
    function sync() {
      field.disabled = input.disabled;
      field.readOnly = input.readOnly;
      field.required = input.required;
      if (input.hasAttribute('placeholder')) field.setAttribute('placeholder', input.getAttribute('placeholder'));
      else field.removeAttribute('placeholder');
      copied.forEach(function (a) { if (!input.hasAttribute(a)) field.removeAttribute(a); });
      copied = [];
      Array.prototype.forEach.call(input.attributes, function (a) {
        if (a.name.indexOf('aria-') !== 0 || a.name === 'aria-invalid' || a.name === 'aria-hidden' || /^aria-value/.test(a.name)) return;
        field.setAttribute(a.name, a.value);
        copied.push(a.name);
      });
      settings();
      invalid();
      if (document.activeElement !== field) show(); else keys();
    }
    sync();
    new MutationObserver(sync).observe(input, { attributes: true });
    if (input.form) input.form.addEventListener('reset', function () { setTimeout(function () { bad = false; sync(); show(); }, 0); });
    input.__pudlFieldsRefresh = function () { bad = false; sync(); show(); };
  }

  function enhanceNumber(wrap) {
    var input = wrap.querySelector(':scope > input[type="number"]');
    if (!input || input.__pudlNumber) return;
    input.__pudlNumber = true;
    new NumberField(input, wrap);
  }

  /* ---- Password fields ---- */

  function PasswordField(input, wrap) {
    var glyph = (wrap.getAttribute('data-password-toggle') || input.getAttribute('data-password-toggle')) === 'glyph';
    var key = document.createElement('button');
    key.type = 'button';
    key.className = (glyph ? 'icon-btn' : 'btn') + ' password-toggle';
    if (input.id) key.setAttribute('aria-controls', input.id);
    wrap.appendChild(key);

    /* The Caps Lock line is a status region that is always present and
       empty while Caps Lock is off, so that words put into it are read out,
       and an empty one takes no room. */
    var caps = document.createElement('span');
    caps.className = 'password-caps';
    caps.setAttribute('role', 'status');
    wrap.parentNode.insertBefore(caps, wrap.nextSibling);

    /* The key is a toggle, so its accessible name stays "Show the password"
       and its pressed state says whether it is on, as the ARIA practices
       ask: a name that changed as well would be heard as "Hide, pressed".
       What the eye reads, the word or the glyph, follows the state. */
    key.setAttribute('aria-label', words(input, 'password', 'show-label', 'Show the password'));
    function label() {
      var showing = input.type === 'text';
      key.setAttribute('aria-pressed', showing ? 'true' : 'false');
      if (!glyph) key.textContent = showing ? words(input, 'password', 'hide', 'Hide') : words(input, 'password', 'show', 'Show');
    }
    label();

    /* A press keeps focus in the field, where it was there, and the
       caret and selection where they were. */
    key.addEventListener('pointerdown', function (e) { if (document.activeElement === input) e.preventDefault(); });
    key.addEventListener('click', function () {
      if (input.disabled) return;
      var had = document.activeElement === input;
      var a = input.selectionStart, b = input.selectionEnd, dir = input.selectionDirection;
      input.type = input.type === 'password' ? 'text' : 'password';
      label();
      if (!had) return;
      input.focus();
      /* Chromium rebuilds the field for its new type when it next lays the
         page out, and puts the caret at the start as it does, so the page
         is laid out first and the selection put back after. */
      void input.offsetWidth;
      try { input.setSelectionRange(a, b, dir || 'none'); } catch (err) { /* nothing to restore */ }
    });

    function capsFrom(e) {
      if (!e.getModifierState) return;
      var on = e.getModifierState('CapsLock');
      var text = on ? words(input, 'password', 'caps', 'Caps Lock is on') : '';
      if (caps.textContent !== text) caps.textContent = text;
    }
    input.addEventListener('keydown', capsFrom);
    input.addEventListener('keyup', capsFrom);
    input.addEventListener('pointerdown', capsFrom);
    input.addEventListener('blur', function () { caps.textContent = ''; });

    function sync() { key.disabled = input.disabled; }
    sync();
    new MutationObserver(sync).observe(input, { attributes: true, attributeFilter: ['disabled'] });
    if (input.form) input.form.addEventListener('submit', function () {
      if (input.type === 'text') { input.type = 'password'; label(); }
    });
  }

  function enhancePassword(wrap) {
    var input = wrap.querySelector(':scope > input[type="password"]');
    if (!input || input.__pudlPassword) return;
    input.__pudlPassword = true;
    new PasswordField(input, wrap);
  }

  /* ---- Pictures and avatars ---- */

  function initials(name) {
    var parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    var first = Array.from(parts[0])[0];
    var last = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] : '';
    return (first + last).toLocaleUpperCase();
  }

  function hostOf(img) {
    var p = img.parentElement;
    return p && (p.classList.contains('figure') || p.classList.contains('avatar')) ? p : null;
  }

  function broken(img) {
    var host = hostOf(img);
    if (!host) return;
    host.setAttribute('data-broken', '');
    if (host.classList.contains('figure')) {
      if (host.querySelector(':scope > .figure-fallback')) return;
      /* The img is no longer drawn, so the fallback is the picture to
         assistive technology too, with the same alternative text. */
      var alt = img.getAttribute('alt') || '';
      var fb = document.createElement('span');
      fb.className = 'figure-fallback';
      if (alt) { fb.setAttribute('role', 'img'); fb.setAttribute('aria-label', alt); }
      else fb.setAttribute('aria-hidden', 'true');
      fb.textContent = alt;
      img.parentNode.insertBefore(fb, img.nextSibling);
    } else if (!host.textContent.trim()) {
      var mark = document.createElement('span');
      mark.className = 'avatar-initials';
      mark.textContent = initials(host.getAttribute('aria-label'));
      host.insertBefore(mark, host.firstChild);
    }
  }
  function mended(img) {
    var host = hostOf(img);
    if (!host || !host.hasAttribute('data-broken')) return;
    host.removeAttribute('data-broken');
    var fb = host.querySelector(':scope > .figure-fallback, :scope > .avatar-initials');
    if (fb) fb.remove();
  }

  function enhanceImage(img) {
    var host = hostOf(img);
    if (!host) return;
    /* The frame keeps the proportion of the img's width and height even
       where the picture's own differs, so object-fit decides the fit, and
       the fallback for a broken picture takes the same proportion. */
    if (host.classList.contains('figure')) {
      var w = +img.getAttribute('width'), h = +img.getAttribute('height');
      if (w > 0 && h > 0) host.style.setProperty('--figure-ratio', w + ' / ' + h);
    }
    /* A picture that failed before this script ran. decode() refuses only
       a picture that cannot be shown, so a picture with no size of its own,
       such as some SVG, is not taken for a broken one. */
    if (img.complete) {
      if (!img.getAttribute('src') && !img.getAttribute('srcset')) broken(img);
      else if (!img.naturalWidth) img.decode().catch(function () { if (img.complete && !img.naturalWidth) broken(img); });
    }
  }

  /* 32-bit FNV-1a over the name's UTF-16 code units. */
  function hue(name) {
    var h = 0x811c9dc5;
    name = name.trim().toLowerCase();
    for (var i = 0; i < name.length; i++) {
      h ^= name.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h % 360;
  }
  function enhanceTint(av) {
    if (av.__pudlHue === undefined && getComputedStyle(av).getPropertyValue('--avatar-hue').trim()) { av.__pudlHue = null; return; }
    if (av.__pudlHue === null) return;
    var name = av.getAttribute('aria-label') || av.textContent;
    if (!name || !name.trim()) return;
    av.__pudlHue = hue(name);
    av.style.setProperty('--avatar-hue', av.__pudlHue);
  }

  function enhanceStatus(s) {
    if (s.hasAttribute('aria-label') && !s.hasAttribute('role')) s.setAttribute('role', 'img');
  }

  function enhance(root) {
    root = root || document;
    each(root, 'meter.meter', enhanceMeter);
    each(root, 'input[type="range"].form-range', enhanceRange);
    each(root, '.number-field', enhanceNumber);
    each(root, '.password-field', enhancePassword);
    each(root, '.figure > img, .avatar > img', enhanceImage);
    each(root, '.avatar.tint', enhanceTint);
    each(root, '.avatar-status', enhanceStatus);
  }

  /* A slider's fill and words follow every change, made by the reader or
     by a form's reset. */
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t && t.__pudlRange) drawRange(t);
  }, true);
  document.addEventListener('reset', function (e) {
    var form = e.target;
    setTimeout(function () {
      if (form.querySelectorAll) form.querySelectorAll('input[type="range"].form-range').forEach(function (r) { if (r.__pudlRange) drawRange(r); });
    }, 0);
  }, true);

  /* An error event does not bubble, so it is heard on its way down. */
  document.addEventListener('error', function (e) { if (e.target && e.target.tagName === 'IMG') broken(e.target); }, true);
  document.addEventListener('load', function (e) { if (e.target && e.target.tagName === 'IMG') mended(e.target); }, true);

  window.pudlFields = {
    enhance: enhance,
    refresh: function (el) {
      if (!el) return;
      if (el.__pudlFieldsRefresh) el.__pudlFieldsRefresh();
      else if (el.__pudlRange) drawRange(el);
      else if (el.__pudlMeter) drawMeter(el);
      else enhance(el);
    }
  };
  document.addEventListener('pudl:window-open', function (e) { enhance(e.target); });
  document.addEventListener('pudl:regions-swap', function () { enhance(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { enhance(); });
  else enhance();
})();
