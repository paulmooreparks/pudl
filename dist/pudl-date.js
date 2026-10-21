/* PUDL date and time fields. Load with defer.

   A date or a time is a native input marked data-date:

     <label class="form-label" for="due">Due</label>
     <input class="form-input" type="date" id="due" name="due" value="2026-10-22"
            min="2026-01-01" max="2026-12-31" data-date>
     <input class="form-input" type="time" id="at" name="at" value="13:30" step="900" data-date>

   Without this script each is the browser's own date or time input, so the
   field works already. The browser's control cannot be the one PUDL draws,
   though. Firefox puts a calendar button inside a date input that no
   stylesheet removes, and WebKit on Windows shows a date input as plain
   text. So, as a searchable select is in pudl-combo.js, the input is
   hidden, keeps its value and its name, and is what the form sends, always
   as an ISO Gregorian date or a 24-hour time. A .combo takes its place,
   holding a text field and the raised opener at its end, and under it a
   line, the echo, that says in words what the field holds. The input's
   label moves to the field, and its required, disabled, readonly,
   placeholder, aria-describedby and aria-invalid are copied across and
   kept in step. The echo is added to the field's aria-describedby.

   The language is that of the nearest lang attribute. Where there is none,
   or it is empty, the field writes dates as yyyy-mm-dd and times as 24-hour
   HH:MM. Where there is one, it writes them as that language does, in its
   own calendar, so lang="th-TH" gives Buddhist years and
   lang="ja-JP-u-ca-japanese" gives Japanese eras; every calendar comes
   from Intl, and this script does no calendar arithmetic of its own.
   data-date-style on the input sets the form: "iso", "short" (numbers, the
   default where there is a language), "medium" (22 Oct 2026) or "long"
   (22 October 2026). "iso" also keeps the calendar Gregorian.

   The reader may type a date as yyyy-mm-dd in any language, as numbers in
   the language's order with anything between them, as a four-digit year
   followed by a month and a day, or with the month as a word in the
   language or in English. Where the month is a word, the other numbers
   may come in any order: the year is the one of three or more digits or
   past 31, so 2026 oct 28, 28 oct 2026 and October 28, 2026 are one
   date. A year of two digits is the one
   nearest today. In the Japanese calendar an era, written out or as its
   initial (R, H, S, T, M), may come before the year; without one the year
   is in the present era, and a year of four digits is Gregorian. t, the
   language's word for today, tomorrow or yesterday, and +3 or -1 for days
   from today are read too. A time may be typed as 9, 930, 0930, 9:30, 9.30
   or 21:30, with am or pm, in any case, with or without dots, or the
   language's own words for them; an hour alone with neither is in the
   morning. While the reader types, the echo writes out the date or time
   that will be taken, or says the text is not one yet. While a time field
   has focus and the pointer is over it, the mouse wheel steps the time to
   the next or the previous one the input allows, a minute at a time where
   it has no step; the year in the calendar's year chooser steps the same
   way. A field the page merely scrolls past is never changed.

   Leaving the field, or pressing Enter, takes what is typed. A real date
   inside the input's min and max, or a time inside them and on the
   input's step, becomes the input's value, the
   field shows it written out again, and input and change fire on the
   input, once. An empty field clears the value. Anything else leaves the
   value as it was and the text as typed, and marks the field aria-invalid
   until the next good entry.

   The opener of a date opens a month calendar in a dialog, following the
   Date Picker Dialog pattern of the ARIA Authoring Practices. The arrows
   move by a day or a week, Home and End to the ends of the week, PageUp
   and PageDown by a month, with Shift by a year; Enter or Space chooses
   the day and closes, and Escape or Alt+Up closes without choosing. Focus
   comes back to the field when it closes. The month and year at the top
   are a key that opens a chooser of the year's months, with the year as a
   field to type in or step, so a birthday decades back is a few presses
   away. Today, at the foot, goes to today, and Clear, where the field is
   not required, empties it. The opener of a time opens a list of times
   inside its min and max, every data-time-list minutes where the input
   carries that, else at the input's step where that is five minutes or
   more, else every half hour; Down and Up move through it, Enter chooses
   and Escape closes. In
   the field, Down or Alt+Down opens either one.

   A datetime-local input is left as the browser draws it.

   The words the script uses are the page's own where the input, or an
   element around it, carries data-date-text-NAME, for these names and
   their English defaults: open ("Choose a date", or "Choose a time"),
   previous ("Previous month"), next ("Next month"), earlier ("Previous
   year"), later ("Next year"), year ("Year"), today ("Today"), clear
   ("Clear"), unknown ("Not a date yet", or "Not a time yet"), outside
   ("{date} is outside the dates allowed", or "{date} is not one of the
   times allowed"), example ("e.g. {example}, or
   {iso}") and example-iso ("e.g. {iso}"). pudlDate.enhance(root) takes in
   fields added later, and pudlDate.refresh(input) shows a value a script
   has set. (0.74.0) */
(function () {
  'use strict';

  var uid = 0;
  /* Where Intl.Locale cannot say which day a week starts on, these regions
     start it on Sunday or on Saturday, as CLDR has them, and every other
     starts on Monday. The table is only a fallback. */
  var SUNDAY = 'AG AS BD BR BS BT BW BZ CA CN CO DM DO ET GT GU HK HN ID IL IN JM JP KE KH KR LA MH MM MO MT MX MZ NI NP PA PE PH PK PR PT PY SA SG SV TH TT TW UM US VE VI WS YE ZA ZW'.split(' ');
  var SATURDAY = 'AE AF BH DJ DZ EG IQ IR JO KW LY OM QA SD SY'.split(' ');
  /* The zero of each script's run of ten decimal digits that a reader may
     type, so ٢٢ and ２２ are read as 22. */
  var ZEROS = [0x660, 0x6F0, 0x7C0, 0x966, 0x9E6, 0xA66, 0xAE6, 0xB66, 0xBE6, 0xC66, 0xCE6, 0xD66, 0xDE6, 0xE50, 0xED0, 0xF20, 0x1040, 0x17E0, 0x1810, 0xFF10];
  var ENGLISH_MONTHS = 'january february march april may june july august september october november december'.split(' ');

  function words(input, name, fallback) {
    var attr = 'data-date-text-' + name;
    var host = input.closest('[' + attr + ']');
    return (host && host.getAttribute(attr)) || fallback;
  }

  function fire(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function pad(n, w) { n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; }

  /* Dates are reckoned in UTC throughout, so a change of daylight saving
     never moves a day. setUTCFullYear keeps a year below 100 as written. */
  function utc(y, m, d) { var t = new Date(0); t.setUTCFullYear(y, m - 1, d); return t; }
  function iso(t) { return pad(t.getUTCFullYear(), 4) + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate()); }
  function split(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
  }
  function when(s) { var p = split(s); return utc(p.y, p.m, p.d); }
  function daysIn(y, m) { return utc(y, m + 1, 0).getUTCDate(); }
  function real(y, m, d) { return y >= 1 && y <= 9999 && m >= 1 && m <= 12 && d >= 1 && d <= daysIn(y, m); }
  function addDays(s, n) { var p = split(s); return iso(utc(p.y, p.m, p.d + n)); }
  function between(a, b) { return Math.round((when(b) - when(a)) / 864e5); }
  function today() { var n = new Date(); return pad(n.getFullYear(), 4) + '-' + pad(n.getMonth() + 1) + '-' + pad(n.getDate()); }
  function inRange(s) { var p = split(s); return !!p && p.y >= 1 && p.y <= 9999; }

  /* Text as typed, with every script's digits made ASCII and the marks
     that only steer the direction of text taken out. */
  function plain(text) {
    var out = '';
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i), digit = -1;
      for (var z = 0; z < ZEROS.length; z++) if (c >= ZEROS[z] && c < ZEROS[z] + 10) { digit = c - ZEROS[z]; break; }
      out += digit >= 0 ? String(digit) : text[i];
    }
    return out.replace(/[‎‏؜‪-‮⁦-⁩]/g, '').trim();
  }

  /* The field's language: the nearest lang attribute's, or null where
     there is none or it is empty. */
  function langOf(el) {
    var host = el.closest('[lang]');
    var lang = host ? host.getAttribute('lang').trim() : '';
    if (!lang) return null;
    try { return Intl.getCanonicalLocales(lang)[0]; } catch (e) { return null; }
  }
  function withOption(locale, key, value) {
    try { var o = {}; o[key] = value; return new Intl.Locale(locale, o).toString(); } catch (e) { return locale; }
  }
  /* The first day of the week as Date counts it, Sunday being 0. */
  function weekStart(locale) {
    try {
      var l = new Intl.Locale(locale);
      var info = l.getWeekInfo ? l.getWeekInfo() : l.weekInfo;
      if (info && info.firstDay) return info.firstDay % 7;
      var region = l.region || (l.maximize && l.maximize().region);
      return SUNDAY.indexOf(region) >= 0 ? 0 : SATURDAY.indexOf(region) >= 0 ? 6 : 1;
    } catch (e) { return 1; }
  }

  /* A language's calendar, from Intl. A month is the run of Gregorian days
     whose year, era and month Intl writes alike, so a lunar month is found
     the same way as a Gregorian one. A year is found by guessing from the
     calendar's average year and walking to it. One model serves every
     field in a language. */
  var models = {};
  function Model(locale) {
    if (models[locale]) return models[locale];
    var m = models[locale] = {};
    var opts = function (o) { o.timeZone = 'UTC'; return o; };
    var fmt = function (o) { return new Intl.DateTimeFormat(locale, opts(o)); };
    var calendar = m.calendar = new Intl.DateTimeFormat(locale).resolvedOptions().calendar;
    var numbers = new Intl.DateTimeFormat(withOption(locale, 'numberingSystem', 'latn'), opts({ era: 'long', year: 'numeric', month: 'numeric', day: 'numeric' }));
    var cache = {}, size = 0;

    function parts(v) {
      var got = cache[v];
      if (got) return got;
      var o = { era: '', year: 0, related: 0, month: '', day: 0 };
      numbers.formatToParts(when(v)).forEach(function (x) {
        if (x.type === 'era') o.era = x.value;
        else if (x.type === 'relatedYear') o.related = +x.value;
        else if (x.type === 'year') o.year = +x.value;
        else if (x.type === 'month') o.month = /^\d+$/.test(x.value) ? String(+x.value) : x.value;
        else if (x.type === 'day') o.day = +x.value;
      });
      o.key = o.era + '|' + (o.related || o.year) + '|' + o.month;
      if (++size > 5000) { cache = {}; size = 0; }
      return (cache[v] = o);
    }
    m.parts = parts;
    var now = today();
    /* A calendar whose eras restart their count, as the Japanese does, is
       numbered by its Gregorian year in the year chooser. */
    var eras = {};
    ['1850-06-01', '1900-06-01', '1950-06-01', '2000-06-01', now].forEach(function (v) { eras[parts(v).era] = 1; });
    var resets = m.resets = Object.keys(eras).length > 1;
    function yearOf(v) { var o = parts(v); return resets ? split(v).y : (o.related || o.year); }
    m.yearOf = yearOf;
    /* Whether the calendar's months and days are the Gregorian ones, which
       is where English month names may be typed. */
    m.aligned = ['2026-01-31', '2026-02-28', '2024-02-29', '2026-03-01', '2026-12-31'].every(function (v) {
      var p = split(v), o = parts(v);
      return o.month === String(p.m) && o.day === p.d;
    });
    m.numericMonths = /^\d+$/.test(parts(now).month);

    function monthStart(v) {
      var k = parts(v).key;
      for (var i = 0; i < 40 && inRange(addDays(v, -1)) && parts(addDays(v, -1)).key === k; i++) v = addDays(v, -1);
      return v;
    }
    function monthEnd(v) {
      var k = parts(v).key;
      for (var i = 0; i < 40 && inRange(addDays(v, 1)) && parts(addDays(v, 1)).key === k; i++) v = addDays(v, 1);
      return v;
    }
    m.monthStart = monthStart;
    m.monthEnd = monthEnd;

    var nowYear = m.nowYear = yearOf(now);
    var span = nowYear - yearOf(addDays(now, -36525));
    var yearLength = span > 0 ? 36525 / span : 365.25;
    /* The first day of year n, or null where the calendar has none in the
       years a date input takes. */
    function yearStart(n) {
      var v = addDays(now, Math.round((n - nowYear) * yearLength)), i;
      if (!inRange(v)) return null;
      for (i = 0; i < 60 && inRange(v) && yearOf(v) < n; i++) v = addDays(v, 20);
      for (i = 0; i < 60 && inRange(v) && yearOf(v) > n; i++) v = addDays(v, -20);
      for (i = 0; i < 25 && inRange(v) && yearOf(v) < n; i++) v = addDays(v, 1);
      if (!inRange(v) || yearOf(v) !== n) return null;
      v = monthStart(v);
      for (i = 0; i < 14 && inRange(addDays(v, -1)) && yearOf(addDays(v, -1)) === n; i++) v = monthStart(addDays(v, -1));
      return v;
    }
    /* The first day of each month of year n. */
    m.months = function (n) {
      var out = [], v = yearStart(n);
      while (v && inRange(v) && yearOf(v) === n && out.length < 14) { out.push(v); v = addDays(monthEnd(v), 1); }
      return out;
    };
    /* The Gregorian day for year n, a month given by its key or by its
       place in the year, and day d, checked against what Intl writes for
       it; era, where given, must match too. */
    m.find = function (n, month, d, era) {
      var list = m.months(n);
      for (var i = 0; i < list.length; i++) {
        var o = parts(list[i]);
        if (month.place ? month.place !== i + 1 : o.month !== month.key) continue;
        var v = addDays(list[i], d - 1), q = parts(v);
        if (d >= 1 && q.key === o.key && q.day === d && (!era || q.era === era)) return v;
      }
      return null;
    };

    /* Ways to write a day. */
    m.short = fmt({ year: 'numeric', month: '2-digit', day: '2-digit' });
    m.medium = fmt({ year: 'numeric', month: 'short', day: 'numeric' });
    m.long = fmt({ year: 'numeric', month: 'long', day: 'numeric' });
    m.full = fmt({ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    m.head = fmt({ year: 'numeric', month: 'long' });
    m.monthName = fmt({ month: 'short' });
    m.yearName = fmt({ year: 'numeric' });
    /* A day's number alone, in the language's digits, without the 日 that
       Japanese writes after it. */
    var dayNumber = fmt({ day: 'numeric' });
    m.day = function (v) {
      var p = dayNumber.formatToParts(when(v)).filter(function (x) { return x.type === 'day'; })[0];
      return p ? p.value : dayNumber.format(when(v));
    };
    m.weekdayNarrow = fmt({ weekday: 'narrow' });
    m.weekdayLong = fmt({ weekday: 'long' });
    m.first = weekStart(locale);
    m.order = numbers.formatToParts(when(now)).map(function (x) { return x.type === 'relatedYear' ? 'year' : x.type; })
      .filter(function (t) { return t === 'day' || t === 'month' || t === 'year'; });
    m.wordOrder = m.long.formatToParts(when(now)).map(function (x) { return x.type === 'relatedYear' ? 'year' : x.type; })
      .filter(function (t) { return t === 'day' || t === 'year'; });

    /* The words a reader may type, gathered from Intl on first use: month
       names to their keys, era names, and words that may stand in a
       written date and mean nothing by themselves (年, de, the weekdays). */
    var lexicon = null;
    m.lexicon = function () {
      if (lexicon) return lexicon;
      lexicon = { months: {}, eras: {}, filler: {}, relative: {} };
      var low = function (s) { return s.toLocaleLowerCase(locale).replace(/\.$/, ''); };
      var longMonth = fmt({ month: 'long' });
      for (var k = -800; k <= 800; k += 12) {
        var v = addDays(now, k), key = parts(v).month;
        [longMonth.format(when(v)), m.monthName.format(when(v))].forEach(function (name) {
          if (!(low(name) in lexicon.months)) lexicon.months[low(name)] = key;
        });
      }
      if (m.aligned) ENGLISH_MONTHS.forEach(function (name, i) {
        if (!(name in lexicon.months)) lexicon.months[name] = String(i + 1);
        if (!(name.slice(0, 3) in lexicon.months)) lexicon.months[name.slice(0, 3)] = String(i + 1);
      });
      [m.long, m.medium, m.full, m.short].forEach(function (f) {
        f.formatToParts(when(now)).forEach(function (x) {
          if (x.type !== 'literal' && x.type !== 'era') return;
          var whole = low(x.value.trim());
          if (whole) { lexicon.filler[whole] = 1; lexicon.filler[whole.replace(/\./g, '')] = 1; }
          x.value.split(/[\s,./]+/).forEach(function (w) { if (w) lexicon.filler[low(w)] = 1; });
        });
      });
      for (var d = 0; d < 7; d++) {
        var day = utc(2024, 1, 7 + d);
        lexicon.filler[low(m.weekdayLong.format(day))] = 1;
        lexicon.filler[low(fmt({ weekday: 'short' }).format(day))] = 1;
      }
      /* An era that restarts its count, with the Gregorian year it began. */
      if (resets) {
        var namers = [fmt({ era: 'long', year: 'numeric' }), fmt({ era: 'short', year: 'numeric' }), fmt({ era: 'narrow', year: 'numeric' })];
        try { namers.push(new Intl.DateTimeFormat(withOption('en', 'calendar', calendar), opts({ era: 'long', year: 'numeric' }))); } catch (e) {}
        for (var y = 1868; y <= split(now).y + 1; y++) {
          ['-01-01', '-12-31'].forEach(function (end) {
            var v = pad(y, 4) + end, era = parts(v).era;
            if (lexicon.eras[low(era)]) return;
            namers.forEach(function (f) {
              var e = f.formatToParts(when(v)).filter(function (x) { return x.type === 'era'; })[0];
              if (e && !lexicon.eras[low(e.value)]) lexicon.eras[low(e.value)] = { era: era, from: y };
            });
          });
        }
      }
      try {
        var rel = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
        [-1, 0, 1].forEach(function (n) { lexicon.relative[low(rel.format(n, 'day'))] = n; });
      } catch (e) {}
      lexicon.relative.t = 0;
      lexicon.relative.today = 0;
      lexicon.relative.tomorrow = 1;
      lexicon.relative.yesterday = -1;
      lexicon.low = low;
      return lexicon;
    };
    return m;
  }

  /* Reads a date typed in a model's language, or answers null. */
  function readDate(m, text) {
    text = plain(text);
    var at = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/.exec(text) || /^(\d{4})(\d{2})(\d{2})$/.exec(text);
    if (at) return real(+at[1], +at[2], +at[3]) ? iso(utc(+at[1], +at[2], +at[3])) : null;
    var rel = /^([+-])\s*(\d{1,5})$/.exec(text);
    if (rel) return addDays(today(), (rel[1] === '-' ? -1 : 1) * +rel[2]);
    var lex = m.lexicon(), low = lex.low(text);
    if (low in lex.relative) return addDays(today(), lex.relative[low]);

    var tokens = text.match(/[\p{L}\p{M}][\p{L}\p{M}.]*|\d+/gu) || [];
    var nums = [], month = null, era = null;
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (/^\d+$/.test(t)) { nums.push(t); continue; }
      var w = lex.low(t), bare = w.replace(/\./g, '');
      var found = lex.months[w] || lex.months[t.toLocaleLowerCase()] || lex.months[bare];
      if (!found) {
        /* A month written with a word joined before it, as Hebrew writes
           בחשוון for "in Heshvan". */
        for (var f in lex.filler) if (f && w.indexOf(f) === 0 && lex.months[w.slice(f.length)]) { found = lex.months[w.slice(f.length)]; break; }
      }
      if (found) { if (month) return null; month = { key: found }; continue; }
      if (lex.eras[w] || lex.eras[bare]) { era = lex.eras[w] || lex.eras[bare]; continue; }
      if (lex.filler[w] || lex.filler[bare]) continue;
      return null;
    }
    /* With the month written as a word, the month is settled, and of two
       numbers the year is the one of three or more digits or past 31, in
       whatever place it was typed; only two small numbers fall back on the
       language's order. All numbers go in the language's order, except
       that four digits first are a year, month and day, as ISO has them. */
    var got = {};
    var yearly = function (s) { return s.length >= 3 || +s > 31; };
    if (month) {
      if (nums.length === 2 && yearly(nums[0]) !== yearly(nums[1])) {
        var y0 = yearly(nums[0]);
        got.year = nums[y0 ? 0 : 1]; got.day = nums[y0 ? 1 : 0];
      } else if (nums.length === 2) m.wordOrder.forEach(function (k, j) { got[k] = nums[j]; });
      else if (nums.length === 1) got.day = nums[0];
      else return null;
    } else if (nums.length === 3 && nums[0].length === 4) { got.year = nums[0]; got.month = nums[1]; got.day = nums[2]; }
    else if (nums.length === 3) m.order.forEach(function (k, j) { got[k] = nums[j]; });
    else if (nums.length === 2) m.order.filter(function (k) { return k !== 'year'; }).forEach(function (k, j) { got[k] = nums[j]; });
    else return null;
    if (!month) {
      if (got.month.length > 2) return null;
      month = m.numericMonths ? { key: String(+got.month) } : { place: +got.month };
    }
    if (!got.day || got.day.length > 2) return null;

    /* The year: an era's, the present era's in a calendar whose eras
       restart, Gregorian where four digits are typed there, the nearest
       to today where two are typed, and this year where none is. */
    var n, need = null;
    if (era) {
      if (!got.year) return null;
      n = era.from + +got.year - 1; need = era.era;
    } else if (!got.year) n = m.nowYear;
    else if (m.resets && got.year.length < 4) {
      var present = lex.eras[lex.low(m.parts(today()).era)];
      if (!present) return null;
      n = present.from + +got.year - 1; need = present.era;
    } else if (got.year.length <= 2) {
      n = m.nowYear - m.nowYear % 100 + +got.year;
      if (n > m.nowYear + 50) n -= 100; else if (n <= m.nowYear - 50) n += 100;
    } else n = +got.year;
    return m.find(n, month, +got.day, need);
  }

  /* One field. input is the hidden native input; kind is date or time. */
  function Field(input, kind) {
    var isDate = kind === 'date';
    var lang = langOf(input);
    var style = (input.getAttribute('data-date-style') || (lang ? 'short' : 'iso')).toLowerCase();
    var locale = lang || navigator.language || 'en';
    if (style === 'iso') locale = withOption(locale, 'calendar', 'gregory');
    var model = isDate ? Model(locale) : null;
    var id = 'pudl-date-' + (++uid);
    var bad = false, shown = '';

    var wrap = document.createElement('span');
    wrap.className = 'combo ' + (isDate ? 'date-field' : 'time-field');
    var field = document.createElement('input');
    field.type = 'text';
    field.className = 'form-input';
    field.autocomplete = 'off';
    field.spellcheck = false;
    field.id = input.id ? input.id + '-text' : id + '-field';
    wrap.appendChild(field);

    var opener = document.createElement('button');
    opener.type = 'button';
    opener.className = 'icon-btn combo-open';
    opener.tabIndex = -1;
    opener.setAttribute('data-toolbar-skip', '');
    opener.setAttribute('aria-label', words(input, 'open', isDate ? 'Choose a date' : 'Choose a time'));
    opener.setAttribute('aria-expanded', 'false');
    opener.setAttribute('aria-haspopup', isDate ? 'dialog' : 'listbox');
    wrap.appendChild(opener);

    /* The echo: what the field holds, or will hold, in words. */
    var echo = document.createElement('span');
    echo.className = 'date-echo';
    echo.id = id + '-echo';
    echo.setAttribute('aria-live', 'polite');

    var label = input.id && document.querySelector('label[for="' + CSS.escape(input.id) + '"]');
    var name = (label && label.textContent.trim()) || input.getAttribute('aria-label') || '';

    input.parentNode.insertBefore(wrap, input.nextSibling);
    wrap.parentNode.insertBefore(echo, wrap.nextSibling);
    input.hidden = true;
    /* The input's label is now the label of the field the reader types in. */
    if (input.id) {
      document.querySelectorAll('label[for="' + CSS.escape(input.id) + '"]').forEach(function (l) { l.htmlFor = field.id; });
    }
    if (input.hasAttribute('aria-label')) field.setAttribute('aria-label', input.getAttribute('aria-label'));
    if (input.hasAttribute('aria-labelledby')) field.setAttribute('aria-labelledby', input.getAttribute('aria-labelledby'));

    var panel = document.createElement('div');
    panel.id = id + '-panel';
    panel.setAttribute('popover', 'manual');
    if (lang) panel.lang = lang;
    if (name) panel.setAttribute('aria-label', name);
    /* Inside a modal dialog the panel must be in the dialog, since all else
       is inert while it is open. It takes the field's direction, which it
       would otherwise lose by living elsewhere. */
    (wrap.closest('dialog') || document.body).appendChild(panel);
    field.setAttribute('role', 'combobox');
    field.setAttribute('aria-haspopup', isDate ? 'dialog' : 'listbox');
    field.setAttribute('aria-expanded', 'false');
    field.setAttribute('aria-controls', panel.id);
    opener.setAttribute('aria-controls', panel.id);

    /* Times. A language with a 12-hour clock writes 9:30 PM and says "9:30
       at night" in the echo; one with a 24-hour clock, and the ISO style,
       write 21:30 for both. */
    var twelve = false, timeFmt, timeSay, periods = { am: [], pm: [] };
    if (!isDate) {
      twelve = style !== 'iso' && /^h1[12]$/.test(new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle || '');
      timeFmt = twelve
        ? new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
        : new Intl.DateTimeFormat(style === 'iso' ? 'en-GB' : locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' });
      timeSay = twelve ? new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', dayPeriod: 'long', timeZone: 'UTC' }) : timeFmt;
      var clock12 = new Intl.DateTimeFormat(locale, { hour: 'numeric', hourCycle: 'h12', timeZone: 'UTC' });
      [['am', 9], ['pm', 21]].forEach(function (p) {
        clock12.formatToParts(Date.UTC(2026, 0, 1, p[1])).forEach(function (x) {
          if (x.type === 'dayPeriod') periods[p[0]].push(plain(x.value).toLocaleLowerCase(locale));
        });
      });
    }

    function minutes(s) {
      var m = /^(\d{2}):(\d{2})/.exec(s || '');
      return m ? +m[1] * 60 + +m[2] : null;
    }
    function hhmm(n) { return pad(Math.floor(n / 60)) + ':' + pad(n % 60); }
    function at(n) { return Date.UTC(1970, 0, 1, Math.floor(n / 60), n % 60); }

    function format(v) {
      if (!v) return '';
      if (isDate) {
        if (!split(v)) return v;
        if (style === 'iso') return v;
        return (model[style] || model.short).format(when(v));
      }
      var n = minutes(v);
      return n === null ? v : timeFmt.format(at(n));
    }
    function say(v) {
      if (isDate) return model.full.format(when(v));
      return timeSay.format(at(minutes(v)));
    }
    function readTime(text) {
      var s = plain(text).toLocaleLowerCase(locale), pm = null;
      var en = /^(.*\d)\s*([ap])\.?\s*(?:m\.?)?$/.exec(s);
      if (en) { s = en[1]; pm = en[2] === 'p'; }
      else {
        ['pm', 'am'].some(function (which) {
          return periods[which].some(function (w) {
            if (!w || s.indexOf(w) < 0) return false;
            s = s.replace(w, ''); pm = which === 'pm';
            return true;
          });
        });
      }
      s = s.trim();
      var t = /^(\d{1,2})(?:\s*[:.h]\s*(\d{2}))?$/.exec(s), h, min;
      if (t) { h = +t[1]; min = t[2] ? +t[2] : 0; }
      else if ((t = /^(\d{3,4})$/.exec(s))) { h = Math.floor(+t[1] / 100); min = +t[1] % 100; }
      else return null;
      if (min > 59) return null;
      if (pm !== null) {
        if (h < 1 || h > 12) return null;
        h = h % 12 + (pm ? 12 : 0);
      } else if (h > 23) return null;
      return hhmm(h * 60 + min);
    }
    function parse(text) { return isDate ? readDate(model, text) : readTime(text); }

    /* The input's step in seconds, or 0 where any minute will do: no step,
       step="any", or a step shorter than a minute. */
    function stepSeconds() {
      var s = parseFloat(input.getAttribute('step'));
      return isFinite(s) && s >= 60 ? s : 0;
    }
    /* Whether a value is inside the input's min and max, and a time on its
       step, counted from min as the browser counts it. A time whose min is
       later than its max runs past midnight, as the browser's does. */
    function allowed(v) {
      var lo = input.min, hi = input.max;
      if (isDate) return (!lo || v >= lo) && (!hi || v <= hi);
      var s = stepSeconds();
      if (s && ((minutes(v) - (minutes(lo) || 0)) * 60) % s !== 0) return false;
      if (lo && hi && lo > hi) return v >= lo.slice(0, 5) || v <= hi.slice(0, 5);
      return (!lo || v >= lo.slice(0, 5)) && (!hi || v <= hi.slice(0, 5));
    }

    function example() {
      var sample = isDate ? split(today()).y + '-12-31' : '21:30';
      var written = format(sample);
      return written === sample
        ? words(input, 'example-iso', 'e.g. {iso}').replace('{iso}', sample)
        : words(input, 'example', 'e.g. {example}, or {iso}').replace('{example}', written).replace('{iso}', sample);
    }
    /* What the echo says: the value in words, the typed text in words, or
       that the text is not a date yet, with an example. */
    function tell() {
      var text = field.value.trim(), msg;
      if (!text) msg = example();
      else {
        var v = text === shown ? input.value : parse(text);
        if (!v) msg = words(input, 'unknown', isDate ? 'Not a date yet' : 'Not a time yet') + '; ' + example();
        else {
          msg = say(v);
          if (!allowed(v)) msg = words(input, 'outside', isDate ? '{date} is outside the dates allowed' : '{date} is not one of the times allowed').replace('{date}', msg);
        }
      }
      if (echo.textContent !== msg) echo.textContent = msg;
    }

    function mark() {
      if (bad || input.getAttribute('aria-invalid') === 'true') field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
    }
    function show() {
      shown = format(input.value);
      field.value = shown;
      bad = false;
      mark();
      tell();
    }
    function commit(v) {
      if (input.value !== v) { input.value = v; fire(input); }
      show();
    }
    /* Takes what is typed, when the reader leaves the field or presses
       Enter. Text that is still what the field showed changes nothing. The
       answer is false where the text was refused. */
    function settle() {
      var text = field.value.trim();
      if (text === shown) { bad = false; mark(); tell(); return true; }
      if (!text) { commit(''); return true; }
      var v = parse(text);
      if (!v || !allowed(v)) { bad = true; mark(); tell(); return false; }
      commit(v);
      return true;
    }

    function isOpen() { return panel.matches(':popover-open'); }
    function place() {
      var r = wrap.getBoundingClientRect();
      if (!isDate) panel.style.minWidth = r.width + 'px';
      panel.style.left = Math.max(8, Math.min(r.left, innerWidth - panel.offsetWidth - 8)) + 'px';
      /* The panel opens on the side with room for it, or with more room,
         and never runs past the window's edge: it is held to the room
         there and scrolls, as the combo box's list is. */
      panel.style.maxHeight = '';
      var natural = panel.offsetHeight, below = innerHeight - r.bottom - 12, above = r.top - 12;
      var up = natural > below && above > below;
      panel.style.maxHeight = Math.max(80, up ? above : below) + 'px';
      if (up) { panel.style.top = ''; panel.style.bottom = (innerHeight - r.top + 4) + 'px'; }
      else { panel.style.bottom = ''; panel.style.top = (r.bottom + 4) + 'px'; }
    }
    function expanded(yes) {
      field.setAttribute('aria-expanded', yes ? 'true' : 'false');
      opener.setAttribute('aria-expanded', yes ? 'true' : 'false');
    }
    function locked() { return input.disabled || input.readOnly; }

    function key(cls, word, fallback, kind) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = cls;
      var said = words(input, word, fallback);
      if (kind === 'icon') b.setAttribute('aria-label', said); else b.textContent = said;
      return b;
    }

    var picker = isDate ? Calendar() : Times();

    /* The calendar. Days of the months before and after are left blank
       rather than dimmed, because a dimmed day already means one outside
       the field's range, and one look should not say two things. The grid
       always has six weeks, so the panel keeps its height from month to
       month and does not jump when it is placed above the field. */
    function Calendar() {
      panel.className = 'date-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'false');
      var first = model.first;
      var head = document.createElement('div');
      head.className = 'date-head';
      var prev = key('icon-btn date-prev', 'previous', 'Previous month', 'icon');
      var next = key('icon-btn date-next', 'next', 'Next month', 'icon');
      var title = document.createElement('button');
      title.type = 'button';
      title.className = 'btn btn-sm date-title';
      title.setAttribute('aria-live', 'polite');
      title.setAttribute('aria-expanded', 'false');
      head.appendChild(prev);
      head.appendChild(title);
      head.appendChild(next);
      panel.appendChild(head);

      var grid = document.createElement('table');
      grid.className = 'date-grid';
      grid.setAttribute('role', 'grid');
      grid.id = id + '-grid';
      var thead = grid.createTHead().insertRow();
      for (var i = 0; i < 7; i++) {
        var wd = utc(2024, 1, 7 + (first + i) % 7);
        var th = document.createElement('th');
        th.scope = 'col';
        th.abbr = model.weekdayLong.format(wd);
        th.textContent = model.weekdayNarrow.format(wd);
        thead.appendChild(th);
      }
      var body = grid.createTBody();
      panel.appendChild(grid);

      /* The chooser of a year's months, in place of the days. */
      var chooser = document.createElement('div');
      chooser.className = 'date-chooser';
      chooser.hidden = true;
      var yearRow = document.createElement('div');
      yearRow.className = 'date-year-row';
      var yearWrap = document.createElement('span');
      yearWrap.className = 'combo date-year';
      var yearField = document.createElement('input');
      yearField.type = 'text';
      yearField.className = 'form-input';
      yearField.inputMode = 'numeric';
      yearField.autocomplete = 'off';
      yearField.setAttribute('aria-label', words(input, 'year', 'Year'));
      var earlier = key('icon-btn date-step date-earlier', 'earlier', 'Previous year', 'icon');
      var later = key('icon-btn date-step date-later', 'later', 'Next year', 'icon');
      yearWrap.appendChild(yearField);
      yearWrap.appendChild(earlier);
      yearWrap.appendChild(later);
      var yearName = document.createElement('span');
      yearName.className = 'date-year-name';
      yearRow.appendChild(yearWrap);
      yearRow.appendChild(yearName);
      var monthGrid = document.createElement('div');
      monthGrid.className = 'date-months';
      chooser.appendChild(yearRow);
      chooser.appendChild(monthGrid);
      panel.appendChild(chooser);

      var foot = document.createElement('div');
      foot.className = 'date-foot';
      var todayKey = key('btn btn-sm date-today', 'today', 'Today');
      var clearKey = key('btn btn-sm date-clear', 'clear', 'Clear');
      foot.appendChild(todayKey);
      foot.appendChild(clearKey);
      panel.appendChild(foot);

      var focusDay = '', chooserYear = 0;

      /* Draws the month that holds day, with day the one cell in the Tab
         order, and moves focus to it when asked. */
      function draw(day, focus) {
        focusDay = day;
        var start = model.monthStart(day), end = model.monthEnd(day);
        var count = between(start, end) + 1;
        var lead = (when(start).getUTCDay() - first + 7) % 7;
        var chosen = input.value, now = today();
        title.textContent = model.head.format(when(start));
        grid.setAttribute('aria-label', title.textContent);
        body.textContent = '';
        for (var w = 0; w < 6; w++) {
          var row = body.insertRow();
          for (var c = 0; c < 7; c++) {
            var cell = row.insertCell();
            var n = w * 7 + c - lead;
            if (n < 0 || n >= count) continue;
            var v = addDays(start, n);
            cell.setAttribute('data-date', v);
            cell.textContent = model.day(v);
            cell.setAttribute('aria-label', model.full.format(when(v)));
            cell.tabIndex = v === day ? 0 : -1;
            cell.setAttribute('aria-selected', v === chosen ? 'true' : 'false');
            if (v === now) cell.setAttribute('aria-current', 'date');
            if (!allowed(v)) cell.setAttribute('aria-disabled', 'true');
          }
        }
        prev.disabled = !!input.min && addDays(start, -1) < input.min;
        next.disabled = !!input.max && addDays(end, 1) > input.max;
        clearKey.hidden = input.required;
        if (focus || panel.contains(document.activeElement) && document.activeElement.disabled) cellOf(day).focus();
      }
      function cellOf(v) { return body.querySelector('[data-date="' + v + '"]'); }

      /* The same day of another month, or its last where it is shorter. */
      function sameDay(from, monthFirst) {
        var place = between(model.monthStart(from), from);
        return addDays(monthFirst, Math.min(place, between(monthFirst, model.monthEnd(monthFirst))));
      }
      function byMonths(v, n) {
        var s = model.monthStart(v);
        for (var i = 0; i < Math.abs(n); i++) s = n < 0 ? model.monthStart(addDays(s, -1)) : addDays(model.monthEnd(s), 1);
        return sameDay(v, s);
      }
      /* A year on: the month of the same name in the next year, or, where
         that year has none, as Hebrew Adar I in a common year, twelve
         months on. */
      function byYears(v, n) {
        var o = model.parts(v), list = model.months(model.yearOf(v) + n);
        for (var i = 0; i < list.length; i++) if (model.parts(list[i]).month === o.month) return sameDay(v, list[i]);
        return byMonths(v, 12 * n);
      }

      /* The day the calendar opens on: the chosen one, else today, else the
         allowed day nearest today. */
      function start() {
        var v = split(input.value) ? input.value : today();
        if (input.min && v < input.min) v = input.min;
        if (input.max && v > input.max) v = input.max;
        return v;
      }
      function choose(v) {
        if (!v || !allowed(v)) return;
        close(true);
        commit(v);
      }

      function showChooser(yes) {
        chooser.hidden = !yes;
        grid.hidden = yes;
        title.setAttribute('aria-expanded', yes ? 'true' : 'false');
        prev.setAttribute('aria-label', yes ? words(input, 'earlier', 'Previous year') : words(input, 'previous', 'Previous month'));
        next.setAttribute('aria-label', yes ? words(input, 'later', 'Next year') : words(input, 'next', 'Next month'));
        if (yes) months(model.yearOf(focusDay), true);
        else { prev.disabled = next.disabled = false; draw(focusDay, true); }
      }
      /* Draws year n's months as keys, the month on view pressed in. */
      function months(n, focus) {
        var list = model.months(n);
        if (!list.length) return;
        chooserYear = n;
        yearField.value = String(n);
        var said = model.yearName.format(when(list[0]));
        /* The year as the calendar writes it, where that says more than
           the number does, as 令和8年 does for 2026. */
        yearName.textContent = plain(said).replace(/\D/g, '') === String(n) ? '' : said;
        title.textContent = said;
        monthGrid.textContent = '';
        var viewKey = model.parts(focusDay).key, current = null;
        list.forEach(function (s) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'date-month';
          b.textContent = model.monthName.format(when(s));
          b.setAttribute('aria-label', model.head.format(when(s)));
          b.setAttribute('data-month', s);
          b.tabIndex = -1;
          if (model.parts(s).key === viewKey) { b.setAttribute('aria-current', 'true'); current = b; }
          if ((input.max && s > input.max) || (input.min && model.monthEnd(s) < input.min)) b.disabled = true;
          monthGrid.appendChild(b);
        });
        var stop = current || monthGrid.querySelector('button:not(:disabled)') || monthGrid.firstChild;
        stop.tabIndex = 0;
        prev.disabled = next.disabled = false;
        if (focus) stop.focus();
      }
      monthGrid.addEventListener('click', function (e) {
        var b = e.target.closest('[data-month]');
        if (!b || b.disabled) return;
        focusDay = sameDay(focusDay, b.getAttribute('data-month'));
        showChooser(false);
      });
      monthGrid.addEventListener('keydown', function (e) {
        var keys = Array.prototype.slice.call(monthGrid.children);
        var at = keys.indexOf(document.activeElement), to = at;
        if (e.key === 'ArrowLeft') to = at + (rtl() ? 1 : -1);
        else if (e.key === 'ArrowRight') to = at + (rtl() ? -1 : 1);
        else if (e.key === 'ArrowUp') to = at - 3;
        else if (e.key === 'ArrowDown') to = at + 3;
        else if (e.key === 'Home') to = 0;
        else if (e.key === 'End') to = keys.length - 1;
        else return;
        e.preventDefault();
        if (!keys[to]) return;
        keys[at].tabIndex = -1;
        keys[to].tabIndex = 0;
        keys[to].focus();
      });
      function stepYear(n) { months(chooserYear + n, false); }
      earlier.addEventListener('click', function () { stepYear(-1); });
      later.addEventListener('click', function () { stepYear(1); });
      /* The wheel steps the year, while its field has focus and the
         pointer is over it, up for a later year. */
      yearField.addEventListener('wheel', function (e) {
        if (document.activeElement !== yearField || !e.deltaY) return;
        e.preventDefault();
        stepYear(e.deltaY < 0 ? 1 : -1);
      }, { passive: false });
      yearField.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); stepYear(e.key === 'ArrowUp' ? 1 : -1); }
        else if (e.key === 'Enter') {
          e.preventDefault();
          var n = parseInt(plain(yearField.value), 10);
          if (n > 0) months(n, true);
        }
      });
      title.addEventListener('click', function () { showChooser(chooser.hidden); });

      function rtl() { return getComputedStyle(panel).direction === 'rtl'; }
      body.addEventListener('keydown', function (e) {
        var cell = e.target.closest('[data-date]');
        if (!cell || e.ctrlKey || e.metaKey) return;
        var v = cell.getAttribute('data-date');
        var dow = (when(v).getUTCDay() - first + 7) % 7;
        var to = null;
        switch (e.key) {
          case 'ArrowLeft': to = addDays(v, rtl() ? 1 : -1); break;
          case 'ArrowRight': to = addDays(v, rtl() ? -1 : 1); break;
          case 'ArrowUp': if (e.altKey) { e.preventDefault(); close(true); return; } to = addDays(v, -7); break;
          case 'ArrowDown': to = addDays(v, 7); break;
          case 'Home': to = addDays(v, -dow); break;
          case 'End': to = addDays(v, 6 - dow); break;
          case 'PageUp': to = e.shiftKey ? byYears(v, -1) : byMonths(v, -1); break;
          case 'PageDown': to = e.shiftKey ? byYears(v, 1) : byMonths(v, 1); break;
          case 'Enter': case ' ': e.preventDefault(); choose(cell.getAttribute('aria-disabled') ? '' : v); return;
          default: return;
        }
        e.preventDefault();
        if (inRange(to)) draw(to, true);
      });
      body.addEventListener('click', function (e) {
        var cell = e.target.closest('[data-date]');
        if (cell && !cell.getAttribute('aria-disabled')) choose(cell.getAttribute('data-date'));
      });
      /* The arrow keys turn the month, or in the chooser the year. They
         keep focus, unless the turn disabled the one pressed, which gives
         it to the day. */
      function turn(n) {
        if (!chooser.hidden) { stepYear(n); return; }
        draw(byMonths(focusDay, n), false);
      }
      prev.addEventListener('click', function () { turn(-1); });
      next.addEventListener('click', function () { turn(1); });
      todayKey.addEventListener('click', function () {
        focusDay = today();
        if (!chooser.hidden) showChooser(false); else draw(focusDay, true);
      });
      clearKey.addEventListener('click', function () { close(true); commit(''); });

      /* Tab goes round the panel's keys and the one day or month in the
         Tab order. Escape leaves the chooser for the days, and closes the
         panel from the days. */
      panel.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          e.preventDefault(); e.stopPropagation();
          if (!chooser.hidden) showChooser(false); else close(true);
          return;
        }
        if (e.key !== 'Tab') return;
        var stops = Array.prototype.filter.call(panel.querySelectorAll('button, input, [tabindex="0"]'), function (s) {
          return !s.disabled && s.tabIndex >= 0 && s.getClientRects().length > 0;
        });
        var at = stops.indexOf(document.activeElement);
        e.preventDefault();
        stops[(at + (e.shiftKey ? -1 : 1) + stops.length) % stops.length].focus();
      });

      return {
        open: function () { chooser.hidden = true; grid.hidden = false; title.setAttribute('aria-expanded', 'false'); draw(start(), true); },
        redraw: function () { if (isOpen() && chooser.hidden) draw(focusDay, false); }
      };
    }

    /* The list of times. Focus stays in the field, and the row the keyboard
       is on is announced through aria-activedescendant, as a combo box's is. */
    function Times() {
      panel.className = 'combo-list time-list';
      panel.setAttribute('role', 'listbox');
      var rows = [], active = -1;
      /* The list's interval in minutes: data-time-list where it is given,
         else the input's step where that is five minutes or more, else
         half an hour. A row off the input's step is left out, so a list
         finer than the step shows the step's times. */
      function step() {
        var asked = parseInt(input.getAttribute('data-time-list'), 10);
        if (asked >= 1) return asked;
        var s = stepSeconds();
        return s >= 300 ? Math.round(s / 60) : 30;
      }
      function draw() {
        panel.textContent = '';
        var each = step();
        var base = minutes(input.min) || 0;
        var now = input.value.slice(0, 5);
        rows = [];
        for (var k = 0; k * each < 1440; k++) {
          var v = hhmm((base + k * each) % 1440);
          if (!allowed(v)) continue;
          var row = document.createElement('div');
          row.className = 'menu-action combo-row';
          row.id = id + '-' + rows.length;
          row.setAttribute('role', 'option');
          row.setAttribute('aria-selected', v === now ? 'true' : 'false');
          row.setAttribute('data-time', v);
          var text = document.createElement('span');
          text.className = 'menu-row-text';
          text.textContent = format(v);
          row.appendChild(text);
          row.addEventListener('pointerdown', function (e) { e.preventDefault(); });
          row.addEventListener('click', function () { choose(this.getAttribute('data-time')); });
          panel.appendChild(row);
          rows.push(row);
        }
        active = -1;
      }
      function light(i) {
        if (rows[active]) rows[active].classList.remove('is-active');
        active = rows[i] ? i : -1;
        if (active < 0) { field.removeAttribute('aria-activedescendant'); return; }
        rows[active].classList.add('is-active');
        rows[active].scrollIntoView({ block: 'nearest' });
        field.setAttribute('aria-activedescendant', rows[active].id);
      }
      /* The row nearest the time typed, else the value, else the time now,
         measured round the clock. */
      function nearest() {
        var n = minutes(readTime(field.value) || input.value);
        if (n === null) { var d = new Date(); n = d.getHours() * 60 + d.getMinutes(); }
        var best = -1, gap = Infinity;
        rows.forEach(function (r, i) {
          var g = Math.abs(minutes(r.getAttribute('data-time')) - n);
          g = Math.min(g, 1440 - g);
          if (g < gap) { gap = g; best = i; }
        });
        return best;
      }
      function choose(v) {
        close(false);
        commit(v);
      }
      return {
        open: function () { draw(); light(nearest()); },
        redraw: function () {},
        key: function (e) {
          if (e.key === 'ArrowDown') { e.preventDefault(); if (rows.length) light((active + 1) % rows.length); return true; }
          if (e.key === 'ArrowUp') { e.preventDefault(); if (rows.length) light(active <= 0 ? rows.length - 1 : active - 1); return true; }
          if (e.key === 'Enter' && rows[active]) { e.preventDefault(); choose(rows[active].getAttribute('data-time')); return true; }
          return false;
        },
        reset: function () { light(-1); }
      };
    }

    function open() {
      if (locked()) return;
      if (isDate) settle();
      if (!isOpen()) panel.showPopover();
      expanded(true);
      place();
      picker.open();
      place();
    }
    /* back is true where focus goes back to the field, as it does when the
       calendar is closed from its keys or by choosing. */
    function close(back) {
      if (isOpen()) panel.hidePopover();
      expanded(false);
      if (picker.reset) picker.reset();
      if (back) field.focus();
    }

    field.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey) return;
      if (isOpen()) {
        if ((e.key === 'ArrowUp' && e.altKey) || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(false); return; }
        if (e.key === 'Tab') { close(false); return; }
        if (picker.key && picker.key(e)) return;
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        open();
        return;
      }
      if (e.key === 'Enter') {
        /* A refused entry is not sent with the form; a good one is taken
           and the Enter goes on to the form, as a native field's does. */
        if (!settle()) e.preventDefault();
      }
    });
    field.addEventListener('input', function () {
      tell();
      if (isOpen() && !isDate) close(false);
    });
    field.addEventListener('blur', function () { settle(); });

    /* The wheel steps a time, but only while the field has focus and the
       pointer is over it, so a page scrolled past a field never changes
       it. A notch up is the next time the input allows, a minute on where
       it has no step, and a notch down the one before. Times wrap past
       midnight only where there is no min and no max. Each notch is a
       value taken, and fires input and change. */
    if (!isDate) {
      field.addEventListener('wheel', function (e) {
        if (document.activeElement !== field || locked() || !e.deltaY) return;
        var n = minutes(readTime(field.value) || input.value);
        if (n === null) { var d = new Date(); n = d.getHours() * 60 + d.getMinutes(); }
        var dir = e.deltaY < 0 ? 1 : -1, wraps = !input.min && !input.max || input.min > input.max;
        for (var k = 1; k <= 1440; k++) {
          var c = n + dir * k;
          if (wraps) c = (c + 1440) % 1440;
          else if (c < 0 || c > 1439) return;
          if (allowed(hhmm(c))) { e.preventDefault(); commit(hhmm(c)); return; }
        }
      }, { passive: false });
    }

    opener.addEventListener('pointerdown', function (e) { e.preventDefault(); });
    opener.addEventListener('click', function () {
      if (locked()) return;
      if (isOpen()) { close(true); return; }
      if (!isDate) field.focus();
      open();
    });

    /* A press anywhere but the panel and the field closes it, and leaves
       focus where the press put it. */
    document.addEventListener('pointerdown', function (e) {
      if (!isOpen() || panel.contains(e.target) || wrap.contains(e.target)) return;
      close(false);
    }, true);
    if (isDate) {
      panel.addEventListener('focusout', function (e) {
        var to = e.relatedTarget;
        if (to && !panel.contains(to) && to !== field && isOpen()) close(false);
      });
    }
    addEventListener('resize', function () { if (isOpen()) place(); });
    addEventListener('scroll', function (e) {
      if (!isOpen() || panel.contains(e.target)) return;
      place();
    }, true);

    /* The input's state, copied to the field and kept in step. */
    function sync() {
      field.disabled = input.disabled;
      field.required = input.required;
      field.readOnly = input.readOnly;
      if (input.hasAttribute('placeholder')) field.setAttribute('placeholder', input.getAttribute('placeholder'));
      else field.removeAttribute('placeholder');
      field.setAttribute('aria-describedby', ((input.getAttribute('aria-describedby') || '') + ' ' + echo.id).trim());
      panel.dir = getComputedStyle(wrap).direction;
      if (locked() && isOpen()) close(false);
      if (document.activeElement !== field) show();
      else { mark(); tell(); }
      picker.redraw();
    }
    sync();
    new MutationObserver(sync).observe(input, { attributes: true, attributeFilter: ['disabled', 'required', 'readonly', 'placeholder', 'aria-describedby', 'aria-invalid', 'min', 'max', 'step', 'value'] });
    if (input.form) input.form.addEventListener('reset', function () { setTimeout(function () { bad = false; show(); }, 0); });
    input.__pudlDateShow = show;
  }

  function enhanceOne(input) {
    if (input.__pudlDate) return;
    var kind = (input.getAttribute('type') || '').toLowerCase();
    if (kind !== 'date' && kind !== 'time') return;
    input.__pudlDate = true;
    new Field(input, kind);
  }

  function enhance(root) {
    root = root || document;
    if (root.matches && root.matches('input[data-date]')) enhanceOne(root);
    root.querySelectorAll('input[data-date]').forEach(enhanceOne);
  }

  window.pudlDate = {
    enhance: enhance,
    refresh: function (input) { if (input && input.__pudlDateShow) input.__pudlDateShow(); }
  };
  document.addEventListener('pudl:window-open', function (e) { enhance(e.target); });
  document.addEventListener('pudl:regions-swap', function () { enhance(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { enhance(); });
  else enhance();
})();
